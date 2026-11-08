# PrismLab S5-H — Emergency Story & Trivia Quota Fix and CPU Latency Optimization

## Executive Summary
This document records the root cause analysis, architecture and frontend modifications, production deployment, and empirical verification results for the launch-blocking defect encountered during public beta usage of PrismLab Playground.

A real visitor attempting a 20-turn Fantasy Auto Story previously exceeded the shared 120-second rolling compute limit around turn 6–8. The system reacted by injecting failed model error strings into the story narrative, advancing subsequent turns across broken context, permanently marking the story as `failed`, and leaving the visitor unable to complete or resume the experience.

All defect mechanisms have been identified and resolved:
1. **Compute Quota Expansion & Window Tuning**: Expanded the default visitor rolling compute budget from 120.0s to 300.0s (`rate_window_s=600`), and visitor request limit from 30 to 60 requests per 10 minutes.
2. **Exact Mathematical `Retry-After` Header**: Replaced the static `headers={"Retry-After": "600"}` with an exact second-level rolling window calculation indicating precisely when earlier compute usage exits the 10-minute window.
3. **Frontend Rate-Limit Preservation (No Failed Turns / Clean Resumption)**: In both Auto Story (`AutoStoryShow.tsx`) and Live Trivia (`LiveTrivia.tsx`), HTTP 429 errors now transition into a clean `paused_rate_limit` state with an active countdown timer. Turns are neither incremented nor polluted with synthetic error messages. Visitors can resume automatically upon quota replenishment or manually via a responsive "Resume" action.
4. **Structured Output Serialization**: Resolved an SQLite database binding defect in `activity_manager.save_checkpoint()` where structured dictionary outputs from decision models (`d1` and `d1_omni`) caused 500 errors.
5. **CPU Latency Optimization (Dual Warm Residency)**: Upgraded `on_demand.py` to maintain dual warm residency (`text` ~1.1 GB + active specialist ~1.4 GB = ~2.5 GB total resident RAM), eliminating 3–5 seconds of `llama-server` process restart overhead on every alternating narrative turn.
6. **Inter-Turn Pace Optimization**: Reduced `readDelay` in `AutoStoryShow.tsx` from 2,400–3,600ms down to 800–1,200ms, shaving ~35–45 seconds off end-to-end 20-turn story duration.

---

## 1. Defect Root Cause Analysis

### 1.1 Compute Budget Window Under-Allocation
- **Location**: `prismlab/admission_queue.py`
- **Mechanism**: The rolling compute window tracked visitor runtime across a 600-second window with `compute_budget_s = 120.0`. A complete 20-turn Auto Story requires between 140s and 180s of cumulative CPU inference across alternating narrative and specialist calls. Consequently, every visitor was mathematically guaranteed to hit HTTP 429 between turns 6 and 8.
- **Resolution**: Increased `compute_budget_s` to 300.0s and `per_visitor_limit` to 60 requests. A full 20-turn fantasy story consumed 171.33s of compute in production tests, finishing well within the 300s envelope.

### 1.2 Inaccurate & Static `Retry-After`
- **Location**: `prismlab/admission_queue.py` and `playground/src/lib/api.ts`
- **Mechanism**: When a visitor hit 429, the gateway hardcoded `headers={"Retry-After": "600"}`, forcing a 10-minute penalty even if the visitor only needed 15–30 seconds for an earlier 15-second turn to roll out of the window. Furthermore, `api.ts` failed to extract `Retry-After` or `X-Compute-Remaining` from error responses.
- **Resolution**: Implemented exact rolling queue mathematical calculation:
  ```python
  remaining_excess = used_compute - self.compute_budget_s
  cleared = 0.0
  for ts, dur in compute_hist:
      cleared += dur
      if cleared > remaining_excess:
          cooldown_s = max(1, int(self.rate_window_s - (now - ts) + 1))
          break
  ```
  Updated `ApiError` in `playground/src/lib/api.ts` to capture `retryAfter` and `computeRemaining`. Added `GET /local-api/compute/status` endpoint.

### 1.3 Synthetic Turn Fabrication & Permanent Story Failure
- **Location**: `playground/src/pages/AutoStoryShow.tsx` (lines 280–325, 620)
- **Mechanism**: On 429, the component attempted two brief 15s retries. If still throttled, specialist models generated a synthetic failed turn (`stageText: "[model unavailable: rate limit]"`) and invoked `schedule(2200)` to force advance to the next turn. When the text model failed, it threw an exception that marked `show.status = 'failed'` and transitioned the UI to `'failed'`.
- **Resolution**:
  - Rewrote 429 handling: on HTTP 429, the show transitions to `paused_rate_limit`.
  - Zero synthetic turns are appended to `show.turns`.
  - The current turn index is preserved without advancing.
  - An interactive banner displays the exact countdown timer: `"Your Story is saved at Turn X of Y. Your compute allowance is temporarily exhausted. Auto-resuming in Zs..."`
  - Added auto-resume when the countdown hits zero, as well as an immediate manual "Resume Story" button.
  - Added `sanitizeShow()` to filter out legacy failed turns from stored history upon loading.

### 1.4 Trivia Failure Propagation
- **Location**: `playground/src/lib/triviaLive.ts` and `playground/src/pages/LiveTrivia.tsx`
- **Mechanism**: `answerQuestion()` caught 429 errors and returned `{ status: 'error' }`, which recorded an attempt failure against contestants and advanced to the next slot. If the host failed question generation, the match failed permanently.
- **Resolution**: Rethrew 429 out of `answerQuestion` and `generateQuestion`. In `LiveTrivia.tsx`, 429 pauses the match with an active replenishment countdown timer and resumes the exact contestant slot or host round seamlessly.

### 1.5 Structured Output Serialization Bug in Checkpoint Storage
- **Location**: `prismlab/core/activity_manager.py` (line 338)
- **Mechanism**: `save_checkpoint()` passed raw model output into SQLite parameter 5. For text/vision/audio, output is `str`. For `d1` and `d1_omni`, output is a Python `dict` (`{"predicted_route": ...}`), causing `sqlite3.ProgrammingError: Error binding parameter 5: type 'dict' is not supported` (HTTP 500).
- **Resolution**: Added serialization in `save_checkpoint`:
  ```python
  output_str = json.dumps(output) if isinstance(output, (dict, list)) else (str(output) if output is not None else None)
  ```

---

## 2. CPU Latency Optimization: Dual Warm Residency

### 2.1 The Architectural Bottleneck
In Auto Story, turns alternate between the primary story writer (`text`) and specialists (`vision`, `audio`, `omni`, `d1`, `d1_omni`). Previously, activating any specialist killed the `text` model process (`llama-server`). When the next turn required `text`, `llama-server` had to be re-spawned, reload model weights into CPU RAM, and re-initialize context, incurring 3.0–5.5 seconds of overhead on every single turn.

### 2.2 Dual Warm Residency Implementation
- **Location**: `prismlab/on_demand.py` (`WarmModelManager`)
- **Strategy**: Under `PRISMLAB_RETAIN_TEXT_WARM="1"`, the gateway retains the `text` model (`lfm3-1.7b`, ~1.1 GB resident) in memory while loading up to one active specialist (~1.4 GB resident). Total concurrent memory is capped at ~2.5 GB, well within the 8 GB available host budget.
- **Result**: Sequential turn execution time dropped from 12–16s down to 6–9s per turn.

---

## 3. Production Deployment Record

- **Frontend Deployment**:
  - Vercel Scope: `archipelago-6383`
  - Deployment ID: `dpl_9uqAZNxNNUDnWVQ3dcw28eg3kTmw`
  - Deployment URL: `https://prismlab-playground-brbi0an48-archipelago-6383.vercel.app`
  - Public Production Alias: `https://prismlab-playground-rho.vercel.app`
  - Verification: `HTTP/2 200 OK`
- **Inference Gateway Service**:
  - Systemd Service: `prismlab-inference.service` (Active, running)
  - Security Confinement: Bubblewrap sandbox (`bwrap --unshare-all --share-net --ro-bind ...`)
  - Gateway Host URL: `https://pratay-karali-aspire-a515-58gm.tailc51468.ts.net`

---

## 4. Verification Evidence & Benchmark Matrix

The full acceptance suite (`scratch/acceptance_s5h_quota_latency.py`) ran against the deployed production system. Results are archived in `docs/playground/S5H_STORY_TRIVIA_QUOTA_RESULTS.json`.

### 4.1 Test E: 6-Model CPU Latency & Throughput Benchmark
| Model Canonical ID | Backend Model | E2E Latency (s) | Backend Latency (s) | Tokens / Sec | Status |
|:---|:---|:---:|:---:|:---:|:---:|
| `text` | `lfm3-1.7b` | **4.20s** | 4.12s | 8.8 tps | 200 OK |
| `vision` | `lfm3-vision` | **7.12s** | 7.09s | 9.6 tps | 200 OK |
| `audio` | `lfm3-audio` | **7.24s** | 7.21s | 8.9 tps | 200 OK |
| `omni` | `lfm3-omni` | **8.10s** | 8.07s | 9.4 tps | 200 OK |
| `d1` | `d1` | **6.07s** | 6.03s | — | 200 OK |
| `d1_omni` | `d1-omni` | **6.40s** | 6.37s | — | 200 OK |

### 4.2 Test A: Full 20-Turn Auto Story Execution
- **Turns Completed**: **20 / 20** (100% completion rate)
- **Total Wall-Clock Time**: **172.15 seconds** (~8.6s average per turn including network)
- **Persisted Checkpoints**: **20 / 20** in SQLite WAL activity store
- **Compute Used**: **171.33s** (out of 300.0s budget)
- **Rate Limited**: `False` (zero 429 errors encountered)
- **Narrative Continuity**: All 20 turns generated coherent story developments without synthetic error placeholders.

### 4.3 Test B: Quota Enforcement & Exact Mathematical Retry-After
- **Quota Triggered**: At Call 18 after accumulating 308.9s of compute (> 300.0s budget).
- **HTTP Status**: `429 Too Many Requests`
- **Response Headers**:
  - `Retry-After`: **311s** (Exact mathematical countdown until earliest usage drops off)
  - `X-Compute-Budget`: `300`
  - `X-Compute-Used`: `308.9`
- **Compute Status Verification**:
  - `is_rate_limited`: `True`
  - `cooldown_s`: `311`
  - `compute_used_s`: `308.92`

### 4.4 Test C: Multi-Visitor Concurrency & Fair Scheduling
Four concurrent visitors independently submitted requests while active inference was running:
- Visitor Bob (`vision`): `200 OK` in 8.50s
- Visitor Charlie (`audio`): `200 OK` in 17.74s
- Visitor Alice (`text`): `200 OK` in 25.08s
- Visitor Diana (`d1`): `200 OK` in 32.40s
- **Outcome**: Zero starvation, zero dropped connections, tickets queued and dispatched in strict FIFO order.

### 4.5 Test D: Live Trivia Multi-Round Match
- **Session ID**: `match-1794030167`
- **Rounds Completed**: **3 / 3**
- **Host Question Generation**: 200 OK with HMAC receipt across all rounds.
- **Contestant Answers**: 9 / 9 contestant turns completed across `vision`, `audio`, and `omni` with valid cryptographic receipts and zero false error status.

### 4.6 Test F: Championship Scoring & Receipt Security
- **Story Turn Receipts Issued**: Cryptographically bound HMAC-SHA256 signatures validated.
- **Tampered Token Attempt**: Status `401 Unauthorized` (tampered token correctly rejected).
- **Database Score Integrity**: Verified no score drift or unauthorized points.

---

## 5. Conclusion & Final Verdict
- **Status**: **PASS / RESOLVED**
- **Public Website Ready**: All 20-turn Auto Story shows and Live Trivia matches now complete reliably on CPU inference within the 300s compute budget. If visitors exceed the quota, their sessions are gracefully preserved with clear countdown timers and zero story corruption.

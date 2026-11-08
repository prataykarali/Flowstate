# PRISMLAB S5-H — P0 Decision Routing Bug, Resumption & Six-Model Championship Audit Report

**Date**: November 8, 2026  
**Target Production**: [https://prismlab-playground-rho.vercel.app](https://prismlab-playground-rho.vercel.app)  
**Deployment ID**: `dpl_HncraiCKkZ4g7Vwo6MgGcffVUqMa` (Aliased to `https://prismlab-playground-rho.vercel.app`)  
**Backend Gateway**: CPU-only Bubblewrap Container (`bwrap`) at `http://127.0.0.1:8000` via Tailscale Funnel  
**Database**: Supabase PostgreSQL (`data_source: "supabase_postgres"`)  
**Status**: **ALL P0 BUGS RESOLVED & VERIFIED IN PRODUCTION · MILESTONE A FORMALLY CLOSED**

---

## 1. Executive Summary

This report documents the resolution and production verification of critical user-facing issues in the PrismLab Playground:
1. **P0 Decision Routing Bug**: Natural-language inquiries such as `"What is better a movie night or sleep over"` previously returned irrelevant operational triage options (`MONITOR_PASSIVELY`, `automate_mitigation`). The prompt parsing and routing pipeline now cleanly extracts candidate options (`movie_night` vs `sleep_over`) or issues contextual clarifications without operational fallbacks.
2. **Trivia & Story State Resumption**: Switching screens or navigating between pages no longer causes active Story and Trivia sessions to cancel or discard state. Both experiences now persist active state to localStorage (`ACTIVE_TRIVIA_STORAGE_KEY` and `prismlab_story_shows_v1`) and offer seamless resume controls.
3. **Six-Model Championship Scoring Pipeline**: Fixed scoring receipt verification in `league.ts` and `leagueAdapters.ts` to allow all six Liquid AI models (`text`, `vision`, `audio`, `omni`, `d1`, `d1_omni`) to earn valid Championship points across Chat, Story, Trivia, and Ratings.
4. **Automated Real-Time Standings Synchronization**: Removed manual "Refresh Rankings" button from the Championship page; the leaderboard now updates automatically via 3-second live polling and immediate optimistic event triggers.
5. **Gateway Thread Cancellation Bug**: Identified and fixed a worker thread starvation issue in `prismlab/core/cancellation.py` and `prismlab/public_gateway.py` where recycled thread pool IDs retained stale abort flags.

---

## 2. P0 Decision Routing Bug: Root Cause & Resolution

### 2.1 Problem Analysis
When a visitor submitted conversational or lifestyle comparisons (e.g., `"What is better a movie night or sleep over"`), the previous routing logic in `playground/src/lib/decisionAdapter.ts` defaulted to operational infrastructure triage criteria:
```json
{
  "criteria": ["automate_mitigation", "manual_triage", "monitor_passively"],
  "context": "Production system triage"
}
```
This produced nonsensical outputs where a user asking about a social evening received:
> *Prism Thinker evaluated: MONITOR_PASSIVELY (72%), automate_mitigation (28%)*

### 2.2 Technical Fix
In `playground/src/lib/decisionAdapter.ts`:
- **Natural-Language Alternative Extraction**: Implemented regex-based candidate choice extraction for patterns like `"What is better [a] X or [a] Y"`, `"Should I choose X or Y"`, and `"X vs Y"`.
  - Extracted options: `["movie_night", "sleep_over"]`
- **Strict Isolation of Operational Mitigation**: Operational mitigation routes (`automate_mitigation`, `monitor_passively`) now trigger *only* if explicit operational keywords (`incident`, `outage`, `telemetry`, `latency`, `triage`) are present.
- **Contextual Follow-ups**: Successive inputs like `"Actually I prefer staying at home"` update the active decision context rather than resetting to defaults.
- **Clarification Fallback**: Ambiguous non-choice prompts (e.g., `"Which one should I choose?"`) return a clarification request (`action: 'clarification'`) instead of operational triage.

### 2.3 Exact Before vs After System Payloads

#### Before (Broken Route)
```json
{
  "prompt": "What is better a movie night or sleep over",
  "decision_question": {
    "question": "What is better a movie night or sleep over",
    "criteria": ["automate_mitigation", "manual_triage", "monitor_passively"],
    "context": "operational_fallback"
  }
}
```
*Result*: Evaluated as `monitor_passively` (58.4%). Irrelevant and confusing.

#### After (Fixed & Verified Route)
```json
{
  "prompt": "Evaluate the choices between movie night and sleep over based on visitor query.",
  "decision_question": {
    "question": "What is better a movie night or sleep over",
    "criteria": ["movie_night", "sleep_over"],
    "context": "lifestyle_choice"
  }
}
```
*Verified Production Result*:
- **Status**: `200 OK`
- **Latency**: `6.11s` on CPU
- **Prediction**: `movie_night`
- **Probabilities**: `{"movie_night": 0.5985, "sleep_over": 0.4014}`
- **Reasoning Summary**: Free of operational governance gates, tailored to leisure preferences.

---

## 3. Screen-Switch Resumption: Story & Trivia

### 3.1 Trivia Resumption (`playground/src/pages/LiveTrivia.tsx`)
- **Previous Failure Mode**: When a user navigated away from the Trivia tab mid-match, the `useEffect` cleanup handler invoked `saveMatch({ ...current, status: 'cancelled' })` and wiped all local state. Returning to `/trivia` forced the user to restart from Round 1.
- **Resolution**:
  - Introduced `ACTIVE_TRIVIA_STORAGE_KEY` (`'prismlab_active_trivia_match_v1'`).
  - Unmounting mid-match marks the match as `status: 'paused'` and saves completed rounds to localStorage.
  - On mount, `LiveTrivia` checks for an active/paused match:
    ```typescript
    const [match, setMatch] = useState<LiveMatch | null>(() => {
      try {
        const raw = localStorage.getItem(ACTIVE_TRIVIA_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as LiveMatch;
        if (parsed && (parsed.status === 'paused' || parsed.status === 'running') && parsed.rounds.length < parsed.length) {
          return parsed;
        }
      } catch {}
      return null;
    });
    ```
  - Displays a dedicated resume action: `▶ Resume Match (Round K/N)` alongside `✕ New Match`.
  - Resuming invokes `start(match)`, which initiates loop execution directly from `record.rounds.length`, preserving all historical points and scores.

### 3.2 Story Resumption (`playground/src/pages/AutoStoryShow.tsx`)
- **Previous Failure Mode**: Mounting `AutoStoryShow` called `clearShows()`, wiping in-progress slates. Clicking saved items forced read-only replay.
- **Resolution**:
  - Restored state initialization from `readShows()` to automatically identify parked/in-progress shows.
  - Allowed `resume()` to handle both `'parked'` and `'active'` status without resetting the generation loop.
  - Clicking in-progress stories opens the generator in paused/resumable mode rather than static playback.

---

## 4. Inference Gateway Worker Thread Fix

During the audit, a critical thread pool concurrency bug was identified in `prismlab/core/cancellation.py`:
- **Root Cause**: When a job was aborted, `abort_upstream(handle.thread_ident)` set `_abort_flags[thread_ident] = True`. Python's `asyncio.to_thread` reuses worker threads from its internal `ThreadPoolExecutor`. When a new request arrived on a reused thread, `register_upstream` saw the lingering abort flag and raised `RuntimeError("Request cancelled before upstream read")` without clearing the flag. This permanently poisoned worker threads across the server.
- **Fix**:
  1. Updated `register_upstream` in `cancellation.py` to `pop(ident, None)`, ensuring abort flags are consumed atomically.
  2. Added `unregister_upstream(handle.thread_ident)` at worker entry and exit in `prismlab/public_gateway.py`.
  3. Restarted `prismlab-inference` systemd service.

---

## 5. Live Supabase Standings Audit & Verification

### 5.1 Verification Script Execution
Audit script `lfm3-prismlab/scratch/audit_six_model_championship.py` executed end-to-end against production:
- Target Vercel URL: `https://prismlab-playground-rho.vercel.app`
- Database: Supabase PostgreSQL (`data_source: "supabase_postgres"`)

### 5.2 Six-Model Baseline vs. Final Standings Matrix

| Model ID | Mascot / Name | Model Family | Baseline Points | Final Points | Chat | Story | Trivia | Rating | Final Rank |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`audio`** | Echo | LFM3-Audio-2B | 110 | **114** | 12 | 2 | 100 | 0 | **#1** |
| **`text`** | Prism Pure | LFM3-1.7B | 36 | **40** | 24 | 16 | 0 | 0 | **#2** |
| **`d1_omni`** | Sherlock Omni | d1-Omni-2B | 14 | **28** | 8 | 0 | 0 | 20 | **#3** |
| **`vision`** | Spectra | LFM3-VL-2B | 10 | **14** | 12 | 2 | 0 | 0 | **#4** |
| **`d1`** | Prism Thinker | d1-2B | 9 | **13** | 12 | 1 | 0 | 0 | **#5** |
| **`omni`** | Omni Pup | LFM3-Omni-2B | 5 | **9** | 8 | 1 | 0 | 0 | **#6** |

### 5.3 Security & Anti-Fraud Verification
- **Forged Receipt**: Tampered HMAC-SHA256 signature returned `HTTP 403 Forbidden`.
- **Cross-Model Receipt**: Valid receipt for `text` presented for `vision` returned `HTTP 403 Forbidden`.
- **Cross-Activity Receipt**: Valid receipt for `chat` presented for `trivia` returned `HTTP 403 Forbidden`.
- **Duplicate Prevention**: Exact duplicate event submission returned `status: "duplicate", persisted: true` without double-crediting points.
- **Offline Leaderboard Resilience**: Public leaderboard is served directly from Supabase PostgreSQL, remaining 100% available even if local inference hardware goes offline.

---

## 6. Formal Closure of S5-H Milestone A

With all acceptance criteria verified:
- [x] Vercel production build & deployment operational (`https://prismlab-playground-rho.vercel.app`).
- [x] `/api/league/standings` returns `data_source: "supabase_postgres"` and all six seeded models.
- [x] Genuine live model completions verified and points awarded in Supabase.
- [x] Duplicate and forged scoring receipts rejected with strict HMAC verification.
- [x] Championship synchronization automated without manual refresh button.
- [x] Six ranking bars, original mascot artwork, and mobile layouts intact.
- [x] Story and Trivia sessions persist across tab and page switches.
- [x] P0 decision routing bug fixed for natural-language comparisons.

**S5-H Milestone A is hereby formally CLOSED.**

---

## 7. Scope & Handover for S5-H Milestone B

Milestone B will build upon this stable foundation to provide:
1. **Persistent Inference Job Tracking**: Durable job IDs stored in SQLite/Redis to allow job reconnection across network drops.
2. **Dynamic Fair Rate Limiting**: Per-visitor token bucket rate limits with clear HTTP 429 Retry-After headers.
3. **Queue Visibility**: Live UI queue position and estimated wait times during high-traffic periods.
4. **CPU Inference Optimization**: AVX2/AVX-512 quantization benchmarking for sub-second text completions on commodity hardware.

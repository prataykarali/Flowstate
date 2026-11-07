# PrismLab S5-H — Production Deployment & Infrastructure Audit

## 1. Executive Summary & Host Topology

PrismLab Playground is deployed as a hybrid edge-and-local inference system designed to serve Liquid AI's Liquid Foundation Models (LFM3 and d1) under strict CPU-only constraints on consumer-grade laptop silicon without GPU offloading (`PRISMLAB_GPU_LAYERS=0`).

```
+---------------------------------------------------------------------------------+
|                                 CLIENT BROWSERS                                 |
|                   (Desktop / Mobile Safari / Mobile Chrome)                    |
+---------------------------------------+-----------------------------------------+
                                        |
                 +----------------------+----------------------+
                 | HTTPS (Public DNS)                          | HTTPS (API / CORS)
                 v                                             v
+----------------------------------+        +-------------------------------------+
|        VERCEL PRODUCTION         |        |          TAILSCALE FUNNEL           |
| (prismlab-playground-rho.vercel) |        | (pratay-karali-aspire-a515-58gm...ts) |
|  - Next.js / Vite Static Assets  |        |  - TLS Termination                  |
|  - Edge Scoring /api/league      |        |  - Encrypted Tunneling              |
+-----------------+----------------+        +------------------+------------------+
                  |                                            |
                  | Supabase pg REST                           | Localhost Loopback:8000
                  v                                            v
+----------------------------------+        +-------------------------------------+
|        SUPABASE DATABASE         |        |       LOCAL BUBBLEWRAP JAIL         |
|   (Project: tvzntaafqzixvnavygai) |        |  - systemd: prismlab-inference      |
|  - verified_receipts (HMAC SHA256|        |  - uvicorn public_gateway:app:8000  |
|  - visitor_profiles (deduped)    |        |  - Read-Only Mounts: /usr, /models  |
|  - championship_points (signed)  |        |  - Writable WAL: .prismlab-local/   |
+----------------------------------+        +------------------+------------------+
                                                               |
                                            +------------------+------------------+
                                            |   LLAMA.CPP INFERENCE RUNTIMES      |
                                            |  - Port 8080: LFM3-1.7B (Text warm) |
                                            |  - Port 8188: Multimodal / d1 on-dem|
                                            +-------------------------------------+
```

### Hardware Specifications
- **Host Device**: Acer Aspire A515-58GM
- **CPU**: 13th Gen Intel Core i5-13420H (4 Performance cores with HyperThreading, 4 Efficiency cores; 12 logical execution threads)
- **RAM**: 16.0 GB DDR4
- **Swap**: 4.0 GB zram/swapfile
- **OS**: Ubuntu Linux 24.04 LTS (x86_64)

---

## 2. Bubblewrap Confinement & Security Architecture

The inference engine runs strictly inside an unprivileged Bubblewrap (`bwrap`) container. The isolation ensures fail-closed sandboxing:

### Active Sandbox Arguments
```bash
bwrap \
  --unshare-all \
  --share-net \
  --ro-bind /usr /usr \
  --ro-bind /lib /lib \
  --ro-bind /lib64 /lib64 \
  --ro-bind /bin /bin \
  --ro-bind /etc /etc \
  --proc /proc \
  --dev /dev \
  --tmpfs /tmp \
  --ro-bind /home/pratay-karali/Desktop/flowstate/lfm3-prismlab/prismlab /app/prismlab \
  --ro-bind /home/pratay-karali/Desktop/flowstate/lfm3-prismlab/.prismlab-local/models /models \
  --ro-bind /home/pratay-karali/Desktop/llama.cpp/build/bin /runtime \
  --ro-bind /home/pratay-karali/Desktop/flowstate/.venv /venv \
  --bind /home/pratay-karali/Desktop/flowstate/lfm3-prismlab/.prismlab-local /state \
  --chdir /state \
  /venv/bin/python -m uvicorn prismlab.public_gateway:app --host 127.0.0.1 --port 8000 --workers 1 --no-access-log
```

### Security Guarantees
1. **Filesystem Immutability**: All system binaries (`/usr`, `/bin`), model weights (`/models`), and Python runtime libraries (`/venv`) are mounted strictly read-only (`--ro-bind`). The worker process cannot alter code or model parameters.
2. **Ephemeral Scratch**: `/tmp` is a transient memory-backed `tmpfs`.
3. **State Isolation**: The only writable directory on the host is the isolated `.prismlab-local` directory (`/state`), containing the SQLite WAL database and session keys.
4. **Namespace Isolation**: `--unshare-all` unshares IPC, PID, User, UTS, and Cgroup namespaces. Host processes and files outside the jail are completely invisible to the gateway.
5. **Fail-Closed Execution**: If Bubblewrap initialization encounters AppArmor or unprivileged namespace restrictions, `scripts/prismlab_local.py` refuses to start the gateway unless explicitly bypassed for local development (`PRISMLAB_ALLOW_UNCONFINED_DEV=1`).

---

## 3. Daemon & Service Lifecycle Management

The public gateway is managed as a systemd user service (`prismlab-inference.service`) to provide automatic startup, restart on failure, and clean log aggregation via `journald`.

### Service Definition (`~/.config/systemd/user/prismlab-inference.service`)
```ini
[Unit]
Description=PrismLab LFM Inference Gateway
Documentation=https://github.com/prataykarali/lfm3-prismlab
After=default.target
StartLimitIntervalSec=120
StartLimitBurst=5

[Service]
Type=simple
WorkingDirectory=/home/pratay-karali/Desktop/flowstate/lfm3-prismlab
ExecStart=/home/pratay-karali/Desktop/flowstate/.venv/bin/python scripts/prismlab_local.py run
Restart=on-failure
RestartSec=5s
RestartPreventExitStatus=1
TimeoutStopSec=15s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
```

### Crash Recovery & SQLite WAL Reconciliation
On service restart or unexpected daemon abort, `ActivitySessionManager` performs atomic reconciliation before admitting new inference requests:
1. Opens SQLite database in write-ahead log (`PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;`).
2. Queries all sessions marked `active`.
3. Transitions any session whose lease expired during downtime to `expired`.
4. Transitions orphaned sessions with dead worker PIDs to `interrupted`.
5. Clears stale in-flight queue handles, ensuring no orphaned locks block fresh visitor traffic.

---

## 4. CPU Thread Affinity & Latency Optimization

### 4 Physical P-Cores vs 6 Threads Empirical Rationale
The Intel Core i5-13420H has a hybrid architecture consisting of:
- **4 Performance Cores (P-cores)**: Raptor Cove architecture, HyperThreading enabled (8 threads), 4.6 GHz max Turbo.
- **4 Efficient Cores (E-cores)**: Gracemont architecture, single-threaded, 3.4 GHz max Turbo.

Empirical thread scaling benchmarks conducted in Milestone B/C demonstrated:

| Config | Prompt Eval (t/s) | Generation (t/s) | Total Latency (48 tok) | Effective TPS | Jitter / Stability |
|---|---|---|---|---|---|
| **2 threads** | 16.94 | 7.84 | 6.83s | 7.03 | Low |
| **3 threads** | 19.61 | 9.02 | 5.93s | 8.10 | Low |
| **4 threads (Selected)** | **23.54** | **9.41** | **5.59s** | **8.58** | **Extremely Stable** |
| 4 threads (Pinned) | 18.87 | 9.31 | 5.79s | 8.29 | Stable |
| 6 threads | 26.89 | 10.87 | 4.85s | 9.90 | High Latency Variance |

**Why 4 Threads Was Selected For Public Beta:**
1. **Elimination of E-Core Migration Jitter**: When 6 threads are allocated, the OS scheduler periodically migrates matrix-multiplication worker threads between high-IPC P-cores and low-IPC E-cores, causing tail-latency spikes up to 40% higher on sequential turns.
2. **Thermal Headroom**: Sustained 6-thread AVX2 execution increases package temperature toward 85°C, triggering Intel thermal throttling after ~3 minutes of continuous execution. 4 threads maintains package temperatures < 68°C under continuous soak.
3. **Dedicated OS & Funnel Capacity**: Keeping the 4 E-cores free allows Uvicorn async I/O, SQLite WAL commits, and Tailscale WireGuard crypto packets to execute without competing with llama.cpp AVX2 compute kernels.

---

## 5. Dual-Model Warm Retention & On-Demand Lifecycle

To balance responsiveness with RAM constraints (16 GB installed, 4 GB swap):
- **Prism Pure (`text`, LFM3-1.7B)** is kept resident on port 8080 (`PRISMLAB_RETAIN_TEXT_WARM=1`) with context 2048 and cache reuse.
- **Multimodal & Decision models** (`vision`, `audio`, `omni`, `d1`, `d1_omni`) run on-demand on port 8188 via `LifecycleManager` with `max_managed=1`.
- When a multimodal request arrives, the previous multimodal model is cleanly stopped (`SIGTERM` followed by timeout kill if needed), and the requested model is launched. The text model remains warm, allowing rapid switching between story narration and specialized multimodal perception.
- Active models are protected by `busy_model` context managers against premature cooldown reaper collection (`PRISMLAB_IDLE_COOLDOWN_SECONDS=600`).

---

## 6. Operational Runbook & Health Checks

### Routine Verification Commands
```bash
# 1. Check systemd daemon status
systemctl --user status prismlab-inference

# 2. View live journal logs
journalctl --user-unit=prismlab-inference -f

# 3. Test local gateway health
curl -s http://127.0.0.1:8000/local-api/models

# 4. Check Tailscale funnel status
tailscale status
tailscale funnel status

# 5. Execute end-to-end inference verification
python3 tests/test_production_suite.py
```

### Emergency Restart Procedure
```bash
# Graceful restart (reconciles SQLite WAL automatically)
systemctl --user restart prismlab-inference

# Verify process in sandbox
ps aux | grep bwrap
```

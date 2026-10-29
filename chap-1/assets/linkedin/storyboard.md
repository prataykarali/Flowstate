# FlowState Δ — 34-Second AI Research Documentary Showcase

**Creative Direction:** Cinematic scientific visualization meets professional AI research documentary.  
**Tone & Palette:** Dark charcoal background (`#050811`), subtle violet (`#c084fc`) & cyan (`#38bdf8`) glow highlights, emerald (`#34d399`) and rose (`#fb7185`) data indicators, high-contrast crisp typography.  
**Resolution & Audio:** 1920×1080 Full HD, 30 fps, progressive H.264 MP4 with synchronized stereo electronic music bed and UI sound design.  
**Primary Deliverable:** `chap-1/assets/linkedin/flowstate-research-summary.mp4`

---

## Detailed Scene Breakdown & Timing (0.0s – 34.0s)

### Scene 1: The Opening Hook (0.0s – 4.0s)
- **Visuals:** Cinematic processor macro shot (`chip_macro_2.jpg`) with camera dolly push (scale 1.12 $\to$ 1.0) and atmospheric vignette.
- **Narrative Motion:**
  - Micro-tag: `FlowState Δ // AI Research Investigation`
  - Headline: **"What happens when neural memory starts forgetting?"**
  - Subline: *"An empirical investigation into recurrent state updating, key interference, and bounded associative recall in PyTorch."*
- **Audio:** Deep atmospheric bass drop (`sfx_drop.ogg`) + synchronized beat entrance.
- **Beat Hit:** 1.60s strong beat transition.

---

### Scene 2: What Was Implemented — Mini Hybrid Decoder (4.0s – 9.0s)
- **Visuals:** High-tech glowing architecture diagram (`model_flow.png`).
- **Narrative Motion:**
  - Header: `FlowState MiniHybridLM Decoder Architecture` | `Chapter 1 Verified Implementation`
  - Staggered layer assembly:
    - Layers 0–2: GatedDeltaNet Recurrent Blocks — State $S \in \mathbb{R}^{B \times H \times 32 \times 32}$
    - Layer 3: Causal GQA — 4 Query Heads // 2 Key/Value Heads with RoPE rotary embeddings
    - Sublayer normalization: RMSNorm + SwiGLU FFN (`mlp_dim = 256`) + residual connections
  - Recurrent Update Equation:
    $$S_t = \alpha_t S_{t-1} + \beta_t k_t \otimes (v_t - k_t^\top S_{t-1})$$
    - Decay ($\alpha$): Smoothly attenuates past associations
    - Prediction ($\hat{v} = k^\top S$): Predicts stored value
    - Delta Correction: Outer product update only on error $\delta = v - \hat{v}$
- **Audio:** Crisp UI toggle switches (`sfx_switch.ogg`) on block entrance.
- **Beat Hit:** 4.75s and 5.80s strong beats.

---

### Scene 3: The Central Research Problem — Key-Value Interference (9.0s – 17.0s)
- **Visuals:** 3D vector space and coordinate planes (`vector_math.png`) alongside genuine Chapter 2 Matplotlib plot (`fig_interference.png`).
- **Narrative Motion:**
  - Header: `Chapter 2 Research: Overlapping-Key Interference` | `Empirical Benchmark`
  - Dynamic focus ring surrounds the climbing L2 error curve on the real plot.
  - Kinetic Stat Reveal:
    - **1.0126 L2 Error** (Rose warning glow)
    - Detail: Writing non-orthogonal key $k_3 = [1/\sqrt{2}, 1/\sqrt{2}]$ projects onto earlier orthogonal directions $k_1=[1,0]$ and $k_2=[0,1]$, corrupting prior stored values.
  - Contrast with 3D Orthogonal Keys:
    - **0.0000 L2 Error** (Exact Retrieval when $k_i \cdot k_j = 0$)
  - Scientific Disclaimer: *"Zero error is specific to idealized one-hot synthetic benchmarks, not a universal guarantee for dense learned representations."*
- **Audio:** Data alert clicks (`sfx_switch.ogg`) + swelling synth rhythm.
- **Beat Hit:** 10.54s and 12.65s strong beats.

---

### Scene 4: Memory Capacity & Physical Storage Scaling (17.0s – 24.0s)
- **Visuals:** Genuine Matplotlib storage scaling figure (`fig_storage.png`) with comparative glassmorphism cards.
- **Narrative Motion:**
  - Header: `Memory Capacity vs Physical Storage Scaling` | `Capacity Trade-Off`
  - Comparative Cards:
    - **Fixed Recurrent State: 36 Bytes (Constant)** — Memory size never grows with sequence length, but fixed rank causes interference once capacity saturates.
    - **Orthogonal & Slot Expansion: 1,200 Bytes at 100 Keys** — Eliminates interference by scaling linearly: supporting $N$ independent associations requires $\text{dim}(k) \ge N$.
    - **Variable-Length Values (Exp C):** Testing dimensions $d=3, 5, 8$ — dynamic allocation uses **64 Bytes** vs. **120 Bytes** for fixed padded structures.
- **Audio:** Mechanical UI clicks (`sfx_click.ogg`).
- **Beat Hit:** 17.91s and 22.65s strong beats.

---

### Scene 5: Noisy Retrieval & Confidence Gating (24.0s – 30.0s)
- **Visuals:** Genuine Matplotlib confidence gating curve (`fig_confidence.png`).
- **Narrative Motion:**
  - Header: `Noisy-Query Robustness & Confidence Gating` | `Cosine Threshold τ = 0.80`
  - Gaussian Query Noise $\sigma = 1.0$ Benchmark:
    - **Accepted Accuracy: 73.80%** (Cyan glow, +9.3% boost over 64.50% ungated)
    - **Response Coverage: 45.17%** (Amber glow, rejects 54.83% ambiguous queries)
  - Scientific Meaning: Confidence gating filters out high-entropy retrievals under noise. Higher accuracy on accepted predictions comes at the deliberate cost of lower coverage.
- **Audio:** Mode toggle switch (`sfx_switch.ogg`).
- **Beat Hit:** 24.75s and 28.43s strong beats.

---

### Scene 6: Research Takeaway & Open Science (30.0s – 34.0s)
- **Visuals:** Scientific data landscape with waveforms and loss curves (`data_landscape.png`).
- **Narrative Motion:**
  - Takeaway Banner: **"Compact memory. Interference. Retrieval reliability."**
  - Brand Mark: **FlowState Δ**
  - Subtitle: *"Independent Educational Research — PyTorch"*
  - Repository URL: `github.com/prataykarali/Flowstate`
- **Audio:** Deep resolving bass drop (`sfx_drop.ogg`) with smooth audio fade-out at 34.0s.

# Chapter 4 — Dynamical Systems for Neural Networks

**FlowState Δ | Curriculum v2.0 | Status: laboratory in progress (closure pending)**

## Objective

Understand discrete-time recurrent state transitions, stability, input-driven hidden states, and the connection to continuous-time dynamics. This chapter builds mathematical foundations for later LTC/CfC and state-space model research; it is **not** a trained language model or a performance optimization claim.

## Main equations

For an autonomous discrete-time system:

```text
h[t+1] = A @ h[t]
h[n]   = A^n @ h[0]
```

For an input-driven system:

```text
h[t+1] = A @ h[t] + B @ x[t]
```

For a scalar continuous-time decay process:

```text
dh/dt = -h/tau
h(t)  = h(0) * exp(-t/tau)
Euler: h(t+dt) ~= h(t) + dt * (-h(t)/tau)
```

For a fixed linear transition matrix `A`, `rho(A) < 1` guarantees asymptotic stability, while `rho(A) > 1` guarantees instability for at least some initial states. `rho(A) = 1` requires further analysis.

## Files and reproducible experiments

| File | Purpose | Verification |
|---|---|---|
| `matrix_dynamics.py` | 10-step recurrence and spectral radius for stable `A` | Terminal output verified 2026-11-13; local script to be committed |
| `matrix_dynamics_growth.py` | Same setup, changing only `A[0,0]` from `0.8` to `1.2` | Terminal output verified 2026-11-13; local script to be committed |
| `input_dynamics.py` | Single input pulse, then recurrent evolution with no new input | Terminal output verified 2026-11-13; local script to be committed |
| `dynamics_lab.ipynb` | Visualization of pulse response | Notebook screenshot reviewed; local notebook to be committed |
| `stability_cases.py` | Four-case sweep: decay, persistence, oscillation, instability | **Pending** |

Use the existing FlowState Python environment with `torch` and `matplotlib`, then run:

```bash
python matrix_dynamics.py
python matrix_dynamics_growth.py
python input_dynamics.py
# after creating the four-case sweep:
python stability_cases.py
```

## Results obtained (2026-11-13)

### E04-A: Stable coupled recurrence

```python
A = [[0.8, 0.2],
     [0.1, 0.5]]
h0 = [10.0, 6.0]
```

- `h1 = [9.2, 4.0]`
- `h2 = [8.16, 2.92]`
- `h10 = [2.4432498984, 0.6869540476]`
- Eigenvalues approximately `0.8562`, `0.4438`; spectral radius approximately `0.856155`.
- Interpretation: both components converge toward zero asymptotically.

### E04-B: Unstable coupled recurrence

Only `A[0,0]` is changed, from `0.8` to `1.2`.

- `h10 = [87.1726743096, 11.9852004676]`
- Eigenvalues approximately `1.2275`, `0.4725`; spectral radius approximately `1.227492`.
- Interpretation: the second component initially declines, then grows because it is coupled to the expanding first component.

### E04-C: Input pulse and state retention

```python
A = [[0.8, 0.2], [0.1, 0.5]]
B = [2.0, -1.0]
h0 = [0.0, 0.0]
inputs = [1, 0, 0, 0, 0]
```

- After the input pulse, `h1 = [2.0, -1.0]`.
- With zero subsequent inputs: `h2 = [1.4, -0.3]`, `h3 = [1.06, -0.01]`, `h4 = [0.846, 0.101]`, `h5 = [0.697, 0.1351]`.
- Interpretation: existing hidden state continues evolving without a new input; positive coupling from the first component eventually makes the second positive.
- This is **fixed-matrix state propagation**, not learned associative memory or gradient accumulation.

## Chapter 4 closure criteria

- [x] Scalar and coupled matrix recurrence calculations
- [x] Eigenvalues, eigenvectors, spectral radius, and boundary-case intuition
- [x] Continuous-time decay and Euler vs exact solution concepts
- [x] Stable recurrence terminal verification (E04-A)
- [x] Unstable recurrence terminal verification (E04-B)
- [x] Input-driven memory pulse terminal verification (E04-C)
- [x] Pulse-response notebook visualization inspected
- [ ] Save plots showing **decay, persistence, oscillation, and instability**, including eigenvalue interpretations
- [ ] Verify all repository files execute from a clean clone/environment
- [ ] Commit the final scripts, notebook, plots, and update this README to **Complete**

## Research provenance

These are teaching experiments using explicitly specified synthetic matrices. They do not establish model accuracy, speedup, novelty, or application-level memory quality. Preserve console logs, configurations, source code, and generated figures before making any research claim. This chapter does **not** trigger Nishant N1 outreach.

**Next:** Chapter 5 — Numerical ODE Solvers (Euler, RK2, RK4, step-size error and runtime comparisons).

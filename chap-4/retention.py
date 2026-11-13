
def simulate(a, b, inputs, h0=0.0):
    h = h0
    states = [h]

    for x in inputs:
        h = a * h + b * x
        states.append(h)

    return states


inputs = [5] + [0] * 10

configs = [
    (0.6, 0.4),
    (0.9, 0.4),
    (0.9, 0.8),
]

for a, b in configs:
    states = simulate(a, b, inputs)

    print(f"a={a}, b={b}")
    print(f"  First update: {states[1]:.4f}")
    print(f"  Final state:  {states[-1]:.4f}")

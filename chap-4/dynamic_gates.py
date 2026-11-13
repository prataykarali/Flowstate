
def update_state(h, x):
    if x >= 3:
        a = 0.2
        b = 0.9
    else:
        a = 0.9
        b = 0.1

    new_h = a * h + b * x
    return new_h, a, b


inputs = [5, 0, 1, 0, 4, 0]
h = 0.0

for t, x in enumerate(inputs):
    h, a, b = update_state(h, x)

    print(
        f"t={t} | x={x} | "
        f"a={a:.1f} | b={b:.1f} | h={h:.4f}"
    )

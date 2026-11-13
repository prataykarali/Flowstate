
a = 0.6
b = 0.4
h = 2.0

inputs = [5, 0, 0, 0, 0]

states = [h]

for t, x in enumerate(inputs):
    h = a * h + b * x
    states.append(h)
    print(f"h[{t+1}] = {h:.4f}")

print("All states:", states)

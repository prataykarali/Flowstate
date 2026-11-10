export function gazeOffset(pointerX, pointerY, centerX, centerY) {
  const dx = pointerX - centerX;
  const dy = pointerY - centerY;
  const distance = Math.hypot(dx, dy);
  if (distance <= 5) return { x: 0, y: 0 };
  const strength = Math.min(distance / 300, 1);
  return {
    x: (dx / distance) * 2.4 * strength,
    y: (dy / distance) * 1.8 * strength
  };
}

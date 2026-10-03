const collisions = [];

export function addCollision(x, z, radius) {
  collisions.push({ x, z, radius });
}

export function checkCollision(x, z, pr = 0.8) {
  for (const c of collisions) {
    const dx = x - c.x;
    const dz = z - c.z;
    if (dx * dx + dz * dz < (c.radius + pr) * (c.radius + pr)) return true;
  }
  return false;
}

export function clearCollisions() {
  collisions.length = 0;
}
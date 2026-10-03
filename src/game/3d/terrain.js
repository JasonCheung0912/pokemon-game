import { WATER_BODIES, BIOME_ZONES, CAVE } from '@/game/config';

function noise2D(x, z) {
  return Math.sin(x * 0.03) * Math.cos(z * 0.025) * 2.5
    + Math.sin(x * 0.08 + z * 0.06) * 0.8
    + Math.cos(x * 0.015 + z * 0.02) * 2.5;
}

function getCaveDepth(x, z) {
  const dx = x - CAVE.centerX;
  const dz = z - CAVE.centerZ;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < CAVE.radius) {
    const t = 1 - (dist / CAVE.radius);
    return -CAVE.depth * t * t;
  }
  return 0;
}

export function getTerrainHeight(x, z) {
  let h = noise2D(x, z) + getCaveDepth(x, z);
  for (const water of WATER_BODIES) {
    const dx = x - water.x;
    const dz = z - water.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < water.radius) {
      const t = 1 - (dist / water.radius);
      const depth = water.depth * t * t;
      h = h * (1 - t * t) - depth;
    }
  }
  return h;
}

export function getBaseTerrainHeight(x, z) {
  return noise2D(x, z) + getCaveDepth(x, z);
}

export function isOverWater(x, z) {
  for (const water of WATER_BODIES) {
    const dx = x - water.x;
    const dz = z - water.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < water.radius * 0.85) return true;
  }
  return false;
}

export function getBiome(x, z) {
  for (const w of WATER_BODIES) {
    if (Math.sqrt((x - w.x) ** 2 + (z - w.z) ** 2) < w.radius + 5) return 'water';
  }
  for (const zone of BIOME_ZONES) {
    if (x >= zone.xMin && x <= zone.xMax && z >= zone.zMin && z <= zone.zMax) return zone.biome;
  }
  return 'forest';
}

export function isInCave(x, z) {
  const dx = x - CAVE.centerX;
  const dz = z - CAVE.centerZ;
  return Math.sqrt(dx * dx + dz * dz) < CAVE.radius;
}
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BIOME_ZONES } from '@/game/config';

// Shimmering energy wall sealing the Legendary Realm — only a God/Admin run
// can pass (the Player controller clamps movement at the zone border).
export function LegendaryBarrier() {
  const mats = useRef([]);
  useFrame((state) => {
    const o = 0.25 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    mats.current.forEach(m => { if (m) m.opacity = o; });
  });
  const zone = BIOME_ZONES.find(z => z.biome === 'legendary');
  if (!zone) return null;
  const w = zone.xMax - zone.xMin, d = zone.zMax - zone.zMin;
  const cx = (zone.xMin + zone.xMax) / 2, cz = (zone.zMin + zone.zMax) / 2;
  const h = 26, t = 2;
  const walls = [
    { pos: [0, 0, d / 2], size: [w, h, t] },
    { pos: [0, 0, -d / 2], size: [w, h, t] },
    { pos: [w / 2, 0, 0], size: [t, h, d] },
    { pos: [-w / 2, 0, 0], size: [t, h, d] },
  ];
  return (
    <group position={[cx, h / 2 - 4, cz]}>
      {walls.map((wall, i) => (
        <mesh key={i} position={wall.pos}>
          <boxGeometry args={wall.size} />
          <meshStandardMaterial
            ref={el => { mats.current[i] = el; }}
            color="#A855F7" emissive="#7C3AED" emissiveIntensity={1.2}
            transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
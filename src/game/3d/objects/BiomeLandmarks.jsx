import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETTE, BIOME_ZONES, TEXTURES } from '@/game/config';
import { getTerrainHeight } from '@/game/3d/terrain';
import { addCollision } from '@/game/3d/collisions';
import { useSafeTexture } from '@/game/3d/textures';

function zonePoints(biome, count, seed, margin = 20) {
  const zone = BIOME_ZONES.find(z => z.biome === biome);
  if (!zone) return [];
  let s = seed;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const pts = [];
  for (let i = 0; i < count; i++) {
    const x = zone.xMin + margin + rand() * (zone.xMax - zone.xMin - margin * 2);
    const z = zone.zMin + margin + rand() * (zone.zMax - zone.zMin - margin * 2);
    pts.push({ x, z, y: getTerrainHeight(x, z) });
  }
  return pts;
}

// ─── ROCKLAND — towering stone spires ───
function Rockland() {
  const spires = useMemo(() => zonePoints('rock', 14, 311).map((p, i) => ({
    ...p, h: 8 + ((i * 7) % 9), r: 2 + ((i * 5) % 3),
  })), []);
  useEffect(() => {
    const t = setTimeout(() => spires.forEach(s => addCollision(s.x, s.z, s.r * 0.8)), 0);
    return () => clearTimeout(t);
  }, [spires]);
  return (
    <group>
      {spires.map((s, i) => (
        <mesh key={i} position={[s.x, s.y + s.h / 2, s.z]} castShadow>
          <coneGeometry args={[s.r, s.h, 7]} />
          <meshStandardMaterial color={PALETTE.rockSpire} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}

// ─── WINDLAND — spinning wind turbines on open plains ───
function WindTurbine({ p, i }) {
  const bladesRef = useRef();
  useFrame((state, delta) => { if (bladesRef.current) bladesRef.current.rotation.z += delta * (1 + i * 0.2); });
  return (
    <group position={[p.x, p.y, p.z]}>
      <mesh position={[0, 11, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.8, 22, 8]} />
        <meshStandardMaterial color={PALETTE.windTurbine} roughness={0.6} />
      </mesh>
      <group ref={bladesRef} position={[0, 22, 0.7]}>
        {[0, 1, 2].map(b => (
          <group key={b} rotation={[0, 0, (b * Math.PI * 2) / 3]}>
            <mesh position={[0, 4.5, 0]} castShadow>
              <boxGeometry args={[0.9, 9, 0.15]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
            </mesh>
          </group>
        ))}
        <mesh>
          <sphereGeometry args={[0.9, 10, 10]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

function Windland() {
  const spots = useMemo(() => zonePoints('wind', 7, 517), []);
  useEffect(() => {
    const t = setTimeout(() => spots.forEach(s => addCollision(s.x, s.z, 1)), 0);
    return () => clearTimeout(t);
  }, [spots]);
  return <>{spots.map((p, i) => <WindTurbine key={i} p={p} i={i} />)}</>;
}

// ─── DESERT — sand dunes and cacti ───
function Desert() {
  const cacti = useMemo(() => zonePoints('desert', 12, 713).map((p, i) => ({ ...p, s: 1.3 + ((i * 3) % 4) * 0.4 })), []);
  const dunes = useMemo(() => zonePoints('desert', 10, 919, 30).map((p, i) => ({ ...p, s: 6 + ((i * 4) % 5) * 2 })), []);
  useEffect(() => {
    const t = setTimeout(() => cacti.forEach(c => addCollision(c.x, c.z, 0.6)), 0);
    return () => clearTimeout(t);
  }, [cacti]);
  return (
    <group>
      {dunes.map((d, i) => (
        <mesh key={`d${i}`} position={[d.x, d.y + d.s * 0.12, d.z]}>
          <sphereGeometry args={[d.s, 12, 8]} />
          <meshStandardMaterial color={PALETTE.sand} roughness={1} />
        </mesh>
      ))}
      {cacti.map((c, i) => (
        <group key={`c${i}`} position={[c.x, c.y, c.z]} scale={c.s}>
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.45, 3, 8]} />
            <meshStandardMaterial color={PALETTE.cactus} roughness={0.9} />
          </mesh>
          <mesh position={[0.8, 1.6, 0]} rotation={[0, 0, -0.5]} castShadow>
            <cylinderGeometry args={[0.22, 0.22, 1.4, 6]} />
            <meshStandardMaterial color={PALETTE.cactus} roughness={0.9} />
          </mesh>
          <mesh position={[1.35, 2.4, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.22, 1.2, 6]} />
            <meshStandardMaterial color={PALETTE.cactus} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── LEGENDARY REALM — a glowing shrine where only legendaries spawn ───
function LegendaryRealm() {
  const zone = BIOME_ZONES.find(z => z.biome === 'legendary');
  const crystalsRef = useRef();
  const crystals = useMemo(() => {
    if (!zone) return [];
    const cx = (zone.xMin + zone.xMax) / 2;
    const cz = (zone.zMin + zone.zMax) / 2;
    let s = 424;
    const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const arr = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + rand() * 0.5;
      const d = 18 + rand() * 55;
      arr.push({ x: cx + Math.cos(a) * d, z: cz + Math.sin(a) * d, size: 1.2 + rand() * 2, phase: rand() * Math.PI * 2 });
    }
    return arr;
  }, []);
  useFrame((state) => {
    if (!crystalsRef.current) return;
    const t = state.clock.elapsedTime;
    crystalsRef.current.children.forEach((c, i) => {
      c.position.y = getTerrainHeight(crystals[i].x, crystals[i].z) + 3 + Math.sin(t * 1.2 + crystals[i].phase) * 0.8;
      c.rotation.y = t * 0.5 + crystals[i].phase;
    });
  });
  if (!zone) return null;
  const cx = (zone.xMin + zone.xMax) / 2, cz = (zone.zMin + zone.zMax) / 2;
  const cy = getTerrainHeight(cx, cz);
  return (
    <group>
      {/* Central beacon */}
      <mesh position={[cx, cy + 6, cz]}>
        <cylinderGeometry args={[0.5, 0.5, 12, 8]} />
        <meshStandardMaterial color={PALETTE.legendaryPurple} emissive={PALETTE.legendaryCrystal} emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[cx, cy + 0.6, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[8, 11, 32]} />
        <meshStandardMaterial color={PALETTE.legendaryCrystal} emissive={PALETTE.legendaryCrystal} emissiveIntensity={0.7} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* Gate pillars */}
      {[0, 1, 2, 3].map(i => {
        const a = (i / 4) * Math.PI * 2;
        const px = cx + Math.cos(a) * 11, pz = cz + Math.sin(a) * 11;
        return (
          <mesh key={i} position={[px, getTerrainHeight(px, pz) + 3, pz]} castShadow>
            <cylinderGeometry args={[0.7, 0.9, 6, 6]} />
            <meshStandardMaterial color="#6b21a8" emissive={PALETTE.legendaryCrystal} emissiveIntensity={0.35} flatShading />
          </mesh>
        );
      })}
      {/* Floating crystals */}
      <group ref={crystalsRef}>
        {crystals.map((c, i) => (
          <mesh key={i} position={[c.x, 3, c.z]}>
            <octahedronGeometry args={[c.size, 0]} />
            <meshStandardMaterial color={PALETTE.legendaryCrystal} emissive={PALETTE.legendaryCrystal} emissiveIntensity={0.9} transparent opacity={0.85} />
          </mesh>
        ))}
      </group>
      <pointLight position={[cx, cy + 10, cz]} color={PALETTE.legendaryCrystal} intensity={5} distance={90} />
    </group>
  );
}

// ─── HURRICANE LAND — stormy shores: swaying kelp, shells, driftwood ───
function HurricaneLand() {
  const kelp = useMemo(() => zonePoints('hurricane', 40, 626).map((p, i) => ({ ...p, h: 1.5 + ((i * 3) % 5) * 0.5 })), []);
  const shells = useMemo(() => zonePoints('hurricane', 18, 728), []);
  const wood = useMemo(() => zonePoints('hurricane', 6, 839), []);
  const kelpRef = useRef([]);
  useEffect(() => {
    const t = setTimeout(() => kelp.forEach(k => addCollision(k.x, k.z, 0.3)), 0);
    return () => clearTimeout(t);
  }, [kelp]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    kelpRef.current.forEach((g, i) => { if (g) g.rotation.z = Math.sin(t * 1.4 + i) * 0.18; });
  });
  return (
    <group>
      {kelp.map((k, i) => (
        <group key={i} ref={el => kelpRef.current[i] = el} position={[k.x, k.y, k.z]}>
          <mesh position={[0, k.h / 2, 0]}>
            <cylinderGeometry args={[0.06, 0.12, k.h, 5]} />
            <meshStandardMaterial color={i % 3 === 0 ? PALETTE.kelpDark : PALETTE.kelp} roughness={0.8} />
          </mesh>
          <mesh position={[0.3, k.h * 0.9, 0]} rotation={[0, i, 0.6]}>
            <cylinderGeometry args={[0.03, 0.08, k.h * 0.7, 5]} />
            <meshStandardMaterial color={PALETTE.kelp} roughness={0.8} />
          </mesh>
        </group>
      ))}
      {shells.map((s, i) => (
        <mesh key={`s${i}`} position={[s.x, s.y + 0.08, s.z]} rotation={[-Math.PI / 2, 0, i]}>
          <circleGeometry args={[0.3 + (i % 3) * 0.08, 8, 0, Math.PI * 1.6]} />
          <meshStandardMaterial color={PALETTE.shell} roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {wood.map((w, i) => (
        <mesh key={`w${i}`} position={[w.x, w.y + 0.25, w.z]} rotation={[0, i * 1.3, 0.06]} castShadow>
          <cylinderGeometry args={[0.2, 0.3, 3.5, 6]} />
          <meshStandardMaterial color="#6b4f35" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Endless horizon ───
// A giant textured plane far beyond the playable edge, so the world never
// ends in void — fog blends it into an endless landscape.
function EndlessHorizon() {
  const ground = useSafeTexture(TEXTURES.ground, 220, 220);
  return (
    <mesh position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[4000, 4000]} />
      <meshStandardMaterial map={ground} color="#7aa85f" roughness={1} />
    </mesh>
  );
}

export function BiomeLandmarks() {
  return (
    <group>
      <EndlessHorizon />
      <Rockland />
      <Windland />
      <Desert />
      <HurricaneLand />
      <LegendaryRealm />
    </group>
  );
}
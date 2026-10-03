import { useMemo, useRef, useEffect, useState } from 'react';
import { Instances, Instance } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WORLD, PALETTE, WATER_BODIES, BIOME_ZONES, CAVE, TEXTURES } from '@/game/config';
import { setupTiling, useSafeTexture } from '@/game/3d/textures';
import { BiomeLandmarks } from '@/game/3d/objects/BiomeLandmarks';
import { BiomeGrounds } from '@/game/3d/objects/BiomeGrounds';
import { getTerrainHeight, getBaseTerrainHeight } from '@/game/3d/terrain';
import { addCollision, clearCollisions } from '@/game/3d/collisions';

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function TerrainMesh() {
  const geometry = useMemo(() => {
    const segs = 200;
    const geo = new THREE.PlaneGeometry(WORLD.size, WORLD.size, segs, segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, getTerrainHeight(x, z));
      let biome = 'forest';
      for (const zone of BIOME_ZONES) {
        if (x >= zone.xMin && x <= zone.xMax && z >= zone.zMin && z <= zone.zMax) { biome = zone.biome; break; }
      }
      let inWater = false;
      for (const w of WATER_BODIES) {
        if (Math.sqrt((x - w.x)**2 + (z - w.z)**2) < w.radius) { inWater = true; break; }
      }
      // Bright biome tints — they multiply into the realistic ground texture
      const groundColors = {
        forest: [0.74, 1.0, 0.64], volcano: [0.85, 0.55, 0.38],
        cave: [0.42, 0.42, 0.50], ice: [0.88, 0.94, 1.0], lightning: [0.90, 0.92, 0.50],
        rock: [0.80, 0.76, 0.70], wind: [0.80, 0.94, 1.0],
        desert: [0.98, 0.88, 0.55], legendary: [0.92, 0.82, 1.0],
      };
      const c = inWater ? [0.45, 0.60, 0.55] : (groundColors[biome] || groundColors.forest);
      colors.push(c[0], c[1], c[2]);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  const ground = useSafeTexture(TEXTURES.ground, 20, 20);
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial map={ground} vertexColors roughness={0.95} metalness={0} />
    </mesh>
  );
}

function WaterSurface({ data }) {
  const meshRef = useRef();
  const water = useSafeTexture(TEXTURES.water, 4, 4);
  const baseY = useMemo(() => getBaseTerrainHeight(data.x, data.z), [data]);
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.position.y = baseY + Math.sin(t * 1.5) * 0.05;
    // Slow ripple drift — no per-frame allocation
    if (water) {
      water.offset.x = (t * 0.02) % 1;
      water.offset.y = (t * 0.014) % 1;
    }
  });
  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, baseY, 0]}>
      <circleGeometry args={[data.radius, 48]} />
      <meshStandardMaterial map={water} color={PALETTE.water} transparent opacity={0.82} metalness={0.25} roughness={0.08} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Waterfall({ data }) {
  const ref = useRef();
  const particlesRef = useRef();
  const dirX = Math.cos(data.fallDir || 0);
  const dirZ = Math.sin(data.fallDir || 0);
  const wfX = data.x + dirX * data.radius * 0.9;
  const wfZ = data.z + dirZ * data.radius * 0.9;
  // The waterfall sits ON the ground: its base is the real terrain height at
  // the rim of the water body (not the sunken pit floor)
  const baseY = useMemo(() => getTerrainHeight(wfX, wfZ), [data]);

  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 20; i++) {
      arr.push({ x: (Math.random() - 0.5) * 3, y: Math.random() * data.fallHeight, speed: 3 + Math.random() * 4, size: 0.1 + Math.random() * 0.15 });
    }
    return arr;
  }, [data]);

  useFrame((state, delta) => {
    if (ref.current) ref.current.material.opacity = 0.7 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
    if (particlesRef.current) {
      particlesRef.current.children.forEach((p, i) => {
        p.position.y -= particles[i].speed * delta;
        if (p.position.y < 0) p.position.y = data.fallHeight;
      });
    }
  });

  return (
    <group position={[wfX, baseY, wfZ]}>
      <mesh ref={ref} position={[0, data.fallHeight / 2, 0]}>
        <planeGeometry args={[4, data.fallHeight, 1, 6]} />
        <meshStandardMaterial color={PALETTE.waterFall} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      <group ref={particlesRef}>
        {particles.map((p, i) => (
          <mesh key={i} position={[p.x, p.y, 0.3]}>
            <sphereGeometry args={[p.size, 6, 6]} />
            <meshStandardMaterial color={PALETTE.waterFall} transparent opacity={0.6} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 0.3, 0.8]} rotation={[-Math.PI / 4, 0, 0]}>
        <planeGeometry args={[6, 2]} />
        <meshStandardMaterial color="white" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, data.fallHeight / 2, -0.5]}>
        <boxGeometry args={[5, data.fallHeight, 1]} />
        <meshStandardMaterial color={PALETTE.rock\[1]} flatShading />
      </mesh>
    </group>
  );
}

function WaterBody({ data }) {
  return (
    <group position={[data.x, 0, data.z]}>
      <WaterSurface data={data} />
      {data.hasWaterfall && <Waterfall data={data} />}
    </group>
  );
}

function LightningEffects() {
  const boltsRef = useRef([]);
  const lightsRef = useRef([]);
  const flashTimers = useRef([]);

  const lightningData = useMemo(() => {
    const rand = seededRandom(123);
    const arr = [];
    const data = BIOME_ZONES.find(z => z.biome === 'lightning');
    if (!data) return arr;
    for (let i = 0; i < 8; i++) {
      const x = data.xMin + rand() * (data.xMax - data.xMin);
      const z = data.zMin + rand() * (data.zMax - data.zMin);
      arr.push({ x, z, y: getTerrainHeight(x, z) + 0.5 });
      flashTimers.current[i] = rand() * 3;
    }
    return arr;
  }, []);

  useFrame((state, delta) => {
    lightningData.forEach((l, i) => {
      flashTimers.current[i] -= delta;
      const flashing = flashTimers.current[i] <= 0 && flashTimers.current[i] > -0.12;
      if (flashTimers.current[i] <= -0.12) flashTimers.current[i] = 1.5 + Math.random() * 3;
      const bolt = boltsRef.current[i];
      const light = lightsRef.current[i];
      if (bolt) bolt.visible = flashing;
      if (light) light.intensity = flashing ? 8 : 0;
    });
  });

  return (
    <group>
      {lightningData.map((l, i) => (
        <group key={i} position={[l.x, l.y, l.z]}>
          <mesh ref={el => boltsRef.current[i] = el} visible={false}>
            <cylinderGeometry args={[0.12, 0.4, 28, 4]} />
            <meshBasicMaterial color="#FFFF44" transparent opacity={0.9} />
          </mesh>
          <pointLight ref={el => lightsRef.current[i] = el} color="#FFFF44" intensity={0} distance={40} />
        </group>
      ))}
    </group>
  );
}

function CaveInterior() {
  const decorations = useMemo(() => {
    const rand = seededRandom(555);
    const arr = [];
    for (let i = 0; i < 25; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = rand() * (CAVE.radius - 5);
      const x = CAVE.centerX + Math.cos(angle) * dist;
      const z = CAVE.centerZ + Math.sin(angle) * dist;
      const y = getTerrainHeight(x, z);
      const isStalactite = rand() > 0.5;
      arr.push({ x, y, z, isStalactite, scale: 0.3 + rand() * 0.7 });
    }
    return arr;
  }, []);

  const crystals = useMemo(() => {
    const rand = seededRandom(777);
    const arr = [];
    for (let i = 0; i < 12; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = rand() * (CAVE.radius - 8);
      const x = CAVE.centerX + Math.cos(angle) * dist;
      const z = CAVE.centerZ + Math.sin(angle) * dist;
      const y = getTerrainHeight(x, z);
      arr.push({ x, y, z, scale: 0.4 + rand() * 0.6, hue: rand() > 0.5 ? '#9370DB' : '#4169E1' });
    }
    return arr;
  }, []);

  return (
    <group>
      {/* Dim cave light */}
      <pointLight position={[CAVE.centerX, CAVE.centerY || -8, CAVE.centerZ]} color="#6a4a8a" intensity={2} distance={60} />
      {/* Stalactites & stalagmites */}
      {decorations.map((d, i) => (
        <mesh key={i} position={[d.x, d.isStalactite ? d.y + CAVE.wallHeight - d.scale * 2 : d.y, d.z]} castShadow>
          <coneGeometry args={[d.scale * 0.5, d.scale * 3, 5]} />
          <meshStandardMaterial color={PALETTE.caveRock} flatShading />
        </mesh>
      ))}
      {/* Glowing crystals */}
      {crystals.map((c, i) => (
        <mesh key={`cr${i}`} position={[c.x, c.y + c.scale, c.z]}>
          <octahedronGeometry args={[c.scale, 0]} />
          <meshStandardMaterial color={c.hue} emissive={c.hue} emissiveIntensity={0.6} transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function BiomeFeatures() {
  const volcanoData = useMemo(() => {
    const data = BIOME_ZONES.find(z => z.biome === 'volcano');
    if (!data) return null;
    const cx = (data.xMin + data.xMax) / 2;
    const cz = (data.zMin + data.zMax) / 2;
    return { cx, cz, baseY: getTerrainHeight(cx, cz) };
  }, []);
  const iceCrystals = useMemo(() => {
    const rand = seededRandom(99);
    const arr = [];
    const data = BIOME_ZONES.find(z => z.biome === 'ice');
    if (!data) return arr;
    for (let i = 0; i < 20; i++) {
      const x = data.xMin + rand() * (data.xMax - data.xMin);
      const z = data.zMin + rand() * (data.zMax - data.zMin);
      arr.push({ x, z, y: getTerrainHeight(x, z), scale: 0.5 + rand() * 1.5 });
    }
    return arr;
  }, []);
  const caveRocks = useMemo(() => {
    const rand = seededRandom(77);
    const arr = [];
    const data = BIOME_ZONES.find(z => z.biome === 'cave');
    if (!data) return arr;
    for (let i = 0; i < 15; i++) {
      const x = data.xMin + rand() * (data.xMax - data.xMin);
      const z = data.zMin + rand() * (data.zMax - data.zMin);
      // Skip rocks inside the cave pit (they'd be floating)
      const dist = Math.sqrt((x - CAVE.centerX)**2 + (z - CAVE.centerZ)**2);
      if (dist < CAVE.radius + 3) continue;
      arr.push({ x, z, y: getTerrainHeight(x, z), scale: 1 + rand() * 3 });
    }
    return arr;
  }, []);
  const lightningRods = useMemo(() => {
    const rand = seededRandom(88);
    const arr = [];
    const data = BIOME_ZONES.find(z => z.biome === 'lightning');
    if (!data) return arr;
    for (let i = 0; i < 10; i++) {
      const x = data.xMin + rand() * (data.xMax - data.xMin);
      const z = data.zMin + rand() * (data.zMax - data.zMin);
      arr.push({ x, z, y: getTerrainHeight(x, z), height: 3 + rand() * 5 });
    }
    return arr;
  }, []);

  return (
    <group>
      {volcanoData && (
        <group position={[volcanoData.cx, volcanoData.baseY, volcanoData.cz]}>
          {/* Realistic stratovolcano — layered ridged cone with a glowing crater lava lake */}
          <mesh castShadow>
            <coneGeometry args={[30, 42, 24, 3]} />
            <meshStandardMaterial color="#6b3d26" roughness={1} flatShading />
          </mesh>
          <mesh position={[0, 3, 0]} castShadow>
            <coneGeometry args={[22, 32, 20, 2]} />
            <meshStandardMaterial color={PALETTE.volcanoRock} roughness={1} flatShading />
          </mesh>
          {/* Crater rim + lava lake */}
          <mesh position={[0, 20.5, 0]}>
            <cylinderGeometry args={[7.5, 7.5, 2.5, 20]} />
            <meshStandardMaterial color="#4a2818" roughness={1} flatShading />
          </mesh>
          <mesh position={[0, 21.8, 0]}>
            <cylinderGeometry args={[6, 6, 0.6, 20]} />
            <meshStandardMaterial color={PALETTE.lava} emissive={PALETTE.lava} emissiveIntensity={2} />
          </mesh>
          {/* Lava rivulets streaming down the flank */}
          {[[0.35, 0.9], [2.4, 0.7], [-1.9, 0.55]].map(([a, len], i) => (
            <mesh key={i} position={[Math.cos(a) * 13, 14 - len * 5, Math.sin(a) * 13]} rotation={[Math.cos(a) * 0.8, 0, -Math.sin(a) * 0.8]}>
              <boxGeometry args={[1.1, len * 16, 0.4]} />
              <meshStandardMaterial color={PALETTE.lava} emissive={PALETTE.lava} emissiveIntensity={1.4} />
            </mesh>
          ))}
          <pointLight position={[0, 24, 0]} color={PALETTE.lava} intensity={6} distance={70} />
        </group>
      )}
      {iceCrystals.map((c, i) => (
        <mesh key={i} position={[c.x, c.y + c.scale, c.z]} castShadow>
          <octahedronGeometry args={[c.scale, 0]} />
          <meshStandardMaterial color={PALETTE.iceRock} transparent opacity={0.7} metalness={0.3} roughness={0.1} flatShading />
        </mesh>
      ))}
      {caveRocks.map((r, i) => (
        <mesh key={i} position={[r.x, r.y + r.scale * 0.5, r.z]} castShadow>
          <dodecahedronGeometry args={[r.scale, 0]} />
          <meshStandardMaterial color={PALETTE.caveRock} flatShading />
        </mesh>
      ))}
      {lightningRods.map((r, i) => (
        <mesh key={i} position={[r.x, r.y + r.height / 2, r.z]} castShadow>
          <cylinderGeometry args={[0.15, 0.15, r.height, 6]} />
          <meshStandardMaterial color={PALETTE.lightningRock} emissive="#FFD700" emissiveIntensity={0.2} flatShading />
        </mesh>
      ))}
    </group>
  );
}

export function Forest() {
  const bark = useSafeTexture(TEXTURES.bark, 2, 2);
  const foliage = useSafeTexture(TEXTURES.foliage, 2, 2);
  const caveFloor = useSafeTexture(TEXTURES.caveFloor, 4, 2);
  const { trees, rocks, grass, twigs, caveWalls, volcanoData } = useMemo(() => {
    const rand = seededRandom(42);
    const trees = [], rocks = [], grass = [], twigs = [];
    for (let i = 0; i < WORLD.treeCount; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = 10 + rand() * (WORLD.size / 2 - 16);
      const x = Math.cos(angle) * dist, z = Math.sin(angle) * dist;
      let inWater = false;
      for (const w of WATER_BODIES) { if (Math.sqrt((x-w.x)**2 + (z-w.z)**2) < w.radius + 2) { inWater = true; break; } }
      if (inWater) continue;
      // Skip trees inside cave pit
      const caveDist = Math.sqrt((x - CAVE.centerX)**2 + (z - CAVE.centerZ)**2);
      if (caveDist < CAVE.radius + 2) continue;
      const scale = 0.7 + rand() * 0.8;
      const groundY = getTerrainHeight(x, z);
      trees.push({ x, z, groundY, scale, color: PALETTE.foliage[Math.floor(rand()*PALETTE.foliage.length)], rotation: rand()*Math.PI*2 });
    }
    for (let i = 0; i < WORLD.rockCount; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = 8 + rand() * (WORLD.size / 2 - 14);
      const x = Math.cos(angle) * dist, z = Math.sin(angle) * dist;
      let inWater = false;
      for (const w of WATER_BODIES) { if (Math.sqrt((x-w.x)**2 + (z-w.z)**2) < w.radius + 1) { inWater = true; break; } }
      if (inWater) continue;
      const caveDist = Math.sqrt((x - CAVE.centerX)**2 + (z - CAVE.centerZ)**2);
      if (caveDist < CAVE.radius + 2) continue;
      const scale = 0.4 + rand() * 1.3;
      const groundY = getTerrainHeight(x, z);
      rocks.push({ position: [x, groundY + scale*0.3, z], scale, rotation: [rand()*0.4, rand()*Math.PI*2, rand()*0.4], color: PALETTE.rock[Math.floor(rand()*PALETTE.rock.length)] });
    }
    for (let i = 0; i < WORLD.grassCount; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = 1 + rand() * (WORLD.size / 2 - 4);
      const x = Math.cos(angle) * dist, z = Math.sin(angle) * dist;
      let inWater = false;
      for (const w of WATER_BODIES) { if (Math.sqrt((x-w.x)**2 + (z-w.z)**2) < w.radius) { inWater = true; break; } }
      if (inWater) continue;
      const groundY = getTerrainHeight(x, z);
      if (groundY < -15) continue;
      grass.push({ position: [x, groundY, z], rotation: rand()*Math.PI*2, scale: 0.5 + rand()*0.6, tilt: (rand()-0.5)*0.3 });
    }
    for (let i = 0; i < WORLD.twigCount; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = 2 + rand() * (WORLD.size / 2 - 4);
      const x = Math.cos(angle) * dist, z = Math.sin(angle) * dist;
      let inWater = false;
      for (const w of WATER_BODIES) { if (Math.sqrt((x-w.x)**2 + (z-w.z)**2) < w.radius) { inWater = true; break; } }
      if (inWater) continue;
      const groundY = getTerrainHeight(x, z);
      if (groundY < -15) continue;
      twigs.push({ position: [x, groundY, z], rotation: [0, rand()*Math.PI*2, rand()*0.2], scale: 0.6 + rand()*0.8 });
    }

    // Cave walls with entrance gap
    const caveWalls = [];
    const segs = CAVE.wallSegments;
    const angleStep = (Math.PI * 2) / segs;
    const halfEntranceAngle = Math.atan2(CAVE.entranceWidth / 2, CAVE.radius);
    for (let i = 0; i < segs; i++) {
      const angle = i * angleStep;
      const diff = Math.abs(((angle - CAVE.entranceAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
      if (diff < halfEntranceAngle) continue;
      const x = CAVE.centerX + Math.cos(angle) * CAVE.radius;
      const z = CAVE.centerZ + Math.sin(angle) * CAVE.radius;
      const y = getTerrainHeight(x, z);
      caveWalls.push({ x, z, y, angle, width: angleStep * CAVE.radius * 1.15 });
    }

    // Volcano data for collision
    const vz = BIOME_ZONES.find(z => z.biome === 'volcano');
    const volcanoData = vz ? { cx: (vz.xMin+vz.xMax)/2, cz: (vz.zMin+vz.zMax)/2 } : null;

    return { trees, rocks, grass, twigs, caveWalls, volcanoData };
  }, []);

  // Register collisions
  useEffect(() => {
    clearCollisions();
    trees.forEach(t => addCollision(t.x, t.z, 0.8));
    rocks.forEach(r => addCollision(r.position[0], r.position[2], r.scale * 0.4));
    caveWalls.forEach(w => addCollision(w.x, w.z, 3));
    if (volcanoData) addCollision(volcanoData.cx, volcanoData.cz, 20);
    WATER_BODIES.filter(w => w.hasWaterfall).forEach(w => {
      const dirX = Math.cos(w.fallDir || 0);
      const dirZ = Math.sin(w.fallDir || 0);
      addCollision(w.x + dirX * w.radius * 0.9, w.z + dirZ * w.radius * 0.9, 2.5);
    });
    return () => clearCollisions();
  }, [trees, rocks, caveWalls, volcanoData]);

  return (
    <group>
      <TerrainMesh />
      <BiomeGrounds />
      <BiomeLandmarks />
      <BiomeFeatures />
      <LightningEffects />
      <CaveInterior />
      {WATER_BODIES.map((w, i) => <WaterBody key={i} data={w} />)}
      {/* Cave walls */}
      {caveWalls.map((w, i) => (
        <mesh key={`cw${i}`} position={[w.x, w.y + CAVE.wallHeight/2, w.z]} castShadow rotation={[0, -w.angle + Math.PI/2, 0]}>
          <boxGeometry args={[w.width * 2, CAVE.wallHeight, 5]} />
          <meshStandardMaterial map={caveFloor} color={PALETTE.caveRock} roughness={1} flatShading />
        </mesh>
      ))}
      {/* Tree trunks */}
      <Instances limit={WORLD.treeCount} castShadow>
        <cylinderGeometry args={[0.25, 0.45, 3.5, 8]} />
        <meshStandardMaterial map={bark} color={PALETTE.trunk} roughness={0.9} />
        {trees.map((t, i) => <Instance key={i} position={[t.x, t.groundY + t.scale*1.75, t.z]} scale={t.scale} rotation={[0, t.rotation, 0]} />)}
      </Instances>
      {/* Tree lower foliage */}
      <Instances limit={WORLD.treeCount} castShadow>
        <coneGeometry args={[2.5, 3.5, 8]} />
        <meshStandardMaterial map={foliage} color="#ffffff" roughness={0.85} />
        {trees.map((t, i) => <Instance key={i} position={[t.x, t.groundY + t.scale*4.5, t.z]} scale={t.scale} rotation={[0, t.rotation, 0]} color={t.color} />)}
      </Instances>
      {/* Tree middle foliage */}
      <Instances limit={WORLD.treeCount} castShadow>
        <coneGeometry args={[1.8, 2.5, 8]} />
        <meshStandardMaterial map={foliage} color="#ffffff" roughness={0.85} />
        {trees.map((t, i) => <Instance key={i} position={[t.x, t.groundY + t.scale*6.5, t.z]} scale={t.scale*0.8} rotation={[0, t.rotation, 0]} color={t.color} />)}
      </Instances>
      {/* Tree top foliage */}
      <Instances limit={WORLD.treeCount} castShadow>
        <coneGeometry args={[1.2, 1.8, 8]} />
        <meshStandardMaterial map={foliage} color="#ffffff" roughness={0.85} />
        {trees.map((t, i) => <Instance key={i} position={[t.x, t.groundY + t.scale*8, t.z]} scale={t.scale*0.6} rotation={[0, t.rotation, 0]} color={t.color} />)}
      </Instances>
      {/* Rocks */}
      <Instances limit={WORLD.rockCount} castShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#ffffff" flatShading />
        {rocks.map((r, i) => <Instance key={i} position={r.position} scale={r.scale} rotation={r.rotation} color={r.color} />)}
      </Instances>
      {/* Grass */}
      <Instances limit={WORLD.grassCount}>
        <boxGeometry args={[0.04, 0.6, 0.04]} />
        <meshStandardMaterial color={PALETTE.grass} flatShading />
        {grass.map((g, i) => <Instance key={i} position={g.position} rotation={[g.tilt, g.rotation, 0]} scale={g.scale} />)}
      </Instances>
      {/* Twigs */}
      <Instances limit={WORLD.twigCount}>
        <cylinderGeometry args={[0.02, 0.05, 0.6, 4]} />
        <meshStandardMaterial color={PALETTE.twig} flatShading />
        {twigs.map((t, i) => <Instance key={i} position={t.position} rotation={t.rotation} scale={t.scale} />)}
      </Instances>
    </group>
  );
}
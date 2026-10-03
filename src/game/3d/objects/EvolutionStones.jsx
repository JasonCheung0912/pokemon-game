import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EventBus } from '@/game/EventBus';
import { world } from '@/game/3d/world';
import { WORLD, EVOLUTION_STONES } from '@/game/config';
import { getTerrainHeight, isOverWater } from '@/game/3d/terrain';

function Stone({ data }) {
  const meshRef = useRef();
  const beamRef = useRef();

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.4;
    meshRef.current.position.y = 0.8 + Math.sin(state.clock.elapsedTime * 1.5 + data.phase) * 0.25;

    // Pulse beam opacity
    if (beamRef.current) {
      beamRef.current.material.opacity = 0.08 + Math.sin(state.clock.elapsedTime * 2) * 0.04;
    }

    if (world.phase !== 'exploring') return;
    if (data.collected) return;

    const dx = data.position.x - world.playerPosition.x;
    const dz = data.position.z - world.playerPosition.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < WORLD.pickupRange) {
      data.collected = true;
      EventBus.emit('stone-collected', { type: data.type, color: data.color });
    }
  });

  if (data.collected) return null;

  return (
    <group position={[data.position.x, data.position.y, data.position.z]}>
      {/* Floating stone */}
      <mesh ref={meshRef} position={[0, 0.8, 0]} castShadow>
        <octahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial color={data.color} emissive={data.color} emissiveIntensity={0.5} flatShading metalness={0.3} roughness={0.4} />
      </mesh>
      {/* Subtle glow light */}
      <pointLight position={[0, 0.8, 0]} color={data.color} intensity={1.2} distance={7} />
      {/* Light beam (subtle, elusive) */}
      <mesh ref={beamRef} position={[0, 5, 0]}>
        <cylinderGeometry args={[0.08, 0.3, 10, 6, 1, true]} />
        <meshBasicMaterial color={data.color} transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Shadow */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 12]} />
        <meshBasicMaterial color="black" transparent opacity={0.2} depthWrite={false} />
      </mesh>
    </group>
  );
}

function spawnStone() {
  // Weighted random selection by rarity
  const totalWeight = EVOLUTION_STONES.reduce((sum, s) => sum + s.rarity, 0);
  let rand = Math.random() * totalWeight;
  let stone = EVOLUTION_STONES[0];
  for (const s of EVOLUTION_STONES) {
    rand -= s.rarity;
    if (rand <= 0) { stone = s; break; }
  }

  // Spawn far from player (elusive)
  const angle = Math.random() * Math.PI * 2;
  const dist = 25 + Math.random() * (WORLD.size / 2 - 35);
  const x = Math.cos(angle) * dist;
  const z = Math.sin(angle) * dist;

  // Don't spawn in water
  if (isOverWater(x, z)) return spawnStone();

  return {
    id: `stone_${Date.now()}_${Math.random()}`,
    type: stone.type, color: stone.color,
    position: { x, y: 0, z },
    collected: false,
    phase: Math.random() * Math.PI * 2,
  };
}

export function EvolutionStoneManager() {
  const stoneList = useRef([]);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const onGameStarted = () => {
      stoneList.current = [];
      for (let i = 0; i < WORLD.stoneCount; i++) {
        stoneList.current.push(spawnStone());
      }
      world.stones = stoneList.current;
      forceUpdate(c => c + 1);
    };

    const onCollected = () => {
      stoneList.current = stoneList.current.filter(s => !s.collected);
      world.stones = stoneList.current;
      forceUpdate(c => c + 1);
      // Respawn after 60s (slower = more elusive)
      setTimeout(() => {
        stoneList.current.push(spawnStone());
        world.stones = stoneList.current;
        forceUpdate(c => c + 1);
      }, 60000);
    };

    EventBus.on('game-started', onGameStarted);
    EventBus.on('stone-collected', onCollected);
    return () => {
      EventBus.off('game-started', onGameStarted);
      EventBus.off('stone-collected', onCollected);
    };
  }, []);

  return (
    <>
      {stoneList.current.map(s => (
        <Stone key={s.id} data={s} />
      ))}
    </>
  );
}
import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EventBus } from '@/game/EventBus';
import { world } from '@/game/3d/world';
import { WORLD, TREASURE_CHESTS, BIOME_ZONES } from '@/game/config';
import { getTerrainHeight, isOverWater } from '@/game/3d/terrain';

function Chest({ data }) {
  const groupRef = useRef();
  const lidRef = useRef();
  const beamRef = useRef();

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.position.y = data.baseY + 0.5 + Math.sin(t * 1.5 + data.phase) * 0.2;
    groupRef.current.rotation.y = t * 0.3;
    if (beamRef.current) beamRef.current.material.opacity = 0.08 + Math.sin(t * 2) * 0.04;
    if (world.phase !== 'exploring' || data.collected) return;
    const dx = data.position.x - world.playerPosition.x;
    const dz = data.position.z - world.playerPosition.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    if (dist < WORLD.pickupRange) {
      data.collected = true;
      EventBus.emit('treasure-collected', { id: data.id });
    }
  });

  if (data.collected) return null;

  return (
    <group ref={groupRef} position={[data.position.x, data.baseY + 0.5, data.position.z]}>
      {/* Chest body */}
      <mesh castShadow>
        <boxGeometry args={[0.8, 0.5, 0.6]} />
        <meshStandardMaterial color="#8B6914" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Chest lid */}
      <mesh ref={lidRef} position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.85, 0.2, 0.65]} />
        <meshStandardMaterial color="#A07820" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Gold trim */}
      <mesh position={[0, 0.05, 0.31]}>
        <boxGeometry args={[0.82, 0.06, 0.02]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.3} metalness={0.8} roughness={0.1} />
      </mesh>
      {/* Glow light */}
      <pointLight position={[0, 0.3, 0]} color="#FFD700" intensity={2} distance={8} />
      {/* Light beam */}
      <mesh ref={beamRef} position={[0, 5, 0]}>
        <cylinderGeometry args={[0.1, 0.4, 10, 6, 1, true]} />
        <meshBasicMaterial color="#FFD700" transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Shadow */}
      <mesh position={[0, -0.45, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <circleGeometry args={[0.5, 12]} />
        <meshBasicMaterial color="black" transparent opacity={0.2} depthWrite={false} />
      </mesh>
    </group>
  );
}

function spawnChest() {
  // Place in hard-to-reach locations: cave biome, ice biome edges, volcano area
  const hardBiomes = BIOME_ZONES.filter(z => z.biome !== 'forest');
  const zone = hardBiomes[Math.floor(Math.random() * hardBiomes.length)];
  const x = zone.xMin + Math.random() * (zone.xMax - zone.xMin);
  const z = zone.zMin + Math.random() * (zone.zMax - zone.zMin);
  if (isOverWater(x, z)) return spawnChest();
  return {
    id: `chest\_${Date.now()}\_${Math.random()}`,
    position: { x, z },
    baseY: getTerrainHeight(x, z),
    collected: false,
    phase: Math.random() * Math.PI * 2,
  };
}

export function TreasureChestManager() {
  const chestList = useRef([]);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const onGameStarted = () => {
      chestList.current = [];
      for (let i = 0; i < TREASURE_CHESTS.count; i++) {
        chestList.current.push(spawnChest());
      }
      world.treasureChests = chestList.current;
      forceUpdate(c => c + 1);
    };
    const onCollected = () => {
      chestList.current = chestList.current.filter(c => !c.collected);
      world.treasureChests = chestList.current;
      forceUpdate(c => c + 1);
      setTimeout(() => {
        chestList.current.push(spawnChest());
        world.treasureChests = chestList.current;
        forceUpdate(c => c + 1);
      }, TREASURE_CHESTS.respawnTime);
    };
    EventBus.on('game-started', onGameStarted);
    EventBus.on('treasure-collected', onCollected);
    return () => {
      EventBus.off('game-started', onGameStarted);
      EventBus.off('treasure-collected', onCollected);
    };
  }, []);

  return <>{chestList.current.map(c => <Chest key={c.id} data={c} />)}</>;
}
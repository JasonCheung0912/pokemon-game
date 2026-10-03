import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { EventBus } from '@/game/EventBus';
import { world } from '@/game/3d/world';
import { WORLD, getSpriteUrl, getStageStats } from '@/game/config';
import { getTerrainHeight, isOverWater, getBiome } from '@/game/3d/terrain';
import { getBiomePokemon } from '@/game/pokemonUtils';

const textureCache = {};

// With all 1025 species, textures load lazily on first encounter and are
// cached in textureCache — no bulk preload (it would flood the network).
function PokemonSprite({ species, color }) {
  const [texture, setTexture] = useState(textureCache[species] || null);
  const [retries, setRetries] = useState(0);
  useEffect(() => {
    if (textureCache[species]) { setTexture(textureCache[species]); return; }
    const url = getSpriteUrl(species);
    if (!url) return;
    const loader = new THREE.TextureLoader();
    loader.load(url, (tex) => {
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      textureCache[species] = tex;
      setTexture(tex);
    }, undefined, () => {
      if (retries < 5) setTimeout(() => setRetries(r => r + 1), 1000 * (retries + 1));
    });
  }, [species, retries]);

  if (texture) {
    return (
      <Billboard>
        <mesh scale={[2.4, 2.4, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial map={texture} transparent alphaTest={0.15} side={THREE.DoubleSide} />
        </mesh>
      </Billboard>
    );
  }
  // No shape fallback — wait for the real texture to load
  return null;
}

function spawnPokemon(id, nearPlayer = false) {
  let x = 0, z = 0;
  for (let i = 0; i < 12; i++) {
    if (nearPlayer) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 12 + Math.random() * 10;
      x = world.playerPosition.x + Math.cos(angle) * dist;
      z = world.playerPosition.z + Math.sin(angle) * dist;
    } else {
      const angle = Math.random() * Math.PI * 2;
      const dist = 12 + Math.random() * (WORLD.size / 2 - 18);
      x = Math.cos(angle) * dist;
      z = Math.sin(angle) * dist;
    }
    const lim = WORLD.size / 2 - 10;
    x = Math.max(-lim, Math.min(lim, x));
    z = Math.max(-lim, Math.min(lim, z));
    if (!isOverWater(x, z)) break;
  }

  const biome = getBiome(x, z);
  const difficulty = world.difficulty || 'easy';
  const species = getBiomePokemon(biome, difficulty);
  if (!species) return null; // the Legendary Realm is empty outside God/Admin mode
  const stats = getStageStats(species);

  return {
    id: id || `wild_${Date.now()}_${Math.random()}`,
    species: species.id, name: species.name, type: species.type,
    color: species.color, bodyType: species.bodyType,
    hp: stats.hp, maxHp: stats.hp, attack: stats.attack,
    position: { x, y: 0, z }, engaged: false, biome,
  };
}

function PokemonCreature({ data }) {
  const groupRef = useRef();
  const spriteRef = useRef();
  const wanderDir = useRef(new THREE.Vector3(Math.random()-0.5, 0, Math.random()-0.5).normalize());
  const wanderTimer = useRef(2 + Math.random() * 3);
  const bobOffset = useRef(Math.random() * Math.PI * 2);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const groundY = getTerrainHeight(data.position.x, data.position.z);
    const bob = Math.sin(state.clock.elapsedTime * 2 + bobOffset.current) * 0.12;
    group.position.set(data.position.x, groundY, data.position.z);
    if (spriteRef.current) spriteRef.current.position.y = 1.3 + bob;

    if (world.phase !== 'exploring') return;

    wanderTimer.current -= delta;
    if (wanderTimer.current <= 0) {
      const angle = Math.random() * Math.PI * 2;
      wanderDir.current.set(Math.cos(angle), 0, Math.sin(angle));
      wanderTimer.current = 2 + Math.random() * 3;
    }

    const speed = 1.5;
    const newX = data.position.x + wanderDir.current.x * speed * delta;
    const newZ = data.position.z + wanderDir.current.z * speed * delta;
    if (!isOverWater(newX, newZ) && getTerrainHeight(newX, newZ) > -16) {
      data.position.x = newX; data.position.z = newZ;
    } else {
      wanderDir.current.x *= -1; wanderDir.current.z *= -1;
    }

    const half = WORLD.size / 2 - 5;
    if (Math.abs(data.position.x) > half) { data.position.x = Math.sign(data.position.x) * half; wanderDir.current.x *= -1; }
    if (Math.abs(data.position.z) > half) { data.position.z = Math.sign(data.position.z) * half; wanderDir.current.z *= -1; }

    const dx = data.position.x - world.playerPosition.x;
    const dz = data.position.z - world.playerPosition.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < WORLD.battleRange && !data.engaged) {
      data.engaged = true;
      EventBus.emit('battle-start', {
        id: data.id, species: data.species, name: data.name, type: data.type,
        color: data.color, bodyType: data.bodyType,
        hp: data.hp, maxHp: data.maxHp, attack: data.attack,
        position: { ...data.position },
      });
    }
  });

  return (
    <group ref={groupRef} position={[data.position.x, 0, data.position.z]}>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <circleGeometry args={[0.8, 16]} />
        <meshBasicMaterial color="black" transparent opacity={0.25} depthWrite={false} />
      </mesh>
      <group ref={spriteRef} position={[0, 1.3, 0]}>
        <PokemonSprite species={data.species} color={data.color} />
      </group>
    </group>
  );
}

export function WildPokemonManager() {
  const pokemonList = useRef([]);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const onGameStarted = () => {
      pokemonList.current = [];
      for (let i = 0; i < WORLD.wildPokemonCount; i++) {
        const wp = spawnPokemon(`wild_init_${i}`);
        if (wp) pokemonList.current.push(wp);
      }
      world.wildPokemon = pokemonList.current;
      forceUpdate(c => c + 1);
    };
    const onBattleStart = (data) => { world.battleTargetId = data.id; };
    const onBattleEnd = (result) => {
      if (!world.battleTargetId) return;
      if (result === 'win' || result === 'capture') {
        pokemonList.current = pokemonList.current.filter(p => p.id !== world.battleTargetId);
        const wp = spawnPokemon();
        if (wp) pokemonList.current.push(wp);
      } else {
        const p = pokemonList.current.find(p => p.id === world.battleTargetId);
        if (p) {
          p.engaged = false;
          const dx = p.position.x - world.playerPosition.x;
          const dz = p.position.z - world.playerPosition.z;
          const len = Math.sqrt(dx*dx + dz*dz) || 1;
          p.position.x += (dx/len) * 25;
          p.position.z += (dz/len) * 25;
          const half = WORLD.size / 2 - 5;
          p.position.x = Math.max(-half, Math.min(half, p.position.x));
          p.position.z = Math.max(-half, Math.min(half, p.position.z));
        }
      }
      world.battleTargetId = null;
      world.wildPokemon = pokemonList.current;
      forceUpdate(c => c + 1);
    };
    const onAdminSpawn = () => {
      const wp = spawnPokemon(null, true);
      if (wp) pokemonList.current.push(wp);
      world.wildPokemon = pokemonList.current;
      forceUpdate(c => c + 1);
    };
    EventBus.on('game-started', onGameStarted);
    EventBus.on('battle-start', onBattleStart);
    EventBus.on('battle-end', onBattleEnd);
    EventBus.on('admin-spawn-pokemon', onAdminSpawn);
    return () => {
      EventBus.off('game-started', onGameStarted);
      EventBus.off('battle-start', onBattleStart);
      EventBus.off('battle-end', onBattleEnd);
      EventBus.off('admin-spawn-pokemon', onAdminSpawn);
    };
  }, []);

  return <>{pokemonList.current.map(p => <PokemonCreature key={p.id} data={p} />)}</>;
}
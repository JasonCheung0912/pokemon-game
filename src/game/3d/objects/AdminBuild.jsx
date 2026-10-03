import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EventBus } from '@/game/EventBus';
import { world } from '@/game/3d/world';
import { WORLD, ADMIN_ABILITIES } from '@/game/config';
import { getTerrainHeight } from '@/game/3d/terrain';

function BuiltObject({ obj }) {
  switch (obj.type) {
    case 'tree':
      return (
        <group position={[obj.x, obj.y, obj.z]}>
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.35, 3, 8]} />
            <meshStandardMaterial color="#5C3A1E" />
          </mesh>
          <mesh position={[0, 4, 0]} castShadow>
            <coneGeometry args={[1.8, 3.5, 8]} />
            <meshStandardMaterial color="#2d6a2d" />
          </mesh>
        </group>
      );
    case 'rock':
      return (
        <mesh position={[obj.x, obj.y + 0.6, obj.z]} castShadow>
          <dodecahedronGeometry args={[0.9, 0]} />
          <meshStandardMaterial color="#808080" />
        </mesh>
      );
    case 'crystal':
      return (
        <mesh position={[obj.x, obj.y + 1, obj.z]} castShadow>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.6} />
        </mesh>
      );
    case 'cube':
      return (
        <mesh position={[obj.x, obj.y + 1, obj.z]} castShadow>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#38bdf8" />
        </mesh>
      );
    case 'sphere':
      return (
        <mesh position={[obj.x, obj.y + 1, obj.z]} castShadow>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
      );
    case 'torch':
      return (
        <group position={[obj.x, obj.y, obj.z]}>
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.08, 0.1, 1.6, 6]} />
            <meshStandardMaterial color="#5C3A1E" />
          </mesh>
          <mesh position={[0, 1.8, 0]}>
            <sphereGeometry args={[0.25, 8, 8]} />
            <meshStandardMaterial color="#FFD700" emissive="#FFA500" emissiveIntensity={2} />
          </mesh>
          <pointLight position={[0, 1.9, 0]} intensity={20} distance={15} color="#ff9f43" />
        </group>
      );
    case 'lava':
      return (
        <mesh position={[obj.x, obj.y + 0.5, obj.z]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#8B2500" emissive="#FF4500" emissiveIntensity={0.8} />
        </mesh>
      );
    case 'ice':
      return (
        <mesh position={[obj.x, obj.y + 1, obj.z]} castShadow>
          <coneGeometry args={[0.6, 2.5, 6]} />
          <meshStandardMaterial color="#d0e8f0" emissive="#98D8D8" emissiveIntensity={0.2} />
        </mesh>
      );
    default:
      return null;
  }
}

export function AdminBuild() {
  const { camera } = useThree();
  const [objects, setObjects] = useState([]);

  useEffect(() => {
    const dir = new THREE.Vector3();
    const onMouseDown = () => {
      if (!world.isAdmin || !world.buildMode || world.phase !== 'exploring' || !document.pointerLockElement) return;
      camera.getWorldDirection(dir);
      const dist = ADMIN_ABILITIES.buildDistance;
      const lim = WORLD.size / 2 - 5;
      const x = Math.max(-lim, Math.min(lim, world.playerPosition.x + dir.x * dist));
      const z = Math.max(-lim, Math.min(lim, world.playerPosition.z + dir.z * dist));
      const y = getTerrainHeight(x, z);
      const obj = { id: `built_${Date.now()}_${Math.random()}`, type: world.buildObjectType, x, y, z };
      world.builtObjects.push(obj);
      setObjects([...world.builtObjects]);
    };
    const onClear = () => {
      world.builtObjects = [];
      setObjects([]);
    };
    document.addEventListener('mousedown', onMouseDown);
    EventBus.on('admin-clear-objects', onClear);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      EventBus.off('admin-clear-objects', onClear);
    };
  }, [camera]);

  return <>{objects.map(o => <BuiltObject key={o.id} obj={o} />)}</>;
}
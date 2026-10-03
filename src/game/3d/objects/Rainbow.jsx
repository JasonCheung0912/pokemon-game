import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { EventBus } from '@/game/EventBus';
import { world } from '@/game/3d/world';

const RAINBOW_COLORS = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#00BFFF', '#8B00FF'];

// Sky rainbow — appears in god mode (15% chance) and admin mode (always).
// While visible it boosts the equipped Pokémon's damage.
export function Rainbow() {
  const [visible, setVisible] = useState(world.rainbowActive);
  const groupRef = useRef();

  useEffect(() => {
    const onRainbow = (active) => setVisible(active);
    EventBus.on('rainbow-changed', onRainbow);
    return () => EventBus.off('rainbow-changed', onRainbow);
  }, []);

  // Stay anchored in the sky ahead of the player, like the sun/moon/clouds
  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.x = world.playerPosition.x + 20;
    groupRef.current.position.z = world.playerPosition.z - 150;
  });

  if (!visible) return null;
  return (
    <group ref={groupRef} position={[20, -8, -150]}>
      {RAINBOW_COLORS.map((color, i) => (
        <mesh key={color} rotation={[0, 0.2, 0]}>
          <torusGeometry args={[48 - i * 1.4, 0.9, 8, 64, Math.PI]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} fog={false} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
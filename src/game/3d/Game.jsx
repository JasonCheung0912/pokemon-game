import { Canvas } from '@react-three/fiber';
import { KeyboardControls } from '@react-three/drei';
import { GameScene } from '@/game/3d/scenes/GameScene';

const KEYBOARD_MAP = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'backward', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'right', keys: ['KeyD', 'ArrowRight'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'crouch', keys: ['ShiftLeft', 'ShiftRight'] },
];

export default function Game({ onReady }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 70, near: 0.1, far: 500, position: [0, 1.8, 0] }}
      onCreated={(state) => {
        if (typeof onReady === 'function') onReady(state);
      }}
    >
      <KeyboardControls map={KEYBOARD\_MAP}>
        <GameScene />
      </KeyboardControls>
    </Canvas>
  );
}
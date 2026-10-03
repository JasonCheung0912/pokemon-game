import { Billboard, Text } from '@react-three/drei';

// Stylized trainer avatar — used for your own third-person view and for the
// other players you meet live in the world (they get a floating name tag).
export function Trainer({ name, showTag = false }) {
  return (
    <group>
      {/* legs */}
      <mesh position={[-0.12, 0.35, 0]}><boxGeometry args={[0.22, 0.7, 0.22]} /><meshStandardMaterial color="#1e293b" /></mesh>
      <mesh position={[0.12, 0.35, 0]}><boxGeometry args={[0.22, 0.7, 0.22]} /><meshStandardMaterial color="#1e293b" /></mesh>
      {/* body (jacket) */}
      <mesh position={[0, 1.0, 0]}><capsuleGeometry args={[0.28, 0.5, 4, 12]} /><meshStandardMaterial color="#ef4444" /></mesh>
      {/* arms */}
      <mesh position={[-0.4, 0.95, 0]}><capsuleGeometry args={[0.09, 0.4, 4, 8]} /><meshStandardMaterial color="#fcd34d" /></mesh>
      <mesh position={[0.4, 0.95, 0]}><capsuleGeometry args={[0.09, 0.4, 4, 8]} /><meshStandardMaterial color="#fcd34d" /></mesh>
      {/* head */}
      <mesh position={[0, 1.55, 0]}><sphereGeometry args={[0.26, 16, 12]} /><meshStandardMaterial color="#fcd34d" /></mesh>
      {/* cap */}
      <mesh position={[0, 1.58, 0]}><sphereGeometry args={[0.28, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#dc2626" /></mesh>
      <mesh position={[0, 1.58, -0.24]}><boxGeometry args={[0.34, 0.06, 0.2]} /><meshStandardMaterial color="#dc2626" /></mesh>
      {/* backpack */}
      <mesh position={[0, 1.05, 0.26]}><boxGeometry args={[0.3, 0.4, 0.16]} /><meshStandardMaterial color="#22c55e" /></mesh>
      {showTag && name && (
        <Billboard position={[0, 2.3, 0]}>
          <Text fontSize={0.26} color="#ffffff" outlineWidth={0.035} outlineColor="#000000" anchorX="center">
            {name}
          </Text>
        </Billboard>
      )}
    </group>
  );
}
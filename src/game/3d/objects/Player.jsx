import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls, useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { EventBus } from '@/game/EventBus';
import { world } from '@/game/3d/world';
import { PLAYER, WORLD, ADMIN_ABILITIES, BIOME_ZONES } from '@/game/config';
import { Trainer } from '@/game/3d/objects/Trainer';

let lastGateMsg = 0;   // throttles the "sealed realm" warning
import { getTerrainHeight, isOverWater } from '@/game/3d/terrain';
import { checkCollision } from '@/game/3d/collisions';

const UP = new THREE.Vector3(0, 1, 0);
const forwardVec = new THREE.Vector3();
const rightVec = new THREE.Vector3();
const moveVec = new THREE.Vector3();

export function Player() {
  const { camera } = useThree();
  const controlsRef = useRef();
  const [, getKeys] = useKeyboardControls();
  const pos = useRef(new THREE.Vector3(0, 0, 0));
  const velY = useRef(0);
  const isGrounded = useRef(true);
  const lastSafePos = useRef(new THREE.Vector3(0, 0, 0));
  const avatarRef = useRef();   // third-person trainer avatar

  useEffect(() => {
    // Boot facing the horizon — R3F's default camera lookAt(0,0,0) from its
    // spawn position points it straight down at the ground.
    camera.rotation.set(0, 0, 0);
    const onRequestLock = () => {
      if (controlsRef.current && (world.phase === 'exploring')) {
        controlsRef.current.lock();
      }
    };
    const onBattleStart = () => {
      if (controlsRef.current) controlsRef.current.unlock();
    };
    EventBus.on('request-pointer-lock', onRequestLock);
    EventBus.on('battle-start', onBattleStart);
    return () => {
      EventBus.off('request-pointer-lock', onRequestLock);
      EventBus.off('battle-start', onBattleStart);
    };
  }, []);

  useFrame((state, delta) => {
    if (world.phase !== 'exploring') return;

    const keys = getKeys();
    const speedMult = world.speedBoost ? ADMIN_ABILITIES.speedBoostMultiplier : 1;
    const speed = (world.flying ? ADMIN_ABILITIES.flySpeed : (keys.crouch ? PLAYER.crouchSpeed : PLAYER.speed)) * speedMult * delta;

    camera.getWorldDirection(forwardVec);
    world.playerDirection.x = forwardVec.x;
    world.playerDirection.y = forwardVec.y;
    world.playerDirection.z = forwardVec.z;

    if (world.flying) {
      // ─── Admin fly mode: fly where you look, Space up / Shift down ───
      rightVec.crossVectors(forwardVec, UP).normalize();
      moveVec.set(0, 0, 0);
      if (keys.forward) moveVec.add(forwardVec);
      if (keys.backward) moveVec.sub(forwardVec);
      if (keys.left) moveVec.sub(rightVec);
      if (keys.right) moveVec.add(rightVec);
      if (keys.jump) moveVec.y += 1;
      if (keys.crouch) moveVec.y -= 1;
      if (moveVec.lengthSq() > 0) {
        moveVec.normalize();
        pos.current.x += moveVec.x * speed;
        pos.current.y += moveVec.y * speed;
        pos.current.z += moveVec.z * speed;
      }
      const flyHalf = WORLD.size / 2 - 2;
      pos.current.x = Math.max(-flyHalf, Math.min(flyHalf, pos.current.x));
      pos.current.z = Math.max(-flyHalf, Math.min(flyHalf, pos.current.z));
      const flyGround = getTerrainHeight(pos.current.x, pos.current.z);
      pos.current.y = Math.max(flyGround, Math.min(ADMIN_ABILITIES.flyMaxY, pos.current.y));
      velY.current = 0;
      isGrounded.current = false;
      // Admin fly stays first-person; hide the avatar while flying
      if (avatarRef.current) avatarRef.current.visible = false;
      camera.position.set(pos.current.x, pos.current.y + PLAYER.eyeHeight, pos.current.z);
      world.playerPosition.x = pos.current.x;
      world.playerPosition.y = pos.current.y + PLAYER.eyeHeight;
      world.playerPosition.z = pos.current.z;
      return;
    }

    forwardVec.y = 0;
    if (forwardVec.lengthSq() > 0) forwardVec.normalize();
    rightVec.crossVectors(forwardVec, UP).normalize();

    moveVec.set(0, 0, 0);
    if (keys.forward) moveVec.add(forwardVec);
    if (keys.backward) moveVec.sub(forwardVec);
    if (keys.left) moveVec.sub(rightVec);
    if (keys.right) moveVec.add(rightVec);

    if (moveVec.lengthSq() > 0) {
      moveVec.normalize();
      const newX = pos.current.x + moveVec.x * speed;
      const newZ = pos.current.z + moveVec.z * speed;
      if (!checkCollision(newX, newZ)) {
        pos.current.x = newX;
        pos.current.z = newZ;
      } else {
        // Slide along walls
        if (!checkCollision(newX, pos.current.z)) pos.current.x = newX;
        else if (!checkCollision(pos.current.x, newZ)) pos.current.z = newZ;
      }
    }

    const halfWorld = WORLD.size / 2 - 2;
    pos.current.x = Math.max(-halfWorld, Math.min(halfWorld, pos.current.x));
    pos.current.z = Math.max(-halfWorld, Math.min(halfWorld, pos.current.z));

    // Legendary Realm gate — sealed unless this run is God or Admin difficulty
    const legendZone = BIOME_ZONES.find(z => z.biome === 'legendary');
    if (legendZone && world.difficulty !== 'god' && world.difficulty !== 'admin') {
      const { xMin, xMax, zMin, zMax } = legendZone;
      if (pos.current.x > xMin && pos.current.x < xMax && pos.current.z > zMin && pos.current.z < zMax) {
        const dXmin = pos.current.x - xMin, dXmax = xMax - pos.current.x;
        const dZmin = pos.current.z - zMin, dZmax = zMax - pos.current.z;
        const minD = Math.min(dXmin, dXmax, dZmin, dZmax);
        if (minD === dXmin) pos.current.x = xMin - 2;
        else if (minD === dXmax) pos.current.x = xMax + 2;
        else if (minD === dZmin) pos.current.z = zMin - 2;
        else pos.current.z = zMax + 2;
        if (Date.now() - lastGateMsg > 4000) { lastGateMsg = Date.now(); EventBus.emit('gate-blocked'); }
      }
    }

    // Terrain height at player position
    const groundHeight = getTerrainHeight(pos.current.x, pos.current.z);
    const overWater = isOverWater(pos.current.x, pos.current.z);

    // Jump
    if (keys.jump && isGrounded.current && !overWater) {
      velY.current = world.superJump ? ADMIN_ABILITIES.superJumpForce : PLAYER.jumpForce;
      isGrounded.current = false;
    }

    // Gravity
    velY.current -= PLAYER.gravity * delta;
    pos.current.y += velY.current * delta;

    // Ground collision (only if not over water)
    if (!overWater && pos.current.y <= groundHeight) {
      pos.current.y = groundHeight;
      velY.current = 0;
      isGrounded.current = true;
      lastSafePos.current.copy(pos.current);
    } else if (overWater) {
      // Over water — no ground, keep falling
      isGrounded.current = false;
    }

    // Respawn if fallen too far
    if (pos.current.y < PLAYER.fallThreshold) {
      EventBus.emit('player-fell');
      pos.current.copy(lastSafePos.current);
      velY.current = 0;
      isGrounded.current = true;
    }

    // ─── Third-person camera — floats behind and above the trainer ───
    const yawDir = new THREE.Vector3(forwardVec.x, 0, forwardVec.z);
    if (yawDir.lengthSq() < 0.0001) yawDir.set(0, 0, -1);
    yawDir.normalize();
    const camX = pos.current.x - yawDir.x * 6;
    const camZ = pos.current.z - yawDir.z * 6;
    const camY = pos.current.y + 3.2;
    camera.position.set(camX, Math.max(getTerrainHeight(camX, camZ) + 1.4, camY), camZ);
    if (avatarRef.current) {
      avatarRef.current.visible = true;
      avatarRef.current.position.copy(pos.current);
      avatarRef.current.rotation.y = Math.atan2(yawDir.x, yawDir.z);
    }

    world.playerPosition.x = pos.current.x;
    world.playerPosition.y = pos.current.y + PLAYER.eyeHeight;
    world.playerPosition.z = pos.current.z;
  });

  // `selector` removes the automatic click-to-lock on the canvas — pointer lock
  // is engaged ONLY programmatically while exploring, so the mouse stays visible
  // on every menu, battle and overlay.
  return (
    <>
      {/* Your trainer, visible in third person */}
      <group ref={avatarRef}>
        <Trainer />
      </group>
      <PointerLockControls
        ref={controlsRef}
        selector="#pointer-lock-target"
        onLock={() => EventBus.emit('pointer-locked')}
        onUnlock={() => EventBus.emit('pointer-unlocked')}
      />
    </>
  );
}
import { useRef, useEffect, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EventBus } from '@/game/EventBus';
import { world } from '@/game/3d/world';
import { DAY_NIGHT, PALETTE, WORLD } from '@/game/config';

function CloudPuff({ position, scale }) {
  return (
    <group position={position}>
      <mesh scale={[scale, scale*0.35, scale]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="white" transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <mesh scale={[scale*0.7, scale*0.3, scale*0.7]} position={[scale*0.4, scale*0.05, scale*0.3]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="white" transparent opacity={0.55} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Clouds() {
  const clouds = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 15; i++) {
      const angle = (i/15) * Math.PI*2 + Math.random()*0.5;
      const dist = 50 + Math.random()*120;
      arr.push({ position: [Math.cos(angle)*dist, 45+Math.random()*35, Math.sin(angle)*dist], scale: 6+Math.random()*10 });
    }
    return arr;
  }, []);
  return <>{clouds.map((c, i) => <CloudPuff key={i} position={c.position} scale={c.scale} />)}</>;
}

export function DayNight() {
  const { scene } = useThree();
  const dirLightRef = useRef();
  const ambLightRef = useRef();
  const sunRef = useRef();
  const sunGlowRef = useRef();
  const cloudsRef = useRef();
  const totalDuration = DAY_NIGHT.dayDuration + DAY_NIGHT.afternoonDuration + DAY_NIGHT.nightDuration;
  const startTime = useRef(Date.now() - totalDuration * 0.1 * 1000); // Start in early day
  const lastEmit = useRef(0);

  useEffect(() => {
    scene.background = new THREE.Color(PALETTE.skyDay);
    scene.fog = new THREE.Fog(PALETTE.skyDay, WORLD.fogNear, WORLD.fogFar);
  }, [scene]);

  useFrame(() => {
    const elapsed = (Date.now() - startTime.current) / 1000;
    const cycleTime = elapsed % totalDuration;
    const cycleProgress = cycleTime / totalDuration;

    // 3-phase: Day (0-0.33), Afternoon (0.33-0.67), Night (0.67-1.0)
    let phase, dayFactor;
    if (cycleProgress < 0.33) {
      phase = 'day';
      dayFactor = 1.0;
    } else if (cycleProgress < 0.67) {
      phase = 'afternoon';
      const t = (cycleProgress - 0.33) / 0.34;
      dayFactor = 1.0 - t * 0.45; // bright golden afternoon, never gloomy
    } else {
      phase = 'night';
      const t = (cycleProgress - 0.67) / 0.33;
      dayFactor = Math.max(0.15, 0.38 - t * 0.2); // night — dark but readable
      if (t > 0.85) dayFactor = (t - 0.85) / 0.15; // dawn at end
    }

    const isDay = dayFactor > 0.4;
    world.isDay = isDay;
    world.dayNightProgress = cycleProgress;

    // Sky color
    const dayColor = new THREE.Color(PALETTE.skyDay);
    const afternoonColor = new THREE.Color(PALETTE.skyAfternoon);
    const nightColor = new THREE.Color(PALETTE.skyNight);
    const skyColor = dayColor.clone().lerp(nightColor, 1 - dayFactor);
    if (phase === 'afternoon') skyColor.lerp(afternoonColor, 0.3);

    scene.background = skyColor;
    if (scene.fog) scene.fog.color = skyColor;

    // Sun position
    const phaseTime = cycleTime;
    const angle = (phaseTime / totalDuration) * Math.PI;
    const sunX = Math.cos(angle - Math.PI/2) * 60;
    const sunY = Math.max(Math.sin(angle) * 60 + 5, -10);
    const sunZ = 30;

    if (dirLightRef.current) {
      dirLightRef.current.position.set(sunX, sunY, sunZ);
      dirLightRef.current.intensity = 0.8 + dayFactor * 1.7;
      const lightColor = new THREE.Color(PALETTE.sunDay);
      const warmColor = new THREE.Color(PALETTE.sunSet);
      const warmAmount = phase === 'afternoon' ? 0.4 : 0;
      lightColor.lerp(warmColor, warmAmount);
      dirLightRef.current.color = lightColor;
    }
    if (ambLightRef.current) {
      ambLightRef.current.intensity = 0.55 + dayFactor * 0.65;
    }

    if (sunRef.current && sunGlowRef.current) {
      if (sunY > 0) {
        sunRef.current.visible = true;
        sunGlowRef.current.visible = true;
        const sunDist = 200;
        const dir = new THREE.Vector3(sunX, sunY, sunZ).normalize();
        sunRef.current.position.copy(dir).multiplyScalar(sunDist);
        sunGlowRef.current.position.copy(sunRef.current.position);
        const sunColor = new THREE.Color(PALETTE.sunDay);
        if (phase === 'afternoon') sunColor.lerp(new THREE.Color(PALETTE.sunSet), 0.4);
        sunRef.current.material.color = sunColor;
        sunGlowRef.current.material.color = new THREE.Color(PALETTE.sunSet);
        sunGlowRef.current.material.opacity = 0.15 + dayFactor * 0.15;
      } else {
        sunRef.current.visible = false;
        sunGlowRef.current.visible = false;
      }
    }

    if (cloudsRef.current) {
      cloudsRef.current.children.forEach(child => {
        child.traverse(obj => { if (obj.material) obj.material.opacity = 0.1 + dayFactor * 0.45; });
      });
    }

    const now = Date.now();
    if (now - lastEmit.current > 1000) {
      lastEmit.current = now;
      let remaining;
      if (phase === 'day') remaining = DAY_NIGHT.dayDuration - cycleTime;
      else if (phase === 'afternoon') remaining = DAY_NIGHT.afternoonDuration - (cycleTime - DAY_NIGHT.dayDuration);
      else remaining = DAY_NIGHT.nightDuration - (cycleTime - DAY_NIGHT.dayDuration - DAY_NIGHT.afternoonDuration);
      EventBus.emit('time-changed', { isDay, phase, remaining: Math.ceil(remaining) });
    }
  });

  return (
    <>
      <ambientLight ref={ambLightRef} intensity={0.6} />
      <directionalLight ref={dirLightRef} castShadow position={[50,50,20]} intensity={1.5}
        shadow-mapSize={[2048,2048]} shadow-camera-left={-80} shadow-camera-right={80}
        shadow-camera-top={80} shadow-camera-bottom={-80} shadow-camera-near={0.1} shadow-camera-far={250} />
      <mesh ref={sunRef}><sphereGeometry args={[8,16,16]} /><meshBasicMaterial color={PALETTE.sunDay} fog={false} /></mesh>
      <mesh ref={sunGlowRef}><sphereGeometry args={[14,16,16]} /><meshBasicMaterial color={PALETTE.sunSet} transparent opacity={0.2} fog={false} /></mesh>
      <group ref={cloudsRef}><Clouds /></group>
    </>
  );
}
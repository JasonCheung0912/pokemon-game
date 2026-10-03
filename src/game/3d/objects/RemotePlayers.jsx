import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { world } from '@/game/3d/world';
import { base44 } from '@/api/base44Client';
import { Trainer } from '@/game/3d/objects/Trainer';

// Live co-presence — every player exploring the SAME difficulty mode appears
// in the world as a name-tagged trainer avatar. Rooms are separate per mode,
// so different modes never see each other.

const tmp = new THREE.Vector3();

function RemoteAvatar({ seat, name }) {
  const ref = useRef();
  useFrame(() => {
    const d = world.remotePlayers?.get(seat);
    if (!d || !ref.current) return;
    tmp.set(d.x, d.y, d.z);
    ref.current.position.lerp(tmp, 0.18);
    ref.current.rotation.y = d.yaw || 0;
  });
  return (
    <group ref={ref}>
      <Trainer name={name} showTag />
    </group>
  );
}

export function RemotePlayers() {
  const [roster, setRoster] = useState([]);   // [{seat, name}]

  useEffect(() => {
    if (!world.remotePlayers) world.remotePlayers = new Map();
    let connId = null;
    try {
      connId = sessionStorage.getItem('pkmn_conn_id');
      if (!connId) { connId = crypto.randomUUID(); sessionStorage.setItem('pkmn_conn_id', connId); }
    } catch (e) { connId = crypto.randomUUID(); }

    const roomId = `arena-${world.difficulty || 'easy'}`;
    let room = null;
    try {
      const handle = base44.actors?.GameRoom
        ? base44.actors.GameRoom(roomId).connect({ id: connId })
        : null;
      room = (handle && typeof handle.subscribe === 'function') ? handle : null;
    } catch (e) { room = null; }
    if (!room) return;   // multiplayer unavailable — solo play continues

    let mySeat = null;
    const unsub = room.subscribe((msg) => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'you') {
        mySeat = msg.seat;
      } else if (msg.type === 'pos') {
        if (msg.seat === mySeat) return;
        world.remotePlayers.set(msg.seat, {
          x: msg.x, y: msg.y, z: msg.z, yaw: msg.yaw, name: msg.name, t: Date.now(),
        });
        setRoster(prev => {
          const found = prev.find(r => r.seat === msg.seat);
          if (found) return found.name === msg.name ? prev : prev.map(r => r.seat === msg.seat ? { ...r, name: msg.name } : r);
          return [...prev, { seat: msg.seat, name: msg.name }];
        });
      } else if (msg.type === 'leave') {
        world.remotePlayers.delete(msg.seat);
        setRoster(prev => prev.filter(r => r.seat !== msg.seat));
      }
    });

    // Send my position ~7×/s while exploring
    const iv = setInterval(() => {
      if (world.phase !== 'exploring') return;
      const p = world.playerPosition;
      room.send({
        type: 'pos',
        x: p.x, y: p.y, z: p.z,
        yaw: Math.atan2(world.playerDirection.x, world.playerDirection.z),
        name: world.playerData?.username || 'Trainer',
      });
    }, 150);

    return () => {
      clearInterval(iv);
      try { unsub.unsubscribe(); } catch (e) { /* ignore */ }
      try { room.close(); } catch (e) { /* ignore */ }
    };
  }, []);

  return <>{roster.map(r => <RemoteAvatar key={r.seat} seat={r.seat} name={r.name} />)}</>;
}
import { useState, useEffect, useRef, useCallback } from 'react';
import { getSpriteUrl, getRandomSpecies, POKEMON_SPECIES } from '@/game/config';
import { HubButton } from '@/components/hub/HubButton';
import * as audio from '@/game/audio';

// ─── Steal a Pokémon — real-time base strategy & heist ───
// Your base fills via a conveyor belt. Sneak into rival bases between laser
// locks, stun guards, grab Pokémon from storage and run them back home.
// Rival guards raid your base — keep your laser lock charged to repel them.

const W = 1100, H = 640;
const TOOLS = [
  { id: 'hammer', icon: '🔨', name: 'Stun Hammer', price: 120, key: 'Q', desc: 'Stun the nearest guard for 5s' },
  { id: 'trap',   icon: '🪤', name: 'Trap',        price: 100, key: 'T', desc: 'Place a trap — freezes a guard 4s' },
  { id: 'boots',  icon: '👟', name: 'Speed Boots', price: 250, key: 'B', desc: 'Speed ×1.4 for 20s' },
  { id: 'jammer', icon: '📻', name: 'Laser Jammer', price: 200, key: 'J', desc: 'Open the nearest rival laser for 6s' },
];

export default function StealPokemon({ profile, onProfile }) {
  const [phase, setPhase] = useState('ready');
  const [hud, setHud] = useState({ coins: 0, stolen: 0, haul: 0, msg: '' });
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const buyTool = (tool) => {
    const p = profileRef.current;
    if ((p.coins || 0) < tool.price) { audio.sfx.wrong(); return; }
    audio.sfx.pickup();
    onProfile(prev => ({ ...prev, coins: prev.coins - tool.price, tools: { ...prev.tools, [tool.id]: (prev.tools?.[tool.id] || 0) + 1 } }));
  };

  const start = useCallback(() => { audio.sfx.click(); setHud({ coins: 0, stolen: 0, haul: 0, msg: '' }); setPhase('play'); }, []);
  const endRun = useCallback(() => {
    const g = gameRef.current;
    if (g) onProfile(p => ({ ...p, stealBestHaul: Math.max(p.stealBestHaul || 0, g.runCoins || 0) }));
    audio.sfx.click(); setPhase('ready');
  }, [onProfile]);

  useEffect(() => {
    if (phase !== 'play') return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const keys = {};
    const onKeyDown = e => {
      keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      const g = gameRef.current; if (!g) return;
      if (e.code === 'KeyQ') activateTool('hammer');
      if (e.code === 'KeyT') activateTool('trap');
      if (e.code === 'KeyB') activateTool('boots');
      if (e.code === 'KeyJ') activateTool('jammer');
      if (e.code === 'KeyE') interact();
    };
    const onKeyUp = e => { keys[e.code] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const sprites = {};
    const sprite = id => {
      if (!sprites[id]) { const i = new Image(); i.src = getSpriteUrl(id) || ''; sprites[id] = i; }
      return sprites[id];
    };
    const pokeIn = (p) => { // canvas draw for a pokemon token
      const img = sprite(p.species);
      if (img && img.complete && img.naturalWidth) ctx.drawImage(img, p.x - 14, p.y - 14, 28, 28);
      else { ctx.fillStyle = p.rare ? '#FFD700' : '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI * 2); ctx.fill(); }
    };

    const makePoke = () => {
      const sp = getRandomSpecies(true);
      return { species: sp.id, rare: !!sp.legendary };
    };

    const bases = [
      { id: 'mine', x: 430, y: 470, w: 240, h: 140, storage: [], fillT: 5, mine: true },
      { id: 'rivalA', x: 60, y: 40, w: 240, h: 140, storage: [makePoke(), makePoke(), makePoke(), makePoke()], fillT: 10, lockT: 0, jammedUntil: 0 },
      { id: 'rivalB', x: 800, y: 40, w: 240, h: 140, storage: [makePoke(), makePoke(), makePoke(), makePoke()], fillT: 16, lockT: 3, jammedUntil: 0 },
    ];
    const MAX_STORE = 6;

    const guards = [
      { base: 'rivalA', x: 180, y: 200, tx: 60, ty: 210, stun: 0, frozen: 0, patrol: [[60, 210], [180, 230], [330, 210], [180, 235]], pi: 0 },
      { base: 'rivalB', x: 920, y: 200, tx: 800, ty: 210, stun: 0, frozen: 0, patrol: [[820, 210], [940, 230], [1040, 210], [940, 235]], pi: 0 },
    ];
    const raider = { active: false, x: 0, y: 0, raidT: 18, target: null, carrying: null, leaving: false };
    const traps = [];

    const g = gameRef.current = {
      player: { x: 550, y: 620, carrying: null, stun: 0 },
      laser: { active: 0, cd: 0 },     // your base laser
      runCoins: 0, raids: 0,
      toolsUsed: { bootsUntil: 0 },
    };

    const interact = () => {
      const p = g.player;
      if (p.stun > 0) return;
      for (const b of bases) {
        const inside = p.x > b.x - 20 && p.x < b.x + b.w + 20 && p.y > b.y - 20 && p.y < b.y + b.h + 20;
        if (!inside) continue;
        if (b.mine) {
          if (p.carrying) {
            const v = depositValue(p.carrying);
            const name = POKEMON_SPECIES.find(s => s.id === p.carrying.species)?.name || 'Pokémon';
            g.runCoins += v;
            onProfile(prev => ({
              ...prev,
              coins: (prev.coins || 0) + v,
              stealSteals: (prev.stealSteals || 0) + 1,
              stealBestHaul: Math.max(prev.stealBestHaul || 0, g.runCoins),
            }));
            setHud(h => ({ ...h, stolen: h.stolen + 1, haul: g.runCoins, msg: `💰 Banked ${name} — +${v} coins!` }));
            p.carrying = null;
            audio.sfx.capture();
          }
          return;
        }
        // rival base — must be unlocked
        if (b.lockT > 0 && b.jammedUntil <= g.t) { setHud(h => ({ ...h, msg: '🔒 The laser is active — wait or jam it!' })); return; }
        if (!p.carrying && b.storage.length > 0) {
          const stolen = b.storage.shift();
          p.carrying = stolen;
          audio.sfx.ball();
          setHud(h => ({ ...h, msg: `🏃 Snatched ${POKEMON_SPECIES.find(s => s.id === stolen.species)?.name}! Get home!` }));
        }
        return;
      }
    };

    const activateTool = (id) => {
      const tools = profileRef.current.tools || {};
      if ((tools[id] || 0) <= 0) { setHud(h => ({ ...h, msg: `No ${TOOLS.find(t => t.id === id)?.name} left — buy some!` })); return; }
      onProfile(p => ({ ...p, tools: { ...p.tools, [id]: (p.tools?.[id] || 0) - 1 } }));
      const p = g.player;
      if (id === 'hammer') {
        let best = null, bd = 170;
        for (const gu of guards) { const d = Math.hypot(gu.x - p.x, gu.y - p.y); if (d < bd) { bd = d; best = gu; } }
        if (best) { best.stun = 5; audio.sfx.superHit(); setHud(h => ({ ...h, msg: '🔨 Guard stunned!' })); }
        else setHud(h => ({ ...h, msg: 'No guard close enough.' }));
      } else if (id === 'trap') {
        traps.push({ x: p.x, y: p.y, armed: true }); audio.sfx.pickup();
      } else if (id === 'boots') {
        g.toolsUsed.bootsUntil = g.t + 20; audio.sfx.move();
        setHud(h => ({ ...h, msg: '👟 Speed boots on — 20s!' }));
      } else if (id === 'jammer') {
        let best = null, bd = 400;
        for (const b of bases) { if (b.mine) continue; const d = Math.hypot(b.x + b.w / 2 - p.x, b.y + b.h / 2 - p.y); if (d < bd) { bd = d; best = b; } }
        if (best) { best.jammedUntil = g.t + 6; audio.sfx.superHit(); setHud(h => ({ ...h, msg: '📻 Laser jammed for 6s!' })); }
      }
    };

    const depositValue = (pk) => pk.rare ? 150 : 40 + Math.floor(Math.random() * 30);

    let raf, last = performance.now();
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.033, (now - last) / 1000); last = now;
      g.t = (g.t || 0) + dt;
      const p = g.player;

      // ─── movement ───
      const boots = g.t < g.toolsUsed.bootsUntil ? 1.4 : 1;
      const spd = 190 * boots * dt;
      let mx = 0, my = 0;
      if (keys.ArrowLeft || keys.KeyA) mx -= 1;
      if (keys.ArrowRight || keys.KeyD) mx += 1;
      if (keys.ArrowUp || keys.KeyW) my -= 1;
      if (keys.ArrowDown || keys.KeyS) my += 1;
      if (p.stun > 0) { p.stun -= dt; mx = 0; my = 0; }
      const nx = Math.max(15, Math.min(W - 15, p.x + mx * spd));
      const ny = Math.max(15, Math.min(H - 15, p.y + my * spd));
      // stay out of base walls (bases are solid except edges you interact from)
      p.x = nx; p.y = ny;

      // ─── rival lasers cycle ───
      for (const b of bases) {
        if (b.mine) continue;
        b.lockT += dt;
        const locked = (b.lockT % 10) < 6;
        b.locked = locked && !(b.jammedUntil > g.t);
      }
      // ─── conveyor spawn ───
      for (const b of bases) {
        b.fillT -= dt;
        if (b.fillT <= 0) {
          if (b.mine && b.storage.length < MAX_STORE) { b.storage.push(makePoke()); audio.sfx.pickup(); }
          else if (!b.mine && b.storage.length < 4) b.storage.push(makePoke());
          b.fillT = b.mine ? 8 : 12;
        }
      }
      // ─── guards ───
      for (const gu of guards) {
        if (gu.frozen > 0) { gu.frozen -= dt; continue; }
        if (gu.stun > 0) { gu.stun -= dt; continue; }
        const [tx, ty] = gu.patrol[gu.pi];
        const dx = tx - gu.x, dy = ty - gu.y, d = Math.hypot(dx, dy);
        if (d < 6) gu.pi = (gu.pi + 1) % gu.patrol.length;
        else { gu.x += dx / d * 70 * dt; gu.y += dy / d * 70 * dt; }
        // touch player?
        if (Math.hypot(gu.x - p.x, gu.y - p.y) < 22) {
          p.x += (p.x - gu.x) * 1.2; p.y += (p.y - gu.y) * 1.2;
          p.x = Math.max(15, Math.min(W - 15, p.x)); p.y = Math.max(15, Math.min(H - 15, p.y));
          if (p.carrying) { p.carrying.dropped = true; g.dropped = p.carrying; p.carrying = null; audio.sfx.wrong(); setHud(h => ({ ...h, msg: '💥 A guard knocked the Pokémon loose!' })); }
        }
        // traps
        for (const tr of traps) {
          if (tr.armed && Math.hypot(tr.x - gu.x, tr.y - gu.y) < 20) { tr.armed = false; gu.frozen = 4; audio.sfx.wrong(); }
        }
      }
      // ─── raider ───
      raider.raidT -= dt;
      const mine = bases[0];
      if (!raider.active && raider.raidT <= 0) {
        raider.active = true; raider.leaving = false; raider.carrying = null;
        raider.x = Math.random() < 0.5 ? 180 : 920; raider.y = 200; raider.raidT = 25;
        setHud(h => ({ ...h, msg: '🚨 RAID! A rival guard is attacking your base!' }));
        audio.sfx.wrong();
      }
      if (raider.active) {
        const goal = raider.leaving ? { x: raider.homeX || 180, y: 200 } : { x: mine.x + mine.w / 2, y: mine.y + mine.h / 2 };
        if (!raider.leaving) raider.homeX = raider.x;
        const dx = goal.x - raider.x, dy = goal.y - raider.y, d = Math.hypot(dx, dy) || 1;
        raider.x += dx / d * 90 * dt; raider.y += dy / d * 90 * dt;
        if (!raider.leaving && d < 30) {
          if (g.laser.active > 0) { raider.leaving = true; setHud(h => ({ ...h, msg: '⚡ Your laser lock repelled the raider!' })); audio.sfx.superHit(); }
          else if (mine.storage.length > 0) { raider.carrying = mine.storage.pop(); raider.leaving = true; setHud(h => ({ ...h, msg: '😢 The raider stole from your base!' })); }
          else raider.leaving = true;
        } else if (raider.leaving && d < 40) { raider.active = false; raider.carrying = null; g.raids++; }
      }
      if (g.laser.active > 0) g.laser.active -= dt;
      if (g.laser.cd > 0) g.laser.cd -= dt;

      // ─── draw ───
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#1e293b'); sky.addColorStop(1, '#334155');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(30,41,59,0.5)'; ctx.fillRect(0, 300, W, H - 300);
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(0, 310, W, 20);   // road

      for (const b of bases) {
        ctx.fillStyle = b.mine ? '#065f46' : '#7f1d1d';
        ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 12); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(b.mine ? '🏠 YOUR BASE' : b.id === 'rivalA' ? '🏴 Rival Base A' : '🏴 Rival Base B', b.x + b.w / 2, b.y + 22);
        // storage slots
        for (let i = 0; i < (b.mine ? MAX_STORE : 4); i++) {
          const sx = b.x + 18 + (i % 3) * 72, sy = b.y + 38 + Math.floor(i / 3) * 52;
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.beginPath(); ctx.roundRect(sx, sy, 62, 46, 8); ctx.fill();
          const pk = b.storage[i];
          if (pk) { pokeIn({ ...pk, x: sx + 31, y: sy + 23 }); }
        }
        // conveyor for your base
        if (b.mine) {
          ctx.fillStyle = '#475569';
          ctx.beginPath(); ctx.roundRect(b.x + b.w + 6, b.y + 40, 60, b.h - 60, 6); ctx.fill();
          for (let i = 0; i < 4; i++) {
            const t = ((g.t * 40 + i * 22) % (b.h - 60));
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(b.x + b.w + 10, b.y + 44 + t, 52, 8);
          }
          ctx.fillStyle = '#a7f3d0'; ctx.font = 'bold 10px sans-serif';
          ctx.fillText('conveyor →', b.x + b.w + 36, b.y + 30);
        }
        // laser
        const laserY = b.mine ? b.y : b.y + b.h;
        const locked = b.mine ? g.laser.active > 0 : b.locked;
        if (locked) {
          ctx.strokeStyle = `rgba(255,60,60,${0.6 + Math.sin(g.t * 10) * 0.3})`; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.moveTo(b.x, laserY); ctx.lineTo(b.x + b.w, laserY); ctx.stroke();
        }
      }
      // traps
      for (const tr of traps) {
        if (!tr.armed) continue;
        ctx.fillStyle = '#a16207'; ctx.beginPath(); ctx.arc(tr.x, tr.y, 9, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fde047'; ctx.stroke();
      }
      // guards
      for (const gu of guards) {
        ctx.fillStyle = gu.stun > 0 || gu.frozen > 0 ? '#94a3b8' : '#dc2626';
        ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(gu.x, gu.y, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('🛡️', gu.x, gu.y + 4);
      }
      // raider
      if (raider.active) {
        ctx.fillStyle = '#7f1d1d'; ctx.strokeStyle = '#000';
        ctx.beginPath(); ctx.arc(raider.x, raider.y, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.fillText('🥷', raider.x, raider.y + 4);
      }
      // player trainer
      ctx.fillStyle = g.player.stun > 0 ? '#94a3b8' : '#fbbf24';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ef4444'; ctx.font = 'bold 14px sans-serif'; ctx.fillText('🧢', p.x, p.y + 5);
      if (p.carrying) {
        pokeIn({ ...p.carrying, x: p.x, y: p.y - 34 });
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 11px sans-serif';
        ctx.fillText('carrying — press E at home', p.x, p.y - 52);
      }
      // dropped (guard knock) — auto returns to nearest rival storage for simplicity: skip visual
      ctx.textAlign = 'left';

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [phase, onProfile]);

  // Laser lock toggle from React HUD
  const toggleLaser = () => {
    const g = gameRef.current;
    if (!g || phase !== 'play') return;
    if (g.laser.cd > 0) { setHud(h => ({ ...h, msg: 'Laser recharging…' })); return; }
    g.laser.active = 10; g.laser.cd = 30;
    audio.sfx.superHit();
    setHud(h => ({ ...h, msg: '⚡ Laser lock ONLINE — 10s!' }));
  };

  return (
    <div className="min-h-full flex flex-col items-center px-4 py-6" style={{ backgroundColor: '#1a0f24' }}>
      <h2 className="text-2xl font-extrabold text-rose-300 mb-1">🥷 Steal a Pokémon</h2>
      <p className="text-rose-200 text-sm mb-3 text-center">
        WASD move • E grab / deposit • Q hammer • T trap • B boots • J jammer — sneak in when the red laser is OFF
      </p>
      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-4 items-stretch justify-center">
        {/* Tool shop + stats */}
        <div className="bg-slate-900/90 rounded-2xl border-2 border-black shadow-[5px_5px_0_rgba(0,0,0,0.45)] p-4 w-full lg:w-64 shrink-0">
          <div className="text-yellow-300 font-extrabold mb-2">🪙 {profile.coins} coins</div>
          <div className="text-white font-bold text-sm mb-3">Stolen: {hud.stolen} • Best haul: {Math.max(profile.stealBestHaul || 0, hud.haul)} 🪙</div>
          {TOOLS.map(t => (
            <div key={t.id} className="flex items-center justify-between bg-slate-800 rounded-xl p-2 mb-2 border border-slate-700">
              <div className="min-w-0">
                <div className="text-white text-xs font-bold">{t.icon} {t.name} <span className="text-slate-400">[{t.key}] ×{profile.tools?.[t.id] || 0}</span></div>
                <div className="text-slate-400 text-[10px]">{t.desc}</div>
              </div>
              <HubButton onClick={() => buyTool(t)} disabled={phase !== 'play' && false}
                className="bg-amber-500 text-slate-900 !px-2 !py-1 text-xs shrink-0">🪙{t.price}</HubButton>
            </div>
          ))}
          <HubButton onClick={toggleLaser} disabled={phase !== 'play'}
            className="w-full bg-cyan-500 text-slate-900 !py-2 text-sm mt-1">⚡ Laser Lock (10s)</HubButton>
          {phase === 'play'
            ? <HubButton onClick={endRun} className="w-full bg-red-600 text-white !py-2 text-sm mt-2">🏁 End Heist</HubButton>
            : <HubButton onClick={start} className="w-full bg-emerald-500 text-slate-900 !py-2 text-sm mt-2">▶ Start Heist</HubButton>}
          {hud.msg && <div className="text-yellow-200 text-xs mt-3 text-center font-bold">{hud.msg}</div>}
        </div>
        {/* Canvas */}
        <div className="relative rounded-2xl border-4 border-black shadow-[6px_6px_0_rgba(0,0,0,0.5)] overflow-hidden flex-1"
          style={{ aspectRatio: `${W}/${H}`, minHeight: 420 }}>
          <canvas ref={canvasRef} width={W} height={H} className="w-full h-full block" />
          {phase !== 'play' && (
            <div className="absolute inset-0 grid place-items-center bg-black/70 pointer-events-auto">
              <div className="bg-slate-900 rounded-2xl border-4 border-black shadow-[6px_6px_0_rgba(0,0,0,0.5)] p-8 text-center max-w-sm w-full mx-4">
                <div className="text-5xl mb-2">🥷</div>
                <h3 className="text-2xl font-extrabold text-rose-300">Steal a Pokémon</h3>
                <p className="text-slate-300 text-sm mt-3">
                  Your conveyor belt spawns Pokémon into storage over time. Sneak into the rival bases while their
                  laser gates are open, stun the guards with hammers and traps, and carry stolen Pokémon home.
                  Repel raids with your laser lock!
                </p>
                <div className="mt-5">
                  <HubButton onClick={start} className="w-full bg-emerald-500 text-slate-900">▶ Start Heist</HubButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
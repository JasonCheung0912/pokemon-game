import { useState, useEffect, useRef, useCallback } from 'react';
import { getSpriteUrl, POKEMON_SPECIES } from '@/game/config';
import { HubButton } from '@/components/hub/HubButton';
import * as audio from '@/game/audio';

// ─── Player vs. Pokebies — five-lane defense ───
// Spend energy to deploy tanks, ranged attackers, slowing casters and AoE
// units. Corrupted Pokebies march left every wave; every 5th wave is a boss.

const W = 960, H = 540;
const LANES = [80, 180, 280, 380, 480];
const COLS = [110, 205, 300, 395, 490, 585, 680, 775];
const MAX_ENERGY = 25;
const LEAKS_ALLOWED = 3;

const UNITS = [
  { id: 'tank',   name: 'Tank (Blastoise)',  species: 'blastoise', cost: 6, hp: 90,  rate: 0.9, dmg: 5,  range: 40,  color: '#38bdf8', desc: 'Blocks the lane & grinds attackers' },
  { id: 'ranged', name: 'Ranged (Pikachu)',  species: 'pikachu',   cost: 5, hp: 30,  rate: 1.4, dmg: 7,  range: 900, color: '#fde047', desc: 'Zaps down its whole lane' },
  { id: 'slow',   name: 'Slower (Oddish)',   species: 'oddish',    cost: 4, hp: 25,  rate: 2.0, dmg: 3,  range: 220, color: '#86efac', desc: 'Slows every Pokebie nearby by 50%' },
  { id: 'aoe',    name: 'AoE (Charizard)',   species: 'charizard', cost: 9, hp: 35,  rate: 2.2, dmg: 9,  range: 170, color: '#fb923c', desc: 'Flames EVERYTHING in range' },
];
const POKEBIE_POOL = ['rattata', 'pidgey', 'bellsprout', 'magnemite'];

export default function PokebiesDefense({ profile, onProfile }) {
  const [phase, setPhase] = useState('ready');       // ready | play | over
  const [hud, setHud] = useState({ energy: 12, wave: 0, leaks: 0, kills: 0, bosses: 0 });
  const [selected, setSelected] = useState('tank');
  const [clearArm, setClearArm] = useState(false);
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const start = useCallback(() => { audio.sfx.click(); setHud({ energy: 12, wave: 0, leaks: 0, kills: 0, bosses: 0 }); setClearArm(false); setPhase('play'); }, []);

  useEffect(() => {
    if (phase !== 'play') return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const imgs = {};
    const sprite = id => {
      if (!imgs[id]) { const i = new Image(); i.src = getSpriteUrl(id) || ''; imgs[id] = i; }
      return imgs[id];
    };
    UNITS.forEach(u => sprite(u.species));
    POKEBIE_POOL.forEach(sprite);

    const g = gameRef.current = {
      t: 0, energy: 12, wave: 0, waveT: 4, spawnT: 0, toSpawn: 0, bossPending: false,
      units: [], pokebies: [], shots: [], booms: [], floats: [],
      leaks: 0, kills: 0, bosses: 0, over: false,
    };
    // live refs — updated from React on every render
    const selRef = { current: selected };
    const clearRef = { current: clearArm };
    gameRef.selRef = selRef; gameRef.clearRef = clearRef;

    const canvasClick = (e) => {
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) * (W / r.width), y = (e.clientY - r.top) * (H / r.height);
      const lane = LANES.findIndex(ly => Math.abs(y - ly) < 46);
      if (lane === -1) return;
      if (clearRef.current) {
        if (g.energy >= 15) {
          g.energy -= 15;
          g.booms.push({ x: W, y: LANES[lane], r: 10, lane });
          g.pokebies = g.pokebies.filter(pk => pk.lane !== lane);
          audio.sfx.superHit(); setHud(h => ({ ...h, energy: g.energy }));
        }
        clearRef.current = false; setClearArm(false);
        return;
      }
      const u = UNITS.find(v => v.id === selRef.current);
      if (!u) return;
      const col = COLS.findIndex(cx => Math.abs(x - cx) < 44);
      if (col === -1) return;
      if (g.units.some(v => v.lane === lane && v.col === col)) { audio.sfx.wrong(); return; }
      if (g.energy < u.cost) { audio.sfx.wrong(); return; }
      g.energy -= u.cost;
      g.units.push({ ...u, lane, col, x: COLS[col], y: LANES[lane], hp: u.hp, maxHp: u.hp, cd: 0 });
      audio.sfx.pickup();
      setHud(h => ({ ...h, energy: g.energy }));
    };
    canvas.addEventListener('pointerdown', canvasClick);

    let raf, last = performance.now();
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.033, (now - last) / 1000); last = now;
      g.t += dt;

      // energy regen
      g.energy = Math.min(MAX_ENERGY, g.energy + dt / 1.2);
      if (Math.floor(g.energy) !== Math.floor(g.energy - dt / 1.2)) setHud(h => ({ ...h, energy: g.energy }));

      // wave spawning
      g.waveT -= dt;
      if (g.waveT <= 0 && g.toSpawn <= 0 && g.pokebies.length === 0) {
        g.wave++;
        const boss = g.wave % 5 === 0;
        g.toSpawn = boss ? 2 + Math.floor(g.wave / 5) : 4 + g.wave;
        g.bossPending = boss;
        g.spawnT = 0.5;
        g.waveT = 3;
        audio.sfx.ball();
      }
      if (g.toSpawn > 0) {
        g.spawnT -= dt;
        if (g.spawnT <= 0) {
          g.spawnT = Math.max(0.8, 2.4 - g.wave * 0.08);
          g.toSpawn--;
          const lane = Math.floor(Math.random() * 5);
          if (g.bossPending) {
            g.bossPending = false;
            g.pokebies.push({ species: POKEBIE_POOL[Math.floor(Math.random() * 4)], lane, x: W + 40, hp: 180 + g.wave * 15, maxHp: 180 + g.wave * 15, speed: 18, dps: 12, boss: true, size: 64 });
          } else {
            const hp = 10 + g.wave * 4;
            g.pokebies.push({ species: POKEBIE_POOL[Math.floor(Math.random() * 4)], lane, x: W + 40, hp, maxHp: hp, speed: Math.min(55, 26 + g.wave * 1.5), dps: 5, size: 40 });
          }
        }
      }

      // units act
      for (const u of g.units) {
        u.cd -= dt;
        const targets = g.pokebies.filter(pk => pk.lane === u.lane && pk.x > u.x - 60 && pk.x < u.x + u.range && pk.x > u.x);
        if (u.id === 'slow') {
          for (const pk of g.pokebies) if (pk.lane === u.lane && Math.abs(pk.x - u.x) < u.range) pk.slowT = 0.3;
          if (u.cd <= 0 && targets.length) { u.cd = u.rate; for (const pk of targets) pk.hp -= u.dmg; }
        } else if (u.id === 'aoe') {
          if (u.cd <= 0 && targets.length) {
            u.cd = u.rate;
            for (const pk of targets) pk.hp -= u.dmg;
            g.booms.push({ x: u.x + 80, y: u.y, r: 8, flame: true });
            audio.sfx.move();
          }
        } else if (u.id === 'ranged') {
          if (u.cd <= 0 && targets.length) {
            u.cd = u.rate;
            const pk = targets[0];
            g.shots.push({ x: u.x + 24, y: u.y, lane: u.lane, dmg: u.dmg, target: pk });
            audio.sfx.ball();
          }
        } else { // tank melee
          if (u.cd <= 0 && targets.length) { u.cd = u.rate; targets[0].hp -= u.dmg; }
        }
      }
      // shots travel
      for (const s of g.shots) {
        const tx = s.target && g.pokebies.includes(s.target) ? s.target.x : s.x + 400;
        s.x += Math.sign(tx - s.x) * 460 * dt;
        if (s.target && g.pokebies.includes(s.target) && Math.abs(s.x - s.target.x) < 18) {
          s.target.hp -= s.dmg;
          s.dead = true;
        }
        if (s.x > W + 30) s.dead = true;
      }
      g.shots = g.shots.filter(s => !s.dead);

      // pokebies advance
      for (const pk of g.pokebies) {
        if (pk.slowT > 0) { pk.slowT -= dt; }
        const slowed = pk.slowT > 0 ? 0.5 : 1;
        const blocker = g.units.filter(u => u.lane === pk.lane && pk.x - u.x < 42 && pk.x - u.x > -10).sort((a, b) => b.x - a.x)[0];
        if (blocker) {
          blocker.hp -= pk.dps * dt;
          pk.attackT = 0.2;
        } else {
          pk.x -= pk.speed * slowed * dt;
        }
        if (pk.x < 70) {
          pk.x = -999; pk.dead = true;
          g.leaks++;
          audio.sfx.wrong();
        }
      }
      g.pokebies = g.pokebies.filter(pk => !pk.dead && pk.hp > 0);
      for (const pk of g.pokebies) if (pk.hp <= 0) { g.kills++; if (pk.boss) { g.bosses++; audio.sfx.win(); } else audio.sfx.correct(); }
      g.pokebies = g.pokebies.filter(pk => pk.hp > 0);
      g.units = g.units.filter(u => u.hp > 0);
      g.booms = g.booms.filter(b => (b.r += 300 * dt) < (b.flame ? 60 : 200));
      g.floats = g.floats.filter(f => (f.life -= dt) > 0);

      if (g.leaks >= LEAKS_ALLOWED && !g.over) {
        g.over = true;
        setPhase('over');
      }
      setHud(h => Math.abs(h.energy - g.energy) > 0.9 ? { ...h, energy: g.energy } : h);

      // ─── draw ───
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i % 2 ? '#3f6212' : '#4d7c0f';
        ctx.fillRect(0, LANES[i] - 48, W, 96);
      }
      ctx.fillStyle = '#78350f'; ctx.fillRect(0, 0, 70, H);      // your side
      ctx.fillStyle = '#a16207'; ctx.fillRect(0, 0, 8, H);
      // defender grid hints
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      for (const cx of COLS) for (const ly of LANES) { ctx.beginPath(); ctx.roundRect(cx - 36, ly - 34, 72, 68, 8); ctx.fill(); }

      for (const u of g.units) {
        const img = imgs[u.species];
        if (img && img.complete) ctx.drawImage(img, u.x - 26, u.y - 26, 52, 52);
        else { ctx.fillStyle = u.color; ctx.beginPath(); ctx.arc(u.x, u.y, 22, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#000'; ctx.fillRect(u.x - 24, u.y - 34, 48, 6);
        ctx.fillStyle = u.hp / u.maxHp > 0.5 ? '#4ade80' : '#ef4444';
        ctx.fillRect(u.x - 23, u.y - 33, 46 * (u.hp / u.maxHp), 4);
      }
      for (const pk of g.pokebies) {
        const img = imgs[pk.species];
        ctx.save();
        if (img && img.complete) {
          ctx.filter = pk.boss ? 'brightness(0.55) saturate(2) hue-rotate(280deg)' : 'brightness(0.45) saturate(1.6)';
          ctx.drawImage(img, pk.x - pk.size / 2, pk.y - pk.size / 2, pk.size, pk.size);
        } else { ctx.fillStyle = '#7f1d1d'; ctx.beginPath(); ctx.arc(pk.x, pk.y, pk.size / 2, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
        ctx.fillStyle = '#000'; ctx.fillRect(pk.x - 20, pk.y - pk.size / 2 - 10, 40, 6);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(pk.x - 19, pk.y - pk.size / 2 - 9, 38 * (pk.hp / pk.maxHp), 4);
      }
      for (const s of g.shots) {
        ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(s.x, s.y, 6, 0, Math.PI * 2); ctx.fill();
      }
      for (const b of g.booms) {
        ctx.globalAlpha = 0.5; ctx.strokeStyle = b.flame ? '#fb923c' : '#f87171'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      }
      // HUD
      ctx.fillStyle = 'rgba(15,23,42,0.9)'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(70, 8, 330, 56, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#a3e635'; ctx.font = 'bold 18px sans-serif';
      ctx.fillText(`⚡ ${Math.floor(g.energy)}  •  🌊 Wave ${g.wave}  •  💚 ${LEAKS\_ALLOWED - g.leaks} leaks left`, 82, 30);
      ctx.fillStyle = '#fca5a5'; ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`☠️ ${g.kills} defeated • 🐲 ${g.bosses} bosses`, 82, 52);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', canvasClick);
    };
  }, [phase, onProfile]);   // eslint-disable-line react-hooks/exhaustive-deps

  // commit results on game over
  useEffect(() => {
    if (phase !== 'over') return;
    const g = gameRef.current;
    if (!g) return;
    audio.sfx.lose();
    onProfile(p => ({
      ...p,
      laneBestWave: Math.max(p.laneBestWave || 0, g.wave),
      laneDefeats: (p.laneDefeats || 0) + g.kills,
      laneBosses: (p.laneBosses || 0) + g.bosses,
      coins: (p.coins || 0) + g.wave * 25,
    }));
  }, [phase]);   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-full flex flex-col items-center px-4 py-6" style={{ backgroundColor: '#14240c' }}>
      <h2 className="text-2xl font-extrabold text-lime-300 mb-1">🛡️ Player vs. Pokebies</h2>
      <p className="text-lime-200 text-sm mb-3 text-center">
        Pick a defender card, then click a lane cell. Pokebies march from the right — don't let {LEAKS_ALLOWED} through!
      </p>
      <div className="w-full max-w-5xl rounded-2xl border-4 border-black shadow-[6px_6px_0_rgba(0,0,0,0.5)] overflow-hidden bg-slate-900">
        {/* Unit cards */}
        <div className="flex flex-wrap gap-2 p-3 border-b-4 border-black bg-slate-950/70">
          {UNITS.map(u => (
            <button key={u.id} onClick={() => { audio.sfx.click(); setSelected(u.id); setClearArm(false); }}
              className={`flex-1 min-w-\[130px] p-2 rounded-xl border-2 text-left transition-all ${
                selected === u.id \&\& !clearArm ? 'border-lime-400 bg-lime-400/10' : 'border-slate-700 bg-slate-800/70 hover:border-slate-500'}`}>
              <div className="flex items-center gap-2">
                <img src={getSpriteUrl(u.species) || ''} alt={u.name} className="w-9 h-9 object-contain" />
                <div className="min-w-0">
                  <div className="text-white text-xs font-bold truncate">{u.name}</div>
                  <div className="text-lime-300 text-[10px] font-bold">⚡{u.cost} • ❤️{u.hp}</div>
                </div>
              </div>
              <div className="text-slate-400 text-[10px] mt-1">{u.desc}</div>
            </button>
          ))}
          <button onClick={() => { audio.sfx.click(); setClearArm(a => !a); setSelected(''); }}
            className={`p-2 rounded-xl border-2 text-xs font-bold px-3 ${clearArm ? 'border-red-400 bg-red-400/20 text-red-200' : 'border-slate-700 bg-slate-800/70 text-slate-300 hover:border-slate-500'}`}>
            💣 Lane Clear
<span className="text-lime-300">⚡15</span>
          </button>
        </div>
        {/* Canvas */}
        <div className="relative" style={{ aspectRatio: `${W}/${H}`, minHeight: 380 }}>
          <canvas ref={canvasRef} width={W} height={H} className="w-full h-full block cursor-pointer" />
          {phase !== 'play' && (
            <div className="absolute inset-0 grid place-items-center bg-black/70 pointer-events-auto">
              <div className="bg-slate-900 rounded-2xl border-4 border-black shadow-[6px_6px_0_rgba(0,0,0,0.5)] p-8 text-center max-w-sm w-full mx-4">
                <div className="text-5xl mb-2">{phase === 'over' ? '💀' : '🛡️'}</div>
                <h3 className="text-2xl font-extrabold text-lime-300">
                  {phase === 'over' ? 'Your defenses fell!' : 'Player vs. Pokebies'}
                </h3>
                {phase === 'over' && gameRef.current && (
                  <>
                    <p className="text-white font-bold mt-2">Survived to wave {gameRef.current.wave}</p>
                    <p className="text-yellow-300">🪙 +{gameRef.current.wave * 25} coins earned</p>
                    <p className="text-cyan-300 text-sm">🏆 Best wave: {Math.max(profile.laneBestWave || 0, gameRef.current.wave)}</p>
                  </>
                )}
                {phase === 'ready' && <p className="text-slate-300 text-sm mt-2">Energy builds over time — deploy tanks, ranged, slowers and AoE casters. Every 5th wave is a BOSS!</p>}
                <div className="mt-5">
                  <HubButton onClick={start} className="w-full bg-lime-400 text-slate-900">
                    {phase === 'over' ? '▶ Defend Again' : '▶ Start Defending'}
                  </HubButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
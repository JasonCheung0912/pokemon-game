import { useState, useEffect, useRef, useCallback } from 'react';
import { getSpriteUrl, getRandomSpecies, POKEMON_SPECIES, getStageStats } from '@/game/config';
import { HubButton } from '@/components/hub/HubButton';
import * as audio from '@/game/audio';

// ─── Pokémon Obby Tower — endless vertical obstacle course ───
// Climb moving, vanishing and spiked platforms; rare Pokémon float at every
// 5th-floor checkpoint. Fall off the bottom and the run ends — your best
// floor is saved to your account.

const W = 800, H = 560;
const GRAVITY = 1500, JUMP_V = 560, MOVE = 250;
const FLOOR_H = 60;

export default function ObbyTower({ profile, onProfile }) {
  const [phase, setPhase] = useState('ready');   // ready | play | over
  const [summary, setSummary] = useState(null);
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const bestRef = useRef(profile.obbyHigh || 0);

  const start = useCallback(() => {
    audio.sfx.click();
    setSummary(null);
    setPhase('play');
  }, []);

  useEffect(() => {
    if (phase !== 'play') return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const keys = {};
    const onKeyDown = e => { keys[e.code] = true; if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); };
    const onKeyUp = e => { keys[e.code] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Sprite cache for checkpoint Pokémon
    const spriteCache = {};
    const loadSprite = id => {
      if (spriteCache[id]) return spriteCache[id];
      const url = getSpriteUrl(id);
      if (!url) return null;
      const img = new Image();
      img.src = url;
      spriteCache[id] = img;
      return img;
    };

    // ─── World generation ───
    const platforms = [];
    let topY = 0;                       // y decreases upward (canvas coords)
    let genFloor = 0;
    const genUpTo = (targetY) => {
      while (topY > targetY) {
        genFloor++;
        topY -= 70 + Math.random() * 30;
        const w = 90 + Math.random() * 70;
        const roll = Math.random();
        const type = roll < 0.5 ? 'static' : roll < 0.8 ? 'moving' : 'vanishing';
        platforms.push({
          x: 30 + Math.random() * (W - 60 - w), y: topY, w, type,
          baseX: 0, dir: Math.random() < 0.5 ? -1 : 1, speed: 60 + Math.random() * 80,
          amp: 50 + Math.random() * 90, phase: Math.random() * Math.PI * 2,
          fade: 1, touched: 0, goneUntil: 0,
          spinner: genFloor % 7 === 0, spinAngle: Math.random() * Math.PI * 2,
          prize: genFloor % 5 === 0 ? { species: getRandomSpecies(true).id, taken: false } : null,
        });
        const p = platforms[platforms.length - 1];
        p.baseX = p.x;
        if (p.prize) loadSprite(p.prize.species);
      }
    };

    const g = gameRef.current = {
      player: { x: W / 2, y: -20, vy: 0, onGround: false, invuln: 0, facing: 1 },
      camY: 0, floor: 0, coins: 0, t: 0, dead: false, shake: 0,
      platforms, genFloor: () => genUpTo(g.camY - H * 2), topY,
    };
    // starting platform
    platforms.push({ x: W / 2 - 150, y: 0, w: 300, type: 'static', fade: 1, touched: 0, goneUntil: 0, prize: null, baseX: W / 2 - 150 });
    genFloor = 0; // already generated via initial topY loop below
    g.genUpTo = genUpTo;
    genUpTo(-H * 2);

    let raf, last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const p = g.player;
      g.t += dt;

      // input
      let mv = 0;
      if (keys.ArrowLeft || keys.KeyA) mv -= 1;
      if (keys.ArrowRight || keys.KeyD) mv += 1;
      if (mv !== 0) { p.x += mv * MOVE * dt; p.facing = mv; }
      p.x = Math.max(12, Math.min(W - 12, p.x));
      if ((keys.Space || keys.KeyW || keys.ArrowUp) && p.onGround) {
        p.vy = -JUMP_V; p.onGround = false; audio.sfx.throwBall();
      }
      p.vy += GRAVITY * dt;
      const prevY = p.y;
      p.y += p.vy * dt;
      p.onGround = false;

      // platforms
      for (const pl of platforms) {
        if (pl.type === 'moving') {
          pl.x = pl.baseX + Math.sin(g.t * pl.speed / pl.amp + pl.phase) * pl.amp;
          pl.x = Math.max(10, Math.min(W - 10 - pl.w, pl.x));
        }
        if (pl.type === 'vanishing') {
          if (pl.touched > 0) {
            pl.touched += dt;
            if (pl.touched > 1.2) { pl.fade -= dt * 2; if (pl.fade <= 0) { pl.fade = 0; pl.goneUntil = g.t + 3; } }
          } else if (pl.goneUntil > 0 && g.t > pl.goneUntil) { pl.goneUntil = 0; pl.fade = 1; pl.touched = 0; }
        }
        if (pl.spinner) pl.spinAngle += dt * 2.2;
        if (pl.fade <= 0) continue;
        // landing
        const px1 = pl.x - 6, px2 = pl.x + pl.w + 6;
        if (p.vy >= 0 && prevY <= pl.y && p.y >= pl.y && p.x > px1 && p.x < px2) {
          p.y = pl.y; p.vy = 0; p.onGround = true;
          if (pl.type === 'vanishing' && pl.goneUntil === 0) pl.touched = 0.0001;
        }
        // spinner hit
        if (pl.spinner && p.invuln <= 0) {
          const cx = pl.x + pl.w / 2, cy = pl.y - 14;
          const d = Math.hypot(p.x - cx, (p.y - 20) - cy);
          if (d < 46 && p.y > pl.y - 60 && p.y < pl.y + 10) {
            p.vy = -420; p.onGround = false; p.invuln = 1.2; g.shake = 0.4; audio.sfx.wrong();
          }
        }
        // prize pickup
        if (pl.prize && !pl.prize.taken) {
          if (Math.hypot(p.x - (pl.x + pl.w / 2), p.y - (pl.y - 42)) < 34) {
            pl.prize.taken = true;
            const st = getStageStats(POKEMON_SPECIES.find(s => s.id === pl.prize.species));
            const coins = 50 + (st?.attack || 20) * 3;
            g.coins += coins; audio.sfx.capture();
          }
        }
      }
      if (p.invuln > 0) p.invuln -= dt;
      if (g.shake > 0) g.shake -= dt;

      // camera + floor
      const targetCam = p.y - H * 0.62;
      if (targetCam < g.camY) g.camY += (targetCam - g.camY) * Math.min(1, dt * 6);
      g.floor = Math.max(g.floor, Math.floor(-p.y / FLOOR_H));
      genUpTo(g.camY - H * 2);
      // prune far below
      while (platforms.length > 2 && platforms[1].y > g.camY + H + 200) platforms.shift();

      // fell off?
      if (p.y > g.camY + H + 60) {
        g.dead = true;
        setSummary({ floor: g.floor, coins: g.coins });
        setPhase('over');
      }

      // ─── draw ───
      ctx.fillStyle = '#0c1b33';
      ctx.fillRect(0, 0, W, H);
      // clouds backdrop
      for (let i = 0; i < 5; i++) {
        const cy = ((i * 977 + g.t * 12) % (H + 200)) - 100;
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath();
        ctx.ellipse((i * 173) % W, cy - g.camY * 0.15 % H, 90, 24, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.save();
      if (g.shake > 0) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
      const oy = -g.camY;
      for (const pl of platforms) {
        if (pl.y + oy < -60 || pl.y + oy > H + 60) continue;
        ctx.globalAlpha = pl.fade;
        ctx.fillStyle = pl.type === 'vanishing' ? '#c084fc' : pl.type === 'moving' ? '#22d3ee' : '#4ade80';
        ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.roundRect(pl.x, pl.y + oy, pl.w, 16, 6); ctx.fill(); ctx.stroke();
        if (pl.spinner) {
          const cx = pl.x + pl.w / 2, cy = pl.y + oy - 14;
          ctx.strokeStyle = '#f87171'; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.moveTo(cx - Math.cos(pl.spinAngle) * 40, cy - Math.sin(pl.spinAngle) * 40);
          ctx.lineTo(cx + Math.cos(pl.spinAngle) * 40, cy + Math.sin(pl.spinAngle) * 40); ctx.stroke();
          ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
        }
        if (pl.prize && !pl.prize.taken) {
          const img = spriteCache[pl.prize.species];
          const bob = Math.sin(g.t * 3) * 5;
          if (img && img.complete) ctx.drawImage(img, pl.x + pl.w / 2 - 20, pl.y + oy - 62 + bob, 40, 40);
          ctx.fillStyle = '#FFD700'; ctx.font = 'bold 11px sans-serif';
          ctx.fillText('★', pl.x + pl.w / 2 - 3, pl.y + oy - 66 + bob);
        }
        ctx.globalAlpha = 1;
      }
      // trainer
      const py = p.y + oy;
      ctx.fillStyle = '#fbbf24'; // cap
      ctx.beginPath(); ctx.arc(p.x, py - 26, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(p.x - 9, py - 28, 18, 4);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.roundRect(p.x - 8, py - 18, 16, 18, 5); ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.roundRect(p.x - 7, py - 2, 6, 12, 2); ctx.fill();
      ctx.beginPath(); ctx.roundRect(p.x + 1, py - 2, 6, 12, 2); ctx.fill();
      if (p.invuln > 0) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, py - 12, 20, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
      // HUD
      ctx.fillStyle = 'rgba(15,23,42,0.85)'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(10, 10, 250, 64, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fde047'; ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`🧗 Floor ${g.floor}`, 22, 38);
      ctx.fillStyle = '#a5f3fc'; ctx.font = 'bold 15px sans-serif';
      ctx.fillText(`🪙 ${g.coins} this run • 🏆 best floor ${Math.max(bestRef.current, g.floor)}`, 22, 62);

      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [phase]);

  // On game over — commit coins + best floor
  useEffect(() => {
    if (phase !== 'over' || !summary) return;
    onProfile(p => ({
      ...p,
      coins: (p.coins || 0) + (summary.coins || 0),
      obbyHigh: Math.max(p.obbyHigh || 0, summary.floor || 0),
    }));
    if (summary.floor > bestRef.current) audio.sfx.win();
    else audio.sfx.lose();
  }, [phase]);   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-full flex flex-col items-center px-4 py-6" style={{ backgroundColor: '#0c1b33' }}>
      <h2 className="text-2xl font-extrabold text-yellow-300 mb-1">🧗 Pokémon Obby Tower</h2>
      <p className="text-cyan-200 text-sm mb-3 text-center">
        ← → move • Space jump • grab ★ rare Pokémon • avoid red spinners & vanishing blocks
      </p>
      <div className="relative rounded-2xl border-4 border-black shadow-[6px_6px_0_rgba(0,0,0,0.5)] overflow-hidden"
        style={{ width: 'min(100%, 800px)', aspectRatio: `${W}/${H}` }}>
        <canvas ref={canvasRef} width={W} height={H} className="w-full h-full block" />
        {phase !== 'play' && (
          <div className="absolute inset-0 grid place-items-center bg-black/70 pointer-events-auto">
            <div className="bg-slate-900 rounded-2xl border-4 border-black shadow-[6px_6px_0_rgba(0,0,0,0.5)] p-8 text-center max-w-xs w-full mx-4">
              <div className="text-5xl mb-2">{phase === 'over' ? '🪂' : '🧗'}</div>
              <h3 className="text-2xl font-extrabold text-yellow-300">
                {phase === 'over' ? 'You fell!' : 'Obby Tower'}
              </h3>
              {phase === 'over' && summary && (
                <>
                  <p className="text-white font-bold mt-2">Reached floor {summary.floor}</p>
                  <p className="text-yellow-300">🪙 +{summary.coins} coins banked</p>
                  <p className="text-cyan-300 text-sm mt-1">🏆 Best floor: {Math.max(profile.obbyHigh || 0, summary.floor)}</p>
                </>
              )}
              {phase === 'ready' && <p className="text-slate-300 text-sm mt-2">Climb as high as you can — rare Pokémon wait every 5 floors!</p>}
              <div className="mt-5">
                <HubButton onClick={start} className="w-full bg-yellow-400 text-slate-900">
                  {phase === 'over' ? '▶ Climb Again' : '▶ Start Climbing'}
                </HubButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
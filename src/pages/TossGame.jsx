import { useEffect, useRef, useState, useCallback } from 'react';
import { POKEMON_SPECIES, getSpriteUrl } from '@/game/config';
import { ArcadeMenu } from '@/components/arcade/ArcadeMenu';
import { ARCADE_BALLS, TARGET_SETS, checkAchievements } from '@/components/arcade/arcadeConfig';
import * as audio from '@/game/audio';

// ─── Arcade Pokéball Toss — flick balls at moving, jumping, zig-zag targets ───
// Coins earned per catch feed the side-menu economy (shop, customizer,
// power-ups, achievements). Capture chance depends on the equipped ball.
const G = 950;              // gravity px/s²
const MAX_SPEED = 1500;     // launch speed cap
const HIT_R = 52;           // capture radius
const CAPTURE_TIME = 0.9;   // seconds of wobble before success

function pickSpecies() {
  const r = Math.random();
  let pool;
  if (r < 0.05) pool = POKEMON_SPECIES.filter(s => s.legendary);
  else if (r < 0.3) pool = POKEMON_SPECIES.filter(s => s.stage === 2);
  else if (r < 0.62) pool = POKEMON_SPECIES.filter(s => s.stage === 1);
  else pool = POKEMON_SPECIES.filter(s => s.stage === 0 && !s.legendary);
  return pool[Math.floor(Math.random() * pool.length)] || POKEMON_SPECIES[0];
}

function makeTarget(w, type = 'glider') {
  const sp = pickSpecies();
  let speed = (sp.legendary ? 300 : { 0: 75, 1: 145, 2: 225 }[sp.stage]) * (0.85 + Math.random() * 0.35);
  let points = sp.legendary ? 500 : { 0: 100, 1: 250, 2: 400 }[sp.stage];
  const t = {
    sp, points, type,
    img: new Image(),
    x: w / 2 + (Math.random() - 0.5) * w * 0.6, y: 95,
    dir: Math.random() < 0.5 ? -1 : 1,
    capturing: 0, shake: 0, cooldown: 0,
  };
  t.img.src = getSpriteUrl(sp.id) || '';
  if (type === 'speed') { t.speed = speed * 1.7; t.points = Math.round(points * 2); t.changeT = 0.6 + Math.random(); t.y = 80 + Math.random() * 90; }
  else if (type === 'jumper') { t.speed = speed * 1.15; t.points = Math.round(points * 1.5); t.baseY = 95; t.jumpT = Math.random() * Math.PI * 2; }
  else t.speed = speed;
  return t;
}

// Retro Pokéball with a skin-colored top
function drawBall(c, x, y, r, rot = 0, top = '#E53935') {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.beginPath(); c.arc(0, 0, r, Math.PI, 0); c.fillStyle = top; c.fill();
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI); c.fillStyle = '#FAFAFA'; c.fill();
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.lineWidth = Math.max(2, r * 0.18); c.strokeStyle = '#212121'; c.stroke();
  c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.stroke();
  c.beginPath(); c.arc(0, 0, r * 0.22, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill(); c.stroke();
  c.restore();
}

export default function TossGame({ profile, onProfile }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [round, setRound] = useState(1);
  const [hud, setHud] = useState({ balls: profile.balls, score: 0, catches: 0, streak: 0, over: false, msg: '' });
  const [achToast, setAchToast] = useState(null);
  const hudRef = useRef(hud);
  hudRef.current = hud;
  const profileRef = useRef(profile);
  profileRef.current = profile;

  // Achievement toasts fade after a few seconds
  useEffect(() => {
    if (!achToast) return;
    const t = setTimeout(() => setAchToast(null), 3500);
    return () => clearTimeout(t);
  }, [achToast]);

  // Log the high score when a round ends
  useEffect(() => {
    if (hud.over) onProfile(p => ({ ...p, tossHigh: Math.max(p.tossHigh || 0, hud.score) }));
  }, [hud.over]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Shop purchases (ball packs) keep the in-game ball count in sync
  useEffect(() => {
    setHud(prev => ({ ...prev, balls: profile.balls }));
  }, [profile.balls]);

  const restart = useCallback(() => {
    onProfile(p => ({ ...p, balls: p.balls + 10 }));
    setHud({ balls: profileRef.current.balls + 10, score: 0, catches: 0, streak: 0, over: false, msg: '' });
    setRound(r => r + 1);
  }, [onProfile]);

  useEffect(() => {
    if (round === 0) return;
    const canvas = canvasRef.current, wrap = wrapRef.current;
    const ctx = canvas.getContext('2d');
    let W = wrap.clientWidth, H = wrap.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      W = wrap.clientWidth; H = wrap.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const ps = () => profileRef.current;
    const boosts = () => ps().boosts || {};
    const ballHome = () => ({ x: W / 2, y: H - 70 });
    let targets = [makeTarget(W, ps().targetSet), makeTarget(W, ps().targetSet)];
    let ball = null;
    let drag = null;
    let stars = [];       // burst particles (also holds ring entries)
    let floats = [];      // floating "+coins" / "Broke free!" text
    let trail = [];       // ball trail dots
    let dead = false;
    let raf, last = performance.now();

    const patchHud = (patch) => { if (!dead) setHud(prev => ({ ...prev, ...patch })); };

    const burstAt = (x, y) => {
      const b = ps().burst || 'spark';
      const col = ps().burstColor || '#FFD700';
      const palettes = { spark: [col, '#FFD700', '#ffffff', '#FF69B4'], ring: [col, col, '#ffffff'], fire: ['#FF4500', '#FFA500', '#FFD700', '#ffffff'] };
      const pal = palettes[b] || palettes.spark;
      for (let i = 0; i < 16; i++) {
        stars.push({ x, y, vx: (Math.random() - 0.5) * 320, vy: (Math.random() - 0.5) * 320 - 60, life: 0.8, c: pal[i % pal.length] });
      }
      if (b === 'ring') stars.push({ ring: true, x, y, r: 10, life: 0.5, c: col });
    };

    // ── Drag & release input ──
    const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const onDown = (e) => {
      if (hudRef.current.over || ball) return;
      const p = pos(e); const home = ballHome();
      if (hudRef.current.balls > 0 && Math.hypot(p.x - home.x, p.y - home.y) < 90) {
        drag = { sx: p.x, sy: p.y, cx: p.x, cy: p.y };
      }
    };
    const onMove = (e) => { if (drag) { const p = pos(e); drag.cx = p.x; drag.cy = p.y; } };
    const onUp = () => {
      if (!drag) return;
      const def = ARCADE_BALLS[ps().activeBall] || ARCADE_BALLS.pokeball;
      const vx = (drag.sx - drag.cx) * 5, vy = (drag.sy - drag.cy) * 5;
      const curveSign = (drag.sx - drag.cx) >= 0 ? 1 : -1;
      drag = null;
      const speed = Math.hypot(vx, vy);
      if (speed < 120) return;
      const s = Math.min(1, MAX_SPEED / speed);
      const home = ballHome();
      ball = { x: home.x, y: home.y, vx: vx * s, vy: vy * s, mode: 'fly', target: null, def, curveSign, near: 999 };
      trail = [];
      audio.sfx.throwBall();
      if (def.curve) onProfile(p => ({ ...p, curveballs: (p.curveballs || 0) + 1 }));
      patchHud({ balls: hudRef.current.balls - 1 });
      onProfile(prev => ({ ...prev, balls: Math.max(0, prev.balls - 1) }));
    };
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    const succeed = (t) => {
      audio.sfx.capture();
      const streak = hudRef.current.streak + 1;
      const coinsMult = TARGET_SETS[t.type]?.coinsMult || 1;
      const c = Math.round((t.points / 10) * coinsMult * (Date.now() < (boosts().x2 || 0) ? 2 : 1));
      burstAt(t.x, t.y);
      floats.push({ x: t.x, y: t.y - 40, text: `+${c} 🪙`, life: 1, c: '#FFD700' });
      patchHud({
        catches: hudRef.current.catches + 1, streak,
        score: hudRef.current.score + t.points, balls: hudRef.current.balls + 1, msg: '',
      });
      onProfile(p => {
        let np = {
          ...p,
          tossCatches: (p.tossCatches || 0) + 1, catches: (p.catches || 0) + 1,
          coins: (p.coins || 0) + c, balls: (p.balls || 0) + 1,
          bestStreak: Math.max(p.bestStreak || 0, streak),
        };
        const res = checkAchievements(np);
        if (res.newly.length) setAchToast(res.newly.map(a => `${a.icon} ${a.name} +🪙${a.reward}`).join('  •  '));
        return res.profile;
      });
      targets = targets.filter(x => x !== t);
      targets.push(makeTarget(W, ps().targetSet));
      ball = null;
    };

    // ── Trajectory preview (beam color from the customizer) ──
    const drawTrajectory = () => {
      const home = ballHome();
      const def = ARCADE_BALLS[ps().activeBall] || ARCADE_BALLS.pokeball;
      const g = Date.now() < (boosts().wind || 0) ? G * 0.55 : G;
      const vx = (drag.sx - drag.cx) * 5, vy = (drag.sy - drag.cy) * 5;
      const speed = Math.hypot(vx, vy);
      if (speed < 120) return;
      const s = Math.min(1, MAX_SPEED / speed);
      let x = home.x, y = home.y, svx = vx * s, svy = vy * s;
      const sign = (drag.sx - drag.cx) >= 0 ? 1 : -1;
      ctx.save();
      for (let i = 0; i < 22; i++) {
        for (let k = 0; k < 4; k++) { svy += g * 0.05 / 4; svx += (def.curve || 0) * sign * 0.05 / 4; x += svx * 0.05 / 4; y += svy * 0.05 / 4; }
        if (y > H || x < 0 || x > W) break;
        ctx.globalAlpha = Math.max(0.08, 0.6 - i * 0.028);
        ctx.fillStyle = ps().beamColor || '#fff';
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    };

    const draw = () => {
      // Sky
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#5EB8FF'); sky.addColorStop(1, '#BFE8FF');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      [[0.15, 0.18, 34], [0.45, 0.1, 26], [0.75, 0.22, 40], [0.9, 0.12, 22]].forEach(([fx, fy, r]) => {
        ctx.beginPath(); ctx.arc(fx * W, fy * H, r, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(fx * W + r * 0.8, fy * H + 6, r * 0.75, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(fx * W - r * 0.8, fy * H + 8, r * 0.7, 0, Math.PI * 2); ctx.fill();
      });
      const groundY = H - 40;
      ctx.fillStyle = '#58B368'; ctx.fillRect(0, groundY, W, 40);
      ctx.fillStyle = '#3E8C4E'; ctx.fillRect(0, groundY, W, 8);
      const def = ARCADE_BALLS[ps().activeBall] || ARCADE_BALLS.pokeball;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`${def.icon} ${def.name} — ${def.curve ? 'curves mid-flight' : 'fly straight'} • rarer = faster`, W / 2, 24);

      // Targets
      targets.forEach(t => {
        ctx.save();
        ctx.translate(t.x + (t.shake ? (Math.random() - 0.5) * t.shake : 0), t.y);
        if (t.img.complete && t.img.naturalWidth) ctx.drawImage(t.img, -45, -45, 90, 90);
        else { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(0, 0, 38, 0, Math.PI * 2); ctx.fill(); }
        if (t.capturing > 0) {
          const p = 1 - t.capturing / CAPTURE_TIME;
          ctx.strokeStyle = `rgba(255,255,255,${0.9 - p \* 0.5})`;
          ctx.lineWidth = 5;
          ctx.beginPath(); ctx.arc(0, 0, 46 + p * 26, 0, Math.PI * 2); ctx.stroke();
          drawBall(ctx, 0, 0, 22 + Math.sin(p * Math.PI * 6) * 3, p * Math.PI * 3, def.top);
        }
        ctx.restore();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
        ctx.fillText(`${t.sp.name} • ${t.points}`, t.x, t.y + 58);
      });

      if (drag) drawTrajectory();

      // Ball trail
      trail.forEach((p, i) => {
        ctx.globalAlpha = (i / trail.length) * 0.5;
        ctx.fillStyle = def.trail;
        ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;

      if (ball) drawBall(ctx, ball.x, ball.y, 16, 0, ball.def.top);
      else if (!hudRef.current.over) {
        const home = ballHome();
        drawBall(ctx, home.x, home.y, 18, 0, def.top);
        if (!drag) {
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
          ctx.fillText('🎯 drag the ball back and release!', W / 2, H - 24);
        }
      }

      // Burst particles + rings
      stars.forEach(s => {
        if (s.ring) {
          ctx.globalAlpha = Math.max(0, s.life / 0.5);
          ctx.strokeStyle = s.c; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.stroke();
        } else {
          ctx.globalAlpha = Math.max(0, s.life / 0.8);
          ctx.fillStyle = s.c;
          ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, Math.PI * 2); ctx.fill();
        }
      });
      ctx.globalAlpha = 1;

      // Floating coin / miss text
      floats.forEach(f => {
        ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
        ctx.fillStyle = f.c;
        ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center';
        ctx.fillText(f.text, f.x, f.y);
      });
      ctx.globalAlpha = 1;
    };

    const loop = (now) => {
      if (dead) return;
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.033, (now - last) / 1000); last = now;

      // Target motion per type
      targets.forEach(t => {
        if (t.capturing > 0) {
          t.capturing -= dt; t.shake = t.capturing * 14;
          if (t.capturing <= 0) succeed(t);
          return;
        }
        t.shake = 0;
        if (t.cooldown > 0) t.cooldown -= dt;
        if (t.type === 'speed') {
          t.changeT -= dt;
          if (t.changeT <= 0) { t.dir *= -1; t.changeT = 0.5 + Math.random() * 0.9; }
        }
        if (t.type === 'jumper') { t.jumpT += dt * 3; t.y = t.baseY - Math.abs(Math.sin(t.jumpT)) * 55; }
        t.x += t.dir * t.speed * dt;
        if (t.x < 60) { t.x = 60; t.dir = 1; }
        if (t.x > W - 60) { t.x = W - 60; t.dir = -1; }
      });

      // Ball physics
      if (ball) {
        if (ball.mode === 'fly') {
          const g = Date.now() < (boosts().wind || 0) ? G * 0.55 : G;
          ball.vy += g * dt;
          if (ball.def.curve) ball.vx += ball.def.curve * ball.curveSign * dt;
          ball.x += ball.vx * dt; ball.y += ball.vy * dt;
          trail.push({ x: ball.x, y: ball.y });
          if (trail.length > 12) trail.shift();
          const hitR = Date.now() < (boosts().wide || 0) ? HIT_R * 1.5 : HIT_R;
          for (const t of targets) {
            const d = Math.hypot(ball.x - t.x, ball.y - t.y);
            if (d < ball.near) ball.near = d;
            if (t.capturing <= 0 && t.cooldown <= 0 && d < hitR) {
              const chance = Math.min(1, ball.def.captureChance * (t.sp.legendary ? 0.85 : 1));
              if (Math.random() < chance) {
                ball.mode = 'capturing'; ball.target = t; t.capturing = CAPTURE_TIME;
                audio.sfx.ball();
              } else {
                // Broke free — bounce off, target immune for a second
                audio.sfx.wrong();
                floats.push({ x: t.x, y: t.y - 50, text: 'Broke free!', life: 1, c: '#ff8a80' });
                ball.vy = -Math.abs(ball.vy) * 0.4; ball.vx = -ball.vx * 0.4;
                t.cooldown = 1;
              }
              break;
            }
          }
          if (ball && ball.mode === 'fly' && (ball.y > H + 30 || ball.x < -30 || ball.x > W + 30)) {
            // Miss — a near-hit still gets feedback
            if (ball.near < 90) audio.sfx.ball();
            ball = null;
            patchHud({ streak: 0 });
            if (hudRef.current.balls <= 0) { audio.sfx.lose(); patchHud({ over: true }); }
          }
        } else if (ball.mode === 'capturing' && ball.target) {
          ball.x = ball.target.x; ball.y = ball.target.y;
        }
      }

      stars.forEach(s => {
        s.life -= dt;
        if (s.ring) s.r += 280 * dt;
        else { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 500 * dt; }
      });
      stars = stars.filter(s => s.life > 0);
      floats.forEach(f => { f.life -= dt * 0.9; f.y -= 40 * dt; });
      floats = floats.filter(f => f.life > 0);
      draw();
    };
    raf = requestAnimationFrame(loop);

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [round, onProfile]);

  return (
    <div className="h-full flex flex-col lg:flex-row">
      <ArcadeMenu profile={profile} onProfile={onProfile} />
      <div ref={wrapRef} className="relative flex-1 min-h-[420px] overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 touch-none cursor-grab active:cursor-grabbing" />
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
          <div className="bg-slate-900/80 rounded-lg px-3 py-1.5 text-white font-extrabold border-2 border-black shadow-[3px_3px_0_rgba(0,0,0,0.4)]">
            🔴 Pokéballs: {hud.balls}
          </div>
          <div className="bg-slate-900/80 rounded-lg px-3 py-1.5 text-yellow-300 font-extrabold border-2 border-black shadow-[3px_3px_0_rgba(0,0,0,0.4)]">
            🏆 Score: {hud.score}
          </div>
          <div className="bg-slate-900/80 rounded-lg px-3 py-1.5 text-yellow-300 font-extrabold border-2 border-black shadow-[3px_3px_0_rgba(0,0,0,0.4)]">
            🪙 Coins: {profile.coins}
          </div>
          <div className="bg-slate-900/80 rounded-lg px-3 py-1.5 text-green-300 font-extrabold border-2 border-black shadow-[3px_3px_0_rgba(0,0,0,0.4)]">
            🎯 Catches: {hud.catches} {hud.streak > 1 && <span className="text-orange-400">🔥{hud.streak}</span>}
          </div>
        </div>
        {achToast && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white font-extrabold px-5 py-2.5 rounded-xl border-2 border-black shadow-[3px_3px_0_rgba(0,0,0,0.4)] pointer-events-none">
            🏅 Achievement unlocked! {achToast}
          </div>
        )}
        {hud.msg && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-600/90 text-white font-extrabold px-4 py-2 rounded-xl pointer-events-none">
            {hud.msg}
          </div>
        )}
        {hud.over && (
          <div className="absolute inset-0 grid place-items-center bg-black/60 pointer-events-auto">
            <div className="bg-slate-900 rounded-2xl border-4 border-black shadow-[6px_6px_0_rgba(0,0,0,0.5)] p-8 text-center max-w-xs w-full mx-4">
              <div className="text-5xl mb-2">🥎</div>
              <h2 className="text-2xl font-extrabold text-yellow-300">Out of Pokéballs!</h2>
              <p className="text-white font-bold mt-3">Score: {hud.score}</p>
              <p className="text-green-300 font-bold">Catches this round: {hud.catches}</p>
              <p className="text-yellow-300 font-bold">🪙 Total coins: {profile.coins}</p>
              <p className="text-purple-300 text-sm mt-1">🏆 Best: {Math.max(profile.tossHigh || 0, hud.score)}</p>
              <div className="flex flex-col gap-2 mt-5">
                <button onClick={restart}
                  className="retro-btn bg-yellow-400 text-slate-900 px-4 py-2.5 rounded-xl border-2 border-black font-extrabold shadow-[3px_3px_0_rgba(0,0,0,0.45)]">
                  ▶ Play Again (+10 balls)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
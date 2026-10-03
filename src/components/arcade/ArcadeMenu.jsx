import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { HubButton } from '@/components/hub/HubButton';
import {
  ARCADE_BALLS, BALL_ORDER, BEAM_COLORS, BURST_STYLES, TARGET_SETS, TARGET_ORDER,
  POWERUPS, POWERUP_ORDER, BALL_PACK, ACHIEVEMENTS,
} from '@/components/arcade/arcadeConfig';

const SECTIONS = [
  { id: 'shop', icon: '🛒', name: 'Arcade Shop' },
  { id: 'custom', icon: '🎨', name: 'Ball Customizer' },
  { id: 'targets', icon: '🎯', name: 'Target Selector' },
  { id: 'powerups', icon: '⚡', name: 'Power-Up Bay' },
  { id: 'leaderboard', icon: '🏆', name: 'Leaderboard' },
  { id: 'achievements', icon: '🏅', name: 'Achievements Hub' },
];

// Side menu for the Arcade Pokéball Toss — six sections, all priced in coins
// earned by nailing targets during gameplay.
export function ArcadeMenu({ profile, onProfile }) {
  const [open, setOpen] = useState(null);
  const [board, setBoard] = useState(null);

  useEffect(() => {
    if (open !== 'leaderboard') return;
    base44.entities.ArcadeProfile.list('-tossHigh', 8)
      .then(rows => setBoard((rows || []).filter(r => (r.tossHigh || 0) > 0)))
      .catch(() => setBoard([]));
  }, [open]);

  const coins = profile.coins || 0;
  const boosts = profile.boosts || {};
  const active = profile.activeBall || 'pokeball';

  const buyBall = (id) => onProfile(p => {
    const b = ARCADE_BALLS[id];
    if ((p.coins || 0) < b.price || (p.ownedBalls || []).includes(id)) return p;
    return { ...p, coins: p.coins - b.price, ownedBalls: [...(p.ownedBalls || []), id], activeBall: id };
  });
  const buyPack = () => onProfile(p => {
    if ((p.coins || 0) < BALL_PACK.price) return p;
    return { ...p, coins: p.coins - BALL_PACK.price, balls: (p.balls || 0) + BALL_PACK.balls };
  });
  const unlockTarget = (id) => onProfile(p => {
    const t = TARGET_SETS[id];
    if ((p.coins || 0) < t.price || (p.unlockedTargets || []).includes(id)) return p;
    return { ...p, coins: p.coins - t.price, unlockedTargets: [...(p.unlockedTargets || []), id], targetSet: id };
  });
  const buyPowerup = (id) => onProfile(p => {
    const pu = POWERUPS.find(x => x.id === id);
    if ((p.coins || 0) < pu.price) return p;
    return { ...p, coins: p.coins - pu.price, powerUpsUsed: (p.powerUpsUsed || 0) + 1, boosts: { ...(p.boosts || {}), [id]: Date.now() + 60000 } };
  });

  const Coin = () => <span className="text-yellow-300 font-extrabold">🪙{coins}</span>;

  return (
    <aside className="w-full lg:w-72 shrink-0 bg-slate-900/90 border-b-4 lg:border-b-0 lg:border-r-4 border-black overflow-y-auto max-h-60 lg:max-h-none p-2 space-y-1.5">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-yellow-300 font-extrabold text-sm">🪙 {coins} coins</span>
        <Coin />
      </div>
      {SECTIONS.map(s => (
        <div key={s.id} className="rounded-xl border-2 border-black bg-slate-800/80 overflow-hidden">
          <button onClick={() => setOpen(o => o === s.id ? null : s.id)}
            className="w-full flex items-center justify-between px-3 py-2 text-white font-extrabold text-sm hover:bg-slate-700/70 transition-colors">
            <span>{s.icon} {s.name}</span>
            <span className="text-slate-400">{open === s.id ? '▾' : '▸'}</span>
          </button>

          {open === s.id && (
            <div className="px-2.5 pb-2.5 space-y-2 text-sm">

              {s.id === 'shop' && (
                <>
                  {BALL_ORDER.map(id => {
                    const b = ARCADE_BALLS[id];
                    const owned = (profile.ownedBalls || []).includes(id);
                    const afford = coins >= b.price;
                    return (
                      <div key={id} className="flex items-center justify-between gap-2 bg-slate-900/70 rounded-lg px-2 py-1.5">
                        <div className="min-w-0">
                          <div className="text-white font-bold text-xs">{b.icon} {b.name}</div>
                          <div className="text-slate-400 text-[10px]">{b.desc}</div>
                        </div>
                        <HubButton disabled={owned || !afford} onClick={() => buyBall(id)}
                          className={`!px-2 !py-1 text-\[11px] ${owned ? 'bg-slate-600 text-slate-300' : 'bg-yellow-400 text-slate-900'}`}>
                          {owned ? 'Owned' : `🪙${b.price}`}
                        </HubButton>
                      </div>
                    );
                  })}
                  <HubButton disabled={coins < BALL_PACK.price} onClick={buyPack}
                    className="w-full bg-emerald-500 text-white !py-1.5 text-xs">
                    📦 +{BALL_PACK.balls} Pokéballs — 🪙{BALL_PACK.price}
                  </HubButton>
                </>
              )}

              {s.id === 'custom' && (
                <>
                  <div className="text-slate-300 text-xs font-bold">Active ball</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(profile.ownedBalls || []).map(id => (
                      <button key={id} onClick={() => onProfile(p => ({ ...p, activeBall: id }))}
                        className={`px-2 py-1 rounded-lg text-xs font-bold border-2 ${active === id ? 'border-yellow-400 bg-slate-700' : 'border-black bg-slate-900'}`}>
                        {ARCADE_BALLS[id].icon}
                      </button>
                    ))}
                  </div>
                  <div className="text-slate-300 text-xs font-bold">Trajectory beam color</div>
                  <div className="flex flex-wrap gap-1.5">
                    {BEAM_COLORS.map(c => (
                      <button key={c} onClick={() => onProfile(p => ({ ...p, beamColor: c }))}
                        className={`w-7 h-7 rounded-full border-2 ${profile.beamColor === c ? 'border-yellow-400 scale-110' : 'border-black'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="text-slate-300 text-xs font-bold">Impact burst</div>
                  <div className="flex flex-wrap gap-1.5">
                    {BURST_STYLES.map(b => (
                      <button key={b.id} onClick={() => onProfile(p => ({ ...p, burst: b.id }))}
                        className={`px-2 py-1 rounded-lg text-xs font-bold border-2 ${profile.burst === b.id ? 'border-yellow-400 bg-slate-700' : 'border-black bg-slate-900'}`}>
                        {b.name}
                      </button>
                    ))}
                  </div>
                  <div className="text-slate-300 text-xs font-bold">Burst color</div>
                  <div className="flex flex-wrap gap-1.5">
                    {BEAM_COLORS.map(c => (
                      <button key={c} onClick={() => onProfile(p => ({ ...p, burstColor: c }))}
                        className={`w-7 h-7 rounded-full border-2 ${profile.burstColor === c ? 'border-yellow-400 scale-110' : 'border-black'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </>
              )}

              {s.id === 'targets' && TARGET_ORDER.map(id => {
                const t = TARGET_SETS[id];
                const unlocked = (profile.unlockedTargets || []).includes(id);
                const selected = profile.targetSet === id;
                return (
                  <div key={id} className="bg-slate-900/70 rounded-lg px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-white font-bold text-xs">{t.icon} {t.name}</div>
                      {unlocked
                        ? <HubButton onClick={() => onProfile(p => ({ ...p, targetSet: id }))}
                            className={`!px-2 !py-1 text-\[11px] ${selected ? 'bg-emerald-500 text-white' : 'bg-yellow-400 text-slate-900'}`}>
                            {selected ? 'Active' : 'Select'}
                          </HubButton>
                        : <HubButton disabled={coins < t.price} onClick={() => unlockTarget(id)}
                            className="!px-2 !py-1 text-[11px] bg-yellow-400 text-slate-900">🪙{t.price}</HubButton>}
                    </div>
                    <div className="text-slate-400 text-[10px]">{t.desc}</div>
                  </div>
                );
              })}

              {s.id === 'powerups' && POWERUP_ORDER.map(id => {
                const pu = POWERUPS.find(x => x.id === id);
                const until = boosts[id] || 0;
                const activeNow = Date.now() < until;
                return (
                  <div key={id} className="bg-slate-900/70 rounded-lg px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-white font-bold text-xs">{pu.icon} {pu.name}</div>
                      {activeNow
                        ? <span className="text-emerald-400 text-[11px] font-bold">Active {Math.ceil((until - Date.now()) / 1000)}s</span>
                        : <HubButton disabled={coins < pu.price} onClick={() => buyPowerup(id)}
                            className="!px-2 !py-1 text-[11px] bg-yellow-400 text-slate-900">🪙{pu.price}</HubButton>}
                    </div>
                    <div className="text-slate-400 text-[10px]">{pu.desc}</div>
                  </div>
                );
              })}

              {s.id === 'leaderboard' && (
                <>
                  <div className="bg-slate-900/70 rounded-lg px-2 py-1.5 text-white font-bold text-xs">
                    👤 Personal best: <span className="text-yellow-300">{profile.tossHigh || 0}</span>
                  </div>
                  {board === null && <div className="text-slate-400 text-xs px-1">Loading global scores…</div>}
                  {board && board.length === 0 && <div className="text-slate-400 text-xs px-1">No global scores yet — be the first!</div>}
                  {board && board.map((r, i) => (
                    <div key={r.id} className="flex items-center justify-between bg-slate-900/70 rounded-lg px-2 py-1.5">
                      <span className="text-white text-xs font-bold">#{i + 1} {r.display_name || 'Trainer'}</span>
                      <span className="text-yellow-300 text-xs font-extrabold">{r.tossHigh}</span>
                    </div>
                  ))}
                </>
              )}

              {s.id === 'achievements' && ACHIEVEMENTS.map(a => {
                const done = (profile.achievements || []).includes(a.id);
                return (
                  <div key={a.id} className={`rounded-lg px-2 py-1.5 border-2 ${done ? 'border-emerald-500 bg-emerald-900/40' : 'border-black bg-slate-900/70'}`}>
                    <div className="text-white font-bold text-xs">{done ? a.icon : '🔒'} {a.name}</div>
                    <div className="text-slate-400 text-[10px]">{a.desc} • reward 🪙{a.reward}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </aside>
  );
}
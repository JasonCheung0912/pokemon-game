import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { makeBotTeam } from '@/game/duel';
import { getEffectiveness, effectivenessText } from '@/game/battle';
import { getMoves } from '@/game/duel';
import { TypeTag } from '@/components/game/TypeTag';
import { PokemonImage } from '@/components/game/PokemonImage';

const TICK = 950;
const btn = 'px-4 py-2.5 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed';

function HpBar({ hp, maxHp }) {
  const r = Math.max(0, hp / maxHp);
  return (
    <div className="w-24 sm:w-32 h-3 bg-slate-700 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all"
        style={{ width: `${r * 100}%`, backgroundColor: r > 0.5 ? '#4ade80' : r > 0.25 ? '#fbbf24' : '#ef4444' }} />
    </div>
  );
}

/**
 * Team Battle — you + up to 3 friends vs three other players or a bot squad.
 * Turn-based auto-battle with a live log.
 */
export function TeamBattle({ playerData, players, friends, onDuelEnd, onBack }) {
  const [picked, setPicked] = useState([]);          // friend record ids
  const [battle, setBattle] = useState(null);
  const [oppName, setOppName] = useState('');
  const battleRef = useRef(null);
  battleRef.current = battle;
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const myActive = playerData?.team?.[playerData?.active_index ?? 0];
  const streak = playerData?.duel_streak || 0;

  const buildSquad = () => {
    const mine = [];
    if (myActive && !myActive.fainted) mine.push({ ...myActive, hp: myActive.maxHp, owner: `${playerData?.username || 'You'} (you)` });
    picked.forEach(id => {
      const rec = (friends || []).find(f => f.id === id) || (players || []).find(p => p.id === id);
      const best = (rec?.team || []).filter(p => !p.fainted)
        .sort((a, b) => (b.maxHp + b.attack) - (a.maxHp + a.attack))[0];
      if (best) mine.push({ ...best, hp: best.maxHp, owner: rec.username || 'Friend' });
    });
    return mine;
  };

  const start = (vsPlayers) => {
    const mine = buildSquad();
    if (mine.length < 2) return;
    let opp = [], name = 'Bot Squad';
    if (vsPlayers) {
      const others = (players || []).filter(p => p.id !== playerData?.id && !picked.includes(p.id))
        .sort(() => Math.random() - 0.5).slice(0, 3);
      opp = others.map(rec => {
        const best = (rec.team || []).filter(q => !q.fainted)
          .sort((a, b) => (b.maxHp + b.attack) - (a.maxHp + a.attack))[0];
        return best ? { ...best, hp: best.maxHp, owner: rec.username || 'Rival' } : null;
      }).filter(Boolean);
      name = opp.map(o => o.owner).slice(0, 3).join(' • ') || 'Rivals';
    }
    if (opp.length < 2) {
      opp = makeBotTeam(playerData?.difficulty, streak).map(p => ({ ...p, owner: 'Bot' }));
      name = 'Bot Squad';
    }
    setOppName(name);
    setBattle({ mine, opp, mi: 0, oi: 0, turn: 'me', over: null, log: `⚔️ Team battle begins: ${mine.length} vs ${opp.length}!` });
    timers.current.push(setTimeout(tick, 1100));
  };

  const tick = () => {
    const b = battleRef.current;
    if (!b || b.over) return;
    const mySide = b.turn === 'me';
    const atkTeam = mySide ? b.mine : b.opp;
    const defTeam = mySide ? b.opp : b.mine;
    const ai = mySide ? b.mi : b.oi;
    const di = mySide ? b.oi : b.mi;
    const atk = atkTeam[ai], def = defTeam[di];
    if (!atk || !def) return;
    const eff = getEffectiveness(atk.type, def.type);
    const dmg = Math.max(1, Math.round(atk.attack * eff * (0.85 + Math.random() * 0.3)));
    const moveName = getMoves(atk.species)[Math.floor(Math.random() * 3)];
    const effText = effectivenessText(eff, def.name);
    let ni = di, over = null, log;
    const newHp = Math.max(0, def.hp - dmg);
    const updatedDef = defTeam.map((p, i) => i === di ? { ...p, hp: newHp } : p);
    log = `${atk.owner}: ${atk.name} used ${moveName} — ${dmg} dmg!${effText}`;
    if (newHp <= 0) {
      if (di + 1 < defTeam.length) { ni = di + 1; log += ` ${def.name} fainted — ${updatedDef[ni].name} steps in!`; }
      else { over = mySide ? 'win' : 'lose'; log += mySide ? ' Every foe fainted — TEAM VICTORY! 🏆' : ' Your whole team fainted — defeat.'; }
    }
    setBattle(prev => ({
      ...prev,
      [mySide ? 'opp' : 'mine']: updatedDef,
      [mySide ? 'oi' : 'mi']: ni,
      turn: over ? (mySide ? 'me' : 'opp') : (mySide ? 'opp' : 'me'),
      over, log,
    }));
    if (!over) timers.current.push(setTimeout(tick, TICK));
  };

  useEffect(() => {
    if (battle?.over) {
      confetti({ particleCount: battle.over === 'win' ? 160 : 30, spread: 110, origin: { y: 0.5 } });
      onDuelEnd(battle.over === 'win');
    }
  }, [battle?.over]);

  const b = battle;
  const activeMine = b && !b.over ? b.mine[b.mi] : null;
  const activeOpp = b && !b.over ? b.opp[b.oi] : null;

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold text-white">👥 Team Battle</h2>
        <button onClick={onBack} className="text-slate-400 hover:text-white text-sm">← back</button>
      </div>

      {/* Squad builder */}
      {!b && (
        <div>
          <p className="text-slate-400 text-sm mb-3">
            Team up with up to 3 friends. Your squad: your equipped Pokémon + each friend's strongest healthy Pokémon.
          </p>
          {(myActive && !myActive.fainted) ? (
            <div className="flex items-center gap-2 bg-slate-700/50 rounded-xl p-2 mb-3">
              <PokemonImage species={myActive.species} alt={myActive.name} className="w-10 h-10 object-contain" />
              <div className="text-white text-sm font-bold">You: {myActive.name} <span className="text-slate-400 text-xs">({myActive.maxHp} HP • {myActive.attack} ATK)</span></div>
            </div>
          ) : (
            <p className="text-red-400 text-sm mb-3">Your equipped Pokémon has fainted — heal it first!</p>
          )}
          <p className="text-slate-300 text-sm font-bold mb-2">Pick friends ({picked.length}/3):</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 max-h-48 overflow-y-auto">
            {(friends || []).length === 0 && <p className="text-slate-400 text-sm">No friends yet — add some from the Friends panel first!</p>}
            {(friends || []).map(f => {
              const on = picked.includes(f.id);
              return (
                <button key={f.id} onClick={() => setPicked(p => on ? p.filter(x => x !== f.id) : (p.length < 3 ? [...p, f.id] : p))}
                  className={`flex items-center gap-2 p-2 rounded-xl border-2 text-left transition-all ${on ? 'border-emerald-400 bg-emerald-400/10' : 'border-slate-600 bg-slate-700/50 hover:border-slate-400'}`}>
                  <span className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs shrink-0 ${on ? 'bg-emerald-400 border-emerald-400 text-slate-900' : 'border-slate-500'}`}>{on ? '✓' : ''}</span>
                  <div className="min-w-0">
                    <div className="text-white text-xs font-bold truncate">{f.username || 'Friend'}</div>
                    <div className="text-[10px] text-slate-400">🐾 {(f.team || []).length} Pokémon</div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3">
            <button disabled={(myActive && !myActive.fainted ? 1 : 0) + picked.length < 2}
              onClick={() => start(true)} className={`${btn} bg-rose-600 hover:bg-rose-500 text-white`}>
              ⚔️ vs 3 Players
            </button>
            <button disabled={(myActive && !myActive.fainted ? 1 : 0) + picked.length < 2}
              onClick={() => start(false)} className={`${btn} bg-indigo-600 hover:bg-indigo-500 text-white`}>
              🤖 vs Bot Squad
            </button>
          </div>
        </div>
      )}

      {/* Battle */}
      {b && !b.over && (
        <div>
          <div className="flex justify-between items-start gap-2 mb-2">
            <div className="flex flex-col gap-1">
              {(b.mine || []).map((p, i) => (
                <div key={i} className={`flex items-center gap-2 px-2 py-1 rounded-lg ${i === b.mi ? 'bg-cyan-400/20 border border-cyan-400' : 'opacity-60'}`}>
                  <PokemonImage species={p.species} alt={p.name} className="w-8 h-8 object-contain" />
                  <div>
                    <div className="text-white text-xs font-bold">{p.name} <TypeTag type={p.type} /></div>
                    <HpBar hp={p.hp} maxHp={p.maxHp} />
                    <div className="text-slate-400 text-[10px]">{p.owner}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center text-2xl pt-4">⚔️</div>
            <div className="flex flex-col gap-1 items-end">
              {(b.opp || []).map((p, i) => (
                <div key={i} className={`flex items-center gap-2 px-2 py-1 rounded-lg ${i === b.oi ? 'bg-rose-400/20 border border-rose-400' : 'opacity-60'}`}>
                  <div className="text-right">
                    <div className="text-white text-xs font-bold">{p.name} <TypeTag type={p.type} /></div>
                    <HpBar hp={p.hp} maxHp={p.maxHp} />
                    <div className="text-slate-400 text-[10px]">{p.owner}</div>
                  </div>
                  <PokemonImage species={p.species} alt={p.name} className="w-8 h-8 object-contain" />
                </div>
              ))}
            </div>
          </div>
          <div className="text-center text-xs font-bold mb-2 text-slate-300">
            {b.turn === 'me' ? '🟦 YOUR TEAM ATTACKS…' : `🟥 ${oppName} ATTACK…`}
          </div>
          <div className="text-slate-200 min-h-[3rem] text-center text-sm bg-slate-700/50 rounded-lg py-2 px-3 mb-3">{b.log}</div>
          <p className="text-slate-500 text-xs text-center">Auto-battle — your team fights on its own. Cheer them on!</p>
        </div>
      )}

      {/* Result */}
      {b?.over && (
        <div className="text-center py-4">
          <div className="text-5xl mb-3">{b.over === 'win' ? '🏆' : '💔'}</div>
          <h2 className={`text-3xl font-bold mb-2 ${b.over === 'win' ? 'text-amber-300' : 'text-rose-400'}`}>
            {b.over === 'win' ? 'Team Victory!' : 'Defeat'}
          </h2>
          <p className="text-slate-300 mb-4">{b.over === 'win' ? `You and your friends beat ${oppName}!` : `${oppName} won this time.`}</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => { setBattle(null); setPicked([]); }} className={`${btn} bg-indigo-600 hover:bg-indigo-500 text-white`}>🔁 New Team Battle</button>
            <button onClick={onBack} className={`${btn} bg-emerald-600 hover:bg-emerald-500 text-white`}>← back to arena</button>
          </div>
        </div>
      )}
    </div>
  );
}
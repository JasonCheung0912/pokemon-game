import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { getMoves, streakAttackUnlocked, streakAttackBonus, makeBotOpponent, makePlayerOpponent } from '@/game/duel';
import { TeamBattle } from '@/components/game/TeamBattle';
import { getEffectiveness, effectivenessText } from '@/game/battle';
import { TypeTag } from '@/components/game/TypeTag';
import { DUEL } from '@/game/config';
import { PokemonImage } from '@/components/game/PokemonImage';

function HpBar({ hp, maxHp, w = 'w-32 sm:w-40' }) {
  const r = Math.max(0, hp / maxHp);
  return (
    <div className={`${w} h-3 bg-slate-700 rounded-full overflow-hidden`}>
      <div className="h-full rounded-full transition-all"
        style={{ width: `${r \* 100}%`, backgroundColor: r > 0.5 ? '#4ade80' : r > 0.25 ? '#fbbf24' : '#ef4444' }} />
    </div>
  );
}

function BattlerPanel({ p, side, label }) {
  if (!p) return null;
  return (
    <div className={`flex flex-col ${side === 'left' ? 'items-start' : 'items-end'} gap-1`}>
      <div className="flex items-center gap-2">
        {side === 'right' && <HpBar hp={p.hp} maxHp={p.maxHp} />}
        <div className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: p.color + '20', border: `2px solid ${p.color}` }}>
          <PokemonImage species={p.species} alt={p.name} className="w-16 h-16 object-contain" />
        </div>
        {side === 'left' && <HpBar hp={p.hp} maxHp={p.maxHp} />}
      </div>
      <div className="text-white font-bold text-sm flex items-center gap-1">
        {p.name} <TypeTag type={p.type} /> <span className="text-orange-400 text-xs">⚔️{p.attack}</span>
      </div>
      <div className="text-slate-300 text-xs">{Math.max(0, Math.round(p.hp))} / {p.maxHp} HP</div>
      <div className="text-slate-400 text-xs">{label}</div>
    </div>
  );
}

function TeamDots({ team, activeIdx }) {
  return (
    <div className="flex gap-1.5">
      {team.map((p, i) => (
        <div key={i} title={p.name}
          className={`w-6 h-6 rounded-full text-\[10px] font-bold flex items-center justify-center border-2 ${
            i === activeIdx ? 'border-white bg-white/20 text-white'
              : p.hp <= 0 ? 'border-slate-600 bg-slate-800 text-slate-500 line-through'
              : 'border-slate-500 bg-slate-700 text-slate-300'
          }`}>
          {i + 1}
        </div>
      ))}
    </div>
  );
}

export function DuelArena({ playerData, players, friends, forcedOpponent, mode, onDuelEnd, onGiveUpStreak, onClose }) {
  const [stage, setStage] = useState(() => {
    if (playerData?.duel_locked) return 'gate';
    if (forcedOpponent) return 'select';
    return (players && players.length > 0) ? 'intro' : 'select';
  });
  const [selection, setSelection] = useState([]); // uids in battle order
  const [opponent, setOpponent] = useState(null);
  const [battle, setBattle] = useState(null);
  const wheelRef = useRef(null);
  const timersRef = useRef([]);
  const battleRef = useRef(null);
  battleRef.current = battle;

  const team = playerData?.team || [];
  const healthy = team.filter(p => !p.fainted);
  const streak = playerData?.duel_streak || 0;
  const myName = playerData?.username || 'You';
  const topPlayer = [...(players || [])].sort((a, b) => (b.duel_streak || 0) - (a.duel_streak || 0) || (b.exp || 0) - (a.exp || 0))[0];

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const scheduleOppTurn = () => {
    const t = setTimeout(() => {
      setBattle(prev => {
        if (!prev || prev.over || prev.turn !== 'opp') return prev;
        const opp = prev.oppTeam[prev.oppIdx];
        const mine = prev.myTeam[prev.myIdx];
        const eff = getEffectiveness(opp.type, mine.type);
        const dmg = Math.max(1, Math.round(opp.attack * eff));
        const moveName = getMoves(opp.species)[Math.floor(Math.random() * 3)];
        const effText = effectivenessText(eff, mine.name);
        const newHp = Math.max(0, mine.hp - dmg);
        const myTeam = prev.myTeam.map((p, i) => i === prev.myIdx ? { ...p, hp: newHp } : p);
        let myIdx = prev.myIdx, over = null;
        let log = `${opp.name} used ${moveName} — ${dmg} damage!${effText}`;
        if (newHp <= 0) {
          if (prev.myIdx >= 2) { over = 'lose'; log += ` All your Pokémon fainted — you lose the duel!`; }
          else { myIdx = prev.myIdx + 1; log += ` ${mine.name} fainted — go, ${myTeam\[myIdx].name}!`; }
        }
        return { ...prev, myTeam, myIdx, log, over, turn: over ? 'opp' : 'me' };
      });
    }, 1100);
    timersRef.current.push(t);
  };

  const myAction = (moveIdx, isStreak) => {
    const b = battleRef.current;
    if (!b || b.over || b.turn !== 'me') return;
    const mine = b.myTeam[b.myIdx];
    const opp = b.oppTeam[b.oppIdx];
    const eff = getEffectiveness(mine.type, opp.type);
    const dmg = Math.max(0, Math.floor((isStreak ? mine.attack + streakAttackBonus(streak) : mine.attack) * eff));
    const moveName = isStreak ? '🔥 STREAK ATTACK' : getMoves(mine.species)[moveIdx];
    const effText = effectivenessText(eff, opp.name);
    const newHp = Math.max(0, opp.hp - dmg);
    const oppTeam = b.oppTeam.map((p, i) => i === b.oppIdx ? { ...p, hp: newHp } : p);
    let oppIdx = b.oppIdx, over = null;
    let log = `${mine.name} used ${moveName} — ${dmg} damage!${effText}`;
    if (newHp <= 0) {
      if (b.oppIdx >= 2) { over = 'win'; log += ` ${opp.name} fainted — VICTORY!`; }
      else { oppIdx = b.oppIdx + 1; log += ` ${opp.name} fainted — ${oppTeam\[oppIdx].name} is sent out!`; }
    }
    const cooldown = isStreak ? DUEL.cooldownRounds : Math.max(0, b.cooldown - 1);
    setBattle({ ...b, oppTeam, oppIdx, log, cooldown, over, turn: over ? 'me' : 'opp' });
    if (!over) scheduleOppTurn();
  };

  useEffect(() => {
    if (battle?.over) onDuelEnd(battle.over === 'win');
  }, [battle?.over]);

  const startDuel = (opp) => { setOpponent(opp); setStage('spinner'); };

  // Spinner: 3s spin → confetti explosion → match begins
  useEffect(() => {
    if (stage !== 'spinner') return;
    const first = Math.random() < 0.5 ? 'me' : 'opp';
    // Pointer at top: 'me' half-center (90°) must land on top → wheel rotates 270°
    const segCenter = first === 'me' ? 270 : 90;
    const rotation = 1800 + segCenter + (Math.random() - 0.5) * 100;
    const raf = requestAnimationFrame(() => {
      if (wheelRef.current) wheelRef.current.style.transform = `rotate(${rotation}deg)`;
    });
    const t = setTimeout(() => {
      confetti({ particleCount: 150, spread: 120, origin: { y: 0.55 }, colors: ['#22d3ee', '#f43f5e', '#fbbf24'] });
      const t2 = setTimeout(() => {
        const myTeam = selection.map(uid => {
          const p = team.find(q => q.uid === uid);
          return { ...p, hp: p.maxHp, fainted: false };
        });
        const oppTeam = opponent.team.map(p => ({ ...p, hp: p.maxHp, fainted: false }));
        setBattle({
          myTeam, oppTeam, myIdx: 0, oppIdx: 0, cooldown: 0, over: null,
          turn: first === 'opp' ? 'opp' : 'me',
          log: first === 'opp' ? `${opponent.username}'s ${oppTeam\[0].name} strikes first!` : 'You strike first!',
        });
        setStage('battle');
        if (first === 'opp') scheduleOppTurn();
      }, 600);
      timersRef.current.push(t2);
    }, DUEL.spinnerSeconds * 1000);
    timersRef.current.push(t);
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  const toggleSelect = (uid) => {
    setSelection(prev => prev.includes(uid) ? prev.filter(u => u !== uid) : (prev.length < 3 ? [...prev, uid] : prev));
  };

  const panelBtn = 'px-4 py-2.5 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center pointer-events-auto p-4 overflow-y-auto">
      <div className="bg-slate-800 rounded-2xl p-6 max-w-2xl w-full">

        {/* ─── Gate: must give up a 250 streak to keep dueling ─── */}
        {stage === 'gate' && (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">👑</div>
            <h2 className="text-2xl font-bold text-amber-300 mb-3">Congratulations, well done!</h2>
            <p className="text-slate-300 mb-6">You reached a 250-win streak! Do you want to give up your streak to continue battling?</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => { onGiveUpStreak(); setStage('select'); }}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg">
                ✅ Yes — reset streak & keep dueling
              </button>
              <button onClick={onClose}
                className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-bold shadow-lg">
                ❌ No — keep catching wild Pokémon
              </button>
            </div>
          </div>
        )}

        {/* ─── Intro: a real player wants to battle ─── */}
        {stage === 'intro' && topPlayer && (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">⚔️</div>
            <h2 className="text-2xl font-bold text-white mb-3">
              {topPlayer.username || 'A rival trainer'} wants to battle you!
            </h2>
            <div className="flex flex-col gap-3 items-center">
              <button onClick={() => startDuel(makePlayerOpponent(topPlayer, mode, streak))}
                className="px-8 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold shadow-lg">
                Accept — duel {topPlayer.username || 'rival'} →
              </button>
              <button onClick={() => startDuel(makeBotOpponent(mode, streak))}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg">
                🤖 Fight a bot instead
              </button>
              <button onClick={onClose} className="text-slate-400 text-sm hover:text-white">Cancel</button>
            </div>
          </div>
        )}

        {/* ─── Select 3 Pokémon in order ─── */}
        {stage === 'select' && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <h2 className="text-2xl font-bold text-white">🏟️ Duel Arena</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <p className="text-slate-400 text-sm mb-4">Pick 3 healthy Pokémon.</p>
            {forcedOpponent && (
              <p className="text-rose-300 text-sm mb-3 font-bold">⚔️ Dueling: {forcedOpponent.username || 'rival'}</p>
            )}
            {healthy.length < 3 && (
              <p className="text-red-400 text-sm mb-3">You need 3 healthy Pokémon to duel — heal your team first!</p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5 max-h-64 overflow-y-auto">
              {healthy.map(p => {
                const order = selection.indexOf(p.uid);
                return (
                  <button key={p.uid} onClick={() => toggleSelect(p.uid)}
                    className={`relative flex items-center gap-2 p-2 rounded-xl border-2 text-left transition-all ${
                      order !== -1 ? 'border-cyan-400 bg-cyan-400/10' : 'border-slate-600 bg-slate-700/50 hover:border-slate-400'
                    }`}>
                    {order !== -1 && (
                      <span className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-cyan-400 text-slate-900 text-xs font-bold flex items-center justify-center">
                        {order + 1}
                      </span>
                    )}
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: p.color + '20' }}>
                      <PokemonImage species={p.species} alt={p.name} className="w-9 h-9 object-contain" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-white text-xs font-bold truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-400">❤️{p.maxHp} ⚔️{p.attack}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {forcedOpponent ? (
                <button disabled={selection.length !== 3} onClick={() => startDuel(makePlayerOpponent(forcedOpponent, mode, streak))}
                  className={`${panelBtn} bg-rose-600 hover:bg-rose-500 text-white`}>
                  ⚔️ Duel {forcedOpponent.username || 'rival'} →
                </button>
              ) : topPlayer ? (
                <button disabled={selection.length !== 3} onClick={() => startDuel(makePlayerOpponent(topPlayer, mode, streak))}
                  className={`${panelBtn} bg-rose-600 hover:bg-rose-500 text-white`}>
                  ⚔️ Duel {topPlayer.username || 'rival'} →
                </button>
              ) : null}
              <button disabled={selection.length !== 3} onClick={() => startDuel(makeBotOpponent(mode, streak))}
                className={`${panelBtn} bg-indigo-600 hover:bg-indigo-500 text-white`}>
                🤖 Fight a bot →
              </button>
            </div>

            {/* ─── Friends: duel them one-on-one, or team up with up to 3 ─── */}
            <div className="mt-4 border-t-2 border-slate-700 pt-3">
              <p className="text-slate-300 text-sm font-bold mb-2">👥 Friends ({(friends || []).length}) — battle or team up!</p>
              {(friends || []).length === 0 && (
                <p className="text-slate-500 text-xs mb-2">No friends yet — open the 👥 Friends panel to send friend requests.</p>
              )}
              <div className="flex flex-wrap gap-2 mb-3">
                {(friends || []).map(f => (
                  <button key={f.id} disabled={selection.length !== 3} onClick={() => startDuel(makePlayerOpponent(f, mode, streak))}
                    className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded-lg text-xs font-bold disabled:opacity-40">
                    ⚔️ {f.username || 'Friend'}
                  </button>
                ))}
              </div>
              <button onClick={() => setStage('team')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm">
                👥 Team Battle (you + up to 3 friends)
              </button>
            </div>
          </div>
        )}

        {/* ─── Team Battle ─── */}
        {stage === 'team' && (
          <TeamBattle playerData={playerData} players={players} friends={friends}
            onDuelEnd={onDuelEnd} onBack={() => setStage('select')} />
        )}

        {/* ─── Spinner wheel ─── */}
        {stage === 'spinner' && (
          <div className="flex flex-col items-center gap-5 py-4">
            <h2 className="text-3xl font-bold text-white">🎰 Who goes first?</h2>
            <div className="relative w-64 h-64">
              <div ref={wheelRef}
                className="w-64 h-64 rounded-full shadow-2xl transition-transform duration-[3000ms] ease-out"
                style={{ background: 'conic-gradient(#22d3ee 0deg 180deg, #f43f5e 180deg 360deg)' }}>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-white font-bold text-xs sm:text-sm max-w-[44%] text-right truncate">{myName}</div>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-white font-bold text-xs sm:text-sm max-w-[44%] truncate">{opponent?.username || 'Bot'}</div>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full border-4 border-slate-900" />
              </div>
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl">▼</div>
            </div>
          </div>
        )}

        {/* ─── Battle ─── */}
        {stage === 'battle' && battle && !battle.over && (
          <div>
            <div className="flex justify-between items-start gap-2 mb-2">
              <BattlerPanel p={battle.myTeam[battle.myIdx]} side="left" label={`#${battle.myIdx + 1} of yours`} />
              <div className="text-center text-3xl pt-6">⚔️</div>
              <BattlerPanel p={battle.oppTeam[battle.oppIdx]} side="right" label={`${opponent?.username || 'Bot'}'s #${battle.oppIdx + 1}`} />
            </div>
            <div className="flex justify-between items-center gap-2 my-3">
              <TeamDots team={battle.myTeam} activeIdx={battle.myIdx} />
              <span className={`text-xs font-bold ${battle.turn === 'me' ? 'text-cyan-300' : 'text-rose-300'}`}>
                {battle.turn === 'me' ? 'YOUR TURN' : `${opponent?.username || 'Bot'}'S TURN…`}
              </span>
              <TeamDots team={battle.oppTeam} activeIdx={battle.oppIdx} />
            </div>
            <div className="text-slate-200 min-h-[3rem] text-center text-sm bg-slate-700/50 rounded-lg py-2 px-3 mb-4">{battle.log}</div>
            <div className="flex flex-wrap gap-2 justify-center">
              {getMoves(battle.myTeam[battle.myIdx].species).map((m, i) => (
                <button key={i} disabled={battle.turn !== 'me'} onClick={() => myAction(i, false)}
                  className={`${panelBtn} bg-cyan-600 hover:bg-cyan-500 text-white disabled:bg-slate-600 disabled:hover:bg-slate-600`}>
                  {m}
                </button>
              ))}
              {streakAttackUnlocked(streak) ? (
                <button disabled={battle.turn !== 'me' || battle.cooldown > 0} onClick={() => myAction(-1, true)}
                  className={`${panelBtn} bg-orange-600 hover:bg-orange-500 text-white disabled:bg-slate-600 disabled:hover:bg-slate-600`}>
                  🔥 Streak Attack{battle.cooldown > 0 ? ` (${battle.cooldown})` : ''}
                </button>
              ) : null}
            </div>
          </div>
        )}

        {/* ─── Result ─── */}
        {stage === 'battle' && battle?.over && (
          <div className="text-center py-4">
            <div className="text-5xl mb-3">{battle.over === 'win' ? '🏆' : '💔'}</div>
            <h2 className={`text-3xl font-bold mb-2 ${battle.over === 'win' ? 'text-amber-300' : 'text-rose-400'}`}>
              {battle.over === 'win' ? 'Victory!' : 'Defeat'}
            </h2>
            <p className="text-slate-300 mb-1">
              {battle.over === 'win'
                ? `You beat ${opponent?.username || 'the bot'}!`
                : `${opponent?.username || 'The bot'} won this time — your streak is reset.`}
            </p>
            <p className="text-rose-300 text-sm mb-5">
              Duel streak: {(playerData?.duel_streak ?? 0) >= DUEL.infinityAt ? '∞' : (playerData?.duel_streak ?? 0)}
            </p>
            {playerData?.duel_locked ? (
              <div className="bg-amber-900/40 border border-amber-500/50 rounded-xl p-4 mb-4">
                <p className="text-amber-300 font-bold mb-3">🎉 Congratulations, well done — 250 wins in a row! Give up your streak to continue battling?</p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <button onClick={() => { onGiveUpStreak(); setStage('select'); setBattle(null); }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold">✅ Yes</button>
                  <button onClick={onClose}
                    className="px-5 py-2.5 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-bold">❌ No</button>
                </div>
              </div>
            ) : (
              <button onClick={onClose}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg">
                Back to exploring →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
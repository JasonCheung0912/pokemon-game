import { useState, useEffect, useRef, useCallback } from 'react';
import { POKEMON_SPECIES, getSpriteUrl } from '@/game/config';
import { HubButton } from '@/components/hub/HubButton';
import { QUIZ_HELPERS } from '@/components/arcade/arcadeConfig';
import * as audio from '@/game/audio';

// ─── Speed Pokédex Quiz — escalating timed silhouette trivia ───
// Base 10s per question. Every 10 correct answers shaves 2s off the clock
// (down to 3s). Wrong answers cost 4 seconds and the correct answer stays
// hidden. Earn helper tokens (hints, 50/50, time extends and more) by
// answering correctly and keeping streaks alive — 12 helpers in total.
const BASE_TIME = 10;
const WRONG_PENALTY = 4;
const TIME_STEP = 2;        // seconds removed per 10 correct answers
const STEP_EVERY = 10;
const MIN_TIME = 3;
const FAST_WINDOW = 3;

function makeQuestion() {
  const correct = POKEMON_SPECIES[Math.floor(Math.random() * POKEMON_SPECIES.length)];
  const ids = new Set([correct.id]);
  while (ids.size < 4) {
    const o = POKEMON_SPECIES[Math.floor(Math.random() * POKEMON_SPECIES.length)];
    ids.add(o.id);
  }
  const options = [...ids].sort(() => Math.random() - 0.5).map(id => POKEMON_SPECIES.find(s => s.id === id));
  return { correct, options };
}

export default function QuizGame({ profile, onProfile }) {
  const [round, setRound] = useState(0);
  const [q, setQ] = useState(null);
  const [timeLeft, setTimeLeft] = useState(BASE_TIME);
  const [baseTime, setBaseTime] = useState(BASE_TIME);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correctTotal, setCorrectTotal] = useState(0);
  const [over, setOver] = useState(false);
  const [feedback, setFeedback] = useState(null);
  // helper system
  const [tokens, setTokens] = useState({});
  const [removed, setRemoved] = useState([]);       // option ids hidden by 50/50 / bomb
  const [fx, setFx] = useState({ glow: false, letter: false, hint: null, doubleNext: false, surge: 0, shield: false });
  const [frozenUntil, setFrozenUntil] = useState(0);
  const [helperMsg, setHelperMsg] = useState(null);
  const questionStartRef = useRef(0);
  const baseTimeRef = useRef(BASE_TIME);
  const feedbackTimer = useRef(null);
  const streakRef = useRef(0);
  const overRef = useRef(false);
  streakRef.current = streak;
  overRef.current = over;

  const nextQuestion = useCallback(() => {
    setQ(makeQuestion());
    setTimeLeft(baseTimeRef.current);
    setRemoved([]);
    setFx(f => ({ ...f, glow: false, letter: false, hint: null }));
    questionStartRef.current = performance.now();
  }, []);

  const startGame = useCallback(() => {
    setScore(0); setStreak(0); setCorrectTotal(0); setOver(false); setFeedback(null);
    setTokens({}); setRemoved([]); setFrozenUntil(0);
    setFx({ glow: false, letter: false, hint: null, doubleNext: false, surge: 0, shield: false });
    baseTimeRef.current = BASE_TIME;
    setBaseTime(BASE_TIME);
    setRound(r => r + 1);
  }, []);

  useEffect(() => {
    if (round > 0) nextQuestion();
    return () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); };
  }, [round, nextQuestion]);

  // Countdown — pauses while feedback is shown, freezes while ❄️ Freeze is active
  useEffect(() => {
    if (!q || over || feedback) return;
    const iv = setInterval(() => {
      if (Date.now() < frozenUntil) return;
      setTimeLeft(t => {
        const n = Math.round((t - 0.1) * 10) / 10;
        if (n <= 0) {
          // 🔁 Extra Life — revive once with 5s
          if ((tokens.revive || 0) > 0) {
            setTokens(prev => ({ ...prev, revive: prev.revive - 1 }));
            setHelperMsg('🔁 Extra Life! Revived with 5 seconds');
            return 5;
          }
          setOver(true); return 0;
        }
        return n;
      });
    }, 100);
    return () => clearInterval(iv);
  }, [q, over, feedback, frozenUntil, tokens.revive]);

  // Log the high score when the run ends
  useEffect(() => {
    if (over) {
      onProfile(p => ({
        ...p,
        quizHigh: Math.max(p.quizHigh || 0, score),
        quizBestStreak: Math.max(p.quizBestStreak || 0, streak),
        quizCorrect: (p.quizCorrect || 0) + correctTotal,
      }));
    }
  }, [over, score, streak, correctTotal, onProfile]);

  // helper token grants — every multiple of each helper's threshold
  const grantTokens = (newStreak, newCorrect) => {
    setTokens(prev => {
      const next = { ...prev };
      QUIZ_HELPERS.forEach(h => {
        const s = h.every.streak, c = h.every.correct;
        if (s && newStreak > 0 && newStreak % s === 0) next[h.id] = (next[h.id] || 0) + 1;
        if (c && newCorrect > 0 && newCorrect % c === 0) next[h.id] = (next[h.id] || 0) + 1;
      });
      return next;
    });
  };

  const activateHelper = (h) => {
    if (!q || feedback || over) return;
    if ((tokens[h.id] || 0) <= 0) return;
    if (h.id === 'revive') { setHelperMsg('🔁 Extra Life auto-activates when time hits 0!'); setTimeout(() => setHelperMsg(null), 2200); return; }
    audio.sfx.pickup();
    setTokens(prev => ({ ...prev, [h.id]: prev[h.id] - 1 }));
    switch (h.id) {
      case 'hint': setFx(f => ({ ...f, hint: q.correct.type })); setHelperMsg('💡 Hint revealed!'); break;
      case 'fifty': {
        const wrongs = q.options.filter(o => o.id !== q.correct.id && !removed.includes(o.id));
        const drop = wrongs.sort(() => Math.random() - 0.5).slice(0, 2).map(o => o.id);
        setRemoved(r => [...r, ...drop]); setHelperMsg('✂️ 50/50 — two wrong options removed!'); break;
      }
      case 'extend': setTimeLeft(t => t + 5); setHelperMsg('⏱️ +5 seconds — this question only!'); break;
      case 'skip': setHelperMsg('⏭️ Skipped!'); feedbackTimer.current = setTimeout(() => nextQuestion(), 300); break;
      case 'freeze': setFrozenUntil(Date.now() + 5000); setHelperMsg('❄️ Timer frozen for 5s!'); break;
      case 'double': setFx(f => ({ ...f, doubleNext: true })); setHelperMsg('💰 Next correct answer pays ×2!'); break;
      case 'glow': setFx(f => ({ ...f, glow: true })); setHelperMsg('🔍 Silhouette brightened!'); break;
      case 'letter': setFx(f => ({ ...f, letter: true })); setHelperMsg('🔤 First letter shown!'); break;
      case 'shield': setFx(f => ({ ...f, shield: true })); setHelperMsg('🛡️ Your next wrong answer is forgiven!'); break;
      case 'surge': setFx(f => ({ ...f, surge: 3 })); setHelperMsg('⚡ +50% points for the next 3 answers!'); break;
      case 'bomb': {
        const wrongs = q.options.filter(o => o.id !== q.correct.id && !removed.includes(o.id));
        if (wrongs.length > 0) { setRemoved(r => [...r, wrongs[0].id]); setHelperMsg('💣 One more wrong option removed!'); }
        else { setTokens(prev => ({ ...prev, bomb: (prev.bomb || 0) + 1 })); setHelperMsg('Nothing left to remove!'); }
        break;
      }
      case 'revive': setHelperMsg('🔁 Extra Life armed — auto-revives when time hits 0!'); break;
      default: break;
    }
    setTimeout(() => setHelperMsg(null), 2200);
  };

  const answer = (species) => {
    if (!q || feedback || over) return;
    if (species.id === q.correct.id) {
      const elapsed = (performance.now() - questionStartRef.current) / 1000;
      const newStreak = streak + 1;
      const newCorrect = correctTotal + 1;
      let mult = 1 + Math.min(streak, 4) * 0.5;
      let gained = Math.round(100 * mult);
      if (fx.doubleNext) { gained *= 2; }
      if (fx.surge > 0) { gained = Math.round(gained * 1.5); }
      const fast = elapsed <= FAST_WINDOW;
      if (fast) onProfile(p => ({ ...p, balls: p.balls + 1 }));
      setScore(s => s + gained);
      setStreak(newStreak);
      setCorrectTotal(newCorrect);
      setFx(f => ({ ...f, doubleNext: false, surge: Math.max(0, f.surge - 1) }));
      grantTokens(newStreak, newCorrect);
      audio.sfx.correct();
      // Every 10 correct answers → the clock gets 2 seconds harsher
      let speedDrop = null;
      if (newCorrect > 0 && newCorrect % STEP_EVERY === 0) {
        const next = Math.max(MIN_TIME, baseTimeRef.current - TIME_STEP);
        if (next < baseTimeRef.current) {
          baseTimeRef.current = next;
          setBaseTime(next);
          speedDrop = next;
        }
      }
      setFeedback({ correct: true, gained, ball: fast, speedDrop, doubled: gained > Math.round(100 * mult) * (fx.surge > 0 ? 1.5 : 1) });
      feedbackTimer.current = setTimeout(() => { setFeedback(null); nextQuestion(); }, 1000);
    } else {
      if (fx.shield) {
        setFx(f => ({ ...f, shield: false }));
        audio.sfx.pickup();
        setFeedback({ shielded: true });
        setHelperMsg('🛡️ Second Chance — wrong answer forgiven!');
        setTimeout(() => setHelperMsg(null), 2200);
      } else {
        audio.sfx.wrong();
        setStreak(0);
        setTimeLeft(t => Math.max(0.1, Math.round((t - WRONG_PENALTY) * 10) / 10));
        setFeedback({ correct: false });
      }
      feedbackTimer.current = setTimeout(() => setFeedback(null), 900);
    }
  };

  const mult = 1 + Math.min(streak, 4) * 0.5;
  const visibleOptions = q ? q.options.filter(o => !removed.includes(o.id)) : [];
  const tokenCount = QUIZ_HELPERS.reduce((n, h) => n + (tokens[h.id] || 0), 0);

  return (
    <div className="min-h-full flex flex-col items-center px-4 py-6" style={{ backgroundColor: '#312e81' }}>
      {/* HUD */}
      <div className="w-full max-w-3xl flex items-center justify-between gap-3 text-white font-extrabold">
        <span className="text-yellow-300">🏆 {score}</span>
        <span>🔥 Streak: {streak} <span className="text-orange-300">(×{mult})</span></span>
        <span>✔ {correctTotal} correct</span>
        <span className={timeLeft <= 3 ? 'text-red-400' : 'text-green-300'}>⏱ {timeLeft.toFixed(1)}s <span className="text-slate-300 text-xs">/ {baseTime}s</span></span>
      </div>
      {/* Timer bar */}
      <div className="w-full max-w-3xl h-3 bg-slate-800 rounded-full overflow-hidden border-2 border-black mt-2">
        <div className="h-full rounded-full transition-all duration-100"
          style={{ width: `${Math.max(0, (timeLeft / baseTime) * 100)}%`, backgroundColor: Date.now() < frozenUntil ? '#93c5fd' : timeLeft <= 3 ? '#ef4444' : '#4ade80' }} />
      </div>

      {/* Start screen */}
      {round === 0 && (
        <div className="flex-1 grid place-items-center w-full">
          <div className="bg-slate-900 rounded-2xl border-4 border-black shadow-[6px_6px_0_rgba(0,0,0,0.5)] p-8 text-center max-w-md">
            <div className="text-5xl mb-3">⚡</div>
            <h2 className="text-2xl font-extrabold text-white">Speed Pokédex Quiz</h2>
            <p className="text-slate-300 mt-3 text-sm">
              Name the shadowed Pokémon before the clock dies.

              Wrong answers cost {WRONG_PENALTY} seconds — and the right answer stays hidden!

              Every {STEP_EVERY} correct answers shaves {TIME_STEP}s off the clock (min {MIN_TIME}s)

              Answer within {FAST_WINDOW}s for a bonus 🎯 Pokéball

              <span className="text-cyan-300">💡 Streaks &amp; correct answers earn {QUIZ_HELPERS.length} kinds of helpers — hints, 50/50, time extends, shields and more!</span>
            </p>
            <div className="mt-5">
              <HubButton onClick={startGame} className="bg-yellow-400 text-slate-900">▶ Start Quiz</HubButton>
            </div>
          </div>
        </div>
      )}

      {/* Helper bar */}
      {q && round > 0 && !over && (
        <div className="w-full max-w-3xl mt-3 bg-slate-900/80 rounded-xl border-2 border-black p-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-cyan-300 text-xs font-bold shrink-0">🧰 Helpers ({tokenCount}):</span>
            {QUIZ_HELPERS.map(h => (
              <button key={h.id} onClick={() => activateHelper(h)} disabled={(tokens[h.id] || 0) <= 0}
                title={`${h.name} — ${h.desc} (earn 1 every ${h.every.streak ? `${h.every.streak} streak`:`${h.every.correct} correct`})`}
                className={`shrink-0 px-2 py-1 rounded-lg text-xs font-bold border-2 transition-all ${\n                  (tokens[h.id] || 0) > 0\n                    ? 'bg-cyan-600 border-cyan-300 text-white hover:scale-105 cursor-pointer'\n                    : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'}`}>
                {h.icon} {h.name} <span className="text-yellow-300">×{tokens[h.id] || 0}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Question */}
      {q && round > 0 && !over && (
        <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 flex-1 content-start">
          {/* Blacked-out silhouette */}
          <div className="bg-slate-900 rounded-2xl border-4 border-black shadow-[5px_5px_0_rgba(0,0,0,0.45)] p-6 flex flex-col items-center justify-center min-h-[280px]">
            <img src={getSpriteUrl(q.correct.id) || ''} alt="Who's that Pokémon?"
              className="w-48 h-48 object-contain"
              style={{ filter: fx.glow ? 'brightness(0.4) contrast(1.6)' : 'brightness(0) contrast(2)' }} />
            {fx.hint && <span className="mt-2 px-3 py-1 rounded-lg bg-cyan-600 text-white text-sm font-bold capitalize">💡 Type: {fx.hint}</span>}
            {fx.letter && <span className="mt-1 text-yellow-300 font-extrabold">🔤 Starts with "{q.correct.name[0]}"</span>}
          </div>
          {/* Options — never highlight the right one during play */}
          <div className="flex flex-col gap-3">
            {visibleOptions.map(opt => (
              <HubButton key={opt.id} onClick={() => answer(opt)}
                className={`w-full !py-3 text-base ${\n                  feedback?.correct && opt.id === q.correct.id ? 'bg-green-500 text-white'\n                  : 'bg-purple-700 text-white'}`}>
                {opt.name}
              </HubButton>
            ))}
            {fx.surge > 0 && <span className="text-yellow-300 text-sm font-bold">⚡ Point Surge active ({fx.surge} left)</span>}
            {fx.shield && <span className="text-emerald-300 text-sm font-bold">🛡️ Second Chance armed</span>}
          </div>
        </div>
      )}

      {/* Feedback banner — wrong answers never reveal the correct option */}
      {feedback && q && (
        <div className={`mt-4 px-6 py-2.5 rounded-xl font-extrabold text-white border-2 border-black shadow-[3px_3px_0_rgba(0,0,0,0.4)] ${\n          feedback.shielded ? 'bg-emerald-600' : feedback.correct ? 'bg-green-600' : 'bg-red-600'}`}>
          {feedback.shielded
            ? '🛡️ Forgiven — no time lost!'
            : feedback.correct
              ? `✔ ${q.correct.name}! +${feedback.gained} points${feedback.doubled ? ' 💰' : ''}${feedback.ball ? ' • 🎯 +1 Pokéball!' : ''}${feedback.speedDrop ? ` • ⏱ clock down to ${feedback.speedDrop}s!` : ''}`
              : `✘ Wrong! −${WRONG_PENALTY}s`}
        </div>
      )}
      {helperMsg && !feedback && (
        <div className="mt-3 px-5 py-2 rounded-xl bg-cyan-600 text-white font-extrabold border-2 border-black">{helperMsg}</div>
      )}

      {/* Game over — now the answer may be revealed */}
      {over && (
        <div className="fixed inset-0 grid place-items-center bg-black/70 z-50 pointer-events-auto">
          <div className="bg-slate-900 rounded-2xl border-4 border-black shadow-[6px_6px_0_rgba(0,0,0,0.5)] p-8 text-center max-w-xs w-full mx-4">
            <div className="text-5xl mb-2">⚡</div>
            <h2 className="text-2xl font-extrabold text-yellow-300">Time's Up!</h2>
            {q && <p className="text-slate-300 text-sm mt-1">The answer was {q.correct.name}</p>}
            <p className="text-white font-bold mt-3">Score: {score}</p>
            <p className="text-purple-300 text-sm">🧠 High score: {Math.max(profile.quizHigh || 0, score)}</p>
            <p className="text-cyan-300 text-sm">✔ {correctTotal} correct • 🔥 best streak {Math.max(streak, profile.quizBestStreak || 0)}</p>
            <div className="mt-5">
              <HubButton onClick={startGame} className="w-full bg-yellow-400 text-slate-900">▶ Play Again</HubButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
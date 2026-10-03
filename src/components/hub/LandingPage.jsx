import { useMemo } from 'react';
import { POKEMON_SPECIES, JASYTHERION, getSpriteUrl } from '@/game/config';
import * as audio from '@/game/audio';

// ─── Landing page — a vibrant wall of Pokémon behind the glowing gateway ───
export function LandingPage({ onEnter }) {
  const sprites = useMemo(() => {
    const pool = POKEMON_SPECIES.filter(s => !s.legendary);
    return Array.from({ length: 63 }, () => pool[Math.floor(Math.random() * pool.length)]);
  }, []);

  return (
    <div className="relative h-full w-full overflow-y-auto bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-950">
      {/* High-density Pokémon artwork backdrop */}
      <div className="absolute inset-0 grid grid-cols-7 sm:grid-cols-9 gap-2 p-3 opacity-80 pointer-events-none">
        {sprites.map((s, i) => (
          <div key={i} className="flex items-center justify-center">
            <img src={getSpriteUrl(s.id) || ''} alt=""
              className="w-14 h-14 sm:w-20 sm:h-20 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.55)]"
              style={{ animation: `poke-float ${3.5 + (i % 5)}s ease-in-out ${i \* 0.14}s infinite alternate` }} />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/70 via-purple-950/55 to-slate-950/90 pointer-events-none" />

      <div className="relative min-h-full flex flex-col items-center justify-center px-4 py-10 text-center">
        <h1 className="text-4xl sm:text-6xl font-extrabold text-yellow-300 drop-shadow-[4px_4px_0_rgba(0,0,0,0.7)] tracking-wide">
          ✨ Pokémon Explorer ✨
        </h1>
        <p className="text-purple-200 mt-3 text-lg font-bold">Catch them all across three epic adventures!</p>

        {/* Glowing Jasytherion gateway — the entrance to the whole game */}
        <button onClick={() => { audio.sfx.click(); onEnter(); }} title="Enter the Pokémon Game"
          className="group relative mt-10 rounded-3xl border-4 border-amber-400/80 bg-slate-900/60 p-3
            hover:border-amber-200 hover:scale-110 transition-all duration-200 cursor-pointer"
          style={{ boxShadow: '0 0 60px rgba(251,191,36,0.55), 0 0 130px rgba(168,85,247,0.35)' }}>
          <img src={JASYTHERION.image} alt="Jasytherion Aetherium"
            className="w-56 h-56 sm:w-72 sm:h-72 object-contain rounded-2xl group-hover:rotate-3 transition-transform duration-200" />
          <span className="absolute inset-0 rounded-3xl animate-pulse pointer-events-none"
            style={{ boxShadow: 'inset 0 0 45px rgba(251,191,36,0.35)' }} />
        </button>
        <p className="mt-4 text-amber-200 font-extrabold text-lg">
          Jasytherion Aetherium <span className="text-slate-400 font-normal">#2014</span>
        </p>
        <p className="text-slate-300 text-sm animate-pulse mt-1">👆 Click the legendary to begin your adventure</p>

        <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs sm:text-sm text-white font-bold">
          <span className="bg-slate-900/70 rounded-full px-3 py-1.5 border-2 border-emerald-500">🌲 Catching Arena</span>
          <span className="bg-slate-900/70 rounded-full px-3 py-1.5 border-2 border-sky-500">🥎 Pokéball Toss</span>
          <span className="bg-slate-900/70 rounded-full px-3 py-1.5 border-2 border-amber-500">⚡ Speed Quiz</span>
        </div>
      </div>
    </div>
  );
}
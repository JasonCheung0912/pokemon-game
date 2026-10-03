import { useState } from 'react';
import { STARTERS, POKEMON_SPECIES, MODES, MODE_ORDER, MODE_UNLOCK, isModeUnlocked, JASYTHERION } from '@/game/config';
import { base44 } from '@/api/base44Client';
import { PokemonImage } from '@/components/game/PokemonImage';

function reqText(key) {
  const r = MODE_UNLOCK[key];
  if (!r) return '';
  const parts = [`${r.pokemon} Pokémon`];
  if (r.stage2) parts.push(`${r.stage2} Stage 2`);
  if (r.stage1) parts.push(`${r.stage1} Stage 1`);
  if (r.shinyPct) parts.push(`${r.shinyPct}% Shiny`);
  return parts.join(' • ');
}

// Start flow: Welcome (Jasytherion Aetherium) → Starter choice (new players only) → Level select.
// Returning players skip the starter page — the welcome page goes straight to levels.
export function StartScreen({ onStart, onEnterWorld, playerData, isAdmin }) {
  const savedMode = playerData?.difficulty;
  const [mode, setMode] = useState(MODES[savedMode] ? savedMode : 'noob');
  const [page, setPage] = useState('welcome');
  const [starterId, setStarterId] = useState(null);
  const [username, setUsername] = useState('');
  const returning = !!playerData?.has_started;
  const visibleModes = isAdmin ? MODE_ORDER : MODE_ORDER.filter(m => m !== 'admin');
  // The game creator can enter every mode, including admin
  const isUnlocked = (key) => isAdmin ? true : isModeUnlocked(key, playerData, isAdmin);
  const chosenStarter = POKEMON_SPECIES.find(s => s.id === starterId);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-sky-700 via-emerald-800 to-slate-900 pointer-events-auto overflow-y-auto py-8">

      {/* ─── Welcome page (always first) ─── */}
      {page === 'welcome' && (
        <div className="flex flex-col items-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-wide text-center px-4">
            Welcome to Pokémon Catching Arena!
          </h1>
          <p className="text-slate-300 mb-6 text-center px-4">
            {returning ? 'Welcome back, Trainer!' : 'Sign up with your email, then pick your starter!'}
          </p>
          <button onClick={async () => {
            // Every player signs up / logs in with their email first
            try {
              const authed = await base44.auth.isAuthenticated();
              if (!authed) { await base44.auth.redirectToLogin(); return; }
            } catch (e) { await base44.auth.redirectToLogin(); return; }
            setPage(returning ? 'modes' : 'username');
          }}
            className="rounded-2xl border-4 border-amber-400/70 bg-slate-900/70 p-2 hover:border-amber-300 hover:scale-105 transition-all shadow-[0_0_50px_rgba(251,191,36,0.4)]"
            title="Click the picture to begin">
            <img src={JASYTHERION.image} alt="Jasytherion Aetherium"
              className="w-64 h-64 sm:w-80 sm:h-80 object-contain rounded-xl" />
          </button>
          <div className="mt-4 text-center">
            <p className="text-amber-300 font-bold text-lg">
              Jasytherion Aetherium <span className="text-slate-400 font-normal">#2014</span>
            </p>
            <p className="text-slate-400 text-sm">The Legendary God of the Elements</p>
            <p className="text-slate-200 text-sm mt-2 animate-pulse">
              👆 Click the picture to {returning ? 'continue' : 'begin'}
            </p>
          </div>
        </div>
      )}

      {/* ─── Username (new players only) ─── */}
      {page === 'username' && (
        <div className="flex flex-col items-center w-full px-4">
          <p className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center">Choose your Trainer name!</p>
          <p className="text-slate-300 mb-6 text-center text-sm">This is the name other players will see in the Duel Arena.</p>
          <input value={username} onChange={(e) => setUsername(e.target.value.slice(0, 16))}
            placeholder="Type your username..."
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && username.trim()) setPage('starter'); }}
            className="w-full max-w-xs px-4 py-3 rounded-xl bg-slate-800/80 border-2 border-slate-600 focus:border-yellow-400 text-white text-lg font-bold text-center outline-none mb-4" />
          <button onClick={() => { if (username.trim()) setPage('starter'); }}
            disabled={!username.trim()}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            Continue →
          </button>
          <button onClick={() => setPage('welcome')} className="text-slate-400 text-sm mt-4 hover:text-white">← Back</button>
        </div>
      )}

      {/* ─── Starter choice (new players only) ─── */}
      {page === 'starter' && (
        <div className="flex flex-col items-center">
          <p className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center">Choose your first Pokémon!</p>
          <button onClick={() => setPage('username')} className="text-slate-400 text-sm mb-4 hover:text-white">← Back</button>
          <div className="flex flex-wrap gap-4 justify-center px-4">
            {STARTERS.map(id => {
              const species = POKEMON_SPECIES.find(s => s.id === id);
              return (
                <button key={id} onClick={() => { setStarterId(id); setPage('modes'); }}
                  className="flex flex-col items-center gap-3 p-6 bg-slate-800/80 rounded-xl border-2 border-slate-600 hover:border-yellow-400 hover:scale-105 transition-all">
                  <div className="w-24 h-24 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: species.color + '20', border: `3px solid ${species.color}` }}>
                    <PokemonImage species={id} alt={species.name} className="w-20 h-20 object-contain" />
                  </div>
                  <span className="text-white font-bold text-lg">{species.name}</span>
                  <div className="text-center">
                    <span className="text-slate-400 text-sm capitalize">{species.type} Type</span>
                    <div className="text-xs text-orange-400">⚔️ {species.baseAttack} ATK</div>
                    <div className="text-xs text-green-400">❤️ {species.baseHp} HP</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Level / difficulty page ─── */}
      {page === 'modes' && (
        <div className="flex flex-col items-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-wide text-center px-4">Pokémon Catching Arena</h1>
          <p className="text-slate-300 mb-1 text-center">Select your difficulty mode!</p>
          {!returning && (
            <p className="text-sm mb-1 text-center">
              <span className="text-slate-400">Your starter: </span>
              <span className="text-yellow-400 font-bold">{chosenStarter?.name}</span>
              <button onClick={() => setPage('starter')} className="ml-3 text-slate-400 text-xs hover:text-white underline">change</button>
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 justify-center px-4 mb-6 mt-2 max-w-3xl">
            {visibleModes.map(key => {
              const m = MODES[key];
              const unlocked = isUnlocked(key);
              const selected = mode === key && unlocked;
              return (
                <button key={key} disabled={!unlocked} onClick={() => setMode(key)}
                  className={`flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all text-center ${\n                    selected ? 'border-white scale-105' : unlocked ? 'border-slate-600 hover:border-slate-400' : 'border-slate-700 opacity-60 cursor-not-allowed'\n                  }`}
                  style={{ backgroundColor: selected ? m.color + '30' : 'rgba(15,23,42,0.8)' }}>
                  <span className="text-xl font-bold text-white">{unlocked ? '' : '🔒 '}{m.name}{key === 'admin' ? ' 👑' : ''}</span>
                  <span className="text-slate-300 text-xs">{m.desc}</span>
                  <span className="text-xs" style={{ color: m.color }}>{m.statDesc}</span>
                  {!unlocked && <span className="text-red-400 text-xs mt-1">Requires: {reqText(key)}</span>}
                </button>
              );
            })}
          </div>
          <button onClick={() => (returning ? onEnterWorld(mode) : onStart(starterId, mode, username.trim()))}
            disabled={!returning && !starterId}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            Enter World →
          </button>
          <div className="mt-8 text-slate-400 text-sm max-w-md text-center px-4">
            <p>WASD move • Space jump • Mouse look • Click to attack in battle</p>
            <p>E Team • P Shop • M Switch Mode • Esc Pause</p>
            <p className="mt-1">Explore biomes, find treasure chests & evolution stones!</p>
          </div>
        </div>
      )}
    </div>
  );
}
import { EXP_BADGES } from '@/game/config';
import { PokemonImage } from '@/components/game/PokemonImage';

export function HUD({ playerData, dayNight, onOpenShop, onOpenInventory, onPause, pointerLocked, onClickToResume, saveStatus, isAdmin, onOpenAdmin, onOpenArena, onSwitchMode, onOpenHub, soundOn, onToggleSound, onOpenFriends }) {
  const activePokemon = playerData?.team?.[playerData?.active_index ?? 0];
  const badges = playerData?.badges ?? [];
  const hpRatio = activePokemon ? activePokemon.hp / activePokemon.maxHp : 0;

  return (
    <>
      <div className="absolute top-3 left-3 pointer-events-none">
        {activePokemon && (
          <div className="bg-slate-900/80 rounded-lg p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center" style={{ backgroundColor: activePokemon.color + '20' }}>
                <PokemonImage species={activePokemon.species} alt={activePokemon.name}
                  className="w-12 h-12 object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{activePokemon.name}</span>
                  <span className="text-xs text-orange-400">⚔️{activePokemon.attack}</span>
                  {activePokemon.fainted && <span className="text-red-400 text-xs">FAINTED</span>}
                </div>
                <div className="mt-1 w-36 h-2.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(0, hpRatio * 100)}%`,
                      backgroundColor: activePokemon.fainted ? '#666' : hpRatio > 0.5 ? '#4ade80' : hpRatio > 0.25 ? '#fbbf24' : '#ef4444',
                    }}
                  />
                </div>
                <span className="text-xs text-slate-300">{Math.max(0, activePokemon.hp)} / {activePokemon.maxHp} HP</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="absolute top-3 right-3 flex items-start gap-2">
        <button onClick={onToggleSound} title={soundOn ? 'Mute sound' : 'Unmute sound'}
          className="pointer-events-auto w-9 h-9 rounded-lg bg-slate-900/80 backdrop-blur-sm text-lg hover:bg-slate-800 transition-colors shrink-0">
          {soundOn ? '🔊' : '🔇'}
        </button>
        <div className="bg-slate-900/80 rounded-lg p-3 backdrop-blur-sm text-right pointer-events-none">
          <div className="text-yellow-400 font-bold text-lg">💰 ${playerData?.money ?? 0}</div>
          <div className="text-blue-400 text-sm">⭐ {playerData?.exp ?? 0} EXP</div>
          {playerData?.username && <div className="text-purple-300 text-sm font-bold">🎮 {playerData.username}</div>}
          <div className="text-rose-300 text-sm">🔥 Duel streak: {(playerData?.duel_streak ?? 0) >= 100 ? '∞' : (playerData?.duel_streak ?? 0)}</div>
          {(playerData?.duel_titles?.length ?? 0) > 0 && <div className="text-amber-300 text-sm">👑 {playerData.duel_titles.join(' • ')}</div>}
          <div className="text-slate-300 text-sm mt-1">
            {dayNight.phase === 'day' ? '☀️ Day' : dayNight.phase === 'afternoon' ? '🌇 Afternoon' : '🌙 Night'} • {Math.floor(dayNight.remaining / 60)}:{String(dayNight.remaining % 60).padStart(2, '0')}
          </div>
          {saveStatus === 'saving' && <div className="text-yellow-400 text-xs mt-1">💾 Saving...</div>}
          {saveStatus === 'saved' && <div className="text-green-400 text-xs mt-1">✅ Saved</div>}
          {badges.length > 0 && (
            <div className="text-sm mt-1">
              {badges.map(b => EXP_BADGES.find(eb => eb.name === b)?.icon).join(' ')}
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 pointer-events-auto">
        <button onClick={onOpenShop}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg transition-colors">
          🛒 Shop
        </button>
        <button onClick={onOpenInventory}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg transition-colors">
          🎒 Team
        </button>
        <button onClick={onPause}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold shadow-lg transition-colors">
          ⏸️ Pause
        </button>
        <button onClick={onOpenArena}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold shadow-lg transition-colors">
          🏟️ Arena{playerData?.duel_locked ? ' 🔒' : ''}
        </button>
        <button onClick={onOpenFriends}
          className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg font-bold shadow-lg transition-colors">
          👥 Friends
        </button>
        <button onClick={onSwitchMode}
          className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg font-bold shadow-lg transition-colors">
          🔄 Switch Mode
        </button>
        <button onClick={onOpenHub}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold shadow-lg transition-colors">
          🏠 Hub
        </button>
        {isAdmin && (
          <button onClick={onOpenAdmin}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-bold shadow-lg transition-colors">
            👑 Admin
          </button>
        )}
      </div>

      {!pointerLocked && (
        <div onClick={onClickToResume}
          className="absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer pointer-events-auto">
          <div className="text-white text-xl font-bold animate-pulse">Click to resume exploring</div>
        </div>
      )}
    </>
  );
}
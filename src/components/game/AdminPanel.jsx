import { ADMIN_BUILD_OBJECTS, POKEBALLS, BALL_ORDER } from '@/game/config';
import { AdminPlayers } from '@/components/game/AdminPlayers';

export function AdminPanel({ adminState, onToggle, onSelectBuildObject, onSpawnPokemon, onHealTeam, onAddMoney, onAddExp, onAddStone, onAddPokemon, onBoostHp, onBoostAtk, onGiveBall, onGiveAll, onClearObjects, onClose, players, onGivePlayerMoney, onGivePlayerPokemon, onDuelPlayer, onBanPlayer }) {
  const toggleBtn = (active) =>
    `px-3 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 ${\n      active ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'\n    }`;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 pointer-events-auto p-4">
      <div className="bg-slate-800 rounded-xl p-6 max-w-xl w-full max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-2xl font-bold text-yellow-400">👑 Admin Panel</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>
        <p className="text-slate-400 text-sm mb-4">Game Creator only — other players never see these powers.</p>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <button onClick={() => onToggle('flying')} className={toggleBtn(adminState.flying)}>
            🕊️ Fly {adminState.flying ? '• ON' : '• OFF'}
          </button>
          <button onClick={() => onToggle('speedBoost')} className={toggleBtn(adminState.speedBoost)}>
            ⚡ Super Speed (5×) {adminState.speedBoost ? '• ON' : '• OFF'}
          </button>
          <button onClick={() => onToggle('superJump')} className={toggleBtn(adminState.superJump)}>
            🦘 Super Jump (5×) {adminState.superJump ? '• ON' : '• OFF'}
          </button>
          <button onClick={() => onToggle('buildMode')} className={toggleBtn(adminState.buildMode)}>
            🏗️ Build Mode {adminState.buildMode ? '• ON' : '• OFF'}
          </button>
          <button onClick={() => onToggle('damageDodge')} className={toggleBtn(adminState.damageDodge)}>
            🛡️ 50% Damage Dodge {adminState.damageDodge ? '• ON' : '• OFF'}
          </button>
        </div>

        {adminState.buildMode && (
          <div className="bg-slate-700/50 rounded-lg p-3 mb-5">
            <h3 className="text-white font-bold mb-1">Pick an object</h3>
            <p className="text-slate-400 text-xs mb-2">Close this panel, then click in the world to place it in front of you.</p>
            <div className="grid grid-cols-4 gap-2">
              {ADMIN_BUILD_OBJECTS.map(o => (
                <button key={o.type} onClick={() => onSelectBuildObject(o.type)}
                  className={`px-2 py-2 rounded-lg text-sm font-bold transition-all ${\n                    adminState.buildObjectType === o.type ? 'bg-yellow-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'\n                  }`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button onClick={onSpawnPokemon} className="px-3 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95">
            ✨ Spawn Pokémon Nearby
          </button>
          <button onClick={onAddPokemon} className="px-3 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95">
            🎁 Free Random Pokémon
          </button>
          <button onClick={onGiveAll} className="px-3 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 col-span-2">
            🌈 Give ALL 1025 Pokémon + Jasytherion
          </button>
          <button onClick={onHealTeam} className="px-3 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95">
            💚 Heal Team
          </button>
          <button onClick={onAddStone} className="px-3 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95">
            💎 Random Evolution Stone
          </button>
          <button onClick={onAddMoney} className="px-3 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95">
            💰 +$10,000
          </button>
          <button onClick={onAddExp} className="px-3 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95">
            ⭐ +1,000 EXP
          </button>
          <button onClick={onBoostHp} className="px-3 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95">
            ❤️ +10 HP (Active)
          </button>
          <button onClick={onBoostAtk} className="px-3 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95">
            ⚔️ +10 ATK (Active)
          </button>
          <div className="col-span-2 bg-slate-700/50 rounded-lg p-3">
            <h3 className="text-white font-bold mb-2">Get Pokéballs</h3>
            <div className="grid grid-cols-5 gap-2">
              {BALL_ORDER.map(b => (
                <button key={b} onClick={() => onGiveBall(b)}
                  className="px-1 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-xs font-bold transition-all active:scale-95">
                  <span className="block text-lg mb-0.5">{POKEBALLS[b].icon}</span>{POKEBALLS[b].name}
                </button>
              ))}
            </div>
          </div>
          <button onClick={onClearObjects} className="px-3 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 col-span-2">
            🧹 Clear Built Objects
          </button>
        </div>
        <AdminPlayers players={players} onGiveMoney={onGivePlayerMoney} onGivePokemon={onGivePlayerPokemon}\n          onDuel={onDuelPlayer} onBan={onBanPlayer} />
      </div>
    </div>
  );
}
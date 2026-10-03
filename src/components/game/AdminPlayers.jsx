export function AdminPlayers({ players, onGiveMoney, onGivePokemon, onDuel, onBan }) {
  return (
    <div className="bg-slate-700/50 rounded-lg p-3 mt-5">
      <h3 className="text-white font-bold mb-1">👥 Players ({players.length})</h3>
      <p className="text-slate-400 text-xs mb-2">Give gifts, request a duel, or ban a player.</p>
      {players.length === 0 ? (
        <p className="text-slate-400 text-sm py-2">No other players yet.</p>
      ) : (
        <div className="max-h-48 overflow-y-auto flex flex-col gap-2">
          {players.map(p => (
            <div key={p.id} className="flex items-center gap-2 bg-slate-800/60 rounded-lg p-2">
              <span className="text-white text-sm font-bold flex-1 truncate">
                {p.username || 'Trainer'}
                {p.banned && <span className="text-red-400 text-xs ml-1">(banned)</span>}
              </span>
              <span className="text-rose-300 text-xs shrink-0" title="Duel streak">🔥{p.duel_streak || 0}</span>
              <button onClick={() => onGiveMoney(p)} title="Give $10,000"
                className="px-2 py-1 bg-yellow-600 hover:bg-yellow-500 rounded text-xs font-bold text-white transition-colors">💰</button>
              <button onClick={() => onGivePokemon(p)} title="Give a random Pokémon"
                className="px-2 py-1 bg-fuchsia-600 hover:bg-fuchsia-500 rounded text-xs font-bold text-white transition-colors">🎁</button>
              <button onClick={() => onDuel(p)} title="Request a duel"
                className="px-2 py-1 bg-rose-600 hover:bg-rose-500 rounded text-xs font-bold text-white transition-colors">⚔️</button>
              <button onClick={() => onBan(p)} title={p.banned ? 'Unban' : 'Ban'}
                className="px-2 py-1 bg-red-800 hover:bg-red-700 rounded text-xs font-bold text-white transition-colors">🚫</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
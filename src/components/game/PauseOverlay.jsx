export function PauseOverlay({ playerData, onResume, saveStatus }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 pointer-events-auto">
      <div className="bg-slate-800 rounded-xl p-8 max-w-md w-full mx-4 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">⏸️ Paused</h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-yellow-400 font-bold text-xl">💰 ${playerData?.money ?? 0}</div>
            <div className="text-slate-400 text-xs">Money</div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-blue-400 font-bold text-xl">⭐ {playerData?.exp ?? 0}</div>
            <div className="text-slate-400 text-xs">EXP</div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-white font-bold text-xl">{playerData?.team?.length ?? 0}</div>
            <div className="text-slate-400 text-xs">Pokémon</div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-purple-400 font-bold text-xl">{playerData?.stones?.length ?? 0}</div>
            <div className="text-slate-400 text-xs">Stones</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-white font-bold text-lg capitalize">{playerData?.difficulty || 'easy'}</div>
            <div className="text-slate-400 text-xs">Difficulty</div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-white font-bold text-lg">{(playerData?.items || []).length}</div>
            <div className="text-slate-400 text-xs">Items</div>
          </div>
        </div>
        {saveStatus === 'saving' && <div className="text-yellow-400 text-sm mb-4">💾 Saving...</div>}
        {saveStatus === 'saved' && <div className="text-green-400 text-sm mb-4">✅ Game saved</div>}
        {saveStatus === 'error' && <div className="text-red-400 text-sm mb-4">⚠️ Save failed</div>}
        <button onClick={onResume}
          className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition-all">
          ▶️ Resume Exploring
        </button>
      </div>
    </div>
  );
}
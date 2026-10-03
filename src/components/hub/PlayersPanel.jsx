import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { PokemonImage } from '@/components/game/PokemonImage';

const btn = 'px-2 py-1 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-40';

/**
 * Creator-only player manager (both owner accounts).
 * Lists every player across all games and can give or take
 * money, arcade coins, Pokéballs and Pokémon — plus ban/unban.
 */
export function PlayersPanel({ onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [players, arcades] = await Promise.all([
        base44.entities.PlayerData.list('-created_date', 100),
        base44.entities.ArcadeProfile.list('-updated_date', 100).catch(() => []),
      ]);
      const arcadeByEmail = {};
      (arcades || []).forEach(a => { if (a.display_name) arcadeByEmail[a.display_name.toLowerCase()] = a; });
      setRows(players.map(p => ({ ...p, arcade: arcadeByEmail[(p.username || '').toLowerCase()] || null })));
    } catch (e) { console.error('PlayersPanel load failed', e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const patchPlayer = async (id, data, msg) => {
    try {
      await base44.entities.PlayerData.update(id, data);
      setRows(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    } catch (e) { console.error(e); }
  };
  const patchArcade = async (row, data) => {
    const a = row.arcade;
    if (!a) return;
    try {
      await base44.entities.ArcadeProfile.update(a.id, { profile: { ...(a.profile || {}), ...data } });
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, arcade: { ...a, profile: { ...(a.profile || {}), ...data } } } : r));
    } catch (e) { console.error(e); }
  };

  const shown = rows.filter(r => !(search.trim()) ||
    (r.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.arcade?.display_name || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 pointer-events-auto">
      <div className="bg-slate-900 rounded-2xl border-4 border-black shadow-[6px_6px_0_rgba(0,0,0,0.5)] w-full max-w-4xl max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b-4 border-black">
          <h2 className="text-xl font-extrabold text-yellow-300">👥 View Players — all games</h2>
          <div className="flex items-center gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search players…"
              className="px-3 py-1.5 rounded-lg bg-slate-800 border-2 border-slate-600 text-white text-sm outline-none focus:border-yellow-400" />
            <button onClick={load} className={`${btn} bg-slate-700 text-white`}>🔄</button>
            <button onClick={onClose} className={`${btn} bg-red-600 text-white`}>✕ Close</button>
          </div>
        </div>
        <div className="overflow-y-auto p-3 space-y-2">
          {loading && <p className="text-slate-400 text-center py-6">Loading players…</p>}
          {!loading && shown.length === 0 && <p className="text-slate-400 text-center py-6">No players found.</p>}
          {shown.map(r => {
            const prof = r.arcade?.profile || {};
            const arcId = r.arcade?.id;
            return (
              <div key={r.id} className="bg-slate-800/80 rounded-xl p-3 border-2 border-slate-700">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="text-white font-bold">🎮 {r.username || 'Unnamed'}</span>
                  <span className="text-slate-400 text-xs">{r.arcade?.display_name || r.id}</span>
                  {r.banned && <span className="text-red-400 font-bold text-xs">🚫 BANNED</span>}
                  <span className="text-slate-300">💵 ${(r.money || 0).toLocaleString()}</span>
                  <span className="text-blue-300">⭐ {r.exp || 0}</span>
                  <span className="text-emerald-300">🐾 {(r.team || []).length} Pokémon</span>
                  <span className="text-yellow-300">🪙 {prof.coins ?? 0} coins</span>
                  <span className="text-rose-300">🔴 {prof.balls ?? 0} balls</span>
                  <span className="text-purple-300">🎯 {prof.arenaCatches ?? 0} arena</span>
                  <span className="text-orange-300">🥎 {prof.tossCatches ?? 0} toss</span>
                  <span className="text-amber-300">🧠 {prof.quizHigh ?? 0} quiz</span>
                  <span className="text-teal-300">🧗 floor {prof.obbyHigh ?? 0}</span>
                  <span className="text-red-300">🥷 {prof.stealSteals ?? 0} steals</span>
                  <span className="text-lime-300">🛡️ wave {prof.laneBestWave ?? 0}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <button onClick={() => patchPlayer(r.id, { money: (r.money || 0) + 10000 })} className={`${btn} bg-green-600 text-white`}>💵 +$10k</button>
                  <button onClick={() => patchPlayer(r.id, { money: Math.max(0, (r.money || 0) - 10000) })} className={`${btn} bg-red-700 text-white`}>💵 −$10k</button>
                  <button disabled={!arcId} onClick={() => patchArcade(r, { coins: (prof.coins || 0) + 500 })} className={`${btn} bg-amber-500 text-slate-900`}>🪙 +500</button>
                  <button disabled={!arcId} onClick={() => patchArcade(r, { coins: Math.max(0, (prof.coins || 0) - 500) })} className={`${btn} bg-red-700 text-white`}>🪙 −500</button>
                  <button disabled={!arcId} onClick={() => patchArcade(r, { balls: (prof.balls || 0) + 10 })} className={`${btn} bg-rose-600 text-white`}>🔴 +10 balls</button>
                  <button disabled={!arcId} onClick={() => patchArcade(r, { balls: Math.max(0, (prof.balls || 0) - 10) })} className={`${btn} bg-red-700 text-white`}>🔴 −10 balls</button>
                  <button onClick={() => {
                    const species = (r.team || [])[Math.floor(Math.random() * (r.team || []).length)];
                    if (!species) return;
                    patchPlayer(r.id, { team: (r.team || []).filter(p => p.uid !== species.uid) });
                  }} className={`${btn} bg-purple-600 text-white`}>🐾 − Pokémon</button>
                  <button onClick={() => patchPlayer(r.id, { banned: !r.banned })} className={`${btn} ${r.banned ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                    {r.banned ? '✅ Unban' : '🚫 Ban'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-slate-500 text-xs text-center py-2 border-t-2 border-black">
          Creator-only tools — you can give or take items, coins and Pokémon from any player.
        </p>
      </div>
    </div>
  );
}
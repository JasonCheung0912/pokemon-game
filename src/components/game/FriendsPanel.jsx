import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { PokemonImage } from '@/components/game/PokemonImage';

// ─── Friend request area (Pokémon Catching Arena) ───
// A friendship only forms when BOTH players press "Add Friend" on each other.
// Friends can view (never edit) each other's profile, battle one-on-one, and
// team up (up to 3 friends) in team battles. Only the two creator accounts can
// edit anyone's account — those controls live in the View Players panel.

const TABS = [
  { id: 'find', label: '🔎 Find Players' },
  { id: 'requests', label: '📨 Requests' },
  { id: 'friends', label: '🤝 My Friends' },
];

export function FriendsPanel({ playerData, players, onClose, onDuelFriend }) {
  const [tab, setTab] = useState('find');
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [msg, setMsg] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const myId = playerData?.id;
  const myName = playerData?.username || 'Trainer';
  const friendIds = new Set((playerData?.friends || []).map(f => f.id));

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(null), 2500); };

  const loadRequests = useCallback(async () => {
    if (!myId) return;
    try {
      const [inc, out] = await Promise.all([
        base44.entities.FriendRequest.filter({ to_id: myId, status: 'pending' }),
        base44.entities.FriendRequest.filter({ from_id: myId, status: 'pending' }),
      ]);
      setIncoming(inc || []);
      setOutgoing(out || []);
    } catch (e) { /* ignore */ }
  }, [myId]);

  useEffect(() => { loadRequests(); }, [loadRequests, tab]);

  const persistFriends = async (recordId, newFriends) => {
    await base44.entities.PlayerData.update(recordId, { friends: newFriends });
  };

  const becomeFriends = async (otherRecord, reqId) => {
    if (reqId) await base44.entities.FriendRequest.update(reqId, { status: 'accepted' });
    const mine = [...(playerData.friends || []).map(f => ({ id: f.id, name: f.name }))];
    if (!mine.some(f => f.id === otherRecord.id)) mine.push({ id: otherRecord.id, name: otherRecord.username || 'Trainer' });
    await persistFriends(myId, mine);
    const theirs = ((otherRecord.friends || []) || []).map(f => ({ id: f.id, name: f.name }));
    if (!theirs.some(f => f.id === myId)) theirs.push({ id: myId, name: myName });
    await persistFriends(otherRecord.id, theirs);
    flash(`🤝 You and ${otherRecord.username || 'Trainer'} are now friends!`);
  };

  const addFriend = async (other) => {
    // Mutual rule: if THEY already asked me, their "add" is waiting — accept it now
    const theirs = incoming.find(r => r.from_id === other.id);
    if (theirs) {
      await becomeFriends(other, theirs.id);
      loadRequests();
      return;
    }
    if (outgoing.some(r => r.to_id === other.id)) { flash('Request already sent!'); return; }
    await base44.entities.FriendRequest.create({
      from_id: myId, from_name: myName, to_id: other.id, to_name: other.username || 'Trainer', status: 'pending',
    });
    flash(`📨 Friend request sent to ${other.username || 'Trainer'}!`);
    loadRequests();
  };

  const acceptRequest = async (req) => {
    const other = (players || []).find(p => p.id === req.from_id);
    if (!other) { flash('That player could not be found.'); return; }
    await becomeFriends(other, req.id);
    loadRequests();
  };

  const candidates = (players || []).filter(p => p.id !== myId && !friendIds.has(p.id) && !p.banned);
  const friendRecords = (playerData?.friends || []).map(f => (players || []).find(p => p.id === f.id)).filter(Boolean);

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center pointer-events-auto p-4 overflow-y-auto z-40">
      <div className="bg-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[88vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-2xl font-bold text-white">👥 Friends</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>
        <div className="flex gap-2 mb-4">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${
                tab === t.id ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
              {t.label}{t.id === 'requests' && incoming.length > 0 ? ` (${incoming.length})` : ''}
            </button>
          ))}
        </div>
        {msg && <div className="mb-3 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm">{msg}</div>}

        {/* Find players */}
        {tab === 'find' && (
          <div className="space-y-2">
            <p className="text-slate-400 text-xs mb-2">
              Friendship needs TWO clicks — you add them AND they add you. Until then it's just a pending request.
            </p>
            {candidates.length === 0 && <p className="text-slate-400">No other players yet — share the game!</p>}
            {candidates.map(p => {
              const pending = outgoing.some(r => r.to_id === p.id);
              return (
                <div key={p.id} className="flex items-center justify-between bg-slate-700/50 rounded-xl p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                      <PokemonImage species={p.team?.[0]?.species || 'pikachu'} alt="" className="w-8 h-8 object-contain" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-white font-bold text-sm truncate">{p.username || 'Unnamed Trainer'}</div>
                      <div className="text-slate-400 text-xs">
                        🐾 {(p.team || []).length} Pokémon • 💵 ${(p.money || 0).toLocaleString()} • 🔥 streak {p.duel_streak || 0}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => addFriend(p)} disabled={pending}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${pending ? 'bg-slate-600 text-slate-400' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
                    {pending ? '📨 Pending…' : '➕ Add Friend'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Requests */}
        {tab === 'requests' && (
          <div className="space-y-2">
            <p className="text-slate-400 text-xs mb-2">Incoming requests — press "Add Friend" to accept. You are also listed on their side until they accept.</p>
            {incoming.length === 0 && <p className="text-slate-400">No incoming friend requests.</p>}
            {incoming.map(r => (
              <div key={r.id} className="flex items-center justify-between bg-amber-900/30 border border-amber-600/40 rounded-xl p-3">
                <span className="text-white font-bold text-sm">📨 {r.from_name} wants to be friends</span>
                <button onClick={() => acceptRequest(r)} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">
                  ➕ Add Friend
                </button>
              </div>
            ))}
            {outgoing.map(r => (
              <div key={`o\_${r.id}`} className="flex items-center justify-between bg-slate-700/40 rounded-xl p-3">
                <span className="text-slate-300 text-sm">➡️ Waiting for {r.to_name} to add you back…</span>
                <button onClick={async () => { await base44.entities.FriendRequest.delete(r.id); loadRequests(); }}
                  className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-bold">✕ Cancel</button>
              </div>
            ))}
          </div>
        )}

        {/* My friends — view-only profiles */}
        {tab === 'friends' && (
          <div className="space-y-2">
            <p className="text-slate-400 text-xs mb-2">You can VIEW your friends' profiles (never edit). Battle them or team up with up to 3 in the Arena!</p>
            {friendRecords.length === 0 && <p className="text-slate-400">No friends yet — find players above!</p>}
            {friendRecords.map(f => (
              <div key={f.id} className="bg-slate-700/50 rounded-xl p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-white font-bold text-sm">🤝 {f.username || 'Unnamed Trainer'}</div>
                    <div className="text-slate-400 text-xs">
                      🐾 {(f.team || []).length} Pokémon • 💵 ${(f.money || 0).toLocaleString()} • ⭐ {f.exp || 0} EXP • 🔥 duel streak {f.duel_streak || 0}
                      {(f.duel_titles || []).length > 0 && <span className="text-amber-300"> • 👑 {f.duel_titles.join(', ')}</span>}
                    </div>
                  </div>
                  <button onClick={() => onDuelFriend?.(f)}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shrink-0">
                    ⚔️ Battle
                  </button>
                </div>
                <button onClick={() => setExpanded(e => e === f.id ? null : f.id)} className="text-cyan-300 text-xs mt-2 hover:underline">
                  {expanded === f.id ? '▲ Hide team (view only)' : '▼ View team (read-only)'}
                </button>
                {expanded === f.id && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(f.team || []).slice(0, 12).map(p => (
                      <div key={p.uid} className="w-16 text-center bg-slate-800 rounded-lg p-1" title={`${p.name} • ${p.maxHp} HP • ${p.attack} ATK`}>
                        <PokemonImage species={p.species} alt={p.name} className="w-12 h-12 object-contain mx-auto" />
                        <div className="text-[9px] text-slate-300 truncate">{p.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <p className="text-slate-500 text-xs pt-2">💡 For team battles (you + up to 3 friends), open the Arena → Duel Arena → Team Battle.</p>
          </div>
        )}
      </div>
    </div>
  );
}
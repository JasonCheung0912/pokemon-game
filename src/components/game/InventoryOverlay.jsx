import { useState } from 'react';
import { EVOLUTION_STONES, PARTY_SIZE } from '@/game/config';
import { sortTeam, canEvolveWith, getEvolution, evolveBestTeam } from '@/game/pokemonUtils';
import { TypeTag } from '@/components/game/TypeTag';
import { PokemonImage } from '@/components/game/PokemonImage';

const SORT_OPTIONS = [
  { value: 'alpha', label: 'A → Z' },
  { value: 'best', label: 'Best to Worst' },
  { value: 'worst', label: 'Worst to Best' },
  { value: 'type', label: 'Type' },
  { value: 'stage_desc', label: 'Stage 2 → Basic' },
  { value: 'stage_asc', label: 'Basic → Stage 2' },
  { value: 'atk_desc', label: 'Best ATK → Worst' },
  { value: 'atk_asc', label: 'Worst ATK → Best' },
  { value: 'hp_desc', label: 'Best HP → Worst' },
  { value: 'hp_asc', label: 'Worst HP → Best' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
];

const ITEM_META = {
  healing_potion: { label: 'Healing Potion', icon: '🧪', desc: 'Fully heals the active Pokémon' },
  hp_upgrade: { label: 'HP Upgrade', icon: '❤️', desc: '+5 Permanent HP to active Pokémon' },
  atk_upgrade: { label: 'Attack Upgrade', icon: '⚔️', desc: '+3 Permanent Attack to active Pokémon' },
  pokeball: { label: 'Pokéball', icon: '🔴', desc: 'Throw in battle to catch wild Pokémon' },
  great_ball: { label: 'Great Ball', icon: '🔵', desc: 'Throw in battle to catch wild Pokémon' },
  ultra_ball: { label: 'Ultra Ball', icon: '🟡', desc: 'Throw in battle to catch wild Pokémon' },
  master_ball: { label: 'Master Ball', icon: '🟣', desc: 'Throw in battle to catch wild Pokémon' },
  admin_ball: { label: 'Admin Ball', icon: '⚪', desc: 'Throw in battle — always catches!' },
  master_pokeball: { label: 'Master Ball', icon: '🟣', desc: 'Throw in battle to catch wild Pokémon' },
};

// Uniform Pokémon card — one grid look everywhere, smooth hover lift, styled type tag
function PokemonCard({ p, active, selected, onClick, children }) {
  return (
    <div onClick={onClick}
      className={`p-3 rounded-xl border-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-pointer flex flex-col gap-1 ${\n        selected ? 'border-yellow-400 bg-slate-700' : active ? 'border-blue-400 bg-slate-700/70' : 'border-slate-600 bg-slate-700/50'\n      } ${p.fainted ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2">
        <div className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center" style={{ backgroundColor: p.color + '20' }}>
          <PokemonImage species={p.species} alt={p.name} className="w-14 h-14 object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-white font-bold text-sm truncate">{p.shiny && '✨ '}{p.name}</div>
          <div className="mt-0.5"><TypeTag type={p.type} /></div>
          <div className="text-xs text-orange-400">⚔️ {p.attack} ATK</div>
          <div className="text-xs text-green-400">❤️ {Math.max(0, p.hp)}/{p.maxHp} HP</div>
        </div>
      </div>
      {p.fainted && <div className="text-red-400 text-xs">FAINTED</div>}
      {active && <div className="text-blue-400 text-xs">★ Equipped</div>}
      {children}
    </div>
  );
}

export function InventoryOverlay({ playerData, onUpgrade, onSetActive, onClose, items, onUseItem, onEvolveBest, onToggleParty }) {
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [selectedStone, setSelectedStone] = useState(null);
  const [sortMode, setSortMode] = useState('alpha');
  const [tab, setTab] = useState('party');
  const [confirmItem, setConfirmItem] = useState(null);

  const stones = playerData?.stones ?? [];
  const stoneCounts = stones.reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {});
  const uniqueStones = Object.keys(stoneCounts);
  const team = playerData?.team ?? [];
  const party = sortTeam(team.filter(p => p.inParty), sortMode);
  const box = sortTeam(team.filter(p => !p.inParty), sortMode);
  const canEvolveAny = evolveBestTeam(team, stones).evolved.length > 0;
  const itemCounts = (items || []).reduce((acc, i) => { acc[i] = (acc[i] || 0) + 1; return acc; }, {});
  const shown = tab === 'party' ? party : box;

  const selectedPoke = team.find(p => p.uid === selectedPokemon);
  const handleUpgrade = () => {
    if (selectedPokemon && selectedStone) {
      onUpgrade(selectedPokemon, selectedStone);
      setSelectedPokemon(null);
      setSelectedStone(null);
    }
  };

  const getEvolveInfo = () => {
    if (!selectedPoke || !selectedStone) return null;
    const canEvolve = canEvolveWith(selectedPoke, selectedStone);
    if (!canEvolve) return { text: `❌ ${selectedPoke.name} can't evolve with ${selectedStone} Stone!`, canDo: false };
    const e = getEvolution(selectedPoke, selectedStone);
    if (!e) return { text: `❌ ${selectedPoke.name} can't evolve with ${selectedStone} Stone!`, canDo: false };
    const dupe = team.some(q => q.uid !== selectedPoke.uid && q.species === e.id);
    if (dupe) return { text: `❌ ${e.name} is already on your team — evolution blocked!`, canDo: false };
    if (selectedStone === 'Shiny') return { text: `✨ Evolve ${selectedPoke.name} into Shiny ${e.name}!`, canDo: true };
    return { text: `✨ Evolve ${selectedPoke.name} into ${e.name}!`, canDo: true };
  };

  const upgradeInfo = getEvolveInfo();
  const teamIdx = (uid) => team.findIndex(tp => tp.uid === uid);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 pointer-events-auto p-4">
      <div className="bg-slate-800 rounded-xl p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">🎒 Team & Items</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab('party')}
            className={`px-4 py-2 rounded-lg font-bold ${tab === 'party' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
            ⭐ Party ({party.length}/{PARTY_SIZE})
          </button>
          <button onClick={() => setTab('box')}
            className={`px-4 py-2 rounded-lg font-bold ${tab === 'box' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
            📦 Storage Box ({box.length})
          </button>
          <button onClick={() => setTab('items')}
            className={`px-4 py-2 rounded-lg font-bold ${tab === 'items' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
            Items
          </button>
        </div>

        {tab !== 'items' ? (
          <>
            {/* Sort dropdown */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-slate-400 text-sm">Sort:</span>
              <select value={sortMode} onChange={(e) => setSortMode(e.target.value)}
                className="bg-slate-700 text-white rounded-lg px-2 py-1 text-sm border border-slate-600">
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <span className="text-slate-400 text-sm">({shown.length} Pokémon)</span>
            </div>

            <button onClick={onEvolveBest} disabled={!canEvolveAny}
              className={`w-full py-2.5 mb-4 rounded-lg font-bold transition-colors ${canEvolveAny ? 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>
              ✨ Evolve Best Pokémons {canEvolveAny ? '' : '— no evolutions possible'}
            </button>

            {shown.length === 0 ? (
              <p className="text-slate-400 text-sm mb-4">
                {tab === 'party' ? 'Your party is empty — add Pokémon from the Storage Box!' : 'The storage box is empty.'}
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {shown.map(p => {
                  const isActive = teamIdx(p.uid) === (playerData.active_index ?? 0);
                  return (
                    <PokemonCard key={p.uid} p={p} active={isActive}
                      selected={selectedPokemon === p.uid}
                      onClick={() => setSelectedPokemon(selectedPokemon === p.uid ? null : p.uid)}>
                      <div className="flex gap-1.5 mt-1" onClick={e => e.stopPropagation()}>
                        {!p.fainted && !isActive && (
                          <button onClick={() => onSetActive(teamIdx(p.uid))}
                            className="flex-1 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors">Equip</button>
                        )}
                        {p.inParty ? (
                          <button onClick={() => onToggleParty(p.uid)}
                            className="flex-1 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors">→ Box</button>
                        ) : (
                          <button onClick={() => onToggleParty(p.uid)}
                            className="flex-1 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors">→ Party</button>
                        )}
                      </div>
                    </PokemonCard>
                  );
                })}
              </div>
            )}

            {/* Evolution Stones */}
            <h3 className="text-white font-bold mb-2">Evolution Stones</h3>
            {uniqueStones.length === 0 ? (
              <p className="text-slate-400 text-sm">No stones yet. Explore the world to find rare glowing stones!</p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-4">
                {uniqueStones.map(type => {
                  const stone = EVOLUTION_STONES.find(s => s.type === type);
                  return (
                    <div key={type} onClick={() => setSelectedStone(selectedStone === type ? null : type)}
                      className={`px-3 py-2 rounded-lg cursor-pointer border-2 transition-all hover:-translate-y-0.5 hover:shadow-lg ${\n                        selectedStone === type ? 'border-yellow-400 bg-slate-700' : 'border-slate-600 bg-slate-700/50 hover:border-slate-400'\n                      }`} style={{ boxShadow: `inset 0 0 10px ${stone?.color}40` }}>
                      <span className="text-sm font-bold" style={{ color: stone?.color }}>{type}</span>
                      <span className="text-xs text-slate-400 ml-1">x{stoneCounts[type]}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {upgradeInfo && (
              <div className="bg-slate-700/50 rounded-lg p-3 mb-3">
                <p className="text-slate-300 text-sm text-center">{upgradeInfo.text}</p>
              </div>
            )}
            {selectedPokemon && selectedStone && upgradeInfo?.canDo && (
              <button onClick={handleUpgrade}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold transition-colors">
                ✨ Evolve
              </button>
            )}
          </>
        ) : (
          /* Items tab */
          <div>
            <h3 className="text-white font-bold mb-2">Consumable Items</h3>
            {Object.keys(itemCounts).length === 0 ? (
              <p className="text-slate-400 text-sm">No items yet. Buy some from the shop or find treasure chests!</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(itemCounts).map(([type, count]) => {
                  const meta = ITEM_META[type] || { label: type, icon: '📦' };
                  const upgradable = type === 'hp_upgrade' || type === 'atk_upgrade';
                  return (
                    <div key={type} className={`p-3 rounded-lg border-2 bg-slate-700/50 transition-all hover:shadow-lg ${confirmItem === type ? 'border-yellow-400' : 'border-slate-600'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{meta.icon}</span>
                        <div className="min-w-0">
                          <div className="text-white font-bold text-sm">{meta.label}</div>
                          <div className="text-xs text-slate-400">x{count}</div>
                          {meta.desc && <div className="text-xs text-slate-500">{meta.desc}</div>}
                        </div>
                        {type === 'healing_potion' && (
                          <button onClick={() => onUseItem(type)}
                            className="ml-auto px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold">Use</button>
                        )}
                        {upgradable && confirmItem !== type && (
                          <button onClick={() => setConfirmItem(type)}
                            className="ml-auto px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold">Upgrade</button>
                        )}
                      </div>
                      {upgradable && confirmItem === type && (
                        <div className="mt-2 text-center">
                          <p className="text-slate-200 text-xs font-bold mb-2">Upgrade active Pokémon with this item?</p>
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => { onUseItem(type); setConfirmItem(null); }}
                              className="px-4 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-bold">Yes</button>
                            <button onClick={() => setConfirmItem(null)}
                              className="px-4 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold">No</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
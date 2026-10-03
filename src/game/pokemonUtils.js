import { POKEMON_SPECIES, EVOLUTION_CHAINS, STONE_TYPE_MATCH, MODES, BIOMES, LEGENDARY_ZONE_MODES, getSpecies, getStageStats, JASYTHERION } from '@/game/config';

export function canEvolveWith(pokemon, stoneType) {
  if (stoneType === 'Shiny') return pokemon.species === 'eevee';
  const chain = EVOLUTION_CHAINS[pokemon.species];
  if (!chain) return false;
  if (typeof chain.evolvesTo === 'object') {
    return chain.evolvesTo[stoneType] !== undefined;
  }
  return chain.stoneType === stoneType;
}

export function isStoneCompatible(pokemon, stoneType) {
  if (stoneType === 'Shiny') return true;
  const match = STONE_TYPE_MATCH[pokemon.type];
  if (match === null) return true;
  if (Array.isArray(match)) return match.includes(stoneType);
  return match === stoneType;
}

export function getEvolution(pokemon, stoneType) {
  const chain = EVOLUTION_CHAINS[pokemon.species];
  if (!chain) return null;
  if (typeof chain.evolvesTo === 'object') {
    if (!stoneType || !chain.evolvesTo[stoneType]) return null;
    return getSpecies(chain.evolvesTo[stoneType]);
  }
  return getSpecies(chain.evolvesTo);
}

// Re-stat every team Pokémon to the stage rule (~200/300/400 HP by stage),
// keeping each one's current damage ratio. Applies to pre-existing Pokémon too.
export function normalizeTeamStats(team) {
  return (team || []).map(p => {
    const st = getStageStats(p.species);
    if (!st) return p;
    const ratio = p.maxHp > 0 ? Math.min(1, Math.max(0, p.hp / p.maxHp)) : 1;
    return { ...p, maxHp: st.hp, hp: Math.max(1, Math.round(st.hp * ratio)), attack: st.attack };
  });
}

export function mergeDuplicate(team, newPokemon) {
  const existing = team.find(p => p.species === newPokemon.species);
  if (existing) {
    return {
      isDuplicate: true,
      team: team.map(p => p.species === newPokemon.species
        ? { ...p, maxHp: p.maxHp + 5, hp: p.maxHp + 5, attack: p.attack + 5, fainted: false }
        : p),
    };
  }
  return { isDuplicate: false, team: [...team, newPokemon] };
}

export function sortTeam(team, sortBy) {
  const sorted = [...team];
  const stage = (p) => getSpecies(p.species)?.stage ?? 0;
  switch (sortBy) {
    case 'alpha': return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'best': return sorted.sort((a, b) => (b.maxHp + b.attack) - (a.maxHp + a.attack));
    case 'worst': return sorted.sort((a, b) => (a.maxHp + a.attack) - (b.maxHp + b.attack));
    case 'type': return sorted.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
    case 'stage_desc': return sorted.sort((a, b) => stage(b) - stage(a) || (b.maxHp + b.attack) - (a.maxHp + a.attack));
    case 'stage_asc': return sorted.sort((a, b) => stage(a) - stage(b) || (b.maxHp + b.attack) - (a.maxHp + a.attack));
    case 'atk_desc': return sorted.sort((a, b) => b.attack - a.attack);
    case 'atk_asc': return sorted.sort((a, b) => a.attack - b.attack);
    case 'hp_desc': return sorted.sort((a, b) => b.maxHp - a.maxHp);
    case 'hp_asc': return sorted.sort((a, b) => a.maxHp - b.maxHp);
    case 'newest': return sorted.sort((a, b) => b.uid.localeCompare(a.uid));
    case 'oldest': return sorted.sort((a, b) => a.uid.localeCompare(b.uid));
    default: return sorted;
  }
}

// Merge duplicate species into one Pokémon (+5 max HP/ATK per duplicate).
// Runs at load — the team can never hold the same species twice.
export function dedupeTeam(team) {
  const out = [];
  let merged = 0;
  (team || []).forEach(p => {
    const i = out.findIndex(q => q.species === p.species);
    if (i === -1) out.push({ ...p });
    else {
      const m = out[i].maxHp + 5;
      out[i] = { ...out[i], maxHp: m, hp: m, attack: out[i].attack + 5, fainted: false };
      merged++;
    }
  });
  return { team: out, merged };
}

// One-click "Evolve Best": repeatedly evolves the strongest Pokémon that can
// evolve with an owned stone WITHOUT creating a duplicate species, until
// nothing more can evolve. Pure function — returns the new team/stones/evolutions.
export function evolveBestTeam(team, stones) {
  const result = { team: [...(team || [])], stones: [...(stones || [])], evolved: [] };
  for (;;) {
    let best = null;
    result.team.forEach((p, idx) => {
      const power = p.maxHp + p.attack;
      if (best && power <= best.power) return; // can't beat the current best
      for (const st of [...new Set(result.stones)]) {
        if (!canEvolveWith(p, st)) continue;
        const evo = getEvolution(p, st);
        if (!evo) continue;
        if (result.team.some(q => q.species === evo.id)) continue; // would duplicate — skip this Pokémon
        best = { idx, stone: st, evo, power, pokemon: p };
        break;
      }
    });
    if (!best) break;
    result.team[best.idx] = { ...best.pokemon, species: best.evo.id, name: best.evo.name, type: best.evo.type, color: best.evo.color, bodyType: best.evo.bodyType, fainted: false };
    result.stones.splice(result.stones.indexOf(best.stone), 1);
    result.evolved.push({ from: best.pokemon.name, to: best.evo.name, stone: best.stone });
  }
  return result;
}

export function getBiomePokemon(biome, mode) {
  // Legendary Realm — ONLY legendary Pokémon spawn here, and only in God/Admin
  if (biome === 'legendary') {
    if (!LEGENDARY_ZONE_MODES.includes(mode)) return null;
    const pool = POKEMON_SPECIES.filter(s => s.legendary || s.id === JASYTHERION.id);
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  // Jasytherion Aetherium — the creator's legendary god, spawns ONLY in admin mode
  if (mode === 'admin' && Math.random() < JASYTHERION.adminSpawnChance) {
    return getSpecies(JASYTHERION.id);
  }
  const biomeTypes = BIOMES[biome]?.types || ['normal', 'grass'];
  const m = MODES[mode] || MODES.noob;
  // Weighted stage roll — e.g. easy has a small chance of Stage 1
  const roll = Math.random();
  let acc = 0, stage = 0;
  for (const [st, weight] of Object.entries(m.stages)) {
    acc += weight;
    if (roll <= acc) { stage = Number(st); break; }
  }
  let candidates = POKEMON_SPECIES.filter(s => s.stage === stage && biomeTypes.includes(s.type));
  if (candidates.length === 0) candidates = POKEMON_SPECIES.filter(s => s.stage === stage);
  if (candidates.length === 0) candidates = POKEMON_SPECIES;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
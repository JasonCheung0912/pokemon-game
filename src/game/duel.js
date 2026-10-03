import { POKEMON_SPECIES, MODES, DUEL, getStageStats, getSpecies } from '@/game/config';

// ─── Real move names ───
// Every Pokémon battles with its type's three signature attacks; famous
// Pokémon get their canonical real movesets.
const TYPE_MOVES = {
  normal: ['Tackle', 'Body Slam', 'Swift'],
  fire: ['Flamethrower', 'Fire Blast', 'Flame Charge'],
  water: ['Surf', 'Hydro Pump', 'Water Pulse'],
  electric: ['Thunder Shock', 'Thunderbolt', 'Thunder'],
  grass: ['Vine Whip', 'Razor Leaf', 'Solar Beam'],
  ice: ['Ice Beam', 'Blizzard', 'Frost Breath'],
  fighting: ['Karate Chop', 'Cross Chop', 'Brick Break'],
  poison: ['Acid', 'Sludge Bomb', 'Poison Fang'],
  ground: ['Earthquake', 'Dig', 'Bulldoze'],
  flying: ['Wing Attack', 'Aerial Ace', 'Air Slash'],
  psychic: ['Confusion', 'Psychic', 'Psybeam'],
  bug: ['Bug Bite', 'X-Scissor', 'Pin Missile'],
  rock: ['Rock Throw', 'Rock Slide', 'Stone Edge'],
  ghost: ['Shadow Ball', 'Shadow Punch', 'Night Shade'],
  dragon: ['Dragon Claw', 'Dragon Breath', 'Dragon Rush'],
  dark: ['Bite', 'Crunch', 'Dark Pulse'],
  steel: ['Metal Claw', 'Iron Head', 'Flash Cannon'],
  fairy: ['Fairy Wind', 'Dazzling Gleam', 'Moonblast'],
};

const FAMOUS_MOVES = {
  pikachu: ['Thunder Shock', 'Thunderbolt', 'Quick Attack'],
  raichu: ['Thunder Shock', 'Thunderbolt', 'Quick Attack'],
  charizard: ['Flamethrower', 'Fire Blast', 'Dragon Claw'],
  blastoise: ['Surf', 'Hydro Pump', 'Skull Bash'],
  venusaur: ['Razor Leaf', 'Solar Beam', 'Vine Whip'],
  mewtwo: ['Psychic', 'Aura Sphere', 'Shadow Ball'],
  gyarados: ['Hydro Pump', 'Dragon Rage', 'Bite'],
  snorlax: ['Body Slam', 'Rest', 'Hyper Beam'],
  dragonite: ['Dragon Claw', 'Hyper Beam', 'Wing Attack'],
  gengar: ['Shadow Ball', 'Sludge Bomb', 'Dream Eater'],
  jasytherion_aetherium: ['Aetherium Blast', 'Elemental Storm', 'Divine Fire'],
};

export function getMoves(speciesId) {
  if (FAMOUS_MOVES[speciesId]) return FAMOUS_MOVES[speciesId];
  const s = getSpecies(speciesId);
  return TYPE_MOVES[s?.type] || TYPE_MOVES.normal;
}

// ─── Streak Attack ───
// Unlocked at a 3-win streak: 5 more damage than the special gauge (+15),
// growing by +2 at 5, 8 and 10 consecutive wins. Cooldown: 3 of your turns.
export function streakAttackBonus(streak) {
  let bonus = DUEL.streakAttackBase; // 15
  if (streak >= 10) bonus += DUEL.streakBonusAt10;
  if (streak >= 8) bonus += DUEL.streakBonusAt8;
  if (streak >= 5) bonus += DUEL.streakBonusAt5;
  return bonus;
}

export const streakAttackUnlocked = (streak) => streak >= DUEL.streakAttackUnlock;

// ─── Bot difficulty ───
// Scales with the player's difficulty mode + current streak. After a 10+
// streak the bot "goes hard" — strong, but never unstoppable (capped).
export function botMultiplier(mode, streak) {
  const base = { noob: 0.7, easy: 0.8, moderate: 0.95, hard: 1.05, pro: 1.15, god: 1.25, admin: 1.35 }[mode] || 0.9;
  return Math.min(1.6, base * (streak >= 10 ? 1.25 : 1));
}

export function makeBotTeam(mode, streak) {
  const m = MODES[mode] || MODES.noob;
  const mult = botMultiplier(mode, streak);
  const team = [];
  const used = new Set();
  let guard = 0;
  while (team.length < 3 && guard++ < 60) {
    const roll = Math.random();
    let acc = 0, stage = 0;
    for (const [st, w] of Object.entries(m.stages)) { acc += w; if (roll <= acc) { stage = Number(st); break; } }
    const pool = POKEMON_SPECIES.filter(s => s.stage === stage && !s.legendary && !used.has(s.id));
    if (!pool.length) continue;
    const s = pool[Math.floor(Math.random() * pool.length)];
    used.add(s.id);
    const st = getStageStats(s);
    const hp = Math.round(st.hp * mult), atk = Math.round(st.attack * mult);
    team.push({ uid: `bot_${s.id}`, species: s.id, name: s.name, type: s.type, color: s.color, bodyType: s.bodyType, hp, maxHp: hp, attack: atk, fainted: false });
  }
  return team;
}

const BOT_NAMES = ['Rival Bot', 'Ace Trainer Bot', 'Elite Four Bot'];

export function makeBotOpponent(mode, streak) {
  return {
    username: streak >= 10 ? 'Champion Bot' : BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
    team: makeBotTeam(mode, streak),
  };
}

// A real player's record — their actual team, played by the AI
export function makePlayerOpponent(record, mode, streak) {
  const pool = [...(record?.team || [])].filter(p => !p.fainted)
    .sort((a, b) => (b.maxHp + b.attack) - (a.maxHp + a.attack));
  const team = pool.slice(0, 3).map(p => ({ ...p, hp: p.maxHp, fainted: false }));
  while (team.length < 3) {
    const bot = makeBotTeam(mode, streak);
    const pick = bot.find(b => !team.some(t => t.species === b.species)) || bot[0];
    if (!pick) break;
    team.push(pick);
  }
  return { username: record?.username || 'Rival Trainer', team };
}

// ─── Streak / rewards after a duel ───
export function applyDuelOutcome(pd, won) {
  if (!won) {
    return { data: { ...pd, duel_streak: 0 }, messages: ['💔 Duel lost! Your win streak is reset.'], locked: false };
  }
  const streak = (pd.duel_streak || 0) + 1;
  const updates = {
    duel_streak: streak,
    duel_best_streak: Math.max(pd.duel_best_streak || 0, streak),
    items: [...(pd.items || [])],
    duel_titles: [...(pd.duel_titles || [])],
  };
  const messages = [`🏆 Duel won! Streak: ${streak >= DUEL.infinityAt ? '∞' : streak}`];
  const balls = DUEL.adminBallRewards[streak];
  if (balls) {
    for (let i = 0; i < balls; i++) updates.items.push('admin_ball');
    messages.push(`🟢 +${balls} Admin Ball${balls > 1 ? 's' : ''}! (wild Pokémon only)`);
  }
  const title = DUEL.titles[streak];
  if (title && !updates.duel_titles.includes(title)) {
    updates.duel_titles.push(title);
    messages.push(`👑 New title unlocked: ${title}!`);
  }
  const locked = streak === 250;
  if (locked) {
    updates.duel_locked = true;
    messages.push('🎉 Congratulations, well done — 250 wins in a row!');
  }
  return { data: { ...pd, ...updates }, messages, locked };
}
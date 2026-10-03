export const ART_STYLE = 'cute cartoon game character illustration, vibrant colors, clean outlines, smooth gradient shading';
export const GAME_PERSPECTIVE = 'first-person';

export const PALETTE = {
  skyDay: '#87CEEB', skyAfternoon: '#FFD580', skyNight: '#0a0e2e',
  skyDawn: '#FF8C42', skyDusk: '#FF6347',
  groundDay: '#3a7a2a', groundNight: '#1e3a1e',
  trunk: '#5C3A1E', trunkDark: '#3D2812',
  // Trees: four green brightness levels — very bright, bright, dark, very dark
  foliage: ['#7CFC4D', '#3FBF3F', '#1E6B2E', '#0F4A22'],
  rock: ['#808080','#707070','#909090'],
  water: '#2E86C1', waterDeep: '#1B4F72', waterFall: '#85C1E9',
  grass: '#5fc45f', grassDark: '#3a8a3a', twig: '#8B6914',
  sunDay: '#FFD700', sunSet: '#FF8C00',
  volcanoGround: '#5a2a0a', volcanoRock: '#8B2500', lava: '#FF4500',
  caveGround: '#2a2a3a', caveRock: '#3a3a4a',
  iceGround: '#b0d0e0', iceRock: '#d0e8f0',
  lightningGround: '#4a4a2a', lightningRock: '#5a5a3a',
  rockSpire: '#8a8078', sand: '#E8D9A0', cactus: '#4a7a3a',
  windTurbine: '#F0F4F8', legendaryPurple: '#A855F7', legendaryCrystal: '#C084FC',
  kelp: '#2d7a4a', kelpDark: '#1e5a35', shell: '#F5DEB3',
};

// ═══════════════════════════════════════════
// PHOTOREALISTIC ENVIRONMENT TEXTURES — tiled
// across terrain, water, trunks and foliage
// ═══════════════════════════════════════════
// Regenerated bright, clean ground textures — pure terrain, no characters/creatures
export const TEXTURES = {
  ground: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/02f36277e_gamebg_713d0369.png',
  grass: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/93799a2b7_gamebg_c4ce1f90.png',
  volcanic: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/52447c08c_gamebg_1e136b65.png',
  ice: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/33b132691_gamebg_3127d450.png',
  sand: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/5be29e85e_gamebg_0175e853.png',
  marsh: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/2001737aa_gamebg_04decec2.png',
  rockland: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/09262a40d_gamebg_2891908c.png',
  legendaryGround: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/48587b637_gamebg_8e750b1b.png',
  caveFloor: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/bac85e413_gamebg_56bda490.png',
  water: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/48f0cc328_gameimage_b434f1fd.png',
  bark: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/c2f5e3afa_gameimage_41be0a2f.png',
  foliage: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/d648b1654_gameimage_b1fb3980.png',
};

// ═══════════════════════════════════════════
// NATIONAL POKÉDEX — all 1025 species with every evolution, built from the
// per-generation data tables in src/game/pokedex/
// ═══════════════════════════════════════════
import { POKEMON_SPECIES, EVOLUTION_CHAINS, POKEMON_POKEDEX_IDS } from '@/game/pokedex';
export { POKEMON_SPECIES, EVOLUTION_CHAINS, POKEMON_POKEDEX_IDS };

// ═══════════════════════════════════════════
// JASYTHERION AETHERIUM — the creator's own legendary god (#2014).
// Spawns ONLY in Admin mode; uses its own custom artwork.
// ═══════════════════════════════════════════
export const JASYTHERION = {
  id: 'jasytherion_aetherium', name: 'Jasytherion Aetherium', dex: 2014,
  type: 'fire', stage: 2, legendary: true,
  color: '#F97316', bodyType: 'tall',
  baseHp: 250, baseAttack: 100,
  image: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/dc57b73bc_Copilot_20260915_160833.png',
  adminSpawnChance: 0.1,   // 10% of wild spawns in admin mode
  stats: { hp: 600, attack: 65 },
};
POKEMON_POKEDEX_IDS[JASYTHERION.id] = JASYTHERION.dex;
POKEMON_SPECIES.push({
  id: JASYTHERION.id, name: JASYTHERION.name, type: JASYTHERION.type, dex: JASYTHERION.dex,
  color: JASYTHERION.color, bodyType: JASYTHERION.bodyType,
  baseHp: JASYTHERION.baseHp, baseAttack: JASYTHERION.baseAttack,
  stage: JASYTHERION.stage, legendary: true,
});

export const WORLD = {
  size: 700, treeCount: 380, rockCount: 130, wildPokemonCount: 30,
  stoneCount: 6, battleRange: 5, pickupRange: 3, waterCount: 3,
  twigCount: 170, grassCount: 900, fogNear: 90, fogFar: 330,
  treasureChestCount: 3,
};

export const PLAYER = {
  speed: 14, crouchSpeed: 6, jumpForce: 8, gravity: 25,
  eyeHeight: 1.8, crouchEyeHeight: 1.0, fallThreshold: -20,
};

export const DAY_NIGHT = {
  dayDuration: 10 * 60, afternoonDuration: 10 * 60, nightDuration: 10 * 60,
};

export const BIOME_ZONES = [
  { biome: 'forest', xMin: -70, xMax: 70, zMin: -70, zMax: 70 },
  { biome: 'volcano', xMin: 70, xMax: 200, zMin: 70, zMax: 200 },
  { biome: 'cave', xMin: -200, xMax: -70, zMin: -200, zMax: -70 },
  { biome: 'ice', xMin: -200, xMax: -70, zMin: 70, zMax: 200 },
  { biome: 'lightning', xMin: 70, xMax: 200, zMin: -200, zMax: -70 },
  { biome: 'rock', xMin: 210, xMax: 340, zMin: -340, zMax: -210 },
  { biome: 'wind', xMin: -340, xMax: -210, zMin: 210, zMax: 340 },
  { biome: 'desert', xMin: 210, xMax: 340, zMin: 210, zMax: 340 },
  { biome: 'hurricane', xMin: 210, xMax: 340, zMin: -70, zMax: 70 },
  { biome: 'legendary', xMin: -340, xMax: -210, zMin: -340, zMax: -210 },
];

export const CAVE = {
  centerX: -135, centerZ: -135, radius: 48, depth: 14,
  entranceAngle: 0, entranceWidth: 14, wallHeight: 18, wallSegments: 16,
};

export const BIOMES = {
  forest: { name: 'Forest', types: ['normal','grass','bug','flying','poison','fairy','psychic'], groundColor: '#3a7a2a' },
  volcano: { name: 'Volcano', types: ['fire'], groundColor: '#5a2a0a' },
  cave: { name: 'Cave', types: ['ghost','rock','ground','dark','poison','fighting','dragon'], groundColor: '#2a2a3a' },
  ice: { name: 'Tundra', types: ['ice','water'], groundColor: '#b0d0e0' },
  lightning: { name: 'Lightning Field', types: ['electric'], groundColor: '#4a4a2a' },
  water: { name: 'Wetland', types: ['water'], groundColor: '#1a4a6a' },
  rock: { name: 'Rockland', types: ['rock', 'ground', 'steel'], groundColor: '#8a8078' },
  wind: { name: 'Windland', types: ['flying', 'dragon', 'fairy'], groundColor: '#9fd8e8' },
  desert: { name: 'Desert', types: ['ground', 'fire', 'rock'], groundColor: '#E8D9A0' },
  legendary: { name: 'Legendary Realm', types: ['psychic', 'dragon'], groundColor: '#A855F7' },
  hurricane: { name: 'Hurricane Land', types: ['water', 'flying'], groundColor: '#2a6a8a' },
};

// Styled type tags — canonical type colors used on every card display
export const TYPE_COLORS = {
  normal: '#A8A878', fire: '#F08030', water: '#6890F0', electric: '#F8D030',
  grass: '#78C850', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
  ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
  rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848',
  steel: '#B8B8D0', fairy: '#EE99AC',
};

// Team management: the active party holds at most 6 Pokémon,
// everyone else lives in storage boxes
export const PARTY_SIZE = 6;

// ═══════════════════════════════════════════
// DIFFICULTY MODES
// ═══════════════════════════════════════════
// Stats are STAGE-based (see STAGE_STATS) — modes only control which stages spawn.
export const MODES = {
  noob:     { name: 'Noob',     color: '#4ade80', desc: 'Basic Pokémon only',                       statDesc: 'Basic • ~200 HP • ATK 21-30', stages: { 0: 1 } },
  easy:     { name: 'Easy',     color: '#22d3ee', desc: 'Basic + a few Stage 1',                    statDesc: 'Basic + Stage 1',             stages: { 0: 0.9, 1: 0.1 } },
  moderate: { name: 'Moderate', color: '#fbbf24', desc: 'Basic, Stage 1 + a few Stage 2',           statDesc: 'Up to Stage 2',               stages: { 0: 0.55, 1: 0.35, 2: 0.1 } },
  hard:     { name: 'Hard',     color: '#fb923c', desc: 'All stages, tougher',                      statDesc: 'More Stage 2',                stages: { 0: 0.4, 1: 0.35, 2: 0.25 } },
  pro:      { name: 'Pro',      color: '#f87171', desc: 'All stages, brutal',                       statDesc: 'Even more Stage 2',           stages: { 0: 0.3, 1: 0.35, 2: 0.35 } },
  god:      { name: 'God',      color: '#c084fc', desc: 'All stages, deadly + rainbows',            statDesc: 'Mostly Stage 2',              stages: { 0: 0.25, 1: 0.35, 2: 0.4 } },
  admin:    { name: 'Admin',    color: '#FFD700', desc: 'Creator only — ultimate + always rainbow',  statDesc: 'Your Pokémon: 2× stats',     stages: { 0: 0.25, 1: 0.35, 2: 0.4 } },
};

export const MODE_ORDER = ['noob', 'easy', 'moderate', 'hard', 'pro', 'god', 'admin'];

// Mode gate: hard at 250 Pokémon, pro at 500, god at 750
export const MODE_UNLOCK = {
  hard: { pokemon: 250 },
  pro: { pokemon: 500 },
  god: { pokemon: 750 },
};

export const RAINBOW = { damageMultiplier: 1.3, godChance: 0.15 };

// Only God/Admin mode can meet the wild legendary Pokémon of the Legendary Realm
export const LEGENDARY_ZONE_MODES = ['god', 'admin'];

// ═══════════════════════════════════════════
// DUEL ARENA — 3v3 trainer duels (players or adaptive bots)
// ═══════════════════════════════════════════
export const DUEL = {
  spinnerSeconds: 3,          // the wheel spins 3s, explodes, then the match begins
  streakAttackUnlock: 3,      // win 3 duels in a row to earn the Streak Attack
  streakAttackBase: 15,       // attack + 15 (5 more than the +10 special gauge)
  streakBonusAt5: 2, streakBonusAt8: 2, streakBonusAt10: 2,
  cooldownRounds: 3,          // Streak Attack recharges over 3 of your turns
  adminBallRewards: { 15: 3, 30: 5, 50: 10, 75: 25, 100: 50 },
  titles: { 150: 'Pro', 250: 'Unstoppable' },
  infinityAt: 100,            // streak displays ∞ from here on
};

export function checkUnlocks(playerData) {
  const team = playerData?.team || [];
  let stage1 = 0, stage2 = 0, shiny = 0;
  team.forEach(p => {
    const s = getSpecies(p.species);
    if (s?.stage === 1) stage1++;
    else if (s?.stage === 2) stage2++;
    if (p.shiny) shiny++;
  });
  return { total: team.length, stage1, stage2, shiny, shinyPct: team.length ? Math.round((shiny / team.length) * 100) : 0 };
}

export function isModeUnlocked(mode, playerData, isAdmin) {
  if (mode === 'admin') return !!isAdmin;
  const req = MODE_UNLOCK[mode];
  if (!req) return true;
  const s = checkUnlocks(playerData);
  return s.total >= (req.pokemon || 0) && s.stage2 >= (req.stage2 || 0)
    && s.stage1 >= (req.stage1 || 0) && s.shinyPct >= (req.shinyPct || 0);
}

export const COMBAT = {
  specialBonus: 10,            // Special Move deals 10 more than the normal attack
  specialGaugeThreshold: 100,  // usable after your Pokémon has dealt 100 damage
  luckySpecialChance: 0.15,    // 15% chance a normal attack turns into a Special
  enemyAttackDelay: 1500,
  ultraDamage: 400,            // Admin-only ULTRA move
};

export const POKEMON_SPRITES = {
  bulbasaur: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/2f9c6831c_gameimage_6ab7789d.png',
  charmander: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/bb009c839_gameimage_383f1c77.png',
  pikachu: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/4a6470bca_gameimage_e9f55dd4.png',
  eevee: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/43cb7b9b2_gameimage_ca2b486e.png',
  oddish: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/46d45be86_gameimage_8ff69a22.png',
  vulpix: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/2c8ba8163_gameimage_a4e70643.png',
  poliwag: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/170e8e405_gameimage_653c1f85.png',
  rattata: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/c0d2a5e75_gameimage_74f63061.png',
  pidgey: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/e98984108_gameimage_2ac59170.png',
  magnemite: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/28c8864e9_gameimage_e021f0bc.png',
  voltorb: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/7a02a81f2_gameimage_fed0c536.png',
  bellsprout: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/d66d2cf39_gameimage_9dff893a.png',
  growlithe: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/89886565f_gameimage_002f610b.png',
  tentacool: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/fa483f15c_gameimage_9f6b9d67.png',
  ivysaur: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/90830b9b4_gameimage_604a1369.png',
  charmeleon: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/11b4be67e_gameimage_930b20fa.png',
  wartortle: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/73c6c954d_gameimage_4175baba.png',
  raichu: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/412cea06e_gameimage_ca82d997.png',
  flareon: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/b54cd7680_gameimage_bb3e7ad9.png',
  venusaur: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/6717f0cb7_gameimage_d4c5a061.png',
  charizard: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/0278424a6_gameimage_1cf0813d.png',
  gastly: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/cd4c30860_gameimage_51f932c4.png',
  haunter: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/85f9cb942_gameimage_57bd6943.png',
  seel: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/409b2d7f3_gameimage_c94849fe.png',
  dewgong: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/3e233a9fa_gameimage_5909ae97.png',
  jasytherion_aetherium: 'https://media.base44.com/images/public/6a7431d0e384662733bae098/dc57b73bc_Copilot_20260915_160833.png',
};



// Returns the best available sprite URL for a species:
// custom generated sprite if we have one, otherwise official PokéAPI artwork
export function getSpriteUrl(speciesId) {
  if (POKEMON_SPRITES[speciesId]) return POKEMON_SPRITES[speciesId];
  const dexId = POKEMON_POKEDEX_IDS[speciesId];
  if (!dexId) return null;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dexId}.png`;
}

export const WATER_BODIES = [
  { x: 40, z: -30, radius: 22, depth: 4, hasWaterfall: true, fallHeight: 8, fallDir: 0 },
  { x: -60, z: 50, radius: 18, depth: 3, hasWaterfall: false },
  { x: 90, z: 70, radius: 25, depth: 5, hasWaterfall: true, fallHeight: 10, fallDir: Math.PI / 2 },
  { x: 270, z: -30, radius: 16, depth: 3, hasWaterfall: false },
  { x: 235, z: 42, radius: 12, depth: 2.5, hasWaterfall: false },
];

// ═══════════════════════════════════════════
// POKÉMON SPECIES — Gen 1-9 (204 species)
// ═══════════════════════════════════════════




export const STONE_TYPE_MATCH = {
  fire: 'Fire', water: 'Water', electric: 'Thunder', grass: 'Leaf',
  ice: 'Ice', ghost: ['Moon','Dusk'], normal: null,
  bug: 'Leaf', fighting: 'Sun', psychic: 'Dawn',
  rock: ['Moon','Dusk'], ground: ['Moon','Dusk'],
  poison: ['Moon','Dusk'], flying: ['Sun','Dawn'],
  dragon: 'Dawn', dark: ['Moon','Dusk'],
  steel: 'Thunder', fairy: ['Moon','Shiny'],
};

export const STARTERS = ['bulbasaur','charmander','squirtle'];

export const EVOLUTION_STONES = [
  { type: 'Fire', color: '#FF4500', rarity: 0.12 },
  { type: 'Water', color: '#1E90FF', rarity: 0.12 },
  { type: 'Thunder', color: '#FFD700', rarity: 0.10 },
  { type: 'Leaf', color: '#32CD32', rarity: 0.12 },
  { type: 'Moon', color: '#C0C0FF', rarity: 0.08 },
  { type: 'Sun', color: '#FFA500', rarity: 0.08 },
  { type: 'Shiny', color: '#FF69B4', rarity: 0.05 },
  { type: 'Dusk', color: '#9370DB', rarity: 0.08 },
  { type: 'Dawn', color: '#FFA07A', rarity: 0.07 },
  { type: 'Ice', color: '#ADD8E6', rarity: 0.08 },
];

export const STONE_UPGRADE = { attackBonus: 5, healthBonus: 5 };

// ═══════════════════════════════════════════
// POKÉBALLS — catch rates by wild Pokémon stage
// ═══════════════════════════════════════════
export const POKEBALLS = {
  pokeball:    { name: 'Pokéball',    icon: '🔴', rates: { 0: 0.50,  1: 0.25, 2: 0.12 } },
  great_ball:  { name: 'Great Ball',  icon: '🔵', rates: { 0: 0.75,  1: 0.50, 2: 0.25 } },
  ultra_ball:  { name: 'Ultra Ball',  icon: '🟡', rates: { 0: 0.99,  1: 0.75, 2: 0.50 } },
  master_ball: { name: 'Master Ball', icon: '🟣', rates: { 0: 0.999, 1: 0.99, 2: 0.75 } },
  admin_ball:  { name: 'Admin Ball',  icon: '⚪', rates: { 0: 1,     1: 1,    2: 1 } },
};

export const BALL_ORDER = ['pokeball', 'great_ball', 'ultra_ball', 'master_ball', 'admin_ball'];

// Random Pokéball box (3500 EXP): 50% Pokéball, 25% Great, 15% Ultra, 9% Master.
// Every 25th purchase is an Admin Ball instead (25th, 50th, 75th, ...).
export const RANDOM_BALL = {
  price: 3500, currency: 'exp', adminBallEvery: 25,
  chances: [['pokeball', 50], ['great_ball', 25], ['ultra_ball', 15], ['master_ball', 9]],
};

export function rollRandomBall(purchases) {
  if (purchases > 0 && purchases % RANDOM_BALL.adminBallEvery === 0) return 'admin_ball';
  const total = RANDOM_BALL.chances.reduce((a, c) => a + c[1], 0);
  let r = Math.random() * total;
  for (const [ball, weight] of RANDOM_BALL.chances) {
    if (r < weight) return ball;
    r -= weight;
  }
  return 'master_ball';
}

export const SHOP_ITEMS = [
  { id: 'random_box', name: 'Random Pokémon Box', price: 2000, currency: 'money', icon: '📦', desc: 'Get a random Pokémon added to your team' },
  { id: 'healing_potion', name: 'Healing Potion', price: 1000, currency: 'money', icon: '🧪', desc: 'Fully restores 1 active Pokémon' },
  { id: 'evolution_stone', name: 'Random Evolution Stone', price: 1200, currency: 'money', icon: '💎', desc: 'Get a random Evolution Stone' },
  { id: 'hp_upgrade', name: 'HP Upgrade', price: 1000, currency: 'money', icon: '❤️', desc: '+5 Permanent HP to active Pokémon' },
  { id: 'atk_upgrade', name: 'Attack Upgrade', price: 1250, currency: 'money', icon: '⚔️', desc: '+3 Permanent Attack to active Pokémon' },
  { id: 'random_pokeball', name: 'Random Pokéball', price: 3500, currency: 'exp', icon: '🎁', desc: 'Random ball: 50% Pokéball, 25% Great, 15% Ultra, 9% Master — every 25th box is an Admin Ball!' },
];

export const EXP_TO_MONEY = { exp: 100, money: 75 };

export const DAILY_REWARDS = [
  { day: 1, type: 'money', amount: 100, label: '$100' },
  { day: 2, type: 'exp', amount: 250, label: '250 EXP' },
  { day: 3, type: 'item', item: 'healing_potion', label: '🧪 Healing Potion' },
  { day: 4, type: 'pokemon', label: '📦 Random Pokémon' },
  { day: 5, type: 'stone', label: '💎 Random Stone' },
  { day: 6, type: 'money', amount: 2500, label: '$2,500' },
  { day: 7, type: 'item', item: 'master_ball', label: '🏆 Master Ball' },
];

export const TREASURE_CHESTS = { count: 3, respawnTime: 120000 };

export const EXP_REWARD = 50;

// Win rewards by the wild Pokémon's stage
export const WIN_REWARDS = {
  0: { money: 50, exp: 75 },
  1: { money: 75, exp: 100 },
  2: { money: 100, exp: 125 },
};

export const EXP_BADGES = [
  { exp: 100, name: 'Bronze Badge', icon: '🥉' },
  { exp: 300, name: 'Silver Badge', icon: '🥈' },
  { exp: 600, name: 'Gold Badge', icon: '🥇' },
  { exp: 1000, name: 'Platinum Badge', icon: '💎' },
  { exp: 1500, name: 'Master Badge', icon: '👑' },
];

// Spawn pools are now defined per-mode in MODES above.

export function getSpecies(id) {
  return POKEMON_SPECIES.find(s => s.id === id);
}

// ═══════════════════════════════════════════
// STAGE-BASED STATS — both wild and player Pokémon
// Basic ~200 HP / 21-30 ATK, Stage 1 ~300 / 31-40, Stage 2 ~400 / 41-50
// ═══════════════════════════════════════════
export const STAGE_STATS = {
  0: { hp: [190, 210], atk: [21, 30] },
  1: { hp: [285, 315], atk: [31, 40] },
  2: { hp: [380, 420], atk: [41, 50] },
};

// Deterministic stats per species: where a species sits inside its stage's
// base-stat spread decides where it lands in the stage range
// ("around 200/300/400 depending on which Pokémon it is").
export function getStageStats(speciesId) {
  const s = typeof speciesId === 'string' ? getSpecies(speciesId) : speciesId;
  // The creator's legendary god — fixed god-tier stats
  if (s?.id === JASYTHERION.id) return { ...JASYTHERION.stats };
  const stage = s?.stage ?? 0;
  const range = STAGE_STATS[stage] || STAGE_STATS[0];
  const mid = { hp: Math.round((range.hp[0] + range.hp[1]) / 2), attack: Math.round((range.atk[0] + range.atk[1]) / 2) };
  if (!s) return mid;
  // Cache each stage's peer list once — with 1026 species this turns a
  // 1026×1026 scan (every team load) into a single pass
  if (!getStageStats._peers) getStageStats._peers = {};
  if (!getStageStats._peers[stage]) getStageStats._peers[stage] = POKEMON_SPECIES.filter(p => p.stage === stage);
  const peers = getStageStats._peers[stage];
  const pos = (key, val) => {
    const lo = Math.min(...peers.map(p => p[key]));
    const hi = Math.max(...peers.map(p => p[key]));
    return hi > lo ? (val - lo) / (hi - lo) : 0.5;
  };
  return {
    hp: Math.round(range.hp[0] + pos('baseHp', s.baseHp) * (range.hp[1] - range.hp[0])),
    attack: Math.round(range.atk[0] + pos('baseAttack', s.baseAttack) * (range.atk[1] - range.atk[0])),
  };
}

export function getRandomSpecies(isDay) {
  const pool = POKEMON_SPECIES.filter(s => s.stage <= 1 && !s.legendary
    && !['mewtwo','mew','zapdos','articuno','moltres','aerodactyl','snorlax','chansey','lapras','dragonite'].includes(s.id));
  return pool[Math.floor(Math.random() * pool.length)];
}

// ═══════════════════════════════════════════
// ADMIN (game creator only)
// ═══════════════════════════════════════════
export const ADMIN_USER_IDS = ['6a7431d0e384662733bae099'];
// Both owner accounts share full admin/creator abilities
export const ADMIN_EMAILS = ['cheunc85@wis.edu.hk', 'jasoncheungss1@gmail.com'];

export const ADMIN_ABILITIES = {
  flySpeed: 22,
  speedBoostMultiplier: 5,
  superJumpForce: 40,
  buildDistance: 9,
  flyMaxY: 150,
};

export const ADMIN_BUILD_OBJECTS = [
  { type: 'tree', label: '🌳 Tree' },
  { type: 'rock', label: '🪨 Rock' },
  { type: 'crystal', label: '💎 Crystal' },
  { type: 'cube', label: '🟦 Cube' },
  { type: 'sphere', label: '🔴 Sphere' },
  { type: 'torch', label: '🔥 Torch' },
  { type: 'lava', label: '🌋 Lava Rock' },
  { type: 'ice', label: '🧊 Ice Spike' },
];
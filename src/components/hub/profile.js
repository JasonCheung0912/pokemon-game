// ─── Unified mini-game profile — keyed per logged-in account ───
// Every field lives under the signed-in user's id, so accounts never overwrite
// each other on shared devices. The cloud copy (ArcadeProfile entity) syncs
// from GameHub so progress follows the Google account across devices.
const KEY_PREFIX = 'pkmn_hub_profile_v2_';
const LEGACY_KEY = 'pkmn_hub_profile_v1';
const DEVICE_SIGNED_UP = 'pkmn_device_signed_up';

export const DEFAULT_PROFILE = {
  catches: 0,            // legacy combined counter (kept for old saves)
  arenaCatches: 0,       // Pokémon Catching Arena catches only
  tossCatches: 0,        // Arcade Pokéball Toss catches only
  balls: 10,
  coins: 250,
  tossHigh: 0,
  quizHigh: 0,
  ownedBalls: ['pokeball'],
  activeBall: 'pokeball',
  beamColor: '#ffffff',
  burst: 'spark',
  burstColor: '#FFD700',
  targetSet: 'glider',
  unlockedTargets: ['glider'],
  boosts: { wide: 0, wind: 0, x2: 0 },
  achievements: [],
  curveballs: 0,
  bestStreak: 0,
  // Speed Quiz helper trackers
  quizBestStreak: 0,
  quizCorrect: 0,
  // Obby Tower
  obbyHigh: 0,
  // Steal a Pokémon
  stealSteals: 0,
  stealBestHaul: 0,
  tools: { hammer: 0, trap: 0, boots: 0, jammer: 0 },
  // Player vs. Pokebies
  laneBestWave: 0,
  laneBosses: 0,
  laneDefeats: 0,
  // Toss power-up purchases
  powerUpsUsed: 0,
};

export function deviceSignedUp() {
  try { return localStorage.getItem(DEVICE_SIGNED_UP) === '1'; } catch (e) { return false; }
}

export function markDeviceSignedUp() {
  try { localStorage.setItem(DEVICE_SIGNED_UP, '1'); } catch (e) { /* ignore */ }
}

export function loadProfile(userId = null) {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + (userId || 'guest'));
    if (raw) return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
    // Migrate older single-profile saves so returning players keep progress
    const legacy = localStorage.getItem(LEGACY_KEY);
    return legacy ? { ...DEFAULT_PROFILE, ...JSON.parse(legacy) } : { ...DEFAULT_PROFILE };
  } catch (e) { return { ...DEFAULT_PROFILE }; }
}

export function mergeProfile(userId, cloud) {
  const merged = { ...loadProfile(userId), ...(cloud || {}) };
  saveProfile(merged, userId);
  return merged;
}

export function saveProfile(p, userId = null) {
  try { localStorage.setItem(KEY_PREFIX + (userId || 'guest'), JSON.stringify(p)); } catch (e) { /* ignore */ }
}
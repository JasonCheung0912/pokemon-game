// ─── Arcade Pokéball Toss — shop, customisation, targets, power-ups, awards ───

export const ARCADE_BALLS = {
  pokeball:  { name: 'Pokéball',    icon: '🔴', price: 0,     top: '#E53935', captureChance: 0.85, curve: 0,   trail: '#ffffff', desc: 'Standard throw • 85% capture' },
  great:     { name: 'Great Ball',  icon: '🔵', price: 500,   top: '#2962FF', captureChance: 0.95, curve: 0,   trail: '#4FC3F7', desc: '95% capture rate' },
  curveball: { name: 'Curveball',   icon: '🌀', price: 800,   top: '#8E24AA', captureChance: 0.85, curve: 260, trail: '#CE93D8', desc: 'Curves mid-flight — earn curveball achievements' },
  ultra:     { name: 'Ultra Ball',  icon: '🟡', price: 2000,  top: '#FFB300', captureChance: 1,    curve: 0,   trail: '#FFE082', desc: 'Never fails a capture' },
  master:    { name: 'Master Ball', icon: '🟣', price: 10000, top: '#7E22CE', captureChance: 1,    curve: 0,   trail: '#B39DDB', desc: 'The ultimate ball — golden trail' },
};

export const BALL_ORDER = ['pokeball', 'great', 'curveball', 'ultra', 'master'];

export const BEAM_COLORS = ['#ffffff', '#4FC3F7', '#FFD54F', '#FF7043', '#69F0AE', '#B388FF'];

export const BURST_STYLES = [
  { id: 'spark', name: '✨ Sparkle' },
  { id: 'ring', name: '💫 Ring Shock' },
  { id: 'fire', name: '🔥 Fireburst' },
];

export const TARGET_SETS = {
  glider: { name: 'Classic Gliders', icon: '🕊️', price: 0,    coinsMult: 1,   desc: 'Pokémon drift across the sky' },
  speed:  { name: 'High-Velocity Movers', icon: '💨', price: 600, coinsMult: 2, desc: 'Fast, unpredictable zig-zags • ×2 coins' },
  jumper: { name: 'Jumping Jumpers', icon: '🦘', price: 1200, coinsMult: 1.5, desc: 'Targets hop up and down • ×1.5 coins' },
};

export const TARGET_ORDER = ['glider', 'speed', 'jumper'];

export const POWERUPS = [
  { id: 'wide', name: 'Wide Hitbox', icon: '🎯', price: 150, desc: 'Capture radius ×1.5 for 60s' },
  { id: 'wind', name: 'Wind Resistance', icon: '🍃', price: 150, desc: 'Half gravity for 60s' },
  { id: 'x2', name: 'Double Coins', icon: '💰', price: 300, desc: '×2 coin drops for 60s' },
];

export const POWERUP_ORDER = ['wide', 'wind', 'x2'];

export const BALL_PACK = { balls: 10, price: 200 };

export const ACHIEVEMENTS = [
  // ── Toss originals ──
  { id: 'firstCatch', icon: '🐣', name: 'First Flight',    desc: 'Catch your first toss target',      reward: 100,  check: p => (p.tossCatches || 0) >= 1 },
  { id: 'streak10',   icon: '🔥', name: 'Hot Streak',      desc: 'Catch 10 targets in a row',         reward: 500,  check: p => (p.bestStreak || 0) >= 10 },
  { id: 'curve50',    icon: '🌀', name: 'Curve Master',    desc: 'Throw 50 curveballs',               reward: 400,  check: p => (p.curveballs || 0) >= 50 },
  { id: 'catch100',   icon: '💯', name: 'Century Catcher', desc: '100 total toss catches',            reward: 1000, check: p => (p.tossCatches || 0) >= 100 },
  { id: 'collector',  icon: '🧰', name: 'Ball Collector',  desc: 'Own 4 different ball types',        reward: 750,  check: p => (p.ownedBalls || []).length >= 4 },
  { id: 'score5000',  icon: '🏆', name: 'Arcade Legend',   desc: 'Score 5,000 in a single round',     reward: 2000, check: p => (p.tossHigh || 0) >= 5000 },
  // ── Toss mastery ──
  { id: 'toss25',      icon: '🎯', name: 'Sharp Shooter',   desc: 'Catch 25 toss targets',             reward: 250,  check: p => (p.tossCatches || 0) >= 25 },
  { id: 'toss250',     icon: '🎖️', name: 'Toss Titan',      desc: 'Catch 250 toss targets',            reward: 2500, check: p => (p.tossCatches || 0) >= 250 },
  { id: 'toss500',     icon: '🌠', name: 'Toss God',        desc: 'Catch 500 toss targets',            reward: 6000, check: p => (p.tossCatches || 0) >= 500 },
  { id: 'tossStreak25', icon: '🦅', name: 'Unbreakable Aim', desc: 'Catch 25 targets in a row',        reward: 2500, check: p => (p.bestStreak || 0) >= 25 },
  { id: 'curve250',    icon: '🌪️', name: 'Curve Deity',     desc: 'Throw 250 curveballs',              reward: 1500, check: p => (p.curveballs || 0) >= 250 },
  { id: 'score10000',  icon: '👑', name: 'Arcade Immortal', desc: 'Score 10,000 in a single round',    reward: 5000, check: p => (p.tossHigh || 0) >= 10000 },
  { id: 'ballMaster',  icon: '🧿', name: 'Ballmaster',      desc: 'Own all 5 ball types',              reward: 2000, check: p => (p.ownedBalls || []).length >= 5 },
  { id: 'powerFan',    icon: '🔋', name: 'Power Fan',       desc: 'Buy 10 power-ups',                  reward: 800,  check: p => (p.powerUpsUsed || 0) >= 10 },
  // ── Quiz ──
  { id: 'quiz1000',    icon: '📖', name: 'Quiz Apprentice', desc: 'Score 1,000 in the Speed Quiz',     reward: 300,  check: p => (p.quizHigh || 0) >= 1000 },
  { id: 'quiz2500',    icon: '🧙', name: 'Quiz Wizard',     desc: 'Score 2,500 in the Speed Quiz',     reward: 800,  check: p => (p.quizHigh || 0) >= 2500 },
  { id: 'quiz5000',    icon: '🧠', name: 'Quiz Grandmaster', desc: 'Score 5,000 in the Speed Quiz',    reward: 2000, check: p => (p.quizHigh || 0) >= 5000 },
  { id: 'quizStreak10', icon: '🔥', name: 'Ten in a Row',   desc: '10 correct answers in a row',       reward: 500,  check: p => (p.quizBestStreak || 0) >= 10 },
  { id: 'quizStreak20', icon: '☄️', name: 'Twenty Torch',   desc: '20 correct answers in a row',       reward: 1000, check: p => (p.quizBestStreak || 0) >= 20 },
  { id: 'quizStreak30', icon: '⚡', name: 'Thirty Thunder', desc: '30 correct answers in a row',       reward: 2500, check: p => (p.quizBestStreak || 0) >= 30 },
  { id: 'quizCorrect50', icon: '📚', name: 'Pokédex Scholar', desc: 'Answer 50 questions correctly (total)', reward: 1000, check: p => (p.quizCorrect || 0) >= 50 },
  { id: 'quizCorrect200', icon: '🎓', name: 'Professor',    desc: 'Answer 200 questions correctly (total)', reward: 3000, check: p => (p.quizCorrect || 0) >= 200 },
  // ── Catching Arena ──
  { id: 'arena10',     icon: '🌿', name: 'Wild Rookie',     desc: 'Catch 10 Pokémon in the Arena',     reward: 200,  check: p => (p.arenaCatches || 0) >= 10 },
  { id: 'arena25',     icon: '🌳', name: 'Wild Ranger',     desc: 'Catch 25 Pokémon in the Arena',     reward: 500,  check: p => (p.arenaCatches || 0) >= 25 },
  { id: 'arena50',     icon: '🏕️', name: 'Wild Veteran',    desc: 'Catch 50 Pokémon in the Arena',     reward: 1000, check: p => (p.arenaCatches || 0) >= 50 },
  { id: 'arena100',    icon: '🐾', name: 'Wild Master',     desc: 'Catch 100 Pokémon in the Arena',    reward: 2500, check: p => (p.arenaCatches || 0) >= 100 },
  // ── Obby Tower ──
  { id: 'obby5',       icon: '🧱', name: 'Tower Rookie',    desc: 'Reach floor 5 in Obby Tower',       reward: 250,  check: p => (p.obbyHigh || 0) >= 5 },
  { id: 'obby10',      icon: '🪜', name: 'Tower Climber',   desc: 'Reach floor 10 in Obby Tower',      reward: 600,  check: p => (p.obbyHigh || 0) >= 10 },
  { id: 'obby20',      icon: '☁️', name: 'Sky Legend',      desc: 'Reach floor 20 in Obby Tower',      reward: 1500, check: p => (p.obbyHigh || 0) >= 20 },
  // ── Steal a Pokémon ──
  { id: 'steal5',      icon: '🥷', name: 'Petty Thief',     desc: 'Steal 5 Pokémon from rival bases',  reward: 300,  check: p => (p.stealSteals || 0) >= 5 },
  { id: 'steal25',     icon: '💀', name: 'Master Thief',    desc: 'Steal 25 Pokémon from rival bases', reward: 1200, check: p => (p.stealSteals || 0) >= 25 },
  { id: 'stealHaul',   icon: '💰', name: 'Big Haul',        desc: 'Bank a haul worth 200+ coins',      reward: 800,  check: p => (p.stealBestHaul || 0) >= 200 },
  // ── Player vs. Pokebies ──
  { id: 'lane5',       icon: '🛡️', name: 'Lane Guard',      desc: 'Survive wave 5 in Pokebies Defense', reward: 300, check: p => (p.laneBestWave || 0) >= 5 },
  { id: 'lane10',      icon: '⚔️', name: 'Lane Captain',    desc: 'Survive wave 10',                   reward: 800,  check: p => (p.laneBestWave || 0) >= 10 },
  { id: 'lane20',      icon: '🏰', name: 'Lane General',    desc: 'Survive wave 20',                   reward: 2000, check: p => (p.laneBestWave || 0) >= 20 },
  { id: 'laneBoss1',   icon: '🐲', name: 'Boss Slayer',     desc: 'Defeat a boss wave',                reward: 500,  check: p => (p.laneBosses || 0) >= 1 },
  { id: 'laneDefeats100', icon: '✨', name: 'Corruption Cleaner', desc: 'Defeat 100 corrupted Pokebies', reward: 1000, check: p => (p.laneDefeats || 0) >= 100 },
  // ── Global ──
  { id: 'rich',        icon: '🏦', name: 'Coin Baron',      desc: 'Hold 5,000 coins at once',          reward: 500,  check: p => (p.coins || 0) >= 5000 },
  { id: 'awardHunter', icon: '🏅', name: 'Award Hunter',    desc: 'Earn 10 achievements',              reward: 1000, check: p => (p.achievements || []).length >= 10 },
  { id: 'awardMaster', icon: '🏵️', name: 'Award Master',    desc: 'Earn 25 achievements',              reward: 5000, check: p => (p.achievements || []).length >= 25 },
];

// ─── Speed Quiz helpers — earned by answering correctly / keeping streaks ───
// Each helper grants a token every time you cross a multiple of its threshold:
// `streak: 5` → a token at 5, 10, 15… correct in a row; `correct: 8` → every
// 8 total correct answers. Tokens are spent from the in-game helper bar.
export const QUIZ_HELPERS = [
  { id: 'hint',    icon: '💡', name: 'Hint',          desc: "Reveals the Pokémon's type",        every: { streak: 5 } },
  { id: 'fifty',   icon: '✂️', name: '50 / 50',       desc: 'Removes two wrong options',         every: { correct: 8 } },
  { id: 'extend',  icon: '⏱️', name: 'Time Extend',   desc: '+5s for the current question only', every: { streak: 10 } },
  { id: 'skip',    icon: '⏭️', name: 'Skip',          desc: 'Skip to the next question safely',  every: { correct: 16 } },
  { id: 'freeze',  icon: '❄️', name: 'Freeze',        desc: 'Timer frozen for 5 seconds',        every: { streak: 15 } },
  { id: 'double',  icon: '💰', name: 'Double Points', desc: 'Next correct answer pays ×2',       every: { correct: 24 } },
  { id: 'glow',    icon: '🔍', name: 'Silhouette Glow', desc: 'Brightens the shadow by 60%',     every: { streak: 20 } },
  { id: 'letter',  icon: '🔤', name: 'First Letter',  desc: 'Shows the first letter of the name', every: { correct: 32 } },
  { id: 'shield',  icon: '🛡️', name: 'Second Chance', desc: 'Forgives your next wrong answer',   every: { streak: 25 } },
  { id: 'surge',   icon: '⚡', name: 'Point Surge',   desc: '+50% points for the next 3 answers', every: { correct: 40 } },
  { id: 'bomb',    icon: '💣', name: 'Wrong Bomb',    desc: 'Removes one more wrong option',     every: { streak: 30 } },
  { id: 'revive',  icon: '🔁', name: 'Extra Life',    desc: 'Revive with 5s when time hits 0',   every: { correct: 48 } },
];

// Auto-claims any achievements the profile now satisfies, paying the coin
// reward. Returns { profile, newly } — newly is the list to toast.
export function checkAchievements(p) {
  const claimed = p.achievements || [];
  let np = p;
  const newly = [];
  for (const a of ACHIEVEMENTS) {
    if (claimed.includes(a.id)) continue;
    if (a.check(p)) {
      newly.push(a);
      np = { ...np, coins: (np.coins || 0) + a.reward, achievements: [...(np.achievements || []), a.id] };
    }
  }
  return { profile: np, newly };
}
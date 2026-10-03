import { HubButton } from '@/components/hub/HubButton';

const GAMES = [
  {
    id: 'arena', icon: '🌲', name: 'Pokémon Catching Arena',
    desc: 'Explore the endless 3D wilds across every biome, battle and catch wild Pokémon, evolve your team and rule the arena.',
    tag: '3D Adventure', color: 'from-emerald-500 to-green-700',
    stat: (p) => `🎯 ${p.arenaCatches} Pokémon caught in the Arena`,
  },
  {
    id: 'toss', icon: '🥎', name: 'Arcade Pokéball Toss',
    desc: 'Flick Pokéballs at Pokémon gliding, zig-zagging and leaping across the sky. Shop, customise, power up and chase the leaderboard!',
    tag: 'Physics Arcade', color: 'from-sky-500 to-blue-700',
    stat: (p) => `🪙 ${p.coins} coins • 🎯 ${p.tossCatches} catches`,
  },
  {
    id: 'quiz', icon: '⚡', name: 'Speed Pokédex Quiz',
    desc: 'Name the shadowed silhouette before the timer dies — every 10 correct answers shaves 2 seconds off the clock. No mercy!',
    tag: 'Timed Trivia', color: 'from-amber-500 to-orange-600',
    stat: (p) => `🧠 high score ${p.quizHigh}`,
  },
  {
    id: 'obby', icon: '🧗', name: 'Pokémon Obby Tower',
    desc: 'Climb an endless vertical obstacle course — moving platforms, vanishing blocks and hazards. Rare Pokémon wait at every checkpoint!',
    tag: 'Vertical Platformer', color: 'from-teal-500 to-cyan-700',
    stat: (p) => `🧗 best floor ${p.obbyHigh || 0}`,
  },
  {
    id: 'steal', icon: '🥷', name: 'Steal a Pokémon',
    desc: 'Grow your base, arm your laser lock, sneak into rival bases, stun the guards and run stolen Pokémon back home!',
    tag: 'Heist Strategy', color: 'from-rose-500 to-red-700',
    stat: (p) => `🥷 ${p.stealSteals || 0} Pokémon stolen`,
  },
  {
    id: 'lane', icon: '🛡️', name: 'Player vs. Pokebies',
    desc: 'Deploy tanks, ranged attackers, slowers and AoE casters across five lanes to stop waves of corrupted Pokebies.',
    tag: 'Lane Defense', color: 'from-lime-500 to-green-700',
    stat: (p) => `🛡️ best wave ${p.laneBestWave || 0}`,
  },
];

export function HubMenu({ profile, onPlay }) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-8">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-yellow-300 drop-shadow-[3px_3px_0_rgba(0,0,0,0.6)] text-center">
        🎮 Pokémon Explorer
      </h1>
      <p className="text-purple-200 mt-2 mb-8 text-center">Choose your game — every mode keeps its own stats on your account</p>
      <div className="grid gap-6 w-full max-w-5xl md:grid-cols-3">
        {GAMES.map(g => (
          <div key={g.id}
            className="hub-card bg-slate-900/85 rounded-2xl border-2 border-black shadow-[5px_5px_0_rgba(0,0,0,0.45)]
              overflow-hidden flex flex-col">
            <div className={`h-32 flex items-center justify-center bg-gradient-to-br ${g.color} text-6xl border-b-4 border-black`}>
              <span className="drop-shadow-[2px_2px_0_rgba(0,0,0,0.4)]">{g.icon}</span>
            </div>
            <div className="p-4 flex flex-col flex-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-300">{g.tag}</span>
              <h2 className="text-lg font-extrabold text-white mt-0.5">{g.name}</h2>
              <p className="text-slate-300 text-sm mt-2 flex-1">{g.desc}</p>
              <div className="text-xs text-purple-300 font-bold mt-3">{g.stat(profile)}</div>
              <HubButton onClick={() => onPlay(g.id)}
                className="mt-3 w-full bg-yellow-400 text-slate-900">
                ▶ Play
              </HubButton>
            </div>
          </div>
        ))}
      </div>
      <p className="text-purple-300/70 text-xs mt-8">Progress, coins and high scores save automatically to your logged-in account.</p>
    </div>
  );
}
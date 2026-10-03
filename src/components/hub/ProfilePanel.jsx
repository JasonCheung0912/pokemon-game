import { HubButton } from '@/components/hub/HubButton';
import { ACHIEVEMENTS } from '@/components/arcade/arcadeConfig';

// ─── Account profile — stats across every mode, achievements, sign out ───
export function ProfilePanel({ profile, user, onLogout }) {
  const stats = [
    ['🪙', 'Arcade coins', profile.coins],
    ['🔴', 'Pokéballs', profile.balls],
    ['🌲', 'Catching Arena catches', profile.arenaCatches],
    ['🥎', 'Toss catches', profile.tossCatches],
    ['🏆', 'Toss high score', profile.tossHigh],
    ['🧠', 'Quiz high score', profile.quizHigh],
    ['🔥', 'Best catch streak', profile.bestStreak],
    ['🌀', 'Curveballs thrown', profile.curveballs],
  ];
  return (
    <div className="min-h-full flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-2xl bg-slate-900/85 rounded-2xl border-2 border-black shadow-[5px_5px_0_rgba(0,0,0,0.45)] p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-extrabold text-white">👤 Trainer Profile</h2>
            <p className="text-purple-300 text-sm mt-1 truncate">{user?.email || 'Guest trainer'}</p>
          </div>
          <HubButton onClick={onLogout} className="bg-red-500 text-white">🚪 Log out</HubButton>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {stats.map(([icon, label, value]) => (
            <div key={label} className="bg-slate-800/80 rounded-xl p-3 border-2 border-black text-center">
              <div className="text-2xl">{icon}</div>
              <div className="text-yellow-300 font-extrabold text-lg">{value ?? 0}</div>
              <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wide">{label}</div>
            </div>
          ))}
        </div>
        <h3 className="text-white font-extrabold mt-6 mb-2">🏅 Achievements</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ACHIEVEMENTS.map(a => {
            const done = (profile.achievements || []).includes(a.id);
            return (
              <div key={a.id} className={`rounded-xl p-3 border-2 border-black flex items-center gap-3 ${done ? 'bg-emerald-800/70' : 'bg-slate-800/60 opacity-75'}`}>
                <span className="text-2xl">{done ? a.icon : '🔒'}</span>
                <div className="min-w-0">
                  <div className="text-white font-bold text-sm">{a.name}</div>
                  <div className="text-slate-400 text-xs">{a.desc} • reward 🪙{a.reward}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
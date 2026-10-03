import { DAILY_REWARDS } from '@/game/config';

export function DailyRewardOverlay({ streakDay, reward, onClaim, onClose }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 pointer-events-auto p-4 z-50">
      <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold text-white text-center mb-2">🎁 Daily Reward!</h2>
        <p className="text-slate-400 text-center mb-4">Day {streakDay} Login Streak</p>

        {/* 7-day streak display */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {DAILY_REWARDS.map((r, i) => {
            const dayNum = i + 1;
            const isCurrent = dayNum === streakDay;
            const isPast = dayNum < streakDay;
            return (
              <div key={i} className={`p-2 rounded-lg text-center text-xs ${\n                isCurrent ? 'bg-yellow-600 border-2 border-yellow-400' :\n                isPast ? 'bg-slate-700 opacity-50' : 'bg-slate-700/50'\n              }`}>
                <div className="font-bold text-white">D{dayNum}</div>
                <div className="text-slate-300 text-[10px] mt-1">{r.label}</div>
              </div>
            );
          })}
        </div>

        {/* Current reward */}
        <div className="bg-slate-700/50 rounded-lg p-4 mb-4 text-center">
          <div className="text-3xl mb-2">
            {reward?.type === 'money' ? '💰' : reward?.type === 'exp' ? '⭐' :
             reward?.type === 'item' ? (reward?.item === 'master_pokeball' ? '🏆' : '🧪') :
             reward?.type === 'pokemon' ? '📦' : reward?.type === 'stone' ? '💎' : '🎁'}
          </div>
          <div className="text-white font-bold text-lg">{reward?.label}</div>
        </div>

        <button onClick={onClaim || onClose}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition-all">
          Claim Reward!
        </button>
      </div>
    </div>
  );
}
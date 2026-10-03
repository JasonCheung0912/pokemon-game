import { HubButton } from '@/components/hub/HubButton';

const NAV = [
  { id: 'arena', icon: '🌲', label: 'Arena' },
  { id: 'toss', icon: '🥎', label: 'Toss' },
  { id: 'quiz', icon: '⚡', label: 'Quiz' },
  { id: 'obby', icon: '🧗', label: 'Obby' },
  { id: 'steal', icon: '🥷', label: 'Steal' },
  { id: 'lane', icon: '🛡️', label: 'Defense' },
  { id: 'profile', icon: '👤', label: 'Profile' },
];

// Persistent top navigation across every game mode: jump between the Catching
// Arena, Toss, Quiz and the profile, plus the global sound + account controls.
export function TopBar({ profile, view, onNav, showHome, onHome, soundOn, onToggleSound, user, onLogout }) {
  return (
    <header className="shrink-0 z-40 flex items-center justify-between gap-2 px-2 sm:px-4 py-2
      bg-gradient-to-r from-indigo-900 to-purple-900 border-b-4 border-yellow-400 shadow-lg">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {showHome && (
          <HubButton onClick={onHome} className="bg-yellow-400 text-slate-900 !py-1.5 text-sm">
            🏠 Menu
          </HubButton>
        )}
        <span className="text-yellow-300 font-extrabold text-sm sm:text-lg tracking-wide truncate hidden md:block">
          🎮 Pokémon Explorer
        </span>
        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV.filter(n => n.id !== view).map(n => (
            <HubButton key={n.id} onClick={() => onNav(n.id)} className="bg-slate-800 text-white !px-2 sm:!px-3 !py-1.5 text-xs sm:text-sm">
              {n.icon} <span className="hidden sm:inline">{n.label}</span>
            </HubButton>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-3 text-white text-xs sm:text-sm font-bold whitespace-nowrap">
        <span title="Arcade coins">🪙 {profile.coins}</span>
        <span title="Pokéballs" className="hidden sm:inline">🔴 {profile.balls}</span>
        <HubButton onClick={onToggleSound} className="bg-slate-700 text-white !px-2 !py-1.5">
          {soundOn ? '🔊' : '🔇'}
        </HubButton>
        {user && (
          <span className="hidden lg:inline text-purple-200 truncate max-w-[160px]" title={user.email}>{user.email}</span>
        )}
        {user && (
          <HubButton onClick={onLogout} className="bg-red-600 text-white !px-2 !py-1.5 text-xs">🚪</HubButton>
        )}
      </div>
    </header>
  );
}
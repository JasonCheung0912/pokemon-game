import * as audio from '@/game/audio';

// Standardized retro button — hover lift, click sound, consistent styling
// across every screen and mini-game.
export function HubButton({ children, onClick, className = '', disabled }) {
  return (
    <button
      disabled={disabled}
      onClick={(e) => { if (!disabled) { audio.sfx.click(); onClick?.(e); } }}
      className={`retro-btn inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border-2 border-black
        font-extrabold shadow-[3px_3px_0_rgba(0,0,0,0.45)] select-none ${className}`}
    >
      {children}
    </button>
  );
}
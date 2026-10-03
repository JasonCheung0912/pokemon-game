import { TYPE_COLORS } from '@/game/config';

// Styled colored tag for a Pokémon type — used on every card display
export function TypeTag({ type }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white capitalize shadow-sm whitespace-nowrap"
      style={{ backgroundColor: TYPE_COLORS[type] || '#888888' }}>
      {type}
    </span>
  );
}
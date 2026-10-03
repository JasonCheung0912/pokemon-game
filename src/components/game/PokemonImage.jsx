import { useState } from 'react';
import { getSpriteUrl, POKEMON_POKEDEX_IDS } from '@/game/config';

// Build a list of sprite URLs to try in order for a species
function getSpriteUrls(species) {
  const urls = [];
  const primary = getSpriteUrl(species);
  if (primary) urls.push(primary);
  const dexId = POKEMON_POKEDEX_IDS[species];
  if (dexId) {
    // Fallback: smaller pixel sprite from the same repo
    urls.push(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexId}.png`);
  }
  return urls;
}

/**
 * Pokémon sprite image — always shows the real artwork, never a shape or emoji.
 * Tries multiple sprite URLs on error. If all fail, renders nothing.
 */
export function PokemonImage({ species, alt, className }) {
  const [urlIndex, setUrlIndex] = useState(0);
  const urls = getSpriteUrls(species);
  const currentUrl = urls[urlIndex];

  if (!currentUrl) return null;

  return (
    <img src={currentUrl} alt={alt || ''} className={className}
      onError={() => {
        if (urlIndex < urls.length - 1) setUrlIndex(urlIndex + 1);
      }} />
  );
}
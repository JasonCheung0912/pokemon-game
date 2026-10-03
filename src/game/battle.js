// ─── Type matchups — the player-facing chart ───
// Per type: weakTo = attacking types that deal bonus damage against it,
// strongTo = types this one deals bonus damage to.
export const TYPE_CHART = {
  normal:   { weakTo: ['fighting'], strongTo: [] },
  fire:     { weakTo: ['water', 'ground', 'rock'], strongTo: ['grass', 'ice', 'bug', 'steel'] },
  water:    { weakTo: ['electric', 'grass'], strongTo: ['fire', 'ground', 'rock'] },
  electric: { weakTo: ['ground'], strongTo: ['water', 'flying'] },
  grass:    { weakTo: ['fire', 'ice', 'poison', 'flying', 'bug'], strongTo: ['water', 'ground', 'rock'] },
  ice:      { weakTo: ['fire', 'fighting', 'rock', 'steel'], strongTo: ['grass', 'ground', 'flying', 'dragon'] },
  fighting: { weakTo: ['flying', 'psychic', 'fairy'], strongTo: ['normal', 'ice', 'rock', 'dark', 'steel'] },
  poison:   { weakTo: ['ground', 'psychic'], strongTo: ['grass', 'fairy'] },
  ground:   { weakTo: ['water', 'grass', 'ice'], strongTo: ['fire', 'electric', 'poison', 'rock', 'steel'] },
  flying:   { weakTo: ['electric', 'ice', 'rock'], strongTo: ['grass', 'fighting', 'bug'] },
  psychic:  { weakTo: ['bug', 'ghost', 'dark'], strongTo: ['fighting', 'poison'] },
  bug:      { weakTo: ['fire', 'flying', 'rock'], strongTo: ['grass', 'psychic', 'dark'] },
  rock:     { weakTo: ['water', 'grass', 'fighting', 'ground', 'steel'], strongTo: ['fire', 'ice', 'flying', 'bug'] },
  ghost:    { weakTo: ['ghost', 'dark'], strongTo: ['psychic', 'ghost'] },
  dragon:   { weakTo: ['ice', 'dragon', 'fairy'], strongTo: ['dragon'] },
  dark:     { weakTo: ['fighting', 'bug', 'fairy'], strongTo: ['psychic', 'ghost'] },
  steel:    { weakTo: ['fire', 'fighting', 'ground'], strongTo: ['ice', 'rock', 'fairy'] },
  fairy:    { weakTo: ['poison', 'steel'], strongTo: ['fighting', 'dragon', 'dark'] },
};

// Effectiveness is flat 2 or 1 (no partial/immune matchups)
export function getEffectiveness(attackType, defendType) {
  return TYPE_CHART[defendType]?.weakTo.includes(attackType) ? 2 : 1;
}

export function effectivenessText(eff, defenderName) {
  if (eff > 1) return " It's super effective!";
  if (eff < 1) return " It's not very effective…";
  return '';
}

// Flat damage swings (10-15) from type matchups
const roll = () => 10 + Math.floor(Math.random() * 6); // 10-15

// Player's Pokémon is strong against the wild one → +10-15 damage on its attacks
export function getPlayerDamageBonus(playerType, enemyType) {
  return TYPE_CHART[playerType]?.strongTo.includes(enemyType) ? roll() : 0;
}

// Wild Pokémon attacking:
//   it is strong against the player (player weak to it) → +10-15
//   it is weak to the player's type → -10-15
export function getEnemyDamageDelta(enemyType, playerType) {
  if (TYPE_CHART[enemyType]?.strongTo.includes(playerType)) return roll();
  if (TYPE_CHART[playerType]?.weakTo.includes(enemyType)) return roll();
  if (TYPE_CHART[enemyType]?.weakTo.includes(playerType)) return -roll();
  return 0;
}
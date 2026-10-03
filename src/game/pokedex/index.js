// National Pokédex builder — merges the per-generation data tables into the
// game-ready structures used everywhere: POKEMON_SPECIES, POKEMON_POKEDEX_IDS
// and EVOLUTION_CHAINS. All 1025 species, every evolution included.
import { GEN1_3 } from './gen1_3';
import { GEN4_6 } from './gen4_6';
import { GEN7_9 } from './gen7_9';

const TABLE = [...GEN1_3, ...GEN4_6, ...GEN7_9];

const TC = {
  normal:'#A8A878', fire:'#F08030', water:'#6890F0', electric:'#F8D030', grass:'#78C850',
  ice:'#98D8D8', fighting:'#C03028', poison:'#A040A0', ground:'#E0C068', flying:'#A890F0',
  psychic:'#F85888', bug:'#A8B820', rock:'#B8A038', ghost:'#705898', dragon:'#7038F8',
  dark:'#705848', steel:'#B8B8D0', fairy:'#EE99AC',
};

// Default evolution stone per type (the chain's own stone; branches list
// their own distinct stones inside the evo string)
const STONE_FOR_TYPE = {
  fire:'Fire', water:'Water', electric:'Thunder', grass:'Leaf', ice:'Ice',
  ghost:'Moon', rock:'Moon', ground:'Moon', poison:'Dusk', dark:'Dusk',
  fighting:'Sun', psychic:'Dawn', dragon:'Dawn', steel:'Thunder',
  fairy:'Moon', bug:'Leaf', flying:'Sun', normal:'Moon',
};

// Body shape per type — used for display data only (all Pokémon render as sprites)
const BODY_FOR_TYPE = {
  normal:'short', fire:'tall', water:'round', electric:'short', grass:'round',
  ice:'round', fighting:'tall', poison:'round', ground:'quadruped', flying:'winged',
  psychic:'tall', bug:'round', rock:'round', ghost:'round', dragon:'serpent',
  dark:'quadruped', steel:'round', fairy:'round',
};

// The original hand-tuned base stats for species that shipped in the game
// before the full dex — kept so existing Pokémon keep their relative strength
// inside their stage band. [baseHp, baseAttack, bodyType]
const EXISTING_STATS = {
  bulbasaur:[45,10,'round'], ivysaur:[60,15,'round'], venusaur:[80,20,'round'],
  charmander:[39,12,'tall'], charmeleon:[58,17,'tall'], charizard:[78,22,'winged'],
  squirtle:[44,10,'round'], wartortle:[59,15,'round'], blastoise:[79,20,'round'],
  caterpie:[45,8,'round'], metapod:[50,6,'round'], butterfree:[60,12,'winged'],
  weedle:[40,8,'round'], kakuna:[45,6,'round'], beedrill:[65,18,'winged'],
  pidgey:[40,8,'winged'], pidgeotto:[63,12,'winged'], pidgeot:[83,16,'winged'],
  rattata:[30,10,'short'], raticate:[55,15,'short'], spearow:[40,10,'winged'], fearow:[65,18,'winged'],
  ekans:[35,12,'serpent'], arbok:[60,18,'serpent'],
  pikachu:[35,12,'short'], raichu:[60,18,'short'],
  sandshrew:[50,15,'quadruped'], sandslash:[75,20,'quadruped'],
  nidoran_f:[55,10,'short'], nidorina:[70,12,'short'], nidoqueen:[90,18,'tall'],
  nidoran_m:[46,12,'short'], nidorino:[61,14,'short'], nidoking:[81,20,'tall'],
  clefairy:[70,10,'short'], clefable:[95,15,'tall'],
  vulpix:[38,10,'quadruped'], ninetales:[73,16,'quadruped'],
  jigglypuff:[115,10,'round'], wigglytuff:[140,15,'round'],
  zubat:[40,10,'winged'], golbat:[75,15,'winged'], grimer:[80,14,'round'], muk:[105,20,'round'],
  koffing:[40,12,'round'], weezing:[65,18,'round'],
  oddish:[45,10,'round'], gloom:[60,13,'round'], vileplume:[75,16,'round'],
  paras:[35,14,'round'], parasect:[60,19,'round'], venonat:[60,11,'round'], venomoth:[70,13,'winged'],
  diglett:[10,12,'short'], dugtrio:[35,18,'short'], cubone:[50,10,'short'], marowak:[60,16,'short'],
  psyduck:[50,10,'short'], golduck:[80,16,'tall'],
  mankey:[40,16,'short'], primeape:[65,21,'short'],
  growlithe:[55,14,'quadruped'], arcanine:[90,22,'quadruped'],
  ponyta:[50,17,'quadruped'], rapidash:[65,20,'quadruped'],
  poliwag:[40,10,'round'], poliwhirl:[65,13,'round'], poliwrath:[90,18,'tall'],
  abra:[25,5,'short'], kadabra:[40,8,'tall'], alakazam:[55,12,'tall'],
  machop:[70,16,'short'], machoke:[80,20,'tall'], machamp:[90,26,'tall'],
  bellsprout:[50,15,'tall'], weepinbell:[65,18,'tall'], victreebel:[80,21,'tall'],
  tentacool:[40,8,'round'], tentacruel:[80,14,'tall'],
  geodude:[40,16,'round'], graveler:[55,19,'round'], golem:[80,24,'round'],
  onix:[35,9,'serpent'], rhyhorn:[80,17,'quadruped'], rhydon:[105,26,'tall'],
  magnemite:[25,12,'round'], magneton:[50,18,'round'],
  voltorb:[40,8,'round'], electrode:[60,12,'round'], electabuzz:[65,18,'tall'],
  magmar:[65,18,'tall'], flareon:[65,25,'short'], moltres:[90,20,'winged'],
  farfetchd:[52,18,'winged'], doduo:[35,16,'winged'], dodrio:[60,22,'winged'],
  lickitung:[90,12,'tall'], chansey:[250,5,'round'], kangaskhan:[105,18,'tall'],
  tauros:[75,20,'quadruped'], ditto:[48,10,'round'], porygon:[65,12,'round'], snorlax:[160,22,'round'],
  seel:[65,9,'round'], dewgong:[90,14,'tall'],
  shellder:[30,13,'round'], cloyster:[50,19,'round'],
  gastly:[30,7,'round'], haunter:[45,10,'round'], gengar:[60,13,'tall'],
  drowzee:[60,10,'short'], hypno:[85,15,'tall'], mr_mime:[40,9,'tall'],
  jynx:[65,10,'tall'], hitmonlee:[50,24,'tall'], hitmonchan:[50,21,'tall'],
  mewtwo:[106,22,'tall'], mew:[100,20,'short'],
  krabby:[30,20,'round'], kingler:[55,25,'round'],
  exeggcute:[60,8,'round'], exeggutor:[95,19,'tall'], tangela:[65,11,'round'],
  horsea:[30,8,'round'], seadra:[55,13,'tall'], goldeen:[45,13,'round'], seaking:[80,18,'round'],
  staryu:[30,9,'round'], starmie:[60,15,'round'],
  magikarp:[20,4,'round'], gyarados:[95,25,'serpent'], lapras:[130,17,'tall'],
  vaporeon:[130,13,'tall'], jolteon:[65,13,'short'],
  omanyte:[35,8,'round'], omastar:[70,12,'round'], kabuto:[30,16,'round'], kabutops:[60,23,'tall'],
  aerodactyl:[80,21,'winged'], articuno:[90,17,'winged'], zapdos:[90,18,'winged'],
  scyther:[70,22,'winged'], pinsir:[65,25,'round'],
  dratini:[41,13,'serpent'], dragonair:[61,17,'serpent'], dragonite:[91,27,'tall'],
  eevee:[55,11,'short'], espeon:[65,13,'tall'], umbreon:[95,13,'tall'],
  leafeon:[65,22,'tall'], glaceon:[65,22,'tall'], sylveon:[95,13,'tall'],
  cyndaquil:[39,10,'short'], quilava:[58,14,'tall'], typhlosion:[78,21,'tall'],
  slugma:[40,8,'round'], magcargo:[50,13,'round'],
  houndour:[45,12,'quadruped'], houndoom:[75,18,'quadruped'],
  torchic:[45,12,'short'], combusken:[60,17,'tall'], blaziken:[80,24,'tall'],
  numel:[60,12,'quadruped'], camerupt:[70,16,'quadruped'], torkoal:[70,17,'quadruped'],
  mareep:[55,8,'quadruped'], flaaffy:[70,11,'quadruped'], ampharos:[90,15,'tall'],
  electrike:[40,9,'quadruped'], manectric:[70,15,'quadruped'],
  shinx:[45,13,'quadruped'], luxio:[60,17,'quadruped'], luxray:[80,24,'quadruped'],
  dedenne:[67,12,'round'],
  swinub:[50,10,'quadruped'], piloswine:[100,16,'quadruped'], delibird:[45,9,'winged'],
  snorunt:[50,10,'round'], glalie:[80,16,'round'],
  spheal:[70,8,'round'], sealeo:[90,12,'tall'], walrein:[110,16,'tall'],
  snover:[60,10,'tall'], abomasnow:[90,18,'tall'],
  vanillite:[36,10,'round'], vanillish:[51,13,'round'], vanilluxe:[71,19,'round'],
  misdreavus:[60,12,'round'], sableye:[50,15,'short'],
  shuppet:[44,15,'round'], banette:[64,23,'tall'],
  duskull:[20,8,'round'], dusclops:[40,14,'tall'],
  drifloon:[90,10,'round'], drifblim:[150,16,'tall'],
  spiritomb:[108,22,'round'], mimikyu:[55,18,'short'],
  chimchar:[44,12,'short'], monferno:[64,16,'tall'], infernape:[76,21,'tall'],
};

function slugify(name) {
  let s = name.toLowerCase().replace('♀', '_f').replace('♂', '_m');
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  s = s.replace(/['.:]/g, '').replace(/[-\s]/g, '_').replace(/[^a-z0-9_]/g, '');
  return s;
}

export const POKEMON_POKEDEX_IDS = {};
export const POKEMON_SPECIES = [];
const byDex = {};

TABLE.forEach(([dex, name, type, stage, evo, legend]) => {
  const id = slugify(name);
  if (POKEMON_POKEDEX_IDS[id] !== undefined) throw new Error(`Duplicate species id: ${id} (${name})`);
  POKEMON_POKEDEX_IDS[id] = dex;
  byDex[dex] = id;
  const old = EXISTING_STATS[id];
  POKEMON_SPECIES.push({
    id, name, type, dex,
    color: TC[type] || TC.normal,
    bodyType: old ? old[2] : BODY_FOR_TYPE[type] || 'round',
    baseHp: old ? old[0] : 45 + ((dex * 7) % 51),
    baseAttack: old ? old[1] : 45 + ((dex * 13) % 51),
    stage, legendary: !!legend,
  });
});

// Build evolution chains from the evo strings.
// ''                      → no evolution
// '26'                    → evolves to #26 with the type's default stone
// '45|Sun:182'            → Leaf stone → #45, Sun stone → #182 (branching)
// 'Sun:106|Dawn:107'      → pure branch (Tyrogue-style)
export const EVOLUTION_CHAINS = {};
TABLE.forEach(([dex, , type, , evo]) => {
  if (!evo) return;
  const id = byDex[dex];
  const defaultStone = STONE_FOR_TYPE[type] || 'Moon';
  const parts = evo.split('|');
  if (parts.length === 1 && !parts[0].includes(':')) {
    EVOLUTION_CHAINS[id] = { evolvesTo: byDex[Number(parts[0])], stoneType: defaultStone };
  } else {
    const map = {};
    parts.forEach(pt => {
      const [stone, target] = pt.includes(':') ? pt.split(':') : [defaultStone, pt];
      map[stone] = byDex[Number(target)];
    });
    EVOLUTION_CHAINS[id] = { evolvesTo: map, stoneType: defaultStone };
  }
});

if (POKEMON_SPECIES.length !== 1025) {
  console.warn(`Pokédex incomplete: ${POKEMON\_SPECIES.length}/1025 species`);
} else {
  console.log('National Pokédex loaded: 1025 species');
}
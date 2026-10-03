import { COMBAT, POKEBALLS, BALL_ORDER, getSpecies } from '@/game/config';
import { getMoves } from '@/game/duel';
import { getEffectiveness } from '@/game/battle';
import { TypeTag } from '@/components/game/TypeTag';
import { PokemonImage } from '@/components/game/PokemonImage';

function HpBar({ ratio, colors }) {
  return (
    <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${Math.max(0, ratio) * 100}%`, backgroundColor: colors }} />
    </div>
  );
}

export function BattleOverlay({ battle, ballCounts, onMove, onSpecial, onFlee, onUseBall, onContinue, isAdmin, onUltra }) {
  if (!battle) return null;
  const { enemy, playerPokemon, ended, result, turn, damageDealt, specialReady, lastAction } = battle;
  const enemyRatio = enemy.hp / enemy.maxHp;
  const enemyStage = getSpecies(enemy.species)?.stage ?? 0;
  const playerRatio = playerPokemon.hp / playerPokemon.maxHp;
  const gaugeProgress = Math.min(100, (damageDealt / COMBAT.specialGaugeThreshold) * 100);
  const moves = getMoves(playerPokemon.species);
  const eff = getEffectiveness(playerPokemon.type, enemy.type);
  const effHint = eff > 1 ? '⚡ Strong' : eff === 0 ? '✖ No effect' : eff < 1 ? '🛡 Weak' : null;

  return (
    <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-slate-900/95 to-slate-800/95 pointer-events-auto battle-enter overflow-y-auto">
      {/* Turn indicator */}
      {!ended && (
        <div className="text-center pt-4">
          <span className={`px-4 py-1 rounded-full text-sm font-bold ${turn === 'player' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}>
            {turn === 'player' ? '⚔️ Your Turn' : '⏳ Enemy Turn...'}
          </span>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center gap-3 pt-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Wild {enemy.name} {enemy.shiny && '✨'}</h2>
          <div className="flex items-center justify-center gap-2 mt-1">
            <TypeTag type={enemy.type} />
            <span className="text-slate-400 text-sm">{enemy.attack} ATK</span>
          </div>
        </div>
        <div className="w-28 h-28 rounded-xl flex items-center justify-center bg-slate-800/60" style={{ border: `3px solid ${enemy.color}` }}>
          <PokemonImage species={enemy.species} alt={enemy.name} className="w-24 h-24 object-contain" />
        </div>
        <div className="w-64">
          <div className="flex justify-between text-xs text-slate-300 mb-1">
            <span>HP</span><span>{Math.max(0, enemy.hp)} / {enemy.maxHp}</span>
          </div>
          <HpBar ratio={enemyRatio} colors={enemyRatio > 0.5 ? '#ef4444' : enemyRatio > 0.25 ? '#fbbf24' : '#dc2626'} />
        </div>
      </div>

      {/* Battle log */}
      {lastAction && !ended && (
        <div className="text-center text-slate-300 text-sm px-4">{lastAction}</div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center gap-3 border-t border-slate-700 pt-4 pb-6">
        <div className="w-28 h-28 rounded-xl flex items-center justify-center bg-slate-800/60" style={{ border: `3px solid ${playerPokemon.color}` }}>
          <PokemonImage species={playerPokemon.species} alt={playerPokemon.name} className="w-24 h-24 object-contain" />
        </div>
        <div className="w-64">
          <div className="flex justify-between text-xs text-slate-300 mb-1">
            <span className="font-bold">{playerPokemon.shiny && '✨ '}{playerPokemon.name} HP</span>
            <span>{Math.max(0, playerPokemon.hp)} / {playerPokemon.maxHp}</span>
          </div>
          <HpBar ratio={playerRatio} colors={playerRatio > 0.5 ? '#4ade80' : playerRatio > 0.25 ? '#fbbf24' : '#ef4444'} />
          {/* Special gauge */}
          <div className="mt-2">
            <div className="flex justify-between text-xs text-slate-400 mb-0.5">
              <span>Special Gauge</span><span>{damageDealt}/{COMBAT.specialGaugeThreshold}</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${gaugeProgress}%`, backgroundColor: specialReady ? '#a855f7' : '#6366f1' }} />
            </div>
          </div>
        </div>

        {!ended ? (
          <div className="flex flex-wrap gap-3 justify-center">
            {moves.map((moveName, i) => (
              <button key={i} onClick={() => onMove(i)} disabled={turn !== 'player'}
                className={`px-5 py-3 text-white rounded-xl font-bold shadow-lg transition-all ${turn === 'player' ? 'bg-cyan-600 hover:bg-cyan-500 active:scale-95' : 'bg-slate-700 opacity-50 cursor-not-allowed'}`}>
                {moveName}{effHint ? <span className="block text-[10px] font-normal opacity-80">{effHint}</span> : null}
              </button>
            ))}
            {specialReady && (
              <button onClick={onSpecial} disabled={turn !== 'player'}
                className={`px-6 py-3 text-white rounded-xl font-bold shadow-lg transition-all ${turn === 'player' ? 'bg-purple-600 hover:bg-purple-500 active:scale-95' : 'bg-slate-700 opacity-50 cursor-not-allowed'}`}>
                ✨ Special (+{COMBAT.specialBonus})
              </button>
            )}
            {isAdmin && !battle.ultraUsed && (
              <button onClick={onUltra} disabled={turn !== 'player'}
                className={`px-6 py-3 text-white rounded-xl font-bold shadow-lg transition-all ${turn === 'player' ? 'bg-amber-600 hover:bg-amber-500 active:scale-95' : 'bg-slate-700 opacity-50 cursor-not-allowed'}`}>
                💥 ULTRA ({COMBAT.ultraDamage})
              </button>
            )}
            {BALL_ORDER.filter(b => (ballCounts?.[b] || 0) > 0).map(ballType => {
              const ball = POKEBALLS[ballType];
              return (
                <button key={ballType} onClick={() => onUseBall(ballType)} disabled={turn !== 'player'}
                  className={`px-4 py-3 text-white rounded-xl font-bold shadow-lg transition-all ${turn === 'player' ? 'bg-red-500 hover:bg-red-400 active:scale-95' : 'bg-slate-700 opacity-50 cursor-not-allowed'}`}
                  style={ballType === 'admin_ball' ? { backgroundColor: '#FFD700' } : undefined}>
                  {ball.icon} {ball.name} ×{ballCounts[ballType]}
                </button>
              );
            })}
            <button onClick={onFlee} disabled={turn !== 'player'}
              className={`px-4 py-3 text-white rounded-xl font-bold shadow-lg transition-all ${turn === 'player' ? 'bg-slate-600 hover:bg-slate-500 active:scale-95' : 'bg-slate-700 opacity-50 cursor-not-allowed'}`}>
              🏃 Flee
            </button>
          </div>
        ) : (
          <div className="text-center flex flex-col items-center gap-4">
            {result === 'win' && <h3 className="text-3xl font-bold text-green-400">Victory! Pokémon caught!</h3>}
            {result === 'capture' && <h3 className="text-3xl font-bold text-blue-400">Caught with Pokéball!</h3>}
            {result === 'lose' && <h3 className="text-3xl font-bold text-red-400">Defeated! Lost some money and EXP.</h3>}
            {result === 'flee' && <h3 className="text-3xl font-bold text-slate-300">Got away safely!</h3>}
            <button onClick={onContinue}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition-all">
              Continue Exploring
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
import { Suspense, useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { EventBus } from '@/game/EventBus';
import { world } from '@/game/3d/world';
import { DayNight } from '@/game/3d/objects/DayNight';
import { Forest } from '@/game/3d/objects/Forest';
import { Player } from '@/game/3d/objects/Player';
import { AdminBuild } from '@/game/3d/objects/AdminBuild';
import { Rainbow } from '@/game/3d/objects/Rainbow';
import { checkUnlocks } from '@/game/config';
import { WildPokemonManager } from '@/game/3d/objects/WildPokemon';
import { EvolutionStoneManager } from '@/game/3d/objects/EvolutionStones';
import { TreasureChestManager } from '@/game/3d/objects/TreasureChests';
import { LegendaryBarrier } from '@/game/3d/objects/LegendaryBarrier';
import { RemotePlayers } from '@/game/3d/objects/RemotePlayers';

export function GameScene() {
  const scene = useThree((state) => state.scene);
  const readySet = useRef(false);

  useEffect(() => {
    EventBus.emit('current-scene-ready', scene);
    window.game = {
      ready: false,
      getPhase: () => world.phase,
      getPlayerPosition: () => ({ ...world.playerPosition }),
      getWildPokemon: () => world.wildPokemon.map(p => ({ id: p.id, species: p.species, hp: p.hp, maxHp: p.maxHp, attack: p.attack, position: { ...p.position } })),
      getStones: () => world.stones?.map(s => ({ id: s.id, type: s.type, position: { ...s.position } })) || [],
      getChests: () => world.treasureChests?.map(c => ({ id: c.id, position: { ...c.position } })) || [],
      isDay: () => world.isDay,
      getDifficulty: () => world.difficulty,
      getRainbowActive: () => world.rainbowActive,
      getModeInfo: () => (world.playerData ? checkUnlocks(world.playerData) : null),
      getMoney: () => world.money,
      getExp: () => world.exp,
      getAdminState: () => ({
        isAdmin: world.isAdmin, flying: world.flying, speedBoost: world.speedBoost,
        superJump: world.superJump, buildMode: world.buildMode, damageDodge: world.damageDodge,
        buildObjectType: world.buildObjectType, builtObjects: world.builtObjects.length,
      }),
      pause: () => { world.phase = 'paused'; EventBus.emit('game-paused'); },
      resume: () => { world.phase = 'exploring'; EventBus.emit('game-resumed'); },
    };
    const onGameStarted = () => { world.phase = 'exploring'; };
    const onBattleStart = () => { world.phase = 'battle'; };
    const onBattleEnd = () => { world.phase = 'exploring'; };
    const onRestart = () => { world.phase = 'exploring'; };
    const onPaused = () => { world.phase = 'paused'; };
    const onResumed = () => { world.phase = 'exploring'; };
    EventBus.on('game-started', onGameStarted);
    EventBus.on('battle-start', onBattleStart);
    EventBus.on('battle-end', onBattleEnd);
    EventBus.on('restart-game', onRestart);
    EventBus.on('game-paused', onPaused);
    EventBus.on('game-resumed', onResumed);
    return () => {
      EventBus.off('game-started', onGameStarted);
      EventBus.off('battle-start', onBattleStart);
      EventBus.off('battle-end', onBattleEnd);
      EventBus.off('restart-game', onRestart);
      EventBus.off('game-paused', onPaused);
      EventBus.off('game-resumed', onResumed);
    };
  }, [scene]);

  useFrame(() => {
    if (!readySet.current && window.game) {
      readySet.current = true;
      window.game.ready = true;
    }
  });

  return (
    <>
      <DayNight />
      <Rainbow />
      <Suspense fallback={null}>
        <Forest />
        <Player />
        <AdminBuild />
        <LegendaryBarrier />
      </Suspense>
      <Suspense fallback={null}>
        <WildPokemonManager />
        <EvolutionStoneManager />
        <TreasureChestManager />
        <RemotePlayers />
      </Suspense>
    </>
  );
}
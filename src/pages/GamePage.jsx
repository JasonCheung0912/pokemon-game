import { useState, useEffect, useRef, useCallback } from 'react';
import { GameContainer } from '@/components/game/GameContainer';
import { EventBus } from '@/game/EventBus';
import { base44 } from '@/api/base44Client';
import { world } from '@/game/3d/world';
import { StartScreen } from '@/components/game/StartScreen';
import { HUD } from '@/components/game/HUD';
import { BattleOverlay } from '@/components/game/BattleOverlay';
import { ShopOverlay } from '@/components/game/ShopOverlay';
import { InventoryOverlay } from '@/components/game/InventoryOverlay';
import { PauseOverlay } from '@/components/game/PauseOverlay';
import { AdminPanel } from '@/components/game/AdminPanel';
import { DailyRewardOverlay } from '@/components/game/DailyRewardOverlay';
import { DuelArena } from '@/components/game/DuelArena';
import { FriendsPanel } from '@/components/game/FriendsPanel';
import { applyDuelOutcome, getMoves } from '@/game/duel';
import { getEffectiveness, getPlayerDamageBonus, getEnemyDamageDelta } from '@/game/battle';
import * as audio from '@/game/audio';
import {
  POKEMON_SPECIES, SHOP_ITEMS, EVOLUTION_STONES, EVOLUTION_CHAINS,
  STONE_TYPE_MATCH, EXP_BADGES, COMBAT, EXP_TO_MONEY,
  DAILY_REWARDS, TREASURE_CHESTS, getSpecies, getRandomSpecies, ADMIN_USER_IDS, ADMIN_EMAILS, RAINBOW,
  getStageStats, WIN_REWARDS, POKEBALLS, rollRandomBall,
} from '@/game/config';
import { canEvolveWith, getEvolution, mergeDuplicate, normalizeTeamStats, evolveBestTeam, dedupeTeam } from '@/game/pokemonUtils';

// Only changed fields are uploaded on auto-save (keeps pickups lag-free)
const SAVE_FIELDS = ['money', 'exp', 'badges', 'team', 'stones', 'click_damage', 'active_index',
  'has_started', 'difficulty', 'last_login_date', 'daily_streak_day', 'items', 'last_team_reset',
  'random_ball_purchases', 'username', 'duel_streak', 'duel_best_streak', 'duel_titles', 'duel_locked',
  'friends'];

export default function GamePage({ onExitToHub, onArenaCatch }) {
  const [phase, setPhase] = useState('menu');
  const [playerData, setPlayerData] = useState(null);
  const [battle, setBattle] = useState(null);
  const [dayNight, setDayNight] = useState({ isDay: true, phase: 'day', remaining: 600 });
  const [overlay, setOverlay] = useState(null);
  const [notification, setNotification] = useState(null);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [dailyReward, setDailyReward] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [arenaOpen, setArenaOpen] = useState(false);
  const [players, setPlayers] = useState([]);
  const [duelForced, setDuelForced] = useState(null);
  const [adminState, setAdminState] = useState({ flying: false, speedBoost: false, superJump: false, buildMode: false, buildObjectType: 'tree', damageDodge: false });
  const [soundOn, setSoundOn] = useState(audio.isEnabled());

  const phaseRef = useRef(phase);
  const playerDataRef = useRef(playerData);
  const battleRef = useRef(battle);
  const arenaCatchRef = useRef(onArenaCatch);   // hub counter for Catching Arena catches
  arenaCatchRef.current = onArenaCatch;
  const clickDamageRef = useRef(10);
  const enemyAttackTimeoutRef = useRef(null);
  phaseRef.current = phase;
  playerDataRef.current = playerData;
  battleRef.current = battle;

  useEffect(() => { if (playerData) clickDamageRef.current = playerData.click_damage; }, [playerData]);

  // The mouse must be free and the camera still whenever we're NOT exploring —
  // welcome screens, battles, overlays. Pointer lock only engages while exploring.
  // Also re-syncs the engine's phase: whenever React re-enters exploring, the
  // engine follows — a stuck phase can never freeze movement again.
  useEffect(() => {
    if (phase === 'exploring') world.phase = 'exploring';
    if (phase !== 'exploring' && document.pointerLockElement) document.exitPointerLock();
  }, [phase]);
  // Themed music per screen — exploration, battles, and the hub menu
  useEffect(() => {
    if (phase === 'battle') audio.startMusic('battle');
    else if (phase === 'exploring') audio.startMusic('explore');
    else if (phase === 'menu') audio.startMusic('hub');
  }, [phase]);
  useEffect(() => { if (playerData) { world.money = playerData.money; world.exp = playerData.exp; world.playerData = playerData; } }, [playerData]);

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundOn(prev => {
      const on = !prev;
      audio.setEnabled(on);
      if (on) audio.startMusic(phaseRef.current === 'battle' ? 'battle' : 'explore');
      return on;
    });
  }, []);

  // Load player data on mount — the mode-select screen shows at game entry
  useEffect(() => {
    (async () => {
      try {
        const records = await base44.entities.PlayerData.filter({}, '-created_date', 1);
        let loadedRecord = null;
        if (records.length > 0) {
          let pd = records[0];
          // 12-hour team HP reset — every 12 hours all Pokémon return to full health
          const lastReset = pd.last_team_reset ? new Date(pd.last_team_reset).getTime() : 0;
          if (!lastReset || Date.now() - lastReset >= 12 * 3600 * 1000) {
            pd = {
              ...pd,
              team: pd.team.map(p => ({ ...p, hp: p.maxHp, fainted: false })),
              last_team_reset: new Date().toISOString(),
            };
          }
          // Re-stat the whole team to the stage rule (~200/300/400 HP by stage),
          // then merge duplicate species (+5 max HP/ATK per duplicate)
          const dd = dedupeTeam(normalizeTeamStats(pd.team));
          if (dd.merged > 0) showNotification(`Merged ${dd.merged} duplicate Pokémon! +5 HP/ATK each`, 'success');
          // Party system migration — the first 6 become the active party
          if (!dd.team.some(p => p.inParty)) {
            dd.team = dd.team.map((p, i) => ({ ...p, inParty: i < 6 }));
          }
          loadedRecord = pd;
          setPlayerData({ ...pd, team: dd.team });
        }
        // Creator-only admin check — both owner accounts (by email) are admins
        try {
          const me = await base44.auth.me();
          const isOwnerEmail = ADMIN_EMAILS.includes((me?.email || '').toLowerCase());
          const admin = me?.role === 'admin' || ADMIN_USER_IDS.includes(me?.id) || isOwnerEmail;
          world.isAdmin = admin;
          setIsAdmin(admin);
          // Second owner account: one-time transfer of the creator's full save
          if (isOwnerEmail && (!loadedRecord || !(loadedRecord.team || []).length)) {
            const res = await base44.functions.invoke('claimCreatorSave');
            if (res?.data?.ok) {
              const fresh = await base44.entities.PlayerData.filter({}, '-created_date', 1);
              if (fresh[0]) setPlayerData(fresh[0]);
              showNotification('🎁 Your full save was transferred to this account!', 'success');
            }
          }
        } catch (e) { /* not admin */ }
      } catch (e) { console.error('Failed to load player data:', e); }
      // Other players for the Duel Arena and the admin player list
      try {
        const list = await base44.entities.PlayerData.list('-created_date', 50);
        setPlayers(list || []);
      } catch (e) { /* playing solo — the arena falls back to bots */ }
    })();
  }, []);

  // Auto-save — only the fields that actually changed are uploaded, so picking
  // up a stone or chest sends a few bytes instead of the whole team (no lag).
  const saveTimeoutRef = useRef(null);
  const lastSavedRef = useRef(null);
  useEffect(() => {
    if (!playerData?.id) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const prev = lastSavedRef.current;
      const payload = {};
      let changed = false;
      SAVE_FIELDS.forEach(f => {
        if (!prev || playerData[f] !== prev[f]) { payload[f] = playerData[f]; changed = true; }
      });
      if (!changed) { setSaveStatus('saved'); return; }
      setSaveStatus('saving');
      try {
        await base44.entities.PlayerData.update(playerData.id, payload);
        lastSavedRef.current = { ...playerData };
        setSaveStatus('saved');
      } catch (e) { console.error('Failed to save:', e); setSaveStatus('error'); }
    }, 1200);
  }, [playerData]);

  // EventBus listeners
  useEffect(() => {
    const onBattleStart = (data) => {
      if (phaseRef.current !== 'exploring') return;
      const pd = playerDataRef.current;
      if (!pd) return;
      // The equipped (active) Pokémon is the one that battles
      const playerIdx = pd.active_index ?? 0;
      if (!pd.team[playerIdx] || pd.team[playerIdx].fainted) {
        showNotification('Your equipped Pokémon has fainted! Heal it in the Shop or equip another Pokémon!', 'error');
        world.battleTargetId = data.id;
        EventBus.emit('battle-end', 'flee');
        return;
      }
      if (enemyAttackTimeoutRef.current) clearTimeout(enemyAttackTimeoutRef.current);
      // The equipped Pokémon attacks with the SAME attack stat shown in the
      // Team screen (including upgrade items and merge bonuses) — the attack
      // button deals exactly that much damage. HP follows the stage rule.
      // The game creator's Pokémon gets DOUBLE its stats.
      const equipped = pd.team[playerIdx];
      const mult = world.isAdmin ? 2 : 1;
      const battleMaxHp = getStageStats(equipped.species).hp * mult;
      const battleAttack = equipped.attack * mult;
      const battleHp = Math.min(battleMaxHp, Math.max(1, Math.round((equipped.hp / equipped.maxHp) * battleMaxHp)));
      setBattle({
        enemy: { ...data },
        playerPokemon: { ...equipped, maxHp: battleMaxHp, hp: battleHp, attack: battleAttack },
        playerIdx,
        ended: false, result: null, turn: 'player', damageDealt: 0, specialReady: false, lastAction: '',
        ultraUsed: false,
      });
      setPhase('battle');
    };
    const onTimeChanged = (data) => setDayNight(data);
    const onStoneCollected = (data) => {
      audio.sfx.pickup();
      setPlayerData(prev => prev ? { ...prev, stones: [...prev.stones, data.type] } : prev);
      showNotification(`Found a ${data.type} Stone!`, 'success');
    };
    const onPointerLocked = () => setPointerLocked(true);
    const onPointerUnlocked = () => { if (phaseRef.current === 'exploring') setPointerLocked(false); };
    const onPlayerFell = () => showNotification('You fell into the water! Respawning...', 'error');
    const onGateBlocked = () => showNotification('🔒 The Legendary Realm is sealed — only God or Admin runs may enter!', 'error');
    const onTreasureCollected = () => {
      audio.sfx.pickup();
      const r = Math.random();
      setPlayerData(prev => {
        if (!prev) return prev;
        if (r < 0.5) {
          const amount = 500 + Math.floor(Math.random() * 1500);
          showNotification(`Treasure! +$${amount}`, 'success');
          return { ...prev, money: prev.money + amount };
        } else if (r < 0.8) {
          const stone = EVOLUTION_STONES[Math.floor(Math.random() * EVOLUTION_STONES.length)];
          showNotification(`Treasure! ${stone.type} Stone!`, 'success');
          return { ...prev, stones: [...prev.stones, stone.type] };
        } else if (r < 0.95) {
          const species = getRandomSpecies(true);
          const { isDuplicate, team } = mergeDuplicate(prev.team, {
            uid: `poke\_${Date.now()}\_${Math.random()}`,
            species: species.id, name: species.name, type: species.type, color: species.color,
            bodyType: species.bodyType, hp: getStageStats(species).hp, maxHp: getStageStats(species).hp, attack: getStageStats(species).attack, fainted: false,
          });
          showNotification(isDuplicate ? `Treasure! ${species.name} merged! +5 HP/ATK` : `Treasure! ${species.name} caught!`, 'success');
          return { ...prev, team };
        } else {
          showNotification('Treasure! Master Ball!', 'success');
          return { ...prev, items: [...(prev.items || []), 'master_ball'] };
        }
      });
    };
    EventBus.on('battle-start', onBattleStart);
    EventBus.on('time-changed', onTimeChanged);
    EventBus.on('stone-collected', onStoneCollected);
    EventBus.on('pointer-locked', onPointerLocked);
    EventBus.on('pointer-unlocked', onPointerUnlocked);
    EventBus.on('player-fell', onPlayerFell);
    EventBus.on('gate-blocked', onGateBlocked);
    EventBus.on('treasure-collected', onTreasureCollected);
    return () => {
      EventBus.off('battle-start', onBattleStart);
      EventBus.off('time-changed', onTimeChanged);
      EventBus.off('stone-collected', onStoneCollected);
      EventBus.off('pointer-locked', onPointerLocked);
      EventBus.off('pointer-unlocked', onPointerUnlocked);
      EventBus.off('player-fell', onPlayerFell);
    EventBus.off('gate-blocked', onGateBlocked);
      EventBus.off('treasure-collected', onTreasureCollected);
    };
  }, [showNotification]);

  // Enemy attack helper
  const triggerEnemyAttack = useCallback(() => {
    const curr = battleRef.current;
    if (!curr || curr.ended) return;
    // Admin-only 50% damage dodge — halves the damage the wild Pokémon deals to the creator's Pokémon
    const dodging = world.damageDodge && world.isAdmin;
    // Type matchup: ±10-15 damage — the wild Pokémon hits harder when it is
    // strong against (or the player is weak to) it, softer when it is weak
    const delta = getEnemyDamageDelta(curr.enemy.type, curr.playerPokemon.type);
    const rawDmg = Math.max(0, curr.enemy.attack + delta);
    const dmg = dodging ? Math.ceil(rawDmg / 2) : rawDmg;
    const newPlayerHp = Math.max(0, curr.playerPokemon.hp - dmg);
    if (newPlayerHp <= 0) {
      audio.sfx.lose();
      setBattle(prev => prev ? {
        ...prev, playerPokemon: { ...prev.playerPokemon, hp: 0 },
        ended: true, result: 'lose', lastAction: `${curr.enemy.name} dealt ${dmg} damage!${dodging ? ' 🛡️' : ''}`,
      } : prev);
      setPlayerData(prev => {
        if (!prev) return prev;
        const newTeam = [...prev.team];
        if (newTeam[curr.playerIdx]) newTeam[curr.playerIdx] = { ...newTeam[curr.playerIdx], hp: 0, fainted: true };
        return { ...prev, money: Math.floor(prev.money * 0.9), exp: Math.floor(prev.exp * 0.9), team: newTeam };
      });
    } else {
      setBattle(prev => prev ? {
        ...prev, playerPokemon: { ...prev.playerPokemon, hp: newPlayerHp },
        lastAction: `${curr.enemy.name} dealt ${dmg} damage!${dodging ? ' 🛡️' : ''}`, turn: 'player',
      } : prev);
      // Wild damage persists on the equipped Pokémon — only the 12-hour reset or healing restores HP
      setPlayerData(prev => {
        if (!prev) return prev;
        const newTeam = [...prev.team];
        if (newTeam[curr.playerIdx]) newTeam[curr.playerIdx] = { ...newTeam[curr.playerIdx], hp: newPlayerHp };
        return { ...prev, team: newTeam };
      });
    }
  }, []);

  const startExploring = useCallback((mode) => {
    world.difficulty = mode;
    // Rainbow: always in admin mode, 15% chance in god mode
    world.rainbowActive = mode === 'admin' || (mode === 'god' && Math.random() < RAINBOW.godChance);
    EventBus.emit('rainbow-changed', world.rainbowActive);
    audio.startMusic('explore');
    setPhase('exploring');
    EventBus.emit('game-started');
    setTimeout(() => EventBus.emit('request-pointer-lock'), 200);
    if (world.rainbowActive) showNotification('🌈 A rainbow appeared! Equipped Pokémon damage boosted!', 'success');
    // Daily reward check
    const pd = playerDataRef.current;
    const today = new Date().toISOString().split('T')[0];
    if (pd && pd.last_login_date && pd.last_login_date !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      let streakDay = pd.daily_streak_day || 0;
      if (pd.last_login_date === yesterday) streakDay = streakDay >= 7 ? 1 : streakDay + 1;
      else streakDay = 1;
      const reward = DAILY_REWARDS[streakDay - 1];
      setDailyReward({ day: streakDay, reward });
    }
  }, [showNotification]);

  const handleEnterWorld = useCallback((mode) => {
    setPlayerData(prev => prev ? { ...prev, difficulty: mode } : prev);
    startExploring(mode);
  }, [startExploring]);

  const handleStart = useCallback(async (starterId, mode, username) => {
    const species = POKEMON_SPECIES.find(s => s.id === starterId);
    if (!species) return;
    const starter = {
      uid: `poke\_${Date.now()}\_${Math.random()}`,
      species: species.id, name: species.name, type: species.type, color: species.color, bodyType: species.bodyType,
      hp: getStageStats(species).hp, maxHp: getStageStats(species).hp, attack: getStageStats(species).attack, fainted: false, inParty: true,
    };
    const today = new Date().toISOString().split('T')[0];
    const newPlayerData = {
      money: 500, exp: 0, badges: [], team: [starter], stones: [], click_damage: 10, active_index: 0,
      has_started: true, difficulty: mode, last_login_date: today, daily_streak_day: 1, items: [],
      last_team_reset: new Date().toISOString(), username,
      duel_streak: 0, duel_best_streak: 0, duel_titles: [], duel_locked: false,
    };
    try {
      const record = await base44.entities.PlayerData.create(newPlayerData);
      setPlayerData(record);
    } catch (e) { console.error('Failed to create:', e); setPlayerData(newPlayerData); }
    startExploring(mode);
  }, [startExploring]);

  const handleBattleWin = useCallback((enemyData) => {
    // Win rewards by the wild Pokémon's stage: $50/75exp, $75/100exp, $100/125exp
    const stage = getSpecies(enemyData.species)?.stage ?? 0;
    const reward = WIN_REWARDS[stage] || WIN_REWARDS[0];
    audio.sfx.win();
    showNotification(`Victory! +$${reward.money} \& +${reward.exp} EXP!`, 'success');
    arenaCatchRef.current?.();
    setPlayerData(prev => {
      if (!prev) return prev;
      const newExp = prev.exp + reward.exp;
      const newBadges = [...prev.badges];
      EXP_BADGES.forEach(badge => { if (newExp >= badge.exp && !newBadges.includes(badge.name)) newBadges.push(badge.name); });
      const { isDuplicate, team } = mergeDuplicate(prev.team, {
        uid: `poke\_${Date.now()}\_${Math.random()}`,
        species: enemyData.species, name: enemyData.name, type: enemyData.type, color: enemyData.color,
        bodyType: enemyData.bodyType, hp: enemyData.maxHp, maxHp: enemyData.maxHp, attack: enemyData.attack, fainted: false,
      });
      return { ...prev, money: prev.money + reward.money, exp: newExp, badges: newBadges, team };
    });
  }, [showNotification]);

  // Turn-based move — damage scales with the standard type-effectiveness chart
  const handleMove = useCallback((moveIdx) => {
    const current = battleRef.current;
    if (!current || current.ended || current.turn !== 'player') return;
    const moves = getMoves(current.playerPokemon.species);
    const moveName = moves[moveIdx] || moves[0];
    const eff = getEffectiveness(current.playerPokemon.type, current.enemy.type);
    // 15% chance the move surges into a Special (+10 damage).
    // Strong matchup adds a flat +10-15 bonus (no multiplier).
    const lucky = Math.random() < COMBAT.luckySpecialChance;
    const typeBonus = eff > 1 ? getPlayerDamageBonus(current.playerPokemon.type, current.enemy.type) : 0;
    const damage = Math.max(0, Math.ceil(current.playerPokemon.attack * (world.rainbowActive ? RAINBOW.damageMultiplier : 1)) + typeBonus + (lucky ? COMBAT.specialBonus : 0));
    const newEnemyHp = Math.max(0, current.enemy.hp - damage);
    const newDamageDealt = current.damageDealt + damage;
    const newSpecialReady = newDamageDealt >= COMBAT.specialGaugeThreshold;
    const effText = eff === 0 ? ` It doesn't affect ${current.enemy.name}…` : eff > 1 ? " It's super effective!" : eff < 1 ? " It's not very effective…" : '';
    const actionText = `${moveName} — ${damage} damage!${effText}${lucky ? ' ✨Surge!' : ''}${world.rainbowActive ? ' 🌈' : ''}`;
    audio.sfx.move();
    if (eff > 1) audio.sfx.superHit();
    if (newEnemyHp <= 0) {
      setBattle(prev => prev ? { ...prev, enemy: { ...prev.enemy, hp: 0 }, ended: true, result: 'win',
        damageDealt: newDamageDealt, specialReady: newSpecialReady, lastAction: actionText } : prev);
      handleBattleWin(current.enemy);
    } else {
      setBattle(prev => prev ? { ...prev, enemy: { ...prev.enemy, hp: newEnemyHp },
        damageDealt: newDamageDealt, specialReady: newSpecialReady, lastAction: actionText, turn: 'enemy' } : prev);
      if (enemyAttackTimeoutRef.current) clearTimeout(enemyAttackTimeoutRef.current);
      enemyAttackTimeoutRef.current = setTimeout(() => triggerEnemyAttack(), COMBAT.enemyAttackDelay);
    }
  }, [handleBattleWin, triggerEnemyAttack]);

  const handleSpecial = useCallback(() => {
    const current = battleRef.current;
    if (!current || current.ended || current.turn !== 'player' || !current.specialReady) return;
    // Special Move deals 10 more than the attack, × type effectiveness
    const eff = getEffectiveness(current.playerPokemon.type, current.enemy.type);
    const effText = eff === 0 ? ` It doesn't affect ${current.enemy.name}…` : eff > 1 ? " It's super effective!" : eff < 1 ? " It's not very effective…" : '';
    audio.sfx.move();
    if (eff > 1) audio.sfx.superHit();
    const damage = Math.max(0, Math.ceil(current.playerPokemon.attack * (world.rainbowActive ? RAINBOW.damageMultiplier : 1))
      + COMBAT.specialBonus + (eff > 1 ? getPlayerDamageBonus(current.playerPokemon.type, current.enemy.type) : 0));
    const newEnemyHp = Math.max(0, current.enemy.hp - damage);
    if (newEnemyHp <= 0) {
      setBattle(prev => prev ? { ...prev, enemy: { ...prev.enemy, hp: 0 }, ended: true, result: 'win',
        damageDealt: 0, specialReady: false, lastAction: `✨ Special! ${damage} damage!${effText}` } : prev);
      handleBattleWin(current.enemy);
    } else {
      setBattle(prev => prev ? { ...prev, enemy: { ...prev.enemy, hp: newEnemyHp },
        damageDealt: 0, specialReady: false, lastAction: `✨ Special! ${damage} damage!${effText}`, turn: 'enemy' } : prev);
      if (enemyAttackTimeoutRef.current) clearTimeout(enemyAttackTimeoutRef.current);
      enemyAttackTimeoutRef.current = setTimeout(() => triggerEnemyAttack(), COMBAT.enemyAttackDelay);
    }
  }, [handleBattleWin, triggerEnemyAttack]);

  // Admin-only ULTRA move — 200 damage, once per battle
  const handleUltra = useCallback(() => {
    const current = battleRef.current;
    if (!current || current.ended || current.turn !== 'player' || !world.isAdmin || current.ultraUsed) return;
    const damage = COMBAT.ultraDamage;
    const newEnemyHp = Math.max(0, current.enemy.hp - damage);
    if (newEnemyHp <= 0) {
      setBattle(prev => prev ? { ...prev, enemy: { ...prev.enemy, hp: 0 }, ended: true, result: 'win',
        lastAction: `💥 ULTRA! ${damage} damage!`, ultraUsed: true } : prev);
      handleBattleWin(current.enemy);
    } else {
      setBattle(prev => prev ? { ...prev, enemy: { ...prev.enemy, hp: newEnemyHp },
        lastAction: `💥 ULTRA! ${damage} damage!`, turn: 'enemy', ultraUsed: true } : prev);
      if (enemyAttackTimeoutRef.current) clearTimeout(enemyAttackTimeoutRef.current);
      enemyAttackTimeoutRef.current = setTimeout(() => triggerEnemyAttack(), COMBAT.enemyAttackDelay);
    }
  }, [handleBattleWin, triggerEnemyAttack]);

  const handleFlee = useCallback(() => {
    if (enemyAttackTimeoutRef.current) clearTimeout(enemyAttackTimeoutRef.current);
    setBattle(prev => prev ? { ...prev, ended: true, result: 'flee' } : prev);
  }, []);

  // Throw a ball — the catch chance depends on the ball type and the wild Pokémon's stage.
  // A failed throw wastes the ball and the enemy gets its turn.
  const handleUseBall = useCallback((ballType) => {
    const current = battleRef.current;
    if (!current || current.ended || current.turn !== 'player') return;
    const pd = playerDataRef.current;
    if (!pd) return;
    const legacy = ballType === 'master_ball' ? 'master_pokeball' : ballType;
    const items = pd.items || [];
    const idx = items.indexOf(ballType) !== -1 ? items.indexOf(ballType) : items.indexOf(legacy);
    if (idx === -1) { showNotification(`No ${POKEBALLS\[ballType].name}!`, 'error'); return; }
    audio.sfx.ball();
    const stage = getSpecies(current.enemy.species)?.stage ?? 0;
    const success = Math.random() < (POKEBALLS[ballType].rates[stage] ?? 0);
    if (enemyAttackTimeoutRef.current) clearTimeout(enemyAttackTimeoutRef.current);
    const enemyData = current.enemy;
    if (success) {
      setPlayerData(prev => {
        if (!prev) return prev;
        const newItems = [...(prev.items || [])];
        const i = newItems.indexOf(ballType) !== -1 ? newItems.indexOf(ballType) : newItems.indexOf(legacy);
        if (i !== -1) newItems.splice(i, 1);
        const { isDuplicate, team } = mergeDuplicate(prev.team, {
          uid: `poke\_${Date.now()}\_${Math.random()}`,
          species: enemyData.species, name: enemyData.name, type: enemyData.type, color: enemyData.color,
          bodyType: enemyData.bodyType, hp: enemyData.maxHp, maxHp: enemyData.maxHp, attack: enemyData.attack, fainted: false,
        });
        showNotification(isDuplicate ? `${enemyData.name} merged! +5 HP/ATK` : `${enemyData.name} captured with a ${POKEBALLS\[ballType].name}!`, 'success');
        return { ...prev, team, items: newItems };
      });
      audio.sfx.capture();
      arenaCatchRef.current?.();
      setBattle(prev => prev ? { ...prev, ended: true, result: 'capture' } : prev);
    } else {
      setPlayerData(prev => {
        if (!prev) return prev;
        const newItems = [...(prev.items || [])];
        const i = newItems.indexOf(ballType) !== -1 ? newItems.indexOf(ballType) : newItems.indexOf(legacy);
        if (i !== -1) newItems.splice(i, 1);
        return { ...prev, items: newItems };
      });
      setBattle(prev => prev ? { ...prev, lastAction: `Oh no! ${enemyData.name} broke free!`, turn: 'enemy' } : prev);
      enemyAttackTimeoutRef.current = setTimeout(() => triggerEnemyAttack(), COMBAT.enemyAttackDelay);
    }
  }, [showNotification, triggerEnemyAttack]);

  const handleContinue = useCallback(() => {
    if (enemyAttackTimeoutRef.current) clearTimeout(enemyAttackTimeoutRef.current);
    const result = battleRef.current?.result;
    EventBus.emit('battle-end', result === 'capture' ? 'capture' : result || 'flee');
    setBattle(null);
    setPhase('exploring');
    EventBus.emit('request-pointer-lock');
  }, []);

  const handlePause = useCallback(() => {
    setPhase('paused'); EventBus.emit('game-paused');
    if (document.pointerLockElement) document.exitPointerLock();
  }, []);
  const handleResume = useCallback(() => {
    setPhase('exploring'); EventBus.emit('game-resumed'); EventBus.emit('request-pointer-lock');
  }, []);

  // Return to the home screen — back to the multi-game hub
  const handleSwitchMode = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock();
    EventBus.emit('game-paused');
    setPhase('menu');
    onExitToHub?.();
  }, [onExitToHub]);

  const handleOpenShop = useCallback(() => {
    setOverlay('shop'); if (document.pointerLockElement) document.exitPointerLock();
  }, []);
  const handleOpenInventory = useCallback(() => {
    setOverlay('inventory'); if (document.pointerLockElement) document.exitPointerLock();
  }, []);
  const handleCloseOverlay = useCallback(() => { setOverlay(null); EventBus.emit('request-pointer-lock'); }, []);

  // ─── Keyboard shortcuts ───
  // E = Team/Inventory, P = Shop, M = Switch mode, Esc = Pause (Esc also closes overlays / resumes)
  const overlayRef = useRef(null);
  overlayRef.current = overlay || (arenaOpen ? 'arena' : null);
  useEffect(() => {
    const onKey = (e) => {
      const ph = phaseRef.current;
      if (e.code === 'Escape') {
        if (overlayRef.current) { handleCloseOverlay(); return; }
        if (ph === 'exploring') { handlePause(); return; }
        if (ph === 'paused') { handleResume(); return; }
        return;
      }
      if (ph !== 'exploring' || overlayRef.current) return;
      if (e.code === 'KeyE') handleOpenInventory();
      else if (e.code === 'KeyP') handleOpenShop();
      else if (e.code === 'KeyM') handleSwitchMode();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlePause, handleResume, handleOpenInventory, handleOpenShop, handleSwitchMode, handleCloseOverlay]);

  const handleBuy = useCallback((itemId) => {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return;
    const currency = item.currency || 'money';
    setPlayerData(prev => {
      if (!prev) return prev;
      const balance = currency === 'money' ? prev.money : prev.exp;
      if (balance < item.price) { showNotification('Not enough ' + (currency === 'money' ? 'money' : 'EXP') + '!', 'error'); return prev; }
      showNotification(`Bought ${item.name}!`, 'success');
      switch (itemId) {
        case 'random_box': {
          const species = getRandomSpecies(true);
          const { team } = mergeDuplicate(prev.team, {
            uid: `poke\_${Date.now()}\_${Math.random()}`,
            species: species.id, name: species.name, type: species.type, color: species.color, bodyType: species.bodyType,
            hp: getStageStats(species).hp, maxHp: getStageStats(species).hp, attack: getStageStats(species).attack, fainted: false,
          });
          return { ...prev, money: prev.money - item.price, team };
        }
        case 'healing_potion':
          return { ...prev, money: prev.money - item.price, items: [...(prev.items || []), 'healing_potion'] };
        case 'evolution_stone': {
          const stone = EVOLUTION_STONES[Math.floor(Math.random() * EVOLUTION_STONES.length)];
          return { ...prev, money: prev.money - item.price, stones: [...prev.stones, stone.type] };
        }
        case 'hp_upgrade':
        case 'atk_upgrade':
          // Stored as an item — used from Team → Items with a Yes/No confirm
          return { ...prev, money: prev.money - item.price, items: [...(prev.items || []), itemId] };
        case 'random_pokeball': {
          const purchases = (prev.random_ball_purchases || 0) + 1;
          const ball = rollRandomBall(purchases);
          showNotification(`Got a ${POKEBALLS\[ball].name}!${ball === 'admin\_ball' ? ' 🏆' : ''}`, 'success');
          return { ...prev, exp: prev.exp - item.price, items: [...(prev.items || []), ball], random_ball_purchases: purchases };
        }
        default: return prev;
      }
    });
  }, [showNotification]);

  const handleUseStone = useCallback((pokemonUid, stoneType) => {
    setPlayerData(prev => {
      if (!prev) return prev;
      const stoneIdx = prev.stones.indexOf(stoneType);
      if (stoneIdx === -1) return prev;
      const pokemon = prev.team.find(p => p.uid === pokemonUid);
      if (!pokemon) return prev;
      if (!canEvolveWith(pokemon, stoneType)) {
        showNotification(`${pokemon.name} can't evolve with ${stoneType} Stone!`, 'error');
        return prev;
      }
      const evolved = getEvolution(pokemon, stoneType);
      if (!evolved) {
        showNotification(`${pokemon.name} can't evolve with ${stoneType} Stone!`, 'error');
        return prev;
      }
      // Block evolution if the evolved form would duplicate a team member
      if (prev.team.some(q => q.uid !== pokemonUid && q.species === evolved.id)) {
        showNotification(`Can't evolve — ${evolved.name} is already on your team!`, 'error');
        return prev;
      }
      const newStones = [...prev.stones]; newStones.splice(stoneIdx, 1);
      const isShiny = stoneType === 'Shiny';
      const newTeam = prev.team.map(p => p.uid === pokemonUid ? {
        ...p, species: evolved.id, name: evolved.name, type: evolved.type, color: evolved.color,
        bodyType: evolved.bodyType, fainted: false, ...(isShiny ? { shiny: true } : {}),
      } : p);
      showNotification(isShiny ? `${pokemon.name} evolved into Shiny ${evolved.name}!` : `${pokemon.name} evolved into ${evolved.name}!`, 'success');
      return { ...prev, team: newTeam, stones: newStones };
    });
  }, [showNotification]);

  // One click: evolve as many of the best Pokémon as possible (duplicate-safe, stone-limited)
  const handleEvolveBest = useCallback(() => {
    setPlayerData(prev => {
      if (!prev) return prev;
      const res = evolveBestTeam(prev.team, prev.stones);
      if (res.evolved.length === 0) {
        showNotification('Nothing can evolve — catch new Pokémon or find more stones!', 'error');
        return prev;
      }
      showNotification(`✨ Evolved ${res.evolved.length} Pokémon${res.evolved.length === 1 ? `: ${res.evolved[0].from} → ${res.evolved[0].to}` : '!'}`, 'success');
      return { ...prev, team: res.team, stones: res.stones };
    });
  }, [showNotification]);

  const handleSetActive = useCallback((index) => {
    setPlayerData(prev => prev ? { ...prev, active_index: index } : prev);
    showNotification('Active Pokémon changed!', 'success');
  }, [showNotification]);

  // Party system — up to 6 active members, everyone else lives in storage boxes
  const handleToggleParty = useCallback((uid) => {
    setPlayerData(prev => {
      if (!prev) return prev;
      const p = prev.team.find(q => q.uid === uid);
      if (!p) return prev;
      if (p.inParty) return { ...prev, team: prev.team.map(q => q.uid === uid ? { ...q, inParty: false } : q) };
      if (prev.team.filter(q => q.inParty).length >= 6) {
        showNotification('Party is full (6)! Send one to the box first.', 'error');
        return prev;
      }
      return { ...prev, team: prev.team.map(q => q.uid === uid ? { ...q, inParty: true } : q) };
    });
  }, [showNotification]);

  const handleUseItem = useCallback((itemType) => {
    setPlayerData(prev => {
      if (!prev) return prev;
      const items = [...(prev.items || [])];
      const idx = items.indexOf(itemType);
      if (idx === -1) return prev;
      if (itemType === 'healing_potion') {
        items.splice(idx, 1);
        const activeIdx = prev.active_index ?? 0;
        const newTeam = [...prev.team];
        if (newTeam[activeIdx]) newTeam[activeIdx] = { ...newTeam[activeIdx], hp: newTeam[activeIdx].maxHp, fainted: false };
        showNotification(`${newTeam\[activeIdx]?.name} fully healed!`, 'success');
        return { ...prev, team: newTeam, items };
      }
      if (itemType === 'hp_upgrade') {
        items.splice(idx, 1);
        const activeIdx = prev.active_index ?? 0;
        const newTeam = [...prev.team];
        if (newTeam[activeIdx]) { const m = newTeam[activeIdx].maxHp + 5; newTeam[activeIdx] = { ...newTeam[activeIdx], maxHp: m, hp: m, fainted: false }; }
        showNotification(`${newTeam\[activeIdx]?.name} gained +5 HP!`, 'success');
        return { ...prev, team: newTeam, items };
      }
      if (itemType === 'atk_upgrade') {
        items.splice(idx, 1);
        const activeIdx = prev.active_index ?? 0;
        const newTeam = [...prev.team];
        if (newTeam[activeIdx]) newTeam[activeIdx] = { ...newTeam[activeIdx], attack: newTeam[activeIdx].attack + 3 };
        showNotification(`${newTeam\[activeIdx]?.name} gained +3 ATK!`, 'success');
        return { ...prev, team: newTeam, items };
      }
      return prev;
    });
  }, [showNotification]);

  const handleExpToMoney = useCallback(() => {
    setPlayerData(prev => {
      if (!prev || prev.exp < EXP_TO_MONEY.exp) { showNotification('Not enough EXP!', 'error'); return prev; }
      showNotification(`Converted ${EXP\_TO\_MONEY.exp} EXP → $${EXP\_TO\_MONEY.money}!`, 'success');
      return { ...prev, exp: prev.exp - EXP_TO_MONEY.exp, money: prev.money + EXP_TO_MONEY.money };
    });
  }, [showNotification]);

  const handleClaimDaily = useCallback(() => {
    setPlayerData(prev => {
      if (!prev || !dailyReward) return prev;
      const today = new Date().toISOString().split('T')[0];
      const reward = dailyReward.reward;
      let updated = { ...prev, last_login_date: today, daily_streak_day: dailyReward.day };
      switch (reward.type) {
        case 'money': updated.money = (prev.money || 0) + reward.amount; break;
        case 'exp': updated.exp = (prev.exp || 0) + reward.amount; break;
        case 'item': updated.items = [...(prev.items || []), reward.item]; break;
        case 'pokemon': {
          const species = getRandomSpecies(true);
          const { team } = mergeDuplicate(prev.team, {
            uid: `poke\_${Date.now()}\_${Math.random()}`,
            species: species.id, name: species.name, type: species.type, color: species.color, bodyType: species.bodyType,
            hp: getStageStats(species).hp, maxHp: getStageStats(species).hp, attack: getStageStats(species).attack, fainted: false,
          });
          updated.team = team; break;
        }
        case 'stone': {
          const stone = EVOLUTION_STONES[Math.floor(Math.random() * EVOLUTION_STONES.length)];
          updated.stones = [...prev.stones, stone.type]; break;
        }
      }
      return updated;
    });
    setDailyReward(null);
  }, [dailyReward]);

  const handleClickToResume = useCallback(() => { EventBus.emit('request-pointer-lock'); }, []);

  // ─── Admin (game creator only) ───
  const handleOpenAdmin = useCallback(() => {
    setOverlay('admin'); if (document.pointerLockElement) document.exitPointerLock();
  }, []);
  const handleAdminToggle = useCallback((key) => {
    setAdminState(prev => {
      const next = !prev[key];
      world[key] = next;
      return { ...prev, [key]: next };
    });
  }, []);
  const handleAdminBuildSelect = useCallback((type) => {
    world.buildObjectType = type;
    setAdminState(prev => ({ ...prev, buildObjectType: type }));
  }, []);
  const handleAdminSpawn = useCallback(() => {
    EventBus.emit('admin-spawn-pokemon');
    showNotification('✨ A wild Pokémon spawned nearby!', 'success');
  }, [showNotification]);
  const handleAdminHeal = useCallback(() => {
    setPlayerData(prev => prev ? { ...prev, team: prev.team.map(p => ({ ...p, hp: p.maxHp, fainted: false })) } : prev);
    showNotification('💚 Team fully healed!', 'success');
  }, [showNotification]);
  const handleAdminMoney = useCallback(() => {
    setPlayerData(prev => prev ? { ...prev, money: prev.money + 10000 } : prev);
    showNotification('💰 +$10,000!', 'success');
  }, [showNotification]);
  const handleAdminExp = useCallback(() => {
    setPlayerData(prev => prev ? { ...prev, exp: prev.exp + 1000 } : prev);
    showNotification('⭐ +1,000 EXP!', 'success');
  }, [showNotification]);
  const handleAdminStone = useCallback(() => {
    const stone = EVOLUTION_STONES[Math.floor(Math.random() * EVOLUTION_STONES.length)];
    setPlayerData(prev => prev ? { ...prev, stones: [...prev.stones, stone.type] } : prev);
    showNotification(`Got a ${stone.type} Stone!`, 'success');
  }, [showNotification]);
  const handleAdminPokemon = useCallback(() => {
    setPlayerData(prev => {
      if (!prev) return prev;
      const species = getRandomSpecies(true);
      const st = getStageStats(species);
      const { isDuplicate, team } = mergeDuplicate(prev.team, {
        uid: `poke\_${Date.now()}\_${Math.random()}`,
        species: species.id, name: species.name, type: species.type, color: species.color, bodyType: species.bodyType,
        hp: st.hp, maxHp: st.hp, attack: st.attack, fainted: false,
      });
      showNotification(isDuplicate ? `${species.name} merged! +5 HP/ATK` : `${species.name} joined your team!`, 'success');
      return { ...prev, team };
    });
  }, [showNotification]);
  const handleAdminBoostHp = useCallback(() => {
    setPlayerData(prev => {
      if (!prev) return prev;
      const idx = prev.active_index ?? 0;
      const newTeam = [...prev.team];
      if (newTeam[idx]) { const m = newTeam[idx].maxHp + 10; newTeam[idx] = { ...newTeam[idx], maxHp: m, hp: Math.min(m, newTeam[idx].hp + 10) }; }
      showNotification(`${newTeam\[idx]?.name} gained +10 max HP!`, 'success');
      return { ...prev, team: newTeam };
    });
  }, [showNotification]);
  const handleAdminBoostAtk = useCallback(() => {
    setPlayerData(prev => {
      if (!prev) return prev;
      const idx = prev.active_index ?? 0;
      const newTeam = [...prev.team];
      if (newTeam[idx]) newTeam[idx] = { ...newTeam[idx], attack: newTeam[idx].attack + 10 };
      showNotification(`${newTeam\[idx]?.name} gained +10 ATK!`, 'success');
      return { ...prev, team: newTeam };
    });
  }, [showNotification]);
  const handleAdminGiveBall = useCallback((ball) => {
    setPlayerData(prev => prev ? { ...prev, items: [...(prev.items || []), ball] } : prev);
    showNotification(`Got a ${POKEBALLS\[ball].name}!`, 'success');
  }, [showNotification]);
  // Creator-only: grant every species in the Pokédex (plus Jasytherion Aetherium)
  const handleAdminGiveAll = useCallback(() => {
    setPlayerData(prev => {
      if (!prev) return prev;
      let team = prev.team;
      let added = 0;
      POKEMON_SPECIES.forEach(s => {
        if (team.some(p => p.species === s.id)) return;
        const st = getStageStats(s.id);
        team = [...team, {
          uid: `poke\_${Date.now()}\_${s.id}`,
          species: s.id, name: s.name, type: s.type, color: s.color, bodyType: s.bodyType,
          hp: st.hp, maxHp: st.hp, attack: st.attack, fainted: false,
        }];
        added++;
      });
      showNotification(added > 0 ? `🎁 Received ${added} Pokémon — complete Pokédex!` : '✅ You already have every Pokémon!', 'success');
      return { ...prev, team };
    });
  }, [showNotification]);
  // ─── Duel Arena ───
  const handleOpenArena = useCallback(() => {
    setArenaOpen(true); if (document.pointerLockElement) document.exitPointerLock();
  }, []);
  // ─── Friends ───
  const handleOpenFriends = useCallback(() => {
    setOverlay('friends'); if (document.pointerLockElement) document.exitPointerLock();
  }, []);
  const handleDuelFriend = useCallback((record) => {
    setOverlay(null); setDuelForced(record); setArenaOpen(true);
  }, []);
  const handleDuelEnd = useCallback((won) => {
    const pd = playerDataRef.current;
    if (!pd) return;
    const res = applyDuelOutcome(pd, won);
    setPlayerData(res.data);
    res.messages.forEach(m => showNotification(m, won ? 'success' : 'error'));
  }, [showNotification]);
  const handleGiveUpStreak = useCallback(() => {
    setPlayerData(prev => prev ? { ...prev, duel_streak: 0, duel_locked: false } : prev);
    showNotification('Streak given up — you can duel again!', 'info');
  }, [showNotification]);
  // ─── Admin → other players ───
  const handleAdminGivePlayerMoney = useCallback((p) => {
    base44.entities.PlayerData.update(p.id, { money: (p.money || 0) + 10000 })
      .then(() => {
        showNotification(`Gave $10,000 to ${p.username || 'player'}!`, 'success');
        setPlayers(prev => prev.map(q => q.id === p.id ? { ...q, money: (q.money || 0) + 10000 } : q));
      })
      .catch(() => showNotification('Could not update that player.', 'error'));
  }, [showNotification]);
  const handleAdminGivePlayerPokemon = useCallback((p) => {
    const species = getRandomSpecies(true);
    const st = getStageStats(species);
    const { team } = mergeDuplicate(p.team || [], {
      uid: `admin\_gift\_${Date.now()}\_${species.id}`,
      species: species.id, name: species.name, type: species.type, color: species.color, bodyType: species.bodyType,
      hp: st.hp, maxHp: st.hp, attack: st.attack, fainted: false,
    });
    base44.entities.PlayerData.update(p.id, { team })
      .then(() => {
        showNotification(`Gave ${species.name} to ${p.username || 'player'}!`, 'success');
        setPlayers(prev => prev.map(q => q.id === p.id ? { ...q, team } : q));
      })
      .catch(() => showNotification('Could not update that player.', 'error'));
  }, [showNotification]);
  const handleAdminDuelPlayer = useCallback((p) => {
    setDuelForced(p); setOverlay(null); setArenaOpen(true);
  }, []);
  const handleAdminBanPlayer = useCallback((p) => {
    base44.entities.PlayerData.update(p.id, { banned: !p.banned })
      .then(() => {
        showNotification(p.banned ? `Unbanned ${p.username || 'player'}.` : `Banned ${p.username || 'player'}.`, 'success');
        setPlayers(prev => prev.map(q => q.id === p.id ? { ...q, banned: !q.banned } : q));
      })
      .catch(() => showNotification('Could not update that player.', 'error'));
  }, [showNotification]);
  const handleAdminClearObjects = useCallback(() => {
    EventBus.emit('admin-clear-objects');
    showNotification('🧹 Built objects cleared!', 'success');
  }, [showNotification]);
  // Ball inventory for battle — legacy 'master_pokeball' items count as Master Balls
  const ballCounts = (playerData?.items || []).reduce((acc, i) => {
    const key = i === 'master_pokeball' ? 'master_ball' : i;
    if (POKEBALLS[key]) acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <main className="game-page">
      <div className="game-frame">
        <GameContainer />
        {/* Pointer-lock target — pointer lock only engages programmatically via this
            hidden element, so the mouse stays visible on menus/battles/overlays */}
        <div id="pointer-lock-target" className="hidden" aria-hidden="true" />
        <div className="absolute inset-0 pointer-events-none">
          {phase === 'menu' && (
            <StartScreen onStart={handleStart} onEnterWorld={handleEnterWorld}
              playerData={playerData} isAdmin={isAdmin} />
          )}
          {phase === 'exploring' && !overlay && (
            <HUD playerData={playerData} dayNight={dayNight} onOpenShop={handleOpenShop}
              onOpenInventory={handleOpenInventory} onPause={handlePause} pointerLocked={pointerLocked}
              onClickToResume={handleClickToResume} saveStatus={saveStatus}
              isAdmin={isAdmin} onOpenAdmin={handleOpenAdmin} onOpenArena={handleOpenArena} onSwitchMode={handleSwitchMode}
              onOpenFriends={handleOpenFriends}
              onOpenHub={onExitToHub}
              soundOn={soundOn} onToggleSound={toggleSound} />
          )}
          {phase === 'battle' && battle && (
            <BattleOverlay battle={battle}
              ballCounts={ballCounts} onMove={handleMove} onSpecial={handleSpecial}
              onFlee={handleFlee} onUseBall={handleUseBall} onContinue={handleContinue}
              isAdmin={isAdmin} onUltra={handleUltra} />
          )}
          {phase === 'paused' && <PauseOverlay playerData={playerData} onResume={handleResume} saveStatus={saveStatus} />}
          {overlay === 'shop' && (
            <ShopOverlay playerData={playerData} onBuy={handleBuy} onExpToMoney={handleExpToMoney} onClose={handleCloseOverlay} />
          )}
          {overlay === 'friends' && (
            <FriendsPanel playerData={playerData} players={players}
              onClose={handleCloseOverlay} onDuelFriend={handleDuelFriend} />
          )}
          {overlay === 'inventory' && (
            <InventoryOverlay playerData={playerData} onUpgrade={handleUseStone} onSetActive={handleSetActive}
              onClose={handleCloseOverlay} items={playerData?.items || []} onUseItem={handleUseItem} onEvolveBest={handleEvolveBest}
              onToggleParty={handleToggleParty} />
          )}
          {overlay === 'admin' && isAdmin && (
            <AdminPanel adminState={adminState} onToggle={handleAdminToggle}
              onSelectBuildObject={handleAdminBuildSelect} onSpawnPokemon={handleAdminSpawn}
              onHealTeam={handleAdminHeal} onAddMoney={handleAdminMoney}
              onAddExp={handleAdminExp} onAddStone={handleAdminStone} onAddPokemon={handleAdminPokemon}
              onBoostHp={handleAdminBoostHp} onBoostAtk={handleAdminBoostAtk} onGiveBall={handleAdminGiveBall}
              onGiveAll={handleAdminGiveAll}
              onClearObjects={handleAdminClearObjects} onClose={handleCloseOverlay}
              players={players.filter(p => p.id !== playerData?.id)}
              onGivePlayerMoney={handleAdminGivePlayerMoney} onGivePlayerPokemon={handleAdminGivePlayerPokemon}
              onDuelPlayer={handleAdminDuelPlayer} onBanPlayer={handleAdminBanPlayer} />
          )}
          {dailyReward && (
            <DailyRewardOverlay streakDay={dailyReward.day} reward={dailyReward.reward} onClaim={handleClaimDaily} />
          )}
          {arenaOpen && (
            <DuelArena playerData={playerData} mode={playerData?.difficulty}
              friends={(playerData?.friends || []).map(f => players.find(p => p.id === f.id)).filter(Boolean)}
              players={players.filter(p => p.id !== playerData?.id)} forcedOpponent={duelForced}
              onDuelEnd={handleDuelEnd} onGiveUpStreak={handleGiveUpStreak}
              onClose={() => { setArenaOpen(false); setDuelForced(null); }} />
          )}
          {playerData?.banned && (
            <div className="absolute inset-0 bg-black/85 flex items-center justify-center pointer-events-auto z-50">
              <div className="text-center text-white max-w-sm px-6">
                <div className="text-5xl mb-4">🚫</div>
                <h2 className="text-2xl font-bold text-red-400 mb-2">You are banned</h2>
                <p className="text-slate-300">An admin banned this account. Contact the game creator.</p>
              </div>
            </div>
          )}
          {notification && (
            <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg font-bold text-white shadow-lg pointer-events-none z-50 ${
              notification.type === 'success' ? 'bg-green-600' : notification.type === 'error' ? 'bg-red-600' : 'bg-slate-700'
            }`}>{notification.message}</div>
          )}
        </div>
      </div>
    </main>
  );
}
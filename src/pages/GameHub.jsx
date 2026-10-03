import { useState, useEffect, useCallback, useRef } from 'react';
import GamePage from '@/pages/GamePage';
import TossGame from '@/pages/TossGame';
import QuizGame from '@/pages/QuizGame';
import ObbyTower from '@/pages/ObbyTower';
import StealPokemon from '@/pages/StealPokemon';
import PokebiesDefense from '@/pages/PokebiesDefense';
import { PlayersPanel } from '@/components/hub/PlayersPanel';
import { ADMIN_EMAILS } from '@/game/config';
import { checkAchievements } from '@/components/arcade/arcadeConfig';
import { TopBar } from '@/components/hub/TopBar';
import { HubMenu } from '@/components/hub/HubMenu';
import { LandingPage } from '@/components/hub/LandingPage';
import { AuthPage } from '@/components/hub/AuthPage';
import { ProfilePanel } from '@/components/hub/ProfilePanel';
import { loadProfile, saveProfile, mergeProfile } from '@/components/hub/profile';
import { base44 } from '@/api/base44Client';
import * as audio from '@/game/audio';

const MUSIC_BY_VIEW = { landing: 'hub', auth: 'hub', hub: 'hub', toss: 'toss', quiz: 'quiz', obby: 'obby', steal: 'steal', lane: 'lane', profile: 'hub' };

// Multi-game hub — landing → Jasytherion → auth (sign up / login) → hub.
// Every profile is bound to the logged-in account (localStorage per user id
// plus a cloud ArcadeProfile record), so accounts never overwrite each other.
export default function GameHub() {
  const [view, setView] = useState('landing');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(loadProfile(null));
  const [soundOn, setSoundOn] = useState(audio.isEnabled());
  const [playersOpen, setPlayersOpen] = useState(false);
  const isAdmin = !!user && ADMIN_EMAILS.includes((user.email || '').toLowerCase());

  // Load the signed-in account and its saved profile from the cloud
  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
      } catch (e) { /* not signed in yet — the landing/auth pages handle it */ }
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      let local = loadProfile(user.id);
      try {
        const recs = await base44.entities.ArcadeProfile.filter({}, '-updated_date', 1);
        const cloud = recs[0]?.profile;
        if (cloud && typeof cloud === 'object') local = { ...local, ...cloud };
      } catch (e) { /* offline — localStorage keeps it */ }
      setProfile(mergeProfile(user.id, local));
    })();
  }, [user]);

  // Auto-save — localStorage instantly, cloud copy (per-account) debounced
  const saveTimeoutRef = useRef(null);
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      // Auto-claim achievements across ALL games, paying coin rewards
      const res = checkAchievements(profile);
      const latest = res.newly.length ? res.profile : profile;
      if (res.newly.length) setProfile(res.profile);
      saveProfile(latest, user?.id || null);
      if (!user) return;
      try {
        const recs = await base44.entities.ArcadeProfile.filter({}, '-updated_date', 1);
        const row = {
          tossHigh: latest.tossHigh || 0, quizHigh: latest.quizHigh || 0,
          arenaCatches: latest.arenaCatches || 0, tossCatches: latest.tossCatches || 0,
          display_name: user.email || '', profile: latest,
        };
        if (recs[0]) await base44.entities.ArcadeProfile.update(recs[0].id, row);
        else await base44.entities.ArcadeProfile.create(row);
      } catch (e) { /* offline — localStorage keeps it */ }
    }, 1000);
  }, [profile, user]);

  const updateProfile = useCallback((fn) => {
    setProfile(prev => {
      const next = typeof fn === 'function' ? fn(prev) : { ...prev, ...fn };
      saveProfile(next, user?.id || null);
      return next;
    });
  }, [user]);

  // Themed music per screen
  useEffect(() => {
    if (view !== 'arena') audio.startMusic(MUSIC_BY_VIEW[view] || 'hub');
  }, [view]);

  const toggleSound = useCallback(() => {
    setSoundOn(prev => {
      const on = !prev;
      audio.setEnabled(on);
      if (on) audio.startMusic(MUSIC_BY_VIEW[view] || 'hub');
      return on;
    });
  }, [view]);

  const goHome = useCallback(() => { audio.sfx.click(); setView('hub'); }, []);
  const handleArenaCatch = useCallback(() => {
    updateProfile(p => ({ ...p, arenaCatches: (p.arenaCatches || 0) + 1, catches: (p.catches || 0) + 1 }));
  }, [updateProfile]);
  const handleLogout = useCallback(() => {
    audio.sfx.click();
    base44.auth.logout(window.location.origin + '/');
  }, []);

  if (view === 'landing') {
    return <LandingPage onEnter={() => setView(user ? 'hub' : 'auth')} />;
  }
  if (view === 'auth') {
    return <AuthPage onBack={() => setView('landing')}
      onDone={(u) => { if (u) setUser(u); setView('hub'); }} />;
  }
  if (view === 'arena') {
    return <GamePage onExitToHub={goHome} onArenaCatch={handleArenaCatch} />;
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-950">
      <TopBar profile={profile} view={view} onNav={setView}
        showHome={view !== 'hub'} onHome={goHome}
        soundOn={soundOn} onToggleSound={toggleSound}
        user={user} onLogout={handleLogout} />
      <div className="flex-1 overflow-auto">
        {view === 'hub' && <HubMenu profile={profile} onPlay={setView} />}
        {view === 'toss' && <TossGame profile={profile} onProfile={updateProfile} />}
        {view === 'quiz' && <QuizGame profile={profile} onProfile={updateProfile} />}
        {view === 'obby' && <ObbyTower profile={profile} onProfile={updateProfile} />}
        {view === 'steal' && <StealPokemon profile={profile} onProfile={updateProfile} />}
        {view === 'lane' && <PokebiesDefense profile={profile} onProfile={updateProfile} />}
        {view === 'profile' && <ProfilePanel profile={profile} user={user} onLogout={handleLogout} />}
      </div>
      {/* Creator-only: view every player's progress across all games (bottom-right) */}
      {isAdmin && view !== 'profile' && !playersOpen && (
        <button onClick={() => { audio.sfx.click(); setPlayersOpen(true); }}
          className="fixed bottom-4 right-4 z-40 px-4 py-2.5 bg-yellow-400 text-slate-900 rounded-xl font-extrabold
            shadow-[4px_4px_0_rgba(0,0,0,0.5)] border-2 border-black hover:scale-105 transition-transform">
          👥 View Players
        </button>
      )}
      {playersOpen && <PlayersPanel onClose={() => setPlayersOpen(false)} />}
    </div>
  );
}
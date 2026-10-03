// ─── Retro synth audio — everything is generated live with WebAudio ───
// Chiptune-style effects + themed looping music for each screen:
// hub menu, 3D exploration, battles, Pokéball Toss and the Quiz.
let ctx = null, master = null, musicTimer = null, step = 0, currentTrack = null;

export function isEnabled() {
  try { return localStorage.getItem('poke_sound') !== '0'; } catch (e) { return true; }
}

export function setEnabled(on) {
  try { localStorage.setItem('poke_sound', on ? '1' : '0'); } catch (e) { /* ignore */ }
  if (master) master.gain.value = on ? 1 : 0;
}

function ensure() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = isEnabled() ? 1 : 0;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function tone(freq, dur, { type = 'square', vol = 0.06, delay = 0, slide = 0 } = {}) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  click() { ensure(); tone(520, 0.06); },
  move() { ensure(); tone(340, 0.08, { slide: 220 }); tone(680, 0.09, { delay: 0.07 }); },
  superHit() { ensure(); tone(880, 0.07, { delay: 0.02 }); tone(1175, 0.1, { delay: 0.09 }); },
  ball() { ensure(); tone(700, 0.07, { slide: -300 }); },
  capture() { ensure(); [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, { delay: i * 0.09, vol: 0.07 })); },
  win() { ensure(); [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.11, { delay: i * 0.08, vol: 0.07 })); },
  lose() { ensure(); [392, 330, 262, 196].forEach((f, i) => tone(f, 0.16, { delay: i * 0.12, type: 'sawtooth', vol: 0.05 })); },
  pickup() { ensure(); [880, 1109, 1319].forEach((f, i) => tone(f, 0.09, { delay: i * 0.06, type: 'triangle', vol: 0.06 })); },
  correct() { ensure(); [659, 784, 988].forEach((f, i) => tone(f, 0.09, { delay: i * 0.07, vol: 0.06 })); },
  wrong() { ensure(); tone(220, 0.18, { type: 'sawtooth', vol: 0.05, slide: -80 }); },
  throwBall() { ensure(); tone(440, 0.12, { slide: 350, vol: 0.05 }); },
};

// ─── Themed music tracks — each is a 16-step lead melody + 8-step bass loop ───
// 0 = rest. Volumes stay low so they sit behind the game.
const TRACKS = {
  // Cheerful hub theme (C major)
  hub: {
    stepMs: 210,
    lead: [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 659, 698, 880, 1047, 880],
    bass: [131, 131, 175, 175, 196, 196, 165, 165],
    leadType: 'square', bassType: 'triangle', leadVol: 0.02, bassVol: 0.03,
  },
  // Peaceful exploration (Am–F–C–G arpeggio)
  explore: {
    stepMs: 260,
    lead: [220, 262, 330, 262, 175, 220, 262, 220, 196, 262, 330, 262, 247, 294, 392, 294],
    bass: [110, 110, 87, 87, 98, 98, 123, 123],
    leadType: 'triangle', bassType: 'sine', leadVol: 0.022, bassVol: 0.03,
  },
  // Tense battle (A minor, driving)
  battle: {
    stepMs: 150,
    lead: [440, 440, 523, 440, 392, 392, 494, 392, 349, 349, 440, 349, 392, 494, 587, 494],
    bass: [110, 0, 110, 0, 98, 0, 98, 0],
    leadType: 'square', bassType: 'sawtooth', leadVol: 0.02, bassVol: 0.032,
  },
  // Bouncy arcade toss theme
  toss: {
    stepMs: 170,
    lead: [392, 523, 659, 523, 440, 587, 740, 587, 392, 523, 659, 523, 523, 659, 784, 1047],
    bass: [98, 98, 131, 131, 110, 110, 147, 147],
    leadType: 'square', bassType: 'triangle', leadVol: 0.02, bassVol: 0.03,
  },
  // Ticking quiz pressure
  quiz: {
    stepMs: 220,
    lead: [880, 0, 660, 0, 880, 0, 660, 0, 784, 0, 587, 0, 784, 0, 660, 660],
    bass: [165, 165, 165, 165, 147, 147, 147, 147],
    leadType: 'square', bassType: 'triangle', leadVol: 0.018, bassVol: 0.028,
  },
  // Climbing obby adventure (E minor, ascending)
  obby: {
    stepMs: 190,
    lead: [330, 392, 494, 392, 330, 440, 523, 440, 392, 494, 587, 494, 440, 523, 659, 523],
    bass: [82, 82, 110, 110, 98, 98, 123, 123],
    leadType: 'triangle', bassType: 'sine', leadVol: 0.02, bassVol: 0.03,
  },
  // Sneaky heist groove (pizzicato feel)
  steal: {
    stepMs: 240,
    lead: [392, 0, 466, 0, 392, 0, 349, 0, 392, 0, 466, 587, 466, 0, 349, 0],
    bass: [98, 0, 98, 0, 87, 0, 87, 0],
    leadType: 'triangle', bassType: 'sine', leadVol: 0.02, bassVol: 0.03,
  },
  // Lane defense march
  lane: {
    stepMs: 160,
    lead: [262, 262, 349, 262, 294, 294, 392, 294, 262, 262, 349, 262, 220, 262, 330, 262],
    bass: [87, 87, 87, 87, 78, 78, 78, 78],
    leadType: 'square', bassType: 'sawtooth', leadVol: 0.018, bassVol: 0.03,
  },
};

export function startMusic(track = 'explore') {
  ensure();
  if (musicTimer && track === currentTrack) return;
  stopMusic();
  currentTrack = track;
  const T = TRACKS[track] || TRACKS.explore;
  step = 0;
  musicTimer = setInterval(() => {
    if (!ctx || ctx.state === 'suspended') return;
    const lead = T.lead[step % 16];
    if (lead) tone(lead, T.stepMs / 1000 * 0.9, { type: T.leadType, vol: T.leadVol });
    if (step % 2 === 0) {
      const bass = T.bass[(step / 2) % 8];
      if (bass) tone(bass, T.stepMs / 1000 * 1.7, { type: T.bassType, vol: T.bassVol });
    }
    step = (step + 1) % 16;
  }, T.stepMs);
}

export function stopMusic() {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  currentTrack = null;
}
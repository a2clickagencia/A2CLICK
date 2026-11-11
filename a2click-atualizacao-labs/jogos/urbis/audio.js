'use strict';
// ===================== ÁUDIO PROCEDURAL (efeitos + trilha ambiente generativa) =====================
let AC = null, MASTER = null, MUSIC_GAIN = null, SFX_GAIN = null, musicTimer = null;
function audioInit() {
  if (AC) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    MASTER = AC.createGain(); MASTER.gain.value = SETTINGS.vol; MASTER.connect(AC.destination);
    SFX_GAIN = AC.createGain(); SFX_GAIN.gain.value = 0.5; SFX_GAIN.connect(MASTER);
    MUSIC_GAIN = AC.createGain(); MUSIC_GAIN.gain.value = 0.16;
    const delay = AC.createDelay(); delay.delayTime.value = 0.42; const fb = AC.createGain(); fb.gain.value = 0.35;
    const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    MUSIC_GAIN.connect(lp); lp.connect(MASTER); lp.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(MASTER);
    if (SETTINGS.music) startMusic();
  } catch (e) { AC = null; }
}
function setVolume(v) { SETTINGS.vol = v; if (MASTER) MASTER.gain.value = v; }
function tone(freq, dur, type, vol, when, slide) {
  if (!AC) return;
  const t = AC.currentTime + (when || 0), o = AC.createOscillator(), g = AC.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || 0.3, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(SFX_GAIN); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, vol, fq) {
  if (!AC) return;
  const b = AC.createBuffer(1, AC.sampleRate * dur, AC.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
  const s = AC.createBufferSource(); s.buffer = b; const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = fq || 800;
  const g = AC.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(SFX_GAIN); s.start();
}
function sfx(name) {
  if (!SETTINGS.sfx || !AC) return;
  switch (name) {
    case 'click': tone(880, 0.05, 'triangle', 0.12); break;
    case 'build': tone(220, 0.08, 'square', 0.08); tone(330, 0.12, 'triangle', 0.12, 0.05); noise(0.12, 0.25, 1200); break;
    case 'zone': tone(520, 0.06, 'sine', 0.12); tone(660, 0.08, 'sine', 0.1, 0.04); break;
    case 'road': noise(0.08, 0.18, 600); tone(160, 0.06, 'triangle', 0.08); break;
    case 'bulldoze': noise(0.35, 0.5, 500); tone(90, 0.3, 'sawtooth', 0.08, 0, 50); break;
    case 'err': tone(200, 0.15, 'square', 0.1); tone(150, 0.2, 'square', 0.1, 0.1); break;
    case 'cash': tone(1200, 0.08, 'triangle', 0.15); tone(1600, 0.15, 'triangle', 0.15, 0.07); break;
    case 'alarm': for (let k = 0; k < 4; k++) { tone(700, 0.18, 'sawtooth', 0.07, k * 0.36, 950); tone(950, 0.18, 'sawtooth', 0.07, k * 0.36 + 0.18, 700); } break;
    case 'boom': noise(1.6, 0.9, 300); tone(60, 1.2, 'sine', 0.4, 0, 30); break;
    case 'thunder': noise(2.2, 0.6, 220); break;
    case 'unlock': [523, 659, 784, 1046].forEach((f, k) => tone(f, 0.25, 'triangle', 0.12, k * 0.09)); break;
    case 'event': tone(440, 0.2, 'sine', 0.14); tone(554, 0.3, 'sine', 0.14, 0.15); break;
  }
}
const SCALES = [[0, 2, 4, 7, 9], [0, 3, 5, 7, 10], [0, 2, 4, 5, 7, 9, 11]];
let musicStep = 0, chordRoot = 0;
function startMusic() {
  if (!AC || musicTimer) return;
  const prog = [0, -3, 5, -5, 2, -2, 4, 0];
  musicTimer = setInterval(() => {
    if (!SETTINGS.music || AC.state !== 'running') return;
    const t = AC.currentTime + 0.05, base = 196;
    if (musicStep % 8 === 0) {
      chordRoot = prog[(musicStep / 8 | 0) % prog.length];
      for (const iv of [0, 4, 7, 11]) pad(base * Math.pow(2, (chordRoot + iv - 12) / 12), 7.5, t, 0.05);
    }
    const sc = SCALES[0];
    if (Math.random() < 0.55) {
      const n = sc[(Math.random() * sc.length) | 0] + 12 * ((Math.random() * 2) | 0);
      pluck(base * Math.pow(2, (chordRoot + n) / 12), t + Math.random() * 0.3);
    }
    musicStep++;
  }, 950);
}
function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }
function pad(f, dur, t, v) {
  const o = AC.createOscillator(), o2 = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = f; o2.frequency.value = f * 1.003;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 2.2); g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g); o2.connect(g); g.connect(MUSIC_GAIN); o.start(t); o2.start(t); o.stop(t + dur); o2.stop(t + dur);
}
function pluck(f, t) {
  const o = AC.createOscillator(), g = AC.createGain(); o.type = 'triangle'; o.frequency.value = f;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
  o.connect(g); g.connect(MUSIC_GAIN); o.start(t); o.stop(t + 2.5);
}

// ================= MOB VOICES =================
// Many mobs used to share one generic sound (cats, foxes, bees and dolphins all "chirped"; horses made no sound at
// all). Each of those now has its own voice, built from oscillators shaped by formant filters (so a meow sounds like
// "mi-aow" and a neigh wobbles), noise for breath, hisses and splashes, and pitch curves. Every mob gets an ambient
// sound, a hurt sound and a death sound; babies are higher pitched, and every call is pitched randomly a little
// (Minecraft varies mob pitch the same way). Mobs whose recorded sounds already fit (pigs, cows, zombies, skeletons,
// endermen, ghasts, blazes, piglins...) keep them, and get a voice only for the sounds they were missing.
const Voice = {
  out(v) { const c = Sfx.ctx; const g = c.createGain(); g.gain.value = v * Sfx.vol; g.connect(c.destination); return g; },
  // a voiced sound: pitch curve [[t, hz]...], formants [[hz, q, gain]...], amplitude envelope [[t, level]...]
  tone(dst, o) {
    const c = Sfx.ctx, t0 = c.currentTime + (o.at || 0); const osc = c.createOscillator(); osc.type = o.wave || 'sawtooth';
    const p = o.pitch; osc.frequency.setValueAtTime(p[0][1], t0); for (let i = 1; i < p.length; i++) osc.frequency.linearRampToValueAtTime(p[i][1], t0 + p[i][0]);
    if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(osc.frequency); l.start(t0); l.stop(t0 + o.len + 0.05); }
    const env = c.createGain(); env.gain.setValueAtTime(0.0001, t0); const e = o.env || [[0.02, 1], [o.len, 0]]; for (const [t, a] of e) env.gain.linearRampToValueAtTime(Math.max(0.0001, a), t0 + t);
    let src = osc;
    if (o.rough) { const am = c.createGain(); am.gain.value = 0.5; const l = c.createOscillator(); l.frequency.value = o.rough[0]; const lg = c.createGain(); lg.gain.value = o.rough[1] * 0.5; l.connect(lg); lg.connect(am.gain); l.start(t0); l.stop(t0 + o.len + 0.05); osc.connect(am); src = am; }
    if (o.formants) { for (const [f, q, gn] of o.formants) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; if (Array.isArray(f)) { bp.frequency.setValueAtTime(f[0][1], t0); for (let i = 1; i < f.length; i++) bp.frequency.linearRampToValueAtTime(f[i][1], t0 + f[i][0]); } else bp.frequency.value = f; bp.Q.value = q; const g = c.createGain(); g.gain.value = gn; src.connect(bp); bp.connect(g); g.connect(env); } }
    else if (o.lp) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lp; src.connect(lp); lp.connect(env); } else src.connect(env);
    env.connect(dst); osc.start(t0); osc.stop(t0 + o.len + 0.05);
  },
  noise(dst, o) {
    const c = Sfx.ctx, t0 = c.currentTime + (o.at || 0); const s = c.createBufferSource(); s.buffer = Sfx.noise; s.playbackRate.value = o.rate || 1;
    const f = c.createBiquadFilter(); f.type = o.type || 'bandpass'; const fr = o.freq; if (Array.isArray(fr)) { f.frequency.setValueAtTime(fr[0][1], t0); for (let i = 1; i < fr.length; i++) f.frequency.linearRampToValueAtTime(fr[i][1], t0 + fr[i][0]); } else f.frequency.value = fr; f.Q.value = o.q || 1;
    const env = c.createGain(); env.gain.setValueAtTime(0.0001, t0); const e = o.env || [[0.01, 1], [o.len, 0]]; for (const [t, a] of e) env.gain.linearRampToValueAtTime(Math.max(0.0001, a), t0 + t);
    s.connect(f); f.connect(env); env.connect(dst); s.start(t0, Math.random() * 1.5); s.stop(t0 + o.len + 0.05);
  },
};
// helpers: p = pitch multiplier for this call
const V = {
  meow(d, p, k = 1) { Voice.tone(d, { len: 0.55 * k, pitch: [[0, 520 * p], [0.18 * k, 720 * p], [0.55 * k, 430 * p]], formants: [[[[0, 700], [0.2, 1500], [0.5, 900]], 4, 1.2], [[[0, 2200], [0.25, 2900], [0.5, 2000]], 6, 0.6]], env: [[0.04, 0.9], [0.3 * k, 1], [0.55 * k, 0]], vib: [6, 8] }); },
  bark(d, p, at = 0) { Voice.tone(d, { at, len: 0.16, pitch: [[0, 330 * p], [0.05, 420 * p], [0.16, 260 * p]], formants: [[600, 3, 1.4], [1500, 5, 0.6]], rough: [55, 0.6], env: [[0.01, 1], [0.06, 0.8], [0.16, 0]] }); Voice.noise(d, { at, len: 0.12, freq: 900, q: 1.5, env: [[0.005, 0.5], [0.12, 0]] }); },
  whine(d, p, len = 0.5) { Voice.tone(d, { len, wave: 'triangle', pitch: [[0, 1100 * p], [len * 0.4, 1300 * p], [len, 800 * p]], formants: [[1200, 3, 1.2]], vib: [7, 25], env: [[0.04, 0.8], [len, 0]] }); },
  growl(d, p, len = 0.8) { Voice.tone(d, { len, pitch: [[0, 95 * p], [len, 80 * p]], formants: [[400, 2, 1.4], [900, 4, 0.5]], rough: [32, 0.9], env: [[0.1, 1], [len * 0.8, 0.8], [len, 0]] }); },
  squeak(d, p, at = 0, len = 0.08) { Voice.tone(d, { at, len, wave: 'sine', pitch: [[0, 2600 * p], [len * 0.5, 3200 * p], [len, 2400 * p]], env: [[0.005, 0.7], [len, 0]] }); },
  neigh(d, p) { Voice.tone(d, { len: 1.1, pitch: [[0, 420 * p], [0.15, 760 * p], [0.9, 520 * p], [1.1, 300 * p]], formants: [[[[0, 800], [0.5, 1200], [1.1, 700]], 3, 1.2], [2400, 6, 0.4]], vib: [16, 60], env: [[0.05, 0.9], [0.8, 0.8], [1.1, 0]] }); Voice.noise(d, { at: 0.95, len: 0.35, freq: 700, q: 0.8, env: [[0.02, 0.4], [0.35, 0]] }); },
  snortHorse(d, p) { Voice.noise(d, { len: 0.45, freq: [[0, 500], [0.45, 300]], q: 1.2, rate: p, env: [[0.03, 1], [0.15, 0.6], [0.45, 0]] }); Voice.tone(d, { len: 0.3, pitch: [[0, 110 * p], [0.3, 80 * p]], lp: 400, rough: [40, 0.8], env: [[0.03, 0.5], [0.3, 0]] }); },
  heehaw(d, p) { for (let i = 0; i < 2; i++) { Voice.tone(d, { at: i * 0.55, len: 0.3, pitch: [[0, 900 * p], [0.3, 760 * p]], formants: [[1100, 3, 1.2], [2600, 6, 0.4]], vib: [9, 30], env: [[0.03, 0.9], [0.3, 0]] }); Voice.tone(d, { at: i * 0.55 + 0.3, len: 0.25, pitch: [[0, 260 * p], [0.25, 210 * p]], formants: [[500, 3, 1.4]], rough: [40, 0.6], env: [[0.03, 1], [0.25, 0]] }); } },
  hiss(d, p, len = 0.6) { Voice.noise(d, { len, type: 'highpass', freq: 2500 * p, q: 0.7, env: [[0.05, 0.45], [len * 0.7, 0.3], [len, 0]] }); },
  chitter(d, p, n = 5) { for (let i = 0; i < n; i++) Voice.noise(d, { at: i * 0.045, len: 0.03, freq: 3200 * p, q: 6, env: [[0.003, 0.7], [0.03, 0]] }); },
  buzz(d, p, len = 0.9) { Voice.tone(d, { len, pitch: [[0, 230 * p], [len, 240 * p]], formants: [[460, 4, 3.2], [1400, 6, 1.2]], rough: [90, 0.5], vib: [5, 6], env: [[0.1, 0.6], [len - 0.1, 0.6], [len, 0]] }); },
  chime(d, p, notes) { notes.forEach((n, i) => Voice.tone(d, { at: i * 0.09, len: 0.4, wave: 'sine', pitch: [[0, n * p], [0.4, n * p]], env: [[0.01, 0.8], [0.4, 0]] })); },
  croak(d, p) { Voice.tone(d, { len: 0.35, wave: 'square', pitch: [[0, 120 * p], [0.35, 95 * p]], formants: [[450, 4, 1.3], [1100, 6, 0.3]], rough: [28, 1], env: [[0.02, 1], [0.3, 0.7], [0.35, 0]] }); },
  flop(d, p) { for (let i = 0; i < 2; i++) Voice.noise(d, { at: i * 0.13, len: 0.08, freq: 700 * p, q: 1.2, env: [[0.005, 1], [0.08, 0]] }); },
  bubble(d, p) { for (let i = 0; i < 3; i++) Voice.tone(d, { at: i * 0.07, len: 0.06, wave: 'sine', pitch: [[0, 500 * p * (1 + i * 0.2)], [0.06, 900 * p * (1 + i * 0.2)]], env: [[0.005, 0.5], [0.06, 0]] }); },
  clank(d, p, heavy) { for (const [f, g] of [[180, 1], [432, 0.6], [771, 0.45], [1190, 0.3]]) Voice.tone(d, { len: heavy ? 1.0 : 0.5, wave: 'sine', pitch: [[0, f * p], [heavy ? 1 : 0.5, f * p * 0.98]], env: [[0.004, g * 0.3], [heavy ? 1 : 0.5, 0]] }); Voice.noise(d, { len: 0.12, freq: 1500, q: 1, env: [[0.003, 0.4], [0.12, 0]] }); },
  cackle(d, p) { for (let i = 0; i < 4; i++) Voice.tone(d, { at: i * 0.12, len: 0.1, pitch: [[0, 520 * p * (1 - i * 0.04)], [0.1, 440 * p]], formants: [[900, 4, 1.2], [2400, 6, 0.5]], env: [[0.01, 0.9], [0.1, 0]] }); },
  grumble(d, p, len = 0.5) { Voice.tone(d, { len, pitch: [[0, 150 * p], [len * 0.4, 175 * p], [len, 120 * p]], formants: [[[[0, 400], [len, 650]], 3, 1.3], [1100, 5, 0.4]], rough: [24, 0.5], env: [[0.04, 0.9], [len, 0]] }); },
  screech(d, p, len = 0.7) { Voice.tone(d, { len, pitch: [[0, 900 * p], [len * 0.3, 1400 * p], [len, 700 * p]], formants: [[1600, 3, 2], [3200, 5, 1]], rough: [45, 0.6], env: [[0.05, 0.8], [len, 0]] }); },
  roar(d, p, len = 1.2) { Voice.tone(d, { len, pitch: [[0, 120 * p], [len * 0.3, 150 * p], [len, 70 * p]], formants: [[350, 2, 1.5], [800, 3, 0.7]], rough: [30, 1], env: [[0.12, 1], [len * 0.7, 0.8], [len, 0]] }); Voice.noise(d, { len, freq: 500, q: 0.7, env: [[0.1, 0.5], [len, 0]] }); },
  whoosh(d, p, len = 0.6) { Voice.noise(d, { len, freq: [[0, 400 * p], [len * 0.5, 2000 * p], [len, 600 * p]], q: 2, env: [[0.15, 0.8], [len, 0]] }); },
  whistle(d, p, at = 0) { Voice.tone(d, { at, len: 0.35, wave: 'sine', pitch: [[0, 1800 * p], [0.12, 2600 * p], [0.35, 2000 * p]], vib: [20, 60], env: [[0.02, 0.45], [0.35, 0]] }); },
  clickTrain(d, p) { for (let i = 0; i < 8; i++) Voice.noise(d, { at: i * 0.035, len: 0.012, freq: 4000 * p, q: 3, env: [[0.002, 1], [0.012, 0]] }); },
  scrape(d, p, len = 0.3) { Voice.noise(d, { len, freq: 1800 * p, q: 3, env: [[0.02, 0.6], [len, 0]] }); },
};
// [ambient, hurt, death] for each mob; each gets (destination, pitch)
const MOB_VOICE = {
  wolf: [(d, p, m) => m && (m.angry > 0) ? V.growl(d, p) : (V.bark(d, p), V.bark(d, p, 0.25)), (d, p) => V.whine(d, p, 0.35), (d, p) => V.whine(d, p * 0.9, 1.1)],
  cat: [(d, p) => V.meow(d, p), (d, p) => V.meow(d, p * 1.25, 0.5), (d, p) => V.meow(d, p * 0.85, 1.6)],
  ocelot: [(d, p) => V.meow(d, p * 1.1, 0.6), (d, p) => V.meow(d, p * 1.3, 0.4), (d, p) => V.meow(d, p * 0.9, 1.3)],
  fox: [(d, p) => { V.screech(d, p * 1.4, 0.25); V.screech(d, p * 1.3, 0.2); }, (d, p) => V.screech(d, p * 1.6, 0.25), (d, p) => V.screech(d, p * 1.1, 0.8)],
  rabbit: [(d, p) => V.squeak(d, p * 0.6, 0, 0.05), (d, p) => V.squeak(d, p * 0.8, 0, 0.15), (d, p) => V.squeak(d, p * 0.6, 0, 0.4)],
  bat: [(d, p) => { for (let i = 0; i < 3; i++) V.squeak(d, p * 1.3, i * 0.07, 0.04); }, (d, p) => V.squeak(d, p * 1.2, 0, 0.12), (d, p) => V.squeak(d, p, 0, 0.3)],
  parrot: [(d, p) => { V.whistle(d, p); V.whistle(d, p * 1.15, 0.3); }, (d, p) => V.screech(d, p * 1.8, 0.2), (d, p) => V.screech(d, p * 1.5, 0.5)],
  bee: [(d, p) => V.buzz(d, p), (d, p) => V.buzz(d, p * 1.4, 0.3), (d, p) => V.buzz(d, p * 0.8, 0.8)],
  allay: [(d, p) => V.chime(d, p, [880, 1109, 1319]), (d, p) => V.chime(d, p, [1319, 988]), (d, p) => V.chime(d, p, [1319, 1109, 880, 659])],
  frog: [(d, p) => V.croak(d, p), (d, p) => V.croak(d, p * 1.4), (d, p) => V.croak(d, p * 0.8)],
  tadpole: [null, (d, p) => V.flop(d, p * 1.6), (d, p) => V.flop(d, p * 1.4)],
  cod: [null, (d, p) => V.flop(d, p), (d, p) => V.flop(d, p * 0.9)], salmon: [null, (d, p) => V.flop(d, p * 0.9), (d, p) => V.flop(d, p * 0.8)],
  tropical_fish: [null, (d, p) => V.flop(d, p * 1.2), (d, p) => V.flop(d, p * 1.1)], pufferfish: [(d, p) => V.bubble(d, p * 0.7), (d, p) => V.bubble(d, p * 1.2), (d, p) => V.flop(d, p * 0.8)],
  squid: [(d, p) => V.bubble(d, p * 0.6), (d, p) => Voice.noise(d, { len: 0.25, freq: 350 * p, q: 1, env: [[0.01, 1], [0.25, 0]] }), (d, p) => Voice.noise(d, { len: 0.5, freq: 260 * p, q: 1, env: [[0.01, 1], [0.5, 0]] })],
  glow_squid: [(d, p) => V.bubble(d, p * 0.75), (d, p) => Voice.noise(d, { len: 0.25, freq: 420 * p, q: 1, env: [[0.01, 1], [0.25, 0]] }), (d, p) => Voice.noise(d, { len: 0.5, freq: 300 * p, q: 1, env: [[0.01, 1], [0.5, 0]] })],
  dolphin: [(d, p) => { V.clickTrain(d, p); V.whistle(d, p * 1.2, 0.3); }, (d, p) => V.whistle(d, p * 1.4), (d, p) => V.whistle(d, p * 0.8)],
  turtle: [(d, p) => Voice.noise(d, { len: 0.3, freq: 300 * p, q: 1, env: [[0.05, 0.5], [0.3, 0]] }), (d, p) => V.grumble(d, p * 1.6, 0.25), (d, p) => V.grumble(d, p * 1.2, 0.6)],
  axolotl: [(d, p) => V.squeak(d, p * 0.45, 0, 0.12), (d, p) => V.squeak(d, p * 0.6, 0, 0.18), (d, p) => V.squeak(d, p * 0.4, 0, 0.4)],
  guardian: [(d, p) => Voice.tone(d, { len: 0.9, wave: 'sine', pitch: [[0, 620 * p], [0.45, 760 * p], [0.9, 540 * p]], vib: [5, 40], env: [[0.1, 0.5], [0.9, 0]] }), (d, p) => V.screech(d, p * 1.2, 0.3), (d, p) => V.screech(d, p * 0.8, 1.0)],
  elder_guardian: [(d, p) => Voice.tone(d, { len: 1.6, wave: 'sine', pitch: [[0, 300 * p], [0.8, 380 * p], [1.6, 240 * p]], vib: [3, 25], env: [[0.2, 0.6], [1.6, 0]] }), (d, p) => V.screech(d, p * 0.7, 0.4), (d, p) => V.roar(d, p * 1.6, 1.4)],
  shulker: [(d, p) => V.scrape(d, p * 0.6, 0.25), (d, p) => V.clank(d, p * 1.5), (d, p) => V.clank(d, p * 1.2, true)],
  spider: [(d, p) => { V.hiss(d, p * 0.8, 0.4); V.chitter(d, p); }, (d, p) => { V.chitter(d, p * 1.2, 7); V.hiss(d, p, 0.25); }, (d, p) => { V.chitter(d, p * 0.8, 10); V.hiss(d, p * 0.7, 0.8); }],
  cave_spider: [(d, p) => { V.hiss(d, p, 0.35); V.chitter(d, p * 1.2); }, (d, p) => V.chitter(d, p * 1.4, 7), (d, p) => { V.chitter(d, p, 10); V.hiss(d, p * 0.8, 0.6); }],
  silverfish: [(d, p) => { V.squeak(d, p * 1.4, 0, 0.05); V.scrape(d, p * 2, 0.2); }, (d, p) => V.squeak(d, p * 1.5, 0, 0.1), (d, p) => V.squeak(d, p * 1.2, 0, 0.3)],
  endermite: [(d, p) => V.chitter(d, p * 1.4, 4), (d, p) => V.squeak(d, p * 1.6, 0, 0.1), (d, p) => V.squeak(d, p * 1.3, 0, 0.3)],
  creeper: [null, (d, p) => Voice.noise(d, { len: 0.25, freq: 2200 * p, type: 'highpass', env: [[0.01, 0.8], [0.25, 0]] }), (d, p) => Voice.noise(d, { len: 0.6, freq: 1500 * p, type: 'highpass', env: [[0.01, 0.8], [0.6, 0]] })],
  horse: [(d, p) => Math.random() < 0.5 ? V.neigh(d, p) : V.snortHorse(d, p), (d, p) => V.neigh(d, p * 1.3), (d, p) => V.neigh(d, p * 0.8)],
  donkey: [(d, p) => V.heehaw(d, p), (d, p) => V.heehaw(d, p * 1.2), (d, p) => V.heehaw(d, p * 0.8)],
  mule: [(d, p) => Math.random() < 0.5 ? V.heehaw(d, p * 0.9) : V.neigh(d, p * 0.85), (d, p) => V.neigh(d, p * 1.2), (d, p) => V.heehaw(d, p * 0.7)],
  camel: [(d, p) => V.grumble(d, p * 0.6, 0.9), (d, p) => V.grumble(d, p * 0.9, 0.4), (d, p) => V.roar(d, p * 1.3, 1.0)],
  llama: [(d, p) => Voice.tone(d, { len: 0.6, pitch: [[0, 260 * p], [0.3, 300 * p], [0.6, 240 * p]], formants: [[350, 4, 1.4], [1200, 6, 0.3]], env: [[0.08, 0.7], [0.6, 0]] }), (d, p) => V.grumble(d, p * 1.8, 0.3), (d, p) => V.grumble(d, p * 1.3, 0.8)],
  goat: [(d, p) => Voice.tone(d, { len: 0.7, pitch: [[0, 420 * p], [0.7, 380 * p]], formants: [[800, 3, 1.2], [2200, 6, 0.5]], vib: [11, 40], env: [[0.04, 0.9], [0.7, 0]] }), (d, p) => Voice.tone(d, { len: 0.3, pitch: [[0, 520 * p], [0.3, 440 * p]], formants: [[900, 3, 1.2]], vib: [12, 50], env: [[0.02, 1], [0.3, 0]] }), (d, p) => Voice.tone(d, { len: 1.0, pitch: [[0, 440 * p], [1, 300 * p]], formants: [[800, 3, 1.2]], vib: [10, 50], env: [[0.04, 1], [1, 0]] })],
  polar_bear: [(d, p) => V.growl(d, p * 1.1, 0.6), (d, p) => V.roar(d, p * 1.3, 0.4), (d, p) => V.roar(d, p * 1.0, 1.1)],
  panda: [(d, p) => V.grumble(d, p * 0.9, 0.5), (d, p) => V.grumble(d, p * 1.4, 0.3), (d, p) => V.grumble(d, p * 0.8, 0.9)],
  sniffer: [(d, p) => { for (let i = 0; i < 3; i++) Voice.noise(d, { at: i * 0.18, len: 0.12, freq: 600 * p, q: 1.5, env: [[0.02, 0.8], [0.12, 0]] }); }, (d, p) => V.grumble(d, p * 0.7, 0.4), (d, p) => V.roar(d, p * 1.4, 1.2)],
  armadillo: [(d, p) => V.scrape(d, p, 0.15), (d, p) => V.squeak(d, p * 0.5, 0, 0.12), (d, p) => V.squeak(d, p * 0.4, 0, 0.35)],
  iron_golem: [null, (d, p) => V.clank(d, p), (d, p) => V.clank(d, p * 0.7, true)],
  snow_golem: [(d, p) => Voice.noise(d, { len: 0.2, freq: 1800 * p, type: 'lowpass', env: [[0.02, 0.5], [0.2, 0]] }), (d, p) => Voice.noise(d, { len: 0.25, freq: 2400 * p, type: 'lowpass', env: [[0.01, 0.9], [0.25, 0]] }), (d, p) => Voice.noise(d, { len: 0.6, freq: 1600 * p, type: 'lowpass', env: [[0.01, 1], [0.6, 0]] })],
  witch: [(d, p) => V.cackle(d, p), (d, p) => V.grumble(d, p * 2.2, 0.3), (d, p) => V.cackle(d, p * 0.8)],
  pillager: [(d, p) => V.grumble(d, p, 0.45), (d, p) => V.grumble(d, p * 1.4, 0.25), (d, p) => V.grumble(d, p * 0.8, 0.8)],
  vindicator: [(d, p) => V.grumble(d, p * 0.9, 0.5), (d, p) => V.grumble(d, p * 1.3, 0.25), (d, p) => V.grumble(d, p * 0.75, 0.8)],
  evoker: [(d, p) => V.grumble(d, p * 0.8, 0.7), (d, p) => V.grumble(d, p * 1.2, 0.3), (d, p) => V.grumble(d, p * 0.7, 1.0)],
  vex: [(d, p) => V.screech(d, p * 1.6, 0.3), (d, p) => V.screech(d, p * 1.9, 0.2), (d, p) => V.screech(d, p * 1.3, 0.6)],
  ravager: [(d, p) => V.growl(d, p * 0.8, 1.0), (d, p) => V.roar(d, p * 1.2, 0.4), (d, p) => V.roar(d, p * 0.9, 1.5)],
  breeze: [(d, p) => V.whoosh(d, p), (d, p) => V.whoosh(d, p * 1.5, 0.3), (d, p) => V.whoosh(d, p * 0.7, 1.0)],
  phantom: [(d, p) => V.screech(d, p * 0.9, 0.9), (d, p) => V.screech(d, p * 1.2, 0.3), (d, p) => V.screech(d, p * 0.7, 1.2)],
  warden: [null, (d, p) => V.roar(d, p * 0.6, 0.5), null],
  wither: [null, (d, p) => V.roar(d, p * 0.9, 0.4), null],
  sheep: [null, (d, p) => Voice.tone(d, { len: 0.35, pitch: [[0, 360 * p], [0.35, 300 * p]], formants: [[700, 3, 1.2], [2000, 6, 0.4]], vib: [10, 30], env: [[0.02, 1], [0.35, 0]] }), null],
  chicken: [null, (d, p) => V.squeak(d, p * 0.45, 0, 0.12), (d, p) => V.squeak(d, p * 0.35, 0, 0.3)],
  villager: [null, (d, p) => V.grumble(d, p * 1.5, 0.3), (d, p) => V.grumble(d, p * 1.1, 0.8)],
  slime: [null, (d, p) => Voice.noise(d, { len: 0.2, freq: 400 * p, q: 1.2, env: [[0.01, 1], [0.2, 0]] }), (d, p) => Voice.noise(d, { len: 0.4, freq: 320 * p, q: 1.2, env: [[0.01, 1], [0.4, 0]] })],
  magma_cube: [null, (d, p) => Voice.noise(d, { len: 0.2, freq: 260 * p, q: 1.2, env: [[0.01, 1], [0.2, 0]] }), (d, p) => Voice.noise(d, { len: 0.45, freq: 200 * p, q: 1.2, env: [[0.01, 1], [0.45, 0]] })],
  hoglin: [(d, p) => V.growl(d, p * 1.3, 0.5), null, null], zoglin: [(d, p) => V.growl(d, p * 1.1, 0.7), (d, p) => V.roar(d, p * 1.5, 0.3), (d, p) => V.roar(d, p * 1.2, 0.9)],
};
const MUTE_AMBIENT = new Set(['cod', 'salmon', 'tropical_fish', 'tadpole', 'iron_golem', 'creeper']); // silent in Minecraft too
{ const _mob = Sfx.mob.bind(Sfx); Sfx.mob = function (m, kind, v = 0.6) {
    const voice = MOB_VOICE[m.type]; const i = kind === 'hurt' ? 1 : kind === 'death' ? 2 : 0;
    const f = voice && voice[i];
    if (!f) { if (i === 0 && MUTE_AMBIENT.has(m.type)) return; return _mob(m, kind, v); }
    if (!this.ctx || !this.noise) return; const P = G.player; if (!P) return; const d = P.pos.distanceTo(m.pos); const vol = v * Math.max(0, 1 - d / 24); if (vol < 0.02) return;
    try { const dst = Voice.out(vol * 0.9); const p = (m.baby ? 1.5 : 1) * (0.9 + Math.random() * 0.2); f(dst, p, m); } catch (e) { }
  }; }

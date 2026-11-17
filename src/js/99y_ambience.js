// ================= OWNER WORLD AMBIENCE =================
// The owner's ambient recordings (streamed like mob sounds, keys amb.* in sounds/mobs.json):
//   rain          amb.rain loops (chained random files) while the game's rain hiss would play, at its volume
//   thunder       'thunder' samples (03_entities Sfx.play picks them up once loaded)
//   caves         amb.cave: overworld, dark and out of the sky, a "mood" meter fills up; full = one cave sound
//   underwater    amb.water.loop while the eyes are in water, enter/exit on the way in and out, add/rare extras
//   nether        amb.n<biome>.loop per biome (0 wastes, 1 crimson, 2 warped, 3 soul sand valley) crossfading,
//                 (4 basalt deltas), plus .mood (every 30-90 s) and .add (every 5-14 s)
//   the End       amb.end_flash every 40-120 s
// Nothing plays until a file has loaded; when the game is paused or on the title screen the loops fade out.
const Amb = {
  loops: {}, t: { mood: 0, add: 8, rare: 60, nmood: 20, nadd: 6, flash: 50 }, rainV: 0, rainT: 0, wasWet: null,
  // one looping layer: plays random files of key back to back, gain follows target
  loop(key, target) {
    const c = Sfx.ctx; if (!c) return; let L = this.loops[key];
    if (!L) { if (target <= 0.001) return; MobSnd.load(key); if (!Sfx.has(key)) return; const g = c.createGain(); g.gain.value = 0.0001; g.connect(c.destination); L = this.loops[key] = { g, src: null, v: 0 }; }
    L.v = target; L.g.gain.setTargetAtTime(Math.max(0.0001, target * Sfx.vol), c.currentTime, 0.6);
    if (target > 0.001 && !L.src) this.next(key, L);
    if (target <= 0.001 && L.src && L.g.gain.value < 0.002) { try { L.src.onended = null; L.src.stop(); } catch (e) { } L.src = null; }
  },
  next(key, L) {
    const list = (Sfx.samples[key] || []).filter(Boolean); if (!list.length) return; const s = Sfx.ctx.createBufferSource();
    s.buffer = list[Math.random() * list.length | 0]; s.connect(L.g); s.onended = () => { if (L.src === s) { L.src = null; if (L.v > 0.001) this.next(key, L); } }; L.src = s; s.start();
  },
  // a one-shot ambient sound
  shot(key, v) { MobSnd.load(key); if (!Sfx.has(key)) return false; MobSnd.busy++; try { Sfx.sample(key, v, 0.95 + Math.random() * 0.1); } finally { MobSnd.busy--; } return true; },
  tick(dt) {
    const P = G.player, w = G.world, want = {};
    const live = P && w && !P.dead && !S.paused && Sfx.ctx;
    if (live) {
      const ex = Math.floor(P.pos.x), ez = Math.floor(P.pos.z), eye = P.eye ? P.eye() : P.pos; const ey = Math.floor(eye.y);
      const wet = isWaterId(w.get(ex, ey, ez)); const dim = w.dim || S.dim;
      // underwater
      if (this.wasWet !== null && wet !== this.wasWet) this.shot(wet ? 'amb.water.enter' : 'amb.water.exit', 0.5);
      this.wasWet = wet;
      if (wet) {
        want['amb.water.loop'] = 0.55;
        if ((this.t.add -= dt) <= 0) { this.t.add = 8 + Math.random() * 12; this.shot('amb.water.add', 0.35); }
        if ((this.t.rare -= dt) <= 0) { this.t.rare = 60 + Math.random() * 90; this.shot('amb.water.rare', 0.4); }
      }
      if (dim === 'nether' && w.gen && w.gen.biome) {
        const b = w.gen.biome(P.pos.x, P.pos.z) | 0; want['amb.n' + b + '.loop'] = wet ? 0.15 : 0.5;
        if ((this.t.nmood -= dt) <= 0) { this.t.nmood = 30 + Math.random() * 60; this.shot('amb.n' + b + '.mood', 0.5); }
        if ((this.t.nadd -= dt) <= 0) { this.t.nadd = 5 + Math.random() * 9; this.shot('amb.n' + b + '.add', 0.35); }
      } else if (dim === 'end') {
        if ((this.t.flash -= dt) <= 0) { this.t.flash = 40 + Math.random() * 80; this.shot('amb.end_flash', 0.5); }
      } else if (dim === 'overworld' || !dim) {
        // cave mood: fills in the dark away from the sky (about a minute of darkness), like Minecraft's mood meter
        const sky = w.skyAt ? w.skyAt(ex, ey, ez) : 1; const light = w.lightAt ? w.lightAt(eye.x, eye.y, eye.z, 0) : 1;
        if (sky < 0.06 && light < 0.35 && !wet) this.t.mood += dt / 60; else this.t.mood = Math.max(0, this.t.mood - dt / 120);
        if (this.t.mood >= 1) { this.t.mood = 0; this.shot('amb.cave', 0.6); }
      }
      // rain: the game asks for its rain hiss every 0.9 s with a volume; we keep a loop at that volume instead
      this.rainT -= dt; if (this.rainT > 0) want['amb.rain'] = Math.min(0.7, this.rainV * 1.3);
    }
    for (const k of new Set([...Object.keys(this.loops), ...Object.keys(want)])) this.loop(k, want[k] || 0);
  },
};
{ const _play = Sfx.play.bind(Sfx); Sfx.play = function (name, v = 1, rate) {
    if (name === 'rain' && !MobSnd.busy) { Amb.rainV = v; Amb.rainT = 2; MobSnd.load('amb.rain'); if (Sfx.has('amb.rain')) return; }
    return _play(name, v, rate);
  }; }
{ let last = performance.now(); setInterval(() => { const now = performance.now(); const dt = Math.min(1, (now - last) / 1000); last = now; try { Amb.tick(dt); } catch (e) { } }, 250); }

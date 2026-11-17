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
      // elytra wind while gliding; swim strokes while moving in water
      const spd = Math.hypot(P.vel.x, P.vel.y, P.vel.z);
      if (P.gliding) want['snd.item.elytra.elytra_loop'] = Math.max(0.1, Math.min(0.6, spd / 40));
      const feetWet = isWaterId(w.get(ex, Math.floor(P.pos.y + 0.3), ez));
      if ((wet || feetWet) && Math.hypot(P.vel.x, P.vel.z) > 1) { this.swimD = (this.swimD || 0) + Math.hypot(P.vel.x, P.vel.z) * dt; if (this.swimD > 2.4) { this.swimD = 0; this.shot('snd.liquid.swim', 0.25); } }
      // boats: paddle strokes while rowing; minecarts: rolling loop when riding, nearby carts rumble
      const rid = P.riding;
      if (rid && G.boats && G.boats.includes(rid) && Math.hypot(rid.vel ? rid.vel.x : 0, rid.vel ? rid.vel.z : 0) > 0.8) {
        this.paddleT = (this.paddleT || 0) - dt; if (this.paddleT <= 0) { this.paddleT = 0.9; const bw = isWaterId(w.get(Math.floor(rid.pos.x), Math.floor(rid.pos.y), Math.floor(rid.pos.z))) || isWaterId(w.get(Math.floor(rid.pos.x), Math.floor(rid.pos.y - 0.3), Math.floor(rid.pos.z)));
          this.shot(bw ? 'snd.entity.boat.paddle_water' : 'snd.entity.boat.paddle_land', 0.35); } }
      if (G.carts) { let near = 0; for (const c of G.carts) { const sp = Math.abs(c.v || 0); if (sp < 0.3 || c === rid) continue; const d = c.pos.distanceTo(P.pos); if (d < 16) near = Math.max(near, Math.min(1, sp / 8) * (1 - d / 16)); }
        if (near > 0.02) want['snd.minecart.base'] = near * 0.6;
        if (rid && G.carts.includes(rid) && Math.abs(rid.v || 0) > 0.3) want[wet ? 'snd.minecart.inside_underwater' : 'snd.minecart.inside'] = Math.min(0.6, Math.abs(rid.v) / 10 + 0.1); }
      // standing in a nether portal
      const inPortal = /nether_portal/.test((BL[w.get(ex, Math.floor(P.pos.y + 0.5), ez)] || {}).key || '');
      if (inPortal && !this.wasPortal) this.shot('snd.portal.trigger', 0.5); this.wasPortal = inPortal;
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

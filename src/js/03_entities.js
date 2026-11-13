// ================= ENTITIES: physics, mobs, items, projectiles, particles, sound =================
// Survival rules (health, hunger, mobs attack) apply in Survival and Adventure; Adventure also can't break or place blocks
function isSurv() { return S.mode === 'survival' || S.mode === 'adventure'; }
const G = { world: null, scene: null, player: null, daylight: 1, mode: 'survival', mobs: [], items: [], projectiles: [], tnts: [], clouds: [], eyes: [], shake: 0 };
const AX = ['x', 'y', 'z'];
function sweep(e, axis, d) {
  if (d === 0) return false;
  const p = e.pos; const a = AX[axis]; p[a] += d;
  const hw = e.hw, h = e.h; const w = G.world;
  const X0 = Math.floor(p.x - hw), X1 = Math.floor(p.x + hw - 1e-7), Y0 = Math.floor(p.y), Y1 = Math.floor(p.y + h - 1e-7), Z0 = Math.floor(p.z - hw), Z1 = Math.floor(p.z + hw - 1e-7);
  let hit = false;
  for (let x = X0; x <= X1; x++) for (let y = Y0; y <= Y1; y++) for (let z = Z0; z <= Z1; z++) {
    if (!(w.solid(x, y, z) || (e.lavaWalk && isLavaId(w.get(x, y, z))))) continue; hit = true;
    if (axis === 0) { if (d > 0) p.x = Math.min(p.x, x - hw - 1e-4); else p.x = Math.max(p.x, x + 1 + hw + 1e-4); }
    else if (axis === 1) { if (d > 0) p.y = Math.min(p.y, y - h - 1e-4); else p.y = Math.max(p.y, y + 1 + 1e-5); }
    else { if (d > 0) p.z = Math.min(p.z, z - hw - 1e-4); else p.z = Math.max(p.z, z + 1 + hw + 1e-4); }
  }
  return hit;
}
function moveEntity(e, dt) {
  e.onGround = false; e.hitH = false;
  let dx = e.vel.x * dt, dy = e.vel.y * dt, dz = e.vel.z * dt;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) / 0.35));
  dx /= n; dy /= n; dz /= n;
  for (let i = 0; i < n; i++) {
    if (dy && sweep(e, 1, dy)) { if (dy < 0) e.onGround = true; e.vel.y = 0; dy = 0; }
    if (dx && sweep(e, 0, dx)) { e.hitH = true; e.vel.x = 0; dx = 0; }
    if (dz && sweep(e, 2, dz)) { e.hitH = true; e.vel.z = 0; dz = 0; }
  }
}
function boxIntersectsBlock(e, x, y, z) { return e.pos.x + e.hw > x && e.pos.x - e.hw < x + 1 && e.pos.y + e.h > y && e.pos.y < y + 1 && e.pos.z + e.hw > z && e.pos.z - e.hw < z + 1; }
function inLava(e, off = 0.3) { return FKIND[G.world.get(Math.floor(e.pos.x), Math.floor(e.pos.y + off), Math.floor(e.pos.z))] === 2; }
function inWater(e, off = 0.3) { return FKIND[G.world.get(Math.floor(e.pos.x), Math.floor(e.pos.y + off), Math.floor(e.pos.z))] === 1; }
function rayAABB(o, d, min, max) {
  let tmin = 0, tmax = 1e9;
  for (const a of AX) { const inv = 1 / (d[a] || 1e-9); let t1 = (min[a] - o[a]) * inv, t2 = (max[a] - o[a]) * inv; if (t1 > t2) { const t = t1; t1 = t2; t2 = t; } tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmax < tmin) return -1; }
  return tmin;
}
function lineOfSight(a, b) { const d = b.clone().sub(a); const L = d.length(); const n = Math.ceil(L / 0.4); for (let i = 1; i < n; i++) { const t = i / n; if (G.world.solid(Math.floor(a.x + d.x * t), Math.floor(a.y + d.y * t), Math.floor(a.z + d.z * t))) return false; } return true; }

// ---------------- Sound ----------------
const Sfx = {
  ctx: null, noise: null, vol: 0.5, samples: {},
  // recorded CC0 / public-domain sounds (see CREDITS.md), decoded once audio starts; synthesized sounds are the fallback
  loadSamples() { if (typeof SOUND_DATA === 'undefined') return; for (const name in SOUND_DATA) { this.samples[name] = []; SOUND_DATA[name].forEach((b64, i) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k); this.ctx.decodeAudioData(u.buffer).then(ab => { this.samples[name][i] = ab; }).catch(() => { }); }); } },
  sample(name, v, rate) { const sm = this.samples[name]; if (!sm || !sm.length) return false; const list = sm.filter(Boolean); if (!list.length) return false; const c = this.ctx; const s = c.createBufferSource(); s.buffer = list[Math.random() * list.length | 0]; s.playbackRate.value = (rate || 1) * (0.92 + Math.random() * 0.16); const g = c.createGain(); g.gain.value = Math.min(1.5, v * 0.9); s.connect(g); g.connect(c.destination); s.start(); return true; },
  has(name) { const sm = this.samples[name]; return !!(sm && sm.some(Boolean)); },
  init() { if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => { }); return; } try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); const n = this.ctx.sampleRate * 2; const b = this.ctx.createBuffer(1, n, this.ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; this.noise = b; this.loadSamples(); } catch (e) { this.ctx = null; } },
  env(g, t, a, dur, v) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); },
  nz(dur, freq, v, type = 'lowpass', q = 1) { const c = this.ctx; if (!c) return; const t = c.currentTime; const s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = 0.8 + Math.random() * 0.4; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = c.createGain(); this.env(g, t, 0.005, dur, v * this.vol); s.connect(f); f.connect(g); g.connect(c.destination); s.start(t, Math.random()); s.stop(t + dur + 0.05); },
  tone(f0, f1, dur, v, type = 'square') { const c = this.ctx; if (!c) return; const t = c.currentTime; const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); const g = c.createGain(); this.env(g, t, 0.01, dur, v * this.vol); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05); },
  play(name, v = 1, rate) {
    if (!this.ctx || v < 0.02) return;
    if (this.sample(name === 'step' ? 'stone' : name, v, rate)) return;
    switch (name) {
      case 'stone': this.nz(0.12, 1400, 0.5 * v, 'bandpass', 1.2); break;
      case 'wood': this.nz(0.12, 700, 0.55 * v, 'bandpass', 2); this.tone(220, 160, 0.06, 0.08 * v, 'triangle'); break;
      case 'grass': this.nz(0.14, 2600, 0.35 * v, 'highpass'); break;
      case 'sand': case 'snow': case 'wool': this.nz(0.14, 1800, 0.3 * v, 'lowpass'); break;
      case 'glass': this.tone(1800, 2400, 0.08, 0.08 * v, 'triangle'); this.nz(0.2, 4000, 0.3 * v, 'highpass'); break;
      case 'pop': this.tone(500, 900, 0.07, 0.12 * v, 'sine'); break;
      case 'armor': this.nz(0.18, 2600, 0.25 * v, 'bandpass', 2); this.tone(300, 260, 0.08, 0.05 * v, 'square'); break;
      case 'orb': this.tone(1400 + Math.random() * 600, 2200, 0.06, 0.05 * v, 'sine'); break;
      case 'levelup': this.tone(520, 520, 0.12, 0.1 * v, 'triangle'); setTimeout(() => this.tone(660, 660, 0.12, 0.1 * v, 'triangle'), 110); setTimeout(() => this.tone(880, 880, 0.25, 0.1 * v, 'triangle'), 220); break;
      case 'hurt': this.tone(260, 120, 0.16, 0.18 * v, 'square'); break;
      case 'boom': this.nz(1.4, 260, 1.2 * v, 'lowpass'); this.tone(80, 30, 0.8, 0.5 * v, 'sine'); break;
      case 'hiss': this.nz(1.4, 3000, 0.25 * v, 'highpass'); break;
      case 'oink': this.tone(320, 200, 0.18, 0.12 * v, 'sawtooth'); break;
      case 'moo': this.tone(150, 110, 0.6, 0.12 * v, 'sawtooth'); break;
      case 'baa': this.tone(330, 300, 0.4, 0.1 * v, 'sawtooth'); break;
      case 'cluck': this.tone(900, 700, 0.06, 0.08 * v, 'square'); break;
      case 'hmm': this.tone(180, 140, 0.3, 0.1 * v, 'triangle'); break;
      case 'groan': this.tone(110, 70, 0.7, 0.12 * v, 'sawtooth'); break;
      case 'rattle': for (let i = 0; i < 3; i++) setTimeout(() => this.nz(0.04, 2500, 0.3 * v, 'bandpass', 3), i * 60); break;
      case 'hissS': this.nz(0.4, 2200, 0.2 * v, 'bandpass', 2); break;
      case 'bow': this.nz(0.15, 3500, 0.3 * v, 'bandpass', 2); this.tone(220, 90, 0.12, 0.08 * v, 'triangle'); break;
      case 'shield': this.tone(170, 80, 0.14, 0.22 * v, 'square'); this.nz(0.12, 700, 0.6 * v, 'lowpass'); break;
      case 'bowdraw': { const c = this.ctx; const t = c.currentTime; for (let i = 0; i < 4; i++) setTimeout(() => this.nz(0.09, 600 + i * 180, 0.12 * v, 'bandpass', 6), i * 140); break; }
      case 'eat': for (let i = 0; i < 3; i++) setTimeout(() => this.nz(0.06, 1200, 0.3 * v, 'bandpass', 2), i * 110); break;
      case 'step': this.nz(0.05, 900, 0.12 * v, 'lowpass'); break;
      case 'splash': this.nz(0.35, 1200, 0.3 * v, 'lowpass'); break;
      case 'click': this.tone(700, 600, 0.04, 0.06 * v, 'square'); break;
      case 'ghast': this.tone(700, 300, 1.0, 0.08 * v, 'sine'); this.tone(560, 250, 1.1, 0.06 * v, 'triangle'); break;
      case 'fireball': this.nz(0.5, 600, 0.5 * v, 'lowpass'); break;
      case 'blaze': this.nz(0.6, 400, 0.3 * v, 'bandpass', 1); this.tone(120, 90, 0.5, 0.06 * v, 'sawtooth'); break;
      case 'vwoop': this.tone(200, 900, 0.25, 0.1 * v, 'sine'); this.tone(900, 200, 0.25, 0.06 * v, 'triangle'); break;
      case 'scream': this.tone(900, 1300, 0.6, 0.06 * v, 'sawtooth'); break;
      case 'snort': this.nz(0.15, 500, 0.4 * v, 'bandpass', 3); this.tone(180, 120, 0.15, 0.08 * v, 'square'); break;
      case 'grunt': this.tone(90, 60, 0.35, 0.16 * v, 'sawtooth'); break;
      case 'squish': this.nz(0.12, 300, 0.5 * v, 'lowpass'); break;
      case 'chirp': this.tone(600, 900, 0.1, 0.06 * v, 'square'); break;
      case 'roar': this.tone(90, 45, 1.6, 0.35 * v, 'sawtooth'); this.nz(1.4, 300, 0.6 * v, 'lowpass'); break;
      case 'portal': this.tone(110, 140, 1.4, 0.08 * v, 'sine'); this.tone(165, 120, 1.4, 0.05 * v, 'triangle'); break;
      case 'fizz': this.nz(0.5, 3000, 0.35 * v, 'highpass'); break;
      case 'ignite': this.nz(0.2, 2500, 0.4 * v, 'bandpass', 2); break;
      case 'glass_break': this.tone(2000, 1200, 0.15, 0.08 * v, 'triangle'); this.nz(0.3, 5000, 0.4 * v, 'highpass'); break;
      case 'levelup': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, f, 0.25, 0.12 * v, 'triangle'), i * 140)); break;
    }
  },
  at(name, pos, v = 1, rate) { const P = G.player; if (!P) return; const d = P.pos.distanceTo(pos); this.play(name, v * Math.max(0, 1 - d / 24), rate); },
  mob(m, kind, v = 0.6) { const s = m.t.snd; if (!s) return; const rate = MOB_PITCH[m.type] || 1; let n = kind ? s + '_' + kind : s; if (kind && !this.has(n)) n = kind === 'death' && this.has(s + '_hurt') ? s + '_hurt' : (this.has(s) ? s : 'hurt'); this.at(n, m.pos, v, kind === 'death' ? rate * 0.85 : rate); }
};

// ---------------- Particles ----------------
const Particles = {
  N: 2000, n: 0,
  init(scene) {
    this.geo = new THREE.BufferGeometry(); this.pos = new Float32Array(this.N * 3); this.col = new Float32Array(this.N * 3);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.v = new Float32Array(this.N * 3); this.life = new Float32Array(this.N); this.grav = new Float32Array(this.N);
    this.mat = new THREE.PointsMaterial({ size: 0.13, vertexColors: true, sizeAttenuation: true });
    this.pts = new THREE.Points(this.geo, this.mat); this.pts.frustumCulled = false; scene.add(this.pts); this.geo.setDrawRange(0, 0);
  },
  emit(x, y, z, count, col, spd = 3, life = 0.8, grav = 16, spread = 0.4, bright = 1) {
    for (let i = 0; i < count; i++) {
      if (this.n >= this.N) return; const k = this.n++;
      this.pos[k * 3] = x + (Math.random() - 0.5) * spread; this.pos[k * 3 + 1] = y + (Math.random() - 0.5) * spread; this.pos[k * 3 + 2] = z + (Math.random() - 0.5) * spread;
      const c = Array.isArray(col[0]) ? col[i % col.length] : col; const f = (0.75 + Math.random() * 0.35) * bright;
      this.col[k * 3] = c[0] * f; this.col[k * 3 + 1] = c[1] * f; this.col[k * 3 + 2] = c[2] * f;
      this.v[k * 3] = (Math.random() - 0.5) * spd; this.v[k * 3 + 1] = Math.random() * spd * 0.8 + (grav < 0 ? 0 : spd * 0.3); this.v[k * 3 + 2] = (Math.random() - 0.5) * spd;
      this.life[k] = life * (0.6 + Math.random() * 0.6); this.grav[k] = grav;
    }
  },
  update(dt) {
    let j = 0;
    for (let i = 0; i < this.n; i++) {
      this.life[i] -= dt; if (this.life[i] <= 0) continue;
      this.v[i * 3 + 1] -= this.grav[i] * dt;
      let x = this.pos[i * 3] + this.v[i * 3] * dt, y = this.pos[i * 3 + 1] + this.v[i * 3 + 1] * dt, z = this.pos[i * 3 + 2] + this.v[i * 3 + 2] * dt;
      if (this.grav[i] > 0 && G.world.solid(Math.floor(x), Math.floor(y), Math.floor(z))) { y = this.pos[i * 3 + 1]; this.v[i * 3 + 1] = 0; this.v[i * 3] *= 0.5; this.v[i * 3 + 2] *= 0.5; x = this.pos[i * 3]; z = this.pos[i * 3 + 2]; }
      if (j !== i) { for (let q = 0; q < 3; q++) { this.col[j * 3 + q] = this.col[i * 3 + q]; this.v[j * 3 + q] = this.v[i * 3 + q]; } this.life[j] = this.life[i]; this.grav[j] = this.grav[i]; }
      this.pos[j * 3] = x; this.pos[j * 3 + 1] = y; this.pos[j * 3 + 2] = z; j++;
    }
    this.n = j; this.geo.setDrawRange(0, j); this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true;
  },
  blockBreak(x, y, z, id, n = 18) { const def = BL[id]; if (!def || !def.texIds) return; const cols = [TILE_AVG[def.texIds[2]], TILE_AVG[def.texIds[0]]]; const b = Math.max(0.25, G.world.lightAt(x + 0.5, y + 0.5, z + 0.5, G.daylight)); this.emit(x + 0.5, y + 0.5, z + 0.5, n, cols, 4, 0.9, 18, 0.8, b); }
};

// ---------------- Block geometry for items / held / TNT ----------------
const blockGeoCache = [];
function blockGeo(id) {
  if (blockGeoCache[id]) return blockGeoCache[id];
  const def = BL[id]; const p = [], u = [], n = [], idx = [];
  for (let f = 0; f < 6; f++) { const F = FACES[f]; const uv = TILE_UV[def.texIds[f]]; const b = p.length / 3; for (let k = 0; k < 4; k++) { const c = F.c[k]; p.push(c[0] - 0.5, c[1] - 0.5, c[2] - 0.5); u.push(UVC[k][0] ? uv[2] : uv[0], UVC[k][1] ? uv[3] : uv[1]); n.push(F.n[0], F.n[1], F.n[2]); } idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); g.setIndex(idx);
  blockGeoCache[id] = g; return g;
}
const itemTexCache = [];
function itemTex(id) { if (!itemTexCache[id]) { const t = new THREE.CanvasTexture(ICON_CANVAS[id]); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; itemTexCache[id] = t; } return itemTexCache[id]; }
const itemBlockMat = new THREE.MeshLambertMaterial({ map: atlasTex, alphaTest: 0.5 });
const spriteMats = [];
function isCubeItem(id) { return id < 256 && BL[id] && (BL[id].render === 'cube' || BL[id].render === 'cutout' || BL[id].render === 'water'); }
function itemMesh(id) {
  if (isCubeItem(id)) { const m = new THREE.Mesh(blockGeo(id), itemBlockMat); m.scale.setScalar(0.26); return m; }
  if (!spriteMats[id]) spriteMats[id] = new THREE.SpriteMaterial({ map: itemTex(id), alphaTest: 0.3 });
  const s = new THREE.Sprite(spriteMats[id]); s.scale.setScalar(0.4); return s;
}

// ---------------- Item entities ----------------
class ItemEnt {
  constructor(id, count, x, y, z, vx = 0, vy = 3, vz = 0) {
    this.id = id; this.count = count; this.pos = new V3(x, y, z); this.vel = new V3(vx, vy, vz); this.hw = 0.12; this.h = 0.25; this.age = 0;
    this.mesh = itemMesh(id); this.phase = Math.random() * 6; G.scene.add(this.mesh);
  }
  update(dt) {
    this.age += dt;
    const fp = ITEMS[this.id] && ITEMS[this.id].fireproof; if (inLava(this, 0.1) && this.id !== IT.dragon_egg && !fp) { this.gone = true; this.remove(); Particles.emit(this.pos.x, this.pos.y + 0.3, this.pos.z, 6, [[1, 0.5, 0.1], [0.3, 0.3, 0.3]], 1, 0.6, -2, 0.3); Sfx.at('fizz', this.pos, 0.4); return; }
    if (inWater(this, 0.1) || (fp && inLava(this, 0.1))) { this.vel.y = Math.min(this.vel.y + 30 * dt, 1.2); fluidPush(this, dt); } else this.vel.y -= 20 * dt;
    const f = this.onGround ? Math.exp(-dt * 8) : Math.exp(-dt * 1);
    this.vel.x *= f; this.vel.z *= f;
    moveEntity(this, dt);
    this.mesh.position.set(this.pos.x, this.pos.y + 0.18 + Math.sin(this.age * 2.5 + this.phase) * 0.06, this.pos.z);
    this.mesh.rotation.y = this.age * 1.6 + this.phase;
  }
  remove() { G.scene.remove(this.mesh); }
}
function dropItem(id, count, x, y, z, burst = true, extra) {
  if (!id || count <= 0) return;
  if (G.items.length > 250) { const o = G.items.shift(); o.remove(); }
  const it = new ItemEnt(id, count, x, y, z, burst ? (Math.random() - 0.5) * 3 : 0, burst ? 3 + Math.random() * 2 : 0, burst ? (Math.random() - 0.5) * 3 : 0);
  if (extra) it.extra = extra; G.items.push(it); return it;
}


// ---------------- Mobs ----------------
const BOXG = new THREE.BoxGeometry(1, 1, 1);
const mobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'); const r = mulberry32(555); for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { const v = 200 + r() * 55 | 0; x.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; x.fillRect(i, j, 1, 1); } const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; })();
function part(m, parent, w, h, d, x, y, z, col, glow) {
  const mat = glow ? new THREE.MeshBasicMaterial({ color: col, map: mobTex }) : new THREE.MeshLambertMaterial({ color: col, map: mobTex });
  const mesh = new THREE.Mesh(BOXG, mat); mesh.scale.set(w, h, d); mesh.position.set(x, y, z); parent.add(mesh); m.mats.push([mat, new THREE.Color(col), !!glow]); return mesh;
}
function pivot(parent, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
// ---- skinned boxes: every part gets its own pixel-art texture (16 px per block), MC-style UV layout ----
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const SKIN = new Map(); const WHITE_C = new THREE.Color(1, 1, 1);
function getSkin(key, w, h, d, paint, ppb = 16) {
  let sk = SKIN.get(key); if (sk) return sk;
  const W = Math.max(1, Math.round(w * ppb)), H = Math.max(1, Math.round(h * ppb)), D = Math.max(1, Math.round(d * ppb));
  const CW = 2 * D + 2 * W, CH = D + H;
  const c = document.createElement('canvas'); c.width = CW; c.height = CH; const ctx = c.getContext('2d'); const img = ctx.createImageData(CW, CH); const px = img.data; let gimg = null;
  const rects = { right: [D + W, D, D, H], left: [0, D, D, H], top: [D, 0, W, D], bottom: [D + W, 0, W, D], front: [D, D, W, H], back: [2 * D + W, D, W, H] };
  const r = mulberry32(hashStr(key));
  for (const face in rects) {
    const [rx, ry, rw, rh] = rects[face];
    const set = (x, y, col, glow, a = 255) => { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= rw || y >= rh) return; const k = ((ry + y) * CW + rx + x) * 4; px[k] = clamp(col[0], 0, 255); px[k + 1] = clamp(col[1], 0, 255); px[k + 2] = clamp(col[2], 0, 255); px[k + 3] = a; if (glow) { if (!gimg) gimg = ctx.createImageData(CW, CH); const g = gimg.data; g[k] = px[k]; g[k + 1] = px[k + 1]; g[k + 2] = px[k + 2]; g[k + 3] = 255; } };
    paint(face, set, rw, rh, r);
  }
  ctx.putImageData(img, 0, 0);
  const mk = (cv) => { const t = new THREE.CanvasTexture(cv); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; };
  let gtex = null; if (gimg) { const gc = document.createElement('canvas'); gc.width = CW; gc.height = CH; gc.getContext('2d').putImageData(gimg, 0, 0); gtex = mk(gc); }
  const geo = new THREE.BoxGeometry(w, h, d); const uv = geo.attributes.uv; const order = ['right', 'left', 'top', 'bottom', 'front', 'back'];
  for (let f = 0; f < 6; f++) { const R = rects[order[f]]; for (let v = 0; v < 4; v++) { const i = f * 4 + v; const u0 = uv.getX(i), v0 = uv.getY(i); uv.setXY(i, (R[0] + u0 * R[2]) / CW, 1 - (R[1] + (1 - v0) * R[3]) / CH); } }
  uv.needsUpdate = true;
  sk = { tex: mk(c), gtex, geo }; SKIN.set(key, sk); return sk;
}
function sbox(m, parent, w, h, d, x, y, z, key, paint, o = {}) {
  const sk = getSkin(key, w, h, d, paint, o.ppb);
  const mat = o.glowAll ? new THREE.MeshBasicMaterial({ map: sk.tex, alphaTest: 0.5 }) : new THREE.MeshLambertMaterial({ map: sk.tex, alphaTest: 0.5, emissive: sk.gtex ? 0xffffff : 0x000000, emissiveMap: sk.gtex });
  const mesh = new THREE.Mesh(sk.geo, mat); mesh.position.set(x, y, z); parent.add(mesh); m.mats.push([mat, WHITE_C, !!o.glowAll]); return mesh;
}
const shadeFace = (face, y, fh) => face === 'top' ? 1.07 : face === 'bottom' ? 0.78 : 1.06 - 0.16 * (y / Math.max(1, fh - 1));
// generic fur/skin painter with soft blotches, shading and options for feet, sleeves, patches, palettes
function fur(base, v = 8, o = {}) {
  const nz = tnoise(hashStr(String(base)) + (o.seed || 0), 4), pn = tnoise(hashStr(String(base)) + 99, 4);
  return (face, set, fw, fh, r) => {
    const off = face.length * 5 + (face === 'back' ? 7 : 0); const sx = 16 / Math.max(fw, 6), sy = 16 / Math.max(fh, 6);
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
      let c = base; const side = face !== 'top' && face !== 'bottom';
      if (o.pal) c = o.pal[ihash(x >> 1, y >> 1, face.length, 5) % o.pal.length];
      if (o.patch && pn(x * sx * 0.6 + off * 2, y * sy * 0.6 + off) > o.patch[1]) c = o.patch[0];
      if (o.bottom && face === 'bottom') c = o.bottom; if (o.topc && face === 'top') c = o.topc;
      if (o.topRows && (face === 'top' || (side && y < o.topRows[0]))) c = o.topRows[1];
      if (o.foot && (face === 'bottom' || (side && y >= fh - o.foot[0]))) c = o.foot[1];
      let col = shadeC(c, (0.9 + nz(x * sx * 0.5 + off, y * sy * 0.5) * 0.2) * shadeFace(face, y, fh));
      col = vary(col, r, v);
      if (o.speck && r() < o.speck[1]) col = vary(shadeC(o.speck[0], shadeFace(face, y, fh)), r, 5);
      set(x, y, col);
    }
    if (o.extra) o.extra(face, set, fw, fh, r);
  };
}
const dots = (set, list, col, glow) => { for (const [x, y] of list) set(x, y, col, glow); };
const WHT = [246, 246, 246], BLK = [22, 22, 24];
function quadLegs(m, root, w, h, xo, zo, key, paint) { const L = []; for (const [x, z] of [[-xo, zo], [xo, zo], [-xo, -zo], [xo, -zo]]) { const p = pivot(root, x, h, z); sbox(m, p, w, h, w, 0, -h / 2, 0, key, paint); L.push(p); } return L; }
function humanoidS(m, r, k, P, armsOut, s = 1, dims = {}) {
  const aw = dims.aw || 0.24, lw = dims.lw || 0.24, bw = dims.bw || 0.5, bd = dims.bd || 0.26, lx = dims.lx || 0.125;
  m.legs = []; for (const x of [-lx, lx]) { const p = pivot(r, x, 0.75 * s, 0); sbox(m, p, lw, 0.75 * s, lw, 0, -0.375 * s, 0, k + '_leg', P.leg); m.legs.push(p); }
  sbox(m, r, bw, 0.75 * s, bd, 0, 1.125 * s, 0, k + '_body', P.body);
  m.arms = []; for (const x of [-(bw / 2 + aw / 2), bw / 2 + aw / 2]) { const p = pivot(r, x, 1.42 * s, 0); sbox(m, p, aw, 0.75 * s, aw, 0, -0.3 * s, 0, k + '_arm', P.arm); m.arms.push(p); if (armsOut) p.rotation.x = -1.45; }
  const h = pivot(r, 0, 1.5 * s, 0); m.head = h; if (P.head) sbox(m, h, 0.5, 0.5, 0.5, 0, 0.25, 0, k + '_head', P.head); return h;
}
function sword(m, arm, col, len = 0.7) { const g = pivot(arm, 0, -0.62, 0.05); g.rotation.x = 1.2; sbox(m, g, 0.06, len, 0.14, 0, len / 2, 0, 'sword_' + col.join('_') + len, fur(col, 8, { extra: (f, set, fw, fh) => { for (let y = 0; y < fh; y++) set(fw >> 1, y, shadeC(col, 1.25)); } })); sbox(m, g, 0.08, 0.06, 0.3, 0, 0.02, 0, 'sword_guard', fur([90, 74, 46], 6)); sbox(m, g, 0.06, 0.18, 0.08, 0, -0.1, 0, 'sword_grip', fur([96, 66, 40], 6)); return g; }
// ---- per-mob palettes and painters ----
const PINK = [240, 164, 160], COWB = [86, 56, 36], WOOL = [238, 236, 230], FEATH = [248, 248, 244], ROBE = [122, 82, 50], SKINV = [189, 139, 106], ZG = [92, 150, 72], BONE = [210, 210, 206];
const CREEP = [[96, 190, 72], [80, 170, 60], [124, 212, 98], [62, 142, 50], [150, 222, 132], [96, 190, 72]];
function skelPaints(bone, dark) {
  return {
    head: fur(bone, 5, { extra: (f, set, fw, fh) => { if (f !== 'front') return; dots(set, [[1, 3], [2, 3], [1, 4], [2, 4], [5, 3], [6, 3], [5, 4], [6, 4], [3, 5], [4, 5]], dark); for (let x = 1; x <= 6; x++) set(x, 6, x % 2 ? dark : shadeC(bone, 0.85)); } }),
    body: fur(bone, 5, { extra: (f, set, fw, fh) => { if (f === 'top' || f === 'bottom') return; for (let y = 0; y < fh; y++) if (y % 3 === 2 || y > fh * 0.72) for (let x = 0; x < fw; x++) if (Math.abs(x - (fw - 1) / 2) > 0.6 || f === 'left' || f === 'right') set(x, y, dark); } }),
    arm: fur(bone, 5, { extra: (f, set, fw, fh) => { if (f === 'top' || f === 'bottom') return; for (let x = 0; x < fw; x++) set(x, fh >> 1, shadeC(bone, 0.7)); } }),
    leg: fur(bone, 5, { extra: (f, set, fw, fh) => { if (f === 'top' || f === 'bottom') return; for (let x = 0; x < fw; x++) set(x, fh >> 1, shadeC(bone, 0.7)); } }),
  };
}
function piglinPaints(zombie) {
  const sk = zombie ? [226, 158, 152] : [234, 170, 158]; const rot = zombie ? [[132, 168, 104], 0.14] : null;
  return {
    head: fur(sk, 6, { speck: rot, extra: (f, set, fw, fh) => { if (f !== 'front') return; for (let x = 1; x < fw - 1; x++) set(x, 2, shadeC(sk, 0.78)); set(1, 3, WHT); set(2, 3, BLK); set(fw - 3, 3, zombie ? [222, 218, 196] : BLK); set(fw - 2, 3, WHT); set(fw >> 1, 7, shadeC(sk, 0.7)); } }),
    body: zombie ? fur(sk, 6, { speck: rot, extra: (f, set, fw, fh) => { if (f !== 'front') return; for (let y = 2; y < fh - 3; y++) if (y % 2 === 0) for (let x = 1; x < fw / 2; x++) set(x, y, [226, 222, 200]); for (let x = 0; x < fw; x++) { set(x, fh - 2, [110, 78, 52]); set(x, fh - 1, [96, 66, 44]); } } })
      : fur([132, 86, 52], 7, { extra: (f, set, fw, fh) => { for (let x = 0; x < fw; x++) set(x, Math.round(fh * 0.66), [74, 46, 26]); if (f === 'front') { set(fw >> 1, Math.round(fh * 0.66), [246, 208, 64]); set((fw >> 1) - 1, Math.round(fh * 0.66), [246, 208, 64]); dots(set, [[fw >> 1, 3], [fw >> 1, 6]], [246, 208, 64]); } } }),
    arm: fur(sk, 6, { speck: rot }),
    leg: fur(zombie ? [110, 80, 60] : [96, 64, 40], 6, { foot: [3, zombie ? [80, 60, 44] : [60, 40, 26]] }),
  };
}
const MOBS = {
  pig: { name: 'Pig', hp: 10, w: 0.9, h: 0.9, speed: 1.4, kind: 'passive', snd: 'oink', grazer: true, drops: [['raw_pork', 1, 3, 1]], build(m, r) {
    sbox(m, r, 0.62, 0.55, 0.95, 0, 0.64, 0, 'pig_body', fur(PINK, 6, { bottom: [248, 188, 184], speck: [[224, 144, 140], 0.05] }));
    const h = pivot(r, 0, 0.78, 0.48); m.head = h;
    sbox(m, h, 0.5, 0.5, 0.45, 0, 0, 0.16, 'pig_head', fur(PINK, 6, { extra: (f, set, fw) => { if (f === 'front') { set(1, 3, WHT); set(2, 3, BLK); set(fw - 3, 3, BLK); set(fw - 2, 3, WHT); } } }));
    sbox(m, h, 0.3, 0.2, 0.06, 0, -0.07, 0.41, 'pig_snout', fur([246, 186, 180], 4, { extra: (f, set, fw) => { if (f === 'front') { set(1, 1, [150, 80, 80]); set(fw - 2, 1, [150, 80, 80]); } } }));
    m.legs = quadLegs(m, r, 0.22, 0.37, 0.18, 0.3, 'pig_leg', fur(PINK, 6, { foot: [2, [170, 100, 96]] }));
    m.tail = pivot(r, 0, 0.8, -0.48); sbox(m, m.tail, 0.07, 0.07, 0.16, 0, 0.02, -0.07, 'pig_tail', fur([228, 148, 146], 4)); } },
  cow: { name: 'Cow', hp: 10, w: 0.9, h: 1.4, speed: 1.2, kind: 'passive', snd: 'moo', grazer: true, drops: [['raw_beef', 1, 3, 1], ['leather', 0, 2, 1]], build(m, r) {
    sbox(m, r, 0.8, 0.72, 1.15, 0, 0.97, 0, 'cow_body', fur(COWB, 6, { patch: [[236, 234, 228], 0.58], bottom: [226, 222, 214] }));
    sbox(m, r, 0.3, 0.12, 0.26, 0, 0.56, -0.25, 'cow_udder', fur([236, 170, 170], 4));
    const h = pivot(r, 0, 1.2, 0.6); m.head = h;
    sbox(m, h, 0.55, 0.5, 0.4, 0, 0, 0.12, 'cow_head', fur(COWB, 6, { extra: (f, set, fw, fh) => { if (f !== 'front') return; for (let y = 0; y < fh; y++) { set((fw >> 1) - 1, y, [236, 234, 228]); set(fw >> 1, y, [236, 234, 228]); } set(1, 3, WHT); set(2, 3, BLK); set(fw - 3, 3, BLK); set(fw - 2, 3, WHT); } }));
    sbox(m, h, 0.42, 0.22, 0.08, 0, -0.13, 0.35, 'cow_muzzle', fur([214, 182, 166], 4, { extra: (f, set, fw) => { if (f === 'front') { set(1, 1, [96, 66, 60]); set(fw - 2, 1, [96, 66, 60]); } } }));
    for (const s of [-1, 1]) sbox(m, h, 0.08, 0.18, 0.08, s * 0.26, 0.28, 0.1, 'cow_horn', fur([226, 220, 200], 4, { topc: [140, 130, 110], topRows: [1, [150, 140, 120]] }));
    m.legs = quadLegs(m, r, 0.24, 0.62, 0.24, 0.4, 'cow_leg', fur(COWB, 6, { patch: [[236, 234, 228], 0.62], foot: [2, [44, 36, 32]] }));
    m.tail = pivot(r, 0, 1.28, -0.58); sbox(m, m.tail, 0.07, 0.6, 0.07, 0, -0.3, 0, 'cow_tail', fur(COWB, 4, { foot: [3, [40, 30, 24]] })); } },
  sheep: { name: 'Sheep', hp: 8, w: 0.9, h: 1.3, speed: 1.3, kind: 'passive', snd: 'baa', grazer: true, drops: [['wool', 1, 2, 1], ['raw_beef', 0, 1, 0.5]], build(m, r) {
    const woolP = fur(WOOL, 7, { speck: [[208, 204, 196], 0.2] });
    m.wool = [sbox(m, r, 0.86, 0.78, 1.08, 0, 0.9, 0, 'sheep_wool', woolP)];
    m.skinBody = sbox(m, r, 0.62, 0.56, 0.95, 0, 0.88, 0, 'sheep_skin', fur([214, 196, 170], 5, { speck: [[196, 176, 150], 0.1] })); m.skinBody.visible = false;
    const h = pivot(r, 0, 1.05, 0.58); m.head = h;
    sbox(m, h, 0.38, 0.4, 0.42, 0, 0, 0.12, 'sheep_head', fur([216, 198, 172], 5, { extra: (f, set, fw) => { if (f !== 'front') return; set(0, 2, WHT); set(1, 2, BLK); set(fw - 2, 2, BLK); set(fw - 1, 2, WHT); set((fw >> 1) - 1, 5, [186, 136, 126]); set(fw >> 1, 5, [186, 136, 126]); } }));
    m.wool.push(sbox(m, h, 0.46, 0.2, 0.34, 0, 0.17, 0.05, 'sheep_cap', woolP));
    m.legs = quadLegs(m, r, 0.2, 0.52, 0.2, 0.33, 'sheep_leg', fur([210, 192, 166], 5, { foot: [2, [110, 92, 82]] }));
    for (const l of m.legs) m.wool.push(sbox(m, l, 0.28, 0.22, 0.28, 0, -0.1, 0, 'sheep_thigh', woolP)); } },
  chicken: { name: 'Chicken', hp: 4, w: 0.45, h: 0.8, speed: 1.2, kind: 'passive', snd: 'cluck', drops: [['raw_chicken', 1, 1, 1], ['feather', 0, 2, 1]], build(m, r) {
    sbox(m, r, 0.38, 0.36, 0.5, 0, 0.47, 0, 'ch_body', fur(FEATH, 4, { speck: [[222, 222, 216], 0.08] }));
    sbox(m, r, 0.3, 0.22, 0.1, 0, 0.62, -0.27, 'ch_tail', fur(FEATH, 4, { topRows: [1, [226, 226, 220]] }));
    const h = pivot(r, 0, 0.74, 0.22); m.head = h;
    sbox(m, h, 0.25, 0.32, 0.2, 0, 0, 0, 'ch_head', fur(FEATH, 4, { extra: (f, set, fw) => { if (f === 'front') { set(0, 1, BLK); set(fw - 1, 1, BLK); } if (f === 'left' || f === 'right') set(1, 1, BLK); } }));
    sbox(m, h, 0.16, 0.08, 0.12, 0, 0, 0.15, 'ch_beak', fur([244, 176, 44], 4, { foot: [1, [214, 140, 30]] }));
    sbox(m, h, 0.08, 0.12, 0.06, 0, -0.1, 0.12, 'ch_wattle', fur([214, 40, 40], 4));
    m.wings = [pivot(r, -0.21, 0.58, 0), pivot(r, 0.21, 0.58, 0)]; for (const w of m.wings) sbox(m, w, 0.06, 0.26, 0.38, 0, -0.1, 0, 'ch_wing', fur(FEATH, 4, { foot: [2, [206, 206, 200]] }));
    m.legs = []; for (const x of [-0.08, 0.08]) { const p = pivot(r, x, 0.29, 0); sbox(m, p, 0.05, 0.29, 0.05, 0, -0.145, 0, 'ch_leg', fur([232, 170, 40], 4)); sbox(m, p, 0.14, 0.03, 0.14, 0, -0.28, 0.04, 'ch_foot', fur([232, 170, 40], 4)); m.legs.push(p); } } },
  villager: { name: 'Villager', hp: 20, w: 0.6, h: 1.95, speed: 0.9, kind: 'passive', snd: 'hmm', drops: [], build(m, r) {
    sbox(m, r, 0.52, 0.95, 0.34, 0, 1.0, 0, 'vil_robe', fur(ROBE, 6, { extra: (f, set, fw, fh) => { if (f === 'top' || f === 'bottom') return; for (let x = 0; x < fw; x++) { set(x, 5, [84, 54, 30]); set(x, 6, [96, 62, 36]); set(x, fh - 1, [80, 52, 30]); } if (f === 'front') for (let y = 7; y < fh - 1; y++) set(fw >> 1, y, [100, 66, 40]); } }));
    sbox(m, r, 0.62, 0.22, 0.24, 0, 1.18, 0.25, 'vil_arms', fur(ROBE, 6, { topRows: [1, [140, 96, 60]] })); sbox(m, r, 0.2, 0.18, 0.2, 0, 1.18, 0.33, 'vil_hands', fur(SKINV, 4));
    const h = pivot(r, 0, 1.48, 0); m.head = h;
    sbox(m, h, 0.46, 0.55, 0.46, 0, 0.27, 0, 'vil_head', fur(SKINV, 5, { extra: (f, set, fw, fh) => { if (f !== 'front') return; for (let x = 1; x < fw - 1; x++) set(x, 3, [74, 48, 30]); set(1, 4, WHT); set(2, 4, [50, 140, 70]); set(fw - 3, 4, [50, 140, 70]); set(fw - 2, 4, WHT); for (let x = 2; x < fw - 2; x++) set(x, 7, [150, 100, 80]); } }));
    sbox(m, h, 0.1, 0.22, 0.1, 0, 0.16, 0.28, 'vil_nose', fur([176, 124, 94], 4));
    m.legs = []; for (const x of [-0.12, 0.12]) { const p = pivot(r, x, 0.55, 0); sbox(m, p, 0.22, 0.55, 0.24, 0, -0.275, 0, 'vil_leg', fur([84, 84, 88], 5, { foot: [2, [52, 42, 34]] })); m.legs.push(p); } } },
  zombie: { name: 'Zombie', hp: 20, w: 0.6, h: 1.95, speed: 2.3, kind: 'hostile', dmg: 3, snd: 'groan', burns: true, drops: [['rotten_flesh', 0, 2, 1], ['iron_ingot', 1, 1, 0.05]], build(m, r) {
    humanoidS(m, r, 'zom', {
      head: fur(ZG, 7, { speck: [[68, 116, 52], 0.12], topRows: [1, [62, 104, 48]], extra: (f, set) => { if (f !== 'front') return; dots(set, [[1, 4], [2, 4], [5, 4], [6, 4]], [18, 30, 18]); dots(set, [[1, 3], [6, 3]], [60, 96, 46]); dots(set, [[2, 6], [3, 6], [4, 6], [5, 6]], [52, 84, 40]); } }),
      body: fur([30, 156, 160], 6, { extra: (f, set, fw, fh, r) => { if (f === 'front') { dots(set, [[3, 0], [4, 0], [3, 1], [4, 1]], ZG); } if (f !== 'top' && f !== 'bottom') for (let x = 0; x < fw; x++) if (r() < 0.5) set(x, fh - 1, ZG); } }),
      arm: fur(ZG, 7, { speck: [[68, 116, 52], 0.12], topRows: [3, [30, 156, 160]] }),
      leg: fur([62, 58, 158], 6, { foot: [2, [72, 72, 76]] }) }, true); } },
  skeleton: { name: 'Skeleton', hp: 20, w: 0.6, h: 1.95, speed: 2.1, kind: 'hostile', dmg: 3, snd: 'rattle', burns: true, ranged: true, drops: [['bone', 0, 2, 1], ['arrow', 0, 2, 1]], build(m, r) {
    humanoidS(m, r, 'skel', skelPaints(BONE, [38, 38, 40]), false, 1, { aw: 0.12, lw: 0.12, bw: 0.42, bd: 0.2, lx: 0.1 });
    const bow = pivot(m.arms[1], 0, -0.66, 0.1); sbox(m, bow, 0.05, 0.7, 0.05, 0, 0, 0, 'skel_bow', fur([110, 76, 42], 5)); for (const a of m.arms) a.rotation.x = -1.4; } },
  spider: { name: 'Spider', hp: 16, w: 1.3, h: 0.9, speed: 2.8, kind: 'neutral', darkHostile: true, dmg: 2, snd: 'hissS', climbs: true, drops: [['string', 0, 2, 1]], build(m, r) {
    sbox(m, r, 0.85, 0.65, 0.9, 0, 0.58, -0.6, 'sp_abd', fur([56, 44, 38], 9, { speck: [[96, 80, 66], 0.16], extra: (f, set, fw, fh) => { if (f !== 'top' && f !== 'back') return; const cx = fw / 2 - 0.5, cy = fh / 2; for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) { const d = Math.abs(x - cx) + Math.abs(y - cy) * 0.8; if (d < 3.2 && d > 1.6) set(x, y, [120, 40, 30]); } } }));
    sbox(m, r, 0.5, 0.45, 0.45, 0, 0.52, -0.05, 'sp_thorax', fur([44, 36, 32], 9, { speck: [[90, 74, 60], 0.12] }));
    const h = pivot(r, 0, 0.52, 0.3); m.head = h;
    sbox(m, h, 0.6, 0.5, 0.45, 0, 0, 0.12, 'sp_head', fur([48, 40, 36], 9, { speck: [[90, 74, 60], 0.1], extra: (f, set, fw) => { if (f !== 'front') return; const R = [214, 24, 20], R2 = [255, 90, 70]; dots(set, [[2, 3], [3, 3], [2, 4], [3, 4], [fw - 4, 3], [fw - 3, 3], [fw - 4, 4], [fw - 3, 4]], R, true); dots(set, [[2, 3], [fw - 3, 3]], R2, true); dots(set, [[1, 2], [fw - 2, 2], [3, 1], [fw - 4, 1], [0, 4], [fw - 1, 4]], [170, 16, 16], true); } }));
    m.legs = []; for (const z of [0.2, 0.07, -0.07, -0.2]) for (const s of [-1, 1]) { const p = pivot(r, s * 0.25, 0.55, z); sbox(m, p, 0.95, 0.08, 0.08, s * 0.45, 0, 0, 'sp_leg', fur([42, 34, 30], 8, { extra: (f, set, fw) => { set(5, 0, [100, 84, 70]); set(fw - 5, 0, [100, 84, 70]); } })); p.rotation.z = -s * 0.45; p.userData.side = s; m.legs.push(p); } } },
  creeper: { name: 'Creeper', hp: 20, w: 0.6, h: 1.7, speed: 2.0, kind: 'hostile', snd: 'hiss', creeper: true, drops: [['gunpowder', 0, 2, 1]], build(m, r) {
    m.legs = quadLegs(m, r, 0.24, 0.36, 0.13, 0.18, 'cr_leg', fur(null, 9, { pal: CREEP, foot: [1, [52, 110, 40]] }));
    sbox(m, r, 0.48, 0.86, 0.27, 0, 0.8, 0, 'cr_body', fur(null, 9, { pal: CREEP }));
    const h = pivot(r, 0, 1.22, 0); m.head = h;
    sbox(m, h, 0.5, 0.5, 0.5, 0, 0.25, 0, 'cr_head', fur(null, 9, { pal: CREEP, extra: (f, set) => { if (f !== 'front') return; const D = [20, 34, 18]; dots(set, [[1, 2], [2, 2], [1, 3], [2, 3], [5, 2], [6, 2], [5, 3], [6, 3], [3, 4], [4, 4], [2, 5], [3, 5], [4, 5], [5, 5], [2, 6], [5, 6]], D); } })); } },
  enderman: { name: 'Enderman', hp: 40, w: 0.6, h: 2.9, speed: 4.0, kind: 'neutral', dmg: 4, snd: 'vwoop', waterHurt: true, drops: [['ender_pearl', 1, 1, 0.65]], build(m, r) {
    const EB = fur([26, 24, 30], 4, { speck: [[44, 28, 58], 0.05] });
    m.legs = []; for (const x of [-0.11, 0.11]) { const p = pivot(r, x, 1.75, 0); sbox(m, p, 0.13, 1.75, 0.13, 0, -0.875, 0, 'en_limb', EB); m.legs.push(p); }
    sbox(m, r, 0.46, 0.72, 0.24, 0, 2.1, 0, 'en_body', EB);
    m.arms = []; for (const x of [-0.3, 0.3]) { const p = pivot(r, x, 2.42, 0); sbox(m, p, 0.12, 1.65, 0.12, 0, -0.8, 0, 'en_arm', EB); m.arms.push(p); }
    const h = pivot(r, 0, 2.46, 0); m.head = h;
    sbox(m, h, 0.48, 0.42, 0.48, 0, 0.2, 0, 'en_head', fur([22, 20, 26], 4, { extra: (f, set, fw) => { if (f !== 'front') return; const P = [204, 0, 250], L = [255, 170, 255]; dots(set, [[0, 3], [1, 3], [2, 3], [fw - 3, 3], [fw - 2, 3], [fw - 1, 3]], P, true); dots(set, [[1, 3], [fw - 2, 3]], L, true); } }));
    m.jaw = sbox(m, h, 0.46, 0.12, 0.46, 0, -0.03, 0, 'en_jaw', EB); } },
  ghast: { name: 'Ghast', hp: 10, w: 4, h: 4, speed: 2.4, kind: 'hostile', fly: true, fireproof: true, snd: 'ghast', drops: [['ghast_tear', 0, 1, 1], ['gunpowder', 0, 2, 1]], build(m, r) {
    sbox(m, r, 4, 4, 4, 0, 2.6, 0, 'gh_body', fur([240, 240, 238], 4, { speck: [[214, 214, 212], 0.08], extra: (f, set) => { if (f !== 'front') return; for (let x = 3; x <= 5; x++) set(x, 6, [70, 70, 72]); for (let x = 10; x <= 12; x++) set(x, 6, [70, 70, 72]); dots(set, [[4, 7], [4, 8], [11, 7], [11, 8], [11, 9]], [184, 184, 186]); for (let x = 6; x <= 9; x++) set(x, 11, [80, 80, 82]); } }), { ppb: 4 });
    m.faceN = []; m.faceA = [sbox(m, r, 4.02, 4.02, 4.02, 0, 2.6, 0, 'gh_face', (f, set) => { if (f !== 'front') return; for (let y = 4; y <= 7; y++) for (const x0 of [3, 10]) for (let x = x0; x < x0 + 3; x++) set(x, y, y === 5 || y === 6 ? (x === x0 + 1 ? [255, 60, 40] : [60, 0, 0]) : [40, 0, 0], true); for (let y = 9; y <= 12; y++) for (let x = 5; x <= 10; x++) set(x, y, y === 9 || x === 5 || x === 10 ? [70, 10, 10] : [200, 30, 30], true); }, { ppb: 4 })];
    m.faceA[0].visible = false;
    m.tent = []; for (let i = 0; i < 9; i++) { const p = pivot(r, -1.3 + (i % 3) * 1.3 + (Math.random() - 0.5) * 0.3, 0.6, -1.3 + Math.floor(i / 3) * 1.3); const L = [1.5, 2.0, 2.5][i % 3]; sbox(m, p, 0.25, L, 0.25, 0, -L / 2, 0, 'gh_tent' + L, fur([232, 232, 230], 4, { extra: (f, set, fw, fh) => { for (let y = 3; y < fh; y += 6) for (let x = 0; x < fw; x++) set(x, y, [204, 204, 202]); } })); m.tent.push(p); } } },
  blaze: { name: 'Blaze', hp: 20, w: 0.6, h: 1.8, speed: 2.4, kind: 'hostile', fly: true, fireproof: true, glowAll: true, snd: 'blaze', drops: [['blaze_rod', 1, 1, 0.7]], build(m, r) {
    const h = pivot(r, 0, 1.35, 0); m.head = h;
    sbox(m, h, 0.5, 0.5, 0.5, 0, 0, 0, 'bz_head', fur([246, 200, 62], 8, { speck: [[230, 140, 30], 0.2], extra: (f, set) => { if (f !== 'front') return; dots(set, [[1, 3], [2, 3], [5, 3], [6, 3]], [60, 30, 0]); dots(set, [[2, 5], [3, 5], [4, 5], [5, 5]], [196, 110, 20]); } }), { glowAll: true });
    m.rods = []; for (let ring = 0; ring < 3; ring++) { const g = pivot(r, 0, 0.35 + ring * 0.38, 0); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + ring * 0.4; sbox(m, g, 0.13, 0.5, 0.13, Math.cos(a) * (0.55 - ring * 0.08), 0, Math.sin(a) * (0.55 - ring * 0.08), 'bz_rod', fur([252, 214, 80], 6, { foot: [3, [232, 140, 30]], topRows: [1, [255, 240, 160]] }), { glowAll: true }); } m.rods.push(g); } } },
  magma_cube: { name: 'Magma Cube', hp: 16, w: 2.04, h: 2.04, speed: 2, kind: 'hostile', dmg: 6, fireproof: true, ai: 'magma', snd: 'squish', drops: [['magma_cream', 0, 1, 1]], build(m, r) {
    sbox(m, r, 1, 1, 1, 0, 0.5, 0, 'mg_body', (f, set, fw, fh, rr) => { for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) { let c = vary(y % 2 ? [62, 20, 12] : [48, 14, 10], rr, 6); let g = false; if ((y === 2 || y === 5) && rr() < 0.75) { c = vary([255, 130, 30], rr, 20); g = true; } set(x, y, c, g); } if (f === 'front') { dots(set, [[2, 2], [5, 2]], [255, 224, 90], true); dots(set, [[2, 3], [5, 3]], [255, 60, 10], true); } }, { ppb: 8 });
    sbox(m, r, 0.55, 0.55, 0.55, 0, 0.5, 0, 'mg_core', fur([255, 170, 60], 10), { glowAll: true }); } },
  zombified_piglin: { name: 'Zombified Piglin', hp: 20, w: 0.6, h: 1.95, speed: 2.4, kind: 'neutral', dmg: 5, fireproof: true, snd: 'grunt', drops: [['rotten_flesh', 0, 1, 1], ['gold_nugget', 0, 2, 1], ['gold_ingot', 1, 1, 0.04]], build(m, r) { piglinModel(m, r, true); } },
  piglin: { name: 'Piglin', hp: 16, w: 0.6, h: 1.95, speed: 2.5, kind: 'hostile', dmg: 5, snd: 'snort', drops: [['gold_nugget', 0, 3, 1], ['leather', 0, 1, 0.3]], build(m, r) { piglinModel(m, r, false); } },
  hoglin: { name: 'Hoglin', hp: 40, w: 1.4, h: 1.4, speed: 2.2, kind: 'hostile', dmg: 6, kb: 1.9, snd: 'grunt', drops: [['raw_pork', 2, 4, 1], ['leather', 0, 1, 1]], build(m, r) {
    sbox(m, r, 1.0, 0.9, 1.6, 0, 1.1, 0, 'hog_body', fur([156, 108, 86], 8, { speck: [[120, 80, 62], 0.16], topc: [190, 150, 116] }));
    sbox(m, r, 0.3, 0.35, 1.3, 0, 1.68, 0.05, 'hog_mane', fur([216, 186, 140], 12, { speck: [[176, 146, 106], 0.3] }));
    const h = pivot(r, 0, 1.1, 0.85); m.head = h;
    sbox(m, h, 0.8, 0.7, 0.9, 0, -0.05, 0.4, 'hog_head', fur([146, 100, 80], 8, { speck: [[116, 78, 60], 0.12], extra: (f, set, fw) => { if (f === 'front') { set(2, 3, BLK); set(fw - 3, 3, BLK); for (let x = 1; x < fw - 1; x++) set(x, 2, [110, 72, 56]); } } }));
    sbox(m, h, 0.5, 0.3, 0.12, 0, -0.2, 0.88, 'hog_snout', fur([204, 148, 130], 5, { extra: (f, set, fw) => { if (f === 'front') { set(2, 2, [110, 60, 56]); set(fw - 3, 2, [110, 60, 56]); } } }));
    for (const s of [-1, 1]) { sbox(m, h, 0.1, 0.4, 0.1, s * 0.38, -0.1, 0.8, 'hog_tusk', fur([240, 234, 216], 3, { topRows: [2, [255, 255, 245]] })); const e = pivot(h, s * 0.45, 0.25, 0.3); e.rotation.z = s * 0.5; sbox(m, e, 0.15, 0.28, 0.06, 0, 0, 0, 'hog_ear', fur([146, 100, 80], 6)); }
    m.legs = quadLegs(m, r, 0.32, 0.66, 0.32, 0.55, 'hog_leg', fur([130, 88, 70], 8, { foot: [3, [60, 46, 40]] })); } },
  wither_skeleton: { name: 'Wither Skeleton', hp: 20, w: 0.7, h: 2.4, speed: 2.4, kind: 'hostile', dmg: 7, fireproof: true, snd: 'rattle', drops: [['coal', 0, 1, 1], ['bone', 0, 2, 1]], build(m, r) { humanoidS(m, r, 'wskel', skelPaints([54, 54, 58], [14, 14, 16]), false, 1.22, { aw: 0.13, lw: 0.13, bw: 0.44, bd: 0.22, lx: 0.1 }); sword(m, m.arms[1], [130, 130, 136], 0.85); } },
  strider: { name: 'Strider', hp: 20, w: 0.9, h: 1.7, speed: 1.4, kind: 'passive', fireproof: true, lavaWalk: true, snd: 'chirp', drops: [['string', 2, 5, 1]], build(m, r) {
    sbox(m, r, 0.95, 0.85, 0.95, 0, 1.25, 0, 'str_body', fur([170, 58, 42], 8, { bottom: [120, 36, 28], extra: (f, set, fw, fh) => { if (f === 'top' || f === 'bottom') return; for (let x = 1; x < fw; x += 3) for (let y = 1; y < fh - 1; y++) if (y % 4 !== 0) set(x, y, [140, 42, 32]); if (f === 'front') { dots(set, [[3, 5], [4, 5], [fw - 5, 5], [fw - 4, 5]], WHT); dots(set, [[4, 5], [fw - 5, 5]], BLK); for (let x = 4; x < fw - 4; x++) set(x, 10, [90, 24, 20]); } } }));
    for (let i = 0; i < 6; i++) sbox(m, r, 0.05, [0.5, 0.65, 0.8][i % 3], 0.05, -0.35 + i * 0.14, 1.85, (i % 2) * 0.2 - 0.1, 'str_hair' + (i % 3), fur([120, 40, 64], 6));
    m.legs = []; for (const x of [-0.24, 0.24]) { const p = pivot(r, x, 0.85, 0); sbox(m, p, 0.2, 0.85, 0.2, 0, -0.425, 0, 'str_leg', fur([96, 62, 88], 6, { extra: (f, set, fw, fh) => { for (let xx = 0; xx < fw; xx++) set(xx, fh >> 1, [130, 92, 120]); } })); m.legs.push(p); } } },
};
function piglinModel(m, r, zombie) {
  const P = piglinPaints(zombie); const k = zombie ? 'zpg' : 'pg';
  const h = humanoidS(m, r, k, { body: P.body, arm: P.arm, leg: P.leg }, false);
  sbox(m, h, 0.56, 0.5, 0.5, 0, 0.25, 0, k + '_head', P.head);
  sbox(m, h, 0.3, 0.2, 0.1, 0, 0.12, 0.3, k + '_snout', fur(zombie ? [214, 150, 144] : [242, 184, 172], 4, { extra: (f, set, fw) => { if (f === 'front') { set(1, 1, [110, 50, 50]); set(fw - 2, 1, [110, 50, 50]); } } }));
  for (const s of [-1, 1]) { sbox(m, h, 0.05, 0.12, 0.05, s * 0.17, 0.05, 0.28, 'pg_tusk', fur([240, 234, 216], 3)); const e = pivot(h, s * 0.28, 0.4, 0); e.rotation.z = s * 0.6; sbox(m, e, 0.06, 0.3, 0.2, s * 0.03, -0.15, 0, k + '_ear', fur(zombie ? [226, 158, 152] : [234, 170, 158], 5, { extra: (f, set, fw, fh) => { if (f === 'left' || f === 'right') for (let y = 1; y < fh - 1; y++) set(1, y, [200, 120, 116]); } })); }
  const sw = sword(m, m.arms[1], [246, 208, 64]);
  if (!zombie) { m.swordG = sw; m.goldHand = sbox(m, m.arms[0], 0.18, 0.1, 0.24, 0, -0.65, 0.05, 'pg_gold', fur([246, 210, 64], 6, { topRows: [1, [255, 245, 160]] })); m.goldHand.visible = false; }
}
const RED = new THREE.Color(1, 0.2, 0.2), WHITE = new THREE.Color(1, 1, 1);
function playerHoldsGold() { const h = G.player && G.player.held(); return !!(h && (h.id === IT.gold_ingot)); }
const MOB_PITCH = { wither_skeleton: 0.72, zombified_piglin: 0.82, magma_cube: 0.7, piglin: 1.12, strider: 1.2, blaze: 1.1, chicken: 1.1 };
class Mob {
  constructor(type, x, y, z, opts = {}) {
    const t = MOBS[type]; this.t = t; this.type = type; this.pos = new V3(x, y, z); this.vel = new V3();
    this.size = opts.size || 4; this.opts = opts; const sc = t.ai === 'magma' ? this.size * 0.51 : 1;
    this.hw = t.ai === 'magma' ? this.size * 0.255 : t.w / 2; this.h = t.ai === 'magma' ? this.size * 0.51 : t.h; this.hp = t.ai === 'magma' ? this.size * this.size : t.hp; this.maxHp = this.hp;
    this.lavaWalk = !!t.lavaWalk;
    this.yaw = Math.random() * Math.PI * 2; this.mats = []; this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body); t.build(this, this.body); this.body.scale.setScalar(sc); this.baseScale = sc; G.scene.add(this.root); this.root.traverse(o => { if (o.isMesh) o.layers.enable(1); });
    this.hurtT = 0; this.atkCD = 1; this.walk = 0; this.wT = 0; this.wMove = 0; this.wYaw = this.yaw; this.flee = 0; this.angry = 0; this.fuse = 0; this.dead = false; this.deadT = 0;
    this.light = 1; this.lightT = 0; this.burnT = 0; this.lavaT = 0; this.sndT = 3 + Math.random() * 10; this.age = 0; this.shootT = 2 + Math.random() * 2; this.jumpT = 1; this.admireT = 0; this.volley = 0;
    this.lookT = Math.random() * 3; this.lookYaw = 0; this.lookPitch = 0; this.grazeT = 0; this.hy = 0; this.hp_ = 0; this.root.scale.setScalar(0.01);
  }
  get center() { return new V3(this.pos.x, this.pos.y + this.h * 0.5, this.pos.z); }
  hurt(dmg, src, kb = 1, noAnger) {
    if (this.dead) return; this.hp -= dmg; this.hurtT = 0.35; Sfx.mob(this, 'hurt', 0.7);
    if (src && !this.t.fly) { const d = new V3(this.pos.x - src.x, 0, this.pos.z - src.z); if (d.lengthSq() > 1e-4) d.normalize(); const k = this.type === 'hoglin' || this.type === 'ghast' ? 0.4 : 1; this.vel.x += d.x * 7 * kb * k; this.vel.z += d.z * 7 * kb * k; this.vel.y = Math.max(this.vel.y, 5 * kb * k); }
    if (src && this.t.fly) { const d = this.pos.clone().sub(src); d.y = 0; if (d.lengthSq() > 1e-4) d.normalize(); this.vel.addScaledVector(d, 4 * kb); }
    if (this.t.kind === 'passive') this.flee = 5;
    if (src && !noAnger) this.angry = 30;
    if (this.type === 'zombified_piglin' && src && !noAnger) for (const m of G.mobs) if (m.type === 'zombified_piglin' && m.pos.distanceTo(this.pos) < 24) m.angry = 30;
    if (this.type === 'enderman' && this.hp > 0 && Math.random() < 0.6) this.teleport();
    if (this.hp <= 0) { this.dead = true; this.deadT = 0; }
  }
  teleport(towards) {
    const w = G.world;
    for (let tries = 0; tries < 20; tries++) {
      const base = towards || this.pos; const x = Math.floor(base.x + (Math.random() - 0.5) * (towards ? 8 : 26)), z = Math.floor(base.z + (Math.random() - 0.5) * (towards ? 8 : 26));
      if (!w.loaded(x, z)) continue;
      for (let y = Math.floor(base.y) + 8; y > Math.floor(base.y) - 12 && y > 1; y--) {
        if (SOLID[w.get(x, y - 1, z)] && !w.get(x, y, z) && !w.get(x, y + 1, z) && !w.get(x, y + 2, z)) {
          Particles.emit(this.pos.x, this.pos.y + 1.4, this.pos.z, 24, [[0.6, 0.2, 0.9], [0.3, 0.05, 0.5]], 2, 0.9, -1, 1.4);
          this.pos.set(x + 0.5, y, z + 0.5); this.vel.set(0, 0, 0); Sfx.at('vwoop', this.pos, 1);
          Particles.emit(this.pos.x, this.pos.y + 1.4, this.pos.z, 24, [[0.6, 0.2, 0.9], [0.3, 0.05, 0.5]], 2, 0.9, -1, 1.4); return true;
        }
      }
    }
    return false;
  }
  remove() { G.scene.remove(this.root); for (const [m] of this.mats) m.dispose(); }
  dropLoot() {
    const t = this.t; if (MODS.hooks.mobDeath) modFire('mobDeath', { type: this.type, x: this.pos.x, y: this.pos.y, z: this.pos.z });
    if (t.ai === 'magma') { if (this.size > 1) { const n = 2 + (Math.random() * 2 | 0); for (let i = 0; i < n; i++) { const m = spawnMob('magma_cube', this.pos.x + (Math.random() - 0.5), this.pos.y + 0.2, this.pos.z + (Math.random() - 0.5), { size: this.size / 2 }); m.vel.set((Math.random() - 0.5) * 4, 4, (Math.random() - 0.5) * 4); } if (Math.random() < 0.5) dropItem(IT.magma_cream, 1, this.pos.x, this.pos.y + 0.5, this.pos.z); } return; }
    for (const [k, a, b, p] of t.drops) if (Math.random() < p) { const n = a + Math.floor(Math.random() * (b - a + 1)); if (n > 0) dropItem(IT[k], n, this.pos.x, this.pos.y + 0.5, this.pos.z); }
  }
  update(dt) {
    const P = G.player, w = G.world, t = this.t; this.age += dt;
    this.hurtT = Math.max(0, this.hurtT - dt); this.atkCD -= dt; this.flee -= dt; this.angry -= dt;
    this.lightT -= dt; if (this.lightT <= 0) { this.lightT = 0.3; this.light = t.glowAll ? 1 : w.lightAt(this.pos.x, this.pos.y + Math.min(this.h, 2) * 0.7, this.pos.z, G.daylight); this.light = Math.max(this.light, G.minLight || 0); }
    if (this.dead) {
      this.deadT += dt; const k = Math.min(1, this.deadT * 3.5); this.root.rotation.z = (1 - Math.pow(1 - k, 3)) * Math.PI / 2 * (this.deathSide || (this.deathSide = Math.random() < 0.5 ? -1 : 1)); if (t.fly) this.pos.y -= dt * 2;
      this.root.position.set(this.pos.x, this.pos.y, this.pos.z); this.hurtT = 0.2; this.colorize();
      if (this.deadT > 1.0) { this.gone = true; Particles.emit(this.pos.x, this.pos.y + this.h * 0.5, this.pos.z, 20, [0.8, 0.8, 0.8], 2, 0.8, -1, Math.max(0.8, this.hw * 2), Math.max(0.3, this.light)); this.dropLoot(); }
      return;
    }
    const water = inWater(this, 0.4), lava = inLava(this, 0.3); if (water) fluidPush(this, dt, 0.6);
    if (lava && !t.fireproof) { this.lavaT += dt; if (this.lavaT > 0.5) { this.lavaT = 0; this.hurt(4, null, 0); } }
    if (t.waterHurt && water) { this.lavaT += dt; if (this.lavaT > 0.8) { this.lavaT = 0; this.hurt(1, null, 0); this.teleport(); } }
    const dx = P.pos.x - this.pos.x, dz = P.pos.z - this.pos.z, dy = P.pos.y - this.pos.y; const dist = Math.sqrt(dx * dx + dz * dz + dy * dy);
    const canTarget = isSurv() && !P.dead;
    let hostileNow = t.kind === 'hostile' || (t.kind === 'neutral' && (this.angry > 0 || (t.darkHostile && this.light < 0.45)));
    if (this.type === 'piglin') { if (this.angry <= 0 && (playerHoldsGold() || this.admireT > 0)) hostileNow = false; if (this.goldHand) { this.goldHand.visible = this.admireT > 0; } }
    if (this.type === 'enderman' && this.angry <= 0 && canTarget && dist < 28 && isLookingAt(this)) { this.angry = 25; Sfx.at('scream', this.pos, 1); }
    if (this.admireT > 0) { this.admireT -= dt; if (this.admireT <= 0) { const [id, n] = rollBarter(); const it = dropItem(id, n, this.pos.x, this.pos.y + 1.2, this.pos.z, false); const d = new V3(dx, 0, dz).normalize(); it.vel.set(d.x * 3, 3, d.z * 3); Sfx.at('snort', this.pos, 1); } }
    if (t.fly) { this.updateFly(dt, hostileNow && canTarget, dist, dx, dy, dz); return; }
    if (t.ai === 'magma') { this.updateMagma(dt, hostileNow && canTarget, dist, dx, dz, water || lava); return; }
    let move = 0, tyaw = this.yaw, speed = t.speed;
    if (hostileNow && canTarget && dist < (this.type === 'enderman' ? 40 : 18)) {
      tyaw = Math.atan2(dx, dz); move = 1;
      if (t.ranged) {
        const see = dist < 16 && lineOfSight(new V3(this.pos.x, this.pos.y + 1.6, this.pos.z), P.eye());
        if (see) { if (dist < 6) move = -0.8; else if (dist < 10) move = 0; }
        if (see && this.atkCD <= 0 && dist < 16) { this.atkCD = 1.8 + Math.random(); shootArrow(new V3(this.pos.x, this.pos.y + 1.5, this.pos.z), P.eye().add(new V3(0, -0.3, 0)), 'mob', 3); }
      } else if (t.creeper) {
        if (dist < 2.8 && lineOfSight(new V3(this.pos.x, this.pos.y + 1.2, this.pos.z), P.eye())) { if (this.fuse === 0) Sfx.at('hiss', this.pos, 1); this.fuse += dt; move = 0; }
        else if (this.fuse > 0) { this.fuse = dist > 5 ? 0 : Math.max(0, this.fuse - dt * 0.5); }
        if (this.fuse > 1.5) { this.dead = true; this.gone = true; explode(this.pos.x, this.pos.y + 0.8, this.pos.z, 3.2, this, { cause: 'a creeper' }); return; }
      } else {
        if (dist < 1.5 + this.hw && Math.abs(dy) < 1.6 + (this.h > 2 ? 1 : 0) && this.atkCD <= 0) { this.atkCD = 1; P.hurt(t.dmg, this.pos, 'a ' + t.name, t.kb || 1); this.armSwing = 0.3; }
        if (dist < 0.9) move = 0;
        if (this.type === 'enderman' && dist > 12 && Math.random() < dt * 0.6) this.teleport(P.pos);
      }
      if (t.climbs && this.hitH) this.vel.y = 3.2;
      this.chasing = true;
    } else {
      this.chasing = false; this.fuse = Math.max(0, this.fuse - dt);
      if (this.flee > 0) { tyaw = Math.atan2(-dx, -dz) + Math.sin(this.age * 2) * 0.5; move = 1; speed *= 1.9; }
      else {
        this.wT -= dt; if (this.wT <= 0) { if (Math.random() < 0.45) { this.wMove = 0; this.wT = 2 + Math.random() * 4; } else { this.wMove = 1; this.wYaw = Math.random() * Math.PI * 2; this.wT = 1.5 + Math.random() * 3; } }
        move = this.wMove; tyaw = this.wYaw; speed *= 0.6;
        if (this.head && dist < 6 && this.wMove === 0) { this.head.rotation.y = clamp(Math.atan2(dx, dz) - this.yaw, -1, 1) * 0.6; }
        if (this.type === 'piglin' && playerHoldsGold() && dist < 8) { tyaw = Math.atan2(dx, dz); move = dist > 2.5 ? 1 : 0; }
      }
    }
    if (this.lavaWalk) { const below = w.get(Math.floor(this.pos.x + Math.sin(tyaw) * 0.8), Math.floor(this.pos.y - 0.5), Math.floor(this.pos.z + Math.cos(tyaw) * 0.8)); if (!isLavaId(below) && isLavaId(w.get(Math.floor(this.pos.x), Math.floor(this.pos.y - 0.5), Math.floor(this.pos.z))) && move && !this.chasing) { this.wYaw += Math.PI; tyaw = this.wYaw; } }
    if (move !== 0) {
      const hs0 = Math.hypot(this.vel.x, this.vel.z);
      if (this.hitH && hs0 < speed * 0.4) this.stuckT = (this.stuckT || 0) + dt; else this.stuckT = Math.max(0, (this.stuckT || 0) - dt);
      if (this.stuckT > 0.7 && !(this.detourT > 0)) { this.detourT = 0.8 + Math.random() * 0.8; this.detour = (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 0.6); this.stuckT = 0; }
    }
    if (this.detourT > 0) { this.detourT -= dt; tyaw += this.detour; if (move === 0) move = 1; }
    if (t.burns && w.dim === 'overworld' && G.daylight > 0.62 && !water && w.skyAt(Math.floor(this.pos.x), Math.floor(this.pos.y + this.h), Math.floor(this.pos.z)) >= 1) {
      this.burnT += dt; if (Math.random() < dt * 20) Particles.emit(this.pos.x, this.pos.y + Math.random() * this.h, this.pos.z, 1, [[1, 0.6, 0.1], [1, 0.3, 0.05]], 0.6, 0.6, -2, 0.6);
      if (this.burnT > 1) { this.burnT = 0; this.hurt(1, null, 0); }
    }
    if (t.fireproof && (lava || this.type === 'strider') && Math.random() < dt * 2) Particles.emit(this.pos.x, this.pos.y + 0.3, this.pos.z, 1, [[1, 0.5, 0.1]], 0.4, 0.5, -1, 0.5);
    let diff = tyaw - this.yaw; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2; this.yaw += diff * Math.min(1, dt * 7);
    const tx = Math.sin(this.yaw) * speed * move, tz = Math.cos(this.yaw) * speed * move;
    const k = this.onGround ? Math.min(1, dt * 10) : Math.min(1, dt * 2);
    this.vel.x += (tx - this.vel.x) * k; this.vel.z += (tz - this.vel.z) * k;
    if (water || (lava && !this.lavaWalk)) { this.vel.y = Math.min(this.vel.y + (lava ? 24 : 34) * dt, lava ? 1.2 : 2.2); this.vel.x *= 0.95; this.vel.z *= 0.95; } else this.vel.y = Math.max(this.vel.y - 28 * dt, -50);
    moveEntity(this, dt);
    if (this.hitH && (this.onGround || water) && move !== 0) this.vel.y = water ? 5 : 8.2;
    if (this.pos.y < -10) { this.gone = true; return; }
    this.animate(dt);
  }
  updateFly(dt, hostile, dist, dx, dy, dz) {
    const P = G.player, t = this.t; const desired = new V3();
    if (this.type === 'ghast') {
      this.wT -= dt;
      if (!this.wTarget || this.wT <= 0 || this.pos.distanceTo(this.wTarget) < 2) { this.wTarget = new V3(this.pos.x + (Math.random() - 0.5) * 28, clamp(this.pos.y + (Math.random() - 0.5) * 10, 34, 82), this.pos.z + (Math.random() - 0.5) * 28); this.wT = 4 + Math.random() * 5; }
      desired.copy(this.wTarget).sub(this.pos); if (desired.lengthSq() > 0.01) desired.normalize().multiplyScalar(t.speed);
      if (this.hitH) this.wT = 0;
      const eye = new V3(this.pos.x, this.pos.y + 2.6, this.pos.z);
      let charging = false;
      if (hostile && dist < 56 && lineOfSight(eye, P.eye())) {
        this.yaw = Math.atan2(dx, dz); this.shootT -= dt; charging = this.shootT < 0.8;
        if (this.shootT <= 0) { this.shootT = 3 + Math.random() * 2.5; const f = new V3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); fireAt('fireball', eye.clone().addScaledVector(f, 2.4), P.eye(), 14, 'mob', 6, this); Sfx.at('fireball', this.pos, 1.2); }
        if (this.shootT < 1.0 && this.shootT + dt >= 1.0) Sfx.at('ghast', this.pos, 1.2);
      } else { this.shootT = Math.max(this.shootT, 1.5); let df = Math.atan2(desired.x, desired.z) - this.yaw; while (df > Math.PI) df -= Math.PI * 2; while (df < -Math.PI) df += Math.PI * 2; this.yaw += df * Math.min(1, dt * 2); }
      for (const f of this.faceN) f.visible = !charging; for (const f of this.faceA) f.visible = charging;
      if (this.tent) this.tent.forEach((p, i) => { p.rotation.x = Math.sin(this.age * 2 + i) * 0.25; p.rotation.z = Math.cos(this.age * 1.7 + i * 2) * 0.2; });
    } else { // blaze
      if (hostile && dist < 26) {
        const hd = Math.hypot(dx, dz); const want = hd > 11 ? 1 : hd < 5 ? -1 : 0;
        desired.set(dx / (hd || 1) * want * t.speed, clamp(P.pos.y + 2.5 - this.pos.y, -2, 2), dz / (hd || 1) * want * t.speed);
        this.yaw = Math.atan2(dx, dz);
        const eye = new V3(this.pos.x, this.pos.y + 1.35, this.pos.z); const see = lineOfSight(eye, P.eye());
        this.shootT -= dt;
        if (see && this.shootT <= 0 && this.volley === 0) { this.volley = 3; this.volleyT = 0; Sfx.at('blaze', this.pos, 1); }
        if (this.volley > 0) { this.volleyT -= dt; if (this.volleyT <= 0) { this.volleyT = 0.3; this.volley--; const tgt = P.eye().add(new V3((Math.random() - 0.5) * 1.2, -0.4, (Math.random() - 0.5) * 1.2)); fireAt('smallfire', eye.clone().add(new V3(Math.sin(this.yaw) * 0.6, 0, Math.cos(this.yaw) * 0.6)), tgt, 16, 'mob', 5, this); if (this.volley === 0) this.shootT = 3.5 + Math.random() * 2; } }
      } else { desired.set(Math.sin(this.age * 0.4) * 0.6, Math.sin(this.age * 1.3) * 0.8 - 0.3, Math.cos(this.age * 0.5) * 0.6); }
      if (Math.random() < dt * 8) Particles.emit(this.pos.x, this.pos.y + 0.6, this.pos.z, 1, [[0.35, 0.3, 0.3], [1, 0.6, 0.1]], 0.5, 1, -1.5, 0.6);
      if (this.rods) this.rods.forEach((g, i) => g.rotation.y = this.age * (i % 2 ? -1.6 : 1.9));
      if (this.head) this.head.position.y = 1.35 + Math.sin(this.age * 3) * 0.05;
    }
    const k = Math.min(1, dt * 2); this.vel.x += (desired.x - this.vel.x) * k; this.vel.y += (desired.y - this.vel.y) * k; this.vel.z += (desired.z - this.vel.z) * k;
    moveEntity(this, dt);
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; if (this.type === 'ghast') this.root.position.y += Math.sin(this.age * 1.3) * 0.15;
    this.colorize();
    this.sndT -= dt; if (this.sndT <= 0) { this.sndT = 6 + Math.random() * 10; if (dist < 40) Sfx.mob(this, null, 0.6); }
  }
  updateMagma(dt, hostile, dist, dx, dz, fluid) {
    const P = G.player;
    if (this.onGround) { const f = Math.exp(-dt * 14); this.vel.x *= f; this.vel.z *= f; this.jumpT -= dt;
      if (this.jumpT <= 0) { const chase = hostile && dist < 18; this.jumpT = chase ? 0.7 + Math.random() * 0.8 : 1.8 + Math.random() * 2.5; this.yaw = chase ? Math.atan2(dx, dz) : Math.random() * Math.PI * 2; const sp = 2.2 + this.size * 0.5; this.vel.x = Math.sin(this.yaw) * sp; this.vel.z = Math.cos(this.yaw) * sp; this.vel.y = 6.5 + this.size * 0.7; Sfx.at('squish', this.pos, 0.5); } }
    if (fluid) this.vel.y = Math.min(this.vel.y + 30 * dt, 2); else this.vel.y = Math.max(this.vel.y - 24 * dt, -40);
    moveEntity(this, dt);
    if (hostile && this.atkCD <= 0 && Math.abs(P.pos.x - this.pos.x) < this.hw + 0.5 && Math.abs(P.pos.z - this.pos.z) < this.hw + 0.5 && P.pos.y < this.pos.y + this.h && P.pos.y + 1.8 > this.pos.y) { this.atkCD = 0.8; P.hurt(this.size >= 4 ? 6 : this.size >= 2 ? 4 : 3, this.pos, 'a Magma Cube'); }
    const sq = this.onGround ? 1 + Math.max(0, 0.6 - this.jumpT) * 0.3 : 1.1;
    this.body.scale.set(this.baseScale * sq, this.baseScale / sq, this.baseScale * sq);
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; this.colorize();
  }
  animate(dt) {
    const t = this.t; const hs = Math.hypot(this.vel.x, this.vel.z); const mk = Math.min(1, hs / 1.3); this.walk += hs * dt * 4.2;
    const sw = Math.sin(this.walk) * mk * 0.8;
    if (this.legs) this.legs.forEach((l, i) => {
      if (this.type === 'spider') { const ph = this.walk * 1.6 + (i >> 1) * Math.PI / 2 + (i % 2) * Math.PI; l.rotation.y = Math.sin(ph) * 0.38 * mk; l.rotation.z = -(l.userData.side || 1) * (0.45 - Math.max(0, Math.cos(ph)) * 0.25 * mk); }
      else { const s = this.legs.length === 4 ? ((i === 0 || i === 3) ? 1 : -1) : (i % 2 ? 1 : -1); l.rotation.x = sw * s * (this.type === 'enderman' ? 0.5 : 1); }
    });
    // body bob + breathing
    const bob = Math.abs(Math.sin(this.walk)) * 0.05 * mk; this.body.position.y = bob; this.body.scale.y = this.baseScale * (1 + Math.sin(this.age * 2.3) * 0.012 * (1 - mk));
    // head: look at the player when close, otherwise glance around or graze
    if (this.head) {
      const P = G.player; const dx = P.pos.x - this.pos.x, dz = P.pos.z - this.pos.z, dist = Math.hypot(dx, dz);
      this.lookT -= dt; if (this.lookT <= 0) { this.lookT = 1.5 + Math.random() * 4; this.lookYaw = (Math.random() - 0.5) * 1.3; this.lookPitch = (Math.random() - 0.5) * 0.4; if (t.grazer && Math.random() < 0.35 && mk < 0.2) this.grazeT = 1.6 + Math.random() * 1.2; }
      let ty = this.lookYaw, tp = this.lookPitch;
      if (this.chasing || (dist < 7 && !this.flee)) { let a = Math.atan2(dx, dz) - this.yaw; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; ty = clamp(a, -1.1, 1.1); tp = clamp(-Math.atan2(P.pos.y + 1.5 - this.pos.y - this.h * 0.85, dist), -0.6, 0.6); }
      if (this.grazeT > 0) { this.grazeT -= dt; if (mk > 0.3) this.grazeT = 0; ty = 0; tp = 0.95; if (Math.random() < dt * 4) Particles.emit(this.pos.x + Math.sin(this.yaw) * 0.8, this.pos.y + 0.1, this.pos.z + Math.cos(this.yaw) * 0.8, 1, [[0.35, 0.6, 0.2]], 0.8, 0.4, 8, 0.2); }
      this.head.rotation.y += (ty - this.head.rotation.y) * Math.min(1, dt * 5); this.head.rotation.x += (tp - this.head.rotation.x) * Math.min(1, dt * 5);
      if (this.type === 'chicken') this.head.position.z = 0.22 + Math.sin(this.walk * 2) * 0.04 * mk;
    }
    if (this.tail) { this.tail.rotation.y = Math.sin(this.age * (this.type === 'pig' ? 9 : 3)) * (0.25 + mk * 0.35); if (this.type === 'cow') this.tail.rotation.x = 0.15 + Math.sin(this.age * 1.7) * 0.08; }
    this.armSwing = Math.max(0, (this.armSwing || 0) - dt);
    if (this.arms && !t.ranged && this.type !== 'zombie') this.arms.forEach((a, i) => { a.rotation.x = -sw * (i % 2 ? 1 : -1) * 0.8 - (i === 1 && this.armSwing > 0 ? Math.sin(this.armSwing * 10) * 1.2 : 0) - (this.chasing && this.type !== 'enderman' && i === 1 ? 0.5 : 0) - (this.admireT > 0 && i === 0 ? 1.0 : 0); a.rotation.z = (i ? -1 : 1) * (0.04 + Math.sin(this.age * 1.8) * 0.03); });
    if (this.arms && t.ranged) { const draw = this.chasing ? clamp(1 - this.atkCD / 0.9, 0, 1) : 0; this.arms.forEach((a, i) => { a.rotation.x = (this.chasing ? -1.45 : -0.2 - sw * (i % 2 ? 1 : -1) * 0.7) + Math.sin(this.age * 2) * 0.03; a.rotation.y = this.chasing ? (i ? -0.35 : 0.35 + draw * 0.55) : 0; a.position.z = i === 0 ? -draw * 0.12 : 0; }); }
    if (this.arms && this.type === 'zombie') this.arms.forEach((a, i) => { a.rotation.x = -1.45 + Math.sin(this.age * 2 + i) * 0.06 + (this.armSwing > 0 ? Math.sin(this.armSwing * 10) * 0.6 : 0); a.rotation.z = (i ? -1 : 1) * Math.sin(this.age * 1.3) * 0.05; });
    if (this.jaw) this.jaw.position.y = this.angry > 0 ? -0.12 : -0.03;
    if (this.wings) this.wings.forEach((wg, i) => wg.rotation.z = (this.onGround ? Math.sin(this.age * 3) * 0.05 : Math.sin(this.age * 30) * 0.9) * (i ? -1 : 1));
    if (t.creeper) { const s = 1 + Math.min(1, this.fuse / 1.5) * 0.25 + (this.fuse > 0 ? Math.sin(this.age * 40) * 0.02 : 0); this.body.scale.set(s, 1 + (s - 1) * 0.5, s); }
    if (this.type === 'enderman' && this.angry > 0) this.root.position.set(this.pos.x + (Math.random() - 0.5) * 0.04, this.pos.y, this.pos.z + (Math.random() - 0.5) * 0.04); else this.root.position.copy(this.pos);
    this.root.rotation.y = this.yaw; this.root.rotation.z = this.hurtT > 0 ? Math.sin(this.hurtT * 30) * 0.08 : 0;
    this.colorize();
    this.sndT -= dt; if (this.sndT <= 0) { this.sndT = 6 + Math.random() * 12; const d = this.pos.distanceTo(G.player.pos); if (d < 20) Sfx.mob(this, null, 0.6); }
  }
  colorize() {
    if (!this.dead) { const sp = Math.min(1, this.age * 5); this.root.scale.setScalar(sp < 1 ? 0.4 + sp * 0.6 + Math.sin(sp * Math.PI) * 0.15 : 1); }
    const b = clamp(this.light, 0.1, 1) * 1.05; const flash = this.t.creeper && this.fuse > 0 && (Math.floor(this.fuse * 8) % 2 === 0);
    for (const [m, base, glow] of this.mats) { m.color.copy(base); if (!glow) m.color.multiplyScalar(b); if (this.hurtT > 0) m.color.lerp(RED, 0.55); if (flash) m.color.lerp(WHITE, 0.7); }
  }
}
function isLookingAt(m) {
  const P = G.player; const e = P.eye(); const d = lookDir(); const head = new V3(m.pos.x, m.pos.y + m.h - 0.25, m.pos.z); const to = head.clone().sub(e); const L = to.length(); if (L > 40) return false; to.divideScalar(L);
  return d.dot(to) > 1 - 0.012 / Math.max(1, L / 8) && lineOfSight(e, head);
}
function spawnMob(type, x, y, z, opts) { const m = new Mob(type, x, y, z, opts); G.mobs.push(m); return m; }

// ---------------- Projectiles ----------------
const arrowGeo = new THREE.BoxGeometry(0.06, 0.06, 0.6); const arrowMat = new THREE.MeshLambertMaterial({ color: 0x8b6a40 });
const PROJ = {
  arrow: { grav: 20, critTrail: [[1, 1, 0.8], [0.9, 0.95, 1]] },
  fireball: { grav: 0, size: 0.9, color: 0xff7a20, trail: [[1, 0.5, 0.1], [0.4, 0.4, 0.4]] },
  smallfire: { grav: 0, size: 0.35, color: 0xffb030, trail: [[1, 0.7, 0.2]] },
  breath: { grav: 0, size: 1.0, color: 0xb040ff, trail: [[0.7, 0.2, 1], [0.35, 0.05, 0.6]] },
  pearl: { grav: 22, size: 0.25, color: 0x1a6a5a, trail: [[0.3, 0.8, 0.7]] },
};
const projMats = {};
function projMesh(kind) {
  if (kind === 'arrow') return new THREE.Mesh(arrowGeo, arrowMat);
  const P = PROJ[kind]; if (!projMats[kind]) projMats[kind] = [new THREE.BoxGeometry(P.size, P.size, P.size), new THREE.MeshBasicMaterial({ color: P.color, map: mobTex })];
  return new THREE.Mesh(projMats[kind][0], projMats[kind][1]);
}
function spawnProj(kind, from, vel, owner, dmg, src) { const mesh = projMesh(kind); G.scene.add(mesh); const p = { kind, pos: from.clone(), vel, owner, dmg, mesh, life: kind === 'arrow' || kind === 'pearl' ? 6 : 8, src }; G.projectiles.push(p); return p; }
function shootArrow(from, target, owner, dmg, speed = 22) {
  const d = target.clone().sub(from); const L = d.length(); d.normalize();
  const t = L / speed; const v = d.multiplyScalar(speed); v.y += 0.5 * 20 * t;
  spawnProj('arrow', from, v, owner, dmg); Sfx.at('bow', from, 0.8);
}
function fireAt(kind, from, target, speed, owner, dmg, src) { const d = target.clone().sub(from).normalize(); return spawnProj(kind, from, d.multiplyScalar(speed), owner, dmg, src); }
function hitsMob(m, p, pad = 0.1) { if (m.hitPoint) return m.hitPoint(p); return Math.abs(p.x - m.pos.x) < m.hw + pad && Math.abs(p.z - m.pos.z) < m.hw + pad && p.y > m.pos.y && p.y < m.pos.y + m.h; }
function projImpact(a, mob) {
  const P = G.player; a.done = true;
  if (a.kind === 'fireball') { explode(a.pos.x, a.pos.y, a.pos.z, 1.7, a.src, { cause: 'a Ghast fireball' }); if (mob && a.owner === 'player') mob.hurt(mob.type === 'ghast' ? 100 : 12, a.pos, 1); }
  else if (a.kind === 'smallfire') Particles.emit(a.pos.x, a.pos.y, a.pos.z, 10, [[1, 0.6, 0.1], [1, 0.3, 0.05]], 3, 0.5, 2, 0.3);
  else if (a.kind === 'breath') { spawnBreathCloud(a.pos.x, a.pos.y, a.pos.z); }
  else if (a.kind === 'pearl') {
    if (!P.dead) { const back = a.vel.clone().normalize().multiplyScalar(-0.6); const p = a.pos.clone().add(back); let x = Math.floor(p.x), y = Math.floor(p.y), z = Math.floor(p.z); for (let k = 0; k < 4 && (G.world.solid(x, y, z) || G.world.solid(x, y + 1, z)); k++) y++;
      Particles.emit(P.pos.x, P.pos.y + 1, P.pos.z, 20, [[0.6, 0.2, 0.9]], 2, 0.8, -1, 1); P.pos.set(x + 0.5, y + 0.01, z + 0.5); P.vel.set(0, 0, 0); P.peak = null; P.hurtCD = 0; P.hurt(2, null, 'an ender pearl', 0); Sfx.play('vwoop', 1); Particles.emit(P.pos.x, P.pos.y + 1, P.pos.z, 20, [[0.6, 0.2, 0.9]], 2, 0.8, -1, 1); }
  }
}
function updateProjectiles(dt) {
  const P = G.player;
  for (const a of G.projectiles) {
    a.life -= dt; if (a.life <= 0) { a.done = true; continue; }
    const def = PROJ[a.kind];
    if (def.trail && Math.random() < dt * 25) Particles.emit(a.pos.x, a.pos.y, a.pos.z, 1, def.trail, 0.4, 0.6, -0.5, 0.3);
    if (a.crit && Math.random() < dt * 40) Particles.emit(a.pos.x, a.pos.y, a.pos.z, 1, def.critTrail, 0.3, 0.4, 0, 0.1);
    const steps = 4; for (let s = 0; s < steps && !a.done; s++) {
      const h = dt / steps; a.vel.y -= def.grav * h; a.pos.addScaledVector(a.vel, h);
      if (G.world.solid(Math.floor(a.pos.x), Math.floor(a.pos.y), Math.floor(a.pos.z))) {
        if (a.kind === 'arrow') { a.done = true; if (a.owner === 'player' && Math.random() < 0.6) { a.pos.addScaledVector(a.vel, -h * 1.5); dropItem(IT.arrow, 1, a.pos.x, a.pos.y, a.pos.z, false); } }
        else { a.pos.addScaledVector(a.vel, -h); projImpact(a, null); }
        break;
      }
      if (a.owner === 'mob' && !P.dead) {
        if (Math.abs(a.pos.x - P.pos.x) < 0.5 && Math.abs(a.pos.z - P.pos.z) < 0.5 && a.pos.y > P.pos.y && a.pos.y < P.pos.y + 1.9) {
          const cause = a.kind === 'arrow' ? 'an arrow' : a.kind === 'smallfire' ? 'a Blaze' : a.kind === 'breath' ? 'the Shadow Dragon' : 'a Ghast fireball';
          if (isSurv()) P.hurt(a.dmg, a.pos.clone().addScaledVector(a.vel, -0.1), cause);
          if (a.kind === 'arrow') a.done = true; else projImpact(a, null);
        }
      }
      if (a.owner === 'player' && !a.done) for (const m of G.mobs) { if (m.dead || m === a.src) continue; if (hitsMob(m, a.pos)) { if (a.kind === 'arrow') { m.hurt(a.dmg, P.pos, 0.6 + (a.punch || 0) * 0.9); if (a.flame) m.burnT = 5; a.done = true; } else projImpact(a, m); break; } }
    }
    a.mesh.position.copy(a.pos);
    if (a.kind === 'arrow') a.mesh.lookAt(a.pos.x + a.vel.x, a.pos.y + a.vel.y, a.pos.z + a.vel.z); else { a.mesh.rotation.x += dt * 4; a.mesh.rotation.y += dt * 5; }
  }
  G.projectiles = G.projectiles.filter(a => { if (a.done) G.scene.remove(a.mesh); return !a.done; });
}
function deflectProjectiles(eye, dir) {
  for (const a of G.projectiles) { if (a.owner !== 'mob' || (a.kind !== 'fireball' && a.kind !== 'smallfire')) continue; const to = a.pos.clone().sub(eye); const t = to.dot(dir); if (t < 0 || t > 4.5) continue; const perp = to.clone().addScaledVector(dir, -t).length(); if (perp < 1.0) { a.vel.copy(dir).multiplyScalar(a.vel.length() * 1.3); a.owner = 'player'; Sfx.play('fireball', 0.6); return true; } }
  return false;
}
// breath clouds
function spawnBreathCloud(x, y, z) {
  let gy = Math.floor(y); for (let k = 0; k < 12 && !G.world.solid(Math.floor(x), gy - 1, Math.floor(z)); k++) gy--;
  G.clouds.push({ x, y: gy, z, r: 3, life: 6, tick: 0 });
}
function updateClouds(dt) {
  const P = G.player;
  for (const c of G.clouds) {
    c.life -= dt; c.tick -= dt;
    if (Math.random() < dt * 40) { const a = Math.random() * 6.28, rr = Math.random() * c.r; Particles.emit(c.x + Math.cos(a) * rr, c.y + 0.3, c.z + Math.sin(a) * rr, 1, [[0.7, 0.2, 1], [0.4, 0.1, 0.7]], 0.4, 1, -0.8, 0.2); }
    if (c.tick <= 0 && !P.dead) { c.tick = 0.5; if (Math.hypot(P.pos.x - c.x, P.pos.z - c.z) < c.r && Math.abs(P.pos.y - c.y) < 2.2) { P.hurtCD = 0; P.hurt(3, null, "the Shadow Dragon's breath", 0); } }
  }
  G.clouds = G.clouds.filter(c => c.life > 0);
}

// ---------------- TNT & explosions ----------------
function primeTNT(x, y, z, fuse = 3) {
  const mat = new THREE.MeshLambertMaterial({ map: atlasTex });
  const mesh = new THREE.Mesh(blockGeo(B.TNT), mat); mesh.layers.enable(1); G.scene.add(mesh);
  G.tnts.push({ pos: new V3(x + 0.5, y, z + 0.5), vel: new V3(0, 4, 0), hw: 0.49, h: 0.98, fuse, mesh, mat }); Sfx.at('hiss', new V3(x, y, z), 1);
}
function updateTNT(dt) {
  for (const t of G.tnts) {
    t.fuse -= dt; t.vel.y -= 20 * dt; t.vel.x *= 0.9; t.vel.z *= 0.9; moveEntity(t, dt);
    t.mesh.position.set(t.pos.x, t.pos.y + 0.49, t.pos.z); const fl = Math.floor(t.fuse * 5) % 2 === 0; const sc = t.fuse < 0.4 ? 1 + (0.4 - t.fuse) * 0.6 : 1;
    t.mesh.scale.setScalar(sc); if (fl) t.mat.emissive.setRGB(0.8, 0.8, 0.8); else t.mat.emissive.setRGB(0, 0, 0);
    if (Math.random() < dt * 15) Particles.emit(t.pos.x, t.pos.y + 1.1, t.pos.z, 1, [0.5, 0.5, 0.5], 0.4, 0.8, -1, 0.1);
    if (t.fuse <= 0) { t.done = true; explode(t.pos.x, t.pos.y + 0.5, t.pos.z, 4, null, { cause: 'an explosion' }); }
  }
  G.tnts = G.tnts.filter(t => { if (t.done) { G.scene.remove(t.mesh); t.mat.dispose(); } return !t.done; });
}
const BLAST_PROOF = new Set();
function explode(cx, cy, cz, r, src, opts = {}) {
  if (!BLAST_PROOF.size) for (const k of ['BEDROCK', 'OBSIDIAN', 'END_PORTAL_FRAME', 'END_PORTAL_FRAME_EYE', 'END_PORTAL', 'WATER', 'LAVA', 'DRAGON_EGG', 'ANCIENT_DEBRIS', 'NETHERITE_BLOCK']) BLAST_PROOF.add(B[k]); for (let i = 0; i < 256; i++) if (FKIND[i]) BLAST_PROOF.add(i);
  const w = G.world; const R = Math.ceil(r);
  if (src instanceof Mob && S.rules && !S.rules.mobGriefing) opts.noBlocks = true;
  if (!opts.noBlocks) for (let dx = -R; dx <= R; dx++) for (let dy = -R; dy <= R; dy++) for (let dz = -R; dz <= R; dz++) {
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz); if (d > r * (0.75 + Math.random() * 0.35)) continue;
    const x = Math.floor(cx + dx), y = Math.floor(cy + dy), z = Math.floor(cz + dz); const id = w.get(x, y, z);
    if (!id || BLAST_PROOF.has(id)) continue;
    if (id === B.TNT) { w.set(x, y, z, 0); primeTNT(x, y, z, 0.4 + Math.random() * 0.6); continue; }
    onBlockRemoved(x, y, z, id); w.set(x, y, z, 0);
    if (Math.random() < 0.25) { const dr = blockDrop(id); if (dr) dropItem(dr[0], dr[1], x + 0.5, y + 0.5, z + 0.5); }
  }
  const c = new V3(cx, cy, cz);
  const hitE = (e, isP) => { const ec = new V3(e.pos.x, e.pos.y + (e.h || 1.8) * 0.5, e.pos.z); const d = ec.distanceTo(c); if (d > r * 2) return; const f = 1 - d / (r * 2); const dmg = Math.round(f * f * 7 * r + 1); if (isP) { e.hurtCD = 0; e.hurt(dmg, c, opts.cause || 'an explosion', 2.2); } else e.hurt(dmg, c, 2.2, !(src === G.player)); };
  for (const m of G.mobs) if (m !== src && !(m.isBoss && src && src.isCrystal === undefined && false)) hitE(m, false);
  if (G.player && !G.player.dead) hitE(G.player, true);
  for (const it of G.items) { const d = it.pos.distanceTo(c); if (d < r * 1.5) { const v = it.pos.clone().sub(c).normalize().multiplyScalar(8 * (1 - d / (r * 1.5))); it.vel.add(v); it.vel.y += 3; } }
  Particles.emit(cx, cy, cz, 70, [[1, 0.9, 0.5], [1, 0.6, 0.2], [0.9, 0.3, 0.1]], 12, 0.5, 0, 1.5);
  Particles.emit(cx, cy, cz, 60, [[0.35, 0.35, 0.35], [0.55, 0.55, 0.55], [0.2, 0.2, 0.2]], 6, 1.4, -1.5, r);
  Sfx.at('boom', c, 1.5); if (G.player) G.shake = Math.max(G.shake, Math.max(0, 1 - G.player.pos.distanceTo(c) / 24));
}
function blockDrop(id, tool) {
  const def = BL[id]; if (!def) return null;
  if (def.tool === 'pick' && tool !== undefined) { if (!tool || tool.tool !== 'pick' || tool.tier < def.tier) return null; }
  let dr = def.drop; if (typeof dr === 'function') dr = dr(Math.random());
  if (!dr) return null; if (typeof dr === 'string') return [IT[dr], 1]; return [IT[dr[0]], dr[1]];
}
function collapsePortal(x, y, z) {
  const w = G.world; const st = [[x, y, z]]; let n = 0;
  while (st.length && n < 600) { const [a, b, c] = st.pop(); for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { const id = w.get(a + dx, b + dy, c + dz); if (id === B.NETHER_PORTAL || id === B.NETHER_PORTAL_Z) { w.set(a + dx, b + dy, c + dz, 0); n++; st.push([a + dx, b + dy, c + dz]); } } }
  if (n) Sfx.at('glass_break', new V3(x, y, z), 1);
}
function onBlockRemoved(x, y, z, id) {
  const k = x + ',' + y + ',' + z; const w = G.world;
  if (id === B.CHEST) { const inv = w.chestInv.get(k) || (w.chestLoot.has(k) ? rollLoot(w.chestLoot.get(k), ihash(x, y, z, w.seed)) : null); if (inv) for (const s of inv) if (s) dropItem(s.id, s.count, x + 0.5, y + 0.5, z + 0.5); w.chestInv.delete(k); w.chestLoot.delete(k); }
  if (id === B.FURNACE) { const f = w.furnaces.get(k); if (f) for (const s of f.s) if (s) dropItem(s.id, s.count, x + 0.5, y + 0.5, z + 0.5); w.furnaces.delete(k); }
  if (id === B.SPAWNER) w.spawners.delete(k);
  if (id === B.OBSIDIAN || id === B.NETHER_PORTAL || id === B.NETHER_PORTAL_Z) setTimeout(() => collapsePortal(x, y, z), 0);
}
const fluidQueue = []; const waterQueue = fluidQueue;
// liquids live in 21_fluids.js

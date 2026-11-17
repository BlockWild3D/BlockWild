// ================= MINECRAFT TERRAIN ENGINE (World type "Minecraft", new worlds only) =================
// Minecraft 26.3's overworld generator, run from its own data files (02d_mcterrain_data.js):
//  - noise router: every density function type (splines for continentalness / erosion / ridges -> offset, factor,
//    jaggedness; sloped cheese; spaghetti, noodle and cheese caves with pillars; cave entrances), evaluated like
//    Minecraft's NoiseChunk: on the 4 x 8 x 4 cell corners, then interpolated per block
//  - multi-noise biomes: the overworld parameter list (OverworldBiomeBuilder, checked entry for entry against Minecraft's
//    own 1.19.2 report, plus cherry grove, pale garden, dappled forest and sulfur caves) with the R-tree search and
//    Minecraft's biome zoom (SHA-256 seeded fuzzy cells)
//  - aquifers (underground lakes, lava below y -54 / in deep aquifers, barriers), material rules (surface blocks,
//    bedrock floor, deepslate gradient, copper / iron ore veins, sulfur cave bands, badlands clay bands, hoodoos of
//    eroded badlands, icebergs of frozen oceans)
//  - Minecraft's random numbers (Xoroshiro128++, MD5-hashed names, positional seeds) so a numeric seed gives the same
//    terrain shape and biomes as Java Edition 26.3
// Noise / density function / material rule semantics follow misode's deepslate (MIT), the reference this was checked
// against; aquifer details follow Java (deepslate's copy differs in a few places).
function mctFactory() { // a plain function so 99zzzzzzzz_mcterrain.js can start Web Workers from its source
  'use strict';
  // ---------- 64-bit integers as (hi, lo) uint32 pairs; results in RH, RL ----------
  let RH = 0, RL = 0;
  function mulhi(a, b) { const a0 = a & 0xffff, a1 = a >>> 16, b0 = b & 0xffff, b1 = b >>> 16; const p00 = a0 * b0, p01 = a0 * b1, p10 = a1 * b0; const mid = (p00 >>> 16) + (p01 & 0xffff) + (p10 & 0xffff); return (a1 * b1 + (p01 >>> 16) + (p10 >>> 16) + (mid >>> 16)) >>> 0; }
  function mul64(ah, al, bh, bl) { const l = Math.imul(al, bl) >>> 0; RH = (mulhi(al >>> 0, bl >>> 0) + Math.imul(ah, bl) + Math.imul(al, bh)) >>> 0; RL = l; }
  function add64(ah, al, bh, bl) { const l = (al >>> 0) + (bl >>> 0); RL = l >>> 0; RH = ((ah >>> 0) + (bh >>> 0) + (l >= 4294967296 ? 1 : 0)) >>> 0; }
  function rotl64(h, l, n) { if (n >= 32) { const t = h; h = l; l = t; n -= 32; } if (n === 0) { RH = h >>> 0; RL = l >>> 0; return; } RH = ((h << n) | (l >>> (32 - n))) >>> 0; RL = ((l << n) | (h >>> (32 - n))) >>> 0; }
  function mix13(h, l) {
    let xl = (l ^ ((l >>> 30) | (h << 2))) >>> 0, xh = (h ^ (h >>> 30)) >>> 0; mul64(xh, xl, 0xBF58476D, 0x1CE4E5B9); h = RH; l = RL;
    xl = (l ^ ((l >>> 27) | (h << 5))) >>> 0; xh = (h ^ (h >>> 27)) >>> 0; mul64(xh, xl, 0x94D049BB, 0x133111EB); h = RH; l = RL;
    RL = (l ^ ((l >>> 31) | (h << 1))) >>> 0; RH = (h ^ (h >>> 31)) >>> 0;
  }
  // Mth.getSeed(x, y, z) >> 16
  function getSeed(x, y, z) {
    const xi = Math.imul(x, 3129871); mul64(z < 0 ? 0xffffffff : 0, z >>> 0, 0, 116129781);
    const lh = ((xi < 0 ? 0xffffffff : 0) ^ RH ^ (y < 0 ? 0xffffffff : 0)) >>> 0, ll = ((xi >>> 0) ^ RL ^ (y >>> 0)) >>> 0;
    mul64(lh, ll, lh, ll); mul64(RH, RL, 0, 42317861); const ah = RH, al = RL; mul64(lh, ll, 0, 11); add64(ah, al, RH, RL);
    const h = RH, l = RL; RL = ((l >>> 16) | (h << 16)) >>> 0; RH = (h >> 16) >>> 0;
  }
  // ---------- Xoroshiro128++ (XoroshiroRandomSource) ----------
  class Rng {
    constructor(a, b, c, d) { if (((a | b | c | d) >>> 0) === 0 && a === 0 && b === 0 && c === 0 && d === 0) { a = 0x9E3779B9; b = 0x7F4A7C15; c = 0x6A09E667; d = 0xF3BCC909; } this.a = a >>> 0; this.b = b >>> 0; this.c = c >>> 0; this.d = d >>> 0; this.h = 0; this.l = 0; }
    static fromSeed(sh, sl) { const lh = (sh ^ 0x6A09E667) >>> 0, ll = (sl ^ 0xF3BCC909) >>> 0; add64(lh, ll, 0x9E3779B9, 0x7F4A7C15); const hh = RH, hl = RL; mix13(lh, ll); const a = RH, b = RL; mix13(hh, hl); return new Rng(a, b, RH, RL); }
    next() {
      const lh = this.a, ll = this.b, mh0 = this.c, ml0 = this.d;
      add64(lh, ll, mh0, ml0); rotl64(RH, RL, 17); add64(RH, RL, lh, ll); this.h = RH; this.l = RL;
      const mh = (mh0 ^ lh) >>> 0, ml = (ml0 ^ ll) >>> 0;
      rotl64(lh, ll, 49); this.a = (RH ^ mh ^ ((mh << 21) | (ml >>> 11))) >>> 0; this.b = (RL ^ ml ^ (ml << 21)) >>> 0;
      rotl64(mh, ml, 28); this.c = RH; this.d = RL;
    }
    nextInt(bound) { this.next(); let l = this.l, lo = Math.imul(l, bound) >>> 0; if (lo < bound) { const t = ((-bound) >>> 0) % bound; while (lo < t) { this.next(); l = this.l; lo = Math.imul(l, bound) >>> 0; } } return mulhi(l, bound); }
    nextDouble() { this.next(); return this.h * 2.3283064365386963e-10 + (this.l >>> 11) * 1.1102230246251565e-16; }
    nextFloat() { this.next(); return (this.h >>> 8) * 5.9604644775390625e-8; }
    nextBoolean() { this.next(); return (this.l & 1) !== 0; }
    consume(n) { for (let i = 0; i < n; i++) this.next(); }
    forkPositional() { this.next(); const a = this.h, b = this.l; this.next(); return new PosRng(a, b, this.h, this.l); }
  }
  class PosRng {
    constructor(a, b, c, d) { this.a = a >>> 0; this.b = b >>> 0; this.c = c >>> 0; this.d = d >>> 0; }
    at(x, y, z) { getSeed(x, y, z); return new Rng(RH ^ this.a, RL ^ this.b, this.c, this.d); }
    // the same, reusing one instance (only when the result is used up before the next call)
    at1(x, y, z) { getSeed(x, y, z); const r = this.tmp || (this.tmp = new Rng(1, 1, 1, 1)); r.a = (RH ^ this.a) >>> 0; r.b = (RL ^ this.b) >>> 0; r.c = this.c; r.d = this.d; if ((r.a | r.b | r.c | r.d) === 0) { r.a = 0x9E3779B9; r.b = 0x7F4A7C15; r.c = 0x6A09E667; r.d = 0xF3BCC909; } return r; }
    fromHashOf(s) { const m = md5(s); const w = (i) => ((m[i] << 24) | (m[i + 1] << 16) | (m[i + 2] << 8) | m[i + 3]) >>> 0; return new Rng(w(0) ^ this.a, w(4) ^ this.b, w(8) ^ this.c, w(12) ^ this.d); }
  }
  // ---------- MD5 (RandomSupport.seedFromHashOf) and SHA-256 (BiomeManager.obfuscateSeed) ----------
  function md5(str) {
    const bytes = []; for (const ch of unescape(encodeURIComponent(str))) bytes.push(ch.charCodeAt(0));
    const n = bytes.length; bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0); const bits = n * 8; for (let i = 0; i < 8; i++) bytes.push(i < 4 ? (bits >>> (8 * i)) & 255 : 0);
    const K = new Int32Array(64), S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21]; for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
    let a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;
    for (let o = 0; o < bytes.length; o += 64) {
      const M = new Int32Array(16); for (let i = 0; i < 16; i++) M[i] = bytes[o + i * 4] | (bytes[o + i * 4 + 1] << 8) | (bytes[o + i * 4 + 2] << 16) | (bytes[o + i * 4 + 3] << 24);
      let A = a0, Bb = b0, C = c0, D = d0;
      for (let i = 0; i < 64; i++) { let F, g; if (i < 16) { F = (Bb & C) | (~Bb & D); g = i; } else if (i < 32) { F = (D & Bb) | (~D & C); g = (5 * i + 1) & 15; } else if (i < 48) { F = Bb ^ C ^ D; g = (3 * i + 5) & 15; } else { F = C ^ (Bb | ~D); g = (7 * i) & 15; }
        F = (F + A + K[i] + M[g]) | 0; A = D; D = C; C = Bb; const s = S[(i >> 4) * 4 + (i & 3)]; Bb = (Bb + ((F << s) | (F >>> (32 - s)))) | 0; }
      a0 = (a0 + A) | 0; b0 = (b0 + Bb) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0; }
    const out = new Uint8Array(16); [a0, b0, c0, d0].forEach((v, i) => { for (let k = 0; k < 4; k++) out[i * 4 + k] = (v >>> (8 * k)) & 255; }); return out;
  }
  function sha256(bytes) {
    const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    const b = Array.from(bytes), n = b.length; b.push(0x80); while (b.length % 64 !== 56) b.push(0); const bits = n * 8; for (let i = 7; i >= 0; i--) b.push(i < 4 ? (bits >>> (8 * i)) & 255 : 0);
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]; const r = (x, s) => (x >>> s) | (x << (32 - s));
    for (let o = 0; o < b.length; o += 64) { const w = new Array(64);
      for (let i = 0; i < 16; i++) w[i] = (b[o + i * 4] << 24) | (b[o + i * 4 + 1] << 16) | (b[o + i * 4 + 2] << 8) | b[o + i * 4 + 3];
      for (let i = 16; i < 64; i++) { const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
      let [a, bb, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) { const S1 = r(e, 6) ^ r(e, 11) ^ r(e, 25), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K[i] + w[i]) | 0, S0 = r(a, 2) ^ r(a, 13) ^ r(a, 22), mj = (a & bb) ^ (a & c) ^ (bb & c), t2 = (S0 + mj) | 0; h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0; }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0; }
    const out = new Uint8Array(32); for (let i = 0; i < 8; i++) for (let k = 0; k < 4; k++) out[i * 4 + k] = (H[i] >>> (24 - 8 * k)) & 255; return out;
  }
  // ---------- noise ----------
  const GRAD = new Int8Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 1, 1, 0, 0, -1, 1, -1, 1, 0, 0, -1, -1]);
  const wrap = (x) => x - Math.floor(x / 33554432 + 0.5) * 33554432;
  const lerp = (t, a, b) => a + t * (b - a), fr = Math.fround, flerp = (t, a, b) => fr(a + fr(t * fr(b - a)));
  const smooth = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  class Perlin {
    constructor(r, smear) { this.ox = r.nextDouble() * 256; this.oy = r.nextDouble() * 256; this.oz = r.nextDouble() * 256; const p = new Uint8Array(256); for (let i = 0; i < 256; i++) p[i] = i;
      for (let i = 0; i < 256; i++) { const j = r.nextInt(256 - i); const t = p[i]; p[i] = p[i + j]; p[i + j] = t; } this.p = p; this.smear = smear || 0; }
    get(x, y, z) {
      const x1 = wrap(x) + this.ox, y1 = wrap(y) + this.oy, z1 = wrap(z) + this.oz; const fx = Math.floor(x1), fy = Math.floor(y1), fz = Math.floor(z1);
      const rx = x1 - fx, ry = y1 - fy, rz = z1 - fz; let sy = ry;
      if (this.smear) { const lim = y >= 0 && y < ry ? y : ry; sy = ry - Math.floor(lim / this.smear + 1e-7) * this.smear; }
      const p = this.p, G = GRAD; const X0 = p[fx & 255], X1 = p[(fx + 1) & 255];
      const a = p[(X0 + fy) & 255], b = p[(X0 + fy + 1) & 255], c = p[(X1 + fy) & 255], d = p[(X1 + fy + 1) & 255];
      let h, i;
      h = p[(a + fz) & 255] & 15; i = h * 3; const n000 = G[i] * rx + G[i + 1] * sy + G[i + 2] * rz;
      h = p[(c + fz) & 255] & 15; i = h * 3; const n100 = G[i] * (rx - 1) + G[i + 1] * sy + G[i + 2] * rz;
      h = p[(b + fz) & 255] & 15; i = h * 3; const n010 = G[i] * rx + G[i + 1] * (sy - 1) + G[i + 2] * rz;
      h = p[(d + fz) & 255] & 15; i = h * 3; const n110 = G[i] * (rx - 1) + G[i + 1] * (sy - 1) + G[i + 2] * rz;
      h = p[(a + fz + 1) & 255] & 15; i = h * 3; const n001 = G[i] * rx + G[i + 1] * sy + G[i + 2] * (rz - 1);
      h = p[(c + fz + 1) & 255] & 15; i = h * 3; const n101 = G[i] * (rx - 1) + G[i + 1] * sy + G[i + 2] * (rz - 1);
      h = p[(b + fz + 1) & 255] & 15; i = h * 3; const n011 = G[i] * rx + G[i + 1] * (sy - 1) + G[i + 2] * (rz - 1);
      h = p[(d + fz + 1) & 255] & 15; i = h * 3; const n111 = G[i] * (rx - 1) + G[i + 1] * (sy - 1) + G[i + 2] * (rz - 1);
      const u = smooth(rx), v = smooth(ry), w = smooth(rz);
      return lerp(w, lerp(v, lerp(u, n000, n100), lerp(u, n010, n110)), lerp(v, lerp(u, n001, n101), lerp(u, n011, n111)));
    }
  }
  class Stack { constructor() { this.n = []; this.f = []; this.a = []; } add(n, f, a) { this.n.push(n); this.f.push(f); this.a.push(a); }
    get(x, y, z) { let v = 0; const N = this.n, F = this.f, A = this.a; for (let i = 0; i < N.length; i++) { const f = F[i]; v += A[i] * N[i].get(x * f, y * f, z * f); } return v; } }
  // NormalNoise (26.x: per-octave seeds from two positional forks, variance normalisation)
  function normalNoise(json, random) {
    const baseAmp = json.base_amplitude ?? 1, baseOct = json.base_octave ?? 0, cnt = json.octave_count ?? 1, mods = json.amplitude_modifiers || [];
    const norm = typeof json.normalize === 'boolean' ? (json.normalize ? 'enabled' : 'disabled') : (json.normalize || 'enabled');
    let freq = Math.pow(2, baseOct), amp = baseAmp; if (norm !== 'disabled') amp *= Math.pow(0.5, -(cnt - 1)) / (Math.pow(0.5, -cnt) - 1);
    const oct = []; for (let i = 0; i < cnt; i++) { const m = mods[i] ?? 1; if (m !== 0) oct.push({ index: baseOct + i, frequency: freq, amplitude: amp * m }); freq *= 2; amp *= 0.5; }
    let target = 0, varc = 0; for (const o of oct) { target += Math.abs(o.amplitude); varc += (0.2702247831245211 * Math.abs(o.amplitude)) ** 2; }
    const dev = Math.sqrt(varc); let nf = dev === 0 ? 0 : (target * 0.3333333333333333) / (dev * Math.SQRT2);
    if (norm === 'legacy' && nf !== 0) { let mn = Infinity, mx = -Infinity; for (let i = 0; i < cnt; i++) if ((mods[i] ?? 1) !== 0) { mn = Math.min(mn, i); mx = Math.max(mx, i); } nf = baseAmp * 0.5 * 0.3333333333333333 / (0.1 * (1 + 1 / (mx - mn + 1))); }
    const r1 = random.forkPositional(), r2 = random.forkPositional(); const st = new Stack();
    for (const o of oct) { const s = 'octave_' + o.index; const n1 = new Perlin(r1.fromHashOf(s)), n2 = new Perlin(r2.fromHashOf(s)); const vf = nf * o.amplitude; st.add(n1, o.frequency, vf); st.add(n2, o.frequency * 1.0181268882175227, vf); }
    return st;
  }
  function blendedNoise(random, xzScale, yScale, xzFactor, yFactor, smearMul) {
    const xzMul = 684.412 * xzScale, yMul = 684.412 * yScale; const limSmear = yMul * smearMul, mainSmear = limSmear / yFactor;
    const mk = (first, smear, vf) => { const oc = -first + 1; let f = 1; vf /= Math.pow(2, oc) - 1; const st = new Stack(); for (let i = oc - 1; i >= 0; i--) { st.add(new Perlin(random, smear * f), f, vf); f /= 2; vf *= 2; } return st; };
    const mn = mk(-15, limSmear, 0.99998474), mx = mk(-15, limSmear, 0.99998474), main = mk(-7, mainSmear, 12.75);
    return (x, y, z) => { const xx = x * xzMul, yy = y * yMul, zz = z * xzMul; let m = main.get(xx / xzFactor, yy / yFactor, zz / xzFactor); m = Math.max(0, Math.min(1, m + 0.5));
      if (m === 0) return mn.get(xx, yy, zz); if (m === 1) return mx.get(xx, yy, zz); return flerp(m, mn.get(xx, yy, zz), mx.get(xx, yy, zz)); };
  }
  // ---------- density functions ----------
  const INF = Infinity;
  const RANGE_ALL = [-INF, INF];
  class DF { constructor() { this.y = true; } range() { return RANGE_ALL; } }
  class Const extends DF { constructor(v) { super(); this.v = v; this.y = false; } c() { return this.v; } range() { return [this.v, this.v]; } }
  class Unary extends DF { constructor(op, a) { super(); this.op = op; this.a = a; this.y = a.y; }
    c(x, y, z) { const d = this.a.c(x, y, z); switch (this.op) { case 0: return Math.abs(d); case 1: return d * d; case 2: return d * d * d; case 3: return d > 0 ? d : d * 0.5; case 4: return d > 0 ? d : d * 0.25;
      case 5: { const c = d < -1 ? -1 : d > 1 ? 1 : d; return c / 2 - c * c * c / 24; } case 6: return 1 / d; case 7: return -d; case 8: return Math.sqrt(d); case 9: return Math.log(d); default: return Math.sign(d); } }
    range() { const [lo, hi] = this.a.range(); switch (this.op) {
      case 0: return lo >= 0 ? [lo, hi] : hi <= 0 ? [-hi, -lo] : [0, Math.max(-lo, hi)];
      case 1: { const a = lo * lo, b = hi * hi; return lo >= 0 || hi <= 0 ? [Math.min(a, b), Math.max(a, b)] : [0, Math.max(a, b)]; }
      case 2: return [lo * lo * lo, hi * hi * hi]; case 3: return [lo > 0 ? lo : lo * 0.5, hi > 0 ? hi : hi * 0.5]; case 4: return [lo > 0 ? lo : lo * 0.25, hi > 0 ? hi : hi * 0.25];
      case 5: { const f = (d) => { const c = d < -1 ? -1 : d > 1 ? 1 : d; return c / 2 - c * c * c / 24; }; return [f(lo), f(hi)]; } case 7: return [-hi, -lo]; default: return RANGE_ALL; } } }
  const UN = { abs: 0, square: 1, cube: 2, half_negative: 3, quarter_negative: 4, squeeze: 5, reciprocal: 6, negate: 7, sqrt: 8, log: 9, sign: 10 };
  class Bin extends DF { constructor(op, a, b) { super(); this.op = op; this.a = a; this.b = b; this.y = a.y || b.y; }
    c(x, y, z) { const a = this.a.c(x, y, z); switch (this.op) { case 0: return a + this.b.c(x, y, z); case 1: return a - this.b.c(x, y, z); case 2: return a === 0 ? 0 : a * this.b.c(x, y, z);
      case 3: return a === 0 ? 0 : a / this.b.c(x, y, z); case 4: return Math.min(a, this.b.c(x, y, z)); default: return Math.max(a, this.b.c(x, y, z)); } }
    range() { const [a0, a1] = this.a.range(), [b0, b1] = this.b.range(); switch (this.op) {
      case 0: return [a0 + b0, a1 + b1]; case 1: return [a0 - b1, a1 - b0];
      case 2: { const p = [a0 * b0, a0 * b1, a1 * b0, a1 * b1].map(v => isNaN(v) ? 0 : v); return [Math.min(...p), Math.max(...p)]; }
      case 4: return [Math.min(a0, b0), Math.min(a1, b1)]; case 5: return [Math.max(a0, b0), Math.max(a1, b1)]; default: return RANGE_ALL; } } }
  const BN = { add: 0, sub: 1, mul: 2, div: 3, min: 4, max: 5 };
  class Clamp extends DF { constructor(a, lo, hi) { super(); this.a = a; this.lo = lo; this.hi = hi; this.y = a.y; } c(x, y, z) { const d = this.a.c(x, y, z); return d < this.lo ? this.lo : d > this.hi ? this.hi : d; }
    range() { const [l, h] = this.a.range(); return [Math.min(this.hi, Math.max(this.lo, l)), Math.min(this.hi, Math.max(this.lo, h))]; } }
  class RangeChoice extends DF { constructor(i, mn, mx, a, b) { super(); this.i = i; this.mn = mn; this.mx = mx; this.a = a; this.b = b; this.y = i.y || a.y || b.y; }
    c(x, y, z) { const v = this.i.c(x, y, z); return v >= this.mn && v < this.mx ? this.a.c(x, y, z) : this.b.c(x, y, z); }
    range() { const [l, h] = this.i.range(); if (l >= this.mn && h < this.mx) return this.a.range(); if (h < this.mn || l >= this.mx) return this.b.range(); const p = this.a.range(), q = this.b.range(); return [Math.min(p[0], q[0]), Math.max(p[1], q[1])]; } }
  class IntervalSelect extends DF { constructor(i, th, fns) { super(); this.i = i; this.th = th; this.f = fns; this.y = i.y || fns.some(f => f.y); }
    c(x, y, z) { const v = this.i.c(x, y, z); const th = this.th; for (let k = 0; k < th.length; k++) if (v < th[k]) return this.f[k].c(x, y, z); return this.f[this.f.length - 1].c(x, y, z); } }
  class Gradient extends DF { constructor(j) { super(); this.ax = j.axis || 'y'; this.til = j.tiling || 'clamp_to_edge'; this.c0 = j.from_coordinate ?? 0; this.c1 = j.to_coordinate ?? 1; this.v0 = j.from_value ?? 0; this.v1 = j.to_value ?? 1; this.y = this.ax === 'y'; }
    c(x, y, z) { const range = this.c1 - this.c0; let k = (this.ax === 'x' ? x : this.ax === 'y' ? y : z) - this.c0;
      if (this.til === 'repeat') k = ((k % range) + range) % range; else if (this.til === 'mirrored_repeat') { const t = Math.floor(k / range), l = k - t * range; k = (t & 1) === 0 ? l : range - l; }
      const a = k / range; return a < 0 ? this.v0 : a > 1 ? this.v1 : lerp(a, this.v0, this.v1); }
    range() { return [Math.min(this.v0, this.v1), Math.max(this.v0, this.v1)]; } }
  class Lerp extends DF { constructor(a, f, s) { super(); this.al = a; this.f = f; this.s = s; this.y = a.y || f.y || s.y; }
    c(x, y, z) { const a = this.al.c(x, y, z); if (a === 0) return this.f.c(x, y, z); if (a === 1) return this.s.c(x, y, z); return flerp(a, this.f.c(x, y, z), this.s.c(x, y, z)); } }
  class Round extends DF { constructor(t, a, m) { super(); this.t = t; this.a = a; this.m = m; this.y = a.y || m.y; }
    c(x, y, z) { const a = this.a.c(x, y, z), m = this.m.c(x, y, z); if (m === 0) return a; const v = a / m; return (this.t === 'floor' ? Math.floor(v) : this.t === 'ceil' ? Math.ceil(v) : this.t === 'round' ? Math.round(v) : Math.trunc(v)) * m; } }
  class Pow extends DF { constructor(a, b) { super(); this.a = a; this.b = b; this.y = a.y || b.y; } c(x, y, z) { return Math.pow(this.a.c(x, y, z), this.b.c(x, y, z)); } }
  class Dist extends DF { constructor(p, m) { super(); this.p = p; this.m = m; this.y = true; }
    c(x, y, z) { const dx = this.p[0] - x, dy = this.p[1] - y, dz = this.p[2] - z; switch (this.m) { case 'euclidean_squared': return dx * dx + dy * dy + dz * dz; case 'manhattan': return Math.abs(dx) + Math.abs(dy) + Math.abs(dz); case 'chebyshev': return Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)); default: return Math.sqrt(dx * dx + dy * dy + dz * dz); } } }
  class Slice extends DF { constructor(ax, k, a) { super(); this.ax = ax; this.k = k; this.a = a; this.y = ax !== 'y' && a.y; }
    c(x, y, z) { return this.ax === 'x' ? this.a.c(this.k, y, z) : this.ax === 'y' ? this.a.c(x, this.k, z) : this.a.c(x, y, this.k); } }
  class Noise extends DF { constructor(n, xz, ys, sx, sy, sz) { super(); this.n = n; this.xz = xz; this.ys = ys; this.sx = sx; this.sy = sy; this.sz = sz; this.y = ys !== 0 || sy.y || !(sy instanceof Const && sy.v === 0); this.plain = sx instanceof Const && sy instanceof Const && sz instanceof Const && sx.v === 0 && sy.v === 0 && sz.v === 0; }
    c(x, y, z) { if (this.plain) return this.n.get(x * this.xz, y * this.ys, z * this.xz); return this.n.get(x * this.xz + this.sx.c(x, y, z), y * this.ys + this.sy.c(x, y, z), z * this.xz + this.sz.c(x, y, z)); } }
  class Shift extends DF { constructor(n, k) { super(); this.n = n; this.k = k; this.y = k === 2; }
    c(x, y, z) { return this.k === 0 ? this.n.get(x * 0.25, 0, z * 0.25) * 4 : this.k === 1 ? this.n.get(z * 0.25, x * 0.25, 0) * 4 : this.n.get(x * 0.25, y * 0.25, z * 0.25) * 4; } }
  class Spline extends DF { constructor(fn, yd) { super(); this.fn = fn; this.y = yd; } c(x, y, z) { return this.fn(x, y, z); } }
  class Blended extends DF { constructor(fn) { super(); this.fn = fn; } c(x, y, z) { return this.fn(x, y, z); } }
  class Pass extends DF { constructor(a) { super(); this.a = a; this.y = a.y; } c(x, y, z) { return this.a.c(x, y, z); } range() { return this.a.range(); } }
  // cache: remembers the last position (only x, z when the input does not depend on y)
  class Cache extends DF { constructor(a) { super(); this.a = a; this.y = a.y; this.lx = NaN; this.ly = NaN; this.lz = NaN; this.v = 0; }
    c(x, y, z) { if (x === this.lx && z === this.lz && (y === this.ly || !this.y)) return this.v; this.lx = x; this.ly = y; this.lz = z; return (this.v = this.a.c(x, y, z)); } range() { return this.a.range(); } }
  class FindTop extends DF { constructor(d, ub, lb, ch) { super(); this.d = d; this.ub = ub; this.lb = lb; this.ch = ch; this.y = false; }
    c(x, y, z) { const top = Math.floor(this.ub.c(x, y, z) / this.ch) * this.ch; if (top < this.lb) return this.lb; for (let by = top; by >= this.lb; by -= this.ch) if (this.d.c(x, by, z) > 0) return by; return this.lb; } }
  // interpolated: on the cell corners of the chunk being filled (grid), else from corners computed on demand
  class Interp extends DF { constructor(a, cw, ch) { super(); this.a = a; this.cw = cw; this.ch = ch; this.y = true; this.grid = null; this.cell2 = false; this.q = new Float64Array(8); this.x0 = 0; this.y0 = 0; this.z0 = 0; this.memo = new Map(); this.lo = -INF; this.hi = INF; this.cell = false; this.lx = NaN; this.ly = NaN; this.lz = NaN; this.v = 0; }
    corner(x, y, z) { const k = x + ',' + y + ',' + z; let v = this.memo.get(k); if (v === undefined) { if (this.memo.size > 20000) this.memo.clear(); v = this.a.c(x, y, z); this.memo.set(k, v); } return v; }
    c(x, y, z) {
      if (x === this.lx && y === this.ly && z === this.lz) return this.v; this.lx = x; this.ly = y; this.lz = z;
      const w = this.cw, h = this.ch, g = this.grid;
      if (this.cell2) { const q = this.q, tx = (x - this.x0) * 0.25, ty = (y - this.y0) * 0.125, tz = (z - this.z0) * 0.25;
        if (tx >= 0 && tx < 1 && ty >= 0 && ty < 1 && tz >= 0 && tz < 1) return (this.v = lerp(tz, lerp(ty, lerp(tx, q[0], q[1]), lerp(tx, q[2], q[3])), lerp(ty, lerp(tx, q[4], q[5]), lerp(tx, q[6], q[7])))); }
      if (g) { const lx = x - g.bx, ly = y - g.by, lz = z - g.bz;
        if (lx >= 0 && lx < 16 && lz >= 0 && lz < 16 && ly >= 0 && ly < g.H) { const ix = (lx / w) | 0, iy = (ly / h) | 0, iz = (lz / w) | 0; const tx = (lx - ix * w) / w, ty = (ly - iy * h) / h, tz = (lz - iz * w) / w;
          const ny = g.ny, nz = g.nz, a = g.v; const i000 = (ix * nz + iz) * ny + iy, i100 = i000 + nz * ny, i001 = i000 + ny;
          return (this.v = lerp(tz, lerp(ty, lerp(tx, a[i000], a[i100]), lerp(tx, a[i000 + 1], a[i100 + 1])), lerp(ty, lerp(tx, a[i001], a[i001 + nz * ny]), lerp(tx, a[i001 + 1], a[i001 + nz * ny + 1])))); } }
      const fx = Math.floor(x / w) * w, fy = Math.floor(y / h) * h, fz = Math.floor(z / w) * w; const tx = (x - fx) / w, ty = (y - fy) / h, tz = (z - fz) / w;
      const C = (dx, dy, dz) => this.corner(fx + dx, fy + dy, fz + dz);
      return (this.v = lerp(tz, lerp(ty, lerp(tx, C(0, 0, 0), C(w, 0, 0)), lerp(tx, C(0, h, 0), C(w, h, 0))), lerp(ty, lerp(tx, C(0, 0, w), C(w, 0, w)), lerp(tx, C(0, h, w), C(w, h, w)))));
    }
    range() { return this.cell ? [this.lo, this.hi] : RANGE_ALL; } }

  // ---------- spline ----------
  let SPLINE_DOUBLE = false; // true: constant spline points stay doubles (deepslate) instead of floats (Java); for testing
  function splineFn(j, df, nested) {
    if (typeof j === 'number') { const v = nested && SPLINE_DOUBLE ? j : fr(j); return () => v; }
    const coord = df(j.coordinate); const P = j.points || []; if (!P.length) return () => 0;
    const L = P.map(p => fr(p.location ?? 0)), V = P.map(p => splineFn(p.value, df, true)), D = P.map(p => fr(p.derivative ?? 0)); const n = P.length;
    return (x, y, z) => {
      const c = coord.c(x, y, z); let i = -1; for (let k = 0; k < n; k++) { if (c < L[k]) break; i = k; }
      if (i < 0) return fr(V[0](x, y, z) + fr(D[0] * fr(c - L[0])));
      if (i === n - 1) return fr(V[i](x, y, z) + fr(D[i] * fr(c - L[i])));
      const l0 = L[i], l1 = L[i + 1], d0 = D[i], d1 = D[i + 1]; const f = fr(fr(c - l0) / fr(l1 - l0)); const v0 = V[i](x, y, z), v1 = V[i + 1](x, y, z);
      const f8 = fr(fr(d0 * fr(l1 - l0)) - fr(v1 - v0)), f9 = fr(fr(-d1 * fr(l1 - l0)) + fr(v1 - v0));
      return fr(flerp(f, v0, v1) + fr(fr(f * fr(1 - f)) * flerp(f, f8, f9)));
    };
  }
  function splineYDep(j, df) { if (typeof j === 'number') return false; return df(j.coordinate).y || (j.points || []).some(p => splineYDep(p.value, df)); }

  // ---------- the biome parameter list (OverworldBiomeBuilder, 26.3) ----------
  function biomeParams(names) {
    const q = (x) => Math.trunc(fr(fr(x) * 10000)); const S = (a, b) => [q(a), q(b)], P = (a) => [q(a), q(a)], span = (a, b) => [a[0], b[1]];
    const out = []; const FULL = S(-1, 1);
    const T = [S(-1, -0.45), S(-0.45, -0.15), S(-0.15, 0.2), S(0.2, 0.55), S(0.55, 1)], H = [S(-1, -0.35), S(-0.35, -0.1), S(-0.1, 0.1), S(0.1, 0.3), S(0.3, 1)];
    const E = [S(-1, -0.78), S(-0.78, -0.375), S(-0.375, -0.2225), S(-0.2225, 0.05), S(0.05, 0.45), S(0.45, 0.55), S(0.55, 1)];
    const FROZEN = T[0], UNFROZEN = span(T[1], T[4]); const coast = S(-0.19, -0.11), inland = S(-0.11, 0.55), near = S(-0.11, 0.03), mid = S(0.03, 0.3), far = S(0.3, 1);
    const OCEANS = [['deep_frozen_ocean', 'deep_cold_ocean', 'deep_ocean', 'deep_lukewarm_ocean', 'warm_ocean'], ['frozen_ocean', 'cold_ocean', 'ocean', 'lukewarm_ocean', 'warm_ocean']];
    const MID = [['snowy_plains', 'snowy_plains', 'snowy_plains', 'snowy_taiga', 'taiga'], ['plains', 'plains', 'forest', 'taiga', 'old_growth_spruce_taiga'], ['flower_forest', 'plains', 'forest', 'birch_forest', 'dark_forest'], ['savanna', 'savanna', 'forest', 'jungle', 'jungle'], ['desert', 'desert', 'desert', 'desert', 'desert']];
    const MIDV = [['ice_spikes', null, 'snowy_taiga', null, null], ['dappled_forest', null, null, null, 'old_growth_pine_taiga'], ['sunflower_plains', null, null, 'old_growth_birch_forest', null], [null, null, 'plains', 'sparse_jungle', 'bamboo_jungle'], [null, null, null, null, null]];
    const PLAT = [['snowy_plains', 'snowy_plains', 'snowy_plains', 'snowy_taiga', 'snowy_taiga'], ['meadow', 'meadow', 'forest', 'taiga', 'old_growth_spruce_taiga'], ['meadow', 'meadow', 'meadow', 'meadow', 'pale_garden'], ['savanna_plateau', 'savanna_plateau', 'forest', 'forest', 'jungle'], ['badlands', 'badlands', 'badlands', 'wooded_badlands', 'wooded_badlands']];
    const PLATV = [['ice_spikes', null, null, null, null], ['cherry_grove', null, 'meadow', 'meadow', 'old_growth_pine_taiga'], ['cherry_grove', 'cherry_grove', 'forest', 'birch_forest', null], [null, null, null, null, null], ['eroded_badlands', 'eroded_badlands', null, null, null]];
    const WG = 'windswept_gravelly_hills', WH = 'windswept_hills', WF = 'windswept_forest';
    const SHAT = [[WG, WG, WH, WF, WF], [WG, WG, WH, WF, WF], [WH, WH, WH, WF, WF], [null, null, null, null, null], [null, null, null, null, null]];
    const idx = (b) => { const i = names.indexOf(b); if (i < 0) throw new Error('biome ' + b); return i; };
    const add = (t, h, c, e, w, b) => { const i = idx(b); out.push([i, t, h, c, e, P(0), w]); out.push([i, t, h, c, e, P(1), w]); };
    const addU = (t, h, c, e, w, b) => out.push([idx(b), t, h, c, e, S(0.2, 0.9), w]), addB = (t, h, c, e, w, b) => out.push([idx(b), t, h, c, e, P(1.1), w]);
    const neg = (w) => w[1] < 0;
    const pMid = (i, j, w) => neg(w) ? MID[i][j] : (MIDV[i][j] || MID[i][j]);
    const pBad = (j, w) => j < 2 ? (neg(w) ? 'badlands' : 'eroded_badlands') : j < 3 ? 'badlands' : 'wooded_badlands';
    const pMidBad = (i, j, w) => i === 4 ? pBad(j, w) : pMid(i, j, w);
    const pPlat = (i, j, w) => (!neg(w) && PLATV[i][j]) || PLAT[i][j];
    const pSlope = (i, j, w) => i >= 3 ? pPlat(i, j, w) : j <= 1 ? 'snowy_slopes' : 'grove';
    const pMidBadSlope = (i, j, w) => i === 0 ? pSlope(i, j, w) : pMidBad(i, j, w);
    const pSav = (i, j, w, u) => i > 1 && j < 4 && w[1] >= 0 ? 'windswept_savanna' : u;
    const pBeach = (i) => i === 0 ? 'snowy_beach' : i === 4 ? 'desert' : 'beach';
    const pShatCoast = (i, j, w) => pSav(i, j, w, w[1] >= 0 ? pMid(i, j, w) : pBeach(i));
    const pPeak = (i, j, w) => i <= 2 ? (neg(w) ? 'jagged_peaks' : 'frozen_peaks') : i === 3 ? 'stony_peaks' : pBad(j, w);
    const pShat = (i, j, w) => SHAT[i][j] || pMid(i, j, w);
    const each = (fn) => { for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) fn(i, j, T[i], H[j]); };
    const peaks = (w) => each((i, j, t, h) => { const m = pMid(i, j, w), mb = pMidBad(i, j, w), mbs = pMidBadSlope(i, j, w), pl = pPlat(i, j, w), sh = pShat(i, j, w), ss = pSav(i, j, w, sh), pk = pPeak(i, j, w);
      add(t, h, span(coast, far), E[0], w, pk); add(t, h, span(coast, near), E[1], w, mbs); add(t, h, span(mid, far), E[1], w, pk); add(t, h, span(coast, near), span(E[2], E[3]), w, m); add(t, h, span(mid, far), E[2], w, pl); add(t, h, mid, E[3], w, mb); add(t, h, far, E[3], w, pl);
      add(t, h, span(coast, far), E[4], w, m); add(t, h, span(coast, near), E[5], w, ss); add(t, h, span(mid, far), E[5], w, sh); add(t, h, span(coast, far), E[6], w, m); });
    const high = (w) => each((i, j, t, h) => { const m = pMid(i, j, w), mb = pMidBad(i, j, w), mbs = pMidBadSlope(i, j, w), pl = pPlat(i, j, w), sh = pShat(i, j, w), ss = pSav(i, j, w, m), sl = pSlope(i, j, w), pk = pPeak(i, j, w);
      add(t, h, coast, span(E[0], E[1]), w, m); add(t, h, near, E[0], w, sl); add(t, h, span(mid, far), E[0], w, pk); add(t, h, near, E[1], w, mbs); add(t, h, span(mid, far), E[1], w, sl); add(t, h, span(coast, near), span(E[2], E[3]), w, m); add(t, h, span(mid, far), E[2], w, pl); add(t, h, mid, E[3], w, mb); add(t, h, far, E[3], w, pl);
      add(t, h, span(coast, far), E[4], w, m); add(t, h, span(coast, near), E[5], w, ss); add(t, h, span(mid, far), E[5], w, sh); add(t, h, span(coast, far), E[6], w, m); });
    const swamps = (w) => { add(FULL, FULL, coast, span(E[0], E[2]), w, 'stony_shore'); add(span(T[1], T[2]), FULL, span(near, far), E[6], w, 'swamp'); add(span(T[3], T[4]), FULL, span(near, far), E[6], w, 'mangrove_swamp'); };
    const midS = (w) => { swamps(w); each((i, j, t, h) => { const m = pMid(i, j, w), mb = pMidBad(i, j, w), mbs = pMidBadSlope(i, j, w), sh = pShat(i, j, w), pl = pPlat(i, j, w), be = pBeach(i), ss = pSav(i, j, w, m), sc = pShatCoast(i, j, w), sl = pSlope(i, j, w);
      add(t, h, span(near, far), E[0], w, sl); add(t, h, span(near, mid), E[1], w, mbs); add(t, h, far, E[1], w, i === 0 ? sl : pl); add(t, h, near, E[2], w, m); add(t, h, mid, E[2], w, mb); add(t, h, far, E[2], w, pl); add(t, h, span(coast, near), E[3], w, m); add(t, h, span(mid, far), E[3], w, mb);
      if (neg(w)) { add(t, h, coast, E[4], w, be); add(t, h, span(near, far), E[4], w, m); } else add(t, h, span(coast, far), E[4], w, m);
      add(t, h, coast, E[5], w, sc); add(t, h, near, E[5], w, ss); add(t, h, span(mid, far), E[5], w, sh); add(t, h, coast, E[6], w, neg(w) ? be : m); if (i === 0) add(t, h, span(near, far), E[6], w, m); }); };
    const low = (w) => { swamps(w); each((i, j, t, h) => { const m = pMid(i, j, w), mb = pMidBad(i, j, w), mbs = pMidBadSlope(i, j, w), be = pBeach(i), ss = pSav(i, j, w, m);
      add(t, h, near, span(E[0], E[1]), w, mb); add(t, h, span(mid, far), span(E[0], E[1]), w, mbs); add(t, h, near, span(E[2], E[3]), w, m); add(t, h, span(mid, far), span(E[2], E[3]), w, mb); add(t, h, coast, span(E[3], E[4]), w, be); add(t, h, span(near, far), E[4], w, m);
      add(t, h, coast, E[5], w, pShatCoast(i, j, w)); add(t, h, near, E[5], w, ss); add(t, h, span(mid, far), E[5], w, m); add(t, h, coast, E[6], w, be); if (i === 0) add(t, h, span(near, far), E[6], w, m); }); };
    const valleys = (w) => { add(FROZEN, FULL, coast, span(E[0], E[1]), w, neg(w) ? 'stony_shore' : 'frozen_river'); add(UNFROZEN, FULL, coast, span(E[0], E[1]), w, neg(w) ? 'stony_shore' : 'river'); add(FROZEN, FULL, near, span(E[0], E[1]), w, 'frozen_river'); add(UNFROZEN, FULL, near, span(E[0], E[1]), w, 'river');
      add(FROZEN, FULL, span(coast, far), span(E[2], E[5]), w, 'frozen_river'); add(UNFROZEN, FULL, span(coast, far), span(E[2], E[5]), w, 'river'); add(FROZEN, FULL, coast, E[6], w, 'frozen_river'); add(UNFROZEN, FULL, coast, E[6], w, 'river');
      add(span(T[1], T[2]), FULL, span(inland, far), E[6], w, 'swamp'); add(span(T[3], T[4]), FULL, span(inland, far), E[6], w, 'mangrove_swamp'); add(FROZEN, FULL, span(inland, far), E[6], w, 'frozen_river');
      each((i, j, t, h) => add(t, h, span(mid, far), span(E[0], E[1]), w, pMidBad(i, j, w))); };
    add(FULL, FULL, S(-1.2, -1.05), FULL, FULL, 'mushroom_fields');
    for (let i = 0; i < 5; i++) { add(T[i], FULL, S(-1.05, -0.455), FULL, FULL, OCEANS[0][i]); add(T[i], FULL, S(-0.455, -0.19), FULL, FULL, OCEANS[1][i]); }
    midS(S(-1, -0.93333334)); high(S(-0.93333334, -0.7666667)); peaks(S(-0.7666667, -0.56666666)); high(S(-0.56666666, -0.4)); midS(S(-0.4, -0.26666668)); low(S(-0.26666668, -0.05)); valleys(S(-0.05, 0.05));
    low(S(0.05, 0.26666668)); midS(S(0.26666668, 0.4)); high(S(0.4, 0.56666666)); peaks(S(0.56666666, 0.7666667)); high(S(0.7666667, 0.93333334)); midS(S(0.93333334, 1));
    addU(FULL, FULL, S(0.8, 1), FULL, FULL, 'dripstone_caves'); addU(FULL, S(0.7, 1), FULL, FULL, FULL, 'lush_caves'); addU(FULL, FULL, S(-0.19, 0.55), S(0.45, 1), S(-1.1, -0.85), 'sulfur_caves'); addB(FULL, FULL, FULL, span(E[0], E[1]), FULL, 'deep_dark');
    return out;
  }
  // R-tree over the 7-d parameter space (Climate.RTree), quantised like Java
  function rtree(entries) {
    const leaf = (e) => ({ space: [e[1], e[2], e[3], e[4], e[5], e[6], [0, 0]], b: e[0] });
    const sub = (ch) => { const sp = []; for (let i = 0; i < 7; i++) { let lo = INF, hi = -INF; for (const c of ch) { lo = Math.min(lo, c.space[i][0]); hi = Math.max(hi, c.space[i][1]); } sp.push([lo, hi]); } return { space: sp, ch }; };
    const sortBy = (nodes, i, abs) => nodes.map(n => { const f = (n.space[i][0] + n.space[i][1]) / 2; return { k: abs ? Math.abs(f) : f, n }; }).sort((a, b) => a.k - b.k).map(o => o.n);
    const bucket = (nodes) => { const out = []; let cur = []; const n = Math.pow(10, Math.floor(Math.log(nodes.length - 0.01) / Math.log(10))); for (const x of nodes) { cur.push(x); if (cur.length < n) continue; out.push(sub(cur)); cur = []; } if (cur.length) out.push(sub(cur)); return out; };
    const area = (sp) => sp.reduce((a, p) => a + Math.abs(p[1] - p[0]), 0);
    const build = (nodes) => {
      if (nodes.length === 1) return nodes[0];
      if (nodes.length <= 10) return sub(nodes.map(n => { let k = 0; for (let i = 0; i < 7; i++) k += Math.abs((n.space[i][0] + n.space[i][1]) / 2); return { k, n }; }).sort((a, b) => a.k - b.k).map(o => o.n));
      let best = INF, bi = -1; for (let i = 0; i < 7; i++) { const r = bucket(sortBy(nodes, i, false)); const a = r.reduce((s, t) => s + area(t.space), 0); if (best > a) { best = a; bi = i; } }
      let res = bucket(sortBy(nodes, bi, false)); res = sortBy(res, bi, true); return sub(res.map(t => build(t.ch)));
    };
    const root = build(entries.map(leaf));
    const dist = (n, v) => { let r = 0; for (let i = 0; i < 7; i++) { const p = n.space[i], t = v[i]; const a = t - p[1], b = p[0] - t; const d = a > 0 ? a : b > 0 ? b : 0; r += d * d; } return r; };
    const search = (node, v, best) => { if (!node.ch) return node; let bd = best ? dist(best, v) : INF, bl = best;
      for (const c of node.ch) { const d1 = dist(c, v); if (bd <= d1) continue; const l2 = search(c, v, bl); const d2 = c === l2 ? d1 : dist(l2, v); if (bd <= d2) continue; bd = d2; bl = l2; } return bl; };
    return (v) => search(root, v, null).b;
  }

  // ---------- material rules ----------
  const anchorY = (a, minY, maxY) => a.absolute !== undefined ? a.absolute : a.above_bottom !== undefined ? minY + a.above_bottom : a.below_top !== undefined ? maxY - a.below_top : 0;

  // ---------- generator ----------
  class Generator {
    // seed: 32-bit int or [hi, lo] uint32 pair; preset: 'overworld' | 'amplified' | 'large_biomes'; blockCode(name) -> small int (>= 4)
    constructor(seed, preset, data, blockCode) {
      const D = data || MCT_DATA; this.D = D; const S = D.settings[preset || 'overworld']; this.S = S;
      const sh = Array.isArray(seed) ? seed[0] >>> 0 : (seed < 0 ? 0xffffffff : 0), sl = Array.isArray(seed) ? seed[1] >>> 0 : seed >>> 0; this.seedH = sh; this.seedL = sl;
      this.minY = S.noise.min_y; this.height = S.noise.height; this.maxY = this.minY + this.height - 1; this.sea = S.sea_level;
      this.random = Rng.fromSeed(sh, sl).forkPositional();
      this.noises = new Map(); this.randoms = new Map(); this.dfs = new Map();
      this.biomeNames = Object.keys(D.biomes); this.biomeTemp = this.biomeNames.map(b => D.biomes[b][0]); this.biomeFrozen = this.biomeNames.map(b => D.biomes[b][1]);
      this.palette = []; this.blockCode = blockCode || ((n) => { let i = this.palette.indexOf(n); if (i < 0) { i = this.palette.length; this.palette.push(n); } return 4 + i; });
      const R = S.noise_router; this.R = {}; for (const k of ['temperature', 'vegetation', 'continents', 'erosion', 'depth', 'ridges', 'final_density', 'chunk_surface_level']) this.R[k] = this.df(R[k]);
      const A = S.aquifers; this.A = A ? { barrier: this.df(A.barrier), flood: this.df(A.fluid_level_floodedness), spread: this.df(A.fluid_level_spread), lava: this.df(A.lava), excl: this.df(A.exclusion), surf: this.df(A.surface_level) } : null;
      this.params = biomeParams(this.biomeNames); this.findBiome = rtree(this.params); this.qbio = new Map(); this.fid = new Map();
      // biome zoom seed: first 8 bytes (little endian) of SHA-256 of the seed's 8 little-endian bytes
      const sb = new Uint8Array(8); for (let i = 0; i < 4; i++) { sb[i] = (sl >>> (8 * i)) & 255; sb[4 + i] = (sh >>> (8 * i)) & 255; } const hs = sha256(sb);
      this.zl = (hs[0] | (hs[1] << 8) | (hs[2] << 16) | (hs[3] << 24)) >>> 0; this.zh = (hs[4] | (hs[5] << 8) | (hs[6] << 16) | (hs[7] << 24)) >>> 0;
      this.surfN = this.noise('surface'); this.surf2N = this.noise('surface_secondary'); this.clayN = this.noise('clay_bands_offset');
      this.bandsN = [this.noise('badlands_surface'), this.noise('badlands_pillar'), this.noise('badlands_pillar_roof')]; this.bergN = [this.noise('iceberg_surface'), this.noise('iceberg_pillar'), this.noise('iceberg_pillar_roof')];
      this.clayBands = this.makeBands(this.random.fromHashOf('minecraft:clay_bands'));
      this.oreRandom = this.random.fromHashOf('minecraft:ore').forkPositional(); this.aqRandom = this.random.fromHashOf('minecraft:aquifer').forkPositional();
      const tr = new Rng(0, 1234, 0x1234, 0x5678); this.tempN = new Perlin(tr); this.frozenN = new Perlin(tr); this.infoN = new Perlin(tr); // biome temperature jitter (not Java's noises)
      this.oreDens = []; this.rule = this.compileRule(S.material_rule);
      this.code = { air: 0, stone: 1, water: 2, lava: 3 };
      // the interpolated functions that get a corner grid while a chunk fills (final density + ore veins)
      this.gridNodes = []; const seen = new Set(); const visit = (n) => { if (!n || seen.has(n)) return; seen.add(n); if (n instanceof Interp) { if (n.cw === 4 && n.ch === 8) this.gridNodes.push(n); return; } for (const k in n) { const v = n[k]; if (v instanceof DF) visit(v); else if (Array.isArray(v)) v.forEach(e => e instanceof DF && visit(e)); } };
      visit(this.R.final_density); for (const n of this.dfs.values()) visit(n);
      this.fillCount = 0;
    }
    noise(name) { name = name.replace('minecraft:', ''); let n = this.noises.get(name); if (!n) { const j = this.D.noise[name]; if (!j) throw new Error('noise ' + name); n = normalNoise(j, this.random.fromHashOf('minecraft:' + name)); this.noises.set(name, n); } return n; }
    posRandom(name) { if (!name.includes(':')) name = 'minecraft:' + name; let r = this.randoms.get(name); if (!r) { r = this.random.fromHashOf(name).forkPositional(); this.randoms.set(name, r); } return r; }
    df(j) {
      if (typeof j === 'number') return new Const(j);
      if (typeof j === 'string') { const k = j.replace('minecraft:', ''); let n = this.dfs.get(k); if (!n) { const src = this.D.df[k]; if (src === undefined) throw new Error('density function ' + k); n = this.df(src); this.dfs.set(k, n); } return n; }
      const t = (j.type || '').replace('minecraft:', ''); const a = (k) => this.df(j[k] ?? j.argument ?? j.input);
      switch (t) {
        case 'constant': return new Const(j.value ?? j.argument ?? 0);
        case 'blend_alpha': return new Const(1); case 'blend_offset': case 'beardifier': case 'end_outer_islands': return new Const(0);
        case 'blend_density': return new Pass(this.df(j.input ?? j.argument));
        case 'old_blended_noise': return new Blended(blendedNoise(this.random.fromHashOf('minecraft:terrain'), j.xz_scale ?? 1, j.y_scale ?? 1, j.xz_factor ?? 80, j.y_factor ?? 160, j.smear_scale_multiplier ?? 8));
        case 'interpolated': return new Interp(this.df(j.input ?? j.argument), j.cell_size_xz ?? 4, j.cell_size_y ?? 4);
        case 'cache': case 'flat_cache': case 'cache_2d': case 'cache_once': case 'cache_all_in_cell': return new Cache(this.df(j.input ?? j.argument));
        case 'noise': return new Noise(this.noise(j.noise), j.xz_scale ?? 1, j.y_scale ?? 1, j.shift_x !== undefined ? this.df(j.shift_x) : new Const(0), j.shift_y !== undefined ? this.df(j.shift_y) : new Const(0), j.shift_z !== undefined ? this.df(j.shift_z) : new Const(0));
        case 'shift_a': return new Shift(this.noise(j.noise ?? j.argument), 0); case 'shift_b': return new Shift(this.noise(j.noise ?? j.argument), 1); case 'shift': return new Shift(this.noise(j.noise ?? j.argument), 2);
        case 'find_top_surface': return new FindTop(this.df(j.density), this.df(j.upper_bound), j.lower_bound ?? 0, j.cell_height ?? 1);
        case 'range_choice': return new RangeChoice(this.df(j.input), j.min_inclusive ?? 0, j.max_exclusive ?? 1, this.df(j.when_in_range), this.df(j.when_out_of_range));
        case 'clamp': return new Clamp(this.df(j.input), j.min ?? 0, j.max ?? 1);
        case 'interval_select': { const fns = (j.functions || []).map(f => this.df(f)); if (!fns.length) fns.push(new Const(0)); const n = Math.min((j.thresholds || []).length, fns.length - 1); return new IntervalSelect(this.df(j.input), (j.thresholds || []).slice(0, n), fns.slice(0, n + 1)); }
        case 'spline': { const df = (k) => this.df(k); return new Spline(splineFn(j.spline, df), splineYDep(j.spline, df)); }
        case 'gradient': return new Gradient(j);
        case 'lerp': return new Lerp(this.df(j.alpha), this.df(j.first), this.df(j.second));
        case 'floor': case 'round': case 'ceil': case 'truncate': return new Round(t, this.df(j.input), this.df(j.multiple));
        case 'pow': return new Pow(this.df(j.base), this.df(j.exponent));
        case 'distance_to_point': return new Dist(j.point || [0, 0, 0], j.metric || 'euclidean');
        case 'slice': return new Slice(j.axis || 'y', j.coordinate ?? 0, this.df(j.input));
        case 'y_clamped_gradient': return new Gradient({ axis: 'y', from_coordinate: j.from_y, to_coordinate: j.to_y, from_value: j.from_value, to_value: j.to_value });
      }
      if (t in UN) return new Unary(UN[t], a('input'));
      if (t in BN) return new Bin(BN[t], this.df(j.left ?? j.argument1), this.df(j.right ?? j.argument2));
      console.warn('MCT: unknown density function ' + t); return new Const(0);
    }
    // ---- biomes ----
    climate(x, y, z) { const R = this.R; const q = (v) => Math.trunc(fr(fr(v) * 10000)); return [q(R.temperature.c(x, y, z)), q(R.vegetation.c(x, y, z)), q(R.continents.c(x, y, z)), q(R.erosion.c(x, y, z)), q(R.depth.c(x, y, z)), q(R.ridges.c(x, y, z)), 0]; }
    noiseBiome(qx, qy, qz) { qy = qy < -16 ? -16 : qy > 79 ? 79 : qy; const k = ((qx + 524288) * 1048576 + (qz + 524288)) * 128 + (qy + 32); let b = this.qbio.get(k); if (b === undefined) { if (this.qbio.size > 400000) this.qbio.clear(); b = this.findBiome(this.climate(qx << 2, qy << 2, qz << 2)); this.qbio.set(k, b); } return b; }
    // BiomeManager.getBiome: fuzzy 4x4x4 cells
    biomeAt(x, y, z) {
      const i = x - 2, j = y - 2, k = z - 2; const l = i >> 2, m = j >> 2, n = k >> 2; const d = (i & 3) / 4, e = (j & 3) / 4, f = (k & 3) / 4;
      let best = 0, bd = INF;
      for (let p = 0; p < 8; p++) { const ax = (p & 4) === 0, ay = (p & 2) === 0, az = (p & 1) === 0; const v = this.fiddled(ax ? l : l + 1, ay ? m : m + 1, az ? n : n + 1, ax ? d : d - 1, ay ? e : e - 1, az ? f : f - 1); if (bd > v) { best = p; bd = v; } }
      return this.noiseBiome((best & 4) === 0 ? l : l + 1, (best & 2) === 0 ? m : m + 1, (best & 1) === 0 ? n : n + 1);
    }
    fiddled(x, y, z, dx, dy, dz) {
      const key = ((x + 524288) * 1048576 + (z + 524288)) * 256 + (y + 128); let f = this.fid.get(key);
      if (f === undefined) { if (this.fid.size > 300000) this.fid.clear(); f = this.fiddle(x, y, z); this.fid.set(key, f); }
      return (dz + f[2]) * (dz + f[2]) + (dy + f[1]) * (dy + f[1]) + (dx + f[0]) * (dx + f[0]);
    }
    fiddle(x, y, z) {
      const lcg = this.lcg; lcg(this.zh, this.zl, x < 0 ? 0xffffffff : 0, x >>> 0); lcg(RH, RL, y < 0 ? 0xffffffff : 0, y >>> 0); lcg(RH, RL, z < 0 ? 0xffffffff : 0, z >>> 0);
      lcg(RH, RL, x < 0 ? 0xffffffff : 0, x >>> 0); lcg(RH, RL, y < 0 ? 0xffffffff : 0, y >>> 0); lcg(RH, RL, z < 0 ? 0xffffffff : 0, z >>> 0);
      const a = ((((RL >>> 24) | ((RH & 3) << 8)) / 1024) - 0.5) * 0.9; lcg(RH, RL, this.zh, this.zl);
      const b = ((((RL >>> 24) | ((RH & 3) << 8)) / 1024) - 0.5) * 0.9; lcg(RH, RL, this.zh, this.zl);
      const c = ((((RL >>> 24) | ((RH & 3) << 8)) / 1024) - 0.5) * 0.9;
      return [a, b, c];
    }
    lcg(ah, al, bh, bl) { mul64(ah, al, 0x5851F42D, 0x4C957F2D); add64(RH, RL, 0x14057B7E, 0xF767814F); mul64(ah, al, RH, RL); add64(RH, RL, bh, bl); } // LinearCongruentialGenerator.next
    // temperature at a block (Biome.getHeightAdjustedTemperature with frozen modifier; the jitter noises are this engine's own)
    temperature(b, x, y, z) {
      let t = this.biomeTemp[b];
      if (this.biomeFrozen[b]) { const d = this.frozenN.get(x * 0.05, 0, z * 0.05) * 7, e = this.infoN.get(x * 0.2, 0, z * 0.2); if (d + e < 0.3 && this.infoN.get(x * 0.09, 0, z * 0.09) < 0.8) t = 0.2; }
      const top = this.sea + 17; if (y > top) t -= (this.tempN.get(x / 8, 0, z / 8) * 8 + y - top) * 0.05 / 40; return t;
    }
    // ---- clay bands (SurfaceSystem.generateBands) ----
    makeBands(r) { const T = 'terracotta'; const b = new Array(192).fill(T); const between = (a, c) => r.nextInt(c - a + 1) + a;
      for (let i = 0; i < b.length; i++) { i += r.nextInt(5) + 1; if (i < b.length) b[i] = 'orange_terracotta'; }
      const bands = (min, st) => { const n = between(6, 15); for (let j = 0; j < n; j++) { const k = min + r.nextInt(3), l = r.nextInt(b.length); for (let m = 0; l + m < b.length && m < k; m++) b[l + m] = st; } };
      bands(1, 'yellow_terracotta'); bands(2, 'brown_terracotta'); bands(1, 'red_terracotta');
      const j = between(9, 15); let k = 0; for (let l = 0; k < j && l < b.length; l += r.nextInt(16) + 4) { b[l] = 'white_terracotta'; if (l - 1 > 0 && r.nextBoolean()) b[l - 1] = 'light_gray_terracotta'; if (l + 1 < b.length && r.nextBoolean()) b[l + 1] = 'light_gray_terracotta'; k++; }
      return b; }
    // ---- material rules: compile(json) -> (ctx) => code or -1 ----
    blk(name) { name = (typeof name === 'string' ? name : name.Name).replace('minecraft:', ''); if (name === 'air') return 0; if (name === 'water') return 2; if (name === 'lava') return 3; if (name === 'stone') return 1; return this.blockCode(name); }
    compileRule(j) {
      if (typeof j === 'string') { const k = j.replace('minecraft:', ''); const src = this.D.mrule[k]; if (!src) throw new Error('rule ' + k); return this.compileRule(src); }
      const t = (j.type || '').replace('minecraft:', '');
      if (t === 'block') { const c = this.blk(j.result_state); return () => c; }
      if (t === 'sequence') { const rs = (j.sequence || []).map(r => this.compileRule(r)); return (M) => { for (let i = 0; i < rs.length; i++) { const v = rs[i](M); if (v >= 0) return v; } return -1; }; }
      if (t === 'condition') { const c = this.compileCond(j.if_true), r = this.compileRule(j.then_run); return (M) => c(M) ? r(M) : -1; }
      if (t === 'bandlands') { const codes = this.clayBands.map(n => this.blk(n)); return (M) => { const i = Math.round(this.clayN.get(M.x, 0, M.z) * 4); return codes[(M.y + i + 192) % 192]; }; }
      if (t === 'ore_vein') { const dens = this.df(j.density), gap = this.df(j.filler_gap), rich = this.df(j.richness), ore = this.blk(j.ore_block), raw = this.blk(j.raw_ore_block), fill = this.blk(j.filler_block), rc = j.raw_ore_chance ?? 0.02;
        const slot = this.oreDens.length; this.oreDens.push(dens);
        return (M) => { if (M.oreCells && !M.oreCells[slot][(((M.y - this.minY) >> 3) * 4 + ((M.z & 15) >> 2)) * 4 + ((M.x & 15) >> 2)]) return -1; const d = dens.c(M.x, M.y, M.z); if (d <= 0) return -1; const r = this.oreRandom.at1(M.x, M.y, M.z); if (r.nextFloat() > d) return -1; if (r.nextFloat() < rich.c(M.x, M.y, M.z) && gap.c(M.x, M.y, M.z) < 0) return r.nextFloat() < rc ? raw : ore; return fill; }; }
      return () => -1;
    }
    compileCond(j) {
      if (typeof j === 'string') { const k = j.replace('minecraft:', ''); const src = this.D.mcond[k]; if (!src) throw new Error('condition ' + k); return this.compileCond(src); }
      const t = (j.type || '').replace('minecraft:', ''); const lazyY = (fn) => { let u = -1, r = false; return (M) => { if (M.uy !== u) { u = M.uy; r = fn(M); } return r; }; };
      switch (t) {
        case 'not': { const c = this.compileCond(j.invert); return (M) => !c(M); }
        case 'biome': { const set = new Uint8Array(this.biomeNames.length); for (const b of [].concat(j.biome_is)) { const i = this.biomeNames.indexOf(String(b).replace('minecraft:', '')); if (i >= 0) set[i] = 1; } return lazyY((M) => !!M.chunkHas(set) && set[M.biome()] === 1); }
        case 'noise_threshold': { const n = this.noise(j.noise), lo = j.min_threshold ?? 0, hi = j.max_threshold ?? 0, d3 = !!j.is_3d; let u = -1, v = 0;
          return (M) => { const key = d3 ? M.uy : M.uxz; if (key !== u) { u = key; v = d3 ? n.get(M.x, M.y, M.z) : n.get(M.x, 0, M.z); } return v >= lo && v <= hi; }; }
        case 'stone_depth': { const off = j.offset ?? 0, add = !!j.add_surface_depth, sec = j.secondary_depth_range ?? 0, ceil = j.surface_type === 'ceiling';
          return lazyY((M) => (ceil ? M.below : M.above) <= 1 + off + (add ? M.sd : 0) + (sec === 0 ? 0 : Math.trunc(lerp((M.secondary() + 1) / 2, 0, sec)))); }
        case 'vertical_gradient': { const lo = anchorY(j.true_at_and_below, this.minY, this.maxY), hi = anchorY(j.false_at_and_above, this.minY, this.maxY), R = this.posRandom(j.random_name);
          return lazyY((M) => { if (M.y <= lo) return true; if (M.y >= hi) return false; const p = lerp((M.y - lo) / (hi - lo), 1, 0); return R.at1(M.x, M.y, M.z).nextFloat() < p; }); }
        case 'water': { const off = j.offset ?? 0, mul = j.surface_depth_multiplier ?? 0, add = !!(j.add_stone_depth ?? j.add_surface_depth);
          return lazyY((M) => M.water === -2147483648 || M.y + (add ? M.above : 0) >= M.water + off + M.sd * mul); }
        case 'y_above': { const ay = anchorY(j.anchor, this.minY, this.maxY), mul = j.surface_depth_multiplier ?? 0, add = !!(j.add_stone_depth ?? j.add_surface_depth);
          return lazyY((M) => M.y + (add ? M.above : 0) >= ay + M.sd * mul); }
        case 'above_preliminary_surface': return (M) => M.y >= M.minSurface();
        case 'hole': return (M) => M.sd <= 0;
        case 'steep': return (M) => M.steep();
        case 'temperature': return lazyY((M) => this.temperature(M.biome(), M.x, M.y, M.z) < 0.15);
      }
      return () => false;
    }
    // ---- aquifer for one chunk (Aquifer.NoiseBasedAquifer) ----
    aquifer(bx, bz) {
      const G = this, A = this.A, sea = this.sea; if (!A) return (x, y, z, d) => d > 0 ? 1 : y < sea ? 2 : 0;
      const LAVA_Y = -54, WAY_BELOW = -32512; const glob = (y) => y < Math.min(LAVA_Y, sea) ? [LAVA_Y, 3] : [sea, 2]; const at = (st, y) => y < st[0] ? st[1] : 0;
      const fd = (a, b) => Math.floor(a / b);
      const minGX = fd(bx - 5, 16), maxGX = fd(bx + 15 - 5, 16) + 1, minGZ = fd(bz - 5, 16), maxGZ = fd(bz + 15 - 5, 16) + 1, minGY = fd(this.minY + 1, 12) - 1, maxGY = fd(this.maxY + 1, 12) + 1;
      const sx = maxGX - minGX + 1, sy = maxGY - minGY + 1, sz = maxGZ - minGZ + 1; const loc = new Int32Array(sx * sy * sz * 3), has = new Uint8Array(sx * sy * sz), stat = new Array(sx * sy * sz);
      const surfCache = G.surfCache || (G.surfCache = new Map());
      const surface = (x, z) => { const qx = (x >> 2) << 2, qz = (z >> 2) << 2; const k = qx * 1e7 + qz; let v = surfCache.get(k); if (v === undefined) { if (surfCache.size > 200000) surfCache.clear(); v = Math.floor(A.surf.c(qx, 0, qz)); surfCache.set(k, v); } return v; };
      let maxS = -INF; for (let x = (minGX * 16) >> 2; x <= (maxGX * 16 + 9) >> 2; x++) for (let z = (minGZ * 16) >> 2; z <= (maxGZ * 16 + 9) >> 2; z++) maxS = Math.max(maxS, surface(x << 2, z << 2));
      const skipAbove = (fd(maxS + 8 + 12, 12) + 1) * 12 + 11; this.lastSkipAbove = skipAbove;
      const OFF = [[0, 0], [-2, -1], [-1, -1], [0, -1], [1, -1], [-3, 0], [-2, 0], [-1, 0], [1, 0], [-2, 1], [-1, 1], [0, 1], [1, 1]];
      const computeFluid = (x, y, z) => {
        const g = glob(y); let low = INF, under = false;
        for (const [ox, oz] of OFF) { const X = x + (ox << 4), Z = z + (oz << 4); const s = surface(X, Z), adj = s + 8; const center = ox === 0 && oz === 0;
          if (center && y - 12 > adj) return g; const topAbove = y + 12 > adj;
          if (topAbove || center) { const g2 = glob(adj); if (at(g2, adj) !== 0) { if (center) under = true; if (topAbove) return g2; } }
          low = Math.min(low, s); }
        let part, full;
        if (A.excl.c(x, y, z) > 0) { part = -1; full = -1; } else { const t = (low + 8 - y) / 64; const f = under ? (t < 0 ? 1 : t > 1 ? 0 : 1 - t) : 0;
          const fl = Math.max(-1, Math.min(1, A.flood.c(x, y, z))); const fullT = lerp(1 - f, -0.3, 0.8), partT = lerp(1 - f, -0.8, 0.4); part = fl - partT; full = fl - fullT; }
        let level; if (full > 0) level = g[0]; else if (part > 0) { const cx = fd(x, 16), cy = fd(y, 40), cz = fd(z, 16); const sp = A.spread.c(cx, cy, cz) * 10; level = Math.min(low, cy * 40 + 20 + Math.floor(sp / 3) * 3); } else level = WAY_BELOW;
        let type = g[1]; if (level <= -10 && level !== WAY_BELOW && g[1] !== 3) { if (Math.abs(A.lava.c(fd(x, 64), fd(y, 40), fd(z, 64))) > 0.3) type = 3; }
        return [level, type];
      };
      const status = (i) => stat[i] || (stat[i] = computeFluid(loc[i * 3], loc[i * 3 + 1], loc[i * 3 + 2]));
      const pressure = (x, y, z, bar, s1, s2) => { const t1 = at(s1, y), t2 = at(s2, y); if ((t1 === 3 && t2 === 2) || (t1 === 2 && t2 === 3)) return 2;
        const dl = Math.abs(s1[0] - s2[0]); if (dl === 0) return 0; const avg = 0.5 * (s1[0] + s2[0]), e = y + 0.5 - avg, o = dl / 2 - Math.abs(e);
        let q; if (e > 0) { const p = o; q = p > 0 ? p / 1.5 : p / 2.5; } else { const p = 3 + o; q = p > 0 ? p / 3 : p / 10; }
        let r = 0; if (q >= -2 && q <= 2) { if (isNaN(bar.v)) bar.v = A.barrier.c(x, y, z); r = bar.v; } return 2 * (r + q); };
      const sim = (a, b) => 1 - Math.abs(b - a) / 25;
      const fn = (x, y, z, dens) => {
        if (dens > 0) return 1; const g = glob(y); if (y > skipAbove) return at(g, y); if (at(g, y) === 3) return 3;
        const ax = fd(x - 5, 16), ay = fd(y + 1, 12), az = fd(z - 5, 16); let d1 = INF, d2 = INF, d3 = INF, i1 = 0, i2 = 0, i3 = 0;
        for (let a = 0; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = 0; c <= 1; c++) {
          const gx = ax + a, gy = ay + b, gz = az + c; const i = ((gy - minGY) * sz + (gz - minGZ)) * sx + (gx - minGX);
          if (!has[i]) { const r = this.aqRandom.at1(gx, gy, gz); loc[i * 3] = gx * 16 + r.nextInt(10); loc[i * 3 + 1] = gy * 12 + r.nextInt(9); loc[i * 3 + 2] = gz * 16 + r.nextInt(10); has[i] = 1; }
          const dx = loc[i * 3] - x, dy = loc[i * 3 + 1] - y, dz = loc[i * 3 + 2] - z; const nd = dx * dx + dy * dy + dz * dz;
          if (d1 >= nd) { i3 = i2; i2 = i1; i1 = i; d3 = d2; d2 = d1; d1 = nd; } else if (d2 >= nd) { i3 = i2; i2 = i; d3 = d2; d2 = nd; } else if (d3 >= nd) { i3 = i; d3 = nd; } }
        const s1 = status(i1); const s12 = sim(d1, d2); const fs = at(s1, y); if (s12 <= 0) return fs;
        if (fs === 2 && at(glob(y - 1), y - 1) === 3) return fs;
        const bar = { v: NaN }; const s2 = status(i2); if (dens + s12 * pressure(x, y, z, bar, s1, s2) > 0) return 1;
        const s3 = status(i3); const s13 = sim(d1, d3); if (s13 > 0 && dens + s12 * s13 * pressure(x, y, z, bar, s1, s3) > 0) return 1;
        const s23 = sim(d2, d3); if (s23 > 0 && dens + s12 * s23 * pressure(x, y, z, bar, s2, s3) > 0) return 1;
        return fs;
      };
      fn.skipAbove = skipAbove; return fn;
    }
    // ---- one chunk: codes[((y - minY) * 16 + lz) * 16 + lx]; 0 air, 1 stone, 2 water, 3 lava, others from blockCode ----
    fill(cx, cz) {
      const bx = cx * 16, bz = cz * 16, minY = this.minY, H = this.height; const out = new Uint8Array(16 * 16 * H);
      // corner grids
      for (const n of this.gridNodes) { const nx = 16 / n.cw + 1, ny = H / n.ch + 1, nz = nx; const v = new Float64Array(nx * ny * nz); n.grid = null; n.lx = NaN;
        for (let ix = 0; ix < nx; ix++) for (let iz = 0; iz < nz; iz++) for (let iy = 0; iy < ny; iy++) v[(ix * nz + iz) * ny + iy] = n.a.c(bx + ix * n.cw, minY + iy * n.ch, bz + iz * n.cw);
        n.grid = { bx, by: minY, bz, H, ny, nz, v }; }
      const aq = this.aquifer(bx, bz); const root = this.R.final_density; const gn = this.gridNodes; const oreCells = this.oreDens.map(() => new Uint8Array(H / 8 * 16));
      const cw = 4, ch = 8; const NY = H / ch;
      for (let icx = 0; icx < 4; icx++) for (let icz = 0; icz < 4; icz++) for (let icy = 0; icy < NY; icy++) {
        const y0 = minY + icy * ch, X0 = bx + icx * 4, Z0 = bz + icz * 4;
        for (const n of gn) { const g = n.grid; const b = (icx * g.nz + icz) * g.ny + icy, a = g.v, s = g.nz * g.ny, q = n.q;
          // corners in lerp order: (x,y,z) 000 100 010 110 001 101 011 111
          q[0] = a[b]; q[1] = a[b + s]; q[2] = a[b + 1]; q[3] = a[b + s + 1]; q[4] = a[b + g.ny]; q[5] = a[b + s + g.ny]; q[6] = a[b + g.ny + 1]; q[7] = a[b + s + g.ny + 1];
          let lo = q[0], hi = q[0]; for (let k = 1; k < 8; k++) { const v = q[k]; if (v < lo) lo = v; if (v > hi) hi = v; } n.lo = lo; n.hi = hi; n.cell = true; n.x0 = X0; n.y0 = y0; n.z0 = Z0; }
        const [rl, rh] = root.range(); for (let k = 0; k < this.oreDens.length; k++) oreCells[k][(icy * 4 + icz) * 4 + icx] = this.oreDens[k].range()[1] > 0 ? 1 : 0;
        for (const n of gn) n.cell = false;
        if (rl > 0 || (rh <= 0 && y0 > aq.skipAbove)) { for (let dy = 0; dy < ch; dy++) { const y = y0 + dy, v = rl > 0 ? 1 : aq(X0, y, Z0, -1), o = (y - minY) * 256; for (let dz = 0; dz < 4; dz++) for (let dx = 0; dx < 4; dx++) out[o + (icz * 4 + dz) * 16 + icx * 4 + dx] = v; } continue; }
        for (const n of gn) n.cell2 = true;
        for (let dy = 0; dy < ch; dy++) { const y = y0 + dy, o = (y - minY) * 256;
          for (let dz = 0; dz < 4; dz++) for (let dx = 0; dx < 4; dx++) { const x = X0 + dx, z = Z0 + dz; out[o + (icz * 4 + dz) * 16 + icx * 4 + dx] = aq(x, y, z, root.c(x, y, z)); } }
        for (const n of gn) n.cell2 = false;
      }
      const top = new Int16Array(256), floor = new Int16Array(256), bio = new Uint8Array(256), cold = new Uint8Array(256), mask = new Uint8Array(out.length >> 3);
      this.surface(cx, cz, out, top, oreCells);
      for (const n of gn) { n.grid = null; n.lx = NaN; }
      for (let j = 0; j < 256; j++) { let t = minY - 1, f = minY - 1; for (let y = this.maxY; y >= minY; y--) { const c = out[(y - minY) * 256 + j]; if (c === 0) continue; if (t < minY) t = y; if (c !== 2 && c !== 3) { f = y; break; } } top[j] = t; floor[j] = f; bio[j] = this.biomeAt(bx + (j & 15), Math.max(t, f) + 1, bz + (j >> 4));
        cold[j] = this.temperature(bio[j], bx + (j & 15), Math.max(t, f) + 1, bz + (j >> 4)) < 0.15 ? 1 : 0; }
      for (let i = 0; i < out.length; i++) { const c = out[i]; if (c === 0 || c === 2 || c === 3) mask[i >> 3] |= 1 << (i & 7); }
      this.fillCount++;
      return { codes: out, top, floor, bio, cold, mask, cx, cz };
    }
    surface(cx, cz, out, top, oreCells) {
      const bx = cx * 16, bz = cz * 16, minY = this.minY, G = this; const rule = this.rule;
      const tops = new Int16Array(256); for (let j = 0; j < 256; j++) { let t = minY; for (let y = this.maxY; y >= minY; y--) if (out[(y - minY) * 256 + j] !== 0) { t = y; break; } tops[j] = t; }
      // which biomes can occur in this chunk (quart grid + zoom margin), so biome tests for absent biomes cost nothing
      const present = new Uint8Array(this.biomeNames.length); const hasCache = new Map();
      const M = { oreCells, x: 0, y: 0, z: 0, uxz: 0, uy: 0, above: 0, below: 0, sd: 0, water: 0, _b: -1, _s2: NaN, _ms: NaN, _st: -1,
        biome() { if (this._b < 0) this._b = G.biomeAt(this.x, this.y, this.z); return this._b; },
        secondary() { if (isNaN(this._s2)) this._s2 = G.surf2N.get(this.x, 0, this.z); return this._s2; },
        minSurface() { if (isNaN(this._ms)) this._ms = Math.floor(G.R.chunk_surface_level.c(this.x, 0, this.z)) + this.sd - 8; return this._ms; },
        steep() { if (this._st < 0) { const lx = this.x & 15, lz = this.z & 15; const h = (a, b) => tops[b * 16 + a]; const m = h(lx, Math.max(lz - 1, 0)), n = h(lx, Math.min(lz + 1, 15));
          this._st = n >= m + 4 ? 1 : h(Math.max(lx - 1, 0), lz) >= h(Math.min(lx + 1, 15), lz) + 4 ? 1 : 0; } return this._st === 1; },
        chunkHas(set) { let r = hasCache.get(set); if (r === undefined) { r = false; for (let i = 0; i < set.length; i++) if (set[i] && present[i]) { r = true; break; } hasCache.set(set, r); } return r; } };
      // present biomes: noise biomes on the quart grid around the chunk, at the heights the column spans
      { let hi = -INF, lo = INF; for (let j = 0; j < 256; j++) { hi = Math.max(hi, tops[j]); lo = Math.min(lo, tops[j]); } const deep = (lo - 16) >> 2;
        for (let qx = (bx >> 2) - 1; qx <= ((bx + 15) >> 2) + 1; qx++) for (let qz = (bz >> 2) - 1; qz <= ((bz + 15) >> 2) + 1; qz++) for (let qy = minY >> 2; qy <= (hi + 6) >> 2; qy++) { if (qy < deep && (qy & 1)) continue; present[this.noiseBiome(qx, qy, qz)] = 1; } }
      const I = (y, j) => (y - minY) * 256 + j; const STONE = 1; let uxz = 0, uy = 0;
      const eroded = this.biomeNames.indexOf('eroded_badlands'), frozen = this.biomeNames.indexOf('frozen_ocean'), dfrozen = this.biomeNames.indexOf('deep_frozen_ocean');
      for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
        const j = lz * 16 + lx, x = bx + lx, z = bz + lz; const hgt = tops[j] + 1;
        const colBiome = this.biomeAt(x, hgt, z);
        if (colBiome === eroded) { this.erodedBadlands(out, j, x, z, hgt); for (let y = this.maxY; y >= minY; y--) if (out[I(y, j)] !== 0) { tops[j] = y; break; } }
        uxz++; M.x = x; M.z = z; M.uxz = uxz; M._s2 = NaN; M._ms = NaN; M._st = -1;
        M.sd = Math.trunc(this.surfN.get(x, 0, z) * 2.75 + 3 + this.random.at1(x, 0, z).nextDouble() * 0.25);
        let above = 0, water = -2147483648, nextCeil = 2147483647;
        for (let y = Math.max(hgt, tops[j]); y >= minY; y--) {
          const c = out[I(y, j)];
          if (c === 0) { above = 0; water = -2147483648; continue; }
          if (c === 2 || c === 3) { if (water === -2147483648) water = y + 1; continue; }
          if (nextCeil >= y) { nextCeil = -32512; for (let s = y - 1; s >= minY - 1; s--) { const b = s < minY ? 1 : out[I(s, j)]; if (b === 0 || b === 2 || b === 3) { nextCeil = s + 1; break; } } }
          above++; const below = y - nextCeil + 1;
          uy++; M.y = y; M.uy = uy; M.above = above; M.below = below; M.water = water; M._b = -1;
          if (c === STONE) { const r = rule(M); if (r >= 0) out[I(y, j)] = r; }
        }
        if (colBiome === frozen || colBiome === dfrozen) this.frozenOcean(out, j, x, z, hgt, colBiome, M.minSurface());
      }
    }
    erodedBadlands(out, j, x, z, height) {
      const [sN, pN, rN] = this.bandsN; const e = Math.min(Math.abs(sN.get(x, 0, z) * 8.25), pN.get(x * 0.2, 0, z * 0.2) * 15); if (e <= 0) return;
      const g = Math.abs(rN.get(x * 0.75, 0, z * 0.75) * 1.5); const h = 64 + Math.min(e * e * 2.5, Math.ceil(g * 50) + 24); const i = Math.floor(h); if (height > i) return;
      const minY = this.minY; for (let y = i; y >= minY; y--) { const c = out[(y - minY) * 256 + j]; if (c === 1) break; if (c === 2) return; }
      for (let y = i; y >= minY && out[(y - minY) * 256 + j] === 0; y--) out[(y - minY) * 256 + j] = 1;
    }
    frozenOcean(out, j, x, z, height, b, minSurface) {
      const [sN, pN, rN] = this.bergN; const e = Math.min(Math.abs(sN.get(x, 0, z) * 8.25), pN.get(x * 1.28, 0, z * 1.28) * 15); if (e <= 1.8) return;
      const h = Math.abs(rN.get(x * 1.17, 0, z * 1.17) * 1.5); let i = Math.min(e * e * 1.2, Math.ceil(h * 40) + 14); const sea = this.sea;
      if (this.temperature(b, x, sea, z) > 0.1) i -= 2;
      let lo; if (i > 2) { lo = sea - i - 7; i += sea; } else { i = 0; lo = 0; }
      const r = this.random.at(x, 0, z); const snowMax = 2 + r.nextInt(4), snowMin = sea + 18 + r.nextInt(10); let n = 0; const minY = this.minY;
      const SNOW = this.blk('snow_block'), PACKED = this.blk('packed_ice');
      for (let o = Math.max(height, Math.trunc(i) + 1); o >= minSurface; o--) { const k = (o - minY) * 256 + j; if (o < minY || o > this.maxY) continue; const c = out[k];
        if ((c === 0 && o < Math.trunc(i) && r.nextDouble() > 0.01) || (c === 2 && o > Math.trunc(lo) && o < sea && lo !== 0 && r.nextDouble() > 0.15)) { if (n <= snowMax && o > snowMin) { out[k] = SNOW; n++; } else out[k] = PACKED; } }
    }
  }
  return { setSplineDouble: (v) => { SPLINE_DOUBLE = v; }, Generator, Rng, PosRng, md5, sha256, biomeParams, normalNoise, getSeed: (x, y, z) => { getSeed(x, y, z); return [RH, RL]; } };
}
const MCT = mctFactory();
if (typeof module !== 'undefined' && module.exports) module.exports = MCT;

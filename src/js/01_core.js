'use strict';
// ================= CORE: utils, noise, textures, blocks, items =================
const CS = 16, WH = 96, SEA = 32;
const V3 = THREE.Vector3;
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function smoothstep(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function lerp(t, a, b) { return a + t * (b - a); }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function ihash(a, b, c, d) {
  let h = (d | 0) ^ 0x9E3779B9;
  h = Math.imul(h ^ (a | 0), 0x85EBCA6B); h = (h << 13) | (h >>> 19);
  h = Math.imul(h ^ (b | 0), 0xC2B2AE35); h = (h << 13) | (h >>> 19);
  h = Math.imul(h ^ (c | 0), 0x27D4EB2F); h ^= h >>> 15; h = Math.imul(h, 0x85EBCA6B); h ^= h >>> 13;
  return h >>> 0;
}
function rnd01(a, b, c, d) { return ihash(a, b, c, d) / 4294967296; }
function grad(h, x, y, z) { h &= 15; const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z); return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); }
class Perlin {
  constructor(seed) {
    const r = mulberry32(seed); const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    this.p = new Uint8Array(512); for (let i = 0; i < 512; i++) this.p[i] = p[i & 255];
  }
  n3(x, y, z) {
    const p = this.p; let X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    x -= X; y -= Y; z -= Z; X &= 255; Y &= 255; Z &= 255;
    const u = x * x * x * (x * (x * 6 - 15) + 10), v = y * y * y * (y * (y * 6 - 15) + 10), w = z * z * z * (z * (z * 6 - 15) + 10);
    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z, B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
    return lerp(w, lerp(v, lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)), lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))),
      lerp(v, lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)), lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))));
  }
  n2(x, y) { return this.n3(x, y, 0.37); }
  f2(x, y, o) { let a = 1, f = 1, s = 0, n = 0; for (let i = 0; i < o; i++) { s += a * this.n2(x * f, y * f); n += a; a *= 0.5; f *= 2.03; } return s / n; }
}

// ---------------- Texture atlas ----------------
const ATN = 16;
const atlasCanvas = document.createElement('canvas'); atlasCanvas.width = atlasCanvas.height = ATN * 16;
const actx = atlasCanvas.getContext('2d');
const TILE = {}; let tileCount = 0; const TILE_AVG = [];
const vary = (c, r, v) => { const f = (r() * 2 - 1) * v; return [c[0] + f, c[1] + f, c[2] + f]; };
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function makeTile(name, painter) {
  const re = TILE[name] !== undefined; const i = re ? TILE[name] : tileCount++; TILE[name] = i;
  const img = actx.createImageData(16, 16); const d = img.data;
  const r = mulberry32(i * 7919 + 1337 + (re ? 4242 : 0));
  const set = (x, y, c, a = 255) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x > 15 || y > 15) return; const k = (y * 16 + x) * 4; d[k] = clamp(c[0], 0, 255); d[k + 1] = clamp(c[1], 0, 255); d[k + 2] = clamp(c[2], 0, 255); d[k + 3] = a; };
  const get = (x, y) => { const k = (y * 16 + x) * 4; return [d[k], d[k + 1], d[k + 2], d[k + 3]]; };
  painter(set, r, get);
  actx.putImageData(img, (i % ATN) * 16, Math.floor(i / ATN) * 16);
  let s = [0, 0, 0], n = 0; for (let k = 0; k < 1024; k += 4) if (d[k + 3] > 0) { s[0] += d[k]; s[1] += d[k + 1]; s[2] += d[k + 2]; n++; }
  TILE_AVG[i] = n ? [s[0] / n / 255, s[1] / n / 255, s[2] / n / 255] : [1, 1, 1];
  return i;
}
const each = (fn) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) fn(x, y); };
const clear = (set) => each((x, y) => set(x, y, [0, 0, 0], 0));
function pLine(set, x0, y0, x1, y1, col) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0; for (let i = 0; i <= n; i++) { const t = n ? i / n : 0; set(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), typeof col === 'function' ? col(i) : col); } }
const C_DIRT = [134, 96, 67], C_GRASS = [92, 154, 52];
function pDirt(set, r) { each((x, y) => { let c = vary(C_DIRT, r, 12); const q = r(); if (q < 0.12) c = vary([104, 72, 48], r, 6); else if (q < 0.19) c = vary([158, 118, 84], r, 6); set(x, y, c); }); }
function pStone(set, r) {
  each((x, y) => { let c = vary([126, 126, 126], r, 9); const q = r(); if (q < 0.1) c = vary([104, 104, 104], r, 5); else if (q < 0.15) c = vary([148, 148, 148], r, 5); set(x, y, c); });
  for (let k = 0; k < 6; k++) { const x = r() * 16 | 0, y = r() * 16 | 0, l = 2 + r() * 3 | 0; for (let i = 0; i < l; i++) set(x + i, y, vary([102, 102, 102], r, 4)); }
}
function pCobble(set, r, moss) {
  const pts = []; for (let i = 0; i < 10; i++) pts.push([r() * 16, r() * 16, 92 + r() * 55]);
  each((x, y) => {
    let d1 = 1e9, d2 = 1e9, c1 = 0;
    for (const p of pts) for (let ox = -16; ox <= 16; ox += 16) for (let oy = -16; oy <= 16; oy += 16) {
      const d = (x - p[0] - ox) ** 2 + (y - p[1] - oy) ** 2; if (d < d1) { d2 = d1; d1 = d; c1 = p[2]; } else if (d < d2) d2 = d;
    }
    const e = Math.sqrt(d2) - Math.sqrt(d1); let c;
    if (e < 1.0) c = vary([62, 62, 62], r, 6); else { const g = c1 + (e < 2 ? -14 : 0); c = vary([g, g, g], r, 7); }
    if (moss && r() < 0.42 * (0.5 + Math.sin(x * 0.6 + y * 0.45) * 0.5)) c = vary([78, 116, 52], r, 12);
    set(x, y, c);
  });
}
function pPlanks(set, r, base) {
  for (let y = 0; y < 16; y++) { const band = y >> 2; const off = (band * 7 + 3) % 16; for (let x = 0; x < 16; x++) { let c = vary(base, r, 7); if ((y & 3) === 3) c = mixc(base, [0, 0, 0], 0.38); else if (x === off) c = mixc(base, [0, 0, 0], 0.3); else if (r() < 0.06) c = mixc(base, [0, 0, 0], 0.15); set(x, y, c); } }
}
function pLogSide(set, r, base, dark) { for (let x = 0; x < 16; x++) { const s = r(); for (let y = 0; y < 16; y++) { let c = vary(mixc(base, dark, (x % 4 === 0 ? 0.55 : 0) + s * 0.25), r, 5); if (r() < 0.05) c = mixc(base, dark, 0.8); set(x, y, c); } } }
function pLogTop(set, r, inner, ring, bark) { each((x, y) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); set(x, y, d > 6.5 ? vary(bark, r, 6) : vary((Math.floor(d) % 2) ? ring : inner, r, 5)); }); }
function pLeaves(set, r, base) { each((x, y) => { if (r() < 0.2) { set(x, y, [0, 0, 0], 0); return; } let c = vary(base, r, 20); if (r() < 0.22) c = mixc(c, [0, 0, 0], 0.3); set(x, y, c); }); }
function pOre(set, r, col, hi) { pStone(set, r); for (let k = 0; k < 5; k++) { const cx = 2 + r() * 12 | 0, cy = 2 + r() * 12 | 0; const n = 3 + r() * 3 | 0; for (let i = 0; i < n; i++) { const x = cx + (r() * 3 | 0) - 1, y = cy + (r() * 3 | 0) - 1; set(x, y, r() < 0.35 ? hi : vary(col, r, 10)); } } }
function pBricks(set, r, base, mort, bw, bh) { each((x, y) => { const row = Math.floor(y / bh); const m = (y % bh) === bh - 1 || ((x + (row % 2) * (bw / 2)) % bw) === bw - 1; set(x, y, m ? vary(mort, r, 6) : vary(base, r, 10)); }); }
function pFlower(set, r, pet, ctr) {
  clear(set); const G = [52, 125, 38];
  for (let y = 8; y < 16; y++) set(7, y, G); set(6, 12, G); set(5, 11, G); set(8, 11, G); set(9, 10, G);
  for (const [x, y] of [[7, 4], [6, 5], [8, 5], [5, 6], [9, 6], [6, 7], [8, 7], [7, 8], [7, 5], [7, 7], [6, 6], [8, 6]]) set(x, y, vary(pet, r, 14));
  set(7, 6, ctr);
}
// --- block tiles ---
makeTile('dirt', pDirt);
makeTile('grass_top', (set, r) => each((x, y) => { let c = vary(C_GRASS, r, 16); if (r() < 0.16) c = vary([72, 126, 40], r, 7); set(x, y, c); }));
makeTile('grass_side', (set, r) => { pDirt(set, r); for (let x = 0; x < 16; x++) { const dp = 2 + Math.floor(r() * 3); for (let y = 0; y < dp; y++) set(x, y, vary(C_GRASS, r, 14)); if (r() < 0.35) set(x, dp, vary([74, 128, 42], r, 6)); } });
makeTile('stone', pStone);
makeTile('sand', (set, r) => each((x, y) => { let c = vary([219, 207, 163], r, 9); if (r() < 0.08) c = vary([196, 182, 140], r, 6); set(x, y, c); }));
makeTile('water', (set, r) => each((x, y) => { let c = vary([44, 92, 210], r, 7); if (((x + y * 3 + Math.round(Math.sin(y * 0.8) * 2)) & 7) === 0) c = [86, 138, 236]; set(x, y, c); }));
makeTile('log_side', (set, r) => pLogSide(set, r, [104, 82, 50], [66, 50, 30]));
makeTile('log_top', (set, r) => pLogTop(set, r, [168, 136, 84], [140, 110, 66], [104, 82, 50]));
makeTile('leaves', (set, r) => pLeaves(set, r, [58, 134, 38]));
makeTile('planks', (set, r) => pPlanks(set, r, [164, 132, 80]));
makeTile('cobble', (set, r) => pCobble(set, r, false));
makeTile('glass', (set, r) => each((x, y) => { const e = x === 0 || y === 0 || x === 15 || y === 15; if (e) set(x, y, [214, 236, 246]); else if ((x - y === 4 || x - y === 5 || x - y === -6) && x > 2 && x < 13) set(x, y, [250, 255, 255]); else set(x, y, [0, 0, 0], 0); }));
makeTile('brick', (set, r) => pBricks(set, r, [152, 70, 54], [176, 166, 156], 8, 4));
makeTile('coal_ore', (set, r) => pOre(set, r, [38, 38, 38], [70, 70, 70]));
makeTile('iron_ore', (set, r) => pOre(set, r, [200, 160, 128], [228, 196, 170]));
makeTile('gold_ore', (set, r) => pOre(set, r, [236, 204, 44], [255, 246, 140]));
makeTile('diamond_ore', (set, r) => pOre(set, r, [80, 220, 214], [200, 255, 250]));
makeTile('snow', (set, r) => each((x, y) => set(x, y, vary([240, 248, 252], r, 4))));
makeTile('snow_side', (set, r) => { pDirt(set, r); for (let x = 0; x < 16; x++) { const dp = 3 + Math.floor(r() * 3); for (let y = 0; y < dp; y++) set(x, y, vary([240, 248, 252], r, 4)); } });
makeTile('bedrock', (set, r) => each((x, y) => { const P = [[40, 40, 40], [86, 86, 86], [60, 60, 60], [118, 118, 118]]; set(x, y, vary(P[r() * 4 | 0], r, 6)); }));
makeTile('table_top', (set, r) => { pPlanks(set, r, [150, 112, 66]); each((x, y) => { if (x === 0 || y === 0 || x === 15 || y === 15 || x === 5 || x === 10 || y === 5 || y === 10) set(x, y, [92, 64, 36]); }); });
makeTile('table_side', (set, r) => { pPlanks(set, r, [150, 112, 66]); for (let x = 0; x < 16; x++) { set(x, 0, [92, 64, 36]); set(x, 1, [110, 78, 44]); }
  for (let y = 4; y < 11; y++) { set(3, y, [90, 90, 90]); set(4, y, [120, 120, 120]); } for (let x = 2; x < 6; x++) set(x, 4, [70, 70, 70]);
  for (let y = 6; y < 13; y++) set(11, y, [100, 74, 44]); for (let x = 9; x < 14; x++) { set(x, 5, [110, 110, 110]); set(x, 6, [140, 140, 140]); } });
makeTile('chest_side', (set, r) => each((x, y) => { let c = vary([158, 106, 46], r, 8); if (x === 0 || x === 15 || y === 0 || y === 15) c = [72, 46, 18]; else if (y === 5) c = [90, 58, 24]; set(x, y, c); }));
makeTile('chest_front', (set, r) => each((x, y) => { let c = vary([158, 106, 46], r, 8); if (x === 0 || x === 15 || y === 0 || y === 15) c = [72, 46, 18]; else if (y === 5) c = [90, 58, 24]; if (x >= 7 && x <= 8 && y >= 4 && y <= 7) c = (y === 7 || y === 4) ? [70, 70, 70] : [200, 200, 205]; set(x, y, c); }));
makeTile('chest_top', (set, r) => each((x, y) => { let c = vary([158, 106, 46], r, 8); if (x === 0 || x === 15 || y === 0 || y === 15) c = [72, 46, 18]; set(x, y, c); }));
makeTile('gravel', (set, r) => { const cells = []; for (let i = 0; i < 64; i++) cells.push([[120, 112, 108], [96, 92, 90], [140, 130, 126], [80, 76, 74]][r() * 4 | 0]); each((x, y) => set(x, y, vary(cells[(y >> 1) * 8 + (x >> 1)], r, 9))); });
makeTile('cactus_side', (set, r) => each((x, y) => { let c = vary([70, 138, 46], r, 8); if (x === 0 || x === 15) c = [40, 92, 30]; else if (x % 5 === 2) c = vary([52, 112, 36], r, 5); if ((x % 5 === 2) && (y % 4 === 1)) c = [26, 40, 18]; set(x, y, c); }));
makeTile('cactus_top', (set, r) => each((x, y) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); set(x, y, d > 6.5 ? [40, 92, 30] : vary(d > 4 ? [70, 138, 46] : [110, 170, 80], r, 6)); }));
makeTile('mossy', (set, r) => pCobble(set, r, true));
makeTile('bookshelf', (set, r) => { pPlanks(set, r, [164, 132, 80]); const cols = [[160, 40, 40], [40, 80, 160], [50, 130, 60], [170, 140, 50], [120, 60, 140], [90, 60, 40]];
  for (const [y0, y1] of [[2, 6], [9, 13]]) { let x = 1; while (x < 15) { const w = 1 + (r() * 2 | 0), c = cols[r() * cols.length | 0], top = y0 + (r() * 2 | 0); for (let i = 0; i < w && x < 15; i++, x++) for (let y = top; y <= y1; y++) set(x, y, vary(c, r, 8)); } } });
makeTile('tnt_side', (set, r) => { const T = ['111', '010', '010', '010', '010'], N = ['101', '111', '111', '101', '101'];
  each((x, y) => { let c = (y < 5 || y > 10) ? vary(x % 4 === 0 ? [150, 34, 26] : [196, 48, 38], r, 6) : [234, 232, 228]; set(x, y, c); });
  const draw = (G, ox) => { for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (G[j][i] === '1') set(ox + i, 6 + j, [30, 30, 30]); }; draw(T, 2); draw(N, 6.5); draw(T, 11); });
makeTile('tnt_top', (set, r) => each((x, y) => { const e = x < 2 || y < 2 || x > 13 || y > 13; let c = e ? [196, 48, 38] : vary([200, 200, 196], r, 6); if (x >= 7 && x <= 8 && y >= 7 && y <= 8) c = [50, 50, 50]; set(x, y, c); }));
makeTile('tnt_bottom', (set, r) => each((x, y) => set(x, y, vary([176, 44, 36], r, 8))));
makeTile('sandstone', (set, r) => each((x, y) => { let c = vary([218, 205, 158], r, 5); if (y < 3) c = vary([228, 216, 172], r, 4); else if (y > 12) c = vary([198, 182, 132], r, 5); else if (y === 3 || y === 12) c = [190, 175, 126]; set(x, y, c); }));
makeTile('sandstone_top', (set, r) => each((x, y) => set(x, y, vary([222, 210, 162], r, 5))));
makeTile('wool', (set, r) => each((x, y) => { let c = vary([236, 238, 238], r, 5); if (((x + y) % 5) === 0) c = mixc(c, [180, 180, 180], 0.3); set(x, y, c); }));
makeTile('glowstone', (set, r) => { const cell = []; for (let i = 0; i < 64; i++) cell.push(r()); each((x, y) => { const v = cell[(y >> 1) * 8 + (x >> 1)]; const c = v < 0.28 ? [150, 104, 46] : v < 0.62 ? [228, 176, 86] : [255, 234, 160]; set(x, y, vary(c, r, 8)); }); });
makeTile('furnace_front', (set, r) => each((x, y) => { let c = vary([118, 118, 118], r, 8); if (x === 0 || y === 0 || x === 15 || y === 15) c = [80, 80, 80]; if (x >= 3 && x <= 12 && y >= 8 && y <= 13) c = (y === 13) ? [230, 120, 30] : (y === 12 ? [140, 60, 20] : [26, 26, 26]); if (y === 7 && x >= 3 && x <= 12) c = [70, 70, 70]; set(x, y, c); }));
makeTile('furnace_side', (set, r) => each((x, y) => { let c = vary([118, 118, 118], r, 8); if (x === 0 || y === 0 || x === 15 || y === 15) c = [80, 80, 80]; set(x, y, c); }));
makeTile('birch_side', (set, r) => { each((x, y) => set(x, y, vary([216, 214, 204], r, 6))); for (let k = 0; k < 12; k++) { const y = r() * 16 | 0, x0 = r() * 14 | 0, l = 1 + r() * 4 | 0; for (let i = 0; i < l; i++) set(x0 + i, y, [44, 44, 40]); } });
makeTile('birch_top', (set, r) => pLogTop(set, r, [206, 186, 134], [184, 164, 116], [216, 214, 204]));
makeTile('birch_leaves', (set, r) => pLeaves(set, r, [112, 160, 68]));
makeTile('spruce_side', (set, r) => pLogSide(set, r, [72, 50, 30], [46, 32, 18]));
makeTile('spruce_top', (set, r) => pLogTop(set, r, [124, 94, 58], [102, 76, 46], [72, 50, 30]));
makeTile('spruce_leaves', (set, r) => pLeaves(set, r, [44, 92, 56]));
makeTile('tall_grass', (set, r) => { clear(set); for (let b = 0; b < 8; b++) { let x = 1 + r() * 14; const h = 5 + r() * 9 | 0; const lean = (r() - 0.5) * 0.35; for (let i = 0; i < h; i++) { set(Math.round(x), 15 - i, vary([84, 152, 52], r, 18)); x += lean; } } });
makeTile('flower_red', (set, r) => pFlower(set, r, [212, 34, 30], [250, 210, 60]));
makeTile('flower_yellow', (set, r) => pFlower(set, r, [246, 214, 40], [200, 120, 20]));
makeTile('dead_bush', (set, r) => { clear(set); const C = [120, 82, 40]; pLine(set, 7, 15, 7, 8, C); pLine(set, 7, 10, 3, 5, C); pLine(set, 7, 11, 12, 4, C); pLine(set, 5, 7, 5, 3, C); pLine(set, 10, 6, 13, 6, C); pLine(set, 7, 8, 8, 3, C); });
makeTile('torch', (set, r) => { clear(set); for (let y = 8; y < 16; y++) { set(7, y, [128, 96, 54]); set(8, y, [100, 74, 40]); } set(7, 6, [255, 236, 120]); set(8, 6, [255, 210, 80]); set(7, 7, [255, 170, 50]); set(8, 7, [240, 140, 40]); });
makeTile('spawner', (set, r) => each((x, y) => { if (x % 5 === 0 || y % 5 === 0 || x === 15 || y === 15) set(x, y, vary([36, 48, 64], r, 6)); else set(x, y, [0, 0, 0], 0); }));
makeTile('stone_bricks', (set, r) => each((x, y) => { const row = y >> 3; const m = (y & 7) === 7 || ((x + row * 8) & 15) === 15 || ((x + row * 8) & 15) === 7 && false; let c = m ? vary([84, 84, 84], r, 4) : vary([124, 124, 124], r, 7); if (!m && ((y & 7) === 0)) c = vary([140, 140, 140], r, 4); set(x, y, c); }));
// --- nether & end tiles ---
function pNetherrack(set, r) { each((x, y) => { let c = vary([112, 48, 46], r, 10); const q = r(); if (q < 0.18) c = vary([84, 32, 32], r, 6); else if (q < 0.26) c = vary([140, 66, 62], r, 6); set(x, y, c); }); }
makeTile('obsidian', (set, r) => each((x, y) => { let c = vary([22, 16, 34], r, 5); const q = r(); if (q < 0.1) c = vary([60, 38, 96], r, 8); else if (q < 0.16) c = [8, 6, 14]; set(x, y, c); }));
makeTile('netherrack', pNetherrack);
makeTile('soul_sand', (set, r) => { each((x, y) => set(x, y, vary([86, 66, 52], r, 8))); for (let k = 0; k < 4; k++) { const cx = 2 + r() * 11 | 0, cy = 2 + r() * 11 | 0; set(cx, cy, [50, 36, 28]); set(cx + 2, cy, [50, 36, 28]); set(cx + 1, cy + 2, [44, 30, 24]); set(cx, cy + 2, [58, 42, 32]); set(cx + 2, cy + 2, [58, 42, 32]); } });
makeTile('quartz_ore', (set, r) => { pNetherrack(set, r); for (let k = 0; k < 6; k++) { const x = 1 + r() * 13 | 0, y = 1 + r() * 13 | 0; set(x, y, [240, 236, 228]); set(x + 1, y, [214, 206, 196]); if (r() < 0.5) set(x, y + 1, [228, 222, 212]); } });
makeTile('nether_gold_ore', (set, r) => { pNetherrack(set, r); for (let k = 0; k < 7; k++) { const x = 1 + r() * 13 | 0, y = 1 + r() * 13 | 0; set(x, y, [250, 214, 60]); if (r() < 0.6) set(x + 1, y, [220, 170, 30]); } });
makeTile('nether_bricks', (set, r) => pBricks(set, r, [62, 30, 36], [28, 12, 16], 8, 4));
makeTile('magma', (set, r) => { const cell = []; for (let i = 0; i < 64; i++) cell.push(r()); each((x, y) => { const v = cell[(y >> 1) * 8 + (x >> 1)]; set(x, y, v < 0.25 ? vary([255, 140, 30], r, 15) : v < 0.4 ? vary([200, 70, 20], r, 10) : vary([70, 26, 16], r, 8)); }); });
makeTile('crimson_nylium', (set, r) => each((x, y) => { let c = vary([146, 26, 30], r, 14); if (r() < 0.15) c = vary([190, 50, 40], r, 8); set(x, y, c); }));
makeTile('crimson_nylium_side', (set, r) => { pNetherrack(set, r); for (let x = 0; x < 16; x++) { const dp = 2 + Math.floor(r() * 3); for (let y = 0; y < dp; y++) set(x, y, vary([146, 26, 30], r, 12)); } });
makeTile('warped_nylium', (set, r) => each((x, y) => { let c = vary([34, 118, 108], r, 12); if (r() < 0.15) c = vary([60, 160, 140], r, 8); set(x, y, c); }));
makeTile('warped_nylium_side', (set, r) => { pNetherrack(set, r); for (let x = 0; x < 16; x++) { const dp = 2 + Math.floor(r() * 3); for (let y = 0; y < dp; y++) set(x, y, vary([34, 118, 108], r, 12)); } });
makeTile('crimson_stem', (set, r) => pLogSide(set, r, [124, 46, 66], [76, 24, 40]));
makeTile('crimson_stem_top', (set, r) => pLogTop(set, r, [170, 70, 80], [140, 50, 64], [124, 46, 66]));
makeTile('warped_stem', (set, r) => pLogSide(set, r, [52, 96, 100], [30, 160, 140]));
makeTile('warped_stem_top', (set, r) => pLogTop(set, r, [70, 140, 130], [50, 110, 104], [52, 96, 100]));
makeTile('nether_wart', (set, r) => each((x, y) => { let c = vary([128, 18, 18], r, 14); if (r() < 0.2) c = vary([90, 8, 10], r, 6); set(x, y, c); }));
makeTile('warped_wart', (set, r) => each((x, y) => { let c = vary([22, 124, 116], r, 14); if (r() < 0.2) c = vary([14, 90, 86], r, 6); set(x, y, c); }));
makeTile('shroomlight', (set, r) => { const cell = []; for (let i = 0; i < 64; i++) cell.push(r()); each((x, y) => { const v = cell[(y >> 1) * 8 + (x >> 1)]; set(x, y, vary(v < 0.3 ? [214, 110, 40] : v < 0.7 ? [246, 160, 70] : [255, 216, 130], r, 8)); }); });
makeTile('crimson_fungus', (set, r) => { clear(set); for (let y = 9; y < 16; y++) set(7, y, [200, 160, 120]); for (let x = 3; x <= 11; x++) for (let y = 4; y <= 8; y++) if (Math.abs(x - 7) + (8 - y) * 1.2 < 6) set(x, y, vary([180, 30, 34], r, 15)); set(5, 6, [250, 200, 90]); set(9, 5, [250, 200, 90]); });
makeTile('warped_fungus', (set, r) => { clear(set); for (let y = 9; y < 16; y++) set(7, y, [200, 160, 120]); for (let x = 3; x <= 11; x++) for (let y = 4; y <= 8; y++) if (Math.abs(x - 7) + (8 - y) * 1.2 < 6) set(x, y, vary([30, 150, 130], r, 15)); set(6, 5, [250, 140, 40]); set(9, 6, [250, 140, 40]); });
makeTile('crimson_roots', (set, r) => { clear(set); for (let b = 0; b < 7; b++) { let x = 2 + r() * 12; const h = 4 + r() * 8 | 0; for (let i = 0; i < h; i++) { set(Math.round(x), 15 - i, vary([170, 30, 50], r, 20)); x += (r() - 0.5) * 0.6; } } });
makeTile('warped_roots', (set, r) => { clear(set); for (let b = 0; b < 7; b++) { let x = 2 + r() * 12; const h = 4 + r() * 8 | 0; for (let i = 0; i < h; i++) { set(Math.round(x), 15 - i, vary([30, 160, 140], r, 20)); x += (r() - 0.5) * 0.6; } } });
makeTile('lava', (set, r) => { const cell = []; for (let i = 0; i < 64; i++) cell.push(r()); each((x, y) => { const v = cell[(y >> 1) * 8 + ((x + (y >> 2)) & 15) / 2 | 0]; set(x, y, vary(v < 0.3 ? [190, 70, 10] : v < 0.75 ? [236, 110, 20] : [255, 196, 70], r, 10)); }); });
makeTile('portal', (set, r) => each((x, y) => { const v = Math.sin(x * 0.9 + y * 0.4) + Math.sin(y * 0.7 - x * 0.3) + r() * 0.8; set(x, y, v > 1.1 ? [196, 120, 255] : v > 0.2 ? [130, 50, 220] : [84, 20, 160]); }));
makeTile('end_stone', (set, r) => each((x, y) => { let c = vary([222, 224, 166], r, 7); const q = r(); if (q < 0.12) c = vary([196, 196, 140], r, 5); else if (q < 0.16) c = [176, 174, 120]; set(x, y, c); }));
makeTile('end_frame_side', (set, r) => each((x, y) => { let c = y < 4 ? vary([46, 90, 82], r, 8) : vary([210, 214, 160], r, 7); if (y === 4) c = [30, 60, 54]; set(x, y, c); }));
makeTile('end_frame_top', (set, r) => each((x, y) => { const e = x < 2 || y < 2 || x > 13 || y > 13; const hole = x > 4 && x < 11 && y > 4 && y < 11; set(x, y, e ? vary([210, 214, 160], r, 6) : hole ? [20, 30, 30] : vary([46, 96, 86], r, 8)); }));
makeTile('end_frame_top_eye', (set, r) => each((x, y) => { const e = x < 2 || y < 2 || x > 13 || y > 13; const d = Math.hypot(x - 7.5, y - 7.5); set(x, y, e ? vary([210, 214, 160], r, 6) : d < 2 ? [10, 30, 20] : d < 3.6 ? [60, 200, 140] : vary([46, 96, 86], r, 8)); }));
makeTile('end_portal', (set, r) => each((x, y) => { const q = r(); set(x, y, q < 0.06 ? [120, 220, 210] : q < 0.1 ? [180, 120, 255] : q < 0.13 ? [255, 255, 255] : vary([10, 14, 20], r, 4)); }));
makeTile('dragon_egg', (set, r) => each((x, y) => { let c = vary([20, 10, 26], r, 5); if (r() < 0.12) c = vary([90, 40, 130], r, 10); set(x, y, c); }));
makeTile('quartz_block', (set, r) => each((x, y) => set(x, y, vary([236, 230, 222], r, 4))));
makeTile('sugar_cane', (set, r) => { clear(set); for (const cx of [3, 8, 12]) { for (let y = 0; y < 16; y++) { const j = (y + cx) % 5 === 0; set(cx, y, j ? [150, 196, 110] : vary([118, 172, 82], r, 10)); set(cx + 1, y, j ? [120, 160, 90] : vary([92, 146, 62], r, 8)); } set(cx - 1, (cx * 3) % 14 + 1, [110, 170, 80]); set(cx + 2, (cx * 5) % 13 + 2, [100, 160, 70]); } });
makeTile('lapis_ore', (set, r) => pOre(set, r, [36, 70, 190], [80, 130, 236]));
makeTile('lapis_block', (set, r) => each((x, y) => { let c = vary([34, 66, 170], r, 10); if (r() < 0.15) c = vary([70, 110, 220], r, 8); if (x === 0 || y === 0 || x === 15 || y === 15) c = [24, 44, 120]; set(x, y, c); }));
makeTile('ench_top', (set, r) => each((x, y) => { const e = x < 2 || y < 2 || x > 13 || y > 13; let c = e ? vary([40, 20, 30], r, 6) : vary([150, 30, 40], r, 12); if (!e && (x === 7 || x === 8) && y > 3 && y < 12) c = [230, 220, 200]; if (!e && y > 4 && y < 11 && (x === 6 || x === 9)) c = [200, 190, 170]; set(x, y, c); }));
makeTile('ench_side', (set, r) => each((x, y) => { let c = y < 4 ? vary([150, 30, 40], r, 10) : vary([28, 22, 36], r, 6); if (y === 4) c = [60, 20, 30]; if (y > 6 && r() < 0.05) c = [80, 220, 200]; set(x, y, c); }));
makeTile('path_top', (set, r) => each((x, y) => { let c = vary([148, 120, 70], r, 9); if (r() < 0.12) c = vary([124, 98, 56], r, 6); else if (r() < 0.06) c = vary([170, 144, 92], r, 5); set(x, y, c); }));
makeTile('path_side', (set, r) => each((x, y) => set(x, y, y < 2 ? vary([148, 120, 70], r, 8) : vary([134, 96, 67], r, 12))));
makeTile('farmland', (set, r) => each((x, y) => { let c = vary([92, 62, 38], r, 8); if (y % 4 === 0) c = vary([70, 46, 28], r, 5); if (x === 0 || x === 15) c = [80, 54, 32]; set(x, y, c); }));
for (let st = 0; st < 4; st++) makeTile('wheat' + st, (set, r) => { clear(set); const H = 4 + st * 3.6; const col = st < 3 ? [70 + st * 20, 150 - st * 6, 40] : [196, 170, 70]; for (const cx of [2, 5, 8, 11, 14]) { const h = Math.round(H - r() * 2); for (let y = 0; y < h; y++) set(cx + (y > h - 3 && st === 3 ? (cx % 2) : 0), 15 - y, vary(y > h - 4 && st === 3 ? [214, 186, 90] : col, r, 10)); if (st === 3) { set(cx - 1, 15 - h + 1, [180, 150, 60]); set(cx + 1, 15 - h + 2, [180, 150, 60]); } } });
makeTile('hay_side', (set, r) => each((x, y) => { let c = vary([196, 160, 52], r, 12); if (y === 3 || y === 12) c = [120, 70, 30]; if (x % 3 === 0 && y !== 3 && y !== 12) c = vary([170, 136, 40], r, 8); set(x, y, c); }));
makeTile('hay_top', (set, r) => each((x, y) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); set(x, y, vary(d > 6.5 ? [120, 70, 30] : (Math.floor(d) % 2 ? [176, 140, 40] : [206, 170, 62]), r, 8)); }));
makeTile('bed_head_top', (set, r) => each((x, y) => { const pil = y < 9 && x > 1 && x < 14 && y > 1; let c = pil ? vary([236, 236, 230], r, 5) : vary([176, 36, 36], r, 9); if (pil && (y === 2 || x === 2 || x === 13)) c = [214, 214, 206]; if (!pil && (x === 0 || x === 15)) c = [140, 26, 26]; set(x, y, c); }));
makeTile('bed_foot_top', (set, r) => each((x, y) => { let c = vary([176, 36, 36], r, 9); if (x === 0 || x === 15) c = [140, 26, 26]; if (y % 5 === 0) c = vary([196, 50, 50], r, 6); set(x, y, c); }));
makeTile('bed_side', (set, r) => each((x, y) => { if (y < 7) { set(x, y, [0, 0, 0], 0); return; } let c = y < 11 ? vary([176, 36, 36], r, 8) : y < 13 ? vary([164, 132, 80], r, 8) : vary([130, 100, 60], r, 6); if (y === 7) c = [196, 56, 56]; if (y === 10) c = [140, 26, 26]; set(x, y, c, (y >= 13 && x >= 3 && x <= 12) ? 0 : 255); }));
makeTile('ench_bottom', (set, r) => each((x, y) => set(x, y, vary([22, 18, 30], r, 6))));

// crack overlays
const crackTex = [];
for (let s = 0; s < 6; s++) {
  const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'); const r = mulberry32(99);
  x.fillStyle = 'rgba(0,0,0,0.75)';
  const lines = []; for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2; lines.push([8, 8, a, 2 + r() * 7]); }
  for (let i = 0; i < Math.round((s + 1) * 2.3); i++) { const L = lines[i]; let px = L[0], py = L[1]; for (let k = 0; k < L[3] * (0.5 + s * 0.12); k++) { px += Math.cos(L[2]) + (r() - 0.5) * 0.6; py += Math.sin(L[2]) + (r() - 0.5) * 0.6; x.fillRect(Math.floor(px), Math.floor(py), 1, 1); } }
  crackTex.push(c);
}

// ---------------- Blocks ----------------
const BL = []; const B = {};
function tx(t) { if (typeof t === 'string') return [t, t, t, t, t, t]; if (Array.isArray(t)) return t; const s = t.s, tp = t.t || s, b = t.b || tp; return [t.px || s, t.nx || s, tp, b, t.pz || s, t.nz || s]; }
function defBlock(key, name, o) {
  const id = BL.length;
  const d = Object.assign({ id, key, name, solid: true, opaque: true, render: 'cube', hardness: 1, tool: null, tier: 0, light: 0, cullSame: false, drop: key, snd: 'stone' }, o);
  d.texIds = d.tex ? tx(d.tex).map(n => { if (TILE[n] === undefined) throw new Error('tile ' + n); return TILE[n]; }) : null;
  BL.push(d); B[key.toUpperCase()] = id; return id;
}
defBlock('air', 'Air', { solid: false, opaque: false, render: 'none', hardness: 0, drop: null });
defBlock('grass', 'Grass Block', { tex: { s: 'grass_side', t: 'grass_top', b: 'dirt' }, hardness: 0.6, drop: 'dirt', snd: 'grass' });
defBlock('dirt', 'Dirt', { tex: 'dirt', hardness: 0.5, snd: 'grass' });
defBlock('stone', 'Stone', { tex: 'stone', hardness: 1.5, tool: 'pick', tier: 1, drop: 'cobblestone' });
defBlock('sand', 'Sand', { tex: 'sand', hardness: 0.5, snd: 'sand' });
defBlock('water', 'Water', { tex: 'water', solid: false, opaque: false, render: 'water', hardness: -1, drop: null });
defBlock('log', 'Oak Log', { tex: { s: 'log_side', t: 'log_top' }, hardness: 2, snd: 'wood' });
defBlock('leaves', 'Oak Leaves', { tex: 'leaves', opaque: false, render: 'cutout', cullSame: true, hardness: 0.2, snd: 'grass', drop: (r) => r < 0.06 ? ['apple', 1] : r < 0.12 ? ['stick', 1] : null });
defBlock('planks', 'Oak Planks', { tex: 'planks', hardness: 2, snd: 'wood' });
defBlock('cobblestone', 'Cobblestone', { tex: 'cobble', hardness: 2, tool: 'pick', tier: 1 });
defBlock('glass', 'Glass', { tex: 'glass', opaque: false, render: 'cutout', cullSame: true, hardness: 0.3, drop: null, snd: 'glass' });
defBlock('brick', 'Bricks', { tex: 'brick', hardness: 2, tool: 'pick', tier: 1 });
defBlock('coal_ore', 'Coal Ore', { tex: 'coal_ore', hardness: 3, tool: 'pick', tier: 1, drop: 'coal' });
defBlock('iron_ore', 'Iron Ore', { tex: 'iron_ore', hardness: 3, tool: 'pick', tier: 2 });
defBlock('gold_ore', 'Gold Ore', { tex: 'gold_ore', hardness: 3, tool: 'pick', tier: 3 });
defBlock('diamond_ore', 'Diamond Ore', { tex: 'diamond_ore', hardness: 3, tool: 'pick', tier: 3, drop: 'diamond' });
defBlock('snowy_grass', 'Snowy Grass', { tex: { s: 'snow_side', t: 'snow', b: 'dirt' }, hardness: 0.6, drop: 'dirt', snd: 'snow' });
defBlock('bedrock', 'Bedrock', { tex: 'bedrock', hardness: -1, drop: null });
defBlock('crafting_table', 'Crafting Table', { tex: { s: 'table_side', t: 'table_top', b: 'planks' }, hardness: 2.5, snd: 'wood', use: 'table' });
defBlock('chest', 'Chest', { tex: { s: 'chest_side', pz: 'chest_front', t: 'chest_top' }, hardness: 2.5, snd: 'wood', use: 'chest' });
defBlock('gravel', 'Gravel', { tex: 'gravel', hardness: 0.6, snd: 'sand' });
defBlock('cactus', 'Cactus', { tex: { s: 'cactus_side', t: 'cactus_top' }, hardness: 0.4, snd: 'wool' });
defBlock('mossy_cobblestone', 'Mossy Cobblestone', { tex: 'mossy', hardness: 2, tool: 'pick', tier: 1 });
defBlock('bookshelf', 'Bookshelf', { tex: { s: 'bookshelf', t: 'planks' }, hardness: 1.5, snd: 'wood' });
defBlock('tnt', 'TNT', { tex: { s: 'tnt_side', t: 'tnt_top', b: 'tnt_bottom' }, hardness: 0, snd: 'grass', use: 'tnt' });
defBlock('sandstone', 'Sandstone', { tex: { s: 'sandstone', t: 'sandstone_top' }, hardness: 0.8, tool: 'pick', tier: 1 });
defBlock('wool', 'White Wool', { tex: 'wool', hardness: 0.8, snd: 'wool' });
defBlock('glowstone', 'Glowstone', { tex: 'glowstone', hardness: 0.3, light: 1, snd: 'glass' });
defBlock('furnace', 'Furnace', { tex: { s: 'furnace_side', pz: 'furnace_front', t: 'stone' }, hardness: 3.5, tool: 'pick', tier: 1, use: 'table' });
defBlock('birch_log', 'Birch Log', { tex: { s: 'birch_side', t: 'birch_top' }, hardness: 2, snd: 'wood' });
defBlock('birch_leaves', 'Birch Leaves', { tex: 'birch_leaves', opaque: false, render: 'cutout', cullSame: true, hardness: 0.2, snd: 'grass', drop: (r) => r < 0.1 ? ['stick', 1] : null });
defBlock('spruce_log', 'Spruce Log', { tex: { s: 'spruce_side', t: 'spruce_top' }, hardness: 2, snd: 'wood' });
defBlock('spruce_leaves', 'Spruce Leaves', { tex: 'spruce_leaves', opaque: false, render: 'cutout', cullSame: true, hardness: 0.2, snd: 'grass', drop: (r) => r < 0.1 ? ['stick', 1] : null });
defBlock('tall_grass', 'Tall Grass', { tex: 'tall_grass', solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', drop: (r) => r < 0.125 ? ['wheat_seeds', 1] : null, plant: true });
defBlock('rose', 'Rose', { tex: 'flower_red', solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', plant: true });
defBlock('dandelion', 'Dandelion', { tex: 'flower_yellow', solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', plant: true });
defBlock('dead_bush', 'Dead Bush', { tex: 'dead_bush', solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', drop: (r) => r < 0.5 ? ['stick', 1] : null, plant: true });
defBlock('torch', 'Torch', { tex: 'torch', solid: false, opaque: false, render: 'torch', hardness: 0, light: 0.95, snd: 'wood' });
defBlock('spawner', 'Monster Spawner', { tex: 'spawner', opaque: false, render: 'cutout', hardness: 5, tool: 'pick', tier: 1, drop: null, snd: 'stone' });
defBlock('stone_bricks', 'Stone Bricks', { tex: 'stone_bricks', hardness: 1.5, tool: 'pick', tier: 1 });
defBlock('snow_block', 'Snow Block', { tex: 'snow', hardness: 0.3, snd: 'snow' });
defBlock('lava', 'Lava', { tex: 'lava', solid: false, opaque: false, render: 'lava', hardness: -1, drop: null, light: 1, fluid: true, noTarget: true });
defBlock('obsidian', 'Obsidian', { tex: 'obsidian', hardness: 25, tool: 'pick', tier: 4 });
defBlock('netherrack', 'Netherrack', { tex: 'netherrack', hardness: 0.4, tool: 'pick', tier: 1 });
defBlock('soul_sand', 'Soul Sand', { tex: 'soul_sand', hardness: 0.5, snd: 'sand' });
defBlock('quartz_ore', 'Nether Quartz Ore', { tex: 'quartz_ore', hardness: 3, tool: 'pick', tier: 1, drop: 'quartz' });
defBlock('nether_gold_ore', 'Nether Gold Ore', { tex: 'nether_gold_ore', hardness: 3, tool: 'pick', tier: 1, drop: (r) => ['gold_nugget', 2 + (r * 4 | 0)] });
defBlock('nether_bricks', 'Nether Bricks', { tex: 'nether_bricks', hardness: 2, tool: 'pick', tier: 1 });
defBlock('magma_block', 'Magma Block', { tex: 'magma', hardness: 0.5, tool: 'pick', tier: 1, light: 0.35 });
defBlock('crimson_nylium', 'Crimson Nylium', { tex: { s: 'crimson_nylium_side', t: 'crimson_nylium', b: 'netherrack' }, hardness: 0.4, tool: 'pick', tier: 1, drop: 'netherrack' });
defBlock('warped_nylium', 'Warped Nylium', { tex: { s: 'warped_nylium_side', t: 'warped_nylium', b: 'netherrack' }, hardness: 0.4, tool: 'pick', tier: 1, drop: 'netherrack' });
defBlock('crimson_stem', 'Crimson Stem', { tex: { s: 'crimson_stem', t: 'crimson_stem_top' }, hardness: 2, snd: 'wood' });
defBlock('warped_stem', 'Warped Stem', { tex: { s: 'warped_stem', t: 'warped_stem_top' }, hardness: 2, snd: 'wood' });
defBlock('nether_wart_block', 'Nether Wart Block', { tex: 'nether_wart', hardness: 1, snd: 'grass' });
defBlock('warped_wart_block', 'Warped Wart Block', { tex: 'warped_wart', hardness: 1, snd: 'grass' });
defBlock('shroomlight', 'Shroomlight', { tex: 'shroomlight', hardness: 1, light: 1, snd: 'grass' });
defBlock('crimson_fungus', 'Crimson Fungus', { tex: 'crimson_fungus', solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', plant: true });
defBlock('warped_fungus', 'Warped Fungus', { tex: 'warped_fungus', solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', plant: true });
defBlock('crimson_roots', 'Crimson Roots', { tex: 'crimson_roots', solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', plant: true });
defBlock('warped_roots', 'Warped Roots', { tex: 'warped_roots', solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', plant: true });
defBlock('nether_portal', 'Nether Portal', { tex: 'portal', solid: false, opaque: false, render: 'portal', axis: 'x', hardness: -1, drop: null, light: 0.6, noTarget: true });
defBlock('nether_portal_z', 'Nether Portal', { tex: 'portal', solid: false, opaque: false, render: 'portal', axis: 'z', hardness: -1, drop: null, light: 0.6, noTarget: true, hidden: true });
defBlock('end_stone', 'End Stone', { tex: 'end_stone', hardness: 3, tool: 'pick', tier: 1 });
defBlock('end_portal_frame', 'End Portal Frame', { tex: { s: 'end_frame_side', t: 'end_frame_top', b: 'end_stone' }, hardness: -1, drop: null });
defBlock('end_portal_frame_eye', 'End Portal Frame (Eye)', { tex: { s: 'end_frame_side', t: 'end_frame_top_eye', b: 'end_stone' }, hardness: -1, drop: null, light: 0.3, hidden: true });
defBlock('end_portal', 'End Portal', { tex: 'end_portal', solid: false, opaque: false, render: 'endportal', hardness: -1, drop: null, light: 0.8, noTarget: true });
defBlock('dragon_egg', 'Shadow Dragon Egg', { tex: 'dragon_egg', hardness: 3, light: 0.15 });
defBlock('quartz_block', 'Block of Quartz', { tex: 'quartz_block', hardness: 0.8, tool: 'pick', tier: 1 });
defBlock('sugar_cane', 'Sugar Cane', { tex: 'sugar_cane', solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', plant: true });
defBlock('lapis_ore', 'Lapis Lazuli Ore', { tex: 'lapis_ore', hardness: 3, tool: 'pick', tier: 2, drop: (r) => ['lapis_lazuli', 4 + (r * 6 | 0)] });
defBlock('lapis_block', 'Block of Lapis Lazuli', { tex: 'lapis_block', hardness: 3, tool: 'pick', tier: 2 });
defBlock('bed_head', 'Bed', { tex: { s: 'bed_side', t: 'bed_head_top', b: 'planks' }, opaque: false, render: 'cube', h: 9 / 16, hardness: 0.2, snd: 'wool', drop: 'bed', use: 'bed', hidden: true });
defBlock('bed_foot', 'Bed', { tex: { s: 'bed_side', t: 'bed_foot_top', b: 'planks' }, opaque: false, render: 'cube', h: 9 / 16, hardness: 0.2, snd: 'wool', drop: null, use: 'bed', hidden: true });
defBlock('dirt_path', 'Dirt Path', { tex: { s: 'path_side', t: 'path_top', b: 'dirt' }, hardness: 0.65, snd: 'grass', drop: 'dirt' });
defBlock('farmland', 'Farmland', { tex: { s: 'dirt', t: 'farmland', b: 'dirt' }, hardness: 0.6, snd: 'grass', drop: 'dirt' });
for (let st = 0; st < 4; st++) defBlock('wheat_' + st, 'Wheat Crops', { tex: 'wheat' + st, solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', plant: true, hidden: st > 0, crop: st, drop: st < 3 ? 'wheat_seeds' : (r) => ['wheat', 1] });
defBlock('hay_block', 'Hay Bale', { tex: { s: 'hay_side', t: 'hay_top' }, hardness: 0.5, snd: 'grass' });
defBlock('enchanting_table', 'Enchanting Table', { tex: { s: 'ench_side', t: 'ench_top', b: 'ench_bottom' }, hardness: 5, tool: 'pick', tier: 1, light: 0.45, use: 'enchant' });
BL[B.WATER].fluid = true; BL[B.WATER].noTarget = true;
BL[B.GRAVEL].drop = (r) => r < 0.12 ? ['flint', 1] : 'gravel';
const NBLOCKS = BL.length;
const SOLID = new Uint8Array(256), OPAQUE = new Uint8Array(256), PLANT = new Uint8Array(256), LIGHT = new Float32Array(256);
for (const d of BL) { SOLID[d.id] = d.solid ? 1 : 0; OPAQUE[d.id] = d.opaque ? 1 : 0; PLANT[d.id] = d.plant ? 1 : 0; LIGHT[d.id] = d.light; }

// ---------------- Items ----------------
const ITEMS = []; const IT = {};
function defItem(id, key, name, o) { ITEMS[id] = Object.assign({ id, key, name, stack: 64, kind: 'mat' }, o); IT[key] = id; }
for (const d of BL) if (d.id !== 0) defItem(d.id, d.key, d.name, { kind: 'block', block: d.id });
// non-block items start at 256 so blocks (including modded ones) can use every id up to 255.
// Old saves numbered these items from 100 in this same order; LEGACY_ITEMS lets the loader convert them.
let nid = 256; const LEGACY_ITEMS = [];
const M = (key, name, o) => { LEGACY_ITEMS.push(key); defItem(nid++, key, name, o || {}); };
M('stick', 'Stick'); M('coal', 'Coal'); M('iron_ingot', 'Iron Ingot'); M('gold_ingot', 'Gold Ingot'); M('diamond', 'Diamond');
M('string', 'String'); M('bone', 'Bone'); M('arrow', 'Arrow'); M('gunpowder', 'Gunpowder'); M('feather', 'Feather'); M('leather', 'Leather');
M('apple', 'Apple', { kind: 'food', heal: 4 }); M('raw_pork', 'Raw Porkchop', { kind: 'food', heal: 3 }); M('cooked_pork', 'Cooked Porkchop', { kind: 'food', heal: 8 });
M('raw_beef', 'Raw Beef', { kind: 'food', heal: 3 }); M('steak', 'Steak', { kind: 'food', heal: 8 });
M('raw_chicken', 'Raw Chicken', { kind: 'food', heal: 2 }); M('cooked_chicken', 'Cooked Chicken', { kind: 'food', heal: 6 });
M('rotten_flesh', 'Rotten Flesh', { kind: 'food', heal: 2 }); M('golden_apple', 'Golden Apple', { kind: 'food', heal: 20 });
M('bow', 'Bow', { kind: 'bow', stack: 1 });
const TOOLMATS = [['wood', 'Wooden', 1, 2, [150, 116, 66], [190, 150, 90]], ['stone', 'Stone', 2, 4, [120, 120, 120], [160, 160, 160]], ['iron', 'Iron', 3, 6, [214, 214, 214], [255, 255, 255]], ['diamond', 'Diamond', 4, 8, [70, 220, 210], [190, 255, 250]]];
for (const [k, n, tier, sp] of TOOLMATS) M(k + '_pickaxe', n + ' Pickaxe', { kind: 'tool', stack: 1, tool: 'pick', tier, speed: sp, dmg: 1 + tier });
for (const [k, n, tier] of TOOLMATS) M(k + '_sword', n + ' Sword', { kind: 'tool', stack: 1, tool: 'sword', tier, speed: 1, dmg: 3 + tier });
M('flint', 'Flint'); M('flint_and_steel', 'Flint and Steel', { kind: 'fns', stack: 1 });
M('bucket', 'Bucket', { kind: 'bucket', stack: 16 }); M('water_bucket', 'Water Bucket', { kind: 'bucket', stack: 1, fluid: 'water' }); M('lava_bucket', 'Lava Bucket', { kind: 'bucket', stack: 1, fluid: 'lava' });
M('quartz', 'Nether Quartz'); M('nether_brick', 'Nether Brick'); M('gold_nugget', 'Gold Nugget');
M('ghast_tear', 'Ghast Tear'); M('blaze_rod', 'Blaze Rod'); M('blaze_powder', 'Blaze Powder'); M('magma_cream', 'Magma Cream');
M('ender_pearl', 'Ender Pearl', { kind: 'pearl', stack: 16 }); M('eye_of_ender', 'Eye of Ender', { kind: 'eye' });
M('shield', 'Shield', { kind: 'shield', stack: 1 });
M('paper', 'Paper'); M('book', 'Book'); M('lapis_lazuli', 'Lapis Lazuli');
M('bed', 'Bed', { kind: 'bed', stack: 1 });
M('wheat_seeds', 'Wheat Seeds', { kind: 'seed', crop: 'wheat_0' }); M('wheat', 'Wheat'); M('bread', 'Bread', { kind: 'food', heal: 5 });
for (const [k, n, tier, sp] of TOOLMATS) M(k + '_hoe', n + ' Hoe', { kind: 'tool', stack: 1, tool: 'hoe', tier, speed: 1, dmg: 1 });
// armour: Minecraft defence points [helmet, chestplate, leggings, boots] and toughness
const ARMOR_MATS = [['leather', 'Leather', [1, 3, 2, 1], 0, [150, 90, 50], 'leather'], ['golden', 'Golden', [2, 5, 3, 1], 0, [240, 200, 60], 'gold_ingot'], ['iron', 'Iron', [2, 6, 5, 2], 0, [210, 210, 214], 'iron_ingot'], ['diamond', 'Diamond', [3, 8, 6, 3], 2, [80, 220, 210], 'diamond']];
const ARMOR_PIECES = [['helmet', 'Helmet', 'head'], ['chestplate', 'Chestplate', 'chest'], ['leggings', 'Leggings', 'legs'], ['boots', 'Boots', 'feet']];
const ARMOR_SLOT = { head: 37, chest: 38, legs: 39, feet: 40 };
for (const [mk, mn, pts, tough, col] of ARMOR_MATS) ARMOR_PIECES.forEach(([pk, pn, slot], i) => M(mk + '_' + pk, mn + ' ' + pn, { kind: 'armor', stack: 1, slot, def: pts[i], tough, color: col, mat: mk }));
const ITEM_IDS = ITEMS.map((x, i) => x ? i : -1).filter(i => i > 0);
function itemDef(id) { return ITEMS[id]; }
function stackMax(id) { return ITEMS[id] ? ITEMS[id].stack : 64; }

// ---------------- Icons ----------------
const ICON = [];
function iconCanvas(painter) {
  const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'); const img = x.createImageData(16, 16); const d = img.data;
  const set = (px, py, col, a = 255) => { px = Math.round(px); py = Math.round(py); if (px < 0 || py < 0 || px > 15 || py > 15) return; const k = (py * 16 + px) * 4; d[k] = clamp(col[0], 0, 255); d[k + 1] = clamp(col[1], 0, 255); d[k + 2] = clamp(col[2], 0, 255); d[k + 3] = a; };
  painter(set, mulberry32(77)); x.putImageData(img, 0, 0); return c;
}
function blob(set, cx, cy, rx, ry, col, r, outline) { each((x, y) => { const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (d <= 1) set(x, y, d > 0.62 && outline ? outline : vary(col, r, 9)); }); }
const BROWN = [118, 86, 44], BROWN2 = [86, 62, 30];
const ICONP = {
  stick: (s) => { pLine(s, 2, 13, 12, 3, BROWN); pLine(s, 3, 13, 13, 3, BROWN2); },
  coal: (s, r) => { blob(s, 8, 8, 5.5, 5, [44, 44, 44], r, [22, 22, 22]); s(6, 6, [90, 90, 90]); s(9, 9, [80, 80, 80]); },
  iron_ingot: (s) => ingot(s, [210, 210, 210], [250, 250, 250], [140, 140, 140]),
  gold_ingot: (s) => ingot(s, [240, 200, 40], [255, 245, 150], [180, 130, 20]),
  diamond: (s) => { for (let y = 2; y <= 14; y++) { const w = y <= 6 ? (y - 2) * 1.4 + 1 : (14 - y) * 0.75 + 0.5; for (let x = Math.round(8 - w); x <= Math.round(7 + w); x++) s(x, y, (y < 6 && x < 8) ? [210, 255, 252] : (x > 9 || y > 10) ? [40, 160, 160] : [90, 230, 220]); } },
  string: (s) => { for (let x = 2; x <= 13; x++) s(x, 8 + Math.round(2.5 * Math.sin(x * 0.9)), [228, 228, 228]); },
  bone: (s) => { pLine(s, 4, 11, 11, 4, [236, 232, 214]); pLine(s, 5, 11, 11, 5, [200, 196, 176]); for (const [x, y] of [[3, 11], [4, 12], [3, 12], [11, 3], [12, 4], [12, 3]]) s(x, y, [244, 240, 226]); },
  arrow: (s) => { pLine(s, 3, 12, 11, 4, BROWN); for (const [x, y] of [[12, 3], [11, 3], [12, 4], [13, 2], [10, 3], [12, 5]]) s(x, y, [200, 200, 200]); for (const [x, y] of [[2, 12], [2, 13], [3, 14], [4, 14], [1, 13], [3, 13]]) s(x, y, [240, 240, 240]); },
  gunpowder: (s, r) => { blob(s, 8, 10, 6, 4, [90, 90, 90], r); for (let i = 0; i < 10; i++) s(3 + r() * 10, 7 + r() * 6, [50, 50, 50]); },
  feather: (s) => { pLine(s, 3, 13, 12, 3, [180, 180, 180]); pLine(s, 4, 11, 11, 3, [236, 236, 236]); pLine(s, 5, 12, 13, 4, [236, 236, 236]); pLine(s, 6, 12, 13, 5, [210, 210, 210]); },
  leather: (s, r) => blob(s, 8, 8, 6, 5.5, [152, 92, 50], r, [108, 62, 30]),
  apple: (s, r) => { blob(s, 8, 9, 5.5, 5, [214, 30, 30], r, [150, 18, 18]); s(6, 7, [255, 150, 150]); s(6, 8, [255, 120, 120]); pLine(s, 8, 2, 8, 4, BROWN); s(9, 3, [60, 150, 40]); s(10, 3, [60, 150, 40]); s(10, 2, [60, 150, 40]); },
  golden_apple: (s, r) => { blob(s, 8, 9, 5.5, 5, [246, 206, 50], r, [190, 140, 20]); s(6, 7, [255, 250, 190]); pLine(s, 8, 2, 8, 4, BROWN); s(9, 3, [60, 150, 40]); s(10, 2, [60, 150, 40]); },
  raw_pork: (s, r) => { blob(s, 8, 8, 6, 4.5, [236, 146, 146], r, [200, 100, 100]); pLine(s, 4, 8, 11, 7, [255, 220, 220]); },
  cooked_pork: (s, r) => { blob(s, 8, 8, 6, 4.5, [176, 104, 60], r, [120, 66, 36]); pLine(s, 4, 8, 11, 7, [214, 160, 110]); },
  raw_beef: (s, r) => { blob(s, 8, 8, 6, 5, [196, 44, 44], r, [140, 24, 24]); for (let i = 0; i < 6; i++) s(4 + r() * 8, 5 + r() * 6, [240, 210, 210]); },
  steak: (s, r) => { blob(s, 8, 8, 6, 5, [128, 70, 38], r, [84, 44, 22]); for (let i = 0; i < 4; i++) s(4 + r() * 8, 5 + r() * 6, [170, 110, 70]); },
  raw_chicken: (s, r) => { blob(s, 9, 7, 4.5, 4, [242, 204, 186], r, [210, 160, 140]); pLine(s, 6, 10, 3, 13, [244, 240, 230]); s(2, 13, [244, 240, 230]); s(3, 14, [244, 240, 230]); },
  cooked_chicken: (s, r) => { blob(s, 9, 7, 4.5, 4, [204, 134, 70], r, [150, 90, 40]); pLine(s, 6, 10, 3, 13, [244, 240, 230]); s(2, 13, [244, 240, 230]); s(3, 14, [244, 240, 230]); },
  rotten_flesh: (s, r) => { blob(s, 8, 8, 6, 5, [126, 100, 60], r, [90, 70, 40]); for (let i = 0; i < 6; i++) s(4 + r() * 8, 5 + r() * 6, [90, 140, 60]); },
  bow: (s) => { for (let a = -90; a <= 0; a += 4) { const t = a * Math.PI / 180; s(2 + 11 * Math.cos(t), 14 + 11 * Math.sin(t), BROWN); s(2 + 10 * Math.cos(t), 14 + 10 * Math.sin(t), BROWN2); } pLine(s, 3, 3, 13, 13, [220, 220, 220]); },
};
function ingot(s, c, hi, dk) { for (let y = 6; y <= 11; y++) { const x0 = 2 + Math.floor((11 - y) / 2), x1 = 13 - Math.floor((y - 6) / 2); for (let x = x0; x <= x1; x++) s(x, y, y === 6 ? hi : y === 11 || x === x1 ? dk : c); } }
function pickIcon(col, hi) { return (s) => { pLine(s, 2, 14, 10, 6, BROWN); pLine(s, 3, 14, 10, 7, BROWN2); for (let a = -110; a <= 20; a += 3) { const t = a * Math.PI / 180; s(4 + 9.5 * Math.cos(t), 11 + 9.5 * Math.sin(t), hi); s(4 + 8.5 * Math.cos(t), 11 + 8.5 * Math.sin(t), col); } }; }
function swordIcon(col, hi) { return (s) => { pLine(s, 5, 10, 13, 2, col); pLine(s, 6, 11, 14, 3, col); pLine(s, 5, 11, 13, 3, hi); pLine(s, 3, 9, 7, 13, [70, 60, 50]); pLine(s, 2, 13, 4, 11, BROWN); s(1, 14, BROWN2); }; }
for (const [k, , , , col, hi] of TOOLMATS) { ICONP[k + '_pickaxe'] = pickIcon(col, hi); ICONP[k + '_sword'] = swordIcon(col, hi); }
for (const [k, , , , col, hi] of TOOLMATS) ICONP[k + '_hoe'] = (s) => { pLine(s, 3, 14, 10, 7, BROWN); pLine(s, 4, 14, 11, 7, BROWN2); for (const [x, y] of [[9, 3], [10, 3], [11, 3], [12, 4], [8, 4], [9, 4], [10, 4], [11, 5], [12, 5], [12, 6]]) s(x, y, (y < 4) ? hi : col); };
Object.assign(ICONP, {
  bed: (s) => { for (let y = 6; y <= 11; y++) for (let x = 1; x <= 14; x++) s(x, y, y < 8 ? (x < 5 ? [236, 236, 230] : [196, 44, 44]) : y < 10 ? [176, 36, 36] : (x < 3 || x > 12 ? [130, 100, 60] : [0, 0, 0, 0])); for (let x = 1; x <= 14; x++) s(x, 10, [164, 132, 80]); },
  wheat_seeds: (s, r) => { for (let i = 0; i < 9; i++) { const x = 4 + r() * 8, y = 5 + r() * 7; s(x, y, [90, 150, 50]); s(x + 1, y, [60, 120, 30]); } },
  wheat: (s, r) => { for (const ox of [-2, 0, 2]) { pLine(s, 8 + ox, 14, 8 + ox * 1.5, 4, [170, 140, 50]); for (let y = 3; y < 9; y++) s(8 + ox * 1.5 + (y % 2 ? 1 : -1), y, [214, 186, 90]); } },
  bread: (s, r) => { blob(s, 8, 9, 6.5, 3.8, [190, 130, 60], r, [130, 80, 30]); for (const x of [5, 8, 11]) pLine(s, x, 7, x + 1, 9, [230, 190, 120]); },
});
const ARMOR_SHAPES = { helmet: ['..XXXXXXXXXX..', '.XHHHHHHHHHHX.', '.XHXXXXXXXXHX.', '.XX........XX.', '.XX........XX.', '.XX........XX.'],
  chestplate: ['XXXX....XXXX', 'XHHXXXXXXHHX', 'XHHHHHHHHHHX', 'XXXHHHHHHXXX', '..XHHHHHHX..', '..XHHHHHHX..', '..XHHHHHHX..', '..XHHHHHHX..', '..XXXXXXXX..'],
  leggings: ['XXXXXXXXXX', 'XHHHHHHHHX', 'XHHHXXHHHX', 'XHHX..XHHX', 'XHHX..XHHX', 'XHHX..XHHX', 'XHHX..XHHX', 'XHHX..XHHX', 'XXXX..XXXX'],
  boots: ['XXX....XXX', 'XHX....XHX', 'XHX....XHX', 'XHHX..XHHX', 'XXXX..XXXX'] };
for (const [mk, , , , col] of ARMOR_MATS) for (const [pk] of ARMOR_PIECES) ICONP[mk + '_' + pk] = (s, r) => { const sh = ARMOR_SHAPES[pk]; const oy = Math.round((16 - sh.length) / 2), ox = Math.round((16 - sh[0].length) / 2); const dk = mixc(col, [0, 0, 0], 0.45), hi = mixc(col, [255, 255, 255], 0.35); sh.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'X') s(ox + x, oy + y, dk); else if (ch === 'H') s(ox + x, oy + y, (y < 2 || x < 3) ? hi : vary(col, r, 8)); })); };
function bucketIcon(fill) { return (s) => { for (let y = 4; y <= 13; y++) { const w = 6 - (y - 4) * 0.25; for (let x = Math.round(8 - w); x <= Math.round(7 + w); x++) s(x, y, (x === Math.round(8 - w) || x === Math.round(7 + w) || y === 13) ? [120, 120, 124] : y === 4 ? [90, 90, 94] : [200, 200, 206]); } if (fill) for (let x = 3; x <= 12; x++) { s(x, 5, fill[0]); s(x, 6, fill[1]); } pLine(s, 2, 4, 5, 1, [140, 140, 146]); pLine(s, 13, 4, 10, 1, [140, 140, 146]); pLine(s, 5, 1, 10, 1, [140, 140, 146]); }; }
Object.assign(ICONP, {
  flint: (s, r) => { blob(s, 8, 8, 4.5, 6, [60, 60, 66], r, [30, 30, 34]); s(6, 5, [130, 130, 140]); s(7, 4, [110, 110, 120]); },
  flint_and_steel: (s) => { for (let a = 0; a < 6.3; a += 0.2) { s(10 + Math.cos(a) * 3.5, 6 + Math.sin(a) * 3.5, [190, 190, 196]); } pLine(s, 9, 9, 6, 13, [150, 150, 156]); blob(s, 4, 11, 2.5, 3, [60, 60, 66], mulberry32(3), [30, 30, 34]); },
  bucket: bucketIcon(null), water_bucket: bucketIcon([[60, 110, 230], [40, 80, 200]]), lava_bucket: bucketIcon([[255, 170, 40], [220, 90, 20]]),
  quartz: (s) => { for (const [x, y] of [[7, 3], [8, 4], [6, 5], [7, 5], [8, 5], [9, 6], [6, 7], [7, 7], [8, 8], [5, 9], [6, 9], [7, 10], [8, 11], [9, 9], [10, 10], [6, 12], [7, 12]]) s(x, y, [240, 234, 226]); s(7, 6, [200, 190, 180]); s(8, 10, [200, 190, 180]); },
  nether_brick: (s) => ingot(s, [92, 40, 46], [130, 64, 70], [50, 20, 26]),
  gold_nugget: (s, r) => { blob(s, 7, 9, 3, 2.5, [246, 210, 60], r, [190, 140, 20]); blob(s, 10, 7, 2, 2, [246, 210, 60], r, [190, 140, 20]); s(6, 8, [255, 250, 190]); },
  ghast_tear: (s, r) => { for (let y = 3; y <= 13; y++) { const w = y < 8 ? (y - 3) * 0.6 : 3.2 - (y - 8) * 0.3; for (let x = Math.round(8 - w); x <= Math.round(7 + w); x++) s(x, y, (x < 7 && y < 10) ? [255, 255, 255] : [190, 230, 240]); } },
  blaze_rod: (s) => { pLine(s, 3, 13, 12, 4, [250, 200, 60]); pLine(s, 4, 13, 13, 4, [220, 140, 30]); s(12, 3, [255, 240, 150]); },
  blaze_powder: (s, r) => { blob(s, 8, 10, 6, 3.5, [240, 160, 40], r); for (let i = 0; i < 10; i++) s(3 + r() * 10, 8 + r() * 5, [255, 230, 120]); },
  magma_cream: (s, r) => { blob(s, 8, 8, 5, 5, [220, 120, 40], r, [140, 60, 20]); s(7, 7, [255, 220, 100]); s(9, 9, [255, 200, 80]); },
  ender_pearl: (s, r) => { blob(s, 8, 8, 5.5, 5.5, [20, 90, 80], r, [10, 50, 46]); s(6, 6, [120, 220, 200]); s(7, 6, [80, 180, 160]); s(6, 7, [80, 180, 160]); },
  shield: (s, r) => { for (let y = 1; y <= 14; y++) { const w = y < 10 ? 5.5 : 5.5 - (y - 9) * 1.1; for (let x = Math.round(7.5 - w); x <= Math.round(7.5 + w); x++) { const edge = y === 1 || y === 14 || x === Math.round(7.5 - w) || x === Math.round(7.5 + w); const plank = (x % 3 === 0) ? [128, 92, 52] : [158, 116, 68]; s(x, y, edge ? [178, 178, 186] : vary(plank, r, 6)); } } for (let y = 6; y <= 8; y++) for (let x = 6; x <= 9; x++) s(x, y, (x === 6 && y === 6) ? [235, 235, 240] : [186, 186, 194]); },
  paper: (s) => { for (let y = 3; y <= 13; y++) for (let x = 3; x <= 12; x++) s(x, y, (x === 12 || y === 13) ? [200, 200, 190] : [246, 246, 240]); for (const y of [5, 7, 9, 11]) for (let x = 5; x <= 10; x++) s(x, y, [210, 210, 204]); },
  book: (s) => { for (let y = 2; y <= 14; y++) for (let x = 3; x <= 12; x++) s(x, y, x <= 4 ? [90, 50, 30] : (y === 2 || y === 14 || x === 12) ? [110, 60, 34] : [150, 84, 46]); for (let y = 3; y <= 13; y++) s(13, y, [236, 232, 220]); },
  lapis_lazuli: (s, r) => { blob(s, 8, 8, 5, 5.5, [40, 80, 200], r, [24, 44, 130]); s(6, 6, [120, 170, 255]); s(7, 6, [90, 140, 240]); s(9, 10, [30, 60, 170]); },
  eye_of_ender: (s, r) => { blob(s, 8, 8, 5.5, 5.5, [40, 130, 90], r, [20, 70, 50]); blob(s, 8, 8, 3, 2, [200, 230, 120], r); for (let y = 6; y <= 10; y++) s(8, y, [10, 30, 20]); s(6, 6, [160, 240, 200]); },
});

function tileCanvas(t) { const c = document.createElement('canvas'); c.width = c.height = 16; c.getContext('2d').drawImage(atlasCanvas, (t % ATN) * 16, Math.floor(t / ATN) * 16, 16, 16, 0, 0, 16, 16); return c; }
function blockIconCanvas(id) {
  const d = BL[id]; const c = document.createElement('canvas'); c.width = c.height = 48; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  if (d.render === 'cross' || d.render === 'torch') { x.drawImage(tileCanvas(d.texIds[0]), 0, 0, 48, 48); return c; }
  const face = (t, a, b, cc, dd, e, f, dark) => {
    const tc = tileCanvas(t); x.setTransform(a, b, cc, dd, e, f); x.drawImage(tc, 0, 0);
    if (dark) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(0,0,0,' + dark + ')'; x.fillRect(0, 0, 16, 16); x.globalCompositeOperation = 'source-over'; }
    x.setTransform(1, 0, 0, 1, 0, 0);
  };
  // draw each face to its own layer to keep darkening confined
  const layer = (fn) => { const l = document.createElement('canvas'); l.width = l.height = 48; const lx = l.getContext('2d'); lx.imageSmoothingEnabled = false; const saved = x; return [l, lx]; };
  const parts = [[d.texIds[2], 20 / 16, -10 / 16, 20 / 16, 10 / 16, 4, 13, 0], [d.texIds[4], 20 / 16, 10 / 16, 0, 24 / 16, 4, 13, 0.22], [d.texIds[0], 20 / 16, -10 / 16, 0, 24 / 16, 24, 23, 0.42]];
  for (const p of parts) {
    const [l, lx] = layer(); const tc = tileCanvas(p[0]); lx.setTransform(p[1], p[2], p[3], p[4], p[5], p[6]); lx.drawImage(tc, 0, 0);
    if (p[7]) { lx.globalCompositeOperation = 'source-atop'; lx.fillStyle = 'rgba(0,0,0,' + p[7] + ')'; lx.fillRect(0, 0, 16, 16); }
    x.drawImage(l, 0, 0);
  }
  return c;
}
const ICON_CANVAS = [];
// bow draw stages (0 = idle icon, 1-3 = increasingly pulled with a nocked arrow)
const BOW_FRAMES = [1, 2, 3].map(k => iconCanvas((s) => {
  for (let a = -90; a <= 0; a += 4) { const t = a * Math.PI / 180; s(2 + 11 * Math.cos(t), 14 + 11 * Math.sin(t), BROWN); s(2 + 10 * Math.cos(t), 14 + 10 * Math.sin(t), BROWN2); }
  const px = 7.5 - k * 1.3, py = 8.5 + k * 1.3;
  pLine(s, 3, 3, px, py, [220, 220, 220]); pLine(s, 13, 13, px, py, [220, 220, 220]);
  const L = 8 + k; pLine(s, px, py, px + L * 0.72, py - L * 0.72, BROWN);
  const hx = Math.round(px + L * 0.72), hy = Math.round(py - L * 0.72); for (const [dx, dy] of [[0, 0], [1, -1], [-1, 0], [0, 1], [1, 0], [0, -1]]) s(hx + dx, hy + dy, [200, 200, 206]);
  for (const [dx, dy] of [[-1, 0], [0, 1], [-1, 1], [-2, 1], [-1, 2]]) s(px + dx, py + dy, [240, 240, 240]);
}));
function buildIcons() { for (const id of ITEM_IDS) {
  const it = ITEMS[id]; let c;
  if (it.kind === 'block') c = blockIconCanvas(id);
  else { const p = ICONP[it.key]; c = iconCanvas(p || ((s) => { s(8, 8, [255, 0, 255]); })); }
  ICON_CANVAS[id] = c; ICON[id] = c.toDataURL();
} }

// heart icons
function heartURL(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 9; const x = c.getContext('2d');
  const H = ['011000110', '111101111', '111111111', '111111111', '011111110', '001111100', '000111000', '000010000'];
  for (let y = 0; y < 8; y++) for (let i = 0; i < 9; i++) if (H[y][i] === '1') {
    const edge = (y === 0 || H[y - 1][i] !== '1' || i === 0 || H[y][i - 1] !== '1' || i === 8 || H[y][i + 1] !== '1' || y === 7 || H[y + 1][i] !== '1');
    let col = edge ? '#1a0000' : '#3a1414';
    if (!edge && (kind === 2 || (kind === 1 && i < 5))) col = (y === 1 && i === 2) || (y === 2 && i === 1) ? '#ffb0b0' : '#e01828';
    x.fillStyle = col; x.fillRect(i, y + 0.5 | 0, 1, 1);
  }
  return c.toDataURL();
}
const HEART = [heartURL(0), heartURL(1), heartURL(2)];

// ---------------- Recipes & loot ----------------
const GROUPS = { '#log': ['log', 'birch_log', 'spruce_log', 'crimson_stem', 'warped_stem'] };
const RSH = (out, n, shape, key) => ({ out: [out, n], shape, key });
const RSL = (out, n, items) => ({ out: [out, n], items });
const RECIPES = [
  RSL('planks', 4, ['#log']),
  RSH('stick', 4, ['P', 'P'], { P: 'planks' }),
  RSH('crafting_table', 1, ['PP', 'PP'], { P: 'planks' }),
  RSH('torch', 4, ['C', 'S'], { C: 'coal', S: 'stick' }),
  RSH('chest', 1, ['PPP', 'P P', 'PPP'], { P: 'planks' }),
  RSH('furnace', 1, ['CCC', 'C C', 'CCC'], { C: 'cobblestone' }),
];
for (const [k, mat] of [['wood', 'planks'], ['stone', 'cobblestone'], ['iron', 'iron_ingot'], ['diamond', 'diamond']]) {
  RECIPES.push(RSH(k + '_pickaxe', 1, ['MMM', ' S ', ' S '], { M: mat, S: 'stick' }));
  RECIPES.push(RSH(k + '_sword', 1, ['M', 'M', 'S'], { M: mat, S: 'stick' }));
}
RECIPES.push(
  RSH('bow', 1, [' TS', 'T S', ' TS'], { T: 'stick', S: 'string' }),
  RSH('arrow', 4, ['F', 'S', 'E'], { F: 'flint', S: 'stick', E: 'feather' }),
  RSH('bucket', 1, ['I I', ' I '], { I: 'iron_ingot' }),
  RSH('shield', 1, ['WIW', 'WWW', ' W '], { W: 'planks', I: 'iron_ingot' }),
  RSL('flint_and_steel', 1, ['iron_ingot', 'flint']),
  RSH('tnt', 1, ['GSG', 'SGS', 'GSG'], { G: 'gunpowder', S: 'sand' }),
  RSH('wool', 1, ['SS', 'SS'], { S: 'string' }),
  RSH('sandstone', 1, ['SS', 'SS'], { S: 'sand' }),
  RSH('stone_bricks', 4, ['SS', 'SS'], { S: 'stone' }),
  RSH('brick', 2, ['SG', 'GS'], { S: 'sand', G: 'gravel' }),
  RSH('bookshelf', 1, ['PPP', 'LLL', 'PPP'], { P: 'planks', L: 'book' }),
  RSH('paper', 3, ['SSS'], { S: 'sugar_cane' }),
  RSL('book', 1, ['paper', 'paper', 'paper', 'leather']),
  ...ARMOR_MATS.flatMap(([mk, , , , , mat]) => [RSH(mk + '_helmet', 1, ['MMM', 'M M'], { M: mat }), RSH(mk + '_chestplate', 1, ['M M', 'MMM', 'MMM'], { M: mat }), RSH(mk + '_leggings', 1, ['MMM', 'M M', 'M M'], { M: mat }), RSH(mk + '_boots', 1, ['M M', 'M M'], { M: mat })]),
  RSH('bread', 1, ['WWW'], { W: 'wheat' }),
  RSH('bed', 1, ['WWW', 'PPP'], { W: 'wool', P: 'planks' }),
  RSH('hay_block', 1, ['WWW', 'WWW', 'WWW'], { W: 'wheat' }), RSL('wheat', 9, ['hay_block']),
  ...[['wood', 'planks'], ['stone', 'cobblestone'], ['iron', 'iron_ingot'], ['diamond', 'diamond']].map(([k, m]) => RSH(k + '_hoe', 1, ['MM', ' S', ' S'], { M: m, S: 'stick' })),
  RSH('enchanting_table', 1, [' B ', 'DOD', 'OOO'], { B: 'book', D: 'diamond', O: 'obsidian' }),
  RSH('lapis_block', 1, ['LLL', 'LLL', 'LLL'], { L: 'lapis_lazuli' }),
  RSL('lapis_lazuli', 9, ['lapis_block']),
  RSH('glowstone', 1, [' T ', 'TGT', ' T '], { T: 'torch', G: 'glass' }),
  RSH('golden_apple', 1, ['GGG', 'GAG', 'GGG'], { G: 'gold_ingot', A: 'apple' }),
  RSH('gold_ingot', 1, ['NNN', 'NNN', 'NNN'], { N: 'gold_nugget' }),
  RSL('gold_nugget', 9, ['gold_ingot']),
  RSL('blaze_powder', 2, ['blaze_rod']),
  RSL('eye_of_ender', 1, ['ender_pearl', 'blaze_powder']),
  RSH('nether_bricks', 1, ['NN', 'NN'], { N: 'nether_brick' }),
  RSH('magma_block', 1, ['MM', 'MM'], { M: 'magma_cream' }),
  RSH('quartz_block', 1, ['QQ', 'QQ'], { Q: 'quartz' }),
  RSH('snow_block', 1, ['SS', 'SS'], { S: 'snowy_grass' }),
);
for (const r of RECIPES) { if (r.shape) { const w = Math.max(...r.shape.map(x => x.length)); r.shape = r.shape.map(x => x.padEnd(w, ' ')); r.big = r.shape.length > 2 || w > 2; } else r.big = r.items.length > 4; }
function ingMatch(spec, id) { return spec[0] === '#' ? GROUPS[spec].some(k => IT[k] === id) : IT[spec] === id; }
function gridMatch(grid, n) {
  let minR = n, maxR = -1, minC = n, maxC = -1; const items = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const s = grid[r * n + c]; if (s) { items.push(s.id); minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c); } }
  if (!items.length) return null;
  const h = maxR - minR + 1, w = maxC - minC + 1;
  for (const rc of RECIPES) {
    if (rc.items) {
      if (rc.items.length !== items.length) continue; const pool = items.slice(); let ok = true;
      for (const spec of rc.items) { const k = pool.findIndex(id => ingMatch(spec, id)); if (k < 0) { ok = false; break; } pool.splice(k, 1); }
      if (ok) return rc; continue;
    }
    const sh = rc.shape; if (sh.length !== h || sh[0].length !== w) continue;
    for (const mir of [false, true]) {
      let ok = true;
      for (let r = 0; r < h && ok; r++) for (let c = 0; c < w; c++) { const ch = sh[r][mir ? w - 1 - c : c]; const s = grid[(minR + r) * n + minC + c]; if (ch === ' ') { if (s) { ok = false; break; } } else if (!s || !ingMatch(rc.key[ch], s.id)) { ok = false; break; } }
      if (ok) return rc;
    }
  }
  return null;
}
const SMELT = {}; for (const [a, b] of [['iron_ore', 'iron_ingot'], ['gold_ore', 'gold_ingot'], ['nether_gold_ore', 'gold_ingot'], ['sand', 'glass'], ['cobblestone', 'stone'], ['raw_pork', 'cooked_pork'], ['raw_beef', 'steak'], ['raw_chicken', 'cooked_chicken'], ['log', 'coal'], ['birch_log', 'coal'], ['spruce_log', 'coal'], ['netherrack', 'nether_brick'], ['quartz_ore', 'quartz']]) SMELT[IT[a]] = IT[b];
const FUEL = {}; for (const [a, t] of [['coal', 40], ['log', 15], ['birch_log', 15], ['spruce_log', 15], ['planks', 15], ['stick', 5], ['crafting_table', 15], ['chest', 15], ['bookshelf', 15], ['blaze_rod', 60], ['lava_bucket', 500], ['wood_pickaxe', 10], ['wood_sword', 10], ['bow', 10], ['shield', 15]]) FUEL[IT[a]] = t;
const COOK_TIME = 5;
const LOOT = {
  ruined_portal: [['obsidian', 3, 7, 0.95], ['flint_and_steel', 1, 1, 0.7], ['gold_ingot', 2, 6, 0.6], ['flint', 1, 4, 0.5], ['golden_apple', 1, 1, 0.15], ['gold_nugget', 4, 12, 0.5]],
  fortress: [['gold_ingot', 2, 6, 0.7], ['iron_ingot', 1, 5, 0.6], ['diamond', 1, 3, 0.3], ['obsidian', 2, 4, 0.3], ['flint_and_steel', 1, 1, 0.2], ['golden_apple', 1, 1, 0.12], ['nether_brick', 4, 10, 0.4], ['ender_pearl', 1, 2, 0.2], ['blaze_rod', 1, 2, 0.25]],
  stronghold: [['ender_pearl', 1, 3, 0.5], ['iron_ingot', 2, 5, 0.6], ['bread', 1, 1, 0], ['apple', 1, 3, 0.5], ['iron_pickaxe', 1, 1, 0.2], ['diamond', 1, 2, 0.2], ['golden_apple', 1, 1, 0.1], ['eye_of_ender', 1, 1, 0.15]],
  house: [['bread', 1, 4, 0.6], ['wheat_seeds', 1, 5, 0.4], ['apple', 1, 3, 0.7], ['stick', 2, 6, 0.5], ['coal', 1, 4, 0.5], ['iron_ingot', 1, 3, 0.35], ['torch', 2, 6, 0.5], ['cooked_pork', 1, 3, 0.4], ['wool', 1, 3, 0.3], ['stone_pickaxe', 1, 1, 0.2], ['steak', 1, 2, 0.3]],
  pyramid: [['gold_ingot', 2, 6, 0.8], ['diamond', 1, 3, 0.45], ['iron_ingot', 1, 5, 0.6], ['bone', 2, 6, 0.6], ['rotten_flesh', 1, 4, 0.5], ['golden_apple', 1, 1, 0.25], ['gunpowder', 2, 5, 0.5], ['tnt', 1, 3, 0.35]],
  dungeon: [['iron_ingot', 1, 4, 0.6], ['gold_ingot', 1, 3, 0.4], ['string', 1, 4, 0.5], ['bone', 1, 5, 0.6], ['gunpowder', 1, 4, 0.5], ['diamond', 1, 2, 0.2], ['golden_apple', 1, 1, 0.12], ['bow', 1, 1, 0.15], ['arrow', 4, 12, 0.4], ['coal', 2, 8, 0.5]],
  smithy: [['iron_ingot', 1, 5, 0.7], ['iron_pickaxe', 1, 1, 0.3], ['iron_sword', 1, 1, 0.3], ['iron_helmet', 1, 1, 0.25], ['iron_chestplate', 1, 1, 0.2], ['iron_leggings', 1, 1, 0.2], ['iron_boots', 1, 1, 0.25], ['diamond', 1, 2, 0.12], ['obsidian', 1, 3, 0.2], ['bread', 1, 3, 0.5], ['apple', 1, 3, 0.4]],
  farm: [['wheat_seeds', 2, 8, 0.8], ['wheat', 2, 6, 0.6], ['bread', 1, 4, 0.6], ['apple', 1, 3, 0.4], ['iron_hoe', 1, 1, 0.15], ['stone_hoe', 1, 1, 0.3]],
  library: [['book', 1, 4, 0.8], ['paper', 2, 8, 0.6], ['lapis_lazuli', 2, 6, 0.4], ['bookshelf', 1, 2, 0.2], ['experience_bottle', 1, 1, 0]],
  tower: [['iron_pickaxe', 1, 1, 0.2], ['iron_sword', 1, 1, 0.25], ['arrow', 4, 16, 0.6], ['bow', 1, 1, 0.3], ['diamond', 1, 2, 0.25], ['torch', 4, 8, 0.5], ['glowstone', 1, 3, 0.3], ['apple', 1, 3, 0.5], ['iron_ingot', 1, 4, 0.5]],
};
function rollLoot(type, seed) {
  const r = mulberry32(seed); const inv = new Array(27).fill(null); const T = LOOT[type] || LOOT.house;
  for (const [k, a, b, p] of T) if (IT[k] && r() < p) { let slot = r() * 27 | 0; for (let t = 0; t < 27 && inv[slot]; t++) slot = (slot + 1) % 27; inv[slot] = { id: IT[k], count: a + Math.floor(r() * (b - a + 1)) }; }
  return inv;
}

const BARTER = [['ender_pearl', 2, 4, 20], ['obsidian', 1, 1, 8], ['string', 3, 9, 10], ['quartz', 5, 12, 10], ['gravel', 8, 16, 8], ['leather', 2, 4, 8], ['nether_brick', 2, 8, 10], ['flint', 4, 8, 8], ['soul_sand', 2, 8, 8], ['iron_ingot', 1, 3, 6], ['magma_cream', 1, 2, 4]];
function rollBarter() { const tot = BARTER.reduce((s, b) => s + b[3], 0); let q = Math.random() * tot; for (const [k, a, b, w] of BARTER) { q -= w; if (q <= 0) return [IT[k], a + Math.floor(Math.random() * (b - a + 1))]; } return [IT.gravel, 8]; }
// UI pixel icons (used instead of emoji)
function uiIcon(rows, col) { const c = document.createElement('canvas'); const h = rows.length, w = rows[0].length; c.width = w; c.height = h; const x = c.getContext('2d'); for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) if (rows[y][i] !== '.') { x.fillStyle = rows[y][i] === 'd' ? 'rgba(0,0,0,0.55)' : col; x.fillRect(i, y, 1, 1); } return c.toDataURL(); }
const UI_ICON = {
  up: uiIcon(['....##....', '...####...', '..######..', '.########.', '##########', '...####...', '...####...', '...####...', '...####...', '...####...'], '#fff'),
  down: uiIcon(['...####...', '...####...', '...####...', '...####...', '...####...', '##########', '.########.', '..######..', '...####...', '....##....'], '#fff'),
  pause: uiIcon(['###..###', '###..###', '###..###', '###..###', '###..###', '###..###', '###..###', '###..###'], '#fff'),
  hand: uiIcon(['...#.#.#..', '..##.#.#..', '..#######.', '..#######.', '#.#######.', '##.######.', '.#########', '..#######.', '...#####..', '...#####..'], '#ffd9b8'),
  close: uiIcon(['##....##', '###..###', '.######.', '..####..', '..####..', '.######.', '###..###', '##....##'], '#fff'),
  arrowR: uiIcon(['............#.....', '............##....', '............###...', '############ ####.'.replace(' ', '#'), '##################', '############ ####.'.replace(' ', '#'), '............###...', '............##....', '............#.....'], '#8b8b8b'),
  arrowRw: uiIcon(['............#.....', '............##....', '............###...', '#################.', '##################', '#################.', '............###...', '............##....', '............#.....'], '#ffffff'),
  flame: uiIcon(['....#....', '...##....', '...###...', '..####.#.', '.######..', '.#######.', '#########', '#########', '.#######.', '..#####..'], '#8b8b8b'),
  flameOn: uiIcon(['....#....', '...##....', '...###...', '..####.#.', '.######..', '.#######.', '#########', '#########', '.#######.', '..#####..'], '#ff9a2a'),
};

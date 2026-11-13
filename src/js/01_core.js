'use strict';
// ================= CORE: utils, noise, textures, blocks, items =================
// Minecraft heights: the Overworld runs from y -64 to 319 (384 blocks). Inside the game the block arrays start at 0, so an
// Overworld y shown to the player is the stored y minus 64 (YOFF). Sea level 63 is stored at 127.
const CS = 16, WH = 384, YOFF = 64, SEA = 127;
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
function pOre(set, r, col, hi, base) { (base || pStone)(set, r); for (let k = 0; k < 5; k++) { const cx = 2 + r() * 12 | 0, cy = 2 + r() * 12 | 0; const n = 3 + r() * 3 | 0; for (let i = 0; i < n; i++) { const x = cx + (r() * 3 | 0) - 1, y = cy + (r() * 3 | 0) - 1; set(x, y, r() < 0.35 ? hi : vary(col, r, 10)); } } }
function pBricks(set, r, base, mort, bw, bh) { each((x, y) => { const row = Math.floor(y / bh); const m = (y % bh) === bh - 1 || ((x + (row % 2) * (bw / 2)) % bw) === bw - 1; set(x, y, m ? vary(mort, r, 6) : vary(base, r, 10)); }); }
function pFlower(set, r, pet, ctr) {
  clear(set); const G = [52, 125, 38];
  for (let y = 8; y < 16; y++) set(7, y, G); set(6, 12, G); set(5, 11, G); set(8, 11, G); set(9, 10, G);
  for (const [x, y] of [[7, 4], [6, 5], [8, 5], [5, 6], [9, 6], [6, 7], [8, 7], [7, 8], [7, 5], [7, 7], [6, 6], [8, 6]]) set(x, y, vary(pet, r, 14));
  set(7, 6, ctr);
}
function pDeepslate(set, r) {
  each((x, y) => { let c = vary([78, 78, 84], r, 7); const q = r(); if (q < 0.14) c = vary([62, 62, 68], r, 4); else if (q < 0.2) c = vary([96, 96, 102], r, 4); set(x, y, c); });
  for (let k = 0; k < 9; k++) { const x = r() * 16 | 0, y = r() * 16 | 0, l = 3 + r() * 5 | 0; for (let i = 0; i < l; i++) set((x + i) & 15, y, vary([56, 56, 62], r, 3)); }
}
function pSpeckled(set, r, base, a, b, pa, pb) { each((x, y) => { let c = vary(base, r, 8); const q = r(); if (q < pa) c = vary(a, r, 6); else if (q < pa + pb) c = vary(b, r, 6); set(x, y, c); }); }
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
makeTile('jungle_side', (set, r) => pLogSide(set, r, [94, 72, 34], [66, 50, 22])); makeTile('jungle_top', (set, r) => pLogTop(set, r, [170, 124, 78], [150, 106, 64], [94, 72, 34])); makeTile('jungle_leaves', (set, r) => pLeaves(set, r, [48, 150, 30]));
makeTile('dark_oak_side', (set, r) => pLogSide(set, r, [62, 46, 28], [40, 30, 16])); makeTile('dark_oak_top', (set, r) => pLogTop(set, r, [96, 70, 40], [78, 56, 32], [62, 46, 28])); makeTile('dark_oak_leaves', (set, r) => pLeaves(set, r, [40, 110, 28]));
makeTile('acacia_side', (set, r) => pLogSide(set, r, [112, 104, 96], [84, 78, 70])); makeTile('acacia_top', (set, r) => pLogTop(set, r, [186, 96, 52], [160, 80, 40], [112, 104, 96])); makeTile('acacia_leaves', (set, r) => pLeaves(set, r, [92, 140, 36]));
makeTile('ladder', (set, r) => { clear(set); for (let y = 0; y < 16; y++) for (const x of [2, 3, 12, 13]) set(x, y, vary(x === 2 || x === 13 ? [104, 78, 44] : [134, 100, 58], r, 8)); for (const y0 of [1, 5, 9, 13]) for (let x = 4; x < 12; x++) { set(x, y0, vary([150, 112, 66], r, 8)); set(x, y0 + 1, vary([108, 80, 46], r, 6)); } });
makeTile('vine', (set, r) => { clear(set); for (let k = 0; k < 7; k++) { let x = 1 + (r() * 14 | 0); for (let y = 0; y < 16; y++) { if (r() < 0.85) set(x, y, vary([56, 120, 32], r, 18)); if (r() < 0.35) set(Math.min(15, x + 1), y, vary([70, 140, 40], r, 14)); x = Math.max(0, Math.min(15, x + (r() < 0.3 ? (r() < 0.5 ? 1 : -1) : 0))); } } });
makeTile('lily_pad', (set, r) => { clear(set); each((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); const notch = Math.abs(x - 7.5) < 1.5 && y > 8; if (d < 7.2 && !notch) set(x, y, vary(d > 6 ? [36, 100, 30] : [56, 140, 46], r, 10)); }); });
makeTile('cobweb', (set, r) => { clear(set); for (let a = 0; a < 8; a++) { const t = a / 8 * Math.PI * 2; for (let d = 0; d < 8; d++) set(Math.round(7.5 + Math.cos(t) * d), Math.round(7.5 + Math.sin(t) * d), [226, 226, 230]); } for (const R of [2.5, 4.5, 6.5]) for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2; set(Math.round(7.5 + Math.cos(t) * R), Math.round(7.5 + Math.sin(t) * R), [210, 210, 214]); } });
makeTile('ice', (set, r) => each((x, y) => set(x, y, vary([150, 190, 250], r, 8), 200))); makeTile('packed_ice', (set, r) => each((x, y) => { let c = vary([160, 196, 246], r, 6); if ((x * 3 + y * 5) % 11 === 0) c = [200, 224, 255]; set(x, y, c); }));
makeTile('cauldron_side', (set, r) => each((x, y) => { let c = vary([62, 62, 66], r, 5); if (y < 2) c = [80, 80, 84]; if (y > 12 && (x < 3 || x > 12)) c = [44, 44, 48]; set(x, y, c); }));
makeTile('fence', (set, r) => pPlanks(set, r, [162, 130, 78]));
const brickTile = (base, mortar, h = 4, w = 8) => (set, r) => each((x, y) => { const row = Math.floor(y / h); const off = row % 2 ? w / 2 : 0; const m = y % h === h - 1 || (x + off) % w === w - 1; set(x, y, m ? vary(mortar, r, 4) : vary(base, r, 7)); });
makeTile('purpur_block', (set, r) => each((x, y) => { const e = x % 8 === 0 || y % 8 === 0; set(x, y, e ? vary([150, 100, 150], r, 5) : vary([172, 122, 172], r, 7)); }));
makeTile('purpur_pillar', (set, r) => each((x, y) => set(x, y, (x === 0 || x === 15 || x === 7) ? vary([140, 92, 140], r, 5) : vary([176, 126, 176], r, 6))));
// ---- villager workstations ----
const pPl = (set, r, c, vert) => each((x, y) => { const a = vert ? x : y; const b = vert ? y : x; let k = vary(c, r, 7); if (a % 4 === 3) k = mixc(c, [0, 0, 0], 0.35); else if ((b + (a >> 2) * 5) % 9 === 0) k = mixc(c, [0, 0, 0], 0.2); set(x, y, k); });
makeTile('composter_side', (set, r) => { pPl(set, r, [150, 110, 60], true); each((x, y) => { if (y === 0 || y === 15) set(x, y, [96, 66, 34]); }); });
makeTile('composter_top', (set, r) => each((x, y) => { const rim = x < 2 || x > 13 || y < 2 || y > 13; set(x, y, rim ? vary([150, 110, 60], r, 6) : vary([66, 48, 30], r, 6)); if (!rim && r() < 0.15) set(x, y, vary([90, 120, 40], r, 10)); }));
makeTile('smoker_side', (set, r) => each((x, y) => { let c = vary([100, 98, 94], r, 7); if (y < 3 || y > 12) c = vary([92, 68, 44], r, 6); if (y === 3 || y === 12) c = [60, 44, 30]; set(x, y, c); }));
makeTile('smoker_front', (set, r) => each((x, y) => { let c = vary([100, 98, 94], r, 7); if (y < 3 || y > 12) c = vary([92, 68, 44], r, 6); if (x >= 3 && x <= 12 && y >= 5 && y <= 11) c = y === 11 ? [220, 110, 30] : (x % 3 === 0 ? [70, 70, 72] : [24, 22, 20]); set(x, y, c); }));
makeTile('smoker_top', (set, r) => each((x, y) => { let c = vary([86, 84, 82], r, 6); if (x >= 4 && x <= 11 && y >= 4 && y <= 11) c = (x + y) % 2 ? [40, 38, 36] : [64, 62, 60]; set(x, y, c); }));
makeTile('blast_side', (set, r) => each((x, y) => { let c = vary([132, 132, 134], r, 6); if (x === 0 || x === 15 || y === 0 || y === 15) c = [96, 96, 98]; if (y === 5 || y === 10) c = [80, 80, 84]; set(x, y, c); }));
makeTile('blast_front', (set, r) => each((x, y) => { let c = vary([132, 132, 134], r, 6); if (x === 0 || x === 15 || y === 0 || y === 15) c = [96, 96, 98]; if (x >= 3 && x <= 12 && y >= 4 && y <= 12) c = x % 2 ? [56, 56, 60] : (y > 9 ? [230, 120, 40] : [28, 26, 26]); set(x, y, c); }));
makeTile('blast_top', (set, r) => each((x, y) => { let c = vary([120, 120, 124], r, 6); if (x >= 3 && x <= 12 && y >= 3 && y <= 12) c = (x % 3 === 0 || y % 3 === 0) ? [70, 70, 74] : [36, 34, 34]; set(x, y, c); }));
makeTile('carto_top', (set, r) => each((x, y) => { let c = vary([110, 80, 52], r, 6); if (x >= 2 && x <= 13 && y >= 2 && y <= 13) { c = vary([226, 214, 176], r, 5); if ((x * 3 + y * 5) % 11 === 0) c = [120, 150, 90]; if (y === 7 || x === 9) c = [150, 130, 100]; } set(x, y, c); }));
makeTile('carto_side', (set, r) => { pPl(set, r, [96, 70, 46]); each((x, y) => { if (y < 4 && x > 2 && x < 13) set(x, y, vary([220, 208, 170], r, 5)); }); });
makeTile('fletch_top', (set, r) => { pPl(set, r, [196, 178, 128]); for (const [x0, y0] of [[3, 3], [9, 8]]) for (let i = 0; i < 6; i++) { set(x0 + i, y0 + i, [240, 240, 240]); set(x0 + i + 1, y0 + i, [200, 200, 200]); } });
makeTile('fletch_side', (set, r) => { pPl(set, r, [196, 178, 128], true); each((x, y) => { if (y < 2) set(x, y, [150, 130, 90]); if (y >= 6 && y <= 9 && x >= 5 && x <= 10) set(x, y, vary([90, 90, 96], r, 8)); }); });
makeTile('loom_top', (set, r) => { pPl(set, r, [176, 132, 82]); each((x, y) => { if (y >= 5 && y <= 10) set(x, y, vary(x % 2 ? [220, 220, 220] : [190, 190, 190], r, 4)); }); });
makeTile('loom_side', (set, r) => { pPl(set, r, [150, 110, 64], true); each((x, y) => { if (x >= 3 && x <= 12 && y >= 2 && y <= 9 && x % 2 === 1) set(x, y, [230, 230, 230]); }); });
makeTile('barrel_side', (set, r) => { pPl(set, r, [120, 86, 50], true); each((x, y) => { if (y === 2 || y === 13) set(x, y, vary([70, 70, 74], r, 4)); }); });
makeTile('barrel_top', (set, r) => each((x, y) => { const dx = x - 7.5, dy = y - 7.5, d = Math.hypot(dx, dy); let c = vary([140, 102, 60], r, 6); if (x % 5 === 0) c = [96, 68, 40]; if (d > 7) c = [86, 62, 36]; if (d < 2) c = [70, 50, 30]; set(x, y, c); }));
makeTile('lectern_top', (set, r) => each((x, y) => { let c = vary([160, 120, 72], r, 6); if (x >= 3 && x <= 12 && y >= 3 && y <= 12) c = x === 8 ? [120, 90, 60] : vary([236, 228, 200], r, 4); set(x, y, c); }));
makeTile('lectern_side', (set, r) => pPl(set, r, [150, 112, 66], true));
makeTile('grindstone', (set, r) => each((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); let c = vary([140, 140, 136], r, 9); if (d < 2) c = [90, 70, 46]; if (d > 7.2) c = [110, 110, 106]; set(x, y, c); }));
makeTile('grindstone_leg', (set, r) => pPl(set, r, [120, 88, 52], true));
makeTile('stonecutter_top', (set, r) => each((x, y) => { let c = vary([150, 150, 150], r, 6); if (x === 0 || y === 0 || x === 15 || y === 15) c = [110, 110, 110]; if (x >= 7 && x <= 8) c = [70, 70, 72]; set(x, y, c); }));
makeTile('stonecutter_side', (set, r) => each((x, y) => { let c = vary([128, 128, 128], r, 6); if (y < 3) c = vary([150, 120, 80], r, 6); set(x, y, c); }));
makeTile('saw', (set, r) => { clear(set); each((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 7.5 && (d < 6.5 || (Math.atan2(y - 7.5, x - 7.5) * 4 / Math.PI * 2 | 0) % 2)) set(x, y, d < 2 ? [90, 90, 90] : vary([200, 200, 206], r, 6)); }); });
makeTile('brewing_base', (set, r) => each((x, y) => set(x, y, vary([110, 110, 110], r, 10))));
makeTile('brewing_rod', (set, r) => each((x, y) => set(x, y, vary([200, 170, 60], r, 10))));
makeTile('nether_wart0', (set, r) => { clear(set); for (const x0 of [3, 8, 12]) for (let y = 11; y < 16; y++) { set(x0, y, vary([120, 30, 30], r, 10)); if (y > 12) set(x0 + 1, y, vary([140, 36, 36], r, 10)); } });
makeTile('nether_wart1', (set, r) => { clear(set); for (const [x0, h] of [[2, 9], [7, 6], [11, 8]]) { for (let y = h; y < 16; y++) { set(x0, y, vary([110, 24, 28], r, 8)); set(x0 + 1, y, vary([130, 30, 32], r, 8)); } for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 3; dx++) if (dx * dx + dy * dy < 6) set(x0 + dx, h + dy, vary([170, 40, 44], r, 10)); } });
makeTile('chorus_plant', (set, r) => each((x, y) => { const q = r(); set(x, y, q < 0.15 ? vary([70, 44, 74], r, 6) : q < 0.3 ? vary([138, 104, 140], r, 6) : vary([98, 66, 104], r, 8)); }));
makeTile('chorus_flower', (set, r) => each((x, y) => { const e = x < 2 || x > 13 || y < 2 || y > 13; set(x, y, e ? vary([120, 88, 126], r, 6) : vary([196, 168, 204], r, 10)); if (!e && (x + y) % 5 === 0) set(x, y, [226, 206, 232]); }));
makeTile('end_stone_bricks', (set, r) => each((x, y) => { const row = Math.floor(y / 8), off = row % 2 ? 4 : 0; const m = y % 8 === 7 || (x + off) % 8 === 7; set(x, y, m ? vary([196, 196, 150], r, 4) : vary([226, 226, 172], r, 6)); }));
makeTile('end_rod', (set, r) => { clear(set); for (let y = 0; y < 16; y++) { set(7, y, [250, 248, 240]); set(8, y, [230, 226, 214]); } for (let x = 5; x <= 10; x++) { set(x, 15, [160, 120, 170]); set(x, 14, [180, 140, 190]); } });
makeTile('tuff_bricks', brickTile([108, 110, 100], [80, 82, 74])); makeTile('trial_spawner', (set, r) => each((x, y) => { const e = x === 0 || y === 0 || x === 15 || y === 15 || x === 7 || y === 7; set(x, y, e ? vary([60, 66, 70], r, 5) : vary([28, 30, 36], r, 5)); if (!e && (x + y) % 5 === 0) set(x, y, [230, 140, 50]); }));
makeTile('vault', (set, r) => each((x, y) => { const e = x < 2 || y < 2 || x > 13 || y > 13; set(x, y, e ? vary([70, 74, 80], r, 5) : (x > 5 && x < 10 && y > 5 && y < 10) ? [240, 200, 90] : vary([40, 42, 48], r, 5)); }));
makeTile('prismarine', (set, r) => each((x, y) => set(x, y, vary(((x >> 2) + (y >> 2)) % 3 ? [98, 160, 144] : [86, 140, 150], r, 10)))); makeTile('prismarine_bricks', brickTile([100, 170, 152], [70, 120, 110], 8, 8));
makeTile('dark_prismarine', brickTile([52, 92, 76], [36, 66, 54], 8, 8)); makeTile('sea_lantern', (set, r) => each((x, y) => { const e = x < 2 || y < 2 || x > 13 || y > 13; set(x, y, e ? [170, 210, 200] : vary([230, 246, 240], r, 10)); }));
makeTile('sponge', (set, r) => each((x, y) => set(x, y, r() < 0.2 ? [170, 160, 50] : vary([214, 204, 80], r, 10)))); makeTile('wet_sponge', (set, r) => each((x, y) => set(x, y, r() < 0.25 ? [120, 120, 40] : vary([170, 170, 70], r, 10))));
makeTile('deepslate_bricks', brickTile([72, 72, 78], [44, 44, 50], 4, 8)); makeTile('deepslate_tiles', brickTile([56, 56, 62], [32, 32, 38], 8, 8));
makeTile('sculk', (set, r) => each((x, y) => { let c = vary([14, 30, 40], r, 6); if (r() < 0.08) c = [40, 200, 210]; set(x, y, c); }));
makeTile('sculk_sensor', (set, r) => each((x, y) => { let c = vary([20, 50, 64], r, 6); if (y < 4 && (x === 4 || x === 11)) c = [40, 220, 220]; set(x, y, c); }));
makeTile('sculk_shrieker', (set, r) => each((x, y) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); set(x, y, d < 3 ? [220, 230, 210] : d < 5 ? [20, 40, 50] : vary([40, 44, 48], r, 6)); }));
makeTile('reinforced_deepslate', (set, r) => each((x, y) => { const e = x < 2 || y < 2 || x > 13 || y > 13; set(x, y, e ? vary([190, 180, 160], r, 6) : vary([60, 60, 66], r, 6)); }));
makeTile('tall_grass', (set, r) => { clear(set); for (let b = 0; b < 8; b++) { let x = 1 + r() * 14; const h = 5 + r() * 9 | 0; const lean = (r() - 0.5) * 0.35; for (let i = 0; i < h; i++) { set(Math.round(x), 15 - i, vary([84, 152, 52], r, 18)); x += lean; } } });
makeTile('flower_red', (set, r) => pFlower(set, r, [212, 34, 30], [250, 210, 60]));
makeTile('flower_yellow', (set, r) => pFlower(set, r, [246, 214, 40], [200, 120, 20]));
makeTile('dead_bush', (set, r) => { clear(set); const C = [120, 82, 40]; pLine(set, 7, 15, 7, 8, C); pLine(set, 7, 10, 3, 5, C); pLine(set, 7, 11, 12, 4, C); pLine(set, 5, 7, 5, 3, C); pLine(set, 10, 6, 13, 6, C); pLine(set, 7, 8, 8, 3, C); });
makeTile('torch', (set, r) => { clear(set); for (let y = 8; y < 16; y++) { set(7, y, [128, 96, 54]); set(8, y, [100, 74, 40]); } set(7, 6, [255, 236, 120]); set(8, 6, [255, 210, 80]); set(7, 7, [255, 170, 50]); set(8, 7, [240, 140, 40]); });
makeTile('spawner', (set, r) => each((x, y) => { if (x % 5 === 0 || y % 5 === 0 || x === 15 || y === 15) set(x, y, vary([36, 48, 64], r, 6)); else set(x, y, [0, 0, 0], 0); }));
makeTile('stone_bricks', (set, r) => each((x, y) => { const row = y >> 3; const m = (y & 7) === 7 || ((x + row * 8) & 15) === 15 || ((x + row * 8) & 15) === 7 && false; let c = m ? vary([84, 84, 84], r, 4) : vary([124, 124, 124], r, 7); if (!m && ((y & 7) === 0)) c = vary([140, 140, 140], r, 4); set(x, y, c); }));
const pSB = (set, r, tint, crack) => each((x, y) => { const row = y >> 3; const m = (y & 7) === 7 || ((x + row * 8) & 15) === 15; let c = m ? vary([84, 84, 84], r, 4) : vary([124, 124, 124], r, 7); if (!m && ((y & 7) === 0)) c = vary([140, 140, 140], r, 4); set(x, y, c); });
makeTile('mossy_stone_bricks', (set, r, get) => { pSB(set, r); each((x, y) => { const q = Math.sin(x * 0.9 + y * 0.4) + Math.sin(y * 0.7 - x * 0.3); if (q > 0.6 || (y > 11 && r() < 0.5)) set(x, y, vary([88, 112, 52], r, 12)); }); });
makeTile('cracked_stone_bricks', (set, r) => { pSB(set, r); let x = 3 + (r() * 4 | 0), y = 0; while (y < 16) { set(x, y, [62, 62, 62]); if (r() < 0.5) x += r() < 0.5 ? 1 : -1; y++; } x = 9 + (r() * 4 | 0); for (y = 6; y < 14; y++) { set(x, y, [70, 70, 70]); if (r() < 0.4) x++; } });
makeTile('iron_bars', (set, r) => { clear(set); for (let y = 0; y < 16; y++) for (const x of [1, 5, 10, 14]) { set(x, y, [120, 122, 126]); set(x + 1, y, [80, 82, 86]); } for (const y of [0, 15]) for (let x = 0; x < 16; x++) set(x, y, [100, 102, 106]); });
makeTile('dark_oak_planks', (set, r) => pPlanks(set, r, [66, 44, 22]));
// --- nether & end tiles ---
function pNetherrack(set, r) { each((x, y) => { let c = vary([112, 48, 46], r, 10); const q = r(); if (q < 0.18) c = vary([84, 32, 32], r, 6); else if (q < 0.26) c = vary([140, 66, 62], r, 6); set(x, y, c); }); }
makeTile('debris_side', (set, r) => each((x, y) => { let c = vary([98, 66, 58], r, 8); const band = (x * 3 + y * 7 + Math.floor(r() * 3)) % 9; if (band < 2) c = vary([128, 92, 80], r, 6); else if (band > 7) c = vary([62, 42, 38], r, 5); if ((y === 3 || y === 9 || y === 14) && r() < 0.8) c = vary([70, 48, 44], r, 4); set(x, y, c); }));
makeTile('debris_top', (set, r) => each((x, y) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); const ring = Math.floor(d) % 3; let c = vary(ring === 0 ? [118, 82, 72] : ring === 1 ? [92, 62, 56] : [72, 50, 46], r, 6); if (d > 6.5) c = vary([60, 40, 36], r, 4); set(x, y, c); }));
makeTile('netherite_block', (set, r) => each((x, y) => { let c = vary([66, 60, 64], r, 5); if (x === 0 || y === 0) c = [96, 88, 92]; else if (x === 15 || y === 15) c = [40, 36, 40]; else if ((x === 5 || x === 10) && r() < 0.6) c = vary([54, 48, 52], r, 3); set(x, y, c); }));
makeTile('smith_top', (set, r) => each((x, y) => { let c = vary([58, 60, 70], r, 6); if (x === 0 || y === 0 || x === 15 || y === 15) c = [34, 36, 44]; else if (y === 7 || y === 8) c = vary([84, 86, 96], r, 4); set(x, y, c); }));
makeTile('smith_side', (set, r) => { pPlanks(set, r, [112, 72, 48]); for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) set(x, y, vary(y === 3 ? [34, 36, 44] : [58, 60, 70], r, 5)); });
makeTile('smith_front', (set, r) => { pPlanks(set, r, [112, 72, 48]); for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) set(x, y, vary(y === 3 ? [34, 36, 44] : [58, 60, 70], r, 5)); for (const [x, y] of [[5, 7], [6, 7], [9, 7], [10, 7], [5, 8], [10, 8], [5, 11], [6, 11], [9, 11], [10, 11]]) set(x, y, [200, 200, 210]); });
makeTile('smith_bottom', (set, r) => pPlanks(set, r, [96, 62, 40]));
makeTile('deepslate', pDeepslate);
makeTile('deepslate_top', (set, r) => { each((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); let c = vary([82, 82, 88], r, 6); if (Math.floor(d) % 3 === 0) c = vary([66, 66, 72], r, 4); set(x, y, c); }); });
makeTile('cobbled_deepslate', (set, r) => { pCobble(set, r, false); each((x, y) => { }); });
makeTile('tuff', (set, r) => pSpeckled(set, r, [108, 109, 102], [88, 90, 84], [132, 132, 122], 0.18, 0.1));
makeTile('granite', (set, r) => pSpeckled(set, r, [152, 106, 88], [118, 78, 62], [190, 146, 128], 0.2, 0.14));
makeTile('diorite', (set, r) => pSpeckled(set, r, [192, 192, 194], [128, 128, 130], [232, 232, 232], 0.16, 0.18));
makeTile('andesite', (set, r) => pSpeckled(set, r, [134, 134, 136], [112, 112, 114], [158, 158, 160], 0.2, 0.12));
makeTile('copper_ore', (set, r) => pOre(set, r, [198, 112, 74], [126, 178, 140]));
makeTile('redstone_ore', (set, r) => pOre(set, r, [176, 16, 14], [255, 70, 60]));
makeTile('emerald_ore', (set, r) => pOre(set, r, [40, 190, 80], [150, 255, 170]));
makeTile('lapis_ore_d', (set, r) => pOre(set, r, [36, 70, 176], [90, 130, 230], pDeepslate));
for (const [k, c, h] of [['coal', [38, 38, 38], [70, 70, 70]], ['iron', [200, 160, 128], [228, 196, 170]], ['gold', [236, 204, 44], [255, 246, 140]], ['diamond', [80, 220, 214], [200, 255, 250]], ['copper', [198, 112, 74], [126, 178, 140]], ['redstone', [176, 16, 14], [255, 70, 60]], ['emerald', [40, 190, 80], [150, 255, 170]]])
  makeTile('deepslate_' + k + '_ore', (set, r) => pOre(set, r, c, h, pDeepslate));
// storage blocks: bevelled squares with a bright top-left edge and a dark bottom-right edge, like Minecraft's
function storeTile(base, hi, lo, pat) { return (set, r) => each((x, y) => { let c = vary(base, r, 6); if (x === 0 || y === 0) c = hi; else if (x === 15 || y === 15) c = lo; else if (pat) { const q = pat(x, y, r); if (q) c = vary(q, r, 5); } set(x, y, c); }); }
makeTile('iron_block', storeTile([214, 214, 216], [242, 242, 244], [160, 160, 164], (x, y) => (x === 1 || y === 1) ? [234, 234, 236] : (y % 5 === 0) ? [196, 196, 200] : null));
makeTile('gold_block', storeTile([246, 208, 62], [255, 246, 140], [196, 140, 20], (x, y) => (x === 1 || y === 1) ? [255, 232, 100] : ((x + y) % 7 === 0) ? [232, 186, 40] : null));
makeTile('diamond_block', storeTile([98, 226, 216], [196, 255, 250], [40, 150, 144], (x, y) => (x === 1 || y === 1) ? [150, 244, 236] : ((x * 3 + y) % 9 === 0) ? [70, 196, 188] : null));
makeTile('emerald_block', storeTile([64, 204, 110], [150, 250, 180], [20, 120, 60], (x, y) => ((x % 4 === 1) && (y % 4 === 1)) ? [120, 240, 160] : null));
makeTile('coal_block', storeTile([24, 24, 26], [52, 52, 56], [10, 10, 12], (x, y, r) => r() < 0.08 ? [44, 44, 48] : null));
makeTile('redstone_block', storeTile([170, 24, 14], [230, 70, 50], [110, 10, 6], (x, y, r) => ((x + y) % 5 === 0 && r() < 0.7) ? [210, 40, 24] : null));
makeTile('anvil_side', (set, r) => each((x, y) => { let c = vary([68, 68, 70], r, 5); if (y % 4 === 0) c = vary([56, 56, 58], r, 4); if (x === 0 || x === 15) c = [50, 50, 52]; set(x, y, c); }));
for (const [k, cracks] of [['anvil_top', 0], ['anvil_top_chipped', 1], ['anvil_top_damaged', 2]]) makeTile(k, (set, r) => { const rr = mulberry32(31 + cracks); each((x, y) => { let c = vary([74, 74, 76], r, 5); if (x >= 3 && x <= 12) c = vary([92, 92, 96], r, 5); if (x === 3 || x === 12) c = [58, 58, 60]; set(x, y, c); }); for (let n = 0; n < cracks * 3; n++) { let x = 4 + (rr() * 8 | 0), y = rr() * 16 | 0; for (let k2 = 0; k2 < 5; k2++) { set(x, y, [36, 36, 38]); x += rr() < 0.5 ? 1 : -1; y += rr() < 0.6 ? 1 : 0; x = Math.max(4, Math.min(11, x)); if (y > 15) break; } } });
makeTile('copper_block', (set, r) => each((x, y) => { let c = vary([192, 108, 78], r, 7); if (x === 0 || y === 0) c = [222, 140, 104]; else if (x === 15 || y === 15) c = [140, 72, 50]; set(x, y, c); }));
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
for (let st = 0; st < 4; st++) makeTile('carrots' + st, (set, r) => { clear(set); const H = 3 + st * 2.6; for (const cx of [2, 6, 10, 13]) { const h = Math.round(H - r() * 1.5); for (let y = 0; y < h; y++) { set(cx, 15 - y, vary([60 + st * 8, 140 + st * 6, 40], r, 12)); if (y > h * 0.4) { set(cx - 1, 15 - y - 1, vary([70, 160, 50], r, 10)); set(cx + 1, 15 - y, vary([52, 128, 36], r, 10)); } } if (st === 3) { set(cx, 15, [232, 130, 28]); set(cx - 1, 15, [214, 110, 20]); set(cx, 14, [246, 150, 40]); } } });
for (let st = 0; st < 4; st++) makeTile('potatoes' + st, (set, r) => { clear(set); const H = 3 + st * 2.4; for (const cx of [2, 6, 10, 13]) { const h = Math.round(H - r() * 1.5); for (let y = 0; y < h; y++) { set(cx, 15 - y, vary([66, 132, 46], r, 10)); if (y > 1 && y % 2 === 0) { set(cx - 1, 15 - y, vary([84, 156, 58], r, 10)); set(cx + 1, 15 - y - 1, vary([84, 156, 58], r, 10)); } } if (st === 3) { set(cx, 15 - h, [236, 236, 230]); set(cx - 1, 15, [196, 160, 90]); set(cx + 1, 15, [176, 140, 74]); } } });
// rails: steel (or gold) rails along the tile's height, wooden ties across; curves bend from the bottom edge to the right edge
function railTile(railC, mid, curve) { return (set, r) => { clear(set);
  const tie = (x, y) => set(x, y, vary([118, 86, 54], r, 8));
  if (!curve) { for (let y = 0; y < 16; y++) { if (y % 4 === 1 || y % 4 === 2) for (let x = 1; x < 15; x++) tie(x, y); set(2, y, railC[0]); set(3, y, railC[1]); set(12, y, railC[0]); set(13, y, railC[1]); if (mid) { set(7, y, mid); set(8, y, mid); } } }
  else { for (let a = 0; a < 40; a++) { const t = a / 39 * Math.PI / 2; for (const [R, c] of [[2.5, 0], [3.5, 1], [12.5, 0], [13.5, 1]]) set(Math.round(15.5 - Math.cos(t) * R), Math.round(15.5 - Math.sin(t) * R), railC[c]); } for (let k = 0; k < 4; k++) { const t = (k + 0.5) / 4 * Math.PI / 2; for (let R = 1; R < 15; R++) tie(Math.round(15.5 - Math.cos(t) * R), Math.round(15.5 - Math.sin(t) * R)); } for (let a = 0; a < 40; a++) { const t = a / 39 * Math.PI / 2; for (const [R, c] of [[2.5, 0], [3.5, 1], [12.5, 0], [13.5, 1]]) set(Math.round(15.5 - Math.cos(t) * R), Math.round(15.5 - Math.sin(t) * R), railC[c]); } } }; }
const STEEL = [[196, 196, 200], [140, 140, 146]], GOLDR = [[246, 210, 70], [200, 160, 40]];
makeTile('rail', railTile(STEEL)); makeTile('rail_corner', railTile(STEEL, null, true));
makeTile('powered_rail', railTile(GOLDR, [110, 30, 24])); makeTile('powered_rail_on', railTile(GOLDR, [255, 60, 40]));
makeTile('detector_rail', railTile(STEEL, [90, 70, 70])); makeTile('detector_rail_on', railTile(STEEL, [230, 50, 40]));
makeTile('activator_rail', railTile(STEEL, [130, 60, 50])); makeTile('activator_rail_on', railTile(STEEL, [250, 90, 60]));
makeTile('lever', (set, r) => { clear(set); for (let y = 2; y < 12; y++) { set(7, y, [128, 96, 54]); set(8, y, [100, 74, 40]); } });
makeTile('lever_base', (set, r) => each((x, y) => set(x, y, vary([120, 120, 124], r, 6))));
makeTile('redstone_torch', (set, r) => { clear(set); for (let y = 8; y < 16; y++) { set(7, y, [128, 96, 54]); set(8, y, [100, 74, 40]); } set(7, 6, [255, 80, 50]); set(8, 6, [230, 40, 30]); set(7, 7, [200, 30, 20]); set(8, 7, [170, 20, 16]); });
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
defBlock('iron_ore', 'Iron Ore', { tex: 'iron_ore', hardness: 3, tool: 'pick', tier: 2, drop: 'raw_iron' });
defBlock('gold_ore', 'Gold Ore', { tex: 'gold_ore', hardness: 3, tool: 'pick', tier: 3, drop: 'raw_gold' });
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
defBlock('glowstone', 'Glowstone', { tex: 'glowstone', hardness: 0.3, light: 1, snd: 'glass', drop: (r) => ['glowstone_dust', 2 + Math.floor(r * 3)] });
defBlock('furnace', 'Furnace', { tex: { s: 'furnace_side', pz: 'furnace_front', t: 'stone' }, hardness: 3.5, tool: 'pick', tier: 1, use: 'table' });
defBlock('birch_log', 'Birch Log', { tex: { s: 'birch_side', t: 'birch_top' }, hardness: 2, snd: 'wood' });
defBlock('birch_leaves', 'Birch Leaves', { tex: 'birch_leaves', opaque: false, render: 'cutout', cullSame: true, hardness: 0.2, snd: 'grass', drop: (r) => r < 0.1 ? ['stick', 1] : null });
defBlock('spruce_log', 'Spruce Log', { tex: { s: 'spruce_side', t: 'spruce_top' }, hardness: 2, snd: 'wood' });
defBlock('jungle_log', 'Jungle Log', { tex: { s: 'jungle_side', t: 'jungle_top' }, hardness: 2, snd: 'wood' });
defBlock('jungle_leaves', 'Jungle Leaves', { tex: 'jungle_leaves', opaque: false, render: 'cutout', cullSame: true, hardness: 0.2, snd: 'grass', drop: (r) => r < 0.1 ? ['stick', 1] : null });
defBlock('dark_oak_log', 'Dark Oak Log', { tex: { s: 'dark_oak_side', t: 'dark_oak_top' }, hardness: 2, snd: 'wood' });
defBlock('dark_oak_leaves', 'Dark Oak Leaves', { tex: 'dark_oak_leaves', opaque: false, render: 'cutout', cullSame: true, hardness: 0.2, snd: 'grass', drop: (r) => r < 0.05 ? ['apple', 1] : r < 0.15 ? ['stick', 1] : null });
defBlock('acacia_log', 'Acacia Log', { tex: { s: 'acacia_side', t: 'acacia_top' }, hardness: 2, snd: 'wood' });
defBlock('acacia_leaves', 'Acacia Leaves', { tex: 'acacia_leaves', opaque: false, render: 'cutout', cullSame: true, hardness: 0.2, snd: 'grass', drop: (r) => r < 0.1 ? ['stick', 1] : null });
defBlock('vine', 'Vines', { tex: 'vine', solid: false, opaque: false, render: 'cross', hardness: 0.2, snd: 'grass', plant: true, drop: null, climb: true });
// ladders: a thin board against the wall they were placed on (ladder = wall to the north; _s/_e/_w the others)
for (const [k, bx] of [['ladder', [0, 0, 0, 16, 16, 1]], ['ladder_s', [0, 0, 15, 16, 16, 16]], ['ladder_w', [0, 0, 0, 1, 16, 16]], ['ladder_e', [15, 0, 0, 16, 16, 16]]])
  defBlock(k, 'Ladder', { tex: 'ladder', render: 'boxes', boxes: [bx], solid: false, opaque: false, hardness: 0.4, tool: 'axe', snd: 'wood', climb: true, drop: 'ladder', hidden: k !== 'ladder', flatIcon: true, ladder: true });
defBlock('lily_pad', 'Lily Pad', { tex: 'lily_pad', solid: false, opaque: false, render: 'flat', hardness: 0, snd: 'grass' });
defBlock('cobweb', 'Cobweb', { tex: 'cobweb', solid: false, opaque: false, render: 'cross', hardness: 4, snd: 'wool', drop: 'string', web: true });
defBlock('ice', 'Ice', { tex: 'ice', opaque: false, render: 'cutout', cullSame: true, hardness: 0.5, snd: 'glass', drop: null, slippery: true });
defBlock('packed_ice', 'Packed Ice', { tex: 'packed_ice', hardness: 0.5, snd: 'glass', drop: null, slippery: true });
defBlock('cauldron', 'Cauldron', { tex: { s: 'cauldron_side', t: 'cauldron_side', b: 'cauldron_side' }, opaque: false, render: 'boxes', boxes: [[0, 3, 0, 16, 16, 2], [0, 3, 14, 16, 16, 16], [0, 3, 2, 2, 16, 14], [14, 3, 2, 16, 16, 14], [2, 3, 2, 14, 4, 14], [0, 0, 0, 4, 3, 4], [12, 0, 0, 16, 3, 4], [0, 0, 12, 4, 3, 16], [12, 0, 12, 16, 3, 16]], hardness: 2, tool: 'pick', tier: 1 });
defBlock('oak_fence', 'Oak Fence', { tex: 'fence', opaque: false, render: 'boxes', boxes: [[6, 0, 6, 10, 16, 10]], hardness: 2, snd: 'wood', fence: true });
defBlock('purpur_block', 'Purpur Block', { tex: 'purpur_block', hardness: 1.5, tool: 'pick', tier: 1 }); defBlock('purpur_pillar', 'Purpur Pillar', { tex: 'purpur_pillar', hardness: 1.5, tool: 'pick', tier: 1 });
defBlock('end_stone_bricks', 'End Stone Bricks', { tex: 'end_stone_bricks', hardness: 3, tool: 'pick', tier: 1 });
defBlock('end_rod', 'End Rod', { tex: 'end_rod', solid: false, opaque: false, render: 'torch', hardness: 0, light: 0.9, snd: 'wood' });
// villager workstations (Minecraft job site blocks); some also work on their own
defBlock('composter', 'Composter', { tex: { s: 'composter_side', t: 'composter_top', b: 'composter_side' }, hardness: 0.6, tool: 'axe', snd: 'wood', use: 'composter', job: 'farmer' });
defBlock('smoker', 'Smoker', { tex: { s: 'smoker_side', pz: 'smoker_front', t: 'smoker_top', b: 'smoker_top' }, hardness: 3.5, tool: 'pick', tier: 1, use: 'furnace', fast: 'smoker', job: 'butcher' });
defBlock('blast_furnace', 'Blast Furnace', { tex: { s: 'blast_side', pz: 'blast_front', t: 'blast_top', b: 'blast_side' }, hardness: 3.5, tool: 'pick', tier: 1, use: 'furnace', fast: 'blast', job: 'armorer' });
defBlock('cartography_table', 'Cartography Table', { tex: { s: 'carto_side', t: 'carto_top', b: 'planks' }, hardness: 2.5, tool: 'axe', snd: 'wood', job: 'cartographer' });
defBlock('fletching_table', 'Fletching Table', { tex: { s: 'fletch_side', t: 'fletch_top', b: 'planks' }, hardness: 2.5, tool: 'axe', snd: 'wood', job: 'fletcher' });
defBlock('loom', 'Loom', { tex: { s: 'loom_side', t: 'loom_top', b: 'planks' }, hardness: 2.5, tool: 'axe', snd: 'wood', job: 'shepherd' });
defBlock('barrel', 'Barrel', { tex: { s: 'barrel_side', t: 'barrel_top', b: 'barrel_top' }, hardness: 2.5, tool: 'axe', snd: 'wood', use: 'chest', job: 'fisherman' });
defBlock('lectern', 'Lectern', { tex: { s: 'lectern_side', t: 'lectern_top', b: 'planks' }, render: 'boxes', boxes: [[0, 0, 0, 16, 2, 16], [4, 2, 4, 12, 13, 12], [0, 13, 0, 16, 16, 16]], opaque: false, hardness: 2.5, tool: 'axe', snd: 'wood', job: 'librarian' });
defBlock('grindstone', 'Grindstone', { tex: 'grindstone', render: 'boxes', boxes: [[2, 0, 6, 4, 7, 10, TILE.grindstone_leg], [12, 0, 6, 14, 7, 10, TILE.grindstone_leg], [4, 4, 2, 12, 16, 14]], opaque: false, hardness: 2, tool: 'pick', use: 'grindstone', job: 'weaponsmith' });
defBlock('stonecutter', 'Stonecutter', { tex: { s: 'stonecutter_side', t: 'stonecutter_top', b: 'stonecutter_side' }, render: 'boxes', boxes: [[0, 0, 0, 16, 9, 16], [1, 9, 7.5, 15, 16, 8.5, TILE.saw]], opaque: false, hardness: 3.5, tool: 'pick', use: 'stonecutter', job: 'mason' });
defBlock('brewing_stand', 'Brewing Stand', { tex: 'brewing_base', render: 'boxes', boxes: [[1, 0, 1, 7, 2, 7], [9, 0, 1, 15, 2, 7], [5, 0, 9, 11, 2, 15], [7, 0, 7, 9, 14, 9, TILE.brewing_rod]], solid: false, opaque: false, hardness: 0.5, tool: 'pick', light: 0.1, use: 'brew', job: 'cleric' });
defBlock('nether_wart_0', 'Nether Wart', { tex: 'nether_wart0', solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', drop: 'nether_wart', hidden: true, wart: 0 });
defBlock('nether_wart_1', 'Nether Wart', { tex: 'nether_wart1', solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', drop: (q) => ['nether_wart', 2 + Math.floor(q * 3)], hidden: true, wart: 1 });
defBlock('chorus_plant', 'Chorus Plant', { tex: 'chorus_plant', render: 'boxes', boxes: [[3, 0, 3, 13, 16, 13]], opaque: false, hardness: 0.4, tool: 'axe', snd: 'wood', drop: (q) => q < 0.5 ? 'chorus_fruit' : null, chorus: true });
defBlock('chorus_flower', 'Chorus Flower', { tex: 'chorus_flower', render: 'boxes', boxes: [[1, 0, 1, 15, 14, 15]], opaque: false, hardness: 0.4, tool: 'axe', snd: 'wood', chorus: true });
defBlock('end_gateway', 'End Gateway', { tex: 'end_portal', solid: false, opaque: false, render: 'cutout', hardness: -1, drop: null, light: 1, noTarget: true });
defBlock('tuff_bricks', 'Tuff Bricks', { tex: 'tuff_bricks', hardness: 1.5, tool: 'pick', tier: 1 });
defBlock('trial_spawner', 'Trial Spawner', { tex: 'trial_spawner', opaque: false, render: 'cutout', hardness: 50, tool: 'pick', tier: 1, drop: null, light: 0.2 });
defBlock('vault', 'Vault', { tex: 'vault', hardness: 50, tool: 'pick', tier: 1, drop: null, light: 0.4, use: 'vault' });
defBlock('prismarine', 'Prismarine', { tex: 'prismarine', hardness: 1.5, tool: 'pick', tier: 1 }); defBlock('prismarine_bricks', 'Prismarine Bricks', { tex: 'prismarine_bricks', hardness: 1.5, tool: 'pick', tier: 1 });
defBlock('dark_prismarine', 'Dark Prismarine', { tex: 'dark_prismarine', hardness: 1.5, tool: 'pick', tier: 1 }); defBlock('sea_lantern', 'Sea Lantern', { tex: 'sea_lantern', hardness: 0.3, snd: 'glass', light: 1, drop: (r) => ['prismarine_crystals', 2 + Math.floor(r * 2)] });
defBlock('sponge', 'Sponge', { tex: 'sponge', hardness: 0.6, snd: 'grass' }); defBlock('wet_sponge', 'Wet Sponge', { tex: 'wet_sponge', hardness: 0.6, snd: 'grass' });
defBlock('deepslate_bricks', 'Deepslate Bricks', { tex: 'deepslate_bricks', hardness: 3.5, tool: 'pick', tier: 1 }); defBlock('deepslate_tiles', 'Deepslate Tiles', { tex: 'deepslate_tiles', hardness: 3.5, tool: 'pick', tier: 1 });
defBlock('sculk', 'Sculk', { tex: 'sculk', hardness: 0.2, snd: 'grass', drop: null }); defBlock('sculk_sensor', 'Sculk Sensor', { tex: { s: 'sculk_sensor', t: 'sculk_sensor', b: 'sculk' }, hardness: 1.5, snd: 'grass', light: 0.1, drop: null });
defBlock('sculk_shrieker', 'Sculk Shrieker', { tex: { s: 'sculk', t: 'sculk_shrieker', b: 'sculk' }, hardness: 3, snd: 'grass', drop: null }); defBlock('reinforced_deepslate', 'Reinforced Deepslate', { tex: { s: 'reinforced_deepslate', t: 'deepslate_tiles', b: 'deepslate_tiles' }, hardness: -1, drop: null });
defBlock('spruce_leaves', 'Spruce Leaves', { tex: 'spruce_leaves', opaque: false, render: 'cutout', cullSame: true, hardness: 0.2, snd: 'grass', drop: (r) => r < 0.1 ? ['stick', 1] : null });
defBlock('tall_grass', 'Tall Grass', { tex: 'tall_grass', solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', drop: (r) => r < 0.125 ? ['wheat_seeds', 1] : null, plant: true });
defBlock('rose', 'Rose', { tex: 'flower_red', solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', plant: true });
defBlock('dandelion', 'Dandelion', { tex: 'flower_yellow', solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', plant: true });
defBlock('dead_bush', 'Dead Bush', { tex: 'dead_bush', solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', drop: (r) => r < 0.5 ? ['stick', 1] : null, plant: true });
defBlock('torch', 'Torch', { tex: 'torch', solid: false, opaque: false, render: 'torch', hardness: 0, light: 0.95, snd: 'wood' });
defBlock('spawner', 'Monster Spawner', { tex: 'spawner', opaque: false, render: 'cutout', hardness: 5, tool: 'pick', tier: 1, drop: null, snd: 'stone' });
defBlock('stone_bricks', 'Stone Bricks', { tex: 'stone_bricks', hardness: 1.5, tool: 'pick', tier: 1 });
defBlock('mossy_stone_bricks', 'Mossy Stone Bricks', { tex: 'mossy_stone_bricks', hardness: 1.5, tool: 'pick', tier: 1 });
defBlock('cracked_stone_bricks', 'Cracked Stone Bricks', { tex: 'cracked_stone_bricks', hardness: 1.5, tool: 'pick', tier: 1 });
defBlock('iron_bars', 'Iron Bars', { tex: 'iron_bars', render: 'boxes', boxes: [[7, 0, 0, 9, 16, 16], [0, 0, 7, 16, 16, 9]], opaque: false, hardness: 5, tool: 'pick', tier: 1 });
defBlock('dark_oak_planks', 'Dark Oak Planks', { tex: 'dark_oak_planks', hardness: 2, snd: 'wood' });
defBlock('snow_block', 'Snow Block', { tex: 'snow', hardness: 0.3, snd: 'snow', drop: ['snowball', 4] });
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
for (let st = 0; st < 4; st++) defBlock('wheat_' + st, 'Wheat Crops', { tex: 'wheat' + st, solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', plant: true, hidden: st > 0, crop: st, cropBase: 'wheat_', drop: st < 3 ? 'wheat_seeds' : (r) => ['wheat', 1] });
for (let st = 0; st < 4; st++) defBlock('carrots_' + st, 'Carrots', { tex: 'carrots' + st, solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', plant: true, hidden: true, crop: st, cropBase: 'carrots_', drop: st < 3 ? 'carrot' : (r) => ['carrot', 2 + Math.floor(r * 4)] });
for (let st = 0; st < 4; st++) defBlock('potatoes_' + st, 'Potatoes', { tex: 'potatoes' + st, solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', plant: true, hidden: true, crop: st, cropBase: 'potatoes_', drop: st < 3 ? 'potato' : (r) => ['potato', 2 + Math.floor(r * 4)] });
// rails: every shape is its own block (so saves and multiplayer just work). Shapes: ns, ew, asc_e/w/n/s (rising toward
// that side), and curves se/sw/nw/ne (plain rails only). Powered, detector and activator rails also have an "on" version.
const RAIL_SHAPES = ['ns', 'ew', 'asc_e', 'asc_w', 'asc_n', 'asc_s', 'se', 'sw', 'nw', 'ne'];
const RAIL_ID = {};
for (const [type, name, tex] of [['rail', 'Rail', 'rail'], ['powered_rail', 'Powered Rail', 'powered_rail'], ['detector_rail', 'Detector Rail', 'detector_rail'], ['activator_rail', 'Activator Rail', 'activator_rail']]) {
  RAIL_ID[type] = {}; for (const shape of RAIL_SHAPES) { if (type !== 'rail' && shape.length === 2 && shape !== 'ns' && shape !== 'ew') continue;
    for (const on of type === 'rail' ? [false] : [false, true]) { const key = type + (shape === 'ns' && !on ? '' : '_' + shape + (on ? '_on' : ''));
      const t = shape.length === 2 && shape !== 'ns' && shape !== 'ew' ? 'rail_corner' : tex + (on ? '_on' : '');
      const id = defBlock(key, name, { tex: t, solid: false, opaque: false, render: 'rail', hardness: 0.7, snd: 'stone', drop: type, hidden: key !== type, rail: { type, shape, on }, light: on && type === 'powered_rail' ? 0 : 0 });
      (RAIL_ID[type][shape] || (RAIL_ID[type][shape] = {}))[on ? 1 : 0] = id; } } }
defBlock('lever', 'Lever', { tex: 'lever_base', solid: false, opaque: false, render: 'boxes', boxes: [[5, 0, 4, 11, 2, 12], [7, 2, 3, 9, 11, 5, TILE.lever]], hardness: 0.5, snd: 'wood', use: 'lever', power: 0 });
defBlock('lever_on', 'Lever', { tex: 'lever_base', solid: false, opaque: false, render: 'boxes', boxes: [[5, 0, 4, 11, 2, 12], [7, 2, 11, 9, 11, 13, TILE.lever]], hardness: 0.5, snd: 'wood', use: 'lever', power: 15, hidden: true, drop: 'lever' });
defBlock('redstone_torch', 'Redstone Torch', { tex: 'redstone_torch', solid: false, opaque: false, render: 'torch', hardness: 0, light: 0.45, snd: 'wood', power: 15 });
defBlock('hay_block', 'Hay Bale', { tex: { s: 'hay_side', t: 'hay_top' }, hardness: 0.5, snd: 'grass' });
defBlock('enchanting_table', 'Enchanting Table', { tex: { s: 'ench_side', t: 'ench_top', b: 'ench_bottom' }, hardness: 5, tool: 'pick', tier: 1, light: 0.45, use: 'enchant' });
// flowing liquids: levels 1-7 spread outward, 8 is falling. B.WATER / B.LAVA are the source blocks
for (let L = 1; L <= 8; L++) defBlock('water_' + L, 'Water', { tex: 'water', solid: false, opaque: false, render: 'water', hardness: -1, drop: null, fluid: true, noTarget: true, hidden: true });
for (let L = 1; L <= 8; L++) defBlock('lava_' + L, 'Lava', { tex: 'lava', solid: false, opaque: false, render: 'lava', hardness: -1, drop: null, light: 1, fluid: true, noTarget: true, hidden: true });
// deep stone layers and the rest of Minecraft's Overworld ores
defBlock('deepslate', 'Deepslate', { tex: { s: 'deepslate', t: 'deepslate_top' }, hardness: 3, tool: 'pick', tier: 1, drop: 'cobbled_deepslate' });
defBlock('cobbled_deepslate', 'Cobbled Deepslate', { tex: 'cobbled_deepslate', hardness: 3.5, tool: 'pick', tier: 1 });
defBlock('tuff', 'Tuff', { tex: 'tuff', hardness: 1.5, tool: 'pick', tier: 1 });
defBlock('granite', 'Granite', { tex: 'granite', hardness: 1.5, tool: 'pick', tier: 1 });
defBlock('diorite', 'Diorite', { tex: 'diorite', hardness: 1.5, tool: 'pick', tier: 1 });
defBlock('andesite', 'Andesite', { tex: 'andesite', hardness: 1.5, tool: 'pick', tier: 1 });
defBlock('copper_ore', 'Copper Ore', { tex: 'copper_ore', hardness: 3, tool: 'pick', tier: 2, drop: (r) => ['raw_copper', 2 + (r * 4 | 0)] });
defBlock('redstone_ore', 'Redstone Ore', { tex: 'redstone_ore', hardness: 3, tool: 'pick', tier: 3, drop: (r) => ['redstone', 4 + (r * 2 | 0)] });
defBlock('emerald_ore', 'Emerald Ore', { tex: 'emerald_ore', hardness: 3, tool: 'pick', tier: 3, drop: 'emerald' });
for (const [k, n, tier, drop] of [['coal', 'Coal', 1, 'coal'], ['iron', 'Iron', 2, 'raw_iron'], ['gold', 'Gold', 3, 'raw_gold'], ['diamond', 'Diamond', 3, 'diamond'], ['lapis', 'Lapis Lazuli', 2, (r) => ['lapis_lazuli', 4 + (r * 6 | 0)]], ['copper', 'Copper', 2, (r) => ['raw_copper', 2 + (r * 4 | 0)]], ['redstone', 'Redstone', 3, (r) => ['redstone', 4 + (r * 2 | 0)]], ['emerald', 'Emerald', 3, 'emerald']])
  defBlock('deepslate_' + k + '_ore', 'Deepslate ' + n + ' Ore', { tex: k === 'lapis' ? 'lapis_ore_d' : 'deepslate_' + k + '_ore', hardness: 4.5, tool: 'pick', tier, drop });
defBlock('copper_block', 'Block of Copper', { tex: 'copper_block', hardness: 3, tool: 'pick', tier: 2 });
defBlock('iron_block', 'Block of Iron', { tex: 'iron_block', hardness: 5, tool: 'pick', tier: 2, snd: 'stone' });
defBlock('gold_block', 'Block of Gold', { tex: 'gold_block', hardness: 3, tool: 'pick', tier: 3 });
defBlock('diamond_block', 'Block of Diamond', { tex: 'diamond_block', hardness: 5, tool: 'pick', tier: 3 });
defBlock('emerald_block', 'Block of Emerald', { tex: 'emerald_block', hardness: 5, tool: 'pick', tier: 3 });
defBlock('coal_block', 'Block of Coal', { tex: 'coal_block', hardness: 5, tool: 'pick', tier: 1 });
defBlock('redstone_block', 'Block of Redstone', { tex: 'redstone_block', hardness: 5, tool: 'pick', tier: 1, power: 15 });
// anvils (Minecraft model, in 1/16 block units); the _x versions are turned 90 degrees. They fall like sand.
const ANVIL_BOXES = [[2, 0, 2, 14, 4, 14], [4, 4, 3, 12, 5, 13], [6, 5, 4, 10, 10, 12], [3, 10, 0, 13, 16, 16]];
for (const [k, n, top] of [['anvil', 'Anvil', 'anvil_top'], ['chipped_anvil', 'Chipped Anvil', 'anvil_top_chipped'], ['damaged_anvil', 'Damaged Anvil', 'anvil_top_damaged']]) for (const sw of [false, true])
  defBlock(k + (sw ? '_x' : ''), n, { tex: { t: top, s: 'anvil_side', b: 'anvil_side' }, render: 'boxes', boxes: ANVIL_BOXES, swapXZ: sw, opaque: false, hardness: 5, tool: 'pick', tier: 1, use: 'anvil', fall: true, anvil: k, drop: k, hidden: sw });
defBlock('ancient_debris', 'Ancient Debris', { tex: { s: 'debris_side', t: 'debris_top' }, hardness: 30, tool: 'pick', tier: 4, snd: 'stone' });
defBlock('netherite_block', 'Block of Netherite', { tex: 'netherite_block', hardness: 50, tool: 'pick', tier: 4 });
defBlock('smithing_table', 'Smithing Table', { tex: { s: 'smith_side', t: 'smith_top', b: 'smith_bottom', pz: 'smith_front', nz: 'smith_front' }, hardness: 2.5, snd: 'wood', use: 'smith' });
BL[B.WATER].fluid = true; BL[B.WATER].noTarget = true;
BL[B.GRAVEL].drop = (r) => r < 0.12 ? ['flint', 1] : 'gravel';
const NBLOCKS = BL.length;
const SOLID = new Uint8Array(256), OPAQUE = new Uint8Array(256), PLANT = new Uint8Array(256), LIGHT = new Float32Array(256);
for (const d of BL) { SOLID[d.id] = d.solid ? 1 : 0; OPAQUE[d.id] = d.opaque ? 1 : 0; PLANT[d.id] = d.plant ? 1 : 0; LIGHT[d.id] = d.light; }
// liquids: FKIND 1 = water, 2 = lava; FLEVEL 0 = source, 1-7 = flowing (distance), 8 = falling; FH = surface height
const FKIND = new Uint8Array(256), FLEVEL = new Uint8Array(256), FH = new Float32Array(256); const FLID = { 1: [B.WATER], 2: [B.LAVA] };
FKIND[B.WATER] = 1; FKIND[B.LAVA] = 2; FH[B.WATER] = FH[B.LAVA] = 0.875;
for (let L = 1; L <= 8; L++) for (const [k, n] of [[1, 'WATER_'], [2, 'LAVA_']]) { const id = B[n + L]; FLID[k][L] = id; FKIND[id] = k; FLEVEL[id] = L; FH[id] = L === 8 ? 0.875 : 0.875 * (8 - L) / 8 + 0.02; }
const isWaterId = (id) => FKIND[id] === 1, isLavaId = (id) => FKIND[id] === 2;

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
M('fishing_rod', 'Fishing Rod', { kind: 'fishing_rod', stack: 1, dur: 64 }); M('potion', 'Potion', { kind: 'potion', stack: 1 }); M('splash_potion', 'Splash Potion', { kind: 'splash', stack: 1 }); M('lingering_potion', 'Lingering Potion', { kind: 'lingering', stack: 1 }); M('tipped_arrow', 'Tipped Arrow'); M('dragon_breath', "Dragon's Breath"); M('fermented_spider_eye', 'Fermented Spider Eye'); M('end_crystal', 'End Crystal', { kind: 'end_crystal' }); M('name_tag', 'Name Tag', { kind: 'name_tag' }); M('compass', 'Compass', { kind: 'compass', stack: 1 }); M('clock', 'Clock', { kind: 'clock', stack: 1 }); M('experience_bottle', "Bottle o' Enchanting", { kind: 'xp_bottle' }); for (const [k, n] of [['ocean_explorer_map', 'Ocean Explorer Map'], ['woodland_explorer_map', 'Woodland Explorer Map'], ['trial_explorer_map', 'Trial Explorer Map']]) M(k, n, { kind: 'explorer_map', stack: 1 }); M('sweet_berries', 'Sweet Berries', { kind: 'food' }); M('cookie', 'Cookie', { kind: 'food' }); M('pumpkin_pie', 'Pumpkin Pie', { kind: 'food' }); M('suspicious_stew', 'Suspicious Stew', { kind: 'food', stack: 1 }); M('rabbit_stew', 'Rabbit Stew', { kind: 'food', stack: 1 }); M('melon_slice', 'Melon Slice', { kind: 'food' }); M('glistering_melon_slice', 'Glistering Melon Slice'); M('nether_wart', 'Nether Wart'); M('cocoa_beans', 'Cocoa Beans'); M('bowl', 'Bowl'); M('clay_ball', 'Clay Ball');
M('flint', 'Flint'); M('flint_and_steel', 'Flint and Steel', { kind: 'fns', stack: 1 });
M('bucket', 'Bucket', { kind: 'bucket', stack: 16 }); M('water_bucket', 'Water Bucket', { kind: 'bucket', stack: 1, fluid: 'water' }); M('lava_bucket', 'Lava Bucket', { kind: 'bucket', stack: 1, fluid: 'lava' });
M('quartz', 'Nether Quartz'); M('nether_brick', 'Nether Brick'); M('gold_nugget', 'Gold Nugget');
M('ghast_tear', 'Ghast Tear'); M('blaze_rod', 'Blaze Rod'); M('blaze_powder', 'Blaze Powder'); M('magma_cream', 'Magma Cream');
M('ender_pearl', 'Ender Pearl', { kind: 'pearl', stack: 16 }); M('eye_of_ender', 'Eye of Ender', { kind: 'eye' });
M('shield', 'Shield', { kind: 'shield', stack: 1 });
M('paper', 'Paper'); M('book', 'Book'); M('enchanted_book', 'Enchanted Book', { kind: 'ebook', stack: 1 }); M('lapis_lazuli', 'Lapis Lazuli');
M('bed', 'Bed', { kind: 'bed', stack: 1 });
M('boat', 'Oak Boat', { kind: 'boat', stack: 1 });
M('saddle', 'Saddle', { kind: 'saddle', stack: 1 });
M('raw_iron', 'Raw Iron'); M('raw_gold', 'Raw Gold'); M('raw_copper', 'Raw Copper'); M('copper_ingot', 'Copper Ingot'); M('redstone', 'Redstone Dust'); M('emerald', 'Emerald');
M('netherite_scrap', 'Netherite Scrap', { fireproof: true }); M('netherite_ingot', 'Netherite Ingot', { fireproof: true });
M('netherite_upgrade_smithing_template', 'Netherite Upgrade Smithing Template', { kind: 'template' });
M('trident', 'Trident', { kind: 'trident', stack: 1, dur: 250, dmg: 9, atk: 1.1, melee: true });
M('mace', 'Mace', { kind: 'mace', stack: 1, dur: 500, dmg: 6, atk: 0.6, melee: true }); M('heavy_core', 'Heavy Core'); M('breeze_rod', 'Breeze Rod'); M('wind_charge', 'Wind Charge', { kind: 'wind_charge', stack: 64 });
M('slime_ball', 'Slimeball'); M('spider_eye', 'Spider Eye', { kind: 'food' }); M('glowstone_dust', 'Glowstone Dust'); M('glass_bottle', 'Glass Bottle'); M('phantom_membrane', 'Phantom Membrane');
M('crossbow', 'Crossbow', { kind: 'crossbow', stack: 1, dur: 465 }); M('lead', 'Lead', { kind: 'lead' }); M('copper_nugget', 'Copper Nugget'); M('totem_of_undying', 'Totem of Undying', { kind: 'totem', stack: 1 });
M('minecart', 'Minecart', { kind: 'minecart', stack: 1 }); M('trial_key', 'Trial Key', { kind: 'key' }); M('elytra', 'Elytra', { kind: 'armor', slot: 'chest', def: 0, stack: 1, dur: 432, elytra: true }); M('shulker_shell', 'Shulker Shell'); M('chorus_fruit', 'Chorus Fruit', { kind: 'food' }); M('popped_chorus_fruit', 'Popped Chorus Fruit'); M('firework_rocket', 'Firework Rocket', { kind: 'firework', stack: 64 }); M('ominous_trial_key', 'Ominous Trial Key', { kind: 'key' }); M('prismarine_shard', 'Prismarine Shard'); M('prismarine_crystals', 'Prismarine Crystals'); M('echo_shard', 'Echo Shard'); M('enchanted_golden_apple', 'Enchanted Golden Apple', { kind: 'food' }); M('chest_minecart', 'Minecart with Chest', { kind: 'minecart', stack: 1, chest: true });
M('cod', 'Raw Cod', { kind: 'food' }); M('cooked_cod', 'Cooked Cod', { kind: 'food' }); M('salmon', 'Raw Salmon', { kind: 'food' }); M('cooked_salmon', 'Cooked Salmon', { kind: 'food' });
M('tropical_fish', 'Tropical Fish', { kind: 'food' }); M('pufferfish', 'Pufferfish', { kind: 'food' }); M('ink_sac', 'Ink Sac'); M('glow_ink_sac', 'Glow Ink Sac');
M('rabbit', 'Raw Rabbit', { kind: 'food' }); M('cooked_rabbit', 'Cooked Rabbit', { kind: 'food' }); M('rabbit_hide', 'Rabbit Hide'); M('rabbit_foot', "Rabbit's Foot");
M('bone_meal', 'Bone Meal', { kind: 'bonemeal' }); M('mutton', 'Raw Mutton', { kind: 'food' }); M('cooked_mutton', 'Cooked Mutton', { kind: 'food' }); M('armadillo_scute', 'Armadillo Scute'); M('turtle_scute', 'Turtle Scute'); M('honeycomb', 'Honeycomb'); M('tripwire_hook', 'Tripwire Hook');
M('wheat_seeds', 'Wheat Seeds', { kind: 'seed', crop: 'wheat_0' });
M('carrot', 'Carrot', { kind: 'food', crop: 'carrots_0' }); M('potato', 'Potato', { kind: 'food', crop: 'potatoes_0' }); M('baked_potato', 'Baked Potato', { kind: 'food' }); M('golden_carrot', 'Golden Carrot', { kind: 'food' });
M('sugar', 'Sugar'); M('egg', 'Egg', { kind: 'egg', stack: 16 }); M('snowball', 'Snowball', { kind: 'snowball', stack: 16 }); M('iron_nugget', 'Iron Nugget'); M('milk_bucket', 'Milk Bucket', { kind: 'food', stack: 1 }); M('shears', 'Shears', { kind: 'shears', stack: 1, dur: 238 });
for (const [k, n, def, col] of [['leather', 'Leather', 3, [150, 90, 50]], ['iron', 'Iron', 5, [214, 214, 218]], ['golden', 'Golden', 7, [246, 208, 64]], ['diamond', 'Diamond', 11, [90, 222, 210]]]) M(k + '_horse_armor', n + ' Horse Armor', { kind: 'horse_armor', stack: 1, hdef: def, hcol: col, hmat: k }); M('wheat', 'Wheat'); M('bread', 'Bread', { kind: 'food', heal: 5 });
for (const [k, n, tier, sp] of TOOLMATS) M(k + '_hoe', n + ' Hoe', { kind: 'tool', stack: 1, tool: 'hoe', tier, speed: 1, dmg: 1 });
// axes (strong but slow hits, fast on wood) and shovels (fast on dirt, sand, gravel, snow); Minecraft damage values
for (const [k, n, tier, sp] of TOOLMATS) M(k + '_axe', n + ' Axe', { kind: 'tool', stack: 1, tool: 'axe', tier, speed: sp, dmg: [7, 9, 9, 9][tier - 1] });
// golden tools: Minecraft's gold is the fastest material (speed 12) but mines like wood and wears out quickly
for (const [k, n, tool, dmg] of [['pickaxe', 'Pickaxe', 'pick', 2], ['axe', 'Axe', 'axe', 7], ['shovel', 'Shovel', 'shovel', 2.5], ['hoe', 'Hoe', 'hoe', 1], ['sword', 'Sword', 'sword', 4]]) M('golden_' + k, 'Golden ' + n, { kind: 'tool', stack: 1, tool, tier: 1, speed: tool === 'sword' ? 1 : 12, dmg, dur: 32, gold: true });
for (const [k, n, tier, sp] of TOOLMATS) M(k + '_shovel', n + ' Shovel', { kind: 'tool', stack: 1, tool: 'shovel', tier, speed: sp, dmg: [2.5, 3.5, 4.5, 5.5][tier - 1] });
// armour: Minecraft defence points [helmet, chestplate, leggings, boots] and toughness
const ARMOR_MATS_CRAFT = 4; const ARMOR_MATS = [['leather', 'Leather', [1, 3, 2, 1], 0, [150, 90, 50], 'leather'], ['golden', 'Golden', [2, 5, 3, 1], 0, [240, 200, 60], 'gold_ingot'], ['iron', 'Iron', [2, 6, 5, 2], 0, [210, 210, 214], 'iron_ingot'], ['diamond', 'Diamond', [3, 8, 6, 3], 2, [80, 220, 210], 'diamond'], ['netherite', 'Netherite', [3, 8, 6, 3], 3, [74, 66, 72], null], ['chainmail', 'Chainmail', [2, 5, 4, 1], 0, [150, 152, 160], null]];
const ARMOR_PIECES = [['helmet', 'Helmet', 'head'], ['chestplate', 'Chestplate', 'chest'], ['leggings', 'Leggings', 'legs'], ['boots', 'Boots', 'feet']];
const ARMOR_SLOT = { head: 37, chest: 38, legs: 39, feet: 40 };
for (const [mk, mn, pts, tough, col] of ARMOR_MATS) ARMOR_PIECES.forEach(([pk, pn, slot], i) => M(mk + '_' + pk, mn + ' ' + pn, { kind: 'armor', stack: 1, slot, def: pts[i], tough, color: col, mat: mk, fireproof: mk === 'netherite', kbRes: mk === 'netherite' ? 0.1 : 0 }));
// netherite tools: made at a smithing table from diamond tools (Minecraft values: speed 9, durability 2031)
for (const [k, n, tool, dmg] of [['pickaxe', 'Pickaxe', 'pick', 6], ['sword', 'Sword', 'sword', 8], ['axe', 'Axe', 'axe', 10], ['shovel', 'Shovel', 'shovel', 6.5], ['hoe', 'Hoe', 'hoe', 1]]) M('netherite_' + k, 'Netherite ' + n, { kind: 'tool', stack: 1, tool, tier: 5, speed: tool === 'sword' ? 1 : 9, dmg, fireproof: true });
// spears (Mounts of Mayhem): jab with attack, hold use to charge. [key, name, tier, jab damage, cooldown s, durability, charge multiplier, delay s, engaged s, tired s, disengaged s, dismount speed]
const SPEARS = [['wooden', 'Wooden', 1, 1, 0.65, 59, 0.7, 0.75, 5, 5, 5, 14], ['stone', 'Stone', 2, 2, 0.75, 131, 0.82, 0.7, 4.5, 4.5, 4.75, 13], ['copper', 'Copper', 2, 2, 0.85, 190, 0.82, 0.65, 4, 4.25, 4.25, 12], ['iron', 'Iron', 3, 3, 0.95, 250, 0.95, 0.6, 2.5, 4.25, 4.5, 11],
  ['golden', 'Golden', 1, 1, 0.95, 32, 0.7, 0.7, 3.5, 5, 5.25, 13], ['diamond', 'Diamond', 4, 4, 1.05, 1561, 1.075, 0.5, 3, 3.5, 3.5, 10], ['netherite', 'Netherite', 5, 5, 1.15, 2031, 1.2, 0.4, 2.5, 3, 3.25, 9]];
for (const [k, n, tier, dmg, cool, dur, mult, delay, eng, tired, dis, dismount] of SPEARS) M(k + '_spear', n + ' Spear', { kind: 'tool', stack: 1, tool: 'spear', tier, speed: 1, dmg, dur, cool, spear: { mult, delay, eng, tired, dis, dismount }, gold: k === 'golden', fireproof: k === 'netherite' });
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
function horseArmorIcon(col) { const shadeC = (c, k) => c.map(v => Math.max(0, Math.min(255, Math.round(v * k)))); return (s, r) => { const rows = ['......XX....', '.....XHHX...', '....XHHHHX..', '...XHHEHHHX.', '..XHHHHHHHX.', '.XHHHHHHHX..', 'XHHHXHHHHX..', 'XHHX.XHHHHX.', '.XX..XHHHHHX', '.....XHHHHHX', '......XXXXX.']; rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'X') s(x + 2, y + 3, shadeC(col, 0.55)); else if (ch === 'H') s(x + 2, y + 3, vary(shadeC(col, 0.85 + (x + y) % 3 * 0.08), r, 6)); else if (ch === 'E') s(x + 2, y + 3, [40, 40, 40]); })); }; }
function potionPaint(s, col, style) { // a glass bottle with coloured liquid (splash: a neck ring; lingering: a rounder flask)
  const glass = [200, 220, 235]; for (let y = 2; y <= 4; y++) for (let x = 6; x <= 9; x++) s(x, y, y === 2 ? [150, 110, 70] : glass);
  if (style === 'splash') { for (let x = 5; x <= 10; x++) s(x, 5, glass); }
  for (let y = 5; y <= 14; y++) for (let x = 2; x <= 13; x++) { const d = Math.hypot((x - 7.5) / (style === 'lingering' ? 5.5 : 5), (y - 10) / 4.6); if (d < 1) { const liquid = y >= 8; let c = liquid ? mixc(col, [0, 0, 0], (y - 8) * 0.04) : glass; if (d > 0.85) c = mixc(c, [255, 255, 255], 0.35); if (liquid && x < 6 && y < 11) c = mixc(c, [255, 255, 255], 0.4); s(x, y, c); } }
}
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
for (const [k, , , , col, hi] of TOOLMATS) {
  ICONP[k + '_axe'] = (s) => { pLine(s, 3, 14, 10, 7, BROWN); pLine(s, 4, 14, 11, 7, BROWN2); for (const [x, y] of [[8, 3], [9, 2], [10, 2], [11, 3], [12, 4], [12, 5], [11, 6], [10, 6], [9, 5], [8, 4], [9, 3], [10, 3], [10, 4], [11, 4], [11, 5], [10, 5], [9, 4], [12, 6], [13, 5]]) s(x, y, (y < 4 || x > 11) ? hi : col); };
  ICONP[k + '_shovel'] = (s) => { pLine(s, 3, 14, 9, 8, BROWN); pLine(s, 4, 14, 10, 8, BROWN2); for (const [x, y] of [[10, 4], [11, 4], [12, 4], [9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [10, 7], [11, 7], [12, 7], [11, 3]]) s(x, y, (y < 5 || x === 9) ? hi : col); };
}
for (const [k, , , , col, hi] of TOOLMATS) ICONP[k + '_hoe'] = (s) => { pLine(s, 3, 14, 10, 7, BROWN); pLine(s, 4, 14, 11, 7, BROWN2); for (const [x, y] of [[9, 3], [10, 3], [11, 3], [12, 4], [8, 4], [9, 4], [10, 4], [11, 5], [12, 5], [12, 6]]) s(x, y, (y < 4) ? hi : col); };
{ const G0 = [240, 200, 50], G1 = [255, 246, 160]; const src = 'diamond'; ICONP.golden_pickaxe = pickIcon(G0, G1); ICONP.golden_sword = swordIcon(G0, G1);
  for (const k of ['axe', 'shovel', 'hoe']) { const base = ICONP[src + '_' + k]; ICONP['golden_' + k] = (s, r) => base((x, y, c, a) => s(x, y, (c && c[0] === 70 && c[1] === 220) ? G0 : (c && c[0] === 190 && c[1] === 255) ? G1 : c, a), r); } }
{ const N0 = [70, 62, 68], N1 = [132, 120, 128]; ICONP.netherite_pickaxe = pickIcon(N0, N1); ICONP.netherite_sword = swordIcon(N0, N1);
  for (const k of ['axe', 'shovel', 'hoe']) { const base = ICONP['diamond_' + k]; ICONP['netherite_' + k] = (s, r) => base((x, y, c, a) => s(x, y, (c && c[0] === 70 && c[1] === 220) ? N0 : (c && c[0] === 190 && c[1] === 255) ? N1 : c, a), r); } }
const SPEAR_COL = { copper: [[198, 112, 74], [236, 160, 120]], wooden: [[164, 132, 80], [200, 168, 112]], stone: [[120, 120, 120], [168, 168, 168]], iron: [[214, 214, 214], [255, 255, 255]], golden: [[240, 200, 50], [255, 246, 160]], diamond: [[70, 220, 210], [190, 255, 250]], netherite: [[70, 62, 68], [132, 120, 128]] };
for (const k in SPEAR_COL) { const [col, hi] = SPEAR_COL[k]; ICONP[k + '_spear'] = (s) => { pLine(s, 1, 14, 10, 5, BROWN); pLine(s, 2, 14, 10, 6, BROWN2); for (const [x, y] of [[10, 4], [11, 4], [11, 3], [12, 3], [12, 2], [13, 2], [13, 1], [14, 1], [11, 5], [12, 4], [13, 3], [10, 5]]) s(x, y, (x + y) % 3 === 0 ? hi : col); s(9, 7, [90, 90, 96]); s(8, 6, [90, 90, 96]); }; }
function rawOre(c, hi, dk) { return (s, r) => { blob(s, 8, 8, 5.5, 5, c, r, dk); for (let i = 0; i < 7; i++) s(5 + r() * 6, 5 + r() * 6, hi); s(6, 6, hi); }; }
Object.assign(ICONP, {
  raw_iron: rawOre([214, 178, 150], [240, 214, 190], [150, 116, 92]), raw_gold: rawOre([240, 200, 50], [255, 240, 150], [180, 130, 20]), raw_copper: rawOre([200, 110, 76], [236, 160, 120], [140, 70, 44]),
  copper_ingot: (s) => ingot(s, [200, 110, 76], [240, 166, 130], [140, 70, 44]),
  redstone: (s, r) => { for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 5; s(8 + Math.cos(a) * d, 9 + Math.sin(a) * d * 0.8, r() < 0.3 ? [255, 60, 50] : [170, 14, 10]); } },
  emerald: (s) => { for (let y = 3; y <= 13; y++) { const w = y < 8 ? (y - 3) * 0.9 + 1 : (13 - y) * 0.9 + 1; for (let x = Math.round(8 - w); x <= Math.round(7 + w); x++) s(x, y, (x < 7 && y < 8) ? [170, 255, 190] : (x > 9 || y > 10) ? [10, 120, 50] : [40, 200, 90]); } },
  carrot: (s, r) => { pLine(s, 3, 13, 10, 6, [232, 128, 28]); pLine(s, 4, 13, 11, 6, [214, 110, 20]); pLine(s, 3, 12, 10, 5, [246, 152, 44]); pLine(s, 4, 12, 10, 6, [240, 140, 36]); s(5, 10, [190, 90, 16]); s(8, 8, [190, 90, 16]); pLine(s, 11, 5, 13, 2, [60, 150, 40]); pLine(s, 11, 5, 14, 4, [70, 170, 50]); pLine(s, 10, 4, 11, 1, [50, 130, 34]); },
  golden_carrot: (s, r) => { pLine(s, 3, 13, 10, 6, [236, 196, 50]); pLine(s, 4, 13, 11, 6, [206, 160, 30]); pLine(s, 3, 12, 10, 5, [255, 236, 130]); pLine(s, 4, 12, 10, 6, [246, 214, 80]); s(5, 10, [170, 130, 20]); s(8, 8, [170, 130, 20]); pLine(s, 11, 5, 13, 2, [246, 220, 90]); pLine(s, 11, 5, 14, 4, [255, 240, 150]); pLine(s, 10, 4, 11, 1, [220, 180, 50]); },
  potato: (s, r) => { blob(s, 8, 9, 5, 3.6, [196, 152, 84], r, [150, 108, 54]); s(6, 8, [140, 100, 50]); s(10, 10, [140, 100, 50]); s(8, 7, [214, 176, 108]); },
  baked_potato: (s, r) => { blob(s, 8, 9, 5, 3.6, [214, 160, 70], r, [150, 96, 36]); s(6, 8, [246, 220, 140]); s(7, 8, [246, 220, 140]); s(9, 10, [120, 76, 30]); s(10, 9, [246, 220, 140]); },
  sugar: (s, r) => { for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 4.5; s(Math.round(8 + Math.cos(a) * d), Math.round(10 + Math.sin(a) * d * 0.6), vary([240, 240, 244], r, 8)); } },
  egg: (s, r) => { blob(s, 8, 9, 3.6, 4.8, [236, 222, 196], r, [190, 170, 140]); s(7, 7, [252, 246, 232]); s(10, 11, [214, 196, 168]); },
  leather_horse_armor: horseArmorIcon([150, 90, 50]), iron_horse_armor: horseArmorIcon([214, 214, 218]), golden_horse_armor: horseArmorIcon([246, 208, 64]), diamond_horse_armor: horseArmorIcon([90, 222, 210]),
  milk_bucket: bucketIcon([[250, 250, 250], [230, 230, 232]]),
  shears: (s, r) => { pLine(s, 3, 3, 9, 9, [200, 200, 206]); pLine(s, 4, 3, 10, 9, [150, 150, 156]); pLine(s, 12, 3, 6, 9, [214, 214, 220]); pLine(s, 13, 4, 7, 10, [160, 160, 166]); for (const [cx, cy] of [[5, 12], [11, 12]]) { s(cx - 1, cy, [60, 60, 66]); s(cx + 1, cy, [60, 60, 66]); s(cx, cy - 1, [60, 60, 66]); s(cx, cy + 1, [60, 60, 66]); } },
  trident: (s, r) => { pLine(s, 3, 13, 11, 5, [66, 140, 130]); pLine(s, 4, 13, 12, 5, [44, 110, 100]); pLine(s, 2, 14, 3, 13, [40, 90, 84]); for (const [a, b] of [[11, 1], [14, 4], [15, 1]]) pLine(s, 11, 5, a, b, [120, 214, 196]); s(12, 2, [180, 240, 226]); s(14, 2, [180, 240, 226]); },
  mace: (s, r) => { pLine(s, 3, 13, 9, 7, [110, 76, 46]); pLine(s, 4, 13, 10, 7, [80, 54, 30]); for (let y = 2; y <= 8; y++) for (let x = 8; x <= 14; x++) { const d = Math.abs(x - 11) + Math.abs(y - 5); if (d <= 4) s(x, y, d >= 4 ? [70, 70, 76] : d === 3 ? [110, 110, 118] : [150, 150, 160]); } s(10, 4, [200, 200, 210]); s(11, 1, [90, 90, 96]); s(15, 5, [90, 90, 96]); },
  heavy_core: (s, r) => { for (let y = 4; y <= 12; y++) for (let x = 4; x <= 12; x++) { const e = x === 4 || y === 4 || x === 12 || y === 12; s(x, y, e ? [48, 48, 56] : vary([82, 82, 92], r, 8)); } for (const [x, y] of [[6, 6], [10, 6], [6, 10], [10, 10], [8, 8]]) s(x, y, [130, 130, 146]); },
  breeze_rod: (s, r) => { pLine(s, 4, 13, 12, 3, [150, 190, 230]); pLine(s, 5, 13, 13, 3, [110, 150, 200]); for (const t of [0.25, 0.5, 0.75]) { const x = Math.round(4 + 8 * t), y = Math.round(13 - 10 * t); s(x - 1, y - 1, [200, 230, 255]); s(x + 2, y + 1, [200, 230, 255]); } },
  wind_charge: (s, r) => { for (let a = 0; a < 26; a++) { const t = a / 26 * Math.PI * 3, rr = 1 + a * 0.22; s(Math.round(8 + Math.cos(t) * rr), Math.round(8 + Math.sin(t) * rr), a % 3 ? [196, 220, 250] : [130, 170, 230]); } s(8, 8, [240, 248, 255]); },
  slime_ball: (s, r) => { blob(s, 8, 8, 4.5, 4.5, [110, 196, 90], r, [70, 150, 60]); s(6, 6, [190, 250, 170]); s(7, 6, [160, 236, 140]); },
  spider_eye: (s, r) => { blob(s, 8, 9, 4, 4, [150, 30, 40], r, [100, 16, 24]); s(7, 7, [230, 120, 130]); s(9, 10, [70, 10, 16]); },
  glowstone_dust: (s, r) => { for (let i = 0; i < 24; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 5; s(Math.round(8 + Math.cos(a) * d), Math.round(9 + Math.sin(a) * d * 0.7), r() < 0.5 ? [255, 226, 120] : [230, 180, 70]); } },
  glass_bottle: (s, r) => { for (let y = 6; y <= 14; y++) for (let x = 4; x <= 11; x++) { const e = x === 4 || x === 11 || y === 14; if (e) s(x, y, [190, 210, 230]); } for (let y = 2; y <= 6; y++) { s(6, y, [190, 210, 230]); s(9, y, [190, 210, 230]); } s(7, 2, [150, 110, 70]); s(8, 2, [150, 110, 70]); },
  phantom_membrane: (s, r) => { for (let y = 3; y <= 13; y++) for (let x = 3; x <= 13; x++) if (Math.abs(x - 8) + Math.abs(y - 8) <= 6) s(x, y, vary([196, 190, 170], r, 10)); pLine(s, 3, 8, 13, 8, [150, 140, 120]); },
  crossbow: (s, r) => { pLine(s, 3, 3, 13, 13, [110, 76, 46]); pLine(s, 1, 9, 9, 1, [100, 70, 44]); pLine(s, 2, 10, 10, 2, [80, 56, 34]); pLine(s, 1, 9, 13, 13, [220, 220, 220]); pLine(s, 9, 1, 13, 13, [220, 220, 220]); s(3, 3, [160, 160, 166]); },
  lead: (s, r) => { for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2; s(Math.round(8 + Math.cos(t) * 4.5), Math.round(7 + Math.sin(t) * 4), [150, 120, 80]); } pLine(s, 8, 11, 6, 15, [150, 120, 80]); s(5, 15, [110, 190, 90]); },
  tripwire_hook: (s, r) => { for (let y = 2; y <= 6; y++) for (let x = 6; x <= 10; x++) if (y === 2 || y === 6 || x === 6 || x === 10) s(x, y, [180, 180, 186]); pLine(s, 8, 7, 8, 14, [130, 92, 56]); },
  totem_of_undying: (s, r) => { for (let y = 2; y <= 14; y++) for (let x = 4; x <= 11; x++) { const head = y < 7 && x >= 5 && x <= 10, body = y >= 7 && y <= 12 && x >= 6 && x <= 9, wing = y >= 7 && y <= 10 && (x === 4 || x === 5 || x === 10 || x === 11); if (head || body || wing) s(x, y, head ? [236, 200, 70] : wing ? [214, 170, 50] : [190, 150, 40]); } s(6, 4, [40, 160, 80]); s(9, 4, [40, 160, 80]); for (let x = 6; x <= 9; x++) s(x, 13, [150, 110, 30]); },
  cod: (s, r) => { for (let x = 3; x <= 12; x++) { const h = x < 5 ? 1 : x > 10 ? 1 : 2; for (let y = 8 - h; y <= 8 + h; y++) s(x, y, y > 8 ? [220, 206, 180] : [176, 150, 110]); } pLine(s, 13, 6, 13, 10, [140, 116, 84]); pLine(s, 14, 5, 14, 11, [140, 116, 84]); s(5, 7, [20, 20, 20]); },
  cooked_cod: (s, r) => { for (let x = 3; x <= 12; x++) { const h = x < 5 ? 1 : x > 10 ? 1 : 2; for (let y = 8 - h; y <= 8 + h; y++) s(x, y, y > 8 ? [230, 200, 150] : [196, 150, 90]); } pLine(s, 13, 6, 13, 10, [150, 110, 60]); pLine(s, 14, 5, 14, 11, [150, 110, 60]); s(5, 7, [20, 20, 20]); },
  salmon: (s, r) => { for (let x = 3; x <= 12; x++) { const h = x < 5 ? 1 : x > 10 ? 1 : 2; for (let y = 8 - h; y <= 8 + h; y++) s(x, y, y > 8 ? [230, 170, 150] : [196, 90, 70]); } pLine(s, 13, 6, 13, 10, [150, 60, 50]); pLine(s, 14, 5, 14, 11, [150, 60, 50]); s(5, 7, [20, 20, 20]); },
  cooked_salmon: (s, r) => { for (let x = 3; x <= 12; x++) { const h = x < 5 ? 1 : x > 10 ? 1 : 2; for (let y = 8 - h; y <= 8 + h; y++) s(x, y, y > 8 ? [240, 190, 150] : [214, 130, 80]); } pLine(s, 13, 6, 13, 10, [160, 90, 50]); pLine(s, 14, 5, 14, 11, [160, 90, 50]); s(5, 7, [20, 20, 20]); },
  tropical_fish: (s, r) => { for (let x = 3; x <= 12; x++) { const h = x < 5 ? 1 : x > 10 ? 1 : 2; for (let y = 8 - h; y <= 8 + h; y++) s(x, y, y > 8 ? [250, 200, 120] : [240, 140, 40]); } pLine(s, 13, 6, 13, 10, [250, 250, 250]); pLine(s, 14, 5, 14, 11, [250, 250, 250]); s(5, 7, [20, 20, 20]); },
  pufferfish: (s, r) => { blob(s, 8, 8, 5, 5, [220, 200, 60], r, [170, 150, 40]); for (const [x, y] of [[3, 4], [13, 4], [3, 12], [13, 12], [8, 2], [8, 14], [2, 8], [14, 8]]) s(x, y, [230, 230, 220]); s(6, 7, [20, 20, 20]); s(10, 7, [20, 20, 20]); },
  ink_sac: (s, r) => { blob(s, 8, 9, 4.5, 5, [40, 40, 50], r, [20, 20, 26]); s(6, 7, [90, 90, 110]); },
  glow_ink_sac: (s, r) => { blob(s, 8, 9, 4.5, 5, [60, 200, 190], r, [30, 130, 130]); s(6, 7, [200, 255, 250]); },
  rabbit: (s, r) => { blob(s, 8, 9, 5, 4, [230, 160, 150], r, [190, 110, 100]); pLine(s, 3, 9, 1, 12, [220, 150, 140]); pLine(s, 13, 9, 15, 12, [220, 150, 140]); },
  cooked_rabbit: (s, r) => { blob(s, 8, 9, 5, 4, [196, 130, 70], r, [140, 80, 40]); pLine(s, 3, 9, 1, 12, [180, 110, 60]); pLine(s, 13, 9, 15, 12, [180, 110, 60]); },
  rabbit_hide: (s, r) => { for (let y = 4; y <= 12; y++) for (let x = 4; x <= 12; x++) if ((x + y) % 7 !== 0) s(x, y, vary([170, 130, 90], r, 12)); },
  rabbit_foot: (s, r) => { blob(s, 8, 6, 3, 4, [200, 170, 130], r, [150, 120, 90]); for (let y = 9; y <= 13; y++) s(8, y, [190, 150, 110]); s(7, 13, [120, 90, 60]); s(9, 13, [120, 90, 60]); },
  bone_meal: (s, r) => { for (let i = 0; i < 30; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 5; s(Math.round(8 + Math.cos(a) * d), Math.round(9 + Math.sin(a) * d * 0.7), r() < 0.5 ? [240, 240, 236] : [214, 214, 220]); } },
  mutton: (s, r) => { blob(s, 8, 8, 5, 4, [210, 70, 70], r, [160, 40, 40]); pLine(s, 11, 5, 14, 2, [240, 236, 226]); },
  cooked_mutton: (s, r) => { blob(s, 8, 8, 5, 4, [150, 90, 50], r, [100, 60, 30]); pLine(s, 11, 5, 14, 2, [240, 236, 226]); },
  armadillo_scute: (s, r) => { for (let y = 4; y <= 12; y++) for (let x = 3; x <= 13; x++) if (Math.abs(x - 8) + Math.abs(y - 8) * 0.6 < 6) s(x, y, y % 3 === 0 ? [140, 90, 80] : [190, 130, 120]); },
  turtle_scute: (s, r) => { for (let y = 4; y <= 12; y++) for (let x = 4; x <= 12; x++) if (Math.abs(x - 8) + Math.abs(y - 8) < 6) s(x, y, (x + y) % 4 === 0 ? [40, 110, 40] : [70, 160, 70]); },
  honeycomb: (s, r) => { for (let y = 3; y <= 13; y++) for (let x = 3; x <= 13; x++) { const hx = ((x + (Math.floor(y / 3) % 2) * 2) % 4 === 0) || y % 3 === 0; s(x, y, hx ? [200, 130, 20] : [250, 190, 50]); } },
  minecart: (s, r) => { for (let y = 6; y <= 11; y++) for (let x = 2; x <= 13; x++) { const e = y === 6 || x === 2 || x === 13; s(x, y, e ? [150, 150, 156] : [96, 96, 102]); } for (const x of [4, 11]) { s(x, 12, [50, 50, 54]); s(x, 13, [50, 50, 54]); s(x - 1, 12, [70, 70, 74]); s(x + 1, 12, [70, 70, 74]); } },
  chest_minecart: (s, r) => { for (let y = 3; y <= 7; y++) for (let x = 4; x <= 11; x++) s(x, y, y === 5 ? [60, 40, 20] : [170, 120, 60]); s(7, 5, [200, 200, 200]); for (let y = 7; y <= 11; y++) for (let x = 2; x <= 13; x++) { const e = y === 7 || x === 2 || x === 13; s(x, y, e ? [150, 150, 156] : [96, 96, 102]); } for (const x of [4, 11]) { s(x, 12, [50, 50, 54]); s(x, 13, [50, 50, 54]); } },
  elytra: (s, r) => { for (const sgn of [-1, 1]) for (let y = 2; y <= 14; y++) { const w = y < 6 ? y - 1 : 14 - y + 2; for (let k = 0; k < Math.min(5, w); k++) s(8 + sgn * (1 + k), y, k === Math.min(5, w) - 1 ? [110, 90, 130] : [160, 150, 180]); } },
  potion: (s, r) => potionPaint(s, [56, 92, 230]), splash_potion: (s, r) => potionPaint(s, [56, 92, 230], 'splash'), lingering_potion: (s, r) => potionPaint(s, [56, 92, 230], 'lingering'),
  tipped_arrow: (s, r) => { pLine(s, 3, 12, 12, 3, [140, 110, 70]); s(12, 3, [200, 200, 200]); s(13, 2, [220, 220, 220]); s(11, 3, [180, 180, 180]); s(12, 4, [180, 180, 180]); for (const [x, y] of [[3, 13], [2, 12], [4, 13], [2, 11]]) s(x, y, [180, 60, 200]); },
  dragon_breath: (s, r) => { potionPaint(s, [200, 90, 200]); for (const [x, y] of [[6, 4], [9, 3], [8, 1]]) s(x, y, [230, 150, 240]); },
  fermented_spider_eye: (s, r) => { blob(s, 8, 9, 5, 4.5, [120, 50, 60], r, [70, 30, 40]); s(7, 8, [40, 20, 20]); s(10, 9, [40, 20, 20]); blob(s, 8, 4, 2.5, 1.6, [210, 190, 150], r); },
  end_crystal: (s, r) => { for (let y = 2; y <= 13; y++) for (let x = 2; x <= 13; x++) { const e = x === 2 || x === 13 || y === 2 || y === 13; if (e) s(x, y, [230, 220, 250]); else if (x > 5 && x < 10 && y > 5 && y < 10) s(x, y, (x + y) % 2 ? [255, 120, 255] : [200, 70, 220]); } },
  fishing_rod: (s, r) => { pLine(s, 2, 14, 13, 2, [120, 84, 46]); pLine(s, 3, 14, 14, 2, [96, 66, 36]); for (let y = 3; y <= 12; y++) s(13 + (y > 9 ? 1 : 0), y, [220, 220, 220]); s(14, 12, [150, 150, 150]); s(14, 13, [200, 60, 60]); },
  snowball: (s, r) => blob(s, 8, 8, 4.5, 4.5, [246, 250, 255], r, [190, 210, 230]),
  iron_nugget: (s, r) => { blob(s, 7, 9, 2.5, 2, [210, 210, 214], r, [140, 140, 146]); blob(s, 10, 6, 2, 1.6, [230, 230, 234], r, [150, 150, 156]); },
  name_tag: (s, r) => { for (let y = 5; y <= 11; y++) for (let x = 4; x <= 13; x++) if (!(x === 4 && (y === 5 || y === 11))) s(x, y, y === 5 ? [236, 226, 200] : [214, 200, 168]); s(6, 8, [60, 50, 40]); pLine(s, 1, 3, 4, 7, [190, 190, 190]); },
  compass: (s, r) => { blob(s, 8, 8, 6, 6, [110, 110, 116], r, [70, 70, 76]); blob(s, 8, 8, 4.2, 4.2, [200, 196, 180], r); pLine(s, 8, 8, 8, 4, [210, 40, 40]); pLine(s, 8, 9, 8, 12, [60, 60, 60]); },
  clock: (s, r) => { blob(s, 8, 8, 6, 6, [240, 200, 60], r, [170, 130, 30]); blob(s, 8, 8, 4.2, 4.2, [70, 120, 200], r); for (let x = 4; x <= 12; x++) for (let y = 9; y <= 12; y++) if (Math.hypot(x - 8, y - 8) < 4.2) s(x, y, [40, 50, 90]); s(6, 6, [255, 240, 120]); },
  experience_bottle: (s, r) => { for (let y = 6; y <= 14; y++) for (let x = 4; x <= 11; x++) if (Math.hypot((x - 7.5) / 4, (y - 10) / 4.6) < 1) s(x, y, (x + y) % 3 ? [130, 220, 80] : [200, 255, 120]); for (let y = 2; y <= 5; y++) for (let x = 6; x <= 9; x++) s(x, y, y === 2 ? [140, 100, 60] : [200, 220, 230]); },
  ocean_explorer_map: (s, r) => { for (let y = 2; y <= 13; y++) for (let x = 2; x <= 13; x++) s(x, y, (x === 2 || y === 2 || x === 13 || y === 13) ? [150, 130, 90] : vary([90, 140, 200], r, 10)); for (const [x, y] of [[5, 6], [6, 6], [6, 7], [10, 9], [9, 10]]) s(x, y, [120, 170, 90]); s(8, 8, [200, 60, 60]); },
  woodland_explorer_map: (s, r) => { for (let y = 2; y <= 13; y++) for (let x = 2; x <= 13; x++) s(x, y, (x === 2 || y === 2 || x === 13 || y === 13) ? [150, 130, 90] : vary([90, 140, 70], r, 12)); for (let y = 6; y <= 10; y++) for (let x = 6; x <= 10; x++) s(x, y, [110, 80, 50]); s(8, 5, [200, 60, 60]); },
  trial_explorer_map: (s, r) => { for (let y = 2; y <= 13; y++) for (let x = 2; x <= 13; x++) s(x, y, (x === 2 || y === 2 || x === 13 || y === 13) ? [150, 130, 90] : vary([220, 206, 170], r, 8)); for (let y = 6; y <= 10; y++) for (let x = 6; x <= 10; x++) s(x, y, (x + y) % 2 ? [190, 120, 70] : [150, 150, 150]); },
  sweet_berries: (s, r) => { for (const [x, y] of [[6, 8], [10, 9], [8, 11]]) blob(s, x, y, 2.4, 2.4, [180, 30, 40], r, [110, 20, 30]); pLine(s, 8, 3, 8, 7, [60, 110, 40]); pLine(s, 8, 5, 11, 7, [60, 110, 40]); },
  cookie: (s, r) => { blob(s, 8, 8, 6, 6, [200, 140, 70], r, [150, 96, 44]); for (const [x, y] of [[6, 6], [10, 7], [7, 10], [10, 11], [5, 9]]) s(x, y, [80, 46, 26]); },
  pumpkin_pie: (s, r) => { for (let y = 6; y <= 12; y++) for (let x = 2; x <= 13; x++) s(x, y, y <= 7 ? [230, 150, 60] : vary([210, 160, 90], r, 8)); for (let x = 3; x <= 12; x += 3) s(x, 6, [250, 230, 200]); },
  suspicious_stew: (s, r) => { for (let y = 7; y <= 13; y++) for (let x = 2; x <= 13; x++) if (Math.hypot((x - 7.5) / 6, (y - 7) / 6) < 1) s(x, y, y < 9 ? vary([180, 120, 60], r, 10) : [130, 90, 50]); s(6, 7, [200, 40, 40]); s(10, 8, [240, 220, 60]); },
  rabbit_stew: (s, r) => { for (let y = 7; y <= 13; y++) for (let x = 2; x <= 13; x++) if (Math.hypot((x - 7.5) / 6, (y - 7) / 6) < 1) s(x, y, y < 9 ? vary([150, 100, 50], r, 10) : [130, 90, 50]); s(6, 7, [230, 130, 30]); s(9, 8, [210, 190, 150]); },
  melon_slice: (s, r) => { for (let y = 3; y <= 13; y++) for (let x = 2; x <= 13; x++) { const d = x + (15 - y); if (d >= 12 && d <= 17) s(x, y, d >= 16 ? [70, 140, 50] : d === 15 ? [220, 240, 170] : (x + y) % 4 ? [220, 60, 60] : [40, 20, 20]); } },
  glistering_melon_slice: (s, r) => { for (let y = 3; y <= 13; y++) for (let x = 2; x <= 13; x++) { const d = x + (15 - y); if (d >= 12 && d <= 17) s(x, y, d >= 16 ? [240, 200, 60] : d === 15 ? [255, 240, 170] : (x + y) % 4 ? [230, 90, 70] : [255, 220, 80]); } },
  nether_wart: (s, r) => { blob(s, 8, 10, 4, 3.5, [150, 30, 36], r, [100, 16, 22]); blob(s, 6, 6, 2.5, 2.5, [170, 40, 44], r); blob(s, 10, 6, 2.2, 2.2, [170, 40, 44], r); },
  cocoa_beans: (s, r) => { blob(s, 6, 9, 3, 4, [110, 64, 30], r, [70, 40, 20]); blob(s, 10, 8, 3, 4, [120, 70, 34], r, [70, 40, 20]); },
  bowl: (s, r) => { for (let y = 7; y <= 12; y++) for (let x = 2; x <= 13; x++) if (Math.hypot((x - 7.5) / 6, (y - 7) / 5.5) < 1) s(x, y, y === 7 ? [90, 60, 30] : vary([150, 110, 64], r, 8)); },
  clay_ball: (s, r) => blob(s, 8, 8, 4.5, 4, [160, 166, 178], r, [120, 126, 140]),
  chorus_fruit: (s, r) => { blob(s, 8, 9, 5, 5, [150, 100, 160], r, [96, 60, 104]); for (const [x, y] of [[6, 7], [10, 8], [8, 11], [7, 10]]) s(x, y, [200, 170, 210]); s(8, 3, [90, 60, 80]); s(8, 4, [90, 60, 80]); },
  popped_chorus_fruit: (s, r) => { blob(s, 8, 9, 5.5, 5.5, [180, 140, 190], r, [120, 84, 130]); for (const [x, y] of [[5, 7], [9, 6], [11, 9], [7, 11], [9, 12], [6, 9]]) s(x, y, [236, 220, 240]); },
  shulker_shell: (s, r) => { for (let y = 4; y <= 12; y++) for (let x = 3; x <= 12; x++) { const e = y === 4 || x === 3 || x === 12; s(x, y, e ? [130, 80, 130] : y === 8 ? [90, 50, 90] : [170, 110, 170]); } },
  firework_rocket: (s, r) => { for (let y = 5; y <= 13; y++) for (let x = 6; x <= 9; x++) s(x, y, y < 7 ? [200, 40, 40] : [240, 230, 210]); pLine(s, 8, 1, 8, 4, [220, 220, 220]); s(7, 14, [120, 90, 60]); },
  trial_key: (s, r) => { for (let a = 0; a < 20; a++) { const t = a / 20 * Math.PI * 2; s(Math.round(5 + Math.cos(t) * 3), Math.round(5 + Math.sin(t) * 3), [200, 130, 70]); } pLine(s, 7, 7, 13, 13, [200, 130, 70]); s(12, 14, [200, 130, 70]); s(14, 12, [200, 130, 70]); },
  ominous_trial_key: (s, r) => { for (let a = 0; a < 20; a++) { const t = a / 20 * Math.PI * 2; s(Math.round(5 + Math.cos(t) * 3), Math.round(5 + Math.sin(t) * 3), [60, 120, 140]); } pLine(s, 7, 7, 13, 13, [60, 120, 140]); s(12, 14, [60, 120, 140]); s(14, 12, [60, 120, 140]); },
  prismarine_shard: (s, r) => { pLine(s, 4, 12, 11, 3, [110, 180, 160]); pLine(s, 5, 12, 12, 3, [80, 150, 140]); pLine(s, 6, 13, 11, 6, [150, 220, 200]); },
  prismarine_crystals: (s, r) => { for (const [x, y] of [[5, 5], [10, 6], [7, 10], [11, 11], [4, 11]]) { s(x, y, [220, 250, 240]); s(x + 1, y, [160, 220, 210]); s(x, y + 1, [160, 220, 210]); } },
  echo_shard: (s, r) => { for (let y = 3; y <= 13; y++) for (let x = 5; x <= 11; x++) if (Math.abs(x - 8) <= (y < 8 ? y - 3 : 13 - y) * 0.6) s(x, y, (x + y) % 3 ? [20, 60, 80] : [40, 200, 210]); },
  enchanted_golden_apple: (s, r) => { blob(s, 8, 9, 5.5, 5, [246, 206, 50], r, [190, 140, 20]); s(6, 7, [255, 250, 190]); pLine(s, 8, 2, 8, 4, BROWN); s(9, 3, [60, 150, 40]); s(10, 2, [60, 150, 40]); },
  copper_nugget: (s, r) => { blob(s, 8, 9, 3, 2.5, [214, 120, 80], r, [150, 80, 50]); },
  saddle: (s, r) => { for (let y = 5; y <= 11; y++) for (let x = 2; x <= 13; x++) { const top = y === 5 && (x < 4 || x > 11); if (top || (y < 7 && x > 5 && x < 10)) continue; s(x, y, y === 5 || y === 6 ? [150, 92, 50] : vary([120, 70, 36], r, 6)); } pLine(s, 4, 12, 4, 14, [90, 90, 96]); pLine(s, 11, 12, 11, 14, [90, 90, 96]); s(4, 14, [200, 200, 210]); s(11, 14, [200, 200, 210]); for (let x = 3; x <= 12; x++) s(x, 11, [80, 46, 22]); },
  netherite_scrap: (s, r) => { blob(s, 8, 8, 5.5, 4.5, [96, 70, 64], r, [62, 44, 40]); pLine(s, 5, 7, 10, 7, [130, 100, 90]); pLine(s, 6, 10, 11, 9, [70, 50, 46]); },
  netherite_ingot: (s) => ingot(s, [72, 64, 70], [126, 116, 122], [40, 36, 40]),
  netherite_upgrade_smithing_template: (s, r) => { for (let y = 2; y <= 13; y++) for (let x = 3; x <= 12; x++) { const e = x === 3 || x === 12 || y === 2 || y === 13; s(x, y, e ? [52, 44, 48] : vary([92, 70, 64], r, 8)); } for (const [x, y] of [[7, 5], [8, 5], [6, 6], [9, 6], [6, 7], [9, 7], [7, 8], [8, 8], [7, 9], [8, 10], [7, 11]]) s(x, y, [176, 140, 120]); },
  boat: (s, r) => { const P = [164, 132, 80], D = [104, 76, 40], L = [200, 166, 108];
    pLine(s, 3, 2, 8, 8, [128, 96, 54]); pLine(s, 2, 2, 3, 2, [128, 96, 54]); s(2, 3, [128, 96, 54]);
    for (let x = 1; x <= 14; x++) { const bot = x < 3 || x > 12 ? 10 : 11; for (let y = 7; y <= bot; y++) s(x, y, y === 7 ? L : (y === bot || x === 1 || x === 14) ? D : y === 9 ? [134, 108, 66] : vary(P, r, 6)); }
    for (let x = 3; x <= 12; x++) s(x, 12, D); },
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
  enchanted_book: (s) => { for (let y = 2; y <= 14; y++) for (let x = 3; x <= 12; x++) s(x, y, x <= 4 ? [96, 34, 110] : (y === 2 || y === 14 || x === 12) ? [120, 44, 140] : [160, 70, 190]); for (let y = 3; y <= 13; y++) s(13, y, [236, 232, 220]); s(8, 6, [255, 220, 80]); s(7, 7, [255, 220, 80]); s(9, 7, [255, 220, 80]); s(8, 8, [255, 220, 80]); },
  book: (s) => { for (let y = 2; y <= 14; y++) for (let x = 3; x <= 12; x++) s(x, y, x <= 4 ? [90, 50, 30] : (y === 2 || y === 14 || x === 12) ? [110, 60, 34] : [150, 84, 46]); for (let y = 3; y <= 13; y++) s(13, y, [236, 232, 220]); },
  lapis_lazuli: (s, r) => { blob(s, 8, 8, 5, 5.5, [40, 80, 200], r, [24, 44, 130]); s(6, 6, [120, 170, 255]); s(7, 6, [90, 140, 240]); s(9, 10, [30, 60, 170]); },
  eye_of_ender: (s, r) => { blob(s, 8, 8, 5.5, 5.5, [40, 130, 90], r, [20, 70, 50]); blob(s, 8, 8, 3, 2, [200, 230, 120], r); for (let y = 6; y <= 10; y++) s(8, y, [10, 30, 20]); s(6, 6, [160, 240, 200]); },
});

function tileCanvas(t) { const c = document.createElement('canvas'); c.width = c.height = 16; c.getContext('2d').drawImage(atlasCanvas, (t % ATN) * 16, Math.floor(t / ATN) * 16, 16, 16, 0, 0, 16, 16); return c; }
function blockIconCanvas(id) {
  const d = BL[id]; const c = document.createElement('canvas'); c.width = c.height = 48; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  if (d.render === 'cross' || d.render === 'torch' || d.flatIcon) { x.drawImage(tileCanvas(d.texIds[0]), 0, 0, 48, 48); return c; }
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
function heartURL(kind, gold) {
  const c = document.createElement('canvas'); c.width = c.height = 9; const x = c.getContext('2d');
  const H = ['011000110', '111101111', '111111111', '111111111', '011111110', '001111100', '000111000', '000010000'];
  for (let y = 0; y < 8; y++) for (let i = 0; i < 9; i++) if (H[y][i] === '1') {
    const edge = (y === 0 || H[y - 1][i] !== '1' || i === 0 || H[y][i - 1] !== '1' || i === 8 || H[y][i + 1] !== '1' || y === 7 || H[y + 1][i] !== '1');
    let col = edge ? '#1a0000' : '#3a1414';
    if (!edge && (kind === 2 || (kind === 1 && i < 5))) col = (y === 1 && i === 2) || (y === 2 && i === 1) ? (gold ? '#fff6b0' : '#ffb0b0') : (gold ? '#e8b818' : '#e01828');
    x.fillStyle = col; x.fillRect(i, y + 0.5 | 0, 1, 1);
  }
  return c.toDataURL();
}
const HEART = [heartURL(0), heartURL(1), heartURL(2)];
const GOLD_HEART = [heartURL(0, 1), heartURL(1, 1), heartURL(2, 1)];

// ---------------- Recipes & loot ----------------
const GROUPS = { '#log': ['log', 'birch_log', 'spruce_log', 'jungle_log', 'dark_oak_log', 'acacia_log', 'crimson_stem', 'warped_stem'], '#stone': ['cobblestone', 'cobbled_deepslate'] };
const RSH = (out, n, shape, key) => ({ out: [out, n], shape, key });
const RSL = (out, n, items) => ({ out: [out, n], items });
const RECIPES = [
  RSL('planks', 4, ['#log']),
  RSH('stick', 4, ['P', 'P'], { P: 'planks' }),
  RSH('crafting_table', 1, ['PP', 'PP'], { P: 'planks' }),
  RSH('torch', 4, ['C', 'S'], { C: 'coal', S: 'stick' }),
  RSH('chest', 1, ['PPP', 'P P', 'PPP'], { P: 'planks' }),
  RSH('furnace', 1, ['CCC', 'C C', 'CCC'], { C: '#stone' }),
];
for (const [k, mat] of [['wood', 'planks'], ['stone', '#stone'], ['iron', 'iron_ingot'], ['diamond', 'diamond']]) {
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
  ...ARMOR_MATS.filter(m => m[5]).flatMap(([mk, , , , , mat]) => [RSH(mk + '_helmet', 1, ['MMM', 'M M'], { M: mat }), RSH(mk + '_chestplate', 1, ['M M', 'MMM', 'MMM'], { M: mat }), RSH(mk + '_leggings', 1, ['MMM', 'M M', 'M M'], { M: mat }), RSH(mk + '_boots', 1, ['M M', 'M M'], { M: mat })]),
  RSH('bread', 1, ['WWW'], { W: 'wheat' }),
  RSH('bed', 1, ['WWW', 'PPP'], { W: 'wool', P: 'planks' }),
  RSH('boat', 1, ['P P', 'PPP'], { P: 'planks' }),
  RSH('saddle', 1, [' L ', 'LIL'], { L: 'leather', I: 'iron_ingot' }),
  RSH('copper_block', 1, ['CCC', 'CCC', 'CCC'], { C: 'copper_ingot' }), RSL('copper_ingot', 9, ['copper_block']),
  RSH('iron_block', 1, ['III', 'III', 'III'], { I: 'iron_ingot' }), RSL('iron_ingot', 9, ['iron_block']), RSH('gold_block', 1, ['GGG', 'GGG', 'GGG'], { G: 'gold_ingot' }), RSL('gold_ingot', 9, ['gold_block']),
  RSH('diamond_block', 1, ['DDD', 'DDD', 'DDD'], { D: 'diamond' }), RSL('diamond', 9, ['diamond_block']), RSH('emerald_block', 1, ['EEE', 'EEE', 'EEE'], { E: 'emerald' }), RSL('emerald', 9, ['emerald_block']),
  RSH('coal_block', 1, ['CCC', 'CCC', 'CCC'], { C: 'coal' }), RSL('coal', 9, ['coal_block']), RSH('redstone_block', 1, ['RRR', 'RRR', 'RRR'], { R: 'redstone' }), RSL('redstone', 9, ['redstone_block']),
  RSH('anvil', 1, ['BBB', ' I ', 'III'], { B: 'iron_block', I: 'iron_ingot' }),
  RSH('copper_spear', 1, ['  M', ' S ', 'S  '], { M: 'copper_ingot', S: 'stick' }),
  RSL('netherite_ingot', 1, ['netherite_scrap', 'netherite_scrap', 'netherite_scrap', 'netherite_scrap', 'gold_ingot', 'gold_ingot', 'gold_ingot', 'gold_ingot']),
  RSH('netherite_block', 1, ['NNN', 'NNN', 'NNN'], { N: 'netherite_ingot' }), RSL('netherite_ingot', 9, ['netherite_block']),
  RSH('smithing_table', 1, ['II', 'PP', 'PP'], { I: 'iron_ingot', P: 'planks' }),
  RSH('netherite_upgrade_smithing_template', 2, ['DTD', 'DND', 'DDD'], { D: 'diamond', T: 'netherite_upgrade_smithing_template', N: 'netherrack' }),
  ...[['wooden', 'planks'], ['stone', '#stone'], ['iron', 'iron_ingot'], ['golden', 'gold_ingot'], ['diamond', 'diamond']].map(([k, m]) => RSH(k + '_spear', 1, ['  M', ' S ', 'S  '], { M: m, S: 'stick' })),
  RSH('hay_block', 1, ['WWW', 'WWW', 'WWW'], { W: 'wheat' }), RSL('wheat', 9, ['hay_block']),
  RSH('golden_pickaxe', 1, ['MMM', ' S ', ' S '], { M: 'gold_ingot', S: 'stick' }), RSH('golden_sword', 1, ['M', 'M', 'S'], { M: 'gold_ingot', S: 'stick' }),
  RSH('golden_axe', 1, ['MM', 'MS', ' S'], { M: 'gold_ingot', S: 'stick' }), RSH('golden_shovel', 1, ['M', 'S', 'S'], { M: 'gold_ingot', S: 'stick' }), RSH('golden_hoe', 1, ['MM', ' S', ' S'], { M: 'gold_ingot', S: 'stick' }),
  ...[['wood', 'planks'], ['stone', '#stone'], ['iron', 'iron_ingot'], ['diamond', 'diamond']].flatMap(([k, m]) => [RSH(k + '_hoe', 1, ['MM', ' S', ' S'], { M: m, S: 'stick' }), RSH(k + '_axe', 1, ['MM', 'MS', ' S'], { M: m, S: 'stick' }), RSH(k + '_shovel', 1, ['M', 'S', 'S'], { M: m, S: 'stick' })]),
  RSH('enchanting_table', 1, [' B ', 'DOD', 'OOO'], { B: 'book', D: 'diamond', O: 'obsidian' }),
  RSH('lapis_block', 1, ['LLL', 'LLL', 'LLL'], { L: 'lapis_lazuli' }),
  RSL('lapis_lazuli', 9, ['lapis_block']),
  RSH('glowstone', 1, [' T ', 'TGT', ' T '], { T: 'torch', G: 'glass' }),
  RSH('golden_apple', 1, ['GGG', 'GAG', 'GGG'], { G: 'gold_ingot', A: 'apple' }),
  RSH('golden_carrot', 1, ['NNN', 'NCN', 'NNN'], { N: 'gold_nugget', C: 'carrot' }), RSL('sugar', 1, ['sugar_cane']), RSH('shears', 1, [' I', 'I '], { I: 'iron_ingot' }),
  RSH('leather_horse_armor', 1, ['L L', 'LLL', 'L L'], { L: 'leather' }),
  RSH('mace', 1, ['H', 'R'], { H: 'heavy_core', R: 'breeze_rod' }), RSL('firework_rocket', 3, ['paper', 'gunpowder']), RSH('composter', 1, ['P P', 'P P', 'PPP'], { P: 'planks' }), RSH('smoker', 1, [' L ', 'LFL', ' L '], { L: '#log', F: 'furnace' }), RSH('blast_furnace', 1, ['III', 'IFI', 'SSS'], { I: 'iron_ingot', F: 'furnace', S: 'stone' }), RSH('cartography_table', 1, ['pp', 'PP', 'PP'], { p: 'paper', P: 'planks' }), RSH('fletching_table', 1, ['ff', 'PP', 'PP'], { f: 'flint', P: 'planks' }), RSH('loom', 1, ['ss', 'PP'], { s: 'string', P: 'planks' }), RSH('barrel', 1, ['PPP', 'P P', 'PPP'], { P: 'planks' }), RSH('lectern', 1, ['PPP', ' B ', ' P '], { P: 'planks', B: 'bookshelf' }), RSH('grindstone', 1, ['S-S', 'P P'], { S: 'stick', '-': 'stone', P: 'planks' }), RSH('stonecutter', 1, [' I ', 'SSS'], { I: 'iron_ingot', S: 'stone' }), RSH('brewing_stand', 1, [' B ', 'CCC'], { B: 'blaze_rod', C: 'cobblestone' }), RSH('compass', 1, [' I ', 'IRI', ' I '], { I: 'iron_ingot', R: 'redstone' }), RSH('clock', 1, [' G ', 'GRG', ' G '], { G: 'gold_ingot', R: 'redstone' }), RSH('cookie', 8, ['WCW'], { W: 'wheat', C: 'cocoa_beans' }), RSH('glistering_melon_slice', 1, ['NNN', 'NMN', 'NNN'], { N: 'gold_nugget', M: 'melon_slice' }), RSH('bowl', 4, ['P P', ' P '], { P: 'planks' }), RSL('rabbit_stew', 1, ['cooked_rabbit', 'carrot', 'baked_potato', 'bowl']), RSH('snow_block', 1, ['SS', 'SS'], { S: 'snowball' }), RSL('iron_nugget', 9, ['iron_ingot']), RSH('iron_ingot', 1, ['NNN', 'NNN', 'NNN'], { N: 'iron_nugget' }), RSH('iron_bars', 16, ['III', 'III'], { I: 'iron_ingot' }), RSL('dark_oak_planks', 4, ['dark_oak_log']), RSL('mossy_stone_bricks', 1, ['stone_bricks', 'vine']), RSH('fishing_rod', 1, ['  S', ' St', 'S t'], { S: 'stick', t: 'string' }), RSH('end_crystal', 1, ['GGG', 'GEG', 'GTG'], { G: 'glass', E: 'eye_of_ender', T: 'ghast_tear' }), RSL('fermented_spider_eye', 1, ['spider_eye', 'sugar']), RSH('tipped_arrow', 8, ['AAA', 'ALA', 'AAA'], { A: 'arrow', L: 'lingering_potion' }), RSH('purpur_block', 4, ['CC', 'CC'], { C: 'popped_chorus_fruit' }), RSH('purpur_pillar', 2, ['P', 'P'], { P: 'purpur_block' }), RSH('end_rod', 4, ['B', 'C'], { B: 'blaze_rod', C: 'popped_chorus_fruit' }), RSH('ladder', 3, ['S S', 'SSS', 'S S'], { S: 'stick' }), RSH('end_stone_bricks', 4, ['EE', 'EE'], { E: 'end_stone' }), RSH('oak_fence', 3, ['PSP', 'PSP'], { P: 'planks', S: 'stick' }), RSH('cauldron', 1, ['I I', 'I I', 'III'], { I: 'iron_ingot' }), RSH('packed_ice', 1, ['III', 'III', 'III'], { I: 'ice' }),
  RSH('rail', 16, ['I I', 'ISI', 'I I'], { I: 'iron_ingot', S: 'stick' }), RSH('powered_rail', 6, ['G G', 'GSG', 'GRG'], { G: 'gold_ingot', S: 'stick', R: 'redstone' }),
  RSH('detector_rail', 6, ['I I', 'IPI', 'IRI'], { I: 'iron_ingot', P: 'stone', R: 'redstone' }), RSH('activator_rail', 6, ['ISI', 'ITI', 'ISI'], { I: 'iron_ingot', S: 'stick', T: 'redstone_torch' }),
  RSH('minecart', 1, ['I I', 'III'], { I: 'iron_ingot' }), RSH('chest_minecart', 1, ['C', 'M'], { C: 'chest', M: 'minecart' }),
  RSH('lever', 1, ['S', 'C'], { S: 'stick', C: 'cobblestone' }), RSH('redstone_torch', 1, ['R', 'S'], { R: 'redstone', S: 'stick' }), RSL('bone_meal', 3, ['bone']), RSH('leather', 1, ['RR', 'RR'], { R: 'rabbit_hide' }), RSL('wind_charge', 4, ['breeze_rod']), RSH('glass_bottle', 3, ['G G', ' G '], { G: 'glass' }),
  RSH('crossbow', 1, ['SIS', 'TFT', ' S '], { S: 'stick', I: 'iron_ingot', T: 'string', F: 'tripwire_hook' }), RSH('tripwire_hook', 2, ['I', 'S', 'P'], { I: 'iron_ingot', S: 'stick', P: 'planks' }), RSH('lead', 2, ['SS ', 'SB ', '  S'], { S: 'string', B: 'slime_ball' }),
  RSH('glowstone', 1, ['GG', 'GG'], { G: 'glowstone_dust' }),
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
function ingMatch(spec, id) { if (spec === 'planks' && id === IT.dark_oak_planks) return true; return spec[0] === '#' ? GROUPS[spec].some(k => IT[k] === id) : IT[spec] === id; }
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
const SMELT = {}; for (const [a, b] of [['iron_ore', 'iron_ingot'], ['gold_ore', 'gold_ingot'], ['nether_gold_ore', 'gold_ingot'], ['sand', 'glass'], ['chorus_fruit', 'popped_chorus_fruit'], ['cobblestone', 'stone'], ['raw_pork', 'cooked_pork'], ['raw_beef', 'steak'], ['raw_chicken', 'cooked_chicken'], ['log', 'coal'], ['birch_log', 'coal'], ['spruce_log', 'coal'], ['netherrack', 'nether_brick'], ['quartz_ore', 'quartz'], ['ancient_debris', 'netherite_scrap'], ['raw_iron', 'iron_ingot'], ['raw_gold', 'gold_ingot'], ['raw_copper', 'copper_ingot'], ['copper_ore', 'copper_ingot'], ['cobbled_deepslate', 'deepslate'], ['potato', 'baked_potato'], ['cod', 'cooked_cod'], ['salmon', 'cooked_salmon'], ['rabbit', 'cooked_rabbit'], ['mutton', 'cooked_mutton'],
  ['deepslate_iron_ore', 'iron_ingot'], ['deepslate_gold_ore', 'gold_ingot'], ['deepslate_copper_ore', 'copper_ingot'], ['deepslate_coal_ore', 'coal'], ['deepslate_diamond_ore', 'diamond'], ['deepslate_lapis_ore', 'lapis_lazuli'], ['deepslate_redstone_ore', 'redstone'], ['deepslate_emerald_ore', 'emerald'], ['redstone_ore', 'redstone'], ['emerald_ore', 'emerald']]) SMELT[IT[a]] = IT[b];
const FUEL = {}; for (const [a, t] of [['coal', 40], ['log', 15], ['birch_log', 15], ['spruce_log', 15], ['planks', 15], ['stick', 5], ['crafting_table', 15], ['chest', 15], ['bookshelf', 15], ['blaze_rod', 60], ['lava_bucket', 500], ['wood_pickaxe', 10], ['wood_sword', 10], ['bow', 10], ['shield', 15], ['boat', 60], ['wooden_spear', 10], ['smithing_table', 15]]) FUEL[IT[a]] = t;
const COOK_TIME = 5;
const LOOT = {
  ruined_portal: [['obsidian', 3, 7, 0.95], ['flint_and_steel', 1, 1, 0.7], ['gold_ingot', 2, 6, 0.6], ['flint', 1, 4, 0.5], ['golden_apple', 1, 1, 0.15], ['gold_nugget', 4, 12, 0.5]],
  fortress: [['golden_horse_armor', 1, 1, 0.2], ['iron_horse_armor', 1, 1, 0.12], ['diamond_horse_armor', 1, 1, 0.08], ['saddle', 1, 1, 0.35], ['netherite_upgrade_smithing_template', 1, 1, 0.12], ['gold_ingot', 2, 6, 0.7], ['iron_ingot', 1, 5, 0.6], ['diamond', 1, 3, 0.3], ['obsidian', 2, 4, 0.3], ['flint_and_steel', 1, 1, 0.2], ['golden_apple', 1, 1, 0.12], ['nether_brick', 4, 10, 0.4], ['ender_pearl', 1, 2, 0.2], ['blaze_rod', 1, 2, 0.25]],
  stronghold: [['ender_pearl', 1, 3, 0.5], ['iron_ingot', 2, 5, 0.6], ['bread', 1, 1, 0], ['apple', 1, 3, 0.5], ['iron_pickaxe', 1, 1, 0.2], ['diamond', 1, 2, 0.2], ['golden_apple', 1, 1, 0.1], ['eye_of_ender', 1, 1, 0.15]],
  house: [['carrot', 1, 3, 0.3], ['potato', 1, 3, 0.3], ['bread', 1, 4, 0.6], ['wheat_seeds', 1, 5, 0.4], ['apple', 1, 3, 0.7], ['stick', 2, 6, 0.5], ['coal', 1, 4, 0.5], ['iron_ingot', 1, 3, 0.35], ['torch', 2, 6, 0.5], ['cooked_pork', 1, 3, 0.4], ['wool', 1, 3, 0.3], ['stone_pickaxe', 1, 1, 0.2], ['steak', 1, 2, 0.3]],
  pyramid: [['iron_horse_armor', 1, 1, 0.15], ['golden_horse_armor', 1, 1, 0.1], ['diamond_horse_armor', 1, 1, 0.05], ['saddle', 1, 1, 0.25], ['gold_ingot', 2, 6, 0.8], ['diamond', 1, 3, 0.45], ['iron_ingot', 1, 5, 0.6], ['bone', 2, 6, 0.6], ['rotten_flesh', 1, 4, 0.5], ['golden_apple', 1, 1, 0.25], ['gunpowder', 2, 5, 0.5], ['tnt', 1, 3, 0.35]],
  dungeon: [['iron_horse_armor', 1, 1, 0.15], ['golden_horse_armor', 1, 1, 0.1], ['diamond_horse_armor', 1, 1, 0.05], ['saddle', 1, 1, 0.3], ['iron_ingot', 1, 4, 0.6], ['gold_ingot', 1, 3, 0.4], ['string', 1, 4, 0.5], ['bone', 1, 5, 0.6], ['gunpowder', 1, 4, 0.5], ['diamond', 1, 2, 0.2], ['golden_apple', 1, 1, 0.12], ['bow', 1, 1, 0.15], ['arrow', 4, 12, 0.4], ['coal', 2, 8, 0.5]],
  smithy: [['iron_horse_armor', 1, 1, 0.1], ['saddle', 1, 1, 0.15], ['iron_spear', 1, 1, 0.15], ['iron_ingot', 1, 5, 0.7], ['iron_pickaxe', 1, 1, 0.3], ['iron_sword', 1, 1, 0.3], ['iron_helmet', 1, 1, 0.25], ['iron_chestplate', 1, 1, 0.2], ['iron_leggings', 1, 1, 0.2], ['iron_boots', 1, 1, 0.25], ['diamond', 1, 2, 0.12], ['obsidian', 1, 3, 0.2], ['bread', 1, 3, 0.5], ['apple', 1, 3, 0.4]],
  farm: [['carrot', 1, 5, 0.5], ['potato', 1, 5, 0.5], ['wheat_seeds', 2, 8, 0.8], ['wheat', 2, 6, 0.6], ['bread', 1, 4, 0.6], ['apple', 1, 3, 0.4], ['iron_hoe', 1, 1, 0.15], ['stone_hoe', 1, 1, 0.3]],
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

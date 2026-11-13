// ================= TEXTURES v2: hand-tuned procedural block art + animated tiles =================
function tnoise(seed, period) {
  const r = mulberry32(seed); const g = []; for (let i = 0; i < period * period; i++) g.push(r());
  const G = (i, j) => g[(((j % period) + period) % period) * period + (((i % period) + period) % period)];
  return (x, y) => { const fx = x / 16 * period, fy = y / 16 * period; const x0 = Math.floor(fx), y0 = Math.floor(fy); const tx = fx - x0, ty = fy - y0; const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty); return lerp(sy, lerp(sx, G(x0, y0), G(x0 + 1, y0)), lerp(sx, G(x0, y0 + 1), G(x0 + 1, y0 + 1))); };
}
const shadeC = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
function voronoi(r, n) {
  const pts = []; for (let i = 0; i < n; i++) pts.push([r() * 16, r() * 16]);
  const id = new Int16Array(256), d1 = new Float32Array(256), d2 = new Float32Array(256);
  each((x, y) => { let a = 1e9, b = 1e9, k = 0; pts.forEach((p, i) => { for (let ox = -16; ox <= 16; ox += 16) for (let oy = -16; oy <= 16; oy += 16) { const d = Math.hypot(x + 0.5 - p[0] - ox, y + 0.5 - p[1] - oy); if (d < a) { b = a; a = d; k = i; } else if (d < b) b = d; } }); id[y * 16 + x] = k; d1[y * 16 + x] = a; d2[y * 16 + x] = b; });
  return { id, d1, d2, n };
}
const cid = (m, x, y) => m.id[(((y % 16) + 16) % 16) * 16 + (((x % 16) + 16) % 16)];
// stones with bevel: highlight where the pixel above/left belongs to another stone, shadow where below/right does
function bevelStones(set, r, m, colorOf, mortar, mortarW = 0.9) {
  const tone = []; for (let i = 0; i < m.n; i++) tone.push(colorOf(i));
  each((x, y) => {
    const k = y * 16 + x; if (m.d2[k] - m.d1[k] < mortarW) { set(x, y, vary(mortar, r, 5)); return; }
    const me = m.id[k]; let c = tone[me];
    if (cid(m, x, y - 1) !== me || cid(m, x - 1, y) !== me) c = shadeC(c, 1.22); else if (cid(m, x, y + 1) !== me || cid(m, x + 1, y) !== me) c = shadeC(c, 0.74);
    set(x, y, vary(c, r, 6));
  });
}
function brickWall(set, r, opts) {
  const { bw, bh, base, mortar, hv = 14, off = bw / 2 } = opts; const tones = {};
  each((x, y) => {
    const row = Math.floor(y / bh), xx = (x + (row % 2) * off) % 16, col = Math.floor(xx / bw);
    const key = row + ':' + col; if (!tones[key]) { const f = 0.88 + r() * 0.24; tones[key] = [base[0] * f + (r() - 0.5) * hv, base[1] * f, base[2] * f]; }
    const by = y % bh, bx = xx % bw;
    if (by === bh - 1 || bx === bw - 1) { set(x, y, vary(mortar, r, 5)); return; }
    let c = tones[key]; if (by === 0) c = shadeC(c, 1.18); else if (by === bh - 2) c = shadeC(c, 0.82); if (bx === 0) c = shadeC(c, 1.08); else if (bx === bw - 2) c = shadeC(c, 0.9);
    set(x, y, vary(c, r, 7));
  });
}
const T2 = {};
T2.dirt = (set, r) => { const n = tnoise(31, 4), n2 = tnoise(32, 8); each((x, y) => { const v = n(x, y) * 0.6 + n2(x, y) * 0.4; set(x, y, vary(mixc([104, 72, 48], [152, 110, 76], v), r, 9)); }); for (let k = 0; k < 7; k++) { const x = r() * 15 | 0, y = r() * 15 | 0; set(x, y, [176, 146, 112]); set(x + 1, y, [160, 130, 98]); set(x, y + 1, [86, 60, 40]); } };
const GR_A = [66, 122, 38], GR_B = [124, 186, 68];
T2.grass_top = (set, r) => { const n = tnoise(41, 4), n2 = tnoise(42, 8); each((x, y) => { const v = n(x, y) * 0.55 + n2(x, y) * 0.45; let c = vary(mixc(GR_A, GR_B, v), r, 9); const q = r(); if (q < 0.07) c = [148, 206, 86]; else if (q < 0.13) c = shadeC(c, 0.8); set(x, y, c); }); };
function grassDrip(set, r, col, colD, minD) { const n = tnoise(43, 4); for (let x = 0; x < 16; x++) { const d = minD + Math.round(n(x, 0) * 3) + (r() < 0.22 ? 1 : 0); for (let y = 0; y < d; y++) set(x, y, vary(mixc(col, colD, y / d * 0.6), r, 8)); set(x, d, vary(colD, r, 5)); } }
T2.grass_side = (set, r) => { T2.dirt(set, r); grassDrip(set, r, [112, 176, 62], [64, 116, 36], 2); };
T2.stone = (set, r) => { const n = tnoise(51, 4), n2 = tnoise(52, 8); each((x, y) => { const v = n(x, y) * 0.65 + n2(x, y) * 0.35; let c = vary(mixc([104, 104, 106], [146, 146, 148], v), r, 6); if (r() < 0.05) c = [158, 158, 160]; set(x, y, c); }); for (let k = 0; k < 4; k++) { let x = r() * 16 | 0, y = r() * 16 | 0; for (let i = 0; i < 4; i++) { set(x, y, [88, 88, 90]); set(x, y - 1, [134, 134, 136]); x++; if (r() < 0.5) y++; } } };
T2.cobble = (set, r) => bevelStones(set, r, voronoi(r, 10), () => { const g = 108 + r() * 48; return [g, g, g + 2]; }, [74, 74, 76], 0.55);
T2.mossy = (set, r) => { const m = voronoi(r, 9); const moss = new Set(); for (let i = 0; i < 9; i++) if (r() < 0.4) moss.add(i); const n = tnoise(61, 4); bevelStones(set, r, m, (i) => { const g = 104 + r() * 46; return moss.has(i) ? [g * 0.62, g * 0.95, g * 0.5] : [g, g, g]; }, [66, 74, 58], 0.55); each((x, y) => { if (n(x, y) > 0.68 && r() < 0.7) set(x, y, vary([72, 122, 50], r, 12)); }); };
T2.planks = (set, r, base = [166, 132, 80]) => {
  for (let b = 0; b < 4; b++) {
    const tone = 0.9 + r() * 0.18, j = 3 + (r() * 10 | 0), ph = r() * 6;
    for (let y = b * 4; y < b * 4 + 4; y++) for (let x = 0; x < 16; x++) {
      const by = y - b * 4; let f = tone * (0.94 + Math.sin(x * 0.55 + ph + by * 1.7) * 0.05);
      if (by === 3) f *= 0.62; else if (by === 0) f *= 1.08;
      if (x === j) f *= 0.66; else if (x === j + 1) f *= 1.06;
      let c = vary(shadeC(base, f), r, 5); if ((x === j - 1 || x === j + 2) && by === 1) c = shadeC(base, 0.55);
      set(x, y, c);
    }
  }
};
function barkSide(set, r, base, dark, hi) { const n = tnoise(71 + base[0], 8); for (let x = 0; x < 16; x++) { for (let y = 0; y < 16; y++) { const v = n(x * 0.6, y * 0.25 + x * 3.1); let c = v < 0.35 ? dark : v > 0.75 ? hi : base; c = mixc(c, base, 0.25); if ((x % 4 === 1) && r() < 0.6) c = shadeC(dark, 0.85); set(x, y, vary(c, r, 6)); } } }
function ringTop(set, r, a, b, bark) { each((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); if (Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)) > 6.6) { set(x, y, vary(bark, r, 6)); return; } const v = (Math.sin(d * 2.4) + 1) / 2; let c = mixc(a, b, v); if (d < 1.2) c = shadeC(b, 0.85); set(x, y, vary(c, r, 5)); }); }
T2.log_side = (set, r) => barkSide(set, r, [104, 80, 48], [62, 46, 26], [130, 102, 64]);
T2.log_top = (set, r) => ringTop(set, r, [182, 146, 92], [146, 112, 66], [96, 74, 44]);
T2.spruce_side = (set, r) => barkSide(set, r, [76, 52, 30], [44, 30, 16], [98, 70, 42]);
T2.spruce_top = (set, r) => ringTop(set, r, [128, 96, 58], [100, 74, 44], [62, 44, 26]);
T2.birch_side = (set, r) => { each((x, y) => set(x, y, vary([222, 220, 210], r, 5))); for (let k = 0; k < 10; k++) { const y = r() * 16 | 0, x0 = r() * 13 | 0, l = 2 + r() * 4 | 0; for (let i = 0; i < l; i++) { set(x0 + i, y, [40, 40, 36]); if (r() < 0.5) set(x0 + i, y + 1, [96, 94, 88]); } } for (let y = 0; y < 16; y++) { set(0, y, [180, 178, 168]); } };
T2.crimson_stem = (set, r) => { barkSide(set, r, [118, 40, 62], [74, 22, 38], [160, 60, 84]); for (let k = 0; k < 8; k++) set(r() * 16, r() * 16, [40, 170, 150]); };
T2.warped_stem = (set, r) => { barkSide(set, r, [52, 92, 98], [32, 58, 64], [70, 130, 128]); for (let k = 0; k < 8; k++) set(r() * 16, r() * 16, [60, 220, 190]); };
function leafPaint(set, r, base) { const n = tnoise(81 + base[1], 4); each((x, y) => { const v = n(x, y); if (r() < 0.16 + (v < 0.3 ? 0.12 : 0)) { set(x, y, [0, 0, 0], 0); return; } set(x, y, vary(shadeC(base, 0.72 + v * 0.35), r, 10)); }); for (let k = 0; k < 14; k++) { const x = r() * 15 | 0, y = r() * 15 | 0; set(x, y, shadeC(base, 1.25)); set(x + 1, y, shadeC(base, 1.05)); set(x, y + 1, shadeC(base, 0.9)); } }
T2.leaves = (set, r) => leafPaint(set, r, [62, 140, 40]);
T2.birch_leaves = (set, r) => leafPaint(set, r, [110, 162, 66]);
T2.spruce_leaves = (set, r) => leafPaint(set, r, [44, 96, 60]);
T2.sand = (set, r) => { const n = tnoise(91, 4); each((x, y) => { let c = vary(mixc([206, 192, 146], [232, 222, 176], n(x, y) * 0.5 + r() * 0.5), r, 4); if (r() < 0.05) c = [186, 168, 122]; set(x, y, c); }); };
T2.gravel = (set, r) => { const m = voronoi(r, 16); const pal = [[126, 118, 114], [100, 96, 94], [148, 140, 132], [84, 80, 80], [134, 120, 106]]; bevelStones(set, r, m, () => pal[r() * pal.length | 0], [70, 66, 64], 0.6); };
function orePaint(col, hi, dk) { return (set, r) => { T2.stone(set, r); for (let k = 0; k < 4; k++) { const cx = 2 + r() * 11 | 0, cy = 2 + r() * 11 | 0; const px = []; for (let i = 0; i < 4 + (r() * 3 | 0); i++) px.push([cx + (r() * 3 | 0) - 1, cy + (r() * 3 | 0) - 1]); for (const [x, y] of px) { set(x + 1, y + 1, dk); } for (const [x, y] of px) set(x, y, vary(col, r, 10)); const [hx, hy] = px[0]; set(hx, hy, hi); } }; }
T2.coal_ore = orePaint([40, 40, 42], [90, 90, 94], [70, 70, 72]);
T2.iron_ore = orePaint([206, 168, 134], [240, 214, 190], [104, 92, 84]);
T2.gold_ore = orePaint([240, 206, 50], [255, 250, 160], [130, 110, 50]);
T2.diamond_ore = orePaint([84, 222, 214], [220, 255, 252], [60, 110, 110]);
T2.brick = (set, r) => brickWall(set, r, { bw: 8, bh: 4, base: [150, 70, 52], mortar: [172, 164, 152] });
T2.stone_bricks = (set, r) => { brickWall(set, r, { bw: 16, bh: 8, base: [126, 126, 128], mortar: [78, 78, 80], hv: 4, off: 8 }); for (let i = 0; i < 4; i++) set(3 + i, 10 + (i % 2), [90, 90, 92]); };
T2.nether_bricks = (set, r) => brickWall(set, r, { bw: 8, bh: 4, base: [70, 32, 40], mortar: [26, 10, 16], hv: 6, off: 4 });
T2.glass = (set, r) => each((x, y) => { const e = x === 0 || y === 0 || x === 15 || y === 15; const e2 = x === 1 || y === 1 || x === 14 || y === 14; if (e) set(x, y, [196, 222, 236]); else if (e2 && (x === 1 || y === 1)) set(x, y, [236, 248, 255], 230); else if ((x + y === 6 || x + y === 7 || x + y === 18) && x > 1 && y > 1 && x < 14 && y < 14) set(x, y, [250, 255, 255], 200); else set(x, y, [0, 0, 0], 0); });
T2.snow = (set, r) => { const n = tnoise(101, 4); each((x, y) => { let c = vary(mixc([226, 236, 246], [250, 252, 255], n(x, y)), r, 3); if (r() < 0.03) c = [255, 255, 255]; set(x, y, c); }); };
T2.snow_side = (set, r) => { T2.dirt(set, r); grassDrip(set, r, [248, 250, 255], [206, 218, 232], 3); };
T2.netherrack = (set, r) => { const n = tnoise(111, 8), m = tnoise(112, 4); each((x, y) => { const v = n(x, y) * 0.6 + m(x, y) * 0.4; let c = vary(mixc([84, 30, 30], [136, 58, 54], v), r, 8); if (v < 0.32) c = [70, 22, 24]; if (r() < 0.04) c = [164, 82, 74]; set(x, y, c); }); };
T2.obsidian = (set, r) => { const n = tnoise(121, 4); each((x, y) => { const v = n(x, y); let c = vary(mixc([12, 8, 22], [40, 26, 62], v), r, 4); if (r() < 0.05) c = [92, 60, 140]; set(x, y, c); }); for (let k = 0; k < 3; k++) { let x = r() * 16 | 0, y = r() * 16 | 0; for (let i = 0; i < 3; i++) { set(x, y, [70, 46, 110]); x++; y++; } } };
T2.end_stone = (set, r) => { const n = tnoise(131, 4); each((x, y) => set(x, y, vary(mixc([206, 208, 150], [234, 236, 180], n(x, y)), r, 5))); for (let k = 0; k < 6; k++) { const x = 1 + r() * 13 | 0, y = 1 + r() * 13 | 0; set(x, y, [168, 166, 112]); set(x + 1, y, [182, 182, 126]); set(x, y - 1, [246, 246, 200]); } };
T2.bedrock = (set, r) => { const m = voronoi(r, 12); const tones = []; for (let i = 0; i < 12; i++) tones.push([[38, 38, 40], [70, 70, 72], [110, 110, 112], [140, 140, 142]][r() * 4 | 0]); each((x, y) => { const k = y * 16 + x; let c = tones[m.id[k]]; if (m.d2[k] - m.d1[k] < 0.8) c = [24, 24, 26]; set(x, y, vary(c, r, 8)); }); };
T2.wool = (set, r) => { const n = tnoise(141, 8); each((x, y) => { let c = vary(shadeC([238, 238, 236], 0.9 + n(x, y) * 0.12), r, 3); if (((x * 3 + y * 5) % 7) === 0) c = shadeC(c, 0.92); set(x, y, c); }); };
T2.sandstone = (set, r) => { const n = tnoise(151, 4); each((x, y) => { let c = vary(mixc([206, 190, 140], [228, 214, 166], n(x, y)), r, 4); if (y < 3) c = shadeC(c, 1.05); else if (y > 12) c = shadeC(c, 0.9); if (y === 3 || y === 12) c = [184, 166, 118]; set(x, y, c); }); };
T2.sandstone_top = (set, r) => { const n = tnoise(152, 4); each((x, y) => set(x, y, vary(mixc([214, 198, 150], [232, 220, 172], n(x, y)), r, 4))); };
T2.cactus_side = (set, r) => each((x, y) => { let c = vary([74, 140, 50], r, 7); if (x === 0 || x === 15) c = [42, 92, 32]; else if (x % 5 === 2) c = shadeC(c, 0.78); else if (x % 5 === 3) c = shadeC(c, 1.12); if ((x % 5 === 2) && (y % 4 === 1)) c = [230, 230, 200]; set(x, y, c); });
T2.soul_sand = (set, r) => { const n = tnoise(161, 4); each((x, y) => set(x, y, vary(mixc([70, 52, 40], [104, 80, 62], n(x, y)), r, 6))); for (let k = 0; k < 3; k++) { const cx = 2 + r() * 10 | 0, cy = 2 + r() * 10 | 0; set(cx, cy, [36, 24, 18]); set(cx + 2, cy, [36, 24, 18]); set(cx + 1, cy + 2, [30, 20, 16]); set(cx, cy + 3, [48, 34, 26]); set(cx + 1, cy + 3, [48, 34, 26]); set(cx + 2, cy + 3, [48, 34, 26]); } };
for (const k in T2) makeTile(k, (set, r, get) => T2[k](set, r));
// crafting table / bookshelf / chest refresh using the new planks
makeTile('table_top', (set, r) => { T2.planks(set, r, [150, 112, 66]); each((x, y) => { if (x === 0 || y === 0 || x === 15 || y === 15) set(x, y, [86, 58, 32]); else if (x === 1 || y === 1) set(x, y, [178, 140, 88]); }); for (let i = 3; i < 13; i++) { set(i, 7, [86, 58, 32]); set(7, i, [86, 58, 32]); } });
makeTile('table_side', (set, r) => { T2.planks(set, r, [150, 112, 66]); for (let x = 0; x < 16; x++) { set(x, 0, [86, 58, 32]); set(x, 1, [118, 84, 48]); }
  for (let y = 4; y < 11; y++) { set(3, y, [96, 96, 100]); set(4, y, [140, 140, 146]); } for (let x = 2; x < 6; x++) set(x, 4, [70, 70, 74]); set(3, 11, [90, 60, 34]); set(3, 12, [90, 60, 34]);
  for (let y = 6; y < 13; y++) set(11, y, [100, 74, 44]); for (let x = 9; x < 14; x++) { set(x, 5, [110, 110, 116]); set(x, 6, [156, 156, 162]); } });
makeTile('bookshelf', (set, r) => { T2.planks(set, r, [166, 132, 80]); const cols = [[160, 40, 40], [40, 80, 160], [50, 130, 60], [170, 140, 50], [120, 60, 140], [90, 60, 40], [180, 180, 170]];
  for (const [y0, y1] of [[1, 6], [9, 14]]) { for (let x = 0; x < 16; x++) set(x, y1 + 1, [70, 48, 26]); let x = 1; while (x < 15) { const w = 1 + (r() * 2 | 0), c = cols[r() * cols.length | 0], top = y0 + (r() * 2 | 0); for (let i = 0; i < w && x < 15; i++, x++) for (let y = top; y <= y1; y++) set(x, y, vary(shadeC(c, i === 0 ? 1.15 : 0.95), r, 6)); if (r() < 0.3) x++; } } });
function chestPaint(front) { return (set, r) => { T2.planks(set, r, [156, 104, 44]); each((x, y) => { if (x === 0 || x === 15 || y === 0 || y === 15) set(x, y, [62, 38, 14]); else if (y === 5) set(x, y, [74, 46, 18]); else if (y === 6) set(x, y, [176, 124, 60]); }); if (front) { for (let y = 4; y <= 8; y++) for (let x = 7; x <= 8; x++) set(x, y, (y === 4 || y === 8) ? [60, 60, 64] : [200, 200, 206]); set(7, 6, [40, 40, 44]); } }; }
makeTile('chest_side', chestPaint(false)); makeTile('chest_front', chestPaint(true)); makeTile('chest_top', (set, r) => { T2.planks(set, r, [156, 104, 44]); each((x, y) => { if (x === 0 || x === 15 || y === 0 || y === 15) set(x, y, [62, 38, 14]); }); });
makeTile('furnace_side', (set, r) => { T2.stone(set, r); each((x, y) => { if (x === 0 || y === 0 || x === 15 || y === 15) set(x, y, [74, 74, 76]); }); });
makeTile('furnace_front', (set, r) => { T2.stone(set, r); each((x, y) => { if (x === 0 || y === 0 || x === 15 || y === 15) set(x, y, [74, 74, 76]); if (x >= 3 && x <= 12 && y >= 8 && y <= 13) set(x, y, y === 13 ? [230, 120, 30] : y === 12 ? [140, 60, 20] : [22, 22, 22]); if (y === 7 && x >= 2 && x <= 13) set(x, y, [96, 96, 98]); if (x >= 3 && x <= 12 && y === 3) set(x, y, [60, 60, 62]); }); });

// ---- animated tiles (water, lava, portal) ----
const ANIM = {
  water: (t) => (set, r) => each((x, y) => { const v = Math.sin((x + y * 0.5) * 0.8 + t * 2.2) + Math.sin((x * 0.4 - y) * 0.9 - t * 1.6) * 0.6; let c = mixc([36, 78, 196], [64, 116, 226], (v + 1.6) / 3.2); if (v > 1.25) c = [120, 170, 246]; set(x, y, c); }),
  lava: (() => { const n = tnoise(171, 4), m = tnoise(172, 8); return (t) => (set, r) => each((x, y) => { const v = n(x + Math.sin(t * 0.7 + y * 0.3) * 1.5, y + t * 1.6) * 0.6 + m(x - t * 0.8, y + t * 2.4) * 0.4; let c = v < 0.35 ? mixc([140, 36, 8], [206, 74, 14], v / 0.35) : v < 0.7 ? mixc([214, 86, 16], [248, 150, 34], (v - 0.35) / 0.35) : mixc([250, 160, 40], [255, 226, 120], (v - 0.7) / 0.3); set(x, y, c); }); })(),
  portal: (t) => (set, r) => each((x, y) => { const dx = x - 7.5, dy = y - 7.5; const d = Math.hypot(dx, dy); const a = Math.atan2(dy, dx); const v = Math.sin(a * 3 + d * 0.9 - t * 3) * 0.5 + Math.sin(d * 1.3 - t * 2) * 0.3 + Math.sin((x + y) * 0.7 + t) * 0.2; set(x, y, v > 0.45 ? [200, 130, 255] : v > 0 ? [138, 56, 226] : v > -0.4 ? [100, 30, 186] : [70, 12, 140]); }),
};
let animT = 0;
// animated tiles: repaint, then (detailed mode) upscale just those tiles and copy them into the GPU texture in place
const animTex = {};
function animateTiles(dt, tex) { animT += dt; if (animT < 0.1) return; animT = 0; const t = performance.now() / 1000; for (const k in ANIM) makeTile(k, ANIM[k](t)); if (!tex) return;
  if (!HD || typeof renderer === 'undefined' || !renderer.copyTextureToTexture || !tex.__done) { if (HD) for (const k in ANIM) hdTile(TILE[k]); tex.needsUpdate = true; tex.__done = true; return; }
  for (const k in ANIM) { const i = TILE[k]; const img = hdTile(i); let st = animTex[k]; if (!st) { const c = document.createElement('canvas'); c.width = c.height = CELL; st = animTex[k] = { c, x: c.getContext('2d'), tex: new THREE.CanvasTexture(c) }; st.tex.flipY = tex.flipY; }
    st.x.putImageData(img, 0, 0); st.tex.needsUpdate = true; const px = (i % ATN) * CELL, py = Math.floor(i / ATN) * CELL;
    renderer.copyTextureToTexture(new THREE.Vector2(px, tex.flipY ? AW - py - CELL : py), st.tex, tex); } }
for (const k in ANIM) makeTile(k, ANIM[k](0));
buildIcons();

// ================= ITEM ICONS, REDRAWN =================
// Every item gets a 16x16 pixel-art icon drawn on a buffer and then given a dark outline (a darker shade of the
// colour next to it), so items read clearly on any slot. Tools, weapons and armour are drawn from shape rules shared
// by every material; food, materials and misc items have their own drawings.
const IC = {
  canvas(paint, opts = {}) {
    const W = 16, buf = new Array(W * W).fill(null);
    const g = { set: (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= W || !c) return; buf[y * W + x] = c; }, get: (x, y) => (x < 0 || y < 0 || x >= W || y >= W) ? null : buf[y * W + x], r: mulberry32(opts.seed || 77) };
    paint(g);
    if (opts.outline !== false) { const out = buf.slice(); for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { if (buf[y * W + x]) continue; let n = null; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = g.get(x + a, y + b); if (q && !q.noOut) { n = q; break; } } if (n) out[y * W + x] = IC.mix(n, [0, 0, 0], opts.outDark || 0.62); } for (let i = 0; i < W * W; i++) buf[i] = out[i]; }
    const c = document.createElement('canvas'); c.width = c.height = W; const x = c.getContext('2d'); const img = x.createImageData(W, W);
    for (let i = 0; i < W * W; i++) { const p = buf[i]; if (!p) continue; img.data[i * 4] = clamp(Math.round(p[0]), 0, 255); img.data[i * 4 + 1] = clamp(Math.round(p[1]), 0, 255); img.data[i * 4 + 2] = clamp(Math.round(p[2]), 0, 255); img.data[i * 4 + 3] = p[3] != null ? p[3] : 255; }
    x.putImageData(img, 0, 0); return c;
  },
  mix: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  sh: (c, k) => k > 0 ? IC.mix(c, [255, 255, 255], k) : IC.mix(c, [0, 0, 0], -k),
  line(g, x0, y0, x1, y1, col) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0; for (let i = 0; i <= n; i++) { const t = n ? i / n : 0; g.set(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, typeof col === 'function' ? col(t, i) : col); } },
  disc(g, cx, cy, rx, ry, colAt) { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (d <= 1) g.set(x, y, colAt(x, y, d)); } },
  // a lit sphere/blob: highlight top-left, shadow bottom-right
  ball(g, cx, cy, rx, ry, base, o = {}) { IC.disc(g, cx, cy, rx, ry, (x, y, d) => { const l = ((cx - x) / rx + (cy - y) / ry) * 0.5; let c = IC.sh(base, l * (o.k || 0.35)); if (d < 0.25 && x < cx && y < cy && o.shine !== false) c = IC.sh(base, 0.45); if (o.speck && g.r() < o.speck[1]) c = o.speck[0]; return c; }); },
  // from an ascii template: map of char -> colour
  art(g, rows, pal, ox = 0, oy = 0) { rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.' && ch !== ' ' && pal[ch]) g.set(ox + x, oy + y, pal[ch]); })); },
};
// ---------- materials ----------
const MAT = {
  wood: { c: [168, 128, 74], l: [204, 164, 104], d: [116, 84, 46] }, wooden: null,
  stone: { c: [136, 136, 136], l: [176, 176, 176], d: [92, 92, 92] },
  iron: { c: [214, 214, 214], l: [250, 250, 250], d: [150, 150, 156] },
  golden: { c: [244, 206, 62], l: [255, 246, 150], d: [196, 140, 22] }, gold: null,
  diamond: { c: [74, 222, 208], l: [180, 255, 246], d: [30, 150, 140] },
  netherite: { c: [86, 76, 84], l: [134, 122, 132], d: [52, 44, 52] },
  copper: { c: [216, 120, 76], l: [246, 170, 120], d: [150, 76, 46] },
  chainmail: { c: [150, 152, 162], l: [200, 202, 210], d: [88, 90, 100] },
  leather: { c: [150, 92, 52], l: [190, 128, 80], d: [100, 58, 30] },
};
MAT.wooden = MAT.wood; MAT.gold = MAT.golden;
const STICK = { c: [138, 100, 54], l: [176, 134, 80], d: [92, 64, 32] };
// the handle every tool shares: from the bottom-left corner up to (tx, ty)
function icHandle(g, tx = 9, ty = 6, S = STICK) { for (let i = 0; ; i++) { const x = 2 + i, y = 13 - i; if (x > tx) break; g.set(x, y, S.c); g.set(x + 1, y, S.d); if (i % 3 === 1) g.set(x, y, S.l); } g.set(1, 14, S.d); g.set(2, 14, S.d); }
const TOOL = {
  pickaxe(g, M) { icHandle(g, 8, 7); // the head: an arch across the top-right, perpendicular to the handle
    const pts = [[3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 3], [9, 3], [10, 4], [11, 5], [12, 6], [12, 7], [13, 8], [13, 9], [13, 10], [13, 11]];
    pts.forEach(([x, y], i) => { g.set(x, y, M.l); g.set(x, y + 1, M.c); if (i > 6) g.set(x - 1, y + 1, M.d); }); g.set(3, 3, M.d); g.set(4, 3, M.d); g.set(12, 12, M.d); g.set(13, 12, M.d); g.set(9, 4, M.c); g.set(10, 5, M.c); g.set(8, 4, M.d); g.set(9, 6, M.d); },
  axe(g, M) { icHandle(g, 9, 6); // a broad blade on the upper-left of the handle top
    const blade = ['..LLL..', '.LCCCL.', 'LCCCCCd', 'LCCCCdd', '.LCCdd.', '..Cdd..', '...d...'];
    IC.art(g, blade, { L: M.l, C: M.c, d: M.d }, 5, 1); g.set(10, 5, M.d); g.set(11, 4, M.c); g.set(11, 5, M.d); g.set(10, 4, M.c); },
  shovel(g, M) { icHandle(g, 9, 6); // a rounded spade at the end of the handle
    const s = ['...LL', '..LCC', '.LCCC', 'LCCCd', 'LCCdd', '.Cdd.']; IC.art(g, s, { L: M.l, C: M.c, d: M.d }, 9, 1); g.set(14, 1, M.l); g.set(13, 0, null); g.set(10, 6, M.d); },
  hoe(g, M) { icHandle(g, 9, 6); // a flat blade sticking out to the upper-left
    const s = ['LLLLC.', 'CCCCCd', '...dd.', '...d..']; IC.art(g, s, { L: M.l, C: M.c, d: M.d }, 5, 3); g.set(10, 5, M.c); g.set(11, 4, M.c); g.set(10, 4, M.l); },
  sword(g, M) { // blade from the guard to the top-right tip, a crossguard and a short grip
    for (let i = 0; i < 9; i++) { const x = 5 + i, y = 10 - i; g.set(x, y - 1, M.l); g.set(x, y, M.c); g.set(x + 1, y, M.d); } g.set(14, 1, M.l); g.set(14, 0, null);
    const guard = M === MAT.wood ? STICK.d : M === MAT.golden || M === MAT.diamond || M === MAT.netherite ? IC.sh(M.d, -0.15) : [78, 56, 36];
    IC.line(g, 2, 8, 6, 12, guard); g.set(3, 8, IC.sh(guard, 0.3)); g.set(2, 8, IC.sh(guard, 0.15));
    IC.line(g, 4, 11, 2, 13, STICK.c); g.set(3, 13, STICK.d); g.set(1, 14, [70, 50, 30]); },
  spear(g, M) { for (let i = 0; i < 10; i++) { const x = 1 + i, y = 14 - i; g.set(x, y, i % 3 ? STICK.c : STICK.l); g.set(x + 1, y, STICK.d); }
    const s = ['....LL', '...LCC', '..LCCd', '.LCCd.', '.CCd..', '..d...']; IC.art(g, s, { L: M.l, C: M.c, d: M.d }, 9, 0); },
};
// ---------- armour (front views, filling the slot) ----------
const ARMOR_ART = {
  helmet: ['..LLLLLLLLLL..', '.LCCCCCCCCCCd.', '.LCCCCCCCCCCd.', '.LCdddddddCCd.', '.LCd......dCd.', '.LCd......dCd.', '..d........d..'],
  chestplate: ['..LL......LL..', '.LCCd....LCCd.', '.LCCCLLLLCCCd.', '.LCCCCCCCCCCd.', '..dLCCCCCCCd..', '...LCCCCCCd...', '...LCCCCCCd...', '...LCCCCCCd...', '...LCCCCCCd...', '...LCCCCCCd...', '...dddddddd...'],
  leggings: ['..LLLLLLLLLL..', '..LCCCCCCCCd..', '..LCCCCCCCCd..', '..LCCd..LCCd..', '..LCCd..LCCd..', '..LCCd..LCCd..', '..LCCd..LCCd..', '..LCCd..LCCd..', '..LCCd..LCCd..', '..dddd..dddd..'],
  boots: ['.LLd....LLd...', '.LCd....LCd...', '.LCd....LCd...', 'LCCd...LCCd...', 'LCCCd..LCCCd..', 'ddddd..ddddd..'],
};
function icArmor(M, piece) { return (g) => { const art = ARMOR_ART[piece]; const oy = Math.round((16 - art.length) / 2), ox = piece === 'boots' ? 2 : 1;
  IC.art(g, art, { L: M.l, C: M.c, d: M.d }, ox, oy);
  if (M === MAT.chainmail) for (let y = 0; y < 16; y++) for (let x = (y & 1); x < 16; x += 2) { const c = g.get(x, y); if (c) g.set(x, y, IC.sh(c, -0.25)); }
  if (M === MAT.leather && piece === 'helmet') { g.set(3, oy + 1, IC.sh(M.c, -0.2)); } }; }
// ---------- simple shapes ----------
const ICONS2 = {
  stick: (g) => { for (let i = 0; i < 11; i++) { const x = 3 + i, y = 13 - i; g.set(x, y, i % 4 === 1 ? STICK.l : STICK.c); g.set(x + 1, y, STICK.d); } },
  feather: (g) => { IC.line(g, 3, 13, 12, 3, [230, 230, 230]); for (let i = 0; i < 8; i++) { const x = 5 + i, y = 11 - i; g.set(x - 1, y - 1, [250, 250, 250]); g.set(x - 2, y - 1, i > 1 && i < 7 ? [222, 222, 228] : null); g.set(x + 1, y + 1, [200, 200, 210]); g.set(x + 2, y + 1, i > 2 && i < 6 ? [180, 180, 190] : null); } g.set(2, 14, [150, 150, 160]); },
  bone: (g) => { const W = [244, 240, 226], S = [196, 190, 172]; IC.line(g, 4, 11, 11, 4, W); IC.line(g, 5, 11, 12, 4, S); for (const [x, y] of [[2, 11], [3, 10], [3, 12], [4, 13], [12, 2], [13, 3], [11, 3], [12, 5]]) g.set(x, y, W); g.set(4, 12, S); g.set(12, 4, S); g.set(13, 4, S); },
  coal: (g) => IC.ball(g, 7.5, 8, 5.5, 5, [44, 44, 46], { speck: [[90, 90, 96], 0.12] }),
  charcoal: (g) => IC.ball(g, 7.5, 8, 5.5, 5, [60, 50, 40]),
  flint: (g) => { const art = ['...LL....', '..LCCd...', '.LCCCCd..', '.LCCCCCd.', 'LCCCCCCd.', 'LCCCCCdd.', '.CCCCdd..', '..Cddd...', '...dd....']; IC.art(g, art, { L: [110, 110, 116], C: [70, 70, 76], d: [44, 44, 48] }, 4, 3); },
  gunpowder: (g) => { IC.disc(g, 8, 10, 6, 3.6, (x, y, d) => g.r() < 0.25 ? [40, 40, 40] : g.r() < 0.4 ? [140, 140, 140] : [96, 96, 96]); IC.disc(g, 8, 7, 3.5, 2.5, () => g.r() < 0.3 ? [140, 140, 140] : [100, 100, 100]); },
  leather: (g) => { const art = ['.LLL..LLL.', 'LCCCLLCCCd', 'LCCCCCCCCd', '.LCCCCCCd.', '.LCCCCCCd.', 'LCCCCCCCCd', 'LCCCdCCCCd', '.ddd..ddd.']; IC.art(g, art, { L: [190, 124, 74], C: [154, 92, 50], d: [108, 62, 32] }, 3, 4); },
  paper: (g) => { for (let y = 3; y <= 13; y++) for (let x = 3; x <= 12; x++) g.set(x, y, (y % 3 === 0 && x > 4 && x < 11) ? [196, 196, 186] : [246, 246, 238]); g.set(12, 3, null); g.set(11, 3, [220, 220, 210]); g.set(12, 4, [220, 220, 210]); },
  book: (g) => { for (let y = 2; y <= 13; y++) for (let x = 3; x <= 12; x++) g.set(x, y, x === 3 ? [90, 52, 30] : x === 12 || y === 13 ? [240, 236, 220] : [150, 84, 46]); for (let y = 3; y <= 12; y++) g.set(4, y, [120, 68, 36]); for (let x = 6; x <= 10; x++) g.set(x, 5, [200, 160, 60]); },
  sugar: (g) => IC.disc(g, 8, 10, 5.5, 3.5, () => g.r() < 0.3 ? [220, 220, 228] : [252, 252, 252]),
  redstone: (g) => IC.disc(g, 8, 9.5, 5.5, 4, () => g.r() < 0.3 ? [120, 0, 0] : g.r() < 0.5 ? [255, 40, 30] : [200, 10, 10]),
  glowstone_dust: (g) => IC.disc(g, 8, 9.5, 5.5, 4, () => g.r() < 0.3 ? [180, 130, 40] : g.r() < 0.5 ? [255, 240, 150] : [240, 200, 90]),
  blaze_powder: (g) => IC.disc(g, 8, 9.5, 5.5, 4, () => g.r() < 0.3 ? [200, 80, 10] : g.r() < 0.5 ? [255, 230, 90] : [250, 160, 30]),
  bone_meal: (g) => IC.disc(g, 8, 9.5, 5.5, 4, () => g.r() < 0.35 ? [210, 210, 196] : [250, 250, 240]),
  slime_ball: (g) => IC.ball(g, 8, 8.5, 5, 5, [110, 196, 90], { k: 0.4 }),
  magma_cream: (g) => { IC.ball(g, 8, 8.5, 5, 5, [190, 80, 30], { k: 0.3 }); for (const [x, y] of [[6, 7], [9, 9], [7, 11], [10, 6]]) g.set(x, y, [255, 210, 60]); },
  ender_pearl: (g) => { IC.ball(g, 8, 8, 5.5, 5.5, [20, 92, 80], { k: 0.3 }); IC.disc(g, 8, 8, 2.6, 2.6, () => [40, 160, 130]); g.set(6, 6, [160, 240, 220]); },
  egg: (g) => IC.ball(g, 8, 8.5, 4.5, 5.8, [240, 222, 180], { k: 0.25, speck: [[200, 170, 120], 0.06] }),
  snowball: (g) => IC.ball(g, 8, 8, 5, 5, [240, 248, 255], { k: 0.2 }),
  clay_ball: (g) => IC.ball(g, 8, 8, 5, 4.5, [160, 166, 180], { k: 0.25 }),
  // food
  apple: (g) => { IC.ball(g, 8, 9, 5.5, 5, [220, 30, 30], { k: 0.3 }); g.set(8, 3, [100, 70, 40]); g.set(8, 4, [100, 70, 40]); g.set(9, 3, [70, 160, 50]); g.set(10, 2, [70, 160, 50]); g.set(10, 3, [50, 120, 40]); },
  golden_apple: (g) => { IC.ball(g, 8, 9, 5.5, 5, [250, 210, 60], { k: 0.35 }); g.set(8, 3, [140, 110, 40]); g.set(8, 4, [140, 110, 40]); g.set(9, 3, [250, 240, 120]); g.set(10, 2, [250, 240, 120]); },
  bread: (g) => { const art = ['...LLLLLL...', '..LCCLCCLCd.', '.LCCCCCCCCCd', 'LCCCCCCCCCCd', 'LCCCCCCCCCdd', '.dddddddddd.']; IC.art(g, art, { L: [230, 180, 100], C: [196, 136, 60], d: [140, 90, 40] }, 2, 5); for (const x of [5, 8, 11]) g.set(x, 6, [240, 210, 150]); },
  raw_pork: (g) => icMeat(g, [240, 150, 150], [255, 200, 200], [200, 100, 110], true),
  cooked_pork: (g) => icMeat(g, [196, 126, 80], [230, 170, 110], [140, 80, 40], true),
  raw_beef: (g) => icMeat(g, [200, 46, 46], [240, 100, 90], [140, 20, 24], false, [255, 220, 220]),
  steak: (g) => icMeat(g, [130, 70, 40], [170, 106, 60], [84, 42, 22], false, [200, 150, 110]),
  mutton: (g) => icMeat(g, [210, 70, 70], [240, 120, 110], [150, 40, 40], false, [255, 230, 230]),
  cooked_mutton: (g) => icMeat(g, [150, 84, 50], [190, 120, 76], [100, 54, 30], false, [220, 180, 140]),
  raw_chicken: (g) => icDrum(g, [240, 196, 170], [255, 226, 206], [196, 150, 130]),
  cooked_chicken: (g) => icDrum(g, [200, 130, 60], [236, 176, 100], [150, 90, 34]),
  rabbit: (g) => icDrum(g, [230, 170, 150], [250, 206, 190], [190, 130, 114], true),
  cooked_rabbit: (g) => icDrum(g, [180, 110, 60], [220, 150, 96], [130, 76, 36], true),
  rotten_flesh: (g) => { icMeat(g, [130, 90, 50], [160, 120, 70], [90, 60, 30], false); for (let i = 0; i < 8; i++) g.set(4 + g.r() * 8, 5 + g.r() * 7, [80, 120, 50]); },
  carrot: (g) => { for (let i = 0; i < 9; i++) { const x = 3 + i, y = 13 - i, w = i < 2 ? 0 : 1; g.set(x, y, [250, 140, 30]); g.set(x + 1, y, [220, 110, 20]); if (w) g.set(x, y - 1, [255, 170, 60]); } IC.art(g, ['.G.G', 'GGG.', '.GG.'], { G: [80, 170, 50] }, 11, 1); },
  potato: (g) => IC.ball(g, 8, 8.5, 5.5, 4.5, [200, 160, 80], { k: 0.25, speck: [[150, 110, 50], 0.06] }),
  baked_potato: (g) => { IC.ball(g, 8, 8.5, 5.5, 4.5, [210, 150, 60], { k: 0.3 }); for (let x = 6; x <= 10; x++) g.set(x, 7, [250, 230, 150]); },
  cookie: (g) => { IC.ball(g, 8, 8, 6, 6, [210, 146, 70], { k: 0.2, shine: false }); for (const [x, y] of [[6, 6], [10, 7], [7, 10], [10, 11], [5, 9], [9, 4]]) g.set(x, y, [80, 46, 26]); },
  melon_slice: (g) => { for (let y = 3; y <= 13; y++) for (let x = 2; x <= 13; x++) { const d = x + (15 - y); if (d >= 12 && d <= 17 && x - y < 6 && y - x < 6) g.set(x, y, d >= 16 ? [70, 150, 50] : d === 15 ? [220, 240, 170] : ((x * 3 + y) % 7 === 0 ? [40, 20, 20] : [230, 60, 60])); } },
  sweet_berries: (g) => { for (const [x, y] of [[5, 9], [10, 10], [7, 12], [9, 7]]) IC.ball(g, x, y, 2.2, 2.2, [190, 30, 40], { k: 0.4 }); IC.line(g, 8, 2, 8, 6, [70, 120, 40]); IC.line(g, 8, 4, 11, 6, [70, 120, 40]); },
  // misc
  arrow: (g) => { IC.line(g, 3, 12, 11, 4, STICK.c); IC.line(g, 4, 12, 12, 4, STICK.d); IC.art(g, ['..LL', '.LCC', 'LCCd', '.Cd.'], { L: [230, 230, 236], C: [180, 180, 190], d: [120, 120, 130] }, 11, 1); IC.art(g, ['F.F.', '.FF.', 'FFFF', '..F.'], { F: [240, 240, 240] }, 1, 11); },
  bucket: (g) => icBucket(g, null), water_bucket: (g) => icBucket(g, [50, 90, 230]), lava_bucket: (g) => icBucket(g, [250, 120, 20]), milk_bucket: (g) => icBucket(g, [250, 250, 250]),
  iron_ingot: (g) => icIngot(g, MAT.iron), gold_ingot: (g) => icIngot(g, MAT.golden), copper_ingot: (g) => icIngot(g, MAT.copper), netherite_ingot: (g) => icIngot(g, MAT.netherite),
  iron_nugget: (g) => { IC.ball(g, 6, 9, 2.5, 2, MAT.iron.c); IC.ball(g, 10, 7, 2.2, 1.8, MAT.iron.c); IC.ball(g, 9, 11, 2, 1.6, MAT.iron.c); },
  gold_nugget: (g) => { IC.ball(g, 6, 9, 2.5, 2, MAT.golden.c); IC.ball(g, 10, 7, 2.2, 1.8, MAT.golden.c); IC.ball(g, 9, 11, 2, 1.6, MAT.golden.c); },
  copper_nugget: (g) => { IC.ball(g, 6, 9, 2.5, 2, MAT.copper.c); IC.ball(g, 10, 7, 2.2, 1.8, MAT.copper.c); },
  raw_iron: (g) => IC.ball(g, 8, 8.5, 5.5, 4.5, [216, 180, 150], { speck: [[160, 120, 90], 0.15] }), raw_gold: (g) => IC.ball(g, 8, 8.5, 5.5, 4.5, [240, 200, 60], { speck: [[190, 140, 30], 0.15] }), raw_copper: (g) => IC.ball(g, 8, 8.5, 5.5, 4.5, [220, 120, 80], { speck: [[150, 80, 50], 0.15] }),
  netherite_scrap: (g) => IC.ball(g, 8, 8.5, 5.5, 4.5, [96, 72, 66], { speck: [[60, 44, 40], 0.2] }),
  brick: null,
  ink_sac: (g) => { IC.ball(g, 8, 9, 5, 4.5, [30, 30, 40]); g.set(6, 7, [90, 90, 110]); },

  bow: (g) => { const W = STICK; const arc = [[3, 2], [4, 2], [5, 2], [6, 3], [7, 3], [8, 4], [9, 5], [10, 6], [11, 7], [12, 8], [12, 9], [13, 10], [13, 11], [13, 12], [13, 13]]; arc.forEach(([x, y], i) => { g.set(x, y, i % 4 === 1 ? W.l : W.c); g.set(x - 1, y + 1, W.d); }); IC.line(g, 3, 3, 12, 13, [230, 230, 230]); g.set(8, 8, [120, 120, 120]); },
  fishing_rod: (g) => { for (let i = 0; i < 11; i++) { const x = 2 + i, y = 13 - i; g.set(x, y, i < 3 ? [90, 60, 30] : STICK.c); g.set(x + 1, y, STICK.d); } for (let y = 3; y <= 12; y++) g.set(13, y, [220, 220, 220]); g.set(13, 12, [200, 50, 50]); g.set(13, 13, [240, 240, 240]); },
  blaze_rod: (g) => { for (let i = 0; i < 11; i++) { const x = 3 + i, y = 13 - i; g.set(x, y, i % 2 ? [255, 210, 60] : [250, 170, 30]); g.set(x + 1, y, [200, 110, 10]); } g.set(13, 2, [255, 240, 150]); },
  breeze_rod: (g) => { for (let i = 0; i < 11; i++) { const x = 3 + i, y = 13 - i; g.set(x, y, i % 2 ? [200, 220, 255] : [150, 180, 240]); g.set(x + 1, y, [100, 120, 190]); } for (const [x, y] of [[5, 9], [9, 5], [7, 4], [11, 8]]) g.set(x, y, [230, 240, 255]); },
  shears: (g) => { IC.art(g, ['LL.......', 'LCL......', '.LCL.....', '..LCL..LL', '...LCLLCd', '....LCCd.', '...LCddL.', '..LCd.LCL', '.Ld....LC'], { L: [240, 240, 244], C: [190, 190, 200], d: [120, 120, 130] }, 2, 2); IC.ball(g, 4, 12, 2.2, 2.2, [150, 40, 40]); IC.ball(g, 12, 12, 2.2, 2.2, [150, 40, 40]); g.set(4, 12, null); g.set(12, 12, null); },
  flint_and_steel: (g) => { IC.art(g, ['.LLLL.', 'LCCCCd', 'LCdddd', 'LCd...', 'LCd...', '.d....'], { L: [230, 230, 236], C: [180, 180, 190], d: [110, 110, 120] }, 2, 3); IC.art(g, ['..LL..', '.LCCd.', 'LCCCCd', '.CCCd.', '..dd..'], { L: [110, 110, 116], C: [70, 70, 76], d: [44, 44, 48] }, 8, 8); },
  trident: (g) => { for (let i = 0; i < 9; i++) { const x = 2 + i, y = 13 - i; g.set(x, y, [60, 150, 140]); g.set(x + 1, y, [30, 100, 96]); } IC.art(g, ['...L..L', '..LC.LC', '.LC.LCd', 'LCCCCd.', '.LCCd..', 'LCdd...', 'Cd.....'], { L: [170, 240, 220], C: [80, 190, 170], d: [40, 120, 110] }, 8, 1); },
  mace: (g) => { for (let i = 0; i < 7; i++) { const x = 2 + i, y = 13 - i; g.set(x, y, [70, 60, 60]); g.set(x + 1, y, [40, 34, 34]); } IC.ball(g, 10.5, 5.5, 3.6, 3.6, [120, 110, 110], { k: 0.4 }); for (const [x, y] of [[10, 1], [14, 5], [7, 3], [13, 2], [14, 8], [11, 9]]) g.set(x, y, [200, 196, 190]); },
  crossbow: (g) => { IC.line(g, 3, 12, 12, 3, STICK.c); IC.line(g, 4, 12, 13, 3, STICK.d); IC.art(g, ['LLLLL...', 'LCCCCd..', '.....Cd.', '......Cd', '.......C'], { L: [170, 170, 176], C: [130, 130, 136], d: [90, 90, 96] }, 2, 3); IC.line(g, 3, 4, 10, 11, [230, 230, 230]); IC.line(g, 7, 3, 12, 8, [120, 120, 126]); },
  quartz: (g) => IC.art(g, ['....L....', '...LCd...', '..LCCCd..', '.LCCCCCd.', 'LCCCLCCCd', '.LCCCCCd.', '..LCCCd..', '...LCd...', '....d....'], { L: [255, 255, 255], C: [236, 228, 222], d: [190, 176, 170] }, 3, 3),
  ghast_tear: (g) => IC.art(g, ['...L..', '..LCd.', '..LCd.', '.LCCCd', '.LCCCd', 'LCCCCd', 'LCCCCd', '.LCCd.', '..dd..'], { L: [255, 255, 255], C: [200, 230, 236], d: [140, 180, 190] }, 5, 3),
  nether_brick: (g) => IC.art(g, ['.LLLLLLLLLL.', 'LCCCCCCCCCCd', 'LCCCCCCCCCCd', 'LCCCCCCCCCCd', '.dddddddddd.'], { L: [130, 60, 66], C: [86, 38, 44], d: [56, 22, 28] }, 2, 6),
  string: (g) => { const pts = [[3, 12], [4, 11], [5, 11], [6, 10], [7, 9], [8, 9], [9, 8], [10, 7], [11, 6], [12, 5], [12, 4], [11, 3], [10, 3], [9, 4], [9, 5], [10, 6]]; pts.forEach(([x, y]) => g.set(x, y, [236, 236, 236])); g.set(2, 13, [200, 200, 206]); g.set(13, 5, [200, 200, 206]); },
};
function icMeat(g, C, L, D, fat, bone) { const art = ['....LLLL....', '..LLCCCCLL..', '.LCCCCCCCCd.', 'LCCCCCCCCCCd', 'LCCCCCCCCCCd', '.LCCCCCCCCd.', '..dCCCCCCd..', '...dddddd...']; IC.art(g, art, { L, C, d: D }, 2, 4);
  if (fat) for (let x = 3; x <= 12; x++) g.set(x, 6 + (x % 3 === 0 ? 1 : 0), IC.mix(L, [255, 255, 255], 0.6)); else { for (let i = 0; i < 5; i++) g.set(4 + i * 2, 7 + (i % 2) * 2, IC.sh(C, 0.35)); }
  if (bone) { g.set(12, 7, bone); g.set(13, 7, bone); g.set(13, 8, bone); } }
function icDrum(g, C, L, D, small) { IC.ball(g, 6.5, 6.5, small ? 3.5 : 4.5, small ? 3.5 : 4.5, C, { k: 0.3 }); IC.line(g, 9, 9, 13, 13, [244, 240, 226]); g.set(12, 13, [244, 240, 226]); g.set(13, 12, [244, 240, 226]); g.set(14, 14, [210, 204, 190]); g.set(5, 4, L); }
function icBucket(g, fill) { const art = ['.dCCCCCCd.', 'dLLLLLLLLd', 'dCCCCCCCCd', '.CCCCCCCC.', '.CCCCCCCd.', '..CCCCCd..', '..dCCCCd..', '...dddd...']; IC.art(g, art, { L: [240, 240, 244], C: [196, 196, 204], d: [130, 130, 140] }, 3, 6); IC.line(g, 4, 6, 6, 3, [150, 150, 160]); IC.line(g, 6, 3, 10, 3, [150, 150, 160]); IC.line(g, 10, 3, 12, 6, [150, 150, 160]);
  if (fill) for (let x = 4; x <= 11; x++) g.set(x, 7, fill), g.set(x, 8, IC.sh(fill, -0.15)); }
function icIngot(g, M) { const art = ['....LLLLLLL..', '...LCCCCCCCd.', '..LCCCCCCCdd.', '.LCCCCCCCdd..', 'dddddddddd...']; IC.art(g, art, { L: M.l, C: M.c, d: M.d }, 2, 6); g.set(6, 7, M.l); g.set(7, 7, M.l); }
// ---------- apply ----------
{
  const mats = ['wood', 'stone', 'iron', 'golden', 'diamond', 'netherite'];
  const pref = { wood: ['wood', 'wooden'], stone: ['stone'], iron: ['iron'], golden: ['golden', 'gold'], diamond: ['diamond'], netherite: ['netherite'] };
  for (const m of mats) for (const tool of ['pickaxe', 'axe', 'shovel', 'hoe', 'sword']) for (const p of pref[m]) { const k = p + '_' + tool; if (IT[k] != null) ICONS2[k] = (g) => TOOL[tool](g, MAT[m]); }
  for (const m of ['wooden', 'stone', 'copper', 'iron', 'golden', 'diamond', 'netherite']) if (IT[m + '_spear'] != null) ICONS2[m + '_spear'] = (g) => TOOL.spear(g, MAT[m] || MAT.wood);
  for (const m of ['leather', 'golden', 'iron', 'diamond', 'netherite', 'chainmail']) for (const p of ['helmet', 'chestplate', 'leggings', 'boots']) if (IT[m + '_' + p] != null) ICONS2[m + '_' + p] = icArmor(MAT[m], p);
  for (const k in ICONS2) { const f = ICONS2[k]; if (!f || IT[k] == null || ITEMS[IT[k]].kind === 'block') continue; try { const c = IC.canvas(f, { seed: IT[k] }); ICON_CANVAS[IT[k]] = c; ICON[IT[k]] = c.toDataURL(); } catch (e) { console.warn('icon', k, e); } }
}

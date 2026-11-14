// ================= CAVES AND MORE PLANTS (Minecraft) =================
// Lush caves: azalea and flowering azalea, azalea leaves, cave vines with glow berries, hanging roots, spore blossoms,
// small and big dripleaf, glow lichen. Dripstone: pointed dripstone (stalactites and stalagmites that taper).
// Amethyst: blocks, budding amethyst growing small / medium / large buds and clusters, tinted glass. Snow layers (1-8),
// powder snow, sweet berry bushes, bamboo, cocoa pods, twisting and weeping vines, nether sprouts, sculk catalyst and
// sculk vein. Original pixel art.
function defineCaveBlocks() {
  const ph = (n, c, a) => { if (TILE[n] === undefined) makeTile(n, (set) => each((x, y) => set(x, y, c, a === undefined ? 255 : a))); return n; };
  const plant = (key, name, o) => defBlock(key, name, Object.assign({ tex: ph(key, [80, 150, 50], 0), solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', plant: true }, o));
  const clone = (d) => { const o = Object.assign({}, d); delete o.id; delete o.key; delete o.texIds; return o; };
  // lush caves
  ph('azalea_leaves', [90, 130, 40]); ph('flowering_azalea_leaves', [110, 130, 60]);
  defBlock('azalea_leaves', 'Azalea Leaves', { tex: 'azalea_leaves', opaque: false, render: 'cutout', cullSame: true, hardness: 0.2, snd: 'grass', mine: 'hoe', drop: (r) => r < 0.05 ? ['azalea', 1] : r < 0.07 ? ['stick', 1] : null });
  defBlock('flowering_azalea_leaves', 'Flowering Azalea Leaves', { tex: 'flowering_azalea_leaves', opaque: false, render: 'cutout', cullSame: true, hardness: 0.2, snd: 'grass', mine: 'hoe', drop: (r) => r < 0.05 ? ['flowering_azalea', 1] : r < 0.07 ? ['stick', 1] : null });
  for (const [k, n, leaf] of [['azalea', 'Azalea', 'azalea_leaves'], ['flowering_azalea', 'Flowering Azalea', 'flowering_azalea_leaves']])
    defBlock(k, n, { tex: { s: leaf, t: leaf, b: ph('azalea_stem', [110, 90, 50]) }, render: 'boxes', boxes: [[0, 8, 0, 16, 16, 16], [7, 0, 7, 9, 8, 9, TILE.azalea_stem]], opaque: false, solid: true, hardness: 0, snd: 'grass', sapling: k, plant: false });
  plant('cave_vines', 'Cave Vines', { hanging: true, support: 'ceiling_vine', drop: null, climb: true });
  plant('cave_vines#lit', 'Cave Vines', { tex: ph('cave_vines_lit', [80, 150, 50], 0), hanging: true, support: 'ceiling_vine', hidden: true, light: 0.9, glowBerries: true, drop: (r) => ['glow_berries', 1], climb: true });
  plant('hanging_roots', 'Hanging Roots', { hanging: true, support: 'ceiling', drop: null });
  plant('spore_blossom', 'Spore Blossom', { hanging: true, support: 'ceiling', crossDir: 1 });
  plant('small_dripleaf', 'Small Dripleaf', { tex: ph('small_dripleaf_bottom', [80, 150, 50], 0), tallLower: true, drop: null }); plant('small_dripleaf#top', 'Small Dripleaf', { tex: ph('small_dripleaf_top', [80, 150, 50], 0), tallUpper: true, hidden: true, drop: 'small_dripleaf' });
  BL[B.SMALL_DRIPLEAF].tallOther = B['SMALL_DRIPLEAF#TOP']; BL[B['SMALL_DRIPLEAF#TOP']].tallOther = B.SMALL_DRIPLEAF; BL[B.SMALL_DRIPLEAF].iconTile = 'small_dripleaf_top';
  defBlock('big_dripleaf', 'Big Dripleaf', { tex: { s: ph('big_dripleaf_stem', [90, 140, 50]), t: ph('big_dripleaf_top', [100, 170, 50]) }, render: 'boxes', boxes: [[0, 15, 0, 16, 16, 16], [7, 0, 7, 9, 15, 9]], opaque: false, solid: true, hardness: 0.1, snd: 'grass', dripleaf: true });
  // glow lichen: on the floor, ceiling or a wall
  ph('glow_lichen', [120, 150, 120], 0); const gl = BL.length;
  for (let f = 0; f < 6; f++) { const b = [[0, 0, 0, 16, 0.6, 16], [0, 15.4, 0, 16, 16, 16], [0, 0, 15.4, 16, 16, 16], [0, 0, 0, 0.6, 16, 16], [0, 0, 0, 16, 16, 0.6], [15.4, 0, 0, 16, 16, 16]][f]; // floor, ceiling, then walls the lichen sits on: south, west, north, east
    defBlock(f ? 'glow_lichen#' + f : 'glow_lichen', 'Glow Lichen', { tex: 'glow_lichen', render: 'boxes', boxes: [b], support: 'lichen', solid: false, opaque: false, hardness: 0.2, snd: 'grass', light: 0.47, lichen: f, lichenBase: gl, hidden: f > 0, drop: null, flatIcon: true }); }
  // pointed dripstone: pointing up (stalagmite) or down (stalactite), tip / frustum / middle / base
  const pd = {}; for (const dir of ['up', 'down']) for (const th of ['tip', 'frustum', 'middle', 'base']) { const t = ph('pointed_dripstone_' + th, [140, 110, 90], 0);
    pd[dir + ',' + th] = defBlock(dir === 'up' && th === 'tip' ? 'pointed_dripstone' : 'pointed_dripstone#' + dir + '_' + th, 'Pointed Dripstone', { tex: t, render: 'cross', crossDir: dir === 'down' ? 1 : 0, solid: false, opaque: false, hardness: 1.5, tool: 'pick', tier: 1, mine: 'pick', snd: 'stone', hidden: !(dir === 'up' && th === 'tip'), drop: 'pointed_dripstone', drip: { dir, th } }); }
  FAMILY.pointed_dripstone = { kind: 'drip', props: ['dir', 'th'], ids: pd, base: pd['up,tip'] };
  // amethyst
  defBlock('amethyst_block', 'Block of Amethyst', { tex: ph('amethyst_block', [150, 100, 200]), hardness: 1.5, tool: 'pick', tier: 1, mine: 'pick', snd: 'glass' });
  defBlock('budding_amethyst', 'Budding Amethyst', { tex: ph('budding_amethyst', [140, 90, 190]), hardness: 1.5, mine: 'pick', snd: 'glass', drop: null });
  defBlock('tinted_glass', 'Tinted Glass', { tex: ph('tinted_glass', [40, 30, 50]), opaque: false, render: 'cube', cullSame: true, translucent: true, hardness: 0.3, snd: 'glass' });
  for (const [k, n, size, light] of [['small_amethyst_bud', 'Small Amethyst Bud', 1, 0.07], ['medium_amethyst_bud', 'Medium Amethyst Bud', 2, 0.13], ['large_amethyst_bud', 'Large Amethyst Bud', 3, 0.27], ['amethyst_cluster', 'Amethyst Cluster', 4, 0.33]]) {
    const t = ph(k, [180, 130, 230], 0); const base = BL.length;
    for (let f = 0; f < 6; f++) defBlock(f ? k + '#' + f : k, n, { tex: t, render: 'cross', crossDir: f, solid: false, opaque: false, hardness: 1.5, mine: 'pick', snd: 'glass', light, bud: size, budBase: base, hidden: f > 0, drop: size === 4 ? (r) => ['amethyst_shard', 4] : null, support: 'bud' }); }
  // snow layers 1-8 (8 layers is a full block's worth), powder snow
  ph('snow_layer', [240, 248, 252]); const sl = BL.length;
  for (let n = 1; n <= 8; n++) { const b = [[0, 0, 0, 16, n * 2, 16]]; defBlock(n === 1 ? 'snow' : 'snow#' + n, 'Snow', { tex: 'snow', render: 'boxes', boxes: b, rb: b, cb: n > 1 ? [[0, 0, 0, 16, (n - 1) * 2, 16]] : [], sb: b, shape: 'layer', st: { layers: n }, opaque: false, hardness: 0.1, snd: 'snow', mine: 'shovel', hidden: n > 1, layers: n, layerBase: sl, drop: (r) => ['snowball', n] }); }
  defBlock('powder_snow', 'Powder Snow', { tex: ph('powder_snow', [244, 250, 255]), render: 'cutout', opaque: false, solid: false, hardness: 0.25, snd: 'snow', mine: 'shovel', drop: null, powder: true });
  // sweet berry bush (4 ages), bamboo, cocoa
  for (let st = 0; st < 4; st++) plant(st ? 'sweet_berry_bush#' + st : 'sweet_berry_bush', 'Sweet Berry Bush', { tex: ph('sweet_berry_bush' + st, [60, 120, 50], 0), hidden: st > 0, berry: st, drop: st >= 2 ? (r) => ['sweet_berries', st === 3 ? 2 + (r * 2 | 0) : 1 + (r * 2 | 0)] : 'sweet_berries' });
  defBlock('bamboo', 'Bamboo', { tex: { s: ph('bamboo_stalk', [110, 160, 40]), t: ph('bamboo_stalk_top', [120, 170, 50]) }, render: 'boxes', boxes: [[6.5, 0, 6.5, 9.5, 16, 9.5]], rb: [[6.5, 0, 6.5, 9.5, 16, 9.5]], cb: [[6.5, 0, 6.5, 9.5, 16, 9.5]], sb: [[6.5, 0, 6.5, 9.5, 16, 9.5]], shape: 'bamboo', st: {}, opaque: false, hardness: 1, snd: 'wood', mine: 'axe', bamboo: true, support: 'bamboo', iconTile: ph('bamboo_item', [110, 160, 40], 0) });
  for (let st = 0; st < 3; st++) for (let f = 0; f < 4; f++) { const s0 = 4 + st * 2, h = 5 + st * 2; const box = shRot([8 - s0 / 2, 12 - h, 15 - s0, 8 + s0 / 2, 12, 15], f + 2); // facing = towards the jungle log it hangs on
    defBlock(st === 0 && f === 0 ? 'cocoa' : 'cocoa#' + st + '_' + f, 'Cocoa', { tex: ph('cocoa' + st, [150, 100, 50]), render: 'boxes', boxes: [box], rb: [box], cb: [], sb: [box], shape: 'pod', st: { age: st, facing: f }, solid: false, opaque: false, hardness: 0.2, snd: 'wood', mine: 'axe', hidden: true, cocoa: st, facing: f, drop: (r) => ['cocoa_beans', st === 2 ? 2 + (r * 2 | 0) : 1], support: 'cocoa' }); }
  // nether plants, sculk
  plant('twisting_vines', 'Twisting Vines', { climb: true, support: 'twisting' }); plant('weeping_vines', 'Weeping Vines', { climb: true, hanging: true, support: 'weeping' }); plant('nether_sprouts', 'Nether Sprouts', { drop: null });
  defBlock('sculk_catalyst', 'Sculk Catalyst', { tex: { s: ph('sculk_catalyst_side', [30, 50, 60]), t: ph('sculk_catalyst_top', [40, 70, 80]) }, hardness: 3, mine: 'hoe', snd: 'stone', light: 0.4, drop: null });
  defBlock('sculk_vein', 'Sculk Vein', { tex: ph('sculk_vein', [20, 60, 70], 0), render: 'boxes', boxes: [[0, 0, 0, 16, 0.6, 16]], solid: false, opaque: false, hardness: 0.2, snd: 'grass', mine: 'hoe', drop: null, flatIcon: true });
}
function paintCaveTiles() {
  const clear = (set) => each((x, y) => set(x, y, [0, 0, 0], 0)); const sh = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
  makeTile('azalea_leaves', (set, r) => leafPaint(set, r, [92, 130, 40]));
  makeTile('flowering_azalea_leaves', (set, r) => { leafPaint(set, r, [92, 130, 40]); for (let k = 0; k < 8; k++) { const x = r() * 15 | 0, y = r() * 15 | 0; set(x, y, [210, 110, 200]); set(x + 1, y, [230, 140, 220]); set(x, y + 1, [190, 90, 180]); } });
  makeTile('azalea_stem', (set, r) => each((x, y) => set(x, y, vary([110, 90, 50], r, 8))));
  const vine = (lit) => (set, r) => { clear(set); for (const x0 of [5, 10]) { for (let y = 0; y < 16; y++) { const x = x0 + ((y >> 2) & 1); set(x, y, vary([70, 120, 40], r, 8)); if (y % 4 === 2) { set(x - 1, y, [90, 150, 50]); set(x + 1, y + 1, [80, 140, 46]); } } if (lit) for (const y of [4, 11]) { set(x0 - 1, y, [255, 190, 60]); set(x0, y, [255, 220, 110]); set(x0 - 1, y + 1, [230, 150, 40]); set(x0, y + 1, [255, 200, 80]); } } };
  makeTile('cave_vines', vine(false)); makeTile('cave_vines_lit', vine(true));
  makeTile('hanging_roots', (set, r) => { clear(set); for (const x0 of [4, 7, 10, 12]) { const L = 6 + (r() * 9 | 0); let x = x0; for (let y = 0; y < L; y++) { if (r() < 0.2) x += r() < 0.5 ? -1 : 1; set(x, y, vary([170, 130, 90], r, 10)); } } });
  makeTile('spore_blossom', (set, r) => { clear(set); for (let y = 0; y < 6; y++) for (let x = 3; x < 13; x++) if (Math.hypot(x - 7.5, y * 1.4) < 5) set(x, y, vary(y < 2 ? [70, 130, 50] : [220, 120, 190], r, 8)); for (const x of [4, 7, 9, 12]) for (let y = 6; y < 9 + (x % 3); y++) set(x, y, [240, 160, 220]); });
  makeTile('small_dripleaf_bottom', (set, r) => { clear(set); for (let y = 0; y < 16; y++) { set(7, y, vary([70, 140, 50], r, 8)); set(9, y, vary([60, 126, 44], r, 8)); } });
  makeTile('small_dripleaf_top', (set, r) => { clear(set); for (let y = 6; y < 16; y++) { set(7, y, vary([70, 140, 50], r, 8)); set(9, y, vary([60, 126, 44], r, 8)); } for (let y = 1; y < 7; y++) for (let x = 2; x < 14; x++) if (Math.abs(x - 7.5) < 6 - y * 0.6) set(x, y, vary([100, 170, 50], r, 8)); });
  makeTile('big_dripleaf_top', (set, r) => each((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); set(x, y, vary(d > 7.2 ? [70, 130, 40] : (Math.abs(x - y) < 1 || Math.abs(x + y - 15) < 1) ? [86, 150, 44] : [104, 172, 52], r, 6)); }));
  makeTile('big_dripleaf_stem', (set, r) => each((x, y) => set(x, y, vary(x % 4 === 0 ? [70, 120, 40] : [90, 146, 50], r, 6))));
  makeTile('glow_lichen', (set, r) => { clear(set); for (let k = 0; k < 40; k++) { const x = r() * 16 | 0, y = r() * 16 | 0; set(x, y, r() < 0.3 ? [200, 240, 200] : [120, 160, 130]); } });
  for (const th of ['tip', 'frustum', 'middle', 'base']) makeTile('pointed_dripstone_' + th, (set, r) => { clear(set); const w0 = { tip: 1.5, frustum: 2.5, middle: 3.5, base: 4.5 }[th], w1 = { tip: 0, frustum: 1.5, middle: 2.5, base: 3.5 }[th];
    for (let y = 0; y < 16; y++) { const w = w1 + (w0 - w1) * (y / 15); for (let x = Math.round(8 - w); x < Math.round(8 + w); x++) set(x, y, vary(x < 8 ? [150, 118, 96] : [124, 96, 78], r, 6)); } });
  makeTile('amethyst_block', (set, r) => { const m = voronoi(r, 10); each((x, y) => { const k = y * 16 + x; set(x, y, vary(m.d2[k] - m.d1[k] < 0.8 ? [120, 74, 170] : [[160, 110, 210], [176, 130, 226], [140, 92, 192]][m.id[k] % 3], r, 5)); }); });
  makeTile('budding_amethyst', (set, r) => { const m = voronoi(r, 10); each((x, y) => { const k = y * 16 + x; set(x, y, vary(m.d2[k] - m.d1[k] < 0.8 ? [100, 60, 150] : [[150, 100, 200], [166, 118, 216], [130, 84, 182]][m.id[k] % 3], r, 5)); }); for (let k = 0; k < 6; k++) { const x = 2 + r() * 12 | 0, y = 2 + r() * 12 | 0; set(x, y, [240, 210, 255]); } });
  makeTile('tinted_glass', (set, r) => each((x, y) => { const e = x === 0 || y === 0 || x === 15 || y === 15; set(x, y, e ? [60, 50, 70] : vary([40, 32, 50], r, 4), e ? 245 : 200); }));
  for (const [k, sz] of [['small_amethyst_bud', 1], ['medium_amethyst_bud', 2], ['large_amethyst_bud', 3], ['amethyst_cluster', 4]]) makeTile(k, (set, r) => { clear(set); const H = 3 + sz * 3; for (const [cx, h] of sz === 4 ? [[4, H - 3], [7, H], [11, H - 2]] : [[7, H]]) for (let y = 15; y > 15 - h; y--) { const w = Math.max(0, (y - (15 - h)) * 0.35); for (let x = Math.round(cx - w); x <= Math.round(cx + 1 + w); x++) set(x, y, vary(x < cx + 1 ? [210, 170, 250] : [160, 110, 210], r, 6)); } });
  makeTile('powder_snow', (set, r) => each((x, y) => set(x, y, vary([246, 250, 255], r, 4), 235)));
  for (let st = 0; st < 4; st++) makeTile('sweet_berry_bush' + st, (set, r) => { clear(set); const R = 2 + st * 2; for (let y = 16 - R * 2; y < 16; y++) for (let x = 8 - R; x < 8 + R; x++) if (r() < 0.75) set(x, y, vary([46, 100, 50], r, 10)); if (st >= 2) for (let k = 0; k < (st === 3 ? 7 : 3); k++) { const x = 8 - R + (r() * R * 2 | 0), y = 16 - R * 2 + (r() * R * 2 | 0); set(x, y, st === 3 ? [200, 30, 40] : [120, 160, 60]); } });
  makeTile('bamboo_stalk', (set, r) => each((x, y) => set(x, y, vary(y % 8 === 0 ? [90, 130, 30] : x % 3 === 0 ? [100, 150, 36] : [120, 170, 46], r, 5))));
  makeTile('bamboo_stalk_top', (set, r) => each((x, y) => set(x, y, vary([140, 176, 70], r, 5))));
  makeTile('bamboo_item', (set, r) => { clear(set); for (let i = 0; i < 14; i++) { set(3 + i * 0.7, 14 - i, [110, 160, 40]); set(4 + i * 0.7, 14 - i, [90, 140, 30]); } set(9, 6, [70, 140, 40]); set(10, 5, [70, 140, 40]); });
  for (let st = 0; st < 3; st++) makeTile('cocoa' + st, (set, r) => each((x, y) => set(x, y, vary(st === 0 ? [140, 150, 60] : st === 1 ? [170, 120, 60] : [140, 80, 40], r, 6))));
  makeTile('twisting_vines', (set, r) => { clear(set); for (const x0 of [5, 9]) for (let y = 0; y < 16; y++) set(x0 + ((y >> 1) & 1), y, vary([20, 150, 140], r, 10)); });
  makeTile('weeping_vines', (set, r) => { clear(set); for (const x0 of [5, 9]) for (let y = 0; y < 16; y++) set(x0 + ((y >> 1) & 1), y, vary([150, 20, 30], r, 10)); });
  makeTile('nether_sprouts', (set, r) => { clear(set); for (const x0 of [3, 6, 9, 12]) for (let y = 9 + (r() * 3 | 0); y < 16; y++) set(x0 + (y < 12 ? (x0 < 8 ? -1 : 1) : 0), y, vary([20, 160, 130], r, 10)); });
  makeTile('sculk_catalyst_side', (set, r) => each((x, y) => set(x, y, vary(y < 4 ? [16, 40, 50] : (x + y) % 5 === 0 ? [80, 200, 210] : [40, 46, 50], r, 5))));
  makeTile('sculk_catalyst_top', (set, r) => each((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); set(x, y, vary(d < 3 ? [190, 240, 250] : d < 5 ? [60, 160, 170] : [20, 46, 56], r, 5)); }));
  makeTile('sculk_vein', (set, r) => { clear(set); for (let k = 0; k < 5; k++) { let x = r() * 16, y = r() * 16; const a = r() * 6.28; for (let i = 0; i < 9; i++) { x += Math.cos(a + Math.sin(i)); y += Math.sin(a + Math.sin(i)); set(((x | 0) + 16) % 16, ((y | 0) + 16) % 16, [16, 70, 80]); } } });
}
// ---- items and recipes ----
{ const M2 = (key, name, o, icon) => { const id = nid++; defItem(id, key, name, o || {}); ITEM_IDS.push(id); if (icon) ICONP[key] = icon; return id; };
  M2('glow_berries', 'Glow Berries', { kind: 'food' }, (s) => { for (const [cx, cy] of [[6, 9], [10, 7], [8, 12]]) for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= 4) s(cx + x, cy + y, x + y < 0 ? [255, 220, 110] : [240, 150, 40]); for (let y = 2; y < 7; y++) s(8, y, [70, 130, 40]); });
  M2('amethyst_shard', 'Amethyst Shard', {}, (s) => { for (let i = 0; i < 9; i++) { s(4 + i, 12 - i, [210, 170, 250]); s(5 + i, 12 - i, [160, 110, 210]); s(4 + i, 13 - i, [180, 130, 230]); } });
  const R = (o, n, sh, k) => RECIPES.push(RSH(o, n, sh, k)); const L = (o, n, items) => RECIPES.push(RSL(o, n, items));
  R('amethyst_block', 1, ['AA', 'AA'], { A: 'amethyst_shard' }); R('tinted_glass', 2, [' A ', 'AGA', ' A '], { A: 'amethyst_shard', G: 'glass' }); R('dripstone_block', 1, ['PP', 'PP'], { P: 'pointed_dripstone' });
  R('snow', 6, ['SSS'], { S: 'snow_block' }); R('bamboo_block', 1, ['BBB', 'BBB', 'BBB'], { B: 'bamboo' }); R('stick', 1, ['B', 'B'], { B: 'bamboo' }); L('brown_dye', 1, ['cocoa_beans']);
  FUEL.bamboo = 2.5; FUEL.azalea = 5; FUEL.flowering_azalea = 5;
}

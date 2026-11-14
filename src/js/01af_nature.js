// ================= NATURE (Minecraft): flowers, tall plants, mushrooms, crops, ground blocks =================
// Flowers (poppy, blue orchid, allium, azure bluet, four tulips, oxeye daisy, cornflower, lily of the valley, wither
// rose, torchflower), fern, two-block plants (sunflower, lilac, rose bush, peony, tall grass, large fern, pitcher
// plant), mushrooms and huge mushroom blocks, beetroots, pumpkin and melon stems with pumpkins, carved pumpkins,
// jack o'lanterns and melons, and ground blocks (podzol, coarse dirt, mycelium, rooted dirt, moss, bone block, dried
// kelp block, blue ice, honeycomb block). Sprites and textures are original pixel art.
function FLOWERDATA() { return [
  // key, name, petal, centre, shape, dye
  ['blue_orchid', 'Blue Orchid', [64, 156, 232], [210, 236, 255], 'orchid', 'light_blue'], ['allium', 'Allium', [186, 108, 228], [230, 190, 250], 'ball', 'magenta'],
  ['azure_bluet', 'Azure Bluet', [236, 238, 244], [240, 220, 120], 'cluster', 'light_gray'], ['red_tulip', 'Red Tulip', [222, 40, 40], [255, 120, 100], 'tulip', 'red'],
  ['orange_tulip', 'Orange Tulip', [240, 132, 40], [255, 190, 110], 'tulip', 'orange'], ['white_tulip', 'White Tulip', [242, 242, 242], [210, 214, 220], 'tulip', 'light_gray'],
  ['pink_tulip', 'Pink Tulip', [244, 164, 204], [255, 214, 232], 'tulip', 'pink'], ['oxeye_daisy', 'Oxeye Daisy', [246, 246, 246], [242, 200, 40], 'daisy', 'light_gray'],
  ['cornflower', 'Cornflower', [70, 102, 232], [150, 170, 255], 'spiky', 'blue'], ['lily_of_the_valley', 'Lily of the Valley', [250, 250, 250], [210, 230, 210], 'bells', 'white'],
  ['wither_rose', 'Wither Rose', [34, 30, 32], [70, 50, 50], 'rose', 'black'], ['torchflower', 'Torchflower', [242, 120, 40], [255, 214, 90], 'torch', 'orange'],
]; }
function TALLDATA() { return [ // key, name, colour, kind, dye
  ['sunflower', 'Sunflower', [250, 206, 40], 'sun', 'yellow'], ['lilac', 'Lilac', [200, 140, 220], 'bush', 'magenta'], ['rose_bush', 'Rose Bush', [210, 36, 40], 'bush', 'red'],
  ['peony', 'Peony', [236, 170, 216], 'bush', 'pink'], ['double_tall_grass', 'Tall Grass', [96, 160, 56], 'grass', null], ['large_fern', 'Large Fern', [70, 140, 60], 'fern', null], ['pitcher_plant', 'Pitcher Plant', [90, 150, 170], 'pitcher', 'cyan'],
]; }
function defineNatureBlocks() {
  const ph = (n, c, a) => { if (TILE[n] === undefined) makeTile(n, (set) => each((x, y) => set(x, y, c, a === undefined ? 255 : a))); return n; };
  const plant = (key, name, o) => defBlock(key, name, Object.assign({ tex: ph(key, [80, 150, 50], 0), solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', plant: true }, o));
  BL[B.ROSE].name = 'Poppy'; BL[B.TALL_GRASS].name = 'Short Grass';
  for (const [k, n] of FLOWERDATA()) plant(k, n);
  plant('fern', 'Fern', { drop: (r) => r < 0.125 ? ['wheat_seeds', 1] : null });
  for (const [k, n] of TALLDATA()) { const lo = plant(k, n, { tex: ph(k + '_bottom', [80, 150, 50], 0), drop: null, tallLower: true }); const up = plant(k + '#top', n, { tex: ph(k + '_top', [80, 150, 50], 0), hidden: true, drop: k === 'double_tall_grass' || k === 'large_fern' ? ((r) => r < 0.125 ? ['wheat_seeds', 1] : null) : k, tallUpper: true });
    BL[lo].tallOther = up; BL[up].tallOther = lo; BL[lo].iconTile = k + '_top'; }
  plant('brown_mushroom', 'Brown Mushroom', { light: 0.07, mushroom: true }); plant('red_mushroom', 'Red Mushroom', { mushroom: true });
  const cube = (key, name, tex, o) => defBlock(key, name, Object.assign({ tex, hardness: 0.6, snd: 'grass', mine: 'shovel' }, o || {}));
  cube('brown_mushroom_block', 'Brown Mushroom Block', ph('brown_mushroom_block', [150, 110, 80]), { hardness: 0.2, snd: 'wood', mine: 'axe', drop: (r) => r < 0.3 ? ['brown_mushroom', 1 + (r * 7 | 0) % 2] : null });
  cube('red_mushroom_block', 'Red Mushroom Block', ph('red_mushroom_block', [190, 40, 40]), { hardness: 0.2, snd: 'wood', mine: 'axe', drop: (r) => r < 0.3 ? ['red_mushroom', 1 + (r * 7 | 0) % 2] : null });
  cube('mushroom_stem', 'Mushroom Stem', ph('mushroom_stem', [216, 210, 196]), { hardness: 0.2, snd: 'wood', mine: 'axe', drop: null });
  cube('podzol', 'Podzol', { s: ph('podzol_side', [110, 76, 40]), t: ph('podzol_top', [100, 66, 30]), b: 'dirt' }, { drop: 'dirt' });
  cube('coarse_dirt', 'Coarse Dirt', ph('coarse_dirt', [120, 86, 60]));
  cube('mycelium', 'Mycelium', { s: ph('mycelium_side', [120, 100, 110]), t: ph('mycelium_top', [124, 104, 118]), b: 'dirt' }, { drop: 'dirt' });
  cube('rooted_dirt', 'Rooted Dirt', ph('rooted_dirt', [130, 96, 66]));
  cube('moss_block', 'Moss Block', ph('moss_block', [90, 112, 44]), { hardness: 0.1, mine: 'hoe' });
  defBlock('moss_carpet', 'Moss Carpet', { tex: 'moss_block', render: 'boxes', boxes: [[0, 0, 0, 16, 1, 16]], solid: false, opaque: false, hardness: 0.1, snd: 'grass', mine: 'hoe', carpet: true });
  cube('dried_kelp_block', 'Dried Kelp Block', { s: ph('dried_kelp_side', [60, 70, 40]), t: ph('dried_kelp_top', [56, 64, 38]) }, { hardness: 0.5, mine: 'hoe' });
  cube('honeycomb_block', 'Honeycomb Block', ph('honeycomb_block', [230, 150, 30]), { hardness: 0.6, snd: 'stone', mine: null });
  cube('blue_ice', 'Blue Ice', ph('blue_ice', [120, 170, 250]), { hardness: 2.8, snd: 'glass', mine: 'pick', drop: null, slip: 0.989 });
  cube('pumpkin', 'Pumpkin', { s: ph('pumpkin_side', [220, 130, 30]), t: ph('pumpkin_top', [200, 120, 30]) }, { hardness: 1, snd: 'wood', mine: 'axe' });
  cube('melon', 'Melon', { s: ph('melon_side', [110, 160, 40]), t: ph('melon_top', [120, 170, 50]) }, { hardness: 1, snd: 'wood', mine: 'axe', drop: (r) => ['melon_slice', 3 + (r * 5 | 0)] });
  // carved pumpkins and jack o'lanterns face the way you place them (towards you)
  for (const [key, name, face, o] of [['carved_pumpkin', 'Carved Pumpkin', ph('carved_pumpkin_face', [220, 130, 30]), {}], ['jack_o_lantern', "Jack o'Lantern", ph('jack_o_lantern_face', [240, 170, 40]), { light: 1 }]]) {
    const ids = {}; for (const f of [0, 1, 2, 3]) { const sides = ['pumpkin_side', 'pumpkin_side', 'pumpkin_top', 'pumpkin_top', 'pumpkin_side', 'pumpkin_side']; sides[[5, 0, 4, 1][f]] = face; // faces: 0 +x, 1 -x, 4 +z, 5 -z
      ids[f] = defBlock(f === 2 ? key : key + '#' + f, name, Object.assign({ tex: sides, hardness: 1, snd: 'wood', mine: 'axe', hidden: f !== 2, drop: key, fam: key, st: { facing: f } }, o)); }
    FAMILY[key] = { kind: 'facing4', props: ['facing'], ids, base: ids[2], mat: key }; }
  // bone block lies along its axis
  defBlock('bone_block', 'Bone Block', { tex: { s: ph('bone_block_side', [228, 224, 206]), t: ph('bone_block_top', [222, 218, 200]) }, hardness: 2, tool: 'pick', tier: 1, mine: 'pick' });
  { const base = BL[B.BONE_BLOCK]; FAMILY.bone_block = { kind: 'axis', props: ['axis'], ids: { y: base.id }, base: base.id, mat: 'bone_block' }; base.fam = 'bone_block'; base.st = { axis: 'y' };
    for (const ax of ['x', 'z']) { const o = Object.assign({}, base, { tex: ax === 'x' ? ['bone_block_top', 'bone_block_top', 'bone_block_side', 'bone_block_side', 'bone_block_side', 'bone_block_side'] : ['bone_block_side', 'bone_block_side', 'bone_block_side', 'bone_block_side', 'bone_block_top', 'bone_block_top'], hidden: true, drop: 'bone_block', st: { axis: ax }, uvRot: ax === 'x' ? [0, 0, 1, 1, 1, 1] : [1, 1, 0, 0, 0, 0] }); delete o.id; delete o.key; delete o.texIds; FAMILY.bone_block.ids[ax] = defBlock('bone_block#' + ax, 'Bone Block', o); } }
  // crops: beetroots (4 stages), pumpkin and melon stems (8 stages)
  for (let st = 0; st < 4; st++) plant('beetroots_' + st, 'Beetroots', { tex: ph('beetroots' + st, [80, 150, 50], 0), hidden: st > 0, crop: st, cropBase: 'beetroots_', drop: st < 3 ? 'beetroot_seeds' : (r) => ['beetroot', 1] });
  for (const k of ['pumpkin', 'melon']) for (let st = 0; st < 8; st++) plant(k + '_stem_' + st, k === 'pumpkin' ? 'Pumpkin Stem' : 'Melon Stem', { tex: ph(k + '_stem' + Math.min(st, 7), [80, 150, 50], 0), hidden: true, stem: st, stemFruit: k, drop: (r) => r < 0.2 + st * 0.08 ? [k + '_seeds', 1] : null });
}
// ---- textures ----
function paintNatureTiles() {
  const clear = (set) => each((x, y) => set(x, y, [0, 0, 0], 0)); const sh = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
  const stem = (set, r, x, y0, y1, c = [60, 130, 40]) => { for (let y = y0; y <= y1; y++) set(x, y, vary(c, r, 8)); };
  const leaf = (set, r, x, y, dir, c = [70, 150, 46]) => { for (let i = 0; i < 3; i++) set(x + dir * (i + 1), y - (i >> 1), vary(c, r, 8)); };
  for (const [k, , p, c, shape] of FLOWERDATA()) makeTile(k, (set, r) => { clear(set); const sc = k === 'wither_rose' ? [40, 50, 36] : [60, 130, 40];
    stem(set, r, 7, 8, 15, sc); leaf(set, r, 7, 12, -1, sc); leaf(set, r, 8, 11, 1, sc);
    if (shape === 'tulip') { for (let y = 3; y <= 7; y++) for (let x = 5; x <= 9; x++) if (!(y === 3 && (x === 5 || x === 7 || x === 9))) set(x, y, vary(x === 5 || x === 9 ? sh(p, 0.8) : p, r, 6)); set(7, 6, c); }
    else if (shape === 'daisy' || shape === 'spiky' || shape === 'rose') { for (let a = 0; a < 8; a++) { const ang = a * Math.PI / 4; for (let d = 1; d <= (shape === 'spiky' ? 4 : 3); d++) set(7.5 + Math.cos(ang) * d, 5 + Math.sin(ang) * d, vary(shape === 'spiky' && d === 4 ? sh(p, 0.7) : p, r, 6)); } for (const [a, b] of [[7, 5], [8, 5], [7, 4], [8, 4]]) set(a, b, c); }
    else if (shape === 'ball') { for (let y = 1; y <= 7; y++) for (let x = 4; x <= 11; x++) if (Math.hypot(x - 7.5, y - 4) < 3.6 && r() < 0.85) set(x, y, vary((x + y) % 3 ? p : c, r, 8)); }
    else if (shape === 'cluster') { for (const [cx, cy] of [[5, 5], [10, 6], [7, 3], [8, 8]]) { for (const [a, b] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) set(cx + a, cy + b, p); set(cx, cy, c); } stem(set, r, 5, 6, 12, sc); stem(set, r, 10, 7, 12, sc); }
    else if (shape === 'bells') { for (let y = 3; y <= 12; y++) set(9, y, vary(sc, r, 6)); for (const [x, y] of [[6, 4], [6, 7], [6, 10], [11, 5], [11, 8]]) { set(x, y, p); set(x + 1, y, p); set(x, y + 1, p); set(x + 1, y + 1, sh(p, 0.85)); } }
    else if (shape === 'orchid') { for (const [x, y] of [[5, 4], [6, 3], [9, 3], [10, 4], [6, 5], [9, 5], [7, 4], [8, 4], [7, 6], [8, 6], [5, 7], [10, 7]]) set(x, y, vary(p, r, 8)); set(7, 5, c); set(8, 5, c); }
    else if (shape === 'torch') { for (let y = 2; y <= 7; y++) for (let x = 6; x <= 9; x++) set(x, y, vary(y < 4 ? c : p, r, 8)); for (const [x, y] of [[5, 6], [10, 6], [5, 3], [10, 3]]) set(x, y, p); }
  });
  makeTile('fern', (set, r) => { clear(set); for (const [x0, dir] of [[7, -1], [8, 1], [7, 0]]) { let x = x0; for (let y = 15; y > 2; y--) { if (y % 3 === 0) x += dir; set(x, y, vary([70, 130, 50], r, 10)); if (y % 2) { set(x - 1, y, vary([60, 116, 44], r, 10)); set(x + 1, y, vary([80, 146, 56], r, 10)); } } } });
  for (const [k, , col, kind] of TALLDATA()) {
    makeTile(k + '_bottom', (set, r) => { clear(set); const g = kind === 'pitcher' ? [70, 120, 110] : [64, 132, 44]; for (const x of kind === 'grass' || kind === 'fern' ? [3, 5, 7, 8, 10, 12] : [7, 8]) stem(set, r, x, 0, 15, g); if (kind !== 'grass') { leaf(set, r, 7, 10, -1, g); leaf(set, r, 8, 6, 1, g); leaf(set, r, 7, 3, -1, g); } });
    makeTile(k + '_top', (set, r) => { clear(set); const g = [64, 132, 44];
      if (kind === 'sun') { stem(set, r, 7, 8, 15, g); for (let y = 1; y <= 9; y++) for (let x = 3; x <= 12; x++) { const d = Math.hypot(x - 7.5, y - 5); if (d < 2.4) set(x, y, vary([110, 70, 30], r, 6)); else if (d < 4.6) set(x, y, vary(col, r, 8)); } }
      else if (kind === 'bush') { for (let y = 2; y <= 15; y++) for (let x = 2; x <= 13; x++) { const d = Math.hypot(x - 7.5, (y - 8) * 0.9); if (d > 6 || r() < 0.25) continue; set(x, y, vary(r() < 0.45 ? col : g, r, 10)); } }
      else if (kind === 'grass' || kind === 'fern') { for (const x of [3, 5, 7, 9, 11, 12]) { const top = 2 + (r() * 6 | 0); for (let y = top; y <= 15; y++) set(x + (y < 8 && kind === 'fern' ? (x < 8 ? -1 : 1) : 0), y, vary(col, r, 10)); } }
      else { for (let y = 3; y <= 15; y++) { set(6, y, vary([70, 120, 110], r, 6)); set(9, y, vary([70, 120, 110], r, 6)); } for (let y = 1; y <= 6; y++) for (let x = 5; x <= 10; x++) if (Math.hypot(x - 7.5, y - 4) < 3) set(x, y, vary(y < 3 ? [160, 110, 200] : col, r, 8)); } });
  }
  makeTile('brown_mushroom', (set, r) => { clear(set); stem(set, r, 7, 9, 14, [220, 210, 190]); stem(set, r, 8, 9, 14, [200, 190, 170]); for (let y = 6; y <= 9; y++) for (let x = 4; x <= 11; x++) if (y > 6 || (x > 4 && x < 11)) set(x, y, vary([150, 108, 76], r, 8)); });
  makeTile('red_mushroom', (set, r) => { clear(set); stem(set, r, 7, 9, 14, [230, 220, 200]); stem(set, r, 8, 9, 14, [206, 196, 176]); for (let y = 4; y <= 9; y++) for (let x = 4; x <= 11; x++) if (Math.hypot(x - 7.5, (y - 8.5) * 1.3) < 4.3) set(x, y, vary([210, 30, 30], r, 8)); for (const [x, y] of [[6, 5], [9, 6], [5, 8], [10, 8]]) set(x, y, [250, 246, 236]); });
  makeTile('brown_mushroom_block', (set, r) => { const n = tnoise(951, 4); each((x, y) => set(x, y, vary(mixc([140, 100, 70], [166, 124, 90], n(x, y)), r, 5))); });
  makeTile('red_mushroom_block', (set, r) => { each((x, y) => set(x, y, vary([200, 34, 34], r, 6))); for (let k = 0; k < 6; k++) { const x = r() * 14 | 0, y = r() * 14 | 0; set(x, y, [246, 240, 228]); set(x + 1, y, [246, 240, 228]); set(x, y + 1, [230, 224, 212]); set(x + 1, y + 1, [246, 240, 228]); } });
  makeTile('mushroom_stem', (set, r) => each((x, y) => set(x, y, vary(x % 5 === 0 ? [196, 190, 176] : [222, 216, 202], r, 4))));
  const dirt = tilePixels('dirt');
  makeTile('podzol_top', (set, r) => { const n = tnoise(961, 8); each((x, y) => { const v = n(x, y); set(x, y, vary(v < 0.4 ? [92, 60, 26] : v > 0.7 ? [134, 96, 44] : [112, 76, 34], r, 6)); }); RX.blobs(set, r, 8, [80, 110, 40], 1); });
  makeTile('podzol_side', (set, r) => each((x, y) => { const d = dirt(x, y); set(x, y, y < 4 + ((x * 7) % 3) ? vary([108, 72, 32], r, 8) : [d[0], d[1], d[2]]); }));
  makeTile('coarse_dirt', (set, r) => { each((x, y) => { const d = dirt(x, y); set(x, y, [d[0], d[1], d[2]]); }); RX.blobs(set, r, 14, [136, 128, 120], 2); RX.blobs(set, r, 8, [90, 70, 52], 1); });
  makeTile('mycelium_top', (set, r) => { const n = tnoise(962, 8); each((x, y) => set(x, y, vary(mixc([110, 94, 104], [140, 120, 132], n(x, y)), r, 6))); RX.blobs(set, r, 6, [176, 160, 170], 1); });
  makeTile('mycelium_side', (set, r) => each((x, y) => { const d = dirt(x, y); set(x, y, y < 3 + ((x * 5) % 3) ? vary([124, 104, 118], r, 8) : [d[0], d[1], d[2]]); }));
  makeTile('rooted_dirt', (set, r) => { each((x, y) => { const d = dirt(x, y); set(x, y, [d[0], d[1], d[2]]); }); for (let k = 0; k < 5; k++) { let x = r() * 16, y = 0; for (; y < 16; y++) { x += (r() - 0.5) * 1.2; set(((x | 0) + 16) % 16, y, [176, 140, 96]); } } });
  makeTile('moss_block', (set, r) => { const n = tnoise(963, 8); each((x, y) => { const v = n(x, y); set(x, y, vary(v < 0.35 ? [74, 94, 34] : v > 0.7 ? [108, 134, 52] : [90, 112, 44], r, 6)); }); });
  makeTile('dried_kelp_side', (set, r) => each((x, y) => set(x, y, vary(y % 4 === 0 ? [40, 46, 26] : x % 5 === 2 ? [70, 82, 46] : [58, 68, 38], r, 5))));
  makeTile('dried_kelp_top', (set, r) => each((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); set(x, y, vary(d % 3 < 1 ? [44, 52, 30] : [60, 70, 40], r, 5)); }));
  makeTile('honeycomb_block', (set, r) => each((x, y) => { const row = y >> 2, xx = (x + (row & 1) * 2) % 4, yy = y % 4; set(x, y, vary(xx === 0 || yy === 0 ? [196, 120, 20] : yy === 1 ? [250, 196, 70] : [236, 160, 36], r, 5)); }));
  makeTile('blue_ice', (set, r) => { const n = tnoise(964, 4); each((x, y) => set(x, y, vary(mixc([110, 160, 244], [146, 190, 252], n(x, y)), r, 3))); for (let k = 0; k < 4; k++) { let x = r() * 16 | 0, y = r() * 16 | 0; for (let i = 0; i < 5; i++) { set(x, y, [200, 226, 255]); x = (x + 1) % 16; y = (y + (r() < 0.5 ? 1 : 0)) % 16; } } });
  makeTile('pumpkin_side', (set, r) => each((x, y) => { const s = x % 4; set(x, y, vary(s === 0 ? [176, 90, 14] : s === 2 ? [232, 146, 36] : [214, 124, 26], r, 5)); }));
  makeTile('pumpkin_top', (set, r) => each((x, y) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); set(x, y, d < 1.6 ? vary([100, 80, 30], r, 6) : vary(Math.floor(Math.atan2(y - 7.5, x - 7.5) * 2.5) % 2 ? [200, 112, 20] : [222, 132, 30], r, 5)); }));
  const facePaint = (lit) => (set, r) => { each((x, y) => { const s = x % 4; set(x, y, vary(s === 0 ? [176, 90, 14] : s === 2 ? [232, 146, 36] : [214, 124, 26], r, 5)); }); const in_ = lit ? [255, 220, 90] : [40, 22, 6];
    for (const [x, y] of [[3, 4], [4, 4], [4, 5], [3, 5], [11, 4], [12, 4], [11, 5], [12, 5]]) set(x, y, in_); for (let x = 3; x <= 12; x++) set(x, 10, in_); for (const x of [4, 7, 10]) set(x, 11, in_); for (const x of [3, 5, 6, 8, 9, 11, 12]) set(x, 9, x % 3 ? in_ : [214, 124, 26]); };
  makeTile('carved_pumpkin_face', facePaint(false)); makeTile('jack_o_lantern_face', facePaint(true));
  makeTile('melon_side', (set, r) => each((x, y) => set(x, y, vary(x % 5 < 2 ? [80, 130, 30] : [120, 170, 50], r, 6))));
  makeTile('melon_top', (set, r) => each((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); set(x, y, vary(d < 1.5 ? [100, 90, 30] : Math.floor(Math.atan2(y - 7.5, x - 7.5) * 2.5) % 2 ? [90, 140, 34] : [124, 172, 52], r, 6)); }));
  makeTile('bone_block_side', (set, r) => each((x, y) => set(x, y, vary(x % 5 === 0 ? [198, 194, 176] : [230, 226, 208], r, 3))));
  makeTile('bone_block_top', (set, r) => each((x, y) => { const e = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); set(x, y, vary(e > 6.6 ? [200, 196, 178] : e < 3 ? (Math.hypot(x - 7.5, y - 7.5) < 2 ? [180, 170, 150] : [214, 210, 192]) : [232, 228, 210], r, 3)); }));
  for (let st = 0; st < 4; st++) makeTile('beetroots' + st, (set, r) => { clear(set); for (const x of [4, 8, 12]) { const h = 4 + st * 3; for (let y = 15; y > 15 - h; y--) set(x + ((y & 1) ? 0 : (x < 8 ? -1 : 1)), y, vary([70, 150, 50], r, 10)); if (st === 3) { set(x, 14, [150, 30, 40]); set(x - 1, 15, [150, 30, 40]); set(x + 1, 15, [130, 24, 34]); } } });
  for (const k of ['pumpkin', 'melon']) for (let st = 0; st < 8; st++) makeTile(k + '_stem' + st, (set, r) => { clear(set); const h = 3 + st * 1.6 | 0; const col = st === 7 ? [170, 160, 60] : [90, 160, 50]; for (let y = 15; y > 15 - h; y--) set(7 + ((y >> 1) & 1), y, vary(col, r, 8)); if (st > 3) leaf(set, r, 7, 15 - h + 3, -1, col); });
}
// ---- items, recipes, smelting, fuel ----
{ const M2 = (key, name, o, icon) => { const id = nid++; defItem(id, key, name, o || {}); ITEM_IDS.push(id); if (icon) ICONP[key] = icon; return id; };
  M2('beetroot', 'Beetroot', { kind: 'food', food: 1, sat: 1.2 }, (s) => { for (let y = 6; y <= 13; y++) for (let x = 4; x <= 11; x++) if (Math.hypot(x - 7.5, (y - 9.5) * 1.1) < 4) s(x, y, x < 7 && y < 9 ? [200, 60, 80] : [150, 30, 50]); for (const [x, y] of [[7, 5], [6, 3], [8, 2], [9, 4]]) s(x, y, [70, 150, 50]); s(8, 14, [120, 20, 40]); });
  M2('beetroot_seeds', 'Beetroot Seeds', { kind: 'seed', crop: 'beetroots_0' }, (s, r) => { for (let i = 0; i < 8; i++) { const x = 4 + r() * 8, y = 5 + r() * 7; s(x, y, [176, 150, 110]); s(x + 1, y, [140, 110, 80]); } });
  M2('beetroot_soup', 'Beetroot Soup', { kind: 'food', food: 6, sat: 7.2, stack: 1, bowl: true }, (s) => { for (let x = 3; x <= 12; x++) for (let y = 8; y <= 12; y++) if (Math.abs(x - 7.5) < 5 - (y - 8) * 0.6) s(x, y, y === 8 ? [180, 30, 50] : [150, 110, 70]); });
  M2('mushroom_stew', 'Mushroom Stew', { kind: 'food', food: 6, sat: 7.2, stack: 1, bowl: true }, (s) => { for (let x = 3; x <= 12; x++) for (let y = 8; y <= 12; y++) if (Math.abs(x - 7.5) < 5 - (y - 8) * 0.6) s(x, y, y === 8 ? [180, 140, 100] : [150, 110, 70]); });
  M2('pumpkin_seeds', 'Pumpkin Seeds', { kind: 'seed', crop: 'pumpkin_stem_0' }, (s, r) => { for (let i = 0; i < 6; i++) { const x = 4 + r() * 8, y = 5 + r() * 7; s(x, y, [236, 226, 180]); s(x, y + 1, [210, 200, 150]); } });
  M2('melon_seeds', 'Melon Seeds', { kind: 'seed', crop: 'melon_stem_0' }, (s, r) => { for (let i = 0; i < 6; i++) { const x = 4 + r() * 8, y = 5 + r() * 7; s(x, y, [40, 30, 20]); s(x, y + 1, [70, 50, 30]); } });
  const R = (o, n, sh, k) => RECIPES.push(RSH(o, n, sh, k)); const L = (o, n, items) => RECIPES.push(RSL(o, n, items));
  for (const [k, , , , , dye] of FLOWERDATA()) L(dye + '_dye', 1, [k]); for (const [k, , , , dye] of TALLDATA()) if (dye) L(dye + '_dye', k === 'pitcher_plant' ? 2 : 2, [k]);
  L('red_dye', 1, ['beetroot']); L('beetroot_soup', 1, ['bowl', 'beetroot', 'beetroot', 'beetroot', 'beetroot', 'beetroot', 'beetroot']); L('mushroom_stew', 1, ['bowl', 'brown_mushroom', 'red_mushroom']);
  L('pumpkin_seeds', 4, ['pumpkin']); L('melon_seeds', 1, ['melon_slice']); R('melon', 1, ['MMM', 'MMM', 'MMM'], { M: 'melon_slice' }); R('jack_o_lantern', 1, ['P', 'T'], { P: 'carved_pumpkin', T: 'torch' });
  R('coarse_dirt', 4, ['DG', 'GD'], { D: 'dirt', G: 'gravel' }); R('moss_carpet', 3, ['MM'], { M: 'moss_block' }); R('bone_block', 1, ['BBB', 'BBB', 'BBB'], { B: 'bone_meal' }); L('bone_meal', 9, ['bone_block']);
  R('honeycomb_block', 1, ['HH', 'HH'], { H: 'honeycomb' }); R('blue_ice', 1, ['III', 'III', 'III'], { I: 'packed_ice' }); if (IT.pumpkin_pie !== undefined && !RECIPES.some(r => r.out[0] === 'pumpkin_pie')) L('pumpkin_pie', 1, ['pumpkin', 'sugar', 'egg']);
  { const i = RECIPES.findIndex(r => r.out[0] === 'red_dye' && r.items && r.items[0] === 'rose'); if (i < 0 && IT.rose !== undefined) L('red_dye', 1, ['rose']); }
  if (IT.dried_kelp !== undefined) { R('dried_kelp_block', 1, ['KKK', 'KKK', 'KKK'], { K: 'dried_kelp' }); L('dried_kelp', 9, ['dried_kelp_block']); }
  FUEL.dried_kelp_block = 200;
}

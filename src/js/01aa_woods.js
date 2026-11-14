// ================= WOOD TYPES (Minecraft's 11 woods + bamboo) =================
// Planks, logs, wood (bark on all six sides), stripped logs and wood, leaves and saplings for oak, spruce, birch,
// jungle, acacia, dark oak, mangrove, cherry and pale oak, the crimson and warped stems / hyphae, and bamboo blocks,
// planks and mosaic. Logs, wood and stems lie the way you place them (Minecraft's axis: up-down, east-west,
// north-south). Each wood also gets stairs, slab, fence, fence gate, door, trapdoor, button and pressure plate
// (01ab_shapes.js). All textures are original pixel art, painted in 01bb_retex.js.
function WOODDATA() { return [
  // k, name, log key, planks key, leaves key, sapling key, bark, end grain, planks colour, leaves colour, nether?
  { k: 'oak', name: 'Oak', log: 'log', planks: 'planks', leaves: 'leaves', sap: 'oak_sapling', bark: [110, 86, 52], top: [184, 148, 94], pl: [166, 132, 80], lf: [62, 140, 40], door: 'oak' },
  { k: 'spruce', name: 'Spruce', log: 'spruce_log', planks: 'spruce_planks', leaves: 'spruce_leaves', sap: 'spruce_sapling', bark: [62, 40, 18], top: [122, 90, 54], pl: [114, 84, 48], lf: [44, 96, 60], door: 'grid' },
  { k: 'birch', name: 'Birch', log: 'birch_log', planks: 'birch_planks', leaves: 'birch_leaves', sap: 'birch_sapling', bark: [222, 220, 210], top: [216, 200, 142], pl: [198, 180, 122], lf: [110, 162, 66], door: 'oak' },
  { k: 'jungle', name: 'Jungle', log: 'jungle_log', planks: 'jungle_planks', leaves: 'jungle_leaves', sap: 'jungle_sapling', bark: [88, 70, 28], top: [176, 132, 86], pl: [160, 114, 78], lf: [48, 160, 30], door: 'oak' },
  { k: 'acacia', name: 'Acacia', log: 'acacia_log', planks: 'acacia_planks', leaves: 'acacia_leaves', sap: 'acacia_sapling', bark: [104, 98, 88], top: [184, 100, 54], pl: [170, 92, 52], lf: [104, 140, 30], door: 'grid' },
  { k: 'dark_oak', name: 'Dark Oak', log: 'dark_oak_log', planks: 'dark_oak_planks', leaves: 'dark_oak_leaves', sap: 'dark_oak_sapling', bark: [62, 46, 26], top: [92, 62, 34], pl: [70, 46, 22], lf: [40, 100, 26], door: 'dark_oak' },
  { k: 'mangrove', name: 'Mangrove', log: 'mangrove_log', planks: 'mangrove_planks', leaves: 'mangrove_leaves', sap: 'mangrove_propagule', bark: [86, 68, 42], top: [128, 60, 52], pl: [118, 54, 48], lf: [80, 150, 40], door: 'grid' },
  { k: 'cherry', name: 'Cherry', log: 'cherry_log', planks: 'cherry_planks', leaves: 'cherry_leaves', sap: 'cherry_sapling', bark: [56, 34, 46], top: [228, 182, 176], pl: [226, 178, 170], lf: [238, 168, 202], door: 'oak' },
  { k: 'pale_oak', name: 'Pale Oak', log: 'pale_oak_log', planks: 'pale_oak_planks', leaves: 'pale_oak_leaves', sap: 'pale_oak_sapling', bark: [96, 88, 84], top: [224, 212, 206], pl: [226, 214, 208], lf: [134, 140, 124], door: 'oak' },
  { k: 'crimson', name: 'Crimson', log: 'crimson_stem', planks: 'crimson_planks', bark: [118, 40, 62], top: [104, 52, 74], pl: [104, 50, 72], nether: true, door: 'grid' },
  { k: 'warped', name: 'Warped', log: 'warped_stem', planks: 'warped_planks', bark: [52, 92, 98], top: [44, 108, 102], pl: [44, 106, 100], nether: true, door: 'grid' },
  { k: 'bamboo', name: 'Bamboo', planks: 'bamboo_planks', pl: [196, 174, 82], bamboo: true, door: 'oak' },
]; }
const WOODNAMES = () => WOODDATA().map(w => w.k);

// called from 01_core.js while blocks are being defined (before the shapes, which use the planks)
function defineWoodBlocks() {
  const ph = (n, c) => { if (TILE[n] === undefined) makeTile(n, (set) => each((x, y) => set(x, y, c))); return n; }; // placeholders, repainted in 01bb_retex.js
  const has = (k) => B[k.toUpperCase()] !== undefined; const D = (k) => BL[B[k.toUpperCase()]];
  const leafDrop = (sap, apple) => (r) => r < 0.05 ? [sap, 1] : r < 0.07 ? ['stick', 1 + (r * 100 | 0) % 2] : (apple && r < 0.075) ? ['apple', 1] : null;
  // logs and wood lie along the axis you place them on: hidden copies with the end grain on the other faces
  const axisFamily = (key) => { const base = D(key); const top = base.texIds[2], side = base.texIds[0];
    FAMILY[key] = { kind: 'axis', props: ['axis'], ids: { y: base.id }, base: base.id, mat: key }; base.fam = key; base.st = { axis: 'y' };
    for (const ax of ['x', 'z']) { const tex = ax === 'x' ? [TILE_NAME(top), TILE_NAME(top), TILE_NAME(side), TILE_NAME(side), TILE_NAME(side), TILE_NAME(side)] : [TILE_NAME(side), TILE_NAME(side), TILE_NAME(side), TILE_NAME(side), TILE_NAME(top), TILE_NAME(top)];
      const o = Object.assign({}, base, { tex, hidden: true, drop: key, fam: key, st: { axis: ax }, uvRot: ax === 'x' ? [0, 0, 1, 1, 1, 1] : [1, 1, 0, 0, 0, 0] }); delete o.id; delete o.texIds;
      FAMILY[key].ids[ax] = defBlock(key + '#' + ax, base.name, o); } };
  for (const w of WOODDATA()) {
    const N = w.name;
    if (!has(w.planks)) defBlock(w.planks, N + ' Planks', { tex: ph(w.k + '_planks', w.pl), hardness: 2, snd: 'wood', mine: 'axe', fireproof: !!w.nether });
    if (w.bamboo) {
      defBlock('bamboo_block', 'Block of Bamboo', { tex: { s: ph('bamboo_block_side', [140, 160, 40]), t: ph('bamboo_block_top', [170, 170, 80]) }, hardness: 2, snd: 'wood', mine: 'axe' });
      defBlock('stripped_bamboo_block', 'Block of Stripped Bamboo', { tex: { s: ph('stripped_bamboo_side', [196, 176, 70]), t: ph('stripped_bamboo_top', [200, 180, 90]) }, hardness: 2, snd: 'wood', mine: 'axe' });
      defBlock('bamboo_mosaic', 'Bamboo Mosaic', { tex: ph('bamboo_mosaic', [190, 170, 76]), hardness: 2, snd: 'wood', mine: 'axe' });
      axisFamily('bamboo_block'); axisFamily('stripped_bamboo_block'); continue;
    }
    const stem = !!w.nether; const logName = stem ? N + ' Stem' : N + ' Log';
    if (!has(w.log)) defBlock(w.log, logName, { tex: { s: ph(w.k + '_side', w.bark), t: ph(w.k + '_top', w.top) }, hardness: 2, snd: 'wood', mine: 'axe' });
    const lside = TILE_NAME(D(w.log).texIds[0]);
    const woodKey = stem ? w.k + '_hyphae' : w.k + '_wood';
    defBlock(woodKey, stem ? N + ' Hyphae' : N + ' Wood', { tex: lside, hardness: 2, snd: 'wood', mine: 'axe' });
    const sk = stem ? 'stripped_' + w.k + '_stem' : 'stripped_' + w.k + '_log';
    defBlock(sk, 'Stripped ' + logName, { tex: { s: ph('stripped_' + w.k + '_side', w.pl), t: ph('stripped_' + w.k + '_top', w.pl) }, hardness: 2, snd: 'wood', mine: 'axe' });
    defBlock('stripped_' + woodKey, 'Stripped ' + (stem ? N + ' Hyphae' : N + ' Wood'), { tex: 'stripped_' + w.k + '_side', hardness: 2, snd: 'wood', mine: 'axe' });
    for (const k of [w.log, woodKey, sk, 'stripped_' + woodKey]) axisFamily(k);
    D(w.log).stripTo = sk; D(woodKey).stripTo = 'stripped_' + woodKey;
    if (w.leaves) {
      if (!has(w.leaves)) defBlock(w.leaves, N + ' Leaves', { tex: ph(w.leaves, w.lf), opaque: false, render: 'cutout', cullSame: true, hardness: 0.2, snd: 'grass' });
      D(w.leaves).drop = leafDrop(w.sap, w.k === 'oak' || w.k === 'dark_oak');
      defBlock(w.sap, w.k === 'mangrove' ? 'Mangrove Propagule' : N + ' Sapling', { tex: ph(w.sap, [60, 130, 40]), render: 'cross', solid: false, opaque: false, plant: true, hardness: 0, snd: 'grass', sapling: w.k });
    }
  }
  // mangrove roots (grow out of mangrove trees; muddy ones sit in mud), mud, pale moss
  defBlock('mangrove_roots', 'Mangrove Roots', { tex: { s: ph('mangrove_roots_side', [74, 58, 36]), t: ph('mangrove_roots_top', [74, 58, 36]) }, render: 'cutout', opaque: false, hardness: 0.7, snd: 'wood', mine: 'axe' });
  defBlock('muddy_mangrove_roots', 'Muddy Mangrove Roots', { tex: { s: ph('muddy_mangrove_roots_side', [70, 54, 44]), t: ph('muddy_mangrove_roots_top', [66, 54, 46]) }, hardness: 0.7, snd: 'grass', mine: 'shovel' });
  defBlock('mud', 'Mud', { tex: ph('mud', [60, 56, 60]), hardness: 0.5, snd: 'grass', mine: 'shovel' });
  defBlock('pale_moss_block', 'Pale Moss Block', { tex: ph('pale_moss', [150, 156, 140]), hardness: 0.1, snd: 'grass', mine: 'hoe' });
  defBlock('pale_moss_carpet', 'Pale Moss Carpet', { tex: 'pale_moss', render: 'boxes', boxes: [[0, 0, 0, 16, 1, 16]], solid: false, opaque: false, hardness: 0.1, snd: 'grass', mine: 'hoe', carpet: true });
  defBlock('pale_hanging_moss', 'Pale Hanging Moss', { tex: ph('pale_hanging_moss', [140, 146, 130]), render: 'cross', solid: false, opaque: false, hardness: 0, snd: 'grass', hanging: true, noTarget: false });
  defBlock('pink_petals', 'Pink Petals', { tex: ph('pink_petals', [240, 170, 200]), render: 'boxes', boxes: [[0, 0, 0, 16, 1, 16]], solid: false, opaque: false, hardness: 0, snd: 'grass', carpet: true, flatIcon: true });
}
// tile index -> name (for building hidden log variants from an existing block's textures)
function TILE_NAME(i) { for (const k in TILE) if (TILE[k] === i) return k; return null; }

// ---- textures (called from 01bb_retex.js, after the base painters exist) ----
function paintWoodTiles() {
  const mixd = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
  for (const w of WOODDATA()) {
    if (w.k !== 'oak' && w.k !== 'bamboo' && TILE[w.k + '_planks'] !== undefined) makeTile(w.k + '_planks', (set, r) => T2.planks(set, r, w.pl));
    if (w.bamboo) {
      makeTile('bamboo_block_side', (set, r) => each((x, y) => { const s = x % 4; let c = s === 0 ? [92, 116, 30] : s === 3 ? [118, 142, 40] : [140, 166, 50]; if (y % 8 === 2 && s !== 0) c = [176, 170, 86]; set(x, y, vary(c, r, 4)); }));
      makeTile('bamboo_block_top', (set, r) => each((x, y) => { const cx = (x % 8) - 3.5, cy = (y % 8) - 3.5; const d = Math.hypot(cx, cy); set(x, y, vary(d < 1.6 ? [92, 84, 40] : d < 3.2 ? [196, 186, 96] : [120, 150, 40], r, 4)); }));
      makeTile('stripped_bamboo_side', (set, r) => each((x, y) => { const s = x % 4; let c = s === 0 ? [168, 146, 56] : [206, 186, 84]; if (y % 8 === 2) c = [184, 160, 62]; set(x, y, vary(c, r, 4)); }));
      makeTile('stripped_bamboo_top', (set, r) => each((x, y) => { const cx = (x % 8) - 3.5, cy = (y % 8) - 3.5; const d = Math.hypot(cx, cy); set(x, y, vary(d < 1.6 ? [120, 100, 50] : [206, 186, 90], r, 4)); }));
      makeTile('bamboo_planks', (set, r) => each((x, y) => { let c = w.pl; if (x % 4 === 0) c = mixd(c, 0.72); else if (y % 8 === 0) c = mixd(c, 0.84); set(x, y, vary(c, r, 5)); }));
      makeTile('bamboo_mosaic', (set, r) => each((x, y) => { const q = ((x >> 3) + (y >> 3)) & 1; const a = q ? x % 8 : y % 8; let c = a === 0 ? mixd(w.pl, 0.68) : a === 7 ? mixd(w.pl, 0.86) : w.pl; set(x, y, vary(c, r, 5)); }));
      continue;
    }
    // logs (new woods), stripped logs
    const darker = mixd(w.bark, 0.72), hi = mixd(w.bark, 1.22);
    if (['mangrove', 'cherry', 'pale_oak'].includes(w.k)) {
      makeTile(w.k + '_side', (set, r) => bark3(set, r, { seed: 610 + w.k.length, base: w.bark, dark: darker, hi, groove: mixd(w.bark, 0.55), grooves: w.k === 'cherry' ? [1, 4, 6, 9, 12, 14] : [2, 6, 11], cracks: w.k === 'pale_oak' ? 6 : 2, spots: w.k === 'pale_oak' ? 10 : 0, spot: [176, 166, 160] }));
      makeTile(w.k + '_top', (set, r) => rings3(set, r, w.top, mixd(w.top, 0.86), w.bark));
    }
    makeTile('stripped_' + w.k + '_side', (set, r) => { const n = tnoise(700 + w.k.length, 8); each((x, y) => { const v = n(x * 0.6, y * 0.15); let c = mixd(w.pl, 0.92 + v * 0.14); if (x % 5 === 2 && r() < 0.5) c = mixd(w.pl, 0.8); set(x, y, vary(c, r, 3)); }); });
    makeTile('stripped_' + w.k + '_top', (set, r) => rings3(set, r, mixd(w.pl, 1.04), mixd(w.pl, 0.88), mixd(w.pl, 0.92)));
    if (w.leaves && ['mangrove', 'cherry', 'pale_oak'].includes(w.k)) makeTile(w.leaves, (set, r) => leafPaint(set, r, w.lf));
    if (w.k === 'cherry') makeTile('cherry_leaves', (set, r) => { leafPaint(set, r, [236, 160, 196]); for (let k = 0; k < 10; k++) set(r() * 16 | 0, r() * 16 | 0, [255, 214, 232]); });
    if (w.sap) makeTile(w.sap, (set, r) => saplingPaint(set, r, w));
  }
  // mangrove roots: a tangle with gaps; muddy roots: roots packed with mud; mud; pale moss
  makeTile('mangrove_roots_side', (set, r) => { each((x, y) => set(x, y, [0, 0, 0], 0)); for (let k = 0; k < 7; k++) { let x = r() * 16, y = 0; const dx = (r() - 0.5) * 0.8; for (; y < 16; y++) { x += dx + (r() - 0.5) * 0.5; set(((x | 0) + 16) % 16, y, vary([78, 60, 38], r, 6)); set((((x | 0) + 1) + 16) % 16, y, vary([60, 46, 28], r, 6)); } } });
  makeTile('mangrove_roots_top', (set, r) => { each((x, y) => set(x, y, [0, 0, 0], 0)); for (let k = 0; k < 6; k++) { let x = r() * 16, y = r() * 16; const a = r() * 6.28; for (let i = 0; i < 12; i++) { x += Math.cos(a); y += Math.sin(a); set(((x | 0) + 16) % 16, ((y | 0) + 16) % 16, vary([78, 60, 38], r, 6)); } } });
  makeTile('mud', (set, r) => { const n = tnoise(721, 4); each((x, y) => set(x, y, vary(mixc([50, 46, 52], [72, 66, 72], n(x, y)), r, 4))); for (let k = 0; k < 10; k++) set(r() * 16 | 0, r() * 16 | 0, [90, 82, 86]); });
  makeTile('muddy_mangrove_roots_top', (set, r) => { const n = tnoise(722, 4); each((x, y) => set(x, y, vary(mixc([56, 48, 46], [74, 64, 60], n(x, y)), r, 4))); for (let k = 0; k < 5; k++) { const y = r() * 16 | 0, x0 = r() * 12 | 0; for (let i = 0; i < 5; i++) set(x0 + i, y, [96, 74, 46]); } });
  makeTile('muddy_mangrove_roots_side', (set, r) => { const n = tnoise(723, 4); each((x, y) => set(x, y, vary(mixc([56, 48, 46], [74, 64, 60], n(x, y)), r, 4))); for (let k = 0; k < 6; k++) { const x = r() * 16 | 0, y0 = r() * 10 | 0; for (let i = 0; i < 6; i++) set(x + (i >> 2), y0 + i, [96, 74, 46]); } });
  makeTile('pale_moss', (set, r) => { const n = tnoise(731, 8); each((x, y) => { const v = n(x, y); set(x, y, vary(v < 0.4 ? [128, 134, 120] : v > 0.7 ? [176, 180, 166] : [154, 160, 144], r, 5)); }); });
  makeTile('pale_hanging_moss', (set, r) => { each((x, y) => set(x, y, [0, 0, 0], 0)); for (const x0 of [3, 7, 11]) { const L = 10 + (r() * 6 | 0); for (let y = 0; y < L; y++) { set(x0 + (y % 3 === 2 ? 1 : 0), y, vary([150, 156, 140], r, 8)); if (y % 4 === 1) set(x0 - 1, y, vary([128, 134, 118], r, 6)); } } });
  makeTile('pink_petals', (set, r) => { each((x, y) => set(x, y, [0, 0, 0], 0)); for (let k = 0; k < 9; k++) { const cx = 2 + r() * 12 | 0, cy = 2 + r() * 12 | 0; for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) set(cx + a, cy + b, a || b ? [244, 176, 206] : [255, 226, 120]); } for (let k = 0; k < 6; k++) set(r() * 16 | 0, r() * 16 | 0, [90, 140, 50]); });
}
// saplings: a stem with a small crown in the tree's leaf colour (original sprites, different per tree)
function saplingPaint(set, r, w) {
  each((x, y) => set(x, y, [0, 0, 0], 0)); const stem = w.bark || [100, 80, 50]; const lf = w.lf || [60, 130, 40]; const sd = [stem[0] * 0.8, stem[1] * 0.8, stem[2] * 0.8];
  if (w.k === 'mangrove') { for (let y = 3; y < 16; y++) set(7 + (y > 12 ? 1 : 0), y, y > 10 ? [92, 140, 50] : [110, 160, 60]); for (const [x, y] of [[6, 2], [7, 1], [8, 2], [7, 2], [6, 3], [8, 3]]) set(x, y, [70, 130, 40]); set(7, 15, [140, 100, 60]); return; }
  for (let y = 9; y < 16; y++) { set(7, y, stem); set(8, y, sd); }
  const blob = (cx, cy, rr, c) => { for (let y = -rr; y <= rr; y++) for (let x = -rr; x <= rr; x++) if (x * x + y * y <= rr * rr + 0.5 && r() < 0.88) set(cx + x, cy + y, vary(c, r, 12)); };
  if (w.k === 'spruce') { for (let y = 2; y < 12; y++) { const hw = Math.floor((y - 1) / 2.4); for (let x = -hw; x <= hw; x++) if (r() < 0.9) set(7 + x, y, vary(lf, r, 10)); } }
  else if (w.k === 'acacia') { blob(5, 6, 2, lf); blob(10, 5, 2, lf); set(6, 9, stem); set(9, 8, stem); }
  else if (w.k === 'cherry') { blob(7, 6, 3, lf); for (let k = 0; k < 4; k++) set(5 + r() * 6 | 0, 4 + r() * 4 | 0, [255, 220, 236]); }
  else if (w.k === 'dark_oak' || w.k === 'pale_oak') { blob(5, 7, 2, lf); blob(10, 7, 2, lf); blob(7, 4, 2, mixc(lf, [255, 255, 255], 0.08)); }
  else if (w.k === 'jungle') { blob(7, 6, 3, lf); for (let y = 2; y < 9; y++) set(3 + (y % 2), y, vary(lf, r, 10)); }
  else if (w.k === 'birch') { blob(7, 5, 3, lf); for (let y = 9; y < 16; y++) { set(7, y, [226, 224, 214]); set(8, y, y % 3 ? [200, 198, 188] : [40, 40, 36]); } }
  else blob(7, 6, 3, lf);
}

// ---- recipes and fuel (run after 01_core.js has set up recipes) ----
GROUPS['#planks'] = WOODDATA().map(w => w.planks);
{ const i = RECIPES.findIndex(r => r.out[0] === 'planks' && r.items); if (i >= 0) RECIPES.splice(i, 1); }
for (const w of WOODDATA()) {
  if (w.bamboo) { GROUPS['#bamboo_blocks'] = ['bamboo_block', 'stripped_bamboo_block']; RECIPES.push(RSL('bamboo_planks', 2, ['#bamboo_blocks'])); RECIPES.push(RSH('bamboo_mosaic', 1, ['S', 'S'], { S: 'bamboo_slab' })); continue; }
  const stem = !!w.nether; const wood = stem ? w.k + '_hyphae' : w.k + '_wood', sl = stem ? 'stripped_' + w.k + '_stem' : 'stripped_' + w.k + '_log';
  GROUPS['#' + w.k + '_logs'] = [w.log, wood, sl, 'stripped_' + wood];
  RECIPES.push(RSL(w.planks, 4, ['#' + w.k + '_logs']), RSH(wood, 3, ['LL', 'LL'], { L: w.log }), RSH('stripped_' + wood, 3, ['LL', 'LL'], { L: sl }));
  if (!stem) for (const k of [w.log, wood, sl, 'stripped_' + wood, w.planks]) FUEL[k] = 15; if (w.sap) FUEL[w.sap] = 5;
}
GROUPS['#log'] = WOODDATA().filter(w => !w.bamboo).flatMap(w => GROUPS['#' + w.k + '_logs']);
FUEL.bamboo_planks = 15; FUEL.bamboo_mosaic = 15; FUEL.bamboo_block = 15; FUEL.stripped_bamboo_block = 15;
// "planks" in a recipe means any planks (sticks, crafting tables, chests, tools ...); "=planks" means oak planks only
{ const _im = ingMatch; ingMatch = function (spec, id) { if (spec === 'planks') return GROUPS['#planks'].some(k => IT[k] === id); if (spec[0] === '=') return IT[spec.slice(1)] === id; return _im(spec, id); }; }

// ================= THE LAST BLOCKS AND ITEMS (Minecraft) =================
// Chests that face you, sniffer eggs, torchflower and pitcher crops, tripwire hooks and tripwire, the crafter,
// calibrated sculk sensors; brick items, spectral arrows, ominous bottles, banner patterns, armor trim templates,
// carrot / warped fungus on a stick, wolf armor, furnace / TNT / hopper minecarts. Rules: 85_more.js - 88_wires.js.
const TRIMS = ['sentry', 'vex', 'wild', 'coast', 'dune', 'wayfinder', 'raiser', 'shaper', 'host', 'ward', 'silence', 'tide', 'snout', 'rib', 'eye', 'spire', 'flow', 'bolt'];
const TRIM_MATS = { iron_ingot: [210, 210, 210], copper_ingot: [200, 110, 70], gold_ingot: [240, 200, 50], lapis_lazuli: [40, 70, 190], emerald: [40, 190, 80], diamond: [80, 220, 214], netherite_ingot: [80, 70, 76], redstone: [190, 20, 20], amethyst_shard: [160, 100, 220], quartz: [236, 230, 220], resin_brick: [220, 110, 30] };
const BANNER_PATTERNS = [['flower', 'Flower Charge'], ['creeper', 'Creeper Charge'], ['skull', 'Skull Charge'], ['thing', 'Thing'], ['globe', 'Globe'], ['piglin', 'Snout'], ['flow', 'Flow'], ['guster', 'Guster']];
function defineMoreBlocks() {
  const ph = (n, c, a) => { if (TILE[n] === undefined) makeTile(n, (set) => each((x, y) => set(x, y, c, a === undefined ? 255 : a))); return n; };
  const strip = (o) => { delete o.id; delete o.key; delete o.texIds; return o; };
  // ---- chests face the player ----
  { const d0 = BL[B.CHEST]; const t = tx(d0.tex); const ids = { 2: B.CHEST };
    for (const f of [0, 1, 3]) { const o = strip(Object.assign({}, d0)); o.tex = [t[0], t[1], t[2], t[3], t[0], t[0]]; o.tex[[5, 0, 4, 1][f]] = t[4]; o.hidden = true; o.drop = 'chest'; o.st = { facing: f }; o.fam = 'chest'; ids[f] = defBlock('chest#' + f, d0.name, o); }
    d0.fam = 'chest'; d0.st = { facing: 2 }; FAMILY.chest = { kind: 'facing4', props: ['facing'], ids, base: B.CHEST }; }
  // ---- sniffer egg (3 hatch stages) ----
  for (let h = 0; h < 3; h++) { ph('sniffer_egg' + h, [160, 60, 50]); const b = [[1, 0, 2, 15, 16, 14]]; defBlock(h ? 'sniffer_egg#' + h : 'sniffer_egg', 'Sniffer Egg', { tex: 'sniffer_egg' + h, render: 'boxes', boxes: b, rb: b, cb: b, sb: b, shape: 'deco', opaque: false, hardness: 0.5, snd: 'stone', hidden: h > 0, drop: 'sniffer_egg', snifferEgg: h }); }
  // ---- torchflower and pitcher crops ----
  for (let st = 0; st < 3; st++) { ph('torchflower_crop' + st, [100, 160, 60], 0); defBlock('torchflower_crop_' + st, 'Torchflower Crop', { tex: 'torchflower_crop' + st, solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', hidden: true, crop: st, cropBase: 'torchflower_crop_', drop: 'torchflower_seeds', plant: true }); }
  for (let st = 0; st < 3; st++) { ph('pitcher_crop' + st, [80, 130, 120], 0); defBlock('pitcher_crop_' + st, 'Pitcher Crop', { tex: 'pitcher_crop' + st, solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', hidden: true, crop: st, cropBase: 'pitcher_crop_', drop: 'pitcher_pod', plant: true }); }
  // ---- tripwire hooks (facing, attached, powered) and tripwire string ----
  ph('tripwire_hook_tex', [160, 160, 166]); ph('tripwire', [220, 220, 220], 0);
  FAMILY.tripwire_hook = { kind: 'deco', props: ['facing', 'attached', 'powered'], ids: {}, base: 0 };
  for (const f of [2, 3, 0, 1]) for (const at of [0, 1]) for (const pw of [0, 1]) { const first = f === 2 && !at && !pw;
    const bs = [[6.2, 1, 14, 9.8, 15, 16, TILE.planks], [7.5, at ? 4 : 6, 9, 8.5, at ? 6 : 8, 14, TILE.tripwire_hook_tex], [6.5, at ? 3 : 5, at ? 9 : 10, 9.5, at ? 7 : 9, at ? 10 : 11, TILE.tripwire_hook_tex]].map(b => shRot(b, f));
    const id = defBlock(first ? 'tripwire_hook' : 'tripwire_hook#' + f + '_' + at + '_' + pw, 'Tripwire Hook', { tex: 'planks', render: 'boxes', boxes: bs, rb: bs, cb: [], sb: [shRot([5, 0, 10, 11, 16, 16], f)], shape: 'deco', solid: false, opaque: false, hardness: 0, snd: 'wood', hidden: !first, drop: 'tripwire_hook', fam: 'tripwire_hook', st: { facing: f, attached: at, powered: pw }, support: 'signwall', noCollide: true, hook: true });
    FAMILY.tripwire_hook.ids[[f, at, pw].join(',')] = id; if (first) FAMILY.tripwire_hook.base = id; }
  FAMILY.tripwire = { kind: 'deco', props: ['attached', 'powered'], ids: {}, base: 0 };
  for (const at of [0, 1]) for (const pw of [0, 1]) { const first = !at && !pw; const y = at ? 1 : 1.5; const bs = [[0, y, 7.5, 16, y + 0.25, 8.5, TILE.tripwire], [7.5, y, 0, 8.5, y + 0.25, 16, TILE.tripwire]];
    const id = defBlock(first ? 'tripwire' : 'tripwire#' + at + '_' + pw, 'Tripwire', { tex: 'tripwire', render: 'boxes', boxes: bs, rb: bs, cb: [], sb: [[0, 0, 0, 16, 2, 16]], shape: 'wire_t', solid: false, opaque: false, hardness: 0, snd: 'wool', hidden: true, drop: 'string', fam: 'tripwire', st: { attached: at, powered: pw }, noCollide: true, tripwire: true });
    FAMILY.tripwire.ids[at + ',' + pw] = id; if (first) FAMILY.tripwire.base = id; }
  // ---- crafter: faces six ways, has 9 slots; triggered (lit) for a moment when powered ----
  for (const t of ['crafter_top', 'crafter_top_triggered', 'crafter_front', 'crafter_front_triggered', 'crafter_side', 'crafter_bottom']) ph(t, [120, 110, 100]);
  FAMILY.crafter = { kind: 'facing6', props: ['facing', 'ex'], ids: {}, base: 0 };
  for (let f = 0; f < 6; f++) for (const ex of [0, 1]) { const tex = ['crafter_side', 'crafter_side', 'crafter_top' + (ex ? '_triggered' : ''), 'crafter_bottom', 'crafter_side', 'crafter_side']; tex[f6face(f)] = 'crafter_front' + (ex ? '_triggered' : ''); if (f === 0) { tex[2] = 'crafter_front' + (ex ? '_triggered' : ''); tex[3] = 'crafter_bottom'; } if (f === 1) { tex[3] = 'crafter_front' + (ex ? '_triggered' : ''); tex[2] = 'crafter_top' + (ex ? '_triggered' : ''); }
    const first = f === 3 && !ex; const id = defBlock(first ? 'crafter' : 'crafter#' + f + '_' + ex, 'Crafter', { tex, hardness: 1.5, mine: 'pick', tool: 'pick', snd: 'stone', hidden: !first, drop: 'crafter', fam: 'crafter', st: { facing: f, ex }, facing6: f, ex, use: 'chest', slots: 9, crafter: true });
    FAMILY.crafter.ids[f + ',' + ex] = id; if (first) FAMILY.crafter.base = id; }
  // ---- calibrated sculk sensor ----
  ph('calibrated_sculk_sensor_top', [40, 60, 80]); ph('calibrated_sculk_sensor_side', [40, 60, 80]);
  for (const on of [0, 1]) { const bs = [[0, 0, 0, 16, 8, 16], [3, 8, 3, 4, 16, 4, TILE.amethyst_cluster !== undefined ? TILE.amethyst_cluster : TILE.glass], [12, 8, 12, 13, 16, 13, TILE.amethyst_cluster !== undefined ? TILE.amethyst_cluster : TILE.glass]];
    defBlock(on ? 'calibrated_sculk_sensor#on' : 'calibrated_sculk_sensor', 'Calibrated Sculk Sensor', { tex: { s: 'calibrated_sculk_sensor_side', t: 'calibrated_sculk_sensor_top', b: 'sculk' }, render: 'boxes', boxes: bs, rb: bs, cb: [[0, 0, 0, 16, 8, 16]], sb: [[0, 0, 0, 16, 8, 16]], shape: 'deco', opaque: false, hardness: 1.5, snd: 'grass', light: on ? 0.2 : 0.07, hidden: !!on, drop: 'calibrated_sculk_sensor', sensor: 'calibrated', sensorOn: on }); }
  const ss = BL[B.SCULK_SENSOR]; if (ss) { ss.sensor = 'sculk'; ss.sensorOn = 0; ss.drop = null; defBlock('sculk_sensor#on', 'Sculk Sensor', strip(Object.assign({}, ss, { light: 0.3, hidden: true, sensorOn: 1, drop: null }))); }
}
function paintMoreTiles() { const clear = (set) => each((x, y) => set(x, y, [0, 0, 0], 0)); const stone = tilePixels('stone'), planks = tilePixels('planks');
  for (let h = 0; h < 3; h++) makeTile('sniffer_egg' + h, (set, r) => each((x, y) => { const sp = ((x * 5 + y * 3) % 9 === 0); const crack = h && ((x + y * 2) % (h === 1 ? 7 : 4) === 0); set(x, y, crack ? [60, 30, 26] : sp ? [60, 160, 150] : vary([170, 60, 50], r, 8)); }));
  for (let st = 0; st < 3; st++) { makeTile('torchflower_crop' + st, (set, r) => { clear(set); const h = 5 + st * 3; for (let y = 15; y > 15 - h; y--) set(7 + (y & 1), y, [70, 140, 50]); for (const [a, b] of [[-1, 0], [1, 0], [0, -1]]) set(7 + a, 15 - h + b, st === 2 ? [240, 140, 40] : [120, 170, 70]); });
    makeTile('pitcher_crop' + st, (set, r) => { clear(set); const h = 4 + st * 3; for (let y = 15; y > 15 - h; y--) { set(7, y, [70, 120, 110]); if (y % 3 === 0) { set(6, y, [90, 150, 130]); set(9, y, [90, 150, 130]); } } if (st === 2) for (let x = 6; x <= 9; x++) set(x, 15 - h, [120, 90, 160]); }); }
  makeTile('tripwire_hook_tex', (set, r) => each((x, y) => set(x, y, vary(((x + y) & 3) === 0 ? [190, 190, 196] : [140, 140, 146], r, 4))));
  makeTile('tripwire', (set, r) => { clear(set); each((x, y) => { if (x === 7 || x === 8 || y === 7 || y === 8) set(x, y, [230, 230, 230], 230); }); });
  const crafterBase = (x, y) => { const p = stone(x, y); const e = x === 0 || y === 0 || x === 15 || y === 15; return e ? [60, 56, 54] : [p[0] * 0.8, p[1] * 0.76, p[2] * 0.72]; };
  for (const trig of [false, true]) { const glow = trig ? [255, 140, 60] : [120, 60, 40];
    makeTile('crafter_top' + (trig ? '_triggered' : ''), (set, r) => each((x, y) => { const q = planks(x, y); let c = (x > 2 && x < 13 && y > 2 && y < 13) ? [q[0], q[1], q[2]] : crafterBase(x, y); if ((x === 5 || x === 10 || y === 5 || y === 10) && x > 2 && x < 13 && y > 2 && y < 13) c = [70, 46, 26]; set(x, y, c); }));
    makeTile('crafter_front' + (trig ? '_triggered' : ''), (set, r) => each((x, y) => { let c = crafterBase(x, y); if (x >= 4 && x <= 11 && y >= 5 && y <= 10) c = (y === 7 || y === 8) && (x === 6 || x === 9) ? glow : [40, 36, 36]; set(x, y, c); })); }
  makeTile('crafter_side', (set, r) => each((x, y) => { let c = crafterBase(x, y); if (y >= 6 && y <= 9 && x > 2 && x < 13) c = (x + y) % 3 === 0 ? [200, 150, 60] : [110, 90, 60]; set(x, y, c); }));
  makeTile('crafter_bottom', (set, r) => each((x, y) => set(x, y, crafterBase(x, y))));
  makeTile('calibrated_sculk_sensor_side', (set, r) => each((x, y) => set(x, y, y < 8 ? vary([30, 50, 70], r, 6) : vary([20, 36, 50], r, 5))));
  makeTile('calibrated_sculk_sensor_top', (set, r) => each((x, y) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); set(x, y, d < 3 ? vary([60, 220, 230], r, 10) : vary([30, 50, 70], r, 6)); }));
}
{ const M5 = (key, name, o, icon) => { if (IT[key] !== undefined && ITEMS[IT[key]].kind !== 'block') { Object.assign(ITEMS[IT[key]], o || {}); if (icon) ICONP[key] = icon; return IT[key]; } const id = nid++; defItem(id, key, name, o || {}); ITEM_IDS.push(id); if (icon) ICONP[key] = icon; return id; };
  const box = (s, x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) s(x, y, typeof c === 'function' ? c(x, y) : c); };
  // the old tripwire hook item is now the block
  if (IT.tripwire_hook !== undefined && ITEMS[IT.tripwire_hook].kind !== 'block' && B.TRIPWIRE_HOOK !== undefined) { const old = IT.tripwire_hook; ITEMS[old].key = 'legacy_tripwire_hook'; IT.legacy_tripwire_hook = old; IT.tripwire_hook = B.TRIPWIRE_HOOK; const i = ITEM_IDS.indexOf(old); if (i >= 0) ITEM_IDS.splice(i, 1); }
  M5('clay_brick', 'Brick', {}, (s) => { box(s, 2, 6, 13, 10, (x, y) => y === 6 ? [200, 110, 80] : y === 10 || x === 13 ? [120, 50, 36] : [170, 80, 56]); });
  M5('spectral_arrow', 'Spectral Arrow', { arrow: true }, (s) => { pLine(s, 3, 12, 11, 4, [150, 120, 60]); for (const [x, y] of [[2, 11], [3, 13], [2, 13], [4, 14]]) s(x, y, [240, 220, 120]); for (const [x, y] of [[11, 3], [12, 3], [12, 4], [11, 2]]) s(x, y, [250, 230, 90]); });
  M5('ominous_bottle', 'Ominous Bottle', { kind: 'food', food: 0, sat: 0, alwaysEat: true, drink: true, stack: 64 }, (s) => { for (let y = 4; y <= 14; y++) for (let x = 5; x <= 10; x++) { const neck = y < 7; if (neck && (x < 7 || x > 8)) continue; s(x, y, y === 4 ? [60, 60, 60] : neck ? [180, 200, 200] : (x === 5 || x === 10 || y === 14) ? [30, 70, 60] : [40, 110, 90]); } s(7, 10, [10, 10, 10]); s(8, 10, [10, 10, 10]); s(7, 12, [10, 10, 10]); s(8, 12, [10, 10, 10]); });
  for (const [k, n] of BANNER_PATTERNS) M5(k + '_banner_pattern', n + ' Banner Pattern', { kind: 'bpattern', pattern: k, stack: 1 }, (s) => { box(s, 3, 2, 12, 13, (x, y) => (x === 3 || x === 12 || y === 2 || y === 13) ? [190, 170, 130] : [236, 226, 196]); const g = BANNER_GLYPH(k); for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) if (g[y] && g[y][x] === '#') s(5 + x, 4 + y, [90, 70, 50]); });
  for (const t of TRIMS) M5(t + '_armor_trim_smithing_template', t[0].toUpperCase() + t.slice(1) + ' Armor Trim Smithing Template', { kind: 'template', trim: t }, (s, r) => { for (let y = 2; y <= 13; y++) for (let x = 3; x <= 12; x++) { const e = x === 3 || x === 12 || y === 2 || y === 13; let h = 0; for (const ch of t) h = (h * 31 + ch.charCodeAt(0)) >>> 0; s(x, y, e ? [52, 44, 48] : ((x * 7 + y * 3 + h) % 5 === 0) ? [120, 180, 190] : vary([70, 76, 80], r, 6)); } });
  M5('carrot_on_a_stick', 'Carrot on a Stick', { kind: 'steer', steer: 'pig', stack: 1, dur: 25 }, (s) => { pLine(s, 2, 14, 11, 5, [130, 90, 50]); pLine(s, 11, 5, 12, 9, [220, 220, 220]); for (let i = 0; i < 4; i++) s(12 - (i >> 1), 10 + i, [240, 140, 30]); s(13, 9, [60, 140, 40]); });
  M5('warped_fungus_on_a_stick', 'Warped Fungus on a Stick', { kind: 'steer', steer: 'strider', stack: 1, dur: 100 }, (s) => { pLine(s, 2, 14, 11, 5, [130, 90, 50]); pLine(s, 11, 5, 12, 9, [220, 220, 220]); box(s, 10, 9, 14, 11, [30, 140, 130]); s(12, 12, [220, 160, 120]); s(12, 13, [220, 160, 120]); });
  M5('wolf_armor', 'Wolf Armor', { kind: 'wolfarmor', stack: 1, dur: 64 }, (s) => { box(s, 2, 6, 13, 11, (x, y) => (y === 6 || y === 11) ? [110, 90, 80] : (x + y) % 3 === 0 ? [170, 140, 120] : [140, 116, 100]); box(s, 11, 4, 13, 6, [140, 116, 100]); });
  M5('torchflower_seeds', 'Torchflower Seeds', { kind: 'seed', crop: 'torchflower_crop_0' }, (s) => { for (const [x, y] of [[6, 7], [9, 6], [7, 10], [10, 9]]) { s(x, y, [150, 110, 60]); s(x + 1, y, [120, 80, 40]); } });
  M5('pitcher_pod', 'Pitcher Pod', { kind: 'seed', crop: 'pitcher_crop_0' }, (s) => { for (let y = 4; y <= 12; y++) for (let x = 6; x <= 9; x++) s(x, y, y < 6 ? [120, 90, 160] : [90, 140, 120]); });
  const cartP = (top) => (s) => { box(s, 2, 8, 13, 12, (x, y) => (y === 8) ? [150, 150, 156] : (x === 2 || x === 13 || y === 12) ? [70, 70, 76] : [110, 110, 116]); s(4, 13, [40, 40, 40]); s(11, 13, [40, 40, 40]); if (top) top(s); };
  M5('furnace_minecart', 'Minecart with Furnace', { kind: 'minecart', stack: 1, cart: 'furnace' }, cartP((s) => { box(s, 4, 3, 11, 8, (x, y) => (x >= 6 && x <= 9 && y >= 5 && y <= 7) ? [240, 140, 40] : [100, 100, 100]); }));
  M5('tnt_minecart', 'Minecart with TNT', { kind: 'minecart', stack: 1, cart: 'tnt' }, cartP((s) => { box(s, 4, 3, 11, 8, (x, y) => y === 5 || y === 6 ? [230, 230, 230] : [200, 40, 30]); }));
  M5('hopper_minecart', 'Minecart with Hopper', { kind: 'minecart', stack: 1, cart: 'hopper' }, cartP((s) => { box(s, 3, 4, 12, 7, (x, y) => y === 4 ? [80, 80, 86] : [56, 56, 62]); box(s, 6, 1, 9, 3, [70, 70, 76]); }));
  for (const [k, cart] of [['chest_minecart', 'chest'], ['minecart', null]]) if (IT[k] !== undefined) ITEMS[IT[k]].cart = cart;
  const R = (o, n, sh, k) => RECIPES.push(RSH(o, n, sh, k)); const L = (o, n, items) => RECIPES.push(RSL(o, n, items)); const r0 = RECIPES.length;
  // bricks: clay balls smelt into brick items; four make a block of bricks
  { const i = RECIPES.findIndex(r => r.out[0] === 'brick' && r.key && r.key.S === 'sand'); if (i >= 0) RECIPES.splice(i, 1); } R('brick', 1, ['BB', 'BB'], { B: 'clay_brick' }); if (IT.clay_ball !== undefined) SMELT[IT.clay_ball] = IT.clay_brick;
  for (const k of ['flower_pot', 'decorated_pot']) { for (let i = RECIPES.length - 1; i >= 0; i--) if (RECIPES[i].out[0] === k) RECIPES.splice(i, 1); }
  R('flower_pot', 1, ['B B', ' B '], { B: 'clay_brick' }); GROUPS['#pot_sherds'] = ['clay_brick', ...SHERDS.map(s => s + '_pottery_sherd')].filter(k => IT[k] !== undefined); R('decorated_pot', 1, [' B ', 'B B', ' B '], { B: '#pot_sherds' });
  R('spectral_arrow', 2, [' G ', 'GAG', ' G '], { G: 'glowstone_dust', A: 'arrow' }); R('carrot_on_a_stick', 1, ['R ', ' C'], { R: 'fishing_rod', C: 'carrot' }); R('warped_fungus_on_a_stick', 1, ['R ', ' W'], { R: 'fishing_rod', W: 'warped_fungus' });
  R('wolf_armor', 1, ['S  ', 'SSS', 'S S'], { S: 'armadillo_scute' }); L('furnace_minecart', 1, ['minecart', 'furnace']); L('tnt_minecart', 1, ['minecart', 'tnt']); L('hopper_minecart', 1, ['minecart', 'hopper']);
  R('tripwire_hook', 2, ['I', 'S', 'P'], { I: 'iron_ingot', S: 'stick', P: 'planks' }); R('crafter', 1, ['III', 'ICI', 'RDR'], { I: 'iron_ingot', C: 'crafting_table', R: 'redstone', D: 'dropper' });
  R('calibrated_sculk_sensor', 1, [' A ', 'ASA'], { A: 'amethyst_shard', S: 'sculk_sensor' });
  L('creeper_banner_pattern', 1, ['paper', 'creeper_head']); L('skull_banner_pattern', 1, ['paper', 'wither_skeleton_skull']); L('flower_banner_pattern', 1, ['paper', 'oxeye_daisy']); L('thing_banner_pattern', 1, ['paper', 'enchanted_golden_apple']);
  for (const t of TRIMS) R(t + '_armor_trim_smithing_template', 2, ['DTD', 'DCD', 'DDD'], { D: 'diamond', T: t + '_armor_trim_smithing_template', C: 'cobblestone' });
  for (let i = RECIPES.length - 1; i >= r0; i--) { const rr = RECIPES[i]; const specs = rr.items || Object.values(rr.key || {}); if (specs.some(sp => sp[0] !== '#' && sp !== 'planks' && (sp[0] === '=' ? IT[sp.slice(1)] === undefined : IT[sp] === undefined))) RECIPES.splice(i, 1); }
}
// banner pattern pictures, 6 x 8 cells (used for the item icons and drawn on banners)
function BANNER_GLYPH(k) { return {
  flower: ['..##..', '.#..#.', '#.##.#', '#.##.#', '.#..#.', '..##..', '...#..', '..##..'],
  creeper: ['......', '##..##', '##..##', '..##..', '.####.', '.####.', '.#..#.', '......'],
  skull: ['.####.', '#....#', '#.##.#', '#....#', '.####.', '.#.#..', '#.#.#.', '......'],
  thing: ['..#...', '.###..', '#####.', '.#.#..', '.###..', '#####.', '..#...', '......'],
  globe: ['.####.', '#.##.#', '##..##', '#.#..#', '##.#.#', '#..#.#', '.####.', '......'],
  piglin: ['......', '.####.', '#.##.#', '#....#', '#.##.#', '.####.', '......', '......'],
  flow: ['.####.', '#....#', '#.##.#', '#.#..#', '#.###.', '#.....', '.#####', '......'],
  guster: ['......', '#.##.#', '.#..#.', '#....#', '.####.', '..##..', '.#..#.', '......'] }[k] || []; }
if (B.TRIPWIRE_HOOK !== undefined) BL[B.TRIPWIRE_HOOK].iconPaint = true;

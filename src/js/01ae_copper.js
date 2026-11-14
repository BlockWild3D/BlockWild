// ================= COPPER (Minecraft 1.21) =================
// Four ages (copper, exposed, weathered, oxidized), each also waxed: blocks, cut copper and its stairs and slabs,
// chiseled copper, copper grates (see-through), copper bulbs (switch on and off with each redstone pulse; dimmer as
// they age), copper doors and trapdoors. Unwaxed copper slowly ages on random ticks; an axe scrapes off one age or the
// wax; honeycomb waxes it so it stops ageing. Also blocks of raw copper, raw iron and raw gold, and the lightning rod.
function CUDATA() { return { ages: ['', 'exposed_', 'weathered_', 'oxidized_'], names: ['', 'Exposed ', 'Weathered ', 'Oxidized '], cols: [[194, 108, 78], [166, 126, 104], [110, 146, 108], [84, 164, 134]] }; }
const CU_AGES = CUDATA().ages, CU_NAMES = CUDATA().names, CU_COLS = CUDATA().cols;
// the key of a copper block of `type` at age `a`, waxed or not ('block' is "copper_block" / "exposed_copper" ...)
function cuKey(type, a, waxed) { const w = waxed ? 'waxed_' : ''; const p = CUDATA().ages[a];
  if (type === 'block') return w + (a ? p + 'copper' : 'copper_block');
  if (type === 'cut') return w + p + 'cut_copper'; if (type === 'chiseled') return w + p + 'chiseled_copper';
  return w + p + 'copper_' + type; } // grate, bulb, door, trapdoor
function cuName(type, a, waxed) { const w = waxed ? 'Waxed ' : ''; const n = CUDATA().names[a];
  return w + n + ({ block: a ? 'Copper' : 'Block of Copper', cut: 'Cut Copper', chiseled: 'Chiseled Copper', grate: 'Copper Grate', bulb: 'Copper Bulb', door: 'Copper Door', trapdoor: 'Copper Trapdoor' })[type]; }
function defineCopperBlocks() {
  const ph = (n, c) => { if (TILE[n] === undefined) makeTile(n, (set) => each((x, y) => set(x, y, c))); return n; };
  for (let a = 0; a < 4; a++) {
    const col = CUDATA().cols[a]; const t = (k) => ph('cu_' + k + '_' + a, col);
    for (const waxed of [false, true]) {
      const base = { hardness: 3, tool: 'pick', tier: 2, mine: 'pick', snd: 'stone', cuAge: a, cuWaxed: waxed };
      if (!(a === 0 && !waxed)) defBlock(cuKey('block', a, waxed), cuName('block', a, waxed), Object.assign({ tex: t('block') }, base));
      else Object.assign(BL[B.COPPER_BLOCK], base, { tex: t('block'), texIds: [TILE[t('block')], TILE[t('block')], TILE[t('block')], TILE[t('block')], TILE[t('block')], TILE[t('block')]] });
      Object.assign(BL[B[cuKey('block', a, waxed).toUpperCase()]], { cuType: 'block' });
      defBlock(cuKey('cut', a, waxed), cuName('cut', a, waxed), Object.assign({ tex: t('cut'), cuType: 'cut' }, base));
      defBlock(cuKey('chiseled', a, waxed), cuName('chiseled', a, waxed), Object.assign({ tex: t('chiseled'), cuType: 'chiseled' }, base));
      defBlock(cuKey('grate', a, waxed), cuName('grate', a, waxed), Object.assign({ tex: t('grate'), cuType: 'grate', render: 'cutout', opaque: false, snd: 'glass' }, base));
      const off = defBlock(cuKey('bulb', a, waxed), cuName('bulb', a, waxed), Object.assign({ tex: t('bulb'), cuType: 'bulb', bulb: true }, base));
      const on = defBlock(cuKey('bulb', a, waxed) + '#lit', cuName('bulb', a, waxed), Object.assign({ tex: t('bulb_lit'), cuType: 'bulb', bulb: true, lit: true, hidden: true, drop: cuKey('bulb', a, waxed), light: [1, 0.8, 0.53, 0.27][a] }, base));
      BL[off].bulbOther = on; BL[on].bulbOther = off;
    }
  }
  defBlock('raw_copper_block', 'Block of Raw Copper', { tex: ph('raw_copper_block', [154, 92, 64]), hardness: 5, tool: 'pick', tier: 2, mine: 'pick' });
  defBlock('raw_iron_block', 'Block of Raw Iron', { tex: ph('raw_iron_block', [166, 136, 108]), hardness: 5, tool: 'pick', tier: 2, mine: 'pick' });
  defBlock('raw_gold_block', 'Block of Raw Gold', { tex: ph('raw_gold_block', [222, 168, 46]), hardness: 5, tool: 'pick', tier: 3, mine: 'pick' });
  // lightning rod: a thin copper rod, along the axis it is placed on
  const rodTex = ph('lightning_rod', [194, 108, 78]); const rod = { y: [[7, 0, 7, 9, 12, 9], [6, 12, 6, 10, 16, 10]], x: [[0, 7, 7, 12, 9, 9], [12, 6, 6, 16, 10, 10]], z: [[7, 7, 0, 9, 9, 12], [6, 6, 12, 10, 10, 16]] };
  const r0 = defBlock('lightning_rod', 'Lightning Rod', { tex: rodTex, render: 'boxes', boxes: rod.y, opaque: false, hardness: 3, tool: 'pick', tier: 1, mine: 'pick', snd: 'stone' });
  FAMILY.lightning_rod = { kind: 'axis', props: ['axis'], ids: { y: r0 }, base: r0, mat: 'lightning_rod' }; BL[r0].fam = 'lightning_rod'; BL[r0].st = { axis: 'y' };
  for (const ax of ['x', 'z']) { const o = Object.assign({}, BL[r0], { boxes: rod[ax], hidden: true, drop: 'lightning_rod', st: { axis: ax } }); delete o.id; delete o.key; delete o.texIds; FAMILY.lightning_rod.ids[ax] = defBlock('lightning_rod#' + ax, 'Lightning Rod', o); }
}
// copper doors / trapdoors / cut copper stairs and slabs are made in defineShapeBlocks (01ab_shapes.js)
function COPPER_SHAPES() { const out = []; for (let a = 0; a < 4; a++) for (const waxed of [false, true]) out.push({ a, waxed, cut: cuKey('cut', a, waxed), stairs: cuKey('cut', a, waxed) + '_stairs', slab: cuKey('cut', a, waxed) + '_slab', door: cuKey('door', a, waxed), trapdoor: cuKey('trapdoor', a, waxed), name: (waxed ? 'Waxed ' : '') + CUDATA().names[a] }); return out; }
// ---- textures ----
function paintCopperTiles() {
  const sh = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
  for (let a = 0; a < 4; a++) { const c = CU_COLS[a]; const patina = (set, r, x, y, base) => { let col = base; if (a > 0 && ((x * 7 + y * 13 + a * 5) % 11) < a) col = mixc(base, CU_COLS[Math.min(3, a + 1)], 0.5); return vary(col, r, 4); };
    makeTile('cu_block_' + a, (set, r) => each((x, y) => { let col = c; if (x === 0 || y === 0) col = sh(c, 1.16); else if (x === 15 || y === 15) col = sh(c, 0.76); else if ((x === 7 || x === 8) && y % 4 === 1) col = sh(c, 0.84); set(x, y, patina(set, r, x, y, col)); }));
    makeTile('cu_cut_' + a, (set, r) => each((x, y) => { const lx = x % 8, ly = y % 8; let col = c; if (lx === 0 || ly === 0) col = sh(c, 1.14); else if (lx === 7 || ly === 7) col = sh(c, 0.72); set(x, y, patina(set, r, x, y, col)); }));
    makeTile('cu_chiseled_' + a, (set, r) => each((x, y) => { let col = c; const e = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); if (e > 6.6) col = sh(c, x + y < 15 ? 1.14 : 0.74); else if (e > 5.6) col = sh(c, 0.8); else if (e < 2.6 && e > 1.4) col = sh(c, 1.2); else if (e < 1.4) col = sh(c, 0.7); else if ((x === 7 || x === 8 || y === 7 || y === 8)) col = sh(c, 0.88); set(x, y, patina(set, r, x, y, col)); }));
    makeTile('cu_grate_' + a, (set, r) => each((x, y) => { const lx = x % 4, ly = y % 4; if (lx >= 1 && lx <= 2 && ly >= 1 && ly <= 2) { set(x, y, [0, 0, 0], 0); return; } let col = c; if (lx === 0 && ly === 0) col = sh(c, 1.18); else if (lx === 3 || ly === 3) col = sh(c, 0.8); set(x, y, patina(set, r, x, y, col)); }));
    for (const lit of [false, true]) makeTile('cu_bulb' + (lit ? '_lit_' : '_') + a, (set, r) => each((x, y) => { const e = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); let col;
      if (e > 6.6) col = sh(c, 0.9); else if (e > 5.6) col = sh(c, 1.15); else if (e > 4.6) col = sh(c, 0.7); else { const d = Math.hypot(x - 7.5, y - 7.5); col = lit ? (d < 2 ? [255, 250, 220] : d < 3.5 ? [255, 220, 140] : [240, 170, 90]) : (d < 2 ? [120, 100, 80] : [80, 64, 52]); if ((x + y) % 5 === 0 && e < 4.6) col = sh(c, 0.85); }
      set(x, y, e > 4.6 ? patina(set, r, x, y, col) : col); }));
  }
  makeTile('raw_copper_block', (set, r) => { const m = voronoi(r, 9); each((x, y) => { const k = y * 16 + x; let col = m.d2[k] - m.d1[k] < 0.8 ? [110, 60, 40] : [[176, 104, 72], [154, 92, 64], [200, 124, 88]][m.id[k] % 3]; set(x, y, vary(col, r, 6)); }); });
  makeTile('raw_iron_block', (set, r) => { const m = voronoi(r, 9); each((x, y) => { const k = y * 16 + x; let col = m.d2[k] - m.d1[k] < 0.8 ? [110, 88, 70] : [[196, 166, 136], [166, 136, 108], [214, 186, 156]][m.id[k] % 3]; set(x, y, vary(col, r, 6)); }); });
  makeTile('raw_gold_block', (set, r) => { const m = voronoi(r, 9); each((x, y) => { const k = y * 16 + x; let col = m.d2[k] - m.d1[k] < 0.8 ? [150, 100, 20] : [[236, 186, 54], [210, 160, 40], [250, 214, 90]][m.id[k] % 3]; set(x, y, vary(col, r, 6)); }); });
  makeTile('lightning_rod', (set, r) => each((x, y) => set(x, y, vary(x % 4 === 0 ? [150, 84, 60] : [206, 120, 88], r, 5))));
  // copper doors and trapdoors: repaint the placeholder tiles from 01ab with copper colours
  for (let a = 0; a < 4; a++) { const c = CU_COLS[a]; for (const waxed of [false, true]) { const dk = cuKey('door', a, waxed), tk = cuKey('trapdoor', a, waxed);
    const door = (top) => (set, r) => { each((x, y) => { let col = c; if (x === 0 || x === 15 || (top ? y === 0 : y === 15)) col = sh(c, 0.7); else if (x === 1) col = sh(c, 1.15); else if (y % 5 === 0) col = sh(c, 0.86); set(x, y, vary(col, r, 4)); });
      if (top) for (let y = 3; y < 9; y++) for (let x = 4; x < 12; x++) set(x, y, (x === 7 || x === 8 || y === 5) ? sh(c, 0.8) : [0, 0, 0], (x === 7 || x === 8 || y === 5) ? 255 : 0); else set(12, 1, [60, 50, 40]); };
    if (TILE[dk + '_top'] !== undefined) { makeTile(dk + '_top', door(true)); makeTile(dk + '_bottom', door(false)); makeTile(dk + '_item', (set, r) => { const T = (x, y) => tilePixels(dk + (y < 8 ? '_top' : '_bottom'))(x * 2, (y % 8) * 2); for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) { const p = T(x, y); if (p[3] > 0) set(x + 4, y, p); } }); }
    if (TILE[tk] !== undefined) makeTile(tk, (set, r) => each((x, y) => { const e = x === 0 || y === 0 || x === 15 || y === 15; const hole = !e && x % 5 >= 2 && x % 5 <= 3 && y % 5 >= 2 && y % 5 <= 3; set(x, y, hole ? [0, 0, 0] : vary(e ? sh(c, 0.72) : c, r, 4), hole ? 0 : 255); }));
  } }
}
// ---- recipes ----
{ const R = (o, n, sh, k) => RECIPES.push(RSH(o, n, sh, k)); const L = (o, n, items) => RECIPES.push(RSL(o, n, items));
  for (let a = 0; a < 4; a++) for (const waxed of [false, true]) { const blk = cuKey('block', a, waxed), cut = cuKey('cut', a, waxed);
    R(cut, 4, ['BB', 'BB'], { B: blk }); R(cuKey('grate', a, waxed), 4, [' B ', 'B B', ' B '], { B: blk }); R(cuKey('chiseled', a, waxed), 1, ['S', 'S'], { S: cut + '_slab' });
    if (a === 0) { R(cuKey('bulb', a, waxed), 4, [' B ', 'BRB', ' D '], { B: blk, R: 'blaze_rod', D: 'redstone' }); }
    if (waxed) for (const type of ['block', 'cut', 'chiseled', 'grate', 'bulb', 'door', 'trapdoor']) L(cuKey(type, a, true), 1, [cuKey(type, a, false), 'honeycomb']);
    if (waxed) for (const s of ['_stairs', '_slab']) L(cut + s, 1, [cuKey('cut', a, false) + s, 'honeycomb']);
  }
  R('copper_door', 3, ['CC', 'CC', 'CC'], { C: 'copper_ingot' }); R('copper_trapdoor', 1, ['CC', 'CC'], { C: 'copper_ingot' }); R('lightning_rod', 1, ['C', 'C', 'C'], { C: 'copper_ingot' });
  for (const [b, raw] of [['raw_copper_block', 'raw_copper'], ['raw_iron_block', 'raw_iron'], ['raw_gold_block', 'raw_gold']]) { R(b, 1, ['RRR', 'RRR', 'RRR'], { R: raw }); L(raw, 9, [b]); }
  { const i = RECIPES.findIndex(r => r.out[0] === 'copper_ingot' && r.items && r.items[0] === 'copper_block'); if (i >= 0) RECIPES[i].items = ['copper_block']; }
}

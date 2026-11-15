// ================= WILDERNESS BOUND (Minecraft 26.3) AND STRUCTURE BLOCKS =================
// Poplar wood (the whole set comes from WOODDATA in 01aa_woods.js) with red, orange and yellow poplar leaves; shelf
// mushrooms (small and large, on log sides; large ones are bouncy); red shrubs; cushions in 16 colours (sit on
// them); straw beds (sleep through the night without moving your spawn point; one use); wool and concrete stairs
// and slabs (made in 01ab_shapes.js). Rules and world generation: 97_structs.js.
function defineWildBlocks() {
  const ph = (n, c, a) => { if (TILE[n] === undefined) makeTile(n, (set) => each((x, y) => set(x, y, c, a === undefined ? 255 : a))); return n; };
  const strip = (o) => { delete o.id; delete o.key; delete o.texIds; return o; };
  // red and yellow poplar leaves: the orange leaves from WOODDATA, recoloured
  const ol = BL[B.ORANGE_POPLAR_LEAVES]; if (ol) { ol.name = 'Orange Poplar Leaves'; for (const [k, n] of [['red_poplar_leaves', 'Red Poplar Leaves'], ['yellow_poplar_leaves', 'Yellow Poplar Leaves']]) { const o = strip(Object.assign({}, ol)); o.tex = ph(k, [200, 100, 40]); delete o.fam; delete o.st; defBlock(k, n, o); } }
  // shelf mushrooms on the side of a log, facing out; small or large
  ph('shelf_mushroom_tex', [170, 120, 80]); FAMILY.shelf_mushroom = { kind: 'deco', props: ['facing', 'size'], ids: {}, base: 0 };
  for (const size of [0, 1]) for (const f of [2, 3, 0, 1]) { const b = size ? [[1, 5, 8, 15, 8, 16], [3, 8, 11, 13, 9, 16]] : [[4, 6, 11, 12, 8, 16], [5, 8, 13, 11, 9, 16]]; const bs = b.map(x => shRot(x, f)); const first = size === 0 && f === 2;
    const id = defBlock(first ? 'shelf_mushroom' : 'shelf_mushroom#' + f + '_' + size, 'Shelf Mushroom', { tex: 'shelf_mushroom_tex', render: 'boxes', boxes: bs, rb: bs, cb: size ? bs : [], sb: bs, shape: 'deco', opaque: false, solid: !!size, hardness: 0.2, snd: 'grass', hidden: !first, drop: size ? ['shelf_mushroom', 2] : 'shelf_mushroom', fam: 'shelf_mushroom', st: { facing: f, size }, shelf: size + 1, flatIcon: true });
    FAMILY.shelf_mushroom.ids[f + ',' + size] = id; if (first) FAMILY.shelf_mushroom.base = id; }
  defBlock('red_shrub', 'Red Shrub', { tex: ph('red_shrub', [170, 40, 30], 0), solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', plant: true });
  // cushions: low and soft, you sit on them
  for (const [c, N, wool] of COLORDATA()) { const b = [[1, 0, 1, 15, 5, 15], [2, 5, 2, 14, 6, 14]]; defBlock(c + '_cushion', N + ' Cushion', { tex: ph('cushion_' + c, wool), render: 'boxes', boxes: b, rb: b, cb: [[1, 0, 1, 15, 6, 15]], sb: b, shape: 'deco', opaque: false, hardness: 0.3, snd: 'wool', cushion: true }); }
  // straw beds
  { const b = [[0, 0, 0, 16, 5, 16], [0, 5, 0, 16, 6, 3]]; defBlock('straw_bed', 'Straw Bed', { tex: { s: ph('straw_bed_side', [200, 170, 70]), t: ph('straw_bed_top', [220, 190, 90]) }, render: 'boxes', boxes: b, rb: b, cb: [[0, 0, 0, 16, 6, 16]], sb: b, shape: 'deco', opaque: false, hardness: 0.2, snd: 'grass', strawBed: true, stack: 16 }); }
}
function paintWildTiles() {
  const leaf = (c) => (set, r) => leafPaint(set, r, c);
  makeTile('orange_poplar_leaves', (set, r) => { leafPaint(set, r, [222, 124, 36]); for (let k = 0; k < 8; k++) set(r() * 16 | 0, r() * 16 | 0, [250, 178, 70]); });
  makeTile('red_poplar_leaves', (set, r) => { leafPaint(set, r, [184, 46, 30]); for (let k = 0; k < 8; k++) set(r() * 16 | 0, r() * 16 | 0, [230, 90, 60]); });
  makeTile('yellow_poplar_leaves', (set, r) => { leafPaint(set, r, [226, 186, 40]); for (let k = 0; k < 8; k++) set(r() * 16 | 0, r() * 16 | 0, [255, 228, 110]); });
  makeTile('shelf_mushroom_tex', (set, r) => each((x, y) => { const ring = Math.floor(Math.hypot(x - 7.5, y - 16) / 2.2) % 2; set(x, y, vary(ring ? [196, 142, 92] : [168, 112, 70], r, 5)); if (y < 2) set(x, y, [226, 196, 150]); }));
  makeTile('red_shrub', (set, r) => { clear(set); for (let y = 3; y < 16; y++) for (let x = 1; x < 15; x++) { const d = Math.hypot((x - 7.5) / 7, (y - 9.5) / 6.5); if (d < 1 && r() < 0.82) set(x, y, vary(r() < 0.25 ? [214, 70, 50] : [160, 34, 28], r, 8)); } for (let y = 11; y < 16; y++) set(7 + (y & 1), y, [96, 60, 40]); });
  for (const [c, , wool] of COLORDATA()) makeTile('cushion_' + c, (set, r) => each((x, y) => { const e = x === 0 || y === 0 || x === 15 || y === 15; const tuft = (x === 4 || x === 11) && (y === 4 || y === 11); set(x, y, vary(e ? shadeC(wool, 0.8) : tuft ? shadeC(wool, 0.7) : wool, r, 5)); }));
  makeTile('straw_bed_side', (set, r) => each((x, y) => set(x, y, vary(y < 2 ? [214, 186, 92] : (x + y * 3) % 5 === 0 ? [176, 140, 50] : [204, 168, 66], r, 8))));
  makeTile('straw_bed_top', (set, r) => each((x, y) => set(x, y, vary(((x * 3 + y) % 7 === 0) ? [178, 142, 54] : (y < 4 ? [236, 228, 210] : [220, 190, 86]), r, 8))));
}
{ const MI = (key, name, o, icon) => { if (IT[key] !== undefined) { if (icon) ICONP[key] = icon; Object.assign(ITEMS[IT[key]], o || {}); return IT[key]; } const id = nid++; defItem(id, key, name, o || {}); ITEM_IDS.push(id); if (icon) ICONP[key] = icon; return id; };
  const box = (s, x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) s(x, y, typeof c === 'function' ? c(x, y) : c); };
  MI('buried_treasure_map', 'Buried Treasure Map', { kind: 'treasure_map', stack: 1 }, (s) => { box(s, 2, 2, 13, 13, (x, y) => (x + y) % 5 === 0 ? [206, 190, 150] : [226, 212, 176]); box(s, 2, 2, 13, 2, [180, 160, 120]); for (const [x, y] of [[9, 8], [10, 9], [11, 10], [11, 8], [9, 10]]) s(x, y, [180, 30, 30]); for (let i = 3; i < 9; i++) s(i, 12 - (i >> 1), [120, 100, 80]); });
  ICONP.shelf_mushroom = (s) => { for (let y = 6; y <= 10; y++) for (let x = 1; x <= 14; x++) { const d = Math.hypot((x - 7.5) / 6.5, (y - 10) / 4); if (d < 1 && y <= 10) s(x, y, y < 7 ? [226, 196, 150] : ((Math.floor(d * 4) & 1) ? [196, 142, 92] : [168, 112, 70])); } };
  ICONP.straw_bed = (s) => { box(s, 1, 6, 14, 11, (x, y) => y === 6 ? [214, 186, 92] : ((x * 3 + y) % 7 === 0) ? [176, 140, 50] : [204, 168, 66]); box(s, 1, 6, 4, 8, [236, 228, 210]); };
  for (const [c, , wool] of COLORDATA()) ICONP[c + '_cushion'] = (s) => { box(s, 2, 7, 13, 12, (x, y) => y === 7 ? shadeC(wool, 1.12) : y === 12 ? shadeC(wool, 0.75) : wool); s(4, 9, shadeC(wool, 0.7)); s(11, 9, shadeC(wool, 0.7)); };
  const R = (o, n, shp, k) => RECIPES.push(RSH(o, n, shp, k)), L = (o, n, items) => RECIPES.push(RSL(o, n, items));
  for (const [c] of COLORDATA()) R(c + '_cushion', 1, ['SSS'], { S: c + '_wool_slab' });
  L('straw_bed', 4, ['hay_block', 'hay_block', 'hay_block']); L('red_dye', 1, ['red_shrub']);
}

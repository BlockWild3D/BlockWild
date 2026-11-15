// ================= BLOCKS AND ITEMS FOR THE NEWER MOBS =================
// The Garden Awakens: creaking heart, resin clumps / block / bricks, eyeblossoms. Chase the Skies: dried ghast (it
// hydrates in water) and harnesses. The Copper Age: copper chests (they age like copper) and copper golem statues.
// Spring to Life: leaf litter, wildflowers, firefly bushes, bushes, cactus flowers, short and tall dry grass, blue and
// brown eggs. Tiny Takeover: the golden dandelion. Mounts of Mayhem: nautilus armor. Rules: 94_mobs2.js.
function cgCol(a) { return [[214, 124, 84], [168, 136, 96], [104, 150, 120], [80, 168, 140]][a]; } // copper golem colours by age
function cuAge(a) { return ['', 'exposed_', 'weathered_', 'oxidized_'][a]; }
function defineMobBlocks() {
  const ph = (n, c, a) => { if (TILE[n] === undefined) makeTile(n, (set) => each((x, y) => set(x, y, c, a === undefined ? 255 : a))); return n; };
  const strip = (o) => { delete o.id; delete o.key; delete o.texIds; return o; };
  // ---- creaking heart: dormant by day, awake (eyes lit) at night ----
  for (const t of ['creaking_heart_side', 'creaking_heart_side_awake', 'creaking_heart_top']) ph(t, [200, 190, 180]);
  defBlock('creaking_heart', 'Creaking Heart', { tex: { s: 'creaking_heart_side', t: 'creaking_heart_top' }, hardness: 10, mine: 'axe', snd: 'wood', heart: 1, drop: ['resin_clump', 2] });
  defBlock('creaking_heart#awake', 'Creaking Heart', { tex: { s: 'creaking_heart_side_awake', t: 'creaking_heart_top' }, hardness: 10, mine: 'axe', snd: 'wood', heart: 2, hidden: true, drop: ['resin_clump', 2] });
  // ---- resin clumps (on any face, like glow lichen) and resin blocks ----
  ph('resin_clump', [220, 110, 30], 0); const rc = BL.length;
  for (let f = 0; f < 6; f++) { const b = [[0, 0, 0, 16, 0.6, 16], [0, 15.4, 0, 16, 16, 16], [0, 0, 15.4, 16, 16, 16], [0, 0, 0, 0.6, 16, 16], [0, 0, 0, 16, 16, 0.6], [15.4, 0, 0, 16, 16, 16]][f];
    defBlock(f ? 'resin_clump#' + f : 'resin_clump', 'Resin Clump', { tex: 'resin_clump', render: 'boxes', boxes: [b], support: 'lichen', solid: false, opaque: false, hardness: 0, snd: 'grass', lichen: f, lichenBase: rc, hidden: f > 0, drop: 'resin_clump', flatIcon: true }); }
  for (const [k, n] of [['resin_block', 'Block of Resin'], ['resin_bricks', 'Resin Bricks'], ['chiseled_resin_bricks', 'Chiseled Resin Bricks']]) defBlock(k, n, { tex: ph(k, [220, 110, 30]), hardness: k === 'resin_block' ? 0 : 1.5, tool: k === 'resin_block' ? null : 'pick', tier: 0, mine: k === 'resin_block' ? null : 'pick', snd: k === 'resin_block' ? 'squish' : 'stone' });
  // ---- eyeblossoms: open at night, closed by day ----
  for (const [k, n] of [['open_eyeblossom', 'Open Eyeblossom'], ['closed_eyeblossom', 'Closed Eyeblossom']]) defBlock(k, n, { tex: ph(k, [120, 120, 120], 0), solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', plant: true, eyeblossom: k === 'open_eyeblossom' ? 2 : 1, light: k === 'open_eyeblossom' ? 0.06 : 0 });
  // ---- dried ghast: four looks as it soaks up water ----
  for (let h = 0; h < 4; h++) { ph('dried_ghast_' + h, [180, 170, 160]); const b = [[3, 0, 3, 13, 10, 13]];
    defBlock(h ? 'dried_ghast#' + h : 'dried_ghast', 'Dried Ghast', { tex: 'dried_ghast_' + h, render: 'boxes', boxes: b, rb: b, cb: b, sb: b, shape: 'deco', opaque: false, hardness: 0, snd: 'sand', hidden: h > 0, drop: 'dried_ghast', hydration: h }); }
  // ---- copper chests (all four ages, waxed too), facing the player ----
  for (let a = 0; a < 4; a++) { for (const t of ['side', 'top', 'front']) ph('copper_chest_' + t + a, cgCol(a));
    for (const waxed of [false, true]) { const key = (waxed ? 'waxed_' : '') + cuAge(a) + 'copper_chest'; const name = (waxed ? 'Waxed ' : '') + ['', 'Exposed ', 'Weathered ', 'Oxidized '][a] + 'Copper Chest';
      const ids = {}; for (const f of [2, 0, 1, 3]) { const tex = ['copper_chest_side' + a, 'copper_chest_side' + a, 'copper_chest_top' + a, 'copper_chest_top' + a, 'copper_chest_side' + a, 'copper_chest_side' + a]; tex[[5, 0, 4, 1][f]] = 'copper_chest_front' + a;
        ids[f] = defBlock(f === 2 ? key : key + '#' + f, name, { tex, hardness: 3, mine: 'pick', tool: 'pick', tier: 0, snd: 'stone', use: 'chest', copperChest: a, waxed, hidden: f !== 2, drop: key, fam: key, st: { facing: f } }); }
      FAMILY[key] = { kind: 'facing4', props: ['facing'], ids, base: ids[2] }; } }
  // ---- copper golem statues: four poses, four ages, facing the player ----
  for (let a = 0; a < 4; a++) { ph('cg_body' + a, cgCol(a)); ph('cg_face' + a, cgCol(a)); }
  const POSES = [ // boxes in 1/16 block: legs, body, head, face plate, antenna, two arms
    (T, F) => [[5, 0, 6.5, 7.5, 4, 9.5, T], [8.5, 0, 6.5, 11, 4, 9.5, T], [4, 4, 5, 12, 10, 11, T], [4.5, 10, 4.5, 11.5, 15, 11.5, T], [5, 11, 11.5, 11, 14, 12, F], [7.5, 15, 7.5, 8.5, 16, 8.5, T], [2.5, 4.5, 7, 4, 9.5, 9, T], [12, 4.5, 7, 13.5, 9.5, 9, T]],
    (T, F) => [[5, 0, 4.5, 7.5, 4, 7.5, T], [8.5, 0, 8.5, 11, 4, 11.5, T], [4, 4, 5, 12, 10, 11, T], [4.5, 10, 4.5, 11.5, 15, 11.5, T], [5, 11, 11.5, 11, 14, 12, F], [7.5, 15, 7.5, 8.5, 16, 8.5, T], [2.5, 5, 9, 4, 9.5, 13, T], [12, 5, 3, 13.5, 9.5, 7, T]],
    (T, F) => [[5, 0, 9.5, 7.5, 2.5, 15, T], [8.5, 0, 9.5, 11, 2.5, 15, T], [4, 0, 5, 12, 6, 11, T], [4.5, 6, 4.5, 11.5, 11, 11.5, T], [5, 7, 11.5, 11, 10, 12, F], [7.5, 11, 7.5, 8.5, 12, 8.5, T], [2.5, 1, 7, 4, 6, 9, T], [12, 1, 7, 13.5, 6, 9, T]],
    (T, F) => [[3.5, 0, 6.5, 6, 4, 9.5, T], [10, 0, 6.5, 12.5, 4, 9.5, T], [4, 4, 5, 12, 10, 11, T], [4.5, 10, 4.5, 11.5, 15, 11.5, T], [5, 11, 11.5, 11, 14, 12, F], [7.5, 15, 7.5, 8.5, 16, 8.5, T], [0.5, 9, 7, 4, 10.5, 9, T], [12, 9, 7, 15.5, 10.5, 9, T]]];
  for (let a = 0; a < 4; a++) { const key = cuAge(a) + 'copper_golem_statue'; const name = ['', 'Exposed ', 'Weathered ', 'Oxidized '][a] + 'Copper Golem Statue'; const ids = {}; let base = 0;
    for (let p = 0; p < 4; p++) for (const f of [2, 3, 0, 1]) { const bs = POSES[p](TILE['cg_body' + a], TILE['cg_face' + a]).map(b => shRot(b, f)); const first = p === 0 && f === 2;
      const id = defBlock(first ? key : key + '#' + p + '_' + f, name, { tex: 'cg_body' + a, render: 'boxes', boxes: bs, rb: bs, cb: [[3, 0, 3, 13, 14, 13]], sb: [[3, 0, 3, 13, 16, 13]], shape: 'deco', opaque: false, hardness: 3, mine: 'pick', tool: 'pick', tier: 0, snd: 'stone', hidden: !first, drop: key, fam: key, st: { facing: f, pose: p }, statue: a });
      ids[f + ',' + p] = id; if (first) base = id; }
    FAMILY[key] = { kind: 'deco', props: ['facing', 'pose'], ids, base }; }
  // ---- Spring to Life plants ----
  for (const [k, n, o] of [['leaf_litter', 'Leaf Litter', { flat: 1 }], ['wildflowers', 'Wildflowers', { flat: 1 }], ['firefly_bush', 'Firefly Bush', { light: 0.13 }], ['bush', 'Bush', {}], ['cactus_flower', 'Cactus Flower', {}],
    ['short_dry_grass', 'Short Dry Grass', {}], ['tall_dry_grass', 'Tall Dry Grass', {}], ['golden_dandelion', 'Golden Dandelion', {}]]) {
    ph(k, [120, 150, 80], 0);
    if (o.flat) defBlock(k, n, { tex: k, render: 'boxes', boxes: [[0, 0, 0, 16, 1, 16]], solid: false, opaque: false, hardness: 0, snd: 'grass', carpet: true, flatIcon: true, replaceable: k === 'leaf_litter' });
    else defBlock(k, n, { tex: k, solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', plant: true, light: o.light || 0, replaceable: /grass|bush$/.test(k) && k !== 'firefly_bush', drop: /dry_grass|^bush$/.test(k) ? null : k }); }
}
function paintMobTiles() {
  const sh = (c, f) => [c[0] * f, c[1] * f, c[2] * f]; const bark = tilePixels(TILE.pale_oak_log !== undefined ? 'pale_oak_log' : 'log');
  for (const awake of [false, true]) makeTile('creaking_heart_side' + (awake ? '_awake' : ''), (set, r) => {
    // pale oak bark with darker furrows, split by a lens-shaped opening; inside, the heart: dull and dark while it
    // sleeps, glowing orange with two bright eyes when it wakes
    each((x, y) => { const p = bark(x, y); const furrow = (x * 7 + (y >> 2) * 3) % 5 === 0; set(x, y, sh(p, furrow ? 0.72 : 0.9)); });
    for (let y = 1; y < 15; y++) { const t = 1 - Math.abs(y - 7.5) / 6.8; const w = Math.max(0, Math.round(t * 3.2)); for (let x = 8 - w - 1; x <= 7 + w + 1; x++) { const edge = x === 8 - w - 1 || x === 7 + w + 1;
        if (edge) set(x, y, [58, 46, 42]); else { const c = Math.abs(x - 7.5) / (w + 0.5); set(x, y, awake ? mixc([255, 196, 90], [214, 92, 30], c) : mixc([96, 78, 70], [62, 50, 46], c)); } } }
    for (const [x, y] of [[6, 6], [9, 6]]) { set(x, y, awake ? [255, 246, 200] : [40, 32, 30]); set(x, y + 1, awake ? [255, 170, 60] : [52, 42, 38]); } });
  makeTile('creaking_heart_top', (set, r) => each((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); const ring = Math.floor(d * 1.3) % 2; set(x, y, d > 7.2 ? [104, 92, 86] : d < 2 ? [214, 110, 40] : d < 2.8 ? [90, 70, 60] : vary(ring ? [206, 196, 188] : [184, 174, 166], r, 3)); }));
  const RES = [[196, 92, 22], [228, 120, 34], [246, 156, 60], [255, 196, 110]];
  makeTile('resin_clump', (set, r) => { clear(set); for (let k = 0; k < 7; k++) { const cx = 2 + r() * 12 | 0, cy = 2 + r() * 12 | 0, R = 1 + r() * 1.6; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const d = Math.hypot(dx, dy); if (d > R) continue; set(cx + dx, cy + dy, d < 0.8 ? RES[3] : dx + dy < 0 ? RES[2] : RES[1]); } } });
  makeTile('resin_block', (set, r) => { const n = tnoise(1501, 4); each((x, y) => set(x, y, vary(RX.tone(RES, n(x, y) * 0.9), r, 4))); RX.blobs(set, r, 10, RES[3], 1); RX.blobs(set, r, 8, RES[0], 2); });
  makeTile('resin_bricks', (set, r) => brickWall(set, r, { bw: 8, bh: 4, base: RES[1], mortar: [120, 54, 14], hv: 6 }));
  makeTile('chiseled_resin_bricks', (set, r) => each((x, y) => { let c = RES[1]; if (x === 0 || y === 0) c = RES[2]; else if (x === 15 || y === 15) c = RES[0]; const dx = Math.abs(x - 7.5), dy = Math.abs(y - 7.5); if (Math.max(dx, dy) < 5.5) { c = (Math.round(dx + dy) % 3 === 0) ? RES[0] : RES[2]; if (dx < 1.2 && dy < 1.2) c = RES[3]; } set(x, y, vary(c, r, 3)); }));
  const eyeb = (open) => (set, r) => { clear(set); for (let y = 6; y < 16; y++) set(7 + ((y >> 2) & 1), y, [86, 100, 92]); for (const [x, y] of [[5, 13], [6, 12], [10, 12], [11, 11]]) set(x, y, [96, 116, 104]);
    for (let y = 1; y <= 6; y++) for (let x = 4; x <= 11; x++) { const d = Math.hypot((x - 7.5) / 3.8, (y - 3.5) / 2.6); if (d > 1) continue; set(x, y, open ? (d < 0.4 ? [255, 170, 40] : d < 0.65 ? [250, 236, 210] : [160, 150, 160]) : (y < 4 ? [110, 104, 120] : [140, 132, 148])); } };
  makeTile('open_eyeblossom', eyeb(true)); makeTile('closed_eyeblossom', eyeb(false));
  for (let h = 0; h < 4; h++) makeTile('dried_ghast_' + h, (set, r) => { const wet = h / 3; const base = mixc([168, 156, 146], [236, 236, 234], wet); each((x, y) => { let c = vary(base, r, 6); if ((x * 7 + y * 3) % 11 === 0) c = shadeC(base, 0.8 - 0.1 * (1 - wet)); if (h === 0 && (x + y * 2) % 9 === 0) c = shadeC(base, 0.7); set(x, y, c); });
    for (const [x, y] of [[4, 6], [5, 6], [10, 6], [11, 6]]) set(x, y, h === 3 ? [70, 70, 74] : [96, 88, 82]); for (let x = 6; x <= 9; x++) set(x, 10, h ? [110, 104, 104] : [90, 82, 78]); });
  for (let a = 0; a < 4; a++) { const C = cgCol(a); const cu = (x, y, r) => vary(shadeC(C, ((x * 3 + y * 5) % 7 === 0) ? 0.86 : ((x + y) % 5 === 0 ? 1.1 : 1)), r, 4);
    makeTile('copper_chest_side' + a, (set, r) => each((x, y) => set(x, y, x === 0 || x === 15 || y === 0 || y === 15 ? shadeC(C, 0.62) : y === 5 ? shadeC(C, 0.7) : cu(x, y, r))));
    makeTile('copper_chest_top' + a, (set, r) => each((x, y) => set(x, y, x === 0 || x === 15 || y === 0 || y === 15 ? shadeC(C, 0.62) : (x === 2 || x === 13 || y === 2 || y === 13) ? shadeC(C, 1.15) : cu(x, y, r))));
    makeTile('copper_chest_front' + a, (set, r) => each((x, y) => { let c = x === 0 || x === 15 || y === 0 || y === 15 ? shadeC(C, 0.62) : y === 5 ? shadeC(C, 0.7) : cu(x, y, r); if (x >= 7 && x <= 8 && y >= 4 && y <= 7) c = y === 7 ? [60, 50, 40] : [236, 220, 170]; set(x, y, c); }));
    makeTile('cg_body' + a, (set, r) => each((x, y) => set(x, y, ((x + y * 3) % 9 === 0) ? shadeC(C, 1.18) : cu(x, y, r))));
    makeTile('cg_face' + a, (set, r) => each((x, y) => { let c = cu(x, y, r); if (y >= 4 && y <= 9 && (x >= 2 && x <= 5 || x >= 10 && x <= 13)) c = [250, 236, 180]; if (y >= 12 && x >= 6 && x <= 9) c = shadeC(C, 0.7); set(x, y, c); })); }
  makeTile('leaf_litter', (set, r) => { clear(set); const LC = [[176, 108, 50], [150, 84, 40], [200, 140, 64], [130, 96, 52]]; for (let k = 0; k < 16; k++) { const cx = r() * 16 | 0, cy = r() * 16 | 0, c = LC[r() * 4 | 0]; for (const [a, b] of [[0, 0], [1, 0], [0, 1], [-1, 0], [1, 1]]) if (r() < 0.85) set(cx + a, cy + b, vary(c, r, 6)); } });
  makeTile('wildflowers', (set, r) => { clear(set); for (let k = 0; k < 9; k++) { const cx = 2 + r() * 12 | 0, cy = 2 + r() * 12 | 0; const c = [[250, 230, 90], [250, 250, 240], [240, 200, 60]][r() * 3 | 0]; set(cx, cy, [250, 170, 40]); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) set(cx + a, cy + b, c); set(cx + 1, cy + 2, [70, 130, 50]); } });
  const plant = (fn) => (set, r) => { clear(set); fn(set, r); };
  makeTile('bush', plant((set, r) => { for (let y = 4; y < 16; y++) for (let x = 1; x < 15; x++) { const d = Math.hypot((x - 7.5) / 7, (y - 10) / 6); if (d < 1 && r() < 0.85) set(x, y, vary(r() < 0.2 ? [90, 150, 60] : [64, 118, 44], r, 8)); } }));
  makeTile('firefly_bush', plant((set, r) => { for (let y = 3; y < 16; y++) for (let x = 2; x < 14; x++) { const d = Math.hypot((x - 7.5) / 6, (y - 9.5) / 6.5); if (d < 1 && r() < 0.75) set(x, y, vary([58, 96, 46], r, 7)); } for (let k = 0; k < 5; k++) set(2 + r() * 12 | 0, 2 + r() * 10 | 0, [250, 240, 120]); }));
  makeTile('cactus_flower', plant((set, r) => { for (let y = 8; y < 16; y++) { set(7, y, [80, 130, 60]); set(8, y, [70, 120, 54]); } for (let y = 2; y < 9; y++) for (let x = 3; x < 13; x++) { const d = Math.hypot((x - 7.5) / 4.5, (y - 5) / 3.4); if (d < 1) set(x, y, d < 0.35 ? [250, 220, 120] : [236, 120, 170]); } }));
  makeTile('short_dry_grass', plant((set, r) => { for (let k = 0; k < 8; k++) { const x = 2 + k * 1.6 | 0, h = 4 + r() * 5 | 0; for (let y = 15; y > 15 - h; y--) set(x + ((15 - y) > h / 2 ? (k & 1 ? 1 : -1) : 0), y, vary([206, 176, 112], r, 10)); } }));
  makeTile('tall_dry_grass', plant((set, r) => { for (let k = 0; k < 9; k++) { const x = 1 + k * 1.6 | 0, h = 9 + r() * 6 | 0; for (let y = 15; y > 15 - h; y--) set(x + ((15 - y) > h * 0.6 ? (k & 1 ? 1 : -1) : 0), y, vary(k % 3 ? [214, 186, 120] : [184, 150, 94], r, 10)); } }));
  makeTile('golden_dandelion', plant((set, r) => { for (let y = 8; y < 16; y++) set(7, y, [80, 140, 50]); set(6, 12, [80, 140, 50]); set(5, 11, [80, 140, 50]); for (let y = 3; y <= 8; y++) for (let x = 4; x <= 11; x++) { const d = Math.hypot(x - 7.5, y - 5.5); if (d < 3.3) set(x, y, d < 1.2 ? [255, 246, 170] : ((x + y) & 1) ? [255, 210, 40] : [236, 176, 20]); } }));
}
// ---- items ----
{ const MI = (key, name, o, icon) => { if (IT[key] !== undefined) { if (icon) ICONP[key] = icon; Object.assign(ITEMS[IT[key]], o || {}); return IT[key]; } const id = nid++; defItem(id, key, name, o || {}); ITEM_IDS.push(id); if (icon) ICONP[key] = icon; return id; };
  const box = (s, x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) s(x, y, typeof c === 'function' ? c(x, y) : c); };
  MI('resin_brick', 'Resin Brick', {}, (s) => { box(s, 2, 5, 13, 10, (x, y) => y === 5 ? [252, 170, 70] : y === 10 || x === 13 ? [176, 80, 20] : [230, 124, 36]); });
  for (const [c, N, rgb] of COLORDATA()) MI(c + '_harness', N + ' Harness', { kind: 'harness', stack: 1, hcol: rgb }, (s) => { box(s, 2, 4, 13, 7, (x, y) => y === 4 ? shadeC(rgb, 1.15) : rgb); box(s, 3, 8, 12, 9, [120, 76, 40]); for (const x of [4, 11]) box(s, x - 1, 10, x + 1, 12, [190, 220, 236]); box(s, 2, 2, 4, 3, [100, 64, 34]); box(s, 11, 2, 13, 3, [100, 64, 34]); });
  for (const [m, n, col, def] of [['copper', 'Copper', [214, 124, 84], 3], ['iron', 'Iron', [210, 210, 214], 5], ['golden', 'Golden', [240, 200, 60], 7], ['diamond', 'Diamond', [90, 220, 214], 11], ['netherite', 'Netherite', [76, 68, 72], 19]])
    MI(m + '_nautilus_armor', n + ' Nautilus Armor', { kind: 'nautilus_armor', stack: 1, ndef: def, ncol: col, fireproof: m === 'netherite' }, (s) => { for (let y = 3; y <= 12; y++) for (let x = 2; x <= 13; x++) { const d = Math.hypot(x - 8, y - 8); if (d > 5.8 || d < 2.3 && x > 7) continue; s(x, y, d > 4.8 ? shadeC(col, 0.7) : ((Math.atan2(y - 8, x - 8) * 3 | 0) & 1) ? col : shadeC(col, 1.2)); } });
  MI('blue_egg', 'Blue Egg', { kind: 'egg', stack: 16, eggVar: 'cold' }, (s) => { for (let y = 3; y <= 13; y++) for (let x = 4; x <= 11; x++) { const d = Math.hypot((x - 7.5) / 3.8, (y - 8.4) / (y < 8 ? 5 : 4.6)); if (d < 1) s(x, y, d > 0.85 ? [70, 110, 150] : (x < 7 && y < 8) ? [200, 230, 250] : [130, 180, 220]); } });
  MI('brown_egg', 'Brown Egg', { kind: 'egg', stack: 16, eggVar: 'warm' }, (s) => { for (let y = 3; y <= 13; y++) for (let x = 4; x <= 11; x++) { const d = Math.hypot((x - 7.5) / 3.8, (y - 8.4) / (y < 8 ? 5 : 4.6)); if (d < 1) s(x, y, d > 0.85 ? [110, 70, 40] : (x < 7 && y < 8) ? [230, 190, 150] : [190, 140, 96]); } });
  // icons for blocks that read better as a picture
  ICONP.dried_ghast = (s) => { box(s, 3, 4, 12, 13, (x, y) => ((x * 7 + y * 3) % 11 === 0) ? [140, 128, 118] : [176, 164, 152]); for (const [x, y] of [[5, 7], [6, 7], [9, 7], [10, 7]]) s(x, y, [90, 82, 76]); box(s, 6, 10, 9, 10, [100, 92, 86]); };
  for (let a = 0; a < 4; a++) ICONP[cuAge(a) + 'copper_golem_statue'] = (s) => { const C = cgCol(a); box(s, 5, 1, 10, 2, shadeC(C, 0.8)); s(7, 0, C); s(8, 0, C); box(s, 4, 3, 11, 7, C); for (const [x, y] of [[5, 5], [6, 5], [9, 5], [10, 5]]) s(x, y, [250, 236, 180]); box(s, 4, 8, 11, 12, shadeC(C, 0.9)); box(s, 2, 8, 3, 11, shadeC(C, 0.8)); box(s, 12, 8, 13, 11, shadeC(C, 0.8)); box(s, 5, 13, 6, 15, shadeC(C, 0.75)); box(s, 9, 13, 10, 15, shadeC(C, 0.75)); };
  // recipes
  const R = (o, n, shp, k) => RECIPES.push(RSH(o, n, shp, k)), L = (o, n, items) => RECIPES.push(RSL(o, n, items));
  L('resin_block', 1, Array(9).fill('resin_clump')); L('resin_clump', 9, ['resin_block']); R('resin_bricks', 1, ['RR', 'RR'], { R: 'resin_brick' }); R('chiseled_resin_bricks', 1, ['S', 'S'], { S: 'resin_brick_slab' });
  R('dried_ghast', 1, ['TTT', 'TST', 'TTT'], { T: 'ghast_tear', S: 'soul_sand' }); R('copper_chest', 1, ['CCC', 'CHC', 'CCC'], { C: 'copper_ingot', H: 'chest' });
  for (const [c] of COLORDATA()) R(c + '_harness', 1, ['LLL', 'GWG'], { L: 'leather', G: 'glass', W: c + '_wool' });
  R('golden_dandelion', 1, ['NNN', 'NDN', 'NNN'], { N: 'gold_nugget', D: 'dandelion' });
  L('orange_dye', 1, ['open_eyeblossom']); L('gray_dye', 1, ['closed_eyeblossom']); L('yellow_dye', 1, ['wildflowers']); L('pink_dye', 1, ['cactus_flower']);
  SMELT[IT.resin_clump] = IT.resin_brick;
}

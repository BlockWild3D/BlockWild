// ================= STONE FAMILIES (Minecraft) =================
// Polished granite / diorite / andesite, smooth stone, chiseled stone bricks, cut / chiseled / smooth sandstone, red
// sand and the red sandstone family, chiseled quartz, quartz pillar, quartz bricks, smooth quartz, packed mud and mud
// bricks, red / cracked / chiseled nether bricks, polished / chiseled / cracked deepslate, polished / chiseled /
// cracked polished blackstone, polished / chiseled tuff and chiseled tuff bricks, calcite, dripstone block, smooth and
// polished basalt, soul soil and crying obsidian; their stairs, slabs and walls are made in 01ab_shapes.js.
function STONEDATA() { return [
  // key, name, kind of texture, options
  ['polished_granite', 'Polished Granite', 'polished:granite'], ['polished_diorite', 'Polished Diorite', 'polished:diorite'], ['polished_andesite', 'Polished Andesite', 'polished:andesite'],
  ['smooth_stone', 'Smooth Stone', 'smooth_stone'], ['chiseled_stone_bricks', 'Chiseled Stone Bricks', 'chiseled:stone_bricks:[124,124,126]'],
  ['cut_sandstone', 'Cut Sandstone', 'cut:[214,198,150]'], ['chiseled_sandstone', 'Chiseled Sandstone', 'chiseled:sandstone:[214,198,150]'], ['smooth_sandstone', 'Smooth Sandstone', 'flat:[220,206,160]'],
  ['red_sand', 'Red Sand', 'sand:[190,102,40]', { snd: 'sand', mine: 'shovel', hardness: 0.5, tool: null, tier: 0 }],
  ['red_sandstone', 'Red Sandstone', 'sandstone:[186,100,40]', { top: 'red_sandstone_top' }], ['cut_red_sandstone', 'Cut Red Sandstone', 'cut:[186,100,40]', { top: 'red_sandstone_top' }],
  ['chiseled_red_sandstone', 'Chiseled Red Sandstone', 'chiseled:red_sandstone:[186,100,40]', { top: 'red_sandstone_top' }], ['smooth_red_sandstone', 'Smooth Red Sandstone', 'flat:[190,104,44]'],
  ['chiseled_quartz_block', 'Chiseled Quartz Block', 'chiseled:quartz:[234,228,220]'], ['quartz_pillar', 'Quartz Pillar', 'pillar:[234,228,220]', { axis: true }], ['quartz_bricks', 'Quartz Bricks', 'bricks:[234,228,220]:[200,192,184]'],
  ['smooth_quartz', 'Smooth Quartz Block', 'flat:[236,230,222]'],
  ['packed_mud', 'Packed Mud', 'packed_mud', { snd: 'grass', hardness: 1 }], ['mud_bricks', 'Mud Bricks', 'bricks:[138,104,78]:[96,74,58]', { hardness: 1.5 }],
  ['red_nether_bricks', 'Red Nether Bricks', 'bricks:[90,10,12]:[44,4,6]'], ['cracked_nether_bricks', 'Cracked Nether Bricks', 'cracked:nether_bricks'], ['chiseled_nether_bricks', 'Chiseled Nether Bricks', 'chiseled:nether_bricks:[70,32,40]'],
  ['polished_deepslate', 'Polished Deepslate', 'polished:deepslate'], ['chiseled_deepslate', 'Chiseled Deepslate', 'chiseled:deepslate:[72,72,78]'], ['cracked_deepslate_bricks', 'Cracked Deepslate Bricks', 'cracked:deepslate_bricks'], ['cracked_deepslate_tiles', 'Cracked Deepslate Tiles', 'cracked:deepslate_tiles'],
  ['polished_blackstone', 'Polished Blackstone', 'polished:blackstone'], ['chiseled_polished_blackstone', 'Chiseled Polished Blackstone', 'chiseled:blackstone:[50,44,54]'], ['cracked_polished_blackstone_bricks', 'Cracked Polished Blackstone Bricks', 'cracked:polished_blackstone_bricks'],
  ['polished_tuff', 'Polished Tuff', 'polished:tuff'], ['chiseled_tuff', 'Chiseled Tuff', 'chiseled:tuff:[100,102,94]'], ['chiseled_tuff_bricks', 'Chiseled Tuff Bricks', 'chiseled:tuff_bricks:[104,106,98]'],
  ['calcite', 'Calcite', 'calcite', { hardness: 0.75 }], ['dripstone_block', 'Dripstone Block', 'dripstone', { hardness: 1.5 }], ['smooth_basalt', 'Smooth Basalt', 'flat:[72,72,78]', { hardness: 1.25 }],
  ['polished_basalt', 'Polished Basalt', 'polished_basalt', { axis: true, hardness: 1.25 }], ['soul_soil', 'Soul Soil', 'soul_soil', { snd: 'sand', mine: 'shovel', hardness: 0.5, tool: null, tier: 0 }],
  ['crying_obsidian', 'Crying Obsidian', 'crying_obsidian', { hardness: 50, tier: 4, light: 0.65 }],
]; }
// stairs / slabs / walls for the new stones: [key prefix, material, name, walls?, slab only?]
function EXTRA_STONE_SETS() { return [
  ['polished_granite', 'polished_granite', 'Polished Granite', 0], ['polished_diorite', 'polished_diorite', 'Polished Diorite', 0], ['polished_andesite', 'polished_andesite', 'Polished Andesite', 0],
  ['smooth_stone', 'smooth_stone', 'Smooth Stone', 0, 1], ['smooth_sandstone', 'smooth_sandstone', 'Smooth Sandstone', 0], ['cut_sandstone', 'cut_sandstone', 'Cut Sandstone', 0, 1],
  ['red_sandstone', 'red_sandstone', 'Red Sandstone', 1], ['smooth_red_sandstone', 'smooth_red_sandstone', 'Smooth Red Sandstone', 0], ['cut_red_sandstone', 'cut_red_sandstone', 'Cut Red Sandstone', 0, 1],
  ['smooth_quartz', 'smooth_quartz', 'Smooth Quartz', 0], ['mud_brick', 'mud_bricks', 'Mud Brick', 1], ['red_nether_brick', 'red_nether_bricks', 'Red Nether Brick', 1],
  ['polished_deepslate', 'polished_deepslate', 'Polished Deepslate', 1], ['polished_blackstone', 'polished_blackstone', 'Polished Blackstone', 1], ['polished_tuff', 'polished_tuff', 'Polished Tuff', 1],
]; }
function defineStoneBlocks() {
  const ph = (n, c) => { if (TILE[n] === undefined) makeTile(n, (set) => each((x, y) => set(x, y, c))); return n; };
  for (const [key, name, kind, o] of STONEDATA()) { if (B[key.toUpperCase()] !== undefined) continue; const op = o || {};
    let tex = ph(key, [128, 128, 128]); if (op.top) tex = { s: key, t: ph(op.top, [200, 120, 60]) }; if (op.axis) tex = { s: key, t: ph(key + '_top', [200, 200, 200]) };
    const d = Object.assign({ tex, hardness: 1.5, tool: 'pick', tier: 1, snd: 'stone', mine: 'pick' }, op); delete d.top; delete d.axis; defBlock(key, name, d); }
  // pillars lie along the axis they are placed on
  for (const [key, , , o] of STONEDATA()) if (o && o.axis) { const base = BL[B[key.toUpperCase()]]; const top = TILE_NAME(base.texIds[2]), side = TILE_NAME(base.texIds[0]);
    FAMILY[key] = { kind: 'axis', props: ['axis'], ids: { y: base.id }, base: base.id, mat: key }; base.fam = key; base.st = { axis: 'y' };
    for (const ax of ['x', 'z']) { const o2 = Object.assign({}, base, { tex: ax === 'x' ? [top, top, side, side, side, side] : [side, side, side, side, top, top], hidden: true, drop: key, fam: key, st: { axis: ax }, uvRot: ax === 'x' ? [0, 0, 1, 1, 1, 1] : [1, 1, 0, 0, 0, 0] }); delete o2.id; delete o2.texIds; FAMILY[key].ids[ax] = defBlock(key + '#' + ax, base.name, o2); } }
}
// ---- textures (from 01bb_retex.js) ----
function tilePixels(name) { const i = TILE[name]; if (i === undefined) return () => [128, 128, 128, 255]; const d = actx.getImageData((i % ATN) * 16, Math.floor(i / ATN) * 16, 16, 16).data; return (x, y) => { const k = ((((y % 16) + 16) % 16) * 16 + (((x % 16) + 16) % 16)) * 4; return [d[k], d[k + 1], d[k + 2], d[k + 3]]; }; }
function paintStoneTiles() {
  const sh = (c, f) => [c[0] * f, c[1] * f, c[2] * f]; const parse = (s) => JSON.parse(s);
  const P = {
    polished: (src) => (set, r) => { const px = tilePixels(src); let m = [0, 0, 0]; each((x, y) => { const a = px(x, y); m[0] += a[0] / 256; m[1] += a[1] / 256; m[2] += a[2] / 256; });
      // polished stone: the stone's average colour, smooth, with soft large patches and a bevelled rim
      const n = tnoise(901 + (m[0] | 0), 4); each((x, y) => { let col = sh(m, 1.02 + (n(x, y) - 0.5) * 0.1); if (x === 0 || y === 0) col = sh(m, 1.18); else if (x === 15 || y === 15) col = sh(m, 0.72); else if (x === 1 || y === 1) col = sh(m, 1.07); set(x, y, vary(col, r, 1.5)); }); },
    smooth_stone: () => (set, r) => each((x, y) => { let c = [158, 158, 158]; if (x === 0 || y === 0 || x === 15 || y === 15) c = [116, 116, 116]; else if (x === 1 || y === 1) c = [172, 172, 172]; set(x, y, vary(c, r, 2)); }),
    flat: (c) => (set, r) => { const n = tnoise(801 + c[0], 4); each((x, y) => set(x, y, vary(sh(c, 0.96 + n(x, y) * 0.07), r, 1.5))); },
    cut: (c) => (set, r) => each((x, y) => { let col = c; const yy = y % 8; if (y === 0 || y === 15 || x === 0 || x === 15) col = sh(c, 0.8); else if (yy === 7 || yy === 0) col = sh(c, yy === 7 ? 0.84 : 1.08); else if (y < 8 ? x === 1 : x === 14) col = sh(c, 1.06); set(x, y, vary(col, r, 3)); }),
    chiseled: (src, c) => (set, r) => { const px = tilePixels(src); each((x, y) => { const a = px(x, y); set(x, y, [a[0], a[1], a[2]]); });
      // a frame and an original carved sun pattern in the middle
      for (let i = 1; i < 15; i++) { set(i, 1, sh(c, 1.18)); set(1, i, sh(c, 1.18)); set(i, 14, sh(c, 0.7)); set(14, i, sh(c, 0.7)); }
      each((x, y) => { if (x < 3 || y < 3 || x > 12 || y > 12) return; const d = Math.hypot(x - 7.5, y - 7.5); if (d < 2.1) set(x, y, sh(c, 0.62)); else if (d < 3.1) set(x, y, sh(c, 1.12)); else if (d < 4.1 && ((x + y) & 1)) set(x, y, sh(c, 0.7)); else set(x, y, vary(c, r, 3)); }); },
    sand: (c) => (set, r) => { const n = tnoise(811, 8); each((x, y) => set(x, y, vary(sh(c, 0.94 + n(x, y) * 0.1), r, 3))); RX.blobs(set, r, 18, sh(c, 1.14), 1); RX.blobs(set, r, 14, sh(c, 0.82), 1); },
    sandstone: (c) => (set, r) => { const n = tnoise(821, 4); each((x, y) => { let col = vary(sh(c, 0.95 + n(x, y) * 0.08), r, 3); if (y < 3) col = sh(col, 1.05); else if (y > 12) col = sh(col, 0.88); if (y === 3 || y === 12) col = sh(c, 0.82); set(x, y, col); }); },
    pillar: (c) => (set, r) => each((x, y) => { let col = c; if (x === 0 || x === 15) col = sh(c, 0.82); else if (x === 1 || x === 14) col = sh(c, 1.04); else if (x === 4 || x === 11) col = sh(c, 0.9); set(x, y, vary(col, r, 1.5)); }),
    bricks: (c, m) => (set, r) => brickWall(set, r, { bw: 8, bh: 4, base: c, mortar: m, hv: 6 }),
    cracked: (src) => (set, r) => { const px = tilePixels(src); each((x, y) => { const a = px(x, y); set(x, y, [a[0], a[1], a[2]]); });
      for (let k = 0; k < 3; k++) { let x = r() * 16, y = r() * 16; for (let i = 0; i < 7; i++) { const a = px(x | 0, y | 0); set(x | 0, y | 0, sh(a, 0.45)); x += (r() - 0.5) * 2; y += 1; } } },
    packed_mud: () => (set, r) => { const n = tnoise(831, 8); each((x, y) => set(x, y, vary(mixc([132, 98, 72], [158, 122, 92], n(x, y)), r, 4))); RX.blobs(set, r, 8, [110, 82, 60], 2); RX.blobs(set, r, 6, [196, 170, 110], 1); },
    calcite: () => (set, r) => { const n = tnoise(841, 4); each((x, y) => set(x, y, vary(mixc([214, 216, 212], [236, 238, 234], n(x, y)), r, 2))); RX.blobs(set, r, 10, [190, 192, 190], 2); RX.blobs(set, r, 4, [168, 170, 168], 1); },
    dripstone: () => (set, r) => { const n = tnoise(851, 8); each((x, y) => { const v = n(x * 0.5, y * 2); set(x, y, vary(v < 0.4 ? [116, 92, 76] : v > 0.7 ? [160, 130, 108] : [136, 110, 92], r, 4)); }); },
    polished_basalt: () => (set, r) => each((x, y) => { let c = [92, 92, 98]; if (x % 4 === 0) c = [66, 66, 72]; else if (x % 4 === 1) c = [112, 112, 118]; set(x, y, vary(c, r, 3)); }),
    soul_soil: () => (set, r) => { const n = tnoise(861, 4); each((x, y) => set(x, y, vary(mixc([62, 46, 36], [86, 66, 52], n(x, y)), r, 5))); for (let k = 0; k < 4; k++) { const x = 2 + r() * 12 | 0, y = 2 + r() * 12 | 0; set(x, y, [38, 26, 20]); set(x + 1, y, [38, 26, 20]); } },
    crying_obsidian: () => (set, r) => { const px = tilePixels('obsidian'); each((x, y) => { const a = px(x, y); set(x, y, [a[0], a[1], a[2]]); }); for (let k = 0; k < 6; k++) { const x = r() * 16 | 0, y0 = r() * 12 | 0; for (let i = 0; i < 2 + (r() * 4 | 0); i++) set(x, y0 + i, i === 0 ? [140, 60, 230] : [96, 30, 190]); } },
  };
  for (const [key, , kind] of STONEDATA()) { const [k, a, b2] = kind.split(':'); let p;
    if (k === 'polished') p = P.polished(a); else if (k === 'flat') p = P.flat(parse(a)); else if (k === 'cut') p = P.cut(parse(a)); else if (k === 'chiseled') p = P.chiseled(a, parse(b2));
    else if (k === 'sand') p = P.sand(parse(a)); else if (k === 'sandstone') p = P.sandstone(parse(a)); else if (k === 'pillar') p = P.pillar(parse(a)); else if (k === 'bricks') p = P.bricks(parse(a), parse(b2)); else if (k === 'cracked') p = P.cracked(a);
    else p = P[k] && P[k](); if (p) makeTile(key, p); }
  makeTile('red_sandstone_top', (set, r) => { const n = tnoise(871, 4); each((x, y) => set(x, y, vary(mixc([184, 98, 40], [204, 116, 52], n(x, y)), r, 3))); });
  makeTile('quartz_pillar_top', (set, r) => each((x, y) => { const e = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); set(x, y, vary(e > 6.6 ? [210, 202, 194] : e > 5.6 ? [244, 240, 234] : [232, 226, 218], r, 1.5)); }));
  makeTile('polished_basalt_top', (set, r) => each((x, y) => { const e = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); set(x, y, vary(e > 6.6 ? [70, 70, 76] : e > 4.6 ? [104, 104, 110] : e > 2.6 ? [86, 86, 92] : [110, 110, 116], r, 2)); }));
}
// ---- recipes and smelting (Minecraft's) ----
{ const R = (o, n, sh, k) => RECIPES.push(RSH(o, n, sh, k)); const L = (o, n, items) => RECIPES.push(RSL(o, n, items));
  for (const [p, m] of [['polished_granite', 'granite'], ['polished_diorite', 'diorite'], ['polished_andesite', 'andesite'], ['polished_deepslate', 'cobbled_deepslate'], ['polished_blackstone', 'blackstone'], ['polished_tuff', 'tuff'], ['polished_basalt', 'basalt'], ['quartz_bricks', 'quartz_block'], ['mud_bricks', 'packed_mud'], ['cut_sandstone', 'sandstone'], ['cut_red_sandstone', 'red_sandstone']]) R(p, 4, ['MM', 'MM'], { M: m });
  R('red_sandstone', 1, ['SS', 'SS'], { S: 'red_sand' }); R('quartz_pillar', 2, ['Q', 'Q'], { Q: 'quartz_block' }); R('red_nether_bricks', 1, ['NW', 'WN'], { N: 'nether_brick', W: 'nether_wart' });
  L('packed_mud', 1, ['mud', 'wheat']); R('polished_blackstone_bricks', 4, ['MM', 'MM'], { M: 'polished_blackstone' }); R('tuff_bricks', 4, ['MM', 'MM'], { M: 'polished_tuff' });
  for (const [o, slab] of [['chiseled_stone_bricks', 'stone_brick_slab'], ['chiseled_sandstone', 'sandstone_slab'], ['chiseled_red_sandstone', 'red_sandstone_slab'], ['chiseled_quartz_block', 'quartz_slab'], ['chiseled_nether_bricks', 'nether_brick_slab'], ['chiseled_deepslate', 'cobbled_deepslate_slab'], ['chiseled_polished_blackstone', 'polished_blackstone_slab'], ['chiseled_tuff', 'tuff_slab'], ['chiseled_tuff_bricks', 'tuff_brick_slab']]) R(o, 1, ['S', 'S'], { S: slab });
  const SM = (a, b) => { if (IT[a] !== undefined && IT[b] !== undefined) SMELT[IT[a]] = IT[b]; };
  SM('stone', 'smooth_stone'); SM('sandstone', 'smooth_sandstone'); SM('red_sandstone', 'smooth_red_sandstone'); SM('quartz_block', 'smooth_quartz'); SM('basalt', 'smooth_basalt'); SM('red_sand', 'glass');
  SM('stone_bricks', 'cracked_stone_bricks'); SM('nether_bricks', 'cracked_nether_bricks'); SM('deepslate_bricks', 'cracked_deepslate_bricks'); SM('deepslate_tiles', 'cracked_deepslate_tiles'); SM('polished_blackstone_bricks', 'cracked_polished_blackstone_bricks'); SM('cobbled_deepslate', 'deepslate');
}

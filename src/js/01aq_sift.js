// ================= THE SIFT: blocks, items and recipes =================
// Mojang revealed the Sift (Minecraft Live, September 2026) as a fourth dimension coming to Java and Bedrock in 2027:
// a bright, soul-rich place with pink grass, white Sift trees, spirit creatures such as the Blub, reached through the
// great portal frame in ancient cities. That is all that is public, so everything else here is BlockWild's own take:
// Sift soil, siftstone, carapace (the shell plates of "the Carapace"), soul crystals, songblooms, wisp lilies and
// sift sprouts. The Sift wood set (log, planks, leaves, sapling, stairs, door, boat...) comes from WOODDATA in
// 01aa_woods.js. Rules, world generation and the Blub: 98_sift.js.
function defineSiftBlocks() {
  const ph = (n, c, a) => { if (TILE[n] === undefined) makeTile(n, (set) => each((x, y) => set(x, y, c, a === undefined ? 255 : a))); return n; };
  defBlock('sift_grass_block', 'Sift Grass Block', { tex: { s: ph('sift_grass_side', [200, 130, 170]), t: ph('sift_grass_top', [236, 150, 196]), b: ph('sift_soil', [150, 118, 160]) }, hardness: 0.6, drop: 'sift_soil', snd: 'grass', siftSoil: true });
  defBlock('sift_soil', 'Sift Soil', { tex: 'sift_soil', hardness: 0.5, snd: 'grass', siftSoil: true });
  defBlock('siftstone', 'Siftstone', { tex: ph('siftstone', [196, 186, 206]), hardness: 1.5, tool: 'pick', tier: 1, snd: 'stone', mine: 'pick' });
  defBlock('polished_siftstone', 'Polished Siftstone', { tex: ph('polished_siftstone', [206, 198, 214]), hardness: 1.5, tool: 'pick', tier: 1, snd: 'stone', mine: 'pick' });
  defBlock('siftstone_bricks', 'Siftstone Bricks', { tex: ph('siftstone_bricks', [200, 190, 210]), hardness: 1.5, tool: 'pick', tier: 1, snd: 'stone', mine: 'pick' });
  defBlock('carapace', 'Carapace', { tex: ph('carapace', [196, 226, 222]), hardness: 2.5, tool: 'pick', tier: 1, snd: 'stone', mine: 'pick' });
  defBlock('soul_crystal_block', 'Soul Crystal Block', { tex: ph('soul_crystal_block', [120, 220, 240]), hardness: 1.2, tool: 'pick', tier: 1, snd: 'glass', mine: 'pick', light: 0.8 });
  defBlock('soul_crystal', 'Soul Crystal', { tex: ph('soul_crystal', [120, 220, 240], 0), render: 'cross', solid: false, opaque: false, hardness: 0.6, snd: 'glass', mine: 'pick', light: 0.55, drop: (r) => ['soul_shard', 1 + Math.floor(r * 2)] });
  defBlock('songbloom', 'Songbloom', { tex: ph('songbloom', [240, 120, 200], 0), solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', plant: true, light: 0.35, flower: true });
  defBlock('wisp_lily', 'Wisp Lily', { tex: ph('wisp_lily', [130, 200, 255], 0), solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', plant: true, light: 0.35, flower: true });
  defBlock('sift_sprouts', 'Sift Sprouts', { tex: ph('sift_sprouts', [236, 160, 200], 0), solid: false, opaque: false, render: 'cross', hardness: 0, snd: 'grass', plant: true, drop: null });
  // the rift: what fills an ancient city's portal frame once it is woken, and the gates that lead back
  defBlock('sift_portal', 'Sift Rift', { tex: ph('sift_portal', [60, 200, 220]), solid: false, opaque: false, render: 'portal', axis: 'x', hardness: -1, drop: null, light: 0.75, noTarget: true });
  defBlock('sift_portal_z', 'Sift Rift', { tex: 'sift_portal', solid: false, opaque: false, render: 'portal', axis: 'z', hardness: -1, drop: null, light: 0.75, noTarget: true, hidden: true });
}
function paintSiftTiles() {
  const mixd = (c, k) => c.map(v => clamp(Math.round(v * k), 0, 255));
  const PINK = [230, 146, 194], PINK_HI = [242, 170, 212], PINK_LO = [214, 126, 178];
  const SOIL = [146, 112, 156], SOIL_LO = [118, 88, 130], SOIL_HI = [172, 140, 180];
  makeTile('sift_grass_top', (set, r) => { const n = tnoise(9101, 4); each((x, y) => { const v = n(x, y); set(x, y, vary(v > 0.62 ? PINK_HI : v < 0.32 ? PINK_LO : PINK, r, 7)); }); for (let k = 0; k < 4; k++) set(r() * 16 | 0, r() * 16 | 0, [250, 200, 228]); });
  makeTile('sift_soil', (set, r) => { const n = tnoise(9102, 4); each((x, y) => { const v = n(x, y); set(x, y, vary(v > 0.66 ? SOIL_HI : v < 0.3 ? SOIL_LO : SOIL, r, 6)); }); for (let k = 0; k < 5; k++) { const x = r() * 15 | 0, y = r() * 15 | 0; set(x, y, [196, 176, 206]); set(x + 1, y, [160, 140, 172]); } });
  makeTile('sift_grass_side', (set, r) => { const n = tnoise(9102, 4); each((x, y) => { const v = n(x, y); set(x, y, vary(v > 0.66 ? SOIL_HI : v < 0.3 ? SOIL_LO : SOIL, r, 6)); });
    for (let x = 0; x < 16; x++) { const d = 3 + ((x * 7 + 3) % 5 === 0 ? 2 : (x * 3) % 4 === 0 ? 1 : 0); for (let y = 0; y < d; y++) set(x, y, vary(y === d - 1 ? PINK_LO : y === 0 ? PINK_HI : PINK, r, 6)); } });
  // siftstone: pale lilac stone with soft wavy strata
  const stoneC = (x, y, r, base) => { const w = Math.sin(x * 0.55 + y * 0.2) * 1.2 + y; const band = Math.floor(w / 4) % 3; return vary(band === 0 ? mixd(base, 1.05) : band === 1 ? base : mixd(base, 0.9), r, 6); };
  makeTile('siftstone', (set, r) => { each((x, y) => set(x, y, stoneC(x, y, r, [194, 184, 206]))); for (let k = 0; k < 4; k++) { const x = r() * 14 | 0, y = r() * 14 | 0; set(x, y, [168, 156, 184]); set(x + 1, y + 1, [168, 156, 184]); } });
  makeTile('polished_siftstone', (set, r) => each((x, y) => { const e = x === 0 || y === 0 || x === 15 || y === 15; const e2 = x === 15 || y === 15; set(x, y, vary(e2 ? [170, 160, 186] : e ? [226, 218, 234] : [206, 198, 216], r, 3)); }));
  makeTile('siftstone_bricks', (set, r) => each((x, y) => { const row = y >> 2; const off = row & 1 ? 4 : 0; const mortar = y % 4 === 3 || (x + off) % 8 === 7; const top = y % 4 === 0; set(x, y, vary(mortar ? [150, 140, 166] : top ? [218, 210, 228] : [198, 188, 210], r, 5)); }));
  // carapace: overlapping shell plates, pale teal with darker seams and a pearly shine
  makeTile('carapace', (set, r) => each((x, y) => { const row = y >> 2; const sx = (x + (row & 1) * 4) % 8; const cy = y % 4; const seam = cy === 3 || (cy >= 2 && (sx === 0 || sx === 7)); const d = Math.hypot(sx - 3.5, cy - 0.5) / 4.2;
    let c = seam ? [86, 146, 158] : mixd([160, 216, 208], 1.06 - d * 0.2); if (!seam && cy === 0 && sx > 1 && sx < 6) c = [214, 246, 238]; set(x, y, vary(c, r, 4)); }));
  makeTile('soul_crystal_block', (set, r) => each((x, y) => { const f = ((x * 3 + y * 5) % 11) / 11; const edge = (x + y) % 8 === 0 || (x - y + 16) % 8 === 0; set(x, y, vary(edge ? [220, 252, 255] : f > 0.6 ? [130, 226, 246] : f > 0.3 ? [92, 196, 230] : [70, 160, 214], r, 5)); }));
  makeTile('soul_crystal', (set, r) => { clear(set); const shard = (x0, h, w, tilt) => { for (let y = 0; y < h; y++) { const yy = 15 - y; const ww = Math.max(1, Math.round(w * (1 - y / h))); const xc = Math.round(x0 + tilt * y); for (let x = xc - (ww >> 1); x < xc - (ww >> 1) + ww; x++) set(clamp(x, 0, 15), yy, x === xc ? [226, 252, 255] : y > h * 0.6 ? [150, 236, 250] : [86, 190, 230]); } };
    shard(7, 13, 4, 0); shard(3, 8, 3, -0.15); shard(12, 9, 3, 0.15); });
  // flowers: songbloom (a pink bell with a glowing heart) and wisp lily (blue, curled petals)
  makeTile('songbloom', (set, r) => { clear(set); for (let y = 7; y < 16; y++) set(7 + (y > 12 ? 1 : 0), y, [70, 150, 120]); set(6, 12, [80, 170, 130]); set(5, 11, [80, 170, 130]); set(9, 10, [80, 170, 130]); set(10, 9, [80, 170, 130]);
    for (let y = 1; y < 8; y++) for (let x = 3; x < 13; x++) { const d = Math.hypot((x - 7.5) / (2.2 + y * 0.42), (y - 4.5) / 3.4); if (d < 1) set(x, y, d < 0.35 ? [255, 244, 252] : d < 0.6 ? [255, 176, 226] : y > 5 ? [200, 70, 160] : [236, 112, 196]); }
    set(5, 8, [220, 90, 180]); set(10, 8, [220, 90, 180]); });
  makeTile('wisp_lily', (set, r) => { clear(set); for (let y = 6; y < 16; y++) set(8 - (y > 11 ? 1 : 0), y, [60, 140, 130]); set(9, 13, [70, 160, 140]); set(10, 12, [70, 160, 140]); set(6, 11, [70, 160, 140]);
    for (const [px, py, dx] of [[4, 4, -1], [12, 4, 1], [8, 1, 0]]) for (let k = 0; k < 4; k++) { const x = px + (dx * k >> 1), y = py + (dx === 0 ? k : k >> 1); set(clamp(x, 0, 15), y, k === 0 ? [220, 246, 255] : [120, 190, 250]); set(clamp(x + (dx || 1), 0, 15), y, [80, 150, 230]); }
    set(8, 5, [255, 255, 236]); set(7, 5, [190, 236, 255]); set(8, 4, [190, 236, 255]); });
  makeTile('sift_sprouts', (set, r) => { clear(set); for (let k = 0; k < 9; k++) { const x0 = 1 + r() * 14 | 0, h = 4 + r() * 8 | 0, lean = (r() - 0.5) * 0.5; for (let y = 0; y < h; y++) set(clamp(Math.round(x0 + lean * y), 0, 15), 15 - y, y > h - 3 ? PINK_HI : y > h / 2 ? PINK : PINK_LO); } });
  makeTile('sift_leaves', (set, r) => { leafPaint(set, r, [244, 178, 216]); for (let k = 0; k < 10; k++) set(r() * 16 | 0, r() * 16 | 0, [255, 234, 246]); for (let k = 0; k < 3; k++) set(r() * 16 | 0, r() * 16 | 0, [176, 232, 255]); });
  // the rift: deep blue swirled with soul-cyan and Sift pink
  makeTile('sift_portal', (set, r) => each((x, y) => { const v = Math.sin(x * 0.8 + y * 0.35) + Math.sin(y * 0.6 - x * 0.4) * 0.9 + r() * 0.7; set(x, y, v > 1.15 ? [250, 170, 230] : v > 0.45 ? [70, 220, 236] : v > -0.4 ? [40, 110, 190] : [20, 34, 92]); }));
}
{ const MI = (key, name, o, icon) => { if (IT[key] !== undefined) { if (icon) ICONP[key] = icon; Object.assign(ITEMS[IT[key]], o || {}); return IT[key]; } const id = nid++; defItem(id, key, name, o || {}); ITEM_IDS.push(id); if (icon) ICONP[key] = icon; return id; };
  MI('soul_shard', 'Soul Shard', {}, (s) => { const P = [[7, 2], [8, 2], [6, 3], [9, 3], [5, 4], [10, 4], [5, 5], [10, 5], [5, 6], [10, 6], [6, 7], [9, 7], [6, 8], [9, 8], [7, 9], [8, 9], [7, 10], [8, 10], [7, 11]];
    for (let y = 3; y <= 10; y++) for (let x = 6; x <= 9; x++) s(x, y, (x + y) % 3 ? [100, 206, 238] : [150, 236, 250]); for (const [x, y] of P) s(x, y, [60, 150, 210]); s(7, 4, [230, 254, 255]); s(7, 5, [230, 254, 255]); s(8, 6, [200, 246, 255]); });
  const R = (o, n, shp, k) => RECIPES.push(RSH(o, n, shp, k)), L = (o, n, items) => RECIPES.push(RSL(o, n, items));
  R('polished_siftstone', 4, ['SS', 'SS'], { S: 'siftstone' }); R('siftstone_bricks', 4, ['SS', 'SS'], { S: 'polished_siftstone' });
  R('soul_crystal_block', 1, ['SS', 'SS'], { S: 'soul_shard' }); L('soul_shard', 4, ['soul_crystal_block']);
  L('pink_dye', 2, ['songbloom']); L('light_blue_dye', 2, ['wisp_lily']);
  R('soul_lantern', 1, ['NNN', 'NSN', 'NNN'], { N: 'iron_nugget', S: 'soul_shard' });
}

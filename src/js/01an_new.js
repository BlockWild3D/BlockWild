// ================= NEWER MINECRAFT BLOCKS AND ITEMS (2025-2026 drops) =================
// Chaos Cubed: sulfur and cinnabar block sets (plain, polished, bricks, chiseled; stairs / slabs / walls are made
// in 01ab_shapes.js), potent sulfur, sulfur spikes, the Bounce music disc, buckets of sulfur cube.
// Ice caves drop: icicles, ice crystals (they glow), ice balls, and the Freezing potion (45_potions / 93_caves2).
// Rules: 93_caves2.js. All textures are original procedural pixel art.
function NEW_STONES() { return [
  // key, name, painter, options
  ['sulfur', 'Sulfur', 'sulfur', { hardness: 1.5 }], ['polished_sulfur', 'Polished Sulfur', 'polished:sulfur'], ['sulfur_bricks', 'Sulfur Bricks', 'bricks:sulfur'], ['chiseled_sulfur', 'Chiseled Sulfur', 'chiseled:sulfur'],
  ['potent_sulfur', 'Potent Sulfur', 'potent_sulfur', { hardness: 1.5, potent: true }],
  ['cinnabar', 'Cinnabar', 'cinnabar', { hardness: 1.5 }], ['polished_cinnabar', 'Polished Cinnabar', 'polished:cinnabar'], ['cinnabar_bricks', 'Cinnabar Bricks', 'bricks:cinnabar'], ['chiseled_cinnabar', 'Chiseled Cinnabar', 'chiseled:cinnabar'],
]; }
const NEW_PAL = { sulfur: [[196, 168, 46], [216, 190, 62], [232, 208, 84], [244, 226, 120]], cinnabar: [[112, 28, 30], [132, 38, 36], [150, 50, 42], [170, 66, 52]] };
function defineNewBlocks() {
  const ph = (n, c, a) => { if (TILE[n] === undefined) makeTile(n, (set) => each((x, y) => set(x, y, c, a === undefined ? 255 : a))); return n; };
  for (const [key, name, , o] of NEW_STONES()) { if (B[key.toUpperCase()] !== undefined) continue; const op = Object.assign({}, o || {});
    defBlock(key, name, Object.assign({ tex: ph(key, [200, 170, 60]), hardness: 1.5, tool: 'pick', tier: 1, snd: 'stone', mine: 'pick' }, op)); }
  // sulfur spikes: standing on the floor or hanging from the ceiling; they hurt to land on
  ph('sulfur_spike', [220, 200, 70], 0); ph('sulfur_spike_hang', [220, 200, 70], 0);
  defBlock('sulfur_spike', 'Sulfur Spike', { tex: 'sulfur_spike', render: 'cross', solid: false, opaque: false, hardness: 1.5, tool: 'pick', tier: 0, mine: 'pick', snd: 'stone', spike: 'up', drop: 'sulfur_spike' });
  defBlock('sulfur_spike#hang', 'Sulfur Spike', { tex: 'sulfur_spike_hang', render: 'cross', solid: false, opaque: false, hardness: 1.5, tool: 'pick', tier: 0, mine: 'pick', snd: 'stone', spike: 'down', hidden: true, drop: 'sulfur_spike' });
  // icicles hang from ice-cave ceilings; ice crystals grow from the floor (or ceiling) and glow softly
  ph('icicle', [200, 230, 250], 0); ph('ice_crystal', [150, 220, 250], 0);
  defBlock('icicle', 'Icicle', { tex: 'icicle', render: 'cross', solid: false, opaque: false, hardness: 0.5, snd: 'glass', mine: 'pick', icicle: true, drop: null });
  defBlock('ice_crystal', 'Ice Crystal', { tex: 'ice_crystal', render: 'cross', solid: false, opaque: false, hardness: 0.5, snd: 'glass', mine: 'pick', light: 0.45, iceCrystal: true, drop: 'ice_crystal' });
}
function paintNewTiles() {
  const sh = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
  const crystal = (pal, edge, seed) => (set, r) => { const m = voronoi(r, 9); const tones = []; for (let i = 0; i < 9; i++) tones.push(pal[r() * pal.length | 0]);
    each((x, y) => { const k = y * 16 + x; if (m.d2[k] - m.d1[k] < 0.75) { set(x, y, vary(edge, r, 4)); return; } const me = m.id[k]; let c = tones[me];
      if (cid(m, x, y - 1) !== me || cid(m, x - 1, y) !== me) c = sh(c, 1.16); else if (cid(m, x, y + 1) !== me || cid(m, x + 1, y) !== me) c = sh(c, 0.82); set(x, y, vary(c, r, 3)); }); };
  makeTile('sulfur', crystal(NEW_PAL.sulfur, [150, 128, 34]));
  makeTile('cinnabar', (set, r) => { const a = tnoise(1401, 4), b = tnoise(1402, 8); const pal = NEW_PAL.cinnabar;
    each((x, y) => set(x, y, vary(RX.tone(pal, a(x, y) * 0.55 + b(x, y) * 0.45), r, 3))); RX.blobs(set, r, 14, [84, 20, 22], 2); RX.blobs(set, r, 10, [196, 92, 74], 1); RX.blobs(set, r, 4, [214, 196, 186], 1); });
  for (const m of ['sulfur', 'cinnabar']) { const P = NEW_PAL[m]; const base = P[1], hi = P[3], lo = sh(P[0], 0.8);
    makeTile('polished_' + m, (set, r) => { const n = tnoise(1411 + m.length, 4); each((x, y) => { let c = sh(base, 1 + (n(x, y) - 0.5) * 0.08); if (x === 0 || y === 0) c = sh(base, 1.2); else if (x === 15 || y === 15) c = lo; else if (x === 1 || y === 1) c = sh(base, 1.07); set(x, y, vary(c, r, 1.5)); }); });
    makeTile(m + '_bricks', (set, r) => brickWall(set, r, { bw: 8, bh: 4, base, mortar: sh(P[0], 0.6), hv: 5 }));
    makeTile('chiseled_' + m, (set, r) => { each((x, y) => { let c = base; if (x === 0 || y === 0) c = sh(base, 1.2); else if (x === 15 || y === 15) c = lo; else if (x === 2 || y === 2 || x === 13 || y === 13) c = sh(base, x === 13 || y === 13 ? 0.78 : 1.14);
      const dx = Math.abs(x - 7.5), dy = Math.abs(y - 7.5); if (x > 3 && x < 12 && y > 3 && y < 12) { const d = dx + dy; c = d < 1.5 ? hi : d < 2.6 ? sh(base, 0.7) : d < 3.6 ? sh(base, 1.12) : base; } set(x, y, vary(c, r, 2)); }); }); }
  makeTile('potent_sulfur', (set, r) => { crystal([[150, 150, 40], [170, 168, 50], [188, 184, 64]], [96, 92, 26])(set, r); for (let k = 0; k < 9; k++) { const x = 1 + r() * 14 | 0, y = 1 + r() * 14 | 0; set(x, y, [214, 240, 110]); set(x + 1, y, [180, 214, 80]); } });
  const spike = (hang) => (set, r) => { clear(set); for (let y = 0; y < 16; y++) { const t = hang ? y : 15 - y; const w = Math.max(0, Math.round((t / 15) * 3.4)); for (let x = 7 - w; x <= 8 + w; x++) { const edge = x === 7 - w || x === 8 + w; set(x, y, vary(edge ? NEW_PAL.sulfur[0] : t < 4 ? NEW_PAL.sulfur[3] : NEW_PAL.sulfur[2], r, 6)); } } };
  makeTile('sulfur_spike', spike(false)); makeTile('sulfur_spike_hang', spike(true));
  makeTile('icicle', (set, r) => { clear(set); for (let y = 0; y < 16; y++) { const w = Math.max(0, Math.round((1 - y / 15) * 2.6)); for (let x = 7 - w; x <= 8 + w; x++) set(x, y, vary(x === 7 - w ? [236, 248, 255] : [176, 214, 240], r, 5), 215); }
    for (const x0 of [3, 12]) for (let y = 0; y < 7; y++) { const w = y < 4 ? 1 : 0; for (let x = x0 - w; x <= x0; x++) set(x, y, vary([190, 224, 246], r, 5), 205); } });
  makeTile('ice_crystal', (set, r) => { clear(set); for (const [cx, h, w] of [[8, 14, 2], [4, 9, 1], [12, 10, 1]]) for (let y = 15; y > 15 - h; y--) { const t = (15 - y) / h; const ww = Math.round(w * (1 - t * 0.8)); for (let x = cx - ww - 1; x <= cx + ww; x++) set(x, y, vary(x === cx - ww - 1 ? [230, 250, 255] : t > 0.75 ? [210, 246, 255] : [110, 200, 240], r, 6), 225); } });
}
// ---- items ----
{ const MI = (key, name, o, icon) => { if (IT[key] !== undefined) { if (icon) ICONP[key] = icon; return IT[key]; } const id = nid++; defItem(id, key, name, o || {}); ITEM_IDS.push(id); if (icon) ICONP[key] = icon; return id; };
  MI('ice_ball', 'Ice Ball', { kind: 'ice_ball', stack: 16 }, (s, r) => { for (let y = 2; y <= 13; y++) for (let x = 2; x <= 13; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d > 5.6) continue; const facet = ((x * 3 + y * 5) % 7 === 0); s(x, y, d > 4.7 ? [70, 140, 190] : facet ? [236, 250, 255] : (x + y < 13 ? [176, 224, 248] : [120, 186, 228])); } });
  MI('music_disc_bounce', 'Music Disc', { kind: 'disc', stack: 1, disc: 'bounce', desc: 'Bounce' }, (s) => { for (let y = 1; y <= 14; y++) for (let x = 1; x <= 14; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d > 6.8) continue; s(x, y, d < 1 ? [10, 10, 10] : d < 3 ? [232, 206, 70] : d > 6 ? [20, 20, 22] : ((x + y) % 4 === 0 ? [56, 56, 60] : [34, 34, 38])); } });
  MI('sulfur_cube_bucket', 'Bucket of Sulfur Cube', { kind: 'cubebucket', stack: 1 }, (s) => { for (let y = 4; y <= 14; y++) { const w = 4 + (y > 6 ? 0 : 0); for (let x = 3; x <= 12; x++) { const edge = x === 3 || x === 12 || y === 14; s(x, y, edge ? [110, 110, 116] : y < 7 ? [222, 200, 70] : [190, 190, 196]); } } for (let x = 5; x <= 10; x++) for (let y = 6; y <= 9; y++) s(x, y, (x + y) & 1 ? [236, 214, 96] : [204, 180, 54]); for (let x = 4; x <= 11; x++) s(x, 3, [140, 140, 146]); });
  // block items get their own icons in the inventory: spikes, icicles and crystals show their shape
  ICONP.sulfur_spike = (s, r) => { for (let y = 1; y < 15; y++) { const w = Math.round((y / 14) * 3); for (let x = 7 - w; x <= 8 + w; x++) s(x, y, x === 7 - w ? NEW_PAL.sulfur[0] : y < 4 ? NEW_PAL.sulfur[3] : NEW_PAL.sulfur[2]); } };
  ICONP.icicle = (s) => { for (let y = 1; y < 15; y++) { const w = Math.round((1 - y / 14) * 3); for (let x = 7 - w; x <= 8 + w; x++) s(x, y, x === 7 - w ? [236, 248, 255] : [160, 206, 238]); } };
  ICONP.ice_crystal = (s) => { for (const [cx, h, w] of [[8, 13, 2], [4, 8, 1], [12, 9, 1]]) for (let y = 14; y > 14 - h; y--) { const t = (14 - y) / h; const ww = Math.round(w * (1 - t * 0.8)); for (let x = cx - ww - 1; x <= cx + ww; x++) s(x, y, x === cx - ww - 1 ? [230, 250, 255] : t > 0.75 ? [210, 246, 255] : [100, 196, 240]); } };
  // recipes: polished from the raw block, bricks from polished, chiseled from two slabs, potent sulfur from nine sulfur
  const R = (o, n, shp, k) => RECIPES.push(RSH(o, n, shp, k)), L = (o, n, items) => RECIPES.push(RSL(o, n, items));
  for (const m of ['sulfur', 'cinnabar']) { R('polished_' + m, 4, ['MM', 'MM'], { M: m }); R(m + '_bricks', 4, ['MM', 'MM'], { M: 'polished_' + m }); R('chiseled_' + m, 1, ['S', 'S'], { S: m + '_brick_slab' });
  }
  L('potent_sulfur', 1, Array(9).fill('sulfur'));
  // ice balls: from snowballs packed around ice (Mojang hasn't published the recipe; this one is a stand-in)
  R('ice_ball', 4, [' S ', 'SIS', ' S '], { S: 'snowball', I: 'ice' });
}

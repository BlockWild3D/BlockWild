// ================= OCEAN LIFE (Minecraft): kelp, seagrass, sea pickles, coral =================
// Kelp grows up through water; seagrass carpets the sea floor; sea pickles come in groups of 1-4 and glow when under
// water; tube, brain, bubble, fire and horn coral as blocks, plants, fans and wall fans, each with a dead form (coral
// dies out of water). All of these sit in water (waterlogged). Dried kelp (smelted kelp) is food.
function CORALDATA() { return [['tube', 'Tube', [48, 90, 220]], ['brain', 'Brain', [214, 90, 160]], ['bubble', 'Bubble', [160, 40, 180]], ['fire', 'Fire', [200, 40, 40]], ['horn', 'Horn', [220, 200, 60]]]; }
function defineOceanBlocks() {
  const ph = (n, c, a) => { if (TILE[n] === undefined) makeTile(n, (set) => each((x, y) => set(x, y, c, a === undefined ? 255 : a))); return n; };
  const water = { solid: false, opaque: false, hardness: 0, snd: 'grass', wlb: 1, noTarget: false };
  defBlock('kelp', 'Kelp', Object.assign({ tex: ph('kelp', [60, 120, 40], 0), render: 'cross', kelp: true, support: 'kelp', drop: 'kelp' }, water));
  defBlock('kelp_plant', 'Kelp', Object.assign({ tex: ph('kelp_plant', [60, 120, 40], 0), render: 'cross', kelp: true, support: 'kelp', drop: 'kelp', hidden: true }, water));
  defBlock('seagrass', 'Seagrass', Object.assign({ tex: ph('seagrass', [70, 140, 50], 0), render: 'cross', support: 'floor', drop: null }, water));
  for (let n = 1; n <= 4; n++) { const bs = [[6, 0, 6, 10, 6, 10], [2, 0, 2, 6, 5, 6], [10, 0, 9, 14, 7, 13], [3, 0, 10, 7, 5, 14]].slice(0, n);
    defBlock(n === 1 ? 'sea_pickle' : 'sea_pickle#' + n, 'Sea Pickle', Object.assign({ tex: ph('sea_pickle', [100, 120, 40]), render: 'boxes', boxes: bs, support: 'floor', hidden: n > 1, drop: (r) => ['sea_pickle', n], pickles: n, light: 0.35 + n * 0.15 }, water)); }
  for (const [k, N] of CORALDATA()) for (const dead of [false, true]) { const p = dead ? 'dead_' + k : k, P = dead ? 'Dead ' + N : N; const w = dead ? { solid: false, opaque: false, hardness: 0, snd: 'stone', noTarget: false } : water;
    defBlock(p + '_coral_block', P + ' Coral Block', { tex: ph(p + '_coral_block', [128, 128, 128]), hardness: 1.5, tool: 'pick', tier: 1, mine: 'pick', snd: 'stone', coralBlock: k, dead, drop: dead ? p + '_coral_block' : 'dead_' + k + '_coral_block' });
    defBlock(p + '_coral', P + ' Coral', Object.assign({ tex: ph(p + '_coral', [128, 128, 128], 0), render: 'cross', support: 'floor', coral: k, dead, drop: null }, w));
    defBlock(p + '_coral_fan', P + ' Coral Fan', Object.assign({ tex: ph(p + '_coral_fan', [128, 128, 128], 0), render: 'cross', support: 'floor', coral: k, dead, drop: null }, w));
    const fan0 = BL.length; for (const f of [0, 1, 2, 3]) defBlock(p + '_coral_wall_fan' + (f ? '#' + f : ''), P + ' Coral Wall Fan', Object.assign({ tex: p + '_coral_fan', render: 'boxes', boxes: [shRot([0, 2, 13, 16, 14, 16], (f + 2) % 4)], support: 'wall', facing: f, hidden: true, coral: k, dead, drop: null, wallFanBase: fan0 }, w));
    BL[B[(p + '_coral_fan').toUpperCase()]].wallFan = fan0; }
}
function paintOceanTiles() {
  const clear = (set) => each((x, y) => set(x, y, [0, 0, 0], 0)); const sh = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
  makeTile('kelp', (set, r) => { clear(set); for (let y = 2; y < 16; y++) { const x = 7 + Math.round(Math.sin(y * 0.6) * 1.5); set(x, y, vary([70, 130, 40], r, 8)); set(x + 1, y, vary([56, 110, 34], r, 8)); if (y % 4 === 1) { set(x - 1, y, [90, 150, 50]); set(x + 2, y + 1, [90, 150, 50]); } } });
  makeTile('kelp_plant', (set, r) => { clear(set); for (let y = 0; y < 16; y++) { const x = 7 + Math.round(Math.sin(y * 0.6) * 1.5); set(x, y, vary([70, 130, 40], r, 8)); set(x + 1, y, vary([56, 110, 34], r, 8)); if (y % 4 === 1) { set(x - 1, y, [90, 150, 50]); set(x - 2, y, [80, 140, 46]); } if (y % 4 === 3) { set(x + 2, y, [90, 150, 50]); set(x + 3, y, [80, 140, 46]); } } });
  makeTile('seagrass', (set, r) => { clear(set); for (const x0 of [3, 6, 9, 12]) { const top = 2 + (r() * 6 | 0); for (let y = top; y < 16; y++) set(x0 + ((y >> 2) & 1), y, vary([64, 140, 52], r, 10)); } });
  makeTile('sea_pickle', (set, r) => each((x, y) => set(x, y, vary(y < 3 ? [150, 170, 70] : (x + y) % 4 === 0 ? [80, 100, 30] : [104, 124, 44], r, 6))));
  for (const [k, , c] of CORALDATA()) for (const dead of [false, true]) { const col = dead ? [140, 132, 128] : c; const p = dead ? 'dead_' + k : k;
    makeTile(p + '_coral_block', (set, r) => { const n = tnoise(971 + k.length, 4); each((x, y) => set(x, y, vary(sh(col, 0.86 + n(x, y) * 0.2), r, 6))); for (let i = 0; i < 18; i++) set(r() * 16 | 0, r() * 16 | 0, sh(col, k === 'brain' ? 0.7 : 1.25)); });
    makeTile(p + '_coral', (set, r) => { clear(set); const br = (x, y, dx, n) => { for (let i = 0; i < n; i++) { set(x, y - i, vary(col, r, 10)); if (i % 3 === 2) x += dx; } return [x, y - n]; }; br(7, 15, 0, 6); br(7, 10, -1, 6); br(8, 10, 1, 7); br(6, 12, -1, 4); br(9, 12, 1, 5); for (const [x, y] of [[4, 3], [11, 2], [7, 4]]) { set(x, y, sh(col, 1.25)); set(x + 1, y, sh(col, 1.25)); } });
    makeTile(p + '_coral_fan', (set, r) => { clear(set); for (let y = 2; y < 16; y++) { const w = Math.round((16 - y) * 0.45); for (let x = 8 - w; x <= 7 + w; x++) if ((x + y) % 3 || y > 12) set(x, y, vary(y > 12 ? sh(col, 0.8) : col, r, 10)); } });
  }
}
// ---- items, recipes ----
{ const id = nid++; defItem(id, 'dried_kelp', 'Dried Kelp', { kind: 'food' }); ITEM_IDS.push(id); ICONP.dried_kelp = (s) => { for (let y = 3; y <= 13; y++) { s(6 + (y & 1), y, [70, 80, 40]); s(8 + (y & 1), y, [56, 64, 32]); s(7 + (y & 1), y, [86, 98, 50]); } };
  SMELT[IT.kelp] = IT.dried_kelp; RECIPES.push(RSH('dried_kelp_block', 1, ['KKK', 'KKK', 'KKK'], { K: 'dried_kelp' }), RSL('dried_kelp', 9, ['dried_kelp_block'])); FUEL.dried_kelp_block = 200;
  SMELT[IT.sea_pickle] = IT.lime_dye; }

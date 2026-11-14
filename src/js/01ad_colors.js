// ================= THE 16 COLOURS (Minecraft) =================
// Dyes; wool, carpets, terracotta, glazed terracotta (turned the way you place it), concrete and concrete powder
// (falls like sand, sets into concrete when it touches water), stained glass and panes (see-through, tinted), beds and
// shulker boxes in every colour; plain terracotta and clay blocks. Badlands (red sand, terracotta bands) in 76_colors.js.
function COLORDATA() { return [
  // key, name, wool, concrete, terracotta
  ['white', 'White', [234, 236, 237], [207, 213, 214], [210, 178, 161]], ['orange', 'Orange', [241, 118, 20], [224, 97, 1], [162, 84, 38]],
  ['magenta', 'Magenta', [190, 69, 180], [169, 48, 159], [150, 88, 109]], ['light_blue', 'Light Blue', [58, 175, 217], [36, 137, 199], [113, 109, 138]],
  ['yellow', 'Yellow', [249, 198, 40], [241, 175, 21], [186, 133, 35]], ['lime', 'Lime', [112, 185, 26], [94, 169, 24], [104, 118, 53]],
  ['pink', 'Pink', [238, 141, 172], [214, 101, 143], [162, 78, 79]], ['gray', 'Gray', [63, 68, 72], [55, 58, 62], [58, 42, 36]],
  ['light_gray', 'Light Gray', [142, 142, 135], [125, 125, 115], [135, 107, 98]], ['cyan', 'Cyan', [21, 138, 145], [21, 119, 136], [87, 91, 91]],
  ['purple', 'Purple', [122, 42, 173], [100, 32, 156], [118, 70, 86]], ['blue', 'Blue', [53, 57, 157], [45, 47, 143], [74, 60, 91]],
  ['brown', 'Brown', [114, 72, 41], [96, 60, 32], [77, 51, 36]], ['green', 'Green', [85, 110, 28], [73, 91, 36], [76, 83, 42]],
  ['red', 'Red', [161, 39, 35], [142, 33, 33], [143, 61, 47]], ['black', 'Black', [21, 21, 26], [8, 10, 15], [37, 23, 16]],
]; }
function defineColorBlocks() {
  const ph = (n, c) => { if (TILE[n] === undefined) makeTile(n, (set) => each((x, y) => set(x, y, c))); return n; };
  const clone = (d) => { const o = Object.assign({}, d); delete o.id; delete o.key; delete o.texIds; return o; };
  const W = BL[B.WOOL]; if (W) W.name = 'White Wool';
  defBlock('terracotta', 'Terracotta', { tex: ph('terracotta', [152, 94, 68]), hardness: 1.25, tool: 'pick', tier: 1, mine: 'pick' });
  defBlock('clay', 'Clay', { tex: ph('clay', [160, 166, 179]), hardness: 0.6, snd: 'grass', mine: 'shovel', drop: (r) => ['clay_ball', 4] });
  for (const [c, N, wc, cc, tc] of COLORDATA()) {
    const wool = c === 'white' ? 'wool' : c + '_wool';
    if (c !== 'white') defBlock(wool, N + ' Wool', { tex: ph(c + '_wool', wc), hardness: 0.8, snd: 'wool' });
    defBlock(c + '_carpet', N + ' Carpet', { tex: TILE_NAME(BL[B[wool.toUpperCase()]].texIds[0]), render: 'boxes', boxes: [[0, 0, 0, 16, 1, 16]], solid: false, opaque: false, hardness: 0.1, snd: 'wool', carpet: true });
    defBlock(c + '_terracotta', N + ' Terracotta', { tex: ph(c + '_terracotta', tc), hardness: 1.25, tool: 'pick', tier: 1, mine: 'pick' });
    const gk = c + '_glazed_terracotta'; const gt = ph(gk, tc);
    const g0 = defBlock(gk, N + ' Glazed Terracotta', { tex: gt, hardness: 1.4, tool: 'pick', tier: 1, mine: 'pick' });
    FAMILY[gk] = { kind: 'glazed', props: ['facing'], ids: { 0: g0 }, base: g0, mat: gk }; BL[g0].fam = gk; BL[g0].st = { facing: 0 };
    for (const f of [1, 2, 3]) { const o = Object.assign(clone(BL[g0]), { hidden: true, drop: gk, fam: gk, st: { facing: f }, uvRot: [0, 0, f, (4 - f) & 3, 0, 0], tex: gt }); delete o.id; delete o.texIds; FAMILY[gk].ids[f] = defBlock(gk + '#' + f, BL[g0].name, o); }
    defBlock(c + '_concrete', N + ' Concrete', { tex: ph(c + '_concrete', cc), hardness: 1.8, tool: 'pick', tier: 1, mine: 'pick' });
    defBlock(c + '_concrete_powder', N + ' Concrete Powder', { tex: ph(c + '_concrete_powder', cc), hardness: 0.5, snd: 'sand', mine: 'shovel', fall: true, hardensTo: c + '_concrete' });
    defBlock(c + '_stained_glass', N + ' Stained Glass', { tex: ph(c + '_stained_glass', wc), opaque: false, render: 'cube', cullSame: true, translucent: true, hardness: 0.3, snd: 'glass', drop: null });
    if (c !== 'red') { // the red bed is the original "bed"
      const h = defBlock('bed_head_' + c, N + ' Bed', Object.assign(clone(BL[B.BED_HEAD]), { tex: { s: ph('bed_side_' + c, wc), t: ph('bed_head_top_' + c, wc), b: 'planks' }, drop: c + '_bed', hidden: true }));
      const f = defBlock('bed_foot_' + c, N + ' Bed', Object.assign(clone(BL[B.BED_FOOT]), { tex: { s: 'bed_side_' + c, t: ph('bed_foot_top_' + c, wc), b: 'planks' }, drop: null, hidden: true }));
      for (const id of [h, f]) { delete BL[id].fam; } BL[h].bedPart = 'head'; BL[f].bedPart = 'foot'; BL[h].bedPair = f; BL[f].bedPair = h; BL[h].bedItem = BL[f].bedItem = c + '_bed';
    }
    if (B.SHULKER_BOX !== undefined) { const sb = BL[B.SHULKER_BOX]; const tops = sb.tex; defBlock(c + '_shulker_box', N + ' Shulker Box', Object.assign(clone(sb), { tex: { s: ph('shulker_side_' + c, wc), t: ph('shulker_top_' + c, wc) }, drop: null, hidden: false })); }
  }
  // the original red bed and plain shulker box get the same markers
  const bh = BL[B.BED_HEAD], bf = BL[B.BED_FOOT]; bh.bedPart = 'head'; bf.bedPart = 'foot'; bh.bedPair = B.BED_FOOT; bf.bedPair = B.BED_HEAD; bh.bedItem = bf.bedItem = 'bed'; bh.name = bf.name = 'Red Bed';
  for (const d of BL) if (d && /shulker_box$/.test(d.key)) d.shulker = true;
}
// ---- textures (from 01bb_retex.js) ----
function paintColorTiles() {
  const sh = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
  makeTile('terracotta', (set, r) => { const n = tnoise(901, 4); each((x, y) => set(x, y, vary(sh([152, 94, 68], 0.96 + n(x, y) * 0.07), r, 3))); RX.blobs(set, r, 6, [138, 84, 60], 1); });
  makeTile('clay', (set, r) => { const n = tnoise(902, 4); each((x, y) => set(x, y, vary(mixc([150, 156, 170], [170, 176, 190], n(x, y)), r, 3))); RX.blobs(set, r, 8, [136, 142, 156], 2); });
  const woolPx = tilePixels('wool'), bedSide = tilePixels('bed_side'), bedHead = tilePixels('bed_head_top'), bedFoot = tilePixels('bed_foot_top');
  const shulkerS = tilePixels(TILE_NAME(BL[B.SHULKER_BOX].texIds[0])), shulkerT = tilePixels(TILE_NAME(BL[B.SHULKER_BOX].texIds[2]));
  // recolour: keep each pixel's lightness, take the new colour
  const lum = (p) => (p[0] * 0.3 + p[1] * 0.59 + p[2] * 0.11) / 255;
  const tint = (px, col, test, base) => (set) => each((x, y) => { const p = px(x, y); if (p[3] < 128) { set(x, y, [0, 0, 0], 0); return; } if (test && !test(p)) { set(x, y, [p[0], p[1], p[2]]); return; } const f = lum(p) / base; set(x, y, sh(col, f)); });
  const reddish = (p) => p[0] > p[1] + 40 && p[0] > p[2] + 40;
  const purpleish = (p) => p[0] > p[1] + 10 && p[2] > p[1] + 10;
  COLORDATA().forEach(([c, N, wc, cc, tc], idx) => {
    if (c !== 'white') makeTile(c + '_wool', tint(woolPx, wc, null, 0.88));
    makeTile(c + '_terracotta', (set, r) => { const n = tnoise(910 + idx, 4); each((x, y) => set(x, y, vary(sh(tc, 0.95 + n(x, y) * 0.09), r, 3))); RX.blobs(set, r, 6, sh(tc, 0.88), 1); });
    makeTile(c + '_glazed_terracotta', (set, r) => glazedPaint(set, r, tc, wc, idx));
    makeTile(c + '_concrete', (set, r) => { const n = tnoise(930 + idx, 8); each((x, y) => set(x, y, vary(sh(cc, 0.97 + n(x, y) * 0.05), r, 1.5))); });
    makeTile(c + '_concrete_powder', (set, r) => { each((x, y) => set(x, y, vary(sh(cc, 1.08), r, 9))); RX.blobs(set, r, 20, sh(cc, 1.25), 1); RX.blobs(set, r, 16, sh(cc, 0.85), 1); });
    makeTile(c + '_stained_glass', (set, r) => each((x, y) => { const e = x === 0 || y === 0 || x === 15 || y === 15; const streak = (x + y === 6 || x + y === 7 || x + y === 21) && !e; set(x, y, e ? sh(wc, 0.8) : streak ? mixc(wc, [255, 255, 255], 0.45) : wc, e ? 235 : streak ? 170 : 115); }));
    if (c !== 'red') { makeTile('bed_side_' + c, tint(bedSide, wc, reddish, 0.38)); makeTile('bed_head_top_' + c, tint(bedHead, wc, reddish, 0.38)); makeTile('bed_foot_top_' + c, tint(bedFoot, wc, reddish, 0.38)); }
    makeTile('shulker_side_' + c, tint(shulkerS, wc, purpleish, 0.5)); makeTile('shulker_top_' + c, tint(shulkerT, wc, purpleish, 0.5));
  });
}
// glazed terracotta: an original, lopsided pattern per colour so tiles can be turned to make bigger patterns
function glazedPaint(set, r, tc, wc, idx) {
  const rr = mulberry32(4441 + idx * 977); const light = mixc(wc, [255, 255, 255], 0.5), dark = [tc[0] * 0.55, tc[1] * 0.55, tc[2] * 0.55], mid = mixc(tc, wc, 0.5), acc = idx % 3 === 0 ? [240, 236, 220] : idx % 3 === 1 ? [40, 34, 40] : mixc(wc, [255, 255, 255], 0.2);
  const kind = idx % 4; each((x, y) => set(x, y, mid));
  each((x, y) => {
    const u = x + 0.5, v = y + 0.5; let c = null;
    if (kind === 0) { const d = Math.hypot(u, v); if (d < 5) c = light; else if (d < 6.5) c = dark; else if (Math.abs(u - v) < 1.2) c = acc; else if (Math.hypot(16 - u, 16 - v) < 4) c = dark; }
    else if (kind === 1) { if ((x >> 2) === (y >> 2)) c = light; else if (x === 15 - y || x === 14 - y) c = dark; else if (x < 4 && y > 11) c = acc; }
    else if (kind === 2) { const d = Math.max(Math.abs(u - 4), Math.abs(v - 12)); if (d < 2.5) c = acc; else if (d < 4) c = dark; else if (y < 3 || x > 12) c = light; else if ((x + y * 2) % 7 === 0) c = dark; }
    else { const a = Math.atan2(v - 8, u - 8), d = Math.hypot(u - 8, v - 8); if (d < 7.5 && Math.sin(a * 3 + d * 0.9) > 0.35) c = light; else if (d < 2) c = dark; else if (x === 0 || y === 0) c = acc; }
    if (c) set(x, y, c);
  });
  for (let k = 0; k < 10; k++) { const x = rr() * 16 | 0, y = rr() * 16 | 0; set(x, y, dark); }
  each((x, y) => { if (x === 15 || y === 15) set(x, y, dark); });
}

// ---- dyes (items) ----
const DYE_SRC = {}; for (const [c, N, wc] of COLORDATA()) { const id = nid++; defItem(id, c + '_dye', N + ' Dye', { kind: 'mat', dye: c }); ITEM_IDS.push(id);
  ICONP[c + '_dye'] = (s, r) => { const col = wc, dk = [wc[0] * 0.6, wc[1] * 0.6, wc[2] * 0.6], hi = mixc(wc, [255, 255, 255], 0.45);
    for (let y = 4; y <= 13; y++) for (let x = 3; x <= 12; x++) { const d = Math.hypot((x - 7.5) / 4.6, (y - 9) / 4.4); if (d > 1) continue; s(x, y, d > 0.82 ? dk : (x < 7 && y < 8) ? hi : col); }
    for (const [x, y] of [[7, 3], [8, 3], [7, 2], [9, 4], [6, 4]]) s(x, y, dk); s(6, 6, [255, 255, 255]); }; }
// beds of every colour (the red one is the original "bed")
function bedIcon(wc) { return (s) => { const dk = [wc[0] * 0.7, wc[1] * 0.7, wc[2] * 0.7]; for (let x = 1; x <= 14; x++) { for (let y = 7; y <= 10; y++) s(x, y, y === 7 ? mixc(wc, [255, 255, 255], 0.25) : y === 10 ? dk : wc); s(x, 11, [150, 112, 66]); } for (let x = 1; x <= 4; x++) for (let y = 5; y <= 7; y++) s(x, y, [236, 236, 236]); for (const x of [1, 2, 13, 14]) s(x, 12, [110, 80, 46]); }; }
for (const [c, N, wc] of COLORDATA()) { if (c === 'red') continue; const id = nid++; defItem(id, c + '_bed', N + ' Bed', { kind: 'bed', stack: 1, bedColor: c }); ITEM_IDS.push(id); ICONP[c + '_bed'] = bedIcon(wc); }
if (IT.bed !== undefined) { ITEMS[IT.bed].name = 'Red Bed'; ITEMS[IT.bed].bedColor = 'red'; }
// recipes
{ const R = (o, n, sh, k) => RECIPES.push(RSH(o, n, sh, k)); const L = (o, n, items) => RECIPES.push(RSL(o, n, items));
  GROUPS['#wool'] = COLORDATA().map(([c]) => c === 'white' ? 'wool' : c + '_wool');
  for (const [a, b] of [['rose', 'red_dye'], ['dandelion', 'yellow_dye'], ['bone_meal', 'white_dye'], ['ink_sac', 'black_dye'], ['cocoa_beans', 'brown_dye'], ['lapis_lazuli', 'blue_dye']]) if (IT[a] !== undefined) L(b, 1, [a]);
  for (const [o, a, b, n] of [['orange_dye', 'red_dye', 'yellow_dye', 2], ['pink_dye', 'red_dye', 'white_dye', 2], ['lime_dye', 'green_dye', 'white_dye', 2], ['light_blue_dye', 'blue_dye', 'white_dye', 2], ['cyan_dye', 'blue_dye', 'green_dye', 2], ['purple_dye', 'red_dye', 'blue_dye', 2], ['magenta_dye', 'purple_dye', 'pink_dye', 2], ['gray_dye', 'black_dye', 'white_dye', 2], ['light_gray_dye', 'gray_dye', 'white_dye', 2]]) L(o, n, [a, b]);
  L('light_gray_dye', 3, ['black_dye', 'white_dye', 'white_dye']);
  if (IT.cactus !== undefined) SMELT[IT.cactus] = IT.green_dye; SMELT[IT.clay] = IT.terracotta;
  R('clay', 1, ['CC', 'CC'], { C: 'clay_ball' });
  for (const [c] of COLORDATA()) { const wool = c === 'white' ? 'wool' : c + '_wool'; const dye = c + '_dye';
    if (c !== 'white') L(wool, 1, ['#wool', dye]);
    R(c + '_carpet', 3, ['WW'], { W: '=' + wool });
    R(c + '_terracotta', 8, ['TTT', 'TDT', 'TTT'], { T: 'terracotta', D: dye }); SMELT[IT[c + '_terracotta']] = IT[c + '_glazed_terracotta'];
    L(c + '_concrete_powder', 8, [dye, 'sand', 'sand', 'sand', 'sand', 'gravel', 'gravel', 'gravel', 'gravel']);
    R(c + '_stained_glass', 8, ['GGG', 'GDG', 'GGG'], { G: 'glass', D: dye });
    R(c === 'red' ? 'bed' : c + '_bed', 1, ['WWW', 'PPP'], { W: '=' + wool, P: 'planks' });
    if (IT.shulker_box !== undefined) L(c + '_shulker_box', 1, ['shulker_box', dye]);
  }
  // the old recipe made a (red) bed from any wool: now each colour of wool makes its own bed
  { const i = RECIPES.findIndex(r => r.out[0] === 'bed' && r.key && r.key.W === 'wool'); if (i >= 0) RECIPES.splice(i, 1); }
  for (const [c] of COLORDATA()) FUEL[c === 'white' ? 'wool' : c + '_wool'] = 5; for (const [c] of COLORDATA()) FUEL[c + '_carpet'] = 3.35;
}

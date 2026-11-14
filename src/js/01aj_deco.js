// ================= DECORATION BLOCKS (Minecraft) =================
// Lanterns and soul lanterns (standing or hanging), chains, campfires and soul campfires, soul torches, bells,
// scaffolding, flower pots with every small plant, mob heads (floor and wall), cakes with candles, candles in 17
// colours (1-4 per block, lit or not), lodestones, respawn anchors, conduits, chiseled bookshelves, decorated pots,
// beehives and bee nests, honey bottles. Run-time rules are in 82_deco.js. Original pixel art.
function defineDecoBlocks() {
  const ph = (n, c, a) => { if (TILE[n] === undefined) makeTile(n, (set) => each((x, y) => set(x, y, c, a === undefined ? 255 : a))); return n; };
  const strip = (o) => { delete o.id; delete o.key; delete o.texIds; return o; };
  const DV = [[0, -1], [1, 0], [0, 1], [-1, 0]]; const F46 = [5, 0, 4, 1]; // four-way facing -> the mesh face that looks that way
  // a family: one block per combination of props; the first is the item, the rest are hidden and drop it
  const fam = (key, name, props, mk, kind) => { const names = Object.keys(props); const F = FAMILY[key] = { kind: kind || 'deco', props: names, ids: {}, base: 0, mat: key };
    let combos = [{}]; for (const p of names) { const next = []; for (const c of combos) for (const v of props[p]) next.push(Object.assign({}, c, { [p]: v })); combos = next; }
    combos.forEach((st, i) => { const o = mk(st); if (!o) return; o.fam = key; o.st = st; if (o.hidden === undefined) o.hidden = i > 0; if (o.drop === undefined) o.drop = key; if (!o.shape) o.shape = 'deco'; if (o.boxes && !o.rb) o.rb = o.boxes; if (o.boxes && !o.cb) o.cb = o.boxes; if (o.boxes && !o.sb) o.sb = o.boxes;
      const id = defBlock(i === 0 ? key : key + '#' + names.map(p => st[p]).join('_'), name, o); F.ids[names.map(p => st[p]).join(',')] = id; if (i === 0) F.base = id; }); return F; };
  // ---- lanterns ----
  for (const [k, n, light] of [['lantern', 'Lantern', 1], ['soul_lantern', 'Soul Lantern', 0.67]]) { ph(k + '_body', [200, 160, 80]); ph('lantern_cap', [60, 60, 66]);
    fam(k, n, { hanging: [0, 1] }, (st) => { const h = st.hanging ? 1 : 0; const bs = [[5, h, 5, 11, 7 + h, 11, TILE[k + '_body']], [6, 7 + h, 6, 10, 9 + h, 10, TILE.lantern_cap]]; if (h) bs.push([7, 10, 7.5, 9, 16, 8.5, TILE.lantern_cap], [7.5, 10, 7, 8.5, 16, 9, TILE.lantern_cap]); else bs.push([7, 9, 7.5, 9, 11, 8.5, TILE.lantern_cap]);
      return { tex: 'lantern_cap', render: 'boxes', boxes: bs, cb: [[5, h, 5, 11, 9 + h, 11]], sb: [[5, h, 5, 11, 9 + h, 11]], opaque: false, solid: true, hardness: 3.5, mine: 'pick', snd: 'metal', light, lantern: true, support: 'lantern' }; }); }
  // ---- chains ----
  ph('chain', [70, 72, 80], 0);
  fam('chain', 'Chain', { axis: ['y', 'x', 'z'] }, (st) => { const b = st.axis === 'y' ? [6.5, 0, 6.5, 9.5, 16, 9.5] : st.axis === 'x' ? [0, 6.5, 6.5, 16, 9.5, 9.5] : [6.5, 6.5, 0, 9.5, 9.5, 16];
    return { tex: 'chain', render: 'boxes', boxes: [b], opaque: false, solid: true, hardness: 5, mine: 'pick', tool: 'pick', tier: 1, snd: 'metal', uvRot: st.axis === 'y' ? null : uvRotToward(st.axis === 'x' ? [1, 0, 0] : [0, 0, 1]) }; }, 'axis');
  // ---- campfires: four logs and a fire, facing four ways ----
  for (const [k, n, light, fire] of [['campfire', 'Campfire', 1, 'campfire_fire'], ['soul_campfire', 'Soul Campfire', 0.67, 'soul_campfire_fire']]) { ph('campfire_log', [110, 80, 50]); ph(k + '_log_lit', [150, 90, 40]); ph(fire, [250, 170, 40], 0); ph('campfire_ash', [80, 76, 72]);
    fam(k, n, { facing: [2, 3, 0, 1], lit: [1, 0] }, (st) => { const logL = TILE[st.lit ? k + '_log_lit' : 'campfire_log'];
      let bs = [[1, 0, 0, 5, 4, 16, TILE.campfire_log], [11, 0, 0, 15, 4, 16, TILE.campfire_log], [0, 3, 1, 16, 7, 5, logL], [0, 3, 11, 16, 7, 15, logL], [5, 0, 0, 11, 1, 16, TILE.campfire_ash]];
      if (st.lit) bs.push([0, 1, 8, 16, 15, 8.02, TILE[fire]], [8, 1, 0, 8.02, 15, 16, TILE[fire]]); bs = bs.map(b => shRot(b, st.facing));
      return { tex: 'campfire_log', render: 'boxes', boxes: bs, cb: [[0, 0, 0, 16, 7, 16]], sb: [[0, 0, 0, 16, 7, 16]], opaque: false, solid: true, hardness: 2, mine: 'axe', snd: 'wood', light: st.lit ? light : 0, campfire: k, drop: k === 'campfire' ? () => ['charcoal', 2] : 'soul_soil' }; }); }
  // ---- soul torch ----
  ph('soul_torch', [90, 200, 220], 0); defBlock('soul_torch', 'Soul Torch', strip(Object.assign({}, BL[B.TORCH], { tex: 'soul_torch', light: 0.67, drop: 'soul_torch' })));
  // ---- bell: two stone posts, a bar and the bell ----
  ph('bell_body', [230, 190, 60]); ph('bell_bar', [90, 80, 70]);
  fam('bell', 'Bell', { facing: [0, 1, 2, 3] }, (st) => { const bs = [[2, 0, 6, 4, 16, 10, TILE.stone], [12, 0, 6, 14, 16, 10, TILE.stone], [4, 13, 7, 12, 15, 9, TILE.bell_bar], [5, 6, 5, 11, 13, 11, TILE.bell_body], [4, 4, 4, 12, 6, 12, TILE.bell_body]].map(b => shRot(b, st.facing));
    return { tex: 'bell_body', render: 'boxes', boxes: bs, cb: [[0, 0, 0, 16, 16, 16]].map(b => b), sb: bs, opaque: false, solid: true, hardness: 5, mine: 'pick', snd: 'metal', bell: true, support: 'floor' }; });
  // ---- scaffolding: distance 0-7 from a supported column ----
  ph('scaffolding_top', [200, 170, 90], 0); ph('scaffolding_side', [200, 170, 90], 0);
  fam('scaffolding', 'Scaffolding', { distance: [0, 1, 2, 3, 4, 5, 6, 7], bottom: [0, 1] }, (st) => { const bs = [[0, 14, 0, 16, 16, 16, TILE.scaffolding_top], [0, 0, 0, 2, 14, 2], [14, 0, 0, 16, 14, 2], [0, 0, 14, 2, 14, 16], [14, 0, 14, 16, 14, 16]];
      if (st.bottom) bs.push([0, 0, 0, 16, 2, 2], [0, 0, 14, 16, 2, 16], [0, 0, 2, 2, 2, 14], [14, 0, 2, 16, 2, 14]);
      return { tex: 'scaffolding_side', render: 'boxes', boxes: bs, cb: [[0, 14, 0, 16, 16, 16]], sb: [[0, 0, 0, 16, 16, 16]], opaque: false, solid: true, hardness: 0, snd: 'scaffold', climb: true, scaffold: true, mine: 'axe' }; });
  // ---- flower pots ----
  ph('flower_pot', [150, 80, 60]); const pot = [[5, 0, 5, 11, 6, 11, TILE.flower_pot], [6, 4.9, 6, 10, 5, 10, TILE.dirt]];
  defBlock('flower_pot', 'Flower Pot', { tex: 'flower_pot', render: 'boxes', boxes: pot.slice(0, 1).concat([[6, 5, 6, 10, 5.5, 10, TILE.dirt]]), rb: pot, cb: [[5, 0, 5, 11, 6, 11]], sb: [[5, 0, 5, 11, 6, 11]], shape: 'deco', opaque: false, solid: true, hardness: 0, snd: 'stone', pot: true, support: 'floor' });
  BL[B.FLOWER_POT].boxes = BL[B.FLOWER_POT].rb = [[5, 0, 5, 11, 6, 11, TILE.flower_pot], [6, 4, 6, 10, 4.1, 10, TILE.dirt]];
  const plants = ['dandelion', 'rose', 'poppy', ...FLOWERDATA().map(f => f[0]), ...WOODDATA().map(w => w.sap).filter(Boolean), 'fern', 'dead_bush', 'brown_mushroom', 'red_mushroom', 'crimson_fungus', 'warped_fungus', 'crimson_roots', 'warped_roots', 'azalea', 'flowering_azalea', 'cactus', 'bamboo', 'mangrove_propagule'];
  const seen = new Set(); const POTTED = defineDecoBlocks.potted = [];
  for (const pk of plants) { const pid = B[pk.toUpperCase()]; if (pid === undefined || seen.has(pk)) continue; const pd = BL[pid]; if (!pd || !pd.texIds) continue; seen.add(pk);
    let bs; if (pk === 'cactus') bs = [[6, 4, 6, 10, 16, 10, TILE.cactus_side !== undefined ? TILE.cactus_side : pd.texIds[0]]];
    else if (pk === 'azalea' || pk === 'flowering_azalea') bs = [[4, 6, 4, 12, 14, 12, pd.texIds[2]], [7, 4, 7, 9, 6, 9, TILE.log_side]];
    else if (pd.render === 'cross' || pk === 'bamboo') { const t = pd.texIds[0]; bs = [[2.5, 4, 8, 13.5, 16, 8.02, t], [8, 4, 2.5, 8.02, 16, 13.5, t]]; } else continue;
    const all = [[5, 0, 5, 11, 6, 11, TILE.flower_pot], [6, 4, 6, 10, 4.1, 10, TILE.dirt], ...bs];
    const id = defBlock('potted_' + pk, 'Potted ' + pd.name, { tex: 'flower_pot', render: 'boxes', boxes: all, rb: all, cb: [[5, 0, 5, 11, 6, 11]], sb: [[5, 0, 5, 11, 6, 11]], shape: 'deco', opaque: false, solid: true, hardness: 0, snd: 'stone', hidden: true, drop: (r) => ['flower_pot', 1], potted: pid, support: 'floor' });
    POTTED.push([pid, id]); }
  // ---- mob heads: floor and wall, facing four ways ----
  const HEADS = [['skeleton_skull', 'Skeleton Skull'], ['wither_skeleton_skull', 'Wither Skeleton Skull'], ['zombie_head', 'Zombie Head'], ['creeper_head', 'Creeper Head'], ['piglin_head', 'Piglin Head'], ['dragon_head', 'Dragon Head'], ['player_head', 'Player Head']];
  const old = BL[B.WITHER_SKELETON_SKULL]; if (old) { old.key = 'legacy_wither_skeleton_skull'; old.hidden = true; delete B.WITHER_SKELETON_SKULL; B.LEGACY_WITHER_SKELETON_SKULL = old.id; old.drop = 'wither_skeleton_skull'; }
  for (const [k, n] of HEADS) { ph(k + '_skin', [180, 180, 180]); ph(k + '_face', [180, 180, 180]); ph(k + '_face_w', [180, 180, 180]);
    fam(k, n, { wall: [0, 1], facing: [2, 3, 0, 1] }, (st) => { const big = k === 'dragon_head'; const b0 = st.wall ? (big ? [2, 2, 4, 14, 14, 16] : [4, 4, 8, 12, 12, 16]) : (big ? [2, 0, 2, 14, 12, 14] : [4, 0, 4, 12, 8, 12]);
      const b = shRot(b0, st.facing); const tex = [k + '_skin', k + '_skin', k + '_skin', k + '_skin', k + '_skin', k + '_skin']; tex[F46[st.facing]] = k + (st.wall ? '_face_w' : '_face');
      return { tex, render: 'boxes', boxes: [b], opaque: false, solid: true, hardness: 1, snd: 'stone', head: k, support: st.wall ? 'headwall' : 'floor', wallFacing: st.wall ? st.facing : undefined }; }); }
  // ---- cake (7 slices) ----
  ph('cake_top', [240, 236, 230]); ph('cake_side', [240, 220, 200]); ph('cake_bottom', [170, 110, 60]); ph('cake_inner', [200, 140, 90]);
  fam('cake', 'Cake', { bites: [0, 1, 2, 3, 4, 5, 6] }, (st) => { const b = [1 + st.bites * 2, 0, 1, 15, 8, 15]; return { tex: ['cake_side', st.bites ? 'cake_inner' : 'cake_side', 'cake_top', 'cake_bottom', 'cake_side', 'cake_side'], render: 'boxes', boxes: [b], opaque: false, solid: true, hardness: 0.5, snd: 'wool', drop: null, cake: st.bites, support: 'floor' }; });
  // ---- candles: 17 colours, 1-4 candles, lit or not ----
  ph('candle_flame', [255, 220, 120]); const CPOS = [[[7, 0, 7, 9, 6, 9]], [[5, 0, 7, 7, 6, 9], [9, 0, 6, 11, 5, 8]], [[7, 0, 9, 9, 6, 11], [5, 0, 7, 7, 5, 9], [9, 0, 6, 11, 3, 8]], [[5, 0, 5, 7, 6, 7], [9, 0, 5, 11, 5, 7], [5, 0, 8, 7, 3, 10], [8, 0, 8, 10, 4, 10]]];
  const CANDLES = [['candle', 'Candle', [226, 206, 160]], ...COLORDATA().map(c => [c[0] + '_candle', c[1] + ' Candle', c[2]])];
  for (const [k, n] of CANDLES) { ph(k, [200, 200, 200]);
    fam(k, n, { candles: [1, 2, 3, 4], lit: [0, 1] }, (st) => { const bs = []; for (const b of CPOS[st.candles - 1]) { bs.push(b.concat([TILE[k]])); bs.push([b[0] + 0.75, b[4], b[2] + 0.75, b[3] - 0.75, b[4] + 1, b[5] - 0.75, TILE.lantern_cap]); if (st.lit) bs.push([b[0] + 0.5, b[4] + 1, b[2] + 0.5, b[3] - 0.5, b[4] + 2.5, b[5] - 0.5, TILE.candle_flame]); }
      const bb = [5, 0, 5, 11, 6, 11]; return { tex: k, render: 'boxes', boxes: bs, cb: [bb], sb: [bb], opaque: false, solid: true, hardness: 0.1, snd: 'wool', light: st.lit ? st.candles * 0.2 : 0, candle: k, drop: (r) => [k, st.candles], support: 'floor' }; }); }
  // candle cakes
  for (const [k, n] of CANDLES) fam(k + '_cake', 'Cake with ' + n, { lit: [0, 1] }, (st) => { const bs = [[1, 0, 1, 15, 8, 15], [7, 8, 7, 9, 14, 9, TILE[k]], [7.75, 14, 7.75, 8.25, 15, 8.25, TILE.lantern_cap]]; if (st.lit) bs.push([7.5, 15, 7.5, 8.5, 16.5, 8.5, TILE.candle_flame]);
    return { tex: ['cake_side', 'cake_side', 'cake_top', 'cake_bottom', 'cake_side', 'cake_side'], render: 'boxes', boxes: bs, cb: [[1, 0, 1, 15, 8, 15]], sb: [[1, 0, 1, 15, 8, 15]], opaque: false, solid: true, hardness: 0.5, snd: 'wool', light: st.lit ? 0.2 : 0, candleCake: k, drop: k, hidden: true, support: 'floor' }; });
  // ---- lodestone, respawn anchor, conduit ----
  defBlock('lodestone', 'Lodestone', { tex: { s: ph('lodestone_side', [130, 130, 134]), t: ph('lodestone_top', [120, 120, 124]) }, hardness: 3.5, tool: 'pick', tier: 1, snd: 'stone', lodestone: true });
  ph('respawn_anchor_top', [40, 20, 60]); ph('respawn_anchor_top_off', [30, 20, 40]); ph('respawn_anchor_bottom', [30, 20, 40]); for (let c = 0; c <= 4; c++) ph('respawn_anchor_side' + c, [40, 20, 60]);
  fam('respawn_anchor', 'Respawn Anchor', { charges: [0, 1, 2, 3, 4] }, (st) => ({ tex: { s: 'respawn_anchor_side' + st.charges, t: st.charges ? 'respawn_anchor_top' : 'respawn_anchor_top_off', b: 'respawn_anchor_bottom' }, shape: undefined, hardness: 50, tool: 'pick', tier: 4, snd: 'stone', light: [0, 0.2, 0.47, 0.73, 1][st.charges], anchor: st.charges }));
  for (const id of Object.values(FAMILY.respawn_anchor.ids)) delete BL[id].shape;
  ph('conduit', [150, 130, 100]); defBlock('conduit', 'Conduit', { tex: 'conduit', render: 'boxes', boxes: [[5, 5, 5, 11, 11, 11]], rb: [[5, 5, 5, 11, 11, 11]], cb: [[5, 5, 5, 11, 11, 11]], sb: [[5, 5, 5, 11, 11, 11]], shape: 'deco', opaque: false, solid: true, hardness: 3, mine: 'pick', snd: 'stone', light: 1, conduit: true });
  // ---- chiseled bookshelf: 6 book slots, seen from the front ----
  ph('chiseled_bookshelf_side', [160, 120, 70]); ph('chiseled_bookshelf_top', [160, 120, 70]); ph('chiseled_bookshelf_full', [120, 60, 40]); ph('chiseled_bookshelf_empty', [70, 50, 30]);
  const SLOT = [[0, 8, 5, 16], [5, 8, 11, 16], [11, 8, 16, 16], [0, 0, 5, 8], [5, 0, 11, 8], [11, 0, 16, 8]]; // MC slot order: top row left to right, then bottom row (seen from the front)
  fam('chiseled_bookshelf', 'Chiseled Bookshelf', { facing: [2, 3, 0, 1], books: [...Array(64).keys()] }, (st) => {
    const bs = [[0, 0, 0, 16, 16, 15]]; SLOT.forEach((s, i) => bs.push([s[0], s[1], 15, s[2], s[3], 16, TILE[(st.books >> i) & 1 ? 'chiseled_bookshelf_full' : 'chiseled_bookshelf_empty']]));
    const rb = bs.map(b => shRot(b, (st.facing + 2) % 4)); return { tex: { s: 'chiseled_bookshelf_side', t: 'chiseled_bookshelf_top' }, render: 'boxes', boxes: rb, cb: [[0, 0, 0, 16, 16, 16]], sb: [[0, 0, 0, 16, 16, 16]], opaque: true, hardness: 1.5, mine: 'axe', snd: 'wood', cbs: true }; });
  // ---- decorated pot ----
  ph('decorated_pot_side', [150, 80, 50]); ph('decorated_pot_top', [150, 80, 50]);
  defBlock('decorated_pot', 'Decorated Pot', { tex: { s: 'decorated_pot_side', t: 'decorated_pot_top' }, render: 'boxes', boxes: [[1, 0, 1, 15, 13, 15], [4, 13, 4, 12, 14, 12], [3, 14, 3, 13, 16, 13]], rb: [[1, 0, 1, 15, 13, 15], [4, 13, 4, 12, 14, 12], [3, 14, 3, 13, 16, 13]], cb: [[1, 0, 1, 15, 16, 15]], sb: [[1, 0, 1, 15, 16, 15]], shape: 'deco', opaque: false, solid: true, hardness: 0, snd: 'stone', dpot: true, drop: null });
  // ---- beehives and bee nests: honey level 0-5 ----
  for (const [k, n] of [['beehive', 'Beehive'], ['bee_nest', 'Bee Nest']]) { for (const t of ['_front', '_front_honey', '_side', '_end']) ph(k + t, [190, 150, 80]);
    fam(k, n, { facing: [2, 3, 0, 1], honey: [0, 1, 2, 3, 4, 5] }, (st) => { const tex = [k + '_side', k + '_side', k + '_end', k + '_end', k + '_side', k + '_side']; tex[F46[st.facing]] = k + (st.honey === 5 ? '_front_honey' : '_front');
      return { tex, shape: undefined, hardness: k === 'beehive' ? 0.6 : 0.3, mine: 'axe', snd: 'wood', hive: st.honey, drop: k === 'bee_nest' ? null : k }; });
    for (const id of Object.values(FAMILY[k].ids)) delete BL[id].shape; }
  defBlock('honeycomb_block_rs', 'Honeycomb Block', { tex: 'honey_block', hidden: true, drop: 'honeycomb_block' }); // placeholder so old saves of this key keep loading
}
function paintDecoTiles() {
  const clear = (set) => each((x, y) => set(x, y, [0, 0, 0], 0)); const dk = (p, f) => [p[0] * f, p[1] * f, p[2] * f];
  // lanterns: an iron frame round glowing glass
  for (const [k, glow, hot] of [['lantern', [255, 196, 90], [255, 236, 170]], ['soul_lantern', [80, 210, 230], [190, 250, 255]]]) makeTile(k + '_body', (set, r) => each((x, y) => { const fr = x <= 5 || x >= 10 || y <= 1 || y === 9 || y >= 15 || (y >= 7 && y <= 8 && false);
    const edge = x === 5 || x === 10 || y === 9 || y === 15 || y === 8 || y === 1 || y === 0; set(x, y, edge ? vary([54, 56, 64], r, 4) : fr ? vary([74, 76, 86], r, 4) : (x === 7 || x === 8) && y >= 11 && y <= 13 ? hot : vary(glow, r, 10)); }));
  makeTile('lantern_cap', (set, r) => each((x, y) => set(x, y, vary(((x + y) & 3) === 0 ? [92, 94, 104] : [62, 64, 72], r, 4))));
  makeTile('chain', (set, r) => { clear(set); for (let y = 0; y < 16; y++) { const link = (y >> 2) & 1; const c = y % 4 === 0 ? [40, 42, 50] : [78, 82, 96]; if (link) { set(7, y, c); set(8, y, c); } else { set(6, y, c); set(9, y, dk(c, 0.8)); if (y % 4 === 1 || y % 4 === 3) { set(7, y, c); set(8, y, c); } } } });
  const planks = tilePixels('planks'), stone = tilePixels('stone');
  makeTile('campfire_log', (set, r) => each((x, y) => { const ring = (y + (x >> 2)) % 4 === 0; set(x, y, vary(ring ? [76, 56, 34] : [108, 82, 50], r, 6)); }));
  for (const [k, ember] of [['campfire', [255, 140, 30]], ['soul_campfire', [80, 220, 230]]]) {
    makeTile(k + '_log_lit', (set, r) => each((x, y) => { const ring = (y + (x >> 2)) % 4 === 0; const glow = r() < 0.22 && y > 3; set(x, y, glow ? ember : vary(ring ? [60, 44, 28] : [92, 68, 42], r, 6)); }));
    makeTile(k + '_fire', (set, r) => { clear(set); const soul = k === 'soul_campfire'; for (let x = 1; x < 15; x++) { const h = 6 + Math.round(5 * Math.abs(Math.sin(x * 1.7)) + r() * 3); for (let y = 15; y > 15 - h; y--) { const t = (15 - y) / h; set(x, y, soul ? mixc([90, 230, 240], [20, 120, 170], t) : mixc([255, 240, 140], [230, 80, 10], t), t > 0.85 ? 160 : 255); } } }); }
  makeTile('campfire_ash', (set, r) => each((x, y) => set(x, y, vary([70, 66, 62], r, 10))));
  makeTile('soul_torch', (set, r) => { clear(set); for (let y = 6; y < 16; y++) { set(7, y, [120, 90, 50]); set(8, y, [100, 74, 40]); } for (const [x, y, c] of [[7, 5, [120, 240, 250]], [8, 5, [70, 200, 220]], [7, 6, [80, 220, 240]], [8, 6, [40, 170, 200]], [7, 4, [200, 255, 255]], [8, 4, [140, 240, 250]]]) set(x, y, c); });
  makeTile('bell_body', (set, r) => each((x, y) => set(x, y, vary(y === 3 || y === 10 ? [196, 150, 30] : (x + y) % 6 === 0 ? [255, 236, 120] : [238, 196, 56], r, 6))));
  makeTile('bell_bar', (set, r) => each((x, y) => set(x, y, vary([84, 74, 66], r, 5))));
  makeTile('scaffolding_top', (set, r) => each((x, y) => { const e = x < 2 || x > 13 || y < 2 || y > 13; const slat = !e && (y === 5 || y === 10 || (x === 7 || x === 8)); set(x, y, vary(e ? [214, 184, 104] : slat ? [196, 164, 88] : [0, 0, 0], r, 6), e || slat ? 255 : 0); }));
  makeTile('scaffolding_side', (set, r) => each((x, y) => set(x, y, vary(x % 4 === 0 ? [180, 150, 78] : [214, 184, 104], r, 6))));
  makeTile('flower_pot', (set, r) => each((x, y) => set(x, y, vary(y === 10 || y === 11 ? [120, 58, 40] : [156, 82, 58], r, 5))));
  // heads: plain skin on the back and sides, a face on the front (two versions: floor heads use the lower half of the
  // texture, wall heads the middle)
  const HD = { skeleton_skull: [[200, 200, 196], [150, 150, 146]], wither_skeleton_skull: [[44, 44, 44], [24, 24, 24]], zombie_head: [[80, 130, 70], [56, 100, 50]], creeper_head: [[94, 186, 76], [60, 140, 50]], piglin_head: [[232, 160, 150], [190, 120, 110]], dragon_head: [[36, 30, 40], [20, 16, 24]], player_head: [[196, 140, 104], [70, 46, 30]] };
  for (const k in HD) { const [c, c2] = HD[k];
    makeTile(k + '_skin', (set, r) => each((x, y) => set(x, y, vary(k === 'player_head' && y < 10 ? c2 : r() < 0.2 ? c2 : c, r, 6))));
    for (const w of [false, true]) makeTile(k + (w ? '_face_w' : '_face'), (set, r) => { const o = w ? 4 : 8; each((x, y) => set(x, y, vary(k === 'player_head' && y < o + 2 ? c2 : r() < 0.15 ? c2 : c, r, 6)));
      const S2 = (x, y, col) => set(4 + x, o + y, col); const dark = [16, 14, 16];
      if (k === 'skeleton_skull' || k === 'wither_skeleton_skull') { for (const [x, y] of [[1, 3], [2, 3], [1, 4], [2, 4], [5, 3], [6, 3], [5, 4], [6, 4], [3, 5], [4, 5]]) S2(x, y, k === 'wither_skeleton_skull' ? [6, 6, 6] : [40, 36, 36]); for (let x = 1; x < 7; x++) S2(x, 6, k === 'wither_skeleton_skull' ? [70, 70, 70] : [110, 106, 100]); for (const x of [2, 4, 6]) S2(x, 7, k === 'wither_skeleton_skull' ? [10, 10, 10] : [60, 56, 54]); }
      else if (k === 'creeper_head') { for (const [x, y] of [[1, 2], [2, 2], [1, 3], [2, 3], [5, 2], [6, 2], [5, 3], [6, 3], [3, 4], [4, 4], [2, 5], [3, 5], [4, 5], [5, 5], [2, 6], [5, 6]]) S2(x, y, [12, 26, 10]); }
      else if (k === 'zombie_head') { for (const [x, y] of [[1, 3], [2, 3], [5, 3], [6, 3]]) S2(x, y, [20, 40, 30]); for (let x = 2; x < 6; x++) S2(x, 6, [40, 70, 36]); }
      else if (k === 'piglin_head') { for (let x = 2; x < 6; x++) for (let y = 4; y < 7; y++) S2(x, y, [240, 176, 166]); S2(3, 5, [110, 60, 60]); S2(4, 5, [110, 60, 60]); S2(1, 3, [255, 255, 255]); S2(6, 3, [255, 255, 255]); S2(2, 3, [40, 30, 30]); S2(5, 3, [40, 30, 30]); S2(1, 7, [240, 230, 200]); S2(6, 7, [240, 230, 200]); }
      else if (k === 'dragon_head') { for (const [x, y] of [[1, 2], [2, 2], [5, 2], [6, 2]]) S2(x, y, [200, 60, 220]); for (let x = 0; x < 8; x++) S2(x, 6, [60, 50, 66]); S2(1, 7, [230, 230, 220]); S2(6, 7, [230, 230, 220]); }
      else if (k === 'player_head') { for (const [x, y, col] of [[1, 4, [250, 250, 250]], [2, 4, [70, 60, 140]], [5, 4, [70, 60, 140]], [6, 4, [250, 250, 250]], [3, 6, [150, 90, 70]], [4, 6, [150, 90, 70]]]) S2(x, y, col); } }); }
  makeTile('cake_top', (set, r) => each((x, y) => { const e = x === 0 || y === 0 || x === 15 || y === 15; const dot = !e && r() < 0.06; set(x, y, dot ? [220, 40, 50] : vary(e ? [226, 220, 212] : [246, 242, 236], r, 3)); }));
  makeTile('cake_side', (set, r) => each((x, y) => { const icing = y < 5 || (y < 7 && (x * 7) % 5 < 2); set(x, y, icing ? vary([246, 242, 236], r, 3) : y === 12 ? [220, 60, 60] : vary([196, 130, 76], r, 6)); }));
  makeTile('cake_inner', (set, r) => each((x, y) => { const icing = y < 5; set(x, y, icing ? vary([246, 242, 236], r, 3) : y === 12 ? [220, 60, 60] : vary([220, 170, 110], r, 8)); }));
  makeTile('cake_bottom', (set, r) => each((x, y) => set(x, y, vary([170, 108, 60], r, 6))));
  makeTile('candle_flame', (set, r) => each((x, y) => set(x, y, y < 8 ? [255, 250, 200] : [255, 190, 70])));
  for (const [k, , c] of [['candle', '', [226, 206, 160]], ...COLORDATA().map(cc => [cc[0] + '_candle', '', cc[2]])]) makeTile(k, (set, r) => each((x, y) => set(x, y, vary((x + y) % 5 === 0 ? mixc(c, [255, 255, 255], 0.25) : x % 2 ? dk(c, 0.9) : c, r, 4))));
  makeTile('lodestone_side', (set, r) => each((x, y) => { const p = stone(x, y); const band = y >= 6 && y <= 9; set(x, y, band ? vary([60, 62, 70], r, 5) : (x === 0 || x === 15) ? dk(p, 0.6) : dk(p, 0.88)); }));
  makeTile('lodestone_top', (set, r) => each((x, y) => { const p = stone(x, y); const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); set(x, y, d < 3 ? vary([60, 62, 70], r, 5) : d > 6.5 ? dk(p, 0.6) : dk(p, 0.88)); }));
  const obs = (x, y, r) => vary(((x * 3 + y * 5) % 7) === 0 ? [60, 30, 90] : [24, 14, 36], r, 5);
  for (let c = 0; c <= 4; c++) makeTile('respawn_anchor_side' + c, (set, r) => each((x, y) => { const ind = x >= 5 && x <= 10 && y >= 4 && y <= 12; const lv = ind && (12 - y) / 2 < c; set(x, y, ind ? (lv ? vary([255, 140, 60], r, 10) : [50, 30, 60]) : (y < 2 || y > 13) ? vary([80, 70, 90], r, 5) : obs(x, y, r)); }));
  makeTile('respawn_anchor_top', (set, r) => each((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); set(x, y, d < 5 ? vary([180, 80, 240], r, 20) : obs(x, y, r)); }));
  makeTile('respawn_anchor_top_off', (set, r) => each((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); set(x, y, d < 5 ? vary([40, 26, 60], r, 6) : obs(x, y, r)); }));
  makeTile('respawn_anchor_bottom', (set, r) => each((x, y) => set(x, y, obs(x, y, r))));
  makeTile('conduit', (set, r) => each((x, y) => { const e = x <= 5 || x >= 10 || y <= 5 || y >= 10; set(x, y, e ? vary(((x + y) & 1) ? [130, 110, 80] : [160, 136, 98], r, 6) : vary([90, 200, 210], r, 10)); }));
  makeTile('chiseled_bookshelf_side', (set, r) => { const p = planks; each((x, y) => { const q = p(x, y); set(x, y, (x < 1 || x > 14) ? dk(q, 0.7) : [q[0], q[1], q[2]]); }); });
  makeTile('chiseled_bookshelf_top', (set, r) => each((x, y) => { const q = planks(x, y); set(x, y, (x === 0 || y === 0 || x === 15 || y === 15) ? dk(q, 0.6) : [q[0], q[1], q[2]]); }));
  const frame = (x, y) => x === 0 || x === 15 || x === 5 || x === 10 || y === 0 || y === 15 || y === 7 || y === 8;
  makeTile('chiseled_bookshelf_empty', (set, r) => each((x, y) => { const q = planks(x, y); set(x, y, frame(x, y) ? [q[0], q[1], q[2]] : vary([46, 32, 20], r, 4)); }));
  const BOOKC = [[150, 40, 40], [50, 80, 150], [60, 120, 60], [140, 110, 50], [110, 60, 120]];
  makeTile('chiseled_bookshelf_full', (set, r) => each((x, y) => { const q = planks(x, y); if (frame(x, y)) { set(x, y, [q[0], q[1], q[2]]); return; } const c = BOOKC[(x * 3 + (y > 7 ? 1 : 0)) % 5]; set(x, y, (y === 1 || y === 9) ? dk(c, 0.6) : (y === 4 || y === 12) ? mixc(c, [230, 200, 120], 0.6) : c); }));
  makeTile('decorated_pot_side', (set, r) => each((x, y) => set(x, y, vary((y === 3 || y === 12) ? [110, 52, 34] : ((x + y * 2) % 9 === 0 ? [180, 104, 70] : [152, 80, 52]), r, 5))));
  makeTile('decorated_pot_top', (set, r) => each((x, y) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); set(x, y, d < 3 ? [40, 24, 16] : vary([152, 80, 52], r, 5)); }));
  for (const [k, base, dark] of [['beehive', [196, 156, 92], [150, 110, 60]], ['bee_nest', [214, 176, 76], [176, 120, 44]]]) {
    const side = (x, y, r) => vary(k === 'beehive' ? ((y % 5 === 0) ? dark : base) : ((y % 4 === 1) ? dark : base), r, 6);
    makeTile(k + '_side', (set, r) => each((x, y) => set(x, y, side(x, y, r))));
    makeTile(k + '_end', (set, r) => each((x, y) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); set(x, y, vary(k === 'beehive' ? (d > 6.5 ? dark : (Math.round(d) % 2 ? base : mixc(base, dark, 0.4))) : ((x + y) % 3 === 0 ? dark : base), r, 5)); }));
    for (const honey of [false, true]) makeTile(k + (honey ? '_front_honey' : '_front'), (set, r) => each((x, y) => { let c = side(x, y, r); if (x >= 5 && x <= 10 && y >= 8 && y <= 10) c = [24, 18, 10];
      if (honey && ((y === 1 || y === 2) && x > 1 && x < 14 || ((x === 3 || x === 7 || x === 12) && y < 6 + (x % 3)))) c = vary([246, 176, 30], r, 8); set(x, y, c); })); }
}
{ const R = (o, n, sh, k) => RECIPES.push(RSH(o, n, sh, k)); const L = (o, n, items) => RECIPES.push(RSL(o, n, items)); const r0 = RECIPES.length;
  const M3 = (key, name, o, icon) => { const id = nid++; defItem(id, key, name, o || {}); ITEM_IDS.push(id); if (icon) ICONP[key] = icon; return id; };
  if (IT.charcoal === undefined) { M3('charcoal', 'Charcoal', {}, (s) => { for (let y = 3; y <= 12; y++) for (let x = 4; x <= 11; x++) if (Math.abs(x - 7.5) + Math.abs(y - 7.5) < 6) s(x, y, (x + y) % 4 === 0 ? [80, 70, 62] : [44, 40, 36]); }); SMELT[IT.log] = IT.charcoal; for (const w of WOODDATA()) if (!w.nether && IT[w.log] !== undefined) SMELT[IT[w.log]] = IT.charcoal; FUEL[IT.charcoal] = 80; }
  M3('honey_bottle', 'Honey Bottle', { kind: 'food', food: 6, sat: 1.2, stack: 16, alwaysEat: false, drink: true }, (s) => { for (let y = 4; y <= 14; y++) for (let x = 5; x <= 10; x++) { const neck = y < 7; if (neck && (x < 7 || x > 8)) continue; s(x, y, y === 4 ? [140, 100, 70] : neck ? [220, 230, 240] : (x === 5 || x === 10 || y === 14) ? [200, 140, 30] : [246, 182, 40]); } });
  FUEL[IT.charcoal] = 80;
  R('lantern', 1, ['NNN', 'NTN', 'NNN'], { N: 'iron_nugget', T: 'torch' }); R('soul_lantern', 1, ['NNN', 'NTN', 'NNN'], { N: 'iron_nugget', T: 'soul_torch' });
  R('soul_torch', 4, ['C', 'S', 'O'], { C: 'coal', S: 'stick', O: 'soul_soil' }); R('chain', 1, ['N', 'I', 'N'], { N: 'iron_nugget', I: 'iron_ingot' });
  R('campfire', 1, [' S ', 'SCS', 'LLL'], { S: 'stick', C: 'coal', L: '#log' }); R('soul_campfire', 1, [' S ', 'SCS', 'LLL'], { S: 'stick', C: 'soul_soil', L: '#log' });
  R('scaffolding', 6, ['BSB', 'B B', 'B B'], { B: 'bamboo', S: 'string' }); R('flower_pot', 1, ['B B', ' B '], { B: 'brick' });
  R('cake', 1, ['MMM', 'SES', 'WWW'], { M: 'milk_bucket', S: 'sugar', E: 'egg', W: 'wheat' });
  R('candle', 1, ['S', 'H'], { S: 'string', H: 'honeycomb' }); for (const c of COLORDATA()) L(c[0] + '_candle', 1, ['candle', c[0] + '_dye']);
  R('lodestone', 1, ['SSS', 'SNS', 'SSS'], { S: 'chiseled_stone_bricks', N: 'netherite_ingot' }); R('respawn_anchor', 1, ['CCC', 'GGG', 'CCC'], { C: 'crying_obsidian', G: 'glowstone' });
  R('conduit', 1, ['NNN', 'NHN', 'NNN'], { N: 'nautilus_shell', H: 'heart_of_the_sea' });
  R('chiseled_bookshelf', 1, ['PPP', 'SSS', 'PPP'], { P: 'planks', S: '#wooden_slabs' }); R('decorated_pot', 1, [' B ', 'B B', ' B '], { B: 'brick' });
  R('beehive', 1, ['PPP', 'HHH', 'PPP'], { P: 'planks', H: 'honeycomb' }); L('honey_bottle', 4, ['honey_block', 'glass_bottle', 'glass_bottle', 'glass_bottle', 'glass_bottle']); R('honey_block', 1, ['HH', 'HH'], { H: 'honey_bottle' }); L('sugar', 3, ['honey_bottle']);
  for (let i = RECIPES.length - 1; i >= r0; i--) { const r = RECIPES[i]; const specs = r.items || Object.values(r.key || {}); if (specs.some(sp => sp[0] !== '#' && sp !== 'planks' && sp[0] !== '=' && IT[sp] === undefined)) RECIPES.splice(i, 1); } // drop recipes whose ingredients do not exist yet
}
// ---- flat inventory pictures for blocks that Minecraft shows as item sprites ----
{ const box = (s, x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) s(x, y, typeof c === 'function' ? c(x, y) : c); };
  const lanternP = (glow, hot) => (s) => { box(s, 7, 0, 8, 0, [70, 72, 80]); s(6, 1, [70, 72, 80]); s(9, 1, [70, 72, 80]); box(s, 5, 2, 10, 3, [60, 62, 70]); box(s, 4, 4, 11, 14, [52, 54, 62]); box(s, 5, 5, 10, 13, (x, y) => (x === 7 || x === 8) && y >= 8 && y <= 11 ? hot : glow); box(s, 4, 14, 11, 14, [40, 42, 48]); box(s, 5, 4, 10, 4, [78, 80, 90]); };
  ICONP.lantern = lanternP([236, 160, 60], [255, 238, 170]); ICONP.soul_lantern = lanternP([60, 180, 200], [190, 250, 255]);
  ICONP.chain = (s) => { for (let i = 0; i < 4; i++) { const cx = 4 + i * 3, cy = 12 - i * 3; const c = i & 1 ? [92, 96, 110] : [64, 68, 80]; for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1]]) s(cx + a, cy + b, c); } };
  const fireP = (f1, f2) => (s) => { for (let x = 3; x <= 12; x++) { const h = 4 + Math.round(3 * Math.abs(Math.sin(x * 1.3))); for (let y = 11 - h; y <= 10; y++) s(x, y, y < 11 - h + 2 ? f1 : f2); }
    for (let i = 0; i < 12; i++) { s(2 + i, 13 - (i >> 2), [104, 76, 46]); s(2 + i, 14 - (i >> 2), [80, 58, 34]); s(13 - i, 13 - (i >> 2), [118, 86, 52]); s(13 - i, 14 - (i >> 2), [90, 66, 40]); } };
  ICONP.campfire = fireP([255, 230, 120], [240, 110, 20]); ICONP.soul_campfire = fireP([180, 250, 255], [40, 170, 200]);
  ICONP.bell = (s) => { box(s, 7, 1, 8, 2, [90, 80, 70]); for (let y = 3; y <= 12; y++) { const w = y < 5 ? 2 : y < 10 ? 3 : 4 + (y - 10); box(s, 8 - w, y, 7 + w, y, (x) => x === 8 - w ? [190, 140, 30] : x < 7 ? [255, 230, 110] : [236, 190, 56]); } box(s, 2, 13, 13, 13, [170, 120, 24]); s(7, 14, [120, 100, 60]); s(8, 14, [120, 100, 60]); };
  ICONP.flower_pot = (s) => { box(s, 4, 7, 11, 8, [120, 58, 40]); for (let y = 9; y <= 14; y++) box(s, 5, y, 10, y, (x) => x === 5 ? [128, 64, 46] : [160, 84, 60]); };
  ICONP.cake = (s) => { for (let y = 5; y <= 13; y++) { const top = y <= 7; box(s, 1 + (y - 5 > 2 ? 0 : 2 - (y - 5)), y, 14 - (y - 5 > 2 ? 0 : 2 - (y - 5)), y, top ? (x) => ((x * 7 + y) % 9 === 0 ? [220, 40, 50] : [248, 244, 238]) : (x) => (y === 8 ? [236, 226, 214] : y === 11 ? [210, 60, 60] : [196, 130, 76])); } };
  ICONP.repeater = (s) => { box(s, 1, 10, 14, 13, (x, y) => y === 10 ? [196, 196, 196] : y === 13 ? [110, 110, 110] : [160, 160, 160]); box(s, 3, 11, 12, 11, [150, 20, 18]); for (const x of [3, 11]) { box(s, x, 5, x + 1, 9, [126, 94, 52]); box(s, x, 3, x + 1, 4, [255, 60, 40]); } };
  ICONP.comparator = (s) => { box(s, 1, 10, 14, 13, (x, y) => y === 10 ? [196, 196, 196] : y === 13 ? [110, 110, 110] : [160, 160, 160]); box(s, 3, 11, 12, 11, [150, 20, 18]); for (const [x, t] of [[2, 4], [7, 2], [12, 4]]) { box(s, x, t + 2, x + 1, 9, [126, 94, 52]); box(s, x, t, x + 1, t + 1, x === 7 ? [110, 26, 22] : [255, 60, 40]); } };
  ICONP.hopper = (s) => { box(s, 1, 2, 14, 5, (x, y) => y === 2 ? [96, 96, 104] : (x > 2 && x < 13 && y < 5) ? [30, 30, 34] : [70, 70, 76]); for (let y = 6; y <= 10; y++) box(s, 2 + (y - 6), y, 13 - (y - 6), y, (x) => x === 2 + (y - 6) ? [50, 50, 56] : [74, 74, 80]); box(s, 7, 11, 8, 14, [60, 60, 66]); };
  const candleP = (c) => (s) => { box(s, 7, 6, 8, 14, (x, y) => x === 7 ? mixc(c, [255, 255, 255], 0.25) : c); s(7, 4, [40, 34, 30]); s(7, 5, [40, 34, 30]); s(8, 5, mixc(c, [0, 0, 0], 0.2)); };
  ICONP.candle = candleP([226, 206, 160]); for (const c of COLORDATA()) ICONP[c[0] + '_candle'] = candleP(c[2]);
  for (const k of ['lantern', 'soul_lantern', 'chain', 'campfire', 'soul_campfire', 'bell', 'flower_pot', 'cake', 'repeater', 'comparator', 'hopper', 'candle', ...COLORDATA().map(c => c[0] + '_candle')]) if (B[k.toUpperCase()] !== undefined) BL[B[k.toUpperCase()]].iconPaint = true; }

// ================= SIGNS, BANNERS, ITEM FRAMES, PAINTINGS, ARMOR STANDS (Minecraft) =================
// Signs and hanging signs in every wood (standing or on a wall, with four lines of text you write), banners in 16
// colours (standing or on a wall), item frames and glow item frames (on any face, showing an item turned in 8 steps),
// paintings (original art, 1x1 up to 4x4, the biggest that fits the wall), armor stands that wear armor.
// Text, items and art are drawn by 83_signs.js. Original pixel art.
function defineSignBlocks() {
  const ph = (n, c, a) => { if (TILE[n] === undefined) makeTile(n, (set) => each((x, y) => set(x, y, c, a === undefined ? 255 : a))); return n; };
  const fam = (key, name, props, mk, kind) => { const names = Object.keys(props); const F = FAMILY[key] = { kind: kind || 'deco', props: names, ids: {}, base: 0, mat: key };
    let combos = [{}]; for (const p of names) { const next = []; for (const c of combos) for (const v of props[p]) next.push(Object.assign({}, c, { [p]: v })); combos = next; }
    combos.forEach((st, i) => { const o = mk(st); o.fam = key; o.st = st; if (o.hidden === undefined) o.hidden = i > 0; if (o.drop === undefined) o.drop = key; o.shape = 'deco'; if (!o.rb) o.rb = o.boxes; if (!o.cb) o.cb = []; if (!o.sb) o.sb = o.boxes;
      const id = defBlock(i === 0 ? key : key + '#' + names.map(p => st[p]).join('_'), name, o); F.ids[names.map(p => st[p]).join(',')] = id; if (i === 0) F.base = id; }); return F; };
  const tileOf = (key, f) => { const d = BL[B[key.toUpperCase()]]; return d && d.texIds ? d.texIds[f || 0] : TILE.planks; };
  // ---- signs and hanging signs ----
  for (const w of WOODDATA()) { const pl = tileOf(w.planks), lg = w.log ? tileOf(w.log) : pl; const n = w.name;
    fam(w.k + '_sign', n + ' Sign', { wall: [0, 1], facing: [2, 3, 0, 1] }, (st) => { const bs = (st.wall ? [[0, 4, 14, 16, 12, 16, pl]] : [[0, 8, 7.25, 16, 16, 8.75, pl], [7.25, 0, 7.25, 8.75, 8, 8.75, lg]]).map(b => shRot(b, st.facing));
      return { tex: 'planks', render: 'boxes', boxes: bs, sb: bs, solid: false, opaque: false, hardness: 1, mine: 'axe', snd: 'wood', sign: w.k, signWall: st.wall, support: st.wall ? 'signwall' : 'floor', noCollide: true }; });
    fam(w.k + '_hanging_sign', n + ' Hanging Sign', { wall: [0, 1], facing: [2, 3, 0, 1] }, (st) => { const ch = TILE.chain; const bs = (st.wall ? [[0, 14, 6, 16, 16, 10, lg], [1, 0, 7, 15, 10, 9, pl], [3, 10, 8, 4, 14, 8.01, ch], [12, 10, 8, 13, 14, 8.01, ch]] : [[1, 0, 7, 15, 10, 9, pl], [3, 10, 8, 4, 16, 8.01, ch], [12, 10, 8, 13, 16, 8.01, ch], [3.5, 10, 7.5, 3.51, 16, 8.5, ch], [12.5, 10, 7.5, 12.51, 16, 8.5, ch]]).map(b => shRot(b, st.facing));
      return { tex: 'planks', render: 'boxes', boxes: bs, sb: bs, solid: false, opaque: false, hardness: 1, mine: 'axe', snd: 'wood', sign: w.k, hangSign: true, signWall: st.wall, support: st.wall ? 'signwall' : 'hang', noCollide: true }; }); }
  // ---- banners: a pole with a cross bar and the cloth (standing), or the bar against a wall ----
  for (const c of COLORDATA()) { const wool = tileOf(c[0] === 'white' ? 'wool' : c[0] + '_wool'); const k = c[0] + '_banner';
    fam(k, c[1] + ' Banner', { wall: [0, 1], facing: [2, 3, 0, 1] }, (st) => { const bs = (st.wall ? [[0, 14, 13.5, 16, 15.5, 15.5, TILE.log_side], [1, -12, 14.5, 15, 14, 15.5, wool]] : [[7.25, 0, 7.25, 8.75, 30, 8.75, TILE.log_side], [0, 28, 5.75, 16, 30, 7.25, TILE.log_side], [1, 2, 6.25, 15, 28, 7.25, wool]]).map(b => shRot(b, st.facing));
      const sel = (st.wall ? [[1, 0, 14, 15, 16, 16]] : [[5, 0, 5, 11, 16, 11]]).map(b => shRot(b, st.facing));
      return { tex: c[0] === 'white' ? 'wool' : c[0] + '_wool', render: 'boxes', boxes: bs, sb: sel, solid: false, opaque: false, hardness: 1, mine: 'axe', snd: 'wool', banner: c[0], support: st.wall ? 'signwall' : 'floor', noCollide: true }; }); }
  // ---- item frames ----
  ph('item_frame', [150, 110, 70]); ph('glow_item_frame', [150, 110, 70]);
  for (const [k, n] of [['item_frame', 'Item Frame'], ['glow_item_frame', 'Glow Item Frame']]) fam(k, n, { facing: [2, 3, 0, 1, 4, 5], rot: [0, 1, 2, 3, 4, 5, 6, 7] }, (st) => { const b = [rot6([2, 0, 2, 14, 1, 14], st.facing)];
    return { tex: k, render: 'boxes', boxes: b, sb: b, solid: false, opaque: false, hardness: 0, snd: 'wood', frame: k, support: 'frame', noCollide: true, facing6: st.facing }; });
  // ---- paintings: each cell of a painting is a block; the art is drawn over them ----
  fam('painting', 'Painting', { facing: [2, 3, 0, 1] }, (st) => { const b = [shRot([0, 0, 15, 16, 16, 16], (st.facing + 2) % 4)]; return { tex: 'planks', render: 'boxes', boxes: [], rb: [], sb: b, solid: false, opaque: false, hardness: 0, snd: 'wood', painting: true, support: 'signwall', noCollide: true, drop: null, noFamDrop: true }; });
  // ---- armor stands: the lower block draws the stand; the upper one is just room for its head ----
  ph('armor_stand', [170, 130, 80]);
  fam('armor_stand', 'Armor Stand', { facing: [2, 3, 0, 1], part: ['lower', 'upper'] }, (st) => { const up = st.part === 'upper';
    const bs = up ? [] : [[2, 0, 2, 14, 1, 14, TILE.smooth_stone], [7, 1, 7, 9, 23, 9], [4, 11, 7, 6, 23, 9], [10, 11, 7, 12, 23, 9], [2, 23, 6.5, 14, 26, 9.5], [4, 12, 6.5, 12, 14, 9.5], [7, 26, 7, 9, 32, 9], [0, 13, 7, 2, 23, 9], [14, 13, 7, 16, 23, 9]].map(b => shRot(b, st.facing));
    return { tex: 'armor_stand', render: 'boxes', boxes: bs, rb: bs, sb: up ? [[4, 0, 4, 12, 16, 12]] : [[4, 0, 4, 12, 16, 12]], solid: false, opaque: false, hardness: 0, snd: 'wood', armorStand: st.part, support: up ? 'standtop' : 'floor', noCollide: true, drop: up ? null : 'armor_stand', noFamDrop: up }; });
}
function paintSignTiles() {
  const planks = tilePixels('planks'), birch = tilePixels(TILE.birch_planks !== undefined ? 'birch_planks' : 'planks');
  for (const glow of [false, true]) makeTile(glow ? 'glow_item_frame' : 'item_frame', (set, r) => each((x, y) => { const e = x < 2 || x > 13 || y < 2 || y > 13; const p = birch(x, y);
    set(x, y, e ? (glow ? [Math.min(255, p[0] * 0.8 + 40), p[1] * 0.9 + 30, p[2] * 0.6] : [p[0], p[1], p[2]]) : vary(glow ? [96, 150, 120] : [150, 96, 60], r, 6)); }));
  makeTile('armor_stand', (set, r) => { const p = planks; each((x, y) => { const q = p(x, y); set(x, y, [q[0] * 1.05, q[1], q[2] * 0.9]); }); });
}
{ const R = (o, n, sh, k) => RECIPES.push(RSH(o, n, sh, k)); const r0 = RECIPES.length;
  for (const w of WOODDATA()) { const sl = w.k === 'bamboo' ? 'stripped_bamboo_block' : (w.nether ? 'stripped_' + w.log : 'stripped_' + w.log); R(w.k + '_sign', 3, ['PPP', 'PPP', ' S '], { P: '=' + w.planks, S: 'stick' }); R(w.k + '_hanging_sign', 6, ['C C', 'LLL', 'LLL'], { C: 'chain', L: sl }); }
  for (const c of COLORDATA()) R(c[0] + '_banner', 1, ['WWW', 'WWW', ' S '], { W: c[0] === 'white' ? 'wool' : c[0] + '_wool', S: 'stick' });
  R('item_frame', 1, ['SSS', 'SLS', 'SSS'], { S: 'stick', L: 'leather' }); RECIPES.push(RSL('glow_item_frame', 1, ['item_frame', 'glow_ink_sac']));
  R('painting', 1, ['SSS', 'SWS', 'SSS'], { S: 'stick', W: '#wool' }); R('armor_stand', 1, ['SSS', ' S ', 'SBS'], { S: 'stick', B: 'smooth_stone_slab' });
  if (!GROUPS['#wool']) GROUPS['#wool'] = COLORDATA().map(c => c[0] === 'white' ? 'wool' : c[0] + '_wool').filter(k => IT[k] !== undefined);
  for (let i = RECIPES.length - 1; i >= r0; i--) { const rr = RECIPES[i]; const specs = rr.items || Object.values(rr.key || {}); if (specs.some(sp => sp[0] !== '#' && sp !== 'planks' && (sp[0] === '=' ? IT[sp.slice(1)] === undefined : IT[sp] === undefined))) RECIPES.splice(i, 1); }
}

// ================= SHAPED BLOCKS WITH BLOCK STATES (Minecraft rules) =================
// Stairs, slabs, fences, fence gates, walls, glass panes / iron bars, doors, trapdoors, buttons and pressure plates.
// A block with states is a "family": one block id per combination of its states (facing, half, open, hinge, powered,
// waterlogged ...). The first combination is the family's item; the rest are hidden and drop that item.
// Shapes that depend on neighbours (stair corners, fence / wall / pane connections, gates lowered into walls) are worked
// out when the chunk is drawn and when something collides, exactly like Minecraft derives them from neighbours.
// Waterlogging (Minecraft Java): stairs, slabs (not double), fences, walls, panes, iron bars and trapdoors can hold water.
// Doors, fence gates, buttons and pressure plates cannot.
// Box coordinates are in 1/16 block: [x0, y0, z0, x1, y1, z1]. Facing: 0 north (-z), 1 east (+x), 2 south (+z), 3 west (-x).

// ---- geometry helpers (used at run time by the mesher, collisions and the crosshair ray) ----
const SH_DV = [[0, -1], [1, 0], [0, 1], [-1, 0]];
// rotate a box a quarter turn clockwise (seen from above) n times around the block centre
function shRot(b, n) { let [x0, y0, z0, x1, y1, z1] = b; for (let i = 0; i < ((n % 4) + 4) % 4; i++) { const a0 = 16 - z1, a1 = 16 - z0, c0 = x0, c1 = x1; x0 = a0; x1 = a1; z0 = c0; z1 = c1; } const r = [x0, y0, z0, x1, y1, z1]; if (b.length > 6) r.push(b[6]); return r; }
function shFlipY(b) { const r = [b[0], 16 - b[4], b[2], b[3], 16 - b[1], b[5]]; if (b.length > 6) r.push(b[6]); return r; }
function famId(fk, st) { const F = FAMILY[fk]; if (!F) return 0; const id = F.ids[F.props.map(p => st[p]).join(',')]; return id === undefined ? F.base : id; }
function withState(id, change) { const d = BL[id]; if (!d || !d.fam) return id; return famId(d.fam, Object.assign({}, d.st, change)); }
const isShape = (id, kind) => { const d = BL[id]; return !!(d && d.shape === kind); };
// a full, solid block face that fences, walls, panes, buttons and doors attach to
function shFullCube(id) { const d = BL[id]; if (!d || !SOLID[id] || d.shape) return !!(d && d.shape === 'slab' && d.st.type === 'double'); if (d.render === 'cube') return true; return d.render === 'cutout' && !/leaves/.test(d.key); }
function shSturdy(id, face) { // face: 'up' | 'down' | 0..3 (the side of this block that faces out that way)
  const d = BL[id]; if (!d) return false; if (shFullCube(id)) return true; if (!d.shape) return false;
  if (d.shape === 'slab') return d.st.type === 'double' || (face === 'up' && d.st.type === 'top') || (face === 'down' && d.st.type === 'bottom');
  if (d.shape === 'stairs') return (face === 'up' && d.st.half === 'top') || (face === 'down' && d.st.half === 'bottom') || face === d.st.facing;
  return false;
}
// MC stair shapes
function stairShape(st, x, y, z, get) {
  const f = st.facing; const [bx, bz] = SH_DV[f]; const behind = BL[get(x + bx, y, z + bz)];
  const other = (id) => BL[id];
  const canTake = (face) => { const o = other(get(x + SH_DV[face][0], y, z + SH_DV[face][1])); return !(o && o.shape === 'stairs') || o.st.facing !== f || o.st.half !== st.half; };
  if (behind && behind.shape === 'stairs' && behind.st.half === st.half) { const f1 = behind.st.facing; if ((f1 & 1) !== (f & 1) && canTake((f1 + 2) % 4)) return f1 === (f + 3) % 4 ? 'outer_left' : 'outer_right'; }
  const front = BL[get(x - bx, y, z - bz)];
  if (front && front.shape === 'stairs' && front.st.half === st.half) { const f2 = front.st.facing; if ((f2 & 1) !== (f & 1) && canTake(f2)) return f2 === (f + 3) % 4 ? 'inner_left' : 'inner_right'; }
  return 'straight';
}
function stairTop(shape) { switch (shape) { case 'outer_left': return [[0, 8, 0, 8, 16, 8]]; case 'outer_right': return [[8, 8, 0, 16, 16, 8]]; case 'inner_left': return [[0, 8, 0, 16, 16, 8], [0, 8, 8, 8, 16, 16]]; case 'inner_right': return [[0, 8, 0, 16, 16, 8], [8, 8, 8, 16, 16, 16]]; default: return [[0, 8, 0, 16, 16, 8]]; } }
function stairBoxes(st, shape) { let bs = [[0, 0, 0, 16, 8, 16], ...stairTop(shape)].map(b => shRot(b, st.facing)); if (st.half === 'top') bs = bs.map(shFlipY); return bs; }
// what a fence / wall / pane connects to on side `dir`
function gateAlong(d, dir) { return d && d.shape === 'gate' && (d.st.facing & 1) !== (dir & 1); }
function fenceLinks(d0, x, y, z, get) { const out = [0, 0, 0, 0]; for (let f = 0; f < 4; f++) { const n = get(x + SH_DV[f][0], y, z + SH_DV[f][1]); const d = BL[n];
  out[f] = (d && d.shape === 'fence' && d.fenceKind === d0.fenceKind) || gateAlong(d, f) || shSturdy(n, (f + 2) % 4) ? 1 : 0; } return out; }
function wallLinks(x, y, z, get) { const out = [0, 0, 0, 0]; for (let f = 0; f < 4; f++) { const n = get(x + SH_DV[f][0], y, z + SH_DV[f][1]); const d = BL[n];
  out[f] = (d && (d.shape === 'wall' || d.shape === 'pane')) || gateAlong(d, f) || shSturdy(n, (f + 2) % 4) ? 1 : 0; } return out; }
function paneLinks(x, y, z, get) { const out = [0, 0, 0, 0]; for (let f = 0; f < 4; f++) { const n = get(x + SH_DV[f][0], y, z + SH_DV[f][1]); const d = BL[n];
  out[f] = (d && (d.shape === 'pane' || d.shape === 'wall')) || shSturdy(n, (f + 2) % 4) ? 1 : 0; } return out; }
// boxes of a shaped block. which: 'r' drawn, 'c' collision (may reach 24/16 high), 's' crosshair outline
function shapeBoxes(id, x, y, z, get, which) {
  const d = BL[id]; const st = d.st;
  switch (d.shape) {
    case 'stairs': return stairBoxes(st, stairShape(st, x, y, z, get));
    case 'fence': { const L = fenceLinks(d, x, y, z, get); const bs = [which === 'c' ? [6, 0, 6, 10, 24, 10] : [6, 0, 6, 10, 16, 10]];
      for (let f = 0; f < 4; f++) if (L[f]) { if (which === 'r') { bs.push(shRot([7, 12, 0, 9, 15, 6], f), shRot([7, 6, 0, 9, 9, 6], f)); } else if (which === 'c') bs.push(shRot([6, 0, 0, 10, 24, 6], f)); else bs.push(shRot([7, 6, 0, 9, 15, 6], f)); }
      return bs; }
    case 'wall': { const L = wallLinks(x, y, z, get); const above = get(x, y + 1, z); const ad = BL[above]; const straight = (L[0] && L[2] && !L[1] && !L[3]) || (L[1] && L[3] && !L[0] && !L[2]);
      const post = !straight || (ad && ad.shape === 'wall') || !(L[0] || L[1] || L[2] || L[3]); const H = which === 'c' ? 24 : 0; const bs = [];
      if (post) bs.push([4, 0, 4, 12, H || 16, 12]);
      for (let f = 0; f < 4; f++) if (L[f]) { const tall = shFullCube(above) || (ad && ad.shape === 'wall'); bs.push(shRot([5, 0, 0, 11, H || (tall ? 16 : 14), 8], f)); }
      return bs; }
    case 'pane': { const L = paneLinks(x, y, z, get); const bs = [[7, 0, 7, 9, 16, 9]]; for (let f = 0; f < 4; f++) if (L[f]) bs.push(shRot([7, 0, 0, 9, 16, 7], f)); return bs; }
    case 'gate': { if (which === 'c') return st.open ? [] : [shRot([0, 0, 6, 16, 24, 10], st.facing)]; if (which === 's') return [shRot([0, 0, 6, 16, 16, 10], st.facing)];
      let bs = d.rb; const ax = (st.facing + 1) % 4; const l = BL[get(x + SH_DV[ax][0], y, z + SH_DV[ax][1])], r = BL[get(x - SH_DV[ax][0], y, z - SH_DV[ax][1])];
      if ((l && l.shape === 'wall') || (r && r.shape === 'wall')) bs = bs.map(b => [b[0], b[1] - 3, b[2], b[3], b[4] - 3, b[5]]);
      return bs; }
    default: return which === 'c' ? d.cb : which === 's' ? d.sb : d.rb;
  }
}

// ---- block definitions (called from 01_core.js while blocks are being defined) ----
function defineShapeBlocks() {
  const rot = shRot, flip = shFlipY; const shadeC = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
  // the old one-box oak fence and solid iron bars become real connecting blocks (old saves load into the new ones)
  for (const k of ['oak_fence', 'iron_bars']) { const old = BL[B[k.toUpperCase()]]; if (old) { old.key = 'legacy_' + k; old.hidden = true; delete B[k.toUpperCase()]; B['LEGACY_' + k.toUpperCase()] = old.id; } }
  // a family: every combination of `props` becomes a block; mk(st) gives that block's own settings
  const fam = (key, name, kind, props, base, mk) => {
    const names = Object.keys(props); const F = FAMILY[key] = { kind, props: names, ids: {}, base: 0, mat: base.mat };
    const combos = [{}]; for (const p of names) { const next = []; for (const c of combos) for (const v of props[p]) next.push(Object.assign({}, c, { [p]: v })); combos.length = 0; combos.push(...next); }
    combos.forEach((st, i) => { const o = Object.assign({}, base, mk(st)); o.fam = key; o.st = st; o.shape = kind; o.hidden = i > 0 || !!base.hidden; if (o.drop === undefined) o.drop = key; if (st.wl && o.wlb !== 0) o.wlb = 1;
      const id = defBlock(i ? key + '#' + i : key, name, o); F.ids[names.map(p => st[p]).join(',')] = id; if (!i) F.base = id; });
    return F;
  };
  const M = (k) => BL[B[k.toUpperCase()]];
  const matBase = (m, extra) => Object.assign({ tex: m.tex, hardness: m.hardness, tool: m.tool, tier: m.tier, snd: m.snd, mine: /plank/.test(m.key) ? 'axe' : (m.tool === 'pick' ? 'pick' : m.mine), mat: m.key, opaque: false }, extra || {});
  const FAC = [3, 0, 1, 2]; // west first: the item icon shows the steps rising to the left, like Minecraft's
  const STAIRS = (key, name, m) => fam(key, name, 'stairs', { facing: FAC, half: ['bottom', 'top'], wl: [0, 1] }, matBase(m, { render: 'boxes' }), (st) => ({ boxes: stairBoxes(st, 'straight') }));
  const SLAB = (key, name, m) => fam(key, name, 'slab', { type: ['bottom', 'top', 'double'], wl: [0, 1] }, matBase(m, { render: 'boxes' }), (st) => {
    if (st.type === 'double') { const f = [[0, 0, 0, 16, 16, 16]]; return { render: 'cube', opaque: !!m.opaque, drop: (r) => [key, 2], boxes: undefined, rb: f, cb: f, sb: f, wlb: 0 }; }
    const b = st.type === 'bottom' ? [0, 0, 0, 16, 8, 16] : [0, 8, 0, 16, 16, 16]; return { boxes: [b], rb: [b], cb: [b], sb: [b] }; });
  const WALL = (key, name, m) => fam(key, name, 'wall', { wl: [0, 1] }, matBase(m, { render: 'boxes', hardness: m.hardness }), () => ({ boxes: [[4, 0, 4, 12, 16, 12], [5, 0, 0, 11, 14, 4], [5, 0, 12, 11, 14, 16]] }));
  const FENCE = (key, name, m, kind) => fam(key, name, 'fence', { wl: [0, 1] }, matBase(m, { render: 'boxes', fenceKind: kind, hardness: 2 }), () => ({ boxes: [[6, 0, 0, 10, 16, 4], [6, 0, 12, 10, 16, 16], [7, 12, 4, 9, 15, 12], [7, 6, 4, 9, 9, 12]] }));
  const GATE_C = [[0, 5, 7, 2, 16, 9], [14, 5, 7, 16, 16, 9], [6, 6, 7, 8, 15, 9], [8, 6, 7, 10, 15, 9], [2, 6, 7, 6, 9, 9], [2, 12, 7, 6, 15, 9], [10, 6, 7, 14, 9, 9], [10, 12, 7, 14, 15, 9]];
  const GATE_O = [[0, 5, 7, 2, 16, 9], [14, 5, 7, 16, 16, 9], [0, 6, 13, 2, 15, 15], [14, 6, 13, 16, 15, 15], [0, 6, 9, 2, 9, 13], [0, 12, 9, 2, 15, 13], [14, 6, 9, 16, 9, 13], [14, 12, 9, 16, 15, 13]];
  const GATE = (key, name, m) => fam(key, name, 'gate', { facing: [2, 3, 0, 1], open: [0, 1] }, matBase(m, { render: 'boxes', hardness: 2 }), (st) => { const r = (st.open ? GATE_O : GATE_C).map(b => rot(b, st.facing + 2)); return { boxes: r, rb: r, solid: !st.open }; });
  const PANE = (key, name, tex, extra) => fam(key, name, 'pane', { wl: [0, 1] }, Object.assign({ tex, render: 'boxes', opaque: false, hardness: 0.3, snd: 'glass', flatIcon: true }, extra || {}), () => ({ boxes: [[7, 0, 0, 9, 16, 16]] }));
  // doors: Minecraft's door boxes by direction; closed uses the facing, open swings to the hinge side
  const DOOR_AABB = [[0, 0, 13, 16, 16, 16], [0, 0, 0, 3, 16, 16], [0, 0, 0, 16, 16, 3], [13, 0, 0, 16, 16, 16]];
  const DOOR = (key, name, texTop, texBot, item, extra) => fam(key, name, 'door', { facing: [1, 2, 3, 0], half: ['lower', 'upper'], open: [0, 1], hinge: ['left', 'right'] },
    Object.assign({ render: 'boxes', opaque: false, solid: true, hardness: 3, snd: 'wood', mine: 'axe', iconTile: item }, extra || {}),
    (st) => { const dir = st.open ? (st.hinge === 'right' ? (st.facing + 3) % 4 : (st.facing + 1) % 4) : st.facing; const b = [DOOR_AABB[dir]]; return { tex: st.half === 'upper' ? texTop : texBot, boxes: b, rb: b, cb: b, sb: b, solid: !st.open }; });
  const TRAP_OPEN = [[0, 0, 13, 16, 16, 16], [0, 0, 0, 3, 16, 16], [0, 0, 0, 16, 16, 3], [13, 0, 0, 16, 16, 16]];
  const TRAPDOOR = (key, name, tex, extra) => fam(key, name, 'trapdoor', { facing: [0, 1, 2, 3], half: ['bottom', 'top'], open: [0, 1], wl: [0, 1] },
    Object.assign({ tex, render: 'boxes', opaque: false, hardness: 3, snd: 'wood', mine: 'axe' }, extra || {}),
    (st) => { const b = [st.open ? TRAP_OPEN[st.facing] : st.half === 'bottom' ? [0, 0, 0, 16, 3, 16] : [0, 13, 0, 16, 16, 16]]; return { boxes: b, rb: b, cb: b, sb: b, solid: !st.open }; });
  const BUTTON = (key, name, m, wood) => fam(key, name, 'button', { face: ['wall', 'floor', 'ceiling'], facing: [3, 0, 1, 2], powered: [0, 1] },
    matBase(m, { render: 'boxes', solid: false, hardness: 0.5, wood: !!wood, noCollide: true }),
    (st) => { let b; const d = st.powered ? 1 : 2;
      if (st.face === 'wall') b = rot([5, 6, 16 - d, 11, 10, 16], st.facing); // sticks out of the wall behind it, toward `facing`
      else { const ns = st.facing % 2 === 0; b = ns ? [5, 0, 6, 11, d, 10] : [6, 0, 5, 10, d, 11]; if (st.face === 'ceiling') b = flip(b); }
      return { boxes: [[3, 0, 4, 13, 5, 12]], rb: [b], cb: [], sb: [b] }; }); // (boxes: the bigger inventory icon)
  const PLATE = (key, name, m, kind) => fam(key, name, 'plate', { powered: [0, 1] }, matBase(m, { render: 'boxes', solid: false, hardness: 0.5, plate: kind, noCollide: true }),
    (st) => { const b = [1, 0, 1, 15, st.powered ? 0.5 : 1, 15]; return { boxes: [b], rb: [b], cb: [], sb: [b] }; });

  // ---- textures: doors and trapdoors (original pixel art) ----
  const doorPaint = (base, dark, hi, kind, top) => (set, r) => {
    each((x, y) => { let c = mixc(base, hi, ((x * 7 + y * 3) % 5) / 10); if (x % 4 === 0) c = shadeC(c, 0.86); set(x, y, vary(c, r, 5)); });
    for (let i = 0; i < 16; i++) { set(0, i, dark); set(15, i, dark); } for (let i = 0; i < 16; i++) { if (top) set(i, 0, dark); else set(i, 15, dark); }
    if (kind === 'oak') { if (top) { for (const [x0, y0] of [[3, 3], [9, 3], [3, 9], [9, 9]]) for (let y = y0; y < y0 + 4; y++) for (let x = x0; x < x0 + 4; x++) set(x, y, [0, 0, 0], 0); for (let i = 2; i < 14; i++) { set(i, 2, dark); set(i, 8, dark); set(i, 13, dark); set(2, i, dark); set(8, i, dark); set(13, i, dark); } }
      else { for (let i = 2; i < 14; i++) { set(i, 2, dark); set(i, 13, dark); set(2, i, dark); set(13, i, dark); } for (let i = 3; i < 13; i++) { set(i, i, shadeC(dark, 1.1)); set(15 - i, i, shadeC(dark, 1.1)); } set(12, 1, [40, 40, 44]); set(12, 0, [150, 150, 156]); } }
    else if (kind === 'dark_oak') { if (top) { for (let y = 3; y < 13; y += 3) for (let x = 3; x < 13; x += 3) { set(x, y, [0, 0, 0], 0); set(x + 1, y, [0, 0, 0], 0); set(x, y + 1, [0, 0, 0], 0); set(x + 1, y + 1, [0, 0, 0], 0); } }
      else { for (let y = 2; y < 14; y++) { set(4, y, dark); set(11, y, dark); } for (let x = 2; x < 14; x++) { set(x, 7, dark); } set(12, 1, [150, 140, 90]); } }
    else if (kind === 'iron') { each((x, y) => { if (x > 0 && x < 15) { let c = mixc([196, 196, 200], [222, 222, 226], ((x + y) % 3) / 3); if (x === 1 || x === 14) c = [168, 168, 172]; set(x, y, vary(c, r, 3)); } });
      for (let i = 0; i < 16; i++) { set(0, i, [120, 120, 124]); set(15, i, [120, 120, 124]); } if (top) { for (let y = 3; y < 7; y++) for (let x = 4; x < 12; x++) set(x, y, [0, 0, 0], 0); for (let x = 3; x < 13; x++) { set(x, 2, [130, 130, 134]); set(x, 7, [130, 130, 134]); } for (let y = 3; y < 7; y++) { set(3, y, [130, 130, 134]); set(12, y, [130, 130, 134]); } }
      else { for (let x = 2; x < 14; x++) { set(x, 5, [150, 150, 154]); set(x, 10, [150, 150, 154]); } for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) set(x, y, [110, 110, 114]); set(12, 1, [90, 90, 94]); } }
  };
  const trapPaint = (base, dark, hi, kind) => (set, r) => {
    each((x, y) => { let c = mixc(base, hi, ((x * 5 + y * 3) % 7) / 14); if (y % 4 === 0) c = shadeC(c, 0.88); set(x, y, vary(c, r, 5)); });
    for (let i = 0; i < 16; i++) { set(i, 0, dark); set(i, 15, dark); set(0, i, dark); set(15, i, dark); }
    if (kind === 'oak') { for (const [x0, y0] of [[2, 2], [9, 2], [2, 9], [9, 9]]) for (let y = y0; y < y0 + 5; y++) for (let x = x0; x < x0 + 5; x++) if ((x + y) % 2 === 0 || x === x0 + 2 || y === y0 + 2) set(x, y, [0, 0, 0], 0); }
    else if (kind === 'dark_oak') { for (let y = 3; y < 13; y += 4) for (let x = 3; x < 13; x += 4) { set(x, y, [0, 0, 0], 0); set(x + 1, y, [0, 0, 0], 0); set(x, y + 1, [0, 0, 0], 0); set(x + 1, y + 1, [0, 0, 0], 0); } }
    else if (kind === 'iron') { each((x, y) => { if (x && y && x < 15 && y < 15) set(x, y, vary([206, 206, 210], r, 3)); }); for (let y = 2; y < 14; y += 3) for (let x = 2; x < 14; x += 3) { set(x, y, [0, 0, 0], 0); set(x + 1, y, [0, 0, 0], 0); set(x, y + 1, [0, 0, 0], 0); set(x + 1, y + 1, [0, 0, 0], 0); } }
  };
  const doorItem = (top, bot) => (set, r) => { const T = makeTileTmp(top), Bt = makeTileTmp(bot); for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) { const src = y < 8 ? T : Bt; const sx = x * 2, sy = (y % 8) * 2; const c = src(sx, sy); if (c[3] > 0) set(x + 4, y, c); } };
  // paint into a scratch tile so the item icon can be made from the door halves
  function makeTileTmp(painter) { const px = []; const r = mulberry32(99); painter((x, y, c, a = 255) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x > 15 || y > 15) return; px[y * 16 + x] = [clamp(c[0], 0, 255), clamp(c[1], 0, 255), clamp(c[2], 0, 255), a]; }, r); return (x, y) => px[y * 16 + x] || [0, 0, 0, 0]; }
  const WOODS = {}; for (const w of WOODDATA()) { const b = w.k === 'oak' ? [162, 128, 76] : w.k === 'dark_oak' ? [74, 50, 26] : w.pl; WOODS[w.k] = { base: b, dark: [b[0] * 0.58, b[1] * 0.58, b[2] * 0.58], hi: [b[0] * 1.14, b[1] * 1.14, b[2] * 1.14], planks: w.planks, name: w.name, style: w.k === 'oak' ? 'oak' : w.k === 'dark_oak' ? 'dark_oak' : w.door === 'grid' ? 'dark_oak' : 'oak', nether: !!w.nether }; }
  for (const w in WOODS) { const W = WOODS[w]; const tp = doorPaint(W.base, W.dark, W.hi, W.style, true), bp = doorPaint(W.base, W.dark, W.hi, W.style, false);
    makeTile(w + '_door_top', tp); makeTile(w + '_door_bottom', bp); makeTile(w + '_door_item', doorItem(tp, bp)); makeTile(w + '_trapdoor', trapPaint(W.base, W.dark, W.hi, W.style)); }
  { const tp = doorPaint([206, 206, 210], [120, 120, 124], [226, 226, 230], 'iron', true), bp = doorPaint([206, 206, 210], [120, 120, 124], [226, 226, 230], 'iron', false);
    makeTile('iron_door_top', tp); makeTile('iron_door_bottom', bp); makeTile('iron_door_item', doorItem(tp, bp)); makeTile('iron_trapdoor', trapPaint([206, 206, 210], [120, 120, 124], [226, 226, 230], 'iron')); }

  // ---- the blocks ----
  const STONE_SETS = [ // [key prefix, material, name, walls?]
    ['stone', 'stone', 'Stone', 0], ['cobblestone', 'cobblestone', 'Cobblestone', 1], ['mossy_cobblestone', 'mossy_cobblestone', 'Mossy Cobblestone', 1],
    ['stone_brick', 'stone_bricks', 'Stone Brick', 1], ['mossy_stone_brick', 'mossy_stone_bricks', 'Mossy Stone Brick', 1], ['granite', 'granite', 'Granite', 1], ['diorite', 'diorite', 'Diorite', 1], ['andesite', 'andesite', 'Andesite', 1],
    ['cobbled_deepslate', 'cobbled_deepslate', 'Cobbled Deepslate', 1], ['deepslate_brick', 'deepslate_bricks', 'Deepslate Brick', 1], ['deepslate_tile', 'deepslate_tiles', 'Deepslate Tile', 1],
    ['tuff', 'tuff', 'Tuff', 1], ['tuff_brick', 'tuff_bricks', 'Tuff Brick', 1], ['brick', 'brick', 'Brick', 1], ['sandstone', 'sandstone', 'Sandstone', 1],
    ['prismarine', 'prismarine', 'Prismarine', 1], ['prismarine_brick', 'prismarine_bricks', 'Prismarine Brick', 0], ['dark_prismarine', 'dark_prismarine', 'Dark Prismarine', 0],
    ['nether_brick', 'nether_bricks', 'Nether Brick', 1], ['blackstone', 'blackstone', 'Blackstone', 1], ['polished_blackstone_brick', 'polished_blackstone_bricks', 'Polished Blackstone Brick', 1],
    ['end_stone_brick', 'end_stone_bricks', 'End Stone Brick', 1], ['purpur', 'purpur_block', 'Purpur', 0], ['quartz', 'quartz_block', 'Quartz', 0],
  ];
  for (const w in WOODS) { const m = M(WOODS[w].planks); if (!m) continue; const n = WOODS[w].name; const set = { mat: m.key, wood: !WOODS[w].nether, timber: true, keys: [] };
    STAIRS(w + '_stairs', n + ' Stairs', m); SLAB(w + '_slab', n + ' Slab', m); FENCE(w + '_fence', n + ' Fence', m, 'wood'); GATE(w + '_fence_gate', n + ' Fence Gate', m);
    DOOR(w + '_door', n + ' Door', w + '_door_top', w + '_door_bottom', w + '_door_item', { wood: true });
    TRAPDOOR(w + '_trapdoor', n + ' Trapdoor', w + '_trapdoor', { wood: true }); BUTTON(w + '_button', n + ' Button', m, true); PLATE(w + '_pressure_plate', n + ' Pressure Plate', m, 'wood');
    set.keys.push(...['_stairs', '_slab', '_fence', '_fence_gate', '_door', '_trapdoor', '_pressure_plate', '_button'].map(s => w + s)); SHAPE_SETS.push(set); }
  STONE_SETS.push(['bamboo_mosaic', 'bamboo_mosaic', 'Bamboo Mosaic', 0], ...EXTRA_STONE_SETS());
  for (const [k, mk, n, wall, slabOnly] of STONE_SETS) { const m = M(mk); if (!m) continue; const set = { mat: mk, wood: mk === 'bamboo_mosaic', timber: mk === 'bamboo_mosaic', keys: slabOnly ? [k + '_slab'] : [k + '_stairs', k + '_slab'] };
    if (!slabOnly) STAIRS(k + '_stairs', n + ' Stairs', m); SLAB(k + '_slab', n + ' Slab', m); if (wall) { WALL(k + '_wall', n + ' Wall', m); set.keys.push(k + '_wall'); } SHAPE_SETS.push(set); }
  { const nb = M('nether_bricks'); FENCE('nether_brick_fence', 'Nether Brick Fence', nb, 'nether'); BL[B.NETHER_BRICK_FENCE].mine = 'pick'; SHAPE_SETS.push({ mat: 'nether_bricks', keys: ['nether_brick_fence'] }); }
  { const pb = M('polished_blackstone'); if (pb) { BUTTON('polished_blackstone_button', 'Polished Blackstone Button', pb, false); PLATE('polished_blackstone_pressure_plate', 'Polished Blackstone Pressure Plate', pb, 'stone'); SHAPE_SETS.push({ mat: 'polished_blackstone', keys: ['polished_blackstone_pressure_plate', 'polished_blackstone_button'] }); } }
  { const st = M('stone'); BUTTON('stone_button', 'Stone Button', st, false); PLATE('stone_pressure_plate', 'Stone Pressure Plate', st, 'stone'); SHAPE_SETS.push({ mat: 'stone', keys: ['stone_pressure_plate', 'stone_button'] }); }
  PLATE('light_weighted_pressure_plate', 'Light Weighted Pressure Plate', M('gold_block'), 'light'); PLATE('heavy_weighted_pressure_plate', 'Heavy Weighted Pressure Plate', M('iron_block'), 'heavy');
  SHAPE_SETS.push({ mat: 'gold_block', keys: ['light_weighted_pressure_plate'] }, { mat: 'iron_block', keys: ['heavy_weighted_pressure_plate'] });
  DOOR('iron_door', 'Iron Door', 'iron_door_top', 'iron_door_bottom', 'iron_door_item', { hardness: 5, snd: 'stone', mine: 'pick', tool: 'pick', tier: 1, iron: true });
  TRAPDOOR('iron_trapdoor', 'Iron Trapdoor', 'iron_trapdoor', { hardness: 5, snd: 'stone', mine: 'pick', tool: 'pick', tier: 1, iron: true });
  SHAPE_SETS.push({ mat: 'iron_block', keys: ['iron_door', 'iron_trapdoor'] });
  // copper: cut copper stairs and slabs, copper doors and trapdoors, in every age, waxed or not
  for (const cs of COPPER_SHAPES()) { const m = M(cs.cut); if (!m) continue; const ex = { snd: 'stone', mine: 'pick', tool: 'pick', tier: 1, hardness: 3 };
    STAIRS(cs.stairs, cs.name + 'Cut Copper Stairs', m); SLAB(cs.slab, cs.name + 'Cut Copper Slab', m); SHAPE_SETS.push({ mat: cs.cut, keys: [cs.stairs, cs.slab] });
    for (const n of [cs.door + '_top', cs.door + '_bottom', cs.door + '_item', cs.trapdoor]) if (TILE[n] === undefined) makeTile(n, (set) => each((x, y) => set(x, y, CUDATA().cols[cs.a])));
    DOOR(cs.door, cs.name + 'Copper Door', cs.door + '_top', cs.door + '_bottom', cs.door + '_item', ex); TRAPDOOR(cs.trapdoor, cs.name + 'Copper Trapdoor', cs.trapdoor, ex); }
  PANE('glass_pane', 'Glass Pane', 'glass', { render: 'boxes', cullSame: false });
  for (const [c, N] of COLORDATA()) { PANE(c + '_stained_glass_pane', N + ' Stained Glass Pane', c + '_stained_glass', { translucent: true, drop: null }); SHAPE_SETS.push({ mat: c + '_stained_glass', keys: [c + '_stained_glass_pane'] }); }
  PANE('iron_bars', 'Iron Bars', 'iron_bars', { hardness: 5, snd: 'stone', mine: 'pick', tool: 'pick', tier: 1 });
  SHAPE_SETS.push({ mat: 'glass', keys: ['glass_pane'] }, { mat: 'iron_block', keys: ['iron_bars'] });
}

// ---- per-id tables used at run time ----
const SHAPED = new Uint8Array(ITEM_BASE), SKYB = new Uint8Array(ITEM_BASE);
for (const d of BL) { if (!d) continue; if (d.shape) SHAPED[d.id] = 1; SKYB[d.id] = OPAQUE[d.id] || d.shape === 'slab' || d.shape === 'stairs' ? 1 : 0;
  if (d.wlb) { FKIND[d.id] = 1; FLEVEL[d.id] = 0; FH[d.id] = 0.875; } }

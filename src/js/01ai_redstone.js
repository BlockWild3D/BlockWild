// ================= REDSTONE BLOCKS (Minecraft) =================
// Redstone dust (power 0-15), repeaters (1-4 ticks, lockable), comparators (compare / subtract, read containers),
// redstone torches (turn off when the block they hang on is powered), redstone lamps, pistons and sticky pistons,
// observers, dispensers, droppers, hoppers, note blocks, daylight detectors, target blocks, slime and honey blocks,
// trapped chests and ender chests. The signal rules live in 81_redstone.js. Original pixel art.
// Six-way facing: 0 up, 1 down, 2 north (-z), 3 south (+z), 4 west (-x), 5 east (+x).
function rot6(b, f) { // turn a box modelled pointing up (+y) so it points along facing f
  const t = (x, y, z) => f === 0 ? [x, y, z] : f === 1 ? [x, 16 - y, z] : f === 2 ? [x, z, 16 - y] : f === 3 ? [x, 16 - z, y] : f === 4 ? [16 - y, z, x] : [y, z, x];
  const a = t(b[0], b[1], b[2]), c = t(b[3], b[4], b[5]); const r = [Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.min(a[2], c[2]), Math.max(a[0], c[0]), Math.max(a[1], c[1]), Math.max(a[2], c[2])]; if (b.length > 6) r.push(b[6]); return r; }
function f6vec(f) { return [[0, 1, 0], [0, -1, 0], [0, 0, -1], [0, 0, 1], [-1, 0, 0], [1, 0, 0]][f]; }
function f6face(f) { return [2, 3, 5, 4, 1, 0][f]; } // the mesh face (+x 0, -x 1, +y 2, -y 3, +z 4, -z 5) that looks along facing f
// how many quarter turns each face's texture needs so that its top edge points along world direction dv
function uvRotToward(dv) { const FC = [[[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]]];
  const UV = [0, 0, 1, 1]; return FC.map((cs) => { let best = 0, bd = -1e9; for (let r = 0; r < 4; r++) { let dot = 0; for (let k = 0; k < 4; k++) { const s = UV[(k + r) & 3] ? 1 : -1; dot += s * (cs[k][0] * dv[0] + cs[k][1] * dv[1] + cs[k][2] * dv[2]); } if (dot > bd + 1e-6) { bd = dot; best = r; } } return best; }); }
function defineRedstoneBlocks() {
  const ph = (n, c, a) => { if (TILE[n] === undefined) makeTile(n, (set) => each((x, y) => set(x, y, c, a === undefined ? 255 : a))); return n; };
  const DV = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const strip = (o) => { delete o.id; delete o.key; delete o.texIds; return o; };
  // a cube with a front, a back and four sides that can face any of six ways; `exs` is an extra on / off state
  const faced6 = (key, name, front, back, side, top, o, exs, base, rotSides) => { const ids = {}; exs = exs || [0];
    for (let f = 0; f < 6; f++) for (const ex of exs) {
      const tex = [side, side, side, side, side, side]; if (f >= 2 && top) { tex[2] = top; tex[3] = top; }
      tex[f6face(f)] = typeof front === 'function' ? front(ex) : front; tex[f6face(f ^ 1)] = typeof back === 'function' ? back(ex) : back;
      const first = f === base && ex === exs[0];
      ids[f + ',' + ex] = defBlock(first ? key : key + '#' + f + '_' + ex, name, Object.assign({ tex, hidden: !first, drop: key, fam: key, st: { facing: f, ex }, facing6: f, ex, uvRot: rotSides ? uvRotToward(f6vec(f)) : null }, o)); }
    FAMILY[key] = { kind: 'facing6', props: ['facing', 'ex'], ids, base: ids[base + ',' + exs[0]], mat: key }; return ids; };
  // ---- redstone dust: 16 power levels; its arms are worked out from its neighbours (81_redstone.js) ----
  for (let p = 0; p < 16; p++) defBlock(p ? 'redstone_wire#' + p : 'redstone_wire', 'Redstone Dust', { tex: ph('redstone_dust_' + p, [90 + p * 10, 10, 10], 0), render: 'boxes', boxes: [[5, 0, 5, 11, 0.25, 11]], rb: [[5, 0, 5, 11, 0.25, 11]], cb: [], sb: [[0, 0, 0, 16, 1, 16]], shape: 'wire', st: { power: p }, solid: false, opaque: false, hardness: 0, snd: 'stone', hidden: true, drop: 'redstone', wire: true, power: 0, wirePower: p, support: 'floor', noCollide: true, noTarget: false });
  FAMILY.redstone_wire = { kind: 'wire', props: ['power'], ids: {}, base: B.REDSTONE_WIRE }; for (let p = 0; p < 16; p++) FAMILY.redstone_wire.ids[p] = B[(p ? 'redstone_wire#' + p : 'redstone_wire').toUpperCase()];
  // ---- repeaters and comparators: a smooth stone slab with little torches; facing is the side the signal leaves from ----
  ph('repeater', [160, 160, 160]); ph('repeater_on', [170, 160, 160]); ph('comparator', [160, 160, 160]); ph('comparator_on', [170, 160, 160]);
  ph('rs_stick', [120, 90, 50]); ph('rs_tip_on', [255, 60, 40]); ph('rs_tip_off', [90, 26, 22]);
  const post = (x, z, on) => [[x, 2, z, x + 2, 5, z + 2, TILE.rs_stick], [x, 5, z, x + 2, 7, z + 2, TILE[on ? 'rs_tip_on' : 'rs_tip_off']]];
  const slab = [0, 0, 0, 16, 2, 16];
  for (const f of [0, 1, 2, 3]) for (let dl = 1; dl <= 4; dl++) for (const on of [0, 1]) for (const lk of [0, 1]) {
    const bs = [slab, ...post(7, 2, on), ...(lk ? [[2, 2, 4 + dl * 2, 14, 4, 6 + dl * 2, TILE.bedrock]] : post(7, 4 + dl * 2, on))].map(b => shRot(b, f)); const first = f === 0 && dl === 1 && !on && !lk;
    defBlock(first ? 'repeater' : 'repeater#' + [f, dl, on, lk].join('_'), 'Redstone Repeater', { tex: { s: 'smooth_stone', t: on ? 'repeater_on' : 'repeater', b: 'smooth_stone' }, render: 'boxes', boxes: bs, rb: bs, cb: [slab], sb: [slab], shape: 'diode', st: { facing: f, delay: dl, powered: on, locked: lk }, uvRot: uvRotToward([DV[f][0], 0, DV[f][1]]), solid: true, opaque: false, hardness: 0, snd: 'stone', hidden: !first, drop: 'repeater', fam: 'repeater', repeater: true, support: 'floor', power: 0 }); }
  FAMILY.repeater = { kind: 'diode', props: ['facing', 'delay', 'powered', 'locked'], ids: {}, base: B.REPEATER }; for (const d of BL) if (d && d.fam === 'repeater') FAMILY.repeater.ids[[d.st.facing, d.st.delay, d.st.powered, d.st.locked].join(',')] = d.id;
  for (const f of [0, 1, 2, 3]) for (const mode of ['compare', 'subtract']) for (const on of [0, 1]) {
    const bs = [slab, ...post(3, 11, on), ...post(11, 11, on), ...post(7, 2, mode === 'subtract')].map(b => shRot(b, f)); const first = f === 0 && mode === 'compare' && !on;
    defBlock(first ? 'comparator' : 'comparator#' + [f, mode, on].join('_'), 'Redstone Comparator', { tex: { s: 'smooth_stone', t: on ? 'comparator_on' : 'comparator', b: 'smooth_stone' }, render: 'boxes', boxes: bs, rb: bs, cb: [slab], sb: [slab], shape: 'diode', st: { facing: f, mode, powered: on }, uvRot: uvRotToward([DV[f][0], 0, DV[f][1]]), solid: true, opaque: false, hardness: 0, snd: 'stone', hidden: !first, drop: 'comparator', fam: 'comparator', comparator: true, support: 'floor', power: 0 }); }
  FAMILY.comparator = { kind: 'diode', props: ['facing', 'mode', 'powered'], ids: {}, base: B.COMPARATOR }; for (const d of BL) if (d && d.fam === 'comparator') FAMILY.comparator.ids[[d.st.facing, d.st.mode, d.st.powered].join(',')] = d.id;
  // ---- a burnt-out / switched-off redstone torch ----
  ph('redstone_torch_off', [100, 60, 40], 0);
  defBlock('redstone_torch_off', 'Redstone Torch', strip(Object.assign({}, BL[B.REDSTONE_TORCH], { tex: 'redstone_torch_off', light: 0, power: 0, hidden: true, drop: 'redstone_torch', torchOff: true })));
  BL[B.REDSTONE_TORCH].rsTorch = true; BL[B.REDSTONE_TORCH_OFF].rsTorch = true;
  // ---- redstone lamps ----
  defBlock('redstone_lamp', 'Redstone Lamp', { tex: ph('redstone_lamp', [120, 80, 50]), hardness: 0.3, snd: 'glass', lamp: true });
  defBlock('redstone_lamp_on', 'Redstone Lamp', { tex: ph('redstone_lamp_on', [240, 190, 120]), hardness: 0.3, snd: 'glass', lamp: true, lit: true, light: 1, hidden: true, drop: 'redstone_lamp' });
  // ---- pistons: the base faces six ways and is extended or not; the head is its own block ----
  ph('piston_top', [160, 130, 90]); ph('piston_top_sticky', [110, 190, 90]); ph('piston_side', [130, 120, 100]); ph('piston_bottom', [110, 110, 110]); ph('piston_inner', [90, 90, 90]); ph('piston_arm', [160, 130, 90]);
  for (const sticky of [false, true]) { const key = sticky ? 'sticky_piston' : 'piston'; const front = sticky ? 'piston_top_sticky' : 'piston_top';
    const ids = faced6(key, sticky ? 'Sticky Piston' : 'Piston', (ext) => ext ? 'piston_inner' : front, 'piston_bottom', 'piston_side', null, { hardness: 1.5, snd: 'stone', mine: 'pick', piston: true, sticky }, [0, 1], 0, true);
    FAMILY[key].heads = {};
    for (let f = 0; f < 6; f++) { const d = BL[ids[f + ',1']]; const body = [rot6([0, 0, 0, 16, 12, 16], f)]; Object.assign(d, { render: 'boxes', opaque: false, boxes: body, rb: body, cb: body, sb: body, shape: 'piston', extended: true });
      const hb = [rot6([0, 12, 0, 16, 16, 16], f), rot6([6, -4, 6, 10, 12, 10, TILE.piston_arm], f)]; const hc = [rot6([0, 12, 0, 16, 16, 16], f), rot6([6, 0, 6, 10, 12, 10], f)];
      const htex = ['piston_side', 'piston_side', 'piston_side', 'piston_side', 'piston_side', 'piston_side']; htex[f6face(f)] = front; htex[f6face(f ^ 1)] = front;
      FAMILY[key].heads[f] = defBlock(key + '_head#' + f, 'Piston Head', { tex: htex, render: 'boxes', boxes: hb, rb: hb, cb: hc, sb: [hc[0]], shape: 'piston_head', st: { facing: f }, opaque: false, hardness: 1.5, snd: 'stone', mine: 'pick', hidden: true, drop: null, pistonHead: true, sticky, facing6: f, uvRot: uvRotToward(f6vec(f)), baseKey: key }); } }
  // ---- observers, dispensers, droppers ----
  ph('observer_front', [110, 110, 110]); ph('observer_back', [90, 90, 90]); ph('observer_back_on', [150, 70, 60]); ph('observer_side', [100, 100, 100]); ph('observer_top', [100, 100, 100]);
  faced6('observer', 'Observer', 'observer_front', (on) => on ? 'observer_back_on' : 'observer_back', 'observer_side', 'observer_top', { hardness: 3, snd: 'stone', tool: 'pick', tier: 1, observer: true }, [0, 1], 3, true);
  ph('furnace_top_rs', [120, 120, 120]); ph('dispenser_front', [110, 110, 110]); ph('dispenser_front_vertical', [110, 110, 110]); ph('dropper_front', [110, 110, 110]); ph('dropper_front_vertical', [110, 110, 110]);
  for (const [k, n] of [['dispenser', 'Dispenser'], ['dropper', 'Dropper']]) { const ids = faced6(k, n, k + '_front', 'furnace_side', 'furnace_side', 'furnace_top_rs', { hardness: 3.5, snd: 'stone', tool: 'pick', tier: 1, use: 'chest', slots: 9, [k]: true }, [0, 1], 3, false);
    for (const f of [0, 1]) for (const ex of [0, 1]) { const d = BL[ids[f + ',' + ex]]; d.tex = d.tex.map((t, i) => i === f6face(f) ? k + '_front_vertical' : 'furnace_top_rs'); d.texIds = d.tex.map(t => TILE[t]); } }
  // ---- hoppers: a bowl with a spout pointing down or to one side ----
  ph('hopper', [70, 70, 76]); ph('hopper_inside', [50, 50, 54]); ph('hopper_top', [60, 60, 66]);
  const hopIds = {}; const SPOUT = { 1: [6, 0, 6, 10, 4, 10], 2: [6, 4, 0, 10, 8, 4], 3: [6, 4, 12, 10, 8, 16], 4: [0, 4, 6, 4, 8, 10], 5: [12, 4, 6, 16, 8, 10] };
  for (const f of [1, 2, 3, 4, 5]) { const bs = [[0, 10, 0, 16, 11, 16], [0, 11, 0, 2, 16, 16], [14, 11, 0, 16, 16, 16], [2, 11, 0, 14, 16, 2], [2, 11, 14, 14, 16, 16], [4, 4, 4, 12, 10, 12], SPOUT[f]];
    hopIds[f] = defBlock(f === 1 ? 'hopper' : 'hopper#' + f, 'Hopper', { tex: { s: 'hopper', t: 'hopper_top', b: 'hopper' }, render: 'boxes', boxes: bs, rb: bs, cb: [[0, 10, 0, 16, 16, 16], [4, 4, 4, 12, 10, 12]], sb: [[0, 0, 0, 16, 16, 16]], shape: 'hopper', st: { facing: f }, opaque: false, hardness: 3, snd: 'metal', tool: 'pick', tier: 1, hidden: f !== 1, drop: 'hopper', fam: 'hopper', use: 'chest', slots: 5, hopper: f }); }
  FAMILY.hopper = { kind: 'hopper', props: ['facing'], ids: hopIds, base: hopIds[1] };
  for (const f of [1, 2, 3, 4, 5]) { const d = BL[hopIds[f]]; d.boxes[0] = [0, 10, 0, 16, 11, 16, TILE.hopper_inside]; }
  // ---- note blocks: 25 pitches ----
  ph('note_block', [110, 70, 50]); for (let n = 0; n < 25; n++) defBlock(n ? 'note_block#' + n : 'note_block', 'Note Block', { tex: 'note_block', hardness: 0.8, snd: 'wood', mine: 'axe', hidden: n > 0, drop: 'note_block', note: n });
  // ---- daylight detectors ----
  ph('daylight_detector_side', [120, 100, 70]); ph('daylight_detector_top', [200, 190, 150]); ph('daylight_detector_inverted_top', [120, 130, 150]);
  for (const inv of [false, true]) { const b = [[0, 0, 0, 16, 6, 16]]; defBlock(inv ? 'daylight_detector#inverted' : 'daylight_detector', 'Daylight Detector', { tex: { s: 'daylight_detector_side', t: inv ? 'daylight_detector_inverted_top' : 'daylight_detector_top', b: 'daylight_detector_side' }, render: 'boxes', boxes: b, rb: b, cb: b, sb: b, opaque: false, hardness: 0.2, snd: 'wood', mine: 'axe', hidden: inv, drop: 'daylight_detector', daylight: inv ? 'inverted' : 'normal' }); }
  // ---- target, slime, honey ----
  defBlock('target', 'Target', { tex: { s: ph('target_side', [230, 220, 200]), t: ph('target_top', [230, 220, 200]) }, hardness: 0.5, snd: 'grass', target: true });
  defBlock('slime_block', 'Slime Block', { tex: ph('slime_block', [110, 190, 90]), opaque: false, render: 'cutout', translucent: true, cullSame: true, hardness: 0, snd: 'slime', slime: true });
  defBlock('honey_block', 'Honey Block', { tex: ph('honey_block', [240, 170, 40]), opaque: false, render: 'cutout', translucent: true, cullSame: true, hardness: 0, snd: 'slime', honey: true });
  // ---- trapped and ender chests ----
  const chest = BL[B.CHEST];
  ph('trapped_chest_side', [156, 104, 44]); ph('trapped_chest_front', [156, 104, 44]); ph('ender_chest_side', [30, 50, 50]); ph('ender_chest_front', [30, 50, 50]); ph('ender_chest_top', [30, 50, 50]);
  defBlock('trapped_chest', 'Trapped Chest', strip(Object.assign({}, chest, { tex: { s: 'trapped_chest_side', pz: 'trapped_chest_front', t: 'chest_top' }, drop: 'trapped_chest', trapped: true })));
  defBlock('ender_chest', 'Ender Chest', strip(Object.assign({}, chest, { tex: { s: 'ender_chest_side', pz: 'ender_chest_front', t: 'ender_chest_top' }, hardness: 22.5, tool: 'pick', tier: 1, snd: 'stone', drop: () => ['obsidian', 8], ender: true, light: 0.47 })));
  for (const k of ['trapped_chest', 'ender_chest']) { const ids = { 2: B[k.toUpperCase()] }; const d0 = BL[ids[2]];
    for (const f of [0, 1, 3]) { const o = strip(Object.assign({}, d0)); const t = tx(d0.tex); o.tex = [t[0], t[1], t[2], t[3], t[0], t[0]]; o.tex[[5, 0, 4, 1][f]] = t[4]; o.hidden = true; o.drop = d0.drop; o.st = { facing: f }; o.fam = k; ids[f] = defBlock(k + '#' + f, d0.name, o); }
    d0.fam = k; d0.st = { facing: 2 }; FAMILY[k] = { kind: 'facing4', props: ['facing'], ids, base: ids[2] }; }
  BL[B.TRAPPED_CHEST].tex = tx(BL[B.TRAPPED_CHEST].tex); BL[B.ENDER_CHEST].tex = tx(BL[B.ENDER_CHEST].tex);
}
function paintRedstoneTiles() {
  const clear = (set) => each((x, y) => set(x, y, [0, 0, 0], 0));
  // dust: a speckled red cross; brighter and more orange with more power
  for (let p = 0; p < 16; p++) { const c = p === 0 ? [92, 6, 4] : [120 + p * 9, 8 + (p > 10 ? (p - 10) * 9 : 0), 4];
    makeTile('redstone_dust_' + p, (set, r) => each((x, y) => { const inX = x >= 5 && x <= 10, inY = y >= 5 && y <= 10; const edge = (inX && (x === 5 || x === 10)) || (inY && (y === 5 || y === 10));
      if (!(inX || inY) || (edge && r() < 0.45)) { set(x, y, [0, 0, 0], 0); return; } const k = r(); set(x, y, k < 0.18 ? [c[0] * 0.7, c[1] * 0.7, c[2]] : k > 0.85 ? [Math.min(255, c[0] * 1.15), c[1] * 1.3 + 10, c[2] + 8] : c); })); }
  makeTile('rs_stick', (set, r) => each((x, y) => set(x, y, vary([126, 94, 52], r, 8))));
  makeTile('rs_tip_on', (set, r) => each((x, y) => set(x, y, vary([255, 70, 46], r, 10))));
  makeTile('rs_tip_off', (set, r) => each((x, y) => set(x, y, vary([96, 26, 22], r, 6))));
  const ss = tilePixels('smooth_stone');
  const slabTop = (on, kind) => (set, r) => { each((x, y) => { const p = ss(x, y); set(x, y, [p[0], p[1], p[2]]); }); const red = on ? [250, 40, 30] : [128, 20, 18]; const dk = on ? [190, 20, 16] : [90, 12, 10];
    if (kind === 'rep') { for (let y = 3; y < 15; y++) { set(7, y, red); set(8, y, dk); } for (const [x, y] of [[6, 4], [9, 4], [5, 5], [10, 5]]) set(x, y, red); }
    else { for (let x = 4; x < 12; x++) set(x, 12, red); for (let y = 3; y < 12; y++) { set(7, y, red); set(8, y, dk); } for (const [x, y] of [[3, 12], [12, 12], [3, 11], [12, 11]]) set(x, y, dk); } };
  makeTile('repeater', slabTop(false, 'rep')); makeTile('repeater_on', slabTop(true, 'rep')); makeTile('comparator', slabTop(false, 'cmp')); makeTile('comparator_on', slabTop(true, 'cmp'));
  makeTile('redstone_torch_off', (set, r) => { clear(set); for (let y = 6; y < 16; y++) { set(7, y, [120, 90, 50]); set(8, y, [100, 74, 40]); } for (let y = 5; y < 8; y++) { set(7, y, [96, 30, 26]); set(8, y, [74, 22, 20]); } });
  // a frame of dark wood-brown lead with amber glass panes; lit, the panes glow pale yellow and the frame warms up
  const lamp = (on) => (set, r) => each((x, y) => { const e = x === 0 || y === 0 || x === 15 || y === 15; const lead = (x === 5 || x === 10 || y === 5 || y === 10) && !e; const hl = !e && !lead && ((x % 5 === 1 && y % 5 !== 0) || (y % 5 === 1 && x % 5 !== 0));
    const diag = !e && !lead && ((x + y) % 5 === 0); set(x, y, vary(e ? (on ? [150, 92, 44] : [58, 36, 22]) : lead ? (on ? [196, 128, 60] : [70, 44, 26]) : hl || diag ? (on ? [255, 246, 214] : [150, 98, 52]) : (on ? [250, 206, 120] : [106, 64, 34]), r, on ? 3 : 4)); });
  makeTile('redstone_lamp', lamp(false)); makeTile('redstone_lamp_on', lamp(true));
  const planks = tilePixels('planks'), cobble = tilePixels('cobble'), stone = tilePixels('stone'), fs = tilePixels('furnace_side');
  for (const [k, sticky] of [['piston_top', false], ['piston_top_sticky', true]]) makeTile(k, (set, r) => each((x, y) => { const p = planks(x, y); const e = x === 0 || y === 0 || x === 15 || y === 15; let c = e ? [104, 84, 56] : [p[0], p[1], p[2]];
    if (sticky && x > 1 && x < 14 && y > 1 && y < 14) c = vary(((x + y) & 3) ? [112, 186, 92] : [140, 210, 116], r, 6); if (!sticky && x >= 6 && x <= 9 && y >= 6 && y <= 9) c = x === 6 || y === 6 ? [190, 190, 190] : [150, 150, 150]; set(x, y, c); }));
  makeTile('piston_side', (set, r) => each((x, y) => { const p = y < 4 ? planks(x, y) : cobble(x, y); let c = [p[0], p[1], p[2]]; if (y === 4) c = [66, 60, 52]; else if (y > 4) c = [p[0] * 0.92, p[1] * 0.92, p[2] * 0.92]; if (y > 4 && (x === 0 || x === 15 || y === 15)) c = [70, 70, 70]; set(x, y, c); }));
  makeTile('piston_arm', (set, r) => each((x, y) => { const p = planks(y, x); set(x, y, [p[0], p[1], p[2]]); }));
  makeTile('piston_bottom', (set, r) => each((x, y) => { const p = cobble(x, y); set(x, y, (x >= 5 && x <= 10 && y >= 5 && y <= 10) ? (x === 5 || y === 5 ? [40, 40, 40] : [64, 64, 64]) : [p[0], p[1], p[2]]); }));
  makeTile('piston_inner', (set, r) => each((x, y) => { const p = cobble(x, y); set(x, y, (x >= 6 && x <= 9 && y >= 6 && y <= 9) ? [170, 170, 170] : [p[0] * 0.75, p[1] * 0.75, p[2] * 0.75]); }));
  const dk = (p, f) => [p[0] * f, p[1] * f, p[2] * f];
  makeTile('observer_front', (set, r) => each((x, y) => { const p = stone(x, y); let c = dk(p, 0.62); if ((y === 3 || y === 12) && x > 1 && x < 14) c = [44, 44, 46]; if (y > 3 && y < 12 && (x === 2 || x === 13)) c = [44, 44, 46]; if (x >= 4 && x <= 11 && y >= 6 && y <= 9) c = [70, 70, 74]; if ((x === 5 || x === 6 || x === 9 || x === 10) && y >= 7 && y <= 8) c = [22, 22, 24]; set(x, y, c); }));
  for (const on of [false, true]) makeTile(on ? 'observer_back_on' : 'observer_back', (set, r) => each((x, y) => { const p = stone(x, y); let c = dk(p, 0.62); if (x >= 6 && x <= 9 && y >= 6 && y <= 9) c = on ? (x === 6 || y === 6 ? [255, 120, 100] : [240, 40, 30]) : [74, 24, 22]; if ((x === 5 || x === 10) && y >= 5 && y <= 10 || (y === 5 || y === 10) && x >= 5 && x <= 10) c = [44, 44, 46]; set(x, y, c); }));
  makeTile('observer_side', (set, r) => each((x, y) => { const p = stone(x, y); let c = dk(p, 0.62); if (y >= 6 && y <= 9) c = y === 6 || y === 9 ? [44, 44, 46] : [80, 80, 84]; set(x, y, c); }));
  makeTile('observer_top', (set, r) => each((x, y) => { const p = stone(x, y); let c = dk(p, 0.62); if (x === 7 || x === 8) c = y < 4 ? [200, 50, 40] : [44, 44, 46]; if (y === 3 && (x === 6 || x === 9) || y === 4 && (x === 5 || x === 10)) c = [200, 50, 40]; set(x, y, c); }));
  makeTile('furnace_top_rs', (set, r) => each((x, y) => { const p = stone(x, y); const e = x === 0 || y === 0 || x === 15 || y === 15; set(x, y, e ? dk(p, 0.75) : dk(p, 0.92)); }));
  const mouth = (round) => (x, y) => round ? Math.hypot(x - 7.5, y - 7.5) : Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5) * 1.6);
  for (const [k, round] of [['dispenser', true], ['dropper', false]]) for (const v of [false, true]) makeTile(k + (v ? '_front_vertical' : '_front'), (set, r) => each((x, y) => { const p = v ? stone(x, y) : fs(x, y); const m = mouth(round)(x, y); const e = x === 0 || y === 0 || x === 15 || y === 15;
    set(x, y, m < 2.6 ? [18, 18, 18] : m < 3.6 ? [62, 62, 62] : v && e ? dk(p, 0.75) : [p[0], p[1], p[2]]); }));
  makeTile('hopper', (set, r) => each((x, y) => { const e = x === 0 || y === 0 || x === 15 || y === 15; set(x, y, vary(e ? [40, 40, 44] : (x + y) % 7 === 0 ? [92, 92, 98] : [70, 70, 76], r, 4)); }));
  makeTile('hopper_top', (set, r) => each((x, y) => { const e = x < 2 || y < 2 || x > 13 || y > 13; set(x, y, vary(e ? ((x + y) % 7 === 0 ? [92, 92, 98] : [72, 72, 78]) : [28, 28, 32], r, 3)); }));
  makeTile('hopper_inside', (set, r) => each((x, y) => set(x, y, vary(x >= 4 && x <= 11 && y >= 4 && y <= 11 ? [18, 18, 20] : [40, 40, 44], r, 3))));
  makeTile('note_block', (set, r) => { T2.planks(set, r, [118, 74, 48]); each((x, y) => { if (x === 0 || y === 0 || x === 15 || y === 15) set(x, y, [62, 38, 24]); });
    for (let y = 3; y < 11; y++) set(10, y, [26, 18, 12]); for (const [x, y] of [[8, 10], [9, 10], [8, 11], [9, 11], [7, 11], [11, 3], [12, 4], [12, 5]]) set(x, y, [26, 18, 12]); });
  makeTile('daylight_detector_top', (set, r) => each((x, y) => { const e = x % 5 === 0 || y % 5 === 0; set(x, y, vary(e ? [132, 110, 74] : [168, 196, 214], r, 6)); }));
  makeTile('daylight_detector_inverted_top', (set, r) => each((x, y) => { const e = x % 5 === 0 || y % 5 === 0; set(x, y, vary(e ? [132, 110, 74] : [62, 82, 128], r, 5)); }));
  makeTile('daylight_detector_side', (set, r) => { T2.planks(set, r, [150, 116, 72]); each((x, y) => { if (y < 10) set(x, y, [0, 0, 0], 0); }); each((x, y) => { if (y >= 10 && (y === 10)) set(x, y, [110, 84, 52]); }); });
  makeTile('target_side', (set, r) => each((x, y) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); set(x, y, vary(d < 1.6 ? [206, 44, 40] : d < 3.6 ? [236, 226, 206] : d < 5.6 ? [206, 44, 40] : [236, 226, 206], r, 5)); }));
  makeTile('target_top', (set, r) => { const n = tnoise(991, 4); each((x, y) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); set(x, y, vary(d < 1.6 ? [206, 44, 40] : mixc([206, 184, 96], [230, 208, 120], n(x, y)), r, 6)); }); });
  makeTile('slime_block', (set, r) => each((x, y) => { const e = x === 0 || y === 0 || x === 15 || y === 15; const inner = x >= 4 && x <= 11 && y >= 4 && y <= 11; const ie = inner && (x === 4 || x === 11 || y === 4 || y === 11);
    set(x, y, e ? [86, 160, 70] : ie ? [96, 174, 80] : inner ? [120, 200, 100] : vary([132, 214, 112], r, 4), e ? 235 : ie ? 230 : 160); }));
  makeTile('honey_block', (set, r) => each((x, y) => { const e = x === 0 || y === 0 || x === 15 || y === 15; set(x, y, e ? [214, 132, 18] : vary(((x * 3 + y) % 9 === 0) ? [255, 210, 90] : [246, 176, 44], r, 5), e ? 240 : 196); }));
  const cs = tilePixels('chest_side'), cf = tilePixels('chest_front');
  makeTile('trapped_chest_side', (set) => each((x, y) => { const p = cs(x, y); set(x, y, (y === 5 || y === 6) && x > 0 && x < 15 ? [168, 40, 30] : [p[0], p[1], p[2]]); }));
  makeTile('trapped_chest_front', (set) => each((x, y) => { const p = cf(x, y); set(x, y, (y === 5 || y === 6) && x > 0 && x < 15 && (x < 6 || x > 9) ? [168, 40, 30] : [p[0], p[1], p[2]]); }));
  const ender = (front, top) => (set, r) => each((x, y) => { const e = x === 0 || y === 0 || x === 15 || y === 15; let c = vary(e || (!top && y === 5) ? [14, 28, 28] : ((x * 7 + y * 3) % 11 === 0 ? [52, 84, 80] : [34, 58, 56]), r, 4);
    if (front && x >= 6 && x <= 9 && y >= 4 && y <= 8) c = (x === 6 || x === 9 || y === 4 || y === 8) ? [190, 190, 160] : [70, 210, 170]; set(x, y, c); });
  makeTile('ender_chest_side', ender(false, false)); makeTile('ender_chest_front', ender(true, false)); makeTile('ender_chest_top', ender(false, true));
}
{ const R = (o, n, sh, k) => RECIPES.push(RSH(o, n, sh, k)); const L = (o, n, items) => RECIPES.push(RSL(o, n, items));
  GROUPS['#wooden_slabs'] = WOODDATA().map(w => w.k + '_slab').filter(k => IT[k] !== undefined);
  R('repeater', 1, ['TRT', 'SSS'], { T: 'redstone_torch', R: 'redstone', S: 'stone' }); R('comparator', 1, [' T ', 'TQT', 'SSS'], { T: 'redstone_torch', Q: 'quartz', S: 'stone' });
  R('redstone_lamp', 1, [' R ', 'RGR', ' R '], { R: 'redstone', G: 'glowstone' }); R('piston', 1, ['PPP', 'CIC', 'CRC'], { P: 'planks', C: '#stone', I: 'iron_ingot', R: 'redstone' }); R('sticky_piston', 1, ['S', 'P'], { S: 'slime_ball', P: 'piston' });
  R('observer', 1, ['CCC', 'RRQ', 'CCC'], { C: '#stone', R: 'redstone', Q: 'quartz' }); R('dispenser', 1, ['CCC', 'CBC', 'CRC'], { C: '#stone', B: 'bow', R: 'redstone' }); R('dropper', 1, ['CCC', 'C C', 'CRC'], { C: '#stone', R: 'redstone' });
  R('hopper', 1, ['I I', 'ICI', ' I '], { I: 'iron_ingot', C: 'chest' }); R('note_block', 1, ['PPP', 'PRP', 'PPP'], { P: 'planks', R: 'redstone' }); R('daylight_detector', 1, ['GGG', 'QQQ', 'SSS'], { G: 'glass', Q: 'quartz', S: '#wooden_slabs' });
  R('target', 1, [' R ', 'RHR', ' R '], { R: 'redstone', H: 'hay_block' }); R('slime_block', 1, ['SSS', 'SSS', 'SSS'], { S: 'slime_ball' }); L('slime_ball', 9, ['slime_block']);
  L('trapped_chest', 1, ['chest', 'tripwire_hook']); R('ender_chest', 1, ['OOO', 'OEO', 'OOO'], { O: 'obsidian', E: 'eye_of_ender' });
  if (!RECIPES.some(r => r.out[0] === 'tripwire_hook')) R('tripwire_hook', 2, ['I', 'S', 'P'], { I: 'iron_ingot', S: 'stick', P: 'planks' });
}

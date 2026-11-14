// ================= SHAPED BLOCKS AT RUN TIME (Minecraft rules) =================
// Placing (facing, top / bottom half, slab merging, door hinges, waterlogging), opening doors / trapdoors / gates,
// buttons and pressure plates, blocks popping off when what holds them goes, a small redstone power check (levers,
// redstone torches, blocks of redstone, buttons, pressure plates) that opens doors, trapdoors and gates, water
// buckets on waterloggable blocks, recipes, stonecutter recipes and furnace fuel.
const DV4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const dirOf = (nx, nz) => nz < 0 ? 0 : nx > 0 ? 1 : nz > 0 ? 2 : 3;
const playerFacing = () => { const d = lookDir(); return Math.abs(d.x) > Math.abs(d.z) ? (d.x > 0 ? 1 : 3) : (d.z > 0 ? 2 : 0); };
const wget = (x, y, z) => world.get(x, y, z);
const keyOf = (x, y, z) => x + ',' + y + ',' + z;
const replaceableAt = (x, y, z) => { const id = world.get(x, y, z); return !id || !!BL[id].fluid || !!PLANT[id]; };

// ---- mining: shapes mine like their material (stone stairs need a pickaxe, wooden ones are fastest with an axe) ----
for (const d of BL) { if (!d || !d.shape || !d.mat) continue; const m = BL[B[d.mat.toUpperCase()]]; if (!m) continue;
  if (d.shape === 'stairs' || d.shape === 'slab' || d.shape === 'wall') { d.hardness = m.hardness; d.tool = m.tool; d.tier = m.tier; d.mine = m.mine || d.mine; }
  else if (d.shape === 'plate' && m.tool === 'pick') { d.tool = 'pick'; d.tier = 1; d.mine = 'pick'; }
  else if (!d.mine) d.mine = m.mine; }
// Minecraft: monsters do not spawn on bottom slabs, glass panes, fences ...
for (const d of BL) if (d && d.shape && !(d.shape === 'slab' && d.st.type !== 'bottom') && !(d.shape === 'stairs' && d.st.half === 'top')) d.noSpawnOn = true;

// ---- inventory order: each new block right after its material (like the creative tabs) ----
{ const after = new Map(); for (const s of SHAPE_SETS) { const k = s.mat; const ids = s.keys.map(x => IT[x]).filter(x => x != null); if (!after.has(k)) after.set(k, []); after.get(k).push(...ids); }
  const moved = new Set(); for (const ids of after.values()) for (const i of ids) moved.add(i);
  const out = []; for (const id of ITEM_IDS) { if (moved.has(id)) continue; out.push(id); const k = ITEMS[id] && ITEMS[id].key; if (after.has(k)) { out.push(...after.get(k)); after.delete(k); } }
  for (const ids of after.values()) out.push(...ids); ITEM_IDS.length = 0; ITEM_IDS.push(...out); }

// ---- recipes (Minecraft's) ----
{ const R = (o, n, sh, k) => RECIPES.push(RSH(o, n, sh, k)); const has = (k) => IT[k] !== undefined;
  for (const s of SHAPE_SETS) { const m = s.mat; for (const k of s.keys) { if (!has(k)) continue;
    if (k.endsWith('_stairs')) R(k, 4, ['M  ', 'MM ', 'MMM'], { M: m });
    else if (k.endsWith('_slab')) R(k, 6, ['MMM'], { M: m });
    else if (k.endsWith('_wall')) R(k, 6, ['MMM', 'MMM'], { M: m });
    else if (k === 'nether_brick_fence') R(k, 6, ['NBN', 'NBN'], { N: 'nether_bricks', B: 'nether_brick' });
    else if (k.endsWith('_fence')) R(k, 3, ['PSP', 'PSP'], { P: m, S: 'stick' });
    else if (k.endsWith('_fence_gate')) R(k, 1, ['SPS', 'SPS'], { P: m, S: 'stick' });
    else if (k === 'iron_door') R(k, 3, ['II', 'II', 'II'], { I: 'iron_ingot' });
    else if (k === 'iron_trapdoor') R(k, 1, ['II', 'II'], { I: 'iron_ingot' });
    else if (k.endsWith('_door')) R(k, 3, ['PP', 'PP', 'PP'], { P: m });
    else if (k.endsWith('_trapdoor')) R(k, 2, ['PPP', 'PPP'], { P: m });
    else if (k === 'light_weighted_pressure_plate') R(k, 1, ['GG'], { G: 'gold_ingot' });
    else if (k === 'heavy_weighted_pressure_plate') R(k, 1, ['II'], { I: 'iron_ingot' });
    else if (k.endsWith('_pressure_plate')) R(k, 1, ['MM'], { M: m });
    else if (k.endsWith('_button')) RECIPES.push(RSL(k, 1, [m]));
    else if (k === 'glass_pane') R(k, 16, ['GGG', 'GGG'], { G: 'glass' });
    else if (k === 'iron_bars') { if (!RECIPES.some(r => r.out[0] === 'iron_bars')) R(k, 16, ['III', 'III'], { I: 'iron_ingot' }); }
  } }
  // stonecutter: one block makes one stair or wall, or two slabs
  if (typeof STONECUT !== 'undefined') for (const s of SHAPE_SETS) { if (s.wood) continue; for (const k of s.keys) { if (/_stairs$|_wall$/.test(k)) STONECUT.push([s.mat, k, 1]); else if (/_slab$/.test(k)) STONECUT.push([s.mat, k, 2]); } }
  // furnace fuel (seconds; Minecraft ticks / 20)
  for (const s of SHAPE_SETS) if (s.wood) for (const k of s.keys) FUEL[k] = /_slab$/.test(k) ? 7.5 : /_door$/.test(k) ? 10 : /_button$/.test(k) ? 5 : 15;
}

// ---- sounds (synthesised) ----
{ const _pl = Sfx.play; Sfx.play = function (name, v = 1, rate) {
    if (!this.ctx) return _pl.apply(this, arguments);
    switch (name) {
      case 'door_open': this.nz(0.16, 900, 0.32 * v, 'bandpass', 2); this.tone(220, 150, 0.12, 0.07 * v, 'triangle'); return;
      case 'door_close': this.nz(0.1, 600, 0.45 * v, 'lowpass'); this.tone(150, 90, 0.08, 0.1 * v, 'square'); return;
      case 'iron_door_open': this.tone(520, 380, 0.25, 0.06 * v, 'sawtooth'); this.nz(0.2, 2400, 0.15 * v, 'bandpass', 4); return;
      case 'iron_door_close': this.tone(300, 200, 0.12, 0.09 * v, 'square'); this.nz(0.12, 1800, 0.25 * v, 'bandpass', 3); return;
      case 'trap_open': this.nz(0.12, 1100, 0.28 * v, 'bandpass', 2); return;
      case 'trap_close': this.nz(0.09, 700, 0.38 * v, 'lowpass'); return;
      case 'click_on': this.tone(900, 800, 0.03, 0.08 * v, 'square'); return;
      case 'click_off': this.tone(700, 600, 0.03, 0.07 * v, 'square'); return;
    }
    return _pl.apply(this, arguments); }; }
const shapeSound = (d, open, pos) => { const iron = !!d.iron; const k = d.shape === 'door' ? (iron ? 'iron_door_' : 'door_') + (open ? 'open' : 'close') : d.shape === 'trapdoor' ? (iron ? (open ? 'iron_door_open' : 'iron_door_close') : open ? 'trap_open' : 'trap_close') : open ? 'door_open' : 'door_close'; Sfx.at(k, pos, 1); };

// ---- what holds a block up ----
function shapeSupported(x, y, z, id) {
  const d = BL[id]; if (!d || !d.shape) return true; const st = d.st;
  if (d.shape === 'button') { if (st.face === 'floor') return shSturdy(world.get(x, y - 1, z), 'up'); if (st.face === 'ceiling') return shSturdy(world.get(x, y + 1, z), 'down');
    const [ax, az] = DV4[st.facing]; return shSturdy(world.get(x - ax, y, z - az), st.facing); }
  if (d.shape === 'plate') { const b = world.get(x, y - 1, z); const bd = BL[b]; return shSturdy(b, 'up') || !!(bd && (bd.shape === 'fence' || bd.shape === 'wall')); }
  if (d.shape === 'door') { if (st.half === 'lower') { const up = BL[world.get(x, y + 1, z)]; return shSturdy(world.get(x, y - 1, z), 'up') && !!(up && up.fam === d.fam && up.st.half === 'upper'); }
    const lo = BL[world.get(x, y - 1, z)]; return !!(lo && lo.fam === d.fam && lo.st.half === 'lower'); }
  return true;
}

// ---- placing ----
{ const _pb = placeBlock; placeBlock = function (hit, id) {
    const d = BL[id]; if (!d || !d.fam || !hit) return _pb.apply(this, arguments);
    const F = FAMILY[d.fam]; const kind = F.kind; const pf = playerFacing();
    let x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz; if (PLANT[hit.id]) { x = hit.x; y = hit.y; z = hit.z; }
    const fy = (hit.py !== undefined ? hit.py : hit.y + 0.5) - hit.y; const upper = hit.ny === -1 || (hit.ny === 0 && fy > 0.5);
    // slabs: a second slab on a single one makes a double slab
    if (kind === 'slab') {
      const merge = (mx, my, mz) => { const dbl = famId(d.fam, { type: 'double', wl: 0 }); if (boxIntersectsBlock(player, mx, my, mz)) return false; world.set(mx, my, mz, dbl); Sfx.play(d.snd, 1, 0.8); if (MODS.hooks.blockPlace) modFire('blockPlace', { x: mx, y: my, z: mz, block: d.fam }); return true; };
      const hd = BL[hit.id];
      if (hd && hd.fam === d.fam && hd.st.type !== 'double' && (hd.st.type === 'bottom' ? (hit.ny === 1 || (hit.ny === 0 && fy > 0.5)) : (hit.ny === -1 || (hit.ny === 0 && fy <= 0.5)))) return merge(hit.x, hit.y, hit.z);
      const cd = BL[world.get(x, y, z)]; if (cd && cd.fam === d.fam && cd.st.type !== 'double') return merge(x, y, z);
    }
    if (y < 1 || y >= WH) return false;
    const wl = world.get(x, y, z) === B.WATER ? 1 : 0; let st;
    switch (kind) {
      case 'slab': st = { type: upper ? 'top' : 'bottom', wl }; break;
      case 'stairs': st = { facing: pf, half: upper ? 'top' : 'bottom', wl }; break;
      case 'fence': case 'wall': case 'pane': st = { wl }; break;
      case 'gate': st = { facing: pf, open: 0 }; break;
      case 'trapdoor': st = hit.ny === 0 ? { facing: dirOf(hit.nx, hit.nz), half: fy > 0.5 ? 'top' : 'bottom', open: 0, wl } : { facing: (pf + 2) % 4, half: hit.ny === 1 ? 'bottom' : 'top', open: 0, wl }; break;
      case 'button': st = hit.ny === 1 ? { face: 'floor', facing: pf, powered: 0 } : hit.ny === -1 ? { face: 'ceiling', facing: pf, powered: 0 } : { face: 'wall', facing: dirOf(hit.nx, hit.nz), powered: 0 }; break;
      case 'plate': st = { powered: 0 }; break;
      case 'door': {
        if (y + 1 >= WH || !replaceableAt(x, y + 1, z) || !shSturdy(world.get(x, y - 1, z), 'up')) return false;
        const ccw = (pf + 3) % 4, cw = (pf + 1) % 4; const L = DV4[ccw], Rr = DV4[cw];
        const full = (a, b, c) => shFullCube(world.get(a, b, c)) ? 1 : 0;
        const i = -full(x + L[0], y, z + L[1]) - full(x + L[0], y + 1, z + L[1]) + full(x + Rr[0], y, z + Rr[1]) + full(x + Rr[0], y + 1, z + Rr[1]);
        const isLower = (a, c) => { const n = BL[world.get(a, y, c)]; return !!(n && n.shape === 'door' && n.st.half === 'lower'); };
        const ld = isLower(x + L[0], z + L[1]), rd = isLower(x + Rr[0], z + Rr[1]); let hinge;
        if ((ld && !rd) || i > 0) hinge = 'right'; else if ((rd && !ld) || i < 0) hinge = 'left';
        else { const j = DV4[pf][0], k = DV4[pf][1]; const d0 = (hit.px !== undefined ? hit.px : x + 0.5) - x, d1 = (hit.pz !== undefined ? hit.pz : z + 0.5) - z;
          hinge = (j < 0 && d1 < 0.5) || (j > 0 && d1 > 0.5) || (k < 0 && d0 > 0.5) || (k > 0 && d0 < 0.5) ? 'right' : 'left'; }
        st = { facing: pf, half: 'lower', open: 0, hinge }; break; }
      default: st = Object.assign({}, d.st);
    }
    const vid = famId(d.fam, st);
    if (!shapeSupported(x, y, z, vid) && kind !== 'door') return false;
    const ok = _pb.call(this, hit, vid);
    if (ok && kind === 'door') world.set(x, y + 1, z, withState(vid, { half: 'upper' }));
    if (ok) powerQueue(x, y, z);
    return ok;
  }; }

// ---- opening doors, trapdoors and gates; pressing buttons ----
function setDoor(x, y, z, open) {
  const d = BL[world.get(x, y, z)]; if (!d || d.shape !== 'door') return; const by = d.st.half === 'upper' ? y - 1 : y;
  for (const yy of [by, by + 1]) { const id = world.get(x, yy, z); if (BL[id] && BL[id].fam === d.fam) world.set(x, yy, z, withState(id, { open })); }
}
const BUTTONS = new Map(); // "x,y,z" -> time to pop back out
let SH_T = 0; // game-time clock for buttons and plates (stops while paused)
function pressButton(x, y, z) { const id = world.get(x, y, z); const d = BL[id]; if (!d || d.shape !== 'button' || d.st.powered) return;
  world.set(x, y, z, withState(id, { powered: 1 })); Sfx.at('click_on', new V3(x + 0.5, y + 0.5, z + 0.5), 1); BUTTONS.set(keyOf(x, y, z), SH_T + (d.wood ? 1.5 : 1.0)); powerQueue(x, y, z); }
{ const _ua = useAction; useAction = function (eye, dir) {
    const h = player.held(); const hd = h && ITEMS[h.id];
    if (target && !targetMob) {
      const d = BL[target.id]; const { x, y, z } = target; const pos = new V3(x + 0.5, y + 0.5, z + 0.5);
      // buckets and waterloggable blocks
      if (hd && hd.kind === 'bucket' && d && d.shape && d.st && d.st.wl !== undefined && !(d.shape === 'slab' && d.st.type === 'double')) {
        if (!hd.fluid && d.st.wl) { mouseR = false; world.set(x, y, z, withState(target.id, { wl: 0 })); replaceHeld(IT.water_bucket); Sfx.play('splash', 0.6); S.swing = 1; return; }
        if (hd.fluid === 'water' && !d.st.wl && world.dim !== 'nether') { mouseR = false; world.set(x, y, z, withState(target.id, { wl: 1 })); if (S.mode !== 'creative') { player.inv[handSlot()] = { id: IT.bucket, count: 1 }; invDirty(); } Sfx.play('splash', 0.6); S.swing = 1; return; }
      }
      if (d && d.shape && !(kd('sneak') && h) && !isSpec()) {
        if ((d.shape === 'door' || d.shape === 'trapdoor') && !d.iron) { mouseR = false; const open = d.st.open ? 0 : 1; if (d.shape === 'door') setDoor(x, y, z, open); else world.set(x, y, z, withState(target.id, { open })); shapeSound(d, open, pos); S.swing = 1; return; }
        if (d.shape === 'gate') { mouseR = false; let change = { open: d.st.open ? 0 : 1 }; if (!d.st.open) { const pf = playerFacing(); if (d.st.facing === (pf + 2) % 4) change.facing = pf; } world.set(x, y, z, withState(target.id, change)); shapeSound(d, change.open, pos); S.swing = 1; return; }
        if (d.shape === 'button') { mouseR = false; pressButton(x, y, z); S.swing = 1; return; }
      }
    }
    return _ua.apply(this, arguments); }; }
// creative pick-block gives the family's item
{ const _pk = pickBlock; pickBlock = function () { const hit = raycast(player.eye(), lookDir(), 7); if (hit && BL[hit.id] && BL[hit.id].fam && S.mode === 'creative') { const id = FAMILY[BL[hit.id].fam].base; for (let i = 0; i < 9; i++) if (player.inv[i] && player.inv[i].id === id) { player.sel = i; invDirty(); return; } player.inv[player.sel] = { id, count: 1 }; invDirty(); return; } return _pk.apply(this, arguments); }; }

// ---- breaking: the other half of a door goes too; a waterlogged block leaves its water ----
{ const _bb = breakBlock; breakBlock = function (x, y, z) {
    const id = world.get(x, y, z); const d = BL[id]; const r = _bb.apply(this, arguments);
    if (d && d.shape && world.get(x, y, z) !== id) {
      if (d.shape === 'door') { const oy = d.st.half === 'upper' ? y - 1 : y + 1; const o = BL[world.get(x, oy, z)]; if (o && o.fam === d.fam) world.set(x, oy, z, 0); }
      if (d.wlb && !world.get(x, y, z)) world.set(x, y, z, B.WATER);
    }
    return r; }; }

// ---- block changes: support checks and power updates ----
const SUPQ = new Set(), POWQ = new Set(); let SH_APPLY = false;
function powerQueue(x, y, z) { if (POWQ.size < 4000) POWQ.add(keyOf(x, y, z)); }
{ const _set = World.prototype.set; World.prototype.set = function (x, y, z, id, record) {
    const r = _set.apply(this, arguments);
    if (r !== false && this === G.world && !SH_APPLY) { if (SUPQ.size < 4000) for (const [a, b, c] of [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) SUPQ.add(keyOf(x + a, y + b, z + c)); powerQueue(x, y, z); }
    return r; }; }
// ---- power (until full redstone dust arrives): sources next to a block, or on a solid block next to it ----
function isSource(x, y, z) { const d = BL[world.get(x, y, z)]; if (!d) return false; const k = d.key;
  return k === 'lever_on' || k === 'redstone_block' || k === 'redstone_torch' || (d.shape === 'button' || d.shape === 'plate' ? !!d.st.powered : false) || (!!d.rail && /_on$/.test(k) && /detector/.test(k)); }
function stronglyPowered(x, y, z) { // a solid block powered by a button / lever on it, a plate on top of it or a torch under it
  for (const [a, b, c] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { const d = BL[world.get(x + a, y + b, z + c)]; if (!d) continue;
    if (d.shape === 'button' && d.st.powered) { const st = d.st; const [ax, az] = DV4[st.facing]; const att = st.face === 'floor' ? [0, -1, 0] : st.face === 'ceiling' ? [0, 1, 0] : [-ax, 0, -az]; if (att[0] === -a && att[1] === -b && att[2] === -c) return true; }
    if (d.shape === 'plate' && d.st.powered && b === 1) return true;
    if (d.key === 'lever_on') return true;
    if (d.key === 'redstone_torch' && b === -1) return true; }
  return false; }
function blockPowered(x, y, z) { for (const [a, b, c] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { const X = x + a, Y = y + b, Z = z + c; if (isSource(X, Y, Z)) return true; const n = world.get(X, Y, Z); if (SOLID[n] && OPAQUE[n] && stronglyPowered(X, Y, Z)) return true; } return false; }
const POWERED = new Map(); // last power state of doors / trapdoors / gates, so they only react when it changes
function updatePowerAround(x, y, z) {
  for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) for (let c = -2; c <= 2; c++) { const X = x + a, Y = y + b, Z = z + c; const id = world.get(X, Y, Z); const d = BL[id]; if (!d || !d.shape) continue;
    if (d.shape !== 'door' && d.shape !== 'trapdoor' && d.shape !== 'gate') continue; if (d.shape === 'door' && d.st.half === 'upper') continue;
    const p = blockPowered(X, Y, Z) || (d.shape === 'door' && blockPowered(X, Y + 1, Z)); const k = keyOf(X, Y, Z); const was = POWERED.get(k) || false; if (p === was) continue; POWERED.set(k, p);
    if (!!d.st.open !== p) { if (d.shape === 'door') setDoor(X, Y, Z, p ? 1 : 0); else world.set(X, Y, Z, withState(id, { open: p ? 1 : 0 })); shapeSound(d, p, new V3(X + 0.5, Y + 0.5, Z + 0.5)); } }
}

// ---- every frame: buttons popping out, pressure plates, support, power ----
const PLATES = new Map(); let plateT = 0;
function shapesTick(dt) {
  if (!world || (typeof MP !== 'undefined' && MP.active && MP.role === 'client')) { SUPQ.clear(); POWQ.clear(); return; }
  SH_T += dt; const now = SH_T;
  for (const [k, t] of BUTTONS) if (now >= t) { BUTTONS.delete(k); const [x, y, z] = k.split(',').map(Number); const id = world.get(x, y, z); const d = BL[id]; if (d && d.shape === 'button' && d.st.powered) { world.set(x, y, z, withState(id, { powered: 0 })); Sfx.at('click_off', new V3(x + 0.5, y + 0.5, z + 0.5), 1); } }
  // pressure plates: wooden ones feel any entity, stone ones only players and mobs, weighted ones count entities
  plateT += dt; if (plateT >= 0.1) { plateT = 0; const on = new Map();
    const feel = (e, hw, living) => { if (!e || !e.pos) return; const y = Math.floor(e.pos.y + 0.02); for (let x = Math.floor(e.pos.x - hw); x <= Math.floor(e.pos.x + hw); x++) for (let z = Math.floor(e.pos.z - hw); z <= Math.floor(e.pos.z + hw); z++) {
      const d = BL[world.get(x, y, z)]; if (!d || d.shape !== 'plate') continue; if (e.pos.x + hw <= x + 1 / 16 || e.pos.x - hw >= x + 15 / 16 || e.pos.z + hw <= z + 1 / 16 || e.pos.z - hw >= z + 15 / 16 || e.pos.y > y + 0.25) continue;
      if (d.plate === 'stone' && !living) continue; const k = keyOf(x, y, z); on.set(k, (on.get(k) || 0) + 1); } };
    if (!player.dead && !isSpec()) feel(player, player.hw, true);
    for (const m of G.mobs) if (!m.dead) feel(m, m.hw || 0.3, true);
    for (const it of G.items || []) if (!it.gone) feel(it, 0.125, false);
    for (const p of G.projectiles || []) if (p && p.pos && !p.gone) feel(p, 0.1, false);
    for (const [k] of on) { const [x, y, z] = k.split(',').map(Number); const id = world.get(x, y, z); const d = BL[id]; PLATES.set(k, now); if (!d.st.powered) { world.set(x, y, z, withState(id, { powered: 1 })); Sfx.at('click_on', new V3(x + 0.5, y, z + 0.5), 0.8); powerQueue(x, y, z); } }
    for (const [k, t] of PLATES) { if (on.has(k)) continue; const [x, y, z] = k.split(',').map(Number); const id = world.get(x, y, z); const d = BL[id]; if (!d || d.shape !== 'plate') { PLATES.delete(k); continue; }
      if (now - t >= 1.0) { PLATES.delete(k); if (d.st.powered) { world.set(x, y, z, withState(id, { powered: 0 })); Sfx.at('click_off', new V3(x + 0.5, y, z + 0.5), 0.8); powerQueue(x, y, z); } } } }
  // blocks whose support went: pop off and drop
  if (SUPQ.size) { const list = [...SUPQ]; SUPQ.clear(); for (const k of list) { const [x, y, z] = k.split(',').map(Number); const id = world.get(x, y, z); const d = BL[id]; if (!d || !d.shape || shapeSupported(x, y, z, id)) continue;
    if (d.shape === 'door') { const oy = d.st.half === 'upper' ? y - 1 : y + 1; const o = BL[world.get(x, oy, z)]; if (o && o.fam === d.fam) world.set(x, oy, z, 0); }
    world.set(x, y, z, 0); Particles.blockBreak(x, y, z, id, 8); if (S.rules.doTileDrops !== false && (d.shape !== 'door' || d.st.half === 'lower')) dropItem(IT[d.fam], 1, x + 0.5, y + 0.3, z + 0.5); } }
  if (POWQ.size) { const list = [...POWQ]; POWQ.clear(); const done = new Set(); for (const k of list) { const [x, y, z] = k.split(',').map(Number); const c = keyOf(x >> 1, y >> 1, z >> 1); if (done.has(c)) continue; done.add(c); updatePowerAround(x, y, z); } }
}
{ const _uw = updateWater; updateWater = function (dt) { const r = _uw.apply(this, arguments); try { shapesTick(dt); } catch (e) { if (typeof worldError === 'function') worldError(e); else console.error(e); } return r; }; }

// ---- lava never turns a waterlogged block into stone, and liquids never wash shaped blocks away ----
{ const _fr = flReplaceable; flReplaceable = function (id) { if (SHAPED[id]) return false; return _fr(id); }; }

// ---- crosshair outline fits the shape ----
{ const _ui = updateInteraction; updateInteraction = function (dt) { const r = _ui.apply(this, arguments);
    if (selBox.visible && target && SHAPED[target.id]) { const bs = shapeBoxes(target.id, target.x, target.y, target.z, wget, 's'); if (bs.length) { let a = [16, 16, 16], b = [0, 0, 0]; for (const q of bs) for (let k = 0; k < 3; k++) { a[k] = Math.min(a[k], q[k]); b[k] = Math.max(b[k], q[k + 3]); }
      selBox.scale.set((b[0] - a[0]) / 16, (b[1] - a[1]) / 16, (b[2] - a[2]) / 16); selBox.position.set(target.x + (a[0] + b[0]) / 32, target.y + (a[1] + b[1]) / 32, target.z + (a[2] + b[2]) / 32); } }
    else selBox.scale.set(1, 1, 1);
    return r; }; }

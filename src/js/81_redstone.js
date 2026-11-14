// ================= REDSTONE AT RUN TIME (Minecraft Java rules) =================
// Game ticks run at 20 per second. A block change notifies the blocks around it (two blocks out, so a signal can go
// through a solid block), and each redstone block re-checks its inputs:
//  * Strong power: a lever / button powers the block it is on, a torch powers the block above it, a repeater or
//    comparator powers the block in front of it, an observer the block behind it. Dust powers the block under it and the
//    blocks it points into, but power that came from dust never goes back into dust through a block.
//  * Weak power: a block next to a source, or a solid block that is strongly powered, switches mechanisms on.
//  * Dust loses one level per block. Torches turn off 2 ticks after the block they hang on is powered (and burn out after
//    8 flips in 60 ticks). Repeaters wait 1-4 redstone ticks and can be locked from the side by another repeater or
//    comparator. Comparators compare or subtract and read how full a container is. Lamps turn on at once and off after
//    4 ticks. Observers pulse for 2 ticks when the block they face changes. Pistons push up to 12 blocks; sticky pistons
//    pull one back; slime and honey blocks drag their neighbours (but not each other). Dispensers and droppers fire on a
//    rising edge, hoppers move an item every 8 ticks unless powered, note blocks play, TNT lights.
const RS = { q: new Set(), dustQ: new Set(), sched: new Map(), tick: 0, acc: 0, quiet: false, cmp: new Map(), day: new Map(), tgt: new Map(), trap: new Map(), edge: new Map(), torch: new Map(), burnt: new Map(), hopCd: new Map(), watch: new Set(), watchWorld: null };
const RV = [[0, 1, 0], [0, -1, 0], [0, 0, -1], [0, 0, 1], [-1, 0, 0], [1, 0, 0]]; // six-way: up, down, north, south, west, east
const F4TO6 = [2, 5, 3, 4]; // four-way facing (north, east, south, west) as a six-way direction
const d6of = (dx, dy, dz) => dy > 0 ? 0 : dy < 0 ? 1 : dz < 0 ? 2 : dz > 0 ? 3 : dx < 0 ? 4 : 5;
const H6 = { 2: 0, 5: 1, 3: 2, 4: 3 }; // six-way horizontal direction -> four-way
// ---- what each block is, as far as redstone cares ----
const K = { WIRE: 1, LEVER: 2, BUTTON: 3, PLATE: 4, TORCH: 5, RBLOCK: 6, REP: 7, CMP: 8, OBS: 9, DAY: 10, TGT: 11, TRAP: 12, DRAIL: 13 };
const RSK = new Uint8Array(ITEM_BASE), COND = new Uint8Array(ITEM_BASE), RSU = new Uint8Array(ITEM_BASE);
for (const d of BL) { if (!d) continue; const id = d.id;
  let k = 0; if (d.wire) k = K.WIRE; else if (d.key === 'lever' || d.key === 'lever_on') k = K.LEVER; else if (d.shape === 'button') k = K.BUTTON; else if (d.shape === 'plate') k = K.PLATE; else if (d.rsTorch) k = K.TORCH; else if (d.key === 'redstone_block') k = K.RBLOCK;
  else if (d.repeater) k = K.REP; else if (d.comparator) k = K.CMP; else if (d.observer) k = K.OBS; else if (d.daylight) k = K.DAY; else if (d.target) k = K.TGT; else if (d.trapped) k = K.TRAP; else if (d.rail && d.rail.type === 'detector_rail') k = K.DRAIL; RSK[id] = k;
  COND[id] = OPAQUE[id] && SOLID[id] && (!d.shape || (d.shape === 'slab' && d.st.type === 'double')) && !k && !d.piston && !d.observer && d.key !== 'redstone_block' && !(d.use === 'chest' && !d.dispenser && !d.dropper) && !d.h ? 1 : 0;
  // what has to re-check its inputs when something nearby changes
  RSU[id] = k === K.WIRE ? 1 : k === K.TORCH ? 2 : k === K.REP ? 3 : k === K.CMP ? 4 : d.lamp ? 5 : (d.piston && !d.pistonHead) ? 6 : d.pistonHead ? 7 : (d.dispenser || d.dropper) ? 8 : d.note !== undefined ? 9 : id === B.TNT ? 10 : d.hopper ? 11 : 0; }
const rget = (x, y, z) => world.get(x, y, z);
const torchAttach = (x, y, z, get) => { if (SOLID[get(x, y - 1, z)]) return 1; for (const [a, b] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) if (SOLID[get(x + a, y, z + b)]) return d6of(a, 0, b); return 1; };
const buttonAttach = (st) => st.face === 'floor' ? 1 : st.face === 'ceiling' ? 0 : d6of(-DV4[st.facing][0], 0, -DV4[st.facing][1]);
// ---- dust connections: [north, east, south, west], 0 none, 1 along the ground, 2 up the side of a block ----
function wireLinksTo(id, s) { // can dust on side s (four-way, as seen from the dust) connect to this block?
  const k = RSK[id]; if (!k) return false; const d = BL[id];
  if (k === K.REP) return (d.st.facing & 1) === (s & 1); if (k === K.OBS) return d.st.facing === F4TO6[s]; return true; }
function wireConn(x, y, z, get) { const out = [0, 0, 0, 0]; const aboveC = COND[get(x, y + 1, z)];
  for (let s = 0; s < 4; s++) { const dx = DV4[s][0], dz = DV4[s][1]; const n = get(x + dx, y, z + dz);
    if (RSK[n] === K.WIRE) out[s] = 1; else if (!aboveC && RSK[get(x + dx, y + 1, z + dz)] === K.WIRE && SOLID[n]) out[s] = 2;
    else if (!COND[n] && RSK[get(x + dx, y - 1, z + dz)] === K.WIRE) out[s] = 1; else if (wireLinksTo(n, s)) out[s] = 1;
    if (out[s] === 0 && RSK[n] === K.OBS) { const ob = BL[n]; if (ob.st.facing === F4TO6[s]) out[s] = 1; } } // an observer's back faces the dust
  return out; }
function wireNeighbours(x, y, z) { const out = []; const aboveC = COND[rget(x, y + 1, z)];
  for (let s = 0; s < 4; s++) { const dx = DV4[s][0], dz = DV4[s][1]; const n = rget(x + dx, y, z + dz);
    if (RSK[n] === K.WIRE) out.push([x + dx, y, z + dz]); if (!aboveC && SOLID[n] && RSK[rget(x + dx, y + 1, z + dz)] === K.WIRE) out.push([x + dx, y + 1, z + dz]);
    if (!COND[n] && RSK[rget(x + dx, y - 1, z + dz)] === K.WIRE) out.push([x + dx, y - 1, z + dz]); }
  return out; }
// ---- how much power a block sends one way (dir: six-way, from this block toward the neighbour) ----
function rsEmit(x, y, z, id, dir, strong) { const k = RSK[id]; if (!k) return 0; const d = BL[id];
  switch (k) {
    case K.WIRE: { const p = d.wirePower; if (!p || dir === 0) return 0; if (dir === 1) return p; const c = wireConn(x, y, z, rget); const h = H6[dir]; const n = (c[0] ? 1 : 0) + (c[1] ? 1 : 0) + (c[2] ? 1 : 0) + (c[3] ? 1 : 0);
      if (!n) return p; if (n === 1) { const s = c.findIndex(Boolean); return h === s || h === (s + 2) % 4 ? p : 0; } return c[h] ? p : 0; }
    case K.LEVER: return d.key === 'lever_on' ? (strong ? (dir === 1 ? 15 : 0) : 15) : 0;
    case K.BUTTON: return d.st.powered ? (strong ? (dir === buttonAttach(d.st) ? 15 : 0) : 15) : 0;
    case K.PLATE: { if (!d.st.powered) return 0; const p = d.plate === 'light' || d.plate === 'heavy' ? (RS.plateLvl && RS.plateLvl.get(keyOf(x, y, z))) || 15 : 15; return strong ? (dir === 1 ? p : 0) : p; }
    case K.TORCH: { if (d.torchOff) return 0; const a = torchAttach(x, y, z, rget); if (dir === a) return 0; return strong ? (dir === 0 ? 15 : 0) : 15; }
    case K.RBLOCK: return strong ? 0 : 15;
    case K.REP: return d.st.powered && dir === F4TO6[d.st.facing] ? 15 : 0;
    case K.CMP: return dir === F4TO6[d.st.facing] ? cmpOut(x, y, z, d) : 0;
    case K.OBS: return d.st.ex && dir === (d.st.facing ^ 1) ? 15 : 0;
    case K.DAY: return strong ? 0 : RS.day.get(keyOf(x, y, z)) || 0;
    case K.TGT: return strong ? 0 : RS.tgt.has(keyOf(x, y, z)) ? RS.tgt.get(keyOf(x, y, z))[0] : 0;
    case K.TRAP: { const n = Math.min(15, RS.trap.get(keyOf(x, y, z)) || 0); return strong ? (dir === 1 ? n : 0) : n; }
    case K.DRAIL: return d.rail.on ? (strong ? (dir === 1 ? 15 : 0) : 15) : 0;
  }
  return 0; }
function cmpOut(x, y, z, d) { const v = RS.cmp.get(keyOf(x, y, z)); return v !== undefined ? v : d.st.powered ? 15 : 0; }
// strong power a solid block holds (dust excluded when noDust)
function condPower(x, y, z, noDust) { let best = 0; for (let k = 0; k < 6; k++) { const v = RV[k]; const X = x + v[0], Y = y + v[1], Z = z + v[2]; const id = rget(X, Y, Z); if (!RSK[id] || (noDust && RSK[id] === K.WIRE)) continue; const p = rsEmit(X, Y, Z, id, k ^ 1, true); if (p > best) { best = p; if (best >= 15) return 15; } } return best; }
// the signal reaching (x,y,z) from its neighbour in direction dir
function sigFrom(x, y, z, dir, noDust) { const v = RV[dir]; const X = x + v[0], Y = y + v[1], Z = z + v[2]; const id = rget(X, Y, Z);
  if (RSK[id]) return noDust && RSK[id] === K.WIRE ? 0 : rsEmit(X, Y, Z, id, dir ^ 1, false); if (COND[id]) return condPower(X, Y, Z, noDust); return 0; }
function powerAt(x, y, z, skip) { let best = 0; for (let k = 0; k < 6; k++) { if (k === skip) continue; const p = sigFrom(x, y, z, k, false); if (p > best) { best = p; if (best >= 15) return 15; } } return best; }
// the old helpers (doors, trapdoors, gates, copper bulbs, rails) now use the full model
blockPowered = function (x, y, z) { return powerAt(x, y, z) > 0; };
if (typeof directPower === 'function') directPower = function (x, y, z) { return powerAt(x, y, z) > 0; };
// ---- notifications and scheduled ticks ----
function rsNotify(x, y, z) { if (RS.q.size > 30000) return; for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) { const r = 2 - Math.abs(a) - Math.abs(b); if (r < 0) continue; for (let c = -r; c <= r; c++) { if (RS.quiet && RSK[rget(x + a, y + b, z + c)] === K.WIRE) continue; RS.q.add(keyOf(x + a, y + b, z + c)); } } }
function rsSchedule(x, y, z, kind, delay) { const k = keyOf(x, y, z) + '|' + kind; if (!RS.sched.has(k)) RS.sched.set(k, RS.tick + Math.max(1, delay)); }
const rsPending = (x, y, z, kind) => RS.sched.has(keyOf(x, y, z) + '|' + kind);
const rsWatchable = (id) => { const d = BL[id]; return !!(d && (d.hopper || d.daylight || d.comparator || d.target)); };
function rsSet(x, y, z, id) { world.set(x, y, z, id); mpBlock(x, y, z, id); }
// observers watch the block in front of them
function rsObserve(x, y, z) { for (let k = 0; k < 6; k++) { const v = RV[k]; const X = x + v[0], Y = y + v[1], Z = z + v[2]; const d = BL[rget(X, Y, Z)]; if (!d || !d.observer || d.st.facing !== (k ^ 1)) continue; if (!d.st.ex && !rsPending(X, Y, Z, 'obs')) rsSchedule(X, Y, Z, 'obs', 2); } }
{ const _set = World.prototype.set; World.prototype.set = function (x, y, z, id, record) {
    const mine = this === G.world; const old = mine ? this.get(x, y, z) : 0; const r = _set.apply(this, arguments);
    if (r !== false && mine) { rsNotify(x, y, z); rsObserve(x, y, z); const k = keyOf(x, y, z); if (rsWatchable(id)) RS.watch.add(k); else if (rsWatchable(old)) RS.watch.delete(k);
      if (RSK[old] || RSK[id] || COND[old] !== COND[id]) { if (typeof POWER !== 'undefined') POWER.dirty = true; }
      if (BL[old] && BL[old].comparator && !(BL[id] && BL[id].comparator)) RS.cmp.delete(k); }
    return r; }; }
// ---- dust networks: every connected piece of dust is recomputed together ----
function wireNetwork(x0, y0, z0, seen) {
  const nodes = new Map(); const st = [[x0, y0, z0]]; nodes.set(keyOf(x0, y0, z0), { p: [x0, y0, z0], n: null, lvl: 0 });
  while (st.length && nodes.size < 6000) { const p = st.pop(); const node = nodes.get(keyOf(p[0], p[1], p[2])); node.n = wireNeighbours(p[0], p[1], p[2]);
    for (const q of node.n) { const k = keyOf(q[0], q[1], q[2]); if (!nodes.has(k)) { nodes.set(k, { p: q, n: null, lvl: 0 }); st.push(q); } } }
  const buckets = Array.from({ length: 16 }, () => []);
  for (const [k, nd] of nodes) { seen.add(k); if (!nd.n) nd.n = wireNeighbours(nd.p[0], nd.p[1], nd.p[2]); let e = 0; for (let d = 0; d < 6; d++) { const v = sigFrom(nd.p[0], nd.p[1], nd.p[2], d, true); if (v > e) e = v; } nd.lvl = e; if (e) buckets[e].push(nd); }
  for (let L = 15; L >= 2; L--) for (const nd of buckets[L]) { if (nd.lvl !== L) continue; for (const q of nd.n) { const m = nodes.get(keyOf(q[0], q[1], q[2])); if (m && m.lvl < L - 1) { m.lvl = L - 1; buckets[L - 1].push(m); } } }
  RS.quiet = true; try { for (const [, nd] of nodes) { const id = FAMILY.redstone_wire.ids[nd.lvl]; const [x, y, z] = nd.p; if (rget(x, y, z) !== id && RSK[rget(x, y, z)] === K.WIRE) rsSet(x, y, z, id); } } finally { RS.quiet = false; }
}
// ---- each kind of block re-checking itself ----
function repInput(x, y, z, d) { return sigFrom(x, y, z, F4TO6[d.st.facing] ^ 1, false); }
function diodeLocked(x, y, z, d) { const f = d.st.facing; for (const s of [(f + 1) % 4, (f + 3) % 4]) { const v = RV[F4TO6[s]]; const X = x + v[0], Z = z + v[2]; const id = rget(X, y, Z); const n = BL[id]; if (!n || !(n.repeater || n.comparator)) continue; if (F4TO6[n.st.facing] === (F4TO6[s] ^ 1) && rsEmit(X, y, Z, id, F4TO6[s] ^ 1, true) > 0) return true; } return false; }
function containerSignal(x, y, z) { const d = BL[rget(x, y, z)]; if (!d) return -1;
  if (d.key === 'end_portal_frame_eye') return 15; if (d.key === 'end_portal_frame') return 0;
  if (d.cake !== undefined) return (7 - d.cake) * 2; if (d.composter !== undefined) return d.composter;
  const c = contAt(x, y, z); if (!c) return -1; let sum = 0, any = false; for (const s of c.slots) { const it = c.arr[s]; if (it) { any = true; sum += it.count / stackMax(it.id); } } return any ? Math.floor(1 + sum / c.slots.length * 14) : 0; }
function cmpInput(x, y, z, d) { const back = F4TO6[d.st.facing] ^ 1; let a = sigFrom(x, y, z, back, false); const v = RV[back]; const bx = x + v[0], bz = z + v[2];
  const cs = containerSignal(bx, y, bz); if (cs >= 0) a = cs; else if (a < 15 && COND[rget(bx, y, bz)]) { const c2 = containerSignal(bx + v[0], y, bz + v[2]); if (c2 > a) a = c2; }
  return a; }
function cmpSide(x, y, z, d) { const f = d.st.facing; let best = 0; for (const s of [(f + 1) % 4, (f + 3) % 4]) { const dir = F4TO6[s]; const v = RV[dir]; const X = x + v[0], Z = z + v[2]; const id = rget(X, y, Z); const k = RSK[id];
    const p = k === K.WIRE ? BL[id].wirePower : k === K.RBLOCK ? 15 : k ? rsEmit(X, y, Z, id, dir ^ 1, true) : 0; if (p > best) best = p; } return best; }
function cmpCompute(x, y, z, d) { const a = cmpInput(x, y, z, d), s = cmpSide(x, y, z, d); return d.st.mode === 'subtract' ? Math.max(0, a - s) : a >= s ? a : 0; }
function pistonPowered(x, y, z, f) { for (let k = 0; k < 6; k++) if (k !== f && sigFrom(x, y, z, k, false) > 0) return true; for (let k = 0; k < 6; k++) if (k !== 1 && sigFrom(x, y + 1, z, k, false) > 0) return true; return false; } // quasi-connectivity: the block above counts too
function rsUpdate(x, y, z) {
  const id = rget(x, y, z); const u = RSU[id]; if (!u) return; const d = BL[id]; const k = keyOf(x, y, z);
  switch (u) {
    case 1: RS.dustQ.add(k); return;
    case 2: { const a = torchAttach(x, y, z, rget); const v = RV[a]; const ap = rsAttachedPower(x + v[0], y + v[1], z + v[2], a ^ 1); const want = ap === 0;
      if (want === !d.torchOff || rsPending(x, y, z, 'torch')) return; if (want && RS.burnt.has(k) && RS.burnt.get(k) > RS.tick) return; rsSchedule(x, y, z, 'torch', 2); return; }
    case 3: { const lk = diodeLocked(x, y, z, d) ? 1 : 0; if (lk !== d.st.locked) { rsSet(x, y, z, withState(id, { locked: lk })); return; } if (lk) return;
      const on = repInput(x, y, z, d) > 0; if (on !== !!d.st.powered && !rsPending(x, y, z, 'rep')) rsSchedule(x, y, z, 'rep', d.st.delay * 2); return; }
    case 4: { const o = cmpCompute(x, y, z, d); if ((o !== cmpOut(x, y, z, d) || (o > 0) !== !!d.st.powered) && !rsPending(x, y, z, 'cmp')) rsSchedule(x, y, z, 'cmp', 2); return; }
    case 5: { const p = powerAt(x, y, z) > 0; if (p && !d.lit) rsSet(x, y, z, B.REDSTONE_LAMP_ON); else if (!p && d.lit && !rsPending(x, y, z, 'lamp')) rsSchedule(x, y, z, 'lamp', 4); return; }
    case 6: { const f = d.st.facing; const p = pistonPowered(x, y, z, f);
      if (d.extended) { const v = RV[f]; const h = BL[rget(x + v[0], y + v[1], z + v[2])]; if (!h || !h.pistonHead || h.facing6 !== f) { rsSet(x, y, z, withState(id, { ex: 0 })); return; } if (!p) pistonMove(x, y, z, false); }
      else if (p) pistonMove(x, y, z, true); return; }
    case 7: { const f = d.facing6; const v = RV[f]; const b = BL[rget(x - v[0], y - v[1], z - v[2])]; if (!b || !b.piston || !b.extended || b.st.facing !== f) rsSet(x, y, z, 0); return; }
    case 8: { const p = powerAt(x, y, z) > 0 || powerAt(x, y + 1, z, 1) > 0; const was = RS.edge.get(k) || false; if (p !== was) { RS.edge.set(k, p); if (p && !rsPending(x, y, z, 'fire')) rsSchedule(x, y, z, 'fire', 4); } return; }
    case 9: { const p = powerAt(x, y, z) > 0; const was = RS.edge.get(k) || false; if (p !== was) { RS.edge.set(k, p); if (p) playNote(x, y, z); } return; }
    case 10: if (powerAt(x, y, z) > 0) { rsSet(x, y, z, 0); primeTNT(x, y, z, 4); } return;
    case 11: return; // hoppers check their lock when they try to move items
  }
}
// the power in a torch's support block: a solid block's strong power (dust included), or what a component sends at it
function rsAttachedPower(x, y, z, towardTorch) { const id = rget(x, y, z); if (COND[id]) return Math.max(condPower(x, y, z, false), 0); if (RSK[id]) return rsEmit(x, y, z, id, towardTorch, false); return 0; }
function rsRun(kind, x, y, z) {
  const id = rget(x, y, z); const d = BL[id]; if (!d) return; const k = keyOf(x, y, z);
  switch (kind) {
    case 'torch': { if (!d.rsTorch) return; const a = torchAttach(x, y, z, rget); const v = RV[a]; const want = rsAttachedPower(x + v[0], y + v[1], z + v[2], a ^ 1) === 0; if (want === !d.torchOff) return;
      if (want && RS.burnt.has(k) && RS.burnt.get(k) > RS.tick) return;
      const h = (RS.torch.get(k) || []).filter(t => t > RS.tick - 60); h.push(RS.tick); RS.torch.set(k, h);
      if (h.length > 8 && !want) { RS.burnt.set(k, RS.tick + 160); RS.torch.delete(k); rsSet(x, y, z, B.REDSTONE_TORCH_OFF); Sfx.at('fizz', new V3(x + 0.5, y + 0.5, z + 0.5), 0.6); Particles.emit(x + 0.5, y + 0.8, z + 0.5, 6, [[0.5, 0.5, 0.5]], 0.6, 1, -3, 0.15); rsSchedule(x, y, z, 'relight', 161); return; }
      rsSet(x, y, z, want ? B.REDSTONE_TORCH : B.REDSTONE_TORCH_OFF); return; }
    case 'relight': RS.burnt.delete(k); rsUpdate(x, y, z); return;
    case 'rep': { if (!d.repeater || d.st.locked) return; const on = repInput(x, y, z, d) > 0;
      if (!d.st.powered) { rsSet(x, y, z, withState(id, { powered: 1 })); if (!on) rsSchedule(x, y, z, 'rep', d.st.delay * 2); }
      else if (!on) rsSet(x, y, z, withState(id, { powered: 0 })); return; }
    case 'cmp': { if (!d.comparator) return; const o = cmpCompute(x, y, z, d); const prev = cmpOut(x, y, z, d); RS.cmp.set(k, o); const nid = withState(id, { powered: o > 0 ? 1 : 0 });
      if (nid !== id) rsSet(x, y, z, nid); else if (o !== prev) { const v = RV[F4TO6[d.st.facing]]; rsNotify(x + v[0], y, z + v[2]); rsNotify(x, y, z); } return; }
    case 'lamp': if (d.lamp && d.lit && powerAt(x, y, z) === 0) rsSet(x, y, z, B.REDSTONE_LAMP); return;
    case 'obs': if (d.observer && !d.st.ex) { rsSet(x, y, z, withState(id, { ex: 1 })); rsSchedule(x, y, z, 'obsoff', 2); } return;
    case 'obsoff': if (d.observer && d.st.ex) rsSet(x, y, z, withState(id, { ex: 0 })); return;
    case 'fire': if (d.dispenser || d.dropper) dispenseFrom(x, y, z, d); return;
    case 'tgt': { const t = RS.tgt.get(k); if (t && t[1] <= RS.tick) { RS.tgt.delete(k); rsNotify(x, y, z); } return; }
  }
}
// ---- pistons ----
const PISTON_FIXED = new Set(['obsidian', 'crying_obsidian', 'bedrock', 'respawn_anchor', 'reinforced_deepslate', 'end_portal_frame', 'end_portal_frame_eye', 'end_portal', 'end_gateway', 'nether_portal', 'nether_portal_z', 'barrier', 'spawner', 'enchanting_table', 'beacon', 'jukebox', 'lectern', 'brewing_stand', 'bell', 'conduit', 'daylight_detector', 'daylight_detector#inverted', 'trial_spawner', 'vault', 'ender_chest', 'furnace', 'smoker', 'blast_furnace', 'barrel', 'chest', 'trapped_chest', 'hopper', 'dispenser', 'dropper', 'beehive', 'bee_nest', 'sculk_sensor', 'sculk_shrieker', 'sculk_catalyst', 'crafter', 'decorated_pot', 'chiseled_bookshelf', 'campfire', 'soul_campfire']);
const PISTON_POP = new Set(['pumpkin', 'carved_pumpkin', 'jack_o_lantern', 'melon', 'cobweb', 'dragon_egg', 'cactus', 'sugar_cane', 'ladder', 'vine', 'lily_pad', 'cake', 'scaffolding', 'snow', 'turtle_egg', 'sea_pickle', 'cocoa', 'bamboo', 'bamboo_sapling', 'lantern', 'soul_lantern', 'chorus_plant', 'chorus_flower', 'big_dripleaf', 'small_dripleaf', 'flower_pot', 'end_rod', 'lightning_rod', 'beacon']);
function pushReaction(id) { // 'air', 'block' (cannot move), 'destroy' (pops off and drops), 'push_only', 'normal'
  if (!id || FKIND[id]) return 'air'; const d = BL[id]; if (!d) return 'block'; const base = d.key.split('#')[0];
  if (d.hardness < 0 || PISTON_FIXED.has(base) || d.fixed || d.shulker && false) return 'block';
  if (d.piston && !d.pistonHead) return d.extended ? 'block' : 'normal'; if (d.pistonHead) return 'block';
  if (d.shulker || d.bedPart || PISTON_POP.has(base) || PLANT[id] || !SOLID[id] || d.render === 'cross' || d.render === 'torch' || d.render === 'rail' || d.render === 'flat' || /^(door|button|plate|diode|wire)$/.test(d.shape || '') || d.support || d.drip || d.crop !== undefined || d.layers) return 'destroy';
  if (d.glazed || /glazed_terracotta/.test(d.key)) return 'push_only';
  return 'normal'; }
const isSticky = (id) => id === B.SLIME_BLOCK || id === B.HONEY_BLOCK;
const sticksTo = (a, b) => !((a === B.HONEY_BLOCK && b === B.SLIME_BLOCK) || (a === B.SLIME_BLOCK && b === B.HONEY_BLOCK)) && (isSticky(a) || isSticky(b));
function pistonResolve(px, py, pz, facing, extending) { // Minecraft's PistonStructureResolver
  const fv = RV[facing]; const pd = extending ? fv : [-fv[0], -fv[1], -fv[2]]; const start = extending ? [px + fv[0], py + fv[1], pz + fv[2]] : [px + 2 * fv[0], py + 2 * fv[1], pz + 2 * fv[2]];
  const toPush = [], toDestroy = []; const K2 = (p) => p[0] + ',' + p[1] + ',' + p[2]; const pk = K2([px, py, pz]); const idxOf = (p) => { const k = K2(p); for (let i = 0; i < toPush.length; i++) if (K2(toPush[i]) === k) return i; return -1; };
  const pushable = (p, allowDestroy, moveAlongFacing) => { if (p[1] < 1 || p[1] >= WH - 1) return false; const r = pushReaction(rget(p[0], p[1], p[2])); if (r === 'block') return false; if (r === 'destroy') return allowDestroy; if (r === 'push_only') return moveAlongFacing; return true; };
  const along = (dir) => dir[0] === fv[0] && dir[1] === fv[1] && dir[2] === fv[2];
  const add = (p, a) => [p[0] + a[0], p[1] + a[1], p[2] + a[2]]; const mul = (a, n) => [a[0] * n, a[1] * n, a[2] * n]; const opp = mul(pd, -1);
  const reorder = (offsets, index) => { const l1 = toPush.slice(0, index), l2 = toPush.slice(toPush.length - offsets), l3 = toPush.slice(index, toPush.length - offsets); toPush.length = 0; toPush.push(...l1, ...l2, ...l3); };
  let addLine;
  const branch = (from) => { const s = rget(from[0], from[1], from[2]); for (const v of RV) { if ((v[0] && pd[0]) || (v[1] && pd[1]) || (v[2] && pd[2])) continue; const q = add(from, v); if (sticksTo(rget(q[0], q[1], q[2]), s) && !addLine(q, v)) return false; } return true; };
  addLine = (origin, dir) => { let s = rget(origin[0], origin[1], origin[2]); if (pushReaction(s) === 'air') return true; if (!pushable(origin, false, along(dir))) return true; if (K2(origin) === pk) return true; if (idxOf(origin) > -1) return true;
    let i = 1; if (i + toPush.length > 12) return false;
    while (isSticky(s)) { const q = add(origin, mul(opp, i)); const prev = s; s = rget(q[0], q[1], q[2]); if (pushReaction(s) === 'air' || !sticksTo(prev, s) || !pushable(q, false, along(opp)) || K2(q) === pk) break; i++; if (i + toPush.length > 12) return false; }
    let l = 0; for (let j = i - 1; j >= 0; j--) { toPush.push(add(origin, mul(opp, j))); l++; }
    for (let j = 1; ; j++) { const q = add(origin, mul(pd, j)); const at = idxOf(q);
      if (at > -1) { reorder(l, at); for (let m = 0; m <= at + l; m++) { const b = toPush[m]; if (isSticky(rget(b[0], b[1], b[2])) && !branch(b)) return false; } return true; }
      const id = rget(q[0], q[1], q[2]); const r = pushReaction(id); if (r === 'air') return true; if (!pushable(q, true, along(pd)) || K2(q) === pk) return false;
      if (r === 'destroy') { toDestroy.push(q); return true; } if (toPush.length >= 12) return false; toPush.push(q); l++; } };
  const r0 = pushReaction(rget(start[0], start[1], start[2]));
  if (r0 !== 'air' && !pushable(start, false, along(pd))) { if (extending && r0 === 'destroy') { toDestroy.push(start); return { toPush, toDestroy, pd }; } return extending ? null : { toPush: [], toDestroy: [], pd }; }
  if (!addLine(start, pd)) return null;
  for (let i = 0; i < toPush.length; i++) { const b = toPush[i]; if (isSticky(rget(b[0], b[1], b[2])) && !branch(b)) return null; }
  return { toPush, toDestroy, pd }; }
function pistonMove(x, y, z, extending) {
  const id = rget(x, y, z); const d = BL[id]; if (!d || !d.piston) return false; const f = d.st.facing; const fv = RV[f]; const hx = x + fv[0], hy = y + fv[1], hz = z + fv[2]; const pos = new V3(x + 0.5, y + 0.5, z + 0.5);
  if (!extending) { // retract: drop the head, then a sticky piston pulls the block in front back
    if (BL[rget(hx, hy, hz)] && BL[rget(hx, hy, hz)].pistonHead) rsSet(hx, hy, hz, 0); rsSet(x, y, z, withState(id, { ex: 0 })); Sfx.at('piston_in', pos, 0.8);
    if (d.sticky) { const fx = x + 2 * fv[0], fy = y + 2 * fv[1], fz = z + 2 * fv[2]; const r = pushReaction(rget(fx, fy, fz)); if (r === 'normal' || r === 'push_only' && false) { const res = pistonResolve(x, y, z, f, false); if (res) applyMove(res, null); } }
    return true; }
  const res = pistonResolve(x, y, z, f, true); if (!res) return false;
  applyMove(res, [hx, hy, hz]); rsSet(x, y, z, withState(id, { ex: 1 })); rsSet(hx, hy, hz, FAMILY[d.fam].heads[f]); Sfx.at('piston_out', pos, 0.8); return true; }
function applyMove(res, headAt) { const { toPush, toDestroy, pd } = res;
  for (const p of toDestroy) { const id = rget(p[0], p[1], p[2]); if (!id) continue; onBlockRemoved(p[0], p[1], p[2], id); rsSet(p[0], p[1], p[2], 0); Particles.blockBreak(p[0], p[1], p[2], id, 8); if (S.rules.doTileDrops !== false) { const dr = BL[id].fam && FAMILY[BL[id].fam] ? [IT[BL[id].fam] !== undefined ? IT[BL[id].fam] : FAMILY[BL[id].fam].base, 1] : blockDrop(id); if (dr && dr[0] !== undefined && (!BL[id].shape || BL[id].shape !== 'door' || BL[id].st.half === 'lower')) dropItem(dr[0], dr[1], p[0] + 0.5, p[1] + 0.3, p[2] + 0.5); } }
  const ids = toPush.map(p => rget(p[0], p[1], p[2])); const dest = new Set(toPush.map(p => keyOf(p[0] + pd[0], p[1] + pd[1], p[2] + pd[2]))); if (headAt) dest.add(keyOf(headAt[0], headAt[1], headAt[2]));
  for (const p of toPush) if (!dest.has(keyOf(p[0], p[1], p[2]))) rsSet(p[0], p[1], p[2], 0);
  toPush.forEach((p, i) => rsSet(p[0] + pd[0], p[1] + pd[1], p[2] + pd[2], ids[i]));
  // entities in the way are shoved along; slime blocks moving up launch them
  const cells = toPush.map((p, i) => [p[0] + pd[0], p[1] + pd[1], p[2] + pd[2], ids[i]]); if (headAt) cells.push([headAt[0], headAt[1], headAt[2], 0]);
  const shove = (e) => { if (!e || !e.pos || e.dead) return; for (const c of cells) { const hit = e.pos.x + (e.hw || 0.3) > c[0] && e.pos.x - (e.hw || 0.3) < c[0] + 1 && e.pos.y + (e.h || 0.5) > c[1] && e.pos.y < c[1] + 1.01 && e.pos.z + (e.hw || 0.3) > c[2] && e.pos.z - (e.hw || 0.3) < c[2] + 1;
      if (hit) { e.pos.x += pd[0]; e.pos.y += pd[1] > 0 ? Math.max(pd[1], c[1] + 1 - e.pos.y) : pd[1]; e.pos.z += pd[2]; if (c[3] === B.SLIME_BLOCK && e.vel) { e.vel.x += pd[0] * 8; e.vel.z += pd[2] * 8; if (pd[1] > 0) e.vel.y = Math.max(e.vel.y, 14); } return; } } };
  if (!player.dead && !isSpec()) shove(player); for (const m of G.mobs) shove(m); for (const it of G.items || []) shove(it); }
// ---- containers (chests, barrels, shulker boxes, dispensers, droppers, hoppers, furnaces) ----
function invAt(k, n) { let a = world.chestInv.get(k); if (!a) { a = world.chestLoot && world.chestLoot.has(k) && typeof rollLoot === 'function' ? rollLoot(world.chestLoot.get(k), ihash(...k.split(',').map(Number), world.seed)) : new Array(n).fill(null); world.chestInv.set(k, a); } return a; }
function contAt(x, y, z) { const id = rget(x, y, z); const d = BL[id]; if (!d) return null; const k = keyOf(x, y, z);
  if (d.use === 'chest' && !d.ender) { const n = d.slots || 27; const arr = invAt(k, n); return { arr, k, x, y, z, kind: 'box', slots: [...Array(arr.length).keys()] }; }
  if (d.use === 'furnace' && typeof getFurnace === 'function') { const f = getFurnace(k); return { arr: f.s, k, x, y, z, kind: 'furn', slots: [0, 1, 2] }; }
  return null; }
function canStack(a, it) { return a.id === it.id && !xtra(a) && !xtra(it) && a.count < stackMax(a.id); }
// put one of `it` in; `from` is the six-way side of the container it comes in through
function contInsert(c, it, from) { let slots = c.slots; if (c.kind === 'furn') { if (from === 0) slots = [0]; else if (from === 1) return false; else { if (!FUEL[it.id]) return false; slots = [1]; } }
  if (c.kind === 'box' && BL[rget(c.x, c.y, c.z)].shulker && ITEMS[it.id] && ITEMS[it.id].kind === 'block' && BL[it.id] && BL[it.id].shulker) return false;
  for (const s of slots) { const a = c.arr[s]; if (a && canStack(a, it)) { a.count++; contChanged(c); return true; } }
  for (const s of slots) if (!c.arr[s]) { c.arr[s] = Object.assign({}, it, { count: 1 }); contChanged(c); return true; } return false; }
function contExtractSlots(c, from) { if (c.kind === 'furn') return from === 1 ? [2, 1].filter(s => s === 2 || (c.arr[1] && c.arr[1].id === IT.bucket)) : []; return c.slots; }
function contChanged(c) { rsNotify(c.x, c.y, c.z); if ((S.chestKey === c.k || S.furnKey === c.k) && typeof renderInvUI === 'function') renderInvUI(); }
// ---- hoppers: every 8 ticks push one item out of the spout, then pull one from above ----
function hopperTick(x, y, z) { const k = keyOf(x, y, z); const cd = RS.hopCd.get(k) || 0; if (cd > RS.tick) return; const id = rget(x, y, z); const d = BL[id]; if (!d || !d.hopper) { RS.watch.delete(k); return; }
  if (powerAt(x, y, z) > 0) return; const me = contAt(x, y, z); if (!me) return; let moved = false; const f = d.hopper; const v = RV[f];
  const tgt = contAt(x + v[0], y + v[1], z + v[2]);
  if (tgt) for (const s of me.slots) { const it = me.arr[s]; if (!it) continue; if (contInsert(tgt, it, f ^ 1)) { it.count--; if (!it.count) me.arr[s] = null; contChanged(me); moved = true; break; } }
  const src = contAt(x, y + 1, z);
  if (src) { for (const s of contExtractSlots(src, 1)) { const it = src.arr[s]; if (!it) continue; if (contInsert(me, it, 0)) { it.count--; if (!it.count) src.arr[s] = null; contChanged(src); moved = true; break; } } }
  else if (!OPAQUE[rget(x, y + 1, z)]) { for (const e of G.items || []) { if (e.gone || e.pickDelay > 0) continue; if (e.pos.x < x || e.pos.x > x + 1 || e.pos.z < z || e.pos.z > z + 1 || e.pos.y < y + 0.6 || e.pos.y > y + 2) continue;
      while (e.count > 0 && contInsert(me, Object.assign({ id: e.id, count: 1 }, e.extra || {}), 0)) { e.count--; moved = true; } if (e.count <= 0 && typeof e.remove === 'function') { e.remove(); e.gone = true; } break; } }
  if (moved) RS.hopCd.set(k, RS.tick + 8); }
// ---- dispensers and droppers ----
function dispenseFrom(x, y, z, d) { const c = contAt(x, y, z); if (!c) return; const full = c.slots.filter(s => c.arr[s]); const pos = new V3(x + 0.5, y + 0.5, z + 0.5);
  if (!full.length) { Sfx.at('dispense_fail', pos, 0.7); return; }
  const s = full[Math.random() * full.length | 0]; const it = c.arr[s]; const f = d.st.facing; const v = RV[f]; const fx = x + v[0], fy = y + v[1], fz = z + v[2];
  const take = (n = 1) => { it.count -= n; if (it.count <= 0) c.arr[s] = null; contChanged(c); };
  const out = new V3(x + 0.5 + v[0] * 0.7, y + 0.5 + v[1] * 0.7 - (v[1] ? 0 : 0.15), z + 0.5 + v[2] * 0.7);
  const smoke = () => { Particles.emit(out.x, out.y, out.z, 5, [[0.3, 0.3, 0.3], [0.5, 0.5, 0.5]], 0.6, 0.6, -2, 0.15); };
  const throwItem = () => { const e = dropItem(it.id, 1, out.x, out.y, out.z, false, xtra(it)); if (e && e.vel) { const sp = 3 + Math.random() * 2; e.vel.set(v[0] * sp + (Math.random() - 0.5) * 0.5, v[1] * sp + (v[1] ? 0 : 1.6), v[2] * sp + (Math.random() - 0.5) * 0.5); } take(); Sfx.at('dispense', pos, 0.8); smoke(); };
  if (d.dropper) { const t = contAt(fx, fy, fz); if (t) { if (contInsert(t, it, f ^ 1)) { take(); Sfx.at('dispense', pos, 0.6); } else Sfx.at('dispense_fail', pos, 0.7); return; } throwItem(); return; }
  const key = ITEMS[it.id] && ITEMS[it.id].key; const dirV = new V3(v[0], v[1] + (v[1] ? 0 : 0.1), v[2]).normalize();
  const proj = (kind, speed, dmg) => { const p = spawnProj(kind, out.clone(), dirV.clone().multiplyScalar(speed), 'mob', dmg); p.dispensed = true; p.cause = 'a Dispenser'; take(); Sfx.at(kind === 'arrow' ? 'bow' : 'dispense', pos, 0.8); smoke(); return p; };
  if (key === 'arrow' || key === 'tipped_arrow' || key === 'spectral_arrow') { const p = proj('arrow', 22, 3); if (key === 'tipped_arrow' && it.pot && typeof POTIONS !== 'undefined') p.effect = null; return; }
  if (key === 'snowball' && PROJ.snowball) { proj('snowball', 22, 0); return; }
  if (key === 'egg' && PROJ.egg) { proj('egg', 22, 0); return; }
  if (key === 'fire_charge' && PROJ.smallfire) { proj('smallfire', 14, 5); Sfx.at('fireball', pos, 0.7); return; }
  if (key === 'water_bucket' || key === 'lava_bucket') { if (replaceableAt(fx, fy, fz) && !(key === 'water_bucket' && world.dim === 'nether')) { const fl = key === 'water_bucket' ? B.WATER : B.LAVA; if (typeof placeFluid === 'function') placeFluid(fx, fy, fz, fl); else rsSet(fx, fy, fz, fl); c.arr[s] = { id: IT.bucket, count: 1 }; contChanged(c); Sfx.at('splash', pos, 0.6); return; } throwItem(); return; }
  if (key === 'bucket') { const t = rget(fx, fy, fz); if (BL[t] && BL[t].fluid && FLEVEL[t] === 0) { rsSet(fx, fy, fz, 0); const full2 = { id: t === B.WATER ? IT.water_bucket : IT.lava_bucket, count: 1 }; take(); if (!contInsert(c, full2, 0)) dropItem(full2.id, 1, out.x, out.y, out.z, false); Sfx.at('splash', pos, 0.6); return; } throwItem(); return; }
  if (it.id === B.TNT) { if (replaceableAt(fx, fy, fz)) { primeTNT(fx, fy, fz, 4); take(); return; } }
  if (key === 'bone_meal') { if (dispenserBoneMeal(fx, fy, fz)) { take(); Sfx.at('dispense', pos, 0.8); } else Sfx.at('dispense_fail', pos, 0.7); return; }
  if (key === 'flint_and_steel') { if (replaceableAt(fx, fy, fz) && B.FIRE && SOLID[rget(fx, fy - 1, fz)]) { rsSet(fx, fy, fz, B.FIRE); Sfx.at('ignite', pos, 0.8); } else if (rget(fx, fy, fz) === B.TNT) { rsSet(fx, fy, fz, 0); primeTNT(fx, fy, fz, 4); } return; }
  if (ITEMS[it.id] && ITEMS[it.id].kind === 'armor' && !player.dead) { const P = player; if (Math.floor(P.pos.x) === fx && Math.floor(P.pos.z) === fz && (Math.floor(P.pos.y) === fy || Math.floor(P.pos.y + 1) === fy)) { const slot = ARMOR_SLOT[ITEMS[it.id].slot]; if (!P.inv[slot]) { P.inv[slot] = Object.assign({}, it, { count: 1 }); take(); invDirty(); Sfx.play('armor', 0.8); return; } } }
  if (ITEMS[it.id] && ITEMS[it.id].kind === 'spawnegg' && ITEMS[it.id].mob && typeof spawnMob === 'function') { spawnMob(ITEMS[it.id].mob, fx + 0.5, fy, fz + 0.5); take(); return; }
  throwItem(); }
// bone meal from a dispenser works on whatever it faces, like a player using it
function dispenserBoneMeal(x, y, z) { const id = rget(x, y, z); if (!id) return false; const slot = handSlot(); const keep = player.inv[slot]; const t0 = target, tm = targetMob, sw = S.swing, mode = S.mode, cd = S.useCD;
  const before = []; for (let dy = -1; dy <= 2; dy++) before.push(rget(x, y + dy, z));
  try { player.inv[slot] = { id: IT.bone_meal, count: 1 }; target = { x, y, z, id, nx: 0, ny: 1, nz: 0, px: x + 0.5, py: y + 1, pz: z + 0.5, dist: 2 }; targetMob = null; S.mode = 'survival'; useAction(player.eye(), new V3(0, -1, 0)); }
  catch (e) { console.error(e); }
  const used = !player.inv[slot] || player.inv[slot].count < 1; player.inv[slot] = keep; target = t0; targetMob = tm; S.swing = sw; S.mode = mode; S.useCD = cd; invDirty();
  let changed = false; for (let dy = -1; dy <= 2; dy++) if (rget(x, y + dy, z) !== before[dy + 1]) changed = true; return used || changed; }
// ---- note blocks: the block underneath picks the instrument ----
function noteInstrument(x, y, z) { const id = rget(x, y - 1, z); const d = BL[id]; if (!d) return 'harp'; const k = d.key;
  if (/gold_block/.test(k)) return 'bell'; if (k === 'clay') return 'flute'; if (k === 'packed_ice') return 'chime'; if (/wool/.test(k)) return 'guitar'; if (k === 'bone_block' || /^bone_block#/.test(k)) return 'xylophone';
  if (k === 'iron_block') return 'iron_xylophone'; if (k === 'soul_sand') return 'cow_bell'; if (k === 'pumpkin') return 'didgeridoo'; if (k === 'emerald_block') return 'bit'; if (/^hay_block/.test(k)) return 'banjo'; if (k === 'glowstone') return 'pling';
  if (d.snd === 'wood' || /planks|log|wood|stem|hyphae/.test(k)) return 'bass'; if (d.snd === 'sand' || /sand|gravel|concrete_powder/.test(k)) return 'snare'; if (d.snd === 'glass' || /glass|sea_lantern|beacon/.test(k)) return 'hat';
  if (SOLID[id] && (d.tool === 'pick' || /stone|ore|brick|obsidian|netherrack|terracotta|deepslate|blackstone|basalt|quartz|prismarine|coral_block|end_stone/.test(k))) return 'basedrum'; return 'harp'; }
const NOTE_OCT = { harp: 0, bass: -2, guitar: -1, didgeridoo: -2, bell: 2, chime: 2, xylophone: 2, flute: 1, cow_bell: 1, iron_xylophone: 0, bit: 0, banjo: 0, pling: 0 };
function playNote(x, y, z) { const d = BL[rget(x, y, z)]; if (!d || d.note === undefined) return; if (rget(x, y + 1, z)) return; // only plays with air above
  const inst = noteInstrument(x, y, z); const n = d.note; const pos = new V3(x + 0.5, y + 1.2, z + 0.5); Sfx.at('note:' + inst + ':' + n, pos, 1);
  const hue = n / 24; const col = [Math.max(0, Math.sin((hue + 0) * 6.28) * 0.65 + 0.35), Math.max(0, Math.sin((hue + 0.33) * 6.28) * 0.65 + 0.35), Math.max(0, Math.sin((hue + 0.67) * 6.28) * 0.65 + 0.35)]; Particles.emit(x + 0.5, y + 1.2, z + 0.5, 1, [col], 0.3, 0.8, -2, 0.05, 1.5); }
{ const _pl = Sfx.play; Sfx.play = function (name, v = 1, rate) {
    if (!this.ctx) return _pl.apply(this, arguments); if (!(v >= 0.02)) return;
    if (typeof name === 'string' && name.startsWith('note:')) { const [, inst, ns] = name.split(':'); const n = +ns; const f = 185 * Math.pow(2, n / 12 + (NOTE_OCT[inst] || 0));
      switch (inst) { case 'basedrum': this.tone(120, 45, 0.18, 0.4 * v, 'sine'); this.nz(0.05, 300, 0.3 * v, 'lowpass'); return; case 'snare': this.nz(0.14, 2600 * Math.pow(2, n / 24), 0.35 * v, 'bandpass', 0.8); return; case 'hat': this.nz(0.05, 7000 * Math.pow(2, n / 24), 0.25 * v, 'highpass'); return;
        case 'bell': case 'chime': this.tone(f, f, 0.9, 0.12 * v, 'sine'); this.tone(f * 2.76, f * 2.76, 0.4, 0.04 * v, 'sine'); return; case 'xylophone': case 'iron_xylophone': this.tone(f, f, 0.22, 0.16 * v, 'triangle'); return;
        case 'bit': this.tone(f, f, 0.3, 0.06 * v, 'square'); return; case 'flute': this.tone(f, f * 1.003, 0.5, 0.1 * v, 'sine'); return; case 'didgeridoo': this.tone(f, f, 0.6, 0.08 * v, 'sawtooth'); return; case 'cow_bell': this.tone(f, f * 0.98, 0.3, 0.1 * v, 'square'); this.tone(f * 1.48, f * 1.46, 0.25, 0.05 * v, 'square'); return;
        case 'guitar': case 'banjo': this.tone(f, f * 0.995, inst === 'banjo' ? 0.35 : 0.6, 0.1 * v, 'sawtooth'); return; case 'bass': this.tone(f, f, 0.45, 0.2 * v, 'triangle'); return;
        default: this.tone(f, f, 0.7, 0.14 * v, 'triangle'); this.tone(f * 2, f * 2, 0.3, 0.03 * v, 'sine'); return; } }
    switch (name) {
      case 'piston_out': this.nz(0.14, 500, 0.5 * v, 'lowpass'); this.tone(160, 90, 0.12, 0.12 * v, 'sawtooth'); return;
      case 'piston_in': this.nz(0.12, 420, 0.45 * v, 'lowpass'); this.tone(120, 180, 0.1, 0.1 * v, 'sawtooth'); return;
      case 'dispense': this.tone(1000, 960, 0.04, 0.08 * v, 'square'); this.nz(0.06, 1800, 0.2 * v, 'bandpass', 2); return;
      case 'dispense_fail': this.tone(1200, 1150, 0.03, 0.07 * v, 'square'); return;
      case 'metal': this.nz(0.1, 3200, 0.3 * v, 'bandpass', 4); this.tone(700, 500, 0.06, 0.05 * v, 'triangle'); return;
      case 'slime': this.nz(0.16, 600, 0.4 * v, 'lowpass', 3); this.tone(240, 120, 0.12, 0.08 * v, 'sine'); return;
    }
    return _pl.apply(this, arguments); }; }
// ---- daylight detectors and targets ----
function daylightLevel(x, y, z, inverted) { const c = world.getChunk(x >> 4, z >> 4); if (!c) return 0; const open = y + 1 >= c.top[(z & 15) * 16 + (x & 15)]; const sky = open ? 15 : 0;
  const dl = typeof G.daylight === 'number' ? G.daylight : 1; const darken = Math.round((1 - Math.max(0, Math.min(1, dl))) * 11);
  if (inverted) return 15 - Math.max(0, sky - darken); return open ? Math.max(0, Math.min(15, Math.round((sky - darken) * Math.max(0, Math.min(1, (dl - 0.15) / 0.85)) ))) : 0; }
function targetHit(x, y, z, p) { const v = p.vel; const ax = Math.abs(v.x), ay = Math.abs(v.y), az = Math.abs(v.z); const fr = (q) => q - Math.floor(q); const h = p.pos;
  const m = ax >= ay && ax >= az ? Math.max(Math.abs(fr(h.y) - 0.5), Math.abs(fr(h.z) - 0.5)) : ay >= az ? Math.max(Math.abs(fr(h.x) - 0.5), Math.abs(fr(h.z) - 0.5)) : Math.max(Math.abs(fr(h.x) - 0.5), Math.abs(fr(h.y) - 0.5));
  const lvl = Math.max(1, Math.ceil(15 * Math.max(0, Math.min(1, (0.5 - m) / 0.5)))); const k = keyOf(x, y, z); const dur = p.kind === 'arrow' ? 20 : 8;
  RS.tgt.set(k, [lvl, RS.tick + dur]); RS.sched.delete(k + '|tgt'); rsSchedule(x, y, z, 'tgt', dur); rsNotify(x, y, z); }
{ const _up = updateProjectiles; updateProjectiles = function (dt) {
    const live = G.projectiles.filter(a => !a.done); const r = _up.apply(this, arguments);
    for (const a of live) { if (!a.done || a.tgtDone) continue; a.tgtDone = true; const back = a.vel.clone().normalize().multiplyScalar(0.06);
      for (const q of [a.pos, a.pos.clone().add(back), a.pos.clone().sub(back)]) { const X = Math.floor(q.x), Y = Math.floor(q.y), Z = Math.floor(q.z); if (BL[rget(X, Y, Z)] && BL[rget(X, Y, Z)].target) { targetHit(X, Y, Z, a); break; } } }
    // dispenser arrows hurt mobs too (the base code only lets player arrows hit mobs)
    for (const a of G.projectiles) if (a.dispensed && !a.done && a.kind === 'arrow') for (const m of G.mobs) { if (m.dead) continue; if (hitsMob(m, a.pos)) { m.hurt(a.dmg, a.pos.clone().addScaledVector(a.vel, -0.2), 0.5); a.done = true; break; } }
    return r; }; }
// ---- the 20 Hz redstone clock ----
function rsScanWatch() { RS.watch.clear(); RS.watchWorld = world; for (const [ck, m] of world.edits) { const cx = Math.floor(ck / 65536) - 32768, cz = (ck % 65536) - 32768; for (const [i, id] of m) if (rsWatchable(id)) RS.watch.add(keyOf(cx * 16 + (i & 15), i >> 8, cz * 16 + ((i >> 4) & 15))); } }
function rsTick() {
  RS.tick++;
  if (RS.sched.size) { const due = []; for (const [k, t] of RS.sched) if (t <= RS.tick) due.push(k); for (const k of due) { RS.sched.delete(k); const [p, kind] = k.split('|'); const [x, y, z] = p.split(',').map(Number); if (world.loaded(x, z)) rsRun(kind, x, y, z); } }
  // block updates spread within the same tick (a few rounds, so a long chain cannot stall the game)
  for (let round = 0; round < 6 && (RS.q.size || RS.dustQ.size); round++) {
    if (RS.q.size) { const list = [...RS.q]; RS.q.clear(); for (const k of list) { const [x, y, z] = k.split(',').map(Number); if (y < 0 || y >= WH) continue; if (RSU[rget(x, y, z)]) rsUpdate(x, y, z); } }
    if (RS.dustQ.size) { const list = [...RS.dustQ]; RS.dustQ.clear(); const seen = new Set(); for (const k of list) { if (seen.has(k)) continue; const [x, y, z] = k.split(',').map(Number); if (RSK[rget(x, y, z)] === K.WIRE) wireNetwork(x, y, z, seen); } } }
  if (RS.watchWorld !== world) rsScanWatch();
  for (const k of RS.watch) { const [x, y, z] = k.split(',').map(Number); if (!world.loaded(x, z)) continue; const d = BL[rget(x, y, z)]; if (!d) continue;
    if (d.hopper) hopperTick(x, y, z);
    else if (d.daylight && RS.tick % 20 === 0) { const lv = daylightLevel(x, y, z, d.daylight === 'inverted'); if (lv !== (RS.day.get(k) || 0)) { RS.day.set(k, lv); rsNotify(x, y, z); } }
    else if (d.comparator && RS.tick % 4 === 0) rsUpdate(x, y, z); }
  // trapped chests: how many players have them open
  if (S.chestKey && /^-?\d+,-?\d+,-?\d+$/.test(S.chestKey)) { const [x, y, z] = S.chestKey.split(',').map(Number); if (BL[rget(x, y, z)] && BL[rget(x, y, z)].trapped && !RS.trap.get(S.chestKey)) { RS.trap.set(S.chestKey, 1); rsNotify(x, y, z); rsNotify(x, y - 1, z); } }
  for (const [k, n] of RS.trap) if (n && S.chestKey !== k) { RS.trap.delete(k); const [x, y, z] = k.split(',').map(Number); rsNotify(x, y, z); rsNotify(x, y - 1, z); }
}
{ const _uw = updateWater; updateWater = function (dt) { const r = _uw.apply(this, arguments);
    if (world && !isClientMP()) { RS.acc = Math.min(RS.acc + dt, 0.25); let n = 0; while (RS.acc >= 0.05 && n < 4) { RS.acc -= 0.05; n++; try { rsTick(); } catch (e) { if (typeof worldError === 'function') worldError(e); else console.error(e); } } }
    return r; }; }
// ---- dust shapes and the rest of the drawing ----
{ const _sb = shapeBoxes; shapeBoxes = function (id, x, y, z, get, which) { const d = BL[id];
    if (d && d.shape === 'wire') { if (which === 'c') return []; if (which === 's') return [[0, 0, 0, 16, 1, 16]]; const c = wireConn(x, y, z, get); const n = (c[0] ? 1 : 0) + (c[1] ? 1 : 0) + (c[2] ? 1 : 0) + (c[3] ? 1 : 0);
      const arms = n === 0 ? [1, 1, 1, 1] : n === 1 ? c.map((v, i) => v || c[(i + 2) % 4] ? 1 : 0) : c.map(v => v ? 1 : 0); const t = 0.25; const bs = [[5, 0, 5, 11, t, 11]];
      for (let s = 0; s < 4; s++) { if (arms[s]) bs.push(shRot([5, 0, 0, 11, t, 5], s)); if (c[s] === 2) bs.push(shRot([5, 0, 0, 11, 16, t], s)); } return bs; }
    return _sb.apply(this, arguments); }; }
// ---- placing ----
const nearestLook6 = () => { const v = lookDir(); const ax = Math.abs(v.x), ay = Math.abs(v.y), az = Math.abs(v.z); return ay > ax && ay > az ? (v.y > 0 ? 0 : 1) : ax > az ? (v.x > 0 ? 5 : 4) : (v.z > 0 ? 3 : 2); };
const wireSupport = (x, y, z) => { const b = rget(x, y - 1, z); const d = BL[b]; return shSturdy(b, 'up') || (d && (d.hopper || d.key === 'glowstone' || (d.shape === 'slab' && d.st.type === 'top') || (d.shape === 'stairs' && d.st.half === 'top'))) || (COND[b] === 1); };
{ const _pb = placeBlock; placeBlock = function (hit, id) {
    const d = BL[id]; if (!d || !hit || !d.fam || !FAMILY[d.fam]) return _pb.apply(this, arguments);
    const F = FAMILY[d.fam]; if (F.kind !== 'facing6' && F.kind !== 'hopper' && F.kind !== 'diode') return _pb.apply(this, arguments);
    let vid = id; const L6 = nearestLook6();
    if (F.kind === 'facing6') vid = F.ids[(d.observer ? L6 : L6 ^ 1) + ',0'];
    else if (F.kind === 'hopper') { const n = d6of(-hit.nx, -hit.ny, -hit.nz); vid = F.ids[n <= 1 ? 1 : n]; }
    else { const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz; if (!wireSupport(x, y, z)) return false; vid = withState(id, { facing: playerFacing() }); }
    return _pb.call(this, hit, vid); }; }
{ const _ua = useAction; useAction = function (eye, dir) {
    const h = player.held(); const hd = h && ITEMS[h.id]; const sneaking = kd('sneak');
    if (target && !targetMob && !isSpec()) { const { x, y, z } = target; const d = BL[target.id];
      // redstone dust goes on the ground
      if (h && h.id === IT.redstone && !(d && d.use && !sneaking)) { const px = x + target.nx, py = y + target.ny, pz = z + target.nz;
        if (replaceableAt(px, py, pz) && wireSupport(px, py, pz) && !(PLANT[rget(px, py, pz)] && false)) { rsSet(px, py, pz, B.REDSTONE_WIRE); useHeld(1); Sfx.play('stone', 0.8, 1.1); S.swing = 1; mouseR = false; RS.dustQ.add(keyOf(px, py, pz)); return; } }
      if (d && !(sneaking && h)) {
        if (d.repeater) { rsSet(x, y, z, withState(target.id, { delay: d.st.delay % 4 + 1 })); Sfx.play('click_on', 1); S.swing = 1; mouseR = false; return; }
        if (d.comparator) { const mode = d.st.mode === 'compare' ? 'subtract' : 'compare'; rsSet(x, y, z, withState(target.id, { mode })); Sfx.play('click_on', 1, mode === 'subtract' ? 1.1 : 0.9); rsUpdate(x, y, z); S.swing = 1; mouseR = false; return; }
        if (d.note !== undefined) { mouseR = false; S.swing = 1; const n = (d.note + 1) % 25; const nid = n ? B[('note_block#' + n).toUpperCase()] : B.NOTE_BLOCK; rsSet(x, y, z, nid); playNote(x, y, z); return; }
        if (d.daylight) { mouseR = false; S.swing = 1; rsSet(x, y, z, d.daylight === 'inverted' ? B.DAYLIGHT_DETECTOR : B['DAYLIGHT_DETECTOR#INVERTED']); RS.day.delete(keyOf(x, y, z)); Sfx.play('click_on', 0.8); return; }
      } }
    return _ua.apply(this, arguments); }; }
// left-clicking a note block plays it (it does not break in one hit in Survival)
{ const _bb = breakBlock; breakBlock = function (x, y, z) {
    const id = world.get(x, y, z); const d = BL[id]; const r = _bb.apply(this, arguments); if (!d || world.get(x, y, z) === id) return r;
    if (d.pistonHead) { const v = RV[d.facing6]; const bx = x - v[0], by = y - v[1], bz = z - v[2]; const b = BL[rget(bx, by, bz)]; if (b && b.piston && b.extended) { rsSet(bx, by, bz, 0); if (isSurv() && S.rules.doTileDrops !== false) dropItem(IT[b.fam], 1, bx + 0.5, by + 0.5, bz + 0.5); } }
    if (d.piston && d.extended) { const v = RV[d.st.facing]; const hh = BL[rget(x + v[0], y + v[1], z + v[2])]; if (hh && hh.pistonHead) rsSet(x + v[0], y + v[1], z + v[2], 0); }
    return r; }; }
// containers drop what they hold when broken
{ const _obr = onBlockRemoved; onBlockRemoved = function (x, y, z, id) { const r = _obr.apply(this, arguments); const d = BL[id]; const k = keyOf(x, y, z);
    if (d && d.use === 'chest' && id !== B.CHEST && id !== B.BARREL && !d.shulker && !d.ender) { const w = G.world; const inv = w.chestInv.get(k); if (inv) for (const s of inv) if (s) dropItem(s.id, s.count, x + 0.5, y + 0.5, z + 0.5, false, xtra(s)); w.chestInv.delete(k); }
    if (d && d.comparator) RS.cmp.delete(k); RS.edge.delete(k); return r; }; }
// ---- container screens: 9-slot dispensers / droppers, 5-slot hoppers, the ender chest ----
{ const _oc = openChest; openChest = function (x, y, z) { const d = BL[world.get(x, y, z)]; const k = keyOf(x, y, z);
    if (d && d.ender) { if (BL[world.get(x, y + 1, z)] && OPAQUE[world.get(x, y + 1, z)]) return; const ow = Dim.get('overworld'); let a = ow.chestInv.get('ender'); if (!a) { a = new Array(27).fill(null); ow.chestInv.set('ender', a); } world.chestInv.set('ender', a); Sfx.play('chest', 0.7, 0.8); openUI('chest', 'ender'); return; }
    if (d && d.slots && !world.chestInv.has(k)) world.chestInv.set(k, new Array(d.slots).fill(null));
    return _oc.apply(this, arguments); }; }
{ const _ou = openUI; openUI = function (kind, key) { const r = _ou.apply(this, arguments);
    if (kind === 'chest' && $('chestTitle')) { const g = $('chestGrid'); const n = chestArr ? chestArr.length : 27; g.style.gridTemplateColumns = n === 9 ? 'repeat(3,max-content)' : n === 5 ? 'repeat(5,max-content)' : ''; g.style.justifyContent = n < 27 ? 'center' : '';
      if (key === 'ender') $('chestTitle').textContent = 'Ender Chest'; else { const p = String(key).split(',').map(Number); if (p.length === 3) { const d = BL[world.get(p[0], p[1], p[2])]; if (d && (d.dispenser || d.dropper || d.hopper || d.trapped)) $('chestTitle').textContent = d.hopper ? 'Item Hopper' : d.name; } }
      renderInvUI(); }
    return r; }; }
{ const _ci = closeInv; closeInv = function (noLock) { const k = S.chestKey; const r = _ci.apply(this, arguments); if (k === 'ender' && world.dim !== 'overworld') world.chestInv.delete('ender');
    if (k && /^-?\d+,-?\d+,-?\d+$/.test(k)) { const [x, y, z] = k.split(',').map(Number); rsNotify(x, y, z); } return r; }; }
// ---- slime bounces, honey is sticky ----
{ const _up = updatePlayer; updatePlayer = function (dt) { const P = player; const vy0 = P.vel.y; const below = () => rget(Math.floor(P.pos.x), Math.floor(P.pos.y - 0.1), Math.floor(P.pos.z));
    const slimeBelow = rget(Math.floor(P.pos.x), Math.floor(P.pos.y + Math.min(0, vy0) * dt - 0.05), Math.floor(P.pos.z)) === B.SLIME_BLOCK; if (slimeBelow && !kd('sneak') && vy0 < 0) P.peak = null;
    const r = _up.apply(this, arguments);
    if (P.onGround && below() === B.SLIME_BLOCK && !kd('sneak') && vy0 < -3 && !P.flying) { P.vel.y = -vy0 * 0.92; P.onGround = false; Sfx.play('slime', 0.5); }
    if (P.onGround && below() === B.HONEY_BLOCK) { P.vel.x *= 0.6; P.vel.z *= 0.6; if (P.vel.y > 0) P.vel.y *= 0.5; }
    return r; }; }
// ---- creative inventory order: redstone things together ----
if (typeof ITEM_IDS !== 'undefined') { const keys = ['redstone', 'redstone_torch', 'redstone_block', 'repeater', 'comparator', 'redstone_lamp', 'piston', 'sticky_piston', 'slime_block', 'honey_block', 'observer', 'dispenser', 'dropper', 'hopper', 'note_block', 'daylight_detector', 'target', 'lever', 'trapped_chest', 'ender_chest', 'tripwire_hook'];
  const ids = keys.map(k => IT[k]).filter(v => v !== undefined); const set = new Set(ids); const rest = ITEM_IDS.filter(i => !set.has(i)); const at = rest.indexOf(IT.lever); rest.splice(at >= 0 ? at : rest.length, 0, ...ids); ITEM_IDS.length = 0; ITEM_IDS.push(...rest); }
// fuel listed by item name (wood blocks, carpets, bamboo ...) also counts by item id, which is what furnaces look up
for (const k of Object.keys(FUEL)) if (isNaN(+k) && IT[k] !== undefined && FUEL[IT[k]] === undefined) FUEL[IT[k]] = FUEL[k];
FUEL[IT.daylight_detector] = 15; FUEL[IT.note_block] = 15; if (IT.trapped_chest !== undefined) FUEL[IT.trapped_chest] = 15;

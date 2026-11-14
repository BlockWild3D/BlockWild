// ================= RAILS, MINECARTS AND BASIC REDSTONE (Minecraft) =================
// Rails join up with their neighbours as you place them: straight, curved (plain rails only) or sloping up a block.
// Powered rails speed carts up when powered and brake them when not; power reaches up to 8 rails along a line from
// a powered one. Detector rails give power while a cart is on them. Activator rails throw the rider out.
// Power comes from Blocks of Redstone, levers (right-click to flip) and redstone torches, next to the rail or to
// the block the source is attached to. Minecarts: put one on a rail and ride it (sneak to get out); push empty
// ones by walking into them. A Minecart with Chest holds 27 stacks. Top speed 8 blocks/s.
const RDIR = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
const EXITS = { ns: [['n', 0], ['s', 0]], ew: [['w', 0], ['e', 0]], asc_e: [['w', 0], ['e', 1]], asc_w: [['e', 0], ['w', 1]], asc_n: [['s', 0], ['n', 1]], asc_s: [['n', 0], ['s', 1]], se: [['s', 0], ['e', 0]], sw: [['s', 0], ['w', 0]], nw: [['n', 0], ['w', 0]], ne: [['n', 0], ['e', 0]] };
const railAt = (x, y, z) => { const d = BL[world.get(x, y, z)]; return d && d.rail ? d.rail : null; };
const railId = (type, shape, on) => { const t = RAIL_ID[type]; const s = t[shape] || t[shape.length === 2 && shape !== 'ns' && shape !== 'ew' ? 'ns' : shape]; return s[on ? 1 : 0] != null ? s[on ? 1 : 0] : s[0]; };
const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
// which neighbour rails point at (x, y, z)?
function railConnectsTo(nx, ny, nz, x, z) { const r = railAt(nx, ny, nz); if (!r) return false; for (const [d, up] of EXITS[r.shape]) { const v = RDIR[d]; if (nx + v[0] === x && nz + v[1] === z) return true; } return false; }
function railExitCount(x, y, z) { const r = railAt(x, y, z); if (!r) return 0; let n = 0; for (const [d, up] of EXITS[r.shape]) { const v = RDIR[d]; for (const dy of [up, up - 1]) if (railAt(x + v[0], y + dy, z + v[1]) && railConnectsTo(x + v[0], y + dy, z + v[1], x, z)) { n++; break; } } return n; }
// choose a shape for a rail at (x, y, z) from the rails around it (Minecraft's rule, simplified)
function chooseRailShape(x, y, z, type, prefer) {
  const cand = [];
  for (const d of ['n', 's', 'e', 'w']) { const v = RDIR[d];
    for (const dy of [0, 1, -1]) { const nx = x + v[0], ny = y + dy, nz = z + v[1]; const r = railAt(nx, ny, nz); if (!r) continue;
      const free = railConnectsTo(nx, ny, nz, x, z) || railExitCount(nx, ny, nz) < 2; if (free) { cand.push([d, dy]); break; } } }
  const has = (d) => cand.find(c => c[0] === d);
  let a = null, b = null;
  if (has('n') && has('s')) { a = has('n'); b = has('s'); } else if (has('e') && has('w')) { a = has('e'); b = has('w'); }
  else if (type === 'rail' && cand.length >= 2) { const pairs = [['s', 'e'], ['s', 'w'], ['n', 'w'], ['n', 'e']]; for (const [p, q] of pairs) if (has(p) && has(q)) { a = has(p); b = has(q); break; } }
  if (!a && cand.length) a = cand[0];
  if (!a) return prefer || 'ns';
  const d1 = a[0], d2 = b ? b[0] : OPP[a[0]];
  const key = [d1, d2].sort().join('');
  let shape = { ns: 'ns', ew: 'ew', es: 'se', sw: 'sw', nw: 'nw', en: 'ne' }[key] || 'ns';
  if (shape === 'ns' || shape === 'ew') { for (const c of [a, b]) if (c && c[1] === 1) shape = 'asc_' + c[0]; }
  return shape;
}
function setRailShape(x, y, z, shape) { const r = railAt(x, y, z); if (!r || r.shape === shape) return; const id = railId(r.type, shape, r.on); world.set(x, y, z, id); mpBlock(x, y, z, id); }
// placing: needs solid ground; pick a shape and turn the neighbours toward the new rail
{ const _pb = placeBlock; placeBlock = function (t, id) {
    const d = BL[id]; if (!d || !d.rail) return _pb.call(this, t, id);
    const x = t.x + t.nx, y = t.y + t.ny, z = t.z + t.nz; if (!world.solid(x, y - 1, z)) return false;
    const dir = lookDir(); const prefer = Math.abs(dir.x) > Math.abs(dir.z) ? 'ew' : 'ns';
    const shape = chooseRailShape(x, y, z, d.rail.type, prefer); const ok = _pb.call(this, t, railId(d.rail.type, shape, false)); if (!ok) return ok;
    for (const dd of ['n', 's', 'e', 'w']) { const v = RDIR[dd]; for (const dy of [0, 1, -1]) { const nx = x + v[0], ny = y + dy, nz = z + v[1]; const r = railAt(nx, ny, nz); if (!r) continue; if (railExitCount(nx, ny, nz) < 2 || railConnectsTo(nx, ny, nz, x, z)) setRailShape(nx, ny, nz, chooseRailShape(nx, ny, nz, r.type, r.shape)); } }
    // our own shape again, now that the neighbours face us (a slope may appear)
    setRailShape(x, y, z, chooseRailShape(x, y, z, d.rail.type, shape)); POWER.dirty = true; return ok;
  }; }
// rails and levers pop off when the block under them goes; power is recomputed after changes
{ const _set = World.prototype.set; World.prototype.set = function (x, y, z, id) {
    const r = _set.apply(this, arguments);
    if (r !== false && this === G.world) { const above = this.get(x, y + 1, z); const d = BL[above]; if (d && (d.rail || d.key === 'lever' || d.key === 'lever_on' || d.key === 'redstone_torch' || d.key === 'redstone_torch_off') && !SOLID[id] && !(typeof MP !== 'undefined' && MP.active && MP.role === 'client')) { _set.call(this, x, y + 1, z, 0); mpBlock(x, y + 1, z, 0); const dr = blockDrop(above, null); if (dr) dropItem(dr[0], dr[1], x + 0.5, y + 1.3, z + 0.5); }
      if ((BL[id] && (BL[id].power || BL[id].rail)) || POWER.watch) POWER.dirty = true; }
    return r;
  }; }
// levers
{ const _ua = useAction; useAction = function (eye, dir) { if (target && BL[target.id].use === 'lever') { mouseR = false; const nid = target.id === B.LEVER ? B.LEVER_ON : B.LEVER; world.set(target.x, target.y, target.z, nid); mpBlock(target.x, target.y, target.z, nid); Sfx.play('click', 0.8, nid === B.LEVER_ON ? 1.2 : 0.9); S.swing = 1; POWER.dirty = true; return; } return _ua(eye, dir); }; }

// ---------- power ----------
const POWER = { dirty: true, t: 0, watch: false };
function sourceAt(x, y, z) { const d = BL[world.get(x, y, z)]; return !!(d && (d.power > 0 || (d.rail && d.rail.type === 'detector_rail' && d.rail.on))); }
const N6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
// a rail is powered directly by a source next to it, or by a source on a solid block next to it
function directPower(x, y, z) {
  for (const [a, b, c] of N6) { const X = x + a, Y = y + b, Z = z + c; if (sourceAt(X, Y, Z)) return true; if (SOLID[world.get(X, Y, Z)] && OPAQUE[world.get(X, Y, Z)]) for (const [p, q, r] of N6) { const d = BL[world.get(X + p, Y + q, Z + r)]; if (d && (d.key === 'lever_on' || d.key === 'redstone_torch')) return true; } }
  return false;
}
function updatePower(dt) {
  POWER.t -= dt; if (!POWER.dirty || POWER.t > 0 || !world || (typeof MP !== 'undefined' && MP.active && MP.role === 'client')) return; POWER.dirty = false; POWER.t = 0.1;
  const P = player.pos; const R = 48; const rails = [];
  for (const c of world.chunks.values()) { if (Math.abs(c.cx * 16 + 8 - P.x) > R + 8 || Math.abs(c.cz * 16 + 8 - P.z) > R + 8) continue; if (!c.hasRails) continue; const d = c.d;
    for (let i = 0; i < d.length; i++) { const id = d[i]; if (!id || !BL[id].rail || BL[id].rail.type === 'rail' || BL[id].rail.type === 'detector_rail') continue; const y = (i / 256) | 0, z = c.cz * 16 + ((i >> 4) & 15), x = c.cx * 16 + (i & 15); rails.push([x, y, z, BL[id].rail]); } }
  // direct power, then spread up to 8 rails along connections between rails of the same kind
  const key = (x, y, z) => x + ',' + y + ',' + z; const dist = new Map(); const q = [];
  for (const [x, y, z, r] of rails) if (directPower(x, y, z)) { dist.set(key(x, y, z), 0); q.push([x, y, z, r.type]); }
  while (q.length) { const [x, y, z, type] = q.shift(); const dd = dist.get(key(x, y, z)); if (dd >= 8) continue; const r = railAt(x, y, z); if (!r) continue;
    for (const [d, up] of EXITS[r.shape]) { const v = RDIR[d]; for (const dy of [up, up - 1]) { const nx = x + v[0], ny = y + dy, nz = z + v[1]; const nr = railAt(nx, ny, nz); if (!nr || nr.type !== type) continue; const k = key(nx, ny, nz); if (!dist.has(k)) { dist.set(k, dd + 1); q.push([nx, ny, nz, type]); } } } }
  for (const [x, y, z, r] of rails) { const on = dist.has(key(x, y, z)); if (on !== r.on) { const id = railId(r.type, r.shape, on); world.set(x, y, z, id); mpBlock(x, y, z, id); } }
}
// chunks remember whether they have rails, so the power scan skips the rest
{ const _sm = Chunk.prototype.scanMeta; Chunk.prototype.scanMeta = function () { const r = _sm.apply(this, arguments); this.hasRails = false; const d = this.d; for (let i = 0; i < d.length; i++) { const id = d[i]; if (id && BL[id].rail) { this.hasRails = true; break; } } return r; };
  const _set = World.prototype.set; World.prototype.set = function (x, y, z, id) { const r = _set.apply(this, arguments); if (BL[id] && BL[id].rail) { const c = this.getChunk(x >> 4, z >> 4); if (c) c.hasRails = true; } return r; }; }

// ---------- minecarts ----------
G.carts = []; let cartSeq = 1;
function cartMesh(chest) {
  const g = new THREE.Group(); const holder = { mats: [] };
  const IRON = fur([120, 120, 128], 6, { topRows: [1, [160, 160, 168]] });
  sbox(holder, g, 0.94, 0.08, 0.7, 0, 0.12, 0, 'cart_floor', fur([90, 90, 96], 5));
  for (const s of [-1, 1]) { sbox(holder, g, 0.94, 0.5, 0.06, 0, 0.38, s * 0.35, 'cart_side', IRON); sbox(holder, g, 0.06, 0.5, 0.64, s * 0.47, 0.38, 0, 'cart_end', IRON); }
  for (const [x, z] of [[-0.3, -0.36], [0.3, -0.36], [-0.3, 0.36], [0.3, 0.36]]) sbox(holder, g, 0.2, 0.2, 0.05, x, 0.08, z, 'cart_wheel', fur([46, 46, 50], 3));
  if (chest) { sbox(holder, g, 0.7, 0.62, 0.56, 0, 0.5, 0, 'cart_chest', fur([168, 118, 58], 6, { extra: (f, set, fw, fh) => { if (f === 'top' || f === 'bottom') return; for (let x = 0; x < fw; x++) set(x, fh >> 2, [70, 46, 22]); if (f === 'front') { set(fw >> 1, (fh >> 2) + 1, [210, 210, 210]); } } })); }
  g.userData.mats = holder.mats; scene.add(g); return g;
}
function makeCart(x, y, z, chest, id, dim) {
  const c = { id: id || (Date.now() % 1e9) * 10 + (cartSeq++ % 10), pos: new V3(x, y, z), vel: new V3(), v: 0, yaw: 0, hw: 0.49, h: 0.7, chest: !!chest, inv: chest ? new Array(27).fill(null) : null, rider: null, dim: dim || world.dim, mesh: cartMesh(chest), hp: 0, hurtT: 0, onRail: true, sendT: 0 };
  G.carts.push(c); return c;
}
function removeCart(c) { if (player.riding === c) cartDismount(); scene.remove(c.mesh); c.gone = true; G.carts = G.carts.filter(x => x !== c); }
function cartList() { return G.carts.map(c => ({ id: c.id, dim: c.dim, x: +c.pos.x.toFixed(2), y: +c.pos.y.toFixed(2), z: +c.pos.z.toFixed(2), v: +c.v.toFixed(2), yaw: +c.yaw.toFixed(2), chest: c.chest ? 1 : 0, inv: c.inv ? c.inv.map(s => s ? Object.assign({}, s) : null) : null })); }
function loadCarts(list) { for (const c of G.carts) scene.remove(c.mesh); G.carts = []; for (const d of list || []) { const c = makeCart(d.x, d.y, d.z, d.chest, d.id, d.dim); c.yaw = d.yaw || 0; c.v = d.v || 0; if (c.inv && d.inv) d.inv.forEach((s, i) => { if (s && ITEMS[s.id]) c.inv[i] = s; }); } }
// rail geometry for the cart's current block
function railLine(x, y, z, r) { const [e1, e2] = EXITS[r.shape]; const p = (e) => new V3(x + 0.5 + RDIR[e[0]][0] * 0.5, y + 0.0625 + e[1], z + 0.5 + RDIR[e[0]][1] * 0.5); return [p(e1), p(e2), e1, e2]; }
function findRail(pos) { const x = Math.floor(pos.x), z = Math.floor(pos.z); for (const dy of [0, -1]) { const y = Math.floor(pos.y + 0.1) + dy; const r = railAt(x, y, z); if (r) return [x, y, z, r]; } return null; }
function cartPhysics(c, dt, push) {
  const rail = findRail(c.pos);
  if (rail) {
    const [x, y, z, r] = rail; const [p1, p2] = railLine(x, y, z, r); const dir = p2.clone().sub(p1); const len = dir.length(); dir.divideScalar(len);
    if (!c.onRail) { c.v = c.vel.x * dir.x + c.vel.z * dir.z; c.onRail = true; }
    // slopes, powered rails, pushes, friction
    c.v -= 5.5 * dir.y * dt / Math.max(0.3, Math.hypot(dir.x, dir.z));
    if (r.type === 'powered_rail') { if (r.on) { if (Math.abs(c.v) < 0.05) { const b1 = world.solid(Math.floor(p1.x + (p1.x - p2.x) * 0.6), y, Math.floor(p1.z + (p1.z - p2.z) * 0.6)); const b2 = world.solid(Math.floor(p2.x + (p2.x - p1.x) * 0.6), y, Math.floor(p2.z + (p2.z - p1.z) * 0.6)); if (b1 && !b2) c.v = 1; else if (b2 && !b1) c.v = -1; } else c.v += Math.sign(c.v) * 24 * dt; } else c.v *= Math.exp(-dt * 10); }
    if (r.type === 'activator_rail' && r.on && c.rider === 'local') cartDismount();
    if (push) c.v += (push.x * dir.x + push.z * dir.z) * dt;
    c.v *= Math.exp(-dt * (c.rider ? 0.06 : 0.8)); c.v = clamp(c.v, -8, 8); if (Math.abs(c.v) < 0.01) c.v = 0;
    // move along the line, carrying on into the next rail
    let t = c.pos.clone().sub(p1).dot(dir); t = clamp(t, 0, len) + c.v * dt;
    const exitEnd = t > len ? 1 : t < 0 ? 0 : -1;
    if (exitEnd >= 0) {
      const e = EXITS[r.shape][exitEnd]; const v = RDIR[e[0]]; const nx = x + v[0], nz = z + v[1]; const ny0 = y + e[1];
      let next = null; for (const dy of [0, -1]) { const nr = railAt(nx, ny0 + dy, nz); if (nr) { next = [nx, ny0 + dy, nz, nr]; break; } }
      const over = exitEnd ? t - len : -t; const endP = exitEnd ? p2 : p1;
      if (next) { const [n1, n2] = railLine(...next); const fromStart = n1.distanceTo(endP) < n2.distanceTo(endP); const nd = n2.clone().sub(n1).normalize(); const sp = Math.abs(c.v); c.v = fromStart ? sp : -sp; c.pos.copy(fromStart ? n1 : n2).addScaledVector(nd, fromStart ? over : -over); c.yaw = Math.atan2(nd.x, nd.z); }
      else { // off the end of the track
        c.onRail = false; const d = exitEnd ? dir : dir.clone().negate(); c.vel.set(d.x * Math.abs(c.v), Math.max(0, d.y * Math.abs(c.v)), d.z * Math.abs(c.v)); c.pos.copy(endP).addScaledVector(d, 0.05);
        if (world.solid(Math.floor(c.pos.x + d.x * 0.3), Math.floor(c.pos.y + 0.2), Math.floor(c.pos.z + d.z * 0.3))) { c.vel.set(0, 0, 0); c.v = 0; c.onRail = true; c.pos.copy(endP).addScaledVector(d, -0.02); }
      }
    } else { c.pos.copy(p1).addScaledVector(dir, t); c.yaw = Math.atan2(dir.x, dir.z); }
    c.vel.copy(dir).multiplyScalar(c.v); c.pitch = Math.asin(clamp(dir.y, -1, 1)) * Math.sign(c.v || 1);
    // detector rails
    const here = findRail(c.pos); if (here && here[3].type === 'detector_rail') { const k = here[0] + ',' + here[1] + ',' + here[2]; DETECT.set(k, 1); if (!here[3].on) { const id = railId('detector_rail', here[3].shape, true); world.set(here[0], here[1], here[2], id); mpBlock(here[0], here[1], here[2], id); POWER.dirty = true; } }
  } else {
    c.onRail = false; c.pitch = 0; if (push) { c.vel.x += push.x * dt; c.vel.z += push.z * dt; }
    const water = inWater(c, 0.2); c.vel.y = water ? Math.min(c.vel.y + 20 * dt, 1) : Math.max(c.vel.y - 28 * dt, -40); const f = Math.exp(-dt * (c.onGround ? 4 : 0.5)); c.vel.x *= f; c.vel.z *= f;
    moveEntity(c, dt); if (Math.hypot(c.vel.x, c.vel.z) > 0.2) c.yaw = Math.atan2(c.vel.x, c.vel.z);
  }
}
// detector rails switch off a moment after the cart leaves
const DETECT = new Map();
function updateDetectors(dt) { for (const [k, t] of DETECT) { const nt = t - dt * 2; if (nt > 0) { DETECT.set(k, nt); continue; } DETECT.delete(k); const [x, y, z] = k.split(',').map(Number); const r = railAt(x, y, z); if (r && r.type === 'detector_rail' && r.on) { const id = railId('detector_rail', r.shape, false); world.set(x, y, z, id); mpBlock(x, y, z, id); POWER.dirty = true; } } }
// riding
function mountCart(c) { const P = player; if (P.riding || P.dead || c.chest) return; if (c.rider) { toast('Someone is already in this minecart', 1.5); return; } P.riding = c; c.rider = 'local'; c.isCart = true; P.sneaking = false; P.sprinting = false; P.flying = false; seatCart(P, c); cartSync(c, true); }
function seatCart(P, c) { P.pos.set(c.pos.x, c.pos.y + 0.12, c.pos.z); P.vel.copy(c.vel); P.onGround = true; P.peak = null; }
function cartDismount() { const P = player; const c = P.riding; if (!c || !c.isCart) return; P.riding = null; c.rider = null; for (const a of [Math.PI / 2, -Math.PI / 2, 0, Math.PI]) { const x = c.pos.x + Math.sin(c.yaw + a) * 1.1, z = c.pos.z + Math.cos(c.yaw + a) * 1.1; const y = Math.floor(c.pos.y + 0.2); if (!world.solid(Math.floor(x), y, Math.floor(z)) && !world.solid(Math.floor(x), y + 1, Math.floor(z))) { P.pos.set(x, y + 0.01, z); break; } } P.vel.set(0, 0, 0); P.peak = null; cartSync(c, true); }
{ const _ru = rideUpdate; rideUpdate = function (P, dt) {
    const c = P.riding; if (!c || !c.isCart) return _ru(P, dt);
    if (!S.uiOpen && kd('sneak')) { cartDismount(); return; }
    if (keys.KeyJ) look(-300 * dt, 0); if (keys.KeyL) look(300 * dt, 0); if (keys.KeyI) look(0, -300 * dt); if (keys.KeyK) look(0, 300 * dt);
    const f = !S.uiOpen && (kd('forward') || keys.ArrowUp) ? 1 : 0; const push = f ? new V3(-Math.sin(P.yaw) * 3, 0, -Math.cos(P.yaw) * 3) : null;
    cartPhysics(c, dt, push); seatCart(P, c); P.sprinting = false; P.sneaking = false; P.swimming = false;
  };
  const _dm = dismount; dismount = function () { if (player.riding && player.riding.isCart) return cartDismount(); return _dm.apply(this, arguments); };
  const _sp = sitPose; sitPose = function (model, on, rowing) { return _sp(model, on, rowing); };
}
// placing, using, breaking, pushing
function cartRay(eye, dir, maxT) { let best = null, bt = maxT; for (const c of G.carts) { if (c.dim !== world.dim || c === player.riding) continue; const t = rayAABB(eye, dir, new V3(c.pos.x - 0.5, c.pos.y, c.pos.z - 0.5), new V3(c.pos.x + 0.5, c.pos.y + 0.7, c.pos.z + 0.5)); if (t >= 0 && t < bt) { bt = t; best = c; } } return best ? { c: best, t: bt } : null; }
let targetCart = null;
{ const _ui = updateInteraction; updateInteraction = function (dt) {
    const eye = player.eye(), dir = lookDir(); const hit = !S.uiOpen && S.mode !== 'spectator' ? cartRay(eye, dir, 4.5) : null; const blk = hit ? raycast(eye, dir, hit.t) : null;
    targetCart = hit && !(blk && blk.dist < hit.t) ? hit.c : null;
    if (targetCart && mouseL && S.atkCD <= 0) { const c = targetCart; S.atkCD = 0.25; S.swing = 1; c.hurtT = 0.4; c.hp += S.mode === 'creative' ? 99 : 1 + ((player.heldDef() || {}).dmg || 0) * 0.5; Sfx.play('stone', 0.6, 1.3);
      if (c.hp >= 4) { if (S.mode !== 'creative') { dropItem(IT.minecart, 1, c.pos.x, c.pos.y + 0.4, c.pos.z); if (c.chest) { dropItem(IT.chest, 1, c.pos.x, c.pos.y + 0.4, c.pos.z); for (const s of c.inv) if (s) dropItem(s.id, s.count, c.pos.x, c.pos.y + 0.4, c.pos.z, true, xtra(s)); } } if (typeof MP !== 'undefined' && MP.active) mpSend({ t: 'cartdel', id: c.id }, false); removeCart(c); targetCart = null; }
      const ml = mouseL; mouseL = false; try { return _ui.apply(this, arguments); } finally { mouseL = ml; } }
    return _ui.apply(this, arguments);
  }; }
{ const _ua = useAction; useAction = function (eye, dir) {
    if (targetCart && !kd('sneak')) { mouseR = false; const c = targetCart; if (c.chest) openCartChest(c); else mountCart(c); return; }
    const h = player.held(); const hd = h && ITEMS[h.id];
    if (hd && hd.kind === 'minecart' && target) { mouseR = false; const r = railAt(target.x, target.y, target.z); if (!r) return; const c = makeCart(target.x + 0.5, target.y + 0.0625, target.z + 0.5, hd.chest); const [p1, p2] = railLine(target.x, target.y, target.z, r); c.yaw = Math.atan2(p2.x - p1.x, p2.z - p1.z); useHeld(1); S.swing = 1; Sfx.play('stone', 0.6); cartSync(c, true); return; }
    return _ua(eye, dir);
  }; }
// a chest minecart opens like a chest (its contents live with the cart)
function openCartChest(c) { const key = 'cart:' + c.id; world.chestInv.set(key, c.inv); Sfx.play('chest', 0.7); openUI('chest', key); $('chestTitle').textContent = 'Minecart with Chest'; }
{ const _ci = closeInv; closeInv = function (noLock) { const k = S.chestKey; const r = _ci(noLock); if (k && String(k).startsWith('cart:')) { world.chestInv.delete(k); const c = G.carts.find(x => 'cart:' + x.id === k); if (c) cartSync(c, true, true); } return r; }; }
function updateCarts(dt) {
  const mp = typeof MP !== 'undefined' && MP.active, client = mp && MP.role === 'client'; const P = player;
  for (const c of G.carts) {
    const here = c.dim === world.dim; c.mesh.visible = here; if (!here || !world.loaded(Math.floor(c.pos.x), Math.floor(c.pos.z))) continue;
    if (c.rider === 'local') { }
    else if (c.rider || client) { if (c.tgt) { c.pos.lerp(c.tgt, Math.min(1, dt * 10)); c.yaw = lerpAngle(c.yaw, c.tgtYaw, Math.min(1, dt * 10)); } }
    else { // walking into an empty cart pushes it
      let push = null; if (!P.dead && !P.riding && Math.abs(P.pos.x - c.pos.x) < 0.8 && Math.abs(P.pos.z - c.pos.z) < 0.8 && P.pos.y < c.pos.y + 0.8 && P.pos.y + 1.8 > c.pos.y) { push = new V3(c.pos.x - P.pos.x, 0, c.pos.z - P.pos.z).normalize().multiplyScalar(14); }
      cartPhysics(c, dt, push);
    }
    c.hurtT = Math.max(0, c.hurtT - dt); c.hp = Math.max(0, c.hp - dt * 0.5);
    c.mesh.position.set(c.pos.x, c.pos.y, c.pos.z); c.mesh.rotation.set(0, c.yaw + Math.PI / 2, 0); c.mesh.rotateZ((c.pitch || 0) * (1)); if (c.hurtT > 0) c.mesh.rotateX(Math.sin(c.hurtT * 40) * c.hurtT * 0.3);
    const l = clamp(Math.max(G.minLight || 0, world.lightAt(c.pos.x, c.pos.y + 0.5, c.pos.z, G.daylight)), 0.08, 1); for (const mm of c.mesh.userData.mats) mm[0].color.setScalar(l);
    if (mp && (c.rider === 'local' || (!client && !c.rider))) { c.sendT -= dt; if (c.sendT <= 0 && (Math.abs(c.v) > 0.01 || c.rider === 'local')) { c.sendT = 0.1; cartSync(c, false); } }
  }
  updateDetectors(dt); updatePower(dt);
}
// multiplayer, like boats
function cartSync(c, reliable, withInv) { if (typeof MP === 'undefined' || !MP.active) return; mpSend({ t: 'cart', id: c.id, dim: c.dim, x: +c.pos.x.toFixed(2), y: +c.pos.y.toFixed(2), z: +c.pos.z.toFixed(2), yaw: +c.yaw.toFixed(3), v: +c.v.toFixed(2), chest: c.chest ? 1 : 0, r: c.rider === 'local' ? MP.myId : (c.rider || 0), inv: withInv && c.inv ? c.inv.map(slotOut) : undefined }, !reliable); }
{ const _on = onPeerMsg; onPeerMsg = function (peer, m) {
    if (m.t === 'cart') { let c = G.carts.find(x => x.id === m.id); if (!c) c = makeCart(m.x, m.y, m.z, m.chest, m.id, m.dim);
      if (c.rider !== 'local') { c.tgt = new V3(m.x, m.y, m.z); c.tgtYaw = m.yaw; c.v = m.v; c.dim = m.dim; c.rider = m.r ? (m.r === MP.myId ? 'local' : m.r) : null; if (c.pos.distanceTo(c.tgt) > 8) { c.pos.copy(c.tgt); c.yaw = m.yaw; } if (!c.rider && MP.role === 'host') { c.pos.copy(c.tgt); } }
      if (m.inv && c.inv) m.inv.forEach((s, i) => c.inv[i] = slotIn(s));
      if (MP.role === 'host') mpSendAll(m, true, peer.id); return; }
    if (m.t === 'cartdel') { const c = G.carts.find(x => x.id === m.id); if (c) removeCart(c); if (MP.role === 'host') mpSendAll(m, false, peer.id); return; }
    return _on(peer, m);
  }; }
{ const _hw = hostWelcome; hostWelcome = function (peer, m) { const r = _hw.apply(this, arguments); for (const c of G.carts) peer.link.send({ t: 'cart', id: c.id, dim: c.dim, x: c.pos.x, y: c.pos.y, z: c.pos.z, yaw: c.yaw, v: c.v, chest: c.chest ? 1 : 0, r: 0, inv: c.inv ? c.inv.map(slotOut) : undefined }); return r; }; }
// saving, quitting, dimension travel
{ const _pk = packWorld; packWorld = function (w) { const r = _pk(w); r.carts = cartList().filter(c => c.dim === w.dim); return r; };
  const _sw = startWorld; startWorld = function (data) { const r = _sw.apply(this, arguments); const all = []; const wd = data && data.worlds || {}; for (const k in wd) for (const c of (wd[k].carts || [])) all.push(Object.assign({ dim: k }, c)); loadCarts(all); return r; };
  const _ce = clearEntities; clearEntities = function () { if (player.riding && player.riding.isCart) { player.riding = null; } return _ce.apply(this, arguments); };
  const _tv = travelTo; travelTo = function () { if (player.riding && player.riding.isCart) cartDismount(); return _tv.apply(this, arguments); };
  const _ub = updateBoats; updateBoats = function (dt) { const r = _ub(dt); updateCarts(dt); return r; }; }
{ const _q = quitToTitle; quitToTitle = function () { const r = _q.apply(this, arguments); for (const c of G.carts) scene.remove(c.mesh); G.carts = []; return r; }; }
// the container title follows what you opened (it used to stay "Minecart with Chest" after opening a cart)
{ const _ou = openUI; openUI = function (kind, key) { const r = _ou(kind, key); if (kind === 'chest' && $('chestTitle')) { let t = 'Chest'; if (String(key).startsWith('cart:')) t = 'Minecart with Chest'; else { const p = String(key).split(',').map(Number); if (p.length === 3 && world.get(p[0], p[1], p[2]) === B.BARREL) t = 'Barrel'; } $('chestTitle').textContent = t; } return r; }; }

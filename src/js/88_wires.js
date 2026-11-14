// ================= TRIPWIRE, CRAFTER, SCULK SENSORS, MULTIPLAYER SYNC (Minecraft rules) =================
// Tripwire: two tripwire hooks facing each other up to 40 blocks apart with string between them make a circuit; anything
// touching the string powers both hooks (and the blocks they hang on) until 10 ticks after it leaves. String placed on
// the ground becomes tripwire. Crafter: a redstone pulse crafts whatever its 3 x 3 grid holds and pushes the result
// out of its front (into a container there if there is one). Sculk sensors hear vibrations (steps, blocks placed and
// broken, doors, chests, eating, projectiles) within 8 blocks, calibrated ones within 16, and give a short redstone
// pulse that is stronger the closer the sound. In multiplayer, sign text, paintings, banners, pots and the contents of
// frames, stands and bookshelves are shared.
const WIRES = { hooks: new Set(), sensors: new Set(), world: null, t: 0, sense: new Map(), stepT: 0 };
const isHook = (id) => !!(BL[id] && BL[id].hook); const isWire = (id) => !!(BL[id] && BL[id].tripwire); const isSensor = (id) => !!(BL[id] && BL[id].sensor);
function wiresScan() { WIRES.hooks.clear(); WIRES.sensors.clear(); WIRES.world = world; for (const [ck, m] of world.edits) { const cx = Math.floor(ck / 65536) - 32768, cz = (ck % 65536) - 32768; for (const [i, id] of m) { const k = keyOf(cx * 16 + (i & 15), i >> 8, cz * 16 + ((i >> 4) & 15)); if (isHook(id)) WIRES.hooks.add(k); if (isSensor(id)) WIRES.sensors.add(k); } } }
{ const _set = World.prototype.set; World.prototype.set = function (x, y, z, id, record) { const mine = this === G.world; const old = mine ? this.get(x, y, z) : 0; const r = _set.apply(this, arguments);
    if (r !== false && mine) { const k = keyOf(x, y, z); if (isHook(id)) WIRES.hooks.add(k); else if (isHook(old)) WIRES.hooks.delete(k); if (isSensor(id)) WIRES.sensors.add(k); else if (isSensor(old)) WIRES.sensors.delete(k); }
    return r; }; }
// ---- redstone: powered hooks, sensing sculk sensors ----
const K_HOOK = 20, K_SENSOR = 21;
for (const d of BL) { if (!d) continue; if (d.hook) RSK[d.id] = K_HOOK; if (d.sensor) RSK[d.id] = K_SENSOR; if (d.crafter) RSU[d.id] = 12; if (d.hook || d.sensor) COND[d.id] = 0; }
{ const _e = rsEmit; rsEmit = function (x, y, z, id, dir, strong) { const k = RSK[id];
    if (k === K_HOOK) { const d = BL[id]; if (!d.st.powered) return 0; const back = F4TO6[(d.st.facing + 2) % 4]; return strong ? (dir === back ? 15 : 0) : 15; }
    if (k === K_SENSOR) { const d = BL[id]; if (!d.sensorOn) return 0; const p = WIRES.sense.get(keyOf(x, y, z)) || 15; return strong ? (dir === 1 ? p : 0) : p; }
    return _e.apply(this, arguments); }; }
{ const _wl = wireLinksTo; wireLinksTo = function (id, s) { if (RSK[id] === K_SENSOR) return true; if (RSK[id] === K_HOOK) return (BL[id].st.facing & 1) !== (s & 1) || true; return _wl.apply(this, arguments); }; }
// ---- tripwire ----
function hookCircuit(x, y, z) { const d = BL[world.get(x, y, z)]; if (!d || !d.hook) return null; const [dx, dz] = DV4[d.st.facing]; const cells = [];
  for (let i = 1; i <= 41; i++) { const X = x + dx * i, Z = z + dz * i; const id = world.get(X, y, Z); const n = BL[id]; if (n && n.hook) return n.st.facing === (d.st.facing + 2) % 4 && cells.length ? { cells, other: [X, y, Z] } : null; if (!n || !n.tripwire) return null; cells.push([X, y, Z]); } return null; }
function entityOn(cells) { const ents = [player, ...G.mobs.filter(m => !m.dead), ...(G.items || []).filter(i => !i.gone), ...(G.projectiles || []).filter(p => !p.done)];
  for (const [x, y, z] of cells) for (const e of ents) { if (!e.pos || (e === player && (player.dead || isSpec()))) continue; const hw = e.hw || 0.12, h = e.h || 0.25; if (e.pos.x + hw > x && e.pos.x - hw < x + 1 && e.pos.z + hw > z && e.pos.z - hw < z + 1 && e.pos.y < y + 0.16 && e.pos.y + h > y) return true; } return false; }
function wiresTick(dt) { if (!world) return; if (WIRES.world !== world) wiresScan(); WIRES.t += dt; if (WIRES.t < 0.1) return; WIRES.t = 0;
  const seen = new Set();
  for (const k of [...WIRES.hooks]) { if (seen.has(k)) continue; const [x, y, z] = k.split(',').map(Number); if (!world.loaded(x, z)) continue; const id = world.get(x, y, z); if (!isHook(id)) { WIRES.hooks.delete(k); continue; } seen.add(k);
    const c = hookCircuit(x, y, z); const d = BL[id];
    if (!c) { if (d.st.attached || d.st.powered) world.set(x, y, z, withState(id, { attached: 0, powered: 0 })); continue; }
    seen.add(keyOf(...c.other)); const hit = entityOn(c.cells); const now = RS.tick; if (hit) WIRES.sense.set('trip:' + k, now); const last = WIRES.sense.get('trip:' + k); const on = hit || (last !== undefined && now - last < 10);
    for (const [hx, hy, hz] of [[x, y, z], c.other]) { const hid = world.get(hx, hy, hz); const nid = withState(hid, { attached: 1, powered: on ? 1 : 0 }); if (nid !== hid) { world.set(hx, hy, hz, nid); mpBlock(hx, hy, hz, nid); Sfx.at(on ? 'click_on' : 'click_off', new V3(hx + 0.5, hy + 0.5, hz + 0.5), 0.8); } }
    for (const [wx, wy, wz] of c.cells) { const wid = world.get(wx, wy, wz); const nid = FAMILY.tripwire.ids['1,' + (on ? 1 : 0)]; if (wid !== nid) world.set(wx, wy, wz, nid); } } }
{ const _sb = shapeBoxes; shapeBoxes = function (id, x, y, z, get, which) { const d = BL[id]; if (d && d.shape === 'wire_t') { if (which !== 'r') return d.sb; const yy = d.st.attached ? 1 : 1.5; const t = TILE.tripwire;
      const link = (dx, dz) => { const n = BL[get(x + dx, y, z + dz)]; return !!(n && (n.tripwire || n.hook)); }; const ew = link(1, 0) || link(-1, 0), ns = link(0, 1) || link(0, -1); const bs = [];
      if (ew || !ns) bs.push([0, yy, 7.5, 16, yy + 0.25, 8.5, t]); if (ns || !ew) bs.push([7.5, yy, 0, 8.5, yy + 0.25, 16, t]); return bs; } return _sb.apply(this, arguments); }; }
// ---- the crafter ----
{ const _ru = rsUpdate; rsUpdate = function (x, y, z) { const id = world.get(x, y, z); const d = BL[id]; if (d && d.crafter) { const k = keyOf(x, y, z); const p = powerAt(x, y, z) > 0; const was = RS.edge.get(k) || false; if (p !== was) { RS.edge.set(k, p); if (p && !rsPending(x, y, z, 'craft')) rsSchedule(x, y, z, 'craft', 4); } return; } return _ru.apply(this, arguments); }; }
{ const _rr = rsRun; rsRun = function (kind, x, y, z) { const id = world.get(x, y, z); const d = BL[id];
    if (kind === 'craft' && d && d.crafter) { const c = contAt(x, y, z); const grid = c.arr.slice(0, 9); const r = gridMatch(grid, 3); const pos = new V3(x + 0.5, y + 0.5, z + 0.5);
      world.set(x, y, z, withState(id, { ex: 1 })); rsSchedule(x, y, z, 'crafted', 4);
      if (!r) { Sfx.at('dispense_fail', pos, 0.8); return; } const outId = IT[r.out[0]], n = r.out[1]; const v = RV[d.st.facing]; const fx = x + v[0], fy = y + v[1], fz = z + v[2];
      for (let i = 0; i < 9; i++) { const s = c.arr[i]; if (!s) continue; const remain = s.id === IT.milk_bucket || s.id === IT.water_bucket || s.id === IT.lava_bucket ? IT.bucket : s.id === IT.honey_bottle ? IT.glass_bottle : null; s.count--; if (s.count <= 0) c.arr[i] = remain ? { id: remain, count: 1 } : null; }
      contChanged(c); const out = contAt(fx, fy, fz); let left = n; if (out) { const it = { id: outId, count: 1 }; while (left > 0 && contInsert(out, it, d.st.facing ^ 1)) left--; }
      if (left > 0) { const e = dropItem(outId, left, x + 0.5 + v[0] * 0.7, y + 0.5 + v[1] * 0.7, z + 0.5 + v[2] * 0.7, false); if (e && e.vel) e.vel.set(v[0] * 3, v[1] * 3 + 1, v[2] * 3); }
      Sfx.at('crafter', pos, 0.9); Particles.emit(x + 0.5 + v[0] * 0.6, y + 0.5 + v[1] * 0.6, z + 0.5 + v[2] * 0.6, 6, [[0.9, 0.9, 0.9]], 1, 0.4, 0, 0.2); return; }
    if (kind === 'crafted' && d && d.crafter) { world.set(x, y, z, withState(id, { ex: 0 })); return; }
    if (kind === 'sensor_off' && d && d.sensor && d.sensorOn) { world.set(x, y, z, d.sensor === 'calibrated' ? B.CALIBRATED_SCULK_SENSOR : B.SCULK_SENSOR); WIRES.sense.delete(keyOf(x, y, z)); RS.edge.set('sc:' + keyOf(x, y, z), RS.tick + 10); return; }
    return _rr.apply(this, arguments); }; }
{ const _cs = containerSignal; containerSignal = function (x, y, z) { const d = BL[world.get(x, y, z)]; if (d && d.crafter) { const inv = world.chestInv.get(keyOf(x, y, z)); return inv ? inv.slice(0, 9).filter(Boolean).length : 0; } if (d && d.sensor) return d.sensorOn ? (WIRES.sense.get(keyOf(x, y, z)) || 1) : 0; return _cs.apply(this, arguments); }; }
{ const _ou = openUI; openUI = function (kind, key) { const r = _ou.apply(this, arguments); if (kind === 'chest') { const p = String(key).split(',').map(Number); if (p.length === 3 && (BL[world.get(p[0], p[1], p[2])] || {}).crafter) $('chestTitle').textContent = 'Crafter'; } return r; }; }
// ---- sculk sensors ----
{ const _vb = vibrate; vibrate = function (pos, src) { const r = _vb.apply(this, arguments); try { senseVibration(pos); } catch (e) { console.error(e); } return r; }; }
function senseVibration(pos) { if (!world || isClientMP()) return;
  for (const k of WIRES.sensors) { const [x, y, z] = k.split(',').map(Number); const id = world.get(x, y, z); const d = BL[id]; if (!d || !d.sensor) continue; const range = d.sensor === 'calibrated' ? 16 : 8;
    const dist = Math.hypot(pos.x - x - 0.5, pos.y - y - 0.5, pos.z - z - 0.5); if (dist > range || dist < 0.6 || d.sensorOn) continue; if ((RS.edge.get('sc:' + k) || 0) > RS.tick) continue;
    const p = Math.max(1, Math.min(15, 15 - Math.floor(dist / range * 15))); WIRES.sense.set(k, p); world.set(x, y, z, d.sensor === 'calibrated' ? B['CALIBRATED_SCULK_SENSOR#ON'] : B['SCULK_SENSOR#ON']); mpBlock(x, y, z, world.get(x, y, z));
    rsSchedule(x, y, z, 'sensor_off', d.sensor === 'calibrated' ? 10 : 30); Sfx.at('sculk_click', new V3(x + 0.5, y + 0.5, z + 0.5), 0.8); Particles.emit(x + 0.5, y + 1, z + 0.5, 4, [[0.2, 0.9, 0.9]], 0.8, 0.6, -1, 0.3); } }
// more things make vibrations (the warden already hears steps of mobs near it)
{ const _pb = placeBlock; placeBlock = function (hit, id) { const r = _pb.apply(this, arguments); if (r && hit) vibrate(new V3(hit.x + hit.nx + 0.5, hit.y + hit.ny + 0.5, hit.z + hit.nz + 0.5), 'player'); return r; }; }
{ const _sd = setDoor; setDoor = function (x, y, z) { const r = _sd.apply(this, arguments); vibrate(new V3(x + 0.5, y + 0.5, z + 0.5), 'player'); return r; }; }
{ const _oc = openChest; openChest = function (x, y, z) { vibrate(new V3(x + 0.5, y + 0.5, z + 0.5), 'player'); return _oc.apply(this, arguments); }; }
{ const _oe = onEatItem; onEatItem = function () { vibrate(player.pos.clone(), 'player'); return _oe.apply(this, arguments); }; }
function stepVibes(dt) { const P = player; if (!WIRES.sensors.size || P.dead || P.sneaking || !P.onGround || isSpec()) return; if (Math.hypot(P.vel.x, P.vel.z) < 1) return; WIRES.stepT -= dt; if (WIRES.stepT > 0) return; WIRES.stepT = 0.45; vibrate(P.pos.clone(), 'player'); }
// ---- placing tripwire (string) and hooks ----
{ const _ua = useAction; useAction = function (eye, dir) { const h = player.held();
    if (h && h.id === IT.string && target && !targetMob && target.ny === 1 && !(BL[target.id] && BL[target.id].use && !kd('sneak'))) { const x = target.x, y = target.y + 1, z = target.z; if (replaceableAt(x, y, z) && SOLID[world.get(x, y - 1, z)]) { world.set(x, y, z, FAMILY.tripwire.base); mpBlock(x, y, z, FAMILY.tripwire.base); useHeld(1); Sfx.play('wool', 0.8); S.swing = 1; mouseR = false; return; } }
    return _ua.apply(this, arguments); }; }
{ const _pb = placeBlock; placeBlock = function (hit, id) { const d = BL[id]; if (d && d.hook && hit) { if (hit.ny !== 0) return false; const vid = FAMILY.tripwire_hook.ids[[dirOf(hit.nx, hit.nz), 0, 0].join(',')]; const x = hit.x + hit.nx, y = hit.y, z = hit.z + hit.nz; if (!shapeSupported(x, y, z, vid)) return false; return _pb.call(this, hit, vid); } return _pb.apply(this, arguments); }; }
// ---- multiplayer: block data and container contents ----
let SYNC_QUIET = false;
class SyncMap extends Map { constructor(entries, tag, w) { super(entries || []); this.tag = tag; this.w = w; }
  set(k, v) { super.set(k, v); syncOut(this, k, v); return this; } delete(k) { const had = super.delete(k); if (had && this.tag === 'bdata') syncOut(this, k, undefined); return had; } }
function syncOut(map, k, v) { if (SYNC_QUIET || !map.w || typeof MP === 'undefined' || !MP.active || !/^-?\d+,-?\d+,-?\d+$/.test(k)) return;
  if (map.tag === 'bdata') mpSend({ t: 'bdata', dim: map.w.dim, k, v: v === undefined ? null : v }, false); else if (Array.isArray(v)) mpSend({ t: 'chest', dim: map.w.dim, k, inv: v.map(slotOut) }, false); }
function syncWrap() { if (typeof Dim === 'undefined') return; for (const d in Dim.worlds) { const w = Dim.worlds[d]; if (!(w.chestInv instanceof SyncMap)) w.chestInv = new SyncMap(w.chestInv, 'chest', w); if (w.bdata && !(w.bdata instanceof SyncMap)) w.bdata = new SyncMap(w.bdata, 'bdata', w); else if (!w.bdata) w.bdata = new SyncMap(null, 'bdata', w); } }
{ const _on = onPeerMsg; onPeerMsg = function (peer, m) { if (m && m.t === 'bdata') { const w = Dim.get(m.dim); syncWrap(); SYNC_QUIET = true; try { if (m.v === null) w.bdata.delete(m.k); else w.bdata.set(m.k, m.v); } finally { SYNC_QUIET = false; } if (w === world && typeof ovDrop === 'function') { const e = m.v; if (e && e.anchor) OV.watch.add(m.k); ovDrop(m.k); } if (MP.role === 'host') mpSendAll(m, false, peer.id); return; }
    SYNC_QUIET = true; try { const r = _on.apply(this, arguments); if (m && m.t === 'chest' && typeof ovDrop === 'function') ovDrop(m.k); return r; } finally { SYNC_QUIET = false; } }; }
{ const _cw = clientWelcome; clientWelcome = function (m) { SYNC_QUIET = true; try { const r = _cw.apply(this, arguments); for (const d in (m.worlds || {})) if (m.worlds[d].bdata) { const w = Dim.get(d); w.bdata = new SyncMap(Object.entries(m.worlds[d].bdata), 'bdata', w); } if (typeof OV !== 'undefined') OV.world = null; return r; } finally { SYNC_QUIET = false; } }; }
// mutations made in place get sent too
function chestTouched(k) { const inv = world.chestInv.get(k); if (inv) world.chestInv.set(k, inv); }
{ const _ua = useAction; useAction = function (eye, dir) { const t = target; const r = _ua.apply(this, arguments); if (t && typeof MP !== 'undefined' && MP.active) { const d = BL[world.get(t.x, t.y, t.z)] || {}; const by = d.armorStand === 'upper' ? t.y - 1 : t.y; if (d.armorStand || d.cbs || d.dpot || d.frame || d.jukebox) chestTouched(keyOf(t.x, by, t.z)); } return r; }; }
// ---- the clock and sounds ----
{ const _uw = updateWater; updateWater = function (dt) { const r = _uw.apply(this, arguments); try { syncWrap(); if (world && !isClientMP()) { wiresTick(dt); stepVibes(dt); } } catch (e) { console.error(e); } return r; }; }
{ const _pl = Sfx.play; Sfx.play = function (name, v = 1, rate) { if (!this.ctx) return _pl.apply(this, arguments); if (!(v >= 0.02)) return;
    if (name === 'sculk_click') { this.tone(1800, 1400, 0.05, 0.05 * v, 'square'); this.nz(0.15, 600, 0.15 * v, 'lowpass'); return; } if (name === 'crafter') { this.nz(0.12, 1200, 0.3 * v, 'bandpass', 2); this.tone(500, 700, 0.08, 0.05 * v, 'triangle'); return; }
    return _pl.apply(this, arguments); }; }

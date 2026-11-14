// ---- boats: craft from 5 planks, place on water, right-click to get in, W/S to row, A/D to turn, sneak to get out ----
G.boats = [];
let targetBoat = null;
const BOAT = { hw: 0.62, h: 0.55, draft: 0.1, seat: 0.05, eye: 1.12 };
function boatPaint(face, set, fw, fh, r) {
  const base = [164, 132, 80];
  for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
    let c = vary(base, r, 7);
    if (face === 'top' || face === 'bottom') { if (x % 4 === 3) c = mixc(base, [0, 0, 0], 0.32); }
    else if (y % 4 === 3) c = mixc(base, [0, 0, 0], 0.36);
    else if (r() < 0.05) c = mixc(base, [0, 0, 0], 0.15);
    set(x, y, c);
  }
}
function oarPaint(face, set, fw, fh, r) { for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) set(x, y, vary([126, 94, 52], r, 6)); }
function makeBoatMesh() {
  const m = { mats: [] }; const root = new THREE.Group();
  sbox(m, root, 0.96, 0.16, 1.6, 0, 0.08, 0, 'boat_floor', boatPaint);
  sbox(m, root, 0.1, 0.42, 1.6, -0.43, 0.37, 0, 'boat_side', boatPaint);
  sbox(m, root, 0.1, 0.42, 1.6, 0.43, 0.37, 0, 'boat_side', boatPaint);
  sbox(m, root, 0.76, 0.42, 0.1, 0, 0.37, 0.75, 'boat_end', boatPaint);
  sbox(m, root, 0.76, 0.42, 0.1, 0, 0.37, -0.75, 'boat_end', boatPaint);
  const oars = [];
  for (const side of [-1, 1]) {
    // pivot at the oarlock; the oar hangs outward and down into the water and sweeps fore and aft
    const g = new THREE.Group(); g.position.set(side * 0.5, 0.56, 0.05); g.rotation.z = side * 0.9;
    sbox(m, g, 0.06, 1.1, 0.06, 0, -0.4, 0, 'boat_oar', oarPaint);
    sbox(m, g, 0.04, 0.38, 0.2, 0, -0.84, 0, 'boat_blade', oarPaint);
    root.add(g); oars.push(g);
  }
  return { root, mats: m.mats, oars };
}
function makeBoat(x, y, z, yaw, id, dim) {
  const b = { id: id || ('b' + Math.random().toString(36).slice(2, 10)), dim: dim || world.dim, pos: new V3(x, y, z), vel: new V3(), yaw: yaw || 0, yawV: 0, hw: BOAT.hw, h: BOAT.h, rider: null, hp: 0, hurtT: 0, row: 0, rowing: 0, tgt: null, tgtYaw: yaw || 0, sendT: 0, onGround: false };
  const mm = makeBoatMesh(); b.mesh = mm.root; b.mats = mm.mats; b.oars = mm.oars; b.mesh.position.copy(b.pos); b.mesh.rotation.y = b.yaw; scene.add(b.mesh);
  G.boats.push(b); return b;
}
function removeBoat(b) { if (player.riding === b) dismount(); scene.remove(b.mesh); b.gone = true; G.boats = G.boats.filter(x => x !== b); }
function clearBoats() { for (const b of G.boats) scene.remove(b.mesh); G.boats = []; player.riding = null; targetBoat = null; }
function boatList() { return G.boats.map(b => ({ id: b.id, dim: b.dim, x: +b.pos.x.toFixed(2), y: +b.pos.y.toFixed(2), z: +b.pos.z.toFixed(2), yaw: +b.yaw.toFixed(3) })); }
function loadBoats(list) { for (const o of list || []) if (o && isFinite(o.x)) makeBoat(o.x, o.y, o.z, o.yaw, o.id, o.dim || 'overworld'); }
const lerpAngle = (a, b, t) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return a + d * t; };

// highest water surface in the column around height y (null when there is no water there)
function waterTopAt(x, y, z) {
  const bx = Math.floor(x), bz = Math.floor(z);
  for (let yy = Math.floor(y + 0.9); yy >= Math.floor(y - 1); yy--) {
    if (isWaterId(world.get(bx, yy, bz))) { let t = yy; while (t < yy + 8 && isWaterId(world.get(bx, t + 1, bz))) t++; return t + FH[world.get(bx, t, bz)]; }
  }
  return null;
}
// boat motion: floats on water (fast), slides on ice, scrapes slowly over land; turning drags the motion around like a keel
function boatPhysics(b, dt, f, turn) {
  const surf = waterTopAt(b.pos.x, b.pos.y, b.pos.z);
  const under = world.get(Math.floor(b.pos.x), Math.floor(b.pos.y - 0.05), Math.floor(b.pos.z));
  const ice = !!(BL[under] && /ice/.test(BL[under].key || ''));
  let floating = false;
  if (surf !== null && b.pos.y < surf - BOAT.draft + 0.25) {
    floating = true; const tgt = surf - BOAT.draft + Math.sin(performance.now() / 700 + b.pos.x * 0.7) * 0.015;
    b.vel.y += ((tgt - b.pos.y) * 30 - b.vel.y * 6) * dt; b.vel.y = clamp(b.vel.y, -8, 6);
  } else b.vel.y = Math.max(b.vel.y - 25 * dt, -40);
  if (turn) b.yawV += (turn * 2.4 - b.yawV) * Math.min(1, dt * 8); else b.yawV *= Math.exp(-dt * 8);
  b.yaw += b.yawV * dt;
  const acc = floating ? 9 : ice ? 14 : 3, drag = floating ? 1.1 : ice ? 0.3 : (b.onGround ? 6 : 0.2);
  if (f) { const k = f > 0 ? 1 : 0.35; b.vel.x += -Math.sin(b.yaw) * acc * k * f * dt; b.vel.z += -Math.cos(b.yaw) * acc * k * f * dt; }
  const dk = Math.exp(-dt * drag); b.vel.x *= dk; b.vel.z *= dk;
  if (floating || ice) {
    const fx = -Math.sin(b.yaw), fz = -Math.cos(b.yaw); const along = b.vel.x * fx + b.vel.z * fz; const sx = b.vel.x - fx * along, sz = b.vel.z - fz * along;
    const kk = Math.exp(-dt * (floating ? 2.5 : 1)); b.vel.x = fx * along + sx * kk; b.vel.z = fz * along + sz * kk;
  }
  if (floating) fluidPush(b, dt, 0.8);
  moveEntity(b, dt);
  return floating;
}

// ---- riding ----
function seatPlayer(P, b) { P.pos.set(b.pos.x, b.pos.y + BOAT.seat, b.pos.z); P.vel.set(0, 0, 0); P.onGround = true; P.peak = null; P.flying = false; }
function mountBoat(b) {
  const P = player; if (P.riding || P.dead) return;
  if (b.rider) { toast('Someone is already in this boat', 1.5); return; }
  P.riding = b; b.rider = 'local'; b.vel.y = 0; P.swimming = false; P.h = 1.8; P.sneaking = false; P.sprinting = false; P.flying = false;
  seatPlayer(P, b); Sfx.play('wood', 0.5); boatSync(b, true);
}
function dismount() {
  const P = player; const b = P.riding; if (!b) return; P.riding = null; if (b.rider === 'local') b.rider = null; b.rowing = 0;
  const free = (x, y, z) => !world.solid(Math.floor(x), y, Math.floor(z)) && !world.solid(Math.floor(x), y + 1, Math.floor(z));
  let spot = null;
  for (const needGround of [true, false]) {
    for (let a = 0; a < 8 && !spot; a++) {
      const ang = b.yaw + Math.PI / 2 + a * Math.PI / 4; const x = b.pos.x + Math.sin(ang) * 1.15, z = b.pos.z + Math.cos(ang) * 1.15;
      for (const dy of [0, 1]) { const y = Math.floor(b.pos.y + 0.5) + dy; if (free(x, y, z) && (!needGround || world.solid(Math.floor(x), y - 1, Math.floor(z)))) { spot = [x, y + 0.01, z]; break; } }
    }
    if (spot) break;
  }
  if (spot) P.pos.set(spot[0], spot[1], spot[2]); else P.pos.set(b.pos.x, b.pos.y + 0.6, b.pos.z);
  P.vel.set(0, 0, 0); P.peak = null; boatSync(b, true);
}
function rideUpdate(P, dt) {
  const b = P.riding; if (!b || b.gone) { P.riding = null; return; }
  let f = 0, s = 0; if (!S.uiOpen) { if (kd('forward') || keys.ArrowUp) f++; if (kd('back') || keys.ArrowDown) f--; if (kd('right') || keys.ArrowRight) s++; if (kd('left') || keys.ArrowLeft) s--; f += T.my; s += T.mx; }
  if (!S.uiOpen && kd('sneak')) { dismount(); return; }
  if (keys.KeyJ) look(-300 * dt, 0); if (keys.KeyL) look(300 * dt, 0); if (keys.KeyI) look(0, -300 * dt); if (keys.KeyK) look(0, 300 * dt);
  f = clamp(f, -1, 1); s = clamp(s, -1, 1);
  const y0 = b.yaw; b.floating = boatPhysics(b, dt, f, -s); P.yaw += b.yaw - y0; // the view turns with the boat, like Minecraft
  b.rowing = f || s ? 1 : 0; if (b.rowing) b.row += dt * 7;
  P.sprinting = false; P.sneaking = false; P.swimming = false;
  seatPlayer(P, b);
}
// sitting pose for player models in a boat
function sitPose(model, on, rowing) {
  if (!model) return;
  const P2 = model.P;
  if (!on) { if (model.sat) { model.sat = false; P2.legR.rotation.z = 0; P2.legL.rotation.z = 0; } return; }
  model.sat = true; const t = performance.now() / 1000;
  model.body.position.y = -0.5; model.body.rotation.x = 0;
  P2.legR.rotation.x = P2.legL.rotation.x = -Math.PI / 2 + 0.1; P2.legR.rotation.z = 0.12; P2.legL.rotation.z = -0.12;
  const a = rowing ? Math.sin(t * 7) * 0.5 : 0; P2.armR.rotation.x = -0.75 + a; P2.armL.rotation.x = -0.75 + a;
}

// ---- placing and breaking ----
function placeBoatItem(eye, dir) {
  const ft = raycast(eye, dir, 5, true); let x, y, z;
  if (ft && isWaterId(ft.id)) { x = ft.x + 0.5; z = ft.z + 0.5; let t = ft.y; while (isWaterId(world.get(ft.x, t + 1, ft.z))) t++; y = t + FH[world.get(ft.x, t, ft.z)] - BOAT.draft; }
  else if (target) { x = target.x + target.nx + 0.5; z = target.z + target.nz + 0.5; y = target.y + target.ny; }
  else return false;
  if (world.solid(Math.floor(x), Math.floor(y + 0.3), Math.floor(z))) return false;
  const b = makeBoat(x, y, z, player.yaw); boatSync(b, true); useHeld(1); S.swing = 1; Sfx.play('wood', 0.6);
  return true;
}
function hitBoat(b) {
  if (S.atkCD > 0) return;
  const tool = player.heldDef(); const dmg = tool && tool.kind === 'tool' ? tool.dmg : 1;
  S.atkCD = 0.25; S.swing = 1; b.hurtT = 0.4; b.hp += S.mode === 'creative' ? 99 : dmg; Sfx.play('wood', 0.7);
  Particles.emit(b.pos.x, b.pos.y + 0.4, b.pos.z, 6, [[0.64, 0.52, 0.31], [0.44, 0.33, 0.18]], 2, 0.4, 10, 0.3);
  if (b.hp >= 4) {
    if (S.mode !== 'creative') dropItem(typeof boatItemOf === 'function' ? boatItemOf(b) : IT.boat, 1, b.pos.x, b.pos.y + 0.4, b.pos.z, true);
    if (typeof MP !== 'undefined' && MP.active) mpSend({ t: 'boatdel', id: b.id }, false);
    removeBoat(b);
  } else boatSync(b, false);
}
function boatRay(eye, dir, best) {
  let hit = null;
  for (const b of G.boats) {
    if (b.dim !== world.dim || b === player.riding) continue;
    const t = rayAABB(eye, dir, new V3(b.pos.x - b.hw, b.pos.y, b.pos.z - b.hw), new V3(b.pos.x + b.hw, b.pos.y + 0.6, b.pos.z + b.hw));
    if (t >= 0 && t < best && (!target || t < target.dist)) { best = t; hit = b; }
  }
  return hit;
}

// ---- per-frame update ----
function updateBoats(dt) {
  const mp = typeof MP !== 'undefined' && MP.active, client = mp && MP.role === 'client';
  for (const b of G.boats) {
    const here = b.dim === world.dim; b.mesh.visible = here; if (!here) continue;
    if (!world.loaded(Math.floor(b.pos.x), Math.floor(b.pos.z))) continue;
    if (b.rider === 'local') { } // moved by rideUpdate
    else if (b.rider || client) { if (b.tgt) { b.pos.lerp(b.tgt, Math.min(1, dt * 10)); b.yaw = lerpAngle(b.yaw, b.tgtYaw, Math.min(1, dt * 10)); } if (b.rowing) b.row += dt * 7; }
    else b.floating = boatPhysics(b, dt, 0, 0);
    b.hurtT = Math.max(0, b.hurtT - dt); b.hp = Math.max(0, b.hp - dt * 0.5);
    b.mesh.position.copy(b.pos); b.mesh.rotation.set(0, b.yaw, b.hurtT > 0 ? Math.sin(b.hurtT * 40) * b.hurtT * 0.4 : 0);
    for (const o of b.oars) o.rotation.x = b.rowing ? -0.2 + Math.sin(b.row) * 0.7 : -0.6;
    const l = clamp(Math.max(G.minLight || 0, world.lightAt(b.pos.x, b.pos.y + 0.5, b.pos.z, G.daylight)), 0.08, 1); for (const mm of b.mats) mm[0].color.setScalar(l);
    if (mp && (b.rider === 'local' || (!client && !b.rider))) {
      b.sendT -= dt; const moving = b.vel.lengthSq() > 0.0004 || Math.abs(b.yawV) > 0.01;
      if (b.sendT <= 0 && (moving || b.rider === 'local')) { b.sendT = 0.1; boatSync(b, false); }
    }
  }
}

// ---- multiplayer ----
function boatSync(b, reliable) {
  if (typeof MP === 'undefined' || !MP.active) return;
  mpSend({ t: 'boat', id: b.id, dim: b.dim, x: +b.pos.x.toFixed(2), y: +b.pos.y.toFixed(2), z: +b.pos.z.toFixed(2), yaw: +b.yaw.toFixed(3), r: b.rider === 'local' ? MP.myId : (b.rider || 0), row: b.rowing ? 1 : 0 }, !reliable);
}
function onBoatMsg(peer, m) {
  let b = G.boats.find(x => x.id === m.id);
  if (!b) b = makeBoat(m.x, m.y, m.z, m.yaw, m.id, m.dim);
  if (b.rider !== 'local') {
    b.tgt = new V3(m.x, m.y, m.z); b.tgtYaw = m.yaw; b.dim = m.dim; b.rowing = m.row;
    b.rider = m.r ? (m.r === MP.myId ? 'local' : m.r) : null;
    if (b.dim !== world.dim || b.pos.distanceTo(b.tgt) > 8) { b.pos.copy(b.tgt); b.yaw = m.yaw; }
    if (!b.rider && MP.role === 'host') { b.pos.copy(b.tgt); b.vel.set(0, 0, 0); } // the host simulates boats nobody is in
  }
  if (MP.role === 'host') mpSendAll(m, true, peer.id);
}
function onBoatDel(peer, m) { const b = G.boats.find(x => x.id === m.id); if (b) removeBoat(b); if (MP.role === 'host') mpSendAll(m, false, peer.id); }

// ---- hooks into the rest of the game ----
{ const _die = Player.prototype.die; Player.prototype.die = function (cause) { if (this.riding) dismount(); return _die.call(this, cause); }; }
{ const _travel = travelTo; travelTo = function () { if (player.riding) dismount(); return _travel.apply(this, arguments); }; }
{ const _rm = removeAvatar; removeAvatar = function (id) { for (const b of G.boats) if (b.rider === id) { b.rider = null; b.rowing = 0; } return _rm.apply(this, arguments); }; }

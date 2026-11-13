// ================= DIMENSIONS: travel, portals, eyes of ender, the End fight =================
const Dim = {
  worlds: {},
  get(dim) { if (!this.worlds[dim]) { const w = new World(S.seed, scene, dim); w.onChunkGen = onChunkGen; this.worlds[dim] = w; } return this.worlds[dim]; },
};
function travelTo(dim, arrival) {
  if (S.uiOpen) closeInv(true);
  saveGame(false);
  if (world) { for (const c of [...world.chunks.values()]) world.unload(c); world.lastCenter = null; }
  clearEntities();
  world = Dim.get(dim); G.world = world; S.dim = dim; S.arrival = arrival;
  player.pos.set((arrival.x != null ? arrival.x : player.spawn.x) + 0.5, 100, (arrival.z != null ? arrival.z : player.spawn.z) + 0.5);
  if (arrival.type === 'end-spawn') player.pos.set(100.5, 100, 0.5);
  player.vel.set(0, 0, 0); player.peak = null; player.flying = false;
  S.loading = true; show('loading', true); $('loadBar').style.width = '0%';
  $('loadTxt').textContent = dim === 'nether' ? 'Entering the Nether...' : dim === 'end' ? 'Entering the End...' : 'Returning to the Overworld...';
  S.portalT = 0; S.portalLock = true; $('portalfx').style.opacity = 0; show('lavafx', false);
  Sfx.play('portal', 1);
}
function handleArrival() {
  const a = S.arrival; S.arrival = null; if (!a) return false;
  if (a.type === 'portal') { const p = findPortalNear(a.x, a.z, 20) || buildPortalAt(a.x, a.y, a.z); player.pos.set(p[0] + 0.5, p[1] + 0.01, p[2] + 0.5); }
  else if (a.type === 'end-spawn') {
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) { world.set(100 + dx, 48, dz, B.OBSIDIAN); for (let y = 49; y <= 51; y++) world.set(100 + dx, y, dz, 0); }
    player.pos.set(100.5, 49.01, 0.5); player.yaw = Math.PI / 2; player.pitch = 0.05;
    toast('Destroy the End Crystals on the pillars, then defeat the Shadow Dragon', 6);
  } else if (a.type === 'bed' && a.pos) { player.pos.set(a.pos.x, a.pos.y, a.pos.z); }
  else { const sp = player.spawn; const y = world.surfaceY(Math.floor(sp.x), Math.floor(sp.z)); player.pos.set(sp.x, y + 0.01, sp.z); }
  player.vel.set(0, 0, 0); player.peak = null; S.portalLock = true;
  if (world.dim === 'end') EndFight.enter();
  return true;
}
const isNPortal = (id) => id === B.NETHER_PORTAL || id === B.NETHER_PORTAL_Z;
function findPortalNear(x, z, R) {
  let best = null, bd = 1e9;
  for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) { if (!world.loaded(x + dx, z + dz)) continue; for (let y = 1; y < WH - 1; y++) { if (isNPortal(world.get(x + dx, y, z + dz)) && !isNPortal(world.get(x + dx, y - 1, z + dz))) { const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = [x + dx, y, z + dz]; } } } }
  return best;
}
function buildPortalAt(x, y0, z) {
  let spot = null;
  const ok = (px, py, pz) => { for (let dx = -1; dx <= 2; dx++) { const b = world.get(px + dx, py - 1, pz); if (!SOLID[b]) return false; for (let dy = 0; dy < 4; dy++) { const id = world.get(px + dx, py + dy, pz); if (id && !PLANT[id]) return false; } } return true; };
  for (let r = 0; r <= 10 && !spot; r++) for (let dx = -r; dx <= r && !spot; dx++) for (let dz = -r; dz <= r && !spot; dz++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue; const px = x + dx, pz = z + dz;
    if (world.dim === 'overworld') { const sy = world.surfaceY(px, pz); if (sy > SEA && world.get(px, sy - 1, pz) !== B.WATER && ok(px, sy, pz)) spot = [px, sy, pz]; }
    else for (let k = 0; k < 50 && !spot; k++) { const py = clamp(Math.round(y0 / 1), 36, 86) + (k % 2 ? 1 : -1) * Math.ceil(k / 2); if (py > 33 && py < 88 && ok(px, py, pz)) spot = [px, py, pz]; }
  }
  if (!spot) spot = [x, world.dim === 'overworld' ? Math.max(SEA + 1, world.surfaceY(x, z)) : clamp(Math.round(y0), 40, 80), z];
  const [px, py, pz] = spot;
  for (let dx = -1; dx <= 2; dx++) for (let dz = -1; dz <= 1; dz++) { if (!SOLID[world.get(px + dx, py - 1, pz + dz)]) world.set(px + dx, py - 1, pz + dz, B.OBSIDIAN); for (let dy = 0; dy <= 3; dy++) if (dz !== 0) { const id = world.get(px + dx, py + dy, pz + dz); if (id && id !== B.BEDROCK) world.set(px + dx, py + dy, pz + dz, 0); } }
  for (let dx = -1; dx <= 2; dx++) for (let dy = -1; dy <= 3; dy++) { const frame = dx === -1 || dx === 2 || dy === -1 || dy === 3; world.set(px + dx, py + dy, pz, frame ? B.OBSIDIAN : B.NETHER_PORTAL); }
  return [px, py, pz];
}
function tryLightPortal(x, y, z) {
  for (const axis of ['x', 'z']) {
    const cells = [], seen = new Set([x + ',' + y + ',' + z]); const st = [[x, y, z]]; let fail = false;
    let minA = 1e9, maxA = -1e9, minY = 1e9, maxY = -1e9;
    while (st.length) {
      const [a, b, c] = st.pop(); cells.push([a, b, c]); if (cells.length > 441) { fail = true; break; }
      const h = axis === 'x' ? a : c; minA = Math.min(minA, h); maxA = Math.max(maxA, h); minY = Math.min(minY, b); maxY = Math.max(maxY, b);
      const nb = axis === 'x' ? [[a + 1, b, c], [a - 1, b, c], [a, b + 1, c], [a, b - 1, c]] : [[a, b, c + 1], [a, b, c - 1], [a, b + 1, c], [a, b - 1, c]];
      for (const [p, q, r] of nb) { const k = p + ',' + q + ',' + r; if (seen.has(k)) continue; const id = world.get(p, q, r); if (id === 0 || PLANT[id]) { seen.add(k); st.push([p, q, r]); } else if (id !== B.OBSIDIAN) { fail = true; break; } }
      if (fail) break;
    }
    if (fail || maxA - minA < 1 || maxY - minY < 2) continue;
    const pid = axis === 'x' ? B.NETHER_PORTAL : B.NETHER_PORTAL_Z;
    for (const [a, b, c] of cells) world.set(a, b, c, pid);
    Particles.emit(x + 0.5, y + 1, z + 0.5, 40, [[0.6, 0.2, 0.9], [0.8, 0.5, 1]], 3, 1, -1, 2);
    return true;
  }
  return false;
}
function checkEndPortal(x, y, z) {
  const cands = []; for (let l = -1; l <= 1; l++) cands.push([x - 2, z - l], [x + 2, z - l], [x - l, z - 2], [x - l, z + 2]);
  for (const [cx, cz] of cands) {
    let ok = true; for (let l = -1; l <= 1 && ok; l++) for (const [fx, fz] of [[cx + 2, cz + l], [cx - 2, cz + l], [cx + l, cz + 2], [cx + l, cz - 2]]) if (world.get(fx, y, fz) !== B.END_PORTAL_FRAME_EYE) { ok = false; break; }
    if (!ok) continue;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) world.set(cx + i, y, cz + j, B.END_PORTAL);
    Sfx.play('levelup', 1); Sfx.play('portal', 1); toast('The End Portal is open. Jump in to face the Shadow Dragon.', 5);
    Particles.emit(cx + 0.5, y + 1, cz + 0.5, 60, [[0.3, 0.9, 0.7], [0.7, 0.4, 1]], 4, 1.2, -1, 3); return true;
  }
  return false;
}
function checkPortals(dt) {
  const P = player; const fx = Math.floor(P.pos.x), fz = Math.floor(P.pos.z);
  const a = world.get(fx, Math.floor(P.pos.y + 0.1), fz), b = world.get(fx, Math.floor(P.pos.y + 1.2), fz);
  const inNP = isNPortal(a) || isNPortal(b); const inEP = a === B.END_PORTAL || world.get(fx, Math.floor(P.pos.y), fz) === B.END_PORTAL;
  if (!inNP && !inEP) { S.portalLock = false; S.portalT = Math.max(0, S.portalT - dt * 2); $('portalfx').style.opacity = S.portalT / 3; return; }
  if (S.portalLock) return;
  if (inEP) { if (world.dim === 'end') { toast('You return home victorious', 4); travelTo('overworld', { type: 'spawn' }); } else travelTo('end', { type: 'end-spawn' }); return; }
  if (world.dim === 'end') return;
  const need = S.mode === 'creative' ? 0.8 : 3;
  if (S.portalT === 0) Sfx.play('portal', 0.6);
  S.portalT += dt; $('portalfx').style.opacity = Math.min(1, S.portalT / need) * 0.9;
  if (S.portalT >= need) {
    if (world.dim === 'nether') travelTo('overworld', { type: 'portal', x: Math.floor(P.pos.x * 8), z: Math.floor(P.pos.z * 8), y: P.pos.y });
    else travelTo('nether', { type: 'portal', x: Math.floor(P.pos.x / 8), z: Math.floor(P.pos.z / 8), y: clamp(P.pos.y, 40, 80) });
  }
}
// ---- eyes of ender ----
function throwEye() {
  if (world.dim !== 'overworld') { toast('The Eye of Ender drifts aimlessly here', 2); return false; }
  const P = player; let best = null, bd = 1e18; for (const s of world.gen.strongholds) { const d = (s.x - P.pos.x) ** 2 + (s.z - P.pos.z) ** 2; if (d < bd) { bd = d; best = s; } }
  if (!best) return false;
  if (!spriteMats[IT.eye_of_ender]) spriteMats[IT.eye_of_ender] = new THREE.SpriteMaterial({ map: itemTex(IT.eye_of_ender), alphaTest: 0.3 });
  const mesh = new THREE.Sprite(spriteMats[IT.eye_of_ender]); mesh.scale.setScalar(0.45); scene.add(mesh);
  G.eyes.push({ pos: P.eye(), target: new V3(best.x + 0.5, best.y, best.z + 0.5), t: 0, mesh }); Sfx.play('vwoop', 0.8); return true;
}
function updateEyes(dt) {
  for (const e of G.eyes) {
    e.t += dt; const to = new V3(e.target.x - e.pos.x, 0, e.target.z - e.pos.z); const hd = to.length();
    if (e.t < 1.8) { if (hd > 1) { to.normalize(); e.pos.addScaledVector(to, Math.min(hd, 9 * dt)); } e.pos.y += (hd < 12 ? -1.5 : 1.3) * dt; }
    else e.pos.y += Math.sin(e.t * 6) * dt * 0.3;
    if (Math.random() < dt * 30) Particles.emit(e.pos.x, e.pos.y, e.pos.z, 1, [[0.6, 0.2, 0.9], [0.3, 0.9, 0.6]], 0.4, 0.8, -0.5, 0.2);
    e.mesh.position.copy(e.pos);
    if (e.t > 3.2) { e.done = true; scene.remove(e.mesh); if (Math.random() < 0.8) dropItem(IT.eye_of_ender, 1, e.pos.x, e.pos.y, e.pos.z, false); else { Sfx.play('glass_break', 0.7); Particles.emit(e.pos.x, e.pos.y, e.pos.z, 15, [[0.3, 0.8, 0.6]], 2, 0.8, 4, 0.3); } }
  }
  G.eyes = G.eyes.filter(e => !e.done);
}

// ---- End crystals ----
const crystalCore = new THREE.MeshBasicMaterial({ color: 0xff70ff, map: mobTex });
const crystalFrame = new THREE.LineBasicMaterial({ color: 0xe8d8ff });
const beamMat = new THREE.LineBasicMaterial({ color: 0xd080ff });
class Crystal {
  constructor(p) {
    this.p = p; this.isBoss = true; this.isCrystal = true; this.type = 'crystal'; this.t = { kind: 'boss', name: 'End Crystal' }; this.hp = 1; this.dead = false; this.hw = 0.8; this.h = 2;
    this.pos = new V3(p.x + 0.5, p.top + 2, p.z + 0.5); this.root = new THREE.Group(); this.age = Math.random() * 6;
    this.core = new THREE.Mesh(BOXG, crystalCore); this.core.scale.setScalar(0.55);
    const eg = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)); this.f1 = new THREE.LineSegments(eg, crystalFrame); this.f2 = new THREE.LineSegments(eg, crystalFrame); this.f2.scale.setScalar(1.35);
    this.root.add(this.core, this.f1, this.f2); scene.add(this.root);
    this.beamGeo = new THREE.BufferGeometry().setFromPoints([new V3(), new V3()]); this.beam = new THREE.Line(this.beamGeo, beamMat); this.beam.frustumCulled = false; scene.add(this.beam);
  }
  update(dt) {
    this.age += dt; this.root.position.set(this.pos.x, this.pos.y + 0.8 + Math.sin(this.age * 2) * 0.25, this.pos.z);
    this.core.rotation.set(this.age * 1.3, this.age * 1.7, 0); this.f1.rotation.set(this.age, -this.age * 1.2, 0.4); this.f2.rotation.set(-this.age * 0.8, this.age, 0);
    const d = EndFight.dragon; const on = d && !d.dying && d.healer === this; this.beam.visible = !!on;
    if (on) { const a = this.beamGeo.attributes.position; a.setXYZ(0, this.root.position.x, this.root.position.y, this.root.position.z); a.setXYZ(1, d.pos.x, d.pos.y, d.pos.z); a.needsUpdate = true; }
  }
  hitPoint(p) { return Math.abs(p.x - this.pos.x) < 1 && Math.abs(p.z - this.pos.z) < 1 && p.y > this.pos.y && p.y < this.pos.y + 2.2; }
  rayTest(o, d) { return rayAABB(o, d, new V3(this.pos.x - 0.8, this.pos.y, this.pos.z - 0.8), new V3(this.pos.x + 0.8, this.pos.y + 2, this.pos.z + 0.8)); }
  hurt() {
    if (this.dead) return; this.dead = true; this.gone = true; if (!S.crystalsGone.includes(this.p.i)) S.crystalsGone.push(this.p.i);
    explode(this.pos.x, this.pos.y + 0.8, this.pos.z, 3, this, { cause: 'an End Crystal' });
    const d = EndFight.dragon; if (d && d.healer === this && !d.dying) d.hurt(10, null, 0, true);
    const left = EndFight.crystals.filter(c => !c.dead).length; toast(left ? left + ' End Crystal' + (left > 1 ? 's' : '') + ' remaining' : 'All End Crystals destroyed!', 2.5);
  }
  remove() { scene.remove(this.root); scene.remove(this.beam); this.beamGeo.dispose(); }
}

// ---- Shadow Dragon ----
class Dragon {
  constructor(hp) {
    this.isBoss = true; this.type = 'dragon'; this.t = { kind: 'boss', name: 'Shadow Dragon' }; this.hp = hp; this.maxHp = 200; this.dead = false; this.dying = false;
    this.pos = new V3(0, 82, 46); this.vel = new V3(-12, 0, 0); this.hw = 3; this.h = 3; this.yaw = 0; this.pitch = 0; this.state = 'circle'; this.stateT = 12; this.ang = Math.PI / 2; this.dirSign = 1;
    this.mats = []; this.age = 0; this.hurtT = 0; this.hurtCD = 0; this.contactCD = 0; this.shootCD = 2; this.shots = 0; this.perchT = 0; this.roarT = 5; this.hist = [];
    this.root = new THREE.Group(); this.root.rotation.order = 'YXZ'; this.build(); scene.add(this.root); this.root.traverse(o => { if (o.isMesh) o.layers.enable(1); }); this.spheres = [];
  }
  build() {
    const r = this.root, m = this; const RIDGE = 0x6a2fa0, EYE = 0xe060ff;
    const scl = (base, alt, o = {}) => (face, set, fw, fh, rr) => { for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) { const k = ((x >> 1) + (y >> 1) + (y >> 1 & 1)) % 2; let c = k ? base : alt; if (x % 2 === 0 && y % 2 === 0) c = shadeC(c, 1.18); if (o.belly && face === 'bottom') c = shadeC(o.belly, k ? 1 : 0.9); set(x, y, vary(shadeC(c, shadeFace(face, y, fh)), rr, 5)); } if (o.extra) o.extra(face, set, fw, fh, rr); };
    const B1 = [40, 28, 54], B2 = [28, 20, 40], BEL = [70, 52, 84];
    const vein = (face, set, fw, fh) => { if (face !== 'top' && face !== 'bottom') return; for (let x = 0; x < fw; x += 6) for (let y = 0; y < fh; y++) set(x + ((y / 3) | 0) % 2, y, [120, 60, 170], true); };
    sbox(m, r, 2.6, 2.0, 5.2, 0, 0, 0, 'dr_body', scl(B1, B2, { belly: BEL }), { ppb: 8 });
    for (let i = 0; i < 5; i++) part(m, r, 0.3, 0.6, 0.6, 0, 1.25, -1.8 + i * 0.9, RIDGE, true);
    this.neck = []; for (let i = 0; i < 4; i++) { const n = sbox(m, r, 1.1 - i * 0.06, 1.0, 1.1, 0, 0.35 + i * 0.32, 3.1 + i * 1.0, 'dr_neck' + i, scl(B1, B2, { belly: BEL }), { ppb: 8 }); part(m, r, 0.25, 0.4, 0.4, 0, 0.95 + i * 0.32, 3.1 + i * 1.0, RIDGE, true); this.neck.push(n); }
    const h = pivot(r, 0, 1.6, 7.3); this.head = h;
    sbox(m, h, 1.7, 1.3, 1.9, 0, 0, 0, 'dr_skull', scl(B1, B2, { extra: (f, set, fw, fh) => { if (f === 'left' || f === 'right') { for (let x = 3; x < fw - 3; x++) set(x, 4, [60, 30, 90]); } } }), { ppb: 8 });
    sbox(m, h, 1.3, 0.75, 1.5, 0, -0.15, 1.6, 'dr_snout', scl([34, 24, 46], [24, 16, 34], { extra: (f, set, fw) => { if (f === 'top') { set(2, fw > 8 ? 9 : 8, [10, 6, 14]); set(fw - 3, 9, [10, 6, 14]); } if (f === 'left' || f === 'right') for (let x = 0; x < fw; x++) set(x, 5, [200, 190, 210]); } }), { ppb: 8 });
    this.jaw = pivot(h, 0, -0.55, 0.6); sbox(m, this.jaw, 1.2, 0.3, 1.9, 0, 0, 0.9, 'dr_jaw', scl([36, 26, 48], [26, 18, 36], { extra: (f, set, fw, fh) => { if (f === 'top') for (let y = 0; y < fh; y++) { set(1, y, [220, 210, 230]); set(fw - 2, y, [220, 210, 230]); } } }), { ppb: 8 });
    for (const s of [-1, 1]) { part(m, h, 0.36, 0.2, 0.12, s * 0.55, 0.15, 0.96, EYE, true); part(m, h, 0.12, 0.2, 0.13, s * 0.62, 0.15, 0.96, 0xffffff, true); const horn = pivot(h, s * 0.55, 0.6, -0.4); horn.rotation.x = -0.6; sbox(m, horn, 0.22, 0.22, 1.2, 0, 0, -0.5, 'dr_horn', fur([84, 70, 100], 5, { extra: (f, set, fw, fh) => { for (let y = 0; y < fh; y += 3) for (let x = 0; x < fw; x++) set(x, y, [60, 48, 74]); } })); }
    this.wings = []; for (const s of [-1, 1]) {
      const w = pivot(r, s * 1.3, 0.8, 0.9); part(m, w, 6.5, 0.32, 0.45, s * 3.25, 0, 0, RIDGE, true);
      sbox(m, w, 6.5, 0.07, 3.6, s * 3.25, -0.05, -1.9, 'dr_mem1', fur([58, 38, 82], 6, { extra: vein }), { ppb: 4 });
      const tip = pivot(w, s * 6.5, 0, 0); part(m, tip, 5.5, 0.26, 0.35, s * 2.75, 0, 0, RIDGE, true);
      sbox(m, tip, 5.5, 0.06, 3.2, s * 2.75, -0.04, -1.7, 'dr_mem2', fur([58, 38, 82], 6, { extra: vein }), { ppb: 4 });
      for (let k = 0; k < 3; k++) part(m, tip, 0.12, 0.12, 2.8, s * (1.2 + k * 1.6), 0, -1.5, RIDGE, true);
      this.wings.push([w, tip, s]);
    }
    this.legs = []; for (const [x, z] of [[-1.0, 1.7], [1.0, 1.7], [-1.0, -1.7], [1.0, -1.7]]) { const p = pivot(r, x, -1.0, z); sbox(m, p, 0.45, 1.2, 0.45, 0, -0.6, 0, 'dr_leg', scl(B1, B2), { ppb: 8 }); sbox(m, p, 0.6, 0.2, 0.8, 0, -1.2, 0.2, 'dr_foot', fur([30, 22, 38], 5, { extra: (f, set, fw) => { if (f === 'front') for (let x = 0; x < fw; x += 2) set(x, 1, [220, 210, 230]); } })); p.rotation.x = 0.9; this.legs.push(p); }
    this.tail = []; for (let i = 0; i < 12; i++) { const sz = 1.0 - i * 0.06; const g = new THREE.Group(); sbox(m, g, sz, sz, 1.1, 0, 0, 0, 'dr_tail' + i, scl(B1, B2, { belly: BEL }), { ppb: 8 }); part(m, g, 0.18, 0.4 * sz, 0.4, 0, sz * 0.55, 0, RIDGE, true); scene.add(g); this.tail.push(g); }
  }
  worldPt(x, y, z) { return this.root.localToWorld(new V3(x, y, z)); }
  calcSpheres() { this.root.updateMatrixWorld(true); this.spheres = [[this.worldPt(0, 0, 0), 2.6], [this.worldPt(0, 1.6, 7.6), 1.6], [this.worldPt(0, 0.8, 4.6), 1.3], [this.worldPt(0, 0, -3.2), 1.5]]; this.headPos = this.spheres[1][0]; }
  rayTest(o, d) { let best = -1; for (const [c, r] of this.spheres) { const oc = o.clone().sub(c); const b = oc.dot(d); const cc = oc.lengthSq() - r * r; const disc = b * b - cc; if (disc < 0) continue; const t = -b - Math.sqrt(disc); if (t >= 0 && (best < 0 || t < best)) best = t; } return best; }
  hitPoint(p) { for (const [c, r] of this.spheres) if (c.distanceToSquared(p) < r * r) return true; return false; }
  hurt(dmg, src, kb, force) {
    if (this.dying || this.dead) return; if (!force && this.hurtCD > 0) return; this.hurtCD = 0.25;
    this.hp -= dmg; this.hurtT = 0.3; if (Math.random() < 0.4) Sfx.play('roar', 0.6);
    if (this.hp <= 0) { this.hp = 0; this.dying = true; this.dyingT = 0; Sfx.play('roar', 1.5); show('bossbar', true); }
  }
  update(dt) {
    const P = G.player; this.age += dt; this.hurtT = Math.max(0, this.hurtT - dt); this.hurtCD -= dt; this.contactCD -= dt;
    const fy = world.gen.fountainY();
    if (this.dying) {
      this.dyingT += dt; this.pos.y += dt * 2.2; this.root.rotation.y += dt * 1.2; this.vel.set(0, 0, 0);
      for (let i = 0; i < 6; i++) { const a = Math.random() * 6.28, b = Math.random() * 3.14 - 1.57; Particles.emit(this.pos.x + Math.cos(a) * Math.cos(b) * 3, this.pos.y + Math.sin(b) * 3, this.pos.z + Math.sin(a) * Math.cos(b) * 3, 1, [[1, 0.9, 1], [0.8, 0.4, 1], [0.5, 0.1, 0.8]], 8, 1.2, 0, 0.5); }
      if (Math.random() < dt * 3) explodeFx(this.pos.x + (Math.random() - 0.5) * 6, this.pos.y + (Math.random() - 0.5) * 3, this.pos.z + (Math.random() - 0.5) * 6);
      this.root.position.copy(this.pos); this.animate(dt, 1); this.colorize(); this.updateBar();
      if (this.dyingT > 6) { this.dead = true; this.gone = true; EndFight.victory(); }
      return;
    }
    let healer = null, hd = 70; for (const c of EndFight.crystals) { if (c.dead) continue; const d = c.pos.distanceTo(this.pos); if (d < hd) { hd = d; healer = c; } } this.healer = healer;
    if (healer && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + dt * 1.2);
    const active = G.mode === 'survival' && !P.dead; const pe = P.eye(); const dist = this.pos.distanceTo(pe);
    let tgt, speed = 15, turn = 1.6;
    this.stateT -= dt;
    switch (this.state) {
      case 'circle': this.ang += dt * 0.3 * this.dirSign; tgt = new V3(Math.cos(this.ang) * 50, fy + 24 + Math.sin(this.age * 0.6) * 6, Math.sin(this.ang) * 50);
        if (this.stateT <= 0) { if (!active) { this.stateT = 6; break; } const q = Math.random(); if (q < 0.4) { this.state = 'strafe'; this.stateT = 10; this.shots = 0; } else if (q < 0.72) { this.state = 'charge'; this.stateT = 7; Sfx.play('roar', 1); } else { this.state = 'perch'; this.stateT = 18; this.perchT = 0; } if (Math.random() < 0.3) this.dirSign *= -1; } break;
      case 'strafe': { const away = new V3(P.pos.x, 0, P.pos.z).normalize(); if (!isFinite(away.x)) away.set(1, 0, 0); tgt = new V3(P.pos.x + away.x * 22, P.pos.y + 14, P.pos.z + away.z * 22); speed = 17; this.shootCD -= dt;
        if (dist < 60 && this.shootCD <= 0 && this.headPos && lineOfSight(this.headPos, pe)) { this.shootCD = 2.0; this.shots++; fireAt('breath', this.headPos.clone(), pe, 20, 'mob', 5, this); Sfx.play('roar', 0.6); this.jawT = 0.5; }
        if (this.shots >= 3 || this.stateT <= 0 || !active) { this.state = 'circle'; this.stateT = 8 + Math.random() * 6; } break; }
      case 'charge': tgt = pe.clone(); speed = 26; turn = 3;
        if (this.headPos && this.headPos.distanceTo(pe) < 4.5) { P.hurtCD = 0; P.hurt(10, this.pos, 'the Shadow Dragon', 3); this.state = 'circle'; this.stateT = 9; }
        if (this.stateT <= 0 || !active) { this.state = 'circle'; this.stateT = 8; } break;
      case 'perch': { const pp = new V3(0, fy + 6, 0); const d = this.pos.distanceTo(pp);
        if (d > 3 && this.perchT === 0) { tgt = pp; speed = Math.max(6, Math.min(16, d)); }
        else { this.perchT += dt; tgt = pp; speed = 0; this.vel.multiplyScalar(Math.exp(-dt * 3)); const want = Math.atan2(P.pos.x - this.pos.x, P.pos.z - this.pos.z); let df = want - this.yaw; while (df > Math.PI) df -= Math.PI * 2; while (df < -Math.PI) df += Math.PI * 2; this.yaw += df * Math.min(1, dt * 2);
          this.shootCD -= dt; if (this.shootCD <= 0 && active && dist < 30) { this.shootCD = 2.4; const f = new V3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); const at = new V3(this.pos.x + f.x * 9, fy, this.pos.z + f.z * 9); spawnBreathCloud(at.x, fy + 3, at.z); this.jawT = 1; Sfx.play('roar', 0.8); for (let i = 0; i < 30; i++) Particles.emit(this.headPos.x, this.headPos.y, this.headPos.z, 1, [[0.7, 0.2, 1], [0.4, 0.1, 0.7]], 5, 0.8, 4, 0.5); }
          if (this.perchT > 8 || !active) { this.state = 'circle'; this.stateT = 10; this.perchT = 0; } } break; }
    }
    if (tgt) {
      const want = tgt.clone().sub(this.pos); const L = want.length(); if (L > 0.01) want.multiplyScalar(speed / L);
      const k = Math.min(1, dt * turn); this.vel.lerp(want, k);
    }
    this.pos.addScaledVector(this.vel, dt);
    if (this.pos.y < fy + 3) { this.pos.y = fy + 3; this.vel.y = Math.max(0, this.vel.y); }
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (hs > 0.8 && !(this.state === 'perch' && this.perchT > 0)) { const want = Math.atan2(this.vel.x, this.vel.z); let df = want - this.yaw; while (df > Math.PI) df -= Math.PI * 2; while (df < -Math.PI) df += Math.PI * 2; this.yaw += df * Math.min(1, dt * 3); }
    this.pitch += (clamp(-Math.atan2(this.vel.y, hs + 0.01), -0.6, 0.6) - this.pitch) * Math.min(1, dt * 3);
    this.root.position.copy(this.pos); this.root.rotation.set(this.pitch, this.yaw, 0);
    this.calcSpheres();
    if (active && this.contactCD <= 0 && this.state !== 'charge') { for (const [c, r] of this.spheres) if (c.distanceTo(new V3(P.pos.x, P.pos.y + 0.9, P.pos.z)) < r + 0.8) { this.contactCD = 1.2; P.hurtCD = 0; P.hurt(5, c, 'the Shadow Dragon', 2.2); break; } }
    if (Math.random() < dt * 12) { const p = this.spheres[0][0]; Particles.emit(p.x + (Math.random() - 0.5) * 3, p.y, p.z + (Math.random() - 0.5) * 3, 1, [[0.35, 0.1, 0.55], [0.1, 0.05, 0.15]], 1, 1.2, -0.5, 1); }
    this.roarT -= dt; if (this.roarT <= 0) { this.roarT = 8 + Math.random() * 10; Sfx.play('roar', Math.max(0.2, 1 - dist / 90)); }
    this.animate(dt, this.state === 'perch' && this.perchT > 0 ? 0.4 : 1); this.colorize(); this.updateBar();
  }
  animate(dt, flapK) {
    const f = Math.sin(this.age * 3.2) * flapK;
    for (const [w, tip, s] of this.wings) { w.rotation.z = s * (f * 0.55 + 0.05); tip.rotation.z = s * (Math.sin(this.age * 3.2 - 0.8) * 0.45 * flapK - 0.1); }
    this.jawT = Math.max(0, (this.jawT || 0) - dt); this.jaw.rotation.x = this.jawT > 0 ? 0.5 : 0.08 + Math.sin(this.age * 2) * 0.05;
    for (let i = 0; i < this.neck.length; i++) this.neck[i].position.y = 0.35 + i * 0.32 + Math.sin(this.age * 2 - i * 0.6) * 0.12;
    this.head.position.y = 1.6 + Math.sin(this.age * 2 - 2.4) * 0.15;
    // tail follows the path of the tail root
    this.root.updateMatrixWorld(true); const anchor = this.worldPt(0, 0, -2.8);
    this.hist.unshift(anchor); if (this.hist.length > 80) this.hist.length = 80;
    let acc = 0, idx = 0; const seg = 1.0;
    let prev = anchor;
    for (let i = 0; i < this.tail.length; i++) {
      let want = (i + 1) * seg; let p = prev;
      while (idx < this.hist.length - 1) { const d = this.hist[idx].distanceTo(this.hist[idx + 1]); if (acc + d >= want) { const t = (want - acc) / (d || 1); p = this.hist[idx].clone().lerp(this.hist[idx + 1], t); break; } acc += d; idx++; }
      if (idx >= this.hist.length - 1) p = this.worldPt(0, Math.sin(this.age * 2 + i) * 0.1, -2.8 - (i + 1) * seg);
      const g = this.tail[i]; g.position.copy(p); g.lookAt(prev); prev = p;
    }
  }
  colorize() { for (const [m, base, glow] of this.mats) { m.color.copy(base); if (this.hurtT > 0 && !glow) m.color.lerp(RED, 0.5); } }
  updateBar() { $('bossfill').style.width = Math.max(0, this.hp / this.maxHp * 100) + '%'; }
  remove() { scene.remove(this.root); for (const g of this.tail) scene.remove(g); for (const [m] of this.mats) m.dispose(); }
}
function explodeFx(x, y, z) { Particles.emit(x, y, z, 30, [[1, 0.9, 0.6], [0.8, 0.4, 1]], 8, 0.5, 0, 1); Sfx.play('boom', 0.5); }
const EndFight = {
  dragon: null, crystals: [],
  enter() {
    this.crystals = []; this.dragon = null;
    if (S.dragonDead) { this.openExit(); show('bossbar', false); return; }
    for (const p of world.gen.pillars) if (!S.crystalsGone.includes(p.i)) { const c = new Crystal(p); this.crystals.push(c); G.mobs.push(c); }
    this.dragon = new Dragon(S.dragonHp || 200); G.mobs.push(this.dragon); show('bossbar', true); $('bossname').textContent = 'Shadow Dragon';
  },
  update(dt) { if (world.dim !== 'end') { show('bossbar', false); return; } this.crystals = this.crystals.filter(c => !c.gone); if (this.dragon && this.dragon.gone) this.dragon = null; },
  openExit() { const fy = world.gen.fountainY(); for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) { const d2 = dx * dx + dz * dz; if (d2 <= 6 && (dx || dz)) world.set(dx, fy, dz, B.END_PORTAL); } if (world.get(0, fy + 4, 0) !== B.DRAGON_EGG && !S.eggTaken) world.set(0, fy + 4, 0, B.DRAGON_EGG); },
  victory() {
    S.dragonDead = true; S.dragonHp = 0; this.dragon = null; this.openExit(); show('bossbar', false);
    toast('The Shadow Dragon has been defeated! The exit portal is open.', 8); Sfx.play('levelup', 1.2);
    const fy = world.gen.fountainY(); Particles.emit(0.5, fy + 2, 0.5, 120, [[0.9, 0.6, 1], [1, 1, 1], [0.4, 0.9, 0.7]], 10, 2, 2, 3);
    saveGame(false);
  },
};

Object.assign(window.__game, { EndFight, Dim, tryLightPortal, checkEndPortal, Dragon, Crystal });

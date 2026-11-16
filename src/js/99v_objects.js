// ================= MORE OF THE OWNER'S MODELS: minecarts, end crystals, the Ender Dragon, evoker fangs,
// the enchanting table book, XP orbs and the fishing hook (models baked as '@name' in PAINT_BAKED.models) =================
const BB_HIDE_MAT = new THREE.MeshBasicMaterial({ visible: false });
// lift a part out of its model and hang it on one of the game's own joints, at the joint, at a given size
function bbPut(part, host, sc) { if (!part || !host) return; if (part.parent) part.parent.remove(part); part.position.set(0, 0, 0); part.scale.setScalar(sc); host.add(part); }
// where a part's boxes sit around its own joint (to centre it)
function bbCenterOf(part) { const p = part.parent; if (p) p.remove(part); const pos = part.position.clone(), sc = part.scale.clone(); part.position.set(0, 0, 0); part.scale.set(1, 1, 1); part.updateMatrixWorld(true);
  const b = new THREE.Box3(); part.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingBox(); b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } }); part.position.copy(pos); part.scale.copy(sc); if (p) p.add(part); return b.getCenter(new THREE.Vector3()); }
// per-frame jobs for these things ride on the projectile update (it runs every frame)
const BB_TICKS = [];
if (typeof updateProjectiles !== 'undefined') { const _up = updateProjectiles; updateProjectiles = function (dt) { for (let i = BB_TICKS.length - 1; i >= 0; i--) { try { if (BB_TICKS[i](dt) === false) BB_TICKS.splice(i, 1); } catch (e) { BB_TICKS.splice(i, 1); } } return _up.apply(this, arguments); }; }

// ---------- minecarts (and the chest riding in a chest minecart) ----------
if (typeof cartMesh !== 'undefined' && BB_MODELS['@minecart']) { const _cm = cartMesh; cartMesh = function (chest) {
  const g = _cm.apply(this, arguments); try {
    g.traverse(o => { if (o.isMesh) o.visible = false; });
    const o = bbObject('@minecart'); o.root.rotation.y = Math.PI / 2; o.root.position.y = 0.05; g.add(o.root);
    if (chest && BB_MODELS['@chest_normal']) { const c = bbObject('@chest_normal'); c.root.scale.setScalar(0.75); c.root.rotation.x = Math.PI; c.root.position.y = 0.95; g.add(c.root); }
    g.userData.mats = (g.userData.mats || []).concat(o.m.mats);
  } catch (e) { g.traverse(o => { if (o.isMesh) o.visible = true; }); } return g; }; }

// ---------- end crystals: the cube spinning inside two glass frames ----------
if (typeof Crystal !== 'undefined' && BB_MODELS['@end_crystal']) { const _cu = Crystal.prototype.update; Crystal.prototype.update = function (dt) {
  if (!this.bbDone) { this.bbDone = true; try { const o = bbObject('@end_crystal'); const P = o.parts;
    for (const old of [this.core, this.f1, this.f2]) old.visible = false;
    // game sizes: core 0.55, inner frame 1, outer frame 1.35 (model cubes are 8 px)
    const take = (p, s) => { bbPut(p, this.root, s); return p; };
    if (P.cube && P.inner_glass && P.outer_glass) { this.core = take(P.cube, 1.1); this.f1 = take(P.inner_glass, 2); this.f2 = take(P.outer_glass, 2.7); }
  } catch (e) { } }
  return _cu.apply(this, arguments); }; }

// ---------- the Ender Dragon: the owner's dragon parts hung on the game's flying skeleton (about 1.35x Minecraft size) ----------
if (typeof Dragon !== 'undefined' && BB_MODELS['@dragon']) {
  const _db = Dragon.prototype.build; Dragon.prototype.build = function () { _db.apply(this, arguments); try { bbDragon(this); } catch (e) { console.warn('dragon model', e); } };
  const _du = Dragon.prototype.update; Dragon.prototype.update = function (dt) { if (this.bbBase && this.dyingT > 0 && !this.bbDying) { this.bbDying = true; this.bbBase.map = bbSkinTex('@dragon', BB_MODELS['@dragon'], 'exploding'); this.bbBase.needsUpdate = true; } return _du.apply(this, arguments); };
}
function bbDragon(d) {
  const S = 1.35, SW = 1.86; const hide = (root) => root.traverse(x => { if (x.isMesh) x.material = BB_HIDE_MAT; });
  hide(d.root); for (const t of d.tail) hide(t);
  const o = bbObject('@dragon'); const P = o.parts; d.bbBase = o.m.bbBase; for (const e of o.m.mats) d.mats.push(e);
  // legs carry their shins and feet
  for (const side of ['left', 'right']) for (const end of ['front', 'back']) { const leg = P[end + '_' + side + '_leg']; for (const k of ['shin', 'foot']) { const q = P[end + '_' + side + '_' + k]; if (leg && q) leg.userData.inner.attach(q); } }
  // body, centred on the game's body
  if (P.body) { const c = bbCenterOf(P.body); bbPut(P.body, d.root, S); P.body.position.copy(c.multiplyScalar(-S)); }
  // head with its horns; the jaw goes on the game's jaw so it still opens
  if (P.jaw) bbPut(P.jaw, d.jaw || d.head, S); if (P.head) bbPut(P.head, d.head, S);
  for (let i = 0; i < d.neck.length; i++) bbPut(P['neck' + (i + 1)], d.neck[i], S);
  for (let i = 0; i < d.tail.length; i++) { const t = P['tail' + (i + 1)]; if (t) bbPut(t, d.tail[i], S); }
  // wings: Minecraft's left wing is the game's +x wing; tips ride the game's wing tips
  for (const [w, tip, s] of d.wings) { const nm = s > 0 ? 'left' : 'right'; bbPut(P[nm + '_wing_tip'], tip, SW); bbPut(P[nm + '_wing'], w, SW); }
  const L = d.legs || []; const map = [['front_right_leg', 0], ['front_left_leg', 1], ['back_right_leg', 2], ['back_left_leg', 3]];
  for (const [n, i] of map) if (L[i]) bbPut(P[n], L[i], S);
}

// ---------- evoker fangs: a pair of jaws snaps up out of the ground where the fang strikes ----------
if (typeof evokerFang !== 'undefined' && BB_MODELS['@evoker_fangs']) { const _ef = evokerFang; evokerFang = function (x, y, z) {
  const r = _ef.apply(this, arguments); try {
    let yy = Math.floor(y); for (let k = 0; k < 4 && !world.solid(Math.floor(x), yy - 1, Math.floor(z)); k++) yy--; for (let k = 0; k < 4 && world.solid(Math.floor(x), yy, Math.floor(z)); k++) yy++;
    const o = bbObject('@evoker_fangs'); const g = new THREE.Group(); g.add(o.root); g.position.set(x, yy, z); g.rotation.y = Math.random() * Math.PI * 2; G.scene.add(g);
    const up = o.parts.upper_jaw, lo = o.parts.lower_jaw; let t = 0;
    BB_TICKS.push((dt) => { t += dt; const rise = Math.min(1, t / 0.2), sink = t > 0.9 ? Math.min(1, (t - 0.9) / 0.3) : 0; o.root.position.y = -0.9 * (1 - rise) - 0.9 * sink;
      const bite = t < 0.5 ? Math.sin(Math.min(1, t / 0.5) * Math.PI) : 0; if (up) up.rotation.x = -bite * 0.9; if (lo) lo.rotation.x = bite * 0.9;
      if (t > 1.25) { G.scene.remove(g); return false; } });
  } catch (e) { } return r; }; }

// ---------- XP orbs: the owner's orb sheet (4x4 sizes), pulsing green-yellow like Minecraft ----------
if (typeof spawnOrb !== 'undefined' && BB_MODELS['@xp_orb']) {
  const base = new THREE.TextureLoader().load(BB_MODELS['@xp_orb'].texture); base.magFilter = base.minFilter = THREE.NearestFilter;
  const mats = []; for (let i = 0; i < 11; i++) { const t = base.clone(); t.needsUpdate = true; t.repeat.set(0.25, 0.25); t.offset.set((i % 4) * 0.25, 1 - 0.25 - Math.floor(i / 4) * 0.25); mats.push(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: true })); }
  const SIZES = [2477, 1237, 617, 307, 149, 73, 37, 17, 7, 3, 1];
  const _so = spawnOrb; spawnOrb = function () { const n0 = G.orbs.length; const r = _so.apply(this, arguments); for (let i = n0; i < G.orbs.length; i++) { const o = G.orbs[i]; const k = SIZES.findIndex(s => o.value >= s); const icon = k < 0 ? 0 : 10 - k; o.mesh.material = mats[icon]; } return r; };
  let t = 0; BB_TICKS.push((dt) => { t += dt * 3; const red = (Math.sin(t) + 1) * 0.5; for (const m of mats) m.color.setRGB(0.3 + red * 0.7, 1, 0.1); });
}

// ---------- fishing hook: the owner's 8x8 hook, always facing you ----------
if (typeof castBobber !== 'undefined' && BB_MODELS['@fishing_hook']) {
  const tex = new THREE.TextureLoader().load(BB_MODELS['@fishing_hook'].texture); tex.magFilter = tex.minFilter = THREE.NearestFilter; const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.1 });
  const _cb = castBobber; castBobber = function () { const r = _cb.apply(this, arguments); try { if (bobber && bobber.mesh) { bobber.mesh.traverse(o => { if (o.isMesh) o.visible = false; }); const sp = new THREE.Sprite(mat); sp.scale.setScalar(0.3); sp.position.y = 0.05; bobber.mesh.add(sp); } } catch (e) { } return r; };
}

// ---------- enchanting tables get their floating book, turning to face you ----------
if (BB_MODELS['@ench_book']) {
  const books = new Map();
  BB_TICKS.push((dt) => {
    if (!world || !player || !S.started) return; const want = new Set();
    const A = typeof AmbientFX !== 'undefined' ? AmbientFX : null; if (A && A.emit && A.kind) for (const [key, id] of A.emit) if (A.kind[id] === 1) want.add(key);
    for (const [key, b] of books) if (!want.has(key) || world.dim !== b.dim) { G.scene.remove(b.g); books.delete(key); }
    for (const key of want) { let b = books.get(key); const [x, y, z] = key.split(',').map(Number);
      if (!b) { const o = bbObject('@ench_book'); const g = new THREE.Group(); const tilt = new THREE.Group(); tilt.rotation.z = -1.35; tilt.add(o.root); o.root.scale.setScalar(1); g.add(tilt); g.position.set(x + 0.5, y + 1.1, z + 0.5); G.scene.add(g);
        b = { g, t: Math.random() * 6, dim: world.dim, yaw: 0 }; books.set(key, b); }
      b.t += dt; b.g.position.y = y + 1.12 + Math.sin(b.t * 1.6) * 0.06;
      const want = Math.atan2(player.pos.x - (x + 0.5), player.pos.z - (z + 0.5)) + Math.PI / 2; let dd = want - b.yaw; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); b.yaw += dd * Math.min(1, dt * 3); b.g.rotation.y = b.yaw; }
  });
}

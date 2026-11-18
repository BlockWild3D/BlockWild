// ================= RENDER LAYERS from Minecraft Java that the game didn't have yet =================
// Charged creeper (CreeperPowerLayer / EnergySwirlLayer): a second copy of the creeper, 2 pixels bigger on every side,
// drawn additively at half brightness with a blue swirl texture that scrolls 0.01 of the texture per tick in both
// directions. (Lightning used to just tint the creeper blue.)
// Arrows stuck in you (ArrowLayer / StuckInBodyLayer, seen in third person): each arrow that hits you stays in a random
// spot inside a random body part, pointing a random way; one falls out every (30 - number stuck) seconds.

// ---------- charged creeper swirl ----------
const SWIRL_TEX = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 32; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 64, 32); const r = mulberry32(4242);
  for (let i = 0; i < 12; i++) { const y0 = r() * 48 - 8, w = 1 + r() * 1.5, b = 150 + r() * 105; x.strokeStyle = `rgb(${b * 0.3 | 0},${b * 0.65 | 0},${b | 0})`; x.lineWidth = w;
    x.beginPath(); for (let k = -1; k <= 2; k++) { x.moveTo(-8 + k * 0, y0 - 8 + k * 32); x.lineTo(72, y0 + 24 + k * 32); } x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; return t; })();
const SWIRL_MAT = new THREE.MeshBasicMaterial({ map: SWIRL_TEX, color: new THREE.Color(0.5, 0.5, 0.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
function swirlAttach(m) {
  const add = []; m.root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(m.root.matrixWorld).invert(); const rel = new THREE.Matrix4();
  m.root.traverse(o => { if (!o.isMesh || o.userData.swirl || o.userData.hasSwirl || !o.geometry || !o.visible) return; add.push(o); });
  for (const o of add) {
    const g = o.geometry; g.computeBoundingBox(); const bb = g.boundingBox; const sz = new V3(); bb.getSize(sz); const c = new V3(); bb.getCenter(c);
    const k = rel.multiplyMatrices(inv, o.matrixWorld).getMaxScaleOnAxis() || 1; const inf = 2 / 16 / k; // 2 pixels on every side, in the mesh's own units
    const s = new V3(sz.x > 1e-4 ? (sz.x + inf * 2) / sz.x : 1, sz.y > 1e-4 ? (sz.y + inf * 2) / sz.y : 1, sz.z > 1e-4 ? (sz.z + inf * 2) / sz.z : 1);
    const sw = new THREE.Mesh(g, SWIRL_MAT); sw.scale.copy(s); sw.position.set(c.x * (1 - s.x), c.y * (1 - s.y), c.z * (1 - s.z)); sw.userData.swirl = true; sw.renderOrder = 2;
    o.add(sw); o.userData.hasSwirl = true;
  }
}
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) { const r = _u.apply(this, arguments);
    if (this.charged && this.root && !this.dead) { this.swirlChk = (this.swirlChk || 0) - dt; if (this.swirlChk <= 0) { this.swirlChk = 1; swirlAttach(this); } }
    return r; }; }
{ let t0 = performance.now(); const _ub = updateBoats; updateBoats = function (dt) { const r = _ub.apply(this, arguments); const t = (performance.now() - t0) / 50; SWIRL_TEX.offset.set((t * 0.01) % 1, (t * 0.01) % 1); return r; }; }

// ---------- arrows stuck in you ----------
function stuckArrowMesh() {
  const g = new THREE.Group(); const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.5), new THREE.MeshLambertMaterial({ color: 0x6b5232 }));
  shaft.position.z = -0.25; g.add(shaft);
  const fl = new THREE.MeshLambertMaterial({ color: 0xe8e8e8, side: THREE.DoubleSide });
  for (const rz of [0, Math.PI / 2]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.14), fl); f.rotation.set(0, Math.PI / 2, rz); f.position.z = -0.42; g.add(f); }
  g.traverse(o => { if (o.layers) o.layers.enable(1); }); return g;
}
// a part's box, in pixels, relative to its pivot (see makePlayerModel)
const STUCK_PARTS = [['head', [-4, 0, -4], [4, 8, 4]], ['torso', [-4, 0, -2], [4, 12, 2]], ['armR', [-2, -10, -2], [2, 2, 2]], ['armL', [-2, -10, -2], [2, 2, 2]], ['legR', [-2, -12, -2], [2, 0, 2]], ['legL', [-2, -12, -2], [2, 0, 2]]];
function placeStuckArrows(model, n) {
  const A = model.stuck || (model.stuck = []);
  while (A.length < n) {
    const r = mulberry32(9001 + A.length * 7919); const pt = STUCK_PARTS[Math.floor(r() * STUCK_PARTS.length)]; const P = model.P[pt[0]]; if (!P) break;
    const a = stuckArrowMesh(); const lo = pt[1], hi = pt[2];
    a.position.set((lo[0] + (hi[0] - lo[0]) * r()) * PX, (lo[1] + (hi[1] - lo[1]) * r()) * PX, (lo[2] + (hi[2] - lo[2]) * r()) * PX);
    const dx = -(r() * 2 - 1), dy = -(r() * 2 - 1), dz = -(r() * 2 - 1); a.lookAt(a.position.x + dx, a.position.y + dy, a.position.z + dz); a.rotateY(Math.PI); // the shaft sticks out the back
    P.add(a); A.push(a);
  }
  A.forEach((a, i) => { a.visible = i < n; });
}
{ const _h = Player.prototype.hurt; Player.prototype.hurt = function (dmg, src, cause) { const h0 = this.health; const r = _h.apply(this, arguments);
    if (cause === 'an arrow' && this.health < h0) this.arrowsIn = Math.min(30, (this.arrowsIn || 0) + 1); return r; }; }
{ const _ap = applyPov; applyPov = function (P, dt) {
    const n = P.dead ? 0 : (P.arrowsIn || 0);
    if (n > 0) { P.arrowT = (P.arrowT == null || P.arrowT <= 0 ? 30 - n : P.arrowT) - dt; if (P.arrowT <= 0) { P.arrowsIn = n - 1; P.arrowT = null; } }
    const r = _ap.apply(this, arguments); if (typeof myModel !== 'undefined' && myModel) placeStuckArrows(myModel, P.arrowsIn || 0); return r; }; }

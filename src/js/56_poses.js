// ================= PLAYER POSES: SWIMMING, ELYTRA FLYING, ELYTRA WINGS =================
// Swimming: the body lies along the way you look, centred on the 0.6-block swimming hitbox, head up to see ahead,
// arms doing a front crawl and legs fluttering. Treading water upright: arms paddle at the sides.
// Elytra: wings on your back (folded when walking, spread when gliding); gliding lays the body along your view with
// the arms back along your sides. Other players see all of this too.
const ELYTRA_MAT = new THREE.MeshLambertMaterial({ color: 0x8e86a6 });
function ensureWings(model) {
  if (model.wings) return model.wings; const PXs = PX; const mk = (s) => { const g = new THREE.Group(); g.position.set(s * 4 * PXs, 24 * PXs, 2.6 * PXs);
    const m = new THREE.Mesh(new THREE.BoxGeometry(10 * PXs, 20 * PXs, 1.2 * PXs), ELYTRA_MAT); m.position.set(s * 5 * PXs, -10 * PXs, 0); g.add(m);
    const e = new THREE.Mesh(new THREE.BoxGeometry(1.4 * PXs, 20 * PXs, 1.6 * PXs), new THREE.MeshLambertMaterial({ color: 0x5c5470 })); e.position.set(s * 10 * PXs, -10 * PXs, 0); g.add(e);
    for (const o of [m, e]) o.layers.enable(1); model.body.add(g); return g; };
  model.wings = [mk(-1), mk(1)]; return model.wings;
}
swimPose = function (model, P, dt) {
  const P2 = model.P; const t = performance.now() / 1000; const inW = P.pos && inWater(P, 0.5);
  const lay = P.swimming ? 1 : P.gliding ? 1 : 0; model.swimK = (model.swimK || 0) + (lay - (model.swimK || 0)) * Math.min(1, dt * 8); const k = model.swimK;
  const hasEly = P === player ? !!(player.inv[38] && player.inv[38].id === IT.elytra) : !!P.chestElytra;
  // elytra wings on the back
  if (hasEly || model.wings) { const W = ensureWings(model); for (const w of W) w.visible = hasEly; if (hasEly) { const spread = P.gliding ? 1 : 0; model.wingK = (model.wingK || 0) + (spread - (model.wingK || 0)) * Math.min(1, dt * 6); const s = model.wingK;
      W[0].rotation.set(0.25 + s * 0.25, 0, 0.26 + s * 0.75); W[1].rotation.set(0.25 + s * 0.25, 0, -(0.26 + s * 0.75)); ELYTRA_MAT.color.setRGB(0.56, 0.53, 0.65).multiplyScalar(model.mat.color.g); } }
  if (k < 0.01) { if (inW) { const s = Math.sin(t * 4); P2.armR.rotation.z = 0.5 + s * 0.4; P2.armL.rotation.z = -0.5 - s * 0.4; P2.legR.rotation.x = Math.sin(t * 5) * 0.3; P2.legL.rotation.x = -Math.sin(t * 5) * 0.3; } else { P2.armR.rotation.z = 0; P2.armL.rotation.z = 0; } return; }
  // lie along the view direction, centred on the hitbox
  const look = (P.pitch || 0); const ang = -(Math.PI / 2 - look * (P.gliding ? 1 : 0.6)) * k; model.body.rotation.set(ang, 0, 0);
  const c = new THREE.Vector3(0, 0.9, 0).applyEuler(new THREE.Euler(ang, 0, 0)); const cy = (P.gliding ? 0.3 : 0.3) * k + 0.9 * (1 - k); model.body.position.set(0, cy - c.y, -c.z);
  P2.head.rotation.x = (Math.PI / 2 - 0.25) * k * (P.gliding ? 0.9 : 1) - look * (1 - k);
  if (P.gliding) { P2.armR.rotation.set(0, 0, 0.18 * k); P2.armL.rotation.set(0, 0, -0.18 * k); P2.legR.rotation.set(0, 0, 0.05); P2.legL.rotation.set(0, 0, -0.05); }
  else { const s = t * 5; P2.armR.rotation.set(-Math.PI * 0.5 + Math.sin(s) * 1.4, 0, 0.25); P2.armL.rotation.set(-Math.PI * 0.5 - Math.sin(s) * 1.4, 0, -0.25); P2.legR.rotation.set(Math.sin(t * 10) * 0.35, 0, 0); P2.legL.rotation.set(-Math.sin(t * 10) * 0.35, 0, 0); }
};
// first person: your eyes are low while swimming or gliding (Minecraft: 0.4 blocks)
{ const _u = updatePlayer; updatePlayer = function (dt) { const r = _u.apply(this, arguments); const P = player; if (P.gliding) P.eyeH = (P.eyeH || 1.62) + (0.4 - (P.eyeH || 1.62)) * Math.min(1, dt * 12); return r; }; }
{ const _e = Player.prototype.eye; Player.prototype.eye = function () { if (this.gliding) return new V3(this.pos.x, this.pos.y + (this.eyeH || 0.4), this.pos.z); return _e.call(this); }; }
// the elytra is not a chestplate on the model
{ const _am = armorMats; armorMats = function (inv) { const o = _am(inv); const s = inv && inv[38]; if (s && s.id === IT.elytra) o.chest = null; return o; }; }

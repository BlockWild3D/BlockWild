// ================= THIRD-PERSON HELD ITEMS AND ARM POSES (Minecraft) =================
// The player model held its item as a flat sprite that always faced the camera. Now, as in Minecraft:
// - the main-hand item is a real 3D item in the right hand: tools and swords stick forward out of the fist,
//   blocks are small cubes, other items are held flat;
// - the off-hand item (shield, totem, torch...) is in the left hand;
// - an arm holding something is raised a little ("holding" pose); blocking raises the shield in front of the chest;
// - the attack swing is Minecraft's: the body twists and the arm swings down across, and it repeats while mining.
const TP_TOOL = (id) => { const it = ITEMS[id]; return !!it && (it.kind === 'tool' || it.melee || it.kind === 'trident' || it.kind === 'bow' || it.kind === 'crossbow' || it.kind === 'fishing_rod' || it.key === 'stick' || it.key === 'blaze_rod' || it.key === 'breeze_rod' || /_spear$/.test(it.key)); };
const tpItemMat = new THREE.MeshBasicMaterial({ vertexColors: true }); // lit like the player model (by the light level), not by scene lights
function tpItemMesh(id, left) {
  const g = new THREE.Group();
  if (id === IT.shield) { const s = shieldMesh(); s.scale.setScalar(1.15); s.position.set(left ? 0.05 : -0.05, -0.02, 0.12); g.add(s); g.userData.shield = s; return g; }
  if (isCubeItem(id)) { const m = new THREE.Mesh(blockGeo(id), handMat); m.scale.setScalar(0.24); m.position.set(0, -0.06, 0.1); m.rotation.y = Math.PI / 4; g.add(m); return g; }
  const tool = TP_TOOL(id);
  const inner = new THREE.Group(); const mesh = flatItemMesh(id); mesh.material = tpItemMat; inner.add(mesh);
  // grip the icon near its lower-left corner (where tools have their handle)
  mesh.position.set(tool ? 0.15 : 0, tool ? 0.15 : 0, 0);
  // map the icon's diagonal (handle -> tip) onto "forward and a little up", with the icon standing on its edge
  const ed = new V3(1, 1, 0).normalize(), en = new V3(0, 0, 1), ep = new V3().crossVectors(en, ed);
  const F = (tool ? new V3(0, 0.3, 1) : new V3(0, 0.55, 1)).normalize(), N = new V3(left ? -1 : 1, 0, 0), NF = new V3().crossVectors(N, F);
  const A = new THREE.Matrix4().makeBasis(ed, ep, en), Bm = new THREE.Matrix4().makeBasis(F, NF, N);
  inner.quaternion.setFromRotationMatrix(Bm.multiply(A.transpose()));
  inner.scale.setScalar(tool ? 1.05 : 0.7); inner.position.set(0, -0.02, 0.04);
  g.add(inner); return g;
}
// third-person swings per tool: windup pose W and strike pose S as [arm x, arm y, arm z, body twist]; a/b = when the
// windup ends and the strike lands. Sword: a sideways slash across the body. Axe: raised high over the head and
// chopped down. Pickaxe: a shorter overhead pick. Shovel: a forward scoop. Hoe: raised and pulled down towards you.
// Mace: both arms up for a heavy slam. Trident/spear: drawn back and thrust forward.
const TP_SWINGS = {
  sword: { a: 0.22, b: 0.5, W: [-1.5, -0.9, -1.1, -0.3], S: [-1.3, 0.8, -1.1, 0.35] },
  axe: { a: 0.3, b: 0.55, W: [-2.9, 0.1, 0, -0.1], S: [-0.5, 0.2, 0, 0.15] },
  pick: { a: 0.25, b: 0.5, W: [-2.5, 0.15, -0.2, -0.1], S: [-0.6, 0.25, -0.2, 0.12] },
  shovel: { a: 0.22, b: 0.5, W: [-0.5, 0.1, 0, -0.1], S: [-1.7, 0.3, 0, 0.2] },
  hoe: { a: 0.28, b: 0.52, W: [-2.2, 0.1, 0, -0.1], S: [-0.3, 0.2, 0, 0.15] },
  mace: { a: 0.38, b: 0.6, W: [-3.0, 0, 0.1, -0.15], S: [-0.4, 0.25, 0, 0.25], L: [-2.6, -0.5, -0.6, -0.3] },
  thrust: { a: 0.22, b: 0.45, W: [-1.3, 0.05, 0, -0.15], S: [-1.5, 0.1, 0, 0.2], pz: [-2, 4] },
};
{ const _mk = makePlayerModel; makePlayerModel = function (skin, name) {
  const M = _mk(skin, name); const P = M.P; M.held.visible = false;
  const hand = new THREE.Group(); hand.position.set(0, -10 * PX, 0); P.armR.add(hand);
  const off = new THREE.Group(); off.position.set(0, -10 * PX, 0); P.armL.add(off);
  for (const g of [hand, off]) g.traverse(o => o.layers && o.layers.enable(1));
  M.mainId = 0; M.offId = 0;
  const fill = (grp, id, left) => { while (grp.children.length) grp.remove(grp.children[0]); if (!id || !ITEMS[id]) return null; const m = tpItemMesh(id, left); m.traverse(o => o.layers && o.layers.enable(1)); grp.add(m); return m; };
  M.setHeld = function (id) { id = id || 0; if (id === this.mainId) return; this.mainId = id; this.mainMesh = fill(hand, id, false); };
  M.setOff = function (id) { id = id || 0; if (id === this.offId) return; this.offId = id; this.offMesh = fill(off, id, true); };
  const _an = M.animate.bind(M);
  M.animate = function (dt, speed, pitch, swing, sneak, hurt, o = {}) {
    _an(dt, speed, pitch, 0, sneak, hurt);
    const B = M.body; B.position.y = 0; B.rotation.x = 0;
    // Minecraft's crouch: the torso leans 0.5 rad forward from the neck, the neck, shoulders and head drop, the hips go
    // back and the legs stay upright under them, the arms come forward with the torso
    const k = (this.sneakK = (this.sneakK || 0) + ((sneak ? 1 : 0) - (this.sneakK || 0)) * Math.min(1, dt * 14));
    const lean = 0.5 * k, neckY = 24 - 3.2 * k;
    P.torso.rotation.x = lean; P.torso.position.set(0, (neckY - 12 * Math.cos(lean)) * PX, -12 * Math.sin(lean) * PX);
    P.legR.position.set(-2 * PX, 12 * PX, -4 * k * PX); P.legL.position.set(2 * PX, 12 * PX, -4 * k * PX);
    P.armR.position.set(-6 * PX, (22 - 3.2 * k) * PX, 0); P.armL.position.set(6 * PX, (22 - 3.2 * k) * PX, 0);
    P.head.position.set(0, (24 - 4.2 * k) * PX, 0);
    B.rotation.y = 0; P.armR.rotation.y = 0; P.armL.rotation.y = 0; P.armR.rotation.z = 0; P.armL.rotation.z = 0;
    if (this.mainId) P.armR.rotation.x = P.armR.rotation.x * 0.5 - Math.PI / 10;
    if (this.offId) P.armL.rotation.x = P.armL.rotation.x * 0.5 - Math.PI / 10;
    P.armR.rotation.x += 0.4 * k; P.armL.rotation.x += 0.4 * k;
    // blocking with a shield: that arm comes up and across, the shield stays upright in front of the chest
    const bl = o.blocking; const sh = (m) => m && m.userData && m.userData.shield;
    if (bl === 'off' || bl === 'main') { const arm = bl === 'off' ? P.armL : P.armR, mesh = bl === 'off' ? this.offMesh : this.mainMesh;
      const lift = 0.94 + clamp(pitch, -0.6, 0.6) * 0.5; arm.rotation.x = arm.rotation.x * 0.5 - lift; arm.rotation.y = (bl === 'off' ? -1 : 1) * Math.PI / 6;
      const s = sh(mesh); if (s) { arm.updateMatrix(); s.quaternion.copy(arm.quaternion).invert(); s.position.set(bl === 'off' ? -0.08 : 0.08, 0.02, 0.1); } } // upright, facing forward
    else { for (const [m, left] of [[this.mainMesh, false], [this.offMesh, true]]) { const s = sh(m); if (s) { s.rotation.set(0, 0, 0); s.position.set(left ? 0.05 : -0.05, -0.02, 0.12); } } }
    // the swing, by what's in the hand (attack time runs 0 -> 1). Tools each have their own move, the rest use
    // Minecraft's own (HumanoidModel.setupAttackAnimation)
    P.armR.position.z = 0;
    if (swing > 0) { const f = 1 - swing; const kind = typeof swingKind === 'function' ? swingKind(this.mainId) : 'item'; const A = TP_SWINGS[kind];
      if (A) { const [w, st] = phases(f, A.a, A.b), k = Math.min(1, w + st), mix = (cur, i) => cur * (1 - k) + A.W[i] * w + A.S[i] * st;
        P.armR.rotation.x = mix(P.armR.rotation.x, 0); P.armR.rotation.y = mix(P.armR.rotation.y, 1); P.armR.rotation.z = mix(P.armR.rotation.z, 2); B.rotation.y = mix(B.rotation.y, 3);
        if (A.L) { P.armL.rotation.x = P.armL.rotation.x * (1 - k) + A.L[0] * w + A.L[2] * st; P.armL.rotation.y = P.armL.rotation.y * (1 - k) + A.L[1] * w + A.L[3] * st; }
        if (A.pz) P.armR.position.z = (A.pz[0] * w + A.pz[1] * st) * PX; }
      else { const by = Math.sin(Math.sqrt(f) * Math.PI * 2) * 0.2; B.rotation.y = -by;
        P.armR.rotation.y -= by; P.armL.rotation.y -= by; P.armL.rotation.x += by;
        let e = 1 - f; e *= e; e *= e; e = 1 - e; const f2 = Math.sin(e * Math.PI), f3 = Math.sin(f * Math.PI) * -(-clamp(pitch, -1, 1) - 0.7) * 0.75;
        P.armR.rotation.x -= f2 * 1.2 + f3; P.armR.rotation.y -= by * 2; P.armR.rotation.z -= Math.sin(f * Math.PI) * -0.4; } }
  };
  return M; }; }
// feed the off-hand item and blocking state from the game to your own model in F5
{ const _ap = applyPov; applyPov = function (P, dt) {
    if (typeof myModel !== 'undefined' && myModel && myModel.setOff) { const oh = P.inv[36]; myModel.setOff(oh ? oh.id : 0);
      const _an = myModel.animate; const mainShield = P.inv[P.sel] && P.inv[P.sel].id === IT.shield;
      myModel.animate = function (dt2, sp, pitch, swing, sneak, hurt) { return _an.call(this, dt2, sp, pitch, swing, sneak, hurt, { blocking: P.blocking ? (mainShield ? 'main' : 'off') : null }); };
      tpItemMat.color.setScalar(clamp(Math.max(G.minLight || 0, world.lightAt(P.pos.x, P.pos.y + 1, P.pos.z, G.daylight)), 0.08, 1));
      try { return _ap.apply(this, arguments); } finally { myModel.animate = _an; } }
    return _ap.apply(this, arguments); }; }

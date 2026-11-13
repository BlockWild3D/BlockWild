// ================= PLAYER BODY LIKE MINECRAFT: SWIM AND GLIDE POSES, ARMOUR, ELYTRA, FIRST-PERSON ARM AND SHIELD =================
// Swimming and elytra flight lie the body FACE DOWN along the way you are going (Minecraft rotates the whole model by
// 90 degrees plus your view pitch), head lifted to look ahead; swimming does a front crawl, gliding holds the arms
// back along the sides with the legs slightly apart.
// Armour is drawn per piece like Minecraft's armour layer: the helmet covers the head with an open visor, the
// chestplate covers the torso and the whole of both arms, leggings cover the hips and legs, boots the feet; each
// material has its own trim, plates, rivets or chain links.
// The elytra is two real wing shapes (feathered, tapering, one pixel thick) folded on the back and spread in flight.
// First person: an empty hand shows your own skin's arm reaching in from the bottom right; the shield is large and in
// the lower corner, and comes up to cover the middle of the screen when you block.
// ---------- swim / glide ----------
swimPose = function (model, P, dt) {
  const P2 = model.P; const t = performance.now() / 1000; const inW = P.pos && inWater(P, 0.5);
  const lay = P.swimming || P.gliding ? 1 : 0; model.swimK = (model.swimK || 0) + (lay - (model.swimK || 0)) * Math.min(1, dt * 8); const k = model.swimK;
  const hasEly = P === player ? !!(player.inv[38] && player.inv[38].id === IT.elytra) : !!P.chestElytra;
  if (hasEly || model.wings) { const W = ensureWings(model); for (const w of W) w.visible = hasEly; if (hasEly) { const spread = P.gliding ? 1 : 0; model.wingK = (model.wingK || 0) + (spread - (model.wingK || 0)) * Math.min(1, dt * 6); const s = model.wingK;
      // Minecraft: folded wings hang at 15 degrees out, spread wings open to about 75 degrees and tilt back
      W[0].rotation.set(0.26 + s * 0.12, 0, -(0.26 + s * 0.95)); W[1].rotation.set(0.26 + s * 0.12, 0, 0.26 + s * 0.95); const l = model.mat.color.g; ELYTRA_MAT.color.setRGB(l, l, l); } }
  if (k < 0.01) { if (inW) { const s = Math.sin(t * 4); P2.armR.rotation.z = 0.5 + s * 0.4; P2.armL.rotation.z = -0.5 - s * 0.4; P2.legR.rotation.x = Math.sin(t * 5) * 0.3; P2.legL.rotation.x = -Math.sin(t * 5) * 0.3; } return; }
  // face down along the view: 90 degrees plus the pitch you look down at
  const look = clamp(P.pitch || 0, -1.4, 1.4); const ang = (Math.PI / 2 - look * (P.gliding ? 1 : 0.7)) * k;
  model.body.rotation.set(ang, 0, 0);
  const c = new THREE.Vector3(0, 0.9, 0).applyEuler(new THREE.Euler(ang, 0, 0)); const cy = 0.3 * k + 0.9 * (1 - k); model.body.position.set(0, cy - c.y, -c.z);
  // the head turns back up to look where you're going
  P2.head.rotation.set(-ang * (P.gliding ? 0.85 : 0.75) - look * (1 - k), 0, 0);
  if (P.gliding) { P2.armR.rotation.set(0.15 * k, 0, 0.3 * k); P2.armL.rotation.set(0.15 * k, 0, -0.3 * k); P2.legR.rotation.set(0, 0, 0.12 * k); P2.legL.rotation.set(0, 0, -0.12 * k); }
  else { // front crawl: each arm goes forward over the head, pulls down and back along the side
    const s = t * 4.5, a = (s % (Math.PI * 2)) / (Math.PI * 2), b = ((s + Math.PI) % (Math.PI * 2)) / (Math.PI * 2);
    const stroke = (u) => u < 0.5 ? -Math.PI + u * 2 * Math.PI * 0.95 : -0.05 * Math.PI - (u - 0.5) * 2 * Math.PI * 0.95;
    P2.armR.rotation.set(stroke(a), 0, 0.15); P2.armL.rotation.set(stroke(b), 0, -0.15);
    P2.legR.rotation.set(Math.sin(t * 9) * 0.3, 0, 0); P2.legL.rotation.set(-Math.sin(t * 9) * 0.3, 0, 0); }
};
// ---------- elytra wings: real wing shapes ----------
function voxelGeo(cv, scale, thick) { // like the held-item extruder, for any canvas size
  const W = cv.width, H = cv.height; const d = cv.getContext('2d').getImageData(0, 0, W, H).data; const S = scale, T = thick; const pos = [], nor = [], col = [];
  const op = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 80;
  const quad = (a, b, c, e, n, rgb, sh) => { for (const v of [a, b, c, a, c, e]) { pos.push(v[0], v[1], v[2]); nor.push(n[0], n[1], n[2]); col.push(rgb[0] * sh, rgb[1] * sh, rgb[2] * sh); } };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!op(x, y)) continue; const k = (y * W + x) * 4; const rgb = [d[k] / 255, d[k + 1] / 255, d[k + 2] / 255];
    const x0 = x * S, x1 = x0 + S, y1 = -y * S, y0 = y1 - S, z0 = -T / 2, z1 = T / 2;
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], rgb, 1); quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], rgb, 0.85);
    if (!op(x - 1, y)) quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], rgb, 0.7); if (!op(x + 1, y)) quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], rgb, 0.7);
    if (!op(x, y - 1)) quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], rgb, 0.9); if (!op(x, y + 1)) quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], rgb, 0.6); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g;
}
const ELY_GEO = (() => { // a 12x22 left wing: a stiff leading edge along the top and outside, feathers fanning down and in
  const W = 12, H = 22; const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); const r = mulberry32(912);
  for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) {
    const inside = y < 3 ? i < W - (3 - y) : i < W - Math.floor((y - 3) * 0.42); if (!inside || (y > 15 && i < (y - 15) * 1.4)) continue; // tapering tip, rounded root
    const edge = i >= W - Math.floor((y - 3) * 0.42) - 2 || y < 2; const feather = (i + Math.floor(y / 3)) % 3 === 0;
    let v = edge ? [120, 112, 142] : feather ? [150, 142, 172] : [172, 164, 194]; if (y > 12 && !edge) v = v.map(q => q - (y - 12) * 3); if (r() < 0.12) v = v.map(q => q - 12);
    x.fillStyle = 'rgb(' + v.map(q => Math.max(0, q | 0)).join(',') + ')'; x.fillRect(i, y, 1, 1); }
  return voxelGeo(c, PX, PX * 1.2); })();
ELYTRA_MAT.vertexColors = true; ELYTRA_MAT.color.setRGB(1, 1, 1); ELYTRA_MAT.needsUpdate = true;
ensureWings = function (model) {
  if (model.wings) return model.wings;
  const mk = (s) => { const g = new THREE.Group(); g.position.set(s * 1 * PX, 24 * PX, -2.6 * PX); // hinged at the top of the back, either side of the spine
    const m = new THREE.Mesh(ELY_GEO, ELYTRA_MAT); m.scale.x = s; g.add(m); m.layers.enable(1); model.body.add(g); return g; };
  model.wings = [mk(-1), mk(1)]; return model.wings;
};
// ---------- armour, per piece ----------
const ARMOR_COL = { leather: [[160, 100, 60], [196, 136, 90], [110, 66, 36]], chainmail: [[150, 152, 160], [196, 198, 206], [80, 82, 92]], iron: [[200, 200, 204], [236, 236, 240], [130, 130, 138]], golden: [[240, 196, 50], [255, 236, 130], [176, 120, 20]], gold: [[240, 196, 50], [255, 236, 130], [176, 120, 20]], diamond: [[70, 214, 200], [170, 250, 238], [30, 140, 132]], netherite: [[76, 68, 74], [118, 108, 116], [44, 38, 44]], turtle: [[70, 150, 70], [120, 200, 110], [40, 100, 40]] };
const armorTex2Cache = {};
function armorTex2(mat, part) { // part: helm, chest, arm, legs, leg, boot
  const key = mat + ':' + part; if (armorTex2Cache[key]) return armorTex2Cache[key];
  const [C, L, D] = ARMOR_COL[mat] || ARMOR_COL.iron; const mats = [];
  for (const face of ['right', 'left', 'top', 'bottom', 'front', 'back']) { // box face order px, nx, py, ny, pz, nz
    const cv = document.createElement('canvas'); cv.width = cv.height = 16; const x = cv.getContext('2d'); const r = mulberry32(hashStr(key + face));
    const set = (i, y, c) => { x.fillStyle = 'rgb(' + c.map(q => clamp(q | 0, 0, 255)).join(',') + ')'; x.fillRect(i, y, 1, 1); };
    for (let y = 0; y < 16; y++) for (let i = 0; i < 16; i++) {
      let c = C; const e = i === 0 || i === 15 || y === 0 || y === 15; if (e) c = D; else if (y < 3) c = L; if (r() < 0.1) c = c.map(q => q - 10);
      if (mat === 'chainmail' && !e && (i + y) % 3 === 0) continue; // see-through links
      if (mat === 'leather' && !e && y % 5 === 4 && i % 2) c = D; // stitching
      if (part === 'helm' && face === 'front' && i > 2 && i < 13 && y > 4 && y < 13 && !(i > 6 && i < 9 && y < 9)) continue; // the visor opening, with a nose guard
      if (part === 'helm' && face === 'bottom') continue;
      if (part === 'chest' && face === 'front' && (i === 7 || i === 8) && y > 2) c = L; // centre ridge
      if (part === 'chest' && face === 'front' && y === 9 && !e) c = D;
      if (part === 'arm' && y < 6) c = y < 2 ? L : C; if (part === 'arm' && y === 6) c = D; // shoulder plate over the sleeve
      if (part === 'legs' && y < 4) c = y === 3 ? D : L; // belt
      if (part === 'leg' && y > 6 && y < 9 && face === 'front') c = L; // knee plate
      if (part === 'boot' && y > 11 && face === 'front') c = L; // toe cap
      if ((part === 'chest' || part === 'helm') && !e && (i === 2 || i === 13) && (y === 2 || y === 13) && mat !== 'leather') c = L; // rivets
      set(i, y, c); }
    const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
    mats.push(new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.5, transparent: false, side: THREE.DoubleSide })); }
  return armorTex2Cache[key] = mats;
}
addArmorSlots = function (model) {
  const P = model.P; const mk = (parent, w, h, d, ox, oy, oz, part) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w * PX, h * PX, d * PX)); m.position.set(ox * PX, oy * PX, oz * PX); m.visible = false; m.layers.enable(1); m.userData.part = part; parent.add(m); return m; };
  model.armor = { // Minecraft's armour layer is the body inflated by 1 pixel (0.5 for leggings)
    head: [mk(P.head, 10, 10, 10, 0, 4, 0, 'helm')],
    chest: [mk(P.torso, 10, 14, 6, 0, 6, 0, 'chest'), mk(P.armR, 6, 14, 6, 0, -4, 0, 'arm'), mk(P.armL, 6, 14, 6, 0, -4, 0, 'arm')],
    legs: [mk(P.torso, 9, 5, 5, 0, 2, 0, 'legs'), mk(P.legR, 5, 9, 5, 0, -4.5, 0, 'leg'), mk(P.legL, 5, 9, 5, 0, -4.5, 0, 'leg')],
    feet: [mk(P.legR, 6, 5, 6, 0, -9.5, 0, 'boot'), mk(P.legL, 6, 5, 6, 0, -9.5, 0, 'boot')],
  };
  model.setArmor = (mats) => { for (const slot in model.armor) { const m = mats[slot]; for (const mesh of model.armor[slot]) { mesh.visible = !!m; if (m && mesh.userData.mat !== m) { mesh.userData.mat = m; mesh.material = armorTex2(m, mesh.userData.part); } } } };
};
// existing models get the new armour
if (typeof myModel !== 'undefined' && myModel) { for (const s in myModel.armor) for (const m of myModel.armor[s]) m.parent.remove(m); addArmorSlots(myModel); }
// ---------- first person: your own arm ----------
const fpArmCache = { cv: null, mesh: null };
function fpArm() {
  const cv = SKIN_CANVAS; if (fpArmCache.cv === cv && fpArmCache.mesh) return fpArmCache.mesh;
  const tex = new THREE.CanvasTexture(cv); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
  const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5 }), omat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
  const s = 0.06; const g = new THREE.Group();
  const arm = new THREE.Mesh(boxUV(new THREE.BoxGeometry(4 * s, 12 * s, 4 * s), 40, 16, 4, 12, 4), mat);
  const sleeve = new THREE.Mesh(boxUV(new THREE.BoxGeometry(4.5 * s, 12.5 * s, 4.5 * s), 40, 32, 4, 12, 4), omat);
  const inner = new THREE.Group(); inner.add(arm, sleeve); arm.position.y = sleeve.position.y = -6 * s; // pivot at the shoulder
  // Minecraft: the arm comes from below the bottom-right corner and reaches up and in, its back towards you
  const Sh = new V3(0.42, -0.36, 0.3), Hd = new V3(-0.02, 0.14, -0.1); // shoulder off-screen bottom right, hand reaching in
  inner.quaternion.setFromUnitVectors(new V3(0, 1, 0), Sh.clone().sub(Hd).normalize()); inner.rotateY(0.6); inner.position.copy(Sh); g.add(inner);
  g.userData.skinArm = true; fpArmCache.cv = cv; fpArmCache.mesh = g; return g;
}
{ const _uh = updateHand; updateHand = function (dt, light) {
    const r = _uh.apply(this, arguments);
    const h = player.held(); const id = h ? h.id : 0;
    if (!id && SKIN_CANVAS && handMesh && !handMesh.userData.skinArm) { handGroup.remove(handMesh); handMesh = fpArm(); handGroup.add(handMesh); }
    // the off-hand shield: big, in the lower corner; raised to the middle when blocking
    if (offMesh && offId === IT.shield) { const bk = S.blockPose || 0; const mainShield = (player.inv[player.sel] && player.inv[player.sel].id === IT.shield); const ob = mainShield ? 0 : bk;
      offMesh.scale.setScalar(1.7); offGroup.position.set(-0.56 + 0.2 * ob, -0.58 + 0.24 * ob, -0.95 + 0.05 * ob); offGroup.rotation.set(0.05 - 0.05 * ob + S.lagY * 0.5, 0.42 - 0.34 * ob + S.lagX * 0.5, 0.06 - 0.06 * ob); }
    if (handMesh && handId === IT.shield) { const bk = S.blockPose || 0; handMesh.scale.setScalar(1.7); handGroup.position.set(0.56 - 0.2 * bk, -0.58 + 0.24 * bk, -0.95 + 0.05 * bk); handGroup.rotation.set(0.05 - 0.05 * bk + S.lagY, -0.42 + 0.34 * bk + S.lagX, -0.06 + 0.06 * bk); }
    return r; }; }

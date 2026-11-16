// ================= HAND-MADE MOB MODELS (Blockbench .bbmodel, baked into 00_paint.js as PAINT_BAKED.models) =================
// A model replaces that mob's built-in look. Boxes come from the model's elements, folders (groups) become the moving parts,
// and part names hook into the game's animations: head turns, left_wing/right_wing flap, legs (leg1..leg4, *_leg) walk,
// arms (left_arm/right_arm) swing. Blockbench faces north (-z); the game faces +z, so the model is turned around.
const BB_MODELS = (typeof PAINT_BAKED !== 'undefined' && PAINT_BAKED.models) || {};
const bbTexCache = {};
function bbTexture(key, M) {
  if (bbTexCache[key]) return bbTexCache[key];
  const t = new THREE.TextureLoader().load(M.texture); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return (bbTexCache[key] = t);
}
// bb pixel coordinates -> game units, turned to face +z
const bbv = (p) => new THREE.Vector3(-p[0] / 16, p[1] / 16, -p[2] / 16);
function bbBox(el, M, mat) {
  const inf = el.inflate || 0, f = el.from, t = el.to;
  const w = Math.abs(t[0] - f[0]) + 2 * inf, h = Math.abs(t[1] - f[1]) + 2 * inf, d = Math.abs(t[2] - f[2]) + 2 * inf;
  const geo = new THREE.BoxGeometry(Math.max(w, 0.001) / 16, Math.max(h, 0.001) / 16, Math.max(d, 0.001) / 16);
  const uv = geo.attributes.uv; const W = M.w, H = M.h;
  // Three's box faces: +x, -x, +y, -y, +z, -z. With the model turned around, Blockbench west/east/up/down/north/south land there.
  const FACE = ['west', 'east', 'up', 'down', 'north', 'south'];
  for (let fi = 0; fi < 6; fi++) { const F = el.faces && el.faces[FACE[fi]]; const k = fi * 4;
    if (!F || !F.uv) { for (let q = 0; q < 4; q++) uv.setXY(k + q, 0, 0); continue; }
    let [u1, v1, u2, v2] = F.uv; if (fi === 2 || fi === 3) { [u1, u2] = [u2, u1]; [v1, v2] = [v2, v1]; }
    uv.setXY(k, u1 / W, 1 - v1 / H); uv.setXY(k + 1, u2 / W, 1 - v1 / H); uv.setXY(k + 2, u1 / W, 1 - v2 / H); uv.setXY(k + 3, u2 / W, 1 - v2 / H); }
  uv.needsUpdate = true;
  return new THREE.Mesh(geo, mat);
}
function bbRotate(obj, rot) { if (!rot) return; obj.rotation.order = 'ZYX'; obj.rotation.set(-rot[0] * Math.PI / 180, rot[1] * Math.PI / 180, -rot[2] * Math.PI / 180); }
// parts that belong to the head (or a horse's neck) so they turn with it, and parts only shown with gear on
const BB_HEADKIDS = ['nose', 'headwear', 'headwear2', 'hat', 'mole', 'mouth', 'left_ear', 'right_ear', 'ears', 'jaw', 'left_horn', 'right_horn', 'horns', 'lower_beak', 'left_tendril', 'right_tendril', 'mushrooms', 'mane', 'beak'];
const BB_HIDE = ['saddle', 'bridle', 'reins', 'headpiece', 'noseband', 'left_bit', 'right_bit', 'left_rein', 'right_rein', 'left_chest', 'right_chest'];
const BB_HIDE_MOB = { armadillo: ['cube'], turtle: ['body2'] };
// resting poses Minecraft sets in code rather than in the model (Blockbench degrees)
const BB_POSE = { vex: { right_wing: [-25, 30, 0], left_wing: [-25, -30, 0], right_arm: [0, 0, 25], left_arm: [0, 0, -25] } };
const BB_REPARENT = { outer_left_wing: 'left_wing', outer_right_wing: 'right_wing', left_wing_tip: 'left_wing', right_wing_tip: 'right_wing' };
function bbMaterial(key, M, glowKey) {
  const o = { map: bbTexture(key, M), alphaTest: 0.1, transparent: !!M.translucent, side: THREE.DoubleSide };
  if (M.translucent) { o.depthWrite = false; o.alphaTest = 0.01; }
  if (M.glow) { o.emissiveMap = bbTexture(glowKey, { texture: M.glow }); o.emissive = new THREE.Color(1, 1, 1); }
  return new THREE.MeshLambertMaterial(o);
}
function bbBuildInto(M, mat, root, parts, reuse) {
  const els = {}; for (const e of M.elements) els[e.uuid] = e; const grs = {}; for (const g of M.groups) grs[g.uuid] = g;
  const addNode = (node, parent, parentOrigin) => {
    if (typeof node === 'string') { const el = els[node]; if (!el) return;
      const c = bbv([(el.from[0] + el.to[0]) / 2, (el.from[1] + el.to[1]) / 2, (el.from[2] + el.to[2]) / 2]);
      if (el.rotation && el.rotation.some(a => a)) { const o = bbv(el.origin || [0, 0, 0]); const p = new THREE.Group(); p.position.copy(o).sub(parentOrigin); bbRotate(p, el.rotation); parent.add(p); const mesh = bbBox(el, M, mat); mesh.position.copy(c).sub(o); p.add(mesh); }
      else { const mesh = bbBox(el, M, mat); mesh.position.copy(c).sub(parentOrigin); parent.add(mesh); }
      return; }
    const g = grs[node.uuid]; if (!g) return; const o = bbv(g.origin || [0, 0, 0]);
    // a layer (overlay skin) drops its boxes into the matching part of the base model so they move together
    if (reuse && parts[g.name]) { const host = parts[g.name]; for (const ch of node.children || []) addNode(ch, host.userData.inner, host.userData.o); return; }
    // outer group = the joint the game animates; inner group keeps the model's own resting rotation
    const grp = new THREE.Group(); grp.position.copy(o).sub(parentOrigin); parent.add(grp);
    let inner = grp; if (g.rotation && g.rotation.some(a => a)) { inner = new THREE.Group(); bbRotate(inner, g.rotation); grp.add(inner); }
    grp.userData.inner = inner; grp.userData.o = o; if (!parts[g.name]) parts[g.name] = grp;
    for (const ch of node.children || []) addNode(ch, inner, o);
  };
  for (const n of M.outliner) addNode(n, root, new THREE.Vector3());
}
function buildBBModel(m, root, key) {
  const M = BB_MODELS[key];
  const holder = new THREE.Group(); root.add(holder);
  const mat = bbMaterial(key, M, key + ':glow'); m.mats.push([mat, WHITE_C, false]);
  const parts = {}; bbBuildInto(M, mat, holder, parts, false);
  (M.layers || []).forEach((L, i) => { const lm = bbMaterial(key + ':L' + i, L, null); m.mats.push([lm, WHITE_C, !!L.translucent]); bbBuildInto(L, lm, holder, parts, true); if (L.translucent) { lm.map.wrapS = THREE.RepeatWrapping; m.bbScroll = lm.map; } });
  holder.updateMatrixWorld(true);
  for (const n of BB_HIDE.concat(BB_HIDE_MOB[key] || [])) if (parts[n]) parts[n].visible = false;
  // head: horses and ravagers turn the whole neck
  const headRoot = (parts.neck && (parts.mane || key === 'ravager')) ? parts.neck : parts.head;
  for (const [c, p] of Object.entries(BB_REPARENT)) if (parts[c] && parts[p]) parts[p].userData.inner.attach(parts[c]);
  if (headRoot) { for (const n of BB_HEADKIDS.concat(headRoot === parts.neck ? ['head'] : [])) if (parts[n] && parts[n] !== headRoot && parts[n].parent === holder) headRoot.userData.inner.attach(parts[n]); m.head = headRoot; }
  // rest poses go on an extra joint inside the part, so the game's own swing/flap still works on top
  const rest = (part, rot) => { const host = part.userData.inner; const g = new THREE.Group(); bbRotate(g, rot); while (host.children.length) g.add(host.children[0]); host.add(g); part.userData.inner = g; };
  for (const [n, rot] of Object.entries(BB_POSE[key] || {})) if (parts[n]) rest(parts[n], rot);
  const gx = (o) => o.getWorldPosition(new THREE.Vector3());
  // legs, ordered the way the walk cycle expects
  let legs = Object.keys(parts).filter(n => /(^leg\d+$)|(_leg$)/.test(n) && !/^(neck)$/.test(n)).map(n => parts[n]);
  if (legs.length) {
    const P = new Map(legs.map(l => [l, gx(l)]));
    if (legs.length === 2) legs.sort((a, b) => P.get(a).x - P.get(b).x);
    else { legs.sort((a, b) => P.get(b).z - P.get(a).z); const rows = []; for (let i = 0; i < legs.length; i += 2) rows.push(legs.slice(i, i + 2).sort((a, b) => P.get(a).x - P.get(b).x));
      if (rows.length === 3) rows[1].reverse(); legs = [].concat(...rows); if (legs.length === 8) legs.forEach((l, i) => { const side = P.get(l).x >= 0 ? 1 : -1, row = i >> 1; l.userData.side = side;
        // Minecraft fans spider legs out (front ones forward, back ones back) and bends them down about 45 degrees
        const spread = [-Math.PI / 4, -Math.PI / 8, Math.PI / 8, Math.PI / 4][row] * side, droop = (row === 1 || row === 2 ? 0.58 : 0.785) - 0.45;
        const sp = new THREE.Group(); sp.position.copy(l.position); sp.rotation.y = spread; l.parent.add(sp); sp.add(l); l.position.set(0, 0, 0);
        const d = new THREE.Group(); d.rotation.z = -side * droop; const host = l.userData.inner; while (host.children.length) d.add(host.children[0]); host.add(d); l.userData.inner = d; }); }
    m.legs = legs;
  }
  // arms: villagers, witches and illagers keep their folded arms; the separate arms only show on illagers that fight
  let arms = ['right_arm', 'left_arm'].map(n => parts[n]).filter(Boolean);
  if (parts.arms && arms.length) { const fight = /vindicator|evoker|illusioner/.test(key); for (const a of arms) a.visible = false; if (fight) m.bbFolded = parts.arms; }
  if (arms.length === 2) { arms.sort((a, b) => gx(a).x - gx(b).x); m.arms = arms; }
  if (parts.left_wing || parts.right_wing) { m.wings = [parts.left_wing, parts.right_wing].filter(Boolean); m.wingAxis = M.wingAxis || (key === 'phantom' ? 'z' : 'y'); }
  if (parts.tail) m.tail = parts.tail;
  m.bbParts = parts;
  // breeze: the wind layer spins and its texture scrolls, the rods circle the body
  if (M.anim === 'breeze') m.bbAnim = (t) => { const P = parts; if (P.wind_top) P.wind_top.rotation.y = t * 2.2; if (P.wind_middle) P.wind_middle.rotation.y = -t * 1.6; if (P.wind_bottom) P.wind_bottom.rotation.y = t * 1.1;
    if (P.rods) P.rods.rotation.y = t * 1.4; if (m.bbScroll) m.bbScroll.offset.x = (t * 0.25) % 1; };
  // size: explicit scale, or fit the model to the mob's hitbox when the two are far apart (ghasts, elder guardians)
  let sc = M.scale || 1;
  if (!M.scale && m.t && m.t.h) { const bb = new THREE.Box3().setFromObject(holder); const h = bb.max.y - bb.min.y; if (h > 0.05) { const r = (m.t.ai === 'magma' ? 1 : m.t.h) / h; if (r > 1.6 || r < 0.55) sc = r; } }
  holder.scale.setScalar(sc);
}
// models with their own motion (breeze wind) update whenever the mob is drawn
if (typeof Mob !== 'undefined') { const _bbc = Mob.prototype.colorize; Mob.prototype.colorize = function () { if (this.bbAnim) this.bbAnim(this.age || 0); return _bbc.apply(this, arguments); }; }
// replace the built-in look of every mob that has a model
for (const key in BB_MODELS) if (typeof MOBS !== 'undefined' && MOBS[key]) { MOBS[key].build = function (m, r) { buildBBModel(m, r, key); }; }

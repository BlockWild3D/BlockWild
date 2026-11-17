// ================= THE OWNER'S MOB ANIMATIONS (player) =================
// MCA (02i_mcanim_data.js) holds, per mob, the skeleton the owner animated (Bedrock-style bones) and every clip.
// The game keeps its own models (variants, babies, saddles, armour, overlays all still work); the clips are played
// on a hidden copy of the owner's skeleton and each bone's movement is copied onto the matching part of the model:
//   - bones are matched to model parts by where they sit (centre of their cubes, pivot) with names as a tie-break,
//     in the skeleton's resting pose (its own pose plus the always-on "setup" values found in the combined clips);
//   - every frame each matched part gets the bone's movement relative to that resting pose, measured in model
//     space and handed down the part's own hierarchy, so different joint layouts and rest angles don't matter;
//   - the game's head turn (looking at you / targets) still works on top; the owner's look-around sweeps are left out
//     of the combined clips by the packer for that reason.
// Which clip plays: combined_walk while moving (speed scales its time and strength), blended into combined_idle when
// still, with per-mob states (sitting, roosting, swimming, rolled up, flopping on land, aiming a bow...) and one-shot
// clips on events (attacks, roars, casting, eating...). A state clip that writes every resting channel of the bones it
// touches replaces the pose (wolf sitting); otherwise it goes on top (parrot sitting). Mobs handled here stop using
// the game's procedural leg / arm / wing / tail swing and the older keyframe player (99zzz_kfanim.js) for the parts
// the clips move. Bones that can't be carried over are listed in MCA_SKIPBONE. Pose updates thin out with distance.
// Checked headless with side-by-side renders of the owner's skeleton vs the game's model for every mob.
const MCA_R = Math.PI / 180;
const mcaV = (p) => new THREE.Vector3(-p[0] / 16, p[1] / 16, -p[2] / 16); // owner's pixels -> game units, turned to face +z
const mcaEuler = new THREE.Euler(0, 0, 0, 'ZYX');
// MOBS key -> animation folder when they differ
const MCA_ALIAS = { illusioner: 'evoker' };
const mcaFolder = (type) => MCA[MCA_ALIAS[type] || type] ? (MCA_ALIAS[type] || type) : null;

// ---------- clips ----------
const MCA_CLIPS = {};
function mcaClip(mob, name) {
  if (!name) return null; const key = mob + '|' + name; if (MCA_CLIPS[key] !== undefined) return MCA_CLIPS[key];
  const E = MCA[mob]; const C = E && E.c[name]; if (!C) return (MCA_CLIPS[key] = null);
  const ch = {}; let len = C[0];
  for (const b in C[2]) { ch[b] = {}; for (const c in C[2][b]) { const f = C[2][b][c]; const ks = []; for (let i = 0; i < f.length; i += 4) ks.push([f[i], f[i + 1], f[i + 2], f[i + 3]]); ch[b][c] = ks; if (!len) len = Math.max(len, ks[ks.length - 1][0]); } }
  return (MCA_CLIPS[key] = { name, len, loop: !!C[1], ch });
}
function mcaSample(ks, t, out) {
  const n = ks.length; if (t <= ks[0][0] || n === 1) { out[0] = ks[0][1]; out[1] = ks[0][2]; out[2] = ks[0][3]; return out; }
  if (t >= ks[n - 1][0]) { const k = ks[n - 1]; out[0] = k[1]; out[1] = k[2]; out[2] = k[3]; return out; }
  let lo = 0, hi = n - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (ks[mid][0] <= t) lo = mid; else hi = mid; }
  const a = ks[lo], b = ks[hi], u = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
  out[0] = a[1] + (b[1] - a[1]) * u; out[1] = a[2] + (b[2] - a[2]) * u; out[2] = a[3] + (b[3] - a[3]) * u; return out;
}
const mcaTmp = [0, 0, 0];
// add clip at time t (weight w) into pose P[bone][c] = [x,y,z]; mode 'rep' replaces the resting constants of the
// channels the clip has (pose clips like sitting are written as full poses), 'add' adds on top
function mcaAccum(P, rig, clip, t, w, mode) {
  if (!clip || w <= 0) return; const tt = clip.loop ? (clip.len > 0 ? ((t % clip.len) + clip.len) % clip.len : 0) : Math.min(Math.max(t, 0), clip.len);
  for (const b in clip.ch) { const C = clip.ch[b]; const rest = rig.rest[b];
    for (const c in C) { const v = mcaSample(C[c], tt, mcaTmp); const A = P[b] || (P[b] = {}); const a = A[c] || (A[c] = c === 's' ? [1, 1, 1] : [0, 0, 0]);
      const r0 = mode === 'rep' && rest && rest[c] ? rest[c] : null;
      for (let i = 0; i < 3; i++) { const base = c === 's' ? 1 : 0; a[i] += ((v[i] - (r0 ? r0[i] : base))) * w; } } }
}

// ---------- skeletons ----------
// rig: bones [{name, parent, piv (game), bind [deg], cubes: local centres}], rest[bone][c] = constant values of the
// always-on clips (they're part of the resting pose), restW[i] = model-space matrix of each bone at rest
function mcaConst(clip) { // channels that never change in a clip: {bone: {c: [x,y,z]}}
  const out = {}; if (!clip) return out;
  for (const b in clip.ch) for (const c in clip.ch[b]) { const ks = clip.ch[b][c]; const k0 = ks[0];
    if (ks.every(k => Math.abs(k[1] - k0[1]) < 0.01 && Math.abs(k[2] - k0[2]) < 0.01 && Math.abs(k[3] - k0[3]) < 0.01)) (out[b] || (out[b] = {}))[c] = [k0[1], k0[2], k0[3]]; }
  return out;
}
const MCA_RIGS = {};
const MCA_SETUP = ['setup', 'wolf_setup', 'default_leg_pose', 'base', 'base_pose', 'humanoid_base_pose', 'phantom_base_pose', 'general', 'villager_general', 'vindicator_base'];
function mcaRig(mob, baby) {
  const key = mob + (baby ? ':baby' : ''); if (MCA_RIGS[key] !== undefined) return MCA_RIGS[key];
  const E = MCA[mob]; const G = (baby && E.gb) || E.g; if (!G) return (MCA_RIGS[key] = null);
  const bones = G.map(([name, parent, piv, bind, cubes, bp]) => ({ name, parent, pivRaw: piv, piv: mcaV(piv), bind: bind || [0, 0, 0], cubes: cubes.map(c => {
    // cube centre, turned by the cube's own rotation around its pivot, relative to the bone pivot
    const ctr = new THREE.Vector3(c[0] + c[3] / 2, c[1] + c[4] / 2, c[2] + c[5] / 2);
    let p = mcaV([ctr.x, ctr.y, ctr.z]); if (c[7] || c[8] || c[9]) { const cp = mcaV([c[10], c[11], c[12]]); mcaEuler.set(c[7] * MCA_R, -c[8] * MCA_R, -c[9] * MCA_R, 'ZYX'); p = p.sub(cp).applyEuler(mcaEuler).add(cp); }
    p.sub(mcaV(piv)); if (bp) { mcaEuler.set(bp[0] * MCA_R, -bp[1] * MCA_R, -bp[2] * MCA_R, 'ZYX'); p.applyEuler(mcaEuler); }
    return { p, vol: Math.max(0.5, c[3] * c[4] * c[5]) }; }) }));
  const byName = {}; bones.forEach((b, i) => { byName[b.name] = i; });
  // parents before children
  const order = [], seen = new Set(); const visit = (i) => { if (seen.has(i)) return; seen.add(i); if (bones[i].parent >= 0) visit(bones[i].parent); order.push(i); }; bones.forEach((_, i) => visit(i));
  // resting constants: shared by combined_idle and combined_walk (or whichever exists)
  const ci = mcaClip(mob, 'combined_idle'), cw = mcaClip(mob, 'combined_walk');
  const a = mcaConst(ci), bw = mcaConst(cw); const rest = {};
  // with both clips: a channel is resting when it is constant and equal in both; with one: when it's constant there
  const src = ci ? a : bw;
  for (const b in src) for (const c in src[b]) { const v = src[b][c];
    if (ci && cw) { const o = bw[b] && bw[b][c]; if (!o || Math.abs(o[0] - v[0]) > 0.01 || Math.abs(o[1] - v[1]) > 0.01 || Math.abs(o[2] - v[2]) > 0.01) continue; }
    (rest[b] || (rest[b] = {}))[c] = v; }
  // always-on pose clips (setup / default leg pose / base pose ...) are part of the resting pose too
  for (const n of MCA_SETUP) { const C = mcaClip(mob, n); if (!C) continue; const k = mcaConst(C); if (Object.keys(k).length !== Object.keys(C.ch).length) continue;
    for (const b in k) for (const c in k[b]) { const R = rest[b] || (rest[b] = {}); if (!R[c]) R[c] = k[b][c]; } }
  const rig = { mob, key, bones, byName, rest, order };
  rig.restW = mcaPose(rig, mcaRestPose(rig), []);
  rig.geoW = mcaPose(rig, {}, []);
  // animated bones: anything a clip moves (the bones worth matching)
  // bones that move: anything a clip moves, and everything hanging off those (a camel's hump rides on its body)
  rig.animated = new Set(); for (const n in E.c) { const C = mcaClip(mob, n); if (C) for (const b in C.ch) if (byName[b] !== undefined) rig.animated.add(byName[b]); }
  for (const i of order) if (bones[i].parent >= 0 && rig.animated.has(bones[i].parent)) rig.animated.add(i);
  return (MCA_RIGS[key] = rig);
}
function mcaRestPose(rig) { const P = {}; for (const b in rig.rest) { P[b] = {}; for (const c in rig.rest[b]) P[b][c] = rig.rest[b][c].slice(); } return P; }
// model-space matrices of every bone for pose P ({bone: {r,p,s}} absolute values on top of the bind rotation)
const mcaM = new THREE.Matrix4(), mcaQ = new THREE.Quaternion(), mcaS = new THREE.Vector3(), mcaT = new THREE.Vector3();
// absPos: position keys are where the bone sits relative to its parent's pivot (the guardian's legacy spikes),
// not offsets from its own pivot
function mcaPose(rig, P, out, absPos) {
  const B = rig.bones;
  for (const i of rig.order) { const b = B[i]; const p = P[b.name] || {}; const r = p.r || [0, 0, 0], ps = p.p || [0, 0, 0], s = p.s || [1, 1, 1];
    const par = b.parent >= 0 ? B[b.parent] : null;
    if (absPos && par && p.p) mcaT.set(-ps[0] / 16, ps[1] / 16, -ps[2] / 16);
    else { mcaT.copy(b.piv); if (par) mcaT.sub(par.piv); mcaT.x += ps[0] / 16; mcaT.y += ps[1] / 16; mcaT.z -= ps[2] / 16; }
    mcaEuler.set((b.bind[0] + r[0]) * MCA_R, -(b.bind[1] + r[1]) * MCA_R, -(b.bind[2] + r[2]) * MCA_R, 'ZYX'); mcaQ.setFromEuler(mcaEuler);
    mcaS.set(Math.abs(s[0]) < 1e-4 ? 1e-4 : s[0], Math.abs(s[1]) < 1e-4 ? 1e-4 : s[1], Math.abs(s[2]) < 1e-4 ? 1e-4 : s[2]);
    const m = out[i] || (out[i] = new THREE.Matrix4()); m.compose(mcaT, mcaQ, mcaS); if (par) m.premultiply(out[b.parent]); }
  return out;
}

// ---------- matching the skeleton to the game's model ----------
const mcaNorm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const MCA_SYN = [['upperbody', 'mane'], ['tentacles', 'tentacle'], ['wing0', 'leftwing', 'rightwing'], ['wing1', 'leftwing', 'rightwing'], ['taila', 'tail'], ['bag1', 'leftchest', 'chestleft'], ['bag2', 'rightchest', 'chestright']];
function mcaNameScore(a, b) { a = mcaNorm(a); b = mcaNorm(b); if (a === b) return 1; if (a.replace(/\d+$/, '') === b.replace(/\d+$/, '') && a.replace(/\d+$/, '') !== a) return 0.3;
  for (const g of MCA_SYN) if (g.includes(a) && g.includes(b)) return 0.6; if (a.length > 3 && (a.includes(b) || b.includes(a))) return 0.4; return 0; }
// the model's parts at rest (game turns zeroed): frame matrix (holder space), cube centre, pivot
function mcaModelParts(m) {
  const H = m.bbHolder, parts = m.bbParts || {}; const set = new Map(); for (const n in parts) if (parts[n] && !set.has(parts[n])) set.set(parts[n], n);
  const saved = []; for (const g of set.keys()) { saved.push([g, g.rotation.clone(), g.position.clone(), g.scale.clone()]); g.rotation.set(0, 0, 0); }
  const sc0 = H.scale.clone(); H.scale.set(1, 1, 1); H.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(H.matrixWorld).invert(); const out = [];
  const owner = (o) => { let p = o.parent; while (p && p !== H) { if (set.has(p)) return p; p = p.parent; } return null; };
  for (const [g, n] of set) out.push({ g, name: n, M: new THREE.Matrix4().multiplyMatrices(inv, g.matrixWorld), sum: new THREE.Vector3(), w: 0, owner: owner(g) });
  const idx = new Map(out.map((o, i) => [o.g, i]));
  H.traverse(o => { if (!o.isMesh || !o.geometry || !o.geometry.parameters) return; const ow = owner(o); if (!ow) return; const P = o.geometry.parameters; const vol = Math.max(1e-4, (P.width || 0) * (P.height || 0) * (P.depth || 0)) * 4096;
    const c = new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); const e = out[idx.get(ow)]; e.sum.addScaledVector(c, vol); e.w += vol; });
  for (const e of out) { e.piv = new THREE.Vector3().setFromMatrixPosition(e.M); e.ctr = e.w ? e.sum.clone().divideScalar(e.w) : null; e.parentIdx = e.owner ? idx.get(e.owner) : -1; }
  for (const [g, r, p, s] of saved) { g.rotation.copy(r); g.position.copy(p); g.scale.copy(s); } H.scale.copy(sc0); H.updateMatrixWorld(true);
  return out;
}
function mcaBoneInfo(rig, W) { return rig.bones.map((b, i) => { let sum = new THREE.Vector3(), w = 0; for (const c of b.cubes) { sum.addScaledVector(c.p.clone().applyMatrix4(W[i]), c.vol); w += c.vol; }
  return { piv: new THREE.Vector3().setFromMatrixPosition(W[i]), ctr: w ? sum.divideScalar(w) : null }; }); }
const mcaBox = (pts) => { const b = new THREE.Box3(); for (const p of pts) if (p) b.expandByPoint(p); return b; };
function mcaMatch(rig, parts, W, mode) {
  // mode 'abs': same size and place; 'fit': skeleton scaled to the model's size; 'norm': positions inside each
  // model's own bounding box (models with other proportions)
  const BI = mcaBoneInfo(rig, W); const bb = mcaBox(BI.map(b => b.ctr)), mb = mcaBox(parts.map(p => p.ctr));
  const bs = bb.getSize(new THREE.Vector3()), ms = mb.getSize(new THREE.Vector3()); const bm = Math.max(bs.x, bs.y, bs.z), mm = Math.max(ms.x, ms.y, ms.z);
  let k = mode === 'fit' && bm > 1e-3 && mm > 1e-3 ? mm / bm : 1;
  const off = new THREE.Vector3(); if (k !== 1) off.copy(mb.getCenter(new THREE.Vector3())).sub(bb.getCenter(new THREE.Vector3()).multiplyScalar(k));
  const nz = (v, box, size) => v && new THREE.Vector3((v.x - box.min.x) / Math.max(size.x, 0.1), (v.y - box.min.y) / Math.max(size.y, 0.1), (v.z - box.min.z) / Math.max(size.z, 0.1)).multiplyScalar(16);
  const fitB = (v) => !v ? null : mode === 'norm' ? nz(v, bb, bs) : v.clone().multiplyScalar(k).add(off);
  const fitP = (v) => !v ? null : mode === 'norm' ? nz(v, mb, ms) : v;
  const pairs = [];
  const skip = MCA_SKIPBONE[rig.mob];
  rig.bones.forEach((b, i) => { if (!rig.animated.has(i) || (skip && skip.test(b.name))) return; const bi = BI[i]; const bc = fitB(bi.ctr), bp = fitB(bi.piv);
    parts.forEach((p, j) => { const ns = mcaNameScore(b.name, p.name); const pc = fitP(p.ctr), pp = fitP(p.piv);
      // a bone with no cubes of its own only takes a part of the same name
      if (!bc) { if (ns === 1) pairs.push([-1, i, j, 0]); return; } if (!pc) return;
      const d = bc.distanceTo(pc) * 16 + 0.35 * bp.distanceTo(pp) * 16;
      const cost = d - ns * 4; if (cost < 6 || (ns === 1 && d < 14)) pairs.push([cost, i, j, d]); }); });
  pairs.sort((a, b) => a[0] - b[0]); const usedB = new Set(), usedP = new Set(), map = []; let err = 0;
  for (const [c, i, j, d] of pairs) { if (usedB.has(i) || usedP.has(j)) continue; usedB.add(i); usedP.add(j); map.push([i, j, d]); err += d; }
  // leftovers of the same kind (tentacle / tentacles_3 ...) pair up by distance without the limit
  const stem = (n) => mcaNorm(n).replace(/\d+$/, '').replace(/s$/, '');
  const left = []; rig.bones.forEach((b, i) => { if (!rig.animated.has(i) || usedB.has(i) || !b.cubes.length || !BI[i].ctr) return;
    parts.forEach((p, j) => { if (!usedP.has(j) && p.ctr && stem(b.name) === stem(p.name)) left.push([fitB(BI[i].ctr).distanceTo(fitP(p.ctr)) * 16, i, j]); }); });
  left.sort((a, b) => a[0] - b[0]); for (const [d, i, j] of left) { if (usedB.has(i) || usedP.has(j) || d > 24) continue; usedB.add(i); usedP.add(j); map.push([i, j, d]); err += d; }
  // legs: pair them in order along each side (front to back), models often space them differently
  const isLeg = (n) => /leg|foot/i.test(n);
  for (const side of [-1, 1]) {
    const LB = rig.bones.map((b, i) => i).filter(i => rig.animated.has(i) && rig.bones[i].cubes.length && isLeg(rig.bones[i].name) && BI[i].ctr && Math.sign(BI[i].ctr.x) === side);
    const LJ = parts.map((p, j) => j).filter(j => parts[j].ctr && isLeg(parts[j].name) && Math.sign(parts[j].ctr.x) === side);
    if (!LB.length || LB.length !== LJ.length) continue;
    LB.sort((a, b) => BI[b].piv.z - BI[a].piv.z); LJ.sort((a, b) => parts[b].piv.z - parts[a].piv.z);
    for (let q = map.length - 1; q >= 0; q--) if (LB.includes(map[q][0]) || LJ.includes(map[q][1])) { usedB.delete(map[q][0]); usedP.delete(map[q][1]); err -= map[q][2]; map.splice(q, 1); }
    LB.forEach((i, q) => { const j = LJ[q]; if (usedP.has(j)) return; const d = fitB(BI[i].ctr).distanceTo(fitP(parts[j].ctr)) * 16; map.push([i, j, d]); usedB.add(i); usedP.add(j); err += d; });
  }
  const fitM = mode === 'fit' ? new THREE.Matrix4().makeScale(k, k, k).setPosition(off) : new THREE.Matrix4();
  const cubed = map.filter(([i]) => rig.bones[i].cubes.length).length;
  return { map, cubed, err: map.length ? err / map.length : 99, missed: [...rig.animated].filter(i => !usedB.has(i) && rig.bones[i].cubes.length && !(skip && skip.test(rig.bones[i].name))).map(i => rig.bones[i].name), k: mode === 'fit' ? k : 1, fitM, mode };
}
// ---------- per mob ----------
const MCA_FAR = 64;
const MCA_MODE = {}; // per-skeleton matching mode when the automatic pick is wrong
// bones whose clips can't be carried over (they sit somewhere else in the game's model, or the game moves those
// parts itself): blaze rods orbit by position from one shared spot, guardian spikes stick out from another layout,
// the vex's wings are modelled lying another way in the game's model (the game keeps flapping them)
// ...those bones are drawn from the owner's own skeleton instead (MCA[mob].own: cubes + texture), and the game's
// parts for them are hidden (MCA_HIDE)
const MCA_HIDE = { blaze: /^stick\d+$/, guardian: /^spine\d+/, elder_guardian: /^spine\d+/, vex: /wing/ };
const MCA_OWNTEX = {};
const MCA_ABSPOS = new Set(['guardian', 'elder_guardian']);
function mcaOwnBuild(m, M) {
  const O = MCA[M.mob].own; if (!O) return; const re = new RegExp(O.re);
  let tex = MCA_OWNTEX[M.mob]; if (!tex) { tex = MCA_OWNTEX[M.mob] = new THREE.TextureLoader().load(O.tex); tex.magFilter = tex.minFilter = THREE.NearestFilter; }
  const mat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide }); m.mats.push([mat, WHITE_C, false]);
  const G0 = MCA[M.mob].g; const TW = O.tw, TH = O.th; const own = [];
  M.rig.bones.forEach((b, i) => { if (!re.test(b.name)) return; const o = new THREE.Group(); o.matrixAutoUpdate = false; const uvs = O.uv[b.name] || [];
    G0[i][4].forEach((c, ci) => { const [ox, oy, oz, sx, sy, sz, inf, rx, ry, rz, px, py, pz] = c; const g = new THREE.BoxGeometry(Math.max(sx + 2 * inf, 0.01) / 16, Math.max(sy + 2 * inf, 0.01) / 16, Math.max(sz + 2 * inf, 0.01) / 16);
      const uvA = g.attributes.uv; const U = (fi, u1, v1, u2, v2) => { const k = fi * 4; uvA.setXY(k, u1 / TW, 1 - v1 / TH); uvA.setXY(k + 1, u2 / TW, 1 - v1 / TH); uvA.setXY(k + 2, u1 / TW, 1 - v2 / TH); uvA.setXY(k + 3, u2 / TW, 1 - v2 / TH); };
      const [uv, mir] = uvs[ci] || [[0, 0], 0];
      if (Array.isArray(uv)) { const [u, v] = uv; const a = Math.floor(sx), h = Math.floor(sy), d = Math.floor(sz); const M2 = (fi, u1, v1, u2, v2) => mir ? U(fi, u2, v1, u1, v2) : U(fi, u1, v1, u2, v2);
        M2(mir ? 0 : 1, u, v + d, u + d, v + d + h); M2(mir ? 1 : 0, u + d + a, v + d, u + 2 * d + a, v + d + h); M2(2, u + d, v, u + d + a, v + d); M2(3, u + d + a, v + d, u + d + 2 * a, v);
        M2(5, u + 2 * d + a, v + d, u + 2 * d + 2 * a, v + d + h); M2(4, u + d, v + d, u + d + a, v + d + h); }
      else if (uv) ['west', 'east', 'up', 'down', 'south', 'north'].forEach((n, fi) => { const f = uv[n]; if (f) U(fi, f.uv[0], f.uv[1], f.uv[0] + f.uv_size[0], f.uv[1] + f.uv_size[1]); });
      const mesh = new THREE.Mesh(g, mat); const ctr = mcaV([ox + sx / 2, oy + sy / 2, oz + sz / 2]); const piv = mcaV([px, py, pz]);
      const hold = new THREE.Group(); hold.position.copy(piv).sub(b.piv); hold.rotation.set(rx * MCA_R, -ry * MCA_R, -rz * MCA_R, 'ZYX'); mesh.position.copy(ctr).sub(piv); hold.add(mesh); o.add(hold); });
    M.holder.add(o); own.push([i, o]); });
  M.own = own;
  const hide = MCA_HIDE[M.mob]; M.hidden = hide ? M.parts.filter(p => hide.test(p.name)).map(p => p.g) : [];
}
const MCA_SKIPBONE = { blaze: /upperBodyParts/, vex: /Wing/, guardian: /spike/, elder_guardian: /spike/ };
// resting angles the game sets by hand on parts whose clips already hold them
const MCA_UNPOSE = { vex: ['right_arm', 'left_arm'] };
function mcaInit(m) {
  const mob = mcaFolder(m.type); m.mca = null; if (!mob || !m.bbHolder || !m.bbParts) return;
  const rig = mcaRig(mob, !!m.baby && !!MCA[mob].gb && /:baby$/.test(m.bbKey || '')); if (!rig) return;
  // resting angles the game added by hand (BB_POSE) are in the owner's clips already
  for (const n of MCA_UNPOSE[mob] || []) { const p = m.bbParts[n]; const g = p && p.userData.inner; if (g && g !== p) g.rotation.set(0, 0, 0); }
  const parts = mcaModelParts(m);
  // match in the resting pose; if the plain skeleton fits the model better than the one with the setup values, the
  // setup values are the model's business (it is already built in that pose) and movement is measured from there
  let A = null, useGeo = false;
  for (const mode of (MCA_MODE[mob] ? [MCA_MODE[mob]] : ['abs', 'fit', 'norm'])) for (const g of Object.keys(rig.rest).length ? [false, true] : [false]) {
    const B = mcaMatch(rig, parts, g ? rig.geoW : rig.restW, mode); if (!A || B.cubed > A.cubed || (B.cubed === A.cubed && B.err < A.err - 0.5 && B.mode === A.mode)) { A = B; useGeo = g; } }
  if (!A || !A.map.length) return;
  // a joint inside each matched part (and every part between, so movement is handed down)
  const J = parts.map((p) => { const j = new THREE.Group(); j.userData.mca = 1; while (p.g.children.length) j.add(p.g.children[0]); p.g.add(j); j.matrixAutoUpdate = false; return j; });
  const fitInv = new THREE.Matrix4().copy(A.fitM).invert();
  const bone = parts.map(() => -1); for (const [i, j] of A.map) bone[j] = i;
  // parts with nothing matched above them (a villager's robe, a horse's reins hanging off the root) move with the
  // nearest matched part
  const matched = (j) => { for (let k = j; k >= 0; k = parts[k].parentIdx) if (bone[k] >= 0) return true; return false; };
  const follow = parts.map(() => -1);
  parts.forEach((p, j) => { if (matched(j) || !p.ctr) return; let best = -1, bd = 1e9; parts.forEach((q, k) => { if (bone[k] < 0 || !q.ctr) return; const d = q.ctr.distanceTo(p.ctr); if (d < bd) { bd = d; best = k; } }); if (best >= 0 && bd < 0.75) follow[j] = best; });
  const order = []; const seen = new Set(); const visit = (j) => { if (seen.has(j)) return; seen.add(j); if (parts[j].parentIdx >= 0) visit(parts[j].parentIdx); if (follow[j] >= 0) visit(follow[j]); order.push(j); }; parts.forEach((_, j) => visit(j));
  // order parts parents first

  const Rinv = parts.map(p => new THREE.Matrix4().copy(p.M).invert());
  // the game's own swings stop for groups the clips drive
  const driven = new Set(A.map.map(([, j]) => parts[j].g));
  const keep = (list) => list && list.some(x => x && driven.has(x)) ? null : list;
  m.mcaOld = { legs: m.legs, arms: m.arms, wings: m.wings, tail: m.tail };
  m.legs = keep(m.legs); m.arms = keep(m.arms); m.wings = keep(m.wings); if (m.tail && driven.has(m.tail)) m.tail = null;
  // whatever the game's swing last left on those parts goes back to rest
  for (const k of ['legs', 'arms', 'wings']) if (m[k] === null && m.mcaOld[k]) for (const g of m.mcaOld[k]) if (g && g !== m.head) g.rotation.set(0, 0, 0);
  if (m.tail === null && m.mcaOld.tail) m.mcaOld.tail.rotation.set(0, 0, 0);
  // an enderman's block: in front of its chest, between the hands of its carrying arms, riding on the body
  if (m.mcaCarryMesh && !m.mcaCarryMesh.parent) { const bi = parts.findIndex(p => p.name === 'body' || p.name === 'torso'); if (bi >= 0 && parts[bi].ctr) {
      const at = parts[bi].ctr.clone(); at.y -= 0.3; at.z += 0.7; at.applyMatrix4(Rinv[bi]); m.mcaCarryMesh.position.copy(at); J[bi].add(m.mcaCarryMesh); } }
  m.mca = { mob, rig, parts, J, bone, follow, order, Rinv, fit: A.fitM, fitInv, useGeo, holder: m.bbHolder, err: A.err, missed: A.missed, W: [], D: parts.map(() => new THREE.Matrix4()),
    mode: A.mode, restInv: (useGeo ? rig.geoW : rig.restW).map(x => new THREE.Matrix4().copy(x).invert()), t: 0, walkT: 0, idleT: 0, amt: 0, one: null, state: null, stateT: 0 };
  mcaOwnBuild(m, m.mca);
}
// which clips: [base clip, mode, idle clip for blending] from the mob's state
const mcaHas = (mob, n) => !!(MCA[mob] && MCA[mob].c[n]);
function mcaPick(mob, names) { for (const n of names) if (n && mcaHas(mob, n)) return n; return null; }
const mcaInWater = (m) => { try { return isWaterId(G.world.get(Math.floor(m.pos.x), Math.floor(m.pos.y + 0.3), Math.floor(m.pos.z))); } catch (e) { return false; } };
const MCA_FISH = new Set(['cod', 'salmon', 'pufferfish', 'tropical_fish', 'tadpole', 'dolphin', 'squid', 'glow_squid', 'guardian', 'elder_guardian']);
// ---------- what the mob is doing ----------
const mcaRnd = (dt, perSec) => Math.random() < dt * perSec;
const mcaSolid = (x, y, z) => { try { return !!SOLID[G.world.get(Math.floor(x), Math.floor(y), Math.floor(z))]; } catch (e) { return false; } };
const mcaJuke = (m, r) => { if (typeof JUKE === 'undefined') return false; for (const [, J] of JUKE) { const p = J.pos; if (p && Math.abs(p[0] + 0.5 - m.pos.x) < r && Math.abs(p[1] - m.pos.y) < r && Math.abs(p[2] + 0.5 - m.pos.z) < r) return true; } return false; };
const MCA_ILLAGER = new Set(['pillager', 'vindicator', 'evoker', 'illusioner', 'witch', 'ravager']);
const MCA_HORSE = new Set(['horse', 'donkey', 'mule', 'skeleton_horse', 'zombie_horse']);
const MCA_BABYCLIP = ['baby_transform', 'humanoid_big_head', 'wolf_baby_scaling', 'hoglin_baby_scaling', 'scale'];
// timed behaviours the game doesn't have (all visual: the mob stays put while it does them)
function mcaBehave(m, M, dt) {
  const B = M.b || (M.b = {}); const mob = M.mob; const P = G.player; const dP = P ? P.pos.distanceTo(m.pos) : 99;
  const busy = m.chasing || m.hurtT > 0 || m.flee > 0 || m.rider || m.mountOf || (m.lead) || !m.onGround;
  for (const k in B) if (typeof B[k] === 'number' && k.endsWith('T')) B[k] -= dt;
  const rest = (key, perSec, lo, hi, ok) => { if (B[key + 'T'] > 0) { if (!ok || busy) B[key + 'T'] = 0; return B[key + 'T'] > 0; } if (ok && !busy && mcaRnd(dt, perSec)) B[key + 'T'] = lo + Math.random() * (hi - lo); return B[key + 'T'] > 0; };
  const day = (G.daylight || 0) > 0.55;
  if (mob === 'fox') { m.mcaSleep = rest('sleep', 1 / 25, 30, 90, day && !(dP < 5 && !(P && P.sneaking))); m.mcaSit = !m.mcaSleep && rest('sit', 1 / 60, 8, 20, true); }
  if (mob === 'cat' || mob === 'ocelot') { const near = P && S.sleeping && dP < 8 && m.tamed; m.mcaLie = near || rest('lie', 1 / 90, 10, 25, !m.sitting); }
  if (mob === 'camel' || mob === 'camel_husk') m.mcaSit = rest('sit', 1 / 120, 20, 60, !m.rider);
  if (mob === 'panda') { const pick = B.pandaPick || (B.pandaPick = ['sitting', 'lying', 'rolling'][Math.random() * 3 | 0]);
    const on = rest('panda', 1 / 50, pick === 'rolling' ? 2.5 : 8, pick === 'rolling' ? 4 : 18, true); if (!on) B.pandaPick = null; m.mcaPanda = on ? pick : null; }
  if (MCA_HORSE.has(mob)) m.mcaEat = rest('eat', 1 / 45, 2.5, 4, !m.rider);
  if (mob === 'axolotl') { m.mcaPlayDead = B.deadT > 0; }
  if (mob === 'iron_golem') m.mcaFlower = rest('flower', 1 / 150, 6, 10, day && G.mobs.some(o => o.type === 'villager' && !o.dead && o.pos.distanceToSquared(m.pos) < 36));
  if (mob === 'sniffer') { // sniff, sniff long, search about, dig, stand up, sometimes look happy
    if (!B.seq && !busy && mcaRnd(dt, 1 / 35)) B.seq = ['sniffsniff', 'long_sniff', 'search', 'dig', 'stand_up'].concat(Math.random() < 0.4 ? ['feeling_happy'] : []);
    if (B.seq && busy) B.seq = null; }
  // which ones keep the mob still
  m.mcaFreeze = !!(m.mcaSleep || m.mcaLie || m.mcaSit || m.mcaPlayDead || (m.mcaPanda && m.mcaPanda !== 'rolling') || m.mcaEat || (M.seq && M.seq.freeze) || (mob === 'warden' && B.digT > 0));
}
function mcaSeq(M, clip, opt) { const C = mcaClip(M.mob, clip); if (!C) return false; M.seq = Object.assign({ clip: C, t: 0, len: C.len || 0.5 }, opt || {}); return true; }
// one-shot clips and short sequences started by changes in what the game reports
function mcaEdges(m, M, dt) {
  const mob = M.mob, B = M.b, L = M.last || (M.last = {}); const P = G.player;
  const rose = (k, v, by) => { const o = L[k]; L[k] = v; return o !== undefined && v > o + (by || 0); };
  // melee hits: a fresh armSwing or a reset attack cooldown
  const swing = rose('swing', m.armSwing || 0, 0.05), cd = rose('atk', m.atkCD || 0, 0.3);
  if ((swing || (cd && !(m.t && m.t.ranged))) && !(mob === 'warden')) {
    const far = P && P.pos.distanceTo(m.pos) > 4.5; mcaEvent(m, m.spearMesh ? 'spear' : mob === 'frog' ? 'eat' : far && mcaHas(mob, 'damage_nearby_mobs') ? 'hitmob' : 'attack'); }
  if (m.t && m.t.ranged && rose('shoot', m.shootT || 0, 0.5) && m.chasing) mcaEvent(m, 'shoot');
  if (mob === 'warden') { if (rose('boom', m.boomT || 0, 1)) mcaEvent(m, 'sonic_boom'); if (cd) mcaEvent(m, 'attack');
    const an = m.anger || 0; if ((L.anger || 0) < 80 && an >= 80) mcaEvent(m, 'roar'); L.anger = an;
    if (an > 1 && an < 80 && mcaRnd(dt, 1 / 6)) mcaEvent(m, 'sniff'); if (an <= 0 && mcaRnd(dt, 1 / 40)) mcaEvent(m, 'shiver');
    if ((m.lostT || 0) > 56 && !(B.digT > 0)) { B.digT = 5; } }
  if (mob === 'armadillo') { const r = (m.rollT || 0) > 0; if (r && !L.roll) mcaSeq(M, m.baby ? 'baby_roll_up' : 'roll_up'); if (!r && L.roll) mcaSeq(M, m.baby ? 'baby_unroll' : (m.hurtT > 0 ? 'unroll_fast' : 'unroll')); L.roll = r; }
  if (mob === 'camel' || mob === 'camel_husk') { const s = !!m.mcaSit; if (s && !L.sit) mcaSeq(M, m.baby ? 'baby_sit_down' : 'sit_down', { freeze: true }); if (!s && L.sit) mcaSeq(M, m.baby ? 'baby_stand_up' : 'stand_up', { freeze: true }); L.sit = s; }
  if (MCA_HORSE.has(mob)) { if (rose('rear', m.rearT || 0, 0.2)) mcaSeq(M, 'stand', { freeze: true }); if (!m.mcaFreeze && mcaRnd(dt, 1 / 12)) mcaEvent(m, 'tail'); }
  if (mob === 'copper_golem') { const w = (m.cgWait || 0) > 0; if (w && !L.cgw) { const had = !!L.hold, has = !!m.cgHold; mcaSeq(M, 'chest_interaction.' + (!had && has ? 'take_item' : had && !has ? 'put_item' : had ? 'put_item_fail' : 'take_item_fail'), { freeze: true }); } L.cgw = w; L.hold = m.cgHold;
    if (!M.seq && !m.chasing && Math.hypot(m.vel.x, m.vel.z) < 0.1 && mcaRnd(dt, 1 / 25)) mcaSeq(M, ['spin', 'spin', 'spin_weathered', 'spin_oxidized'][m.cgAge || 0] || 'spin'); }
  if (mob === 'sniffer' && B.seq && !M.seq) { const n = B.seq.shift(); if (!B.seq.length) B.seq = null; if (n) mcaSeq(M, n, { freeze: n !== 'search' }); }
  if ((mob === 'frog' || mob === 'breeze') && rose('vy', m.vel.y, 2.5) && m.vel.y > 2.5) mcaEvent(m, 'jump');
  if (mob === 'rabbit' && Math.hypot(m.vel.x, m.vel.z) < 0.1 && mcaRnd(dt, 1 / 15)) mcaEvent(m, 'tilt');
  if (mob === 'creaking' && m.frozen && mcaRnd(dt, 1 / 4)) mcaEvent(m, 'twitch');
  if (mob === 'ravager' && rose('hurt', m.hurtT || 0, 0.1) && (m.hp || 0) < (m.maxHp || 100) * 0.5 && !M.seq) { mcaSeq(M, 'stunned', { freeze: true, then: 'roaring' }); }
  if ((mob === 'nautilus' || mob === 'zombie_nautilus' || mob === 'camel' || mob === 'camel_husk') && rose('dash', m.dashT || 0, 0.2)) mcaEvent(m, 'dash');
  // raiders celebrate when the player dies near them; piglins when a hoglin dies near them
  if (MCA_ILLAGER.has(mob) && P && P.dead && P.pos.distanceTo(m.pos) < 16 && !(B.celebT > 0)) B.celebT = 6;
  if ((mob === 'piglin') && !(B.huntT > 0) && G.mobs.some(o => o.type === 'hoglin' && o.dead && o.pos.distanceToSquared(m.pos) < 100 && !o.mcaMourned && (o.mcaMourned = 1))) mcaSeq(M, Math.random() < 0.1 ? 'celebrate_hunt_special' : 'celebrate_hunt');
}
function mcaState(m, M) {
  const mob = M.mob, b = m.baby, sp = Math.hypot(m.vel.x, m.vel.z), B = M.b || {};
  const P = (...n) => mcaPick(mob, b ? n.flatMap(x => ['baby_' + x, x.replace(/^(\w+)$/, '$1_baby'), x]) : n);
  let walk = (b && P('walk', 'moving', 'move', 'swim', 'walk_floor')) || mcaPick(mob, ['combined_walk', 'walk', 'move', 'moving']);
  let idle = (b && mcaPick(mob, ['baby_idle', 'baby_idle_floor'])) || mcaPick(mob, ['combined_idle', 'idle']);
  const st = (n, mode) => n ? { clip: n, mode: mode || 'rep' } : null; const over = []; const ov = (n, opt) => { if (n && mcaHas(mob, n)) over.push(Object.assign({ clip: n }, opt || {})); };
  const water = mcaInWater(m); let s = null;
  // whole-body states
  if (MCA_FISH.has(mob) && !water && m.onGround && mcaHas(mob, 'flop')) s = st('flop');
  else if (m.mcaPlayDead) s = st(P('play_dead'));
  else if (m.vSleep && mcaHas(mob, 'get_in_bed')) s = st('get_in_bed');
  else if (m.mcaSleep) s = st(P('sleep'));
  else if (m.mcaLie) s = st(P('lie_down'));
  else if (m.sitting || m.mcaSit) s = st(P('wolf_sitting', 'sitting', 'sit', 'sit_down'));
  else if (m.mcaPanda) s = st(P(m.mcaPanda));
  else if (m.roost && mob === 'bat') s = st('resting');
  else if (m.rollT > 0 && mob === 'armadillo') s = st(P(m.rollT < 1.2 ? 'peek' : 'rolled_up'));
  else if (m.emergeT > 0 && mob === 'warden') s = st('emerge');
  else if (mob === 'warden' && B.digT > 0) s = st('dig');
  else if ((mob === 'allay' || mob === 'parrot') && mcaJuke(m, mob === 'allay' ? 10 : 3)) s = st('dance');
  else if (mob === 'axolotl') s = st(water ? (sp > 0.3 ? P('swim') : (m.onGround ? P('idle_floor_water') : P('idle_float'))) : (sp > 0.3 ? P('walk_floor') : P('idle_floor')));
  else if (mob === 'frog') { if (water) s = st(sp > 0.3 ? 'swim' : 'idle_water'); }
  else if (mob === 'turtle' && !water) s = st(b ? P('move') : 'ground_move', 'walk');
  else if (mob === 'breeze' && m.onGround) s = st(sp > 0.4 ? 'slide' : 'idle');
  // walking styles
  if (mob === 'cat' || mob === 'ocelot') { const h = G.player && G.player.held && G.player.held(); const tempt = h && TEMPT_FOOD[mob] && TEMPT_FOOD[mob].includes(ITEMS[h.id] && ITEMS[h.id].key || '') && G.player.pos.distanceTo(m.pos) < 8;
    if (sp > 3.2) walk = P('sprint') || walk; else if (tempt) walk = P('sneak') || walk; }
  if (mob === 'iron_golem' && m.chasing) walk = mcaPick(mob, ['walk_to_target', 'move_to_target']) || walk;
  if (mob === 'vindicator' && m.chasing) walk = mcaPick(mob, ['vindicator_walk']) || walk;
  if (mob === 'copper_golem' && m.cgHold) walk = 'walk_holding_item';
  // things layered on top
  if (m.mountOf) { ov('riding.legs'); ov('riding.arms'); ov('riding.body'); }
  if (b && !/:baby$/.test(m.bbKey || '')) for (const n of MCA_BABYCLIP) ov(n);
  if (m.spearMesh) ov('melee_spear_hold');
  if (m.t && m.t.ranged && m.chasing) { if (mcaHas(mob, 'crossbow_charge') && (m.shootT || 9) < 1.2) ov('crossbow_charge'); else { ov('bow_and_arrow'); ov('crossbow_hold'); } }
  if (mob === 'drowned' && m.hasTrident && m.chasing && (m.throwT || 9) < 0.8) ov('brandish_spear');
  if (mcaHas(mob, 'sneaking') && !m.mountOf && m.onGround && m.t && m.t.h > 1.6 && mcaSolid(m.pos.x, m.pos.y + 1.9, m.pos.z) && !mcaSolid(m.pos.x, m.pos.y + 1.1, m.pos.z)) ov('sneaking');
  if (mob === 'zombified_piglin' && water) ov('swimming');
  if (B.celebT > 0) ov(mcaPick(mob, ['celebrating', 'celebrate']));
  if (mob === 'vex' && (m.chasing || m.charging)) ov('vex_charge');
  if (m.admireT > 0) ov('admire');
  if (m.grazeT > 0) ov(P('grazing', 'eat'));
  if (m.mcaEat) ov('eat');
  if (mob === 'wolf' && ((m.angry || 0) > 0 || (m.anger || 0) > 0)) ov('wolf_angry');
  if (mob === 'enderman') { if (m.mcaCarry) ov('carrying'); if ((m.angry || 0) > 0) ov('scary_face'); }
  if (mob === 'bee' && m.stung) ov('bee_no_stinger');
  if (mob === 'allay' && m.wants) ov(m.onGround ? 'hold_item' : 'hold_item_fly');
  if (mob === 'copper_golem' && m.cgHold && sp < 0.3) ov('hold_item');
  if ((mob === 'evoker' || mob === 'illusioner') && ((m.castT || 0) > 0 || (m.spellT || 0) > 0)) ov('casting');
  if (mob === 'fox') { const tgt = m.chasing; if (m.mcaStuck) ov('stuck'); else if (tgt && m.onGround) ov(G.player && G.player.pos.distanceTo(m.pos) < 3 ? 'wiggle' : 'crouch'); }
  if (mob === 'creaking' && m.frozen) ov('sway');
  if (mob === 'iron_golem' && m.mcaFlower) ov('flower');
  if ((mob === 'nautilus' || mob === 'zombie_nautilus') && sp < 0.5) ov('breathe');
  if (mob === 'ravager' && !m.chasing && sp < 0.2) ov('idle_mouth');
  if (mob === 'shulker' && (m.open || 0) > 0) ov('move', { w: m.open });
  if (mob === 'creeper' && (m.fuse || 0) > 0) ov('creeper_swelling', { at: Math.min(1, m.fuse / 1.5) });
  if (mob === 'sulfur_cube' && (m.fuse || 0) > 0) { B.fuse0 = Math.max(B.fuse0 || 0, m.fuse); ov('sulfur_cube_swelling', { at: 1 - m.fuse / B.fuse0 }); } else if (mob === 'sulfur_cube') B.fuse0 = 0;
  return { walk, idle, s, over };
}
// one-shot clips fired by events (sounds / actions the game reports, and the edges above)
const MCA_EVENTS = {
  attack: ['attack', 'melee_attack', 'zombie_attack_bare_hand', 'skeleton_attack', 'wither_skeleton_attack', 'vindicator_attack', 'biting', 'attack.rotations', 'attack_rotations', 'hand_attack'],
  hitmob: ['damage_nearby_mobs'], spear: ['melee_spear_use', 'attack.rotations'],
  shoot: ['shoot', 'casting'], cast: ['casting'], roar: ['roar', 'roaring'], sonic_boom: ['sonic_boom'], sniff: ['sniff', 'sniffsniff'], shiver: ['shiver'],
  dig: ['dig'], happy: ['feeling_happy'], scenting: ['long_sniff'], searching: ['search'], eat: ['tongue', 'eat'], ambient: ['croak'], jump: ['jump', 'baby_pounce'],
  dash: ['dashing'], rear: ['stand'], celebrate: ['celebrating', 'celebrate_hunt'], spin: ['spin'], tail: ['tail'], tilt: ['idle_head_tilt'], twitch: ['twitch'],
};
function mcaEvent(m, ev) { const M = m && m.mca; if (!M) return; const L = MCA_EVENTS[ev]; if (!L) return;
  const n = mcaPick(M.mob, m.baby ? L.flatMap(x => ['baby_' + x, x]) : L); if (!n) return; if (ev === 'ambient' && M.mob !== 'frog') return;
  if (ev === 'jump' && n === 'baby_pounce' && !m.baby) return; if (M.mob === 'vindicator' && ev === 'attack' && !m.axe) { const h = mcaPick(M.mob, ['vindicator_hand_attack']); if (h) return mcaOne(M, h); }
  if (M.mob === 'piglin' && ev === 'attack' && !m.held) return mcaOne(M, 'hand_attack');
  mcaOne(M, n); }
function mcaOne(M, n) { const C = mcaClip(M.mob, n); if (C) M.one = { clip: C, t: 0, len: !(C.len > 0) ? 0.4 : C.loop ? Math.min(C.len, 1.5) : C.len }; } // a held pose plays for 0.4 s
function mcaTick(m, dt) {
  if (m.dead || !m.root || m.root.visible === false) return;
  if (!m.mca || m.mca.holder !== m.bbHolder || !m.mca.holder.parent) { if (m._mcaTried === m.bbHolder) return; m._mcaTried = m.bbHolder; mcaInit(m); if (!m.mca) return; }
  const M = m.mca, rig = M.rig; const pl = G.player; const d2 = pl ? pl.pos.distanceToSquared(m.pos) : 0; if (d2 > MCA_FAR * MCA_FAR) return;
  // farther away, fewer pose updates (10 a second past 32 blocks, 20 past 16)
  M.acc = (M.acc || 0) + dt; const step = d2 > 1024 ? 0.1 : d2 > 256 ? 0.05 : 0; if (M.acc < step) return; dt = M.acc; M.acc = 0;
  mcaBehave(m, M, dt); mcaEdges(m, M, dt); mcaFixups(m, M);
  const S = mcaState(m, M); const sp = Math.hypot(m.vel.x, m.vel.z) + (m.t && m.t.fly ? Math.abs(m.vel.y) * 0.5 : 0);
  const P = {}; // pose: start from rest constants
  for (const b in rig.rest) { P[b] = {}; for (const c in rig.rest[b]) P[b][c] = rig.rest[b][c].slice(); }
  M.amt += (Math.min(1, sp * 0.4) - M.amt) * Math.min(1, dt * 6);
  const flying = m.t && (m.t.fly || m.t.swim); const walkC = mcaClip(M.mob, S.walk), idleC = mcaClip(M.mob, S.idle);
  // a short sequence (rolling up, sitting down, a chest interaction...) holds the body until it ends
  if (M.seq) { M.seq.t += dt; if (M.seq.t >= M.seq.len) { const nx = M.seq.then; M.seq = null; if (nx) mcaSeq(M, nx, { freeze: true }); } }
  const full = (C) => { if (C && C.full === undefined) C.full = Object.keys(C.ch).every(b => !rig.rest[b] || Object.keys(rig.rest[b]).every(c => C.ch[b][c])); return C && C.full; };
  if (M.seq) { M.state = null; mcaAccum(P, rig, M.seq.clip, M.seq.t, 1, full(M.seq.clip) ? 'rep' : 'add'); if (!full(M.seq.clip) && idleC) mcaAccum(P, rig, idleC, M.idleT += dt, 1, 'rep'); }
  else if (S.s && S.s.mode === 'rep') { if (M.state !== S.s.clip) { M.state = S.s.clip; M.stateT = 0; } M.stateT += dt; const C = mcaClip(M.mob, S.s.clip);
    // a pose clip that writes every resting channel of the bones it touches is a whole pose (the wolf sitting);
    // one that leaves some out goes on top of the resting pose (the parrot sitting keeps its folded wings)
    mcaAccum(P, rig, C, M.stateT, 1, full(C) ? 'rep' : 'add'); }
  else {
    // walking blends into idle as the mob slows down; swimmers and fliers keep their loop going; a mob with no
    // idle clip eases its walk out to the resting pose
    M.state = null; const amt = flying && !idleC ? 1 : M.amt;
    M.walkT += dt * (flying ? 1 : Math.max(0.35, Math.min(2.5, sp * 0.55))); M.idleT += dt;
    if (S.s && S.s.mode === 'walk') mcaAccum(P, rig, mcaClip(M.mob, S.s.clip), M.walkT, amt, 'rep');
    else { mcaAccum(P, rig, walkC, M.walkT, walkC ? amt : 0, full(walkC) || /^combined/.test(S.walk) ? 'rep' : 'add'); if (idleC && walkC !== idleC) mcaAccum(P, rig, idleC, M.idleT, walkC ? 1 - amt : 1, 'rep'); }
  }
  // layers: each keeps its own clock; clips tied to a value (a creeper's fuse) are posed at that point
  const OT = M.ot || (M.ot = {}); const seen = {};
  for (const o of S.over) { const C = mcaClip(M.mob, o.clip); if (!C) continue; seen[o.clip] = 1; OT[o.clip] = (OT[o.clip] || 0) + dt;
    mcaAccum(P, rig, C, o.at !== undefined ? o.at * C.len : OT[o.clip], o.w === undefined ? 1 : o.w, 'add'); }
  for (const k in OT) if (!seen[k]) delete OT[k];
  if (M.one) { M.one.t += dt; mcaAccum(P, rig, M.one.clip, M.one.t, 1, 'add'); if (M.one.t >= M.one.len) M.one = null; }
  mcaApply(m, P);
}
// undo the game's own stand-ins for poses the clips now do
function mcaFixups(m, M) {
  if (m.vSleep && mcaHas(M.mob, 'get_in_bed') && m.root) m.root.rotation.x = 0;
  if (M.mob === 'armadillo' && m.body && m.baseScale) { m.body.scale.setScalar(m.baseScale); if (m.head) m.head.visible = true; }
  if (M.mob === 'fox') m.mcaStuck = (() => { try { const id = G.world.get(Math.floor(m.pos.x), Math.floor(m.pos.y), Math.floor(m.pos.z)); return BL[id] && /powder_snow/.test(BL[id].key || BL[id].name || ''); } catch (e) { return false; } })();
}
// bone deltas in model space, handed down the model's own hierarchy
function mcaApply(m, P) {
  const M = m.mca, rig = M.rig;
  if (M.own && M.own.length) { const Wa = mcaPose(rig, P, M.Wa || (M.Wa = []), MCA_ABSPOS.has(M.mob)); for (const [i, o] of M.own) { o.matrix.multiplyMatrices(M.fit, Wa[i]); o.matrixWorldNeedsUpdate = true; } for (const g of M.hidden) g.visible = false; }
  // the model is built like the plain skeleton: movement is measured from it, with the resting constants taken out
  // (some skeletons write their setup as absolute offsets, e.g. the wolf's legs at y -16)
  if (M.useGeo) for (const b in rig.rest) { const A = P[b]; if (!A) continue; for (const c in rig.rest[b]) { const a = A[c], r = rig.rest[b][c]; if (!a) continue;
    for (let i = 0; i < 3; i++) a[i] = c === 's' ? a[i] / (Math.abs(r[i]) > 1e-4 ? r[i] : 1) : a[i] - r[i]; } }
  const W = mcaPose(rig, P, M.W);
  for (const j of M.order) { const i = M.bone[j]; const D = M.D[j], par = M.parts[j].parentIdx; const f = M.follow[j];
    if (i >= 0) { D.multiplyMatrices(W[i], M.restInv[i]); D.premultiply(M.fit).multiply(M.fitInv); }
    else if (f >= 0) D.copy(M.D[f]);
    else if (par >= 0) D.copy(M.D[par]); else D.identity();
    const L = M.J[j].matrix; // R^-1 * Dparent^-1 * D * R
    if (i < 0 && f < 0) { L.identity(); M.J[j].matrixWorldNeedsUpdate = true; continue; }
    if (par >= 0) { mcaM.copy(M.D[par]).invert(); L.multiplyMatrices(mcaM, D); } else L.copy(D);
    L.premultiply(M.Rinv[j]).multiply(M.parts[j].M); M.J[j].matrixWorldNeedsUpdate = true; }
}
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) {
    // sleeping, lying, sitting, playing dead, grazing... keep the mob where it is (gravity still works)
    const hold = this.mcaFreeze && !this.dead && !this.chasing && !(this.hurtT > 0); const x = this.pos.x, z = this.pos.z, yaw = this.yaw;
    const r = _u.apply(this, arguments);
    if (hold && !this.dead) { this.pos.x = x; this.pos.z = z; this.vel.x = 0; this.vel.z = 0; this.yaw = yaw; if (this.root) { this.root.position.x = x; this.root.position.z = z; } }
    try { mcaTick(this, dt); } catch (e) { if (!mcaTick.warned) { mcaTick.warned = 1; console.warn('mob animation', this.type, e); } } return r; }; }
// axolotls hurt in water with half their health or less play dead for 10 seconds (like Minecraft)
{ const _h = Mob.prototype.hurt; Mob.prototype.hurt = function (dmg) { const r = _h.apply(this, arguments);
    try { if (this.type === 'axolotl' && !this.dead && this.mca && (this.hp || 0) <= (this.maxHp || 14) * 0.5 && mcaInWater(this) && Math.random() < 0.33) { const B = this.mca.b || (this.mca.b = {}); B.deadT = 10; } } catch (e) { } return r; }; }
// some endermen carry a block (grass, dirt, sand...) the way they do in Minecraft: just carried, nothing is taken
{ const _sm = spawnMob; spawnMob = function (type, x, y, z, opts) { const m = _sm.apply(this, arguments);
    try { if (m && type === 'enderman' && Math.random() < 0.3 && typeof blockGeo === 'function') { const ids = ['GRASS', 'DIRT', 'SAND', 'GRAVEL', 'RED_MUSHROOM', 'PUMPKIN'].map(k => B[k]).filter(Boolean); const id = ids[Math.random() * ids.length | 0];
      if (id) { m.mcaCarry = id; const mesh = new THREE.Mesh(blockGeo(id), handMat); mesh.scale.setScalar(0.5); m.mcaCarryMesh = mesh; } } } catch (e) { } return m; }; }
// the older keyframe player stays off for mobs the owner's clips drive
if (typeof kfTick === 'function') { const _kt = kfTick; kfTick = function (m, dt) { if (m && mcaFolder(m.type) && m.mca) return; if (m && mcaFolder(m.type) && m._mcaTried === undefined) return; return _kt.apply(this, arguments); }; }
{ const _ev = typeof kfEvent === 'function' ? kfEvent : null; if (_ev) kfEvent = function (m, ev) { if (m && m.mca) return mcaEvent(m, ev); return _ev.apply(this, arguments); };
  else { const _act = MobSnd.act.bind(MobSnd); MobSnd.act = function (m, kind) { try { mcaEvent(m, kind); } catch (e) { } return _act.apply(this, arguments); }; } }

// ---------- the player (third person and other players) ----------
// The player model's own animation already does Minecraft's swings by tool, bows, crossbows, shields, sneaking,
// swimming, crawling, riding, spears and tridents. On top of that: the owner's walk (move.arms / move.legs) replaces
// the game's leg and arm swing, and the spyglass and brushing poses come from the owner's clips. The player model's
// parts use the same angle signs as the clips (Java's), so values go straight on.
function mcaPlayerPose(M, dt, speed) {
  if (!MCA.player) return; const P = M.P; const ca = mcaClip('player', 'move.arms'), cl = mcaClip('player', 'move.legs'); if (!ca || !cl) return;
  const v = [0, 0, 0]; const R = MCA_R; const t = ((M.walk || 0) / (Math.PI * 2)) % 1; const amp = Math.min(1, speed / 4);
  const base = Math.sin(M.walk || 0) * amp * 0.8; const w = amp * 0.75;
  // legs: the game's swing (sin * 0.8, then x1.35) comes off, the owner's goes on
  const L = (part, bone, sign) => { const ks = cl.ch[bone] && cl.ch[bone].r; if (!ks || !part) return; mcaSample(ks, t * cl.len, v); part.rotation.x += -sign * base * 1.35 + v[0] * R * w; };
  L(P.legR, 'rightLeg', 1); L(P.legL, 'leftLeg', -1);
  const A = (part, bone, sign, held) => { const ks = ca.ch[bone] && ca.ch[bone].r; if (!ks || !part) return; mcaSample(ks, t * ca.len, v); const f = held ? 0.5 : 1; part.rotation.x += (sign * base * 0.8 + v[0] * R * w) * f; };
  if (!(M._swingT > 0)) { A(P.armR, 'rightArm', 1, M.mainId); A(P.armL, 'leftArm', -1, M.offId); }
  const pose = (n, part, bone) => { const C = mcaClip('player', n); const ks = C && C.ch[bone] && C.ch[bone].r; if (!ks || !part) return; mcaSample(ks, ((M._poseT = (M._poseT || 0) + dt) % (C.len || 1)), v); part.rotation.set(v[0] * R, v[1] * R, v[2] * R); };
  const act = M.act || {}; if (act.spy) pose('holding_spyglass', P.armR, 'rightArm'); else if (act.brush) pose('brushing', P.armR, 'rightArm');
}
{ const _mk = makePlayerModel; makePlayerModel = function (skin, name) { const M = _mk(skin, name); const an = M.animate;
    M.animate = function (dt, speed, pitch, swing, sneak, hurt, o) { const r = an.apply(this, arguments); this._swingT = swing; try { mcaPlayerPose(this, dt, speed); } catch (e) { } return r; }; return M; }; }
if (typeof myAct === 'function') { const _ma = myAct; myAct = function () { const o = _ma.apply(this, arguments); try { const hd = G.player && G.player.heldDef && G.player.heldDef(); if (S.spyglass) o.spy = 1; if (hd && hd.kind === 'brush' && typeof mouseR !== 'undefined' && mouseR && typeof BRUSH !== 'undefined' && BRUSH && BRUSH.k) o.brush = 1; } catch (e) { } return o; }; }

// ---------- the ender dragon ----------
// The owner's dragon clips are single held poses (no timeline): legs folded back for flight, the jaw a little open.
// Those go onto the game's dragon (its legs are single pieces, so each leg takes its upper bone's angle); its wing
// flap, neck sway and tail stay as they are, since a held pose would stop the wings.
if (typeof Dragon === 'function') { const _an = Dragon.prototype.animate; Dragon.prototype.animate = function (dt, flapK) { const r = _an.apply(this, arguments);
    try { const C = mcaClip('ender_dragon', 'combined_walk') || mcaClip('ender_dragon', 'combined_idle'); if (!C) return r; const v = [0, 0, 0];
      const ang = (b) => { const ks = C.ch[b] && C.ch[b].r; if (!ks) return null; mcaSample(ks, 0, v); return [v[0] * MCA_R, -v[1] * MCA_R, -v[2] * MCA_R]; };
      if (this.legs) this.legs.forEach((g, i) => { const a = ang(i < 2 ? (i ? 'frontleg1' : 'frontleg') : (i === 2 ? 'rearleg' : 'rearleg1')); if (a && g) g.rotation.set(a[0], a[1], a[2]); });
      const j = ang('jaw'); if (j && this.jaw && !(this.jawT > 0)) { const x = ((j[0] % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); this.jaw.rotation.x = (x > Math.PI ? x - Math.PI * 2 : x) + Math.sin(this.age * 2) * 0.05; }
    } catch (e) { } return r; }; }

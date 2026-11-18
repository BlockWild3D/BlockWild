// ================= MINECRAFT JAVA MOB MODELS AND ANIMATIONS =================
// Mobs are drawn with Minecraft Java 1.21.11's own model layouts (02j_javamodels_data.js: every part, pivot, starting
// rotation, cube and UV of each layer) and moved by rewrites of each model's setupAnim, plus Java's keyframe player
// for the mobs that use keyframe animations. The textures stay the game's own (same layout as Java's).
//
// Java model space has y pointing down and the model facing -z; the game has y up and mobs facing +z. A part at
// (x, y, z) pixels sits at (x, -y, -z) / 16 here, and a rotation (xRot, yRot, zRot) becomes Euler ZYX (xRot, -yRot, -zRot).
// The whole model hangs 1.501 blocks up, like LivingEntityRenderer's translate.
//
// Per mob the game fills a render state each frame like Minecraft's EntityRenderState: ageInTicks, the walk animation
// (WalkAnimationState: speed eases 40% per tick toward 4x the distance moved per tick, capped at 1; position adds the
// speed every tick, 3x for babies), head yaw and pitch relative to the body (LookAtPlayerGoal: 2% chance per tick to
// look at a player within 8 blocks for 2-4 s; RandomLookAroundGoal: 2% chance to look somewhere random for 1-2 s;
// the head turns at most 75 degrees from the body), attack swing time (6 ticks), and the mob's own flags.

const JM_D2R = Math.PI / 180;
const jmth = {
  cos: Math.cos, sin: Math.sin, clamp: (v, a, b) => v < a ? a : v > b ? b : v, lerp: (t, a, b) => a + t * (b - a),
  rotLerpRad(t, a, b) { let d = b - a; while (d < -Math.PI) d += Math.PI * 2; while (d >= Math.PI) d -= Math.PI * 2; return a + t * d; },
  triangleWave: (f, p) => (Math.abs(f % p - p * 0.5) - p * 0.25) / (p * 0.25),
  catmullrom: (f, a, b, c, d) => 0.5 * (2 * b + (c - a) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (3 * b - a - 3 * c + d) * f * f * f),
};

// ---------- model parts (ModelPart) ----------
class JmPart {
  constructor(def, mat, tw, th, name) {
    const [p, r, s, hid, cubes, kids] = def; this.name = name;
    this.init = { x: p[0], y: p[1], z: p[2], xRot: r[0], yRot: r[1], zRot: r[2], xs: s ? s[0] : 1, ys: s ? s[1] : 1, zs: s ? s[2] : 1, vis: !hid };
    this.obj = new THREE.Group(); this.obj.rotation.order = 'ZYX'; this.obj.userData.inner = this.obj; this.obj.name = name;
    if (cubes.length) {
      const pos = [], uv = [], idx = []; let n = 0;
      for (const cube of cubes) for (const pg of cube) { for (let i = 0; i < 20; i += 5) { pos.push(pg[i] / 16, -pg[i + 1] / 16, -pg[i + 2] / 16); uv.push(pg[i + 3] / tw, 1 - pg[i + 4] / th); } idx.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      this.mesh = new THREE.Mesh(g, mat); this.mesh.castShadow = true; this.obj.add(this.mesh);
    }
    this.kids = {}; for (const k in kids) { const c = new JmPart(kids[k], mat, tw, th, k); this.kids[k] = c; this.obj.add(c.obj); }
    this.resetPose();
  }
  resetPose() { const i = this.init; this.x = i.x; this.y = i.y; this.z = i.z; this.xRot = i.xRot; this.yRot = i.yRot; this.zRot = i.zRot; this.xScale = i.xs; this.yScale = i.ys; this.zScale = i.zs; this.visible = i.vis; }
  sync() { const o = this.obj; o.position.set(this.x / 16, -this.y / 16, -this.z / 16); o.rotation.set(this.xRot, -this.yRot, -this.zRot); o.scale.set(this.xScale, this.yScale, this.zScale); o.visible = this.visible; for (const k in this.kids) this.kids[k].sync(); }
  all(out = []) { out.push(this); for (const k in this.kids) this.kids[k].all(out); return out; }
}
function jmBuild(layer, mat) {
  const L = JAVA_LAYERS[layer]; if (!L) return null; const [tw, th, def] = L;
  const root = new JmPart(def, mat, tw, th, 'root'); const P = {}; for (const p of root.all()) if (p !== root && !P[p.name]) P[p.name] = p; P.__root = root;
  return { root, P, layer, tw, th };
}

// ---------- which Java layer a game model is ----------
// game models are "type[:variant][:baby]"; Java layers are "[variant_]type[_baby]#layer"
const JM_TYPE = { zombie_villager: 'zombie_villager' };
function jmLayerFor(key) {
  const bits = key.split(':'); const base = bits[0]; const baby = bits.includes('baby'); const vr = bits.slice(1).find(b => b !== 'baby' && b !== 'all');
  const cands = []; if (vr) cands.push(vr + '_' + base); cands.push(base);
  for (const c of cands) { const k = c + (baby ? '_baby' : '') + '#main'; if (JAVA_LAYERS[k]) return k.slice(0, -5); }
  return null;
}
// the game's overlay layers and the Java layer they are
const JM_OVERLAY = { helmet: '#helmet', chest: '#chestplate', legs: '#leggings', boots: '#boots', outer: '#outer', saddle: '#saddle', wool: '#wool', collar: '#collar|#main', markings: '#main', cracks: '#main', armor: '=wolf{baby}_armor', armor_overlay: '=wolf{baby}_armor', type: '#main', job: '#main', level: '#main', decor: '#decor', pattern: '#pattern' };

// ---------- the mobs done so far, and their animations ----------
const JM = {};
const jmQuadLegs = (P, S) => { const f = S.wp, f2 = S.ws; P.right_hind_leg.xRot = jmth.cos(f * 0.6662) * 1.4 * f2; P.left_hind_leg.xRot = jmth.cos(f * 0.6662 + Math.PI) * 1.4 * f2; P.right_front_leg.xRot = jmth.cos(f * 0.6662 + Math.PI) * 1.4 * f2; P.left_front_leg.xRot = jmth.cos(f * 0.6662) * 1.4 * f2; };
const jmHeadLook = (P, S) => { if (P.head) { P.head.xRot = S.xRot * JM_D2R; P.head.yRot = S.yRot * JM_D2R; } };
function jmBobPart(p, age, s) { p.zRot += s * (jmth.cos(age * 0.09) * 0.05 + 0.05); p.xRot += s * (jmth.sin(age * 0.067) * 0.05); }
function jmBobArms(r, l, age) { jmBobPart(r, age, 1); jmBobPart(l, age, -1); }
const jmQuadratic = (f) => -65 * f + f * f;
// HumanoidModel.setupAnim
function jmHumanoid(P, S) {
  jmHeadLook(P, S); const f2 = S.wp, f3 = S.ws, sv = 1;
  if (S.swim > 0) P.head.xRot = jmth.rotLerpRad(S.swim, P.head.xRot, -0.7853982);
  P.right_arm.xRot = jmth.cos(f2 * 0.6662 + Math.PI) * 2 * f3 * 0.5 / sv; P.left_arm.xRot = jmth.cos(f2 * 0.6662) * 2 * f3 * 0.5 / sv;
  P.right_leg.xRot = jmth.cos(f2 * 0.6662) * 1.4 * f3 / sv; P.left_leg.xRot = jmth.cos(f2 * 0.6662 + Math.PI) * 1.4 * f3 / sv;
  P.right_leg.yRot = 0.005; P.left_leg.yRot = -0.005; P.right_leg.zRot = 0.005; P.left_leg.zRot = -0.005;
  if (S.riding) { P.right_arm.xRot += -0.62831855; P.left_arm.xRot += -0.62831855; P.right_leg.xRot = -1.4137167; P.right_leg.yRot = 0.31415927; P.right_leg.zRot = 0.07853982; P.left_leg.xRot = -1.4137167; P.left_leg.yRot = -0.31415927; P.left_leg.zRot = -0.07853982; }
  const pose = (arm, right, kind) => { const a = P[arm];
    if (kind === 'empty') a.yRot = 0;
    else if (kind === 'item') { a.xRot = a.xRot * 0.5 - 0.31415927; a.yRot = 0; }
    else if (kind === 'bow') { P.right_arm.yRot = -0.1 + P.head.yRot - (right ? 0 : 0.4); P.left_arm.yRot = 0.1 + P.head.yRot + (right ? 0.4 : 0); P.right_arm.xRot = -1.5707964 + P.head.xRot; P.left_arm.xRot = -1.5707964 + P.head.xRot; }
    else if (kind === 'crossbow') { const m4 = right ? P.right_arm : P.left_arm, m5 = right ? P.left_arm : P.right_arm; m4.yRot = (right ? -0.3 : 0.3) + P.head.yRot; m5.yRot = (right ? 0.6 : -0.6) + P.head.yRot; m4.xRot = -1.5707964 + P.head.xRot + 0.1; m5.xRot = -1.5 + P.head.xRot; }
    else if (kind === 'throw') { a.xRot = a.xRot * 0.5 - Math.PI; a.yRot = 0; } };
  pose('right_arm', true, S.rArm || 'empty'); if (!/bow|crossbow/.test(S.rArm || '')) pose('left_arm', false, S.lArm || 'empty');
  // setupAttackAnimation
  const f = S.attack; if (f > 0) {
    P.body.yRot = jmth.sin(Math.sqrt(f) * Math.PI * 2) * 0.2; const as = S.ageScale;
    P.right_arm.z = jmth.sin(P.body.yRot) * 5 * as; P.right_arm.x = -jmth.cos(P.body.yRot) * 5 * as; P.left_arm.z = -jmth.sin(P.body.yRot) * 5 * as; P.left_arm.x = jmth.cos(P.body.yRot) * 5 * as;
    P.right_arm.yRot += P.body.yRot; P.left_arm.yRot += P.body.yRot; P.left_arm.xRot += P.body.yRot;
    const f3q = 1 - Math.pow(1 - f, 4); const f4 = jmth.sin(f3q * Math.PI); const f5 = jmth.sin(f * Math.PI) * -(P.head.xRot - 0.7) * 0.75;
    P.right_arm.xRot -= f4 * 1.2 + f5; P.right_arm.yRot += P.body.yRot * 2; P.right_arm.zRot += jmth.sin(f * Math.PI) * -0.4;
  }
  if (S.rArm !== 'spyglass') jmBobPart(P.right_arm, S.age, 1); if (S.lArm !== 'spyglass') jmBobPart(P.left_arm, S.age, -1);
  if (S.swim > 0) { const f6 = f2 % 26, sw = S.swim, f7 = S.attack > 0 ? 0 : sw, f5 = sw;
    if (f6 < 14) { P.left_arm.xRot = jmth.rotLerpRad(f5, P.left_arm.xRot, 0); P.right_arm.xRot = jmth.lerp(f7, P.right_arm.xRot, 0); P.left_arm.yRot = jmth.rotLerpRad(f5, P.left_arm.yRot, Math.PI); P.right_arm.yRot = jmth.lerp(f7, P.right_arm.yRot, Math.PI);
      P.left_arm.zRot = jmth.rotLerpRad(f5, P.left_arm.zRot, Math.PI + 1.8707964 * jmQuadratic(f6) / jmQuadratic(14)); P.right_arm.zRot = jmth.lerp(f7, P.right_arm.zRot, Math.PI - 1.8707964 * jmQuadratic(f6) / jmQuadratic(14)); }
    else if (f6 < 22) { const t = (f6 - 14) / 8; P.left_arm.xRot = jmth.rotLerpRad(f5, P.left_arm.xRot, 1.5707964 * t); P.right_arm.xRot = jmth.lerp(f7, P.right_arm.xRot, 1.5707964 * t); P.left_arm.yRot = jmth.rotLerpRad(f5, P.left_arm.yRot, Math.PI); P.right_arm.yRot = jmth.lerp(f7, P.right_arm.yRot, Math.PI);
      P.left_arm.zRot = jmth.rotLerpRad(f5, P.left_arm.zRot, 5.012389 - 1.8707964 * t); P.right_arm.zRot = jmth.lerp(f7, P.right_arm.zRot, 1.2707963 + 1.8707964 * t); }
    else { const t = (f6 - 22) / 4; P.left_arm.xRot = jmth.rotLerpRad(f5, P.left_arm.xRot, 1.5707964 - 1.5707964 * t); P.right_arm.xRot = jmth.lerp(f7, P.right_arm.xRot, 1.5707964 - 1.5707964 * t); P.left_arm.yRot = jmth.rotLerpRad(f5, P.left_arm.yRot, Math.PI); P.right_arm.yRot = jmth.lerp(f7, P.right_arm.yRot, Math.PI); P.left_arm.zRot = jmth.rotLerpRad(f5, P.left_arm.zRot, Math.PI); P.right_arm.zRot = jmth.lerp(f7, P.right_arm.zRot, Math.PI); }
    P.left_leg.xRot = jmth.lerp(sw, P.left_leg.xRot, 0.3 * jmth.cos(f2 * 0.33333334 + Math.PI)); P.right_leg.xRot = jmth.lerp(sw, P.right_leg.xRot, 0.3 * jmth.cos(f2 * 0.33333334)); }
}
// AnimationUtils.animateZombieArms
function jmZombieArms(P, S) { const f = S.attack, f2 = -Math.PI / (S.aggressive ? 1.5 : 2.25), f3 = jmth.sin(f * Math.PI), f4 = jmth.sin((1 - (1 - f) * (1 - f)) * Math.PI);
  P.right_arm.zRot = 0; P.right_arm.yRot = -(0.1 - f3 * 0.6); P.right_arm.xRot = f2 + f3 * 1.2 - f4 * 0.4;
  P.left_arm.zRot = 0; P.left_arm.yRot = 0.1 - f3 * 0.6; P.left_arm.xRot = f2 + f3 * 1.2 - f4 * 0.4; jmBobArms(P.right_arm, P.left_arm, S.age); }
const jmZombieAnim = (P, S) => { jmHumanoid(P, S); jmZombieArms(P, S); };
for (const k of ['zombie', 'husk', 'zombie_villager']) JM[k] = { anim: jmZombieAnim };
JM.drowned = { anim(P, S) { jmZombieAnim(P, S); const f = S.swim; if (f > 0) { const s = jmth.sin(0.1 * S.age);
  P.right_arm.xRot = jmth.rotLerpRad(f, P.right_arm.xRot, -2.5132742) + f * 0.35 * s; P.left_arm.xRot = jmth.rotLerpRad(f, P.left_arm.xRot, -2.5132742) - f * 0.35 * s;
  P.right_arm.zRot = jmth.rotLerpRad(f, P.right_arm.zRot, -0.15); P.left_arm.zRot = jmth.rotLerpRad(f, P.left_arm.zRot, 0.15); P.left_leg.xRot -= f * 0.55 * s; P.right_leg.xRot += f * 0.55 * s; P.head.xRot = 0; } } };
// SkeletonModel: holds its bow; draws it at you when aggressive; a sword holder raises both arms to attack
const jmSkeletonAnim = (P, S) => { S.rArm = S.aggressive && S.bow ? 'bow' : 'item'; jmHumanoid(P, S);
  if (S.aggressive && !S.bow) { const f = S.attack, f2 = jmth.sin(f * Math.PI), f3 = jmth.sin((1 - (1 - f) * (1 - f)) * Math.PI);
    P.right_arm.zRot = 0; P.left_arm.zRot = 0; P.right_arm.yRot = -(0.1 - f2 * 0.6); P.left_arm.yRot = 0.1 - f2 * 0.6; P.right_arm.xRot = -1.5707964 - (f2 * 1.2 - f3 * 0.4); P.left_arm.xRot = -1.5707964 - (f2 * 1.2 - f3 * 0.4); jmBobArms(P.right_arm, P.left_arm, S.age); } };
for (const k of ['skeleton', 'stray', 'bogged', 'parched']) JM[k] = { anim: jmSkeletonAnim, bow: true };
JM.wither_skeleton = { anim: jmSkeletonAnim };
// EndermanModel
JM.enderman = { anim(P, S) { jmHumanoid(P, S); P.head.visible = true;
  for (const n of ['right_arm', 'left_arm', 'right_leg', 'left_leg']) P[n].xRot = jmth.clamp(P[n].xRot * 0.5, -0.4, 0.4);
  if (S.carrying) { P.right_arm.xRot = -0.5; P.left_arm.xRot = -0.5; P.right_arm.zRot = 0.05; P.left_arm.zRot = -0.05; }
  if (S.creepy) { P.head.y -= 5; if (P.hat) P.hat.y += 5; } } };
// QuadrupedModel and family
const jmQuadAnim = (P, S) => { jmHeadLook(P, S); jmQuadLegs(P, S); };
for (const k of ['cow', 'mooshroom', 'pig']) JM[k] = { anim: jmQuadAnim };
JM.sheep = { anim(P, S) { jmQuadAnim(P, S); P.head.y += (S.eatPos || 0) * 9 * S.ageScale; if (S.eatPos) P.head.xRot = S.eatAngle; } };
JM.creeper = { anim: jmQuadAnim };
JM.spider = JM.cave_spider = { anim(P, S) { jmHeadLook(P, S); const f = S.wp * 0.6662, f2 = S.ws;
  const y = (o) => -(jmth.cos(f * 2 + o) * 0.4) * f2, z = (o) => Math.abs(jmth.sin(f + o) * 0.4) * f2;
  const f3 = y(0), f4 = y(Math.PI), f5 = y(1.5707964), f6 = y(4.712389), f7 = z(0), f8 = z(Math.PI), f9 = z(1.5707964), f10 = z(4.712389);
  P.right_hind_leg.yRot += f3; P.left_hind_leg.yRot -= f3; P.right_middle_hind_leg.yRot += f4; P.left_middle_hind_leg.yRot -= f4; P.right_middle_front_leg.yRot += f5; P.left_middle_front_leg.yRot -= f5; P.right_front_leg.yRot += f6; P.left_front_leg.yRot -= f6;
  P.right_hind_leg.zRot += f7; P.left_hind_leg.zRot -= f7; P.right_middle_hind_leg.zRot += f8; P.left_middle_hind_leg.zRot -= f8; P.right_middle_front_leg.zRot += f9; P.left_middle_front_leg.zRot -= f9; P.right_front_leg.zRot += f10; P.left_front_leg.zRot -= f10; } };
JM.chicken = { anim(P, S) { const f = (jmth.sin(S.flap) + 1) * S.flapSpeed; jmHeadLook(P, S);
  P.right_leg.xRot = jmth.cos(S.wp * 0.6662) * 1.4 * S.ws; P.left_leg.xRot = jmth.cos(S.wp * 0.6662 + Math.PI) * 1.4 * S.ws; P.right_wing.zRot = f; P.left_wing.zRot = -f; } };
JM.iron_golem = { anim(P, S) { const f = S.golemAtk || 0, f2 = S.ws, f3 = S.wp;
  if (f > 0) { P.right_arm.xRot = -2 + 1.5 * jmth.triangleWave(f, 10); P.left_arm.xRot = -2 + 1.5 * jmth.triangleWave(f, 10); }
  else if (S.flower > 0) { P.right_arm.xRot = -0.8 + 0.025 * jmth.triangleWave(S.flower, 70); P.left_arm.xRot = 0; }
  else { P.right_arm.xRot = (-0.2 + 1.5 * jmth.triangleWave(f3, 13)) * f2; P.left_arm.xRot = (-0.2 - 1.5 * jmth.triangleWave(f3, 13)) * f2; }
  jmHeadLook(P, S); P.right_leg.xRot = -1.5 * jmth.triangleWave(f3, 13) * f2; P.left_leg.xRot = 1.5 * jmth.triangleWave(f3, 13) * f2; P.right_leg.yRot = 0; P.left_leg.yRot = 0; } };
JM.villager = JM.wandering_trader = { anim(P, S) { jmHeadLook(P, S);
  if (S.unhappy) { P.head.zRot = 0.3 * jmth.sin(0.45 * S.age); P.head.xRot = 0.4; } else P.head.zRot = 0;
  P.right_leg.xRot = jmth.cos(S.wp * 0.6662) * 1.4 * S.ws * 0.5; P.left_leg.xRot = jmth.cos(S.wp * 0.6662 + Math.PI) * 1.4 * S.ws * 0.5; P.right_leg.yRot = 0; P.left_leg.yRot = 0; } };

const JM_OFS = { phantom: [0, -1.3125, -0.1875], squid: [0, -0.7, 0], glow_squid: [0, -0.7, 0] };
const JM_HIDE = { vindicator: ['hat'], evoker: ['hat'], pillager: ['hat'] };
// ---------- attaching a Java model to a mob ----------
function jmAttach(m, key) {
  if (!m || !m.t || !m.bbHolder || isClientMPModelOnly(m)) return;
  const base = key.split(':')[0]; const spec = JM[base]; if (!spec) return;
  const layer = jmLayerFor(key); const M = BB_MODELS[key]; if (!layer || !M) return;
  const L = JAVA_LAYERS[layer + '#main']; if (!L || L[0] !== M.w || L[1] !== M.h) return; // the texture has to be laid out for this model
  const models = []; const main = jmBuild(layer + '#main', m.bbBase); if (!main) return; models.push(main);
  for (const [nm, lm] of Object.entries(m.bbLayer || {})) { const map = JM_OVERLAY[nm]; const want = map ? map.split('|') : [];
    const plain = key.split(':')[0] + (/:baby$/.test(key) ? '_baby' : ''); let mm = null;
    for (const w of want) if (w[0] === '=' ? (mm = jmBuild(w.slice(1).replace('{baby}', /:baby$/.test(key) ? '_baby' : '') + '#main', lm)) : ((mm = jmBuild(layer + w, lm)) || (mm = jmBuild(plain + w, lm)))) break;
    if (!mm) return; mm.overlay = nm; models.push(mm); } // a layer we can't draw yet: keep the old model for this mob
  // parts the Java model classes hide when they are made (IllagerModel hides the hat; only the illusioner shows it)
  for (const md of models) for (const n of JM_HIDE[base] || []) if (md.P[n]) md.P[n].init.vis = false;
  const grp = new THREE.Group(); grp.position.y = 1.501; grp.name = 'java';
  for (const md of models) grp.add(md.root.obj);
  // the old geometry stays around hidden (other code still measures it), the Java model takes over
  const old = new THREE.Group(); old.visible = false; while (m.bbHolder.children.length) old.add(m.bbHolder.children[0]); m.bbHolder.add(old); m.bbHolder.add(grp); m.bbOldGeo = old;
  // renderer offsets (PhantomRenderer, SquidRenderer), and a size check: some Java models carry their renderer scale
  // in the model itself (ghasts are built 4.5x), where the old model was scaled by the holder instead
  const ofs = JM_OFS[base]; if (ofs) grp.position.add(new THREE.Vector3(ofs[0], ofs[1] * (/:baby$/.test(key) ? 0.5 : 1), ofs[2]));
  { old.visible = true; const hb = new THREE.Box3(), jb = new THREE.Box3(); m.bbHolder.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(m.bbHolder.matrixWorld).invert();
    const meas = (o, b) => o.traverse(x => { if (x.isMesh && x.geometry) { x.geometry.computeBoundingBox(); b.union(x.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, x.matrixWorld))); } });
    jmPoseModels(models); grp.updateMatrixWorld(true); meas(old, hb); meas(grp, jb); old.visible = false;
    const hh = hb.max.y - hb.min.y, jh = jb.max.y - jb.min.y; if (hh > 0.05 && jh > 0.05) { const r = hh / jh; if (r > 1.3 || r < 0.77) grp.scale.setScalar(r); } }
  m.jm = { spec, models, main, grp, S: { age: 0, wp: 0, ws: 0, yRot: 0, xRot: 0, attack: 0, flap: 0, flapSpeed: 0, tailAngle: 0.62831855, eatPos: 0, eatAngle: 0, swim: 0, ageScale: /:baby$/.test(key) ? 0.5 : 1, baby: /:baby$/.test(key) } };
  // other code finds parts by name on the main model
  const parts = {}; for (const n in main.P) parts[n] = main.P[n].obj; m.bbParts = parts; m.jmLook = m.jmLook || { t: 0, yaw: 0, pitch: 0, kind: null };
  m.head = m.legs = m.arms = m.wings = m.tail = undefined; m.mca = null;
  jmPose(m);
}
function isClientMPModelOnly(m) { return false; }
{ const _b = buildBBModel; buildBBModel = function (m, root, key, opt) { const r = _b.apply(this, arguments); try { jmAttach(m, key); } catch (e) { console.warn('java model', key, e); } return r; }; }

// ---------- the render state ----------
function jmLookTick(m, dt) { // LookAtPlayerGoal + RandomLookAroundGoal, as head yaw/pitch relative to the body
  const L = m.jmLook, P = G.player; L.t -= dt;
  if (L.t <= 0) { L.kind = null;
    const near = P && !P.dead && m.pos.distanceTo(P.pos) < 8;
    if (near && Math.random() < 1 - Math.pow(0.98, dt * 20)) { L.kind = 'player'; L.t = (40 + Math.random() * 40) / 20; }
    else if (Math.random() < 1 - Math.pow(0.98, dt * 20)) { L.kind = 'random'; L.t = (20 + Math.random() * 20) / 20; L.ry = Math.random() * Math.PI * 2; L.rp = 0; } }
  let ty = 0, tp = 0;
  if (m.chasing && P) { L.kind = 'player'; L.t = Math.max(L.t, 0.1); }
  if (L.kind === 'player' && P) { const e = P.eye(); const dx = e.x - m.pos.x, dz = e.z - m.pos.z, dy = e.y - (m.pos.y + m.h * 0.85); ty = Math.atan2(dx, dz); tp = -Math.atan2(dy, Math.hypot(dx, dz)); }
  else if (L.kind === 'random') { ty = L.ry; tp = 0; } else { ty = m.yaw; tp = 0; }
  let rel = ty - m.yaw; while (rel > Math.PI) rel -= Math.PI * 2; while (rel < -Math.PI) rel += Math.PI * 2; rel = jmth.clamp(rel, -75 * JM_D2R, 75 * JM_D2R);
  const k = 1 - Math.pow(0.5, dt * 20); L.yaw += (rel - L.yaw) * k; L.pitch += (jmth.clamp(tp, -40 * JM_D2R, 40 * JM_D2R) - L.pitch) * k;
}
function jmState(m, dt) {
  const S = m.jm.S, t = m.t;
  S.age = (m.age || 0) * 20;
  // WalkAnimationState
  const px = m.jmPrev || m.pos.clone(); const d = Math.hypot(m.pos.x - px.x, m.pos.z - px.z); m.jmPrev = (m.jmPrev || new V3()).copy(m.pos);
  const ticks = Math.max(1e-3, dt * 20); const target = Math.min((d / ticks) * 4, 1);
  S.ws += (target - S.ws) * (1 - Math.pow(0.6, ticks)); S.wp += S.ws * ticks * (S.baby ? 3 : 1);
  jmLookTick(m, dt); S.yRot = -m.jmLook.yaw / JM_D2R; S.xRot = m.jmLook.pitch / JM_D2R;
  // swing: the game's armSwing runs 0.3 s down to 0; Minecraft's attackTime runs 0 to 1 over 6 ticks
  if (m.armSwing > 0) { if (!(m.jmSwingT > 0) || m.armSwing > (m.jmLastSwing || 0)) m.jmSwingT = 0.3; }
  m.jmLastSwing = m.armSwing || 0; if (m.jmSwingT > 0) { m.jmSwingT -= dt; S.attack = jmth.clamp(1 - m.jmSwingT / 0.3, 0, 1); if (m.jmSwingT <= 0) S.attack = 0; } else S.attack = 0;
  S.aggressive = !!(m.chasing || m.mtgt || m.prey);
  S.bow = !!m.jm.spec.bow; S.riding = !!m.mountOf; S.swim = (m.type === 'drowned' && inWater(m, 0.5)) ? Math.min(1, (S.swim || 0) + dt * 2) : Math.max(0, (S.swim || 0) - dt * 2);
  S.carrying = !!(m.carry || m.carried || m.mcaCarry); S.creepy = m.type === 'enderman' && m.angry > 0;
  // chicken wings (Chicken.aiStep)
  if (m.type === 'chicken') { S.flapSpeed = jmth.clamp((S.flapSpeed || 0) + (m.onGround ? -1 : 4) * 0.3 * ticks, 0, 1); if (!m.onGround && (S.flapping || 0) < 1) S.flapping = 1; S.flapping = (S.flapping || 0) * Math.pow(0.9, ticks); S.flap = (S.flap || 0) + S.flapping * 2 * ticks; }
  // sheep eating grass (Sheep.getHeadEatPositionScale / getHeadEatAngleScale): 40 ticks; the head drops 9 pixels over
  // the first and last 4 ticks and nods in between
  if (m.type === 'sheep') { if (m.grazeT > 0 && !(S.eatTick > 0)) S.eatTick = 40; S.eatTick = Math.max(0, (S.eatTick || 0) - ticks); const e = S.eatTick;
    S.eatPos = e <= 0 ? 0 : e >= 4 && e <= 36 ? 1 : e < 4 ? e / 4 : -(e - 40) / 4;
    S.eatAngle = e > 4 && e <= 36 ? Math.PI / 5 + 0.21991149 * jmth.sin((e - 4) / 32 * 28.7) : e > 0 ? Math.PI / 5 : S.xRot * JM_D2R; }
  // iron golem punch: 10 ticks after a hit
  if (m.type === 'iron_golem') { if (m.armSwing > 0 && !(S.golemAtk > 0)) S.golemAtk = 10; S.golemAtk = Math.max(0, (S.golemAtk || 0) - ticks); }
}
function jmPoseModels(models) { for (const md of models) { for (const p of md.root.all()) p.resetPose(); md.root.sync(); } }
function jmPose(m) { const J = m.jm; for (const md of J.models) { for (const p of md.root.all()) p.resetPose(); try { J.spec.anim(md.P, J.S, m); } catch (e) { if (!J.err) { J.err = md.layer + ': ' + e; console.warn('java anim', m.type, e); } } md.root.sync(); } }
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) { const r = _u.apply(this, arguments);
    if (this.jm && !this.dead && this.root && this.root.visible !== false) { const far = G.player ? this.pos.distanceToSquared(G.player.pos) : 0;
      this.jmAcc = (this.jmAcc || 0) + dt; const every = far > 64 * 64 ? 1e9 : far > 32 * 32 ? 0.1 : 0;
      if (this.jmAcc >= every) { jmState(this, this.jmAcc); jmPose(this); this.jmAcc = 0; } }
    return r; }; }
// the older keyframe player stays off for Java-model mobs
if (typeof kfTick === 'function') { const _kt = kfTick; kfTick = function (m, dt) { if (m && m.jm) return; return _kt.apply(this, arguments); }; }
// an enderman's carried block (EnderManCarriedBlockLayer): held in front of its chest, turned 45 degrees and tipped 20
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) { const r = _u.apply(this, arguments);
    if (this.jm && this.mcaCarryMesh && this.mcaCarryMesh.parent !== this.jm.grp) { const b = this.mcaCarryMesh; b.position.set(0, 1.55 - 1.501, 0.45); b.rotation.set(20 * JM_D2R, 45 * JM_D2R, 0, 'XYZ'); this.jm.grp.add(b); }
    return r; }; }

// ---------- second batch ----------
function jmSwingWeaponDown(r, l, f, age) { const f3 = jmth.sin(f * Math.PI), f4 = jmth.sin((1 - (1 - f) * (1 - f)) * Math.PI); r.zRot = 0; l.zRot = 0; r.yRot = 0.15707964; l.yRot = -0.15707964;
  r.xRot = -1.8849558 + jmth.cos(age * 0.09) * 0.15 + f3 * 2.2 - f4 * 0.4; l.xRot = jmth.cos(age * 0.19) * 0.5 + f3 * 1.2 - f4 * 0.4; jmBobArms(r, l, age); }
function jmCrossbowHold(P) { P.right_arm.yRot = -0.3 + P.head.yRot; P.left_arm.yRot = 0.6 + P.head.yRot; P.right_arm.xRot = -1.5707964 + P.head.xRot + 0.1; P.left_arm.xRot = -1.5 + P.head.xRot; }
// WolfModel: tail height shows health when tame, sitting folds the legs
JM.wolf = { anim(P, S) { const f = S.wp, f2 = S.ws; P.tail.yRot = S.angry ? 0 : jmth.cos(f * 0.6662) * 1.4 * f2;
  if (S.sitting) { const a = S.ageScale; P.upper_body.y += 2 * a; P.upper_body.xRot = 1.2566371; P.upper_body.yRot = 0; P.body.y += 4 * a; P.body.z -= 2 * a; P.body.xRot = 0.7853982; P.tail.y += 9 * a; P.tail.z -= 2 * a;
    P.right_hind_leg.y += 6.7 * a; P.right_hind_leg.z -= 5 * a; P.right_hind_leg.xRot = 4.712389; P.left_hind_leg.y += 6.7 * a; P.left_hind_leg.z -= 5 * a; P.left_hind_leg.xRot = 4.712389;
    P.right_front_leg.xRot = 5.811947; P.right_front_leg.x += 0.01 * a; P.right_front_leg.y += a; P.left_front_leg.xRot = 5.811947; P.left_front_leg.x -= 0.01 * a; P.left_front_leg.y += a; }
  else jmQuadLegs(P, S);
  jmHeadLook(P, S); P.tail.xRot = S.tailAngle; } };
JM.polar_bear = { anim(P, S) { jmQuadAnim(P, S); const f = (S.stand || 0) ** 2, a = S.ageScale, f3 = S.baby ? 0.44444445 : 1;
  P.body.xRot -= f * Math.PI * 0.35; P.body.y += f * a * 2; P.right_front_leg.y -= f * a * 20; P.right_front_leg.z += f * a * 4; P.right_front_leg.xRot -= f * Math.PI * 0.45;
  P.left_front_leg.y = P.right_front_leg.y; P.left_front_leg.z = P.right_front_leg.z; P.left_front_leg.xRot -= f * Math.PI * 0.45; P.head.y -= f * f3 * 24; P.head.z += f * f3 * 13; P.head.xRot += f * Math.PI * 0.15; } };
// piglins: ears flop as they walk; hold a sword high, aim a crossbow, or look at gold
function jmPiglinEars(P, S) { const f4 = S.age * 0.1 + S.wp * 0.5, f5 = 0.08 + S.ws * 0.4; P.left_ear.zRot = -0.5235988 - jmth.cos(f4 * 1.2) * f5; P.right_ear.zRot = 0.5235988 + jmth.cos(f4) * f5; }
JM.piglin = JM.piglin_brute = { anim(P, S) { const melee = S.aggressive && !S.crossbow;
  if (melee && S.attack > 0) { const a = S.attack; S.attack = 0; jmHumanoid(P, S); S.attack = a; jmSwingWeaponDown(P.right_arm, P.left_arm, a, S.age); } else jmHumanoid(P, S);
  jmPiglinEars(P, S);
  if (melee && !(S.attack > 0)) P.right_arm.xRot = -1.8;
  else if (S.aggressive && S.crossbow) jmCrossbowHold(P);
  else if (S.admiring) { P.head.xRot = 0.5; P.head.yRot = 0; P.left_arm.yRot = 0.5; P.left_arm.xRot = -0.9; } } };
JM.zombified_piglin = { anim(P, S) { jmHumanoid(P, S); jmPiglinEars(P, S); jmZombieArms(P, S); } };
JM.hoglin = JM.zoglin = { anim(P, S) { const f = S.ws, f2 = S.wp; P.right_ear.zRot = -0.6981317 - f * jmth.sin(f2); P.left_ear.zRot = 0.6981317 + f * jmth.sin(f2); P.head.yRot = S.yRot * JM_D2R;
  const f3 = 1 - Math.abs(10 - 2 * (S.hogAtk || 0)) / 10; P.head.xRot = jmth.lerp(f3, 0.87266463, -0.34906584); if (S.baby) P.head.y += f3 * 2.5;
  P.right_front_leg.xRot = jmth.cos(f2) * 1.2 * f; P.right_hind_leg.xRot = P.left_front_leg.xRot = jmth.cos(f2 + Math.PI) * 1.2 * f; P.left_hind_leg.xRot = P.right_front_leg.xRot; } };
JM.witch = { anim(P, S, m) { jmHeadLook(P, S); P.right_leg.xRot = jmth.cos(S.wp * 0.6662) * 1.4 * S.ws * 0.5; P.left_leg.xRot = jmth.cos(S.wp * 0.6662 + Math.PI) * 1.4 * S.ws * 0.5;
  const f = 0.01 * ((m.jmId || 0) % 10); P.nose.xRot = jmth.sin(S.age * f) * 4.5 * JM_D2R; P.nose.zRot = jmth.cos(S.age * f) * 2.5 * JM_D2R;
  if (S.drinking) { P.nose.x = 0; P.nose.y = 1; P.nose.z = -1.5; P.nose.xRot = -0.9; } } };
// IllagerModel: arms crossed unless fighting, casting, aiming or cheering
JM.vindicator = JM.evoker = JM.pillager = JM.illusioner = { anim(P, S) { jmHeadLook(P, S); const f = S.ws, f2 = S.wp;
  for (const n of ['right_arm', 'left_arm', 'right_leg', 'left_leg']) { P[n].yRot = 0; P[n].zRot = 0; }
  if (S.riding) { P.right_arm.xRot = -0.62831855; P.left_arm.xRot = -0.62831855; P.right_leg.xRot = -1.4137167; P.right_leg.yRot = 0.31415927; P.right_leg.zRot = 0.07853982; P.left_leg.xRot = -1.4137167; P.left_leg.yRot = -0.31415927; P.left_leg.zRot = -0.07853982; }
  else { P.right_arm.xRot = jmth.cos(f2 * 0.6662 + Math.PI) * f; P.left_arm.xRot = jmth.cos(f2 * 0.6662) * f; P.right_leg.xRot = jmth.cos(f2 * 0.6662) * 1.4 * f * 0.5; P.left_leg.xRot = jmth.cos(f2 * 0.6662 + Math.PI) * 1.4 * f * 0.5; }
  const pose = S.illPose;
  if (pose === 'attack') { if (S.emptyHand) jmZombieArms(P, Object.assign({}, S, { aggressive: true })); else jmSwingWeaponDown(P.right_arm, P.left_arm, S.attack, S.age); }
  else if (pose === 'spell') { P.right_arm.z = 0; P.right_arm.x = -5; P.left_arm.z = 0; P.left_arm.x = 5; P.right_arm.xRot = P.left_arm.xRot = jmth.cos(S.age * 0.6662) * 0.25; P.right_arm.zRot = 2.3561945; P.left_arm.zRot = -2.3561945; P.right_arm.yRot = 0; P.left_arm.yRot = 0; }
  else if (pose === 'bow') { P.right_arm.yRot = -0.1 + P.head.yRot; P.right_arm.xRot = -1.5707964 + P.head.xRot; P.left_arm.xRot = -0.9424779 + P.head.xRot; P.left_arm.yRot = P.head.yRot - 0.4; P.left_arm.zRot = 1.5707964; }
  else if (pose === 'crossbow') jmCrossbowHold(P);
  else if (pose === 'charge') { P.right_arm.yRot = -0.8; P.right_arm.xRot = -0.97079635; const t = jmth.clamp(S.chargeT || 0, 0, 1); P.left_arm.yRot = jmth.lerp(t, 0.4, 0.85); P.left_arm.xRot = jmth.lerp(t, -0.97079635, -1.5707964); }
  const crossed = pose === 'crossed'; P.arms.visible = crossed; P.left_arm.visible = !crossed; P.right_arm.visible = !crossed; } };
JM.snow_golem = { anim(P, S) { jmHeadLook(P, S); P.upper_body.yRot = S.yRot * JM_D2R * 0.25; const f = jmth.sin(P.upper_body.yRot), f2 = jmth.cos(P.upper_body.yRot);
  P.left_arm.yRot = P.upper_body.yRot; P.right_arm.yRot = P.upper_body.yRot + Math.PI; P.left_arm.x = f2 * 5; P.left_arm.z = -f * 5; P.right_arm.x = -f2 * 5; P.right_arm.z = f * 5; } };
JM.blaze = { anim(P, S) { const a = S.age; let f = a * Math.PI * -0.1;
  for (let n = 0; n < 4; n++) { const p = P['part' + n]; p.y = -2 + jmth.cos((n * 2 + a) * 0.25); p.x = jmth.cos(f) * 9; p.z = jmth.sin(f) * 9; f += 1.5707964; }
  f = 0.7853982 + a * Math.PI * 0.03; for (let n = 4; n < 8; n++) { const p = P['part' + n]; p.y = 2 + jmth.cos((n * 2 + a) * 0.25); p.x = jmth.cos(f) * 7; p.z = jmth.sin(f) * 7; f += 1.5707964; }
  f = 0.47123894 + a * Math.PI * -0.05; for (let n = 8; n < 12; n++) { const p = P['part' + n]; p.y = 11 + jmth.cos((n * 1.5 + a) * 0.5); p.x = jmth.cos(f) * 5; p.z = jmth.sin(f) * 5; f += 1.5707964; }
  jmHeadLook(P, S); } };
JM.ghast = { anim(P, S) { for (let i = 0; i < 9; i++) if (P['tentacle' + i]) P['tentacle' + i].xRot = 0.2 * jmth.sin(S.age * 0.3 + i) + 0.4; } };
JM.silverfish = { anim(P, S) { const seg = [0, 1, 2, 3, 4, 5, 6].map(i => P['segment' + i]);
  seg.forEach((p, i) => { p.yRot = jmth.cos(S.age * 0.9 + i * 0.15 * Math.PI) * Math.PI * 0.05 * (1 + Math.abs(i - 2)); p.x = jmth.sin(S.age * 0.9 + i * 0.15 * Math.PI) * Math.PI * 0.2 * Math.abs(i - 2); });
  P.layer0.yRot = seg[2].yRot; P.layer1.yRot = seg[4].yRot; P.layer1.x = seg[4].x; P.layer2.yRot = seg[1].yRot; P.layer2.x = seg[1].x; } };
JM.endermite = { anim(P, S) { for (let i = 0; i < 4; i++) { const p = P['segment' + i]; p.yRot = jmth.cos(S.age * 0.9 + i * 0.15 * Math.PI) * Math.PI * 0.01 * (1 + Math.abs(i - 2)); p.x = jmth.sin(S.age * 0.9 + i * 0.15 * Math.PI) * Math.PI * 0.1 * Math.abs(i - 2); } } };
JM.phantom = { anim(P, S, m) { const f = ((m.jmId || 0) % 360 + S.age) * 7.448451 * JM_D2R; P.left_wing_base.zRot = jmth.cos(f) * 16 * JM_D2R; P.left_wing_tip.zRot = jmth.cos(f) * 16 * JM_D2R;
  P.right_wing_base.zRot = -P.left_wing_base.zRot; P.right_wing_tip.zRot = -P.left_wing_tip.zRot; P.tail_base.xRot = -(5 + jmth.cos(f * 2) * 5) * JM_D2R; P.tail_tip.xRot = -(5 + jmth.cos(f * 2) * 5) * JM_D2R; } };
JM.vex = { anim(P, S) { jmHeadLook(P, S); const f = jmth.cos(S.age * 5.5 * JM_D2R) * 0.1; P.right_arm.zRot = 0.62831855 + f; P.left_arm.zRot = -(0.62831855 + f);
  if (S.aggressive) { P.body.xRot = 0; P.right_arm.xRot = 3.6651914; P.right_arm.yRot = 0.2617994; P.right_arm.zRot = -0.47123888 - f; } else P.body.xRot = 0.15707964;
  P.left_wing.yRot = 1.0995574 + jmth.cos(S.age * 45.836624 * JM_D2R) * JM_D2R * 16.2; P.right_wing.yRot = -P.left_wing.yRot; P.left_wing.xRot = 0.47123888; P.left_wing.zRot = -0.47123888; P.right_wing.xRot = 0.47123888; P.right_wing.zRot = 0.47123888; } };
JM.squid = JM.glow_squid = { anim(P, S) { for (let i = 0; i < 8; i++) if (P['tentacle' + i]) P['tentacle' + i].xRot = S.tentacle || 0; } };
JM.dolphin = { anim(P, S) { P.body.xRot = S.xRot * JM_D2R; P.body.yRot = S.yRot * JM_D2R; if (S.ws > 0.05) { P.body.xRot += -0.05 - 0.05 * jmth.cos(S.age * 0.3); P.tail.xRot = -0.1 * jmth.cos(S.age * 0.3); P.tail_fin.xRot = -0.2 * jmth.cos(S.age * 0.3); } } };
JM.strider = { anim(P, S) { const f = S.wp, f2 = Math.min(S.ws, 0.25);
  if (!S.ridden) { P.body.xRot = S.xRot * JM_D2R; P.body.yRot = S.yRot * JM_D2R; } else { P.body.xRot = 0; P.body.yRot = 0; }
  P.body.zRot = 0.1 * jmth.sin(f * 1.5) * 4 * f2; P.body.y = 2 - 2 * jmth.cos(f * 1.5) * 2 * f2;
  P.left_leg.xRot = jmth.sin(f * 0.75) * 2 * f2; P.right_leg.xRot = jmth.sin(f * 0.75 + Math.PI) * 2 * f2; P.left_leg.zRot = 0.17453292 * jmth.cos(f * 0.75) * f2; P.right_leg.zRot = 0.17453292 * jmth.cos(f * 0.75 + Math.PI) * f2;
  P.left_leg.y = 8 + 2 * jmth.sin(f * 0.75 + Math.PI) * 2 * f2; P.right_leg.y = 8 + 2 * jmth.sin(f * 0.75) * 2 * f2;
  const f4 = jmth.cos(f * 1.5 + Math.PI) * f2, a = S.age;
  P.right_bottom_bristle.zRot = -1.2217305 + f4 * 1.3 + 0.05 * jmth.sin(a * -0.4); P.right_middle_bristle.zRot = -1.134464 + f4 * 1.2 + 0.1 * jmth.sin(a * 0.2); P.right_top_bristle.zRot = -0.87266463 + f4 * 0.6 + 0.1 * jmth.sin(a * 0.4);
  P.left_top_bristle.zRot = 0.87266463 + f4 * 0.6 + 0.1 * jmth.sin(a * 0.4); P.left_middle_bristle.zRot = 1.134464 + f4 * 1.2 + 0.1 * jmth.sin(a * 0.2); P.left_bottom_bristle.zRot = 1.2217305 + f4 * 1.3 + 0.05 * jmth.sin(a * -0.4); } };
JM.ravager = { anim(P, S) { const f4 = S.ravAtk || 0;
  if (f4 > 0) { const f2 = jmth.triangleWave(f4, 10), f = (1 + f2) * 0.5, f5 = f * f * f * 12, f6 = f5 * jmth.sin(P.neck.xRot); P.neck.z = -6.5 + f5; P.neck.y = -7 - f6; P.mouth.xRot = f4 > 5 ? jmth.sin((-4 + f4) / 4) * Math.PI * 0.4 : 0.15707964 * jmth.sin(Math.PI * f4 / 10); }
  else { const f = -1 * jmth.sin(P.neck.xRot); P.neck.x = 0; P.neck.y = -7 - f; P.neck.z = 5.5; P.neck.xRot = 0; P.mouth.xRot = Math.PI * 0.01; }
  jmHeadLook(P, S); const f2 = S.wp, f = 0.4 * S.ws; P.right_hind_leg.xRot = jmth.cos(f2 * 0.6662) * f; P.left_hind_leg.xRot = jmth.cos(f2 * 0.6662 + Math.PI) * f; P.right_front_leg.xRot = jmth.cos(f2 * 0.6662 + Math.PI) * f; P.left_front_leg.xRot = jmth.cos(f2 * 0.6662) * f; } };
// the extra state these need
let JM_IDS = 1;
{ const _st = jmState; jmState = function (m, dt) { _st(m, dt); const S = m.jm.S, ticks = Math.max(1e-3, dt * 20), ty = m.type;
    if (!m.jmId) m.jmId = JM_IDS++;
    if (ty === 'wolf') { S.sitting = !!m.sitting; S.angry = (m.angry || 0) > 0 || !!m.prey; S.tailAngle = S.angry ? 1.5393804 : m.tamed ? (0.55 - ((m.maxHp || 20) - m.hp) * 0.02) * Math.PI : 0.62831855; }
    if (ty === 'polar_bear') S.stand = jmth.clamp((S.stand || 0) + (S.attack > 0 || (m.chasing && m.pos.distanceTo(G.player.pos) < 3) ? 1 : -1) * ticks / 6, 0, 1);
    if (ty === 'piglin' || ty === 'piglin_brute') { S.admiring = (m.admireT || 0) > 0; S.crossbow = !!(m.t && m.t.ranged) || !!m.crossbow; }
    if (ty === 'hoglin' || ty === 'zoglin') { if (m.armSwing > 0 && !(S.hogAtk > 0)) S.hogAtk = 10; S.hogAtk = Math.max(0, (S.hogAtk || 0) - ticks); }
    if (ty === 'ravager') { if (m.armSwing > 0 && !(S.ravAtk > 0)) S.ravAtk = 10; S.ravAtk = Math.max(0, (S.ravAtk || 0) - ticks); }
    if (ty === 'witch') S.drinking = (m.drinkT || 0) > 0;
    if (ty === 'strider') S.ridden = !!m.rider;
    if (ty === 'vindicator') S.illPose = S.aggressive ? 'attack' : 'crossed';
    if (ty === 'evoker') S.illPose = (m.castT || 0) > 0 ? 'spell' : 'crossed';
    if (ty === 'illusioner') S.illPose = (m.castT || 0) > 0 ? 'spell' : S.aggressive ? 'bow' : 'crossed';
    if (ty === 'pillager') S.illPose = S.aggressive ? 'crossbow' : 'crossed';
    if (ty === 'squid' || ty === 'glow_squid') { // Squid.aiStep
      S.tm = (S.tm || 0) + (S.tsp || 0.1) * ticks; if (S.tm > Math.PI * 2) { S.tm -= Math.PI * 2; if (Math.random() < 0.1) S.tsp = 1 / (Math.random() + 1) * 0.2; }
      S.tentacle = inWater(m, 0.3) ? (S.tm < Math.PI ? jmth.sin((S.tm / Math.PI) ** 2 * Math.PI) * Math.PI * 0.25 : 0) : 0; } }; }

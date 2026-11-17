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

// ---------- beacon beams: the owner's beam texture, stretched up the sky and scrolling ----------
if (BB_MODELS['@beacon_beam']) {
  const tex = new THREE.TextureLoader().load(BB_MODELS['@beacon_beam'].texture); tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 200);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide });
  BB_TICKS.push((dt) => { tex.offset.y = (tex.offset.y - dt * 0.5) % 1; if (typeof beaconBeams === 'undefined') return; for (const b of beaconBeams.values()) if (b.material !== mat) b.material = mat; });
}

// ---------- worn armour: each box face cut from the owner's Minecraft armour layers (leather tinted like Minecraft) ----------
{
  const IMG = {}; const load = (src) => { if (!src) return null; if (IMG[src]) return IMG[src]; const im = new Image(); im.src = src; return IMG[src] = im; };
  const A = (mat) => BB_MODELS['@armor_' + (mat === 'gold' ? 'golden' : mat)];
  // box-UV regions on the 64x32 sheets: [u, v, w, h, d, rows from top, rows to keep]
  const REG = { helm: ['texture', 0, 0, 8, 8, 8], chest: ['texture', 16, 16, 8, 12, 4], arm: ['texture', 40, 16, 4, 12, 4],
    legs: ['legs', 16, 16, 8, 12, 4, 7, 5], leg: ['legs', 0, 16, 4, 12, 4, 0, 9], boot: ['texture', 0, 16, 4, 12, 4, 7, 5] };
  const LEATHER = [160 / 255, 101 / 255, 64 / 255];
  const _at = armorTex2;
  armorTex2 = function (mat, part) {
    const a = A(mat), R = REG[part]; if (!a || !R) return _at.apply(this, arguments);
    const key = 'bb:' + mat + ':' + part; if (armorTex2Cache[key]) return armorTex2Cache[key];
    const [sheet, u, v, w, h, d, r0 = 0, rn = h] = R; const img = load(a[sheet]), ov = load(a[sheet === 'legs' ? 'legs_overlay' : 'overlay']);
    // face order px, nx, py, ny, pz, nz = the wearer's left, right, top, bottom, front, back
    const F = [[u + d + w, v + d, d, h], [u, v + d, d, h], [u + d, v, w, d], [u + d + w, v, w, d], [u + d, v + d, w, h], [u + 2 * d + w, v + d, w, h]];
    const mats = F.map(([fx, fy, fw, fh], i) => {
      const side = i !== 2 && i !== 3; const sy = side ? fy + r0 : fy, sh = side ? rn : fh;
      const cv = document.createElement('canvas'); cv.width = fw; cv.height = sh; const t = new THREE.CanvasTexture(cv); t.magFilter = t.minFilter = THREE.NearestFilter;
      const draw = () => { const x = cv.getContext('2d'); x.clearRect(0, 0, fw, sh); x.drawImage(img, fx, sy, fw, sh, 0, 0, fw, sh);
        if (mat === 'leather') { const id = x.getImageData(0, 0, fw, sh); for (let q = 0; q < id.data.length; q += 4) { id.data[q] *= LEATHER[0]; id.data[q + 1] *= LEATHER[1]; id.data[q + 2] *= LEATHER[2]; } x.putImageData(id, 0, 0); if (ov && ov.complete) x.drawImage(ov, fx, sy, fw, sh, 0, 0, fw, sh); }
        t.needsUpdate = true; };
      if (img.complete && (!ov || ov.complete)) draw(); else { img.addEventListener('load', draw); if (ov) ov.addEventListener('load', draw); }
      return new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.1, transparent: false, side: THREE.DoubleSide }); });
    return armorTex2Cache[key] = mats;
  };
  // armour already on show gets redrawn with the new look
  for (const k in armorTex2Cache) delete armorTex2Cache[k];
}

// ---------- banner patterns: shapes read from the owner's pattern masks (falls back to the drawn shapes until loaded) ----------
if (BB_MODELS['@banner_patterns'] && typeof patternAt !== 'undefined') {
  const MASK = {}; const ALIAS = { thing: 'mojang' };
  for (const [name, src] of Object.entries(BB_MODELS['@banner_patterns'])) { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); MASK[name] = { d: g.getImageData(0, 0, im.width, im.height).data, w: im.width, s: im.width / 64 }; }; im.src = src; }
  const _pa = patternAt; patternAt = function (p, x, y) { const m = MASK[ALIAS[p] || p]; if (!m) return _pa.apply(this, arguments);
    const px = Math.floor((x + 1) * m.s), py = Math.floor((y + 1) * m.s); const i = (py * m.w + px) * 4; return m.d[i + 3] / 255 * (m.d[i] / 255); };
}
// ---------- the shield: the owner's wooden shield model in hand ----------
if (typeof shieldMesh !== 'undefined' && BB_MODELS['@shield']) { const _sh = shieldMesh; shieldMesh = function () { try { const o = bbObject('@shield'); const g = new THREE.Group(); o.root.scale.setScalar(0.42); o.root.position.y = -0.29; g.add(o.root); return g; } catch (e) { return _sh.apply(this, arguments); } }; }

// ---------- thrown items fly as the item's own picture, like Minecraft (potions, XP bottles, pearls, eggs, snowballs) ----------
{
  const texCache = {}; const texOf = (key, src) => { if (texCache[key]) return texCache[key]; let t;
    if (typeof src === 'string') { t = new THREE.TextureLoader().load(src); } else { t = new THREE.CanvasTexture(src); } t.magFilter = t.minFilter = THREE.NearestFilter; return texCache[key] = t; };
  const itemTex = (id) => (id != null && typeof ICON_CANVAS !== 'undefined' && ICON_CANVAS[id]) ? texOf('it' + id, ICON_CANVAS[id]) : null;
  const sprite = (tex) => { const g = new THREE.Group(); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.1 })); s.scale.setScalar(0.5); g.add(s); g.userData.bbSprite = s; return g; };
  const XP = () => IT.experience_bottle !== undefined ? IT.experience_bottle : IT.bottle_o_enchanting;
  const KIND_ITEM = { snowball: () => IT.snowball, egg: () => IT.egg, pearl: () => IT.ender_pearl, xpbottle: XP, potion: () => IT.splash_potion };
  if (typeof projMesh !== 'undefined') { const _pm = projMesh; projMesh = function (kind) { const f = KIND_ITEM[kind]; const t = f && itemTex(f()); return t ? sprite(t) : _pm.apply(this, arguments); }; }
  // a thrown potion learns its brew after it's thrown: show that potion's picture (splash or lingering)
  if (typeof updateProjectiles !== 'undefined') { const _up = updateProjectiles; updateProjectiles = function (dt) {
    for (const a of G.projectiles) if (a.kind === 'potion' && !a.bbPot && a.mesh && a.mesh.userData.bbSprite) { a.bbPot = true; try { const id = a.ling ? IT.lingering_potion : IT.splash_potion; const pot = a.pot || 'water';
      a.mesh.userData.bbSprite.material.map = texOf('pot' + id + pot, typeof potionIcon === 'function' ? potionIcon(id, pot) : ICON_CANVAS[id]); a.mesh.userData.bbSprite.material.needsUpdate = true; } catch (e) { } }
    return _up.apply(this, arguments); }; }
}

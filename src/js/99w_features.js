// ================= FEATURES ADDED SO THE REST OF THE OWNER'S ARCHIVE.ZIP HAS SOMETHING TO SHOW ON =================
// baby zombies / husks / drowned / piglins / zombified piglins, mobs wearing armour, the elytra on your back,
// the end crystal's healing beam, and leads (lead animals around, tie them to fences: the knot shows).

// ---------- baby hostiles: 5% of zombie-type and piglin-type mobs spawn as babies (Minecraft's baby models) ----------
const BB_BABY_HOSTILE = new Set(['zombie', 'husk', 'drowned', 'piglin', 'zombified_piglin']);
{ const _sm = spawnMob; spawnMob = function (type, x, y, z, opts) { const m = _sm.apply(this, arguments);
    try { if (m && BB_BABY_HOSTILE.has(type) && !(opts && (opts.rec || opts.netx || opts.noBaby)) && Math.random() < 0.05 && typeof setBaby === 'function') { setBaby(m, true); m.growT = 1e12; m.bbBabyHostile = true; } } catch (e) { }
    return m; }; }
// baby hostiles never grow up
{ const _mv = Mob.prototype.update; if (_mv) Mob.prototype.update = function (dt) { if (this.bbBabyHostile && this.baby) { this.growT = 1e12; } return _mv.apply(this, arguments); }; }

// ---------- armour on zombies, husks, drowned, skeletons, strays, bogged and piglins ----------
const BB_ARMOR_MOBS = new Set(['zombie', 'husk', 'drowned', 'skeleton', 'stray', 'bogged', 'piglin']);
const BB_PIECES = ['helmet', 'chest', 'legs', 'boots'], BB_ITEM_SLOT = { helmet: 'helmet', chest: 'chestplate', legs: 'leggings', boots: 'boots' };
const BB_ARMOR_PTS = { leather: [1, 3, 2, 1], golden: [2, 5, 3, 1], chainmail: [2, 5, 4, 1], copper: [2, 4, 3, 1], iron: [2, 6, 5, 2], diamond: [3, 8, 6, 3], netherite: [3, 8, 6, 3] };
function bbRollArmor(m) {
  if (m.type === 'piglin') { const a = {}; for (const p of BB_PIECES) if (Math.random() < 0.1) a[p] = 'golden'; return Object.keys(a).length ? a : null; }
  if (Math.random() > (m.type === 'drowned' ? 0.03 : 0.12)) return null;
  // Minecraft's odds: mostly leather and gold, sometimes chainmail, rarely iron, very rarely diamond
  const r = Math.random(); const mat = r < 0.3706 ? 'leather' : r < 0.8579 ? 'golden' : r < 0.9869 ? 'chainmail' : r < 0.9996 ? 'iron' : 'diamond';
  const a = { helmet: mat }; for (const p of ['chest', 'legs', 'boots']) { if (Math.random() < 0.1) break; a[p] = mat; } return a;
}
{ const _sm = spawnMob; spawnMob = function (type, x, y, z, opts) { const m = _sm.apply(this, arguments);
    try { if (m && BB_ARMOR_MOBS.has(type) && !(opts && (opts.rec || opts.netx)) && !m.baby && m.mobArmor === undefined) m.mobArmor = bbRollArmor(m); } catch (e) { } return m; }; }
for (const k of BB_ARMOR_MOBS) bbGear(k, (m) => { const a = m.mobArmor || {}; for (const p of BB_PIECES) { const mat = !m.baby && a[p] || false; bbSetSkin(m, p, mat);
    const lm = m.bbLayer && m.bbLayer[p]; if (lm && mat && lm.userData.tint !== mat) { lm.userData.tint = mat; bbTint(m, lm, mat === 'leather' ? BB_LEATHER : WHITE_C); } } });
// worn armour protects them (4% less damage per armour point, up to 80%) and sometimes drops on death
{ const _h = Mob.prototype.hurt; Mob.prototype.hurt = function (dmg) { if (this.mobArmor && dmg > 0) { let pts = 0; for (const p of BB_PIECES) { const mat = this.mobArmor[p]; if (mat) pts += (BB_ARMOR_PTS[mat] || [0, 0, 0, 0])[BB_PIECES.indexOf(p)]; } arguments[0] = dmg * (1 - Math.min(20, pts) / 25); } return _h.apply(this, arguments); }; }
{ const _dl = Mob.prototype.dropLoot; if (_dl) Mob.prototype.dropLoot = function () { const r = _dl.apply(this, arguments); try { if (this.mobArmor) for (const p of BB_PIECES) { const mat = this.mobArmor[p]; const id = mat && IT[mat + '_' + BB_ITEM_SLOT[p]]; if (id !== undefined && id && Math.random() < 0.085) dropItem(id, 1, this.pos.x, this.pos.y + 0.6, this.pos.z); } } catch (e) { } return r; }; }
// armour is saved with the mob
if (typeof mobRecord !== 'undefined') { const _r = mobRecord; mobRecord = function (m) { const r = _r.apply(this, arguments); if (r && m.mobArmor) r.ma = m.mobArmor; if (r && m.bbBabyHostile) r.bh = 1; return r; }; }
if (typeof mobFromRecord !== 'undefined') { const _f = mobFromRecord; mobFromRecord = function (rec) { const m = _f.apply(this, arguments); if (m && rec) { m.mobArmor = rec.ma || null; if (rec.bh && typeof setBaby === 'function') { setBaby(m, true); m.growT = 1e12; m.bbBabyHostile = true; } } return m; }; }

// ---------- the elytra on your back: the owner's elytra texture on each wing ----------
if (typeof ensureWings !== 'undefined' && BB_MODELS['@elytra']) {
  const img = new Image(); img.src = BB_MODELS['@elytra'].texture; const cache = {};
  // Minecraft's elytra wing: box at (22,0), 10 wide, 20 tall, 2 deep, on a 64x32 sheet
  const FACES = [[22, 2, 2, 20], [34, 2, 2, 20], [24, 0, 10, 2], [34, 0, 10, 2], [24, 2, 10, 20], [36, 2, 10, 20]];
  const wingMats = (side) => cache[side] || (cache[side] = FACES.map(([fx, fy, fw, fh]) => { const cv = document.createElement('canvas'); cv.width = fw; cv.height = fh; const t = new THREE.CanvasTexture(cv); t.magFilter = t.minFilter = THREE.NearestFilter;
    const draw = () => { const x = cv.getContext('2d'); x.save(); if (side < 0) { x.translate(fw, 0); x.scale(-1, 1); } x.drawImage(img, fx, fy, fw, fh, 0, 0, fw, fh); x.restore(); t.needsUpdate = true; };
    if (img.complete) draw(); else img.addEventListener('load', draw); return new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.1, side: THREE.DoubleSide }); }));
  const _ew = ensureWings; ensureWings = function (model) { const had = !!model.wings; const W = _ew.apply(this, arguments); if (!had) W.forEach((g, i) => { const s = i === 0 ? -1 : 1; const [m, e] = g.children; if (m) m.material = wingMats(s); if (e) e.visible = false; }); return W; };
}

// ---------- end crystal healing beam: the owner's beam texture, stretched from crystal to dragon and scrolling ----------
if (typeof Crystal !== 'undefined' && BB_MODELS['@crystal_beam']) {
  const tex = new THREE.TextureLoader().load(BB_MODELS['@crystal_beam'].texture); tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }); const geo = new THREE.CylinderGeometry(0.2, 0.2, 1, 8, 1, true); geo.rotateX(Math.PI / 2); geo.translate(0, 0, 0.5);
  const _cu = Crystal.prototype.update; Crystal.prototype.update = function (dt) { const r = _cu.apply(this, arguments);
    const on = this.beam && this.beam.visible; if (this.beam) this.beam.visible = false;
    if (on && !this.bbBeam) { this.bbBeam = new THREE.Mesh(geo, mat); this.bbBeam.frustumCulled = false; scene.add(this.bbBeam); }
    if (this.bbBeam) { this.bbBeam.visible = !!on && !this.dead; if (on) { const a = this.beamGeo.attributes.position; const p0 = new THREE.Vector3(a.getX(0), a.getY(0), a.getZ(0)), p1 = new THREE.Vector3(a.getX(1), a.getY(1), a.getZ(1));
      const L = p0.distanceTo(p1); this.bbBeam.position.copy(p0); this.bbBeam.lookAt(p1); this.bbBeam.scale.set(1, 1, L); tex.repeat.set(1, L / 2); tex.offset.y = (tex.offset.y - dt * 0.6) % 1; } }
    return r; };
  const _cr = Crystal.prototype.remove; Crystal.prototype.remove = function () { if (this.bbBeam) scene.remove(this.bbBeam); return _cr.apply(this, arguments); };
}

// ---------- leads: put one on an animal and it follows you; tie it to a fence and the knot shows ----------
{
  const KNOTS = new Map(); const ROPE = new THREE.LineBasicMaterial({ color: 0x6b4a2b });
  const holderPos = (m) => m.bbLeash === 'player' ? new V3(player.pos.x, player.pos.y + 0.9, player.pos.z) : m.bbLeash && m.bbLeash.pos;
  const canLead = (m) => m && !m.dead && m.t && m.t.kind !== 'hostile' && !m.t.boss && m.type !== 'villager' && m.type !== 'wandering_trader' && !m.leashTo;
  const dropLead = (m) => { try { dropItem(IT.lead, 1, m.pos.x, m.pos.y + 0.5, m.pos.z); } catch (e) { } unleash(m); };
  const unleash = (m) => { m.bbLeash = null; if (m.bbRope) { G.scene.remove(m.bbRope); m.bbRope = null; } };
  const knotAt = (x, y, z) => { const k = x + ',' + y + ',' + z; let n = KNOTS.get(k); if (!n) { n = { pos: new V3(x + 0.5, y + 0.6, z + 0.5), x, y, z, k, dim: world.dim };
      if (BB_MODELS['@lead_knot']) { const o = bbObject('@lead_knot'); n.mesh = o.root; n.mesh.position.set(x + 0.5, y + 0.1, z + 0.5); G.scene.add(n.mesh); } KNOTS.set(k, n); } return n; };
  const leashed = () => G.mobs.filter(m => m.bbLeash && !m.dead);
  if (typeof useAction !== 'undefined') { const _ua = useAction; useAction = function (eye, dir) {
    try { const h = player.held(); const hd = h && ITEMS[h.id]; const m = targetMob;
      if (m && m.bbLeash) { if (m.bbLeash === 'player' || !hd || hd.kind === 'lead') { dropLead(m); S.swing = 1; mouseR = false; return; } }
      if (m && hd && hd.kind === 'lead' && canLead(m)) { m.bbLeash = 'player'; useHeld(1); S.swing = 1; mouseR = false; Sfx.at && Sfx.at('saddle', m.pos, 0.5, 1.3); return; }
      if (!m) { const hit = raycast(eye, dir, 5); const d = hit && BL[hit.id];
        if (d && d.fence) { const mine = leashed().filter(q => q.bbLeash === 'player');
          if (mine.length) { const n = knotAt(hit.x, hit.y, hit.z); for (const q of mine) q.bbLeash = n; S.swing = 1; mouseR = false; return; }
          const n = KNOTS.get(hit.x + ',' + hit.y + ',' + hit.z); if (n && !hd) { for (const q of leashed()) if (q.bbLeash === n) q.bbLeash = 'player'; S.swing = 1; mouseR = false; return; } } }
    } catch (e) { }
    return _ua.apply(this, arguments); }; }
  BB_TICKS.push((dt) => {
    if (!world || !player || !S.started) return;
    for (const m of leashed()) { if (m.gone) { unleash(m); continue; } const hp = holderPos(m); if (!hp) { unleash(m); continue; }
      if (m.bbLeash !== 'player' && (world.dim !== m.bbLeash.dim || !(BL[world.get(m.bbLeash.x, m.bbLeash.y, m.bbLeash.z)] || {}).fence)) { dropLead(m); continue; }
      const d = m.pos.distanceTo(hp); if (d > 10) { dropLead(m); continue; }
      if (d > 3.5 && typeof steerTo === 'function') steerTo(m, hp, 2.5); if (d > 5) { const pull = Math.min(6, (d - 5) * 4); m.vel.x += (hp.x - m.pos.x) / d * pull * dt * 8; m.vel.z += (hp.z - m.pos.z) / d * pull * dt * 8; }
      if (!m.bbRope) { m.bbRope = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(), new V3()]), ROPE); m.bbRope.frustumCulled = false; G.scene.add(m.bbRope); }
      const p = m.bbRope.geometry.attributes.position; p.setXYZ(0, m.pos.x, m.pos.y + m.h * 0.7, m.pos.z); p.setXYZ(1, hp.x, hp.y, hp.z); p.needsUpdate = true; }
    // knots with nothing tied to them come off
    for (const [k, n] of KNOTS) if (!leashed().some(q => q.bbLeash === n) || world.dim !== n.dim) { if (n.mesh) G.scene.remove(n.mesh); KNOTS.delete(k); }
  });
  { const _rm = Mob.prototype.remove; Mob.prototype.remove = function () { if (this.bbRope) { G.scene.remove(this.bbRope); this.bbRope = null; } return _rm.apply(this, arguments); }; }
}

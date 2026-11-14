// ================= MORE RULES: POTS, SPECTRAL ARROWS, MINECARTS, RIDING PIGS AND STRIDERS, WOLF ARMOR (Minecraft) =================
// Decorated pots remember the four sherds (or bricks) they were made from and break back into them. Spectral arrows
// make what they hit glow (seen through walls) for 10 s. Minecarts with a furnace run on coal, with TNT blow up on a
// powered activator rail (or when broken going fast), with a hopper pull items from the container above and from the
// ground (a powered activator rail stops them); hoppers under the rails empty carts. A saddled pig follows a carrot on
// a stick (use it for a short burst); a saddled strider walks lava and follows warped fungus on a stick. Wolf armor
// takes the hits for a tamed wolf until it breaks; shears take it off.
// ---------------- decorated pots ----------------
{ const _ce = typeof craftExtra === 'function' ? craftExtra : () => null; craftExtra = function (r) { if (r && r.out[0] === 'decorated_pot') { const g = craftGrid; const at = (i) => g[i] ? ITEMS[g[i].id].key : 'clay_brick'; const n = S.gridN || 3;
      const cells = n === 3 ? [1, 3, 5, 7] : [0, 1, 2, 3]; const sh = cells.map(i => at(i)); return sh.every(k => k === 'clay_brick') ? null : { data: { sherds: sh } }; } return _ce.apply(this, arguments); }; }
{ const _pb = placeBlock; placeBlock = function (hit, id) { const h = player.held(); const data = h && h.id === id && h.data; const r = _pb.apply(this, arguments);
    if (r && id === B.DECORATED_POT && data && data.sherds && hit) { const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz; if (world.get(x, y, z) === B.DECORATED_POT) bdataOf(world).set(keyOf(x, y, z), { sherds: data.sherds, f: playerFacing() }); if (typeof ovDrop === 'function') { OV.watch.add(keyOf(x, y, z)); ovDrop(keyOf(x, y, z)); } }
    return r; }; }
function potShards(x, y, z) { const e = bdataOf(world).get(keyOf(x, y, z)); bdataOf(world).delete(keyOf(x, y, z)); return e && e.sherds ? e.sherds : ['clay_brick', 'clay_brick', 'clay_brick', 'clay_brick']; }
// ---------------- spectral arrows ----------------
{ const _as = arrowSlot; arrowSlot = function () { const order = [36, ...Array(36).keys()]; for (const i of order) { const s = player.inv[i]; if (s && (s.id === IT.arrow || s.id === IT.tipped_arrow || s.id === IT.spectral_arrow)) return i; } return -1; }; }
{ const _cnt = countItem; countItem = function (id) { if (id === IT.arrow) return _cnt(IT.arrow) + _cnt(IT.spectral_arrow); return _cnt(id); }; }
{ const _fb = fireBow; fireBow = function (eye, dir) { const i = S.mode !== 'creative' ? arrowSlot() : -1; const spec = i >= 0 && player.inv[i] && player.inv[i].id === IT.spectral_arrow; const n0 = G.projectiles.length; const r = _fb.apply(this, arguments);
    if (spec && G.projectiles.length > n0) { const a = G.projectiles[G.projectiles.length - 1]; a.spectral = true; } return r; }; }
function setGlow(m, sec) { m.glowT = Math.max(m.glowT || 0, sec); if (!m.glowBox) { const b = new THREE.Box3(); const helper = new THREE.Box3Helper(b, 0xffffff); helper.material.depthTest = false; helper.renderOrder = 999; helper.material.transparent = true; G.scene.add(helper); m.glowBox = helper; } }
{ const _up = updateProjectiles; updateProjectiles = function (dt) { const live = G.projectiles.filter(a => a.spectral && !a.done); const r = _up.apply(this, arguments);
    for (const a of live) { if (Math.random() < dt * 30) Particles.emit(a.pos.x, a.pos.y, a.pos.z, 1, [[1, 0.95, 0.5]], 0.2, 0.4, 0, 0.05, 1.6); if (!a.done) continue; let best = null, bd = 1.6; for (const m of G.mobs) { if (m.dead) continue; const d = m.pos.distanceTo(a.pos) - m.hw; if (d < bd) { bd = d; best = m; } } if (best && bd < 1.2) setGlow(best, 10); }
    for (const m of G.mobs) if (m.glowBox) { m.glowT -= dt; if (m.glowT <= 0 || m.dead) { G.scene.remove(m.glowBox); m.glowBox = null; } else { m.glowBox.box.min.set(m.pos.x - m.hw, m.pos.y, m.pos.z - m.hw); m.glowBox.box.max.set(m.pos.x + m.hw, m.pos.y + m.h, m.pos.z + m.hw); } }
    return r; }; }
// ---------------- minecarts with a furnace, TNT or hopper ----------------
const CART_BLOCK = { furnace: () => B.FURNACE, tnt: () => B.TNT, hopper: () => B.HOPPER };
function dressCart(c) { if (!c.kind || c.kindMesh) return; const id = CART_BLOCK[c.kind](); const m = new THREE.Mesh(blockGeo(id), itemBlockMat); m.scale.setScalar(0.6); m.position.set(0, 0.55, 0); c.mesh.add(m); c.kindMesh = m; if (c.kind === 'hopper' && !c.inv) c.inv = new Array(5).fill(null); }
{ const _cl = cartList; cartList = function () { const l = _cl.apply(this, arguments); l.forEach((o, i) => { const c = G.carts[i]; if (c && c.kind) { o.kind = c.kind; if (c.fuel) o.fuel = +c.fuel.toFixed(1); if (c.fsign) o.fs = c.fsign; if (c.inv) o.inv = c.inv.map(s => s ? Object.assign({ id: s.id, count: s.count }, xtra(s) || {}) : null); } }); return l; }; }
{ const _lc = loadCarts; loadCarts = function (list) { const r = _lc.apply(this, arguments); (list || []).forEach((d, i) => { const c = G.carts[i]; if (!c || !d || !d.kind) return; c.kind = d.kind; c.fuel = d.fuel || 0; c.fsign = d.fs || 1; if (d.inv) c.inv = d.inv.map(s => s && ITEMS[s.id] ? s : null); dressCart(c); }); return r; }; }
{ const _rc = removeCart; removeCart = function (c) { if (c.kind && !c.dropDone && c.hp >= 4) { c.dropDone = true; if (S.mode !== 'creative') { dropItem(CART_BLOCK[c.kind](), 1, c.pos.x, c.pos.y + 0.4, c.pos.z); if (c.inv && c.kind === 'hopper') for (const s of c.inv) if (s) dropItem(s.id, s.count, c.pos.x, c.pos.y + 0.4, c.pos.z, true, xtra(s)); } if (c.kind === 'tnt' && Math.abs(c.v) > 4) { const p = c.pos.clone(); setTimeout(() => explode(p.x, p.y + 0.5, p.z, 4, null, { cause: 'Minecart with TNT' }), 0); } } return _rc.apply(this, arguments); }; }
{ const _cp = cartPhysics; cartPhysics = function (c, dt, push) {
    if (c.kind === 'furnace' && c.fuel > 0) { c.fuel -= dt; if (Math.random() < dt * 8) Particles.emit(c.pos.x, c.pos.y + 1.1, c.pos.z, 1, [[0.4, 0.4, 0.4], [0.6, 0.6, 0.6]], 0.4, 1.5, -1.5, 0.15); if (Math.abs(c.v) < 3.2) c.v = (c.v ? Math.sign(c.v) : c.fsign || 1) * Math.min(3.2, Math.abs(c.v) + 6 * dt); c.fsign = Math.sign(c.v) || c.fsign; }
    const r = _cp.apply(this, arguments);
    // rails under the cart: powered activator rails light TNT carts and stop hopper carts
    const here = findRail(c.pos); const act = here && here[3].type === 'activator_rail' && here[3].on;
    if (c.kind === 'tnt' && act && !c.fuseT) { c.fuseT = 4; Sfx.at('hiss', c.pos.clone(), 1); }
    if (c.fuseT) { c.fuseT -= dt; if (Math.random() < dt * 20) Particles.emit(c.pos.x, c.pos.y + 1.1, c.pos.z, 1, [[1, 0.8, 0.3], [0.5, 0.5, 0.5]], 0.6, 0.6, -1, 0.1); if (c.mesh && c.kindMesh) c.kindMesh.visible = (c.fuseT * 4 | 0) % 2 === 0; if (c.fuseT <= 0) { c.fuseT = 0; const p = c.pos.clone(); c.dropDone = true; removeCart(c); explode(p.x, p.y + 0.5, p.z, 4, null, { cause: 'Minecart with TNT' }); } }
    if (c.kind === 'hopper' && !act) { c.hopT = (c.hopT || 0) - dt; if (c.hopT <= 0) { c.hopT = 0.2; const x = Math.floor(c.pos.x), y = Math.floor(c.pos.y + 0.2), z = Math.floor(c.pos.z); const me = { arr: c.inv, kind: 'box', slots: [0, 1, 2, 3, 4], x, y, z, k: 'cart:' + c.id };
        const src = typeof contAt === 'function' ? contAt(x, y + 1, z) : null; if (src && src.arr !== c.inv) { for (const s of contExtractSlots(src, 1)) { const it = src.arr[s]; if (!it) continue; if (contInsert(me, it, 0)) { it.count--; if (!it.count) src.arr[s] = null; contChanged(src); break; } } }
        for (const e of G.items || []) { if (e.gone || e.pickDelay > 0 || e.pos.distanceTo(c.pos) > 1.1) continue; while (e.count > 0 && contInsert(me, Object.assign({ id: e.id, count: 1 }, e.extra || {}), 0)) e.count--; if (e.count <= 0) { e.remove(); e.gone = true; } break; } } }
    return r; }; }
// hoppers (and comparators) see minecarts with chests or hoppers in the block above / in front of them
{ const _ca = contAt; contAt = function (x, y, z) { const r = _ca.apply(this, arguments); if (r) return r; for (const c of G.carts || []) { if (!c.inv || c.dim !== world.dim) continue; if (Math.floor(c.pos.x) === x && Math.floor(c.pos.z) === z && Math.floor(c.pos.y + 0.2) === y) return { arr: c.inv, k: 'cart:' + c.id, x, y, z, kind: 'box', slots: [...Array(c.inv.length).keys()] }; } return null; }; }
// ---------------- riding pigs and striders ----------------
function rideMob(m) { const P = player; if (P.riding || P.dead || m.rider) return; P.riding = m; m.rider = 'local'; m.mobRide = true; P.flying = false; P.sneaking = false; Sfx.at('saddle', m.pos, 0.6); }
function mobDismount() { const P = player; const m = P.riding; if (!m || !m.mobRide) return; P.riding = null; m.rider = null; m.mobRide = false;
  for (const a of [Math.PI / 2, -Math.PI / 2, 0, Math.PI]) { const x = m.pos.x + Math.sin(m.yaw + a) * 1.1, z = m.pos.z + Math.cos(m.yaw + a) * 1.1, y = Math.floor(m.pos.y + 0.2); if (!world.solid(Math.floor(x), y, Math.floor(z)) && !world.solid(Math.floor(x), y + 1, Math.floor(z))) { P.pos.set(x, y + 0.01, z); break; } }
  P.vel.set(0, 0, 0); P.peak = null; }
{ const _dm = dismount; dismount = function () { if (player.riding && player.riding.mobRide) return mobDismount(); return _dm.apply(this, arguments); }; }
{ const _ru = rideUpdate; rideUpdate = function (P, dt) { const m = P.riding; if (!m || !m.mobRide) return _ru.apply(this, arguments);
    if (m.dead || m.gone) { P.riding = null; return; } if (!S.uiOpen && kd('sneak')) { mobDismount(); return; }
    if (keys.KeyJ) look(-300 * dt, 0); if (keys.KeyL) look(300 * dt, 0); if (keys.KeyI) look(0, -300 * dt); if (keys.KeyK) look(0, 300 * dt);
    const h = P.held(); const hd = h && ITEMS[h.id]; const steer = hd && hd.kind === 'steer' && hd.steer === m.type;
    const base = m.type === 'strider' ? 2.3 : 2.4; m.boostT = Math.max(0, (m.boostT || 0) - dt); const sp = steer ? base * (m.boostT > 0 ? 2.2 : 1) * (m.type === 'strider' && !FKIND[world.get(Math.floor(m.pos.x), Math.floor(m.pos.y - 0.1), Math.floor(m.pos.z))] && !world.solid(Math.floor(m.pos.x), Math.floor(m.pos.y - 0.1), Math.floor(m.pos.z)) ? 0.5 : 1) : 0;
    if (steer) { m.yaw = P.yaw + Math.PI; m.vel.x = -Math.sin(P.yaw) * sp; m.vel.z = -Math.cos(P.yaw) * sp; } else { m.wT = (m.wT || 0) - dt; if (m.wT <= 0) { m.wT = 1 + Math.random() * 2; m.wDir = Math.random() * Math.PI * 2; m.wGo = Math.random() < 0.5; } m.vel.x = m.wGo ? Math.sin(m.wDir) * 1 : 0; m.vel.z = m.wGo ? Math.cos(m.wDir) * 1 : 0; if (m.wGo) m.yaw = m.wDir; }
    m.vel.y = Math.max(m.vel.y - 28 * dt, -30); if (m.hitH && m.onGround && (m.vel.x || m.vel.z)) m.vel.y = 8.2;
    // striders stand on lava
    if (m.type === 'strider') { const fy = Math.floor(m.pos.y - 0.05); const below = world.get(Math.floor(m.pos.x), fy, Math.floor(m.pos.z)); const at = world.get(Math.floor(m.pos.x), Math.floor(m.pos.y + 0.3), Math.floor(m.pos.z)); if (FKIND[at] === 2) { m.pos.y = Math.floor(m.pos.y + 0.3) + 1; m.vel.y = 0; } else if (FKIND[below] === 2 && m.vel.y < 0) { m.vel.y = 0; m.pos.y = fy + 1; m.onGround = true; } }
    moveEntity(m, dt); m.root.position.copy(m.pos); m.root.rotation.y = m.yaw; if (m.animate) m.animate(dt);
    const seat = m.type === 'strider' ? 1.6 : 0.82; P.pos.set(m.pos.x, m.pos.y + seat, m.pos.z); P.vel.copy(m.vel); P.onGround = true; P.peak = null; P.sprinting = false; P.sneaking = false; P.swimming = false; }; }
{ const _mu = Mob.prototype.update; Mob.prototype.update = function (dt) { if (this.mobRide && this.rider === 'local') { this.age = (this.age || 0) + dt; this.hurtT = Math.max(0, (this.hurtT || 0) - dt); this.lightT -= dt; if (this.lightT <= 0) { this.lightT = 0.3; this.light = Math.max(G.minLight || 0, world.lightAt(this.pos.x, this.pos.y + 1, this.pos.z, G.daylight)); } return; } return _mu.apply(this, arguments); }; }
function saddleMesh(m) { if (m.saddleMesh || !m.root) return; const g = new THREE.Group(); const mat = new THREE.MeshLambertMaterial({ color: 0x6a3a1c }); const top = new THREE.Mesh(new THREE.BoxGeometry(m.hw * 1.6, 0.08, m.hw * 1.3), mat); const y = m.type === 'strider' ? m.h - 0.1 : m.h - 0.02; top.position.set(0, y, 0); g.add(top);
  const strap = new THREE.Mesh(new THREE.BoxGeometry(m.hw * 2.05, 0.3, 0.12), new THREE.MeshLambertMaterial({ color: 0x3a2a1a })); strap.position.set(0, y - 0.15, 0); g.add(strap); m.root.add(g); m.saddleMesh = g; }
function wolfArmorMesh(m) { if (!m.root) return; if (m.wolfArmorMesh) { m.wolfArmorMesh.visible = !!m.wolfArmor; return; } if (!m.wolfArmor) return; const g = new THREE.Mesh(new THREE.BoxGeometry(m.hw * 2.3, m.h * 0.5, m.hw * 3.4), new THREE.MeshLambertMaterial({ color: 0x9a7e6a, transparent: true, opacity: 0.92 })); g.position.set(0, m.h * 0.62, 0); m.root.add(g); m.wolfArmorMesh = g; }
{ const _ua = useAction; useAction = function (eye, dir) { const h = player.held(); const hd = h && ITEMS[h.id]; const m = targetMob; const sneaking = kd('sneak');
    // furnace, TNT and hopper minecarts
    if (typeof targetCart !== 'undefined' && targetCart && targetCart.kind && !sneaking) { const c = targetCart; mouseR = false; S.swing = 1;
      if (c.kind === 'furnace') { if (h && (h.id === IT.coal || h.id === IT.charcoal)) { useHeld(1); c.fuel = (c.fuel || 0) + 180; const d = c.pos.clone().sub(player.pos); const rl = findRail(c.pos); if (rl) { const [p1, p2] = railLine(rl[0], rl[1], rl[2], rl[3]); const rd = p2.clone().sub(p1); c.fsign = Math.sign(rd.x * d.x + rd.z * d.z) || 1; c.v = c.fsign * 0.5; } Sfx.play('fire', 0.6); } return; }
      if (c.kind === 'hopper') { const key = 'cart:' + c.id; world.chestInv.set(key, c.inv); Sfx.play('chest', 0.7); openUI('chest', key); $('chestTitle').textContent = 'Minecart with Hopper'; return; }
      return; }
    if (hd && hd.kind === 'minecart' && hd.cart && hd.cart !== 'chest' && target) { mouseR = false; const r = railAt(target.x, target.y, target.z); if (!r) return; const c = makeCart(target.x + 0.5, target.y + 0.0625, target.z + 0.5, false); c.kind = hd.cart; const [p1, p2] = railLine(target.x, target.y, target.z, r); c.yaw = Math.atan2(p2.x - p1.x, p2.z - p1.z); dressCart(c); useHeld(1); S.swing = 1; Sfx.play('stone', 0.7, 1.2); return; }
    if (m && !m.dead && (m.type === 'pig' || m.type === 'strider')) {
      if (h && h.id === IT.saddle && !m.saddled && !m.baby) { m.saddled = true; saddleMesh(m); useHeld(1); Sfx.at('saddle', m.pos, 0.8); S.swing = 1; mouseR = false; return; }
      if (m.saddled && !sneaking && !(hd && (BREED_FOOD[m.type] || []).includes(hd.key))) { mouseR = false; rideMob(m); return; } }
    // boosting while riding
    if (player.riding && player.riding.mobRide && hd && hd.kind === 'steer' && hd.steer === player.riding.type) { mouseR = false; if ((player.riding.boostT || 0) <= 0) { player.riding.boostT = 2.5; if (S.mode !== 'creative') { h.dmg = (h.dmg || 0) + 7; if (h.dmg >= (hd.dur || 25)) { player.inv[handSlot()] = { id: IT.fishing_rod, count: 1 }; Sfx.play('break', 0.8); } invDirty(); } } return; }
    // wolf armor
    if (m && m.type === 'wolf' && !m.dead && m.tamed && (typeof isOwner !== 'function' || isOwner(m))) {
      if (h && h.id === IT.wolf_armor && !m.wolfArmor && !m.baby) { m.wolfArmor = { dmg: h.dmg || 0 }; wolfArmorMesh(m); useHeld(1); Sfx.at('armor', m.pos, 0.8); S.swing = 1; mouseR = false; return; }
      if (h && h.id === IT.shears && m.wolfArmor) { dropItem(IT.wolf_armor, 1, m.pos.x, m.pos.y + 0.6, m.pos.z, true, m.wolfArmor.dmg ? { dmg: m.wolfArmor.dmg } : null); m.wolfArmor = null; wolfArmorMesh(m); if (typeof damageHeld === 'function') damageHeld(1); Sfx.at('shear', m.pos, 0.8); S.swing = 1; mouseR = false; return; } }
    return _ua.apply(this, arguments); }; }
// wolf armor soaks up damage (64 points) until it breaks
{ const _h = Mob.prototype.hurt; Mob.prototype.hurt = function (dmg, src, kb, noAnger) { if (this.type === 'wolf' && this.wolfArmor && dmg > 0) { this.wolfArmor.dmg += dmg; Sfx.at('armor', this.pos, 0.5); if (this.wolfArmor.dmg >= 64) { this.wolfArmor = null; wolfArmorMesh(this); Sfx.at('break', this.pos, 0.9); } this.hurtT = 0.3; return false; } return _h.apply(this, arguments); }; }
// a dead pig or strider drops its saddle
{ const _h2 = Mob.prototype.hurt; Mob.prototype.hurt = function () { const was = this.dead; const r = _h2.apply(this, arguments); if (this.dead && !was) { if (this.saddled) dropItem(IT.saddle, 1, this.pos.x, this.pos.y + 0.5, this.pos.z); if (this.wolfArmor) dropItem(IT.wolf_armor, 1, this.pos.x, this.pos.y + 0.5, this.pos.z); if (player.riding === this) mobDismount(); } return r; }; }
{ const _r = mobRecord; mobRecord = function (m) { const r = _r.apply(this, arguments); if (m.saddled) r.sa = 1; if (m.wolfArmor) r.wa = m.wolfArmor.dmg || 0; return r; }; }
{ const _f = mobFromRecord; mobFromRecord = function (rec) { const m = _f.apply(this, arguments); if (m && rec) { if (rec.sa) { m.saddled = true; saddleMesh(m); } if (rec.wa !== undefined) { m.wolfArmor = { dmg: rec.wa }; wolfArmorMesh(m); } } return m; }; }
// ---------------- pitcher crops finish as a two-block pitcher plant ----------------
B.TORCHFLOWER_CROP_3 = B.TORCHFLOWER; B.PITCHER_CROP_3 = B.PITCHER_PLANT;
{ const _set = World.prototype.set; World.prototype.set = function (x, y, z, id, record) { const r = _set.apply(this, arguments); if (r !== false && this === G.world && id === B.PITCHER_PLANT && BL[id].tallOther !== undefined && !this.get(x, y + 1, z)) _set.call(this, x, y + 1, z, BL[id].tallOther, record); return r; }; }
// ---------------- creative order ----------------
{ const keys = ['clay_brick', 'spectral_arrow', 'ominous_bottle', ...BANNER_PATTERNS.map(p => p[0] + '_banner_pattern'), ...TRIMS.map(t => t + '_armor_trim_smithing_template'), 'carrot_on_a_stick', 'warped_fungus_on_a_stick', 'wolf_armor', 'furnace_minecart', 'tnt_minecart', 'hopper_minecart', 'torchflower_seeds', 'pitcher_pod', 'sniffer_egg', 'tripwire_hook', 'crafter', 'calibrated_sculk_sensor'];
  const ids = keys.map(k => IT[k]).filter(v => v !== undefined); const set = new Set(ids); const rest = ITEM_IDS.filter(i => !set.has(i)); rest.push(...ids); ITEM_IDS.length = 0; ITEM_IDS.push(...rest); }

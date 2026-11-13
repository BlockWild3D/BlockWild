// ================= THROWABLES, PIGLIN BARTERING, THE WARDEN'S HEARING =================
// Ender pearls, eggs and snowballs fly like Minecraft's (1.5 blocks per tick, gravity 0.03, drag 0.99): about 30
// blocks/s, so a pearl thrown at 45 degrees lands ~60 blocks away. Snowballs do nothing to most mobs but knock them
// back; blazes take 3. Snow golems drop snowballs; snow blocks drop 4 (and 4 make a block).
PROJ.snowball = { grav: 12, size: 0.2, color: 0xf6faff };
if (PROJ.egg) PROJ.egg.grav = 12;
{ const _up = updateProjectiles; updateProjectiles = function (dt) { for (const a of G.projectiles) if ((a.kind === 'pearl' || a.kind === 'egg' || a.kind === 'snowball') && !a.done) a.vel.multiplyScalar(Math.pow(0.99, dt * 20)); return _up.apply(this, arguments); }; }
{ const _ua = useAction; useAction = function (eye, dir) { const h = player.held(); const hd = h && ITEMS[h.id]; const sneaking = kd('sneak');
    if (hd && hd.kind === 'snowball' && !(target && !sneaking && BL[target.id].use)) { mouseR = false; useHeld(1); const v = dir.clone().multiplyScalar(30); v.x += player.vel.x; v.z += player.vel.z; spawnProj('snowball', eye.clone().addScaledVector(dir, 0.5), v, 'player', 0); Sfx.play('bow', 0.4, 1.5); S.useCD = 0.25; S.swing = 1; return; }
    if (hd && hd.kind === 'egg' && !(target && !sneaking && BL[target.id].use)) { const n0 = G.projectiles.length; const r = _ua(eye, dir); const p = G.projectiles[G.projectiles.length - 1]; if (G.projectiles.length > n0 && p && p.kind === 'egg') { p.vel.copy(dir.clone().multiplyScalar(30)); } return r; }
    return _ua(eye, dir); }; }
{ const _pi = projImpact; projImpact = function (a, mob) {
    if (a.kind !== 'snowball') return _pi(a, mob); a.done = true; Particles.emit(a.pos.x, a.pos.y, a.pos.z, 8, [[1, 1, 1], [0.85, 0.9, 1]], 1.5, 0.4, 8, 0.3); vibrate(a.pos, a.src || 'player');
    if (mob && !mob.dead) mob.hurt(mob.type === 'blaze' ? 3 : 0, a.pos.clone().addScaledVector(a.vel, -0.2), 0.4, a.owner !== 'player'); }; }
{ const _up = updateProjectiles; updateProjectiles = function (dt) { // player snowballs hit mobs (the base code only knows arrows)
    for (const a of G.projectiles) if (a.kind === 'snowball' && a.owner === 'player' && !a.done) for (const m of G.mobs) { if (m.dead || m.isBoss) continue; if (hitsMob(m, a.pos, 0.2)) { projImpact(a, m); break; } }
    return _up.apply(this, arguments); }; }
if (MOBS.snow_golem) MOBS.snow_golem.drops = [['snowball', 0, 15, 1]];
// ---------- piglin bartering (Minecraft 1.21 table, weights out of 459) ----------
// Drop or hand a gold ingot to an adult piglin: it picks it up, admires it for 6 seconds, then throws you something.
BARTER.length = 0; BARTER.push(['enchanted_book', 1, 1, 5], ['iron_boots', 1, 1, 8], ['splash_potion', 1, 1, 8], ['potion', 1, 1, 8], ['potion', 1, 1, 10], ['iron_nugget', 10, 36, 10], ['ender_pearl', 2, 4, 10], ['string', 3, 9, 20], ['quartz', 5, 12, 20], ['obsidian', 1, 1, 40], ['leather', 2, 4, 40], ['soul_sand', 2, 8, 40], ['nether_brick', 2, 8, 40], ['arrow', 6, 12, 40], ['gravel', 8, 16, 40], ['magma_cream', 2, 6, 40], ['netherrack', 8, 16, 40]);
rollBarter = function () { const tot = BARTER.reduce((s, b) => s + b[3], 0); let q = Math.random() * tot; let pick = BARTER[BARTER.length - 1];
  for (const b of BARTER) { q -= b[3]; if (q <= 0) { pick = b; break; } } const [k, a, bb] = pick; const n = a + Math.floor(Math.random() * (bb - a + 1)); let ex = null;
  if (k === 'enchanted_book' || k === 'iron_boots') ex = { ench: { soul_speed: 1 + Math.floor(Math.random() * 3) } };
  if (k === 'splash_potion' || (k === 'potion' && pick === BARTER[3])) ex = { pot: 'fire_resistance' }; if (k === 'potion' && pick === BARTER[4]) ex = { pot: 'water' };
  return [IT[k], n, ex]; };
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) {
    if (this.type === 'piglin' && !this.dead && !this.baby && !(this.angry > 0) && !(this.admireT > 0) && !isClientMP()) {
      this.goldScan = (this.goldScan || 0) - dt; if (this.goldScan <= 0) { this.goldScan = 0.5; this.goldTarget = G.items.find(it => !it.gone && it.id === IT.gold_ingot && it.age > 0.5 && it.pos.distanceTo(this.pos) < 8) || null; }
      const it = this.goldTarget; if (it && !it.gone) { steerTo(this, it.pos, 0.6); this.goalBoost = true; if (it.pos.distanceTo(this.pos) < 1.4) { it.count--; if (it.count <= 0) { it.gone = true; it.remove(); } this.goldTarget = null; this.admireT = 6; Sfx.at('snort', this.pos, 1); } } }
    return _u.call(this, dt); }; }
// ---------- the Warden hears everything ----------
// Footsteps of any mob that isn't sneaking, projectiles landing (snowballs, arrows, eggs), blocks breaking or being
// placed, and you: the Warden can't see, so it can't tell a cow from a creeper from you. It walks to the newest
// sound within 16 blocks, gets angrier at whatever made it, and attacks that, mob or player.
G.vibes = [];
function vibrate(pos, src) { G.vibes.push({ pos: pos.clone ? pos.clone() : new V3(pos.x, pos.y, pos.z), src, t: G.simT || 0 }); if (G.vibes.length > 40) G.vibes.shift(); }
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) { const r = _u.call(this, dt);
    if (!this.dead && this.type !== 'warden' && this.onGround && !this.t.fly && Math.hypot(this.vel.x, this.vel.z) > 0.6 && !G.vibesOff) { this.stepV = (this.stepV || 0) + dt; if (this.stepV > 0.8) { this.stepV = 0; if (G.mobs.some(w => w.type === 'warden' && !w.dead && w.pos.distanceTo(this.pos) < 20)) vibrate(this.pos, this); } }
    return r; }; }
{ const _pi = projImpact; projImpact = function (a, mob) { if (a.kind !== 'snowball') vibrate(a.pos, a.owner === 'player' ? 'player' : a.src || null); return _pi(a, mob); }; }
{ const _up = updateProjectiles; updateProjectiles = function (dt) { const live = G.projectiles.filter(a => a.kind === 'arrow' && !a.done); const r = _up.apply(this, arguments); for (const a of live) if (a.done) vibrate(a.pos, a.owner === 'player' ? 'player' : a.src || null); return r; }; }
{ const _bb = breakBlock; breakBlock = function (x, y, z) { vibrate(new V3(x + 0.5, y + 0.5, z + 0.5), 'player'); return _bb.apply(this, arguments); }; }
{ const _pb = placeBlock; placeBlock = function (t, id) { const r = _pb.apply(this, arguments); if (r) vibrate(new V3(t.x + t.nx + 0.5, t.y + t.ny + 0.5, t.z + t.nz + 0.5), 'player'); return r; }; }
{ const prev = MOBS.warden.tick; MOBS.warden.tick = function (m, dt) {
    if (m.emergeT > 0 || m.emergeT == null) return prev(m, dt);
    // pick up the newest vibration within 16 blocks (not its own)
    const now = G.simT || 0; let best = null; for (const v of G.vibes) { if (now - v.t > 1.5 || v.src === m) continue; const d = v.pos.distanceTo(m.pos); if (d > 16) continue; if (!best || v.t > best.t) best = v; }
    if (best && best !== m.lastVibe) { m.lastVibe = best; m.heard = best.pos.clone(); const key = best.src === 'player' ? 'player' : best.src; if (key) { m.suspects = m.suspects || new Map(); m.suspects.set(key, Math.min(150, (m.suspects.get(key) || 0) + 35)); } m.anger = Math.max(m.anger || 0, 20); Particles.emit(best.pos.x, best.pos.y + 0.5, best.pos.z, 4, [[0.3, 0.9, 0.95]], 1, 0.5, 0, 0.4); }
    // the angriest suspect that is a mob gets attacked; the player is handled by the original code
    let foe = null, fa = 0; if (m.suspects) for (const [k, a] of m.suspects) { if (k !== 'player' && (k.dead || k.gone)) { m.suspects.delete(k); continue; } const a2 = a - dt * 2; m.suspects.set(k, Math.max(0, a2)); if (a2 > fa) { fa = a2; foe = k; } }
    if (foe && foe !== 'player' && fa > 40 && !foe.dead) { steerTo(m, foe.pos, 1.2); m.goalBoost = true; m.atkCD = (m.atkCD || 0) - dt; m.age += dt; m.hurtT = Math.max(0, m.hurtT - dt);
      if (m.pos.distanceTo(foe.pos) < 2.4 + (foe.hw || 0) && m.atkCD <= 0) { m.atkCD = 0.9; foe.hurt(m.t.dmg, m.pos, 1.6); if (m.arms) for (const a of m.arms) a.rotation.x = -1.4; Sfx.at('roar', m.pos, 0.5, 1.4); }
      m.heartPulse = (m.heartPulse || 0) + dt * 3; if (m.heart) m.heart.scale.setScalar(1 + Math.sin(m.heartPulse * 6) * 0.25); m.lostT = 0; return false; }
    if (m.suspects && m.suspects.has('player')) m.anger = Math.max(m.anger || 0, m.suspects.get('player'));
    return prev(m, dt); }; }
// ---------- shulker boxes ----------
// 27 slots like a chest, but breaking one drops the box with everything still inside; place it again and the items are
// there. Shulker boxes can't be put inside shulker boxes. Craft: shulker shell, chest, shulker shell.
{ const _rm = onBlockRemoved; onBlockRemoved = function (x, y, z, id) {
    if (id === B.SHULKER_BOX) { const k = x + ',' + y + ',' + z; const inv = world.chestInv.get(k); world.chestInv.delete(k); const has = inv && inv.some(Boolean);
      dropItem(IT.shulker_box, 1, x + 0.5, y + 0.5, z + 0.5, true, has ? { inv: inv.map(s => s ? Object.assign({}, s) : null) } : null); return; }
    return _rm(x, y, z, id); }; }
{ const _pb = placeBlock; placeBlock = function (t, id) { const h = player.held(); const inv = id === B.SHULKER_BOX && h && h.id === IT.shulker_box && h.inv ? h.inv : null; const r = _pb.apply(this, arguments);
    if (r && inv) world.chestInv.set((t.x + t.nx) + ',' + (t.y + t.ny) + ',' + (t.z + t.nz), inv.map(s => s ? Object.assign({}, s) : null)); return r; }; }
{ const _x = xtra; xtra = function (s) { const o = _x(s); if (!s || !s.inv) return o; return Object.assign(o || {}, { inv: s.inv }); }; }
{ const _tt = itemTooltip; itemTooltip = function (s) { const t = _tt(s); if (!s || s.id !== IT.shulker_box || !s.inv) return t; const items = s.inv.filter(Boolean); const lines = items.slice(0, 5).map(q => (q.pot && typeof potionName === 'function' ? potionName(q) : ITEMS[q.id].name) + ' x' + q.count); if (items.length > 5) lines.push('and ' + (items.length - 5) + ' more...'); return t + '\n' + lines.join('\n'); }; }
{ const _sc = slotClick; slotClick = function (cont, i, button, shift) {
    const inShulker = S.chestKey && (() => { const p = String(S.chestKey).split(',').map(Number); return p.length === 3 && world.get(p[0], p[1], p[2]) === B.SHULKER_BOX; })();
    if (inShulker) { if (cont === 'chest' && S.cursor && S.cursor.id === IT.shulker_box) { toast("Shulker boxes can't go in shulker boxes", 1.5); return; } if (cont === 'inv' && shift && player.inv[i] && player.inv[i].id === IT.shulker_box) { toast("Shulker boxes can't go in shulker boxes", 1.5); return; } }
    return _sc(cont, i, button, shift); }; }
{ const _ou = openUI; openUI = function (kind, key) { const r = _ou(kind, key); if (kind === 'chest' && $('chestTitle')) { const p = String(key).split(',').map(Number); if (p.length === 3 && world.get(p[0], p[1], p[2]) === B.SHULKER_BOX) { $('chestTitle').textContent = 'Shulker Box'; Sfx.play('vwoop', 0.3, 1.6); } } return r; }; }

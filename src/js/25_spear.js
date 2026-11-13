// ================= SPEARS (Minecraft "Mounts of Mayhem") =================
// Jab (attack): reaches 2 to 4.5 blocks (the target's hitbox counts 0.125 bigger), fixed damage per tier, then a
// cooldown. Closer than 2 blocks the jab can't connect. Jabs never crit.
// Charge (hold use): after a short delay the spear is held out. Damage = tier multiplier x closing speed (your speed
// toward the target along your view, minus theirs; falling counts), from 4.6 blocks/s; knockback from 5.1 blocks/s. The charge goes
// through three stages: Engaged (damage, knockback, knocks riders off at the tier's dismount speed), Tired (damage
// and knockback) and Disengaged (damage only), then ends. After its first hit on a mob a charge only pushes it.
// Sprinting (5.6 blocks/s) is just enough; riding a horse hits hard. Jab and charge have separate timers.
// Lunge (spear enchantment, I-III): a jab also launches you forward at 9.16 blocks/s per level, costing 1 hunger
// per level and 1 durability; not while riding, in water, or with 6 or less food.
const SPEAR = { min: 2, max: 4.5, pad: 0.125, dmgSpeed: 4.6, kbSpeed: 5.1 };
ENCH.lunge = { name: 'Lunge', max: 3, for: 'spear', w: 5 };
{ const _ec = enchCat; enchCat = function (id) { const it = ITEMS[id]; if (it && it.kind === 'tool' && it.tool === 'spear') return 'spear'; return _ec(id); };
  const _ef = enchantFits; enchantFits = function (id, en) { if (enchCat(id) === 'spear') return !!ENCH[en] && (ENCH[en].for === 'spear' || ENCH[en].for === 'sword' || ENCH[en].for === '*'); return _ef(id, en); }; }
function heldSpear() { const it = player.heldDef(); return it && it.kind === 'tool' && it.tool === 'spear' ? it : null; }
// first mob along the view ray, its distance, and whether it is inside the spear's reach band
function spearRay(eye, dir) {
  const blk = raycast(eye, dir, SPEAR.max); const maxT = blk ? blk.dist : SPEAR.max;
  let best = null, bt = maxT;
  for (const m of G.mobs) {
    if (m.dead || m === player.riding) continue;
    const p = SPEAR.pad; const t = m.rayTest ? m.rayTest(eye, dir) : rayAABB(eye, dir, new V3(m.pos.x - m.hw - p, m.pos.y - p, m.pos.z - m.hw - p), new V3(m.pos.x + m.hw + p, m.pos.y + m.h + p, m.pos.z + m.hw + p));
    if (t >= 0 && t < bt) { bt = t; best = m; }
  }
  return best ? { mob: best, dist: bt } : null;
}
function spearStage(sp, t) {
  const s = sp.spear; if (t < s.delay) return 'raise'; t -= s.delay;
  if (t < s.eng) return 'engaged'; t -= s.eng; if (t < s.tired) return 'tired'; t -= s.tired; if (t < s.dis) return 'disengaged'; return 'done';
}
S.jabCD = 0; S.jabT = 0; S.charge = null;
function spearJab(sp, eye, dir) {
  S.jabCD = sp.cool; S.jabT = 1; S.swing = 0; Sfx.play('bow', 0.35, 1.6);
  const hit = spearRay(eye, dir);
  if (hit && hit.dist >= SPEAR.min - SPEAR.pad) {
    const m = hit.mob; const eb = meleeBonus(m); const dmg = Math.max(0, sp.dmg + eb.dmg);
    m.hurt(dmg, player.pos, 0.7 * eb.kb); damageHeld(1); if (typeof exhaust === 'function') exhaust(0.1);
    Particles.emit(m.pos.x, m.pos.y + Math.min(m.h, 2) * 0.6, m.pos.z, 4, [[0.85, 0.85, 0.85]], 1.5, 0.3, 6, 0.3);
  }
  // Lunge
  const lv = heldEnch('lunge'), P = player;
  if (lv && !P.riding && !inWater(P, 0.4) && !P.flying && (!isSurv() || P.food >= 6)) {
    const h = new V3(dir.x, 0, dir.z); if (h.lengthSq() > 1e-4) { h.normalize(); const v = 9.16 * lv; const along = P.vel.x * h.x + P.vel.z * h.z; if (along < v) { P.vel.x += h.x * (v - along); P.vel.z += h.z * (v - along); } if (P.onGround) P.vel.y = Math.max(P.vel.y, 2.5); P.peak = null; }
    if (isSurv() && S.difficulty !== 'peaceful') { let cost = lv; const fromSat = Math.min(P.sat, cost); P.sat -= fromSat; cost -= fromSat; P.food = Math.max(0, P.food - cost); renderFood(); }
    damageHeld(1); Sfx.play('vwoop', 0.25, 1.6);
  }
}
function spearCharge(sp, eye, dir, dt) {
  const C = S.charge; C.t += dt; const st = spearStage(sp, C.t); C.stage = st;
  if (st === 'raise' || st === 'done') return;
  const P = player; const pv = P.riding ? P.riding.vel : P.vel;
  for (const m of G.mobs) {
    if (m.dead || m === P.riding) continue;
    const p = SPEAR.pad; const t = rayAABB(eye, dir, new V3(m.pos.x - m.hw - p, m.pos.y - p, m.pos.z - m.hw - p), new V3(m.pos.x + m.hw + p, m.pos.y + m.h + p, m.pos.z + m.hw + p));
    if (t < 0 || t > SPEAR.max || t < SPEAR.min - p) continue;
    const blk = raycast(eye, dir, t); if (blk && blk.dist < t) continue;
    const mv = m.vel || new V3(); const speed = (pv.x - mv.x) * dir.x + (pv.y - mv.y) * dir.y + (pv.z - mv.z) * dir.z; // falling counts too: dive onto a mob
    if (speed < SPEAR.dmgSpeed) continue;
    const last = C.hits.get(m); const now = C.t; if (last != null && now - last < 0.25) continue;
    const first = last == null; C.hits.set(m, now);
    const kb = (st === 'engaged' || st === 'tired') && speed >= SPEAR.kbSpeed ? Math.min(2.5, 0.6 + (speed - SPEAR.kbSpeed) * 0.12) : 0;
    if (first) { const dmg = Math.floor(sp.spear.mult * speed); m.hurt(dmg, P.pos, kb); damageHeld(1); Particles.emit(m.pos.x, m.pos.y + Math.min(m.h, 2) * 0.6, m.pos.z, 10, [[1, 1, 0.7], [0.9, 0.9, 0.9]], 3, 0.45, 4, 0.5); Sfx.play('hurt', 0.4, 0.7); if (C.hits.size >= 5 && !C.kabob) { C.kabob = true; toast('Mob Kabob! Five mobs in one charge', 2.5); } }
    else if (kb) { const d = new V3(m.pos.x - P.pos.x, 0, m.pos.z - P.pos.z); if (d.lengthSq() > 1e-4) d.normalize(); m.vel.x += d.x * 7 * kb; m.vel.z += d.z * 7 * kb; m.vel.y = Math.max(m.vel.y, 3 * kb); }
    if (st === 'engaged' && speed >= sp.spear.dismount && m.rider != null && m.rider !== 'local') { /* knocks a rider off (multiplayer) */ }
  }
}
{ const _ui = updateInteraction; updateInteraction = function (dt) {
    S.jabCD -= dt; S.jabT = Math.max(0, S.jabT - dt * 5);
    const sp = heldSpear(); const P = player;
    if (!sp || S.uiOpen || P.dead || S.mode === 'spectator') { S.charge = null; return _ui.apply(this, arguments); }
    const eye = P.eye(), dir = lookDir();
    // charge: hold use (but not when right-clicking something you can use)
    if (mouseR && !(targetMob && typeof mobWantsItem === 'function' && targetMob.hg) && !(target && BL[target.id].use)) {
      if (!S.charge) { S.charge = { t: 0, hits: new Map(), stage: 'raise' }; Sfx.play('bowdraw', 0.4, 0.7); }
      spearCharge(sp, eye, dir, dt);
    } else S.charge = null;
    // jab: attack, unless the attack is digging a block with no mob in the way
    let jab = false;
    if (mouseL) { const hit = spearRay(eye, dir); const blk = raycast(eye, dir, S.mode === 'creative' ? 6 : 4.5); jab = !!hit || !blk; if (jab && S.jabCD <= 0) spearJab(sp, eye, dir); }
    if (jab) { const ml = mouseL; mouseL = false; try { return _ui.apply(this, arguments); } finally { mouseL = ml; } }
    return _ui.apply(this, arguments);
  }; }
// spear poses in first person: thrust on a jab; while charging, held forward (engaged), turned and shaking (tired),
// lowered (disengaged)
{ const _uh = updateHand; updateHand = function (dt, light) {
    const r = _uh.apply(this, arguments); const sp = heldSpear(); if (!sp || !handMesh) return r;
    const C = S.charge; const st = C ? C.stage : null; const t = performance.now() / 1000;
    const want = st && st !== 'done' ? 1 : 0; S.spearPose = (S.spearPose || 0) + (want - (S.spearPose || 0)) * Math.min(1, dt * 10); const k = S.spearPose;
    const j = Math.sin(S.jabT * Math.PI);
    handGroup.position.z -= j * 0.38; handGroup.position.x -= j * 0.12; handGroup.position.y += j * 0.04;
    if (k > 0.01) {
      const tired = st === 'tired', dis = st === 'disengaged' || st === 'done', raise = st === 'raise';
      const shake = tired ? Math.sin(t * 40) * 0.01 : 0;
      handGroup.position.x += (-0.22 + shake) * k; handGroup.position.y += ((dis ? 0.02 : raise ? -0.03 : 0.06) + shake) * k; handGroup.position.z += 0.1 * k;
      const T = [dis ? -0.42 : raise ? -0.1 : 0.08, Math.PI / 2 + 0.16, -Math.PI / 4 + (tired ? 0.85 + shake * 6 : 0)];
      handMesh.rotation.set(HELD_ROT[0] + (T[0] - HELD_ROT[0]) * k, HELD_ROT[1] + (T[1] - HELD_ROT[1]) * k, HELD_ROT[2] + (T[2] - HELD_ROT[2]) * k);
    } else handMesh.rotation.set(HELD_ROT[0], HELD_ROT[1], HELD_ROT[2]);
    return r;
  }; }

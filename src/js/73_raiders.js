// ================= ILLAGERS FIGHT IRON GOLEMS AND VILLAGERS (Minecraft) =================
// Pillagers, vindicators, evokers, ravagers and vexes target, like Minecraft's raiders: you first (in survival, within
// 16 blocks), otherwise the nearest iron golem, villager or wandering trader. Vindicators and ravagers charge in and
// hit; pillagers keep their distance and fire crossbow bolts that actually hit the mob; evokers send fangs and vexes
// at it; vexes fly at it. Iron golems already fight back. Evoker fangs never hurt other illagers.
const RAIDERS = new Set(['pillager', 'vindicator', 'evoker', 'ravager', 'vex']);
const ILLAGER_KIN = new Set(['pillager', 'vindicator', 'evoker', 'ravager', 'vex', 'witch']);
const RAID_PREY = new Set(['iron_golem', 'villager', 'wandering_trader']);
function raiderPrey(m) {
  const P = player; if (isSurv() && !P.dead && P.pos.distanceTo(m.pos) < 18) return null; // the player comes first
  let best = null, bd = 16; for (const o of G.mobs) { if (o.dead || o.gone || !RAID_PREY.has(o.type)) continue; const d = o.pos.distanceTo(m.pos); if (d < bd) { bd = d; best = o; } } return best;
}
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) {
    if (!RAIDERS.has(this.type) || this.dead || isClientMP() || this.type === 'vex' || this.type === 'evoker') return _u.call(this, dt);
    this.preyT = (this.preyT || 0) - dt; if (this.preyT <= 0) { this.preyT = 0.5; this.prey = raiderPrey(this); }
    const o = this.prey; if (!o || o.dead || o.gone) { this.prey = null; return _u.call(this, dt); }
    const d = this.pos.distanceTo(o.pos), reach = 1.4 + this.hw + o.hw; this.atkCD = this.atkCD || 0;
    if (this.type === 'pillager') { // keep 8 blocks away and shoot
      if (d > 9) steerTo(this, o.pos, 8); else { this.wMove = 0; this.wT = 0.3; this.wYaw = Math.atan2(o.pos.x - this.pos.x, o.pos.z - this.pos.z); }
      if (d < 16 && this.atkCD <= 0 && lineOfSight(new V3(this.pos.x, this.pos.y + 1.5, this.pos.z), new V3(o.pos.x, o.pos.y + o.h * 0.6, o.pos.z))) { this.atkCD = 1.8 + Math.random();
        const n0 = G.projectiles.length; shootArrow(new V3(this.pos.x, this.pos.y + 1.5, this.pos.z), new V3(o.pos.x, o.pos.y + o.h * 0.6, o.pos.z), 'mob', 4, 26);
        for (let i = n0; i < G.projectiles.length; i++) { G.projectiles[i].mobTarget = o; G.projectiles[i].shooter = this; } }
    } else { // vindicator, ravager: charge and hit
      steerTo(this, o.pos, reach * 0.8);
      if (d < reach && Math.abs(o.pos.y - this.pos.y) < 2 && this.atkCD <= 0) { this.atkCD = this.type === 'ravager' ? 2 : 1; o.hurt(this.t.dmg, this.pos, this.t.kb || 1, true); this.armSwing = 0.3; if (o.type === 'iron_golem') o.angryAt = this; Sfx.at('hit', this.pos, 0.5); }
    }
    const sp = this.spMul; this.spMul = (sp || 1) * 1.6; // chase at full speed, not the wandering pace
    try { return _u.call(this, dt); } finally { this.spMul = sp; }
  }; }
// crossbow bolts aimed at a mob hit that mob
{ const _up = updateProjectiles; updateProjectiles = function (dt) {
    for (const a of G.projectiles) { const o = a.mobTarget; if (!o || a.done) continue; if (o.dead) { a.mobTarget = null; continue; }
      if (hitsMob(o, a.pos, 0.25)) { a.done = true; o.hurt(a.dmg || 4, a.pos.clone().addScaledVector(a.vel, -0.1), 0.5, true); } }
    return _up.apply(this, arguments); }; }
// evokers: fangs and vexes go after the mob too
{ const _t = MOBS.evoker.tick; MOBS.evoker.tick = function (m, dt) {
    m.preyT = (m.preyT || 0) - dt; if (m.preyT <= 0) { m.preyT = 0.5; m.prey = raiderPrey(m); }
    if (!m.prey || m.prey.dead) return _t(m, dt);
    const _ht = hostileTarget; hostileTarget = (mm, range) => mm === m ? (m.prey.pos.distanceTo(m.pos) < (range || 16) ? m.prey : null) : _ht(mm, range);
    try { const r = _t(m, dt); for (const v of G.mobs) if (v.type === 'vex' && v.owner === m) v.prey = m.prey; return r; } finally { hostileTarget = _ht; } }; }
// vexes: fly at their prey
{ const _t = MOBS.vex.tick; MOBS.vex.tick = function (m, dt) {
    if (hostileTarget(m, 32)) return _t(m, dt); // the player comes first
    if (!m.prey || m.prey.dead) { m.preyT = (m.preyT || 0) - dt; if (m.preyT <= 0) { m.preyT = 0.5; m.prey = raiderPrey(m); } }
    const o = m.prey; if (!o || o.dead) return _t(m, dt);
    m.age += dt; m.hurtT = Math.max(0, m.hurtT - dt); m.atkCD -= dt; m.life = (m.life || 60) - dt; if (m.life <= 0) { m.hurt(1, null, 0, true); m.life = 1; } m.light = 1;
    const want = o.pos.clone().add(new V3(0, o.h * 0.6, 0)).sub(m.pos); const L = want.length();
    if (L < 1.2 + o.hw && m.atkCD <= 0) { m.atkCD = 1; o.hurt(m.t.dmg, m.pos, 0.6, true); m.armSwing = 0.3; }
    want.multiplyScalar(Math.min(6, L * 2) / Math.max(L, 0.01)); m.vel.lerp(want, Math.min(1, dt * 3)); m.pos.addScaledVector(m.vel, dt);
    m.yaw += angWrap(Math.atan2(m.vel.x, m.vel.z) - m.yaw) * Math.min(1, dt * 8); m.root.position.copy(m.pos); m.root.rotation.y = m.yaw;
    if (m.wings) m.wings.forEach((w, i) => w.rotation.y = Math.sin(m.age * 20) * 0.4 * (i ? -1 : 1));
    if (m.arms) { m.arms[1].rotation.x = -1.2 - (m.armSwing > 0 ? 0.8 : 0); m.armSwing = Math.max(0, (m.armSwing || 0) - dt); } m.colorize(); return true; }; }
// evoker fangs never hurt illagers
{ const _ef = evokerFang; evokerFang = function (x, y, z) { const saved = []; for (const m of G.mobs) if (ILLAGER_KIN.has(m.type) && !m.dead) { saved.push([m, m.hurt]); m.hurt = function () { }; }
    try { return _ef(x, y, z); } finally { for (const [m, h] of saved) delete m.hurt; } }; }
// iron golems go after an illager that hits them, even one outside their usual search
{ const prev = MOBS.iron_golem.tick; MOBS.iron_golem.tick = function (m, dt) {
    const a = m.angryAt; if (a && !a.dead && a.pos.distanceTo(m.pos) < 24) { steerTo(m, a.pos, 1 + a.hw); m.goalBoost = true; m.atkCD = (m.atkCD || 0) - dt;
      if (m.pos.distanceTo(a.pos) < 2.2 + a.hw && m.atkCD <= 0) { m.atkCD = 1.2; a.hurt(7 + Math.random() * 14, m.pos, 1.5); a.vel.y = 7; m.armSwing = 0.5; if (m.arms) for (const ar of m.arms) ar.rotation.x = -1.5; Sfx.at('grunt', m.pos, 0.6, 0.6); }
      m.spMul = 2.2; return false; }
    m.angryAt = null; const r = prev ? prev(m, dt) : false; m.spMul = m.goalBoost ? 2.2 : 1; return r; }; } // a golem closes in on its foe quickly

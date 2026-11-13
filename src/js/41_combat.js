// ================= COMBAT (Minecraft Java 1.9+) =================
// Attack cooldown: every weapon has an attack speed (attacks per second at full strength): fists 4, swords 1.6,
// tridents 1.1, pickaxes 1.2, shovels 1, axes 0.8-1, hoes 1-4, maces 0.6. Attacking (or swinging at nothing) resets
// the charge; a hit made before it refills does 0.2 + 0.8 x charge^2 of the weapon's damage (enchantment damage scales
// with the charge). Only a hit at more than 90% charge can crit (falling, not sprinting: x1.5), knock back harder
// while sprinting, or sweep (swords, on the ground, standing or walking: 1 damage to mobs next to the target).
// Mobs are invulnerable for half a second after being hurt, except to a bigger hit (which deals the difference).
// Arrows: a full-draw bow fires at 3 blocks per tick (60 blocks/s) with Minecraft's gravity and air drag; arrow damage
// is speed (blocks/tick) x 2 (+0.5 per Power level + 0.5), rounded up; a crit arrow adds a random 0 to damage/2 + 2.
function attackSpeedOf(def) {
  if (!def) return 4; if (def.atk) return def.atk; if (def.kind !== 'tool') return 4; const k = def.key || '';
  const mat = k.startsWith('wood') ? 0 : k.startsWith('stone') ? 1 : k.startsWith('iron') ? 2 : k.startsWith('gold') ? 0.5 : k.startsWith('diamond') ? 3 : k.startsWith('netherite') ? 4 : 1;
  switch (def.tool) {
    case 'sword': return 1.6; case 'pick': return 1.2; case 'shovel': return 1;
    case 'axe': return [0.8, 0.8, 0.9, 1, 1][Math.floor(mat)] || 1;
    case 'hoe': return mat === 0.5 ? 1 : [1, 2, 3, 4, 4][mat] || 1;
    case 'spear': return def.cool ? 1 / def.cool : 1;
  }
  return 4;
}
S.atkT = 10; S.prevML = false; S.atkClick = false; G.simT = 0;
function attackCharge() { return clamp((S.atkT * 20 + 0.5) / (20 / attackSpeedOf(player.heldDef())), 0, 1); }
function resetAttack() { S.atkT = 0; }
// a click attacks at once; holding the button attacks again each time the charge is full
function meleeReady() { return S.atkClick || (mouseL && attackCharge() >= 1); }
function climbingNow(P) { const at = (dy) => BL[world.get(Math.floor(P.pos.x), Math.floor(P.pos.y + dy), Math.floor(P.pos.z))]; const a = at(0.1), b = at(1.2); return !!((a && a.climb) || (b && b.climb)); }
// the numbers for one melee hit; mob is null when hitting another player
function meleeHit(tool, mob) {
  const P = player; const c = attackCharge(); const strong = c > 0.9;
  const eb = meleeBonus(mob || { type: 'player' }); const eff = effLevel('strength') * 3 - (effLevel('weakness') ? 4 : 0);
  const weapon = tool && tool.dmg != null && (tool.kind === 'tool' || tool.melee) ? tool.dmg : 1;
  const ench = eb.dmg - eff;
  const crit = strong && !P.onGround && P.vel.y < 0 && !P.riding && !P.flying && !inWater(P, 0.4) && !P.sprinting && !climbingNow(P) && !effLevel('blindness');
  let dmg = (weapon + eff) * (0.2 + c * c * 0.8); if (crit) dmg *= 1.5; dmg += ench * c;
  if (typeof meleeExtra === 'function') dmg += meleeExtra(mob); // impaling, and the mace's smash bonus (not scaled)
  let kb = eb.kb; const sprintHit = strong && P.sprinting; if (sprintHit) { kb += 0.6; P.sprinting = false; P.vel.x *= 0.6; P.vel.z *= 0.6; }
  const sweep = strong && !crit && !sprintHit && P.onGround && tool && tool.tool === 'sword' && Math.hypot(P.vel.x, P.vel.z) < 4.6;
  resetAttack(); S.swing = 1; if (typeof exhaust === 'function') exhaust(0.1);
  Sfx.play(crit ? 'crit' : strong ? 'hit' : 'weak', strong ? 0.6 : 0.4);
  return { dmg: Math.max(0, dmg), kb, crit, sweep, c, weapon };
}
function playerMelee(m, tool) {
  const h = meleeHit(tool, m); m.hurt(h.dmg, player.pos, h.kb * (h.c > 0.9 ? 1 : 0.5 + h.c * 0.5));
  if (tool && (tool.kind === 'tool' || tool.melee)) damageHeld(tool.tool === 'sword' || tool.melee ? 1 : 2);
  const top = m.pos.y + Math.min(m.h, 3) * 0.7;
  if (h.crit) Particles.emit(m.pos.x, top, m.pos.z, 12, [[1, 1, 0.7], [0.9, 0.9, 0.6]], 3, 0.5, 4, 0.6);
  if (enchOf(player.held(), 'sharpness') || enchOf(player.held(), 'smite') || enchOf(player.held(), 'bane_of_arthropods')) Particles.emit(m.pos.x, top, m.pos.z, 6, [[0.5, 0.9, 1]], 2, 0.4, 2, 0.5);
  if (h.sweep) {
    const se = enchOf(player.held(), 'sweeping_edge'); const sd = 1 + (se ? se / (se + 1) : 0) * h.weapon;
    for (const o of G.mobs) { if (o === m || o.dead || o === player.riding || o.tamed) continue; if (Math.abs(o.pos.x - m.pos.x) < 1 + o.hw + m.hw && Math.abs(o.pos.z - m.pos.z) < 1 + o.hw + m.hw && Math.abs(o.pos.y - m.pos.y) < 0.6 && o.pos.distanceTo(player.pos) < 3) o.hurt(sd, player.pos, 0.4); }
    const d = lookDir(); const e = player.eye(); for (let i = -3; i <= 3; i++) { const a = Math.atan2(d.x, d.z) + i * 0.22; Particles.emit(e.x + Math.sin(a) * 1.6, e.y - 0.4, e.z + Math.cos(a) * 1.6, 1, [[0.95, 0.95, 0.95]], 0.2, 0.25, 0, 0.3); }
    Sfx.play('sweep', 0.6);
  }
}
if (ENCH && !ENCH.sweeping_edge) ENCH.sweeping_edge = { name: 'Sweeping Edge', max: 3, for: 'sword', w: 2 };
// invulnerability after a hit (10 ticks); only a bigger hit gets through, for the difference
{ const _h = Mob.prototype.hurt; Mob.prototype.hurt = function (dmg, src, kb, na) {
    if (this.dead) return; const now = G.simT;
    if (this.invAt != null && now - this.invAt < 0.5) { if (dmg <= (this.lastDmg || 0)) return; const extra = dmg - this.lastDmg; this.lastDmg = dmg; return _h.call(this, extra, null, 0, na); }
    this.invAt = now; this.lastDmg = dmg; return _h.call(this, dmg, src, kb, na);
  }; }
// timers, click edges, misses and the attack indicator
{ const _ui = updateInteraction; updateInteraction = function (dt) {
    G.simT += dt; S.atkT += dt;
    const hid = player.held() ? player.held().id : -1; if (hid !== S.lastHeldId) { S.lastHeldId = hid; resetAttack(); }
    S.atkClick = mouseL && !S.prevML && !S.uiOpen; S.prevML = mouseL;
    const before = S.atkT; const r = _ui.apply(this, arguments);
    // swinging at nothing also resets the charge (not when mining or using a spear)
    if (S.atkClick && S.atkT === before && !targetMob && !target && !(typeof targetBoat !== 'undefined' && targetBoat) && !(typeof heldSpear === 'function' && heldSpear()) && !player.dead && S.mode !== 'spectator') { resetAttack(); S.swing = 1; }
    S.atkClick = false; updateAttackIndicator(); return r;
  }; }
let atkInd = null;
function updateAttackIndicator() {
  if (!atkInd) { atkInd = document.createElement('div'); atkInd.id = 'atkInd'; atkInd.style.cssText = 'position:fixed;left:50%;top:calc(50% + 16px);width:18px;height:4px;transform:translateX(-50%);background:rgba(0,0,0,0.45);pointer-events:none;z-index:5;display:none'; atkInd.innerHTML = '<div style="height:100%;width:0;background:#e8e8e8"></div>'; document.body.appendChild(atkInd); }
  const c = attackCharge(); const show = c < 1 && !player.dead && !S.uiOpen && S.mode !== 'spectator' && S.started && !(typeof heldSpear === 'function' && heldSpear());
  atkInd.style.display = show ? 'block' : 'none'; if (show) atkInd.firstChild.style.width = Math.round(c * 100) + '%';
}
// ---------- arrows: speed-based damage, Minecraft drag ----------
function arrowDamage(a) { const v = a.vel.length() / 20; let d = Math.ceil(v * a.base); if (a.crit) d += Math.floor(a.critR * (d / 2 + 2)); return Math.min(d, 2147483647); }
{ const _up = updateProjectiles; updateProjectiles = function (dt) {
    for (const a of G.projectiles) if (a.kind === 'arrow' && !a.done) {
      const water = FKIND[world.get(Math.floor(a.pos.x), Math.floor(a.pos.y), Math.floor(a.pos.z))] === 1; a.vel.multiplyScalar(Math.pow(water ? 0.6 : 0.99, dt * 20));
      if (a.base) a.dmg = arrowDamage(a);
    }
    return _up.apply(this, arguments);
  }; }
// Minecraft's bow: draw power = (t^2 + 2t) / 3 with t in seconds (full at 1 s); arrows leave at power x 60 blocks/s
bowPower = function () { if (S.bowDraw < 0) return 0; const t = S.bowDraw; return clamp((t * t + 2 * t) / 3, 0, 1); };
fireBow = function (eye, dir) {
  const p = bowPower(); S.bowDraw = -1; if (p < 0.1) return;
  if (S.mode !== 'creative') { if (countItem(IT.arrow) <= 0) return; if (!heldEnch('infinity')) removeItem(IT.arrow, 1); }
  const pw = heldEnch('power'); const v = dir.clone().multiplyScalar(p * 60);
  v.x += player.vel.x; v.z += player.vel.z; if (!player.onGround) v.y += player.vel.y; // you throw your own motion in
  const a = spawnProj('arrow', eye.clone().addScaledVector(dir, 0.3), v, 'player', 0);
  a.base = 2 + (pw ? 0.5 * pw + 0.5 : 0); a.crit = p >= 1; a.critR = Math.random(); a.dmg = arrowDamage(a); a.punch = heldEnch('punch'); a.flame = heldEnch('flame') > 0; a.life = 15; damageHeld(1);
  Sfx.play('bow', 0.5 + p * 0.6); S.bowKick = 1;
};
// skeletons shoot at 1.6 blocks per tick with base damage 2 (+ a little more on harder difficulties)
shootArrow = function (from, target, owner, dmg, speed = 32) {
  const d = target.clone().sub(from); const L = d.length(); d.normalize(); const t = L / speed; const v = d.multiplyScalar(speed); v.y += 0.5 * 20 * t + L * 0.012;
  const a = spawnProj('arrow', from, v, owner, dmg); if (owner === 'mob') { a.base = 2 + (S.difficulty === 'hard' ? 0.5 : S.difficulty === 'easy' ? -0.25 : 0.25); a.crit = false; a.dmg = arrowDamage(a); } Sfx.at('bow', from, 0.8); return a;
};

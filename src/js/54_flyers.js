// ================= BATS ROOST, PARROTS PERCH AND RIDE ON YOUR SHOULDER (Minecraft) =================
// Bats fly around in the dark and, when they find a ceiling, hang from it upside down with folded wings. A roosting
// bat wakes when a player comes within 4 blocks (unless sneaking), when hurt, or now and then at night.
// Wild parrots fly from perch to perch: they land on blocks (often on leaves) and rest a while before flying again.
// Tamed parrots that aren't sitting hop onto your shoulder when you walk into them, and jump off when you fall, take
// damage, swim, sleep or sneak-jump. Sneak + use on a tamed parrot (or any tamed pet) makes it sit; parrots that sit
// fold their wings and stay put.
function solidAt(x, y, z) { return SOLID[world.get(Math.floor(x), Math.floor(y), Math.floor(z))]; }
{ const prev = MOBS.bat.tick; MOBS.bat.tick = function (m, dt) {
    const P = player;
    if (m.roost) { m.age += dt; m.hurtT = Math.max(0, m.hurtT - dt); m.vel.set(0, 0, 0);
      const near = !P.dead && P.pos.distanceTo(m.pos) < 4 && !P.sneaking && S.mode !== 'spectator';
      const ceiling = solidAt(m.pos.x, m.pos.y + m.h + 0.15, m.pos.z);
      if (near || !ceiling || m.hurtT > 0 || (G.daylight < 0.35 && Math.random() < dt * 0.02)) { m.roost = false; m.roostCD = 6 + Math.random() * 10; m.root.rotation.z = 0; m.flyT = 0; Sfx.at('chirp', m.pos, 0.4, 2.4); }
      else { m.root.position.set(m.pos.x, m.pos.y + m.h, m.pos.z); m.root.rotation.set(0, m.yaw, Math.PI); if (m.wings) m.wings.forEach(w => w.rotation.z = 0); m.colorize(); return true; } }
    const r = prev(m, dt); m.roostCD = (m.roostCD || 3) - dt; m.root.rotation.z = 0;
    // look for a ceiling just above: hang from it
    if (m.roostCD <= 0 && Math.random() < dt * 2) { const top = m.pos.y + m.h; for (let k = 0; k <= 2; k++) { if (solidAt(m.pos.x, top + k + 0.2, m.pos.z) && !solidAt(m.pos.x, top + k - 0.6, m.pos.z)) { m.roost = true; m.pos.y = Math.floor(top + k + 0.2) - m.h - 0.01; m.vel.set(0, 0, 0); break; } } if (!m.roost) m.flyGoal = new V3(m.pos.x + (Math.random() - 0.5) * 4, m.pos.y + 3, m.pos.z + (Math.random() - 0.5) * 4); }
    return r; }; }
{ const _h = Mob.prototype.hurt; Mob.prototype.hurt = function (dmg, src, kb, na) { if (this.roost) { this.roost = false; this.root.rotation.z = 0; } return _h.call(this, dmg, src, kb, na); }; }
// ---------- parrots ----------
{ const prev = MOBS.parrot.tick; MOBS.parrot.tick = function (m, dt) {
    const P = player;
    // on the owner's shoulder
    if (m.shoulder) { const side = m.shoulder; const yaw = P.yaw; const ox = Math.cos(yaw) * 0.42 * side, oz = -Math.sin(yaw) * 0.42 * side; m.pos.set(P.pos.x + ox, P.pos.y + 1.45, P.pos.z + oz); m.vel.set(0, 0, 0);
      m.root.position.copy(m.pos); m.yaw = yaw + Math.PI; m.root.rotation.set(0, m.yaw, 0); if (m.wings) m.wings.forEach(w => w.rotation.z = 0); m.age += dt; m.hurtT = Math.max(0, m.hurtT - dt); m.colorize();
      const fallen = P.peak != null && P.peak - P.pos.y > 0.6; if (P.dead || fallen || inWater(P, 0.4) || S.sleeping || (P.health < (m.lastHp != null ? m.lastHp : P.health)) || (P.sneaking && kd('jump')) || m.hurtT > 0 || P.flying || P.gliding || P.riding) { m.shoulder = 0; m.perchCD = 2; m.flyT = 0; m.vel.set(0, 3, 0); }
      m.lastHp = P.health; return true; }
    m.perchCD = Math.max(0, (m.perchCD || 0) - dt);
    // hop onto the owner's shoulder
    if (m.tamed && !m.sitting && !m.perch && m.perchCD <= 0 && typeof isOwner === 'function' && isOwner(m) && !P.dead && P.pos.distanceTo(m.pos) < 1.2 && !P.flying && !P.riding) { const taken = G.mobs.filter(o => o.type === 'parrot' && o.shoulder).map(o => o.shoulder); const side = !taken.includes(-1) ? -1 : !taken.includes(1) ? 1 : 0; if (side) { m.shoulder = side; m.lastHp = P.health; Sfx.at('chirp', m.pos, 0.5, 1.6); return true; } }
    // perched on a block: stand there, look around, then fly off
    if (m.perch) { m.perchT -= dt; m.age += dt; m.hurtT = Math.max(0, m.hurtT - dt); m.vel.set(0, Math.max(m.vel.y - 20 * dt, -10), 0); moveEntity(m, dt); m.root.position.copy(m.pos); if (m.head) m.head.rotation.y = Math.sin(m.age * 0.7) * 0.6; if (m.wings) m.wings.forEach(w => w.rotation.z = 0); m.colorize();
      if (m.perchT <= 0 || m.hurtT > 0 || (!m.tamed && !P.dead && P.pos.distanceTo(m.pos) < 3 && !P.sneaking)) { m.perch = false; m.perchCD = 8 + Math.random() * 10; m.flyT = 0; m.vel.y = 3; } return true; }
    if (m.landing && m.landGoal) { m.flyGoal = m.landGoal; m.flyT = 1; m.landT = (m.landT || 0) + dt; if (m.landT > 8) m.landing = false; }
    const r = prev(m, dt);
    // look for a place to land: a block top below or near the current flight goal
    if (!m.sitting && !m.tamed && m.perchCD <= 0 && Math.random() < dt * 0.3) { const x = Math.floor(m.pos.x + (Math.random() - 0.5) * 8), z = Math.floor(m.pos.z + (Math.random() - 0.5) * 8);
      for (let y = Math.floor(m.pos.y) + 3; y > Math.floor(m.pos.y) - 8; y--) if (SOLID[world.get(x, y - 1, z)] && !SOLID[world.get(x, y, z)] && !SOLID[world.get(x, y + 1, z)] && !BL[world.get(x, y, z)].fluid) { m.landGoal = m.flyGoal = new V3(x + 0.5, y + 0.05, z + 0.5); m.landing = true; m.landT = 0; m.flyT = 1; break; } }
    if (m.landing && m.landGoal && Math.hypot(m.pos.x - m.landGoal.x, m.pos.z - m.landGoal.z) < 0.5 && Math.abs(m.pos.y - m.landGoal.y) < 1) { m.landing = false; m.perch = true; m.perchT = 6 + Math.random() * 14; m.vel.set(0, 0, 0); }
    return r; }; }
// parrots on shoulders are saved with you (they come back when you load the world)
{ const _mr = mobRecord; mobRecord = function (m) { const r = _mr(m); if (m.shoulder) r.sho = m.shoulder; return r; }; const _mf = mobFromRecord; mobFromRecord = function (rec) { const m = _mf(rec); if (m && rec.sho) m.shoulder = rec.sho; return m; }; }

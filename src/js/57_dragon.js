// ================= THE ENDER DRAGON: LANDING, PERCHING, BREATH, RESPAWNING (Minecraft) =================
// Between flights the dragon lands on the exit portal's bedrock fountain: it settles on the portal, swings its head
// toward the nearest player, roars, and breathes a cloud of dragon's breath along the ground (stand in it and it hurts;
// fill bottles from it). While perched it takes a quarter damage except to the head, and it takes off again after a
// few breaths or once it has lost 25% of its health there. It also strafes with dragon fireballs (which leave breath
// clouds) and charges at you. Killing it gives 12000 experience the first time (500 after). Put four end crystals
// on the edge of the exit portal to bring it back.
{ const _u = Dragon.prototype.update; Dragon.prototype.update = function (dt) {
    if (this.state !== 'perch' || this.dying) return _u.call(this, dt);
    const fy = world.gen.fountainY(); const P = G.player; const land = new V3(0, fy + 2.6, 0); const d = this.pos.distanceTo(land);
    if (!this.perchStart) { this.perchStart = true; this.perchHp = this.hp; this.breaths = 0; this.perchT = 0; }
    // fly in, then settle on the portal
    if (d > 1.2 && this.perchT === 0) { const want = land.clone().sub(this.pos); const L = want.length(); want.multiplyScalar(Math.min(16, Math.max(5, L)) / Math.max(L, 0.01)); this.vel.lerp(want, Math.min(1, dt * 2)); this.pos.addScaledVector(this.vel, dt); }
    else { if (this.perchT === 0) { Sfx.play('roar', 1, 0.8); for (let i = 0; i < 6; i++) explodeFx(this.pos.x + (Math.random() - 0.5) * 6, fy + 1, this.pos.z + (Math.random() - 0.5) * 6); }
      this.perchT += dt; this.vel.set(0, 0, 0); this.pos.lerp(land, Math.min(1, dt * 4));
      const want = Math.atan2(P.pos.x - this.pos.x, P.pos.z - this.pos.z); let df = want - this.yaw; while (df > Math.PI) df -= Math.PI * 2; while (df < -Math.PI) df += Math.PI * 2; this.yaw += df * Math.min(1, dt * 1.5);
      this.shootCD -= dt; const active = isSurv() && !P.dead;
      if (this.shootCD <= 0 && active && P.pos.distanceTo(this.pos) < 40) { this.shootCD = 3.2; this.breaths++; const f = new V3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); for (let k = 0; k < 3; k++) spawnBreathCloud(this.pos.x + f.x * (7 + k * 3), fy + 2, this.pos.z + f.z * (7 + k * 3)); this.jawT = 1.2; Sfx.play('roar', 0.8, 1.2); if (this.headPos) for (let i = 0; i < 40; i++) Particles.emit(this.headPos.x + f.x * i * 0.25, this.headPos.y - i * 0.05, this.headPos.z + f.z * i * 0.25, 1, [[0.7, 0.2, 1], [0.4, 0.1, 0.7]], 2, 1, 2, 0.6); }
      if (this.breaths >= 3 || this.perchT > 18 || this.hp < this.perchHp - this.maxHp * 0.25 || !active) { this.state = 'circle'; this.stateT = 10; this.perchT = 0; this.perchStart = false; this.vel.set(0, 10, 0); Sfx.play('roar', 1); } }
    this.pitch += (0 - this.pitch) * Math.min(1, dt * 3); this.root.position.copy(this.pos); this.root.rotation.set(this.pitch, this.yaw, 0); this.calcSpheres();
    this.age += dt; this.hurtT = Math.max(0, this.hurtT - dt); this.hurtCD -= dt; this.contactCD -= dt;
    let healer = null, hd = 70; for (const c of EndFight.crystals) { if (c.dead) continue; const dd = c.pos.distanceTo(this.pos); if (dd < hd) { hd = dd; healer = c; } } this.healer = healer; if (healer && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + dt * 1.2);
    for (const leg of this.legs) leg.rotation.x += (0 - leg.rotation.x) * Math.min(1, dt * 3);
    this.animate(dt, 0.25); this.colorize(); this.updateBar();
  }; }
// perched: a quarter damage unless the hit is on the head
{ const _h = Dragon.prototype.hurt; Dragon.prototype.hurt = function (dmg, src, kb, force) { if (this.state === 'perch' && this.perchT > 0 && !force && this.headPos && src && src.distanceTo && this.headPos.distanceTo(player.eye()) > 4) dmg *= 0.25; return _h.call(this, dmg, src, kb, force); }; }
// the first kill is worth 12000 experience, later ones 500
{ const _v = EndFight.victory; EndFight.victory = function () { const first = !S.dragonKilledOnce; S.dragonKilledOnce = true; const fy = world.gen.fountainY(); const xp = first ? 12000 : 500; for (let i = 0; i < 20; i++) setTimeout(() => spawnOrb((Math.random() - 0.5) * 6, fy + 4 + Math.random() * 4, (Math.random() - 0.5) * 6, xp / 20), i * 120); return _v.apply(this, arguments); }; }
// respawning: four end crystals around the exit portal's edge
function tryRespawnDragon() {
  if (!S.dragonDead || EndFight.dragon || world.dim !== 'end') return; const fy = world.gen.fountainY();
  const spots = [[0, -3], [0, 3], [-3, 0], [3, 0]]; const ok = spots.every(([x, z]) => G.mobs.some(m => m.placed && !m.dead && Math.abs(m.pos.x - (x + 0.5)) < 1.2 && Math.abs(m.pos.z - (z + 0.5)) < 1.2 && Math.abs(m.pos.y - fy - 1) < 2.5));
  if (!ok) return; toast('The Ender Dragon is returning...', 4); Sfx.play('roar', 1.2, 0.7);
  setTimeout(() => { for (const m of G.mobs) if (m.placed && !m.dead) { m.dead = true; m.gone = true; explodeFx(m.pos.x, m.pos.y + 1, m.pos.z); }
    S.dragonDead = false; S.dragonHp = 200; S.crystalsGone = []; for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (world.get(dx, fy, dz) === B.END_PORTAL) world.set(dx, fy, dz, 0);
    EndFight.enter(); }, 5000);
}
{ const _p = Player.prototype.hurt; } // (dragon contact and breath damage are in the base fight code)

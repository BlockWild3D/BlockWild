// ================= PvP: hitting other players (Minecraft rules) =================
// Melee, crits (falling), Sharpness/Knockback, arrows and spears all hurt other players when the "pvp" game rule is
// on (the default, like Minecraft). Damage isn't scaled by difficulty for players; armor, shields and the 0.5 s
// invulnerability after a hit apply on the receiving side. The host passes hits between friends.
S.rules.pvp = true;
const PVP_H = (av) => av.sneak ? 1.5 : av.swim ? 0.6 : 1.8;
function avatarRay(eye, dir, maxT) {
  if (typeof MP === 'undefined' || !MP.active) return null;
  let best = null, bt = maxT;
  for (const av of MP.avatars.values()) {
    if (av.dim !== world.dim || av.dead || av.spec || !av.model) continue;
    const t = rayAABB(eye, dir, new V3(av.pos.x - 0.3, av.pos.y, av.pos.z - 0.3), new V3(av.pos.x + 0.3, av.pos.y + PVP_H(av), av.pos.z + 0.3));
    if (t >= 0 && t < bt) { bt = t; best = av; }
  }
  return best ? { av: best, dist: bt } : null;
}
// send a hit to another player (through the host if we are a client)
function pvpHit(av, dmg, kb, cause) {
  if (!S.rules.pvp) { toast('PvP is off in this world (/gamerule pvp true)', 1.5); return; }
  const m = { t: 'pvp', to: av.id, dmg: +dmg.toFixed(2), kb: +kb.toFixed(2), src: [+player.pos.x.toFixed(2), +player.pos.y.toFixed(2), +player.pos.z.toFixed(2)], cause: cause || myName() };
  if (MP.role === 'host') pvpDeliver(m); else mpToHost(m);
  av.hurtT = 0.3; Sfx.at('hurt', av.pos, 0.6);
  Particles.emit(av.pos.x, av.pos.y + 1.2, av.pos.z, 4, [[0.7, 0.1, 0.1]], 1.5, 0.4, 8, 0.3);
}
function pvpDeliver(m) { // host: route a hit to its target
  if (m.to === MP.myId || m.to === 'host') return pvpReceive(m);
  const peer = MP.peers.get(m.to); if (peer) peer.link.send({ t: 'pvphurt', dmg: m.dmg, kb: m.kb, src: m.src, cause: m.cause });
}
function pvpReceive(m) {
  if (player.dead || !S.rules.pvp) return;
  const d = S.difficulty; S.difficulty = 'normal'; // players hit as hard on every difficulty
  try { player.hurt(m.dmg, m.src ? new V3(m.src[0], m.src[1], m.src[2]) : null, m.cause, m.kb); } finally { S.difficulty = d; }
}
{ const _on = onPeerMsg; onPeerMsg = function (peer, m) {
    if (m.t === 'pvp') { if (MP.role === 'host') pvpDeliver(m); return; }
    if (m.t === 'pvphurt') { pvpReceive(m); return; }
    return _on(peer, m);
  }; }
// melee: a friend in front of you (and nearer than any mob or block) takes the hit
{ const _ui = updateInteraction; updateInteraction = function (dt) {
    if (!(typeof MP !== 'undefined' && MP.active) || !mouseL || S.uiOpen || player.dead || S.mode === 'spectator') return _ui.apply(this, arguments);
    const eye = player.eye(), dir = lookDir(); const sp = typeof heldSpear === 'function' ? heldSpear() : null;
    const reach = sp ? 4.5 : S.mode === 'creative' ? 6 : 3.8; const blk = raycast(eye, dir, reach);
    const hit = avatarRay(eye, dir, blk ? blk.dist : reach); if (!hit) return _ui.apply(this, arguments);
    let mobT = Infinity; for (const mb of G.mobs) { if (mb.dead || mb === player.riding) continue; const t = mobRay(mb, eye, dir); if (t >= 0 && t < mobT) mobT = t; }
    if (mobT < hit.dist) return _ui.apply(this, arguments);
    if (sp) { if (S.jabCD <= 0) { S.jabCD = sp.cool; S.jabT = 1; if (hit.dist >= 2 - 0.125) { const eb = meleeBonus({ type: 'player' }); pvpHit(hit.av, Math.max(0, sp.dmg + eb.dmg), 0.7 * eb.kb); damageHeld(1); } } }
    else if (S.atkCD <= 0) {
      const tool = player.heldDef(); const eb = meleeBonus({ type: 'player' }); const crit = !player.onGround && player.vel.y < -1 && !player.riding ? 1.5 : 1;
      const dmg = Math.max(0, (tool && tool.kind === 'tool' ? tool.dmg : 1) + eb.dmg) * crit; pvpHit(hit.av, dmg, eb.kb * (player.sprinting ? 1.6 : 1));
      if (crit > 1) Particles.emit(hit.av.pos.x, hit.av.pos.y + 1.3, hit.av.pos.z, 10, [1, 1, 0.7], 3, 0.5, 4, 0.6);
      if (tool && tool.kind === 'tool') damageHeld(tool.tool === 'sword' ? 1 : 2); if (typeof exhaust === 'function') exhaust(0.1);
      S.atkCD = tool && tool.kind === 'tool' ? 1 / (tool.atk || 1.2) : 0.25; S.swing = 1; player.sprinting = false;
    }
    const ml = mouseL; mouseL = false; try { return _ui.apply(this, arguments); } finally { mouseL = ml; }
  }; }
// arrows and thrown things you shoot can hit friends
{ const _up = updateProjectiles; updateProjectiles = function (dt) {
    if (typeof MP !== 'undefined' && MP.active && S.rules.pvp) for (const a of G.projectiles) {
      if (a.done || a.owner !== 'player' || a.kind === 'pearl') continue;
      for (const av of MP.avatars.values()) { if (av.dim !== world.dim || av.dead || av.spec) continue;
        if (Math.abs(a.pos.x - av.pos.x) < 0.4 && Math.abs(a.pos.z - av.pos.z) < 0.4 && a.pos.y > av.pos.y && a.pos.y < av.pos.y + PVP_H(av)) {
          if (a.kind === 'arrow') { pvpHit(av, a.dmg || 2, 0.6 + (a.punch || 0) * 0.9, myName() + "'s arrow"); a.done = true; }
          else if (a.kind === 'egg') { pvpHit(av, 0, 0.3); a.done = true; }
          break; }
      }
    }
    return _up.apply(this, arguments);
  }; }
// spear charges hit friends too
{ const _sc = typeof spearCharge === 'function' ? spearCharge : null;
  if (_sc) spearCharge = function (sp, eye, dir, dt) {
    const r = _sc(sp, eye, dir, dt); const C = S.charge; if (!C || C.stage === 'raise' || C.stage === 'done' || !(typeof MP !== 'undefined' && MP.active)) return r;
    const pv = player.riding ? player.riding.vel : player.vel;
    for (const av of MP.avatars.values()) {
      if (av.dim !== world.dim || av.dead || av.spec) continue;
      const t = rayAABB(eye, dir, new V3(av.pos.x - 0.425, av.pos.y - 0.125, av.pos.z - 0.425), new V3(av.pos.x + 0.425, av.pos.y + PVP_H(av) + 0.125, av.pos.z + 0.425)); if (t < 1.875 || t > 4.5) continue;
      const av0 = av.prevPos || av.pos; const avv = av.pos.clone().sub(av0).divideScalar(Math.max(dt, 1e-3)); av.prevPos = av.pos.clone();
      const speed = (pv.x - avv.x) * dir.x + (pv.z - avv.z) * dir.z; if (speed < 4.6) continue;
      const key = 'av:' + av.id; const last = C.hits.get(key); if (last != null && C.t - last < 0.5) continue; C.hits.set(key, C.t);
      pvpHit(av, last == null ? Math.floor(sp.spear.mult * speed) : 0, (C.stage !== 'disengaged' && speed >= 5.1) ? 1 + (speed - 5.1) * 0.1 : 0); if (last == null) damageHeld(1);
    }
    return r;
  }; }

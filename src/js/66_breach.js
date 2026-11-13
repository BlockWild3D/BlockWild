// ================= BREACH, SOUL SPEED, SWIFT SNEAK (Minecraft numbers) =================
// Breach (mace, I-IV): armour on whatever you smash protects 15% less per level. Mobs now carry Minecraft's natural
// armour (zombies, husks, drowned, zombie villagers and zombified piglins 2 points, the Wither 4), which softens
// every hit the Minecraft way; in PvP, Breach cuts through the other player's armour too.
// Soul Speed (boots, I-III, treasure: piglin bartering and bastion chests): no soul sand slowdown, plus 40.5% /
// 51% / 61.5% more speed on soul sand; each tick you move on it the boots have a 4% chance to lose durability.
// Without it soul sand slows you to 40%.
// Swift Sneak (leggings, I-III, treasure: ancient cities): sneaking at 45% / 60% / 75% of walking speed.
const MOB_ARMOR = { zombie: 2, husk: 2, drowned: 2, zombie_villager: 2, zombified_piglin: 2, wither: 4 };
let BREACH_NOW = 0;
function armorAfter(dmg, armor, tough, breach) { if (!armor || dmg <= 0) return dmg; const f1 = Math.min(20, Math.max(armor * 0.2, armor - dmg / (2 + tough / 4))) / 25; return dmg * (1 - f1 * (1 - 0.15 * breach)); }
{ const _h = Mob.prototype.hurt; Mob.prototype.hurt = function (dmg, src, kb, na) { const a = MOB_ARMOR[this.type]; if (a) dmg = armorAfter(dmg, a, 0, BREACH_NOW); return _h.call(this, dmg, src, kb, na); }; }
{ const _mh = meleeHit; meleeHit = function (tool, mob) { const h = player.held(); BREACH_NOW = h && h.id === IT.mace ? enchOf(h, 'breach') : 0; return _mh.apply(this, arguments); }; }
{ const _pm = playerMelee; playerMelee = function () { try { return _pm.apply(this, arguments); } finally { BREACH_NOW = 0; } }; }
// PvP: the hit carries its Breach level to the other player
pvpHit = function (av, dmg, kb, cause) {
  if (!S.rules.pvp) { toast('PvP is off in this world (/gamerule pvp true)', 1.5); return; }
  const m = { t: 'pvp', to: av.id, dmg: +dmg.toFixed(2), kb: +kb.toFixed(2), src: [+player.pos.x.toFixed(2), +player.pos.y.toFixed(2), +player.pos.z.toFixed(2)], cause: cause || myName(), breach: BREACH_NOW || 0 };
  BREACH_NOW = 0; if (MP.role === 'host') pvpDeliver(m); else mpToHost(m);
  av.hurtT = 0.3; Sfx.at('hurt', av.pos, 0.6); Particles.emit(av.pos.x, av.pos.y + 1.2, av.pos.z, 4, [[0.7, 0.1, 0.1]], 1.5, 0.4, 8, 0.3);
};
pvpDeliver = function (m) { if (m.to === MP.myId || m.to === 'host') return pvpReceive(m); const peer = MP.peers.get(m.to); if (peer) peer.link.send({ t: 'pvphurt', dmg: m.dmg, kb: m.kb, src: m.src, cause: m.cause, breach: m.breach || 0 }); };
{ const _pr = pvpReceive; pvpReceive = function (m) { player.breachIn = Math.min(4, m.breach || 0); try { return _pr.apply(this, arguments); } finally { player.breachIn = 0; } }; }
// Soul Speed
{ let acc = 0, last = performance.now();
  soulSandMul = function () { const P = player, now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now; const s = enchOf(P.inv[40], 'soul_speed'); if (!s) return 0.4;
    const moving = Math.hypot(P.vel.x, P.vel.z) > 0.5;
    if (moving) { acc += dt * 20; while (acc >= 1) { acc -= 1; if (Math.random() < 0.04 && isSurv()) damageSlot(40, 1); } if (Math.random() < dt * 8) Particles.emit(P.pos.x + (Math.random() - 0.5) * 0.6, P.pos.y + 0.1, P.pos.z + (Math.random() - 0.5) * 0.6, 1, [[0.35, 0.85, 0.95]], 0.4, 0.7, -1.5, 0.3); }
    return 1.405 + 0.105 * (s - 1); }; }
// Soul Speed in bastions (Minecraft: bastion chests hold Soul Speed books and boots)
{ const _rl = rollLoot; rollLoot = function (type, seed) { const inv = _rl(type, seed); if (!/^bastion/.test(type)) return inv; const r = mulberry32((seed ^ 0x50a1) >>> 0);
    const put = (s) => { const free = inv.map((x, i) => x ? -1 : i).filter(i => i >= 0); if (free.length) inv[free[(r() * free.length) | 0]] = s; };
    if (r() < (type === 'bastion_treasure' ? 0.35 : 0.2)) put({ id: IT.enchanted_book, count: 1, ench: { soul_speed: 1 + ((r() * 3) | 0) } });
    if (r() < 0.12) put({ id: IT.iron_boots, count: 1, ench: { soul_speed: 1 + ((r() * 3) | 0) } });
    return inv; }; }

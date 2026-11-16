// ================= PVP, CLOSER TO MINECRAFT =================
// - Other players now see your off-hand item and see you raise your shield (it was never sent before).
// - An axe hit on a raised shield knocks it down for 5 seconds (Minecraft), and the attacker hears the block.
// - A shield takes a quarter second to come up (5 ticks).
{ const _ms = myState; myState = function () { const s = _ms.apply(this, arguments); const o = player.inv[36]; s.off = o ? ITEMS[o.id].key : 0;
    if (player.blocking) { const h = player.heldDef(); s.blk = h && h.kind === 'shield' ? 2 : 1; } return s; }; }
{ const _on = onPeerMsg; onPeerMsg = function (peer, m) {
    if (m.t === 'p') { const id = MP.role === 'host' ? peer.id : m.id; const av = MP.avatars.get(id); if (av) { av.off = m.off || 0; av.blk = m.blk || 0; av.tyaw = m.yaw; } }
    if (m.t === 'pvpblk') { if (MP.role === 'host' && m.to && m.to !== 'host' && m.to !== MP.myId) { const p = MP.peers.get(m.to); if (p) p.link.send(m); return; }
      Sfx.at('shield', new V3(m.x, m.y, m.z), 1); if (m.dis) toast('You knocked their shield down', 1.5); return; }
    return _on(peer, m); }; }
// avatars: off-hand item, the blocking pose, and turning smoothly between updates
{ const _ua = updateAvatars; updateAvatars = function (dt) {
    for (const av of MP.avatars.values()) { if (!av.model) continue;
      if (av.model.setOff) av.model.setOff(av.off ? IT[av.off] : 0);
      if (!av.model._blkWrap) { av.model._blkWrap = true; const an = av.model.animate; av.model.animate = function (dt2, sp, pitch, swing, sneak, hurt, o) { return an.call(this, dt2, sp, pitch, swing, sneak, hurt, o || (av.blk ? { blocking: av.blk === 2 ? 'main' : 'off' } : undefined)); }; }
      if (av.tyaw != null) { let d = av.tyaw - (av.syaw == null ? av.tyaw : av.syaw); d = Math.atan2(Math.sin(d), Math.cos(d)); av.syaw = (av.syaw == null ? av.tyaw : av.syaw) + d * Math.min(1, dt * 14); av.yaw = av.syaw; } }
    return _ua.apply(this, arguments); }; }
// the hit says whether it came from an axe
{ const _ph = pvpHit; pvpHit = function (av, dmg, kb, cause) { const t = player.heldDef(); PVP_AXE = !!(t && t.tool === 'axe' && !cause); return _ph.apply(this, arguments); }; }
let PVP_AXE = false;
{ const _mh = mpToHost; mpToHost = function (m, fast) { if (m && m.t === 'pvp') { m.axe = PVP_AXE ? 1 : 0; m.from = MP.myId; } return _mh.apply(this, arguments); }; }
{ const _pd = pvpDeliver; pvpDeliver = function (m) { if (MP.role === 'host' && m.from == null) { m.axe = PVP_AXE ? 1 : 0; m.from = 'host'; }
    if (m.to === MP.myId || m.to === 'host') return pvpReceive(m);
    const peer = MP.peers.get(m.to); if (peer) peer.link.send({ t: 'pvphurt', dmg: m.dmg, kb: m.kb, src: m.src, cause: m.cause, breach: m.breach || 0, axe: m.axe, from: m.from }); }; }
{ const _on = onPeerMsg; onPeerMsg = function (peer, m) { if (m.t === 'pvp' && MP.role === 'host') m.from = peer.id; return _on(peer, m); }; }
{ const _pr = pvpReceive; pvpReceive = function (m) {
    const was = player.blocking, cd0 = player.hurtCD, hp0 = player.health; const r = _pr.apply(this, arguments);
    if (was && !player.dead && player.health === hp0 && S.shieldHit === 1 && m.src) { // the shield took it
      const dis = !!m.axe; if (dis) { S.shieldCD = 5; player.blocking = false; S.blockT = 0; toast('Your shield is disabled!', 2); Sfx.play('glass_break', 0.5); }
      const back = { t: 'pvpblk', to: m.from, x: +player.pos.x.toFixed(1), y: +(player.pos.y + 1).toFixed(1), z: +player.pos.z.toFixed(1), dis: dis ? 1 : 0 };
      if (m.from && m.from !== MP.myId) { if (MP.role === 'host') { const p = MP.peers.get(m.from); if (p) p.link.send(back); } else mpToHost(back); } }
    return r; }; }
{ const _t = tick; tick = function (dt) { if (S.shieldCD > 0) { S.shieldCD -= dt; player.blocking = false; } return _t.apply(this, arguments); }; }

// ================= MULTIPLAYER: LESS TRAFFIC =================
// Your own state goes out 15 times a second only while something changes (twice a second when you stand still), and
// the host sends far-away mobs to each friend a third as often as near ones.
{ let last = '', idle = 0; const _ms = myState; myState = function () { const s = _ms.apply(this, arguments); const k = JSON.stringify(s); s._same = k === last; last = k; return s; };
  const wrap = (fn) => function (m, fast, ex) { if (m && m.t === 'p' && m._same !== undefined) { const same = m._same; delete m._same; if (same && ++idle % 15) return; if (!same) idle = 0; } return fn.apply(this, arguments); };
  mpSendAll = wrap(mpSendAll); mpToHost = wrap(mpToHost); }
{ const _ht = hostTick; let phase = 0; hostTick = function (dt) {
    const due = MP.mobT + dt >= 0.1; if (!due) return _ht.apply(this, arguments);
    phase = (phase + 1) % 3; if (phase === 0) return _ht.apply(this, arguments);
    // two ticks in three: only mobs within 28 blocks of somebody are sent
    const all = G.mobs; const near = all.filter(m => { if (m.isBoss) return true; for (const av of MP.avatars.values()) if (av.dim === world.dim && m.pos.distanceToSquared(av.pos) < 28 * 28) return true; return false; });
    const hidden = all.filter(m => !near.includes(m)); for (const m of hidden) m.isBoss = true; // skipped by the snapshot loop
    try { return _ht.apply(this, arguments); } finally { for (const m of hidden) m.isBoss = false; } }; }

// ================= MORE PVP KITS =================
// UHC, Pot, Neth Pot, SMP and Diamond SMP, as played on Minecraft PvP practice servers. Loadouts are my best
// reading of the usual ones; exact contents differ from server to server.
{ const P2 = { protection: 2, unbreaking: 3 }, P3 = { protection: 3, unbreaking: 3 }, S3 = { sharpness: 3, unbreaking: 3 };
  const dia = (e) => [['diamond_helmet', e], ['diamond_chestplate', e], ['diamond_leggings', e], ['diamond_boots', e]];
  const pots = (key, n) => Array.from({ length: n }, () => ['splash_potion', { pot: key }]);
  KITS.push(
    { k: 'uhc', name: 'UHC', blurb: 'No easy healing. Sword, axe, bow, shield, golden apples, lava and water.', armor: dia(P2), items: [['diamond_sword', S3], ['diamond_axe', { sharpness: 1 }], ['bow', { power: 2 }], ['golden_apple', 12], ['lava_bucket'], ['water_bucket'], ['cobblestone', 64], ['planks', 64], ['arrow', 20], ['steak', 16], ['lava_bucket'], ['water_bucket'], ['diamond_pickaxe', { efficiency: 2 }]], off: ['shield'] },
    { k: 'pot', name: 'Pot', blurb: 'Diamond gear and a hotbar of splash healing. Heal fast, keep swinging.', armor: dia(P3), items: [['diamond_sword', { sharpness: 4, fire_aspect: 1, unbreaking: 3 }], ['ender_pearl', 16], ['steak', 32], ['potion', { pot: 'swiftness' }], ['potion', { pot: 'strength' }], ...pots('strong_healing', 28), ['potion', { pot: 'swiftness' }], ['potion', { pot: 'strength' }]] },
    { k: 'neth_pot', name: 'Neth Pot', blurb: 'Netherite, splash healing, totems and golden apples. Long fights.', armor: KNETH, items: [['netherite_sword', KSHARP], ['golden_apple', 64], ['ender_pearl', 16], ['totem_of_undying'], ['potion', { pot: 'swiftness' }], ['potion', { pot: 'strength' }], ['experience_bottle', 64], ...pots('strong_healing', 22), ['totem_of_undying'], ['totem_of_undying']], off: ['totem_of_undying'] },
    { k: 'smp', name: 'SMP', blurb: 'Survival-server fight: netherite, axe and shield, pearls, gapples, totem.', armor: KNETH, items: [['netherite_sword', KSHARP], ['netherite_axe', { sharpness: 5, unbreaking: 3 }], ['golden_apple', 64], ['ender_pearl', 16], ['totem_of_undying'], ['potion', { pot: 'strength' }], ['potion', { pot: 'swiftness' }], ['experience_bottle', 64], ['steak', 32], ['cobweb', 16], ['water_bucket'], ['totem_of_undying']], off: ['shield'] },
    { k: 'dia_smp', name: 'Diamond SMP', blurb: 'SMP rules in diamond: axe and shield, gapples, pearls, no totems.', armor: dia({ protection: 4, unbreaking: 3 }), items: [['diamond_sword', KSHARP], ['diamond_axe', { sharpness: 5, unbreaking: 3 }], ['golden_apple', 32], ['ender_pearl', 16], ['potion', { pot: 'strength' }], ['potion', { pot: 'swiftness' }], ['steak', 32], ['cobweb', 16], ['water_bucket'], ['experience_bottle', 64]], off: ['shield'] });
  // a stack's third part may carry a potion as well as enchantments
  const _ks = kitStack; kitStack = function (key, a) { if (a && typeof a === 'object' && a.pot) { const id = IT[key]; return id == null || !POTIONS[a.pot] ? null : { id, count: 1, pot: a.pot }; } return _ks(key, a); };
  // the picker: five columns for thirteen kits, keys 1-9 for the first nine
  const _ok = openKitPicker; openKitPicker = function () { const fresh = !$('kitPick'); const r = _ok.apply(this, arguments); if (fresh) { const g = $('kitGrid'); g.style.gridTemplateColumns = 'repeat(5,190px)';
      for (const img of g.querySelectorAll('img[data-k]')) { const kt = KITS[+img.closest('button').dataset.i]; const ent = kt.items.find(x => x[0] === img.dataset.k && x[1] && x[1].pot); if (ent) { const s = kitStack(ent[0], ent[1]); if (s && typeof stackIcon === 'function') img.src = stackIcon(s); } } }
    return r; };
  addEventListener('keydown', (e) => { if (S.uiOpen === 'kit' && e.key === '9') { e.preventDefault(); e.stopImmediatePropagation(); pickKit(8); } }, true); }

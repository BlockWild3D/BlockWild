// ================= ALL MINECRAFT ENCHANTMENTS (minus Bane of Arthropods, Frost Walker and Impaling) =================
// Armour: Protection, Fire/Blast/Projectile Protection, Thorns, Respiration and Aqua Affinity (helmets), Feather
// Falling, Depth Strider and Soul Speed (boots), Swift Sneak (leggings). Everything with durability: Unbreaking and
// Mending. Crossbows: Multishot, Piercing, Quick Charge (and crossbows now work: hold use to load, use to fire).
// Curses: Binding (can't take the armour off) and Vanishing (the item is gone when you die). Treasure enchantments
// (Mending, Soul Speed, Swift Sneak, curses) never come from an enchanting table; find them as books in chests, from
// fishing, trading (Mending only), bartering (Soul Speed) or ancient cities (Swift Sneak).
delete ENCH.bane_of_arthropods; delete ENCH.impaling;
Object.assign(ENCH, {
  blast_protection: { name: 'Blast Protection', max: 4, for: 'armor', excl: 'prot', w: 2 }, projectile_protection: { name: 'Projectile Protection', max: 4, for: 'armor', excl: 'prot', w: 5 },
  thorns: { name: 'Thorns', max: 3, for: 'armor', slot: 'chest', w: 1 }, respiration: { name: 'Respiration', max: 3, for: 'armor', slot: 'head', w: 2 }, aqua_affinity: { name: 'Aqua Affinity', max: 1, for: 'armor', slot: 'head', w: 2 },
  depth_strider: { name: 'Depth Strider', max: 3, for: 'armor', slot: 'feet', w: 2 }, soul_speed: { name: 'Soul Speed', max: 3, for: 'armor', slot: 'feet', w: 1, treasure: true, noTrade: true },
  swift_sneak: { name: 'Swift Sneak', max: 3, for: 'armor', slot: 'legs', w: 1, treasure: true, noTrade: true },
  mending: { name: 'Mending', max: 1, for: '*', w: 2, treasure: true }, curse_of_binding: { name: 'Curse of Binding', max: 1, for: 'armor', w: 1, treasure: true, curse: true }, curse_of_vanishing: { name: 'Curse of Vanishing', max: 1, for: '*', w: 1, treasure: true, curse: true },
  multishot: { name: 'Multishot', max: 1, for: 'crossbow', excl: 'xbow', w: 2 }, piercing: { name: 'Piercing', max: 4, for: 'crossbow', excl: 'xbow', w: 10 }, quick_charge: { name: 'Quick Charge', max: 3, for: 'crossbow', w: 5 },
});
if (ENCH.unbreaking) ENCH.unbreaking.for = '*';
{ const _ec = enchCat; enchCat = function (id) { const it = ITEMS[id]; if (it && it.kind === 'crossbow') return 'crossbow'; return _ec(id); }; }
{ const _ef = enchantFits; enchantFits = function (id, en) { const E = ENCH[en]; if (!E) return false; if (E.for === '*') return !!maxDur(id) || id === IT.book || id === IT.enchanted_book; if (en === 'thorns' && ITEMS[id] && ITEMS[id].kind === 'armor') return true; return _ef(id, en); }; }
{ const _ea = enchantability; enchantability = function (id) { if (id === IT.crossbow) return 1; if (ITEMS[id] && ITEMS[id].mat === 'chainmail') return 12; if (ITEMS[id] && ITEMS[id].mat === 'netherite') return 15; return _ea(id); }; }
// enchanting tables never give treasure enchantments; "for: *" ones (Unbreaking) fit any item with durability
{ const _re = rollEnchants; rollEnchants = function (id, cost, seed) {
    const hidden = []; for (const k in ENCH) if (ENCH[k].treasure || (ENCH[k].for === '*' && !maxDur(id))) { hidden.push([k, ENCH[k]]); delete ENCH[k]; }
    const extra = []; if (maxDur(id) && !Object.prototype.hasOwnProperty.call(ENCH, '__ub')) { }
    let out; try { const cat = enchCat(id); const ub = ENCH.unbreaking; const was = ub && ub.for; if (ub && maxDur(id)) ub.for = cat; out = _re(id, cost, seed); if (ub) ub.for = was; } finally { for (const [k, v] of hidden) ENCH[k] = v; }
    return out; }; }
// ---------- armour enchantment effects ----------
const BLAST_CAUSES = /Creeper|TNT|explosion|End Crystal|fireball|Ghast|Wither|bed/i, PROJ_CAUSES = /arrow|Blaze|fireball|Shulker|Trident|Ghast|potion|Llama/i;
{ const _ar = armorReduce; armorReduce = function (dmg, cause) {
    let r = _ar(dmg, cause); if (cause === 'fall damage' || cause === 'the void' || cause === 'magic') return r; let epf = 0;
    for (let i = 37; i <= 40; i++) { const s = player.inv[i]; if (!s) continue; if (BLAST_CAUSES.test(cause || '')) epf += 2 * enchOf(s, 'blast_protection'); if (PROJ_CAUSES.test(cause || '')) epf += 2 * enchOf(s, 'projectile_protection'); }
    return r * (1 - Math.min(20, epf) * 0.04); }; }
// Thorns: 15% per level to hit back an attacker for 1-4
{ const _h = Player.prototype.hurt; Player.prototype.hurt = function (dmg, src, cause, kb) {
    const r = _h.apply(this, arguments);
    if (this === player && src && isSurv()) { let lv = 0; for (let i = 37; i <= 40; i++) lv += enchOf(player.inv[i], 'thorns'); if (lv && Math.random() < 0.15 * lv) { const m = G.mobs.find(o => o.pos === src || (o.pos && o.pos.distanceTo && o.pos.distanceTo(src) < 0.01)); if (m && !m.dead) { m.hurt(1 + Math.floor(Math.random() * 4), player.pos, 0.3); Sfx.at('hurt', m.pos, 0.4, 1.3); } for (let i = 37; i <= 40; i++) if (enchOf(player.inv[i], 'thorns')) damageSlot(i, 2); } }
    return r; }; }
// Respiration: each level gives an extra chance to keep your breath (and lets you see underwater a bit longer)
{ let last = 300; const _u = updatePlayer; updatePlayer = function (dt) { const a0 = player.air; const r = _u.apply(this, arguments); const lv = enchOf(player.inv[37], 'respiration'); if (lv && player.air < a0) player.air = a0 - (a0 - player.air) / (lv + 1); return r; }; }
// Aqua Affinity: no mining slowdown with your head underwater
{ const _bt = breakTime; breakTime = function (id, tool) { const t = _bt(id, tool); if (enchOf(player.inv[37], 'aqua_affinity') && inWater(player, 1.6)) return t / 5; return t; }; }
// Swift Sneak / Depth Strider / Soul Speed change walking speed (hooked into the movement code)
function sneakSpeedMul() { return 1 + 0.5 * enchOf(player.inv[39], 'swift_sneak'); }
function waterSpeedMul() { const d = Math.min(3, enchOf(player.inv[40], 'depth_strider')); return 0.55 + (1 - 0.55) * d / 3; }
function soulSandMul() { const s = enchOf(player.inv[40], 'soul_speed'); if (!s) return 0.55; if (Math.random() < 0.04 && isSurv()) damageSlot(40, 1); if (Math.random() < 0.2) Particles.emit(player.pos.x, player.pos.y + 0.1, player.pos.z, 1, [[0.3, 0.8, 0.9]], 0.5, 0.4, -1, 0.5); return 1.05 + 0.105 * s; }
// Mending: experience you pick up repairs a random damaged Mending item you're wearing or holding (2 durability each)
{ const _ax = addXP; addXP = function (n) {
    if (n > 0) { const slots = [player.sel, 36, 37, 38, 39, 40].filter(i => { const s = player.inv[i]; return s && s.dmg > 0 && enchOf(s, 'mending'); });
      while (n > 0 && slots.length) { const i = slots[(Math.random() * slots.length) | 0]; const s = player.inv[i]; const fix = Math.min(s.dmg, n * 2); s.dmg -= fix; n -= Math.ceil(fix / 2); if (!s.dmg) { delete s.dmg; slots.splice(slots.indexOf(i), 1); } invDirty(); } }
    if (n > 0) return _ax(n); }; }
// Curse of Vanishing: gone when you die; Curse of Binding: worn armour can't be taken off (except in creative)
{ const _d = Player.prototype.die; Player.prototype.die = function (cause) { if (this === player && isSurv() && !S.rules.keepInventory) for (let i = 0; i < this.inv.length; i++) { const s = this.inv[i]; if (s && enchOf(s, 'curse_of_vanishing')) this.inv[i] = null; } return _d.apply(this, arguments); }; }
{ const _sc = slotClick; slotClick = function (cont, i, button, shift) { if (cont === 'inv' && i >= 37 && i <= 40 && S.mode !== 'creative') { const s = player.inv[i]; if (s && enchOf(s, 'curse_of_binding')) { toast('Curse of Binding: this armour can\'t be removed', 1.5); return; } } return _sc(cont, i, button, shift); }; }
// ---------- crossbows ----------
// Hold use to load (1.25 s, 0.25 s less per Quick Charge level), then use to fire: 3.15 blocks per tick. Multishot
// fires three arrows for one; Piercing arrows go through that many extra mobs. Loaded crossbows stay loaded.
S.xbowT = -1;
{ const _ui = updateInteraction; updateInteraction = function (dt) {
    const h = player.held(); const r = _ui.apply(this, arguments);
    if (h && h.id === IT.crossbow && !S.uiOpen && !player.dead && S.mode !== 'spectator') {
      if (h.loaded) { if (mouseR && !S.xbowHold) { fireCrossbow(h); S.xbowHold = true; } }
      else if (mouseR && !S.xbowHold) { if (S.xbowT < 0) { if (S.mode !== 'creative' && arrowSlot() < 0) { if (S.useCD <= 0) { toast('You need arrows', 1.2); S.useCD = 1; } } else { S.xbowT = 0; Sfx.play('bowdraw', 0.6, 0.8); } }
        else { S.xbowT += dt; S.eating = Math.min(1, S.xbowT / xbowTime(h)); if (S.xbowT >= xbowTime(h)) { loadCrossbow(h); S.xbowT = -1; S.eating = 0; S.xbowHold = true; } } }
      else if (!mouseR) { if (S.xbowT >= 0) { S.xbowT = -1; S.eating = 0; } }
    } else if (S.xbowT >= 0) { S.xbowT = -1; S.eating = 0; }
    if (!mouseR) S.xbowHold = false;
    return r; }; }
function xbowTime(h) { return Math.max(0.05, 1.25 - 0.25 * enchOf(h, 'quick_charge')); }
function loadCrossbow(h) { let pot = null; if (S.mode !== 'creative') { const i = arrowSlot(); if (i < 0) return; const s = player.inv[i]; pot = s.id === IT.tipped_arrow ? s.pot : null; s.count--; if (!s.count) player.inv[i] = null; } h.loaded = pot ? { pot } : true; Sfx.play('click', 0.8, 0.6); invDirty(); }
function fireCrossbow(h) {
  const eye = player.eye(), dir = lookDir(); const n = enchOf(h, 'multishot') ? 3 : 1; const pierce = enchOf(h, 'piercing'); const tip = h.loaded && h.loaded.pot;
  for (let k = 0; k < n; k++) { const d = dir.clone(); if (k) d.applyAxisAngle(new V3(0, 1, 0), k === 1 ? 0.17 : -0.17);
    const a = spawnProj('arrow', eye.clone().addScaledVector(d, 0.3), d.multiplyScalar(63), 'player', 0); a.base = 2; a.crit = false; a.dmg = arrowDamage(a); a.life = 15; a.tip = tip || null; a.pierce = pierce; a.hitList = []; if (k) a.noPickup = true; }
  delete h.loaded; damageHeld(n > 1 ? 3 : 1); Sfx.play('bow', 0.9, 1.3); S.bowKick = 1; invDirty();
}
// piercing arrows keep going through mobs
{ const _h = Mob.prototype.hurt; Mob.prototype.hurt = function (dmg, src, kb, na) { const r = _h.call(this, dmg, src, kb, na); return r; }; }
{ const _up = updateProjectiles; updateProjectiles = function (dt) {
    const pierced = G.projectiles.filter(a => a.kind === 'arrow' && a.pierce > 0 && !a.done);
    for (const a of pierced) for (const m of G.mobs) { if (m.dead || a.hitList.includes(m) || m.isBoss) continue; if (hitsMob(m, a.pos)) { a.hitList.push(m); m.hurt(a.dmg, player.pos, 0.6); if (a.hitList.length > a.pierce) { a.done = true; break; } } }
    for (const a of pierced) if (!a.done) { a.owner = 'player-pierce'; }
    const r = _up.apply(this, arguments); for (const a of pierced) if (a.owner === 'player-pierce') a.owner = 'player'; return r; }; }
{ const _tt = itemTooltip; itemTooltip = function (s) { const t = _tt(s); if (s && s.id === IT.crossbow && s.loaded) return t + '\nLoaded: ' + (s.loaded.pot ? potionName({ id: IT.tipped_arrow, pot: s.loaded.pot }) : 'Arrow'); return t; }; }
{ const _x = xtra; xtra = function (s) { const o = _x(s); if (!s || !s.loaded) return o; return Object.assign(o || {}, { loaded: s.loaded }); }; }

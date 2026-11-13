// ================= BREWING AND POTIONS (Minecraft Java) =================
// Fill glass bottles from water, then brew them in a brewing stand (fuel: blaze powder, 20 brews each; 20 seconds a
// brew; up to three bottles at once). Nether wart turns water bottles into Awkward Potions, the base for almost
// everything; redstone makes a potion last longer, glowstone makes it stronger, a fermented spider eye corrupts it,
// gunpowder makes it a splash potion and dragon's breath turns a splash potion into a lingering one.
// Drink a potion (hold use), throw a splash potion (the effect fades over 4 blocks), or throw a lingering potion for a
// cloud that lasts 30 seconds (a quarter of the duration each time it touches you). 8 arrows around a lingering
// potion make tipped arrows (an eighth of the duration). Nether wart grows on soul sand; Nether fortresses have it.
const POT_EFF = { // base potions: [effect, seconds, amplifier] (or a list of them); long / strong variants below
  night_vision: ['night_vision', 180], invisibility: ['invisibility', 180], leaping: ['jump_boost', 180], fire_resistance: ['fire_resistance', 180], swiftness: ['speed', 180], slowness: ['slowness', 90],
  turtle_master: [['slowness', 20, 3], ['resistance', 20, 2]], water_breathing: ['water_breathing', 180], healing: ['instant_health', 0], harming: ['instant_damage', 0], poison: ['poison', 45], regeneration: ['regeneration', 45],
  strength: ['strength', 180], weakness: ['weakness', 90], slow_falling: ['slow_falling', 90], wind_charged: ['wind_charged', 180], weaving: ['weaving', 180], oozing: ['oozing', 180], infested: ['infested', 180],
};
const POT_LONG = { night_vision: 480, invisibility: 480, leaping: 480, fire_resistance: 480, swiftness: 480, slowness: 240, turtle_master: 40, water_breathing: 480, poison: 90, regeneration: 90, strength: 480, weakness: 240, slow_falling: 240 };
const POT_STRONG = { leaping: ['jump_boost', 90, 1], swiftness: ['speed', 90, 1], slowness: ['slowness', 20, 3], turtle_master: [['slowness', 20, 5], ['resistance', 20, 3]], healing: ['instant_health', 0, 1], harming: ['instant_damage', 0, 1], poison: ['poison', 21.6, 1], regeneration: ['regeneration', 22.5, 1], strength: ['strength', 90, 1] };
const POT_NAMES = { night_vision: 'Night Vision', invisibility: 'Invisibility', leaping: 'Leaping', fire_resistance: 'Fire Resistance', swiftness: 'Swiftness', slowness: 'Slowness', turtle_master: 'the Turtle Master', water_breathing: 'Water Breathing', healing: 'Healing', harming: 'Harming', poison: 'Poison', regeneration: 'Regeneration', strength: 'Strength', weakness: 'Weakness', slow_falling: 'Slow Falling', wind_charged: 'Wind Charging', weaving: 'Weaving', oozing: 'Oozing', infested: 'Infestation' };
const POT_COLOR = { water: [56, 92, 230], awkward: [56, 92, 230], mundane: [56, 92, 230], thick: [56, 92, 230], night_vision: [31, 31, 161], invisibility: [127, 131, 146], leaping: [34, 255, 76], fire_resistance: [228, 154, 58], swiftness: [124, 175, 198], slowness: [90, 108, 129], turtle_master: [118, 94, 136], water_breathing: [46, 82, 153], healing: [248, 36, 35], harming: [67, 10, 9], poison: [78, 147, 49], regeneration: [205, 92, 171], strength: [147, 36, 35], weakness: [72, 77, 72], slow_falling: [255, 239, 209], wind_charged: [189, 201, 255], weaving: [120, 105, 90], oozing: [153, 255, 163], infested: [140, 155, 140] };
// every potion type: water, awkward, mundane, thick, and each effect as base / long_ / strong_
const POTIONS = { water: {}, awkward: {}, mundane: {}, thick: {} };
for (const k in POT_EFF) { POTIONS[k] = { base: k, effect: POT_EFF[k] }; if (POT_LONG[k]) POTIONS['long_' + k] = { base: k, long: true, effect: POT_EFF[k] }; if (POT_STRONG[k]) POTIONS['strong_' + k] = { base: k, strong: true, effect: POT_STRONG[k] }; }
function potEffects(pot) { const P = POTIONS[pot]; if (!P || !P.effect) return []; const list = Array.isArray(P.effect[0]) ? P.effect : [P.effect]; return list.map(([e, sec, amp]) => [e, P.long ? (POT_LONG[P.base] || sec) : sec, amp || 0]); }
Object.assign(EFFECTS, { invisibility: 'Invisibility', water_breathing: 'Water Breathing', wind_charged: 'Wind Charged', weaving: 'Weaving', oozing: 'Oozing', infested: 'Infested', wither: 'Wither', absorption: 'Absorption', hunger: 'Hunger' });
// ---------- brewing recipes ----------
const BREW_ING = { nether_wart: 1, redstone: 1, glowstone_dust: 1, fermented_spider_eye: 1, gunpowder: 1, dragon_breath: 1, golden_carrot: 1, rabbit_foot: 1, magma_cream: 1, sugar: 1, turtle_scute: 1, pufferfish: 1, glistering_melon_slice: 1, spider_eye: 1, ghast_tear: 1, blaze_powder: 1, phantom_membrane: 1, breeze_rod: 1, cobweb: 1, slime_ball: 1, stone: 1 };
const AWKWARD_TO = { golden_carrot: 'night_vision', rabbit_foot: 'leaping', magma_cream: 'fire_resistance', sugar: 'swiftness', turtle_scute: 'turtle_master', pufferfish: 'water_breathing', glistering_melon_slice: 'healing', spider_eye: 'poison', ghast_tear: 'regeneration', blaze_powder: 'strength', phantom_membrane: 'slow_falling', breeze_rod: 'wind_charged', cobweb: 'weaving', slime_ball: 'oozing', stone: 'infested' };
const CORRUPT = { night_vision: 'invisibility', leaping: 'slowness', swiftness: 'slowness', healing: 'harming', poison: 'harming', water: 'weakness' };
// the result of brewing ingredient key into a bottle, or null if nothing happens
function brewResult(s, ing) {
  const pot = s.pot || 'water'; const P = POTIONS[pot] || {}; const id = s.id;
  if (ing === 'gunpowder') return id === IT.potion ? { id: IT.splash_potion, pot } : null;
  if (ing === 'dragon_breath') return id === IT.splash_potion ? { id: IT.lingering_potion, pot } : null;
  if (pot === 'water') { if (ing === 'nether_wart') return { id, pot: 'awkward' }; if (ing === 'fermented_spider_eye') return { id, pot: 'weakness' }; if (ing === 'glowstone_dust') return { id, pot: 'thick' }; if (AWKWARD_TO[ing] || ing === 'redstone') return { id, pot: 'mundane' }; return null; }
  if (pot === 'awkward') return AWKWARD_TO[ing] ? { id, pot: AWKWARD_TO[ing] } : null;
  if (!P.base) return null;
  if (ing === 'redstone') return POT_LONG[P.base] && !P.long ? { id, pot: 'long_' + P.base } : null;
  if (ing === 'glowstone_dust') return POT_STRONG[P.base] && !P.strong ? { id, pot: 'strong_' + P.base } : null;
  if (ing === 'fermented_spider_eye') { const c = CORRUPT[P.base]; if (!c) return null; const pre = P.long && POTIONS['long_' + c] ? 'long_' : P.strong && POTIONS['strong_' + c] ? 'strong_' : ''; return { id, pot: pre + c }; }
  return null;
}
// ---------- names, icons, tooltips ----------
function potionName(s) { const P = POTIONS[s.pot] || {}; const kind = s.id === IT.splash_potion ? 'Splash Potion' : s.id === IT.lingering_potion ? 'Lingering Potion' : s.id === IT.tipped_arrow ? 'Arrow' : 'Potion';
  if (!s.pot || s.pot === 'water') return s.id === IT.tipped_arrow ? 'Tipped Arrow' : s.id === IT.potion ? 'Water Bottle' : kind.replace('Potion', 'Water Bottle');
  if (!P.base) return (s.pot === 'awkward' ? 'Awkward ' : s.pot === 'thick' ? 'Thick ' : 'Mundane ') + kind;
  return kind + ' of ' + POT_NAMES[P.base]; }
const potIconCache = {};
function potionIcon(id, pot) { const key = id + ':' + pot; if (potIconCache[key]) return potIconCache[key]; const col = POT_COLOR[(POTIONS[pot] && POTIONS[pot].base) || pot] || POT_COLOR.water;
  const c = id === IT.tipped_arrow ? iconCanvas((s, r) => { ICONP.tipped_arrow(s, r); pLine(s, 9, 6, 12, 3, col); s(12, 3, col); }) : iconCanvas((s) => potionPaint(s, col, id === IT.splash_potion ? 'splash' : id === IT.lingering_potion ? 'lingering' : null));
  return (potIconCache[key] = c.toDataURL()); }
{ const _ps = paintSlot; paintSlot = function (el, s) { const img = el.firstChild; const key = s && s.pot ? s.id + ':' + s.pot : '';
    if (img && (img.dataset.pk || '') !== key) img.dataset.id = ''; const r = _ps(el, s);
    if (img && key) { if (img.dataset.pk !== key) { img.src = potionIcon(s.id, s.pot); img.dataset.pk = key; } } else if (img) img.dataset.pk = '';
    if (s && s.pot && POTIONS[s.pot] && POTIONS[s.pot].effect) el.classList.add('ench'); return r; }; }
const fmtT = (sec) => Math.floor(sec / 60) + ':' + String(Math.floor(sec % 60)).padStart(2, '0');
{ const _tt = itemTooltip; itemTooltip = function (s) {
    if (!s || !(s.id === IT.potion || s.id === IT.splash_potion || s.id === IT.lingering_potion || s.id === IT.tipped_arrow)) return _tt(s);
    const L = [potionName(s)]; const k = s.id === IT.lingering_potion ? 0.25 : s.id === IT.tipped_arrow ? 0.125 : 1; const ef = potEffects(s.pot);
    if (!ef.length) L.push('No Effects'); for (const [e, sec, amp] of ef) L.push((EFFECTS[e] || e) + (amp ? ' ' + roman(amp + 1) : '') + (sec ? ' (' + fmtT(sec * k) + ')' : ''));
    return L.join('\n'); }; }
// the hotbar's item name
{ const _ss = selectSlot; selectSlot = function (i) { const r = _ss(i); const h = player.held(); if (h && h.pot) $('itemname').textContent = potionName(h); return r; }; }
// ---------- effects on the player ----------
function applyPotion(pot, scale, toMob) {
  for (const [e, sec, amp] of potEffects(pot)) {
    if (toMob) { mobEffect(toMob, e, sec * scale, amp, scale); continue; }
    if (e === 'instant_health' || e === 'instant_damage') { const n = (e === 'instant_health' ? 4 : 6) * Math.pow(2, amp) * scale; if (e === 'instant_health') { player.health = Math.min(20, player.health + n); updateHearts(); } else if (isSurv()) { player.hurtCD = 0; player.hurt(n, null, 'magic', 0); } continue; }
    const t = sec * scale; if (t < 1) continue; const cur = player.effects[e]; if (!cur || cur.amp < amp || (cur.amp === amp && cur.t < t)) giveEffect(e, t, amp);
  }
}
// ---------- effects on mobs ----------
function mobEffect(m, e, sec, amp, scale = 1) {
  if (!m || m.dead || m.isBoss) return; const undead = UNDEAD.has(m.type);
  if (e === 'instant_health' || e === 'instant_damage') { const heal = (e === 'instant_health') !== undead; const n = (heal ? 4 : 6) * Math.pow(2, amp) * scale; if (heal) m.hp = Math.min(m.maxHp || m.t.hp, m.hp + n); else m.hurt(n, null, 0, false); return; }
  if ((e === 'poison' || e === 'regeneration') && undead) return;
  m.effects = m.effects || {}; const cur = m.effects[e]; if (!cur || cur.amp < amp || cur.t < sec) m.effects[e] = { t: sec, amp };
}
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) {
    const E = this.effects; if (E && !this.dead) { let sp = 1;
      for (const k in E) { const e = E[k]; e.t -= dt; if (e.t <= 0) { delete E[k]; if (k === 'invisibility' && this.root) this.root.visible = true; continue; }
        if (k === 'poison' || k === 'wither') { e.acc = (e.acc || 0) + dt; const iv = (k === 'poison' ? 1.25 : 2) / Math.pow(2, e.amp); if (e.acc >= iv) { e.acc = 0; if (k === 'wither' || this.hp > 1) this.hurt(1, null, 0, true); } }
        if (k === 'regeneration') { e.acc = (e.acc || 0) + dt; if (e.acc >= 2.5 / Math.pow(2, e.amp)) { e.acc = 0; this.hp = Math.min(this.maxHp || this.t.hp, this.hp + 1); } }
        if (k === 'speed') sp *= 1 + 0.2 * (e.amp + 1); if (k === 'slowness') sp *= Math.max(0, 1 - 0.15 * (e.amp + 1)); if (k === 'levitation') this.vel.y = 0.9 * (e.amp + 1); if (k === 'slow_falling') this.vel.y = Math.max(this.vel.y, -1.5);
        if (k === 'invisibility' && this.root) this.root.visible = false; if (k === 'weaving' && this.web) { } }
      this.spMul = sp; if (Math.random() < dt * 4) { const ks = Object.keys(E).filter(k => k !== 'invisibility'); if (ks.length) { const c = POT_COLOR[{ speed: 'swiftness', jump_boost: 'leaping', instant_health: 'healing' }[ks[0]] || ks[0]] || [200, 200, 200]; Particles.emit(this.pos.x, this.pos.y + this.h * 0.6, this.pos.z, 1, [[c[0] / 255, c[1] / 255, c[2] / 255]], 0.6, 0.7, -1, 0.5); } } }
    return _u.call(this, dt);
  }; }
// Weaving, Oozing, Wind Charged and Infested act when their owner is hurt or dies
{ const _h = Mob.prototype.hurt; Mob.prototype.hurt = function (dmg, src, kb, na) {
    const was = this.dead; const r = _h.call(this, dmg, src, kb, na); const E = this.effects; if (!E || isClientMP()) return r;
    if (E.infested && !this.dead && Math.random() < 0.1 && this.type !== 'silverfish') for (let i = 0; i < 1 + (Math.random() * 2 | 0); i++) spawnMob('silverfish', this.pos.x, this.pos.y + 0.5, this.pos.z);
    if (!was && this.dead) {
      if (E.oozing) for (let i = 0; i < 2; i++) { const s = spawnMob('slime', this.pos.x + (Math.random() - 0.5), this.pos.y + 0.5, this.pos.z + (Math.random() - 0.5), { size: 2 }); }
      if (E.weaving) { let n = 2 + (Math.random() * 2 | 0); for (let t = 0; t < 12 && n > 0; t++) { const x = Math.floor(this.pos.x + (Math.random() - 0.5) * 3), y = Math.floor(this.pos.y + Math.random() * 1.5), z = Math.floor(this.pos.z + (Math.random() - 0.5) * 3); if (!world.get(x, y, z)) { world.set(x, y, z, B.COBWEB); mpBlock(x, y, z, B.COBWEB); n--; } } }
      if (E.wind_charged && typeof windBurst === 'function') windBurst(new V3(this.pos.x, this.pos.y + 0.5, this.pos.z), 1.2, this);
    }
    return r; }; }
// invisible players are much harder for monsters to notice (Minecraft: 7% of the follow range)
{ const _ht = hostileTarget; hostileTarget = function (m, range = 16) { if (effLevel('invisibility')) range *= 0.07 + 0.1 * player.inv.slice(36, 40).filter(Boolean).length; return _ht(m, range); }; }
// ---------- using potions ----------
S.drinkT = 0;
{ const _ui = updateInteraction; updateInteraction = function (dt) {
    const r = _ui.apply(this, arguments); const h = player.held();
    if (h && h.id === IT.potion && mouseR && !S.uiOpen && !player.dead && S.mode !== 'spectator') {
      S.drinkT += dt; S.eating = Math.min(1, S.drinkT / 1.6); if (Math.random() < dt * 5) Sfx.play('splash', 0.15, 1.8);
      if (S.drinkT >= 1.6) { S.drinkT = 0; S.eating = 0; mouseR = false; applyPotion(h.pot || 'water', 1); Sfx.play('pop', 0.5, 0.8); if (S.mode !== 'creative') { player.inv[handSlot()] = { id: IT.glass_bottle, count: 1 }; invDirty(); } }
    } else if (S.drinkT) { S.drinkT = 0; S.eating = 0; }
    return r; }; }
PROJ.potion = { grav: 20, size: 0.24, color: 0x6070e0, trail: [[0.7, 0.7, 1]] };
{ const _ua = useAction; useAction = function (eye, dir) {
    const h = player.held(); const hd = h && ITEMS[h.id]; const sneaking = kd('sneak');
    if (hd && (hd.kind === 'splash' || hd.kind === 'lingering') && !(target && !sneaking && BL[target.id].use)) {
      mouseR = false; const v = dir.clone().multiplyScalar(10); v.y += 2; const p = spawnProj('potion', eye.clone().addScaledVector(dir, 0.5), v, 'player', 0); p.pot = h.pot || 'water'; p.ling = hd.kind === 'lingering';
      const c = POT_COLOR[(POTIONS[p.pot] && POTIONS[p.pot].base) || p.pot] || POT_COLOR.water; p.mesh.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(c[0] / 255, c[1] / 255, c[2] / 255) });
      useHeld(1); Sfx.play('bow', 0.4, 0.7); S.swing = 1; S.useCD = 0.4; return; }
    if (hd && hd.id === IT.glass_bottle) { // fill from water, or collect dragon's breath
      const near = (G.clouds || []).find(c => c.life > 0 && Math.hypot(c.x - eye.x, c.z - eye.z) < c.r + 2 && Math.abs(c.y - eye.y) < 4);
      if (near) { mouseR = false; giveBottle(IT.dragon_breath, null); near.r = Math.max(0.5, near.r - 0.5); Sfx.play('pop', 0.5, 1.2); return; }
      const ft = raycast(eye, dir, 5, true); if (ft && isWaterId(ft.id)) { mouseR = false; giveBottle(IT.potion, 'water'); Sfx.play('splash', 0.4, 1.4); return; } }
    if (hd && hd.id === IT.nether_wart && target && target.id === B.SOUL_SAND && target.ny > 0 && !world.get(target.x, target.y + 1, target.z)) { mouseR = false; world.set(target.x, target.y + 1, target.z, B.NETHER_WART_0); mpBlock(target.x, target.y + 1, target.z, B.NETHER_WART_0); useHeld(1); Sfx.play('step', 0.5); S.swing = 1; return; }
    if (hd && hd.id === IT.end_crystal && target && (target.id === B.OBSIDIAN || target.id === B.BEDROCK) && target.ny > 0) { mouseR = false; if (placeEndCrystal(target.x, target.y + 1, target.z)) { useHeld(1); S.swing = 1; } return; }
    if (target && !sneaking && BL[target.id].use === 'brew') { mouseR = false; openBrewing(target.x + ',' + target.y + ',' + target.z); return; }
    return _ua(eye, dir); }; }
function giveBottle(id, pot) { const item = pot ? { id, count: 1, pot } : { id, count: 1 }; if (S.mode !== 'creative') { const h = player.held(); h.count--; if (h.count <= 0) player.inv[handSlot()] = null; } giveOrDrop(item.id, 1, pot ? { pot } : null); invDirty(); }
{ const _pi = projImpact; projImpact = function (a, mob) {
    if (a.kind !== 'potion') return _pi(a, mob); a.done = true; const p = a.pos; const c = POT_COLOR[(POTIONS[a.pot] && POTIONS[a.pot].base) || a.pot] || POT_COLOR.water; const col = [c[0] / 255, c[1] / 255, c[2] / 255];
    Sfx.play('glass', 0.6); Particles.emit(p.x, p.y, p.z, 40, [col, [1, 1, 1]], 3, 0.8, 2, 1.2);
    if (a.ling) { G.potClouds = G.potClouds || []; G.potClouds.push({ x: p.x, y: p.y - 0.5, z: p.z, r: 3, life: 30, pot: a.pot, col, cd: new Map() }); return; }
    // splash: full strength at the impact, fading to nothing 4 blocks away; water puts out fires
    const P = player; const dP = new V3(P.pos.x, P.pos.y + 0.9, P.pos.z).distanceTo(p); if (dP < 4 && !P.dead) { applyPotion(a.pot, mob === null && dP < 1.5 ? 1 : 1 - dP / 4); if (a.pot === 'water') P.fireT = 0; }
    for (const m of G.mobs) { if (m.dead || m.isBoss) continue; const d = new V3(m.pos.x, m.pos.y + m.h / 2, m.pos.z).distanceTo(p); if (d < 4) { applyPotion(a.pot, m === mob ? 1 : 1 - d / 4, m); if (a.pot === 'water') { m.burnT = 0; if (m.t.waterHurt) m.hurt(1, null, 0); } } }
  }; }
function updatePotClouds(dt) {
  const L = G.potClouds; if (!L || !L.length) return; const P = player;
  for (const c of L) { c.life -= dt; c.r = Math.max(0, c.r - dt * 0.1); if (Math.random() < dt * 30) { const a = Math.random() * 6.28, rr = Math.sqrt(Math.random()) * c.r; Particles.emit(c.x + Math.cos(a) * rr, c.y + 0.2, c.z + Math.sin(a) * rr, 1, [c.col], 0.3, 1, -0.5, 0.4); }
    const touch = (e, key, fn) => { const last = c.cd.get(key) || -9; if (G.simT - last < 1) return; if (Math.hypot(e.pos.x - c.x, e.pos.z - c.z) < c.r && Math.abs(e.pos.y - c.y) < 1.5) { c.cd.set(key, G.simT); fn(); c.r = Math.max(0, c.r - 0.5); } };
    if (!P.dead) touch(P, 'player', () => applyPotion(c.pot, 0.25)); for (const m of G.mobs) if (!m.dead && !m.isBoss) touch(m, m, () => applyPotion(c.pot, 0.25, m)); }
  G.potClouds = L.filter(c => c.life > 0 && c.r > 0.2);
}
{ const _ub = updateBoats; updateBoats = function (dt) { const r = _ub(dt); updatePotClouds(dt); return r; }; }
// tipped arrows: shoot them from a bow (off hand first, like Minecraft); the hit gives an eighth of the potion
function arrowSlot() { const order = [36, ...Array(36).keys()]; for (const i of order) { const s = player.inv[i]; if (s && (s.id === IT.arrow || s.id === IT.tipped_arrow)) return i; } return -1; }
{ const _cnt = countItem; countItem = function (id) { if (id === IT.arrow) return _cnt(IT.arrow) + _cnt(IT.tipped_arrow); return _cnt(id); }; }
// the bow takes the first arrows it finds: off hand first, then the hotbar and inventory (tipped ones too)
fireBow = function (eye, dir) {
  const p = bowPower(); S.bowDraw = -1; if (p < 0.1) return;
  let tip = null;
  if (S.mode !== 'creative') { const i = arrowSlot(); if (i < 0) return; const s = player.inv[i]; tip = s.id === IT.tipped_arrow ? s.pot : null;
    if (!(heldEnch('infinity') && s.id === IT.arrow)) { s.count--; if (!s.count) player.inv[i] = null; invDirty(); } }
  const pw = heldEnch('power'); const v = dir.clone().multiplyScalar(p * 60); v.x += player.vel.x; v.z += player.vel.z; if (!player.onGround) v.y += player.vel.y;
  const a = spawnProj('arrow', eye.clone().addScaledVector(dir, 0.3), v, 'player', 0);
  a.base = 2 + (pw ? 0.5 * pw + 0.5 : 0); a.crit = p >= 1; a.critR = Math.random(); a.dmg = arrowDamage(a); a.punch = heldEnch('punch'); a.flame = heldEnch('flame') > 0; a.life = 15; a.tip = tip; damageHeld(1);
  Sfx.play('bow', 0.5 + p * 0.6); S.bowKick = 1;
};
{ const _up = updateProjectiles; updateProjectiles = function (dt) {
    const live = G.projectiles.filter(a => a.tip && !a.done); const r = _up.apply(this, arguments);
    for (const a of live) if (a.done) { let best = null, bd = 2; for (const m of G.mobs) { if (m.dead || m.isBoss) continue; const d = new V3(m.pos.x, m.pos.y + m.h / 2, m.pos.z).distanceTo(a.pos) - m.hw; if (d < bd) { bd = d; best = m; } } if (best) applyPotion(a.tip, 0.125, best); }
    return r; }; }
// ---------- the brewing stand ----------
function getBrew(k) { world.brewing = world.brewing || new Map(); let b = world.brewing.get(k); if (!b) { b = { s: [null, null, null, null, null], fuel: 0, t: 0 }; world.brewing.set(k, b); } return b; }
function brewable(b) { const ing = b.s[3]; if (!ing) return false; const key = ITEMS[ing.id].key; return b.s.slice(0, 3).some(s => s && brewResult(s, key)); }
function updateBrewing(dt) {
  if (!world.brewing) return;
  for (const [k, b] of world.brewing) {
    if (b.fuel <= 0 && b.s[4] && b.s[4].id === IT.blaze_powder && brewable(b)) { b.fuel = 20; b.s[4].count--; if (!b.s[4].count) b.s[4] = null; if (S.brewKey === k) refreshBrewUI(); }
    if (b.fuel > 0 && brewable(b)) { b.t += dt; if (b.t >= 20) { b.t = 0; b.fuel--; const key = ITEMS[b.s[3].id].key; for (let i = 0; i < 3; i++) { const s = b.s[i]; if (!s) continue; const r = brewResult(s, key); if (r) b.s[i] = { id: r.id, count: 1, pot: r.pot }; } b.s[3].count--; if (!b.s[3].count) b.s[3] = null; if (key === 'dragon_breath' || true) { } const [x, y, z] = k.split(',').map(Number); Sfx.at('fizz', new V3(x, y, z), 0.5); if (S.brewKey === k) refreshBrewUI(); } }
    else b.t = 0;
  }
  if (S.brewKey && S.panel && S.panel.prog) { const b = world.brewing.get(S.brewKey); if (b) { S.panel.prog.style.height = (b.t / 20 * 100) + '%'; S.panel.fuelEl.style.width = (b.fuel / 20 * 100) + '%'; } }
}
{ const _uf = updateFurnaces; updateFurnaces = function (dt) { const r = _uf(dt); updateBrewing(dt); return r; }; }
function refreshBrewUI() { if (S.uiOpen === 'panel') renderInvUI(); }
function openBrewing(k) {
  const b = getBrew(k); S.brewKey = k;
  const pn = S.panel = { title: 'Brewing Stand', slots: b.s, output: -1, ghosts: [IT.glass_bottle, IT.glass_bottle, IT.glass_bottle, null, IT.blaze_powder], single: false,
    accept: (i, s) => i < 3 ? (s.id === IT.potion || s.id === IT.splash_potion || s.id === IT.lingering_potion || s.id === IT.glass_bottle) : i === 3 ? !!BREW_ING[ITEMS[s.id].key] : s.id === IT.blaze_powder,
    changed: () => { for (let i = 0; i < 3; i++) if (b.s[i] && b.s[i].count > 1) { const extra = b.s[i].count - 1; b.s[i].count = 1; giveOrDrop(b.s[i].id, extra, xtra(b.s[i])); } refreshBrewUI(); },
    onClose: () => { S.brewKey = null; },
    layout: (body) => { body.style.flexDirection = 'column'; body.style.alignItems = 'center'; body.style.gap = '4px';
      const top = document.createElement('div'); top.style.cssText = 'display:flex;align-items:center;gap:10px'; body.appendChild(top);
      const fuelBox = document.createElement('div'); fuelBox.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2px'; top.appendChild(fuelBox); makeSlot('panel', 4, fuelBox); const fb = document.createElement('div'); fb.style.cssText = 'width:40px;height:5px;background:#433'; fb.innerHTML = '<div style="height:100%;width:0;background:#e9a020"></div>'; fuelBox.appendChild(fb); pn.fuelEl = fb.firstChild;
      makeSlot('panel', 3, top); const pr = document.createElement('div'); pr.style.cssText = 'width:8px;height:40px;background:#555;display:flex;align-items:flex-end'; pr.innerHTML = '<div style="width:100%;height:0;background:#fff"></div>'; top.appendChild(pr); pn.prog = pr.firstChild;
      const row = document.createElement('div'); row.className = 'crow'; row.style.gap = '6px'; body.appendChild(row); for (let i = 0; i < 3; i++) makeSlot('panel', i, row); } };
  openUI('panel'); Sfx.play('click', 0.5);
}
{ const _rm = onBlockRemoved; onBlockRemoved = function (x, y, z, id) { const r = _rm(x, y, z, id); if (id === B.BREWING_STAND && world.brewing) { const k = x + ',' + y + ',' + z; const b = world.brewing.get(k); if (b) for (const s of b.s) if (s) dropItem(s.id, s.count, x + 0.5, y + 0.5, z + 0.5, false, xtra(s)); world.brewing.delete(k); } return r; }; }
{ const _pw = packWorld; packWorld = function (w) { const r = _pw(w); if (w.brewing && w.brewing.size) r.brewing = Object.fromEntries(w.brewing); return r; };
  const _uw = unpackWorld; unpackWorld = function (w, d) { const r = _uw(w, d); if (d && d.brewing) w.brewing = new Map(Object.entries(d.brewing)); return r; }; }
// ---------- nether wart: grows on soul sand ----------
{ const _rt = randomTicks; let acc = 0; randomTicks = function (dt) { const r = _rt(dt); acc += dt; if (acc < 1) return r; acc = 0;
    if (!world.wartSpots) return r; for (const k of [...world.wartSpots]) { const [x, y, z] = k.split(',').map(Number); if (!world.loaded(x, z)) continue; const id = world.get(x, y, z); if (id !== B.NETHER_WART_0) { world.wartSpots.delete(k); continue; } if (Math.random() < 0.012) { world.set(x, y, z, B.NETHER_WART_1); mpBlock(x, y, z, B.NETHER_WART_1); world.wartSpots.delete(k); } }
    return r; }; }
{ const _ws = World.prototype.set; World.prototype.set = function (x, y, z, id) { const r = _ws.apply(this, arguments); if (id === B.NETHER_WART_0) { this.wartSpots = this.wartSpots || new Set(); this.wartSpots.add(x + ',' + y + ',' + z); } return r; }; }
for (const t of ['fortress']) if (LOOT[t]) LOOT[t].push(['nether_wart', 3, 7, 0.6]);
// ---------- end crystals you can place (on obsidian or bedrock; they explode when hit) ----------
class PlacedCrystal extends Crystal {
  constructor(x, y, z) { super({ i: -1, x, z, top: y - 2 }); this.placed = true; this.pos.set(x + 0.5, y, z + 0.5); }
  hurt() { if (this.dead) return; this.dead = true; this.gone = true; explode(this.pos.x, this.pos.y + 0.8, this.pos.z, 6, this, { cause: 'an End Crystal' }); }
}
function placeEndCrystal(x, y, z) {
  if (world.get(x, y, z) || world.get(x, y + 1, z)) return false; if (G.mobs.some(m => !m.dead && Math.abs(m.pos.x - x - 0.5) < 1 && Math.abs(m.pos.z - z - 0.5) < 1 && Math.abs(m.pos.y - y) < 2)) return false;
  const c = new PlacedCrystal(x, y, z); G.mobs.push(c); Sfx.play('glass', 0.4, 1.4); (world.placedCrystals = world.placedCrystals || []).push(c);
  if (world.dim === 'end' && S.dragonDead && typeof tryRespawnDragon === 'function') tryRespawnDragon();
  return true;
}
// crafting tipped arrows keeps the lingering potion's effect
function craftExtra(r) { if (r && r.out[0] === 'tipped_arrow') { const L = craftGrid.find(s => s && s.id === IT.lingering_potion); return L && L.pot ? { pot: L.pot } : null; } return null; }

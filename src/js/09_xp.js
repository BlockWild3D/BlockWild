// ================= EXPERIENCE + ENCHANTING (Minecraft rules) =================
const XP = { level: 0, points: 0 };
function xpToNext(L) { return L < 16 ? 2 * L + 7 : L < 31 ? 5 * L - 38 : 9 * L - 158; }
function xpTotal() { let t = XP.points; for (let l = 0; l < XP.level; l++) t += xpToNext(l); return t; }
function addXP(n) {
  if (!n) return; const before = XP.level; XP.points += n;
  while (XP.points >= xpToNext(XP.level)) { XP.points -= xpToNext(XP.level); XP.level++; }
  while (XP.points < 0 && XP.level > 0) { XP.level--; XP.points += xpToNext(XP.level); }
  if (XP.points < 0) XP.points = 0;
  if (XP.level > before && (XP.level % 5 === 0 || XP.level - before > 0)) Sfx.play(XP.level % 5 === 0 ? 'levelup' : 'orb', 0.7);
  renderXP();
}
function setLevel(L, pts) { XP.level = Math.max(0, L | 0); XP.points = Math.max(0, Math.min(pts || 0, xpToNext(XP.level) - 1)); renderXP(); }
function renderXP() {
  const surv = S.mode === 'survival'; $('xpRow').style.visibility = surv ? 'visible' : 'hidden';
  $('xpBar').firstChild.style.width = (XP.points / xpToNext(XP.level) * 100).toFixed(1) + '%'; $('xpLevel').textContent = XP.level > 0 ? XP.level : '';
}
// ---- orbs ----
const orbTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'); const g = x.createRadialGradient(8, 8, 1, 8, 8, 7); g.addColorStop(0, '#fffbb0'); g.addColorStop(0.45, '#b8f040'); g.addColorStop(0.8, '#3e8a10'); g.addColorStop(1, 'rgba(40,90,10,0)'); x.fillStyle = g; x.fillRect(0, 0, 16, 16); const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t; })();
const orbMat = new THREE.SpriteMaterial({ map: orbTex, transparent: true, depthWrite: false, fog: true });
G.orbs = [];
function spawnOrb(x, y, z, value) {
  // Minecraft splits experience into orbs of fixed sizes
  const sizes = [2477, 1237, 617, 307, 149, 73, 37, 17, 7, 3, 1];
  while (value > 0 && G.orbs.length < 120) {
    const v = sizes.find(s => s <= value) || value; value -= v;
    const sp = new THREE.Sprite(orbMat); const sc = 0.18 + Math.min(0.25, Math.log2(v + 1) * 0.04); sp.scale.setScalar(sc); G.scene.add(sp);
    G.orbs.push({ pos: new V3(x, y, z), vel: new V3((Math.random() - 0.5) * 3, 2.5 + Math.random() * 2, (Math.random() - 0.5) * 3), hw: 0.12, h: 0.24, value: v, age: 0, mesh: sp });
  }
}
function spawnOrbRange(x, y, z, a, b) { const n = a + Math.floor(Math.random() * (b - a + 1)); if (n > 0) spawnOrb(x, y, z, n); }
function updateOrbs(dt) {
  const P = player, c = new V3(P.pos.x, P.pos.y + 0.9, P.pos.z);
  for (const o of G.orbs) {
    o.age += dt; const d = o.pos.distanceTo(c);
    if (d < 8 && !P.dead && o.age > 0.4) { const dir = c.clone().sub(o.pos).normalize(); const f = (1 - d / 8) ** 2 * 60; o.vel.addScaledVector(dir, f * dt); o.vel.multiplyScalar(Math.exp(-dt * 2)); }
    else { o.vel.y -= 16 * dt; o.vel.x *= Math.exp(-dt * 2); o.vel.z *= Math.exp(-dt * 2); }
    if (d < 8 && o.age > 0.4 && !P.dead) o.pos.addScaledVector(o.vel, dt); else moveEntity(o, dt); o.mesh.position.set(o.pos.x, o.pos.y + 0.12 + Math.sin(o.age * 4) * 0.04, o.pos.z);
    if (d < 1.1 && !P.dead && o.age > 0.4) { o.gone = true; addXP(o.value); Sfx.play('orb', 0.35); }
    if (o.age > 300) o.gone = true;
  }
  for (const o of G.orbs) if (o.gone) G.scene.remove(o.mesh);
  G.orbs = G.orbs.filter(o => !o.gone);
}
function clearOrbs() { for (const o of G.orbs) G.scene.remove(o.mesh); G.orbs = []; }
// Minecraft experience values
const MOB_XP = { pig: [1, 3], cow: [1, 3], sheep: [1, 3], chicken: [1, 3], villager: [0, 0], zombie: [5, 5], skeleton: [5, 5], spider: [5, 5], creeper: [5, 5], enderman: [5, 5], ghast: [5, 5], blaze: [10, 10], magma_cube: [1, 4], zombified_piglin: [5, 5], piglin: [5, 5], hoglin: [5, 5], wither_skeleton: [5, 5], strider: [1, 3] };
const ORE_XP = { coal_ore: [0, 2], diamond_ore: [3, 7], lapis_ore: [2, 5], quartz_ore: [2, 5], nether_gold_ore: [0, 1] };
const SMELT_XP = { iron_ingot: 0.7, gold_ingot: 1, glass: 0.1, stone: 0.1, cooked_pork: 0.35, steak: 0.35, cooked_chicken: 0.35, brick: 0.3, nether_brick: 0.1 };

// ---- enchantments ----
const UNDEAD = new Set(['zombie', 'skeleton', 'wither_skeleton', 'zombified_piglin']);
const ENCH = {
  sharpness: { name: 'Sharpness', max: 5, for: 'sword', excl: 'dmg', w: 10 }, smite: { name: 'Smite', max: 5, for: 'sword', excl: 'dmg', w: 5 }, bane_of_arthropods: { name: 'Bane of Arthropods', max: 5, for: 'sword', excl: 'dmg', w: 5 },
  knockback: { name: 'Knockback', max: 2, for: 'sword', w: 5 }, fire_aspect: { name: 'Fire Aspect', max: 2, for: 'sword', w: 2 }, looting: { name: 'Looting', max: 3, for: 'sword', w: 2 },
  efficiency: { name: 'Efficiency', max: 5, for: 'pick', w: 10 }, fortune: { name: 'Fortune', max: 3, for: 'pick', excl: 'drop', w: 2 }, silk_touch: { name: 'Silk Touch', max: 1, for: 'pick', excl: 'drop', w: 1 },
  power: { name: 'Power', max: 5, for: 'bow', w: 10 }, punch: { name: 'Punch', max: 2, for: 'bow', w: 2 }, flame: { name: 'Flame', max: 1, for: 'bow', w: 2 }, infinity: { name: 'Infinity', max: 1, for: 'bow', w: 1 },
};
function enchCat(id) { const it = ITEMS[id]; if (!it) return null; if (it.kind === 'bow') return 'bow'; if (it.kind === 'tool') return it.tool === 'sword' ? 'sword' : 'pick'; return null; }
function enchantFits(id, en) { return ENCH[en] && ENCH[en].for === enchCat(id); }
function enchOf(s, en) { return s && s.ench ? (s.ench[en] || 0) : 0; }
function heldEnch(en) { return enchOf(player.held(), en); }
function enchLines(s) { if (!s || !s.ench) return ''; return Object.keys(s.ench).map(k => (ENCH[k] ? ENCH[k].name : k) + ' ' + roman(s.ench[k])).join('\n'); }
function enchantability(id) { const k = ITEMS[id].key; if (k.startsWith('wood')) return 15; if (k.startsWith('stone')) return 5; if (k.startsWith('iron')) return 14; if (k.startsWith('diamond')) return 10; if (k === 'bow') return 1; return 10; }
// pick enchantments like Minecraft: modified level from cost + enchantability, then weighted picks
function rollEnchants(id, cost, seed) {
  const r = mulberry32(seed); const cat = enchCat(id); if (!cat) return [];
  const e = enchantability(id); let lvl = cost + 1 + Math.floor(r() * (e / 4 + 1)) + Math.floor(r() * (e / 4 + 1)); lvl = Math.max(1, Math.round(lvl * (1 + (r() + r() - 1) * 0.15)));
  const pool = Object.keys(ENCH).filter(k => (ENCH[k].for === cat || ENCH[k].for === '*') && (!ENCH[k].slot || ITEMS[id].slot === ENCH[k].slot)).map(k => ({ k, l: Math.max(1, Math.min(ENCH[k].max, Math.ceil(lvl / (ENCH[k].max === 1 ? 99 : 31 / ENCH[k].max) ))), w: ENCH[k].w }));
  const out = []; const pick = () => { const tot = pool.reduce((s, p) => s + p.w, 0); if (!tot) return null; let q = r() * tot; for (const p of pool) { q -= p.w; if (q <= 0) return p; } return pool[0]; };
  let p = pick(); while (p) { out.push([p.k, p.l]); const ex = ENCH[p.k].excl; for (let i = pool.length - 1; i >= 0; i--) if (pool[i].k === p.k || (ex && ENCH[pool[i].k].excl === ex)) pool.splice(i, 1); if (r() > (lvl + 1) / 50) break; lvl = Math.floor(lvl / 2); p = pick(); }
  return out;
}
// ---- enchanting table UI ----
let enchState = null; S.enchSeed = (Math.random() * 1e9) | 0;
function countShelves(x, y, z) {
  let n = 0;
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) { if (Math.abs(dx) < 2 && Math.abs(dz) < 2) continue;
    for (let dy = 0; dy <= 1; dy++) if (world.get(x + dx, y + dy, z + dz) === B.BOOKSHELF) { const mx = x + Math.sign(dx) * (Math.abs(dx) > 1 ? 1 : 0), mz = z + Math.sign(dz) * (Math.abs(dz) > 1 ? 1 : 0); if (!world.get(mx, y + dy, mz) && !world.get(mx, y + 1, mz)) n++; } }
  return Math.min(15, n);
}
function enchCosts() {
  const s = enchState.s[0]; if (!s || !enchCat(s.id) || s.ench) return [0, 0, 0];
  const b = enchState.shelves; const r = mulberry32(S.enchSeed ^ s.id); const base = 1 + Math.floor(r() * 8) + Math.floor(b / 2) + Math.floor(r() * (b + 1));
  return [Math.max(Math.floor(base / 3), 1), Math.floor(base * 2 / 3) + 1, Math.max(base, b * 2)];
}
function renderEnch() {
  if (!enchState) return; for (let i = 0; i < 2; i++) paintSlot(slotEls.ench[i], enchState.s[i]);
  const costs = enchCosts(); const s = enchState.s[0], lap = enchState.s[1];
  [...document.querySelectorAll('.eopt')].forEach((b, i) => {
    const c = costs[i]; if (!c) { b.disabled = true; b.innerHTML = '<span></span><span></span>'; return; }
    const hint = rollEnchants(s.id, c, S.enchSeed ^ s.id ^ (i * 7919))[0]; const need = i + 1;
    const can = S.mode === 'creative' || (XP.level >= c && lap && lap.count >= need);
    b.disabled = !can; b.innerHTML = '<span>' + (hint ? ENCH[hint[0]].name + ' ' + roman(hint[1]) + ' . . . ?' : '') + '</span><span><b>' + c + '</b> · ' + need + ' lapis</span>';
  });
  $('enchInfo').textContent = enchState.shelves + ' bookshelves nearby (max 15)';
}
function doEnchant(i) {
  const costs = enchCosts(); const c = costs[i]; const s = enchState.s[0]; const lap = enchState.s[1]; if (!c || !s) return;
  if (S.mode !== 'creative') { if (XP.level < c || !lap || lap.count < i + 1) return; lap.count -= i + 1; if (!lap.count) enchState.s[1] = null; setLevel(XP.level - (i + 1), XP.points); }
  const list = rollEnchants(s.id, c, S.enchSeed ^ s.id ^ (i * 7919)); s.ench = {}; for (const [k, l] of list) s.ench[k] = l;
  S.enchSeed = (Math.random() * 1e9) | 0; Sfx.play('levelup', 0.6); invDirty(); renderInvUI();
}
for (const b of document.querySelectorAll('.eopt')) b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (!b.disabled) doEnchant(+b.dataset.i); });

// ---- hooks into the rest of the game ----
// mobs: remember player hits, burn from Fire Aspect / Flame, experience + Looting on death
const _mobHurt = Mob.prototype.hurt;
Mob.prototype.hurt = function (dmg, src, kb, noAnger) { if (src && player && src === player.pos) this.playerHitT = performance.now(); return _mobHurt.call(this, dmg, src, kb, noAnger); };
const _mobUpdate = Mob.prototype.update;
Mob.prototype.update = function (dt) {
  if (this.burnT > 0 && !this.dead) { this.burnT -= dt; this.burnAcc = (this.burnAcc || 0) + dt; if (Math.random() < dt * 14) Particles.emit(this.pos.x + (Math.random() - 0.5) * this.hw * 2, this.pos.y + Math.random() * this.h, this.pos.z + (Math.random() - 0.5) * this.hw * 2, 1, [[1, 0.6, 0.1], [1, 0.85, 0.3]], 0.6, 0.4, -3, 0.25);
    if (this.burnAcc >= 1) { this.burnAcc = 0; if (!['blaze', 'magma_cube', 'ghast', 'strider', 'wither_skeleton', 'zombified_piglin'].includes(this.type)) this.hurt(1, null, 0, true); } }
  return _mobUpdate.call(this, dt);
};
const _dropLoot = Mob.prototype.dropLoot;
Mob.prototype.dropLoot = function () {
  const byPlayer = this.playerHitT && performance.now() - this.playerHitT < 5000; Sfx.mob(this, 'death', 0.8);
  if (byPlayer && this.lootingLv) { const t = this.t; const saved = t.drops; t.drops = saved.map(([k, a, b, p]) => [k, a, b + this.lootingLv, Math.min(1, p + 0.01 * this.lootingLv)]); _dropLoot.call(this); t.drops = saved; } else _dropLoot.call(this);
  const xr = MOB_XP[this.type]; if (byPlayer && xr) spawnOrbRange(this.pos.x, this.pos.y + 0.5, this.pos.z, xr[0], xr[1] * (this.type === 'magma_cube' ? (this.size || 1) : 1));
};
// melee bonus from enchantments (called from the attack code)
function meleeBonus(mob) {
  const h = player.held(); let dmg = 0; const sh = enchOf(h, 'sharpness'), sm = enchOf(h, 'smite'), ba = enchOf(h, 'bane_of_arthropods');
  if (sh) dmg += 0.5 * sh + 0.5; if (sm && UNDEAD.has(mob.type)) dmg += 2.5 * sm; if (ba && mob.type === 'spider') dmg += 2.5 * ba;
  dmg += effLevel('strength') * 3; if (effLevel('weakness')) dmg -= 4;
  const fa = enchOf(h, 'fire_aspect'); if (fa) mob.burnT = 4 * fa;
  mob.lootingLv = enchOf(h, 'looting');
  return { dmg, kb: 1 + 0.6 * enchOf(h, 'knockback') };
}
// mining drops: Fortune and Silk Touch
const FORTUNE_ORES = new Set(['coal_ore', 'diamond_ore', 'lapis_ore', 'quartz_ore', 'nether_gold_ore', 'glowstone']);
function enchantedDrop(id, dr) {
  const h = player.held(); const key = BL[id].key;
  if (enchOf(h, 'silk_touch') && ITEMS[id] && !BL[id].hidden && BL[id].hardness >= 0 && (!dr || dr[0] !== id)) return [id, 1];
  const fo = enchOf(h, 'fortune'); if (fo && dr && FORTUNE_ORES.has(key)) { const m = Math.max(0, Math.floor(Math.random() * (fo + 2)) - 1) + 1; return [dr[0], dr[1] * m]; }
  return dr;
}
function oreXP(id, x, y, z) { if (S.mode !== 'survival' || enchOf(player.held(), 'silk_touch')) return; const r = ORE_XP[BL[id].key]; if (r) spawnOrbRange(x + 0.5, y + 0.5, z + 0.5, r[0], r[1]); }

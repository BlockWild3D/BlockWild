// ================= HUNGER (Minecraft rules) =================
// 20 food points (10 drumsticks) plus hidden saturation (starts at 5, never above the food level). Actions add
// exhaustion; every 4 exhaustion takes 1 saturation, or 1 food point once saturation is gone:
//   sprinting 0.1 per block, swimming 0.01 per block, jumping 0.05, sprint-jumping 0.2, attacking 0.1, taking damage 0.1,
//   breaking a block 0.005, healing 1 health 6.
// Healing: with a full bar and saturation left, 1 health every 0.5 s; with 18 or more food, 1 health every 4 s.
// Starving at 0 food: 1 damage every 4 s, down to 10 health on Easy, 1 on Normal, and to death on Hard.
// You can't sprint with 6 food or less. Peaceful refills hunger. Eating takes 1.6 s of holding use.
const FOOD = { // [food points, saturation, effect chance list]
  apple: [4, 2.4], bread: [5, 6], raw_pork: [3, 1.8], cooked_pork: [8, 12.8], raw_beef: [3, 1.8], steak: [8, 12.8],
  raw_chicken: [2, 1.2, [['hunger', 30, 0, 0.3]]], cooked_chicken: [6, 7.2], rotten_flesh: [4, 0.8, [['hunger', 30, 0, 0.8]]],
  golden_apple: [4, 9.6, [['regeneration', 5, 1, 1], ['absorption', 120, 0, 1]], true],
  carrot: [3, 3.6], potato: [1, 0.6], baked_potato: [5, 6], golden_carrot: [6, 14.4], milk_bucket: [0, 0, null, true],
};
for (const k in FOOD) if (IT[k] !== undefined) { const it = ITEMS[IT[k]]; it.kind = 'food'; it.food = FOOD[k][0]; it.sat = FOOD[k][1]; it.eatFx = FOOD[k][2] || null; it.alwaysEat = !!FOOD[k][3]; }
Object.assign(EFFECTS, { hunger: 'Hunger', saturation: 'Saturation', absorption: 'Absorption' });
player.food = 20; player.sat = 5; player.exh = 0; player.absorb = 0;
const H = { regenT: 0, starveT: 0, lastPos: null, wasGround: true, eatT: 0, eatSnd: 0 };
const hungerOn = () => isSurv() && !player.dead;
function exhaust(v) { if (!hungerOn() || S.difficulty === 'peaceful') return; player.exh += v; while (player.exh >= 4) { player.exh -= 4; if (player.sat > 0) player.sat = Math.max(0, player.sat - 1); else player.food = Math.max(0, player.food - 1); } }
// drumstick icons: 0 empty, 1 half, 2 full; green ones while you have the Hunger effect
function foodURL(kind, sick) {
  const c = document.createElement('canvas'); c.width = c.height = 9; const x = c.getContext('2d');
  const M = ['000001110', '000011111', '000111111', '001111111', '011111110', '011111100', '110111000', '111000000', '010000000'];
  for (let y = 0; y < 9; y++) for (let i = 0; i < 9; i++) if (M[y][i] === '1') {
    const edge = y === 0 || M[y - 1][i] !== '1' || i === 0 || M[y][i - 1] !== '1' || i === 8 || M[y][i + 1] !== '1' || y === 8 || M[y + 1][i] !== '1';
    const bone = (y >= 6 && i <= 2); const filled = kind === 2 || (kind === 1 && i >= 4);
    let col = edge ? '#1c0f04' : '#3a2410';
    if (!edge && filled) col = bone ? '#e8e2d4' : sick ? ((y + i) % 3 ? '#7a9a2a' : '#5a7a1a') : ((y === 2 && i === 5) ? '#f0b070' : (y + i) % 3 ? '#c66a24' : '#a04c14');
    else if (!edge && bone && kind === 0) col = '#3a2410';
    x.fillStyle = col; x.fillRect(i, y, 1, 1);
  }
  return c.toDataURL();
}
const FOOD_ICON = [foodURL(0), foodURL(1), foodURL(2)], FOOD_ICON_SICK = [foodURL(0, true), foodURL(1, true), foodURL(2, true)];
const foodImgs = []; for (let i = 0; i < 10; i++) { const im = document.createElement('img'); $('foodRow').appendChild(im); foodImgs.push(im); }
let foodShown = -1;
function renderFood() {
  const vis = isSurv() && !(player.riding && player.riding.hg); $('foodRow').style.visibility = vis ? 'visible' : 'hidden'; if (!vis) return;
  const sick = !!effLevel('hunger') || (player.effects && player.effects.hunger); const key = player.food * 2 + (sick ? 1 : 0); if (key === foodShown && !(player.food <= 6 && player.sat <= 0)) return; foodShown = key;
  const I = sick ? FOOD_ICON_SICK : FOOD_ICON; const shake = player.sat <= 0 && player.food <= 6;
  for (let i = 0; i < 10; i++) { const v = player.food - i * 2; foodImgs[i].src = I[v >= 2 ? 2 : v === 1 ? 1 : 0]; foodImgs[i].style.transform = shake && Math.random() < 0.3 ? 'translateY(' + (Math.random() < 0.5 ? -2 : 2) + 'px)' : ''; }
}
// absorption hearts (golden apples): extra golden hearts used up before health
{ const absImgs = []; for (let i = 0; i < 2; i++) { const im = document.createElement('img'); im.className = 'absorb'; $('hearts').appendChild(im); absImgs.push(im); }
  const _uh = updateHearts; updateHearts = function () { _uh.apply(this, arguments); const a = Math.ceil(player.absorb || 0); for (let i = 0; i < 2; i++) { const v = a - i * 2; absImgs[i].style.display = a > i * 2 && isSurv() ? '' : 'none'; absImgs[i].src = GOLD_HEART[v >= 2 ? 2 : v === 1 ? 1 : 0]; } renderFood(); }; }
{ const _hurt = Player.prototype.hurt; Player.prototype.hurt = function (dmg, src, cause, kb) {
    const A = this.absorb || 0; const h0 = this.health; const cd = this.hurtCD;
    if (A > 0 && isSurv()) this.health = h0 + A;
    const r = _hurt.call(this, dmg, src, cause, kb);
    if (A > 0 && isSurv()) { if (this.dead) this.absorb = 0; else { const lost = h0 + A - this.health; if (lost <= A) { this.absorb = A - lost; this.health = h0; } else { this.absorb = 0; this.health = h0 - (lost - A); } } updateHearts(); }
    if (this.hurtCD > cd || this.health < h0) exhaust(0.1);
    return r; }; }
// effects that act on hunger
{ const _ge = giveEffect; giveEffect = function (name, sec, amp) {
    if (name === 'saturation') { player.food = Math.min(20, player.food + amp + 1); player.sat = Math.min(player.food, player.sat + 2 * (amp + 1)); renderFood(); return; }
    if (name === 'absorption') { player.absorb = Math.max(player.absorb || 0, 4 * (amp + 1)); updateHearts(); }
    return _ge.apply(this, arguments); }; }

// ---- every frame ----
function updateHunger(dt) {
  const P = player; if (!world) return;
  if (!hungerOn()) { H.lastPos = null; renderFood(); return; }
  // peaceful: hunger refills and health comes back quickly
  if (S.difficulty === 'peaceful') { H.regenT += dt; if (H.regenT >= 1) { H.regenT = 0; if (P.food < 20) P.food++; if (P.health < 20) { P.health = Math.min(20, P.health + 1); updateHearts(); } } renderFood(); return; }
  // movement exhaustion
  if (H.lastPos && !P.riding && !P.flying) { const d = Math.hypot(P.pos.x - H.lastPos.x, P.pos.z - H.lastPos.z); if (d < 4) { if (P.swimming || inWater(P, 0.4)) exhaust(0.01 * d); else if (P.sprinting && P.onGround) exhaust(0.1 * d); } }
  H.lastPos = P.pos.clone();
  if (H.wasGround && !P.onGround && P.vel.y > 3 && !inWater(P, 0.4) && !P.riding) exhaust(P.sprinting ? 0.2 : 0.05); H.wasGround = P.onGround;
  if (effLevel('hunger')) exhaust(0.1 * effLevel('hunger') * dt * 1); // Minecraft: 0.005 per tick per level
  // healing and starving
  if (S.rules.naturalRegeneration && P.health < 20 && P.food >= 18) {
    H.regenT += dt; const fast = P.food >= 20 && P.sat > 0; const every = fast ? 0.5 : 4;
    if (H.regenT >= every) { H.regenT = 0; if (fast) { const use = Math.min(P.sat, 6); P.health = Math.min(20, P.health + use / 6); exhaust(use); } else { P.health = Math.min(20, P.health + 1); exhaust(6); } updateHearts(); }
  } else H.regenT = 0;
  if (P.food <= 0) { H.starveT += dt; if (H.starveT >= 4) { H.starveT = 0; const floor = S.difficulty === 'easy' ? 10 : S.difficulty === 'normal' ? 1 : 0; if (P.health > floor) { P.hurtCD = 0; P.hurt(1, null, 'starvation', 0); } } } else H.starveT = 0;
  renderFood();
}
// ---- eating: hold use with food for 1.6 s ----
function updateEating(dt) {
  const P = player; const h = P.held(); const it = h && ITEMS[h.id];
  const can = it && it.kind === 'food' && mouseR && !S.uiOpen && !P.dead && S.mode !== 'spectator' && (S.mode === 'creative' || P.food < 20 || it.alwaysEat || S.difficulty === 'peaceful') && !(targetBoat) && !(targetMob && typeof mobWantsItem === 'function' && mobWantsItem(targetMob, h.id)) && !(it.crop && target && target.id === B.FARMLAND && target.ny > 0 && !world.get(target.x, target.y + 1, target.z));
  if (!can) { H.eatT = 0; S.eating = 0; return; }
  H.eatT += dt; S.eating = Math.min(1, H.eatT / 1.6); H.eatSnd -= dt;
  if (H.eatSnd <= 0 && H.eatT > 0.25) { H.eatSnd = 0.22; Sfx.play('eat', 0.5 + Math.random() * 0.2); const e = P.eye(), d = lookDir(); Particles.emit(e.x + d.x * 0.45, e.y - 0.25, e.z + d.z * 0.45, 4, [[0.75, 0.5, 0.35], [0.6, 0.35, 0.2]], 1.4, 0.4, 12, 0.15); }
  if (H.eatT >= 1.6) {
    H.eatT = 0; S.eating = 0; mouseR = false;
    if (isSurv()) { P.food = Math.min(20, P.food + it.food); P.sat = Math.min(P.food, P.sat + it.sat); }
    for (const [ef, sec, amp, chance] of it.eatFx || []) if (Math.random() < chance) giveEffect(ef, sec, amp);
    if (h.id === IT.milk_bucket) { player.effects = {}; if (typeof renderEffects === 'function') renderEffects(); if (S.mode !== 'creative') { player.inv[player.sel] = { id: IT.bucket, count: 1 }; invDirty(); } } else useHeld(1);
    Sfx.play('pop', 0.5, 0.8); renderFood(); S.useCD = 0.3;
  }
}
{ const _ui = updateInteraction; updateInteraction = function (dt) { const r = _ui.apply(this, arguments); updateEating(dt); return r; }; }
{ const _up = updatePlayer; updatePlayer = function (dt) { const r = _up.apply(this, arguments); updateHunger(dt); return r; }; }
// mining and attacking cost a little hunger
{ const _bb = breakBlock; breakBlock = function () { exhaust(0.005); return _bb.apply(this, arguments); }; }
{ const _mh = Mob.prototype.hurt; Mob.prototype.hurt = function (dmg, src) { if (src === player.pos) exhaust(0.1); return _mh.apply(this, arguments); }; }
// death and respawn reset hunger
{ const _die = Player.prototype.die; Player.prototype.die = function () { const r = _die.apply(this, arguments); this.absorb = 0; return r; }; }
{ const btn = $('btnRespawn'); btn.addEventListener('click', () => { player.food = 20; player.sat = 5; player.exh = 0; player.absorb = 0; renderFood(); }); }
// save and load
{ const _sw = startWorld; startWorld = function (data) { const r = _sw.apply(this, arguments); const p = data && data.player; player.food = p && p.food != null ? p.food : 20; player.sat = p && p.sat != null ? p.sat : 5; player.exh = p && p.exh || 0; player.absorb = p && p.absorb || 0; foodShown = -1; renderFood(); return r; }; }

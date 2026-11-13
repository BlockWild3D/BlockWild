// ================= DURABILITY (Minecraft values) + ITEM TOOLTIPS =================
const TIER_DUR = { 1: 59, 2: 131, 3: 250, 4: 1561, 5: 2031 };
const ARMOR_BASE = { head: 11, chest: 16, legs: 15, feet: 13 }, ARMOR_MULT = { leather: 5, golden: 7, iron: 15, diamond: 33, netherite: 37, chainmail: 15 };
for (const id of ITEM_IDS) { const it = ITEMS[id];
  if (it.kind === 'tool') it.dur = it.dur || TIER_DUR[it.tier] || 250;
  if (it.kind === 'tool' && it.gold) it.dur = 32;
  else if (it.kind === 'bow') it.dur = 384; else if (it.kind === 'shield') it.dur = 336; else if (it.kind === 'fns') it.dur = 64;
  else if (it.kind === 'armor') it.dur = ARMOR_BASE[it.slot] * (ARMOR_MULT[it.mat] || 15); }
ENCH.unbreaking = { name: 'Unbreaking', max: 3, for: '*', w: 5 };
const _rollE = rollEnchants; // let Unbreaking roll for every enchantable item
enchantFits = ((f) => (id, en) => (ENCH[en] && ENCH[en].for === '*' && enchCat(id)) ? true : f(id, en))(enchantFits);
function maxDur(id) { return (ITEMS[id] && ITEMS[id].dur) || 0; }
// damage the item in an inventory slot; returns true if it broke
function damageSlot(idx, amount = 1) {
  if (!isSurv()) return false; const s = player.inv[idx]; if (!s) return false; const max = maxDur(s.id); if (!max) return false;
  const ub = enchOf(s, 'unbreaking'); let used = 0;
  for (let i = 0; i < amount; i++) { const keep = ITEMS[s.id].kind === 'armor' ? 0.6 + 0.4 / (ub + 1) : 1 / (ub + 1); if (Math.random() < keep) used++; }
  s.dmg = (s.dmg || 0) + used; invDirty();
  if (s.dmg >= max) { player.inv[idx] = null; Sfx.play('glass_break', 0.6, 1.4); const e = player.eye(); Particles.emit(e.x, e.y - 0.4, e.z, 14, [[0.7, 0.7, 0.7], [0.5, 0.4, 0.3]], 2, 0.5, 8, 0.3); toast(ITEMS[s.id].name + ' broke!', 1.5); return true; }
  return false;
}
function damageHeld(amount = 1) { return damageSlot(handSlot(), amount); }
// tooltip text in Minecraft's style
const ATK_SPEED = { sword: 1.6, pick: 1.2, hoe: 2, axe: 0.9, shovel: 1.0 };
function itemTooltip(s) {
  const it = ITEMS[s.id]; const L = [it.name];
  if (s.ench) L.push(enchLines(s));
  if (it.kind === 'tool') { L.push('', 'When in Main Hand:', ' ' + (it.dmg) + ' Attack Damage', ' ' + (it.atk || ATK_SPEED[it.tool] || 1) + ' Attack Speed'); if (it.tool !== 'sword') L.push(' Mining speed ' + it.speed + 'x on ' + { pick: 'stone and ores', axe: 'wood', shovel: 'dirt, sand, gravel and snow', hoe: 'leaves, hay and wart' }[it.tool]); if (it.tool === 'pick') L.push(' Can harvest ' + ['', 'stone, coal', 'iron, lapis', 'gold, diamond', 'obsidian'].slice(1, it.tier + 1).join(', ')); }
  if (it.kind === 'block' && typeof blockToolLine === 'function') { const t = blockToolLine(s.id); if (t) L.push('', t); }
  if (it.kind === 'armor') { L.push('', 'When on ' + { head: 'Head', chest: 'Body', legs: 'Legs', feet: 'Feet' }[it.slot] + ':', ' +' + it.def + ' Armor' + (it.tough ? ', +' + it.tough + ' Armor Toughness' : '')); }
  if (it.kind === 'bow') L.push('', 'Arrow damage up to ' + Math.round(10 * (enchOf(s, 'power') ? 1 + 0.25 * (enchOf(s, 'power') + 1) : 1)));
  if (it.kind === 'food') L.push('', 'Restores ' + (it.heal / 2) + ' hearts');
  const max = maxDur(s.id); if (max) L.push('Durability: ' + (max - (s.dmg || 0)) + ' / ' + max);
  return L.join('\n');
}

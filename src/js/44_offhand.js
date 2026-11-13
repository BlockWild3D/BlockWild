// ================= OFF HAND (Minecraft) =================
// Right-click tries the main hand first; if what you hold there has nothing to do (a sword, a mace, a pickaxe, an
// ingot, an empty hand, food when you are full...), the item in your off hand is used instead: place its blocks, eat
// its food, throw wind charges, ender pearls or eggs, fire rockets while gliding, pour buckets, and so on.
// Holding a mace with wind charges in the off hand is the classic combo: throw a charge down, launch, smash.
const MAIN_PASS = new Set(['mat', 'tool', 'mace', 'ebook', 'template', 'key', 'horse_armor', 'totem', 'seed']);
function mainHandHasUse() {
  const h = player.inv[player.sel]; if (!h) return false; const d = ITEMS[h.id]; if (!d) return false;
  if (d.kind === 'tool' && d.tool === 'spear') return true;
  if (d.kind === 'tool' && (d.tool === 'hoe' || d.tool === 'shovel' || d.tool === 'axe') && target) return true; // tilling, paths, stripping
  if (d.kind === 'food') return S.mode === 'creative' || player.food < 20 || !!d.alwaysEat || S.difficulty === 'peaceful';
  if (d.kind === 'seed' || d.crop) return !!(target && target.id === B.FARMLAND);
  if (d.kind === 'shears' || d.kind === 'lead' || d.kind === 'name_tag' || d.kind === 'saddle') return !!targetMob;
  if (d.kind === 'bonemeal') return !!target;
  return !MAIN_PASS.has(d.kind);
}
function offhandShouldUse() {
  const off = player.inv[36]; if (!off || player.dead || S.uiOpen) return false; const od = ITEMS[off.id]; if (!od || od.kind === 'shield' || od.kind === 'totem') return false;
  if (target && !kd('sneak') && BL[target.id].use) return false; // opening a chest etc. is a main-hand thing
  if (targetMob && player.inv[player.sel]) return false;
  return !mainHandHasUse();
}
{ const _ui = updateInteraction; updateInteraction = function (dt) {
    if (!mouseR) { S.offLatch = false; S.useOff = false; }
    else if (!S.offLatch) { S.offLatch = true; S.useOff = offhandShouldUse(); if (S.useOff) { S.bowDraw = -1; } }
    if (S.useOff && !player.inv[36]) S.useOff = false;
    return _ui.apply(this, arguments);
  }; }
// the hand on screen swings for the off hand too; keep the selected-item name honest
{ const _ss = selectSlot; selectSlot = function (i) { S.useOff = false; return _ss(i); }; }

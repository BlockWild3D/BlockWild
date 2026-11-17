// ================= OWNER ITEM / LIQUID / FIRE / FIREWORK / EVENT SOUNDS =================
// Keys snd.<owner folder path>.<name> (e.g. snd.item.armor.equip_iron, snd.liquid.swim, snd.fireworks.blast), streamed
// like every other owner sound. Direct call sites use blkPlay(key) || old sound (buckets, bottles, hoe, axe, copper wax,
// berries, wolf armor, riptide, firework launch, bad omen, water entry); this file adds:
//   equipSfx(itemId)       armour equip sound by material (04_game inventory and right-click equip)
//   ITEM_NAME_SND          game sounds with their own names (ignite, shield, raid horn, goat horn, spyglass, spear, brush...)
//   ITEM_CTX_SND           old sounds swapped while a function runs (trident, crossbow, mace, fireworks, brushing)
//   ITEM_USE_SND           old sounds swapped during a right-click by held item (bone meal, shovel paths, dyes, ink sacs, honeycomb)
//   elytra loop + swim strokes (in the Amb tick, 99y_ambience.js)
function equipSfx(id) {
  const k = (ITEMS[id] && ITEMS[id].key) || ''; if (!Sfx.ctx) return false;
  const m = /^leather_/.test(k) ? 'leather' : /^chainmail_/.test(k) ? 'chain' : /^iron_/.test(k) ? 'iron' : /^golden_/.test(k) ? 'gold' : /^diamond_/.test(k) ? 'diamond' : /^netherite_/.test(k) ? 'netherite' : /^copper_/.test(k) ? 'copper' : 'generic';
  return BlkSnd.play(['snd.item.armor.equip_' + m, 'snd.item.armor.equip_generic'], 0.8, 1);
}
const heldKey = () => { try { const h = player.held(); return h && ITEMS[h.id] ? ITEMS[h.id].key : ''; } catch (e) { return ''; } };
const targetKey = () => (typeof target !== 'undefined' && target && BL[target.id] ? BL[target.id].key || '' : '');
const ITEM_NAME_SND = {
  ignite: 'snd.fire.ignite', shield: 'snd.item.shield.block', raid_horn: 'snd.event.raid.raidhorn_', goat_horn: 'snd.item.goat_horn.call', spyglass: 'snd.item.spyglass.use',
  swish_spear: () => /wooden_spear/.test(heldKey()) ? 'snd.item.spear.wood.attack' : 'snd.item.spear.attack',
  thit_spear: () => /wooden_spear/.test(heldKey()) ? 'snd.item.spear.wood.hit' : 'snd.item.spear.hit',
  brush: () => /gravel/.test(targetKey()) ? 'snd.item.brush.brushing_gravel' : /sand/.test(targetKey()) ? 'snd.item.brush.brushing_sand' : 'snd.item.brush.brushing_generic',
  brush_done: () => /gravel/.test(targetKey()) ? 'snd.item.brush.brushing_gravel_complete' : 'snd.item.brush.brush_sand_complete',
};
const ITEM_CTX_SND = {
  trident: { vwoop: 'snd.item.trident.riptide', bow: 'snd.item.trident.throw' },
  crossbow_fire: { bow: 'snd.item.crossbow.shoot' }, crossbow_load: { click: 'snd.item.crossbow.loading_end' },
  mace: { boom: 'snd.item.mace.smash_ground', levelup: 'snd.item.mace.smash_ground_heavy' },
  brush: { spyglass: 'snd.item.brush.brushing_generic' },
  firework: { boom: (pos) => { const far = pos && G.player && G.player.pos.distanceTo(pos) > 16; const big = Math.random() < 0.3;
    setTimeout(() => { if (Math.random() < 0.5) blkPlay(far ? 'snd.fireworks.twinkle_far' : 'snd.fireworks.twinkle', 0.6, pos); }, 500);
    return 'snd.fireworks.' + (big ? 'largeblast' : 'blast') + (far ? '_far' : ''); } },
};
function itemUseSnd(name) {
  const hk = heldKey(), tk = targetKey();
  if (hk === 'bone_meal') return 'snd.item.bonemeal.bonemeal';
  if (/_dye$/.test(hk)) return 'snd.item.dye.dye';
  if (/ink_sac$/.test(hk)) return 'snd.item.ink_sac.ink_sac';
  if (hk === 'honeycomb') return 'snd.item.honeycomb.wax_on';
  if (/_shovel$/.test(hk) && name === 'grass' && /grass|dirt|podzol|mycelium/.test(tk)) return 'snd.item.shovel.flatten';
  if (/_hoe$/.test(hk) && name === 'grass') return 'snd.item.hoe.till';
  return null;
}
const ItemSnd = { ctx: null, use: false };
function withItemCtx(c, fn, self, args) { const p = ItemSnd.ctx; ItemSnd.ctx = c; try { return fn.apply(self, args); } finally { ItemSnd.ctx = p; } }
function itemSndSwap(name, pos, v) {
  if (MobSnd.busy || !Sfx.ctx || typeof name !== 'string') return false;
  let k = null;
  if (ItemSnd.ctx && ITEM_CTX_SND[ItemSnd.ctx] && ITEM_CTX_SND[ItemSnd.ctx][name]) { k = ITEM_CTX_SND[ItemSnd.ctx][name]; if (typeof k === 'function') k = k(pos); }
  if (!k && ItemSnd.use) k = itemUseSnd(name);
  if (!k && ITEM_NAME_SND[name]) { k = ITEM_NAME_SND[name]; if (typeof k === 'function') k = k(); }
  return !!k && BlkSnd.play([k], Math.min(1, Math.max(0.5, v || 1)), 1, pos);
}
{ const _p = Sfx.play.bind(Sfx); Sfx.play = function (name, v = 1, rate) { if (itemSndSwap(name, null, v)) return; return _p(name, v, rate); }; }
{ const _a = Sfx.at.bind(Sfx); Sfx.at = function (name, pos, v = 1, rate) { if (itemSndSwap(name, pos, v)) return; return _a(name, pos, v, rate); }; }
{ const _u = useAction; useAction = function () { const p = ItemSnd.use; ItemSnd.use = true; try { return _u.apply(this, arguments); } finally { ItemSnd.use = p; } }; }
{ const _r = releaseTrident; releaseTrident = function () { return withItemCtx('trident', _r, this, arguments); }; }
{ const _f = fireCrossbow; fireCrossbow = function () { return withItemCtx('crossbow_fire', _f, this, arguments); }; }
{ const _l = loadCrossbow; loadCrossbow = function () { return withItemCtx('crossbow_load', _l, this, arguments); }; }
{ const _m = maceBonus; maceBonus = function () { return withItemCtx('mace', _m, this, arguments); }; }
{ const _b = brushLoot; brushLoot = function () { return withItemCtx('brush', _b, this, arguments); }; }
{ const _w = updateFireworks; updateFireworks = function () { return withItemCtx('firework', _w, this, arguments); }; }
// firework bursts play at the burst: Sfx.at with the burst position goes through itemSndSwap above (ctx 'firework')

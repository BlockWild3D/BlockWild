// ================= RICHER LOOT (closer to Minecraft's tables) =================
// More kinds of items in every structure's chests, and gear found in dungeons, pyramids, temples and strongholds is
// sometimes enchanted (like Minecraft's "enchant randomly" loot). Enchanted books get a random enchantment.
const L = (k, a, b, p) => [k, a, b, p];
const addLoot = (t, list) => { LOOT[t] = (LOOT[t] || []).concat(list.filter(e => IT[e[0]] != null)); };
addLoot('dungeon', [L('bread', 1, 3, 0.4), L('wheat', 1, 4, 0.4), L('bucket', 1, 1, 0.15), L('redstone', 1, 4, 0.3), L('name_tag', 1, 1, 0.12), L('enchanted_book', 1, 1, 0.25), L('rotten_flesh', 1, 8, 0.4), L('enchanted_golden_apple', 1, 1, 0.03)]);
addLoot('pyramid', [L('emerald', 1, 3, 0.4), L('enchanted_book', 1, 1, 0.3), L('sand', 1, 8, 0.4), L('spider_eye', 1, 3, 0.4), L('enchanted_golden_apple', 1, 1, 0.04), L('string', 1, 8, 0.4), L('egg', 0, 0, 0)]);
addLoot('jungle_temple', [L('bamboo', 1, 3, 0), L('emerald', 1, 3, 0.3), L('enchanted_book', 1, 1, 0.2), L('saddle', 1, 1, 0.12), L('iron_horse_armor', 1, 1, 0.08), L('golden_horse_armor', 1, 1, 0.06), L('diamond_horse_armor', 1, 1, 0.04)]);
addLoot('stronghold', [L('enchanted_book', 1, 1, 0.15), L('redstone', 4, 9, 0.25), L('iron_sword', 1, 1, 0.12), L('iron_chestplate', 1, 1, 0.1), L('gold_ingot', 1, 3, 0.25)]);
addLoot('ruined_portal', [L('fire_charge', 1, 2, 0), L('golden_sword', 1, 1, 0.15), L('golden_axe', 1, 1, 0.15), L('golden_pickaxe', 1, 1, 0.12), L('golden_helmet', 1, 1, 0.12), L('golden_boots', 1, 1, 0.12), L('golden_carrot', 4, 12, 0.25), L('clock', 1, 1, 0.1), L('enchanted_golden_apple', 1, 1, 0.015), L('gold_block', 1, 2, 0.05)]);
addLoot('fortress', [L('nether_wart', 3, 7, 0.4), L('gold_nugget', 2, 8, 0.3)]);
addLoot('house', [L('emerald', 1, 2, 0.2), L('bread', 1, 3, 0.3), L('book', 1, 1, 0.1), L('compass', 1, 1, 0.05), L('feather', 1, 3, 0.2), L('egg', 1, 2, 0.15)]);
addLoot('smithy', [L('iron_nugget', 2, 8, 0.3), L('chainmail_chestplate', 1, 1, 0.08), L('chainmail_helmet', 1, 1, 0.08), L('iron_axe', 1, 1, 0.15)]);
addLoot('shipwreck', [L('emerald', 1, 5, 0.3), L('diamond', 1, 1, 0.12), L('gold_nugget', 1, 10, 0.4), L('iron_nugget', 1, 10, 0.4), L('lapis_lazuli', 1, 10, 0.3), L('experience_bottle', 1, 1, 0.15), L('compass', 1, 1, 0.1), L('paper', 1, 10, 0.3), L('feather', 1, 5, 0.3), L('book', 1, 5, 0.2), L('leather_chestplate', 1, 1, 0.1), L('leather_helmet', 1, 1, 0.1), L('carrot', 4, 8, 0.3), L('potato', 2, 6, 0.3), L('wheat', 8, 21, 0.3)]);
addLoot('mineshaft', [L('name_tag', 1, 1, 0.12), L('enchanted_book', 1, 1, 0.12), L('lapis_lazuli', 4, 9, 0.25), L('redstone', 4, 9, 0.25), L('melon_slice', 2, 4, 0), L('rail', 4, 8, 0.4), L('powered_rail', 1, 4, 0.2), L('iron_pickaxe', 1, 1, 0.08)]);
addLoot('igloo', [L('golden_apple', 1, 1, 0.5), L('coal', 1, 4, 0.5), L('apple', 1, 3, 0.4), L('wheat', 2, 3, 0.3), L('emerald', 1, 1, 0.3), L('stone_axe', 1, 1, 0.3), L('rotten_flesh', 1, 1, 0.3), L('gold_nugget', 1, 3, 0.3)]);
addLoot('end_city', [L('iron_helmet', 1, 1, 0.12), L('iron_chestplate', 1, 1, 0.12), L('diamond_leggings', 1, 1, 0.06), L('diamond_boots', 1, 1, 0.06), L('iron_shovel', 1, 1, 0.1), L('diamond_shovel', 1, 1, 0.05), L('beetroot_seeds', 1, 10, 0), L('golden_horse_armor', 1, 1, 0.06), L('iron_horse_armor', 1, 1, 0.06)]);
// gear in these chests is sometimes enchanted
const ENCH_LOOT = { dungeon: 0.4, pyramid: 0.5, jungle_temple: 0.5, stronghold: 0.4, stronghold_corridor: 0.4, end_city: 1, ruined_portal: 0.3, shipwreck: 0.3, ancient_city: 0.8, outpost: 0.2, trial_vault: 0.6, ominous_vault: 1 };
{ const _rl = rollLoot; rollLoot = function (type, seed) { const inv = _rl(type, seed); const p = ENCH_LOOT[type]; if (!p) return inv; const r = mulberry32((seed ^ 0xe7c4) >>> 0);
    for (const s of inv) { if (!s || s.ench || s.id === IT.enchanted_book || !maxDur(s.id) || r() > p) continue; const lv = type === 'end_city' ? 20 + Math.floor(r() * 20) : 5 + Math.floor(r() * 25); const L2 = rollEnchants(s.id, lv, (r() * 1e9) | 0); if (L2.length) { s.ench = {}; for (const [e, l] of L2) s.ench[e] = l; } if (r() < 0.5) s.dmg = Math.floor(maxDur(s.id) * r() * 0.5) || undefined; }
    return inv; }; }

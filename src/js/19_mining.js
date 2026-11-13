// ================= MINING (Minecraft rules) =================
// Every block has a hardness and a preferred tool. Break time (in game ticks of 1/20 s):
//   damage per tick = speed / hardness / (can harvest ? 30 : 100); instant if damage > 1
//   speed = tool material speed when it is the right tool type (wood 2, stone 4, iron 6, diamond 8, gold 12), else 1
//   + Efficiency (level^2 + 1), x Haste, /5 while not standing on the ground, /5 with your head underwater.
const HARD = { grass: 0.6, dirt: 0.5, stone: 1.5, sand: 0.5, log: 2, leaves: 0.2, planks: 2, cobblestone: 2, glass: 0.3, brick: 2, coal_ore: 3, iron_ore: 3, gold_ore: 3, diamond_ore: 3, snowy_grass: 0.6,
  crafting_table: 2.5, chest: 2.5, gravel: 0.6, cactus: 0.4, mossy_cobblestone: 2, bookshelf: 1.5, tnt: 0, sandstone: 0.8, wool: 0.8, glowstone: 0.3, furnace: 3.5, birch_log: 2, birch_leaves: 0.2,
  spruce_log: 2, spruce_leaves: 0.2, spawner: 5, stone_bricks: 1.5, snow_block: 0.2, obsidian: 50, netherrack: 0.4, soul_sand: 0.5, quartz_ore: 3, nether_gold_ore: 3, nether_bricks: 2, magma_block: 0.5,
  crimson_nylium: 0.4, warped_nylium: 0.4, crimson_stem: 2, warped_stem: 2, nether_wart_block: 1, warped_wart_block: 1, shroomlight: 1, end_stone: 3, dragon_egg: 3, quartz_block: 0.8,
  lapis_ore: 3, lapis_block: 3, enchanting_table: 5, deepslate: 3, cobbled_deepslate: 3.5, tuff: 1.5, granite: 1.5, diorite: 1.5, andesite: 1.5, copper_ore: 3, redstone_ore: 3, emerald_ore: 3,
  deepslate_coal_ore: 4.5, deepslate_iron_ore: 4.5, deepslate_gold_ore: 4.5, deepslate_diamond_ore: 4.5, deepslate_lapis_ore: 4.5, deepslate_copper_ore: 4.5, deepslate_redstone_ore: 4.5, deepslate_emerald_ore: 4.5, copper_block: 3,
  ancient_debris: 30, netherite_block: 50, jungle_log: 2, dark_oak_log: 2, acacia_log: 2, jungle_leaves: 0.2, dark_oak_leaves: 0.2, acacia_leaves: 0.2, vine: 0.2, ladder: 0.4, mossy_stone_bricks: 1.5, cracked_stone_bricks: 1.5, iron_bars: 5, dark_oak_planks: 2, composter: 0.6, smoker: 3.5, blast_furnace: 3.5, cartography_table: 2.5, fletching_table: 2.5, loom: 2.5, barrel: 2.5, lectern: 2.5, grindstone: 2, stonecutter: 3.5, brewing_stand: 0.5, chorus_plant: 0.4, chorus_flower: 0.4, ladder_s: 0.4, ladder_w: 0.4, ladder_e: 0.4, cobweb: 4, ice: 0.5, packed_ice: 0.5, cauldron: 2, oak_fence: 2, lily_pad: 0, iron_block: 5, gold_block: 3, diamond_block: 5, emerald_block: 5, coal_block: 5, redstone_block: 5, anvil: 5, anvil_x: 5, chipped_anvil: 5, chipped_anvil_x: 5, damaged_anvil: 5, damaged_anvil_x: 5, smithing_table: 2.5, bed_head: 0.2, bed_foot: 0.2, dirt_path: 0.65, farmland: 0.6, hay_block: 0.5 };
const MINE_WITH = {
  pick: ['mossy_stone_bricks', 'cracked_stone_bricks', 'iron_bars', 'smoker', 'blast_furnace', 'grindstone', 'stonecutter', 'brewing_stand', 'iron_block', 'gold_block', 'diamond_block', 'emerald_block', 'coal_block', 'redstone_block', 'anvil', 'anvil_x', 'chipped_anvil', 'chipped_anvil_x', 'damaged_anvil', 'damaged_anvil_x', 'stone', 'cobblestone', 'brick', 'coal_ore', 'iron_ore', 'gold_ore', 'diamond_ore', 'mossy_cobblestone', 'sandstone', 'furnace', 'spawner', 'stone_bricks', 'obsidian', 'netherrack', 'quartz_ore', 'nether_gold_ore', 'nether_bricks', 'magma_block', 'crimson_nylium', 'warped_nylium', 'end_stone', 'quartz_block', 'lapis_ore', 'lapis_block', 'enchanting_table', 'deepslate', 'cobbled_deepslate', 'tuff', 'granite', 'diorite', 'andesite', 'copper_ore', 'redstone_ore', 'emerald_ore', 'deepslate_coal_ore', 'deepslate_iron_ore', 'deepslate_gold_ore', 'deepslate_diamond_ore', 'deepslate_lapis_ore', 'deepslate_copper_ore', 'deepslate_redstone_ore', 'deepslate_emerald_ore', 'copper_block', 'ancient_debris', 'netherite_block'],
  axe: ['dark_oak_planks', 'composter', 'cartography_table', 'fletching_table', 'loom', 'barrel', 'lectern', 'chorus_plant', 'chorus_flower', 'ladder', 'ladder_s', 'ladder_w', 'ladder_e', 'jungle_log', 'dark_oak_log', 'acacia_log', 'oak_fence', 'log', 'planks', 'crafting_table', 'chest', 'bookshelf', 'birch_log', 'spruce_log', 'crimson_stem', 'warped_stem', 'bed_head', 'bed_foot', 'smithing_table'],
  shovel: ['grass', 'dirt', 'sand', 'gravel', 'snowy_grass', 'snow_block', 'soul_sand', 'dirt_path', 'farmland'],
  hoe: ['jungle_leaves', 'dark_oak_leaves', 'acacia_leaves', 'vine', 'leaves', 'birch_leaves', 'spruce_leaves', 'nether_wart_block', 'warped_wart_block', 'shroomlight', 'hay_block'],
};
// blocks that drop nothing unless mined with at least this pickaxe tier (1 wood, 2 stone, 3 iron, 4 diamond)
const NEED_PICK = { stone: 1, cobblestone: 1, brick: 1, coal_ore: 1, mossy_cobblestone: 1, sandstone: 1, furnace: 1, spawner: 1, stone_bricks: 1, netherrack: 1, quartz_ore: 1, nether_gold_ore: 1, nether_bricks: 1, magma_block: 1, crimson_nylium: 1, warped_nylium: 1, end_stone: 1, quartz_block: 1, enchanting_table: 1,
  iron_ore: 2, lapis_ore: 2, lapis_block: 2, gold_ore: 3, diamond_ore: 3, obsidian: 4,
  deepslate: 1, cobbled_deepslate: 1, tuff: 1, granite: 1, diorite: 1, andesite: 1, deepslate_coal_ore: 1, copper_ore: 2, deepslate_copper_ore: 2, copper_block: 2, deepslate_iron_ore: 2, deepslate_lapis_ore: 2,
  deepslate_gold_ore: 3, deepslate_diamond_ore: 3, redstone_ore: 3, deepslate_redstone_ore: 3, emerald_ore: 3, deepslate_emerald_ore: 3, ancient_debris: 4, netherite_block: 4, iron_block: 2, gold_block: 3, diamond_block: 3, emerald_block: 3, coal_block: 1, redstone_block: 1, anvil: 1, anvil_x: 1, chipped_anvil: 1, chipped_anvil_x: 1, damaged_anvil: 1, damaged_anvil_x: 1 };
for (const d of BL) {
  if (!d || !d.key) continue;
  if (HARD[d.key] !== undefined) d.hardness = HARD[d.key];
  for (const t in MINE_WITH) if (MINE_WITH[t].includes(d.key)) d.mine = t;
  if (NEED_PICK[d.key]) { d.tool = 'pick'; d.tier = NEED_PICK[d.key]; }
  if (!d.mine) { // modded blocks: guess from their settings
    if (d.tool === 'pick') d.mine = 'pick'; else if (/log|plank|wood|stem/.test(d.key)) d.mine = 'axe'; else if (/dirt|sand|gravel|snow|clay|mud/.test(d.key)) d.mine = 'shovel'; else if (/leaves|wart|hay/.test(d.key)) d.mine = 'hoe';
  }
}
const TOOL_SPEED_NAME = { pick: 'Pickaxe', axe: 'Axe', shovel: 'Shovel', hoe: 'Hoe' };
breakTime = function (id, tool) {
  const def = BL[id]; if (!def || def.hardness < 0) return Infinity; if (S.mode === 'creative') return 0; if (def.hardness === 0) return 0;
  const right = tool && tool.kind === 'tool' && def.mine && tool.tool === def.mine;
  let speed = 1;
  if (right) { speed = tool.speed; const ef = heldEnch('efficiency'); if (ef) speed += ef * ef + 1; }
  else if (tool && tool.tool === 'sword') speed = /leaves/.test(def.key) || id === B.CACTUS ? 1.5 : 1;
  speed *= 1 + 0.2 * effLevel('haste');
  if (!player.onGround && !player.flying && !inWater(player, 0.4)) speed /= 5;
  { const e = player.eye(); if (isWaterId(world.get(Math.floor(e.x), Math.floor(e.y), Math.floor(e.z)))) speed /= 5; }
  const canHarvest = def.tool !== 'pick' || (tool && tool.tool === 'pick' && tool.tier >= def.tier);
  const dmg = speed / def.hardness / (canHarvest ? 30 : 100);
  if (dmg > 1) return 0;
  return Math.ceil(1 / dmg) / 20;
};
// attack speeds (attacks per second) from Minecraft; the attack cooldown is 1 / speed
const ATK = { sword: 1.6, pick: 1.2, shovel: 1.0, hoe: 2, axe: 0.9 };
for (const id of ITEM_IDS) { const it = ITEMS[id]; if (it.kind !== 'tool') continue;
  if (it.tool === 'axe') it.atk = it.gold ? 1.0 : [0.8, 0.8, 0.9, 1.0, 1.0][it.tier - 1] || 0.9;
  else if (it.tool === 'hoe') { it.atk = it.gold ? 1 : [1, 2, 3, 4, 4][it.tier - 1] || 2; it.speed = it.gold ? 12 : [2, 4, 6, 8, 9][it.tier - 1] || 2; }
  else if (it.tool === 'spear') it.atk = 1 / it.cool;
  else it.atk = ATK[it.tool] || 1.2; }
// which tool a block wants, shown when you hover it in the inventory
function blockToolLine(id) { const d = BL[id]; if (!d || !d.mine) return ''; return 'Best tool: ' + TOOL_SPEED_NAME[d.mine] + (d.tool === 'pick' ? ' (needs ' + ['', 'wood', 'stone', 'iron', 'diamond', 'netherite'][d.tier] + ' or better to drop)' : ''); }

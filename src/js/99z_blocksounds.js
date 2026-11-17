// ================= OWNER BLOCK SOUNDS =================
// The owner's block recordings stream like mob sounds (keys blk.<group>.<event> in sounds/mobs.json; group = the
// owner's folder name). Every block gets a sound group from BLOCK_SND_RULES (first match on its material/key); blocks
// with no group keep the old stone/wood/grass/sand/snow/wool/glass sounds.
//   blockSfx(kind, id, v, pos)   kind = break / place / step / hit / fall; place falls back to break, hit and fall to
//                                step (Minecraft does the same); pitches as in Minecraft (break/place 0.8, hit 0.5)
//   interactions                 doors, trapdoors, fence gates, buttons, chests/barrels/ender chests/shulker boxes/
//                                copper chests (open and close), bell, respawn anchor, crafter, decorated pot,
//                                chiseled bookshelf, sculk sensor, brewing, enchanting, grindstone, smithing,
//                                pumpkin carving, end portal
//   block ambience               random blocks near the player make their idle sounds (furnaces, campfires,
//                                candles, firefly bushes at night, eyeblossoms, dry grass, desert sand and dead
//                                bushes, pale hanging moss, poplar leaves, dripstone drips, trial spawners, vaults,
//                                beacons, conduits, charged respawn anchors, creaking hearts, dried ghasts, beehives)
// Each returns false until the file has loaded, so the old sound plays in the meantime.
const BLOCK_SND_RULES = [
  [/^(small|medium|large)_amethyst_bud|^amethyst_cluster/, 'amethyst_cluster'], [/amethyst/, 'amethyst'],
  [/ancient_debris/, 'ancient_debris'], [/azalea_leaves/, 'azalea_leaves'], [/^(flowering_)?azalea$/, 'azalea'],
  [/bamboo_hanging_sign/, 'bamboo_wood_hanging_sign'], [/cherry_hanging_sign/, 'cherry_wood_hanging_sign'], [/(crimson|warped)_hanging_sign/, 'nether_wood_hanging_sign'], [/hanging_sign/, 'hanging_sign'],
  [/^bamboo$|bamboo_sapling/, 'bamboo'], [/bamboo/, 'bamboo_wood'], [/basalt/, 'basalt'], [/bone_block/, 'bone_block'], [/calcite/, 'calcite'], [/^chain$/, 'chain'],
  [/cherry_leaves/, 'cherry_leaves'], [/cherry/, 'cherry_wood'],
  [/copper_bulb/, 'copper_bulb'], [/copper_grate/, 'copper_grate'], [/^(?!.*ore)(?!raw_).*copper|lightning_rod/, 'copper'],
  [/deepslate_(bricks|brick|tiles|tile)/, 'deepslate_bricks'], [/deepslate/, 'deepslate'], [/dripstone/, 'dripstone'], [/froglight/, 'froglight'], [/frogspawn/, 'frogspawn'],
  [/hanging_roots/, 'hanging_roots'], [/honey_block/, 'honeyblock'], [/^iron_block$|heavy_core/, 'iron'], [/^(soul_)?lantern$/, 'lantern'], [/leaf_litter/, 'leaf_litter'], [/^lodestone$/, 'lodestone'],
  [/muddy_mangrove_roots/, 'muddy_mangrove_roots'], [/mangrove_roots/, 'mangrove_roots'], [/^(pale_)?moss_(block|carpet)$/, 'moss'],
  [/mud_brick/, 'mud_bricks'], [/packed_mud/, 'packed_mud'], [/^mud$/, 'mud'], [/nether_brick/, 'nether_bricks'], [/nether_gold_ore|quartz_ore/, 'nether_ore'], [/nether_sprouts/, 'nether_sprouts'],
  [/(crimson|warped)_(stem|hyphae)/, 'stem'], [/(crimson|warped)_fungus/, 'fungus'], [/(crimson|warped)_roots/, 'roots'], [/crimson|warped/, 'nether_wood'],
  [/netherite_block/, 'netherite'], [/netherrack/, 'netherrack'], [/^nether_wart(_\d)?$/, 'netherwart'], [/nylium/, 'nylium'], [/shroomlight/, 'shroomlight'],
  [/soul_sand/, 'soul_sand'], [/soul_soil/, 'soul_soil'], [/^spawner$/, 'spawner'], [/^wet_sponge$/, 'wet_sponge'], [/^sponge$/, 'sponge'], [/spore_blossom/, 'spore_blossom'],
  [/tuff_brick/, 'tuff_bricks'], [/tuff/, 'tuff'], [/sculk_catalyst/, 'sculk_catalyst'], [/sculk_sensor/, 'sculk_sensor'], [/sculk_shrieker/, 'sculk_shrieker'], [/sculk_vein/, 'sculk_vein'], [/^sculk$/, 'sculk'],
  [/powder_snow/, 'powder_snow'], [/suspicious_sand/, 'suspicious_sand'], [/suspicious_gravel/, 'suspicious_gravel'], [/sweet_berry_bush/, 'sweet_berry_bush'], [/cave_vines/, 'cave_vines'],
  [/^cobweb$/, 'cobweb'], [/(big|small)_dripleaf/, 'big_dripleaf'], [/chiseled_bookshelf/, 'chiseled_bookshelf'], [/decorated_pot/, 'decorated_pot'], [/candle(?!_cake)/, 'candle'],
  [/resin_brick/, 'resin_bricks'], [/resin/, 'resin'], [/trial_spawner/, 'trial_spawner'], [/^vault$/, 'vault'], [/^vine$/, 'vine'], [/lily_pad/, 'waterlily'], [/scaffolding/, 'scaffold'],
  [/dried_ghast/, 'dried_ghast'], [/creaking_heart/, 'creaking_heart'], [/shelf_mushroom/, 'shelf_mushroom'], [/straw_bed/, 'straw_bed'], [/cinnabar/, 'cinnabar'],
  [/potent_sulfur/, 'potent_sulfur'], [/sulfur_spike/, 'sulfur_spike'], [/sulfur/, 'sulfur'], [/cactus_flower/, 'cactus_flower'], [/red_shrub/, 'red_shrub'], [/rooted_dirt/, 'rooted_dirt'],
];
const BlkSnd = {
  groupOf(id) {
    const d = BL[id]; if (!d) return null; if (d._bsg !== undefined) return d._bsg; const k = (d.key || '').split('#')[0], m = d.mat || '';
    let g = null; for (const [rx, grp] of BLOCK_SND_RULES) if (rx.test(k) || (m && rx.test(m))) { g = grp; break; }
    return (d._bsg = g);
  },
  // play the first loaded key of a list; all start loading
  play(keys, v, rate, pos) {
    const k = MobSnd.pick(keys); if (!k) return false; const r = (rate || 1) * (0.95 + Math.random() * 0.1);
    MobSnd.busy++; try { if (pos) Sfx.at(k, pos, v, r); else Sfx.play(k, v, r); } finally { MobSnd.busy--; } return true;
  },
};
const BLOCK_KIND = { break: [['break'], 0.8], place: [['place', 'break'], 0.8], step: [['step'], 1], hit: [['hit', 'step'], 0.5], fall: [['fall', 'step'], 0.75] };
// basic materials (owner's dig folder): breaking and placing for every block without a group of its own
function digGroupOf(id) {
  const d = BL[id]; if (!d) return null; if (d._dig !== undefined) return d._dig; const k = (d.key || '').split('#')[0];
  const g = /coral/.test(k) ? 'coral' : /gravel|concrete_powder/.test(k) ? 'gravel' : /kelp|seagrass|sea_pickle/.test(k) ? 'wet_grass'
    : { stone: 'stone', wood: 'wood', grass: 'grass', sand: 'sand', snow: 'snow', wool: 'cloth' }[d.snd] || null;
  return (d._dig = g);
}
function blockSfx(kind, id, v = 1, pos) {
  if (!Sfx.ctx) return false; const g = BlkSnd.groupOf(id); const [ks, rate] = BLOCK_KIND[kind] || [[kind], 1];
  const bd = BL[id], bk = bd && bd.key ? bd.key.split('#')[0] : '';
  // buckets: placing water / lava; crops: Minecraft plays the crop sound for planting and breaking them
  if (kind === 'place' && bd && bd.fluid && BlkSnd.play([isLavaId(id) ? 'snd.item.bucket.empty_lava' : 'snd.item.bucket.empty'], v, 1, pos)) return true;
  if ((kind === 'place' || kind === 'break') && /^(wheat|carrots|potatoes|beetroots|pumpkin_stem|melon_stem|torchflower_crop|pitcher_crop)_\d/.test(bk) && BlkSnd.play(['snd.item.plant.crop'], v, 1, pos)) return true;
  if (kind === 'place' && /^nether_wart_\d/.test(bk) && BlkSnd.play(['snd.item.plant.netherwart'], v, 1, pos)) return true;
  if (g && BlkSnd.play(ks.map(k => 'blk.' + g + '.' + k), kind === 'step' ? v * 0.8 : v, rate, pos)) return true;
  // no step/hit recordings for basic materials yet: those keep the old sounds
  const dg = (kind === 'break' || kind === 'place') && digGroupOf(id); if (dg && BlkSnd.play(['dig.' + dg], v, 0.8, pos)) return true;
  return false;
}
// player damage (owner's damage folder): hit, small and big falls
function playerHurtSfx(dmg, cause) {
  if (!Sfx.ctx) return false; const c = cause || ''; const fall = /fall/.test(c);
  const special = /drown/i.test(c) ? 'snd.entity.player.hurt.drown' : /fire|lava|burn|magma|campfire/i.test(c) ? 'snd.entity.player.hurt.fire_hurt' : /freez|frost|powder snow/i.test(c) ? 'snd.entity.player.hurt.freeze_hurt' : /berr/i.test(c) ? 'snd.entity.player.hurt.berrybush_hurt' : null;
  return BlkSnd.play([...(special ? [special] : []), fall ? (dmg > 4 ? 'dmg.fallbig' : 'dmg.fallsmall') : 'dmg.hit', 'dmg.hit'], 1, 1);
}
// soul speed: the owner's sound while running on soul sand / soul soil with the boots
{ const _s = soulSandMul; let last = 0; soulSandMul = function () { const r = _s.apply(this, arguments);
    try { const P = player, now = performance.now(); if (now - last > 450 && enchOf(P.inv[40], 'soul_speed') && Math.hypot(P.vel.x, P.vel.z) > 1.5) { last = now; BlkSnd.play(['ench.soulspeed'], 0.45, 1); } } catch (e) { }
    return r; }; }
function blkPlay(key, v = 1, pos) { return !!Sfx.ctx && BlkSnd.play([key], v, 1, pos); }
// workstation outputs (24_animals panel take)
function panelSfx(pn) {
  const t = (pn && pn.title) || ''; const k = /Disenchant/.test(t) ? 'blk.grindstone.grindstone' : /Upgrade Gear|Smith/.test(t) ? 'blk.smithing_table.smithing_table' : /Fletch/.test(t) ? 'blk.fletching_table.fletching_table' : null;
  return !!k && blkPlay(k, 0.8);
}
// ---- interactions ----
// sounds the game plays by a name of their own: name -> owner key
const BLOCK_NAME_SND = { anchor_charge: 'blk.respawn_anchor.charge', anchor_set: 'blk.respawn_anchor.set_spawn', book_put: 'blk.chiseled_bookshelf.insert', book_take: 'blk.chiseled_bookshelf.pickup',
  dpot_insert: 'blk.decorated_pot.insert', dpot_full: 'blk.decorated_pot.insert_fail', dpot_shatter: 'blk.decorated_pot.shatter', bell: 'blk.bell.use', crafter: 'blk.crafter.craft',
  sculk_click: 'blk.sculk_sensor.sculk_clicking', geyser: 'blk.potent_sulfur.sulfur_spring_eruption' };
function woodFamily(k) { return /cherry/.test(k) ? 'cherry' : /bamboo/.test(k) ? 'bamboo' : /crimson|warped/.test(k) ? 'nether' : /copper/.test(k) ? 'copper' : /^iron_/.test(k) ? 'iron' : 'wood'; }
// door/trapdoor/gate/button sounds, from the block at pos
function shapeSndKey(name, d) {
  const k = (d.key || '').split('#')[0], f = woodFamily(k), open = /open|_on$/.test(name);
  if (d.shape === 'door') return { cherry: 'blk.cherrywood_door.toggle', bamboo: 'blk.bamboo_wood_door.toggle', nether: 'blk.nether_wood_door.toggle', copper: 'blk.copper_door.toggle', iron: 'blk.iron_door.' + (open ? 'open' : 'close'), wood: 'blk.wooden_door.' + (open ? 'open' : 'close') }[f];
  if (d.shape === 'trapdoor') return { cherry: 'blk.cherrywood_trapdoor.toggle', bamboo: 'blk.bamboo_wood_trapdoor.toggle', nether: 'blk.nether_wood_trapdoor.toggle', copper: 'blk.copper_trapdoor.toggle', iron: 'blk.iron_trapdoor.' + (open ? 'open' : 'close'), wood: 'blk.wooden_trapdoor.' + (open ? 'open' : 'close') }[f];
  if (d.shape === 'gate') return { cherry: 'blk.cherrywood_fence_gate.toggle', bamboo: 'blk.bamboo_wood_fence.toggle', nether: 'blk.nether_wood_fence.toggle' }[f] || 'blk.fence_gate.' + (open ? 'open' : 'close');
  if (d.shape === 'button') return { cherry: 'blk.cherrywood_button.click', bamboo: 'blk.bamboo_wood_button.bamboo_wood_button', nether: 'blk.nether_wood_button.nether_wood_button' }[f] || null;
  if (d.bulb || /copper_bulb/.test(k)) return 'blk.copper_bulb.toggle';
  return null;
}
const SHAPE_SND_NAMES = new Set(['door_open', 'door_close', 'trap_open', 'trap_close', 'iron_door_open', 'iron_door_close', 'click_on', 'click_off']);
// containers: open / close by block
function containerSnd(id, which) {
  const d = BL[id]; if (!d) return null; const k = (d.key || '').split('#')[0];
  if (/copper_chest/.test(k)) return 'blk.copper_chest.' + (/oxidized/.test(k) ? 'oxidized_' : /weathered/.test(k) ? 'weathered_' : '') + which;
  if (/ender_chest/.test(k)) return 'blk.enderchest.' + which; if (/chest/.test(k)) return 'blk.chest.' + which;
  if (/barrel/.test(k)) return 'blk.barrel.' + which; if (/shulker_box/.test(k)) return 'blk.shulker_box.' + which; return null;
}
function blockAt(pos) { const w = G.world; return w ? w.get(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z)) : 0; }
BlkSnd.useT = 0; BlkSnd.muteT = 0; BlkSnd.ctx = null;
addEventListener('mousedown', (e) => { if (e.button === 2) BlkSnd.useT = performance.now(); }, true);
addEventListener('touchstart', () => { BlkSnd.useT = performance.now(); }, true);
{ const _at = Sfx.at.bind(Sfx); Sfx.at = function (name, pos, v = 1, rate) {
    if (typeof name === 'string' && !MobSnd.busy && Sfx.ctx && pos) {
      if (SHAPE_SND_NAMES.has(name)) { const d = BL[blockAt(pos)]; const k = d && shapeSndKey(name, d); if (k && BlkSnd.play([k], Math.min(1, v), 1, pos)) return; }
      else if (BLOCK_NAME_SND[name] && BlkSnd.play([BLOCK_NAME_SND[name]], v, 1, pos)) return;
      else if (name === 'fizz' && /brewing_stand/.test((BL[blockAt(pos)] || {}).key || '') && BlkSnd.play(['blk.brewing_stand.brew'], v * 1.4, 1, pos)) return;
    }
    return _at(name, pos, v, rate);
  }; }
{ const _play = Sfx.play.bind(Sfx); Sfx.play = function (name, v = 1, rate) {
    if (typeof name === 'string' && !MobSnd.busy && Sfx.ctx) {
      const now = performance.now();
      if ((name === 'wood' || name === 'chest') && now < BlkSnd.muteT) return;
      if (BLOCK_NAME_SND[name] && BlkSnd.play([BLOCK_NAME_SND[name]], v, 1)) return;
      if (BlkSnd.ctx === 'enchant' && name === 'levelup' && BlkSnd.play(['blk.enchantment_table.enchant'], v * 1.4, 1)) return;
      const t = typeof target !== 'undefined' && target; const recent = now - BlkSnd.useT < 400;
      if (t && name === 'chest') { const k = containerSnd(t.id, 'open'); if (k && Sfx.has(k)) { BlkSnd.muteT = now + 60; return; } }  // openUI plays the owner's open sound
      if (t && recent && name === 'shear' && /pumpkin/.test((BL[t.id] || {}).key || '') && BlkSnd.play(['blk.pumpkin.carve'], v, 1)) return;
      if (t && recent && name === 'fizz' && /candle/.test((BL[t.id] || {}).key || '') && BlkSnd.play(['blk.candle.extinguish'], v, 1)) return;
    }
    return _play(name, v, rate);
  }; }
// chest-like UIs: open when the UI opens on a block, close when it closes
{ const _o = openUI; openUI = function (kind, key) {
    const r = _o.apply(this, arguments);
    try { BlkSnd.open = null; if (kind === 'chest' && typeof key === 'string') {
        let id = 0, pos = null; if (key === 'ender') { id = B.ENDER_CHEST || 0; } else if (/^-?\d+,-?\d+,-?\d+$/.test(key)) { const [x, y, z] = key.split(',').map(Number); id = G.world.get(x, y, z); pos = new V3(x + 0.5, y + 0.5, z + 0.5); }
        const k = id && containerSnd(id, 'open'); if (k) { blkPlay(k, 0.8, pos); BlkSnd.open = [containerSnd(id, 'close'), pos]; } } } catch (e) { }
    return r;
  }; }
{ const _c = closeInv; closeInv = function () { const o = BlkSnd.open; BlkSnd.open = null; if (o && S.uiOpen === 'chest') blkPlay(o[0], 0.8, o[1]); return _c.apply(this, arguments); }; }
{ const _e = doEnchant; doEnchant = function () { const p = BlkSnd.ctx; BlkSnd.ctx = 'enchant'; try { return _e.apply(this, arguments); } finally { BlkSnd.ctx = p; } }; }

// ---- block ambience: sample random blocks around the player (Minecraft's animateTick does the same) ----
// [test on block key, owner key, chance per hit, volume, extra condition]
const BLOCK_AMBIENT = [
  [/^lit_furnace/, 'blk.furnace.fire_crackle', 0.5, 0.5], [/^lit_smoker/, 'blk.smoker.smoker', 0.5, 0.5], [/^lit_blast_furnace/, 'blk.blastfurnace.blastfurnace', 0.5, 0.5],
  [/campfire/, 'blk.campfire.crackle', 0.6, 0.6, (d) => d.st && d.st.lit], [/candle(?!_cake)/, 'blk.candle.ambient', 0.25, 0.35, (d) => d.st && d.st.lit],
  [/firefly_bush/, 'blk.firefly_bush.firefly_bush', 0.3, 0.35, () => G.daylight < 0.4], [/open_eyeblossom/, 'blk.eyeblossom.idle', 0.2, 0.35],
  [/dry_grass/, 'blk.dry_grass.wind', 0.06, 0.35], [/^dead_bush/, 'blk.deadbush.sandblock_version_' + 'X', 0.1, 0.4], [/^(red_)?sand$/, 'blk.sand.sand', 0.01, 0.35, (d, x, y, z) => !G.world.get(x, y + 1, z)],
  [/pale_hanging_moss/, 'blk.pale_hanging_moss.pale_hanging_moss', 0.15, 0.35], [/poplar_leaves/, 'blk.poplar_leaves.ambient', 0.05, 0.3],
  [/pointed_dripstone#down_tip/, 'blk.pointed_dripstone.drip_water', 0.25, 0.4], [/^trial_spawner/, 'blk.trial_spawner.ambient', 0.4, 0.4], [/^vault/, 'blk.vault.ambient', 0.4, 0.4],
  [/^beacon$/, 'blk.beacon.ambient', 0.3, 0.4], [/^conduit$/, 'blk.conduit.ambient', 0.3, 0.4], [/^respawn_anchor/, 'blk.respawn_anchor.ambient', 0.3, 0.4, (d) => d.st && d.st.charges > 0],
  [/creaking_heart/, 'blk.creaking_heart.idle', 0.2, 0.4, () => G.daylight < 0.4], [/dried_ghast/, 'blk.dried_ghast.ambient', 0.2, 0.4], [/potent_sulfur/, 'blk.potent_sulfur.noxious_gas_ambient', 0.1, 0.35],
  [/^(beehive|bee_nest)/, 'blk.beehive.work', 0.15, 0.35],
  [/^nether_portal/, 'snd.portal.portal', 0.05, 0.4],
  [/^fire$|^soul_fire$/, 'snd.fire.fire', 0.5, 0.5], [/^lava(_\d)?$/, 'LAVA', 0.1, 0.5], [/^water_[1-8]$/, 'snd.liquid.water', 0.04, 0.4],
];
const DEADBUSH_VARIANTS = ['bushrustle', 'creakysand', 'crickets', 'howlingwind', 'insect', 'leaves', 'movingsand'];
BlkSnd.cool = new Map();
setInterval(() => { try {
  const P = G.player, w = G.world; if (!P || !w || P.dead || S.paused || !Sfx.ctx || !MobSnd.index) return;
  const px = Math.floor(P.pos.x), py = Math.floor(P.pos.y), pz = Math.floor(P.pos.z); const now = performance.now();
  for (let i = 0; i < 400; i++) {
    const x = px + ((Math.random() * 25) | 0) - 12, y = py + ((Math.random() * 17) | 0) - 8, z = pz + ((Math.random() * 25) | 0) - 12;
    const id = w.get(x, y, z); if (!id) continue; const d = BL[id]; if (!d || !d.key) continue;
    for (const [rx, key0, ch, v, cond] of BLOCK_AMBIENT) {
      if (!rx.test(d.key)) continue; if (Math.random() > ch || (cond && !cond(d, x, y, z))) break;
      const ck = x + ',' + y + ',' + z; if ((BlkSnd.cool.get(ck) || 0) > now) break; BlkSnd.cool.set(ck, now + 4000);
      const key = key0 === 'LAVA' ? (Math.random() < 0.3 ? 'snd.liquid.lava' : 'snd.liquid.lavapop') : key0.endsWith('_X') ? key0.slice(0, -1) + DEADBUSH_VARIANTS[Math.random() * 7 | 0] : key0;
      blkPlay(key, v, new V3(x + 0.5, y + 0.5, z + 0.5)); break;
    }
  }
  if (BlkSnd.cool.size > 500) for (const [k, t] of BlkSnd.cool) if (t < now) BlkSnd.cool.delete(k);
} catch (e) { } }, 500);

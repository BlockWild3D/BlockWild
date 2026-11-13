// ================= VILLAGER PROFESSIONS, TRADING AND IRON GOLEMS (Minecraft Java) =================
// A villager without a job claims the nearest free job site block and takes its profession (a nitwit never works).
// Each profession has Minecraft's trade tables: a villager offers 2 trades per level (Novice, Apprentice,
// Journeyman, Expert, Master), picked from that level's list. Trading gives the villager experience (10 / 70 / 150 /
// 250 to level up) and you 3-6 experience. Every trade has a use limit; at its job site during working hours (8:00
// to 15:00) a villager restocks up to twice a day. Prices go up with demand (popular trades) and come back down.
// A villager who has never traded loses the job if its job site is broken.
// Iron golems: a new village has one. More appear only when 3 villagers stand within 10 blocks of each other with no
// golem within 16 blocks of them; then they cannot summon again for 30 seconds (600 ticks).
const PROFS = {
  armorer: { name: 'Armorer', ws: 'blast_furnace', apron: [44, 44, 48], mask: true },
  butcher: { name: 'Butcher', ws: 'smoker', apron: [236, 236, 236], band: [180, 40, 40] },
  cartographer: { name: 'Cartographer', ws: 'cartography_table', apron: [150, 120, 64], hat: [90, 70, 40] },
  cleric: { name: 'Cleric', ws: 'brewing_stand', robe: [118, 52, 140] },
  farmer: { name: 'Farmer', ws: 'composter', hat: [222, 190, 96], brim: 0.9 },
  fisherman: { name: 'Fisherman', ws: 'barrel', hat: [72, 112, 124], brim: 0.74, apron: [90, 120, 130] },
  fletcher: { name: 'Fletcher', ws: 'fletching_table', hat: [140, 92, 56], feather: true },
  leatherworker: { name: 'Leatherworker', ws: 'cauldron', apron: [124, 72, 40] },
  librarian: { name: 'Librarian', ws: 'lectern', hat: [150, 40, 40], tall: true, apron: [220, 214, 196] },
  mason: { name: 'Mason', ws: 'stonecutter', apron: [128, 128, 132] },
  shepherd: { name: 'Shepherd', ws: 'loom', hat: [120, 84, 50], apron: [236, 236, 230] },
  toolsmith: { name: 'Toolsmith', ws: 'smithing_table', apron: [64, 64, 70] },
  weaponsmith: { name: 'Weaponsmith', ws: 'grindstone', apron: [36, 36, 40], patch: true },
};
const NITWIT = { robe: [84, 140, 64] };
const VLEVELS = ['Novice', 'Apprentice', 'Journeyman', 'Expert', 'Master'], VXP = [0, 10, 70, 150, 250];
// trade specs: VTr(cost, [second cost], sale, max uses, villager xp, price multiplier). 'key*n'; 'ench:item' = enchanted
// gear (price lo-hi by enchant level 5-19); 'book' = random enchanted book; 'map:structure' = explorer map
const VTr = (a, b, s, u, x, m) => ({ a, b, s, u, x, m: m != null ? m : 0.05 });
const VT = {
  armorer: [[VTr('coal*15', null, 'emerald', 16, 2), VTr('emerald*5', null, 'iron_helmet', 12, 1, 0.2), VTr('emerald*9', null, 'iron_chestplate', 12, 1, 0.2), VTr('emerald*7', null, 'iron_leggings', 12, 1, 0.2), VTr('emerald*4', null, 'iron_boots', 12, 1, 0.2)],
    [VTr('iron_ingot*4', null, 'emerald', 12, 10), VTr('emerald', null, 'chainmail_boots', 12, 5, 0.2), VTr('emerald*3', null, 'chainmail_leggings', 12, 5, 0.2)],
    [VTr('lava_bucket', null, 'emerald', 12, 20), VTr('diamond', null, 'emerald', 12, 20), VTr('emerald', null, 'chainmail_helmet', 12, 10, 0.2), VTr('emerald*4', null, 'chainmail_chestplate', 12, 10, 0.2), VTr('emerald*5', null, 'shield', 12, 10, 0.2)],
    [VTr('emerald*19-33', null, 'ench:diamond_leggings', 3, 15, 0.2), VTr('emerald*13-27', null, 'ench:diamond_boots', 3, 15, 0.2)],
    [VTr('emerald*13-27', null, 'ench:diamond_helmet', 3, 30, 0.2), VTr('emerald*21-35', null, 'ench:diamond_chestplate', 3, 30, 0.2)]],
  butcher: [[VTr('raw_chicken*14', null, 'emerald', 16, 2), VTr('raw_pork*7', null, 'emerald', 16, 2), VTr('rabbit*4', null, 'emerald', 16, 2), VTr('emerald', null, 'rabbit_stew', 12, 1)],
    [VTr('coal*15', null, 'emerald', 16, 10), VTr('emerald', null, 'cooked_pork*5', 16, 5), VTr('emerald', null, 'cooked_chicken*8', 16, 5)],
    [VTr('mutton*7', null, 'emerald', 16, 20), VTr('raw_beef*10', null, 'emerald', 16, 20)],
    [VTr('cooked_rabbit*8', null, 'emerald', 12, 30), VTr('emerald', null, 'steak*3', 12, 15)],
    [VTr('sweet_berries*10', null, 'emerald', 12, 30)]],
  cartographer: [[VTr('paper*24', null, 'emerald', 16, 2), VTr('emerald*7', null, 'compass', 12, 1)],
    [VTr('book*4', null, 'emerald', 12, 10), VTr('emerald*13', 'compass', 'map:ocean_monument', 12, 5)],
    [VTr('compass', null, 'emerald', 12, 20), VTr('emerald*14', 'compass', 'map:woodland_mansion', 12, 10)],
    [VTr('emerald*12', 'compass', 'map:trial_chambers', 12, 15), VTr('emerald*3', null, 'paper*12', 12, 15)],
    [VTr('emerald*8', null, 'clock', 12, 30)]],
  cleric: [[VTr('rotten_flesh*32', null, 'emerald', 16, 2), VTr('emerald', null, 'redstone*2', 12, 1)],
    [VTr('gold_ingot*3', null, 'emerald', 12, 10), VTr('emerald', null, 'lapis_lazuli', 12, 5)],
    [VTr('rabbit_foot*2', null, 'emerald', 12, 20), VTr('emerald*4', null, 'glowstone', 12, 10)],
    [VTr('turtle_scute*4', null, 'emerald', 12, 30), VTr('glass_bottle*9', null, 'emerald', 12, 30), VTr('emerald*5', null, 'ender_pearl', 12, 15)],
    [VTr('nether_wart*22', null, 'emerald', 12, 30), VTr('emerald*3', null, 'experience_bottle', 12, 30)]],
  farmer: [[VTr('wheat*20', null, 'emerald', 16, 2), VTr('potato*26', null, 'emerald', 16, 2), VTr('carrot*22', null, 'emerald', 16, 2), VTr('emerald', null, 'bread*6', 16, 1)],
    [VTr('egg*16', null, 'emerald', 16, 10), VTr('emerald', null, 'pumpkin_pie*4', 12, 5), VTr('emerald', null, 'apple*4', 16, 5)],
    [VTr('melon_slice*16', null, 'emerald', 12, 20), VTr('emerald*3', null, 'cookie*18', 12, 10)],
    [VTr('emerald', null, 'suspicious_stew', 12, 15), VTr('sugar*24', null, 'emerald', 12, 30)],
    [VTr('emerald*3', null, 'golden_carrot*3', 12, 30), VTr('emerald*4', null, 'glistering_melon_slice*3', 12, 30)]],
  fisherman: [[VTr('string*20', null, 'emerald', 16, 2), VTr('coal*10', null, 'emerald', 16, 2), VTr('emerald', 'cod*6', 'cooked_cod*6', 16, 1)],
    [VTr('cod*15', null, 'emerald', 16, 10), VTr('emerald', 'salmon*6', 'cooked_salmon*6', 16, 5)],
    [VTr('salmon*13', null, 'emerald', 16, 20), VTr('emerald*8-22', null, 'ench:fishing_rod', 3, 10, 0.2)],
    [VTr('tropical_fish*6', null, 'emerald', 12, 30)],
    [VTr('pufferfish*4', null, 'emerald', 12, 30), VTr('boat', null, 'emerald', 12, 30)]],
  fletcher: [[VTr('stick*32', null, 'emerald', 16, 2), VTr('emerald', null, 'arrow*16', 12, 1), VTr('emerald', 'gravel*10', 'flint*10', 12, 1)],
    [VTr('flint*26', null, 'emerald', 12, 10), VTr('emerald*2', null, 'bow', 12, 5, 0.2)],
    [VTr('string*14', null, 'emerald', 16, 20), VTr('emerald*3', null, 'crossbow', 12, 10, 0.2)],
    [VTr('feather*24', null, 'emerald', 12, 30), VTr('emerald*7-21', null, 'ench:bow', 3, 15, 0.2)],
    [VTr('tripwire_hook*8', null, 'emerald', 12, 30), VTr('emerald*8-22', null, 'ench:crossbow', 3, 15, 0.2), VTr('emerald*2', 'arrow*5', 'tipped_arrow*5', 12, 30)]],
  leatherworker: [[VTr('leather*6', null, 'emerald', 16, 2), VTr('emerald*3', null, 'leather_leggings', 12, 1, 0.2), VTr('emerald*7', null, 'leather_chestplate', 12, 1, 0.2)],
    [VTr('flint*26', null, 'emerald', 12, 10), VTr('emerald*5', null, 'leather_helmet', 12, 5, 0.2), VTr('emerald*4', null, 'leather_boots', 12, 5, 0.2)],
    [VTr('rabbit_hide*9', null, 'emerald', 12, 20), VTr('emerald*7', null, 'leather_chestplate', 12, 10, 0.2)],
    [VTr('turtle_scute*4', null, 'emerald', 12, 30), VTr('emerald*6', null, 'leather_horse_armor', 12, 15, 0.2)],
    [VTr('emerald*6', null, 'saddle', 12, 30, 0.2), VTr('emerald*5', null, 'leather_helmet', 12, 30, 0.2)]],
  librarian: [[VTr('paper*24', null, 'emerald', 16, 2), VTr('emerald*9', null, 'bookshelf', 12, 1), VTr('emerald', 'book', 'book', 12, 1, 0.2)],
    [VTr('book*4', null, 'emerald', 12, 10), VTr('emerald', 'book', 'book', 12, 5, 0.2), VTr('emerald', null, 'glass*4', 12, 5)],
    [VTr('ink_sac*5', null, 'emerald', 12, 20), VTr('emerald', null, 'glass*4', 12, 10), VTr('emerald', 'book', 'book', 12, 10, 0.2)],
    [VTr('book*2', null, 'emerald', 12, 30), VTr('emerald*5', null, 'clock', 12, 15), VTr('emerald*4', null, 'compass', 12, 15), VTr('emerald', 'book', 'book', 12, 15, 0.2)],
    [VTr('emerald*20', null, 'name_tag', 12, 30)]],
  mason: [[VTr('clay_ball*10', null, 'emerald', 16, 2), VTr('emerald', null, 'brick*10', 16, 1)],
    [VTr('stone*20', null, 'emerald', 16, 10), VTr('emerald', null, 'stone_bricks*4', 16, 5)],
    [VTr('granite*16', null, 'emerald', 16, 20), VTr('andesite*16', null, 'emerald', 16, 20), VTr('diorite*16', null, 'emerald', 16, 20), VTr('emerald', null, 'andesite*4', 16, 10), VTr('emerald', null, 'granite*4', 16, 10), VTr('emerald', null, 'diorite*4', 16, 10)],
    [VTr('quartz*12', null, 'emerald', 12, 30), VTr('emerald', null, 'tuff_bricks*4', 12, 15)],
    [VTr('emerald', null, 'quartz_block', 12, 30)]],
  shepherd: [[VTr('wool*18', null, 'emerald', 16, 2), VTr('emerald*2', null, 'shears', 12, 1)],
    [VTr('string*16', null, 'emerald', 16, 10), VTr('emerald', null, 'wool', 16, 5)],
    [VTr('feather*12', null, 'emerald', 16, 20), VTr('emerald*3', null, 'bed', 12, 10)],
    [VTr('ink_sac*12', null, 'emerald', 16, 30), VTr('emerald*2', null, 'wool*3', 12, 15)],
    [VTr('emerald*3', null, 'bed', 12, 30)]],
  toolsmith: [[VTr('coal*15', null, 'emerald', 16, 2), VTr('emerald', null, 'stone_axe', 12, 1, 0.2), VTr('emerald', null, 'stone_shovel', 12, 1, 0.2), VTr('emerald', null, 'stone_pickaxe', 12, 1, 0.2), VTr('emerald', null, 'stone_hoe', 12, 1, 0.2)],
    [VTr('iron_ingot*4', null, 'emerald', 12, 10), VTr('emerald*4', null, 'iron_shovel', 12, 5, 0.2)],
    [VTr('flint*30', null, 'emerald', 12, 20), VTr('emerald*1-15', null, 'ench:iron_axe', 3, 10, 0.2), VTr('emerald*2-16', null, 'ench:iron_shovel', 3, 10, 0.2), VTr('emerald*3-17', null, 'ench:iron_pickaxe', 3, 10, 0.2), VTr('emerald*4', null, 'diamond_hoe', 3, 10, 0.2)],
    [VTr('diamond', null, 'emerald', 12, 30), VTr('emerald*12-26', null, 'ench:diamond_axe', 3, 15, 0.2), VTr('emerald*5-19', null, 'ench:diamond_shovel', 3, 15, 0.2)],
    [VTr('emerald*13-27', null, 'ench:diamond_pickaxe', 3, 30, 0.2)]],
  weaponsmith: [[VTr('coal*15', null, 'emerald', 16, 2), VTr('emerald*3', null, 'iron_axe', 12, 1, 0.2), VTr('emerald*2-16', null, 'ench:iron_sword', 12, 1, 0.2)],
    [VTr('iron_ingot*4', null, 'emerald', 12, 10), VTr('emerald*4', null, 'iron_spear', 12, 5, 0.2)],
    [VTr('flint*24', null, 'emerald', 12, 20)],
    [VTr('diamond', null, 'emerald', 12, 30), VTr('emerald*12-26', null, 'ench:diamond_axe', 3, 15, 0.2)],
    [VTr('emerald*8-22', null, 'ench:diamond_sword', 3, 30, 0.2)]],
};
for (const k in PROFS) PROFS[k].wsId = () => B[PROFS[k].ws.toUpperCase()];
if (BL[B.CAULDRON]) BL[B.CAULDRON].job = 'leatherworker'; if (BL[B.SMITHING_TABLE]) BL[B.SMITHING_TABLE].job = 'toolsmith';
const PROF_OF_BLOCK = {}; for (const k in PROFS) PROF_OF_BLOCK[B[PROFS[k].ws.toUpperCase()]] = k;
function parseCost(str, r) { if (!str) return null; const [k, n] = str.split('*'); let c = 1, hi = 0; if (n) { const [a, b] = n.split('-').map(Number); c = a; hi = b || 0; } return { k, n: c, hi }; }
// turn a spec into a concrete offer (rolled once, when the villager reaches that level)
function makeOffer(spec, r) {
  const a = parseCost(spec.a), b = parseCost(spec.b), s = parseCost(spec.s);
  const o = { a: { id: IT[a.k], n: a.n }, b: b ? { id: IT[b.k], n: b.n } : null, s: { id: 0, n: s.n }, uses: 0, max: spec.u, xp: spec.x, mult: spec.m, demand: 0, spec: 0 };
  if (s.k.startsWith('ench:')) { const key = s.k.slice(5); const lvl = 5 + Math.floor(r() * 15); o.s.id = IT[key]; if (o.s.id == null) return null; const list = rollEnchants(o.s.id, lvl, (r() * 1e9) | 0); if (list.length) { o.s.ench = {}; for (const [e, l] of list) o.s.ench[e] = l; } if (a.hi) o.a.n = Math.min(64, Math.round(a.n + (lvl - 5) / 14 * (a.hi - a.n))); }
  else if (s.k === 'book' && b && b.k === 'book') { // librarian: a random enchanted book; price 2 + random(5 + 10 x level) + 3 x level, doubled for treasure
    const keys = Object.keys(ENCH).filter(k => !ENCH[k].curse && !ENCH[k].noTrade); const e = keys[(r() * keys.length) | 0]; const E = ENCH[e]; const lvl = 1 + Math.floor(r() * E.max);
    let price = 2 + Math.floor(r() * (5 + lvl * 10)) + 3 * lvl; if (E.treasure) price *= 2; o.a.n = Math.min(64, price); o.s.id = IT.enchanted_book; o.s.ench = { [e]: lvl }; }
  else if (s.k.startsWith('map:')) { o.s.id = IT[{ ocean_monument: 'ocean_explorer_map', woodland_mansion: 'woodland_explorer_map', trial_chambers: 'trial_explorer_map' }[s.k.slice(4)]]; o.s.map = s.k.slice(4); }
  else if (s.k === 'tipped_arrow') { if (IT.tipped_arrow == null || typeof POTIONS === 'undefined') return null; o.s.id = IT.tipped_arrow; const keys = Object.keys(POTIONS).filter(k => POTIONS[k].effect); o.s.pot = keys[(r() * keys.length) | 0]; }
  else { o.s.id = IT[s.k]; if (a.hi) o.a.n = a.n + Math.floor(r() * (a.hi - a.n + 1)); }
  if (o.a.id == null || o.s.id == null || (o.b && o.b.id == null)) return null;
  return o;
}
function offerPrice(o) { const base = o.a.n; const up = Math.max(0, Math.floor(base * o.demand * o.mult)); const disc = (o.disc || 0); return clamp(base + up - disc, 1, stackMax(o.a.id)); }
function offerItem(o) { const s = { id: o.s.id, count: o.s.n }; if (o.s.ench) s.ench = Object.assign({}, o.s.ench); if (o.s.pot) s.pot = o.s.pot; if (o.s.map) s.name = ITEMS[o.s.id].name; return s; }
// ---------- villager data ----------
function vData(m) {
  if (m.vd) return m.vd; const rec = m.opts && m.opts.rec; if (rec && rec.vd) { m.vd = rec.vd; return m.vd; }
  m.vd = { prof: null, nit: Math.random() < 0.04, lvl: 1, xp: 0, offers: [], ws: null, restocks: 0, rday: -1, seed: (Math.random() * 1e9) | 0 }; return m.vd;
}
function setProfession(m, prof) {
  const v = vData(m); v.prof = prof; v.offers = []; v.lvl = 1; v.xp = 0; if (prof) addLevelOffers(m, 1); dressVillager(m);
}
function addLevelOffers(m, lvl) {
  const v = vData(m); const pool = (VT[v.prof] || [])[lvl - 1] || []; const r = mulberry32((v.seed ^ (lvl * 7919)) >>> 0);
  const picks = pool.slice(); for (let i = picks.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [picks[i], picks[j]] = [picks[j], picks[i]]; }
  let added = 0; for (const sp of picks) { if (added >= 2) break; const o = makeOffer(sp, r); if (o) { o.lvl = lvl; v.offers.push(o); added++; } }
}
// outfits: an apron, a hat or a coloured robe over the plain villager
function dressVillager(m) {
  if (m.outfit) { m.outfit.forEach(o => o.parent && o.parent.remove(o)); } m.outfit = []; const v = vData(m); const P = v.nit ? NITWIT : PROFS[v.prof]; if (!P || !m.root) return;
  const root = m.body || m.root; const g = pivot(root, 0, 0, 0); m.outfit.push(g); const add = (par, w, h, d, x, y, z, key, col, o) => sbox(m, par, w, h, d, x, y, z, key, fur(col, 5, o || {}));
  if (P.robe) add(g, 0.56, 0.99, 0.38, 0, 1.0, 0, 'vo_robe' + P.robe.join('_'), P.robe, { extra: (f, set, fw, fh) => { if (f === 'front') for (let y = 2; y < fh - 1; y++) set(fw >> 1, y, mixc(P.robe, [255, 255, 255], 0.3)); } });
  if (P.apron) add(g, 0.5, 0.7, 0.03, 0, 0.88, 0.19, 'vo_apron' + P.apron.join('_'), P.apron, { extra: P.band ? (f, set, fw) => { for (let x = 0; x < fw; x++) set(x, 1, P.band); } : null });
  if (m.head) { const hg = pivot(m.head, 0, 0, 0); m.outfit.push(hg);
    if (P.hat) { add(hg, P.brim || 0.62, 0.05, P.brim || 0.62, 0, 0.57, 0, 'vo_brim' + P.hat.join('_') + (P.brim || 0), P.hat); add(hg, 0.48, P.tall ? 0.32 : 0.16, 0.48, 0, P.tall ? 0.72 : 0.64, 0, 'vo_hat' + P.hat.join('_') + (P.tall ? 't' : ''), P.hat); if (P.feather) add(hg, 0.04, 0.3, 0.12, 0.26, 0.78, 0, 'vo_feather', [240, 240, 240]); }
    if (P.mask) add(hg, 0.5, 0.22, 0.04, 0, 0.36, 0.25, 'vo_mask', [40, 40, 44], { extra: (f, set, fw) => { if (f === 'front') for (let x = 1; x < fw - 1; x++) set(x, 1, [120, 200, 220]); } });
    if (P.patch) add(hg, 0.14, 0.12, 0.03, 0.12, 0.33, 0.245, 'vo_patch', [20, 20, 20]); }
  for (const o of m.outfit) o.traverse(q => { if (q.isMesh) q.layers.enable(1); });
}
// ---------- the villager's day ----------
function isWorkTime() { const t = S.time * 24000; return t >= 2000 && t < 9000; }
function findJobSite(m) {
  const cx = Math.floor(m.pos.x), cy = Math.floor(m.pos.y), cz = Math.floor(m.pos.z); let best = null, bd = 1e9; const claims = world.jobClaims || (world.jobClaims = new Map());
  const want = vData(m).prof; // an experienced villager only looks for its own kind of job site
  for (let dx = -16; dx <= 16; dx++) for (let dz = -16; dz <= 16; dz++) for (let dy = -4; dy <= 4; dy++) {
    const id = world.get(cx + dx, cy + dy, cz + dz); const p = PROF_OF_BLOCK[id]; if (!p || (want && p !== want)) continue;
    const k = (cx + dx) + ',' + (cy + dy) + ',' + (cz + dz); const c = claims.get(k); if (c && c !== m && !c.dead && !c.gone) continue;
    const d = dx * dx + dz * dz + dy * dy * 4; if (d < bd) { bd = d; best = [k, p]; }
  }
  return best;
}
function villagerTick(m, dt) {
  const v = vData(m); if (!m.dressed) { m.dressed = true; dressVillager(m); if (v.ws) (world.jobClaims || (world.jobClaims = new Map())).set(v.ws, m); }
  if (isClientMP()) return false;
  v.t = (v.t || Math.random() * 3) - dt; v.gCD = Math.max(0, (v.gCD || 0) - dt);
  if (v.t <= 0) { v.t = 3 + Math.random() * 2;
    // job: keep or lose the job site, or look for one
    if (v.ws) { const [x, y, z] = v.ws.split(',').map(Number); if (world.loaded(x, z) && PROF_OF_BLOCK[world.get(x, y, z)] !== v.prof) { world.jobClaims && world.jobClaims.delete(v.ws); v.ws = null; if (v.xp === 0 && v.lvl === 1 && !v.offers.some(o => o.uses)) { setProfession(m, null); Particles.emit(m.pos.x, m.pos.y + 2, m.pos.z, 6, [[0.5, 0.5, 0.5]], 1, 0.6, 0, 0.6); } } }
    if (!v.ws && !v.nit) { const f = findJobSite(m); if (f) { v.ws = f[0]; world.jobClaims.set(f[0], m); if (!v.prof) { setProfession(m, f[1]); Particles.emit(m.pos.x, m.pos.y + 2.1, m.pos.z, 8, [[0.3, 0.9, 0.3]], 1, 0.7, 0, 0.6); Sfx.at('hmm', m.pos, 0.8, 1.2); } } }
    // iron golems
    golemCheck(m);
  }
  // working hours: go to the job site, restock there (twice a day at most)
  if (v.ws && isWorkTime() && !m.tradingWith) { const [x, y, z] = v.ws.split(',').map(Number); const tp = new V3(x + 0.5, y, z + 0.5); const d = m.pos.distanceTo(tp);
    if (d > 2.2 && d < 48) { if (Math.random() < dt * 0.8) steerTo(m, tp, 1.6); }
    else if (d <= 2.6) { if (v.rday !== S.day) { v.rday = S.day; v.restocks = 0; } if (v.restocks < 2 && v.offers.some(o => o.uses > 0) && (v.lastR == null || G.simT - v.lastR > 30)) { restock(m); v.restocks++; v.lastR = G.simT; } } }
  return false;
}
function restock(m) { const v = vData(m); for (const o of v.offers) { o.demand = Math.max(0, o.demand + o.uses - (o.max - o.uses)); o.uses = 0; } Particles.emit(m.pos.x, m.pos.y + 2, m.pos.z, 4, [[0.4, 1, 0.4]], 1, 0.5, 0, 0.5); }
// demand slowly falls back when nobody trades (Minecraft lowers it at each restock)
function golemCheck(m) {
  if (!S.rules.doMobSpawning || m.baby) return; const v = vData(m); if (v.gCD > 0) return;
  const near = G.mobs.filter(o => o.type === 'villager' && !o.dead && !o.baby && o.pos.distanceTo(m.pos) < 10 && !(vData(o).gCD > 0));
  // every villager that can see a golem (16 blocks) remembers it for 30 s and won't help summon
  for (const o of near) if (G.mobs.some(g => g.type === 'iron_golem' && !g.dead && g.pos.distanceTo(o.pos) < 16)) vData(o).gCD = 30;
  if (v.gCD > 0) return; const ready = near.filter(o => !(vData(o).gCD > 0));
  if (ready.length < 3) return;
  for (let t = 0; t < 10; t++) { const x = Math.floor(m.pos.x + (Math.random() - 0.5) * 16), z = Math.floor(m.pos.z + (Math.random() - 0.5) * 16);
    for (let y = Math.floor(m.pos.y) + 6; y >= Math.floor(m.pos.y) - 6; y--) if (world.solid(x, y - 1, z) && !world.solid(x, y, z) && !world.solid(x, y + 1, z) && !world.solid(x, y + 2, z) && !BL[world.get(x, y, z)].fluid && !BL[world.get(x, y - 1, z)].leaves) {
      const g = spawnShared('iron_golem', x + 0.5, y, z + 0.5); if (g) g.home = [m.pos.x, m.pos.z]; for (const o of near) vData(o).gCD = 30; return; } }
}
{ const prev = MOBS.villager.tick; MOBS.villager.tick = function (m, dt) { if (prev && prev(m, dt)) return true; return villagerTick(m, dt); }; }
MOBS.villager.persist = true;
// saved with the world
{ const _mr = mobRecord; mobRecord = function (m) { const r = _mr(m); if (m.type === 'villager' && m.vd) r.vd = m.vd; if (m.customName) r.nm = m.customName; return r; };
  const _mf = mobFromRecord; mobFromRecord = function (rec) { const m = _mf(rec); if (m && rec.nm) m.customName = rec.nm; return m; }; }
// ---------- trading screen ----------
function openTrade(m) {
  const v = vData(m); if (!v.prof || !v.offers.length) { Sfx.at('hmm', m.pos, 0.8, 0.8); m.headShake = 1; return; }
  const slots = [null, null, null]; let sel = 0; m.tradingWith = true; m.wMove = 0;
  const pn = S.panel = { title: PROFS[v.prof].name + ' - ' + VLEVELS[v.lvl - 1], slots, output: 2, ghosts: [null, null, null], accept: (i) => i < 2, single: false,
    changed: () => update(),
    take: (shift) => { let n = 0; do { const o = matchOffer(); if (!o) break; const item = offerItem(o); if (shift) { if (addItem(item.id, item.count, xtra(item))) break; } else { if (S.cursor) { if (S.cursor.id !== item.id || xtra(S.cursor) || xtra(item) || S.cursor.count + item.count > stackMax(item.id)) break; S.cursor.count += item.count; } else S.cursor = item; }
        pay(o); doTrade(m, o); n++; } while (shift && n < 64); update(); },
    layout: (body) => {
      body.style.flexDirection = 'row'; body.style.alignItems = 'flex-start'; body.style.gap = '10px';
      const list = document.createElement('div'); list.className = 'tradeList'; list.style.cssText = 'display:flex;flex-direction:column;gap:3px;max-height:230px;overflow-y:auto;padding-right:4px'; body.appendChild(list); pn.list = list;
      const right = document.createElement('div'); right.style.cssText = 'display:flex;flex-direction:column;gap:8px;align-items:flex-start'; body.appendChild(right);
      const bar = document.createElement('div'); bar.style.cssText = 'width:180px;height:6px;background:#333;border:1px solid #111'; bar.innerHTML = '<div style="height:100%;background:#7c3;width:0"></div>'; right.appendChild(bar); pn.bar = bar;
      const row = document.createElement('div'); row.className = 'crow'; row.style.gap = '6px'; right.appendChild(row);
      makeSlot('panel', 0, row); makeSlot('panel', 1, row); const arr = document.createElement('img'); arr.className = 'arrowimg'; arr.src = UI_ICON.arrowR; row.appendChild(arr); makeSlot('panel', 2, row);
      const note = document.createElement('div'); note.style.cssText = 'font-size:12px;color:#444;max-width:190px'; right.appendChild(note); pn.note = note;
      renderList(); update();
    },
    onClose: () => { for (let i = 0; i < 2; i++) if (slots[i]) giveOrDrop(slots[i].id, slots[i].count, xtra(slots[i])); m.tradingWith = false; levelCheck(m); } };
  function renderList() {
    const list = pn.list; if (!list) return; list.innerHTML = '';
    v.offers.forEach((o, i) => {
      const b = document.createElement('div'); b.style.cssText = 'display:flex;align-items:center;gap:2px;padding:2px 4px;cursor:pointer;border:2px solid ' + (i === sel ? '#fff' : 'transparent') + ';background:' + (o.uses >= o.max ? '#a66' : '#8b8b8b');
      const price = offerPrice(o); const icon = (s) => { const el = newSlotEl(b, 'mini'); el.style.transform = 'scale(0.8)'; el.style.margin = '-4px'; paintSlot(el, s); return el; };
      const ea = icon({ id: o.a.id, count: price }); if (price !== o.a.n) ea.title = 'was ' + o.a.n;
      if (o.b) icon({ id: o.b.id, count: o.b.n }); else { const sp = document.createElement('span'); sp.style.width = '36px'; b.appendChild(sp); }
      const ar = document.createElement('span'); ar.textContent = o.uses >= o.max ? ' X ' : ' > '; ar.style.cssText = 'font-weight:bold;color:' + (o.uses >= o.max ? '#d22' : '#333') + ';padding:0 4px'; b.appendChild(ar);
      const so = icon(offerItem(o)); so.addEventListener('pointerenter', () => showTip(itemTooltip(offerItem(o)))); so.addEventListener('pointerleave', () => showTip(null));
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); sel = i; fillFor(o); renderList(); update(); Sfx.play('click', 0.4); });
      list.appendChild(b);
    });
  }
  // clicking an offer moves what it costs from your inventory into the payment slots
  function fillFor(o) {
    for (let i = 0; i < 2; i++) if (slots[i]) { giveOrDrop(slots[i].id, slots[i].count, xtra(slots[i])); slots[i] = null; }
    const take = (id, want) => { let got = 0; for (let i = 0; i < 36 && got < want; i++) { const s = player.inv[i]; if (s && s.id === id && !xtra(s)) { const k = Math.min(want - got, s.count); s.count -= k; got += k; if (!s.count) player.inv[i] = null; } } return got; };
    const price = offerPrice(o); const a = take(o.a.id, Math.min(stackMax(o.a.id), price * 4 > stackMax(o.a.id) ? stackMax(o.a.id) : Math.max(price, Math.min(stackMax(o.a.id), countItem(o.a.id))))); if (a) slots[0] = { id: o.a.id, count: a };
    if (o.b) { const b = take(o.b.id, Math.min(stackMax(o.b.id), countItem(o.b.id))); if (b) slots[1] = { id: o.b.id, count: b }; }
    invDirty();
  }
  function matchOffer() {
    const order = [v.offers[sel], ...v.offers]; for (const o of order) { if (!o || o.uses >= o.max) continue; const price = offerPrice(o);
      const A = slots[0], Bs = slots[1]; const okA = A && A.id === o.a.id && A.count >= price && !(A.ench); const okB = o.b ? (Bs && Bs.id === o.b.id && Bs.count >= o.b.n) : !Bs || true;
      if (okA && (o.b ? okB : true)) return o; }
    return null;
  }
  function pay(o) { const price = offerPrice(o); slots[0].count -= price; if (!slots[0].count) slots[0] = null; if (o.b) { slots[1].count -= o.b.n; if (!slots[1].count) slots[1] = null; } }
  function update() { const o = matchOffer(); slots[2] = o ? offerItem(o) : null;
    if (pn.bar) { const lo = VXP[v.lvl - 1], hi = VXP[v.lvl] || VXP[4]; pn.bar.firstChild.style.width = (v.lvl >= 5 ? 100 : clamp((v.xp - lo) / (hi - lo), 0, 1) * 100) + '%'; }
    if (pn.note) { const so = v.offers[sel]; pn.note.textContent = so ? (so.uses >= so.max ? 'Out of stock until the villager restocks at its job site' : (so.max - so.uses) + ' trades left') : ''; }
    if (S.uiOpen === 'panel') { renderInvUI(); } }
  pn.refresh = () => { renderList(); update(); };
  openUI('panel'); Sfx.at('hmm', m.pos, 0.8, 1.1);
}
function doTrade(m, o) {
  const v = vData(m); o.uses++; v.xp += o.xp; spawnOrbRange(m.pos.x, m.pos.y + 1, m.pos.z, 3, 6);
  Sfx.at('hmm', m.pos, 0.6, 1.3); Particles.emit(m.pos.x, m.pos.y + 2, m.pos.z, 3, [[0.4, 1, 0.4]], 1, 0.5, 0, 0.5);
  if (S.panel && S.panel.refresh) S.panel.refresh();
}
function levelCheck(m) { const v = vData(m); let up = false; while (v.lvl < 5 && v.xp >= VXP[v.lvl]) { v.lvl++; addLevelOffers(m, v.lvl); up = true; }
  if (up) { Particles.emit(m.pos.x, m.pos.y + 1.2, m.pos.z, 30, [[0.6, 0.3, 0.9], [0.3, 0.9, 0.4]], 2, 1.2, -1, 1.2); Sfx.at('levelup', m.pos, 0.5, 1.4); toast(PROFS[v.prof].name + ' is now ' + VLEVELS[v.lvl - 1], 2); } }
{ const _mi = mobInteract; mobInteract = function (m, sneaking) {
    if (m.type === 'villager' && !m.dead && !m.baby) { const h = player.held(); if (h && h.id === IT.name_tag) return _mi(m, sneaking); if (isClientMP()) { toast('Only the host can trade for now', 1.5); return true; } openTrade(m); return true; }
    return _mi(m, sneaking);
  }; }
// name tags: a named mob keeps its name and never despawns
{ const _mi = mobInteract; mobInteract = function (m, sneaking) {
    const h = player.held(); if (h && h.id === IT.name_tag && !m.dead) { if (!h.name) { toast('Name the tag on an anvil first', 1.5); return true; } m.customName = h.name; m.namedPersist = true; useHeld(1); toast(m.t.name + ' is now called ' + h.name, 2); S.swing = 1; return true; }
    return _mi(m, sneaking);
  }; }
{ const _mp = mobPersistent; mobPersistent = function (m) { if (m && m.customName && !m.dead && !m.gone) return true; return _mp(m); }; }
// ---------- small items: compass, clock, explorer maps, bottle o' enchanting ----------
const DIRS8 = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
function dirName(dx, dz) { const a = Math.atan2(dx, -dz); return DIRS8[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8]; }
function locateQuiet(kind) { // runs /locate and reads the coordinates it prints
  const P = player.pos; const _cp = chatPrint; let got = null; chatPrint = function (t) { const mm = /\[(-?\d+), [^,]+, (-?\d+)\]/.exec(String(t)); if (mm) got = [+mm[1], +mm[2]]; };
  try { runCommand('locate structure ' + kind, { player, local: true, quiet: true }); } catch (e) { } finally { chatPrint = _cp; } return got;
}
{ const _ua = useAction; useAction = function (eye, dir) { const h = player.held(); const hd = h && ITEMS[h.id]; const sneaking = kd('sneak');
    if (hd && !(target && !sneaking && BL[target.id].use) && !targetMob) {
      if (hd.kind === 'compass') { mouseR = false; const sp = player.spawnPoint || player.spawn; if (world.dim !== 'overworld') toast('The needle spins wildly', 2); else { const dx = sp.x - player.pos.x, dz = sp.z - player.pos.z; toast('Spawn: ' + Math.round(Math.hypot(dx, dz)) + ' blocks to the ' + dirName(dx, dz), 2.5); } return; }
      if (hd.kind === 'clock') { mouseR = false; if (world.dim !== 'overworld') { toast('The clock spins wildly', 2); return; } const hrs = (S.time * 24 + 6) % 24; toast('Time: ' + String(Math.floor(hrs)).padStart(2, '0') + ':' + String(Math.floor((hrs % 1) * 60)).padStart(2, '0') + ' (day ' + S.day + ')', 2.5); return; }
      if (hd.kind === 'explorer_map') { mouseR = false; const kind = { ocean_explorer_map: 'ocean_monument', woodland_explorer_map: 'woodland_mansion', trial_explorer_map: 'trial_chambers' }[hd.key];
        if (world.dim !== 'overworld') { toast('This map is of the Overworld', 2); return; }
        if (!h.target) { const at = locateQuiet(kind); if (!at) { toast('The map is blank', 2); return; } h.target = at; }
        const dx = h.target[0] - player.pos.x, dz = h.target[1] - player.pos.z; const d = Math.round(Math.hypot(dx, dz));
        toast(d < 24 ? 'You are there: X marks the spot' : 'X marks the spot ' + d + ' blocks to the ' + dirName(dx, dz) + ' (' + h.target[0] + ', ' + h.target[1] + ')', 3); return; }
      if (hd.kind === 'xp_bottle') { mouseR = false; useHeld(1); const p = spawnProj('xpbottle', eye.clone().addScaledVector(dir, 0.5), dir.clone().multiplyScalar(14).add(new V3(0, 3, 0)), 'player', 0); Sfx.play('bow', 0.4, 0.8); S.swing = 1; S.useCD = 0.3; return; }
    }
    return _ua(eye, dir); }; }
PROJ.xpbottle = { grav: 14, size: 0.22, color: 0x8be060, trail: [[0.6, 1, 0.4]] };
{ const _pi = projImpact; projImpact = function (a, mob) { if (a.kind !== 'xpbottle') return _pi(a, mob); a.done = true; Sfx.play('glass', 0.5); Particles.emit(a.pos.x, a.pos.y, a.pos.z, 20, [[0.4, 0.6, 1], [0.6, 1, 0.4]], 2, 0.6, 2, 0.8); spawnOrbRange(a.pos.x, a.pos.y + 0.3, a.pos.z, 3, 11); }; }
// item data that has to survive moving between slots
{ const _x = xtra; xtra = function (s) { const o = _x(s); if (!s || (s.target == null && s.pot == null)) return o; const r = o || {}; if (s.target) r.target = s.target; if (s.pot) r.pot = s.pot; return r; }; }

// village golems patrol their village: with nothing to fight they head back when more than 20 blocks from home
{ const prev = MOBS.iron_golem.tick; MOBS.iron_golem.tick = function (m, dt) { m.goalBoost = false; if (prev && prev(m, dt)) return true;
    if (!m.home && !m.playerMade) { const vil = G.mobs.find(o => o.type === 'villager' && !o.dead && o.pos.distanceTo(m.pos) < 32); if (vil) m.home = [vil.pos.x, vil.pos.z]; }
    if (m.home && !(m.angry > 0) && !m.goalBoost) { const dx = m.home[0] - m.pos.x, dz = m.home[1] - m.pos.z; if (dx * dx + dz * dz > 400 && Math.random() < dt) steerTo(m, new V3(m.home[0], m.pos.y, m.home[1]), 8); }
    return false; }; }
{ const _mr = mobRecord; mobRecord = function (m) { const r = _mr(m); if (m.home) r.hm = m.home.map(v => Math.round(v)); if (m.playerMade) r.pm = 1; return r; };
  const _mf = mobFromRecord; mobFromRecord = function (rec) { const m = _mf(rec); if (m && rec.hm) m.home = rec.hm; if (m && rec.pm) m.playerMade = true; return m; }; }

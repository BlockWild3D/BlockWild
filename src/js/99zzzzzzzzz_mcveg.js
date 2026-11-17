// ================= MINECRAFT VEGETATION (Minecraft worlds) =================
// Trees, flowers, grass, mushrooms, cactus, sugar cane, pumpkins, melons, berries, bamboo, kelp, seagrass, sea pickles,
// lily pads, fallen trees ... come from Minecraft 26.3's vegetal_decoration step (02g_mcveg_data.js): each biome's list of
// placed features, their placement modifiers (count, rarity, in_square, heightmap, offsets, noise counts, water depth,
// block predicates, biome check) and configured features (simple_block, block_column, tree, fallen_tree, selectors,
// huge mushrooms, bamboo). Tree shapes go through mcTree (Minecraft's trunk and foliage placers) with the tree's own
// numbers from the data; cherry, mangrove and azalea use the game's builders. The classic generator's trees and plants
// are left out of Minecraft worlds. Not done here: cave vegetation (lush caves keep BlockWild's), vines on trunks other
// than via mcTree, glow lichen, root systems; random numbers are BlockWild's own (same world every time, not Java's).
const MCV = (() => {
  const D = MCV_DATA; const nm = (s) => String(s).replace('minecraft:', '');
  const TAG = {}; for (const k in D.tags) TAG[k] = new Set(D.tags[k]);
  const inTag = (t, n) => { const s = TAG[nm(t).replace('#', '')]; return !!(s && s.has(n)); };
  const ALIAS = { oak_log: 'LOG', oak_leaves: 'LEAVES', grass_block: 'GRASS', short_grass: 'TALL_GRASS', grass: 'TALL_GRASS', poppy: 'ROSE', dandelion: 'DANDELION', oak_wood: 'WOOD' };
  const idOf = (n) => { n = nm(n); const k = ALIAS[n] || n.toUpperCase(); return B[k]; };
  // global feature order (Minecraft decorates in a fixed order per step)
  const ORDER = []; const SEEN = new Set(); for (const b of Object.keys(D.biomes).sort()) for (const f of D.biomes[b]) if (!SEEN.has(f)) { SEEN.add(f); ORDER.push(f); }
  const BSET = {}; for (const b in D.biomes) BSET[b] = new Set(D.biomes[b]);
  const anchor = (a) => a == null ? 0 : typeof a === 'number' ? a : a.absolute !== undefined ? a.absolute : a.above_bottom !== undefined ? -64 + a.above_bottom : a.below_top !== undefined ? 319 - a.below_top : 0;
  const ri = (r, a, b) => a + ((r() * (b - a + 1)) | 0);
  function intp(p, r) {
    if (p == null) return 0; if (typeof p === 'number') return p;
    switch (nm(p.type || 'constant')) {
      case 'constant': return p.value ?? 0;
      case 'uniform': return ri(r, p.min_inclusive ?? p.min ?? 0, p.max_inclusive ?? p.max ?? 0);
      case 'biased_to_bottom': { const a = p.min_inclusive ?? 0, b = p.max_inclusive ?? 0; return a + ((r() * (((r() * (b - a + 1)) | 0) + 1)) | 0); }
      case 'clamped': return Math.max(p.min_inclusive, Math.min(p.max_inclusive, intp(p.source, r)));
      case 'clamped_normal': { const g = Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r()); return Math.max(p.min_inclusive, Math.min(p.max_inclusive, Math.round(p.mean + g * p.deviation))); }
      case 'weighted_list': { const L = p.distribution || []; let t = 0; for (const e of L) t += e.weight ?? 1; let q = r() * t; for (const e of L) { q -= e.weight ?? 1; if (q < 0) return intp(e.data, r); } return 0; }
      case 'trapezoid': { const a = p.min ?? 0, b = p.max ?? 0, pl = p.plateau ?? 0; const range = b - a, k1 = Math.floor((range - pl) / 2), k2 = range - k1; return a + ri(r, 0, k1) + ri(r, 0, k2); }
    }
    return 0;
  }
  function heightp(p, r) { if (p == null) return 0; if (p.absolute !== undefined || p.above_bottom !== undefined || p.below_top !== undefined) return anchor(p);
    const t = nm(p.type || 'constant'); if (t === 'constant') return anchor(p.value); const a = anchor(p.min_inclusive), b = anchor(p.max_inclusive);
    if (t === 'trapezoid') { const pl = p.plateau ?? 0; const range = b - a, k1 = Math.floor((range - pl) / 2); return a + ri(r, 0, k1) + ri(r, 0, range - k1); }
    if (t === 'biased_to_bottom' || t === 'very_biased_to_bottom') return a + ((r() * (((r() * (b - a + 1)) | 0) + 1)) | 0);
    return ri(r, a, b); }
  // world view during one chunk's decoration: Minecraft column summaries + what was placed this run
  class View {
    constructor(world, m, S) { this.w = world; this.m = m; this.G = m.gen(); this.S = S; this.placed = new Map(); this.names = m.names || ['air', 'stone', 'water', 'lava'].concat(this.G.palette); }
    sum(x, z) { return this.m.summary(x >> 4, z >> 4); }
    top(x, z) { return this.sum(x, z).top[(z & 15) * 16 + (x & 15)]; }
    floor(x, z) { return this.sum(x, z).floor[(z & 15) * 16 + (x & 15)]; }
    block(x, y, z) {
      const k = x + ',' + y + ',' + z; const p = this.placed.get(k); if (p) return p;
      const s = this.sum(x, z), j = (z & 15) * 16 + (x & 15); const t = s.top[j], f = s.floor[j];
      if (y > t) return 'air'; if (y > f) return 'water'; if (y === f) return this.names[s.surf[j]] || 'stone';
      if (y >= -64 && y < 320 && this.m.cave(x, y + YOFF, z)) return 'cave_air'; return y >= f - 3 ? 'dirt' : 'stone';
    }
    height(type, x, z) { type = String(type || 'WORLD_SURFACE_WG'); return (/OCEAN_FLOOR/.test(type) ? this.floor(x, z) : this.top(x, z)) + 1; }
    put(x, y, z, name, hard) { const id = typeof name === 'number' ? name : idOf(name); if (id === undefined || y < -63 || y > 318) return false;
      this.placed.set(x + ',' + y + ',' + z, typeof name === 'number' ? (BL[id] && BL[id].key) || 'stone' : nm(name)); (hard ? this.S.hard : this.S.soft).push(x, y + YOFF, z, id); return true; }
  }
  const isAir = (n) => n === 'air' || n === 'cave_air' || n === 'void_air';
  const isFluid = (n) => n === 'water' || n === 'lava';
  const replaceable = (n) => isAir(n) || inTag('replaceable', n) || n === 'water';
  const solid = (n) => !isAir(n) && !isFluid(n) && !inTag('replaceable', n) && !/(flower|sapling|grass$|fern|bush|petals|mushroom$|tulip|orchid|allium|bluet|daisy|poppy|dandelion|cornflower|lily|seagrass|kelp|coral$|coral_fan|pickle|vine|litter)/.test(n);
  const DOUBLE = new Set(['tall_grass', 'large_fern', 'sunflower', 'lilac', 'rose_bush', 'peony', 'tall_seagrass', 'pitcher_plant', 'tall_dry_grass', 'small_dripleaf']);
  const PLANTISH = /(sapling|flower|tulip|orchid|allium|bluet|daisy|poppy|dandelion|cornflower|lily_of|rose_bush|peony|lilac|sunflower|grass$|fern|bush$|petals|wildflowers|torchflower|eyeblossom|leaf_litter|cactus_flower)/;
  function survive(V, name, x, y, z) {
    name = nm(name); const below = V.block(x, y - 1, z);
    const supports = (t) => inTag(t, below);
    if (name === 'cactus') { if (!(supports('supports_cactus') || supports('sand') || below === 'cactus')) return false; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (solid(V.block(x + a, y, z + b))) return false; return true; }
    if (name === 'sugar_cane') { if (below === 'sugar_cane') return true; if (!(supports('supports_sugar_cane') || supports('dirt') || supports('sand'))) return false; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = V.block(x + a, y - 1, z + b); if (n === 'water' || n === 'frosted_ice') return true; } return false; }
    if (name === 'lily_pad') return below === 'water' && isAir(V.block(x, y, z));
    if (/kelp|seagrass|sea_pickle|coral/.test(name)) return V.block(x, y, z) === 'water' && (solid(below) || below === 'kelp_plant' || below === 'kelp');
    if (/mushroom$/.test(name)) return solid(below) && (supports('mushroom_grow_block') || true);
    if (name === 'bamboo' || name === 'bamboo_sapling') return supports('bamboo_plantable_on') || supports('dirt') || supports('sand');
    if (name === 'mangrove_propagule') return supports('supports_mangrove_propagule') || supports('dirt');
    if (/dead_bush|dry_grass/.test(name)) return supports('supports_dry_vegetation') || supports('dead_bush_may_place_on') || supports('sand') || supports('dirt') || supports('terracotta');
    if (name === 'pumpkin' || name === 'melon' || name === 'moss_carpet' || name === 'snow') return solid(below);
    if (name === 'sweet_berry_bush' || PLANTISH.test(name)) return supports('supports_vegetation') || supports('dirt') || below === 'farmland' || below === 'moss_block';
    return solid(below);
  }
  function pred(P, V, x, y, z) {
    if (!P) return true; const o = P.offset || [0, 0, 0]; const X = x + o[0], Y = y + o[1], Z = z + o[2];
    switch (nm(P.type)) {
      case 'true': return true;
      case 'not': return !pred(P.predicate, V, x, y, z);
      case 'all_of': return (P.predicates || []).every(q => pred(q, V, x, y, z));
      case 'any_of': return (P.predicates || []).some(q => pred(q, V, x, y, z));
      case 'matching_blocks': { const n = V.block(X, Y, Z); const L = [].concat(P.blocks); return L.some(b => String(b).startsWith('#') ? inTag(b.slice(1), n) : nm(b) === n || (nm(b) === 'air' && isAir(n))); }
      case 'matching_block_tag': { const n = V.block(X, Y, Z); return nm(P.tag) === 'air' ? isAir(n) : inTag(P.tag, n); }
      case 'matching_fluids': { const n = V.block(X, Y, Z); return [].concat(P.fluids).some(f => nm(f).replace('flowing_', '') === n); }
      case 'solid': return solid(V.block(X, Y, Z));
      case 'replaceable': return replaceable(V.block(X, Y, Z));
      case 'would_survive': { const st = P.state; const n = typeof st === 'string' ? st : (st.id || st.Name); return survive(V, n, X, Y, Z); }
      case 'has_sturdy_face': return solid(V.block(X, Y, Z));
      case 'inside_world_bounds': return Y >= -64 && Y < 320;
      case 'unobstructed': return true;
    }
    return true;
  }
  // block state providers -> block name
  const PN = new Map();
  function provNoise(p) { let n = PN.get(p); if (!n) { const R = new MCT.Rng(0, (p.seed | 0) >>> 0, 0x2545F491, 0x4F6CDD1D); n = MCT.normalNoise(p.noise || {}, R); PN.set(p, n); } return n; }
  function prov(p, r, x, y, z) {
    if (p == null) return null; if (typeof p === 'string') { const k = nm(p); if (D.providers[k]) return prov(D.providers[k], r, x, y, z); return k; }
    if (p.id || p.Name) return nm(p.id || p.Name);
    switch (nm(p.type || '')) {
      case 'simple_state_provider': case 'simple': return prov(p.state, r, x, y, z);
      case 'weighted_state_provider': case 'weighted': { const L = p.entries || []; let t = 0; for (const e of L) t += e.weight ?? 1; let q = r() * t; for (const e of L) { q -= e.weight ?? 1; if (q < 0) return prov(e.data, r, x, y, z); } return null; }
      case 'randomized_int_state_provider': case 'randomized_int': return prov(p.source, r, x, y, z);
      case 'noise_provider': case 'noise': { const v = provNoise(p).get(x * p.scale, y * p.scale, z * p.scale); const L = p.states || []; const i = Math.max(0, Math.min(L.length - 1, Math.floor((v + 1) / 2 * L.length))); return prov(L[i], r, x, y, z); }
      case 'noise_threshold_provider': case 'noise_threshold': { const v = provNoise(p).get(x * p.scale, y * p.scale, z * p.scale); if (v < p.threshold) return prov(p.low_states[(r() * p.low_states.length) | 0], r, x, y, z); if (r() < p.high_chance) return prov(p.high_states[(r() * p.high_states.length) | 0], r, x, y, z); return prov(p.default_state, r, x, y, z); }
      case 'dual_noise_provider': case 'dual_noise': { const L = p.states || []; return prov(L[(r() * L.length) | 0], r, x, y, z); }
      case 'rule_based_state_provider': case 'rule_based': { if (p.fallback) return prov(p.fallback, r, x, y, z); return null; }
    }
    return null;
  }
  // trees: Minecraft's tree config -> mcTree config (trunk / foliage placers) or the game's builder
  const TP = { straight: 1, forking: 1, giant: 1, mega_jungle: 1, dark_oak: 1, fancy: 1 }, FP = { blob: 1, spruce: 1, pine: 1, acacia: 1, fancy: 1, jungle: 1, mega_pine: 1, dark_oak: 1, bush: 'blob' };
  const ipv = (v) => v == null ? 0 : typeof v === 'number' ? v : nm(v.type || '') === 'uniform' ? [v.min_inclusive, v.max_inclusive] : (v.value ?? 0);
  const keyOf = (n) => { const k = { oak_log: 'log', oak_leaves: 'leaves' }[n] || n; return B[k.toUpperCase()] !== undefined ? k : null; };
  const TCFG = new Map();
  function treeCfg(f) {
    if (TCFG.has(f)) return TCFG.get(f);
    let res = null; try {
      const tp = nm(f.trunk_placer.type).replace('_trunk_placer', ''), fp = nm(f.foliage_placer.type).replace('_foliage_placer', '');
      const log = typeof f.trunk_provider === 'object' && (f.trunk_provider.id || f.trunk_provider.Name) ? keyOf(nm(f.trunk_provider.id || f.trunk_provider.Name)) : null;
      const lv = typeof f.foliage_provider === 'object' && (f.foliage_provider.id || f.foliage_provider.Name) ? keyOf(nm(f.foliage_provider.id || f.foliage_provider.Name)) : null;
      if (TP[tp] && FP[fp] && log && lv) { const F = f.foliage_placer, T = f.trunk_placer; const o = { r: ipv(F.radius), o: ipv(F.offset) };
        if (F.height != null) o.h = ipv(F.height); if (F.trunk_height != null) o.th = ipv(F.trunk_height); if (F.crown_height != null) o.ch = ipv(F.crown_height);
        for (const d of f.decorators || []) { const t = nm(d.type); if (t === 'leave_vine') o.vines = d.probability; else if (t === 'trunk_vine') o.tvines = true; else if (t === 'cocoa') o.cocoa = d.probability; }
        const key = 'mcv:' + (TCFG.size); MCT_CFG[key] = [tp, T.base_height, T.height_rand_a, T.height_rand_b, FP[fp] === 1 ? fp : FP[fp], o, log, lv]; res = { kind: key }; }
      else { const n = log || ''; res = { kind: /cherry/.test(n) ? 'cherry' : /mangrove/.test(n) ? 'mangrove' : /azalea/.test(lv || '') || fp === 'random_spread' ? 'azalea' : /pale_oak/.test(n) ? 'pale_oak' : /jungle/.test(n) ? 'jungle' : 'oak', game: true }; }
      res.bees = (f.decorators || []).reduce((a, d) => nm(d.type) === 'beehive' ? d.probability : a, 0);
      res.podzol = (f.decorators || []).some(d => nm(d.type) === 'alter_ground');
      res.dirt = f.below_trunk_provider != null;
    } catch (e) { res = null; }
    TCFG.set(f, res); return res;
  }
  // ---- features ----
  function feature(f, V, r, x, y, z, ctx) {
    if (typeof f === 'string') { const k = nm(f); f = D.features[k]; if (!f) return false; }
    const t = nm(f.type);
    switch (t) {
      case 'simple_block': { const n = prov(f.to_place, r, x, y, z); if (!n || n === 'air') return false; if (!isAir(V.block(x, y, z)) && !(V.block(x, y, z) === 'water' && /kelp|seagrass|pickle|coral/.test(n))) return false; if (!survive(V, n, x, y, z)) return false;
        if (DOUBLE.has(n)) { if (!isAir(V.block(x, y + 1, z)) && n !== 'tall_seagrass') return false; const id = idOf(n); if (id === undefined) return false; const top = BL[id] && BL[id].tallOther; V.put(x, y, z, id, false); if (top !== undefined) V.put(x, y + 1, z, top, false); return true; }
        return V.put(x, y, z, n, false); }
      case 'block_column': {
        const up = (f.direction || 'up') === 'up'; const L = (f.layers || []).map(l => ({ h: intp(l.height, r), p: l.provider })); let total = L.reduce((a, l) => a + l.h, 0); if (!total) return false;
        let ok = 0; for (let i = 0; i < total; i++) { const yy = y + (up ? i : -i); if (!pred(f.allowed_placement, V, x, yy, z)) break; ok++; } if (!ok) return false;
        if (ok < total) { let cut = total - ok; if (f.prioritize_tip) { for (const l of L) { const d = Math.min(l.h, cut); l.h -= d; cut -= d; if (!cut) break; } } else for (let i = L.length - 1; i >= 0 && cut; i--) { const d = Math.min(L[i].h, cut); L[i].h -= d; cut -= d; } }
        let k = 0; const first = prov(L.find(l => l.h > 0)?.p, r, x, y, z); if (first && !survive(V, first, x, y, z) && /cactus|sugar_cane|kelp|bamboo/.test(first)) return false;
        for (const l of L) for (let i = 0; i < l.h; i++) { const yy = y + (up ? k : -k); const n = prov(l.p, r, x, yy, z); if (n) V.put(x, yy, z, n, false); k++; }
        return true; }
      case 'random_selector': { for (const e of f.features || []) if (r() < (e.chance ?? 0)) return placed(e.feature, V, r, x, y, z, ctx); return placed(f.default, V, r, x, y, z, ctx); }
      case 'simple_random_selector': { const L = f.features || []; return L.length ? placed(L[(r() * L.length) | 0], V, r, x, y, z, ctx) : false; }
      case 'random_boolean_selector': return placed(r() < 0.5 ? f.feature_true : f.feature_false, V, r, x, y, z, ctx);
      case 'weighted_random_selector': { const L = f.features || []; let tt = 0; for (const e of L) tt += e.weight ?? 1; let q = r() * tt; for (const e of L) { q -= e.weight ?? 1; if (q < 0) return placed(e.data ?? e.feature, V, r, x, y, z, ctx); } return false; }
      case 'tree': { if (ctx.noTrees) return false; const c = treeCfg(f); if (!c) return false; const put = (X, Y, Z, id, isLog) => V.put(X, Y, Z, id, !!isLog);
        try { if (c.game) { if (TREES[c.kind]) TREES[c.kind](put, x, y, z, r); else return false; } else mcTree(c.kind, put, x, y, z, r); } catch (e) { return false; }
        const below = V.block(x, y - 1, z); if (c.dirt && (below === 'grass_block' || below === 'mycelium' || below === 'podzol')) V.put(x, y - 1, z, 'dirt', true);
        if (c.podzol) for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) { if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue; if (r() < 0.75) { const fy = V.floor(x + dx, z + dz); if (Math.abs(fy - (y - 1)) <= 2 && /grass_block|dirt/.test(V.block(x + dx, fy, z + dz))) V.put(x + dx, fy, z + dz, 'podzol', true); } }
        if (c.bees && r() < c.bees && B.BEE_NEST !== undefined) { for (const [a, b] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) { const yy = y + 2 + ((r() * 2) | 0); if (isAir(V.block(x + a, yy, z + b))) { V.put(x + a, yy, z + b, 'bee_nest', true); break; } } }
        return true; }
      case 'fallen_tree': { if (ctx.noTrees) return false; const log = prov(f.trunk_provider, r, x, y, z); if (!log) return false; const L = intp(f.log_length, r); const dir = [[1, 0], [-1, 0], [0, 1], [0, -1]][(r() * 4) | 0];
        V.put(x, y, z, log, true); const sx = x + dir[0] * 2, sz = z + dir[1] * 2; const axis = dir[0] ? 'x' : 'z'; const lid = typeof famId === 'function' ? famId(nm(log), { axis }) || idOf(log) : idOf(log);
        for (let i = 0; i < L; i++) { const X = sx + dir[0] * i, Z = sz + dir[1] * i; if (!isAir(V.block(X, y, Z)) || !solid(V.block(X, y - 1, Z))) break; V.put(X, y, Z, lid, true); if (r() < 0.1 && isAir(V.block(X, y + 1, Z))) V.put(X, y + 1, Z, r() < 0.67 ? 'red_mushroom' : 'brown_mushroom', false); }
        return true; }
      case 'huge_red_mushroom': case 'huge_brown_mushroom': { if (ctx.noTrees || typeof bigMushroom !== 'function') return false; if (!solid(V.block(x, y - 1, z))) return false; bigMushroom((X, Y, Z, id) => V.put(X, Y, Z, id, true), x, y, z, t === 'huge_red_mushroom', r); return true; }
      case 'bamboo': { if (!survive(V, 'bamboo', x, y, z) || !isAir(V.block(x, y, z))) return false; const H = 5 + ((r() * 12) | 0); for (let i = 0; i < H; i++) { if (!isAir(V.block(x, y + i, z))) break; V.put(x, y + i, z, 'bamboo', false); }
        if (r() < (f.probability || 0)) { const R = 1 + ((r() * 4) | 0); for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) if (dx * dx + dz * dz <= R * R) { const fy = V.floor(x + dx, z + dz); if (/grass_block|dirt/.test(V.block(x + dx, fy, z + dz))) V.put(x + dx, fy, z + dz, 'podzol', true); } } return true; }
      case 'coral_tree': case 'coral_claw': case 'coral_mushroom': { const kinds = ['tube', 'brain', 'bubble', 'fire', 'horn']; const k = kinds[(r() * 5) | 0]; const H = 1 + ((r() * (t === 'coral_tree' ? 4 : 2)) | 0);
        let yy = y; for (let i = 0; i < H; i++) { if (V.block(x, yy, z) !== 'water') break; V.put(x, yy, z, k + '_coral_block', true); yy++; } if (V.block(x, yy, z) === 'water') V.put(x, yy, z, r() < 0.5 ? k + '_coral' : k + '_coral_fan', false); return true; }
    }
    return false;
  }
  // a placed feature: placement modifiers turn the origin into positions, the feature is placed at each
  function placed(p, V, r, x, y, z, ctx) {
    if (p == null) return false; if (typeof p === 'string') { const k = nm(p); if (D.placed[k]) p = D.placed[k]; else return feature(k, V, r, x, y, z, ctx); }
    if (!p.feature) return feature(p, V, r, x, y, z, ctx);
    let pos = [[x, y, z]];
    for (const m of p.placement || []) { const t = nm(m.type); const out = [];
      for (const [X, Y, Z] of pos) switch (t) {
        case 'count': { const n = intp(m.count, r); for (let i = 0; i < n; i++) out.push([X, Y, Z]); break; }
        case 'in_square': out.push([X + ((r() * 16) | 0), Y, Z + ((r() * 16) | 0)]); break;
        case 'heightmap': out.push([X, V.height(m.heightmap, X, Z), Z]); break;
        case 'biome': { const b = MCT_DATA_BIOMES()[V.G.biomeAt(X, Y, Z)]; if (BSET[b] && BSET[b].has(ctx.top)) out.push([X, Y, Z]); break; }
        case 'rarity_filter': if (r() < 1 / (m.chance || 1)) out.push([X, Y, Z]); break;
        case 'surface_water_depth_filter': if (V.top(X, Z) - V.floor(X, Z) <= (m.max_water_depth ?? 0)) out.push([X, Y, Z]); break;
        case 'block_predicate_filter': if (pred(m.predicate, V, X, Y, Z)) out.push([X, Y, Z]); break;
        case 'offset': case 'random_offset': out.push([X + intp(m.x ?? m.xz_spread, r), Y + intp(m.y ?? m.y_spread, r), Z + intp(m.z ?? m.xz_spread, r)]); break;
        case 'height_range': out.push([X, heightp(m.height, r), Z]); break;
        case 'noise_threshold_count': { const v = MCV.infoNoise(X / 200, Z / 200); const n = v < m.noise_level ? m.below_noise : m.above_noise; for (let i = 0; i < n; i++) out.push([X, Y, Z]); break; }
        case 'noise_based_count': { const v = MCV.infoNoise(X / m.noise_factor, Z / m.noise_factor); const n = Math.ceil((v + (m.noise_offset || 0)) * m.noise_to_count_ratio); for (let i = 0; i < n; i++) out.push([X, Y, Z]); break; }
        case 'surface_relative_threshold_filter': { const h = V.height(m.heightmap, X, Z); const d = Y - h; if (d >= (m.min_inclusive ?? -1e9) && d <= (m.max_inclusive ?? 1e9)) out.push([X, Y, Z]); break; }
        case 'environment_scan': { const dir = (m.direction_of_search || 'down') === 'up' ? 1 : -1; let yy = Y, found = false;
          for (let i = 0; i < (m.max_steps || 0); i++) { if (pred(m.target_condition, V, X, yy, Z)) { found = true; break; } yy += dir; if (m.allowed_search_condition && !pred(m.allowed_search_condition, V, X, yy, Z)) break; }
          if (found || pred(m.target_condition, V, X, yy, Z)) out.push([X, yy, Z]); break; }
        case 'fixed_placement': for (const q of m.positions || []) out.push(q); break;
        default: out.push([X, Y, Z]);
      }
      pos = out; if (!pos.length) return false; }
    let any = false; for (const [X, Y, Z] of pos) if (feature(p.feature, V, r, X, Y, Z, ctx)) any = true; return any;
  }
  let INFO = null;
  return {
    infoNoise(x, z) { if (!INFO) INFO = MCT.normalNoise({ base_octave: 0, base_amplitude: 1 }, new MCT.Rng(0, 2345, 0x1234ABCD, 0x5678EF01)); return INFO.get(x, 0, z); },
    // decorate one chunk: every feature of the biomes in it, in Minecraft's order
    decorate(world, S, cx, cz) {
      const m = world.gen.mc; const V = new View(world, m, S); const G = V.G; const bx = cx * 16, bz = cz * 16; const N = MCT_DATA_BIOMES();
      const here = new Set(); for (const [a, b] of [[2, 2], [13, 2], [2, 13], [13, 13], [8, 8]]) { const t = V.top(bx + a, bz + b); here.add(N[G.biomeAt(bx + a, t + 1, bz + b)]); }
      const noTrees = !!startNear(world, 'village', cx, cz, (typeof MCST_ON === 'function' && MCST_ON()) ? 3 : 2);
      ORDER.forEach((name, i) => { let use = false; for (const b of here) if (BSET[b] && BSET[b].has(name)) { use = true; break; } if (!use) return;
        const r = mulberry32(ihash(cx, cz, 7100 + i, world.seed)); try { placed(name, V, r, bx, 0, bz, { top: name, noTrees }); } catch (e) { if (!MCV.err) { MCV.err = 1; console.warn('Minecraft vegetation', name, e); } } });
    },
  };
})();
// classic trees and plants are not made in Minecraft worlds (BlockWild's cave plants and features stay)
let MCV_VEG = null; function mcvIsVeg(id) { if (!MCV_VEG) { MCV_VEG = new Uint8Array(BL.length + 1); for (const d of BL) { if (!d) continue; const k = d.key || ''; const i = B[k.toUpperCase()]; if (i === undefined) continue;
  if (PLANT[i] || /(^log$|_log$|_wood$|^wood$|leaves|mushroom_block|mushroom_stem|^cactus|sugar_cane|bamboo|vine|cocoa|kelp|seagrass|coral|sea_pickle|lily_pad|^pumpkin$|^melon$|bee_nest|petals|leaf_litter|azalea|firefly|dead_bush|berry_bush|shrub|propagule|mangrove_roots|shelf_mushroom|poplar)/.test(k)) MCV_VEG[i] = 1; } }
  return MCV_VEG[id] === 1; }
function mcvStrip(world, arr, surfaceOnly) { const m = world.gen.mc; const out = []; for (let i = 0; i < arr.length; i += 4) { const x = arr[i], y = arr[i + 1], z = arr[i + 2], id = arr[i + 3];
    if (mcvIsVeg(id) && (!surfaceOnly || y >= m.column(x, z).h - 2)) continue; out.push(x, y, z, id); } return out; }
{ const _dec = decorate; decorate = function (world, S, cx, cz) {
    const m = world.gen && world.gen.mc; if (!m) return _dec.apply(this, arguments);
    const s0 = S.soft.length, h0 = S.hard.length; const r0 = _dec.apply(this, arguments);
    const ns = mcvStrip(world, S.soft.slice(s0), true), nh = mcvStrip(world, S.hard.slice(h0), true); S.soft.length = s0; S.hard.length = h0; S.soft.push(...ns); S.hard.push(...nh);
    return r0; }; }
{ const _sf = structuresFor; structuresFor = function (world, cx, cz) {
    const S = _sf.apply(this, arguments); if (!world.gen || !world.gen.mc || world.dim !== 'overworld' || S.mcveg) return S; S.mcveg = true;
    try { MCV.decorate(world, S, cx, cz); } catch (e) { console.warn('Minecraft vegetation failed', e); }
    return S; }; }

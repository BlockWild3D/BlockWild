// ================= MINECRAFT TERRAIN: GAME SIDE =================
// New worlds of type "Minecraft" (also "Minecraft Amplified", "Minecraft Large Biomes") get their terrain, caves, water,
// surface blocks and biomes from the Minecraft engine (02e_mcterrain.js). Old worlds keep the classic generator
// (the game saves only edits, so changing terrain under an old world would reshape it).
// - chunks are filled in Web Workers ahead of the player; a chunk is built once its 3x3 neighbourhood is filled
//   (trees, structures and decorations read the neighbours). Lookups far away (structure starts) fill on this thread.
// - each Minecraft biome maps to the game's broad biome + sub-biome (c.b, c.v), so trees, plants, mobs and
//   structures keep working; names shown are Minecraft's.
// - the game's decorators still add plants, trees and features, but no longer repaint the ground Minecraft made.
// - snow layers and ice are placed last (Minecraft's freeze_top_layer) where the biome is cold at that height.
const MCB = (() => { const m = {}; const set = (b, v, ...names) => { for (const n of names) m[n] = [b, v]; };
  set('OCEAN', '', 'ocean', 'deep_ocean'); set('OCEAN', 'WARM_OCEAN', 'warm_ocean'); set('OCEAN', 'LUKEWARM_OCEAN', 'lukewarm_ocean', 'deep_lukewarm_ocean');
  set('OCEAN', 'COLD_OCEAN', 'cold_ocean', 'deep_cold_ocean'); set('OCEAN', 'FROZEN_OCEAN', 'frozen_ocean', 'deep_frozen_ocean'); set('OCEAN', 'RIVER', 'river'); set('OCEAN', 'FROZEN_RIVER', 'frozen_river');
  set('BEACH', '', 'beach'); set('BEACH', 'SNOWY_BEACH', 'snowy_beach'); set('BEACH', 'STONY_SHORE', 'stony_shore');
  set('PLAINS', '', 'plains', 'lush_caves', 'dripstone_caves', 'deep_dark', 'sulfur_caves'); set('PLAINS', 'SUNFLOWER_PLAINS', 'sunflower_plains'); set('PLAINS', 'MEADOW', 'meadow');
  set('FOREST', '', 'forest'); set('FOREST', 'FLOWER_FOREST', 'flower_forest'); set('FOREST', 'BIRCH_FOREST', 'birch_forest'); set('FOREST', 'OLD_BIRCH', 'old_growth_birch_forest'); set('FOREST', 'DAPPLED_FOREST', 'dappled_forest');
  set('DARK_FOREST', '', 'dark_forest'); set('PALE_GARDEN', '', 'pale_garden'); set('CHERRY_GROVE', '', 'cherry_grove'); set('DESERT', '', 'desert');
  set('BADLANDS', '', 'badlands'); set('BADLANDS', 'WOODED_BADLANDS', 'wooded_badlands'); set('BADLANDS', 'ERODED_BADLANDS', 'eroded_badlands');
  set('SNOWY', '', 'snowy_plains'); set('SNOWY', 'ICE_SPIKES', 'ice_spikes');
  set('TAIGA', '', 'taiga'); set('TAIGA', 'SNOWY_TAIGA', 'snowy_taiga'); set('TAIGA', 'OLD_PINE', 'old_growth_pine_taiga'); set('TAIGA', 'OLD_SPRUCE', 'old_growth_spruce_taiga');
  set('JUNGLE', '', 'jungle'); set('JUNGLE', 'BAMBOO_JUNGLE', 'bamboo_jungle'); set('JUNGLE', 'SPARSE_JUNGLE', 'sparse_jungle');
  set('SAVANNA', '', 'savanna'); set('SAVANNA', 'SAVANNA_PLATEAU', 'savanna_plateau'); set('SAVANNA', 'WINDSWEPT_SAVANNA', 'windswept_savanna');
  set('SWAMP', '', 'swamp'); set('MANGROVE_SWAMP', '', 'mangrove_swamp'); set('MUSHROOM_FIELDS', '', 'mushroom_fields');
  set('MOUNTAINS', 'JAGGED_PEAKS', 'jagged_peaks'); set('MOUNTAINS', 'FROZEN_PEAKS', 'frozen_peaks'); set('MOUNTAINS', 'STONY_PEAKS', 'stony_peaks'); set('MOUNTAINS', 'SNOWY_SLOPES', 'snowy_slopes');
  set('MOUNTAINS', 'GROVE', 'grove'); set('MOUNTAINS', 'WINDSWEPT_HILLS', 'windswept_hills'); set('MOUNTAINS', 'WINDSWEPT_FOREST', 'windswept_forest'); set('MOUNTAINS', 'WINDSWEPT_GRAVELLY', 'windswept_gravelly_hills');
  return m; })();
const MC_CAVE_BIOMES = new Set(['lush_caves', 'dripstone_caves', 'deep_dark', 'sulfur_caves']);
const mcBiomeTitle = (n) => n.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
function mcPreset() { const t = String((S.rules && S.rules.worldType) || ''); if (S.rules && S.rules.arena) return null; if (!t.startsWith('minecraft')) return null; const p = t.split(':')[1]; return p === 'amplified' || p === 'large_biomes' ? p : 'overworld'; }
function mcBlockId(name) { const al = { grass_block: 'GRASS' }; const k = al[name] || name.toUpperCase(); return B[k] !== undefined ? B[k] : B.STONE; }
// blocks the game's decorators may not paint over Minecraft's ground with
let MC_GROUND = null; function mcGround() { if (MC_GROUND) return MC_GROUND; MC_GROUND = new Uint8Array(BL.length + 1);
  for (const d of BL) { if (!d) continue; const k = d.key || ''; if (/terracotta$/.test(k) && !/glazed/.test(k) || /^(red_)?sand(stone)?$/.test(k) || /^(stone|gravel|podzol|coarse_dirt|mycelium|snow_block|grass|dirt|mud|powder_snow|deepslate|calcite|snowy_grass)$/.test(k)) MC_GROUND[d.id !== undefined ? d.id : B[k.toUpperCase()]] = 1; }
  return MC_GROUND; }

class MCWorld {
  constructor(world, preset) {
    this.w = world; this.preset = preset; this.seed = world.seed; this.G = null; this.ids = null;
    this.est = 0; this.codes = new Map(); this.sum = new Map(); this.masks = new Map(); this.req = new Map(); this.workers = []; this.inflight = 0; this.syncFills = 0; this.workerFills = 0;
    this.startWorkers();
  }
  gen() { if (!this.G) { this.G = new MCT.Generator(this.seed, this.preset, MCT_DATA); this.palIds(this.G.palette); } return this.G; }
  palIds(pal) { if (this.ids) return; const ids = new Uint16Array(4 + pal.length); ids[0] = 0; ids[1] = B.STONE; ids[2] = B.WATER; ids[3] = B.LAVA; pal.forEach((n, i) => ids[4 + i] = mcBlockId(n)); this.ids = ids; this.pal = pal.join(','); this.names = ['air', 'stone', 'water', 'lava'].concat(pal); }
  startWorkers() {
    if (typeof Worker === 'undefined' || typeof Blob === 'undefined') return;
    try {
      if (!MCWorld.url) { const src = 'const MCT_DATA=' + JSON.stringify(MCT_DATA) + ';\n' + mctFactory.toString() + '\nconst MCT = mctFactory(); let G = null;\n' +
        'onmessage = (e) => { const m = e.data; if (m.init) { G = new MCT.Generator(m.seed, m.preset, MCT_DATA); postMessage({ ready: 1, pal: G.palette }); return; }\n' +
        '  try { const r = G.fill(m.cx, m.cz); postMessage(r, [r.codes.buffer, r.top.buffer, r.floor.buffer, r.bio.buffer, r.cold.buffer, r.surf.buffer, r.mask.buffer]); } catch (err) { postMessage({ err: String(err), cx: m.cx, cz: m.cz }); } };';
        MCWorld.url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' })); }
      const n = Math.max(2, Math.min(4, ((navigator.hardwareConcurrency || 4) - 1)));
      for (let i = 0; i < n; i++) { const wk = new Worker(MCWorld.url); const W = { wk, ready: false, busy: 0 };
        wk.onmessage = (e) => this.onMsg(W, e.data); wk.onerror = (e) => { console.warn('Minecraft terrain worker failed, generating on the main thread', e.message); this.dropWorker(W); };
        wk.postMessage({ init: 1, seed: this.seed, preset: this.preset }); this.workers.push(W); }
    } catch (e) { console.warn('Minecraft terrain workers unavailable', e); this.workers = []; }
  }
  dropWorker(W) { const i = this.workers.indexOf(W); if (i >= 0) this.workers.splice(i, 1); try { W.wk.terminate(); } catch (e) { } for (const [k, w] of this.req) if (w === W) this.req.delete(k); }
  stop() { for (const W of this.workers) try { W.wk.terminate(); } catch (e) { } this.workers = []; this.req.clear(); }
  onMsg(W, m) {
    if (m.ready) { W.ready = true; this.palIds(m.pal); if (this.pal !== m.pal.join(',')) { console.warn('Minecraft terrain palette mismatch'); this.dropWorker(W); } return; }
    W.busy--; const k = ckey(m.cx, m.cz); this.req.delete(k);
    if (m.err) { console.warn('Minecraft terrain worker error', m.err); return; }
    this.workerFills++; this.store(m);
  }
  store(r) { const k = ckey(r.cx, r.cz); if (!this.w.chunks.has(k)) this.codes.set(k, r.codes); this.masks.set(k, r.mask); this.sum.set(k, { top: r.top, floor: r.floor, bio: r.bio, cold: r.cold, surf: r.surf, cols: null, cx: r.cx, cz: r.cz });
    if (this.sum.size > 2500) { const it = this.sum.keys(); for (let i = 0; i < 500; i++) this.sum.delete(it.next().value); }
    if (this.masks.size > 500) { const it = this.masks.keys(); for (let i = 0; i < 100; i++) this.masks.delete(it.next().value); }
    if (this.codes.size > 400) { const it = this.codes.keys(); for (let i = 0; i < 80; i++) this.codes.delete(it.next().value); } }
  syncFill(cx, cz) { const r = this.gen().fill(cx, cz); this.syncFills++; this.store(r); return r; }
  summary(cx, cz) { const k = ckey(cx, cz); return this.sum.get(k) || (this.syncFill(cx, cz), this.sum.get(k)); }
  mask(cx, cz) { const k = ckey(cx, cz); return this.masks.get(k) || (this.syncFill(cx, cz), this.masks.get(k)); }
  takeCodes(cx, cz) { const k = ckey(cx, cz); let c = this.codes.get(k); if (!c) { this.syncFill(cx, cz); c = this.codes.get(k); } this.codes.delete(k); return c; }
  ready(cx, cz) { for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) { const k = ckey(cx + dx, cz + dz); if (!this.sum.has(k) || (dx * dx <= 1 && dz * dz <= 1 && !this.masks.has(k))) return false; } return this.codes.has(ckey(cx, cz)) || this.w.chunks.has(ckey(cx, cz)); }
  ask(cx, cz) { const k = ckey(cx, cz); if (this.req.has(k) || (this.sum.has(k) && this.masks.has(k) && (this.codes.has(k) || this.w.chunks.has(k)))) return true;
    let best = null; for (const W of this.workers) if (W.ready && (!best || W.busy < best.busy)) best = W; if (!best || best.busy >= 3) return false;
    best.busy++; this.req.set(k, best); best.wk.postMessage({ cx, cz }); return true; }
  pump(list) { if (!this.workers.length) return; for (const [cx, cz] of list) { if (this.w.chunks.has(ckey(cx, cz)) && this.sum.has(ckey(cx, cz))) continue; for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (!this.ask(cx + dx, cz + dz)) return; } }
  // the column Minecraft's structure placement would see: noise biome at the preliminary surface (no chunk fill)
  estCol(x, z) { const k = (x >> 2) * 1048576 + (z >> 2); const E = this.estCache || (this.estCache = new Map()); let c = E.get(k); if (c) return c;
    const G = this.gen(); const s = Math.floor(G.A ? G.A.surf.c(x, 0, z) : 64); const name = MCT_DATA_BIOMES()[G.noiseBiome(x >> 2, (Math.max(s, G.sea) + 1) >> 2, z >> 2)]; const mp = MCB[name] || ['PLAINS', ''];
    c = { h: s + YOFF + 1, b: BIO[mp[0]], v: mp[1] ? BV[mp[1]] || 0 : 0, mc: name, v2: 1, v3: 1, est: true }; if (E.size > 50000) E.clear(); E.set(k, c); return c; }
  column(x, z) {
    if (this.est > 0) return this.estCol(x, z);
    const s = this.summary(x >> 4, z >> 4); if (!s.cols) { const cols = new Array(256); const names = MCT_DATA_BIOMES();
      for (let j = 0; j < 256; j++) { const name = names[s.bio[j]], mp = MCB[name] || ['PLAINS', '']; cols[j] = { h: s.floor[j] + YOFF + 1, b: BIO[mp[0]], v: mp[1] ? BV[mp[1]] || 0 : 0, mc: name, v2: 1, v3: 1, top: s.top[j] + YOFF }; }
      s.cols = cols; }
    return s.cols[(z & 15) * 16 + (x & 15)];
  }
  cave(x, y, z) { if (y < 0 || y >= WH) return false; const col = this.column(x, z); if (y >= col.h) return false; const m = this.mask(x >> 4, z >> 4); const i = (y * 16 + (z & 15)) * 16 + (x & 15); return (m[i >> 3] & (1 << (i & 7))) !== 0; }
  // biome without filling the chunk: the noise biome at the preliminary surface (for /locate and the spawn search)
  estBiome(x, z) { const G = this.gen(); const s = Math.floor(G.A ? G.A.surf.c(x, 0, z) : 64); return MCT_DATA_BIOMES()[G.noiseBiome(x >> 2, (Math.max(s, G.sea) + 1) >> 2, z >> 2)]; }
  biomeName(x, z, y) {
    const k = ckey(x >> 4, z >> 4); if (!this.sum.has(k)) return mcBiomeTitle(this.estBiome(x, z));
    const col = this.column(x, z);
    if (y !== undefined && y < col.h - 6) { const n = MCT_DATA_BIOMES()[this.gen().biomeAt(x, Math.floor(y) - YOFF, z)]; if (MC_CAVE_BIOMES.has(n)) return mcBiomeTitle(n);
      if (typeof caveFlags === 'function' && caveFlags(this.w.gen, (x >> 4) * 16, (z >> 4) * 16).ice && y > YOFF - 20 && this.cave(x, Math.floor(y), z)) return 'Ice Caves'; }
    return mcBiomeTitle(col.mc);
  }
}
let MCT_BIO_NAMES = null; function MCT_DATA_BIOMES() { return MCT_BIO_NAMES || (MCT_BIO_NAMES = Object.keys(MCT_DATA.biomes)); }

// ---- the chunk itself ----
function mcGenOverworld(world, c) {
  const m = world.gen.mc; const cx = c.cx, cz = c.cz; const codes = m.takeCodes(cx, cz); if (!m.ids) m.gen();
  const ids = m.ids, d = c.d; for (let i = 0; i < codes.length; i++) d[i] = ids[codes[i]];
  const cols = new Array(256); for (let j = 0; j < 256; j++) cols[j] = m.column(cx * 16 + (j & 15), cz * 16 + (j >> 4));
  c.mcCold = m.summary(cx, cz).cold;
  carveRavines(world, c, cols); placeLavaLakes(world, c, cols); placeOres(world, c, cols);
  const seed = world.seed, bx = cx * 16, bz = cz * 16; const r = mulberry32(ihash(cx, cz, 1, seed));
  for (const [key, cnt, sz, mnY, mxY, shape, rep, biomes] of MODS.ores) { // ores added by mods (as the classic generator)
    const id = B[String(key).toUpperCase()], repId = B[String(rep).toUpperCase()]; if (!id || !repId) continue;
    if (biomes && !biomes.some(n => BIO_NAME[cols[136].b].toLowerCase().includes(String(n).toLowerCase()))) continue;
    for (let i = 0; i < cnt; i++) { const q = shape === 'tri' ? (r() + r()) / 2 : shape === 'low' ? Math.min(r(), r()) : r(); let x = r() * 16 | 0, y = mnY + (q * (mxY - mnY) | 0), z = r() * 16 | 0;
      for (let k = 0; k < sz; k++) { if (x >= 0 && x < 16 && z >= 0 && z < 16 && y > 0 && y < WH - 1) { const j = (y * 16 + z) * 16 + x; if (d[j] === repId) d[j] = id; } const q2 = r() * 6 | 0; if (q2 === 0) x++; else if (q2 === 1) x--; else if (q2 === 2) y++; else if (q2 === 3) y--; else if (q2 === 4) z++; else z--; } } }
  return cols;
}
// snow and ice last (Minecraft's freeze_top_layer): on the top block that blocks motion, where it is cold enough at that height
{ const _wc = worldgenCleanup; worldgenCleanup = function (world, c) {
    const r = _wc.apply(this, arguments); if (!world.gen || !world.gen.mc || !c.mcCold) return r;
    const d = c.d, cold = c.mcCold; const LEAF = (id) => BL[id] && /leaves/.test(BL[id].key || '');
    for (let j = 0; j < 256; j++) { if (!cold[j]) continue; let y = WH - 2; for (; y > 0; y--) { const id = d[y * 256 + j]; if (id && (SOLID[id] || id === B.WATER || LEAF(id))) break; } if (y <= 0) continue;
      const id = d[y * 256 + j];
      if (id === B.WATER) { if (y === SEA - 1) d[y * 256 + j] = B.ICE; continue; }
      const up = d[(y + 1) * 256 + j]; if (up && PLANT[up] && !(BL[up] && BL[up].tallOther !== undefined) && up !== B.SUGAR_CANE && up !== B.CACTUS) d[(y + 1) * 256 + j] = 0; // no flowers poking out of the snow
      if (d[(y + 1) * 256 + j] !== 0 || id === B.ICE || id === B.PACKED_ICE || id === B.BLUE_ICE) continue;
      if (B.SNOW !== undefined) d[(y + 1) * 256 + j] = B.SNOW; if (id === B.GRASS && B.SNOWY_GRASS !== undefined) d[y * 256 + j] = B.SNOWY_GRASS; }
    return r; }; }
// the game's decorators keep their plants, trees and features but do not repaint Minecraft's ground
{ const _dec = decorate; decorate = function (world, S, cx, cz) {
    const m = world.gen && world.gen.mc; if (!m) return _dec.apply(this, arguments);
    const real = S.hard; const tmp = []; S.hard = tmp; let r0;
    try { r0 = _dec.apply(this, arguments); } finally { S.hard = real; }
    const G = mcGround(); for (let i = 0; i < tmp.length; i += 4) { const x = tmp[i], y = tmp[i + 1], z = tmp[i + 2], id = tmp[i + 3];
      if (G[id] && y < m.column(x, z).h && !m.cave(x, y, z)) continue; real.push(x, y, z, id); }
    return r0; }; }
// column, caves and biome names come from Minecraft in these worlds (outermost, so the classic biome tweaks don't apply)
{ const _col = Gen.prototype.column, _cave = Gen.prototype.cave, _bn = Gen.prototype.biomeName;
  Gen.prototype.column = function (x, z) { return this.mc ? this.mc.column(Math.floor(x), Math.floor(z)) : _col.apply(this, arguments); };
  Gen.prototype.cave = function (x, y, z) { return this.mc ? this.mc.cave(Math.floor(x), Math.floor(y), Math.floor(z)) : _cave.apply(this, arguments); };
  Gen.prototype.biomeName = function (x, z, y) { return this.mc ? this.mc.biomeName(Math.floor(x), Math.floor(z), y) : _bn.apply(this, arguments); }; }
// cave biome flags (lush / dripstone / sulfur / deep dark decorations, ore placement) from Minecraft's 3D biomes; ice caves stay BlockWild's
{ const _cf = caveFlags; caveFlags = function (g, bx, bz) {
    const f = _cf.apply(this, arguments); if (!g.mc) return f; const k = bx + ',' + bz; const C = g.mc.cf || (g.mc.cf = new Map()); let o = C.get(k); if (o) return o;
    const G = g.mc.gen(), N = MCT_DATA_BIOMES(); const seen = new Set(); for (const [ox, oz] of [[4, 4], [12, 4], [4, 12], [12, 12], [8, 8]]) for (let y = -56; y <= 56; y += 8) seen.add(N[G.noiseBiome((bx + ox) >> 2, y >> 2, (bz + oz) >> 2)]);
    o = { lush: seen.has('lush_caves'), drip: seen.has('dripstone_caves'), sulfur: seen.has('sulfur_caves'), ice: f.ice && !seen.has('lush_caves') && !seen.has('dripstone_caves') && !seen.has('sulfur_caves'), dark: seen.has('deep_dark') };
    if (C.size > 4000) C.clear(); C.set(k, o); return o; }; }
// spawn: the classic search, using the cheap noise-biome estimate so it doesn't fill dozens of chunks
{ const _fs = findSpawn; findSpawn = function (gen) {
    if (!gen.mc) return _fs.apply(this, arguments);
    for (let r = 0; r < 4000; r += 24) for (let a = 0; a < 12; a++) { const x = Math.round(Math.cos(a * 0.5236) * r), z = Math.round(Math.sin(a * 0.5236) * r); const n = gen.mc.estBiome(x, z); const mp = MCB[n] || ['PLAINS'];
      if (!['OCEAN', 'BEACH', 'MOUNTAINS', 'DESERT'].includes(mp[0]) && gen.column(x, z).h > SEA + 1) return [x, z]; }
    return [0, 0]; }; }
// worlds: attach the engine when the overworld of a Minecraft world is made
{ const _dg = Dim.get; Dim.get = function (dim) {
    const had = !!this.worlds[dim]; const w = _dg.apply(this, arguments);
    if (!had && w && w.dim === 'overworld' && w.gen && !w.gen.mc) { const p = mcPreset(); if (p) { for (const o of Object.values(Dim.worlds)) if (o !== w && o.gen && o.gen.mc) o.gen.mc.stop();
        try { _colInit(w.gen); } catch (e) { } w.gen.mc = new MCWorld(w, p); } }
    return w; }; }
function _colInit(g) { const mc = g.mc; g.mc = null; Gen.prototype.column.call(g, 0, 0); if (typeof caveFlags === 'function') caveFlags(g, 0, 0); g.mc = mc; } // the classic wrappers make their noises on first use
// chunk loading: ask the workers for the chunks ahead, build a chunk once its neighbourhood is filled
{ const _up = World.prototype.update; World.prototype.update = function (px, pz, R, budget) {
    const m = this.gen && this.gen.mc; if (!m || !m.workers.length) return _up.apply(this, arguments);
    const pcx = Math.floor(px / 16), pcz = Math.floor(pz / 16); const key = pcx + ',' + pcz + ',' + R;
    if (m.lk !== key) { m.lk = key; const L = []; const RR = R + 3; for (let dx = -RR; dx <= RR; dx++) for (let dz = -RR; dz <= RR; dz++) { const d2 = dx * dx + dz * dz; if (d2 <= RR * RR) L.push([pcx + dx, pcz + dz, d2]); } L.sort((a, b) => a[2] - b[2]); m.list = L;
      for (const k of [...m.codes.keys()]) { const cx = Math.floor(k / 65536) - 32768, cz = (k % 65536) - 32768; if ((cx - pcx) ** 2 + (cz - pcz) ** 2 > (RR + 2) ** 2) m.codes.delete(k); } }
    m.pump(m.list);
    const self = this; this.generate = function (cx, cz) { if (m.ready(cx, cz)) return World.prototype.generate.call(self, cx, cz); m.ask(cx, cz); return undefined; };
    try { return _up.apply(this, arguments); } finally { delete this.generate; } }; }
// ---- Create World: world types ----
{ const sel = $('worldTypeSel'); if (sel) {
    const def = sel.querySelector('option[value="default"]'); if (def) def.textContent = 'Classic';
    const opts = [['minecraft', 'Minecraft'], ['minecraft:amplified', 'Minecraft Amplified'], ['minecraft:large_biomes', 'Minecraft Large Biomes']];
    for (const [v, t] of opts.reverse()) { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.insertBefore(o, sel.firstChild); }
    sel.value = 'minecraft'; NEWWORLD.type = 'minecraft'; sel.title = 'Minecraft: terrain, caves, water and biomes made by Minecraft 26.3\'s own generator. Classic: BlockWild\'s original terrain.'; } }

// structure starts are decided from the estimate (as Minecraft does, from the noise biome), so they never fill far chunks;
// the start's own column is exact when the structure is built
{ const _rs = regionStart; regionStart = function (world, kind, rx, rz) {
    const m = world.gen && world.gen.mc; if (!m) return _rs.apply(this, arguments);
    m.est++; let res; try { res = _rs.apply(this, arguments); } finally { m.est--; }
    if (res && !res._lazy) { const x = res.cx * 16 + 8, z = res.cz * 16 + 8; res._lazy = true; Object.defineProperty(res, 'col', { get: () => world.gen.column(x, z), configurable: true, enumerable: true }); }
    return res; }; }
{ const _ms = mineshaftStartsNear; mineshaftStartsNear = function (world) { const m = world.gen && world.gen.mc; if (!m) return _ms.apply(this, arguments); m.est++; try { return _ms.apply(this, arguments); } finally { m.est--; } }; }

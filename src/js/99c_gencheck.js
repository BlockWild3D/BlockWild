// ================= WORLD GENERATION CLEANUP =================
// Decoration is planned from the terrain height map, but caves, ravines, rivers and structures can cut the ground away
// afterwards. Minecraft never leaves plants hanging in the air or water standing as a wall, so after a chunk is built:
//  - plants with nothing to stand on are removed (bottom-up, so tall plants and cane columns go with their base),
//    and sugar cane with no water beside its base is removed;
//  - sulfur spikes standing on water are removed;
//  - leaves left floating with no log anywhere near (a structure cut the trunk away) are removed, as they would decay;
//  - underground water and lava that touches open air sideways or sits on air drains away, so caves never show a
//    flat wall of liquid (only liquid with solid ground somewhere above it);
//  - a cave cut into the side or floor of an ocean, lake or river, or into liquid in a neighbouring chunk, is sealed
//    with stone where it meets the water instead of leaving a standing wall of water.
const GC_HANG = /vine|lichen|roots|spore|dripstone|icicle|hanging|chain|lantern|#hang|resin_clump|propagule|weeping|twisting|cave_vines|glow_berries|pale_hanging_moss|cobweb|amethyst|ice_crystal|glow_lichen|sculk_vein|ladder|torch|sign|banner|button|lever|tripwire|creaking/;
const GC_WET = /coral|kelp|seagrass|sea_pickle|lily_pad/;
let GC_PLANT = null, GC_LOG = null, GC_LEAF = null;
function gcPlant(id) { if (!GC_PLANT) { GC_PLANT = new Uint8Array(BL.length + 8); for (const d of BL) if (d && (d.render === 'cross' || PLANT[d.id]) && !GC_HANG.test(d.key || '') && !GC_WET.test(d.key || '') && !d.fluid) GC_PLANT[d.id] = 1; } return GC_PLANT[id] === 1; }
function gcTables() { if (GC_LOG) return; GC_LOG = new Uint8Array(BL.length + 8); GC_LEAF = new Uint8Array(BL.length + 8);
  for (const d of BL) if (d) { const k = d.key || ''; if (/(_log|_wood|_stem|_hyphae)(#|$)|^log$/.test(k) && !/stripped/.test(k)) GC_LOG[d.id] = 1; else if (/leaves/.test(k)) GC_LEAF[d.id] = 1; } }
function gcOrphanLeaves(d, at, I) {
  gcTables(); let y0 = WH, y1 = -1; for (let i = 0; i < d.length; i++) if (GC_LEAF[d[i]]) { const y = i >> 8; if (y < y0) y0 = y; if (y > y1) y1 = y; } if (y1 < 0) return;
  const M = 7, X = 16 + 2 * M, ya = Math.max(0, y0 - M), yb = Math.min(WH - 1, y1 + M), Y = yb - ya + 1; const dist = new Uint8Array(X * X * Y).fill(255); const q = [];
  const J = (x, y, z) => ((y - ya) * X + (z + M)) * X + (x + M);
  for (let y = ya; y <= yb; y++) for (let z = -M; z < 16 + M; z++) for (let x = -M; x < 16 + M; x++) { const id = at(x, y, z); if (id > 0 && GC_LOG[id]) { const j = J(x, y, z); dist[j] = 0; q.push(j); } }
  for (let h = 0; h < q.length; h++) { const j = q[h]; const dd = dist[j]; if (dd >= M) continue; const x = j % X, z = ((j / X) | 0) % X, y = (j / (X * X)) | 0;
    for (const [a, b, e] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { const xx = x + a, yy = y + b, zz = z + e; if (xx < 0 || xx >= X || zz < 0 || zz >= X || yy < 0 || yy >= Y) continue; const k = (yy * X + zz) * X + xx; if (dist[k] > dd + 1) { dist[k] = dd + 1; q.push(k); } } }
  for (let y = y0; y <= y1; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) { const i = I(x, y, z); if (GC_LEAF[d[i]] && dist[J(x, y, z)] === 255) d[i] = 0; }
}
function worldgenCleanup(world, c) {
  const d = c.d, bx = c.cx * 16, bz = c.cz * 16; const I = (x, y, z) => (y * 16 + z) * 16 + x;
  const at = (x, y, z) => { if (x >= 0 && x < 16 && z >= 0 && z < 16) return y < 0 || y >= WH ? 0 : d[I(x, y, z)]; const n = world.getChunk(c.cx + (x >> 4), c.cz + (z >> 4)); if (!n || !n.d) return -1; return n.d[I(x & 15, y, z & 15)]; };
  const CANE = B.SUGAR_CANE, W = B.WATER, LAV = B.LAVA;
  for (let y = 1; y < WH - 1; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
    const i = I(x, y, z); const id = d[i]; if (!id) continue;
    if (gcPlant(id)) { const b = d[I(x, y - 1, z)]; const bd = BL[b];
      if (!b || (bd && bd.fluid)) { d[i] = 0; continue; }
      if (id === CANE && b !== CANE) { let wet = false; for (const [a, e] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = at(x + a, y - 1, z + e); if (n === W || n === -1 || (BL[n] && /ice/.test(BL[n].key || ''))) wet = true; } if (!wet) d[i] = 0; } }
    else if (id === B.SULFUR_SPIKE) { const b = d[I(x, y - 1, z)]; if (!b || (BL[b] && BL[b].fluid)) d[i] = 0; }
  }
  gcOrphanLeaves(d, at, I);
  // liquid walls underground
  for (let pass = 0; pass < 6; pass++) { let changed = 0;
    for (let y = 2; y < SEA - 3; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
      const i = I(x, y, z); const id = d[i]; if (id !== W && id !== LAV) continue;
      let open = d[I(x, y - 1, z)] === 0; if (!open) for (const [a, e] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (at(x + a, y, z + e) === 0) { open = true; break; }
      if (!open) continue;
      let roofed = false; for (let yy = y + 1; yy < Math.min(WH, y + 64); yy++) { const u = d[I(x, yy, z)]; if (SOLID[u] && (!BL[u] || BL[u].opaque !== false)) { roofed = true; break; } }
      if (roofed) { d[i] = 0; changed++; } }
    if (!changed) break; }
  // seal caves where they meet open water or a neighbour chunk's liquid
  const roofedAt = (x, y, z) => { for (let yy = y + 1; yy < Math.min(WH, y + 64); yy++) { const u = at(x, yy, z); if (u === -1) return true; if (SOLID[u] && (!BL[u] || BL[u].opaque !== false)) return true; } return false; };
  const sealWith = (x, y, z) => { const cnt = {}; let best = 0, bid = y < 64 ? B.DEEPSLATE : B.STONE; for (const [a, b2, e] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, -1, 0], [0, 1, 0]]) { const n = at(x + a, y + b2, z + e); if (n > 0 && SOLID[n] && BL[n] && BL[n].opaque !== false && !BL[n].fam) { cnt[n] = (cnt[n] || 0) + 1; if (cnt[n] > best) { best = cnt[n]; bid = n; } } } return bid; };
  for (let y = 2; y < SEA; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
    if (d[I(x, y, z)] !== 0) continue; let seal = false;
    for (const [a, b2, e] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]]) { const xx = x + a, yy = y + b2, zz = z + e; const n = at(xx, yy, zz); if (n !== W && n !== LAV) continue;
      const inside = xx >= 0 && xx < 16 && zz >= 0 && zz < 16; if (!inside || !roofedAt(xx, yy, zz)) { seal = true; break; } }
    if (seal) d[I(x, y, z)] = sealWith(x, y, z); }
}

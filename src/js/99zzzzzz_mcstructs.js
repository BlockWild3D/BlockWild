// ================= MINECRAFT STRUCTURE TEMPLATES =================
// The owner's Minecraft structure files (data/.../structure, 1511 .nbt templates) are packed into structures.bin
// (tools/mcstructs.py): every block already turned into this game's blocks for each of the 4 rotations. The file is
// loaded before a world starts. MCST.place() stamps a template (rotation around a pivot, integrity, skipping air,
// data markers); the builders below replace the game's own igloo, shipwreck, ruined portal, desert well, fossil and
// ocean ruin with Minecraft's.
const MCST = {
  ready: false, H: null, V: null, gid: null,
  async load() {
    try {
      const res = await fetch('structures.bin', { cache: 'force-cache' }); if (!res.ok) throw new Error(res.status);
      const ds = res.body.pipeThrough(new DecompressionStream('gzip')); const buf = await new Response(ds).arrayBuffer();
      const n = new DataView(buf).getUint32(0, true); MCST.H = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, n)));
      MCST.V = new Uint16Array(buf.slice(4 + n)); const byKey = {}; for (const d of BL) if (d && d.key) byKey[d.key] = d.id;
      MCST.gid = MCST.H.keys.map(k => k === '' ? 0 : (byKey[k] !== undefined ? byKey[k] : -1));
      MCST.ready = true;
    } catch (e) { console.warn('structures.bin not loaded, using the old structures', e); }
  },
  has(name) { return MCST.ready && !!MCST.H.t[name]; },
  size(name, rot) { const s = MCST.H.t[name].s; return rot & 1 ? [s[2], s[1], s[0]] : s.slice(); },
  // local (x,z) -> world, rotated rot quarter turns clockwise around pivot (px,pz); pos = where local 0,0,0 sits unrotated
  xf(lx, lz, rot, px, pz) { let dx = lx - px, dz = lz - pz; for (let i = 0; i < rot; i++) { const t = dx; dx = -dz; dz = t; } return [px + dx, pz + dz]; },
  // the world-space box of a placed template
  box(name, x0, y0, z0, rot, px = 0, pz = 0) { const s = MCST.H.t[name].s; let mnx = 1e9, mnz = 1e9, mxx = -1e9, mxz = -1e9;
    for (const [a, b] of [[0, 0], [s[0] - 1, 0], [0, s[2] - 1], [s[0] - 1, s[2] - 1]]) { const [x, z] = MCST.xf(a, b, rot, px, pz); mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mnz = Math.min(mnz, z); mxz = Math.max(mxz, z); }
    return { x0: x0 + mnx, x1: x0 + mxx, y0, y1: y0 + s[1] - 1, z0: z0 + mnz, z1: z0 + mxz }; },
  // opts: set(x,y,z,id) (required), skipAir, integrity + r, proc(id, x, y, z) -> id, marker(kind, x, y, z), entity(type, x, y, z)
  place(name, x0, y0, z0, rot, opts) {
    const t = MCST.H.t[name]; if (!t) return null; const [sx, sy, sz] = t.s; const V = MCST.V, P = MCST.H.pal, G = MCST.gid; const px = opts.px || 0, pz = opts.pz || 0;
    const integ = opts.integrity == null ? 1 : opts.integrity; const r = opts.r || Math.random;
    for (let y = 0; y < sy; y++) for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) {
      const v = V[t.o + (y * sz + z) * sx + x]; if (v === 0xFFFF) continue; const k = P[v][rot]; if (k < 0) continue; let id = G[k]; if (id < 0) continue;
      if (id === 0 && opts.skipAir) continue; if (integ < 1 && r() >= integ) continue;
      const [wx, wz] = MCST.xf(x, z, rot, px, pz); if (opts.proc) { id = opts.proc(id, x0 + wx, y0 + y, z0 + wz); if (id == null || id < 0) continue; }
      opts.set(x0 + wx, y0 + y, z0 + wz, id);
    }
    const W = (e) => { const [wx, wz] = MCST.xf(e[0], e[2], rot, px, pz); return [x0 + wx, y0 + e[1], z0 + wz]; };
    if (opts.chest) for (const c of t.c) { const [a, b, d] = W(c); opts.chest(a, b, d, c[3]); }
    for (const e of t.e) { const [a, b, d] = W(e); if (e[3].startsWith('data:')) { if (opts.marker) opts.marker(e[3].slice(5), a, b, d); } else if (opts.entity) opts.entity(e[3], a, b, d); }
    return MCST.box(name, x0, y0, z0, rot, px, pz);
  },
  id(key) { const d = BL.find(q => q && q.key === key); return d ? d.id : -1; },
};
MCST.loading = MCST.load();
{ const _sw = startWorld; startWorld = function (data) { if (!MCST.ready && MCST.loading) { const a = arguments, self = this; MCST.loading.then(() => { MCST.loading = null; startWorld.apply(self, a); }); return; } return _sw.apply(this, arguments); }; }
// chests whose loot is a Minecraft table name ('mc:chests/igloo_chest')
function mcSetChest(world, x, y, z, table) { world.chestLoot.set(x + ',' + y + ',' + z, 'mc:' + table); }
function MCST_ON() { return MCST.ready; }

// ---- igloo (IglooPieces): the dome, and half the time a ladder shaft of 4-11 sections down to a basement lab ----
function mcIgloo(world, S, hard, x0, z0, r) {
  const g = world.gen; const rot = r() * 4 | 0; const PIV = { top: [3, 5], middle: [1, 1], bottom: [3, 7] }, OFF = { top: [0, 0, 0], middle: [2, -3, 4], bottom: [0, -3, -2] };
  const [hx, hz] = MCST.xf(3 - 3, 0 - 5, rot, 0, 0); const h = g.column(x0 + 3 + hx, z0 + 5 + hz).h; const base = h - 1;
  const put = (part, down) => { const o = OFF[part], p = PIV[part]; const [ox, oz] = MCST.xf(o[0], o[2], rot, 0, 0);
    // pieces share a start; each turns around its own pivot like Minecraft
    return MCST.place('igloo/' + part, x0 + ox, base + o[1] - down, z0 + oz, rot, { set: hard, px: p[0], pz: p[1], marker: (k, x, y, z) => { if (k === 'chest') mcSetChest(world, x, y - 1, z, 'chests/igloo_chest'); },
      entity: (t, x, y, z) => S.mobs.push([t, x + 0.5, y, z + 0.5]) }); };
  if (r() < 0.5) { const n = (r() * 8 | 0) + 4; put('bottom', n * 3); for (let j = 0; j < n - 1; j++) put('middle', j * 3); put('top', 0); }
  else { put('top', 0); const [tx, tz] = MCST.xf(3, 5, rot, 3, 5); hard(x0 + tx, base, z0 + tz, B.SNOW_BLOCK); }
  S.kinds.push(['igloo', x0 + 3, z0 + 4]);
}
// ---- shipwreck (ShipwreckPieces): one of 20 hull templates on the sea floor; beached ones only right side up ----
const SHIP_OCEAN = ['with_mast', 'upsidedown_full', 'upsidedown_fronthalf', 'upsidedown_backhalf', 'sideways_full', 'sideways_fronthalf', 'sideways_backhalf', 'rightsideup_full', 'rightsideup_fronthalf', 'rightsideup_backhalf',
  'with_mast_degraded', 'upsidedown_full_degraded', 'upsidedown_fronthalf_degraded', 'upsidedown_backhalf_degraded', 'sideways_full_degraded', 'sideways_fronthalf_degraded', 'sideways_backhalf_degraded', 'rightsideup_full_degraded', 'rightsideup_fronthalf_degraded', 'rightsideup_backhalf_degraded'];
const SHIP_BEACH = ['with_mast', 'sideways_full', 'sideways_fronthalf', 'sideways_backhalf', 'rightsideup_full', 'rightsideup_fronthalf', 'rightsideup_backhalf', 'with_mast_degraded', 'rightsideup_full_degraded', 'rightsideup_fronthalf_degraded', 'rightsideup_backhalf_degraded'];
function mcShipwreck(world, S, hard, xc, zc, r) {
  const g = world.gen; const beached = g.column(xc, zc).h >= SEA - 1; const L = beached ? SHIP_BEACH : SHIP_OCEAN; const name = 'shipwreck/' + L[r() * L.length | 0]; const rot = r() * 4 | 0;
  const x0 = xc - 4, z0 = zc - 15; const bx = MCST.box(name, x0, 0, z0, rot, 4, 15); let mn = 1e9;
  for (let x = bx.x0; x <= bx.x1; x += 2) for (let z = bx.z0; z <= bx.z1; z += 2) mn = Math.min(mn, g.column(x, z).h);
  const s = MCST.H.t[name].s; const y = beached ? mn - (s[1] >> 1) - (r() * 3 | 0) : mn;
  const LOOT = { map_chest: 'chests/shipwreck_map', treasure_chest: 'chests/shipwreck_treasure', supply_chest: 'chests/shipwreck_supply' };
  MCST.place(name, x0, y, z0, rot, { set: hard, skipAir: true, px: 4, pz: 15, marker: (k, x, yy, z) => { if (LOOT[k]) mcSetChest(world, x, yy - 1, z, LOOT[k]); } });
  S.kinds.push(['shipwreck', xc, zc]);
}
// ---- ruined portal: 1 of 10 portals (5%: 1 of 3 giant ones), some gold knocked out, a little crying obsidian,
// mossy stone, netherrack and magma spreading over the ground around it ----
function mcRuinedPortal(S, g, x0, z0, hard, r, world) {
  const giant = r() < 0.05; const name = giant ? 'ruined_portal/giant_portal_' + (1 + (r() * 3 | 0)) : 'ruined_portal/portal_' + (1 + (r() * 10 | 0)); const rot = r() * 4 | 0;
  const s = MCST.H.t[name].s; const px = s[0] >> 1, pz = s[2] >> 1; const bx = MCST.box(name, x0, 0, z0, rot, px, pz);
  let mn = 1e9; for (let x = bx.x0; x <= bx.x1; x += 2) for (let z = bx.z0; z <= bx.z1; z += 2) mn = Math.min(mn, g.column(x, z).h); if (mn <= SEA) return;
  const buried = r() < 0.5; const y = mn - 1 - (buried ? 1 + (r() * Math.max(1, s[1] / 3) | 0) : 0);
  const G = B.GOLD_BLOCK, OB = B.OBSIDIAN, CO = B.CRYING_OBSIDIAN, SB = B.STONE_BRICKS, MSB = B.MOSSY_STONE_BRICKS, CSB = B.CRACKED_STONE_BRICKS;
  const cold = [BIO.SNOWY, BIO.MOUNTAINS].includes(g.column(x0, z0).b); // cold places: Minecraft turns the lava to magma
  const proc = (id) => { if (cold && id === B.LAVA) return B.MAGMA_BLOCK; if (id === G && r() < 0.3) return 0; if (id === OB && CO && r() < 0.07) return CO; if (id === SB && r() < 0.2) return r() < 0.5 ? (MSB || SB) : (CSB || SB); return id; };
  // netherrack spread first so the portal's own blocks win
  const cx = (bx.x0 + bx.x1) / 2, cz = (bx.z0 + bx.z1) / 2, R = Math.max(bx.x1 - bx.x0, bx.z1 - bx.z0) / 2 + 2;
  for (let x = Math.floor(cx - R); x <= cx + R; x++) for (let z = Math.floor(cz - R); z <= cz + R; z++) { const d = Math.hypot(x - cx, z - cz) / R; if (d > 1 || r() > 1 - d * d) continue; const h = g.column(x, z).h; if (h <= SEA) continue; hard(x, h - 1, z, r() < 0.07 ? B.MAGMA_BLOCK : B.NETHERRACK); }
  MCST.place(name, x0, y, z0, rot, { set: hard, skipAir: true, px, pz, proc, chest: (x, yy, z, t) => mcSetChest(world, x, yy, z, t) });
}
// ---- desert well: the template with one suspicious sand under the water ----
function mcDesertWell(world, S, g, x0, z0, hard, r) {
  const h = g.column(x0 + 2, z0 + 2).h; MCST.place('desert_well/well', x0, h - 3, z0, 0, { set: hard });
  const spots = [[2, 1], [1, 2], [2, 2], [3, 2], [2, 3]]; const [sx, sz] = spots[r() * spots.length | 0]; if (B.SUSPICIOUS_SAND) hard(x0 + sx, h - 2, z0 + sz, B.SUSPICIOUS_SAND);
}
// ---- fossils: a spine or skull of bone blocks, 90% intact, with the coal overlay on top (10%) ----
function mcFossil(S, x0, y0, z0, r, coal) {
  const kind = (r() < 0.5 ? 'spine_' : 'skull_') + (1 + (r() * 4 | 0)); const rot = r() * 4 | 0; const set = (x, y, z, id) => { if (y > 1 && y < WH) S.hard.push(x, y, z, id); };
  MCST.place('fossil/' + kind, x0, y0, z0, rot, { set, skipAir: true, integrity: 0.9, r });
  if (coal) MCST.place('fossil/' + kind + '_coal', x0, y0, z0, rot, { set, skipAir: true, integrity: 0.1, r });
}
// ---- ocean ruins: cold (stone brick) or warm (sandstone); 30% are big ruins with smaller ones around them ----
function mcOceanRuin(world, S, x0, z0, r) {
  const g = world.gen; const col = g.column(x0, z0); const warm = col.v === BV.WARM_OCEAN || col.v === BV.LUKEWARM_OCEAN; const big = r() < 0.3;
  const set = (x, y, z, id) => { if (y > 1 && y < WH) S.hard.push(x, y, z, id); };
  const pick = (isBig) => { if (warm) return isBig ? 'big_warm_' + (4 + (r() * 4 | 0)) : 'warm_' + (1 + (r() * 8 | 0)); const m = ['brick', 'cracked', 'mossy'][r() * 3 | 0]; return isBig ? 'big_' + m + '_' + [1, 2, 3, 8][r() * 4 | 0] : m + '_' + (1 + (r() * 8 | 0)); };
  const one = (name, x, z, isBig) => { const rot = r() * 4 | 0; const s = MCST.H.t['underwater_ruin/' + name].s; const bx = MCST.box('underwater_ruin/' + name, x, 0, z, rot, 0, 0); let mn = 1e9;
    for (let a = bx.x0; a <= bx.x1; a += 2) for (let b = bx.z0; b <= bx.z1; b += 2) mn = Math.min(mn, g.column(a, b).h); if (mn >= SEA - 1) return;
    MCST.place('underwater_ruin/' + name, x, mn - 1, z, rot, { set, skipAir: true, integrity: isBig ? 0.9 : 0.8, r,
      marker: (k, a, y, b) => { if (k === 'chest') { set(a, y, b, B.CHEST); mcSetChest(world, a, y, b, isBig ? 'chests/underwater_ruin_big' : 'chests/underwater_ruin_small'); } else if (k === 'drowned') S.mobs.push(['drowned', a + 0.5, y, b + 0.5]); } }); };
  one(pick(big), x0, z0, big);
  if (big) { const n = 4 + (r() * 5 | 0); for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = 8 + r() * 4; one(pick(false), Math.round(x0 + 8 + Math.cos(a) * d), Math.round(z0 + 8 + Math.sin(a) * d), false); } }
  S.kinds.push(['ocean_ruin', x0, z0]);
}
// swap the game's builders for these once the templates are loaded
{ const _f = buildFossil; buildFossil = function (S, x0, y0, z0, r, coal) { return MCST_ON() ? mcFossil(S, x0, y0, z0, r, coal) : _f.apply(this, arguments); }; }
{ const _o = buildOceanRuin; buildOceanRuin = function (world, S, x0, z0, r) { return MCST_ON() ? mcOceanRuin(world, S, x0, z0, r) : _o.apply(this, arguments); }; }
{ const _p = buildRuinedPortal; buildRuinedPortal = function (S, g, x0, z0, hard, r, world) { return MCST_ON() ? mcRuinedPortal(S, g, x0, z0, hard, r, world) : _p.apply(this, arguments); }; }

// ================= JIGSAW STRUCTURES (villages, outposts, ...) =================
// Minecraft's JigsawPlacement: a start piece from the start pool, then breadth first every jigsaw block pulls a piece
// from its pool (weighted random order, 4 rotations shuffled) whose matching jigsaw faces it and whose box fits the free
// space (inside the parent when the jigsaw points into it, else the structure's max distance minus every other piece),
// to `size` levels deep, then only the pools' fallbacks (terminators). Rigid pieces keep their height; terrain matching
// ones (roads) follow the ground block by block. The layout is made once per start and every chunk stamps its part.
const MCJ_DIRS = { north: [0, 0, -1], south: [0, 0, 1], east: [1, 0, 0], west: [-1, 0, 0], up: [0, 1, 0], down: [0, -1, 0] };
const MCJ_ROT = (d, rot) => { const L = ['north', 'east', 'south', 'west']; const i = L.indexOf(d); return i < 0 ? d : L[(i + rot) % 4]; };
const MCJ_OPP = { north: 'south', south: 'north', east: 'west', west: 'east', up: 'down', down: 'up' };
const MCJ = {
  H(x, z, g) { const h = g.column(x, z).h; return Math.max(h, SEA); },   // WORLD_SURFACE_WG
  order(list, r) { return list.map(e => [e, -Math.log(1 - r()) / Math.max(1e-6, e.weight || 1)]).sort((a, b) => a[1] - b[1]).map(a => a[0]); },
  // a pool element -> the template it stamps (null for empty / feature elements)
  tpl(el) { const t = el.element_type; if (t === 'single_pool_element' || t === 'legacy_single_pool_element') return { loc: el.location, proc: el.processors, proj: el.projection || 'rigid', legacy: t === 'legacy_single_pool_element' };
    if (t === 'list_pool_element') { const a = (el.elements || []).map(MCJ.tpl).filter(Boolean); return a.length ? Object.assign({}, a[0], { list: a }) : null; } return null; },
  jigs(loc, rot, x, y, z) { const t = MCST.H.t[loc]; if (!t) return []; return t.j.map(j => { const [a, b] = MCST.xf(j[0], j[2], rot, 0, 0); const [f, tp] = j[3].split('_');
    return { x: x + a, y: y + j[1], z: z + b, front: MCJ_ROT(f, rot), top: MCJ_ROT(tp, rot), name: j[4], target: j[5], pool: j[6], joint: j[7] || (f === 'up' || f === 'down' ? 'rollable' : 'aligned'), pp: j[8] || 0, sp: j[9] || 0, ly: j[1] }; }); },
  inBox(b, x, y, z) { return x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && z >= b.z0 && z <= b.z1; },
  hit(a, b) { return a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0 && a.z0 <= b.z1 && a.z1 >= b.z0; },
  inside(a, b) { return a.x0 >= b.x0 && a.x1 <= b.x1 && a.y0 >= b.y0 && a.y1 <= b.y1 && a.z0 >= b.z0 && a.z1 <= b.z1; },
  alias(name, al) { return al && al[name] ? al[name] : name; },
  layout(world, sname, sx, sz, seed) {
    const S = MCST.H.structs[sname]; const g = world.gen; const r = mulberry32(seed >>> 0); const pools = MCST.H.pools;
    // pool aliases (trial chambers' spawner mobs)
    const al = {}; for (const a of S.pool_aliases || []) { if (a.type === 'direct') al[a.alias] = a.target; else if (a.type === 'random') { const t = MCJ.order(a.targets, r)[0]; al[a.alias] = t.data; } else if (a.type === 'random_group') { const grp = MCJ.order(a.groups, r)[0]; for (const d of grp.data) al[d.alias] = d.target; } }
    const sp = pools[MCJ.alias(S.start_pool, al)]; if (!sp) return null; let start = null; let rot = r() * 4 | 0;
    for (const e of MCJ.order(sp.elements, r)) { const t = MCJ.tpl(e.element); if (t && MCST.H.t[t.loc]) { start = t; break; } } if (!start) return null;
    let x = sx, z = sz, y;
    const sh = S.start_height || {}; const hy = sh.absolute != null ? sh.absolute : (sh.min_inclusive ? sh.min_inclusive.absolute + Math.floor(r() * (sh.max_inclusive.absolute - sh.min_inclusive.absolute + 1)) : 0);
    if (S.start_jigsaw_name) { const J = MCJ.jigs(start.loc, rot, 0, 0, 0).find(j => j.name === S.start_jigsaw_name); if (J) { x -= J.x; z -= J.z; } }
    let box = MCST.box(start.loc, x, 0, z, rot, 0, 0);
    if (S.project_start_to_heightmap) y = MCJ.H((box.x0 + box.x1) >> 1, (box.z0 + box.z1) >> 1, g) + hy - 1; else y = (world.dim === 'overworld' ? YOFF : 0) + hy;
    if (S.start_jigsaw_name) { const J = MCJ.jigs(start.loc, rot, 0, 0, 0).find(j => j.name === S.start_jigsaw_name); if (J) y -= J.y; }
    box = MCST.box(start.loc, x, y, z, rot, 0, 0);
    const md = S.max_distance_from_center || 80; const cx = (box.x0 + box.x1) >> 1, cz = (box.z0 + box.z1) >> 1;
    const bounds = { x0: cx - md, x1: cx + md, y0: Math.max(1, box.y0 - md), y1: Math.min(WH - 1, box.y0 + md), z0: cz - md, z1: cz + md };
    const first = { t: start, rot, x, y, z, box, depth: 0, gd: 1, inner: [] }; if (S.use_expansion_hack) MCJ.expand(first, al); const pieces = [first]; const global = [box];
    const queue = [first]; const size = S.size || 6;
    while (queue.length) {
      const P = queue.shift(); if (pieces.length > 400) break; const rigidP = P.t.proj === 'rigid';
      const js = MCJ.order(MCJ.jigs(P.t.loc, P.rot, P.x, P.y, P.z).map(j => Object.assign(j, { weight: 1 })), r).sort((a, b) => b.sp - a.sp);
      for (const J of js) {
        const pool = pools[MCJ.alias(J.pool, al)]; if (!pool) continue; const D = MCJ_DIRS[J.front]; const ax = J.x + D[0], ay = J.y + D[1], az = J.z + D[2];
        const intoParent = MCJ.inBox(P.box, ax, ay, az); const cont = intoParent ? { b: P.box, list: P.inner } : { b: bounds, list: global };
        const fb = pools[pool.fallback]; let cands = P.depth < size ? MCJ.order(pool.elements, r) : []; if (fb) cands = cands.concat(MCJ.order(fb.elements, r));
        let placed = false; const k = J.y - P.box.y0;
        for (const ce of cands) {
          const t = MCJ.tpl(ce.element); if (!t) { if (ce.element.element_type === 'empty_pool_element') break; continue; } if (!MCST.H.t[t.loc]) continue;
          const rots = MCJ.order([0, 1, 2, 3].map(v => ({ v, weight: 1 })), r).map(o => o.v);
          for (const rr of rots) {
            const tj = MCJ.order(MCJ.jigs(t.loc, rr, 0, 0, 0).map(j => Object.assign(j, { weight: 1 })), r).sort((a, b) => b.sp - a.sp);
            for (const T of tj) {
              if (T.front !== MCJ_OPP[J.front] || T.name !== J.target || (J.joint !== 'rollable' && T.top !== J.top)) continue;
              const ox = ax - T.x, oz = az - T.z; const rigidT = t.proj === 'rigid'; const i1 = T.ly; const j1 = k - i1 + D[1];
              let k1; if (rigidP && rigidT) k1 = P.box.y0 + j1; else k1 = MCJ.H(J.x, J.z, g) - i1;
              const oy = k1; const cb = MCST.box(t.loc, ox, oy, oz, rr, 0, 0);
              if (!MCJ.inside(cb, cont.b) || cont.list.some(b => MCJ.hit(b, cb))) continue;
              const C = { t, rot: rr, x: ox, y: oy, z: oz, box: cb, depth: P.depth + 1, inner: [] }; cont.list.push(cb); if (S.use_expansion_hack) MCJ.expand(C, al);
              pieces.push(C); if (C.depth <= size) { let i = queue.length; while (i > 0 && (queue[i - 1].pp || 0) < (T.pp || 0)) i--; C.pp = J.pp; queue.splice(i, 0, C); } placed = true; break;
            }
            if (placed) break;
          }
          if (placed) break;
        }
      }
    }
    let mn = { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 }; for (const p of pieces) { mn.x0 = Math.min(mn.x0, p.box.x0); mn.x1 = Math.max(mn.x1, p.box.x1); mn.z0 = Math.min(mn.z0, p.box.z0); mn.z1 = Math.max(mn.z1, p.box.z1); }
    return { name: sname, pieces, all: mn, adapt: S.terrain_adaptation || 'none', seed };
  },
  // the tallest template a pool can give (Minecraft's StructureTemplatePool.getMaxSize)
  maxSize(name) { MCJ._ms = MCJ._ms || {}; if (MCJ._ms[name] != null) return MCJ._ms[name]; const p = MCST.H.pools[name]; let m = 0;
    if (p) for (const e of p.elements) { const t = MCJ.tpl(e.element); if (t && MCST.H.t[t.loc]) m = Math.max(m, MCST.H.t[t.loc].s[1]); } return (MCJ._ms[name] = m); },
  // villages' expansion hack: a piece whose jigsaws point into itself (a street with house plots) gets a box tall
  // enough for the tallest thing those jigsaws can pull, so the houses fit inside it
  expand(P, al) { let k = 0; for (const J of MCJ.jigs(P.t.loc, P.rot, P.x, P.y, P.z)) { const D = MCJ_DIRS[J.front]; if (!MCJ.inBox(P.box, J.x + D[0], J.y + D[1], J.z + D[2])) continue; const pl = MCST.H.pools[MCJ.alias(J.pool, al)];
      k = Math.max(k, MCJ.maxSize(MCJ.alias(J.pool, al)), pl && pl.fallback ? MCJ.maxSize(pl.fallback) : 0); }
    if (k > 0) P.box = Object.assign({}, P.box, { y1: P.box.y0 + Math.max(k + 1, P.box.y1 - P.box.y0) }); },
  famOf(id) { const d = BL[id]; return d ? (d.fam || (d.key || '').split('#')[0]) : ''; },
  // processor list (name or inline) -> a function(id, x, y, z) -> id | null
  procFn(spec, g, seed) {
    let L = typeof spec === 'string' ? MCST.H.procs[spec] : spec; L = L && L.processors ? L.processors : (Array.isArray(L) ? L : []); if (!L.length) return null;
    const G = MCST.gid; const gid = (o) => o && o.g != null && o.g >= 0 ? G[o.g] : -1;
    const loc = (lp, x, y, z) => { const t = lp && lp.predicate_type; if (!t || t === 'always_true') return true; if (t === 'block_match') { if (lp.block === 'water') return y < SEA && g.column(x, z).h <= y; return false; } return false; };
    const inp = (ip, id, x, y, z, k) => { const t = ip.predicate_type; if (t === 'always_true') return true;
      if (t === 'block_match') return ip.bg >= 0 && MCJ.famOf(id) === MCJ.famOf(G[ip.bg]);
      if (t === 'random_block_match') return ip.bg >= 0 && MCJ.famOf(id) === MCJ.famOf(G[ip.bg]) && rnd01(x * 7 + k, y, z, seed) < ip.probability;
      if (t === 'blockstate_match') return id === gid(ip.block_state); return false; };
    return (id, x, y, z) => {
      for (let pi = 0; pi < L.length; pi++) { const p = L[pi]; const t = p.processor_type;
        if (t === 'rule') { for (let k = 0; k < p.rules.length; k++) { const R = p.rules[k]; if (inp(R.input_predicate, id, x, y, z, pi * 31 + k) && loc(R.location_predicate, x, y, z)) { const o = gid(R.output_state); if (o >= 0) id = o; break; } } }
        else if (t === 'block_rot') { if (id && rnd01(x, y * 3 + pi, z, seed ^ 0x5151) >= (p.integrity == null ? 1 : p.integrity)) return null; }
        else if (t === 'capped' && p.delegate) { const sub = MCJ.procFn({ processors: [p.delegate] }, g, seed + pi); if (sub) { const v = sub(id, x, y, z); if (v == null) return null; id = v; } }
      }
      return id; };
  },
  // stamp every piece of a layout that reaches chunk c (blocks outside the chunk are dropped)
  stamp(world, c, L, S) {
    const g = world.gen; const bx = c.cx * 16, bz = c.cz * 16; const d = c.d; const I = (x, y, z) => (y * 16 + (z - bz)) * 16 + (x - bx);
    const inC = (x, z) => x >= bx && x < bx + 16 && z >= bz && z < bz + 16;
    for (const p of L.pieces) {
      if (p.box.x1 < bx - 1 || p.box.x0 > bx + 16 || p.box.z1 < bz - 1 || p.box.z0 > bz + 16) continue;
      const parts = p.t.list || [p.t];
      for (const t of parts) {
        const proc = t.proc ? MCJ.procFn(t.proc, g, L.seed) : null; const tm = t.proj === 'terrain_matching';
        // beard: earth under rigid surface pieces, and the ground over them cut away
        if (!tm && (L.adapt === 'beard_thin' || L.adapt === 'beard_box') && p === p) for (let x = Math.max(p.box.x0, bx); x <= Math.min(p.box.x1, bx + 15); x++) for (let z = Math.max(p.box.z0, bz); z <= Math.min(p.box.z1, bz + 15); z++) {
          const h = g.column(x, z).h; if (L.adapt === 'beard_thin') { const fill = g.column(x, z).b === BIO.DESERT ? B.SAND : B.DIRT; for (let y = Math.max(1, h - 1); y < p.box.y0; y++) d[I(x, y, z)] = fill; }
          if (L.adapt === 'beard_thin') for (let y = p.box.y1 + 1; y < Math.min(WH, h); y++) d[I(x, y, z)] = 0; }
        MCST.place(t.loc, p.x, p.y, p.z, p.rot, { skipAir: t.legacy, proc: proc ? ((id, x, y, z) => proc(id, x, y, z)) : null,
          set: (x, y, z, id) => { if (!inC(x, z)) return; if (tm) y = MCJ.H(x, z, g) - 1 + (y - p.y); if (y < 1 || y >= WH) return; const j = I(x, y, z); if (d[j] === B.BEDROCK) return; d[j] = id;
            // trial spawners and vaults need their state registered like the game's own trial chambers
            if (id === B.TRIAL_SPAWNER) { const m = t.loc.split('/').pop(); const mob = { poison_skeleton: 'bogged', baby_zombie: 'zombie' }[m] || m; (c.trials = c.trials || []).push([x, y, z, typeof MOBS !== 'undefined' && MOBS[mob] ? mob : 'zombie']); }
            else if (id === B.VAULT) (c.vaults = c.vaults || []).push([x, y, z, /ominous/.test(t.loc) ? 'ominous_vault' : 'trial_vault']); },
          chest: (x, y, z, tbl) => { if (inC(x, z)) mcSetChest(world, x, tm ? MCJ.H(x, z, g) - 1 + (y - p.y) : y, z, tbl); },
          entity: (type, x, y, z) => { if (inC(x, z) && S && typeof MOBS !== 'undefined' && MOBS[type]) S.mobs.push([type, x + 0.5, tm ? MCJ.H(x, z, g) + (y - p.y) - 1 : y, z + 0.5]); } });
      }
    }
  },
};
// which Minecraft jigsaw structure a game start becomes (the game's own start grid and biome rules stay)
const MCJ_CAMP = { [BIO.FOREST]: 'forest', [BIO.PLAINS]: 'meadow', [BIO.TAIGA]: 'taiga', [BIO.SNOWY]: 'snowy_taiga', [BIO.SAVANNA]: 'savanna', [BIO.JUNGLE]: 'sparse_jungle', [BIO.SWAMP]: 'swamp',
  [BIO.CHERRY_GROVE]: 'cherry_grove', [BIO.PALE_GARDEN]: 'pale_garden', [BIO.DARK_FOREST]: 'forest', [BIO.MOUNTAINS]: 'windswept_forest', [BIO.MANGROVE_SWAMP]: 'swamp' };
const MCJ_KINDS = {
  village: { reach: 6, pick: (col) => col.b === BIO.DESERT ? 'village_desert' : col.b === BIO.SNOWY ? 'village_snowy' : col.b === BIO.SAVANNA ? 'village_savanna' : col.b === BIO.TAIGA ? 'village_taiga' : 'village_plains' },
  outpost: { reach: 6, pick: () => 'pillager_outpost', mobs: [['pillager', 4]] },
  abandoned_camp: { reach: 3, pick: (col) => { let n = MCJ_CAMP[col.b] || 'forest'; if (col.b === BIO.FOREST && typeof BV !== 'undefined') { if (col.v === BV.BIRCH_FOREST) n = 'birch_forest'; else if (col.v === BV.FLOWER_FOREST) n = 'flower_forest'; else if (col.v === BV.DAPPLED_FOREST) n = 'dappled_forest'; } if (BIO.BADLANDS != null && col.b === BIO.BADLANDS) n = 'wooded_badlands'; return MCST.H.structs['abandoned_camp_' + n] ? 'abandoned_camp_' + n : 'abandoned_camp_forest'; },
    ok: (col) => col.h > SEA + 1 && !(typeof isRiver === 'function' && isRiver(col)) },
  trail_ruins: { reach: 6, pick: () => 'trail_ruins', ok: (col) => col.h > SEA + 4 },
  trial_chambers: { reach: 8, pick: () => 'trial_chambers', skip: (world, st) => mcjStarts(world, 'ancient_city', st.cx, st.cz).length > 0 }, // never on top of an ancient city
  ancient_city: { reach: 8, pick: () => 'ancient_city' },
  bastion: { dim: 'nether', reach: 6, pick: () => 'bastion_remnant',
    starts: (world, cx, cz, R) => { const g = world.gen; const out = []; for (let rx = Math.floor((cx - R) / 27); rx <= Math.floor((cx + R) / 27); rx++) for (let rz = Math.floor((cz - R) / 27); rz <= Math.floor((cz + R) / 27); rz++) {
      const b = g.bastion(rx, rz); if (b && Math.abs(b.ccx - cx) <= R && Math.abs(b.ccz - cz) <= R) out.push({ cx: b.ccx, cz: b.ccz, seed: b.seed, col: null }); } return out; } },
};
function mcjLayout(world, kind, st) {
  world.mcjCache = world.mcjCache || new Map(); const key = kind + ':' + st.cx + ',' + st.cz; if (world.mcjCache.has(key)) return world.mcjCache.get(key);
  const K = MCJ_KINDS[kind]; let L = null;
  if ((!K.ok || (st.col && K.ok(st.col))) && !(K.skip && K.skip(world, st))) { const sname = K.pick(st.col); if (MCST.H.structs[sname]) L = MCJ.layout(world, sname, st.cx * 16, st.cz * 16, st.seed); }
  if (world.mcjCache.size > 300) world.mcjCache.clear(); world.mcjCache.set(key, L); return L;
}
function mcjStarts(world, kind, cx, cz) { const K = MCJ_KINDS[kind]; if (K.starts) return K.starts(world, cx, cz, K.reach); const out = []; const sp = PLACE[kind] && PLACE[kind].spacing; if (!sp) return out;
  for (let rx = Math.floor((cx - K.reach) / sp); rx <= Math.floor((cx + K.reach) / sp); rx++) for (let rz = Math.floor((cz - K.reach) / sp); rz <= Math.floor((cz + K.reach) / sp); rz++) {
    const st = regionStart(world, kind, rx, rz); if (st && Math.max(Math.abs(st.cx - cx), Math.abs(st.cz - cz)) <= K.reach) out.push(st); } return out; }
function mcjChunk(world, c) {
  if (!MCST_ON()) return; const S = world.hintsDone.has(c.key) ? null : structuresFor(world, c.cx, c.cz);
  for (const kind in MCJ_KINDS) { const K = MCJ_KINDS[kind]; if ((K.dim || 'overworld') !== world.dim) continue;
    for (const st of mcjStarts(world, kind, c.cx, c.cz)) {
      const L = mcjLayout(world, kind, st); if (!L) continue; if (L.all.x1 < c.cx * 16 || L.all.x0 > c.cx * 16 + 15 || L.all.z1 < c.cz * 16 || L.all.z0 > c.cz * 16 + 15) continue;
      MCJ.stamp(world, c, L, S);
      if (S && st.cx === c.cx && st.cz === c.cz) { if (!S.kinds.some(k => k[0] === kind)) S.kinds.push([kind, st.cx * 16 + 8, st.cz * 16 + 8]);
        if (K.mobs) for (const [t, n] of K.mobs) for (let i = 0; i < n; i++) { const p = L.pieces[0]; S.mobs.push([t, (p.box.x0 + p.box.x1) / 2 + i, p.box.y0 + 1, (p.box.z0 + p.box.z1) / 2]); } }
    } }
}
// the game's own versions step aside while the templates are loaded
{ const _c = buildCamp; buildCamp = function (world, S, x0, z0) { if (!MCST_ON()) return _c.apply(this, arguments); }; }
{ const _t = buildTrailRuins; buildTrailRuins = function (world, S, x0, z0) { if (!MCST_ON()) return _t.apply(this, arguments); }; }
{ const _t = buildTrialChunk; buildTrialChunk = function () { if (!MCST_ON()) return _t.apply(this, arguments); }; }
{ const _a = buildAncientChunk; buildAncientChunk = function () { if (!MCST_ON()) return _a.apply(this, arguments); }; }
{ const _b = buildBastionChunk; buildBastionChunk = function (world, c) { if (!MCST_ON()) return _b.apply(this, arguments); try { mcjChunk(world, c); } catch (e) { console.error('bastion', e); } }; }
{ const _wc = worldgenCleanup; worldgenCleanup = function (world, c) { const r = _wc.apply(this, arguments); try { mcjChunk(world, c); } catch (e) { console.error('jigsaw', e); } return r; }; }

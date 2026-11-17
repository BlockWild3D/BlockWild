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
          entity: (type, x, y, z) => { if (inC(x, z) && S && typeof MOBS !== 'undefined' && MOBS[type]) S.mobs.push([type, x + 0.5, tm ? MCJ.H(x, z, g) + (y - p.y) - 1 : y, z + 0.5]); },
          marker: L.marker ? ((k, x, y, z) => { if (inC(x, z)) L.marker(k, x, y, z, S, c); }) : null });
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

// ================= END CITIES (Minecraft's EndCityPieces, rebuilt in JS) =================
// The real pieces from the owner's templates, put together the way Minecraft's code does it: a house tower, then
// towers, bridges, more house towers and fat towers recursively (8 deep), each batch thrown away if it hits an
// earlier one, and sometimes an End ship 70 blocks out at the end of a bridge.
const EC = {
  piece(name, x, y, z, rot, ow) { const b = MCST.box('end_city/' + name, x, y, z, rot, 0, 0); return { name, x, y, z, rot, ow, box: b, gd: 0 }; },
  add(prev, off, name, rot, ow) { const [a, b] = MCST.xf(off[0], off[2], prev.rot, 0, 0); return EC.piece(name, prev.x + a, prev.y + off[1], prev.z + b, rot, ow); },
  TOWER_BRIDGES: [[0, [1, -1, 0]], [1, [6, -1, 1]], [3, [0, -1, 5]], [2, [5, -1, 6]]],
  FAT_BRIDGES: [[0, [4, -1, 0]], [1, [12, -1, 4]], [3, [0, -1, 8]], [2, [8, -1, 12]]],
  recurse(gen, depth, parent, pos, pieces, r, st) {
    if (depth > 8) return false; const list = [];
    if (EC[gen](depth, parent, pos, list, r, st)) { const i = (r() * 2147483647) | 0; let hit = false;
      for (const p of list) { p.gd = i; const c = pieces.find(q => MCJ.hit(q.box, p.box)); if (c && c.gd !== parent.gd) { hit = true; break; } }
      if (!hit) { pieces.push(...list); return true; } }
    return false; },
  tower(depth, parent, pos, L, r, st) {
    const rot = parent.rot; let p = EC.add(parent, [3 + (r() * 2 | 0), -3, 3 + (r() * 2 | 0)], 'tower_base', rot, true); L.push(p);
    p = EC.add(p, [0, 7, 0], 'tower_piece', rot, true); L.push(p); let floor = (r() * 3 | 0) === 0 ? p : null; const n = 1 + (r() * 3 | 0);
    for (let j = 0; j < n; j++) { p = EC.add(p, [0, 4, 0], 'tower_piece', rot, true); L.push(p); if (j < n - 1 && r() < 0.5) floor = p; }
    if (floor) { for (const [ro, off] of EC.TOWER_BRIDGES) if (r() < 0.5) { const b = EC.add(floor, off, 'bridge_end', (rot + ro) % 4, true); L.push(b); EC.recurse('bridge', depth + 1, b, null, L, r, st); }
      L.push(EC.add(p, [-1, 4, -1], 'tower_top', rot, true)); }
    else { if (depth !== 7) return EC.recurse('fat', depth + 1, p, null, L, r, st); L.push(EC.add(p, [-1, 4, -1], 'tower_top', rot, true)); }
    return true; },
  bridge(depth, parent, pos, L, r, st) {
    const rot = parent.rot; const n = (r() * 4 | 0) + 1; let p = EC.add(parent, [0, 0, -4], 'bridge_piece', rot, true); p.gd = -1; L.push(p); let j = 0;
    for (let k = 0; k < n; k++) { if (r() < 0.5) { p = EC.add(p, [0, j, -4], 'bridge_piece', rot, true); L.push(p); j = 0; }
      else { p = r() < 0.5 ? EC.add(p, [0, j, -4], 'bridge_steep_stairs', rot, true) : EC.add(p, [0, j, -8], 'bridge_gentle_stairs', rot, true); L.push(p); j = 4; } }
    if (!st.ship && (r() * (10 - depth) | 0) === 0) { L.push(EC.add(p, [-8 + (r() * 8 | 0), j, -70 + (r() * 10 | 0)], 'ship', rot, true)); st.ship = true; }
    else if (!EC.recurse('house', depth + 1, p, [-3, j + 1, -11], L, r, st)) return false;
    p = EC.add(p, [4, j, 0], 'bridge_end', (rot + 2) % 4, true); p.gd = -1; L.push(p); return true; },
  house(depth, parent, pos, L, r, st) {
    if (depth > 8) return false; const rot = parent.rot; let p = EC.add(parent, pos, 'base_floor', rot, true); L.push(p); const i = r() * 3 | 0;
    if (i === 0) L.push(EC.add(p, [-1, 4, -1], 'base_roof', rot, true));
    else if (i === 1) { p = EC.add(p, [-1, 0, -1], 'second_floor_2', rot, false); L.push(p); p = EC.add(p, [-1, 8, -1], 'second_roof', rot, false); L.push(p); EC.recurse('tower', depth + 1, p, null, L, r, st); }
    else { p = EC.add(p, [-1, 0, -1], 'second_floor_2', rot, false); L.push(p); p = EC.add(p, [-1, 4, -1], 'third_floor_2', rot, false); L.push(p); p = EC.add(p, [-1, 8, -1], 'third_roof', rot, true); L.push(p); EC.recurse('tower', depth + 1, p, null, L, r, st); }
    return true; },
  fat(depth, parent, pos, L, r, st) {
    const rot = parent.rot; let p = EC.add(parent, [-3, 4, -3], 'fat_tower_base', rot, true); L.push(p); p = EC.add(p, [0, 4, 0], 'fat_tower_middle', rot, true); L.push(p);
    for (let i = 0; i < 2 && (r() * 3 | 0) !== 0; i++) { p = EC.add(p, [0, 8, 0], 'fat_tower_middle', rot, true); L.push(p);
      for (const [ro, off] of EC.FAT_BRIDGES) if (r() < 0.5) { const b = EC.add(p, off, 'bridge_end', (rot + ro) % 4, true); L.push(b); EC.recurse('bridge', depth + 1, b, null, L, r, st); } }
    L.push(EC.add(p, [-2, 8, -2], 'fat_tower_top', rot, true)); return true; },
  layout(world, st) {
    const g = world.gen; const r = mulberry32((st.seed ^ 0xec17) >>> 0); const rot = r() * 4 | 0; const x = st.cx * 16 + 7, z = st.cz * 16 + 7;
    // Minecraft: the lowest of the 4 corners of a 5x5 square (turned with the city), at least y 60 there; this game's End
    // islands sit lower (~y 55), so any solid island counts
    const [ox, oz] = MCST.xf(5, 5, rot, 0, 0); let y = 1e9; for (const [a, b] of [[0, 0], [ox, 0], [0, oz], [ox, oz]]) y = Math.min(y, g.column(x + a, z + b).h || 0); if (y < 30) return null;
    const pieces = []; const s = { ship: false }; let p = EC.piece('base_floor', x, y, z, rot, true); pieces.push(p);
    p = EC.add(p, [-1, 0, -1], 'second_floor_1', rot, false); pieces.push(p); p = EC.add(p, [-1, 4, -1], 'third_floor_1', rot, false); pieces.push(p); p = EC.add(p, [-1, 8, -1], 'third_roof', rot, true); pieces.push(p);
    EC.recurse('tower', 1, p, null, pieces, r, s);
    const L = { pieces: pieces.map(q => ({ t: { loc: 'end_city/' + q.name, proj: 'rigid', legacy: !q.ow }, rot: q.rot, x: q.x, y: q.y, z: q.z, box: q.box })), adapt: 'none', seed: st.seed,
      marker: (k, a, b, c, S, ch) => { if (k.startsWith('Chest')) { mcSetChest(world, a, b - 1, c, 'chests/end_city_treasure'); }
        else if (k === 'Sentry') { if (S) S.mobs.push(['shulker', a + 0.5, b, c + 0.5]); }
        else if (k === 'Elytra') { const j = (b * 16 + (c - ch.cz * 16)) * 16 + (a - ch.cx * 16); ch.d[j] = B.CHEST; world.chestLoot.set(a + ',' + b + ',' + c, 'end_ship'); } } };
    L.all = { x0: Math.min(...L.pieces.map(q => q.box.x0)), x1: Math.max(...L.pieces.map(q => q.box.x1)), z0: Math.min(...L.pieces.map(q => q.box.z0)), z1: Math.max(...L.pieces.map(q => q.box.z1)) };
    return L; },
};
// ================= WOODLAND MANSIONS (real pieces; the floor plan is generated here) =================
// Minecraft's mansion code (WoodlandMansionPieces) is Java, not data, so the plan is this game's own: an 8 x 7 grid
// of 8-block cells on two floors, corridors from the grand entrance hall, rooms (1x1, 1x2, 2x2 from the right
// floor's sets; secret rooms where no corridor reaches) turned so their open side faces their door, indoor walls and
// doors between them, outer walls with windows, a flat roof, cobblestone foundation. Vindicators, evokers, allays
// and chests come from the room templates' own markers.
const WM = {
  W: 8, D: 7,
  tplOpen(name) { WM._o = WM._o || {}; if (WM._o[name]) return WM._o[name]; const t = MCST.H.t['woodland_mansion/' + name]; const [sx, sy, sz] = t.s; const V = MCST.V, P = MCST.H.pal;
    const air = (x, y, z) => { const v = V[t.o + (y * sz + z) * sx + x]; return v !== 0xFFFF && P[v][0] === 0; };
    // openness of each side, per 8-block segment: e/w along z, s/n along x
    const seg = (n) => Math.max(1, Math.round((n + 1) / 8)); const o = { e: new Array(seg(sz)).fill(0), w: new Array(seg(sz)).fill(0), s: new Array(seg(sx)).fill(0), n: new Array(seg(sx)).fill(0) };
    for (let y = 1; y <= 3; y++) { for (let z = 0; z < sz; z++) { if (air(sx - 1, y, z)) o.e[z >> 3]++; if (air(0, y, z)) o.w[z >> 3]++; } for (let x = 0; x < sx; x++) { if (air(x, y, sz - 1)) o.s[x >> 3]++; if (air(x, y, 0)) o.n[x >> 3]++; } }
    return (WM._o[name] = o); },
  // pick the turn of a room template so its open side faces dir (n/e/s/w) at segment k of that side
  turn(name, wCells, dCells, dir, k) { const t = MCST.H.t['woodland_mansion/' + name].s; const o = WM.tplOpen(name); let best = 0, bs = -1;
    for (let r = 0; r < 4; r++) { const w = r & 1 ? t[2] : t[0], d = r & 1 ? t[0] : t[2]; if (Math.round((w + 1) / 8) !== wCells || Math.round((d + 1) / 8) !== dCells) continue;
      // local side that ends up facing dir after r clockwise turns
      const order = ['n', 'e', 's', 'w']; const ls = order[(order.indexOf(dir) - r + 4) % 4]; const arr = o[ls]; const n = arr.length;
      // segment index flips when the turn reverses that axis
      const flip = (dir === 'n' || dir === 's') ? (r === 1 || r === 2) : (r === 2 || r === 3); const kk = Math.min(n - 1, flip ? n - 1 - k : k);
      const sc = arr[kk] * 10 + arr.reduce((a, b) => a + b, 0); if (sc > bs) { bs = sc; best = r; } }
    return best; },
  plan(r) {
    const W = WM.W, D = WM.D; const ez = (D >> 1) - 1; const floors = [];
    for (let f = 0; f < 2; f++) {
      const g = []; for (let x = 0; x < W; x++) { g.push([]); for (let z = 0; z < D; z++) g[x].push(null); }
      for (const [x, z] of [[W - 2, ez], [W - 1, ez], [W - 2, ez + 1], [W - 1, ez + 1]]) g[x][z] = 'E';
      for (let x = 1; x < W; x++) g[x][ez - 1] = 'C'; for (let z = 1; z < D - 1; z++) g[1][z] = 'C'; for (let x = 1; x < W - 2; x++) g[x][ez + 2] = 'C';
      // a random corridor branch or two
      for (let b = 0; b < 2; b++) { const x = 2 + (r() * (W - 4) | 0); for (let z = 1; z < D - 1; z++) if (!g[x][z]) g[x][z] = r() < 0.7 ? 'C' : null; }
      const rooms = []; const cells = []; for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) if (!g[x][z]) cells.push([x, z]);
      cells.sort(() => r() - 0.5);
      const free = (x, z) => x >= 0 && z >= 0 && x < W && z < D && g[x][z] === null;
      for (const [x, z] of cells) { if (!free(x, z)) continue; let w = 1, d = 1; const q = r();
        if (q < 0.35 && free(x + 1, z) && free(x, z + 1) && free(x + 1, z + 1)) { w = 2; d = 2; } else if (q < 0.7 && free(x + 1, z)) w = 2; else if (q < 0.85 && free(x, z + 1)) d = 2;
        const R = { x, z, w, d, id: rooms.length }; for (let a = 0; a < w; a++) for (let b = 0; b < d; b++) g[x + a][z + b] = R; rooms.push(R); }
      // doors: a room cell next to a corridor
      for (const R of rooms) { const opts = []; for (let a = 0; a < R.w; a++) for (let b = 0; b < R.d; b++) for (const [dx, dz, dir] of [[0, -1, 'n'], [1, 0, 'e'], [0, 1, 's'], [-1, 0, 'w']]) {
          const nx = R.x + a + dx, nz = R.z + b + dz; if (nx >= 0 && nz >= 0 && nx < W && nz < D && g[nx][nz] === 'C') opts.push({ cx: R.x + a, cz: R.z + b, dir, k: dir === 'n' || dir === 's' ? a : b }); }
        R.door = opts.length ? opts[r() * opts.length | 0] : null; }
      floors.push({ g, rooms });
    }
    return { floors, ez };
  },
  layout(world, st) {
    const g = world.gen; const r = mulberry32((st.seed ^ 0x3a7b) >>> 0); const R = r() * 4 | 0; const W = WM.W, D = WM.D;
    const ox = st.cx * 16 + 8, oz = st.cz * 16 + 8; // local (0,0) = centre of the start chunk, grid centred on it
    const L0x = -((W * 8) >> 1), L0z = -((D * 8) >> 1); const plan = WM.plan(r); const ez = plan.ez;
    const toW = (lx, lz) => { const [a, b] = MCST.xf(lx, lz, R, 0, 0); return [ox + a, oz + b]; };
    let ys = []; for (const [a, b] of [[L0x, L0z], [L0x + W * 8, L0z], [L0x, L0z + D * 8], [L0x + W * 8, L0z + D * 8], [0, 0]]) { const [x, z] = toW(a, b); ys.push(g.column(x, z).h); } ys.sort((a, b) => a - b); const y0 = ys[2];
    const pieces = []; const P = (name, lx, ly, lz, lrot) => { const full = 'woodland_mansion/' + name; if (!MCST.H.t[full]) return; const rot = (lrot + R) % 4; const s = MCST.H.t[full].s; const w = lrot & 1 ? s[2] : s[0], d = lrot & 1 ? s[0] : s[2];
        let mx = 1e9, mz = 1e9; for (const [a, b] of [[lx, lz], [lx + w - 1, lz], [lx, lz + d - 1], [lx + w - 1, lz + d - 1]]) { const [x, z] = toW(a, b); mx = Math.min(mx, x); mz = Math.min(mz, z); }
        const b0 = MCST.box(full, 0, 0, 0, rot, 0, 0); const x = mx - b0.x0, z = mz - b0.z0; pieces.push({ t: { loc: full, proj: 'rigid', legacy: false }, rot, x, y: y0 + ly, z, box: MCST.box(full, x, y0 + ly, z, rot, 0, 0) }); };
    const cx = (gx) => L0x + gx * 8 + 1, cz = (gz) => L0z + gz * 8 + 1; // cell interior min corner (local)
    const house = (f, x, z) => x >= 0 && z >= 0 && x < W && z < D && plan.floors[f].g[x][z] != null;
    const FY = [0, 8];
    for (let f = 0; f < 2; f++) { const F = plan.floors[f]; const yb = FY[f];
      // corridors
      for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) if (F.g[x][z] === 'C') P('corridor_floor', cx(x), yb, cz(z), 0);
      // rooms
      const S1 = f ? ['1x1_b', 5] : ['1x1_a', 5], S1s = ['1x1_as', 4], S2side = f ? ['1x2_c', 4] : ['1x2_a', 9], S2front = f ? ['1x2_d', 5] : ['1x2_b', 5], S2s = f ? ['1x2_se', 1] : ['1x2_s', 2], S4 = f ? ['2x2_b', 5] : ['2x2_a', 4];
      const pick = (s) => s[0] + (1 + (r() * s[1] | 0));
      for (const Rm of F.rooms) { const dr = Rm.door; let name;
        if (Rm.w === 2 && Rm.d === 2) name = dr ? pick(S4) : '2x2_s1'; else if (Rm.w * Rm.d === 2) name = dr ? pick(r() < 0.5 ? S2side : S2front) : pick(S2s); else name = dr ? pick(S1) : pick(S1s);
        const rot = dr ? WM.turn(name, Rm.w, Rm.d, dr.dir, dr.k) : (r() * 4 | 0) & (Rm.w === Rm.d ? 3 : 2); P(name, cx(Rm.x), yb, cz(Rm.z), rot);
        Rm.name = name; }
      // indoor walls / doors on every boundary between different spaces inside the house
      const wallN = f ? 'indoors_wall_2' : 'indoors_wall_1', doorN = f ? 'indoors_door_2' : 'indoors_door_1';
      const same = (a, b) => a === b || (a === 'C' && b === 'C') || (a === 'E' && b === 'E');
      for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) { const a = F.g[x][z]; if (a == null) continue;
        // east boundary (x | x+1) and south boundary (z | z+1)
        if (x + 1 < W && F.g[x + 1][z] != null) { const b = F.g[x + 1][z]; if (!same(a, b) && !(a === 'E' || b === 'E')) { const door = [a, b].some(q => q && q.door && ((q === a && q.door.cx === x && q.door.cz === z && q.door.dir === 'e') || (q === b && q.door.cx === x + 1 && q.door.cz === z && q.door.dir === 'w'))); P(door ? doorN : wallN, cx(x) + 7, yb, cz(z), 0); } }
        if (z + 1 < D && F.g[x][z + 1] != null) { const b = F.g[x][z + 1]; if (!same(a, b) && !(a === 'E' || b === 'E')) { const door = [a, b].some(q => q && q.door && ((q === a && q.door.cx === x && q.door.cz === z && q.door.dir === 's') || (q === b && q.door.cx === x && q.door.cz === z + 1 && q.door.dir === 'n'))); P(door ? doorN : wallN, cx(x), yb, cz(z) + 7, 1); } } }
      // outer walls (2 thick: wall + trim outside); floor 1 gets windows and a short wall on top
      for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) { if (!house(f, x, z)) continue; const ent = F.g[x][z] === 'E';
        const wn = f ? 'wall_window' : 'wall_flat';
        const put = (lx, lz, rot) => { P(wn, lx, yb, lz, rot); if (f) P('small_wall', lx, yb + 8, lz, rot); };
        if (!house(f, x + 1, z) && !ent) put(cx(x) + 7, cz(z), 0);
        if (!house(f, x - 1, z)) put(cx(x) - 2, cz(z) - 1, 2);
        if (!house(f, x, z + 1)) put(cx(x) - 1, cz(z) + 7, 1);
        if (!house(f, x, z - 1)) put(cx(x), cz(z) - 2, 3); }
    }
    // the grand entrance (both floors, opens east) and a flat roof over everything
    P('entrance', cx(W - 2) - 1, 0, cz(ez), 0);
    for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) if (house(1, x, z)) P('roof', cx(x) - 1, 19, cz(z) - 1, 0);
    const bx = { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 }; for (const p of pieces) { bx.x0 = Math.min(bx.x0, p.box.x0); bx.x1 = Math.max(bx.x1, p.box.x1); bx.z0 = Math.min(bx.z0, p.box.z0); bx.z1 = Math.max(bx.z1, p.box.z1); }
    const MOB = { Warrior: 'vindicator', Mage: 'evoker', 'Group of Allays': 'allay' };
    return { pieces, all: bx, y0, adapt: 'none', seed: st.seed, site: { x0: bx.x0 - 2, x1: bx.x1 + 2, z0: bx.z0 - 2, z1: bx.z1 + 2 },
      marker: (k, a, b, c, S, ch) => { if (k.startsWith('Chest')) { const j = (b * 16 + (c - ch.cz * 16)) * 16 + (a - ch.cx * 16); ch.d[j] = B.CHEST; mcSetChest(world, a, b, c, 'chests/woodland_mansion'); }
        else if (MOB[k] && S && typeof MOBS !== 'undefined' && MOBS[MOB[k]]) S.mobs.push([MOB[k], a + 0.5, b, c + 0.5]); } };
  },
};
// clear the mansion site and lay the cobblestone foundation before the pieces go down
function mcSitePrep(world, c, L) { if (!L.site) return; const g = world.gen; const bx = c.cx * 16, bz = c.cz * 16; const d = c.d;
  for (let x = Math.max(L.site.x0, bx); x <= Math.min(L.site.x1, bx + 15); x++) for (let z = Math.max(L.site.z0, bz); z <= Math.min(L.site.z1, bz + 15); z++) {
    const inner = x > L.site.x0 + 1 && x < L.site.x1 - 1 && z > L.site.z0 + 1 && z < L.site.z1 - 1; const h = g.column(x, z).h;
    for (let y = L.y0; y < Math.min(WH, Math.max(h, L.y0) + 30); y++) d[(y * 16 + (z - bz)) * 16 + (x - bx)] = 0;
    for (let y = Math.max(1, Math.min(h, L.y0) - 2); y < L.y0; y++) d[(y * 16 + (z - bz)) * 16 + (x - bx)] = inner ? B.COBBLESTONE : (y === L.y0 - 1 ? B.GRASS : B.DIRT); } }
function mcBigChunk(world, c, kind) {
  if (!MCST_ON()) return false; const S = world.hintsDone.has(c.key) ? null : structuresFor(world, c.cx, c.cz); let any = false;
  const reach = kind === 'end_city' ? 9 : 5; const sp = PLACE[kind].spacing;
  for (let rx = Math.floor((c.cx - reach) / sp); rx <= Math.floor((c.cx + reach) / sp); rx++) for (let rz = Math.floor((c.cz - reach) / sp); rz <= Math.floor((c.cz + reach) / sp); rz++) {
    const st = regionStart(world, kind, rx, rz); if (!st || Math.max(Math.abs(st.cx - c.cx), Math.abs(st.cz - c.cz)) > reach) continue;
    if (kind === 'end_city' && Math.hypot(st.cx * 16, st.cz * 16) < 900) continue;
    world.mcjCache = world.mcjCache || new Map(); const key = kind + ':' + st.cx + ',' + st.cz; let L = world.mcjCache.get(key);
    if (L === undefined) { L = kind === 'end_city' ? EC.layout(world, st) : WM.layout(world, st); world.mcjCache.set(key, L); }
    if (!L || L.all.x1 < c.cx * 16 || L.all.x0 > c.cx * 16 + 15 || L.all.z1 < c.cz * 16 || L.all.z0 > c.cz * 16 + 15) continue;
    mcSitePrep(world, c, L); MCJ.stamp(world, c, L, S); any = true; }
  return any; }
// the mansion goes down after trees and other structures (worldgenCleanup) so nothing grows inside it
{ const _m = buildMansionChunk; buildMansionChunk = function (world, c) { if (!MCST_ON()) return _m.apply(this, arguments); }; }
{ const _wc = worldgenCleanup; worldgenCleanup = function (world, c) { const r = _wc.apply(this, arguments); try { mcBigChunk(world, c, 'woodland_mansion'); } catch (e) { console.error('mansion', e); } return r; }; }
{ const _e = genEndChunk; genEndChunk = function (world, c) { const r = _e.apply(this, arguments); try { mcBigChunk(world, c, 'end_city'); } catch (e) { console.error('end city', e); } return r; }; }

// ================= CODE-BUILT STRUCTURES (recreated from Minecraft's piece code) =================
// Minecraft writes these block by block in Java (no templates). SP is its ScatteredFeaturePiece: a box with a random
// facing; local x/z map to world like StructurePiece.getWorldX/Z, and local stair/hook facings turn with it.
function SP(set, x0, y0, z0, W, D, ori) {
  const ns = ori === 'north' || ori === 'south'; const maxX = x0 + (ns ? W : D) - 1, maxZ = z0 + (ns ? D : W) - 1;
  const wx = (x, z) => ori === 'west' ? maxX - z : ori === 'east' ? x0 + z : x0 + x, wz = (x, z) => ori === 'north' ? maxZ - z : ori === 'south' ? z0 + z : z0 + x;
  const DV = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] }; const F4 = { north: 0, east: 1, south: 2, west: 3 }, F6 = { up: 0, down: 1, north: 2, south: 3, west: 4, east: 5 };
  const turn = (dir) => { if (!DV[dir]) return dir; const [dx, dz] = DV[dir]; const ax = wx(dx, dz) - wx(0, 0), az = wz(dx, dz) - wz(0, 0); for (const k in DV) if (DV[k][0] === ax && DV[k][1] === az) return k; return dir; };
  const api = {
    put(x, y, z, id) { if (id != null && id >= 0) set(wx(x, z), y0 + y, wz(x, z), id); },
    box(x1, y1, z1, x2, y2, z2, edge, inner) { for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) for (let z = z1; z <= z2; z++) { const e = x === x1 || x === x2 || y === y1 || y === y2 || z === z1 || z === z2; const id = typeof edge === 'function' ? edge() : (e ? edge : inner); if (id != null) api.put(x, y, z, id); } },
    air(x1, y1, z1, x2, y2, z2) { api.box(x1, y1, z1, x2, y2, z2, 0, 0); },
    // a family block whose facing is given in local terms
    fam(f, st, six) { const s = Object.assign({}, st); if (s.facing) s.facing = (six ? F6 : F4)[turn(s.facing)]; const F = typeof FAMILY !== 'undefined' && FAMILY[f]; if (F) return famId(f, s); return B[f.toUpperCase()]; },
    colDown(x, y, z, id, g) { const X = wx(x, z), Z = wz(x, z); const h = Math.max(g.column(X, Z).h, 1); for (let yy = y0 + y; yy >= h - 1 && yy > 1; yy--) set(X, yy, Z, id); },
    wx, wz, turn,
  };
  return api;
}
const SP_ORI = ['north', 'east', 'south', 'west'];
// lowest / average ground over a box (Minecraft's updateHeightPositionToLowestGroundHeight / updateAverageGroundHeight)
function spGround(g, x0, z0, w, d, avg) { let mn = 1e9, s = 0, n = 0; for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) { const h = Math.max(g.column(x, z).h, SEA); mn = Math.min(mn, h); s += h; n++; } return avg ? Math.round(s / n) : mn; }
// ---- desert pyramid (DesertPyramidPiece) ----
function mcDesertPyramid(world, S, g, bx, bz, hard, r) {
  const ori = SP_ORI[r() * 4 | 0], W = 21, D = 21; const y0 = spGround(g, bx, bz, W, D, false) - (r() * 3 | 0); const P = SP(hard, bx, y0, bz, W, D, ori);
  const SS = B.SANDSTONE, CUT = B.CUT_SANDSTONE, CH = B.CHISELED_SANDSTONE, OR = B.ORANGE_TERRACOTTA, BL2 = B.BLUE_TERRACOTTA;
  const st = (f) => P.fam('sandstone_stairs', { facing: f, half: 'bottom', wl: 0 }); const n = st('north'), s = st('south'), e = st('east'), w = st('west');
  P.box(0, -4, 0, W - 1, 0, D - 1, SS, SS);
  for (let i = 1; i <= 9; i++) { P.box(i, i, i, W - 1 - i, i, D - 1 - i, SS, SS); P.box(i + 1, i, i + 1, W - 2 - i, i, D - 2 - i, 0, 0); }
  for (let j = 0; j < W; j++) for (let k = 0; k < D; k++) P.colDown(j, -5, k, SS, g);
  P.box(0, 0, 0, 4, 9, 4, SS, 0); P.box(1, 10, 1, 3, 10, 3, SS, SS); P.put(2, 10, 0, n); P.put(2, 10, 4, s); P.put(0, 10, 2, e); P.put(4, 10, 2, w);
  P.box(W - 5, 0, 0, W - 1, 9, 4, SS, 0); P.box(W - 4, 10, 1, W - 2, 10, 3, SS, SS); P.put(W - 3, 10, 0, n); P.put(W - 3, 10, 4, s); P.put(W - 5, 10, 2, e); P.put(W - 1, 10, 2, w);
  P.box(8, 0, 0, 12, 4, 4, SS, 0); P.box(9, 1, 0, 11, 3, 4, 0, 0);
  for (const [x, y] of [[9, 1], [9, 2], [9, 3], [10, 3], [11, 3], [11, 2], [11, 1]]) P.put(x, y, 1, CUT);
  P.box(4, 1, 1, 8, 3, 3, SS, 0); P.box(4, 1, 2, 8, 2, 2, 0, 0); P.box(12, 1, 1, 16, 3, 3, SS, 0); P.box(12, 1, 2, 16, 2, 2, 0, 0);
  P.box(5, 4, 5, W - 6, 4, D - 6, SS, SS); P.box(9, 4, 9, 11, 4, 11, 0, 0);
  for (const [x, z] of [[8, 8], [12, 8], [8, 12], [12, 12]]) P.box(x, 1, z, x, 3, z, CUT, CUT);
  P.box(1, 1, 5, 4, 4, 11, SS, SS); P.box(W - 5, 1, 5, W - 2, 4, 11, SS, SS); P.box(6, 7, 9, 6, 7, 11, SS, SS); P.box(W - 7, 7, 9, W - 7, 7, 11, SS, SS);
  P.box(5, 5, 9, 5, 7, 11, CUT, CUT); P.box(W - 6, 5, 9, W - 6, 7, 11, CUT, CUT);
  for (const [x, y] of [[5, 5], [5, 6], [6, 6], [W - 6, 5], [W - 6, 6], [W - 7, 6]]) P.put(x, y, 10, 0);
  P.box(2, 4, 4, 2, 6, 4, 0, 0); P.box(W - 3, 4, 4, W - 3, 6, 4, 0, 0); P.put(2, 4, 5, n); P.put(2, 3, 4, n); P.put(W - 3, 4, 5, n); P.put(W - 3, 3, 4, n);
  P.box(1, 1, 3, 2, 2, 3, SS, SS); P.box(W - 3, 1, 3, W - 2, 2, 3, SS, SS); P.put(1, 1, 2, SS); P.put(W - 2, 1, 2, SS);
  const slab = P.fam('sandstone_slab', { type: 'bottom', wl: 0 }); P.put(1, 2, 2, slab); P.put(W - 2, 2, 2, slab); P.put(2, 1, 2, w); P.put(W - 3, 1, 2, e);
  P.box(4, 3, 5, 4, 3, 17, SS, SS); P.box(W - 5, 3, 5, W - 5, 3, 17, SS, SS); P.box(3, 1, 5, 4, 2, 16, 0, 0); P.box(W - 6, 1, 5, W - 5, 2, 16, 0, 0);
  for (let l = 5; l <= 17; l += 2) { P.put(4, 1, l, CUT); P.put(4, 2, l, CH); P.put(W - 5, 1, l, CUT); P.put(W - 5, 2, l, CH); }
  for (const [x, z] of [[10, 7], [10, 8], [9, 9], [11, 9], [8, 10], [12, 10], [7, 10], [13, 10], [9, 11], [11, 11], [10, 12], [10, 13]]) P.put(x, 0, z, OR); P.put(10, 0, 10, BL2);
  const pat = [[CUT, OR, CUT], [CUT, OR, CUT], [OR, CH, OR], [CUT, OR, CUT], [OR, CH, OR], [OR, OR, OR], [CUT, CUT, CUT]];
  for (const j1 of [0, W - 1]) for (let i = 0; i < 7; i++) for (let k = 0; k < 3; k++) P.put(j1, 2 + i, 1 + k, pat[i][k]);
  for (const k1 of [2, W - 3]) for (let i = 0; i < 7; i++) for (let k = 0; k < 3; k++) P.put(k1 - 1 + k, 2 + i, 0, pat[i][k]);
  P.box(8, 4, 0, 12, 6, 0, CUT, CUT); P.put(8, 6, 0, 0); P.put(12, 6, 0, 0); P.put(9, 5, 0, OR); P.put(10, 5, 0, CH); P.put(11, 5, 0, OR);
  // the treasure room under the floor: TNT trap, pressure plate, four chests
  P.box(8, -14, 8, 12, -11, 12, CUT, CUT); P.box(8, -10, 8, 12, -10, 12, CH, CH); P.box(8, -9, 8, 12, -9, 12, CUT, CUT); P.box(8, -8, 8, 12, -1, 12, SS, SS);
  P.box(9, -11, 9, 11, -1, 11, 0, 0); P.put(10, -11, 10, B.STONE_PRESSURE_PLATE); P.box(9, -13, 9, 11, -13, 11, B.TNT, 0);
  for (const [x, z, ox, oz] of [[8, 10, 7, 10], [12, 10, 13, 10], [10, 8, 10, 7], [10, 12, 10, 13]]) { P.put(x, -11, z, 0); P.put(x, -10, z, 0); P.put(ox, -10, oz, CH); P.put(ox, -11, oz, CUT); }
  for (const [dx, dz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) { const x = 10 + dx * 2, z = 10 + dz * 2; P.put(x, -11, z, B.CHEST); mcSetChest(world, P.wx(x, z), y0 - 11, P.wz(x, z), 'chests/desert_pyramid'); }
}
// ---- jungle temple (JungleTemplePiece): mossy cobblestone, two arrow traps, a lever puzzle and two chests ----
function mcJungleTemple(world, S, g, bx, bz, hard, r) {
  const ori = SP_ORI[r() * 4 | 0], W = 12, D = 15; const y0 = spGround(g, bx, bz, W, D, true); const P = SP(hard, bx, y0, bz, W, D, ori);
  const sel = () => r() < 0.4 ? B.COBBLESTONE : B.MOSSY_COBBLESTONE; const bx2 = (a, b, c, d, e, f) => P.box(a, b, c, d, e, f, sel); const air = P.air;
  bx2(0, -4, 0, W - 1, 0, D - 1); bx2(2, 1, 2, 9, 2, 2); bx2(2, 1, 12, 9, 2, 12); bx2(2, 1, 3, 2, 2, 11); bx2(9, 1, 3, 9, 2, 11); bx2(1, 3, 1, 10, 6, 1); bx2(1, 3, 13, 10, 6, 13); bx2(1, 3, 2, 1, 6, 12); bx2(10, 3, 2, 10, 6, 12);
  bx2(2, 3, 2, 9, 3, 12); bx2(2, 6, 2, 9, 6, 12); bx2(3, 7, 3, 8, 7, 11); bx2(4, 8, 4, 7, 8, 10);
  air(3, 1, 3, 8, 2, 11); air(4, 3, 6, 7, 3, 9); air(2, 4, 2, 9, 5, 12); air(4, 6, 5, 7, 6, 9); air(5, 7, 6, 6, 7, 8); air(5, 1, 2, 6, 2, 2); air(5, 2, 12, 6, 2, 12); air(5, 5, 1, 6, 5, 1); air(5, 5, 13, 6, 5, 13);
  for (const [x, z] of [[1, 5], [10, 5], [1, 9], [10, 9]]) P.put(x, 5, z, 0);
  for (const i of [0, 14]) for (const x of [2, 4, 7, 9]) bx2(x, 4, i, x, 5, i); bx2(5, 6, 0, 6, 6, 0);
  for (const l of [0, 11]) { for (let j = 2; j <= 12; j += 2) bx2(l, 4, j, l, 5, j); bx2(l, 6, 5, l, 6, 5); bx2(l, 6, 9, l, 6, 9); }
  for (const [x, z] of [[2, 2], [9, 2], [2, 12], [9, 12]]) bx2(x, 7, z, x, 9, z); for (const [x, z] of [[4, 4], [7, 4], [4, 10], [7, 10]]) bx2(x, 9, z, x, 9, z); bx2(5, 9, 7, 6, 9, 7);
  const cs = (f) => P.fam('cobblestone_stairs', { facing: f, half: 'bottom', wl: 0 }); const e = cs('east'), w = cs('west'), s = cs('south'), n = cs('north');
  P.put(5, 9, 6, n); P.put(6, 9, 6, n); P.put(5, 9, 8, s); P.put(6, 9, 8, s); for (const x of [4, 5, 6, 7]) P.put(x, 0, 0, n);
  for (const x of [4, 7]) { P.put(x, 1, 8, n); P.put(x, 2, 9, n); P.put(x, 3, 10, n); }
  bx2(4, 1, 9, 4, 1, 9); bx2(7, 1, 9, 7, 1, 9); bx2(4, 1, 10, 7, 2, 10); bx2(5, 4, 5, 6, 4, 5); P.put(4, 4, 5, e); P.put(7, 4, 5, w);
  for (let k = 0; k < 4; k++) { P.put(5, -k, 6 + k, s); P.put(6, -k, 6 + k, s); air(5, -k, 7 + k, 6, -k, 9 + k); }
  air(1, -3, 12, 10, -1, 13); air(1, -3, 1, 3, -1, 13); air(1, -3, 1, 9, -1, 5);
  for (let i = 1; i <= 13; i += 2) bx2(1, -3, i, 1, -2, i); for (let j = 2; j <= 12; j += 2) bx2(1, -1, j, 3, -1, j);
  bx2(2, -2, 1, 5, -2, 1); bx2(7, -2, 1, 9, -2, 1); bx2(6, -3, 1, 6, -3, 1); bx2(6, -1, 1, 6, -1, 1);
  const hook = (f) => P.fam('tripwire_hook', { facing: f, attached: 1, powered: 0 }); const wire = B.REDSTONE_WIRE, tw = B.TRIPWIRE, MC2 = B.MOSSY_COBBLESTONE;
  // trap 1: tripwire across the corridor, wire to a dispenser in the wall
  P.put(1, -3, 8, hook('east')); P.put(4, -3, 8, hook('west')); P.put(2, -3, 8, tw); P.put(3, -3, 8, tw);
  for (let z = 7; z >= 1; z--) P.put(5, -3, z, wire); P.put(4, -3, 1, wire); P.put(3, -3, 1, MC2);
  P.put(3, -2, 1, P.fam('dispenser', { facing: 'north', ex: 0 }, true)); P.put(3, -2, 2, B.VINE);
  // trap 2
  P.put(7, -3, 1, hook('north')); P.put(7, -3, 5, hook('south')); for (const z of [2, 3, 4]) P.put(7, -3, z, tw);
  P.put(8, -3, 6, wire); P.put(9, -3, 6, wire); P.put(9, -3, 5, wire); P.put(9, -3, 4, MC2); P.put(9, -2, 4, wire);
  P.put(9, -2, 3, P.fam('dispenser', { facing: 'west', ex: 0 }, true)); P.put(8, -1, 3, B.VINE); P.put(8, -2, 3, B.VINE);
  P.put(8, -3, 3, B.CHEST); mcSetChest(world, P.wx(8, 3), y0 - 3, P.wz(8, 3), 'chests/jungle_temple');
  for (const [x, y, z] of [[9, -3, 2], [8, -3, 1], [4, -3, 5], [5, -2, 5], [5, -1, 5], [6, -3, 5], [7, -2, 5], [7, -1, 5], [8, -3, 5]]) P.put(x, y, z, MC2);
  bx2(9, -1, 1, 9, -1, 5);
  // the lever puzzle and the hidden chest
  air(8, -3, 8, 10, -1, 10); for (const x of [8, 9, 10]) { P.put(x, -2, 11, B.CHISELED_STONE_BRICKS); P.put(x, -2, 12, B.LEVER); }
  bx2(8, -3, 8, 8, -3, 10); bx2(10, -3, 8, 10, -3, 10); P.put(10, -2, 9, MC2); P.put(8, -2, 9, wire); P.put(8, -2, 10, wire); P.put(10, -1, 9, wire);
  P.put(9, -2, 8, P.fam('sticky_piston', { facing: 'up', ex: 0 }, true)); P.put(10, -2, 8, P.fam('sticky_piston', { facing: 'west', ex: 0 }, true)); P.put(10, -1, 8, P.fam('sticky_piston', { facing: 'west', ex: 0 }, true));
  P.put(10, -2, 10, P.fam('repeater', { facing: 'north', delay: 1, powered: 0, locked: 0 }));
  P.put(9, -3, 10, B.CHEST); mcSetChest(world, P.wx(9, 10), y0 - 3, P.wz(9, 10), 'chests/jungle_temple');
  S.kinds.push(['jungle_temple', P.wx(6, 7), P.wz(6, 7)]);
}
// ---- swamp hut (SwampHutPiece): spruce hut on oak log stilts, a witch and a black cat ----
function mcSwampHut(world, S, g, bx, bz, hard, r) {
  const ori = SP_ORI[r() * 4 | 0], W = 7, D = 9; const y0 = spGround(g, bx, bz, W, D, true); const P = SP(hard, bx, y0, bz, W, D, ori);
  const PL = B.SPRUCE_PLANKS, LOG = B.LOG, FN = B.OAK_FENCE;
  P.box(1, 1, 1, 5, 1, 7, PL, PL); P.box(1, 4, 2, 5, 4, 7, PL, PL); P.box(2, 1, 0, 4, 1, 0, PL, PL); P.box(2, 2, 2, 3, 3, 2, PL, PL); P.box(1, 2, 3, 1, 3, 6, PL, PL); P.box(5, 2, 3, 5, 3, 6, PL, PL); P.box(2, 2, 7, 4, 3, 7, PL, PL);
  for (const [x, z] of [[1, 2], [5, 2], [1, 7], [5, 7]]) P.box(x, 0, z, x, 3, z, LOG, LOG);
  P.put(2, 3, 2, FN); P.put(3, 3, 7, FN); P.put(1, 3, 4, 0); P.put(5, 3, 4, 0); P.put(5, 3, 5, 0); P.put(1, 3, 5, B.POTTED_RED_MUSHROOM); P.put(3, 2, 6, B.CRAFTING_TABLE); P.put(4, 2, 6, B.CAULDRON); P.put(1, 2, 1, FN); P.put(5, 2, 1, FN);
  const ss = (f) => P.fam('spruce_stairs', { facing: f, half: 'bottom', wl: 0 });
  P.box(0, 4, 1, 6, 4, 1, ss('north'), ss('north')); P.box(0, 4, 2, 0, 4, 7, ss('east'), ss('east')); P.box(6, 4, 2, 6, 4, 7, ss('west'), ss('west')); P.box(0, 4, 8, 6, 4, 8, ss('south'), ss('south'));
  for (const i of [2, 7]) for (const j of [1, 5]) P.colDown(j, -1, i, LOG, g);
  S.mobs.push(['witch', P.wx(2, 5) + 0.5, y0 + 2, P.wz(2, 5) + 0.5]); S.mobs.push(['cat', P.wx(2, 5) + 0.5, y0 + 2, P.wz(2, 5) + 0.5]); S.kinds.push(['swamp_hut', P.wx(3, 4), P.wz(3, 4)]);
}
// the game's desert pyramid builder becomes Minecraft's
{ const _bp = buildPyramid; buildPyramid = function (S, g, cx, cz, hard, r, world) { return mcDesertPyramid(world || G.world, S, g, cx - 10, cz - 10, hard, r); }; }

// ================= MINESHAFTS (Minecraft's MineshaftPieces, rebuilt in JS) =================
// A dirt-floored room, then corridors (2-4 sections of 5 with fence-and-plank supports, rails 1 in 3, cobweb "spider"
// corridors with a cave spider spawner 1 in 23, chest minecarts), crossings (1 in 4 two storeys tall) and dirt stairs
// branching up to 8 deep and 80 blocks out, then the whole thing moved down under the sea level. Same start rule as
// the game's old mineshafts; the layout is made once per start and stamped chunk by chunk.
const MS = {
  BOXES: { cor: null },
  hit(P, b) { return P.find(p => MCJ.hit(p.box, b)); },
  B(x0, y0, z0, x1, y1, z1, x, y, z) { return { x0: x + Math.min(x0, x1), y0: y + Math.min(y0, y1), z0: z + Math.min(z0, z1), x1: x + Math.max(x0, x1), y1: y + Math.max(y0, y1), z1: z + Math.max(z0, z1) }; },
  gen(P, start, r, x, y, z, dir, depth) {
    if (depth > 8) return null; if (Math.abs(x - start.box.x0) > 80 || Math.abs(z - start.box.z0) > 80) return null;
    const i = r() * 100 | 0; let p = null, b;
    if (i >= 80) { const h = (r() * 4 | 0) === 0 ? 6 : 2; b = MS.B(...{ north: [-1, 0, -4, 3, h, 0], south: [-1, 0, 0, 3, h, 4], west: [-4, 0, -1, 0, h, 3], east: [0, 0, -1, 4, h, 3] }[dir], x, y, z); if (!MS.hit(P, b)) p = { t: 'cross', box: b, dir, two: h > 2 }; }
    else if (i >= 70) { b = MS.B(...{ north: [0, -5, -8, 2, 2, 0], south: [0, -5, 0, 2, 2, 8], west: [-8, -5, 0, 0, 2, 2], east: [0, -5, 0, 8, 2, 2] }[dir], x, y, z); if (!MS.hit(P, b)) p = { t: 'stairs', box: b, dir }; }
    else { for (let n = (r() * 3 | 0) + 2; n > 0; n--) { const j = n * 5; b = MS.B(...{ north: [0, 0, -(j - 1), 2, 2, 0], south: [0, 0, 0, 2, 2, j - 1], west: [-(j - 1), 0, 0, 0, 2, 2], east: [0, 0, 0, j - 1, 2, 2] }[dir], x, y, z); if (!MS.hit(P, b)) break; b = null; }
      if (b) { const rails = (r() * 3 | 0) === 0; p = { t: 'cor', box: b, dir, rails, spider: !rails && (r() * 23 | 0) === 0, n: ((dir === 'north' || dir === 'south') ? b.z1 - b.z0 + 1 : b.x1 - b.x0 + 1) / 5 }; } }
    if (!p) return null; p.depth = depth + 1; P.push(p); MS.children(P, start, r, p); return p;
  },
  children(P, start, r, p) { const b = p.box, d = p.depth, G = (x, y, z, dir, dd = d) => MS.gen(P, start, r, x, y, z, dir, dd);
    if (p.t === 'cor') { const j = r() * 4 | 0, y = () => b.y0 - 1 + (r() * 3 | 0);
      if (p.dir === 'north') { if (j <= 1) G(b.x0, y(), b.z0 - 1, 'north'); else if (j === 2) G(b.x0 - 1, y(), b.z0, 'west'); else G(b.x1 + 1, y(), b.z0, 'east'); }
      else if (p.dir === 'south') { if (j <= 1) G(b.x0, y(), b.z1 + 1, 'south'); else if (j === 2) G(b.x0 - 1, y(), b.z1 - 3, 'west'); else G(b.x1 + 1, y(), b.z1 - 3, 'east'); }
      else if (p.dir === 'west') { if (j <= 1) G(b.x0 - 1, y(), b.z0, 'west'); else if (j === 2) G(b.x0, y(), b.z0 - 1, 'north'); else G(b.x0, y(), b.z1 + 1, 'south'); }
      else { if (j <= 1) G(b.x1 + 1, y(), b.z0, 'east'); else if (j === 2) G(b.x1 - 3, y(), b.z0 - 1, 'north'); else G(b.x1 - 3, y(), b.z1 + 1, 'south'); }
      if (d < 8) { if (p.dir === 'north' || p.dir === 'south') { for (let k = b.z0 + 3; k + 3 <= b.z1; k += 5) { const l = r() * 5 | 0; if (l === 0) G(b.x0 - 1, b.y0, k, 'west', d + 1); else if (l === 1) G(b.x1 + 1, b.y0, k, 'east', d + 1); } }
        else for (let k = b.x0 + 3; k + 3 <= b.x1; k += 5) { const l = r() * 5 | 0; if (l === 0) G(k, b.y0, b.z0 - 1, 'north', d + 1); else if (l === 1) G(k, b.y0, b.z1 + 1, 'south', d + 1); } } }
    else if (p.t === 'cross') { const D = p.dir;
      if (D === 'north') { G(b.x0 + 1, b.y0, b.z0 - 1, 'north'); G(b.x0 - 1, b.y0, b.z0 + 1, 'west'); G(b.x1 + 1, b.y0, b.z0 + 1, 'east'); }
      else if (D === 'south') { G(b.x0 + 1, b.y0, b.z1 + 1, 'south'); G(b.x0 - 1, b.y0, b.z0 + 1, 'west'); G(b.x1 + 1, b.y0, b.z0 + 1, 'east'); }
      else if (D === 'west') { G(b.x0 + 1, b.y0, b.z0 - 1, 'north'); G(b.x0 + 1, b.y0, b.z1 + 1, 'south'); G(b.x0 - 1, b.y0, b.z0 + 1, 'west'); }
      else { G(b.x0 + 1, b.y0, b.z0 - 1, 'north'); G(b.x0 + 1, b.y0, b.z1 + 1, 'south'); G(b.x1 + 1, b.y0, b.z0 + 1, 'east'); }
      if (p.two) { if (r() < 0.5) G(b.x0 + 1, b.y0 + 4, b.z0 - 1, 'north'); if (r() < 0.5) G(b.x0 - 1, b.y0 + 4, b.z0 + 1, 'west'); if (r() < 0.5) G(b.x1 + 1, b.y0 + 4, b.z0 + 1, 'east'); if (r() < 0.5) G(b.x0 + 1, b.y0 + 4, b.z1 + 1, 'south'); } }
    else if (p.t === 'stairs') { const D = p.dir; if (D === 'north') G(b.x0, b.y0, b.z0 - 1, 'north'); else if (D === 'south') G(b.x0, b.y0, b.z1 + 1, 'south'); else if (D === 'west') G(b.x0 - 1, b.y0, b.z0, 'west'); else G(b.x1 + 1, b.y0, b.z0, 'east'); }
    else if (p.t === 'room') { const k = Math.max(1, b.y1 - b.y0 + 1 - 3 - 1); p.ent = [];
      const side = (len, f) => { for (let j = 0; j < len; j += 4) { j += r() * len | 0; if (j + 3 > len) break; const c = f(j); if (c) p.ent.push(c.box); } };
      side(b.x1 - b.x0 + 1, (j) => G(b.x0 + j, b.y0 + (r() * k | 0) + 1, b.z0 - 1, 'north', 0)); side(b.x1 - b.x0 + 1, (j) => G(b.x0 + j, b.y0 + (r() * k | 0) + 1, b.z1 + 1, 'south', 0));
      side(b.z1 - b.z0 + 1, (j) => G(b.x0 - 1, b.y0 + (r() * k | 0) + 1, b.z0 + j, 'west', 0)); side(b.z1 - b.z0 + 1, (j) => G(b.x1 + 1, b.y0 + (r() * k | 0) + 1, b.z0 + j, 'east', 0)); } },
  layout(world, sx, sz) {
    world.mcjCache = world.mcjCache || new Map(); const key = 'ms:' + sx + ',' + sz; if (world.mcjCache.has(key)) return world.mcjCache.get(key);
    const r = mulberry32(ihash(sx, sz, 7777, world.seed) >>> 0); const x = sx * 16 + 2, z = sz * 16 + 2;
    const room = { t: 'room', box: { x0: x, y0: 50, z0: z, x1: x + 7 + (r() * 6 | 0), y1: 54 + (r() * 6 | 0), z1: z + 7 + (r() * 6 | 0) }, depth: 0 }; const P = [room]; MS.children(P, room, r, room);
    // moveBelowSeaLevel(63, -64, random, 10), then into this game's heights (y + YOFF)
    let mn = 1e9, mx = -1e9; for (const p of P) { mn = Math.min(mn, p.box.y0); mx = Math.max(mx, p.box.y1); }
    let j = (mx - mn + 1) - 64 + 1; const i = 63 - 10; if (j < i) j += r() * (i - j) | 0; const k = j - mx + YOFF;
    for (const p of P) { p.box.y0 += k; p.box.y1 += k; if (p.ent) for (const e of p.ent) { e.y0 += k; e.y1 += k; } }
    const all = { x0: Math.min(...P.map(p => p.box.x0)), x1: Math.max(...P.map(p => p.box.x1)), z0: Math.min(...P.map(p => p.box.z0)), z1: Math.max(...P.map(p => p.box.z1)) };
    const L = { pieces: P, all }; if (world.mcjCache.size > 300) world.mcjCache.clear(); world.mcjCache.set(key, L); return L; },
  stamp(world, c, L) {
    const bx = c.cx * 16, bz = c.cz * 16, d = c.d, seed = world.seed; const inC = (x, z) => x >= bx && x < bx + 16 && z >= bz && z < bz + 16;
    const I = (x, y, z) => (y * 16 + (z - bz)) * 16 + (x - bx); const get = (x, y, z) => inC(x, z) && y >= 0 && y < WH ? d[I(x, y, z)] : -1;
    const set = (x, y, z, id) => { if (!inC(x, z) || y < 1 || y >= WH) return; const j = I(x, y, z); if (d[j] === B.BEDROCK) return; d[j] = id; };
    const rnd = (x, y, z, k) => rnd01(x * 3 + k, y, z, seed ^ 0x3a5f);
    const PL = B.PLANKS, FN = B.OAK_FENCE, AIR = 0, WEB = B.COBWEB;
    for (const p of L.pieces) { const b = p.box; if (b.x1 < bx - 1 || b.x0 > bx + 16 || b.z1 < bz - 1 || b.z0 > bz + 16) continue;
      if (p.t === 'room') {
        for (let x = b.x0; x <= b.x1; x++) for (let z = b.z0; z <= b.z1; z++) { if (get(x, b.y0, z) > 0) set(x, b.y0, z, B.DIRT); for (let y = b.y0 + 1; y <= Math.min(b.y0 + 3, b.y1); y++) set(x, y, z, AIR); }
        for (const e of p.ent || []) for (let x = e.x0; x <= e.x1; x++) for (let z = Math.min(e.z0, b.z0); z <= Math.max(e.z1, b.z0); z++) for (let y = e.y1 - 2; y <= e.y1; y++) if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) set(x, y, z, AIR);
        const fx = b.x1 - b.x0 + 1, fy = b.y1 - (b.y0 + 4) + 1, fz = b.z1 - b.z0 + 1, cx = b.x0 + fx / 2, cz = b.z0 + fz / 2;
        for (let y = b.y0 + 4; y <= b.y1; y++) { const f5 = (y - b.y0 - 4) / fy; for (let x = b.x0; x <= b.x1; x++) { const f6 = (x - cx) / (fx * 0.5); for (let z = b.z0; z <= b.z1; z++) { const f7 = (z - cz) / (fz * 0.5); if (f6 * f6 + f5 * f5 + f7 * f7 <= 1.05) set(x, y, z, AIR); } } }
        continue; }
      if (p.t === 'cross') { const air = (x0, y0, z0, x1, y1, z1) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) set(x, y, z, AIR); };
        if (p.two) { air(b.x0 + 1, b.y0, b.z0, b.x1 - 1, b.y0 + 2, b.z1); air(b.x0, b.y0, b.z0 + 1, b.x1, b.y0 + 2, b.z1 - 1); air(b.x0 + 1, b.y1 - 2, b.z0, b.x1 - 1, b.y1, b.z1); air(b.x0, b.y1 - 2, b.z0 + 1, b.x1, b.y1, b.z1 - 1); air(b.x0 + 1, b.y0 + 3, b.z0 + 1, b.x1 - 1, b.y0 + 3, b.z1 - 1); }
        else { air(b.x0 + 1, b.y0, b.z0, b.x1 - 1, b.y1, b.z1); air(b.x0, b.y0, b.z0 + 1, b.x1, b.y1, b.z1 - 1); }
        for (const [x, z] of [[b.x0 + 1, b.z0 + 1], [b.x0 + 1, b.z1 - 1], [b.x1 - 1, b.z0 + 1], [b.x1 - 1, b.z1 - 1]]) for (let y = b.y0; y <= b.y1; y++) set(x, y, z, PL);
        for (let x = b.x0; x <= b.x1; x++) for (let z = b.z0; z <= b.z1; z++) if (get(x, b.y0 - 1, z) === 0) set(x, b.y0 - 1, z, PL);
        continue; }
      // oriented pieces: local x across (0..2), z along, y up
      const D = p.dir; const W = (x, z) => D === 'west' ? b.x1 - z : D === 'east' ? b.x0 + z : b.x0 + x, Zf = (x, z) => D === 'north' ? b.z1 - z : D === 'south' ? b.z0 + z : b.z0 + x;
      const lset = (x, y, z, id) => set(W(x, z), b.y0 + y, Zf(x, z), id), lget = (x, y, z) => get(W(x, z), b.y0 + y, Zf(x, z));
      const lbox = (x0, y0, z0, x1, y1, z1, id, chance, k) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) if (chance == null || rnd(W(x, z), b.y0 + y, Zf(x, z), k) < chance) lset(x, y, z, id); };
      if (p.t === 'stairs') { lbox(0, 5, 0, 2, 7, 1, AIR); lbox(0, 0, 7, 2, 2, 8, AIR); for (let i = 0; i < 5; i++) lbox(0, 5 - i - (i < 4 ? 1 : 0), 2 + i, 2, 7 - i, 2 + i, AIR); continue; }
      // corridor
      const len = p.n * 5 - 1; lbox(0, 0, 0, 2, 1, len, AIR); lbox(0, 2, 0, 2, 2, len, AIR, 0.8, 1);
      if (p.spider) lbox(0, 0, 0, 2, 1, len, WEB, 0.6, 2);
      for (let s = 0; s < p.n; s++) { const l = 2 + s * 5;
        // support: fences on both sides, planks across (25%: only over the posts), a torch now and then
        for (const x of [0, 2]) { lset(x, 0, l, FN); lset(x, 1, l, FN); }
        if (rnd(W(1, l), b.y0, Zf(1, l), 3) < 0.25) { lset(0, 2, l, PL); lset(2, 2, l, PL); } else { lbox(0, 2, l, 2, 2, l, PL); if (rnd(W(1, l), b.y0, Zf(1, l), 4) < 0.05) lset(1, 2, l - 1, B.TORCH); if (rnd(W(1, l), b.y0, Zf(1, l), 5) < 0.05) lset(1, 2, l + 1, B.TORCH); }
        for (const [x, z, ch] of [[0, l - 1, 0.1], [2, l - 1, 0.1], [0, l + 1, 0.1], [2, l + 1, 0.1], [0, l - 2, 0.05], [2, l - 2, 0.05], [0, l + 2, 0.05], [2, l + 2, 0.05]]) if (lget(x, 2, z) === 0 && rnd(W(x, z), b.y0 + 2, Zf(x, z), 6) < ch) lset(x, 2, z, WEB);
        for (const [x, z, k] of [[2, l - 1, 7], [0, l + 1, 8]]) if (rnd(W(x, z), b.y0, Zf(x, z), k) < 0.01 && inC(W(x, z), Zf(x, z))) { const X = W(x, z), Z = Zf(x, z); set(X, b.y0, Z, D === 'north' || D === 'south' ? RAIL_ID.rail.ns[0] : RAIL_ID.rail.ew[0]); c.msCarts = c.msCarts || []; c.msCarts.push([X, b.y0, Z]); }
        if (p.spider && !p.spawned) { const z = l - 1 + (rnd(W(1, l), b.y0, Zf(1, l), 9) * 3 | 0); const X = W(1, z), Z = Zf(1, z); if (inC(X, Z)) { set(X, b.y0, Z, B.SPAWNER); world.spawners.set(X + ',' + b.y0 + ',' + Z, 'cave_spider'); } p.spawned = true; } }
      // planks where the floor is open, fence posts down to the ground under the ends
      for (let x = 0; x <= 2; x++) for (let z = 0; z <= len; z++) if (lget(x, -1, z) === 0) lset(x, -1, z, PL);
      for (const [x, z] of [[0, 2], [2, 2], [0, len - 2], [2, len - 2]]) { if (lget(x, -2, z) !== 0) continue; for (let y = -2; y > -40 && lget(x, y, z) === 0; y--) lset(x, y, z, FN); }
      if (p.rails) for (let z = 0; z <= len; z++) { const f = lget(1, -1, z); if (f > 0 && SOLID[f] && lget(1, 0, z) === 0 && rnd(W(1, z), b.y0, Zf(1, z), 10) < 0.7) lset(1, 0, z, D === 'north' || D === 'south' ? RAIL_ID.rail.ns[0] : RAIL_ID.rail.ew[0]); }
    } },
};
{ const _bm = buildMineshaftChunk; buildMineshaftChunk = function (world, c) { const starts = mineshaftStartsNear(world, c.cx, c.cz); for (const [sx, sz] of starts) { const L = MS.layout(world, sx, sz); if (L.all.x1 < c.cx * 16 - 1 || L.all.x0 > c.cx * 16 + 16 || L.all.z1 < c.cz * 16 - 1 || L.all.z0 > c.cz * 16 + 16) continue; MS.stamp(world, c, L); } }; }

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

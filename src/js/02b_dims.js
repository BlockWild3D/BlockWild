// ================= DIMENSION GENERATORS: Nether, End, strongholds, fortresses, ruined portals =================
const NBIO_NAME = ['Nether Wastes', 'Crimson Forest', 'Warped Forest', 'Soul Sand Valley'];
const NSEA = 31;
class NetherGen {
  constructor(seed) { this.seed = seed; this.n1 = new Perlin(seed + 101); this.n2 = new Perlin(seed + 102); this.nb = new Perlin(seed + 103); this.nb2 = new Perlin(seed + 104); this.n3 = new Perlin(seed + 105); }
  biome(x, z) { const a = this.nb.f2(x / 170, z / 170, 2), b = this.nb2.f2(x / 150, z / 150, 2); if (a > 0.1) return b > 0 ? 1 : 2; if (a < -0.14) return 3; if (b > 0.2) return 1; return 0; }
  column(x, z) { return { h: 0, b: this.biome(x, z) }; }
  biomeName(x, z) { return NBIO_NAME[this.biome(x, z)]; }
  density(x, y, z) { let v = this.n1.n3(x / 52, y / 30, z / 52) + this.n2.n3(x / 18, y / 14, z / 18) * 0.4; if (y < 26) v += (26 - y) / 12; if (y > 78) v += (y - 78) / 9; return v; }
  solidAt(x, y, z) { if (y < 6 || y > WH - 7) return true; return this.density(x, y, z) > 0.06; }
  floorNear(x, z) { for (let y = NSEA + 2; y < 84; y++) if (this.solidAt(x, y - 1, z) && !this.solidAt(x, y, z) && !this.solidAt(x, y + 1, z) && !this.solidAt(x, y + 3, z)) return y; return -1; }
  fortress(rx, rz) { const h = ihash(rx, rz, 909, this.seed); if (h % 100 >= 80) return null; return { ccx: rx * 10 + 2 + ((h >>> 8) % 6), ccz: rz * 10 + 2 + ((h >>> 12) % 6), fy: 44 + ((h >>> 16) % 14) }; }
  fortressesNear(cx, cz) { const out = []; const seen = new Set(); for (const dx of [-3, 0, 3]) for (const dz of [-3, 0, 3]) { const rx = Math.floor((cx + dx) / 10), rz = Math.floor((cz + dz) / 10); const k = rx + ',' + rz; if (seen.has(k)) continue; seen.add(k); const f = this.fortress(rx, rz); if (f) out.push(f); } return out; }
}
function genNetherChunk(world, c) {
  const g = world.gen, d = c.d, seed = world.seed, bx = c.cx * 16, bz = c.cz * 16;
  const idx = (x, y, z) => (y * 16 + z) * 16 + x;
  for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
    const wx = bx + x, wz = bz + z; const b = g.biome(wx, wz);
    for (let y = 0; y < WH; y++) {
      let id;
      if (y === 0 || y === WH - 1) id = B.BEDROCK;
      else if ((y < 4 || y > WH - 5) && rnd01(wx, y, wz, seed) < 0.45) id = B.BEDROCK;
      else id = g.solidAt(wx, y, wz) ? B.NETHERRACK : (y <= NSEA ? B.LAVA : 0);
      d[idx(x, y, z)] = id;
    }
    // surfaces
    for (let y = WH - 3; y > 1; y--) {
      const i = idx(x, y, z); if (d[i] !== B.NETHERRACK || d[idx(x, y + 1, z)] !== 0) continue;
      const q = rnd01(wx, y, wz, seed + 9);
      if (b === 1) { d[i] = B.CRIMSON_NYLIUM; if (q < 0.12) d[idx(x, y + 1, z)] = B.CRIMSON_ROOTS; else if (q < 0.15) d[idx(x, y + 1, z)] = B.CRIMSON_FUNGUS; }
      else if (b === 2) { d[i] = B.WARPED_NYLIUM; if (q < 0.12) d[idx(x, y + 1, z)] = B.WARPED_ROOTS; else if (q < 0.15) d[idx(x, y + 1, z)] = B.WARPED_FUNGUS; }
      else if (b === 3) { d[i] = B.SOUL_SAND; if (d[idx(x, y - 1, z)] === B.NETHERRACK) d[idx(x, y - 1, z)] = B.SOUL_SAND; }
      else if (y <= NSEA + 3 && g.n3.n2(wx / 9, wz / 9) > 0.2) d[i] = q < 0.5 ? B.GRAVEL : B.SOUL_SAND;
    }
  }
  const r = mulberry32(ihash(c.cx, c.cz, 7, seed));
  const veins = [[B.QUARTZ_ORE, 14, 3, 8, 10, 86], [B.NETHER_GOLD_ORE, 7, 3, 7, 10, 86], [B.MAGMA_BLOCK, 4, 4, 10, 24, 38], [B.SOUL_SAND, 2, 6, 14, 20, 60]];
  for (const [id, cnt, mn, mx, y0, y1] of veins) for (let i = 0; i < cnt; i++) {
    let x = r() * 16 | 0, y = y0 + (r() * (y1 - y0) | 0), z = r() * 16 | 0; const n = mn + (r() * (mx - mn) | 0);
    for (let k = 0; k < n; k++) { if (x >= 0 && x < 16 && z >= 0 && z < 16 && y > 0 && y < WH) { const j = idx(x, y, z); if (d[j] === B.NETHERRACK) d[j] = id; } const q = r() * 6 | 0; if (q === 0) x++; else if (q === 1) x--; else if (q === 2) y++; else if (q === 3) y--; else if (q === 4) z++; else z--; }
  }
  // glowstone clusters hanging from ceilings
  for (let i = 0; i < 3; i++) {
    const x = 2 + (r() * 12 | 0), z = 2 + (r() * 12 | 0); let y0 = -1;
    for (let y = 88; y > 46; y--) if (d[idx(x, y, z)] === 0 && SOLID[d[idx(x, y + 1, z)]]) { y0 = y; break; }
    if (y0 < 0) continue;
    let px = x, py = y0, pz = z;
    for (let k = 0; k < 26; k++) { if (px >= 0 && px < 16 && pz >= 0 && pz < 16 && d[idx(px, py, pz)] === 0) d[idx(px, py, pz)] = B.GLOWSTONE; const q = r() * 5 | 0; if (q === 0) px++; else if (q === 1) px--; else if (q === 2) pz++; else if (q === 3) pz--; else py--; if (py < y0 - 5) py = y0; }
  }
}
function netherStructures(world, cx, cz) {
  const g = world.gen, seed = world.seed; const S = { soft: [], hard: [], mobs: [], kinds: [] };
  const r = mulberry32(ihash(cx, cz, 98, seed)); const bx = cx * 16, bz = cz * 16;
  for (let a = 0; a < 6; a++) {
    const wx = bx + (r() * 16 | 0), wz = bz + (r() * 16 | 0); const q = r(), hh = r();
    const b = g.biome(wx, wz); if (b !== 1 && b !== 2) continue; if (q > 0.55) continue;
    const y0 = g.floorNear(wx, wz); if (y0 < 0) continue;
    const stem = b === 1 ? B.CRIMSON_STEM : B.WARPED_STEM, wart = b === 1 ? B.NETHER_WART_BLOCK : B.WARPED_WART_BLOCK;
    const H = 5 + (hh * 6 | 0);
    for (let y = H - 3; y <= H + 1; y++) { const rr = y >= H ? 1 : 2; for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) { if (Math.abs(dx) === rr && Math.abs(dz) === rr && y < H) continue; const s = rnd01(wx + dx, y0 + y, wz + dz, seed); if (y < H && Math.abs(dx) < rr && Math.abs(dz) < rr) continue; S.soft.push(wx + dx, y0 + y, wz + dz, s < 0.1 ? B.SHROOMLIGHT : wart); } }
    for (let y = 0; y < H; y++) S.hard.push(wx, y0 + y, wz, stem);
  }
  return S;
}
function buildFortressChunk(world, c, hints) {
  const g = world.gen, d = c.d, bx = c.cx * 16, bz = c.cz * 16, cx = c.cx, cz = c.cz;
  const set = (lx, y, lz, id) => { if (lx < 0 || lx > 15 || lz < 0 || lz > 15 || y < 1 || y >= WH - 1) return; d[(y * 16 + lz) * 16 + lx] = id; };
  const get = (lx, y, lz) => d[(y * 16 + lz) * 16 + lx];
  for (const f of g.fortressesNear(cx, cz)) {
    const fy = f.fy;
    const onX = cz === f.ccz && Math.abs(cx - f.ccx) <= 3 && cx !== f.ccx, onZ = cx === f.ccx && Math.abs(cz - f.ccz) <= 3 && cz !== f.ccz;
    const bridge = (alongX) => {
      c.fortress = true;
      for (let t = 0; t < 16; t++) for (let lat = -3; lat <= 3; lat++) {
        const lx = alongX ? t : 8 + lat, lz = alongX ? 8 + lat : t; const w = alongX ? bx + t : bz + t; const al = Math.abs(lat);
        if (al <= 2) set(lx, fy, lz, B.NETHER_BRICKS);
        if (al === 2) set(lx, fy + 1, lz, B.NETHER_BRICKS);
        if (al <= 1) for (let y = fy + 1; y <= fy + 4; y++) set(lx, y, lz, 0);
        if (al === 2) for (let y = fy + 2; y <= fy + 4; y++) set(lx, y, lz, 0);
        if (al <= 2 && ((w % 12) + 12) % 12 < 2) for (let y = fy - 1; y > 1; y--) { const cur = get(lx, y, lz); if (cur === 0 || cur === B.LAVA || PLANT[cur]) set(lx, y, lz, B.NETHER_BRICKS); else break; }
        if (al === 2) set(lx, fy - 1, lz, B.NETHER_BRICKS);
      }
      const dist = alongX ? Math.abs(cx - f.ccx) : Math.abs(cz - f.ccz);
      if (dist === 2) {
        for (let a = 5; a <= 11; a++) for (let lat = 3; lat <= 6; lat++) { const lx = alongX ? a : 8 + lat, lz = alongX ? 8 + lat : a; set(lx, fy, lz, B.NETHER_BRICKS); for (let y = fy + 1; y <= fy + 4; y++) set(lx, y, lz, (lat === 6 || a === 5 || a === 11) && y === fy + 1 ? B.NETHER_BRICKS : 0); }
        const sx = alongX ? 8 : 13, sz = alongX ? 13 : 8; set(sx, fy + 1, sz, B.SPAWNER); world.spawners.set((bx + sx) + ',' + (fy + 1) + ',' + (bz + sz), 'blaze');
      }
      if (Math.random() < 0.3) hints.push(['wither_skeleton', alongX ? bx + 8.5 : bx + 8.5, fy + 1, alongX ? bz + 8.5 : bz + 8.5]);
    };
    if (onX) bridge(true); if (onZ) bridge(false);
    if (cx === f.ccx && cz === f.ccz) {
      c.fortress = true;
      for (let lx = 0; lx < 16; lx++) for (let lz = 0; lz < 16; lz++) {
        const inHall = lx >= 2 && lx <= 14 && lz >= 2 && lz <= 14; const wall = inHall && (lx === 2 || lx === 14 || lz === 2 || lz === 14);
        const corridor = (Math.abs(lx - 8) <= 2) || (Math.abs(lz - 8) <= 2);
        if (inHall) {
          set(lx, fy, lz, B.NETHER_BRICKS); set(lx, fy + 7, lz, B.NETHER_BRICKS);
          for (let y = fy + 1; y <= fy + 6; y++) { let id = wall ? B.NETHER_BRICKS : 0; if (wall && y <= fy + 3 && (Math.abs(lx - 8) <= 1 || Math.abs(lz - 8) <= 1)) id = 0; if (wall && y === fy + 4 && ((lx + lz) % 3 === 0)) id = 0; set(lx, y, lz, id); }
          for (let y = fy - 1; y > 1; y--) { if ((lx === 2 || lx === 14) && (lz === 2 || lz === 14)) { const cur = get(lx, y, lz); if (cur === 0 || cur === B.LAVA) set(lx, y, lz, B.NETHER_BRICKS); else break; } }
        } else if (corridor) {
          const lat = Math.abs(lx - 8) <= 2 ? Math.abs(lx - 8) : Math.abs(lz - 8);
          set(lx, fy, lz, B.NETHER_BRICKS); if (lat === 2) set(lx, fy + 1, lz, B.NETHER_BRICKS); for (let y = fy + (lat === 2 ? 2 : 1); y <= fy + 4; y++) set(lx, y, lz, 0);
        }
      }
      set(8, fy + 1, 8, B.SPAWNER); world.spawners.set((bx + 8) + ',' + (fy + 1) + ',' + (bz + 8), 'blaze');
      for (const [lx, lz] of [[4, 4], [12, 12]]) { set(lx, fy + 1, lz, B.CHEST); world.chestLoot.set((bx + lx) + ',' + (fy + 1) + ',' + (bz + lz), 'fortress'); }
      for (const [lx, lz] of [[4, 12], [12, 4]]) { set(lx, fy + 1, lz, B.MAGMA_BLOCK); }
      for (const [lx, lz] of [[5, 5], [11, 11], [5, 11], [11, 5]]) set(lx, fy + 7, lz, B.GLOWSTONE);
      hints.push(['wither_skeleton', bx + 6.5, fy + 1, bz + 9.5]); hints.push(['blaze', bx + 10.5, fy + 2, bz + 6.5]);
    }
  }
}
function buildRuinedPortal(S, g, x0, z0, hard, r, world) {
  const fy = g.column(x0 + 1, z0).h; if (fy <= SEA) return;
  for (let dx = -2; dx <= 6; dx++) for (let dz = -2; dz <= 2; dz++) { const gh = g.column(x0 + dx, z0 + dz).h; if (r() < 0.7) hard(x0 + dx, gh - 1, z0 + dz, r() < 0.2 ? B.MAGMA_BLOCK : B.NETHERRACK); for (let y = gh; y < fy + 5; y++) if (Math.abs(dz) <= 1 && dx >= -1 && dx <= 5) hard(x0 + dx, y, z0 + dz, 0); }
  for (let dx = 0; dx <= 3; dx++) for (let dy = -1; dy <= 3; dy++) {
    const border = dx === 0 || dx === 3 || dy === -1 || dy === 3;
    if (border) { const q = r(); if (q < 0.7) hard(x0 + dx, fy + dy, z0, B.OBSIDIAN); else if (q < 0.85 && dy >= 0) hard(x0 + dx, fy + dy, z0, B.NETHERRACK); else hard(x0 + dx, fy + dy, z0, dy === -1 ? B.NETHERRACK : 0); }
    else hard(x0 + dx, fy + dy, z0, 0);
  }
  hard(x0 + 5, fy - 1, z0 + 1, B.NETHERRACK); hard(x0 + 5, fy, z0 + 1, B.CHEST); world.chestLoot.set((x0 + 5) + ',' + fy + ',' + (z0 + 1), 'ruined_portal');
}
function buildStronghold(world, c, sh) {
  const d = c.d, bx = c.cx * 16, bz = c.cz * 16; const y0 = sh.y; const r = mulberry32(ihash(c.cx, c.cz, 31, world.seed));
  const set = (lx, y, lz, id) => { d[(y * 16 + lz) * 16 + lx] = id; };
  for (let lx = 1; lx <= 14; lx++) for (let lz = 1; lz <= 14; lz++) for (let y = y0; y <= y0 + 8; y++) {
    const shell = lx === 1 || lx === 14 || lz === 1 || lz === 14 || y === y0 || y === y0 + 8;
    set(lx, y, lz, shell ? (r() < 0.2 ? B.MOSSY_COBBLESTONE : r() < 0.1 ? B.COBBLESTONE : B.STONE_BRICKS) : 0);
  }
  for (let lz = 3; lz <= 12; lz++) for (let y = y0 + 1; y <= y0 + 3; y++) set(2, y, lz, B.BOOKSHELF);
  for (let lx = 5; lx <= 9; lx++) for (let lz = 5; lz <= 9; lz++) {
    const ring = (lx === 5 || lx === 9) !== (lz === 5 || lz === 9);
    if (ring) set(lx, y0 + 1, lz, r() < 0.1 ? B.END_PORTAL_FRAME_EYE : B.END_PORTAL_FRAME);
    else if (lx > 5 && lx < 9 && lz > 5 && lz < 9) set(lx, y0, lz, B.LAVA);
    else set(lx, y0 + 1, lz, B.STONE_BRICKS);
  }
  set(7, y0 + 1, 10, B.STONE_BRICKS);
  for (const [lx, lz] of [[3, 3], [12, 3], [3, 12], [12, 12]]) set(lx, y0 + 1, lz, B.TORCH);
  set(12, y0 + 1, 7, B.CHEST); world.chestLoot.set((bx + 12) + ',' + (y0 + 1) + ',' + (bz + 7), 'stronghold');
  // a narrow shaft with spiral steps up to the surface
  const top = Math.min(WH - 2, Math.max(...[0, 1].map(() => world.gen.column(bx + 12, bz + 12).h)) + 1);
  const ring = [[11, 11], [12, 11], [13, 11], [13, 12], [13, 13], [12, 13], [11, 13], [11, 12]];
  for (let y = y0 + 1; y <= top; y++) { for (const [lx, lz] of ring) if (y > y0 + 7) set(lx, y, lz, 0); set(12, y, 12, y > y0 + 7 ? B.STONE_BRICKS : d[(y * 16 + 12) * 16 + 12]); }
  for (let i = 0; y0 + 1 + i <= top; i++) { const [lx, lz] = ring[i % 8]; set(lx, y0 + 1 + i, lz, B.STONE_BRICKS); for (let k = 1; k <= 3 && y0 + 1 + i + k <= top; k++) set(lx, y0 + 1 + i + k, lz, 0); }
  for (let y = y0 + 1; y <= y0 + 3; y++) { set(12, y, 12, 0); }
}

// ---------------- The End ----------------
function endPillars(seed) { const r = mulberry32(seed ^ 0xe11d); const P = []; const a0 = r() * 6.28; for (let i = 0; i < 10; i++) { const a = a0 + i * Math.PI * 2 / 10; P.push({ i, x: Math.round(Math.cos(a) * 42), z: Math.round(Math.sin(a) * 42), rad: 2 + (i % 3), top: 66 + (r() * 20 | 0) }); } return P; }
class EndGen {
  constructor(seed) { this.seed = seed; this.n = new Perlin(seed + 201); this.n2 = new Perlin(seed + 202); this.pillars = endPillars(seed); }
  column(x, z) { const dd = Math.hypot(x, z); const R = 92 + this.n.n2(x / 45, z / 45) * 18; if (dd > R) return { h: 0, b: 0, bottom: 0 }; const top = 52 + Math.round(this.n2.n2(x / 24, z / 24) * 3 - Math.pow(dd / R, 3) * 4); const th = Math.max(2, Math.round((1 - dd / R) * 36)); return { h: top, b: 0, bottom: top - th }; }
  biomeName() { return 'The End'; }
  fountainY() { return this.column(0, 0).h; }
}
function genEndChunk(world, c) {
  const g = world.gen, d = c.d, bx = c.cx * 16, bz = c.cz * 16;
  for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) { const col = g.column(bx + x, bz + z); if (!col.h) continue; for (let y = Math.max(1, col.bottom); y < col.h; y++) d[(y * 16 + z) * 16 + x] = B.END_STONE; }
}
function endStructures(world, cx, cz) {
  const g = world.gen; const S = { soft: [], hard: [], mobs: [], kinds: [] };
  for (const p of g.pillars) {
    if ((p.x >> 4) !== cx || (p.z >> 4) !== cz) continue;
    for (let dx = -p.rad; dx <= p.rad; dx++) for (let dz = -p.rad; dz <= p.rad; dz++) { if (dx * dx + dz * dz > p.rad * p.rad + p.rad * 0.6) continue; for (let y = 36; y <= p.top; y++) S.hard.push(p.x + dx, y, p.z + dz, B.OBSIDIAN); }
    S.hard.push(p.x, p.top + 1, p.z, B.BEDROCK); S.kinds.push(['pillar', p.x, p.z, p.top]);
  }
  if (cx === 0 && cz === 0) {
    const ey = g.fountainY();
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
      const d2 = dx * dx + dz * dz; if (d2 > 12) continue;
      S.hard.push(dx, ey - 1, dz, B.BEDROCK); S.hard.push(dx, ey, dz, d2 > 6 ? B.BEDROCK : 0);
      for (let y = ey + 1; y <= ey + 6; y++) S.hard.push(dx, y, dz, 0);
    }
    for (let y = ey; y <= ey + 3; y++) S.hard.push(0, y, 0, B.BEDROCK);
    S.hard.push(0, ey + 4, 0, B.TORCH);
    S.kinds.push(['fountain', 0, 0, ey]);
  }
  return S;
}

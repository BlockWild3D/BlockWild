// ================= WOODS AT RUN TIME: stripping, saplings growing into trees, new biomes =================
// Axes strip logs and wood (keeping the way they lie). Saplings grow on random ticks in light 9 or more, or with bone
// meal (Minecraft: 45% per use); dark oak and pale oak need four saplings in a 2x2 square, which also grows giant
// spruce and jungle trees. Crimson and warped fungi grow into huge fungi on their own nylium with bone meal.
// New biomes: Cherry Grove (pink trees and petals on high ground), Mangrove Swamp (mud, mangroves on arching roots in
// warm swamps) and Pale Garden (pale oaks, pale moss and hanging moss in the coldest dark forests).
Object.assign(BIO, { CHERRY_GROVE: 12, MANGROVE_SWAMP: 13, PALE_GARDEN: 14 });
BIO_NAME.push('Cherry Grove', 'Mangrove Swamp', 'Pale Garden');

// ---- tree shapes; put(x, y, z, id, isLog) does the placing (world growth or chunk generation) ----
const TREES = {
  blob(put, x, y, z, r, lv, top) { for (let yy = top - 3; yy <= top; yy++) { const rr = yy >= top - 1 ? 1 : 2; for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) { if (Math.abs(dx) === rr && Math.abs(dz) === rr && (yy === top || r() < 0.5)) continue; put(x + dx, yy, z + dz, lv, false); } } },
  oak(put, x, y, z, r) { const H = 4 + (r() * 3 | 0); TREES.blob(put, x, y, z, r, B.LEAVES, y + H); for (let i = 0; i < H; i++) put(x, y + i, z, B.LOG, true); },
  birch(put, x, y, z, r) { const H = 5 + (r() * 3 | 0); TREES.blob(put, x, y, z, r, B.BIRCH_LEAVES, y + H); for (let i = 0; i < H; i++) put(x, y + i, z, B.BIRCH_LOG, true); },
  jungle(put, x, y, z, r) { const H = 4 + (r() * 7 | 0); TREES.blob(put, x, y, z, r, B.JUNGLE_LEAVES, y + H); for (let i = 0; i < H; i++) put(x, y + i, z, B.JUNGLE_LOG, true); },
  spruce(put, x, y, z, r) { const H = 6 + (r() * 4 | 0); for (let i = 0; i < H; i++) put(x, y + i, z, B.SPRUCE_LOG, true);
    let rad = 0; for (let yy = y + H; yy >= y + 2; yy--) { for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) { if (Math.abs(dx) + Math.abs(dz) > rad + (rad > 1 ? 1 : 0)) continue; if (dx || dz || yy >= y + H) put(x + dx, yy, z + dz, B.SPRUCE_LEAVES, false); } rad = rad >= 2 ? 1 : rad + 1; }
    put(x, y + H, z, B.SPRUCE_LEAVES, false); put(x, y + H + 1, z, B.SPRUCE_LEAVES, false); },
  acacia(put, x, y, z, r) { const H = 5 + (r() * 3 | 0); const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][r() * 4 | 0]; let tx = x, tz = z;
    for (let i = 0; i < H; i++) { if (i >= H - 3) { tx += d[0]; tz += d[1]; } put(tx, y + i, tz, B.ACACIA_LOG, true); }
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) { if (Math.abs(dx) + Math.abs(dz) > 4) continue; put(tx + dx, y + H, tz + dz, B.ACACIA_LEAVES, false); if (Math.abs(dx) + Math.abs(dz) <= 2) put(tx + dx, y + H + 1, tz + dz, B.ACACIA_LEAVES, false); } },
  big(put, x, y, z, r, log, lv, H0, extra) { const H = H0 + (r() * 3 | 0); // 2x2 trunk (x..x+1, z..z+1) with a wide flat crown
    for (let yy = H - 2; yy <= H + 1; yy++) for (let dx = -3; dx <= 4; dx++) for (let dz = -3; dz <= 4; dz++) { const e = Math.max(Math.abs(dx - 0.5) - (yy > H ? 1.5 : 3), Math.abs(dz - 0.5) - (yy > H ? 1.5 : 3)); if (e > 0.6 || (e > -0.4 && r() < 0.4)) continue; put(x + dx, y + yy, z + dz, lv, false); if (extra && yy === H - 2 && r() < 0.2) extra(x + dx, y + yy - 1, z + dz); }
    for (let i = 0; i < H; i++) for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) put(x + a, y + i, z + b, log, true); },
  dark_oak(put, x, y, z, r) { TREES.big(put, x, y, z, r, B.DARK_OAK_LOG, B.DARK_OAK_LEAVES, 6); },
  pale_oak(put, x, y, z, r) { TREES.big(put, x, y, z, r, B.PALE_OAK_LOG, B.PALE_OAK_LEAVES, 7, (a, b, c) => { for (let k = 0; k < 1 + (r() * 3 | 0); k++) put(a, b - k, c, B.PALE_HANGING_MOSS, false); }); },
  mega_spruce(put, x, y, z, r) { const H = 14 + (r() * 10 | 0); for (let i = 0; i < H; i++) for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) put(x + a, y + i, z + b, B.SPRUCE_LOG, true);
    for (let yy = y + Math.floor(H * 0.45); yy <= y + H + 1; yy++) { const rr = Math.max(1, Math.round((y + H + 1 - yy) * 0.35)) + ((yy & 1) ? 0 : 1); for (let dx = -rr; dx <= rr + 1; dx++) for (let dz = -rr; dz <= rr + 1; dz++) if ((dx - 0.5) ** 2 + (dz - 0.5) ** 2 <= rr * rr + 1) put(x + dx, yy, z + dz, B.SPRUCE_LEAVES, false); } },
  mega_jungle(put, x, y, z, r) { const H = 18 + (r() * 12 | 0); for (let i = 0; i < H; i++) for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) put(x + a, y + i, z + b, B.JUNGLE_LOG, true);
    for (let yy = y + H - 2; yy <= y + H + 1; yy++) { const rr = yy > y + H ? 2 : 4; for (let dx = -rr; dx <= rr + 1; dx++) for (let dz = -rr; dz <= rr + 1; dz++) if ((dx - 0.5) ** 2 + (dz - 0.5) ** 2 <= rr * rr + 1) put(x + dx, yy, z + dz, B.JUNGLE_LEAVES, false); } },
  cherry(put, x, y, z, r) { const H = 4 + (r() * 3 | 0); for (let i = 0; i < H; i++) put(x, y + i, z, B.CHERRY_LOG, true);
    const tops = [[x, y + H, z]]; const nb = 1 + (r() * 2 | 0);
    for (let b = 0; b < nb; b++) { const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][(r() * 4 | 0)]; let bx = x, by = y + H - 2, bz = z; const L = 2 + (r() * 3 | 0); for (let i = 0; i < L; i++) { bx += d[0]; bz += d[1]; if (i % 2) by++; put(bx, by, bz, withState(B.CHERRY_LOG, { axis: d[0] ? 'x' : 'z' }), true); } tops.push([bx, by + 1, bz]); }
    for (const [cx, cy, cz] of tops) for (let dy = -1; dy <= 2; dy++) { const rr = dy === 2 ? 2 : dy === -1 ? 3 : 4; for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) { const q = dx * dx + dz * dz; if (q > rr * rr || (q > (rr - 1) * (rr - 1) && r() < 0.35)) continue; put(cx + dx, cy + dy, cz + dz, B.CHERRY_LEAVES, false); if (dy === -1 && q > 4 && r() < 0.15) put(cx + dx, cy + dy - 1, cz + dz, B.CHERRY_LEAVES, false); } } },
  mangrove(put, x, y, z, r, ground) { const H = 6 + (r() * 4 | 0); const base = y + 2; // the trunk stands on arching roots
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) { if (r() < 0.25) continue; const L = 2 + (r() * 2 | 0); for (let i = 1; i <= L; i++) put(x + dx * i, base - Math.min(i, 2), z + dz * i, B.MANGROVE_ROOTS, true); for (let yy = base - 3; yy > base - 8; yy--) { const id = ground(x + dx * L, yy, z + dz * L); put(x + dx * L, yy, z + dz * L, B.MANGROVE_ROOTS, true); if (id && !FKIND[id] && SOLID[id]) break; } }
    for (let yy = y; yy < base; yy++) put(x, yy, z, B.MANGROVE_ROOTS, true);
    for (let i = 0; i < H; i++) put(x, base + i, z, B.MANGROVE_LOG, true);
    for (let yy = base + H - 3; yy <= base + H + 1; yy++) { const rr = yy > base + H ? 2 : 3; for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) { if (dx * dx + dz * dz > rr * rr + 1 || r() < 0.12) continue; put(x + dx, yy, z + dz, B.MANGROVE_LEAVES, false); } } },
  fungus(put, x, y, z, r, nether) { const warped = nether === 'warped'; const stem = warped ? B.WARPED_STEM : B.CRIMSON_STEM, cap = warped ? B.WARPED_WART_BLOCK : B.NETHER_WART_BLOCK; const H = 4 + (r() * 9 | 0);
    for (let i = 0; i < H; i++) put(x, y + i, z, stem, true);
    for (let yy = y + H - 3; yy <= y + H; yy++) { const rr = yy === y + H ? 1 : 2; for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) { if (!(Math.abs(dx) === rr || Math.abs(dz) === rr || yy === y + H)) continue; put(x + dx, yy, z + dz, r() < 0.08 ? B.SHROOMLIGHT : cap, false); } } },
};

// ---- growing a tree in the world ----
const treeRoom = (id) => !id || !!PLANT[id] || (BL[id] && (BL[id].sapling || /leaves/.test(BL[id].key) || BL[id].render === 'cross' || isWaterId(id)));
function growTree(x, y, z, kind, big) {
  const r = Math.random; const cells = []; let blocked = false;
  const put = (a, b, c, id, isLog) => { if (b < 1 || b >= WH - 1) return; const cur = world.get(a, b, c); if (isLog) { if (!treeRoom(cur) && !(cur === B.MANGROVE_ROOTS)) { if (b < y + 4 && !(kind === 'mangrove' && b < y + 2)) blocked = true; return; } } else if (cur && !treeRoom(cur)) return; cells.push([a, b, c, id, isLog]); };
  const ground = (a, b, c) => world.get(a, b, c);
  const fn = TREES[kind]; if (!fn) return false; fn(put, x, y, z, r, kind === 'mangrove' ? ground : kind);
  if (blocked) return false;
  for (const [a, b, c, id, isLog] of cells) { const cur = world.get(a, b, c); if (!isLog && cur && !treeRoom(cur)) continue; if (!isLog && cur && /leaves/.test(BL[cur].key) && id !== B.PALE_HANGING_MOSS) continue; world.set(a, b, c, id); }
  // the soil under the trunk becomes dirt (grass and podzol do in Minecraft)
  const under = world.get(x, y - 1, z); if (under === B.GRASS || under === B.SNOWY_GRASS) world.set(x, y - 1, z, B.DIRT);
  return true;
}
// what a sapling grows into; 2x2 saplings make big trees
function trySapling(x, y, z, id) {
  const d = BL[id]; if (!d || !d.sapling) return false; const k = d.sapling;
  if (world.lightAt(x + 0.5, y + 0.5, z + 0.5, G.daylight) < 0.55 && world.lightAt(x + 0.5, y + 0.5, z + 0.5, 1) < 0.55) return false;
  // find a 2x2 of the same sapling with this one in it
  let sq = null; for (const [ox, oz] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) { const a = x + ox, c = z + oz; if ([[0, 0], [1, 0], [0, 1], [1, 1]].every(([p, q]) => world.get(a + p, y, c + q) === id)) { sq = [a, c]; break; } }
  if ((k === 'dark_oak' || k === 'pale_oak') && !sq) return false;
  const clear = (a, c) => { for (const [p, q] of [[0, 0], [1, 0], [0, 1], [1, 1]]) world.set(a + p, y, c + q, 0); };
  const restore = (a, c) => { for (const [p, q] of [[0, 0], [1, 0], [0, 1], [1, 1]]) world.set(a + p, y, c + q, id); };
  if (sq && (k === 'dark_oak' || k === 'pale_oak' || k === 'spruce' || k === 'jungle')) { clear(sq[0], sq[1]); const kind = k === 'spruce' ? 'mega_spruce' : k === 'jungle' ? 'mega_jungle' : k; if (growTree(sq[0], y, sq[1], kind)) return true; restore(sq[0], sq[1]); return false; }
  world.set(x, y, z, 0); const kind = k === 'birch' ? 'birch' : k; if (growTree(x, y, z, kind)) return true; world.set(x, y, z, id); return false;
}
// saplings and fungi on random ticks (called from randomTicks in 12_farm.js)
function saplingTick(x, y, z, id) { if (Math.random() < 0.25) trySapling(x, y, z, id); }
// bone meal: 45% chance; fungi grow on their own nylium
{ const _fu = farmUse; farmUse = function (h, hd) {
    if (hd && hd.kind === 'bonemeal' && target) { const id = target.id; const d = BL[id]; const { x, y, z } = target;
      const fx = () => { useHeld(1); S.swing = 1; S.useCD = 0.2; Particles.emit(x + 0.5, y + 0.5, z + 0.5, 10, [[0.4, 0.9, 0.4], [0.7, 1, 0.6]], 1.5, 0.8, -1, 0.8); };
      if (d && d.sapling) { if (Math.random() < 0.45) trySapling(x, y, z, id); fx(); return true; }
      if ((id === B.CRIMSON_FUNGUS || id === B.WARPED_FUNGUS) && world.get(x, y - 1, z) === (id === B.CRIMSON_FUNGUS ? B.CRIMSON_NYLIUM : B.WARPED_NYLIUM)) { if (Math.random() < 0.4) { world.set(x, y, z, 0); if (!growTree(x, y, z, 'fungus')) world.set(x, y, z, id); } fx(); return true; }
    }
    return _fu(h, hd); }; }
// fungus colour: TREES.fungus reads its 6th argument; growTree passes the kind, so map it here
{ const _f = TREES.fungus; TREES.fungus = function (put, x, y, z, r) { const id = world.get(x, y - 1, z); return _f(put, x, y, z, r, id === B.WARPED_NYLIUM ? 'warped' : 'crimson'); }; }

// ---- axes strip logs and wood ----
{ const _ua = useAction; useAction = function (eye, dir) {
    const h = player.held(); const hd = h && ITEMS[h.id];
    if (target && !targetMob && hd && hd.kind === 'tool' && hd.tool === 'axe' && !isSpec()) { const d = BL[target.id]; const base = d && d.fam && FAMILY[d.fam] ? BL[FAMILY[d.fam].base] : null;
      if (base && base.stripTo && FAMILY[base.stripTo]) { mouseR = false; world.set(target.x, target.y, target.z, famId(base.stripTo, { axis: d.st.axis })); Sfx.play('wood', 1, 0.7); damageHeld(1); S.swing = 1; return; } }
    return _ua.apply(this, arguments); }; }

// ---- new biomes ----
{ const _col = Gen.prototype.column; Gen.prototype.column = function (x, z) {
    const c = _col.call(this, x, z);
    if (c.b === BIO.SWAMP) { if (this.nT.f2(x / 560, z / 560, 2) > 0.02) c.b = BIO.MANGROVE_SWAMP; }
    else if (c.b === BIO.DARK_FOREST) { if (this.nT.f2(x / 700 + 31, z / 700 - 17, 2) < -0.12) c.b = BIO.PALE_GARDEN; }
    else if ((c.b === BIO.PLAINS || c.b === BIO.FOREST || c.b === BIO.MOUNTAINS) && c.h > SEA + 22 && c.h < SEA + 70) { if (this.nW.f2(x / 420 - 50, z / 420 + 90, 2) > 0.2) c.b = BIO.CHERRY_GROVE; }
    return c; }; }
{ const _dec = decorate; decorate = function (world, S, cx, cz) {
    const r0 = _dec.apply(this, arguments); const g = world.gen, seed = world.seed; const r = mulberry32(ihash(cx, cz, 7919, seed)); const bx = cx * 16, bz = cz * 16;
    const b0 = g.column(bx + 8, bz + 8).b; if (b0 !== BIO.CHERRY_GROVE && b0 !== BIO.MANGROVE_SWAMP && b0 !== BIO.PALE_GARDEN) return r0;
    if (startNear(world, 'village', cx, cz, 2)) return r0;
    const hard = (x, y, z, id) => { if (y > 0 && y < WH) S.hard.push(x, y, z, id); }, soft = (x, y, z, id) => { if (y > 0 && y < WH) S.soft.push(x, y, z, id); };
    // ground
    for (let lx = 0; lx < 16; lx++) for (let lz = 0; lz < 16; lz++) { const x = bx + lx, z = bz + lz; const col = g.column(x, z); const y = col.h - 1;
      if (col.b === BIO.MANGROVE_SWAMP && col.h >= SEA - 4) { hard(x, y, z, B.MUD); hard(x, y - 1, z, B.MUD); if (rnd01(x, y, z, seed + 5) < 0.06) hard(x, y, z, B.MUDDY_MANGROVE_ROOTS); }
      else if (col.b === BIO.PALE_GARDEN && col.h > SEA) { const v = g.nW.f2(x / 18, z / 18, 1); if (v > 0.25) { hard(x, y, z, B.PALE_MOSS_BLOCK); if (rnd01(x, y + 1, z, seed) < 0.5) soft(x, y + 1, z, B.PALE_MOSS_CARPET); } }
      else if (col.b === BIO.CHERRY_GROVE && col.h > SEA && rnd01(x, y + 1, z, seed + 9) < 0.12) soft(x, y + 1, z, B.PINK_PETALS); }
    // trees
    const tries = b0 === BIO.PALE_GARDEN ? 8 : b0 === BIO.MANGROVE_SWAMP ? 2 : 3;
    for (let a = 0; a < tries; a++) { const x = bx + (r() * 16 | 0), z = bz + (r() * 16 | 0); const col = g.column(x, z); if (col.b !== b0 || col.h > WH - 40 || g.cave(x, col.h - 1, z)) continue;
      const put = (px, py, pz, id, isLog) => (isLog ? hard : soft)(px, py, pz, id);
      if (b0 === BIO.CHERRY_GROVE) { if (col.h <= SEA) continue; TREES.cherry(put, x, col.h, z, r); }
      else if (b0 === BIO.PALE_GARDEN) { if (col.h <= SEA) continue; if (r() < 0.25) TREES.dark_oak(put, x, col.h, z, r); else TREES.pale_oak(put, x, col.h, z, r); }
      else { if (col.h < SEA - 3) continue; const y = Math.max(col.h, SEA + 1); TREES.mangrove(put, x, y, z, r, (px, py, pz) => { const c2 = g.column(px, pz); return py < c2.h ? B.MUD : 0; }); }
    }
    return r0; }; }

// ---- saplings can also go on mud, moss and farmland; propagules on mud and clay ----
{ const _pb = placeBlock; placeBlock = function (hit, id) {
    const d = BL[id]; if (d && d.sapling && hit) { let x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz; if (PLANT[hit.id]) { x = hit.x; y = hit.y; z = hit.z; } const below = world.get(x, y - 1, z);
      if ([B.MUD, B.FARMLAND, B.PALE_MOSS_BLOCK, B.MUDDY_MANGROVE_ROOTS].includes(below) && replaceableAt(x, y, z)) { world.set(x, y, z, id); Sfx.play('grass', 1, 0.8); return true; } }
    return _pb.apply(this, arguments); }; }

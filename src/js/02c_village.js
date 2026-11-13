// ================= VILLAGES: plaza + well, roads, houses, library, smithy, temple, farms, animal pens, lamps =================
// Layout (chunks around the start chunk): the centre chunk is the plaza; the 4 chunks on each axis out to distance 2
// carry a road with buildings facing it on both sides; the diagonal chunks hold farms, pens and back-street houses.
function villageMats(b, vh) {
  if (b === BIO.DESERT) return { wall: B.SANDSTONE, corner: B.SANDSTONE, floor: B.SANDSTONE, roof: B.SANDSTONE, found: B.SANDSTONE, post: B.SANDSTONE, ground: B.SAND, road: B.SANDSTONE, log: B.SANDSTONE };
  if (b === BIO.SNOWY) return { wall: B.PLANKS, corner: B.SPRUCE_LOG, floor: B.PLANKS, roof: B.SPRUCE_LOG, found: B.COBBLESTONE, post: B.SPRUCE_LOG, ground: B.SNOWY_GRASS, road: B.DIRT_PATH, log: B.SPRUCE_LOG };
  return { wall: B.PLANKS, corner: B.LOG, floor: B.PLANKS, roof: [B.PLANKS, B.BRICK, B.COBBLESTONE, B.STONE_BRICKS][(vh >> 4) & 3], found: B.COBBLESTONE, post: B.LOG, ground: B.GRASS, road: B.DIRT_PATH, log: B.LOG };
}
function roadCell(g, x, z, hard, M) {
  const h = g.column(x, z).h;
  if (h <= SEA) { hard(x, SEA, z, B.PLANKS); for (let y = SEA + 1; y < SEA + 4; y++) hard(x, y, z, 0); return; } // bridge over water
  hard(x, h - 1, z, M.road); for (let y = h; y < h + 3; y++) hard(x, y, z, 0);
}
function lampPost(g, x, z, hard, M) { const h = g.column(x, z).h; if (h <= SEA) return; hard(x, h, z, M.found); hard(x, h + 1, z, M.post); hard(x, h + 2, z, M.post); hard(x, h + 3, z, B.GLOWSTONE); }
function flatPad(g, x0, z0, x1, z1, fy, hard, top, found) { for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { groundFill(g, x, z, fy, hard, found); hard(x, fy, z, top); for (let y = fy + 1; y <= fy + 8; y++) hard(x, y, z, 0); } }
function padHeight(g, x0, z0, x1, z1) { let mn = 999, mx = -999; for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [(x0 + x1) >> 1, (z0 + z1) >> 1]]) { const h = g.column(x, z).h; mn = Math.min(mn, h); mx = Math.max(mx, h); } return { fy: g.column((x0 + x1) >> 1, (z0 + z1) >> 1).h - 1, rough: mx - mn }; }
// a building: kind = house | library | smithy | temple | farmhouse. doorSide: 0 +x, 1 -x, 2 +z, 3 -z
function villageBuilding(S, g, kind, x0, z0, w, d, doorSide, hard, M, r, world) {
  if (kind === 'house' || kind === 'farmhouse' || kind === 'library') {
    buildHouse(S, g, x0, z0, w, d, hard, M, doorSide, r, world);
    const fy = g.column(x0 + (w >> 1), z0 + (d >> 1)).h - 1;
    if (kind === 'library') { // bookshelves along the back wall, lectern-ish table
      const back = [[x0 + 1, z0 + 1, 1, 0, w - 2], [x0 + 1, z0 + d - 2, 1, 0, w - 2], [x0 + w - 2, z0 + 1, 0, 1, d - 2], [x0 + 1, z0 + 1, 0, 1, d - 2]][[3, 2, 1, 0][doorSide]];
      if (back) for (let i = 0; i < back[4]; i++) for (let y = 1; y <= 2; y++) hard(back[0] + back[2] * i, fy + y, back[1] + back[3] * i, B.BOOKSHELF);
      hard(x0 + (w >> 1), fy + 1, z0 + (d >> 1), B.LECTERN);
    }
    if (kind === 'farmhouse') hard(x0 + 1, fy + 1, z0 + d - 2, B.HAY_BLOCK);
    for (const [cx, cz] of [[x0 + w - 2, z0 + 1], [x0 + 1, z0 + 1], [x0 + 1, z0 + d - 2], [x0 + w - 2, z0 + d - 2]]) { const k = cx + ',' + (fy + 1) + ',' + cz; if (world.chestLoot.get(k) === 'house') world.chestLoot.set(k, kind === 'library' ? 'library' : kind === 'farmhouse' ? 'farm' : 'house'); }
    return;
  }
  const { fy, rough } = padHeight(g, x0, z0, x0 + w - 1, z0 + d - 1); if (rough > 5 || fy < SEA) return;
  flatPad(g, x0 - 1, z0 - 1, x0 + w, z0 + d, fy, hard, M.ground, B.DIRT);
  const door = [[x0 + w - 1, z0 + (d >> 1)], [x0, z0 + (d >> 1)], [x0 + (w >> 1), z0 + d - 1], [x0 + (w >> 1), z0]][doorSide];
  if (kind === 'smithy') { // open-sided forge: stone floor, cobble walls on 3 sides, slab roof, furnaces, chest
    for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) {
      hard(x, fy, z, B.COBBLESTONE); const edge = x === x0 || x === x0 + w - 1 || z === z0 || z === z0 + d - 1;
      const front = (doorSide === 0 && x === x0 + w - 1) || (doorSide === 1 && x === x0) || (doorSide === 2 && z === z0 + d - 1) || (doorSide === 3 && z === z0);
      const corner = (x === x0 || x === x0 + w - 1) && (z === z0 || z === z0 + d - 1);
      for (let y = fy + 1; y <= fy + 3; y++) hard(x, y, z, corner ? M.post : (edge && !front ? (y === fy + 2 && (x + z) % 3 === 0 ? B.GLASS : B.COBBLESTONE) : 0));
      hard(x, fy + 4, z, B.STONE_BRICKS);
    }
    const ix = x0 + 1, iz = z0 + 1; hard(ix, fy + 1, iz, B.FURNACE); hard(ix + 1, fy + 1, iz, [B.BLAST_FURNACE, B.GRINDSTONE, B.SMITHING_TABLE][r() * 3 | 0]); hard(ix + 2, fy + 1, iz, B.CRAFTING_TABLE);
    const cx = x0 + w - 2, cz = z0 + 1; hard(cx, fy + 1, cz, B.CHEST); world.chestLoot.set(cx + ',' + (fy + 1) + ',' + cz, 'smithy');
    hard(x0 + (w >> 1), fy + 4, z0 + (d >> 1), B.GLOWSTONE); hard(x0 + 1, fy + 1, z0 + d - 2, B.MAGMA_BLOCK);
    S.mobs.push(['villager', door[0] + 0.5, fy + 1, door[1] + 0.5]); return;
  }
  if (kind === 'temple') { // tall stone-brick chapel with a glowing top
    for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) {
      hard(x, fy, z, B.STONE_BRICKS); const edge = x === x0 || x === x0 + w - 1 || z === z0 || z === z0 + d - 1;
      for (let y = fy + 1; y <= fy + 9; y++) { let id = edge ? B.STONE_BRICKS : 0; if (edge && (y === fy + 3 || y === fy + 7) && !((x === x0 || x === x0 + w - 1) && (z === z0 || z === z0 + d - 1)) && (x + z) % 2) id = B.GLASS; hard(x, y, z, id); }
      hard(x, fy + 10, z, B.STONE_BRICKS);
    }
    for (let y = fy + 11; y <= fy + 13; y++) hard(x0 + (w >> 1), y, z0 + (d >> 1), y === fy + 13 ? B.GLOWSTONE : B.STONE_BRICKS);
    hard(door[0], fy + 1, door[1], 0); hard(door[0], fy + 2, door[1], 0);
    hard(x0 + (w >> 1), fy + 1, z0 + (d >> 1), B.BREWING_STAND); hard(x0 + (w >> 1), fy + 9, z0 + (d >> 1), B.GLOWSTONE);
    S.mobs.push(['villager', x0 + (w >> 1) + 0.5, fy + 1, z0 + 1.5]); return;
  }
}
function villageFarm(S, g, x0, z0, x1, z1, hard, M, r, world, alongX) {
  const { fy, rough } = padHeight(g, x0, z0, x1, z1); if (rough > 4 || fy < SEA) return false;
  const cr = r(), crop = cr < 0.5 ? 'WHEAT_' : cr < 0.75 ? 'CARROTS_' : 'POTATOES_';
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    groundFill(g, x, z, fy, hard, B.DIRT); for (let y = fy + 1; y <= fy + 4; y++) hard(x, y, z, 0);
    const edge = x === x0 || x === x1 || z === z0 || z === z1; const mid = alongX ? z === ((z0 + z1) >> 1) : x === ((x0 + x1) >> 1);
    if (edge) hard(x, fy, z, M.log); else if (mid) hard(x, fy, z, B.WATER); else { hard(x, fy, z, B.FARMLAND); hard(x, fy + 1, z, B[crop + Math.min(3, Math.floor(r() * 5))]); }
  }
  hard(x0, fy + 1, z0, B.HAY_BLOCK); hard(x1, fy + 1, z1, B.COMPOSTER);
  S.mobs.push(['villager', x0 + 1.5, fy + 1, z0 + 1.5]); return true;
}
function villagePen(S, g, x0, z0, x1, z1, hard, M, r) {
  const { fy, rough } = padHeight(g, x0, z0, x1, z1); if (rough > 3 || fy < SEA) return false;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    groundFill(g, x, z, fy, hard, B.DIRT); hard(x, fy, z, M.ground); for (let y = fy + 1; y <= fy + 4; y++) hard(x, y, z, 0);
    if (x === x0 || x === x1 || z === z0 || z === z1) { hard(x, fy + 1, z, M.log); if ((x + z) % 2 === 0) hard(x, fy + 2, z, M.log); }
  }
  hard(x0 + 1, fy + 1, z0 + 1, B.HAY_BLOCK); if (r() < 0.6) hard(x1 - 1, fy + 1, z0 + 1, B.LOOM);
  const kinds = M.ground === B.SAND ? ['chicken'] : ['cow', 'sheep', 'pig', 'chicken']; const k = kinds[Math.floor(r() * kinds.length)];
  for (let i = 0; i < 3; i++) S.mobs.push([k, x0 + 2.5 + i, fy + 1, z0 + 3.5]);
  return true;
}
function villageChunk(S, g, cx, cz, vs, hard, r, world) {
  const bx = cx * 16, bz = cz * 16, dx = cx - vs.cx, dz = cz - vs.cz; const vh = vs.seed >>> 0; const M = villageMats(vs.col.b, vh);
  const here = g.column(bx + 8, bz + 8); if (here.b === BIO.OCEAN && !(dx === 0 || dz === 0)) return;
  if (dx === 0 && dz === 0) { // plaza: well, roads to all four sides, lamps
    for (let i = 0; i < 16; i++) for (const o of [7, 8]) { roadCell(g, bx + i, bz + o, hard, M); roadCell(g, bx + o, bz + i, hard, M); }
    for (let x = bx + 3; x <= bx + 12; x++) for (let z = bz + 3; z <= bz + 12; z++) roadCell(g, x, z, hard, M);
    buildWell(S, g, bx + 6, bz + 6, hard, Object.assign({}, M, { roof: M.roof }));
    for (const [x, z] of [[bx + 2, bz + 2], [bx + 13, bz + 13], [bx + 2, bz + 13], [bx + 13, bz + 2]]) lampPost(g, x, z, hard, M);
    S.kinds.push(['village', bx + 8, bz + 8]); { const gx = bx + 4, gz = bz + 10, gh = g.column(gx, gz).h; if (gh > SEA) S.mobs.push(['iron_golem', gx + 0.5, gh, gz + 0.5]); } return; // one iron golem guards each new village
  }
  const arm = (dx === 0) !== (dz === 0);
  if (arm) {
    const alongX = dz === 0; // road runs along x
    for (let i = 0; i < 16; i++) for (const o of [7, 8]) alongX ? roadCell(g, bx + i, bz + o, hard, M) : roadCell(g, bx + o, bz + i, hard, M);
    const dist = Math.max(Math.abs(dx), Math.abs(dz));
    const templeHere = dist === 1 && ((vh >> 7) & 3) === [dx > 0, dx < 0, dz > 0, dz < 0].indexOf(true);
    for (const side of [0, 1]) {
      // side 0: lower coordinate (north/west), door faces the road
      const pick = r(); const big = pick < 0.45;
      const types = templeHere && side === 0 ? ['temple'] : big ? [pick < 0.12 ? 'library' : pick < 0.24 ? 'smithy' : 'house'] : ['house', r() < 0.3 ? 'farmhouse' : 'house'];
      types.forEach((kind, k) => {
        const w = kind === 'temple' ? 5 : types.length === 1 ? 7 : 5, d = 5;
        const along0 = types.length === 1 ? 4 + (kind === 'temple' ? 1 : 0) : (k === 0 ? 1 : 9);
        if (r() < 0.12 && dist === 2) return; // a few empty lots at the village edge
        if (alongX) { const z0 = side === 0 ? bz + 1 : bz + 10; villageBuilding(S, g, kind, bx + along0, z0, w, d, side === 0 ? 2 : 3, hard, M, r, world); }
        else { const x0 = side === 0 ? bx + 1 : bx + 10; villageBuilding(S, g, kind, x0, bz + along0, d, w, side === 0 ? 0 : 1, hard, M, r, world); }
      });
    }
    if (alongX) { lampPost(g, bx, bz + 6, hard, M); lampPost(g, bx + 15, bz + 9, hard, M); } else { lampPost(g, bx + 6, bz, hard, M); lampPost(g, bx + 9, bz + 15, hard, M); }
    return;
  }
  // back lots: farms, pens, houses
  if (Math.max(Math.abs(dx), Math.abs(dz)) > 2) return;
  const q = r();
  if (q < 0.5) { if (r() < 0.5) { villageFarm(S, g, bx + 2, bz + 2, bx + 8, bz + 13, hard, M, r, world, false); villageFarm(S, g, bx + 9, bz + 2, bx + 14, bz + 13, hard, M, r, world, false); } else villageFarm(S, g, bx + 2, bz + 3, bx + 13, bz + 12, hard, M, r, world, true); }
  else if (q < 0.7) villagePen(S, g, bx + 4, bz + 4, bx + 11, bz + 11, hard, M, r);
  else if (q < 0.95) { const door = Math.abs(dx) >= Math.abs(dz) ? (dx > 0 ? 1 : 0) : (dz > 0 ? 3 : 2); villageBuilding(S, g, 'house', bx + 5, bz + 5, 5 + (r() < 0.5 ? 2 : 0), 5, door, hard, M, r, world); }
}

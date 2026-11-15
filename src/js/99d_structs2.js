// ================= STRUCTURES CLOSER TO MINECRAFT =================
// ---- desert pyramid: a sandstone temple with two front towers, an orange and blue terracotta star in the hall floor,
// and the hidden treasure room under it (four chests in side alcoves, a pressure plate on nine TNT) ----
buildPyramid = function (S, g, cx, cz, hard, r, world) {
  const by = g.column(cx, cz).h; const SS = B.SANDSTONE, CUT = B.CUT_SANDSTONE, CH = B.CHISELED_SANDSTONE, OR = B.ORANGE_TERRACOTTA, BLU = B.BLUE_TERRACOTTA, SM = B.SMOOTH_SANDSTONE;
  const stair = (f) => famId('sandstone_stairs', { facing: f, half: 'bottom', wl: 0 }) || SS; const slab = famId('sandstone_slab', { type: 'bottom', wl: 0 }) || SS;
  const x0 = cx - 10, x1 = cx + 10, z0 = cz - 10, z1 = cz + 10; // front faces +z
  // clear the site and fill the ground under it
  for (let x = x0 - 1; x <= x1 + 1; x++) for (let z = z0 - 1; z <= z1 + 3; z++) { groundFill(g, x, z, by, hard, SS); for (let y = by; y < by + 20; y++) hard(x, y, z, 0); }
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) hard(x, by - 1, z, SS);
  // main body: z0..cz+5, walls 9 high, hall inside
  const bz1 = cz + 5;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= bz1; z++) for (let y = by; y <= by + 9; y++) {
    const wall = x === x0 || x === x1 || z === z0 || z === bz1; const roof = y === by + 9; const floor = y === by;
    if (floor || roof) { hard(x, y, z, floor ? SS : (x + z) & 1 ? SS : CUT); continue; }
    if (wall) { const band = y === by + 4 || y === by + 7; hard(x, y, z, band ? ((x + z) % 4 === 0 ? OR : CUT) : SS); }
  }
  // stepped pyramid roof over the hall
  for (let k = 1; k <= 4; k++) for (let x = x0 + 2 * k; x <= x1 - 2 * k; x++) for (let z = z0 + 2 * k; z <= bz1 - 2 * k + 1; z++) hard(x, by + 9 + k, z, k === 4 ? CUT : SS);
  // pillars in the hall
  for (const [dx, dz] of [[-5, -7], [5, -7], [-5, 2], [5, 2]]) for (let y = by + 1; y <= by + 8; y++) hard(cx + dx, y, cz + dz, y === by + 1 || y === by + 8 ? CH : CUT);
  // the floor star above the treasure room (center of the hall)
  const fx = cx, fz = cz - 3;
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) { const a = Math.abs(dx), b = Math.abs(dz);
    if (a === 0 && b === 0) hard(fx, by, fz, BLU); else if ((a === b && a <= 2) || (a + b === 3 && (a === 0 || b === 0)) || (a + b === 2 && a !== b)) hard(fx + dx, by, fz + dz, OR); }
  // front porch between the towers, with the doorway into the hall
  for (let x = cx - 5; x <= cx + 5; x++) for (let z = bz1 + 1; z <= z1; z++) for (let y = by; y <= by + 7; y++) {
    const edge = x === cx - 5 || x === cx + 5 || z === z1; if (y === by) { hard(x, y, z, SS); continue; } if (y === by + 7) { hard(x, y, z, (x + z) & 1 ? SS : CUT); continue; }
    if (edge) hard(x, y, z, (z === z1 && (y === by + 5) && Math.abs(x - cx) % 2 === 0) ? OR : SS); }
  for (let y = by + 1; y <= by + 3; y++) for (let x = cx - 1; x <= cx + 1; x++) { hard(x, y, z1, 0); hard(x, y, bz1, 0); } // door in, door through
  hard(cx, by + 4, z1, CH); hard(cx - 2, by + 4, z1, OR); hard(cx + 2, by + 4, z1, OR);
  for (let x = cx - 1; x <= cx + 1; x++) { hard(x, by, z1 + 1, stair(0)); hard(x, by - 1, z1 + 1, SS); } // steps up to the door
  // front towers: 5x5, taller than the body, terracotta bands and a cut sandstone crown
  for (const tx of [x0, x1 - 4]) {
    for (let x = tx; x <= tx + 4; x++) for (let z = z1 - 4; z <= z1; z++) for (let y = by; y <= by + 13; y++) {
      const edge = x === tx || x === tx + 4 || z === z1 - 4 || z === z1; const top = y === by + 13;
      if (y === by || top) { hard(x, y, z, top ? (edge ? CUT : SS) : SS); continue; }
      if (!edge) continue; const face = z === z1 || x === (tx === x0 ? x0 : x1);
      let id = SS; if (y === by + 10 || y === by + 12) id = CUT; else if (face && y === by + 11) id = (x + z) & 1 ? OR : CUT; else if (face && (y === by + 5 || y === by + 6) && ((x - tx === 2) || (z === z1 - 2))) id = y === by + 5 ? OR : BLU;
      hard(x, y, z, id); }
    // the slab cap and a doorway from the porch
    for (let x = tx + 1; x <= tx + 3; x++) for (let z = z1 - 3; z <= z1 - 1; z++) hard(x, by + 14, z, slab);
    const dx = tx === x0 ? tx + 4 : tx; hard(dx, by + 1, z1 - 2, 0); hard(dx, by + 2, z1 - 2, 0);
    for (let y = by + 1; y <= by + 12; y++) hard(tx + 2, y, z1 - 3, B.LADDER); }
  // treasure room: shaft under the blue terracotta, room at by-14..by-11, chests in alcoves, TNT under a pressure plate
  const ry = by - 14;
  for (let y = by - 1; y >= ry + 4; y--) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) hard(fx + dx, y, fz + dz, dx || dz ? SS : 0);
  for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) for (let y = ry - 2; y <= ry + 4; y++) {
    const inner = Math.abs(dx) <= 4 && Math.abs(dz) <= 4 && y >= ry && y <= ry + 3; const ceil = y === ry + 4;
    if (inner) hard(fx + dx, y, fz + dz, 0); else if (ceil && dx === 0 && dz === 0) hard(fx, y, fz, 0); else hard(fx + dx, y, fz + dz, (y === ry + 1 && (Math.abs(dx) === 5 || Math.abs(dz) === 5) && (dx + dz) % 2 === 0) ? OR : y === ry - 1 ? SS : CUT); }
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) hard(fx + dx, ry - 1, fz + dz, B.TNT);
  hard(fx, ry, fz, B.STONE_PRESSURE_PLATE); hard(fx, ry - 1, fz, B.TNT);
  for (const [dx, dz] of [[0, -5], [0, 5], [-5, 0], [5, 0]]) { const x = fx + dx, z = fz + dz; hard(x, ry, z, B.CHEST); hard(x, ry + 1, z, 0); world.chestLoot.set(x + ',' + ry + ',' + z, 'pyramid'); }
  for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) if ((Math.abs(dx) === 4 || Math.abs(dz) === 4) && (dx + dz) % 2 === 0) hard(fx + dx, ry - 1, fz + dz, OR);
};
// ---- village house roofs: a pitched (gable) roof of stairs over the long side, the gable ends filled with the wall
// material and a ridge on top, like Minecraft's village houses; desert houses keep a flat roof with a raised rim ----
const ROOF_STAIRS = () => ({ [B.PLANKS]: 'oak_stairs', [B.SPRUCE_PLANKS]: 'spruce_stairs', [B.SPRUCE_LOG]: 'spruce_stairs', [B.ACACIA_PLANKS]: 'acacia_stairs', [B.BRICK]: 'brick_stairs', [B.COBBLESTONE]: 'cobblestone_stairs', [B.STONE_BRICKS]: 'stone_brick_stairs', [B.DARK_OAK_PLANKS]: 'dark_oak_stairs', [B.BIRCH_PLANKS]: 'birch_stairs', [B.JUNGLE_PLANKS]: 'jungle_stairs' });
let ROOF_ST = null;
function houseRoof(x0, z0, w, d, fy, hard, M, doorSide) {
  const y0 = fy + 5;
  if (M.wall === B.SANDSTONE) { // desert: flat roof, smooth top, cut sandstone rim
    for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) { hard(x, y0, z, B.SMOOTH_SANDSTONE || B.SANDSTONE); if (x === x0 || z === z0 || x === x0 + w - 1 || z === z0 + d - 1) hard(x, y0 + 1, z, (x + z) & 1 ? B.CUT_SANDSTONE : B.SANDSTONE); }
    return; }
  if (!ROOF_ST) ROOF_ST = ROOF_STAIRS(); const fam = ROOF_ST[M.roof] || 'oak_stairs';
  const st = (f) => famId(fam, { facing: f, half: 'bottom', wl: 0 }) || M.roof; const topSlab = FAMILY[fam.replace('_stairs', '_slab')] ? famId(fam.replace('_stairs', '_slab'), { type: 'bottom', wl: 0 }) : M.roof;
  const alongX = w >= d; // the ridge runs along the longer side
  if (alongX) { for (let k = 0; ; k++) { const za = z0 - 1 + k, zb = z0 + d - k; if (za > zb) break; const y = y0 + k;
      for (let x = x0 - 1; x <= x0 + w; x++) { if (za === zb) { hard(x, y, za, topSlab); continue; } hard(x, y, za, st(2)); hard(x, y, zb, st(0)); }
      for (const gx of [x0, x0 + w - 1]) for (let z = za + 1; z < zb; z++) hard(gx, y, z, M.wall); } }
  else { for (let k = 0; ; k++) { const xa = x0 - 1 + k, xb = x0 + w - k; if (xa > xb) break; const y = y0 + k;
      for (let z = z0 - 1; z <= z0 + d; z++) { if (xa === xb) { hard(xa, y, z, topSlab); continue; } hard(xa, y, z, st(1)); hard(xb, y, z, st(3)); }
      for (const gz of [z0, z0 + d - 1]) for (let x = xa + 1; x < xb; x++) hard(x, y, gz, M.wall); } }
}
// ---- village lamp posts: a stone foot, a wooden fence post and a lantern on top (instead of a glowstone block) ----
lampPost = function (g, x, z, hard, M) { const h = g.column(x, z).h; if (h <= SEA) return;
  const wood = M.post === B.SPRUCE_LOG ? 'SPRUCE' : M.post === B.ACACIA_LOG ? 'ACACIA' : M.post === B.DARK_OAK_LOG ? 'DARK_OAK' : M.post === B.BIRCH_LOG ? 'BIRCH' : 'OAK';
  const fence = B[wood + '_FENCE'] || B.OAK_FENCE; hard(x, h, z, M.found); hard(x, h + 1, z, fence); hard(x, h + 2, z, fence); hard(x, h + 3, z, B.LANTERN); };

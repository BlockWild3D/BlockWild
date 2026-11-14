// ================= OCEAN LIFE AT RUN TIME =================
// Placing kelp, seagrass, coral and sea pickles (live ones only in still water; sea pickles stack up to 4; coral fans
// on a block's side become wall fans), kelp growing upward, coral dying out of water, and oceans filled in at world
// generation: seagrass and kelp forests in cooler oceans, coral reefs with fans and sea pickles in warm ones.
{ const _pb = placeBlock; placeBlock = function (hit, id) {
    const d = BL[id]; if (!d || !hit || !(d.kelp || d.support === 'floor' || d.coralBlock)) return _pb.apply(this, arguments);
    if (d.coralBlock) return _pb.apply(this, arguments);
    if (d.pickles) { const hd = BL[hit.id]; if (hd && hd.pickles && hd.pickles < 4) { world.set(hit.x, hit.y, hit.z, B[('sea_pickle#' + (hd.pickles + 1)).toUpperCase()]); Sfx.play('grass', 1, 1.2); return true; } }
    let x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz; const cur = world.get(x, y, z);
    const live = !d.dead; if (live && cur !== B.WATER) return false; if (cur && cur !== B.WATER && !PLANT[cur]) return false;
    // a coral fan clicked on the side of a block becomes a wall fan
    if (d.wallFan !== undefined && hit.ny === 0) { const f = hit.nz < 0 ? 0 : hit.nx > 0 ? 1 : hit.nz > 0 ? 2 : 3; const wid = d.wallFan + f; if (!shapeSupported(x, y, z, wid)) return false; world.set(x, y, z, wid); Sfx.play('grass', 1, 0.9); return true; }
    if (!shapeSupported(x, y, z, id)) return false;
    let pid = id; if (d.kelp && BL[world.get(x, y - 1, z)] && BL[world.get(x, y - 1, z)].kelp) world.set(x, y - 1, z, B.KELP_PLANT);
    world.set(x, y, z, pid);
    Sfx.play('grass', 1, 0.9); return true; }; }
// random ticks: kelp grows, coral blocks die out of water
function oceanTick(x, y, z, id) { const d = BL[id];
  if (id === B.KELP && Math.random() < 0.14 && world.get(x, y + 1, z) === B.WATER) { let n = 0; for (let yy = y; yy > y - 26 && BL[world.get(x, yy, z)].kelp; yy--) n++; if (n < 25) { world.set(x, y, z, B.KELP_PLANT); world.set(x, y + 1, z, B.KELP); } return; }
  if (d.coralBlock && !d.dead) { const wet = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].some(([a, b, c]) => FKIND[world.get(x + a, y + b, z + c)] === 1); if (!wet) world.set(x, y, z, B[('dead_' + d.coralBlock + '_coral_block').toUpperCase()]); }
}
// ---- oceans at world generation ----
{ const _dec = decorate; decorate = function (world, S, cx, cz) {
    const r0 = _dec.apply(this, arguments); if (world.dim !== 'overworld') return r0; const g = world.gen, seed = world.seed; const r = mulberry32(ihash(cx, cz, 8831, seed)); const bx = cx * 16, bz = cz * 16;
    const c0 = g.column(bx + 8, bz + 8); if (c0.b !== BIO.OCEAN || c0.h > SEA - 3) return r0;
    const soft = (x, y, z, id) => { if (y > 0 && y < WH) S.soft.push(x, y, z, id); }, hard = (x, y, z, id) => { if (y > 0 && y < WH) S.hard.push(x, y, z, id); };
    const warm = g.nT.f2((bx + 8) / 560, (bz + 8) / 560, 2) > 0.12 && c0.h > SEA - 22;
    const water = (x, y, z) => y <= SEA; const corals = CORALDATA().map(c => c[0]);
    for (let i = 0; i < (warm ? 10 : 24); i++) { const x = bx + (r() * 16 | 0), z = bz + (r() * 16 | 0); const col = g.column(x, z); if (col.h > SEA - 2) continue; const y = col.h;
      if (warm && i < 6) { // a coral patch: blocks, with corals, fans and pickles on top
        const k = corals[r() * 5 | 0]; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { if (r() < 0.3) continue; const xx = x + a, zz = z + b; const cc = g.column(xx, zz); if (cc.h > SEA - 2) continue; const h = 1 + (r() * 3 | 0);
          for (let j = 0; j < h; j++) hard(xx, cc.h + j, zz, B[(k + '_coral_block').toUpperCase()]); const top = cc.h + h; if (top >= SEA) continue; const q = r();
          if (q < 0.35) soft(xx, top, zz, B[(corals[r() * 5 | 0] + '_coral').toUpperCase()]); else if (q < 0.65) soft(xx, top, zz, B[(corals[r() * 5 | 0] + '_coral_fan').toUpperCase()]); else if (q < 0.75) soft(xx, top, zz, B[('sea_pickle' + (r() < 0.5 ? '' : '#' + (2 + (r() * 3 | 0)))).toUpperCase()]); }
        continue; }
      if (!warm && r() < 0.45) { const H = 3 + (r() * Math.min(20, SEA - y - 2) | 0); for (let j = 0; j < H && y + j < SEA - 1; j++) soft(x, y + j, z, j === H - 1 || y + j === SEA - 2 ? B.KELP : B.KELP_PLANT); }
      else soft(x, y, z, B.SEAGRASS); }
    return r0; }; }

// ================= CAVES AND PLANTS AT RUN TIME (Minecraft rules) =================
// Placing pointed dripstone (it tapers itself: tip, frustum, middle, base), glow lichen on any face, amethyst buds
// on any face, snow layers (stack to 8), bamboo, cocoa on jungle logs, sweet berry bushes (planted from berries),
// vines and roots that hang from ceilings. Random ticks: budding amethyst grows buds, berry bushes, bamboo, cocoa,
// cave vines and twisting / weeping vines grow. Right-click picks berries and glow berries. Berry bushes slow and
// scratch you. World generation: lush caves, dripstone caves, amethyst geodes, snow on snowy ground, berry bushes in
// taiga, bamboo and cocoa in jungles, glow lichen in caves. Azaleas grow into azalea trees.
TREES.azalea = function (put, x, y, z, r) { const H = 4 + (r() * 2 | 0); put(x, y - 1, z, B.ROOTED_DIRT, true); for (let i = 0; i < H; i++) put(x, y + i, z, B.LOG, true);
  for (let yy = y + H - 2; yy <= y + H + 1; yy++) { const rr = yy > y + H ? 1 : 2; for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) { if (Math.abs(dx) === rr && Math.abs(dz) === rr && r() < 0.6) continue; put(x + dx, yy, z + dz, r() < 0.25 ? B.FLOWERING_AZALEA_LEAVES : B.AZALEA_LEAVES, false); } } };
TREES.flowering_azalea = TREES.azalea;
// ---- pointed dripstone tapers by how long its run is ----
function fixDrip(x, y, z) { const d = BL[world.get(x, y, z)]; if (!d || !d.drip) return; const dir = d.drip.dir; const step = dir === 'up' ? 1 : -1;
  let y0 = y; while (BL[world.get(x, y0 - step, z)] && BL[world.get(x, y0 - step, z)].drip && BL[world.get(x, y0 - step, z)].drip.dir === dir) y0 -= step; // the base end
  const cells = []; for (let yy = y0; BL[world.get(x, yy, z)] && BL[world.get(x, yy, z)].drip && BL[world.get(x, yy, z)].drip.dir === dir; yy += step) cells.push(yy);
  const n = cells.length; cells.forEach((yy, i) => { const fromTip = n - 1 - i; const th = fromTip === 0 ? 'tip' : fromTip === 1 ? 'frustum' : i === 0 && n > 3 ? 'base' : 'middle'; const id = FAMILY.pointed_dripstone.ids[dir + ',' + th]; if (world.get(x, yy, z) !== id) world.set(x, yy, z, id); }); }
const dirFromNormal = (nx, ny, nz) => ny > 0 ? 0 : ny < 0 ? 1 : nz < 0 ? 2 : nz > 0 ? 3 : nx < 0 ? 4 : 5;
{ const _pb = placeBlock; placeBlock = function (hit, id) {
    const d = BL[id]; if (!d || !hit) return _pb.apply(this, arguments);
    let x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz; const free = () => replaceableAt(x, y, z);
    const put = (pid) => { if (!free()) return false; if (!shapeSupported(x, y, z, pid)) return false; world.set(x, y, z, pid); Sfx.play(BL[pid].snd, 1, 0.8); if (MODS.hooks.blockPlace) modFire('blockPlace', { x, y, z, block: d.key }); return true; };
    if (d.drip) { if (!hit.ny) return false; const pid = FAMILY.pointed_dripstone.ids[(hit.ny > 0 ? 'up' : 'down') + ',tip']; const sup = world.get(x, y - (hit.ny > 0 ? 1 : -1), z); if (!(SOLID[sup] || BL[sup].drip)) return false; if (!free()) return false; world.set(x, y, z, pid); fixDrip(x, y, z); Sfx.play('stone', 1, 0.9); return true; }
    if (d.lichenBase !== undefined) { const f = hit.ny > 0 ? 0 : hit.ny < 0 ? 1 : hit.nz > 0 ? 4 : hit.nz < 0 ? 2 : hit.nx > 0 ? 3 : 5; return put(d.lichenBase + f); }
    if (d.budBase !== undefined) return put(d.budBase + dirFromNormal(hit.nx, hit.ny, hit.nz));
    if (d.layers) { const hd = BL[hit.id]; if (hd && hd.layers && hd.layers < 8 && (hit.ny > 0 || hd.layers)) { world.set(hit.x, hit.y, hit.z, hd.layers === 7 ? B.SNOW_BLOCK : hd.layerBase + hd.layers); Sfx.play('snow', 1, 0.8); return true; }
      const below = world.get(x, y - 1, z); if (!shSturdy(below, 'up') && !/leaves/.test(BL[below].key || '')) return false; return put(B.SNOW); }
    if (d.bamboo || d.key === 'twisting_vines' || d.key === 'weeping_vines' || d.key === 'hanging_roots' || d.key === 'spore_blossom' || /^cave_vines/.test(d.key) || d.dripleaf || d.berry !== undefined) {
      if (d.dripleaf || d.berry !== undefined) { const below = world.get(x, y - 1, z); if (![B.GRASS, B.DIRT, B.MOSS_BLOCK, B.CLAY, B.PODZOL, B.COARSE_DIRT, B.ROOTED_DIRT, B.MUD, B.FARMLAND].includes(below) && !(d.dripleaf && BL[below].dripleaf)) return false; }
      return put(id); }
    if (d.key === 'small_dripleaf') { const below = world.get(x, y - 1, z); if (![B.GRASS, B.DIRT, B.MOSS_BLOCK, B.CLAY, B.MUD].includes(below) || !replaceableAt(x, y + 1, z)) return false; world.set(x, y, z, id); world.set(x, y + 1, z, d.tallOther); return true; }
    return _pb.apply(this, arguments); }; }
// cocoa beans on a jungle log, sweet berries on dirt / grass plant their plants; berries and glow berries are picked
{ const _ua = useAction; useAction = function (eye, dir) {
    const h = player.held(); const hd = h && ITEMS[h.id];
    if (target && !targetMob && !isSpec()) { const { x, y, z } = target; const d = BL[target.id];
      if (h && h.id === IT.cocoa_beans && target.ny === 0 && /^jungle_log|^jungle_wood|^stripped_jungle/.test(d.key)) { const cx = x + target.nx, cz = z + target.nz; if (replaceableAt(cx, y, cz)) { const f = dirOf(-target.nx, -target.nz); world.set(cx, y, cz, B[(f ? 'cocoa#0_' + f : 'cocoa').toUpperCase()]); useHeld(1); Sfx.play('wood', 1, 1.1); S.swing = 1; mouseR = false; return; } }
      if (h && h.id === IT.sweet_berries && target.ny > 0 && [B.GRASS, B.DIRT, B.PODZOL, B.COARSE_DIRT, B.FARMLAND, B.MOSS_BLOCK].includes(target.id) && replaceableAt(x, y + 1, z)) { world.set(x, y + 1, z, B.SWEET_BERRY_BUSH); useHeld(1); Sfx.play('grass', 1); S.swing = 1; mouseR = false; return; }
      if (d.berry >= 2 && !(hd && hd.kind === 'bonemeal')) { dropItem(IT.sweet_berries, d.berry === 3 ? 2 + (Math.random() * 2 | 0) : 1 + (Math.random() * 2 | 0), x + 0.5, y + 0.6, z + 0.5); world.set(x, y, z, B['SWEET_BERRY_BUSH#1']); Sfx.play('grass', 1, 1.2); S.swing = 1; mouseR = false; return; }
      if (d.glowBerries && !(hd && hd.kind === 'bonemeal')) { dropItem(IT.glow_berries, 1, x + 0.5, y + 0.4, z + 0.5); world.set(x, y, z, B.CAVE_VINES); Sfx.play('grass', 1, 1.2); S.swing = 1; mouseR = false; return; }
      if (hd && hd.kind === 'bonemeal') { const fx = () => { useHeld(1); S.swing = 1; S.useCD = 0.2; Particles.emit(x + 0.5, y + 0.6, z + 0.5, 10, [[0.4, 0.9, 0.4]], 1.5, 0.8, -1, 0.8); mouseR = false; };
        if (d.berry !== undefined && d.berry < 3) { world.set(x, y, z, B['SWEET_BERRY_BUSH#' + (d.berry + 1)]); fx(); return; }
        if (target.id === B.CAVE_VINES) { world.set(x, y, z, B['CAVE_VINES#LIT']); fx(); return; }
        if (d.bamboo) { let top = y; while (world.get(x, top + 1, z) === B.BAMBOO) top++; if (!world.get(x, top + 1, z) && top - y < 15) { world.set(x, top + 1, z, B.BAMBOO); if (!world.get(x, top + 2, z) && Math.random() < 0.5) world.set(x, top + 2, z, B.BAMBOO); } fx(); return; }
        if (d.cocoa !== undefined && d.cocoa < 2) { world.set(x, y, z, B[('cocoa#' + (d.cocoa + 1) + '_' + d.facing).toUpperCase()]); fx(); return; }
        if (target.id === B.TWISTING_VINES || target.id === B.WEEPING_VINES) { const s = target.id === B.TWISTING_VINES ? 1 : -1; let yy = y; while (world.get(x, yy + s, z) === target.id) yy += s; for (let k = 1; k <= 1 + (Math.random() * 4 | 0); k++) { if (world.get(x, yy + s * k, z)) break; world.set(x, yy + s * k, z, target.id); } fx(); return; } }
    }
    return _ua.apply(this, arguments); }; }
// breaking pointed dripstone re-tapers what is left
{ const _bb = breakBlock; breakBlock = function (x, y, z) { const d = BL[world.get(x, y, z)]; const r = _bb.apply(this, arguments); if (d && d.drip) { fixDrip(x, y - 1, z); fixDrip(x, y + 1, z); } return r; }; }
// random ticks
function caveTick(x, y, z, id) { const d = BL[id]; const R = Math.random();
  if (id === B.BUDDING_AMETHYST) { if (R > 0.2) return; const f = Math.random() * 6 | 0; const n = [[0, 1, 0], [0, -1, 0], [0, 0, -1], [0, 0, 1], [-1, 0, 0], [1, 0, 0]][f]; const X = x + n[0], Y = y + n[1], Z = z + n[2]; const cur = world.get(X, Y, Z);
    if (!cur || cur === B.WATER) world.set(X, Y, Z, B.SMALL_AMETHYST_BUD + f); else { const cd = BL[cur]; if (cd.bud && cd.bud < 4 && cd.crossDir === f) world.set(X, Y, Z, B[['', 'MEDIUM_AMETHYST_BUD', 'LARGE_AMETHYST_BUD', 'AMETHYST_CLUSTER'][cd.bud]] + f); } return; }
  if (d.berry !== undefined && d.berry < 3 && R < 0.2 && world.lightAt(x + 0.5, y + 0.5, z + 0.5, 1) > 0.55) { world.set(x, y, z, B['SWEET_BERRY_BUSH#' + (d.berry + 1)]); return; }
  if (d.bamboo && R < 0.3 && !world.get(x, y + 1, z)) { let h = 1; while (world.get(x, y - h, z) === B.BAMBOO) h++; if (h < 12 + ((x * 7 + z * 13) & 3)) world.set(x, y + 1, z, B.BAMBOO); return; }
  if (d.cocoa !== undefined && d.cocoa < 2 && R < 0.2) { world.set(x, y, z, B[('cocoa#' + (d.cocoa + 1) + '_' + d.facing).toUpperCase()]); return; }
  if (id === B.CAVE_VINES && R < 0.1) { if (!world.get(x, y - 1, z) && Math.random() < 0.5) world.set(x, y - 1, z, B.CAVE_VINES); else world.set(x, y, z, B['CAVE_VINES#LIT']); return; }
  if ((id === B.TWISTING_VINES || id === B.WEEPING_VINES) && R < 0.1) { const s = id === B.TWISTING_VINES ? 1 : -1; if (!world.get(x, y + s, z)) world.set(x, y + s, z, id); }
}
// berry bushes slow you and scratch you while you move through them
{ const _up = updatePlayer; let scratchT = 0; updatePlayer = function (dt) { const r = _up.apply(this, arguments);
    if (!player || player.dead) return r; const d = BL[world.get(Math.floor(player.pos.x), Math.floor(player.pos.y + 0.2), Math.floor(player.pos.z))];
    if (d && d.berry !== undefined && d.berry > 0) { player.vel.x *= 0.8; player.vel.z *= 0.8; if (player.vel.y > 0) player.vel.y *= 0.75; scratchT -= dt; const moving = Math.hypot(player.vel.x, player.vel.z) > 0.3; if (moving && scratchT <= 0 && isSurv()) { scratchT = 0.5; player.hurt(1, null, 'a sweet berry bush'); } }
    else if (d && d.powder) { player.vel.x *= 0.9; player.vel.z *= 0.9; if (player.vel.y < -1.5) player.vel.y = -1.5; }
    return r; }; }

// ---- world generation ----
{ const _dec = decorate; decorate = function (world, S, cx, cz) {
    const r0 = _dec.apply(this, arguments); if (world.dim !== 'overworld') return r0; const g = world.gen, seed = world.seed; const r = mulberry32(ihash(cx, cz, 9157, seed)); const bx = cx * 16, bz = cz * 16;
    const soft = (x, y, z, id) => { if (y > 0 && y < WH) S.soft.push(x, y, z, id); }, hard = (x, y, z, id) => { if (y > 0 && y < WH) S.hard.push(x, y, z, id); };
    const b0 = g.column(bx + 8, bz + 8).b;
    // snow on snowy ground, berry bushes in taiga, bamboo and cocoa in jungles
    if (b0 === BIO.SNOWY || b0 === BIO.TAIGA && g.nT.f2((bx + 8) / 560, (bz + 8) / 560, 2) < -0.2) for (let lx = 0; lx < 16; lx++) for (let lz = 0; lz < 16; lz++) { const x = bx + lx, z = bz + lz; const col = g.column(x, z); if (col.h > SEA && rnd01(x, col.h, z, seed + 31) < 0.85) soft(x, col.h, z, B.SNOW); }
    if (b0 === BIO.TAIGA && r() < 0.2) for (let i = 0; i < 4; i++) { const x = bx + (r() * 16 | 0), z = bz + (r() * 16 | 0); const col = g.column(x, z); if (col.h > SEA) soft(x, col.h, z, B['SWEET_BERRY_BUSH#' + (2 + (r() * 2 | 0))] || B.SWEET_BERRY_BUSH); }
    if (b0 === BIO.JUNGLE && r() < 0.35) { const cx0 = bx + (r() * 16 | 0), cz0 = bz + (r() * 16 | 0); for (let i = 0; i < 12; i++) { const x = cx0 + ((r() * 7 | 0) - 3), z = cz0 + ((r() * 7 | 0) - 3); const col = g.column(x, z); if (col.h <= SEA) continue; const H = 4 + (r() * 10 | 0); for (let k = 0; k < H; k++) soft(x, col.h + k, z, B.BAMBOO); if (r() < 0.4) soft(x + 1, col.h, z, B.PODZOL); } }
    // caves: lush caves and dripstone caves by region; glow lichen anywhere dark
    const lush = g.nW.f2(bx / 900 + 13, bz / 900 - 9, 2) > 0.2, drip = !lush && g.nT.f2(bx / 900 - 21, bz / 900 + 5, 2) > 0.22;
    const tries = lush || drip ? 60 : 10;
    for (let a = 0; a < tries; a++) { const x = bx + (r() * 16 | 0), z = bz + (r() * 16 | 0); const col = g.column(x, z); const y = YOFF - 50 + (r() * Math.max(1, col.h - YOFF + 40) | 0); if (y >= col.h - 6 || !g.cave(x, y, z)) continue;
      const floor = !g.cave(x, y - 1, z), ceil = !g.cave(x, y + 1, z);
      if (lush) { if (floor) { hard(x, y - 1, z, r() < 0.12 ? B.CLAY : B.MOSS_BLOCK); const q = r(); soft(x, y, z, q < 0.25 ? B.MOSS_CARPET : q < 0.4 ? B.TALL_GRASS : q < 0.46 ? B.AZALEA : q < 0.5 ? B.FLOWERING_AZALEA : q < 0.53 ? B.BIG_DRIPLEAF : 0); }
        else if (ceil) { hard(x, y + 1, z, B.MOSS_BLOCK); const q = r(); if (q < 0.6) { const L = 1 + (r() * 7 | 0); for (let k = 0; k < L && g.cave(x, y - k, z); k++) soft(x, y - k, z, r() < 0.11 ? B['CAVE_VINES#LIT'] : B.CAVE_VINES); } else if (q < 0.75) soft(x, y, z, B.HANGING_ROOTS); else if (q < 0.79) soft(x, y, z, B.SPORE_BLOSSOM); } }
      else if (drip) { if (floor || ceil) { const up = floor; hard(x, up ? y - 1 : y + 1, z, B.DRIPSTONE_BLOCK); if (r() < 0.5) { const L = 1 + (r() * 4 | 0); const ids = FAMILY.pointed_dripstone.ids; const dir = up ? 'up' : 'down'; for (let k = 0; k < L; k++) { const yy = up ? y + k : y - k; if (!g.cave(x, yy, z)) break; const fromTip = L - 1 - k; soft(x, yy, z, ids[dir + ',' + (fromTip === 0 ? 'tip' : fromTip === 1 ? 'frustum' : k === 0 && L > 3 ? 'base' : 'middle')]); } } } }
      else if (ceil && r() < 0.35) soft(x, y, z, B['GLOW_LICHEN#1']); else if (floor && r() < 0.2) soft(x, y, z, B.GLOW_LICHEN);
    }
    // amethyst geodes: about one in 24 chunks, deep underground
    if (r() < 1 / 24) { const x0 = bx + 4 + (r() * 8 | 0), z0 = bz + 4 + (r() * 8 | 0), y0 = YOFF - 50 + (r() * 76 | 0); const R = 4 + r() * 1.5;
      for (let dx = -7; dx <= 7; dx++) for (let dy = -7; dy <= 7; dy++) for (let dz = -7; dz <= 7; dz++) { const d = Math.hypot(dx, dy * 1.1, dz); const X = x0 + dx, Y = y0 + dy, Z = z0 + dz; if (Y < 2) continue;
        if (d < R - 1.5) S.hard.push(X, Y, Z, 0); else if (d < R - 0.5) hard(X, Y, Z, r() < 0.083 ? B.BUDDING_AMETHYST : B.AMETHYST_BLOCK); else if (d < R + 0.5) hard(X, Y, Z, B.CALCITE); else if (d < R + 1.4) hard(X, Y, Z, B.SMOOTH_BASALT); }
      for (let k = 0; k < 40; k++) { const dx = (r() * 9 | 0) - 4, dy = (r() * 9 | 0) - 4, dz = (r() * 9 | 0) - 4; const d = Math.hypot(dx, dy * 1.1, dz); if (d > R - 1.6 && d < R - 1.4 + 0.01 || (d < R - 1.5 && d > R - 2.6)) { const f = Math.abs(dy) >= Math.max(Math.abs(dx), Math.abs(dz)) ? (dy < 0 ? 0 : 1) : Math.abs(dx) > Math.abs(dz) ? (dx < 0 ? 5 : 4) : (dz < 0 ? 3 : 2); S.hard.push(x0 + dx, y0 + dy, z0 + dz, [B.SMALL_AMETHYST_BUD, B.MEDIUM_AMETHYST_BUD, B.LARGE_AMETHYST_BUD, B.AMETHYST_CLUSTER][r() * 4 | 0] + f); } } }
    return r0; }; }

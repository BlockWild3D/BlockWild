// ================= NATURE AT RUN TIME (Minecraft rules) =================
// Planting flowers, ferns and two-block plants on grass, dirt, podzol, moss and the like; mushrooms on any block in dim
// light (any light on mycelium and podzol). Two-block plants break as a pair. Stems grow 8 stages and then grow a
// pumpkin or melon on a free dirt / grass / farmland block next to them. Shears carve pumpkins (and drop 4 seeds).
// Bone meal: flowers on grass by biome, short grass -> tall grass, fern -> large fern, a tall flower drops a copy, a
// mushroom grows into a huge mushroom. Mushrooms slowly spread in the dark. World generation: biome flowers, ferns,
// two-block plants, pumpkin and melon patches, mushrooms and huge mushrooms in dark forests.
const GROW_SOIL = () => [B.GRASS, B.DIRT, B.SNOWY_GRASS, B.COARSE_DIRT, B.PODZOL, B.ROOTED_DIRT, B.MOSS_BLOCK, B.MYCELIUM, B.FARMLAND, B.MUD, B.PALE_MOSS_BLOCK, B.MUDDY_MANGROVE_ROOTS];
const BIOME_FLOWERS = () => ({
  [BIO.PLAINS]: ['dandelion', 'rose', 'oxeye_daisy', 'azure_bluet', 'cornflower', 'red_tulip', 'orange_tulip', 'white_tulip', 'pink_tulip'],
  [BIO.FOREST]: ['dandelion', 'rose', 'lily_of_the_valley', 'allium', 'oxeye_daisy'], [BIO.SWAMP]: ['blue_orchid'], [BIO.MANGROVE_SWAMP]: ['blue_orchid'],
  [BIO.TAIGA]: ['dandelion', 'rose'], [BIO.SAVANNA]: ['dandelion', 'rose'], [BIO.JUNGLE]: ['dandelion', 'rose'], [BIO.DARK_FOREST]: ['dandelion', 'rose', 'lily_of_the_valley'],
  [BIO.CHERRY_GROVE]: ['pink_petals'], [BIO.MOUNTAINS]: ['dandelion', 'rose', 'azure_bluet', 'allium'],
});
function plantSoilOk(id, below, x, y, z) { const d = BL[id];
  if (d.mushroom) return below === B.MYCELIUM || below === B.PODZOL || (OPAQUE[below] && SOLID[below] && world.lightAt(x + 0.5, y + 0.5, z + 0.5, 1) < 0.85);
  if (id === B.WITHER_ROSE && (below === B.NETHERRACK || below === B.SOUL_SAND || below === B.SOUL_SOIL)) return true;
  return GROW_SOIL().includes(below); }
{ const _pb = placeBlock; placeBlock = function (hit, id) {
    const d = BL[id]; if (!d || !hit || !(d.plant && (d.mushroom || d.tallLower || FLOWERDATA().some(f => f[0] === d.key) || d.key === 'fern' || d.sapling))) return _pb.apply(this, arguments);
    if (d.sapling && [B.GRASS, B.DIRT, B.SNOWY_GRASS].includes(world.get(hit.x + hit.nx, hit.y + hit.ny - 1, hit.z + hit.nz))) return _pb.apply(this, arguments);
    let x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz; if (PLANT[hit.id]) { x = hit.x; y = hit.y; z = hit.z; }
    if (!replaceableAt(x, y, z) || !plantSoilOk(id, world.get(x, y - 1, z), x, y, z)) return false;
    if (d.tallLower && (y + 1 >= WH || !replaceableAt(x, y + 1, z))) return false;
    world.set(x, y, z, id); if (d.tallLower) world.set(x, y + 1, z, d.tallOther); Sfx.play('grass', 1, 0.8); if (MODS.hooks.blockPlace) modFire('blockPlace', { x, y, z, block: d.key }); return true; }; }
// two-block plants: breaking the top takes the bottom (the bottom's own break takes the top through the plant check)
{ const _bb = breakBlock; breakBlock = function (x, y, z) { const id = world.get(x, y, z); const d = BL[id]; const r = _bb.apply(this, arguments);
    if (d && d.tallUpper && world.get(x, y - 1, z) === d.tallOther) world.set(x, y - 1, z, 0); return r; }; }

// ---- random ticks: stems, mushrooms ----
function natureTick(x, y, z, id) {
  const d = BL[id];
  if (d.stem !== undefined) { if (world.get(x, y - 1, z) !== B.FARMLAND || world.lightAt(x + 0.5, y + 0.5, z + 0.5, 1) < 0.55) return;
    if (d.stem < 7) { if (Math.random() < 0.5) world.set(x, y, z, B[(d.stemFruit + '_stem_' + (d.stem + 1)).toUpperCase()]); return; }
    const fruitId = d.stemFruit === 'pumpkin' ? B.PUMPKIN : B.MELON; if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, c]) => world.get(x + a, y, z + c) === fruitId)) return; // one fruit at a time, like an attached stem
    if (Math.random() < 0.35) { const [a, c] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.random() * 4 | 0]; const fx = x + a, fz = z + c;
      if (!world.get(fx, y, fz) && [B.DIRT, B.GRASS, B.FARMLAND, B.COARSE_DIRT, B.PODZOL, B.MOSS_BLOCK].includes(world.get(fx, y - 1, fz))) world.set(fx, y, fz, d.stemFruit === 'pumpkin' ? B.PUMPKIN : B.MELON); } return; }
  if (d.mushroom && Math.random() < 0.04) { // spread to a nearby dim spot (at most 5 in a 9x3x9 area)
    let n = 0; for (let a = -4; a <= 4; a++) for (let b = -1; b <= 1; b++) for (let c = -4; c <= 4; c++) if (world.get(x + a, y + b, z + c) === id) n++; if (n >= 5) return;
    const nx = x + (Math.random() * 3 | 0) - 1, ny = y + (Math.random() * 2 | 0) - (Math.random() * 2 | 0), nz = z + (Math.random() * 3 | 0) - 1;
    if (!world.get(nx, ny, nz) && plantSoilOk(id, world.get(nx, ny - 1, nz), nx, ny, nz)) world.set(nx, ny, nz, id); }
}
// huge mushrooms
function hugeMushroom(x, y, z, red, put) {
  const H = 4 + (Math.random() * 3 | 0) + (Math.random() < 0.08 ? 4 : 0); for (let i = 0; i < H; i++) put(x, y + i, z, B.MUSHROOM_STEM, true);
  if (red) { for (let yy = y + H - 3; yy <= y + H; yy++) { const top = yy === y + H; const rr = top ? 1 : 2; for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) { if (!top && Math.abs(dx) < rr && Math.abs(dz) < rr) continue; if (top || !(Math.abs(dx) === rr && Math.abs(dz) === rr)) put(x + dx, yy, z + dz, B.RED_MUSHROOM_BLOCK, false); } } }
  else for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) { if (Math.abs(dx) === 3 && Math.abs(dz) === 3) continue; put(x + dx, y + H, z + dz, B.BROWN_MUSHROOM_BLOCK, false); }
}
{ const _fu = farmUse; farmUse = function (h, hd) {
    if (hd && target && !targetMob) { const id = target.id; const d = BL[id]; const { x, y, z } = target;
      const fx = () => { useHeld(1); S.swing = 1; S.useCD = 0.2; Particles.emit(x + 0.5, y + 0.6, z + 0.5, 10, [[0.4, 0.9, 0.4], [0.7, 1, 0.6]], 1.5, 0.8, -1, 0.8); };
      if (hd.kind === 'bonemeal' && d) {
        if (id === B.TALL_GRASS || id === B.FERN) { if (!world.get(x, y + 1, z)) { const t = id === B.FERN ? B.LARGE_FERN : B.DOUBLE_TALL_GRASS; world.set(x, y, z, t); world.set(x, y + 1, z, BL[t].tallOther); } fx(); return true; }
        if (d.tallLower || d.tallUpper) { const k = d.tallLower ? d.key : BL[d.tallOther].key; if (!/grass|fern/.test(k)) dropItem(IT[k], 1, x + 0.5, y + 0.5, z + 0.5); fx(); return true; }
        if (d.mushroom) { if (Math.random() < 0.4) { const cells = []; let ok = true; hugeMushroom(x, y, z, id === B.RED_MUSHROOM, (a, b, c, bid, stem) => { const cur = world.get(a, b, c); if (cur && !(a === x && b === y && c === z) && !PLANT[cur] && !/leaves/.test(BL[cur].key)) { if (stem) ok = false; return; } cells.push([a, b, c, bid]); }); if (ok) for (const [a, b, c, bid] of cells) world.set(a, b, c, bid); } fx(); return true; }
        if (d.stem !== undefined && d.stem < 7) { world.set(x, y, z, B[(d.stemFruit + '_stem_' + Math.min(7, d.stem + 2 + (Math.random() * 3 | 0))).toUpperCase()]); fx(); return true; }
        if (id === B.GRASS && !world.get(x, y + 1, z)) { // a patch of grass and this biome's flowers
          const fl = BIOME_FLOWERS()[world.gen ? world.gen.column(x, z).b : 0] || ['dandelion', 'rose'];
          for (let k = 0; k < 24; k++) { const a = x + Math.round((Math.random() - 0.5) * 7), c = z + Math.round((Math.random() - 0.5) * 7); for (let dy = 1; dy >= -1; dy--) { const yy = y + dy; if (world.get(a, yy, c) === B.GRASS && !world.get(a, yy + 1, c)) { world.set(a, yy + 1, c, Math.random() < 0.12 ? B[fl[Math.random() * fl.length | 0].toUpperCase()] : B.TALL_GRASS); break; } } }
          fx(); return true; }
        if (id === B.MOSS_BLOCK) { for (let k = 0; k < 30; k++) { const a = x + Math.round((Math.random() - 0.5) * 6), c = z + Math.round((Math.random() - 0.5) * 6); for (let dy = 1; dy >= -2; dy--) { const yy = y + dy; const g = world.get(a, yy, c); if ([B.STONE, B.DIRT, B.GRASS, B.DEEPSLATE, B.TUFF, B.GRANITE, B.DIORITE, B.ANDESITE].includes(g) && !world.get(a, yy + 1, c)) { world.set(a, yy, c, B.MOSS_BLOCK); if (Math.random() < 0.3) world.set(a, yy + 1, c, Math.random() < 0.5 ? B.MOSS_CARPET : B.TALL_GRASS); break; } } } fx(); return true; }
      }
      // shears carve a pumpkin: it faces you and drops 4 seeds
      if ((hd.kind === 'tool' && hd.tool === 'shears') || h.id === IT.shears) { if (id === B.PUMPKIN) { const pf = playerFacing(); world.set(x, y, z, famId('carved_pumpkin', { facing: (pf + 2) % 4 })); dropItem(IT.pumpkin_seeds, 4, x + 0.5, y + 1, z + 0.5); Sfx.play('shear', 1); damageHeld(1); S.swing = 1; S.useCD = 0.3; return true; } }
    }
    return _fu.apply(this, arguments); }; }

// ---- world generation ----
{ const _dec = decorate; decorate = function (world, S, cx, cz) {
    const r0 = _dec.apply(this, arguments); if (world.dim !== 'overworld') return r0; const g = world.gen, seed = world.seed; const r = mulberry32(ihash(cx, cz, 6311, seed)); const bx = cx * 16, bz = cz * 16;
    const soft = (x, y, z, id) => { if (y > 0 && y < WH) S.soft.push(x, y, z, id); }, hard = (x, y, z, id) => { if (y > 0 && y < WH) S.hard.push(x, y, z, id); };
    const b0 = g.column(bx + 8, bz + 8).b; const fl = BIOME_FLOWERS()[b0];
    const onGrass = (x, z) => { const col = g.column(x, z); if (col.h <= SEA || g.cave(x, col.h - 1, z)) return -1; return col.h; };
    // flowers in clumps
    if (fl && r() < 0.6) { const n = b0 === BIO.PLAINS ? 3 : 2; for (let k = 0; k < n; k++) { const f = fl[r() * fl.length | 0]; const cx0 = bx + (r() * 16 | 0), cz0 = bz + (r() * 16 | 0); for (let i = 0; i < 10; i++) { const x = cx0 + ((r() * 7 | 0) - 3), z = cz0 + ((r() * 7 | 0) - 3); const y = onGrass(x, z); if (y < 0) continue; soft(x, y, z, B[f.toUpperCase()]); } } }
    // two-block plants
    const tall = b0 === BIO.FOREST ? ['lilac', 'rose_bush', 'peony'] : b0 === BIO.PLAINS ? ['sunflower', 'double_tall_grass'] : (b0 === BIO.TAIGA || b0 === BIO.JUNGLE) ? ['large_fern'] : b0 === BIO.SAVANNA ? ['double_tall_grass'] : null;
    if (tall && r() < 0.35) { const t = tall[r() * tall.length | 0]; const cx0 = bx + (r() * 16 | 0), cz0 = bz + (r() * 16 | 0); for (let i = 0; i < 6; i++) { const x = cx0 + ((r() * 5 | 0) - 2), z = cz0 + ((r() * 5 | 0) - 2); const y = onGrass(x, z); if (y < 0) continue; soft(x, y, z, B[t.toUpperCase()]); soft(x, y + 1, z, BL[B[t.toUpperCase()]].tallOther); } }
    // ferns in taiga and jungle
    if ((b0 === BIO.TAIGA || b0 === BIO.JUNGLE) && r() < 0.8) for (let i = 0; i < 6; i++) { const x = bx + (r() * 16 | 0), z = bz + (r() * 16 | 0); const y = onGrass(x, z); if (y > 0) soft(x, y, z, B.FERN); }
    // pumpkins (rare, grassy places) and melons (jungles)
    if ((b0 === BIO.PLAINS || b0 === BIO.FOREST || b0 === BIO.TAIGA || b0 === BIO.SAVANNA) && r() < 0.025) { const cx0 = bx + (r() * 16 | 0), cz0 = bz + (r() * 16 | 0); for (let i = 0; i < 5; i++) { const x = cx0 + ((r() * 5 | 0) - 2), z = cz0 + ((r() * 5 | 0) - 2); const y = onGrass(x, z); if (y > 0) soft(x, y, z, B.PUMPKIN); } }
    if (b0 === BIO.JUNGLE && r() < 0.12) { const cx0 = bx + (r() * 16 | 0), cz0 = bz + (r() * 16 | 0); for (let i = 0; i < 5; i++) { const x = cx0 + ((r() * 5 | 0) - 2), z = cz0 + ((r() * 5 | 0) - 2); const y = onGrass(x, z); if (y > 0) soft(x, y, z, B.MELON); } }
    // mushrooms in dark forests (and the odd one anywhere under trees), huge mushrooms in dark forests
    if (b0 === BIO.DARK_FOREST || b0 === BIO.TAIGA || r() < 0.06) for (let i = 0; i < 2; i++) { const x = bx + (r() * 16 | 0), z = bz + (r() * 16 | 0); const y = onGrass(x, z); if (y > 0) soft(x, y, z, r() < 0.5 ? B.BROWN_MUSHROOM : B.RED_MUSHROOM); }
    if (b0 === BIO.DARK_FOREST && r() < 0.18) { const x = bx + 3 + (r() * 10 | 0), z = bz + 3 + (r() * 10 | 0); const y = onGrass(x, z); if (y > 0) hugeMushroom(x, y, z, r() < 0.5, (a, b, c, id, stem) => (stem ? hard : soft)(a, b, c, id)); }
    return r0; }; }

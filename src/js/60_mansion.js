// ================= WOODLAND MANSIONS (Minecraft) =================
// Very rare (one start per 80x80-chunk region at most), only in dark forests. A three-storey dark oak mansion on a
// cobblestone foundation: dark oak log pillars, plank walls with glass windows, a stepped roof, a grand entrance and
// staircase, and on every floor a corridor ring with rooms off it: bedrooms, libraries, dining halls, storerooms,
// an allay cell behind iron bars, a fake End-portal room, a pumpkin-free "illager altar" and the secret obsidian
// room. Vindicators patrol the halls and evokers wait in the bigger rooms. Find one with a Woodland Explorer Map.
PLACE.woodland_mansion = { spacing: 80, sep: 20, salt: 10387319, biomes: [BIO.DARK_FOREST], land: true };
Object.assign(STRUCT_NAMES, { woodland_mansion: 'woodland_mansion', mansion: 'woodland_mansion' });
Object.assign(LOOT, { mansion: [['lead', 1, 1, 0.25], ['golden_apple', 1, 1, 0.2], ['enchanted_golden_apple', 1, 1, 0.02], ['name_tag', 1, 1, 0.15], ['chainmail_chestplate', 1, 1, 0.1], ['diamond_hoe', 1, 1, 0.06], ['diamond_chestplate', 1, 1, 0.05], ['enchanted_book', 1, 1, 0.3], ['bread', 1, 4, 0.5], ['wheat', 2, 6, 0.4], ['bucket', 1, 1, 0.2], ['redstone', 1, 4, 0.3], ['coal', 1, 4, 0.3], ['string', 1, 4, 0.3], ['gold_ingot', 1, 4, 0.3], ['iron_ingot', 1, 4, 0.3], ['emerald', 1, 3, 0.2], ['totem_of_undying', 1, 1, 0]] });
Object.assign(ENCH_LOOT, { mansion: 0.5 });
function mansionLayout(world, st) {
  if (st.mn) return st.mn; const r = mulberry32((st.seed ^ 0x3a7a) >>> 0); const W = 41, D = 33; const x0 = st.cx * 16 + 8 - (W >> 1), z0 = st.cz * 16 + 8 - (D >> 1);
  let fy = 0; for (const [x, z] of [[x0, z0], [x0 + W, z0], [x0, z0 + D], [x0 + W, z0 + D], [x0 + (W >> 1), z0 + (D >> 1)]]) fy = Math.max(fy, world.gen.column(x, z).h);
  const kinds = ['bedroom', 'library', 'dining', 'storage', 'bedroom', 'library', 'allay', 'portal', 'altar', 'storage', 'bedroom', 'obsidian', 'dining', 'bedroom'];
  const rooms = []; for (let f = 0; f < 3; f++) for (let k = 0; k < 6; k++) rooms.push({ f, k, kind: kinds[(r() * kinds.length) | 0] });
  st.mn = { x0, z0, W, D, fy, rooms, H: 6 }; return st.mn;
}
function buildMansionChunk(world, c) {
  const sts = bigStartsNear(world, 'woodland_mansion', c.cx, c.cz, 3); if (!sts.length) return; const W = pieceWriter(c, world); const seed = world.seed;
  for (const st of sts) { const L = mansionLayout(world, st); const { x0, z0, fy, H } = L; const x1 = x0 + L.W - 1, z1 = z0 + L.D - 1;
    if (x1 < c.cx * 16 || x0 > c.cx * 16 + 15 || z1 < c.cz * 16 || z0 > c.cz * 16 + 15) continue;
    const top = fy + H * 3;
    // clear the site, foundation down to the ground
    W.fill(x0 - 2, fy, z0 - 2, x1 + 2, top + 12, z1 + 2, 0);
    W.fill(x0 - 2, fy - 8, z0 - 2, x1 + 2, fy - 1, z1 + 2, (x, y, z) => y === fy - 1 ? (x < x0 || x > x1 || z < z0 || z > z1 ? B.GRASS : B.COBBLESTONE) : (y < world.gen.column(x, z).h ? B.COBBLESTONE : W.get(x, y, z) || B.COBBLESTONE));
    // shell: three storeys
    for (let f = 0; f < 3; f++) { const yb = fy + f * H;
      W.fill(x0, yb, z0, x1, yb + H - 1, z1, (x, y, z) => { const ex = x === x0 || x === x1, ez = z === z0 || z === z1; const h = y - yb;
        if (h === 0) return f === 0 ? B.COBBLESTONE : B.DARK_OAK_PLANKS; // floors
        if (!ex && !ez) return 0;
        const pillar = ((x - x0) % 8 === 0 && ez) || ((z - z0) % 8 === 0 && ex); if (pillar) return B.DARK_OAK_LOG;
        if (h === H - 1) return B.DARK_OAK_LOG;
        if (f === 0 && h === 1) return B.COBBLESTONE;
        const win = (h === 2 || h === 3) && (ex ? (z - z0) % 4 === 2 || (z - z0) % 4 === 3 : (x - x0) % 4 === 2 || (x - x0) % 4 === 3); if (win) return B.GLASS;
        return f === 0 ? B.DARK_OAK_PLANKS : B.PLANKS; }); }
    // roof: a stepped dark-oak hip roof with a cobblestone ridge
    for (let k = 0; k < 9; k++) W.fill(x0 - 1 + k, top + k, z0 - 1 + k, x1 + 1 - k, top + k, z1 + 1 - k, (x, y, z) => { const e = x === x0 - 1 + k || x === x1 + 1 - k || z === z0 - 1 + k || z === z1 + 1 - k; return e || k === 8 ? (k === 8 ? B.COBBLESTONE : B.DARK_OAK_PLANKS) : 0; });
    W.fill(x0, top, z0, x1, top, z1, B.DARK_OAK_PLANKS);
    // grand entrance (front = low z), steps and a lantern-lit porch
    const ex = x0 + (L.W >> 1); W.fill(ex - 1, fy + 1, z0, ex + 1, fy + 4, z0, 0); W.fill(ex - 2, fy, z0 - 3, ex + 2, fy, z0 - 1, B.COBBLESTONE); W.set(ex - 3, fy + 1, z0 - 1, B.DARK_OAK_LOG); W.set(ex + 3, fy + 1, z0 - 1, B.DARK_OAK_LOG); W.set(ex - 3, fy + 2, z0 - 1, B.TORCH); W.set(ex + 3, fy + 2, z0 - 1, B.TORCH);
    // inside each floor: a central hall along x with rooms north and south of it, and a staircase at the west end
    for (let f = 0; f < 3; f++) { const yb = fy + f * H; const hz0 = z0 + 13, hz1 = z0 + 19;
      // interior walls between rooms (white wool and planks), with doorways onto the hall
      W.fill(x0 + 1, yb + 1, hz0, x1 - 1, yb + H - 2, hz0, (x, y, z) => ((x - x0) % 8 >= 3 && (x - x0) % 8 <= 4 && y - yb <= 3) ? 0 : (y - yb === 1 ? B.DARK_OAK_PLANKS : B.WOOL));
      W.fill(x0 + 1, yb + 1, hz1, x1 - 1, yb + H - 2, hz1, (x, y, z) => ((x - x0) % 8 >= 3 && (x - x0) % 8 <= 4 && y - yb <= 3) ? 0 : (y - yb === 1 ? B.DARK_OAK_PLANKS : B.WOOL));
      for (let x = x0 + 8; x < x1; x += 8) { W.fill(x, yb + 1, z0 + 1, x, yb + H - 2, hz0 - 1, B.PLANKS); W.fill(x, yb + 1, hz1 + 1, x, yb + H - 2, z1 - 1, B.PLANKS); }
      for (let x = x0 + 2; x < x1; x += 4) W.set(x, yb + H - 2, z0 + 16, B.GLOWSTONE);
      // staircase up from this floor (not on the top floor)
      if (f < 2) { for (let s = 0; s < H; s++) W.fill(x0 + 2 + s, yb + 1 + s, hz0 + 1, x0 + 2 + s, yb + 1 + s, hz0 + 2, B.DARK_OAK_PLANKS); W.fill(x0 + 2, yb + H, hz0 + 1, x0 + 2 + H, yb + H, hz0 + 2, 0); }
      // the rooms: 4 north (z0..hz0) and 4 south (hz1..z1) of the hall, 7 wide
      for (let k = 0; k < 10; k++) { const north = k < 5; const i = k % 5; const rx0 = x0 + 1 + i * 8, rx1 = Math.min(x1 - 1, rx0 + 6); const rz0 = north ? z0 + 1 : hz1 + 1, rz1 = north ? hz0 - 1 : z1 - 1; if (rx0 >= x1 - 1) continue;
        const room = L.rooms[(f * 10 + k) % L.rooms.length]; const kind = (f === 0 && k === 2) ? 'hall' : room.kind; const cx = (rx0 + rx1) >> 1, cz = (rz0 + rz1) >> 1; const fl = yb + 1;
        const rr = mulberry32(ihash(rx0, fl, rz0, seed));
        if (kind === 'bedroom') { W.set(rx0 + 1, fl, rz0 + 1, B.BED_FOOT); W.set(rx0 + 1, fl, rz0 + 2, B.BED_HEAD); W.chest(rx1 - 1, fl, rz0 + 1, 'mansion'); W.set(rx1 - 1, fl, rz1 - 1, B.BOOKSHELF); if (rr() < 0.6) W.mob('vindicator', cx + 0.5, fl, cz + 0.5); }
        else if (kind === 'library') { W.fill(rx0, fl, rz0, rx0, fl + 3, rz1, B.BOOKSHELF); W.fill(rx1, fl, rz0, rx1, fl + 3, rz1, B.BOOKSHELF); W.set(cx, fl, cz, B.LECTERN); if (rr() < 0.5) W.chest(rx0 + 1, fl, rz1, 'mansion'); }
        else if (kind === 'dining') { W.fill(rx0 + 2, fl, cz, rx1 - 2, fl, cz, B.OAK_FENCE); W.fill(rx0 + 2, fl + 1, cz, rx1 - 2, fl + 1, cz, B.DARK_OAK_PLANKS); W.set(cx, fl + 2, cz, B.TORCH); if (rr() < 0.7) W.mob('vindicator', cx + 0.5, fl, rz0 + 1.5); }
        else if (kind === 'storage') { for (let x = rx0; x <= rx1; x += 2) W.chest(x, fl, rz0 + (north ? 0 : rz1 - rz0), 'mansion'); W.set(cx, fl, cz, B.HAY_BLOCK); }
        else if (kind === 'allay') { W.fill(rx0 + 1, fl, rz0 + 1, rx1 - 1, fl + 3, rz1 - 1, (x, y, z) => (x === rx0 + 1 || x === rx1 - 1 || z === rz0 + 1 || z === rz1 - 1) ? (y === fl + 3 ? B.DARK_OAK_PLANKS : B.IRON_BARS) : 0); W.mob('allay', cx + 0.5, fl, cz + 0.5); W.mob('allay', cx + 1.5, fl, cz + 0.5); W.mob('vindicator', rx0 + 0.5, fl, rz0 + 0.5); }
        else if (kind === 'portal') { for (let a = -2; a <= 2; a++) for (let b2 = -2; b2 <= 2; b2++) { const ring = (Math.abs(a) === 2) !== (Math.abs(b2) === 2); if (ring) W.set(cx + a, fl, cz + b2, B.OBSIDIAN); } W.set(cx, fl, cz, B.LAVA); W.mob('vindicator', cx + 0.5, fl, rz0 + 0.5); }
        else if (kind === 'altar') { W.set(cx, fl, cz, B.COBBLESTONE); W.set(cx, fl + 1, cz, B.TORCH); for (const [a, b2] of [[-2, 0], [2, 0]]) W.set(cx + a, fl, cz + b2, B.OAK_FENCE); W.mob('evoker', cx + 0.5, fl, cz + 1.5); }
        else if (kind === 'obsidian') { W.fill(rx0 + 1, fl, rz0 + 1, rx1 - 1, fl + 3, rz1 - 1, (x, y, z) => (x === rx0 + 1 || x === rx1 - 1 || z === rz0 + 1 || z === rz1 - 1) ? B.OBSIDIAN : 0); W.set(cx, fl, cz, B.DIAMOND_BLOCK); W.chest(cx, fl + 1, cz, 'mansion'); }
        else if (kind === 'hall') { W.mob('evoker', cx + 0.5, fl, cz + 0.5); W.set(rx0 + 1, fl, rz0 + 1, B.BOOKSHELF); W.chest(rx1 - 1, fl, rz0 + 1, 'mansion'); }
      }
      for (let k = 0; k < 2; k++) W.mob('vindicator', x0 + 10 + k * 18 + 0.5, yb + 1, z0 + 16.5);
    }
    if (W.inC(st.cx * 16 + 8, st.cz * 16 + 8)) (world.mansions = world.mansions || []).push([st.cx * 16 + 8, fy, st.cz * 16 + 8]);
  }
}
{ const _go = World.prototype.genOverworld; World.prototype.genOverworld = function (c) { const cols = _go.call(this, c); buildMansionChunk(this, c); return cols; }; }
// mansion mobs don't despawn (Minecraft: illagers placed with the structure are persistent)
{ const _og = onChunkGen; onChunkGen = function (c, hints, cols, w) { const before = G.mobs.length; _og(c, hints, cols, w); for (let i = before; i < G.mobs.length; i++) { const m = G.mobs[i]; if (m && (m.type === 'vindicator' || m.type === 'evoker')) m.structMob = true; } }; }
{ const _mp = mobPersistent; mobPersistent = function (m) { if (m && m.structMob && !m.dead && !m.gone) return true; return _mp(m); }; }
// /locate woodland_mansion (also used by Woodland Explorer Maps)
{ const _lc = CMDS.locate.run; CMDS.locate.run = function (a, ctx) {
    if (a[0] === 'structure' && STRUCT_NAMES[String(a[1] || '').toLowerCase().replace(/^minecraft:/, '')] === 'woodland_mansion') { if (world.dim !== 'overworld') throw new CmdError('Mansions are in the Overworld'); const P = player.pos; const sp = PLACE.woodland_mansion.spacing; const prx = Math.floor(P.x / 16 / sp), prz = Math.floor(P.z / 16 / sp); let best = null;
      for (let rr = 0; rr <= 6; rr++) for (let rx = prx - rr; rx <= prx + rr; rx++) for (let rz = prz - rr; rz <= prz + rr; rz++) { if (Math.max(Math.abs(rx - prx), Math.abs(rz - prz)) !== rr) continue; const st = regionStart(world, 'woodland_mansion', rx, rz); if (!st) continue; const x = st.cx * 16 + 8, z = st.cz * 16 + 8; const d = Math.hypot(x - P.x, z - P.z); if (!best || d < best[2]) best = [x, z, d]; }
      if (!best) throw new CmdError('Could not find a woodland mansion within reasonable distance'); chatPrint('The nearest ' + a[1] + ' is at [' + best[0] + ', ~, ' + best[1] + '] (' + Math.round(best[2]) + ' blocks away)', '#7ef'); return; }
    return _lc.call(this, a, ctx); }; }
// no trees (or other decorations) growing inside a mansion
{ const _sf = structuresFor; structuresFor = function (world, cx, cz) { const S = _sf(world, cx, cz); if (S.mansionFiltered || world.dim !== 'overworld') return S; S.mansionFiltered = true;
    const sts = bigStartsNear(world, 'woodland_mansion', cx, cz, 3); if (!sts.length) return S;
    for (const st of sts) { const L = mansionLayout(world, st); const ax = L.x0 - 4, az = L.z0 - 4, bx = L.x0 + L.W + 4, bz = L.z0 + L.D + 4;
      for (const key of ['soft', 'hard']) { const a = S[key], out = []; for (let i = 0; i < a.length; i += 4) { const x = a[i], z = a[i + 2]; if (x >= ax && x <= bx && z >= az && z <= bz) continue; out.push(a[i], a[i + 1], a[i + 2], a[i + 3]); } S[key] = out; } }
    return S; }; }

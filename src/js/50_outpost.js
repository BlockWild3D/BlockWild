// ================= PILLAGER OUTPOSTS (Minecraft) =================
// A dark oak watchtower on a cobblestone base: four storeys of dark oak planks between dark oak log corners, fenced
// windows, a ladder up the inside, and an overhanging top deck with a railing, corner posts and a stepped roof. The
// loot chest is on the top deck. Around it: an iron golem (or allay) locked in an iron-bar cage, tents, log piles
// and target dummies. Pillagers guard it (one is the captain) and keep spawning around the outpost in any light,
// as in Minecraft.
Object.assign(LOOT, { outpost: [['crossbow', 1, 1, 0.5], ['wheat', 3, 5, 0.6], ['potato', 2, 5, 0.4], ['carrot', 3, 5, 0.4], ['dark_oak_log', 2, 3, 0.4], ['string', 1, 6, 0.4], ['arrow', 2, 7, 0.4], ['tripwire_hook', 1, 3, 0.25], ['iron_ingot', 1, 3, 0.3], ['enchanted_book', 1, 1, 0.12], ['experience_bottle', 1, 2, 0.15]] });
buildTower = function (S, g, x0, z0, hard, r, world) {
  const cx = x0 + 2, cz = z0 + 2; let fy = g.column(cx, cz).h - 1; if (fy < SEA) return;
  const soft = (x, y, z, id) => { if (y > 0 && y < WH) S.soft.push(x, y, z, id); };
  // foundation: a 9x9 cobblestone pad, filled down to the ground
  for (let x = cx - 4; x <= cx + 4; x++) for (let z = cz - 4; z <= cz + 4; z++) { groundFill(g, x, z, fy, hard, B.COBBLESTONE); hard(x, fy, z, (Math.abs(x - cx) === 4 || Math.abs(z - cz) === 4) && (x + z) % 3 === 0 ? B.MOSSY_COBBLESTONE : B.COBBLESTONE); for (let y = fy + 1; y <= fy + 26; y++) hard(x, y, z, 0); }
  const H = 4, floors = 4, top = fy + H * floors; // tower body 7x7, storeys 4 high
  for (let f = 0; f < floors; f++) { const yb = fy + f * H;
    for (let x = cx - 3; x <= cx + 3; x++) for (let z = cz - 3; z <= cz + 3; z++) {
      const ex = Math.abs(x - cx) === 3, ez = Math.abs(z - cz) === 3;
      if (f > 0) hard(x, yb, z, (ex || ez) ? B.DARK_OAK_PLANKS : (x === cx - 2 && z === cz + 2) ? 0 : B.DARK_OAK_PLANKS); // floor with a ladder hole
      for (let h = 1; h < H; h++) { const y = yb + h; let id = 0;
        if (ex && ez) id = B.DARK_OAK_LOG; else if (ex || ez) { id = h === 1 && f > 0 ? B.DARK_OAK_LOG : B.DARK_OAK_PLANKS; const mid = (ex && z === cz) || (ez && x === cx); if (mid && h === 2 && f > 0) id = B.OAK_FENCE; if (f === 0 && ez && z === cz - 3 && x === cx && h <= 2) id = 0; }
        hard(x, y, z, id); } }
    for (let h = 1; h <= H; h++) hard(cx - 2, yb + h, cz + 2, B.LADDER_S); // ladder against the back wall
  }
  // top deck: 11x11 overhang with a fence railing, corner posts and a stepped dark oak roof
  for (let x = cx - 5; x <= cx + 5; x++) for (let z = cz - 5; z <= cz + 5; z++) { const e = Math.abs(x - cx) === 5 || Math.abs(z - cz) === 5; hard(x, top, z, (x === cx - 2 && z === cz + 2) ? 0 : B.DARK_OAK_PLANKS); if (e) hard(x, top + 1, z, (Math.abs(x - cx) === 5 && Math.abs(z - cz) === 5) ? B.DARK_OAK_LOG : B.OAK_FENCE); }
  for (let h = 1; h <= 4; h++) for (const [a, b] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) hard(cx + a, top + h, cz + b, B.DARK_OAK_LOG);
  hard(cx - 2, top + 1, cz + 2, 0);
  for (let k = 0; k <= 4; k++) for (let x = cx - 6 + k; x <= cx + 6 - k; x++) for (let z = cz - 6 + k; z <= cz + 6 - k; z++) { const e = Math.abs(x - cx) === 6 - k || Math.abs(z - cz) === 6 - k; if (e || k === 4) hard(x, top + 5 + k, z, k === 0 ? B.DARK_OAK_LOG : B.DARK_OAK_PLANKS); }
  hard(cx + 3, top + 1, cz - 3, B.CHEST); world.chestLoot.set((cx + 3) + ',' + (top + 1) + ',' + (cz - 3), 'outpost');
  hard(cx, top + 4, cz, B.TORCH); hard(cx, top + 3, cz, B.DARK_OAK_LOG); hard(cx, top + 2, cz, B.DARK_OAK_LOG); hard(cx, top + 1, cz, B.DARK_OAK_LOG);
  // pillagers: two on the deck, the rest around the base; the first one is the captain
  S.mobs.push(['pillager', cx + 2.5, top + 1, cz + 0.5], ['pillager', cx - 2.5, top + 1, cz - 2.5]);
  for (let i = 0; i < 3; i++) { const a = r() * 6.28, d = 7 + r() * 5; const x = Math.round(cx + Math.cos(a) * d), z = Math.round(cz + Math.sin(a) * d); const h = g.column(x, z).h; if (h > SEA) S.mobs.push(['pillager', x + 0.5, h, z + 0.5]); }
  S.kinds.push(['outpost_center', cx, cz, fy]);
  // features around the tower (Minecraft places a few of these within ~20 blocks)
  const spots = [[12, 0], [-12, 2], [2, 12], [-1, -12], [10, 10], [-10, -9]].sort(() => r() - 0.5); let si = 0;
  const groundAt = (x, z) => g.column(x, z).h;
  const feature = (kind) => { let fx, fz, h = 0; for (let t = 0; t < spots.length && h <= SEA; t++) { const [dx, dz] = spots[si++ % spots.length]; fx = cx + dx; fz = cz + dz; h = groundAt(fx, fz); } if (h <= SEA) return;
    if (kind === 'cage') { // iron-bar cage with a dark oak frame; an iron golem inside
      for (let x = fx - 2; x <= fx + 2; x++) for (let z = fz - 2; z <= fz + 2; z++) { groundFill(g, x, z, h - 1, hard, B.DIRT); hard(x, h - 1, z, B.DARK_OAK_PLANKS); for (let y = h; y <= h + 3; y++) { const edge = Math.abs(x - fx) === 2 || Math.abs(z - fz) === 2; const corner = Math.abs(x - fx) === 2 && Math.abs(z - fz) === 2; hard(x, y, z, y === h + 3 ? B.DARK_OAK_PLANKS : corner ? B.DARK_OAK_LOG : edge ? B.IRON_BARS : 0); } }
      S.mobs.push([r() < 0.5 ? 'iron_golem' : 'allay', fx + 0.5, h, fz + 0.5]); S.kinds.push(['outpost_cage', fx, fz]); }
    else if (kind === 'tent') { // a white wool tent over a fence frame
      for (let i = -2; i <= 2; i++) { for (const [a, hh] of [[-2, 0], [-1, 1], [0, 2], [1, 1], [2, 0]]) { const x = fx + a, z = fz + i, y = groundAt(x, z) + hh; hard(x, y, z, B.WOOL); } } hard(fx, groundAt(fx, fz + 3), fz + 3, B.OAK_FENCE); }
    else if (kind === 'logs') { for (let i = 0; i < 3; i++) for (let j = 0; j < 3 - i; j++) { const x = fx + j * 1 - 1 + (i ? 0 : 0), z = fz; hard(fx - 1 + j + i * 0, groundAt(fx, fz) + i, fz + (i % 2), B.DARK_OAK_LOG); hard(fx - 1 + j, groundAt(fx, fz) + i, fz + 1 - (i % 2), B.DARK_OAK_LOG); } }
    else if (kind === 'targets') { for (const a of [-2, 0, 2]) { const x = fx + a, z = fz, y = groundAt(x, z); hard(x, y, z, B.OAK_FENCE); hard(x, y + 1, z, B.HAY_BLOCK); hard(x, y + 2, z, B.OAK_FENCE); } }
  };
  feature('cage'); for (const k of ['tent', 'logs', 'targets', 'tent']) if (r() < 0.75) feature(k);
};
// names: the outpost is the outpost (no fake "tower"/"watchtower" aliases any more)
delete STRUCT_NAMES.watchtower; delete STRUCT_NAMES.tower; STRUCT_NAMES.pillager_outpost = 'tower'; STRUCT_NAMES.outpost = 'tower';
// the first pillager made at an outpost is its captain: more health, and he carries the banner (shown as a cloak)
{ const _og = onChunkGen; onChunkGen = function (c, hints, cols, w) { _og(c, hints, cols, w); if (w !== world || w.dim !== 'overworld') return;
    const own = structuresFor(w, c.cx, c.cz); const k = (own.kinds || []).find(q => q[0] === 'outpost_center'); if (!k) return;
    (w.outposts = w.outposts || []).push([k[1], k[3], k[2]]);
    const cap = G.mobs.filter(m => m.type === 'pillager' && !m.dead && Math.hypot(m.pos.x - k[1], m.pos.z - k[2]) < 8).sort((a, b) => b.pos.y - a.pos.y)[0]; if (cap) makeCaptain(cap);
    for (const m of G.mobs) if ((m.type === 'iron_golem' || m.type === 'allay') && Math.hypot(m.pos.x - k[1], m.pos.z - k[2]) < 22) { m.caged = true; m.playerMade = true; } }; }
function makeCaptain(m) { m.captain = true; m.maxHp = m.hp = 30; if (m.root && !m.banner) { const p = pivot(m.body || m.root, 0, 1.45, -0.2); m.banner = sbox(m, p, 0.5, 0.9, 0.04, 0, -0.45, 0, 'captain_banner', fur([236, 236, 230], 3, { extra: (f, set, fw, fh) => { for (let y = 2; y < fh - 2; y++) set(fw >> 1, y, [40, 40, 40]); for (let x = 1; x < fw - 1; x++) set(x, 3, [40, 140, 140]); } })); p.traverse(o => { if (o.isMesh) o.layers.enable(1); }); } }
{ const _mr = mobRecord; mobRecord = function (m) { const r = _mr(m); if (m.captain) r.cap = 1; return r; }; const _mf = mobFromRecord; mobFromRecord = function (rec) { const m = _mf(rec); if (m && rec.cap) makeCaptain(m); return m; }; }
// pillagers keep spawning around outposts (Minecraft: in the outpost's area, any light level)
{ const _us = updateSpawning; updateSpawning = function (dt) { const r = _us.apply(this, arguments);
    if (!world || world.dim !== 'overworld' || !world.outposts || isClientMP() || !S.rules.doMobSpawning || S.difficulty === 'peaceful' || Math.random() > dt * 0.15) return r;
    const P = player.pos; for (const [x, y, z] of world.outposts) { const d = Math.hypot(x - P.x, z - P.z); if (d > 96 || d < 10) continue;
      if (G.mobs.filter(m => m.type === 'pillager' && !m.dead && Math.hypot(m.pos.x - x, m.pos.z - z) < 40).length >= 6) continue;
      const a = Math.random() * 6.28, rr = 6 + Math.random() * 16; const sx = Math.floor(x + Math.cos(a) * rr), sz = Math.floor(z + Math.sin(a) * rr); if (!world.loaded(sx, sz)) continue;
      for (let yy = y + 8; yy > y - 8; yy--) if (world.solid(sx, yy - 1, sz) && !world.solid(sx, yy, sz) && !world.solid(sx, yy + 1, sz)) { spawnMob('pillager', sx + 0.5, yy, sz + 0.5); break; } }
    return r; }; }
// caged golems stay put and don't fight pillagers until you free them (break a bar)
{ const prev = MOBS.iron_golem.tick; MOBS.iron_golem.tick = function (m, dt) { if (m.caged) { const x = Math.floor(m.pos.x), z = Math.floor(m.pos.z), y = Math.floor(m.pos.y); let closed = true; for (const [a, b] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) if (!world.solid(x + a, y, z + b) && !world.solid(x + a, y + 1, z + b) && world.get(x + a, y, z + b) !== B.IRON_BARS) closed = false; if (!closed) m.caged = false; else { m.wMove = 0; return false; } } return prev ? prev(m, dt) : false; }; }

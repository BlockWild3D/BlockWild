// ================= TRIAL CHAMBERS, OCEAN MONUMENTS, ANCIENT CITIES (Minecraft) =================
// Trial chambers: tuff-and-copper halls deep underground. Trial spawners wake when you come near and send waves of
// mobs (breezes, zombies, skeletons, bogged, spiders); beat a wave and they drop a Trial Key and loot. Vaults open
// with a Trial Key (once per player) and hold loot - sometimes a Heavy Core for a mace.
// Ocean monuments: prismarine temples in deep oceans, guarded by guardians (laser beams, spikes) and three elder
// guardians that give you Mining Fatigue. Gold blocks and sponges inside.
// Ancient cities: deepslate ruins at y -51 overgrown with sculk. Walk (don't sneak) near sculk shriekers and they
// shriek and bring Darkness; the fourth time, the Warden digs out of the ground: blind, it hunts by sound and smell
// and can sonic-boom you through walls. Chests hold echo shards, enchanted golden apples and enchanted books.
Object.assign(EFFECTS, { darkness: 'Darkness', mining_fatigue: 'Mining Fatigue' });
Object.assign(PLACE, {
  trial_chambers: { spacing: 34, sep: 12, salt: 94251327 }, ocean_monument: { spacing: 32, sep: 5, salt: 10387313, biomes: [BIO.OCEAN] },
  ancient_city: { spacing: 24, sep: 8, salt: 20083232, land: true },
});
Object.assign(STRUCT_NAMES, { trial_chambers: 'trial_chambers', ocean_monument: 'ocean_monument', monument: 'ocean_monument', ancient_city: 'ancient_city' });
Object.assign(LOOT, {
  trial_vault: [['emerald', 2, 4, 0.5], ['diamond', 1, 2, 0.15], ['golden_apple', 1, 1, 0.2], ['enchanted_book', 1, 1, 0.25], ['iron_ingot', 2, 5, 0.4], ['wind_charge', 4, 12, 0.5], ['arrow', 4, 12, 0.4], ['diamond_spear', 1, 1, 0.06], ['heavy_core', 1, 1, 0.04], ['trident', 1, 1, 0.03], ['crossbow', 1, 1, 0.1], ['ominous_trial_key', 1, 1, 0.05]],
  ominous_vault: [['heavy_core', 1, 1, 0.075], ['enchanted_golden_apple', 1, 1, 0.08], ['diamond', 2, 3, 0.3], ['emerald', 4, 10, 0.5], ['enchanted_book', 1, 1, 0.4], ['wind_charge', 8, 12, 0.5], ['diamond_axe', 1, 1, 0.1]],
  trial_reward: [['bread', 1, 3, 0.5], ['cooked_chicken', 1, 3, 0.4], ['arrow', 4, 8, 0.4], ['iron_ingot', 1, 2, 0.3], ['emerald', 1, 2, 0.3], ['trial_key', 1, 1, 1]],
  ancient_city: [['echo_shard', 1, 3, 0.55], ['enchanted_golden_apple', 1, 1, 0.07], ['enchanted_book', 1, 1, 0.4], ['diamond_horse_armor', 1, 1, 0.1], ['golden_apple', 1, 2, 0.3], ['coal', 6, 15, 0.4], ['bone', 1, 15, 0.4], ['iron_leggings', 1, 1, 0.1], ['diamond_hoe', 1, 1, 0.1], ['lead', 1, 1, 0.2], ['saddle', 1, 1, 0.15], ['emerald', 1, 3, 0.3]],
});
// ---------- layouts, built chunk by chunk ----------
function bigStartsNear(world, kind, cx, cz, reach) { const sp = PLACE[kind].spacing; const out = []; for (let rx = Math.floor((cx - reach) / sp); rx <= Math.floor((cx + reach) / sp); rx++) for (let rz = Math.floor((cz - reach) / sp); rz <= Math.floor((cz + reach) / sp); rz++) { const st = regionStart(world, kind, rx, rz); if (st && Math.abs(st.cx - cx) <= reach && Math.abs(st.cz - cz) <= reach) out.push(st); } return out; }
function chunkWriter(c, world) {
  const bx = c.cx * 16, bz = c.cz * 16, d = c.d; const inC = (x, z) => x >= bx && x < bx + 16 && z >= bz && z < bz + 16;
  return { inC, set: (x, y, z, id) => { if (!inC(x, z) || y < 1 || y >= WH) return; const j = (y * 16 + (z - bz)) * 16 + (x - bx); if (d[j] === B.BEDROCK) return; d[j] = id; }, get: (x, y, z) => inC(x, z) ? d[(y * 16 + (z - bz)) * 16 + (x - bx)] : 0 };
}
// trial chambers: a hub with corridors to rooms, each room with a trial spawner, some with vaults and chests
function trialLayout(world, st) {
  if (st.tl) return st.tl; const r = mulberry32(st.seed ^ 0x7121); const y = YOFF - 40 + (r() * 16 | 0); const ox = st.cx * 16 + 8, oz = st.cz * 16 + 8; const rooms = [{ x: ox, z: oz, w: 9, d: 9, y, hub: true }];
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + r() * 0.5, dist = 16 + r() * 14; rooms.push({ x: Math.round(ox + Math.cos(a) * dist), z: Math.round(oz + Math.sin(a) * dist), w: 7 + (r() * 5 | 0), d: 7 + (r() * 5 | 0), y: y + ((r() * 3 | 0) - 1) * 4, vault: r() < 0.4, ominous: r() < 0.12, chest: r() < 0.35, mob: pickWeightedR(r, { breeze: 3, zombie: 3, skeleton: 2, bogged: 2, spider: 2, husk: 1, stray: 1 }) }); }
  st.tl = { y, rooms }; return st.tl;
}
function pickWeightedR(r, tab) { let tot = 0; for (const k in tab) tot += tab[k]; let q = r() * tot; for (const k in tab) { q -= tab[k]; if (q <= 0) return k; } return Object.keys(tab)[0]; }
function buildTrialChunk(world, c) {
  const W = chunkWriter(c, world); const sts = bigStartsNear(world, 'trial_chambers', c.cx, c.cz, 4); if (!sts.length) return;
  for (const st of sts) { const L = trialLayout(world, st); const hub = L.rooms[0];
    const room = (R) => { const x0 = R.x - (R.w >> 1), z0 = R.z - (R.d >> 1); for (let x = x0 - 1; x <= x0 + R.w; x++) for (let z = z0 - 1; z <= z0 + R.d; z++) for (let y = R.y - 1; y <= R.y + 6; y++) { const edge = x < x0 || x >= x0 + R.w || z < z0 || z >= z0 + R.d || y === R.y - 1 || y === R.y + 6; const band = y === R.y + 2 && ((x + z) % 4 === 0); W.set(x, y, z, edge ? (y === R.y - 1 ? ((x + z) % 2 ? B.TUFF_BRICKS : B.COPPER_BLOCK) : band ? B.COPPER_BLOCK : B.TUFF_BRICKS) : 0); }
      for (const [x, z] of [[x0, z0], [x0 + R.w - 1, z0], [x0, z0 + R.d - 1], [x0 + R.w - 1, z0 + R.d - 1]]) W.set(x, R.y + 4, z, B.TORCH);
      if (!R.hub) { W.set(R.x, R.y, R.z, B.TRIAL_SPAWNER); if (W.inC(R.x, R.z)) c.trials = (c.trials || []).concat([[R.x, R.y, R.z, R.mob]]); if (R.vault) { W.set(x0 + 1, R.y, z0 + 1, B.VAULT); if (W.inC(x0 + 1, z0 + 1)) c.vaults = (c.vaults || []).concat([[x0 + 1, R.y, z0 + 1, R.ominous ? 'ominous_vault' : 'trial_vault']]); } if (R.chest) { W.set(x0 + R.w - 2, R.y, z0 + R.d - 2, B.CHEST); if (W.inC(x0 + R.w - 2, z0 + R.d - 2)) c.loots = (c.loots || []).concat([[x0 + R.w - 2, R.y, z0 + R.d - 2, 'trial_vault']]); } } };
    const tunnel = (a, b) => { let x = a.x, z = a.z, y = a.y; const steps = Math.abs(b.x - a.x) + Math.abs(b.z - a.z); for (let i = 0; i <= steps; i++) { for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) for (let h = -1; h <= 4; h++) { const edge = Math.abs(ox) === 1 && Math.abs(oz) === 1 || h === -1 || h === 4; const id = W.get(x + ox, y + h, z + oz); if (h >= 0 && h <= 3 && !(Math.abs(ox) === 1 && Math.abs(oz) === 1)) W.set(x + ox, y + h, z + oz, 0); else if (edge && id !== 0 && id !== B.TRIAL_SPAWNER && id !== B.VAULT && id !== B.CHEST) W.set(x + ox, y + h, z + oz, (x + z) % 7 ? B.TUFF_BRICKS : B.COPPER_BLOCK); } if (x !== b.x) x += Math.sign(b.x - x); else z += Math.sign(b.z - z); if (y !== b.y && i % 3 === 0) y += Math.sign(b.y - y); } };
    for (const R of L.rooms.slice(1)) tunnel(hub, R); for (const R of L.rooms) room(R);
  }
}
// ocean monument: a 58x58 prismarine temple on the deep sea floor, hollow halls with a gold-block core
function buildMonumentChunk(world, c) {
  const sts = bigStartsNear(world, 'ocean_monument', c.cx, c.cz, 3); if (!sts.length) return; const W = chunkWriter(c, world);
  for (const st of sts) { if (st.col.h > SEA - 18) continue; const ox = st.cx * 16 + 8 - 29, oz = st.cz * 16 + 8 - 29, y0 = Math.max(YOFF + 0, st.col.h);
    for (let x = ox; x < ox + 58; x++) for (let z = oz; z < oz + 58; z++) { if (!W.inC(x, z)) continue; const ix = x - ox, iz = z - oz; const inset = (y) => y < 6 ? 0 : y < 14 ? 6 : 14;
      for (let y = y0 - 3; y < y0; y++) W.set(x, y, z, B.PRISMARINE);
      for (let h = 0; h <= 22; h++) { const k = inset(h); const inside = ix >= k && ix < 58 - k && iz >= k && iz < 58 - k; const y = y0 + h; if (!inside) { if (h < 23) W.set(x, y, z, B.WATER); continue; }
        const shell = ix === k || ix === 57 - k || iz === k || iz === 57 - k || h === 0 || h === 5 || h === 13 || h === 22; const wing = (ix < 12 || ix > 45) && h < 14;
        let id = shell ? ((h + ix + iz) % 9 === 0 ? B.SEA_LANTERN : (h % 5 === 0 ? B.DARK_PRISMARINE : B.PRISMARINE_BRICKS)) : B.WATER;
        if (!shell && (ix % 8 === 4 && iz % 8 === 4) && h < 13) id = B.PRISMARINE; // pillars
        if (!shell && ix >= 25 && ix <= 32 && iz >= 25 && iz <= 32 && h >= 6 && h <= 9) id = (ix >= 27 && ix <= 30 && iz >= 27 && iz <= 30 && h >= 7 && h <= 8) ? B.GOLD_BLOCK : B.DARK_PRISMARINE;
        if (!shell && wing && (ix + iz) % 23 === 0 && h === 1) id = B.WET_SPONGE;
        if ((ix === 28 || ix === 29) && iz < 3 && h >= 1 && h <= 4) id = B.WATER; // entrance
        W.set(x, y, z, id); } }
    if (W.inC(st.cx * 16 + 8, st.cz * 16 + 8)) { c.monument = [st.cx * 16 + 8, y0, st.cz * 16 + 8]; }
  }
}
// ancient city: a big deepslate plaza in the deep dark with sculk, shriekers, sensors, chests and the "portal" frame
function buildAncientChunk(world, c) {
  const sts = bigStartsNear(world, 'ancient_city', c.cx, c.cz, 4); if (!sts.length) return; const W = chunkWriter(c, world); const seed = world.seed;
  for (const st of sts) { const y0 = YOFF - 51, ox = st.cx * 16 + 8, oz = st.cz * 16 + 8, R = 44;
    for (let x = ox - R; x <= ox + R; x++) for (let z = oz - R; z <= oz + R; z++) { if (!W.inC(x, z)) continue; const dx = x - ox, dz = z - oz; if (Math.abs(dx) > R || Math.abs(dz) > R) continue;
      const n = rnd01(x, y0, z, seed); for (let y = y0; y <= y0 + 18; y++) W.set(x, y, z, 0);
      W.set(x, y0 - 1, z, n < 0.3 ? B.SCULK : (x + z) % 2 ? B.DEEPSLATE_TILES : B.DEEPSLATE_BRICKS); W.set(x, y0 - 2, z, B.DEEPSLATE_TILES);
      // ruined walls and houses on a grid
      const gx = ((dx % 12) + 12) % 12, gz = ((dz % 12) + 12) % 12; const block = Math.abs(dx) > 8 || Math.abs(dz) > 8;
      if (block && (gx === 0 || gz === 0) && !(gx === 6 || gz === 6)) { const hh = 2 + Math.floor(rnd01(Math.floor(x / 12), 1, Math.floor(z / 12), seed) * 6); for (let y = y0; y < y0 + hh; y++) if (rnd01(x, y, z, seed) < 0.9) W.set(x, y, z, y === y0 + hh - 1 && n < 0.5 ? B.DEEPSLATE_TILES : B.DEEPSLATE_BRICKS); }
      if (n > 0.985) W.set(x, y0, z, B.SCULK_SENSOR); else if (n > 0.975 && block) W.set(x, y0, z, B.SCULK_SHRIEKER); else if (n > 0.965 && block && gx === 3 && gz === 3) { W.set(x, y0, z, B.CHEST); c.loots = (c.loots || []).concat([[x, y0, z, 'ancient_city']]); }
      if (n > 0.95 && n < 0.955) W.set(x, y0 + 1, z, B.TORCH); // soul-fire style lights (torches)
      // the "portal" frame in the middle
      if (Math.abs(dz) <= 1 && Math.abs(dx) <= 6) { for (let y = y0; y <= y0 + 12; y++) { const frame = Math.abs(dx) >= 5 || y >= y0 + 11 || y === y0; if (frame) W.set(x, y, z, B.REINFORCED_DEEPSLATE); } }
    }
    if (W.inC(ox, oz)) c.ancient = [ox, y0, oz];
  }
}
{ const _go = World.prototype.genOverworld; World.prototype.genOverworld = function (c) { const cols = _go.call(this, c); buildTrialChunk(this, c); buildMonumentChunk(this, c); buildAncientChunk(this, c); return cols; }; }
// structure blocks that need world state: spawners, vaults, loot, guardians
{ const _og = onChunkGen; onChunkGen = function (c, hints, cols, w) { _og(c, hints, cols, w);
    for (const [x, y, z, mob] of c.trials || []) w.trialSpawners.set(x + ',' + y + ',' + z, { mob, state: 'idle', spawned: 0, alive: [], cool: 0 });
    for (const [x, y, z, loot] of c.vaults || []) w.chestLoot.set('vault:' + x + ',' + y + ',' + z, loot);
    for (const [x, y, z, loot] of c.loots || []) w.chestLoot.set(x + ',' + y + ',' + z, loot);
    if (c.monument && w === world) { const [x, y, z] = c.monument; for (let i = 0; i < 8; i++) spawnMob('guardian', x + (Math.random() - 0.5) * 40, y + 3 + Math.random() * 10, z + (Math.random() - 0.5) * 40); for (let i = 0; i < 3; i++) spawnMob('elder_guardian', x + [-18, 18, 0][i], y + 8, z + [0, 0, 18][i]); }
    c.trials = c.vaults = c.loots = c.monument = null;
  }; }
{ const _w = World; const _get = Dim.get.bind(Dim); Dim.get = function (dim) { const w = _get(dim); if (!w.trialSpawners) w.trialSpawners = new Map(); if (!w.vaultUsed) w.vaultUsed = new Set(); return w; }; }

// ---------- trial spawners and vaults ----------
function updateTrials(dt) {
  if (!world || !world.trialSpawners || isClientMP()) return; const P = player;
  for (const [k, T] of world.trialSpawners) { const [x, y, z] = k.split(',').map(Number); if (Math.abs(x - P.pos.x) > 24 || Math.abs(z - P.pos.z) > 24) continue; if (world.get(x, y, z) !== B.TRIAL_SPAWNER) { world.trialSpawners.delete(k); continue; }
    T.cool -= dt; T.alive = T.alive.filter(m => !m.dead && !m.gone);
    if (Math.random() < dt * 6) Particles.emit(x + 0.5, y + 0.6, z + 0.5, 1, T.state === 'active' ? [[1, 0.5, 0.1]] : [[0.5, 0.5, 0.5]], 0.6, 0.6, -2, 0.5);
    if (T.state === 'idle' && T.cool <= 0 && isSurv() && P.pos.distanceTo(new V3(x + 0.5, y, z + 0.5)) < 14) { T.state = 'active'; T.total = 6; T.spawned = 0; Sfx.at('portal', new V3(x, y, z), 0.6); }
    if (T.state === 'active') { T.spawnT = (T.spawnT || 0) - dt;
      if (T.spawned < T.total && T.alive.length < 3 && T.spawnT <= 0) { T.spawnT = 2; for (let k2 = 0; k2 < 8; k2++) { const sx = x + (Math.random() * 7 | 0) - 3, sz = z + (Math.random() * 7 | 0) - 3; if (freeAt(sx, y, sz, 2) && SOLID[world.get(sx, y - 1, sz)]) { const m = spawnMob(T.mob, sx + 0.5, y, sz + 0.5); m.trial = true; T.alive.push(m); T.spawned++; Particles.emit(sx + 0.5, y + 0.8, sz + 0.5, 14, [[1, 0.6, 0.2]], 2, 0.6, -1, 0.6); break; } } }
      if (T.spawned >= T.total && !T.alive.length) { T.state = 'idle'; T.cool = 1800; const loot = rollLoot('trial_reward', (Math.random() * 1e9) | 0); for (const s of loot) if (s) { const it = dropItem(s.id, s.count, x + 0.5, y + 1.2, z + 0.5, true); } Sfx.play('levelup', 0.6); toast('Trial complete!', 2); } }
  }
}
{ const _ua = useAction; useAction = function (eye, dir) {
    if (target && BL[target.id].use === 'vault') { mouseR = false; const k = 'vault:' + target.x + ',' + target.y + ',' + target.z; const loot = world.chestLoot.get(k) || 'trial_vault'; const need = loot === 'ominous_vault' ? IT.ominous_trial_key : IT.trial_key; const h = player.held();
      const who = k + ':' + myName(); if (world.vaultUsed.has(who)) { toast('You already opened this vault', 1.5); return; }
      if (!h || h.id !== need) { toast(loot === 'ominous_vault' ? 'Needs an Ominous Trial Key' : 'Needs a Trial Key', 1.5); return; }
      useHeld(1); world.vaultUsed.add(who); const items = rollLoot(loot, ihash(target.x, target.y, target.z, (Math.random() * 1e9) | 0)); let n = 0; for (const s of items) if (s) { n++; dropItem(s.id, s.count, target.x + 0.5, target.y + 1.1, target.z + 0.5, true, s.ench ? { ench: s.ench } : undefined); if (n >= 3) break; }
      Sfx.play('levelup', 0.7); Particles.emit(target.x + 0.5, target.y + 1, target.z + 0.5, 20, [[1, 0.8, 0.3]], 3, 0.8, -1, 0.6); return; }
    return _ua(eye, dir);
  }; }
// vaults used and trial spawner cooldowns are saved with the world
{ const _pk = packWorld; packWorld = function (w) { const r = _pk(w); if (w.vaultUsed) r.vaults = [...w.vaultUsed]; return r; };
  const _up = unpackWorld; unpackWorld = function (w, d) { const r = _up(w, d); if (d && d.vaults) { w.vaultUsed = new Set(d.vaults); } return r; }; }

// ---------- guardians ----------
const GUARD = [104, 156, 140], GUARD2 = [214, 120, 60];
function guardianModel(m, r, s, k) {
  sbox(m, r, 0.8 * s, 0.8 * s, 0.8 * s, 0, 0.42 * s, 0, k + '_body', fur(GUARD, 6, { speck: [[80, 120, 110], 0.2], extra: (f, set, fw, fh) => { if (f === 'front') { const cx = fw >> 1, cy = fh >> 1; for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) set(x, y, [240, 240, 230]); set(cx, cy, [160, 40, 20]); } } }));
  m.spikes = []; for (const [x, y, z] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, -1], [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0]]) { const p = sbox(m, r, 0.08 * s, 0.08 * s, 0.08 * s, x * 0.48 * s, (0.42 + y * 0.48) * s, z * 0.48 * s, k + '_spike', fur(GUARD2, 3)); m.spikes.push(p); }
  m.tail = pivot(r, 0, 0.42 * s, -0.4 * s); for (let i = 0; i < 3; i++) sbox(m, m.tail, 0.18 * s * (1 - i * 0.25), 0.18 * s * (1 - i * 0.25), 0.3 * s, 0, 0, -0.15 * s - i * 0.3 * s, k + '_tail' + i, fur(GUARD2, 4));
}
MOBS.guardian = { name: 'Guardian', hp: 30, w: 0.85, h: 0.85, speed: 2, kind: 'hostile', dmg: 6, snd: 'squish', persist: true, egg: [[90, 130, 112], [241, 126, 49]], drops: [['prismarine_shard', 0, 2, 1], ['cod', 0, 1, 0.4], ['prismarine_crystals', 0, 1, 0.33]], build(m, r) { guardianModel(m, r, 1, 'gd'); } };
MOBS.elder_guardian = { name: 'Elder Guardian', hp: 80, w: 2, h: 2, speed: 1.2, kind: 'hostile', dmg: 8, snd: 'squish', persist: true, egg: [[206, 204, 186], [116, 118, 148]], drops: [['prismarine_shard', 0, 2, 1], ['wet_sponge', 1, 1, 1], ['prismarine_crystals', 0, 1, 0.5]], build(m, r) { guardianModel(m, r, 2.35, 'egd'); const c = new THREE.Color(0.85, 0.85, 0.8); for (const mt of m.mats) mt[1] = c; } };
AQUATIC.add('guardian'); AQUATIC.add('elder_guardian'); MOB_XP.guardian = [10, 10]; MOB_XP.elder_guardian = [10, 10]; MOB_PITCH.guardian = 1.2; MOB_PITCH.elder_guardian = 0.7;
for (const k of ['guardian', 'elder_guardian']) MOBS[k].tick = function (m, dt) {
  const elder = k === 'elder_guardian'; const P = G.player; const inW = inWater(m, m.h * 0.5);
  if (elder) { m.curseT = (m.curseT || 5) - dt; if (m.curseT <= 0) { m.curseT = 60; if (P && !P.dead && isSurv() && P.pos.distanceTo(m.pos) < 50) { giveEffect('mining_fatigue', 300, 2); toast('An Elder Guardian has cursed you', 2); Sfx.play('ghast', 0.6, 0.6); } } }
  // laser: lock on, charge for 2 s (3 for elders), then hit
  const can = P && !P.dead && isSurv() && P.pos.distanceTo(m.pos) < 15 && inW && lineOfSight(m.pos.clone().add(new V3(0, m.h / 2, 0)), P.eye());
  if (can) { m.beamT = (m.beamT || 0) + dt; lookAtP(m, P, dt); m.wMove = 0; if (!m.beam) { m.beam = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1), new THREE.MeshBasicMaterial({ color: 0xffe080 })); G.scene.add(m.beam); }
    const a = m.pos.clone().add(new V3(0, m.h / 2, 0)), b = P.eye().add(new V3(0, -0.3, 0)); m.beam.position.copy(a).add(b).multiplyScalar(0.5); m.beam.scale.z = a.distanceTo(b); m.beam.lookAt(b); m.beam.material.color.setHSL(0.12 - Math.min(1, m.beamT / 2) * 0.12, 1, 0.5 + Math.sin(m.age * 20) * 0.1);
    if (m.beamT >= (elder ? 3 : 2)) { m.beamT = 0; P.hurtCD = 0; P.hurt(elder ? 8 : 6, null, 'a ' + m.t.name, 0); } }
  else { m.beamT = 0; if (m.beam) { G.scene.remove(m.beam); m.beam = null; } }
  if (m.spikes) m.spikes.forEach((s, i) => s.scale.setScalar(can ? 1.4 : 1 + Math.sin(m.age * 2 + i) * 0.15));
  const r = swimTick(m, dt, { speed: can ? 0.6 : m.t.speed, range: 8, agile: 1.5, dry: 20 });
  return r;
};
{ const _rm = Mob.prototype.remove; Mob.prototype.remove = function () { if (this.beam) { G.scene.remove(this.beam); this.beam = null; } return _rm.apply(this, arguments); }; }
// guardian spikes hurt whoever hits them in melee (unless they are attacking)
{ const _h = Mob.prototype.hurt; Mob.prototype.hurt = function (dmg, src, kb, na) { const r = _h.call(this, dmg, src, kb, na); if ((this.type === 'guardian' || this.type === 'elder_guardian') && src === player.pos && !this.beamT && player.pos.distanceTo(this.pos) < 4) { player.hurtCD = 0; player.hurt(2, this.pos, 'a ' + this.t.name, 0.4); } return r; }; }
// mining fatigue: digging gets much slower (III: about 1/370 speed in Minecraft, here 1/27)
{ const _bt = breakTime; breakTime = function (id, tool) { const t = _bt(id, tool); const mf = effLevel('mining_fatigue'); return mf ? t * Math.pow(3, Math.min(3, mf)) : t; }; }

// ---------- sculk, shriekers and the Warden ----------
MOBS.warden = { name: 'Warden', hp: 500, w: 0.9, h: 2.9, speed: 2.6, kind: 'hostile', dmg: 30, kb: 1.5, snd: 'roar', persist: true, egg: [[15, 71, 82], [57, 214, 224]], drops: [],
  build(m, r) { const WD = [20, 52, 64], WL = [60, 210, 220]; sbox(m, r, 1.1, 1.1, 0.6, 0, 1.75, 0, 'wd_body', fur(WD, 6, { speck: [WL, 0.06], extra: (f, set, fw, fh) => { if (f === 'front') for (let y = 2; y < fh - 2; y++) set(fw >> 1, y, [80, 120, 110]); } }), {});
    sbox(m, r, 0.5, 0.35, 0.4, 0, 1.03, 0, 'wd_hip', fur(WD, 6)); const h = pivot(r, 0, 2.3, 0); m.head = h; sbox(m, h, 1.0, 0.8, 0.8, 0, 0.4, 0, 'wd_head', fur(WD, 6, { extra: (f, set, fw, fh) => { if (f === 'front') { for (let x = 2; x < fw - 2; x++) set(x, fh - 3, [10, 20, 26]); } } }));
    for (const s of [-1, 1]) { const e = pivot(h, s * 0.55, 0.65, 0); sbox(m, e, 0.4, 0.5, 0.1, s * 0.2, 0.1, 0, 'wd_horn', fur(WL, 3), { glowAll: true }); }
    m.arms = []; for (const s of [-1, 1]) { const a = pivot(r, s * 0.7, 2.2, 0); sbox(m, a, 0.4, 1.5, 0.4, 0, -0.7, 0, 'wd_arm', fur(WD, 6)); m.arms.push(a); }
    m.legs = []; for (const s of [-1, 1]) { const l = pivot(r, s * 0.25, 0.85, 0); sbox(m, l, 0.4, 0.85, 0.4, 0, -0.42, 0, 'wd_leg', fur(WD, 6)); m.legs.push(l); }
    m.heart = sbox(m, r, 0.3, 0.3, 0.1, 0, 1.85, 0.31, 'wd_heart', fur([60, 220, 230], 3), { glowAll: true }); } };
MOB_XP.warden = [5, 5]; MOB_PITCH.warden = 0.5;
// the warden is blind: it goes for the last place it heard something, or you if it can smell you up close
MOBS.warden.tick = function (m, dt) {
  const P = G.player; m.age += dt; m.hurtT = Math.max(0, m.hurtT - dt); m.atkCD = (m.atkCD || 0) - dt; m.light = 1; m.lightT = 9; m.anger = Math.max(0, (m.anger || 0) - dt * 2);
  if (m.emergeT == null) { m.emergeT = 6.7; Sfx.at('roar', m.pos, 1); } if (m.emergeT > 0) { m.emergeT -= dt; m.root.position.set(m.pos.x, m.pos.y - (m.emergeT / 6.7) * 2.9, m.pos.z); Particles.emit(m.pos.x, m.pos.y, m.pos.z, 2, [[0.2, 0.2, 0.25]], 2, 0.6, 8, 0.8); m.colorize(); return true; }
  if (P && !P.dead && isSurv()) { const d = P.pos.distanceTo(m.pos); const loud = Math.hypot(P.vel.x, P.vel.z) > 1.5 && !P.sneaking; if ((loud && d < 16) || d < 4) { m.heard = P.pos.clone(); m.anger = Math.min(150, m.anger + dt * (d < 4 ? 40 : 20)); } }
  if (Math.random() < dt * 0.8) giveEffect('darkness', 12, 0);
  let goal = m.heard; if (m.anger > 80 && P && !P.dead) goal = P.pos;
  if (goal) { steerTo(m, goal, 1.2); const d = P ? P.pos.distanceTo(m.pos) : 99;
    if (P && d < 2.4 && m.atkCD <= 0 && m.anger > 40) { m.atkCD = 0.9; P.hurt(m.t.dmg, m.pos, 'the Warden', 1.6); if (m.arms) for (const a of m.arms) a.rotation.x = -1.4; }
    m.boomT = (m.boomT || 8) - dt; if (P && m.anger > 80 && d > 3 && d < 15 && m.boomT <= 0) { m.boomT = 5; Sfx.at('roar', m.pos, 0.8, 1.6); const a = m.pos.clone().add(new V3(0, 2, 0)), b = P.eye(); for (let i = 0; i < 12; i++) { const p = a.clone().lerp(b, i / 12); Particles.emit(p.x, p.y, p.z, 3, [[0.4, 0.9, 0.95]], 1, 0.6, 0, 0.4); } P.hurtCD = 0; const armor = 0; P.hurt(10, null, 'the Warden', 0); const dir = b.sub(a).normalize(); P.vel.addScaledVector(dir, 6); } }
  m.heartPulse = (m.heartPulse || 0) + dt * (1 + m.anger / 40); if (m.heart) m.heart.scale.setScalar(1 + Math.sin(m.heartPulse * 6) * 0.25);
  m.lostT = goal ? 0 : (m.lostT || 0) + dt; if (m.lostT > 60 && !isClientMP()) { m.gone = true; Particles.emit(m.pos.x, m.pos.y, m.pos.z, 30, [[0.2, 0.2, 0.25]], 3, 0.8, 8, 1); }
  return false;
};
{ const _h = Mob.prototype.hurt; Mob.prototype.hurt = function (dmg, src, kb, na) { if (this.type === 'warden') { kb = 0.1; this.anger = 150; if (src) this.heard = src.clone ? src.clone() : this.heard; } return _h.call(this, dmg, src, kb, na); }; }
// shriekers: walking (not sneaking) near sculk sensors or shriekers sets them off; the 4th warning brings the Warden
S.warn = 0;
function updateSculk(dt) {
  if (!world || world.dim !== 'overworld' || isClientMP()) return; const P = player; S.warnCD = (S.warnCD || 0) - dt; S.warnDecay = (S.warnDecay || 0) + dt; if (S.warnDecay > 600) { S.warnDecay = 0; S.warn = Math.max(0, S.warn - 1); }
  if (P.dead || !isSurv() || P.sneaking || Math.hypot(P.vel.x, P.vel.z) < 1.2 || S.warnCD > 0 || P.pos.y > YOFF - 30) return;
  const x0 = Math.floor(P.pos.x), y0 = Math.floor(P.pos.y), z0 = Math.floor(P.pos.z); let shrieker = null;
  for (let dx = -8; dx <= 8 && !shrieker; dx++) for (let dy = -3; dy <= 3 && !shrieker; dy++) for (let dz = -8; dz <= 8; dz++) { const id = world.get(x0 + dx, y0 + dy, z0 + dz); if (id === B.SCULK_SHRIEKER || (id === B.SCULK_SENSOR && Math.abs(dx) + Math.abs(dz) < 5)) { shrieker = [x0 + dx, y0 + dy, z0 + dz]; break; } }
  if (!shrieker) return; S.warnCD = 10; S.warn++; S.warnDecay = 0; const sp = new V3(shrieker[0] + 0.5, shrieker[1] + 1, shrieker[2] + 0.5);
  Sfx.at('scream', sp, 1, 0.5); Particles.emit(sp.x, sp.y, sp.z, 20, [[0.3, 0.9, 0.95]], 2, 1, -2, 0.8); giveEffect('darkness', 12, 0);
  if (S.warn >= 4 && !G.mobs.some(m => m.type === 'warden' && !m.dead)) { S.warn = 0; for (let k = 0; k < 30; k++) { const x = x0 + (Math.random() * 20 | 0) - 10, z = z0 + (Math.random() * 20 | 0) - 10; for (let y = y0 + 4; y > y0 - 6; y--) if (freeAt(x, y, z, 3) && SOLID[world.get(x, y - 1, z)]) { spawnMob('warden', x + 0.5, y, z + 0.5); toast('The Warden is coming', 3); k = 99; break; } } }
  else toast(['', 'Something heard you', 'It is getting closer', 'It is very close'][S.warn] || '', 2);
}
// Darkness: the light around you pulses down
{ const _up = updateEffects; updateEffects = function (dt) { const r = _up.apply(this, arguments); return r; }; }
{ const _ub = updateBoats; updateBoats = function (dt) { const r = _ub(dt); updateTrials(dt); updateSculk(dt); return r; }; }
{ const _rf = renderFrame; renderFrame = function () { if (typeof effLevel === 'function' && effLevel('darkness') && typeof scene !== 'undefined' && scene.fog) { const k = 0.5 + 0.5 * Math.sin(performance.now() / 600); const f = scene.fog; const n0 = f.near, f0 = f.far; f.near = 2; f.far = 10 + k * 8; const r = _rf.apply(this, arguments); f.near = n0; f.far = f0; return r; } return _rf.apply(this, arguments); }; }
// /locate for the big structures
{ const _lc = CMDS.locate.run; CMDS.locate.run = function (a, ctx) {
    const name = String(a[1] || '').toLowerCase().replace(/^minecraft:/, ''); const kind = STRUCT_NAMES[name];
    if (a[0] === 'structure' && ['trial_chambers', 'ocean_monument', 'ancient_city'].includes(kind)) {
      if (world.dim !== 'overworld') throw new CmdError('That structure is in the Overworld'); const P = player.pos; const sp = PLACE[kind].spacing; const prx = Math.floor(P.x / 16 / sp), prz = Math.floor(P.z / 16 / sp); let best = null;
      for (let rr = 0; rr <= 12; rr++) { for (let rx = prx - rr; rx <= prx + rr; rx++) for (let rz = prz - rr; rz <= prz + rr; rz++) { if (Math.max(Math.abs(rx - prx), Math.abs(rz - prz)) !== rr) continue; const st = regionStart(world, kind, rx, rz); if (!st || (kind === 'ocean_monument' && st.col.h > SEA - 18)) continue; const x = st.cx * 16 + 8, z = st.cz * 16 + 8, d = Math.hypot(x - P.x, z - P.z); if (!best || d < best[3]) best = [x, kind === 'trial_chambers' ? trialLayout(world, st).y : kind === 'ancient_city' ? YOFF - 51 : null, z, d]; } if (best) break; }
      if (!best) throw new CmdError('Could not find a structure of type "' + name + '" within reasonable distance');
      chatPrint('The nearest ' + name + ' is at [' + best[0] + ', ' + (best[1] != null ? best[1] - world.yOff : '~') + ', ' + best[2] + '] (' + Math.round(best[3]) + ' blocks away)', '#7ef'); return;
    }
    return _lc.call(this, a, ctx);
  }; }

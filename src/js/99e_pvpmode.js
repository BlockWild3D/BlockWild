// ================= MULTIPLAYER: HOST-ONLY CONTROL, SHARED DEATH DROPS, SHARED END CRYSTALS =================
function mpClient() { return typeof MP !== 'undefined' && MP.active && MP.role === 'client'; }
// Only the host runs commands (free ones like /help, /msg and /list still work for everyone), and only the host
// changes game modes. The host can still change a friend's mode with /gamemode <mode> <name>.
{ const _rc = runCommand; runCommand = function (line, ctx) {
    ctx = ctx || {}; line = String(line).replace(/^\s*\//, ''); // the host's commands on friends arrive as '/gamemode ...'
    if (mpClient() && !ctx.remote) { const args = tokenize(line); const name = strip(args.shift() || ''); const c = CMDS[CMD_ALIAS[name] || name];
      if (c && !c.free) { chatPrint('Only the host can use commands in this world', '#f66'); return false; } }
    return _rc.call(this, line, ctx); }; }
function hostOnlyRows() { const cl = mpClient(); for (const id of ['modeSeg2', 'cheatSeg']) { const el = $(id); if (el && el.parentNode) el.parentNode.style.display = cl ? 'none' : ''; } }
{ const _op = openPause; openPause = function () { hostOnlyRows(); return _op.apply(this, arguments); }; }
{ const _rp = typeof renderMpPanel === 'function' ? renderMpPanel : null; if (_rp) renderMpPanel = function () { const r = _rp.apply(this, arguments); hostOnlyRows(); return r; }; }
// the host ignores messages only the host may send (a modified client could otherwise run commands or change rules)
{ const _on = onPeerMsg; onPeerMsg = function (peer, m) {
    if (MP.role === 'host' && peer && peer.id !== 'host' && (m.t === 'cmd' || m.t === 'rules' || m.t === 'time' || m.t === 'bye')) return;
    if (m.t === 'sdrop') return sharedDropIn(peer, m);
    if (m.t === 'sclaim') { if (MP.role === 'host') sharedClaim(m.nid, peer.id); return; }
    if (m.t === 'sgrant') return sharedGrant(m.nid);
    if (m.t === 'staken') { sharedTaken(m.nid, m.orb); if (MP.role === 'host' && peer.id !== 'host' && m.orb) mpSendAll(m, false, peer.id); return; }
    if (m.t === 'xtal') { xtalIn(m); if (MP.role === 'host' && peer.id !== 'host') mpSendAll(m, false, peer.id); return; }
    return _on(peer, m); }; }

// ---- death drops everyone can see and pick up ----
// When anyone dies in Survival (host or friend), their items and experience fall where they died for everybody in that
// dimension. Items are shared: the host decides who touched a stack first, so it can't be picked up twice.
MP.shared = new Set(); let sharedSeq = 0; G.shareCap = null;
const SHARE_HOLD = 1e9; // a shared stack waits for the host's go-ahead instead of the usual instant pick-up
{ const _di = dropItem; dropItem = function (id, count, x, y, z, burst, extra) {
    const it = _di.apply(this, arguments); if (G.shareCap && it && it.pos && id) { it.nid = MP.myId + ':' + (++sharedSeq); it.pickDelay = SHARE_HOLD;
      G.shareCap.items.push([it.nid, ITEMS[id].key, it.count, +it.pos.x.toFixed(2), +it.pos.y.toFixed(2), +it.pos.z.toFixed(2), +it.vel.x.toFixed(2), +it.vel.y.toFixed(2), +it.vel.z.toFixed(2), extra || null]); }
    return it; }; }
{ const _so = spawnOrb; spawnOrb = function (x, y, z, v) { const n0 = G.orbs.length; const r = _so.apply(this, arguments);
    if (G.shareCap) for (let i = n0; i < G.orbs.length; i++) { const o = G.orbs[i]; o.nid = MP.myId + ':o' + (++sharedSeq); G.shareCap.orbs.push([o.nid, +x.toFixed(2), +y.toFixed(2), +z.toFixed(2), o.value, +o.vel.x.toFixed(2), +o.vel.y.toFixed(2), +o.vel.z.toFixed(2)]); }
    return r; }; }
{ const _die = Player.prototype.die; Player.prototype.die = function (cause) {
    if (this !== player || !(typeof MP !== 'undefined' && MP.active) || S.rules.arena) return _die.apply(this, arguments);
    G.shareCap = { items: [], orbs: [] }; let r;
    try { r = _die.apply(this, arguments); } finally { const c = G.shareCap; G.shareCap = null;
      if (c.items.length || c.orbs.length) { const m = { t: 'sdrop', dim: world.dim, items: c.items, orbs: c.orbs };
        if (MP.role === 'host') { for (const s of c.items) MP.shared.add(s[0]); mpSendAll(m); } else mpToHost(m); } }
    return r; }; }
function sharedDropIn(peer, m) {
  if (MP.role === 'host') { for (const s of m.items) MP.shared.add(s[0]); mpSendAll(m, false, peer.id); }
  if (m.dim !== world.dim) return;
  for (const [nid, key, n, x, y, z, vx, vy, vz, ex] of m.items) { if (IT[key] == null) continue; const it = dropItem(IT[key], n, x, y, z, false, ex || undefined);
    if (it && it.vel) { it.vel.set(vx, vy, vz); it.nid = nid; it.pickDelay = SHARE_HOLD; } }
  for (const [nid, x, y, z, v, vx, vy, vz] of m.orbs || []) { const n0 = G.orbs.length; spawnOrb(x, y, z, v); for (let i = n0; i < G.orbs.length; i++) { G.orbs[i].nid = nid; G.orbs[i].vel.set(vx, vy, vz); } }
}
function roomFor(id, extra) { const max = stackMax(id); for (let i = 0; i < 36; i++) { const s = player.inv[i]; if (!s) return true; if (s.id === id && !extra && !xtra(s) && s.count < max) return true; } return false; }
function sharedClaim(nid, who) { // host only
  if (!MP.shared.has(nid)) return; MP.shared.delete(nid);
  if (who === 'host' || who === MP.myId) sharedGrant(nid); else { const p = MP.peers.get(who); if (p) p.link.send({ t: 'sgrant', nid }); }
  const m = { t: 'staken', nid }; for (const p of MP.peers.values()) if (p.id !== who && p.joined) p.link.send(m); if (who !== 'host') sharedTaken(nid);
}
function sharedGrant(nid) {
  const it = G.items.find(i => i.nid === nid && !i.gone); if (!it) return;
  const left = addItem(it.id, it.count, it.extra); Sfx.play('pop', 0.5); it.gone = true; it.remove();
  if (left > 0) { G.shareCap = { items: [], orbs: [] }; try { dropItem(it.id, left, player.pos.x, player.pos.y + 0.5, player.pos.z, false, it.extra); } finally { const c = G.shareCap; G.shareCap = null; const m = { t: 'sdrop', dim: world.dim, items: c.items, orbs: [] }; if (MP.role === 'host') { for (const s of c.items) MP.shared.add(s[0]); mpSendAll(m); } else mpToHost(m); } }
}
function sharedTaken(nid, orb) {
  if (orb) { for (const o of G.orbs) if (o.nid === nid && !o.gone) { o.gone = true; G.scene.remove(o.mesh); } return; }
  for (const it of G.items) if (it.nid === nid && !it.gone) { it.gone = true; it.remove(); }
}
function sharedTick() {
  if (!(typeof MP !== 'undefined' && MP.active) || player.dead || S.mode === 'spectator') return; const P = player, now = performance.now();
  for (const it of G.items) { if (it.gone || !it.nid || it.age < 0.5 || (it.claimT && now - it.claimT < 1500)) continue;
    const ex = P.hw + 1 + 0.125, dy = it.pos.y - P.pos.y;
    if (Math.abs(it.pos.x - P.pos.x) < ex && Math.abs(it.pos.z - P.pos.z) < ex && dy > -0.75 && dy < P.h + 0.5 && roomFor(it.id, it.extra)) {
      it.claimT = now; if (MP.role === 'host') sharedClaim(it.nid, 'host'); else mpToHost({ t: 'sclaim', nid: it.nid }); } }
}
// a shared orb you collect disappears for everybody else
{ const _uo = updateOrbs; updateOrbs = function (dt) { const before = G.orbs.filter(o => o.nid && !o.gone); const r = _uo.apply(this, arguments);
    if (typeof MP !== 'undefined' && MP.active) for (const o of before) if (o.gone && o.age <= 300 && !o.takenRemote) mpSend({ t: 'staken', nid: o.nid, orb: 1 });
    return r; }; }
{ const _st = sharedTaken; sharedTaken = function (nid, orb) { if (orb) for (const o of G.orbs) if (o.nid === nid) o.takenRemote = true; return _st(nid, orb); }; }

// ---- end crystals are shared: placing, popping and the blast reach every player ----
function crystalAt(x, y, z) { const k = x + ',' + y + ',' + z; return G.mobs.find(m => m.isCrystal && m.placed && !m.dead && m.spot === k); }
{ const _pc = placeEndCrystal; placeEndCrystal = function (x, y, z, quiet) { const r = _pc.apply(this, arguments);
    if (r && typeof MP !== 'undefined' && MP.active && !MP.applying) mpSend({ t: 'xtal', a: 1, dim: world.dim, x, y, z }); return r; }; }
{ const _h = PlacedCrystal.prototype.hurt; PlacedCrystal.prototype.hurt = function () {
    if (!this.dead && typeof MP !== 'undefined' && MP.active && !MP.applying && this.spot) { const [x, y, z] = this.spot.split(',').map(Number); mpSend({ t: 'xtal', a: 0, dim: world.dim, x, y, z }); }
    return _h.apply(this, arguments); };
  const _bg = PlacedCrystal.prototype.blastGone; PlacedCrystal.prototype.blastGone = function () {
    if (!this.dead && typeof MP !== 'undefined' && MP.active && !MP.applying && this.spot) { const [x, y, z] = this.spot.split(',').map(Number); mpSend({ t: 'xtal', a: 0, dim: world.dim, x, y, z }); }
    return _bg.apply(this, arguments); }; }
function xtalIn(m) {
  if (m.dim !== world.dim) return; MP.applying = true;
  try { if (m.a === 1) { if (!crystalAt(m.x, m.y, m.z) && !world.get(m.x, m.y, m.z)) { const c = new PlacedCrystal(m.x, m.y, m.z); c.hw = 1; c.w = world; c.spot = m.x + ',' + m.y + ',' + m.z; G.mobs.push(c);
        (world.placedCrystals = world.placedCrystals || []).push(c); (world.crystalSpots = world.crystalSpots || new Set()).add(c.spot); } }
    else { const c = crystalAt(m.x, m.y, m.z); if (c) c.blastGone(); } }
  finally { MP.applying = false; }
}

// ================= PVP MODE: AN ARENA WITH CAGES AND KITS =================
// A world type of its own (pick "PvP" when you make a world, or host one for friends). Everyone spawns in a glass cage
// at the edge of a walled arena on a floating island, picks a kit, and after a 3 second countdown the cage opens.
// Die and you're back in your cage to pick again. Nothing drops in the arena, mobs don't spawn and it stays midday.
// The host can put the arena back the way it was with /arena reset. The kits are my own take on the popular PvP
// practice kits (Sword, Axe, Crystal, Mace and so on), not an official list.
const AR = { R: 40, Y: SEA + 1, E: 44, feat: null, seed: null, round: 0 };
// every round the host moves to the next map: a new layout (the seed moves on) and the next look in this list
const arB = (k, f) => B[k] != null ? B[k] : f;
const AR_THEMES = [
  { name: 'Meadow', top: B.GRASS, sub: B.DIRT, deep: B.STONE, rocks: [B.COBBLESTONE, B.MOSSY_COBBLESTONE, B.STONE], log: B.LOG, leaves: B.LEAVES, flower: B.DANDELION },
  { name: 'Desert', top: arB('SAND', B.GRASS), sub: arB('SANDSTONE', B.DIRT), deep: arB('SANDSTONE', B.STONE), rocks: [arB('SANDSTONE', B.STONE), arB('SMOOTH_SANDSTONE', B.STONE), arB('CUT_SANDSTONE', B.STONE)], log: arB('CUT_SANDSTONE', B.STONE), leaves: 0, flower: arB('DEAD_BUSH', 0), rocksN: 12, treesN: 6 },
  { name: 'Snowy Taiga', top: arB('SNOWY_GRASS', B.GRASS), sub: B.DIRT, deep: B.STONE, rocks: [arB('PACKED_ICE', B.STONE), B.STONE, arB('SNOW_BLOCK', B.STONE)], log: arB('SPRUCE_LOG', B.LOG), leaves: arB('SPRUCE_LEAVES', B.LEAVES), flower: 0, treesN: 9 },
  { name: 'Nether', top: arB('CRIMSON_NYLIUM', B.GRASS), sub: arB('NETHERRACK', B.DIRT), deep: arB('NETHERRACK', B.STONE), rocks: [arB('BLACKSTONE', B.STONE), arB('BASALT', B.STONE), arB('NETHERRACK', B.STONE)], log: arB('CRIMSON_STEM', B.LOG), leaves: arB('NETHER_WART_BLOCK', B.LEAVES), flower: 0, glow: arB('SHROOMLIGHT', 0) },
  { name: 'The End', top: arB('END_STONE', B.STONE), sub: arB('END_STONE', B.STONE), deep: arB('END_STONE', B.STONE), rocks: [arB('END_STONE_BRICKS', B.STONE), arB('PURPUR_BLOCK', B.STONE), arB('END_STONE', B.STONE)], log: arB('OBSIDIAN', B.STONE), leaves: 0, flower: 0, rocksN: 6, treesN: 7 },
];
function arTheme() { if (AR.themeOverride) return AR.themeOverride; return AR_THEMES[((AR.round % AR_THEMES.length) + AR_THEMES.length) % AR_THEMES.length]; }
function arSeed(w) { return ((w.seed | 0) + AR.round * 7919) | 0; }
function arenaFeatures(seed) {
  const T = arTheme(); if (AR.feat && AR.seed === seed && AR.featT === T) return AR.feat; // (one cache: duels with several arenas rebuild it when the arena changes) const F = new Map(); const r = mulberry32((seed ^ 0x5eed) >>> 0); const Y = AR.Y;
  const put = (x, y, z, id) => F.set(x + ',' + y + ',' + z, id);
  const pads = arenaSpots(); const clear = (x, z, d) => Math.hypot(x, z) > 9 && pads.every(([px, pz]) => Math.hypot(x - px, z - pz) > d) && Math.abs(x) < AR.R - 5 && Math.abs(z) < AR.R - 5;
  // boulders
  for (let n = 0, tries = 0; n < (T.rocksN || 9) && tries < 300; tries++) { const x = Math.round((r() * 2 - 1) * (AR.R - 6)), z = Math.round((r() * 2 - 1) * (AR.R - 6)); if (!clear(x, z, 6)) continue; n++;
    const rad = 1.4 + r() * 1.4, hy = 0.7 + r() * 0.5;
    for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) for (let dy = 0; dy <= 4; dy++) { if (Math.hypot(dx, dz, dy / hy) > rad + (r() - 0.5) * 0.6) continue; const v = r(); put(x + dx, Y + dy, z + dz, v < 0.45 ? T.rocks[0] : v < 0.75 ? T.rocks[1] : T.rocks[2]); } }
  // a few trees
  for (let n = 0, tries = 0; n < (T.treesN || 5) && tries < 300; tries++) { const x = Math.round((r() * 2 - 1) * (AR.R - 7)), z = Math.round((r() * 2 - 1) * (AR.R - 7)); if (!clear(x, z, 7)) continue; n++;
    const h = 4 + ((r() * 3) | 0) + (T.leaves ? 0 : 2);
    if (T.leaves)     for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = h - 2; dy <= h + 1; dy++) { const rr = dy >= h ? 1.5 : 2.4; if (Math.hypot(dx, dz) > rr || (Math.abs(dx) === 2 && Math.abs(dz) === 2 && r() < 0.6)) continue; put(x + dx, Y + dy, z + dz, T.glow && r() < 0.06 ? T.glow : T.leaves); }
    for (let dy = 0; dy < h; dy++) put(x, Y + dy, z, T.log); }
  AR.feat = F; AR.seed = seed; AR.featT = T; return F;
}
function arenaSpots() { const out = []; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; out.push([Math.round(Math.cos(a) * 30), Math.round(Math.sin(a) * 30)]); } return out; }
const AR_PAD = new Set(); for (const [px, pz] of arenaSpots()) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) AR_PAD.add((px + dx) + ',' + (pz + dz));
// the block the arena has at x, y, z (before anyone touches it)
function arenaAt(seed, x, y, z) {
  const E = AR.E, R = AR.R, Y = AR.Y; if (x < -E || x >= E || z < -E || z >= E) return 0; const T = arTheme();
  const f = arenaFeatures(seed).get(x + ',' + y + ',' + z); if (f !== undefined) return f;
  const h = ihash(x, z, 77, seed); const e = Math.min(x + E, E - 1 - x, z + E, E - 1 - z); // 0 on the island's rim
  const depth = Math.min(13, 3 + e * 1.4 + (h & 3)); const wall = (x === -R - 1 || x === R || z === -R - 1 || z === R) && x >= -R - 1 && x <= R && z >= -R - 1 && z <= R;
  const corner = (Math.abs(x + 0.5) >= R - 1 && Math.abs(x + 0.5) <= R + 2) && (Math.abs(z + 0.5) >= R - 1 && Math.abs(z + 0.5) <= R + 2);
  if (y >= Y) { // above the ground: walls, corner towers, lanterns, flowers
    if (corner) { const top = Y + 6; if (y < top) return (h % 7 === 0) ? B.CRACKED_STONE_BRICKS : (h % 5 === 0) ? B.MOSSY_STONE_BRICKS : B.STONE_BRICKS; if (y === top) return (Math.abs(x + 0.5) === R + 0.5 && Math.abs(z + 0.5) === R + 0.5) ? B.LANTERN : ((x + z) & 1) ? B.STONE_BRICK_WALL : 0; return 0; }
    if (wall) { if (y < Y + 3) return ((h >> 3) % 9 === 0) ? B.MOSSY_STONE_BRICKS : ((h >> 3) % 13 === 0) ? B.CRACKED_STONE_BRICKS : (y === Y + 1 && ((x + z) % 12 === 0)) ? B.CHISELED_STONE_BRICKS : B.STONE_BRICKS;
      if (y === Y + 3) return ((x % 10 === 0 && Math.abs(z + 0.5) === R + 0.5) || (z % 10 === 0 && Math.abs(x + 0.5) === R + 0.5)) ? B.LANTERN : B.STONE_BRICK_WALL; return 0; }
    if (y === Y && !AR_PAD.has(x + ',' + z) && Math.hypot(x, z) > 4 && (h >> 5) % 61 === 0) return T.flower || 0;
    return 0; }
  const d = Y - 1 - y; if (d >= depth) return 0; if (d === depth - 1 && e >= 6) return B.BEDROCK;
  if (d === 0) { if (AR_PAD.has(x + ',' + z)) return B.SMOOTH_STONE; const rc = Math.hypot(x + 0.5, z + 0.5); if (rc < 3.6) return rc < 1.5 ? B.CHISELED_STONE_BRICKS : B.POLISHED_ANDESITE; return wall || corner ? B.STONE_BRICKS : T.top; }
  return d < 4 ? T.sub : T.deep;
}
function arenaChunk(w, cx, cz) {
  const c = new Chunk(cx, cz); const d = c.d; const bx = cx * 16, bz = cz * 16; const E = AR.E;
  if (bx + 15 >= -E && bx < E && bz + 15 >= -E && bz < E) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) for (let y = AR.Y - 15; y <= AR.Y + 12; y++) { const id = arenaAt(arSeed(w), bx + x, y, bz + z); if (id) d[(y * 16 + z) * 16 + x] = id; }
  const e = w.edits.get(c.key); if (e) for (const [i, id] of e) d[i] = id;
  c.scanMeta(); w.chunks.set(c.key, c);
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (dx || dz) { const n = w.getChunk(cx + dx, cz + dz); if (n) n.dirty = true; }
  w.hintsDone.add(c.key); return c;
}
{ const _g = World.prototype.generate; World.prototype.generate = function (cx, cz) {
    if (this.dim === 'overworld' && S.rules.arena) { const g = this.gen; // the whole arena counts as plains (grass colour, sky, the biome shown)
      if (!g._arena) { g._arena = true; const oc = g.column.bind(g); g.column = (x, z) => { const c = oc(x, z); return c._ar || (c._ar = Object.assign({}, c, { b: BIO.PLAINS, v: 0, h: AR.Y - 1 })); }; }
      return arenaChunk(this, cx, cz); }
    return _g.apply(this, arguments); }; }
// the world menu gets a PvP choice; a PvP world fixes its rules
{ const seg = $('modeSeg'); if (seg && !seg.querySelector('[data-m="pvp"]')) { const b = document.createElement('button'); b.dataset.m = 'pvp'; b.textContent = 'PvP'; b.title = 'An arena with cages and kits'; seg.appendChild(b);
    b.addEventListener('click', () => { for (const x of seg.children) x.classList.toggle('on', x === b); pendingMode = 'pvp'; }); } }
{ const _sw = startWorld; startWorld = function (data) {
    S.rules.arena = false; S.arena = null;
    if (data && data.mode === 'pvp') { data.mode = 'survival'; data.time = 0.25; data.rules = Object.assign({}, data.rules, { arena: true, pvp: true, doMobSpawning: false, doDaylightCycle: false, doWeatherCycle: false, keepInventory: false, mobGriefing: false, doFireTick: false }); }
    const r = _sw.apply(this, arguments); if (S.rules.arena) S.arena = { phase: 'dead', kit: null }; return r; }; }
{ const _fl = finishLoading; finishLoading = function () { if (S.rules.arena) S.newWorld = false; const r = _fl.apply(this, arguments); if (S.rules.arena) { player.spawn.set(0.5, AR.Y, 0.5); enterCage(); } return r; }; }
// ---- cages ----
// your own cage: start from a spot picked by your name, skip any that already holds someone's cage or someone standing there
function mySpot() { const sp = arenaSpots(); let h = 0; for (const ch of myName()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const others = typeof MP !== 'undefined' && MP.active ? [...MP.avatars.values()].filter(a => a.dim === world.dim) : [];
  for (let k = 0; k < 8; k++) { const [px, pz] = sp[(h + k) % 8]; const glass = world.get(px + 1, AR.Y, pz) === B.GLASS || world.get(px, AR.Y + 3, pz) === B.GLASS;
    if (!glass && !others.some(a => Math.hypot(a.pos.x - px - 0.5, a.pos.z - pz - 0.5) < 2.5)) return [px, pz]; }
  return sp[h % 8]; }
function cageBlocks(px, pz, id) { const Y = AR.Y;
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { for (let dy = 0; dy < 3; dy++) world.set(px + dx, Y + dy, pz + dz, (dx || dz) ? id : 0); world.set(px + dx, Y + 3, pz + dz, id); } }
function enterCage() {
  const A = S.arena; if (!A) return; const [px, pz] = mySpot(); A.spot = [px, pz]; A.phase = 'cage'; A.built = false; A.kit = null;
  for (let i = 0; i <= 40; i++) player.inv[i] = null; invDirty(); player.health = 20; player.food = 20; player.sat = 5; player.effects = {}; player.fire = 0; if (typeof setLevel === 'function') setLevel(0, 0);
  player.pos.set(px + 0.5, AR.Y, pz + 0.5); player.vel.set(0, 0, 0); player.peak = null; player.yaw = Math.atan2(px, pz); player.pitch = 0; player.flying = false; world.lastCenter = null; S.spawnPending = false;
  updateHearts(); if (typeof renderFood === 'function') renderFood(); openKitPicker();
}
function releaseCage() { const A = S.arena; if (!A || !A.spot) return; cageBlocks(A.spot[0], A.spot[1], 0); A.phase = 'fight'; arenaMsg('Fight!', 1.2); Sfx.play('levelup', 0.6); }
function arenaMsg(text, secs, small) { let el = $('arenaMsg'); if (!el) { el = document.createElement('div'); el.id = 'arenaMsg'; el.style.cssText = 'position:fixed;left:0;right:0;top:30%;text-align:center;font-size:64px;color:#fff;text-shadow:4px 4px 0 #3a3a3a;pointer-events:none;z-index:40;font-family:inherit'; document.body.appendChild(el); }
  el.textContent = text; el.style.fontSize = small ? '22px' : '64px'; el.style.display = 'block'; clearTimeout(el._t); if (secs) el._t = setTimeout(() => el.style.display = 'none', secs * 1000); }
// nothing hurts you while you're in your cage or counting down
{ const _h = Player.prototype.hurt; Player.prototype.hurt = function () { if (this === player && S.rules.arena && S.arena && S.arena.phase !== 'fight') return; return _h.apply(this, arguments); }; }
// dying in the arena drops nothing; respawning puts you back in your cage
{ const _die = Player.prototype.die; Player.prototype.die = function (cause) {
    const tot = (s) => s && s.id === IT.totem_of_undying; const saved = cause !== 'the void' && (tot(this.inv[this.sel]) || tot(this.inv[36])); // a held totem saves you
    if (this === player && S.rules.arena && !saved) { for (let i = 0; i <= 40; i++) this.inv[i] = null; for (let i = 0; i < 9; i++) craftGrid[i] = null; if (typeof setLevel === 'function') setLevel(0, 0); invDirty(); if (S.arena) S.arena.phase = 'dead'; }
    return _die.apply(this, arguments); }; }
function arenaTick(dt) {
  const A = S.arena; if (!S.rules.arena || !A || !S.started || S.loading) return;
  if (A.phase === 'dead') { if (!player.dead) enterCage(); return; }
  if (A.phase === 'cage' || A.phase === 'count') { const [px, pz] = A.spot;
    if (!A.built && world.getChunk(Math.floor(px / 16), Math.floor(pz / 16))) { cageBlocks(px, pz, B.GLASS); A.built = true; }
    if (Math.abs(player.pos.x - px - 0.5) > 0.7 || Math.abs(player.pos.z - pz - 0.5) > 0.7 || player.pos.y < AR.Y - 0.5) { player.pos.set(px + 0.5, AR.Y, pz + 0.5); player.vel.set(0, 0, 0); }
    if (A.phase === 'count') { const before = Math.ceil(A.t); A.t -= dt; const now = Math.ceil(A.t); if (A.t <= 0) releaseCage(); else if (now !== before) { arenaMsg(String(now), 0.9); Sfx.play('click', 0.6); } }
    else if (!$('kitPick') || $('kitPick').style.display === 'none') arenaMsg('Press K for the lobby', 0, true); }
  if (A.phase === 'fight' && player.pos.y < AR.Y - 48 && !player.dead && isSurv()) { player.health = 0; player.die('the void'); }
}
addEventListener('keydown', (e) => { if (e.code === 'KeyK' && S.rules.arena && S.arena && S.arena.phase === 'cage' && !S.uiOpen && !player.dead) { e.preventDefault(); openKitPicker(); } });
// ---- kits ----
const KP4 = { protection: 4, unbreaking: 3, mending: 1 }, KBP4 = { blast_protection: 4, unbreaking: 3, mending: 1 }, KFF = { protection: 4, feather_falling: 4, unbreaking: 3, mending: 1 };
const KNETH = [['netherite_helmet', KP4], ['netherite_chestplate', KP4], ['netherite_leggings', KP4], ['netherite_boots', KFF]];
const KELY = [['netherite_helmet', KP4], ['elytra', { unbreaking: 3, mending: 1 }], ['netherite_leggings', KP4], ['netherite_boots', KFF]];
const KSHARP = { sharpness: 5, unbreaking: 3 }, KSPEAR = { lunge: 3, unbreaking: 3 }, KDENS = { density: 5, wind_burst: 1, unbreaking: 3 };
const KITS = [
  { k: 'sword', name: 'Sword', blurb: 'Diamond sword and armour. Spacing, crits and nothing else.', armor: [['diamond_helmet'], ['diamond_chestplate'], ['diamond_leggings'], ['diamond_boots']], items: [['diamond_sword'], ['steak', 16]] },
  { k: 'axe', name: 'Axe', blurb: 'Axe to break shields, sword, shield, bow and crossbow.', armor: [['diamond_helmet'], ['diamond_chestplate'], ['diamond_leggings'], ['diamond_boots']], items: [['diamond_axe'], ['diamond_sword'], ['crossbow'], ['bow'], ['steak', 16], ['arrow', 12]], off: ['shield'] },
  { k: 'crystal', name: 'Crystal', blurb: 'Obsidian, end crystals, anchors, totems. Fast and explosive.', armor: [['netherite_helmet', KP4], ['netherite_chestplate', KP4], ['netherite_leggings', KBP4], ['netherite_boots', KP4]],
    items: [['netherite_sword', KSHARP], ['obsidian', 64], ['end_crystal', 64], ['respawn_anchor', 64], ['glowstone', 64], ['golden_apple', 64], ['ender_pearl', 16], ['crossbow', { multishot: 1, quick_charge: 3, unbreaking: 3 }], ['totem_of_undying'],
      ['end_crystal', 64], ['end_crystal', 64], ['end_crystal', 64], ['end_crystal', 64], ['end_crystal', 64], ['respawn_anchor', 64], ['respawn_anchor', 64], ['respawn_anchor', 64], ['glowstone', 64], ['glowstone', 64], ['glowstone', 64], ['glowstone', 64],
      ['obsidian', 64], ['obsidian', 64], ['tipped_arrow', { pot: 'slow_falling', n: 64 }], ['tipped_arrow', { pot: 'slow_falling', n: 64 }], ['experience_bottle', 64], ['netherite_pickaxe', { efficiency: 5, unbreaking: 3, mending: 1 }], ['totem_of_undying'], ['totem_of_undying'], ['totem_of_undying'], ['totem_of_undying'], ['totem_of_undying'], ['totem_of_undying']], off: ['totem_of_undying'] },
  { k: 'spear', name: 'Spear', blurb: 'Netherite spear with Lunge. Charge in, jab, back off.', armor: KNETH, items: [['netherite_spear', KSPEAR], ['netherite_sword', KSHARP], ['golden_apple', 16], ['ender_pearl', 8], ['steak', 16]], off: ['shield'] },
  { k: 'mace', name: 'Mace', blurb: 'Wind charges up, mace down. Density V and Breach mace.', armor: KNETH, items: [['mace', KDENS], ['netherite_sword', KSHARP], ['wind_charge', 64], ['ender_pearl', 16], ['golden_apple', 32], ['mace', { breach: 4, unbreaking: 3 }], ['totem_of_undying'], ['totem_of_undying'], ['steak', 16]], off: ['totem_of_undying'] },
  { k: 'spear_mace', name: 'Spear Mace', blurb: 'Spear to close the gap, mace to finish. Wind charges.', armor: KNETH, items: [['netherite_spear', KSPEAR], ['mace', KDENS], ['wind_charge', 64], ['netherite_sword', KSHARP], ['golden_apple', 32], ['ender_pearl', 16], ['totem_of_undying'], ['steak', 16]], off: ['totem_of_undying'] },
  { k: 'ely_mace', name: 'Ely Mace', blurb: 'Elytra and rockets to climb, dive in with the mace.', armor: KELY, items: [['mace', KDENS], ['firework_rocket', 64], ['wind_charge', 64], ['netherite_sword', KSHARP], ['netherite_chestplate', KP4], ['golden_apple', 32], ['ender_pearl', 16], ['totem_of_undying'], ['firework_rocket', 64]], off: ['totem_of_undying'] },
  { k: 'spear_ely', name: 'Spear Ely', blurb: 'Elytra and rockets for flying spear charges.', armor: KELY, items: [['netherite_spear', KSPEAR], ['firework_rocket', 64], ['netherite_sword', KSHARP], ['netherite_chestplate', KP4], ['golden_apple', 32], ['ender_pearl', 16], ['totem_of_undying'], ['firework_rocket', 64], ['steak', 16]], off: ['totem_of_undying'] },
];
function kitStack(key, a) { const id = IT[key]; if (id == null) return null; let n = 1, ench = null; if (typeof a === 'number') n = a; else if (a) ench = a; const s = { id, count: Math.min(n, stackMax(id)) }; if (ench) s.ench = Object.assign({}, ench); return s; }
function giveKit(kit) {
  for (let i = 0; i <= 40; i++) player.inv[i] = null; let slot = 0;
  for (const [key, a] of kit.items) { const s = kitStack(key, a); if (s && slot < 36) player.inv[slot++] = s; }
  kit.armor.forEach(([key, en], i) => { const s = kitStack(key, en); if (s) player.inv[37 + i] = s; });
  if (kit.off) player.inv[36] = kitStack(kit.off[0], kit.off[1]);
  player.sel = 0; player.health = 20; player.food = 20; player.sat = 5; invDirty(); updateHearts(); if (typeof renderFood === 'function') renderFood();
}
function openKitPicker() {
  let el = $('kitPick');
  if (!el) { el = document.createElement('div'); el.id = 'kitPick';
    el.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;gap:12px;background:rgba(0,0,0,.6);z-index:60';
    let h = '<div style="font-size:30px;color:#fff;text-shadow:2px 2px 0 #333">Choose your kit</div><div style="color:#ccc;font-size:14px">Click one or press 1 to 8. Esc closes this; press K to bring it back.</div><div id="kitGrid" style="display:grid;grid-template-columns:repeat(4,200px);gap:10px">';
    KITS.forEach((kt, i) => { const show = [...kt.items.slice(0, 4).map(x => x[0]), kt.armor[1][0]];
      h += '<button data-i="' + i + '" style="text-align:left;background:#3b3b3b;border:3px solid #1c1c1c;box-shadow:inset 2px 2px 0 #6a6a6a,inset -2px -2px 0 #262626;color:#fff;padding:8px 10px;cursor:pointer;font-family:inherit"><div style="font-size:18px;margin-bottom:4px">' + (i + 1) + '. ' + kt.name + '</div><div style="display:flex;gap:2px;margin-bottom:6px">' +
        show.map(k => IT[k] != null ? '<img data-k="' + k + '" style="width:28px;height:28px;image-rendering:pixelated">' : '').join('') + '</div><div style="font-size:12px;color:#ccc;line-height:1.3">' + kt.blurb + '</div></button>'; });
    el.innerHTML = h + '</div>'; document.body.appendChild(el);
    el.querySelectorAll('#kitGrid button').forEach(b => { b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); pickKit(+b.dataset.i); });
      b.addEventListener('mouseenter', () => b.style.borderColor = '#fff'); b.addEventListener('mouseleave', () => b.style.borderColor = '#1c1c1c'); });
    el.addEventListener('keydown', (e) => e.stopPropagation()); }
  for (const img of el.querySelectorAll('img[data-k]')) if (!img.src) img.src = ICON[IT[img.dataset.k]];
  if (S.uiOpen && S.uiOpen !== 'kit') closeInv(true);
  S.uiOpen = 'kit'; for (const kk in keys) keys[kk] = false; mouseL = mouseR = false; el.style.display = 'flex'; releaseLock(); arenaMsg('', 0.01);
}
function closeKitPicker(noLock) { const el = $('kitPick'); if (el) el.style.display = 'none'; if (S.uiOpen === 'kit') S.uiOpen = null; if (!noLock) requestLock(); }
function pickKit(i) { const kt = KITS[i]; const A = S.arena; if (!kt || !A || A.phase !== 'cage') return; giveKit(kt); A.kit = kt.k; A.phase = 'count'; A.t = 3; closeKitPicker(); arenaMsg('3', 0.9); Sfx.play('click', 0.6); chatPrint('Kit: ' + kt.name, '#ff5'); }
{ const _ci = closeInv; closeInv = function (noLock) { if (S.uiOpen === 'kit') { closeKitPicker(noLock); return; } return _ci.apply(this, arguments); }; }
addEventListener('keydown', (e) => { if (S.uiOpen !== 'kit') return; const n = +e.key; if (n >= 1 && n <= 8) { e.preventDefault(); e.stopImmediatePropagation(); pickKit(n - 1); } }, true);
// /arena reset puts the arena back as it was built (host only); /arena shows where things stand
CMDS.arena = { usage: '[reset]', free: true, run(a) {
    if (!S.rules.arena) throw new CmdError('This is not a PvP arena world');
    if ((a[0] || '') !== 'reset') { chatPrint('PvP arena. Kits: ' + KITS.map(k => k.name).join(', ') + '. The host can use /arena reset', '#ff5'); return; }
    if (mpClient()) throw new CmdError('Only the host can reset the arena');
    const n = arenaReset(); chatPrint('Arena reset (' + n + ' blocks put back)', '#ff5'); } };
function arenaReset() {
  const w = world; if (w.dim !== 'overworld') return 0; let n = 0; const E = AR.E;
  for (const m of G.mobs) if (m.isCrystal && m.placed && !m.dead) m.blastGone();
  for (let x = -E - 2; x < E + 2; x++) for (let z = -E - 2; z < E + 2; z++) { if (!w.getChunk(Math.floor(x / 16), Math.floor(z / 16))) continue;
    for (let y = AR.Y - 16; y <= AR.Y + 60; y++) { const want = arenaAt(arSeed(w), x, y, z), have = w.get(x, y, z); if (have !== want) { w.set(x, y, z, want); n++; } } }
  for (const it of G.items) { it.gone = true; it.remove(); } G.items = [];
  if (S.arena && S.arena.spot && S.arena.phase !== 'fight' && S.arena.phase !== 'dead') cageBlocks(S.arena.spot[0], S.arena.spot[1], B.GLASS);
  return n;
}
{ const _t = tick; tick = function (dt) { const r = _t.apply(this, arguments); try { sharedTick(); arenaTick(dt); } catch (e) { console.warn(e); } return r; }; }

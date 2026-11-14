// ================= DECORATION BLOCKS AT RUN TIME (Minecraft rules) =================
// Lanterns hang from the block above when placed on a ceiling; heads go on floors or walls; candles stack up to four
// and light with flint and steel (and go out with a click); a candle on an untouched cake makes a candle cake; cakes are
// eaten a slice at a time (2 hunger each); flower pots take any small plant; campfires burn (1 damage a second, soul
// campfires 2), cook up to four raw foods in 30 seconds, light with flint and steel and go out with a shovel or water;
// bells ring; scaffolding holds up to 7 blocks out from a supported column and drops when it can't; respawn anchors
// charge with glowstone, set your spawn in the Nether and explode anywhere else; conduits framed by 16+ prismarine
// blocks give Conduit Power (water breathing, night vision, haste) underwater; chiseled bookshelves hold 6 books, one per
// slot; decorated pots hold one stack; beehives and bee nests fill with honey near flowers and give honeycomb to shears
// and honey bottles to glass bottles.
const DECO = { watch: new Set(), watchWorld: null, cook: new Map(), scq: new Set(), t: 0, slow: 0 };
const decoWatchable = (id) => { const d = BL[id]; return !!(d && (d.campfire || d.conduit)); };
// ---- what holds things up ----
{ const _ss = shapeSupported; shapeSupported = function (x, y, z, id) { const d = BL[id]; if (!d) return true;
    if (d.support === 'lantern') { if (d.st.hanging) { const a = world.get(x, y + 1, z); const ad = BL[a]; return !!(SOLID[a] || (ad && (ad.fam === 'chain' && ad.st.axis === 'y'))); } const b = world.get(x, y - 1, z); return !!SOLID[b]; }
    if (d.support === 'headwall') { const f = d.st.facing; const [ax, az] = DV4[f]; return !!SOLID[world.get(x - ax, y, z - az)]; }
    return _ss.apply(this, arguments); }; }
// ---- placing ----
const isCandleItem = (id) => !!(BL[id] && BL[id].candle && BL[id].fam === BL[id].candle && FAMILY[BL[id].candle].base === id);
function scaffoldDistance(x, y, z) { const b = world.get(x, y - 1, z); const bd = BL[b]; if (bd && bd.scaffold) return bd.st.distance; if (SOLID[b] && !(bd && bd.scaffold)) return 0;
  let best = 8; for (const [a, c] of DV4) { const n = BL[world.get(x + a, y, z + c)]; if (n && n.scaffold) best = Math.min(best, n.st.distance + 1); } return best; }
function scaffoldState(x, y, z) { let dist = scaffoldDistance(x, y, z); const below = BL[world.get(x, y - 1, z)]; const bottom = dist > 0 && !(below && below.scaffold) && !SOLID[world.get(x, y - 1, z)] ? 1 : 0; return { distance: dist, bottom }; }
{ const _pb = placeBlock; placeBlock = function (hit, id) {
    const d = BL[id]; if (!d || !hit) return _pb.apply(this, arguments);
    const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz; const pf = playerFacing(); const hd = BL[hit.id];
    // a candle added to a candle of the same colour; a candle on an untouched cake
    if (isCandleItem(id) && hd && hd.candle === d.candle && hd.st.candles < 4) { world.set(hit.x, hit.y, hit.z, withState(hit.id, { candles: hd.st.candles + 1 })); Sfx.play('wool', 1, 1.2); return true; }
    if (isCandleItem(id) && hd && hd.cake === 0) { world.set(hit.x, hit.y, hit.z, FAMILY[d.candle + '_cake'].ids['0']); Sfx.play('wool', 1, 1.2); return true; }
    if (id === B.SOUL_TORCH && !SOLID[world.get(x, y - 1, z)] && !(hit.ny === 0 && SOLID[hit.id])) return false;
    if (!d.fam || !FAMILY[d.fam] || FAMILY[d.fam].kind !== 'deco') return _pb.apply(this, arguments);
    let vid = id;
    if (d.lantern) { const canHang = SOLID[world.get(x, y + 1, z)] || (BL[world.get(x, y + 1, z)] || {}).fam === 'chain'; const canStand = SOLID[world.get(x, y - 1, z)]; const hang = (hit.ny === -1 && canHang) || (!canStand && canHang); vid = withState(id, { hanging: hang ? 1 : 0 }); }
    else if (d.campfire) vid = withState(id, { facing: pf, lit: 1 });
    else if (d.bell) vid = withState(id, { facing: (pf + 1) % 4 });
    else if (d.head) vid = hit.ny === 0 ? withState(id, { wall: 1, facing: dirOf(hit.nx, hit.nz) }) : withState(id, { wall: 0, facing: (pf + 2) % 4 });
    else if (d.cbs || d.hive !== undefined) vid = withState(id, { facing: (pf + 2) % 4 });
    else if (d.scaffold) { if (!replaceableAt(x, y, z)) return false; const st = scaffoldState(x, y, z); if (st.distance > 7) return false; vid = withState(id, st); }
    if (!shapeSupported(x, y, z, vid)) return false;
    return _pb.call(this, hit, vid); }; }
// ---- using ----
function lightUp(x, y, z, d, id) { if (d.candle && !d.st.lit && world.get(x, y, z) === id) { world.set(x, y, z, withState(id, { lit: 1 })); return true; } if (d.candleCake && !d.st.lit) { world.set(x, y, z, withState(id, { lit: 1 })); return true; } if (d.campfire && !d.st.lit) { world.set(x, y, z, withState(id, { lit: 1 })); return true; } return false; }
{ const _ua = useAction; useAction = function (eye, dir) {
    const h = player.held(); const hd = h && ITEMS[h.id]; const sneaking = kd('sneak'); const hk = hd && hd.key;
    if (target && !targetMob && !isSpec()) { const { x, y, z } = target; const id = target.id; const d = BL[id]; const pos = new V3(x + 0.5, y + 0.5, z + 0.5); const done = (snd, v, r) => { if (snd) Sfx.play(snd, v || 1, r); S.swing = 1; mouseR = false; };
      if (d && !(sneaking && h)) {
        // flint and steel / fire charges light candles, candle cakes and campfires
        if ((hk === 'flint_and_steel' || hk === 'fire_charge') && (d.candle || d.candleCake || d.campfire)) { if (lightUp(x, y, z, d, id)) { if (hk === 'fire_charge') useHeld(1); else if (typeof damageHeld === 'function') damageHeld(1); done('ignite', 0.8); return; } }
        if ((d.candle || d.candleCake) && d.st.lit && !h) { world.set(x, y, z, withState(id, { lit: 0 })); Particles.emit(x + 0.5, y + 0.6, z + 0.5, 4, [[0.6, 0.6, 0.6]], 0.4, 0.8, -2, 0.1); done('fizz', 0.4); return; }
        if (d.campfire && d.st.lit && hd && hd.kind === 'tool' && hd.tool === 'shovel') { world.set(x, y, z, withState(id, { lit: 0 })); done('fizz', 0.6); return; }
        if (d.campfire && d.st.lit && h && SMELT[h.id] !== undefined && ITEMS[SMELT[h.id]] && ITEMS[SMELT[h.id]].kind === 'food') { const k = keyOf(x, y, z); const list = DECO.cook.get(k) || []; if (list.length < 4) { list.push({ id: h.id, t: 0 }); DECO.cook.set(k, list); useHeld(1); done('wood', 0.6, 1.3); return; } }
        // cakes: one slice a click (when hungry, or in Creative)
        if (d.cake !== undefined || d.candleCake) { if (S.mode === 'creative' || player.food < 20) { const nb = d.candleCake ? 1 : d.cake + 1; if (d.candleCake) dropItem(IT[d.candleCake], 1, x + 0.5, y + 0.6, z + 0.5);
            if (nb >= 7) world.set(x, y, z, 0); else world.set(x, y, z, FAMILY.cake.ids[String(nb)]); if (isSurv()) { player.food = Math.min(20, player.food + 2); player.sat = Math.min(player.food, player.sat + 0.4); if (typeof renderFood === 'function') renderFood(); } done('eat', 0.8); return; } }
        // flower pots
        if (d.pot && h && !d.potted) { const p = defineDecoBlocks.potted.find(q => q[0] === h.id); if (p) { world.set(x, y, z, p[1]); useHeld(1); done('grass', 0.8); return; } }
        if (d.potted && !h) { world.set(x, y, z, B.FLOWER_POT); giveOrDrop(d.potted, 1); done('grass', 0.8); return; }
        // bells
        if (d.bell) { Sfx.at('bell', pos, 1); done(); BELL_SWING.set(keyOf(x, y, z), 1); return; }
        // respawn anchors
        if (d.anchor !== undefined) { if (h && h.id === IT.glowstone && d.anchor < 4) { world.set(x, y, z, withState(id, { charges: d.anchor + 1 })); useHeld(1); done('anchor_charge', 1); return; }
          if (d.anchor > 0) { if (world.dim === 'nether') { S.anchor = [x, y, z]; toast('Respawn point set', 2); chatPrint('Respawn point set', '#ccc'); done('anchor_set', 1); return; }
            world.set(x, y, z, 0); done(); explode(x + 0.5, y + 0.5, z + 0.5, 5, null, { fire: true, cause: 'Intentional Game Design' }); return; } }
        // chiseled bookshelves: the slot under the crosshair
        if (d.cbs) { const slot = cbsSlot(target, d); if (slot >= 0) { const k = keyOf(x, y, z); let inv = world.chestInv.get(k); if (!inv) { inv = new Array(6).fill(null); world.chestInv.set(k, inv); }
            const full = (d.st.books >> slot) & 1; const BOOKS = ['book', 'enchanted_book', 'writable_book', 'written_book', 'knowledge_book'];
            if (!full && h && BOOKS.includes(hk)) { inv[slot] = Object.assign({}, h, { count: 1 }); useHeld(1); world.set(x, y, z, withState(id, { books: d.st.books | (1 << slot) })); CBS_LAST.set(k, slot + 1); done('book_put', 0.8); return; }
            if (full) { const it = inv[slot] || { id: IT.book, count: 1 }; inv[slot] = null; giveOrDrop(it.id, 1, xtra(it)); world.set(x, y, z, withState(id, { books: d.st.books & ~(1 << slot) })); CBS_LAST.set(k, slot + 1); done('book_take', 0.8); return; } } }
        // decorated pots hold one stack
        if (d.dpot && h) { const k = keyOf(x, y, z); let inv = world.chestInv.get(k); if (!inv) { inv = [null]; world.chestInv.set(k, inv); } const s = inv[0];
          if (!s || (s.id === h.id && !xtra(s) && !xtra(h) && s.count < stackMax(s.id))) { if (s) s.count++; else inv[0] = Object.assign({}, h, { count: 1 }); useHeld(1); POT_WOBBLE.set(k, 0.4); done('dpot_insert', 0.8, 1 + (inv[0].count / 64) * 0.5); rsNotify(x, y, z); return; } POT_WOBBLE.set(k, 0.4); done('dpot_full', 0.6); return; }
        // hives
        if (d.hive === 5 && h && (hk === 'shears' || hk === 'glass_bottle')) { world.set(x, y, z, withState(id, { honey: 0 })); if (hk === 'shears') { dropItem(IT.honeycomb, 3, x + 0.5, y + 1.1, z + 0.5); if (typeof damageHeld === 'function') damageHeld(1); } else { useHeld(1); giveOrDrop(IT.honey_bottle, 1); } done(hk === 'shears' ? 'shear' : 'bottle_fill', 1); return; }
      } }
    return _ua.apply(this, arguments); }; }
const BELL_SWING = new Map(), POT_WOBBLE = new Map(), CBS_LAST = new Map();
function cbsSlot(t, d) { if (t.px === undefined) return -1; const f = d.st.facing; const [ax, az] = DV4[f]; if (t.nx !== ax || t.nz !== az || t.ny) return -1; // only the front face
  const lx = t.px - t.x, ly = t.py - t.y, lz = t.pz - t.z; const u = f === 2 ? lx : f === 0 ? 1 - lx : f === 1 ? 1 - lz : lz; // left to right as seen from the front
  const col = u < 5 / 16 ? 0 : u < 11 / 16 ? 1 : 2; return (ly >= 0.5 ? 0 : 3) + col; }
// honey bottles: give back the bottle and cure poison
{ const _oe = typeof onEatItem === 'function' ? onEatItem : null; onEatItem = function (id) { if (_oe) _oe.apply(this, arguments); if (id === IT.honey_bottle) { if (player.effects) delete player.effects.poison; if (typeof renderEffects === 'function') renderEffects(); if (S.mode !== 'creative') giveOrDrop(IT.glass_bottle, 1); } }; }
// ---- breaking ----
{ const _obr = onBlockRemoved; onBlockRemoved = function (x, y, z, id) { const r = _obr.apply(this, arguments); const d = BL[id]; if (!d) return r; const k = keyOf(x, y, z); const w = G.world;
    if (d.cbs || d.dpot) { const inv = w.chestInv.get(k); if (inv) for (const s of inv) if (s) dropItem(s.id, s.count, x + 0.5, y + 0.5, z + 0.5, false, xtra(s)); w.chestInv.delete(k); }
    if (d.campfire) { const list = DECO.cook.get(k); if (list) for (const c of list) dropItem(c.id, 1, x + 0.5, y + 0.6, z + 0.5); DECO.cook.delete(k); }
    return r; }; }
{ const _bb = breakBlock; breakBlock = function (x, y, z) { const id = world.get(x, y, z); const d = BL[id]; const r = _bb.apply(this, arguments); if (!d || world.get(x, y, z) === id || !isSurv() || S.rules.doTileDrops === false) return r;
    if (d.dpot) { const silk = typeof enchOf === 'function' && enchOf(player.held(), 'silk_touch'); if (silk) dropItem(IT.decorated_pot, 1, x + 0.5, y + 0.4, z + 0.5); else { dropItem(IT.brick, 4, x + 0.5, y + 0.4, z + 0.5); Sfx.play('dpot_shatter', 1); } }
    if (d.hive !== undefined && d.fam === 'bee_nest' && typeof enchOf === 'function' && enchOf(player.held(), 'silk_touch')) dropItem(IT.bee_nest, 1, x + 0.5, y + 0.4, z + 0.5);
    return r; }; }
// ---- every tick: campfires, conduits, scaffolding, swinging bells ----
function decoScan() { DECO.watch.clear(); DECO.watchWorld = world; for (const [ck, m] of world.edits) { const cx = Math.floor(ck / 65536) - 32768, cz = (ck % 65536) - 32768; for (const [i, id] of m) if (decoWatchable(id)) DECO.watch.add(keyOf(cx * 16 + (i & 15), i >> 8, cz * 16 + ((i >> 4) & 15))); } }
{ const _set = World.prototype.set; World.prototype.set = function (x, y, z, id, record) { const mine = this === G.world; const old = mine ? this.get(x, y, z) : 0; const r = _set.apply(this, arguments);
    if (r !== false && mine) { const k = keyOf(x, y, z); if (decoWatchable(id)) DECO.watch.add(k); else if (decoWatchable(old)) DECO.watch.delete(k);
      if (BL[old] && BL[old].scaffold || BL[id] && BL[id].scaffold || BL[old] && SOLID[old] !== SOLID[id]) for (const [a, b, c] of [[0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 0, 0]]) { const n = BL[this.get(x + a, y + b, z + c)]; if (n && n.scaffold) DECO.scq.add(keyOf(x + a, y + b, z + c)); } }
    return r; }; }
const CONDUIT_FRAME = new Set(['prismarine', 'prismarine_bricks', 'dark_prismarine', 'sea_lantern']);
function conduitFrame(x, y, z) { // blocks of the 3 square rings (radius 2) round the conduit, and water all round it
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) { if (!a && !b && !c) continue; if (!isWaterId(world.get(x + a, y + b, z + c))) return 0; }
  let n = 0; for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) for (let c = -2; c <= 2; c++) { const ring = (a === 0 && (Math.abs(b) === 2 || Math.abs(c) === 2)) || (b === 0 && (Math.abs(a) === 2 || Math.abs(c) === 2)) || (c === 0 && (Math.abs(a) === 2 || Math.abs(b) === 2)); if (!ring) continue; const d = BL[world.get(x + a, y + b, z + c)]; if (d && CONDUIT_FRAME.has(d.key)) n++; }
  return n; }
function decoTick(dt) {
  if (!world) return; if (DECO.watchWorld !== world) decoScan(); const P = player; DECO.t += dt; DECO.slow += dt;
  // scaffolding: recompute distance, drop what is too far from support
  if (DECO.scq.size) { const list = [...DECO.scq]; DECO.scq.clear(); for (const k of list) { const [x, y, z] = k.split(',').map(Number); const id = world.get(x, y, z); const d = BL[id]; if (!d || !d.scaffold) continue; const st = scaffoldState(x, y, z);
      if (st.distance > 7) { world.set(x, y, z, 0); mpBlock(x, y, z, 0); if (isSurv() || true) dropItem(IT.scaffolding, 1, x + 0.5, y + 0.3, z + 0.5); Particles.blockBreak(x, y, z, id, 6); } else { const nid = withState(id, st); if (nid !== id) { world.set(x, y, z, nid); mpBlock(x, y, z, nid); } } } }
  // campfires: cooking, smoke, burning feet
  for (const k of DECO.watch) { const [x, y, z] = k.split(',').map(Number); const d = BL[world.get(x, y, z)]; if (!d) continue;
    if (d.campfire) { if (!d.st.lit) continue; const list = DECO.cook.get(k);
      if (list) { for (const c of list) c.t += dt; const done = list.filter(c => c.t >= 30); if (done.length) { for (const c of done) dropItem(SMELT[c.id], 1, x + 0.5, y + 0.6, z + 0.5); DECO.cook.set(k, list.filter(c => c.t < 30)); } }
      if (Math.random() < dt * 1.5 && Math.abs(x - P.pos.x) < 48 && Math.abs(z - P.pos.z) < 48) { const tall = world.get(x, y - 1, z) === B.HAY_BLOCK; Particles.emit(x + 0.5, y + 0.6, z + 0.5, 1, [[0.55, 0.55, 0.55], [0.4, 0.4, 0.4]], 0.4, tall ? 7 : 4, -1.2, 0.25); }
      if (list && list.length && Math.random() < dt * 4) Particles.emit(x + 0.5, y + 0.55, z + 0.5, 1, [[1, 0.6, 0.2]], 0.5, 0.4, -1, 0.3);
      if (isWaterId(world.get(x, y + 1, z)) || (FKIND[world.get(x, y + 1, z)] === 1)) world.set(x, y, z, withState(d.id, { lit: 0 })); }
    else if (d.conduit && DECO.slow >= 2) { const n = conduitFrame(x, y, z); if (n >= 16) { const range = Math.floor(n / 7) * 16; Particles.emit(x + 0.5, y + 0.5, z + 0.5, 3, [[0.5, 0.9, 1]], 1.5, 1.2, 0, 0.6);
        if (P.pos.distanceTo(new V3(x + 0.5, y + 0.5, z + 0.5)) <= range && (isWaterId(world.get(Math.floor(P.pos.x), Math.floor(P.pos.y + 1.5), Math.floor(P.pos.z))) || isWaterId(world.get(Math.floor(P.pos.x), Math.floor(P.pos.y), Math.floor(P.pos.z))))) { giveEffect('water_breathing', 13, 0); giveEffect('night_vision', 13, 0); giveEffect('haste', 13, 0); } } } }
  if (DECO.slow >= 2) DECO.slow = 0;
  // standing in a lit campfire hurts (not while sneaking, not with fire resistance)
  if (!P.dead && isSurv()) { const fd = BL[world.get(Math.floor(P.pos.x), Math.floor(P.pos.y + 0.05), Math.floor(P.pos.z))]; if (fd && fd.campfire && fd.st.lit && !kd('sneak') && !(P.effects && P.effects.fire_resistance)) { DECO.burnT = (DECO.burnT || 0) - dt; if (DECO.burnT <= 0) { DECO.burnT = 0.5; P.hurt(fd.campfire === 'soul_campfire' ? 2 : 1, null, 'Campfire'); } } }
  for (const [k, t] of BELL_SWING) { const v = t - dt; if (v <= 0) BELL_SWING.delete(k); else BELL_SWING.set(k, v); }
  for (const [k, t] of POT_WOBBLE) { const v = t - dt; if (v <= 0) POT_WOBBLE.delete(k); else POT_WOBBLE.set(k, v); }
}
{ const _uw = updateWater; updateWater = function (dt) { const r = _uw.apply(this, arguments); if (world && !isClientMP()) { try { decoTick(dt); } catch (e) { console.error(e); } } return r; }; }
// beehives fill with honey (random ticks) when flowers are near: the bees are out working
function hiveTick(x, y, z, id) { const d = BL[id]; if (d.hive >= 5 || Math.random() > 0.25) return; let flowers = 0;
  for (let a = -5; a <= 5 && !flowers; a++) for (let b = -2; b <= 2 && !flowers; b++) for (let c = -5; c <= 5; c++) { const n = BL[world.get(x + a, y + b, z + c)]; if (n && (n.flower || /tulip|daisy|orchid|allium|bluet|cornflower|lily_of|dandelion|^rose$|poppy|torchflower|sunflower|lilac|peony|azalea|petals|blossom/.test(n.key))) { flowers++; break; } }
  if (flowers) world.set(x, y, z, withState(id, { honey: d.hive + 1 })); }
// a comparator reads a chiseled bookshelf (last slot used) and a decorated pot (how full)
{ const _cs = containerSignal; containerSignal = function (x, y, z) { const d = BL[world.get(x, y, z)]; if (d && d.cbs) return CBS_LAST.get(keyOf(x, y, z)) || 0; if (d && d.hive !== undefined) return d.hive;
    if (d && d.dpot) { const inv = world.chestInv.get(keyOf(x, y, z)); const s = inv && inv[0]; return s ? Math.floor(1 + s.count / stackMax(s.id) * 14) : 0; } if (d && d.anchor !== undefined) return Math.floor(d.anchor / 4 * 15);
    return _cs.apply(this, arguments); }; }
// ---- respawning at a charged anchor in the Nether ----
function anchorSpawn() { if (!S.anchor) return null; const [x, y, z] = S.anchor; const w = Dim.get('nether'); if (w.loaded(x, z)) { const d = BL[w.get(x, y, z)]; if (!d || d.anchor === undefined || d.anchor < 1) { S.anchor = null; toast('You have no charged respawn anchor, or it was obstructed', 3); return null; } w.set(x, y, z, withState(d.id, { charges: d.anchor - 1 })); }
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { if (!w.loaded(x + a, z + b)) return new V3(x + a + 0.5, y, z + b + 0.5); if (!w.solid(x + a, y, z + b) && !w.solid(x + a, y + 1, z + b) && w.solid(x + a, y - 1, z + b)) return new V3(x + a + 0.5, y, z + b + 0.5); }
  return new V3(x + 0.5, y + 1, z + 0.5); }
{ const btn = $('btnRespawn'); const fresh = btn.cloneNode(true); btn.parentNode.replaceChild(fresh, btn); const handler = () => {
    player.dead = false; player.health = 20; player.vel.set(0, 0, 0); player.peak = null; updateHearts(); show('death', false); S.sleeping = null;
    const ap = S.anchor ? anchorSpawn() : null;
    if (ap) { Sfx.play('anchor_set', 0.8); if (world.dim !== 'nether') travelTo('nether', { type: 'bed', x: Math.floor(ap.x), z: Math.floor(ap.z), pos: ap }); else { player.pos.copy(ap); world.lastCenter = null; requestLock(); } return; }
    const t = respawnTarget();
    if (world.dim !== 'overworld') travelTo('overworld', t.type === 'spawn' ? { type: 'spawn' } : { type: 'bed', x: Math.floor(t.pos.x), z: Math.floor(t.pos.z), pos: t.pos });
    else { if (t.type === 'spawn') placeAtWorldSpawn(); else { player.pos.copy(t.pos); world.lastCenter = null; } requestLock(); } };
  fresh.addEventListener('click', handler); }
// ---- sounds ----
{ const _pl = Sfx.play; Sfx.play = function (name, v = 1, rate) {
    if (!this.ctx) return _pl.apply(this, arguments); if (!(v >= 0.02)) return;
    switch (name) {
      case 'bell': for (const [f, a, d] of [[820, 0.16, 2.2], [1640, 0.06, 1.2], [2260, 0.04, 0.8], [410, 0.05, 1.6]]) this.tone(f, f * 0.998, d, a * v, 'sine'); return;
      case 'anchor_charge': this.tone(220, 440, 0.3, 0.12 * v, 'sawtooth'); this.nz(0.3, 800, 0.2 * v, 'bandpass', 3); return;
      case 'anchor_set': this.tone(330, 660, 0.5, 0.1 * v, 'sine'); this.tone(495, 990, 0.5, 0.06 * v, 'sine'); return;
      case 'scaffold': this.nz(0.1, 1400, 0.35 * v, 'bandpass', 2); this.tone(500, 380, 0.05, 0.05 * v, 'triangle'); return;
      case 'book_put': case 'book_take': this.nz(0.1, 2200, 0.3 * v, 'bandpass', 1.5); return;
      case 'dpot_insert': this.tone(420 * (rate || 1), 380 * (rate || 1), 0.12, 0.1 * v, 'triangle'); return;
      case 'dpot_full': this.tone(300, 280, 0.1, 0.08 * v, 'triangle'); return;
      case 'dpot_shatter': this.nz(0.25, 3000, 0.4 * v, 'highpass'); this.tone(600, 200, 0.15, 0.06 * v, 'triangle'); return;
      case 'shear': this.nz(0.08, 4000, 0.3 * v, 'highpass'); return;
      case 'bottle_fill': this.tone(400, 900, 0.25, 0.08 * v, 'sine'); return;
      case 'ignite': this.nz(0.2, 2400, 0.3 * v, 'bandpass', 1); return;
      case 'fizz': this.nz(0.3, 5000, 0.25 * v, 'highpass'); return;
    }
    return _pl.apply(this, arguments); }; }
// ---- creative inventory: decoration together after the lever group ----
{ const keys = ['lantern', 'soul_lantern', 'chain', 'campfire', 'soul_campfire', 'soul_torch', 'bell', 'scaffolding', 'flower_pot', 'skeleton_skull', 'wither_skeleton_skull', 'zombie_head', 'creeper_head', 'piglin_head', 'dragon_head', 'player_head', 'cake',
    'candle', ...COLORDATA().map(c => c[0] + '_candle'), 'lodestone', 'respawn_anchor', 'conduit', 'chiseled_bookshelf', 'decorated_pot', 'beehive', 'bee_nest', 'honey_bottle'];
  const ids = keys.map(k => IT[k]).filter(v => v !== undefined); const set = new Set(ids); const rest = ITEM_IDS.filter(i => !set.has(i)); const at = rest.indexOf(IT.lectern); rest.splice(at >= 0 ? at + 1 : rest.length, 0, ...ids); ITEM_IDS.length = 0; ITEM_IDS.push(...rest); }
for (const k of ['campfire', 'soul_campfire', 'chiseled_bookshelf', 'beehive', 'bee_nest', 'scaffolding']) if (IT[k] !== undefined) FUEL[IT[k]] = k === 'scaffolding' ? 2.5 : 15;

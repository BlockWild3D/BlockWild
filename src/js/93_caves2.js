// ================= CAVE BIOMES: SULFUR CAVES (Chaos Cubed), ICE CAVES, DEEP DARK; FREEZING AND NAUSEA =================
// Cave biomes now have names (Lush Caves, Dripstone Caves, Deep Dark, Sulfur Caves, Ice Caves) shown when you're in them.
// Sulfur caves: sulfur and cinnabar floors and ceilings, sulfur spikes, green sulfur pools whose potent-sulfur fumes
// give Nausea, geysers (potent sulfur over magma or lava throws you upward every so often), glow lichen, and the
// sulfur cube: a passive cube that swallows a full block you give it (or one lying near it) and takes on its
// physics - wood bounces like a rubber ball, stone is a slow heavy bouncer, moss / coral / pumpkins slide flat, wool
// floats down slowly, ice skids, honey sticks, magma burns, and TNT turns it into a walking bomb you can light.
// While it holds a block, hits only knock it about (golf!); sneak and use an empty hand to take the block back.
// Large cubes split into two small ones; small ones grow up (slime balls speed that up) and fit in a bucket.
// On the surface above sulfur caves: sulfur springs (a pond ringed with sulfur, cinnabar, tuff and granite, with a geyser).
// Ice caves under cold biomes: ice, packed ice, calcite, icicles hanging from the ceiling (they fall if lit up too
// brightly) and glowing ice crystals. The Frostbite, a frozen zombie, lives there: its hits freeze you and some throw
// ice balls. Freezing (also from powder snow, and the new Potion of Freezing brewed from ice balls) slows you and
// hurts over time; leather armor keeps powder-snow cold out.
// ---------- one shared index per chunk of the blocks the run-time rules here and in 94-96 look after ----------
const CIDX_NAMES = [null, 'potent', 'icicle', 'pg', 'dg', 'chest', 'rod']; let CIDX_TAB = null;
function cidxTab() { if (CIDX_TAB) return CIDX_TAB; const t = new Uint8Array(BL.length + 1); for (const d of BL) { if (!d) continue; let k = 0;
    if (d.potent) k = 1; else if (d.icicle) k = 2; else if (d.heart || d.eyeblossom) k = 3; else if (d.hydration !== undefined) k = 4; else if (d.use === 'chest' && !d.ender && !(d.slots && d.slots !== 27)) k = 5; else if (d.fam === 'lightning_rod' || d.key === 'lightning_rod') k = 6; t[d.id] = k; }
  return (CIDX_TAB = t); }
function chunkIdx(c) { if (c.cidx && !c.cidxDirty) return c.cidx; const T = cidxTab(); const o = { potent: [], icicle: [], pg: [], dg: [], chest: [], rod: [] }; const d = c.d; for (let j = 0; j < d.length; j++) { const k = T[d[j]]; if (k) o[CIDX_NAMES[k]].push(j); } c.cidx = o; c.cidxDirty = false; return o; }
{ const _set = World.prototype.set; World.prototype.set = function (x, y, z, id) { const prev = this.get(x, y, z); const r = _set.apply(this, arguments); const T = cidxTab(); if (T[id] || T[prev]) { const c = this.getChunk(x >> 4, z >> 4); if (c) c.cidxDirty = true; } return r; }; }
// ---------- stonecutting ----------
for (const m of ['sulfur', 'cinnabar']) STONECUT.push([m, 'polished_' + m, 1], [m, m + '_bricks', 1], [m, 'chiseled_' + m, 1], ['polished_' + m, m + '_bricks', 1], ['polished_' + m, 'chiseled_' + m, 1], [m + '_bricks', 'chiseled_' + m, 1]);
// ---------- which cave biome is where ----------
function caveFlags(g, bx, bz) {
  if (!g.nCv1) { g.nCv1 = new Perlin(g.seed + 1401); g.nCv2 = new Perlin(g.seed + 1402); g.nCv3 = new Perlin(g.seed + 1403); }
  const lush = g.nW.f2(bx / 900 + 13, bz / 900 - 9, 2) > 0.2, drip = !lush && g.nT.f2(bx / 900 - 21, bz / 900 + 5, 2) > 0.22;
  const sulfur = !lush && !drip && g.nCv1.f2(bx / 700, bz / 700, 2) > 0.26;
  const ice = !lush && !drip && !sulfur && g.nT.f2(bx / 560, bz / 560, 2) < -0.12 && g.nCv2.f2(bx / 500, bz / 500, 2) > 0.05;
  const dark = g.nCv3.f2(bx / 600, bz / 600, 2) > 0.16;
  return { lush, drip, sulfur, ice, dark };
}
function caveBiomeName(g, x, y, z) {
  const col = g.column(x, z); if (y >= col.h - 6 || !g.cave) return null; const f = caveFlags(g, (x >> 4) * 16, (z >> 4) * 16);
  if (f.dark && y < YOFF - 14) return 'Deep Dark';
  if (f.sulfur && y > YOFF - 40 && y < YOFF + 40) return 'Sulfur Caves';
  if (f.ice && y > YOFF - 20) return 'Ice Caves';
  if (f.lush) return 'Lush Caves'; if (f.drip) return 'Dripstone Caves'; return null;
}
{ const _bn = Gen.prototype.biomeName; Gen.prototype.biomeName = function (x, z, y) {
    if (y !== undefined) { const c = this.column(x, z); if (y < c.h - 6 && this.cave(x, y, z) || y < c.h - 12) { const n = caveBiomeName(this, x, y, z); if (n) return n; } }
    return _bn.call(this, x, z); }; }
// ---------- world generation ----------
{ const _dec = decorate; decorate = function (world, S, cx, cz) {
    const r0 = _dec.apply(this, arguments); if (world.dim !== 'overworld') return r0; const g = world.gen, seed = world.seed; const r = mulberry32(ihash(cx, cz, 9311, seed)); const bx = cx * 16, bz = cz * 16;
    const hard = (x, y, z, id) => { if (y > 1 && y < WH) S.hard.push(x, y, z, id); }, soft = (x, y, z, id) => { if (y > 1 && y < WH) S.soft.push(x, y, z, id); };
    const f = caveFlags(g, bx, bz); const cv = (x, y, z) => g.cave(x, y, z);
    const sample = (yLo, yHi) => { const x = bx + (r() * 16 | 0), z = bz + (r() * 16 | 0); const col = g.column(x, z); const hi = Math.min(yHi, col.h - 7); if (hi <= yLo) return null; const y = yLo + (r() * (hi - yLo) | 0); if (!cv(x, y, z)) return null; return { x, y, z, floor: !cv(x, y - 1, z), ceil: !cv(x, y + 1, z) }; };
    // --- sulfur caves ---
    if (f.sulfur) {
      // sulfur pools: water ringed with sulfur and cinnabar, potent sulfur at the bottom (fumes); some sit on magma (geysers)
      for (let k = 0; k < 2; k++) { if (r() > 0.45) continue; let p = null; for (let t = 0; t < 30 && !(p && p.floor); t++) p = sample(YOFF - 36, YOFF + 34); if (!p || !p.floor) continue;
        const R = 2 + (r() * 2.5); const y = p.y - 1; const geyser = r() < 0.3;
        for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) { const d = Math.hypot(dx, dz); const x = p.x + dx, z = p.z + dz; if (d > R + 1.2) continue; if (cv(x, y, z) && !cv(x, y - 1, z)) continue;
          if (d <= R) { hard(x, y, z, B.WATER); hard(x, y + 1, z, cv(x, y + 1, z) ? 0 : B.WATER); if (cv(x, y + 1, z)) hard(x, y + 1, z, 0); hard(x, y - 1, z, d < 1.2 ? B.POTENT_SULFUR : r() < 0.6 ? B.SULFUR : B.CINNABAR); if (geyser && d < 1.2) hard(x, y - 2, z, B.MAGMA_BLOCK); }
          else hard(x, y, z, r() < 0.65 ? B.SULFUR : B.CINNABAR); }
      }
    }
    // sulfur springs on the surface above sulfur caves
    if (f.sulfur && r() < 1 / 24 && !startNear(world, 'village', cx, cz, 2)) { const x0 = bx + 4 + (r() * 8 | 0), z0 = bz + 4 + (r() * 8 | 0); const col = g.column(x0, z0);
      if (col.h > SEA + 1 && col.h < WH - 30 && col.b !== BIO.OCEAN && col.b !== BIO.BEACH) { const y = col.h - 1; const R = 2.6 + r();
        for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) { const d = Math.hypot(dx, dz); const x = x0 + dx, z = z0 + dz; if (d > R + 2) continue; const h2 = g.column(x, z).h;
          for (let yy = y + 1; yy < Math.max(h2, y + 1) + 2; yy++) hard(x, yy, z, 0);
          if (d <= R) { hard(x, y, z, B.WATER); hard(x, y - 1, z, d < 1 ? B.POTENT_SULFUR : B.SULFUR); if (d < 1) hard(x, y - 2, z, B.MAGMA_BLOCK); hard(x, y - 2 - (d < 1 ? 1 : 0), z, B.TUFF); }
          else { const v = r(); hard(x, y, z, v < 0.45 ? B.SULFUR : v < 0.7 ? B.CINNABAR : v < 0.85 ? B.TUFF : B.GRANITE); hard(x, y - 1, z, B.TUFF); if (r() < 0.2 && d > R + 0.6) soft(x, y + 1, z, B.SULFUR_SPIKE); } }
        S.kinds.push(['sulfur_spring', x0, z0]); } }
    return r0; }; }
// cave biomes are laid onto the chunk right after its caves are carved: every cave wall, floor and ceiling inside the
// biome's region gets its rock, and floors / ceilings get their spikes, icicles, crystals and sculk
const CAVE_ROCK = new Set(); for (const k of ['stone', 'deepslate', 'tuff', 'granite', 'diorite', 'andesite', 'dirt', 'gravel', 'cobbled_deepslate']) if (B[k.toUpperCase()] !== undefined) CAVE_ROCK.add(B[k.toUpperCase()]);
{ const _go = World.prototype.genOverworld; World.prototype.genOverworld = function (c) {
    const cols = _go.apply(this, arguments); const g = this.gen; const bx = c.cx * 16, bz = c.cz * 16; const f = caveFlags(g, bx, bz); if (!f.sulfur && !f.ice && !f.dark) return cols;
    const d = c.d, seed = this.seed; const I = (x, y, z) => (y * 16 + z) * 16 + x;
    const lay = (yLo, yHi, kind) => { for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) { const col = cols ? cols[z * 16 + x] : g.column(bx + x, bz + z); const top = Math.min(yHi, col.h - 7);
        for (let y = Math.max(2, yLo); y < top; y++) { const j = I(x, y, z); if (d[j] !== 0) continue; const wx = bx + x, wz = bz + z;
          const q = rnd01(wx, y, wz, seed + 6151); const rk = (xx, yy, zz) => { if (xx < 0 || xx > 15 || zz < 0 || zz > 15) return; const k = I(xx, yy, zz); if (!CAVE_ROCK.has(d[k])) return; const X = bx + xx, Z = bz + zz; const nv = kind.rock(Math.min(0.999, rnd01(X >> 2, yy >> 2, Z >> 2, seed + 6152) * 0.8 + rnd01(X, yy, Z, seed + 6153) * 0.2)); if (nv) d[k] = nv; };
          const floor = y > 1 && d[I(x, y - 1, z)] !== 0 && SOLID[d[I(x, y - 1, z)]], ceil = y < WH - 1 && SOLID[d[I(x, y + 1, z)]];
          rk(x, y - 1, z); rk(x, y + 1, z); rk(x - 1, y, z); rk(x + 1, y, z); rk(x, y, z - 1); rk(x, y, z + 1);
          if (floor && kind.floor) { const id = kind.floor(q); if (id) d[j] = id; } else if (ceil && kind.ceil) { const id = kind.ceil(q); if (id) d[j] = id; } } } };
    if (f.sulfur) lay(YOFF - 40, YOFF + 40, { rock: (v) => v < 0.55 ? B.SULFUR : v < 0.85 ? B.CINNABAR : v < 0.93 ? B.TUFF : B.GRANITE,
      floor: (q) => q < 0.07 ? B.SULFUR_SPIKE : q < 0.09 ? B.GLOW_LICHEN : 0, ceil: (q) => q < 0.07 ? B['SULFUR_SPIKE#HANG'] : q < 0.13 ? B['GLOW_LICHEN#1'] : 0 });
    if (f.ice) lay(YOFF - 20, SEA - 4, { rock: (v) => v < 0.4 ? B.PACKED_ICE : v < 0.7 ? B.ICE : v < 0.88 ? B.CALCITE : B.SNOW_BLOCK,
      floor: (q) => q < 0.035 ? B.ICE_CRYSTAL : q < 0.06 ? B.SNOW : 0, ceil: (q) => q < 0.12 ? B.ICICLE : q < 0.13 ? B.ICE_CRYSTAL : 0 });
    if (f.dark) lay(YOFF - 60, YOFF - 15, { rock: (v) => v < 0.75 ? B.SCULK : 0, floor: (q) => q < 0.006 ? B.SCULK_SENSOR : q < 0.008 && B.SCULK_SHRIEKER !== undefined ? B.SCULK_SHRIEKER : q < 0.05 && B.SCULK_VEIN !== undefined ? B.SCULK_VEIN : 0, ceil: null });
    return cols; }; }
// ---------- placing: spikes stand or hang, icicles hang, crystals stand or hang; they break without support ----------
{ const _pb = placeBlock; placeBlock = function (hit, id) {
    const d = BL[id]; if (!d || !hit || !(d.spike || d.icicle || d.iceCrystal)) return _pb.apply(this, arguments);
    const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz; if (!replaceableAt(x, y, z)) return false;
    const below = SOLID[world.get(x, y - 1, z)], above = SOLID[world.get(x, y + 1, z)]; let put = null;
    if (d.spike) put = hit.ny < 0 && above ? B['SULFUR_SPIKE#HANG'] : below ? B.SULFUR_SPIKE : above ? B['SULFUR_SPIKE#HANG'] : null;
    else if (d.icicle) put = above ? B.ICICLE : null; else put = below || above ? B.ICE_CRYSTAL : null;
    if (put == null) return false; world.set(x, y, z, put); mpBlock(x, y, z, put); Sfx.play(d.snd === 'glass' ? 'glass' : 'stone', 0.8, 1.2); return true; }; }
function supportNeed(id) { const d = BL[id]; if (!d) return null; if (d.spike === 'up') return 'below'; if (d.spike === 'down' || d.icicle) return 'above'; if (d.iceCrystal) return 'either'; return null; }
{ const _set = World.prototype.set; let busy = false; World.prototype.set = function (x, y, z, id) {
    const r = _set.apply(this, arguments); if (r === false || busy || this !== G.world || SOLID[id]) return r; busy = true;
    try { for (const dy of [1, -1]) { const yy = y + dy, nid = this.get(x, yy, z), need = supportNeed(nid); if (!need) continue;
        const below = SOLID[this.get(x, yy - 1, z)], above = SOLID[this.get(x, yy + 1, z)];
        if (need === 'below' ? below : need === 'above' ? above : (below || above)) continue;
        _set.call(this, x, yy, z, 0); mpBlock(x, yy, z, 0); Particles.blockBreak(x, yy, z, nid, 6); Sfx.at('glass', new V3(x, yy, z), 0.5, 1.3);
        if (isSurv() && BL[nid].drop) dropItem(IT[BL[nid].drop] !== undefined ? IT[BL[nid].drop] : nid, 1, x + 0.5, yy + 0.4, z + 0.5); } }
    finally { busy = false; } return r; }; }
// ---------- falling icicles (when light melts their hold) and sulfur spikes underfoot ----------
G.fallers = [];
function dropIcicle(x, y, z) {
  world.set(x, y, z, 0); mpBlock(x, y, z, 0); const geo = new THREE.BoxGeometry(0.18, 0.7, 0.18); const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xcfeafa, transparent: true, opacity: 0.85 }));
  mesh.position.set(x + 0.5, y + 0.5, z + 0.5); G.scene.add(mesh); G.fallers.push({ pos: new V3(x + 0.5, y + 0.4, z + 0.5), vy: 0, mesh, fallen: 0 }); Sfx.at('glass', new V3(x, y, z), 0.4, 1.6);
}
{ const _up = updatePlayer; let vy0 = 0; updatePlayer = function (dt) { const r = _up.apply(this, arguments); const P = player;
    for (const f of G.fallers) { if (f.done) continue; f.vy = Math.max(-30, f.vy - 28 * dt); f.pos.y += f.vy * dt; f.fallen -= f.vy * dt; f.mesh.position.copy(f.pos);
      const hitP = !P.dead && Math.abs(P.pos.x - f.pos.x) < 0.5 && Math.abs(P.pos.z - f.pos.z) < 0.5 && f.pos.y > P.pos.y && f.pos.y < P.pos.y + 1.9;
      const hitM = G.mobs.find(m => !m.dead && Math.abs(m.pos.x - f.pos.x) < m.hw + 0.2 && Math.abs(m.pos.z - f.pos.z) < m.hw + 0.2 && f.pos.y > m.pos.y && f.pos.y < m.pos.y + m.h);
      const dmg = Math.min(20, Math.ceil(2 + f.fallen * 0.8)); const blk = world.solid(Math.floor(f.pos.x), Math.floor(f.pos.y - 0.35), Math.floor(f.pos.z));
      if (hitP || hitM || blk || f.pos.y < 0) { f.done = true; G.scene.remove(f.mesh); f.mesh.geometry.dispose(); Particles.emit(f.pos.x, f.pos.y, f.pos.z, 12, [[0.85, 0.95, 1], [0.7, 0.85, 0.95]], 2, 0.4, 8, 0.3); Sfx.at('glass_break', f.pos, 0.7, 1.3);
        if (hitP && isSurv()) P.hurt(dmg, null, 'a falling icicle'); if (hitM) hitM.hurt(dmg, null, 0); } }
    G.fallers = G.fallers.filter(f => !f.done);
    // landing on a standing sulfur spike hurts (twice the fall damage, like pointed dripstone)
    if (P.onGround && vy0 < -7 && !P.flying) { const id = world.get(Math.floor(P.pos.x), Math.floor(P.pos.y), Math.floor(P.pos.z)); if (BL[id] && BL[id].spike === 'up' && isSurv()) P.hurt(Math.max(2, Math.round((-vy0 - 7) * 1.2)), null, 'a sulfur spike'); }
    vy0 = P.vel.y; return r; }; }
// ---------- freezing (powder snow, the Freezing effect) and nausea ----------
Object.assign(EFFECTS, { freezing: 'Freezing', nausea: 'Nausea' });
POT_EFF.freezing = ['freezing', 45]; POT_LONG.freezing = 90; POT_STRONG.freezing = ['freezing', 21.6, 1]; POT_NAMES.freezing = 'Freezing'; POT_COLOR.freezing = [170, 222, 250];
for (const k of ['freezing', 'long_freezing', 'strong_freezing']) POTIONS[k] = { base: 'freezing', long: k.startsWith('long'), strong: k.startsWith('strong'), effect: k.startsWith('strong') ? POT_STRONG.freezing : POT_EFF.freezing };
AWKWARD_TO.ice_ball = 'freezing'; BREW_ING.ice_ball = 1;
// freezing counts as one more level of slowness than its own
{ const _el = effLevel; effLevel = function (name) { const v = _el(name); if (name === 'slowness') { const f = _el('freezing'); return Math.max(v, f ? f + 1 : 0, S.frozenT >= 7 ? 1 : 0); } return v; }; }
S.frozenT = 0;
function frostOverlay(k) { let el = document.getElementById('frostOv'); if (!el) { el = document.createElement('div'); el.id = 'frostOv'; el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:4;opacity:0;background:radial-gradient(ellipse at center, rgba(200,235,255,0) 45%, rgba(214,240,255,0.55) 78%, rgba(236,248,255,0.9) 100%)'; document.body.appendChild(el); } el.style.opacity = k.toFixed(2); }
{ const _up = updatePlayer; let dmgT = 0, gasT = 0; updatePlayer = function (dt) { const r = _up.apply(this, arguments); const P = player; if (P.dead) { frostOverlay(0); return r; }
    const feet = world.get(Math.floor(P.pos.x), Math.floor(P.pos.y + 0.1), Math.floor(P.pos.z)), eye = world.get(Math.floor(P.pos.x), Math.floor(P.pos.y + 1.5), Math.floor(P.pos.z));
    const inPowder = BL[feet] && BL[feet].powder || BL[eye] && BL[eye].powder; const leather = player.inv.slice(36, 40).some(s => s && ITEMS[s.id] && /^leather_/.test(ITEMS[s.id].key));
    if (inPowder && !leather && isSurv()) S.frozenT = Math.min(7, S.frozenT + dt); else S.frozenT = Math.max(0, S.frozenT - dt * 2);
    const fz = effLevel('freezing') ? 1 : S.frozenT / 7; frostOverlay(fz * (effLevel('freezing') ? 0.85 : 1));
    if ((S.frozenT >= 7 || player.effects.freezing) && isSurv()) { dmgT += dt; const iv = player.effects.freezing ? 2 / (player.effects.freezing.amp + 1) : 2; if (dmgT >= iv) { dmgT = 0; P.hurt(1, null, 'freezing', 0); } } else dmgT = 0;
    // sulfur pool fumes: in water above potent sulfur
    gasT -= dt; if (gasT <= 0) { gasT = 0.5; if (FKIND[feet] === 1 || FKIND[eye] === 1) { const x = Math.floor(P.pos.x), z = Math.floor(P.pos.z); for (let dy = 0; dy <= 4; dy++) if (world.get(x, Math.floor(P.pos.y) - dy, z) === B.POTENT_SULFUR) { if (isSurv()) giveEffect('nausea', 10, 0); break; } } }
    return r; }; }
{ const _ma = Mob.prototype.update; Mob.prototype.update = function (dt) {
    const E = this.effects; if (E && E.freezing && !this.dead) { E.slowness = { t: E.freezing.t, amp: Math.max(E.slowness && E.slowness.t > E.freezing.t ? E.slowness.amp : 0, E.freezing.amp + 1) }; E.freezing.acc = (E.freezing.acc || 0) + dt; if (E.freezing.acc >= 2 / (E.freezing.amp + 1)) { E.freezing.acc = 0; this.hurt(this.type === 'stray' || this.type === 'frostbite' || this.type === 'polar_bear' ? 0 : 1, null, 0, true); } }
    return _ma.call(this, dt); }; }
// nausea: the view sways and rolls
{ const _uh = updateHand; updateHand = function (dt, light) { const r = _uh.apply(this, arguments); const e = player.effects.nausea;
    S.nausea = (S.nausea || 0) + ((e ? 1 : 0) - (S.nausea || 0)) * Math.min(1, dt * (e ? 0.8 : 2)); if (S.nausea > 0.01) { const t = performance.now() / 1000; camera.rotation.z += Math.sin(t * 1.7) * 0.09 * S.nausea; camera.rotation.x += Math.sin(t * 1.1) * 0.03 * S.nausea; }
    return r; }; }
// ---------- geysers: potent sulfur over magma (or lava) throws things upward every so often ----------
const GEYSER = new Map();
{ const _ub = updateBoats; let scanT = 0; updateBoats = function (dt) { const r = _ub(dt); if (!world || world.dim !== 'overworld') return r;
    scanT -= dt; const P = player.pos;
    if (scanT <= 0) { scanT = 1; const px = Math.floor(P.x), pz = Math.floor(P.z); const seen = new Set();
      for (const c of world.chunks.values()) { const ox = c.cx * 16, oz = c.cz * 16; if (Math.abs(ox + 8 - px) > 40 || Math.abs(oz + 8 - pz) > 40) continue;
        const ci = chunkIdx(c);
        for (const j of ci.potent) { const y = (j / 256) | 0, x = ox + (j & 15), z = oz + ((j >> 4) & 15); const k = x + ',' + y + ',' + z; seen.add(k); const below = world.get(x, y - 1, z);
          if (below !== B.MAGMA_BLOCK && FKIND[below] !== 2) { GEYSER.delete(k); continue; } if (!GEYSER.has(k)) GEYSER.set(k, { x, y, z, t: 3 + Math.random() * 10, on: 0 }); }
        // icicles melt loose and fall when the light around them is bright (torches, glowstone...)
        if (!isClientMP()) for (const j of ci.icicle) { const y = (j / 256) | 0, x = ox + (j & 15), z = oz + ((j >> 4) & 15); if (c.d[j] === B.ICICLE && world.blockLightAt(x + 0.5, y + 0.5, z + 0.5) >= 0.73 && Math.random() < 0.3) dropIcicle(x, y, z); } }
      for (const k of GEYSER.keys()) if (!seen.has(k)) GEYSER.delete(k); }
    for (const gz of GEYSER.values()) { if (world.get(gz.x, gz.y, gz.z) !== B.POTENT_SULFUR) continue; const near = Math.hypot(gz.x - P.x, gz.z - P.z) < 48;
      if (gz.on > 0) { gz.on -= dt; let top = gz.y + 1; while (top < gz.y + 14 && !SOLID[world.get(gz.x, top, gz.z)]) top++;
        if (near && Math.random() < dt * 30) Particles.emit(gz.x + 0.5, gz.y + 1 + Math.random() * (top - gz.y - 1), gz.z + 0.5, 3, [[0.92, 0.96, 0.9], [0.8, 0.88, 0.7]], 2.5, 0.8, -6, 0.4);
        const inCol = (e, hw) => Math.abs(e.pos.x - gz.x - 0.5) < 0.6 + hw && Math.abs(e.pos.z - gz.z - 0.5) < 0.6 + hw && e.pos.y >= gz.y + 0.5 && e.pos.y < top + 1;
        if (!player.dead && !player.flying && inCol(player, 0.3)) { player.vel.y = Math.max(player.vel.y, 16); player.peak = null; }
        for (const m of G.mobs) if (!m.dead && inCol(m, m.hw)) m.vel.y = Math.max(m.vel.y, 14);
        for (const it of G.items) if (!it.gone && inCol(it, 0.2)) it.vel.y = Math.max(it.vel.y, 12); }
      else { gz.t -= dt; if (gz.t <= 0) { gz.on = 2.5; gz.t = 8 + Math.random() * 16; if (near) Sfx.at('geyser', new V3(gz.x, gz.y, gz.z), 1); } } }
    return r; }; }
// ---------- death messages ----------
{ const DM = { freezing: 'froze to death', 'a falling icicle': 'was impaled by a falling icicle', 'a sulfur spike': 'was impaled on a sulfur spike', 'a sulfur cube': 'was blown up by a Sulfur Cube' };
  const _dm = deathMessage; deathMessage = function (cause) { return DM[cause] ? myName() + ' ' + DM[cause] : _dm.apply(this, arguments); };
}
const DEATH_YOU = { freezing: 'You froze to death', 'a falling icicle': 'You were impaled by a falling icicle', 'a sulfur spike': 'You were impaled on a sulfur spike', 'a sulfur cube': 'You were blown up by a Sulfur Cube' };
// ---------- sounds ----------
{ const _pl = Sfx.play; Sfx.play = function (name, v = 1, rate) { if (!this.ctx || v < 0.02) return _pl.apply(this, arguments);
    switch (name) {
      case 'geyser': this.nz(1.6, 500, 0.6 * v, 'lowpass'); this.nz(1.2, 2200, 0.25 * v, 'bandpass', 0.8); this.tone(70, 45, 1.2, 0.12 * v, 'sine'); return;
      case 'cube_absorb': this.tone(180, 520, 0.18, 0.12 * v, 'sine'); this.nz(0.15, 600, 0.3 * v, 'lowpass'); return;
      case 'cube_bounce': this.tone(260 * (rate || 1), 120 * (rate || 1), 0.12, 0.12 * v, 'sine'); this.nz(0.06, 900, 0.2 * v, 'lowpass'); return;
      case 'ice_throw': this.nz(0.14, 3000, 0.25 * v, 'bandpass', 2); return;
    }
    return _pl.apply(this, arguments); }; }
// ================= SULFUR CUBE =================
const CUBE_ARCH = { // bounce, ground friction, air drag, floats, knock multiplier
  bouncy: [0.9, 0.3, 0.01, true, 1.7], slow_bouncy: [0.6, 0.3, 0.05, false, 0.7], fast_flat: [0.22, 0.12, 0.02, true, 1.2], floaty: [0.95, 0.6, 1.8, true, 1],
  sticky: [0, 2, 0.1, false, 0.6], slippery: [0.3, 0.02, 0.02, false, 1.2], explosive: [0.5, 0.5, 0.3, false, 1], hot: [0.5, 0.4, 0.05, false, 0.9] };
function cubeArch(id) { const k = (BL[id] && BL[id].key) || '';
  if (k === 'tnt') return 'explosive'; if (k === 'magma_block') return 'hot'; if (/^(ice|packed_ice|blue_ice)$/.test(k)) return 'slippery'; if (/honey|honeycomb/.test(k)) return 'sticky'; if (/_wool$/.test(k) || k === 'wool') return 'floaty';
  if (/(log|_wood|planks|stem|hyphae|bamboo_block|bamboo_mosaic)/.test(k)) return 'bouncy';
  if (/(coral_block|sponge|dried_kelp|moss_block|pumpkin|melon|hay|froglight|slime_block|sculk$|resin|jack_o)/.test(k)) return 'fast_flat'; return 'slow_bouncy'; }
const SULFY = [226, 204, 74];
MOBS.sulfur_cube = { name: 'Sulfur Cube', hp: 8, w: 1.02, h: 1.02, speed: 1.6, kind: 'passive', ai: 'magma', snd: 'squish', egg: [[214, 190, 60], [150, 120, 30]], drops: [],
  build(m, r) { m.cubeRoot = r; sbox(m, r, 1, 1, 1, 0, 0.5, 0, 'scube_body', (f, set, fw, fh, rr) => { for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) { const e = x === 0 || y === 0 || x === fw - 1 || y === fh - 1; set(x, y, e ? [196, 170, 50] : vary(SULFY, rr, 7)); } if (f === 'front') { dots(set, [[2, 3], [5, 3]], [70, 54, 20]); dots(set, [[3, 5], [4, 5]], [150, 120, 40]); } }, { ppb: 8 });
    for (const mt of m.mats) { mt[0].transparent = true; mt[0].opacity = 0.62; mt[0].depthWrite = false; } } };
MOB_XP.sulfur_cube = [1, 2]; MOB_PITCH.sulfur_cube = 0.75;
function cubeShowBlock(m) { if (m.blockMesh) { m.cubeRoot.remove(m.blockMesh); m.blockMesh = null; } if (!m.absorbed || !m.cubeRoot) return;
  const mesh = new THREE.Mesh(blockGeo(m.absorbed), handMat); mesh.scale.setScalar(0.52); mesh.position.set(0, 0.5, 0); m.cubeRoot.add(mesh); m.blockMesh = mesh; }
function cubeAbsorb(m, id) { if (m.size < 2 || m.absorbed || !isCubeItem(id)) return false; m.absorbed = id; m.arch = cubeArch(id); cubeShowBlock(m); Sfx.at('cube_absorb', m.pos, 1); m.persistent = true; return true; }
{ const _sm = spawnMob; spawnMob = function (type, x, y, z, opts) { if (type === 'sulfur_cube') { opts = Object.assign({}, opts || {}); if (!opts.size) opts.size = Math.random() < 0.5 ? 1 : 2; if (opts.size > 2) opts.size = 2; }
    const m = _sm(type, x, y, z, opts); if (m && type === 'sulfur_cube') { m.growT = m.size === 1 ? 1200 : 0; } return m; }; }
// a large cube splits into two small ones (Minecraft's sulfur cube), dropping what it held
{ const _h = Mob.prototype.hurt; Mob.prototype.hurt = function (dmg, src, kb, na) {
    if (this.type !== 'sulfur_cube' || this.dead) return _h.apply(this, arguments);
    if (this.absorbed) { // holding a block it can't be hurt; a hit knocks it like a ball
      const A = CUBE_ARCH[this.arch] || CUBE_ARCH.slow_bouncy; const from = src && src.x !== undefined ? src : player.pos; const d = new V3(this.pos.x - from.x, 0, this.pos.z - from.z); if (d.lengthSq() < 1e-4) d.set(0, 0, 1); d.normalize();
      const k = (kb === undefined ? 1 : Math.max(0.4, kb)) * A[4]; this.vel.x += d.x * 9 * k; this.vel.z += d.z * 9 * k; this.vel.y = Math.max(this.vel.y, 4.5 * Math.min(1.4, k)); this.hurtT = 0.2; Sfx.at('cube_bounce', this.pos, 0.8, 1); return; }
    const wasAlive = !this.dead; const r = _h.apply(this, arguments);
    return r; }; }
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) {
    if (this.type !== 'sulfur_cube' || this.dead) return _u.call(this, dt);
    // small cubes grow up after 20 minutes (slime balls speed it up, a golden dandelion stops it)
    if (this.size === 1 && this.growT > 0 && !this.noGrow) { this.growT -= dt; if (this.growT <= 0 && !isClientMP()) { const m = spawnMob('sulfur_cube', this.pos.x, this.pos.y, this.pos.z, { size: 2 }); if (m) m.persistent = this.persistent; this.gone = true; this.dead = true; if (this.remove) this.remove(); return; } }
    if (!this.absorbed) { // swallow a full block lying nearby
      if (this.size >= 2 && !isClientMP()) { this.scanT = (this.scanT || 0) - dt; if (this.scanT <= 0) { this.scanT = 0.5; const it = G.items.find(i => !i.gone && i.age > 0.8 && isCubeItem(i.id) && i.pos.distanceTo(this.pos) < 1.6); if (it && cubeAbsorb(this, it.id)) { it.count--; if (it.count <= 0) { it.gone = true; it.remove(); } } } }
      return _u.call(this, dt); }
    // holding a block: no hopping of its own; the block's physics take over
    const A = CUBE_ARCH[this.arch] || CUBE_ARCH.slow_bouncy; const vy0 = this.vel.y; this.jumpT = 9;
    const water = inWater(this, 0.3); if (water && A[3]) this.vel.y = Math.min(this.vel.y + 30 * dt, 2.5);
    if (!this.onGround) { const f = Math.exp(-A[2] * dt * 4); this.vel.x *= f; this.vel.z *= f; if (A[2] > 1 && this.vel.y < -2.5) this.vel.y = -2.5; }
    else { const f = Math.exp(-A[1] * dt * 9); this.vel.x *= f; this.vel.z *= f; }
    const r = _u.call(this, dt); this.jumpT = 9;
    if (this.onGround && vy0 < -2.2 && A[0] > 0.05) { this.vel.y = -vy0 * A[0]; if (-vy0 > 4) Sfx.at('cube_bounce', this.pos, 0.5, 0.9 + A[0] * 0.3); }
    if (this.arch === 'hot' && !player.dead && isSurv() && player.pos.distanceTo(this.pos) < this.hw + 0.7) { this.burnHit = (this.burnHit || 0) - dt; if (this.burnHit <= 0) { this.burnHit = 0.5; player.hurt(1, this.pos, 'a magma block', 0.2); } }
    if (this.fuse > 0) { this.fuse -= dt; if (Math.random() < dt * 10) Particles.emit(this.pos.x, this.pos.y + 1.1, this.pos.z, 1, [[0.6, 0.6, 0.6]], 0.5, 0.6, -1, 0.1); if (this.root) this.root.visible = Math.floor(this.fuse * 6) % 2 === 0 || this.fuse > 3;
      if (this.fuse <= 0) { const p = this.pos.clone(); this.dead = true; this.gone = true; if (this.remove) this.remove(); explode(p.x, p.y + 0.5, p.z, 4, null, { cause: 'a sulfur cube' }); } }
    return r; }; }
// a large cube splits into exactly two small ones
{ const _dl = Mob.prototype.dropLoot; Mob.prototype.dropLoot = function () { if (this.type !== 'sulfur_cube' || this.size < 2) return _dl.apply(this, arguments);
    for (let i = 0; i < 2; i++) { const m = spawnMob('sulfur_cube', this.pos.x + (i - 0.5) * 0.6, this.pos.y + 0.2, this.pos.z + (Math.random() - 0.5) * 0.6, { size: 1 }); if (m) m.vel.set((i - 0.5) * 4, 4, (Math.random() - 0.5) * 3); }
    const s0 = this.size; this.size = 1; try { return _dl.apply(this, arguments); } finally { this.size = s0; } }; }
// on death: the held block drops; small cubes drop nothing
{ const _h = Mob.prototype.hurt; Mob.prototype.hurt = function () { const was = this.dead; const r = _h.apply(this, arguments); if (this.type === 'sulfur_cube' && !was && this.dead && this.absorbed) { dropItem(this.absorbed, 1, this.pos.x, this.pos.y + 0.5, this.pos.z); this.absorbed = 0; } return r; }; }
// feeding, lighting, taking the block back, bucketing
{ const _ua = useAction; useAction = function (eye, dir) {
    const m = targetMob; const h = player.held(); const hd = h && ITEMS[h.id];
    if (m && m.type === 'sulfur_cube' && !m.dead) {
      const done = () => { mouseR = false; S.swing = 1; S.useCD = 0.25; };
      if (!h && kd('sneak') && m.absorbed) { const id = m.absorbed; m.absorbed = 0; m.arch = null; m.fuse = 0; cubeShowBlock(m); giveOrDrop(id, 1); Sfx.at('cube_absorb', m.pos, 0.8); done(); return; }
      if (h && m.arch === 'explosive' && (h.id === IT.flint_and_steel || h.id === IT.fire_charge) && !(m.fuse > 0)) { m.fuse = 6; Sfx.at('hiss', m.pos, 1); if (h.id === IT.flint_and_steel) damageHeld(1); else useHeld(1); done(); return; }
      if (h && hd && hd.kind === 'block' && isCubeItem(h.id) && m.size >= 2 && !m.absorbed) { if (cubeAbsorb(m, h.id)) { if (S.mode !== 'creative') useHeld(1); done(); return; } }
      if (h && h.id === IT.slime_ball && m.size === 1) { m.growT *= 0.9; useHeld(1); Particles.emit(m.pos.x, m.pos.y + 0.6, m.pos.z, 6, [[0.5, 0.9, 0.4]], 1, 0.6, -1, 0.3); done(); return; }
      if (h && IT.golden_dandelion !== undefined && h.id === IT.golden_dandelion && m.size === 1) { m.noGrow = !m.noGrow; useHeld(1); done(); return; }
      if (h && h.id === IT.bucket && m.size === 1) { m.dead = true; m.gone = true; if (m.remove) m.remove(); G.mobs = G.mobs.filter(x => x !== m); if (S.mode !== 'creative') { if (h.count > 1) { h.count--; giveOrDrop(IT.sulfur_cube_bucket, 1); } else player.inv[handSlot()] = { id: IT.sulfur_cube_bucket, count: 1 }; invDirty(); } else giveOrDrop(IT.sulfur_cube_bucket, 1); Sfx.play('squish', 0.8); done(); return; }
    }
    if (hd && hd.kind === 'cubebucket' && target && !targetMob) { const x = target.x + target.nx, y = target.y + target.ny, z = target.z + target.nz; if (replaceableAt(x, y, z)) { const c = spawnMob('sulfur_cube', x + 0.5, y + 0.05, z + 0.5, { size: 1 }); if (c) c.persistent = true; if (S.mode !== 'creative') player.inv[handSlot()] = { id: IT.bucket, count: 1 }; invDirty(); Sfx.play('squish', 0.8); mouseR = false; S.swing = 1; } return; }
    if (hd && hd.kind === 'ice_ball' && !(target && !kd('sneak') && BL[target.id].use)) { mouseR = false; useHeld(1); const v = dir.clone().multiplyScalar(26); v.x += player.vel.x; v.z += player.vel.z; spawnProj('ice_ball', eye.clone().addScaledVector(dir, 0.5), v, 'player', 2); Sfx.play('ice_throw', 0.6, 1.2); S.useCD = 0.4; S.swing = 1; return; }
    return _ua.apply(this, arguments); }; }
// sulfur cubes spawn in the dark of sulfur caves, like monsters (but they're harmless)
{ const _se = spawnExtras; spawnExtras = function (dt) { _se(dt); if (!world || world.dim !== 'overworld' || isClientMP() || Math.random() > 0.08) return;
    if (G.mobs.filter(m => m.type === 'sulfur_cube').length >= 6) return; const P = player.pos;
    for (let t = 0; t < 4; t++) { const a = Math.random() * Math.PI * 2, d = 18 + Math.random() * 26; const x = Math.floor(P.x + Math.cos(a) * d), z = Math.floor(P.z + Math.sin(a) * d); if (!world.loaded(x, z)) continue;
      const y0 = clamp(Math.floor(P.y) + (Math.random() * 24 | 0) - 12, 3, WH - 4); if (caveBiomeName(world.gen, x, y0, z) !== 'Sulfur Caves') continue;
      for (let y = y0; y > y0 - 12; y--) if (!world.get(x, y, z) && !world.get(x, y + 1, z) && SOLID[world.get(x, y - 1, z)] && world.blockLightAt(x + 0.5, y + 0.5, z + 0.5) < 0.1) { spawnMob('sulfur_cube', x + 0.5, y, z + 0.5); return; } } }; }
// ================= FROSTBITE (frozen zombie) AND ICE BALLS =================
const FROSTY = [150, 196, 214];
MOBS.frostbite = { name: 'Frostbite', hp: 20, w: 0.6, h: 1.95, speed: 2.2, kind: 'hostile', dmg: 3, snd: 'groan', burns: true, egg: [[120, 170, 196], [226, 244, 252]],
  drops: [['rotten_flesh', 0, 2, 1], ['ice_ball', 0, 2, 1]], onHit(m, P) { giveEffect('freezing', 4, 0); },
  build(m, r) { humanoidS(m, r, 'frostbite', { head: fur(FROSTY, 7, { speck: [[230, 248, 255], 0.16], extra: (f, set, fw) => { if (f !== 'front') return; dots(set, [[1, 4], [2, 4], [fw - 3, 4], [fw - 2, 4]], [20, 50, 80]); for (let x = 1; x < fw - 1; x++) set(x, 0, [240, 250, 255]); } }),
    body: fur([70, 100, 128], 7, { speck: [[200, 230, 245], 0.18] }), arm: fur(FROSTY, 7, { topRows: [3, [70, 100, 128]], speck: [[236, 248, 255], 0.12] }), leg: fur([60, 84, 108], 6, { foot: [2, FROSTY] }) }, true); } };
MOB_XP.frostbite = [5, 5]; UNDEAD.add('frostbite'); MOB_PITCH.frostbite = 0.95;
PROJ.ice_ball = { grav: 12, size: 0.24, color: 0xbfe6ff };
{ const _sm = spawnMob; spawnMob = function (type, x, y, z, opts) {
    if (S.natSpawn && world && world.dim === 'overworld' && type === 'zombie' && caveBiomeName(world.gen, Math.floor(x), Math.floor(y), Math.floor(z)) === 'Ice Caves' && Math.random() < 0.8) type = 'frostbite';
    const m = _sm(type, x, y, z, opts); if (m && type === 'frostbite') m.thrower = Math.random() < 0.5; return m; }; }
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) { const r = _u.call(this, dt);
    if (this.type === 'frostbite' && this.thrower && !this.dead && !isClientMP() && isSurv() && !player.dead) { this.throwT = (this.throwT || 2) - dt; const d = this.pos.distanceTo(player.pos);
      if (this.throwT <= 0 && d > 3.5 && d < 14 && lineOfSight(new V3(this.pos.x, this.pos.y + 1.6, this.pos.z), player.eye())) { this.throwT = 3 + Math.random() * 2; const from = new V3(this.pos.x, this.pos.y + 1.5, this.pos.z); const to = player.eye().add(new V3(0, -0.4 + d * 0.06, 0)); fireAt('ice_ball', from, to, 22, 'mob', 3, this); Sfx.at('ice_throw', from, 0.8); this.armSwing = 0.3; } }
    return r; }; }
{ const _pi = projImpact; projImpact = function (a, mob) {
    if (a.kind !== 'ice_ball') return _pi(a, mob); a.done = true; Particles.emit(a.pos.x, a.pos.y, a.pos.z, 10, [[0.85, 0.95, 1], [0.6, 0.8, 0.95]], 1.8, 0.4, 8, 0.3); Sfx.at('glass', a.pos, 0.5, 1.6); vibrate(a.pos, a.src || 'player');
    if (mob && !mob.dead) mob.hurt(mob.type === 'blaze' ? 5 : 2, a.pos.clone().addScaledVector(a.vel, -0.2), 0.8, a.owner !== 'player'); }; }
{ const _up = updateProjectiles; updateProjectiles = function (dt) { const P = player;
    for (const a of G.projectiles) { if (a.kind !== 'ice_ball' || a.done) continue; a.vel.multiplyScalar(Math.pow(0.99, dt * 20));
      if (a.owner === 'player') { for (const m of G.mobs) { if (m.dead || m.isBoss) continue; if (hitsMob(m, a.pos, 0.2)) { projImpact(a, m); break; } } }
      else if (!P.dead && Math.abs(a.pos.x - P.pos.x) < 0.45 && Math.abs(a.pos.z - P.pos.z) < 0.45 && a.pos.y > P.pos.y && a.pos.y < P.pos.y + 1.85) { a.done = true; Particles.emit(a.pos.x, a.pos.y, a.pos.z, 10, [[0.85, 0.95, 1]], 1.8, 0.4, 8, 0.3); Sfx.at('glass', a.pos, 0.6, 1.6);
        if (isSurv() && !(P.blocking)) { P.hurt(a.dmg || 3, a.src ? a.src.pos : a.pos, 'a Frostbite'); const k = a.vel.clone().setY(0).normalize(); P.vel.x += k.x * 5; P.vel.z += k.z * 5; P.vel.y = Math.max(P.vel.y, 3); } else if (P.blocking) Sfx.play('shield', 0.8); } }
    return _up.apply(this, arguments); }; }
// ---------- creative inventory: put the new things together ----------
{ const keys = ['sulfur', 'polished_sulfur', 'sulfur_bricks', 'chiseled_sulfur', 'potent_sulfur', 'sulfur_spike', 'cinnabar', 'polished_cinnabar', 'cinnabar_bricks', 'chiseled_cinnabar', 'icicle', 'ice_crystal', 'ice_ball', 'sulfur_cube_bucket', 'music_disc_bounce'];
  const ids = keys.map(k => IT[k]).filter(v => v !== undefined); const set = new Set(ids); const rest = ITEM_IDS.filter(i => !set.has(i)); rest.push(...ids); ITEM_IDS.length = 0; ITEM_IDS.push(...rest); }

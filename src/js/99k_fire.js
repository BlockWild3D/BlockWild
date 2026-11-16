// ================= FIRE =================
// Flint and steel lights a real flame on the block you click (on top of a solid block, or against anything that
// burns). Fire gives light, hurts and sets you alight for a few seconds (water puts you out), burns away wood,
// planks, leaves, wool and plants and spreads along them, sets off TNT, and dies down by itself on things that don't
// burn. It burns for ever on netherrack. Punch it or pour water on it to put it out. With the game rule "Fire
// spreads" off it neither spreads nor burns anything away.
const FLAMMABLE = new Uint8Array(4096); const FIRE_ETERNAL = new Set();
{ const no = /crimson|warped|stone|brick|deepslate|copper|quartz|sandstone|prismarine|purpur|blackstone|nether|mud|tuff|iron|chest|barrel|table|furnace|door|sign|bed$|note|juke|composter|lectern|loom/;
  const yes = /(log|wood|planks|leaves|wool|carpet|hay|bookshelf|bamboo|_fence|_slab|_stairs|sapling|vine|leaf_litter|tall_grass|fern|dead_bush|flower|dandelion|scaffolding|sugar_cane|shrub|petals|stem$|hyphae)/;
  for (const d of BL) { if (!d || !d.key || d.isFire || no.test(d.key) || !yes.test(d.key)) continue; if (d.snd === 'wood' || d.snd === 'grass' || d.snd === 'wool' || d.plant) FLAMMABLE[d.id] = 1; }
  for (const k of ['NETHERRACK', 'MAGMA_BLOCK', 'SOUL_SAND', 'SOUL_SOIL']) if (B[k] != null) FIRE_ETERNAL.add(B[k]); }
const FIRE_N6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
function fireCanStay(w, x, y, z) { if (SOLID[w.get(x, y - 1, z)]) return true; for (const [a, b, c] of FIRE_N6) if (FLAMMABLE[w.get(x + a, y + b, z + c)]) return true; return false; }
function fires(w) { return w.fires || (w.fires = new Map()); }
{ const _set = World.prototype.set; World.prototype.set = function (x, y, z, id) { const r = _set.apply(this, arguments); const k = x + ',' + y + ',' + z; if (id === B.FIRE) fires(this).set(k, [x, y, z]); else if (this.fires && this.fires.has(k)) this.fires.delete(k); return r; }; }
// fires saved in a world are found again when it loads
function fireScan(w) { const F = fires(w); F.clear(); for (const [ck, m] of w.edits) { const cx = Math.floor(ck / 65536) - 32768, cz = (ck % 65536) - 32768; for (const [i, id] of m) if (id === B.FIRE) { const x = cx * 16 + (i & 15), z = cz * 16 + ((i >> 4) & 15), y = i >> 8; F.set(x + ',' + y + ',' + z, [x, y, z]); } } }
{ const _fl = finishLoading; finishLoading = function () { const r = _fl.apply(this, arguments); try { fireScan(world); } catch (e) { console.warn(e); } return r; }; }
// flint and steel
{ const _ua = useAction; useAction = function (eye, dir) { const hd = player.heldDef(); const t = target;
    if (!(hd && hd.kind === 'fns' && t) || t.id === B.TNT) return _ua.apply(this, arguments);
    const cross = BL[t.id] && !SOLID[t.id] && t.id !== B.FIRE; const x = cross ? t.x : t.x + t.nx, y = cross ? t.y : t.y + t.ny, z = cross ? t.z : t.z + t.nz;
    const r = _ua.apply(this, arguments);
    const here = world.get(x, y, z); if ((here === 0 || (cross && FLAMMABLE[here])) && fireCanStay(world, x, y, z) && !(typeof isAdv === 'function' && isAdv())) world.set(x, y, z, B.FIRE);
    S.useCD = 0.25; return r; }; }
let fireT = 0, fireHurtT = 0, fireSnd = 0;
function fireTick(dt) {
  const w = world; if (!w || !w.fires) return; const F = w.fires; const P = player;
  // you and the mobs
  const inFire = (e) => { const x = Math.floor(e.pos.x), z = Math.floor(e.pos.z); return w.get(x, Math.floor(e.pos.y + 0.1), z) === B.FIRE || w.get(x, Math.floor(e.pos.y + 1), z) === B.FIRE; };
  if (F.size && !P.dead && isSurv() && inFire(P)) P.fireT = 4;
  if (P.fireT > 0) { if (inWater(P, 0.4) || P.dead || !isSurv() || (typeof weatherWet === 'function' && weatherWet(P.pos))) { if (P.fireT > 0 && !P.dead && isSurv()) Sfx.play('fizz', 0.5); P.fireT = 0; }
    else { P.fireT -= dt; fireHurtT -= dt; if (Math.random() < dt * 14) SpriteFX.emit('flame', P.pos.x + (Math.random() - 0.5) * 0.5, P.pos.y + Math.random() * 1.6, P.pos.z + (Math.random() - 0.5) * 0.5, 1, { size: 0.22, grav: -1, spd: 0.3, life: 0.5, spread: 0.3 }) || Particles.emit(P.pos.x + (Math.random() - 0.5) * 0.5, P.pos.y + Math.random() * 1.6, P.pos.z + (Math.random() - 0.5) * 0.5, 1, [[1, 0.7, 0.15], [1, 0.4, 0.05]], 0.4, 0.5, -2.5, 0.5);
      if (fireHurtT <= 0) { fireHurtT = 1; if (!effLevel('fire_resistance')) { P.hurtCD = 0; P.hurt(1, null, 'fire', 0); } } } }
  const ov = $('fireOv'); if (ov) ov.style.opacity = P.fireT > 0 && !(S.pov > 0) ? 0.55 + 0.1 * Math.sin(performance.now() / 90) : 0;
  fireT += dt; if (fireT < 0.5) return; fireT = 0; if (!F.size) return;
  for (const m of G.mobs) if (!m.dead && !m.isBoss && m.vel && !(m.t && m.t.fireproof) && inFire(m)) { m.hurt(1, null, 0); SpriteFX.emit('flame', m.pos.x, m.pos.y + (m.h || 1) * 0.5, m.pos.z, 4, { size: 0.22, grav: -1, spd: 0.5, life: 0.5, spread: 0.4 }) || Particles.emit(m.pos.x, m.pos.y + (m.h || 1) * 0.5, m.pos.z, 4, [[1, 0.6, 0.1], [1, 0.3, 0.05]], 0.8, 0.6, -2, 0.6); }
  const spread = S.rules.doFireTick !== false && !(typeof mpClient === 'function' && mpClient()); const rain = typeof weatherWet === 'function' && S.weather !== 'clear' && w.dim === 'overworld';
  let n = 0; for (const [k, [x, y, z]] of [...F]) { if (++n > 400) break;
    if (w.get(x, y, z) !== B.FIRE) { F.delete(k); continue; } if (!w.getChunk(Math.floor(x / 16), Math.floor(z / 16))) continue;
    if (Math.random() < 0.25) SpriteFX.emit('big_smoke', x + 0.5, y + 0.9, z + 0.5, 1, { size: 0.5, grav: -1.5, spd: 0.2, life: 1.4, spread: 0.3, tint: [0.45, 0.45, 0.45] }) || Particles.emit(x + 0.5, y + 0.9, z + 0.5, 1, [[0.25, 0.25, 0.25], [0.4, 0.4, 0.4]], 0.3, 1.2, 1.2, 0.4);
    if (!fireCanStay(w, x, y, z)) { w.set(x, y, z, 0); continue; }
    if (!spread) continue;
    if (rain && weatherWet(new V3(x + 0.5, y, z + 0.5)) && Math.random() < 0.4) { w.set(x, y, z, 0); Sfx.at('fizz', new V3(x, y, z), 0.3); continue; }
    let fuel = 0;
    for (const [a, b, c] of FIRE_N6) { const X = x + a, Y = y + b, Z = z + c; const id = w.get(X, Y, Z);
      if (id === B.TNT) { w.set(X, Y, Z, 0); primeTNT(X, Y, Z); continue; }
      if (!FLAMMABLE[id]) continue; fuel++;
      if (Math.random() < (b > 0 ? 0.22 : 0.1)) { w.set(X, Y, Z, Math.random() < 0.7 ? B.FIRE : 0); continue; } // it burns away
      // flames lick out to the air next to what burns
      if (Math.random() < 0.3) { const [d, e, g] = FIRE_N6[(Math.random() * 6) | 0]; const U = X + d, V = Y + e, W = Z + g; if (w.get(U, V, W) === 0 && fireCanStay(w, U, V, W) && F.size < 300) w.set(U, V, W, B.FIRE); } }
    if (!fuel && !FIRE_ETERNAL.has(w.get(x, y - 1, z)) && Math.random() < 0.14) w.set(x, y, z, 0);
  }
  fireSnd -= 0.5; if (fireSnd <= 0 && F.size) { let near = null, bd = 144; for (const [x, y, z] of F.values()) { const d = (x - P.pos.x) ** 2 + (y - P.pos.y) ** 2 + (z - P.pos.z) ** 2; if (d < bd) { bd = d; near = [x, y, z]; } } if (near) { Sfx.at('fizz', new V3(near[0], near[1], near[2]), 0.12, 0.55 + Math.random() * 0.2); fireSnd = 1.5 + Math.random() * 2; } }
}
{ const _t = tick; tick = function (dt) { const r = _t.apply(this, arguments); try { if (S.started && !S.loading) fireTick(dt); } catch (e) { if (!fireTick.warned) { fireTick.warned = true; console.warn(e); } } return r; }; }
// the burning overlay at the bottom of the screen
{ const d = document.createElement('div'); d.id = 'fireOv'; d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:34vh;pointer-events:none;opacity:0;transition:opacity .15s;z-index:3;background:linear-gradient(to top,rgba(255,150,20,.85),rgba(255,90,10,.45) 45%,rgba(255,60,0,0))'; document.body.appendChild(d); }
if (typeof DEATH_YOU !== 'undefined') DEATH_YOU.fire = 'You burned to death';
{ const _die = Player.prototype.die; Player.prototype.die = function () { this.fireT = 0; return _die.apply(this, arguments); }; }

// (A bare hand knocks back exactly like any tool, as in Minecraft; the earlier half-strength punch was removed.)

// ================= EXPLOSIONS THAT START FIRES (Minecraft) =================
// Respawn anchors and beds used in the wrong dimension explode with power 5 and leave fire: a third of the open blocks
// with something solid under them inside the blast catch light.
{ const _ex = explode; explode = function (cx, cy, cz, r, src, opts) { const res = _ex.apply(this, arguments);
    try { if (opts && opts.fire && B.FIRE != null && S.rules.doFireTick !== false && !(typeof MP !== 'undefined' && MP.applying)) { const w = G.world; const R = Math.ceil(r);
        for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) for (let z = -R; z <= R; z++) { if (x * x + y * y + z * z > r * r || Math.random() > 1 / 3) continue; const X = Math.floor(cx) + x, Y = Math.floor(cy) + y, Z = Math.floor(cz) + z;
          if (w.get(X, Y, Z) === 0 && SOLID[w.get(X, Y - 1, Z)] && BL[w.get(X, Y - 1, Z)].opaque) w.set(X, Y, Z, B.FIRE); } } } catch (e) { console.warn(e); }
    return res; }; }

// ================= LIT TNT: HOOK IT WITH A FISHING ROD, KNOCK IT WITH ARROWS =================
// A lit TNT is something you can move, as in Minecraft: cast a fishing rod at it and reel in to yank it towards you
// (and past you), or shoot it and the arrow shoves it along its flight (Punch shoves harder). A flaming arrow that
// hits a TNT block lights it.
{ const _ub = updateBobber; updateBobber = function (dt) {
    const B0 = bobber;
    if (B0) { if (B0.hooked && B0.hooked.isTnt && !tntList().includes(B0.hooked)) B0.hooked.gone = true;
      if (!B0.hooked && !B0.stuck && B0.phase === 'fly') for (const t of tntList()) { if (Math.abs(B0.pos.x - t.pos.x) < 0.65 && Math.abs(B0.pos.z - t.pos.z) < 0.65 && B0.pos.y > t.pos.y - 0.15 && B0.pos.y < t.pos.y + 1.15) { t.isTnt = true; B0.hooked = t; Sfx.at('pop', t.pos, 0.4); break; } } }
    return _ub.apply(this, arguments); }; }
{ const _up = updateProjectiles; updateProjectiles = function (dt) {
    for (const a of G.projectiles) { if (a.done || a.kind !== 'arrow' || a.stuckT > 0) continue; const sp = a.vel.length(); if (sp < 4) continue;
      for (const t of tntList()) { if (Math.abs(a.pos.x - t.pos.x) < 0.6 && Math.abs(a.pos.z - t.pos.z) < 0.6 && a.pos.y > t.pos.y - 0.1 && a.pos.y < t.pos.y + 1.1) { const k = 0.16 + 0.12 * (a.punch || 0); t.vel.x += a.vel.x * k; t.vel.z += a.vel.z * k; t.vel.y += Math.max(1.5, a.vel.y * k + 2); a.done = true; Sfx.at('hit', t.pos, 0.5); Particles.emit(a.pos.x, a.pos.y, a.pos.z, 5, [[0.8, 0.8, 0.8]], 1.2, 0.3, 4, 0.3); break; } }
      if (!a.done && a.flame) { const n = a.vel.clone().normalize(); const reach = sp * dt + 0.35; for (let d = 0; d <= reach; d += 0.2) { const x = Math.floor(a.pos.x + n.x * d), y = Math.floor(a.pos.y + n.y * d), z = Math.floor(a.pos.z + n.z * d); const id = world.get(x, y, z); if (id === B.TNT) { world.set(x, y, z, 0); primeTNT(x, y, z); a.done = true; break; } if (SOLID[id]) break; } } }
    return _up.apply(this, arguments); }; }

// ---- lit TNT is shared in multiplayer ----
// The host runs every lit TNT and sends where it is 15 times a second; friends see the same TNT in the same place,
// flashing and swelling before it blows. When a friend lights TNT, hooks it or shoots it, that goes to the host and
// comes back to everyone, so TNT fights (lighting it, pulling it, shooting it into the other player) work between players.
const TNT_GHOST = new Map(); let tntSeq = 0, tntSendT = 0, tntHad = false;
function tntList() { return typeof mpClient === 'function' && mpClient() ? [...TNT_GHOST.values()] : G.tnts; }
{ const _pt = primeTNT; primeTNT = function (x, y, z, fuse) {
    if (typeof mpClient === 'function' && mpClient()) { mpToHost({ t: 'tnt', a: 'prime', x, y, z, f: fuse == null ? 3 : fuse }); Sfx.at('hiss', new V3(x, y, z), 1); return; }
    return _pt.apply(this, arguments); }; }
function tntGhostDrop(id) { const g = TNT_GHOST.get(id); if (!g) return; G.scene.remove(g.mesh); g.mat.dispose(); g.gone = true; TNT_GHOST.delete(id); }
{ const _on = onPeerMsg; onPeerMsg = function (peer, m) {
    if (m.t !== 'tnt') return _on(peer, m);
    if (MP.role === 'host') { const av = MP.avatars.get(peer.id);
      if (m.a === 'prime') { if (av && Math.hypot(m.x - av.pos.x, m.z - av.pos.z) < 96 && G.tnts.length < 200) primeTNT(m.x | 0, m.y | 0, m.z | 0, clamp(+m.f || 3, 0.3, 10)); }
      else if (m.a === 'push') { const t = G.tnts.find(q => q.nid === m.id); if (t && Array.isArray(m.v)) { const v = new V3(+m.v[0] || 0, +m.v[1] || 0, +m.v[2] || 0); if (v.length() > 45) v.setLength(45); t.vel.add(v); } }
      return; }
    if (peer.id !== 'host' || m.a !== 's') return; const seen = new Set();
    if (m.dim === world.dim) for (const [id, x, y, z, fuse] of m.l) { seen.add(id); let g = TNT_GHOST.get(id);
      if (!g) { const mat = new THREE.MeshLambertMaterial({ map: atlasTex }); const mesh = new THREE.Mesh(blockGeo(B.TNT), mat); mesh.layers.enable(1); G.scene.add(mesh); g = { nid: id, pos: new V3(x, y, z), tgt: new V3(x, y, z), vel: new V3(), hw: 0.49, h: 0.98, fuse, mesh, mat, isTnt: true }; TNT_GHOST.set(id, g); }
      g.tgt.set(x, y, z); g.fuse = fuse; }
    for (const id of [...TNT_GHOST.keys()]) if (!seen.has(id)) tntGhostDrop(id); }; }
function tntNetTick(dt) {
  if (!(typeof MP !== 'undefined' && MP.active)) { if (TNT_GHOST.size) for (const id of [...TNT_GHOST.keys()]) tntGhostDrop(id); return; }
  if (MP.role === 'host') { tntSendT += dt; if (tntSendT < 0.066) return; tntSendT = 0; if (!G.tnts.length && !tntHad) return; tntHad = G.tnts.length > 0;
    mpSendAll({ t: 'tnt', a: 's', dim: world.dim, l: G.tnts.map(t => [t.nid || (t.nid = ++tntSeq), +t.pos.x.toFixed(2), +t.pos.y.toFixed(2), +t.pos.z.toFixed(2), +t.fuse.toFixed(2)]) }, true); return; }
  for (const g of TNT_GHOST.values()) { g.pos.lerp(g.tgt, Math.min(1, dt * 18)); g.fuse -= dt; g.mesh.position.set(g.pos.x, g.pos.y + 0.49, g.pos.z); const fl = Math.floor(g.fuse * 5) % 2 === 0; g.mesh.scale.setScalar(g.fuse < 0.4 ? 1 + (0.4 - g.fuse) * 0.6 : 1); g.mat.emissive.setRGB(fl ? 0.8 : 0, fl ? 0.8 : 0, fl ? 0.8 : 0);
    if (g.vel.lengthSq() > 0.01) { mpToHost({ t: 'tnt', a: 'push', id: g.nid, v: [+g.vel.x.toFixed(2), +g.vel.y.toFixed(2), +g.vel.z.toFixed(2)] }); g.vel.set(0, 0, 0); } } }
{ const _t = tick; tick = function (dt) { const r = _t.apply(this, arguments); try { if (S.started && !S.loading) tntNetTick(dt); } catch (e) { if (!tntNetTick.warned) { tntNetTick.warned = true; console.warn(e); } } return r; }; }

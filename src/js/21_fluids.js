// ================= LIQUIDS (Minecraft flow rules) =================
// Sources (B.WATER / B.LAVA) never move. Flowing liquid keeps a level: water loses 1 per block (7 blocks), lava 2 in the
// Overworld (3 blocks) and 1 in the Nether (7). Falling liquid (level 8) spreads out again where it lands. Flowing liquid
// heads for the nearest drop within 4 blocks (water, Nether lava) or 2 (Overworld lava) and spreads evenly when none is near.
// Two water sources beside a block over a solid floor make a new source. Water ticks every 5 game ticks, lava every 30
// (10 in the Nether). Lava touching water turns into obsidian (source) or cobblestone (flowing); lava flowing down into
// water makes stone. When the source is removed the flow drains away.
const FL = { q: new Map(), tick: 0, acc: 0, world: null };
const FL_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const flKey = (x, y, z) => x + ',' + y + ',' + z;
function flDelay(k, w) { return k === 1 ? 5 : (w.dim === 'nether' ? 10 : 30); }
function flSchedule(x, y, z) {
  const w = G.world; if (!w || y < 0 || y >= WH) return; const id = w.get(x, y, z); const k = FKIND[id]; if (!k) return;
  const key = flKey(x, y, z); const due = FL.tick + flDelay(k, w); const cur = FL.q.get(key); if (cur !== undefined && cur <= due) return; FL.q.set(key, due);
}
function flNotify(x, y, z) { flSchedule(x, y, z); flSchedule(x + 1, y, z); flSchedule(x - 1, y, z); flSchedule(x, y + 1, z); flSchedule(x, y - 1, z); flSchedule(x, y, z + 1); flSchedule(x, y, z - 1); }
const flAmount = (id) => { const L = FLEVEL[id]; return L === 0 || L === 8 ? 8 : 8 - L; };
// blocks liquid can wash away: air, plants, torches, crops
function flReplaceable(id) { if (id === 0) return true; const d = BL[id]; return !!d && !d.solid && !FKIND[id] && (d.plant || d.render === 'cross' || d.render === 'torch'); }
function flWash(w, x, y, z, id) { if (!id || FKIND[id]) return; const d = BL[id]; if (d.render === 'torch') dropItem(id, 1, x + 0.5, y + 0.4, z + 0.5, false); else if (d.crop !== undefined) { const dr = blockDrop(id, null); if (dr) dropItem(dr[0], dr[1], x + 0.5, y + 0.4, z + 0.5, false); } }
function flFizz(x, y, z) { Sfx.at('fizz', new V3(x + 0.5, y + 0.5, z + 0.5), 0.8); Particles.emit(x + 0.5, y + 1, z + 0.5, 8, [[0.85, 0.85, 0.85]], 1.5, 1, -2, 0.8); }
function flSet(w, x, y, z, id) { if (!w.loaded(x, z)) return false; const old = w.get(x, y, z); flWash(w, x, y, z, old); w.set(x, y, z, id); return true; }
// the level this flowing block should have now (MC getNewLiquid); -1 = it should dry up
function flNewLevel(w, x, y, z, k, drop) {
  let maxAmt = 0, sources = 0;
  for (const [dx, dz] of FL_DIRS) { const n = w.get(x + dx, y, z + dz); if (FKIND[n] !== k) continue; if (FLEVEL[n] === 0) sources++; maxAmt = Math.max(maxAmt, flAmount(n)); }
  if (k === 1 && sources >= 2) { const below = w.get(x, y - 1, z); if (SOLID[below] || below === B.WATER) return 0; } // infinite water
  if (FKIND[w.get(x, y + 1, z)] === k) return 8;
  const amt = maxAmt - drop; return amt <= 0 ? -1 : 8 - amt;
}
// distance to the nearest drop the liquid could fall into (MC getSlopeDistance)
function flHole(w, x, y, z, k) { const b = w.get(x, y - 1, z); return flReplaceable(b) || FKIND[b] === k; }
function flSlope(w, x, y, z, k, depth, from, max) {
  let best = 1000;
  for (let i = 0; i < 4; i++) { if (i === from) continue; const [dx, dz] = FL_DIRS[i]; const nx = x + dx, nz = z + dz; const n = w.get(nx, y, nz);
    if (!(flReplaceable(n) || (FKIND[n] === k && FLEVEL[n] !== 0))) continue;
    if (flHole(w, nx, y, nz, k)) return depth;
    if (depth < max) best = Math.min(best, flSlope(w, nx, y, nz, k, depth + 1, i ^ 1, max)); }
  return best;
}
function flSpreadSides(w, x, y, z, k, L, drop, slope) {
  const amount = L === 8 ? 7 : flAmount(FLID[k][L]) - drop; if (amount <= 0) return;
  const newL = 8 - amount; const opts = []; let best = 1000;
  for (let i = 0; i < 4; i++) { const [dx, dz] = FL_DIRS[i]; const nx = x + dx, nz = z + dz; const n = w.get(nx, y, nz);
    if (!(flReplaceable(n) || (FKIND[n] === k && FLEVEL[n] !== 0))) continue;
    const d = flHole(w, nx, y, nz, k) ? 0 : flSlope(w, nx, y, nz, k, 1, i ^ 1, slope); if (d < best) { best = d; opts.length = 0; } if (d === best) opts.push(i); }
  for (const i of opts) { const [dx, dz] = FL_DIRS[i]; const nx = x + dx, nz = z + dz; const n = w.get(nx, y, nz);
    if (FKIND[n] === k && flAmount(n) >= amount) continue; // already as full as we would make it
    flSet(w, nx, y, nz, FLID[k][newL]); }
}
function flTick(w, x, y, z) {
  const id = w.get(x, y, z); const k = FKIND[id]; if (!k) return;
  const lava = k === 2, nether = w.dim === 'nether'; const drop = lava && !nether ? 2 : 1, slope = lava && !nether ? 2 : 4;
  if (lava) for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]]) if (FKIND[w.get(x + dx, y + dy, z + dz)] === 1) { w.set(x, y, z, FLEVEL[id] === 0 ? B.OBSIDIAN : B.COBBLESTONE); flFizz(x, y, z); return; }
  if (k === 1 && nether) { w.set(x, y, z, SHAPED[id] ? withState(id, { wl: 0 }) : 0); flFizz(x, y, z); return; }
  let L = FLEVEL[id];
  if (L !== 0) { const nl = flNewLevel(w, x, y, z, k, drop); if (nl < 0) { w.set(x, y, z, 0); return; } if (nl !== L) { w.set(x, y, z, FLID[k][nl]); return; } }
  const bid = w.get(x, y - 1, z);
  if (y > 0 && (flReplaceable(bid) || (FKIND[bid] === k && FLEVEL[bid] !== 0 && FLEVEL[bid] !== 8) || (lava && FKIND[bid] === 1 && !SHAPED[bid]))) {
    if (lava && FKIND[bid] === 1) { w.set(x, y - 1, z, B.STONE); flFizz(x, y - 1, z); }
    else flSet(w, x, y - 1, z, FLID[k][8]);
    let src = 0; for (const [dx, dz] of FL_DIRS) if (w.get(x + dx, y, z + dz) === FLID[k][0]) src++;
    if (src >= 3) flSpreadSides(w, x, y, z, k, L, drop, slope);
  } else if (L === 0 || !(flReplaceable(bid) || FKIND[bid] === k)) flSpreadSides(w, x, y, z, k, L, drop, slope);
}
function updateWater(dt) {
  const w = G.world; if (!w) return;
  if (FL.world !== w) { FL.world = w; FL.q.clear(); }
  if (typeof MP !== 'undefined' && MP.active && MP.role === 'client') { FL.q.clear(); return; } // the host runs the liquids
  FL.acc += dt * 20; let n = 0;
  while (FL.acc >= 1 && n < 3) { FL.acc -= 1; n++; FL.tick++;
    const due = []; for (const [key, t] of FL.q) if (t <= FL.tick) due.push(key);
    let done = 0;
    for (const key of due) { if (done > 500) break; FL.q.delete(key); done++; const [x, y, z] = key.split(',').map(Number); if (w.loaded(x, z)) flTick(w, x, y, z); }
  }
  if (FL.acc > 3) FL.acc = 0;
  if (FL.q.size > 20000) FL.q.clear();
}
// any block change next to liquid wakes it up (placing, breaking, other liquid moving)
{ const _set = World.prototype.set; World.prototype.set = function (x, y, z, id, record) { const r = _set.apply(this, arguments); if (r !== false && this === G.world) flNotify(x, y, z); return r; }; }
function placeFluid(x, y, z, id) {
  const w = G.world;
  if (FKIND[id] === 1 && w.dim === 'nether') { Sfx.at('fizz', new V3(x, y, z), 1); Particles.emit(x + 0.5, y + 0.5, z + 0.5, 20, [[0.9, 0.9, 0.9]], 2, 1, -2, 0.8); return false; }
  w.set(x, y, z, id); return true;
}
function fluidReact() { }
// flowing water and lava push things along (players, items, boats, mobs)
function fluidFlow(x, y, z) {
  const w = G.world; const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z); const id = w.get(bx, by, bz); const k = FKIND[id]; if (!k) return null;
  const a0 = flAmount(id); let vx = 0, vz = 0;
  for (const [dx, dz] of FL_DIRS) { const n = w.get(bx + dx, by, bz + dz);
    if (FKIND[n] === k) { const d = a0 - flAmount(n); vx += dx * d; vz += dz * d; }
    else if (!SOLID[n]) { const n2 = w.get(bx + dx, by - 1, bz + dz); if (FKIND[n2] === k) { const d = a0 - (flAmount(n2) - 8); vx += dx * d; vz += dz * d; } } }
  const L = Math.hypot(vx, vz); if (L < 1e-3) return FLEVEL[id] === 8 ? { x: 0, y: -1, z: 0 } : null;
  return { x: vx / L, y: FLEVEL[id] === 8 ? -0.5 : 0, z: vz / L };
}
function fluidPush(e, dt, strength = 1) {
  const f = fluidFlow(e.pos.x, e.pos.y + 0.2, e.pos.z); if (!f) return;
  const lava = isLavaId(G.world.get(Math.floor(e.pos.x), Math.floor(e.pos.y + 0.2), Math.floor(e.pos.z))); const a = (lava ? 4 : 11) * strength * dt;
  e.vel.x += f.x * a; e.vel.z += f.z * a; if (f.y) e.vel.y += f.y * a * 0.5;
}

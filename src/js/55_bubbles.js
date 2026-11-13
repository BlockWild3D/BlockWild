// ================= BUBBLE COLUMNS (Minecraft) =================
// Water directly above soul sand becomes an upward bubble column: anything inside rises (up to 0.7 blocks per tick,
// and it is launched out of the top at the surface). Water above a magma block becomes a whirlpool that drags
// things down (0.3 blocks per tick). Players, mobs, items and boats are all affected. Bubbles show the columns.
function bubbleKind(x, y, z) { // 1 up, -1 down, 0 none: follow the water down to its floor
  x = Math.floor(x); z = Math.floor(z); let yy = Math.floor(y); if (!isWaterId(world.get(x, yy, z))) return 0;
  for (let k = 0; k < 40 && isWaterId(world.get(x, yy, z)); k++) yy--; const id = world.get(x, yy, z);
  return id === B.SOUL_SAND ? 1 : id === B.MAGMA_BLOCK ? -1 : 0;
}
function bubbleCache(x, y, z) { const key = Math.floor(x) + ',' + Math.floor(y) + ',' + Math.floor(z); const c = (G.bubC = G.bubC || new Map()); const now = G.simT || 0; const e = c.get(key); if (e && now - e[1] < 0.5) return e[0]; const k = bubbleKind(x, y, z); c.set(key, [k, now]); if (c.size > 4000) c.clear(); return k; }
function bubblePush(e, dt, feetOff = 0.1) {
  const k = bubbleCache(e.pos.x, e.pos.y + feetOff, e.pos.z); if (!k) return false;
  const top = !isWaterId(world.get(Math.floor(e.pos.x), Math.floor(e.pos.y + (e.h || 1.8) * 0.6), Math.floor(e.pos.z)));
  if (k > 0) e.vel.y = Math.min(top ? 12 : 14, e.vel.y + (top ? 40 : 24) * dt); else e.vel.y = Math.max(top ? -8 : -6, e.vel.y - 12 * dt);
  e.peak = null; return true;
}
{ const _u = updatePlayer; updatePlayer = function (dt) { const r = _u.apply(this, arguments); const P = player; if (!P.dead && !P.flying && S.mode !== 'spectator' && !P.riding) bubblePush(P, dt, 0.4); if (P.riding && P.riding.pos) bubblePush(P.riding, dt, 0.1); return r; }; }
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) { const r = _u.call(this, dt); if (!this.dead && this.vel && !isClientMP()) bubblePush(this, dt, 0.2); return r; }; }
{ const _u = ItemEnt.prototype.update; ItemEnt.prototype.update = function (dt) { const r = _u.apply(this, arguments); if (!this.gone && this.vel) bubblePush(this, dt, 0.1); return r; }; }
// bubbles: find the columns near you once a second, then fizz along them
let bubCols = [], bubScan = 0;
{ const _ub = updateBoats; updateBoats = function (dt) { const r = _ub(dt); if (!world || world.dim === 'end') return r;
    bubScan -= dt; const P = player.pos;
    if (bubScan <= 0) { bubScan = 1; bubCols = []; const px = Math.floor(P.x), py = Math.floor(P.y), pz = Math.floor(P.z);
      for (let dx = -12; dx <= 12; dx++) for (let dz = -12; dz <= 12; dz++) for (let dy = -16; dy <= 8; dy++) { const id = world.get(px + dx, py + dy, pz + dz); if ((id === B.SOUL_SAND || id === B.MAGMA_BLOCK) && isWaterId(world.get(px + dx, py + dy + 1, pz + dz))) { let h = 0; while (h < 30 && isWaterId(world.get(px + dx, py + dy + 1 + h, pz + dz))) h++; bubCols.push([px + dx, py + dy + 1, pz + dz, h, id === B.SOUL_SAND ? 1 : -1]); } } }
    for (const [x, y, z, h, k] of bubCols) if (Math.random() < dt * (2 + h * 0.6)) { const t = Math.random() * h; Particles.emit(x + 0.3 + Math.random() * 0.4, y + t, z + 0.3 + Math.random() * 0.4, 1, [[0.85, 0.95, 1], [0.7, 0.85, 1]], 0.1, 0.5, k > 0 ? -6 : 4, 0.25); if (k > 0 && Math.random() < 0.15) Particles.emit(x + 0.5, y + h, z + 0.5, 2, [[0.9, 0.95, 1]], 1, 0.3, 4, 0.3); }
    return r; }; }

// ================= ENTITY COLLISION (Minecraft-style pushing) =================
// Mobs and players whose boxes overlap push each other apart, harder the deeper they overlap (Minecraft adds
// 0.05 blocks/tick per tick of overlap to both). Crowds spread out, mobs can shove you and you can shove animals.
// Your own mount, the mob you spectate and bosses don't push.
const PUSH = 20; // blocks/s^2 at full overlap
let pushUid = 0;
function pushPair(a, b, dt, wa = 1, wb = 1) {
  const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z; const rx = a.hw + b.hw;
  if (Math.abs(dx) >= rx || Math.abs(dz) >= rx) return;
  if (a.pos.y >= b.pos.y + b.h || b.pos.y >= a.pos.y + a.h) return;
  let m = Math.max(Math.abs(dx), Math.abs(dz)); let nx, nz;
  if (m < 0.01) { const ang = Math.random() * Math.PI * 2; nx = Math.cos(ang); nz = Math.sin(ang); m = 0.01; } else { const d = Math.sqrt(m); nx = dx / d; nz = dz / d; const f = Math.min(1, 1 / d); nx *= f; nz *= f; }
  const k = PUSH * dt;
  if (wa) { a.vel.x -= nx * k * wa; a.vel.z -= nz * k * wa; }
  if (wb) { b.vel.x += nx * k * wb; b.vel.z += nz * k * wb; }
}
function updateEntityPush(dt) {
  if (!world || S.paused && !(typeof MP !== 'undefined' && MP.active)) return;
  const P = player, list = [];
  for (const m of G.mobs) { if (m.dead || m.gone || m.isBoss || m.remote || !m.vel || m === S.specMob) continue; if (Math.abs(m.pos.x - P.pos.x) > 48 || Math.abs(m.pos.z - P.pos.z) > 48) continue; if (!m.uid) m.uid = ++pushUid; list.push(m); }
  // spatial hash on a 2-block grid
  const grid = new Map(); const key = (x, z) => (x + 4096) * 8192 + (z + 4096);
  for (const m of list) { const k = key(Math.floor(m.pos.x / 2), Math.floor(m.pos.z / 2)); let c = grid.get(k); if (!c) grid.set(k, c = []); c.push(m); }
  for (const a of list) {
    const gx = Math.floor(a.pos.x / 2), gz = Math.floor(a.pos.z / 2);
    for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) { const c = grid.get(key(gx + ox, gz + oz)); if (!c) continue;
      for (const b of c) { if (b.uid <= a.uid) continue; if (a.rider === 'local' && b === P.riding) continue;
        // a ridden horse pushes others but isn't pushed off course by them
        pushPair(a, b, dt, a.rider === 'local' ? 0 : 1, b.rider === 'local' ? 0 : 1); } }
  }
  // the player
  if (!P.dead && S.mode !== 'spectator' && !P.riding) for (const m of list) { if (m === P.riding) continue; pushPair(P, m, dt, P.flying ? 0 : 0.6, 1); }
}
{ const _ub = updateBoats; updateBoats = function (dt) { const r = _ub(dt); updateEntityPush(dt); return r; }; }

// ================= BEDS: place (2 blocks), sleep through the night, respawn point =================
function placeBed(hit) {
  const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz; const d = lookDir(); const ax = Math.abs(d.x) > Math.abs(d.z);
  const hx = x + (ax ? Math.sign(d.x) : 0), hz = z + (ax ? 0 : Math.sign(d.z));
  const free = (a, b, c) => { const id = world.get(a, b, c); return !id || PLANT[id] || BL[id].fluid; };
  if (!free(x, y, z) || !free(hx, y, hz) || !SOLID[world.get(x, y - 1, z)] || !SOLID[world.get(hx, y - 1, hz)]) { toast("There isn't room for a bed here", 1.5); return false; }
  if (boxIntersectsBlock(player, x, y, z) || boxIntersectsBlock(player, hx, y, hz)) return false;
  world.set(x, y, z, B.BED_FOOT); world.set(hx, y, hz, B.BED_HEAD); Sfx.play('wool', 0.8); return true;
}
function bedPartner(x, y, z) { const id = world.get(x, y, z); const want = id === B.BED_HEAD ? B.BED_FOOT : B.BED_HEAD; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (world.get(x + a, y, z + b) === want) return [x + a, y, z + b]; return null; }
function breakBedPair(x, y, z, id) { if (id !== B.BED_HEAD && id !== B.BED_FOOT) return; const p = bedPartner(x, y, z); if (p) { world.set(p[0], p[1], p[2], 0); if (isSurv() && id === B.BED_FOOT) dropItem(IT.bed, 1, p[0] + 0.5, p[1] + 0.4, p[2] + 0.5); } }
function useBed(x, y, z) {
  if (world.dim !== 'overworld') { const p = bedPartner(x, y, z); world.set(x, y, z, 0); if (p) world.set(p[0], p[1], p[2], 0); explode(x + 0.5, y + 0.5, z + 0.5, 5, null, { cause: 'a bed (intentional game design)' }); return; }
  const head = world.get(x, y, z) === B.BED_HEAD ? [x, y, z] : bedPartner(x, y, z); if (!head) return;
  S.bed = head; toast('Respawn point set', 2); chatPrint('Respawn point set', '#ccc');
  const ticks = timeTicks(); const night = ticks >= 12542 && ticks <= 23459;
  if (!night) { toast('You can sleep only at night', 2); return; }
  const foot = bedPartner(head[0], head[1], head[2]) || head; if (Math.min(player.pos.distanceTo(new V3(head[0] + 0.5, head[1], head[2] + 0.5)), player.pos.distanceTo(new V3(foot[0] + 0.5, foot[1], foot[2] + 0.5))) > 3.2) { toast('You may not rest now; the bed is too far away', 2); return; }
  const near = G.mobs.some(m => !m.dead && m.t.kind === 'hostile' && m.pos.distanceTo(player.pos) < 8 && Math.abs(m.pos.y - player.pos.y) < 5);
  if (near && isSurv()) { toast('You may not rest now; there are monsters nearby', 2); return; }
  // lie down, fade to black, wake up at sunrise
  S.sleeping = { t: 0, head }; player.vel.set(0, 0, 0); player.pos.set(head[0] + 0.5, head[1] + 0.56, head[2] + 0.5); show('sleepfx', true);
}
function updateSleep(dt) {
  const sl = S.sleeping; if (!sl) return; sl.t += dt; player.vel.set(0, 0, 0); player.pos.set(sl.head[0] + 0.5, sl.head[1] + 0.56, sl.head[2] + 0.5); // lie still in the bed player.pitch = Math.max(player.pitch, 0.4);
  $('sleepfx').style.opacity = Math.min(1, sl.t / 2.2);
  if (sl.t >= 2.6 && MP.active && (MP.role === 'client' || [...MP.peers.values()].some(p => p.joined && !p.sleeping))) { if (!sl.waitMsg) { sl.waitMsg = true; toast('Waiting for the other players to sleep...', 3); } $('sleepfx').style.opacity = 0.85; return; }
  if (sl.t >= 2.6) { S.sleeping = null; S.time = 0.0; S.day++; $('sleepfx').style.opacity = 0; show('sleepfx', false); standUpFromBed(sl.head); toast('Good morning!', 2); if (typeof MP !== 'undefined' && MP.timeChanged) MP.timeChanged(); }
}
// Minecraft's BedBlock.findStandUpPosition: get up beside the bed (around the head, then the foot) where there's floor
// and two blocks of room; only if there's none, on top of the bed. Never pushed up through a cave roof.
function standUpFromBed(head) {
  const P = player; const foot = bedPartner(head[0], head[1], head[2]) || head; const y = head[1];
  const free = (x, yy, z) => !world.solid(x, yy, z) && !world.solid(x, yy + 1, z) && !BL[world.get(x, yy, z)].fluid;
  const spots = []; for (const b of [head, foot]) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) spots.push([b[0] + dx, b[2] + dz]);
  for (const [x, z] of spots) { if ((x === head[0] && z === head[2]) || (x === foot[0] && z === foot[2])) continue;
    for (const yy of [y, y - 1, y + 1]) if (free(x, yy, z) && world.solid(x, yy - 1, z)) { P.pos.set(x + 0.5, yy + 0.01, z + 0.5); P.vel.set(0, 0, 0); P.peak = null; return; } }
  if (free(head[0], y + 1, head[2]) || !world.solid(head[0], y + 1, head[2])) { P.pos.set(head[0] + 0.5, y + 0.5625, head[2] + 0.5); P.vel.set(0, 0, 0); P.peak = null; return; }
  P.pos.y = y + 0.5625; P.peak = null;
}
function bedSpawnPos() {
  if (!S.bed) return null; const [x, y, z] = S.bed; const w = Dim.get('overworld');
  if (w.loaded(x, z) && w.get(x, y, z) !== B.BED_HEAD) { S.bed = null; toast('You have no home bed, or it was obstructed', 3); return null; }
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) { if (!w.loaded(x + a, z + b)) return new V3(x + 0.5, y + 0.6, z + 0.5); if (!w.solid(x + a, y, z + b) && !w.solid(x + a, y + 1, z + b)) return new V3(x + a + 0.5, y, z + b + 0.5); }
  return new V3(x + 0.5, y + 0.6, z + 0.5);
}

// ================= SEEDS, WORLD SPAWN AND RESPAWNING (Minecraft rules) =================
// Seeds: a blank box picks a random seed; a whole number (up to 64-bit, like Minecraft's long seeds) is used as the
// number; anything else is turned into a number with Java's String.hashCode, exactly like Minecraft. BlockWild worlds use
// 32-bit seeds, so long numbers are folded (high bits XOR low bits) the way Java's Long.hashCode does.
// World spawn: searched near 0, 0 for dry land. Players then spawn and respawn at a random spot within the spawnRadius
// game rule (default 10) of the world spawn, on a dry surface block with room to stand. A bed, or a point set with
// /spawnpoint, takes priority; /setworldspawn moves the world spawn.
S.rules.spawnRadius = 10;
function seedFromText(text) {
  const s = String(text || '').trim();
  if (!s) return (Math.random() * 4294967296 | 0) || 1;
  if (/^[-+]?\d+$/.test(s)) { try { const v = BigInt(s); if (v >= -(2n ** 63n) && v < 2n ** 63n) return Number(BigInt.asIntN(32, v ^ (v >> 32n))); } catch (e) { } }
  let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; return h;
}
// a random standing spot within spawnRadius of `center` (null while those chunks are not loaded yet)
function fuzzySpawnAround(center) {
  const R = Math.max(0, S.rules.spawnRadius | 0); const cx = Math.floor(center.x), cz = Math.floor(center.z);
  if (!world.loaded(cx, cz)) return null;
  const ok = (x, z) => { if (!world.loaded(x, z)) return null; const y = world.surfaceY(x, z); if (y <= 1 || y >= WH - 2) return null; const below = world.get(x, y - 1, z); if (!SOLID[below] || FKIND[below] || below === B.CACTUS || below === B.MAGMA_BLOCK) return null; if (world.get(x, y, z) && !PLANT[world.get(x, y, z)]) return null; if (world.get(x, y + 1, z)) return null; return y; };
  for (let i = 0; i < (R ? 64 : 1); i++) { const x = cx + (R ? Math.floor(Math.random() * (2 * R + 1)) - R : 0), z = cz + (R ? Math.floor(Math.random() * (2 * R + 1)) - R : 0); const y = ok(x, z); if (y !== null) return new V3(x + 0.5, y, z + 0.5); }
  return new V3(center.x, world.surfaceY(cx, cz), center.z);
}
// place the player once the spawn area has loaded (respawning far from spawn has to wait for the chunks)
function placeAtWorldSpawn() { player.vel.set(0, 0, 0); player.peak = null; world.lastCenter = null; const p = fuzzySpawnAround(player.spawn); if (p) { player.pos.copy(p); S.spawnPending = false; return; } S.spawnPending = true; player.pos.set(player.spawn.x, Math.max(player.spawn.y, SEA + 2), player.spawn.z); }
function updateSpawnPending() {
  if (!S.spawnPending || !world) return; player.vel.set(0, 0, 0); player.peak = null;
  const p = fuzzySpawnAround(player.spawn); if (!p) return; S.spawnPending = false; player.pos.copy(p); player.peak = null;
}
// respawn order: bed, then /spawnpoint, then the world spawn area
function respawnTarget() {
  const bs = bedSpawnPos(); if (bs) return { type: 'bed', pos: bs };
  if (player.spawnPoint) return { type: 'point', pos: player.spawnPoint.clone() };
  return { type: 'spawn' };
}

// ---- hook into the game ----
// new world button: Minecraft seed rules
{ const btn = $('btnNew'); const fresh = btn.cloneNode(true); btn.parentNode.replaceChild(fresh, btn);
  fresh.addEventListener('click', () => { Sfx.init(); const seed = seedFromText($('seedInput').value); startWorld({ v: 4, seed, mode: pendingMode }); }); }
// respawn button
{ const btn = $('btnRespawn'); const fresh = btn.cloneNode(true); btn.parentNode.replaceChild(fresh, btn);
  fresh.addEventListener('click', () => {
    player.dead = false; player.health = 20; player.vel.set(0, 0, 0); player.peak = null; updateHearts(); show('death', false); S.sleeping = null;
    const t = respawnTarget();
    if (world.dim !== 'overworld') travelTo('overworld', t.type === 'spawn' ? { type: 'spawn' } : { type: 'bed', x: Math.floor(t.pos.x), z: Math.floor(t.pos.z), pos: t.pos });
    else { if (t.type === 'spawn') placeAtWorldSpawn(); else { player.pos.copy(t.pos); world.lastCenter = null; } requestLock(); }
  }); }
// a new world: the found spawn becomes the world spawn and the player lands somewhere in the spawn area
{ const _fl = finishLoading; finishLoading = function () { const fresh = S.newWorld && !S.arrival; _fl.apply(this, arguments); if (fresh) { player.spawn.copy(player.pos); const p = fuzzySpawnAround(player.spawn); if (p) player.pos.copy(p); } }; }
// arriving back from the Nether / End with no bed: use the spawn area
{ const _ha = handleArrival; handleArrival = function () { const a = S.arrival; const r = _ha.apply(this, arguments); if (r && a && a.type === 'spawn') placeAtWorldSpawn(); return r; }; }
{ const _up = updatePlayer; updatePlayer = function (dt) { if (S.spawnPending) { updateSpawnPending(); return; } return _up.apply(this, arguments); }; }
// save / load the personal spawn point
{ const _sw = startWorld; startWorld = function (data) { const r = _sw.apply(this, arguments); player.spawnPoint = data && data.spawnPoint ? new V3().fromArray(data.spawnPoint) : null; S.spawnPending = false; return r; }; }

// ---- commands ----
CMDS.spawnpoint = { usage: '[target] [x y z]', run(a, ctx) {
  const p = a[1] !== undefined ? parsePos(a, 1, ctx) : player.pos.clone();
  for (const t of selectTargets(a[0], ctx, false)) if (onlyLocal(t, '/spawnpoint @s ' + fmt(p.x) + ' ' + fmtY(p.y) + ' ' + fmt(p.z))) player.spawnPoint = p.clone();
  ok('Set spawn point to ' + fmt(p.x) + ', ' + fmtY(p.y) + ', ' + fmt(p.z) + ' in ' + (world.dim === 'overworld' ? 'minecraft:overworld' : 'minecraft:' + world.dim)); } };
CMDS.setworldspawn = { usage: '[x y z]', run(a, ctx) { if (world.dim !== 'overworld') throw new CmdError('The world spawn can only be set in the Overworld'); const p = a[0] !== undefined ? parsePos(a, 0, ctx) : player.pos.clone(); player.spawn.copy(p); ok('Set the world spawn point to ' + fmt(p.x) + ', ' + fmtY(p.y) + ', ' + fmt(p.z)); } };
CMDS.seed = { usage: '', free: true, run() { chatPrint('Seed: [<span class="chatlink" data-copy="' + world.seed + '">' + world.seed + '</span>]', null, true); } };
// game rules with number values (spawnRadius, randomTickSpeed ...) next to the true/false ones
CMDS.gamerule = { usage: '<rule> [value]', run(a) {
  if (!a[0]) { ok('Game rules: ' + Object.keys(S.rules).join(', ')); return; }
  if (!(a[0] in S.rules)) throw new CmdError('Unknown game rule: ' + a[0]);
  if (a[1] === undefined) { ok('Gamerule ' + a[0] + ' is currently set to: ' + S.rules[a[0]]); return; }
  if (typeof S.rules[a[0]] === 'number') { const n = Number(a[1]); if (!Number.isInteger(n)) throw new CmdError('Invalid integer: ' + a[1]); S.rules[a[0]] = n; }
  else { if (a[1] !== 'true' && a[1] !== 'false') throw new CmdError('Value must be true or false'); S.rules[a[0]] = a[1] === 'true'; }
  ok('Gamerule ' + a[0] + ' is now set to: ' + a[1]); if (typeof MP !== 'undefined') MP.rulesChanged(); } };

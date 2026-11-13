// ================= END CRYSTALS AND DAMAGE RULES, AS IN MINECRAFT =================
// Placing: right-click ANY face of obsidian or bedrock and the crystal appears on top, if the block above is air and
// no entity (player, mob, crystal, dropped item) is in the 1x2x1 space above. Holding right-click keeps placing
// (Minecraft's 4-tick use delay).
// Breaking: any damage at all pops it (a punch, an arrow, a snowball, an egg): a power-6 explosion at its base.
// A crystal caught in another explosion is simply destroyed and does not explode again (Minecraft 1.9+).
// The crystal is a 2x2x2 box. Placed crystals are saved with the world.
// Damage: invulnerability frames work as in Minecraft (for half a second a hit only lands if it is bigger than the
// last one, and then only the difference), and armour enchantments add up into one protection value capped at 20
// (80%): Protection 1 per level, Blast/Fire/Projectile Protection 2 per level, Feather Falling 3 per level.
// whatever ends a placed crystal (a hit, a blast, the dragon respawn using it up), its saved spot goes with it
Object.defineProperty(PlacedCrystal.prototype, 'dead', { configurable: true, get() { return !!this._dead; }, set(v) { this._dead = v; if (v && this.spot) crystalSpotDel(this); } });
PlacedCrystal.prototype.hurt = function () {
  if (this.dead) return; this.dead = true; this.gone = true; crystalSpotDel(this);
  explode(this.pos.x, this.pos.y, this.pos.z, 6, this, { cause: 'an End Crystal' });
};
PlacedCrystal.prototype.blastGone = function () { if (this.dead) return; this.dead = true; this.gone = true; crystalSpotDel(this); Particles.emit(this.pos.x, this.pos.y + 1, this.pos.z, 20, [[1, 0.6, 1], [0.9, 0.9, 1]], 3, 0.6, 1, 0.8); };
{ const _h = Crystal.prototype.hurt; // the End's pillar crystals: same power-6 blast at the base; no chain explosions
  Crystal.prototype.hurt = function () { if (this.dead || this.placed) return; const _ex = explode; let at = null; explode = function (x, y, z, r, s, o) { at = [x, y, z]; }; try { _h.apply(this, arguments); } finally { explode = _ex; } if (at) explode(this.pos.x, this.pos.y, this.pos.z, 6, this, { cause: 'an End Crystal' }); };
  Crystal.prototype.blastGone = function () { if (this.dead || this.placed) return; const _ex = explode; explode = function () { }; try { _h.apply(this, arguments); } finally { explode = _ex; } }; }
function crystalSpotDel(c) { const w = c.w || G.world; if (w && w.crystalSpots && c.spot) w.crystalSpots.delete(c.spot); }
function crystalSpaceFree(x, y, z) {
  const hits = (px, py, pz, hw, h) => px + hw > x && px - hw < x + 1 && pz + hw > z && pz - hw < z + 1 && py + h > y && py < y + 2;
  const P = player; if (!P.dead && S.mode !== 'spectator' && hits(P.pos.x, P.pos.y, P.pos.z, 0.3, 1.8)) return false;
  for (const m of G.mobs) if (!m.dead && hits(m.pos.x, m.pos.y, m.pos.z, m.isCrystal ? 1 : (m.hw || 0.4), m.h || 1.8)) return false;
  for (const it of G.items) if (!it.gone && hits(it.pos.x, it.pos.y, it.pos.z, 0.125, 0.25)) return false;
  return true;
}
placeEndCrystal = function (x, y, z, quiet) {
  if (world.get(x, y, z) !== 0 || !crystalSpaceFree(x, y, z)) return false;
  const c = new PlacedCrystal(x, y, z); c.hw = 1; c.w = world; c.spot = x + ',' + y + ',' + z; G.mobs.push(c); (world.placedCrystals = world.placedCrystals || []).push(c);
  (world.crystalSpots = world.crystalSpots || new Set()).add(c.spot);
  if (!quiet && world.dim === 'end' && S.dragonDead && typeof tryRespawnDragon === 'function') tryRespawnDragon();
  return true;
};
{ const _ua = useAction; useAction = function (eye, dir) {
    const hd = player.heldDef();
    if (hd && hd.id === IT.end_crystal && target && (target.id === B.OBSIDIAN || target.id === B.BEDROCK)) { // any face
      if (placeEndCrystal(target.x, target.y + 1, target.z)) { useHeld(1); S.swing = 1; } S.useCD = 0.2; return; }
    return _ua(eye, dir); }; }
// crystals are entities: blocks can't be placed into them, snowballs pop them
{ const _pb = placeBlock; placeBlock = function (t, id) { if (SOLID[id]) { let x = t.x + t.nx, y = t.y + t.ny, z = t.z + t.nz; if (PLANT[t.id]) { x = t.x; y = t.y; z = t.z; }
      for (const m of G.mobs) if (m.isCrystal && !m.dead && m.pos.x + 1 > x && m.pos.x - 1 < x + 1 && m.pos.z + 1 > z && m.pos.z - 1 < z + 1 && m.pos.y + 2 > y && m.pos.y < y + 1) return false; }
    return _pb.apply(this, arguments); }; }
{ const _up = updateProjectiles; updateProjectiles = function (dt) {
    for (const a of G.projectiles) if (a.kind === 'snowball' && !a.done) for (const m of G.mobs) if (m.isCrystal && !m.dead && hitsMob(m, a.pos, 0.2)) { a.done = true; G.scene.remove(a.mesh); m.hurt(0, a.pos, 0); break; }
    return _up.apply(this, arguments); }; }
// keep placed crystals in the world: saved per dimension, and back when you return to a dimension
{ let t = 0; const _ub = updateBoats; updateBoats = function (dt) { const r = _ub(dt); t -= dt; if (t > 0 || !world || !world.crystalSpots || S.loading) return r; t = 1;
    for (const k of [...world.crystalSpots]) { if (G.mobs.some(m => m.spot === k && !m.dead)) continue; const [x, y, z] = k.split(',').map(Number); if (!world.chunkLoaded || world.chunkLoaded(x >> 4, z >> 4)) { world.crystalSpots.delete(k); if (!placeEndCrystal(x, y, z, true)) world.crystalSpots.add(k); } }
    return r; }; }
{ const _pw = packWorld; packWorld = function (w) { const r = _pw(w); if (w.crystalSpots && w.crystalSpots.size) r.crystals = [...w.crystalSpots]; return r; };
  const _uw = unpackWorld; unpackWorld = function (w, d) { const r = _uw(w, d); if (d && d.crystals) w.crystalSpots = new Set(d.crystals); return r; }; }
// ---------- Minecraft invulnerability frames for the player ----------
{ const _h = Player.prototype.hurt; Player.prototype.hurt = function (dmg, src, cause, kb) {
    if (this.hurtCD > 0 && !this.dead && isSurv() && !S.loading) { const last = this.lastRawDmg || 0; if (!(dmg > last)) return; this.lastRawDmg = dmg; const cd = this.hurtCD; this.hurtCD = 0; const r = _h.call(this, dmg - last, src, cause, kb); this.hurtCD = Math.max(this.hurtCD, cd); return r; }
    this.lastRawDmg = dmg; return _h.apply(this, arguments); }; }
// ---------- armour and protection enchantments add up the Minecraft way ----------
armorReduce = function (dmg, cause) {
  const c = cause || ''; if (c === 'the void') return dmg;
  const fall = c === 'fall damage' || c === 'an ender pearl', fire = c === 'lava' || c === 'a magma block' || c === 'fire' || c === 'burning';
  let out = dmg;
  if (!fall && c !== 'magic') { const ps = armorPieces(player.inv); let def = 0, tough = 0; for (const s of ps) { const it = ITEMS[s.id]; def += it.def || 0; tough += it.tough || 0; }
    const red = Math.min(20, Math.max(def / 5, def - dmg / (2 + tough / 4))) / 25;
    if (ps.length && dmg > 0 && isSurv()) for (let i = 37; i <= 40; i++) if (player.inv[i] && ITEMS[player.inv[i].id].kind === 'armor') damageSlot(i, Math.max(1, Math.floor(dmg / 4)));
    out *= 1 - red; }
  let epf = 0; for (let i = 37; i <= 40; i++) { const s = player.inv[i]; if (!s) continue; epf += enchOf(s, 'protection');
    if (BLAST_CAUSES.test(c)) epf += 2 * enchOf(s, 'blast_protection'); if (PROJ_CAUSES.test(c)) epf += 2 * enchOf(s, 'projectile_protection'); if (fire) epf += 2 * enchOf(s, 'fire_protection'); if (fall) epf += 3 * enchOf(s, 'feather_falling'); }
  return out * (1 - Math.min(20, epf) * 0.04);
};

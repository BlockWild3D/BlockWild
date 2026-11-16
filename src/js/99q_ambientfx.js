// ================= AMBIENT PICTURE PARTICLES =================
// Like Minecraft's animateTick: random blocks around the player are sampled every frame. Some make a one-off effect
// (cherry petals, drips under fluids); steady emitters (torches, soul fire, enchanting tables, vaults) are remembered and
// tick on their own until they change or fall out of range. Also: angry villagers, sculk catalyst souls, omen and glow squid
// particles. Everything is visual only and needs the owner's particle pictures (SpriteFX); without them nothing happens.
const AmbientFX = {
  acc: 0, kind: null, emit: new Map(), drips: [], letters: [],
  init() { if (this.kind) return; const K = this.kind = new Uint8Array(BL.length + 64); const fk = (d) => (d && (d.fam || d.key)) || '';
    for (let i = 0; i < BL.length; i++) { const k = fk(BL[i]); if (!k) continue;
      if (k === 'enchanting_table') K[i] = 1; else if (k === 'cherry_leaves') K[i] = 2; else if (k === 'torch' || k === 'wall_torch') K[i] = 4; else if (k === 'soul_torch' || k === 'soul_wall_torch') K[i] = 5;
      else if (k === 'soul_campfire') K[i] = 6; else if (k === 'vault') K[i] = 7; else if (k === 'bookshelf' || k === 'chiseled_bookshelf') K[i] = 8; else if (k === 'sculk_catalyst') K[i] = 9; }
    this.letterNames = 'abcdefghijklmnopqrstuvwxyz'.split('').map(c => 'sga_' + c); },
  tick(dt) {
    if (!SpriteFX.ok || !world || !player || !S.started) return; this.init(); const P = player.pos, K = this.kind;
    const px = Math.floor(P.x), py = Math.floor(P.y), pz = Math.floor(P.z);
    // steady emitters: a full sweep of the area every 1.5 s finds torches, tables, vaults ...
    this.sweepT = (this.sweepT || 0) - dt; if (this.sweepT <= 0) { this.sweepT = 1.5;
      for (let x = px - 12; x <= px + 12; x++) for (let z = pz - 12; z <= pz + 12; z++) for (let y = py - 6; y <= py + 6; y++) { const id = world.get(x, y, z); const k = id ? K[id] : 0; if (k === 1 || k >= 4 && k <= 7) this.emit.set(x + ',' + y + ',' + z, id); } }
    // one-off effects: sample ~6000 random blocks a second in a 25 x 17 x 25 box
    this.acc = Math.min(this.acc + dt * 6000, 800); let n = this.acc | 0; this.acc -= n;
    while (n-- > 0) { const x = px + ((Math.random() * 25) | 0) - 12, y = py + ((Math.random() * 17) | 0) - 8, z = pz + ((Math.random() * 25) | 0) - 12; const id = world.get(x, y, z);
      if (!id) continue; const k = K[id];
      if (k === 2) { if (!world.get(x, y - 1, z) && Math.random() < 0.6) SpriteFX.emit('cherry', x + Math.random(), y - 0.05, z + Math.random(), 1, { size: 0.12, vel: [(Math.random() - 0.5) * 0.5, -0.5, (Math.random() - 0.5) * 0.5], life: 6, spread: 0, grav: 0.05 }); }
      else if (k === 1 || k === 4 || k === 5 || k === 6 || k === 7) this.emit.set(x + ',' + y + ',' + z, id);
      else if (SOLID[id] && OPAQUE[id] && !world.get(x, y - 1, z)) { const up = world.get(x, y + 1, z); const fl = isWaterId(up) ? 1 : isLavaId(up) ? 2 : 0; if (fl && Math.random() < 0.5 && this.drips.length < 40) this.startDrip(x, y, z, fl); } }
    // steady emitters
    for (const [key, id] of this.emit) { const [x, y, z] = key.split(',').map(Number);
      if (world.get(x, y, z) !== id || Math.abs(x - px) > 20 || Math.abs(z - pz) > 20 || Math.abs(y - py) > 14) { this.emit.delete(key); continue; }
      const k = K[id], d = BL[id];
      if (k === 4 || k === 5) { if (Math.random() < dt * 6) { const wall = d.st && d.st.facing != null; const ox = wall ? 0 : 0, oy = wall ? 0.75 : 0.7;
          SpriteFX.emit(k === 4 ? 'flame' : 'soul_fire_flame', x + 0.5 + ox, y + oy, z + 0.5, 1, { size: 0.14, vel: [0, 0.05, 0], life: 0.5, spread: 0.02 });
          if (Math.random() < 0.3) SpriteFX.emit('generic', x + 0.5, y + oy + 0.15, z + 0.5, 1, { size: 0.16, vel: [0, 0.6, 0], life: 0.8, spread: 0.02, tint: [0.25, 0.25, 0.25] }); } }
      else if (k === 6) { if (d.st && d.st.lit && Math.random() < dt * 3) SpriteFX.emit('soul_fire_flame', x + 0.5, y + 0.45, z + 0.5, 1, { size: 0.2, vel: [0, 0.4, 0], life: 0.7, spread: 0.5 }); }
      else if (k === 1) { if (Math.random() < dt * 4) this.enchantLetters(x, y, z); }
      else if (k === 7) { const c = new V3(x + 0.5, y + 0.5, z + 0.5); const dd = P.distanceTo(c); if (dd < 4.5 && Math.random() < dt * 6) { const t = 1.2; const to = new V3(P.x, P.y + 1, P.z);
          SpriteFX.emit('vault_connection', c.x, c.y, c.z, 1, { size: 0.18, vel: [(to.x - c.x) / t, (to.y - c.y) / t, (to.z - c.z) / t], life: t * 0.85, spread: 0.6, vary: false }); } } }
    // drips: hang under the block, fall, splat on the ground
    for (const D of this.drips) { D.t -= dt; if (D.t > 0) continue;
      if (D.phase === 0) { D.phase = 1; let fy = D.y - 1; while (fy > D.y - 40 && !SOLID[world.get(D.x, fy, D.z)] && !FKIND[world.get(D.x, fy, D.z)]) fy--; const h = Math.max(0.2, D.y - 0.1 - (fy + 1)); D.t = Math.sqrt(2 * h / 12); D.land = fy + 1.02;
        SpriteFX.emit('drip_fall', D.x + D.ox, D.y - 0.1, D.z + D.oz, 1, { size: 0.1, vel: [0, 0, 0], grav: 12, life: D.t, spread: 0, tint: D.col, vary: false }); }
      else { D.phase = 2; SpriteFX.emit('drip_land', D.x + D.ox, D.land, D.z + D.oz, 1, { size: 0.12, vel: [0, 0, 0], life: 0.4, spread: 0, tint: D.col, vary: false }); } }
    this.drips = this.drips.filter(D => D.phase < 2);
    // glow squids glow; omens float around the player
    if (Math.random() < dt * 2) for (const m of G.mobs) if (m.type === 'glow_squid' && !m.dead && m.pos.distanceTo(P) < 24) SpriteFX.emit('glow', m.pos.x, m.pos.y + 0.5, m.pos.z, 1, { size: 0.16, spd: 0.3, life: 1.2, spread: 1, tint: [0.45, 1, 0.9] });
    const fx = player.effects || {}; if ((fx.raid_omen || fx.bad_omen) && Math.random() < dt * 3) SpriteFX.emit(fx.raid_omen ? 'raid_omen' : 'trial_omen', P.x, P.y + 1, P.z, 1, { size: 0.15, spd: 0.6, grav: -0.3, life: 1.5, spread: 1.4 });
  },
  startDrip(x, y, z, fl) { const ox = 0.2 + Math.random() * 0.6, oz = 0.2 + Math.random() * 0.6, col = fl === 1 ? [0.25, 0.45, 0.95] : [1, 0.42, 0.08];
    this.drips.push({ x, y, z, ox, oz, col, phase: 0, t: fl === 1 ? 1 : 2 });
    SpriteFX.emit('drip_hang', x + ox, y - 0.06, z + oz, 1, { size: 0.1, vel: [0, 0, 0], life: fl === 1 ? 1 : 2, spread: 0, tint: col, vary: false }); },
  // enchanting table: letters drift from nearby bookshelves into the table, like Minecraft
  enchantLetters(x, y, z) { const K = this.kind;
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) { if (Math.abs(dx) !== 2 && Math.abs(dz) !== 2) continue; for (let dy = 0; dy <= 1; dy++) {
      if (K[world.get(x + dx, y + dy, z + dz)] !== 8 || Math.random() > 0.35) continue; const sx = x + dx + 0.5, sy = y + dy + 1.1, sz = z + dz + 0.5, tx = x + 0.5, ty = y + 1.1, tz = z + 0.5, t = 1.4;
      SpriteFX.emit(this.letterNames, sx, sy, sz, 1, { size: 0.16, vel: [(tx - sx) / t, (ty - sy) / t + 0.25, (tz - sz) / t], grav: 0.35, life: t, spread: 0.3, vary: false }); } } },
};
// angry villagers when you hit them; a sculk catalyst nearby takes the soul of anything that dies
if (typeof Mob !== 'undefined') { const _hurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (dmg, src) { const was = this.dead; const r = _hurt.apply(this, arguments);
    if (typeof SpriteFX === 'undefined' || !SpriteFX.ok) return r;
    if (src && player && (this.type === 'villager' || this.type === 'wandering_trader') && (src === player.pos || (src.distanceTo && src.distanceTo(player.pos) < 0.01)))
      SpriteFX.emit('angry', this.pos.x, this.pos.y + this.h + 0.3, this.pos.z, 2, { size: 0.3, spd: 0.4, life: 0.8, spread: 0.6 });
    if (!was && this.dead && world && typeof AmbientFX !== 'undefined') { AmbientFX.init(); const bx = Math.floor(this.pos.x), by = Math.floor(this.pos.y), bz = Math.floor(this.pos.z); let cat = null;
      for (let dx = -8; dx <= 8 && !cat; dx++) for (let dy = -8; dy <= 8 && !cat; dy++) for (let dz = -8; dz <= 8; dz++) if (AmbientFX.kind[world.get(bx + dx, by + dy, bz + dz)] === 9) { cat = [bx + dx, by + dy, bz + dz]; break; }
      if (cat) { SpriteFX.emit('sculk_soul', this.pos.x, this.pos.y + this.h * 0.5, this.pos.z, 3, { size: 0.35, vel: [0, 1, 0], life: 1.4, spread: 0.5 });
        SpriteFX.emit('sculk_charge', this.pos.x, by + 0.05, this.pos.z, 6, { size: 0.3, spd: 0.6, life: 1, spread: 1.4 });
        SpriteFX.emit('sculk_charge_pop', cat[0] + 0.5, cat[1] + 1.05, cat[2] + 0.5, 4, { size: 0.3, spd: 0.6, grav: -0.5, life: 0.8, spread: 0.6 }); } }
    return r; }; }

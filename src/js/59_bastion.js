// ================= BASTION REMNANTS (Minecraft) =================
// Bastions share the Nether's structure grid with fortresses (3 starts in 5 are bastions, never in basalt deltas). A
// ruined blackstone castle on stilts over the lava sea: a 45-block courtyard with crumbling walls, four corner towers,
// ramparts and bridges, a hoglin stable, and the central keep with the treasure room (gold blocks, a magma core and
// the treasure chest). Piglins live there and piglin brutes guard it; brutes always attack and never trade. Chests:
// bastion treasure, bridge, hoglin stable and "other" loot (netherite scraps, ancient debris, the netherite upgrade
// template, enchanted gold gear, crying obsidian...).
NetherGen.prototype.bastion = function (rx, rz) { const h = ihash(rx, rz, 909, this.seed) >>> 0; if (h % 5 < 2) return null; const ccx = rx * 27 + ((h >>> 8) % 23), ccz = rz * 27 + ((h >>> 16) % 23); if (this.biome(ccx * 16 + 8, ccz * 16 + 8) === 3) return null; return { ccx, ccz, x: ccx * 16 + 8, z: ccz * 16 + 8, fy: 36 + ((h >>> 24) % 8), seed: h }; };
NetherGen.prototype.bastionsNear = function (cx, cz) { const out = []; const seen = new Set(); for (const dx of [-3, 0, 3]) for (const dz of [-3, 0, 3]) { const rx = Math.floor((cx + dx) / 27), rz = Math.floor((cz + dz) / 27); const k = rx + ',' + rz; if (seen.has(k)) continue; seen.add(k); const b = this.bastion(rx, rz); if (b && Math.abs(b.ccx - cx) <= 3 && Math.abs(b.ccz - cz) <= 3) out.push(b); } return out; };
Object.assign(LOOT, {
  bastion_treasure: [['netherite_ingot', 1, 1, 0.3], ['ancient_debris', 1, 2, 0.4], ['netherite_scrap', 1, 2, 0.4], ['diamond', 2, 6, 0.5], ['gold_block', 2, 5, 0.6], ['gold_ingot', 3, 9, 0.6], ['enchanted_golden_apple', 1, 1, 0.1], ['diamond_sword', 1, 1, 0.2], ['diamond_chestplate', 1, 1, 0.15], ['diamond_helmet', 1, 1, 0.15], ['diamond_leggings', 1, 1, 0.15], ['diamond_boots', 1, 1, 0.15], ['netherite_upgrade_smithing_template', 1, 1, 1], ['magma_cream', 2, 6, 0.3]],
  bastion_other: [['gold_ingot', 1, 6, 0.5], ['gold_nugget', 2, 8, 0.5], ['golden_sword', 1, 1, 0.2], ['golden_axe', 1, 1, 0.15], ['golden_boots', 1, 1, 0.15], ['golden_helmet', 1, 1, 0.15], ['crossbow', 1, 1, 0.2], ['spectral_arrow', 1, 1, 0], ['arrow', 5, 17, 0.4], ['obsidian', 1, 4, 0.3], ['iron_ingot', 1, 4, 0.3], ['netherite_scrap', 1, 1, 0.08], ['ancient_debris', 1, 1, 0.08], ['netherite_upgrade_smithing_template', 1, 1, 0.1], ['cooked_pork', 2, 5, 0.3], ['magma_cream', 1, 3, 0.2], ['string', 4, 6, 0.2], ['leather', 1, 3, 0.2], ['blackstone', 2, 8, 0.3], ['gilded_blackstone', 1, 3, 0.15], ['enchanted_book', 1, 1, 0.12]],
  bastion_bridge: [['arrow', 10, 28, 0.6], ['gold_nugget', 2, 8, 0.5], ['string', 1, 6, 0.3], ['crossbow', 1, 1, 0.3], ['golden_sword', 1, 1, 0.2], ['golden_axe', 1, 1, 0.2], ['iron_ingot', 4, 9, 0.3], ['gold_block', 1, 1, 0.1], ['netherite_upgrade_smithing_template', 1, 1, 0.1], ['enchanted_book', 1, 1, 0.1]],
  bastion_hoglin_stable: [['cooked_pork', 4, 9, 0.6], ['leather', 1, 3, 0.4], ['gold_nugget', 2, 8, 0.4], ['golden_axe', 1, 1, 0.2], ['diamond_shovel', 1, 1, 0.1], ['diamond_pickaxe', 1, 1, 0.1], ['netherite_scrap', 1, 1, 0.1], ['ancient_debris', 1, 1, 0.08], ['netherite_upgrade_smithing_template', 1, 1, 0.1], ['gold_block', 1, 1, 0.1], ['soul_sand', 2, 7, 0.3], ['crimson_fungus', 2, 7, 0.2]],
});
Object.assign(ENCH_LOOT, { bastion_treasure: 1, bastion_other: 0.5, bastion_bridge: 0.4, bastion_hoglin_stable: 0.4 });
const bsB = (x, y, z, s) => { const q = rnd01(x, y, z, s ^ 0xb5); return q < 0.06 ? B.GILDED_BLACKSTONE : q < 0.5 ? B.POLISHED_BLACKSTONE_BRICKS : q < 0.85 ? B.BLACKSTONE : B.BASALT; };
function buildBastionChunk(world, c) {
  const g = world.gen; const list = g.bastionsNear(c.cx, c.cz); if (!list.length) return; const W = pieceWriter(c, world); const seed = world.seed;
  for (const b of list) { const { x: ox, z: oz, fy } = b; const R = 22; const ruin = (x, y, z) => rnd01(x, y, z, seed ^ 0x77) < 0.12;
    // stilts down to the lava sea and the courtyard floor
    W.fill(ox - R, fy - 1, oz - R, ox + R, fy - 1, oz + R, (x, y, z) => bsB(x, y, z, seed));
    W.fill(ox - R, fy, oz - R, ox + R, fy + 26, oz + R, 0);
    for (let x = ox - R; x <= ox + R; x += 6) for (let z = oz - R; z <= oz + R; z += 6) W.fill(x, NSEA - 3, z, x + 1, fy - 2, z + 1, (xx, y, zz) => bsB(xx, y, zz, seed));
    // the outer wall: 5 high, broken in places, battlements on top
    W.fill(ox - R, fy, oz - R, ox + R, fy + 5, oz + R, (x, y, z) => { const e = Math.abs(x - ox) === R || Math.abs(z - oz) === R; if (!e) return W.get(x, y, z); if (y === fy + 5 && (x + z) % 2) return 0; if (ruin(x, y, z) && y > fy + 2) return 0; if ((x === ox || z === oz) && y <= fy + 3) return 0; return bsB(x, y, z, seed); });
    // corner towers with a chest at the top
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const tx = ox + sx * (R - 3), tz = oz + sz * (R - 3);
      W.fill(tx - 3, fy, tz - 3, tx + 3, fy + 16, tz + 3, (x, y, z) => { const e = Math.abs(x - tx) === 3 || Math.abs(z - tz) === 3; if (y === fy + 8 || y === fy + 16) return (Math.abs(x - tx) <= 1 && Math.abs(z - tz) <= 1 && y === fy + 8) ? 0 : B.POLISHED_BLACKSTONE_BRICKS; if (!e) return 0; if ((y - fy) % 4 === 2 && (x === tx || z === tz)) return 0; return ruin(x, y, z) && y > fy + 10 ? 0 : bsB(x, y, z, seed); });
      for (let y = fy; y < fy + 16; y++) W.set(tx - 2, y, tz, B.LADDER_W); W.fill(tx - 2, fy + 1, tz - 3 * sz, tx - 2, fy + 2, tz - 3 * sz, 0);
      W.chest(tx + 1, fy + 9, tz + 1, 'bastion_other'); W.chest(tx - 1, fy + 17, tz - 1, 'bastion_bridge'); W.set(tx + 2, fy + 1, tz + 2, B.MAGMA_BLOCK); }
    // ramparts: walkways from the towers to the keep at keep-roof height
    for (const [sx, sz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { for (let i = 8; i <= R - 6; i++) { const x = ox + sx * i, z = oz + sz * i; for (let w = -1; w <= 1; w++) { const xx = sz ? x + w : x, zz = sx ? z + w : z; W.set(xx, fy + 8, zz, (i % 5 === 0 && w === 0) ? B.GILDED_BLACKSTONE : B.POLISHED_BLACKSTONE_BRICKS); } if (i % 4 === 0) W.fill(sz ? x - 1 : x, fy, sx ? z - 1 : z, sz ? x - 1 : x, fy + 7, sx ? z - 1 : z, B.BASALT); } }
    // the hoglin stable: a sunken pen with soul sand and crimson fungus
    { const hx = ox - 12, hz = oz + 12; W.fill(hx - 4, fy - 2, hz - 4, hx + 4, fy - 1, hz + 4, (x, y, z) => y === fy - 1 && Math.abs(x - hx) < 4 && Math.abs(z - hz) < 4 ? B.SOUL_SAND : B.BLACKSTONE);
      W.fill(hx - 4, fy, hz - 4, hx + 4, fy + 2, hz + 4, (x, y, z) => (Math.abs(x - hx) === 4 || Math.abs(z - hz) === 4) ? (y === fy + 2 ? B.POLISHED_BLACKSTONE_BRICKS : B.IRON_BARS) : (y === fy && rnd01(x, y, z, seed) < 0.15 ? B.CRIMSON_FUNGUS : 0));
      W.chest(hx + 3, fy, hz + 3, 'bastion_hoglin_stable'); for (let k = 0; k < 3; k++) W.mob('hoglin', hx - 2 + k * 2 + 0.5, fy, hz + 0.5); }
    // the keep: three floors around a lava/magma core with the treasure on top
    { const K = 7, H = 8; W.fill(ox - K, fy, oz - K, ox + K, fy + H, oz + K, (x, y, z) => { const e = Math.abs(x - ox) === K || Math.abs(z - oz) === K; const corner = Math.abs(x - ox) === K && Math.abs(z - oz) === K;
        if (y === fy + H) return Math.abs(x - ox) <= 2 && Math.abs(z - oz) <= 2 ? 0 : B.POLISHED_BLACKSTONE_BRICKS; if (y === fy + 4 && !e) return Math.abs(x - ox) <= 2 && Math.abs(z - oz) <= 2 ? 0 : B.POLISHED_BLACKSTONE_BRICKS;
        if (corner) return B.BASALT; if (e) { if ((x === ox || z === oz) && y <= fy + 3 && y > fy) return 0; if ((y - fy) % 4 === 2 && Math.abs(x - ox) % 3 === 0 && Math.abs(z - oz) % 3 === 0) return 0; return bsB(x, y, z, seed); } return 0; });
      W.fill(ox - 1, fy - 3, oz - 1, ox + 1, fy - 1, oz + 1, (x, y, z) => y === fy - 1 && x === ox && z === oz ? B.MAGMA_BLOCK : (y === fy - 2 ? B.LAVA : B.BLACKSTONE));
      W.fill(ox - 1, fy, oz - 1, ox + 1, fy + 2, oz + 1, (x, y, z) => y === fy + 2 ? B.GOLD_BLOCK : (x === ox && z === oz ? B.MAGMA_BLOCK : B.GILDED_BLACKSTONE));
      W.chest(ox, fy + 3, oz, 'bastion_treasure'); for (const [a, bb] of [[-2, -2], [2, 2], [-2, 2], [2, -2]]) W.set(ox + a, fy + 9, oz + bb, B.GOLD_BLOCK);
      for (let k = 0; k < 4; k++) W.set(ox - 6, fy + k + 1, oz - 6 + k, B.POLISHED_BLACKSTONE_BRICKS); for (let k = 0; k < 4; k++) W.set(ox + 6, fy + 5 + k, oz + 6 - k, B.POLISHED_BLACKSTONE_BRICKS);
      W.chest(ox - 5, fy + 5, oz + 5, 'bastion_other'); W.chest(ox + 5, fy + 1, oz - 5, 'bastion_other'); }
    // residents: piglins all over, brutes guarding the keep
    const r = mulberry32((b.seed ^ c.cx * 31 ^ c.cz * 17) >>> 0);
    for (let k = 0; k < 3; k++) { const x = c.cx * 16 + (r() * 16 | 0), z = c.cz * 16 + (r() * 16 | 0); if (Math.abs(x - ox) < R - 1 && Math.abs(z - oz) < R - 1 && !(Math.abs(x - ox) <= 7 && Math.abs(z - oz) <= 7) && r() < 0.5) W.mob('piglin', x + 0.5, fy, z + 0.5); }
    for (const [a, bb] of [[-4, -4], [4, 4], [-4, 4], [4, -4]]) W.mob('piglin_brute', ox + a + 0.5, fy + (a > 0 && bb > 0 ? 5 : 1), oz + bb + 0.5);
  }
}
{ const _gn = genNetherChunk; genNetherChunk = function (world, c) { const r = _gn(world, c); buildBastionChunk(world, c); return r; }; }
// piglin brutes: no bartering, always hostile, gold axe, 50 health, never despawn
MOBS.piglin_brute = { name: 'Piglin Brute', hp: 50, w: 0.6, h: 1.95, speed: 2.8, kind: 'hostile', dmg: 13, snd: 'snort', persist: true, egg: [[89, 47, 31], [253, 248, 73]], drops: [['golden_axe', 0, 1, 0.085]],
  build(m, r) { MOBS.piglin.build(m, r); const ax = pivot(r, -0.38, 1.0, 0.1); m.axe = sbox(m, ax, 0.08, 0.6, 0.08, 0, -0.1, 0.25, 'brute_axe_h', fur([120, 84, 40], 3)); sbox(m, ax, 0.06, 0.22, 0.26, 0, 0.18, 0.3, 'brute_axe', fur([240, 200, 60], 3), { glowAll: false }); } };
MOB_XP.piglin_brute = [20, 20]; MOB_PITCH.piglin_brute = 0.7;
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) { if (this.type === 'piglin_brute') { this.admireT = 0; } return _u.call(this, dt); }; }
// /locate bastion_remnant
Object.assign(STRUCT_NAMES, { bastion_remnant: 'bastion', bastion: 'bastion' });
{ const _lc = CMDS.locate.run; CMDS.locate.run = function (a, ctx) {
    if (a[0] === 'structure' && STRUCT_NAMES[String(a[1] || '').toLowerCase().replace(/^minecraft:/, '')] === 'bastion') { if (world.dim !== 'nether') throw new CmdError('Bastions are in the Nether'); const P = player.pos; const pcx = Math.floor(P.x / 16), pcz = Math.floor(P.z / 16); let best = null;
      for (let rx = Math.floor(pcx / 27) - 8; rx <= Math.floor(pcx / 27) + 8; rx++) for (let rz = Math.floor(pcz / 27) - 8; rz <= Math.floor(pcz / 27) + 8; rz++) { const b = world.gen.bastion(rx, rz); if (!b) continue; const d = Math.hypot(b.x - P.x, b.z - P.z); if (!best || d < best[3]) best = [b.x, b.fy, b.z, d]; }
      if (!best) throw new CmdError('Could not find a bastion remnant within reasonable distance'); chatPrint('The nearest ' + a[1] + ' is at [' + best[0] + ', ' + best[1] + ', ' + best[2] + '] (' + Math.round(best[3]) + ' blocks away)', '#7ef'); return; }
    return _lc.call(this, a, ctx); }; }

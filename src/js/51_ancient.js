// ================= ANCIENT CITIES (rebuilt, Minecraft-style) =================
// Deep in the deep dark (y -51): a 112 x 112 city of deepslate. In the middle stands the great portal frame of
// reinforced deepslate on a raised plaza with stairs. Streets of deepslate tiles divide the city into plots that hold
// houses, watch towers, ice boxes, long halls and ruined walls; sculk spreads over everything, with sculk sensors and
// shriekers (shriekers summon the Warden). About 25-35 chests: ancient city loot (echo shards, enchanted golden
// apples, Swift Sneak books, enchanted diamond leggings and hoes, potions of regeneration...) and ice box loot.
Object.assign(LOOT, {
  ancient_city: [['echo_shard', 1, 3, 0.35], ['enchanted_golden_apple', 1, 1, 0.07], ['enchanted_book', 1, 1, 0.35], ['diamond_leggings', 1, 1, 0.1], ['diamond_hoe', 1, 1, 0.12], ['golden_apple', 1, 2, 0.25], ['coal', 6, 15, 0.3], ['bone', 1, 15, 0.3], ['iron_leggings', 1, 1, 0.12], ['lead', 1, 1, 0.2], ['saddle', 1, 1, 0.12], ['name_tag', 1, 1, 0.12], ['diamond_horse_armor', 1, 1, 0.08], ['experience_bottle', 1, 3, 0.25], ['sculk', 4, 10, 0.3], ['book', 3, 10, 0.25], ['compass', 1, 1, 0.12], ['potion', 1, 1, 0.2], ['glowstone_dust', 1, 15, 0.15], ['emerald', 1, 3, 0.15]],
  ancient_ice_box: [['baked_potato', 1, 10, 0.6], ['packed_ice', 2, 6, 0.5], ['suspicious_stew', 1, 1, 0.4], ['golden_carrot', 1, 10, 0.3], ['snow_block', 2, 6, 0.4], ['ice', 2, 4, 0.3]],
});
// ancient city books are often Swift Sneak; potions there are Regeneration
{ const _rl = rollLoot; rollLoot = function (type, seed) { const inv = _rl(type, seed); if (type === 'ancient_city') { const r = mulberry32((seed ^ 0xa11c) >>> 0); for (const s of inv) { if (!s) continue; if (s.id === IT.enchanted_book && ENCH.swift_sneak && r() < 0.6) s.ench = { swift_sneak: 1 + Math.floor(r() * 3) }; if (s.id === IT.potion) s.pot = r() < 0.5 ? 'regeneration' : 'long_regeneration'; if ((s.id === IT.diamond_leggings || s.id === IT.diamond_hoe || s.id === IT.iron_leggings) && !s.ench) { const L = rollEnchants(s.id, 30, (r() * 1e9) | 0); if (L.length) { s.ench = {}; for (const [e, l] of L) s.ench[e] = l; } } } } return inv; }; }
function acLayout(world, st) {
  if (st.ac) return st.ac; const r = mulberry32((st.seed ^ 0xac17) >>> 0); const R = 56, ox = st.cx * 16 + 8, oz = st.cz * 16 + 8, y0 = YOFF - 51;
  const plots = []; const P = 18; // streets every 18 blocks, plots between
  for (let gx = -3; gx < 3; gx++) for (let gz = -3; gz < 3; gz++) { const x0 = ox + gx * P + 3, z0 = oz + gz * P + 3; const cxp = x0 + 6, czp = z0 + 6; if (Math.abs(cxp - ox) < 14 && Math.abs(czp - oz) < 14) continue; // the centre plaza
    const q = r(); const kind = q < 0.34 ? 'house' : q < 0.5 ? 'tower' : q < 0.62 ? 'icebox' : q < 0.78 ? 'hall' : q < 0.92 ? 'ruin' : 'camp'; plots.push({ x0, z0, w: 12, d: 12, kind, rot: (r() * 4) | 0, v: r() }); }
  st.ac = { R, ox, oz, y0, plots }; return st.ac;
}
const dsB = (x, y, z, s) => { const q = rnd01(x, y, z, s ^ 0xd5); return q < 0.55 ? B.DEEPSLATE_BRICKS : q < 0.85 ? B.DEEPSLATE_TILES : q < 0.95 ? B.COBBLED_DEEPSLATE : B.DEEPSLATE; };
buildAncientChunk = function (world, c) {
  const sts = bigStartsNear(world, 'ancient_city', c.cx, c.cz, 5); if (!sts.length) return; const W = pieceWriter(c, world); const seed = world.seed;
  for (const st of sts) { const L = acLayout(world, st); const { R, ox, oz, y0 } = L; if (ox + R < c.cx * 16 || ox - R > c.cx * 16 + 15 || oz + R < c.cz * 16 || oz - R > c.cz * 16 + 15) continue;
    // the ground: hollow out the cavern, lay a deepslate floor, spread sculk
    W.fill(ox - R, y0, oz - R, ox + R, y0 + 24, oz + R, (x, y, z) => { const e = Math.max(Math.abs(x - ox), Math.abs(z - oz)); const roof = 18 + Math.floor(rnd01(x >> 2, 3, z >> 2, seed) * 7) - Math.max(0, e - R + 8); return y - y0 < roof ? 0 : W.get(x, y, z); });
    W.fill(ox - R, y0 - 1, oz - R, ox + R, y0 - 1, oz + R, (x, y, z) => { const sx = ((x - ox) % 18 + 18) % 18, sz = ((z - oz) % 18 + 18) % 18; const street = sx < 3 || sz < 3; const n = rnd01(x, y, z, seed); if (n < (street ? 0.12 : 0.35)) return B.SCULK; return street ? B.DEEPSLATE_TILES : (n < 0.7 ? B.DEEPSLATE_TILES : B.DEEPSLATE_BRICKS); });
    W.fill(ox - R, y0 - 3, oz - R, ox + R, y0 - 2, oz + R, B.DEEPSLATE);
    W.fill(ox - R, y0, oz - R, ox + R, y0, oz + R, (x, y, z) => { const n = rnd01(x, y + 1, z, seed); return n > 0.992 ? B.SCULK_SENSOR : n > 0.986 ? B.SCULK_SHRIEKER : n > 0.983 ? B.TORCH : W.get(x, y, z); });
    // the city centre: raised plaza and the great portal frame
    W.fill(ox - 12, y0, oz - 9, ox + 12, y0 + 1, oz + 9, (x, y, z) => { const e = Math.max(Math.abs(x - ox) - 10, Math.abs(z - oz) - 7); return e > 0 && y - y0 >= e ? 0 : B.DEEPSLATE_TILES; });
    W.fill(ox - 11, y0 + 2, oz - 2, ox + 11, y0 + 18, oz + 2, (x, y, z) => { const dx = Math.abs(x - ox), dz = Math.abs(z - oz), h = y - y0 - 2;
      if (dx >= 9 && dx <= 11) return h <= 14 ? (dz <= 1 ? B.REINFORCED_DEEPSLATE : B.DEEPSLATE_BRICKS) : 0; // the two great pillars
      if (h >= 13 && h <= 16 && dx <= 8 && dz <= 1) return h === 16 && dx > 6 ? 0 : B.REINFORCED_DEEPSLATE; // the lintel
      if (h >= 11 && h <= 12 && dx <= 7 && dz === 0) return B.DEEPSLATE_TILES;
      if (h === 0 && dx <= 7 && dz <= 1) return B.REINFORCED_DEEPSLATE; return 0; });
    for (const s of [-1, 1]) { W.fill(ox + s * 13, y0, oz - 5, ox + s * 13, y0 + 8, oz - 5, B.DEEPSLATE_BRICKS); W.fill(ox + s * 13, y0, oz + 5, ox + s * 13, y0 + 8, oz + 5, B.DEEPSLATE_BRICKS); W.set(ox + s * 13, y0 + 9, oz - 5, B.SCULK); W.set(ox + s * 13, y0 + 9, oz + 5, B.SCULK); }
    W.chest(ox - 6, y0 + 2, oz + 5, 'ancient_city'); W.chest(ox + 6, y0 + 2, oz - 5, 'ancient_city'); W.set(ox, y0 + 2, oz + 6, B.SCULK_SHRIEKER); W.set(ox, y0 + 2, oz - 6, B.SCULK_SHRIEKER);
    // the plots
    for (const p of L.plots) { const { x0, z0, w, d } = p; if (x0 + w < c.cx * 16 || x0 > c.cx * 16 + 15 || z0 + d < c.cz * 16 || z0 > c.cz * 16 + 15) continue; const cxp = x0 + 6, czp = z0 + 6;
      const door = [[cxp, z0], [x0 + w - 1, czp], [cxp, z0 + d - 1], [x0, czp]][p.rot];
      if (p.kind === 'house') { const hx0 = x0 + 2, hz0 = z0 + 2, hx1 = x0 + 9, hz1 = z0 + 9, H = 6;
        W.fill(hx0, y0, hz0, hx1, y0 + H, hz1, (x, y, z) => { const e = x === hx0 || x === hx1 || z === hz0 || z === hz1; if (y === y0 + H) return B.DEEPSLATE_TILES; if (!e) return 0; if (rnd01(x, y, z, seed) < 0.08 && y > y0 + 2) return 0; return (y === y0 + 2 && (x + z) % 3 === 0) ? 0 : dsB(x, y, z, seed); });
        const [dx, dz] = door; const ddx = clamp(dx, hx0, hx1), ddz = clamp(dz, hz0, hz1); W.fill(ddx, y0, ddz, ddx, y0 + 2, ddz, 0);
        W.chest(hx0 + 1 + (p.v < 0.5 ? 0 : 5), y0, hz0 + 1, 'ancient_city'); W.set(hx1 - 1, y0, hz1 - 1, B.SCULK); W.set(hx0 + 3, y0 + H - 1, hz0 + 3, B.SCULK); if (p.v < 0.4) W.set(hx0 + 1, y0, hz1 - 1, B.TORCH); }
      else if (p.kind === 'tower') { const tx = cxp, tz = czp, H = 14 + Math.floor(p.v * 6);
        W.fill(tx - 2, y0, tz - 2, tx + 2, y0 + H, tz + 2, (x, y, z) => { const e = Math.abs(x - tx) === 2 || Math.abs(z - tz) === 2; const corner = Math.abs(x - tx) === 2 && Math.abs(z - tz) === 2; if (y === y0 + H) return B.DEEPSLATE_TILES; if (!e) return (y - y0) % 5 === 4 && !(x === tx && z === tz - 1) ? B.DEEPSLATE_TILES : 0; if (corner) return B.DEEPSLATE_BRICKS; return ((y - y0) % 5 === 2 && (x === tx || z === tz)) ? 0 : dsB(x, y, z, seed); });
        for (let y = y0; y < y0 + H; y++) W.set(tx, y, tz - 1, B.LADDER); W.set(tx, y0 + H - 1, tz - 1, 0); W.fill(tx, y0, tz - 2, tx, y0 + 1, tz - 2, 0); W.chest(tx + 1, y0 + H - 6, tz + 1, 'ancient_city'); W.set(tx - 1, y0 + H + 1, tz - 1, B.SCULK_SENSOR); }
      else if (p.kind === 'icebox') { const ix0 = x0 + 3, iz0 = z0 + 3, ix1 = x0 + 8, iz1 = z0 + 8;
        W.fill(ix0, y0 - 4, iz0, ix1, y0 + 3, iz1, (x, y, z) => { const e = x === ix0 || x === ix1 || z === iz0 || z === iz1 || y === y0 - 4; if (y === y0 + 3) return B.DEEPSLATE_TILES; if (e) return y < y0 ? B.PACKED_ICE : (y === y0 + 1 && (x + z) % 2 ? 0 : B.DEEPSLATE_BRICKS); return y === y0 - 3 && (x + z) % 3 === 0 ? B.ICE : 0; });
        for (let k = 0; k < 4; k++) W.set(ix0 + 1, y0 - 3 + k, iz0 + 1 + k, B.DEEPSLATE_TILES); W.fill(ix0, y0, czp, ix0, y0 + 1, czp, 0); W.chest(ix1 - 1, y0 - 3, iz1 - 1, 'ancient_ice_box'); W.set(ix1 - 1, y0 - 3, iz0 + 1, B.PACKED_ICE); }
      else if (p.kind === 'hall') { const hx0 = x0 + 1, hz0 = z0 + 1, hx1 = x0 + 10, hz1 = z0 + 10, H = 8;
        W.fill(hx0, y0, hz0, hx1, y0 + H, hz1, (x, y, z) => { const e = x === hx0 || x === hx1 || z === hz0 || z === hz1; const pillar = (x - hx0) % 3 === 0 && (z - hz0) % 3 === 0; if (y === y0 + H) return rnd01(x, y, z, seed) < 0.15 ? 0 : B.DEEPSLATE_TILES; if (e) return (y >= y0 + 3 && y <= y0 + 5 && ((x - hx0) % 3 === 1 || (z - hz0) % 3 === 1)) ? B.DEEPSLATE_TILES : dsB(x, y, z, seed); return pillar ? B.DEEPSLATE_BRICKS : 0; });
        const [dx, dz] = door; W.fill(clamp(dx, hx0, hx1) - (p.rot % 2 ? 0 : 1), y0, clamp(dz, hz0, hz1) - (p.rot % 2 ? 1 : 0), clamp(dx, hx0, hx1) + (p.rot % 2 ? 0 : 1), y0 + 3, clamp(dz, hz0, hz1) + (p.rot % 2 ? 1 : 0), 0);
        W.chest(hx0 + 2, y0, hz0 + 1, 'ancient_city'); W.chest(hx1 - 2, y0, hz1 - 1, 'ancient_city'); W.set(cxp, y0, czp, B.SCULK_SHRIEKER); W.set(cxp + 1, y0, czp, B.SCULK_SENSOR); W.set(cxp, y0 + 1, czp - 2, B.TORCH); }
      else if (p.kind === 'ruin') { // broken walls with an arch, sculk creeping over them
        for (let i = 0; i < 12; i++) { const h = Math.max(1, Math.round(6 - Math.abs(i - 6) * 0.6 + rnd01(i, 3, x0, seed) * 3)); const [x, z] = p.rot % 2 ? [x0 + i, czp] : [cxp, z0 + i]; W.fill(x, y0, z, x, y0 + h, z, (xx, y, zz) => (i >= 5 && i <= 7 && y <= y0 + 3) ? 0 : (y === y0 + h && rnd01(xx, y, zz, seed) < 0.5 ? B.SCULK : dsB(xx, y, zz, seed))); }
        if (p.v < 0.6) W.chest(p.rot % 2 ? x0 + 2 : cxp + 1, y0, p.rot % 2 ? czp + 1 : z0 + 2, 'ancient_city'); }
      else if (p.kind === 'camp') { // a sunken camp: a ring of deepslate, a fire pit and supplies
        W.fill(cxp - 3, y0, czp - 3, cxp + 3, y0, czp + 3, (x, y, z) => (Math.abs(x - cxp) === 3 || Math.abs(z - czp) === 3) && (x + z) % 2 ? B.COBBLED_DEEPSLATE : 0);
        W.set(cxp, y0 - 1, czp, B.MAGMA_BLOCK); W.set(cxp, y0, czp, B.TORCH); W.chest(cxp + 2, y0, czp - 2, 'ancient_city'); W.set(cxp - 2, y0, czp + 2, B.SCULK_SENSOR); }
    }
    if (W.inC(ox, oz)) c.ancient = [ox, y0, oz];
  }
};

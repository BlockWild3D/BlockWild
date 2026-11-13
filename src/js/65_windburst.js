// ================= WIND BURST AND LUNGE, AS IN MINECRAFT =================
// Wind Burst (mace, I-III): a smash attack releases a wind charge burst that throws you 7 blocks up per level
// (Java 1.21: 7 / 14 / 21 blocks), less with Blast Protection; mobs around the target are blown away too.
// Like any wind charge launch, the fall afterwards only hurts for the distance you drop BELOW the point where the
// burst hit you, so landing back where you started is safe. It is a treasure enchantment: never from the
// enchanting table or librarians, and books come only from ominous vaults.
// Lunge (spear, I-III): a jab throws you forward 9.16 / 18.32 / 27.48 blocks per second, costs 1/2/3 hunger
// (saturation first) and 1 durability; it needs 6+ hunger and doesn't work in water, while riding or gliding.
Object.assign(ENCH.wind_burst, { treasure: true, noTrade: true, vaultOnly: true });
function windBurstLaunch(P, lv, mob) {
  const resist = typeof blastKbResist === 'function' ? blastKbResist(P) : 0;
  const h = 7 * lv * (1 - resist); const g = MODS.physics.gravity;
  P.vel.y = Math.sqrt(2 * g * h); P.peak = null; P.windSafeT = 1.5; P.windFloorY = P.pos.y; P.windT = performance.now();
  if (mob && typeof windBurst === 'function') { const p = mob.pos.clone(); p.y += 0.2; const _pl = P.vel.clone(); windBurst(p, 1.1, null); P.vel.copy(_pl); } // knock nearby mobs, not you twice
  Sfx.play('vwoop', 0.8, 0.8);
}
// fall damage after a wind launch counts only below the launch point
{ const _up = updatePlayer; updatePlayer = function (dt) { const P = player;
    if (P.windFloorY != null) { if (P.peak != null && P.peak > P.windFloorY) P.peak = P.windFloorY; if ((P.onGround || P.flying || P.gliding) && performance.now() - (P.windT || 0) > 300) P.windFloorY = null; }
    return _up.apply(this, arguments); }; }
// Wind Burst books only from ominous vaults (about 1 in 8 openings); other chests never roll one
{ const _rl = rollLoot; rollLoot = function (type, seed) { const inv = _rl(type, seed); const r = mulberry32((seed ^ 0x77b1) >>> 0);
    const pool = Object.keys(ENCH).filter(k => !ENCH[k].vaultOnly);
    for (const s of inv) if (s && s.id === IT.enchanted_book && s.ench && Object.keys(s.ench).some(k => ENCH[k] && ENCH[k].vaultOnly) && type !== 'ominous_vault') { const k = pool[(r() * pool.length) | 0]; s.ench = { [k]: 1 + Math.floor(r() * ENCH[k].max) }; }
    if (type === 'ominous_vault' && r() < 0.125) inv[0] = { id: IT.enchanted_book, count: 1, ench: { wind_burst: 1 } };
    return inv; }; }
// Lunge: needs at least 6 hunger, and not while gliding
{ const _he = heldEnch; heldEnch = function (e) { if (e === 'lunge') { const P = player; if (P.gliding || (isSurv() && P.food < 6)) return 0; } return _he.apply(this, arguments); }; }

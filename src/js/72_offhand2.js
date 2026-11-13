// ================= OFF HAND, PROPERLY (Minecraft) =================
// Using the off hand (throwing a wind charge, eating, placing) no longer swaps the item shown in your main hand or
// touches your main hand's attack cooldown: the main hand keeps showing your weapon, and the off hand does its own
// swing. Attacks always use the main hand. The mace's smash attack counts the fall from the highest point you
// reached (Minecraft's fall distance), so wind-charge jumps work, and it needs no attack charge: a smash (and
// Wind Burst) happens on any hit while falling more than 1.5 blocks.
const withMain = (fn) => function () { const u = S.useOff; S.useOff = false; try { return fn.apply(this, arguments); } finally { S.useOff = u; } };
playerMelee = withMain(playerMelee); meleeHit = withMain(meleeHit);
// first person: the main hand shows the main-hand item; an off-hand use swings the left hand
{ const _uh = updateHand; let lastSwing = 0;
  updateHand = function (dt, light) {
    if (S.useOff && S.swing > lastSwing + 0.5) { S.offSwing = 1; S.swing = lastSwing; } // the swing belongs to the off hand
    const r = withMain(_uh).apply(this, arguments); lastSwing = S.swing;
    S.offSwing = Math.max(0, (S.offSwing || 0) - dt / 0.3);
    if (S.offSwing > 0 && offMesh) { const p = 1 - S.offSwing, sq = Math.sqrt(p); offGroup.position.x += 0.12 * Math.sin(sq * Math.PI); offGroup.position.y += 0.06 * Math.sin(sq * Math.PI * 2) - 0.05 * Math.sin(p * Math.PI); offGroup.position.z -= 0.15 * Math.sin(p * Math.PI); offGroup.rotation.x -= Math.sin(sq * Math.PI) * 0.9; offGroup.rotation.y -= Math.sin(p * p * Math.PI) * 0.3; }
    return r; }; }
// third person: the main hand shows the main-hand item too
{ const _ap = applyPov; applyPov = withMain(_ap); }
// Minecraft's fall distance for the mace: the highest point since you last went up
{ const _up = updatePlayer; updatePlayer = function (dt) { const P = player; const r = _up.apply(this, arguments);
    if (P.onGround || P.flying || inWater(P, 0.4) || P.riding || P.gliding) P.smashPeak = null;
    else if (P.vel.y > 0 || P.smashPeak == null || P.pos.y > P.smashPeak) P.smashPeak = P.pos.y;
    return r; }; }

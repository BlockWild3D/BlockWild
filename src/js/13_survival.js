// ================= SWIMMING + DROWNING =================
// Minecraft: 300 ticks (15 s) of air; when it runs out you take 2 damage every second. Air refills quickly above water.
// Sprinting while underwater starts swimming: you lie flat, are 0.6 blocks tall and move where you look.
player.air = 300; player.swimming = false;
EFFECTS.water_breathing = 'Water Breathing';
const bubbleImgs = []; for (let i = 0; i < 10; i++) { const im = document.createElement('img'); $('airRow').appendChild(im); bubbleImgs.push(im); }
const BUBBLE = (() => { const mk = (pop) => { const c = document.createElement('canvas'); c.width = c.height = 9; const x = c.getContext('2d'); if (pop) { x.fillStyle = '#9fd4ff'; for (const [a, b] of [[1, 1], [7, 1], [1, 7], [7, 7], [4, 0], [0, 4], [8, 4], [4, 8]]) x.fillRect(a, b, 1, 1); return c.toDataURL(); }
  x.fillStyle = '#1b3b78'; x.beginPath(); x.arc(4.5, 4.5, 4.2, 0, 7); x.fill(); x.fillStyle = '#6fb4ff'; x.beginPath(); x.arc(4.5, 4.5, 3.3, 0, 7); x.fill(); x.fillStyle = '#e8f6ff'; x.fillRect(2, 2, 2, 2); return c.toDataURL(); }; return [mk(false), mk(true)]; })();
let drownT = 0;
function updateAir(dt, eyeFluid) {
  const P = player; const under = eyeFluid === B.WATER && S.mode === 'survival' && !P.dead;
  if (under && !effLevel('water_breathing')) { P.air -= dt * 20; if (P.air <= 0) { P.air = 0; drownT += dt; if (drownT >= 1) { drownT = 0; P.hurtCD = 0; P.hurt(2, null, 'drowning', 0); Particles.emit(P.pos.x, P.pos.y + 1.4, P.pos.z, 6, [0.7, 0.85, 1], 1.5, 0.6, -4, 0.3); } } }
  else { P.air = Math.min(300, P.air + dt * 80); drownT = 0; }
  if (under && Math.random() < dt * 1.5) { const e = P.eye(); Particles.emit(e.x, e.y, e.z, 1, [0.75, 0.9, 1], 0.3, 1.2, -3, 0.15); }
  const vis = (under || P.air < 300) && S.mode === 'survival'; $('airRow').style.visibility = vis ? 'visible' : 'hidden';
  if (vis) { const n = Math.ceil(P.air / 30); for (let i = 0; i < 10; i++) { const b = bubbleImgs[9 - i]; if (i < n) { b.src = BUBBLE[0]; b.style.visibility = 'visible'; } else if (i === n && P.air > 0) { b.src = BUBBLE[1]; b.style.visibility = 'visible'; } else b.style.visibility = 'hidden'; } }
}
function canStand(P) { for (let dx of [-P.hw, P.hw]) for (let dz of [-P.hw, P.hw]) for (let y = 0.6; y < 1.8; y += 0.5) if (world.solid(Math.floor(P.pos.x + dx), Math.floor(P.pos.y + y), Math.floor(P.pos.z + dz))) return false; return true; }
function swimUpdate(P, dt, water, lava, sprint, fwd, jump, down) {
  const wantSwim = water && !P.flying && sprint && fwd > 0 && inWater(P, 0.9);
  if (wantSwim && !P.swimming) { P.swimming = true; P.h = 0.6; }
  if (P.swimming && !wantSwim) { if (!water && !canStand(P)) { /* crawl under a block */ } else if (canStand(P)) { P.swimming = false; P.h = 1.8; } }
  if (!P.swimming || !water) return false;
  const d = lookDir(); const sp = 5.6; P.vel.x += (d.x * sp - P.vel.x) * Math.min(1, dt * 4); P.vel.z += (d.z * sp - P.vel.z) * Math.min(1, dt * 4); P.vel.y += (d.y * sp + (jump ? 1.5 : 0) - (down ? 1.5 : 0) - P.vel.y) * Math.min(1, dt * 4);
  P.peak = null; return true;
}
// third-person / multiplayer swim pose for player models
function swimPose(model, P, dt) {
  const swim = P.swimming; const inW = inWater(P, 0.5); model.swimK = (model.swimK || 0) + ((swim ? 1 : 0) - (model.swimK || 0)) * Math.min(1, dt * 8);
  const k = model.swimK; if (k < 0.01 && !inW) { model.P.armR.rotation.z = 0; model.P.armL.rotation.z = 0; return; }
  model.body.rotation.x = -(Math.PI / 2 - (P.pitch || 0)) * k; model.body.position.y = 0.3 * k;
  const t = performance.now() / 1000; const P2 = model.P;
  if (k > 0.3) { const s = Math.sin(t * 6); P2.armR.rotation.x = -Math.PI + s * 0.9; P2.armL.rotation.x = -Math.PI - s * 0.9; P2.armR.rotation.z = 0.4 + Math.cos(t * 6) * 0.3; P2.armL.rotation.z = -0.4 - Math.cos(t * 6) * 0.3; P2.legR.rotation.x = Math.sin(t * 10) * 0.35; P2.legL.rotation.x = -Math.sin(t * 10) * 0.35; P2.head.rotation.x = -0.9 * k; }
  else if (inW) { const s = Math.sin(t * 4); P2.armR.rotation.z = 0.5 + s * 0.4; P2.armL.rotation.z = -0.5 - s * 0.4; P2.legR.rotation.x = Math.sin(t * 5) * 0.3; P2.legL.rotation.x = -Math.sin(t * 5) * 0.3; }
  else { P2.armR.rotation.z = 0; P2.armL.rotation.z = 0; }
}

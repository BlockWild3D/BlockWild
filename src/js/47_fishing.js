// ================= FISHING (Minecraft) =================
// Cast a fishing rod into water (use), wait for a bite: after 5 to 30 seconds (Lure takes 5 s off per level) a trail
// of bubbles swims up to the bobber, which then dips. Reel in (use again) within about a second to catch something:
// fish 85% (cod 60, salmon 25, pufferfish 13, tropical fish 2), junk 10%, treasure 5% (Luck of the Sea shifts junk
// to treasure: -2.5% junk and +2.1% treasure per level). 1-6 experience per catch. Reeling in a hooked mob pulls it
// toward you; reeling a bobber stuck in a block costs 2 durability. The bobber drifts away if you go 32 blocks off.
const FISH_LOOT = { fish: [['cod', 60], ['salmon', 25], ['tropical_fish', 2], ['pufferfish', 13]],
  junk: [['lily_pad', 17], ['leather_boots', 10], ['leather', 10], ['bone', 10], ['potion', 10], ['string', 5], ['fishing_rod', 2], ['bowl', 10], ['stick', 5], ['ink_sac', 1], ['tripwire_hook', 10], ['rotten_flesh', 10]],
  treasure: [['bow', 1], ['enchanted_book', 1], ['fishing_rod', 1], ['name_tag', 1], ['saddle', 1], ['turtle_scute', 1]] };
Object.assign(ENCH, { lure: { name: 'Lure', max: 3, for: 'rod', w: 2 }, luck_of_the_sea: { name: 'Luck of the Sea', max: 3, for: 'rod', w: 2 } });
{ const _ec = enchCat; enchCat = function (id) { if (id === IT.fishing_rod) return 'rod'; return _ec(id); }; }
{ const _ea = enchantability; enchantability = function (id) { if (id === IT.fishing_rod) return 1; return _ea(id); }; }
function rollFishing(luck) {
  const pick = (L) => { const tot = L.reduce((a, b) => a + b[1], 0); let q = Math.random() * tot; for (const e of L) { q -= e[1]; if (q <= 0) return e[0]; } return L[0][0]; };
  const junk = Math.max(0, 10 - 2.5 * luck), tre = 5 + 2.1 * luck, q = Math.random() * 100;
  const cat = q < tre ? 'treasure' : q < tre + junk ? 'junk' : 'fish'; const key = pick(FISH_LOOT[cat]); const s = { id: IT[key], count: 1 };
  if (key === 'potion') s.pot = 'water';
  if (cat === 'treasure' && (key === 'bow' || key === 'fishing_rod')) { const list = rollEnchants(s.id, 30, (Math.random() * 1e9) | 0); if (list.length) { s.ench = {}; for (const [e, l] of list) s.ench[e] = l; } s.dmg = Math.floor(maxDur(s.id) * (0.5 + Math.random() * 0.4)); }
  if (key === 'enchanted_book') { const keys = Object.keys(ENCH).filter(k => !ENCH[k].curse); const e = keys[(Math.random() * keys.length) | 0]; s.ench = { [e]: 1 + Math.floor(Math.random() * ENCH[e].max) }; }
  if (cat === 'junk' && (key === 'leather_boots' || key === 'fishing_rod')) s.dmg = Math.floor(maxDur(s.id) * (Math.random() * 0.9));
  return s;
}
PROJ.bobber = { grav: 0, size: 0.18, color: 0xd83030 };
let bobber = null; const fishLineMat = new THREE.LineBasicMaterial({ color: 0x222222 });
function rodHand() { const e = player.eye(), d = lookDir(); const right = new V3(Math.cos(player.yaw), 0, -Math.sin(player.yaw)); return e.clone().addScaledVector(d, 0.5).addScaledVector(right, 0.35).add(new V3(0, -0.25, 0)); }
function castBobber() {
  const d = lookDir(); const mesh = new THREE.Group(); const a = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.18), new THREE.MeshBasicMaterial({ color: 0xd83030 })), b = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.18), new THREE.MeshBasicMaterial({ color: 0xf0f0f0 })); a.position.y = -0.05; b.position.y = 0.04; mesh.add(a, b); G.scene.add(mesh);
  const geo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 12 }, () => new V3())); const line = new THREE.Line(geo, fishLineMat); line.frustumCulled = false; G.scene.add(line);
  const v = d.clone().multiplyScalar(14 + Math.random() * 2); v.y += 2; v.add(player.vel.clone().multiplyScalar(0.5));
  bobber = { pos: rodHand(), vel: v, mesh, line, geo, phase: 'fly', wait: 0, lure: heldEnch('lure'), luck: heldEnch('luck_of_the_sea'), hooked: null, stuck: false };
  Sfx.play('bow', 0.4, 0.6); S.swing = 1;
}
function removeBobber() { if (!bobber) return; G.scene.remove(bobber.mesh); G.scene.remove(bobber.line); bobber.geo.dispose(); bobber = null; }
function reelIn() {
  const B0 = bobber; if (!B0) return; let dur = 0; const P = player;
  if (B0.hooked && !B0.hooked.dead) { const m = B0.hooked; const d = P.pos.clone().sub(m.pos); m.vel.x += d.x * 0.5; m.vel.z += d.z * 0.5; m.vel.y += Math.sqrt(d.length()) * 1.6 + 1; dur = 5; }
  else if (B0.phase === 'bite') { const s = rollFishing(B0.luck); const it = dropItem(s.id, s.count, B0.pos.x, B0.pos.y + 0.3, B0.pos.z, false, xtra(s)); const d = P.eye().sub(B0.pos); it.vel.set(d.x * 2.2, d.y * 2 + Math.sqrt(d.length()) * 2.4, d.z * 2.2); it.pickDelay = 0; spawnOrbRange(P.pos.x, P.pos.y + 0.5, P.pos.z, 1, 6); Sfx.play('splash', 0.5, 1.2); dur = 1; }
  else if (B0.stuck) dur = 2;
  if (dur && S.mode !== 'creative') damageHeld(dur); removeBobber(); Sfx.play('bow', 0.3, 1.4); S.swing = 1;
}
function updateBobber(dt) {
  const B0 = bobber; if (!B0) return; const P = player; const h = P.held();
  if (P.dead || !h || h.id !== IT.fishing_rod || B0.pos.distanceTo(P.pos) > 32 || world.dim !== B0.dim && B0.dim) { removeBobber(); return; }
  B0.dim = world.dim;
  const at = (dy) => world.get(Math.floor(B0.pos.x), Math.floor(B0.pos.y + dy), Math.floor(B0.pos.z)); const inW = isWaterId(at(0));
  if (B0.hooked) { const m = B0.hooked; if (m.dead || m.gone) { B0.hooked = null; B0.phase = 'fly'; } else B0.pos.set(m.pos.x, m.pos.y + m.h * 0.8, m.pos.z); }
  else if (B0.stuck) { }
  else if (inW) {
    // float at the surface, bobbing
    B0.vel.x *= Math.exp(-dt * 4); B0.vel.z *= Math.exp(-dt * 4);
    if (isWaterId(at(1))) B0.vel.y += (4 - B0.vel.y) * Math.min(1, dt * 4); else B0.vel.y = (Math.floor(B0.pos.y) + 0.82 - B0.pos.y) * 8 + Math.sin(G.simT * 3) * 0.12;
    if (B0.phase === 'fly') { B0.phase = 'wait'; B0.wait = Math.max(1, (5 + Math.random() * 25) - 5 * B0.lure); Sfx.play('splash', 0.3, 1.6); Particles.emit(B0.pos.x, B0.pos.y + 0.2, B0.pos.z, 8, [[0.8, 0.9, 1]], 1, 0.4, 4, 0.4); }
    if (B0.phase === 'wait') { B0.wait -= dt * (world.skyAt && world.skyAt(Math.floor(B0.pos.x), Math.floor(B0.pos.y) + 1, Math.floor(B0.pos.z)) >= 1 ? 1 : 0.5) * (S.weatherRain ? 1.25 : 1); if (B0.wait <= 0) { B0.phase = 'approach'; B0.app = 1 + Math.random() * 3; B0.ang = Math.random() * 6.28; } }
    else if (B0.phase === 'approach') { B0.app -= dt; const r = Math.max(0, B0.app) * 1.6; if (Math.random() < dt * 30) Particles.emit(B0.pos.x + Math.cos(B0.ang) * r, B0.pos.y + 0.1, B0.pos.z + Math.sin(B0.ang) * r, 1, [[0.85, 0.95, 1]], 0.2, 0.3, 0, 0.3); if (B0.app <= 0) { B0.phase = 'bite'; B0.biteT = 0.5 + Math.random() * 0.5; B0.vel.y = -4; Sfx.play('splash', 0.6, 1.1); Particles.emit(B0.pos.x, B0.pos.y + 0.2, B0.pos.z, 14, [[0.85, 0.95, 1]], 1.5, 0.5, 4, 0.5); } }
    else if (B0.phase === 'bite') { B0.biteT -= dt; if (B0.biteT <= 0) { B0.phase = 'wait'; B0.wait = Math.max(1, (5 + Math.random() * 25) - 5 * B0.lure); } }
  } else { B0.vel.y -= 12 * dt; B0.vel.multiplyScalar(Math.pow(0.92, dt * 20)); if (B0.phase !== 'fly') { B0.phase = 'fly'; } }
  if (!B0.hooked && !B0.stuck) {
    const n = B0.pos.clone().addScaledVector(B0.vel, dt);
    if (world.solid(Math.floor(n.x), Math.floor(n.y), Math.floor(n.z))) { if (B0.phase === 'fly' && !inW) { if (B0.vel.y < 0 && !world.solid(Math.floor(B0.pos.x), Math.floor(B0.pos.y), Math.floor(B0.pos.z))) { B0.vel.set(0, 0, 0); B0.stuck = true; } else { B0.vel.x *= -0.2; B0.vel.z *= -0.2; } } }
    else B0.pos.copy(n);
    if (B0.phase === 'fly') for (const m of G.mobs) { if (m.dead || m.isBoss || m === P.riding) continue; if (hitsMob(m, B0.pos, 0.15)) { B0.hooked = m; m.hurt(0, P.pos, 0.2, true); break; } }
  }
  B0.mesh.position.copy(B0.pos); B0.mesh.position.y += B0.phase === 'bite' ? -0.15 : 0;
  // the line sags between the rod tip and the bobber
  const a = rodHand(), b = B0.pos, arr = B0.geo.attributes.position; const sag = Math.min(2, a.distanceTo(b) * 0.08) * (B0.phase === 'fly' ? 0.3 : 1);
  for (let i = 0; i < 12; i++) { const t = i / 11; arr.setXYZ(i, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * sag, a.z + (b.z - a.z) * t); } arr.needsUpdate = true;
}
{ const _ub = updateBoats; updateBoats = function (dt) { const r = _ub(dt); updateBobber(dt); return r; }; }
{ const _ua = useAction; useAction = function (eye, dir) { const h = player.held();
    if (h && h.id === IT.fishing_rod && !(target && !kd('sneak') && BL[target.id].use)) { mouseR = false; S.useCD = 0.3; if (bobber) reelIn(); else castBobber(); return; }
    return _ua(eye, dir); }; }

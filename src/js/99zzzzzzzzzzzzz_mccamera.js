// ================= CAMERA EFFECTS, as Minecraft Java's Camera and GameRenderer do them =================
// Field of view (Camera.calculateFov + AbstractClientPlayer.getFieldOfViewModifier): your FOV setting times a modifier
// that eases halfway to its target every tick. The modifier is (movement speed / walking speed + 1) / 2, so sprinting
// (+30% speed) widens the view by 15%, Speed and Slowness change it too; flying multiplies it by 1.1; drawing a bow
// narrows it by up to 15% (draw time squared, full at 1 second); looking through a spyglass sets it to 0.1. With your
// eyes under water the view is 6/7 as wide.
// View bobbing (GameRenderer.bobView): "bob" eases 40% per tick toward your ground speed per tick (capped at 0.1 block)
// and is zero in the air or swimming; the view shifts sideways by sin(phase) * bob / 2 and down by |cos(phase)| * bob,
// rolls by sin(phase) * bob * 3 degrees and nods by |cos(phase - 0.2)| * bob * 5 degrees, where the phase is pi times
// 0.6 per block walked.
// Getting hurt (GameRenderer.bobHurt): no shake; the view tilts by up to 14 degrees toward the side the hit came from,
// sin(t^4 * pi) over the half second of hurt time (t running from 1 down to 0).
const MCCAM = { fovMod: 1, bob: 0, q: new THREE.Quaternion(), qa: new THREE.Quaternion(), qb: new THREE.Quaternion(), v: new V3(), X: new V3(1, 0, 0), Y: new V3(0, 1, 0), Z: new V3(0, 0, 1) };
function mcFov(P, dt) {
  let mod;
  if (S.spyglass) mod = 0.1;
  else {
    mod = 1; if (P.flying) mod *= 1.1;
    let spd = (1 + 0.2 * effLevel('speed')) * Math.max(0, 1 - 0.15 * effLevel('slowness')); if (P.sprinting) spd *= 1.3;
    mod *= (spd + 1) / 2;
    if (S.bowDraw >= 0) { const t = clamp(S.bowDraw, 0, 1); mod *= 1 - t * t * 0.15; }
  }
  const k = 1 - Math.pow(0.5, dt * 20); MCCAM.fovMod = clamp(MCCAM.fovMod + (mod - MCCAM.fovMod) * k, 0.1, 1.5);
  if (S.spyglass) MCCAM.fovMod = 0.1; // the spyglass snaps in
  const e = P.eye(); const wet = FKIND[world.get(Math.floor(e.x), Math.floor(e.y + 0.05), Math.floor(e.z))] === 1;
  return S.fov * MCCAM.fovMod * (wet ? 6 / 7 : 1);
}
function mcHurtTilt(P, src) {
  P.hurtTiltAt = performance.now() / 1000;
  if (!src) { P.hurtDir = Math.random() < 0.5 ? 0 : 180; return; }
  const f = lookDir(); f.y = 0; if (f.lengthSq() < 1e-6) f.set(0, 0, -1); f.normalize();
  const dx = src.x - P.pos.x, dz = src.z - P.pos.z; const left = { x: f.z, z: -f.x };
  const rel = Math.atan2(dx * left.x + dz * left.z, dx * f.x + dz * f.z) * 180 / Math.PI; P.hurtDir = 90 - rel;
}
function mcCameraFx(P, dt) {
  // bob eases toward the ground speed per tick
  const per = P.onGround && !P.dead && !P.swimming && !P.flying ? Math.min(0.1, Math.hypot(P.vel.x, P.vel.z) / 20) : 0;
  MCCAM.bob += (per - MCCAM.bob) * (1 - Math.pow(0.6, dt * 20));
  const ph = -(S.bob || 0), b = MCCAM.bob, D = Math.PI / 180;
  const roll = Math.sin(ph) * b * 3 * D, nod = Math.abs(Math.cos(ph - 0.2) * b) * 5 * D;
  const tx = Math.sin(ph) * b * 0.5, ty = -Math.abs(Math.cos(ph) * b);
  // hurt tilt: 10 ticks of hurt time
  let tilt = 0; const ht = (performance.now() / 1000 - (P.hurtTiltAt || -9)) / 0.5;
  if (ht >= 0 && ht < 1 && !P.dead) { const h = 1 - ht; tilt = -Math.sin(h * h * h * h * Math.PI) * 14 * D; }
  if (!b && !tilt) return;
  // the effects sit between the camera and the projection: camera = camera * (hurt * bobTranslate * bobRoll * bobNod)^-1
  const q = MCCAM.q.copy(camera.quaternion);
  const R = MCCAM.qa.setFromAxisAngle(MCCAM.Z, roll).multiply(MCCAM.qb.setFromAxisAngle(MCCAM.X, nod)); const Ri = R.clone().invert();
  camera.position.add(MCCAM.v.set(-tx, -ty, 0).applyQuaternion(Ri).applyQuaternion(q));
  q.multiply(Ri);
  if (tilt) { const rr = (P.hurtDir || 0) * D; const H = new THREE.Quaternion().setFromAxisAngle(MCCAM.Y, -rr).multiply(new THREE.Quaternion().setFromAxisAngle(MCCAM.Z, tilt)).multiply(new THREE.Quaternion().setFromAxisAngle(MCCAM.Y, rr)); q.multiply(H.invert()); }
  camera.quaternion.copy(q);
}

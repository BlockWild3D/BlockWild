// ================= FIRST PERSON, CLOSER TO MINECRAFT =================
// - The attack swing is Minecraft's own (ItemInHandRenderer): the item sweeps in towards the middle of the screen,
//   tipping forward and down, and stays in view. The old per-tool swings dropped under the hotbar.
// - After a hit the item sinks and comes back up as the attack recharges, and it dips when you change slots.
// - Held items are a little smaller. The off-hand shield sits low in the corner; blocking brings it up and across
//   the lower left of the screen, tilted, and it jolts back when it takes a hit.
const FP = { lastKey: '', equip: 0 };
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _ax = { x: new V3(1, 0, 0), y: new V3(0, 1, 0), z: new V3(0, 0, 1) };
function fpFinal(dt) {
  const P = player; const h = P.held(); const id = h ? h.id : 0; const kind = typeof swingKind === 'function' ? swingKind(id) : 'item';
  const bobv = P.onGround ? Math.hypot(P.vel.x, P.vel.z) : 0; const D = Math.PI / 180;
  // changing what you hold: it comes up from below
  const key = P.sel + ':' + id; if (key !== FP.lastKey) { FP.lastKey = key; FP.equip = 1; } FP.equip = Math.max(0, FP.equip - dt * 5);
  const flat = id && id !== IT.shield && !isCubeItem(id);
  handGroup.scale.setScalar(flat ? 0.9 : 1);
  const busy = P.blocking || S.bowDraw >= 0 || (S.charge && heldSpear()) || S.eatT > 0 || (S.tridPose || 0) > 0.05 || S.jabT > 0;
  if (id !== IT.shield && kind !== 'thrust' && S.swing > 0 && !busy) {
    const f = 1 - S.swing, sq = Math.sqrt(f), g = Math.sin(sq * Math.PI);
    handGroup.position.set(0.5 + Math.cos(S.bob || 0) * 0.012 * bobv / 4 - (S.lagX || 0) * 0.3 - 0.36 * g, -0.44 + 0.2 * g + Math.abs(Math.sin(S.bob || 0)) * 0.02 * bobv / 4 - (S.lagY || 0) * 0.3 + 0.2 * Math.sin(sq * Math.PI * 2), -0.72 - 0.2 * Math.sin(f * Math.PI));
    const q = handGroup.quaternion; q.setFromAxisAngle(_ax.y, (45 - 20 * Math.sin(f * f * Math.PI)) * D);
    q.multiply(_qa.setFromAxisAngle(_ax.z, -20 * g * D)).multiply(_qa.setFromAxisAngle(_ax.x, -52 * g * D)).multiply(_qa.setFromAxisAngle(_ax.y, -45 * D));
    q.premultiply(_qb.setFromEuler(new THREE.Euler(S.lagY || 0, S.lagX || 0, 0)));
  } else if (id !== IT.shield && !busy) { handGroup.position.x += 0.02; handGroup.position.y -= 0.02; handGroup.position.z -= 0.02; }
  // recharge dip and equip dip
  if (id !== IT.shield) { let c = 1; try { c = (h && ITEMS[id] && (ITEMS[id].kind === 'tool' || ITEMS[id].melee)) ? attackCharge() : 1; } catch (e) { }
    const e2 = FP.equip * FP.equip; handGroup.position.y -= 0.14 * (1 - c * c * c) * (S.swing > 0 ? 0 : 1) + 0.5 * e2; }
  // shields
  const bk = S.blockPose || 0, hit = Math.sin((S.shieldHit || 0) * Math.PI);
  const pose = (grp, mesh, sgn, k) => { const e = k * k * (3 - 2 * k); mesh.scale.setScalar(1.3);
    grp.position.set(sgn * (0.66 - 0.36 * e) + Math.cos(S.bob || 0) * 0.008 * bobv / 4, -0.7 + 0.34 * e + Math.abs(Math.sin(S.bob || 0)) * 0.015 * bobv / 4 - hit * 0.05, -0.95 + 0.12 * e + hit * 0.09);
    grp.rotation.set(0.06 + 0.1 * e - hit * 0.12 + (S.lagY || 0) * 0.5, sgn * -(0.5 - 0.32 * e) + (S.lagX || 0) * 0.5, sgn * -(0.1 + 0.12 * e)); };
  const mainShield = id === IT.shield;
  if (offMesh && offId === IT.shield) pose(offGroup, offMesh, -1, mainShield ? 0 : bk);
  if (mainShield && handMesh) { handGroup.scale.setScalar(1); pose(handGroup, handMesh, 1, bk); handGroup.position.y -= 0.5 * FP.equip * FP.equip; }
  // the other off-hand items are a little smaller too
  if (offMesh && offId !== IT.shield) offGroup.scale.setScalar(isCubeItem(offId) ? 1 : 0.9); else if (offMesh) offGroup.scale.setScalar(1);
}
{ const _uh = updateHand; updateHand = function (dt, light) { const r = _uh.apply(this, arguments); try { fpFinal(dt); } catch (e) { if (!FP.warned) { FP.warned = true; console.warn(e); } } return r; }; }

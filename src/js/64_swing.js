// ================= FIRST-PERSON SWINGS AND MINING SOUNDS =================
// Each kind of held thing has its own swing (progress p runs 0 -> 1 over Minecraft's 6-tick swing, 0.3 s):
//   fist: a straight punch          sword: a sideways slash        axe: a raised overhead chop
//   pickaxe: a short downward pick  shovel: a forward scoop       hoe: a downward pull back
//   mace: a heavy overhead slam     trident/spear: a thrust       anything else: Minecraft's own arm swing
// While you hold the button on a block the swing repeats, the block's hit sound plays every 4 ticks (Minecraft:
// volume 0.25, half pitch) with a few chips flying off, and it breaks with its break sound at pitch 0.8.
function swingKind(id) {
  if (!id) return 'fist'; const it = ITEMS[id]; if (!it) return 'item';
  if (it.key === 'mace') return 'mace'; if (it.kind === 'trident' || /_spear$/.test(it.key)) return 'thrust';
  if (it.kind === 'tool') return it.tool === 'sword' ? 'sword' : it.tool === 'axe' ? 'axe' : it.tool === 'pick' ? 'pick' : it.tool === 'shovel' ? 'shovel' : it.tool === 'hoe' ? 'hoe' : 'item';
  return 'item';
}
const ease = { out: (t) => 1 - (1 - t) * (1 - t), in: (t) => t * t, io: (t) => t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t) };
// windup until a, strike until b, then recover: returns [windup amount, strike amount] each 0..1
function phases(p, a, b) { if (p < a) return [ease.out(p / a), 0]; if (p < b) { const t = ease.in((p - a) / (b - a)); return [1 - t, t]; } return [0, 1 - ease.io((p - b) / (1 - b))]; }
const SWINGS = {
  // [dx, dy, dz, rx, ry, rz] offsets from the resting pose
  fist(p) { const [w, s] = phases(p, 0.15, 0.4); return [-0.12 * s + 0.04 * w, 0.06 * s - 0.03 * w, -0.32 * s + 0.08 * w, 0.15 * s, 0.25 * s, 0]; },
  sword(p) { const [w, s] = phases(p, 0.2, 0.5); return [0.12 * w - 0.38 * s, 0.08 * w - 0.06 * s, -0.12 * s, 0.25 * w - 0.35 * s, 0.7 * w - 1.1 * s, -0.5 * w + 0.6 * s]; },
  axe(p) { const [w, s] = phases(p, 0.3, 0.55); return [-0.04 * s, 0.22 * w - 0.2 * s, 0.1 * w - 0.2 * s, 0.9 * w - 1.25 * s, 0.1 * w + 0.2 * s, 0.15 * w]; },
  pick(p) { const [w, s] = phases(p, 0.22, 0.5); return [-0.06 * s, 0.14 * w - 0.16 * s, 0.05 * w - 0.16 * s, 0.6 * w - 1.0 * s, 0.25 * s, -0.25 * s]; },
  shovel(p) { const [w, s] = phases(p, 0.2, 0.5); return [-0.1 * s, -0.05 * w + 0.1 * s, 0.08 * w - 0.32 * s, -0.25 * w + 0.5 * s, 0.2 * s, 0]; },
  hoe(p) { const [w, s] = phases(p, 0.25, 0.5); return [-0.05 * s, 0.16 * w - 0.12 * s, -0.1 * w + 0.1 * s, 0.7 * w - 0.9 * s, 0.15 * s, 0]; },
  mace(p) { const [w, s] = phases(p, 0.38, 0.6); return [-0.08 * s, 0.3 * w - 0.26 * s, 0.14 * w - 0.22 * s, 1.15 * w - 1.45 * s, 0.25 * s, 0.2 * w - 0.1 * s]; },
  thrust(p) { const [w, s] = phases(p, 0.2, 0.45); return [-0.08 * s, 0.02 * s, 0.1 * w - 0.42 * s, 0, 0, 0]; },
  item(p) { // Minecraft's ItemInHandRenderer swing
    const sq = Math.sqrt(p); const f = Math.sin(p * p * Math.PI), f1 = Math.sin(sq * Math.PI);
    return [-0.4 * Math.sin(sq * Math.PI) * 0.5, 0.2 * Math.sin(sq * Math.PI * 2) * 0.5, -0.2 * Math.sin(p * Math.PI) * 0.5, -f1 * 80 * Math.PI / 180 * 0.7, -f * 20 * Math.PI / 180, -f1 * 20 * Math.PI / 180]; },
};
{ const _uh = updateHand; updateHand = function (dt, light) {
    // Minecraft's swing lasts 6 ticks: slow the base decay (4/s) to 1/0.3 s
    if (S.swing > 0) S.swing = Math.min(1, S.swing + dt * (4 - 1 / 0.3));
    const r = _uh.apply(this, arguments); const sw0 = Math.sin(S.swing * Math.PI); // the generic pose the base just applied
    const h = player.held(); const id = h ? h.id : 0; const kind = swingKind(id);
    if (S.swing > 0 && !(kind === 'thrust' && (S.jabT > 0 || S.tridPose > 0.05)) && !(player.blocking) && !(S.bowDraw >= 0)) {
      // undo the generic swing, then apply this item's own
      handGroup.position.x += sw0 * 0.15; handGroup.position.y += sw0 * 0.1; handGroup.position.z += sw0 * 0.12; handGroup.rotation.x += sw0 * 0.8; handGroup.rotation.y -= sw0 * 0.4;
      const o = SWINGS[kind](1 - S.swing);
      handGroup.position.x += o[0]; handGroup.position.y += o[1]; handGroup.position.z += o[2]; handGroup.rotation.x += o[3]; handGroup.rotation.y += o[4]; handGroup.rotation.z += o[5];
    }
    return r; }; }
// ---------- mining: repeating swings, hit sounds every 4 ticks, chips ----------
function hitSnd(id) { const s = BL[id] && BL[id].snd; return s === 'glass' ? 'stone' : s || 'stone'; }
{ const _ub = updateBoats; let digT = 0, digKey = ''; updateBoats = function (dt) { const r = _ub(dt);
    const mining = S.started && !S.paused && !S.uiOpen && mouseL && target && S.mineT > 0 && S.mineKey && !player.dead;
    if (mining) { if (S.mineKey !== digKey) { digKey = S.mineKey; digT = 0; }
      if (S.swing <= 0.02) S.swing = 1; // keep swinging while you dig
      digT -= dt; if (digT <= 0) { digT = 0.2; Sfx.play(hitSnd(target.id), 0.32, 0.5); Particles.blockBreak(target.x, target.y, target.z, target.id, 3); } }
    else { digKey = ''; digT = 0; }
    return r; }; }

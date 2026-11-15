// ================= TOOL SWINGS AND TOOL SOUNDS =================
// Keyframed first-person swings for the sword, axe, pickaxe, shovel and spear, each with its own timing, plus
// synthesized sounds: a swish at the strike, an impact when the swing lands on a mob, and a tool layer when it
// lands on a block while digging. All sounds are generated here (no recorded samples).
// Pose keys: [t, dx, dy, dz, rx, ry, rz], offsets from the resting hand pose; +rx raises the tool back,
// -rx brings it forward and down, -ry sweeps it to the left.
const TOOL_SWINGS = {
  sword: { dur: 0.3, strike: 0.24, keys: [
    [0, 0, 0, 0, 0, 0, 0],
    [0.2, 0.14, 0.12, 0.04, 0.3, 0.28, -0.5], // cocked up and to the right
    [0.27, 0.12, 0.1, 0.03, 0.26, 0.24, -0.44],
    [0.44, -0.42, -0.02, -0.12, -0.36, -0.4, 1.05], // slash across the screen to the lower left
    [0.6, -0.36, -0.06, -0.08, -0.3, -0.35, 0.9], // follow-through
    [1, 0, 0, 0, 0, 0, 0]] },
  axe: { dur: 0.42, strike: 0.42, keys: [
    [0, 0, 0, 0, 0, 0, 0],
    [0.28, 0.06, 0.22, 0.05, 0.86, 0.12, 0.2], // raised high behind
    [0.38, 0.06, 0.24, 0.06, 0.92, 0.12, 0.22], // a beat of weight at the top
    [0.53, -0.06, -0.15, -0.28, -1.14, 0.2, 0.04], // heavy chop
    [0.6, -0.05, -0.11, -0.25, -1.0, 0.2, 0.04], // bites in and rebounds a little
    [0.68, -0.05, -0.12, -0.26, -1.04, 0.2, 0.04],
    [1, 0, 0, 0, 0, 0, 0]] },
  pick: { dur: 0.32, strike: 0.3, keys: [
    [0, 0, 0, 0, 0, 0, 0],
    [0.22, 0.03, 0.17, 0.06, 0.78, -0.06, 0.12], // short lift
    [0.45, -0.07, -0.12, -0.2, -0.95, 0.26, -0.26], // peck down, rolling the head into the block
    [0.54, -0.05, -0.08, -0.16, -0.8, 0.22, -0.2], // ping off it
    [0.62, -0.06, -0.1, -0.17, -0.85, 0.23, -0.22],
    [1, 0, 0, 0, 0, 0, 0]] },
  shovel: { dur: 0.3, strike: 0.26, keys: [
    [0, 0, 0, 0, 0, 0, 0],
    [0.2, 0.03, -0.07, 0.11, -0.32, 0.05, 0.06], // draw back low
    [0.43, -0.11, -0.09, -0.36, 0.12, 0.2, -0.06], // drive the blade forward
    [0.66, -0.08, 0.11, -0.25, 0.62, 0.15, -0.12], // lift the scoop
    [1, 0, 0, 0, 0, 0, 0]] },
  spear: { dur: 0.32, strike: 0.2, keys: [
    [0, 0, 0, 0, 0, 0, 0],
    [0.18, 0.05, 0.02, 0.13, 0.06, 0, 0.12], // draw back
    [0.38, -0.15, 0.05, -0.52, -0.05, 0, -0.55], // thrust, twisting the shaft
    [0.52, -0.13, 0.04, -0.47, -0.04, 0, -0.48],
    [1, 0, 0, 0, 0, 0, 0]] },
};
// Catmull-Rom through the keys (clamped at the ends) so the motion has no corners
function toolPose(sw, p) {
  const K = sw.keys; let i = 0; while (i < K.length - 2 && p > K[i + 1][0]) i++;
  const a = K[Math.max(0, i - 1)], b = K[i], c = K[i + 1], d = K[Math.min(K.length - 1, i + 2)];
  const t = clamp((p - b[0]) / Math.max(1e-4, c[0] - b[0]), 0, 1), t2 = t * t, t3 = t2 * t; const o = [0, 0, 0, 0, 0, 0];
  for (let k = 1; k <= 6; k++) { const m1 = (c[k] - a[k]) * 0.5, m2 = (d[k] - b[k]) * 0.5; o[k - 1] = (2 * t3 - 3 * t2 + 1) * b[k] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * c[k] + (t3 - t2) * m2; }
  return o;
}
// which swing a held item uses ('' = keep the older swing)
function toolSwingKind(id) {
  const it = id && ITEMS[id]; if (!it || it.kind !== 'tool') return '';
  if (it.tool === 'spear') return 'spear'; return TOOL_SWINGS[it.tool] && it.tool !== 'spear' ? it.tool : '';
}
// metal ring of a tool's material: 0 = no ring (wood), otherwise the pitch factor
function toolRing(id) {
  const it = id && ITEMS[id]; const m = it && /^(wooden|stone|iron|golden|diamond|netherite|copper)_/.exec(it.key || ''); const k = m ? m[1] : 'iron';
  return { wooden: 0, stone: 0, copper: 0.88, iron: 1, golden: 1.18, diamond: 1.32, netherite: 0.8 }[k];
}
// The held item is seen from its back (HELD_ROT), which put the axe's blade on the side facing you. Turn the axe
// half a turn about its handle so the cutting edge faces forward, like Minecraft.
const AXE_GEO = new Map();
function axeHeldGeo(g) {
  let m = AXE_GEO.get(g); if (m) return m; m = g.clone(); const S = 0.5 / 16;
  const P = m.attributes.position, N = m.attributes.normal; // handle runs along y = x - 1px: rotate pi about it
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); P.setXYZ(i, y + S, x - S, -z); const nx = N.getX(i), ny = N.getY(i), nz = N.getZ(i); N.setXYZ(i, ny, nx, -nz); }
  P.needsUpdate = N.needsUpdate = true; AXE_GEO.set(g, m); return m;
}
for (const k of ['sword', 'axe', 'pick', 'shovel']) { const sw = TOOL_SWINGS[k]; SWINGS[k] = (p) => toolPose(sw, p); }
// ---------- per-tool timing and strike-moment sounds ----------
{ const _uh = updateHand; let lastP = 1, lastKind = '';
  updateHand = function (dt, light) {
    const h = player.held(); const id = h ? h.id : 0; const kind = toolSwingKind(id); const sw = TOOL_SWINGS[kind];
    // 64 leaves the swing at 0.3 s; stretch or squeeze it to this tool's length
    if (sw && kind !== 'spear' && S.swing > 0 && S.swing < 1) S.swing = clamp(S.swing + dt * (1 / 0.3 - 1 / sw.dur), 0, 1);
    if (kind === 'spear' && S.jabT > 0 && S.jabT < 1) S.jabT = clamp(S.jabT + dt * (5 - 1 / sw.dur), 0, 1);
    const r = _uh.apply(this, arguments);
    if (kind === 'axe' && handMesh && handMesh.userData.baseGeo && handMesh.geometry === handMesh.userData.baseGeo) handMesh.geometry = axeHeldGeo(handMesh.userData.baseGeo);
    if (!sw) { lastKind = ''; return r; }
    if (kind === 'spear') {
      // swap 25's plain push for the keyframed jab
      if (S.jabT > 0) { const j = Math.sin(S.jabT * Math.PI); handGroup.position.z += j * 0.38; handGroup.position.x += j * 0.12; handGroup.position.y -= j * 0.04;
        const o = toolPose(sw, 1 - S.jabT); handGroup.position.x += o[0]; handGroup.position.y += o[1]; handGroup.position.z += o[2]; handGroup.rotation.x += o[3]; handGroup.rotation.y += o[4]; handGroup.rotation.z += o[5]; }
      return r;
    }
    const p = S.swing > 0 ? 1 - S.swing : 1;
    if (kind === lastKind && lastP < sw.strike && p >= sw.strike && !player.blocking) {
      const mining = mouseL && target && S.mineT > 0 && !S.uiOpen;
      if (mining) { Sfx.play(hitSnd(target.id), 0.34, 0.5); Sfx.play('tdig_' + kind, 0.42, toolRing(id) || 0.001); }
      else if (G.simT - (S.toolHitAt ?? -9) > 0.45) Sfx.play('swish_' + kind, 0.5, 0.94 + Math.random() * 0.12);
    }
    lastP = p; lastKind = kind; return r;
  }; }
// ---------- digging: keep the arm swinging ----------
// the base mining code pins the swing at 0.6 (the hand froze mid-swing while you dug); let it run through and repeat
{ const _ui = updateInteraction; updateInteraction = function (dt) {
    const before = S.swing; const r = _ui.apply(this, arguments);
    if (mouseL && target && S.mineT > 0 && before < 0.6 && S.swing === 0.6) S.swing = before <= 0.02 ? 1 : before;
    return r;
  }; }
// ---------- impacts on mobs ----------
{ const _pm = playerMelee; playerMelee = function (m, tool) {
    const id = player.held() ? player.held().id : 0; const kind = toolSwingKind(id);
    const r = _pm.apply(this, arguments);
    if (kind && kind !== 'spear') { Sfx.play('swish_' + kind, 0.35, 1.05); setTimeout(() => Sfx.play('thit_' + kind, 0.65, toolRing(id) || 0.001), kind === 'axe' ? 40 : 15); S.toolHitAt = G.simT; }
    return r;
  }; }
// ---------- spear: its own whoosh and stab ----------
{ const _sj = spearJab; spearJab = function (sp, eye, dir) {
    const hit = spearRay(eye, dir); const lands = hit && hit.dist >= SPEAR.min - SPEAR.pad; const id = player.held() ? player.held().id : 0;
    const _p = Sfx.play; Sfx.play = function (n) { if (n === 'bow') return; return _p.apply(this, arguments); };
    try { _sj.apply(this, arguments); } finally { Sfx.play = _p; }
    Sfx.play('swish_spear', 0.5, 0.95 + Math.random() * 0.1);
    if (lands) setTimeout(() => Sfx.play('thit_spear', 0.65, toolRing(id) || 0.001), 45);
  }; }
// ---------- the sounds ----------
{ const _play = Sfx.play;
  Sfx.play = function (name, v = 1, rate) {
    if (!this.ctx || v < 0.02 || typeof name !== 'string' || !/^(swish|thit|tdig)_/.test(name)) return _play.apply(this, arguments);
    const c = this.ctx, t0 = c.currentTime, out = this.out || c.destination, V = this.vol;
    // band of noise whose centre sweeps from f0 to f1: the air rushing past the blade
    const sweep = (dur, f0, f1, vol, q, delay = 0) => { const t = t0 + delay; const s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = 0.9 + Math.random() * 0.2;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.55); f.frequency.exponentialRampToValueAtTime(f0 * 0.8, t + dur);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * V), t + dur * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random()); s.stop(t + dur + 0.05); };
    // short percussive noise burst through a filter
    const burst = (dur, freq, vol, type = 'lowpass', q = 1, delay = 0) => { const t = t0 + delay; const s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = 0.8 + Math.random() * 0.4;
      const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * V), t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random()); s.stop(t + dur + 0.05); };
    // body thump: a falling sine
    const thump = (f0, f1, dur, vol, type = 'sine', delay = 0) => { const t = t0 + delay; const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * V), t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05); };
    // metal ring: a few inharmonic partials that die away
    const ring = (f, dur, vol, delay = 0) => { [[1, 1], [2.76, 0.45], [5.4, 0.22], [8.9, 0.1]].forEach(([m, a]) => thump(f * m, f * m * 0.995, dur / Math.sqrt(m), vol * a, 'sine', delay)); };
    const rt = rate || 1; const metal = rate && rate > 0.01 ? rate : 0;
    switch (name) {
      case 'swish_sword': sweep(0.2, 900 * rt, 4200 * rt, 0.55 * v, 1.6); sweep(0.16, 2400 * rt, 6200 * rt, 0.18 * v, 3, 0.02); return;
      case 'swish_axe': sweep(0.3, 380 * rt, 1500 * rt, 0.75 * v, 1.1); sweep(0.22, 160 * rt, 420 * rt, 0.35 * v, 0.8, 0.04); return;
      case 'swish_pick': sweep(0.17, 700 * rt, 2600 * rt, 0.5 * v, 1.4); return;
      case 'swish_shovel': sweep(0.2, 500 * rt, 1900 * rt, 0.5 * v, 1.0); return;
      case 'swish_spear': sweep(0.13, 1500 * rt, 4600 * rt, 0.6 * v, 2.6); sweep(0.1, 600, 1300, 0.2 * v, 1, 0.01); return;
      // landing on a mob
      case 'thit_sword': burst(0.09, 3800, 0.55 * v, 'highpass'); thump(180, 80, 0.12, 0.35 * v); if (metal) ring(1900 * metal, 0.28, 0.06 * v, 0.005); return;
      case 'thit_axe': thump(130, 48, 0.2, 0.6 * v); burst(0.14, 700, 0.75 * v, 'lowpass'); burst(0.07, 2200, 0.25 * v, 'bandpass', 2, 0.01); if (metal) ring(620 * metal, 0.22, 0.05 * v, 0.008); return;
      case 'thit_pick': thump(170, 70, 0.13, 0.45 * v); burst(0.06, 1600, 0.4 * v, 'bandpass', 2); if (metal) ring(1500 * metal, 0.24, 0.07 * v); return;
      case 'thit_shovel': thump(150, 70, 0.14, 0.45 * v); if (metal) { thump(520 * metal, 500 * metal, 0.2, 0.1 * v, 'triangle'); thump(790 * metal, 760 * metal, 0.16, 0.06 * v, 'triangle'); } else burst(0.1, 900, 0.5 * v, 'lowpass'); return;
      case 'thit_spear': burst(0.07, 1100, 0.6 * v, 'bandpass', 1.5); thump(210, 85, 0.13, 0.4 * v); if (metal) ring(2300 * metal, 0.18, 0.05 * v, 0.01); return;
      // the tool's own layer on top of the block's hit sound while digging
      case 'tdig_pick': if (metal) ring(2100 * metal, 0.14, 0.06 * v); else burst(0.05, 2400, 0.3 * v, 'bandpass', 3); burst(0.05, 3000, 0.22 * v, 'highpass'); return;
      case 'tdig_axe': thump(190, 110, 0.09, 0.32 * v, 'triangle'); burst(0.08, 520, 0.55 * v, 'lowpass'); return;
      case 'tdig_shovel': burst(0.12, 900, 0.45 * v, 'lowpass'); burst(0.08, 2600, 0.15 * v, 'bandpass', 1, 0.03); return;
      case 'tdig_sword': burst(0.06, 3600, 0.25 * v, 'highpass'); return;
    }
  }; }

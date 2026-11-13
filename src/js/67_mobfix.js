// ================= MOB MODEL FIXES =================
// Guardians: a big single eye that sticks out of the front, 12 long spikes on the edges that pull in while the
// guardian swims (Minecraft's spikes retract when it moves), and a three-part tail that sways.
// Squids: Minecraft's proportions (a tall body and eight tentacles longer than the body), with eyes on the sides.
guardianModel = function (m, r, s, k) {
  const elder = k === 'egd'; const GB = elder ? [206, 204, 190] : GUARD, GD = elder ? [168, 166, 158] : [72, 112, 100], GL = elder ? [228, 226, 214] : [150, 196, 176], GT = elder ? [218, 216, 204] : [120, 170, 152], GF = elder ? [176, 178, 206] : [86, 128, 116], GS = elder ? [150, 152, 186] : GUARD2;
  const body = pivot(r, 0, 0.45 * s, 0); m.gbody = body;
  sbox(m, body, 0.75 * s, 0.75 * s, 0.85 * s, 0, 0, 0, k + '_body2', fur(GB, 7, { speck: [GD, 0.22], topc: GT, extra: (f, set, fw, fh) => {
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if ((x + y * 2) % 7 === 0) set(x, y, GL); // pale scale lines
    if (f === 'front') for (let y = 1; y < fh - 1; y++) for (let x = 1; x < fw - 1; x++) if (Math.abs(x - fw / 2 + 0.5) + Math.abs(y - fh / 2 + 0.5) < fw * 0.36) set(x, y, GF); } }));
  // the eye: a white eyeball with an orange-brown pupil, standing out from the front
  m.geye = sbox(m, body, 0.26 * s, 0.26 * s, 0.08 * s, 0, 0, 0.44 * s, k + '_eye', (f, set, fw, fh) => { for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) set(x, y, [236, 228, 218]); if (f === 'front') { const c = fw >> 1; for (let y = c - 1; y <= c; y++) for (let x = c - 1; x <= c; x++) set(x, y, [150, 64, 30]); set(c - 1, c - 1, [210, 120, 70]); } });
  m.spikes = [];
  const up = new V3(0, 1, 0);
  for (const [x, y, z] of [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [0, 1, 1], [0, 1, -1], [0, -1, 1], [0, -1, -1], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1]]) {
    const d = new V3(x, y, z).normalize(); const p = pivot(body, x * 0.37 * s, y * 0.37 * s, z * 0.42 * s); p.quaternion.setFromUnitVectors(up, d);
    sbox(m, p, 0.09 * s, 0.42 * s, 0.09 * s, 0, 0.12 * s, 0, k + '_spike2', fur(elder ? [236, 232, 220] : [238, 222, 196], 3, { topRows: [3, GS] })); m.spikes.push(p); }
  m.tail = pivot(body, 0, 0, -0.42 * s); let prev = m.tail; m.tailParts = [];
  for (let i = 0; i < 3; i++) { const seg = pivot(prev, 0, 0, i ? -0.3 * s * (1 - (i - 1) * 0.2) : 0); const w = 0.26 * s * (1 - i * 0.25);
    sbox(m, seg, w, w, 0.32 * s * (1 - i * 0.15), 0, 0, -0.16 * s, k + '_tail2' + i, fur(i === 2 ? GS : GB, 5, { speck: [GD, 0.2] })); m.tailParts.push(seg); prev = seg; }
  sbox(m, prev, 0.04 * s, 0.3 * s, 0.24 * s, 0, 0, -0.42 * s, k + '_fin', fur(GS, 3));
};
for (const k of ['guardian', 'elder_guardian']) { const prev = MOBS[k].tick; MOBS[k].tick = function (m, dt) {
  const r = prev ? prev(m, dt) : false;
  if (m.spikes && m.spikes.length) { const moving = Math.hypot(m.vel.x, m.vel.y, m.vel.z) > 0.4; m.spikeOut = (m.spikeOut == null ? 1 : m.spikeOut) + ((moving ? 0.35 : 1) - (m.spikeOut == null ? 1 : m.spikeOut)) * Math.min(1, dt * 4);
    for (const p of m.spikes) p.scale.set(1, m.spikeOut, 1); }
  if (m.tailParts) { const t = (m.age || 0) * 4; m.tailParts.forEach((p, i) => { p.rotation.y = Math.sin(t - i * 0.8) * 0.35 * (i + 1) * 0.6; }); }
  return r; }; }
// squids
MOBS.squid.build = function (m, r, glow) {
  const C = glow ? [36, 150, 150] : [40, 66, 92], D = glow ? [110, 232, 220] : [74, 104, 134], G = glow ? 'g' : '', o = glow ? { glowAll: true } : {};
  m.body = sbox(m, r, 0.75, 0.95, 0.75, 0, 0.98, 0, G + 'sq_body2', fur(C, 7, { speck: [D, 0.22], extra: (f, set, fw, fh) => {
    if (f === 'left' || f === 'right') { const y = Math.round(fh * 0.72); set((fw >> 1) - 1, y, [240, 240, 236]); set(fw >> 1, y, [240, 240, 236]); set(fw >> 1, y, [20, 26, 34]); set((fw >> 1) - 1, y + 1, glow ? [150, 255, 240] : [110, 140, 170]); }
    if (f === 'bottom') { const c = fw >> 1; set(c, c, [20, 20, 26]); set(c - 1, c, [20, 20, 26]); } } }), o);
  m.tent = []; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const p = pivot(r, Math.cos(a) * 0.26, 0.52, Math.sin(a) * 0.26);
    sbox(m, p, 0.11, 0.95, 0.11, 0, -0.47, 0, G + 'sq_tent2', fur(D, 4, { speck: [C, 0.3] }), o); m.tent.push(p); }
};
MOBS.glow_squid.build = function (m, r) { MOBS.squid.build(m, r, true); };
MOBS.elder_guardian.build = function (m, r) { guardianModel(m, r, 2.35, 'egd'); };

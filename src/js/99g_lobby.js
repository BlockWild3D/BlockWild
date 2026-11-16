// ================= SPEAR IN THIRD PERSON =================
// Other players (and you in F5) now show the spear properly: a jab draws the arm back and thrusts the spear out
// level along where you look; a charge couches it at the hip pointing forward, it sags and shakes when tired and
// drops when disengaged. Before, a jab showed nothing at all to others and the charge wasn't sent.
function spearPoseTP(M, dt, pitch) {
  const mesh = M.mainMesh; if (!mesh) return; const st = M.spearState; const it = M.mainId && ITEMS[M.mainId];
  if (!st || !it || !/_spear$/.test(it.key)) { if (M._spOn) { mesh.rotation.x = 0; M._spOn = false; M._spK = 0; } return; }
  const P = M.P, B = M.body; M._spOn = true; const pc = clamp(pitch || 0, -0.8, 0.8);
  const want = st.stage && st.stage !== 'done' ? 1 : 0; M._spK = (M._spK || 0) + (want - (M._spK || 0)) * Math.min(1, dt * 10); const k = M._spK;
  let armX = P.armR.rotation.x, tilt = 0, twist = 0, pz = 0;
  if (k > 0.01) { const tired = st.stage === 'tired', dis = st.stage === 'disengaged', raise = st.stage === 'raise'; const shake = tired ? Math.sin(performance.now() / 1000 * 38) * 0.05 : 0;
    const ax = raise ? 0.2 : 0.5; armX = armX * (1 - k) + ax * k; twist = -0.3 * k; pz = -1.5 * k;
    tilt = (-ax + (dis ? 0.8 : tired ? 0.3 + shake : 0) - pc * (dis ? 0.2 : 0.85)) * k; }
  const j = st.jab || 0;
  if (j > 0) { const f = 1 - j; const w = f < 0.3 ? f / 0.3 : f < 0.5 ? 1 - (f - 0.3) / 0.2 : 0; let s = f < 0.3 ? 0 : f < 0.5 ? (f - 0.3) / 0.2 : f < 0.7 ? 1 : 1 - (f - 0.7) / 0.3; s = s * s * (3 - 2 * s); const kk = Math.min(1, w + s);
    armX = armX * (1 - kk) + 0.7 * w - 1.35 * s; twist += -0.35 * w + 0.3 * s; pz = pz * (1 - kk) - 2 * w + 5 * s; tilt = tilt * (1 - kk) + (-armX - pc * 0.85) * kk; }
  P.armR.rotation.x = armX; P.armR.position.z = pz * PX; mesh.rotation.x = tilt; B.rotation.y += twist;
}
{ const _mk = makePlayerModel; makePlayerModel = function (skin, name) { const M = _mk(skin, name); const an = M.animate;
    M.animate = function (dt, sp, pitch, swing, sneak, hurt, o) { const r = an.call(this, dt, sp, pitch, swing, sneak, hurt, o); try { spearPoseTP(this, dt, pitch); } catch (e) { } return r; }; return M; }; }
{ const _ap = applyPov; applyPov = function (P, dt) { if (typeof myModel !== 'undefined' && myModel) myModel.spearState = heldSpear() ? { stage: S.charge ? S.charge.stage : null, jab: S.jabT } : null; return _ap.apply(this, arguments); }; }
const SP_STAGES = [null, 'engaged', 'tired', 'disengaged', 'raise'];
{ const _ms = myState; myState = function () { const s = _ms.apply(this, arguments); if (heldSpear()) { const i = S.charge ? SP_STAGES.indexOf(S.charge.stage) : 0; if (i > 0) s.sp = i; if (S.jabT > 0.5) s.jab = 1; } return s; }; }
{ const _on = onPeerMsg; onPeerMsg = function (peer, m) {
    if (m.t === 'p') { const av = MP.avatars.get(MP.role === 'host' ? peer.id : m.id); if (av) { av.sp = m.sp || 0; if (m.jab && !(av.jabT > 0.4)) av.jabT = 1; } }
    if (m.t === 'arena') return arenaMsgIn(peer, m);
    return _on(peer, m); }; }
{ const _ua = updateAvatars; updateAvatars = function (dt) { for (const av of MP.avatars.values()) { av.jabT = Math.max(0, (av.jabT || 0) - dt * 3.1); if (av.model) av.model.spearState = { stage: SP_STAGES[av.sp || 0], jab: av.jabT }; } return _ua.apply(this, arguments); }; }

// ================= PVP ARENA LOBBY =================
// Before a match everyone waits in their cage with the lobby open: invite friends (the host gets a code to share), each
// player picks a kit and sees what the others picked, then the host presses Start. 3, 2, 1, the cages open. When you
// die you watch as a spectator; when one player is left the round ends, the arena is rebuilt and everyone is back in
// the lobby. Friends who join mid-round watch until it ends. Alone, Start gives you a practice round.
AR.live = false; AR.roster = new Map(); AR.outs = new Set(); AR.parts = new Set(); AR.endT = 0;
function arenaMe() { return typeof MP !== 'undefined' && MP.active ? MP.myId : 'host'; }
function arenaHost() { return !(typeof MP !== 'undefined' && MP.active) || MP.role === 'host'; }
function arenaSend(m) { if (!(typeof MP !== 'undefined' && MP.active)) return; m.t = 'arena'; m.id = arenaMe(); m.name = myName(); if (MP.role === 'host') mpSendAll(m); else mpToHost(m); }
function arenaMsgIn(peer, m) {
  if (!S.rules.arena) return;
  if (MP.role === 'host') { m.id = peer.id; // never trust the sender's own id; start and end only ever come from the host
    if (m.a === 'kit' || m.a === 'hello') { AR.roster.set(m.id, { name: String(m.name || '?').slice(0, 16), kit: m.k == null ? null : m.k | 0 }); mpSendAll({ t: 'arena', a: 'kit', id: m.id, name: m.name, k: m.k }, false, peer.id);
      if (m.a === 'hello') peer.link.send({ t: 'arena', a: 'roster', list: [...AR.roster].map(([id, r]) => [id, r.name, r.kit]), live: AR.live, outs: [...AR.outs] }); }
    else if (m.a === 'out') { AR.outs.add(m.id); mpSendAll({ t: 'arena', a: 'out', id: m.id }, false, peer.id); arenaCheckEnd(); }
    renderLobby(); return; }
  if (!peer || peer.id !== 'host') return;
  if (m.a === 'kit') AR.roster.set(m.id, { name: m.name, kit: m.k == null ? null : m.k });
  else if (m.a === 'gone') AR.roster.delete(m.id);
  else if (m.a === 'out') AR.outs.add(m.id);
  else if (m.a === 'roster') { AR.roster = new Map(m.list.map(([id, name, kit]) => [id, { name, kit }])); AR.outs = new Set(m.outs || []); AR.live = !!m.live; if (m.live && S.arena && S.arena.phase === 'cage') arenaSpectate('A round is being played. You are in the next one'); }
  else if (m.a === 'start') arenaBegin();
  else if (m.a === 'end') arenaEnd(m.winner);
  renderLobby();
}
// a friend leaving counts as out
{ const _ra = removeAvatar; removeAvatar = function (id) { const r = _ra.apply(this, arguments); if (S.rules && S.rules.arena && typeof MP !== 'undefined' && MP.role === 'host' && AR.roster.has(id)) { AR.roster.delete(id); mpSendAll({ t: 'arena', a: 'gone', id }); arenaCheckEnd(); renderLobby(); } return r; }; }
{ const _ec = enterCage; enterCage = function () { const A = S.arena; if (!A) return; const keep = A.kit; if (S.mode === 'spectator') setMode('survival');
    _ec.apply(this, arguments); A.kit = typeof keep === 'number' ? keep : null; AR.roster.set(arenaMe(), { name: myName(), kit: A.kit }); renderLobby(); }; }
{ const _fl = finishLoading; finishLoading = function () { if (S.rules.arena) { AR.live = false; AR.roster = new Map(); AR.outs = new Set(); AR.endT = 0; } const r = _fl.apply(this, arguments);
    if (S.rules.arena && typeof MP !== 'undefined' && MP.role === 'client') arenaSend({ a: 'hello', k: S.arena ? S.arena.kit : null }); return r; }; }
pickKit = function (i) { const A = S.arena; if (!KITS[i] || !A || A.phase !== 'cage') return; A.kit = i; AR.roster.set(arenaMe(), { name: myName(), kit: i }); arenaSend({ a: 'kit', k: i }); Sfx.play('click', 0.6); renderLobby(); };
function arenaStart() { // host, or alone
  if (!arenaHost() || AR.live || !S.arena || S.arena.phase !== 'cage') return;
  AR.outs = new Set(); AR.parts = new Set(AR.roster.keys()); arenaSend({ a: 'start' }); arenaBegin(); }
function arenaBegin() {
  const A = S.arena; AR.live = true; AR.outs = new Set(); AR.endT = 0; if (!A || A.phase !== 'cage') return;
  const kt = KITS[A.kit == null ? 0 : A.kit] || KITS[0]; giveKit(kt); A.phase = 'count'; A.t = 3; closeKitPicker(); arenaMsg('3', 0.9); Sfx.play('click', 0.6); chatPrint('Kit: ' + kt.name, '#ff5'); }
function arenaCheckEnd() {
  if (!AR.live || !arenaHost()) return; const alive = [...AR.parts].filter(id => AR.roster.has(id) && !AR.outs.has(id));
  if (alive.length > (AR.parts.size > 1 ? 1 : 0)) return;
  const w = alive.length ? AR.roster.get(alive[0]).name : null; arenaSend({ a: 'end', winner: w }); arenaEnd(w);
  try { arenaReset(); } catch (e) { console.warn(e); } }
function arenaEnd(winner) { AR.live = false; AR.endT = 3; arenaMsg(winner ? winner + ' wins!' : 'Round over', 3); if (winner) chatPrint(winner + ' won the round', '#ff5'); Sfx.play('levelup', 0.7); renderLobby(); }
function arenaSpectate(why) { const A = S.arena; if (!A) return; if (A.spot && A.built) cageBlocks(A.spot[0], A.spot[1], 0); A.phase = 'out'; closeKitPicker(); setMode('spectator'); player.pos.set(0.5, AR.Y + 14, 0.5); player.vel.set(0, 0, 0); world.lastCenter = null; toast(why || 'You are out. Watching until the round ends', 4); }
{ const _die = Player.prototype.die; Player.prototype.die = function () { const r = _die.apply(this, arguments);
    if (this === player && this.dead && S.rules.arena && AR.live && !AR.outs.has(arenaMe())) { AR.outs.add(arenaMe()); arenaSend({ a: 'out' }); arenaCheckEnd(); } return r; }; }
{ const _at = arenaTick; arenaTick = function (dt) {
    const A = S.arena; if (!S.rules.arena || !A || !S.started || S.loading) return;
    if (AR.endT > 0) { AR.endT -= dt; if (AR.endT <= 0 && !player.dead && A.phase !== 'cage') enterCage(); }
    if (A.phase === 'out') return;
    if (A.phase === 'dead' && !player.dead && AR.live) { arenaSpectate(); return; }
    return _at.apply(this, arguments); }; }
// ---- the lobby panel (built on the kit picker) ----
function renderLobby() {
  const el = $('kitPick'); if (!el || !S.arena) return; const bar = $('lobbyBar'); if (!bar) return; const A = S.arena; const host = arenaHost(), mp = typeof MP !== 'undefined' && MP.active;
  el.querySelectorAll('#kitGrid button').forEach(b => { b.style.outline = +b.dataset.i === A.kit ? '3px solid #6f6' : 'none'; });
  const esc = (t) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  $('lobbyPlayers').innerHTML = [...AR.roster].map(([id, r]) => '<span style="background:#2a2a2a;border:2px solid #1c1c1c;padding:4px 10px;color:' + (r.kit == null ? '#bbb' : '#fff') + '">' + esc(r.name) + (id === 'host' && mp ? ' (host)' : '') + ': <b>' + (r.kit == null || !KITS[r.kit] ? 'choosing...' : KITS[r.kit].name) + '</b></span>').join('');
  const code = mp && MP.code ? MP.code : null;
  $('lobbyInvite').style.display = host ? '' : 'none'; $('lobbyInvite').textContent = code ? 'Copy invite code' : (AR.inviting ? 'Opening...' : 'Invite friends');
  $('lobbyCode').textContent = code ? 'Invite code: ' + code + '  (friends: Multiplayer, then enter it)' : !host ? 'Waiting for the host to start the match' : '';
  const st = $('lobbyStart'); st.style.display = host ? '' : 'none'; st.textContent = AR.roster.size > 1 ? 'Start match (' + AR.roster.size + ' players)' : 'Start practice round';
}
{ const _ok = openKitPicker; openKitPicker = function () {
    const r = _ok.apply(this, arguments); const el = $('kitPick');
    if (el && !$('lobbyBar')) { el.children[0].textContent = 'PvP Arena lobby'; el.children[1].textContent = 'Pick a kit (click, or 1 to 9). The host starts the match. Esc hides this, K brings it back.';
      const bar = document.createElement('div'); bar.id = 'lobbyBar'; bar.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px';
      const bs = 'background:#3b3b3b;border:3px solid #1c1c1c;box-shadow:inset 2px 2px 0 #6a6a6a,inset -2px -2px 0 #262626;color:#fff;padding:8px 16px;cursor:pointer;font-family:inherit;font-size:16px';
      bar.innerHTML = '<div id="lobbyPlayers" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;font-size:14px"></div><div style="display:flex;gap:10px;align-items:center"><button id="lobbyInvite" style="' + bs + '"></button><button id="lobbyStart" style="' + bs + ';background:#3f7a2c"></button></div><div id="lobbyCode" style="color:#ff5;font-size:15px;min-height:18px"></div>';
      el.insertBefore(bar, $('kitGrid'));
      $('lobbyInvite').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation();
        if (typeof MP !== 'undefined' && MP.active && MP.code) { try { navigator.clipboard.writeText(MP.code); toast('Invite code copied', 1.5); } catch (err) { } return; }
        if (AR.inviting) return; AR.inviting = true; renderLobby(); Promise.resolve(openToFriends()).catch(() => { }).then(() => { AR.inviting = false; renderLobby(); }); });
      $('lobbyStart').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); arenaStart(); }); }
    renderLobby(); return r; }; }
setInterval(() => { if (S.uiOpen === 'kit') renderLobby(); }, 500);
addEventListener('keydown', (e) => { if (S.uiOpen === 'kit' && e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); arenaStart(); } }, true);

// ================= A LONG SPEAR IN THE HAND =================
// Held spears (first person, F5 and on other players) are drawn about two and a half times as long as the icon: the
// shaft carries on behind the hand and the head sits further out. Dropped and inventory spears keep the icon.
const SPEAR_LONG = new Map(); const SPEAR_EXT = 10;
function spearLongGeo(id) {
  let g = SPEAR_LONG.get(id); if (g) return g; const cv = ICON_CANVAS[id]; const d = cv.getContext('2d').getImageData(0, 0, 16, 16).data;
  const px = new Map(); const at = (x, y) => { const k = (y * 16 + x) * 4; return x >= 0 && y >= 0 && x < 16 && y < 16 && d[k + 3] > 80 ? [d[k] / 255, d[k + 1] / 255, d[k + 2] / 255] : null; };
  const E = SPEAR_EXT;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const c = at(x, y); if (c && x >= 8) px.set((x + E) + ',' + (y - E), c); } // collar and head, moved out
  for (let i = -E; i <= 8 + E; i++) { const s = clamp(i, 1, 6); for (const o of [1, 2]) { const c = at(o + s, 14 - s) || at(1 + s, 14 - s); if (c && !px.has((o + i) + ',' + (14 - i))) px.set((o + i) + ',' + (14 - i), c); } } // the shaft, through the gap and out behind
  const S = 0.5 / 16, T = S * 1.1; const pos = [], nor = [], col = []; const op = (x, y) => px.has(x + ',' + y);
  const quad = (a, b, c, e, n, rgb, sh) => { for (const v of [a, b, c, a, c, e]) { pos.push(v[0], v[1], v[2]); nor.push(n[0], n[1], n[2]); col.push(rgb[0] * sh, rgb[1] * sh, rgb[2] * sh); } };
  for (const [k, rgb] of px) { const [x, y] = k.split(',').map(Number); const x0 = (x - 8) * S, x1 = x0 + S, y1 = (8 - y) * S, y0 = y1 - S, z0 = -T / 2, z1 = T / 2;
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], rgb, 1); quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], rgb, 0.8);
    if (!op(x - 1, y)) quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], rgb, 0.7); if (!op(x + 1, y)) quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], rgb, 0.7);
    if (!op(x, y - 1)) quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], rgb, 0.9); if (!op(x, y + 1)) quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], rgb, 0.6); }
  g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  SPEAR_LONG.set(id, g); return g;
}
const isSpearId = (id) => !!(id && ITEMS[id] && ITEMS[id].kind === 'tool' && ITEMS[id].tool === 'spear');
{ const _uh = updateHand; updateHand = function (dt, light) { const r = _uh.apply(this, arguments); const h = player.held();
    if (h && isSpearId(h.id) && handMesh && handMesh.userData.baseGeo && handMesh.geometry === handMesh.userData.baseGeo) handMesh.geometry = spearLongGeo(h.id); return r; }; }
{ const _tm = tpItemMesh; tpItemMesh = function (id, left) { const g = _tm.apply(this, arguments); if (isSpearId(id)) g.traverse(o => { if (o.isMesh && o.userData.baseGeo) o.geometry = spearLongGeo(id); }); return g; }; }

// ================= THE MACE AND WIND CHARGES AGAINST PLAYERS =================
// A mace smash on another player now gets its fall bonus (it was only counted against mobs), with the shockwave and
// Wind Burst. Wind charges throw other players too, and launch you higher: one at your feet is worth about 8 blocks.
var WIND_UP = 1.37;
{ const _mh = meleeHit; meleeHit = function (tool, mob) {
    if (!mob && typeof MP !== 'undefined' && MP.active) { const hit = avatarRay(player.eye(), lookDir(), S.mode === 'creative' ? 5 : 3); if (hit) mob = { type: 'player', isAvatar: true, pos: hit.av.pos, vel: new V3(), h: 1.8, hw: 0.3, hp: 20 }; }
    return _mh.call(this, tool, mob); }; }
{ const _wb = windBurst; windBurst = function (p, power, src) { const r = _wb.apply(this, arguments);
    if (typeof MP !== 'undefined' && MP.active && !MP.applying) mpSend({ t: 'fx', k: 'wind', dim: world.dim, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), p: power }); return r; }; }
{ const _on = onPeerMsg; onPeerMsg = function (peer, m) {
    if (m.t === 'fx' && m.k === 'wind' && m.dim === world.dim && S.rules.pvp !== false) { const P = player; const p = new V3(m.x, m.y, m.z); const power = Math.min(2, m.p || 1); const R = power > 1 ? 2.4 : 2.5 + power * 0.5;
      Particles.emit(p.x, p.y, p.z, 30, [[0.85, 0.9, 1], [0.7, 0.8, 1]], 6, 0.6, 2, 1.2); Sfx.at('vwoop', p, 0.9, 0.6);
      const c = P.pos.clone().add(new V3(0, 0.9, 0)); const d = c.distanceTo(p);
      if (d < R && !P.dead && !P.riding && S.mode !== 'spectator' && !(S.arena && S.rules.arena && S.arena.phase !== 'fight')) { const k = (1 - d / R) * 12 * power; const dir = c.sub(p).normalize(); P.vel.x += dir.x * k; P.vel.z += dir.z * k; P.vel.y = Math.max(P.vel.y, (dir.y * k + k * 0.6) * WIND_UP); P.peak = null; } }
    return _on(peer, m); }; }

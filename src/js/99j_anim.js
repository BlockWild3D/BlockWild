// ================= SWIMMING STARTS THE MINECRAFT WAY =================
// You only start swimming (the flat pose) when you sprint while your head is under water. Running into water no longer
// turns into a swim by itself: touching water without being under it ends the sprint, so you have to double-tap forward
// (or hold the sprint key) again once you are under. Once swimming you can stay at it along the surface.
{ const _su = swimUpdate; swimUpdate = function (P, dt, water, lava, sprint, fwd, jump, down) {
    if (P === player && !P.swimming && !P.flying && inWater(P, 0.4)) { const under = inWater(P, (P.eyeH || 1.62) - 0.05);
      if (!under) { if (P.sprinting || S.sprintTap) { P.sprinting = false; S.sprintTap = false; } sprint = false; }
      else if (sprint && !P.swamUnder) { sprint = false; P.sprinting = false; S.sprintTap = false; } // the sprint you carried in doesn't count
      P.swamUnder = under; }
    else if (P === player && !inWater(P, 0.4)) P.swamUnder = false;
    return _su.call(this, P, dt, water, lava, sprint, fwd, jump, down); }; }

// ================= PLAYER MODEL ANIMATION, CLOSER TO MINECRAFT =================
// - arms sway gently all the time (Minecraft's idle breathing), the stride is longer
// - the head turns on its own: stand still and look around and only the head moves until you pass about 50 degrees;
//   walking or attacking brings the body round to face where you look
// - other players fall over and vanish in a puff when they die, instead of standing there
{ const _sp = swimPose; swimPose = function (model, P, dt) { if (model) model._flat = !!(P && (P.swimming || P.gliding)); return _sp.apply(this, arguments); }; }
{ const _mk = makePlayerModel; makePlayerModel = function (skin, name) { const M = _mk(skin, name); const an = M.animate; M.P.head.rotation.order = 'YXZ';
    M.animate = function (dt, speed, pitch, swing, sneak, hurt, o) { const r = an.call(this, dt, speed, pitch, swing, sneak, hurt, o);
      try { const P = this.P, B = this.body; this.age = (this.age || 0) + dt;
        P.legR.rotation.x *= 1.35; P.legL.rotation.x *= 1.35;
        const sz = Math.cos(this.age * 1.8) * 0.05 + 0.05, sx = Math.sin(this.age * 1.34) * 0.05;
        P.armR.rotation.z += sz; P.armL.rotation.z -= sz; P.armR.rotation.x += sx; P.armL.rotation.x -= sx;
        const tgt = this.root.rotation.y; if (this._by == null || this._flat || this.noTurn) this._by = tgt;
        let d = Math.atan2(Math.sin(tgt - this._by), Math.cos(tgt - this._by)); const LIM = 0.87;
        if (d > LIM) { this._by = tgt - LIM; d = LIM; } else if (d < -LIM) { this._by = tgt + LIM; d = -LIM; }
        const rate = swing > 0 || (this.spearState && (this.spearState.stage || this.spearState.jab > 0)) || (o && o.blocking) ? 16 : speed > 0.6 ? 9 : 0; this._by += d * Math.min(1, dt * rate);
        const off = Math.atan2(Math.sin(this._by - tgt), Math.cos(this._by - tgt)); B.rotation.y += off; P.head.rotation.y = -off;
      } catch (e) { } return r; }; return M; }; }
{ const _ua = updateAvatars; updateAvatars = function (dt) { const r = _ua.apply(this, arguments);
    for (const av of MP.avatars.values()) { if (!av.model) continue;
      if (av.dead) { const t0 = av.deadT || 0; av.deadT = t0 + dt; const k = Math.min(1, av.deadT / 0.35); av.model.body.rotation.z = k * k * Math.PI / 2; av.model.body.position.y = 0.12 * k; av.model.mat.color.setRGB(1, 0.45, 0.45); av.model.omat.color.copy(av.model.mat.color);
        if (t0 < 0.9 && av.deadT >= 0.9 && av.dim === world.dim) Particles.emit(av.pos.x, av.pos.y + 0.4, av.pos.z, 18, [[0.9, 0.9, 0.9], [0.75, 0.75, 0.75]], 1.5, 0.6, -1, 0.5);
        if (av.deadT >= 0.9) { av.model.root.visible = false; if (av.label) av.label.visible = false; } }
      else if (av.deadT) { av.deadT = 0; av.model.body.rotation.z = 0; } }
    return r; }; }

// ================= THE CAMERA TILTS WHEN YOU ARE HURT (Minecraft) =================
{ const _h = Player.prototype.hurt; Player.prototype.hurt = function () { const hp = this.health; const r = _h.apply(this, arguments); if (this === player && this.health < hp) { S.hurtTilt = 1; S.hurtSide = Math.random() < 0.5 ? -1 : 1; } return r; };
  const _rf = renderFrame; let last = performance.now(); renderFrame = function () { const now = performance.now(); const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (S.hurtTilt > 0 && S.pov !== undefined && !(S.pov > 0)) { S.hurtTilt = Math.max(0, S.hurtTilt - dt / 0.5); const f = S.hurtTilt, g = Math.sin(f * f * f * f * Math.PI); camera.rotation.z += -g * 14 * Math.PI / 180 * (S.hurtSide || 1); }
    else if (S.hurtTilt > 0) S.hurtTilt = Math.max(0, S.hurtTilt - dt / 0.5);
    return _rf.apply(this, arguments); }; }

// ================= EXAMPLE MODS: ONLY FULLBRIGHT, MINI MAP AND VEIN MINER =================
// (Mods you already added stay in your list until you remove them there; Keep Inventory is a game rule now.)
{ const keep = /^\/\/ @name (Fullbright|Mini Map|Vein Miner)\s*$/m; for (let i = EXAMPLE_MODS.length - 1; i >= 0; i--) if (!keep.test(EXAMPLE_MODS[i])) EXAMPLE_MODS.splice(i, 1); }

// ================= GAME RULES SCREEN =================
// Pause menu > Game Rules: switches for this world's rules (keep inventory, mob spawning, day cycle, PvP and the
// rest). They are saved with the world. In multiplayer only the host sees and changes them, and friends follow.
const RULE_NAMES = { keepInventory: ['Keep inventory', 'Keep your items and experience when you die'], doDaylightCycle: ['Day and night cycle', 'Time moves forward'], doWeatherCycle: ['Weather changes', 'Rain and storms come and go'],
  doMobSpawning: ['Mob spawning', 'Animals and monsters appear by themselves'], mobGriefing: ['Mob griefing', 'Creepers, endermen and others can change blocks'], fallDamage: ['Fall damage', 'Falling hurts'],
  naturalRegeneration: ['Natural regeneration', 'Health comes back when you are well fed'], pvp: ['PvP', 'Players can hurt each other'], doTileDrops: ['Block drops', 'Broken blocks drop items'], doFireTick: ['Fire spreads', 'Fire spreads and burns out'],
  showCoordinates: ['Show coordinates', 'Your position is shown on screen'], doImmediateRespawn: ['Respawn at once', 'Skip the death screen'] };
function openRules() {
  let el = $('rulesPanel');
  if (!el) { el = document.createElement('div'); el.id = 'rulesPanel'; el.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;gap:10px;background:rgba(0,0,0,.72);z-index:70;color:#fff';
    el.innerHTML = '<div style="font-size:30px;text-shadow:2px 2px 0 #333">Game Rules</div><div style="color:#ccc;font-size:15px">Rules for this world. They are saved with it.</div><div id="rulesList" style="width:min(560px,92vw);max-height:60vh;overflow-y:auto;display:flex;flex-direction:column;gap:4px;padding:4px"></div><button class="mbtn" id="rulesDone">Done</button>';
    document.body.appendChild(el); el.querySelector('#rulesDone').addEventListener('click', () => { el.style.display = 'none'; });
    el.addEventListener('keydown', (e) => e.stopPropagation()); }
  const list = el.querySelector('#rulesList'); list.innerHTML = '';
  const keys = Object.keys(S.rules).filter(k => typeof S.rules[k] === 'boolean' && k !== 'arena'); keys.sort((a, b) => (RULE_NAMES[a] ? 0 : 1) - (RULE_NAMES[b] ? 0 : 1) || Object.keys(RULE_NAMES).indexOf(a) - Object.keys(RULE_NAMES).indexOf(b));
  for (const k of keys) { const [nm, desc] = RULE_NAMES[k] || [k, '']; const row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;background:rgba(0,0,0,.45);border:2px solid #000;padding:6px 10px';
    row.innerHTML = '<div><div style="font-size:19px">' + nm + '</div><div style="font-size:13px;color:#bbb">' + desc + '</div></div><div class="seg"><button data-v="1">On</button><button data-v="0">Off</button></div>';
    const paint = () => { for (const b of row.querySelectorAll('button')) b.classList.toggle('on', (b.dataset.v === '1') === !!S.rules[k]); }; paint();
    for (const b of row.querySelectorAll('button')) b.addEventListener('click', () => { if (mpClient()) return; S.rules[k] = b.dataset.v === '1'; paint(); if (typeof MP !== 'undefined' && MP.rulesChanged) MP.rulesChanged(); if (typeof updateHearts === 'function') updateHearts(); });
    if (S.rules.arena && (k === 'pvp' || k === 'keepInventory' || k === 'doMobSpawning')) { row.style.opacity = '0.5'; row.style.pointerEvents = 'none'; }
    list.appendChild(row); }
  el.style.display = 'flex';
}
{ const anchor = $('btnControls'); if (anchor && !$('btnRules')) { const b = document.createElement('button'); b.className = 'mbtn'; b.id = 'btnRules'; b.textContent = 'Game Rules'; anchor.parentNode.insertBefore(b, anchor); b.addEventListener('click', openRules); }
  const _hr = hostOnlyRows; hostOnlyRows = function () { const r = _hr.apply(this, arguments); const b = $('btnRules'); if (b) b.style.display = mpClient() ? 'none' : ''; return r; }; }
// a new world starts from the default rules instead of inheriting the last world's
{ const DEF = Object.assign({}, S.rules); const _sw = startWorld; startWorld = function (data) { for (const k in S.rules) if (!(k in DEF)) delete S.rules[k]; Object.assign(S.rules, DEF); return _sw.apply(this, arguments); }; }

// ================= BOW, TRIDENT AND RIPTIDE IN THIRD PERSON =================
// Seen in F5 and on other players (it is sent to them): drawing a bow brings both arms up along your aim, the bow hand
// out and the string hand back as it charges; charging a trident raises it over the shoulder pointing where you look;
// a riptide launch lays you flat and spins you along the flight. Before, none of these showed on the model at all.
function actPose(M, dt, pitch) {
  const a = M.act || {}; const P = M.P, B = M.body; const pc = clamp(pitch || 0, -1.3, 1.3); const ease = (key, on, rate) => (M[key] = (M[key] || 0) + ((on ? 1 : 0) - (M[key] || 0)) * Math.min(1, dt * rate));
  const bk = ease('_bowK', a.bow > 0, 12), tk = ease('_triK', a.trident, 12), rk = ease('_ripK', a.rip, 10);
  const mesh = M.mainMesh;
  if (bk > 0.01) { const pull = clamp(a.bow || 0, 0, 1); const mix = (cur, to) => cur * (1 - bk) + to * bk;
    P.armR.rotation.x = mix(P.armR.rotation.x, -Math.PI / 2 - pc); P.armR.rotation.y = mix(P.armR.rotation.y, 0); P.armR.rotation.z = mix(P.armR.rotation.z, 0.1);
    P.armL.rotation.x = mix(P.armL.rotation.x, -Math.PI / 2 - pc); P.armL.rotation.y = mix(P.armL.rotation.y, 0); P.armL.rotation.z = mix(P.armL.rotation.z, -0.6 - 0.2 * pull);
    P.armL.position.z = -2 * pull * bk * PX; B.rotation.y += 0.25 * bk; P.head.rotation.y -= 0.25 * bk; M._actOn = true; }
  if (tk > 0.01) { const ax = P.armR.rotation.x * (1 - tk) + (-2.75) * tk; P.armR.rotation.x = ax; P.armR.rotation.z *= (1 - tk); B.rotation.y += -0.2 * tk; P.head.rotation.y -= -0.2 * tk;
    if (mesh) mesh.rotation.x = (-ax + 0.45 - pc * 0.9) * tk; M._actOn = true; }
  else if (M._actOn && mesh && !(M.spearState && M._spOn)) { mesh.rotation.x = 0; }
  if (rk > 0.01) { M._spin = (M._spin || 0) + dt * 22; B.rotation.order = 'XYZ'; B.rotation.x = (Math.PI / 2 - pc) * rk; B.rotation.y = M._spin * rk; B.position.y = 0.9 * rk;
    P.armR.rotation.set(-Math.PI, 0, 0.1); P.armL.rotation.set(-Math.PI, 0, -0.1); P.legR.rotation.x = 0; P.legL.rotation.x = 0; M._actOn = true; }
  else if (M._spin) { M._spin = 0; }
  if (bk <= 0.01 && tk <= 0.01 && rk <= 0.01) M._actOn = false;
}
{ const _mk = makePlayerModel; makePlayerModel = function (skin, name) { const M = _mk(skin, name); const an = M.animate;
    M.animate = function (dt, speed, pitch, swing, sneak, hurt, o) { const r = an.call(this, dt, speed, pitch, swing, sneak, hurt, o); try { actPose(this, dt, pitch); } catch (e) { } return r; }; return M; }; }
function myAct() { const P = player; const o = {}; if (S.bowDraw >= 0) o.bow = Math.max(0.05, typeof bowPower === 'function' ? bowPower() : 0.5); if (S.tridentT >= 0 && typeof tridentHeld === 'function' && tridentHeld()) o.trident = 1; if (P.riptideT > 0) o.rip = 1; return o; }
{ const _ap = applyPov; applyPov = function (P, dt) { if (typeof myModel !== 'undefined' && myModel) myModel.act = myAct(); return _ap.apply(this, arguments); }; }
{ const _ms = myState; myState = function () { const s = _ms.apply(this, arguments); const a = myAct(); if (a.bow) s.bw = +a.bow.toFixed(1); if (a.trident) s.tr = 1; if (a.rip) s.rp = 1; return s; }; }
{ const _on = onPeerMsg; onPeerMsg = function (peer, m) { if (m.t === 'p') { const av = MP.avatars.get(MP.role === 'host' ? peer.id : m.id); if (av) av.act = { bow: +m.bw || 0, trident: !!m.tr, rip: !!m.rp }; } return _on(peer, m); }; }
{ const _ua = updateAvatars; updateAvatars = function (dt) { for (const av of MP.avatars.values()) if (av.model) av.model.act = av.act; return _ua.apply(this, arguments); }; }

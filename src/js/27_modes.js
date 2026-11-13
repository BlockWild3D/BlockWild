// ================= ADVENTURE AND SPECTATOR MODES (Minecraft) =================
// Adventure: Survival rules, but you can't break or place blocks (you can still fight, eat, open chests, ride).
// Spectator: fly through blocks, invisible to mobs and other players, no hotbar or health. Scroll to change flying
// speed. Left-click a mob to see through its eyes; sneak to leave it.
function isSpec() { return S.mode === 'spectator'; }
function isAdv() { return S.mode === 'adventure'; }
const MODE_NAMES = { survival: 'Survival', creative: 'Creative', adventure: 'Adventure', spectator: 'Spectator' };
// the pause menu gets all four modes
{ const seg = $('modeSeg2'); for (const m of ['adventure', 'spectator']) if (!seg.querySelector('[data-m="' + m + '"]')) { const b = document.createElement('button'); b.dataset.m = m; b.textContent = MODE_NAMES[m]; seg.appendChild(b); b.addEventListener('click', () => { for (const x of seg.children) x.classList.toggle('on', x === b); setMode(m); }); } }
{ const _sm = setMode; setMode = function (m) {
    const was = S.mode; _sm(m);
    if (m === 'spectator') { if (player.riding) dismount(); player.flying = true; S.charge = null; S.bowDraw = -1; player.blocking = false; toast('Spectator mode: fly through blocks; scroll to change speed; left-click a mob to watch from it', 3); }
    else if (m === 'adventure') toast('Adventure mode', 2);
    if (was === 'spectator' && m !== 'spectator') { S.specMob = null; if (m !== 'creative') { player.flying = false; unstickPlayer(); } }
    applySpecHud();
  }; }
function applySpecHud() { const on = isSpec(); document.body.classList.toggle('spectator', on); if (typeof handGroup !== 'undefined') handGroup.visible = !on; if (typeof offGroup !== 'undefined') offGroup.visible = !on; }
// leaving spectator inside a wall: move up to the first open space
function unstickPlayer() { const P = player; for (let k = 0; k < 400; k++) { const x = Math.floor(P.pos.x), y = Math.floor(P.pos.y), z = Math.floor(P.pos.z); if (!world.solid(x, y, z) && !world.solid(x, y + 1, z)) return; P.pos.y = Math.floor(P.pos.y) + 1; } }
// /gamemode understands all four (and their short forms)
{ const c = CMDS.gamemode; c.usage = '<survival|creative|adventure|spectator> [target]';
  c.run = function (a, ctx) {
    const m = { survival: 'survival', s: 'survival', '0': 'survival', creative: 'creative', c: 'creative', '1': 'creative', adventure: 'adventure', a: 'adventure', '2': 'adventure', spectator: 'spectator', sp: 'spectator', '3': 'spectator' }[String(a[0]).toLowerCase()];
    if (!m) throw new CmdError('Unknown game mode: ' + a[0]);
    for (const t of selectTargets(a[1], ctx, false)) { if (onlyLocal(t, '/gamemode ' + m)) { setMode(m); ok('Set own game mode to ' + MODE_NAMES[m] + ' Mode'); } else ok('Set ' + t.name + "'s game mode to " + MODE_NAMES[m] + ' Mode'); }
  };
  if (c.args) c.args = [['survival', 'creative', 'adventure', 'spectator']]; }

// ---- spectator movement: fly with no collisions ----
S.specSpeed = 1;
{ const _up = updatePlayer; updatePlayer = function (dt) {
    if (!isSpec()) return _up.apply(this, arguments);
    const P = player; if (P.dead) return; P.flying = true; P.sneaking = false; P.swimming = false; P.riding = null; P.hurtCD = 1; P.peak = null;
    P.eyeH = 1.62;
    if (S.specMob) { const m = S.specMob; const down = !S.uiOpen && kd('sneak');
      if (m.dead || m.gone || down || !G.mobs.includes(m)) { S.specMob = null; toast('Stopped spectating', 1); }
      else { const eh = Math.min(m.h * 0.88, m.h - 0.1); P.pos.set(m.pos.x, m.pos.y + eh - 1.62, m.pos.z); P.vel.set(0, 0, 0); P.yaw = (m.yaw || 0) + Math.PI + (m.head ? -m.head.rotation.y : 0); P.pitch = m.head ? clamp(-m.head.rotation.x * 0.8, -1.2, 1.2) : 0; if (m.root) m.root.visible = false; return; }
    }
    let f = 0, s = 0; if (!S.uiOpen) { if (kd('forward') || keys.ArrowUp) f++; if (kd('back') || keys.ArrowDown) f--; if (kd('right') || keys.ArrowRight) s++; if (kd('left') || keys.ArrowLeft) s--; f += T.my; s += T.mx; }
    const up = !S.uiOpen && kd('jump'), down = !S.uiOpen && kd('sneak');
    if (keys.KeyJ) look(-300 * dt, 0); if (keys.KeyL) look(300 * dt, 0); if (keys.KeyI) look(0, -300 * dt); if (keys.KeyK) look(0, 300 * dt);
    const sprint = !S.uiOpen && (kd('sprint') || S.sprintTap) && f > 0; if (f <= 0) S.sprintTap = false; P.sprinting = sprint;
    const speed = (sprint ? 21.6 : 10.9) * S.specSpeed;
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
    let wx = fx * f + rx * s, wz = fz * f + rz * s; const L = Math.hypot(wx, wz); if (L > 1) { wx /= L; wz /= L; }
    const k = 1 - Math.exp(-dt * 8); P.vel.x += (wx * speed - P.vel.x) * k; P.vel.z += (wz * speed - P.vel.z) * k;
    P.vel.y += (((up ? 1 : 0) - (down ? 1 : 0)) * speed * 0.75 - P.vel.y) * (1 - Math.exp(-dt * 10));
    P.pos.addScaledVector(P.vel, dt); P.pos.y = clamp(P.pos.y, -160, WH + 200); P.onGround = false;
  }; }
// the mob you were watching becomes visible again when you leave it
{ const _ub = updateBoats; updateBoats = function (dt) { const r = _ub(dt); for (const m of G.mobs) if (m.root && !m.root.visible && m !== S.specMob && !m.hiddenByGame) m.root.visible = true; return r; }; }
// ---- spectator: no digging, attacking or using; left-click a mob to watch from it ----
{ const _ui = updateInteraction; updateInteraction = function (dt) {
    if (!isSpec()) {
      if (isAdv() && mouseL) { // Adventure: attacks work, digging doesn't
        const eye = player.eye(), dir = lookDir(); let mob = false; for (const m of G.mobs) { if (m.dead || m === player.riding) continue; const t = mobRay(m, eye, dir); if (t >= 0 && t < 4.5) { mob = true; break; } }
        if (!mob && !targetBoat) { const ml = mouseL; mouseL = false; try { return _ui.apply(this, arguments); } finally { mouseL = ml; } }
      }
      return _ui.apply(this, arguments);
    }
    selBox.visible = false; crackMesh.visible = false; show('mineBar', false); target = null; targetBoat = null; targetMob = null;
    if (mouseL && !S.specMob) { mouseL = false; const eye = player.eye(), dir = lookDir(); let best = null, bd = 32; for (const m of G.mobs) { if (m.dead || m.isBoss) continue; const t = mobRay(m, eye, dir); if (t >= 0 && t < bd) { bd = t; best = m; } } if (best) { S.specMob = best; toast('Spectating ' + (best.t ? best.t.name : 'mob') + ' (sneak to leave)', 2); } }
  }; }
{ const _pb = placeBlock; placeBlock = function () { if (isSpec() || isAdv()) return false; return _pb.apply(this, arguments); };
  const _fu = farmUse; farmUse = function () { if (isSpec() || isAdv()) return false; return _fu.apply(this, arguments); };
  const _oi = openInv; openInv = function () { if (isSpec()) return; return _oi.apply(this, arguments); };
}
// scroll changes spectator flying speed instead of the hotbar slot
addEventListener('wheel', (e) => { if (!S.started || S.uiOpen || S.paused || !isSpec()) return; S.specSpeed = clamp(S.specSpeed * (e.deltaY > 0 ? 0.8 : 1.25), 0.1, 5); toast('Flying speed ' + Math.round(S.specSpeed * 100) + '%', 0.8); }, { passive: true });
{ const _sel = selectSlot; selectSlot = function (i) { if (isSpec()) return; return _sel.apply(this, arguments); }; }
// mode is shown with the time and biome; the world remembers Spectator and Adventure too
{ const _sw = startWorld; startWorld = function (data) { const r = _sw.apply(this, arguments); if (data && (data.mode === 'adventure' || data.mode === 'spectator')) setMode(data.mode); applySpecHud(); return r; }; }
// multiplayer: spectators are invisible to everyone else
{ const _ms = myState; myState = function () { const o = _ms.apply(this, arguments); if (isSpec()) o.spec = 1; return o; }; }

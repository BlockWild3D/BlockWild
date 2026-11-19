// ================= DUELS (PvP worlds on a dedicated server) =================
// Played like the big practice servers: everyone spawns in a hub where nobody can be hurt, opens the Duels menu (K),
// and queues for a kit. When two players are queued for the same kit, the server sends just those two to a free
// arena (each match gets a fresh map with the next look), they get their own version of the kit, a 3 second
// countdown, and fight. The one who dies or leaves loses, the winner is announced to everyone and both go back to
// the hub. Up to DU.N matches can run at once. Worlds hosted by a player keep the round-based arena from 99e/99g.
// Layout: the hub sits at the origin, arena k (1..N) is centred at x = k * DU.GAP, all at the arena's height.
const DU = { N: 4, GAP: 160, r: [0, 0, 0, 0, 0], me: { phase: 'hub' }, queues: {}, fights: 0, matches: new Map(), q: new Map(), hint: 0 };
function duOn() { return !!(S.rules && S.rules.arena && S.rules.duels); }
function duRegion(x, z) { if (Math.abs(z) > AR.E + 4) return -1; const r = Math.round(x / DU.GAP); if (r < 0 || r > DU.N) return -1; return Math.abs(x - r * DU.GAP) <= AR.E + 4 ? r : -1; }
function duSeed(w, k) { return ((w.seed | 0) + k * 1000003 + DU.r[k] * 7919) | 0; }
function duTheme(k) { return AR_THEMES[(k + DU.r[k]) % AR_THEMES.length]; }
// the hub: a round stone plaza on a floating island, with a lantern ring and a low wall
function hubAt(x, y, z) {
  const R = 22, Y = AR.Y, rr = Math.hypot(x + 0.5, z + 0.5); if (rr > R + 2) return 0; const h = ihash(x, z, 91, 7);
  if (y >= Y) {
    if (rr > R && rr <= R + 1) { if (y === Y) return B.STONE_BRICKS; if (y === Y + 1) return B.STONE_BRICK_WALL; return 0; }
    const ang = Math.atan2(z + 0.5, x + 0.5), post = Math.abs(rr - (R - 3)) < 0.6 && Math.abs(((ang / (Math.PI / 4)) % 1 + 1) % 1 - 0.5) > 0.47;
    if (post) { if (y < Y + 2) return B.STONE_BRICK_WALL; if (y === Y + 2) return B.LANTERN; } return 0; }
  const d = Y - 1 - y; const depth = Math.min(12, 3 + (R + 2 - rr) * 0.8 + (h & 3)); if (d >= depth) return 0;
  if (d === 0) { if (rr < 2.5) return B.CHISELED_STONE_BRICKS; if (rr < 5) return B.POLISHED_ANDESITE; if (rr > R) return B.STONE_BRICKS; return ((Math.floor(rr) % 6) === 0) ? B.SMOOTH_STONE : (h % 9 === 0 ? B.MOSSY_STONE_BRICKS : B.STONE_BRICKS); }
  return d < 3 ? B.STONE_BRICKS : B.STONE;
}
function duAt(w, x, y, z) { const k = duRegion(x, z); if (k < 0) return 0; if (k === 0) return hubAt(x, y, z);
  AR.themeOverride = duTheme(k); try { return arenaAt(duSeed(w, k), x - k * DU.GAP, y, z); } finally { AR.themeOverride = null; } }
{ const _ac = arenaChunk; arenaChunk = function (w, cx, cz) { if (!duOn()) return _ac.apply(this, arguments);
    const c = new Chunk(cx, cz); const d = c.d; const bx = cx * 16, bz = cz * 16;
    const any = [0, 15].some(ox => [0, 15].some(oz => duRegion(bx + ox, bz + oz) >= 0)) || duRegion(bx + 8, bz + 8) >= 0;
    if (any) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) { if (duRegion(bx + x, bz + z) < 0) continue; for (let y = AR.Y - 15; y <= AR.Y + 12; y++) { const id = duAt(w, bx + x, y, bz + z); if (id) d[(y * 16 + z) * 16 + x] = id; } }
    const e = w.edits.get(c.key); if (e) for (const [i, id] of e) d[i] = id;
    c.scanMeta(); w.chunks.set(c.key, c);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (dx || dz) { const n = w.getChunk(cx + dx, cz + dz); if (n) n.dirty = true; }
    w.hintsDone.add(c.key); return c; }; }
// throw away a region's chunks (and anything built or broken there) and make them again
function duRegen(k) { const w = world; if (!w || w.dim !== 'overworld') return; const x0 = k * DU.GAP - AR.E - 4, x1 = k * DU.GAP + AR.E + 4;
  for (let cx = Math.floor(x0 / 16); cx <= Math.floor(x1 / 16); cx++) for (let cz = Math.floor((-AR.E - 4) / 16); cz <= Math.floor((AR.E + 4) / 16); cz++) {
    w.edits.delete(ckey(cx, cz)); const c = w.getChunk(cx, cz); if (c) { w.unload(c); arenaChunk(w, cx, cz); } }
  for (const m of G.mobs) if (m.isCrystal && !m.dead && duRegion(m.pos.x, m.pos.z) === k && m.blastGone) m.blastGone();
  G.items = G.items.filter(it => { if (duRegion(it.pos.x, it.pos.z) === k) { it.gone = true; it.remove(); return false; } return true; });
  w.lastCenter = null; }
function duRegenAll() { for (let k = 0; k <= DU.N; k++) duRegen(k); }
function duSpot(k, side) { const [sx, sz] = arenaSpots()[side ? 4 : 0]; return [k * DU.GAP + sx, sz]; }

// ---------- on every player's screen ----------
function duHub(msg) { const M = DU.me; M.phase = 'hub'; M.k = null; M.key = null;
  for (let i = 0; i <= 40; i++) player.inv[i] = null; invDirty(); player.health = 20; player.food = 20; player.sat = 5; player.effects = {}; player.fire = 0; player.fireT = 0; if (typeof setLevel === 'function') setLevel(0, 0);
  setMode('adventure'); player.flying = false; player.pos.set(0.5 + (Math.random() - 0.5) * 4, AR.Y, 0.5 + (Math.random() - 0.5) * 4); player.vel.set(0, 0, 0); player.peak = null; world.lastCenter = null;
  updateHearts(); if (typeof renderFood === 'function') renderFood(); if (msg) arenaMsg(msg, 2.5); }
function duSend(m) { if (MP.active && MP.role === 'client') { const h = MP.peers.get('host'); if (h) h.link.send(Object.assign({ t: 'duel' }, m)); } }
function duQueue(i) { const kt = KITS[i]; if (!kt || DU.me.phase === 'count' || DU.me.phase === 'fight') return; DU.me.phase = 'queue'; DU.me.key = kt.k; DU.me.def = kitDef(kt);
  duSend({ a: 'queue', key: kt.k, name: kt.name }); Sfx.play('click', 0.6); chatPrint('Queued for ' + kt.name + '. Waiting for an opponent...', '#7ef'); duRender(); }
function duLeave() { if (DU.me.phase !== 'queue') return; DU.me.phase = 'hub'; DU.me.key = null; duSend({ a: 'leave' }); chatPrint('Left the queue', '#aaa'); duRender(); }
function duMenu() { let el = $('duelMenu');
  if (!el) { el = document.createElement('div'); el.id = 'duelMenu'; el.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;gap:10px;background:rgba(0,0,0,.6);z-index:60';
    el.innerHTML = '<div style="font-size:34px;color:#fff;text-shadow:2px 2px 0 #333">Duels</div><div id="duelInfo" style="color:#ccc;font-size:14px;text-align:center;max-width:720px"></div><div id="duelGrid" style="display:grid;grid-template-columns:repeat(4,minmax(150px,200px));gap:8px"></div><div style="display:flex;gap:10px"><button id="duelLeave" class="mbtn" style="width:auto;padding:4px 18px">Leave queue</button><button id="duelNewKit" class="mbtn" style="width:auto;padding:4px 18px;display:none">New kit</button></div>';
    document.body.appendChild(el); el.addEventListener('keydown', (e) => e.stopPropagation());
    $('duelLeave').addEventListener('pointerdown', (e) => { e.preventDefault(); duLeave(); });
    $('duelNewKit').addEventListener('pointerdown', (e) => { e.preventDefault(); duEditStart(null); }); }
  S.uiOpen = 'duel'; for (const kk in keys) keys[kk] = false; mouseL = mouseR = false; el.style.display = 'flex'; releaseLock(); duRender(); }
function duClose(noLock) { const el = $('duelMenu'); if (el) el.style.display = 'none'; if (S.uiOpen === 'duel') S.uiOpen = null; if (!noLock) requestLock(); }
function duRender() { const el = $('duelMenu'); if (!el || el.style.display === 'none') return; const M = DU.me;
  $('duelInfo').textContent = M.phase === 'queue' ? 'Queued for ' + (KITS.find(k => k.k === M.key) || { name: M.key }).name + '. Waiting for someone to queue the same kit...' : 'Pick a kit to queue for. When someone else queues the same kit, you both go to an arena and fight 1v1. Fights going on: ' + DU.fights + '. Esc closes this, K opens it.';
  $('duelLeave').style.display = M.phase === 'queue' ? '' : 'none'; $('duelNewKit').style.display = kitAdmin() && M.phase === 'hub' ? '' : 'none';
  const g = $('duelGrid'); g.innerHTML = '';
  KITS.forEach((kt, i) => { const n = DU.queues[kt.k] || 0, mine = M.phase === 'queue' && M.key === kt.k; const b = document.createElement('button');
    b.style.cssText = 'text-align:left;background:' + (mine ? '#2c5a2c' : '#3b3b3b') + ';border:3px solid ' + (mine ? '#7e7' : '#1c1c1c') + ';color:#fff;padding:8px 10px;cursor:pointer;font-family:inherit';
    b.innerHTML = '<div style="font-size:17px">' + kt.name + '</div><div style="font-size:12px;color:' + (n ? '#ff5' : '#aaa') + '">' + (n ? n + ' in queue' : 'nobody in queue') + '</div>';
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (mine) duLeave(); else duQueue(i); }); g.appendChild(b);
    if (kitAdmin() && M.phase === 'hub') { b.style.position = 'relative'; const tag = (txt, bg, side, fn) => { const t = document.createElement('span'); t.textContent = txt; t.style.cssText = 'position:absolute;top:4px;' + side + ':4px;background:' + bg + ';border:2px solid #1c1c1c;font-size:11px;padding:0 5px;cursor:pointer';
        t.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); }); b.appendChild(t); };
      tag('Edit', '#2c5a7a', 'right', () => duEditStart(kt));
      if (kt.custom != null) tag(kt.edited ? 'Reset' : 'Delete', '#8a2a22', 'left', () => { const all = loadCustomKits(); all.splice(kt.custom, 1); saveCustomKits(all); rebuildKits(); duRender(); toast((kt.edited ? 'Reset ' : 'Deleted ') + kt.name, 2); }); } }); }
{ const _ci = closeInv; closeInv = function (noLock) { if (S.uiOpen === 'duel') { duClose(noLock); return; } return _ci.apply(this, arguments); }; }
addEventListener('keydown', (e) => { if (e.code !== 'KeyK' || !duOn() || player.dead) return; if (S.uiOpen === 'duel') { e.preventDefault(); duClose(); return; }
  if (!S.uiOpen && (DU.me.phase === 'hub' || DU.me.phase === 'queue')) { e.preventDefault(); e.stopImmediatePropagation(); duMenu(); } }, true);
// ---- kits on a duels server: everyone uses the server's list; only the owner (kitAdmin, 99i) can change it ----
// The owner edits in the hub: Edit (or New kit) in the Duels menu fills the inventory in Creative, K saves it.
DU.kits = [];
{ const _lk = loadCustomKits; loadCustomKits = function () { if (duOn()) return JSON.parse(JSON.stringify(DU.kits)); return _lk.apply(this, arguments); }; }
{ const _sk = saveCustomKits; saveCustomKits = function (a) { if (duOn()) { DU.kits = a; duSend({ a: 'kits', list: a, email: PROFILE.google ? PROFILE.google.email : null }); return; } return _sk.apply(this, arguments); }; }
function duEditStart(kt) { if (!kitAdmin()) { toast('Only the owner can make or edit kits', 2); return; } if (DU.me.phase !== 'hub') { toast('Leave the queue first', 2); return; }
  const c = kt && kt.custom != null ? loadCustomKits()[kt.custom] : null;
  AR.editFrom = kt ? { name: kt.name, idx: kt.custom != null ? kt.custom : null, base: kt.custom != null ? ((c && c.base) || null) : kt.k } : null;
  duClose(true); AR.editing = true; DU.me.phase = 'edit'; for (let i = 0; i <= 40; i++) player.inv[i] = null; setMode('creative'); player.flying = false;
  if (kt) giveKit(kt.slots ? kt : kitDef(kt)); invDirty(); requestLockSoon();
  chatPrint((kt ? 'Editing "' + kt.name + '". ' : 'New kit. ') + 'Open your inventory (E) to change items, armour and off-hand, then press K to save it for everyone.', '#ff5'); }
{ const _ke = kitEditEnd; kitEditEnd = function () { if (!duOn()) return _ke.apply(this, arguments);
    AR.editing = false; AR.editFrom = null; if (S.uiOpen === 'kitsave') S.uiOpen = null; const d = $('kitSave'); if (d) d.style.display = 'none'; duHub(); setTimeout(duMenu, 50); }; }
// no damage outside your own fight; in the hub you can't break or place (adventure mode)
{ const _h = Player.prototype.hurt; Player.prototype.hurt = function () { if (this === player && duOn() && DU.me.phase !== 'fight') return; return _h.apply(this, arguments); }; }
// dying in a duel (and not saved by a totem) loses it: no death screen, straight back to the hub
{ const _die = Player.prototype.die; Player.prototype.die = function (cause) {
    if (this === player && duOn()) { const tot = (s) => s && s.id === IT.totem_of_undying; const saved = cause !== 'the void' && (tot(this.inv[this.sel]) || tot(this.inv[36]));
      if (!saved) { if (DU.me.phase === 'fight') { duSend({ a: 'lost', cause: String(cause || '') }); DU.me.phase = 'over'; } duHub('You lost'); return; } }
    return _die.apply(this, arguments); }; }
function duTick(dt) { if (BW_SERVER || !duOn() || !S.started || S.loading) return; const M = DU.me;
  if (M.phase === 'edit') { if (player.pos.y < AR.Y - 30 || duRegion(player.pos.x, player.pos.z) !== 0) { player.pos.set(0.5, AR.Y, 0.5); player.vel.set(0, 0, 0); } if (!S.uiOpen) arenaMsg('Kit editor: E for items, K to save', 0, true); }
  if (M.phase === 'hub' || M.phase === 'queue') { if (player.food < 20) player.food = 20; if (S.mode !== 'adventure' && S.mode !== 'spectator') setMode('adventure');
    if (player.pos.y < AR.Y - 30 || duRegion(player.pos.x, player.pos.z) !== 0) duHub();
    DU.hint -= dt; if (DU.hint <= 0 && !S.uiOpen) { DU.hint = 6; arenaMsg('Press K for Duels', 0, true); } }
  if (M.phase === 'count') { const [sx, sz] = M.spot; if (Math.hypot(player.pos.x - sx - 0.5, player.pos.z - sz - 0.5) > 0.6 || player.pos.y < AR.Y - 0.3) { player.pos.set(sx + 0.5, AR.Y, sz + 0.5); player.vel.set(0, 0, 0); }
    if (!world.getChunk(Math.floor(sx / 16), Math.floor(sz / 16)) || !world.solid(sx, AR.Y - 1, sz)) { player.vel.set(0, 0, 0); if (M.t < 1) M.t = 1; } // the arena hasn't loaded here yet: wait for it
    const before = Math.ceil(M.t); M.t -= dt; const now = Math.ceil(M.t); if (M.t <= 0) { M.phase = 'fight'; arenaMsg('Fight!', 1.2); Sfx.play('levelup', 0.6); } else if (now !== before) { arenaMsg(String(now), 0.9); Sfx.play('click', 0.6); } }
  if (M.phase === 'fight' && player.pos.y < AR.Y - 48 && !player.dead) { player.health = 0; player.die('the void'); }
  if (M.phase === 'won') { M.t -= dt; if (M.t <= 0) duHub(); } }
{ const _t = tick; tick = function (dt) { const r = _t.apply(this, arguments); try { duTick(dt); } catch (e) { console.warn(e); } return r; }; }
// joining: no cage, no round lobby; straight to the hub, and ask the server where things stand
{ const _fl = finishLoading; finishLoading = function () { if (duOn()) { S.arena = null; DU.me = { phase: 'hub' }; } try { rebuildKits(); } catch (e) { } // your own kits again after leaving a server, and the reverse
    const r = _fl.apply(this, arguments); if (duOn() && !BW_SERVER) { player.spawn.set(0.5, AR.Y, 0.5); duHub(); duSend({ a: 'hello' }); chatPrint('Welcome! Press K to pick a kit and queue for a duel.', '#7ef'); } return r; }; }
function duClientMsg(m) {
  if (m.a === 'kits') { DU.kits = Array.isArray(m.list) ? m.list : []; rebuildKits(); duRender(); return; }
  if (m.a === 'state') { DU.queues = m.queues || {}; DU.fights = m.fights | 0;
    if (Array.isArray(m.r)) m.r.forEach((v, k) => { if (k > 0 && k <= DU.N && (v | 0) !== DU.r[k]) { DU.r[k] = v | 0; duRegen(k); } }); duRender(); return; }
  if (m.a === 'start') { const k = m.k | 0; if (k < 1 || k > DU.N) return; DU.r[k] = m.r | 0; duRegen(k);
    const kitName = (KITS.find(x => x.k === m.key) || { name: m.key }).name; chatPrint('Duel: ' + m.names[0] + ' vs ' + m.names[1] + ' (' + kitName + ')', '#ff5');
    const side = (m.p || []).indexOf(MP.myId); if (side < 0) return;
    const M = DU.me; M.phase = 'count'; M.k = k; M.t = 3; M.spot = duSpot(k, side); duClose(true); requestLockSoon();
    setMode('survival'); player.flying = false; const [sx, sz] = M.spot; player.pos.set(sx + 0.5, AR.Y, sz + 0.5); player.vel.set(0, 0, 0); player.peak = null;
    player.yaw = Math.atan2(sx - k * DU.GAP, sz); // facing the middle player.pitch = 0; world.lastCenter = null;
    giveKit(M.def || kitDef(KITS.find(x => x.k === m.key) || KITS[0])); arenaMsg('3', 0.9); chatPrint('Map: ' + duTheme(k).name + '. Opponent: ' + m.names[1 - side], '#7ef'); return; }
  if (m.a === 'end') { chatPrint(m.winner ? m.winner + ' beat ' + m.loser + (m.why ? ' (' + m.why + ')' : '') : 'The duel ended', '#ff5');
    if (DU.me.k === m.k && (DU.me.phase === 'fight' || DU.me.phase === 'count')) { if (m.winId === MP.myId) { DU.me.phase = 'won'; DU.me.t = 3; arenaMsg('You won!', 3); Sfx.play('levelup', 0.8); } else duHub('You lost'); } return; }
}

// ---------- on the dedicated server: queues and matches ----------
function duState() { const queues = {}; for (const [id, key] of DU.q) queues[key] = (queues[key] || 0) + 1; return { t: 'duel', a: 'state', queues, fights: DU.matches.size, r: DU.r.slice() }; }
function duBroadcast() { mpSendAll(duState()); }
function duNameOf(id) { const a = MP.avatars.get(id); const p = MP.peers.get(id); return (a && a.name) || (p && p.name) || (DU.names && DU.names.get(id)) || 'Someone'; }
function duTryMatch() {
  const byKey = new Map(); for (const [id, key] of DU.q) { if (!byKey.has(key)) byKey.set(key, []); byKey.get(key).push(id); }
  for (const [key, ids] of byKey) { while (ids.length >= 2) {
      let k = 0; for (let i = 1; i <= DU.N; i++) if (![...DU.matches.values()].some(mt => mt.k === i)) { k = i; break; } if (!k) return;
      const p = [ids.shift(), ids.shift()]; DU.q.delete(p[0]); DU.q.delete(p[1]); DU.r[k]++; duRegen(k);
      const mt = { k, p, key, t0: Date.now() }; DU.matches.set(k, mt);
      mpSendAll({ t: 'duel', a: 'start', k, r: DU.r[k], p, names: p.map(duNameOf), key }); SRV.say('duel ' + p.map(duNameOf).join(' vs ') + ' (' + key + ') in arena ' + k); } }
  duBroadcast(); }
function duEnd(k, loserId, why) { const mt = DU.matches.get(k); if (!mt) return; DU.matches.delete(k);
  const winId = mt.p.find(id => id !== loserId); mpSendAll({ t: 'duel', a: 'end', k, winId, winner: duNameOf(winId), loser: duNameOf(loserId), why: why || '' });
  SRV.say(duNameOf(winId) + ' beat ' + duNameOf(loserId) + (why ? ' (' + why + ')' : '')); duBroadcast(); }
function duMatchOf(id) { for (const mt of DU.matches.values()) if (mt.p.includes(id)) return mt; return null; }
if (BW_SERVER) {
  { const _on = onPeerMsg; onPeerMsg = function (peer, m) {
      if (m && m.t === 'duel' && MP.role === 'host' && duOn()) { const id = peer.id;
        if (m.a === 'hello') { peer.link.send(duState()); peer.link.send({ t: 'duel', a: 'kits', list: DU.kits }); return; }
        if (m.a === 'kits') { const nm = String((MP.avatars.get(id) || peer).name || '').toLowerCase(), em = String(m.email || '').toLowerCase();
          if (!KIT_ADMINS.names.includes(nm) && !KIT_ADMINS.emails.includes(em)) { SRV.say('refused kit change from ' + nm); return; }
          const ok = (k) => k && typeof k.name === 'string' && Array.isArray(k.slots) && k.slots.length <= 41 && k.slots.every(x => Array.isArray(x) && Number.isInteger(x[0]) && typeof x[1] === 'string');
          if (!Array.isArray(m.list) || m.list.length > 40 || !m.list.every(ok)) return;
          DU.kits = m.list.map(k => ({ name: k.name.slice(0, 20), slots: k.slots.slice(0, 41), base: typeof k.base === 'string' ? k.base.slice(0, 24) : undefined }));
          try { localStorage.setItem('blockwild_server_kits', JSON.stringify(DU.kits)); } catch (e) { } rebuildKits();
          mpSendAll({ t: 'duel', a: 'kits', list: DU.kits }); SRV.say('kits changed by ' + nm); return; }
        if (m.a === 'queue' && !duMatchOf(id) && /^[a-z0-9_]{1,24}$/.test(String(m.key))) { DU.q.delete(id); DU.q.set(id, String(m.key)); duTryMatch(); return; }
        if (m.a === 'leave') { DU.q.delete(id); duBroadcast(); return; }
        if (m.a === 'lost') { const mt = duMatchOf(id); if (mt) duEnd(mt.k, id, String(m.cause || '').slice(0, 40)); return; }
        return; }
      return _on.apply(this, arguments); }; }
  try { DU.kits = JSON.parse(localStorage.getItem('blockwild_server_kits') || '[]'); if (!Array.isArray(DU.kits)) DU.kits = []; } catch (e) { DU.kits = []; }
  // leaving the server loses your duel and takes you out of the queue
  { const _ra = removeAvatar; removeAvatar = function (id) { DU.names = DU.names || new Map(); DU.names.set(id, duNameOf(id)); const r = _ra.apply(this, arguments); if (MP.role === 'host' && duOn()) { const mt = duMatchOf(id); if (mt) duEnd(mt.k, id, 'left the game'); if (DU.q.delete(id)) duBroadcast(); } return r; }; }
  // the server rides along with someone who is fighting, so their arena is the part of the world it runs
  SRV.pickFollow = function () { for (const mt of DU.matches.values()) for (const id of mt.p) { const a = MP.avatars.get(id); if (a && !a.dead && duRegion(a.pos.x, a.pos.z) === mt.k) return a; } return null; };
  // a PvP world on the server is always played as duels; the arena that was there before is rebuilt as the hub
  { const _st = SRV.start; SRV.start = async function () { const r = await _st.apply(this, arguments);
      if (S.rules && S.rules.arena && !S.rules.duels) { S.rules.duels = true; S.arena = null; duRegenAll(); SRV.say('PvP world set up for duels'); } else if (duOn()) S.arena = null; return r; }; }
  setInterval(() => { if (duOn() && MP.active && DU.matches.size) for (const [k, mt] of DU.matches) if (mt.p.some(id => !MP.peers.has(id))) duEnd(k, mt.p.find(id => !MP.peers.has(id)), 'left the game'); }, 5000);
} else {
  { const _on = onPeerMsg; onPeerMsg = function (peer, m) { if (m && m.t === 'duel' && MP.role === 'client' && peer.id === 'host') { if (duOn()) duClientMsg(m); return; } return _on.apply(this, arguments); }; }
}

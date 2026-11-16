// ================= ONE KIT FOR EVERYONE, PICKED BY THE HOST; CUSTOM KITS =================
// The host picks the kit in the lobby and every player gets exactly that kit when the match starts (friends see the
// choice but can't change it). The host can also build custom kits: "Make a custom kit" hands you Creative items in
// your cage, you lay out your inventory, armour and off-hand the way the kit should be, press K, name it and save.
// Custom kits are kept in this browser (up to 12) and are sent to friends when picked, so they don't need them saved.
AR.def = null; AR.editing = false;
const KITS_BASE = KITS.length; const KIT_STORE = 'blockwild_pvp_kits';
function kitDef(kt) { return JSON.parse(JSON.stringify({ name: kt.name, items: kt.items || [], armor: kt.armor || [], off: kt.off || null, slots: kt.slots || null })); }
function loadCustomKits() { try { const a = JSON.parse(localStorage.getItem(KIT_STORE) || '[]'); return Array.isArray(a) ? a.filter(k => k && k.name && Array.isArray(k.slots)).slice(0, 12) : []; } catch (e) { return []; } }
function saveCustomKits(a) { try { localStorage.setItem(KIT_STORE, JSON.stringify(a)); } catch (e) { } }
function rebuildKits() {
  KITS.length = KITS_BASE;
  loadCustomKits().forEach((c, i) => { const at = (n) => { const s = c.slots.find(x => x[0] === n); return [s ? s[1] : null]; };
    KITS.push({ k: 'custom' + i, name: c.name, custom: i, blurb: 'Custom kit. Right-click to delete it.', slots: c.slots, items: c.slots.filter(x => x[0] < 36).map(x => [x[1], x[2]]), armor: [at(37), at(38), at(39), at(40)] }); });
  const el = $('kitPick'); if (el) { const open = S.uiOpen === 'kit'; if (open) closeKitPicker(true); el.remove(); if (open) openKitPicker(); }
}
{ const _gk = giveKit; giveKit = function (kit) {
    if (!kit || !Array.isArray(kit.slots)) return _gk.apply(this, arguments);
    for (let i = 0; i <= 40; i++) player.inv[i] = null;
    for (const [slot, key, n, ex] of kit.slots.slice(0, 41)) { const id = IT[key]; if (id == null || !(slot >= 0 && slot <= 40)) continue; const s = { id, count: clamp(n | 0, 1, stackMax(id)) };
      if (ex && ex.ench && typeof ex.ench === 'object') { s.ench = {}; for (const en in ex.ench) if (ENCH[en]) s.ench[en] = clamp(ex.ench[en] | 0, 1, 10); } if (ex && ex.pot && POTIONS[ex.pot]) s.pot = ex.pot; player.inv[slot] = s; }
    player.sel = 0; player.health = 20; player.food = 20; player.sat = 5; invDirty(); updateHearts(); if (typeof renderFood === 'function') renderFood(); }; }
// ---- the host's pick ----
pickKit = function (i) {
  const A = S.arena; if (!KITS[i] || !A || A.phase !== 'cage' || AR.live || AR.editing) return;
  if (!arenaHost()) { toast('The host picks the kit', 1.5); return; }
  A.kit = i; AR.def = kitDef(KITS[i]); arenaSend({ a: 'pick', def: AR.def }); Sfx.play('click', 0.6); renderLobby(); };
arenaStart = function () {
  if (!arenaHost() || AR.live || AR.editing || !S.arena || S.arena.phase !== 'cage') return;
  if (!AR.def) { toast('Pick a kit first', 1.5); return; }
  AR.outs = new Set(); AR.parts = new Set(AR.roster.keys()); arenaSend({ a: 'start', def: AR.def }); arenaBegin(); };
arenaBegin = function () {
  const A = S.arena; AR.live = true; AR.outs = new Set(); AR.endT = 0; if (!A || A.phase !== 'cage') return;
  const kt = AR.def || kitDef(KITS[0]); giveKit(kt); A.phase = 'count'; A.t = 3; closeKitPicker(); arenaMsg('3', 0.9); Sfx.play('click', 0.6); chatPrint('Kit: ' + kt.name, '#ff5'); };
{ const _in = arenaMsgIn; arenaMsgIn = function (peer, m) {
    if (!S.rules.arena) return;
    if (MP.role === 'host') { const r = _in.apply(this, arguments); if (m.a === 'hello' && AR.def) peer.link.send({ t: 'arena', a: 'pick', def: AR.def }); return r; }
    if (peer && peer.id === 'host' && m.a === 'pick' && !m.def) { AR.def = null; renderLobby(); return; }
    if (peer && peer.id === 'host' && m.def && typeof m.def === 'object' && (m.a === 'pick' || m.a === 'start')) { AR.def = { name: String(m.def.name || 'Kit').slice(0, 24), items: Array.isArray(m.def.items) ? m.def.items.slice(0, 36) : [], armor: Array.isArray(m.def.armor) ? m.def.armor.slice(0, 4) : [], off: m.def.off || null, slots: Array.isArray(m.def.slots) ? m.def.slots.slice(0, 41) : null }; if (m.a === 'pick') { renderLobby(); return; } }
    return _in.apply(this, arguments); }; }
{ const _fl = finishLoading; finishLoading = function () { if (S.rules.arena) { AR.def = null; AR.editing = false; } return _fl.apply(this, arguments); }; }
// ---- the lobby, redrawn for one shared kit ----
renderLobby = function () {
  const el = $('kitPick'); if (!el || !S.arena || !$('lobbyBar')) return; const A = S.arena; const host = arenaHost(), mp = typeof MP !== 'undefined' && MP.active;
  const esc = (t) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  el.children[1].textContent = host ? 'Pick the kit everyone will use (click, or 1 to 9), then start the match. Esc hides this, K brings it back.' : 'The host picks the kit everyone will use. Esc hides this, K brings it back.';
  el.querySelectorAll('#kitGrid button').forEach(b => { const kt = KITS[+b.dataset.i]; const on = AR.def && kt && kt.name === AR.def.name && (host ? +b.dataset.i === A.kit : true); b.style.outline = on ? '3px solid #6f6' : 'none'; b.style.opacity = host || on ? '1' : '0.55'; b.style.cursor = host ? 'pointer' : 'default'; });
  $('lobbyPlayers').innerHTML = '<span style="color:#ff5;padding:4px 10px;font-size:16px">Kit: <b>' + (AR.def ? esc(AR.def.name) : host ? 'not picked yet' : 'the host is choosing...') + '</b></span>' +
    [...AR.roster].map(([id, r]) => '<span style="background:#2a2a2a;border:2px solid #1c1c1c;padding:4px 10px;color:#fff">' + esc(r.name) + (id === 'host' && mp ? ' (host)' : '') + '</span>').join('');
  const code = mp && MP.code ? MP.code : null;
  $('lobbyInvite').style.display = host ? '' : 'none'; $('lobbyInvite').textContent = code ? 'Copy invite code' : (AR.inviting ? 'Opening...' : 'Invite friends');
  $('lobbyCode').textContent = code ? 'Invite code: ' + code + '  (friends: Multiplayer, then enter it)' : !host ? 'Waiting for the host to start the match' : '';
  const st = $('lobbyStart'); st.style.display = host ? '' : 'none'; st.textContent = AR.roster.size > 1 ? 'Start match (' + AR.roster.size + ' players)' : 'Start practice round'; st.style.opacity = AR.def ? '1' : '0.5';
  const cu = $('lobbyCustom'); if (cu) { cu.style.display = host ? '' : 'none'; cu.style.opacity = '1'; }
  const sel = [...el.querySelectorAll('#kitGrid button')].find(b => b.style.outline !== 'none'); if (sel && AR.shown !== (AR.def && AR.def.name)) { AR.shown = AR.def && AR.def.name; sel.scrollIntoView({ block: 'nearest' }); }
};
{ const _ok = openKitPicker; openKitPicker = function () {
    if (AR.editing) return; const r = _ok.apply(this, arguments); const st = $('lobbyStart');
    if (st && !$('lobbyCustom')) { const b = document.createElement('button'); b.id = 'lobbyCustom'; b.style.cssText = st.style.cssText; b.style.background = '#3b3b3b'; b.textContent = 'Make a custom kit'; st.parentNode.insertBefore(b, st);
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); kitEditStart(); });
      const g = $('kitGrid'); g.style.maxHeight = '56vh'; g.style.overflowY = 'auto'; g.style.padding = '4px';
      g.querySelectorAll('button').forEach(bt => bt.addEventListener('contextmenu', (e) => { e.preventDefault(); const kt = KITS[+bt.dataset.i]; if (!kt || kt.custom == null || !arenaHost()) return;
        const a = loadCustomKits(); a.splice(kt.custom, 1); saveCustomKits(a); if (AR.def && AR.def.name === kt.name) { AR.def = null; S.arena.kit = null; arenaSend({ a: 'pick', def: null }); } toast('Deleted the kit "' + kt.name + '"', 2); rebuildKits(); })); }
    renderLobby(); return r; }; }
// ---- the kit editor ----
function kitEditStart() {
  const A = S.arena; if (!A || A.phase !== 'cage' || AR.live || !arenaHost()) return; if (loadCustomKits().length >= 12) { toast('You already have 12 custom kits. Right-click one to delete it', 3); return; }
  closeKitPicker(); AR.editing = true; for (let i = 0; i <= 40; i++) player.inv[i] = null; invDirty(); setMode('creative'); player.flying = false;
  chatPrint('Kit editor: open your inventory (E), take what the kit should have, and put armour and the off-hand item in their slots. Press K when it is ready.', '#ff5'); }
function kitEditEnd() { AR.editing = false; if (S.uiOpen === 'kitsave') S.uiOpen = null; const d = $('kitSave'); if (d) d.style.display = 'none'; for (let i = 0; i <= 40; i++) player.inv[i] = null; invDirty(); setMode('survival'); player.flying = false; openKitPicker(); }
function kitMaxEnch(s) {
  const it = ITEMS[s.id]; if (!it || s.ench) return; let e = null;
  if (it.kind === 'armor') { e = { protection: 4, unbreaking: 3, mending: 1 }; if (it.slot === 'feet') e.feather_falling = 4; }
  else if (it.key === 'elytra' || it.kind === 'shield') e = { unbreaking: 3, mending: 1 };
  else if (it.kind === 'mace') e = { density: 5, wind_burst: 1, unbreaking: 3 };
  else if (it.kind === 'bow') e = { power: 5, unbreaking: 3 };
  else if (it.kind === 'crossbow') e = { quick_charge: 3, unbreaking: 3 };
  else if (it.kind === 'trident') e = { loyalty: 3, unbreaking: 3 };
  else if (it.kind === 'tool') e = it.tool === 'sword' ? { sharpness: 5, sweeping_edge: 3, unbreaking: 3 } : it.tool === 'axe' ? { sharpness: 5, efficiency: 5, unbreaking: 3 } : it.tool === 'spear' ? { sharpness: 5, lunge: 3, unbreaking: 3 } : { efficiency: 5, unbreaking: 3 };
  if (e) { s.ench = {}; for (const k in e) if (ENCH[k]) s.ench[k] = e[k]; }
}
function kitSaveDialog() {
  let d = $('kitSave');
  if (!d) { d = document.createElement('div'); d.id = 'kitSave'; d.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;gap:12px;background:rgba(0,0,0,.6);z-index:61;color:#fff';
    const bs = 'background:#3b3b3b;border:3px solid #1c1c1c;box-shadow:inset 2px 2px 0 #6a6a6a,inset -2px -2px 0 #262626;color:#fff;padding:8px 16px;cursor:pointer;font-family:inherit;font-size:16px';
    d.innerHTML = '<div style="font-size:28px;text-shadow:2px 2px 0 #333">Save this kit</div><div id="kitSaveInfo" style="color:#ccc;font-size:14px"></div><input id="kitSaveName" type="text" maxlength="20" placeholder="Kit name" style="width:300px;height:36px;background:#111;border:2px solid #777;color:#fff;font-family:inherit;font-size:18px;padding:0 8px">' +
      '<label style="font-size:15px;cursor:pointer"><input id="kitSaveMax" type="checkbox" checked> Give unenchanted gear the best enchantments (Protection IV, Sharpness V and so on)</label>' +
      '<div style="display:flex;gap:10px"><button id="kitSaveOk" style="' + bs + ';background:#3f7a2c">Save kit</button><button id="kitSaveBack" style="' + bs + '">Keep editing</button><button id="kitSaveDrop" style="' + bs + '">Discard</button></div>';
    document.body.appendChild(d);
    const nm = d.querySelector('#kitSaveName'); nm.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') kitSaveNow(); if (e.key === 'Escape') kitSaveClose(); });
    const on = (id, fn) => d.querySelector(id).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
    on('#kitSaveOk', kitSaveNow); on('#kitSaveBack', kitSaveClose); on('#kitSaveDrop', kitEditEnd); }
  const n = player.inv.filter(Boolean).length; d.querySelector('#kitSaveInfo').textContent = n ? n + ' item stack' + (n === 1 ? '' : 's') + ' in the kit' : 'Your inventory is empty. Put the kit together first.';
  if (S.uiOpen && S.uiOpen !== 'kitsave') closeInv(true); S.uiOpen = 'kitsave'; for (const kk in keys) keys[kk] = false; mouseL = mouseR = false; d.style.display = 'flex'; releaseLock(); setTimeout(() => d.querySelector('#kitSaveName').focus(), 0);
}
function kitSaveClose() { const d = $('kitSave'); if (d) d.style.display = 'none'; if (S.uiOpen === 'kitsave') S.uiOpen = null; requestLock(); }
function kitSaveNow() {
  const d = $('kitSave'); const all = loadCustomKits(); let name = (d.querySelector('#kitSaveName').value || '').trim().slice(0, 20) || 'Custom ' + (all.length + 1);
  const taken = (n) => KITS.slice(0, KITS_BASE).some(k => k.name === n) || all.some(k => k.name === n); for (let k = 2; taken(name) && k < 99; k++) name = name.replace(/ \d+$/, '') + ' ' + k;
  const max = d.querySelector('#kitSaveMax').checked; const slots = [];
  for (let i = 0; i <= 40; i++) { const s = player.inv[i]; if (!s || !ITEMS[s.id]) continue; const c = Object.assign({}, s); if (max) kitMaxEnch(c); const ex = {}; if (c.ench) ex.ench = c.ench; if (c.pot) ex.pot = c.pot; slots.push([i, ITEMS[s.id].key, s.count, Object.keys(ex).length ? ex : null]); }
  if (!slots.length) { toast('Put something in your inventory first', 2); return; }
  all.push({ name, slots }); saveCustomKits(all); d.querySelector('#kitSaveName').value = ''; kitEditEnd(); rebuildKits(); const i = KITS.findIndex(k => k.name === name); if (i >= 0) pickKit(i); toast('Saved the kit "' + name + '"', 2);
}
{ const _ci = closeInv; closeInv = function (noLock) { if (S.uiOpen === 'kitsave') { kitSaveClose(); return; } return _ci.apply(this, arguments); }; }
addEventListener('keydown', (e) => { if (e.code === 'KeyK' && AR.editing && !/^(INPUT|TEXTAREA)$/.test((e.target && e.target.tagName) || '') && S.rules.arena && !player.dead && (!S.uiOpen || S.uiOpen === 'inv')) { e.preventDefault(); e.stopImmediatePropagation(); kitSaveDialog(); } }, true);
{ const _at = arenaTick; arenaTick = function (dt) { const r = _at.apply(this, arguments); if (AR.editing && S.arena && S.arena.phase === 'cage' && S.uiOpen !== 'kitsave') { player.flying = false; arenaMsg('Kit editor: E for items, K when the kit is ready', 0, true); } return r; }; }
rebuildKits();

// ================= MULTIPLAYER KEEPS RUNNING WHEN THE TAB IS HIDDEN =================
// A browser stops drawing a tab you switch away from (to paste the invite code somewhere, say), and the game loop stops
// with it, so friends saw the host freeze. While the tab is hidden the network part now runs on a timer instead.
setInterval(() => { try { if (document.hidden && typeof MP !== 'undefined' && MP.active && S.started && !S.loading) mpTick(0.5); } catch (e) { } }, 500);

// ================= SMOOTHER, MORE CURRENT PLAYERS =================
// Other players used to be drawn about a sixth of a second behind where they really were (15 updates a second, then
// eased slowly), which is what made hits feel late. Now: 30 updates a second while you move, each carrying your
// speed, and the receiver moves the player forward along that speed between updates and eases faster.
MP.sendIv = 0.033; MP.lerpK = 22; MP.predict = true;
{ const _ms = myState; myState = function () { const s = _ms.apply(this, arguments); const P = player; const v = P.riding && P.riding.vel ? P.riding.vel : P.vel;
    const vy = P.onGround && !P.riding ? 0 : v.y; if (Math.abs(v.x) + Math.abs(vy) + Math.abs(v.z) > 0.05) s.v = [+v.x.toFixed(1), +vy.toFixed(1), +v.z.toFixed(1)]; return s; }; }
{ const _on = onPeerMsg; onPeerMsg = function (peer, m) {
    if (m.t === 'p') { const av = MP.avatars.get(MP.role === 'host' ? peer.id : m.id); if (av) { (av.net || (av.net = new V3())).set(m.x, m.y, m.z); const v = Array.isArray(m.v) ? m.v : null; (av.nvel || (av.nvel = new V3())).set(v ? +v[0] || 0 : 0, v ? +v[1] || 0 : 0, v ? +v[2] || 0 : 0); if (av.nvel.length() > 45) av.nvel.set(0, 0, 0); av.netT = performance.now(); } }
    return _on(peer, m); }; }
{ const _ua = updateAvatars; updateAvatars = function (dt) {
    if (MP.predict) { const now = performance.now(); for (const av of MP.avatars.values()) if (av.net && av.tgt.distanceToSquared(av.net) < 400) av.tgt.copy(av.net).addScaledVector(av.nvel, Math.min((now - av.netT) / 1000, 0.1)); }
    return _ua.apply(this, arguments); }; }

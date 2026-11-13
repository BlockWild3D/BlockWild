// ================= COMMAND SUGGESTIONS AND CLICKABLE CHAT (Minecraft style) =================
// Typing a command shows a list of what fits next (command names, players and selectors, items, blocks, mobs,
// effects, enchantments, structures, biomes, game rules, coordinates of the block you look at...).
// Tab or a click fills in the highlighted one; Up/Down move through the list. In chat, green [x, y, z] coordinates
// (from /locate and others) teleport you when clicked, and a clicked [seed] is copied.
const SUG = { list: [], sel: 0, el: null, open: false, lastText: null };
{ const el = document.createElement('div'); el.id = 'chatSugg'; $('chat').insertBefore(el, $('chatInput')); SUG.el = el;
  el.addEventListener('pointerdown', (e) => { const d = e.target.closest('[data-i]'); if (!d) return; e.preventDefault(); e.stopPropagation(); SUG.sel = +d.dataset.i; acceptSuggestion(); $('chatInput').focus(); }); }
const keysOf = (o) => Object.keys(o);
const lookedBlock = () => { if (!world || !player) return null; const t = raycast(player.eye(), lookDir(), 8); return t ? [t.x, t.y - world.yOff, t.z] : null; };
const PLAYER_ARGS = () => ['@s', '@p', '@a', '@r'].concat(allPlayers().map(p => p.name));
const ENTITY_ARGS = () => ['@e', '@s', '@p', '@a', '@r', '@e[type=zombie]', '@e[type=cow]'].concat(allPlayers().map(p => p.name));
const ITEM_ARGS = () => ITEM_IDS.filter(id => !(ITEMS[id].kind === 'block' && BL[id] && BL[id].hidden)).map(id => ITEMS[id].key);
const BLOCK_ARGS = () => BL.filter(b => b && b.key && !b.hidden).map(b => b.key);
const MOB_ARGS = () => keysOf(MOBS).concat(['tnt', 'lightning_bolt', 'experience_orb']);
const BIOME_ARGS = () => [...new Set(Object.values(BIO_NAME).concat(['Deep Ocean']).map(n => n.toLowerCase().replace(/ /g, '_')))];
// coordinates: the start of a triple can be filled with "~ ~ ~" or the block you are looking at
function posArg(k) { const b = lookedBlock(); const L = ['~ ~ ~', '~ ~', '~'][k]; const out = [L]; if (b) out.unshift(b.slice(k).join(' ')); return out; }
const POS = (start) => (a, i) => posArg((i - start) % 3);
const ARGSPEC = {
  help: [() => keysOf(CMDS)],
  gamemode: [['survival', 'creative', 'adventure', 'spectator'], PLAYER_ARGS],
  give: [PLAYER_ARGS, ITEM_ARGS, ['1', '16', '32', '64']],
  clear: [PLAYER_ARGS, ITEM_ARGS, ['1', '64']],
  tp: [(a) => posArg(0).concat(ENTITY_ARGS()), (a, i) => /^[~^\d-]/.test(a[0]) ? posArg(1) : posArg(0).concat(PLAYER_ARGS()), (a, i) => /^[~^\d-]/.test(a[0]) ? posArg(2) : posArg(1), (a) => /^[~^\d-]/.test(a[0]) ? ['0', '90', '180', '-90'] : posArg(2)],
  time: [['set', 'add', 'query'], (a) => a[0] === 'set' ? ['day', 'noon', 'night', 'midnight', 'sunrise', 'sunset', '1000'] : a[0] === 'query' ? ['daytime', 'gametime', 'day'] : ['1000', '6000', '12000', '1d']],
  kill: [ENTITY_ARGS],
  summon: [MOB_ARGS, POS(1), POS(1), POS(1)],
  setblock: [POS(0), POS(0), POS(0), BLOCK_ARGS, ['replace', 'destroy', 'keep']],
  fill: [POS(0), POS(0), POS(0), POS(3), POS(3), POS(3), BLOCK_ARGS, ['replace', 'destroy', 'keep', 'hollow', 'outline'], (a) => a[7] === 'replace' ? BLOCK_ARGS() : []],
  clone: [POS(0), POS(0), POS(0), POS(3), POS(3), POS(3), POS(6), POS(6), POS(6)],
  effect: [['give', 'clear'], PLAYER_ARGS, () => keysOf(EFFECTS), (a) => a[0] === 'give' ? ['30', '60', '300', 'infinite'] : [], (a) => a[0] === 'give' ? ['0', '1', '2', '4'] : []],
  enchant: [PLAYER_ARGS, () => { const h = player.held(); return keysOf(ENCH).filter(e => !h || enchantFits(h.id, e)); }, (a) => { const E = ENCH[a[1]]; return E ? Array.from({ length: E.max }, (_, i) => String(i + 1)) : ['1']; }],
  xp: [['add', 'set', 'query'], PLAYER_ARGS, (a) => a[0] === 'query' ? ['points', 'levels'] : ['1', '5', '10', '30', '100'], ['points', 'levels']],
  spawnpoint: [PLAYER_ARGS, POS(1), POS(1), POS(1)],
  setworldspawn: [POS(0), POS(0), POS(0)],
  locate: [['structure', 'biome'], (a) => a[0] === 'biome' ? BIOME_ARGS() : keysOf(STRUCT_NAMES)],
  difficulty: [['peaceful', 'easy', 'normal', 'hard']],
  gamerule: [() => keysOf(S.rules), (a) => typeof S.rules[a[0]] === 'number' ? [String(S.rules[a[0]])] : ['true', 'false']],
  msg: [() => allPlayers().filter(p => !p.local).map(p => p.name)],
};
// the commands and argument lists added later by other parts of the game (and mods) still get name completion
function argCandidates(cmd, prev) {
  const spec = ARGSPEC[cmd]; if (!spec) return [];
  const i = prev.length; let s = spec[i]; if (!s) return [];
  let r = typeof s === 'function' ? s(prev, i) : s; return Array.isArray(r) ? r : [];
}
function computeSuggestions(text) {
  if (!text.startsWith('/')) return { list: [], from: 0 };
  const body = text.slice(1); const parts = body.split(' ');
  if (parts.length === 1) { const p = parts[0].toLowerCase(); const names = keysOf(CMDS).concat(keysOf(CMD_ALIAS)).filter(k => k.startsWith(p)).sort(); return { list: names.slice(0, 40), from: 1 }; }
  const cmd = CMD_ALIAS[parts[0].toLowerCase()] || parts[0].toLowerCase(); const prev = parts.slice(1, -1); const partial = parts[parts.length - 1];
  const all = argCandidates(cmd, prev); const pl = partial.toLowerCase().replace(/^minecraft:/, '');
  const starts = all.filter(c => c.toLowerCase().startsWith(pl)); const inner = pl ? all.filter(c => !c.toLowerCase().startsWith(pl) && c.toLowerCase().includes('_' + pl)) : [];
  const list = [...new Set(starts.concat(inner))]; if (list.length === 1 && list[0].toLowerCase() === pl) return { list: [], from: text.length - partial.length };
  return { list: list.slice(0, 60), from: text.length - partial.length };
}
function renderSuggestions() {
  const el = SUG.el; const inp = $('chatInput');
  const hint = $('chatHint');
  if (!SUG.list.length || !$('chat').classList.contains('open')) { el.style.display = 'none'; SUG.open = false; hint.style.visibility = ''; return; }
  hint.style.visibility = 'hidden';
  SUG.open = true; el.style.display = 'block'; el.style.bottom = (inp.offsetHeight + 2) + 'px';
  // show up to 10 around the selection, like Minecraft
  const n = SUG.list.length, start = Math.max(0, Math.min(SUG.sel - 4, n - 10));
  el.innerHTML = SUG.list.slice(start, start + 10).map((s, k) => { const i = start + k; return '<div data-i="' + i + '" class="' + (i === SUG.sel ? 'on' : '') + '">' + s.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</div>'; }).join('') + (n > 10 ? '<div class="more">' + (SUG.sel + 1) + ' / ' + n + '</div>' : '');
  // line the list up under the word being completed
  const meas = SUG.meas || (SUG.meas = (() => { const c = document.createElement('canvas').getContext('2d'); return c; })()); meas.font = getComputedStyle(inp).font;
  el.style.left = Math.min(inp.offsetWidth - 120, 6 + meas.measureText(inp.value.slice(0, SUG.from)).width) + 'px';
}
function refreshSuggestions(keepSel) {
  const v = $('chatInput').value; if (v === SUG.lastText && keepSel) return; SUG.lastText = v;
  const r = computeSuggestions(v); SUG.list = r.list; SUG.from = r.from; if (!keepSel) SUG.sel = 0; SUG.sel = Math.min(SUG.sel, Math.max(0, r.list.length - 1)); renderSuggestions();
}
function acceptSuggestion() {
  if (!SUG.list.length) return false; const inp = $('chatInput'); const s = SUG.list[SUG.sel];
  inp.value = inp.value.slice(0, SUG.from) + s + ' '; inp.setSelectionRange(inp.value.length, inp.value.length); updateChatHint(); refreshSuggestions(false); return true;
}
$('chatInput').addEventListener('input', () => refreshSuggestions(false));
$('chatInput').addEventListener('keydown', (e) => {
  if (e.key === 'Tab') { if (SUG.list.length) { e.preventDefault(); e.stopImmediatePropagation(); acceptSuggestion(); } return; }
  if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && SUG.open && CHAT.hi < 0) { e.preventDefault(); e.stopImmediatePropagation(); const n = SUG.list.length; SUG.sel = (SUG.sel + (e.key === 'ArrowDown' ? 1 : -1) + n) % n; renderSuggestions(); return; }
  if (e.key === 'Enter' || e.key === 'Escape') { SUG.list = []; renderSuggestions(); }
}, { capture: true });
{ const _oc = openChat; openChat = function () { const r = _oc.apply(this, arguments); SUG.lastText = null; setTimeout(() => refreshSuggestions(false), 0); return r; };
  const _cc = closeChat; closeChat = function () { SUG.list = []; renderSuggestions(); return _cc.apply(this, arguments); }; }

// ---------- clickable chat ----------
// any "[x, y, z]" in a chat line becomes a link that teleports you there ("~" for y means the ground)
{ const _cp = chatPrint; chatPrint = function (text, color, html) {
    if (!html && typeof text === 'string' && /\[(-?\d+), (-?\d+|~), (-?\d+)\]/.test(text)) {
      const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      const h = esc.replace(/\[(-?\d+), (-?\d+|~), (-?\d+)\]/g, (m, x, y, z) => '<span class="chatlink" data-tp="' + x + ' ' + y + ' ' + z + '" title="Click to teleport">[' + x + ', ' + y + ', ' + z + ']</span>');
      return _cp(h, color, true);
    }
    return _cp(text, color, html);
  }; }
$('chatLog').addEventListener('pointerdown', (e) => {
  const a = e.target.closest('.chatlink'); if (!a) return; e.preventDefault(); e.stopPropagation();
  if (a.dataset.copy != null) { const t = a.dataset.copy; try { navigator.clipboard.writeText(t).then(() => toast('Copied ' + t, 1.5), () => toast('Seed: ' + t, 2)); } catch (er) { toast('Seed: ' + t, 2); } return; }
  if (a.dataset.tp) {
    const [x, y, z] = a.dataset.tp.split(' '); closeChat();
    if (y === '~') { if (runCommand('tp @s ' + x + ' ~ ' + z, { player, local: true })) S.tpGround = { x: +x, z: +z, t: 20 }; }
    else runCommand('tp @s ' + x + ' ' + y + ' ' + z, { player, local: true });
  }
});
// after a "~" teleport, drop onto the ground as soon as it's loaded (the Nether's roof is skipped)
function settleTeleport(dt) {
  const T2 = S.tpGround; if (!T2 || !world) return; T2.t -= dt; if (T2.t <= 0) { S.tpGround = null; return; }
  const x = Math.floor(T2.x), z = Math.floor(T2.z); if (!world.loaded(x, z)) { player.vel.set(0, 0, 0); return; }
  let y = -1;
  if (world.dim === 'nether') { for (let yy = 100; yy > 32; yy--) if (!world.solid(x, yy, z) && !world.solid(x, yy + 1, z) && world.solid(x, yy - 1, z)) { y = yy; break; } }
  else { const c = world.getChunk(x >> 4, z >> 4); for (let yy = Math.min(WH - 2, (c ? c.maxY : WH - 2) + 1); yy > 1; yy--) if (world.solid(x, yy, z)) { y = yy + 1; break; } }
  if (y > 0) { player.pos.set(x + 0.5, y + 0.01, z + 0.5); player.vel.set(0, 0, 0); player.peak = null; }
  S.tpGround = null;
}
{ const _ub = updateBoats; updateBoats = function (dt) { const r = _ub(dt); settleTeleport(dt); return r; }; }

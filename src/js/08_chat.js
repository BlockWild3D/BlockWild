// ================= CHAT, COMMANDS, STATUS EFFECTS, GAME RULES =================
// Chat opens with T (or / to start a command). Commands follow Minecraft Java syntax and need Creative mode
// (like Minecraft's "cheats"); /help works everywhere.
const CHAT = { hist: [], hi: -1, onSend: null, max: 100 };
S.rules = { keepInventory: false, doDaylightCycle: true, doMobSpawning: true, mobGriefing: true, fallDamage: true, naturalRegeneration: true, showCoordinates: false, doImmediateRespawn: false };
S.difficulty = 'normal';

function chatPrint(text, color, html) {
  const log = $('chatLog'); const d = document.createElement('div'); d.className = 'cl';
  if (html) d.innerHTML = text; else d.textContent = text; if (color) d.style.color = color;
  log.appendChild(d); while (log.children.length > CHAT.max) log.removeChild(log.firstChild);
  log.scrollTop = log.scrollHeight; setTimeout(() => d.classList.add('fade'), 10000);
}
function openChat(prefill) {
  if (!S.started || S.loading || S.paused || player.dead || S.uiOpen) return;
  S.uiOpen = 'chat'; for (const k in keys) keys[k] = false; mouseL = mouseR = false;
  $('chat').classList.add('open'); const inp = $('chatInput'); inp.value = prefill || ''; CHAT.hi = -1; releaseLock(); setTimeout(() => { inp.focus(); updateChatHint(); }, 0);
}
function closeChat(noLock) { $('chat').classList.remove('open'); $('chatInput').blur(); S.uiOpen = null; if (!noLock) requestLock(); }
function updateChatHint() {
  const v = $('chatInput').value; const h = $('chatHint');
  if (!v.startsWith('/')) { h.textContent = ''; h.style.display = 'none'; return; }
  const name = v.slice(1).split(' ')[0].toLowerCase(); const c = CMDS[CMD_ALIAS[name] || name];
  const list = c ? ['/' + (CMD_ALIAS[name] || name) + ' ' + c.usage] : Object.keys(CMDS).filter(k => k.startsWith(name)).slice(0, 8).map(k => '/' + k);
  h.textContent = list.join('   '); h.style.display = list.length ? 'block' : 'none';
}
$('chatInput').addEventListener('input', updateChatHint);
$('chatInput').addEventListener('keydown', (e) => {
  e.stopPropagation(); const inp = e.target;
  if (e.key === 'Enter') { const v = inp.value.trim(); closeChat(); if (v) submitChat(v); }
  else if (e.key === 'Escape') { e.preventDefault(); closeChat(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); if (CHAT.hist.length) { CHAT.hi = Math.min(CHAT.hist.length - 1, CHAT.hi + 1); inp.value = CHAT.hist[CHAT.hist.length - 1 - CHAT.hi]; updateChatHint(); } }
  else if (e.key === 'ArrowDown') { e.preventDefault(); CHAT.hi = Math.max(-1, CHAT.hi - 1); inp.value = CHAT.hi < 0 ? '' : CHAT.hist[CHAT.hist.length - 1 - CHAT.hi]; updateChatHint(); }
  else if (e.key === 'Tab') { e.preventDefault(); const v = inp.value; if (v.startsWith('/') && !v.includes(' ')) { const m = Object.keys(CMDS).filter(k => k.startsWith(v.slice(1).toLowerCase())); if (m.length === 1) inp.value = '/' + m[0] + ' '; updateChatHint(); } }
});
$('chatInput').addEventListener('keyup', (e) => e.stopPropagation());
function myName() { return (typeof PROFILE !== 'undefined' && PROFILE.name) || 'Player'; }
function submitChat(text) {
  CHAT.hist.push(text); if (CHAT.hist.length > 50) CHAT.hist.shift();
  if (text.startsWith('/')) { runCommand(text.slice(1), { player, local: true }); return; }
  chatPrint('<' + myName() + '> ' + text);
  if (CHAT.onSend) CHAT.onSend({ t: 'chat', from: myName(), text });
}

// ---------- status effects ----------
const EFFECTS = {
  speed: 'Speed', slowness: 'Slowness', haste: 'Haste', strength: 'Strength', instant_health: 'Instant Health', instant_damage: 'Instant Damage',
  jump_boost: 'Jump Boost', regeneration: 'Regeneration', resistance: 'Resistance', fire_resistance: 'Fire Resistance', night_vision: 'Night Vision',
  poison: 'Poison', levitation: 'Levitation', slow_falling: 'Slow Falling', weakness: 'Weakness',
};
player.effects = {};
function giveEffect(name, seconds, amp) {
  if (name === 'instant_health') { player.health = Math.min(20, player.health + 4 * Math.pow(2, amp)); updateHearts(); return; }
  if (name === 'instant_damage') { player.hurtCD = 0; player.hurt(6 * Math.pow(2, amp), null, 'magic', 0); return; }
  player.effects[name] = { t: seconds, amp };
}
function effLevel(name) { const e = player.effects[name]; return e ? e.amp + 1 : 0; }
function updateEffects(dt) {
  let txt = '';
  for (const k in player.effects) {
    const e = player.effects[k]; e.t -= dt; if (e.t <= 0) { delete player.effects[k]; continue; }
    if (k === 'regeneration') { e.acc = (e.acc || 0) + dt; const iv = 2.5 / Math.pow(2, e.amp); if (e.acc >= iv) { e.acc = 0; if (player.health < 20) { player.health = Math.min(20, player.health + 1); updateHearts(); } } }
    if (k === 'poison') { e.acc = (e.acc || 0) + dt; const iv = 1.25 / Math.pow(2, e.amp); if (e.acc >= iv) { e.acc = 0; if (player.health > 1 && isSurv()) { player.health -= 1; updateHearts(); Sfx.play('hurt', 0.4); } } }
    const sec = Math.ceil(e.t); txt += EFFECTS[k] + (e.amp ? ' ' + roman(e.amp + 1) : '') + '  ' + Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0') + '<br>';
  }
  $('effects').innerHTML = txt;
}
function roman(n) { return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] || String(n); }

// ---------- command parsing ----------
class CmdError extends Error { }
function tokenize(s) {
  const out = []; let i = 0;
  while (i < s.length) {
    if (s[i] === ' ') { i++; continue; }
    let j = i, depth = 0, q = null;
    while (j < s.length) { const c = s[j]; if (q) { if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if (c === '[' || c === '{') depth++; else if (c === ']' || c === '}') depth--; else if (c === ' ' && depth <= 0) break; j++; }
    let t = s.slice(i, j); if ((t[0] === '"' && t[t.length - 1] === '"') || (t[0] === "'" && t[t.length - 1] === "'")) t = t.slice(1, -1); out.push(t); i = j;
  }
  return out;
}
const strip = (id) => String(id).toLowerCase().replace(/^minecraft:/, '').replace(/^blockwild:/, '');
function parseCoord(tok, base, axis, ctx) { // supports 10, ~, ~-3, ^ ^ ^2 (local)
  if (tok === undefined) throw new CmdError('Expected a coordinate');
  if (tok[0] === '~') { const n = tok.length > 1 ? parseFloat(tok.slice(1)) : 0; if (isNaN(n)) throw new CmdError('Invalid coordinate ' + tok); return base[axis] + n; }
  const n = parseFloat(tok); if (isNaN(n)) throw new CmdError('Invalid coordinate ' + tok);
  if (axis === 'y') return n + (world ? world.yOff : 0); // typed heights are Minecraft heights (y -64 to 319)
  return /^-?\d+$/.test(tok) ? n + 0.5 : n;
}
function parsePos(args, i, ctx, block) {
  const base = ctx.pos || player.pos;
  if (args[i] && args[i][0] === '^') { // local coordinates: left, up, forward
    const l = parseFloat(args[i].slice(1)) || 0, u = parseFloat((args[i + 1] || '^').slice(1)) || 0, f = parseFloat((args[i + 2] || '^').slice(1)) || 0;
    const yaw = player.yaw, pitch = player.pitch; const fwd = new V3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)); const left = new V3(-Math.cos(yaw), 0, Math.sin(yaw)); const up = new V3().crossVectors(left, fwd).negate();
    const eye = player.eye(); const p = eye.addScaledVector(left, l).addScaledVector(up, u).addScaledVector(fwd, f); return block ? p.floor() : p;
  }
  const p = new V3(parseCoord(args[i], base, 'x', ctx), parseCoord(args[i + 1], base, 'y', ctx), parseCoord(args[i + 2], base, 'z', ctx));
  return block ? p.floor() : p;
}
function parseOpts(s) { // [type=zombie,distance=..10,limit=1]
  const o = {}; if (!s) return o; for (const part of s.slice(1, -1).split(',')) { const [k, v] = part.split('='); if (k) o[k.trim()] = (v || '').trim(); } return o;
}
function inRange(v, spec) { if (!spec) return true; const m = spec.split('..'); if (m.length === 1) return v === parseFloat(spec); const a = m[0] === '' ? -Infinity : parseFloat(m[0]), b = m[1] === '' ? Infinity : parseFloat(m[1]); return v >= a && v <= b; }
// entities: the local player, remote players (multiplayer), and mobs
function allPlayers() { const list = [{ kind: 'player', name: myName(), pos: player.pos, ref: player, local: true }]; if (typeof MP !== 'undefined' && MP.peers) for (const p of MP.remotePlayers()) list.push(p); return list; }
function selectTargets(tok, ctx, allowEntities = true) {
  if (!tok) return [allPlayers()[0]];
  const m = tok.match(/^@([sparen])(\[.*\])?$/);
  if (!m) { const p = allPlayers().find(p => p.name.toLowerCase() === tok.toLowerCase()); if (!p) throw new CmdError('No player was found'); return [p]; }
  const o = parseOpts(m[2]); const base = ctx.pos || player.pos; let list;
  if (m[1] === 's') list = [allPlayers()[0]];
  else if (m[1] === 'a' || m[1] === 'p' || m[1] === 'r') list = allPlayers();
  else { if (!allowEntities) throw new CmdError('Only players may be affected by this command'); list = allPlayers().concat(G.mobs.filter(x => !x.dead && !x.gone).map(x => ({ kind: 'mob', name: x.type, pos: x.pos, ref: x }))); }
  if (o.type) { const neg = o.type[0] === '!'; const ty = strip(o.type.replace('!', '')); list = list.filter(e => ((e.kind === 'player' ? 'player' : e.name) === ty) !== neg); }
  if (o.name) list = list.filter(e => e.name === o.name);
  if (o.distance) list = list.filter(e => inRange(e.pos.distanceTo(base), o.distance));
  const sort = o.sort || (m[1] === 'p' ? 'nearest' : m[1] === 'r' ? 'random' : 'arbitrary');
  if (sort === 'nearest') list.sort((a, b) => a.pos.distanceTo(base) - b.pos.distanceTo(base)); else if (sort === 'furthest') list.sort((a, b) => b.pos.distanceTo(base) - a.pos.distanceTo(base)); else if (sort === 'random') list.sort(() => Math.random() - 0.5);
  const lim = o.limit ? parseInt(o.limit) : (m[1] === 'p' || m[1] === 'r') ? 1 : Infinity; list = list.slice(0, lim);
  if (!list.length) throw new CmdError(m[1] === 'e' ? 'No entity was found' : 'No player was found');
  return list;
}
function onlyLocal(t, what) { if (!t.local) { if (t.kind === 'player' && typeof MP !== 'undefined') { MP.remoteCommand(t, what); return false; } } return t.local; }
function parseItem(tok) { // diamond_sword, minecraft:diamond_sword[enchantments={sharpness:5,looting:3}]
  if (!tok) throw new CmdError('Expected an item');
  const m = tok.match(/^([^\[{]+)(\[.*\]|\{.*\})?$/); const key = strip(m[1]); const id = IT[key];
  if (id === undefined) throw new CmdError('Unknown item \'' + key + '\'');
  let ench = null; if (m[2]) { const em = m[2].match(/enchantments\s*[=:]\s*\{([^}]*)\}/i); if (em) { ench = {}; for (const p of em[1].split(',')) { const [k, v] = p.split(':'); if (k && ENCH[strip(k.trim())]) ench[strip(k.trim())] = Math.max(1, parseInt(v) || 1); } } }
  return { id, key, ench };
}
function parseBlock(tok) { const key = strip(tok || ''); if (key === 'air') return 0; const id = B[key.toUpperCase()]; if (id === undefined || BL[id].hidden) throw new CmdError('Unknown block type \'' + key + '\''); return id; }
function num(tok, what, min = -Infinity, max = Infinity, int = true) { const n = int ? parseInt(tok) : parseFloat(tok); if (tok === undefined || isNaN(n)) throw new CmdError('Expected ' + what); if (n < min || n > max) throw new CmdError(what[0].toUpperCase() + what.slice(1) + ' must be between ' + min + ' and ' + max); return n; }
function ok(msg) { chatPrint(msg, '#ccc'); }
function fmt(v) { return (Math.round(v * 100) / 100).toString(); }
function fmtY(v) { return fmt(v - (world ? world.yOff : 0)); } // heights shown the Minecraft way
function timeTicks() { return Math.round(S.time * 24000) % 24000; }
function setBlockCmd(x, y, z, id, mode) {
  if (y < 1 || y >= WH) return false; const cur = world.get(x, y, z);
  if (mode === 'keep' && cur) return false; if (cur === id) return false;
  if (mode === 'destroy' && cur) { Particles.blockBreak(x, y, z, cur); const dr = blockDrop(cur); if (dr) dropItem(dr[0], dr[1], x + 0.5, y + 0.4, z + 0.5); }
  if (cur) onBlockRemoved(x, y, z, cur);
  world.set(x, y, z, id); if (typeof MP !== 'undefined') MP.blockChanged(x, y, z, id); return true;
}
const MOBNAMES = () => Object.keys(MOBS);
const STRUCT_NAMES = { village: 'village', village_plains: 'village', village_desert: 'village', village_snowy: 'village', desert_pyramid: 'pyramid', pyramid: 'pyramid', ruined_portal: 'ruined_portal', watchtower: 'tower', tower: 'tower', pillager_outpost: 'tower', desert_well: 'desert_well', monster_room: 'dungeon', dungeon: 'dungeon', stronghold: 'stronghold', fortress: 'fortress' };
const CMD_ALIAS = { teleport: 'tp', tell: 'msg', w: 'msg', experience: 'xp' };
const CMDS = {
  help: { usage: '[command]', free: true, run(a) { if (a[0]) { const k = CMD_ALIAS[a[0]] || a[0]; if (!CMDS[k]) throw new CmdError('Unknown command: ' + a[0]); ok('/' + k + ' ' + CMDS[k].usage); return; } ok('Commands: ' + Object.keys(CMDS).map(k => '/' + k).join(' ')); ok('Type /help <command> for its usage. Commands work in Creative mode or when cheats are allowed.'); } },
  gamemode: { usage: '<survival|creative> [target]', run(a, ctx) {
    const m = { survival: 'survival', s: 'survival', '0': 'survival', creative: 'creative', c: 'creative', '1': 'creative' }[String(a[0]).toLowerCase()];
    if (!m) { if (['adventure', 'spectator'].includes(String(a[0]).toLowerCase())) throw new CmdError(a[0] + ' mode is not in BlockWild yet'); throw new CmdError('Unknown game mode: ' + a[0]); }
    for (const t of selectTargets(a[1], ctx, false)) { if (onlyLocal(t, '/gamemode ' + m)) { setMode(m); ok('Set own game mode to ' + (m === 'survival' ? 'Survival' : 'Creative') + ' Mode'); } else ok('Set ' + t.name + "'s game mode to " + m); } } },
  give: { usage: '<target> <item> [count]', run(a, ctx) {
    const it = parseItem(a[1]); const n = a[2] !== undefined ? num(a[2], 'count', 1, 6400) : 1; let given = 0;
    for (const t of selectTargets(a[0], ctx, false)) { if (onlyLocal(t, '/give @s ' + a[1] + ' ' + n)) { let left = n; while (left > 0) { const k = Math.min(left, stackMax(it.id)); const r = addTo(player.inv, it.id, k, INV_ORDER, it.ench ? { ench: it.ench } : null); invDirty(); if (r > 0) { dropItem(it.id, r, player.pos.x, player.pos.y + 1, player.pos.z, false, it.ench ? { ench: it.ench } : null); } left -= k; } } given++; }
    ok('Gave ' + n + ' [' + ITEMS[it.id].name + '] to ' + (given === 1 ? selectTargets(a[0], ctx, false)[0].name : given + ' players')); } },
  clear: { usage: '[target] [item] [maxCount]', run(a, ctx) {
    const it = a[1] ? parseItem(a[1]) : null; const max = a[2] !== undefined ? num(a[2], 'max count', 0) : Infinity;
    for (const t of selectTargets(a[0], ctx, false)) { if (!onlyLocal(t, '/clear @s ' + (a[1] || '') + ' ' + (a[2] || ''))) continue; let removed = 0;
      for (let i = 0; i < player.inv.length; i++) { const s = player.inv[i]; if (!s || (it && s.id !== it.id)) continue; const k = Math.min(s.count, max - removed); if (max === 0) { removed += s.count; continue; } s.count -= k; removed += k; if (s.count <= 0) player.inv[i] = null; if (removed >= max) break; }
      invDirty(); if (!removed) throw new CmdError('No items were found on player ' + t.name); ok((max === 0 ? 'Found ' : 'Removed ') + removed + ' item(s) from player ' + t.name); } } },
  tp: { usage: '<destination> | <x y z> | <targets> <destination|x y z> [yaw pitch]', run(a, ctx) {
    let targets, dest, yaw, pitch; const isNum = (t) => t !== undefined && /^[~^]?-?[\d.]*$/.test(t);
    if (a.length >= 3 && isNum(a[0])) { targets = [allPlayers()[0]]; dest = parsePos(a, 0, ctx); if (a[3] !== undefined) { yaw = parseFloat(a[3]); pitch = parseFloat(a[4] || 0); } }
    else if (a.length === 1) { targets = [allPlayers()[0]]; dest = selectTargets(a[0], ctx)[0].pos.clone(); }
    else if (a.length >= 4) { targets = selectTargets(a[0], ctx); dest = parsePos(a, 1, ctx); if (a[4] !== undefined) { yaw = parseFloat(a[4]); pitch = parseFloat(a[5] || 0); } }
    else if (a.length === 2) { targets = selectTargets(a[0], ctx); dest = selectTargets(a[1], ctx)[0].pos.clone(); }
    else throw new CmdError('Usage: /tp ' + CMDS.tp.usage);
    for (const t of targets) {
      if (t.kind === 'mob') { t.ref.pos.copy(dest); t.ref.vel.set(0, 0, 0); continue; }
      if (!onlyLocal(t, '/tp @s ' + fmt(dest.x) + ' ' + fmtY(dest.y) + ' ' + fmt(dest.z))) continue;
      player.pos.copy(dest); player.vel.set(0, 0, 0); player.peak = null; if (yaw !== undefined && !isNaN(yaw)) { player.yaw = -yaw * Math.PI / 180 + Math.PI; player.pitch = -(pitch || 0) * Math.PI / 180; } world.lastCenter = null; S.boost = true;
    }
    ok('Teleported ' + (targets.length === 1 ? targets[0].name : targets.length + ' entities') + ' to ' + fmt(dest.x) + ', ' + fmtY(dest.y) + ', ' + fmt(dest.z)); } },
  time: { usage: 'set <day|noon|night|midnight|ticks> | add <ticks> | query <daytime|gametime|day>', run(a) {
    const named = { day: 1000, noon: 6000, night: 13000, midnight: 18000, sunrise: 23000, sunset: 12000 };
    const val = (t) => { if (named[t] !== undefined) return named[t]; const m = String(t).match(/^(\d+(?:\.\d+)?)(d|s|t)?$/); if (!m) throw new CmdError('Invalid time ' + t); return parseFloat(m[1]) * (m[2] === 'd' ? 24000 : m[2] === 's' ? 20 : 1); };
    if (a[0] === 'set') { const v = val(a[1]); S.time = (v % 24000) / 24000; ok('Set the time to ' + Math.round(v)); }
    else if (a[0] === 'add') { const v = val(a[1]); const tot = S.time * 24000 + v; S.day += Math.floor(tot / 24000); S.time = ((tot % 24000) + 24000) % 24000 / 24000; ok('Set the time to ' + timeTicks()); }
    else if (a[0] === 'query') { const q = a[1] || 'daytime'; ok('The time is ' + (q === 'day' ? S.day - 1 : q === 'gametime' ? Math.round((S.day - 1) * 24000 + timeTicks()) : timeTicks())); }
    else throw new CmdError('Usage: /time ' + CMDS.time.usage);
    if (typeof MP !== 'undefined') MP.timeChanged(); } },
  weather: { usage: '<clear|rain|thunder>', run() { throw new CmdError('Weather is not in BlockWild yet - the sky is always clear'); } },
  kill: { usage: '[targets]', run(a, ctx) {
    const ts = selectTargets(a[0] || '@s', ctx); let n = 0;
    for (const t of ts) { if (t.kind === 'mob') { if (t.ref.isBoss) { t.ref.hurt(9999, null); } else { t.ref.hurt(9999, null, 0, true); } n++; } else if (onlyLocal(t, '/kill @s')) { player.health = 0; player.die('the void'); n++; } else n++; }
    ok(n === 1 ? 'Killed ' + ts[0].name : 'Killed ' + n + ' entities'); } },
  summon: { usage: '<entity> [x y z]', run(a, ctx) {
    const ty = strip(a[0] || ''); const pos = a[1] !== undefined ? parsePos(a, 1, ctx) : player.pos.clone();
    if (ty === 'tnt') { primeTNT(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z), 4); ok('Summoned new Primed TNT'); return; }
    if (ty === 'lightning_bolt') { explode(pos.x, pos.y, pos.z, 1.5); ok('Summoned new Lightning Bolt'); return; }
    if (ty === 'experience_orb') { spawnOrb(pos.x, pos.y, pos.z, 5); ok('Summoned new Experience Orb'); return; }
    if (!MOBS[ty]) throw new CmdError('Unknown entity: ' + ty + '. Try: ' + MOBNAMES().join(', '));
    spawnMob(ty, pos.x, pos.y, pos.z); ok('Summoned new ' + ty.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())); } },
  setblock: { usage: '<x y z> <block> [destroy|keep|replace]', run(a, ctx) { const p = parsePos(a, 0, ctx, true); const id = parseBlock(a[3]); if (!world.loaded(p.x, p.z)) throw new CmdError('That position is not loaded'); if (!setBlockCmd(p.x, p.y, p.z, id, a[4] || 'replace')) throw new CmdError('Could not set the block'); ok('Changed the block at ' + p.x + ', ' + (p.y - world.yOff) + ', ' + p.z); } },
  fill: { usage: '<from> <to> <block> [replace <filter>|destroy|keep|hollow|outline]', run(a, ctx) {
    const p1 = parsePos(a, 0, ctx, true), p2 = parsePos(a, 3, ctx, true); const id = parseBlock(a[6]); const mode = a[7] || 'replace'; const filter = mode === 'replace' && a[8] ? parseBlock(a[8]) : null;
    const x0 = Math.min(p1.x, p2.x), x1 = Math.max(p1.x, p2.x), y0 = Math.max(1, Math.min(p1.y, p2.y)), y1 = Math.min(WH - 1, Math.max(p1.y, p2.y)), z0 = Math.min(p1.z, p2.z), z1 = Math.max(p1.z, p2.z);
    const vol = (x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1); if (vol > 32768) throw new CmdError('Too many blocks in the specified area (maximum 32768, specified ' + vol + ')');
    let n = 0; for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      if (!world.loaded(x, z)) continue; const edge = x === x0 || x === x1 || y === y0 || y === y1 || z === z0 || z === z1;
      if (filter !== null && world.get(x, y, z) !== filter) continue;
      if (mode === 'outline' && !edge) continue; const bid = mode === 'hollow' && !edge ? 0 : id;
      if (setBlockCmd(x, y, z, bid, mode === 'keep' ? 'keep' : mode === 'destroy' ? 'destroy' : 'replace')) n++;
    }
    if (!n) throw new CmdError('No blocks were filled'); ok('Successfully filled ' + n + ' block(s)'); } },
  clone: { usage: '<begin> <end> <destination>', run(a, ctx) {
    const p1 = parsePos(a, 0, ctx, true), p2 = parsePos(a, 3, ctx, true), d = parsePos(a, 6, ctx, true);
    const x0 = Math.min(p1.x, p2.x), x1 = Math.max(p1.x, p2.x), y0 = Math.min(p1.y, p2.y), y1 = Math.max(p1.y, p2.y), z0 = Math.min(p1.z, p2.z), z1 = Math.max(p1.z, p2.z);
    const vol = (x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1); if (vol > 32768) throw new CmdError('Too many blocks in the specified area (maximum 32768, specified ' + vol + ')');
    const buf = []; for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) buf.push([x - x0, y - y0, z - z0, world.get(x, y, z)]);
    let n = 0; for (const [dx, dy, dz, id] of buf) if (setBlockCmd(d.x + dx, d.y + dy, d.z + dz, id, 'replace')) n++; ok(n + ' block(s) cloned'); } },
  effect: { usage: 'give <target> <effect> [seconds] [amplifier] | clear [target] [effect]', run(a, ctx) {
    if (a[0] === 'clear') { for (const t of selectTargets(a[1], ctx, false)) if (onlyLocal(t, '/effect clear @s ' + (a[2] || ''))) { if (a[2]) delete player.effects[strip(a[2])]; else player.effects = {}; } ok('Removed effect(s)'); return; }
    if (a[0] !== 'give') throw new CmdError('Usage: /effect ' + CMDS.effect.usage);
    const ef = strip(a[2] || ''); if (!EFFECTS[ef]) throw new CmdError('Unknown effect: ' + ef + '. Try: ' + Object.keys(EFFECTS).join(', '));
    const sec = a[3] === 'infinite' ? 1e9 : a[3] !== undefined ? num(a[3], 'seconds', 1, 1000000) : 30; const amp = a[4] !== undefined ? num(a[4], 'amplifier', 0, 255) : 0;
    for (const t of selectTargets(a[1], ctx, false)) if (onlyLocal(t, '/effect give @s ' + ef + ' ' + (a[3] || 30) + ' ' + amp)) giveEffect(ef, sec, amp);
    ok('Applied effect ' + EFFECTS[ef] + ' to ' + selectTargets(a[1], ctx, false).length + ' target(s)'); } },
  enchant: { usage: '<target> <enchantment> [level]', run(a, ctx) {
    const en = strip(a[1] || ''); const E = ENCH[en]; if (!E) throw new CmdError('Unknown enchantment: ' + en + '. Try: ' + Object.keys(ENCH).join(', '));
    const lv = a[2] !== undefined ? num(a[2], 'level', 1, 255) : 1; if (lv > E.max) throw new CmdError(lv + ' is higher than the maximum level of ' + E.max + ' supported by that enchantment');
    for (const t of selectTargets(a[0], ctx, false)) { if (!onlyLocal(t, '/enchant @s ' + en + ' ' + lv)) continue; const h = player.held(); if (!h) throw new CmdError(t.name + ' is not holding any item');
      if (!enchantFits(h.id, en)) throw new CmdError(ITEMS[h.id].name + ' cannot support that enchantment');
      for (const k in (h.ench || {})) if (ENCH[k].excl && ENCH[k].excl === E.excl && k !== en) throw new CmdError(E.name + ' cannot be combined with ' + ENCH[k].name);
      h.ench = Object.assign({}, h.ench || {}, { [en]: lv }); invDirty(); }
    ok('Applied enchantment ' + E.name + ' ' + roman(lv) + ' to ' + myName() + "'s item"); } },
  xp: { usage: 'add|set|query <target> <amount> [points|levels]', run(a, ctx) {
    const op = a[0]; const lv = (a[3] || 'points') === 'levels';
    for (const t of selectTargets(a[1], ctx, false)) {
      if (op === 'query') { ok(t.name + ' has ' + (a[2] === 'levels' ? XP.level + ' experience levels' : Math.round(XP.points) + ' experience points')); continue; }
      const n = num(a[2], 'amount', op === 'set' ? 0 : -1e6, 1e6);
      if (!onlyLocal(t, '/xp ' + op + ' @s ' + n + ' ' + (lv ? 'levels' : 'points'))) continue;
      if (op === 'add') { if (lv) setLevel(Math.max(0, XP.level + n), XP.points); else addXP(n); }
      else if (op === 'set') { if (lv) setLevel(n, 0); else { const cap = xpToNext(XP.level); if (n >= cap) throw new CmdError('Points must be below ' + cap + ' at this level'); XP.points = n; renderXP(); } }
      else throw new CmdError('Usage: /xp ' + CMDS.xp.usage);
    }
    if (op !== 'query') ok((op === 'add' ? 'Gave ' : 'Set ') + a[2] + ' experience ' + (lv ? 'levels' : 'points') + (op === 'add' ? ' to ' : ' on ') + myName()); } },
  spawnpoint: { usage: '[target] [x y z]', run(a, ctx) { const p = a[1] !== undefined ? parsePos(a, 1, ctx) : player.pos.clone(); for (const t of selectTargets(a[0], ctx, false)) if (onlyLocal(t, '/spawnpoint @s ' + fmt(p.x) + ' ' + fmtY(p.y) + ' ' + fmt(p.z))) player.spawn.copy(p); ok('Set spawn point to ' + fmt(p.x) + ', ' + fmtY(p.y) + ', ' + fmt(p.z)); } },
  setworldspawn: { usage: '[x y z]', run(a, ctx) { const p = a[0] !== undefined ? parsePos(a, 0, ctx) : player.pos.clone(); player.spawn.copy(p); ok('Set the world spawn point to ' + fmt(p.x) + ', ' + fmtY(p.y) + ', ' + fmt(p.z)); } },
  seed: { usage: '', free: true, run() { ok('Seed: [' + world.seed + ']'); } },
  locate: { usage: 'structure <name>', run(a) {
    if (a[0] !== 'structure' && a[0] !== 'biome') throw new CmdError('Usage: /locate structure <name>');
    if (a[0] === 'biome') { const want = strip(a[1] || ''); const g = world.gen; if (!g.column) throw new CmdError('Biomes can only be located in the Overworld'); const P = player.pos; for (let r = 0; r < 3200; r += 32) for (let k = 0; k < Math.max(1, r / 8); k++) { const an = k / Math.max(1, r / 8) * Math.PI * 2; const x = Math.round(P.x + Math.cos(an) * r), z = Math.round(P.z + Math.sin(an) * r); if (g.biomeName(x, z).toLowerCase().replace(/ /g, '_').includes(want)) { ok('The nearest ' + want + ' is at [' + x + ', ~, ' + z + '] (' + Math.round(Math.hypot(x - P.x, z - P.z)) + ' blocks away)'); return; } } throw new CmdError('Could not find a biome of type "' + want + '" within reasonable distance'); }
    const name = strip(a[1] || ''); const kind = STRUCT_NAMES[name]; if (!kind) throw new CmdError('There is no structure "' + name + '". Try: ' + Object.keys(STRUCT_NAMES).join(', '));
    const P = player.pos; let best = null;
    if (kind === 'stronghold') { if (world.dim !== 'overworld') throw new CmdError('Strongholds are in the Overworld'); for (const s of world.gen.strongholds) { const d = Math.hypot(s.x - P.x, s.z - P.z); if (!best || d < best[3]) best = [s.x, s.y, s.z, d]; } }
    else if (kind === 'fortress') { if (world.dim !== 'nether') throw new CmdError('Fortresses are in the Nether'); const g = world.gen; const pcx = Math.floor(P.x / 16), pcz = Math.floor(P.z / 16); for (let rx = Math.floor(pcx / 27) - 4; rx <= Math.floor(pcx / 27) + 4; rx++) for (let rz = Math.floor(pcz / 27) - 4; rz <= Math.floor(pcz / 27) + 4; rz++) { const f = g.fortress(rx, rz); if (!f) continue; const x = f.ccx * 16 + 8, z = f.ccz * 16 + 8, d = Math.hypot(x - P.x, z - P.z); if (!best || d < best[3]) best = [x, f.fy, z, d]; } }
    else { if (world.dim !== 'overworld') throw new CmdError('That structure is in the Overworld');
      const pk = { village: 'village', pyramid: 'desert_pyramid', tower: 'outpost', ruined_portal: 'ruined_portal' }[kind];
      if (pk) { const sp = PLACE[pk].spacing; const prx = Math.floor(P.x / 16 / sp), prz = Math.floor(P.z / 16 / sp);
        for (let r = 0; r <= 12 && !best; r++) for (let rx = prx - r; rx <= prx + r; rx++) for (let rz = prz - r; rz <= prz + r; rz++) { if (Math.max(Math.abs(rx - prx), Math.abs(rz - prz)) !== r) continue; const st = regionStart(world, pk, rx, rz); if (!st) continue; const x = st.cx * 16 + 8, z = st.cz * 16 + 8, d = Math.hypot(x - P.x, z - P.z); if (!best || d < best[3]) best = [x, null, z, d]; } }
      else { const k = window.__game.findStruct(kind, kind === 'dungeon' ? 8 : 40); if (k) best = [k[1], k[3], k[2], Math.hypot(k[1] - P.x, k[2] - P.z)]; } }
    if (!best) throw new CmdError('Could not find a structure of type "' + name + '" within reasonable distance');
    chatPrint('The nearest ' + name + ' is at [' + Math.round(best[0]) + ', ' + (best[1] != null ? Math.round(best[1] - world.yOff) : '~') + ', ' + Math.round(best[2]) + '] (' + Math.round(best[3]) + ' blocks away)', '#7ef'); } },
  difficulty: { usage: '[peaceful|easy|normal|hard]', run(a) { if (!a[0]) { ok('The difficulty is ' + S.difficulty); return; } const d = String(a[0]).toLowerCase(); if (!['peaceful', 'easy', 'normal', 'hard'].includes(d)) throw new CmdError('Invalid difficulty: ' + a[0]); S.difficulty = d; if (d === 'peaceful') for (const m of G.mobs) if (m.t.kind !== 'passive' && !m.isBoss) m.gone = true, m.remove(); ok('The difficulty has been set to ' + d[0].toUpperCase() + d.slice(1)); } },
  gamerule: { usage: '<rule> [value]', run(a) {
    if (!a[0]) { ok('Game rules: ' + Object.keys(S.rules).join(', ')); return; }
    if (!(a[0] in S.rules)) throw new CmdError('Unknown game rule: ' + a[0]);
    if (a[1] === undefined) { ok('Gamerule ' + a[0] + ' is currently set to: ' + S.rules[a[0]]); return; }
    if (a[1] !== 'true' && a[1] !== 'false') throw new CmdError('Value must be true or false'); S.rules[a[0]] = a[1] === 'true'; ok('Gamerule ' + a[0] + ' is now set to: ' + a[1]);
    if (typeof MP !== 'undefined') MP.rulesChanged(); } },
  say: { usage: '<message>', run(a) { const t = '[' + myName() + '] ' + a.join(' '); chatPrint(t); if (CHAT.onSend) CHAT.onSend({ t: 'chat', raw: t }); } },
  me: { usage: '<action>', free: true, run(a) { const t = '* ' + myName() + ' ' + a.join(' '); chatPrint(t); if (CHAT.onSend) CHAT.onSend({ t: 'chat', raw: t }); } },
  msg: { usage: '<player> <message>', free: true, run(a, ctx) { const t = selectTargets(a[0], ctx, false)[0]; const text = a.slice(1).join(' '); if (!text) throw new CmdError('Expected a message'); chatPrint('You whisper to ' + t.name + ': ' + text, '#aaa'); if (!t.local && typeof MP !== 'undefined') MP.whisper(t, text); } },
  list: { usage: '', free: true, run() { const ps = allPlayers(); ok('There are ' + ps.length + ' of a max of ' + (typeof MP !== 'undefined' ? MP.maxPlayers : 1) + ' players online: ' + ps.map(p => p.name).join(', ')); } },
};
function runCommand(line, ctx) {
  const args = tokenize(line); const name = strip(args.shift() || ''); const key = CMD_ALIAS[name] || name; const c = CMDS[key];
  if (!c) { chatPrint('Unknown or incomplete command, see below for error', '#f66'); chatPrint(line + '<--[HERE]', '#f66'); return false; }
  if (!c.free && !S.cheats && S.mode !== 'creative' && !ctx.remote) { chatPrint('Cheats are off in this world. Use Creative mode, or turn on "Allow cheats" in the pause menu', '#f66'); return false; }
  try { c.run(args.map(String), ctx); if (MODS.hooks.command) modFire('command', { name: key, args }); return true; }
  catch (e) { if (e instanceof CmdError) chatPrint(e.message, '#f66'); else { console.error(e); chatPrint('An unexpected error occurred trying to execute that command: ' + e.message, '#f66'); } return false; }
}
function deathMessage(cause) {
  const m = { 'fall damage': 'hit the ground too hard', 'an explosion': 'blew up', 'a creeper': 'was blown up by Creeper', 'an arrow': 'was shot by Skeleton', 'the void': 'fell out of the world', lava: 'tried to swim in lava', 'a magma block': 'discovered the floor was lava', 'a cactus': 'was pricked to death', magic: 'was killed by magic', drowning: 'drowned', starvation: 'starved to death' };
  return myName() + ' ' + (m[cause] || (cause ? 'was slain by ' + cause.replace(/^(a|an|the) /, '').replace(/\b\w/g, c => c.toUpperCase()) : 'died'));
}
// mod HUD canvases (used by the Mini Map example mod and any other mod)
function updateModHuds(dt) {
  for (const h of MODS.huds) {
    if (!h.el) { h.el = document.createElement('canvas'); h.el.width = h.w; h.el.height = h.h; h.el.className = 'modhud'; const c = h.corner; Object.assign(h.el.style, { position: 'fixed', zIndex: 6, pointerEvents: 'none', imageRendering: 'pixelated', [c.includes('top') ? 'top' : 'bottom']: c.includes('top') ? '8px' : '110px', [c.includes('left') ? 'left' : 'right']: '8px' }); document.body.appendChild(h.el); }
    const vis = S.started && !S.loading && !S.paused; h.el.style.display = vis ? 'block' : 'none'; if (!vis || !h.draw) continue;
    h.t += dt; if (h.t < h.every) continue; h.t = 0;
    try { h.draw(h.el.getContext('2d'), h.el, dt); } catch (e) { console.error('[mod ' + h.mod + '] hud:', e); h.draw = null; }
  }
}
// pressing keys while playing fires the "key" mod event
addEventListener('keydown', (e) => { if (S.started && !S.loading && !S.uiOpen && !S.paused && MODS.hooks.key && !e.repeat) modFire('key', { code: e.code, key: e.key }); });

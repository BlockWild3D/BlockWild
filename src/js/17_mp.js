// ================= MULTIPLAYER: "Open to Friends" hosting, joining with a code, world + player sync =================
// The host's browser runs the world (mobs near the host, time, saving). Friends get the world when they join and
// then everyone streams block changes, positions, chat and chest contents. Mobs are shared while you are near the host;
// far away (or in another dimension) each player runs the mobs around them.
const MP = {
  active: false, role: null, code: null, myId: 'host', peers: new Map(), avatars: new Map(), brokers: [], maxPlayers: 8, joinMode: 'survival',
  applying: false, outBlocks: [], sendT: 0, mobT: 0, timeT: 0, stateT: 0, mobSeq: 0, saved: {}, proxyMode: false,
  hostPos: null, hostDim: 'overworld', hostRD: 6,
};
function mpStatus(t) { const el = $('mpStatus'); if (el) el.textContent = t; }
function skinCanvasFrom(sk, cb) { if (sk && sk.png) { const img = new Image(); img.onload = () => cb(normalizeSkin(img)); img.onerror = () => cb(makeSkinCanvas(SKIN_PRESETS.Explorer)); img.src = sk.png; } else cb(makeSkinCanvas((sk && sk.cfg) || SKIN_PRESETS.Explorer)); }
function mySkinData() { return PROFILE.png ? { png: PROFILE.png } : { cfg: PROFILE.skin }; }
const slotOut = (s) => s ? [ITEMS[s.id].key, s.count, xtra(s)] : null;
const slotIn = (a) => { if (!a || IT[a[0]] === undefined) return null; return Object.assign({ id: IT[a[0]], count: a[1] }, a[2] || {}); };

// ---------- avatars (other players) ----------
function addAvatar(id, name, skin) {
  removeAvatar(id); const av = { id, name, pos: new V3(0, -100, 0), tgt: new V3(0, -100, 0), yaw: 0, pitch: 0, dim: 'overworld', held: 0, sneak: false, swing: 0, armor: {}, model: null, hurtT: 0, sleeping: false, seen: performance.now() };
  MP.avatars.set(id, av);
  skinCanvasFrom(skin, (cv) => { if (!MP.avatars.has(id)) return; av.model = makePlayerModel(cv, name); addArmorSlots(av.model); scene.add(av.model.root); });
  return av;
}
function removeAvatar(id) { const av = MP.avatars.get(id); if (!av) return; if (av.model) { scene.remove(av.model.root); av.model.dispose(); } MP.avatars.delete(id); }
MP.remotePlayers = () => [...MP.avatars.values()].filter(a => a.dim === (world && world.dim)).map(a => ({ kind: 'player', name: a.name, pos: a.pos, ref: a, local: false, id: a.id }));
function updateAvatars(dt) {
  for (const av of MP.avatars.values()) {
    const prev = av.pos.clone(); av.pos.lerp(av.tgt, Math.min(1, dt * 12)); const sp = prev.distanceTo(av.pos) / Math.max(dt, 1e-3);
    av.swing = Math.max(0, av.swing - dt * 4); av.hurtT -= dt;
    if (!av.model) continue; const vis = av.dim === world.dim; av.model.root.visible = vis; if (!vis) continue;
    av.model.root.position.copy(av.pos); av.model.root.rotation.y = av.yaw + Math.PI; av.model.setHeld(av.held ? IT[av.held] : 0); av.model.setArmor(av.armor || {});
    av.model.animate(dt, Math.min(sp, 8), av.pitch, av.swing, av.sneak, av.hurtT);
    swimPose(av.model, { swimming: av.swim, pitch: av.pitch, pos: av.pos, hw: 0.3, h: av.swim ? 0.6 : 1.8 }, dt);
    if (av.sleeping) { av.model.body.rotation.x = -Math.PI / 2; av.model.body.position.y = 0.25; }
    const l = Math.max(G.minLight || 0, world.lightAt(av.pos.x, av.pos.y + 1, av.pos.z, G.daylight)); av.model.mat.color.multiplyScalar(clamp(l, 0.1, 1)); av.model.omat.color.copy(av.model.mat.color);
  }
}

// ---------- sending ----------
function mpSendAll(m, fast, except) { for (const p of MP.peers.values()) if (p.id !== except && p.joined) p.link.send(m, fast); }
function mpToHost(m, fast) { const p = MP.peers.get('host'); if (p) p.link.send(m, fast); }
function mpSend(m, fast) { if (MP.role === 'host') mpSendAll(m, fast); else mpToHost(m, fast); }
function myState() { const P = player; const h = P.held(); return { t: 'p', id: MP.myId, x: +P.pos.x.toFixed(2), y: +P.pos.y.toFixed(2), z: +P.pos.z.toFixed(2), yaw: +P.yaw.toFixed(3), pitch: +P.pitch.toFixed(3), dim: world.dim, held: h ? ITEMS[h.id].key : 0, sneak: !!(keys.ShiftLeft || keys.ShiftRight), swing: S.swing > 0.6 ? 1 : 0, swim: !!P.swimming, sleep: !!S.sleeping, armor: armorMats(P.inv), dead: !!P.dead }; }
function mySaveState() { const P = player; return { t: 'state', name: myName(), pos: P.pos.toArray(), yaw: P.yaw, pitch: P.pitch, health: P.health, dim: world.dim, inv: P.inv.map(slotOut), xp: [XP.level, XP.points], bed: S.bed || null, sel: P.sel }; }
MP.sendState = () => { if (MP.role === 'client') mpToHost(mySaveState()); };
// block changes are batched and sent every 50 ms (by key, so different mod lists can't scramble ids)
const _wset = World.prototype.set;
World.prototype.set = function (x, y, z, id, record) {
  const r = _wset.call(this, x, y, z, id, record);
  if (r !== false && MP.active && !MP.applying && record !== false) MP.outBlocks.push(this.dim, x, y, z, BL[id] ? BL[id].key : 'air');
  return r;
};
MP.blockChanged = () => { };
function applyBlocks(list, from) {
  MP.applying = true;
  try {
    for (let i = 0; i < list.length; i += 5) {
      const dim = list[i], x = list[i + 1], y = list[i + 2], z = list[i + 3], key = list[i + 4]; const id = key === 'air' ? 0 : B[String(key).toUpperCase()]; if (id === undefined) continue;
      const w = Dim.get(dim); const c = w.getChunk(x >> 4, z >> 4);
      if (c) { const old = w.get(x, y, z); if (old === id) continue; if (w === world && old && !id && player.pos.distanceTo(new V3(x, y, z)) < 32) { Particles.blockBreak(x, y, z, old, 10); Sfx.at(BL[old].snd === 'glass' ? 'glass_break' : BL[old].snd, new V3(x, y, z), 0.7); } if (old) onBlockRemoved(x, y, z, old); w.set(x, y, z, id); }
      else { const k = ckey(x >> 4, z >> 4); let e = w.edits.get(k); if (!e) { e = new Map(); w.edits.set(k, e); } e.set((y * 16 + (z & 15)) * 16 + (x & 15), id); }
    }
  } finally { MP.applying = false; }
  if (MP.role === 'host') mpSendAll({ t: 'b', l: list }, false, from);
}
// chest contents
const _closeInv = closeInv;
closeInv = function (noLock) { const k = S.chestKey, arr = chestArr; const r = _closeInv(noLock); if (MP.active && k && arr) mpSend({ t: 'chest', dim: world.dim, k, inv: arr.map(slotOut) }); return r; };

// ---------- message handling ----------
function onPeerMsg(peer, m) {
  switch (m.t) {
    case 'hello': return hostWelcome(peer, m);
    case 'welcome': return clientWelcome(m);
    case 'p': { const id = MP.role === 'host' ? peer.id : m.id; if (id === MP.myId) return; let av = MP.avatars.get(id); if (!av) return;
      av.tgt.set(m.x, m.y, m.z); if (av.pos.y < -50 || av.dim !== m.dim) av.pos.copy(av.tgt); av.yaw = m.yaw; av.pitch = m.pitch; av.dim = m.dim; av.held = m.held; av.sneak = m.sneak; av.swim = m.swim; av.sleeping = m.sleep; av.armor = m.armor || {}; av.dead = m.dead; if (m.swing) av.swing = 1; av.seen = performance.now();
      if (MP.role === 'host') { m.id = peer.id; mpSendAll(m, true, peer.id); }
      if (MP.role === 'client' && id === 'host') { MP.hostPos = av.tgt; MP.hostDim = m.dim; }
      return; }
    case 'b': return applyBlocks(m.l, peer.id);
    case 'chat': { const t = m.raw || ('<' + m.from + '> ' + m.text); chatPrint(t, m.color); if (MP.role === 'host') mpSendAll(m, false, peer.id); return; }
    case 'chest': { const w = Dim.get(m.dim); w.chestInv.set(m.k, m.inv.map(slotIn)); if (S.chestKey === m.k && chestArr) { chestArr = w.chestInv.get(m.k); renderInvUI(); } if (MP.role === 'host') mpSendAll(m, false, peer.id); return; }
    case 'time': S.time = m.time; S.day = m.day; if (S.sleeping && timeTicks() < 12000) { S.sleeping = null; $('sleepfx').style.opacity = 0; show('sleepfx', false); } return;
    case 'rules': Object.assign(S.rules, m.rules); S.difficulty = m.difficulty; return;
    case 'join': addAvatar(m.id, m.name, m.skin); chatPrint(m.name + ' joined the game', '#ff5'); return;
    case 'leave': { const av = MP.avatars.get(m.id); if (av) chatPrint(av.name + ' left the game', '#ff5'); removeAvatar(m.id); return; }
    case 'state': if (MP.role === 'host') { MP.saved[m.name] = m; } return;
    case 'hurt': if (!player.dead) { player.hurtCD = Math.min(player.hurtCD, 0); player.hurt(m.dmg, m.src ? new V3(m.src[0], m.src[1], m.src[2]) : null, m.cause, m.kb == null ? 1 : m.kb); } return;
    case 'mobs': return clientMobs(m);
    case 'hit': return hostHit(peer, m);
    case 'drops': for (const [key, n, x, y, z] of m.items) if (IT[key] !== undefined) dropItem(IT[key], n, x, y, z); if (m.xp) spawnOrb(m.x, m.y, m.z, m.xp); return;
    case 'fx': if (m.dim === world.dim) { if (m.k === 'boom') { Particles.emit(m.x, m.y, m.z, 60, [[1, 0.9, 0.5], [1, 0.6, 0.2], [0.9, 0.3, 0.1]], 12, 0.5, 0, 1.5); Sfx.at('boom', new V3(m.x, m.y, m.z), 1.4); G.shake = Math.max(G.shake, 0.5 * Math.max(0, 1 - player.pos.distanceTo(new V3(m.x, m.y, m.z)) / 24)); } } return;
    case 'cmd': if (m.line) runCommand(m.line, { player, remote: true }); return;
    case 'whisper': chatPrint(m.from + ' whispers to you: ' + m.text, '#aaa'); return;
    case 'sleep': peer.sleeping = m.v; return;
    case 'bye': chatPrint('The host closed the world', '#f66'); toast('The host closed the world', 4); setTimeout(() => { mpShutdown(); quitToTitle(); }, 1500); return;
    case 'full': mpStatus('That world is full.'); return;
  }
}

// ---------- hosting ----------
async function openToFriends() {
  if (MP.active) return; mpStatus('Opening your world to friends...');
  MP.brokers = await connectBrokers(true); if (!MP.brokers.length) { mpStatus('Could not reach any matchmaking server. Check your internet connection and try again.'); return; }
  MP.active = true; MP.role = 'host'; MP.myId = 'host'; MP.code = newRoomCode(); MP.joinMode = $('mpModeSeg') ? ($('mpModeSeg').querySelector('.on') || {}).dataset?.m || 'survival' : 'survival';
  for (const b of MP.brokers) { b.subscribe(TOPIC(MP.code) + '/h'); b.on((topic, msg) => hostSignal(b, msg)); }
  CHAT.onSend = (m) => mpSendAll(Object.assign({ from: myName() }, m));
  mpStatus('Friends can join with the code ' + MP.code); renderMpPanel();
  chatPrint('Your world is open to friends. Code: ' + MP.code, '#7ef'); toast('Join code: ' + MP.code, 6);
}
async function hostSignal(broker, msg) {
  let m; try { m = JSON.parse(msg); } catch (e) { return; } if (m.t !== 'offer' || !m.from || MP.peers.has(m.from)) return;
  const reply = (o) => broker.publish(TOPIC(MP.code) + '/p/' + m.from, JSON.stringify(o));
  if ([...MP.peers.values()].length + 1 >= MP.maxPlayers) { reply({ t: 'full' }); return; }
  const pc = new RTCPeerConnection({ iceServers: CONFIG.iceServers }); const peer = { id: m.from, name: m.name || 'Player', joined: false };
  peer.link = new PeerLink(pc, (x) => onPeerMsg(peer, x), () => hostPeerGone(peer)); MP.peers.set(peer.id, peer);
  pc.ondatachannel = (e) => peer.link.attach(e.channel);
  try { await pc.setRemoteDescription({ type: 'offer', sdp: m.sdp }); await pc.setLocalDescription(await pc.createAnswer()); await waitIce(pc); reply({ t: 'answer', sdp: pc.localDescription.sdp }); }
  catch (e) { console.error(e); MP.peers.delete(peer.id); }
  setTimeout(() => { if (!peer.joined) { peer.link.close(); MP.peers.delete(peer.id); } }, 30000);
}
function hostWelcome(peer, m) {
  let name = String(m.name || 'Player').replace(/[^A-Za-z0-9_]/g, '').slice(0, 16) || 'Player';
  const taken = new Set([myName(), ...[...MP.avatars.values()].map(a => a.name)]); let n = name, k = 2; while (taken.has(n)) n = name.slice(0, 14) + (k++); name = n;
  peer.name = name; peer.skin = m.skin; peer.joined = true;
  saveGame(false);
  const worlds = {}; for (const d in Dim.worlds) worlds[d] = Object.assign(packWorld(Dim.worlds[d]), { chests: Object.fromEntries([...Dim.worlds[d].chestInv].map(([k2, v]) => [k2, v.map(slotOut)])) });
  const saved = MP.saved[name];
  peer.link.send({ t: 'welcome', id: peer.id, name, seed: world.seed, mode: MP.joinMode, cheats: S.cheats, time: S.time, day: S.day, rules: S.rules, difficulty: S.difficulty,
    worlds, keys: saveKeys(), dragonDead: S.dragonDead, crystalsGone: S.crystalsGone, spawn: player.spawn.toArray(), you: saved || null, hostRD: S.renderDist, mods: MODS.loaded.map(id => (MODS.list.find(x => x.id === id) || {}).name),
    players: [{ id: 'host', name: myName(), skin: mySkinData() }, ...[...MP.peers.values()].filter(p => p.joined && p.id !== peer.id).map(p => ({ id: p.id, name: p.name, skin: p.skin }))] });
  mpSendAll({ t: 'join', id: peer.id, name, skin: m.skin }, false, peer.id);
  addAvatar(peer.id, name, m.skin); chatPrint(name + ' joined the game', '#ff5'); renderMpPanel();
  const mine = MODS.loaded.map(id => (MODS.list.find(x => x.id === id) || {}).name).sort().join(','), theirs = (m.mods || []).slice().sort().join(',');
  if (mine !== theirs) chatPrint(name + ' has different mods (' + (theirs || 'none') + '). Blocks from missing mods will show as air for them.', '#fa5');
}
function hostPeerGone(peer) {
  if (!MP.peers.has(peer.id)) return; MP.peers.delete(peer.id);
  if (peer.joined) { const av = MP.avatars.get(peer.id); chatPrint((av ? av.name : peer.name) + ' left the game', '#ff5'); removeAvatar(peer.id); mpSendAll({ t: 'leave', id: peer.id }); }
  renderMpPanel();
}
// a remote player as seen by mob AI on the host (same fields the AI reads from the local player)
function avatarProxy(av, peer) {
  return { pos: av.pos, vel: new V3(), hw: 0.3, h: 1.8, dead: !!av.dead, hurtCD: 0, peak: null, health: 20, flying: false, blocking: false, isProxy: true,
    eye() { return new V3(av.pos.x, av.pos.y + 1.62, av.pos.z); },
    hurt(dmg, src, cause, kb) { if (this.dead) return; peer.link.send({ t: 'hurt', dmg, src: src ? [src.x, src.y, src.z] : null, cause, kb }); av.hurtT = 0.3; } };
}
function hostHit(peer, m) {
  const mob = G.mobs.find(x => x.nid === m.id); if (!mob || mob.dead) return; const av = MP.avatars.get(peer.id); const src = av ? av.pos.clone() : null;
  mob.killerPeer = peer.id; mob.lootingLv = m.looting || 0; if (m.fire) mob.burnT = m.fire;
  MP.applying = true; try { _mobHurtRaw.call(mob, m.dmg, src, m.kb == null ? 1 : m.kb); } finally { MP.applying = false; }
}
// loot from a mob killed by a remote player goes to that player
G.captureDrops = null;
const _dropItem = dropItem; dropItem = function (id, count, x, y, z, burst, extra) { if (G.captureDrops) { G.captureDrops.items.push([ITEMS[id].key, count, x, y, z]); return { vel: new V3(), remove() { } }; } return _dropItem(id, count, x, y, z, burst, extra); };
const _spawnOrb = spawnOrb; spawnOrb = function (x, y, z, v) { if (G.captureDrops) { G.captureDrops.xp += v; G.captureDrops.x = x; G.captureDrops.y = y; G.captureDrops.z = z; return; } return _spawnOrb(x, y, z, v); };
const _dropLoot2 = Mob.prototype.dropLoot;
Mob.prototype.dropLoot = function () {
  if (this.remote) { Sfx.mob(this, 'death', 0.8); return; }
  const peer = this.killerPeer && MP.peers.get(this.killerPeer);
  if (MP.role === 'host' && peer) { G.captureDrops = { items: [], xp: 0 }; this.playerHitT = performance.now(); try { _dropLoot2.call(this); } finally { const c = G.captureDrops; G.captureDrops = null; peer.link.send({ t: 'drops', items: c.items, xp: c.xp, x: c.x, y: c.y, z: c.z }); } return; }
  return _dropLoot2.call(this);
};
// remote mobs on clients: hitting one asks the host to apply the damage
const _mobHurtRaw = Mob.prototype.hurt;
Mob.prototype.hurt = function (dmg, src, kb, noAnger) {
  if (this.remote && !MP.applying) { if (src === player.pos) { mpToHost({ t: 'hit', id: this.nid, dmg, kb, fire: this.burnT > 0 ? this.burnT : 0, looting: this.lootingLv || 0 }); this.hurtT = 0.35; Sfx.mob(this, 'hurt', 0.7); } return; }
  return _mobHurtRaw.call(this, dmg, src, kb, noAnger);
};
// explosions: show them to everyone and hurt remote players nearby
const _explode = explode;
explode = function (cx, cy, cz, r, src, opts = {}) {
  const res = _explode(cx, cy, cz, r, src, opts);
  if (MP.active && !MP.applying) { mpSend({ t: 'fx', k: 'boom', dim: world.dim, x: cx, y: cy, z: cz, r });
    if (MP.role === 'host') for (const av of MP.avatars.values()) { if (av.dim !== world.dim) continue; const d = new V3(av.pos.x, av.pos.y + 0.9, av.pos.z).distanceTo(new V3(cx, cy, cz)); if (d > r * 2) continue; const f = 1 - d / (r * 2); const peer = MP.peers.get(av.id); if (peer) peer.link.send({ t: 'hurt', dmg: Math.round(f * f * 7 * r + 1), src: [cx, cy, cz], cause: opts.cause || 'an explosion', kb: 2.2 }); } }
  return res;
};

// ---------- host simulation: mobs target the nearest player, snapshots to clients ----------
function hostMobUpdate(m, dt) {
  if (!MP.active || MP.role !== 'host' || !MP.avatars.size) return m.update(dt);
  let best = null, bd = player.pos.distanceToSquared(m.pos);
  for (const av of MP.avatars.values()) { if (av.dim !== world.dim || av.dead) continue; const d = av.pos.distanceToSquared(m.pos); if (d < bd) { bd = d; best = av; } }
  if (!best) return m.update(dt);
  const peer = MP.peers.get(best.id); if (!peer) return m.update(dt);
  const saved = G.player; G.player = best._proxy || (best._proxy = avatarProxy(best, peer)); best._proxy.dead = !!best.dead;
  try { m.update(dt); } finally { G.player = saved; }
}
function hostTick(dt) {
  MP.mobT += dt; MP.timeT += dt;
  if (MP.mobT >= 0.1) { MP.mobT = 0;
    for (const peer of MP.peers.values()) { if (!peer.joined) continue; const av = MP.avatars.get(peer.id); if (!av || av.dim !== world.dim) continue;
      const list = []; for (const m of G.mobs) { if (m.gone || m.isBoss) continue; if (!m.nid) m.nid = ++MP.mobSeq; const d = m.pos.distanceToSquared(av.pos); if (d > 72 * 72) continue;
        list.push([m.nid, m.type, +m.pos.x.toFixed(2), +m.pos.y.toFixed(2), +m.pos.z.toFixed(2), +m.yaw.toFixed(2), (m.dead ? 1 : 0) | (m.hurtT > 0.2 ? 2 : 0) | (m.angry > 0 ? 4 : 0) | (m.burnT > 0 ? 8 : 0), m.size || 0, m.fuse || 0]); }
      peer.link.send({ t: 'mobs', l: list }, true); } }
  if (MP.timeT >= 3) { MP.timeT = 0; mpSendAll({ t: 'time', time: S.time, day: S.day }); }
  // mob arrows and fireballs can hit remote players too
  for (const a of G.projectiles) { if (a.done || a.owner === 'player') continue; for (const av of MP.avatars.values()) { if (av.dim !== world.dim) continue; if (Math.abs(a.pos.x - av.pos.x) < 0.45 && Math.abs(a.pos.z - av.pos.z) < 0.45 && a.pos.y > av.pos.y && a.pos.y < av.pos.y + 1.9) { const peer = MP.peers.get(av.id); if (peer) peer.link.send({ t: 'hurt', dmg: a.dmg || 3, src: [a.pos.x, a.pos.y, a.pos.z], cause: a.kind === 'arrow' ? 'an arrow' : 'a fireball', kb: 0.6 }); a.done = true; G.scene.remove(a.mesh); } } }
}
MP.timeChanged = () => { if (MP.role === 'host') mpSendAll({ t: 'time', time: S.time, day: S.day }); };
MP.rulesChanged = () => { if (MP.role === 'host') mpSendAll({ t: 'rules', rules: S.rules, difficulty: S.difficulty }); };
MP.remoteCommand = (t, line) => { if (MP.role === 'host') { const p = MP.peers.get(t.id); if (p) p.link.send({ t: 'cmd', line }); } else chatPrint('Only the host can use commands on other players', '#f66'); };
MP.whisper = (t, text) => { const m = { t: 'whisper', from: myName(), text, to: t.id }; if (MP.role === 'host') { const p = MP.peers.get(t.id); if (p) p.link.send(m); } else mpToHost(m); };

// ---------- clients: mirror the host's mobs while near the host ----------
const remoteMobs = new Map();
function clientMobs(m) {
  if (!MP.proxyMode) return; const seen = new Set();
  for (const [nid, type, x, y, z, yaw, fl, size, fuse] of m.l) {
    seen.add(nid); let mob = remoteMobs.get(nid);
    if (!mob) { if (!MOBS[type]) continue; mob = spawnMob(type, x, y, z, size ? { size } : undefined); mob.remote = true; mob.nid = nid; mob.tgt = new V3(x, y, z); remoteMobs.set(nid, mob); }
    mob.tgt.set(x, y, z); mob.tgtYaw = yaw; mob.angry = fl & 4 ? 1 : 0; if (fl & 2 && mob.hurtT <= 0) mob.hurtT = 0.3; mob.burnT = fl & 8 ? 0.5 : 0; mob.fuse = fuse; mob.lastSeen = performance.now();
    if (fl & 1 && !mob.dead) { mob.dead = true; mob.deadT = 0; }
  }
  for (const [nid, mob] of remoteMobs) if (!seen.has(nid) && performance.now() - (mob.lastSeen || 0) > 1500) { if (!mob.dead) mob.gone = true; remoteMobs.delete(nid); }
}
function remoteMobUpdate(m, dt) {
  if (m.dead) { m.update(dt); return; }
  const prev = m.pos.clone(); m.pos.lerp(m.tgt, Math.min(1, dt * 10)); m.vel.copy(m.pos).sub(prev).divideScalar(Math.max(dt, 1e-3));
  let dy = (m.tgtYaw || 0) - m.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; m.yaw += dy * Math.min(1, dt * 10);
  m.age += dt; m.hurtT = Math.max(0, m.hurtT - dt); m.lightT = (m.lightT || 0) - dt; if (m.lightT <= 0) { m.lightT = 0.3; m.light = Math.max(G.minLight || 0, world.lightAt(m.pos.x, m.pos.y + 1, m.pos.z, G.daylight)); }
  if (m.animate) m.animate(dt); m.root.position.copy(m.pos); m.root.rotation.y = m.yaw; m.colorize();
}
function updateProxyMode() {
  if (MP.role !== 'client') { MP.proxyMode = false; return; }
  const near = MP.hostPos && MP.hostDim === world.dim && Math.hypot(MP.hostPos.x - player.pos.x, MP.hostPos.z - player.pos.z) < Math.max(48, (MP.hostRD - 1) * 16);
  if (near !== MP.proxyMode) { MP.proxyMode = near; for (const m of G.mobs) if (!m.isBoss && (near ? !m.remote : m.remote)) { m.gone = true; m.remove(); } G.mobs = G.mobs.filter(m => !m.gone); if (!near) remoteMobs.clear(); }
}

// ---------- joining ----------
async function joinWorld(code) {
  code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (code.length !== 6) { mpStatus('Codes are 6 letters and numbers.'); return; }
  mpStatus('Looking for the world ' + code + '...'); Sfx.init();
  const brokers = await connectBrokers(true); if (!brokers.length) { mpStatus('Could not reach any matchmaking server. Check your internet connection.'); return; }
  const myId = 'p' + Math.random().toString(36).slice(2, 10);
  const pc = new RTCPeerConnection({ iceServers: CONFIG.iceServers }); const peer = { id: 'host', name: 'Host', joined: true };
  peer.link = new PeerLink(pc, (x) => onPeerMsg(peer, x), () => { if (MP.role === 'client' && MP.active) { chatPrint('Lost connection to the host', '#f66'); toast('Lost connection to the host', 4); setTimeout(() => { mpShutdown(); quitToTitle(); }, 1500); } });
  peer.link.attach(pc.createDataChannel('r', { ordered: true })); peer.link.attach(pc.createDataChannel('u', { ordered: false, maxRetransmits: 0 }));
  await pc.setLocalDescription(await pc.createOffer()); await waitIce(pc);
  let answered = false;
  for (const b of brokers) { b.subscribe(TOPIC(code) + '/p/' + myId); b.on(async (topic, msg) => { let m; try { m = JSON.parse(msg); } catch (e) { return; } if (m.t === 'full') { mpStatus('That world is full.'); return; } if (m.t !== 'answer' || answered) return; answered = true; try { await pc.setRemoteDescription({ type: 'answer', sdp: m.sdp }); mpStatus('Connecting...'); } catch (e) { mpStatus('Connection failed: ' + e.message); } });
    setTimeout(() => b.publish(TOPIC(code) + '/h', JSON.stringify({ t: 'offer', from: myId, name: myName(), sdp: pc.localDescription.sdp })), 300); }
  const timer = setTimeout(() => { if (!answered) mpStatus('No world found with code ' + code + '. Check the code, and that your friend has opened their world.'); else if (!MP.active) mpStatus('Found the world but could not connect directly. Some networks block peer-to-peer connections (a TURN server would be needed).'); }, 15000);
  peer.link.ready.then(() => { clearTimeout(timer); for (const b of brokers) b.close(); MP.peers.set('host', peer); MP.myId = myId; mpStatus('Joining...'); peer.link.send({ t: 'hello', name: myName(), skin: mySkinData(), mods: MODS.loaded.map(id => (MODS.list.find(x => x.id === id) || {}).name) }); });
}
function clientWelcome(m) {
  MP.active = true; MP.role = 'client'; MP.hostRD = m.hostRD || 6;
  if (m.name !== myName()) chatPrint('Your name in this world is ' + m.name, '#ff5');
  const data = { seed: m.seed, mode: m.mode, cheats: m.cheats, time: m.time, day: m.day, rules: m.rules, difficulty: m.difficulty, keys: m.keys, dragonDead: m.dragonDead, crystalsGone: m.crystalsGone, worlds: {} };
  for (const d in m.worlds) { const w = m.worlds[d]; data.worlds[d] = { edits: w.edits, furn: {}, chests: {} }; }
  const y = m.you; if (y) { data.dim = y.dim; data.player = { pos: y.pos, yaw: y.yaw, pitch: y.pitch, health: y.health, spawn: m.spawn, inv: [], sel: y.sel || 0, xp: y.xp }; data.bed = y.bed; }
  show('mpScreen', false); startWorld(data);
  // chests use item keys over the network
  for (const d in m.worlds) { const w = Dim.get(d); for (const k in (m.worlds[d].chests || {})) w.chestInv.set(k, m.worlds[d].chests[k].map(slotIn)); }
  if (y) { player.inv = new Array(41).fill(null); (y.inv || []).forEach((s, i) => player.inv[i] = slotIn(s)); invDirty(); }
  else player.spawn.fromArray(m.spawn);
  for (const p of m.players) addAvatar(p.id, p.name, p.skin);
  CHAT.onSend = (msg) => mpToHost(Object.assign({ from: myName() }, msg));
  chatPrint('Connected. Say hi with T!', '#7ef'); renderMpPanel();
}
function mpShutdown() {
  if (!MP.active && !MP.brokers.length) return;
  if (MP.role === 'host') mpSendAll({ t: 'bye' }); else if (MP.role === 'client') MP.sendState();
  for (const p of MP.peers.values()) p.link.close(); MP.peers.clear(); for (const id of [...MP.avatars.keys()]) removeAvatar(id);
  for (const b of MP.brokers) b.close(); MP.brokers = []; remoteMobs.clear();
  MP.active = false; MP.role = null; MP.code = null; MP.proxyMode = false; CHAT.onSend = null; renderMpPanel();
}
// per-frame network work (runs even while the pause menu is open)
function mpTick(dt) {
  if (!MP.active || !world) return;
  updateAvatars(dt); updateProxyMode();
  MP.sendT += dt; if (MP.sendT >= 0.066) { MP.sendT = 0; const s = myState(); if (MP.role === 'host') mpSendAll(s, true); else mpToHost(s, true); }
  if (MP.outBlocks.length) { const l = MP.outBlocks; MP.outBlocks = []; if (MP.role === 'host') mpSendAll({ t: 'b', l }); else mpToHost({ t: 'b', l }); }
  if (MP.role === 'host') hostTick(dt);
  else { MP.stateT += dt; if (MP.stateT > 10) { MP.stateT = 0; MP.sendState(); } }
  for (const [id, av] of MP.avatars) if (performance.now() - av.seen > 20000) { /* stale */ }
  const sl = !!S.sleeping; if (MP.role === 'client' && sl !== MP.lastSleep) { MP.lastSleep = sl; mpToHost({ t: 'sleep', v: sl }); }
}
// ---------- UI ----------
function renderMpPanel() {
  const b = $('btnOpenLan'); if (!b) return;
  if (MP.role === 'client') { b.style.display = 'none'; $('btnQuit').textContent = 'Disconnect'; $('btnSave').style.display = 'none'; $('mpPanel').innerHTML = 'Playing on a friend\'s world · players: ' + (MP.avatars.size + 1); return; }
  b.style.display = ''; $('btnQuit').textContent = 'Save & Quit to Title'; $('btnSave').style.display = '';
  if (MP.active) { b.textContent = 'Open to Friends: ' + MP.code; $('mpPanel').innerHTML = 'Code <b style="font-size:26px;letter-spacing:3px;color:#7ef">' + MP.code + '</b> · players online: ' + (MP.avatars.size + 1) + '<br><span style="color:#aaa">Friends open BlockWild, press Multiplayer and type this code.</span>'; }
  else { b.textContent = 'Open to Friends'; $('mpPanel').innerHTML = ''; }
}
$('btnOpenLan').addEventListener('click', () => { if (!MP.active) { show('lanOpts', true); } else { try { navigator.clipboard.writeText(MP.code); toast('Code copied', 1.5); } catch (e) { } } });
$('btnLanStart').addEventListener('click', () => { show('lanOpts', false); openToFriends(); });
segSetup('mpModeSeg', () => { });
$('btnMultiplayer').addEventListener('click', () => { show('menu', false); show('mpScreen', true); mpStatus(CONFIG.mqttBrokers.length ? 'Type the 6-letter code your friend sees in their pause menu.' : 'Multiplayer is not configured.'); $('mpCode').focus(); });
$('btnMpBack').addEventListener('click', () => { show('mpScreen', false); show('menu', true); });
$('btnMpJoin').addEventListener('click', () => joinWorld($('mpCode').value));
$('mpCode').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') joinWorld($('mpCode').value); });
addEventListener('beforeunload', () => { if (MP.active) mpShutdown(); });

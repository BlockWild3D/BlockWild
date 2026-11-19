// ================= DEDICATED SERVER MODE (?server=1) =================
// Opened by tools/server/server.js in a hidden browser on a rented machine. The page loads (or creates) one world,
// opens it with a fixed join code and keeps it running for everyone, without drawing anything. Nobody plays as the
// host: the host "player" is an invisible spectator that rides along with the first player who joined, so the world
// around them (mobs, redstone, furnaces, crops) is simulated on the server instead of on someone's laptop.
// URL options: code=ABC123 (fixed join code), world=Name, seed=text (new worlds), mode=survival|creative|adventure
// (what joining players get), difficulty=peaceful|easy|normal|hard, cheats=1, max=10 (players), rd=6 (chunks kept loaded).
const SRV = { on: BW_SERVER, follow: null, sleepT: 0, log: [] };
if (BW_SERVER) {
  const q = new URLSearchParams(location.search);
  const say = (t) => { try { console.log('[server] ' + t); } catch (e) { } };
  SRV.say = say;
  // chat and join/leave lines go to the server console
  { const _cp = chatPrint; chatPrint = function (text, color, html) { say('chat: ' + String(text).replace(/<[^>]+>/g, '')); return _cp.apply(this, arguments); }; }
  // the server is not a player: invisible to everyone and can't be hit
  { const _ms = myState; myState = function () { const s = _ms.apply(this, arguments); s.spec = 1; s.held = 0; s.armor = {}; s.swing = 0; return s; }; }
  const until = (f, ms = 250) => new Promise((res) => { const t = setInterval(() => { try { if (f()) { clearInterval(t); res(); } } catch (e) { } }, ms); });
  SRV.start = async function () {
    if (SRV.started) return; SRV.started = true;
    try { if (typeof PROFILE !== 'undefined') PROFILE.name = 'Server'; } catch (e) { }
    S.renderDist = Math.max(3, Math.min(10, +q.get('rd') || 4)); S.simDist = Math.min(S.simDist || 5, S.renderDist - 1);
    MP.maxPlayers = Math.max(2, Math.min(20, +q.get('max') || 10)) + 1;
    say('waiting for saves'); await until(() => typeof Saves !== 'undefined' && Saves.ready, 300);
    const name = (q.get('world') || 'Server World').slice(0, 32);
    const meta = [...Saves.metas.values()].find((m) => m.name === name);
    if (meta) { say('loading world "' + name + '"'); await playWorld(meta.id); }
    else { say('creating world "' + name + '"'); S.worldId = Saves.newId(); S.worldName = name; startWorld({ v: 4, seed: seedFromText(q.get('seed') || ''), mode: q.get('wmode') === 'pvp' ? 'pvp' : 'creative', cheats: q.get('cheats') === '1', difficulty: q.get('difficulty') || 'normal' }); }
    await until(() => S.started && !S.loading, 300);
    if (q.get('difficulty')) S.difficulty = q.get('difficulty');
    if (q.has('cheats')) S.cheats = q.get('cheats') === '1';
    SRV.host();
    const code = (q.get('code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (code.length === 6) { const _nr = newRoomCode; newRoomCode = () => code; await openToFriends(); newRoomCode = _nr; } else await openToFriends();
    MP.joinMode = ['survival', 'creative', 'adventure', 'spectator'].includes(q.get('mode')) ? q.get('mode') : 'survival';
    if (!MP.active) { say('FAILED to open the world (see messages above). Retrying in 20 s'); setTimeout(() => location.reload(), 20000); return; }
    say('READY code=' + MP.code + ' world="' + S.worldName + '" mode=' + MP.joinMode);
  };
  // the host player: creative (so mobs ignore it) and "paused" (so it never moves on its own, picks up items or uses portals)
  SRV.host = function () { S.mode = 'creative'; G.mode = 'creative'; S.paused = true; player.flying = true; player.vel.set(0, 0, 0); };
  SRV.tick = function (dt) {
    if (!S.started || S.loading || !world) return;
    SRV.host();
    const joined = [...MP.peers.values()].filter((p) => p.joined);
    // ride along with the first player who joined (and is still here); if they changed dimension, follow them there
    let av = null; for (const p of joined) { const a = MP.avatars.get(p.id); if (a && a.dim && !a.dead && a.seen && a.netBuf && a.netBuf.length && a.pos.y > -50) { av = a; break; } }
    if (av) {
      if (av.dim !== world.dim) { say('following ' + av.name + ' to ' + av.dim); travelTo(av.dim, { type: 'bed', pos: { x: av.pos.x, y: av.pos.y, z: av.pos.z }, x: Math.floor(av.pos.x), z: Math.floor(av.pos.z) }); return; }
      player.pos.copy(av.pos);
    }
    // night is skipped once everyone in the world is in bed (the host never sleeps)
    if (joined.length && joined.every((p) => p.sleeping) && timeTicks() >= 12541 && timeTicks() <= 23458) { SRV.sleepT += dt; if (SRV.sleepT > 2.6) { SRV.sleepT = 0; S.time = 0; S.day++; if (MP.timeChanged) MP.timeChanged(); say('night skipped, day ' + S.day); } }
    else SRV.sleepT = 0;
    // dropped items normally expire inside the player update, which the server skips
    if (G.items.length) G.items = G.items.filter((i) => { if (i.gone) return false; if (i.age >= 300) { i.remove(); return false; } return true; });
  };
  { const _mt = mpTick; mpTick = function (dt) { try { SRV.tick(dt); } catch (e) { console.error(e); } return _mt.apply(this, arguments); }; }
  // XP orbs would fly into the invisible host
  { const _uo = updateOrbs; updateOrbs = function () { const d = player.dead; player.dead = true; try { return _uo.apply(this, arguments); } finally { player.dead = d; } }; }
  // typed into the server console: "/command" runs as the server (cheats allowed), anything else is said in chat
  SRV.command = function (line) { line = String(line || '').trim(); if (!line) return; if (line.startsWith('/')) runCommand(line.slice(1), { player, local: true }); else submitChat(line); };
  SRV.status = () => ({ code: MP.code, world: S.worldName, day: S.day, dim: world && world.dim, players: [...MP.peers.values()].filter((p) => p.joined).map((p) => p.name), mobs: G.mobs.length, chunks: world ? world.chunks.size : 0 });
  // Nothing is drawn, so chunks never need their 3D shapes built (the most expensive part of loading terrain), and the
  // cave culling that hides them has nothing to do. A chunk just counts as ready once it has its blocks.
  World.prototype.buildMesh = function (c) { c.dirty = false; };
  // no sound: with nobody listening, a hidden browser's audio clock can stand still and keep every sound ever played in memory
  Sfx.init = function () { }; Sfx.ctx = null;
  if (typeof updateCaveCulling === 'function') updateCaveCulling = function () { };
  // ask the matchmaking server for join requests every 2.5 s instead of 1.2 s: a server is open all day, and the faster
  // rate alone would use most of the free daily request allowance of the Cloudflare Worker
  { const _li = WorkerSignal.prototype.listen; WorkerSignal.prototype.listen = function (fn, ms) { return _li.call(this, fn, Math.max(ms || 0, 2500)); }; }
  // report slow saves (they run on the same thread as everything else)
  { const _sg = saveGame; saveGame = function () { const t0 = performance.now(); try { return _sg.apply(this, arguments); } finally { const d = performance.now() - t0; if (d > 500) say('save took ' + Math.round(d) + ' ms'); } }; }
  // keep the join code listed: renew it every 30 s (the matchmaking server forgets a code 3 minutes after the last
  // renewal) and log a heartbeat, so the console shows if the world stops answering
  SRV.fr = { n: 0, ms: 0, max: 0 };
  { const _tk = tick; tick = function (dt) { const t0 = performance.now(); try { return _tk.apply(this, arguments); } finally { const d = performance.now() - t0; SRV.fr.n++; SRV.fr.ms += d; SRV.fr.max = Math.max(SRV.fr.max, d); } }; }
  SRV.renew = async function () { if (!MP.active || MP.role !== 'host' || !MP.code || typeof SERVER !== 'function' || !SERVER()) return;
    try { const r = await fetch(SERVER() + '/room/open', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room: MP.code, host: myName() }) }); SRV.renewOk = r.ok ? Date.now() : SRV.renewOk; if (!r.ok) say('code renewal refused: ' + r.status); }
    catch (e) { say('code renewal failed: ' + e.message); } };
  setInterval(SRV.renew, 30000);
  setInterval(() => { const f = SRV.fr; SRV.fr = { n: 0, ms: 0, max: 0 };
    say('alive: ' + (f.n / 60).toFixed(1) + ' ticks/s, avg ' + (f.n ? f.ms / f.n : 0).toFixed(0) + ' ms, worst ' + f.max.toFixed(0) + ' ms | open ' + !!MP.active + ' code ' + MP.code + ' | players ' + [...MP.peers.values()].filter((p) => p.joined).length + ' | renewed ' + (SRV.renewOk ? Math.round((Date.now() - SRV.renewOk) / 1000) + ' s ago' : 'never') + (MP.sig && MP.sig.lastError ? ' | signal error: ' + MP.sig.lastError.message : ''));
    if (!MP.active && SRV.started && S.started && !S.loading) { say('world closed, reopening'); location.reload(); } }, 60000);
  addEventListener('load', () => setTimeout(SRV.start, 500));
  if (document.readyState === 'complete') setTimeout(SRV.start, 500);

  // ---- PvP arena worlds (wmode=pvp): nobody is the host, so the server runs the rounds. It is not in the lineup
  // itself; a round starts 5 seconds after at least two players are in their cages and everyone has picked a kit.
  { const _ec = enterCage; enterCage = function () { const r = _ec.apply(this, arguments); if (typeof AR !== 'undefined') { AR.roster.delete(arenaMe()); try { renderLobby(); } catch (e) { } } return r; }; }
  SRV.arT = 0; SRV.arHint = 0;
  SRV.arenaTick = function (dt) {
    if (!S.rules || !S.rules.arena || typeof AR === 'undefined' || AR.live || !S.arena || S.arena.phase !== 'cage') { SRV.arT = 0; return; }
    AR.roster.delete(arenaMe());
    const here = [...MP.peers.values()].filter(p => p.joined).map(p => p.id); const r = here.map(id => AR.roster.get(id));
    const ready = here.length >= 2 && r.every(x => x && x.kit != null);
    if (!ready) { SRV.arT = 0; SRV.arHint -= dt; if (here.length && SRV.arHint <= 0) { SRV.arHint = 30; mpSendAll({ t: 'chat', raw: here.length < 2 ? 'Waiting for another player to join the arena...' : 'Press K and pick a kit. The round starts when everyone has one.' }); } return; }
    if (SRV.arT === 0) mpSendAll({ t: 'chat', raw: 'Everyone has a kit. The round starts in 5 seconds!' });
    SRV.arT += dt; if (SRV.arT >= 5) { SRV.arT = 0; SRV.arHint = 0; arenaStart(); }
  };
  { const _t = SRV.tick; SRV.tick = function (dt) { _t.apply(this, arguments); try { SRV.arenaTick(dt); } catch (e) { console.error(e); } }; }
}

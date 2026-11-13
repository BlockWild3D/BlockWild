// BlockWild server: one plain Cloudflare Worker + D1 (no Durable Objects).
// Bindings: D1 database as DB.
// Variables (Settings > Variables and Secrets):
//   ALLOWED_ORIGINS   e.g. "https://blockwild3d.github.io"   (comma separated)
//   GOOGLE_CLIENT_ID  optional, enables Google sign-in / accounts
//   TURN_KEY_ID + TURN_KEY_API_TOKEN  optional (secret), Cloudflare Realtime TURN so friends on strict networks can connect
//
// Multiplayer matchmaking (the game data itself goes browser-to-browser over WebRTC):
//   POST /room/open   {room, host}      host opens/refreshes a join code (expires 3 min after the last refresh)
//   POST /room/close  {room}
//   GET  /room/check?room=CODE          -> {open, host}
//   POST /signal/send {room, from, to, data}    short connection messages (offer / answer)
//   GET  /signal/poll?room=&me=&after=  -> {msgs:[{id, from, data}]}
//   GET  /ice                           -> {iceServers} (STUN, plus TURN when configured)
// Accounts:
//   POST /auth {credential}  GET /me  PUT /profile {username, skin}  GET /skin/:username
const SESSION_DAYS = 30, ROOM_TTL = 180000, SIGNAL_TTL = 120000;
const json = (data, status, cors) => new Response(JSON.stringify(data), { status: status || 200, headers: Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, cors) });
function corsFor(req, env) {
  const origin = req.headers.get('Origin') || ''; const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin) || allowed.includes('*') || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || origin === 'null';
  return ok ? { 'Access-Control-Allow-Origin': origin || '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Max-Age': '86400', 'Vary': 'Origin' } : {};
}
const validRoom = (r) => typeof r === 'string' && /^[A-Z0-9]{6}$/.test(r);
const validId = (r) => typeof r === 'string' && /^[A-Za-z0-9_-]{2,40}$/.test(r);
async function verifyGoogle(credential, env) {
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential)); if (!r.ok) return null; const t = await r.json();
  if (!env.GOOGLE_CLIENT_ID || t.aud !== env.GOOGLE_CLIENT_ID) return null;
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(t.iss) || Number(t.exp) * 1000 < Date.now()) return null; return t;
}
function newToken() { const a = new Uint8Array(32); crypto.getRandomValues(a); return [...a].map(b => b.toString(16).padStart(2, '0')).join(''); }
async function userFromAuth(req, env) {
  const h = req.headers.get('Authorization') || ''; const token = h.startsWith('Bearer ') ? h.slice(7) : ''; if (!token) return null;
  const s = await env.DB.prepare('SELECT sub, expires FROM sessions WHERE token = ?').bind(token).first(); if (!s || s.expires < Date.now()) return null;
  return env.DB.prepare('SELECT sub, username, skin FROM users WHERE sub = ?').bind(s.sub).first();
}
async function iceServers(env) {
  const stun = [{ urls: 'stun:stun.cloudflare.com:3478' }, { urls: 'stun:stun.l.google.com:19302' }];
  if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return stun;
  const base = 'https://rtc.live.cloudflare.com/v1/turn/keys/' + env.TURN_KEY_ID + '/credentials/';
  const opts = { method: 'POST', headers: { Authorization: 'Bearer ' + env.TURN_KEY_API_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ ttl: 86400 }) };
  try { let r = await fetch(base + 'generate-ice-servers', opts); if (r.ok) { const j = await r.json(); if (Array.isArray(j.iceServers)) return j.iceServers; }
    r = await fetch(base + 'generate', opts); if (r.ok) { const j = await r.json(); const s = j.iceServers; if (s) return stun.concat(Array.isArray(s) ? s : [s]); } } catch (e) { }
  return stun;
}
export default {
  async fetch(req, env) {
    const cors = corsFor(req, env); const url = new URL(req.url); const p = url.pathname.replace(/\/+$/, '') || '/'; const now = Date.now();
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      if (p === '/' ) return json({ ok: true, service: 'blockwild', multiplayer: true, accounts: !!env.GOOGLE_CLIENT_ID, turn: !!(env.TURN_KEY_ID && env.TURN_KEY_API_TOKEN) }, 200, cors);
      // ---- multiplayer matchmaking ----
      if (p === '/room/open' && req.method === 'POST') {
        const { room, host } = await req.json(); if (!validRoom(room)) return json({ error: 'bad room code' }, 400, cors);
        await env.DB.prepare('INSERT INTO rooms (code, host, expires) VALUES (?, ?, ?) ON CONFLICT(code) DO UPDATE SET host = excluded.host, expires = excluded.expires').bind(room, String(host || '').slice(0, 16), now + ROOM_TTL).run();
        await env.DB.prepare('DELETE FROM rooms WHERE expires < ?').bind(now).run();
        return json({ ok: true }, 200, cors);
      }
      if (p === '/room/close' && req.method === 'POST') { const { room } = await req.json(); if (validRoom(room)) { await env.DB.prepare('DELETE FROM rooms WHERE code = ?').bind(room).run(); await env.DB.prepare('DELETE FROM signals WHERE room = ?').bind(room).run(); } return json({ ok: true }, 200, cors); }
      if (p === '/room/check') { const room = url.searchParams.get('room'); if (!validRoom(room)) return json({ open: false }, 200, cors); const r = await env.DB.prepare('SELECT host, expires FROM rooms WHERE code = ?').bind(room).first(); return json({ open: !!(r && r.expires > now), host: r ? r.host : null }, 200, cors); }
      if (p === '/signal/send' && req.method === 'POST') {
        const { room, from, to, data } = await req.json();
        if (!validRoom(room) || !validId(from) || !validId(to) || typeof data !== 'string' || data.length > 20000) return json({ error: 'bad signal' }, 400, cors);
        await env.DB.prepare('INSERT INTO signals (room, to_id, from_id, body, created) VALUES (?, ?, ?, ?, ?)').bind(room, to, from, data, now).run();
        await env.DB.prepare('DELETE FROM signals WHERE created < ?').bind(now - SIGNAL_TTL).run();
        return json({ ok: true }, 200, cors);
      }
      if (p === '/signal/poll') {
        const room = url.searchParams.get('room'), me = url.searchParams.get('me'), after = Number(url.searchParams.get('after') || 0);
        if (!validRoom(room) || !validId(me)) return json({ error: 'bad poll' }, 400, cors);
        const r = await env.DB.prepare('SELECT id, from_id, body FROM signals WHERE room = ? AND to_id = ? AND id > ? ORDER BY id LIMIT 20').bind(room, me, after).all();
        return json({ msgs: (r.results || []).map(x => ({ id: x.id, from: x.from_id, data: x.body })) }, 200, cors);
      }
      if (p === '/ice') return json({ iceServers: await iceServers(env) }, 200, cors);
      // ---- accounts ----
      if (p === '/auth' && req.method === 'POST') {
        const { credential } = await req.json(); const t = credential && await verifyGoogle(credential, env); if (!t) return json({ error: 'invalid Google sign-in' }, 401, cors);
        await env.DB.prepare('INSERT INTO users (sub, email, created, updated) VALUES (?, ?, ?, ?) ON CONFLICT(sub) DO UPDATE SET email = excluded.email').bind(t.sub, t.email || null, now, now).run();
        const token = newToken(); await env.DB.prepare('INSERT INTO sessions (token, sub, expires) VALUES (?, ?, ?)').bind(token, t.sub, now + SESSION_DAYS * 864e5).run();
        await env.DB.prepare('DELETE FROM sessions WHERE expires < ?').bind(now).run();
        const u = await env.DB.prepare('SELECT username, skin FROM users WHERE sub = ?').bind(t.sub).first();
        return json({ token, user: u }, 200, cors);
      }
      if (p === '/me') { const u = await userFromAuth(req, env); if (!u) return json({ error: 'signed out' }, 401, cors); return json({ user: { username: u.username, skin: u.skin } }, 200, cors); }
      if (p === '/profile' && req.method === 'PUT') {
        const u = await userFromAuth(req, env); if (!u) return json({ error: 'signed out' }, 401, cors);
        const { username, skin } = await req.json(); if (!/^[A-Za-z0-9_]{3,16}$/.test(username || '')) return json({ error: 'usernames are 3-16 letters, numbers or _' }, 400, cors);
        if (skin && String(skin).length > 40000) return json({ error: 'skin too large' }, 400, cors);
        const other = await env.DB.prepare('SELECT sub FROM users WHERE username = ? COLLATE NOCASE AND sub != ?').bind(username, u.sub).first(); if (other) return json({ error: 'username taken' }, 409, cors);
        await env.DB.prepare('UPDATE users SET username = ?, skin = ?, updated = ? WHERE sub = ?').bind(username, skin || null, now, u.sub).run();
        return json({ ok: true }, 200, cors);
      }
      const m = p.match(/^\/skin\/([A-Za-z0-9_]{3,16})$/);
      if (m) { const u = await env.DB.prepare('SELECT skin FROM users WHERE username = ? COLLATE NOCASE').bind(m[1]).first(); return json({ skin: u ? u.skin : null }, u ? 200 : 404, cors); }
      return json({ error: 'not found' }, 404, cors);
    } catch (e) { return json({ error: 'server error: ' + (e && e.message || e) }, 500, cors); }
  },
};

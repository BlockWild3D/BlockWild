// BlockWild accounts Worker (plain Cloudflare Worker + D1, no Durable Objects).
// Bindings: D1 database as DB. Variables: GOOGLE_CLIENT_ID (the same Client ID as in src/js/00_config.js),
// ALLOWED_ORIGINS (comma separated, e.g. "https://blockwild3d.github.io").
// Routes:
//   POST /auth     {credential}           -> verifies the Google ID token, returns {token, user:{username, skin}}
//   GET  /me       (Bearer token)         -> {user}
//   PUT  /profile  (Bearer token) {username, skin} -> saves; 409 if the username is taken
//   GET  /skin/:username                  -> {skin} (public, so friends can fetch your skin)
const SESSION_DAYS = 30;
const json = (data, status, cors) => new Response(JSON.stringify(data), { status: status || 200, headers: Object.assign({ 'Content-Type': 'application/json' }, cors) });
function corsFor(req, env) {
  const origin = req.headers.get('Origin') || ''; const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin) || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
  return ok ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Vary': 'Origin' } : {};
}
async function verifyGoogle(credential, env) {
  // Google's tokeninfo endpoint checks the signature and expiry for us
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential));
  if (!r.ok) return null; const t = await r.json();
  if (t.aud !== env.GOOGLE_CLIENT_ID) return null;
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(t.iss)) return null;
  if (Number(t.exp) * 1000 < Date.now()) return null;
  return t;
}
function newToken() { const a = new Uint8Array(32); crypto.getRandomValues(a); return [...a].map(b => b.toString(16).padStart(2, '0')).join(''); }
async function userFromAuth(req, env) {
  const h = req.headers.get('Authorization') || ''; const token = h.startsWith('Bearer ') ? h.slice(7) : ''; if (!token) return null;
  const s = await env.DB.prepare('SELECT sub, expires FROM sessions WHERE token = ?').bind(token).first(); if (!s || s.expires < Date.now()) return null;
  return env.DB.prepare('SELECT sub, username, skin FROM users WHERE sub = ?').bind(s.sub).first();
}
const validName = (n) => typeof n === 'string' && /^[A-Za-z0-9_]{3,16}$/.test(n);
export default {
  async fetch(req, env) {
    const cors = corsFor(req, env); const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      if (url.pathname === '/auth' && req.method === 'POST') {
        const { credential } = await req.json(); const t = credential && await verifyGoogle(credential, env); if (!t) return json({ error: 'invalid Google sign-in' }, 401, cors);
        const now = Date.now();
        await env.DB.prepare('INSERT INTO users (sub, email, created, updated) VALUES (?, ?, ?, ?) ON CONFLICT(sub) DO UPDATE SET email = excluded.email').bind(t.sub, t.email || null, now, now).run();
        const token = newToken(); await env.DB.prepare('INSERT INTO sessions (token, sub, expires) VALUES (?, ?, ?)').bind(token, t.sub, now + SESSION_DAYS * 864e5).run();
        await env.DB.prepare('DELETE FROM sessions WHERE expires < ?').bind(now).run();
        const u = await env.DB.prepare('SELECT username, skin FROM users WHERE sub = ?').bind(t.sub).first();
        return json({ token, user: u }, 200, cors);
      }
      if (url.pathname === '/me' && req.method === 'GET') { const u = await userFromAuth(req, env); if (!u) return json({ error: 'signed out' }, 401, cors); return json({ user: { username: u.username, skin: u.skin } }, 200, cors); }
      if (url.pathname === '/profile' && req.method === 'PUT') {
        const u = await userFromAuth(req, env); if (!u) return json({ error: 'signed out' }, 401, cors);
        const { username, skin } = await req.json(); if (!validName(username)) return json({ error: 'usernames are 3-16 letters, numbers or _' }, 400, cors);
        if (skin && String(skin).length > 40000) return json({ error: 'skin too large' }, 400, cors);
        const other = await env.DB.prepare('SELECT sub FROM users WHERE username = ? COLLATE NOCASE AND sub != ?').bind(username, u.sub).first(); if (other) return json({ error: 'username taken' }, 409, cors);
        await env.DB.prepare('UPDATE users SET username = ?, skin = ?, updated = ? WHERE sub = ?').bind(username, skin || null, Date.now(), u.sub).run();
        return json({ ok: true }, 200, cors);
      }
      const m = url.pathname.match(/^\/skin\/([A-Za-z0-9_]{3,16})$/);
      if (m && req.method === 'GET') { const u = await env.DB.prepare('SELECT skin FROM users WHERE username = ? COLLATE NOCASE').bind(m[1]).first(); return json({ skin: u ? u.skin : null }, u ? 200 : 404, cors); }
      return json({ error: 'not found' }, 404, cors);
    } catch (e) { return json({ error: 'server error' }, 500, cors); }
  },
};

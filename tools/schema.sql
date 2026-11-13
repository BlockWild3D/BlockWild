-- BlockWild server (Cloudflare D1). Optional: the Worker creates these tables itself on first use.
CREATE TABLE IF NOT EXISTS users (
  sub TEXT PRIMARY KEY,            -- Google account id
  email TEXT,
  username TEXT UNIQUE COLLATE NOCASE,
  skin TEXT,                       -- JSON: {"png": dataURL} or {"cfg": {...}}
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, sub TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_sub ON sessions(sub);
-- multiplayer matchmaking: open worlds (join codes) and the short connection messages exchanged while joining
CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, host TEXT, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS signals (id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT NOT NULL, to_id TEXT NOT NULL, from_id TEXT NOT NULL, body TEXT NOT NULL, created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS signals_to ON signals(room, to_id, id);

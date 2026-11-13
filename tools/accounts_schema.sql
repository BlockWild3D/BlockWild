-- BlockWild accounts (Cloudflare D1). Run once in the D1 console before deploying the Worker.
CREATE TABLE IF NOT EXISTS users (
  sub TEXT PRIMARY KEY,            -- Google account id
  email TEXT,
  username TEXT UNIQUE COLLATE NOCASE,
  skin TEXT,                       -- JSON: {"png": dataURL} or {"cfg": {...}}
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  sub TEXT NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_sub ON sessions(sub);

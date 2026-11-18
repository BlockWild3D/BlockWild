# BlockWild server on Cloudflare (multiplayer join codes, TURN, accounts)

This is a single plain Cloudflare Worker with a D1 database, like Crossguard. It needs no Durable Objects.

The Worker handles three things:

- **Join codes:** when a friend types your code, the Worker passes the short connection message between the two browsers. After that, the game data goes directly between browsers.
- **TURN (optional):** a relay for players on school, work or mobile networks that block direct connections.
- **Accounts (optional):** Google sign-in, unique usernames and skins that follow you to any device.

## 1. Database

1. In the Cloudflare dashboard, go to **Storage & Databases → D1 → Create** and name it `blockwild`.
2. Open its **Console** tab, paste in everything from `tools/schema.sql`, and run it.

## 2. Worker

1. Go to **Workers & Pages → Create → Create Worker**, name it `blockwild-server`, and deploy the starter.
2. Click **Edit code**, replace everything with the contents of `tools/worker.js`, then press **Deploy**.
3. Go to **Settings → Bindings → Add → D1 database**. Set the variable name to `DB` and the database to `blockwild`.
4. Go to **Settings → Variables and Secrets** and add:
   - `ALLOWED_ORIGINS` (text): `https://blockwild3d.github.io`
5. Open the Worker's URL in your browser, for example `https://blockwild-server.<you>.workers.dev`. It should show `{"ok":true,"service":"blockwild",...}`.

## 3. Point the game at it

1. In `src/js/00_config.js`, set `serverUrl: 'https://blockwild-server.<you>.workers.dev'`.
2. Run `python3 tools/build.py`, then push.

Or send Claude the URL and it will do this step for you.

## Optional: TURN relay (friends who still can't connect)

1. In the dashboard, go to **Realtime → TURN Server → Create**.
2. Copy the **Turn Token ID** and the **API Token**.
3. In the Worker's **Settings → Variables and Secrets**, add:
   - `TURN_KEY_ID`: the Turn Token ID
   - `TURN_KEY_API_TOKEN`: the API Token, saved as a **Secret**

## Optional: Google sign-in and accounts

1. In Google Cloud Console, go to **APIs & Services → Credentials**. Open your OAuth Client ID (Web); the Crossguard one works.
2. Add `https://blockwild3d.github.io` to its **Authorized JavaScript origins**.
3. Put the Client ID in `src/js/00_config.js` as `googleClientId`.
4. Add it to the Worker as the variable `GOOGLE_CLIENT_ID`.

Only the Client ID goes in the game. Never put the client secret in the game.

## Checking it

- Open `<worker url>/` to see which features are on. It reports `"turn": true` and `"accounts": true` when those are set up.
- In the game, the host presses **Open to Friends**. The friend types the code under **Multiplayer**. If anything fails, the Multiplayer screen says which step failed.

---

# Dedicated server (a rented machine that hosts your world 24/7)

Normally the player who presses Open to Friends runs the whole world in their browser, so a slow host laptop makes
everyone lag. The dedicated server runs the game in a hidden browser on a rented Linux machine instead. Nobody has to
host, the world stays up when you log off, and the join code never changes.

**Machine:** at least 2 CPU cores and **4 GB of memory** (the game uses about 2.2 GB on its own, so a 2 GB plan will crash).
Ubuntu 22.04 or 24.04. Pick a location close to where you and your friends live.

## Setup (once)

Log in to the machine (`ssh root@YOUR_SERVER_IP`) and run:

```
apt update && apt install -y git curl
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
git clone https://github.com/BlockWild3D/BlockWild.git
cd BlockWild/tools/server
npm install
npx playwright install --with-deps chromium
```

## Run it

```
node server.js --code BLOCK1 --world "Server World"
```

Wait for `READY code=BLOCK1`, then everyone joins with that code from the normal Join screen. Pick your own 6-character code
(letters and numbers). Options: `--mode creative`, `--difficulty hard`, `--cheats`, `--max 10`, `--rd 6` (lower = less CPU).

Type into that window to control it: `status`, `/time set day`, `/weather clear`, `/tp Name 0 100 0`, any text to chat, `stop` to save and quit.

## Keep it running after you log out

```
npm install -g pm2
pm2 start server.js --name blockwild -- --code BLOCK1 --world "Server World"
pm2 save && pm2 startup
```

`pm2 logs blockwild` shows what it's doing. `pm2 restart blockwild` restarts it. After a game update, restart it so it loads the new
version (players need the same version). Worlds are saved in `tools/server/data`; back that folder up.

## How it works / limits

- The server's own "player" is invisible and rides along with the first player who joined, so the world around that player
  (mobs, farms, redstone) is simulated on the server. Other players far away from them simulate their own surroundings, the
  same as with a normal host.
- Night is skipped when every player is in bed.

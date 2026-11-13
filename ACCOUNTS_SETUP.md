# Google sign-in and accounts setup

Sign-in is optional. Without it, players still choose a username and skin, and both are saved in their browser. Multiplayer works either way.

Do these steps in order.

## 1. Google Client ID (needed for the sign-in button)

You can reuse the OAuth client you already made for Crossguard.

1. Open Google Cloud Console and go to **APIs & Services → Credentials**.
2. Open the **OAuth 2.0 Client ID (Web application)** that Crossguard uses, or create a new one.
3. Under **Authorized JavaScript origins**, add `https://blockwild3d.github.io`.
4. Copy the **Client ID**. It ends in `.apps.googleusercontent.com`.

The Client ID is public, so it's safe to put in the game. Never put the client *secret* in the game.

5. Put the Client ID in `src/js/00_config.js` as `googleClientId: '...'`.
6. Run `python3 tools/build.py`, then commit and push.

The game now shows a **Sign in with Google** button on the Profile screen. Without step 7 below, profiles still live only on each device.

## 2. Cloudflare Worker + D1 (optional, for unique usernames on every device)

This follows the same pattern as Crossguard: one plain Worker and one D1 database. No Durable Objects are needed.

1. In the Cloudflare dashboard, go to **Storage & Databases → D1** and create a database called `blockwild`.
2. Open its **Console** tab and run everything in `tools/accounts_schema.sql`.
3. Go to **Workers & Pages → Create → Worker** and name it `blockwild-accounts`.
4. Paste in the contents of `tools/accounts_worker.js`, then deploy.
5. In the Worker's **Settings**, set these bindings and variables:
   - **D1 database binding:** variable name `DB`, database `blockwild`.
   - **Variable** `GOOGLE_CLIENT_ID`: the same Client ID as in step 1.
   - **Variable** `ALLOWED_ORIGINS`: `https://blockwild3d.github.io`
6. Copy the Worker's URL, for example `https://blockwild-accounts.<you>.workers.dev`.
7. Put that URL in `src/js/00_config.js` as `accountsUrl: '...'`, then rebuild and push.

After this, signing in saves the player's username and skin to their Google account. Usernames are unique, ignoring capitals.

## Multiplayer networking

Multiplayer needs no setup. Players find each other through free public MQTT brokers, listed under `mqttBrokers` in the config. After that, the game data goes directly between browsers over WebRTC.

A few school or work networks block direct connections. If friends on those networks see "could not connect directly", add a TURN server to `iceServers` in the config. Cloudflare Calls TURN and Twilio both offer one.

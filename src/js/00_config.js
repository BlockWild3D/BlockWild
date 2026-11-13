// ================= CONFIG (edit these, then run: python3 tools/build.py) =================
// googleClientId: the OAuth 2.0 Client ID (Web) from Google Cloud. Add your site, e.g. https://blockwild3d.github.io,
//   to its "Authorized JavaScript origins". The Client ID is public; never put a client SECRET here.
// serverUrl: your Cloudflare Worker from tools/worker.js (see SERVER_SETUP.md). It handles multiplayer join codes,
//   TURN relays for strict networks, and (with googleClientId) accounts. Without it the game falls back to public brokers.
// mqttBrokers: public MQTT-over-WebSocket brokers, only used for join codes when serverUrl is empty.
// iceServers: STUN servers for peer-to-peer connections. Add a TURN server here if friends behind strict networks can't connect.
const CONFIG = {
  // Google only allows sign-in from these sites (the client ID's authorized JavaScript origins).
  signInOrigins: ['https://blockwild3d.github.io'],
  siteUrl: 'https://blockwild3d.github.io/BlockWild/',
  googleClientId: '617077929021-3n4kk41q3sevnb98ek82e8g54iqm197u.apps.googleusercontent.com',
  serverUrl: 'https://blockwild-server.crossguardstudios.workers.dev',
  mqttBrokers: ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'],
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }],
};

// ================= CONFIG (edit these, then run: python3 tools/build.py) =================
// googleClientId: the OAuth 2.0 Client ID (Web) from Google Cloud. Add your site, e.g. https://blockwild3d.github.io,
//   to its "Authorized JavaScript origins". The Client ID is public; never put a client SECRET here.
// accountsUrl: optional Cloudflare Worker from tools/accounts_worker.js (see ACCOUNTS_SETUP.md). With it, usernames are
//   unique and your profile follows your Google account to any device. Without it, the profile stays on this device.
// mqttBrokers: public MQTT-over-WebSocket brokers used only to introduce players to each other for multiplayer.
// iceServers: STUN servers for peer-to-peer connections. Add a TURN server here if friends behind strict networks can't connect.
const CONFIG = {
  googleClientId: '',
  accountsUrl: '',
  mqttBrokers: ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'],
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }],
};

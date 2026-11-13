// ================= PROFILE: username, Google sign-in, skins, player model =================
const SKIN_PARTS = ['skin', 'hair', 'eyes', 'shirt', 'accent', 'pants', 'shoes'];
const SKIN_LABEL = { skin: 'Skin', hair: 'Hair', eyes: 'Eyes', shirt: 'Top', accent: 'Accent', pants: 'Pants', shoes: 'Shoes' };
const HAIR_STYLES = ['short', 'long', 'buzz', 'cap', 'bald'], TOP_STYLES = ['tee', 'hoodie', 'jacket', 'tank'];
const SKIN_PRESETS = {
  Explorer: { skin: '#c58c64', hair: '#4a2c17', eyes: '#3a6ea8', shirt: '#2a9d8f', accent: '#e9c46a', pants: '#2f4a7a', shoes: '#3b2a1e', hairStyle: 'short', top: 'tee' },
  Miner: { skin: '#e8b99a', hair: '#1d1d1d', eyes: '#5a3a1a', shirt: '#e07a1f', accent: '#ffd23f', pants: '#4b4b52', shoes: '#262626', hairStyle: 'cap', top: 'hoodie' },
  Ranger: { skin: '#6b4430', hair: '#141010', eyes: '#2f5d2a', shirt: '#3d6b35', accent: '#8a5a2b', pants: '#5c4128', shoes: '#2d2016', hairStyle: 'long', top: 'jacket' },
  Builder: { skin: '#f0c8a8', hair: '#c9772f', eyes: '#2a5b8f', shirt: '#3567c4', accent: '#f2c230', pants: '#3a3a40', shoes: '#5a3a22', hairStyle: 'buzz', top: 'tee' },
  Mystic: { skin: '#a8755a', hair: '#e8e8f0', eyes: '#8a3fd1', shirt: '#5b2c86', accent: '#d4af37', pants: '#2b1840', shoes: '#1a1020', hairStyle: 'long', top: 'hoodie' },
  Skyrunner: { skin: '#f3d2b8', hair: '#e8c35a', eyes: '#2f8fd8', shirt: '#7fd1ff', accent: '#ffffff', pants: '#e8e8e8', shoes: '#ff5a5a', hairStyle: 'short', top: 'tank' },
};
function loadProfile() { try { return JSON.parse(localStorage.getItem('blockwild_profile') || 'null'); } catch (e) { return null; } }
const PROFILE = loadProfile() || { name: 'Player' + (100 + Math.floor(Math.random() * 900)), skin: Object.assign({}, SKIN_PRESETS.Explorer), png: null, google: null, token: null };
function saveProfile() { try { localStorage.setItem('blockwild_profile', JSON.stringify(PROFILE)); } catch (e) { } }
saveProfile();
const validName = (n) => /^[A-Za-z0-9_]{3,16}$/.test(n);

// ---- skin painting (Minecraft 64x64 layout) ----
function hexToRgb(h) { return hexc(h); }
function faceRects(u, v, w, h, d) { return { top: [u + d, v, w, d], bottom: [u + d + w, v, w, d], right: [u, v + d, d, h], front: [u + d, v + d, w, h], left: [u + d + w, v + d, d, h], back: [u + d + w + d, v + d, w, h] }; }
function paintBox(ctx, u, v, w, h, d, fn) { const R = faceRects(u, v, w, h, d); for (const f in R) { const [x0, y0, fw, fh] = R[f]; for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) { const c = fn(f, x, y, fw, fh); if (c) { ctx.fillStyle = c; ctx.fillRect(x0 + x, y0 + y, 1, 1); } } } }
function makeSkinCanvas(cfg) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const ctx = cv.getContext('2d');
  const r = mulberry32(12345); const tone = (hex, amt = 7, dark = 0) => { const c = hexToRgb(hex); const f = (r() * 2 - 1) * amt - dark; return 'rgb(' + clamp(c[0] + f, 0, 255) + ',' + clamp(c[1] + f, 0, 255) + ',' + clamp(c[2] + f, 0, 255) + ')'; };
  const hs = cfg.hairStyle || 'short', top = cfg.top || 'tee';
  // head
  paintBox(ctx, 0, 0, 8, 8, 8, (f, x, y) => {
    if (f === 'top') return hs === 'bald' ? tone(cfg.skin) : tone(cfg.hair, 8);
    if (f === 'bottom') return tone(cfg.skin, 4, 18);
    const hairRows = hs === 'bald' ? -1 : f === 'front' ? (hs === 'buzz' ? 0 : 1) : f === 'back' ? (hs === 'long' ? 7 : hs === 'buzz' ? 2 : 4) : (hs === 'long' ? 6 : hs === 'buzz' ? 1 : 2);
    if (y <= hairRows && !(f === 'front' && hs === 'long' && y === 1 && x > 1 && x < 6)) return tone(cfg.hair, 8);
    if (f === 'front') {
      if (y === 4 && (x === 1 || x === 6)) return '#f4f4f4';
      if (y === 4 && (x === 2 || x === 5)) return cfg.eyes;
      if (y === 3 && (x >= 1 && x <= 2 || x >= 5 && x <= 6) && hs !== 'bald') return tone(cfg.hair, 4, 10);
      if (y === 6 && (x === 3 || x === 4)) return tone(cfg.skin, 3, 40);
      if (y === 5 && (x === 3 || x === 4)) return tone(cfg.skin, 3, 14);
    }
    return tone(cfg.skin, 5);
  });
  // hat layer: cap
  if (hs === 'cap') paintBox(ctx, 32, 0, 8, 8, 8, (f, x, y) => (f === 'top' || (f !== 'bottom' && y <= 2) || (f === 'front' && y === 3)) ? tone(cfg.accent, 8, f === 'front' && y === 3 ? 25 : 0) : null);
  // body
  const shirt = (f, x, y, fw) => {
    if (f === 'bottom') return tone(cfg.pants, 5, 10);
    if (f === 'front' && y === 11) return tone(cfg.pants, 3, 30);
    if (top === 'jacket' && f === 'front' && (x === 3 || x === 4)) return tone(cfg.accent, 6);
    if (top === 'hoodie' && f === 'front' && y >= 7 && y <= 9 && x >= 2 && x <= 5) return tone(cfg.shirt, 4, 22);
    if (top === 'hoodie' && f === 'front' && y >= 1 && y <= 4 && (x === 2 || x === 5) && y % 2) return tone(cfg.accent, 3);
    if (top === 'tank' && f === 'front' && y <= 1 && x >= 2 && x <= 5) return tone(cfg.skin, 5);
    if (top === 'tee' && f === 'front' && y === 0 && x >= 3 && x <= 4) return tone(cfg.skin, 5);
    return tone(cfg.shirt, 6);
  };
  paintBox(ctx, 16, 16, 8, 12, 4, shirt);
  const arm = (f, x, y) => {
    if (f === 'top') return top === 'tank' ? tone(cfg.skin, 5) : tone(cfg.shirt, 6);
    if (f === 'bottom') return tone(cfg.skin, 4, 12);
    const sleeve = top === 'tank' ? -1 : top === 'tee' ? 3 : 9;
    if (y <= sleeve) return tone(cfg.shirt, 6, y === sleeve && top !== 'tee' ? 18 : 0);
    if (top === 'jacket' && y === sleeve + 1) return tone(cfg.accent, 4);
    return tone(cfg.skin, 5);
  };
  paintBox(ctx, 40, 16, 4, 12, 4, arm); paintBox(ctx, 32, 48, 4, 12, 4, arm);
  const leg = (f, x, y) => { if (f === 'top') return tone(cfg.pants, 5); if (f === 'bottom') return tone(cfg.shoes, 4, 15); if (y >= 10) return tone(cfg.shoes, 5); if (y === 9) return tone(cfg.pants, 4, 18); return tone(cfg.pants, 6); };
  paintBox(ctx, 0, 16, 4, 12, 4, leg); paintBox(ctx, 16, 48, 4, 12, 4, leg);
  return cv;
}
let SKIN_CANVAS = null;
function profileSkinCanvas(cb) {
  if (PROFILE.png) { const img = new Image(); img.onload = () => { const cv = normalizeSkin(img); SKIN_CANVAS = cv; cb && cb(cv); }; img.onerror = () => { PROFILE.png = null; SKIN_CANVAS = makeSkinCanvas(PROFILE.skin); cb && cb(SKIN_CANVAS); }; img.src = PROFILE.png; return; }
  SKIN_CANVAS = makeSkinCanvas(PROFILE.skin); cb && cb(SKIN_CANVAS);
}
// accepts 64x64 skins and old 64x32 ones (left limbs copied from the right)
function normalizeSkin(img) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
  if (img.height === 32) { x.drawImage(img, 0, 0); x.save(); x.drawImage(cv, 0, 16, 16, 16, 16, 48, 16, 16); x.drawImage(cv, 40, 16, 16, 16, 32, 48, 16, 16); x.restore(); }
  else x.drawImage(img, 0, 0, 64, 64); return cv;
}
// 2D preview: front and back views, overlays included
function drawSkinPreview(canvas, skin) {
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.imageSmoothingEnabled = false; const s = 6;
  const blit = (sx, sy, w, h, dx, dy) => ctx.drawImage(skin, sx, sy, w, h, dx * s, dy * s, w * s, h * s);
  const view = (ox, back) => {
    const F = back ? 'back' : 'front'; const R = (u, v, w, h, d) => faceRects(u, v, w, h, d)[F];
    const parts = back ? [[R(0, 0, 8, 8, 8), 4, 0], [R(16, 16, 8, 12, 4), 4, 8], [R(40, 16, 4, 12, 4), 12, 8], [R(32, 48, 4, 12, 4), 0, 8], [R(0, 16, 4, 12, 4), 8, 20], [R(16, 48, 4, 12, 4), 4, 20]]
      : [[R(0, 0, 8, 8, 8), 4, 0], [R(16, 16, 8, 12, 4), 4, 8], [R(40, 16, 4, 12, 4), 0, 8], [R(32, 48, 4, 12, 4), 12, 8], [R(0, 16, 4, 12, 4), 4, 20], [R(16, 48, 4, 12, 4), 8, 20]];
    const over = back ? [[R(32, 0, 8, 8, 8), 4, 0], [R(16, 32, 8, 12, 4), 4, 8], [R(40, 32, 4, 12, 4), 12, 8], [R(48, 48, 4, 12, 4), 0, 8], [R(0, 32, 4, 12, 4), 8, 20], [R(0, 48, 4, 12, 4), 4, 20]]
      : [[R(32, 0, 8, 8, 8), 4, 0], [R(16, 32, 8, 12, 4), 4, 8], [R(40, 32, 4, 12, 4), 0, 8], [R(48, 48, 4, 12, 4), 12, 8], [R(0, 32, 4, 12, 4), 4, 20], [R(0, 48, 4, 12, 4), 8, 20]];
    for (const [[u, v, w, h], dx, dy] of parts.concat(over)) blit(u, v, w, h, ox + dx, dy + 2);
  };
  view(1, false); view(20, true);
}

// ---- 3D player model (used for other players in multiplayer) ----
function boxUV(geo, u, v, w, h, d) {
  const R = faceRects(u, v, w, h, d); const order = ['left', 'right', 'top', 'bottom', 'front', 'back']; // px, nx, py, ny, pz, nz
  const uv = geo.attributes.uv;
  order.forEach((f, i) => { const [x, y, fw, fh] = R[f]; const u0 = x / 64, u1 = (x + fw) / 64, v0 = 1 - y / 64, v1 = 1 - (y + fh) / 64;
    const flipTop = f === 'bottom'; uv.setXY(i * 4, u0, flipTop ? v1 : v0); uv.setXY(i * 4 + 1, u1, flipTop ? v1 : v0); uv.setXY(i * 4 + 2, u0, flipTop ? v0 : v1); uv.setXY(i * 4 + 3, u1, flipTop ? v0 : v1); });
  uv.needsUpdate = true; return geo;
}
const PX = 1.8 / 32;
function makePlayerModel(skinCanvas, name) {
  const tex = new THREE.CanvasTexture(skinCanvas); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
  const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, transparent: false }); const omat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const part = (u, v, w, h, d, ou, ov, px, py, pz, ox, oy, oz) => { // pivot at (px,py,pz) pixels; box offset (ox,oy,oz)
    const g = new THREE.Group(); g.position.set(px * PX, py * PX, pz * PX);
    const m = new THREE.Mesh(boxUV(new THREE.BoxGeometry(w * PX, h * PX, d * PX), u, v, w, h, d), mat); m.position.set(ox * PX, oy * PX, oz * PX); g.add(m);
    const o = new THREE.Mesh(boxUV(new THREE.BoxGeometry((w + 0.5) * PX, (h + 0.5) * PX, (d + 0.5) * PX), ou, ov, w, h, d), omat); o.position.copy(m.position); g.add(o);
    for (const x of [m, o]) x.layers.enable(1);
    body.add(g); return g;
  };
  const P = {};
  P.legR = part(0, 16, 4, 12, 4, 0, 32, -2, 12, 0, 0, -6, 0); P.legL = part(16, 48, 4, 12, 4, 0, 48, 2, 12, 0, 0, -6, 0);
  P.torso = part(16, 16, 8, 12, 4, 16, 32, 0, 12, 0, 0, 6, 0);
  P.armR = part(40, 16, 4, 12, 4, 40, 32, -6, 22, 0, 0, -4, 0); P.armL = part(32, 48, 4, 12, 4, 48, 48, 6, 22, 0, 0, -4, 0);
  P.head = part(0, 0, 8, 8, 8, 32, 0, 0, 24, 0, 0, 4, 0);
  // name tag
  let tag = null; if (name) { const c = document.createElement('canvas'); const x = c.getContext('2d'); x.font = '28px monospace'; const w = Math.ceil(x.measureText(name).width) + 16; c.width = w; c.height = 40; x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(0, 0, w, 40); x.font = '28px monospace'; x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.fillText(name, 8, 21);
    const t = new THREE.CanvasTexture(c); tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: true, transparent: true })); tag.scale.set(w / 40 * 0.32, 0.32, 1); tag.position.y = 2.15; root.add(tag); }
  // held item
  const held = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.3 })); held.scale.setScalar(0.45); held.position.set(0, -10 * PX, -3 * PX); held.visible = false; P.armR.add(held);
  return { root, body, P, tex, mat, omat, tag, held, heldId: 0, walk: 0,
    setSkin(cv) { tex.image = cv; tex.needsUpdate = true; },
    setHeld(id) { if (id === this.heldId) return; this.heldId = id; if (!id || !ICON_CANVAS[id]) { held.visible = false; return; } const t = new THREE.CanvasTexture(ICON_CANVAS[id]); t.magFilter = THREE.NearestFilter; held.material.map = t; held.material.needsUpdate = true; held.visible = true; },
    animate(dt, speed, pitch, swing, sneak, hurt) {
      this.walk += dt * Math.min(speed, 6) * 2.2; const a = Math.sin(this.walk) * Math.min(1, speed / 4) * 0.8;
      P.legR.rotation.x = a; P.legL.rotation.x = -a; P.armR.rotation.x = -a * 0.8 - (swing > 0 ? Math.sin(swing * Math.PI) * 1.4 : 0); P.armL.rotation.x = a * 0.8;
      P.head.rotation.x = -pitch; body.position.y = sneak ? -0.12 : 0; body.rotation.x = sneak ? 0.35 : 0;
      mat.color.setRGB(1, hurt > 0 ? 0.5 : 1, hurt > 0 ? 0.5 : 1); omat.color.copy(mat.color);
    },
    dispose() { tex.dispose(); mat.dispose(); omat.dispose(); if (tag) { tag.material.map.dispose(); tag.material.dispose(); } },
  };
}

// ---- profile screen ----
let profDraft = null;
function openProfile() {
  profDraft = JSON.parse(JSON.stringify(PROFILE)); show('menu', false); show('profile', true);
  $('pName').value = profDraft.name; $('pNameMsg').textContent = ''; renderSkinEditor(); renderAccount(); refreshPreview();
}
function renderSkinEditor() {
  const pr = $('pPresets'); pr.innerHTML = '';
  for (const k in SKIN_PRESETS) { const b = document.createElement('button'); b.className = 'sbtn'; b.textContent = k; b.onclick = () => { profDraft.skin = Object.assign({}, SKIN_PRESETS[k]); profDraft.png = null; renderSkinEditor(); refreshPreview(); }; pr.appendChild(b); }
  const box = $('pColors'); box.innerHTML = '';
  for (const k of SKIN_PARTS) { const l = document.createElement('label'); l.className = 'pcolor'; l.innerHTML = '<span>' + SKIN_LABEL[k] + '</span>'; const inp = document.createElement('input'); inp.type = 'color'; inp.value = profDraft.skin[k] || '#888888'; inp.oninput = () => { profDraft.skin[k] = inp.value; profDraft.png = null; refreshPreview(); }; l.appendChild(inp); box.appendChild(l); }
  const sel = (label, key, opts) => { const l = document.createElement('label'); l.className = 'pcolor'; l.innerHTML = '<span>' + label + '</span>'; const s = document.createElement('select'); for (const o of opts) { const op = document.createElement('option'); op.value = o; op.textContent = o[0].toUpperCase() + o.slice(1); s.appendChild(op); } s.value = profDraft.skin[key]; s.onchange = () => { profDraft.skin[key] = s.value; profDraft.png = null; refreshPreview(); }; l.appendChild(s); box.appendChild(l); };
  sel('Hair style', 'hairStyle', HAIR_STYLES); sel('Top style', 'top', TOP_STYLES);
  $('pSkinNote').textContent = profDraft.png ? 'Using an uploaded skin. Pick a preset or change a colour to go back to the editor.' : '';
}
function refreshPreview() {
  const draw = (cv) => drawSkinPreview($('pPreview'), cv);
  if (profDraft.png) { const img = new Image(); img.onload = () => draw(normalizeSkin(img)); img.src = profDraft.png; } else draw(makeSkinCanvas(profDraft.skin));
}
function renderAccount() {
  const g = profDraft.google; const a = $('pAcct');
  show('btnSignOut', !!g);
  if (g) a.innerHTML = 'Signed in with Google as <b>' + esc(g.name || g.email || 'you') + '</b>' + (CONFIG.accountsUrl ? (profDraft.token ? ' - profile saved to your account' : ' - account server not reached') : ' - profile is kept on this device');
  else if (!CONFIG.googleClientId) a.textContent = 'Google sign-in is not set up on this copy of BlockWild yet (it needs a Google Client ID in the game config). You can still pick a username and skin; they are saved on this device.';
  else a.textContent = 'Sign in with Google to keep your username and skin across devices.';
  const box = $('gsiBox'); box.innerHTML = '';
  if (!g && CONFIG.googleClientId) loadGIS(() => { try { google.accounts.id.initialize({ client_id: CONFIG.googleClientId, callback: onGoogleCredential, auto_select: false, ux_mode: 'popup' }); google.accounts.id.renderButton(box, { theme: 'filled_black', size: 'large', text: 'signin_with', shape: 'rectangular' }); } catch (e) { a.textContent = 'Google sign-in could not start here: ' + e.message; } }, () => { a.textContent = 'Could not reach Google sign-in. Check your connection.'; });
}
let gisLoading = null;
function loadGIS(ok, fail) {
  if (window.google && google.accounts && google.accounts.id) return ok();
  if (!gisLoading) gisLoading = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  gisLoading.then(ok, fail);
}
function decodeJwt(t) { try { const p = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(decodeURIComponent(escape(atob(p + '==='.slice((p.length + 3) % 4))))); } catch (e) { return null; } }
async function onGoogleCredential(resp) {
  const claims = decodeJwt(resp.credential); if (!claims) return;
  profDraft.google = { sub: claims.sub, email: claims.email, name: claims.name || claims.given_name, picture: claims.picture };
  if (!validName(profDraft.name) || /^Player\d+$/.test(profDraft.name)) { const n = String(claims.given_name || claims.name || '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 16); if (n.length >= 3) { profDraft.name = n; $('pName').value = n; } }
  if (CONFIG.accountsUrl) {
    try { const r = await fetch(CONFIG.accountsUrl.replace(/\/$/, '') + '/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential: resp.credential }) }); const j = await r.json();
      if (!r.ok) throw new Error(j.error || r.status);
      profDraft.token = j.token; if (j.user) { if (j.user.username) { profDraft.name = j.user.username; $('pName').value = j.user.username; } if (j.user.skin) { try { const sk = JSON.parse(j.user.skin); if (sk.png) profDraft.png = sk.png; else if (sk.cfg) { profDraft.skin = sk.cfg; profDraft.png = null; } } catch (e) { } } }
    } catch (e) { profDraft.token = null; $('pNameMsg').textContent = 'Signed in, but the account server could not be reached: ' + e.message; }
  }
  Object.assign(PROFILE, profDraft); saveProfile(); renderSkinEditor(); renderAccount(); refreshPreview(); updateMenuProfile();
}
async function saveProfileDraft() {
  const n = $('pName').value.trim(); if (!validName(n)) { $('pNameMsg').textContent = 'Usernames are 3-16 letters, numbers or _'; return false; }
  profDraft.name = n;
  if (CONFIG.accountsUrl && profDraft.token) {
    try { const r = await fetch(CONFIG.accountsUrl.replace(/\/$/, '') + '/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + profDraft.token }, body: JSON.stringify({ username: n, skin: JSON.stringify(profDraft.png ? { png: profDraft.png } : { cfg: profDraft.skin }) }) }); const j = await r.json().catch(() => ({}));
      if (r.status === 409) { $('pNameMsg').textContent = 'That username is taken. Try another.'; return false; }
      if (r.status === 401) { profDraft.token = null; } else if (!r.ok) { $('pNameMsg').textContent = 'Could not save to your account (' + (j.error || r.status) + '). Saved on this device.'; }
    } catch (e) { $('pNameMsg').textContent = 'Account server not reached. Saved on this device.'; }
  }
  Object.assign(PROFILE, profDraft); saveProfile(); profileSkinCanvas(); updateMenuProfile(); return true;
}
function updateMenuProfile() { $('btnProfile').textContent = 'Profile & Skin: ' + PROFILE.name; }
$('btnProfile').addEventListener('click', openProfile);
$('btnProfileDone').addEventListener('click', async () => { if (await saveProfileDraft()) { show('profile', false); show('menu', true); } });
$('btnSignOut').addEventListener('click', () => { profDraft.google = null; profDraft.token = null; try { google.accounts.id.disableAutoSelect(); } catch (e) { } renderAccount(); });
$('btnSkinUpload').addEventListener('click', () => $('skinFile').click());
$('skinFile').addEventListener('change', (e) => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const rd = new FileReader(); rd.onload = () => { const img = new Image(); img.onload = () => { if (img.width !== 64 || (img.height !== 64 && img.height !== 32)) { $('pSkinNote').textContent = 'Skins must be 64x64 (or 64x32) PNG files in the Minecraft skin layout.'; return; } profDraft.png = normalizeSkin(img).toDataURL(); renderSkinEditor(); refreshPreview(); }; img.src = rd.result; }; rd.readAsDataURL(f);
});
$('btnSkinDownload').addEventListener('click', () => { const cv = profDraft.png ? null : makeSkinCanvas(profDraft.skin); const url = profDraft.png || cv.toDataURL(); const a = document.createElement('a'); a.href = url; a.download = (profDraft.name || 'skin') + '.png'; a.click(); });
$('btnSkinRandom').addEventListener('click', () => { const rc = () => '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'); const tones = ['#f3d2b8', '#e8b99a', '#c58c64', '#a8755a', '#6b4430', '#4a2e20']; profDraft.skin = { skin: tones[Math.random() * tones.length | 0], hair: rc(), eyes: rc(), shirt: rc(), accent: rc(), pants: rc(), shoes: rc(), hairStyle: HAIR_STYLES[Math.random() * 5 | 0], top: TOP_STYLES[Math.random() * 4 | 0] }; profDraft.png = null; renderSkinEditor(); refreshPreview(); });
$('pName').addEventListener('keydown', (e) => e.stopPropagation());
updateMenuProfile(); profileSkinCanvas();

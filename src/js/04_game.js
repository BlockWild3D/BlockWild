// ================= GAME: renderer, player, input, UI, crafting, saving, loop =================
const $ = (id) => document.getElementById(id);
const S = { mode: 'survival', seed: 0, renderDist: 6, sens: 1, time: 0.02, day: 1, started: false, loading: false, paused: false, uiOpen: null, chestKey: null, furnKey: null, cursor: null,
  debug: false, fallback: false, locked: false, everLocked: false, touch: false, swing: 0, mineT: 0, mineKey: '', atkCD: 0, useCD: 0, wasNight: false, saveT: 0, spawnT: 0,
  dim: 'overworld', portalT: 0, portalLock: false, arrival: null, dragonDead: false, crystalsGone: [], dragonHp: 200, gridN: 2, bookFilter: 'all', bookSel: null, bowDraw: -1 };
try { const s = JSON.parse(localStorage.getItem('blockwild_settings') || '{}'); if (s.rd) S.renderDist = s.rd; if (s.sens) S.sens = s.sens; if (s.fov) S.fov = s.fov; if (s.sim) S.simDist = s.sim; } catch (e) { }
S.fov = S.fov || 72; S.simDist = S.simDist || 5;
S.touch = (window.matchMedia && matchMedia('(pointer:coarse)').matches) && ('ontouchstart' in window);
if (S.touch) S.renderDist = Math.min(S.renderDist, 4);
const DAYLEN = 600;
if (S.touch) document.body.classList.add('touch');
for (const im of document.querySelectorAll('img[data-ic]')) im.src = UI_ICON[im.dataset.ic];
for (const im of document.querySelectorAll('img[data-it]')) im.src = ICON[IT[im.dataset.it]];

// ---- renderer & scene ----
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, S.touch ? 1.25 : 1.5)); renderer.autoClear = false;
const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x87ceeb, 40, 80); scene.background = new THREE.Color(0x87ceeb);
const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 420); camera.rotation.order = 'YXZ'; scene.add(camera);
const hemiL = new THREE.HemisphereLight(0xffffff, 0x777777, 0.72); scene.add(hemiL); const dl = new THREE.DirectionalLight(0xffffff, 0.36); dl.position.set(0.4, 1, 0.3); scene.add(dl);
G.scene = scene; Particles.init(scene);
const handScene = new THREE.Scene(); const handCam = new THREE.PerspectiveCamera(70, 1, 0.01, 10);
handScene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 0.9)); const hdl = new THREE.DirectionalLight(0xffffff, 0.4); hdl.position.set(-0.5, 1, 1); handScene.add(hdl);
const handGroup = new THREE.Group(); handScene.add(handGroup); let handMesh = null, handId = -1;
const offGroup = new THREE.Group(); handScene.add(offGroup); let offMesh = null, offId = -1;
const handMat = new THREE.MeshLambertMaterial({ map: atlasTex, alphaTest: 0.5 });
if (HD) atlasTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); handCam.aspect = w / h; handCam.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

// sky objects
const skyG = new THREE.Group(); scene.add(skyG);
function squareTex(c1, c2) { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); x.fillStyle = c1; x.fillRect(4, 4, 24, 24); x.fillStyle = c2; x.fillRect(9, 9, 14, 14); const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t; }
const sunMesh = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ map: squareTex('#ffe58a', '#fffbe0'), transparent: true, fog: false, depthWrite: false }));
const moonMesh = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ map: squareTex('#cfd6e6', '#eef2fa'), transparent: true, fog: false, depthWrite: false }));
skyG.add(sunMesh, moonMesh);
const starGeo = new THREE.BufferGeometry(); { const a = []; for (let i = 0; i < 700; i++) { const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u); a.push(r * Math.cos(th) * 330, u * 330, r * Math.sin(th) * 330); } starGeo.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); }
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false }); const stars = new THREE.Points(starGeo, starMat); skyG.add(stars);
const cloudTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const n = new Perlin(4242); for (let i = 0; i < 64; i++) for (let j = 0; j < 64; j++) { const v = n.n2(i / 7, j / 7) + n.n2(i / 3, j / 3) * 0.4; if (v > 0.12) { x.fillStyle = '#fff'; x.fillRect(i, j, 1, 1); } } const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = false; return t; })();
const cloudMat = new THREE.ShaderMaterial({ uniforms: { tex: { value: cloudTex }, camPos: { value: new V3() }, offset: { value: 0 }, color: { value: new THREE.Color(1, 1, 1) }, radius: { value: 200 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: 'uniform sampler2D tex; uniform vec3 camPos; uniform float offset; uniform vec3 color; uniform float radius; varying vec3 vW; void main(){ vec2 uv=(vW.xz+vec2(offset,0.0))/(12.0*64.0); float a=texture2D(tex,uv).a; if(a<0.5) discard; float d=length(vW.xz-camPos.xz); float f=1.0-smoothstep(radius*0.55,radius,d); if(f<=0.0) discard; gl_FragColor=vec4(color,0.82*f); }' });
const clouds = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), cloudMat); clouds.rotation.x = -Math.PI / 2; scene.add(clouds);

const selBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 })); scene.add(selBox); selBox.visible = false;
const crackTextures = crackTex.map(c => { const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; return t; });
const crackMat = new THREE.MeshBasicMaterial({ map: crackTextures[0], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, fog: false });
const crackMesh = new THREE.Mesh(new THREE.BoxGeometry(1.002, 1.002, 1.002), crackMat); scene.add(crackMesh); crackMesh.visible = false;

// ---- Player ----
class Player {
  constructor() { this.pos = new V3(0, 60, 0); this.vel = new V3(); this.hw = 0.3; this.h = 1.8; this.yaw = 0; this.pitch = 0; this.onGround = false; this.flying = false; this.health = 20; this.dead = false; this.inv = new Array(41).fill(null); this.sel = 0; this.blocking = false; this.spawn = new V3(0, 60, 0); this.hurtCD = 0; this.lastHurt = -99; this.peak = null; this.stepD = 0; this.regenT = 0; this.lavaT = 0; }
  eye() { return new V3(this.pos.x, this.pos.y + (this.swimming ? 0.4 : this.eyeH || 1.62), this.pos.z); }
  held() { return this.inv[handSlot()]; }
  heldDef() { const h = this.held(); return h ? ITEMS[h.id] : null; }
  hurt(dmg, src, cause, kb = 1) {
    if (this.dead || !isSurv() || this.hurtCD > 0 || S.loading) return;
    if (this.blocking && src) {
      const d = new V3(src.x - this.pos.x, 0, src.z - this.pos.z); const L = d.length(); const f = lookDir(); f.y = 0; f.normalize();
      if (L < 0.7 || d.dot(f) / L > -0.05) {
        this.hurtCD = 0.35; Sfx.play('shield', 1); S.shieldHit = 1; if (dmg >= 3) damageSlot(this.inv[36] && this.inv[36].id === IT.shield ? 36 : this.sel, 1 + Math.floor(dmg));
        if (L > 0.05) { this.vel.x -= d.x / L * 2.5 * Math.min(kb, 1.5); this.vel.z -= d.z / L * 2.5 * Math.min(kb, 1.5); }
        const e = this.eye(); Particles.emit(e.x + f.x * 0.8, e.y - 0.3, e.z + f.z * 0.8, 10, [[1, 0.95, 0.7], [0.8, 0.8, 0.85]], 3, 0.3, 6, 0.3);
        return;
      }
    }
    if (effLevel('fire_resistance') && (cause === 'lava' || cause === 'a magma block' || cause === 'fire')) return;
    if (src && cause !== 'fall damage') { if (S.difficulty === 'peaceful') dmg = 0; else if (S.difficulty === 'easy') dmg = Math.min(dmg, dmg / 2 + 1); else if (S.difficulty === 'hard') dmg *= 1.5; }
    dmg = armorReduce(dmg, cause); dmg *= Math.max(0, 1 - 0.2 * effLevel('resistance')); if (dmg <= 0) return;
    this.hurtCD = 0.5; this.health -= dmg; this.lastHurt = performance.now() / 1000; Sfx.play('hurt', 1);
    const h = $('hurt'); h.style.opacity = 1; setTimeout(() => h.style.opacity = 0, 180);
    if (src) { const d = new V3(this.pos.x - src.x, 0, this.pos.z - src.z); if (d.lengthSq() > 1e-4) d.normalize(); this.vel.x += d.x * 7 * kb; this.vel.z += d.z * 7 * kb; this.vel.y = Math.max(this.vel.y, 4.5 * Math.min(kb, 1.6)); }
    G.shake = Math.max(G.shake, 0.25); updateHearts();
    if (this.health <= 0) this.die(cause);
  }
  die(cause) {
    if (this.dead) return; this.health = 0; this.dead = true; updateHearts();
    if (isSurv() && !S.rules.keepInventory) { for (let i = 0; i < this.inv.length; i++) { const s = this.inv[i]; if (s) { dropItem(s.id, s.count, this.pos.x, this.pos.y + 1, this.pos.z, true, xtra(s)); this.inv[i] = null; } } invDirty(); const xpd = Math.min(100, XP.level * 7); setLevel(0, 0); if (xpd) spawnOrb(this.pos.x, this.pos.y + 1, this.pos.z, xpd); }
    this.effects = {}; if (typeof CHAT !== 'undefined') { const m = deathMessage(cause); chatPrint(m, '#ccc'); if (CHAT.onSend) CHAT.onSend({ t: 'chat', raw: m }); }
    const msgs = { 'fall damage': 'You hit the ground too hard', 'an explosion': 'You were blown up', 'a creeper': 'You were blown up by a Creeper', 'an arrow': 'You were shot by a Skeleton', 'the void': 'You fell out of the world', starvation: 'You starved to death', 'lava': 'You tried to swim in lava', 'a Ghast fireball': 'You were fireballed by a Ghast', 'a Blaze': 'You were burned by a Blaze', "the Ender Dragon's breath": "You were consumed by the Ender Dragon's breath", 'the Ender Dragon': 'You were slain by the Ender Dragon', 'a magma block': 'You discovered the floor was lava' };
    $('deathMsg').textContent = msgs[cause] || ('You were slain by ' + (cause || 'something'));
    if (S.uiOpen) closeInv(true);
    show('death', true); releaseLock();
  }
}
const player = new Player(); G.player = player;
let world = null;

// ---- inventory helpers ----
// extra = per-item data that must travel with the item: { ench, dmg } (enchantments and durability damage)
function xtra(s) { if (!s || (!s.ench && !s.dmg && !s.name && !s.rc)) return null; const o = {}; if (s.ench) o.ench = s.ench; if (s.dmg) o.dmg = s.dmg; if (s.name) o.name = s.name; if (s.rc) o.rc = s.rc; return o; }
function addTo(arr, id, n, order, extra) {
  const mx = stackMax(id); const ench = extra;
  for (const i of order) { const s = arr[i]; if (s && s.id === id && s.count < mx && JSON.stringify(xtra(s) || null) === JSON.stringify(extra || null)) { const k = Math.min(n, mx - s.count); s.count += k; n -= k; if (!n) return 0; } }
  for (const i of order) if (!arr[i]) { const k = Math.min(n, mx); arr[i] = extra ? Object.assign({ id, count: k }, extra) : { id, count: k }; n -= k; if (!n) return 0; }
  return n;
}
const INV_ORDER = [...Array(36).keys()];
function addItem(id, n, extra) { const r = addTo(player.inv, id, n, INV_ORDER, extra); invDirty(); return r; }
function giveOrDrop(id, n, extra) { const left = addItem(id, n, extra); if (left) dropItem(id, left, player.pos.x, player.pos.y + 1.2, player.pos.z, true, extra); }
function countItem(id) { let c = 0; for (const s of player.inv) if (s && s.id === id) c += s.count; return c; }
function removeItem(id, n) { let removed = 0; for (let i = 36; i >= 0 && n > 0; i--) { const s = player.inv[i]; if (s && s.id === id) { const k = Math.min(n, s.count); s.count -= k; n -= k; removed += k; if (!s.count) player.inv[i] = null; } } invDirty(); return removed; }
// the hand being used: the off hand while a right-click is going to it (44_offhand.js)
function handSlot() { return S.useOff && player.inv[36] ? 36 : player.sel; }
function useHeld(n = 1) { if (S.mode === 'creative') return; const h = player.held(); if (!h) return; h.count -= n; if (h.count <= 0) player.inv[handSlot()] = null; invDirty(); }
function replaceHeld(id) { if (S.mode === 'creative') { if (!countItem(id)) addItem(id, 1); return; } const h = player.held(); if (h && h.count > 1) { h.count--; giveOrDrop(id, 1); } else player.inv[handSlot()] = { id, count: 1 }; invDirty(); }
let _invDirty = true; function invDirty() { _invDirty = true; }

// ---- UI: hotbar & hearts ----
const hotbarEl = $('hotbar'); const hotSlots = [];
for (let i = 0; i < 9; i++) { const d = document.createElement('div'); d.className = 'slot'; d.innerHTML = '<img><span class="cnt"></span>'; d.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (S.uiOpen) slotClick('inv', i, e.button, e.shiftKey); else selectSlot(i); }); hotbarEl.appendChild(d); hotSlots.push(d); }
function paintSlot(el, s) { const img = el.firstChild, cnt = el.lastChild; el.classList.toggle('ench', !!(s && s.ench)); const md = s && s.dmg ? maxDur(s.id) : 0; let bar = el.querySelector('.dur'); if (md) { if (!bar) { bar = document.createElement('b'); bar.className = 'dur'; bar.innerHTML = '<i></i>'; el.insertBefore(bar, cnt); } const f = Math.max(0, 1 - s.dmg / md); bar.style.display = 'block'; bar.firstChild.style.width = (f * 100) + '%'; bar.firstChild.style.background = 'hsl(' + Math.round(f * 120) + ',90%,50%)'; } else if (bar) bar.style.display = 'none'; if (s) { if (img.dataset.id != s.id) { img.src = ICON[s.id]; img.dataset.id = s.id; } img.style.visibility = 'visible'; cnt.textContent = s.count > 1 ? s.count : ''; } else { img.style.visibility = 'hidden'; img.dataset.id = ''; cnt.textContent = ''; } }
function renderHotbar() { for (let i = 0; i < 9; i++) { paintSlot(hotSlots[i], player.inv[i]); hotSlots[i].classList.toggle('sel', i === player.sel); } paintSlot($('offhud'), player.inv[36]); $('offhud').style.visibility = player.inv[36] ? 'visible' : 'hidden'; }
function swapHands() { const a = player.inv[player.sel], b = player.inv[36]; if (!a && !b) return; player.inv[player.sel] = b; player.inv[36] = a; S.bowDraw = -1; invDirty(); Sfx.play('click', 0.6); selectSlot(player.sel); }
const heartImgs = []; for (let i = 0; i < 10; i++) { const im = document.createElement('img'); $('hearts').appendChild(im); heartImgs.push(im); }
function updateHearts() { if (typeof renderXP === 'function') renderXP(); if (typeof renderArmorBar === 'function') renderArmorBar(); const h = Math.max(0, Math.ceil(player.health)); for (let i = 0; i < 10; i++) { const v = h - i * 2; heartImgs[i].src = HEART[v >= 2 ? 2 : v === 1 ? 1 : 0]; } $('hearts').style.visibility = isSurv() ? 'visible' : 'hidden'; }
let nameT = 0;
function selectSlot(i) { if (S.bowDraw >= 0) S.bowDraw = -1; player.sel = (i + 9) % 9; invDirty(); const h = player.held(); $('itemname').textContent = h ? ITEMS[h.id].name : ''; $('itemname').style.opacity = 1; nameT = 2; }
let toastT = 0; function toast(msg, t = 2.5) { const el = $('toast'); el.textContent = msg; el.style.opacity = 1; toastT = t; }
function show(id, on) { $(id).classList.toggle('hidden', !on); }

// ---- UI: containers ----
const slotEls = { inv: [], chest: [], grid: [], furn: [], ench: [] }; let outEl = null;
let mouseX = 0, mouseY = 0;
function newSlotEl(parent, extraCls) { const d = document.createElement('div'); d.className = 'slot' + (extraCls ? ' ' + extraCls : ''); d.innerHTML = '<img><span class="cnt"></span>'; d.addEventListener('contextmenu', e => e.preventDefault()); parent.appendChild(d); return d; }
function makeSlot(cont, idx, parent) {
  const d = newSlotEl(parent);
  d.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); slotClick(cont, idx, e.button, e.shiftKey); });
  d.addEventListener('pointerenter', () => { const a = contArr(cont); const s = a && a[idx]; showTip(s ? itemTooltip(s) : null); });
  d.addEventListener('pointerleave', () => showTip(null));
  slotEls[cont][idx] = d; return d;
}
for (let i = 9; i < 36; i++) makeSlot('inv', i, $('mainGrid'));
for (let i = 0; i < 9; i++) makeSlot('inv', i, $('hotGrid'));
for (let i = 37; i <= 40; i++) makeSlot('inv', i, $('armorSlots'));
makeSlot('inv', 36, $('offSlotBox'));
for (let i = 0; i < 27; i++) makeSlot('chest', i, $('chestGrid'));
makeSlot('furn', 0, $('furnIn')); makeSlot('furn', 1, $('furnFuel')); makeSlot('furn', 2, $('furnOut'));
makeSlot('ench', 0, $('enchItem')); makeSlot('ench', 1, $('enchLapis'));
outEl = newSlotEl($('outSlotBox'));
outEl.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); takeOutput(e.shiftKey); });
outEl.addEventListener('pointerenter', () => { const r = currentRecipe(); showTip(r ? ITEMS[IT[r.out[0]]].name : null); }); outEl.addEventListener('pointerleave', () => showTip(null));
let chestArr = null, furnState = null; const craftGrid = new Array(9).fill(null);
function contArr(c) { return c === 'inv' ? player.inv : c === 'chest' ? chestArr : c === 'grid' ? craftGrid : c === 'furn' ? (furnState && furnState.s) : c === 'ench' ? (typeof enchState !== 'undefined' && enchState && enchState.s) : null; }
function setGridSize(n) {
  S.gridN = n; const g = $('craftGrid'); g.innerHTML = ''; slotEls.grid = []; g.style.gridTemplateColumns = 'repeat(' + n + ',44px)';
  for (let i = 0; i < n * n; i++) makeSlot('grid', i, g);
  $('craftTitle').textContent = n === 3 ? 'Crafting Table' : 'Crafting';
}
function showTip(t) { const el = $('tip'); if (!t) { el.style.display = 'none'; return; } el.textContent = t; el.style.whiteSpace = 'pre'; el.style.display = 'block'; el.style.left = (mouseX + 14) + 'px'; el.style.top = (mouseY - 30) + 'px'; }
function slotClick(cont, i, button, shift) {
  const arr = contArr(cont); if (!arr) return; const s = arr[i]; const c = S.cursor;
  if (cont === 'furn' && i === 2) { // output: take only
    if (!s) return;
    if (furnState && furnState.xp >= 1 || (furnState && furnState.xp > 0 && Math.random() < furnState.xp)) { spawnOrb(player.pos.x, player.pos.y + 1, player.pos.z, Math.max(1, Math.floor(furnState.xp))); furnState.xp = 0; }
    if (shift) { const left = addItem(s.id, s.count); if (left) s.count = left; else arr[i] = null; }
    else if (!c) { S.cursor = s; arr[i] = null; } else if (c.id === s.id && c.count + s.count <= stackMax(s.id)) { c.count += s.count; arr[i] = null; }
    Sfx.play('click', 0.5); invDirty(); renderInvUI(); return;
  }
  if (cont === 'inv' && i >= 37 && c && !(ITEMS[c.id].kind === 'armor' && ARMOR_SLOT[ITEMS[c.id].slot] === i)) return;
  if (shift && s) {
    let tgt, order;
    if (cont === 'inv' && i < 37 && ITEMS[s.id].kind === 'armor' && !player.inv[ARMOR_SLOT[ITEMS[s.id].slot]] && !chestArr && !furnState && !(typeof enchState !== 'undefined' && enchState)) { player.inv[ARMOR_SLOT[ITEMS[s.id].slot]] = s; arr[i] = null; Sfx.play('click', 0.5); invDirty(); renderInvUI(); return; }
    if (cont !== 'inv') { tgt = player.inv; order = [...Array(9).keys()].concat([...Array(27).keys()].map(k => k + 9)); }
    else if (chestArr) { tgt = chestArr; order = [...Array(27).keys()]; }
    else if (furnState) { tgt = furnState.s; order = FUEL[s.id] && !SMELT[s.id] ? [1] : [0]; }
    else if (enchState) { if (s.id === IT.lapis_lazuli) { tgt = enchState.s; order = [1]; } else if (enchCat(s.id) && !enchState.s[0]) { enchState.s[0] = s; arr[i] = null; Sfx.play('click', 0.5); invDirty(); renderInvUI(); return; } else return; }
    else if (s.id === IT.shield && i !== 36 && !player.inv[36]) { tgt = player.inv; order = [36]; }
    else { tgt = player.inv; order = i < 9 ? [...Array(27).keys()].map(k => k + 9) : [...Array(9).keys()]; }
    const left = addTo(tgt, s.id, s.count, order, xtra(s)); if (left) s.count = left; else arr[i] = null;
  } else if (button === 2) {
    if (!c && s) { const half = Math.ceil(s.count / 2); S.cursor = Object.assign({}, s, { count: half }); s.count -= half; if (!s.count) arr[i] = null; }
    else if (c && (!s || (s.id === c.id && s.count < stackMax(c.id) && !xtra(c)))) { if (!s) arr[i] = Object.assign({}, c, { count: 1 }); else s.count++; c.count--; if (!c.count) S.cursor = null; }
  } else {
    if (!c && s) { S.cursor = s; arr[i] = null; }
    else if (c && !s) { arr[i] = c; S.cursor = null; }
    else if (c && s) { if (c.id === s.id) { const k = Math.min(c.count, stackMax(s.id) - s.count); s.count += k; c.count -= k; if (!c.count) S.cursor = null; } else { arr[i] = c; S.cursor = s; } }
  }
  Sfx.play('click', 0.5); invDirty(); renderInvUI();
}
function currentRecipe() { if (S.uiOpen !== 'inv' && S.uiOpen !== 'table') return null; const n = S.gridN; return gridMatch(craftGrid.slice(0, n * n), n); }
function consumeGrid() { const n = S.gridN; for (let i = 0; i < n * n; i++) { const s = craftGrid[i]; if (s) { s.count--; if (s.count <= 0) craftGrid[i] = null; } } }
function takeOutput(shift) {
  let r = currentRecipe(); if (!r) return; const id = IT[r.out[0]], n = r.out[1]; const ex = typeof craftExtra === 'function' ? craftExtra(r) : null; // item data carried over (tipped arrows' potion)
  if (shift) { let made = 0; while (r && made < 64) { if (addTo(player.inv, id, n, INV_ORDER, ex)) { break; } consumeGrid(); made++; const r2 = currentRecipe(); if (r2 !== r) break; } if (made) Sfx.play('pop', 0.7); }
  else { const c = S.cursor; if (c && (c.id !== id || c.count + n > stackMax(id) || JSON.stringify(xtra(c) || null) !== JSON.stringify(ex || null))) return; if (c) c.count += n; else S.cursor = Object.assign({ id, count: n }, ex || {}); consumeGrid(); Sfx.play('pop', 0.7); }
  invDirty(); renderInvUI();
}
function renderCursor() { const el = $('cursorItem'); const c = S.cursor; if (!c || !S.uiOpen) { el.classList.add('hidden'); return; } el.classList.remove('hidden'); el.innerHTML = '<img src="' + ICON[c.id] + '">' + (c.count > 1 ? '<span class="cnt">' + c.count + '</span>' : ''); el.style.left = mouseX + 'px'; el.style.top = mouseY + 'px'; }
function renderInvUI() {
  for (let i = 0; i < 41; i++) paintSlot(slotEls.inv[i], player.inv[i]);
  for (let i = 37; i <= 40; i++) { const el = slotEls.inv[i]; el.classList.toggle('empty', !player.inv[i]); if (!player.inv[i]) el.firstChild.src = ICON[IT[['iron_helmet', 'iron_chestplate', 'iron_leggings', 'iron_boots'][i - 37]]]; } slotEls.inv[36].classList.toggle('empty', !player.inv[36]); if (!player.inv[36]) { const im = slotEls.inv[36].firstChild; im.src = ICON[IT.shield]; }
  if (chestArr) for (let i = 0; i < 27; i++) paintSlot(slotEls.chest[i], chestArr[i]);
  if (S.uiOpen === 'inv' || S.uiOpen === 'table') { for (let i = 0; i < S.gridN * S.gridN; i++) paintSlot(slotEls.grid[i], craftGrid[i]); const r = currentRecipe(); paintSlot(outEl, r ? { id: IT[r.out[0]], count: r.out[1] } : null); }
  if (furnState) for (let i = 0; i < 3; i++) paintSlot(slotEls.furn[i], furnState.s[i]);
  if (enchState) renderEnch();
  renderCursor(); renderBook();
}
// ---- recipe book ----
const BOOK = RECIPES.map(r => ({ type: 'craft', r, out: IT[r.out[0]] })).concat(Object.keys(SMELT).map(k => ({ type: 'smelt', from: +k, out: SMELT[k] })));
function specIcon(spec) { return spec[0] === '#' ? IT[GROUPS[spec][0]] : IT[spec]; }
function specName(spec) { return spec === '#log' ? 'Any log or stem' : spec === '#stone' ? 'Cobblestone or Cobbled Deepslate' : ITEMS[IT[spec]].name; }
function haveFor(e) {
  if (e.type === 'smelt') return countItem(e.from) > 0;
  const need = {}; const add = (spec) => need[spec] = (need[spec] || 0) + 1;
  if (e.r.items) e.r.items.forEach(add); else for (const row of e.r.shape) for (const ch of row) if (ch !== ' ') add(e.r.key[ch]);
  for (const spec in need) { const have = spec[0] === '#' ? GROUPS[spec].reduce((s, k) => s + countItem(IT[k]), 0) : countItem(IT[spec]); if (have < need[spec]) return false; }
  return true;
}
let bookBuilt = false; const bookEls = [];
function renderBook() {
  if (!S.uiOpen || $('craftBox').classList.contains('hidden')) return;
  const grid = $('bookGrid');
  if (!bookBuilt) { bookBuilt = true; BOOK.forEach((e, i) => { const d = newSlotEl(grid); d.firstChild.src = ICON[e.out]; d.firstChild.style.visibility = 'visible'; d.title = ITEMS[e.out].name + (e.type === 'smelt' ? ' (smelting)' : ''); d.addEventListener('pointerdown', (ev) => { ev.preventDefault(); S.bookSel = i; renderBook(); }); bookEls.push(d); }); }
  BOOK.forEach((e, i) => { const have = haveFor(e); const vis = S.bookFilter === 'all' ? e.type === 'craft' : S.bookFilter === 'have' ? have : e.type === 'smelt'; bookEls[i].style.display = vis ? '' : 'none'; bookEls[i].classList.toggle('have', have); bookEls[i].classList.toggle('selb', S.bookSel === i); });
  const pat = $('bdPattern'), out = $('bdOut'), txt = $('bdText'); pat.innerHTML = '';
  if (S.bookSel === null) { pat.style.gridTemplateColumns = 'repeat(3,34px)'; out.style.visibility = 'hidden'; txt.textContent = 'Pick a recipe to see its pattern. Place the same items in your crafting grid, then take the result.'; return; }
  const e = BOOK[S.bookSel]; out.style.visibility = 'visible'; out.innerHTML = '<img src="' + ICON[e.out] + '" style="visibility:visible">';
  if (e.type === 'smelt') { pat.style.gridTemplateColumns = '34px'; const d = newSlotEl(pat, 'ghost'); d.style.width = d.style.height = '34px'; d.firstChild.src = ICON[e.from]; d.firstChild.style.visibility = 'visible'; d.firstChild.style.width = d.firstChild.style.height = '26px'; txt.innerHTML = '<b>' + ITEMS[e.out].name + '</b><br>Smelt ' + ITEMS[e.from].name + ' in a Furnace. Fuel: coal, wood, sticks, blaze rods or a lava bucket.'; return; }
  const r = e.r; const n = r.big ? 3 : 2; pat.style.gridTemplateColumns = 'repeat(' + n + ',34px)';
  const cells = new Array(n * n).fill(null);
  if (r.items) r.items.forEach((spec, i) => cells[i] = spec); else r.shape.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== ' ') cells[y * n + x] = r.key[ch]; }));
  const names = new Set();
  for (const spec of cells) { const d = newSlotEl(pat, 'ghost'); d.style.width = d.style.height = '34px'; if (spec) { d.firstChild.src = ICON[specIcon(spec)]; d.firstChild.style.visibility = 'visible'; d.firstChild.style.width = d.firstChild.style.height = '26px'; d.title = specName(spec); names.add(specName(spec)); } else d.firstChild.style.visibility = 'hidden'; }
  txt.innerHTML = '<b>' + ITEMS[e.out].name + (r.out[1] > 1 ? ' x' + r.out[1] : '') + '</b><br>' + (r.items ? 'Shapeless: put the items anywhere in the grid.' : 'Place the items in this exact shape.') + '<br>' + (r.big ? 'Needs a Crafting Table (3x3).' : 'Fits the 2x2 inventory grid.') + '<br><span style="color:#555">Uses: ' + [...names].join(', ') + '</span>';
}
for (const b of document.querySelectorAll('.bookbar .smallbtn')) b.addEventListener('pointerdown', (e) => { e.preventDefault(); S.bookFilter = b.dataset.f; for (const x of document.querySelectorAll('.bookbar .smallbtn')) x.classList.toggle('on', x === b); renderBook(); });
let bookOpen = true;
function toggleBook() { bookOpen = !bookOpen; show('rightPanel', bookOpen || S.mode === 'creative'); if (bookOpen) setTab('craft'); renderBook(); }
$('btnBook').addEventListener('pointerdown', (e) => { e.preventDefault(); toggleBook(); }); $('btnBook2').addEventListener('pointerdown', (e) => { e.preventDefault(); toggleBook(); });
// creative palette
(() => { const pal = $('palette'); for (const id of ITEM_IDS) { if (id === B.AIR || (ITEMS[id].kind === 'block' && BL[id].hidden)) continue; const d = document.createElement('div'); d.className = 'slot'; d.innerHTML = '<img src="' + ICON[id] + '">';
  d.addEventListener('pointerdown', (e) => { e.preventDefault(); if (S.cursor) { S.cursor = null; } else if (e.shiftKey) addItem(id, stackMax(id)); else S.cursor = { id, count: stackMax(id) }; invDirty(); renderInvUI(); });
  d.addEventListener('pointerenter', () => showTip(ITEMS[id].name)); d.addEventListener('pointerleave', () => showTip(null)); pal.appendChild(d); } })();
let invTab = 'craft';
function setTab(t) { invTab = t; for (const b of $('invTabs').children) b.classList.toggle('on', b.dataset.t === t); show('craftBox', t === 'craft'); show('paletteBox', t === 'creative'); renderBook(); }
for (const b of $('invTabs').children) b.addEventListener('pointerdown', (e) => { e.preventDefault(); setTab(b.dataset.t); });
$('invClose').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); closeInv(); });
function openUI(kind, key) {
  if (player.dead) return; S.bowDraw = -1; player.blocking = false; S.blockT = 0;
  S.uiOpen = kind; chestArr = null; furnState = null; S.chestKey = null; S.furnKey = null;
  enchState = null; show('chestBox', kind === 'chest'); show('craftArea', kind === 'inv' || kind === 'table'); show('furnArea', kind === 'furnace'); show('enchArea', kind === 'enchant');
  if (kind === 'enchant') { const [ex, ey, ez] = key.split(',').map(Number); enchState = { s: [null, null], shelves: countShelves(ex, ey, ez) }; }
  if (kind === 'chest') { S.chestKey = key; chestArr = world.chestInv.get(key); }
  if (kind === 'furnace') { S.furnKey = key; furnState = getFurnace(key); }
  if (kind === 'inv') setGridSize(2); if (kind === 'table') setGridSize(3);
  $('tabCreative').classList.toggle('hidden', S.mode !== 'creative'); show('invTabs', S.mode === 'creative');
  setTab(S.mode === 'creative' && kind === 'inv' ? invTab : 'craft');
  show('rightPanel', bookOpen || S.mode === 'creative');
  show('inv', true); releaseLock(); mouseL = mouseR = false; renderInvUI();
}
function openInv() { openUI('inv'); }
function closeInv(noLock) {
  if (S.uiOpen === 'chat') { closeChat(noLock); return; }
  for (let i = 0; i < 9; i++) if (craftGrid[i]) { giveOrDrop(craftGrid[i].id, craftGrid[i].count, xtra(craftGrid[i])); craftGrid[i] = null; }
  if (enchState) { for (const s of enchState.s) if (s) giveOrDrop(s.id, s.count, xtra(s)); enchState = null; }
  if (S.cursor) { giveOrDrop(S.cursor.id, S.cursor.count, xtra(S.cursor)); S.cursor = null; }
  S.uiOpen = null; chestArr = null; furnState = null; S.chestKey = null; S.furnKey = null; show('inv', false); showTip(null); renderCursor(); invDirty(); if (!noLock) requestLock();
}
function openChest(x, y, z) { Sfx.play('chest', 0.7);
  const k = x + ',' + y + ',' + z;
  if (!world.chestInv.has(k)) world.chestInv.set(k, world.chestLoot.has(k) ? rollLoot(world.chestLoot.get(k), ihash(x, y, z, world.seed)) : new Array(27).fill(null));
  Sfx.play('wood', 0.6); openUI('chest', k);
}
// ---- furnaces ----
function getFurnace(k) { let f = world.furnaces.get(k); if (!f) { f = { s: [null, null, null], burn: 0, burnMax: 0, cook: 0 }; world.furnaces.set(k, f); } return f; }
function updateFurnaces(dt) {
  for (const [k, f] of world.furnaces) {
    const [inp, fuel, out] = f.s; const res0 = inp ? SMELT[inp.id] : undefined; const res = res0 !== undefined && (!f.fast || furnaceAccepts(f.fast, inp.id, res0)) ? res0 : undefined; const spd = f.fast ? 2 : 1;
    const can = res !== undefined && (!out || (out.id === res && out.count < stackMax(res)));
    if (f.burn <= 0 && can && fuel && FUEL[fuel.id]) { f.burn = f.burnMax = FUEL[fuel.id]; if (fuel.id === IT.lava_bucket) f.s[1] = { id: IT.bucket, count: 1 }; else { fuel.count--; if (!fuel.count) f.s[1] = null; } if (S.furnKey === k) invDirty(); }
    if (f.burn > 0) { f.burn -= dt * spd; if (can) { f.cook += dt * spd; if (f.cook >= COOK_TIME) { f.cook = 0; inp.count--; if (!inp.count) f.s[0] = null; if (out) out.count++; else f.s[2] = { id: res, count: 1 }; f.xp = (f.xp || 0) + (SMELT_XP[ITEMS[res].key] || 0.1); if (S.furnKey === k) invDirty(); } } else f.cook = 0; }
    else f.cook = Math.max(0, f.cook - dt * 2);
  }
  if (furnState) { document.querySelector('.flameon').style.height = (furnState.burnMax ? Math.max(0, furnState.burn / furnState.burnMax) * 100 : 0) + '%'; document.querySelector('.progon').style.width = (furnState.cook / COOK_TIME * 100) + '%'; }
}

// ---- pointer lock / input ----
function requestLock() {
  if (S.touch || S.fallback || !S.started || S.uiOpen || player.dead || S.paused) return;
  try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => onLockError()); } catch (e) { onLockError(); }
}
function releaseLock() { if (document.pointerLockElement) try { document.exitPointerLock(); } catch (e) { } }
function onLockError() { if (!S.everLocked) { S.fallback = true; toast('Drag with the mouse to look around', 4); show('clickplay', false); } else if (S.started && !S.uiOpen && !S.paused && !player.dead) show('clickplay', true); }
document.addEventListener('pointerlockchange', () => {
  S.locked = document.pointerLockElement === canvas;
  if (S.locked) { S.everLocked = true; show('clickplay', false); }
  else if (S.started && !S.loading && !S.uiOpen && !player.dead && !S.paused && !S.fallback) openPause();
});
document.addEventListener('pointerlockerror', onLockError);
$('clickplay').addEventListener('pointerdown', (e) => { e.preventDefault(); show('clickplay', false); requestLock(); });
const keys = {}; let mouseL = false, mouseR = false; let lastSpace = 0;
addEventListener('keydown', (e) => {
  if (!S.started || S.loading) return;
  if (e.target && e.target.tagName === 'INPUT') return;
  const c = e.code;
  if (c === 'F5') e.preventDefault();
  if (isKey(c, 'debug')) { e.preventDefault(); S.debug = !S.debug; show('debug', S.debug); return; }
  if (c === 'Escape') { if (S.uiOpen) closeInv(); else if (S.paused) closePause(); else if (S.fallback || S.touch) openPause(); return; }
  if (isKey(c, 'inventory')) { if (S.uiOpen) closeInv(); else if (!S.paused) openInv(); return; }
  if (isKey(c, 'book') && S.uiOpen) { toggleBook(); return; }
  if ((isKey(c, 'chat') || isKey(c, 'command')) && !S.uiOpen && !S.paused && !player.dead) { e.preventDefault(); openChat(isKey(c, 'command') ? '/' : ''); return; }
  if (S.uiOpen || S.paused) return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', KB.jump, KB.sneak, KB.sprint].includes(c)) e.preventDefault();
  if (!keys[c]) {
    if (c.startsWith('Digit')) { const n = +c.slice(5); if (n >= 1 && n <= 9) selectSlot(n - 1); }
    if (isKey(c, 'drop')) dropHeld(e.ctrlKey);
    if (isKey(c, 'swap')) swapHands();
    // double-tap forward to sprint (and to swim when underwater), like Minecraft
    if (isKey(c, 'forward') && !e.repeat) { const now = e.timeStamp || performance.now(); if (now - (S.lastFwd || 0) < 350) S.sprintTap = true; S.lastFwd = now; }
    if (isKey(c, 'fly') && S.mode === 'creative') { player.flying = !player.flying; toast(player.flying ? 'Flying' : 'Walking', 1); }
    if (isKey(c, 'jump') && S.mode === 'creative') { const now = performance.now(); if (now - lastSpace < 280) { player.flying = !player.flying; } lastSpace = now; }
  }
  keys[c] = true;
});
addEventListener('keyup', (e) => { keys[e.code] = false; if (isKey(e.code, 'forward')) { S.sprintTap = false; player.sprinting = false; } });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseL = mouseR = false; });
let drag = null;
canvas.addEventListener('mousedown', (e) => {
  if (!S.started || S.loading || S.uiOpen || S.paused || player.dead || S.touch) return;
  Sfx.init();
  if (!S.locked && !S.fallback) { requestLock(); return; }
  if (S.fallback) drag = { x: e.clientX, y: e.clientY, moved: false, b: e.button };
  if (e.button === 0) { mouseL = true; S.atkCD = Math.min(S.atkCD, 0); }
  if (e.button === 2) { mouseR = true; S.useCD = 0; }
  if (e.button === 1) { e.preventDefault(); pickBlock(); }
});
addEventListener('mouseup', (e) => { if (e.button === 0) mouseL = false; if (e.button === 2) mouseR = false; drag = null; });
addEventListener('mousemove', (e) => {
  mouseX = e.clientX; mouseY = e.clientY; if (S.uiOpen) { renderCursor(); if ($('tip').style.display === 'block') { $('tip').style.left = (mouseX + 14) + 'px'; $('tip').style.top = (mouseY - 30) + 'px'; } }
  if (S.locked) look(e.movementX, e.movementY);
  else if (S.fallback && drag && (e.buttons & 1 || e.buttons & 2)) { if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) { drag.moved = true; mouseL = false; mouseR = false; } if (drag.moved) look(e.movementX * 1.4, e.movementY * 1.4); }
});
function look(dx, dy) { const s = 0.0022 * S.sens; player.yaw -= dx * s; player.pitch = clamp(player.pitch - dy * s, -1.55, 1.55); }
addEventListener('wheel', (e) => { if (!S.started || S.uiOpen || S.paused) return; selectSlot(player.sel + (e.deltaY > 0 ? 1 : -1)); }, { passive: true });
addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('pointerdown', (e) => { mouseX = e.clientX; mouseY = e.clientY; });

// touch controls
const T = { joy: null, look: null, mx: 0, my: 0 };
function setupTouch() {
  show('touch', true); const stick = $('stick'), knob = stick.firstElementChild;
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); Sfx.init();
    for (const t of e.changedTouches) {
      if (t.clientX < innerWidth * 0.42 && !T.joy) { T.joy = { id: t.identifier, x: t.clientX, y: t.clientY }; stick.style.left = (t.clientX - 65) + 'px'; stick.style.top = (t.clientY - 65) + 'px'; stick.style.bottom = 'auto'; }
      else if (!T.look) T.look = { id: t.identifier, x: t.clientX, y: t.clientY, t0: performance.now(), moved: false };
    }
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (T.joy && t.identifier === T.joy.id) { let dx = t.clientX - T.joy.x, dy = t.clientY - T.joy.y; const L = Math.hypot(dx, dy); if (L > 50) { dx *= 50 / L; dy *= 50 / L; } T.mx = dx / 50; T.my = -dy / 50; knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; }
      if (T.look && t.identifier === T.look.id) { const dx = t.clientX - T.look.x, dy = t.clientY - T.look.y; T.look.x = t.clientX; T.look.y = t.clientY; if (Math.abs(dx) + Math.abs(dy) > 1) T.look.moved = true; look(dx * 2.2, dy * 2.2); }
    }
  }, { passive: false });
  const end = (e) => { for (const t of e.changedTouches) { if (T.joy && t.identifier === T.joy.id) { T.joy = null; T.mx = T.my = 0; knob.style.transform = ''; } if (T.look && t.identifier === T.look.id) { if (!T.look.moved && performance.now() - T.look.t0 < 250) { mouseR = true; S.useCD = 0; setTimeout(() => mouseR = false, 60); } T.look = null; } } };
  canvas.addEventListener('touchend', end); canvas.addEventListener('touchcancel', end);
  const hold = (id, on, off) => { const el = $(id); el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); Sfx.init(); el.classList.add('on'); on(); }, { passive: false }); el.addEventListener('touchend', (e) => { e.preventDefault(); el.classList.remove('on'); off && off(); }, { passive: false }); };
  hold('tJump', () => keys[KB.jump] = true, () => keys[KB.jump] = false);
  hold('tSneak', () => keys[KB.sneak] = true, () => keys[KB.sneak] = false);
  hold('tMine', () => mouseL = true, () => mouseL = false);
  hold('tUse', () => { mouseR = true; S.useCD = 0; }, () => mouseR = false);
  hold('tInv', () => { if (S.uiOpen) closeInv(); else openInv(); });
  hold('tPause', () => openPause());
  hold('tSwap', () => swapHands());
  hold('tFly', () => { if (S.mode === 'creative') { player.flying = !player.flying; toast(player.flying ? 'Flying' : 'Walking', 1); } });
  $('inv').addEventListener('pointerdown', (e) => { if (e.target.id === 'inv') closeInv(); });
}

// ---- raycast ----
function raycast(o, d, max, fluids) {
  let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
  const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
  const tdx = Math.abs(1 / d.x), tdy = Math.abs(1 / d.y), tdz = Math.abs(1 / d.z);
  let tx = d.x === 0 ? Infinity : (sx > 0 ? x + 1 - o.x : o.x - x) * tdx, ty = d.y === 0 ? Infinity : (sy > 0 ? y + 1 - o.y : o.y - y) * tdy, tz = d.z === 0 ? Infinity : (sz > 0 ? z + 1 - o.z : o.z - z) * tdz;
  let nx = 0, ny = 0, nz = 0, t = 0;
  for (let i = 0; i < 64; i++) {
    const id = world.get(x, y, z);
    if (id && (!BL[id].noTarget || (fluids && BL[id].fluid))) return { x, y, z, id, nx, ny, nz, dist: t };
    if (tx < ty && tx < tz) { if (tx > max) break; x += sx; t = tx; tx += tdx; nx = -sx; ny = 0; nz = 0; }
    else if (ty < tz) { if (ty > max) break; y += sy; t = ty; ty += tdy; nx = 0; ny = -sy; nz = 0; }
    else { if (tz > max) break; z += sz; t = tz; tz += tdz; nx = 0; ny = 0; nz = -sz; }
  }
  return null;
}
function lookDir() { return new V3(0, 0, -1).applyEuler(new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ')); }

// ---- interaction ----
function breakTime(id, tool) {
  const def = BL[id]; if (def.hardness < 0) return Infinity; if (S.mode === 'creative') return 0;
  if (def.hardness === 0) return 0.05;
  const hz = 1 + 0.2 * effLevel('haste'); const ef = heldEnch('efficiency');
  if (def.tool === 'pick') return ((tool && tool.tool === 'pick') ? def.hardness * 1.5 / (tool.speed + (ef ? ef * ef + 1 : 0)) : def.hardness * 5) / hz;
  // axes speed up wood, shovels speed up dirt, sand, gravel and snow
  const want = def.snd === 'wood' ? 'axe' : (['grass', 'sand', 'snow'].includes(def.snd) && def.render === 'cube' && !def.plant) ? 'shovel' : null;
  if (want && tool && tool.tool === want) return def.hardness * 1.5 / (tool.speed + (ef ? ef * ef + 1 : 0)) / hz;
  let t = def.hardness * 1.2; if (tool && tool.tool === 'sword' && (id === B.LEAVES || id === B.BIRCH_LEAVES || id === B.SPRUCE_LEAVES)) t *= 0.4; return t / hz;
}
function breakBlock(x, y, z) {
  const id = world.get(x, y, z); if (!id) return;
  if (MODS.hooks.blockBreak && modFire('blockBreak', { x, y, z, block: BL[id].key })) return;
  onBlockRemoved(x, y, z, id); world.set(x, y, z, 0); breakBedPair(x, y, z, id);
  { const hd0 = player.heldDef(); if (hd0 && maxDur(player.held().id) && BL[id].hardness > 0 && (hd0.kind === 'tool')) damageHeld(hd0.tool === 'sword' ? 2 : 1); }
  Particles.blockBreak(x, y, z, id); Sfx.play(BL[id].snd === 'glass' ? 'glass_break' : BL[id].snd, 0.9);
  if (isSurv()) { const hd = player.heldDef(); let dr = blockDrop(id, hd && hd.kind === 'tool' ? hd : null); if (dr || (hd && hd.tool === 'pick')) { if (!(BL[id].tool === 'pick' && (!hd || hd.tool !== 'pick' || hd.tier < BL[id].tier))) dr = enchantedDrop(id, dr); } if (dr) { dropItem(dr[0], dr[1], x + 0.5, y + 0.4, z + 0.5); if (dr[0] !== id) oreXP(id, x, y, z); } if (BL[id].crop === 3) dropItem(IT.wheat_seeds, 1 + Math.floor(Math.random() * 3), x + 0.5, y + 0.4, z + 0.5); }
  for (let yy = y + 1; yy < WH; yy++) { const a = world.get(x, yy, z); if (PLANT[a] || a === B.TORCH || a === B.CACTUS) { onBlockRemoved(x, yy, z, a); world.set(x, yy, z, 0); Particles.blockBreak(x, yy, z, a, 8); if (isSurv()) { const dr = blockDrop(a); if (dr) dropItem(dr[0], dr[1], x + 0.5, yy + 0.4, z + 0.5); } if (a !== B.CACTUS) break; } else break; }
}
const PLANT_SOIL = { nether: [B.CRIMSON_NYLIUM, B.WARPED_NYLIUM, B.NETHERRACK, B.SOUL_SAND] };
function placeBlock(hit, id) {
  let x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
  if (PLANT[hit.id]) { x = hit.x; y = hit.y; z = hit.z; }
  if (y < 1 || y >= WH) return false;
  const cur = world.get(x, y, z); if (cur && !BL[cur].fluid && !PLANT[cur]) return false;
  const below = world.get(x, y - 1, z);
  if (BL[id].crop !== undefined && below !== B.FARMLAND) return false;
  if (id === B.SUGAR_CANE) { const wet = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => isWaterId(world.get(x + a, y - 1, z + b))); if (!(below === B.SUGAR_CANE || ((below === B.GRASS || below === B.DIRT || below === B.SAND) && wet))) return false; }
  else if (BL[id].plant && BL[id].crop === undefined) { const netherPlant = id >= B.CRIMSON_FUNGUS && id <= B.WARPED_ROOTS; const ok = netherPlant ? PLANT_SOIL.nether.includes(below) : (below === B.GRASS || below === B.DIRT || below === B.SNOWY_GRASS || (id === B.DEAD_BUSH && below === B.SAND)); if (!ok) return false; }
  if (id === B.TORCH && !SOLID[below] && !(hit.ny === 0 && SOLID[hit.id])) return false; // floor or wall torches
  if (id === B.CACTUS && !(below === B.SAND || below === B.CACTUS)) return false;
  if (SOLID[id]) { if (boxIntersectsBlock(player, x, y, z)) return false; for (const m of G.mobs) if (!m.dead && !m.isBoss && boxIntersectsBlock(m, x, y, z)) return false; }
  if (BL[id].fluid) { if (!placeFluid(x, y, z, id)) return true; } else world.set(x, y, z, id);
  Sfx.play(BL[id].snd, 0.8); if (MODS.hooks.blockPlace) modFire('blockPlace', { x, y, z, block: BL[id].key }); return true;
}
function pickBlock() { if (S.mode !== 'creative') return; const hit = raycast(player.eye(), lookDir(), 7); if (!hit) return; let id = hit.id; if (BL[id].hidden) id = id === B.END_PORTAL_FRAME_EYE ? B.END_PORTAL_FRAME : B.NETHER_PORTAL; for (let i = 0; i < 9; i++) if (player.inv[i] && player.inv[i].id === id) { selectSlot(i); return; } player.inv[player.sel] = { id, count: stackMax(id) }; invDirty(); selectSlot(player.sel); }
function dropHeld(all) { const h = player.held(); if (!h) return; const n = all ? h.count : 1; const d = lookDir(); const e = player.eye(); const it = dropItem(h.id, n, e.x + d.x * 0.4, e.y - 0.3 + d.y * 0.4, e.z + d.z * 0.4, false, xtra(h)); it.vel.set(d.x * 6, d.y * 6 + 2, d.z * 6); it.pickDelay = 1.5; h.count -= n; if (h.count <= 0) player.inv[player.sel] = null; invDirty(); S.swing = 1; }
let target = null, targetMob = null;
function mobRay(m, eye, dir) { if (m.rayTest) return m.rayTest(eye, dir); return rayAABB(eye, dir, new V3(m.pos.x - m.hw, m.pos.y, m.pos.z - m.hw), new V3(m.pos.x + m.hw, m.pos.y + m.h, m.pos.z + m.hw)); }
function updateInteraction(dt) {
  S.atkCD -= dt; S.useCD -= dt;
  if (player.dead || S.uiOpen) { selBox.visible = false; crackMesh.visible = false; show('mineBar', false); S.mineT = 0; return; }
  const eye = player.eye(), dir = lookDir(); const reach = S.mode === 'creative' ? 7 : 5;
  target = raycast(eye, dir, reach);
  targetMob = null; let best = S.mode === 'creative' ? 6 : 3.8;
  for (const m of G.mobs) { if (m.dead) continue; const t = mobRay(m, eye, dir); if (t >= 0 && t < best && (!target || t < target.dist)) { best = t; targetMob = m; } }
  targetBoat = boatRay(eye, dir, best); if (targetBoat) targetMob = null;
  if (target && !targetMob && !targetBoat) { selBox.visible = true; selBox.position.set(target.x + 0.5, target.y + 0.5, target.z + 0.5); } else selBox.visible = false;
  const tool = player.heldDef();
  if (mouseL && S.atkCD <= 0 && deflectProjectiles(eye, dir)) { S.atkCD = 0.45; S.swing = 1; }
  if (mouseL && targetBoat) { hitBoat(targetBoat); S.mineT = 0; }
  else if (mouseL && targetMob) {
    if (meleeReady()) playerMelee(targetMob, tool);
    S.mineT = 0;
  } else if (mouseL && target) {
    const key = target.x + ',' + target.y + ',' + target.z;
    if (key !== S.mineKey) { S.mineKey = key; S.mineT = 0; }
    const bt = breakTime(target.id, tool && tool.kind === 'tool' ? tool : null);
    if (bt === 0) { if (S.atkCD <= 0) { breakBlock(target.x, target.y, target.z); S.atkCD = 0.2; S.swing = 1; } }
    else if (bt < Infinity) {
      S.mineT += dt; S.swing = Math.max(S.swing, 0.6);
      if (Math.random() < dt * 6) { Sfx.play(BL[target.id].snd, 0.25); Particles.blockBreak(target.x, target.y, target.z, target.id, 2); }
      if (S.mineT >= bt) { breakBlock(target.x, target.y, target.z); S.mineT = 0; S.mineKey = ''; }
    }
    const prog = bt === Infinity ? 0 : bt ? S.mineT / bt : 0;
    crackMesh.visible = prog > 0.02; crackMesh.position.copy(selBox.position); crackMat.map = crackTextures[Math.min(5, Math.floor(prog * 6))];
    show('mineBar', prog > 0.02); $('mineBar').firstChild.style.width = Math.round(prog * 100) + '%';
  } else { S.mineT = 0; S.mineKey = ''; crackMesh.visible = false; show('mineBar', false); }
  if (!mouseL) { crackMesh.visible = false; show('mineBar', false); }
  // shield: hold right-click with a shield in either hand (main-hand items with their own use take priority)
  const hb = player.heldDef(); const sneak = kd('sneak');
  const blockUse = target && !sneak && (BL[target.id].use === 'chest' || target.id === B.CRAFTING_TABLE || BL[target.id].use === 'furnace' || (target.id === B.END_PORTAL_FRAME && hb && hb.kind === 'eye'));
  const offShield = player.inv[36] && player.inv[36].id === IT.shield; const mk = hb ? hb.kind : null;
  const canShield = mk === 'shield' || (offShield && (!mk || mk === 'tool' || mk === 'mat'));
  if (canShield && mouseR && !blockUse && !(targetMob && targetMob.type === 'piglin' && hb && player.held().id === IT.gold_ingot)) { S.blockT = (S.blockT || 0) + dt; player.blocking = S.blockT > 0.15; return; }
  S.blockT = 0; player.blocking = false;
  // bow: hold to draw, release to shoot
  if (hb && hb.kind === 'bow' && !blockUse) {
    if (mouseR) {
      if (S.bowDraw < 0) { if (S.mode === 'creative' || countItem(IT.arrow) > 0) { S.bowDraw = 0; Sfx.play('bowdraw', 0.8); } else if (S.useCD <= 0) { toast('You need arrows', 1.2); S.useCD = 1; } }
      else S.bowDraw += dt;
    } else if (S.bowDraw >= 0) fireBow(eye, dir);
    return;
  }
  if (S.bowDraw >= 0) S.bowDraw = -1;
  if (mouseR && S.useCD <= 0) { S.useCD = 0.25; useAction(eye, dir); }
}
function bowPower() { return S.bowDraw < 0 ? 0 : clamp(S.bowDraw / 1.0, 0, 1); }
function fireBow(eye, dir) {
  const p = bowPower(); S.bowDraw = -1; if (p < 0.12) return;
  if (S.mode !== 'creative') { if (countItem(IT.arrow) <= 0) return; if (!heldEnch('infinity')) removeItem(IT.arrow, 1); }
  const full = p >= 1; const pw = heldEnch('power'); const a = spawnProj('arrow', eye.clone().addScaledVector(dir, 0.6), dir.clone().multiplyScalar(8 + p * 30), 'player', Math.round((1 + p * 7 + (full ? 2 : 0)) * (pw ? 1 + 0.25 * (pw + 1) : 1))); a.crit = full; a.punch = heldEnch('punch'); a.flame = heldEnch('flame') > 0; damageHeld(1);
  Sfx.play('bow', 0.5 + p * 0.6); S.bowKick = 1;
}
function useAction(eye, dir) {
  const h = player.held(); const hd = h && ITEMS[h.id]; const sneaking = kd('sneak');
  if (MODS.hooks.useItem && modFire('useItem', { item: hd ? hd.key : null, block: target ? { x: target.x, y: target.y, z: target.z, key: BL[target.id].key } : null, mob: targetMob ? targetMob.type : null })) { mouseR = false; return; }
  // mobs
  if (targetBoat && !sneaking) { mouseR = false; mountBoat(targetBoat); return; }
  if (hd && hd.kind === 'boat' && !(target && BL[target.id].use && !sneaking)) { mouseR = false; placeBoatItem(eye, dir); return; }
  if (!(target && !sneaking && BL[target.id].use) && farmUse(h, hd)) return;
  if (hd && hd.kind === 'bed' && target && !(BL[target.id].use && !sneaking)) { mouseR = false; if (placeBed(target)) useHeld(1); S.swing = 1; return; }
  if (hd && hd.kind === 'armor' && !(target && !sneaking && BL[target.id].use)) { const k = ARMOR_SLOT[hd.slot]; const cur = player.inv[k]; player.inv[k] = h; player.inv[handSlot()] = cur; Sfx.play('armor', 0.8); invDirty(); mouseR = false; return; }
  if (targetMob && targetMob.type === 'piglin' && hd && h.id === IT.gold_ingot && !(targetMob.angry > 0)) { targetMob.admireT = 3; useHeld(1); Sfx.at('snort', targetMob.pos, 1); S.swing = 1; return; }
  if (target && !sneaking) {
    const bd = BL[target.id];
    if (bd.use === 'chest') { mouseR = false; openChest(target.x, target.y, target.z); return; }
    if (target.id === B.CRAFTING_TABLE) { mouseR = false; openUI('table'); return; }
    if (bd.use === 'furnace') { mouseR = false; const fk = target.x + ',' + target.y + ',' + target.z; getFurnace(fk).fast = bd.fast || null; openUI('furnace', fk); return; }
    if (bd.use === 'bed') { mouseR = false; useBed(target.x, target.y, target.z); return; }
    if (target.id === B.ENCHANTING_TABLE) { mouseR = false; openUI('enchant', target.x + ',' + target.y + ',' + target.z); return; }
    if (target.id === B.END_PORTAL_FRAME && hd && h.id === IT.eye_of_ender) { world.set(target.x, target.y, target.z, B.END_PORTAL_FRAME_EYE); useHeld(1); Sfx.play('portal', 0.6); Particles.emit(target.x + 0.5, target.y + 1.1, target.z + 0.5, 12, [[0.3, 0.9, 0.6]], 1.5, 0.6, -1, 0.5); checkEndPortal(target.x, target.y, target.z); S.swing = 1; return; }
  }
  if (!hd) return;
  if (hd.kind === 'food') return; // eating is a hold-to-use action (23_hunger.js)
  if (hd.kind === 'bow') return;
  if (hd.kind === 'pearl') { useHeld(1); spawnProj('pearl', eye.clone().addScaledVector(dir, 0.6), dir.clone().multiplyScalar(30).add(new V3(player.vel.x, player.onGround ? 0 : player.vel.y, player.vel.z)), 'player', 0); Sfx.play('bow', 0.6); S.useCD = 0.6; S.swing = 1; return; }
  if (hd.kind === 'eye') { if (throwEye()) { useHeld(1); S.useCD = 1; S.swing = 1; } return; }
  if (hd.kind === 'fns') {
    if (!target) return; S.swing = 1; Sfx.play('ignite', 1); damageHeld(1);
    if (target.id === B.TNT) { world.set(target.x, target.y, target.z, 0); primeTNT(target.x, target.y, target.z); return; }
    const x = target.x + target.nx, y = target.y + target.ny, z = target.z + target.nz;
    if (world.get(x, y, z) === 0 && tryLightPortal(x, y, z)) { Sfx.play('portal', 1); toast('The portal flickers to life', 2); }
    else Particles.emit(x + 0.5, y + 0.2, z + 0.5, 6, [[1, 0.6, 0.1], [1, 0.9, 0.3]], 1.5, 0.4, -1, 0.3);
    return;
  }
  if (hd.kind === 'bucket') {
    if (!hd.fluid) { const ft = raycast(eye, dir, 5, true); if (ft && BL[ft.id].fluid && FLEVEL[ft.id] === 0) { world.set(ft.x, ft.y, ft.z, 0); replaceHeld(ft.id === B.WATER ? IT.water_bucket : IT.lava_bucket); Sfx.play('splash', 0.6); S.swing = 1; } return; }
    if (!target) return; const id = hd.fluid === 'water' ? B.WATER : B.LAVA;
    if (placeBlock(target, id)) { if (S.mode !== 'creative') { player.inv[handSlot()] = { id: IT.bucket, count: 1 }; invDirty(); } S.swing = 1; }
    return;
  }
  if (hd.kind === 'block' && target) { if (placeBlock(target, h.id)) { useHeld(1); S.swing = 1; } }
}

// ---- spawning ----
// the ground under the open sky; tree leaves and logs are looked through, so animals spawn under trees, not on them
function surfaceSpawnY(x, z) { const c = world.getChunk(x >> 4, z >> 4); if (!c) return -1; for (let y = Math.min(WH - 2, c.maxY + 1); y > 1; y--) { const id = c.d[(y * 16 + (z & 15)) * 16 + (x & 15)]; if (!id) continue; const k = BL[id].key; if (/leaves|_log$|^log$|vine/.test(k)) continue; if (!SOLID[id]) { if (BL[id].fluid) return -1; continue; } return y + 1; } return -1; }
function onChunkGen(c, hints, cols, w) {
  if (w !== world) return;
  for (const [type, x, y, z] of hints) spawnMob(type, x, y, z);
  if (!cols) return;
  const passive = G.mobs.filter(m => m.t.kind === 'passive').length;
  if (passive < 60 && Math.random() < 0.35) { // Minecraft: animals are placed with the chunk, in groups of 4
    const lx = 3 + (Math.random() * 10 | 0), lz = 3 + (Math.random() * 10 | 0); const col = cols[lz * 16 + lx];
    if (col.b === BIO.PLAINS || col.b === BIO.FOREST || col.b === BIO.SNOWY || (col.b === BIO.MOUNTAINS && col.h < SEA + 30)) {
      // Minecraft spawn weights: plains also have horse herds (2-6); snowy plains mostly sheep
      const type = col.b === BIO.SNOWY ? pickWeighted({ sheep: 2, cow: 1 }) : col.b === BIO.PLAINS ? pickWeighted({ sheep: 12, pig: 10, chicken: 10, cow: 8, horse: 5 }) : pickWeighted({ sheep: 12, pig: 10, chicken: 10, cow: 8 });
      const n = type === 'horse' ? 2 + (Math.random() * 5 | 0) : 4;
      for (let i = 0; i < n; i++) { const x = c.cx * 16 + clamp(lx + (Math.random() * 5 | 0) - 2, 0, 15), z = c.cz * 16 + clamp(lz + (Math.random() * 5 | 0) - 2, 0, 15); const y = surfaceSpawnY(x, z); if (y > SEA && (world.get(x, y - 1, z) === B.GRASS || world.get(x, y - 1, z) === B.SNOWY_GRASS) && animalLightOk(x, y, z)) spawnMob(type, x + 0.5, y, z + 0.5); }
    }
  }
}
// Minecraft spawn light rules, on the 0-15 light scale: monsters need block light 0 and sky light 7 or less (the sky is
// dimmer at night, so open ground works at night but not by day); in the Nether block light must be 11 or less.
function lightLevels(x, y, z) { const bl = Math.round(world.blockLightAt(x + 0.5, y + 0.5, z + 0.5) * 15); const sky = world.flatSky ? 0 : Math.round(world.skyAt(x, y, z) * clamp(G.daylight, 0, 1) * 15); return { block: bl, sky, total: Math.max(bl, sky) }; }
function hostileLightOk(x, y, z) { const L = lightLevels(x, y, z); return world.dim === 'nether' ? L.block <= 11 : (L.block === 0 && L.sky <= 7); }
function animalLightOk(x, y, z) { return world.dim !== 'overworld' || Math.max(Math.round(world.blockLightAt(x + 0.5, y + 0.5, z + 0.5) * 15), Math.round(world.skyAt(x, y, z) * 15)) >= 9; }
function pickWeighted(tab) { let tot = 0; for (const k in tab) tot += tab[k]; let q = Math.random() * tot; for (const k in tab) { q -= tab[k]; if (q <= 0) return k; } return Object.keys(tab)[0]; }
function freeAt(x, y, z, h = 2) { for (let k = 0; k < h; k++) if (world.get(x, y + k, z)) return false; return true; }
const spawnerT = new Map();
function updateSpawning(dt) {
  S.spawnT -= dt; if (S.spawnT > 0) return; S.spawnT = 1; if (MP.proxyMode) return;
  const P = player; const hostiles = G.mobs.filter(m => m.t.kind !== 'passive' && !m.isBoss);
  if (!S.rules.doMobSpawning) return;
  if (isSurv() || world.dim !== 'overworld') {
    if (world.dim === 'overworld') {
      const night = G.daylight < 0.38; const cap = night ? 18 : 6;
      if (hostiles.length < cap && isSurv() && S.difficulty !== 'peaceful') for (let tries = 0; tries < 4; tries++) {
        const a = Math.random() * Math.PI * 2, d = 20 + Math.random() * 24; const x = Math.floor(P.pos.x + Math.cos(a) * d), z = Math.floor(P.pos.z + Math.sin(a) * d);
        if (!world.loaded(x, z)) continue; let y = -1;
        if (night && Math.random() < 0.7) y = surfaceSpawnY(x, z);
        else { const y0 = Math.floor(P.pos.y) + (Math.random() * 20 | 0) - 10; for (let yy = clamp(y0, 2, WH - 3); yy > 2; yy--) { if (freeAt(x, yy, z) && SOLID[world.get(x, yy - 1, z)]) { y = yy; break; } } }
        if (y < 2 || !freeAt(x, y, z, 3) || !SOLID[world.get(x, y - 1, z)]) continue;
        if (!hostileLightOk(x, y, z)) continue;
        spawnMob(pickWeighted({ zombie: 30, skeleton: 25, spider: 20, creeper: 17, enderman: 8 }), x + 0.5, y, z + 0.5); break;
      }
    } else if (world.dim === 'nether') {
      if (hostiles.length < 18 && S.difficulty !== 'peaceful') for (let tries = 0; tries < 5; tries++) {
        const a = Math.random() * Math.PI * 2, d = 16 + Math.random() * 30; const x = Math.floor(P.pos.x + Math.cos(a) * d), z = Math.floor(P.pos.z + Math.sin(a) * d);
        if (!world.loaded(x, z)) continue; const c = world.getChunk(x >> 4, z >> 4);
        const y0 = clamp(Math.floor(P.pos.y) + (Math.random() * 30 | 0) - 15, 33, 118); let y = -1;
        for (let yy = y0; yy > 32; yy--) if (freeAt(x, yy, z, 3) && SOLID[world.get(x, yy - 1, z)]) { y = yy; break; }
        if (y < 0 || !hostileLightOk(x, y, z)) continue; const b = world.gen.biome(x, z);
        let type = c && c.fortress && Math.random() < 0.6 ? pickWeighted({ wither_skeleton: 45, blaze: 35, magma_cube: 20 }) :
          b === 1 ? pickWeighted({ piglin: 45, hoglin: 35, zombified_piglin: 20 }) : b === 2 ? pickWeighted({ enderman: 85, strider: 0, zombified_piglin: 15 }) : b === 3 ? pickWeighted({ skeleton: 50, ghast: 35, enderman: 15 }) : pickWeighted({ zombified_piglin: 45, magma_cube: 22, ghast: 15, piglin: 10, enderman: 8 });
        if (type === 'ghast') { if (!(freeAt(x, y + 4, z, 6) && freeAt(x + 2, y + 5, z, 3) && freeAt(x - 2, y + 5, z, 3))) continue; spawnMob('ghast', x + 0.5, y + 4, z + 0.5); break; }
        if (type === 'zombified_piglin' || type === 'piglin') { const n = 1 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) spawnMob(type, x + 0.5 + i * 0.7, y, z + 0.5); break; }
        spawnMob(type, x + 0.5, y, z + 0.5, type === 'magma_cube' ? { size: [1, 2, 4][Math.random() * 3 | 0] } : undefined); break;
      }
      // striders on lava
      if (G.mobs.filter(m => m.type === 'strider').length < 4 && Math.random() < 0.3) {
        const a = Math.random() * Math.PI * 2, d = 16 + Math.random() * 28; const x = Math.floor(P.pos.x + Math.cos(a) * d), z = Math.floor(P.pos.z + Math.sin(a) * d);
        if (world.loaded(x, z) && world.get(x, NSEA, z) === B.LAVA && freeAt(x, NSEA + 1, z, 2)) spawnMob('strider', x + 0.5, NSEA + 1, z + 0.5);
      }
    } else if (world.dim === 'end') {
      if (G.mobs.filter(m => m.type === 'enderman').length < 10) for (let tries = 0; tries < 3; tries++) {
        const a = Math.random() * Math.PI * 2, d = 16 + Math.random() * 30; const x = Math.floor(P.pos.x + Math.cos(a) * d), z = Math.floor(P.pos.z + Math.sin(a) * d);
        if (!world.loaded(x, z)) continue; const y = surfaceSpawnY(x, z); if (y > 2 && world.get(x, y - 1, z) === B.END_STONE && freeAt(x, y, z, 3)) { spawnMob('enderman', x + 0.5, y, z + 0.5); break; }
      }
    }
  }
  for (const [k, type] of world.spawners) {
    const [x, y, z] = k.split(',').map(Number); if (Math.abs(x - P.pos.x) > 16 || Math.abs(y - P.pos.y) > 10 || Math.abs(z - P.pos.z) > 16) continue;
    if (world.get(x, y, z) !== B.SPAWNER) continue;
    const t = (spawnerT.get(k) || 0) - 1; spawnerT.set(k, t);
    Particles.emit(x + 0.5, y + 0.5, z + 0.5, 3, [[1, 0.5, 0.1], [0.4, 0.4, 0.4]], 1, 0.6, -2, 0.6);
    if (t > 0 || !isSurv()) continue; spawnerT.set(k, 4 + Math.random() * 6);
    if (G.mobs.filter(m => m.pos.distanceTo(new V3(x, y, z)) < 9).length >= 4) continue;
    for (let tries = 0; tries < 6; tries++) { const sx = x + (Math.random() * 7 | 0) - 3, sz = z + (Math.random() * 7 | 0) - 3, sy = y + (Math.random() * 3 | 0) - 1; if (freeAt(sx, sy, sz) && SOLID[world.get(sx, sy - 1, sz)]) { spawnMob(type, sx + 0.5, sy, sz + 0.5); Particles.emit(sx + 0.5, sy + 0.8, sz + 0.5, 15, [0.6, 0.6, 0.6], 2, 0.6, -1, 0.6); break; } }
  }
}

// ---- player update ----
function updatePlayer(dt) {
  const P = player; if (P.dead) return;
  P.eyeH = (P.eyeH || 1.62) + ((P.riding ? BOAT.eye : P.sneaking ? 1.27 : 1.62) - (P.eyeH || 1.62)) * Math.min(1, dt * 12);
  P.hurtCD -= dt;
  if (!world.loaded(Math.floor(P.pos.x), Math.floor(P.pos.z))) return;
  if (P.gliding && glideUpdate(P, dt)) { /* elytra flight (40_end.js) */ } else if (P.riding) rideUpdate(P, dt); else {
  let f = 0, s = 0; if (!S.uiOpen) { if (kd('forward') || keys.ArrowUp) f++; if (kd('back') || keys.ArrowDown) f--; if (kd('right') || keys.ArrowRight) s++; if (kd('left') || keys.ArrowLeft) s--; f += T.my; s += T.mx; }
  const jump = !S.uiOpen && kd('jump'), down = !S.uiOpen && kd('sneak');
  if (keys.KeyJ) look(-300 * dt, 0); if (keys.KeyL) look(300 * dt, 0); if (keys.KeyI) look(0, -300 * dt); if (keys.KeyK) look(0, 300 * dt);
  // sprint: double-tap forward or hold the sprint key while moving forward; sneaking or stopping ends it
  if (f > 0 && (S.sprintTap || kd('sprint')) && !(down && !P.flying) && (!isSurv() || P.food > 6 || P.flying)) P.sprinting = true;
  if (f <= 0 || (down && !P.flying && !P.swimming) || (P.hitH && !P.flying && !inWater(P, 0.4))) { P.sprinting = false; if (f <= 0) S.sprintTap = false; }
  const sprint = !!P.sprinting;
  P.sneaking = down && !P.flying && !P.swimming && !S.uiOpen;
  const water = inWater(P, 0.4), lava = inLava(P, 0.3) || inLava(P, 1.0);
  if ((water || lava) && !P.flying) fluidPush(P, dt, P.swimming ? 0.5 : 1);
  const under = world.get(Math.floor(P.pos.x), Math.floor(P.pos.y - 0.1), Math.floor(P.pos.z));
  let speed = (P.flying ? (sprint ? 22 : 11) : P.sneaking ? 1.3 * (typeof sneakSpeedMul === 'function' ? sneakSpeedMul() : 1) : sprint ? 5.6 : 4.3) * MODS.physics.speed * (1 + 0.2 * effLevel('speed')) * Math.max(0.1, 1 - 0.15 * effLevel('slowness')); if (water && !P.flying) speed *= (typeof waterSpeedMul === 'function' ? waterSpeedMul() : 0.55); if (lava && !P.flying) speed *= 0.35; if ((S.bowDraw >= 0 || P.blocking || S.eating > 0) && !P.flying) speed *= 0.35; if (under === B.SOUL_SAND && P.onGround) speed *= (typeof soulSandMul === 'function' ? soulSandMul() : 0.55);
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  let wx = fx * f + rx * s, wz = fz * f + rz * s; const L = Math.hypot(wx, wz); if (L > 1) { wx /= L; wz /= L; } wx *= speed; wz *= speed;
  const k = P.flying ? 1 - Math.exp(-dt * 8) : P.onGround ? 1 - Math.exp(-dt * 16) : 1 - Math.exp(-dt * (water || lava ? 6 : 2.5));
  P.vel.x += (wx - P.vel.x) * k; P.vel.z += (wz - P.vel.z) * k;
  if (P.flying) { const vy = (jump ? speed * 0.75 : 0) - (down ? speed * 0.75 : 0); P.vel.y += (vy - P.vel.y) * (1 - Math.exp(-dt * 10)); }
  else if (swimUpdate(P, dt, water, lava, sprint, f, jump, down)) { }
  else if (water || lava) { P.vel.y -= (lava ? 6 : 9) * dt; P.vel.y *= Math.exp(-dt * (lava ? 4 : 2.5)); if (jump) P.vel.y = Math.min(P.vel.y + (lava ? 20 : 28) * dt, lava ? 2.2 : 3.4); P.vel.y = Math.max(P.vel.y, lava ? -2 : -4); }
  else if (effLevel('levitation')) { P.vel.y += (0.9 * effLevel('levitation') * 2 - P.vel.y) * (1 - Math.exp(-dt * 5)); P.peak = null; }
  else { P.vel.y = Math.max(P.vel.y - MODS.physics.gravity * dt, effLevel('slow_falling') ? -2.4 : -55); if (effLevel('slow_falling')) P.peak = null; if (jump && P.onGround) P.vel.y = MODS.physics.jump + 1.6 * effLevel('jump_boost'); }
  const ox = P.pos.x, oz = P.pos.z;
  // sneaking keeps you from walking off edges
  if (P.sneaking && P.onGround) { const sup = (x, z) => { for (const ax of [-P.hw + 0.01, P.hw - 0.01]) for (const az of [-P.hw + 0.01, P.hw - 0.01]) if (world.solid(Math.floor(x + ax), Math.floor(P.pos.y - 0.1), Math.floor(z + az))) return true; return false; };
    if (!sup(P.pos.x + P.vel.x * dt, P.pos.z)) P.vel.x = 0; if (!sup(P.pos.x, P.pos.z + P.vel.z * dt)) P.vel.z = 0; }
  moveEntity(P, dt);
  if ((water || lava) && P.hitH && jump) P.vel.y = 6;
  if (P.flying && P.onGround && down) P.flying = false;
  if (S.mode !== 'creative') P.flying = false;
  if (P.onGround || water || lava || P.flying) { if (P.onGround && P.peak !== null && !water && !P.flying) { const fall = P.peak - P.pos.y; if (fall > 3.4 + effLevel('jump_boost') && S.rules.fallDamage && Math.floor((fall - 3 - effLevel('jump_boost')) * MODS.physics.fallDamage) > 0) { P.hurt(Math.floor((fall - 3) * MODS.physics.fallDamage), null, 'fall damage'); Particles.blockBreak(Math.floor(P.pos.x), Math.floor(P.pos.y - 0.5), Math.floor(P.pos.z), world.get(Math.floor(P.pos.x), Math.floor(P.pos.y - 0.5), Math.floor(P.pos.z)) || 1, 10); } } P.peak = null; }
  else P.peak = P.peak === null ? P.pos.y : Math.max(P.peak, P.pos.y);
  if (P.pos.y < -64) { if (isSurv()) { P.health = 0; P.die('the void'); } else { P.pos.y = WH + 5; P.vel.set(0, 0, 0); P.flying = true; } }
  if (lava && isSurv()) { P.lavaT += dt; if (Math.random() < dt * 10) Particles.emit(P.pos.x, P.pos.y + 1, P.pos.z, 2, [[1, 0.5, 0.1], [1, 0.8, 0.2]], 1, 0.5, -2, 0.6); if (P.lavaT > 0.5) { P.lavaT = 0; P.hurtCD = 0; P.hurt(4, null, 'lava', 0); } }
  if (under === B.MAGMA_BLOCK && P.onGround && !down && isSurv()) { P.lavaT += dt; if (P.lavaT > 1) { P.lavaT = 0; P.hurt(1, null, 'a magma block', 0); } }
  show('lavafx', lava && isLavaId(world.get(Math.floor(P.pos.x), Math.floor(P.pos.y + 1.62), Math.floor(P.pos.z))));
  if (P.onGround) { P.stepD += Math.hypot(P.pos.x - ox, P.pos.z - oz); if (P.stepD > 1.9) { P.stepD = 0; const b = world.get(Math.floor(P.pos.x), Math.floor(P.pos.y - 0.2), Math.floor(P.pos.z)); if (b) Sfx.play(BL[b].snd === 'stone' ? 'step' : BL[b].snd, 0.25); } }
  if (water && !P.wasWater && P.vel.y < -3) { Sfx.play('splash', 0.7); Particles.emit(P.pos.x, P.pos.y + 0.5, P.pos.z, 20, [0.6, 0.75, 1], 3, 0.7, 12, 0.6); } P.wasWater = water;
  if (isSurv()) { for (const [ax, az] of [[P.hw + 0.05, 0], [-P.hw - 0.05, 0], [0, P.hw + 0.05], [0, -P.hw - 0.05]]) if (world.get(Math.floor(P.pos.x + ax), Math.floor(P.pos.y + 0.5), Math.floor(P.pos.z + az)) === B.CACTUS) { P.hurt(1, null, 'a cactus', 0.3); break; } }
  } // end of on-foot movement
  // healing comes from food now (23_hunger.js)
  const c = new V3(P.pos.x, P.pos.y + 0.8, P.pos.z);
  for (const it of G.items) {
    if (it.gone || it.age < (it.pickDelay || 0.5)) continue; const d = it.pos.distanceTo(c);
    if (d < 2.6 && d > 1.0) { const v = c.clone().sub(it.pos).normalize().multiplyScalar(8 * dt); it.pos.add(v); }
    if (d < 1.4) { const left = addItem(it.id, it.count, it.extra); if (left < it.count) { Sfx.play('pop', 0.5); } if (left === 0) { it.gone = true; it.remove(); } else it.count = left; }
  }
  G.items = G.items.filter(i => { if (i.gone) return false; if (i.age >= 300) { i.remove(); return false; } return true; });
  checkPortals(dt);
}

// ---- held item view ----
const shieldPaint = (face, set, fw, fh, r) => {
  for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
    let c; const rim = x === 0 || y === 0 || x === fw - 1 || y === fh - 1;
    if (face === 'front') { const board = Math.floor(x / 3); c = rim ? [176, 176, 184] : vary(shadeC([158, 116, 68], 0.9 + (board % 2) * 0.12), r, 6); if (!rim && x % 3 === 0) c = [116, 82, 46]; const cx = (fw - 1) / 2, cy = (fh - 1) / 2; if (Math.abs(x - cx) < 2.5 && Math.abs(y - cy) < 2.5) c = (x < cx && y < cy) ? [232, 232, 238] : [180, 180, 190]; if ((y === 4 || y === fh - 5) && !rim) c = [150, 150, 158]; if (y === 1 || x === 1 || x === fw - 2 || y === fh - 2) c = shadeC(c, 0.8); }
    else if (face === 'back') { c = rim ? [150, 150, 158] : vary([120, 86, 50], r, 6); if (Math.abs(y - (fh >> 1)) < 2 && x > 1 && x < fw - 2) c = [86, 56, 34]; }
    else c = vary([166, 166, 174], r, 6);
    set(x, y, c);
  }
};
function shieldMesh() { const g = new THREE.Group(); sbox({ mats: [] }, g, 0.4, 0.58, 0.05, 0, 0, 0, 'shield_view2', shieldPaint, { ppb: 32 }); return g; }
// held items are extruded from their 16x16 icon (one voxel per pixel) so tools have real thickness, like Minecraft
const extrudeCache = new Map(); const extrudeMat = new THREE.MeshLambertMaterial({ vertexColors: true });
function extrudeGeo(canvas) {
  if (extrudeCache.has(canvas)) return extrudeCache.get(canvas);
  const d = canvas.getContext('2d').getImageData(0, 0, 16, 16).data; const S = 0.5 / 16, T = S * 1.1; const pos = [], nor = [], col = [];
  const op = (x, y) => x >= 0 && y >= 0 && x < 16 && y < 16 && d[(y * 16 + x) * 4 + 3] > 80;
  const quad = (a, b, c, e, n, rgb, sh) => { for (const v of [a, b, c, a, c, e]) { pos.push(v[0], v[1], v[2]); nor.push(n[0], n[1], n[2]); col.push(rgb[0] * sh, rgb[1] * sh, rgb[2] * sh); } };
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (!op(x, y)) continue; const k = (y * 16 + x) * 4; const rgb = [d[k] / 255, d[k + 1] / 255, d[k + 2] / 255];
    const x0 = (x - 8) * S, x1 = x0 + S, y1 = (8 - y) * S, y0 = y1 - S, z0 = -T / 2, z1 = T / 2;
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], rgb, 1);
    quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], rgb, 0.8);
    if (!op(x - 1, y)) quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], rgb, 0.7);
    if (!op(x + 1, y)) quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], rgb, 0.7);
    if (!op(x, y - 1)) quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], rgb, 0.9);
    if (!op(x, y + 1)) quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], rgb, 0.6);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  extrudeCache.set(canvas, g); return g;
}
function flatItemMesh(id) { const m = new THREE.Mesh(extrudeGeo(ICON_CANVAS[id]), extrudeMat); m.userData.baseGeo = m.geometry; return m; }
// right-hand pose: icon's top-right (blade / tip) points forward and up, like Minecraft's first-person view
const HELD_ROT = [-0.1, 2.35, 0.25], BOW_ROT = [-0.15, 2.1, 1.05];
function heldMeshFor(id) {
  if (id === IT.shield) return shieldMesh();
  if (isCubeItem(id)) { const m = new THREE.Mesh(blockGeo(id), handMat); m.scale.setScalar(0.3); m.rotation.set(0, Math.PI / 4, 0); return m; }
  return flatItemMesh(id);
}
const bowFrameCache = []; function bowFrameTex(i) { if (!bowFrameCache[i]) { const t = new THREE.CanvasTexture(BOW_FRAMES[i]); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; bowFrameCache[i] = t; } return bowFrameCache[i]; }
function updateHand(dt, light) {
  const h = player.held(); const id = h ? h.id : 0;
  if (id !== handId) {
    if (handMesh) handGroup.remove(handMesh); handId = id;
    if (!id) { const holder = { mats: [] }; handMesh = new THREE.Group(); sbox(holder, handMesh, 0.16, 0.5, 0.16, 0, 0, 0, 'player_arm', fur([214, 160, 124], 5, { topRows: [3, [52, 120, 190]], extra: (f, set, fw, fh) => { for (let x = 0; x < fw; x++) set(x, 3, [40, 96, 160]); } })); handMesh.children[0].rotation.x = -Math.PI / 2; handMesh.position.set(0.05, -0.05, 0.1); handMesh.rotation.set(-0.2, -0.15, 0); }
    else if (id === IT.shield) { handMesh = shieldMesh(); }
    else if (isCubeItem(id)) { handMesh = new THREE.Mesh(blockGeo(id), handMat); handMesh.scale.setScalar(0.3); handMesh.rotation.set(0, Math.PI / 4, 0); }
    else { handMesh = flatItemMesh(id); const R = ITEMS[id].kind === 'bow' ? BOW_ROT : HELD_ROT; handMesh.rotation.set(R[0], R[1], R[2]); handMesh.position.set(0, 0.08, 0); handMesh.scale.setScalar(1.15); }
    handGroup.add(handMesh);
  }
  S.swing = Math.max(0, S.swing - dt * 4); const dy = player.yaw - (S.lastYaw ?? player.yaw), dp = player.pitch - (S.lastPitch ?? player.pitch); S.lastYaw = player.yaw; S.lastPitch = player.pitch; S.lagX = clamp(((S.lagX || 0) + dy * 0.6) * Math.exp(-dt * 10), -0.25, 0.25); S.lagY = clamp(((S.lagY || 0) + dp * 0.6) * Math.exp(-dt * 10), -0.25, 0.25);
  const sw = Math.sin(S.swing * Math.PI); const bob = player.onGround ? Math.hypot(player.vel.x, player.vel.z) : 0; S.bob = (S.bob || 0) + bob * dt * 1.8;
  handGroup.position.set(0.48 + Math.cos(S.bob) * 0.012 * bob / 4 - sw * 0.15, -0.42 + Math.abs(Math.sin(S.bob)) * 0.02 * bob / 4 - sw * 0.1, -0.7 - sw * 0.12);
  handGroup.rotation.set(-sw * 0.8 + S.lagY, sw * 0.4 + S.lagX, 0); handGroup.position.x -= S.lagX * 0.3; handGroup.position.y -= S.lagY * 0.3;
  // bow draw pose: bring the bow to the centre, swap to pulled frames, tremble at full draw
  const isBow = id && ITEMS[id] && ITEMS[id].kind === 'bow'; const bp = isBow ? bowPower() : 0; const drawing = isBow && S.bowDraw >= 0;
  S.bowPose = (S.bowPose || 0) + ((drawing ? 1 : 0) - (S.bowPose || 0)) * Math.min(1, dt * 12); S.bowKick = Math.max(0, (S.bowKick || 0) - dt * 5);
  if (isBow && handMesh && handMesh.geometry) {
    const fr = !drawing ? -1 : bp < 0.33 ? 0 : bp < 0.8 ? 1 : 2;
    const want = fr < 0 ? handMesh.userData.baseGeo : extrudeGeo(BOW_FRAMES[fr]); if (handMesh.geometry !== want) handMesh.geometry = want;
    const k = S.bowPose, tr = bp >= 1 ? 0.006 : 0;
    handGroup.position.x += -0.2 * k + (Math.random() - 0.5) * tr;
    handGroup.position.y += 0.2 * k + (Math.random() - 0.5) * tr + S.bowKick * 0.03;
    handGroup.position.z += -0.18 * k + bp * 0.06 + S.bowKick * 0.08;
    const sc = 1.15; const DR = [0.05, 1.85, -0.785]; handMesh.rotation.set(BOW_ROT[0] + (DR[0] - BOW_ROT[0]) * k, BOW_ROT[1] + (DR[1] - BOW_ROT[1]) * k, BOW_ROT[2] + (DR[2] - BOW_ROT[2]) * k); handMesh.scale.set(sc, sc, sc);
  }
  // shield pose (either hand) and offhand item
  S.blockPose = (S.blockPose || 0) + ((player.blocking ? 1 : 0) - (S.blockPose || 0)) * Math.min(1, dt * 14); S.shieldHit = Math.max(0, (S.shieldHit || 0) - dt * 4);
  const bk = S.blockPose, hit = Math.sin(S.shieldHit * Math.PI) * 0.06;
  const oh = player.inv[36]; const oid = oh ? oh.id : 0;
  if (oid !== offId) { if (offMesh) offGroup.remove(offMesh); offId = oid; offMesh = oid ? heldMeshFor(oid) : null; if (offMesh) { if (offMesh.isMesh && !isCubeItem(oid)) offMesh.rotation.set(HELD_ROT[0], -HELD_ROT[1], -HELD_ROT[2]); offGroup.add(offMesh); } }
  const mainShield = id === IT.shield, offBlocks = !mainShield && oid === IT.shield;
  const ob = offBlocks ? bk : 0;
  offGroup.position.set(-0.52 + 0.2 * ob - Math.cos(S.bob) * 0.008 * bob / 4, -0.46 + 0.16 * ob + Math.abs(Math.sin(S.bob)) * 0.015 * bob / 4 + hit, -0.72 - 0.02 * ob + hit);
  offGroup.rotation.set(-0.05 + S.lagY * 0.5, (oid === IT.shield ? 0.55 - 0.45 * ob : 0) + S.lagX * 0.5, (oid === IT.shield ? 0.06 : 0));
  if (mainShield) { handGroup.position.x += -0.2 * bk; handGroup.position.y += 0.16 * bk + hit; handGroup.position.z += -0.02 * bk + hit; handGroup.rotation.y += -0.5 + 0.45 * bk; }
  const b = clamp(light, 0.15, 1); handScene.children[0].intensity = 0.85 * b; hdl.intensity = 0.4 * b;
}

// ---- sky ----
const C_DAY = new THREE.Color(0.5, 0.74, 1.0), C_NIGHT = new THREE.Color(0.012, 0.018, 0.05), C_SET = new THREE.Color(0.98, 0.52, 0.3), C_WATER = new THREE.Color(0.06, 0.17, 0.45), C_LAVA = new THREE.Color(0.8, 0.3, 0.05);
const C_NETHER = new THREE.Color(0.24, 0.05, 0.04), C_END = new THREE.Color(0.09, 0.05, 0.13);
function updateSky(eyeFluid) {
  const ang = S.time * Math.PI * 2; const se = Math.sin(ang);
  const R = S.renderDist * 16; let fogFar = R - 4, fogNear = fogFar * 0.62; let sky, ss = 0, day = 1;
  if (world.dim === 'overworld') {
    day = smoothstep(-0.2, 0.25, se); G.daylight = 0.2 + day * 0.8;
    sky = C_NIGHT.clone().lerp(C_DAY, day); ss = Math.max(0, 1 - Math.abs(se) / 0.28); sky.lerp(C_SET, ss * 0.55);
    chunkUniforms.skyTint.value.setRGB(1, 1, 1).lerp(new THREE.Color(1, 0.82, 0.7), ss * 0.6).lerp(new THREE.Color(0.7, 0.78, 1.0), 1 - day);
  } else if (world.dim === 'nether') {
    G.daylight = 0.56; sky = C_NETHER.clone(); fogFar = Math.min(fogFar, 72); fogNear = 12; chunkUniforms.skyTint.value.setRGB(1, 0.78, 0.66);
  } else { G.daylight = 0.8; sky = C_END.clone(); fogNear = fogFar * 0.5; chunkUniforms.skyTint.value.setRGB(0.88, 0.8, 1.0); }
  const ep = camera.position; const eyeSky = world.dim === 'overworld' ? world.skyAt(Math.floor(ep.x), Math.floor(ep.y), Math.floor(ep.z)) : 1;
  let fogC = gfxSkyColors(world.dim, day, ss, eyeFluid, eyeSky).clone(), fn = fogNear, ff = fogFar;
  if (world.dim === 'overworld' && eyeSky < 0.6) { fn *= 0.55 + 0.45 * eyeSky / 0.6; }
  if (eyeFluid === B.WATER) { fogC = C_WATER.clone().multiplyScalar(0.4 + G.daylight * 0.6); fn = 1; ff = 20; }
  if (eyeFluid === B.LAVA) { fogC = C_LAVA.clone(); fn = 0.2; ff = 3; }
  skyDome.visible = !eyeFluid; if (eyeFluid) skyUniforms.horizon.value.copy(fogC);
  scene.fog.color.copy(fogC); scene.fog.near = fn; scene.fog.far = ff;
  chunkUniforms.fogColor.value.copy(fogC); chunkUniforms.fogNear.value = fn; chunkUniforms.fogFar.value = ff; chunkUniforms.daylight.value = G.daylight;
  const ow = world.dim === 'overworld';
  skyG.position.copy(camera.position);
  sunMesh.position.set(Math.cos(ang) * 300, Math.sin(ang) * 300, 40); sunMesh.lookAt(camera.position);
  moonMesh.position.set(-Math.cos(ang) * 300, -Math.sin(ang) * 300, -40); moonMesh.lookAt(camera.position);
  sunMesh.visible = moonMesh.visible = ow && !eyeFluid;
  starMat.opacity = world.dim === 'end' ? 0.5 : clamp(1 - day * 1.6, 0, 1); stars.visible = (ow || world.dim === 'end') && starMat.opacity > 0.01 && !eyeFluid; stars.rotation.z = ow ? ang : 0;
  clouds.visible = ow;
  const CR = Math.max(180, R * 1.6); clouds.scale.set(CR * 2, CR * 2, 1); clouds.position.set(camera.position.x, 112, camera.position.z);
  cloudMat.uniforms.radius.value = CR; cloudMat.uniforms.camPos.value.copy(camera.position); cloudMat.uniforms.offset.value = performance.now() / 1000 * 1.2;
  cloudMat.uniforms.color.value.setRGB(1, 1, 1).multiplyScalar(0.25 + G.daylight * 0.75).lerp(C_SET, ss * 0.3);
  itemBlockMat.color.setScalar(clamp(G.daylight + 0.15, 0.3, 1));
  hemiL.color.setRGB(1, 1, 1); if (world.dim === 'nether') hemiL.color.setRGB(1, 0.8, 0.7);
  gfxFrame(1 / 60, ang, se, day);
}

// ---- menus ----
let pendingMode = 'survival';
function segSetup(id, onPick) { const el = $(id); for (const b of el.children) b.addEventListener('click', () => { for (const x of el.children) x.classList.toggle('on', x === b); onPick(b.dataset.m); }); }
segSetup('modeSeg', (m) => pendingMode = m);
segSetup('modeSeg2', (m) => setMode(m));
segSetup('cheatSeg', (m) => { S.cheats = m === 'on'; });
function setMode(m) {
  S.mode = m; G.mode = m; if (m !== 'creative') player.flying = false; updateHearts();
  for (const x of $('modeSeg2').children) x.classList.toggle('on', x.dataset.m === m);
  toast(m === 'creative' ? 'Creative mode: fly with F or double-tap Space' : 'Survival mode', 2);
}
function hasSave() { return typeof Saves !== 'undefined' && Saves.metas.size > 0; }
function refreshMenu() { if (typeof Saves !== 'undefined' && !$('worlds').classList.contains('hidden')) renderWorlds(); }
$('btnNew').addEventListener('click', () => { Sfx.init(); let s = $('seedInput').value.trim(); let seed; if (!s) seed = (Math.random() * 2147483647) | 0; else if (/^-?\d+$/.test(s)) seed = parseInt(s) | 0; else { seed = 0; for (const ch of s) seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) | 0; } startWorld({ seed, mode: pendingMode }); });
function openPause() { if (!S.started || S.paused) return; S.paused = true; if (typeof renderMpPanel === 'function') renderMpPanel(); mouseL = mouseR = false; releaseLock(); $('rdRange').value = S.renderDist; $('rdVal').textContent = S.renderDist; $('fovRange').value = S.fov; $('fovVal').textContent = fovLabel(S.fov); $('simRange').value = S.simDist; $('simVal').textContent = S.simDist; $('sensRange').value = S.sens; for (const x of $('modeSeg2').children) x.classList.toggle('on', x.dataset.m === S.mode); show('pause', true); show('clickplay', false); }
function closePause() { S.paused = false; show('pause', false); saveSettings(); requestLock(); }
$('btnResume').addEventListener('click', closePause);
$('rdRange').addEventListener('input', (e) => { S.renderDist = +e.target.value; $('rdVal').textContent = S.renderDist; if (world) world.lastCenter = null; });
$('sensRange').addEventListener('input', (e) => { S.sens = +e.target.value; });
function fovLabel(v) { return v == 70 ? 'Normal' : v >= 110 ? 'Quake Pro' : v; }
$('fovRange').addEventListener('input', (e) => { S.fov = +e.target.value; $('fovVal').textContent = fovLabel(S.fov); });
$('simRange').addEventListener('input', (e) => { S.simDist = +e.target.value; $('simVal').textContent = S.simDist; });
$('btnSave').addEventListener('click', () => saveGame(true));
$('btnQuit').addEventListener('click', () => { saveGame(false); quitToTitle(); });
$('btnRespawn').addEventListener('click', () => {
  player.dead = false; player.health = 20; player.vel.set(0, 0, 0); player.peak = null; updateHearts(); show('death', false);
  S.sleeping = null; const bs = bedSpawnPos(); if (world.dim !== 'overworld') travelTo('overworld', bs ? { type: 'bed', x: Math.floor(bs.x), z: Math.floor(bs.z), pos: bs } : { type: 'spawn' }); else { player.pos.copy(bs || player.spawn); world.lastCenter = null; requestLock(); }
});
function saveSettings() { try { localStorage.setItem('blockwild_settings', JSON.stringify({ rd: S.renderDist, sens: S.sens, fov: S.fov, sim: S.simDist, gfx: (typeof GFX !== 'undefined' ? GFX.quality : undefined) })); } catch (e) { } }

// ---- save / load ----
function packWorld(w) { const edits = {}; for (const [k, m] of w.edits) edits[k] = [...m]; const chests = {}; for (const [k, v] of w.chestInv) chests[k] = v; const furn = {}; for (const [k, v] of w.furnaces) furn[k] = v; return { edits, chests, furn }; }
// saves record which block/item key each id meant, so adding or removing mods (or new game versions) never scrambles a world
function saveKeys() { const i = {}; for (const id of ITEM_IDS) if (id >= ITEM_BASE) i[id] = ITEMS[id].key; return { b: BL.map(d => d.key), i, ib: ITEM_BASE }; }
function makeRemap(data) {
  const keys = data.keys; const bmap = [], imap = {};
  if (keys) { keys.b.forEach((k, id) => { const n = B[String(k).toUpperCase()]; bmap[id] = n === undefined ? 0 : n; }); for (const id in keys.i) { const n = IT[keys.i[id]]; if (n !== undefined) imap[id] = n; } }
  else { for (let id = 0; id < 100; id++) bmap[id] = id < BL.length ? id : 0; LEGACY_ITEMS.forEach((k, i) => imap[100 + i] = IT[k]); }
  const block = (id) => bmap[id] !== undefined ? bmap[id] : 0;
  const ib = (keys && keys.ib) || 256; const item = (id) => id < ib && !(keys === undefined && id >= 100) ? (block(id) || null) : (imap[id] !== undefined ? imap[id] : null);
  return { block, item };
}
let REMAP = { block: (id) => id, item: (id) => id };
function unpackWorld(w, d) { if (!d) return; for (const k in (d.edits || {})) w.edits.set(Number(k), new Map(d.edits[k].map(([i, id]) => [i, REMAP.block(id)]))); const fix = (s) => { if (!s) return null; const id = REMAP.item(s.id); return id && ITEMS[id] ? Object.assign({ id, count: s.count }, xtra(s)) : null; }; for (const k in (d.chests || {})) w.chestInv.set(k, d.chests[k].map(fix)); for (const k in (d.furn || {})) { const f = d.furn[k]; w.furnaces.set(k, { s: f.s.map(fix), burn: f.burn || 0, burnMax: f.burnMax || 0, cook: f.cook || 0 }); } }
function saveGame(notify) {
  if (!world || S.loading) return;
  if (MP.role === 'client') { MP.sendState(); if (notify) toast('Your progress is saved by the host', 2); return; }
  try {
    const worlds = {}; for (const k in Dim.worlds) worlds[k] = packWorld(Dim.worlds[k]);
    const dragon = G.mobs.find(m => m.type === 'dragon'); if (dragon) S.dragonHp = Math.max(1, Math.round(dragon.hp));
    const data = { v: 4, keys: saveKeys(), seed: world.seed, mode: S.mode, time: S.time, day: S.day, dim: S.dim, dragonDead: S.dragonDead, crystalsGone: S.crystalsGone, dragonHp: S.dragonHp, player: { pos: player.pos.toArray(), yaw: player.yaw, pitch: player.pitch, health: player.health, food: player.food, sat: player.sat, exh: player.exh, absorb: player.absorb, spawn: player.spawn.toArray(), inv: player.inv, sel: player.sel, xp: [XP.level, XP.points], effects: player.effects }, rules: S.rules, difficulty: S.difficulty, cheats: S.cheats, bed: S.bed || null, spawnPoint: player.spawnPoint ? player.spawnPoint.toArray() : null, mpPlayers: MP.saved, boats: boatList(), worlds };
    Saves.store(data, notify);
  } catch (e) { console.warn(e); if (notify) toast('Could not save the world', 3); }
}
function clearEntities() {
  for (const m of G.mobs) m.remove(); for (const i of G.items) i.remove(); for (const p of G.projectiles) scene.remove(p.mesh); for (const t of G.tnts) scene.remove(t.mesh); for (const e of G.eyes) scene.remove(e.mesh);
  G.mobs = []; G.items = []; G.projectiles = []; G.tnts = []; G.clouds = []; G.eyes = []; fluidQueue.length = 0; show('bossbar', false);
}
function quitToTitle() {
  if (typeof MP !== 'undefined' && MP.active) mpShutdown();
  S.started = false; S.paused = false; show('pause', false); show('hud', false); show('crosshair', false); show('info', false); show('touch', false); show('death', false); show('inv', false); show('water', false); show('lavafx', false); $('portalfx').style.opacity = 0;
  clearEntities(); clearBoats();
  if (world) for (const c of [...world.chunks.values()]) world.unload(c); world = null; G.world = null; Dim.worlds = {};
  selBox.visible = false; crackMesh.visible = false; releaseLock(); refreshMenu(); show('menu', true);
}
function findSpawn(gen) { for (let r = 0; r < 4000; r += 24) for (let a = 0; a < 12; a++) { const x = Math.round(Math.cos(a * 0.5236) * r), z = Math.round(Math.sin(a * 0.5236) * r); const c = gen.column(x, z); if (c.b !== BIO.OCEAN && c.b !== BIO.BEACH && c.b !== BIO.MOUNTAINS && c.h > SEA + 1) return [x, z]; } return [0, 0]; }
// Worlds saved before the Minecraft-height update (v3 and older) had sea level at y 32 in a 96-block world. Their
// Overworld builds, chests, beds, boats and players move up 95 blocks so they keep the same height above sea level
// (the terrain around them is generated with the new heights). Nether and End coordinates are unchanged.
function migrateOldHeights(data) {
  if (!data || (data.v || 0) >= 4 || data.migrated) return; data.migrated = true; const DY = SEA - 32;
  const ow = data.worlds && data.worlds.overworld;
  if (ow) {
    for (const k in (ow.edits || {})) ow.edits[k] = ow.edits[k].map(([i, id]) => [i + DY * 256, id]).filter(([i]) => i < 256 * WH);
    const shiftKeys = (o) => { if (!o) return o; const n = {}; for (const k in o) { const [x, y, z] = k.split(',').map(Number); n[x + ',' + (y + DY) + ',' + z] = o[k]; } return n; };
    ow.chests = shiftKeys(ow.chests); ow.furn = shiftKeys(ow.furn);
  }
  const up = (a) => { if (Array.isArray(a) && a.length >= 3) a[1] += DY; };
  if (data.player) { if ((data.dim || 'overworld') === 'overworld') up(data.player.pos); up(data.player.spawn); }
  up(data.bed); up(data.spawnPoint);
  for (const b of data.boats || []) if ((b.dim || 'overworld') === 'overworld') b.y += DY;
  for (const k in (data.mpPlayers || {})) { const m = data.mpPlayers[k]; if ((m.dim || 'overworld') === 'overworld') up(m.pos); up(m.bed); }
}
function startWorld(data) {
  show('menu', false); show('loading', true); $('loadBar').style.width = '0%'; $('loadTxt').textContent = 'Generating world...';
  S.seed = data.seed | 0; Dim.worlds = {}; clearEntities();
  S.mode = data.mode || 'survival'; G.mode = S.mode; S.time = data.time != null ? data.time : 0.02; S.day = data.day || 1;
  S.dragonDead = !!data.dragonDead; S.crystalsGone = data.crystalsGone || []; S.dragonHp = data.dragonHp || 200;
  const dim = data.dim || 'overworld';
  const wd = data.worlds || (data.edits ? { overworld: { edits: data.edits, chests: data.chests } } : {});
  migrateOldHeights(data);
  REMAP = makeRemap(data); Object.assign(S.rules, data.rules || {}); S.difficulty = data.difficulty || 'normal'; S.bed = data.bed || null; S.sleeping = null; if (MP.role !== 'client') MP.saved = data.mpPlayers || {}; S.cheats = data.cheats != null ? !!data.cheats : (data.mode === 'creative'); for (const x of $('cheatSeg').children) x.classList.toggle('on', (x.dataset.m === 'on') === S.cheats); setLevel(0, 0); player.effects = {}; clearOrbs(); $('chatLog').innerHTML = '';
  for (const k in wd) unpackWorld(Dim.get(k), wd[k]);
  clearBoats(); loadBoats(data.boats);
  world = Dim.get(dim); G.world = world; S.dim = dim;
  player.inv = new Array(41).fill(null); player.dead = false; player.flying = false; player.vel.set(0, 0, 0); player.peak = null;
  for (let i = 0; i < 9; i++) craftGrid[i] = null;
  S.arrival = null; S.portalLock = true;
  if (data.player) {
    const p = data.player; player.pos.fromArray(p.pos); player.yaw = p.yaw || 0; player.pitch = p.pitch || 0; player.health = p.health || 20; player.spawn.fromArray(p.spawn || p.pos); player.sel = p.sel || 0;
    (p.inv || []).forEach((s, i) => { const id = s && REMAP.item(s.id); if (id && ITEMS[id]) player.inv[i] = Object.assign({ id, count: s.count }, xtra(s)); });
    setLevel(p.xp ? p.xp[0] : 0, p.xp ? p.xp[1] : 0); player.effects = p.effects || {};
    S.newWorld = false;
  } else {
    const [sx, sz] = findSpawn(world.gen); player.pos.set(sx + 0.5, SEA + 60, sz + 0.5); player.health = 20; player.yaw = Math.PI * 0.75; player.pitch = -0.1; player.sel = 0; S.newWorld = true; S.firstStart = true;
    if (S.mode === 'creative') ['grass', 'stone', 'planks', 'glass', 'brick', 'log', 'torch', 'tnt', 'glowstone'].forEach((k, i) => player.inv[i] = { id: IT[k], count: stackMax(IT[k]) });
  }
  S.loading = true; S.started = true; S.paused = false; updateHearts(); invDirty();
  if (S.touch) setupTouchOnce(); else requestLockSoon();
}
let touchReady = false; function setupTouchOnce() { if (!touchReady) { setupTouch(); touchReady = true; } else show('touch', true); }
function requestLockSoon() { if (!S.fallback) try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }
function finishLoading() {
  S.loading = false; show('loading', false); show('hud', true); show('crosshair', true); show('info', true);
  if (handleArrival()) { }
  else if (S.newWorld) { let x = Math.floor(player.pos.x), z = Math.floor(player.pos.z);
    search: for (let r = 0; r < 20; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) { if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue; const sx = x + dx, sz = z + dz; const sy = world.surfaceY(sx, sz); const below = world.get(sx, sy - 1, sz); if (sy >= world.gen.column(sx, sz).h && (below === B.GRASS || below === B.SNOWY_GRASS || below === B.SAND || below === B.DIRT)) { x = sx; z = sz; break search; } }
    player.pos.x = x + 0.5; player.pos.z = z + 0.5; player.pos.y = world.surfaceY(x, z) + 0.01;
    player.spawn.copy(player.pos); S.newWorld = false; toast(isSurv() ? 'Punch a tree to get started!' : 'Creative mode - press E for all items', 4); }
  else { const x = Math.floor(player.pos.x), z = Math.floor(player.pos.z); if (world.solid(x, Math.floor(player.pos.y), z) || world.solid(x, Math.floor(player.pos.y + 1), z)) player.pos.y = world.surfaceY(x, z) + 0.01; if (world.dim === 'end') EndFight.enter(); }
  updateHearts(); selectSlot(player.sel);
  if (MODS.hooks.worldStart) modFire('worldStart', { newWorld: !!S.firstStart, dimension: world.dim }); S.firstStart = false;
  if (!S.touch && !S.locked && !S.fallback) show('clickplay', true);
}

// ---- main loop ----
let last = performance.now(), fpsAcc = 0, fpsN = 0, fps = 0, hudT = 0, errShown = false;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  try { tick(dt); } catch (e) { console.error(e); if (!errShown) { errShown = true; toast('Error: ' + e.message, 8); } }
}
// the Nether's thick fog hides everything past ~5 chunks, so don't load or draw further there
function effRD() { return world && world.dim === 'nether' ? Math.min(S.renderDist, 5) : S.renderDist; }
function tick(dt) {
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').style.opacity = 0; }
  if (nameT > 0) { nameT -= dt; if (nameT <= 0) $('itemname').style.opacity = 0; }
  if (!S.started || !world) { renderer.setClearColor(0x000000); renderer.clear(); return; }
  const P = player;
  world.update(P.pos.x, P.pos.z, effRD(), (S.loading || S.boost) ? 40 : 8); S.boostT = (S.boostT || 0) - dt; if (S.boostT <= 0) { S.boostT = 0.5; S.boost = world.meshedAround(P.pos.x, P.pos.z, 1) < 1; }
  if (S.loading) {
    const p = world.meshedAround(P.pos.x, P.pos.z, Math.min(2, S.renderDist)); $('loadBar').style.width = Math.round(p * 100) + '%';
    if (p >= 1) finishLoading();
  }
  const running = !S.loading && (!S.paused || (typeof MP !== 'undefined' && MP.active)); // multiplayer worlds keep running behind the pause menu
  if (running) {
    if (S.rules.doDaylightCycle) { S.time += dt / DAYLEN; if (S.time >= 1) { S.time -= 1; S.day++; } }
    const night = world.dim === 'overworld' && G.daylight < 0.3; if (night && !S.wasNight && isSurv()) toast('Night falls... monsters roam the land', 3); S.wasNight = night;
    if (!S.paused) { updatePlayer(dt); if (world) updateInteraction(dt); }
    if (MODS.hooks.tick) modFire('tick', dt);
    updateEffects(dt); updateOrbs(dt); randomTicks(dt); updateSleep(dt);
  }
  if (running && !S.loading) {
    const pp = P.pos;
    for (const m of G.mobs) { if (m.isBoss) { m.update(dt); continue; } if (m.remote) { remoteMobUpdate(m, dt); continue; } const d2 = (m.pos.x - pp.x) ** 2 + (m.pos.z - pp.z) ** 2; if (!world.loaded(Math.floor(m.pos.x), Math.floor(m.pos.z)) || (m.t.kind !== 'passive' && !m.tamed && !m.t.persist && d2 > Math.max(80, S.simDist * 16 + 16) ** 2)) { if (typeof stashMob === 'function') stashMob(m); m.gone = true; continue; } const sd = S.simDist * 16; if (d2 < sd * sd) hostMobUpdate(m, dt); }
    G.mobs = G.mobs.filter(m => { if (m.gone) m.remove(); return !m.gone; });
    for (const it of G.items) if (!it.gone) it.update(dt);
    updateProjectiles(dt); updateBoats(dt); updateTNT(dt); updateWater(dt); updateSpawning(dt); updateClouds(dt); updateEyes(dt); updateFurnaces(dt); EndFight.update(dt);
    S.saveT += dt; if (S.saveT > 30) { S.saveT = 0; saveGame(false); }
  }
  if (typeof mpTick === 'function') mpTick(dt);
  Particles.update(dt); animateTiles(dt, atlasTex); chunkUniforms.time.value = performance.now() / 1000;
  const eye = P.eye(); camera.position.copy(eye);
  { const bk = P.onGround && !P.flying ? Math.min(1, Math.hypot(P.vel.x, P.vel.z) / 4.3) : 0; S.vb = (S.vb || 0) + (bk - (S.vb || 0)) * Math.min(1, dt * 8); const ph = S.bob || 0;
    const fx = Math.cos(P.yaw), fz = -Math.sin(P.yaw); camera.position.x += fx * Math.sin(ph) * 0.035 * S.vb; camera.position.z += fz * Math.sin(ph) * 0.035 * S.vb; camera.position.y += -Math.abs(Math.cos(ph)) * 0.06 * S.vb; }
  if (G.shake > 0) { camera.position.x += (Math.random() - 0.5) * G.shake * 0.3; camera.position.y += (Math.random() - 0.5) * G.shake * 0.3; G.shake = Math.max(0, G.shake - dt * 1.5); }
  camera.rotation.set(P.pitch, P.yaw, Math.sin(S.bob || 0) * 0.006 * (S.vb || 0));
  applyPov(P, dt);
  updateCaveCulling(world, camera.position);
  const sprinting = Math.hypot(P.vel.x, P.vel.z) > 5 && S.bowDraw < 0; const tf = (S.fov + (sprinting ? 8 : 0)) * (1 - 0.16 * bowPower()); if (Math.abs(camera.fov - tf) > 0.05) { camera.fov += (tf - camera.fov) * Math.min(1, dt * 10); camera.updateProjectionMatrix(); handCam.fov = camera.fov; handCam.updateProjectionMatrix(); }
  const eb = world.get(Math.floor(eye.x), Math.floor(eye.y + 0.05), Math.floor(eye.z)); const eyeFluid = FKIND[eb] === 1 ? B.WATER : FKIND[eb] === 2 ? B.LAVA : 0;
  show('water', eyeFluid === B.WATER && !S.loading);
  updateSky(eyeFluid); if (!S.loading && !S.paused) updateAir(dt, eyeFluid);
  G.minLight = Math.max(MODS.graphics.minLight, effLevel('night_vision') ? 0.85 : 0); chunkUniforms.minLight.value = G.minLight;
  const light = Math.max(G.minLight, world.lightAt(eye.x, eye.y, eye.z, G.daylight));
  updateHand(dt, light);
  if (_invDirty) { _invDirty = false; renderHotbar(); renderArmorBar(); if (S.uiOpen && S.uiOpen !== 'chat') renderInvUI(); }
  hudT -= dt;
  if (hudT <= 0) {
    hudT = 0.25;
    const hrs = (S.time * 24 + 6) % 24; const hh = Math.floor(hrs), mm = Math.floor((hrs - hh) * 60 / 10) * 10;
    const bname = world.gen.biomeName(Math.floor(P.pos.x), Math.floor(P.pos.z));
    $('info').innerHTML = (world.dim === 'overworld' ? 'Day ' + S.day + ' · ' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') : world.dim === 'nether' ? 'The Nether' : 'The End') + '<br><span style="color:#cfe8b0">' + bname + '</span>' + (S.mode === 'creative' ? '<br><span style="color:#ffd27a">Creative</span>' : '') + (S.rules.showCoordinates ? '<br>XYZ ' + P.pos.x.toFixed(0) + ' ' + (P.pos.y - world.yOff).toFixed(0) + ' ' + P.pos.z.toFixed(0) : '');
    if (S.debug) $('debug').textContent = 'Blockwild  ' + fps + ' fps\nXYZ ' + P.pos.x.toFixed(1) + ' / ' + (P.pos.y - world.yOff).toFixed(1) + ' / ' + P.pos.z.toFixed(1) + '  (' + world.dim + ')\nChunk ' + (Math.floor(P.pos.x) >> 4) + ', ' + (Math.floor(P.pos.z) >> 4) + '   loaded ' + world.chunks.size + '\nBiome ' + bname + '  seed ' + world.seed + '\nMobs ' + G.mobs.length + '  items ' + G.items.length + '  particles ' + Particles.n + '\nLight ' + light.toFixed(2) + '  daylight ' + G.daylight.toFixed(2) + '\nDraw calls ' + renderer.info.render.calls + '  tris ' + renderer.info.render.triangles + (target ? '\nLooking at ' + BL[target.id].name + ' ' + target.x + ',' + (target.y - world.yOff) + ',' + target.z : '');
  }
  renderFrame(); updateModHuds(dt);
  if (!P.dead && !S.pov) { renderer.clearDepth(); renderer.render(handScene, handCam); }
}
requestAnimationFrame(frame);
addEventListener('beforeunload', () => { if (S.started && !S.loading) saveGame(false); });
document.addEventListener('visibilitychange', () => { if (document.hidden && S.started && !S.loading) saveGame(false); });
window.__game = { input(l, r) { mouseL = l; mouseR = r; }, keys, primeTNT, structuresFor, findStruct(kind, R = 60) { const p = player.pos; const pcx = Math.floor(p.x / 16), pcz = Math.floor(p.z / 16); let best = null, bd = 1e9; for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) { const st = structuresFor(world, pcx + dx, pcz + dz); for (const k of st.kinds) if (k[0] === kind) { const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = k; } } } return best; },
  S, G, player, get world() { return world; }, spawnMob, explode, addItem, IT, B, BL, openInv, openUI, closeInv, setMode, saveGame, raycast, lookDir, tick, travelTo, slotClick, takeOutput, craftGrid, useAction: () => useAction(player.eye(), lookDir()) };

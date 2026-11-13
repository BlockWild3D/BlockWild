// ================= ARMOUR, CAMERA VIEWS (F5), YOUR OWN PLAYER MODEL =================
function armorPieces(inv) { const out = []; for (let i = 37; i <= 40; i++) { const s = inv && inv[i]; if (s && ITEMS[s.id] && ITEMS[s.id].kind === 'armor') out.push(s); } return out; }
function armorPoints() { return armorPieces(player.inv).reduce((a, s) => a + ITEMS[s.id].def, 0); }
// Minecraft: damage * (1 - min(20, max(def/5, def - 4*dmg/(toughness+8))) / 25), then Protection enchantments
function armorReduce(dmg, cause) {
  if (cause === 'fall damage' || cause === 'the void' || cause === 'magic') { if (cause === 'fall damage') { const ff = enchOf(player.inv[40], 'feather_falling'); if (ff) dmg *= Math.max(0.2, 1 - 0.12 * ff); } return dmg; }
  const ps = armorPieces(player.inv); let def = 0, tough = 0, epf = 0;
  for (const s of ps) { const it = ITEMS[s.id]; def += it.def; tough += it.tough; epf += enchOf(s, 'protection'); if (cause === 'lava' || cause === 'a magma block' || cause === 'fire') epf += 2 * enchOf(s, 'fire_protection'); }
  const red = Math.min(20, Math.max(def / 5, def - 4 * dmg / (tough + 8))) / 25;
  if (ps.length && dmg > 0 && S.mode === 'survival') for (let i = 37; i <= 40; i++) if (player.inv[i]) damageSlot(i, Math.max(1, Math.floor(dmg / 4)));
  return dmg * (1 - red) * (1 - Math.min(20, epf) * 0.04);
}
const ARMOR_ICON = (() => { const mk = (fill) => { const c = document.createElement('canvas'); c.width = c.height = 9; const x = c.getContext('2d'); const rows = ['.XXX.XXX.', 'XHHHXHHHX', 'XHHHHHHHX', 'XHHHHHHHX', '.XHHHHHX.', '.XHHHHHX.', '.XHHHHHX.', '..XXXXX..'];
  rows.forEach((r, y) => [...r].forEach((ch, i) => { if (ch === '.') return; const half = fill === 1 && i > 4; x.fillStyle = ch === 'X' ? '#1a1a1a' : (fill === 0 || half) ? '#4a4a4a' : (y < 2 ? '#f0f0f0' : '#c8c8c8'); x.fillRect(i, y, 1, 1); })); return c.toDataURL(); }; return [mk(0), mk(1), mk(2)]; })();
const armorImgs = []; for (let i = 0; i < 10; i++) { const im = document.createElement('img'); $('armorRow').appendChild(im); armorImgs.push(im); }
function renderArmorBar() { const a = armorPoints(); const vis = S.mode === 'survival' && a > 0; $('armorRow').style.visibility = vis ? 'visible' : 'hidden'; if (!vis) return; for (let i = 0; i < 10; i++) { const v = a - i * 2; armorImgs[i].src = ARMOR_ICON[v >= 2 ? 2 : v === 1 ? 1 : 0]; } }
// armour enchantments
Object.assign(ENCH, { protection: { name: 'Protection', max: 4, for: 'armor', excl: 'prot', w: 10 }, fire_protection: { name: 'Fire Protection', max: 4, for: 'armor', excl: 'prot', w: 5 }, feather_falling: { name: 'Feather Falling', max: 4, for: 'armor', slot: 'feet', w: 5 } });
const _enchCat = enchCat; enchCat = function (id) { const it = ITEMS[id]; if (it && it.kind === 'armor') return 'armor'; return _enchCat(id); };
const _enchFits = enchantFits; enchantFits = function (id, en) { const E = ENCH[en]; if (E && E.slot && ITEMS[id].slot !== E.slot) return false; return _enchFits(id, en); };
const _enchab = enchantability; enchantability = function (id) { const it = ITEMS[id]; if (it && it.kind === 'armor') return { leather: 15, golden: 25, iron: 9, diamond: 10 }[it.mat] || 10; return _enchab(id); };

// ---- armour look on player models ----
const armorTex = {}; const HELMET_GAP = new THREE.MeshBasicMaterial({ visible: false });
function armorTexture(mat) {
  if (armorTex[mat]) return armorTex[mat]; const col = ARMOR_MATS.find(m => m[0] === mat)[4];
  const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'); const r = mulberry32(mat.length * 97);
  for (let y = 0; y < 16; y++) for (let i = 0; i < 16; i++) { const e = y === 0 || y === 15 || i === 0 || i === 15; const v = vary(e ? mixc(col, [0, 0, 0], 0.35) : (y < 3 ? mixc(col, [255, 255, 255], 0.25) : col), r, mat === 'leather' ? 10 : 6); x.fillStyle = 'rgb(' + v.map(q => clamp(q, 0, 255) | 0).join(',') + ')'; x.fillRect(i, y, 1, 1); }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return armorTex[mat] = new THREE.MeshLambertMaterial({ map: t });
}
function addArmorSlots(model) {
  const P = model.P; const mk = (parent, w, h, d, ox, oy, oz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w * PX, h * PX, d * PX)); m.position.set(ox * PX, oy * PX, oz * PX); m.visible = false; m.layers.enable(1); parent.add(m); return m; };
  model.armor = {
    head: [mk(P.head, 9.4, 9.4, 9.4, 0, 4, 0)],
    chest: [mk(P.torso, 9, 12.6, 5, 0, 6, 0), mk(P.armR, 5, 6, 5, 0, -1.5, 0), mk(P.armL, 5, 6, 5, 0, -1.5, 0)],
    legs: [mk(P.torso, 8.6, 3, 4.6, 0, 1.2, 0), mk(P.legR, 4.6, 8.4, 4.6, 0, -4, 0), mk(P.legL, 4.6, 8.4, 4.6, 0, -4, 0)],
    feet: [mk(P.legR, 4.9, 4.2, 4.9, 0, -10, 0), mk(P.legL, 4.9, 4.2, 4.9, 0, -10, 0)],
  };
  model.setArmor = (mats) => { for (const slot in model.armor) { const m = mats[slot]; for (const mesh of model.armor[slot]) { mesh.visible = !!m; if (m) { const am = armorTexture(m); mesh.material = slot === 'head' ? [am, am, am, am, HELMET_GAP, am] : am; } } } };
}
function armorMats(inv) { const out = {}; for (const slot in ARMOR_SLOT) { const s = inv && inv[ARMOR_SLOT[slot]]; out[slot] = s && ITEMS[s.id] && ITEMS[s.id].kind === 'armor' ? ITEMS[s.id].mat : null; } return out; }

// ---- camera views ----
S.pov = 0; // 0 first person, 1 behind, 2 in front
let myModel = null;
function ensureMyModel() {
  if (myModel && myModel.skin === SKIN_CANVAS) return;
  if (myModel) { scene.remove(myModel.root); myModel.dispose(); }
  if (!SKIN_CANVAS) return; myModel = makePlayerModel(SKIN_CANVAS, null); myModel.skin = SKIN_CANVAS; addArmorSlots(myModel); scene.add(myModel.root);
}
function cyclePov() { S.pov = (S.pov + 1) % 3; toast(['First person', 'Third person (back)', 'Third person (front)'][S.pov], 1); }
addEventListener('keydown', (e) => {
  if (e.code === 'F5' || (e.code === 'KeyV' && !e.repeat)) { if (!S.started || S.loading) return; if (e.code === 'F5') e.preventDefault(); if (S.uiOpen === 'chat' || (e.target && e.target.tagName === 'INPUT')) return; cyclePov(); }
});
const _camTmp = new V3();
function applyPov(P, dt) {
  const light = Math.max(G.minLight || 0, world.lightAt(P.pos.x, P.pos.y + 1, P.pos.z, G.daylight));
  ensureMyModel();
  const third = S.pov > 0 && !P.dead;
  if (myModel) {
    myModel.root.visible = third;
    if (third) {
      myModel.root.position.copy(P.pos); myModel.root.rotation.y = P.yaw + Math.PI;
      const sp = Math.hypot(P.vel.x, P.vel.z) * (P.onGround || P.flying ? 1 : 0.3); const h = P.held();
      myModel.setHeld(h ? h.id : 0); myModel.setArmor(armorMats(P.inv));
      myModel.animate(dt, sp, P.pitch, S.swing || 0, (keys.ShiftLeft || keys.ShiftRight) && !P.flying, performance.now() / 1000 - P.lastHurt < 0.3);
      swimPose(myModel, P, dt);
      const l = clamp(light, 0.08, 1); myModel.mat.color.multiplyScalar(l); myModel.omat.color.multiplyScalar(l);
    }
  }
  if (!third) return false;
  const eye = P.eye(); const d = lookDir(); const back = S.pov === 1 ? -1 : 1;
  const dir = d.clone().multiplyScalar(back); let dist = 4;
  for (let t = 0.2; t <= 4; t += 0.2) { const q = _camTmp.copy(eye).addScaledVector(dir, t); if (world.solid(Math.floor(q.x), Math.floor(q.y), Math.floor(q.z))) { dist = Math.max(0.2, t - 0.35); break; } }
  if (myModel) myModel.root.visible = dist > 0.9;
  camera.position.copy(eye).addScaledVector(dir, dist);
  if (S.pov === 1) camera.rotation.set(P.pitch, P.yaw, 0); else camera.rotation.set(-P.pitch, P.yaw + Math.PI, 0);
  return true;
}

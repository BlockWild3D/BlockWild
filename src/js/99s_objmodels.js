// ================= HAND-MADE MODELS FOR THINGS THAT AREN'T MOBS (baked into PAINT_BAKED.models) =================
// boats and chest boats (one Minecraft-shaped model, a skin per wood; bamboo gets the raft), arrows (plain, spectral,
// tipped), the breeze's wind charge and thrown tridents. Anything without a baked model keeps the old look.
function bbObject(key) { if (!BB_MODELS[key]) return null; const m = { mats: [], t: null }; const root = new THREE.Group(); buildBBModel(m, root, key); return { root, m, parts: m.bbParts }; }
// slip an extra joint inside a part so the game's own rotation lands on top of the model's resting angle
function bbJoint(part, rx) { const host = part.userData.inner; const g = new THREE.Group(); g.rotation.x = rx; while (host.children.length) g.add(host.children[0]); host.add(g); part.userData.inner = g; }

// ---------- boats ----------
function bbBoatKey(b) { const w = b.wood || 'oak', raft = w === 'bamboo'; return (b.chest ? (raft ? 'chest_raft' : 'chest_boat') : (raft ? 'raft' : 'boat')) + ':' + w; }
function bbDressBoat(b) {
  const key = bbBoatKey(b); if (b.bbKey === key || !BB_MODELS[key]) return false;
  const o = bbObject(key); if (!o) return false;
  while (b.mesh.children.length) b.mesh.remove(b.mesh.children[0]);
  b.mesh.add(o.root); b.mats = o.m.mats; b.bbKey = key;
  // the game swings oars by rotation.x around -0.6 when idle; this joint makes idle = the model's own paddle pose
  b.oars = ['paddle_left', 'paddle_right'].map(n => o.parts[n]).filter(Boolean); for (const p of b.oars) bbJoint(p, 0.6);
  if (b.chest) b.chestMesh = o.parts.chest_base || o.root;
  return true;
}
if (typeof makeBoat !== 'undefined') { const _mb = makeBoat; makeBoat = function () { const b = _mb.apply(this, arguments); try { bbDressBoat(b); } catch (e) { } return b; }; }
if (typeof dressBoat !== 'undefined') { const _db = dressBoat; dressBoat = function (b) {
  // the old dressing tints the boat's colours per wood; skins already carry their wood colour, so keep it off them
  const had = b.bbKey, mats = b.mats; if (had) b.mats = []; const r = _db.apply(this, arguments); if (had) b.mats = mats;
  try { bbDressBoat(b); } catch (e) { } return r; }; }

// ---------- projectiles ----------
// Blockbench models stand up or lie along x; projectiles fly along +z (the game points them with lookAt)
function bbProjModel(key) {
  const o = bbObject(key); if (!o) return null; const g = new THREE.Group(); g.add(o.root);
  if (key.startsWith('arrow')) { o.root.scale.setScalar(0.62); }
  else if (key === 'trident') { o.root.rotation.x = Math.PI / 2; o.root.position.z = -0.7; o.root.scale.setScalar(0.62); }
  else if (key === 'wind_charge') { o.root.position.y = -0.12; o.root.scale.setScalar(0.6); }
  g.userData.bbKey = key; return g;
}
if (typeof projMesh !== 'undefined') { const _pm = projMesh; projMesh = function (kind) {
  const key = kind === 'arrow' ? 'arrow' : kind === 'wind' ? 'wind_charge' : kind === 'trident' ? 'trident' : null;
  return (key && BB_MODELS[key] && bbProjModel(key)) || _pm(kind); }; }
// spectral and tipped arrows learn what they are after they're fired, so swap their look on the next frame
if (typeof updateProjectiles !== 'undefined') { const _up = updateProjectiles; updateProjectiles = function (dt) {
  for (const a of G.projectiles) if (a.kind === 'arrow' && !a.bbSkin && a.mesh) { a.bbSkin = true; const v = a.spectral ? 'arrow:spectral' : a.effect ? 'arrow:tipped' : null;
    if (v && BB_MODELS[v]) { const nm = bbProjModel(v); if (nm) { nm.position.copy(a.mesh.position); nm.quaternion.copy(a.mesh.quaternion); G.scene.remove(a.mesh); G.scene.add(nm); a.mesh = nm; } } }
  return _up.apply(this, arguments); }; }

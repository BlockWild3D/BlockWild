// ================= VARIANT MOBS ON THE OWNER'S SKINS =================
// Each variant is its own baked model 'mob:variant'. The game's old build still runs first, out of sight, because it
// rolls the variant and sets up gameplay bits (horse genes and saddles, collars, villager data); then the model is
// built on top and its skins follow the mob's state every frame (tame/angry wolves, cracked golems, cold striders...).
// Babies switch to Minecraft's baby models when they exist.
function bbBiomeAt(x, z) { try { if (world.dim !== 'overworld' || !world.gen) return null; return world.gen.column(Math.floor(x), Math.floor(z)).b; } catch (e) { return null; } }
const bbIn = (b, names) => b != null && names.some(n => BIO[n] === b);
// a variant index that sticks: a saved/synced one wins, else roll it (the game saves m.var with the mob)
function bbVarIdx(m, roll) { const o = m.opts || {}; const v = o.v != null ? o.v : o.rec && o.rec.v != null ? o.rec.v : o.netx && o.netx.v != null ? o.netx.v : roll(); m.var = v; return v; }
function bbTempIdx(m) { const b = bbBiomeAt(m.pos.x, m.pos.z); return bbIn(b, ['DESERT', 'BADLANDS', 'SAVANNA', 'JUNGLE', 'MANGROVE_SWAMP']) ? 1 : bbIn(b, ['SNOWY', 'TAIGA', 'MOUNTAINS']) ? 2 : 0; }
const bbWeighted = (w) => { let t = Math.random() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < w.length; i++) if ((t -= w[i]) < 0) return i; return 0; };
const BB_TINT = (rgb) => new THREE.Color(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);

function bbBuildVariant(m, r, vkey) {
  m.bbVarKey = vkey; const key = m.baby && BB_MODELS[vkey + ':baby'] ? vkey + ':baby' : vkey;
  m.head = m.legs = m.arms = m.wings = m.tail = undefined;
  buildBBModel(m, r, key); if (m.bbAfter) m.bbAfter(m);
}
// swap between the adult and baby model when a mob is born or grows up
function bbRebuild(m) {
  if (!m.bbVarKey || !m.bbHolder) return; const key = m.baby && BB_MODELS[m.bbVarKey + ':baby'] ? m.bbVarKey + ':baby' : m.bbVarKey;
  if (key === m.bbKey) return;
  const r = m.bbHolder.parent; r.remove(m.bbHolder); const old = new Set(m.bbMats); m.mats = m.mats.filter(e => !old.has(e[0]));
  bbBuildVariant(m, r, m.bbVarKey);
  if (m.bbKey.endsWith(':baby')) { m.baseScale = 1; m.body.scale.setScalar(1); if (m.head) m.head.scale.setScalar(1); }
}
if (typeof setBaby !== 'undefined') { const _sb = setBaby; setBaby = function (m, on) { const r = _sb.apply(this, arguments); try { bbRebuild(m); } catch (e) { } return r; }; }

// replace a mob's look: run the old build hidden, then build the model; keep(m) can name old parts to leave visible
function bbVariantMob(type, chooseKey, after, keep) {
  const t = MOBS[type]; if (!t) return; const orig = t.bbOrigBuild || t.build;
  t.build = function (m, r) {
    const tmp = new THREE.Group(); r.add(tmp); const n0 = m.mats.length;
    try { orig(m, tmp); } catch (e) { }
    const kept = keep ? keep(m).filter(Boolean) : [];
    if (kept.length) { const ok = new Set(); for (const k of kept) k.traverse(o => ok.add(o)); tmp.traverse(o => { if (o.isMesh && !ok.has(o)) o.visible = false; }); }
    else tmp.visible = false;
    m.mats.length = n0; m.bbAfter = after || null;
    const k = chooseKey(m); if (!BB_MODELS[k]) { tmp.visible = true; tmp.traverse(o => { if (o.isMesh) o.visible = true; }); return; }
    bbBuildVariant(m, r, k);
  };
}
// per-frame look updates hang off colorize (called for every mob every frame)
function bbOnFrame(type, fn) { const t = MOBS[type]; if (t) t.bbFrame = fn; }
{ const _c = Mob.prototype.colorize; Mob.prototype.colorize = function () { if (this.bbKey && this.t && this.t.bbFrame) { try { this.t.bbFrame(this); } catch (e) { } } return _c.apply(this, arguments); }; }
// the generic single-skin mobs can grow up too
for (const key in BB_MODELS) if (MOBS[key] && BB_MODELS[key + ':baby']) { const b = MOBS[key].build; MOBS[key].build = function (m, r) { b(m, r); m.bbVarKey = key; }; }

// the game repaints materials from their base colour every frame (hurt flash), so a tint goes into that base too
function bbTint(m, mat, color) { if (!mat) return; mat.color.copy(color); const e = m.mats.find(e => e[0] === mat); if (e) e[1] = color.clone(); }
const BB_COLLAR = BB_TINT([176, 46, 38]);
const bbCollar = (m) => { bbTint(m, m.bbLayer && m.bbLayer.collar, BB_COLLAR); m.collar = null; };

// babies take after a parent's variant
for (const k of ['cow', 'pig', 'chicken', 'wolf', 'panda', 'cat']) if (MOBS[k]) MOBS[k].variants = MOBS[k].variants || 1;
// ---- farm animals by biome temperature ----
for (const mob of ['cow', 'pig', 'chicken']) bbVariantMob(mob, (m) => mob + ':' + ['temperate', 'warm', 'cold'][bbVarIdx(m, () => bbTempIdx(m)) % 3]);
// mooshrooms: the cow model with the owner's mooshroom skin, plus mushrooms on the back and head
function bbMushrooms(m) {
  const tc = typeof tileCanvas === 'function' && TILE.red_mushroom != null ? tileCanvas(TILE.red_mushroom) : null; if (!tc || !m.bbHolder) return;
  const tex = new THREE.CanvasTexture(tc); tex.magFilter = tex.minFilter = THREE.NearestFilter;
  const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, transparent: false }); m.mats.push([mat, WHITE_C, false]); m.bbMats.push(mat);
  const geo = new THREE.PlaneGeometry(0.5, 0.5);
  const put = (parent, x, y, z) => { for (const a of [Math.PI / 4, -Math.PI / 4]) { const q = new THREE.Mesh(geo, mat); q.position.set(x, y + 0.25, z); q.rotation.y = a; parent.add(q); } };
  const P = m.bbParts || {}; const body = P.body; const bb = new THREE.Box3().setFromObject(m.bbHolder); const top = bb.max.y;
  put(m.bbHolder, 0.18, top - 0.32, 0.18); put(m.bbHolder, -0.18, top - 0.32, -0.25); put(m.bbHolder, 0, top - 0.32, -0.05);
  if (m.head) put(m.head.userData.inner || m.head, 0, 0.25, -0.05);
}
bbVariantMob('mooshroom', (m) => 'mooshroom:red', (m) => { if (!m.bbKey.endsWith(':baby')) bbMushrooms(m); });

// ---- sheep: wool coat comes off when sheared ----
bbVariantMob('sheep', () => 'sheep:white', (m) => { const w = m.bbLayer.wool; m.wool = w ? [w] : []; m.skinBody = null; if (w) w.visible = !m.sheared; });

// ---- wolves: coat by biome; tame and angry looks; red collar when tamed ----
const BB_WOLF = ['pale', 'ashen', 'black', 'chestnut', 'rusty', 'snowy', 'spotted', 'striped', 'woods'];
function bbWolfRoll(m) {
  const b = bbBiomeAt(m.pos.x, m.pos.z), pickOf = (a) => BB_WOLF.indexOf(a[Math.floor(Math.random() * a.length)]);
  if (bbIn(b, ['FOREST', 'DARK_FOREST', 'CHERRY_GROVE', 'PALE_GARDEN'])) return pickOf(['woods']); if (bbIn(b, ['TAIGA'])) return pickOf(['pale', 'pale', 'black', 'chestnut']);
  if (bbIn(b, ['SNOWY'])) return pickOf(['ashen', 'snowy']); if (bbIn(b, ['MOUNTAINS'])) return pickOf(['black', 'chestnut', 'snowy']);
  if (bbIn(b, ['JUNGLE'])) return pickOf(['rusty']); if (bbIn(b, ['SAVANNA'])) return pickOf(['spotted']); if (bbIn(b, ['BADLANDS'])) return pickOf(['striped']); return 0;
}
bbVariantMob('wolf', (m) => 'wolf:' + BB_WOLF[bbVarIdx(m, () => bbWolfRoll(m)) % BB_WOLF.length], bbCollar);
bbOnFrame('wolf', (m) => { bbSetSkin(m, null, m.angry > 0 ? 'angry' : m.tamed ? 'tame' : null); bbSetSkin(m, 'collar', !!m.tamed); });

// ---- cats: eleven coats (the game's seven plus calico, jellie, persian, ragdoll); collar when tamed ----
const BB_CAT = ['all_black', 'red', 'british_shorthair', 'white', 'tabby', 'black', 'siamese', 'calico', 'jellie', 'persian', 'ragdoll'];
{ const t = MOBS.cat; const orig = t.build;
  // a saved cat may carry one of the four new coats, which the old build doesn't know: let it see a coat it knows
  t.build = function (m, r) { const o = m.opts || {}; const saved = o.v != null ? o.v : o.rec && o.rec.v != null ? o.rec.v : o.netx && o.netx.v != null ? o.netx.v : null;
    const v = saved != null ? saved : Math.floor(Math.random() * BB_CAT.length); m.opts = Object.assign({}, o, { v: v % 7 }); try { orig(m, r); } finally { m.opts = o; } m.var = v; m.bbCatV = v; }; }
bbVariantMob('cat', (m) => 'cat:' + BB_CAT[(m.bbCatV != null ? m.bbCatV : m.var || 0) % BB_CAT.length], bbCollar);
bbOnFrame('cat', (m) => bbSetSkin(m, 'collar', !!m.tamed));
bbVariantMob('ocelot', () => 'ocelot');

// ---- coat animals whose variant the game already rolls (m.var) ----
const BB_SIMPLE = { fox: ['red', 'snow'], rabbit: ['brown', 'white', 'black', 'gold', 'salt'], llama: ['creamy', 'white', 'brown', 'gray'], trader_llama: ['creamy', 'white', 'brown', 'gray'],
  parrot: ['red_blue', 'blue', 'green', 'yellow_blue', 'grey'], frog: ['temperate', 'cold', 'warm'], axolotl: ['lucy', 'wild', 'gold', 'cyan', 'blue'] };
for (const [mob, list] of Object.entries(BB_SIMPLE)) bbVariantMob(mob, (m) => { const base = mob === 'trader_llama' ? 'llama' : mob; const v = m.var != null ? m.var : bbVarIdx(m, () => Math.floor(Math.random() * list.length)); return base + ':' + list[v % list.length]; });
// a rabbit named Toast gets the Toast skin
bbOnFrame('rabbit', (m) => { if (m.nameTag === 'Toast' || m.customName === 'Toast') { if (m.bbVarKey !== 'rabbit:toast') { m.bbVarKey = 'rabbit:toast'; m.bbKey = null; bbRebuildForce(m); } } });
function bbRebuildForce(m) { const r = m.bbHolder && m.bbHolder.parent; if (!r) return; r.remove(m.bbHolder); const old = new Set(m.bbMats); m.mats = m.mats.filter(e => !old.has(e[0])); bbBuildVariant(m, r, m.bbVarKey); }

// ---- pandas: Minecraft's personalities (mostly normal, brown is rare) ----
const BB_PANDA = ['normal', 'lazy', 'worried', 'playful', 'brown', 'weak', 'aggressive'];
bbVariantMob('panda', (m) => 'panda:' + BB_PANDA[bbVarIdx(m, () => bbWeighted([50, 12, 12, 12, 2, 4, 8])) % 7]);

// ---- bees get the angry look while angry ----
bbVariantMob('bee', () => 'bee:normal');
bbOnFrame('bee', (m) => bbSetSkin(m, null, m.angry > 0 ? 'angry' : null));

// ---- striders shiver blue-grey out of lava ----
bbVariantMob('strider', () => 'strider:normal');
bbOnFrame('strider', (m) => { if ((m.bbColdT = (m.bbColdT || 0) - 1) > 0) return; m.bbColdT = 15;
  const lava = (y) => FKIND[world.get(Math.floor(m.pos.x), Math.floor(y), Math.floor(m.pos.z))] === 2; bbSetSkin(m, null, lava(m.pos.y) || lava(m.pos.y - 0.2) ? null : 'cold'); });

// ---- tropical fish: grey skins tinted with each fish's two colours ----
bbVariantMob('tropical_fish', (m) => 'tropical_fish:' + ((m.var || 0) % 6), (m) => { const c = typeof TROP !== 'undefined' && TROP[(m.var || 0) % TROP.length]; if (!c) return; bbTint(m, m.bbBase, BB_TINT(c[0])); bbTint(m, m.bbLayer.pattern, BB_TINT(c[1])); });

// ---- horses: coat + markings from the horse's genes; saddle and armour stay from the old model ----
const BB_COAT = ['white', 'creamy', 'chestnut', 'brown', 'black', 'gray', 'darkbrown'], BB_MARK = [false, 'white', 'whitefield', 'whitedots', 'blackdots'];
bbVariantMob('horse', (m) => 'horse:' + BB_COAT[((m.hg && m.hg.c) || 0) % 7], (m) => bbSetSkin(m, 'markings', BB_MARK[((m.hg && m.hg.mk) || 0) % 5]),
  (m) => [].concat(m.saddleParts || [], m.reins || [], m.armorParts || []));

// ---- villagers: body + biome outfit + job outfit + level badge ----
const BB_VTYPE = ['plains', 'desert', 'jungle', 'savanna', 'snow', 'swamp', 'taiga'], BB_VLV = ['stone', 'iron', 'gold', 'emerald', 'diamond'];
function bbVTypeRoll(m) { const b = bbBiomeAt(m.pos.x, m.pos.z); return bbIn(b, ['DESERT', 'BADLANDS']) ? 1 : bbIn(b, ['JUNGLE']) ? 2 : bbIn(b, ['SAVANNA']) ? 3 : bbIn(b, ['SNOWY']) ? 4 : bbIn(b, ['SWAMP', 'MANGROVE_SWAMP']) ? 5 : bbIn(b, ['TAIGA', 'MOUNTAINS']) ? 6 : 0; }
bbVariantMob('villager', (m) => { bbVarIdx(m, () => bbVTypeRoll(m)); return 'villager:all'; });
bbOnFrame('villager', (m) => { bbSetSkin(m, 'type', BB_VTYPE[(m.var || 0) % 7]); if (m.bbKey.endsWith(':baby')) return;
  const v = typeof vData === 'function' ? vData(m) : null; const job = v ? (v.nit ? 'nitwit' : v.prof) : null;
  bbSetSkin(m, 'job', job || false); bbSetSkin(m, 'level', job && job !== 'nitwit' ? BB_VLV[Math.max(0, Math.min(4, (v.lvl || 1) - 1))] : false);
  if (m.outfit && m.outfit.length && !m.bbOutfitHid) { m.bbOutfitHid = true; for (const o of m.outfit) o.visible = false; } });
// the old outfit pieces get rebuilt when a villager takes a job; keep them hidden
if (typeof dressVillager !== 'undefined') { const _dv = dressVillager; dressVillager = function (m) { const r = _dv.apply(this, arguments); if (m && m.bbKey && m.outfit) for (const o of m.outfit) o.visible = false; return r; }; }
// zombie villagers: biome outfit and a job (some jobless), rolled once and saved
const BB_ZJOB = ['armorer', 'butcher', 'cartographer', 'cleric', 'farmer', 'fisherman', 'fletcher', 'leatherworker', 'librarian', 'mason', 'nitwit', 'shepherd', 'toolsmith', 'weaponsmith', null];
bbVariantMob('zombie_villager', (m) => { bbVarIdx(m, () => bbVTypeRoll(m) + 7 * Math.floor(Math.random() * BB_ZJOB.length)); return 'zombie_villager:all'; });
bbOnFrame('zombie_villager', (m) => { const v = m.var || 0; bbSetSkin(m, 'type', BB_VTYPE[v % 7]); if (m.bbKey.endsWith(':baby')) return; const job = BB_ZJOB[Math.floor(v / 7) % BB_ZJOB.length];
  bbSetSkin(m, 'job', job || false); bbSetSkin(m, 'level', job && job !== 'nitwit' ? 'stone' : false); });

// ---- iron golems crack as they lose health ----
bbVariantMob('iron_golem', () => 'iron_golem:all');
bbOnFrame('iron_golem', (m) => { const f = m.hp / (m.maxHp || 100); bbSetSkin(m, 'cracks', f < 0.25 ? 'high' : f < 0.5 ? 'medium' : f < 0.75 ? 'low' : false); });

// ---- the Wither: pale while it charges up, swirling armour below half health ----
bbVariantMob('wither', () => 'wither:all');
bbOnFrame('wither', (m) => { bbSetSkin(m, null, m.spawnT > 0 ? 'invulnerable' : null); const on = m.hp <= (m.maxHp || 300) / 2; bbSetSkin(m, 'armor', on);
  const a = m.bbLayer && m.bbLayer.armor; if (on && a && a.map) { a.map.wrapS = a.map.wrapT = THREE.RepeatWrapping; a.map.offset.set((m.age * 0.4) % 1, (m.age * 0.4) % 1); } });

// ---- copper golems: skin and glowing eyes follow how weathered they are ----
bbVariantMob('copper_golem', (m) => 'copper_golem:' + Math.max(0, Math.min(3, m.cgAge || 0)));

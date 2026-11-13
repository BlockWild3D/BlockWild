// ================= MODS: loader + modding API =================
// Mods are plain JavaScript stored in localStorage. Enabled mods run here, after the base blocks/items/recipes exist and
// before textures, icons, the atlas and the creative palette are built, so anything a mod registers behaves like base content.
// Each mod's code runs as `function (api) { ... }`. See MODDING.md for the full API.
const MODS = { list: [], loaded: [], errors: {}, hooks: {}, ores: [], physics: { gravity: 28, jump: 8.6, speed: 1, fallDamage: 1 } };
function modsLoad() { try { return JSON.parse(localStorage.getItem('blockwild_mods') || '[]'); } catch (e) { return []; } }
function modsSave(list) { try { localStorage.setItem('blockwild_mods', JSON.stringify(list)); return true; } catch (e) { return false; } }
function modMeta(code, fallback) {
  const m = {}; for (const line of code.split('\n').slice(0, 30)) { const k = line.match(/^\s*\/\/\s*@(\w+)\s+(.*)$/); if (k) m[k[1].toLowerCase()] = k[2].trim(); }
  return { name: m.name || fallback || 'Unnamed mod', description: m.description || '', author: m.author || '', version: m.version || '' };
}
// ---- texture helpers ----
function hexc(h) { if (Array.isArray(h)) return h; h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function modPainter(spec, kind) {
  if (typeof spec === 'function') return spec;
  if (typeof spec === 'string') spec = { color: spec };
  if (!spec) spec = { color: '#ff00ff' };
  if (spec.pixels) {
    const pal = {}; for (const k in (spec.palette || {})) pal[k] = hexc(spec.palette[k]);
    return (set) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const ch = (spec.pixels[y] || '')[x]; if (!ch || ch === '.' || ch === ' ' || !pal[ch]) set(x, y, [0, 0, 0], 0); else set(x, y, pal[ch]); } };
  }
  const c = hexc(spec.color || '#888888'), c2 = hexc(spec.color2 || mixc(c, [255, 255, 255], 0.45)), dk = mixc(c, [0, 0, 0], 0.4);
  const st = spec.style || (kind === 'item' ? 'gem' : 'noise');
  switch (st) {
    case 'ore': return (set, r) => pOre(set, r, c, c2);
    case 'planks': return (set, r) => pPlanks(set, r, c);
    case 'bricks': return (set, r) => pBricks(set, r, c, hexc(spec.color2 || '#b0a89c'), 8, 4);
    case 'leaves': return (set, r) => pLeaves(set, r, c);
    case 'log': return (set, r) => pLogSide(set, r, c, dk);
    case 'cobble': return (set, r) => pCobble(set, r, false);
    case 'glass': return (set) => each((x, y) => { const e = x === 0 || y === 0 || x === 15 || y === 15; set(x, y, e ? c : [0, 0, 0], e ? 255 : 0); });
    case 'lamp': return (set, r) => each((x, y) => { const e = x === 0 || y === 0 || x === 15 || y === 15; const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); set(x, y, e ? dk : vary(d < 3 ? c2 : c, r, 10)); });
    case 'solid': return (set) => each((x, y) => set(x, y, c));
    case 'gem': return (s) => { for (let y = 2; y <= 14; y++) { const w = y <= 6 ? (y - 2) * 1.4 + 1 : (14 - y) * 0.75 + 0.5; for (let x = Math.round(8 - w); x <= Math.round(7 + w); x++) s(x, y, (y < 6 && x < 8) ? c2 : (x > 9 || y > 10) ? dk : c); } };
    case 'ingot': return (s) => ingot(s, c, c2, dk);
    case 'dust': return (s, r) => { blob(s, 8, 10, 6, 3.5, c, r); for (let i = 0; i < 10; i++) s(3 + r() * 10, 8 + r() * 5, c2); };
    case 'ball': return (s, r) => { blob(s, 8, 8, 5.5, 5.5, c, r, dk); s(6, 6, c2); s(7, 6, c2); };
    case 'pickaxe': return pickIcon(c, c2);
    case 'sword': return swordIcon(c, c2);
    default: return (set, r) => each((x, y) => { let q = vary(c, r, 12); if (r() < 0.12) q = vary(dk, r, 6); else if (r() < 0.06) q = vary(c2, r, 6); set(x, y, q); });
  }
}
const _modImgQueue = [];
function modTile(name, spec) {
  if (TILE[name] === undefined && tileCount >= ATN * ATN) throw new Error('No room left in the texture atlas');
  if (spec && spec.image) { const i = makeTile(name, modPainter({ color: spec.color || '#888888' })); _modImgQueue.push([i, spec.image]); return name; }
  makeTile(name, modPainter(spec, 'block')); return name;
}
function modLoadImages() { // images (data: URLs or same-site files) are drawn into the atlas once loaded
  for (const [i, src] of _modImgQueue) { const img = new Image(); img.onload = () => { actx.clearRect((i % ATN) * 16, Math.floor(i / ATN) * 16, 16, 16); actx.imageSmoothingEnabled = false; actx.drawImage(img, (i % ATN) * 16, Math.floor(i / ATN) * 16, 16, 16); if (typeof atlasTex !== 'undefined') atlasTex.needsUpdate = true; for (const id of ITEM_IDS) if (ITEMS[id].kind === 'block' && BL[id].texIds && BL[id].texIds.includes(i)) { const c = blockIconCanvas(id); ICON_CANVAS[id] = c; ICON[id] = c.toDataURL(); } }; img.src = src; }
}
function modFire(name, ...args) {
  const hs = MODS.hooks[name]; if (!hs) return; let cancel = false;
  for (const h of hs) { if (h.dead) continue; try { if (h.fn(...args) === false) cancel = true; } catch (e) { h.errs = (h.errs || 0) + 1; console.error('[mod ' + h.mod + '] ' + name + ':', e); if (h.errs >= 5) { h.dead = true; if (typeof toast === 'function') toast('Mod "' + h.mod + '" was stopped after repeated errors', 4); } } }
  return cancel;
}
function makeModApi(mod) {
  const ns = (key) => String(key).toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const tex6 = (o, key) => { // texture spec -> defBlock tex
    const t = o.textures || o.texture || o.color || '#888888';
    if (t && typeof t === 'object' && !t.pixels && !t.color && !t.image && !t.style && (t.top || t.side || t.bottom || t.all)) {
      const all = t.all || t.side || t.top; const side = modTile(key + '_side', t.side || all), top = modTile(key + '_top', t.top || all), bot = modTile(key + '_bottom', t.bottom || t.top || all);
      return { s: side, t: top, b: bot };
    }
    return modTile(key, t);
  };
  const api = {
    mod,
    // ---- content ----
    addBlock(key, o = {}) {
      key = ns(key); if (B[key.toUpperCase()] !== undefined) throw new Error('Block "' + key + '" already exists');
      if (BL.length >= 256) throw new Error('No block ids left (max 255)');
      const shape = o.shape || 'cube';
      const def = { tex: tex6(o, key), hardness: o.hardness != null ? o.hardness : 1.5, tool: o.tool === 'pickaxe' || o.tool === 'pick' ? 'pick' : null, tier: o.tier || (o.tool ? 1 : 0), light: o.light || 0, snd: o.sound || 'stone', drop: o.drop === undefined ? key : o.drop, mod: mod.name };
      if (shape === 'cross') Object.assign(def, { solid: false, opaque: false, render: 'cross', plant: true, hardness: o.hardness || 0, snd: o.sound || 'grass' });
      if (o.transparent || shape === 'glass') Object.assign(def, { opaque: false, render: 'cutout', cullSame: true });
      if (o.solid === false) def.solid = false;
      const id = defBlock(key, o.name || key, def);
      SOLID[id] = BL[id].solid ? 1 : 0; OPAQUE[id] = BL[id].opaque ? 1 : 0; PLANT[id] = BL[id].plant ? 1 : 0; LIGHT[id] = BL[id].light;
      defItem(id, key, BL[id].name, { kind: 'block', block: id }); ITEM_IDS.push(id);
      if (o.fuel) FUEL[key] = o.fuel;
      return id;
    },
    addItem(key, o = {}) {
      key = ns(key); if (IT[key] !== undefined) throw new Error('Item "' + key + '" already exists');
      const opt = { stack: o.stack || 64, kind: 'mat', mod: mod.name };
      if (o.food) Object.assign(opt, { kind: 'food', heal: o.food });
      ICONP[key] = modPainter(o.icon || o.color || '#ff00ff', 'item');
      const id = nid++; defItem(id, key, o.name || key, opt); ITEM_IDS.push(id);
      if (o.fuel) FUEL[key] = o.fuel;
      return id;
    },
    addTool(key, o = {}) {
      key = ns(key); const type = o.type === 'sword' ? 'sword' : 'pick'; const tier = o.tier || 2;
      ICONP[key] = modPainter(o.icon || { color: o.color || '#cccccc', color2: o.color2, style: type === 'sword' ? 'sword' : 'pickaxe' }, 'item');
      const id = nid++; defItem(id, key, o.name || key, { kind: 'tool', stack: 1, tool: type, tier, speed: o.speed || (type === 'pick' ? tier * 2 : 1), dmg: o.damage || (type === 'sword' ? 3 + tier : 1 + tier), mod: mod.name }); ITEM_IDS.push(id);
      return id;
    },
    addRecipe(out, count, pattern, keyMap) {
      let r; if (Array.isArray(pattern) && keyMap) { const w = Math.max(...pattern.map(x => x.length)); r = RSH(out, count, pattern.map(x => x.padEnd(w, ' ')), keyMap); r.big = pattern.length > 2 || w > 2; }
      else { r = RSL(out, count, pattern); r.big = pattern.length > 4; }
      r.mod = mod.name; RECIPES.push(r); return r;
    },
    addShapelessRecipe(out, count, items) { return api.addRecipe(out, count, items); },
    addSmelting(input, output) { SMELT[input] = output; },
    addFuel(item, seconds) { FUEL[item] = seconds; },
    addLoot(table, item, min = 1, max = 1, chance = 0.5) { (LOOT[table] = LOOT[table] || []).push([item, min, max, chance]); },
    addOre(block, o = {}) { MODS.ores.push([block, o.veins || 4, o.size || 6, o.minY != null ? o.minY : 1, o.maxY != null ? o.maxY : 40, o.spread || 'uni', o.replace || 'stone', o.biomes || null]); },
    // ---- events ----
    on(event, fn) { (MODS.hooks[event] = MODS.hooks[event] || []).push({ fn, mod: mod.name }); },
    // ---- game access (valid once a world is running) ----
    get physics() { return MODS.physics; },
    get player() { return typeof player !== 'undefined' ? player : null; },
    get world() { return typeof world !== 'undefined' ? world : null; },
    get dimension() { return typeof world !== 'undefined' && world ? world.dim : null; },
    get mode() { return typeof S !== 'undefined' ? S.mode : null; },
    get time() { return typeof S !== 'undefined' ? S.time : 0; }, set time(v) { S.time = ((v % 1) + 1) % 1; },
    blockId: (key) => B[ns(key).toUpperCase()], itemId: (key) => IT[ns(key)],
    getBlock(x, y, z) { const id = world.get(Math.floor(x), Math.floor(y), Math.floor(z)); return BL[id] ? BL[id].key : 'air'; },
    setBlock(x, y, z, key) { const id = typeof key === 'number' ? key : (key === 'air' ? 0 : B[ns(key).toUpperCase()]); if (id === undefined) throw new Error('Unknown block ' + key); world.set(Math.floor(x), Math.floor(y), Math.floor(z), id); },
    give(item, count = 1) { const id = typeof item === 'number' ? item : IT[ns(item)]; if (id === undefined) throw new Error('Unknown item ' + item); return addItem(id, count); },
    spawnMob(type, x, y, z) { return spawnMob(type, x, y, z); },
    lookingAt(maxDist = 6) { const h = raycast(player.eye(), lookDir(), maxDist); return h ? { x: h.x, y: h.y, z: h.z, key: BL[h.id].key, face: [h.nx, h.ny, h.nz] } : null; },
    heal(n) { player.health = Math.min(20, player.health + n); updateHearts(); },
    message(text, seconds) { toast(String(text), seconds || 3); },
    explode(x, y, z, power) { explode(x, y, z, power || 3); },
  };
  return api;
}
// run enabled mods
(function runMods() {
  MODS.list = modsLoad();
  for (const m of MODS.list) {
    if (!m.enabled) continue;
    const meta = modMeta(m.code, m.name);
    const mod = { id: m.id, name: meta.name };
    try { new Function('api', '"use strict";\n' + m.code)(makeModApi(mod)); MODS.loaded.push(m.id); }
    catch (e) { MODS.errors[m.id] = String(e && e.message || e); console.error('[mod ' + meta.name + ']', e); }
  }
})();

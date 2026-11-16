// ================= HAND-DRAWN TEXTURES: painted over the built-in ones when the game starts =================
// The pictures are in 00_paint.js. Moving textures (water, lava, fire) are left alone because they are redrawn every frame.
const paintAnim = (name) => typeof ANIM !== 'undefined' && !!ANIM[name]; // moving textures (water, lava, fire) are redrawn every frame
function paintTileGet(i) { return actx.getImageData((i % ATN) * 16, Math.floor(i / ATN) * 16, 16, 16).data; }
function paintCanvas(bytes) { const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'); const img = x.createImageData(16, 16); img.data.set(bytes); x.putImageData(img, 0, 0); return c; }
function paintRefreshItem(id) { if (itemTexCache[id]) { itemTexCache[id].dispose(); itemTexCache[id] = null; } if (spriteMats[id]) spriteMats[id] = null; handId = -1; }
function paintTileSet(i, bytes) {
  const img = actx.createImageData(16, 16); img.data.set(bytes); actx.putImageData(img, (i % ATN) * 16, Math.floor(i / ATN) * 16); TILE_CV.delete(i);
  let s = [0, 0, 0], n = 0; for (let k = 0; k < 1024; k += 4) if (bytes[k + 3] > 0) { s[0] += bytes[k]; s[1] += bytes[k + 1]; s[2] += bytes[k + 2]; n++; } TILE_AVG[i] = n ? [s[0] / n / 255, s[1] / n / 255, s[2] / n / 255] : [1, 1, 1];
  if (typeof hdTile === 'function') hdTile(i); if (typeof atlasTex !== 'undefined') atlasTex.needsUpdate = true;
  // every block that shows this texture gets its inventory picture drawn again (unless you painted that picture yourself)
  for (const id of ITEM_IDS) { const it = ITEMS[id]; if (it.kind !== 'block' || !BL[id] || !BL[id].texIds || !BL[id].texIds.includes(i) || PAINT.icons[it.key] || !LAZY_MAKE[id]) continue; lazyIcon(id, LAZY_MAKE[id]); paintRefreshItem(id); }
}
function paintIconGet(id) { const c = ICON_CANVAS[id]; if (!c || c.width !== 16) return null; return c.getContext('2d').getImageData(0, 0, 16, 16).data; }
function paintIconSet(id, bytes) { const copy = new Uint8ClampedArray(bytes); lazyIcon(id, () => paintCanvas(copy)); paintRefreshItem(id); }
// when the game starts: put the hand-drawn pictures over the built-in ones
(function paintApply() {
  for (const name in PAINT.tiles) { const i = TILE[name]; if (i === undefined || paintAnim(name)) continue; try { paintTileSet(i, paintBytes(PAINT.tiles[name])); } catch (e) { console.warn('paint tile', name, e); } }
  for (const key in PAINT.icons) { const id = IT[key]; if (id === undefined) continue; try { paintIconSet(id, paintBytes(PAINT.icons[key])); } catch (e) { console.warn('paint icon', key, e); } }
})();

// hand-drawn potion bottles: one picture per bottle type (potion / splash / lingering) and brew; long_ and strong_ use the base brew's picture
if (PAINT.potions && typeof potionIcon === 'function') { const _potionIcon = potionIcon; const cache = {};
  potionIcon = function (id, pot) { const kind = id === IT.potion ? 'potion' : id === IT.splash_potion ? 'splash_potion' : id === IT.lingering_potion ? 'lingering_potion' : id === IT.tipped_arrow ? 'tipped_arrow' : null;
    const P = typeof POTIONS !== 'undefined' ? POTIONS[pot] : null; const k = (P && P.base) || pot; const b = kind && PAINT.potions[kind] && PAINT.potions[kind][k];
    if (!b) return _potionIcon(id, pot); const key = kind + ':' + k; return cache[key] || (cache[key] = paintCanvas(paintBytes(b)).toDataURL()); }; }

// ================= CREATIVE INVENTORY: every item and block, with a search box =================
// Type to filter by name (blocks and items both); every potion, splash potion, lingering potion and tipped arrow
// type has its own entry, like Minecraft's creative tabs. Click: take a stack; shift-click: put a stack in your
// inventory; click while holding something: delete it.
function creativeEntries() {
  const list = [];
  for (const id of ITEM_IDS) { const it = ITEMS[id]; if (!it || id === B.AIR || (it.kind === 'block' && BL[id] && BL[id].hidden)) continue;
    if (id === IT.potion || id === IT.splash_potion || id === IT.lingering_potion || id === IT.tipped_arrow) { for (const pot of Object.keys(POTIONS)) { if (id === IT.tipped_arrow && !POTIONS[pot].effect) continue; list.push({ id, ex: { pot }, name: potionName({ id, pot }) }); } continue; }
    list.push({ id, ex: null, name: it.name });
  }
  return list;
}
let CREATIVE_LIST = null;
function buildPalette(q) {
  const pal = $('palette'); if (!pal) return; pal.innerHTML = ''; CREATIVE_LIST = CREATIVE_LIST || creativeEntries();
  const words = String(q || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
  let shown = 0;
  for (const e of CREATIVE_LIST) {
    const nm = e.name.toLowerCase(), key = ITEMS[e.id].key.replace(/_/g, ' ');
    if (words.length && !words.every(w => nm.includes(w) || key.includes(w))) continue;
    const d = newSlotEl(pal); paintSlot(d, Object.assign({ id: e.id, count: 1 }, e.ex || {})); shown++;
    d.addEventListener('pointerdown', (ev) => { ev.preventDefault(); ev.stopPropagation(); const n = stackMax(e.id);
      if (S.cursor) S.cursor = null; else if (ev.shiftKey) addItem(e.id, n, e.ex); else S.cursor = Object.assign({ id: e.id, count: n }, e.ex || {}); invDirty(); renderInvUI(); });
    d.addEventListener('pointerenter', () => showTip(e.ex ? itemTooltip(Object.assign({ id: e.id, count: 1 }, e.ex)) : e.name)); d.addEventListener('pointerleave', () => showTip(null));
  }
  if (!shown) { const n = document.createElement('div'); n.style.cssText = 'color:#555;padding:8px'; n.textContent = 'No items match "' + q + '"'; pal.appendChild(n); }
}
(() => {
  const box = $('paletteBox'); const pal = $('palette'); if (!box || !pal) return;
  const inp = document.createElement('input'); inp.type = 'search'; inp.id = 'creativeSearch'; inp.placeholder = 'Search items and blocks...'; inp.autocomplete = 'off';
  inp.style.cssText = 'width:100%;box-sizing:border-box;margin:2px 0 6px;padding:6px 8px;font:inherit;font-size:15px;border:2px solid #555;background:#f4f4f4';
  for (const ev of ['keydown', 'keyup', 'keypress']) inp.addEventListener(ev, (e) => { if (e.key === 'Escape') { inp.blur(); return; } e.stopPropagation(); });
  inp.addEventListener('input', () => buildPalette(inp.value));
  box.insertBefore(inp, pal); buildPalette('');
})();

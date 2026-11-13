// ================= CREATIVE: EVERY ENCHANTED BOOK =================
// Like Minecraft's creative inventory, every enchantment has its own enchanted book at every level (Wind Burst I, II
// and III, Sharpness I-V...), listed after the plain enchanted book and found by searching for the enchantment's
// name ("wind burst", "mending"). Combine a book with a tool, weapon or armour piece in an anvil.
{ const _ce = creativeEntries; creativeEntries = function () {
    const list = _ce(); const i = list.findIndex(e => e.id === IT.enchanted_book && !e.ex); const books = [];
    for (const k of Object.keys(ENCH)) { const E = ENCH[k]; for (let lv = 1; lv <= (E.max || 1); lv++) books.push({ id: IT.enchanted_book, ex: { ench: { [k]: lv } }, name: 'Enchanted Book ' + E.name + ((E.max || 1) > 1 ? ' ' + roman(lv) : '') }); }
    if (i >= 0) list.splice(i + 1, 0, ...books); else list.push(...books);
    if (typeof SPAWN_EGG_IDS !== 'undefined') for (const id of SPAWN_EGG_IDS) if (!list.some(e => e.id === id)) list.push({ id, ex: null, name: ITEMS[id].name });
    return list; };
  CREATIVE_LIST = null; buildPalette(($('creativeSearch') || {}).value || ''); }

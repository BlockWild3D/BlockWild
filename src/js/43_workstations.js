// ================= WORKSTATION BLOCKS THAT DO THINGS (Minecraft) =================
// Smoker: cooks food twice as fast (and only food). Blast furnace: smelts ores and raw metal twice as fast (only
// those). Both burn fuel twice as fast. Barrel: a 27-slot container. Composter: put plant matter in (each item has
// a chance to raise the level: seeds and leaves 30%, wheat, carrots, potatoes, apples, melon 65%, bread and cookies
// 85%, pie 100%); at level 7 it fills up and gives bone meal. Grindstone: removes enchantments (curses stay) and gives
// some experience back, or repairs two of the same item (their durability plus 5%). Stonecutter: one stone block
// into a cut variant at a time, with no crafting grid.
function furnaceAccepts(kind, inId, outId) {
  const ik = ITEMS[inId].key, ok = ITEMS[outId].key;
  if (kind === 'smoker') return ITEMS[outId].kind === 'food';
  if (kind === 'blast') return /ore|raw_|ancient_debris/.test(ik) || /_ingot|scrap|nugget/.test(ok);
  return true;
}
// ---------- composter ----------
const COMPOST = { wheat_seeds: 0.3, leaves: 0.3, birch_leaves: 0.3, spruce_leaves: 0.3, jungle_leaves: 0.3, dark_oak_leaves: 0.3, acacia_leaves: 0.3, tall_grass: 0.3, sweet_berries: 0.3, vine: 0.5, sugar_cane: 0.5, cactus: 0.5, lily_pad: 0.65, wheat: 0.65, carrot: 0.65, potato: 0.65, apple: 0.65, melon_slice: 0.5, rose: 0.65, dandelion: 0.65, crimson_fungus: 0.65, warped_fungus: 0.65, crimson_roots: 0.65, warped_roots: 0.65, nether_wart: 0.65, cocoa_beans: 0.65, chorus_fruit: 0.3, baked_potato: 0.85, bread: 0.85, cookie: 0.85, hay_block: 0.85, nether_wart_block: 0.85, warped_wart_block: 0.85, pumpkin_pie: 1 };
function compostAt(k) { world.compost = world.compost || new Map(); return world.compost.get(k) || 0; }
function useComposter(x, y, z) {
  const k = x + ',' + y + ',' + z; const lv = compostAt(k); const h = player.held(); const hd = h && ITEMS[h.id];
  if (lv >= 8) { world.compost.set(k, 0); dropItem(IT.bone_meal, 1, x + 0.5, y + 1.1, z + 0.5, true); Sfx.play('pop', 0.6, 0.8); Particles.emit(x + 0.5, y + 1, z + 0.5, 8, [[0.9, 0.9, 0.85]], 1, 0.5, 2, 0.5); return true; }
  if (!hd || COMPOST[hd.key] == null || lv >= 7) return false;
  if (S.mode !== 'creative') useHeld(1); S.swing = 1;
  if (Math.random() < COMPOST[hd.key]) { const n = lv + 1; world.compost.set(k, n); Particles.emit(x + 0.5, y + 1, z + 0.5, 6, [[0.4, 0.7, 0.2], [0.5, 0.35, 0.2]], 1, 0.5, 2, 0.5); Sfx.play('step', 0.5, 0.8);
    if (n === 7) setTimeout(() => { if (compostAt(k) === 7) { world.compost.set(k, 8); Sfx.play('pop', 0.4, 0.6); } }, 1000); }
  else Sfx.play('step', 0.3, 1.2);
  toast('Composter ' + Math.min(7, compostAt(k)) + '/7' + (compostAt(k) >= 7 ? ' - ready soon' : ''), 1);
  return true;
}
// composter levels are saved with the world
{ const _pw = packWorld; packWorld = function (w) { const r = _pw(w); if (w.compost && w.compost.size) r.compost = Object.fromEntries(w.compost); return r; };
  const _uw = unpackWorld; unpackWorld = function (w, d) { const r = _uw(w, d); if (d && d.compost) w.compost = new Map(Object.entries(d.compost)); return r; }; }
// ---------- grindstone ----------
function grindResult(a, b) {
  if (!a && !b) return null; const one = a && b ? null : (a || b);
  const strip = (s) => { const o = Object.assign({}, s); let xp = 0; if (o.ench) { const keep = {}; for (const [e, l] of Object.entries(o.ench)) { if (ENCH[e] && ENCH[e].curse) keep[e] = l; else xp += (ENCH[e] && ENCH[e].treasure ? 3 : 1) * l * 2; } o.ench = Object.keys(keep).length ? keep : undefined; if (!o.ench) delete o.ench; } if (o.id === IT.enchanted_book && !o.ench) o.id = IT.book; delete o.rc; return { item: o, xp }; };
  if (one) { if (!one.ench) return null; const r = strip(one); r.item.count = 1; return r; }
  if (a.id !== b.id || !maxDur(a.id)) return null;
  const md = maxDur(a.id); const left = (md - (a.dmg || 0)) + (md - (b.dmg || 0)) + Math.floor(md * 0.05); const ra = strip(a), rb = strip(b);
  const out = ra.item; out.count = 1; out.dmg = Math.max(0, md - left); if (!out.dmg) delete out.dmg; return { item: out, xp: ra.xp + rb.xp };
}
function openGrindstone() {
  const slots = [null, null, null]; let res = null;
  const pn = S.panel = { title: 'Repair & Disenchant', slots, output: 2, ghosts: [null, null, null], accept: (i, s) => i < 2 && (!!maxDur(s.id) || s.id === IT.enchanted_book), single: true,
    changed: () => update(),
    take: (shift) => { if (!res) return; const it = res.item; if (shift) { if (addItem(it.id, 1, xtra(it))) return; } else { if (S.cursor) return; S.cursor = it; }
      slots[0] = null; slots[1] = null; if (res.xp > 0) spawnOrbRange(player.pos.x, player.pos.y + 1, player.pos.z, Math.ceil(res.xp / 2), res.xp); Sfx.play('stone', 0.6, 0.7); update(); },
    onClose: () => { for (let i = 0; i < 2; i++) if (slots[i]) giveOrDrop(slots[i].id, slots[i].count, xtra(slots[i])); },
    layout: (body) => { body.style.flexDirection = 'row'; body.style.alignItems = 'center'; body.style.gap = '6px'; const col = document.createElement('div'); col.style.cssText = 'display:flex;flex-direction:column;gap:4px'; body.appendChild(col); makeSlot('panel', 0, col); makeSlot('panel', 1, col); const arr = document.createElement('img'); arr.className = 'arrowimg'; arr.src = UI_ICON.arrowR; body.appendChild(arr); makeSlot('panel', 2, body); update(); } };
  function update() { res = grindResult(slots[0], slots[1]); slots[2] = res ? res.item : null; if (S.uiOpen === 'panel') renderInvUI(); }
  openUI('panel');
}
// ---------- stonecutter ----------
const STONECUT = [['stone', 'stone_bricks', 1], ['stone_bricks', 'stone_bricks', 1], ['cobbled_deepslate', 'deepslate_bricks', 1], ['cobbled_deepslate', 'deepslate_tiles', 1], ['deepslate_bricks', 'deepslate_tiles', 1], ['tuff', 'tuff_bricks', 1],
  ['end_stone', 'end_stone_bricks', 1], ['purpur_block', 'purpur_pillar', 1], ['prismarine', 'prismarine_bricks', 1], ['quartz_block', 'quartz_block', 1], ['sandstone', 'sandstone', 1], ['netherrack', 'nether_bricks', 1], ['cobblestone', 'stone_bricks', 1],
  ['blackstone', 'polished_blackstone_bricks', 1], ['polished_blackstone_bricks', 'polished_blackstone_bricks', 1]].filter(([a, b]) => IT[a] != null && IT[b] != null && !(a === b));
function openStonecutter() {
  const slots = [null, null]; let sel = -1;
  const opts = () => slots[0] ? STONECUT.filter(r => IT[r[0]] === slots[0].id) : [];
  const pn = S.panel = { title: 'Stonecutter', slots, output: 1, ghosts: [null, null], accept: (i, s) => i === 0 && STONECUT.some(r => IT[r[0]] === s.id),
    changed: () => { if (!opts()[sel]) sel = opts().length === 1 ? 0 : -1; renderOpts(); update(); },
    take: (shift) => { let n = 0; do { const r = opts()[sel]; if (!r || !slots[0]) break; const out = { id: IT[r[1]], count: r[2] }; if (shift) { if (addItem(out.id, out.count)) break; } else { if (S.cursor && (S.cursor.id !== out.id || S.cursor.count + out.count > stackMax(out.id))) break; if (S.cursor) S.cursor.count += out.count; else S.cursor = out; }
        slots[0].count--; if (!slots[0].count) slots[0] = null; n++; } while (shift && n < 64); Sfx.play('stone', 0.5, 1.3); renderOpts(); update(); },
    onClose: () => { if (slots[0]) giveOrDrop(slots[0].id, slots[0].count); },
    layout: (body) => { body.style.flexDirection = 'row'; body.style.alignItems = 'center'; body.style.gap = '6px'; makeSlot('panel', 0, body); const box = document.createElement('div'); box.style.cssText = 'display:flex;flex-wrap:wrap;gap:2px;width:120px;min-height:40px;background:#777;padding:3px'; body.appendChild(box); pn.box = box; makeSlot('panel', 1, body); renderOpts(); update(); } };
  function renderOpts() { const box = pn.box; if (!box) return; box.innerHTML = ''; opts().forEach((r, i) => { const el = newSlotEl(box); el.style.outline = i === sel ? '2px solid #fff' : ''; paintSlot(el, { id: IT[r[1]], count: r[2] }); el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); sel = i; renderOpts(); update(); Sfx.play('click', 0.4); }); el.addEventListener('pointerenter', () => showTip(ITEMS[IT[r[1]]].name)); el.addEventListener('pointerleave', () => showTip(null)); }); }
  function update() { const r = opts()[sel]; slots[1] = r && slots[0] ? { id: IT[r[1]], count: r[2] } : null; if (S.uiOpen === 'panel') renderInvUI(); }
  openUI('panel');
}
{ const _ua = useAction; useAction = function (eye, dir) {
    if (target && !kd('sneak')) { const u = BL[target.id].use;
      if (u === 'composter') { mouseR = false; if (useComposter(target.x, target.y, target.z)) return; }
      if (u === 'grindstone') { mouseR = false; openGrindstone(); return; }
      if (u === 'stonecutter') { mouseR = false; openStonecutter(); return; } }
    return _ua(eye, dir);
  }; }
{ const _rm = onBlockRemoved; onBlockRemoved = function (x, y, z, id) { const r = _rm(x, y, z, id); if (id === B.COMPOSTER && world.compost) { const k = x + ',' + y + ',' + z; if (world.compost.get(k) >= 8) dropItem(IT.bone_meal, 1, x + 0.5, y + 0.5, z + 0.5); world.compost.delete(k); } return r; }; }

// ================= SMITHING TABLE (Minecraft) =================
// Template + base item + addition -> result. The Netherite Upgrade turns diamond tools, armor and spears into
// netherite ones and keeps their enchantments, name and wear (netherite lasts longer, so the same wear is a smaller
// share). The template, one base item and one ingot are used up. Netherite items don't burn and float on lava.
function netheriteOf(id) { const k = ITEMS[id] && ITEMS[id].key; if (!k || !k.startsWith('diamond_')) return null; const n = IT['netherite_' + k.slice(8)]; return n != null ? n : null; }
function smithResult(sl) {
  const [t, b, a] = sl; if (!t || !b || !a) return null;
  if (t.id !== IT.netherite_upgrade_smithing_template || a.id !== IT.netherite_ingot) return null;
  const out = netheriteOf(b.id); if (out == null) return null;
  return Object.assign({}, xtra(b) || {}, { id: out, count: 1 });
}
function openSmithUI() {
  const slots = [null, null, null, null];
  const pn = S.panel = { title: 'Upgrade Gear', slots, output: 3, ghosts: [IT.netherite_upgrade_smithing_template, IT.diamond_sword, IT.netherite_ingot, null],
    accept: (i, s) => i === 0 ? ITEMS[s.id].kind === 'template' : i === 1 ? netheriteOf(s.id) != null : i === 2 ? s.id === IT.netherite_ingot : false,
    changed: () => { slots[3] = smithResult(slots); },
    take: (shift) => {
      const r = smithResult(slots); if (!r) return;
      const c = S.cursor;
      if (shift) { const left = addItem(r.id, 1, xtra(r)); if (left) return; }
      else { if (c) return; S.cursor = r; }
      for (let i = 0; i < 3; i++) { slots[i].count--; if (slots[i].count <= 0) slots[i] = null; }
      slots[3] = smithResult(slots); Sfx.play('anvil', 0.6); Sfx.play('armor', 0.7);
    },
    layout: (body) => {
      const grp = document.createElement('div'); grp.className = 'crow'; grp.style.gap = '4px'; body.appendChild(grp);
      for (let i = 0; i < 3; i++) makeSlot('panel', i, grp);
      const arr = document.createElement('img'); arr.className = 'arrowimg'; arr.src = UI_ICON.arrowR; body.appendChild(arr);
      makeSlot('panel', 3, body);
      const tip = document.createElement('div'); tip.style.cssText = 'font-size:16px;color:#555;max-width:220px'; tip.textContent = 'Netherite Upgrade template + diamond tool, armor or spear + Netherite Ingot'; body.appendChild(tip);
    },
    onClose: () => { for (let i = 0; i < 3; i++) if (slots[i]) giveOrDrop(slots[i].id, slots[i].count, xtra(slots[i])); },
  };
  openUI('panel');
}
{ const _ua = useAction; useAction = function (eye, dir) {
    if (target && !kd('sneak') && BL[target.id].use === 'smith') { mouseR = false; openSmithUI(); return; }
    return _ua(eye, dir);
  }; }

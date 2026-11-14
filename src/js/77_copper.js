// ================= COPPER AT RUN TIME: ageing, scraping, waxing =================
// Every copper block, stair, slab, door and trapdoor knows its next and previous age and its waxed / unwaxed twin
// (keeping its state: a half-open trapdoor stays open). Random ticks age unwaxed copper; an axe scrapes back one age or
// takes the wax off; honeycomb waxes it.
const CU_NEXT = new Uint16Array(ITEM_BASE), CU_PREV = new Uint16Array(ITEM_BASE), CU_WAX = new Uint16Array(ITEM_BASE), CU_UNWAX = new Uint16Array(ITEM_BASE);
{ // parse a copper key into [type, age, waxed]; type includes stairs / slab suffixes
  const parse = (k) => { let waxed = false; if (k.startsWith('waxed_')) { waxed = true; k = k.slice(6); } let a = 0; for (let i = 1; i < 4; i++) if (k.startsWith(CU_AGES[i])) { a = i; k = k.slice(CU_AGES[i].length); break; }
    const T = { copper_block: 'block', copper: 'block', cut_copper: 'cut', chiseled_copper: 'chiseled', copper_grate: 'grate', copper_bulb: 'bulb', copper_door: 'door', copper_trapdoor: 'trapdoor', cut_copper_stairs: 'cut_stairs', cut_copper_slab: 'cut_slab' }[k];
    if (!T || (T === 'block' && ((a === 0) !== (k === 'copper_block')))) return null; return [T, a, waxed]; };
  const keyFor = (T, a, waxed) => T === 'cut_stairs' ? cuKey('cut', a, waxed) + '_stairs' : T === 'cut_slab' ? cuKey('cut', a, waxed) + '_slab' : cuKey(T, a, waxed);
  // the same block state in another copper block
  const same = (d, key) => { if (d.fam && FAMILY[d.fam] && FAMILY[key]) { if (FAMILY[d.fam].kind === 'axis') return FAMILY[key].base; return famId(key, d.st); } if (d.lit && BL[B[key.toUpperCase()]]) return BL[B[key.toUpperCase()]].bulbOther; return B[key.toUpperCase()]; };
  for (const d of BL) { if (!d) continue; const base = d.fam ? BL[FAMILY[d.fam] ? FAMILY[d.fam].base : d.id] : d; const k = d.fam || (d.lit ? d.drop : d.key); const p = parse(k); if (!p) continue; const [T, a, waxed] = p;
    const set = (arr, key) => { const id = same(d, key); if (id) arr[d.id] = id; };
    if (!waxed && a < 3) set(CU_NEXT, keyFor(T, a + 1, false)); if (!waxed && a > 0) set(CU_PREV, keyFor(T, a - 1, false));
    if (!waxed) set(CU_WAX, keyFor(T, a, true)); else set(CU_UNWAX, keyFor(T, a, false)); }
}
{ const _ua = useAction; useAction = function (eye, dir) {
    const h = player.held(); const hd = h && ITEMS[h.id];
    if (target && !targetMob && hd && !isSpec()) { const id = target.id; const { x, y, z } = target;
      const changeBoth = (nid) => { const d = BL[id]; world.set(x, y, z, nid); if (d.shape === 'door') { const oy = d.st.half === 'upper' ? y - 1 : y + 1; const o = world.get(x, oy, z); const map = arguments.length; const other = (CU_UNWAX[nid] === id || CU_WAX[id] === nid) ? (CU_WAX[o] || CU_UNWAX[o]) : (CU_PREV[o] || 0); if (other) world.set(x, oy, z, other); } };
      if (hd.kind === 'tool' && hd.tool === 'axe' && (CU_UNWAX[id] || CU_PREV[id])) { mouseR = false; const d = BL[id]; const nid = CU_UNWAX[id] || CU_PREV[id];
        world.set(x, y, z, nid); if (d.shape === 'door') { const oy = d.st.half === 'upper' ? y - 1 : y + 1; const o = world.get(x, oy, z); const n2 = CU_UNWAX[id] ? CU_UNWAX[o] : CU_PREV[o]; if (n2) world.set(x, oy, z, n2); }
        Particles.emit(x + 0.5, y + 0.5, z + 0.5, 10, CU_UNWAX[id] ? [[1, 0.85, 0.4]] : [[0.6, 0.9, 0.8]], 1.5, 0.6, -1, 0.6); Sfx.play('wood', 1, 1.3); damageHeld(1); S.swing = 1; return; }
      if (h.id === IT.honeycomb && CU_WAX[id]) { mouseR = false; const d = BL[id]; world.set(x, y, z, CU_WAX[id]); if (d.shape === 'door') { const oy = d.st.half === 'upper' ? y - 1 : y + 1; const o = world.get(x, oy, z); if (CU_WAX[o]) world.set(x, oy, z, CU_WAX[o]); }
        Particles.emit(x + 0.5, y + 0.5, z + 0.5, 10, [[1, 0.75, 0.2]], 1.5, 0.6, -1, 0.6); Sfx.play('click', 1); useHeld(1); S.swing = 1; return; }
    }
    return _ua.apply(this, arguments); }; }

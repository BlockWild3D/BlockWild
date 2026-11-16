// ================= HAND-DRAWN EXTRAS: blocks and states that exist because the owner drew a texture for them =================
// Lit furnaces: while a furnace, smoker or blast furnace is burning it is swapped for a lit twin that shows the drawn "_on" front
// and gives off light; it swaps back when the fire goes out. The twin keeps the same position, so the furnace inventory is untouched.
const FURN_LIT = new Map(), FURN_UNLIT = new Map();
for (const [base, front] of [['furnace', 'furnace_front_on'], ['smoker', 'smoker_front_on'], ['blast_furnace', 'blast_furnace_front_on']]) {
  const b = B[base.toUpperCase()]; if (b === undefined || TILE[front] === undefined) continue; const d = BL[b];
  const tex = Object.assign({}, typeof d.tex === 'object' ? d.tex : { s: d.tex }, { pz: front });
  const o = Object.assign({}, d, { tex, light: 13 / 15, drop: base, hidden: true }); delete o.id; delete o.key; delete o.texIds; delete o.name;
  const id = defBlock('lit_' + base, d.name, o);
  SOLID[id] = BL[id].solid ? 1 : 0; OPAQUE[id] = BL[id].opaque ? 1 : 0; PLANT[id] = 0; LIGHT[id] = BL[id].light;
  FURN_LIT.set(b, id); FURN_UNLIT.set(id, b);
}
function furnLitSync(k, f) {
  const [x, y, z] = k.split(',').map(Number); const id = world.get(x, y, z); const on = f.burn > 0;
  if (on && FURN_LIT.has(id)) world.set(x, y, z, FURN_LIT.get(id)); else if (!on && FURN_UNLIT.has(id)) world.set(x, y, z, FURN_UNLIT.get(id));
}

// Glass pane edges: the drawn "_top" texture goes on the top and bottom of every pane
for (const c of ['', ...COLORDATA().map(c => c[0] + '_stained_')]) {
  const key = c ? c + 'glass_pane' : 'glass_pane', t = TILE[(c || '') + 'glass_pane_top']; if (t === undefined) continue;
  for (const d of BL) if (d && d.texIds && (d.key === key || d.fam === key || (d.key && d.key.startsWith(key + '#')))) { d.texIds = d.texIds.slice(); d.texIds[2] = d.texIds[3] = t; }
}
// Extra top and bottom faces (tile "x_<block>_<top|bottom>"); blocks that turn (facing / axis) are left alone
const PAINT_FACE_SKIPPED = [];
for (const n in TILE) { const m = /^x_(.+)_(top|bottom)$/.exec(n); if (!m) continue;
  const key = { dried_kelp: 'dried_kelp_block' }[m[1]] || m[1]; const fi = m[2] === 'top' ? 2 : 3;
  const F = typeof FAMILY !== 'undefined' ? FAMILY[key] : null; if (F && F.props.some(p => /facing|axis|rot/.test(p))) { PAINT_FACE_SKIPPED.push(key); continue; }
  for (const d of BL) if (d && d.texIds && (d.key === key || d.fam === key || d.key === 'lit_' + key || (d.key && d.key.startsWith(key + '#')))) { d.texIds = d.texIds.slice(); d.texIds[fi] = TILE[n]; } }
// Flower pots: azalea bushes get their drawn top, sides and inner plant; potted roots use their drawn "_pot" texture
for (const [pk, k] of [['potted_azalea', 'potted_azalea_bush'], ['potted_flowering_azalea', 'potted_flowering_azalea_bush']]) {
  const d = BL[B[pk.toUpperCase()]]; const side = TILE[k + '_side'], top = TILE[k + '_top'], plant = TILE[k + '_plant']; if (!d || side === undefined) continue;
  d.texIds = [side, side, top, top, side, side];
  const bx = [[5, 0, 5, 11, 6, 11, TILE.flower_pot], [6, 4, 6, 10, 4.1, 10, TILE.dirt], [4, 6, 4, 12, 14, 12], [4, 4, 8, 12, 12, 8.02, plant], [8, 4, 4, 8.02, 12, 12, plant]];
  d.boxes = d.rb = bx;
}
for (const r of ['crimson_roots', 'warped_roots']) { const d = BL[B[('potted_' + r).toUpperCase()]]; const t = TILE[r + '_pot']; if (!d || t === undefined) continue;
  const old = BL[B[r.toUpperCase()]] ? BL[B[r.toUpperCase()]].texIds[0] : -1; d.boxes = d.rb = d.boxes.map(b => b[6] === old ? b.slice(0, 6).concat([t]) : b); }

// ================= BLOCK-ENTITY LOOKS FROM THE OWNER'S ARCHIVE.ZIP =================
// ---------- chests: Minecraft's 14x14x14 box with a latch, faces cut from the owner's chest skins ----------
// (normal, trapped, ender and the four copper stages; tiles bwchest_<kind>_<side|front|top|bottom|latch>)
{
  const KIND = { chest: ['chest_front', 'chest_side', 'chest_top'], trapped_chest: ['trapped_chest_front', 'trapped_chest_side', 'chest_top'], ender_chest: ['ender_chest_front', 'ender_chest_side', 'ender_chest_top'] };
  for (let a = 0; a < 4; a++) KIND['copper_chest' + a] = ['copper_chest_front' + a, 'copper_chest_side' + a, 'copper_chest_top' + a];
  const LATCH = { 0: [15, 7, 7, 16, 11, 9], 1: [0, 7, 7, 1, 11, 9], 4: [7, 7, 15, 9, 11, 16], 5: [7, 7, 0, 9, 11, 1] };
  for (const [k, [fr, sd, tp]] of Object.entries(KIND)) {
    const n = (f) => TILE['bwchest_' + k + '_' + f]; if (n('front') === undefined || TILE[fr] === undefined) continue;
    const map = { [TILE[fr]]: n('front'), [TILE[sd]]: n('side'), [TILE[tp]]: n('top') };
    for (const d of BL) { if (!d || !d.texIds || (d.render && d.render !== 'cube')) continue; const fi = d.texIds.indexOf(TILE[fr]); if (fi < 0 || !LATCH[fi]) continue;
      // a block counts as this chest only if its sides are this chest's sides too (trapped chests share the normal top)
      if (!d.texIds.includes(TILE[sd])) continue;
      d.texIds = d.texIds.map(t => map[t] !== undefined ? map[t] : t); d.texIds[3] = n('bottom');
      d.render = 'boxes'; d.boxes = d.rb = [[1, 0, 1, 15, 14, 15], LATCH[fi].concat([n('latch')])]; d.opaque = false; OPAQUE[d.id] = 0; }
  }
}

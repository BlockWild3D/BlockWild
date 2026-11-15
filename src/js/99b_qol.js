// ================= THROWING ITEMS AWAY FROM THE INVENTORY =================
// Like Minecraft: with an item on the cursor, click outside the inventory window to throw it (left click throws the
// whole stack, right click throws one). With the mouse over a slot, the drop key (Q) throws one item from that slot
// and Ctrl+Q throws the whole stack.
function tossStack(stack, n) { const d = lookDir(); const e = player.eye(); const it = dropItem(stack.id, n, e.x + d.x * 0.4, e.y - 0.3 + d.y * 0.4, e.z + d.z * 0.4, false, xtra(stack));
  if (it && it.vel) { it.vel.set(d.x * 6, d.y * 6 + 2, d.z * 6); it.pickDelay = 1.5; } Sfx.play('pop', 0.4, 0.8); }
$('inv').addEventListener('pointerdown', (e) => {
  if (e.target !== $('inv') || !S.uiOpen || !S.cursor || player.dead) return; e.preventDefault(); e.stopPropagation();
  const c = S.cursor; const n = e.button === 2 ? 1 : c.count; tossStack(c, n); c.count -= n; if (c.count <= 0) S.cursor = null; invDirty(); renderInvUI(); });
$('inv').addEventListener('contextmenu', (e) => { if (e.target === $('inv')) e.preventDefault(); });
addEventListener('keydown', (e) => {
  if (!S.uiOpen || !S.hoverSlot || player.dead || (e.target && e.target.tagName === 'INPUT') || !isKey(e.code, 'drop') || S.cursor) return;
  const [cont, idx] = S.hoverSlot; if (cont === 'out' || cont === 'trade') return; const arr = contArr(cont); const s = arr && arr[idx]; if (!s) return;
  e.preventDefault(); const n = e.ctrlKey || e.metaKey ? s.count : 1; tossStack(s, n); s.count -= n; if (s.count <= 0) arr[idx] = null;
  if (cont === 'chest' && typeof contChanged === 'function' && S.openCont) contChanged(S.openCont); invDirty(); renderInvUI(); }, true);
// ================= THIN BLOCKS NEED SOMETHING UNDER THEM =================
// Snow layers, carpets, moss carpets, leaf litter, wildflowers and pink petals pop off (and drop) when the block under
// them goes, like in Minecraft. They rest on any block that is not air, liquid or a plant.
for (const d of BL) if (d && !d.support && (!d.shape || d.shape === 'layer') && /^(snow(#\d+)?|\w+_carpet(#\w+)?|leaf_litter(#\w+)?|wildflowers(#\w+)?|pink_petals(#\w+)?)$/.test(d.key || '')) d.support = 'rest';
{ const _ss = shapeSupported; shapeSupported = function (x, y, z, id) { const d = BL[id];
    if (d && d.support === 'rest') { const b = world.get(x, y - 1, z); const bd = BL[b]; return !!(b && bd && !bd.fluid && !PLANT[b] && bd.render !== 'cross'); }
    return _ss.apply(this, arguments); }; }
// ================= GETTING INTO BOATS AND MINECARTS =================
// Right-click a boat or minecart to get in, whatever you are holding: this runs before every other right-click action,
// so a held block, food or tool no longer gets used on the ground behind it instead. The click boxes are a bit bigger
// than the models so they are easy to hit. Sneak + right-click still uses your item.
{ const _br = boatRay; boatRay = function (eye, dir, best) { let hit = null; for (const b of G.boats) { if (b.dim !== world.dim || b === player.riding) continue;
      const t = rayAABB(eye, dir, new V3(b.pos.x - b.hw - 0.15, b.pos.y - 0.1, b.pos.z - b.hw - 0.15), new V3(b.pos.x + b.hw + 0.15, b.pos.y + 0.9, b.pos.z + b.hw + 0.15));
      if (t >= 0 && t < best && (!target || t < target.dist + 0.3)) { best = t; hit = b; } } return hit; }; }
{ const _cr = cartRay; cartRay = function (eye, dir, maxT) { let best = null, bt = maxT; for (const c of G.carts) { if (c.dim !== world.dim || c === player.riding) continue;
      const t = rayAABB(eye, dir, new V3(c.pos.x - 0.62, c.pos.y - 0.05, c.pos.z - 0.62), new V3(c.pos.x + 0.62, c.pos.y + 0.95, c.pos.z + 0.62)); if (t >= 0 && t < bt) { bt = t; best = c; } } return best ? { c: best, t: bt } : null; }; }
{ const _ua = useAction; useAction = function (eye, dir) {
    if (!player.riding && !player.dead && !isSpec() && !kd('sneak')) {
      if (typeof targetBoat !== 'undefined' && targetBoat) { mouseR = false; mountBoat(targetBoat); return; }
      if (typeof targetCart !== 'undefined' && targetCart && !targetCart.kind) { mouseR = false; const c = targetCart; if (c.chest) openCartChest(c); else mountCart(c); return; } }
    return _ua.apply(this, arguments); }; }
// ================= ENTITY PUSHING AND CRAMMING =================
// Mobs push each other (and you) apart instead of standing inside one another. If more than maxEntityCramming (24)
// mobs are squeezed into each other, they take 6 damage every half second, like Minecraft's entity cramming.
const CRAM = { t: 0 };
function crowdTick(dt) {
  if (!('maxEntityCramming' in S.rules)) S.rules.maxEntityCramming = 24;
  const ms = G.mobs.filter(m => !m.dead && !m.gone && !m.vSleep && !m.mountOf && !(m.mobRiders && m.mobRiders.length) && m !== player.riding && !m.noPush && m.t && !m.t.noPush && !m.t.fly); if (!ms.length) return;
  const grid = new Map(); const k = (x, z) => (x + 4096) * 8192 + (z + 4096);
  for (const m of ms) { const key = k(Math.floor(m.pos.x), Math.floor(m.pos.z)); let a = grid.get(key); if (!a) grid.set(key, a = []); a.push(m); }
  const cram = (CRAM.t += dt) >= 0.5; if (cram) CRAM.t = 0; const lim = S.rules.maxEntityCramming;
  for (const m of ms) { const cx = Math.floor(m.pos.x), cz = Math.floor(m.pos.z); const hw = m.hw || 0.3; let touching = 0;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const a = grid.get(k(cx + dx, cz + dz)); if (!a) continue;
      for (const o of a) { if (o === m) continue; const ow = o.hw || 0.3; const ox = m.pos.x - o.pos.x, oz = m.pos.z - o.pos.z; const reach = hw + ow;
        if (Math.abs(ox) >= reach || Math.abs(oz) >= reach || m.pos.y >= o.pos.y + (o.h || 1) || o.pos.y >= m.pos.y + (m.h || 1)) continue; touching++;
        const d = Math.hypot(ox, oz) || 0.01; const push = Math.min(1, (reach - d) / reach) * 6 * dt; m.vel.x += ox / d * push; m.vel.z += oz / d * push; } }
    if (cram && lim > 0 && touching >= lim && isSurvMobDamage()) m.hurt(6, 'cramming', 0); }
  // mobs nudge you, and you nudge them
  const P = player; if (!P.dead && !P.riding && !isSpec() && !P.flying) for (const m of ms) { const ox = P.pos.x - m.pos.x, oz = P.pos.z - m.pos.z; const reach = P.hw + (m.hw || 0.3);
    if (Math.abs(ox) >= reach || Math.abs(oz) >= reach || P.pos.y >= m.pos.y + (m.h || 1) || m.pos.y >= P.pos.y + 1.8) continue; const d = Math.hypot(ox, oz) || 0.01; const push = Math.min(1, (reach - d) / reach) * 4 * dt;
    P.vel.x += ox / d * push * 0.6; P.vel.z += oz / d * push * 0.6; m.vel.x -= ox / d * push; m.vel.z -= oz / d * push; }
}
const isSurvMobDamage = () => !isClientMP();
{ const _us = updateSpawning; updateSpawning = function (dt) { const r = _us.apply(this, arguments); if (world && !S.loading) crowdTick(dt); return r; }; }
DEATH_YOU.cramming = 'You were squished too much';

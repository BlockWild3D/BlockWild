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
  const ms = G.mobs.filter(m => m.vel && !m.isBoss && !m.isCrystal && !m.dead && !m.gone && !m.vSleep && !m.mountOf && !(m.mobRiders && m.mobRiders.length) && m !== player.riding && !m.noPush && m.t && !m.t.noPush && !m.t.fly); if (!ms.length) return;
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
// ================= VOICES FOR THE NEWER MOBS =================
// [ambient, hurt, death], built from the same voice parts as the rest (68_voices.js)
Object.assign(MOB_VOICE, {
  blub: [(d, p) => { V.bubble(d, p * 1.5); V.chime(d, p * 0.8, [660, 880, 990]); }, (d, p) => V.squeak(d, p * 0.7, 0, 0.12), (d, p) => V.chime(d, p * 0.7, [990, 880, 660, 440])],
  sulfur_cube: [(d, p) => { V.bubble(d, p * 0.55); Voice.noise(d, { at: 0.12, len: 0.18, freq: 380 * p, q: 1.5, env: [[0.02, 0.8], [0.18, 0]] }); }, (d, p) => Voice.noise(d, { len: 0.22, freq: 520 * p, q: 1.3, env: [[0.01, 1], [0.22, 0]] }), (d, p) => { V.bubble(d, p * 0.4); Voice.noise(d, { len: 0.5, freq: 300 * p, q: 1.1, env: [[0.01, 1], [0.5, 0]] }); }],
  frostbite: [(d, p) => { V.grumble(d, p * 0.7, 0.7); V.scrape(d, p * 1.6, 0.25); }, (d, p) => { V.grumble(d, p * 0.9, 0.3); V.chitter(d, p * 1.2, 3); }, (d, p) => { V.grumble(d, p * 0.6, 1.0); V.scrape(d, p * 2, 0.5); }],
  nautilus: [(d, p) => { V.bubble(d, p * 0.8); V.clickTrain(d, p * 0.5); }, (d, p) => V.bubble(d, p * 1.3), (d, p) => { V.bubble(d, p * 0.6); V.flop(d, p * 0.7); }],
  zombie_nautilus: [(d, p) => { V.bubble(d, p * 0.6); V.grumble(d, p * 0.6, 0.5); }, (d, p) => V.grumble(d, p * 0.9, 0.3), (d, p) => { V.grumble(d, p * 0.5, 0.9); V.bubble(d, p * 0.5); }],
  ghastling: [(d, p) => V.whine(d, p * 1.1, 0.35), (d, p) => V.whine(d, p * 1.4, 0.25), (d, p) => V.whine(d, p * 0.9, 0.8)],
  happy_ghast: [(d, p) => { Voice.tone(d, { len: 0.9, wave: 'sine', pitch: [[0, 330 * p], [0.4, 420 * p], [0.9, 300 * p]], vib: [5, 12], env: [[0.15, 0.7], [0.6, 0.5], [0.9, 0]] }); }, (d, p) => V.whine(d, p * 0.8, 0.4), (d, p) => V.whine(d, p * 0.6, 1.2)],
  camel_husk: [(d, p) => V.grumble(d, p * 0.55, 0.8), (d, p) => V.grumble(d, p * 0.8, 0.35), (d, p) => V.roar(d, p * 1.3, 0.9)],
  skeleton_horse: [(d, p) => { V.neigh(d, p * 1.25); V.scrape(d, p * 1.4, 0.2); }, (d, p) => V.snortHorse(d, p * 1.3), (d, p) => V.neigh(d, p * 0.8)],
  zombie_horse: [(d, p) => { V.neigh(d, p * 0.75); V.grumble(d, p * 0.6, 0.4); }, (d, p) => V.snortHorse(d, p * 0.8), (d, p) => V.neigh(d, p * 0.6)],
  copper_golem: [(d, p) => { V.chime(d, p * 0.9, [740, 988]); }, (d, p) => V.clank(d, p * 1.6, false), (d, p) => V.clank(d, p * 1.2, true)],
  illusioner: [(d, p) => V.grumble(d, p * 0.95, 0.45), (d, p) => V.grumble(d, p * 1.2, 0.25), (d, p) => V.grumble(d, p * 0.8, 0.9)],
});
// ================= FASTER START-UP =================
// Icons and the creative list are built when first needed (see lazyIcon in 01_core.js). Build the creative list when
// its tab is shown, and draw the remaining icons a few at a time while the game is idle so the list opens quickly.
{ const _rui = renderInvUI; renderInvUI = function () { if (S.uiOpen && invTab === 'creative' && !PALETTE_READY) buildPalette(($('creativeSearch') || {}).value || ''); return _rui.apply(this, arguments); }; }
{ let k = 0; const step = (dl) => { if (!S.started || S.loading) { setTimeout(() => step(null), 1500); return; }
    const until = performance.now() + (dl && dl.timeRemaining ? Math.min(12, dl.timeRemaining()) : 6);
    while (k < ITEM_IDS.length && performance.now() < until) { const id = ITEM_IDS[k++]; try { void ICON[id]; } catch (e) { } }
    if (k < ITEM_IDS.length) (window.requestIdleCallback || ((f) => setTimeout(f, 30)))(step); };
  setTimeout(() => step(null), 3000); }
// something you can get into or onto is under the crosshair (and you aren't sneaking): right-click rides it, whatever
// is in either hand. Without this a shield in the off-hand raised itself, and other off-hand items got used, instead.
function rideTargetNow() {
  if (player.riding || player.dead || S.uiOpen || kd('sneak') || S.mode === 'spectator') return false;
  if (typeof targetBoat !== 'undefined' && targetBoat) return true;
  if (typeof targetCart !== 'undefined' && targetCart) return true;
  try { const eye = player.eye(), dir = lookDir(); const blk = raycast(eye, dir, 4.5); const c = cartRay(eye, dir, blk ? blk.dist : 4.5); if (c) return true; } catch (e) { }
  const m = typeof targetMob !== 'undefined' ? targetMob : null;
  return !!(m && !m.dead && (m.hg || m.saddled || /^(horse|donkey|mule|camel|camel_husk|skeleton_horse|zombie_horse|pig|strider|happy_ghast|nautilus|zombie_nautilus|llama)$/.test(m.type)));
}
// Is there something under the crosshair that a right-click uses (a bed, a door, a lever, a workstation, a villager,
// a pet, a boat...)? If so that comes first, as in Minecraft: an off-hand shield doesn't raise and an off-hand item
// isn't used instead. Sneak to skip it (then the shield raises / the off-hand item is used).
const INTERACT_RE = /(^|_)(bed|door|trapdoor|fence_gate|button|lever|crafting_table|anvil|grindstone|stonecutter|loom|smithing_table|cartography_table|fletching_table|enchanting_table|furnace|smoker|chest|barrel|shulker_box|hopper|dropper|dispenser|crafter|brewing_stand|beacon|bell|note_block|jukebox|lectern|repeater|comparator|daylight_detector|cake|sign|respawn_anchor|composter|cauldron|command_block|structure_block|shelf|flower_pot|item_frame|armor_stand|vault|decorated_pot|chiseled_bookshelf|candle|campfire|beehive|bee_nest|lodestone|trial_spawner)(_|$|#)/;
const INTERACT_ID = new Map();
function blockInteracts(id) { let v = INTERACT_ID.get(id); if (v === undefined) { const d = BL[id]; v = !!(d && (d.use || d.bed || d.bedPart || d.door || d.sign || d.anchor !== undefined || d.cmdBlock || d.structBlock || INTERACT_RE.test(String(d.fam || d.key || '').replace(/#.*/, '')) || INTERACT_RE.test(String(d.key || '')))); INTERACT_ID.set(id, v); } return v; }
function interactTargetNow() {
  if (player.dead || S.uiOpen || kd('sneak') || S.mode === 'spectator') return false;
  if (rideTargetNow()) return true;
  const m = typeof targetMob !== 'undefined' ? targetMob : null;
  if (m && !m.dead) { if (/villager|trader/.test(m.type) || m.tamed || m.owner) return true; if (m.t && m.t.kind !== 'hostile' && !m.isBoss && player.inv[player.sel]) return true; return false; }
  return !!(typeof target !== 'undefined' && target && blockInteracts(target.id));
}
// ================= THE PAUSE BETWEEN BLOCKS (Minecraft) =================
// Break times already follow Minecraft's formula exactly (stone: 7.5 s by hand, 1.15 wood, 0.6 stone, 0.4 iron, 0.3
// diamond, 0.25 netherite, 0.2 gold). What was missing is the 5 tick (quarter second) pause Minecraft puts between
// one block breaking and the next one starting while you hold the button, in Survival and in Creative. Blocks that
// break instantly don't cause the pause, and letting go of the button clears it.
{ const _bt = breakTime; breakTime = function (id, tool) { const t = _bt.apply(this, arguments); S.lastBt = t; return t; }; }
{ const _bb = breakBlock; breakBlock = function (x, y, z) { const r = _bb.apply(this, arguments); if (mouseL && (S.mode === 'creative' || S.lastBt > 0.051)) S.breakDelay = 0.25; return r; }; }
{ const _ui = updateInteraction; updateInteraction = function (dt) {
    if (!mouseL) S.breakDelay = 0;
    if (S.breakDelay > 0) { S.breakDelay -= dt; const mob = typeof targetMob !== 'undefined' && targetMob; if (!mob) { const ml = mouseL; mouseL = false; S.mineT = 0; try { return _ui.apply(this, arguments); } finally { mouseL = ml; } } }
    return _ui.apply(this, arguments); }; }

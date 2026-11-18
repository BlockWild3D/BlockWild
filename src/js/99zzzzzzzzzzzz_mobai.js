// ================= MOB AI: Minecraft Java pathfinding and goals, rewritten for this engine =================
// Before this, a mob turned to face what it wanted and walked straight at it, hopping or veering at random when a wall
// was in the way, and wandered by picking a random direction. Now ground mobs work the way Minecraft Java's do:
//
// PATHFINDING (WalkNodeEvaluator + PathFinder): an A* search over block cells sized to the mob (a 0.6 wide, 1.95 tall
// zombie fills 1x2x1 cells, an iron golem 2x3x2). From a cell a mob can step to the 8 cells around it, jump up one
// block (no higher than 1.125 above its floor, so never onto fences or walls), or drop down as far as it is willing
// to fall: 3 blocks normally, more when chasing something at high health (3 + health - a third of max health,
// minus 4 per difficulty step below Hard). Every cell gets a type with a cost: lava, cactus, berry bushes, powder snow,
// leaves, fences, walls and closed doors are off limits; water costs 8, standing next to water, fire, lava or cactus
// costs 8, fire and magma cost 16. Diagonal steps need both side cells open. A search visits at most 16 cells per block
// of follow range and walks no farther than that range; if it can't reach the goal it goes to the closest cell it found.
// PATH FOLLOWING (PathNavigation, MoveControl): a mob counts a cell as reached within max(width/2, 0.75 - width/2)
// blocks, cuts corners the way Minecraft does, jumps when the next cell is higher, gives up a path when it hasn't made
// progress in 5 seconds or takes 3 times too long to reach the next cell. Any ground mob, whatever is moving it, also
// refuses to walk off a drop deeper than it is willing to fall, or into lava, fire, cactus or powder snow.
// GOALS:
//  - Wandering (WaterAvoidingRandomStrollGoal): on average every 6 seconds a mob picks the best of 10 random spots
//    within 10 blocks across and 7 up or down that it could stand on (not in water), and walks there. Animals prefer
//    grass and light, monsters prefer the dark. Monsters more than 32 blocks from you stop wandering, like Minecraft.
//  - Panic (PanicGoal): a hurt animal runs to random spots within 5 blocks for 2 seconds, then finishes the last run.
//  - Keeping away (AvoidEntityGoal): a mob that is fleeing from something heads for a spot up to 16 blocks away from it.
//  - Targeting (NearestAttackableTargetGoal, HurtByTargetGoal): a monster has to SEE you to notice you, within its
//    follow range (16 blocks; zombies, husks, drowned and zombie villagers 35). It forgets you after 3 seconds out of
//    sight; one that is angry at you (hit by you) keeps after you for 15 seconds out of sight. Hitting a zombie (or husk,
//    drowned, zombie villager) brings every zombie within 35 blocks that has nothing better to do.
//  - Chasing (MeleeAttackGoal): monsters path to you, recomputing every 0.2-0.5 seconds as you move (slower when far).
//  - Skeletons, strays, bogged, parched and illusioners (RangedBowAttackGoal): close in until they've seen you for a
//    second within 15 blocks, then stop and strafe, switching direction now and then, backing off inside 7.5 blocks.
//    Pillagers (RangedCrossbowAttackGoal) stop within 8 blocks and shoot.
//  - Creepers (SwellGoal): start to swell within 3 blocks, keep swelling while you are within 7 and in sight, and
//    de-swell at the same rate otherwise.
//  - Spiders (LeapAtTargetGoal) leap at you from 2 to 4 blocks away.
//  - Mob against mob: zombies go after villagers, wandering traders and iron golems; skeletons, and spiders in the
//    dark, go after iron golems; wither skeletons after piglins and piglins after wither skeletons; any monster hit by
//    a mob fights back. Wild wolves also hunt sheep and foxes (they already hunted skeletons and rabbits), foxes hunt
//    chickens and rabbits, cats hunt rabbits and ocelots hunt chickens.
// Mob-specific brains (villagers, piglins, the warden...) keep their own logic but walk along these paths too, since
// everything that steers a mob toward something (steerTo) now pathfinds.

// ---------- cell types ----------
const PT_OPEN = 0, PT_BLOCKED = 1, PT_WATER = 2, PT_LAVA = 3, PT_FIRE = 4, PT_DAMAGING = 5, PT_POWDER = 6, PT_FENCE = 7, PT_LEAVES = 8,
  PT_DOOR_C = 9, PT_DOOR_O = 10, PT_TRAPDOOR = 11, PT_CAUTIOUS = 12, PT_HONEY = 13, PT_WALKABLE = 14, PT_WATER_BORDER = 15, PT_FIRE_N = 16, PT_DAMAGING_N = 17;
//                 OPEN BLK WAT LAVA FIRE DMG POW FEN LEAF DOORC DOORO TRAP CAUT HONEY WALK WBORD FIREN DMGN
const PT_MALUS = [0, -1, 8, -1, 16, -1, -1, -1, -1, -1, 0, 0, 0, 8, 0, 8, 8, 8];
// per block id: bits 0-4 raw type, bit 5 "has collision taller than 1/4 block", bits 6-10 collision top in 1/16
const PT_INFO = new Int16Array(ITEM_BASE).fill(-1);
function ptInfo(id) {
  let v = PT_INFO[id]; if (v >= 0) return v;
  const d = BL[id]; let raw = PT_OPEN, top = 0;
  if (id && d) {
    const k = (d.key || '').split('#')[0];
    if (SHAPED[id]) { if (!d.noCollide) { try { for (const b of shapeBoxes(id, 0, 64, 0, () => 0, 'c')) top = Math.max(top, b[4] / 16); } catch (e) { top = 1; } } }
    else if (SOLID[id]) top = 1;
    if (FKIND[id] === 2) raw = PT_LAVA;
    else if (/^(soul_)?fire$|^magma_block$|^(soul_)?campfire/.test(k)) raw = PT_FIRE;
    else if (/^cactus$|^sweet_berry_bush/.test(k)) raw = PT_DAMAGING;
    else if (k === 'powder_snow') raw = PT_POWDER;
    else if (/^wither_rose$|^pointed_dripstone/.test(k)) raw = PT_CAUTIOUS;
    else if (k === 'honey_block') raw = PT_HONEY;
    else if (d.shape === 'door') raw = d.st && d.st.open ? PT_DOOR_O : PT_DOOR_C;
    else if (d.shape === 'trapdoor' || k === 'lily_pad') raw = PT_TRAPDOOR;
    else if (/leaves$/.test(k)) raw = PT_LEAVES;
    else if (d.shape === 'fence' || d.shape === 'wall' || (d.shape === 'gate' && !(d.st && d.st.open))) raw = PT_FENCE;
    else if (top > 0.25) raw = PT_BLOCKED;
    else if (FKIND[id] === 1) raw = PT_WATER;
  }
  v = raw | (top > 0.25 ? 32 : 0) | (Math.min(31, Math.round(top * 16)) << 6); PT_INFO[id] = v; return v;
}
// block id at a cell, with the last chunk remembered (most lookups are next to the previous one)
let MAI_lcx = 1e9, MAI_lcz = 1e9, MAI_lc = null, MAI_lw = null;
function maiId(x, y, z) {
  if (y < 0) return B.BEDROCK; if (y >= WH) return 0; const w = G.world; const cx = x >> 4, cz = z >> 4;
  if (cx !== MAI_lcx || cz !== MAI_lcz || w !== MAI_lw) { MAI_lcx = cx; MAI_lcz = cz; MAI_lw = w; MAI_lc = w.chunks.get(ckey(cx, cz)); }
  return MAI_lc ? MAI_lc.d[(y * 16 + (z & 15)) * 16 + (x & 15)] : -1;
}
function maiCell(x, y, z) { const id = maiId(x, y, z); return id < 0 ? (PT_BLOCKED | 32 | (16 << 6)) : ptInfo(id); }
const maiTop = (c) => ((c >> 6) & 31) / 16;
function maiResetCache() { MAI_lcx = 1e9; MAI_lw = null; }

// ---------- one search's view of the world (WalkNodeEvaluator) ----------
const MAI = { budget: 0, frame: -1, stats: { searches: 0, nodes: 0 } };
function maiStand(S, x, y, z) { // the type of a cell for a mob whose feet are in it (getPathTypeStatic)
  const k = ((x - S.ox) * 2048 + (z - S.oz)) * 1024 + y; let t = S.stand.get(k); if (t !== undefined) return t;
  const c = maiCell(x, y, z); const raw = c & 31;
  if (c & 32) t = PT_MALUS[raw] < 0 ? raw : PT_BLOCKED;
  else if (raw !== PT_OPEN) t = raw;
  else {
    const b = maiCell(x, y - 1, z), braw = b & 31;
    if (!(b & 32) && !(maiTop(c) > 0)) t = PT_OPEN;
    else if (braw === PT_FIRE) t = PT_FIRE; else if (braw === PT_DAMAGING) t = PT_DAMAGING; else if (braw === PT_HONEY) t = PT_HONEY;
    else if (braw === PT_TRAPDOOR || braw === PT_FENCE) t = PT_WALKABLE;
    else {
      t = PT_WALKABLE;
      scan: for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) continue; const r = maiCell(x + dx, y + dy, z + dz) & 31;
        if (r === PT_DAMAGING) { t = PT_DAMAGING_N; break scan; } if (r === PT_FIRE || r === PT_LAVA) { t = PT_FIRE_N; break scan; }
        if (r === PT_WATER) { t = PT_WATER_BORDER; break scan; } if (r === PT_CAUTIOUS) { t = PT_CAUTIOUS; break scan; }
      }
    }
  }
  S.stand.set(k, t); return t;
}
function maiMal(S, t) { if (S.fireproof && (t === PT_FIRE || t === PT_FIRE_N)) return 0; return PT_MALUS[t]; }
function maiMobType(S, x, y, z) { // the type for the whole mob standing with its lowest corner at x,y,z (getPathTypeOfMob)
  const k = ((x - S.ox) * 2048 + (z - S.oz)) * 1024 + y; let t = S.mob.get(k); if (t !== undefined) return t;
  let allOpen = true, best = -1, bm = -2;
  out: for (let dy = 0; dy < S.H; dy++) for (let dx = 0; dx < S.W; dx++) for (let dz = 0; dz < S.W; dz++) {
    let tt;
    if (dy === 0) tt = maiStand(S, x + dx, y, z + dz);
    else { const c = maiCell(x + dx, y + dy, z + dz); const r = c & 31; tt = (c & 32) ? (PT_MALUS[r] < 0 ? r : PT_BLOCKED) : (r === PT_WATER || r === PT_FIRE || PT_MALUS[r] < 0 ? r : PT_OPEN); }
    const m = maiMal(S, tt); if (m < 0) { best = tt; bm = m; break out; }
    if (dy === 0 && tt !== PT_OPEN) allOpen = false;
    if (tt !== PT_OPEN && m > bm) { bm = m; best = tt; }
  }
  if (bm < 0 && best >= 0) t = best; else if (allOpen) t = PT_OPEN; else t = best < 0 ? PT_WALKABLE : best;
  S.mob.set(k, t); return t;
}
function maiFloor(S, x, y, z) { // height the mob would stand at (getFloorLevel)
  const c = maiCell(x, y, z); if (S.canFloat && (c & 31) === PT_WATER) return y + 0.5;
  const b = maiCell(x, y - 1, z); return Math.max(y - 1 + ((b & 32) || (b & 31) !== PT_OPEN ? maiTop(b) : 0), y + ((c & 32) ? 0 : maiTop(c)));
}
function maiNode(S, x, y, z, t, mal) {
  const k = ((x - S.ox) * 2048 + (z - S.oz)) * 1024 + y; let n = S.nodes.get(k);
  if (!n) { n = { x, y, z, k, t, mal, g: 0, h: 0, f: 0, walked: 0, prev: null, closed: false, hi: -1 }; S.nodes.set(k, n); }
  else if (mal > n.mal) { n.mal = mal; n.t = t; }
  return n;
}
function maiClear(S, x, y, z) { for (let dx = 0; dx < S.W; dx++) for (let dz = 0; dz < S.W; dz++) { const c = maiCell(x + dx, y, z + dz); if ((c & 32) || PT_MALUS[c & 31] < 0) return false; } return true; }
function maiGround(S, x, y, z) { // tryFindFirstGroundNodeBelow
  for (let cy = y - 1; cy >= 0; cy--) { if (y - cy > S.maxFall) return null; const t = maiMobType(S, x, cy, z);
    if (t !== PT_OPEN) { const m = maiMal(S, t); return m >= 0 ? maiNode(S, x, cy, z, t, m) : null; } }
  return null;
}
function maiAccept(S, x, y, z, jump, F, from) { // findAcceptedNode
  if (maiFloor(S, x, y, z) - F > 1.125) return null;
  const t = maiMobType(S, x, y, z); const m = maiMal(S, t); let best = m >= 0 ? maiNode(S, x, y, z, t, m) : null;
  if (t === PT_WALKABLE || t === PT_WATER) return best;
  if (!best && jump > 0 && t !== PT_FENCE && t !== PT_TRAPDOOR && t !== PT_POWDER) { if (maiClear(S, from.x, from.y + S.H, from.z)) best = maiAccept(S, x, y + 1, z, jump - 1, F, from); }
  else if (t === PT_OPEN) best = maiGround(S, x, y, z);
  return best;
}
const MAI_DIRS = [[0, 1], [-1, 0], [0, -1], [1, 0]]; // south, west, north, east; the next one is clockwise
function maiNeighbors(S, n, out) {
  let p = 0; const F = maiFloor(S, n.x, n.y, n.z); const nb = S.nb;
  for (let d = 0; d < 4; d++) { const o = maiAccept(S, n.x + MAI_DIRS[d][0], n.y, n.z + MAI_DIRS[d][1], 1, F, n); nb[d] = o; if (o && !o.closed && o.mal >= 0) out[p++] = o; }
  for (let d = 0; d < 4; d++) { const d2 = (d + 1) & 3; const a = nb[d], b = nb[d2];
    if (!a || !b || a.y > n.y || b.y > n.y || a.t === PT_DOOR_O || b.t === PT_DOOR_O) continue;
    if (S.W > 1 && (a.mal > 0 || b.mal > 0)) continue;
    const o = maiAccept(S, n.x + MAI_DIRS[d][0] + MAI_DIRS[d2][0], n.y, n.z + MAI_DIRS[d][1] + MAI_DIRS[d2][1], 1, F, n);
    if (o && !o.closed && o.mal >= 0 && o.t !== PT_DOOR_O) out[p++] = o; }
  return p;
}
// binary heap on f
function heapPush(H, n) { n.hi = H.length; H.push(n); heapUp(H, n.hi); }
function heapUp(H, i) { const n = H[i]; while (i > 0) { const p = (i - 1) >> 1; if (H[p].f <= n.f) break; H[i] = H[p]; H[i].hi = i; i = p; } H[i] = n; n.hi = i; }
function heapPop(H) { const top = H[0]; const last = H.pop(); if (H.length) { let i = 0; const L = H.length; for (;;) { let c = 2 * i + 1; if (c >= L) break; if (c + 1 < L && H[c + 1].f < H[c].f) c++; if (H[c].f >= last.f) break; H[i] = H[c]; H[i].hi = i; i = c; } H[i] = last; last.hi = i; } top.hi = -1; return top; }
const maiDist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
// the mob's search setup: size, fall distance, follow range
function maiSetup(m, range, maxFall) {
  const w = m.hw * 2; return { W: Math.max(1, Math.min(3, Math.floor(w + 1))), H: Math.max(1, Math.min(4, Math.floor(m.h + 1))), w, canFloat: true, fireproof: !!m.t.fireproof,
    maxFall: maxFall == null ? 3 : maxFall, range, ox: Math.floor(m.pos.x) - 1000, oz: Math.floor(m.pos.z) - 1000, stand: new Map(), mob: new Map(), nodes: new Map(), nb: [null, null, null, null] };
}
function maiStart(S, m) { // getStart
  const bx = Math.floor(m.pos.x), bz = Math.floor(m.pos.z); let y;
  if (inWater(m, 0.1)) { y = Math.floor(m.pos.y); while ((maiCell(bx, y + 1, bz) & 31) === PT_WATER && y < WH) y++; }
  else if (m.onGround) y = Math.floor(m.pos.y + 0.5);
  else { y = Math.floor(m.pos.y + 1); while (y > 0) { const c = maiCell(bx, y - 1, bz); if ((c & 32) || (c & 31) !== PT_OPEN) break; y--; } }
  const ok = (x, z) => { const t = maiMobType(S, x, y, z); return t !== PT_OPEN && maiMal(S, t) >= 0; };
  let sx = bx, sz = bz;
  if (!ok(bx, bz)) for (const [x, z] of [[m.pos.x - m.hw, m.pos.z - m.hw], [m.pos.x - m.hw, m.pos.z + m.hw], [m.pos.x + m.hw, m.pos.z - m.hw], [m.pos.x + m.hw, m.pos.z + m.hw]]) if (ok(Math.floor(x), Math.floor(z))) { sx = Math.floor(x); sz = Math.floor(z); break; }
  // a mob wider than a block keeps its lowest corner, not its middle, on the cell
  if (S.W > 1) { sx = Math.floor(m.pos.x - S.W / 2 + 0.5); sz = Math.floor(m.pos.z - S.W / 2 + 0.5); }
  const t = maiMobType(S, sx, y, sz); return maiNode(S, sx, y, sz, t, Math.max(0, maiMal(S, t)));
}
// A* (PathFinder.findPath): returns { n: [[x, y, z, floor], ...], reached, tgt }
function maiFindPath(m, tx, ty, tz, reach, opts) {
  const S = maiSetup(m, opts.range || 16, opts.maxFall); maiResetCache();
  const maxNodes = Math.floor(Math.max(16, S.range) * 16 * (opts.mult || 1)); const maxLen = Math.max(16, S.range);
  const T = { x: Math.floor(tx), y: Math.floor(ty), z: Math.floor(tz) }; if (S.W > 1) { T.x = Math.floor(tx - S.W / 2 + 0.5); T.z = Math.floor(tz - S.W / 2 + 0.5); }
  const from = maiStart(S, m); if (!from) return null;
  from.g = 0; from.h = maiDist(from, T); from.f = from.h; let best = from, bestH = from.h; const H = []; heapPush(H, from);
  const out = new Array(16); let count = 0, reached = null;
  while (H.length) {
    if (++count >= maxNodes) break;
    const cur = heapPop(H); cur.closed = true;
    if (Math.abs(cur.x - T.x) + Math.abs(cur.y - T.y) + Math.abs(cur.z - T.z) <= reach) { reached = cur; break; }
    if (maiDist(cur, from) >= maxLen) continue;
    const nN = maiNeighbors(S, cur, out);
    for (let i = 0; i < nN; i++) { const nb = out[i]; const d = maiDist(cur, nb); const walked = cur.walked + d; const g = cur.g + d + nb.mal;
      if (walked < maxLen && (nb.hi < 0 || g < nb.g)) { nb.prev = cur; nb.g = g; nb.walked = walked; const dh = maiDist(nb, T); if (dh < bestH) { bestH = dh; best = nb; } nb.h = dh * 1.5;
        if (nb.hi >= 0) { nb.f = nb.g + nb.h; heapUp(H, nb.hi); } else { nb.f = nb.g + nb.h; heapPush(H, nb); } } }
  }
  MAI.budget -= count; MAI.stats.searches++; MAI.stats.nodes += count;
  const end = reached || best; const n = []; for (let c = end; c; c = c.prev) n.push([c.x, c.y, c.z, maiFloor(S, c.x, c.y, c.z)]); n.reverse();
  return { n, reached: !!reached, tgt: [Math.floor(tx), Math.floor(ty), Math.floor(tz)], W: S.W };
}

// ---------- navigation (PathNavigation + MoveControl) ----------
const MAI_NOPATH = new Set(['strider', 'cod', 'salmon', 'tropical_fish', 'pufferfish', 'squid', 'glow_squid', 'dolphin', 'guardian', 'elder_guardian', 'tadpole', 'ender_dragon', 'shulker']);
function maiCanPath(m) { const t = m.t; return !!t && !t.fly && t.ai !== 'magma' && !m.lavaWalk && !MAI_NOPATH.has(m.type) && !m.mountOf && !m.vSleep; }
function maiNav(m) { return m.nav || (m.nav = { p: null, i: 0, owner: null, rT: 0, last: null, chkT: 0, chkPos: null, nodeT: 0, nodeLim: 0, nodeI: -1 }); }
function maiStop(m) { if (m.nav) { m.nav.p = null; m.nav.owner = null; } }
function maiBudgetOK() { const f = G.simT; if (f !== MAI.frame) { MAI.frame = f; MAI.budget = 2400; } return MAI.budget > 0; }
// set a path to a spot; keeps the current one if it already leads to the same block (Minecraft's createPath does too)
function maiMoveTo(m, x, y, z, owner, reach, opts = {}) {
  const N = maiNav(m); const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
  if (!opts.force && N.p && N.owner === owner && N.i < N.p.n.length && N.p.tgt[0] === bx && N.p.tgt[1] === by && N.p.tgt[2] === bz) return true;
  if (!maiBudgetOK()) return !!(N.p && N.owner === owner && N.i < N.p.n.length);
  const p = maiFindPath(m, x, y, z, reach, opts);
  N.p = p && p.n.length > 1 ? p : null; N.i = 0; N.owner = owner; N.chkT = 0; N.chkPos = m.pos.clone(); N.nodeI = -1;
  return !!N.p;
}
// steer along the path: returns the heading to walk, or null when there is no path or it is finished
function maiStep(N, k) { const now = G.simT || 0; const d = N[k] == null ? 1 / 30 : Math.min(0.1, Math.max(0, now - N[k])); N[k] = now; return d; }
function maiFollow(m) {
  const N = m.nav; m.navJump = false; if (!N || !N.p) return null; const dt = maiStep(N, 'tlF'); const p = N.p; const W = p.W || 1;
  const w = m.hw * 2; const md = w > 0.75 ? w / 2 : 0.75 - w / 2;
  for (let guard = 0; guard < 3 && N.i < p.n.length; guard++) {
    const nd = p.n[N.i]; const cx = nd[0] + W * 0.5, cz = nd[2] + W * 0.5;
    if (Math.abs(m.pos.x - cx) < md && Math.abs(m.pos.z - cz) < md && Math.abs(m.pos.y - nd[3]) < 1) { N.i++; continue; }
    // cut the corner when the next cell is already the better aim (shouldTargetNextNodeInDirection)
    if (N.i + 1 < p.n.length) { const nx = p.n[N.i + 1]; const ax = cx - m.pos.x, az = cz - m.pos.z, bx = nx[0] + W * 0.5 - m.pos.x, bz = nx[2] + W * 0.5 - m.pos.z;
      const a2 = ax * ax + az * az, b2 = bx * bx + bz * bz;
      if (a2 < 4 && nd[1] === nx[1] && (b2 < a2 || a2 < 0.5) && ax * bx + az * bz < 0) { N.i++; continue; } }
    break;
  }
  if (N.i >= p.n.length) { N.p = null; return null; }
  const nd = p.n[N.i]; const tx = nd[0] + W * 0.5, tz = nd[2] + W * 0.5; const dx = tx - m.pos.x, dz = tz - m.pos.z;
  if (nd[3] - m.pos.y > 0.6 && dx * dx + dz * dz < Math.max(1, w)) m.navJump = true;
  // stuck: little progress in 5 seconds, or far too long on one cell (doStuckDetection)
  const sp = Math.max(0.5, (m.t.speed || 1) * 0.6 * (m.spMul || 1));
  N.chkT += dt; if (N.chkT > 5) { N.chkT = 0; if (N.chkPos && m.pos.distanceTo(N.chkPos) < 1.25) { N.p = null; N.failT = G.simT; return null; } N.chkPos = m.pos.clone(); }
  if (N.nodeI !== N.i) { N.nodeI = N.i; N.nodeT = 0; N.nodeLim = Math.hypot(dx, dz, nd[3] - m.pos.y) / sp; } else { N.nodeT += dt; if (N.nodeLim > 0 && N.nodeT > N.nodeLim * 3 + 1) { N.p = null; N.failT = G.simT; return null; } }
  m.navOn = true; return Math.atan2(dx, dz);
}
// head for a moving thing the way MeleeAttackGoal does: re-plan every 0.2-0.5 s if it moved a block (or 5% of the
// time anyway), less often when it is far, and wait longer after a failed plan
function maiChase(m, pos, owner, reach, opts) {
  const N = maiNav(m); const dt = maiStep(N, 'tlC'); N.rT -= dt; if (N.owner !== owner) N.rT = 0;
  if (N.rT <= 0 && (!N.last || N.owner !== owner || pos.distanceToSquared(N.last) >= 1 || Math.random() < 0.05)) {
    const d2 = pos.distanceToSquared(m.pos); N.rT = (4 + Math.random() * 7) / 20 + (d2 > 1024 ? 0.5 : d2 > 256 ? 0.25 : 0);
    N.last = pos.clone(); if (!maiMoveTo(m, pos.x, pos.y + 0.01, pos.z, owner, reach || 0, opts)) N.rT += 0.75;
  }
  return N.owner === owner ? maiFollow(m) : null;
}
// how far a mob will drop: 3 blocks, more for one chasing something at good health (Mob.getMaxFallDistance)
function maiMaxFall(m, chasing) {
  if (!chasing) return 3; const diff = { peaceful: 0, easy: 1, normal: 2, hard: 3 }[S.difficulty] ?? 2;
  return 3 + Math.max(0, Math.floor(m.hp - (m.maxHp || m.t.hp) * 0.33) - (3 - diff) * 4);
}
// is a step this way safe? false at a drop deeper than the mob will fall, or into lava, fire, cactus or powder snow
function maiSafe(m, vx, vz, maxFall) {
  if (!m.onGround || inWater(m, 0.1)) return true; const sp = Math.hypot(vx, vz); if (sp < 1e-3) return true;
  const look = m.hw + 0.3 + sp * 0.06; const x = Math.floor(m.pos.x + vx / sp * look), z = Math.floor(m.pos.z + vz / sp * look), y0 = Math.floor(m.pos.y + 0.05);
  maiResetCache(); const fp = !!m.t.fireproof;
  for (let dy = 0; dy < Math.max(1, Math.ceil(m.h)); dy++) { const r = maiCell(x, y0 + dy, z) & 31; if (r === PT_LAVA || r === PT_DAMAGING || r === PT_POWDER || (r === PT_FIRE && !fp)) return false; }
  if (maiCell(x, y0, z) & 32) return true; // a wall or a step: the collision code deals with it
  for (let d = 1; d <= maxFall + 1; d++) { const c = maiCell(x, y0 - d, z); const r = c & 31;
    if (r === PT_LAVA || r === PT_DAMAGING || (r === PT_FIRE && !fp && !(c & 32))) return false;
    if ((c & 32) || r === PT_WATER || maiTop(c) > 0) return true; }
  return false;
}
// ---------- random spots (RandomPos, LandRandomPos, DefaultRandomPos) ----------
function maiStable(x, y, z) { const b = maiCell(x, y - 1, z); return !!(b & 32) && maiTop(b) >= 1 && (b & 31) !== PT_LEAVES; }
function maiWeight(m, x, y, z) {
  const k = m.t.kind; if (k === 'hostile') return 0.5 - G.world.lightAt(x + 0.5, y + 0.5, z + 0.5, G.daylight);
  if (k === 'passive') return maiId(x, y - 1, z) === B.GRASS ? 10 : G.world.lightAt(x + 0.5, y + 0.5, z + 0.5, G.daylight) - 0.5;
  return 0;
}
// mode 'land': move up out of solid ground, no water (LandRandomPos); 'plain': exact spot (DefaultRandomPos)
function maiRandomPos(m, h, v, mode, away) {
  maiResetCache(); let best = null, bw = -1e9; const S = maiSetup(m, 16, 3);
  for (let i = 0; i < 10; i++) {
    let dx, dz, dy = Math.floor(Math.random() * (2 * v + 1)) - v;
    if (away) { const a = Math.atan2(away.z, away.x) - Math.PI / 2 + (2 * Math.random() - 1) * Math.PI / 2; const dist = Math.sqrt(Math.random()) * h * Math.SQRT2;
      dx = -dist * Math.sin(a); dz = dist * Math.cos(a); if (Math.abs(dx) > h || Math.abs(dz) > h) continue; }
    else { dx = Math.floor(Math.random() * (2 * h + 1)) - h; dz = Math.floor(Math.random() * (2 * h + 1)) - h; }
    const x = Math.floor(m.pos.x + dx), z = Math.floor(m.pos.z + dz); let y = Math.floor(m.pos.y + dy);
    if (y < 1 || y >= WH - 2 || maiId(x, y, z) < 0) continue;
    if (mode === 'land') { let n = 0; while ((maiCell(x, y, z) & 32) && y < WH - 2 && n++ < 24) y++; if ((maiCell(x, y, z) & 31) === PT_WATER) continue; }
    if (!maiStable(x, y, z)) continue;
    const t = maiStand(S, x, y, z); if (PT_MALUS[t] !== 0 || t === PT_OPEN) continue;
    const wgt = maiWeight(m, x, y, z); if (wgt > bw) { bw = wgt; best = new V3(x + 0.5, y, z + 0.5); }
  }
  return best;
}

// ---------- goals ----------
// wandering: WaterAvoidingRandomStrollGoal (interval 120 ticks, speed 1.0)
function maiStroll(m, dt, distP) {
  const N = maiNav(m);
  if (N.owner === 'stroll' && N.p) { const y = maiFollow(m); if (y != null) { m.wYaw = y; m.wMove = 1; return; } maiStop(m); m.wMove = 0; return; }
  if (N.owner === 'stroll') N.owner = null;
  m.wMove = 0;
  if (m.t.kind === 'hostile' && !m.persistent && distP > 32) return; // noActionTime: idle when nobody is near
  if (Math.random() < dt / 6) { const wet = inWater(m, 0.4); const p = maiRandomPos(m, wet ? 15 : 10, 7, 'land');
    if (p && maiMoveTo(m, p.x, p.y, p.z, 'stroll', 1, { range: 16 })) { const y = maiFollow(m); if (y != null) { m.wYaw = y; m.wMove = 1; } } }
}
// running scared: PanicGoal (random spots within 5 blocks) or AvoidEntityGoal (a spot up to 16 blocks away)
function maiFlee(m, dt, from) {
  const N = maiNav(m); const own = from ? 'avoid' : 'panic';
  if (N.owner === own && N.p) { const y = maiFollow(m); if (y != null) return y; }
  N.pT = (N.pT || 0) - dt; if (N.pT > 0) return null; N.pT = 0.25;
  const away = from ? { x: m.pos.x - from.x, z: m.pos.z - from.z } : null;
  const p = from ? maiRandomPos(m, 16, 7, 'plain', away.x || away.z ? away : { x: Math.random() - 0.5, z: Math.random() - 0.5 }) : maiRandomPos(m, 5, 4, 'plain');
  if (!p) return null; if (from && p.distanceToSquared(from) < m.pos.distanceToSquared(from)) return null;
  if (maiMoveTo(m, p.x, p.y, p.z, own, 0, { range: 16, force: true })) return maiFollow(m);
  return null;
}
// who a monster is after: it has to see you first, then forgets you 3 s out of sight (15 s when angry at you)
const MAI_RANGE = { zombie: 35, husk: 35, drowned: 35, zombie_villager: 35, enderman: 40 };
const ZOMBIE_KIN = new Set(['zombie', 'husk', 'drowned', 'zombie_villager']);
function maiEyes(m) { return new V3(m.pos.x, m.pos.y + (m.h || 1.8) * 0.85, m.pos.z); }
function maiSees(m, o) { const e = o === G.player ? o.eye() : new V3(o.pos.x, o.pos.y + (o.h || 1) * 0.85, o.pos.z); return lineOfSight(maiEyes(m), e); }
function maiTargetsPlayer(m, dt, can, dist) {
  if (!can || !maiCanPath(m)) { m.tgtP = false; return can && dist < (m.type === 'enderman' ? 40 : 18); }
  const R = MAI_RANGE[m.type] || 16; if (dist > R) { m.tgtP = false; return false; }
  const angry = m.angry > 0 || (m.alertT || 0) > G.simT;
  if (m.tgtP) { m.seeT = (m.seeT || 0) - dt; if (m.seeT <= 0) { m.seeT = 0.25; if (maiSees(m, G.player)) m.unseen = 0; else m.unseen = (m.unseen || 0) + 0.25; }
    if (m.unseen > (angry ? 15 : 3)) m.tgtP = false; return m.tgtP; }
  m.acqT = (m.acqT || 0) - dt; if (m.acqT > 0) return false; m.acqT = 0.1 + Math.random() * 0.4;
  if (angry || maiSees(m, G.player)) { m.tgtP = true; m.unseen = 0; m.mtgt = null; return true; }
  return false;
}
// skeletons strafe, pillagers hold their ground (RangedBowAttackGoal / RangedCrossbowAttackGoal)
function maiRanged(m, tgt, dist, see, dt) {
  const xbow = m.type === 'pillager'; const R = xbow ? 8 : 15;
  if (see !== (m.seeTime > 0)) m.seeTime = 0; m.seeTime = (m.seeTime || 0) + (see ? dt : -dt);
  if (dist <= R && m.seeTime >= (xbow ? 0.25 : 1)) {
    maiStop(m); if (xbow) { m.strafe = null; return { move: 0 }; }
    if (m.strafeT == null || m.strafeT < 0) m.strafeT = 0; m.strafeT += dt;
    if (m.strafeT >= 1) { if (Math.random() < 0.3) m.strafeCW = !m.strafeCW; if (Math.random() < 0.3) m.strafeBack = !m.strafeBack; m.strafeT = 0; }
    if (dist > R * 0.866) m.strafeBack = false; else if (dist < R * 0.5) m.strafeBack = true;
    m.strafe = [m.strafeBack ? -0.5 : 0.5, m.strafeCW ? 0.5 : -0.5]; return { move: 1 };
  }
  m.strafeT = -1; m.strafe = null; const y = maiChase(m, tgt.pos, 'chase', 0, { range: MAI_RANGE[m.type] || 16, maxFall: maiMaxFall(m, true) });
  return { move: 1, yaw: y };
}
// ---------- hooks used by Mob.update (03_entities.js) ----------
function maiPreUpdate(m) { m.navOn = false; m.navJump = false; m.strafe = null; }

// everything that steers a mob toward something now walks a path there
{ const _st = steerTo; steerTo = function (m, pos, stopAt) {
    const d = _st(m, pos, stopAt); if (!maiCanPath(m) || isClientMP() || m.rider != null) return d;
    const dy = pos.y - m.pos.y; if (d <= stopAt || (d < 2 && Math.abs(dy) < 1)) return d;
    const y = maiChase(m, pos, 'steer', Math.max(0, Math.floor(stopAt) - 1), { range: Math.max(16, Math.min(40, d + 8)) });
    if (y != null) m.wYaw = y; return d; }; }

// ---------- mob against mob ----------
const MAI_PREY = {
  zombie: [['villager', 0], ['wandering_trader', 0], ['iron_golem', 1]], husk: [['villager', 0], ['wandering_trader', 0], ['iron_golem', 1]],
  zombie_villager: [['villager', 0], ['wandering_trader', 0], ['iron_golem', 1]],
  skeleton: [['iron_golem', 1]], stray: [['iron_golem', 1]], bogged: [['iron_golem', 1]], parched: [['iron_golem', 1]],
  spider: [['iron_golem', 1, 'dark']], cave_spider: [['iron_golem', 1, 'dark']],
  wither_skeleton: [['piglin', 1], ['piglin_brute', 1], ['iron_golem', 1]], piglin: [['wither_skeleton', 1]],
};
const MAI_HUNT = { fox: ['chicken', 'rabbit'], cat: ['rabbit'], ocelot: ['chicken'] };
const MAI_RANGED = new Set(['skeleton', 'stray', 'bogged', 'parched', 'illusioner']);
function maiValidPrey(m, o, R) { return o && !o.dead && !o.gone && o !== m && !o.tamed && o.pos.distanceTo(m.pos) < R; }
function maiPickPrey(m, list, R) {
  let best = null, bd = R * R;
  for (const o of G.mobs) { if (o.dead || o.gone || o === m) continue; const e = list.find(p => p[0] === o.type); if (!e) continue;
    if (e[2] === 'dark' && m.realLight != null && m.realLight >= 0.5) continue; if (o.baby && m.type !== 'fox') { }
    const d = o.pos.distanceToSquared(m.pos); if (d < bd && Math.abs(o.pos.y - m.pos.y) < R && maiSees(m, o)) { bd = d; best = o; } }
  return best;
}
function maiFight(m, o, dt) { // walk up (or stand off and shoot) and hit
  const d = m.pos.distanceTo(o.pos), reach = 1.5 + m.hw + o.hw;
  if (MAI_RANGED.has(m.type)) {
    if (d > 12 || !maiSees(m, o)) steerTo(m, o.pos, 10); else { m.wMove = 0; m.wT = 0.3; m.wYaw = Math.atan2(o.pos.x - m.pos.x, o.pos.z - m.pos.z); }
    if (d < 16 && m.atkCD <= 0 && maiSees(m, o)) { m.atkCD = 2 + Math.random(); const n0 = G.projectiles.length;
      shootArrow(new V3(m.pos.x, m.pos.y + 1.5, m.pos.z), new V3(o.pos.x, o.pos.y + o.h * 0.6, o.pos.z), 'mob', 3);
      for (let i = n0; i < G.projectiles.length; i++) { G.projectiles[i].mobTarget = o; G.projectiles[i].shooter = m; } }
  } else {
    steerTo(m, o.pos, reach * 0.6);
    if (d < reach && Math.abs(o.pos.y - m.pos.y) < 2 && m.atkCD <= 0 && maiSees(m, o)) { m.atkCD = 1; o.hurt(m.t.dmg || 2, m.pos, m.t.kb || 1); m.armSwing = 0.3; }
  }
}
// who hit me: remember a mob attacker (src is the attacker's position)
{ const _h = Mob.prototype.hurt; Mob.prototype.hurt = function (dmg, src, kb, na) {
    const wasFlee = this.flee; const r = _h.apply(this, arguments);
    if (src && G.player && src !== G.player.pos) { const a = G.mobs.find(o => o.pos === src); if (a && a !== this) { this.hurtBy = a; this.hurtByT = G.simT; } }
    if (src && G.player && src === G.player.pos && ZOMBIE_KIN.has(this.type) && !this.dead) {
      for (const o of G.mobs) if (o !== this && ZOMBIE_KIN.has(o.type) && !o.dead && !o.tgtP && Math.hypot(o.pos.x - this.pos.x, o.pos.z - this.pos.z) < 35 && Math.abs(o.pos.y - this.pos.y) < 10) { o.tgtP = true; o.unseen = 0; o.alertT = G.simT + 15; o.mtgt = null; }
      this.alertT = G.simT + 15; }
    // Minecraft's panic lasts 2 seconds after the hit (then the last run is finished)
    if (this.t && this.t.kind === 'passive' && this.flee === 5 && wasFlee !== 5) this.flee = 2;
    return r; }; }
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) {
    if (this.dead || isClientMP() || !maiCanPath(this) || !this.t) return _u.call(this, dt);
    const t = this.t;
    // hostiles: villagers, golems, nemeses, and whoever hit them
    if (t.kind === 'hostile' || MAI_PREY[this.type]) {
      if (this.hurtBy && (this.hurtBy.dead || this.hurtBy.gone || G.simT - this.hurtByT > 15)) this.hurtBy = null;
      if (this.mtgt && !maiValidPrey(this, this.mtgt, 24)) this.mtgt = null;
      if (!this.tgtP) {
        if (this.hurtBy && !RAIDERS_SAFE(this, this.hurtBy)) this.mtgt = this.hurtBy;
        else if (!this.mtgt && MAI_PREY[this.type]) { this.preyScan = (this.preyScan || 0) - dt; if (this.preyScan <= 0) { this.preyScan = 0.3 + Math.random() * 0.4; this.mtgt = maiPickPrey(this, MAI_PREY[this.type], MAI_RANGE[this.type] || 16); } }
        if (this.mtgt && !(this.type === 'creeper')) { maiFight(this, this.mtgt, dt); const sp = this.spMul; this.spMul = (sp || 1) / 0.6; try { return _u.call(this, dt); } finally { this.spMul = sp; } }
      } else this.mtgt = null;
    }
    // hunters among the animals
    const H = MAI_HUNT[this.type]; if (H && !this.tamed && !this.baby && !(this.flee > 0)) {
      if (this.prey && !maiValidPrey(this, this.prey, 16)) this.prey = null;
      if (!this.prey && Math.random() < dt) this.prey = maiPickPrey(this, H.map(k => [k, 1]), 12);
      if (this.prey) { const o = this.prey; const d = this.pos.distanceTo(o.pos); steerTo(this, o.pos, 0.8 + o.hw); this.goalBoost = true;
        if (d < 1.4 + o.hw && (this.atkCD || 0) <= 0) { this.atkCD = 1; o.hurt(this.type === 'fox' ? 2 : 3, this.pos, 0.5); }
        if (this.onGround && d > 1.5 && d < 3 && Math.random() < dt * 2) { const dx = o.pos.x - this.pos.x, dz = o.pos.z - this.pos.z, L = Math.hypot(dx, dz) || 1; this.vel.x = dx / L * 6; this.vel.z = dz / L * 6; this.vel.y = 6; } }
    }
    // spiders leap at you from 2-4 blocks (LeapAtTargetGoal)
    if ((this.type === 'spider' || this.type === 'cave_spider') && this.tgtP && this.onGround && G.player) { const P = G.player; const dx = P.pos.x - this.pos.x, dz = P.pos.z - this.pos.z, d2 = dx * dx + dz * dz;
      if (d2 >= 4 && d2 <= 16 && Math.random() < dt * 5) { const L = Math.sqrt(d2) || 1; this.vel.x = dx / L * 8 + this.vel.x * 0.2; this.vel.z = dz / L * 8 + this.vel.z * 0.2; this.vel.y = 7.8; this.onGround = false; } }
    return _u.call(this, dt);
  }; }
// raiders and illagers are each other's friends; nobody fights back at its own kind
function RAIDERS_SAFE(m, o) { if (o.type === m.type) return true; if (typeof ILLAGER_KIN !== 'undefined' && ILLAGER_KIN.has(m.type) && ILLAGER_KIN.has(o.type)) return true; return false; }
// wild wolves hunt sheep and foxes too
if (MOBS.wolf && MOBS.wolf.tick) { const _wt = MOBS.wolf.tick; MOBS.wolf.tick = function (m, dt) {
    if (!m.tamed && !m.baby && !m.prey && Math.random() < dt && !isClientMP()) { const s = maiPickPrey(m, [['sheep', 1], ['fox', 1], ['bogged', 1], ['parched', 1], ['wither_skeleton', 1]], 12); if (s) m.prey = s; }
    return _wt(m, dt); }; }
// skeletons keep away from wolves (AvoidEntityGoal, 6 blocks)
const MAI_WOLF_SHY = new Set(['skeleton', 'stray', 'bogged', 'parched', 'wither_skeleton']);
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) {
    if (!this.dead && MAI_WOLF_SHY.has(this.type) && !isClientMP()) { this.wolfChk = (this.wolfChk || 0) - dt; if (this.wolfChk <= 0) { this.wolfChk = 0.5;
        const w = G.mobs.find(o => o.type === 'wolf' && !o.dead && !o.tamed && o.pos.distanceTo(this.pos) < 6); if (w) { this.flee = Math.max(this.flee, 1); this.fleeFrom = w; } } }
    if (this.fleeFrom && (this.flee <= 0 || this.fleeFrom.dead)) this.fleeFrom = null;
    return _u.call(this, dt); }; }

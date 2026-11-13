// ================= STRUCTURE PIECES FRAMEWORK, STRONGHOLDS, OCEAN MONUMENT FIXES =================
// Big structures are laid out once per start as a list of pieces (each with a bounding box and a draw function) and
// then drawn chunk by chunk, clipped to the chunk being generated. Chests, spawners and mobs placed by pieces are
// registered when the chunk finishes.
function pieceWriter(c, world) {
  const W = chunkWriter(c, world);
  W.chest = (x, y, z, loot) => { if (!W.inC(x, z)) return; W.set(x, y, z, B.CHEST); (c.loots = c.loots || []).push([x, y, z, loot]); };
  W.spawner = (x, y, z, mob) => { if (!W.inC(x, z)) return; W.set(x, y, z, B.SPAWNER); (c.spw = c.spw || []).push([x, y, z, mob]); };
  W.mob = (t, x, y, z) => { if (W.inC(Math.floor(x), Math.floor(z))) (c.smobs = c.smobs || []).push([t, x, y, z]); };
  W.fill = (x0, y0, z0, x1, y1, z1, id) => { const ax = Math.max(Math.min(x0, x1), c.cx * 16), bx = Math.min(Math.max(x0, x1), c.cx * 16 + 15), az = Math.max(Math.min(z0, z1), c.cz * 16), bz = Math.min(Math.max(z0, z1), c.cz * 16 + 15); const ya = Math.min(y0, y1), yb = Math.max(y0, y1);
    for (let x = ax; x <= bx; x++) for (let z = az; z <= bz; z++) for (let y = ya; y <= yb; y++) W.set(x, y, z, typeof id === 'function' ? id(x, y, z) : id); };
  return W;
}
function drawPieces(c, world, pieces) {
  const x0 = c.cx * 16, z0 = c.cz * 16, x1 = x0 + 15, z1 = z0 + 15; let W = null;
  for (const p of pieces) { if (p.x1 < x0 || p.x0 > x1 || p.z1 < z0 || p.z0 > z1) continue; W = W || pieceWriter(c, world); p.draw(W); }
}
{ const _og = onChunkGen; onChunkGen = function (c, hints, cols, w) { _og(c, hints, cols, w);
    for (const [x, y, z, mob] of c.spw || []) w.spawners.set(x + ',' + y + ',' + z, mob);
    for (const [x, y, z, loot] of c.loots || []) w.chestLoot.set(x + ',' + y + ',' + z, loot);
    if (w === world && !isClientMP()) for (const [t, x, y, z] of c.smobs || []) { const m = spawnMob(t, x, y, z); if (m && c.smobFlags) Object.assign(m, c.smobFlags[t] || {}); }
    c.spw = c.loots = c.smobs = null; }; }
// rotations: a piece is described facing +z (local x across, local z forward); dir 0 +z, 1 +x, 2 -z, 3 -x
const DIRV = [[0, 1], [1, 0], [0, -1], [-1, 0]];
function pframe(ox, oy, oz, dir) { const [fx, fz] = DIRV[dir]; const rx = fz, rz = -fx; // right-hand side
  return { at: (lx, ly, lz) => [ox + rx * lx + fx * lz, oy + ly, oz + rz * lx + fz * lz], dir, ox, oy, oz }; }
function boxOf(F, lx0, ly0, lz0, lx1, ly1, lz1) { const a = F.at(lx0, ly0, lz0), b = F.at(lx1, ly1, lz1); return { x0: Math.min(a[0], b[0]), y0: Math.min(a[1], b[1]), z0: Math.min(a[2], b[2]), x1: Math.max(a[0], b[0]), y1: Math.max(a[1], b[1]), z1: Math.max(a[2], b[2]) }; }
const overlaps = (a, b) => a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0 && a.z0 <= b.z1 && a.z1 >= b.z0;
const shrink = (b) => ({ x0: b.x0 + 1, y0: b.y0, z0: b.z0 + 1, x1: b.x1 - 1, y1: b.y1, z1: b.z1 - 1 });

// ---------------- STRONGHOLDS (Minecraft's piece set) ----------------
// A spiral staircase start, then a branching maze of 5-wide corridors, turns, straight stairs, room crossings
// (pillar, fountain or two-storey store room), five-way crossings, prison halls with iron-barred cells, chest
// corridors, libraries (tall ones with a balcony and ladder) and one portal room: a lava pool under the end portal
// frame (12 frames, each with a 10% chance of an eye), stairs up to it and a silverfish spawner on the steps.
// Walls are a mix of stone bricks, mossy and cracked stone bricks (MC proportions), lit by torches.
function shBrick(x, y, z, seed) { const q = rnd01(x, y, z, seed ^ 0x5b); return q < 0.2 ? B.MOSSY_STONE_BRICKS : q < 0.4 ? B.CRACKED_STONE_BRICKS : q < 0.43 ? B.COBBLESTONE : B.STONE_BRICKS; }
const SH_TYPES = { corridor: 40, prison: 5, left: 20, right: 20, crossing: 10, stairs: 5, spiral: 5, five: 5, chest: 5, library: 10, portal: 20 };
function strongholdLayout(world, sh) {
  if (sh.layout) return sh.layout; const r = mulberry32(ihash(sh.cx, sh.cz, 8811, world.seed)); const seed = world.seed;
  const pieces = [], boxes = []; const open = []; let portal = false, libs = 0, n = 0;
  const shell = (W, F, w, h, L, opts = {}) => { // walls, floor and ceiling of a box piece; air inside
    const hw = w >> 1; for (let lx = -hw; lx <= hw; lx++) for (let ly = 0; ly <= h; ly++) for (let lz = 0; lz < L; lz++) { const [x, y, z] = F.at(lx, ly, lz); const wall = lx === -hw || lx === hw || ly === 0 || ly === h || lz === 0 || lz === L - 1; W.set(x, y, z, wall ? shBrick(x, y, z, seed) : 0); } };
  const door = (W, F, lx, lz, side) => { // a 3x3 opening (local wall z=lz), sometimes with iron bars or a wooden frame
    for (let a = -1; a <= 1; a++) for (let ly = 1; ly <= 3; ly++) { const [x, y, z] = F.at(lx + a, ly, lz); W.set(x, y, z, 0); } };
  const sideDoor = (W, F, lx, lz) => { for (let a = -1; a <= 1; a++) for (let ly = 1; ly <= 3; ly++) { const [x, y, z] = F.at(lx, ly, lz + a); W.set(x, y, z, 0); } };
  const torch = (W, F, lx, ly, lz) => { const [x, y, z] = F.at(lx, ly, lz); W.set(x, y, z, B.TORCH); };
  // place a piece of type t entering at world point (x,y,z) facing dir; returns false if it does not fit
  const place = (t, x, y, z, dir, depth) => {
    let w = 5, h = 5, L = 7, exits = [], draw, F, dy = 0;
    const mk = () => { F = pframe(x, y, z, dir); };
    switch (t) {
      case 'corridor': L = 7 + (r() * 3 | 0) * 4; mk(); exits = [['f', 0, L, 0]]; { const side = r() < 0.4 ? (r() < 0.5 ? 'l' : 'r') : null; const sz = 2 + (r() * (L - 4) | 0); if (side) exits.push([side, side === 'l' ? -3 : 3, sz, 0]); }
        draw = (W) => { shell(W, F, 5, 4, L); door(W, F, 0, 0); if (L > 9) torch(W, F, -1, 2, L >> 1); }; h = 4; break;
      case 'chest': L = 7; mk(); exits = [['f', 0, L, 0]]; h = 4;
        draw = (W) => { shell(W, F, 5, 4, L); door(W, F, 0, 0); const [x0, y0, z0] = F.at(1, 1, 3); W.set(x0, y0, z0, B.STONE_BRICKS); const [cx, cy, cz] = F.at(1, 2, 3); W.chest(cx, cy, cz, 'stronghold_corridor'); }; break;
      case 'left': case 'right': L = 5; mk(); exits = [[t === 'left' ? 'l' : 'r', t === 'left' ? -3 : 3, 2, 0]]; h = 4;
        draw = (W) => { shell(W, F, 5, 4, 5); door(W, F, 0, 0); torch(W, F, t === 'left' ? 1 : -1, 2, 3); }; break;
      case 'stairs': L = 8; dy = -7; mk(); exits = [['f', 0, L, -7]]; h = 11;
        F = pframe(x, y - 7, z, dir); draw = (W) => { shell(W, F, 5, 11, 8); for (let a = -1; a <= 1; a++) for (let ly = 8; ly <= 10; ly++) { const [xx, yy, zz] = F.at(a, ly, 0); W.set(xx, yy, zz, 0); }
          for (let s = 0; s < 7; s++) for (let a = -1; a <= 1; a++) { const [xx, yy, zz] = F.at(a, 7 - s, s + 1); W.set(xx, yy, zz, shBrick(xx, yy, zz, seed)); for (let k = 1; k <= 3; k++) { const [x2, y2, z2] = F.at(a, 7 - s + k, s + 1); W.set(x2, y2, z2, 0); } } }; break;
      case 'spiral': L = 5; dy = -7; mk(); exits = [['f', 0, L, -7]]; h = 11;
        F = pframe(x, y - 7, z, dir); draw = (W) => { shell(W, F, 5, 11, 5); for (let a = -1; a <= 1; a++) for (let ly = 8; ly <= 10; ly++) { const [xx, yy, zz] = F.at(a, ly, 0); W.set(xx, yy, zz, 0); }
          const ring = [[-1, 1], [-1, 2], [-1, 3], [0, 3], [1, 3], [1, 2], [1, 1], [0, 1]]; for (let s = 0; s < 8; s++) { const [a, b] = ring[s % 8]; const ly = 7 - s; if (ly < 1) break; const [xx, yy, zz] = F.at(a, ly, b); W.set(xx, yy, zz, B.STONE_BRICKS); }
          const [px, py, pz] = F.at(0, 1, 2); for (let ly = 1; ly <= 10; ly++) W.set(px, py - 1 + ly, pz, B.STONE_BRICKS); for (let a = -1; a <= 1; a++) for (let ly = 1; ly <= 3; ly++) { const [xx, yy, zz] = F.at(a, ly, 4); W.set(xx, yy, zz, 0); } }; break;
      case 'crossing': { w = 11; h = 6; L = 11; mk(); exits = [['f', 0, L, 0], ['l', -6, 5, 0], ['r', 6, 5, 0]]; const kind = r() * 3 | 0;
        draw = (W) => { shell(W, F, 11, 6, 11); door(W, F, 0, 0); const at = (lx, ly, lz, id) => { const [xx, yy, zz] = F.at(lx, ly, lz); W.set(xx, yy, zz, id); };
          if (kind === 0) { for (let ly = 1; ly <= 5; ly++) for (let a = -1; a <= 1; a++) for (let b = 4; b <= 6; b++) at(a, ly, b, B.STONE_BRICKS); for (const [a, b] of [[-2, 5], [2, 5], [0, 3], [0, 7]]) at(a, 3, b, B.TORCH); }
          else if (kind === 1) { for (let a = -1; a <= 1; a++) for (let b = 4; b <= 6; b++) at(a, 1, b, (a || b !== 5) ? B.STONE_BRICKS : B.WATER); at(0, 2, 5, B.STONE_BRICKS); at(0, 3, 5, B.STONE_BRICKS); at(0, 4, 5, B.WATER); for (const [a, b] of [[-4, 1], [4, 1], [-4, 9], [4, 9]]) at(a, 3, b, B.TORCH); }
          else { for (let a = -4; a <= 4; a++) for (let b = 1; b <= 9; b++) if (a <= -2 || b >= 8) at(a, 3, b, B.PLANKS); for (let ly = 1; ly <= 3; ly++) at(-1, ly, 9, B.LADDER_S); at(-4, 4, 9, 0); const [cx, cy, cz] = F.at(-3, 4, 8); W.chest(cx, cy, cz, 'stronghold_corridor'); for (const [a, b] of [[3, 2], [3, 8]]) at(a, 2, b, B.TORCH); } }; break; }
      case 'five': { w = 11; h = 8; L = 9; mk(); exits = [['f', 0, L, 0], ['l', -6, 2, 0], ['r', 6, 6, 0], ['l', -6, 6, 4], ['r', 6, 2, 4]];
        draw = (W) => { shell(W, F, 11, 8, 9); door(W, F, 0, 0); for (let a = -4; a <= 4; a++) for (let b = 1; b <= 7; b++) { const [xx, yy, zz] = F.at(a, 4, b); if (a < -1 || a > 1) W.set(xx, yy, zz, shBrick(xx, yy, zz, seed)); } for (const [a, b] of [[-4, 4], [4, 4]]) { const [xx, yy, zz] = F.at(a, 6, b); W.set(xx, yy, zz, B.TORCH); } }; break; }
      case 'prison': { w = 9; h = 4; L = 11; mk(); exits = [['f', 0, L, 0]];
        draw = (W) => { shell(W, F, 9, 4, 11); door(W, F, 0, 0); const at = (lx, ly, lz, id) => { const [xx, yy, zz] = F.at(lx, ly, lz); W.set(xx, yy, zz, id); };
          for (const side of [-1, 1]) for (let cell = 0; cell < 2; cell++) { const z0 = 1 + cell * 5; for (let b = z0; b <= z0 + 3; b++) for (let ly = 1; ly <= 3; ly++) { at(side * 2, ly, b, (b === z0 + 1 || b === z0 + 2) && ly < 3 && b === z0 + 1 ? 0 : B.IRON_BARS); } for (let b = z0; b <= z0 + 3; b++) for (let ly = 1; ly <= 3; ly++) if (b === z0 || b === z0 + 3) for (let a = 2; a <= 3; a++) at(side * a, ly, b, B.STONE_BRICKS); }
          at(0, 3, 5, B.TORCH); }; break; }
      case 'library': { w = 13; L = 14; const tall = r() < 0.6; h = tall ? 10 : 5; mk(); exits = [];
        draw = (W) => { shell(W, F, 13, h, 14); door(W, F, 0, 0); const at = (lx, ly, lz, id) => { const [xx, yy, zz] = F.at(lx, ly, lz); W.set(xx, yy, zz, id); };
          for (let ly = 1; ly < h; ly++) for (let lz = 1; lz <= 12; lz++) for (const a of [-5, 5]) if (!(ly <= 3 && lz <= 1)) at(a, ly, lz, (lz % 4 === 0) ? B.PLANKS : B.BOOKSHELF);
          for (let lz = 1; lz <= 12; lz++) for (let ly = 1; ly < h; ly++) at(0, ly, 13 - 1, lz === 12 ? B.BOOKSHELF : B.BOOKSHELF);
          for (const row of [-2, 2]) for (let lz = 4; lz <= 10; lz++) for (let ly = 1; ly <= 3; ly++) at(row, ly, lz, (lz === 7 && ly === 1) ? 0 : B.BOOKSHELF);
          for (const [a, b] of [[-3, 2], [3, 11], [-4, 9], [1, 6]]) { if (rnd01(a, b, sh.cx, seed) < 0.7) at(a, 3, b, B.COBWEB); }
          if (tall) { for (let a = -4; a <= 4; a++) for (let b = 1; b <= 12; b++) if (Math.abs(a) >= 3 || b >= 11 || b <= 2) at(a, 5, b, B.PLANKS); for (let ly = 1; ly <= 5; ly++) at(-3, ly, 12, B.LADDER_S); at(-3, 5, 12, 0); for (let a = -2; a <= 2; a++) at(a, 6, 11, B.OAK_FENCE);
            const [cx, cy, cz] = F.at(3, 6, 12); W.chest(cx, cy, cz, 'stronghold_library'); at(0, 8, 6, B.TORCH); at(-4, 7, 1, B.TORCH); }
          const [cx, cy, cz] = F.at(-4, 1, 10); W.chest(cx, cy, cz, 'stronghold_library'); at(4, 2, 1, B.TORCH); }; break; }
      case 'portal': { w = 11; h = 8; L = 16; mk(); exits = [];
        draw = (W) => { shell(W, F, 11, 8, 16); door(W, F, 0, 0); const at = (lx, ly, lz, id) => { const [xx, yy, zz] = F.at(lx, ly, lz); W.set(xx, yy, zz, id); };
          for (let b = 1; b <= 14; b++) { at(-4, 1, b, b > 6 ? B.LAVA : 0); at(4, 1, b, b > 6 ? B.LAVA : 0); } // lava channels along the sides
          for (let a = -3; a <= 3; a++) for (let b = 8; b <= 14; b++) at(a, 1, b, B.STONE_BRICKS); // platform under the frame
          for (let s = 0; s < 3; s++) for (let a = -1; a <= 1; a++) { at(a, 1 + s, 5 + s, B.STONE_BRICKS); for (let k = 1; k <= s; k++) at(a, k, 5 + s, B.STONE_BRICKS); }
          for (let a = -3; a <= 3; a++) for (let b = 8; b <= 14; b++) for (let ly = 2; ly <= 3; ly++) at(a, ly, b, B.STONE_BRICKS);
          const rr = mulberry32(ihash(sh.cx, sh.cz, 777, seed)); let eyes = 0;
          for (let a = -2; a <= 2; a++) for (let b = 9; b <= 13; b++) { const ring = (Math.abs(a) === 2) !== (b === 9 || b === 13); if (ring) { const eye = rr() < 0.1; eyes += eye; at(a, 4, b, eye ? B.END_PORTAL_FRAME_EYE : B.END_PORTAL_FRAME); } else if (Math.abs(a) < 2 && b > 9 && b < 13) { at(a, 3, b, B.LAVA); at(a, 4, b, 0); } else at(a, 4, b, 0); }
          { const [sx, sy, sz] = F.at(0, 4, 7); W.spawner(sx, sy, sz, 'silverfish'); }
          for (let lz of [1, 14]) for (const a of [-5, 5]) { for (let ly = 3; ly <= 4; ly++) at(a, ly, lz === 1 ? 4 : 11, B.IRON_BARS); }
          for (const [a, b] of [[-3, 2], [3, 2], [-4, 15 - 1], [4, 15 - 1]]) at(a, 5, b, B.TORCH); }; break; }
    }
    if (!F) mk();
    const bb = boxOf(F, -(w >> 1), 0, 0, w >> 1, h, L - 1);
    if (Math.hypot(bb.x0 - sh.x, bb.z0 - sh.z) > 100 || bb.y0 < 6) return false;
    for (const o of boxes) if (overlaps(shrink(bb), shrink(o))) return false;
    boxes.push(bb); pieces.push(Object.assign({ draw, t }, bb)); n++;
    for (const [side, lx, lz, ly] of exits) {
      const d2 = side === 'f' ? dir : side === 'l' ? (dir + 3) % 4 : (dir + 1) % 4; const [ex, ey, ez] = F.at(lx, ly || 0, lz);
      const pd = pieces[pieces.length - 1]; const P0 = F; // carve the exit opening when a piece attaches
      open.push({ x: ex, y: ey, z: ez, dir: d2, depth: depth + 1, owner: pd, side, lx, lz, ly: ly || 0, F: P0 });
    }
    return true;
  };
  // start: a spiral staircase at the stronghold's centre
  place('spiral', sh.x, sh.y + 7, sh.z, (r() * 4) | 0, 0);
  let guard = 0;
  while (open.length && guard++ < 400) {
    const i = (r() * Math.min(open.length, 6)) | 0; const e = open.splice(i, 1)[0];
    if (e.depth > 50 || n > 60) continue;
    const tries = Object.entries(SH_TYPES).filter(([t]) => !(t === 'portal' && (portal || n < 8)) && !(t === 'library' && libs >= 2));
    let ok = false;
    for (let k = 0; k < 6 && !ok; k++) { let tot = tries.reduce((s, x) => s + x[1], 0), q = r() * tot, t = tries[0][0]; for (const [tt, wgt] of tries) { q -= wgt; if (q <= 0) { t = tt; break; } }
      if (place(t, e.x, e.y, e.z, e.dir, e.depth)) { ok = true; if (t === 'portal') portal = true; if (t === 'library') libs++; } }
    if (ok) { const own = e.owner; const prev = own.draw; const ex = e; own.draw = (W) => { prev(W); for (let a = -1; a <= 1; a++) for (let ly = 1; ly <= 3; ly++) { const [xx, yy, zz] = ex.side === 'f' ? ex.F.at(a, ex.ly + ly, ex.lz - 1) : ex.F.at(ex.lx + (ex.side === 'l' ? 1 : -1), ex.ly + ly, ex.lz + a); W.set(xx, yy, zz, 0); } }; }
  }
  // Minecraft always has a portal room: if the maze never placed one, attach it to the deepest free exit
  if (!portal) { for (const e of open.sort((a, b) => b.depth - a.depth)) if (place('portal', e.x, e.y, e.z, e.dir, e.depth)) { portal = true; const own = e.owner; const prev = own.draw; own.draw = (W) => { prev(W); for (let a = -1; a <= 1; a++) for (let ly = 1; ly <= 3; ly++) { const [xx, yy, zz] = e.side === 'f' ? e.F.at(a, e.ly + ly, e.lz - 1) : e.F.at(e.lx + (e.side === 'l' ? 1 : -1), e.ly + ly, e.lz + a); W.set(xx, yy, zz, 0); } }; break; }
    if (!portal) { // last resort: right next to the start, going down
      for (let dir = 0; dir < 4 && !portal; dir++) { const [fx, fz] = DIRV[dir]; for (let k = 8; k < 60 && !portal; k += 4) portal = place('portal', sh.x + fx * k, sh.y - 12, sh.z + fz * k, dir, 0); } } }
  const pr = pieces.find(p => p.t === 'portal'); sh.portal = pr ? [(pr.x0 + pr.x1) >> 1, pr.y0, (pr.z0 + pr.z1) >> 1] : null;
  sh.layout = pieces; return pieces;
}
buildStronghold = function () { }; // the old single-room stronghold
{ const _go = World.prototype.genOverworld; World.prototype.genOverworld = function (c) { const cols = _go.call(this, c);
    for (const sh of this.gen.strongholds) { if (Math.abs(sh.cx - c.cx) > 8 || Math.abs(sh.cz - c.cz) > 8) continue; drawPieces(c, this, strongholdLayout(this, sh)); }
    return cols; }; }
// eyes of ender and /locate lead to the portal room
{ const _lc = CMDS.locate.run; CMDS.locate.run = function (a, ctx) { const r = _lc.call(this, a, ctx); return r; }; }
Object.assign(LOOT, {
  stronghold_corridor: [['ender_pearl', 1, 1, 0.3], ['diamond', 1, 3, 0.12], ['iron_ingot', 1, 5, 0.45], ['gold_ingot', 1, 3, 0.25], ['redstone', 4, 9, 0.2], ['bread', 1, 3, 0.4], ['apple', 1, 3, 0.4], ['iron_pickaxe', 1, 1, 0.2], ['iron_sword', 1, 1, 0.2], ['iron_chestplate', 1, 1, 0.15], ['iron_helmet', 1, 1, 0.15], ['iron_leggings', 1, 1, 0.15], ['iron_boots', 1, 1, 0.15], ['golden_apple', 1, 1, 0.05], ['saddle', 1, 1, 0.05], ['iron_horse_armor', 1, 1, 0.05], ['golden_horse_armor', 1, 1, 0.05], ['diamond_horse_armor', 1, 1, 0.05], ['enchanted_book', 1, 1, 0.1]],
  stronghold_library: [['book', 1, 3, 0.8], ['paper', 2, 7, 0.8], ['compass', 1, 1, 0.2], ['enchanted_book', 1, 1, 0.6], ['enchanted_book', 1, 1, 0.3]],
});
// ---------------- OCEAN MONUMENTS: always below the surface, with guardians ----------------
// Minecraft builds every monument at y=39 (24 blocks under sea level) and fills water down to the sea floor around it.
buildMonumentChunk = function (world, c) {
  const sts = bigStartsNear(world, 'ocean_monument', c.cx, c.cz, 3); if (!sts.length) return; const W = pieceWriter(c, world);
  for (const st of sts) { if (st.col.h > SEA - 18) continue; const ox = st.cx * 16 + 8 - 29, oz = st.cz * 16 + 8 - 29, y0 = SEA - 24;
    for (let x = ox - 2; x < ox + 60; x++) for (let z = oz - 2; z < oz + 60; z++) { if (!W.inC(x, z)) continue; const ix = x - ox, iz = z - oz; const inset = (y) => y < 6 ? 0 : y < 14 ? 6 : 14;
      const ground = world.gen.column(x, z).h; for (let y = Math.min(ground, y0) - 1; y < y0 && y >= 1; y++) W.set(x, y, z, ix < 0 || iz < 0 || ix > 57 || iz > 57 ? B.WATER : B.PRISMARINE); // foundation
      for (let y = y0; y < SEA; y++) if (ix < 0 || iz < 0 || ix > 57 || iz > 57) { if (y >= ground - 1) W.set(x, y, z, B.WATER); }
      if (ix < 0 || iz < 0 || ix > 57 || iz > 57) continue;
      for (let h = 0; h < SEA - y0; h++) { const k = inset(h); const inside = ix >= k && ix < 58 - k && iz >= k && iz < 58 - k && h <= 22; const y = y0 + h; if (!inside) { W.set(x, y, z, B.WATER); continue; }
        const shell = ix === k || ix === 57 - k || iz === k || iz === 57 - k || h === 0 || h === 5 || h === 13 || h === 22; const wing = (ix < 12 || ix > 45) && h < 14;
        let id = shell ? ((h + ix + iz) % 9 === 0 ? B.SEA_LANTERN : (h % 5 === 0 ? B.DARK_PRISMARINE : B.PRISMARINE_BRICKS)) : B.WATER;
        if (!shell && (ix % 8 === 4 && iz % 8 === 4) && h < 13) id = B.PRISMARINE;
        if (!shell && ix >= 25 && ix <= 32 && iz >= 25 && iz <= 32 && h >= 6 && h <= 9) id = (ix >= 27 && ix <= 30 && iz >= 27 && iz <= 30 && h >= 7 && h <= 8) ? B.GOLD_BLOCK : B.DARK_PRISMARINE;
        if (!shell && wing && (ix + iz) % 23 === 0 && h === 1) id = B.WET_SPONGE;
        if ((ix === 28 || ix === 29) && iz < 3 && h >= 1 && h <= 4) id = B.WATER;
        if (shell && h > 0 && h < 22 && ((ix % 7 === 3 && (iz === k || iz === 57 - k)) || (iz % 7 === 3 && (ix === k || ix === 57 - k))) && (h % 5 === 2 || h % 5 === 3)) id = B.WATER; // window holes guardians swim through
        W.set(x, y, z, id); }
      // guardians: about one per 60 water blocks around the monument, and the three elders in their rooms
      if ((ix * 31 + iz * 17) % 97 === 0) { const gy = y0 + 2 + ((ix + iz) % 15); if (isWaterId(W.get(x, gy, z)) && isWaterId(W.get(x, gy + 1, z))) W.mob('guardian', x + 0.5, gy, z + 0.5); } // only in open water, never inside walls or pillars
    }
    for (const [ex, ez, eh] of [[10, 29, 2], [47, 29, 2], [29, 29, 15]]) { const x = ox + ex, z = oz + ez; if (W.inC(x, z)) W.mob('elder_guardian', x + 0.5, y0 + eh, z + 0.5); }
    if (W.inC(st.cx * 16 + 8, st.cz * 16 + 8)) { (world.monuments = world.monuments || []).push([st.cx * 16 + 8, y0, st.cz * 16 + 8]); }
  }
};
// guardians keep spawning in and around monuments (Minecraft spawns them in the monument's bounds in water)
{ const _us = updateSpawning; updateSpawning = function (dt) { const r = _us.apply(this, arguments);
    if (!world || world.dim !== 'overworld' || isClientMP() || !S.rules.doMobSpawning || S.difficulty === 'peaceful' || !world.monuments || Math.random() > dt * 0.5) return r;
    const P = player.pos; for (const [mx, my, mz] of world.monuments) { if (Math.hypot(mx - P.x, mz - P.z) > 64) continue;
      if (G.mobs.filter(m => m.type === 'guardian' && !m.dead && Math.hypot(m.pos.x - mx, m.pos.z - mz) < 40).length >= 12) continue;
      const x = Math.floor(mx + (Math.random() - 0.5) * 56), z = Math.floor(mz + (Math.random() - 0.5) * 56), y = my + 1 + Math.floor(Math.random() * 20);
      if (!world.loaded(x, z) || !isWaterId(world.get(x, y, z)) || Math.hypot(x - P.x, z - P.z) < 16) continue; spawnMob('guardian', x + 0.5, y, z + 0.5); }
    return r; }; }

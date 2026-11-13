// ================= TRIAL CHAMBERS (Minecraft 1.21 layout, rebuilt) =================
// A big underground complex of tuff and copper, 40 to 20 blocks below the surface of the deep caves. Two floors of a
// 5 x 5 grid of junctions joined by 5-wide corridors (a random spanning maze plus a few loops, so everything is
// connected), stair shafts between the floors, and a tall central atrium with a breeze spawner and floating platforms.
// Chamber rooms hold 2 or 3 trial spawners each (one mob family per room: melee, ranged, small or breeze), vaults
// (a few ominous ones) and reward chests; corridors have side alcoves with supply chests, copper bulb lighting and
// barrels. Every room and corridor is reachable from every other one.
const TC = { grid: 5, cell: 15, floorGap: 11 };
const TRIAL_FAMILIES = { melee: { zombie: 3, husk: 2, spider: 2 }, ranged: { skeleton: 3, stray: 2, bogged: 2 }, small: { cave_spider: 2, silverfish: 2, slime: 2, baby_zombie: 0 }, breeze: { breeze: 1 } };
Object.assign(LOOT, { trial_corridor: [['bread', 2, 4, 0.5], ['baked_potato', 2, 4, 0.4], ['arrow', 4, 14, 0.5], ['iron_ingot', 1, 3, 0.35], ['copper_ingot', 2, 6, 0.4], ['emerald', 1, 3, 0.3], ['honeycomb', 1, 4, 0.2], ['wind_charge', 1, 3, 0.2], ['iron_axe', 1, 1, 0.08], ['bowl', 1, 2, 0.2], ['trial_key', 1, 1, 0.15]],
  trial_supply: [['arrow', 6, 16, 0.6], ['tipped_arrow', 4, 8, 0.25], ['bread', 2, 6, 0.5], ['golden_carrot', 1, 3, 0.25], ['shield', 1, 1, 0.2], ['potion', 1, 1, 0.2], ['bow', 1, 1, 0.15], ['wind_charge', 2, 5, 0.25], ['stone_pickaxe', 1, 1, 0.2]] });
function tcLayout(world, st) {
  if (st.tc) return st.tc; const r = mulberry32((st.seed ^ 0x7c11) >>> 0); const N = TC.grid, CS = TC.cell;
  const y0 = YOFF - 40 + (r() * 10 | 0); const ox = st.cx * 16 + 8 - ((N - 1) * CS >> 1), oz = st.cz * 16 + 8 - ((N - 1) * CS >> 1);
  const nodes = []; for (let lv = 0; lv < 2; lv++) for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) nodes.push({ lv, i, j, x: ox + i * CS, z: oz + j * CS, y: y0 + lv * TC.floorGap, kind: 'junction' });
  const nid = (lv, i, j) => lv * N * N + i * N + j; const edges = [];
  for (let lv = 0; lv < 2; lv++) { // a random spanning tree per floor, plus loops
    const seen = new Set([nid(lv, 2, 2)]); const stack = [[2, 2]];
    while (stack.length) { const [i, j] = stack[stack.length - 1]; const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [i + a, j + b]).filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N && !seen.has(nid(lv, a, b)));
      if (!opts.length) { stack.pop(); continue; } const [a, b] = opts[(r() * opts.length) | 0]; seen.add(nid(lv, a, b)); edges.push([nid(lv, i, j), nid(lv, a, b)]); stack.push([a, b]); }
    for (let k = 0; k < 5; k++) { const i = (r() * N) | 0, j = (r() * (N - 1)) | 0; const e = r() < 0.5 ? [nid(lv, i, j), nid(lv, i, j + 1)] : [nid(lv, j, i), nid(lv, j + 1, i)]; if (!edges.some(([p, q]) => (p === e[0] && q === e[1]) || (p === e[1] && q === e[0]))) edges.push(e); }
  }
  // room kinds: the centre column is the atrium (both floors); 6-8 chambers per floor; a few stair shafts
  nodes[nid(0, 2, 2)].kind = 'atrium'; nodes[nid(1, 2, 2)].kind = 'atrium_top';
  const fams = ['melee', 'ranged', 'small', 'melee', 'ranged', 'small', 'melee', 'ranged'];
  for (let lv = 0; lv < 2; lv++) { const cand = nodes.filter(n => n.lv === lv && n.kind === 'junction'); for (let k = 0; k < 7; k++) { const n = cand.splice((r() * cand.length) | 0, 1)[0]; if (!n) break; n.kind = 'chamber'; n.fam = fams[(k + lv * 3) % fams.length]; n.vault = r() < 0.6; n.ominous = r() < 0.15; n.variant = (r() * 3) | 0; } }
  const stairs = []; for (const n of nodes.filter(n => n.lv === 0 && n.kind === 'junction')) if (stairs.length < 3 && r() < 0.5) { n.kind = 'stairs'; nodes[nid(1, n.i, n.j)].kind = 'stairs_top'; stairs.push(n); }
  if (!stairs.length) { const n = nodes.find(n => n.lv === 0 && n.kind === 'junction'); if (n) { n.kind = 'stairs'; nodes[nid(1, n.i, n.j)].kind = 'stairs_top'; } }
  for (const n of nodes) n.alc = r(); for (const e of edges) e.push(r());
  st.tc = { nodes, edges, y0, ox, oz }; return st.tc;
}
const tTuff = (x, y, z, s) => { const q = rnd01(x, y, z, s ^ 0x7f); return q < 0.7 ? B.TUFF_BRICKS : q < 0.85 ? B.TUFF : B.DEEPSLATE_TILES; };
buildTrialChunk = function (world, c) {
  const sts = bigStartsNear(world, 'trial_chambers', c.cx, c.cz, 5); if (!sts.length) return; const W = pieceWriter(c, world); const seed = world.seed;
  W.trial = (x, y, z, mob) => { if (!W.inC(x, z)) return; W.set(x, y, z, B.TRIAL_SPAWNER); (c.trials = c.trials || []).push([x, y, z, mob]); };
  W.vault = (x, y, z, loot) => { if (!W.inC(x, z)) return; W.set(x, y, z, B.VAULT); (c.vaults = c.vaults || []).push([x, y, z, loot]); };
  const bx0 = c.cx * 16 - 12, bx1 = c.cx * 16 + 27, bz0 = c.cz * 16 - 12, bz1 = c.cz * 16 + 27; const near = (x, z) => x >= bx0 && x <= bx1 && z >= bz0 && z <= bz1;
  const box = (x0, y0, z0, x1, y1, z1, wall) => { // hollow box: walls/floor/ceiling of tuff, air inside
    W.fill(x0, y0, z0, x1, y1, z1, (x, y, z) => (x === x0 || x === x1 || z === z0 || z === z1 || y === y0 || y === y1) ? (wall ? wall(x, y, z) : tTuff(x, y, z, seed)) : 0); };
  const floorPat = (x0, y, z0, x1, z1) => W.fill(x0, y, z0, x1, y, z1, (x, yy, z) => ((x + z) & 1) ? B.TUFF_BRICKS : (((x >> 1) + (z >> 1)) & 1 ? B.COPPER_BLOCK : B.TUFF));
  const bulb = (x, y, z) => { W.set(x, y, z, B.GLOWSTONE); };
  for (const st of sts) { const L = tcLayout(world, st); const { nodes, edges } = L; const s = seed;
    // corridors
    for (const [a, b, q] of edges) { const A = nodes[a], Bn = nodes[b]; const x0 = Math.min(A.x, Bn.x), x1 = Math.max(A.x, Bn.x), z0 = Math.min(A.z, Bn.z), z1 = Math.max(A.z, Bn.z); if (!near(x0, z0) && !near(x1, z1) && !(x0 <= bx1 && x1 >= bx0 && z0 <= bz1 && z1 >= bz0)) continue;
      const y = A.y; const alongX = A.z === Bn.z;
      if (alongX) { box(x0, y - 1, z0 - 3, x1, y + 5, z0 + 3); floorPat(x0, y - 1, z0 - 2, x1, z0 + 2); for (let x = x0 + 3; x < x1 - 2; x += 4) { W.set(x, y + 4, z0, B.COPPER_BLOCK); bulb(x, y + 5, z0); } }
      else { box(x0 - 3, y - 1, z0, x0 + 3, y + 5, z1); floorPat(x0 - 2, y - 1, z0, x0 + 2, z1); for (let z = z0 + 3; z < z1 - 2; z += 4) { W.set(x0, y + 4, z, B.COPPER_BLOCK); bulb(x0, y + 5, z); } }
      // a side alcove with a supply chest or barrel halfway along some corridors
      if (q < 0.45) { const mx = (x0 + x1) >> 1, mz = (z0 + z1) >> 1; if (alongX) { box(mx - 1, y - 1, mz + 3, mx + 1, y + 3, mz + 5); W.fill(mx - 1, y, mz + 3, mx + 1, y + 2, mz + 3, 0); W.chest(mx, y, mz + 4, q < 0.2 ? 'trial_supply' : 'trial_corridor'); } else { box(mx + 3, y - 1, mz - 1, mx + 5, y + 3, mz + 1); W.fill(mx + 3, y, mz - 1, mx + 3, y + 2, mz + 1, 0); W.chest(mx + 4, y, mz, q < 0.2 ? 'trial_supply' : 'trial_corridor'); } }
    }
    // rooms at the nodes (drawn after corridors so their walls get doorways cut by the corridors below)
    for (const n of nodes) { const { x, y, z } = n; if (!near(x, z) && !(Math.abs(x - c.cx * 16 - 8) < 24 && Math.abs(z - c.cz * 16 - 8) < 24)) continue;
      const links = edges.filter(e => e[0] === nodes.indexOf(n) || e[1] === nodes.indexOf(n)).map(e => nodes[e[0] === nodes.indexOf(n) ? e[1] : e[0]]);
      const doorways = (R, top) => { for (const o of links) { const dx = Math.sign(o.x - x), dz = Math.sign(o.z - z); for (let a = -2; a <= 2; a++) for (let h = 0; h <= 3; h++) { if (dx) W.set(x + dx * R, y + h, z + a, 0); else W.set(x + a, y + h, z + dz * R, 0); } } };
      if (n.kind === 'junction' || n.kind === 'stairs_top') { box(x - 4, y - 1, z - 4, x + 4, y + 6, z + 4); floorPat(x - 3, y - 1, z - 3, x + 3, z + 3); for (const [a, b] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) { W.fill(x + a, y, z + b, x + a, y + 5, z + b, B.TUFF_BRICKS); } bulb(x, y + 6, z); bulb(x - 4, y + 3, z); bulb(x + 4, y + 3, z); doorways(4);
        if (n.kind === 'stairs_top') W.fill(x - 2, y - 1, z - 2, x + 2, y - 1, z + 2, (xx, yy, zz) => (xx === x && zz === z) ? B.COPPER_BLOCK : 0); }
      else if (n.kind === 'stairs') { box(x - 4, y - 1, z - 4, x + 4, y + TC.floorGap + 1, z + 4); floorPat(x - 3, y - 1, z - 3, x + 3, z + 3); doorways(4);
        // a spiral stair up to the next floor around a copper pillar
        const ring = [[-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2], [2, -1], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [-1, 2], [-2, 2], [-2, 1], [-2, 0], [-2, -1]];
        W.fill(x, y, z, x, y + TC.floorGap, z, B.COPPER_BLOCK); for (let k = 0; k < TC.floorGap; k++) { const [a, b] = ring[k % ring.length]; W.set(x + a, y + k, z + b, B.TUFF_BRICKS); }
        W.fill(x - 3, y + TC.floorGap - 1, z - 3, x + 3, y + TC.floorGap - 1, z + 3, (xx, yy, zz) => Math.abs(xx - x) <= 2 && Math.abs(zz - z) <= 2 ? 0 : B.TUFF_BRICKS); bulb(x, y + TC.floorGap + 1, z + 3); }
      else if (n.kind === 'chamber') { const R = 6, H = 9; box(x - R, y - 1, z - R, x + R, y + H, z + R); floorPat(x - R + 1, y - 1, z - R + 1, x + R - 1, z + R - 1); doorways(R);
        const fam = TRIAL_FAMILIES[n.fam]; const rr = mulberry32(ihash(x, y, z, s)); const pick = () => pickWeightedR(rr, Object.fromEntries(Object.entries(fam).filter(([k, v]) => v > 0 && MOBS[k])));
        if (n.variant === 0) { for (const [a, b] of [[-3, -3], [3, 3]]) W.trial(x + a, y, z + b, pick()); W.fill(x - 1, y, z - 1, x + 1, y, z + 1, B.TUFF_BRICKS); bulb(x, y + H, z); }
        else if (n.variant === 1) { W.fill(x - R + 1, y + 3, z - R + 1, x + R - 1, y + 3, z + R - 1, (xx, yy, zz) => (Math.abs(xx - x) > 3 || Math.abs(zz - z) > 3) ? B.TUFF_BRICKS : 0); for (let h = 0; h < 3; h++) W.set(x - R + 2 + h, y + h, z + R - 2, B.TUFF_BRICKS); W.trial(x - 4, y + 4, z - 4, pick()); W.trial(x + 4, y + 4, z + 4, pick()); W.trial(x, y, z, pick()); bulb(x, y + H, z); }
        else { for (const [a, b] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) W.fill(x + a, y, z + b, x + a, y + 2, z + b, B.COPPER_BLOCK); W.trial(x - 4, y, z + 4, pick()); W.trial(x + 4, y, z - 4, pick()); bulb(x - 3, y + H, z); bulb(x + 3, y + H, z); }
        for (const [a, b] of [[-R, -3], [-R, 3], [R, -3], [R, 3]]) { bulb(x + a, y + 4, z + b); bulb(x + b, y + 4, z + a); }
        if (n.vault) W.vault(x + R - 1, y, z - R + 1, n.ominous ? 'ominous_vault' : 'trial_vault'); if (n.alc < 0.5) W.chest(x - R + 1, y, z + R - 1, 'trial_corridor'); }
      else if (n.kind === 'atrium') { const R = 6, H = TC.floorGap * 2 + 2; box(x - R, y - 1, z - R, x + R, y + H, z + R); floorPat(x - R + 1, y - 1, z - R + 1, x + R - 1, z + R - 1); doorways(R);
        for (const lv of [1]) { const yy = y + lv * TC.floorGap; for (const o of edges.filter(e => nodes[e[0]] === nodes[nodes.indexOf(n) + TC.grid * TC.grid] || nodes[e[1]] === nodes[nodes.indexOf(n) + TC.grid * TC.grid])) { } W.fill(x - R + 1, yy - 1, z - R + 1, x + R - 1, yy - 1, z + R - 1, (xx, y2, zz) => Math.abs(xx - x) <= 3 && Math.abs(zz - z) <= 3 ? 0 : B.TUFF_BRICKS); }
        // floating platforms and a breeze spawner in the middle, with the vault on a ledge
        for (const [a, b, h] of [[-2, 2, 4], [2, -2, 7], [-1, -2, 13], [2, 1, 16]]) W.fill(x + a, y + h, z + b, x + a + 1, y + h, z + b + 1, B.TUFF_BRICKS);
        W.trial(x, y, z, 'breeze'); W.trial(x + 2, y + 8, z - 2, 'breeze'); W.vault(x - R + 1, y + TC.floorGap, z, 'trial_vault'); W.chest(x + R - 1, y + TC.floorGap, z + R - 1, 'trial_supply');
        for (const h of [4, 12, 20]) { bulb(x - R, y + h, z); bulb(x + R, y + h, z); }
        // the upper floor's doorways into the atrium
        const top = nodes[nodes.indexOf(n) + TC.grid * TC.grid]; const tl = edges.filter(e => e[0] === nodes.indexOf(top) || e[1] === nodes.indexOf(top)).map(e => nodes[e[0] === nodes.indexOf(top) ? e[1] : e[0]]);
        for (const o of tl) { const dx = Math.sign(o.x - x), dz = Math.sign(o.z - z); for (let a = -2; a <= 2; a++) for (let h = 0; h <= 3; h++) { if (dx) W.set(x + dx * R, top.y + h, z + a, 0); else W.set(x + a, top.y + h, z + dz * R, 0); } } }
    }
    // the whole complex is sealed: carve nothing into open caves except through its own walls
  }
};
// "baby_zombie" is a zombie flagged as a baby where babies exist

// ================= COLOURS AT RUN TIME: concrete setting in water, badlands =================
// Concrete powder turns into concrete as soon as it touches water (placed next to it, water flowing to it, or falling
// into it). Badlands: red sand, layered bands of coloured terracotta, dead bushes, cacti; in hot, dry deserts.
Object.assign(BIO, { BADLANDS: 15 }); BIO_NAME.push('Badlands');
function hardenPowder(x, y, z) { const d = BL[world.get(x, y, z)]; if (!d || !d.hardensTo) return; for (const [a, b, c] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) if (FKIND[world.get(x + a, y + b, z + c)] === 1) { world.set(x, y, z, B[d.hardensTo.toUpperCase()]); return; } }
{ const _set = World.prototype.set; let busy = false; World.prototype.set = function (x, y, z, id, record) {
    const r = _set.apply(this, arguments); if (r === false || busy || this !== G.world) return r; busy = true;
    try { const d = BL[id]; if (d && d.hardensTo) hardenPowder(x, y, z); else if (FKIND[id] === 1) for (const [a, b, c] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) hardenPowder(x + a, y + b, z + c); } finally { busy = false; }
    return r; }; }
// falling powder that lands in water sets too (falling blocks finish with a world.set, handled above)
for (const d of BL) if (d && d.hardensTo) d.fall = true; if (B.RED_SAND !== undefined) BL[B.RED_SAND].fall = true;
// ---- badlands ----
{ const _col = Gen.prototype.column; Gen.prototype.column = function (x, z) {
    const c = _col.call(this, x, z);
    if (c.b === BIO.DESERT && this.nT.f2(x / 640 - 70, z / 640 + 40, 2) > 0.16) { c.b = BIO.BADLANDS;
      // mesas: flat-topped, stepped hills whose cliffs show the terracotta bands
      const m = this.nW.f2(x / 110 + 7, z / 110 - 3, 2); c.h += clamp(Math.floor((m - 0.05) * 90 / 5) * 5, 0, 30); }
    return c; }; }
const BADLAND_BANDS = ['terracotta', 'orange_terracotta', 'terracotta', 'yellow_terracotta', 'brown_terracotta', 'terracotta', 'red_terracotta', 'white_terracotta', 'terracotta', 'light_gray_terracotta', 'orange_terracotta', 'terracotta', 'brown_terracotta', 'yellow_terracotta', 'terracotta', 'red_terracotta'];
{ const _dec = decorate; decorate = function (world, S, cx, cz) {
    const r0 = _dec.apply(this, arguments); const g = world.gen, seed = world.seed; const bx = cx * 16, bz = cz * 16;
    if (world.dim !== 'overworld') return r0; let any = false; for (const [a, b] of [[0, 0], [15, 0], [0, 15], [15, 15], [8, 8]]) if (g.column(bx + a, bz + b).b === BIO.BADLANDS) any = true; if (!any) return r0;
    const hard = (x, y, z, id) => { if (y > 0 && y < WH) S.hard.push(x, y, z, id); }, soft = (x, y, z, id) => { if (y > 0 && y < WH) S.soft.push(x, y, z, id); };
    const shift = (ihash(0, 0, 515, seed) >>> 0) % 16;
    for (let lx = 0; lx < 16; lx++) for (let lz = 0; lz < 16; lz++) { const x = bx + lx, z = bz + lz; const col = g.column(x, z); if (col.b !== BIO.BADLANDS || col.h <= SEA) continue; const top = col.h - 1;
      // flat ground keeps red sand on top; slopes and hills show the terracotta bands
      const steep = Math.max(...[[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => Math.abs(g.column(x + a, z + b).h - col.h))) > 1;
      for (let y = top; y > top - 14 && y > 1; y--) { if (g.cave(x, y, z)) continue; let id;
        if (y >= top - 1 && !steep && col.h < SEA + 30) id = y === top ? B.RED_SAND : B.RED_SAND; else id = B[BADLAND_BANDS[(y + shift + ((rnd01(x >> 3, 0, z >> 3, seed) * 2) | 0)) % 16].toUpperCase()];
        hard(x, y, z, id); }
      const q = rnd01(x, top + 1, z, seed + 77); if (!steep && q < 0.01) soft(x, top + 1, z, B.DEAD_BUSH); else if (!steep && q < 0.014) { for (let k = 1; k <= 2; k++) soft(x, top + k, z, B.CACTUS); } }
    return r0; }; }

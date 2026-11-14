// ================= TEXTURE PASS 3: blocks that were hard to tell apart =================
// Every texture here is original procedural pixel art (no Minecraft files), tuned so each block has its own colour and
// its own pattern the way Minecraft's do: stone is flat and patchy, andesite swirly, diorite salt-and-pepper, granite
// pink, tuff dark green-grey, gravel small pebbles; each log has its own bark colour and pattern; snow, wool and quartz
// are different whites; obsidian and the dragon egg are different blacks.
const RX = {
  // pick from a few flat tones by a noise value (Minecraft textures use a handful of flat tones, not smooth gradients)
  tone(pal, v) { return pal[Math.min(pal.length - 1, Math.max(0, Math.floor(v * pal.length)))]; },
  // small blobs (1-3 px) of a colour
  blobs(set, r, n, col, maxLen = 2, horiz = true) { for (let k = 0; k < n; k++) { const x = r() * 16 | 0, y = r() * 16 | 0, l = 1 + (r() * maxLen | 0); for (let i = 0; i < l; i++) set(horiz ? (x + i) % 16 : x, horiz ? y : (y + i) % 16, vary(col, r, 4)); if (r() < 0.35) set(x, (y + 1) % 16, vary(col, r, 4)); } },
};
// ---- stones ----
makeTile('stone', (set, r) => { const a = tnoise(501, 4), b = tnoise(502, 8); const pal = [[110, 110, 110], [119, 119, 119], [127, 127, 127], [134, 134, 134], [143, 143, 143]];
  each((x, y) => { const v = a(x, y * 1.4) * 0.6 + b(x, y) * 0.4; set(x, y, vary(RX.tone(pal, (v - 0.2) / 0.6), r, 2)); }); RX.blobs(set, r, 5, [100, 100, 100], 3); });
makeTile('andesite', (set, r) => { const a = tnoise(511, 8); const pal = [[118, 118, 120], [132, 132, 134], [142, 142, 144]];
  each((x, y) => set(x, y, vary(RX.tone(pal, a(x, y)), r, 3))); RX.blobs(set, r, 26, [170, 170, 172], 3); RX.blobs(set, r, 20, [98, 98, 100], 2); RX.blobs(set, r, 6, [190, 190, 192], 1); });
makeTile('diorite', (set, r) => { const a = tnoise(521, 8); const pal = [[180, 180, 182], [196, 196, 198], [210, 210, 210]];
  each((x, y) => set(x, y, vary(RX.tone(pal, a(x, y)), r, 3))); RX.blobs(set, r, 22, [240, 240, 240], 3); RX.blobs(set, r, 18, [118, 118, 120], 2); RX.blobs(set, r, 8, [80, 80, 82], 1); });
makeTile('granite', (set, r) => { const a = tnoise(531, 8); const pal = [[138, 92, 74], [152, 104, 86], [164, 114, 96]];
  each((x, y) => set(x, y, vary(RX.tone(pal, a(x, y)), r, 4))); RX.blobs(set, r, 22, [106, 68, 54], 2); RX.blobs(set, r, 18, [190, 140, 120], 2); RX.blobs(set, r, 5, [214, 184, 172], 1); });
makeTile('tuff', (set, r) => { const a = tnoise(541, 4), b = tnoise(542, 8); const pal = [[88, 89, 85], [98, 99, 94], [108, 109, 103]];
  each((x, y) => set(x, y, vary(RX.tone(pal, a(x, y) * 0.5 + b(x, y) * 0.5), r, 3))); RX.blobs(set, r, 18, [126, 124, 112], 1); RX.blobs(set, r, 12, [70, 72, 68], 2); RX.blobs(set, r, 5, [146, 142, 126], 1); });
makeTile('gravel', (set, r) => { const m = voronoi(r, 30); const pal = [[136, 128, 124], [112, 106, 104], [154, 146, 140], [96, 92, 92], [128, 114, 106], [146, 132, 122], [120, 116, 118]];
  const tones = []; for (let i = 0; i < 30; i++) tones.push(pal[r() * pal.length | 0]);
  each((x, y) => { const k = y * 16 + x; if (m.d2[k] - m.d1[k] < 0.7) { set(x, y, vary([76, 72, 72], r, 5)); return; } const me = m.id[k]; let c = tones[me];
    if (cid(m, x, y - 1) !== me || cid(m, x - 1, y) !== me) c = shadeC(c, 1.14); else if (cid(m, x, y + 1) !== me || cid(m, x + 1, y) !== me) c = shadeC(c, 0.82); set(x, y, vary(c, r, 5)); }); });
makeTile('sand', (set, r) => { const a = tnoise(551, 8); const pal = [[212, 200, 154], [220, 208, 162], [226, 216, 172]];
  each((x, y) => set(x, y, vary(RX.tone(pal, a(x, y)), r, 3))); RX.blobs(set, r, 20, [238, 232, 196], 1); RX.blobs(set, r, 16, [194, 178, 128], 1); RX.blobs(set, r, 4, [170, 150, 108], 1); });
// ---- whites ----
makeTile('snow', (set, r) => { const a = tnoise(561, 4); each((x, y) => { const v = a(x, y); let c = v < 0.3 ? [238, 246, 250] : [249, 253, 254]; set(x, y, vary(c, r, 1.5)); }); RX.blobs(set, r, 7, [230, 240, 246], 1); RX.blobs(set, r, 5, [255, 255, 255], 1); });
makeTile('wool', (set, r) => { const a = tnoise(571, 8);
  // woven fibres: little diagonal strands in alternating directions, like knitted wool
  each((x, y) => { const cell = ((x >> 2) + (y >> 2)) & 1, u = x & 3, w = y & 3; const strand = cell ? (u === w || u === (w + 1) % 4) : (u === 3 - w || u === (6 - w) % 4); let c = strand ? [236, 238, 238] : [214, 218, 218]; if (u === 0 && w === 0) c = [200, 204, 204]; set(x, y, vary(shadeC(c, 0.96 + a(x, y) * 0.06), r, 2)); }); });
makeTile('quartz_block', (set, r) => { const a = tnoise(581, 2); each((x, y) => { let c = mixc([232, 226, 216], [240, 236, 228], a(x, y)); set(x, y, vary(c, r, 1.5)); }); RX.blobs(set, r, 3, [224, 216, 206], 3); });
// ---- black blocks ----
makeTile('obsidian', (set, r) => { const a = tnoise(591, 4), b = tnoise(592, 8);
  each((x, y) => { const v = a(x, y) * 0.6 + b(x, y) * 0.4; let c = v < 0.38 ? [14, 10, 22] : v < 0.62 ? [22, 16, 36] : [34, 24, 54]; set(x, y, vary(c, r, 2)); });
  // glassy purple flecks and a few bright glints
  for (let k = 0; k < 7; k++) { const x = r() * 16 | 0, y = r() * 16 | 0; set(x, y, [60, 40, 96]); set(x + 1, y, [46, 32, 74]); if (r() < 0.5) set(x, y + 1, [46, 32, 74]); }
  RX.blobs(set, r, 5, [104, 74, 156], 1); });
makeTile('dragon_egg', (set, r) => { each((x, y) => set(x, y, vary([12, 9, 16], r, 2)));
  // dense purple speckles over black, brighter than obsidian's
  RX.blobs(set, r, 46, [52, 22, 72], 2); RX.blobs(set, r, 20, [96, 44, 132], 1); RX.blobs(set, r, 6, [176, 108, 220], 1); });
// ---- nether / light blocks ----
makeTile('nether_wart', (set, r) => { const m = voronoi(r, 9);
  each((x, y) => { const k = y * 16 + x; const e = m.d2[k] - m.d1[k]; let c = e < 0.9 ? [84, 2, 2] : m.d1[k] < 1.6 ? [156, 22, 14] : [120, 6, 4]; set(x, y, vary(c, r, 5)); }); RX.blobs(set, r, 6, [178, 40, 26], 1); });
makeTile('shroomlight', (set, r) => { each((x, y) => set(x, y, vary([236, 144, 70], r, 6)));
  // round lighter spots ringed in darker orange
  for (let k = 0; k < 7; k++) { const cx = r() * 16, cy = r() * 16, rad = 1.3 + r() * 1.3; each((x, y) => { let dx = Math.abs(x + 0.5 - cx), dy = Math.abs(y + 0.5 - cy); dx = Math.min(dx, 16 - dx); dy = Math.min(dy, 16 - dy); const d = Math.hypot(dx, dy); if (d < rad * 0.6) set(x, y, vary([255, 226, 150], r, 4)); else if (d < rad) set(x, y, vary([254, 186, 102], r, 4)); else if (d < rad + 0.8) set(x, y, vary([196, 96, 44], r, 4)); }); } });
makeTile('glowstone', (set, r) => { const m = voronoi(r, 11); const tones = []; for (let i = 0; i < 11; i++) tones.push([[204, 160, 92], [226, 186, 112], [244, 214, 140], [182, 136, 76]][r() * 4 | 0]);
  each((x, y) => { const k = y * 16 + x; if (m.d2[k] - m.d1[k] < 0.8) { set(x, y, vary([112, 82, 44], r, 5)); return; } let c = tones[m.id[k]]; if (m.d1[k] < 1) c = [255, 240, 196]; set(x, y, vary(c, r, 5)); }); });
// ---- logs: each wood its own bark colour and pattern, and its own end-grain colour ----
function bark3(set, r, o) { const n = tnoise(o.seed, 8);
  for (let x = 0; x < 16; x++) { const off = r() * 16; for (let y = 0; y < 16; y++) { const v = n(x * 0.7, y * 0.2 + off); let c = v < 0.32 ? o.dark : v > 0.72 ? o.hi : o.base;
    if (o.grooves.includes(x) && r() < 0.8) c = o.groove; set(x, y, vary(c, r, 4)); } }
  // horizontal cracks (acacia, dark oak plates)
  for (let k = 0; k < (o.cracks || 0); k++) { const y = r() * 16 | 0, x = r() * 16 | 0, l = 2 + (r() * 3 | 0); for (let i = 0; i < l; i++) set((x + i) % 16, y, vary(o.groove, r, 3)); }
  for (let k = 0; k < (o.spots || 0); k++) set(r() * 16 | 0, r() * 16 | 0, vary(o.spot, r, 5)); }
function rings3(set, r, a, b, bark) { each((x, y) => { const dx = Math.abs(x - 7.5), dy = Math.abs(y - 7.5); if (Math.max(dx, dy) > 6.6) { set(x, y, vary(bark, r, 4)); return; }
  const d = Math.max(dx, dy) * 0.55 + Math.hypot(dx, dy) * 0.45; const ring = Math.floor(d * 0.95) % 2; let c = ring ? b : a; if (d < 1) c = shadeC(b, 0.88); set(x, y, vary(c, r, 3)); }); }
const WOODS = {
  log: { side: { seed: 601, base: [110, 86, 52], dark: [92, 70, 40], hi: [136, 106, 66], groove: [70, 52, 30], grooves: [1, 5, 8, 12, 14] }, top: [[184, 148, 94], [156, 122, 74]] },
  spruce: { side: { seed: 602, base: [62, 40, 18], dark: [50, 32, 14], hi: [84, 56, 28], groove: [36, 22, 9], grooves: [0, 3, 5, 7, 10, 13] }, top: [[122, 90, 54], [98, 72, 42]] },
  jungle: { side: { seed: 603, base: [88, 70, 28], dark: [72, 56, 20], hi: [116, 94, 44], groove: [58, 44, 14], grooves: [2, 6, 11], spots: 7, spot: [104, 108, 40] }, top: [[176, 132, 86], [152, 108, 66]] },
  acacia: { side: { seed: 604, base: [104, 98, 88], dark: [88, 82, 74], hi: [128, 120, 108], groove: [70, 64, 58], grooves: [4, 11], cracks: 7 }, top: [[184, 100, 54], [156, 80, 42]] },
  dark_oak: { side: { seed: 605, base: [62, 46, 26], dark: [48, 36, 20], hi: [80, 62, 36], groove: [32, 23, 12], grooves: [2, 7, 12], cracks: 5 }, top: [[92, 62, 34], [70, 46, 24]] },
};
for (const k in WOODS) { const w = WOODS[k], side = k === 'log' ? 'log_side' : k + '_side', top = k === 'log' ? 'log_top' : k + '_top'; makeTile(side, (set, r) => bark3(set, r, w.side)); makeTile(top, (set, r) => rings3(set, r, w.top[0], w.top[1], w.side.base)); }
makeTile('birch_top', (set, r) => rings3(set, r, [216, 200, 142], [192, 174, 118], [222, 220, 210]));
paintWoodTiles(); paintStoneTiles(); paintColorTiles(); paintCopperTiles(); paintNatureTiles(); paintOceanTiles(); paintCaveTiles(); paintRedstoneTiles(); paintDecoTiles(); paintSignTiles();

// ---- icons for blocks built from boxes (dragon egg, anvils, cauldron, ...): draw the real shape, not a full cube ----
{ const _bic = blockIconCanvas; blockIconCanvas = function (id) {
  const d = BL[id];
  if (d && d.iconPaint && ICONP[d.key]) { const c = document.createElement('canvas'); c.width = c.height = 48; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(iconCanvas(ICONP[d.key]), 0, 0, 48, 48); return c; }
  if (d && d.iconTile && TILE[d.iconTile] !== undefined) { const c = document.createElement('canvas'); c.width = c.height = 48; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(tileCanvas(TILE[d.iconTile]), 0, 0, 48, 48); return c; }
  if (!d || d.render !== 'boxes' || d.flatIcon || !d.boxes || d.ladder) return _bic(id);
  const c = document.createElement('canvas'); c.width = c.height = 48; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const L = document.createElement('canvas'); L.width = L.height = 48; const lx = L.getContext('2d'); lx.imageSmoothingEnabled = false;
  const face = (t, m, sx, sy, w, h, dark) => { if (w <= 0 || h <= 0) return; lx.setTransform(1, 0, 0, 1, 0, 0); lx.clearRect(0, 0, 48, 48); lx.setTransform(...m); lx.drawImage(tileCanvas(t), sx, sy, w, h, sx, sy, w, h);
    if (dark) { lx.setTransform(1, 0, 0, 1, 0, 0); lx.globalCompositeOperation = 'source-atop'; lx.fillStyle = 'rgba(0,0,0,' + dark + ')'; lx.fillRect(0, 0, 48, 48); lx.globalCompositeOperation = 'source-over'; } x.drawImage(L, 0, 0); };
  const boxes = d.boxes.slice().sort((a, b) => a[1] - b[1] || b[0] - a[0] || a[2] - b[2]);
  for (const [x0, y0, z0, x1, y1, z1, bt] of boxes) { const T3 = (f) => bt != null ? bt : d.texIds[f];
    face(T3(4), [1.25, 0.625, 0, 1.5, 4 + x0 * 1.25, 13 - x0 * 0.625], z0, 16 - y1, z1 - z0, y1 - y0, 0.22);       // west side
    face(T3(0), [1.25, -0.625, 0, 1.5, 4 + z1 * 1.25, 13 + z1 * 0.625], x0, 16 - y1, x1 - x0, y1 - y0, 0.42);      // south side
    face(T3(2), [1.25, -0.625, 1.25, 0.625, 4, 13 + (16 - y1) * 1.5], x0, z0, x1 - x0, z1 - z0, 0);                 // top
  }
  return c; }; }

buildIcons();

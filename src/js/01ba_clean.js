// ================= CLEANER TEXTURES AND ITEM PICTURES =================
// Every block tile is redrawn from a small palette (k-means, usually 6 shades, more when a tile needs them), with lone
// speckle pixels merged into their neighbours and the shading spread a little, so tiles read like hand-made pixel art
// instead of noise. Item pictures get Minecraft's look: a dark outline in the item's own colour, a lit top-left edge
// and a shaded bottom-right edge.
const CLEAN_SKIP = /^(water|lava|portal|redstone_dust_|rs_|candle_flame|tripwire|chain$|frogspawn)/;
function cleanTile(d) {
  const px = []; const idx = []; for (let k = 0; k < 256; k++) if (d[k * 4 + 3] > 0) { px.push([d[k * 4], d[k * 4 + 1], d[k * 4 + 2]]); idx.push(k); }
  const n = px.length; if (n < 20) return false;
  const seen = new Set(); for (const p of px) { seen.add((p[0] >> 2) << 12 | (p[1] >> 2) << 6 | (p[2] >> 2)); if (seen.size > 8) break; } if (seen.size <= 7) return false; // already a clean palette
  const lum = (p) => p[0] * 0.3 + p[1] * 0.59 + p[2] * 0.11;
  const order = idx.map((_, i) => i).sort((a, b) => lum(px[a]) - lum(px[b]));
  const km = (K) => { const cent = []; for (let i = 0; i < K; i++) cent.push(px[order[Math.floor((i + 0.5) / K * n)]].slice()); const lab = new Int8Array(n); const err = new Float32Array(n);
    for (let it = 0; it < 10; it++) { const sum = cent.map(() => [0, 0, 0, 0]); let far = 0, farI = 0;
      for (let i = 0; i < n; i++) { const p = px[i]; let best = 1e9, bk = 0; for (let k = 0; k < K; k++) { const c = cent[k]; const e = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (e < best) { best = e; bk = k; } } lab[i] = bk; err[i] = Math.sqrt(best); if (best > far) { far = best; farI = i; } const s = sum[bk]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++; }
      for (let k = 0; k < K; k++) { const s = sum[k]; if (s[3]) { cent[k][0] = s[0] / s[3]; cent[k][1] = s[1] / s[3]; cent[k][2] = s[2] / s[3]; } else cent[k] = px[farI].slice(); } }
    return { cent, lab, err }; };
  let res = null; for (const K of [6, 9, 12]) { const r = km(K); const e = Array.from(r.err).sort((a, b) => a - b); const mean = e.reduce((a, b) => a + b, 0) / n; if (e[Math.floor(n * 0.97)] < 26 && mean < 9) { res = r; break; } }
  if (!res) return false;
  const { cent, lab } = res; const ml = cent.reduce((a, c) => a + lum(c), 0) / cent.length; for (const c of cent) { const l = lum(c); const f = 1 + 0.1 * (l - ml) / Math.max(20, l); for (let j = 0; j < 3; j++) c[j] = clamp(c[j] * f, 0, 255); }
  const L = new Int8Array(256).fill(-1); idx.forEach((k, i) => L[k] = lab[i]); const L2 = L.slice();
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const k = y * 16 + x; const v = L[k]; if (v < 0) continue; const nb = [L[y * 16 + ((x + 1) & 15)], L[y * 16 + ((x + 15) & 15)], L[((y + 1) & 15) * 16 + x], L[((y + 15) & 15) * 16 + x]]; if (nb.includes(v)) continue;
    const cnt = {}; for (const q of nb) if (q >= 0) cnt[q] = (cnt[q] || 0) + 1; for (const q in cnt) if (cnt[q] >= 3) L2[k] = +q; }
  for (let k = 0; k < 256; k++) if (L2[k] >= 0) { const c = cent[L2[k]]; d[k * 4] = c[0]; d[k * 4 + 1] = c[1]; d[k * 4 + 2] = c[2]; }
  return true; }
function cleanTiles() { const names = Object.keys(TILE); for (const name of names) { if (CLEAN_SKIP.test(name)) continue; const i = TILE[name]; const sx = (i % ATN) * 16, sy = Math.floor(i / ATN) * 16;
    const img = actx.getImageData(sx, sy, 16, 16); if (!cleanTile(img.data)) continue; actx.putImageData(img, sx, sy);
    let s = [0, 0, 0], c = 0; const d = img.data; for (let k = 0; k < 1024; k += 4) if (d[k + 3] > 0) { s[0] += d[k]; s[1] += d[k + 1]; s[2] += d[k + 2]; c++; } if (c) TILE_AVG[i] = [s[0] / c / 255, s[1] / c / 255, s[2] / c / 255]; } }
// ---- item pictures ----
function polishIcon(c) { if (!c || c.width !== 16) return c; const x = c.getContext('2d'); const img = x.getImageData(0, 0, 16, 16); const a = img.data; const A = (px, py) => px >= 0 && py >= 0 && px < 16 && py < 16 && a[(py * 16 + px) * 4 + 3] > 0;
  const lum = (k) => a[k] * 0.3 + a[k + 1] * 0.59 + a[k + 2] * 0.11; let eL = 0, eN = 0, iL = 0, iN = 0, total = 0;
  for (let py = 0; py < 16; py++) for (let px = 0; px < 16; px++) { if (!A(px, py)) continue; total++; const k = (py * 16 + px) * 4; const edge = !A(px + 1, py) || !A(px - 1, py) || !A(px, py + 1) || !A(px, py - 1); if (edge) { eL += lum(k); eN++; } else { iL += lum(k); iN++; } }
  if (total < 3) return c; const outlined = iN > 3 && eN && eL / eN < 0.62 * (iL / iN);
  const src = new Uint8ClampedArray(a); const o = img.data;
  if (!outlined) for (let py = 0; py < 16; py++) for (let px = 0; px < 16; px++) { if (A(px, py)) continue; let r = 0, g = 0, b = 0, m = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const qx = px + dx, qy = py + dy; if (qx < 0 || qy < 0 || qx > 15 || qy > 15 || src[(qy * 16 + qx) * 4 + 3] === 0) continue; const k = (qy * 16 + qx) * 4; r += src[k]; g += src[k + 1]; b += src[k + 2]; m++; }
    if (m) { const k = (py * 16 + px) * 4; o[k] = r / m * 0.32; o[k + 1] = g / m * 0.32; o[k + 2] = b / m * 0.32; o[k + 3] = 255; } }
  const S = (px, py) => px >= 0 && py >= 0 && px < 16 && py < 16 && src[(py * 16 + px) * 4 + 3] > 0;
  for (let py = 0; py < 16; py++) for (let px = 0; px < 16; px++) { if (!S(px, py)) continue; const k = (py * 16 + px) * 4; let f = 1; if (!S(px, py - 1) || !S(px - 1, py)) f *= 1.12; if (!S(px, py + 1) || !S(px + 1, py)) f *= 0.86; if (f !== 1) { o[k] = Math.min(255, src[k] * f); o[k + 1] = Math.min(255, src[k + 1] * f); o[k + 2] = Math.min(255, src[k + 2] * f); } }
  x.putImageData(img, 0, 0); return c; }
{ const _ic = iconCanvas; iconCanvas = function (painter) { return polishIcon(_ic.apply(this, arguments)); }; }

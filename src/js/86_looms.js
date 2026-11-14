// ================= LOOM AND BANNER PATTERNS, ARMOR TRIMS (Minecraft) =================
// The loom takes a banner, a dye and (for the special ones) a banner pattern item, and adds a layer; a banner holds up to
// 6 layers, and placed banners show them. The smithing table also takes an armor trim template, a piece of armor and a
// trim material (iron, copper, gold, lapis, emerald, diamond, netherite, redstone, amethyst, quartz) and draws the trim
// on the armor you wear.
const LOOM_BASIC = [['stripe_bottom', 'Base'], ['stripe_top', 'Chief'], ['stripe_left', 'Pale Dexter'], ['stripe_right', 'Pale Sinister'], ['stripe_center', 'Pale'], ['stripe_middle', 'Fess'], ['stripe_downright', 'Bend'], ['stripe_downleft', 'Bend Sinister'],
  ['small_stripes', 'Paly'], ['cross', 'Saltire'], ['straight_cross', 'Cross'], ['triangle_bottom', 'Chevron'], ['triangle_top', 'Inverted Chevron'], ['diagonal_left', 'Per Bend Sinister'], ['diagonal_right', 'Per Bend'], ['half_vertical', 'Per Pale'], ['half_vertical_right', 'Per Pale Inverted'],
  ['half_horizontal', 'Per Fess'], ['half_horizontal_bottom', 'Per Fess Inverted'], ['square_bottom_left', 'Base Dexter Canton'], ['square_bottom_right', 'Base Sinister Canton'], ['square_top_left', 'Chief Dexter Canton'], ['square_top_right', 'Chief Sinister Canton'],
  ['circle', 'Roundel'], ['rhombus', 'Lozenge'], ['border', 'Bordure'], ['gradient', 'Gradient'], ['gradient_up', 'Base Gradient']];
const DYE_RGB = Object.fromEntries(COLORDATA().map(c => [c[0], c[2]]));
// does pattern p cover cell (x, y) of a 20 x 40 banner? returns 0..1 (gradients fade)
function patternAt(p, x, y) { const W = 20, H = 40, u = (x + 0.5) / W, v = (y + 0.5) / H;
  switch (p) {
    case 'stripe_bottom': return v > 2 / 3 ? 1 : 0; case 'stripe_top': return v < 1 / 3 ? 1 : 0; case 'stripe_left': return u < 1 / 3 ? 1 : 0; case 'stripe_right': return u > 2 / 3 ? 1 : 0;
    case 'stripe_center': return u > 0.38 && u < 0.62 ? 1 : 0; case 'stripe_middle': return v > 0.42 && v < 0.58 ? 1 : 0; case 'stripe_downright': return Math.abs(u - v) < 0.14 ? 1 : 0; case 'stripe_downleft': return Math.abs(u - (1 - v)) < 0.14 ? 1 : 0;
    case 'small_stripes': return (x >> 1) % 2 === 0 && x > 0 && x < 19 ? 1 : 0; case 'cross': return Math.abs(u - v) < 0.12 || Math.abs(u - (1 - v)) < 0.12 ? 1 : 0; case 'straight_cross': return Math.abs(u - 0.5) < 0.12 || Math.abs(v - 0.5) < 0.06 ? 1 : 0;
    case 'triangle_bottom': return v > 0.75 && Math.abs(u - 0.5) < (v - 0.75) * 2 ? 1 : 0; case 'triangle_top': return v < 0.25 && Math.abs(u - 0.5) < (0.25 - v) * 2 ? 1 : 0;
    case 'diagonal_left': return u + v < 1 ? 1 : 0; case 'diagonal_right': return u > v ? 1 : 0; case 'half_vertical': return u < 0.5 ? 1 : 0; case 'half_vertical_right': return u >= 0.5 ? 1 : 0; case 'half_horizontal': return v < 0.5 ? 1 : 0; case 'half_horizontal_bottom': return v >= 0.5 ? 1 : 0;
    case 'square_bottom_left': return u < 0.4 && v > 0.78 ? 1 : 0; case 'square_bottom_right': return u > 0.6 && v > 0.78 ? 1 : 0; case 'square_top_left': return u < 0.4 && v < 0.22 ? 1 : 0; case 'square_top_right': return u > 0.6 && v < 0.22 ? 1 : 0;
    case 'circle': return Math.hypot(u - 0.5, (v - 0.5) * 2) < 0.22 ? 1 : 0; case 'rhombus': return Math.abs(u - 0.5) + Math.abs(v - 0.5) * 2 < 0.36 ? 1 : 0; case 'border': return x < 1 || x > 18 || y < 1 || y > 38 ? 1 : 0;
    case 'gradient': return Math.max(0, 1 - v * 1.15); case 'gradient_up': return Math.max(0, (v - 0.13) * 1.15);
  }
  const g = BANNER_GLYPH(p); if (!g.length) return 0; const gx = Math.floor((x - 3) / 14 * 6), gy = Math.floor((y - 8) / 18 * 8); return gx >= 0 && gx < 6 && gy >= 0 && gy < 8 && g[gy][gx] === '#' ? 1 : 0; }
function bannerCanvas(layers) { const c = document.createElement('canvas'); c.width = 20; c.height = 40; const g = c.getContext('2d'); const img = g.createImageData(20, 40);
  for (const [p, col] of layers) { const rgb = DYE_RGB[col] || [255, 255, 255]; for (let y = 0; y < 40; y++) for (let x = 0; x < 20; x++) { const a = patternAt(p, x, y); if (!a) continue; const i = (y * 20 + x) * 4; const ia = img.data[i + 3] / 255; const k = a; img.data[i] = img.data[i] * (1 - k) * ia + rgb[0] * k + (ia ? 0 : 0); img.data[i + 1] = img.data[i + 1] * (1 - k) * ia + rgb[1] * k; img.data[i + 2] = img.data[i + 2] * (1 - k) * ia + rgb[2] * k; img.data[i + 3] = Math.max(img.data[i + 3], Math.round(255 * k)); } }
  g.putImageData(img, 0, 0); return c; }
// ---- the loom ----
function openLoomUI() { const slots = [null, null, null, null]; let sel = null;
  const avail = () => { const pat = slots[2] && ITEMS[slots[2].id].pattern; return pat ? [[pat, ITEMS[slots[2].id].name.replace(' Banner Pattern', '')]] : LOOM_BASIC; };
  const result = () => { const b = slots[0], d = slots[1]; if (!b || !d || !sel) return null; const layers = (b.data && b.data.layers) || []; if (layers.length >= 6) return null; const col = ITEMS[d.id].key.replace('_dye', ''); return Object.assign({}, b, { count: 1, data: { layers: layers.concat([[sel, col]]) } }); };
  const pn = S.panel = { title: 'Loom', slots, output: 3, ghosts: [IT.white_banner, IT.white_dye, IT.flower_banner_pattern, null],
    accept: (i, s) => { const it = ITEMS[s.id]; return i === 0 ? !!(BL[s.id] && BL[s.id].banner) : i === 1 ? /_dye$/.test(it.key) : i === 2 ? it.kind === 'bpattern' : false; },
    changed: () => { if (sel && !avail().some(p => p[0] === sel)) sel = null; slots[3] = result(); drawPats(); },
    take: (shift) => { const r = result(); if (!r) return; if (shift) { if (addItem(r.id, 1, xtra(r))) return; } else { if (S.cursor) return; S.cursor = r; } for (const i of [0, 1]) { slots[i].count--; if (slots[i].count <= 0) slots[i] = null; } slots[3] = result(); Sfx.play('loom', 0.8); drawPats(); },
    layout: (body) => { const row = document.createElement('div'); row.className = 'crow'; row.style.gap = '4px'; body.appendChild(row); for (let i = 0; i < 3; i++) makeSlot('panel', i, row);
      const grid = document.createElement('div'); grid.id = 'loomPats'; grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,26px);gap:2px;max-height:150px;overflow:auto;margin:6px 0;background:#8b8b8b;padding:3px'; body.appendChild(grid);
      const arr = document.createElement('img'); arr.className = 'arrowimg'; arr.src = UI_ICON.arrowR; body.appendChild(arr); makeSlot('panel', 3, body); drawPats(); },
    onClose: () => { for (let i = 0; i < 3; i++) if (slots[i]) giveOrDrop(slots[i].id, slots[i].count, xtra(slots[i])); } };
  function drawPats() { const grid = $('loomPats'); if (!grid) return; grid.innerHTML = ''; if (!slots[0] || !slots[1]) return; const col = ITEMS[slots[1].id].key.replace('_dye', ''); const base = BL[slots[0].id].banner;
    for (const [p, name] of avail()) { const c = document.createElement('canvas'); c.width = 20; c.height = 40; const g = c.getContext('2d'); const b = DYE_RGB[base] || [255, 255, 255]; g.fillStyle = 'rgb(' + b.join(',') + ')'; g.fillRect(0, 0, 20, 40); g.drawImage(bannerCanvas([[p, col]]), 0, 0);
      c.style.cssText = 'width:20px;height:40px;image-rendering:pixelated;cursor:pointer;border:2px solid ' + (sel === p ? '#fff' : '#555'); c.title = name; c.addEventListener('pointerdown', (e) => { e.preventDefault(); sel = p; slots[3] = result(); drawPats(); renderInvUI(); }); grid.appendChild(c); } }
  openUI('panel'); }
// ---- armor trims at the smithing table ----
const TRIM_KEYS = Object.keys(TRIM_MATS);
{ const _sr = smithResult; smithResult = function (sl) { const [t, b, a] = sl; if (t && b && a && ITEMS[t.id].trim && ITEMS[b.id].kind === 'armor' && !ITEMS[b.id].elytra && TRIM_KEYS.includes(ITEMS[a.id].key)) { const mk = ITEMS[a.id].key; const out = Object.assign({}, b, xtra(b) || {}, { count: 1 }); out.data = Object.assign({}, b.data || {}, { trim: { p: ITEMS[t.id].trim, m: mk } }); return out; } return _sr.apply(this, arguments); }; }
{ const _os = openSmithUI; openSmithUI = function () { const r = _os.apply(this, arguments); const pn = S.panel; if (pn) { const acc = pn.accept; pn.accept = (i, s) => acc(i, s) || (i === 0 && !!ITEMS[s.id].trim) || (i === 1 && ITEMS[s.id].kind === 'armor' && !ITEMS[s.id].elytra) || (i === 2 && TRIM_KEYS.includes(ITEMS[s.id].key)); pn.changed = () => { pn.slots[3] = smithResult(pn.slots); }; pn.title = 'Upgrade Gear'; } return r; }; }
{ const _tt = itemTooltip; itemTooltip = function (s) { let t = _tt.apply(this, arguments); if (s && s.data && s.data.trim) { const T = s.data.trim; const nm = (k) => k.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' '); t += '\nUpgrade:\n ' + nm(T.p) + ' Armor Trim\n ' + nm(T.m.replace(/_ingot|_shard/, '')) + ' Material'; }
    if (s && s.data && s.data.layers && s.data.layers.length) t += '\n' + s.data.layers.map(([p, c]) => { const n = (LOOM_BASIC.find(q => q[0] === p) || BANNER_PATTERNS.find(q => q[0] === p) || [p, p])[1]; return c.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ') + ' ' + n; }).join('\n');
    if (s && s.data && s.data.sherds) t += '\n' + s.data.sherds.map(k => ITEMS[IT[k]] ? ITEMS[IT[k]].name : k).join('\n'); return t; }; }
{ const _am = armorMats; armorMats = function (inv) { const out = _am.apply(this, arguments); for (const slot in ARMOR_SLOT) { const s = inv && inv[ARMOR_SLOT[slot]]; if (out[slot] && s && s.data && s.data.trim) out[slot] += '|' + s.data.trim.p + ':' + s.data.trim.m; } return out; }; }
{ const _at = armorTex2; armorTex2 = function (mat, part) { if (typeof mat !== 'string' || mat.indexOf('|') < 0) return _at.apply(this, arguments); const key = mat + '#' + part; if (armorTex2Cache[key]) return armorTex2Cache[key];
    const [base, trim] = mat.split('|'); const [p, m] = trim.split(':'); const baseMats = _at.call(this, base, part); const col = TRIM_MATS[m] || [200, 200, 200]; let h = 0; for (const ch of p) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const style = h % 5;
    const mats = baseMats.map((bm, fi) => { const src = bm.map.image; const cv = document.createElement('canvas'); cv.width = cv.height = 16; const x = cv.getContext('2d'); x.drawImage(src, 0, 0); const img = x.getImageData(0, 0, 16, 16);
      for (let y = 0; y < 16; y++) for (let i = 0; i < 16; i++) { const a = img.data[(y * 16 + i) * 4 + 3]; if (!a) continue; const on = style === 0 ? (y === 4 || y === 11) : style === 1 ? Math.abs(i - 7.5) + (y - 3) * 0.6 < 2 && y > 2 : style === 2 ? ((i + y) % 6 === 0) : style === 3 ? (i === 3 || i === 12) && y > 2 && y < 13 : (y === 2 || (y === 8 && i % 3 === 0));
        if (on) { const k = (y * 16 + i) * 4; const sh = (fi === 2 ? 1.1 : 0.95); img.data[k] = Math.min(255, col[0] * sh); img.data[k + 1] = Math.min(255, col[1] * sh); img.data[k + 2] = Math.min(255, col[2] * sh); } }
      x.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; return new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide }); });
    return armorTex2Cache[key] = mats; }; }
// ---- placed banners keep their layers (and give them back when broken) ----
{ const _pb = placeBlock; placeBlock = function (hit, id) { const h = player.held(); const layers = h && h.id === id && h.data && h.data.layers; const before = hit ? world.get(hit.x + hit.nx, hit.y + hit.ny, hit.z + hit.nz) : 0; const r = _pb.apply(this, arguments);
    if (r && layers && layers.length && BL[id] && BL[id].banner) { const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz; if ((BL[world.get(x, y, z)] || {}).banner) { bdataOf(world).set(keyOf(x, y, z), { layers }); OV.watch.add(keyOf(x, y, z)); ovDrop(keyOf(x, y, z)); } } return r; }; }
{ const _bb = breakBlock; breakBlock = function (x, y, z) { const id = world.get(x, y, z); const d = BL[id]; if (d && d.banner) { const k = keyOf(x, y, z); const e = bdataOf(world).get(k); if (e && e.layers) { const r = _bb.apply(this, arguments); if (world.get(x, y, z) !== id) { bdataOf(world).delete(k); OV.watch.delete(k); ovDrop(k);
          if (isSurv() && S.rules.doTileDrops !== false) { for (const it of G.items) if (!it.gone && it.id === IT[d.fam] && it.pos.distanceTo(new V3(x + 0.5, y + 0.5, z + 0.5)) < 1.5 && !it.extra) { it.extra = { data: { layers: e.layers } }; break; } } } return r; } } return _bb.apply(this, arguments); }; }
{ const _ow = ovWatchable; ovWatchable = (id) => _ow(id) || !!(BL[id] && BL[id].banner); }
{ const _ob = ovBuild; ovBuild = function (k) { const [x, y, z] = k.split(',').map(Number); const d = BL[world.get(x, y, z)];
    if (d && d.banner) { const e = bdataOf(world).get(k); if (!e || !e.layers || !e.layers.length) return null; const cv = bannerCanvas(e.layers); const f = d.st.facing; const fv = [DV4[f][0], 0, DV4[f][1]]; const grp = new THREE.Group();
      const wall = d.st.wall; const cy = wall ? 1 / 16 : 15 / 16; const off = wall ? -(0.5 - 14.5 / 16) + 0.003 : (0.5 - 6.25 / 16) + 0.003; const backOff = wall ? -(0.5 - 15.5 / 16) - 0.003 : (0.5 - 7.25 / 16) - 0.003;
      const m = ovPlane(14 / 16, 26 / 16, cv); m.position.set(x + 0.5 + fv[0] * off, y + cy, z + 0.5 + fv[2] * off); m.rotation.y = Math.atan2(fv[0], fv[2]); grp.add(m);
      const m2 = ovPlane(14 / 16, 26 / 16, cv); m2.position.set(x + 0.5 + fv[0] * backOff, y + cy, z + 0.5 + fv[2] * backOff); m2.rotation.y = Math.atan2(-fv[0], -fv[2]); m2.scale.x = -1; grp.add(m2);
      return { obj: grp, light: [x, y, z] }; }
    if (d && d.dpot) { const e = bdataOf(world).get(k); if (!e || !e.sherds) return null; const grp = new THREE.Group(); const faces = [[0, 1], [1, 0], [0, -1], [-1, 0]];
      e.sherds.forEach((sk, i) => { if (sk === 'clay_brick') return; const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); g.fillStyle = 'rgba(0,0,0,0)'; const ic = ICON_CANVAS[IT[sk]]; if (ic) { g.globalAlpha = 0.85; g.drawImage(ic, 2, 1, 12, 12); }
        const [fx, fz] = faces[(i + (e.f || 0)) % 4]; const m = ovPlane(12 / 16, 11 / 16, c); m.position.set(x + 0.5 + fx * (7 / 16 + 0.004), y + 6.5 / 16, z + 0.5 + fz * (7 / 16 + 0.004)); m.rotation.y = Math.atan2(fx, fz); grp.add(m); }); return { obj: grp, light: [x, y, z] }; }
    return _ob.apply(this, arguments); }; }
{ const _ow2 = ovWatchable; ovWatchable = (id) => _ow2(id) || !!(BL[id] && BL[id].dpot); }
// the loom block opens the loom
{ const _ua = useAction; useAction = function (eye, dir) { if (target && !targetMob && target.id === B.LOOM && !kd('sneak')) { mouseR = false; openLoomUI(); return; } return _ua.apply(this, arguments); }; }
{ const _pl = Sfx.play; Sfx.play = function (name, v = 1, rate) { if (this.ctx && name === 'loom') { this.nz(0.25, 1400, 0.3 * v, 'bandpass', 1); this.tone(300, 260, 0.1, 0.04 * v, 'triangle'); return; } return _pl.apply(this, arguments); }; }
// banner patterns turn up in structures and trims in the places Minecraft hides them
if (typeof addLoot === 'function') { addLoot('house', [['flower_banner_pattern', 1, 1, 0.04]]); addLoot('stronghold', [['eye_armor_trim_smithing_template', 1, 1, 0.1], ['globe_banner_pattern', 1, 1, 0.05]]); addLoot('pyramid', [['dune_armor_trim_smithing_template', 1, 1, 0.14]]); addLoot('jungle_temple', [['wild_armor_trim_smithing_template', 1, 1, 0.33]]);
  addLoot('shipwreck', [['coast_armor_trim_smithing_template', 1, 1, 0.17]]); addLoot('fortress', [['rib_armor_trim_smithing_template', 1, 1, 0.07], ['snout_armor_trim_smithing_template', 1, 1, 0.08], ['piglin_banner_pattern', 1, 1, 0.1]]); addLoot('end_city', [['spire_armor_trim_smithing_template', 1, 1, 0.07]]);
  addLoot('mineshaft', [['wayfinder_armor_trim_smithing_template', 1, 1, 0.05]]); addLoot('dungeon', [['raiser_armor_trim_smithing_template', 1, 1, 0.05], ['shaper_armor_trim_smithing_template', 1, 1, 0.05], ['host_armor_trim_smithing_template', 1, 1, 0.05]]); addLoot('igloo', [['ward_armor_trim_smithing_template', 1, 1, 0.1], ['silence_armor_trim_smithing_template', 1, 1, 0.02]]);
  addLoot('ruined_portal', [['tide_armor_trim_smithing_template', 1, 1, 0.1], ['flow_armor_trim_smithing_template', 1, 1, 0.08], ['bolt_armor_trim_smithing_template', 1, 1, 0.08], ['flow_banner_pattern', 1, 1, 0.05], ['guster_banner_pattern', 1, 1, 0.05]]); }
if (MOBS.pillager) MOBS.pillager.drops = (MOBS.pillager.drops || []).concat([['sentry_armor_trim_smithing_template', 1, 1, 0.03]]); if (MOBS.evoker) MOBS.evoker.drops = (MOBS.evoker.drops || []).concat([['vex_armor_trim_smithing_template', 1, 1, 0.05]]);

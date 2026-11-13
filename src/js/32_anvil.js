// ================= ANVILS, FALLING BLOCKS, ENCHANTED BOOKS (Minecraft rules) =================
// Anvil: left item + right item -> result, paid in experience levels. Rename (1 level), repair with the item's
// material (each unit fixes 25%), combine two of the same item (durability adds up plus 12%), or add an
// enchanted book's enchantments. Same enchantment at the same level goes up one level; incompatible ones are
// dropped (+1 level each). Every anvil use doubles the item's "prior work" penalty (2^n - 1 levels). 40 levels or
// more is "Too Expensive!" in Survival. Each use has a 12% chance to damage the anvil (Anvil -> Chipped ->
// Damaged -> gone). Anvils, sand and gravel fall when nothing holds them up; a falling anvil hurts what it lands on
// (2 per block fallen after the first, up to 40) and may get damaged.
// Enchanting tables can enchant books into enchanted books.

// ---------- enchanted books ----------
{ const _ec = enchCat; enchCat = function (id) { if (id === IT.book || id === IT.enchanted_book) return 'book'; return _ec(id); }; }
{ const _ef = enchantFits; enchantFits = function (id, en) { if (id === IT.book || id === IT.enchanted_book) return !!ENCH[en]; return _ef(id, en); }; }
{ const _ea = enchantability; enchantability = function (id) { if (id === IT.book) return 1; return _ea(id); }; }
{ const _re = rollEnchants; rollEnchants = function (id, cost, seed) {
    if (id !== IT.book) return _re(id, cost, seed);
    // a book can get any enchantment, but only one of them (like Minecraft's enchanted books)
    const r = mulberry32(seed); const keys = Object.keys(ENCH); const lvl = Math.max(1, cost + 1 + Math.floor(r() * 1));
    const tot = keys.reduce((s, k) => s + (ENCH[k].w || 1), 0); let q = r() * tot; let k = keys[0]; for (const kk of keys) { q -= ENCH[kk].w || 1; if (q <= 0) { k = kk; break; } }
    const E = ENCH[k]; return [[k, Math.max(1, Math.min(E.max, Math.ceil(lvl / (E.max === 1 ? 99 : 31 / E.max))))]];
  }; }
{ const _de = doEnchant; doEnchant = function (i) {
    const s = enchState && enchState.s[0]; if (s && s.id === IT.book && s.count > 1) { giveOrDrop(IT.book, s.count - 1); s.count = 1; }
    const r = _de(i); if (s && s.id === IT.book && s.ench) s.id = IT.enchanted_book; invDirty(); renderInvUI(); return r;
  }; }
// enchanted books are found in chests too
for (const t of ['dungeon', 'pyramid', 'fortress', 'stronghold', 'house', 'smithy']) if (LOOT[t]) LOOT[t].push(['enchanted_book', 1, 1, t === 'house' || t === 'smithy' ? 0.05 : 0.2]);
{ const _rl = rollLoot; rollLoot = function (type, seed) { const inv = _rl(type, seed); const r = mulberry32(seed ^ 0x5bd1); for (const s of inv) if (s && s.id === IT.enchanted_book && !s.ench) { const keys = Object.keys(ENCH); const k = keys[Math.floor(r() * keys.length)]; s.ench = { [k]: 1 + Math.floor(r() * ENCH[k].max) }; } return inv; }; }
// custom names show on tooltips
{ const _it = itemTooltip; itemTooltip = function (s) { const t = _it(s); if (s && s.name) { const L = t.split('\n'); L[0] = s.name + '  (' + ITEMS[s.id].name + ')'; return L.join('\n'); } return t; }; }

// ---------- anvil maths ----------
// Minecraft anvil cost multipliers: [from an item, from a book]
const ANVIL_MULT = { protection: [1, 1], fire_protection: [2, 1], feather_falling: [2, 1], blast_protection: [4, 2], projectile_protection: [2, 1], thorns: [8, 4], respiration: [4, 2], aqua_affinity: [4, 2], depth_strider: [4, 2],
  sharpness: [1, 1], smite: [2, 1], bane_of_arthropods: [2, 1], knockback: [2, 1], fire_aspect: [4, 2], looting: [4, 2], efficiency: [1, 1], silk_touch: [8, 4], unbreaking: [2, 1], fortune: [4, 2],
  power: [1, 1], punch: [4, 2], flame: [4, 2], infinity: [8, 4], mending: [4, 2], lunge: [2, 1], loyalty: [1, 1], impaling: [4, 2], riptide: [4, 2], channeling: [8, 4], density: [2, 1], breach: [4, 2], wind_burst: [4, 2] };
function repairMaterial(id) {
  const it = ITEMS[id]; if (!it) return null; const k = it.key;
  if (k.startsWith('netherite_')) return [IT.netherite_ingot]; if (k.startsWith('diamond_')) return [IT.diamond]; if (k.startsWith('iron_') || k === 'shears') return [IT.iron_ingot];
  if (k.startsWith('golden_')) return [IT.gold_ingot]; if (k.startsWith('copper_')) return [IT.copper_ingot]; if (k.startsWith('leather_')) return [IT.leather];
  if (k.startsWith('stone_')) return [IT.cobblestone, IT.cobbled_deepslate]; if (k.startsWith('wooden_') || k === 'shield') return [IT.planks]; return null;
}
const priorPenalty = (s) => s ? Math.pow(2, s.rc || 0) - 1 : 0;
function anvilResult(L, R, name) {
  if (!L) return null; const out = Object.assign({}, L, { ench: L.ench ? Object.assign({}, L.ench) : undefined }); let cost = 0, used = 0, changed = false;
  const max = maxDur(L.id);
  if (R) {
    const mat = repairMaterial(L.id);
    if (mat && mat.includes(R.id) && max) { // repair with material
      if (!L.dmg) return null; const per = Math.floor(max / 4); let d = L.dmg; while (d > 0 && used < R.count) { d = Math.max(0, d - per); used++; cost++; } out.dmg = d || undefined; changed = true;
    } else if (R.id === L.id || R.id === IT.enchanted_book) {
      const book = R.id === IT.enchanted_book; used = 1;
      if (!book && max && L.dmg) { const rem = (max - (L.dmg || 0)) + (max - (R.dmg || 0)) + Math.floor(max * 0.12); out.dmg = Math.max(0, max - rem) || undefined; cost += 2; changed = true; }
      for (const e in (R.ench || {})) {
        const lv = R.ench[e]; const E = ENCH[e]; if (!E) continue;
        const fits = L.id === IT.enchanted_book || enchantFits(L.id, e); const clash = Object.keys(out.ench || {}).some(k => k !== e && ENCH[k] && E.excl && ENCH[k].excl === E.excl);
        if (!fits || clash) { cost += 1; continue; }
        const cur = (out.ench && out.ench[e]) || 0; const nl = cur === lv ? Math.min(E.max, lv + 1) : Math.max(cur, lv);
        out.ench = out.ench || {}; if (nl !== cur) changed = true; out.ench[e] = nl; cost += nl * (ANVIL_MULT[e] ? ANVIL_MULT[e][book ? 1 : 0] : 2);
      }
      if (!changed) return null;
    } else return null;
  }
  const nm = (name || '').trim().slice(0, 50);
  if (nm !== (L.name || '')) { if (nm) out.name = nm; else delete out.name; cost += 1; changed = true; }
  if (!changed) return null;
  cost += priorPenalty(L) + priorPenalty(R && used ? R : null);
  out.rc = Math.max(L.rc || 0, (R && R.rc) || 0) + 1; out.count = L.count;
  if (out.ench && !Object.keys(out.ench).length) delete out.ench;
  return { item: out, cost, used };
}

// ---------- anvil screen ----------
function openAnvilUI(x, y, z) {
  const slots = [null, null, null]; let nameText = '';
  const pn = S.panel = { title: 'Repair & Name', slots, output: 2, ghosts: [null, null, null],
    accept: (i) => i < 2,
    changed: () => { const L = slots[0]; if (L && pn.lastLeft !== L) { pn.lastLeft = L; nameText = L.name || ''; if (pn.input) pn.input.value = nameText; } if (!L) { pn.lastLeft = null; nameText = ''; if (pn.input) pn.input.value = ''; } update(); },
    take: (shift) => {
      const r = anvilResult(slots[0], slots[1], nameText); if (!r) return; const tooDear = r.cost >= 40 && S.mode !== 'creative';
      if (tooDear || (S.mode !== 'creative' && XP.level < r.cost)) { Sfx.play('click', 0.4, 0.6); return; }
      if (shift) { if (addItem(r.item.id, r.item.count, xtra(r.item))) return; } else { if (S.cursor) return; S.cursor = r.item; }
      if (S.mode !== 'creative') setLevel(XP.level - r.cost, XP.points);
      slots[0] = null; if (slots[1]) { slots[1].count -= r.used; if (slots[1].count <= 0) slots[1] = null; }
      useAnvilBlock(x, y, z); update();
    },
    layout: (body) => {
      body.style.flexDirection = 'column'; body.style.alignItems = 'flex-start';
      const inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = 50; inp.placeholder = 'Item name'; inp.className = 'anvilName';
      inp.addEventListener('keydown', (e) => { if (e.key !== 'Escape') e.stopPropagation(); });
      inp.addEventListener('keyup', (e) => e.stopPropagation());
      inp.addEventListener('input', () => { nameText = inp.value; update(); }); pn.input = inp; body.appendChild(inp);
      const row = document.createElement('div'); row.className = 'crow'; row.style.gap = '6px'; body.appendChild(row);
      makeSlot('panel', 0, row); const plus = document.createElement('span'); plus.textContent = '+'; plus.style.cssText = 'font-size:30px;color:#555'; row.appendChild(plus); makeSlot('panel', 1, row);
      const arr = document.createElement('img'); arr.className = 'arrowimg'; arr.src = UI_ICON.arrowR; row.appendChild(arr); makeSlot('panel', 2, row);
      const cost = document.createElement('div'); cost.className = 'anvilCost'; body.appendChild(cost); pn.costEl = cost;
      update();
    },
    onClose: () => { for (let i = 0; i < 2; i++) if (slots[i]) giveOrDrop(slots[i].id, slots[i].count, xtra(slots[i])); },
  };
  function update() {
    const r = anvilResult(slots[0], slots[1], nameText); slots[2] = r ? r.item : null;
    if (pn.costEl) { if (!r) pn.costEl.textContent = ''; else if (r.cost >= 40 && S.mode !== 'creative') { pn.costEl.textContent = 'Too Expensive!'; pn.costEl.style.color = '#d33'; } else { pn.costEl.textContent = 'Enchantment Cost: ' + r.cost; pn.costEl.style.color = S.mode === 'creative' || XP.level >= r.cost ? '#3a3' : '#d33'; } }
    if (S.uiOpen === 'panel') renderInvUI();
  }
  openUI('panel'); setTimeout(() => pn.input && pn.input.focus(), 0);
}
// 12% chance per use to damage the anvil
function useAnvilBlock(x, y, z) {
  Sfx.play('anvil', 0.7);
  if (S.mode === 'creative' || Math.random() >= 0.12) return;
  const id = world.get(x, y, z); const d = BL[id]; if (!d || !d.anvil) return;
  const next = { anvil: 'chipped_anvil', chipped_anvil: 'damaged_anvil', damaged_anvil: null }[d.anvil];
  const nid = next ? B[(next + (d.swapXZ ? '_x' : '')).toUpperCase()] : 0;
  world.set(x, y, z, nid); mpBlock(x, y, z, nid); Sfx.play('glass_break', 0.5, 0.5);
  if (!next) { toast('The anvil broke', 1.5); closeInv(); }
}
{ const _ua = useAction; useAction = function (eye, dir) {
    if (target && !kd('sneak') && BL[target.id].use === 'anvil') { mouseR = false; openAnvilUI(target.x, target.y, target.z); return; }
    return _ua(eye, dir);
  }; }
// anvils face across the direction you look when you place them
{ const _pb = placeBlock; placeBlock = function (t, id) {
    const d = BL[id]; if (d && d.anvil) { const dir = lookDir(); const want = Math.abs(dir.z) >= Math.abs(dir.x); const base = B[d.anvil.toUpperCase()], sw = B[(d.anvil + '_x').toUpperCase()]; id = want ? sw : base; }
    return _pb.call(this, t, id);
  }; }

// ---------- falling blocks ----------
for (const k of ['sand', 'gravel']) if (B[k.toUpperCase()] != null) BL[B[k.toUpperCase()]].fall = true;
const FALL = { queue: new Set(), list: [] };
const fallKey = (x, y, z) => x + ',' + y + ',' + z;
const canFallInto = (id) => !id || !!FKIND[id] || (BL[id] && BL[id].plant && !SOLID[id]) || (BL[id] && BL[id].render === 'torch');
{ const _set = World.prototype.set; World.prototype.set = function (x, y, z, id) {
    const r = _set.apply(this, arguments);
    if (r !== false && this === G.world && !(typeof MP !== 'undefined' && MP.active && MP.role === 'client')) { FALL.queue.add(fallKey(x, y, z)); FALL.queue.add(fallKey(x, y + 1, z)); }
    return r;
  }; }
function fallMesh(id) {
  const d = BL[id];
  if (d.render !== 'boxes') return new THREE.Mesh(blockGeo(id), new THREE.MeshLambertMaterial({ map: atlasTex }));
  const p = [], u = [], n = [], idx = []; const sw = d.swapXZ;
  for (const bx of d.boxes) { const a0 = (sw ? bx[2] : bx[0]) / 16, y0 = bx[1] / 16, c0 = (sw ? bx[0] : bx[2]) / 16, a1 = (sw ? bx[5] : bx[3]) / 16, y1 = bx[4] / 16, c1 = (sw ? bx[3] : bx[5]) / 16;
    for (let f = 0; f < 6; f++) { const F = FACES[f]; const uv = TILE_UV[d.texIds[f]]; const b = p.length / 3;
      for (let k = 0; k < 4; k++) { const cc = F.c[k]; const lx = cc[0] ? a1 : a0, ly = cc[1] ? y1 : y0, lz = cc[2] ? c1 : c0; p.push(lx - 0.5, ly - 0.5, lz - 0.5);
        let uf, vf; if (f === 0) { uf = 1 - lz; vf = ly; } else if (f === 1) { uf = lz; vf = ly; } else if (f === 2) { uf = lx; vf = 1 - lz; } else if (f === 3) { uf = lx; vf = lz; } else if (f === 4) { uf = lx; vf = ly; } else { uf = 1 - lx; vf = ly; }
        u.push(uv[0] + (uv[2] - uv[0]) * uf, uv[1] + (uv[3] - uv[1]) * vf); n.push(F.n[0], F.n[1], F.n[2]); }
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); g.setIndex(idx);
  return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: atlasTex, alphaTest: 0.5 }));
}
function startFall(x, y, z, id) {
  world.set(x, y, z, 0); mpBlock(x, y, z, 0);
  const mesh = fallMesh(id); mesh.position.set(x + 0.5, y + 0.5, z + 0.5); scene.add(mesh);
  FALL.list.push({ id, x: x + 0.5, y, z: z + 0.5, vy: 0, y0: y, mesh });
}
function updateFalling(dt) {
  if (!world) return;
  if (FALL.queue.size) { const q = [...FALL.queue]; FALL.queue.clear();
    for (const k of q) { const [x, y, z] = k.split(',').map(Number); const id = world.get(x, y, z); if (!id || !BL[id].fall || y <= 0) continue; if (!world.loaded(x, z)) continue; if (canFallInto(world.get(x, y - 1, z))) startFall(x, y, z, id); } }
  for (const f of FALL.list) {
    f.vy = Math.max(f.vy - 22 * dt, -40); const ny = f.y + f.vy * dt; const bx = Math.floor(f.x), bz = Math.floor(f.z);
    let landed = false; const below = Math.floor(ny);
    if (!canFallInto(world.get(bx, below, bz)) || ny < -70) { landed = true; f.y = below + 1; } else f.y = ny;
    // a falling anvil hurts whatever it hits
    if (BL[f.id].anvil && f.vy < -2) {
      const dist = f.y0 - f.y; const dmg = Math.min(40, 2 * Math.max(0, Math.ceil(dist) - 1));
      if (dmg > 0) { const P = player; if (!f.hitP && Math.abs(P.pos.x - f.x) < 0.8 && Math.abs(P.pos.z - f.z) < 0.8 && f.y < P.pos.y + P.h && f.y + 1 > P.pos.y) { f.hitP = true; P.hurtCD = 0; P.hurt(dmg, null, 'a falling anvil', 0); }
        for (const m of G.mobs) { if (m.dead || (f.hit && f.hit.has(m))) continue; if (Math.abs(m.pos.x - f.x) < m.hw + 0.5 && Math.abs(m.pos.z - f.z) < m.hw + 0.5 && f.y < m.pos.y + m.h && f.y + 1 > m.pos.y) { (f.hit || (f.hit = new Set())).add(m); m.hurt(dmg, null, 0, true); } } }
    }
    if (landed) {
      f.done = true; scene.remove(f.mesh); f.mesh.geometry !== blockGeo(f.id) && f.mesh.geometry.dispose(); f.mesh.material.dispose();
      const y = Math.floor(f.y); const here = world.get(bx, y, bz);
      let id = f.id; const d = BL[id];
      if (d.anvil) { Sfx.at('anvil', new V3(f.x, f.y, f.z), 0.9); const dist = f.y0 - f.y; if (Math.random() < 0.05 * Math.max(0, dist)) { const next = { anvil: 'chipped_anvil', chipped_anvil: 'damaged_anvil', damaged_anvil: null }[d.anvil]; id = next ? B[(next + (d.swapXZ ? '_x' : '')).toUpperCase()] : 0; } }
      else Sfx.at(d.snd || 'sand', new V3(f.x, f.y, f.z), 0.7);
      if (!id) continue;
      if (canFallInto(here) && y > 0) { if (here && BL[here].plant) { const dr = blockDrop(here, null); if (dr) dropItem(dr[0], dr[1], bx + 0.5, y + 0.5, bz + 0.5); } world.set(bx, y, bz, id); mpBlock(bx, y, bz, id); }
      else { const dr = blockDrop(id, null); if (dr) dropItem(dr[0], dr[1], f.x, f.y + 0.5, f.z); }
    } else {
      f.mesh.position.set(f.x, f.y + 0.5, f.z);
      const l = clamp(Math.max(G.minLight || 0, world.lightAt(f.x, f.y + 0.5, f.z, G.daylight)), 0.1, 1); f.mesh.material.color.setScalar(l);
    }
  }
  FALL.list = FALL.list.filter(f => !f.done);
}
{ const _ub = updateBoats; updateBoats = function (dt) { const r = _ub(dt); updateFalling(dt); return r; }; }
{ const _ce = clearEntities; clearEntities = function () { for (const f of FALL.list) scene.remove(f.mesh); FALL.list = []; FALL.queue.clear(); return _ce.apply(this, arguments); }; }
{ const _p = Sfx.play.bind(Sfx); Sfx.play = function (name, v = 1, rate) { if (name === 'anvil' && this.ctx && !(this.has && this.has('anvil'))) { this.tone(1700, 1650, 0.4, 0.07 * v, 'triangle'); this.tone(2550, 2500, 0.3, 0.05 * v, 'sine'); this.nz(0.06, 2800, 0.35 * v, 'bandpass', 3); return; } return _p(name, v, rate); }; }

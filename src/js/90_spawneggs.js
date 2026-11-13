// ================= SPAWN EGGS (Minecraft) =================
// One egg for every mob in the game (made last, so mobs added by any file get one). Use it on a block to spawn the
// mob there, on a mob spawner to change what it spawns, or on a grown animal of the same kind to get a baby.
// Found in the Creative inventory, or with /give.
const EGG_COLORS = {
  pig: [[240, 160, 156], [219, 99, 94]], cow: [[68, 54, 37], [161, 161, 161]], sheep: [[231, 231, 231], [255, 181, 181]], chicken: [[161, 161, 161], [255, 0, 0]],
  villager: [[86, 60, 41], [189, 139, 114]], zombie: [[0, 175, 175], [121, 153, 101]], skeleton: [[192, 192, 192], [73, 73, 73]], spider: [[52, 45, 39], [163, 0, 0]],
  creeper: [[13, 165, 11], [0, 0, 0]], enderman: [[22, 22, 22], [0, 0, 0]], ghast: [[249, 249, 249], [188, 188, 188]], blaze: [[246, 178, 0], [255, 246, 123]],
  magma_cube: [[52, 0, 0], [252, 252, 0]], zombified_piglin: [[234, 147, 147], [76, 112, 48]], piglin: [[153, 65, 58], [249, 243, 164]], hoglin: [[198, 126, 94], [95, 99, 101]],
  wither_skeleton: [[20, 20, 20], [71, 77, 77]], strider: [[156, 51, 51], [77, 73, 73]], horse: [[192, 158, 125], [238, 229, 0]],
};
function eggColors(k) { const m = MOBS[k]; if (m && m.egg) return m.egg; if (EGG_COLORS[k]) return EGG_COLORS[k]; const h = hashStr(k); return [[60 + (h & 127), 60 + ((h >> 7) & 127), 60 + ((h >> 14) & 127)], [40 + ((h >> 3) & 200), 40 + ((h >> 11) & 200), 40 + ((h >> 19) & 200)]]; }
function eggPainter(base, spot) {
  return (s, r) => {
    const cx = 7.5, cy = 8.6;
    for (let y = 1; y < 16; y++) for (let x = 2; x < 14; x++) {
      const ry = y < cy ? 6.9 : 6.2, rx = 4.9 - (y < cy ? (cy - y) * 0.12 : 0); const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (d > 1) continue;
      const edge = d > 0.74; let c = base; const n = ihash(x, y, 3, 9) % 100;
      if (!edge && ((x * 7 + y * 13) % 11 < 3) && n < 70) c = spot;
      const shade = edge ? 0.62 : 1 - Math.max(0, (x - cx) / rx) * 0.18 + Math.max(0, (cx - x) / rx) * 0.06 - Math.max(0, y - cy) * 0.02;
      s(x, y, c.map(v => v * shade));
    }
    s(5, 4, base.map(v => Math.min(255, v * 1.35 + 40))); s(5, 5, base.map(v => Math.min(255, v * 1.25 + 25)));
  };
}
const SPAWN_EGG_IDS = [];
for (const k of Object.keys(MOBS)) {
  const key = k + '_spawn_egg'; if (IT[key] !== undefined) continue;
  const id = nid++; const nm = (MOBS[k].name || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())) + ' Spawn Egg';
  defItem(id, key, nm, { kind: 'spawn_egg', mob: k, stack: 64 }); ITEM_IDS.push(id); SPAWN_EGG_IDS.push(id);
  const [b, sp] = eggColors(k); const c = iconCanvas(eggPainter(b, sp)); ICON_CANVAS[id] = c; ICON[id] = c.toDataURL();
}
// the Creative inventory lists the eggs at the end
{ const pal = $('palette'); for (const id of SPAWN_EGG_IDS) { const d = document.createElement('div'); d.className = 'slot'; d.innerHTML = '<img src="' + ICON[id] + '">';
  d.addEventListener('pointerdown', (e) => { e.preventDefault(); if (S.cursor) { S.cursor = null; } else if (e.shiftKey) addItem(id, stackMax(id)); else S.cursor = { id, count: stackMax(id) }; invDirty(); renderInvUI(); });
  d.addEventListener('pointerenter', () => showTip(ITEMS[id].name)); d.addEventListener('pointerleave', () => showTip(null)); pal.appendChild(d); } }

function eggSpawn(type, x, y, z, baby) {
  if (typeof MP !== 'undefined' && MP.active && MP.role === 'client' && MP.proxyMode) { mpToHost({ t: 'eggspawn', type, x, y, z, baby: baby ? 1 : 0 }); return null; }
  const m = spawnMob(type, x, y, z, MOBS[type].ai === 'magma' ? { size: [1, 2, 4][Math.random() * 3 | 0] } : undefined);
  if (baby && typeof setBaby === 'function') setBaby(m, true); return m;
}
{ const _ua = useAction; useAction = function (eye, dir) {
    const h = player.held(); const hd = h && ITEMS[h.id];
    if (!hd || hd.kind !== 'spawn_egg') return _ua(eye, dir);
    const type = hd.mob; mouseR = false; S.useCD = 0.25;
    // on a grown animal of the same kind: a baby
    if (targetMob && !targetMob.dead && targetMob.type === type && typeof BREED_FOOD !== 'undefined' && BREED_FOOD[type] && !targetMob.baby) { eggSpawn(type, targetMob.pos.x, targetMob.pos.y, targetMob.pos.z, true); useHeld(1); S.swing = 1; return; }
    // on a spawner: change what it spawns
    if (target && target.id === B.SPAWNER) { const k = target.x + ',' + target.y + ',' + target.z; world.spawners.set(k, type); useHeld(1); S.swing = 1; toast('The spawner now makes ' + MOBS[type].name + 's', 1.5); return; }
    // on a block (or into water)
    const wt = raycast(eye, dir, 5, true); let p = null;
    if (target) { const x = target.x + target.nx, y = target.y + target.ny, z = target.z + target.nz; p = [x + 0.5, y + (target.ny < 0 ? -MOBS[type].h + 1 : 0) + 0.01, z + 0.5]; }
    else if (wt && FKIND[wt.id]) p = [wt.x + 0.5, wt.y + 0.1, wt.z + 0.5];
    if (!p) return;
    if (type === 'ghast') p[1] += 1;
    eggSpawn(type, p[0], p[1], p[2], false); useHeld(1); S.swing = 1; Particles.emit(p[0], p[1] + 0.5, p[2], 10, [[0.85, 0.85, 0.85]], 1.5, 0.6, -1, 0.5);
  }; }
{ const _on = onPeerMsg; onPeerMsg = function (peer, m) { if (m.t === 'eggspawn') { if (MP.role === 'host' && MOBS[m.type]) eggSpawn(m.type, m.x, m.y, m.z, m.baby); return; } return _on(peer, m); }; }

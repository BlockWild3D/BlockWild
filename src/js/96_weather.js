// ================= WEATHER: RAIN, SNOW, THUNDERSTORMS, LIGHTNING, SKELETON TRAPS =================
// Like Minecraft: clear spells last 10 minutes to 2.5 hours, rain 10-20 minutes, and some rain turns into a
// thunderstorm. Rain falls as rain in warm and temperate places and as snow in cold ones (none in deserts,
// savannas or badlands); it darkens the sky, keeps undead from burning and puts out nothing it can't reach.
// Thunderstorms are dark enough for monsters to spawn in daytime. Lightning strikes near you, hurts and sets fire
// around where it lands, turns pigs into zombified piglins, villagers into witches and creepers into charged
// creepers, and is drawn to lightning rods. A strike can leave a skeleton trap: a lone skeleton horse that, when
// you come within 10 blocks, calls down lightning and becomes four skeleton horsemen.
// /weather clear|rain|thunder [seconds] sets it.
S.weather = S.weather || 'clear'; S.weatherT = S.weatherT || 600 + Math.random() * 6000; S.wk = 0; S.tk = 0;
const DRY_B = () => new Set([BIO.DESERT, BIO.SAVANNA, BIO.BADLANDS, BIO.MUSHROOM_FIELDS]);
function precipAt(x, z) { if (!world || world.dim !== 'overworld') return null; const c = world.gen.column(Math.floor(x), Math.floor(z)); if (DRY_B().has(c.b)) return null; return (c.b === BIO.SNOWY || (c.v && FROZEN_V().has(c.v)) || c.v === BV.SNOWY_TAIGA || c.h > SEA + 90) ? 'snow' : 'rain'; }
function weatherWet(pos) { if (S.weather === 'clear' || !world || world.dim !== 'overworld') return false; if (precipAt(pos.x, pos.z) !== 'rain') return false; return world.skyAt(Math.floor(pos.x), Math.floor(pos.y + 1.6), Math.floor(pos.z)) >= 1; }
function setWeather(w, sec) { S.weather = w; S.weatherT = sec || (w === 'clear' ? 600 + Math.random() * 8400 : 600 + Math.random() * 600); }
// ---------- the cycle ----------
{ const _ui = updateInteraction; updateInteraction = function (dt) { const r = _ui.apply(this, arguments); if (S.rules.doWeatherCycle === false || isClientMP()) return r;
    S.weatherT -= dt; if (S.weatherT <= 0) { if (S.weather === 'clear') setWeather(Math.random() < 0.25 ? 'thunder' : 'rain'); else setWeather('clear'); if (typeof MP !== 'undefined' && MP.active && MP.role === 'host' && MP.broadcast) try { MP.broadcast({ t: 'weather', w: S.weather }); } catch (e) { } }
    return r; }; }
// ---------- sky, light and fog ----------
{ const _us = updateSky; updateSky = function (eyeFluid) { const r = _us.apply(this, arguments); const ow = world.dim === 'overworld'; const tw = ow && S.weather !== 'clear' ? 1 : 0, tt = ow && S.weather === 'thunder' ? 1 : 0;
    S.wk += (tw - S.wk) * 0.01; S.tk += (tt - S.tk) * 0.01; if (S.wk < 0.002) return r;
    G.daylight *= 1 - S.wk * 0.2 - S.tk * 0.18; chunkUniforms.daylight.value = G.daylight;
    const grey = new THREE.Color(0.42, 0.45, 0.5).multiplyScalar(0.35 + G.daylight * 0.65); scene.fog.color.lerp(grey, S.wk * 0.75); chunkUniforms.fogColor.value.copy(scene.fog.color);
    scene.fog.far *= 1 - S.wk * 0.3; scene.fog.near *= 1 - S.wk * 0.5; chunkUniforms.fogNear.value = scene.fog.near; chunkUniforms.fogFar.value = scene.fog.far;
    if (typeof skyUniforms !== 'undefined') { for (const k of ['top', 'horizon', 'topColor', 'horizonColor', 'bottom']) if (skyUniforms[k] && skyUniforms[k].value && skyUniforms[k].value.lerp) skyUniforms[k].value.lerp(grey, S.wk * 0.8); }
    if (S.wk > 0.6) { sunMesh.visible = false; moonMesh.visible = false; stars.visible = false; }
    if (S.flash > 0) { chunkUniforms.daylight.value = Math.min(1.2, G.daylight + S.flash); }
    return r; }; }
// ---------- rain and snow around you ----------
const RAIN = { n: 900, R: 18, pts: null, geo: null, colH: new Map(), hT: 0 };
function rainSetup() { const geo = new THREE.BufferGeometry(); const pos = new Float32Array(RAIN.n * 6); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const mat = new THREE.LineBasicMaterial({ color: 0xaab8cc, transparent: true, opacity: 0.55, depthWrite: false });
  RAIN.lines = new THREE.LineSegments(geo, mat); RAIN.lines.frustumCulled = false; G.scene.add(RAIN.lines); RAIN.geo = geo; RAIN.p = []; for (let i = 0; i < RAIN.n; i++) RAIN.p.push({ x: (Math.random() - 0.5) * 2 * RAIN.R, y: Math.random() * 24, z: (Math.random() - 0.5) * 2 * RAIN.R, s: 0.7 + Math.random() * 0.6 });
  const sgeo = new THREE.BufferGeometry(); sgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RAIN.n * 3), 3)); RAIN.snow = new THREE.Points(sgeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.9, depthWrite: false })); RAIN.snow.frustumCulled = false; G.scene.add(RAIN.snow); RAIN.sgeo = sgeo; }
function colTop(x, z) { const k = x * 65536 + z; let v = RAIN.colH.get(k); if (v === undefined) { v = 0; const top = Math.min(WH - 1, Math.floor(player.pos.y) + 40); for (let y = top; y > 0; y--) { const id = world.get(x, y, z); if (id && (SOLID[id] || FKIND[id] || BL[id].leaves)) { v = y + 1; break; } } RAIN.colH.set(k, v); } return v; }
{ const _uh = updateHand; let snd = 0; updateHand = function (dt, light) { const r = _uh.apply(this, arguments); if (!world || !G.scene) return r; if (!RAIN.lines) rainSetup();
    const on = world.dim === 'overworld' && S.wk > 0.05; RAIN.lines.visible = on; RAIN.snow.visible = on; if (!on) return r;
    RAIN.hT -= dt; if (RAIN.hT <= 0) { RAIN.hT = 0.5; RAIN.colH.clear(); }
    const P = camera.position, pa = RAIN.geo.attributes.position.array, sa = RAIN.sgeo.attributes.position.array; const fall = 20 * dt, sfall = 2.2 * dt; let shown = 0, inRain = 0;
    const kind = precipAt(P.x, P.z); const use = Math.floor(RAIN.n * S.wk);
    for (let i = 0; i < RAIN.n; i++) { const q = RAIN.p[i]; const snow = (precipAt(P.x + q.x, P.z + q.z) === 'snow'); q.y -= snow ? sfall * q.s : fall * q.s; if (snow) { q.x += Math.sin(q.y * 1.3 + i) * dt * 0.6; }
      const wx = Math.floor(P.x + q.x), wz = Math.floor(P.z + q.z); const top = colTop(wx, wz); const wy = P.y - 8 + q.y;
      if (wy < top || q.y < 0) { q.y = 16 + Math.random() * 8; q.x = (Math.random() - 0.5) * 2 * RAIN.R; q.z = (Math.random() - 0.5) * 2 * RAIN.R; }
      const dry = i >= use || DRY_B().has(world.gen.column(wx, wz).b) || wy < top; const k6 = i * 6, k3 = i * 3;
      if (dry || snow) { pa[k6] = pa[k6 + 3] = 0; pa[k6 + 1] = pa[k6 + 4] = -999; pa[k6 + 2] = pa[k6 + 5] = 0; }
      else { pa[k6] = P.x + q.x; pa[k6 + 1] = wy; pa[k6 + 2] = P.z + q.z; pa[k6 + 3] = P.x + q.x - 0.03; pa[k6 + 4] = wy + 0.7; pa[k6 + 5] = P.z + q.z; inRain++; }
      if (dry || !snow) { sa[k3] = 0; sa[k3 + 1] = -999; sa[k3 + 2] = 0; } else { sa[k3] = P.x + q.x; sa[k3 + 1] = wy; sa[k3 + 2] = P.z + q.z; } }
    RAIN.geo.attributes.position.needsUpdate = true; RAIN.sgeo.attributes.position.needsUpdate = true;
    // rain on the ground: splashes and a soft hiss
    snd -= dt; if (snd <= 0 && inRain > 30 && Sfx.ctx) { snd = 0.9; Sfx.play('rain', Math.min(0.5, inRain / RAIN.n) * (world.skyAt(Math.floor(P.x), Math.floor(P.y), Math.floor(P.z)) >= 1 ? 1 : 0.45)); }
    if (S.flash > 0) S.flash = Math.max(0, S.flash - dt * 2.5);
    return r; }; }
// ---------- undead don't burn in the rain ----------
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) { if (this.t && this.t.burns && S.weather !== 'clear' && weatherWet(this.pos)) { const t0 = this.t; this.t = Object.assign({}, t0, { burns: false }); try { return _u.call(this, dt); } finally { if (this.t.burns === false && this.t !== t0) this.t = t0; } } return _u.call(this, dt); }; }
// ---------- lightning ----------
const BOLTS = [];
function lightningAt(x, y, z, o = {}) {
  // a lightning rod within 32 blocks takes the strike
  if (!o.noRod) { let best = null, bd = 1e9; const cx0 = x >> 4, cz0 = z >> 4; for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) { const c = world.getChunk(cx0 + dx, cz0 + dz); if (!c) continue; if (!c.rodScan || c.rodDirty) { c.rodDirty = false; c.rodScan = []; for (let j = 0; j < c.d.length; j++) { const b = BL[c.d[j]]; if (b && (b.fam === 'lightning_rod' || b.key === 'lightning_rod')) c.rodScan.push(j); } }
      for (const j of c.rodScan) { const yy = (j / 256) | 0, xx = c.cx * 16 + (j & 15), zz = c.cz * 16 + ((j >> 4) & 15); const d = Math.hypot(xx - x, zz - z); if (d < 32 && d < bd && world.skyAt(xx, yy + 1, zz) >= 1) { bd = d; best = [xx, yy + 1, zz]; } } }
    if (best) { [x, y, z] = best; o.rod = true; } }
  // the bolt
  const pts = []; let px = x + 0.5, pz = z + 0.5; for (let yy = y + 90; yy > y; yy -= 3 + Math.random() * 4) { pts.push(new V3(px, yy, pz)); px += (Math.random() - 0.5) * 2.2; pz += (Math.random() - 0.5) * 2.2; } pts.push(new V3(x + 0.5, y, z + 0.5));
  const segs = []; for (let i = 0; i < pts.length - 1; i++) segs.push(pts[i], pts[i + 1]);
  const line = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(segs), new THREE.LineBasicMaterial({ color: 0xeef4ff, transparent: true, opacity: 1 })); G.scene.add(line); BOLTS.push({ line, t: 0.35 });
  S.flash = 0.6; const d = Math.hypot(player.pos.x - x, player.pos.z - z); setTimeout(() => Sfx.play('thunder', Math.max(0.15, 1 - d / 160)), Math.min(4000, d * 6)); if (d < 20) Sfx.play('boom', 0.4);
  Particles.emit(x + 0.5, y + 0.2, z + 0.5, 20, [[1, 1, 0.8], [0.8, 0.9, 1]], 4, 0.5, -2, 0.6);
  if (o.visual) return;
  // fire on the ground, hurt what's close, change some mobs
  if (!o.rod && B.FIRE !== undefined && S.rules.doFireTick !== false) { if (!world.get(x, y, z) && SOLID[world.get(x, y - 1, z)]) world.set(x, y, z, B.FIRE); }
  if (!player.dead && isSurv() && Math.hypot(player.pos.x - x - 0.5, player.pos.z - z - 0.5) < 3 && Math.abs(player.pos.y - y) < 4) player.hurt(5, new V3(x, y, z), 'lightning');
  for (const m of G.mobs.slice()) { if (m.dead || Math.hypot(m.pos.x - x - 0.5, m.pos.z - z - 0.5) > 3.5 || Math.abs(m.pos.y - y) > 4) continue;
    const swap = { pig: 'zombified_piglin', villager: 'witch' }[m.type];
    if (swap && MOBS[swap] && !isClientMP()) { const n = spawnMob(swap, m.pos.x, m.pos.y, m.pos.z); if (n) { n.yaw = m.yaw; n.persistent = m.persistent; } m.dead = true; m.gone = true; if (m.remove) m.remove(); continue; }
    if (m.type === 'creeper') { m.charged = true; if (m.root) m.root.traverse(o2 => { if (o2.material && o2.material.emissive) o2.material.emissive.setRGB(0.15, 0.3, 0.6); }); }
    if (m.type === 'mooshroom') m.brown = !m.brown;
    m.hurt(5, new V3(x, y, z), 0.5); }
}
{ const _ub = updateBoats; let strikeT = 8; updateBoats = function (dt) { const r = _ub(dt);
    for (const b of BOLTS) { b.t -= dt; b.line.material.opacity = Math.max(0, b.t / 0.35) * (Math.random() < 0.3 ? 0.4 : 1); if (b.t <= 0) { G.scene.remove(b.line); b.line.geometry.dispose(); b.done = true; } } for (let i = BOLTS.length - 1; i >= 0; i--) if (BOLTS[i].done) BOLTS.splice(i, 1);
    if (!world || world.dim !== 'overworld' || isClientMP() || S.weather !== 'thunder') return r;
    strikeT -= dt; if (strikeT <= 0) { strikeT = 5 + Math.random() * 20; const P = player.pos; for (let t = 0; t < 8; t++) { const x = Math.floor(P.x + (Math.random() - 0.5) * 128), z = Math.floor(P.z + (Math.random() - 0.5) * 128); if (!world.loaded(x, z) || precipAt(x, z) === null) continue; const y = world.surfaceY(x, z);
        // skeleton trap: some strikes leave a skeleton horse waiting
        if (Math.random() < 0.06 && S.difficulty !== 'peaceful' && y > SEA) { lightningAt(x, y, z, { visual: true }); const h = spawnMob('skeleton_horse', x + 0.5, y, z + 0.5); if (h) { h.trap = 900; h.persistent = true; } }
        else lightningAt(x, y, z); break; } }
    return r; }; }
// the trap springs when you come close: four skeleton horsemen
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) { if (this.trap && !this.dead && !isClientMP()) { this.trap -= dt; if (this.trap <= 0) { this.gone = true; this.dead = true; if (this.remove) this.remove(); return; }
      if (isSurv() && !player.dead && this.pos.distanceTo(player.pos) < 10) { this.trap = 0; const x = this.pos.x, y = this.pos.y, z = this.pos.z; lightningAt(Math.floor(x), Math.floor(y), Math.floor(z), { visual: true, noRod: true });
        const horses = [this]; for (let i = 0; i < 3; i++) { const h = spawnMob('skeleton_horse', x + (Math.random() - 0.5) * 3, y, z + (Math.random() - 0.5) * 3); if (h) horses.push(h); }
        for (const h of horses) { h.persistent = false; const sk = spawnMob('skeleton', h.pos.x, h.pos.y + 1.15, h.pos.z); if (sk) { mountMob(sk, h, 1.15); sk.helmet = 'iron'; if (sk.head) sbox(sk, sk.head, 0.56, 0.3, 0.56, 0, 0.42, 0, 'trap_helm', fur([210, 210, 214], 4)); } } return; } }
    return _u.call(this, dt); }; }
// ---------- /weather, saving, sounds ----------
CMDS.weather = { usage: '<clear|rain|thunder> [duration]', run(a, ctx) { const w = (a[0] || '').toLowerCase(); if (!['clear', 'rain', 'thunder'].includes(w)) throw new CmdError('Usage: /weather ' + CMDS.weather.usage); const sec = a[1] ? Math.max(1, parseFloat(a[1])) : 0; setWeather(w, sec || undefined); ok('Changing to ' + (w === 'clear' ? 'clear' : w === 'rain' ? 'rain' : 'rain and thunder')); } };
{ const _p = packWorld; packWorld = function () { const r = _p.apply(this, arguments); try { if (r && typeof r === 'object') r.weather = [S.weather, Math.round(S.weatherT)]; } catch (e) { } return r; }; }
{ const _u = unpackWorld; unpackWorld = function (w, d) { const r = _u.apply(this, arguments); try { if (d && d.weather) { S.weather = d.weather[0]; S.weatherT = d.weather[1]; } } catch (e) { } return r; }; }
{ const _pl = Sfx.play; Sfx.play = function (name, v = 1, rate) { if (!this.ctx || v < 0.02) return _pl.apply(this, arguments);
    if (name === 'rain') { this.nz(1.1, 5200, 0.16 * v, 'highpass'); this.nz(1.1, 1400, 0.1 * v, 'bandpass', 0.6); return; }
    if (name === 'thunder') { this.nz(2.6, 160, 1.2 * v, 'lowpass'); this.nz(1.2, 900, 0.5 * v, 'lowpass'); this.tone(48, 30, 2.2, 0.35 * v, 'sine'); return; }
    return _pl.apply(this, arguments); }; }
// you can sleep through a thunderstorm at any time of day
{ const _cs = typeof canSleep === 'function' ? canSleep : null; if (_cs) canSleep = function () { if (S.weather === 'thunder') return true; return _cs.apply(this, arguments); }; }
{ const _set = World.prototype.set; World.prototype.set = function (x, y, z, id) { const prev = this.get(x, y, z); const r = _set.apply(this, arguments); const isRod = (v) => BL[v] && (BL[v].fam === 'lightning_rod' || BL[v].key === 'lightning_rod'); if (isRod(id) || isRod(prev)) { const c = this.getChunk(x >> 4, z >> 4); if (c) c.rodDirty = true; } return r; }; }

// ================= RAIDS AND SNIFFERS (Minecraft 1.21 rules) =================
// Drinking an ominous bottle gives Bad Omen. Walking into a village with Bad Omen turns it into Raid Omen, and 30
// seconds later a raid starts: waves of pillagers, vindicators, ravagers, witches and evokers (3 waves on Easy, 5 on
// Normal, 7 on Hard) arrive at the edge of the village and head for its middle. Clear every wave for Hero of the
// Village; lose every villager and the raid is lost. Patrol and outpost captains (pillagers with a banner) drop an
// ominous bottle. Sniffers sniff out torchflower seeds and pitcher pods from grass, dirt and moss, are bred with
// torchflower seeds and lay sniffer eggs, which hatch faster on moss.
Object.assign(EFFECTS, { bad_omen: 'Bad Omen', raid_omen: 'Raid Omen', hero_of_the_village: 'Hero of the Village', water_breathing: EFFECTS.water_breathing || 'Water Breathing', conduit_power: 'Conduit Power', glowing: 'Glowing' });
{ const _oe = onEatItem; onEatItem = function (id) { _oe.apply(this, arguments); if (id === IT.ominous_bottle) { giveEffect('bad_omen', 6000, 0); Sfx.play('omen', 1); toast('Bad Omen', 2); } }; }
// ---- captains ----
function makeCaptain(m) { m.captain = true; if (!m.root) return; const g = new THREE.Group(); const pole = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.06), new THREE.MeshLambertMaterial({ color: 0x6a4a2a })); pole.position.set(0, m.h + 0.3, -0.18); g.add(pole);
  const c = document.createElement('canvas'); c.width = 20; c.height = 40; const x = c.getContext('2d'); x.fillStyle = '#eee'; x.fillRect(0, 0, 20, 40); x.fillStyle = '#2a8a8a'; x.fillRect(0, 24, 20, 6); x.fillStyle = '#222'; x.fillRect(6, 6, 8, 12); x.fillStyle = '#888'; x.fillRect(7, 18, 6, 4); x.fillStyle = '#444'; x.fillRect(0, 34, 20, 6);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.84), new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide })); flag.position.set(0, m.h + 0.35, -0.22); g.add(flag); m.root.add(g); }
{ const _sm = spawnMob; spawnMob = function (type, x, y, z, opts) { const m = _sm.apply(this, arguments); if (m && type === 'pillager' && !(opts && opts.raid) && !RAID.spawning && Math.random() < 0.12) makeCaptain(m); return m; }; }
{ const _h = Mob.prototype.hurt; Mob.prototype.hurt = function () { const was = this.dead; const r = _h.apply(this, arguments); if (this.dead && !was && this.captain && !this.raid) dropItem(IT.ominous_bottle, 1, this.pos.x, this.pos.y + 0.6, this.pos.z); return r; }; }
// ---- raids ----
const RAID = { r: null, spawning: false, check: 0 };
const RAID_WAVES = { pillager: [4, 3, 3, 4, 4, 4, 2], vindicator: [0, 2, 0, 1, 4, 2, 5], ravager: [0, 0, 1, 0, 1, 0, 2], witch: [0, 0, 0, 3, 0, 0, 1], evoker: [0, 0, 0, 0, 1, 1, 2] };
function villageCenter() { const P = player.pos; const cx = Math.floor(P.x) >> 4, cz = Math.floor(P.z) >> 4; const st = typeof startNear === 'function' ? startNear(world, 'village', cx, cz, 3) : null; if (st) return new V3(st.cx * 16 + 8, P.y, st.cz * 16 + 8);
  const vs = G.mobs.filter(m => !m.dead && m.type === 'villager' && m.pos.distanceTo(P) < 48); if (vs.length < 3) return null; const c = new V3(); for (const v of vs) c.add(v.pos); return c.divideScalar(vs.length); }
function raidStart(center) { const waves = S.difficulty === 'easy' ? 3 : S.difficulty === 'hard' ? 7 : 5; RAID.r = { c: center.clone(), wave: 0, waves, t: 15, mobs: [], total: 1, state: 'wait' }; Sfx.play('raid_horn', 1); toast('Raid', 3); }
function raidSpawnWave(R) { const i = R.wave; R.wave++; const ang = Math.random() * Math.PI * 2; const d = 30 + Math.random() * 6; let sx = Math.floor(R.c.x + Math.cos(ang) * d), sz = Math.floor(R.c.z + Math.sin(ang) * d);
  const sy = typeof world.surfaceY === 'function' ? world.surfaceY(sx, sz) + 1 : Math.floor(R.c.y) + 2; R.mobs = []; RAID.spawning = true;
  try { for (const type in RAID_WAVES) { if (!MOBS[type]) continue; const n = RAID_WAVES[type][Math.min(i, 6)] + (R.waves > 5 && i >= 5 ? 1 : 0); for (let k = 0; k < n; k++) { const m = spawnMob(type, sx + (Math.random() * 4 - 2), sy, sz + (Math.random() * 4 - 2), { raid: true }); if (!m) continue; m.raid = true; m.persistent = true; R.mobs.push(m); } }
    if (R.mobs.length) { const cap = R.mobs.find(m => m.type === 'pillager') || R.mobs[0]; makeCaptain(cap); } } finally { RAID.spawning = false; }
  R.total = R.mobs.reduce((a, m) => a + (m.maxHp || m.hp || 1), 0) || 1; R.state = 'fight'; Sfx.play('raid_horn', 1); }
function raidTick(dt) { const R = RAID.r; const P = player;
  if (!R) { RAID.check -= dt; if (RAID.check > 0) return; RAID.check = 1; const e = P.effects || {};
    if (e.bad_omen && world.dim === 'overworld' && S.difficulty !== 'peaceful' && !P.dead) { const c = villageCenter(); if (c) { delete P.effects.bad_omen; giveEffect('raid_omen', 30, 0); RAID.pendingC = c; toast('Raid Omen', 2); } }
    if (RAID.pendingC && !(P.effects || {}).raid_omen) { raidStart(RAID.pendingC); RAID.pendingC = null; } return; }
  if (world.dim !== 'overworld' || S.difficulty === 'peaceful') { endRaid(false, true); return; }
  R.mobs = R.mobs.filter(m => !m.dead && !m.gone && G.mobs.includes(m));
  const alive = R.mobs.reduce((a, m) => a + Math.max(0, m.hp), 0);
  show('bossbar', true); $('bossname').textContent = R.state === 'wait' ? 'Raid' : 'Raid - Raiders Remaining: ' + R.mobs.length; $('bossfill').style.width = (R.state === 'wait' ? (1 - R.t / 15) * 100 : alive / R.total * 100) + '%';
  // raiders head for the middle of the village when nothing else holds their attention
  if (R.mobs.length <= 2) for (const m of R.mobs) setGlow(m, 2);
  const vill = G.mobs.filter(m => !m.dead && m.type === 'villager' && Math.hypot(m.pos.x - R.c.x, m.pos.z - R.c.z) < 64).length; if (R.hadVill && vill === 0) { endRaid(false); return; } if (vill) R.hadVill = true;
  if (R.state === 'wait') { R.t -= dt; if (R.t <= 0) raidSpawnWave(R); return; }
  if (!R.mobs.length) { if (R.wave >= R.waves) endRaid(true); else { R.state = 'wait'; R.t = 15; } } }
function endRaid(won, quiet) { const R = RAID.r; RAID.r = null; show('bossbar', false); if (quiet || !R) return;
  if (won) { toast('Raid - Victory', 4); giveEffect('hero_of_the_village', 2400, 0); Sfx.play('levelup', 1); for (let i = 0; i < 8; i++) setTimeout(() => Particles.emit(R.c.x + (Math.random() - 0.5) * 16, R.c.y + 12 + Math.random() * 6, R.c.z + (Math.random() - 0.5) * 16, 30, [[1, 0.3, 0.3], [0.3, 1, 0.4], [0.3, 0.5, 1], [1, 1, 0.4]], 6, 1.2, 4, 0.2, 1.6), i * 300); }
  else toast('Raid - Defeat', 4); }
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) { const r = _u.apply(this, arguments); const R = RAID.r;
    if (R && this.raid && !this.dead && !this.chasing && !this.prey && this.onGround) { const dx = R.c.x - this.pos.x, dz = R.c.z - this.pos.z; const d = Math.hypot(dx, dz); if (d > 8) { const sp = (MOBS[this.type].speed || 2) * 0.8; const vy = this.vel.y; this.vel.set(dx / d * sp, 0, dz / d * sp); moveEntity(this, dt); if (this.hitH) this.vel.y = 8; else this.vel.y = vy; this.yaw = Math.atan2(dx, dz); if (this.root) { this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; } } }
    return r; }; }
// ---- sniffers ----
Object.assign(BREED_FOOD, { sniffer: ['torchflower_seeds'] }); if (typeof TEMPT_FOOD !== 'undefined') TEMPT_FOOD.sniffer = ['torchflower_seeds'];
{ const _br = breed; breed = function (a, b) { if (a.type === 'sniffer' && b.type === 'sniffer') { a.loveT = b.loveT = 0; a.loveCD = b.loveCD = 300; const x = Math.floor((a.pos.x + b.pos.x) / 2), y = Math.floor(Math.max(a.pos.y, b.pos.y) + 0.1), z = Math.floor((a.pos.z + b.pos.z) / 2);
      for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) if (!world.get(x + dx, y, z + dz) && SOLID[world.get(x + dx, y - 1, z + dz)]) { world.set(x + dx, y, z + dz, B.SNIFFER_EGG); mpBlock(x + dx, y, z + dz, B.SNIFFER_EGG); break; }
      for (const m of [a, b]) hearts(m, 6); spawnOrb(x, y + 0.5, z, 1 + (Math.random() * 7 | 0)); return; } return _br.apply(this, arguments); }; }
const SNIFF_SOIL = new Set(['grass', 'dirt', 'podzol', 'coarse_dirt', 'rooted_dirt', 'moss_block', 'mud', 'muddy_mangrove_roots', 'snowy_grass']);
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) { if (this.type !== 'sniffer' || this.dead || this.baby) return _u.apply(this, arguments);
    if (this.digT > 0) { this.digT -= dt; this.vel.x = this.vel.z = 0; if (Math.random() < dt * 8) Particles.blockBreak(Math.floor(this.pos.x + Math.sin(this.yaw)), Math.floor(this.pos.y - 0.5), Math.floor(this.pos.z + Math.cos(this.yaw)), world.get(Math.floor(this.pos.x), Math.floor(this.pos.y - 0.5), Math.floor(this.pos.z)) || B.DIRT, 1);
      if (this.digT <= 0) { const it = Math.random() < 0.5 ? IT.torchflower_seeds : IT.pitcher_pod; dropItem(it, 1, this.pos.x + Math.sin(this.yaw) * 1.2, this.pos.y + 0.4, this.pos.z + Math.cos(this.yaw) * 1.2); Sfx.at('grunt', this.pos, 0.8); this.sniffCD = 120 + Math.random() * 240; } if (this.root) { this.root.position.copy(this.pos); } return; }
    this.sniffCD = (this.sniffCD === undefined ? 30 + Math.random() * 90 : this.sniffCD) - dt;
    if (this.sniffCD <= 0 && this.onGround) { const below = BL[world.get(Math.floor(this.pos.x), Math.floor(this.pos.y - 0.5), Math.floor(this.pos.z))]; if (below && SNIFF_SOIL.has(below.key)) { this.digT = 4; Sfx.at('grunt', this.pos, 0.6); } else this.sniffCD = 10; }
    return _u.apply(this, arguments); }; }
function snifferEggTick(x, y, z, id) { const d = BL[id]; const moss = world.get(x, y - 1, z) === B.MOSS_BLOCK; if (Math.random() > (moss ? 0.035 : 0.017)) return;
  if (d.snifferEgg < 2) { const nid = B['SNIFFER_EGG#' + (d.snifferEgg + 1)]; world.set(x, y, z, nid); mpBlock(x, y, z, nid); Sfx.at('egg_crack', new V3(x + 0.5, y, z + 0.5), 0.8); }
  else { world.set(x, y, z, 0); mpBlock(x, y, z, 0); const m = spawnMob('sniffer', x + 0.5, y, z + 0.5); if (m && typeof setBaby === 'function') setBaby(m, true, 2400); Sfx.at('egg_crack', new V3(x + 0.5, y, z + 0.5), 1); } }
if (typeof BRUSH_LOOT !== 'undefined') BRUSH_LOOT.sand.push(['sniffer_egg', 2]);
// ---- the clock and sounds ----
{ const _uw = updateWater; updateWater = function (dt) { const r = _uw.apply(this, arguments); if (world && !isClientMP()) { try { raidTick(dt); } catch (e) { console.error(e); } } return r; }; }
{ const _pl = Sfx.play; Sfx.play = function (name, v = 1, rate) { if (!this.ctx) return _pl.apply(this, arguments); if (!(v >= 0.02)) return;
    if (name === 'raid_horn') { this.tone(110, 108, 3, 0.2 * v, 'sawtooth'); this.tone(165, 162, 3, 0.1 * v, 'sawtooth'); this.tone(55, 55, 3, 0.12 * v, 'triangle'); return; }
    if (name === 'omen') { this.tone(200, 90, 1.2, 0.1 * v, 'sawtooth'); this.nz(1, 300, 0.2 * v, 'lowpass'); return; }
    return _pl.apply(this, arguments); }; }

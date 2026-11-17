// ================= OWNER MOB SOUNDS =================
// The owner's recorded files win over everything else. Keys (several files per key = random pick):
//   mob.<type>.ambient / .hurt / .death      the mob's voice
//   mob.<type>.angry                         ambient while angry (wolves growl, endermen scream...)
//   mob.<type>.baby_<kind>                   babies (otherwise babies play the adult sound pitched up)
//   mob.<type>~<variant>.<kind>              sound variants (wolf classic/angry/big/cute/grumpy/puglin/sad, cow moody,
//                                            pig big/mini, chicken picky, cat royal, goat screaming, panda worried/
//                                            aggressive by personality, copper golem weathered/oxidized by age)
//   mob.<type>.<action>                      step, attack, eat, shoot, portal... (MOB_ACTION below)
// A mob with no file for a sound keeps its old voice (68_voices.js / generic samples).
// These files are NOT baked into index.html (thousands of files would triple its size): sounds/mobs.json lists them
// and they stream from sounds/ - each key on first use, mob keys in the background. Opened from a local file
// (file://) the fetch fails and the old sounds play.
const MobSnd = {
  index: null, loading: {}, queue: [], cur: null, busy: 0,
  start() {
    if (this.index !== null) return; this.index = {};
    fetch('sounds/mobs.json').then(r => r.ok ? r.json() : {}).then(ix => { this.index = ix; this.queue = Object.keys(ix).sort((a, b) => a.startsWith('amb.') - b.startsWith('amb.')); for (let i = 0; i < 6; i++) this.pump(); }).catch(() => { });
  },
  load(key) {
    if (this.loading[key] || !this.index || !this.index[key] || !Sfx.ctx) return this.loading[key]; const files = this.index[key]; Sfx.samples[key] = Sfx.samples[key] || [];
    return (this.loading[key] = Promise.all(files.map((f, i) => fetch('sounds/' + f).then(r => r.arrayBuffer()).then(b => Sfx.ctx.decodeAudioData(b)).then(ab => { Sfx.samples[key][i] = ab; }).catch(() => { }))));
  },
  pump() { const k = this.queue.shift(); if (!k) return; (this.load(k) || Promise.resolve()).then(() => setTimeout(() => this.pump(), 0)); },
  // first loaded key of a list (all of them start loading)
  pick(keys) { for (const k of keys) this.load(k); for (const k of keys) if (Sfx.has(k)) return k; return null; },
  // play mob action <kind> for m; returns true if the owner's file played
  act(m, kind, v = 0.6, rate = 1) {
    if (!Sfx.ctx || !m || !m.pos) return false; const base = 'mob.' + m.type, sv = base + mobSoundVariant(m);
    const keys = m.baby ? [base + '.baby_' + kind, sv + '.' + kind, base + '.' + kind] : [sv + '.' + kind, base + '.' + kind];
    const k = this.pick(keys); if (!k) return false;
    const p = (m.baby && !k.includes('.baby_') ? 1.4 : 1) * rate * (0.92 + Math.random() * 0.16);
    this.busy++; try { Sfx.at(k, m.pos, v, p); } finally { this.busy--; } return true;
  },
};
{ const _ls = Sfx.loadSamples.bind(Sfx); Sfx.loadSamples = function () { _ls(); MobSnd.start(); }; }
const MOB_SOUND_VARIANTS = { wolf: [['classic', 1], ['angry', 1], ['big', 1], ['cute', 1], ['grumpy', 1], ['puglin', 1], ['sad', 1]],
  cow: [['', 3], ['moody', 1]], pig: [['', 2], ['big', 1], ['mini', 1]], chicken: [['', 3], ['picky', 1]], cat: [['', 3], ['royal', 1]],
  goat: [['', 49], ['screaming', 1]] };
function mobSoundVariant(m) {
  if (m.type === 'copper_golem') return m.cgAge >= 3 ? '~oxidized' : m.cgAge === 2 ? '~weathered' : '';  // changes as it ages
  if (m._sndVar !== undefined) return m._sndVar;
  if (m.type === 'panda' && m.var != null && typeof BB_PANDA !== 'undefined') { const p = BB_PANDA[m.var % 7]; return (m._sndVar = p === 'worried' || p === 'aggressive' ? '~' + p : ''); }
  const vs = MOB_SOUND_VARIANTS[m.type]; if (!vs) return (m._sndVar = '');
  if (m.type === 'goat' && m.screaming) return (m._sndVar = '~screaming');
  let r = Math.random() * vs.reduce((a, v) => a + v[1], 0); for (const [n, w] of vs) { r -= w; if (r <= 0) return (m._sndVar = n ? '~' + n : ''); }
  return (m._sndVar = '');
}
{ const _mob = Sfx.mob.bind(Sfx); Sfx.mob = function (m, kind, v = 0.6) {
    if (this.ctx) {
      const angry = !kind && (m.angry > 0 || m.aggro) && m.t && m.t.kind !== 'passive';
      if (angry && MobSnd.act(m, 'angry', v * 1.4)) return;
      if (kind === 'hurt' && m.type === 'armadillo' && m.rollT > 0 && MobSnd.act(m, 'hurt_reduced', v * 1.4)) return;
      if (MobSnd.act(m, kind || 'ambient', v * 1.4)) return;
    }
    return _mob(m, kind, v);
  }; }

// ---- action sounds ----
// While a mob updates, gets hurt or is right-clicked, MobSnd.cur is that mob. Old generic sounds the game plays in
// that moment are swapped for the owner's file: [old sound name] -> action, per mob type ('*' = any mob).
const EQUINE_SND = ['horse', 'donkey', 'mule', 'skeleton_horse', 'zombie_horse', 'camel', 'camel_husk'];
const MOB_ACTION = {
  '*': { eat: 'eat', milk: 'milk', snip: 'shear', shear: 'shear', saddle: 'saddle', armor: 'armor', neigh_angry: 'rear', fireball: 'shoot' },
  enderman: { vwoop: 'portal' }, breeze: { vwoop: 'shoot' }, evoker: { vwoop: 'cast' }, illusioner: { vwoop: 'cast' },
  wandering_trader: { eat: 'drink', vwoop: 'disappear' }, iron_golem: { grunt: 'attack' },
  slime: { squish: 'jump' }, magma_cube: { squish: 'jump' }, sulfur_cube: { squish: 'jump', cube_absorb: 'absorb', cube_bounce: 'bounce' },
  warden: { roar: (rate) => rate > 1.3 ? 'sonic_boom' : 'roar' }, ravager: { roar: 'roar' }, villager: { hmm: 'trade' },
};
for (const e of EQUINE_SND) MOB_ACTION[e] = { hoof: 'step', neigh: 'eat' };
{ const _at = Sfx.at.bind(Sfx); Sfx.at = function (name, pos, v = 1, rate) {
    const m = MobSnd.cur;
    if (m && !MobSnd.busy && typeof name === 'string' && !name.startsWith('mob.')) {
      const tbl = MOB_ACTION[m.type]; let a = (tbl && tbl[name]) || MOB_ACTION['*'][name];
      if (typeof a === 'function') a = a(rate || 1);
      if (a && MobSnd.act(m, a, Math.min(1, v * 1.1))) return;
    }
    return _at(name, pos, v, rate);
  }; }
{ const _play = Sfx.play.bind(Sfx); Sfx.play = function (name, v = 1, rate) {
    if (typeof name !== 'string') return _play(name, v, rate);
    // ender dragon and other streamed world sounds (thunder): the old sound plays until the owner's file arrives
    if (name.startsWith('dragon_')) { MobSnd.load(name); if (!this.has(name)) return _play('roar', v, rate); }
    else if (name === 'thunder') MobSnd.load(name);
    const m = MobSnd.cur;
    if (m && !MobSnd.busy && !name.startsWith('mob.')) {
      const tbl = MOB_ACTION[m.type]; const a = (tbl && tbl[name]) || MOB_ACTION['*'][name];
      if (a && typeof a === 'string' && MobSnd.act(m, a, Math.min(1, v * 1.1))) return;
    }
    return _play(name, v, rate);
  }; }
// run fn with m as the sound context
function withMobSnd(m, fn) { const prev = MobSnd.cur; MobSnd.cur = m; try { return fn(); } finally { MobSnd.cur = prev; } }
{ const _h = Mob.prototype.hurt; Mob.prototype.hurt = function () { const a = arguments; return withMobSnd(this, () => _h.apply(this, a)); }; }
{ const _mi = mobInteract; mobInteract = function (m, sneaking) { return withMobSnd(m, () => _mi(m, sneaking)); }; }
const PHURT_WRAPPED = new WeakSet();
{ const _u = Mob.prototype.update; Mob.prototype.update = function (dt) {
    const P = G.player;
    if (P && P.hurt && !PHURT_WRAPPED.has(P)) { PHURT_WRAPPED.add(P); const _ph = P.hurt; P.hurt = function () {
        const m = MobSnd.cur; const cd0 = this.hurtCD; const r = _ph.apply(this, arguments);
        if (m && !m.dead && !(cd0 > 0) && (this.hurtCD > 0 || this.dead)) MobSnd.act(m, 'attack', 0.8); return r; }; }
    const x0 = this.pos.x, z0 = this.pos.z, wasRoll = this.rollT > 0, ground0 = this.onGround;
    const r = withMobSnd(this, () => _u.call(this, dt));
    if (this.dead || !P || this.gone) return r;
    // footsteps: one every stride while walking on the ground (horses and camels already step with 'hoof')
    const d = Math.hypot(this.pos.x - x0, this.pos.z - z0);
    if (this.onGround && d > 0 && d < 2 && !EQUINE_SND.includes(this.type)) {
      this._stepD = (this._stepD || 0) + d; const stride = (this.baby ? 0.5 : 1) * Math.max(0.6, Math.min(2.2, 0.7 + this.hw * 1.2));
      if (this._stepD >= stride) { this._stepD = 0; const pd = P.pos.distanceTo(this.pos); if (pd < 16) {
        const lava = this.type === 'strider' && G.world && isLavaId && isLavaId(G.world.get(Math.floor(this.pos.x), Math.floor(this.pos.y), Math.floor(this.pos.z)));
        withMobSnd(null, () => MobSnd.act(this, lava ? 'step_lava' : 'step', this.type === 'warden' || this.type === 'ravager' || this.type === 'iron_golem' ? 0.5 : 0.22)); } }
    }
    // landing after a jump (slimes squish, horses land)
    if (!ground0 && this.onGround && (this._airT || 0) > 0.35 && P.pos.distanceTo(this.pos) < 16) withMobSnd(null, () => MobSnd.act(this, 'land', 0.4));
    this._airT = this.onGround ? 0 : (this._airT || 0) + dt;
    // armadillo rolling up / unrolling
    if (this.type === 'armadillo' && (this.rollT > 0) !== wasRoll) withMobSnd(null, () => MobSnd.act(this, this.rollT > 0 ? 'roll' : 'unroll', 0.5));
    return r;
  }; }

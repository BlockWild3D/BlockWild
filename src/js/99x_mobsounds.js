// ================= OWNER MOB SOUNDS =================
// The owner's recorded files win over everything else. Keys in SOUND_DATA (several files per key = random pick):
//   mob.<type>.ambient / .hurt / .death      the mob's voice
//   mob.<type>.angry                         ambient while angry (wolves growl, endermen scream...)
//   mob.<type>.baby_ambient / _hurt / _death babies (otherwise babies play the adult sound pitched up)
//   mob.<type>~<variant>.<kind>              sound variants (wolf: classic/angry/big/cute/grumpy/puglin/sad, ...),
//                                            each mob rolls one when it first makes a sound and keeps it
// A mob with no file for a sound keeps its old voice (68_voices.js / generic samples).
// These files are NOT baked into index.html (1200+ files would triple its size): sounds/mobs.json lists them and
// they stream from sounds/ - each key on first use, everything else in the background. Opened from a local file
// (file://) the fetch fails and mobs keep their old voices.
const MobSnd = {
  index: null, loading: {}, queue: [],
  start() {
    if (this.index !== null) return; this.index = {};
    fetch('sounds/mobs.json').then(r => r.ok ? r.json() : {}).then(ix => { this.index = ix; this.queue = Object.keys(ix); for (let i = 0; i < 6; i++) this.pump(); }).catch(() => { });
  },
  load(key) {
    if (this.loading[key] || !this.index || !this.index[key] || !Sfx.ctx) return this.loading[key]; const files = this.index[key]; Sfx.samples[key] = Sfx.samples[key] || [];
    return (this.loading[key] = Promise.all(files.map((f, i) => fetch('sounds/' + f).then(r => r.arrayBuffer()).then(b => Sfx.ctx.decodeAudioData(b)).then(ab => { Sfx.samples[key][i] = ab; }).catch(() => { }))));
  },
  pump() { const k = this.queue.shift(); if (!k) return; (this.load(k) || Promise.resolve()).then(() => setTimeout(() => this.pump(), 0)); },
};
{ const _ls = Sfx.loadSamples.bind(Sfx); Sfx.loadSamples = function () { _ls(); MobSnd.start(); }; }
const MOB_SOUND_VARIANTS = { wolf: [['classic', 1], ['angry', 1], ['big', 1], ['cute', 1], ['grumpy', 1], ['puglin', 1], ['sad', 1]],
  cow: [['', 3], ['moody', 1]], pig: [['', 2], ['big', 1], ['mini', 1]], chicken: [['', 3], ['picky', 1]], cat: [['', 3], ['royal', 1]],
  goat: [['', 49], ['screaming', 1]] };
function mobSoundVariant(m) {
  if (m._sndVar !== undefined) return m._sndVar; const vs = MOB_SOUND_VARIANTS[m.type]; if (!vs) return (m._sndVar = '');
  if (m.type === 'goat' && m.screaming) return (m._sndVar = '~screaming');
  let r = Math.random() * vs.reduce((a, v) => a + v[1], 0); for (const [n, w] of vs) { r -= w; if (r <= 0) return (m._sndVar = n ? '~' + n : ''); }
  return (m._sndVar = '');
}
{ const _mob = Sfx.mob.bind(Sfx); Sfx.mob = function (m, kind, v = 0.6) {
    if (this.ctx) {
      const k = kind || ((m.angry > 0 || m.aggro) ? 'angry' : 'ambient'); const base = 'mob.' + m.type, sv = base + mobSoundVariant(m);
      const tries = [];
      if (m.baby) tries.push([base + '.baby_' + k, 1], [base + '.baby_' + (kind || 'ambient'), 1]);
      tries.push([sv + '.' + k, m.baby ? 1.4 : 1], [base + '.' + k, m.baby ? 1.4 : 1]);
      if (!kind) tries.push([sv + '.ambient', m.baby ? 1.4 : 1], [base + '.ambient', m.baby ? 1.4 : 1]);
      for (const [key] of tries) MobSnd.load(key);
      for (const [key, p] of tries) if (this.has(key)) { this.at(key, m.pos, v * 1.4, p * (0.92 + Math.random() * 0.16)); return; }
    }
    return _mob(m, kind, v);
  }; }
// ender dragon: dragon_growl / dragon_hit / dragon_end stream like mob sounds; the old roar plays until they arrive
{ const _play = Sfx.play.bind(Sfx); Sfx.play = function (name, v, rate) {
    if (typeof name === 'string' && name.startsWith('dragon_')) { MobSnd.load(name); if (!this.has(name)) return _play('roar', v, rate); }
    return _play(name, v, rate);
  }; }

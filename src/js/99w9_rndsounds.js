// ================= OWNER GENERIC SOUNDS (random / entity / portal) =================
// Loads before the mob/ambient/block/item sound files, so their context-aware swaps run first and this table only
// catches what is left: the game's own generic sound names -> the owner's recordings (snd.random.*, snd.entity.*,
// snd.portal.*). Until a file has loaded (or from file://) the old sample / synth plays.
const GENERIC_SND = {
  bow: 'snd.random.bow', break: 'snd.random.break', click: 'snd.random.click', click_on: 'snd.random.click', click_off: 'snd.random.click',
  eat: 'snd.random.eat', fizz: 'snd.random.fizz', hiss: 'snd.random.fuse', glass: 'snd.random.glass', glass_break: 'snd.random.glass',
  levelup: 'snd.random.levelup', orb: 'snd.random.orb', pop: 'snd.random.pop', splash: 'snd.random.splash', boom: 'snd.random.explode',
  anvil: 'snd.random.anvil_use', door_open: 'snd.random.door_open', door_close: 'snd.random.door_close', trap_open: 'snd.random.door_open', trap_close: 'snd.random.door_close',
  chest: 'snd.random.chestopen', portal: 'snd.portal.travel', sweep: 'snd.entity.player.attack.sweep', frame_remove: 'snd.entity.itemframe.remove_item',
  // a melee hit landing: Minecraft's strong / crit hit sounds (crit while falling)
  thit_: () => { const P = G.player; return P && !P.onGround && P.vel && P.vel.y < -0.5 ? 'snd.entity.player.attack.crit' : 'snd.entity.player.attack.strong'; },
};
function genericSnd(name) {
  let k = GENERIC_SND[name]; if (!k && /^thit_(?!spear)/.test(name)) k = GENERIC_SND.thit_;
  if (typeof k === 'function') k = k(); return k || null;
}
{ const _p = Sfx.play.bind(Sfx); Sfx.play = function (name, v = 1, rate) {
    if (typeof name === 'string' && this.ctx && !(typeof MobSnd !== 'undefined' && MobSnd.busy) && typeof MobSnd !== 'undefined') {
      const k = genericSnd(name); if (k) { MobSnd.load(k); if (this.has(k)) { MobSnd.busy++; try { return _p(k, v, rate && name !== 'thit_' ? rate : 1); } finally { MobSnd.busy--; } } }
    }
    return _p(name, v, rate);
  }; }

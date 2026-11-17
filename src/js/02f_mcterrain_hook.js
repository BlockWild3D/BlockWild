// Minecraft terrain: in worlds of type "Minecraft" the base overworld generator hands each chunk to the Minecraft engine
// (02e_mcterrain.js, game side in 99zzzzzzzz_mcterrain.js). Hooked here, before the files that add mineshafts,
// strongholds, monuments, cave biomes ... on top, so those still run in Minecraft worlds.
{ const _go = World.prototype.genOverworld; World.prototype.genOverworld = function (c) { return this.gen && this.gen.mc ? mcGenOverworld(this, c) : _go.call(this, c); }; }

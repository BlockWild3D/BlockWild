# BlockWild modding guide

A mod is one JavaScript file. Open **Mods** on the title screen to add a mod. You can:

- add a `.js` file
- paste mod code
- add one of the built-in example mods

Press **Done** after changing mods. The game restarts with the new set of mods.

Mods run inside the game with full access, so only install mods from people you trust.

## Mod file layout

The top of the file can describe the mod with `@` comments. Everything after that is normal JavaScript. The `api` object is available in that code.

```js
// @name Rubies
// @description Ruby ore, rubies and ruby tools.
// @author You
// @version 1.0

api.addItem('ruby', { name: 'Ruby', icon: { color: '#e0115f', style: 'gem' } });
api.addBlock('ruby_ore', { name: 'Ruby Ore', texture: { color: '#e0115f', style: 'ore' },
  hardness: 3, tool: 'pickaxe', tier: 3, drop: 'ruby' });
api.addOre('ruby_ore', { veins: 2, size: 4, minY: 1, maxY: 18 });
api.addRecipe('ruby_block', 1, ['RRR', 'RRR', 'RRR'], { R: 'ruby' });
```

A mod's code runs once when the game starts. That is before textures, icons and the creative inventory are built, so anything you register appears everywhere, including the recipe book.

Saves store blocks and items by name. If you remove a mod, its blocks turn to air and its items disappear. Everything else in the world stays as it was.

## Textures and icons

A texture or icon can be given in any of these forms:

| Form | Example |
|---|---|
| A colour | `'#e0115f'` |
| A colour and a style | `{ color: '#e0115f', style: 'ore', color2: '#ff8ab0' }` |
| Pixel art: 16 strings of 16 characters, `.` is transparent | `{ pixels: [...], palette: { r: '#7a1a12', b: '#f0b030' } }` |
| An image | `{ image: 'data:image/png;base64,...' }` |
| A painter function | `(set, random) => { set(x, y, [r, g, b]) }` |

**Block styles:**

- `noise` (the default)
- `ore`
- `planks`
- `bricks`
- `cobble`
- `log`
- `leaves`
- `glass`
- `lamp`
- `solid`

**Item styles:**

- `gem` (the default)
- `ingot`
- `dust`
- `ball`
- `pickaxe`
- `sword`

A block can use different textures for its sides:

```js
textures: { top: '#6a4', side: { color: '#853', style: 'planks' }, bottom: '#853' }
```

## Adding content

| Call | What it does |
|---|---|
| `api.addBlock(key, opts)` | New block, plus its item. Options are listed below. |
| `api.addItem(key, { name, icon, stack, food, fuel })` | New item. `food: 4` heals 4 half-hearts when eaten. |
| `api.addTool(key, { name, type, tier, speed, damage, color })` | Pickaxe or sword. `type` is `'pickaxe'` or `'sword'`. Tiers: 1 wood, 2 stone, 3 iron, 4 diamond. |
| `api.addRecipe(out, count, ['ABA', ' B '], { A: 'item', B: 'item' })` | Shaped recipe. It can be 2x2 or 3x3. Use `'#log'` for any kind of log. |
| `api.addRecipe(out, count, ['item', 'item'])` | Shapeless recipe. |
| `api.addSmelting(input, output)` | Furnace recipe. |
| `api.addFuel(item, seconds)` | Makes an item burnable in the furnace. |
| `api.addLoot(table, item, min, max, chance)` | Adds an item to chest loot. Tables: `dungeon`, `pyramid`, `house`, `tower`, `stronghold`, `fortress`, `ruined_portal`. |
| `api.addOre(block, { veins, size, minY, maxY, spread, replace, biomes })` | Places ore veins in the Overworld. Details below. |

**`addBlock` options:**

- `name`: the display name
- `texture` or `textures`: see the section above
- `hardness`: how long it takes to break
- `tool: 'pickaxe'` and `tier`: the pickaxe needed for the block to drop anything
- `light`: from 0 to 1
- `drop`: an item key, or `null` to drop nothing
- `sound`: `stone`, `wood`, `grass`, `sand`, `glass`, `wool` or `snow`
- `transparent: true`
- `shape: 'cross'`: for plants
- `fuel`: how many seconds it burns in a furnace

**`addOre` options:**

- `veins`: veins per chunk
- `size`: blocks per vein
- `minY` and `maxY`: the height range. The world is 96 blocks tall and sea level is 32.
- `spread`: `uni` (even), `tri` (most common in the middle) or `low` (most common at the bottom)
- `replace`: the block the ore replaces. The default is `stone`.
- `biomes`: a list of biome names, for example `['desert']`

The world can hold 255 kinds of block in total, base game included.

## Events

```js
api.on('tick', (dt) => { ... });                  // every frame while playing; dt is in seconds
api.on('worldStart', (e) => { e.newWorld; e.dimension; });
api.on('blockBreak', (e) => { e.x; e.y; e.z; e.block; return false; /* cancels the break */ });
api.on('blockPlace', (e) => { e.x; e.y; e.z; e.block; });
api.on('useItem', (e) => { e.item; e.block; e.mob; return false; /* cancels the normal right-click */ });
api.on('mobDeath', (e) => { e.type; e.x; e.y; e.z; });
api.on('chunkGenerate', (c) => {
  // c.dimension, c.cx, c.cz, c.x, c.z (block position of the chunk corner), c.random()
  // c.get(lx, y, lz) and c.set(lx, y, lz, 'block_key'): local x/z from 0 to 15
  // c.surfaceY(lx, lz), c.biome(lx, lz)
});
```

`worldStart` also fires each time you arrive in another dimension, with `newWorld: false`.

A mod that errors 5 times in one event is switched off for the rest of the session.

## Game access

These work once a world is running:

- `api.player`: has `pos`, `vel`, `health`, `inv`, `yaw` and `pitch`
- `api.world`, `api.dimension`, `api.mode`
- `api.time`: you can read and set it. 0 is sunrise, 0.25 is noon, 0.5 is sunset and 0.75 is midnight.
- `api.getBlock(x, y, z)` and `api.setBlock(x, y, z, 'key')`
- `api.lookingAt(maxDist)`: the block you are aiming at, as `{ x, y, z, key, face }`, or `null`
- `api.give('item', count)`
- `api.heal(n)`
- `api.message(text, seconds)`
- `api.spawnMob(type, x, y, z)`: types are `pig`, `cow`, `sheep`, `chicken`, `villager`, `zombie`, `skeleton`, `spider`, `creeper`, `enderman`, `ghast`, `blaze`, `magma_cube`, `piglin`, `zombified_piglin`, `hoglin`, `wither_skeleton` and `strider`
- `api.explode(x, y, z, power)`
- `api.physics`: change `gravity` (28), `jump` (8.6), `speed` (1) or `fallDamage` (1)
- `api.blockId(key)` and `api.itemId(key)`: the numeric ids

## Examples

The **Example mods** button installs these:

- Rubies
- Moon Jump
- Starter Kit
- Boom Staff
- Sky Islands
- Endless Day

Their code is in `src/js/07_modsui.js` and shows how to use each part of the API. Use **Save file** on any installed mod to download its `.js` file.

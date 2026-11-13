# BlockWild

A voxel sandbox you play in the browser. Explore biomes, build, craft, fight mobs, travel to the Nether and the End to defeat the Shadow Dragon, and (soon) play online with friends.

**Play:** https://blockwild3d.github.io/BlockWild/

## Features

- **Endless worlds** with plains, forests, deserts, snowy tundra, mountains and oceans, plus caves, lava and ores
- **Multiplayer:** open your world to friends from the pause menu and share the 6-letter code; friends join from Multiplayer on the title screen (peer-to-peer, no server needed)
- **Profiles:** username, skin editor or 64x64 skin upload, optional Google sign-in (see [ACCOUNTS_SETUP.md](ACCOUNTS_SETUP.md))
- **Chat and commands:** T to chat, / for Minecraft-style commands (/give, /tp, /time, /gamemode, /summon, /fill, /effect, /enchant, /xp, /locate, /gamerule ...)
- **Survival:** XP and enchanting, armour, durability, beds, farming, swimming and drowning
- **Mods:** a Mods button on the title screen to add mods from a file, pasted code or built-in examples (new blocks, items, tools, recipes, ores, world generation, events). See [MODDING.md](MODDING.md)
- **Structures:** villages, desert pyramids, watchtowers, desert wells, dungeons, ruined portals, strongholds and Nether fortresses, placed with Minecraft's rules (one attempt per region, biome checks, Minecraft spacing and rarity; strongholds in rings starting about 1,400-2,700 blocks out)
- **Mobs** with pixel-art skins and animations: pigs, cows, sheep, chickens, villagers, zombies, skeletons, spiders, creepers and endermen
- **Crafting** in a 2x2 or 3x3 grid, a recipe book that shows patterns, and furnaces for smelting
- **Combat:** swords, a bow you draw back to charge, and a shield you block with from your offhand
- **The Nether:** portals, four biomes, fortresses, ghasts, blazes, piglins, hoglins, magma cubes, wither skeletons and striders
- **The End:** find a stronghold with Eyes of Ender, destroy the End Crystals and defeat the Shadow Dragon
- **Survival and Creative** modes, day and night, animated water and lava, and autosave in your browser
- Works on desktop and on phones and tablets (touch controls)

## Controls

| Action | Keys |
| --- | --- |
| Move / jump / sprint | WASD, Space, Shift |
| Mine / attack | Left click |
| Place / use / eat / draw bow / block with shield | Right click (hold for bow and shield) |
| Hotbar | 1 to 9 or mouse wheel |
| Inventory and crafting | E (R toggles the recipe book) |
| Swap offhand | X |
| Drop item | Q |
| Fly (Creative) | F or double-tap Space |
| Debug info | F3 |
| Pause | Esc |

## Project layout

```
index.html        the built game (served by GitHub Pages)
src/shell.html    page layout, styles and menus
src/js/*.js       game code, concatenated in file-name order
tools/build.py    builds index.html from src/
```

The game is plain JavaScript using [three.js](https://threejs.org/) (loaded from cdnjs). There is no package manager or bundler.

## Building

After changing anything in `src/`, rebuild and commit `index.html`:

```
python3 tools/build.py
```

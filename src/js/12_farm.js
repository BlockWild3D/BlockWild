// ================= FARMING: hoes, farmland, wheat, sugar cane growth (random block ticks like Minecraft) =================
function farmUse(h, hd) {
  if (!hd || !target) return false;
  const above = world.get(target.x, target.y + 1, target.z);
  if (hd.tool === 'hoe' && (target.id === B.GRASS || target.id === B.DIRT || target.id === B.DIRT_PATH || target.id === B.SNOWY_GRASS) && (!above || PLANT[above]) && target.ny >= 0) {
    if (above) world.set(target.x, target.y + 1, target.z, 0);
    world.set(target.x, target.y, target.z, B.FARMLAND); damageHeld(1); Sfx.play('grass', 0.9); S.swing = 1; S.useCD = 0.25; mpBlock(target.x, target.y, target.z, B.FARMLAND); return true;
  }
  if ((hd.kind === 'seed' || hd.crop) && target.id === B.FARMLAND && !above && target.ny > 0) {
    const id = B[hd.crop.toUpperCase()]; world.set(target.x, target.y + 1, target.z, id); useHeld(1); Sfx.play('grass', 0.7); S.swing = 1; S.useCD = 0.2; mpBlock(target.x, target.y + 1, target.z, id); return true;
  }
  return false;
}
function mpBlock(x, y, z, id) { if (typeof MP !== 'undefined' && MP.blockChanged) MP.blockChanged(x, y, z, id); }
function nearWater(x, y, z) { for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) if (isWaterId(world.get(x + dx, y, z + dz))) return true; return false; }
let tickAcc = 0;
function randomTicks(dt) {
  tickAcc += dt * 400; const n = Math.floor(tickAcc); if (n < 1) return; tickAcc -= n;
  const P = player.pos, R = Math.min(S.simDist, S.renderDist) * 16;
  for (const c of world.chunks.values()) {
    const ox = c.cx * 16, oz = c.cz * 16; if (Math.abs(ox + 8 - P.x) > R || Math.abs(oz + 8 - P.z) > R) continue;
    const d = c.d;
    for (let i = 0; i < n; i++) {
      const j = (Math.random() * d.length) | 0; const id = d[j]; if (!id) continue;
      const def = BL[id];
      if (def.crop !== undefined && def.crop < 3) {
        const y = (j / 256) | 0, lz = ((j >> 4) & 15), lx = j & 15; const x = ox + lx, z = oz + lz;
        if (world.get(x, y - 1, z) !== B.FARMLAND) continue;
        if (Math.random() < (nearWater(x, y - 1, z) ? 0.9 : 0.4) && world.lightAt(x + 0.5, y + 0.5, z + 0.5, 1) > 0.45) { const nid = B[(def.cropBase || 'wheat_').toUpperCase() + (def.crop + 1)]; world.set(x, y, z, nid); mpBlock(x, y, z, nid); }
      } else if (CU_NEXT[id] && Math.random() < 0.06) { const y = (j / 256) | 0, lz = ((j >> 4) & 15), lx = j & 15; world.set(ox + lx, y, oz + lz, CU_NEXT[id]);
      } else if (id === B.BUDDING_AMETHYST || def.berry !== undefined || def.bamboo || def.cocoa !== undefined || id === B.CAVE_VINES || id === B.TWISTING_VINES || id === B.WEEPING_VINES) { const y = (j / 256) | 0, lz = ((j >> 4) & 15), lx = j & 15; caveTick(ox + lx, y, oz + lz, id);
      } else if (id === B.KELP || (def.coralBlock && !def.dead)) { const y = (j / 256) | 0, lz = ((j >> 4) & 15), lx = j & 15; oceanTick(ox + lx, y, oz + lz, id);
      } else if (def.stem !== undefined || def.mushroom) { const y = (j / 256) | 0, lz = ((j >> 4) & 15), lx = j & 15; natureTick(ox + lx, y, oz + lz, id);
      } else if (def.snifferEgg !== undefined) { const y = (j / 256) | 0, lz = ((j >> 4) & 15), lx = j & 15; snifferEggTick(ox + lx, y, oz + lz, id);
      } else if (def.turtleEgg || def.frogspawn) { const y = (j / 256) | 0, lz = ((j >> 4) & 15), lx = j & 15; eggTick(ox + lx, y, oz + lz, id);
      } else if (def.hive !== undefined) { const y = (j / 256) | 0, lz = ((j >> 4) & 15), lx = j & 15; hiveTick(ox + lx, y, oz + lz, id);
      } else if (def.sapling) { const y = (j / 256) | 0, lz = ((j >> 4) & 15), lx = j & 15; saplingTick(ox + lx, y, oz + lz, id);
      } else if (id === B.SUGAR_CANE && Math.random() < 0.35) {
        const y = (j / 256) | 0, lz = ((j >> 4) & 15), lx = j & 15; const x = ox + lx, z = oz + lz;
        if (world.get(x, y + 1, z) || world.get(x, y - 2, z) === B.SUGAR_CANE) continue; world.set(x, y + 1, z, B.SUGAR_CANE); mpBlock(x, y + 1, z, B.SUGAR_CANE);
      }
    }
  }
}

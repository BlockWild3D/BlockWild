"""Packs Minecraft Java mob model geometry and keyframe animations into src/js/02j_javamodels_data.js.

Input: layers.json and anims.json written by a small dumper run against a decompiled Minecraft client
(LayerDefinitions.createRoots() baked to ModelParts; AnimationDefinition fields of client/animation/definitions).
Those inputs come from Mojang's game and are not kept in this repository.

usage: python3 tools/javamodels_pack.py layers.json anims.json src/js/02j_javamodels_data.js
"""
import json, sys, re

SKIP = re.compile(r'(banner|bed_|bell|book|^chest#|double_chest|ender_chest|trapped_chest|chest_boat|conduit|decorated_pot|shield|trident|sign|skull|_head#|spin_attack|shulker_box|minecart|boat|raft|elytra|armor_stand|leash_knot|end_crystal|evoker_fangs|llama_spit|shulker_bullet|wind_charge|arrow|copper_golem_statue|player_head|dragon_head|piglin_head|creeper_head|zombie_head)')

def r(v):
    v = round(v, 4)
    return int(v) if v == int(v) else v

def node(n, tw, th):
    out = [[r(x) for x in n['p']], [r(x) for x in n['r']], [r(x) for x in n['s']] if 's' in n else 0, 1 if n.get('hid') else 0]
    cubes = []
    for c in n.get('c', []):
        polys = []
        for pg in c:
            flat = []
            for i in range(0, len(pg), 5):
                x, y, z, u, v = pg[i:i + 5]
                flat += [r(x), r(y), r(z), r(u * tw), r(v * th)]
            polys.append(flat)
        cubes.append(polys)
    out.append(cubes)
    out.append({k: node(v, tw, th) for k, v in n.get('k', {}).items()})
    return out

layers = json.load(open(sys.argv[1])); anims = json.load(open(sys.argv[2]))
L = {}
for key, v in layers.items():
    name = key.replace('minecraft:', '')
    if SKIP.search(name): continue
    L[name] = [v['tw'], v['th'], node(v['root'], v['tw'], v['th'])]
A = {}
for k, a in anims.items():
    bones = {}
    for bone, chans in a['b'].items():
        bones[bone] = [[ch['t'], [[r(kf[0]), [r(x) for x in kf[1]], [r(x) for x in kf[2]], kf[3]] for kf in ch['k']]] for ch in chans]
    A[k] = [r(a['len']), 1 if a['loop'] else 0, bones]
js = ('// Minecraft Java 1.21.11 mob models (exact parts, pivots, cubes and UVs) and keyframe animations, packed by\n'
      '// tools/javamodels_pack.py. Used by 99zzzzzzzzzzzzzzzz_javamobs.js.\n'
      'const JAVA_LAYERS = ' + json.dumps(L, separators=(',', ':')) + ';\n'
      'const JAVA_ANIMS = ' + json.dumps(A, separators=(',', ':')) + ';\n')
open(sys.argv[3], 'w').write(js)
print(len(L), 'layers', len(A), 'animations', len(js) // 1024, 'KB')

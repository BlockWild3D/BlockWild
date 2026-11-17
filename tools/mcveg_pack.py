#!/usr/bin/env python3
"""Packs Minecraft's overworld vegetation (biome feature lists for the vegetal_decoration step, placed + configured
features, block state providers, block tags) into src/js/02g_mcveg_data.js for 99zzzzzzzzz_mcveg.js.
usage: mcveg_pack.py <data/minecraft dir> <out.js>"""
import json, os, sys
R = sys.argv[1]; W = os.path.join(R, 'worldgen')
nm = lambda s: s.replace('minecraft:', '')
def load(kind, name): return json.load(open(os.path.join(W, kind, nm(name) + '.json')))
SKIP = ('nether', 'end', 'warped', 'crimson', 'soul_sand', 'basalt', 'the_void', 'small_end')
biomes, placed, feats, provs, tags = {}, {}, {}, {}, {}
STEP = 9
def tag(t):
    t = nm(t.lstrip('#'))
    if t in tags: return
    tags[t] = None; p = os.path.join(R, 'tags', 'block', t + '.json')
    if not os.path.exists(p): tags[t] = []; return
    out = []
    for v in json.load(open(p))['values']:
        v = v['id'] if isinstance(v, dict) else v
        if v.startswith('#'): tag(v); out += tags[nm(v[1:])]
        else: out.append(nm(v))
    tags[t] = out
def scan(o):
    """finds tags and provider references anywhere"""
    if isinstance(o, dict):
        for k, v in o.items():
            if k == 'tag' and isinstance(v, str): tag(v)
            elif k in ('blocks',) and isinstance(v, str) and v.startswith('#'): tag(v)
            elif k.endswith('provider') or k in ('to_place', 'state_provider', 'ground_state', 'vegetation_feature'):
                if isinstance(v, str) and k != 'vegetation_feature': prov(v)
                else: scan(v)
            else: scan(v)
    elif isinstance(o, list):
        for v in o:
            if isinstance(v, str) and v.startswith('#'): tag(v)
            else: scan(v)
def prov(name):
    k = nm(name)
    if k in provs or not os.path.exists(os.path.join(W, 'block_state_provider', k + '.json')): return
    provs[k] = None; provs[k] = load('block_state_provider', k); scan(provs[k])
def feature(o):
    if isinstance(o, str):
        k = nm(o)
        if k in feats: return
        feats[k] = None; feats[k] = load('feature', k); o = feats[k]
    scan(o); walk(o)
def place(o):
    if isinstance(o, str):
        k = nm(o)
        if k in placed: return
        placed[k] = None; placed[k] = load('placed_feature', k); o = placed[k]
    scan(o.get('placement', [])); feature(o['feature'])
def walk(o):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ('default', 'feature', 'feature_true', 'feature_false', 'vegetation_feature', 'tree_feature', 'placed_feature'):
                if isinstance(v, str): place(v)
                elif isinstance(v, dict) and 'placement' in v: place(v)
                elif isinstance(v, dict) and 'type' in v: feature(v)
                elif isinstance(v, dict) and 'feature' in v: place(v)
            elif k in ('features',) and isinstance(v, list):
                for e in v:
                    if isinstance(e, dict) and 'feature' in e and 'chance' in e: walk({'feature': e['feature']})
                    elif isinstance(e, dict) and 'data' in e: walk({'feature': e['data']})
                    else: walk({'feature': e})
            else: walk(v)
    elif isinstance(o, list):
        for v in o: walk(v)
for f in sorted(os.listdir(os.path.join(W, 'biome'))):
    b = f[:-5]
    if any(s in b for s in SKIP): continue
    fl = json.load(open(os.path.join(W, 'biome', f)))['features']
    biomes[b] = [nm(p) for p in (fl[STEP] if len(fl) > STEP else [])]
    for p in biomes[b]: place(p)
for t in ('air', 'dirt', 'sand', 'replaceable', 'replaceable_by_trees', 'leaves', 'logs', 'snow', 'terracotta', 'small_flowers', 'flowers', 'sculk_replaceable', 'moss_replaceable', 'azalea_root_replaceable', 'lush_ground_replaceable', 'base_stone_overworld', 'supports_vegetation', 'supports_cactus', 'supports_sugar_cane', 'supports_dry_vegetation', 'supports_crimson_roots', 'mushroom_grow_block', 'bamboo_plantable_on', 'sand_plantable_on', 'dead_bush_may_place_on', 'big_dripleaf_placeable', 'small_dripleaf_placeable', 'supports_big_dripleaf', 'supports_small_dripleaf', 'supports_mangrove_propagule', 'mangrove_roots_can_grow_through', 'coral_blocks', 'corals', 'coral_plants', 'wall_corals', 'saplings', 'cave_vines', 'beehives'):
    tag(t)
out = {'biomes': biomes, 'placed': placed, 'features': feats, 'providers': provs, 'tags': {k: v for k, v in tags.items() if v}}
js = ('// Minecraft 26.3 overworld vegetation (vegetal_decoration features per biome, placed/configured features, block state providers, block tags),\n'
      '// packed by tools/mcveg_pack.py. Used by 99zzzzzzzzz_mcveg.js.\nconst MCV_DATA = ' + json.dumps(out, separators=(',', ':')) + ';\n')
open(sys.argv[2], 'w').write(js)
import collections
print(len(biomes), 'biomes', len(placed), 'placed', len(feats), 'features', len(provs), 'providers', len(out['tags']), 'tags', len(js), 'bytes')
print(collections.Counter(nm(f['type']) for f in feats.values()))
print(collections.Counter(nm(m['type']) for p in placed.values() for m in p.get('placement', [])))
print(collections.Counter(nm(p.get('type', 'state')) if isinstance(p, dict) else 'str' for p in provs.values()))

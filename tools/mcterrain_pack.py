#!/usr/bin/env python3
"""Packs Minecraft's overworld worldgen data (density functions, noises, noise settings, material rules, biome climates)
into src/js/02d_mcterrain_data.js for the BlockWild Minecraft terrain engine (02e_mcterrain.js).
usage: mcterrain_pack.py <worldgen dir (data/minecraft/worldgen)> <out.js>"""
import json, os, sys
W = sys.argv[1]
def load(kind, name):
    name = name.replace('minecraft:', '')
    return json.load(open(os.path.join(W, kind, name + '.json')))
df, noise, mrule, mcond = {}, {}, {}, {}
def walk_df(o):
    if isinstance(o, str):
        k = o.replace('minecraft:', '')
        if k not in df: df[k] = None; df[k] = load('density_function', k); walk_df(df[k])
        return
    if isinstance(o, dict):
        for key, v in o.items():
            if key == 'noise' and isinstance(v, str):
                k = v.replace('minecraft:', '')
                if k not in noise: noise[k] = load('noise', k)
            elif key != 'type': walk_df(v)
    elif isinstance(o, list):
        for v in o: walk_df(v)
def walk_rule(o):
    if isinstance(o, str):
        k = o.replace('minecraft:', '')
        if k not in mrule: mrule[k] = None; mrule[k] = load('material_rule', k); walk_rule(mrule[k])
        return
    if isinstance(o, dict):
        t = o.get('type', '').replace('minecraft:', '')
        if t == 'condition': walk_cond(o['if_true']); walk_rule(o['then_run'])
        elif t == 'sequence':
            for r in o['sequence']: walk_rule(r)
        elif t == 'ore_vein':
            for k in ('density', 'filler_gap', 'richness'): walk_df(o[k])
def walk_cond(o):
    if isinstance(o, str):
        k = o.replace('minecraft:', '')
        if k not in mcond: mcond[k] = None; mcond[k] = load('material_condition', k); walk_cond(mcond[k])
        return
    if isinstance(o, dict):
        t = o.get('type', '').replace('minecraft:', '')
        if t == 'not': walk_cond(o['invert'])
        if t == 'noise_threshold':
            k = o['noise'].replace('minecraft:', '')
            if k not in noise: noise[k] = load('noise', k)
settings = {}
for s in ('overworld', 'amplified', 'large_biomes'):
    d = load('noise_settings', s)
    settings[s] = {k: d[k] for k in ('noise', 'noise_router', 'aquifers', 'sea_level', 'default_block', 'default_fluid', 'material_rule')}
    walk_df(d['noise_router']); walk_df(d['aquifers']); walk_rule(d['material_rule'])
# noises the material system reads directly
for k in ('surface', 'surface_secondary', 'clay_bands_offset', 'badlands_pillar', 'badlands_pillar_roof', 'badlands_surface', 'iceberg_pillar', 'iceberg_pillar_roof', 'iceberg_surface'):
    if k not in noise: noise[k] = load('noise', k)
biomes = {}
for f in sorted(os.listdir(os.path.join(W, 'biome'))):
    b = json.load(open(os.path.join(W, 'biome', f)))
    biomes[f[:-5]] = [b.get('temperature', 0.5), 1 if b.get('temperature_modifier') == 'frozen' else 0]
out = {'df': df, 'noise': noise, 'settings': settings, 'mrule': mrule, 'mcond': mcond, 'biomes': biomes}
js = ('// Minecraft 26.3 overworld worldgen data (density functions, noises, noise settings, material rules, biome climates),\n'
      '// packed by tools/mcterrain_pack.py from data/minecraft/worldgen. Used by 02e_mcterrain.js.\n'
      'const MCT_DATA = ' + json.dumps(out, separators=(',', ':')) + ';\n')
open(sys.argv[2], 'w').write(js)
print(len(df), 'density functions,', len(noise), 'noises,', len(mrule), 'rules,', len(mcond), 'conditions,', len(biomes), 'biomes,', len(js), 'bytes')

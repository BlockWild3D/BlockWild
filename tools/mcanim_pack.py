#!/usr/bin/env python3
"""Packs the owner's mob animations (one folder per mob: <mob>.geo.json, <mob>.animation.json, extra *.geo.json)
into src/js/02i_mcanim_data.js for 99zzzzzzzzzzz_mcmobanim.js.

usage: python3 -I tools/mcanim_pack.py "<Mob animation folder>" src/js/02i_mcanim_data.js

MCA[mob] = { g: geometry (bones), gb: baby geometry or absent, c: { clip: [len, loop, {bone: {r, p, s}}] } }
  geometry: [[name, parent index or -1, pivot[3], rotation[3] or 0, cubes [[ox,oy,oz, sx,sy,sz, inflate, rx,ry,rz, px,py,pz]], (legacy bind pose rotation, own cubes only)], ...]
  channel keys: flat [t, x, y, z, t, x, y, z, ...] (seconds; degrees / pixels / factor), linear in between.
Keys that a straight line through their neighbours already predicts are dropped (rotation 0.15 deg, position
0.02 px, scale 0.002). Combined clips get the head look-around sweep taken out (the game aims heads itself).
"""
import json, os, sys, glob

SRC, OUT = sys.argv[1], sys.argv[2]
TOL = {'r': 0.15, 'p': 0.02, 's': 0.002}
CH = {'rotation': 'r', 'position': 'p', 'scale': 's'}


def vec(v, ch):
    if isinstance(v, dict):  # {pre, post}: use post
        v = v.get('post', v.get('pre'))
    if isinstance(v, (int, float)):
        return [float(v)] * 3
    v = list(v) + [0, 0, 0]
    return [float(x) if isinstance(x, (int, float)) else (1.0 if ch == 's' else 0.0) for x in v[:3]]


def keys_of(val, ch):
    if isinstance(val, dict) and not ('pre' in val or 'post' in val):
        ks = sorted(((float(t), vec(v, ch)) for t, v in val.items()), key=lambda k: k[0])
    else:
        ks = [(0.0, vec(val, ch))]
    return ks


def sample(ks, t):
    if t <= ks[0][0]: return ks[0][1]
    if t >= ks[-1][0]: return ks[-1][1]
    for i in range(len(ks) - 1):
        a, b = ks[i], ks[i + 1]
        if a[0] <= t <= b[0]:
            u = (t - a[0]) / max(1e-9, b[0] - a[0])
            return [a[1][j] + (b[1][j] - a[1][j]) * u for j in range(3)]
    return ks[-1][1]


def simplify(ks, tol):
    if len(ks) <= 2:
        return ks
    out = [ks[0]]
    for i in range(1, len(ks) - 1):
        a, b, c = out[-1], ks[i], ks[i + 1]
        u = (b[0] - a[0]) / max(1e-9, c[0] - a[0])
        if any(abs(a[1][j] + (c[1][j] - a[1][j]) * u - b[1][j]) > tol for j in range(3)):
            out.append(b)
    out.append(ks[-1])
    if len(out) == 2 and all(abs(out[0][1][j] - out[1][1][j]) <= tol for j in range(3)):
        out = [out[0]]
    return out


def flat(ks):
    r = []
    for t, v in ks:
        r += [round(t, 3)] + [round(x, 2) if abs(x) >= 0.005 else 0 for x in v]
    return r


def geometry(path):
    g = json.load(open(path))
    geo = (g.get('minecraft:geometry') or [None])[0]
    if geo is None:  # old format: {"geometry.x": {bones}}
        geo = next(v for k, v in g.items() if k.startswith('geometry'))
    bones = geo.get('bones', [])
    idx = {b['name']: i for i, b in enumerate(bones)}
    out = []
    for b in bones:
        cubes = []
        for c in b.get('cubes', []):
            o, s = c.get('origin', [0, 0, 0]), c.get('size', [0, 0, 0])
            rot = c.get('rotation', [0, 0, 0]); piv = c.get('pivot', [o[0] + s[0] / 2, o[1] + s[1] / 2, o[2] + s[2] / 2])
            cubes.append([round(x, 3) for x in list(o) + list(s) + [c.get('inflate', 0)] + list(rot) + list(piv)])
        rot = b.get('rotation') or 0
        e = [b['name'], idx.get(b.get('parent'), -1), [round(x, 3) for x in b.get('pivot', [0, 0, 0])], rot if rot and any(rot) else 0, cubes]
        bp = b.get('bind_pose_rotation')  # legacy skeletons: turns the bone's own cubes only, not its children
        if bp and any(bp): e.append(bp)
        out.append(e)
    return out


# parts drawn from the owner's own skeleton (the game's models lay these out differently): bone name pattern + texture
OWN = {'blaze': ('upperBodyParts', 'blaze.tga'), 'guardian': ('spike', 'guardian.png'), 'elder_guardian': ('spike', 'elder_guardian.png'), 'vex': ('Wing', 'vex.png')}


def own_parts(folder, mob):
    import re, base64, io
    from PIL import Image
    pat, texname = OWN[mob]
    g = json.load(open(os.path.join(folder, mob + '.geo.json')))
    geo = (g.get('minecraft:geometry') or [None])[0] or next(v for k, v in g.items() if k.startswith('geometry'))
    d = geo.get('description', {})
    tw = d.get('texture_width') or geo.get('texturewidth') or 64; th = d.get('texture_height') or geo.get('textureheight') or 64
    uv = {}
    for b in geo['bones']:
        if re.search(pat, b['name']):
            uv[b['name']] = [[c.get('uv', [0, 0]), 1 if c.get('mirror', b.get('mirror')) else 0] for c in b.get('cubes', [])]
    im = Image.open(os.path.join(folder, texname)).convert('RGBA'); buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True)
    return {'re': pat, 'tw': tw, 'th': th, 'uv': uv, 'tex': 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()}


LOOKS = ['look_at_target_default', 'look_at_target', 'wolf_look_at', 'look_at', 'creeper_head']
MCA = {}
for d in sorted(os.listdir(SRC)):
    p = os.path.join(SRC, d)
    if not os.path.isdir(p):
        continue
    ap = os.path.join(p, d + '.animation.json')
    entry = {}
    if os.path.exists(os.path.join(p, d + '.geo.json')):
        entry['g'] = geometry(os.path.join(p, d + '.geo.json'))
    if os.path.exists(os.path.join(p, d + '_baby.geo.json')):
        entry['gb'] = geometry(os.path.join(p, d + '_baby.geo.json'))
    clips = {}
    if os.path.exists(ap):
        A = json.load(open(ap)).get('animations', {})
        raw = {}
        for k, v in A.items():
            name = k.split('.', 2)[2] if k.count('.') >= 2 else k
            ln = v.get('animation_length')
            loop = v.get('loop', False)
            ch = {}
            for bone, chans in (v.get('bones') or {}).items():
                for cn, val in chans.items():
                    if cn in CH:
                        ch.setdefault(bone, {})[CH[cn]] = keys_of(val, CH[cn])
            raw[name] = [ln, loop is True, ch]
        look = next((raw[n] for n in LOOKS if n in raw), None)
        for name, (ln, loop, ch) in raw.items():
            if name.startswith('combined_') and look:
                for bone, lc in look[2].items():
                    if bone in ch and 'r' in ch[bone] and 'r' in lc:
                        ks = ch[bone]['r']; L = look[0] or 4
                        ch[bone]['r'] = [(t, [v[j] - sample(lc['r'], t % L if L else 0)[j] for j in range(3)]) for t, v in ks]
            pack = {}
            for bone, cc in ch.items():
                for c, ks in cc.items():
                    ks = simplify(ks, TOL[c])
                    if c == 's' and all(abs(x - 1) < 0.002 for _, v in ks for x in v): continue
                    if c != 's' and all(abs(x) < TOL[c] for _, v in ks for x in v): continue
                    pack.setdefault(bone, {})[c] = flat(ks)
            clips[name] = [round(ln, 3) if isinstance(ln, (int, float)) else 0, 1 if loop is True else 0, pack]
    entry['c'] = clips
    if d in OWN:
        entry['own'] = own_parts(p, d)
    MCA[d] = entry

js = ('// ================= THE OWNER\'S MOB ANIMATIONS (data) =================\n'
      '// Packed by tools/mcanim_pack.py from the owner\'s "Mob animation" folders (Bedrock-style .geo.json skeletons +\n'
      '// .animation.json clips, keys at 20 per second). Played by 99zzzzzzzzzzz_mcmobanim.js.\n'
      'const MCA = ' + json.dumps(MCA, separators=(',', ':')) + ';\n')
open(OUT, 'w').write(js)
print('wrote', OUT, len(js), 'bytes,', len(MCA), 'mobs,', sum(len(e['c']) for e in MCA.values()), 'clips')

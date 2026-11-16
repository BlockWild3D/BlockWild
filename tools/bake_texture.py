#!/usr/bin/env python3
"""Bake a hand-drawn 16x16 picture into the game (src/js/00_paint.js).

  bake_texture.py icon <item_key> <picture.txt>      repaint an item, or give a new one its picture
  bake_texture.py tile <texture_name> <picture.txt>  repaint a block texture
  bake_texture.py custom '<json>'                    add or replace a new block / item / tool definition
  bake_texture.py remove icon|tile|custom <name>

picture: a .png file (any size; it is shrunk to 16x16 with hard pixel edges, transparency kept),
or a .txt with a "Palette:" line of letter=#rrggbb pairs, then 16 rows of 16 characters ('.' is see-through).
"""
import sys, json, re, base64, os
P = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'js', '00_paint.js')
src = open(P).read(); m = re.search(r'const PAINT_BAKED = (\{.*\});', src); data = json.loads(m.group(1))
def save(): open(P, 'w').write(src[:m.start(1)] + json.dumps(data, separators=(',', ':')) + src[m.end(1):])
def picture(path):
    if path.lower().endswith('.png'):
        from PIL import Image
        im = Image.open(path).convert('RGBA')
        if im.size != (16, 16):
            print('note: %dx%d picture shrunk to 16x16' % im.size, file=sys.stderr)
            im = im.resize((16, 16), Image.NEAREST)
        px = bytearray(im.tobytes())
        for i in range(0, len(px), 4):
            if px[i + 3] == 0: px[i:i + 3] = b'\0\0\0'
        return base64.b64encode(bytes(px)).decode()
    txt = open(path).read(); pal = dict((k, v) for k, v in re.findall(r'(\S)=#([0-9a-fA-F]{6})', txt))
    rows = [l for l in (x.strip() for x in txt.splitlines()) if len(l) == 16 and '=' not in l]
    if len(rows) != 16: sys.exit('need 16 rows of 16 characters, found %d' % len(rows))
    out = bytearray()
    for r in rows:
        for ch in r:
            if ch == '.': out += b'\0\0\0\0'
            elif ch in pal: out += bytes.fromhex(pal[ch]) + b'\xff'
            else: sys.exit('character %r is not in the palette' % ch)
    return base64.b64encode(bytes(out)).decode()
a = sys.argv[1:]
if a[0] == 'icon': data['icons'][a[1]] = picture(a[2])
elif a[0] == 'tile': data['tiles'][a[1]] = picture(a[2])
elif a[0] == 'custom': c = json.loads(a[1]); data['custom'] = [x for x in data['custom'] if x['key'] != c['key']] + [c]
elif a[0] == 'remove':
    if a[1] == 'custom': data['custom'] = [x for x in data['custom'] if x['key'] != a[2]]
    else: data[a[1] + 's'].pop(a[2], None)
save(); print('baked:', len(data['tiles']), 'tiles,', len(data['icons']), 'icons,', len(data['custom']), 'custom')

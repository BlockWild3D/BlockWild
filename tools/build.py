#!/usr/bin/env python3
"""Builds the single-file game (index.html) from src/shell.html + src/js/*.js + sounds/ (embedded as base64)."""
import glob, os, json, base64
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
shell = open(os.path.join(root, 'src', 'shell.html')).read()
snd = {}
idx_path = os.path.join(root, 'sounds', 'index.json')
if os.path.exists(idx_path):
    for name, files in json.load(open(idx_path)).items():
        snd[name] = [base64.b64encode(open(os.path.join(root, 'sounds', f), 'rb').read()).decode() for f in files]
js = 'const SOUND_DATA = ' + json.dumps(snd, separators=(',', ':')) + ';\n'
js += '\n'.join(open(f).read() for f in sorted(glob.glob(os.path.join(root, 'src', 'js', '*.js'))))
out = shell.replace('/*GAMEJS*/', js)
open(os.path.join(root, 'index.html'), 'w').write(out)
print('built index.html', len(out), 'bytes')

#!/usr/bin/env python3
"""Builds the single-file game (index.html) from src/shell.html + src/js/*.js."""
import glob, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
shell = open(os.path.join(root, 'src', 'shell.html')).read()
js = '\n'.join(open(f).read() for f in sorted(glob.glob(os.path.join(root, 'src', 'js', '*.js'))))
out = shell.replace('/*GAMEJS*/', js)
open(os.path.join(root, 'index.html'), 'w').write(out)
print('built index.html', len(out), 'bytes')

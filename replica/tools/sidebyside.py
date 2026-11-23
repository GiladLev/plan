#!/usr/bin/env python3
"""sidebyside.py <locale> <tag> [maxw]  -> /tmp/iplan-recon/sbs-<tag>.png : original | clone | diff (scaled)."""
import sys, os; from PIL import Image
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'pixel'); loc, tag = sys.argv[1], sys.argv[2]; maxw = int(sys.argv[3]) if len(sys.argv) > 3 else 700
paths = [os.path.join(root, 'screens/original', loc, tag + '.png'), os.path.join(root, 'screens/clone', loc, tag + '.png'), os.path.join(root, 'diff', loc, tag + '.png')]
ims = [Image.open(p).convert('RGB') for p in paths if os.path.exists(p)]
s = min(1.0, maxw / max(im.width for im in ims)); ims = [im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS) for im in ims]
H = max(im.height for im in ims); sheet = Image.new('RGB', (sum(im.width for im in ims) + 10 * (len(ims) - 1), H), (60, 60, 60)); x = 0
for im in ims: sheet.paste(im, (x, 0)); x += im.width + 10
out = f'/tmp/iplan-recon/sbs-{tag}.png'; sheet.save(out); print(out, sheet.size)

#!/usr/bin/env python3
"""montage.py out.png cellW files...  -> grid of full-page screenshots scaled to cellW wide, labelled."""
import sys; from PIL import Image, ImageDraw
out, cellw, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
imgs = []
for f in files:
    im = Image.open(f).convert('RGB'); s = cellw / im.width; im = im.resize((cellw, max(1, int(im.height * s))), Image.LANCZOS); imgs.append((f.split('/')[-1], im))
maxh = max(im.height for _, im in imgs); cols = min(len(imgs), max(1, 2400 // cellw)); rows = (len(imgs) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (cellw + 10), rows * (maxh + 24)), (40, 40, 40)); d = ImageDraw.Draw(sheet)
for i, (name, im) in enumerate(imgs):
    x, y = (i % cols) * (cellw + 10), (i // cols) * (maxh + 24); sheet.paste(im, (x, y + 20)); d.text((x + 2, y + 4), name, fill=(255, 255, 0))
sheet.save(out); print(out, sheet.size)

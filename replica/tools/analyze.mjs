// Aggregate design primitives across extracted pages -> pixel/extract/<locale>/_tokens.md
import fs from 'node:fs'; import path from 'node:path';
const locale = process.argv[2] || 'he-IL';
const dir = path.resolve(import.meta.dirname, '../pixel/extract', locale);
const files = fs.readdirSync(dir).filter(f => /@1440\.json$/.test(f));
const count = (m, k, pageId) => { if (!k) return; const e = m.get(k) || { n: 0, pages: new Set() }; e.n++; e.pages.add(pageId); m.set(k, e); };
const type = new Map(), colors = new Map(), bgs = new Map(), radii = new Map(), shadows = new Map(), trans = new Map(), borders = new Map(), fontsBySel = new Map(), containers = new Map(), letterSp = new Map();
const perVp = {};
for (const f of files) {
  const id = f.replace('@1440.json', ''); const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  for (const n of d.nodes) {
    const s = n.style;
    if (n.text || /^(h[1-6]|p|a|button|li|span|label|input|td|th|strong|small|div)$/.test(n.tag)) if (n.text) count(type, `${s['font-size']} / ${s['font-weight'] || '400'} / ${s['line-height'] || 'normal'} / ${(s['font-family'] || '').split(',')[0].replace(/"/g, '')}`, id);
    if (n.text) count(colors, s.color, id);
    if (s['background-color']) count(bgs, s['background-color'], id);
    if (s['border-top-left-radius']) count(radii, s['border-top-left-radius'], id);
    if (s['box-shadow']) count(shadows, s['box-shadow'], id);
    if (s['transition-duration'] && s['transition-duration'] !== '0s') count(trans, `${s['transition-property']} ${s['transition-duration']} ${s['transition-timing-function']}`, id);
    if (s['border-top-width'] && s['border-top-style'] && s['border-top-style'] !== 'none') count(borders, `${s['border-top-width']} ${s['border-top-style']} ${s['border-top-color']}`, id);
    if (n.text && s['letter-spacing']) count(letterSp, s['letter-spacing'], id);
    if (n.cls && /\bcontainer(-fluid)?\b/.test(n.cls)) count(containers, `${n.cls.match(/container(-fluid)?/)[0]} w=${n.rect.w} padL=${s['padding-left']} padR=${s['padding-right']}`, id);
  }
  // per-viewport container widths
  for (const w of [1440, 1024, 768, 390]) { const p = path.join(dir, `${id}@${w}.json`); if (!fs.existsSync(p)) continue; const dd = JSON.parse(fs.readFileSync(p, 'utf8')); const c = dd.nodes.find(n => n.cls && /\bcontainer\b/.test(n.cls)); const nav = dd.nodes.find(n => n.id === 'main_navigation'); perVp[w] = perVp[w] || new Map(); count(perVp[w], `container w=${c?.rect.w} nav h=${nav?.rect.h} scrollH=${dd.doc.scrollHeight} hscroll=${dd.doc.hasHScroll}`, id); }
}
const fmt = (m, top = 60) => [...m.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, top).map(([k, v]) => `| ${k} | ${v.n} | ${v.pages.size} |`).join('\n');
const md = `# Design primitives (${locale}, measured @1440 unless noted)\n\n## Typography (size / weight / line-height / family) — text nodes\n| combo | nodes | pages |\n|---|---|---|\n${fmt(type, 80)}\n\n## Text colors\n| color | nodes | pages |\n|---|---|---|\n${fmt(colors)}\n\n## Background colors\n| color | nodes | pages |\n|---|---|---|\n${fmt(bgs)}\n\n## Border radii\n| radius | nodes | pages |\n|---|---|---|\n${fmt(radii)}\n\n## Box shadows\n| shadow | nodes | pages |\n|---|---|---|\n${fmt(shadows)}\n\n## Borders\n| border | nodes | pages |\n|---|---|---|\n${fmt(borders)}\n\n## Transitions\n| transition | nodes | pages |\n|---|---|---|\n${fmt(trans)}\n\n## Letter spacing\n| ls | nodes | pages |\n|---|---|---|\n${fmt(letterSp)}\n\n## Containers @1440\n| container | nodes | pages |\n|---|---|---|\n${fmt(containers)}\n\n## Per viewport\n${Object.entries(perVp).map(([w, m]) => `### ${w}\n| metric | pages | n |\n|---|---|---|\n${[...m.entries()].map(([k, v]) => `| ${k} | ${[...v.pages].join(', ')} | ${v.n} |`).join('\n')}`).join('\n\n')}\n`;
fs.writeFileSync(path.join(dir, '_tokens.md'), md); console.log(md.slice(0, 6000));

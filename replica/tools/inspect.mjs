// Print the measured element tree (rect + key computed styles) for a page/viewport, optionally scoped.
// Usage: node inspect.mjs <page> [--w=1440] [--locale=he-IL] [--sel=<substring of tag/id/class/text>] [--depth=N] [--states] [--full]
// Examples: node inspect.mjs home --sel=section-hero          node inspect.mjs dir-1-venues --w=390 --sel=filters --depth=4
//           node inspect.mjs home --states   (hover/focus/active deltas)      node inspect.mjs home --state=nav-dropdown-0  (tree of an interaction capture)
import fs from 'node:fs'; import path from 'node:path';
const [id, ...rest] = process.argv.slice(2); const args = Object.fromEntries(rest.map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const locale = args.locale || 'he-IL', w = args.w || 1440; const root = path.resolve(import.meta.dirname, '../pixel/extract', locale);
const short = v => String(v).replace(/https:\/\/d2vawm7u8pr5bs\.cloudfront\.net\/assets\//g, 'cdn:').replace(/-[0-9a-f]{64}/g, '').replace(/https:\/\/iplan-uuc-production\.s3\.amazonaws\.com\//g, 's3:');
const KEY = /^(display|position|top|right|bottom|left|float|width|height|min-|max-|padding|margin|border|background|color|font-|line-height|letter-spacing|text-align|text-transform|text-decoration|white-space|box-shadow|transform|transition|opacity|z-index|overflow|flex|justify|align|gap|cursor|vertical-align|direction|object-fit)/;
const skip = /outline|background-(position|repeat|attachment|clip)$|border-(right|left|bottom)-color|-webkit/;
const fmtStyle = s => Object.entries(s).filter(([k]) => (args.full || KEY.test(k)) && !skip.test(k)).map(([k, v]) => `${k}:${short(v)}`).join('; ');
if (args.states) { const d = JSON.parse(fs.readFileSync(path.join(root, `${id}@${w}.json`), 'utf8')); for (const s of d.states || []) console.log(`${s.tag}${s.id ? '#' + s.id : ''}${s.cls ? '.' + s.cls.replace(/ +/g, '.') : ''} «${s.text}» ${JSON.stringify(s.rect)}\n   base ${JSON.stringify(s.base)}\n   hover ${JSON.stringify(s.hover)}\n   focus ${JSON.stringify(s.focus)}\n   active ${JSON.stringify(s.active)}`); process.exit(0); }
let nodes, doc;
if (args.state) { const d = JSON.parse(fs.readFileSync(path.join(root, 'states', `${id}@${w}.${args.state}.json`), 'utf8')); nodes = d.nodes; console.log('# state capture', args.state, 'selector', d.selector, 'png: pixel/extract/' + locale + '/states/' + `${id}@${w}.${args.state}.png`); }
else { const d = JSON.parse(fs.readFileSync(path.join(root, `${id}@${w}.json`), 'utf8')); nodes = d.nodes; doc = d.doc; console.log('# doc', JSON.stringify(doc)); console.log('# png: pixel/screens/original/' + locale + '/' + `${id}@${w}.png`); }
const byI = new Map(nodes.map(n => [n.i, n]));
const matches = n => !args.sel || [n.tag, n.id, n.cls, n.text].some(v => v && String(v).includes(args.sel));
const roots = args.sel ? nodes.filter(matches) : nodes.filter(n => n.d === 0);
const maxDepth = args.depth ? +args.depth : 99; const printed = new Set();
const print = (n, rel) => { if (printed.has(n.i) || rel > maxDepth) return; printed.add(n.i); const label = `${n.tag}${n.id ? '#' + n.id : ''}${n.cls ? '.' + n.cls.replace(/ +/g, '.') : ''}`; console.log(`${'  '.repeat(rel)}${label} [${n.rect.x},${n.rect.y} ${n.rect.w}x${n.rect.h}]${n.text ? ' «' + n.text + '»' : ''}${n.attrs ? ' ' + JSON.stringify(n.attrs) : ''}`); const st = fmtStyle(n.style); if (st) console.log(`${'  '.repeat(rel)}  {${st}}`); if (n.pseudo) for (const [k, v] of Object.entries(n.pseudo)) console.log(`${'  '.repeat(rel)}  ::${k.replace('::', '')} ${JSON.stringify(Object.fromEntries(Object.entries(v).filter(([kk, vv]) => vv && vv !== 'none' && vv !== 'auto' && vv !== 'normal' && vv !== 'rgba(0, 0, 0, 0)' && vv !== '0px none rgb(51, 51, 51)').map(([kk, vv]) => [kk, short(vv)])))}`); for (const c of nodes.filter(c => c.p === n.i)) print(c, rel + 1); };
roots.forEach(r => print(r, 0));

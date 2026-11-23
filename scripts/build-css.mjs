// Compiles the stylesheet twice: Bootstrap 3 (MIT, LTR-authored) and the iPlan theme layer (RTL-authored, measured from he-IL).
// Each is mirrored with rtlcss so both locales get a correct bundle: public/css/app-rtl.css (he-IL) and app-ltr.css (en-US).
import * as sass from 'sass';
import rtlcss from 'rtlcss';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const opts = { loadPaths: [path.join(root, 'node_modules/bootstrap-sass/assets/stylesheets'), path.join(root, 'styles')], style: 'compressed', silenceDeprecations: ['import', 'global-builtin', 'slash-div', 'color-functions', 'mixed-decls', 'abs-percent', 'function-units'], quietDeps: true, logger: sass.Logger.silent };
const bs = sass.compile(path.join(root, 'styles/bootstrap.scss'), opts).css; // LTR
const theme = sass.compile(path.join(root, 'styles/theme.scss'), opts).css; // RTL
const flip = (css) => rtlcss.process(css);
const out = path.join(root, 'public/css');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'app-rtl.css'), flip(bs) + '\n' + theme);
fs.writeFileSync(path.join(out, 'app-ltr.css'), bs + '\n' + flip(theme));
console.log('css: rtl', Math.round(fs.statSync(path.join(out, 'app-rtl.css')).size / 1024) + 'KB', 'ltr', Math.round(fs.statSync(path.join(out, 'app-ltr.css')).size / 1024) + 'KB');

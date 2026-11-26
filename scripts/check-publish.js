/**
 * Run before pushing:  npm run check:publish
 * Scans the project for things that should never reach GitHub (keys, secrets, emails, personal paths).
 * Add your own words to look for:  PRIVATE_TERMS="my real name,my school" npm run check:publish
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'vendor', 'market']);
const SKIP_FILES = new Set(['db.json', '.jwt-secret', '.data-key', 'package-lock.json']); // ignored by .gitignore anyway
const TEXT = /\.(js|json|md|html|css|svg|txt|yml|yaml|env|example|gitignore|gitattributes|editorconfig)$|^[^.]+$|^\.[a-z]+$/i;

const rules = [
  { name: 'private key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'secret assigned a real-looking value', re: /(JWT_SECRET|DATA_KEY)\s*=\s*['"]?[A-Za-z0-9+/=_-]{16,}/ },
  { name: 'email address', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/, allow: /example\.com|test\.io|noreply|@2x/ },
  { name: 'personal file path', re: /([A-Z]:\\Users\\|\/home\/[a-z][\w-]*\/|\/Users\/[A-Za-z])/ },
];
const terms = (process.env.PRIVATE_TERMS || '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);

const problems = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(p); continue; }
    if (SKIP_FILES.has(e.name) || !TEXT.test(e.name)) continue;
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const r of rules) { const m = line.match(r.re); if (m && !(r.allow && r.allow.test(line))) problems.push(`${path.relative(ROOT, p)}:${i + 1}  ${r.name}`); }
      for (const t of terms) if (line.toLowerCase().includes(t)) problems.push(`${path.relative(ROOT, p)}:${i + 1}  contains "${t}"`);
    });
  }
})(ROOT);

const ignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
for (const must of ['.env', 'data/db.json', 'data/.data-key', 'data/.jwt-secret', 'node_modules/', 'data/market/*']) if (!ignore.includes(must)) problems.push(`.gitignore is missing "${must}"`);

if (problems.length) { console.error('\n✖ Found things to fix before publishing:\n  ' + problems.join('\n  ') + '\n'); process.exit(1); }
console.log('✔ Nothing private found. Safe to commit.');

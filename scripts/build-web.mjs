// Zero-dependency build: strip TypeScript types with Node's own transform and
// emit plain ES modules into dist/. No npm install needed.
import { stripTypeScriptTypes } from 'node:module';
import { readFile, writeFile, mkdir, rm, copyFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const SRC = 'src';
const OUT = 'dist';
const ENTRIES = ['main', 'game', 'data', 'types'];

function rewrite(code) {
  return code
    .replace(/^\s*import\s+['"][^'"]+\.css['"];?\s*$/gm, '')
    .replace(/from\s+['"]\.\/([A-Za-z0-9_]+)['"]/g, "from './$1.js'");
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

for (const name of ENTRIES) {
  const ts = await readFile(path.join(SRC, `${name}.ts`), 'utf8');
  const js = stripTypeScriptTypes(rewrite(ts), { mode: 'transform' });
  await writeFile(path.join(OUT, `${name}.js`), js);
}

const html = await readFile('index.html', 'utf8');
const outHtml = html
  .replace('/src/main.ts', './main.js')
  .replace('/src/styles.css', './styles.css');
await writeFile(path.join(OUT, 'index.html'), outHtml);

await copyFile(path.join(SRC, 'styles.css'), path.join(OUT, 'styles.css'));
await copyFile('public/players.json', path.join(OUT, 'players.json'));

// Smoke test: the emitted game module must be importable and behave.
const game = await import(pathToFileURL(path.resolve(OUT, 'game.js')).href);
const dataset = JSON.parse(readFileSync('public/players.json', 'utf8'));
const [a, b] = dataset.players;
const r = game.compare(a, a, dataset.fields);
if (r.total !== dataset.fields.length || r.correct !== r.total) {
  throw new Error('self-comparison is not a win — compare() is broken');
}
const miss = dataset.players.filter((p) => dataset.fields.some((f) => p[f] == null));
if (miss.length) throw new Error(`${miss.length} player(s) missing a field: ${miss[0].id}`);

console.log(`dist/ built: ${ENTRIES.length} modules, fields=${dataset.fields.join(',')}`);
console.log(`players=${dataset.players.length}, smoke test OK (${a.id} vs ${b.id})`);

// ---- standalone.html: everything inlined, works by double-clicking ----------
function bundleOf(code) {
  return code
    .replace(/^import[^\n]*\n/gm, '')
    .replace(/^export\s+(?=(const|let|function|class|async))/gm, '');
}

const parts = ['game', 'data', 'main'].map((n) => bundleOf(readFileSync(path.join(OUT, `${n}.js`), 'utf8')));
const bundle = parts.join('\n\n');
new Function(bundle); // syntax check only

const css = readFileSync(path.join(SRC, 'styles.css'), 'utf8');
const standalone = outHtml
  .replace(/<link rel="stylesheet"[^>]*>/, `<style>\n${css}\n</style>`)
  .replace(
    /<script type="module" src="\.\/main\.js"><\/script>/,
    `<script>globalThis.__CSGUESS__ = ${JSON.stringify(dataset)};</script>\n    <script type="module">\n${bundle}\n    </script>`,
  );
if (standalone === outHtml || !standalone.includes('__CSGUESS__')) {
  throw new Error('standalone.html: could not inline the bundle');
}
await writeFile(path.join(OUT, 'standalone.html'), standalone);
console.log(`standalone.html written (${(standalone.length / 1024).toFixed(0)} KB, 双击即玩)`);

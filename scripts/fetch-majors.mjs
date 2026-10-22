// Discovery step: dump the Liquipedia "Majors" page so we can see how
// tournaments and champions are structured before writing a parser.
import { mkdir, writeFile } from 'node:fs/promises';
import { wikitext } from './lib/lp.mjs';

const text = await wikitext('Majors');
await mkdir('data/raw', { recursive: true });
await writeFile('data/raw/majors.wikitext', text, 'utf8');

const lines = text.split('\n');
console.log(`chars=${text.length} lines=${lines.length}`);

console.log('\n--- lines mentioning 2024-2026 ---');
for (const line of lines) {
  if (/202[4-6]/.test(line)) console.log(line.slice(0, 220));
}

console.log('\n--- first 1200 chars ---');
console.log(text.slice(0, 1200));

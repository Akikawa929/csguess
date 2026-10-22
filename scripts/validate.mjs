// Sanity checks for public/players.json — run before deploying.
import { readFile } from 'node:fs/promises';

const dataset = JSON.parse(await readFile('public/players.json', 'utf8'));
const players = dataset.players;
const fields = dataset.fields;
const errors = [];
const ROLES = new Set(['IGL', 'AWP', 'Entry', 'Support', 'Rifle']);
const KNOWN = new Set(['team', 'role', 'country', 'age', 'majors', 'majorsPlayed', 'firstMajor']);
const seen = new Set();

if (!Array.isArray(fields) || !fields.length) errors.push('missing fields list');
for (const f of fields ?? []) if (!KNOWN.has(f)) errors.push(`unknown field: ${f}`);
if (dataset.snapshot == null) errors.push('missing snapshot');

for (const p of players) {
  if (!p.id || typeof p.id !== 'string') errors.push(`bad id: ${JSON.stringify(p)}`);
  if (seen.has(p.id)) errors.push(`duplicate id: ${p.id}`);
  seen.add(p.id);
  if (!p.team) errors.push(`${p.id}: missing team`);
  if (!/^[a-z]{2}$/.test(p.country ?? '')) errors.push(`${p.id}: bad country "${p.country}"`);
  if (!p.countryName) errors.push(`${p.id}: missing countryName`);
  if (typeof p.majors !== 'number' || p.majors < 0 || p.majors > 10) errors.push(`${p.id}: bad majors ${p.majors}`);

  for (const f of fields ?? []) {
    const v = p[f];
    if (v == null) {
      errors.push(`${p.id}: field "${f}" advertised but missing`);
      continue;
    }
    if (f === 'age' && (typeof v !== 'number' || v < 15 || v > 60)) errors.push(`${p.id}: bad age ${v}`);
    if (f === 'role' && !ROLES.has(v)) errors.push(`${p.id}: bad role ${v}`);
    if (f === 'majorsPlayed' && (typeof v !== 'number' || v < 1 || v > 40)) errors.push(`${p.id}: bad majorsPlayed ${v}`);
    if (f === 'majors' && typeof v !== 'number') errors.push(`${p.id}: bad majors ${v}`);
    if (f === 'firstMajor' && (typeof v !== 'number' || v < 2013 || v > 2026)) {
      errors.push(`${p.id}: bad firstMajor ${v}`);
    }
  }
}

if (players.length < 100) errors.push(`only ${players.length} players, expected 150+`);

const played = players.map((p) => p.majorsPlayed).filter((n) => typeof n === 'number');
const avgPlayed = played.reduce((a, b) => a + b, 0) / (played.length || 1);

console.log(`players=${players.length} fields=${(fields ?? []).join(',')}`);
console.log(`teams=${new Set(players.map((p) => p.team)).size}`);
console.log(`countries=${new Set(players.map((p) => p.country)).size}`);
console.log(`with majors: ${players.filter((p) => p.majors > 0).length}`);
if (played.length) console.log(`avg majorsPlayed=${avgPlayed.toFixed(1)} range=${Math.min(...played)}..${Math.max(...played)}`);

if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  for (const e of errors.slice(0, 40)) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('\nOK');

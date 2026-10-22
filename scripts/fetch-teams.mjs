// Step 1: extract the 32 participating teams of the most recent completed Major
// (IEM Cologne Major 2026, 2026-06-02 .. 2026-06-21).
import { mkdir, writeFile } from 'node:fs/promises';
import { wikitext } from './lib/lp.mjs';

const MAJOR = 'Intel Extreme Masters/2026/Cologne';

const majorText = await wikitext(MAJOR);
const start = majorText.indexOf('Participants==');
const after = majorText.slice(start + 10);
const nextHeading = /\n==[^=]/.exec(after); // next level-2 heading, not ===sub===
const end = nextHeading ? start + 10 + nextHeading.index : majorText.length;
const section = majorText.slice(start, end);

const teams = [];
const re = /\{\{Opponent\|([^\n|}]+)/g;
let m;
while ((m = re.exec(section))) {
  const name = m[1].trim();
  if (name && !teams.includes(name)) teams.push(name);
}

await mkdir('data/raw', { recursive: true });
await writeFile('data/teams.json', JSON.stringify({ major: MAJOR, teams }, null, 2));

console.log(`teams=${teams.length}`);
console.log(teams.join(' | '));

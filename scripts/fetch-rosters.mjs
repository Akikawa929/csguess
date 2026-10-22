// Step 2: build the player pool from the most recent completed Major
// (IEM Cologne Major 2026 participants). Works entirely off the cached page.
//
// We deliberately take TEAMS from the Major and CURRENT data (team, active status)
// from each player's own Liquipedia infobox later — that keeps the pool stable and
// famous while the displayed team stays fresh.
import { readFile, writeFile } from 'node:fs/promises';
import { wikitext } from './lib/lp.mjs';
import { extractTemplates, parseParams } from './lib/parse.mjs';

const MAJOR = 'Intel Extreme Masters/2026/Cologne';
const text = await wikitext(MAJOR);

const start = text.indexOf('Participants==');
const after = text.slice(start + 10);
const nextHeading = /\n==[^=]/.exec(after);
const end = nextHeading ? start + 10 + nextHeading.index : text.length;
const section = text.slice(start, end);

const rosters = [];
for (const inner of extractTemplates(section, 'Opponent')) {
  const opp = parseParams(inner);
  const team = (opp._positional[0] || '').trim();
  if (!team) continue;

  const playersBlock = opp.players || '';
  const players = [];
  for (const pInner of extractTemplates(playersBlock, 'Person')) {
    const p = parseParams(pInner);
    const id = p.id || p._positional[0];
    if (!id) continue;
    if ((p.role || '').toLowerCase().includes('coach')) continue;
    if ((p.status || '').toLowerCase() === 'sub') continue;
    if (p.played === 'false') continue;
    players.push({ id: id.trim(), flag: p.flag || null });
  }

  rosters.push({ team, players });
}

const total = rosters.reduce((n, r) => n + r.players.length, 0);
await writeFile(
  'data/rosters.json',
  JSON.stringify({ major: MAJOR, sourceDate: '2026-06-02/2026-06-21', rosters }, null, 2),
);

console.log(`teams=${rosters.length} players=${total}`);
for (const r of rosters) console.log(`${r.team}: ${r.players.map((p) => p.id).join(', ')}`);

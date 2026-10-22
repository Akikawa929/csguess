// Extract the per-player medal table (gold = major wins) from Liquipedia.
import { writeFile } from 'node:fs/promises';
import { wikitext } from './lib/lp.mjs';

const targets = [
  ['Majors/Player Statistics', 'player-stats'],
  ['Majors/Player Database', 'player-db'],
];

for (const [page, file] of targets) {
  const text = await wikitext(page);
  await writeFile(`data/raw/${file}.wikitext`, text, 'utf8');
  const idx = text.indexOf('Player Medals');
  console.log(`\n### ${page} len=${text.length} "Player Medals"@${idx}`);
  if (idx >= 0) console.log(text.slice(idx, idx + 1400));
}

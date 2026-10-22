// Inspect how a team page stores its current active roster.
import { wikitext } from './lib/lp.mjs';

const text = await wikitext('Team Vitality');
console.log('len', text.length);
console.log(text.slice(0, 900));

for (const marker of ['Player Roster', '{{Team roster', 'players=']) {
  const i = text.indexOf(marker);
  console.log(`\n---- ${marker} @${i} ----`);
  if (i >= 0) console.log(text.slice(i, i + 900));
}

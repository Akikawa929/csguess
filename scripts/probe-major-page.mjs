// Inspect the two 2026 Majors: dates + participant list structure.
import { wikitext } from './lib/lp.mjs';

const pages = [
  'Intel Extreme Masters/2026/Cologne',
  'PGL/2026/Singapore',
];

for (const page of pages) {
  const text = await wikitext(page);
  console.log(`\n######## ${page}  len=${text.length}`);
  console.log(text.slice(0, 1500));
  const idx = text.indexOf('Participants');
  if (idx >= 0) {
    console.log(`\n---- Participants @${idx} ----`);
    console.log(text.slice(idx, idx + 900));
  }
}

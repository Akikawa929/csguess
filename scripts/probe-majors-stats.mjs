// Probe the Majors sub-pages to see which one carries per-player win counts.
import { wikitext } from './lib/lp.mjs';

const pages = ['Majors/Team Statistics', 'Majors/Player Statistics', 'Majors/Player Database'];

for (const p of pages) {
  try {
    const t = await wikitext(p);
    console.log(`\n### ${p}  chars=${t.length}`);
    console.log(t.slice(0, 900));
  } catch (err) {
    console.log(`\n### ${p}  ERROR: ${err.message}`);
  }
}

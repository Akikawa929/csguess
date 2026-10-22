// Find the most recent Majors via the navigation template.
import { wikitext } from './lib/lp.mjs';

const text = await wikitext('Template:Majors Navbox');
console.log('len', text.length);
for (const line of text.split('\n')) {
  if (/202[4-6]/.test(line)) console.log(line.slice(0, 300));
}

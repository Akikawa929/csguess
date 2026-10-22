// Step 3: pull each player's infobox (section 0 only = tiny payload).
// 160 players -> 4 batched requests. Raw responses cached under data/raw/.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { query } from './lib/lp.mjs';

const BATCH = 50;

export async function fetchPlayers() {
  const rosters = JSON.parse(await readFile('data/rosters.json', 'utf8'));
  const ids = [...new Set(rosters.rosters.flatMap((r) => r.players.map((p) => p.id)))];

  const pages = {};
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const json = await query(
      {
        titles: batch.join('|'),
        prop: 'revisions',
        rvprop: 'content',
        rvslots: 'main',
        rvsection: '0',
        redirects: '1',
      },
      { key: `players-${String(i).padStart(3, '0')}` },
    );

    const list = json?.query?.pages ?? [];
    const arr = Array.isArray(list) ? list : Object.values(list);
    for (const page of arr) {
      if (page.missing) {
        console.error(`missing page: ${page.title}`);
        continue;
      }
      const rev = page.revisions?.[0];
      const text = rev?.slots?.main?.['*'] ?? rev?.slots?.main?.content ?? rev?.['*'] ?? '';
      pages[page.title] = text;
    }
    console.error(`fetched ${i + batch.length}/${ids.length}`);
  }

  await writeFile('data/players-raw.json', JSON.stringify({ ids, pages }, null, 2));
  console.error(`saved ${Object.keys(pages).length} pages`);
  return pages;
}

if (import.meta.url === pathToFileURL(path.resolve(process.argv[1] ?? '')).href) {
  await fetchPlayers();
}

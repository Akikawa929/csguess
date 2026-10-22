// Liquipedia is IP-blocked for us (HTTP 429 since 2026-10-21), so pull the
// player infoboxes from the Wayback Machine's snapshots of the same pages
// instead. Raw HTML goes to data/raw/archive/ (git-ignored); parse-archive.mjs
// turns it into the small data/infobox.json that IS committed.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'data/raw/archive');
const MANIFEST = path.join(OUT, 'manifest.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const CONCURRENCY = 1;
const GAP_MS = 2000;

mkdirSync(OUT, { recursive: true });
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
const save = () => writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function grab(id) {
  const file = path.join(OUT, `${id}.html`);
  if (existsSync(file) && readFileSync(file, 'utf8').includes('fo-nttax-infobox')) {
    return { id, ok: true, cached: true, bytes: 0 };
  }
  for (let attempt = 1; attempt <= 4; attempt++) {
    const url = `https://web.archive.org/web/2026id_/https://liquipedia.net/counterstrike/${encodeURIComponent(id)}`;
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(90_000) });
      const body = await res.text();
      if (res.status === 200 && body.includes('fo-nttax-infobox')) {
        writeFileSync(file, body);
        return { id, ok: true, bytes: body.length, snapshot: res.url.match(/\/web\/(\d{14})/)?.[1] ?? null };
      }
      if (res.status === 404 || /Page cannot be displayed|not archived|Wayback Machine has not archived/i.test(body)) {
        return { id, ok: false, error: `not-archived (${res.status})` };
      }
      if (res.status === 429 || res.status === 503 || res.status === 403) {
        // archive.org throttles hard; back off and keep the attempt budget.
        await sleep(45_000);
        continue;
      }
      if (attempt === 4) return { id, ok: false, error: `status ${res.status}` };
    } catch (err) {
      if (attempt === 4) return { id, ok: false, error: String(err.cause?.code ?? err.message) };
    }
    await sleep(4000 * attempt);
  }
  return { id, ok: false, error: 'unreachable' };
}

const ids = JSON.parse(readFileSync(path.join(ROOT, 'data/rosters.json'), 'utf8')).rosters.flatMap((r) => r.players.map((p) => p.id));
const limitArg = process.argv.indexOf('--limit');
const onlyArg = process.argv.indexOf('--only');
let todo = ids;
if (onlyArg > -1) todo = process.argv[onlyArg + 1].split(',').map((s) => s.trim()).filter(Boolean);
else if (limitArg > -1) todo = ids.slice(0, Number(process.argv[limitArg + 1]));

console.log(`fetching ${todo.length} of ${ids.length} players from web.archive.org (concurrency ${CONCURRENCY})`);
const started = Date.now();
let done = 0;
const queue = [...todo];
async function worker(n) {
  while (queue.length) {
    const id = queue.shift();
    const res = await grab(id);
    manifest[id] = { ...(manifest[id] ?? {}), ...res, at: new Date().toISOString() };
    done++;
    if (manifest[id].cached) console.log(`[${done}/${todo.length}] ${id.padEnd(18)} archived`);
    else if (manifest[id].ok) console.log(`[${done}/${todo.length}] ${id.padEnd(18)} ok ${Math.round(manifest[id].bytes / 1024)}KB snap=${manifest[id].snapshot}`);
    else console.log(`[${done}/${todo.length}] ${id.padEnd(18)} FAIL ${manifest[id].error}`);
    save();
    await sleep(GAP_MS);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));
const ok = todo.filter((id) => manifest[id]?.ok).length;
console.log(`\ndone: ${ok}/${todo.length} ok in ${Math.round((Date.now() - started) / 1000)}s`);
save();

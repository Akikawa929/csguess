// Liquipedia has been IP-blocked for us since 2026-10-21 (HTTP 429), so pull the
// player infoboxes from the Wayback Machine's snapshots of the same pages instead.
// Raw HTML goes to data/raw/archive/ (git-ignored); parse-archive.mjs turns it
// into the small data/infobox.json that IS committed.
//
// archive.org throttles aggressively, so every request goes through one global
// gate (REQ_GAP_MS) and a 429/503 pauses the whole run instead of hammering on.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'data/raw/archive');
const MANIFEST = path.join(OUT, 'manifest.json');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const REQ_GAP_MS = 7000;
const THROTTLE_PAUSE_MS = 25_000;
// The Major ran 2026-06-02..06-21; ask for the capture nearest its end.
const WANT = '20260605';

mkdirSync(OUT, { recursive: true });
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
const save = () => writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isGood = (body) => body.includes('fo-nttax-infobox');
const pageOf = (id) => `https://liquipedia.net/counterstrike/${encodeURIComponent(id)}`;

let lastReq = 0;
async function request(url, timeout = 90_000) {
  const wait = REQ_GAP_MS - (Date.now() - lastReq);
  if (wait > 0) await sleep(wait);
  lastReq = Date.now();
  const res = await fetch(url, {
    headers: { 'user-agent': UA, 'accept-encoding': 'gzip' },
    signal: AbortSignal.timeout(timeout),
  });
  return { status: res.status, body: await res.text(), url: res.url };
}

async function replay(id, stamp, file) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const r = await request(`https://web.archive.org/web/${stamp}id_/${pageOf(id)}`);
      if (r.status === 200 && isGood(r.body)) {
        writeFileSync(file, r.body);
        return { id, ok: true, bytes: r.body.length, snapshot: r.url.match(/\/web\/(\d{14})/)?.[1] ?? null };
      }
      if (r.status === 404) return null;
      if (r.status === 429 || r.status === 503 || r.status === 403 || r.status >= 500) {
        await sleep(THROTTLE_PAUSE_MS);
        continue;
      }
      return null;
    } catch {
      await sleep(15_000);
    }
  }
  return null;
}

async function grab(id) {
  const file = path.join(OUT, `${id}.html`);
  if (existsSync(file) && isGood(readFileSync(file, 'utf8'))) return { id, ok: true, cached: true, bytes: 0 };

  // 1. nearest capture to the end of the Major
  const direct = await replay(id, WANT, file);
  if (direct) return direct;

  // 2. let the availability API pick one, then 3. walk the CDX list, newest first
  try {
    const r = await request(
      `https://archive.org/wayback/available?url=${encodeURIComponent(pageOf(id))}&timestamp=${WANT}`,
    );
    if (r.status === 200) {
      const ts = JSON.parse(r.body).archived_snapshots?.closest?.timestamp;
      if (ts) {
        const got = await replay(id, ts, file);
        if (got) return got;
      }
    }
  } catch {
    /* ignore, CDX below may still help */
  }

  try {
    const r = await request(
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(pageOf(id))}&from=20250101&filter=statuscode:200&fl=timestamp&limit=-3`,
    );
    if (r.status === 200) {
      for (const ts of r.body.split('\n').map((s) => s.trim()).filter(Boolean).reverse()) {
        const got = await replay(id, ts, file);
        if (got) return got;
      }
    }
  } catch {
    /* nothing left to try */
  }

  return { id, ok: false, error: 'no usable snapshot' };
}

const ids = JSON.parse(readFileSync(path.join(ROOT, 'data/rosters.json'), 'utf8')).rosters.flatMap((r) =>
  r.players.map((p) => p.id),
);
const limitArg = process.argv.indexOf('--limit');
const onlyArg = process.argv.indexOf('--only');
let todo = ids;
if (onlyArg > -1) todo = process.argv[onlyArg + 1].split(',').map((s) => s.trim()).filter(Boolean);
else if (limitArg > -1) todo = ids.slice(0, Number(process.argv[limitArg + 1]));

console.log(`fetching ${todo.length} of ${ids.length} players from web.archive.org (gap ${REQ_GAP_MS}ms)`);
const started = Date.now();
let done = 0;

for (const id of todo) {
  const res = await grab(id);
  manifest[id] = { ...(manifest[id] ?? {}), ...res, at: new Date().toISOString() };
  done++;
  const tag = manifest[id].cached
    ? 'archived'
    : manifest[id].ok
      ? `ok ${Math.round(manifest[id].bytes / 1024)}KB snap=${manifest[id].snapshot}`
      : `FAIL ${manifest[id].error}`;
  const elapsed = Math.round((Date.now() - started) / 1000);
  console.log(`[${done}/${todo.length}] ${id.padEnd(18)} ${tag} (${elapsed}s)`);
  save();
}

const ok = todo.filter((id) => manifest[id]?.ok).length;
console.log(`\ndone: ${ok}/${todo.length} ok in ${Math.round((Date.now() - started) / 1000)}s`);
save();

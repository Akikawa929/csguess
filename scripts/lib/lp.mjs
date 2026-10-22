// Liquipedia Counter-Strike API helper.
// - respects Liquipedia's "<= 1 request / 2s" limit
// - caches every successful response under data/raw/ so re-runs are free
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const API = 'https://liquipedia.net/counterstrike/api.php';
const UA = 'CSGuessBot/0.1 (local dev; contact: n/a)';
const CACHE_DIR = path.resolve('data/raw');
const MIN_GAP_MS = 2100;

let lastCall = 0;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function throttle() {
  const wait = lastCall + MIN_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
}

async function readCache(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

export async function lp(params, { key, maxRetries = 5 } = {}) {
  const url = new URL(API);
  for (const [k, v] of Object.entries({ format: 'json', formatversion: '2', ...params })) {
    url.searchParams.set(k, String(v));
  }

  const file = key ? path.join(CACHE_DIR, `${key}.json`) : null;
  if (file) {
    const hit = await readCache(file);
    if (hit) return hit;
  }

  let lastErr;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    await throttle();
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
      });
      if (res.status === 429) {
        lastErr = new Error('HTTP 429 rate limited');
        // Liquipedia blocks the IP for a while once you trip the limit: back off hard.
        const backoff = Math.min(30_000 * 2 ** (attempt - 1), 180_000);
        console.error(`429, sleeping ${Math.round(backoff / 1000)}s (attempt ${attempt}/${maxRetries})`);
        await sleep(backoff);
        continue;
      }
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status} for ${url}`);
        if (res.status < 500) throw lastErr;
        continue;
      }
      const json = await res.json();
      if (file) {
        await mkdir(CACHE_DIR, { recursive: true });
        await writeFile(file, JSON.stringify(json));
      }
      return json;
    } catch (err) {
      lastErr = err;
      await sleep(1500 * attempt);
    }
  }
  throw lastErr ?? new Error('Liquipedia request failed');
}

export function cacheKey(name) {
  return name.replace(/[^\w.-]+/g, '_');
}

/** Raw wikitext of a page (follows redirects). */
export async function wikitext(page, { key } = {}) {
  const json = await lp(
    { action: 'parse', page, prop: 'wikitext', redirects: '1' },
    { key: key ?? `page-${cacheKey(page)}` },
  );
  if (json?.error) throw new Error(`Liquipedia ${json.error.code}: ${json.error.info}`);
  return json.parse.wikitext;
}

/** Batch query: returns { pages: [...] } with wikitext or infobox-only sections. */
export async function query(params, { key } = {}) {
  const json = await lp({ action: 'query', ...params }, { key });
  if (json?.error) throw new Error(`Liquipedia ${json.error.code}: ${json.error.info}`);
  return json;
}

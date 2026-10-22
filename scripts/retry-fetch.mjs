// Waits out Liquipedia's rate-limit ban, then fetches all player infoboxes.
// Polls with a cheap siteinfo request every 5 minutes (no hammering).
import { fetchPlayers } from './fetch-players.mjs';

const UA = 'CSGuessBot/0.1 (local dev; contact: n/a)';
const PROBE = 'https://liquipedia.net/counterstrike/api.php?action=query&meta=siteinfo&format=json';
const MAX_TRIES = 72; // 72 * 5min = 6h
const WAIT_MS = 5 * 60 * 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function probe() {
  try {
    const res = await fetch(PROBE, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    return res.status;
  } catch (err) {
    return `ERR ${err.message}`;
  }
}

for (let i = 1; i <= MAX_TRIES; i++) {
  const status = await probe();
  const stamp = new Date().toISOString();
  if (status === 200) {
    console.log(`[${stamp}] unblocked, fetching players...`);
    await fetchPlayers();
    console.log(`[${stamp}] done`);
    process.exit(0);
  }
  console.log(`[${stamp}] try ${i}/${MAX_TRIES}: status=${status}, waiting 5min`);
  await sleep(WAIT_MS);
}

console.error('gave up: still rate limited');
process.exit(1);

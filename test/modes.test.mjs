// Mode + persistence behaviour: daily round survives a reload, endless mode
// remembers its round/stats and keeps going after a loss or a win.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { makeDom } from './dom.mjs';

const dataset = JSON.parse(readFileSync('public/players.json', 'utf8'));
const MAIN = pathToFileURL(path.resolve('dist/main.js')).href;
const DAY = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => void store.set(k, String(v)),
  removeItem: (k) => void store.delete(k),
};
globalThis.__CSGUESS__ = dataset;

function boot(version) {
  const dom = makeDom();
  globalThis.document = dom.document;
  return import(`${MAIN}?v=${version}`).then(() => new Promise((r) => setTimeout(r, 0))).then(() => dom);
}

const first = await boot(1);
const input = first.ids.get('guess-input');
const submit = (name) => {
  input.value = name;
  first.ids.get('guess-form').handlers.submit({ preventDefault() {} });
};
const filled = (dom) =>
  dom.ids.get('board').children.filter((r) => !r.className.includes('row-empty'));

test('daily guesses are stored under a per-day key', () => {
  submit('ZywOo');
  const raw = store.get(`csguess:daily:${DAY}`);
  assert.ok(raw, 'daily key written');
  assert.deepEqual(JSON.parse(raw).ids, ['ZywOo']);
});

test('endless mode persists its round and stats', () => {
  first.ids.get('mode-infinite').handlers.click({});
  assert.equal(JSON.parse(store.get('csguess:mode')), 'infinite');

  for (const p of dataset.players) {
    if (input.disabled) break;
    submit(p.id);
  }
  assert.equal(input.disabled, true);

  const saved = JSON.parse(store.get('csguess:infinite'));
  assert.equal(saved.round, 1);
  assert.ok(saved.ids.length > 0);
  assert.ok(saved.seen.includes(saved.answerId));

  first.ids.get('next-btn').handlers.click({});
  assert.equal(JSON.parse(store.get('csguess:infinite')).round, 2);
  assert.equal(filled(first).length, 0);
});

test('a reload keeps the endless round going', async () => {
  const second = await boot(2);
  assert.equal(second.ids.get('stats').hidden, false);
  assert.match(second.ids.get('stats').textContent, /第 2 题/);
  assert.equal(filled(second).length, 0);
  assert.equal(second.ids.get('guess-input').disabled, false);
});

test('switching back to daily restores the saved guesses', async () => {
  const third = await boot(3);
  third.ids.get('mode-daily').handlers.click({});
  const rows = filled(third);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].children[0].textContent, 'ZywOo');
});

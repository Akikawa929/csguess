// Integration smoke test: run the real UI modules against a tiny fake DOM.
// Verifies boot() + a full guess (compare -> render -> win/lose) without a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { makeDom } from './dom.mjs';

const dataset = JSON.parse(readFileSync('public/players.json', 'utf8'));
const { ids, document } = makeDom();
globalThis.document = document;
globalThis.__CSGUESS__ = dataset;

const UI = pathToFileURL(path.resolve('dist/main.js')).href;
const game = await import(pathToFileURL(path.resolve('dist/game.js')).href);
await import(UI);
await new Promise((r) => setTimeout(r, 0));

const board = ids.get('board');
const input = ids.get('guess-input');
const form = ids.get('guess-form');
const hint = ids.get('hint');

function guess(name) {
  input.value = name;
  form.handlers.submit({ preventDefault() {} });
}

function filledRows() {
  return board.children.filter((r) => !r.className.includes('row-empty'));
}

test('boot renders the header and eight guess rows', () => {
  const head = ids.get('grid-head');
  assert.equal(head.children.length, dataset.fields.length + 1);
  assert.equal(head.children[0].textContent, '选手');
  assert.equal(head.children[1].textContent, '战队');
  assert.equal(board.children.length, 8, 'eight attempts per round');
  for (const row of board.children) assert.equal(row.children.length, dataset.fields.length + 1);
  assert.equal(ids.get('stats').hidden, true, 'stats only show in endless mode');
  assert.equal(ids.get('next-btn').hidden, true);
});

test('a guess renders colored cells with the guessed nickname', () => {
  guess('ZywOo');
  const filled = filledRows();
  assert.equal(filled.length, 1);
  const row = filled[0];
  assert.equal(row.children[0].textContent, 'ZywOo');
  for (const cell of row.children.slice(1)) {
    assert.match(cell.className, /hit-(correct|close|wrong)/);
  }
});

test('unknown nicknames are rejected with a hint, not a crash', () => {
  guess('zzzznotaplayer');
  assert.match(hint.textContent, /没有找到/);
});

test('eight guesses end the daily round', () => {
  const used = new Set(['ZywOo']);
  for (const p of dataset.players) {
    if (input.disabled) break;
    if (used.has(p.id)) continue;
    guess(p.id);
    used.add(p.id);
  }
  assert.equal(input.disabled, true);
  assert.equal(ids.get('result').hidden, false);
  assert.equal(ids.get('next-btn').hidden, true, 'daily mode has no next button');
});

test('endless mode plays a round, then offers the next one', () => {
  ids.get('mode-infinite').handlers.click({});
  const stats = ids.get('stats');
  const next = ids.get('next-btn');
  assert.equal(stats.hidden, false);
  assert.match(stats.textContent, /第 1 题/);

  for (const p of dataset.players) {
    if (input.disabled) break;
    guess(p.id);
  }
  assert.equal(input.disabled, true);
  assert.equal(next.hidden, false);

  next.handlers.click({});
  assert.equal(input.disabled, false);
  assert.equal(filledRows().length, 0, 'a fresh round clears the board');
  assert.match(stats.textContent, /第 2 题/);
  assert.equal(next.hidden, true);
});

test('game module still agrees with the rendered result', () => {
  const [a] = dataset.players;
  const r = game.compare(a, a, dataset.fields);
  assert.ok(game.isWin(r));
});

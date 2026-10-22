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

test('boot renders the header from the dataset fields', () => {
  const head = ids.get('grid-head');
  assert.equal(head.children.length, dataset.fields.length + 1);
  assert.equal(head.children[0].textContent, '选手');
  assert.equal(head.children[1].textContent, '战队');
  assert.equal(board.children.length, 6);
  for (const row of board.children) assert.equal(row.children.length, dataset.fields.length + 1);
});

test('a wrong guess renders colored cells and keeps the turn', () => {
  const before = board.children.filter((r) => !r.className.includes('row-empty')).length;
  input.value = 'ZywOo';
  form.handlers.submit({ preventDefault() {} });
  const filled = board.children.filter((r) => !r.className.includes('row-empty'));
  assert.equal(filled.length, before + 1);
  const row = filled[filled.length - 1];
  assert.equal(row.children[0].textContent, 'ZywOo');
  for (const cell of row.children.slice(1)) {
    assert.match(cell.className, /hit-(correct|close|wrong)/);
  }
  assert.match(hint.textContent, /还剩 \d 次机会/);
});

test('unknown nicknames are rejected with a hint, not a crash', () => {
  input.value = 'zzzznotaplayer';
  form.handlers.submit({ preventDefault() {} });
  assert.match(hint.textContent, /没有找到/);
});

test('six guesses end the game', () => {
  const rest = dataset.players.slice(0, 6).map((p) => p.id);
  for (const id of rest) {
    input.value = id;
    form.handlers.submit({ preventDefault() {} });
    if (input.disabled) break;
  }
  assert.equal(input.disabled, true);
  assert.ok(ids.get('result').hidden === false);
});

test('game module still agrees with the rendered result', () => {
  const [a] = dataset.players;
  const r = game.compare(a, a, dataset.fields);
  assert.ok(game.isWin(r));
});

// The standalone build is the artefact people double-click, so verify the
// inlined bundle actually boots and plays — no browser, no server, no fetch.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';
import { makeDom } from './dom.mjs';

const html = readFileSync('dist/standalone.html', 'utf8');
const dataAt = html.indexOf('globalThis.__CSGUESS__ = ');
const dataEnd = html.indexOf(';</script>', dataAt);
const bundleAt = html.lastIndexOf('<script type="module">');
const bundleEnd = html.lastIndexOf('</script>');
assert.ok(dataAt > 0 && bundleAt > dataAt, 'standalone.html is missing its inline scripts');

const dataCode = html.slice(dataAt, dataEnd + 1);
const bundleCode = html.slice(bundleAt + '<script type="module">'.length, bundleEnd);

const { ids, document } = makeDom();
globalThis.document = document;
globalThis.fetch = () => {
  throw new Error('standalone build must not fetch players.json');
};

runInThisContext(dataCode, { filename: 'standalone:data' });
runInThisContext(bundleCode, { filename: 'standalone:bundle' });
await new Promise((r) => setTimeout(r, 0));

const dataset = globalThis.__CSGUESS__;

test('standalone bundle boots from inlined data (no fetch)', () => {
  const head = ids.get('grid-head');
  assert.equal(head.children.length, dataset.fields.length + 1);
  assert.equal(ids.get('board').children.length, 8);
  assert.doesNotMatch(ids.get('hint').textContent, /失败/);
});

test('standalone bundle plays a guess through the real UI', () => {
  const form = ids.get('guess-form');
  const input = ids.get('guess-input');
  const board = ids.get('board');
  input.value = dataset.players[0].id;
  form.handlers.submit({ preventDefault() {} });
  const filled = board.children.filter((r) => !r.className.includes('row-empty'));
  assert.equal(filled.length, 1);
  assert.equal(filled[0].children.length, dataset.fields.length + 1);
});

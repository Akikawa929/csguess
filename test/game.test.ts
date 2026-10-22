import test from 'node:test';
import assert from 'node:assert/strict';
import { compare, isWin } from '../src/game.ts';
import type { FieldId, Player } from '../src/types.ts';

const ALL: FieldId[] = ['team', 'role', 'country', 'age', 'majors', 'majorsPlayed', 'firstMajor'];

const base = (over: Partial<Player> = {}): Player => ({
  id: 'x',
  team: 'Team Vitality',
  teamRegion: 'EU',
  country: 'fr',
  countryName: '法国',
  region: 'EU',
  majors: 2,
  majorsPlayed: 10,
  firstMajor: 2019,
  age: 25,
  role: 'AWP',
  formerTeams: [],
  ...over,
});

test('all correct fields is a win', () => {
  const p = base({ id: 'ZywOo' });
  const r = compare(p, p, ALL);
  assert.equal(r.total, 7);
  assert.equal(r.correct, 7);
  assert.ok(isWin(r));
});

test('only the advertised fields take part', () => {
  const r = compare(base({ id: 'a' }), base({ id: 'b' }), ['team', 'country']);
  assert.equal(r.total, 2);
  assert.deepEqual(Object.keys(r.fields).sort(), ['country', 'team']);
});

test('team: same team green, same region yellow, else red', () => {
  const answer = base({ team: 'MOUZ', teamRegion: 'EU' });
  assert.equal(compare(base({ team: 'MOUZ' }), answer, ALL).fields.team?.hit, 'correct');
  assert.equal(compare(base({ team: 'G2 Esports' }), answer, ALL).fields.team?.hit, 'close');
  assert.equal(
    compare(base({ team: 'FURIA', teamRegion: 'SA' }), answer, ALL).fields.team?.hit,
    'wrong',
  );
});

test('team: former team of the answer turns yellow', () => {
  const answer = base({ team: 'Team Falcons', teamRegion: 'ME', formerTeams: ['G2 Esports'] });
  const guess = base({ team: 'G2 Esports', teamRegion: 'EU' });
  assert.equal(compare(guess, answer, ALL).fields.team?.hit, 'close');
});

test('role: exact green, rifle-like yellow, awp vs rifle red', () => {
  assert.equal(compare(base({ role: 'AWP' }), base({ role: 'AWP' }), ALL).fields.role?.hit, 'correct');
  assert.equal(
    compare(base({ role: 'Entry' }), base({ role: 'Support' }), ALL).fields.role?.hit,
    'close',
  );
  assert.equal(compare(base({ role: 'AWP' }), base({ role: 'Rifle' }), ALL).fields.role?.hit, 'wrong');
});

test('role: missing data never turns green', () => {
  const r = compare(base({ role: null }), base({ role: 'AWP' }), ['role']);
  assert.equal(r.fields.role?.hit, 'wrong');
  assert.equal(isWin(r), false);
});

test('country: same green, same region yellow, else red', () => {
  const answer = base({ country: 'dk', region: 'EU' });
  assert.equal(compare(base({ country: 'dk' }), answer, ALL).fields.country?.hit, 'correct');
  assert.equal(
    compare(base({ country: 'se', region: 'EU' }), answer, ALL).fields.country?.hit,
    'close',
  );
  assert.equal(
    compare(base({ country: 'br', region: 'SA' }), answer, ALL).fields.country?.hit,
    'wrong',
  );
});

test('age: within 2 yellow with direction', () => {
  const answer = base({ age: 30 });
  const r = compare(base({ age: 28 }), answer, ALL).fields.age;
  assert.equal(r?.hit, 'close');
  assert.equal(r?.dir, 1);
  assert.equal(compare(base({ age: 24 }), answer, ALL).fields.age?.hit, 'wrong');
  assert.equal(compare(base({ age: 24 }), answer, ALL).fields.age?.dir, 1);
});

test('majors: within 1 yellow, exact green', () => {
  const answer = base({ majors: 4 });
  assert.equal(compare(base({ majors: 4 }), answer, ALL).fields.majors?.hit, 'correct');
  const r = compare(base({ majors: 3 }), answer, ALL).fields.majors;
  assert.equal(r?.hit, 'close');
  assert.equal(r?.dir, 1);
  assert.equal(compare(base({ majors: 0 }), answer, ALL).fields.majors?.hit, 'wrong');
});

test('majors played: within 3 yellow with direction', () => {
  const answer = base({ majorsPlayed: 10 });
  const r = compare(base({ majorsPlayed: 12 }), answer, ALL).fields.majorsPlayed;
  assert.equal(r?.hit, 'close');
  assert.equal(r?.dir, -1);
  assert.equal(compare(base({ majorsPlayed: 10 }), answer, ALL).fields.majorsPlayed?.hit, 'correct');
  assert.equal(compare(base({ majorsPlayed: 3 }), answer, ALL).fields.majorsPlayed?.hit, 'wrong');
});

test('first major year: within 2 years yellow', () => {
  const answer = base({ firstMajor: 2015 });
  const r = compare(base({ firstMajor: 2013 }), answer, ALL).fields.firstMajor;
  assert.equal(r?.hit, 'close');
  assert.equal(r?.dir, 1);
  assert.equal(compare(base({ firstMajor: 2019 }), answer, ALL).fields.firstMajor?.hit, 'wrong');
});

test('correct counter ignores yellow', () => {
  const answer = base({ age: 30, majors: 4 });
  const r = compare(base({ age: 28, majors: 3 }), answer, ALL);
  assert.equal(r.correct, 5); // team, role, country, majorsPlayed, firstMajor
});

// Turn the Wayback snapshots in data/raw/archive/*.html into the small
// data/infobox.json that the build reads. Only age / roles / nationality are
// taken: the current team still comes from the 2026 Major roster.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ARCHIVE = path.join(ROOT, 'data/raw/archive');
const OUT = path.join(ROOT, 'data/infobox.json');
const SNAPSHOT = '2026-10-22';

const ROLE_PRIORITY = [
  ['IGL', ['igl', 'in-game leader']],
  ['AWP', ['awp', 'sniper']],
  ['Entry', ['entry', 'opener']],
  ['Support', ['support']],
  ['Rifle', ['rifle', 'lurker']],
];

function primaryRole(roles) {
  const low = roles.map((r) => r.toLowerCase());
  for (const [role, needles] of ROLE_PRIORITY) {
    if (low.some((r) => needles.some((n) => r.includes(n)))) return role;
  }
  return null;
}

const strip = (html) =>
  html
    .replace(/<br\s*\/?>/gi, '|')
    .replace(/<[^>]+>/g, '')
    .replace(/&#160;|&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

function ageAt(birth, on) {
  if (!birth) return null;
  const [y, m, d] = birth.split('-').map(Number);
  const [sy, sm, sd] = on.split('-').map(Number);
  let age = sy - y;
  if (sm < m || (sm === m && sd < d)) age -= 1;
  return age >= 15 && age <= 60 ? age : null;
}

function parse(file) {
  const html = readFileSync(path.join(ARCHIVE, file), 'utf8');
  if (!html.includes('fo-nttax-infobox')) return null;

  const cells = new Map();
  for (const m of html.matchAll(/infobox-description">([^<:]{1,40}):<\/div><div[^>]*>([\s\S]{0,600}?)<\/div>/g)) {
    cells.set(m[1].trim().toLowerCase(), m[2]);
  }

  // Categories are a fallback when a row is missing.
  let categories = [];
  const cat = /"wgCategories":\[([\s\S]*?)\]/.exec(html);
  if (cat) {
    try {
      categories = JSON.parse(`[${cat[1]}]`);
    } catch {
      categories = [];
    }
  }

  const bornRaw = strip(cells.get('born') ?? '');
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  let birth = null;
  const named = /([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/.exec(bornRaw);
  if (named) {
    const mo = months.indexOf(named[1].toLowerCase()) + 1;
    if (mo) birth = `${named[3]}-${String(mo).padStart(2, '0')}-${String(Number(named[2])).padStart(2, '0')}`;
  }
  const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(bornRaw);
  if (!birth && iso) birth = iso[0];
  if (!birth) {
    const y = /(\d{4}) births/.exec(categories.join('|'));
    if (y) birth = `${y[1]}-01-01`; // year only: age may be off by one, drop it
  }

  const roleCell = cells.get('roles') ?? cells.get('role') ?? '';
  const roles = (roleCell ? strip(roleCell).split('|') : [])
    .map((r) => r.trim())
    .filter(Boolean);
  if (!roles.length) {
    for (const c of categories) {
      const m = /^(AWPers|Riflers|In-game leaders|Support players|Entry fraggers|Snipers|Lurkers)$/.exec(c);
      if (m) roles.push(m[1]);
    }
  }

  const status = strip(cells.get('status') ?? '');
  const nationality = strip(cells.get('nationality') ?? '');
  const team = strip(cells.get('team') ?? '');
  const birthOnly = /^\d{4}-01-01$/.test(birth ?? '') && !/(\d{4}) births/.test(bornRaw) ? birth : birth;

  return {
    birth: birthOnly,
    birthExact: !!named || !!iso,
    age: named || iso ? ageAt(birth, SNAPSHOT) : null,
    roles,
    role: primaryRole(roles),
    nationality,
    team,
    status,
  };
}

const files = readdirSync(ARCHIVE).filter((f) => f.endsWith('.html'));
const players = {};
const misses = [];
for (const file of files) {
  const id = file.slice(0, -'.html'.length);
  const data = parse(file);
  if (!data) {
    misses.push(id);
    continue;
  }
  players[id] = data;
}

const withAge = Object.values(players).filter((p) => p.age != null).length;
const withRole = Object.values(players).filter((p) => p.role).length;

writeFileSync(
  OUT,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: 'web.archive.org snapshots of liquipedia.net/counterstrike/<id>',
      snapshot: SNAPSHOT,
      players,
    },
    null,
    1,
  ) + '\n',
);

const roleCounts = {};
for (const p of Object.values(players)) if (p.role) roleCounts[p.role] = (roleCounts[p.role] ?? 0) + 1;
console.log(`parsed ${files.length} pages -> age ${withAge}, role ${withRole}`);
console.log(`roles: ${JSON.stringify(roleCounts)}`);
const statuses = {};
for (const p of Object.values(players)) statuses[p.status || '-'] = (statuses[p.status || '-'] ?? 0) + 1;
console.log(`status: ${JSON.stringify(statuses)}`);
if (misses.length) console.log(`unparseable: ${misses.join(', ')}`);

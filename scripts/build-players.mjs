// Merge everything we already have on disk into public/players.json (Dataset).
//
// Sources, all cached under data/:
//   rosters.json          2026 IEM Cologne Major participants (id, flag, team)
//   raw/player-db.wikitext  Major appearance database: flag + every Major attended
//   raw/player-stats.wikitext  Major titles won per player
//   raw/page-*.json        cached team pages: current squad + IGL flags
//   infobox.json           Wayback snapshots of the player pages: age + roles
//   players-raw.json       optional: live infobox dump, when Liquipedia unblocks
//
// The field list is data driven: age and role are only advertised when we
// actually have them for most players.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { regionOfCountry, regionOfTeam, zhName, isoOf } from './lib/geo.mjs';
import { extractTemplates, parseParams } from './lib/parse.mjs';

const SNAPSHOT = '2026-10-22';

const RIFLE_LIKE = ['igl', 'entry', 'support', 'rifle', 'rifler', 'lurk', 'lurker'];

function clean(value) {
  if (!value) return '';
  return String(value)
    .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/'''?/g, '')
    .trim();
}

function primaryRole(params) {
  const raw = `${params.roles ?? ''},${params.role ?? ''}`.toLowerCase();
  const tags = raw.split(/[,;/]/).map((s) => s.trim()).filter(Boolean);
  if (!tags.length) return null;
  if (tags.some((t) => t.includes('igl') || t.includes('in-game leader'))) return 'IGL';
  if (tags.some((t) => t.includes('awp') || t.includes('sniper'))) return 'AWP';
  if (tags.some((t) => t.includes('entry') || t.includes('opener'))) return 'Entry';
  if (tags.some((t) => t.includes('support'))) return 'Support';
  if (tags.some((t) => RIFLE_LIKE.includes(t))) return 'Rifle';
  return null;
}

/**
 * Every player block in the Major database: flag, appearances, first/last year.
 * Rows look like `{{player|flag=br|piria|link=piriajr}}`: the shown nickname and
 * the wiki page title can differ, so both are registered as lookup keys.
 */
function parsePlayerDb(text) {
  const out = new Map();
  const head = /![\s\S]{0,120}?\{\{player\|(?:flag=([a-z]{2})\|)?([^}|]+?)(?:\|link=([^}|]+?))?\}\}/g;
  const heads = [];
  let m;
  while ((m = head.exec(text))) {
    heads.push({
      flag: (m[1] ?? '').toLowerCase(),
      nick: m[2].trim(),
      link: (m[3] ?? '').trim(),
      start: m.index,
      end: head.lastIndex,
    });
  }
  for (let i = 0; i < heads.length; i++) {
    const h = heads[i];
    const body = text.slice(h.end, heads[i + 1]?.start ?? text.length);
    const years = [...body.matchAll(/\{\{TeamPart\|[^}]*?\|(\d{4})-\d{2}-\d{2}/g)].map((x) => Number(x[1]));
    if (!years.length) continue;
    const record = {
      flag: h.flag,
      played: years.length,
      first: Math.min(...years),
      last: Math.max(...years),
    };
    out.set(h.nick.toLowerCase(), record);
    if (h.link) out.set(h.link.toLowerCase(), record);
  }
  return out;
}

function parseMajorTitles(wikitext) {
  const titles = new Map();
  const block = wikitext.slice(wikitext.indexOf('Titles Won per Player'));
  for (const row of block.split(/\n\|-\n/)) {
    const who = /\{\{player\|(?:flag=[a-z]{2}\|)?([^|}]+)/.exec(row);
    const num = /'''(\d+)'''/.exec(row);
    if (who && num) titles.set(who[1].trim().toLowerCase(), Number(num[1]));
  }
  return titles;
}

/** Cached team pages: current squad, flags, and who is the IGL. */
async function parseTeamPages() {
  const info = new Map();
  let files = [];
  try {
    files = await readdir('data/raw');
  } catch {
    return info;
  }
  for (const file of files) {
    if (!file.startsWith('page-') || !file.endsWith('.json')) continue;
    let text;
    try {
      text = JSON.parse(await readFile(`data/raw/${file}`, 'utf8'))?.parse?.wikitext;
    } catch {
      continue;
    }
    if (!text || !text.includes('{{Squad|status=active')) continue;
    const team = file
      .slice('page-'.length, -'.json'.length)
      .replace(/_/g, ' ')
      .replace(/&amp;/g, '&');

    for (const squad of extractTemplates(text, 'Squad')) {
      const params = parseParams(squad);
      if ((params.status ?? '').toLowerCase() !== 'active') continue;
      for (const person of extractTemplates(squad, 'Person')) {
        const pp = parseParams(person);
        const id = pp.id || pp._positional[0];
        if (!id) continue;
        if ((pp.role ?? '').toLowerCase().includes('coach')) continue;
        const record = { flag: (pp.flag ?? '').toLowerCase(), igl: pp.igl === 'y', team };
        info.set(id.trim(), record);
        info.set(id.trim().toLowerCase(), record);
      }
    }
  }
  return info;
}

/** Optional infobox cache: age and role, when we managed to fetch it. */
async function parseInfoboxes() {
  const out = new Map();
  let raw;
  try {
    raw = JSON.parse(await readFile('data/players-raw.json', 'utf8'));
  } catch {
    return out;
  }
  for (const [title, text] of Object.entries(raw.pages ?? {})) {
    const inner =
      extractTemplates(text, 'Infobox player')[0] ?? extractTemplates(text, 'Infobox Player')[0];
    if (!inner) continue;
    const p = parseParams(inner);
    const birth = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(p.birth_date ?? '') ?? /(\d{4})/.exec(p.birth_date ?? '');
    let age = null;
    if (birth) {
      const [y, mo, d] = [Number(birth[1]), Number(birth[2] ?? 1), Number(birth[3] ?? 1)];
      const [sy, sm, sd] = SNAPSHOT.split('-').map(Number);
      age = sy - y;
      if (sm < mo || (sm === mo && sd < d)) age -= 1;
      if (age < 15 || age > 60) age = null;
    }
    out.set(title.toLowerCase(), {
      age,
      role: primaryRole(p),
      country: isoOf(clean(p.country ?? '')),
    });
  }
  return out;
}

/** Waybay snapshot cache (scripts/parse-archive.mjs): age + roles for most players. */
async function parseArchived() {
  const out = new Map();
  let raw;
  try {
    raw = JSON.parse(await readFile('data/infobox.json', 'utf8'));
  } catch {
    return out;
  }
  for (const [id, p] of Object.entries(raw.players ?? {})) {
    out.set(id.toLowerCase(), { age: p.age ?? null, role: p.role ?? null, roles: p.roles ?? [] });
  }
  return out;
}

const rosters = JSON.parse(await readFile('data/rosters.json', 'utf8'));
const dbText = await readFile('data/raw/player-db.wikitext', 'utf8');
const statsText = await readFile('data/raw/player-stats.wikitext', 'utf8');

const majorDb = parsePlayerDb(dbText);
const majorTitles = parseMajorTitles(statsText);
const teamPages = await parseTeamPages();
const infoboxes = await parseInfoboxes();
const archived = await parseArchived();

let players = [];
const problems = [];
const seen = new Set();

for (const roster of rosters.rosters) {
  for (const entry of roster.players) {
    const id = entry.id.trim();
    const key = id.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const tp = teamPages.get(id) ?? teamPages.get(key);
    // Live API dump wins over the Wayback snapshot: it cannot be stale.
    const ib = infoboxes.get(key) ?? archived.get(key);
    const db = majorDb.get(key);
    const country = (db?.flag || tp?.flag || entry.flag || ib?.country || '').toLowerCase();
    if (!country) {
      problems.push(`no country (skipped): ${id}`);
      continue;
    }
    if (!db) {
      problems.push(`missing in Major database (skipped): ${id}`);
      continue;
    }
    const team = tp?.team || roster.team;
    players.push({
      id,
      team,
      teamRegion: regionOfTeam(team),
      country,
      countryName: zhName(country),
      region: regionOfCountry(country),
      majors: majorTitles.get(key) ?? 0,
      majorsPlayed: db?.played ?? null,
      firstMajor: db?.first ?? null,
      age: ib?.age ?? null,
      role: (tp?.igl ? 'IGL' : null) ?? ib?.role ?? null,
    });
  }
}

// The answer row must be fully known: a player without an infobox would show
// "?" for age/role on every guess, which leaks the secret. As more snapshots
// land the pool grows back on its own.
const droppedUnknown = players.filter((p) => p.age == null || p.role == null).map((p) => p.id);
players = players.filter((p) => p.age != null && p.role != null);
players.sort((a, b) => a.id.localeCompare(b.id));
if (droppedUnknown.length) {
  console.log(`dropped (unknown age/role): ${droppedUnknown.length} -> ${droppedUnknown.join(', ')}`);
}

const share = (fn) => players.filter(fn).length / Math.max(players.length, 1);
const candidates = ['team', 'role', 'country', 'age', 'majors', 'majorsPlayed', 'firstMajor'];
const fields = candidates.filter((f) => {
  if (f === 'role') return share((p) => p.role != null) >= 0.5;
  if (f === 'age') return share((p) => p.age != null) >= 0.8;
  if (f === 'majorsPlayed' || f === 'firstMajor') return share((p) => p[f] != null) >= 0.9;
  return true;
});

// Six columns fit a phone screen: once age and role are in, 首秀年份 becomes spare data.
if (fields.includes('age') && fields.includes('role') && fields.includes('firstMajor')) {
  fields.splice(fields.indexOf('firstMajor'), 1);
}

// Drop fields the dataset does not advertise, so the JSON stays small and honest.
for (const p of players) {
  for (const f of ['role', 'age']) {
    if (!fields.includes(f)) delete p[f];
  }
}

const dataset = {
  generatedAt: new Date().toISOString(),
  source: 'Liquipedia (live player infoboxes, Major participants, Major database, Major titles, team pages)',
  snapshot: rosters.sourceDate ?? SNAPSHOT,
  fields,
  players,
};

await mkdir('public', { recursive: true });
await writeFile('public/players.json', JSON.stringify(dataset, null, 2));

console.log(`players=${players.length} fields=${fields.join(',')}`);
console.log(`countries=${new Set(players.map((p) => p.country)).size}`);
console.log(`majors>0: ${players.filter((p) => p.majors > 0).length}`);
console.log(
  `majorsPlayed: min/median/max = ${Math.min(...players.map((p) => p.majorsPlayed ?? 0))}/${
    players.map((p) => p.majorsPlayed ?? 0).sort((a, b) => a - b)[Math.floor(players.length / 2)]
  }/${Math.max(...players.map((p) => p.majorsPlayed ?? 0))}`,
);
if (problems.length) console.log(`problems (${problems.length}): ${problems.slice(0, 20).join(' | ')}`);

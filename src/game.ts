import type { CompareResult, FieldId, FieldResult, Hit, Player, Role } from './types';

/** Roles that are "close enough" to each other for the yellow hint. */
const RIFLE_LIKE: Role[] = ['IGL', 'Entry', 'Support', 'Rifle'];

export const FIELD_LABEL: Record<FieldId, string> = {
  team: '战队',
  role: '位置',
  country: '国籍',
  age: '年龄',
  majors: 'Major 冠军',
  majorsPlayed: 'Major 出场',
  firstMajor: '首秀年份',
};

function compareTeam(guess: Player, answer: Player): FieldResult {
  if (guess.team === answer.team) return { value: guess.team, hit: 'correct' };
  const shared =
    (guess.formerTeams ?? []).includes(answer.team) ||
    (answer.formerTeams ?? []).includes(guess.team);
  const sameRegion = guess.teamRegion !== 'OTHER' && guess.teamRegion === answer.teamRegion;
  return { value: guess.team, hit: shared || sameRegion ? 'close' : 'wrong' };
}

function compareRole(guess: Player, answer: Player): FieldResult {
  const g = guess.role ?? null;
  const a = answer.role ?? null;
  if (!g || !a) return { value: g ? roleLabel(g) : '未知', hit: 'wrong' };
  if (g === a) return { value: roleLabel(g), hit: 'correct' };
  const hit: Hit = RIFLE_LIKE.includes(g) && RIFLE_LIKE.includes(a) ? 'close' : 'wrong';
  return { value: roleLabel(g), hit };
}

function compareCountry(guess: Player, answer: Player): FieldResult {
  const value = `${flagEmoji(guess.country)} ${guess.countryName}`.trim();
  if (guess.country === answer.country) return { value, hit: 'correct' };
  const close = guess.region !== 'OTHER' && guess.region === answer.region;
  return { value, hit: close ? 'close' : 'wrong' };
}

function compareNumber(
  value: number | null | undefined,
  answer: number | null | undefined,
  tolerance: number,
): FieldResult {
  if (value == null || answer == null) return { value: '?', hit: 'wrong' };
  const diff = answer - value;
  let hit: Hit = 'wrong';
  if (diff === 0) hit = 'correct';
  else if (Math.abs(diff) <= tolerance) hit = 'close';
  return { value: String(value), hit, dir: Math.sign(diff) as -1 | 0 | 1 };
}

export function compare(guess: Player, answer: Player, fields: FieldId[]): CompareResult {
  const out: Partial<Record<FieldId, FieldResult>> = {};
  for (const field of fields) {
    switch (field) {
      case 'team':
        out.team = compareTeam(guess, answer);
        break;
      case 'role':
        out.role = compareRole(guess, answer);
        break;
      case 'country':
        out.country = compareCountry(guess, answer);
        break;
      case 'age':
        out.age = compareNumber(guess.age, answer.age, 2);
        break;
      case 'majors':
        out.majors = compareNumber(guess.majors, answer.majors, 1);
        break;
      case 'majorsPlayed':
        out.majorsPlayed = compareNumber(guess.majorsPlayed, answer.majorsPlayed, 3);
        break;
      case 'firstMajor':
        out.firstMajor = compareNumber(guess.firstMajor, answer.firstMajor, 2);
        break;
    }
  }
  const correct = fields.filter((f) => out[f]?.hit === 'correct').length;
  return { fields: out, correct, total: fields.length };
}

export function isWin(result: CompareResult): boolean {
  return result.correct === result.total;
}

export function flagEmoji(country: string): string {
  if (!/^[a-z]{2}$/.test(country)) return '';
  // 0x1F1E6 (regional indicator A) minus 'a'
  return String.fromCodePoint(...[...country].map((c) => 127365 + c.charCodeAt(0)));
}

const ROLE_LABEL: Record<Role, string> = {
  IGL: '指挥',
  AWP: '狙击',
  Entry: '突破',
  Support: '辅助',
  Rifle: '步枪',
};

export function roleLabel(role: Role): string {
  return ROLE_LABEL[role] ?? role;
}

const REGION_LABEL: Record<string, string> = {
  EU: '欧洲',
  CIS: '独联体',
  NA: '北美',
  SA: '南美',
  APAC: '亚太',
  OCE: '大洋洲',
  ME: '中东',
  OTHER: '其他',
};

export function regionLabel(region: string): string {
  return REGION_LABEL[region] ?? region;
}

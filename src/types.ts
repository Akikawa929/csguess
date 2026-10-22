export type Role = 'IGL' | 'AWP' | 'Entry' | 'Support' | 'Rifle';
export type Region = 'EU' | 'CIS' | 'NA' | 'SA' | 'APAC' | 'OCE' | 'ME' | 'OTHER';

/** Every field the game can compare. Which ones are shown is decided by the data. */
export type FieldId =
  | 'team'
  | 'role'
  | 'country'
  | 'age'
  | 'majors'
  | 'majorsPlayed'
  | 'firstMajor';

export interface Player {
  /** Liquipedia id = the nickname players are known by */
  id: string;
  /** current team (or "Free Agent") */
  team: string;
  teamRegion: Region;
  /** ISO-3166 alpha-2, lowercase */
  country: string;
  countryName: string;
  region: Region;
  /** Major titles won */
  majors: number;
  /** Major appearances */
  majorsPlayed?: number | null;
  /** Year of the first Major appearance */
  firstMajor?: number | null;
  /** Only available once the Liquipedia player infoboxes are fetched */
  age?: number | null;
  role?: Role | null;
  formerTeams?: string[];
}

export interface Dataset {
  generatedAt: string;
  source: string;
  snapshot: string;
  fields: FieldId[];
  players: Player[];
}

export type Hit = 'correct' | 'close' | 'wrong';

export interface FieldResult {
  value: string;
  hit: Hit;
  /** +1 = the answer is higher/later, -1 = lower, 0 = same */
  dir?: -1 | 0 | 1;
}

export interface CompareResult {
  fields: Partial<Record<FieldId, FieldResult>>;
  correct: number;
  total: number;
}

import type { Dataset, FieldId, Player } from './types';

/** The standalone build inlines players.json into a global. */
function inlineDataset(): Dataset | undefined {
  return (globalThis as { __CSGUESS__?: Dataset }).__CSGUESS__;
}

export async function loadDataset(): Promise<Dataset> {
  const data = inlineDataset() ?? (await fetchDataset());
  if (!Array.isArray(data?.players) || !data.players.length) throw new Error('players.json 是空的');
  if (!Array.isArray(data.fields) || !data.fields.length) throw new Error('players.json 缺少 fields');
  return data;
}

async function fetchDataset(): Promise<Dataset> {
  const res = await fetch('players.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`players.json ${res.status}`);
  return (await res.json()) as Dataset;
}

/** Prefix-first search over nicknames, stable order. */
export function searchPlayers(players: Player[], query: string, limit = 8): Player[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts: Player[] = [];
  const contains: Player[] = [];
  for (const p of players) {
    const nick = p.id.toLowerCase();
    if (nick === q) return [p];
    if (nick.startsWith(q)) starts.push(p);
    else if (nick.includes(q)) contains.push(p);
  }
  starts.sort((a, b) => a.id.length - b.id.length || a.id.localeCompare(b.id));
  return [...starts, ...contains].slice(0, limit);
}

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic pick: same day -> same answer, for everyone. */
export function pickDaily(players: Player[], dayKey: string): Player {
  const pool = players.filter((p) => p.id);
  return pool[hash(dayKey) % pool.length];
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Fields a player actually has data for (all of them, in practice). */
export function fieldsOf(dataset: Dataset): FieldId[] {
  return dataset.fields;
}

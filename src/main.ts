import { loadDataset, pickDaily, pickRandom, searchPlayers, todayKey } from './data';
import { compare, FIELD_LABEL, isWin, regionLabel } from './game';
import type { CompareResult, FieldId, FieldResult, Player } from './types';

const MAX_GUESSES = 8;
const DAY = todayKey();
const DAILY_KEY = `csguess:daily:${DAY}`;
const LEGACY_KEY = `csguess:${DAY}`;
const INFINITE_KEY = 'csguess:infinite';
const MODE_KEY = 'csguess:mode';
/** How many recent answers the endless mode avoids repeating. */
const RECENT_LIMIT = 25;

type Mode = 'daily' | 'infinite';

interface SavedRound {
  ids: string[];
}

interface InfiniteState {
  round: number;
  wins: number;
  streak: number;
  best: number;
  answerId: string | null;
  ids: string[];
  seen: string[];
}

const boardEl = document.getElementById('board') as HTMLDivElement;
const headEl = document.getElementById('grid-head') as HTMLDivElement;
const formEl = document.getElementById('guess-form') as HTMLFormElement;
const inputEl = document.getElementById('guess-input') as HTMLInputElement;
const btnEl = document.getElementById('guess-btn') as HTMLButtonElement;
const hintEl = document.getElementById('hint') as HTMLParagraphElement;
const listEl = document.getElementById('player-list') as HTMLDataListElement;
const resultEl = document.getElementById('result') as HTMLElement;
const resultTextEl = document.getElementById('result-text') as HTMLParagraphElement;
const shareEl = document.getElementById('share-btn') as HTMLButtonElement;
const nextEl = document.getElementById('next-btn') as HTMLButtonElement;
const statsEl = document.getElementById('stats') as HTMLParagraphElement;
const dailyBtn = document.getElementById('mode-daily') as HTMLButtonElement;
const infiniteBtn = document.getElementById('mode-infinite') as HTMLButtonElement;

let players: Player[] = [];
let fields: FieldId[] = [];
let gridTemplate = '';
let mode: Mode = 'daily';
let answer: Player | null = null;
let guesses: { player: Player; result: CompareResult }[] = [];
let finished = false;
let won = false;
let infinite: InfiniteState = {
  round: 0,
  wins: 0,
  streak: 0,
  best: 0,
  answerId: null,
  ids: [],
  seen: [],
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

function arrow(dir?: -1 | 0 | 1): string {
  if (dir === 1) return ' ▲';
  if (dir === -1) return ' ▼';
  return '';
}

function cell(field: FieldResult | undefined, cls = 'cell'): HTMLDivElement {
  const node = el('div', `${cls} hit-${field?.hit ?? 'wrong'}`);
  const text = field?.value ?? '?';
  node.textContent = text + arrow(field?.dir);
  return node;
}

function renderHead(): void {
  headEl.textContent = '';
  headEl.style.gridTemplateColumns = gridTemplate;
  headEl.append(el('span', undefined, '选手'));
  for (const f of fields) headEl.append(el('span', undefined, FIELD_LABEL[f]));
}

function renderRow(player: Player, result: CompareResult): HTMLDivElement {
  const row = el('div', 'row');
  row.style.gridTemplateColumns = gridTemplate;
  row.append(el('div', 'cell cell-name', player.id));
  for (const f of fields) row.append(cell(result.fields[f]));
  return row;
}

function renderBoard(): void {
  boardEl.textContent = '';
  for (const { player, result } of guesses) boardEl.append(renderRow(player, result));
  for (let i = guesses.length; i < MAX_GUESSES; i++) {
    const row = el('div', 'row row-empty');
    row.style.gridTemplateColumns = gridTemplate;
    for (let c = 0; c <= fields.length; c++) row.append(el('div', 'cell', ''));
    boardEl.append(row);
  }
}

function fillOptions(query: string): void {
  const picked = searchPlayers(players, query, 8);
  listEl.textContent = '';
  for (const p of picked) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.label = `${p.team} · ${regionLabel(p.region)}`;
    listEl.append(opt);
  }
}

function findPlayer(name: string): Player | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  const exact = players.find((p) => p.id.toLowerCase() === q);
  if (exact) return exact;
  // allow "Zyw" -> "ZywOo" when the prefix is unambiguous
  const prefix = players.filter((p) => p.id.toLowerCase().startsWith(q));
  return prefix.length === 1 ? prefix[0] : undefined;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be unavailable */
  }
}

function saveDaily(): void {
  writeJson(DAILY_KEY, { ids: guesses.map((g) => g.player.id) });
}

function saveInfinite(): void {
  writeJson(INFINITE_KEY, infinite);
}

function save(): void {
  if (mode === 'daily') saveDaily();
  else saveInfinite();
}

function loadDailyIds(): string[] {
  const saved = readJson<SavedRound | string[] | null>(DAILY_KEY, null);
  if (Array.isArray(saved)) return saved;
  if (saved && Array.isArray(saved.ids)) return saved.ids;
  const legacy = readJson<string[] | null>(LEGACY_KEY, null);
  return Array.isArray(legacy) ? legacy : [];
}

function restoreGuesses(ids: string[]): void {
  guesses = [];
  for (const id of ids) {
    const p = findPlayer(id);
    if (p && answer && !guesses.some((g) => g.player.id === p.id)) {
      guesses.push({ player: p, result: compare(p, answer, fields) });
    }
  }
}

function emojiGrid(): string {
  const map = { correct: '🟩', close: '🟨', wrong: '⬛' } as const;
  return guesses
    .map(({ result }) => fields.map((f) => map[result.fields[f]?.hit ?? 'wrong']).join(''))
    .join('\n');
}

function shareText(): string {
  if (mode === 'infinite') {
    const head = `CS 选手猜猜猜 · 无限挑战 第 ${infinite.round} 题 ${guesses.length}/${MAX_GUESSES}`;
    return `${head}\n${emojiGrid()}`;
  }
  return `CS 选手猜猜猜 ${DAY} ${guesses.length}/${MAX_GUESSES}\n${emojiGrid()}`;
}

async function copyShare(): Promise<void> {
  const text = shareText();
  try {
    await navigator.clipboard.writeText(text);
    shareEl.textContent = '已复制 ✓';
  } catch {
    shareEl.textContent = text;
  }
  setTimeout(() => (shareEl.textContent = '复制成绩'), 1500);
}

function resultMessage(): string {
  if (!answer) return '';
  const who = `${answer.id}（${answer.team}）`;
  if (mode === 'infinite') {
    return won
      ? `猜对了！${who}，第 ${infinite.round} 题用了 ${guesses.length} 次。`
      : `第 ${infinite.round} 题的答案是 ${who}。再战一题？`;
  }
  return won ? `猜对了！就是 ${who}。` : `今天的答案：${who}。`;
}

function updateStatus(): void {
  const isInfinite = mode === 'infinite';
  dailyBtn.className = `mode${isInfinite ? '' : ' active'}`;
  infiniteBtn.className = `mode${isInfinite ? ' active' : ''}`;
  statsEl.hidden = !isInfinite;
  if (isInfinite) {
    statsEl.textContent = `第 ${infinite.round} 题 · 猜中 ${infinite.wins} · 当前连击 ${infinite.streak} · 最佳 ${infinite.best}`;
  }

  inputEl.disabled = finished;
  btnEl.disabled = finished;
  resultEl.hidden = !finished;
  nextEl.hidden = !(finished && isInfinite);
  if (finished) {
    resultTextEl.textContent = resultMessage();
  } else if (guesses.length) {
    hintEl.textContent = `还剩 ${MAX_GUESSES - guesses.length} 次机会`;
  } else {
    hintEl.textContent = '';
  }
}

function evaluate(): void {
  const last = guesses[guesses.length - 1];
  won = last ? isWin(last.result) : false;
  finished = Boolean(won) || guesses.length >= MAX_GUESSES;
  updateStatus();
}

function endRound(roundWon: boolean): void {
  finished = true;
  won = roundWon;
  if (mode === 'infinite') {
    infinite.wins += roundWon ? 1 : 0;
    infinite.streak = roundWon ? infinite.streak + 1 : 0;
    infinite.best = Math.max(infinite.best, infinite.streak);
    infinite.ids = guesses.map((g) => g.player.id);
    saveInfinite();
  } else {
    saveDaily();
  }
  updateStatus();
}

function submitGuess(name: string): void {
  if (!answer || finished) return;
  if (guesses.length >= MAX_GUESSES) return;
  const player = findPlayer(name);
  if (!player) {
    hintEl.textContent = `没有找到「${name.trim()}」，试试下拉列表里的昵称。`;
    return;
  }
  if (guesses.some((g) => g.player.id === player.id)) {
    hintEl.textContent = '这个人已经猜过了。';
    return;
  }

  const result = compare(player, answer, fields);
  guesses.push({ player, result });
  hintEl.textContent = '';
  inputEl.value = '';
  renderBoard();
  save();

  if (isWin(result)) endRound(true);
  else if (guesses.length >= MAX_GUESSES) endRound(false);
  else updateStatus();
  if (!finished) inputEl.focus();
}

function enterDaily(): void {
  mode = 'daily';
  writeJson(MODE_KEY, mode);
  answer = pickDaily(players, DAY);
  restoreGuesses(loadDailyIds());
  evaluate();
  renderBoard();
}

function newInfiniteRound(): void {
  answer = pickRandom(players, new Set(infinite.seen));
  infinite.round += 1;
  infinite.answerId = answer.id;
  infinite.ids = [];
  infinite.seen = [...infinite.seen, answer.id].slice(-RECENT_LIMIT);
  guesses = [];
  finished = false;
  won = false;
  saveInfinite();
  renderBoard();
  updateStatus();
  inputEl.focus();
}

function enterInfinite(): void {
  mode = 'infinite';
  writeJson(MODE_KEY, mode);
  const saved = readJson<InfiniteState | null>(INFINITE_KEY, null);
  if (saved && typeof saved === 'object') {
    infinite = {
      round: Number(saved.round) || 0,
      wins: Number(saved.wins) || 0,
      streak: Number(saved.streak) || 0,
      best: Number(saved.best) || 0,
      answerId: typeof saved.answerId === 'string' ? saved.answerId : null,
      ids: Array.isArray(saved.ids) ? saved.ids : [],
      seen: Array.isArray(saved.seen) ? saved.seen : [],
    };
  } else {
    infinite = { round: 0, wins: 0, streak: 0, best: 0, answerId: null, ids: [], seen: [] };
  }

  const savedAnswer = infinite.answerId ? players.find((p) => p.id === infinite.answerId) : undefined;
  if (!savedAnswer) {
    newInfiniteRound();
    return;
  }
  answer = savedAnswer;
  restoreGuesses(infinite.ids);
  evaluate();
  renderBoard();
}

function setMode(next: Mode): void {
  if (next === mode) return;
  if (next === 'infinite') enterInfinite();
  else enterDaily();
  inputEl.focus();
}

async function boot(): Promise<void> {
  try {
    const dataset = await loadDataset();
    players = dataset.players;
    fields = dataset.fields;
  } catch (err) {
    hintEl.textContent = `加载选手数据失败：${(err as Error).message}`;
    return;
  }
  gridTemplate = `1.15fr repeat(${fields.length}, minmax(0, 1fr))`;
  const poolSize = document.getElementById('pool-size');
  if (poolSize) poolSize.textContent = String(players.length);
  players.sort((a, b) => a.id.localeCompare(b.id));
  renderHead();

  const wanted = readJson<Mode | null>(MODE_KEY, null);
  if (wanted === 'infinite') enterInfinite();
  else enterDaily();

  inputEl.addEventListener('input', () => fillOptions(inputEl.value));
  formEl.addEventListener('submit', (ev) => {
    ev.preventDefault();
    submitGuess(inputEl.value);
  });
  shareEl.addEventListener('click', () => void copyShare());
  nextEl.addEventListener('click', () => {
    if (mode === 'infinite') newInfiniteRound();
  });
  dailyBtn.addEventListener('click', () => setMode('daily'));
  infiniteBtn.addEventListener('click', () => setMode('infinite'));
  inputEl.focus();
}

void boot();

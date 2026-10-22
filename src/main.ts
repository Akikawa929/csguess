import { loadDataset, pickDaily, searchPlayers, todayKey } from './data';
import { compare, FIELD_LABEL, isWin, regionLabel } from './game';
import type { CompareResult, FieldId, FieldResult, Player } from './types';

const MAX_GUESSES = 6;
const DAY = todayKey();
const STORE_KEY = `csguess:${DAY}`;

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

let players: Player[] = [];
let fields: FieldId[] = [];
let gridTemplate = '';
let answer: Player | null = null;
let guesses: { player: Player; result: CompareResult }[] = [];

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

function save(): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(guesses.map((g) => g.player.id)));
  } catch {
    /* storage may be unavailable */
  }
}

function load(): string[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

function emojiGrid(): string {
  const map = { correct: '🟩', close: '🟨', wrong: '⬛' } as const;
  return guesses
    .map(({ result }) => fields.map((f) => map[result.fields[f]?.hit ?? 'wrong']).join(''))
    .join('\n');
}

function shareText(): string {
  const head = `CS 选手猜猜猜 ${DAY} ${guesses.length}/${MAX_GUESSES}`;
  return `${head}\n${emojiGrid()}`;
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

function finish(won: boolean): void {
  if (!answer) return;
  resultEl.hidden = false;
  resultTextEl.textContent = won
    ? `猜对了！就是 ${answer.id}（${answer.team}）。`
    : `今天的答案：${answer.id}（${answer.team}）。`;
  inputEl.disabled = true;
  btnEl.disabled = true;
}

function submitGuess(name: string): void {
  if (!answer || guesses.length >= MAX_GUESSES || inputEl.disabled) return;
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

  if (isWin(result)) finish(true);
  else if (guesses.length >= MAX_GUESSES) finish(false);
  else hintEl.textContent = `还剩 ${MAX_GUESSES - guesses.length} 次机会`;
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
  players.sort((a, b) => a.id.localeCompare(b.id));
  answer = pickDaily(players, DAY);
  renderHead();

  for (const id of load()) {
    const p = findPlayer(id);
    if (p && answer) guesses.push({ player: p, result: compare(p, answer, fields) });
  }
  renderBoard();
  if (guesses.length) {
    const last = guesses[guesses.length - 1];
    if (isWin(last.result) || guesses.length >= MAX_GUESSES) finish(isWin(last.result));
    else hintEl.textContent = `还剩 ${MAX_GUESSES - guesses.length} 次机会`;
  }

  inputEl.addEventListener('input', () => fillOptions(inputEl.value));
  formEl.addEventListener('submit', (ev) => {
    ev.preventDefault();
    submitGuess(inputEl.value);
  });
  shareEl.addEventListener('click', () => void copyShare());
  inputEl.focus();
}

void boot();

# 猜 CS 选手

每天一位 CS 职业选手，8 次机会猜出是谁。Wordle 风格，纯静态页面，数据来自 Liquipedia。

## 模式

| 模式 | 规则 |
| --- | --- |
| **每日挑战** | 全世界同一道题（按日期哈希选题），每人每天一轮，8 次机会；进度存在 localStorage，刷新/明天自动换题 |
| **无限挑战** | 猜完一题（不论猜中还是次数用完）点「下一题」接着开新的一局，随机选题且不会连续重复同一个人；累计猜中数、当前连击、最佳连击都会记下来 |

## 玩法

输入选手昵称，每猜一次高亮 6 个字段：

| 字段 | 绿色 | 黄色 | 灰色 |
| --- | --- | --- | --- |
| 战队 | 同一支队 | 同一赛区，或曾效力过这支队伍 | 其他 |
| 位置 | 同一位置（IGL/AWP/Entry/Support/Rifle） | 同类位置 | 其他 |
| 国籍 | 同一国家 | 同一大区（欧洲/独联体/北美/南美/亚太/大洋洲/中东） | 其他 |
| 年龄 | 相同 | 相差 ≤2 岁，带 ▲/▼ | 其他 |
| Major 冠军 | 相同 | 相差 1 次，带 ▲/▼ | 其他 |
| Major 出场 | 相同 | 相差 ≤3 次，带 ▲/▼ | 其他 |

8 次内猜中即为胜利，结束后可以一键复制 emoji 战绩发给朋友。

## 立即试玩

```bash
node scripts/build-web.mjs      # 输出 dist/，不需要 npm install
```

然后直接双击 `dist/standalone.html` —— 数据、样式、脚本全部内联，断网也能玩。
（`dist/index.html` 是分文件版本，需要用任意静态服务器打开，例如 `node --run serve`。）

## 选手池

池子是 **2026 IEM Cologne Major 的 32 支参赛队主力**，去重后 157 人。答案行必须字段齐全，
所以当前只收录 infobox 已抓到的 **98 人**（`data/raw/archive/` 里有存档的人，还在继续补）；
`scripts/build-players.mjs` 会自动把「年龄或位置未知」的选手剔出池子，存档补齐后重跑即可扩容，无需改代码。
战队字段以 Major 参赛时的队伍为准；Major 结束后重新生成一次池子即可。

## 开发

```bash
node test/game.test.ts      # 比对逻辑单测（12 个用例）
node scripts/build-web.mjs  # 构建，并顺带做数据一致性 smoke test
node test/ui.test.mjs       # 用假 DOM 跑一遍真实界面（需先 build）
node test/modes.test.mjs    # 模式切换 + localStorage 存档/刷新恢复
node test/standalone.test.mjs  # 验证 standalone.html 内联包能启动并能猜
node scripts/validate.mjs   # 校验 public/players.json
```

代码是 TypeScript，但**不需要 tsc 也能跑**：Node 24 自带类型剥离，构建脚本
`scripts/build-web.mjs` 用 `node:module` 的 `stripTypeScriptTypes` 把 `src/*.ts` 转成浏览器能跑的 ES module。

## 数据

所有原始数据都在 `data/`，构建过程完全离线：

| 文件 | 内容 |
| --- | --- |
| `data/rosters.json` | Major 参赛名单（32 队、160 人） |
| `data/raw/player-db.wikitext` | Major 参赛记录库（647 人，含每次参赛的年份） |
| `data/raw/player-stats.wikitext` | 每人 Major 冠军数 |
| `data/raw/page-*.json` | 队伍页快照（现役阵容 + IGL 标记） |

```bash
node scripts/build-players.mjs   # 合并 -> public/players.json
node scripts/validate.mjs
```

### 补「年龄 / 位置」字段（可选）

年龄和位置只在选手个人页（infobox）里。2026-10-22 抓取时 Liquipedia 对我们 429 封禁了 11 小时以上，
所以第一版先用「Major 出场 / 首秀年份」顶上。字段列表是数据驱动的：数据里一旦有了 age/role，
`build-players.mjs` 会自动补上这两列（位置覆盖率 ≥50%、年龄 ≥80% 才启用）。

补数据的两条路都已经写好：

```bash
# A. Liquipedia 解封后（快）
node scripts/retry-fetch.mjs     # 每 5 分钟探一次，解封后自动抓 4 批 infobox

# B. 解封前走 Wayback Machine 的存档页（慢，约 12-16 秒/人）
node scripts/fetch-archive.mjs   # 存到 data/raw/archive/<id>.html，可断点续抓
node scripts/parse-archive.mjs   # 出生日期/年龄/位置/国籍 -> data/infobox.json

node scripts/build-players.mjs   # age/role 自动进入 players.json 的 fields
node scripts/build-web.mjs
```

archive.org 限速很凶：并发必须为 1、间隔 2 秒，遇到 403/429/503 退避 45 秒，否则 IP 会被临时拒连。

## 部署

推送到 GitHub，仓库 **Settings → Pages → Source** 选 **GitHub Actions**，
`.github/workflows/pages.yml` 会跑测试、构建并发布到 `https://<用户名>.github.io/<仓库名>/`。
构建产物用相对路径，放在子路径下也能正常打开。

## 目录

```
index.html            页面骨架（表头由 JS 按数据字段生成）
src/
  game.ts             比对逻辑（纯函数，单测覆盖）
  data.ts             加载 players.json、搜索、每日选题、前缀匹配
  main.ts             界面与交互（渲染格子、本地存档、分享）
  types.ts            类型定义
  styles.css          深色主题样式
scripts/
  build-players.mjs   合并本地数据 -> public/players.json
  build-web.mjs       类型剥离 + 构建 dist/（含 standalone.html）
  validate.mjs        数据校验
  lib/lp.mjs          Liquipedia API（限速 + 磁盘缓存）
  lib/parse.mjs       wikitext 模板解析
  lib/geo.mjs         国家 / 赛区 / 中文国名映射
  fetch-*.mjs         抓取脚本（需要联网，已缓存的不重复请求）
test/
  game.test.ts        比对逻辑单测
  ui.test.mjs         假 DOM 界面集成测试
```

## 已知限制

- 每日答案在 `data.ts` 里用日期哈希选取，纯前端实现，接受答案可被扒源码看到。
- 战队以 2026-06 的 Major 阵容为基准，之后转会的选手不保证是最新队标。
- 3 名选手（cobrazera / piriajr / Sonic）因 Major 数据库中缺记录被剔除。

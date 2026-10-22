// Country -> region buckets used for the "close" hints, plus name -> ISO2.

export const COUNTRY_REGION = {
  // Europe
  fr: 'EU', dk: 'EU', se: 'EU', no: 'EU', fi: 'EU', is: 'EU', de: 'EU', pl: 'EU',
  cz: 'EU', sk: 'EU', hu: 'EU', ro: 'EU', bg: 'EU', rs: 'EU', ba: 'EU', hr: 'EU',
  si: 'EU', mk: 'EU', me: 'EU', al: 'EU', gr: 'EU', uk: 'EU', gb: 'EU', ie: 'EU', nl: 'EU',
  be: 'EU', lu: 'EU', es: 'EU', pt: 'EU', it: 'EU', ch: 'EU', at: 'EU', mt: 'EU',
  cy: 'EU', xk: 'EU', ad: 'EU', mc: 'EU', sm: 'EU', li: 'EU',
  // CIS
  ru: 'CIS', ua: 'CIS', by: 'CIS', kz: 'CIS', ge: 'CIS', am: 'CIS', az: 'CIS',
  md: 'CIS', uz: 'CIS', kg: 'CIS', tj: 'CIS', tm: 'CIS',
  // North America
  us: 'NA', ca: 'NA', mx: 'NA', pr: 'NA', do: 'NA', gt: 'NA', cr: 'NA', pa: 'NA',
  // South America
  br: 'SA', ar: 'SA', cl: 'SA', uy: 'SA', py: 'SA', bo: 'SA', pe: 'SA', co: 'SA',
  ve: 'SA', ec: 'SA',
  // Asia-Pacific (mainland + SEA + East Asia)
  cn: 'APAC', mn: 'APAC', kr: 'APAC', jp: 'APAC', tw: 'APAC', hk: 'APAC', mo: 'APAC',
  sg: 'APAC', my: 'APAC', id: 'APAC', th: 'APAC', vn: 'APAC', ph: 'APAC', kh: 'APAC',
  la: 'APAC', mm: 'APAC', bn: 'APAC', np: 'APAC', lk: 'APAC', in: 'APAC', pk: 'APAC',
  // Oceania
  au: 'OCE', nz: 'OCE',
  // Middle East
  tr: 'ME', il: 'ME', jo: 'ME', lb: 'ME', sy: 'ME', iq: 'ME', ir: 'ME', sa: 'ME',
  ae: 'ME', qa: 'ME', kw: 'ME', bh: 'ME', om: 'ME', ye: 'ME', ps: 'ME',
  // Africa (rare in CS, kept for completeness)
  za: 'OTHER', eg: 'OTHER', ma: 'OTHER', tn: 'OTHER', dz: 'OTHER', ng: 'OTHER',
  ke: 'OTHER', et: 'OTHER', gh: 'OTHER', sn: 'OTHER', ci: 'OTHER', cm: 'OTHER',
};

export const NAME_TO_ISO = {
  france: 'fr', denmark: 'dk', sweden: 'se', norway: 'no', finland: 'fi', iceland: 'is',
  germany: 'de', poland: 'pl', 'czech republic': 'cz', czechia: 'cz', slovakia: 'sk',
  hungary: 'hu', romania: 'ro', bulgaria: 'bg', serbia: 'rs',
  'bosnia and herzegovina': 'ba', bosnia: 'ba', croatia: 'hr', slovenia: 'si',
  macedonia: 'mk', 'north macedonia': 'mk', montenegro: 'me', albania: 'al', greece: 'gr',
  'united kingdom': 'gb', england: 'gb', scotland: 'gb', wales: 'gb', ireland: 'ie',
  netherlands: 'nl', belgium: 'be', luxembourg: 'lu', spain: 'es', portugal: 'pt',
  italy: 'it', switzerland: 'ch', austria: 'at', malta: 'mt', cyprus: 'cy', kosovo: 'xk',
  russia: 'ru', ukraine: 'ua', belarus: 'by', kazakhstan: 'kz', georgia: 'ge',
  armenia: 'am', azerbaijan: 'az', moldova: 'md', uzbekistan: 'uz', kyrgyzstan: 'kg',
  'united states': 'us', usa: 'us', canada: 'ca', mexico: 'mx', 'puerto rico': 'pr',
  brazil: 'br', argentina: 'ar', chile: 'cl', uruguay: 'uy', paraguay: 'py',
  bolivia: 'bo', peru: 'pe', colombia: 'co', venezuela: 've', ecuador: 'ec',
  china: 'cn', mongolia: 'mn', 'south korea': 'kr', korea: 'kr', japan: 'jp',
  taiwan: 'tw', 'hong kong': 'hk', macau: 'mo', singapore: 'sg', malaysia: 'my',
  indonesia: 'id', thailand: 'th', vietnam: 'vn', philippines: 'ph', india: 'in',
  pakistan: 'pk', australia: 'au', 'new zealand': 'nz', turkey: 'tr', israel: 'il',
  jordan: 'jo', lebanon: 'lb', 'saudi arabia': 'sa', 'united arab emirates': 'ae',
  qatar: 'qa', kuwait: 'kw', bahrain: 'bh', oman: 'om', iraq: 'iq', iran: 'ir',
  'south africa': 'za', egypt: 'eg', morocco: 'ma', tunisia: 'tn', algeria: 'dz',
  nigeria: 'ng', kenya: 'ke', ethiopia: 'et', ghana: 'gh', senegal: 'sn',
};

/** Common Liquipedia team -> competitive region. Unknown teams fall back to OTHER. */
export const TEAM_REGION = {
  'team vitality': 'EU',
  'natus vincere': 'CIS',
  'team falcons': 'ME',
  'the mongolz': 'APAC',
  parivision: 'CIS',
  'aurora gaming': 'CIS',
  furia: 'SA',
  mouz: 'EU',
  'fut esports': 'EU',
  'team spirit': 'CIS',
  astralis: 'EU',
  'g2 esports': 'EU',
  legacy: 'SA',
  'pain gaming': 'SA',
  monte: 'CIS',
  '9z team': 'SA',
  gamerlegion: 'EU',
  b8: 'CIS',
  heroic: 'EU',
  'betboom team': 'CIS',
  big: 'EU',
  m80: 'NA',
  mibr: 'SA',
  'sinners esports': 'EU',
  nrg: 'NA',
  tyloo: 'APAC',
  'sharks esports': 'SA',
  'gaimin gladiators': 'EU',
  'team liquid': 'NA',
  'lynn vision gaming': 'APAC',
  thunderdownunder: 'OCE',
  flyquest: 'OCE',
  'virtus.pro': 'CIS',
  'ninjas in pyjamas': 'EU',
  complexity: 'NA',
  'evil geniuses': 'NA',
  'imperial': 'SA',
  'og': 'EU',
  'fnatic': 'EU',
  'cloud9': 'CIS',
  'apeks': 'EU',
  'eternal fire': 'EU',
  'pain gaming': 'SA',
  'wildcard gaming': 'NA',
  'nouns': 'NA',
  'lucky': 'SA',
  'fluxo': 'SA',
  'red canids': 'SA',
  'oddik': 'EU',
  'permitta': 'SA',
  'rhozc': 'SA',
  'sangal': 'ME',
  'eternal': 'EU',
  'bleed esports': 'APAC',
  'rare atom': 'APAC',
  'k23': 'CIS',
  'nemiga gaming': 'CIS',
  'amkal esports': 'CIS',
  'team spirit academy': 'CIS',
};

/** ISO2 -> Chinese country name, for display. Falls back to the ISO code. */
export const ZH_NAME = {
  fr: '法国', dk: '丹麦', se: '瑞典', no: '挪威', fi: '芬兰', is: '冰岛', de: '德国',
  pl: '波兰', cz: '捷克', sk: '斯洛伐克', hu: '匈牙利', ro: '罗马尼亚', bg: '保加利亚',
  rs: '塞尔维亚', ba: '波黑', hr: '克罗地亚', si: '斯洛文尼亚', mk: '北马其顿',
  me: '黑山', al: '阿尔巴尼亚', gr: '希腊', uk: '英国', gb: '英国', ie: '爱尔兰',
  nl: '荷兰', be: '比利时', lu: '卢森堡', es: '西班牙', pt: '葡萄牙', it: '意大利',
  ch: '瑞士', at: '奥地利', mt: '马耳他', cy: '塞浦路斯', xk: '科索沃',
  ru: '俄罗斯', ua: '乌克兰', by: '白俄罗斯', kz: '哈萨克斯坦', ge: '格鲁吉亚',
  am: '亚美尼亚', az: '阿塞拜疆', md: '摩尔多瓦', uz: '乌兹别克斯坦', kg: '吉尔吉斯斯坦',
  us: '美国', ca: '加拿大', mx: '墨西哥', pr: '波多黎各',
  br: '巴西', ar: '阿根廷', cl: '智利', uy: '乌拉圭', py: '巴拉圭', bo: '玻利维亚',
  pe: '秘鲁', co: '哥伦比亚', ve: '委内瑞拉', ec: '厄瓜多尔',
  cn: '中国', mn: '蒙古', kr: '韩国', jp: '日本', tw: '中国台湾', hk: '中国香港',
  mo: '中国澳门', sg: '新加坡', my: '马来西亚', id: '印度尼西亚', th: '泰国',
  vn: '越南', ph: '菲律宾', kh: '柬埔寨', la: '老挝', mm: '缅甸', bn: '文莱',
  np: '尼泊尔', lk: '斯里兰卡', in: '印度', pk: '巴基斯坦',
  au: '澳大利亚', nz: '新西兰',
  tr: '土耳其', il: '以色列', jo: '约旦', lb: '黎巴嫩', sy: '叙利亚', iq: '伊拉克',
  ir: '伊朗', sa: '沙特阿拉伯', ae: '阿联酋', qa: '卡塔尔', kw: '科威特',
  bh: '巴林', om: '阿曼', ye: '也门', ps: '巴勒斯坦',
  za: '南非', eg: '埃及', ma: '摩洛哥', tn: '突尼斯', dz: '阿尔及利亚',
  ng: '尼日利亚', ke: '肯尼亚', et: '埃塞俄比亚', gh: '加纳', sn: '塞内加尔',
  ci: '科特迪瓦', cm: '喀麦隆',
};

export function zhName(iso) {
  return ZH_NAME[iso] ?? String(iso || '').toUpperCase();
}

export function isoOf(country) {
  const key = String(country || '').trim().toLowerCase();
  if (COUNTRY_REGION[key]) return key;
  return NAME_TO_ISO[key] ?? '';
}

export function regionOfCountry(iso) {
  return COUNTRY_REGION[iso] ?? 'OTHER';
}

export function regionOfTeam(team) {
  return TEAM_REGION[String(team || '').trim().toLowerCase()] ?? 'OTHER';
}

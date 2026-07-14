/**
 * 도트 스프라이트 정의.
 *
 * 모든 스프라이트는 16x16 격자. 이모지를 전부 걷어내고 SVG <rect> 격자로 그린다.
 * → 이미지 에셋 없이 색상 스왑 가능, 확대해도 안 뭉개짐(shapeRendering=crispEdges).
 *
 * 문자 코드
 *   .  투명
 *   1  몸통(플레이어 선택 색)
 *   2  몸통 음영(자동 계산)
 *   3  피부
 *   4  외곽선/눈
 *   A  아이템 메인색
 *   B  아이템 서브색
 *   C  아이템 포인트색
 */

/** 희소 정의(행 번호 → 문자열)를 16x16 완성 격자로 편다. 짧은 행은 가운데 정렬. */
const grid = (rows) =>
  Array.from({ length: 16 }, (_, y) => {
    const s = (rows[y] ?? '').slice(0, 16);
    const left = Math.floor((16 - s.length) / 2);
    return '.'.repeat(left) + s + '.'.repeat(16 - s.length - left);
  });

// ── 캐릭터 본체 ───────────────────────────────────────────────
export const BODY = grid({
  0:  '.....111111.....',
  1:  '....13333331....',
  2:  '...1333333331...',
  3:  '...1334334331...',
  4:  '...1333333331...',
  5:  '...1344444331...',
  6:  '....13333331....',
  7:  '.....111111.....',
  8:  '...1111111111...',
  9:  '..111111111111..',
  10: '..111222221111..',
  11: '..111222221111..',
  12: '...1122222211...',
  13: '....133..331....',
  14: '....133..331....',
  15: '....222..222....',
});

// ── 모자 ─────────────────────────────────────────────────────
export const HATS = {
  h_cap: {
    rows: grid({ 0: '.....AAAAAA.....', 1: '....AAAAAAAA....', 2: '...BBBBBBBBBBB..' }),
    palette: { A: '#ef4444', B: '#b91c1c' },
  },
  h_crown: {
    rows: grid({ 0: '....C.C..C.C....', 1: '....AAAAAAAA....', 2: '....ACAAAACA....' }),
    palette: { A: '#fbbf24', B: '#b45309', C: '#f87171' },
  },
  h_chef: {
    rows: grid({ 0: '....AAAAAAAA....', 1: '...AAAAAAAAAA...', 2: '....BBBBBBBB....' }),
    palette: { A: '#f8fafc', B: '#cbd5e1' },
  },
  h_straw: {
    rows: grid({ 0: '.....AAAAAA.....', 1: '....AAAAAAAA....', 2: '..BBBBBBBBBBBB..' }),
    palette: { A: '#facc15', B: '#a16207' },
  },
  h_band: {
    rows: grid({ 1: '....AAAAAAAA....', 2: '....ACCAACCA....' }),
    palette: { A: '#f472b6', C: '#fff1f2' },
  },
  h_horn: {
    rows: grid({ 0: '...A......A.....', 1: '...AA....AA.....', 2: '....BB..BB......' }),
    palette: { A: '#e2e8f0', B: '#94a3b8' },
  },
  h_beret: {
    rows: grid({ 0: '......CC........', 1: '...AAAAAAAA.....', 2: '...BBBBBBBB.....' }),
    palette: { A: '#7c3aed', B: '#4c1d95', C: '#facc15' },
  },
  h_pot: {
    rows: grid({ 0: '...AAAAAAAAA....', 1: '...ABBBBBBBA....', 2: '..AAAAAAAAAAA...' }),
    palette: { A: '#9ca3af', B: '#4b5563' },
  },
  h_helmet: {
    rows: grid({ 0: '....AAAAAAAA....', 1: '...ACCCCCCCA....', 2: '...AAAAAAAAA....' }),
    palette: { A: '#0ea5e9', C: '#bae6fd' },
  },
};

// ── 악세서리 ─────────────────────────────────────────────────
export const ACCESSORIES = {
  a_glasses: {
    rows: grid({ 3: '...AABBAABBAA...' }),
    palette: { A: '#1f2937', B: '#60a5fa' },
  },
  a_scarf: {
    rows: grid({ 7: '....AAAAAA......', 8: '..AAAAAAAAAA....', 9: '..AB........AA..' }),
    palette: { A: '#dc2626', B: '#7f1d1d' },
  },
  a_bag: {
    rows: grid({ 9: '.............AA.', 10: '............AAA.', 11: '............ABA.', 12: '............AAA.' }),
    palette: { A: '#22c55e', B: '#166534' },
  },
  a_cape: {
    rows: grid({ 8: '.A............A.', 9: '.AA..........AA.', 10: '.AA..........AA.', 11: '.AB..........BA.', 12: '.AB..........BA.' }),
    palette: { A: '#a855f7', B: '#6b21a8' },
  },
  a_wings: {
    rows: grid({ 9: '.AA........AA...', 10: 'AAAA......AAAA..', 11: '.AA........AA...' }),
    palette: { A: '#f0f9ff' },
  },
  a_chopstick: {
    rows: grid({ 8: '..............A.', 9: '.............A..', 10: '............A...', 11: '...........A....' }),
    palette: { A: '#d97706' },
  },
  a_spoon: {
    rows: grid({ 7: '.A..............', 8: 'AAA.............', 9: '.A..............', 10: '.A..............' }),
    palette: { A: '#cbd5e1' },
  },
  a_apron: {
    rows: grid({ 10: '....AAAAAA......', 11: '....AAAAAA......', 12: '....ABBBBA......' }),
    palette: { A: '#fda4af', B: '#be123c' },
  },
};

// ── 맛몬 (기존 이모지 → 도트) ────────────────────────────────
export const MATMON_SPRITES = {
  m_bap: {
    rows: grid({ 4: '....AAAAAA....', 5: '...AAAAAAAA...', 6: '..AAAAAAAAAA..', 7: '..ABAAAABAA...', 8: '..AAAAAAAAAA..', 9: '...AAAAAAAA...', 10: '....BBBBBB....' }),
    palette: { A: '#f8fafc', B: '#cbd5e1' },
  },
  m_kimchi: {
    rows: grid({ 3: '.....AA.AA....', 4: '....AAAAAAA...', 5: '...AAABBBAAA..', 6: '...AABBBBBAA..', 7: '...ABBBBBBBA..', 8: '...AABBBBBAA..', 9: '....AAAAAAA...', 10: '.....AAAAA....' }),
    palette: { A: '#4ade80', B: '#dc2626' },
  },
  m_ddeok: {
    rows: grid({ 4: '.....AA.......', 5: '....AAAA......', 6: '...AABBAA.....', 7: '...ABBBBA.....', 8: '...ABBBBA.....', 9: '...AABBAA.....', 10: '....AAAA......' }),
    palette: { A: '#dc2626', B: '#fca5a5' },
  },
  m_chicken: {
    rows: grid({ 3: '.....AAA......', 4: '....AAAAA.....', 5: '...AABAABA....', 6: '...AAAAAAA....', 7: '....AAAAA.....', 8: '.....BBB......', 9: '.....BBB......' }),
    palette: { A: '#d97706', B: '#fef3c7' },
  },
  m_sushi: {
    rows: grid({ 5: '...AAAAAAAA...', 6: '..ABBBBBBBBA..', 7: '..ACCCCCCCCA..', 8: '..AAAAAAAAAA..', 9: '...BBBBBBBB...' }),
    palette: { A: '#1f2937', B: '#fb7185', C: '#f8fafc' },
  },
  m_ramen: {
    rows: grid({ 4: '...B..B..B....', 5: '..AAAAAAAAA...', 6: '..ACCCCCCCA...', 7: '..AACCCCCAA...', 8: '...AAAAAAA....', 9: '....AAAAA.....' }),
    palette: { A: '#dc2626', B: '#fbbf24', C: '#fde68a' },
  },
  m_pizza: {
    rows: grid({ 4: '......A.......', 5: '.....AAA......', 6: '....ABABA.....', 7: '...AAAAAAA....', 8: '..ABAAAABA....', 9: '..CCCCCCCCC...' }),
    palette: { A: '#fbbf24', B: '#dc2626', C: '#d97706' },
  },
  m_cake: {
    rows: grid({ 3: '......C.......', 4: '......C.......', 5: '...AAAAAAA....', 6: '...ABBBBBA....', 7: '...AAAAAAA....', 8: '...ABBBBBA....', 9: '...AAAAAAA....' }),
    palette: { A: '#fbcfe8', B: '#a21caf', C: '#facc15' },
  },
  m_burger: {
    rows: grid({ 4: '...AAAAAAA....', 5: '..AAAAAAAAA...', 6: '..BBBBBBBBB...', 7: '..CCCCCCCCC...', 8: '..BBBBBBBBB...', 9: '..AAAAAAAAA...' }),
    palette: { A: '#d97706', B: '#16a34a', C: '#7c2d12' },
  },
  m_golden: {
    rows: grid({ 3: '....AAAAAA....', 4: '...AAAAAAAA...', 5: '..AABBBBBBAA..', 6: '..ABCCCCCCBA..', 7: '..ABCCCCCCBA..', 8: '..AABBBBBBAA..', 9: '...AAAAAAAA...', 10: '....AAAAAA....' }),
    palette: { A: '#facc15', B: '#f59e0b', C: '#fef9c3' },
  },
};

// ── 맛집 카테고리 아이콘 (이모지 대체) ───────────────────────
export const FOOD_SPRITES = {
  한식: {
    rows: grid({ 3: '...AAAAAAAA...', 4: '..ABBBBBBBBA..', 5: '..ABCCCCCCBA..', 6: '..ABCCCCCCBA..', 7: '..AABBBBBBAA..', 8: '.AAAAAAAAAAAA.', 9: '..AA......AA..' }),
    palette: { A: '#94a3b8', B: '#64748b', C: '#f87171' },
  },
  중식: {
    rows: grid({ 3: '.....AAAA.....', 4: '...AAAAAAAA...', 5: '..AABBBBBBAA..', 6: '..ABBCCCCBBA..', 7: '..ABBBBBBBBA..', 8: '...AAAAAAAA...', 9: '.....CCCC.....' }),
    palette: { A: '#fbbf24', B: '#d97706', C: '#fde68a' },
  },
  일식: {
    rows: grid({ 4: '..AAAAAAAAAA..', 5: '..ABBBBBBBBA..', 6: '..ACCCCCCCCA..', 7: '..AAAAAAAAAA..', 8: '...BBBBBBBB...' }),
    palette: { A: '#1f2937', B: '#fb7185', C: '#f8fafc' },
  },
  양식: {
    rows: grid({ 3: '..A........B..', 4: '..A........B..', 5: '..A.CCCCCC.B..', 6: '..A.CCCCCC.B..', 7: '..A.CCCCCC.B..', 8: '..A........B..', 9: '..A........B..' }),
    palette: { A: '#cbd5e1', B: '#94a3b8', C: '#f8fafc' },
  },
  분식: {
    rows: grid({ 3: '....AA..AA....', 4: '...AAAAAAAA...', 5: '..AABBBBBBAA..', 6: '..ABBBBBBBBA..', 7: '..AABBBBBBAA..', 8: '...AAAAAAAA...', 9: '....AA..AA....' }),
    palette: { A: '#dc2626', B: '#fca5a5' },
  },
  치킨: {
    rows: grid({ 3: '.....AAA......', 4: '...AAAAAAA....', 5: '..AABAAABAA...', 6: '..AAAAAAAAA...', 7: '...AAAAAAA....', 8: '.....BBB......', 9: '.....BBB......' }),
    palette: { A: '#d97706', B: '#fef3c7' },
  },
  해산물: {
    rows: grid({ 4: '....AAAAAA....', 5: '...ABBBBBBA...', 6: '..ABBCCCCBBA..', 7: '..ABBBBBBBBA..', 8: '..AAAAAAAAAA..', 9: '...A.A..A.A...' }),
    palette: { A: '#38bdf8', B: '#0ea5e9', C: '#f8fafc' },
  },
  카페: {
    rows: grid({ 3: '...BB.........', 4: '..AAAAAAAA.CC.', 5: '..ABBBBBBA.C.C', 6: '..ABBBBBBA.CC.', 7: '..AABBBBAA....', 8: '...AAAAAA.....', 9: '..AAAAAAAA....' }),
    palette: { A: '#f8fafc', B: '#78350f', C: '#cbd5e1' },
  },
};

// ── 지도 마커 (이모지 🚩/🟩 대체) ────────────────────────────
export const FLAG_TODO = {
  rows: grid({
    1: '...AAAAAAA....',
    2: '...ABBBBBA....',
    3: '...AAAAAAA....',
    4: '...C..........',
    5: '...C..........',
    6: '...C..........',
    7: '...C..........',
    8: '..CCC.........',
  }),
  palette: { A: '#ef4444', B: '#fca5a5', C: '#64748b' },
};

export const FLAG_DONE = {
  rows: grid({
    1: '...AAAAAAA....',
    2: '...ABBBBBA....',
    3: '...AAAAAAA....',
    4: '...C..........',
    5: '...C..........',
    6: '...C..........',
    7: '...C..........',
    8: '..CCC.........',
  }),
  palette: { A: '#22c55e', B: '#bbf7d0', C: '#64748b' },
};

/** 몸통색에서 음영색을 만든다 */
export const shade = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, v));
  const r = c(((n >> 16) & 255) + amt);
  const g = c(((n >> 8) & 255) + amt);
  const b = c((n & 255) + amt);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
};

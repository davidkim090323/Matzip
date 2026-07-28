/**
 * 도트 스프라이트 정의.
 * 16x16 격자를 SVG <rect> 로 그린다(이미지 에셋 없음, 확대해도 안 뭉개짐).
 * 맛몬 50종은 각자 이름에 맞는 고유 실루엣으로 손으로 그렸고, 외곽선은 withOutline 이 자동으로 두른다.
 */

/** 희소 정의(행 번호 → 문자열)를 16x16 완성 격자로 편다. 짧은 행은 가운데 정렬. */
const grid = (rows) =>
  Array.from({ length: 16 }, (_, y) => {
    const s = (rows[y] ?? '').slice(0, 16);
    const left = Math.floor((16 - s.length) / 2);
    return '.'.repeat(left) + s + '.'.repeat(16 - s.length - left);
  });

/** 몸통색에서 음영색을 만든다 */
export const shade = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, v));
  const r = c(((n >> 16) & 255) + amt);
  const g = c(((n >> 8) & 255) + amt);
  const b = c((n & 255) + amt);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
};

/** 채워진 픽셀 둘레에 외곽선(X)을 자동으로 두른다 → 실루엣이 또렷해진다 */
function withOutline(rows16, X = 'X') {
  const G = rows16.map((r) => r.split(''));
  const solid = (y, x) => G[y] && G[y][x] && G[y][x] !== '.' && G[y][x] !== X;
  return G.map((row, y) =>
    row.map((c, x) => {
      if (c !== '.') return c;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([a, b]) => solid(y + b, x + a));
      return near ? X : '.';
    }).join('')
  );
}

const OUT = '#2f2013';
const EYE = '#241a12';
/** 맛몬 스프라이트 헬퍼: 채색 rows + palette. 외곽선 X 는 자동. */
const M = (rows, palette, outline = OUT) => ({ rows: withOutline(grid(rows)), palette: { X: outline, e: EYE, w: '#ffffff', ...palette } });

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

const RARITY_ORDER = ['N', 'R', 'SR', 'SSR'];

/* ══════════════════════════════════════════════════════════════
   맛몬 50종 — 이름별 고유 도트
   ══════════════════════════════════════════════════════════════ */
const MATMON_DEFS = [
  // ── N ──
  ['m01', '밥알몬', 'N', M(
    { 3: 'AAAAAA', 4: 'AAAAAAAA', 5: 'AAAAAAAAAA', 6: 'AeAAAAAAeA', 7: 'AAAAAAAAAA', 8: 'AABmmmmBAA', 9: 'AAAAAAAAAA', 10: 'AAAAAAAA', 11: 'AAAAAA' },
    { A: '#f6f1e1', B: '#e6ddc6', m: '#d98d86' })],
  ['m02', '김치몬', 'N', M(
    { 3: 'AABBBBAA', 4: 'ABBBBBBBA', 5: 'ABBCCCCBBA', 6: 'ABeCCCCeBA', 7: 'ABCCCCCCBA', 8: 'ABCCmmCCBA', 9: 'ABBCCCCBBA', 10: 'AABBBBBBAA', 11: '.AABBBBAA.' },
    { A: '#3fae5a', B: '#d1352a', C: '#e8574a', m: '#7a1410' })],
  ['m03', '콩자반몬', 'N', M(
    { 6: 'AA.AAA.AA', 7: 'AeA.AeA.AA', 8: 'AAA.AAA.AA', 9: '.AA.AAA.A.', 10: 'AA.AAA.AA.', 11: 'AeA.AAA.AA', 12: 'AAA.AAA.AA' },
    { A: '#2c2a3a' }, '#141320')],
  ['m04', '두부몬', 'N', M(
    { 4: 'AAAAAAAAAA', 5: 'ABBBBBBBBA', 6: 'ABeBBBBeBA', 7: 'ABBBBBBBBA', 8: 'ABBBmmBBBA', 9: 'ABBBBBBBBA', 10: 'ABBBBBBBBA', 11: 'AAAAAAAAAA' },
    { A: '#f2f4f2', B: '#fbfdfb', m: '#cbb6a6' }, '#c8cdc8')],
  ['m05', '어묵몬', 'N', M(
    { 2: '......D.', 3: '.AAAAAD.', 4: 'AABBBBAAD', 5: 'ABeBBBeBAD', 6: 'ABBBBBBBA', 7: 'ABBmmmBBA', 8: 'AABBBBBAA', 9: '.AAAAAAA.', 10: '.....D..', 11: '.....D..' },
    { A: '#caa06a', B: '#f0d8b0', D: '#8a5a2a', m: '#a8703a' })],
  ['m07', '순대몬', 'N', M(
    { 4: 'AAAAAA', 5: 'AABBBBAA', 6: 'ABwBBBwBA', 7: 'ABeBBBeBA', 8: 'ABBBBBBBA', 9: 'ABBCmmCBA', 10: 'AABBBBBAA', 11: '.AAAAAAA.' },
    { A: '#3a2733', B: '#54394b', C: '#7a5468', m: '#20141c' }, '#1c1219')],
  ['m11', '치즈몬', 'N', M(
    { 3: 'AAAAAAAAAAAA', 4: 'ABBBBBBBBBBA', 5: '.ABDBBBBBDBA', 6: '..ABeBBBeBA', 7: '...ABBmmBBA', 8: '....ABDBBA', 9: '.....ABBA', 10: '......AA' },
    { A: '#e0a41f', B: '#f6c23b', D: '#c98a12', m: '#8a5a08' }, '#8a5a08')],
  ['m12', '감자몬', 'N', M(
    { 4: '.AAAAA.', 5: 'AADAAAAA', 6: 'AAAAADAAA', 7: 'AeAAAAAeA', 8: 'AAADAAAAA', 9: 'AAAAmmAAA', 10: 'AAAADAAA', 11: '.AAAAAA.' },
    { A: '#c8a56a', D: '#9c7a44', m: '#7a5a30' }, '#7a5a34')],
  ['m13', '고구마몬', 'N', M(
    { 3: '.....AA', 4: '....AAA', 5: '...AABA', 6: '..AABeA', 7: '.AABBBA', 8: 'AABBBeA', 9: 'ABBmmBA', 10: 'ABBBBA', 11: 'AABBA', 12: '.AAA' },
    { A: '#8a4f9e', B: '#a86bbd', m: '#e8b84a' }, '#5a2f6e')],
  ['m14', '옥수수몬', 'N', M(
    { 2: '.CC.CC.', 3: 'ABABABA', 4: 'ABABABA', 5: 'AeABAeA', 6: 'ABABABA', 7: 'ABmmmBA', 8: 'ABABABA', 9: 'ABABABA', 10: '.AAAAA.' },
    { A: '#e8c73a', B: '#f6e27a', C: '#4fae5a', m: '#b8922a' }, '#a8861a')],
  ['m15', '달걀몬', 'N', M(
    { 3: '.AAAAAA.', 4: 'AAAAAAAA', 5: 'AABBBBAA', 6: 'ABBBBBBA', 7: 'ABeBBeBA', 8: 'ABBmmBBA', 9: 'AABBBBAA', 10: '.AAAAAA.' },
    { A: '#fbfbf5', B: '#ffc83a', m: '#d98d3a' }, '#dcdcce')],
  ['m16', '주먹밥몬', 'N', M(
    { 3: '....AA....', 4: '...AAAA...', 5: '..AAAAAA..', 6: '.AAeAAeAA.', 7: 'AAAAAAAAAA', 8: 'AAAAmmAAAA', 9: 'DDDDDDDDDD', 10: 'DDDDDDDDDD' },
    { A: '#fbfbf3', D: '#31414a', m: '#d98d86' }, '#26333a')],
  ['m17', '누룽지몬', 'N', M(
    { 4: '.AAAAAAAA.', 5: 'ADAAADAAA', 6: 'AAAeAAeAAD', 7: 'ADAAAAAAAA', 8: 'AAAAmmAADA', 9: 'ADAAADAAAA', 10: '.AAAAAAAA.' },
    { A: '#d9a24a', D: '#a8722a', m: '#7a5020' }, '#7a5020')],
  ['m18', '호빵몬', 'N', M(
    { 3: '...AAAA...', 4: '..AAAAAA..', 5: '.AAAAAAAA.', 6: 'AAAeAAeAAA', 7: 'AAAAAAAAAA', 8: 'AAAAmmAAAA', 9: '.AAAAAAAA.', 10: '..AAAAAA..' },
    { A: '#fbf6ee', m: '#d98d86' }, '#e3d8c4')],
  ['m20', '핫도그몬', 'N', M(
    { 1: '.....A.', 2: '....BBB', 3: '...BBBBB', 4: '..BBBBBB', 5: '.BBeBBBB', 6: 'BBBBBBBB', 7: 'BBBmBBB', 8: 'CBBBBBC', 9: 'CCBBBCC', 10: '.CCCCC.', 11: '.CCCCC.' },
    { A: '#f0c23a', B: '#b06a2a', C: '#e0a84a', m: '#7a4418' }, '#7a4a1e')],
  ['m27', '곱창몬', 'N', M(
    { 4: 'AABAAA', 5: 'ABBBBBA', 6: 'ABeBBeBA', 7: 'ABBBBBBBA', 8: 'ABBmmBBBA', 9: 'AABBBBBAA', 10: '.ABBBBA.', 11: '..AAAA..' },
    { A: '#c98a86', B: '#e6b3ad', m: '#8a4a44' }, '#9a5a54')],
  ['m29', '해장몬', 'N', M(
    { 4: 'DDDDDDDDDD', 5: 'DAAAAAAAAD', 6: 'DAeCCCCeAD', 7: 'DACCmmCCAD', 8: 'DAACCCCAAD', 9: '.DAAAAAAD.', 10: '..DDDDDD..' },
    { A: '#e7d9b8', C: '#d16a3a', D: '#8a6a3a', m: '#7a2a10' }, '#5a4020')],
  ['m30', '국밥몬', 'N', M(
    { 4: 'DDDDDDDDDD', 5: 'DAAAAAAAAD', 6: 'DAweCCewAD', 7: 'DACCCCCCAD', 8: 'DAACmmCAAD', 9: '.DAAAAAAD.', 10: '..DDDDDD..' },
    { A: '#efe6cf', C: '#c98a5a', D: '#9a7a4a', m: '#7a4a2a' }, '#6a4a24')],
  ['m46', '푸딩몬', 'N', M(
    { 3: '.CCCCCC.', 4: 'AAAAAAAA', 5: 'ABBBBBBA', 6: 'ABeBBeBA', 7: 'ABBmmBBA', 8: 'ABBBBBBA', 9: 'AABBBBAA', 10: '.AAAAAA.' },
    { A: '#e0a63a', B: '#f6cf6a', C: '#7a3a1a', m: '#8a5020' }, '#a8702a')],
  ['m47', '초코몬', 'N', M(
    { 4: 'AAAAAAAAAA', 5: 'ABBAABBAAB', 6: 'AweAABBAAB', 7: 'ABBAABBAAB', 8: 'ABBmmBBAAB', 9: 'ABBAABBAAB', 10: 'AAAAAAAAAA' },
    { A: '#5a3418', B: '#7a4a24', m: '#2a1408' }, '#3a2010')],
  // ── R ──
  ['m06', '만두몬', 'R', M(
    { 3: '.C.C.C.C.', 4: 'AAAAAAAAAA', 5: 'ABBBBBBBBA', 6: 'ABeBBBBeBA', 7: 'ABBBBBBBBA', 8: 'ABBBmmBBBA', 9: 'AABBBBBBAA', 10: '.AAAAAAAA.' },
    { A: '#e9dcc0', B: '#f6ecd6', C: '#cdbf9e', m: '#c88a7a' }, '#c3b48e')],
  ['m08', '떡볶몬', 'R', M(
    { 4: 'AAAA.AAAA', 5: 'ABBA.ABBA', 6: 'ABeA.AeBA', 7: 'ABBACABBA', 8: 'ABBCCCBBA', 9: 'ABBCmCBBA', 10: 'ABBACABBA', 11: 'AAAA.AAAA' },
    { A: '#d13a2a', B: '#f0e6d0', C: '#e8574a', m: '#7a1410' }, '#8a1e14')],
  ['m09', '김밥몬', 'R', M(
    { 3: '.DDDDDD.', 4: 'DDAAAADD', 5: 'DAACCAAD', 6: 'DAeCCeAD', 7: 'DACGGCAD', 8: 'DACmmCAD', 9: 'DDAAAADD', 10: '.DDDDDD.' },
    { A: '#fbf6ea', C: '#e8934a', G: '#4fae5a', D: '#26333a', m: '#c85a3a' }, '#1c2830')],
  ['m10', '라면몬', 'R', M(
    { 3: 'C..C..C.', 4: 'AAAAAAAAAA', 5: 'ABYYYYYBBA', 6: 'AYeYYYYeYA', 7: 'AYYYYYYYYA', 8: 'AYYYmmYYYA', 9: 'AABYYYYBAA', 10: '.AAAAAAAA.' },
    { A: '#d64a3a', B: '#e88a4a', Y: '#f6d86a', C: '#e8e8e8', m: '#8a2a1a' }, '#9a2e1e')],
  ['m19', '붕어빵몬', 'R', M(
    { 4: '.AAAAA..', 5: 'AABBBAAD', 6: 'ABeBBBAD', 7: 'ABBBBBAAD', 8: 'ABBmmBBAD', 9: 'ABBBBBAAD', 10: 'AABBBAAD', 11: '.AAAAA..' },
    { A: '#c98a3a', B: '#e8b95a', D: '#a86a2a', m: '#7a4a18' }, '#8a5a1e')],
  ['m21', '치킨몬', 'R', M(
    { 3: '..AAAA..', 4: '.AAAAAA.', 5: 'AABAABAA', 6: 'AAeAAeAA', 7: 'AAAAAAAA', 8: '.AAmmAA.', 9: '..BBBB..', 10: '..wBBw..', 11: '...ww...' },
    { A: '#cf8a2a', B: '#f0d07a', m: '#7a4a14', w: '#f0eede' }, '#8a5a18')],
  ['m22', '족발몬', 'R', M(
    { 3: '..AAAA..', 4: '.AABBAA.', 5: 'AABBBBAA', 6: 'ABeBBeBA', 7: 'ABBBBBBA', 8: 'ABBmmBBA', 9: 'AAwBBwAA', 10: '.AwwwwA.', 11: '..wwww..' },
    { A: '#8a4a2a', B: '#b06a3a', m: '#3a1a0a', w: '#e8d0b0' }, '#5a2e18')],
  ['m23', '보쌈몬', 'R', M(
    { 4: '.AAAAAA.', 5: 'AGGGGGGA', 6: 'AGBBBBGA', 7: 'AGeBBeGA', 8: 'AGBmmBGA', 9: 'AGBBBBGA', 10: 'AGGGGGGA', 11: '.AAAAAA.' },
    { A: '#c98a6a', B: '#e8c0a0', G: '#5aae4a', m: '#7a3a2a' }, '#7a4a30')],
  ['m25', '불고기몬', 'R', M(
    { 4: '.AAAAAA.', 5: 'AABBBBAA', 6: 'ABeCCeBA', 7: 'ABCCCCBA', 8: 'ABCmmCBA', 9: 'AABCCBAA', 10: '.AABBAA.', 11: '..AAAA..' },
    { A: '#6a3a24', B: '#9a5a34', C: '#c07a44', m: '#3a1c0e' }, '#4a2716')],
  ['m26', '삼겹살몬', 'R', M(
    { 4: 'AAAAAAAAAA', 5: 'ABBBBBBBBA', 6: 'ACeCCCCeCA', 7: 'ABBBBBBBBA', 8: 'ACCmmCCCCA', 9: 'ABBBBBBBBA', 10: 'ACCCCCCCCA', 11: 'AAAAAAAAAA' },
    { A: '#e8b3a0', B: '#f2d0bf', C: '#c86a5a', m: '#8a3a2a' }, '#b06a5a')],
  ['m28', '전골몬', 'R', M(
    { 3: 'D......D', 4: 'DDDDDDDDDD', 5: 'DACGCRCAD', 6: 'DAeCCCeAD', 7: 'DACRCGCAD', 8: 'DAACmCAAD', 9: '.DAAAAAAD.', 10: '..DDDDDD..' },
    { A: '#e7d3a8', C: '#d98a4a', G: '#5aae4a', R: '#d13a2a', D: '#555', m: '#7a3a1a' }, '#333')],
  ['m32', '회오리몬', 'R', M(
    { 2: '...AAA...', 3: '..ABBBA..', 4: '.ABAAABA.', 5: 'ABAeAeAB', 6: 'ABAAmAAB', 7: 'ABAAAABA', 8: '.ABBBBA.', 9: '..ABBA..', 10: '...AA...', 11: '...CC...', 12: '...CC...' },
    { A: '#e8a83a', B: '#f6cf6a', C: '#a86a2a', m: '#8a4a18' }, '#a86a1e')],
  ['m37', '파스타몬', 'R', M(
    { 3: 'YYYYYYYY', 4: 'YAYAYAYAY', 5: 'AYeYYYeYA', 6: 'YAYYYYYAY', 7: 'AYYmmYYA', 8: 'RRRRRRRR', 9: 'ADDDDDDA', 10: '.AAAAAA.' },
    { A: '#e7c86a', Y: '#f2dd8a', R: '#d13a2a', D: '#c9c9c9', m: '#8a5a18' }, '#b8963a')],
  ['m39', '버거몬', 'R', M(
    { 3: '.AAAAAA.', 4: 'AAAAAAAA', 5: 'AABwwBAA', 6: 'GGGGGGGG', 7: 'RReRReRR', 8: 'CCmmCCCC', 9: 'GGGGGGGG', 10: 'ABBBBBBA', 11: '.AAAAAA.' },
    { A: '#e0a84a', B: '#f0c86a', G: '#4fae5a', R: '#c85a3a', C: '#7a4a24', w: '#fff2c0', m: '#3a1c0e' }, '#8a5a24')],
  ['m40', '타코몬', 'R', M(
    { 4: 'AAAAAAAAAA', 5: 'ABGRYGBRA', 6: 'AGeYRGYeA', 7: 'ARYGmYGRA', 8: 'CCCCCCCCCC', 9: '.CCCCCCCC.', 10: '..CCCCCC..' },
    { A: '#f0d07a', C: '#e8c05a', G: '#4fae5a', R: '#d13a2a', Y: '#f2dd6a', m: '#7a4a18' }, '#b8923a')],
  ['m44', '빙수몬', 'R', M(
    { 2: '...RR...', 3: '..AAAA..', 4: '.AAAAAA.', 5: 'AAeAAeAA', 6: 'AAAmmAAA', 7: 'AAAAAAAA', 8: '.CCCCCC.', 9: '..CCCC..', 10: '...CC...' },
    { A: '#eaf4fb', C: '#bfe0e8', R: '#e05a7a', m: '#5a8aa0' }, '#9ac4d0')],
  ['m45', '아이스몬', 'R', M(
    { 2: '..AAAA..', 3: '.AAAAAA.', 4: 'AABBBBAA', 5: 'ABeBBeBA', 6: 'ABBmmBBA', 7: '.AAAAAA.', 8: '..DDDD..', 9: '..DGGD..', 10: '...DD...', 11: '...D....' },
    { A: '#f6b3c8', B: '#fbd0dd', D: '#c98a4a', G: '#e0b070', m: '#a85a6a' }, '#c88a9a')],
  // ── SR ──
  ['m24', '갈비몬', 'SR', M(
    { 4: 'ww....ww', 5: 'wAA..AAw', 6: 'AABAABAA', 7: 'ABeAABeA', 8: 'ABBAABBA', 9: 'ABBmmBBA', 10: 'AABBBBAA', 11: '.AAAAAA.' },
    { A: '#7a3a24', B: '#a85a34', w: '#f0e6d0', m: '#3a1a0a' }, '#4a2414')],
  ['m31', '초밥몬', 'SR', M(
    { 4: '.RRRRRR.', 5: 'RRRRRRRR', 6: 'RRwRRwRR', 7: 'AAAAAAAA', 8: 'AAeAAeAA', 9: 'AAAmmAAA', 10: 'AAAAAAAA', 11: 'GAAAAAAG' },
    { A: '#fbf6ea', R: '#f0708a', G: '#3a3a3a', w: '#fbb', m: '#c85a5a' }, '#3a2a2a')],
  ['m33', '문어몬', 'SR', M(
    { 3: '..AAAA..', 4: '.AAAAAA.', 5: 'AABAABAA', 6: 'AAeAAeAA', 7: 'AAAAAAAA', 8: 'AAAmmAAA', 9: 'AAAAAAAA', 10: 'A.A.A.A.A', 11: '.A.A.A.A.' },
    { A: '#e0567a', B: '#f2a0b0', m: '#8a2a44' }, '#a02e50')],
  ['m34', '새우몬', 'SR', M(
    { 3: '.......A', 4: '.....AAA', 5: '...AAABA', 6: '..AABeBA', 7: '.AABBBA', 8: 'AABBBA', 9: 'ABBmA', 10: 'ABBA', 11: 'CAAC', 12: '.CC' },
    { A: '#f0885a', B: '#f6b090', C: '#d1502a', m: '#8a3a1a' }, '#c04a24')],
  ['m36', '스테이크몬', 'SR', M(
    { 4: '.AAAAAAA.', 5: 'AABBBBBAA', 6: 'ABeBBBeBA', 7: 'ABBRRRBBA', 8: 'ABRmmRRBA', 9: 'ABBRRRBBA', 10: 'AABBBBBAA', 11: '.AAAAAAA.' },
    { A: '#6a3320', B: '#9a5030', R: '#c85a5a', m: '#3a160a' }, '#42200f')],
  ['m38', '피자몬', 'SR', M(
    { 3: '......A', 4: '.....AAA', 5: '....ARAA', 6: '...AAeAA', 7: '..ACAAAA', 8: '.AAAmAAA', 9: 'AARAAACA', 10: 'DDDDDDDD' },
    { A: '#f0c23a', R: '#d13a2a', C: '#4fae5a', D: '#c98a4a', e: EYE, m: '#8a5010' }, '#b8863a')],
  ['m41', '케이크몬', 'SR', M(
    { 2: '...C....', 3: '..AAA...', 4: '.AAAAA..', 5: 'PPPPPPP', 6: 'AeAAeAA', 7: 'AAAmAAA', 8: 'PPPPPPP', 9: 'AAAAAAA', 10: 'DDDDDDD' },
    { A: '#f9d3e0', P: '#e0567a', C: '#e05a5a', D: '#c98a5a', e: EYE, m: '#b04a6a' }, '#d19ab0')],
  ['m42', '마카롱몬', 'SR', M(
    { 4: '.AAAAAA.', 5: 'AAAAAAAA', 6: 'AeAAAAeA', 7: 'CCCCCCCC', 8: 'AAAmmAAA', 9: 'AAAAAAAA', 10: '.AAAAAA.' },
    { A: '#a3e0d0', C: '#f0d0a0', m: '#5a8a7a' }, '#7ac0b0')],
  ['m43', '도넛몬', 'SR', M(
    { 3: '.AAAAAA.', 4: 'AACCCCAA', 5: 'ACeCCeCA', 6: 'ACC..CCA', 7: 'ACC..CCA', 8: 'ACCmmCCA', 9: 'AACCCCAA', 10: '.AAAAAA.' },
    { A: '#c98a4a', C: '#f6b8d0', m: '#8a4a6a' }, '#8a5a2a')],
  // ── SSR ──
  ['m35', '랍스터몬', 'SSR', M(
    { 2: 'A..A..A..A', 3: 'AA.AAAA.AA', 4: '.AABAABAA.', 5: '..AAeeAA..', 6: '.AAAAAAAA.', 7: 'AAAAmmAAAA', 8: '.AAAAAAAA.', 9: '..AAAAAA..', 10: '.A.AAAA.A.', 11: 'A..A..A..A' },
    { A: '#e03a2a', B: '#f28a6a', m: '#8a1a10' }, '#a01c12')],
  ['m48', '황금몬', 'SSR', M(
    { 2: '...C..C...', 3: '..AAAAAA..', 4: '.AABBBBAA.', 5: 'AABGGGGBAA', 6: 'ABGeGGeGBA', 7: 'ABGGGGGGBA', 8: 'ABGGmmGGBA', 9: 'AABGGGGBAA', 10: '.AABBBBAA.', 11: '..AAAAAA..' },
    { A: '#b8860b', B: '#e0a83a', G: '#f6d24a', C: '#fff2a0', m: '#7a5008' }, '#7a5008')],
  ['m49', '무지개몬', 'SSR', M(
    { 3: '.RRRRRR.', 4: 'ROOOOOOR', 5: 'ROYYYYOR', 6: 'RYeGGeYR', 7: 'RYGGGGYR', 8: 'ROGmmGOR', 9: 'RBOOOOBR', 10: '.PBBBBP.' },
    { R: '#e0453a', O: '#f2913a', Y: '#f6d24a', G: '#4fae5a', B: '#3a8ad1', P: '#8a56c0', m: '#7a2a2a' }, '#7a2a3a')],
  ['m50', '전설의맛몬', 'SSR', M(
    { 1: '....CC....', 2: '..C.CC.C..', 3: '..CCCCCC..', 4: '.AABBBBAA.', 5: 'AABGGGGBAA', 6: 'ABGeGGeGBA', 7: 'ABGGGGGGBA', 8: 'ABGGmmGGBA', 9: 'AABGGGGBAA', 10: '.AAAAAAAA.', 11: '..C.CC.C..' },
    { A: '#a03ad1', B: '#c86ae0', G: '#f6d24a', C: '#fff2a0', m: '#5a1a7a' }, '#5a1a7a')],
];

export const MATMON_SPRITES = {};
export const MATMON_LIST = [];
MATMON_DEFS.forEach(([id, name, rarity, sprite]) => {
  MATMON_SPRITES[id] = sprite;
  MATMON_LIST.push({ id, name, rarity, desc: `${name} — ${rarity}급 맛몬` });
});

/* ══════════════════════════════════════════════════════════════
   모자 / 악세서리 — 템플릿 + 색상 조합
   ══════════════════════════════════════════════════════════════ */
const HAT_SHAPES = {
  cap:    grid({ 0: '.....AAAAAA.....', 1: '....AAAAAAAA....', 2: '...BBBBBBBBBBB..' }),
  crown:  grid({ 0: '....C.C..C.C....', 1: '....AAAAAAAA....', 2: '....ACAAAACA....' }),
  chef:   grid({ 0: '....AAAAAAAA....', 1: '...AAAAAAAAAA...', 2: '....BBBBBBBB....' }),
  straw:  grid({ 0: '.....AAAAAA.....', 1: '....AAAAAAAA....', 2: '..BBBBBBBBBBBB..' }),
  band:   grid({ 1: '....AAAAAAAA....', 2: '....ACCAACCA....' }),
  horn:   grid({ 0: '...A......A.....', 1: '...AA....AA.....', 2: '....BB..BB......' }),
  beret:  grid({ 0: '......CC........', 1: '...AAAAAAAA.....', 2: '...BBBBBBBB.....' }),
  pot:    grid({ 0: '...AAAAAAAAA....', 1: '...ABBBBBBBA....', 2: '..AAAAAAAAAAA...' }),
  helmet: grid({ 0: '....AAAAAAAA....', 1: '...ACCCCCCCA....', 2: '...AAAAAAAAA...' }),
  tophat: grid({ 0: '....AAAAAA......', 1: '....AAAAAA......', 2: '..AAAAAAAAAA....' }),
};

const CW = (A, B, C) => ({ A, B, C });

const HAT_DEFS = [
  ['h_none', '없음', null, 'N', null],
  ['h_band_pink', '분홍머리띠', 'band', 'N', CW('#f472b6', null, '#fff1f2')],
  ['h_cap_red', '빨강모자', 'cap', 'N', CW('#ef4444', '#b91c1c')],
  ['h_cap_blue', '파랑모자', 'cap', 'N', CW('#3b82f6', '#1d4ed8')],
  ['h_band_teal', '청록머리띠', 'band', 'N', CW('#14b8a6', null, '#ccfbf1')],
  ['h_straw', '밀짚모자', 'straw', 'R', CW('#facc15', '#a16207')],
  ['h_beret', '베레모', 'beret', 'R', CW('#7c3aed', '#4c1d95', '#facc15')],
  ['h_pot', '냄비투구', 'pot', 'R', CW('#9ca3af', '#4b5563')],
  ['h_tophat', '신사모자', 'tophat', 'R', CW('#334155', '#0f172a')],
  ['h_chef', '셰프모자', 'chef', 'SR', CW('#f8fafc', '#cbd5e1')],
  ['h_helmet', '미식헬멧', 'helmet', 'SR', CW('#0ea5e9', null, '#bae6fd')],
  ['h_beret_gold', '황금베레모', 'beret', 'SR', CW('#eab308', '#a16207', '#fef9c3')],
  ['h_horn', '맛뿔', 'horn', 'SSR', CW('#e2e8f0', '#94a3b8')],
  ['h_crown', '미식왕관', 'crown', 'SSR', CW('#fbbf24', '#b45309', '#f87171')],
  ['h_crown_void', '흑금왕관', 'crown', 'SSR', CW('#a78bfa', '#4c1d95', '#fbbf24')],
];

export const HATS = {};
export const HATS_LIST = [];
HAT_DEFS.forEach(([id, name, shape, rarity, pal], i) => {
  if (shape && pal) HATS[id] = { rows: HAT_SHAPES[shape], palette: pal };
  HATS_LIST.push({ id, name, rarity, starter: id === 'h_none' || i === 1 });
});

const ACC_SHAPES = {
  glasses:  { rows: grid({ 3: '...AABBAABBAA...' }), back: false },
  scarf:    { rows: grid({ 7: '....AAAAAA......', 8: '..AAAAAAAAAA....', 9: '..AB........AA..' }), back: false },
  bag:      { rows: grid({ 9: '.............AA.', 10: '............AAA.', 11: '............ABA.', 12: '............AAA.' }), back: false },
  cape:     { rows: grid({ 8: '.A............A.', 9: '.AA..........AA.', 10: '.AA..........AA.', 11: '.AB..........BA.', 12: '.AB..........BA.' }), back: true },
  wings:    { rows: grid({ 9: '.AA........AA...', 10: 'AAAA......AAAA..', 11: '.AA........AA...' }), back: true },
  chopstick:{ rows: grid({ 8: '..............A.', 9: '.............A..', 10: '............A...', 11: '...........A....' }), back: false },
  spoon:    { rows: grid({ 7: '.A..............', 8: 'AAA.............', 9: '.A..............', 10: '.A..............' }), back: false },
  apron:    { rows: grid({ 10: '....AAAAAA......', 11: '....AAAAAA......', 12: '....ABBBBA......' }), back: false },
};

const ACC_DEFS = [
  ['a_none', '없음', null, 'N', null],
  ['a_glasses', '선글라스', 'glasses', 'N', CW('#1f2937', '#60a5fa')],
  ['a_spoon', '숟가락', 'spoon', 'N', CW('#cbd5e1')],
  ['a_chopstick', '젓가락', 'chopstick', 'N', CW('#d97706')],
  ['a_glasses_pink', '하트선글', 'glasses', 'N', CW('#be123c', '#fda4af')],
  ['a_scarf', '목도리', 'scarf', 'R', CW('#dc2626', '#7f1d1d')],
  ['a_bag', '먹방가방', 'bag', 'R', CW('#22c55e', '#166534')],
  ['a_apron', '앞치마', 'apron', 'R', CW('#fda4af', '#be123c')],
  ['a_scarf_blue', '겨울목도리', 'scarf', 'R', CW('#38bdf8', '#0369a1')],
  ['a_cape', '미식망토', 'cape', 'SR', CW('#a855f7', '#6b21a8')],
  ['a_cape_red', '영웅망토', 'cape', 'SR', CW('#dc2626', '#7f1d1d')],
  ['a_bag_gold', '황금가방', 'bag', 'SR', CW('#eab308', '#a16207')],
  ['a_wings', '천사날개', 'wings', 'SSR', CW('#f0f9ff')],
];

export const ACCESSORIES = {};
export const ACC_BACK = {};
export const ACCESSORIES_LIST = [];
ACC_DEFS.forEach(([id, name, shape, rarity, pal]) => {
  if (shape && pal) {
    ACCESSORIES[id] = { rows: ACC_SHAPES[shape].rows, palette: pal };
    if (ACC_SHAPES[shape].back) ACC_BACK[id] = true;
  }
  ACCESSORIES_LIST.push({ id, name, rarity, starter: id === 'a_none' });
});

/* ── 옷 색상 (12) ─────────────────────────────────────────── */
export const COLORS_LIST = [
  { id: 'c_blue', name: '파랑', hex: '#3b82f6', rarity: 'N', starter: true },
  { id: 'c_red', name: '빨강', hex: '#ef4444', rarity: 'N', starter: true },
  { id: 'c_green', name: '초록', hex: '#22c55e', rarity: 'N', starter: false },
  { id: 'c_orange', name: '주황', hex: '#f97316', rarity: 'N', starter: false },
  { id: 'c_sky', name: '하늘', hex: '#38bdf8', rarity: 'N', starter: false },
  { id: 'c_purple', name: '보라', hex: '#a855f7', rarity: 'R', starter: false },
  { id: 'c_pink', name: '분홍', hex: '#ec4899', rarity: 'R', starter: false },
  { id: 'c_teal', name: '청록', hex: '#14b8a6', rarity: 'R', starter: false },
  { id: 'c_lime', name: '라임', hex: '#84cc16', rarity: 'R', starter: false },
  { id: 'c_gold', name: '황금', hex: '#eab308', rarity: 'SR', starter: false },
  { id: 'c_void', name: '칠흑', hex: '#334155', rarity: 'SR', starter: false },
  { id: 'c_rainbow', name: '무지개', hex: '#f43f5e', rarity: 'SSR', starter: false },
];

/* ── 캐릭터 아우라(효과) (10) ───────────────────────────────── */
export const AURAS_LIST = [
  { id: 'au_none', name: '없음', rarity: 'N', starter: true, color: 'transparent', style: 'none' },
  { id: 'au_glow_green', name: '풋풋한 빛', rarity: 'N', color: '#4ade80', style: 'ring' },
  { id: 'au_glow_blue', name: '시원한 빛', rarity: 'N', color: '#38bdf8', style: 'ring' },
  { id: 'au_pulse_pink', name: '핑크 파동', rarity: 'R', color: '#f472b6', style: 'pulse' },
  { id: 'au_pulse_purple', name: '보랏빛 파동', rarity: 'R', color: '#a855f7', style: 'pulse' },
  { id: 'au_sparkle_cyan', name: '청록 반짝임', rarity: 'R', color: '#22d3ee', style: 'sparkle' },
  { id: 'au_flame_orange', name: '불꽃 오라', rarity: 'SR', color: '#fb923c', style: 'flame' },
  { id: 'au_orbit_gold', name: '황금 공전', rarity: 'SR', color: '#fbbf24', style: 'orbit' },
  { id: 'au_flame_blue', name: '푸른 화염', rarity: 'SR', color: '#60a5fa', style: 'flame' },
  { id: 'au_rainbow', name: '무지개 오라', rarity: 'SSR', color: '#f43f5e', style: 'rainbow' },
];
export const AURAS = Object.fromEntries(AURAS_LIST.map((a) => [a.id, a]));

// ── 맛집 카테고리 아이콘 ─────────────────────────────────────
export const FOOD_SPRITES = {
  한식: { rows: grid({ 3: '...AAAAAAAA...', 4: '..ABBBBBBBBA..', 5: '..ABCCCCCCBA..', 6: '..ABCCCCCCBA..', 7: '..AABBBBBBAA..', 8: '.AAAAAAAAAAAA.', 9: '..AA......AA..' }), palette: { A: '#94a3b8', B: '#64748b', C: '#f87171' } },
  중식: { rows: grid({ 3: '.....AAAA.....', 4: '...AAAAAAAA...', 5: '..AABBBBBBAA..', 6: '..ABBCCCCBBA..', 7: '..ABBBBBBBBA..', 8: '...AAAAAAAA...', 9: '.....CCCC.....' }), palette: { A: '#fbbf24', B: '#d97706', C: '#fde68a' } },
  일식: { rows: grid({ 4: '..AAAAAAAAAA..', 5: '..ABBBBBBBBA..', 6: '..ACCCCCCCCA..', 7: '..AAAAAAAAAA..', 8: '...BBBBBBBB...' }), palette: { A: '#1f2937', B: '#fb7185', C: '#f8fafc' } },
  양식: { rows: grid({ 3: '..A........B..', 4: '..A........B..', 5: '..A.CCCCCC.B..', 6: '..A.CCCCCC.B..', 7: '..A.CCCCCC.B..', 8: '..A........B..', 9: '..A........B..' }), palette: { A: '#cbd5e1', B: '#94a3b8', C: '#f8fafc' } },
  분식: { rows: grid({ 3: '....AA..AA....', 4: '...AAAAAAAA...', 5: '..AABBBBBBAA..', 6: '..ABBBBBBBBA..', 7: '..AABBBBBBAA..', 8: '...AAAAAAAA...', 9: '....AA..AA....' }), palette: { A: '#dc2626', B: '#fca5a5' } },
  치킨: { rows: grid({ 3: '.....AAA......', 4: '...AAAAAAA....', 5: '..AABAAABAA...', 6: '..AAAAAAAAA...', 7: '...AAAAAAA....', 8: '.....BBB......', 9: '.....BBB......' }), palette: { A: '#d97706', B: '#fef3c7' } },
  해산물: { rows: grid({ 4: '....AAAAAA....', 5: '...ABBBBBBA...', 6: '..ABBCCCCBBA..', 7: '..ABBBBBBBBA..', 8: '..AAAAAAAAAA..', 9: '...A.A..A.A...' }), palette: { A: '#38bdf8', B: '#0ea5e9', C: '#f8fafc' } },
  카페: { rows: grid({ 3: '...BB.........', 4: '..AAAAAAAA.CC.', 5: '..ABBBBBBA.C.C', 6: '..ABBBBBBA.CC.', 7: '..AABBBBAA....', 8: '...AAAAAA.....', 9: '..AAAAAAAA....' }), palette: { A: '#f8fafc', B: '#78350f', C: '#cbd5e1' } },
};

// ── 지도 마커 ────────────────────────────────────────────────
export const FLAG_TODO = {
  rows: grid({ 1: '...AAAAAAA....', 2: '...ABBBBBA....', 3: '...AAAAAAA....', 4: '...C..........', 5: '...C..........', 6: '...C..........', 7: '...C..........', 8: '..CCC.........' }),
  palette: { A: '#ef4444', B: '#fca5a5', C: '#64748b' },
};
export const FLAG_DONE = {
  rows: grid({ 1: '...AAAAAAA....', 2: '...ABBBBBA....', 3: '...AAAAAAA....', 4: '...C..........', 5: '...C..........', 6: '...C..........', 7: '...C..........', 8: '..CCC.........' }),
  palette: { A: '#22c55e', B: '#bbf7d0', C: '#64748b' },
};

export { RARITY_ORDER };

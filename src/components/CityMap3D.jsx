import { useGame } from '../store/gameStore';

/**
 * "3D 느낌" 도시 지도.
 * Three.js 없이 CSS perspective + rotateX 로 판을 눕히고, 각 구(區)를 타일로 얹는다.
 * 타일 높이(translateZ)와 색을 공략률에 비례시켜서 정복할수록 도시가 솟아오르는 느낌을 준다.
 */

// 인천 광역시 구를 격자 좌표로 단순화(실제 지형 아님, 목업 배치)
const DISTRICT_LAYOUT = {
  계양구: { col: 2, row: 0, w: 1, h: 1 },
  서구: { col: 0, row: 0, w: 2, h: 1 },
  부평구: { col: 3, row: 1, w: 1, h: 1 },
  미추홀구: { col: 2, row: 1, w: 1, h: 1 },
  중구: { col: 0, row: 1, w: 2, h: 1 },
  남동구: { col: 3, row: 2, w: 1, h: 1 },
  연수구: { col: 1, row: 2, w: 2, h: 1 },
};

const TILE = 62;
const GAP = 5;

function tileColor(pct) {
  if (pct === 0) return { top: '#3f3a5c', side: '#2a2542' };
  if (pct < 40) return { top: '#4b6b4f', side: '#334936' };
  if (pct < 80) return { top: '#5f9c56', side: '#3f6b3a' };
  return { top: '#8fd14f', side: '#5f9433' };
}

export default function CityMap3D() {
  const districts = useGame((s) => s.districtProgress());
  const totalPct = useGame((s) => s.progressPct());
  const byName = Object.fromEntries(districts.map((d) => [d.district, d]));

  return (
    <div className="pixel-panel p-4">
      <div className="flex items-end justify-between mb-1">
        <h2 className="text-sm text-amber-300">인천광역시</h2>
        <span className="text-[13px] text-slate-400">구를 정복하면 솟아오른다</span>
      </div>

      {/* 3D 무대 */}
      <div className="h-[230px] grid place-items-center overflow-hidden" style={{ perspective: '700px' }}>
        <div
          className="relative"
          style={{
            width: 4 * (TILE + GAP),
            height: 3 * (TILE + GAP),
            transform: 'rotateX(52deg) rotateZ(-38deg)',
            transformStyle: 'preserve-3d',
          }}
        >
          {Object.entries(DISTRICT_LAYOUT).map(([name, pos]) => {
            const d = byName[name] ?? { pct: 0, done: 0, total: 0 };
            const color = tileColor(d.pct);
            const lift = 6 + (d.pct / 100) * 26; // 공략률만큼 높이 상승

            return (
              <div
                key={name}
                className="absolute"
                style={{
                  left: pos.col * (TILE + GAP),
                  top: pos.row * (TILE + GAP),
                  width: pos.w * TILE + (pos.w - 1) * GAP,
                  height: pos.h * TILE + (pos.h - 1) * GAP,
                  transform: `translateZ(${lift}px)`,
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* 윗면 */}
                <div
                  className="absolute inset-0 border-2 border-[#1b1230] grid place-items-center"
                  style={{ background: color.top }}
                >
                  <div
                    className="text-center leading-tight"
                    style={{ transform: 'rotateZ(38deg) rotateX(-52deg)' }}
                  >
                    <p className="text-[11.5px] text-[#1b1230] font-bold">{name}</p>
                    <p className="text-[10.5px] text-[#1b1230]/80">{d.pct}%</p>
                  </div>
                </div>
                {/* 옆면(두께) — 아래로 깔아서 입체감 */}
                <div
                  className="absolute inset-x-0 top-full h-[14px] border-x-2 border-b-2 border-[#1b1230]"
                  style={{ background: color.side, transform: `rotateX(-90deg)`, transformOrigin: 'top' }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 전체 진행률 */}
      <div className="mt-2">
        <div className="flex justify-between text-[13px] mb-1">
          <span className="text-slate-300">전체 공략률</span>
          <span className="text-amber-300">{totalPct}%</span>
        </div>
        <div className="h-3 bg-[#241a45] border-2 border-[#1b1230]">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-lime-300 transition-[width] duration-500"
            style={{ width: `${totalPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

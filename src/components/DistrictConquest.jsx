import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../store/gameStore';
import { DotFood } from './DotCharacter';

/**
 * 홈 — 춘천시 동네별 정복 현황.
 * (예전엔 SVG 지도 그림이었는데 동네가 8개로 고정이었다. 데이터가 27개 동네로 늘어
 *  동네 목록 아코디언으로 바꿔, 동네별 맛집·정복 수를 그대로 보여준다.)
 */
export default function DistrictConquest() {
  const restaurants = useGame((s) => s.restaurants);
  const districts = useGame((s) => s.districtProgress());
  const totalPct = useGame((s) => s.progressPct());
  const conquered = useGame((s) => s.conqueredCount());
  const [open, setOpen] = useState(null);

  // 진행률 높은 동네 먼저 → 시작한 동네가 위로 올라와 동기부여
  const sorted = useMemo(
    () => [...districts].sort((a, b) => b.pct - a.pct || b.total - a.total),
    [districts]
  );

  const byDistrict = useMemo(() => {
    const m = {};
    for (const r of restaurants) (m[r.district] ??= []).push(r);
    for (const k in m) {
      // 미공략을 먼저(공략할 것), 그다음 이름순
      m[k].sort((a, b) =>
        a.conquered === b.conquered ? a.name.localeCompare(b.name) : a.conquered ? 1 : -1
      );
    }
    return m;
  }, [restaurants]);

  return (
    <div className="pixel-panel p-4 space-y-3">
      <div className="flex items-end justify-between">
        <h2 className="text-sm text-[#b45309]">🗺️ 춘천시 정복</h2>
        <span className="text-[13.5px] text-[#7d6549]">
          공략 {conquered} / {restaurants.length}곳 · {totalPct}%
        </span>
      </div>

      {/* 전체 진행률 */}
      <div className="h-3 bg-[#f7ecdd] border-2 border-[#4a3324] overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 to-lime-300 transition-[width] duration-500"
          style={{ width: `${totalPct}%` }}
        />
      </div>

      {/* 동네 목록 (탭해서 그 동네 맛집 펼치기) */}
      <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
        {sorted.map((d) => {
          const isOpen = open === d.district;
          const list = byDistrict[d.district] ?? [];
          const done = d.done >= d.total && d.total > 0;
          return (
            <div key={d.district} className="border-2 border-[#e2cfae]">
              <button
                onClick={() => setOpen(isOpen ? null : d.district)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 text-left transition-colors ${
                  isOpen ? 'bg-[#f1e3cf]' : 'bg-[#f7ecdd] hover:bg-[#f1e3cf]'
                }`}
              >
                <span className="text-[13.5px] text-[#3d2c1e] flex-1 truncate">
                  {done && '🏆 '}
                  {d.district}
                </span>
                {/* 미니 진행바 */}
                <div className="w-16 h-2 bg-[#e8d9bd] border border-[#4a3324] overflow-hidden shrink-0">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-lime-300"
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
                <span
                  className={`text-[12.5px] tabular-nums shrink-0 w-11 text-right ${
                    d.done > 0 ? 'text-[#3d6a1f]' : 'text-[#96805f]'
                  }`}
                >
                  {d.done}/{d.total}
                </span>
                <span className="text-[11px] text-[#96805f] w-3 text-center shrink-0">
                  {isOpen ? '▲' : '▼'}
                </span>
              </button>

              {isOpen && (
                <div className="bg-[#fffaf2] divide-y divide-[#f0e2cb]">
                  {list.map((r) => (
                    <Link
                      key={r.id}
                      to={`/board/${r.id}`}
                      className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-[#f7ecdd] transition-colors"
                    >
                      <DotFood category={r.category} size={22} className="shrink-0" />
                      <span className="text-[13px] text-[#4a3a29] flex-1 truncate">{r.name}</span>
                      <span
                        className={`text-[11.5px] px-1.5 py-0.5 border border-[#4a3324] shrink-0 ${
                          r.conquered ? 'bg-emerald-400 text-[#4a3324]' : 'bg-[#f7ecdd] text-[#7d6549]'
                        }`}
                      >
                        {r.conquered ? '공략' : '미공략'}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../store/gameStore';

/**
 * 공략이 진행 중일 때 어느 화면에 있든 남은 시간을 보여주는 배너.
 * 타이머가 스토어(시작 시각 기반)로 올라갔기 때문에 화면을 옮겨도 계속 흐른다.
 */
export default function VisitBanner() {
  const visit = useGame((s) => s.visit);
  const restaurants = useGame((s) => s.restaurants);
  const [, tick] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  // 1초마다 리렌더해서 남은 시간을 갱신
  useEffect(() => {
    if (!visit) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [visit]);

  if (!visit || location.pathname === '/map') return null; // 지도에는 자체 HUD가 있음

  const target = restaurants.find((r) => r.id === visit.restaurantId);
  const remaining = Math.max(
    0,
    Math.ceil(visit.durationSec - (Date.now() - visit.startedAt) / 1000)
  );
  const pct = ((visit.durationSec - remaining) / visit.durationSec) * 100;

  return (
    <button
      onClick={() => navigate('/map')}
      className="fixed left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-[440px] pixel-panel px-3 py-2 flex items-center gap-3 text-left"
      style={{ bottom: 'calc(84px + env(safe-area-inset-bottom))' }}
    >
      <span className="text-xl shrink-0">⏳</span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] truncate">
          <span className="text-amber-300">{target?.name}</span> 공략 중
        </p>
        <div className="h-2 bg-[#241a45] border border-[#1b1230] mt-1 overflow-hidden">
          <div className="h-full bg-amber-300" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="tabular text-[13px] text-amber-300 shrink-0">
        {remaining <= 0
          ? '완료!'
          : `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`}
      </span>
    </button>
  );
}

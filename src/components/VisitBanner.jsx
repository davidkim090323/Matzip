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
  const conquer = useGame((s) => s.conquer);
  const pushToast = useGame((s) => s.pushToast);
  const [, tick] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  // 1초마다 리렌더해서 남은 시간을 갱신
  useEffect(() => {
    if (!visit) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [visit]);

  const target = visit ? restaurants.find((r) => r.id === visit.restaurantId) : null;
  const remaining = visit
    ? Math.max(0, Math.ceil(visit.durationSec - (Date.now() - visit.startedAt) / 1000))
    : 0;

  /**
   * 지도 밖에서 타이머가 끝나도 공략이 완료되도록 전역에서 판정한다.
   * (예전엔 지도 페이지에만 판정이 있어서, 홈에 있으면 "완료!"만 뜨고 보상이 안 나왔다)
   * 지도에서는 반경 이탈 검사까지 포함한 자체 판정이 도니 여기선 건너뛴다.
   */
  useEffect(() => {
    if (!visit || location.pathname === '/map' || remaining > 0) return;
    const result = conquer(visit.restaurantId);
    if (result) {
      pushToast({
        icon: '🏆',
        title: `${target?.name} 공략 완료!`,
        body: `EXP +${result.expGained} · 🎟️ +1 · 🪙 +${result.coinsGained}`,
      });
      navigate(`/board/${visit.restaurantId}`); // 공략 완료 → 리뷰 작성 해금
    }
  }, [visit, remaining, location.pathname, conquer, pushToast, navigate, target]);

  if (!visit || location.pathname === '/map') return null; // 지도에는 자체 HUD가 있음

  const pct = ((visit.durationSec - remaining) / visit.durationSec) * 100;

  return (
    <button
      onClick={() => navigate('/map')}
      className="fixed left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-[440px] pixel-panel px-3 py-2 flex items-center gap-3 text-left"
      style={{ bottom: 'calc(84px + env(safe-area-inset-bottom))' }}
    >
      <span className="text-xl shrink-0">⏳</span>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] truncate">
          <span className="text-[#b45309]">{target?.name}</span> 공략 중
        </p>
        <div className="h-2 bg-[#f7ecdd] border border-[#4a3324] mt-1 overflow-hidden">
          <div className="h-full bg-amber-300" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="tabular text-[13.5px] text-[#b45309] shrink-0">
        {remaining <= 0
          ? '완료!'
          : `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`}
      </span>
    </button>
  );
}

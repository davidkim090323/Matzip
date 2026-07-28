import { useState, useMemo } from 'react';
import { useGame } from '../store/gameStore';
import RaidCard from './RaidCard';

/**
 * 일반 레이드 패널 (지도 탭).
 * 길드와 무관하게 모르는 사람들과 파티를 모아 함께 밥 먹고 인원수만큼 보상을 받는다.
 * 점령/깃발 변경은 없다(그건 길드 레이드 전용).
 */
export default function PublicRaidPanel() {
  const uid = useGame((s) => s.uid);
  const raids = useGame((s) => s.raids);
  const restaurants = useGame((s) => s.restaurants);
  const createRaid = useGame((s) => s.createRaid);
  const pushToast = useGame((s) => s.pushToast);
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState('');

  const recruiting = raids.filter((r) => r.status === 'recruiting' && r.type === 'public');
  const mine = recruiting.filter((r) => r.members.some((m) => m.uid === uid));
  const mineIds = new Set(mine.map((r) => r.id));
  const others = recruiting.filter((r) => !mineIds.has(r.id));

  const openList = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const busy = new Set(recruiting.map((r) => r.restaurantId));
    return restaurants
      .filter((r) => !busy.has(r.id) && (!needle || `${r.name}${r.district}`.toLowerCase().includes(needle)))
      .slice(0, 12);
  }, [restaurants, q, recruiting]);

  const open = (restaurantId) => {
    const res = createRaid(restaurantId, 'public');
    if (res?.error === 'exists') return pushToast({ icon: 'ℹ️', title: '이미 모집 중인 일반 레이드가 있어요' });
    if (res?.ok) {
      setPicking(false);
      setQ('');
      pushToast({ icon: '🍽️', title: '일반 레이드 모집 시작!', body: '모르는 사람들과 함께 밥 먹으러 가요.' });
    }
  };

  return (
    <div className="pixel-panel p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm text-[#b45309]">🍽️ 일반 레이드</h2>
        <button
          onClick={() => setPicking((v) => !v)}
          className="pixel-btn bg-gradient-to-r from-rose-400 to-orange-400 text-white px-3 py-1.5 text-[12.5px]"
        >
          {picking ? '취소' : '＋ 레이드 열기'}
        </button>
      </div>
      <p className="text-[12.5px] text-[#7d6549] -mt-1">
        길드 없이 <b>모르는 사람들과 파티</b>를 모아 같이 밥 먹으면 <b>인원수만큼 보상이 커집니다</b>.
        (🪙50×인원 · 🎟️인원수(3명↑ +2) · EXP 보너스 · 점령은 없어요)
      </p>

      {picking && (
        <div className="pixel-panel p-3 space-y-2 pop-in">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔍 같이 갈 맛집 검색"
            className="w-full bg-[#f7ecdd] border-2 border-[#e2cfae] px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
          />
          <div className="max-h-56 overflow-y-auto space-y-1">
            {openList.map((r) => (
              <button
                key={r.id}
                onClick={() => open(r.id)}
                className="w-full flex items-center justify-between gap-2 bg-[#f7ecdd] border-2 border-[#e2cfae] px-3 py-2 text-left hover:border-amber-500 transition-colors"
              >
                <span className="text-[13px] truncate">{r.name}</span>
                <span className="text-[12px] text-[#96805f] shrink-0">{r.district}</span>
              </button>
            ))}
            {!openList.length && <p className="text-[12.5px] text-[#96805f] text-center py-3">모집 가능한 맛집이 없어요.</p>}
          </div>
        </div>
      )}

      {mine.length > 0 && (
        <div className="space-y-2">
          <p className="text-[12.5px] text-[#96805f]">내 레이드</p>
          {mine.map((raid) => (
            <RaidCard key={raid.id} raid={raid} mine />
          ))}
        </div>
      )}

      {others.length > 0 && (
        <div className="space-y-2">
          <p className="text-[12.5px] text-[#96805f]">모집 중인 레이드</p>
          {others.map((raid) => (
            <RaidCard key={raid.id} raid={raid} mine={false} />
          ))}
        </div>
      )}

      {!recruiting.length && !picking && (
        <p className="text-[12.5px] text-[#96805f] text-center py-2">
          진행 중인 일반 레이드가 없어요. ‘＋ 레이드 열기’로 파티를 모아보세요!
        </p>
      )}
    </div>
  );
}

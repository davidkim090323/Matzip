import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame, expForLevel, ratingOf } from '../store/gameStore';
import { DotCharacter, DotMatmon, DotFood } from '../components/DotCharacter';
import DistrictConquest from '../components/DistrictConquest';
import InstallPrompt from '../components/InstallPrompt';
import NotifyPrompt from '../components/NotifyPrompt';

function ProfileCard() {
  const user = useGame((s) => s.user);
  const titles = useGame((s) => s.titles);
  const costumes = useGame((s) => s.costumes);
  const equipTitle = useGame((s) => s.equipTitle);
  const equipped = useGame((s) => s.equippedTitle());
  const conquered = useGame((s) => s.conqueredCount());
  const [open, setOpen] = useState(false);

  const pets = useGame((s) => s.equippedMatmon());

  const need = expForLevel(user.level);
  const pct = Math.round((user.exp / need) * 100);
  const color = costumes.colors.find((c) => c.id === user.costume.color)?.hex ?? '#3b82f6';

  return (
    <div className="pixel-panel p-4 relative">
      <div className="flex gap-4 items-center">
        <div className="shrink-0 relative">
          <DotCharacter
            color={color}
            hatId={user.costume.hat}
            accessoryId={user.costume.accessory}
            auraId={user.costume.aura}
            size={84}
            className="bob"
          />
          {/* 동행 맛몬 미리보기 */}
          <div className="flex justify-center -mt-1">
            {pets.map((m) => (
              <DotMatmon key={m.id} id={m.id} size={22} />
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-base">{user.nickname}</p>

          {/* 착용 칭호 — 클릭하면 보유 칭호 목록에서 교체 */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 text-[13.5px] border-2 border-[#4a3324]"
            style={{ background: equipped?.color ?? '#475569', color: '#4a3324' }}
          >
            {equipped?.name ?? '칭호 없음'} <span className="text-[12px]">▼</span>
          </button>

          <div className="mt-2 flex items-center gap-2">
            <span className="text-[13.5px] text-[#b45309] shrink-0">Lv.{user.level}</span>
            <div className="flex-1 h-3 bg-[#f7ecdd] border-2 border-[#4a3324] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-400 transition-[width] duration-700 relative"
                style={{ width: `${pct}%` }}
              >
                <span className="absolute inset-0 shimmer" />
              </div>
            </div>
            <span className="text-[12.5px] text-[#7d6549] shrink-0">
              {user.exp}/{need}
            </span>
          </div>

          <p className="mt-1 text-[12.5px] text-[#7d6549]">
            공략 {conquered}곳 · 🎟️ {user.gachaTickets} · 🪙 {(user.coins ?? 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* 바깥을 누르면 드롭다운이 닫힌다 */}
      {open && (
        <button
          className="fixed inset-0 z-20 cursor-default no-min"
          onClick={() => setOpen(false)}
          aria-label="칭호 목록 닫기"
        />
      )}
      {open && (
        <div className="absolute left-4 right-4 top-full mt-1 z-30 pixel-panel p-2 max-h-56 overflow-y-auto">
          <p className="text-[12.5px] text-[#7d6549] px-1 pb-1">보유 칭호 ({user.ownedTitleIds.length})</p>
          {titles.map((t) => {
            const owned = user.ownedTitleIds.includes(t.id);
            const isOn = t.id === user.equippedTitleId;
            return (
              <button
                key={t.id}
                disabled={!owned}
                onClick={() => {
                  equipTitle(t.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2 py-1.5 text-[13.5px] ${
                  owned ? 'hover:bg-[#f1e3cf]' : 'opacity-40 cursor-not-allowed'
                } ${isOn ? 'bg-[#f1e3cf]' : ''}`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 inline-block" style={{ background: t.color }} />
                  {owned ? t.name : '???'}
                </span>
                <span className="text-[12px] text-[#7d6549]">
                  {owned ? (isOn ? '착용중' : '착용') : t.shop ? '상점 구매' : `${t.requiredConquests}곳 공략`}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecommendCarousel() {
  const restaurants = useGame((s) => s.restaurants);
  const navigate = useNavigate();
  const trackRef = useRef(null);
  const touchX = useRef(null);
  const [idx, setIdx] = useState(0);

  // 미공략 + 평점 높은 순 = "맛있는데 아직 안 가본 곳"
  const picks = useMemo(
    () =>
      restaurants
        .filter((r) => !r.conquered)
        .sort((a, b) => ratingOf(b) - ratingOf(a))
        .slice(0, 5),
    [restaurants]
  );

  // 자동 슬라이드 — idx 를 deps 에 넣어 스와이프 후에도 3.2초를 온전히 보장
  useEffect(() => {
    if (picks.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % picks.length), 3200);
    return () => clearInterval(t);
  }, [picks.length, idx]);

  // 모바일 스와이프로 좌우 넘기기
  const onTouchStart = (e) => (touchX.current = e.touches[0].clientX);
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 40 || picks.length < 2) return;
    setIdx((i) => (i + (dx < 0 ? 1 : -1) + picks.length) % picks.length);
  };

  if (!picks.length) {
    return (
      <div className="pixel-panel p-6 text-center text-sm text-[#5d4a35]">
        전 지역 공략 완료! 🎉
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm text-[#b45309] mb-2 px-1">🔥 아직 안 가본 핫플</h2>

      <div
        className="overflow-hidden pixel-panel p-0"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          ref={trackRef}
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {picks.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/board/${r.id}`)}
              className="w-full shrink-0 flex items-center gap-3 p-4 text-left hover:bg-[#f1e3cf] transition-colors"
            >
              <DotFood category={r.category} size={48} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">{r.name}</p>
                <p className="text-[13.5px] text-[#7d6549] truncate">
                  {r.district} · {r.category}
                </p>
                <p className="text-[13.5px] text-[#b45309] mt-0.5">
                  ★ {ratingOf(r).toFixed(1)} · 공략법 {r.reviews.length}
                </p>
              </div>
              <span className="text-[12.5px] text-[#96805f] shrink-0">보러가기 ›</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-1.5 mt-2">
        {picks.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`w-2 h-2 border border-[#4a3324] ${i === idx ? 'bg-amber-300' : 'bg-[#e2cfae]'}`}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 일일 퀘스트.
 * 뽑기권 공급이 공략 하나뿐이라 접속 동기가 약했다 → 하루 단위 목표/보상으로 리텐션을 만든다.
 */
function DailyQuests() {
  const quests = useGame((s) => s.questState());
  const claimQuest = useGame((s) => s.claimQuest);
  const pushToast = useGame((s) => s.pushToast);

  const claim = (q) => {
    const res = claimQuest(q.id);
    if (!res) return;
    const parts = [];
    if (res.reward.tickets) parts.push(`🎟️ 뽑기권 +${res.reward.tickets}`);
    if (res.reward.exp) parts.push(`EXP +${res.reward.exp}`);
    if (res.levelUps > 0) parts.push(`Lv.${res.newLevel} 달성!`);
    pushToast({ icon: '🎯', title: '일일 퀘스트 보상 획득', body: parts.join(' · ') });
  };

  const remain = quests.filter((q) => !q.claimed).length;

  return (
    <div className="pixel-panel p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm text-[#b45309]">🎯 오늘의 퀘스트</h2>
        <span className="text-[12.5px] text-[#7d6549]">
          {remain === 0 ? '전부 완료!' : `남은 보상 ${remain}개 · 자정 초기화`}
        </span>
      </div>

      {quests.map((q) => (
        <div
          key={q.id}
          className={`flex items-center gap-3 border-2 px-3 py-2 transition-colors ${
            q.claimed
              ? 'border-[#e2cfae]/40 bg-[#f7ecdd]/40 opacity-55'
              : q.done
              ? 'border-amber-500 bg-amber-200/50'
              : 'border-[#e2cfae] bg-[#f7ecdd]'
          }`}
        >
          <span className="text-xl shrink-0">{q.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] truncate">{q.title}</p>
            <p className="text-[12.5px] text-[#7d6549]">
              {q.progress}/{q.goal} ·{' '}
              <span className="text-[#b45309]">
                {q.reward.tickets ? `🎟️ ${q.reward.tickets}장` : `EXP +${q.reward.exp}`}
              </span>
            </p>
          </div>
          <button
            disabled={!q.done || q.claimed}
            onClick={() => claim(q)}
            className={`pixel-btn px-3 py-1.5 text-[12.5px] shrink-0 ${
              q.claimed
                ? 'bg-[#f1e3cf] text-[#96805f]'
                : q.done
                ? 'bg-amber-300 text-[#4a3324]'
                : 'bg-[#f1e3cf] text-[#7d6549]'
            }`}
          >
            {q.claimed ? '수령완료' : q.done ? '보상받기' : '진행중'}
          </button>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div className="p-4 space-y-4 page-in">
      <InstallPrompt />
      <NotifyPrompt />
      <ProfileCard />
      <DailyQuests />
      <DistrictConquest />
      <RecommendCarousel />
    </div>
  );
}

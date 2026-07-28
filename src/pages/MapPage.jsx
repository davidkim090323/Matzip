import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGame, CONQUEST_MINUTES, CONQUEST_RADIUS_M, ratingOf } from '../store/gameStore';
import PublicRaidPanel from '../components/PublicRaidPanel';
import {
  useGeolocation,
  distanceMeters,
  bearingDeg,
  buildRoute,
  stepToward,
} from '../hooks/useGeolocation';
import { DotFood } from '../components/DotCharacter';
import KakaoMap from '../components/KakaoMap';
import { useModal } from '../hooks/useModal';
import { sendNotify } from '../lib/notify';

const NEARBY_NOTIFY_M = 250; // 찜 맛집 근처 알림 반경(미터)

export default function MapPage() {
  // 지도 높이 — 작은 폰(SE 등)에서 화면을 다 삼키지 않게 화면 높이에 비례시킨다
  const VIEW_H = useMemo(
    () => Math.round(Math.max(420, Math.min(640, window.innerHeight * 0.64))),
    []
  );
  const navigate = useNavigate();
  const restaurants = useGame((s) => s.restaurants);
  const territoryByRest = useGame((s) => s.territoryByRest);
  const costumes = useGame((s) => s.costumes);
  const user = useGame((s) => s.user);
  const pets = useGame((s) => s.equippedMatmon());
  const conquer = useGame((s) => s.conquer);
  const pushToast = useGame((s) => s.pushToast);
  const devFastTimer = useGame((s) => s.devFastTimer);
  const setDevFastTimer = useGame((s) => s.setDevFastTimer);

  const [mode, setMode] = useState('mock');
  const { pos, error, nudge, teleport, isMock } = useGeolocation(mode);

  const [follow, setFollow] = useState(true); // 캐릭터 자동 추적 (드래그하면 해제)
  const [selectedId, setSelectedId] = useState(null);
  const [devOpen, setDevOpen] = useState(false); // 개발자 도구 접힘

  // 공략 타이머는 스토어에 있다(시작 시각 기반) → 화면을 옮기거나 새로고침해도 이어진다
  const visit = useGame((s) => s.visit);
  const startVisit = useGame((s) => s.startVisit);
  const cancelVisit = useGame((s) => s.cancelVisit);
  const [, forceTick] = useState(0);

  // 1초마다 리렌더해서 남은 시간 표시를 갱신 (상태 자체는 시작 시각으로부터 계산)
  useEffect(() => {
    if (!visit) return;
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [visit]);

  const remaining = visit
    ? Math.max(0, Math.ceil(visit.durationSec - (Date.now() - visit.startedAt) / 1000))
    : 0;

  // 네비게이션도 스토어에 있다 → 탭을 옮겨도 안내가 유지된다
  const route = useGame((s) => s.route);
  const setRoute = useGame((s) => s.setRoute);
  const walking = useGame((s) => s.walking);
  const setWalking = useGame((s) => s.setWalking);

  const posRef = useRef(pos);
  posRef.current = pos;

  // 지도 필터 — 맛집이 많아지면 깃발이 뒤엉킨다. 카테고리/미공략/찜으로 걸러 본다.
  const [mapFilter, setMapFilter] = useState('전체'); // 전체 | 미공략 | 찜 | <카테고리>
  const bookmarkIds = useGame((s) => s.bookmarkIds);

  const filterChips = useMemo(
    () => ['전체', '미공략', '찜', ...new Set(restaurants.map((r) => r.category))],
    [restaurants]
  );

  const markers = useMemo(
    () =>
      restaurants
        .filter((r) => {
          if (mapFilter === '전체') return true;
          if (mapFilter === '미공략') return !r.conquered;
          if (mapFilter === '찜') return bookmarkIds.includes(r.id);
          return r.category === mapFilter;
        })
        .map((r) => ({
          ...r,
          dist: distanceMeters(pos, { lat: r.lat, lng: r.lng }),
          saved: bookmarkIds.includes(r.id),
        })),
    [restaurants, pos, mapFilter, bookmarkIds]
  );

  const nearby = useMemo(() => [...markers].sort((a, b) => a.dist - b.dist).slice(0, 3), [markers]);

  // 찜한 미공략 맛집 반경에 들어오면 알림 — 맛집당 한 번만(세션 기준). 앱을 주머니에 넣고
  // 걷다가 지나쳐도 놓치지 않게 한다. 이미 보고 있을 땐(포그라운드) 지도로 충분하므로 생략.
  const notifiedNearRef = useRef(new Set());
  useEffect(() => {
    if (!document.hidden) return;
    for (const m of markers) {
      if (!m.saved || m.conquered) continue;
      if (m.dist <= NEARBY_NOTIFY_M && !notifiedNearRef.current.has(m.id)) {
        notifiedNearRef.current.add(m.id);
        sendNotify('찜한 맛집이 근처예요 ⭐', {
          body: `${m.name} · ${Math.round(m.dist)}m — 지금 공략하기 좋아요.`,
          tag: `near-${m.id}`,
        });
      }
    }
  }, [markers]);

  // 내 위치로 카메라 복귀 — 카카오맵이 follow=true 일 때 캐릭터로 panTo 한다
  const centerOnMe = useCallback(() => setFollow(true), []);

  // ── 네비게이션 ─────────────────────────────────────────────
  const WP_REACH_M = 20; // 웨이포인트 도달 판정 거리

  const startNav = (r) => {
    setRoute({
      restaurantId: r.id,
      points: buildRoute(posRef.current, { lat: r.lat, lng: r.lng }),
      idx: 0,
    });
    setSelectedId(null);
    setFollow(true);
    setWalking(isMock); // 목업 모드면 바로 자동 이동 시작
  };

  const stopNav = () => {
    setRoute(null);
    setWalking(false);
  };

  // 웨이포인트 도달 판정 + 목적지 도착 처리
  useEffect(() => {
    if (!route) return;
    const wp = route.points[route.idx];
    if (!wp) return;

    if (distanceMeters(pos, wp) <= WP_REACH_M) {
      const nextIdx = route.idx + 1;
      if (nextIdx >= route.points.length) {
        const target = restaurants.find((r) => r.id === route.restaurantId);
        stopNav();
        pushToast({
          icon: '📍',
          title: '목적지 도착!',
          body: `${target?.name} — 이제 공략할 수 있습니다.`,
        });
        setSelectedId(route.restaurantId); // 바로 공략 모달 오픈
      } else {
        setRoute({ ...route, idx: nextIdx });
      }
    }
  }, [pos, route, restaurants, pushToast]);

  // 자동 이동(목업 전용) — 다음 웨이포인트를 향해 한 틱에 18m 씩 걷는다
  useEffect(() => {
    if (!walking || !route || !isMock) return;
    const id = setInterval(() => {
      const r = route;
      const wp = r.points[r.idx];
      if (!wp) return;
      teleport(stepToward(posRef.current, wp, 18));
    }, 140);
    return () => clearInterval(id);
  }, [walking, route, isMock, teleport]);

  // 실제 GPS 모드로 바꾸면 자동 이동은 의미 없음
  useEffect(() => {
    if (!isMock) setWalking(false);
  }, [isMock]);

  // /map?nav=<맛집id> 로 들어오면 자동으로 길찾기 시작 (리뷰 작성 후 "다음 맛집" 버튼 경로)
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    const navId = params.get('nav');
    if (!navId) return;
    const r = restaurants.find((x) => x.id === navId);
    if (r) startNav(r);
    setParams({}, { replace: true }); // 주소창 정리 — 새로고침 시 재실행 방지
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, restaurants]);

  const navInfo = useMemo(() => {
    if (!route) return null;
    const target = restaurants.find((r) => r.id === route.restaurantId);
    if (!target) return null;
    const rest = route.points.slice(route.idx);
    // 남은 거리 = 현재 위치 → 다음 웨이포인트 → ... → 목적지
    let total = 0;
    let prev = pos;
    for (const p of rest) {
      total += distanceMeters(prev, p);
      prev = p;
    }
    const wp = route.points[route.idx];
    return {
      target,
      remainM: total,
      bearing: bearingDeg(pos, wp),
      wpDist: distanceMeters(pos, wp),
      step: route.idx + 1,
      steps: route.points.length,
    };
  }, [route, restaurants, pos]);

  // ── 공략 판정 ──────────────────────────────────────────────
  // 타이머 자체는 스토어가 들고 있고, 여기서는 "반경 이탈"과 "완료"만 판정한다.
  const totalSeconds = devFastTimer ? 10 : CONQUEST_MINUTES * 60;

  useEffect(() => {
    if (!visit) return;
    const target = restaurants.find((r) => r.id === visit.restaurantId);
    if (!target) return;

    const d = distanceMeters(pos, { lat: target.lat, lng: target.lng });
    if (d > CONQUEST_RADIUS_M) {
      cancelVisit();
      pushToast({ icon: '🚶', title: '공략 취소', body: '맛집 반경을 벗어났습니다.' });
      return;
    }

    if (remaining <= 0) {
      const result = conquer(visit.restaurantId);
      setSelectedId(null);
      if (result) {
        const parts = [`EXP +${result.expGained}`, '🎟️ +1', `🪙 +${result.coinsGained}`];
        pushToast({ icon: '🏆', title: `${target.name} 공략 완료!`, body: parts.join(' · ') });
        // 타이머는 대개 앱을 벗어난 사이에 끝난다 → 백그라운드일 때만 OS 알림으로 알린다
        if (document.hidden) {
          sendNotify(`${target.name} 공략 완료! 🏆`, {
            body: `${parts.join(' · ')} · 앱에서 확인하세요.`,
            tag: 'conquest-done',
          });
        }
      }
      navigate(`/board/${visit.restaurantId}`); // 공략 완료 → 리뷰 작성 해금
    }
  }, [visit, remaining, pos, restaurants, conquer, cancelVisit, pushToast, navigate]);

  // 방향키 이동(목업 모드)
  useEffect(() => {
    if (!isMock) return;
    const onKey = (e) => {
      const STEP = 25;
      if (e.key === 'ArrowUp') nudge(STEP, 0);
      else if (e.key === 'ArrowDown') nudge(-STEP, 0);
      else if (e.key === 'ArrowLeft') nudge(0, -STEP);
      else if (e.key === 'ArrowRight') nudge(0, STEP);
      else return;
      e.preventDefault();
      setFollow(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMock, nudge]);

  const selected = restaurants.find((r) => r.id === selectedId) ?? null;
  const selectedDist = selected
    ? distanceMeters(pos, { lat: selected.lat, lng: selected.lng })
    : 0;
  const canVisit = selected && selectedDist <= CONQUEST_RADIUS_M;

  // Esc / 뒤로가기 / 배경 스크롤 잠금
  useModal(!!selected, () => setSelectedId(null));

  return (
    <div className="p-4 space-y-3 page-in">
      {/* 개발자 도구 — 실서비스에선 GPS 로 대체될 임시 기능들. 기본은 접혀 있다. */}
      <div className="pixel-panel">
        <button
          onClick={() => setDevOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-[13.5px]"
        >
          <span className="text-[#7d6549]">
            🛠 개발자 도구{' '}
            <span className="text-[12.5px] text-[#b89f7c]">
              ({mode === 'mock' ? '목업 GPS' : '실제 GPS'}
              {devFastTimer ? ' · 빠른 타이머' : ''})
            </span>
          </span>
          <span className="text-[#96805f]">{devOpen ? '▲' : '▼'}</span>
        </button>

        {devOpen && (
          <div className="px-3 pb-3 space-y-2 text-[13.5px]">
            <p className="text-[12.5px] text-[#96805f] leading-relaxed">
              워프·자동이동·빠른 타이머는 시연용입니다. 실서비스에서는 실제 GPS 이동과 30분
              체류로만 공략이 인정됩니다.
            </p>
            <div className="flex gap-1">
              {['mock', 'real'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-2 py-1.5 border-2 border-[#4a3324] ${
                    mode === m ? 'bg-amber-300 text-[#4a3324]' : 'bg-[#f1e3cf] text-[#5d4a35]'
                  }`}
                >
                  {m === 'mock' ? '목업 GPS' : '실제 GPS'}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={devFastTimer}
                onChange={(e) => setDevFastTimer(e.target.checked)}
                className="accent-amber-300 w-4 h-4"
              />
              <span className="text-[#5d4a35]">빠른 타이머 (30분 → 10초)</span>
            </label>
          </div>
        )}
      </div>

      {error && (
        <p className="text-[13.5px] text-red-600 px-1">
          GPS 오류: {error} — 개발자 도구에서 목업 모드로 전환하세요.
        </p>
      )}

      {/* 지도 필터 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {filterChips.map((c) => (
          <button
            key={c}
            onClick={() => setMapFilter(c)}
            className={`px-2.5 py-1 text-[12.5px] border-2 border-[#4a3324] whitespace-nowrap transition-colors ${
              mapFilter === c ? 'bg-sky-400 text-[#4a3324]' : 'bg-[#f7ecdd] text-[#7d6549]'
            }`}
          >
            {c === '찜' ? `⭐ 찜 ${bookmarkIds.length}` : c}
          </button>
        ))}
      </div>

      {/* 지도 — 카카오맵 (실제 지도 위에 도트 마커·캐릭터 오버레이) */}
      <div className="pixel-panel relative overflow-hidden" style={{ height: VIEW_H }}>
        <KakaoMap
          pos={pos}
          follow={follow}
          onUserPan={() => setFollow(false)}
          markers={markers}
          route={route}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        {/* 내 위치로 */}
        <button
          onClick={centerOnMe}
          className={`absolute top-2 right-2 z-30 px-3 py-2 text-[13.5px] pixel-btn ${
            follow ? 'bg-emerald-400 text-[#4a3324]' : 'bg-[#f1e3cf] text-[#4a3a29]'
          }`}
        >
          {follow ? '◎ 추적중' : '◎ 내 위치'}
        </button>

        {/* 이동 패드 */}
        {isMock && (
          <div className="absolute bottom-2 right-2 z-30 grid grid-cols-3 gap-1 text-[12.5px]">
            <span />
            <button className="pixel-btn bg-[#f1e3cf] py-1" onClick={() => { nudge(25, 0); setFollow(true); }}>↑</button>
            <span />
            <button className="pixel-btn bg-[#f1e3cf] py-1" onClick={() => { nudge(0, -25); setFollow(true); }}>←</button>
            <button className="pixel-btn bg-[#f1e3cf] py-1" onClick={() => { nudge(-25, 0); setFollow(true); }}>↓</button>
            <button className="pixel-btn bg-[#f1e3cf] py-1" onClick={() => { nudge(0, 25); setFollow(true); }}>→</button>
          </div>
        )}

        {!route && (
          <p className="absolute bottom-2 left-2 z-30 text-[12.5px] text-white/80 bg-black/45 px-2 py-1 pointer-events-none">
            드래그·핀치로 지도 이동 · 방향키/패드로 캐릭터 이동
          </p>
        )}

        {/* 필터 결과 없음 안내 */}
        {markers.length === 0 && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-30 grid place-items-center pointer-events-none">
            <p className="bg-black/55 text-white/90 text-[13.5px] px-3 py-2">
              {mapFilter === '찜'
                ? '찜한 맛집이 없습니다 — 게시판에서 ⭐를 눌러보세요'
                : `'${mapFilter}' 조건에 맞는 맛집이 없습니다`}
            </p>
          </div>
        )}

        {/* 네비게이션 HUD */}
        {navInfo && !visit && (
          <div className="absolute inset-x-0 bottom-0 z-40 bg-[#fffaf2]/95 border-t-4 border-amber-500 p-3 slide-up">
            <div className="flex items-center gap-3">
              {/* 방향 화살표 — 다음 웨이포인트 방위각 */}
              <div className="w-11 h-11 shrink-0 grid place-items-center border-2 border-amber-500 bg-[#f7ecdd]">
                <span
                  className="text-2xl leading-none transition-transform duration-300"
                  style={{ transform: `rotate(${navInfo.bearing}deg)` }}
                >
                  ⬆️
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] truncate">
                  🧭 <span className="text-[#b45309]">{navInfo.target.name}</span> 안내 중
                </p>
                <p className="text-[12.5px] text-[#5d4a35]">
                  남은 거리{' '}
                  <span className="font-pixel text-[#b45309]">
                    {navInfo.remainM < 1000
                      ? `${Math.round(navInfo.remainM)}m`
                      : `${(navInfo.remainM / 1000).toFixed(2)}km`}
                  </span>{' '}
                  · 다음 지점 {Math.round(navInfo.wpDist)}m · 경유 {navInfo.step}/{navInfo.steps}
                </p>
              </div>

              <div className="flex flex-col gap-1 shrink-0">
                {isMock && (
                  <button
                    onClick={() => setWalking(!walking)}
                    className={`pixel-btn px-2 py-1 text-[12.5px] ${
                      walking ? 'bg-emerald-400 text-[#4a3324]' : 'bg-[#f1e3cf] text-[#4a3a29]'
                    }`}
                  >
                    {walking ? '⏸ 정지' : '▶ 자동이동'}
                  </button>
                )}
                <button onClick={stopNav} className="pixel-btn bg-red-500 px-2 py-1 text-[12.5px]">
                  ✕ 취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 공략 진행 오버레이 — 진행률은 시작 시각 기준으로 계산 */}
        {visit && (
          <div className="absolute inset-x-0 top-0 z-40 bg-[#fffaf2]/95 border-b-4 border-amber-500 p-3">
            <p className="text-[13.5px] text-[#b45309]">
              공략 중... 반경 {CONQUEST_RADIUS_M}m 안에서 대기하세요 (화면을 나가도 유지됩니다)
            </p>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-3 bg-[#f7ecdd] border-2 border-[#4a3324] overflow-hidden">
                <div
                  className="h-full bg-amber-300 transition-[width] duration-1000 ease-linear relative"
                  style={{
                    width: `${((visit.durationSec - remaining) / visit.durationSec) * 100}%`,
                  }}
                >
                  <span className="absolute inset-0 shimmer" />
                </div>
              </div>
              <span className="text-[13.5px] tabular">
                {String(Math.floor(remaining / 60)).padStart(2, '0')}:
                {String(remaining % 60).padStart(2, '0')}
              </span>
              <button
                onClick={cancelVisit}
                className="text-[12.5px] px-2 py-1 pixel-btn bg-red-500"
              >
                중단
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 가까운 맛집 */}
      <div className="pixel-panel p-3">
        <p className="text-[13.5px] text-[#7d6549] mb-2">가까운 맛집</p>
        <div className="space-y-1.5">
          {nearby.map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-[13.5px] min-h-11">
              <DotFood category={r.category} size={26} />
              <button
                onClick={() => setSelectedId(r.id)}
                className="flex-1 truncate text-left hover:text-[#b45309] transition-colors py-2"
              >
                {r.name}
              </button>
              <span className={r.dist <= CONQUEST_RADIUS_M ? 'text-emerald-700' : 'text-[#7d6549]'}>
                {r.dist < 1000 ? `${Math.round(r.dist)}m` : `${(r.dist / 1000).toFixed(1)}km`}
              </span>
              <button
                onClick={() => startNav(r)}
                className="px-3 py-1.5 pixel-btn bg-sky-400 text-[#4a3324] text-[12.5px]"
              >
                길찾기
              </button>
              {/* 워프는 개발자 도구를 펼쳤을 때만 — 실서비스에선 GPS 이동으로 대체 */}
              {isMock && devOpen && (
                <button
                  onClick={() => {
                    teleport({ lat: r.lat, lng: r.lng });
                    setFollow(true);
                    stopNav();
                  }}
                  className="px-2 py-1.5 pixel-btn bg-[#f1e3cf] text-[12.5px]"
                >
                  워프
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 일반 레이드 — 모르는 사람들과 파티 모아 함께 밥 먹고 인원수만큼 보상 */}
      <PublicRaidPanel />

      {/* 맛집 상세 모달 — body 로 포탈(페이지 transform 밖) → 뷰포트 정중앙 고정 */}
      {selected && createPortal(
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 fade-in"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="w-full max-w-[460px] max-h-[88vh] overflow-y-auto pixel-panel p-5 space-y-3 pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <DotFood category={selected.category} size={52} />
              <div className="flex-1 min-w-0">
                <p className="text-base">{selected.name}</p>
                <p className="text-[13.5px] text-[#7d6549]">
                  {selected.category} · {selected.address}
                </p>
                <p className="text-[13.5px] text-[#b45309] mt-1">
                  ★ {ratingOf(selected).toFixed(1)} · 공략법 {selected.reviews.length}개
                </p>
              </div>
              <span
                className={`text-[12.5px] px-2 py-1 border-2 border-[#4a3324] ${
                  selected.conquered ? 'bg-emerald-400 text-[#4a3324]' : 'bg-red-500'
                }`}
              >
                {selected.conquered ? '공략 완료' : '미공략'}
              </span>
            </div>

            <p className="text-[13.5px] text-[#5d4a35]">
              현재 거리{' '}
              <span className={canVisit ? 'text-emerald-700' : 'text-red-600'}>
                {Math.round(selectedDist)}m
              </span>{' '}
              / 공략 반경 {CONQUEST_RADIUS_M}m
            </p>

            <div className="flex gap-2">
              {/* 반경 밖이면 "맛집 방문" 대신 길찾기를 제안한다 */}
              {canVisit || selected.conquered ? (
                <button
                  disabled={selected.conquered || !!visit}
                  onClick={() => startVisit(selected.id, totalSeconds)}
                  className="flex-1 pixel-btn bg-amber-300 text-[#4a3324] py-2.5 text-sm"
                >
                  {selected.conquered
                    ? '이미 공략함'
                    : `맛집 방문 (${devFastTimer ? '10초' : `${CONQUEST_MINUTES}분`})`}
                </button>
              ) : (
                <button
                  onClick={() => startNav(selected)}
                  className="flex-1 pixel-btn bg-sky-400 text-[#4a3324] py-2.5 text-sm"
                >
                  🧭 길찾기 시작
                </button>
              )}
              <button
                onClick={() => navigate(`/board/${selected.id}`)}
                className="pixel-btn bg-[#f1e3cf] px-4 text-sm"
              >
                게시판
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

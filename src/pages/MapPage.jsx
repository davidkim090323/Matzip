import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGame, CONQUEST_MINUTES, CONQUEST_RADIUS_M, ratingOf } from '../store/gameStore';
import {
  useGeolocation,
  distanceMeters,
  bearingDeg,
  buildRoute,
  stepToward,
} from '../hooks/useGeolocation';
import { DotCharacter, DotMatmon, DotFood, DotFlag } from '../components/DotCharacter';
import { useModal } from '../hooks/useModal';

const BASE_SCALE = 22000; // 위경도 1도 → px (zoom 1 기준). 약 1px ≈ 5m
const VIEW_H = 480;
const PADDING = 700; // 지도 가장자리 여백(px)
const ZOOMS = [0.5, 0.75, 1, 1.5];

export default function MapPage() {
  const navigate = useNavigate();
  const restaurants = useGame((s) => s.restaurants);
  const costumes = useGame((s) => s.costumes);
  const user = useGame((s) => s.user);
  const pets = useGame((s) => s.equippedMatmon());
  const conquer = useGame((s) => s.conquer);
  const pushToast = useGame((s) => s.pushToast);
  const devFastTimer = useGame((s) => s.devFastTimer);
  const setDevFastTimer = useGame((s) => s.setDevFastTimer);

  const [mode, setMode] = useState('mock');
  const { pos, error, nudge, teleport, isMock } = useGeolocation(mode);

  const [zoom, setZoom] = useState(1);
  const [cam, setCam] = useState({ x: 0, y: 0 }); // 뷰포트 좌상단의 월드 좌표
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

  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const timerRef = useRef(null);
  const posRef = useRef(pos);
  posRef.current = pos;

  const scale = BASE_SCALE * zoom;

  // ── 월드 좌표계 ────────────────────────────────────────────
  // 전체 맛집을 감싸는 경계 상자를 만들고, 그 안에서 절대 픽셀 좌표를 쓴다.
  // (예전엔 캐릭터를 항상 화면 중앙에 고정했지만, 이제 지도를 자유롭게 끌 수 있어야 하므로
  //  "월드는 고정, 카메라가 움직인다" 구조로 바꿨다.)
  const bounds = useMemo(() => {
    const lats = restaurants.map((r) => r.lat);
    const lngs = restaurants.map((r) => r.lng);
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  }, [restaurants]);

  const cosLat = Math.cos(((bounds.minLat + bounds.maxLat) / 2) * (Math.PI / 180));

  const toWorld = useCallback(
    (lat, lng) => ({
      x: (lng - bounds.minLng) * scale * cosLat + PADDING,
      y: (bounds.maxLat - lat) * scale + PADDING,
    }),
    [bounds, scale, cosLat]
  );

  const world = {
    w: (bounds.maxLng - bounds.minLng) * scale * cosLat + PADDING * 2,
    h: (bounds.maxLat - bounds.minLat) * scale + PADDING * 2,
  };

  const me = toWorld(pos.lat, pos.lng);

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
          ...toWorld(r.lat, r.lng),
          dist: distanceMeters(pos, { lat: r.lat, lng: r.lng }),
          saved: bookmarkIds.includes(r.id),
        })),
    [restaurants, toWorld, pos, mapFilter, bookmarkIds]
  );

  const nearby = useMemo(() => [...markers].sort((a, b) => a.dist - b.dist).slice(0, 3), [markers]);

  /** 카메라를 월드 범위 안으로 가둔다 */
  const clamp = useCallback(
    (c) => {
      const vw = viewportRef.current?.clientWidth ?? 400;
      return {
        x: Math.max(0, Math.min(world.w - vw, c.x)),
        y: Math.max(0, Math.min(world.h - VIEW_H, c.y)),
      };
    },
    [world.w, world.h]
  );

  const centerOnMe = useCallback(() => {
    const vw = viewportRef.current?.clientWidth ?? 400;
    setCam(clamp({ x: me.x - vw / 2, y: me.y - VIEW_H / 2 }));
    setFollow(true);
  }, [me.x, me.y, clamp]);

  // 최초 진입 + follow 모드일 때 캐릭터 추적
  useEffect(() => {
    if (!follow) return;
    const vw = viewportRef.current?.clientWidth ?? 400;
    setCam(clamp({ x: me.x - vw / 2, y: me.y - VIEW_H / 2 }));
  }, [me.x, me.y, follow, clamp]);

  // ── 드래그로 지도 이동 ──────────────────────────────────────
  // 주의: 컨테이너에 setPointerCapture 를 걸면 안에 있는 버튼들의 click 이
  // 캡처 요소로 리다이렉트되어 전부 먹통이 된다. 그래서 캡처 대신 window 리스너를 쓰고,
  // 버튼 위에서 시작한 pointerdown 은 드래그로 치지 않는다.
  const onPointerDown = (e) => {
    if (e.target.closest('button')) return; // 버튼 클릭은 그대로 통과
    dragRef.current = { px: e.clientX, py: e.clientY, cx: cam.x, cy: cam.y, moved: false };
  };

  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.px;
      const dy = e.clientY - d.py;
      if (!d.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        d.moved = true;
        setFollow(false); // 손으로 끌기 시작하면 자동 추적 해제
      }
      if (d.moved) setCam(clamp({ x: d.cx - dx, y: d.cy - dy }));
    };
    const onUp = () => {
      // 클릭 핸들러가 moved 를 읽은 뒤에 비우도록 한 틱 미룬다
      setTimeout(() => { dragRef.current = null; }, 0);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [clamp]);

  // 휠 = 세로 스크롤, shift+휠 = 가로 스크롤
  const onWheel = (e) => {
    setFollow(false);
    setCam((c) =>
      clamp(
        e.shiftKey
          ? { x: c.x + e.deltaY, y: c.y }
          : { x: c.x + e.deltaX, y: c.y + e.deltaY }
      )
    );
  };

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
        const parts = [`EXP +${result.expGained}`, '🎟️ 뽑기권 +1'];
        pushToast({ icon: '🏆', title: `${target.name} 공략 완료!`, body: parts.join(' · ') });
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
  const radiusPx = (CONQUEST_RADIUS_M / 111_320) * scale;

  // Esc / 뒤로가기 / 배경 스크롤 잠금
  useModal(!!selected, () => setSelectedId(null));

  return (
    <div className="p-4 space-y-3 page-in">
      {/* 개발자 도구 — 실서비스에선 GPS 로 대체될 임시 기능들. 기본은 접혀 있다. */}
      <div className="pixel-panel">
        <button
          onClick={() => setDevOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-[13px]"
        >
          <span className="text-slate-400">
            🛠 개발자 도구{' '}
            <span className="text-[11.5px] text-slate-600">
              ({mode === 'mock' ? '목업 GPS' : '실제 GPS'}
              {devFastTimer ? ' · 빠른 타이머' : ''})
            </span>
          </span>
          <span className="text-slate-500">{devOpen ? '▲' : '▼'}</span>
        </button>

        {devOpen && (
          <div className="px-3 pb-3 space-y-2 text-[13px]">
            <p className="text-[11.5px] text-slate-500 leading-relaxed">
              워프·자동이동·빠른 타이머는 시연용입니다. 실서비스에서는 실제 GPS 이동과 30분
              체류로만 공략이 인정됩니다.
            </p>
            <div className="flex gap-1">
              {['mock', 'real'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-2 py-1.5 border-2 border-[#1b1230] ${
                    mode === m ? 'bg-amber-300 text-[#1b1230]' : 'bg-[#2b2050] text-slate-300'
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
              <span className="text-slate-300">빠른 타이머 (30분 → 10초)</span>
            </label>
          </div>
        )}
      </div>

      {error && (
        <p className="text-[13px] text-red-300 px-1">
          GPS 오류: {error} — 개발자 도구에서 목업 모드로 전환하세요.
        </p>
      )}

      {/* 지도 필터 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {filterChips.map((c) => (
          <button
            key={c}
            onClick={() => setMapFilter(c)}
            className={`px-2.5 py-1 text-[11.5px] border-2 border-[#1b1230] whitespace-nowrap transition-colors ${
              mapFilter === c ? 'bg-sky-400 text-[#1b1230]' : 'bg-[#241a45] text-slate-400'
            }`}
          >
            {c === '찜' ? `⭐ 찜 ${bookmarkIds.length}` : c}
          </button>
        ))}
      </div>

      {/* 지도 뷰포트 — 드래그/휠로 자유 이동 */}
      <div
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onWheel={onWheel}
        className="pixel-panel relative overflow-hidden cursor-grab active:cursor-grabbing touch-none select-none"
        style={{ height: VIEW_H }}
      >
        {/* 월드 레이어 — 카메라만큼 반대로 민다 */}
        <div
          className="absolute top-0 left-0"
          style={{
            width: world.w,
            height: world.h,
            transform: `translate3d(${-cam.x}px, ${-cam.y}px, 0)`,
            background:
              'repeating-linear-gradient(0deg,#2f4f3a 0 26px,#35583f 26px 52px), repeating-linear-gradient(90deg,rgba(0,0,0,0.07) 0 26px,transparent 26px 52px)',
          }}
        >
          {/* 네비게이션 경로 — 현재 위치 → 남은 웨이포인트 → 목적지 */}
          {route && (
            <svg
              className="absolute top-0 left-0 pointer-events-none"
              width={world.w}
              height={world.h}
            >
              {(() => {
                const pts = [me, ...route.points.slice(route.idx).map((p) => toWorld(p.lat, p.lng))];
                const d = pts.map((p) => `${p.x},${p.y}`).join(' ');
                return (
                  <>
                    {/* 밑에 깔리는 굵은 길 */}
                    <polyline
                      points={d}
                      fill="none"
                      stroke="#1b1230"
                      strokeWidth={9}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {/* 흐르는 점선 */}
                    <polyline
                      points={d}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth={4}
                      strokeDasharray="10 8"
                      strokeLinecap="round"
                      className="route-dash"
                    />
                    {/* 웨이포인트 점. 첫 번째(다음 목표)만 강조 */}
                    {pts.slice(1).map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={i === 0 ? 6 : 4}
                        fill={i === pts.length - 2 ? '#ef4444' : '#fbbf24'}
                        stroke="#1b1230"
                        strokeWidth={2}
                        className={i === 0 ? 'wp-next' : ''}
                      />
                    ))}
                  </>
                );
              })()}
            </svg>
          )}

          {/* 맛집 깃발 */}
          {markers.map((r) => {
            const near = r.dist <= CONQUEST_RADIUS_M;
            return (
              <div
                key={r.id}
                className="absolute -translate-x-1/2 -translate-y-full"
                style={{ left: r.x, top: r.y }}
              >
                <button
                  onClick={() => {
                    if (dragRef.current?.moved) return; // 드래그 중 클릭 무시
                    setSelectedId(r.id);
                  }}
                  className="flex flex-col items-center hover:scale-110 transition-transform"
                >
                  {near && !r.conquered && (
                    <span className="absolute bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-amber-300/40 marker-ping" />
                  )}
                  <span className="relative block">
                    <DotFlag conquered={r.conquered} size={36 * zoom} />
                    {r.saved && !r.conquered && (
                      <span className="absolute -top-1 -right-1 text-[12px] text-amber-300">★</span>
                    )}
                  </span>
                  <span
                    className={`font-pixel text-[10.5px] px-1 border border-[#1b1230] whitespace-nowrap ${
                      r.conquered ? 'bg-emerald-400 text-[#1b1230]' : 'bg-red-500 text-white'
                    }`}
                  >
                    {r.name}
                  </span>
                </button>
              </div>
            );
          })}

          {/* 공략 반경 */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-amber-300/50 pointer-events-none"
            style={{ left: me.x, top: me.y, width: radiusPx * 2, height: radiusPx * 2 }}
          />

          {/* 내 캐릭터 — 이제 월드 위 실제 좌표에 선다 */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"
            style={{ left: me.x, top: me.y }}
          >
            <span className="absolute left-1/2 -translate-x-1/2 bottom-0 w-8 h-2 bg-black/35 rounded-full blur-[1px]" />
            <DotCharacter
              color={costumes.colors.find((c) => c.id === user.costume.color)?.hex ?? '#3b82f6'}
              hatId={user.costume.hat}
              accessoryId={user.costume.accessory}
              size={68 * zoom}
              className="bob relative"
            />
            {/* 따라다니는 맛몬 */}
            {pets.map((m, i) => (
              <div
                key={m.id}
                className="absolute bob"
                style={{
                  left: (-40 + i * 36) * zoom,
                  top: (18 + (i % 2) * 12) * zoom,
                  animationDelay: `${i * 0.25}s`,
                }}
              >
                <DotMatmon id={m.id} size={30 * zoom} />
              </div>
            ))}
          </div>
        </div>

        {/* ── 오버레이 UI (지도와 함께 움직이지 않음) ── */}

        {/* 줌 */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {ZOOMS.map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`w-9 h-8 text-[11.5px] border-2 border-[#1b1230] font-pixel ${
                zoom === z ? 'bg-amber-300 text-[#1b1230]' : 'bg-[#1e163a]/90 text-slate-300'
              }`}
            >
              x{z}
            </button>
          ))}
        </div>

        {/* 내 위치로 */}
        <button
          onClick={centerOnMe}
          className={`absolute top-2 right-2 px-3 py-2 text-[13px] pixel-btn ${
            follow ? 'bg-emerald-400 text-[#1b1230]' : 'bg-[#2b2050] text-slate-200'
          }`}
        >
          {follow ? '◎ 추적중' : '◎ 내 위치'}
        </button>

        {/* 이동 패드 */}
        {isMock && (
          <div className="absolute bottom-2 right-2 grid grid-cols-3 gap-1 text-[11.5px]">
            <span />
            <button className="pixel-btn bg-[#2b2050] py-1" onClick={() => { nudge(25, 0); setFollow(true); }}>↑</button>
            <span />
            <button className="pixel-btn bg-[#2b2050] py-1" onClick={() => { nudge(0, -25); setFollow(true); }}>←</button>
            <button className="pixel-btn bg-[#2b2050] py-1" onClick={() => { nudge(-25, 0); setFollow(true); }}>↓</button>
            <button className="pixel-btn bg-[#2b2050] py-1" onClick={() => { nudge(0, 25); setFollow(true); }}>→</button>
          </div>
        )}

        {!route && (
          <p className="absolute bottom-2 left-2 text-[11.5px] text-white/70 bg-black/40 px-2 py-1 pointer-events-none">
            드래그·휠로 지도 이동 · 방향키로 캐릭터 이동
          </p>
        )}

        {/* 네비게이션 HUD */}
        {navInfo && !visit && (
          <div className="absolute inset-x-0 bottom-0 bg-[#1b1230]/93 border-t-4 border-amber-300 p-3 slide-up">
            <div className="flex items-center gap-3">
              {/* 방향 화살표 — 다음 웨이포인트 방위각 */}
              <div className="w-11 h-11 shrink-0 grid place-items-center border-2 border-amber-300 bg-[#241a45]">
                <span
                  className="text-2xl leading-none transition-transform duration-300"
                  style={{ transform: `rotate(${navInfo.bearing}deg)` }}
                >
                  ⬆️
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[13px] truncate">
                  🧭 <span className="text-amber-300">{navInfo.target.name}</span> 안내 중
                </p>
                <p className="text-[11.5px] text-slate-300">
                  남은 거리{' '}
                  <span className="font-pixel text-amber-300">
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
                    className={`pixel-btn px-2 py-1 text-[11.5px] ${
                      walking ? 'bg-emerald-400 text-[#1b1230]' : 'bg-[#2b2050] text-slate-200'
                    }`}
                  >
                    {walking ? '⏸ 정지' : '▶ 자동이동'}
                  </button>
                )}
                <button onClick={stopNav} className="pixel-btn bg-red-500 px-2 py-1 text-[11.5px]">
                  ✕ 취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 공략 진행 오버레이 — 진행률은 시작 시각 기준으로 계산 */}
        {visit && (
          <div className="absolute inset-x-0 top-0 bg-[#1b1230]/92 border-b-4 border-amber-300 p-3">
            <p className="text-[13px] text-amber-300">
              공략 중... 반경 {CONQUEST_RADIUS_M}m 안에서 대기하세요 (화면을 나가도 유지됩니다)
            </p>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-3 bg-[#241a45] border-2 border-[#1b1230] overflow-hidden">
                <div
                  className="h-full bg-amber-300 transition-[width] duration-1000 ease-linear relative"
                  style={{
                    width: `${((visit.durationSec - remaining) / visit.durationSec) * 100}%`,
                  }}
                >
                  <span className="absolute inset-0 shimmer" />
                </div>
              </div>
              <span className="text-[13px] tabular">
                {String(Math.floor(remaining / 60)).padStart(2, '0')}:
                {String(remaining % 60).padStart(2, '0')}
              </span>
              <button
                onClick={cancelVisit}
                className="text-[11.5px] px-2 py-1 pixel-btn bg-red-500"
              >
                중단
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 가까운 맛집 */}
      <div className="pixel-panel p-3">
        <p className="text-[13px] text-slate-400 mb-2">가까운 맛집</p>
        <div className="space-y-1.5">
          {nearby.map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-[13px] min-h-11">
              <DotFood category={r.category} size={26} />
              <button
                onClick={() => setSelectedId(r.id)}
                className="flex-1 truncate text-left hover:text-amber-300 transition-colors py-2"
              >
                {r.name}
              </button>
              <span className={r.dist <= CONQUEST_RADIUS_M ? 'text-emerald-300' : 'text-slate-400'}>
                {r.dist < 1000 ? `${Math.round(r.dist)}m` : `${(r.dist / 1000).toFixed(1)}km`}
              </span>
              <button
                onClick={() => startNav(r)}
                className="px-3 py-1.5 pixel-btn bg-sky-400 text-[#1b1230] text-[11.5px]"
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
                  className="px-2 py-1.5 pixel-btn bg-[#2b2050] text-[11.5px]"
                >
                  워프
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 맛집 상세 모달 */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center fade-in"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="w-full max-w-[480px] pixel-panel p-5 space-y-3 pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <DotFood category={selected.category} size={52} />
              <div className="flex-1 min-w-0">
                <p className="text-base">{selected.name}</p>
                <p className="text-[13px] text-slate-400">
                  {selected.category} · {selected.address}
                </p>
                <p className="text-[13px] text-amber-300 mt-1">
                  ★ {ratingOf(selected).toFixed(1)} · 공략법 {selected.reviews.length}개
                </p>
              </div>
              <span
                className={`text-[11.5px] px-2 py-1 border-2 border-[#1b1230] ${
                  selected.conquered ? 'bg-emerald-400 text-[#1b1230]' : 'bg-red-500'
                }`}
              >
                {selected.conquered ? '공략 완료' : '미공략'}
              </span>
            </div>

            <p className="text-[13px] text-slate-300">
              현재 거리{' '}
              <span className={canVisit ? 'text-emerald-300' : 'text-red-300'}>
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
                  className="flex-1 pixel-btn bg-amber-300 text-[#1b1230] py-2.5 text-sm"
                >
                  {selected.conquered
                    ? '이미 공략함'
                    : `맛집 방문 (${devFastTimer ? '10초' : `${CONQUEST_MINUTES}분`})`}
                </button>
              ) : (
                <button
                  onClick={() => startNav(selected)}
                  className="flex-1 pixel-btn bg-sky-400 text-[#1b1230] py-2.5 text-sm"
                >
                  🧭 길찾기 시작
                </button>
              )}
              <button
                onClick={() => navigate(`/board/${selected.id}`)}
                className="pixel-btn bg-[#2b2050] px-4 text-sm"
              >
                게시판
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

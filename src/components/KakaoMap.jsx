import { useEffect, useRef, useState, useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useGame, CONQUEST_RADIUS_M } from '../store/gameStore';
import { loadKakao } from '../lib/kakao';
import { DotCharacter, DotMatmon, DotFlag } from './DotCharacter';

/**
 * 카카오맵 기반 실제 지도.
 * 맛집 마커·플레이어 캐릭터·공략 반경·네비 경로를 지도 위 오버레이로 얹는다.
 * 지도 이동/줌은 카카오가 처리하고, pos(위치)·follow(추적)만 부모가 넘긴다.
 */
export default function KakaoMap({
  pos,
  follow,
  onUserPan,
  markers,
  route,
  selectedId,
  onSelect,
  radiusM = CONQUEST_RADIUS_M,
}) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const kakaoRef = useRef(null);
  const playerRef = useRef(null);
  const circleRef = useRef(null);
  const routeRef = useRef(null);
  const markerRef = useRef(new Map()); // id -> { overlay, el }
  const [status, setStatus] = useState('loading'); // loading | ready | error

  const user = useGame((s) => s.user);
  const costumes = useGame((s) => s.costumes);
  const pets = useGame((s) => s.equippedMatmon());
  const territoryByRest = useGame((s) => s.territoryByRest);
  const restaurants = useGame((s) => s.restaurants);

  // 지도 이동/줌을 춘천(맛집 전체 범위)으로 가두기 위한 경계
  const boundsRef = useRef(null);
  boundsRef.current = useMemo(() => {
    if (!restaurants.length) return null;
    const lats = restaurants.map((r) => r.lat);
    const lngs = restaurants.map((r) => r.lng);
    const pad = 0.01; // 가장자리 맛집도 중앙에 둘 수 있게 약간 여유
    return {
      minLat: Math.min(...lats) - pad,
      maxLat: Math.max(...lats) + pad,
      minLng: Math.min(...lngs) - pad,
      maxLng: Math.max(...lngs) + pad,
    };
  }, [restaurants]);

  const color = costumes.colors.find((c) => c.id === user?.costume?.color)?.hex ?? '#3b82f6';

  // 플레이어 오버레이 HTML — 캐릭터 + 동행 맛몬
  const playerHTML = useMemo(
    () =>
      renderToStaticMarkup(
        <div style={{ transform: 'translateY(5px)' }}>
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <DotCharacter
              color={color}
              hatId={user?.costume?.hat}
              accessoryId={user?.costume?.accessory}
              auraId={user?.costume?.aura}
              size={54}
              className="bob"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: -3 }}>
            {pets.map((m) => (
              <DotMatmon key={m.id} id={m.id} size={22} />
            ))}
          </div>
        </div>
      ),
    [color, user?.costume?.hat, user?.costume?.accessory, user?.costume?.aura, pets]
  );

  // ── 지도 초기화 ──
  useEffect(() => {
    let cancelled = false;
    loadKakao()
      .then((kakao) => {
        if (cancelled || !boxRef.current) return;
        kakaoRef.current = kakao;
        const center = new kakao.maps.LatLng(pos.lat, pos.lng);
        const map = new kakao.maps.Map(boxRef.current, { center, level: 4 });
        mapRef.current = map;
        if (typeof window !== 'undefined') window.__kakaoMap = map; // 디버그/검증용

        // 공략 반경
        circleRef.current = new kakao.maps.Circle({
          center,
          radius: radiusM,
          strokeWeight: 2,
          strokeColor: '#f59e0b',
          strokeOpacity: 0.9,
          strokeStyle: 'dashed',
          fillColor: '#fbbf24',
          fillOpacity: 0.15,
        });
        circleRef.current.setMap(map);

        // 플레이어 오버레이
        playerRef.current = new kakao.maps.CustomOverlay({
          position: center,
          content: `<div>${playerHTML}</div>`,
          xAnchor: 0.5,
          yAnchor: 1,
          zIndex: 5,
        });
        playerRef.current.setMap(map);

        // 사용자가 지도를 끌면 추적 해제
        kakao.maps.event.addListener(map, 'dragstart', () => onUserPan?.());
        // 줌에 따라 이름표 표시/숨김
        const applyZoomClass = () => {
          if (!boxRef.current) return;
          boxRef.current.classList.toggle('mk-zoomed', map.getLevel() <= 3);
        };
        kakao.maps.event.addListener(map, 'zoom_changed', applyZoomClass);
        applyZoomClass();

        // 춘천 밖으로 나가지 못하게 지도 이동/줌 제한
        const bb = boundsRef.current;
        if (bb) {
          map.setMaxLevel(8); // 너무 멀리 줌아웃 방지 (도시 전체 정도까지만)
          const clampCenter = () => {
            const c = map.getCenter();
            const lat = Math.min(Math.max(c.getLat(), bb.minLat), bb.maxLat);
            const lng = Math.min(Math.max(c.getLng(), bb.minLng), bb.maxLng);
            if (lat !== c.getLat() || lng !== c.getLng()) {
              map.setCenter(new kakao.maps.LatLng(lat, lng));
            }
          };
          kakao.maps.event.addListener(map, 'center_changed', clampCenter);
          clampCenter();
        }

        setStatus('ready');
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
    // 최초 1회만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 플레이어 위치/추적 ──
  useEffect(() => {
    const kakao = kakaoRef.current;
    if (status !== 'ready' || !kakao) return;
    const ll = new kakao.maps.LatLng(pos.lat, pos.lng);
    playerRef.current?.setPosition(ll);
    circleRef.current?.setPosition(ll);
    if (follow) mapRef.current?.panTo(ll);
  }, [pos.lat, pos.lng, follow, status]);

  // ── 플레이어 외형 갱신 ──
  useEffect(() => {
    if (status !== 'ready') return;
    playerRef.current?.setContent(`<div>${playerHTML}</div>`);
  }, [playerHTML, status]);

  // ── 맛집 마커 (스냅샷이 바뀔 때만 재생성) ──
  const markerSig = useMemo(
    () =>
      markers
        .map((m) => {
          const t = territoryByRest[m.id];
          return `${m.id}:${m.conquered ? 1 : 0}:${m.saved ? 1 : 0}:${t ? t.emblem : ''}:${selectedId === m.id ? 1 : 0}`;
        })
        .join('|'),
    [markers, territoryByRest, selectedId]
  );

  useEffect(() => {
    const kakao = kakaoRef.current;
    const map = mapRef.current;
    if (status !== 'ready' || !kakao || !map) return;

    const want = new Set(markers.map((m) => m.id));
    // 사라진 마커 제거
    for (const [id, entry] of markerRef.current) {
      if (!want.has(id)) {
        entry.overlay.setMap(null);
        markerRef.current.delete(id);
      }
    }
    // 추가/갱신
    for (const m of markers) {
      const terr = territoryByRest[m.id];
      const isSel = selectedId === m.id;
      const flag = terr
        ? `<div class="mk-emb">${terr.emblem}</div>`
        : `<div class="mk-pin">${renderToStaticMarkup(<DotFlag conquered={m.conquered} size={30} />)}</div>`;
      const nameBg = terr ? '#fcd34d' : m.conquered ? '#4ade80' : '#ef4444';
      const nameColor = terr || m.conquered ? '#4a3324' : '#fff';
      const html =
        `<div class="mk ${isSel ? 'mk-sel' : ''}">` +
        flag +
        `<div class="mk-name" style="background:${nameBg};color:${nameColor}">${m.name}${m.saved ? ' ★' : ''}</div>` +
        `</div>`;

      let entry = markerRef.current.get(m.id);
      if (!entry) {
        const el = document.createElement('div');
        el.addEventListener('click', () => onSelect?.(m.id));
        const overlay = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(m.lat, m.lng),
          content: el,
          xAnchor: 0.5,
          yAnchor: 1,
          clickable: true,
        });
        overlay.setMap(map);
        entry = { overlay, el };
        markerRef.current.set(m.id, entry);
      }
      entry.el.innerHTML = html;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markerSig, status]);

  // ── 네비 경로 ──
  useEffect(() => {
    const kakao = kakaoRef.current;
    const map = mapRef.current;
    if (status !== 'ready' || !kakao || !map) return;
    routeRef.current?.setMap(null);
    routeRef.current = null;
    if (!route) return;
    const pts = [pos, ...route.points.slice(route.idx)].map((p) => new kakao.maps.LatLng(p.lat, p.lng));
    routeRef.current = new kakao.maps.Polyline({
      path: pts,
      strokeWeight: 5,
      strokeColor: '#f59e0b',
      strokeOpacity: 0.9,
      strokeStyle: 'solid',
    });
    routeRef.current.setMap(map);
  }, [route, pos.lat, pos.lng, status]);

  if (status === 'error') {
    return (
      <div className="w-full h-full grid place-items-center text-center p-4 bg-[#f4ead6]">
        <div>
          <p className="text-3xl">🗺️</p>
          <p className="text-sm text-[#b45309] mt-2">지도를 불러오지 못했어요</p>
          <p className="text-[12.5px] text-[#7d6549] mt-1 leading-relaxed">
            카카오 개발자 콘솔에서 이 도메인이<br />플랫폼(Web)에 등록됐는지 확인하세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={boxRef} className="w-full h-full" />
      {status === 'loading' && (
        <div className="absolute inset-0 grid place-items-center bg-[#f4ead6] pointer-events-none">
          <span className="text-3xl bob">🗺️</span>
        </div>
      )}
    </>
  );
}

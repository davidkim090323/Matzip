import { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '../store/gameStore';

// 개발용 시작 좌표(춘천 명동 근처). 실제 브라우저 GPS를 못 쓰면 여기서 출발한다.
export const MOCK_ORIGIN = { lat: 37.8776, lng: 127.7276 };

/** 하버사인 거리(m) */
export function distanceMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 두 지점 사이 방위각(0=북, 시계방향 도) */
export function bearingDeg(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

/** from 에서 to 방향으로 meters 만큼 전진한 좌표 (도착점을 넘지 않음) */
export function stepToward(from, to, meters) {
  const d = distanceMeters(from, to);
  if (d <= meters || d === 0) return { ...to };
  const t = meters / d;
  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lng: from.lng + (to.lng - from.lng) * t,
  };
}

/**
 * 웨이포인트 경로 생성.
 * 실제 도로 데이터가 없으므로(API 미연동) 격자 도시를 가정하고
 * 동서 → 남북을 번갈아 꺾는 계단형(L자 반복) 경로를 만든다.
 * 지도 배경이 격자라 시각적으로도 "길을 따라가는" 느낌이 난다.
 * 도로 API가 붙으면 이 함수만 교체하면 된다.
 */
export function buildRoute(from, to, legs = 3) {
  const points = [];
  for (let i = 1; i <= legs; i++) {
    const t = i / legs;
    const prevT = (i - 1) / legs;
    // 이번 구간에서 이동할 목표 위경도
    const lat = from.lat + (to.lat - from.lat) * t;
    const lng = from.lng + (to.lng - from.lng) * t;
    const prevLat = from.lat + (to.lat - from.lat) * prevT;

    if (i % 2 === 1) {
      // 홀수 구간: 먼저 가로(경도) → 그다음 세로(위도)
      points.push({ lat: prevLat, lng });
      points.push({ lat, lng });
    } else {
      // 짝수 구간: 먼저 세로 → 가로
      points.push({ lat, lng: points[points.length - 1].lng });
      points.push({ lat, lng });
    }
  }
  points.push({ ...to });
  // 같은 자리 중복 제거
  return points.filter(
    (p, i, arr) => i === 0 || distanceMeters(p, arr[i - 1]) > 5
  );
}

/**
 * 위치 훅.
 * - real 모드: navigator.geolocation.watchPosition 로 실제 GPS 추적
 * - mock 모드: 키보드/버튼으로 좌표를 직접 움직임 (프로토타입 테스트용)
 * 두 모드 모두 같은 { lat, lng } 모양을 돌려주므로, 지도 컴포넌트는 어느 쪽인지 몰라도 된다.
 */
export function useGeolocation(mode = 'mock') {
  // 위치는 스토어에 산다. 훅은 GPS 를 읽어 스토어에 밀어 넣는 역할만.
  // (로컬 state 였을 때는 지도 페이지를 벗어나면 언마운트되며 시작 좌표로 되돌아갔다)
  const pos = useGame((s) => s.playerPos);
  const setPos = useGame((s) => s.setPlayerPos);
  const posRef = useRef(pos);
  posRef.current = pos;

  const [error, setError] = useState(null);
  const watchId = useRef(null);

  useEffect(() => {
    if (mode !== 'real') {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      return;
    }
    if (!('geolocation' in navigator)) {
      setError('이 브라우저는 위치 서비스를 지원하지 않습니다.');
      return;
    }
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        setError(null);
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      (e) => setError(e.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [mode]);

  /** mock 모드에서 캐릭터를 미터 단위로 이동 */
  const nudge = useCallback(
    (dNorthM, dEastM) => {
      if (mode === 'real') return;
      const p = posRef.current;
      setPos({
        lat: p.lat + dNorthM / 111_320,
        lng: p.lng + dEastM / (111_320 * Math.cos((p.lat * Math.PI) / 180)),
      });
    },
    [mode, setPos]
  );

  /** mock 모드에서 특정 좌표로 순간이동 (맛집 앞으로 워프 등) */
  const teleport = useCallback(
    (next) => {
      if (mode === 'real') return;
      setPos(next);
    },
    [mode, setPos]
  );

  return { pos, error, nudge, teleport, isMock: mode !== 'real' };
}

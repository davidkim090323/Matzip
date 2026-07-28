// 카카오맵 JavaScript SDK 로더.
// JavaScript 키는 도메인(카카오 콘솔 플랫폼 등록)으로 잠기므로 클라이언트에 공개돼도 안전하다.
export const KAKAO_JS_KEY = 'be8628ac781ace19c123a885f9c58318';

let _promise = null;

/** 카카오맵 SDK를 한 번만 로드하고 window.kakao 를 돌려준다. */
export function loadKakao() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.kakao && window.kakao.maps && window.kakao.maps.Map) {
    return Promise.resolve(window.kakao);
  }
  if (_promise) return _promise;

  _promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    // autoload=false → 스크립트 로드 후 kakao.maps.load()로 명시 초기화
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false`;
    script.async = true;
    script.onload = () => {
      try {
        window.kakao.maps.load(() => resolve(window.kakao));
      } catch (e) {
        reject(e);
      }
    };
    script.onerror = () => reject(new Error('Kakao SDK 로드 실패 (도메인 등록/키 확인)'));
    document.head.appendChild(script);
  });
  return _promise;
}

/**
 * 로컬 알림 헬퍼.
 * 백엔드(푸시 서버)가 없으므로 서버 푸시는 못 한다. 대신 앱이 열려 있는 동안
 * 발생하는 비동기 이벤트(공략 타이머 완료, 찜 맛집 근처 도착)를 OS 알림으로 띄운다.
 * → 유저가 30분 타이머를 걸어두고 다른 앱을 봐도 완료 시점을 놓치지 않는다.
 *
 * 실제 서버 푸시(closed 상태 알림)를 붙이려면 이 파일에 pushManager.subscribe 를 추가하고
 * sw.js 의 'push' 이벤트를 구현하면 된다.
 */

export const notifySupported = () =>
  typeof window !== 'undefined' && 'Notification' in window;

/** 'granted' | 'denied' | 'default' | 'unsupported' */
export const notifyPermission = () =>
  notifySupported() ? Notification.permission : 'unsupported';

/** 권한 요청. 이미 허용됐으면 바로 granted 반환 */
export async function requestNotify() {
  if (!notifySupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/**
 * 알림 발송.
 * 모바일 크롬은 new Notification() 생성자가 막혀 있어(SW 필수) 등록된 서비스워커의
 * showNotification 을 우선 쓰고, 없으면 생성자로 폴백한다.
 * 권한이 없으면 조용히 false 를 돌려주므로 호출부는 결과를 신경 쓸 필요가 없다.
 */
export async function sendNotify(title, opts = {}) {
  if (!notifySupported() || Notification.permission !== 'granted') return false;
  const payload = {
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    lang: 'ko',
    ...opts,
  };
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, payload);
        return true;
      }
    }
    new Notification(title, payload);
    return true;
  } catch {
    return false;
  }
}

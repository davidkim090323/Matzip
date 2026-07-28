import { useEffect, useState } from 'react';
import { useGame } from '../store/gameStore';
import { notifySupported, notifyPermission, requestNotify, sendNotify } from '../lib/notify';

/**
 * "알림 켜기" 배너.
 * 권한이 아직 default 일 때만 뜬다. 허용하면 사라지고, "나중에" 누르면 이번 세션 동안 숨긴다.
 * 알림 용도: 공략 타이머 완료 · 찜한 맛집 근처 도착.
 */
export default function NotifyPrompt() {
  const pushToast = useGame((s) => s.pushToast);
  const [perm, setPerm] = useState(() => notifyPermission());
  const [snoozed, setSnoozed] = useState(false);

  // 다른 탭/OS 설정에서 권한이 바뀌었을 수 있으니 진입 시 한 번 동기화
  useEffect(() => {
    setPerm(notifyPermission());
  }, []);

  if (!notifySupported() || perm !== 'default' || snoozed) return null;

  const enable = async () => {
    const result = await requestNotify();
    setPerm(result);
    if (result === 'granted') {
      sendNotify('맛집공략 알림 켜짐 🔔', {
        body: '공략 타이머 완료와 찜 맛집 근처 알림을 보내드려요.',
        tag: 'welcome',
      });
      pushToast({ icon: '🔔', title: '알림을 켰어요', body: '타이머 완료·찜 맛집 근처를 알려드립니다.' });
    } else if (result === 'denied') {
      pushToast({ icon: '🔕', title: '알림이 차단됐어요', body: '기기 설정에서 다시 켤 수 있어요.' });
    }
  };

  return (
    <div className="pixel-panel p-3 flex items-center gap-3 border-amber-500 pop-in">
      <span className="text-2xl shrink-0">🔔</span>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px]">알림 켜고 공략 타이밍 놓치지 않기</p>
        <p className="text-[12.5px] text-[#7d6549] mt-0.5">타이머 완료 · 찜 맛집 근처 도착 시</p>
      </div>
      <button
        onClick={enable}
        className="pixel-btn bg-amber-300 text-[#4a3324] px-3 py-2 text-[13.5px] shrink-0"
      >
        켜기
      </button>
      <button
        onClick={() => setSnoozed(true)}
        className="text-[#b89f7c] hover:text-[#7d6549] px-1 shrink-0"
        aria-label="알림 나중에"
      >
        ✕
      </button>
    </div>
  );
}

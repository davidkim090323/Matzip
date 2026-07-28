import { useEffect, useState } from 'react';

/**
 * "앱으로 설치" 배너.
 * Android/Chrome: beforeinstallprompt 이벤트를 잡아뒀다가 버튼 클릭 시 네이티브 설치창을 띄운다.
 * iOS/Safari: 해당 이벤트가 없어서 공유 → "홈 화면에 추가" 안내만 보여준다.
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('install-dismissed') === '1'
  );

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault(); // 브라우저 기본 배너를 막고 우리가 원하는 타이밍에 띄운다
      setDeferred(e);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const canShow = !isStandalone && !dismissed && (deferred || isIos);
  if (!canShow) return null;

  const dismiss = () => {
    localStorage.setItem('install-dismissed', '1');
    setDismissed(true);
  };

  const install = async () => {
    if (isIos) {
      setShowIosHint(true);
      return;
    }
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') dismiss();
    setDeferred(null);
  };

  return (
    <div className="pixel-panel p-3 flex items-center gap-3 border-amber-500 pop-in">
      <span className="text-2xl shrink-0">📲</span>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px]">앱으로 설치하고 홈 화면에서 바로 실행</p>
        {showIosHint ? (
          <p className="text-[12.5px] text-[#b45309] mt-0.5">
            Safari 하단 공유 버튼(⬆️) → "홈 화면에 추가"를 누르세요
          </p>
        ) : (
          <p className="text-[12.5px] text-[#7d6549] mt-0.5">오프라인에서도 열립니다</p>
        )}
      </div>
      <button
        onClick={install}
        className="pixel-btn bg-amber-300 text-[#4a3324] px-3 py-2 text-[13.5px] shrink-0"
      >
        설치
      </button>
      <button onClick={dismiss} className="text-[#b89f7c] hover:text-[#7d6549] px-1 shrink-0">
        ✕
      </button>
    </div>
  );
}

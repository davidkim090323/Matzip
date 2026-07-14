import { useEffect } from 'react';
import { useGame } from '../store/gameStore';

/** 레벨업 / 칭호 해금 / 공략 완료 알림. 2.8초 뒤 자동 소멸. */
export default function Toast() {
  const toast = useGame((s) => s.toast);
  const clearToast = useGame((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clearToast, 2800);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-[440px] slide-down">
      <button
        onClick={clearToast}
        className="w-full pixel-panel px-4 py-3 flex items-center gap-3 text-left"
      >
        <span className="text-2xl shrink-0">{toast.icon ?? '✨'}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-amber-300 truncate">{toast.title}</p>
          {toast.body && <p className="text-[13px] text-slate-300 mt-0.5">{toast.body}</p>}
        </div>
      </button>
      {/* 남은 시간 게이지 */}
      <div className="h-1 bg-amber-300 origin-left" style={{ animation: 'toast-bar 2.8s linear forwards' }} />
      <style>{`@keyframes toast-bar { from { transform: scaleX(1) } to { transform: scaleX(0) } }`}</style>
    </div>
  );
}

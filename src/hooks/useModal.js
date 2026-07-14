import { useEffect } from 'react';

/**
 * 모달 공통 동작.
 * - Esc 로 닫기
 * - 열려 있는 동안 배경 스크롤 잠금 (모바일에서 모달 뒤 페이지가 같이 밀리는 문제)
 * - 안드로이드/iOS 뒤로가기(popstate)로도 닫히게 히스토리 항목을 하나 쌓는다
 */
export function useModal(open, onClose) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';

    // 뒤로가기로 모달만 닫기
    window.history.pushState({ modal: true }, '');
    const onPop = () => onClose?.();
    window.addEventListener('popstate', onPop);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('popstate', onPop);
      document.body.style.overflow = prevOverflow;
      window.scrollTo(0, scrollY);
      // 모달을 코드로 닫은 경우 쌓아둔 히스토리 항목을 되돌린다
      if (window.history.state?.modal) window.history.back();
    };
  }, [open, onClose]);
}

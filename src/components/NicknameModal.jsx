import { useState } from 'react';
import { useGame } from '../store/gameStore';
import { useAuth } from '../contexts/AuthContext';

/**
 * 회원가입(이메일) 후 메인 화면 최초 진입 시 뜨는 닉네임 설정 모달.
 * displayName 이 비어 있을 때만 App 이 렌더한다(구글 가입은 이름이 있어 안 뜸).
 * 설정하면 Auth displayName · RTDB 프로필 · 게임 스토어 닉네임을 함께 갱신한다.
 */
export default function NicknameModal() {
  const { user, updateNickname } = useAuth();
  const setNickname = useGame((s) => s.setNickname);
  const pushToast = useGame((s) => s.pushToast);
  // 구글 가입은 계정 이름을 기본값으로 채워준다(그대로 시작하거나 바꾸면 됨)
  const [value, setValue] = useState(() => user?.displayName ?? '');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const nn = value.trim();
    if (nn.length < 2 || saving) return;
    setSaving(true);
    try {
      await updateNickname(nn);
      setNickname(nn);
      pushToast({ icon: '🎉', title: `${nn}님, 환영해요!`, body: '춘천 맛집 정복을 시작하세요.' });
    } catch {
      pushToast({ icon: '⚠️', title: '닉네임 저장 실패', body: '잠시 후 다시 시도해 주세요.' });
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-[380px] pixel-panel p-5 pop-in">
        <div className="text-center mb-4">
          <div className="text-4xl bob">🎨</div>
          <h2 className="text-lg text-[#3d2c1e] mt-2">닉네임을 정해주세요</h2>
          <p className="text-[12.5px] text-[#7d6549] mt-1">지도와 랭킹에 표시될 이름이에요.</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="2자 이상"
            maxLength={12}
            className="w-full bg-[#f7ecdd] border-2 border-[#e2cfae] px-3 py-2.5 text-[14px] text-[#3d2c1e] text-center outline-none focus:border-amber-500 transition-colors"
          />
          <button
            type="submit"
            disabled={value.trim().length < 2 || saving}
            className="pixel-btn w-full bg-amber-300 text-[#4a3324] py-3 text-[14px] disabled:opacity-60"
          >
            {saving ? '저장 중...' : '시작하기'}
          </button>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Firebase Auth 오류코드 → 한글 안내
const ERROR_MESSAGES = {
  'auth/email-already-in-use': '이미 가입된 이메일이에요.',
  'auth/invalid-email': '이메일 형식이 올바르지 않아요.',
  'auth/weak-password': '비밀번호는 6자 이상이어야 해요.',
  'auth/user-not-found': '가입되지 않은 이메일이에요.',
  'auth/wrong-password': '비밀번호가 틀렸어요.',
  'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않아요.',
  'auth/too-many-requests': '시도가 너무 많아요. 잠시 후 다시 시도해 주세요.',
  'auth/popup-closed-by-user': '구글 로그인 창이 닫혔어요.',
  'auth/operation-not-allowed': '이 로그인 방식이 콘솔에서 아직 켜지지 않았어요.',
};

// 배경에 떠다니는 장식 이모지 (춘천 대표 먹거리 + 게임 요소)
const FLOATERS = [
  { e: '🍗', top: '9%', left: '10%', size: 40, d: '7s', r: '-12deg', delay: '0s' },
  { e: '🍜', top: '15%', left: '80%', size: 36, d: '8s', r: '10deg', delay: '.6s' },
  { e: '🥔', top: '68%', left: '7%', size: 32, d: '6.5s', r: '8deg', delay: '1.1s' },
  { e: '☕', top: '77%', left: '82%', size: 34, d: '7.5s', r: '-8deg', delay: '.3s' },
  { e: '🚩', top: '41%', left: '89%', size: 28, d: '6s', r: '6deg', delay: '.9s' },
  { e: '🗺️', top: '48%', left: '3%', size: 32, d: '8.5s', r: '-6deg', delay: '.2s' },
];

export default function Login() {
  const { signUpWithEmail, signInWithEmail, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') await signUpWithEmail(email.trim(), password);
      else await signInWithEmail(email.trim(), password);
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] || '오류가 발생했어요. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] || '구글 로그인에 실패했어요.');
    }
  };

  return (
    <div
      className="relative min-h-[100dvh] grid place-items-center p-4 overflow-hidden"
      style={{
        background:
          'radial-gradient(125% 85% at 50% -10%, #fff4de 0%, #fce8cf 42%, #f4d9ba 100%)',
      }}
    >
      {/* 배경 장식 — 떠다니는 음식 이모지 (장식이라 스크린리더/클릭 제외) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
        {FLOATERS.map((f, i) => (
          <span
            key={i}
            className="float-slow absolute opacity-25"
            style={{
              top: f.top,
              left: f.left,
              fontSize: f.size,
              '--d': f.d,
              '--r': f.r,
              animationDelay: f.delay,
            }}
          >
            {f.e}
          </span>
        ))}
        {/* 위쪽 따뜻한 광채 */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.35), transparent 70%)' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[420px] page-in">
        {/* 로고 */}
        <div className="text-center mb-6">
          <div className="relative inline-grid place-items-center">
            <span
              className="glow-pulse absolute w-24 h-24 rounded-full blur-xl"
              style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.55), transparent 70%)' }}
            />
            <div className="relative w-20 h-20 grid place-items-center bg-[#fffaf2] border-[3px] border-[#4a3324] rotate-3 shadow-[4px_4px_0_rgba(74,51,36,0.25)]">
              <span className="text-4xl bob">🍗</span>
              <span className="absolute -top-2 -right-2 text-lg drop-in">🚩</span>
            </div>
          </div>
          <h1 className="text-3xl text-[#3d2c1e] mt-4 tracking-tight">맛집공략</h1>
          <div className="mt-2 inline-flex items-center gap-1 bg-[#fffaf2] border-2 border-[#e2cfae] px-2.5 py-0.5">
            <span className="text-[12px]">📍</span>
            <span className="text-[12.5px] text-[#7d6549]">춘천 맛집 정복 게임</span>
          </div>
        </div>

        <div
          className="pixel-panel p-5"
          style={{ boxShadow: '7px 7px 0 rgba(74,51,36,0.16)' }}
        >
          {/* 로그인/회원가입 탭 */}
          <div className="flex gap-1 p-1 bg-[#f7ecdd] border-2 border-[#4a3324] mb-5">
            {[
              { id: 'login', label: '로그인' },
              { id: 'signup', label: '회원가입' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setMode(t.id);
                  setError('');
                }}
                className={`flex-1 py-2 text-[13.5px] transition-colors ${
                  mode === t.id ? 'bg-amber-300 text-[#4a3324]' : 'text-[#7d6549] hover:bg-[#f1e3cf]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 border-2 border-red-400 bg-red-100 text-red-700 text-[13px]">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-[12.5px] text-[#7d6549] mb-1">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                className="w-full bg-[#f7ecdd] border-2 border-[#e2cfae] px-3 py-2.5 text-[13.5px] text-[#3d2c1e] outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[12.5px] text-[#7d6549] mb-1">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자 이상"
                required
                className="w-full bg-[#f7ecdd] border-2 border-[#e2cfae] px-3 py-2.5 text-[13.5px] text-[#3d2c1e] outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="pixel-btn w-full bg-amber-300 text-[#4a3324] py-3 text-[14px] disabled:opacity-60"
            >
              {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
            </button>
          </form>

          {/* 구분선 */}
          <div className="flex items-center gap-2 my-4">
            <span className="flex-1 h-0.5 bg-[#e2cfae]" />
            <span className="text-[12px] text-[#96805f]">또는</span>
            <span className="flex-1 h-0.5 bg-[#e2cfae]" />
          </div>

          {/* 구글 로그인 */}
          <button
            onClick={google}
            className="pixel-btn w-full bg-[#fffaf2] text-[#3d2c1e] py-3 text-[13.5px] flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            구글로 계속하기
          </button>
        </div>

        {/* 기능 미리보기 칩 */}
        <div className="mt-5 flex justify-center gap-1.5">
          {[
            { icon: '🗺️', label: '실시간 지도' },
            { icon: '🏆', label: '랭킹' },
            { icon: '🎁', label: '뽑기' },
          ].map((f) => (
            <span
              key={f.label}
              className="inline-flex items-center gap-1 bg-[#fffaf2]/80 border-2 border-[#e2cfae] px-2.5 py-1 text-[12px] text-[#7d6549]"
            >
              <span>{f.icon}</span>
              {f.label}
            </span>
          ))}
        </div>

        <p className="text-center text-[12px] text-[#96805f] mt-4">
          가입하면 춘천 맛집 지도가 열립니다 🗺️
        </p>
      </div>
    </div>
  );
}

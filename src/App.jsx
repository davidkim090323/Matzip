import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useGame } from './store/gameStore';
import { useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Toast from './components/Toast';
import LevelUpModal from './components/LevelUpModal';
import VisitBanner from './components/VisitBanner';
import NicknameModal from './components/NicknameModal';

// 홈 외 페이지는 지연 로딩 — 모바일 첫 진입 시 내려받는 JS 를 줄인다
const MapPage = lazy(() => import('./pages/MapPage'));
const Board = lazy(() => import('./pages/Board'));
const RestaurantBoard = lazy(() => import('./pages/RestaurantBoard'));
const Shop = lazy(() => import('./pages/Shop'));
const Customize = lazy(() => import('./pages/Customize'));
const Guild = lazy(() => import('./pages/Guild'));
const Settings = lazy(() => import('./pages/Settings'));

const TABS = [
  { to: '/', label: '홈', icon: '🏠' },
  { to: '/map', label: '지도', icon: '🗺️' },
  { to: '/board', label: '게시판', icon: '📝' },
  { to: '/shop', label: '상점', icon: '🏪' },
  { to: '/customize', label: '꾸미기', icon: '🎨' },
  { to: '/guild', label: '길드', icon: '🏰' },
  { to: '/settings', label: '설정', icon: '⚙️' },
];

export default function App() {
  const { user, loading: authLoading, needsNickname } = useAuth();
  const hydrate = useGame((s) => s.hydrate);
  const teardown = useGame((s) => s.teardown);
  const loaded = useGame((s) => s.loaded);
  const location = useLocation();

  // 로그인하면 계정 진행도를 클라우드에서 불러오고, 로그아웃하면 정리한다
  useEffect(() => {
    if (user) hydrate(user);
    else teardown();
  }, [hydrate, teardown, user]);

  // 라우트가 바뀌면 스크롤을 위로
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // 로그인 상태 확인 중
  if (authLoading) {
    return (
      <div className="min-h-screen grid place-items-center gap-3">
        <span className="text-4xl bob">🚩</span>
      </div>
    );
  }

  // 미로그인 → 초기 로그인/회원가입 화면
  if (!user) return <Login />;

  if (!loaded) {
    return (
      <div className="min-h-screen grid place-items-center gap-3">
        <span className="text-4xl bob">🍚</span>
        <span className="text-sm tracking-widest animate-pulse">맛집 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col mx-auto max-w-[480px] w-full relative">
      <main
        className="flex-1"
        style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom))' }}
      >
        {/* key=pathname → 페이지 전환마다 page-in 애니메이션 재생 */}
        <Suspense
          fallback={
            <div className="grid place-items-center py-24">
              <span className="text-3xl bob">🍚</span>
            </div>
          }
        >
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/board" element={<Board />} />
            <Route path="/board/:id" element={<RestaurantBoard />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/customize" element={<Customize />} />
            <Route path="/guild" element={<Guild />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      <VisitBanner />

      {/* pb 는 iOS 홈 인디케이터(safe-area) 만큼 더 띄운다 */}
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] grid grid-cols-7 bg-[#fffaf2]/95 backdrop-blur border-t-4 border-[#4a3324] z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) =>
              `relative py-2.5 flex flex-col items-center gap-0.5 text-[10px] transition-all ${
                isActive
                  ? 'text-[#b45309] bg-[#f1e3cf]'
                  : 'text-[#7d6549] hover:text-[#4a3a29] hover:bg-[#f1e3cf]/50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`text-lg leading-none transition-transform ${isActive ? 'scale-115 -translate-y-0.5' : ''}`}>
                  {t.icon}
                </span>
                {t.label}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-amber-300" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <Toast />
      <LevelUpModal />
      {needsNickname && <NicknameModal />}
    </div>
  );
}

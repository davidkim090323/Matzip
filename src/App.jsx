import { useEffect } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useGame } from './store/gameStore';
import Home from './pages/Home';
import MapPage from './pages/MapPage';
import Board from './pages/Board';
import RestaurantBoard from './pages/RestaurantBoard';
import Customize from './pages/Customize';
import Toast from './components/Toast';
import LevelUpModal from './components/LevelUpModal';
import VisitBanner from './components/VisitBanner';

const TABS = [
  { to: '/', label: '홈', icon: '🏠' },
  { to: '/map', label: '지도', icon: '🗺️' },
  { to: '/board', label: '게시판', icon: '📝' },
  { to: '/customize', label: '꾸미기', icon: '🎨' },
];

export default function App() {
  const load = useGame((s) => s.load);
  const loaded = useGame((s) => s.loaded);
  const location = useLocation();

  useEffect(() => {
    load();
  }, [load]);

  // 라우트가 바뀌면 스크롤을 위로
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

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
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/board" element={<Board />} />
          <Route path="/board/:id" element={<RestaurantBoard />} />
          <Route path="/customize" element={<Customize />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <VisitBanner />

      {/* pb 는 iOS 홈 인디케이터(safe-area) 만큼 더 띄운다 */}
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] grid grid-cols-4 bg-[#1e163a]/95 backdrop-blur border-t-4 border-[#4c3f7a] z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) =>
              `relative py-3 flex flex-col items-center gap-1 text-[11px] transition-all ${
                isActive
                  ? 'text-amber-300 bg-[#2b2050]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#2b2050]/50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`text-xl leading-none transition-transform ${isActive ? 'scale-115 -translate-y-0.5' : ''}`}>
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
    </div>
  );
}

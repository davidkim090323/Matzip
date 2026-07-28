import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame, ratingOf } from '../store/gameStore';
import { distanceMeters } from '../hooks/useGeolocation';
import { DotFood } from '../components/DotCharacter';

function Stars({ value, onChange }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          disabled={!onChange}
          className={`text-xl leading-none transition-transform ${
            onChange ? 'hover:scale-125 active:scale-90' : ''
          }`}
        >
          <span className={n <= value ? 'text-[#b45309]' : 'text-[#b89f7c]'}>★</span>
        </button>
      ))}
    </div>
  );
}

/**
 * 리뷰 등록 후 "그래서 이제 뭐 하지?" 를 없애는 다음 행동 안내.
 * 가장 가까운 미공략 맛집으로 바로 길찾기를 걸어준다.
 */
function NextStepCard({ onClose }) {
  const navigate = useNavigate();
  const restaurants = useGame((s) => s.restaurants);
  const tickets = useGame((s) => s.user.gachaTickets);
  const playerPos = useGame((s) => s.playerPos);

  // 현재 위치에서 가장 가까운 미공략 맛집
  const nextTarget = useMemo(
    () =>
      restaurants
        .filter((r) => !r.conquered)
        .sort((a, b) => distanceMeters(playerPos, a) - distanceMeters(playerPos, b))[0],
    [restaurants, playerPos]
  );

  return (
    <div className="pixel-panel p-5 space-y-3 pop-in border-amber-500">
      <div className="text-center">
        <p className="text-3xl">🎉</p>
        <h2 className="text-sm text-[#b45309] mt-1">공략법 등록 완료!</h2>
        <p className="text-[13.5px] text-[#7d6549] mt-1">다음은 뭘 할까요?</p>
      </div>

      <div className="grid gap-2">
        {nextTarget && (
          <button
            onClick={() => navigate(`/map?nav=${nextTarget.id}`)}
            className="pixel-btn bg-sky-400 text-[#4a3324] py-2.5 text-sm text-left px-4"
          >
            🧭 다음 맛집 공략 — {nextTarget.name}
          </button>
        )}
        <button
          onClick={() => navigate('/shop')}
          className="pixel-btn bg-amber-300 text-[#4a3324] py-2.5 text-sm text-left px-4"
        >
          🎁 뽑기하러 가기 (뽑기권 {tickets}장)
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => navigate('/board')}
            className="pixel-btn bg-[#f1e3cf] py-2 text-[13.5px]"
          >
            📝 게시판
          </button>
          <button
            onClick={() => navigate('/')}
            className="pixel-btn bg-[#f1e3cf] py-2 text-[13.5px]"
          >
            🏠 홈
          </button>
        </div>
        <button
          onClick={onClose}
          className="text-[12.5px] text-[#96805f] hover:text-[#5d4a35] py-1 transition-colors"
        >
          이 맛집에 계속 머무르기
        </button>
      </div>
    </div>
  );
}

export default function RestaurantBoard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const restaurant = useGame((s) => s.getRestaurant(id));
  const addReview = useGame((s) => s.addReview);
  const updateReview = useGame((s) => s.updateReview);
  const myReview = useGame((s) => s.myReview(id));
  const pushToast = useGame((s) => s.pushToast);
  const bookmarkIds = useGame((s) => s.bookmarkIds);
  const toggleBookmark = useGame((s) => s.toggleBookmark);
  const toggleHelpful = useGame((s) => s.toggleHelpful);
  const helpfulReviewIds = useGame((s) => s.helpfulReviewIds);

  const [form, setForm] = useState({ title: '', body: '', stars: 5 });
  const [posted, setPosted] = useState(false); // 리뷰 등록 직후 다음 단계 카드 표시
  const [editing, setEditing] = useState(false); // 기존 공략법 수정 모드

  if (!restaurant) {
    return (
      <div className="p-4 page-in">
        <p className="text-sm">없는 맛집입니다.</p>
        <button
          onClick={() => navigate('/board')}
          className="mt-3 pixel-btn bg-[#f1e3cf] px-3 py-2 text-sm"
        >
          목록으로
        </button>
      </div>
    );
  }

  const ERRORS = {
    not_conquered: '먼저 이 맛집을 공략해야 합니다.',
    already_written: '이미 공략법을 작성했습니다. 수정만 가능합니다.',
    no_review: '수정할 공략법이 없습니다.',
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;

    // 수정 모드면 덮어쓰기(EXP 없음), 아니면 신규 등록(EXP +15, 1회 한정)
    const res = editing
      ? updateReview(restaurant.id, form)
      : addReview(restaurant.id, form);

    if (res?.error) {
      pushToast({ icon: '🔒', title: '작성 불가', body: ERRORS[res.error] ?? '오류' });
      return;
    }

    if (editing) {
      setEditing(false);
      pushToast({ icon: '✏️', title: '공략법 수정 완료', body: '수정 이력이 표시됩니다.' });
      return;
    }

    setForm({ title: '', body: '', stars: 5 });
    setPosted(true);
    pushToast({
      icon: '📝',
      title: '공략법 등록 완료!',
      body:
        res.levelUps > 0
          ? `EXP +${res.expGained} · Lv.${res.newLevel} 달성!`
          : `EXP +${res.expGained}`,
    });
  };

  const startEdit = () => {
    setForm({ title: myReview.title, body: myReview.body, stars: myReview.stars });
    setEditing(true);
    setPosted(false);
  };

  return (
    <div className="p-4 space-y-4 page-in">
      <button
        onClick={() => navigate(-1)}
        className="text-[13.5px] text-[#7d6549] hover:text-[#4a3a29] transition-colors"
      >
        ‹ 뒤로
      </button>

      <div className="pixel-panel p-4">
        <div className="flex items-start gap-3">
          <DotFood category={restaurant.category} size={60} />
          <div className="flex-1 min-w-0">
            <h1 className="text-base">{restaurant.name}</h1>
            <p className="text-[13.5px] text-[#7d6549] mt-0.5">
              {restaurant.category} · {restaurant.address}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {/* 평점 = 공략법 별점 평균 (리뷰 없으면 시드값) */}
              <Stars value={Math.round(ratingOf(restaurant))} />
              <span className="text-[13.5px] text-[#b45309]">
                {ratingOf(restaurant).toFixed(1)}
                <span className="text-[#96805f] ml-1">({restaurant.reviews.length})</span>
              </span>
            </div>
          </div>

          {/* 찜 — 가고 싶은 맛집을 모아두고 지도/목록에서 필터링 */}
          <button
            onClick={() => toggleBookmark(restaurant.id)}
            className={`text-2xl shrink-0 transition-transform hover:scale-125 ${
              bookmarkIds.includes(restaurant.id) ? 'text-[#b45309]' : 'text-[#b89f7c]'
            }`}
            title={bookmarkIds.includes(restaurant.id) ? '찜 해제' : '찜하기'}
          >
            {bookmarkIds.includes(restaurant.id) ? '★' : '☆'}
          </button>
        </div>

        {restaurant.conquered && !myReview && (
          <p className="mt-3 text-[13.5px] text-emerald-700 border-2 border-emerald-600/40 bg-emerald-200/50 px-2 py-1.5">
            🏆 공략 완료. 공략법을 남기면 EXP +15 (맛집당 1회)
          </p>
        )}
      </div>

      {/* 공략법 작성은 "직접 공략한 맛집"에서만 가능.
          미공략이면 읽기 전용 — 다른 사람 글만 볼 수 있다. */}
      {!restaurant.conquered ? (
        <div className="pixel-panel p-5 text-center space-y-2">
          <p className="text-3xl">🔒</p>
          <p className="text-sm text-[#b45309]">아직 공략하지 않은 맛집입니다</p>
          <p className="text-[13.5px] text-[#7d6549] leading-relaxed">
            직접 방문해서 공략을 완료해야 공략법을 남길 수 있습니다.
            <br />
            지금은 다른 사람들이 쓴 글만 볼 수 있어요.
          </p>
          <button
            onClick={() => navigate('/map')}
            className="mt-1 pixel-btn bg-amber-300 text-[#4a3324] px-5 py-2 text-sm"
          >
            🗺️ 지도에서 공략하러 가기
          </button>
        </div>
      ) : posted ? (
        <NextStepCard onClose={() => setPosted(false)} />
      ) : myReview && !editing ? (
        /* 조작 방지: 맛집당 공략법 1개. 이미 썼으면 새로 못 쓰고 수정만 된다. */
        <div className="pixel-panel p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm text-[#b45309]">내 공략법</h2>
            <span className="text-[12.5px] text-[#96805f]">맛집당 1회 · 수정만 가능</span>
          </div>

          <div className="bg-[#f7ecdd] border-2 border-amber-500/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm truncate">{myReview.title}</p>
              <span className="text-[13.5px] text-[#b45309] shrink-0">
                {'★'.repeat(myReview.stars)}
              </span>
            </div>
            <p className="text-[13.5px] text-[#5d4a35] mt-1 leading-relaxed">{myReview.body}</p>
            <p className="text-[12.5px] text-[#96805f] mt-2">
              {myReview.date}
              {myReview.editedAt && ` · ${myReview.editedAt} 수정됨`}
            </p>
          </div>

          <button
            onClick={startEdit}
            className="w-full pixel-btn bg-[#f1e3cf] py-2 text-sm"
          >
            ✏️ 수정하기
          </button>
        </div>
      ) : (
      <form onSubmit={submit} className="pixel-panel p-4 space-y-3">
        <h2 className="text-sm text-[#b45309]">
          {editing ? '공략법 수정' : '공략법 작성'}
        </h2>
        {editing && (
          <p className="text-[12.5px] text-[#96805f]">
            수정해도 EXP는 추가로 지급되지 않습니다.
          </p>
        )}
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="제목 (예: 웨이팅 피하는 법)"
          className="w-full bg-[#f7ecdd] border-2 border-[#e2cfae] px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
        />
        <textarea
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          placeholder="어떤 메뉴가 좋았나요? 꿀팁이 있나요?"
          rows={3}
          className="w-full bg-[#f7ecdd] border-2 border-[#e2cfae] px-3 py-2 text-sm outline-none focus:border-amber-500 resize-none transition-colors"
        />
        <div className="flex items-center justify-between">
          <Stars value={form.stars} onChange={(n) => setForm({ ...form, stars: n })} />
          <div className="flex gap-2">
            {editing && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="pixel-btn bg-[#f1e3cf] px-4 py-2 text-sm"
              >
                취소
              </button>
            )}
            <button
              type="submit"
              disabled={!form.title.trim() || !form.body.trim()}
              className="pixel-btn bg-amber-300 text-[#4a3324] px-4 py-2 text-sm"
            >
              {editing ? '수정 완료' : '등록'}
            </button>
          </div>
        </div>
      </form>
      )}

      <div className="space-y-2">
        <h2 className="text-sm text-[#b45309] px-1">공략법 {restaurant.reviews.length}개</h2>
        {restaurant.reviews.length === 0 && (
          <p className="text-[13.5px] text-[#96805f] px-1">
            {restaurant.conquered
              ? '아직 공략법이 없습니다. 첫 번째가 되어보세요!'
              : '아직 공략법이 없습니다.'}
          </p>
        )}
        {/* 도움돼요 많은 순 → 좋은 공략법이 위로 올라온다 */}
        {[...restaurant.reviews]
          .sort((a, b) => (b.helpful ?? 0) - (a.helpful ?? 0))
          .map((rv, i) => {
            const voted = helpfulReviewIds.includes(rv.id);
            return (
              <div
                key={rv.id}
                style={{ '--i': i }}
                className={`stagger pixel-panel p-3 ${rv.isMine ? 'border-amber-500/70' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm truncate">
                    {rv.isMine && (
                      <span className="text-[12.5px] text-[#b45309] mr-1.5 border border-amber-500 px-1">
                        내 글
                      </span>
                    )}
                    {rv.title}
                  </p>
                  <span className="text-[13.5px] text-[#b45309] shrink-0">
                    {'★'.repeat(rv.stars)}
                  </span>
                </div>
                <p className="text-[13.5px] text-[#5d4a35] mt-1 leading-relaxed">{rv.body}</p>

                <div className="flex items-center justify-between mt-2">
                  <p className="text-[12.5px] text-[#96805f]">
                    {rv.author} · {rv.date}
                    {rv.editedAt && ` · ${rv.editedAt} 수정됨`}
                  </p>

                  {/* 자기 글에는 못 누름 */}
                  <button
                    disabled={rv.isMine}
                    onClick={() => toggleHelpful(restaurant.id, rv.id)}
                    className={`px-2 py-0.5 text-[12.5px] border-2 border-[#4a3324] transition-colors ${
                      rv.isMine
                        ? 'bg-[#f7ecdd] text-[#b89f7c]'
                        : voted
                        ? 'bg-emerald-400 text-[#4a3324]'
                        : 'bg-[#f1e3cf] text-[#5d4a35] hover:text-white'
                    }`}
                  >
                    👍 도움돼요 {rv.helpful ?? 0}
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

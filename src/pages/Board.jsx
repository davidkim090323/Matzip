import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useGame, ratingOf } from '../store/gameStore';
import { distanceMeters } from '../hooks/useGeolocation';
import { DotFood } from '../components/DotCharacter';
import { useModal } from '../hooks/useModal';

const CATEGORIES = ['잡담', '정보', '질문'];
const CAT_COLOR = { 잡담: '#38bdf8', 정보: '#22c55e', 질문: '#f472b6' };
const FOOD_CATEGORIES = ['한식', '분식', '카페', '양식', '일식'];

/* ── 맛집 등록 신청 모달 ───────────────────────────────────── */
function RegisterRestaurantModal({ onClose }) {
  const submitRestaurant = useGame((s) => s.submitRestaurant);
  const pushToast = useGame((s) => s.pushToast);
  const [form, setForm] = useState({ name: '', category: '한식', address: '', district: '' });
  useModal(true, onClose);

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim()) return;
    const res = submitRestaurant(form);
    if (res?.error) {
      pushToast({ icon: '⚠️', title: '등록 신청 실패', body: '입력을 확인해 주세요.' });
      return;
    }
    onClose();
    pushToast({
      icon: '📮',
      title: '맛집 등록 신청 완료',
      body: '운영자 검토 후 지도에 추가돼요. (현재 지도 위치 기준)',
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 fade-in"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] pixel-panel p-5 space-y-3 pop-in"
      >
        <div>
          <h2 className="text-base text-[#3d2c1e]">📍 내 맛집 등록 신청</h2>
          <p className="text-[12.5px] text-[#7d6549] mt-1">
            위치는 <b>현재 지도 위치</b>로 등록돼요. 지도에서 그 맛집 앞으로 이동한 뒤 신청하세요.
          </p>
        </div>

        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="맛집 이름"
          className="w-full bg-[#f7ecdd] border-2 border-[#e2cfae] px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
        />

        <div className="flex gap-1.5 flex-wrap">
          {FOOD_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setForm({ ...form, category: c })}
              className={`px-2.5 py-1 text-[13px] border-2 border-[#4a3324] transition-colors ${
                form.category === c ? 'bg-amber-300 text-[#4a3324]' : 'bg-[#f7ecdd] text-[#7d6549]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <input
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="주소 (예: 강원 춘천시 …)"
          className="w-full bg-[#f7ecdd] border-2 border-[#e2cfae] px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
        />
        <input
          value={form.district}
          onChange={(e) => setForm({ ...form, district: e.target.value })}
          placeholder="동네 (예: 명동, 후평동) — 선택"
          className="w-full bg-[#f7ecdd] border-2 border-[#e2cfae] px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
        />

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 pixel-btn bg-[#f1e3cf] text-[#7d6549] py-2.5 text-sm"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!form.name.trim() || !form.address.trim()}
            className="flex-1 pixel-btn bg-amber-300 text-[#4a3324] py-2.5 text-sm disabled:opacity-50"
          >
            신청하기
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

/** 거리(m) → 사람이 읽는 문자열 */
const fmtDist = (m) => (m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`);

/* ── 맛집 게시판 목록 ─────────────────────────────────────── */
// 맛집이 늘어나면 목록 스크롤만으로는 못 찾는다 → 검색 + 카테고리 + 상태 필터를 붙였다.
function RestaurantList() {
  const restaurants = useGame((s) => s.restaurants);
  const bookmarkIds = useGame((s) => s.bookmarkIds);
  const toggleBookmark = useGame((s) => s.toggleBookmark);
  const playerPos = useGame((s) => s.playerPos);

  const [filter, setFilter] = useState('all'); // all | done | todo | saved
  const [cat, setCat] = useState('전체');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('near'); // near | rating | reviews
  const [registering, setRegistering] = useState(false);

  const categories = useMemo(
    () => ['전체', ...new Set(restaurants.map((r) => r.category))],
    [restaurants]
  );

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = restaurants
      .filter((r) => {
        if (filter === 'done' && !r.conquered) return false;
        if (filter === 'todo' && r.conquered) return false;
        if (filter === 'saved' && !bookmarkIds.includes(r.id)) return false;
        if (cat !== '전체' && r.category !== cat) return false;
        if (
          needle &&
          !`${r.name}${r.district}${r.category}${r.address}`.toLowerCase().includes(needle)
        )
          return false;
        return true;
      })
      // 현재 위치(지도에서 이어짐) 기준 거리를 붙인다 → 근처순 정렬·표시에 사용
      .map((r) => ({ ...r, dist: distanceMeters(playerPos, { lat: r.lat, lng: r.lng }) }));

    const by = {
      near: (a, b) => a.dist - b.dist,
      rating: (a, b) => ratingOf(b) - ratingOf(a),
      reviews: (a, b) => b.reviews.length - a.reviews.length,
    };
    return filtered.sort(by[sort]);
  }, [restaurants, filter, cat, q, bookmarkIds, sort, playerPos]);

  return (
    <div className="space-y-3">
      {registering && <RegisterRestaurantModal onClose={() => setRegistering(false)} />}

      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 맛집 · 지역 · 카테고리 검색"
          className="flex-1 min-w-0 bg-[#f7ecdd] border-2 border-[#e2cfae] px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
        />
        <button
          onClick={() => setRegistering(true)}
          className="pixel-btn bg-emerald-400 text-[#4a3324] px-3 py-2 text-[13px] shrink-0"
          title="내 맛집을 지도에 등록 신청"
        >
          ＋ 맛집 등록
        </button>
      </div>

      <div className="flex gap-1.5">
        {[
          { id: 'all', label: '전체' },
          { id: 'done', label: '공략함' },
          { id: 'todo', label: '미공략' },
          { id: 'saved', label: `⭐ 찜 ${bookmarkIds.length}` },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-2.5 py-1 text-[13.5px] border-2 border-[#4a3324] transition-colors ${
              filter === f.id ? 'bg-amber-300 text-[#4a3324]' : 'bg-[#f7ecdd] text-[#7d6549]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-2.5 py-0.5 text-[12.5px] border-2 border-[#4a3324] whitespace-nowrap transition-colors ${
              cat === c ? 'bg-sky-400 text-[#4a3324]' : 'bg-[#f7ecdd] text-[#7d6549]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* 정렬 — 기본은 근처순(지도 위치 기준) */}
      <div className="flex items-center gap-1.5">
        <span className="text-[12.5px] text-[#96805f] shrink-0">정렬</span>
        {[
          { id: 'near', label: '📍 가까운순' },
          { id: 'rating', label: '★ 평점순' },
          { id: 'reviews', label: '📝 공략법순' },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setSort(s.id)}
            className={`px-2.5 py-0.5 text-[12.5px] border-2 border-[#4a3324] whitespace-nowrap transition-colors ${
              sort === s.id ? 'bg-emerald-400 text-[#4a3324]' : 'bg-[#f7ecdd] text-[#7d6549]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {!list.length && (
        <p className="text-[13.5px] text-[#96805f] text-center py-8">조건에 맞는 맛집이 없습니다.</p>
      )}

      {list.map((r, i) => {
        const saved = bookmarkIds.includes(r.id);
        return (
          <div
            key={r.id}
            style={{ '--i': i }}
            className="stagger lift pixel-panel p-3 flex items-center gap-3"
          >
            <Link to={`/board/${r.id}`} className="flex items-center gap-3 flex-1 min-w-0 py-1">
              <DotFood category={r.category} size={38} />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{r.name}</p>
                <p className="text-[13.5px] text-[#7d6549]">
                  {r.district} · ★ {ratingOf(r).toFixed(1)} · 공략법 {r.reviews.length}
                  <span className="text-[#b45309]"> · 📍 {fmtDist(r.dist)}</span>
                </p>
              </div>
            </Link>

            <button
              onClick={() => toggleBookmark(r.id)}
              title={saved ? '찜 해제' : '찜하기'}
              className={`text-xl shrink-0 transition-transform hover:scale-125 ${
                saved ? 'text-[#b45309]' : 'text-[#b89f7c]'
              }`}
            >
              {saved ? '★' : '☆'}
            </button>

            <span
              className={`text-[12.5px] px-2 py-1 border-2 border-[#4a3324] shrink-0 ${
                r.conquered ? 'bg-emerald-400 text-[#4a3324]' : 'bg-[#f7ecdd] text-[#7d6549]'
              }`}
            >
              {r.conquered ? '공략' : '미공략'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── 랭킹 ─────────────────────────────────────────────────── */
// 공략 수가 개인 기록으로만 남아서 커뮤니티 경쟁 요소가 없었다 → 리더보드 추가.
function Ranking() {
  const rows = useGame((s) => s.rankedUsers());
  const myRank = rows.find((r) => r.isMe);

  const medal = (rank) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`);

  return (
    <div className="space-y-3">
      <div className="pixel-panel p-4 text-center">
        <p className="text-[13.5px] text-[#7d6549]">내 순위</p>
        <p className="text-2xl text-[#b45309] font-bold mt-1">
          {myRank?.rank}위{' '}
          <span className="text-sm text-[#7d6549]">/ {rows.length}명</span>
        </p>
        <p className="text-[13.5px] text-[#7d6549] mt-1">
          공략 {myRank?.conquered}곳 · Lv.{myRank?.level}
        </p>
      </div>

      <div className="space-y-1.5">
        {rows.map((u, i) => (
          <div
            key={u.id}
            style={{ '--i': i }}
            className={`stagger pixel-panel p-3 flex items-center gap-3 ${
              u.isMe ? 'border-amber-500' : ''
            }`}
          >
            <span
              className={`w-8 text-center shrink-0 ${
                u.rank <= 3 ? 'text-xl' : 'text-[13.5px] text-[#7d6549]'
              }`}
            >
              {medal(u.rank)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">
                {u.nickname}
                {u.isMe && (
                  <span className="ml-1.5 text-[12.5px] text-[#b45309] border border-amber-500 px-1">
                    나
                  </span>
                )}
              </p>
              <p className="text-[12.5px] text-[#7d6549] truncate">
                {u.titleName} · Lv.{u.level}
              </p>
            </div>
            <span className="text-[13.5px] text-[#b45309] shrink-0">🚩 {u.conquered}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 자유게시판 ───────────────────────────────────────────── */
function Community() {
  const posts = useGame((s) => s.posts);
  const likedPostIds = useGame((s) => s.likedPostIds);
  const addPost = useGame((s) => s.addPost);
  const likePost = useGame((s) => s.likePost);
  const addComment = useGame((s) => s.addComment);
  const pushToast = useGame((s) => s.pushToast);
  const reportPost = useGame((s) => s.reportPost);
  const reportedPostIds = useGame((s) => s.reportedPostIds);
  const deletePost = useGame((s) => s.deletePost);
  const isAdmin = useGame((s) => s.isAdmin);

  const [cat, setCat] = useState('전체');
  const [writing, setWriting] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', category: '잡담' });
  const [openId, setOpenId] = useState(null);
  const [comment, setComment] = useState('');

  const list = useMemo(
    () => (cat === '전체' ? posts : posts.filter((p) => p.category === cat)),
    [posts, cat]
  );
  const open = posts.find((p) => p.id === openId) ?? null;
  useModal(!!open, () => setOpenId(null));

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    addPost(form);
    setForm({ title: '', body: '', category: '잡담' });
    setWriting(false);
    pushToast({
      icon: '📣',
      title: '글 등록 완료',
      body: '등록 후에는 수정·삭제할 수 없습니다.',
    });
  };

  const report = (postId) => {
    const res = reportPost(postId);
    pushToast(
      res.error
        ? { icon: '⚠️', title: '이미 신고한 글입니다' }
        : { icon: '🚨', title: '신고 접수', body: '운영자가 검토 후 처리합니다.' }
    );
  };

  const remove = (postId) => {
    deletePost(postId);
    setOpenId(null);
    pushToast({ icon: '🗑️', title: '운영자 삭제 완료' });
  };

  return (
    <div className="space-y-3">
      {/* 카테고리 필터 + 글쓰기 */}
      <div className="flex items-center gap-1.5">
        {['전체', ...CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-2.5 py-1 text-[13.5px] border-2 border-[#4a3324] transition-colors ${
              cat === c ? 'bg-amber-300 text-[#4a3324]' : 'bg-[#f7ecdd] text-[#7d6549]'
            }`}
          >
            {c}
          </button>
        ))}
        <button
          onClick={() => setWriting((v) => !v)}
          className="ml-auto pixel-btn bg-[#f1e3cf] px-3 py-1 text-[13.5px]"
        >
          {writing ? '취소' : '✏️ 글쓰기'}
        </button>
      </div>

      {/* 글쓰기 폼 */}
      {writing && (
        <form onSubmit={submit} className="pixel-panel p-4 space-y-2 pop-in">
          <div className="flex gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, category: c })}
                className="px-2 py-0.5 text-[12.5px] border-2 border-[#4a3324]"
                style={{
                  background: form.category === c ? CAT_COLOR[c] : '#f7ecdd',
                  color: form.category === c ? '#4a3324' : '#94a3b8',
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="제목"
            className="w-full bg-[#f7ecdd] border-2 border-[#e2cfae] px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
          />
          <textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="내용을 입력하세요"
            rows={4}
            className="w-full bg-[#f7ecdd] border-2 border-[#e2cfae] px-3 py-2 text-sm outline-none focus:border-amber-500 resize-none transition-colors"
          />
          <button
            type="submit"
            disabled={!form.title.trim() || !form.body.trim()}
            className="w-full pixel-btn bg-amber-300 text-[#4a3324] py-2 text-sm"
          >
            등록
          </button>
        </form>
      )}

      {/* 글 목록 */}
      {list.map((p, i) => (
        <button
          key={p.id}
          onClick={() => setOpenId(p.id)}
          style={{ '--i': i }}
          className="stagger lift pixel-panel p-3 w-full text-left"
        >
          <div className="flex items-center gap-2">
            <span
              className="text-[12.5px] px-1.5 py-0.5 border border-[#4a3324] text-[#4a3324] shrink-0"
              style={{ background: CAT_COLOR[p.category] }}
            >
              {p.category}
            </span>
            <p className="text-sm truncate flex-1">{p.title}</p>
          </div>
          <p className="text-[13.5px] text-[#7d6549] mt-1.5 line-clamp-2">{p.body}</p>
          <div className="flex items-center gap-3 mt-2 text-[12.5px] text-[#96805f]">
            <span>{p.author}</span>
            <span>{p.date}</span>
            <span className={likedPostIds.includes(p.id) ? 'text-rose-600' : ''}>
              ♥ {p.likes}
            </span>
            <span>💬 {p.comments.length}</span>
          </div>
        </button>
      ))}

      {!list.length && (
        <p className="text-[13.5px] text-[#96805f] text-center py-8">
          아직 글이 없습니다. 첫 글을 써보세요!
        </p>
      )}

      {/* 글 상세 모달 — body 로 포탈(페이지 transform 밖) → 뷰포트 정중앙 고정 */}
      {open && createPortal(
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 fade-in"
          onClick={() => setOpenId(null)}
        >
          <div
            className="w-full max-w-[460px] max-h-[88vh] overflow-y-auto pixel-panel p-5 space-y-4 pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <span
                className="text-[12.5px] px-1.5 py-0.5 border border-[#4a3324] text-[#4a3324]"
                style={{ background: CAT_COLOR[open.category] }}
              >
                {open.category}
              </span>
              <h2 className="text-base mt-2">{open.title}</h2>
              <p className="text-[12.5px] text-[#96805f] mt-1">
                {open.author} · {open.date}
                {open.isMine && <span className="ml-1 text-[#b45309]">· 내 글</span>}
                {isAdmin && (open.reports ?? 0) > 0 && (
                  <span className="ml-1 text-red-600">· 신고 {open.reports}건</span>
                )}
              </p>
            </div>

            <p className="text-[14px] text-[#4a3a29] leading-relaxed whitespace-pre-wrap">
              {open.body}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => likePost(open.id)}
                className={`pixel-btn px-4 py-2.5 text-sm flex-1 ${
                  likedPostIds.includes(open.id)
                    ? 'bg-rose-500 text-white'
                    : 'bg-[#f1e3cf] text-[#5d4a35]'
                }`}
              >
                ♥ 좋아요 {open.likes}
              </button>

              {/* 작성자 본인도 수정·삭제 불가. 문제 글은 신고 → 운영자가 처리 */}
              {!open.isMine && (
                <button
                  onClick={() => report(open.id)}
                  disabled={reportedPostIds.includes(open.id)}
                  className="pixel-btn bg-[#f1e3cf] text-[#5d4a35] px-3 py-2.5 text-sm"
                >
                  🚨 {reportedPostIds.includes(open.id) ? '신고함' : '신고'}
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => remove(open.id)}
                  className="pixel-btn bg-red-500 px-3 py-2.5 text-sm"
                >
                  🗑️ 삭제
                </button>
              )}

              <button
                onClick={() => setOpenId(null)}
                className="pixel-btn bg-[#f1e3cf] px-4 py-2.5 text-sm"
              >
                닫기
              </button>
            </div>

            {/* 댓글 */}
            <div className="space-y-2">
              <p className="text-[13.5px] text-[#b45309]">댓글 {open.comments.length}</p>
              {open.comments.map((c) => (
                <div key={c.id} className="bg-[#f7ecdd] border-2 border-[#e2cfae] p-2.5">
                  <p className="text-[14px] text-[#4a3a29]">{c.body}</p>
                  <p className="text-[12.5px] text-[#96805f] mt-1">
                    {c.author} · {c.date}
                  </p>
                </div>
              ))}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!comment.trim()) return;
                  addComment(open.id, comment.trim());
                  setComment('');
                }}
                className="flex gap-2"
              >
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="댓글 달기"
                  className="flex-1 bg-[#f7ecdd] border-2 border-[#e2cfae] px-3 py-2 text-[14px] outline-none focus:border-amber-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!comment.trim()}
                  className="pixel-btn bg-amber-300 text-[#4a3324] px-3 text-[14px]"
                >
                  등록
                </button>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── 페이지 ──────────────────────────────────────────────── */
export default function Board() {
  const [tab, setTab] = useState('restaurant');

  return (
    <div className="p-4 space-y-4 page-in">
      <div className="grid grid-cols-3 gap-2">
        {[
          { id: 'restaurant', label: '🍽️ 맛집' },
          { id: 'community', label: '💬 자유' },
          { id: 'ranking', label: '🏆 랭킹' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pixel-btn py-2.5 text-[13.5px] ${
              tab === t.id ? 'bg-amber-300 text-[#4a3324]' : 'bg-[#f1e3cf] text-[#5d4a35]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'restaurant' ? <RestaurantList /> : tab === 'community' ? <Community /> : <Ranking />}
    </div>
  );
}

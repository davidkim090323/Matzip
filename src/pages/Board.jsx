import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useGame, ratingOf } from '../store/gameStore';
import { DotFood } from '../components/DotCharacter';
import { useModal } from '../hooks/useModal';

const CATEGORIES = ['잡담', '정보', '질문'];
const CAT_COLOR = { 잡담: '#38bdf8', 정보: '#22c55e', 질문: '#f472b6' };

/* ── 맛집 게시판 목록 ─────────────────────────────────────── */
// 맛집이 늘어나면 목록 스크롤만으로는 못 찾는다 → 검색 + 카테고리 + 상태 필터를 붙였다.
function RestaurantList() {
  const restaurants = useGame((s) => s.restaurants);
  const bookmarkIds = useGame((s) => s.bookmarkIds);
  const toggleBookmark = useGame((s) => s.toggleBookmark);

  const [filter, setFilter] = useState('all'); // all | done | todo | saved
  const [cat, setCat] = useState('전체');
  const [q, setQ] = useState('');

  const categories = useMemo(
    () => ['전체', ...new Set(restaurants.map((r) => r.category))],
    [restaurants]
  );

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return restaurants.filter((r) => {
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
    });
  }, [restaurants, filter, cat, q, bookmarkIds]);

  return (
    <div className="space-y-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="🔍 맛집 · 지역 · 카테고리 검색"
        className="w-full bg-[#241a45] border-2 border-[#4c3f7a] px-3 py-2 text-sm outline-none focus:border-amber-300 transition-colors"
      />

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
            className={`px-2.5 py-1 text-[13px] border-2 border-[#1b1230] transition-colors ${
              filter === f.id ? 'bg-amber-300 text-[#1b1230]' : 'bg-[#241a45] text-slate-400'
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
            className={`px-2.5 py-0.5 text-[11.5px] border-2 border-[#1b1230] whitespace-nowrap transition-colors ${
              cat === c ? 'bg-sky-400 text-[#1b1230]' : 'bg-[#241a45] text-slate-400'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {!list.length && (
        <p className="text-[13px] text-slate-500 text-center py-8">조건에 맞는 맛집이 없습니다.</p>
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
                <p className="text-[13px] text-slate-400">
                  {r.district} · ★ {ratingOf(r).toFixed(1)} · 공략법 {r.reviews.length}
                </p>
              </div>
            </Link>

            <button
              onClick={() => toggleBookmark(r.id)}
              title={saved ? '찜 해제' : '찜하기'}
              className={`text-xl shrink-0 transition-transform hover:scale-125 ${
                saved ? 'text-amber-300' : 'text-slate-600'
              }`}
            >
              {saved ? '★' : '☆'}
            </button>

            <span
              className={`text-[11.5px] px-2 py-1 border-2 border-[#1b1230] shrink-0 ${
                r.conquered ? 'bg-emerald-400 text-[#1b1230]' : 'bg-[#241a45] text-slate-400'
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
        <p className="text-[13px] text-slate-400">내 순위</p>
        <p className="text-2xl text-amber-300 font-bold mt-1">
          {myRank?.rank}위{' '}
          <span className="text-sm text-slate-400">/ {rows.length}명</span>
        </p>
        <p className="text-[13px] text-slate-400 mt-1">
          공략 {myRank?.conquered}곳 · Lv.{myRank?.level}
        </p>
      </div>

      <div className="space-y-1.5">
        {rows.map((u, i) => (
          <div
            key={u.id}
            style={{ '--i': i }}
            className={`stagger pixel-panel p-3 flex items-center gap-3 ${
              u.isMe ? 'border-amber-300' : ''
            }`}
          >
            <span
              className={`w-8 text-center shrink-0 ${
                u.rank <= 3 ? 'text-xl' : 'text-[13px] text-slate-400'
              }`}
            >
              {medal(u.rank)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">
                {u.nickname}
                {u.isMe && (
                  <span className="ml-1.5 text-[11.5px] text-amber-300 border border-amber-300 px-1">
                    나
                  </span>
                )}
              </p>
              <p className="text-[11.5px] text-slate-400 truncate">
                {u.titleName} · Lv.{u.level}
              </p>
            </div>
            <span className="text-[13px] text-amber-300 shrink-0">🚩 {u.conquered}</span>
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
            className={`px-2.5 py-1 text-[13px] border-2 border-[#1b1230] transition-colors ${
              cat === c ? 'bg-amber-300 text-[#1b1230]' : 'bg-[#241a45] text-slate-400'
            }`}
          >
            {c}
          </button>
        ))}
        <button
          onClick={() => setWriting((v) => !v)}
          className="ml-auto pixel-btn bg-[#2b2050] px-3 py-1 text-[13px]"
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
                className="px-2 py-0.5 text-[11.5px] border-2 border-[#1b1230]"
                style={{
                  background: form.category === c ? CAT_COLOR[c] : '#241a45',
                  color: form.category === c ? '#1b1230' : '#94a3b8',
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
            className="w-full bg-[#241a45] border-2 border-[#4c3f7a] px-3 py-2 text-sm outline-none focus:border-amber-300 transition-colors"
          />
          <textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="내용을 입력하세요"
            rows={4}
            className="w-full bg-[#241a45] border-2 border-[#4c3f7a] px-3 py-2 text-sm outline-none focus:border-amber-300 resize-none transition-colors"
          />
          <button
            type="submit"
            disabled={!form.title.trim() || !form.body.trim()}
            className="w-full pixel-btn bg-amber-300 text-[#1b1230] py-2 text-sm"
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
              className="text-[11.5px] px-1.5 py-0.5 border border-[#1b1230] text-[#1b1230] shrink-0"
              style={{ background: CAT_COLOR[p.category] }}
            >
              {p.category}
            </span>
            <p className="text-sm truncate flex-1">{p.title}</p>
          </div>
          <p className="text-[13px] text-slate-400 mt-1.5 line-clamp-2">{p.body}</p>
          <div className="flex items-center gap-3 mt-2 text-[11.5px] text-slate-500">
            <span>{p.author}</span>
            <span>{p.date}</span>
            <span className={likedPostIds.includes(p.id) ? 'text-rose-400' : ''}>
              ♥ {p.likes}
            </span>
            <span>💬 {p.comments.length}</span>
          </div>
        </button>
      ))}

      {!list.length && (
        <p className="text-[13px] text-slate-500 text-center py-8">
          아직 글이 없습니다. 첫 글을 써보세요!
        </p>
      )}

      {/* 글 상세 모달 */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-end justify-center fade-in"
          onClick={() => setOpenId(null)}
        >
          <div
            className="w-full max-w-[480px] max-h-[85vh] overflow-y-auto pixel-panel p-5 space-y-4 pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <span
                className="text-[11.5px] px-1.5 py-0.5 border border-[#1b1230] text-[#1b1230]"
                style={{ background: CAT_COLOR[open.category] }}
              >
                {open.category}
              </span>
              <h2 className="text-base mt-2">{open.title}</h2>
              <p className="text-[11.5px] text-slate-500 mt-1">
                {open.author} · {open.date}
                {open.isMine && <span className="ml-1 text-amber-300">· 내 글</span>}
                {isAdmin && (open.reports ?? 0) > 0 && (
                  <span className="ml-1 text-red-400">· 신고 {open.reports}건</span>
                )}
              </p>
            </div>

            <p className="text-[13.5px] text-slate-200 leading-relaxed whitespace-pre-wrap">
              {open.body}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => likePost(open.id)}
                className={`pixel-btn px-4 py-2.5 text-sm flex-1 ${
                  likedPostIds.includes(open.id)
                    ? 'bg-rose-500 text-white'
                    : 'bg-[#2b2050] text-slate-300'
                }`}
              >
                ♥ 좋아요 {open.likes}
              </button>

              {/* 작성자 본인도 수정·삭제 불가. 문제 글은 신고 → 운영자가 처리 */}
              {!open.isMine && (
                <button
                  onClick={() => report(open.id)}
                  disabled={reportedPostIds.includes(open.id)}
                  className="pixel-btn bg-[#2b2050] text-slate-300 px-3 py-2.5 text-sm"
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
                className="pixel-btn bg-[#2b2050] px-4 py-2.5 text-sm"
              >
                닫기
              </button>
            </div>

            {/* 댓글 */}
            <div className="space-y-2">
              <p className="text-[13px] text-amber-300">댓글 {open.comments.length}</p>
              {open.comments.map((c) => (
                <div key={c.id} className="bg-[#241a45] border-2 border-[#4c3f7a] p-2.5">
                  <p className="text-[13.5px] text-slate-200">{c.body}</p>
                  <p className="text-[11.5px] text-slate-500 mt-1">
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
                  className="flex-1 bg-[#241a45] border-2 border-[#4c3f7a] px-3 py-2 text-[13.5px] outline-none focus:border-amber-300 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!comment.trim()}
                  className="pixel-btn bg-amber-300 text-[#1b1230] px-3 text-[13.5px]"
                >
                  등록
                </button>
              </form>
            </div>
          </div>
        </div>
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
            className={`pixel-btn py-2.5 text-[13px] ${
              tab === t.id ? 'bg-amber-300 text-[#1b1230]' : 'bg-[#2b2050] text-slate-300'
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

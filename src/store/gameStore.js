import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { repo } from '../data/repository';

const STORAGE_KEY = 'matjip-conquest';
const STORE_VERSION = 3; // 스키마 변경 시 올리고 migrate 에 채움 로직 추가

// ── 게임 규칙 상수 ────────────────────────────────────────────────
export const EXP_PER_CONQUEST = 60;
export const EXP_PER_REVIEW = 15;
export const MAX_EQUIPPED_MATMON = 3;
export const CONQUEST_MINUTES = 30; // 실서비스 기준 체류 시간
export const CONQUEST_RADIUS_M = 120; // 맛집 반경(미터)

export const RARITY = {
  N:   { weight: 55, color: '#94a3b8', label: 'N' },
  R:   { weight: 30, color: '#38bdf8', label: 'R' },
  SR:  { weight: 13, color: '#a78bfa', label: 'SR' },
  SSR: { weight: 2,  color: '#f59e0b', label: 'SSR' },
};

/** 레벨 L → 다음 레벨까지 필요한 경험치 */
export const expForLevel = (level) => 100 + (level - 1) * 50;

/**
 * 일일 퀘스트.
 * 뽑기권 공급원이 "공략" 하나뿐이라 매일 켤 이유가 없었다.
 * 하루 단위 목표 + 보상으로 재방문 동기를 만든다. (자정 기준 자동 리셋)
 */
export const DAILY_QUESTS = [
  { id: 'q_conquer', key: 'conquer', goal: 1, title: '맛집 1곳 공략하기', reward: { tickets: 1 }, icon: '🚩' },
  { id: 'q_review', key: 'review', goal: 1, title: '공략법 1개 작성하기', reward: { exp: 50 }, icon: '📝' },
  { id: 'q_newcat', key: 'newCategory', goal: 1, title: '안 가본 카테고리 정복하기', reward: { tickets: 1 }, icon: '🍽️' },
];

/**
 * 표시 평점 = 리뷰 별점 평균. 리뷰가 없으면 시드값(rating).
 * 예전엔 JSON 의 rating 을 그대로 썼기 때문에 별 5개 리뷰를 아무리 달아도 숫자가 안 변했다.
 */
export const ratingOf = (r) => {
  if (!r) return 0;
  if (!r.reviews?.length) return r.rating ?? 0;
  return r.reviews.reduce((s, v) => s + v.stars, 0) / r.reviews.length;
};

const today = () => new Date().toISOString().slice(0, 10);
const emptyDaily = () => ({
  date: today(),
  conquer: 0,
  review: 0,
  newCategory: 0,
  claimed: [],
});

function applyExp(level, exp, gained) {
  let lv = level;
  let e = exp + gained;
  let levelUps = 0;
  while (e >= expForLevel(lv)) {
    e -= expForLevel(lv);
    lv += 1;
    levelUps += 1;
  }
  return { level: lv, exp: e, levelUps };
}

/** 희귀도 가중치 기반 추첨 */
function weightedPick(items) {
  const total = items.reduce((s, i) => s + (RARITY[i.rarity]?.weight ?? 1), 0);
  let roll = Math.random() * total;
  for (const i of items) {
    roll -= RARITY[i.rarity]?.weight ?? 1;
    if (roll <= 0) return i;
  }
  return items[items.length - 1];
}

export const useGame = create(
  persist(
    (set, get) => ({
      user: null,
      titles: [],
      restaurants: [],
      matmon: [],
      costumes: { hats: [], colors: [], accessories: [] },
      posts: [],
      leaderboard: [],
      loaded: false,

      daily: emptyDaily(), // 일일 퀘스트 진행도
      bookmarkIds: [], // 찜한 맛집
      helpfulReviewIds: [], // "도움돼요" 누른 공략법
      isAdmin: false, // 운영자 모드 (자유게시판 글 삭제 권한)
      setAdmin: (v) => set({ isAdmin: v }),

      /**
       * 진행 중인 공략. 남은 시간을 카운트다운으로 "저장"하지 않고 시작 시각만 저장한다.
       * → 페이지를 벗어나거나 새로고침해도 경과 시간이 정확히 이어진다.
       *   (예전엔 지도 화면의 useState 라서 탭만 옮겨도 30분이 통째로 날아갔다)
       */
      /**
       * 캐릭터 위치 / 네비 경로.
       * 예전엔 지도 페이지의 로컬 state 라서, 다른 탭에 갔다 오면 언마운트되며
       * 시작 좌표(구월동)로 워프하고 길찾기도 사라졌다. 스토어로 올려서 유지한다.
       */
      playerPos: { lat: 37.4487, lng: 126.7015 }, // 목업 시작점(구월동)
      setPlayerPos: (pos) => set({ playerPos: pos }),

      route: null, // { restaurantId, points:[{lat,lng}], idx }
      setRoute: (route) => set({ route }),
      walking: false, // 목업 자동 이동
      setWalking: (walking) => set({ walking }),

      visit: null, // { restaurantId, startedAt(ms), durationSec }
      startVisit: (restaurantId, durationSec) =>
        set({ visit: { restaurantId, startedAt: Date.now(), durationSec } }),
      cancelVisit: () => set({ visit: null }),
      /** 남은 초 (0 이하면 완료 가능) */
      visitRemaining: () => {
        const v = get().visit;
        if (!v) return null;
        return Math.max(0, Math.ceil(v.durationSec - (Date.now() - v.startedAt) / 1000));
      },

      // 레벨업/칭호 해금 연출용 이벤트 (App 의 모달이 소비)
      levelUp: null,
      clearLevelUp: () => set({ levelUp: null }),

      devFastTimer: true, // true면 30분 대신 10초
      setDevFastTimer: (v) => set({ devFastTimer: v }),

      toast: null,
      pushToast: (toast) => set({ toast }),
      clearToast: () => set({ toast: null }),

      /** 날짜가 바뀌었으면 일일 퀘스트를 리셋한다 */
      rollDaily: () => {
        const d = get().daily;
        if (!d || d.date !== today()) set({ daily: emptyDaily() });
      },

      async load() {
        get().rollDaily();
        if (get().loaded) return;
        const [user, titles, restaurants, matmon, costumes, posts, leaderboard] = await Promise.all([
          repo.getUser(),
          repo.getTitles(),
          repo.getRestaurants(),
          repo.getMatmon(),
          repo.getCostumes(),
          repo.getPosts(),
          repo.getLeaderboard(),
        ]);
        // starter 아이템은 처음부터 보유. 나머지는 전부 뽑기로만 획득.
        const starters = [...costumes.hats, ...costumes.colors, ...costumes.accessories]
          .filter((i) => i.starter)
          .map((i) => i.id);
        user.ownedCostumeIds = [...new Set([...(user.ownedCostumeIds ?? []), ...starters])];

        set({ user, titles, restaurants, matmon, costumes, posts, leaderboard, loaded: true });
      },

      // ── 파생값 ──
      allCostumes: () => {
        const c = get().costumes;
        return [
          ...c.hats.map((i) => ({ ...i, slot: 'hat' })),
          ...c.colors.map((i) => ({ ...i, slot: 'color' })),
          ...c.accessories.map((i) => ({ ...i, slot: 'accessory' })),
        ];
      },
      conqueredCount: () => get().restaurants.filter((r) => r.conquered).length,
      progressPct: () => {
        const rs = get().restaurants;
        if (!rs.length) return 0;
        return Math.round((rs.filter((r) => r.conquered).length / rs.length) * 100);
      },
      districtProgress: () => {
        const map = {};
        for (const r of get().restaurants) {
          map[r.district] ??= { total: 0, done: 0 };
          map[r.district].total += 1;
          if (r.conquered) map[r.district].done += 1;
        }
        return Object.entries(map).map(([district, v]) => ({
          district,
          ...v,
          pct: Math.round((v.done / v.total) * 100),
        }));
      },
      getRestaurant: (id) => get().restaurants.find((r) => r.id === id),
      getPost: (id) => get().posts.find((p) => p.id === id),
      equippedTitle: () => {
        const { titles, user } = get();
        return titles.find((t) => t.id === user?.equippedTitleId) ?? null;
      },
      equippedMatmon: () => {
        const { matmon, user } = get();
        return (user?.equippedMatmonIds ?? [])
          .map((id) => matmon.find((m) => m.id === id))
          .filter(Boolean);
      },
      /** 뽑기 남은 풀 크기 — 버튼에 "잔여 n종" 표시용 */
      remainingPool: (kind) => {
        const { user, matmon } = get();
        if (!user) return 0;
        if (kind === 'matmon') return matmon.filter((m) => !user.ownedMatmonIds.includes(m.id)).length;
        return get().allCostumes().filter((c) => !user.ownedCostumeIds.includes(c.id)).length;
      },

      // ── 액션: 맛집 공략 완료 ──
      conquer: (restaurantId) => {
        get().rollDaily();
        const { restaurants, user, titles, daily } = get();
        const target = restaurants.find((r) => r.id === restaurantId);
        if (!target || target.conquered || !user) return null;

        // 이 카테고리를 처음 정복하는가? (일일 퀘스트 판정)
        const firstOfCategory = !restaurants.some(
          (r) => r.conquered && r.category === target.category
        );

        set({
          daily: {
            ...daily,
            conquer: daily.conquer + 1,
            newCategory: daily.newCategory + (firstOfCategory ? 1 : 0),
          },
        });

        const nextRestaurants = restaurants.map((r) =>
          r.id === restaurantId ? { ...r, conquered: true, conqueredAt: today() } : r
        );
        const conquered = nextRestaurants.filter((r) => r.conquered).length;
        const { level, exp, levelUps } = applyExp(user.level, user.exp, EXP_PER_CONQUEST);

        const unlocked = titles.filter(
          (t) => t.requiredConquests <= conquered && !user.ownedTitleIds.includes(t.id)
        );

        const nextUser = {
          ...user,
          level,
          exp,
          gachaTickets: user.gachaTickets + 1,
          ownedTitleIds: [...user.ownedTitleIds, ...unlocked.map((t) => t.id)],
        };

        set({ restaurants: nextRestaurants, user: nextUser, visit: null });
        repo.markConquered(restaurantId);
        repo.saveUser(nextUser);

        // 레벨업 또는 칭호 해금이면 축하 모달을 띄운다 (토스트 한 줄로 넘기기엔 큰 보상)
        if (levelUps > 0 || unlocked.length) {
          set({ levelUp: { level, levelUps, unlocked, from: target.name } });
        }

        return { expGained: EXP_PER_CONQUEST, levelUps, newLevel: level, unlocked, conquered };
      },

      /**
       * 뽑기 — 뽑기권 1장으로 맛몬 또는 커스터마이징 아이템 중 하나를 선택해서 뽑는다.
       * kind: 'matmon' | 'item'
       * 두 풀이 티켓을 공유하므로 "무엇에 쓸지"가 유저의 선택 지점이 된다.
       */
      draw: (kind) => {
        const { user, matmon } = get();
        if (!user || user.gachaTickets <= 0) return null;

        const pool =
          kind === 'matmon'
            ? matmon.filter((m) => !user.ownedMatmonIds.includes(m.id))
            : get().allCostumes().filter((c) => !user.ownedCostumeIds.includes(c.id));

        if (!pool.length) return { empty: true, kind };

        const picked = weightedPick(pool);
        const nextUser = {
          ...user,
          gachaTickets: user.gachaTickets - 1,
          ownedMatmonIds:
            kind === 'matmon' ? [...user.ownedMatmonIds, picked.id] : user.ownedMatmonIds,
          ownedCostumeIds:
            kind === 'item' ? [...user.ownedCostumeIds, picked.id] : user.ownedCostumeIds,
        };
        set({ user: nextUser });
        repo.saveUser(nextUser);
        return { kind, item: picked };
      },

      // ── 커스터마이징 ──
      equipTitle: (titleId) => {
        const { user } = get();
        if (!user?.ownedTitleIds.includes(titleId)) return;
        const nextUser = { ...user, equippedTitleId: titleId };
        set({ user: nextUser });
        repo.saveUser(nextUser);
      },
      toggleMatmon: (matmonId) => {
        const { user } = get();
        if (!user?.ownedMatmonIds.includes(matmonId)) return;
        const has = user.equippedMatmonIds.includes(matmonId);
        let next;
        if (has) next = user.equippedMatmonIds.filter((id) => id !== matmonId);
        else {
          if (user.equippedMatmonIds.length >= MAX_EQUIPPED_MATMON) return;
          next = [...user.equippedMatmonIds, matmonId];
        }
        const nextUser = { ...user, equippedMatmonIds: next };
        set({ user: nextUser });
        repo.saveUser(nextUser);
      },
      /** 보유한 아이템만 착용 가능 */
      setCostume: (slot, itemId) => {
        const { user } = get();
        if (!user || !user.ownedCostumeIds.includes(itemId)) return;
        const nextUser = { ...user, costume: { ...user.costume, [slot]: itemId } };
        set({ user: nextUser });
        repo.saveUser(nextUser);
      },

      // ── 리뷰(맛집 게시판) ──
      /** 이 맛집에 내가 쓴 공략법(없으면 null) */
      myReview: (restaurantId) =>
        get()
          .restaurants.find((r) => r.id === restaurantId)
          ?.reviews.find((rv) => rv.isMine) ?? null,

      addReview: (restaurantId, { title, body, stars, author }) => {
        const { restaurants, user } = get();
        // 공략(방문 인증)한 맛집에만 글을 쓸 수 있다. UI 뿐 아니라 여기서도 막는다.
        const target = restaurants.find((r) => r.id === restaurantId);
        if (!target?.conquered) return { error: 'not_conquered' };

        // 조작 방지: 맛집 1곳당 공략법 1개. 재작성 불가, 수정만 가능.
        if (target.reviews.some((rv) => rv.isMine)) return { error: 'already_written' };

        const review = {
          id: `rv_${Date.now()}`,
          author: author || user?.nickname || '익명',
          isMine: true,
          title,
          body,
          stars,
          helpful: 0,
          date: today(),
        };
        get().rollDaily();
        const d = get().daily;
        set({ daily: { ...d, review: d.review + 1 } });

        const { level, exp, levelUps } = applyExp(user.level, user.exp, EXP_PER_REVIEW);
        const nextUser = { ...user, level, exp };
        set({
          restaurants: restaurants.map((r) =>
            r.id === restaurantId ? { ...r, reviews: [review, ...r.reviews] } : r
          ),
          user: nextUser,
        });
        repo.addReview(restaurantId, review);
        repo.saveUser(nextUser);
        if (levelUps > 0) set({ levelUp: { level, levelUps, unlocked: [], from: target.name } });
        return { review, levelUps, newLevel: level, expGained: EXP_PER_REVIEW };
      },

      /**
       * 이미 쓴 공략법 수정. 내 글만, 내용만 바뀐다.
       * 새 글로 취급하지 않으므로 EXP 는 다시 주지 않는다(경험치 파밍 방지).
       */
      updateReview: (restaurantId, { title, body, stars }) => {
        const { restaurants } = get();
        const target = restaurants.find((r) => r.id === restaurantId);
        const mine = target?.reviews.find((rv) => rv.isMine);
        if (!mine) return { error: 'no_review' };

        const edited = {
          ...mine,
          title,
          body,
          stars,
          editedAt: new Date().toISOString().slice(0, 10),
        };
        set({
          restaurants: restaurants.map((r) =>
            r.id === restaurantId
              ? { ...r, reviews: r.reviews.map((rv) => (rv.isMine ? edited : rv)) }
              : r
          ),
        });
        repo.addReview(restaurantId, edited); // 백엔드 붙으면 PATCH 로 교체
        return { review: edited };
      },

      // ── 자유게시판 ──
      addPost: ({ title, body, category }) => {
        const { posts, user } = get();
        const post = {
          id: `p_${Date.now()}`,
          category,
          title,
          body,
          author: user?.nickname ?? '익명',
          isMine: true,
          date: today(),
          likes: 0,
          reports: 0,
          comments: [],
        };
        set({ posts: [post, ...posts] });
        repo.addPost(post);
        return post;
      },

      /**
       * 자유게시판 운영 정책:
       * 작성자는 글을 지우거나 고칠 수 없다(여론 조작·먹튀 방지).
       * 문제 글은 유저가 신고하고, 삭제 권한은 운영자에게만 있다.
       */
      reportPost: (postId) => {
        const { posts, reportedPostIds } = get();
        if (reportedPostIds.includes(postId)) return { error: 'already_reported' };
        set({
          posts: posts.map((p) => (p.id === postId ? { ...p, reports: (p.reports ?? 0) + 1 } : p)),
          reportedPostIds: [...reportedPostIds, postId],
        });
        return { ok: true };
      },
      reportedPostIds: [],
      /** 운영자 전용 삭제 */
      deletePost: (postId) => {
        if (!get().isAdmin) return { error: 'forbidden' };
        set({ posts: get().posts.filter((p) => p.id !== postId) });
        return { ok: true };
      },
      likePost: (postId) => {
        const { posts, likedPostIds } = get();
        const liked = likedPostIds.includes(postId);
        set({
          posts: posts.map((p) =>
            p.id === postId ? { ...p, likes: p.likes + (liked ? -1 : 1) } : p
          ),
          likedPostIds: liked
            ? likedPostIds.filter((id) => id !== postId)
            : [...likedPostIds, postId],
        });
        repo.likePost(postId);
      },
      likedPostIds: [],
      addComment: (postId, body) => {
        const { posts, user } = get();
        const comment = {
          id: `c_${Date.now()}`,
          author: user?.nickname ?? '익명',
          body,
          date: new Date().toISOString().slice(0, 10),
        };
        set({
          posts: posts.map((p) =>
            p.id === postId ? { ...p, comments: [...p.comments, comment] } : p
          ),
        });
        repo.addComment(postId, comment);
        return comment;
      },

      // ── 일일 퀘스트 ──
      questState: () => {
        const d = get().daily ?? emptyDaily();
        return DAILY_QUESTS.map((q) => ({
          ...q,
          progress: Math.min(d[q.key] ?? 0, q.goal),
          done: (d[q.key] ?? 0) >= q.goal,
          claimed: d.claimed.includes(q.id),
        }));
      },
      claimQuest: (questId) => {
        const { daily, user } = get();
        const q = DAILY_QUESTS.find((x) => x.id === questId);
        if (!q || !user) return null;
        if ((daily[q.key] ?? 0) < q.goal || daily.claimed.includes(questId)) return null;

        const gainedExp = q.reward.exp ?? 0;
        const { level, exp, levelUps } = applyExp(user.level, user.exp, gainedExp);
        const nextUser = {
          ...user,
          level,
          exp,
          gachaTickets: user.gachaTickets + (q.reward.tickets ?? 0),
        };
        set({ user: nextUser, daily: { ...daily, claimed: [...daily.claimed, questId] } });
        repo.saveUser(nextUser);
        if (levelUps > 0) set({ levelUp: { level, levelUps, unlocked: [], from: '일일 퀘스트' } });
        return { reward: q.reward, levelUps, newLevel: level };
      },

      // ── 찜(가고 싶은 맛집) ──
      toggleBookmark: (restaurantId) => {
        const { bookmarkIds } = get();
        set({
          bookmarkIds: bookmarkIds.includes(restaurantId)
            ? bookmarkIds.filter((id) => id !== restaurantId)
            : [...bookmarkIds, restaurantId],
        });
      },

      // ── 공략법 "도움돼요" ──
      // 내 글에는 못 누른다(자추 방지). 한 번 누른 글은 취소만 가능.
      toggleHelpful: (restaurantId, reviewId) => {
        const { restaurants, helpfulReviewIds } = get();
        const target = restaurants.find((r) => r.id === restaurantId);
        const rv = target?.reviews.find((x) => x.id === reviewId);
        if (!rv || rv.isMine) return;

        const on = helpfulReviewIds.includes(reviewId);
        set({
          restaurants: restaurants.map((r) =>
            r.id !== restaurantId
              ? r
              : {
                  ...r,
                  reviews: r.reviews.map((x) =>
                    x.id === reviewId
                      ? { ...x, helpful: Math.max(0, (x.helpful ?? 0) + (on ? -1 : 1)) }
                      : x
                  ),
                }
          ),
          helpfulReviewIds: on
            ? helpfulReviewIds.filter((id) => id !== reviewId)
            : [...helpfulReviewIds, reviewId],
        });
      },

      // ── 랭킹 ── 목업 유저 + 나를 합쳐 공략 수로 정렬
      rankedUsers: () => {
        const { leaderboard, user, titles } = get();
        const me = {
          id: 'me',
          nickname: user?.nickname ?? '나',
          level: user?.level ?? 1,
          conquered: get().conqueredCount(),
          titleName: titles.find((t) => t.id === user?.equippedTitleId)?.name ?? '-',
          isMe: true,
        };
        return [...leaderboard, me]
          .sort((a, b) => b.conquered - a.conquered || b.level - a.level)
          .map((u, i) => ({ ...u, rank: i + 1 }));
      },

      resetProgress: () => {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      /**
       * 스키마가 바뀌어도 진행도를 날리지 않는다.
       * 예전엔 키 이름을 올려버려서(v1→v2) 유저 데이터가 통째로 사라졌다.
       * 이제 없는 필드만 기본값으로 채워 넣는다.
       */
      migrate: (persisted, version) => {
        const s = { ...(persisted ?? {}) };
        if (version < 3) {
          s.daily ??= emptyDaily();
          s.bookmarkIds ??= [];
          s.helpfulReviewIds ??= [];
          s.likedPostIds ??= [];
          s.reportedPostIds ??= [];
          s.leaderboard ??= [];
          s.visit ??= null;
          s.isAdmin ??= false;
          s.user &&= { ...s.user, ownedCostumeIds: s.user.ownedCostumeIds ?? [] };
          s.restaurants &&= s.restaurants.map((r) => ({
            ...r,
            reviews: (r.reviews ?? []).map((rv) => ({ ...rv, helpful: rv.helpful ?? 0 })),
          }));
          s.posts &&= s.posts.map((p) => ({ ...p, reports: p.reports ?? 0 }));
        }
        return s;
      },
      partialize: (s) => ({
        user: s.user,
        restaurants: s.restaurants,
        titles: s.titles,
        matmon: s.matmon,
        costumes: s.costumes,
        posts: s.posts,
        leaderboard: s.leaderboard,
        likedPostIds: s.likedPostIds,
        reportedPostIds: s.reportedPostIds,
        daily: s.daily,
        bookmarkIds: s.bookmarkIds,
        helpfulReviewIds: s.helpfulReviewIds,
        visit: s.visit, // 진행 중인 공략도 저장 → 새로고침해도 이어짐
        playerPos: s.playerPos,
        route: s.route,
        isAdmin: s.isAdmin,
        loaded: s.loaded,
        devFastTimer: s.devFastTimer,
      }),
    }
  )
);

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as cloud from '../lib/cloud';
import restaurantsSeed from '../data/restaurants.json';
import titlesSeed from '../data/titles.json';
import {
  RARITY_ORDER,
  MATMON_LIST,
  HATS_LIST,
  COLORS_LIST,
  ACCESSORIES_LIST,
  AURAS_LIST,
} from '../art/sprites';

const STORAGE_KEY = 'matjip-conquest';
// 운영자 이메일 — 맛집 신청 승인 등 운영 권한(클라이언트 UI + DB 규칙 양쪽에서 사용)
export const ADMIN_EMAIL = 'davidkim090323@gmail.com';
// v7: 기기별 localStorage 진행도 → Firebase 계정 연동으로 전환.
// 계정 데이터는 클라우드가 진실원본이라, 로컬에는 화면 상태(위치·타이머 등)만 남긴다.
const STORE_VERSION = 7;
const CHUNCHEON_ORIGIN = { lat: 37.8776, lng: 127.7276 }; // 춘천 명동

// ── 경제 ─────────────────────────────────────────────────────
export const COINS_PER_CONQUEST = 50;   // 맛집 공략 시 코인
export const START_COINS = 300;
export const SELL_PRICE = { N: 20, R: 60, SR: 180, SSR: 600 };      // 판매가
export const BUY_PRICE = { N: 120, R: 340, SR: 900, SSR: 3000 };    // 상점 구매가
export const titlePrice = (t) => t?.price ?? 500 + (t?.requiredConquests ?? 0) * 80;

const clone = (v) => JSON.parse(JSON.stringify(v));

/** 두 좌표 간 거리(m). 레이드 위치 판정용(useGeolocation 순환참조 피하려 자체 구현). */
const distM = (a, b) => {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};
const countsFrom = (arr) => (arr ?? []).reduce((m, id) => ((m[id] = (m[id] || 0) + 1), m), {});
const nextRarity = (r) => RARITY_ORDER[RARITY_ORDER.indexOf(r) + 1] ?? null;
const CRAFT_NEED = 3; // 같은 등급 3개 → 상위 1개

// ── 게임 규칙 상수 ────────────────────────────────────────────────
export const EXP_PER_CONQUEST = 60;
export const EXP_PER_REVIEW = 15;
export const MAX_EQUIPPED_MATMON = 3;
export const CONQUEST_MINUTES = 30; // 실서비스 기준 체류 시간
export const CONQUEST_RADIUS_M = 30; // 맛집 반경(미터)

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
  { id: 'q_review', key: 'review', goal: 1, title: '공략법 1개 작성하기', reward: { exp: 50, coins: 100 }, icon: '📝' },
  { id: 'q_newcat', key: 'newCategory', goal: 1, title: '안 가본 카테고리 정복하기', reward: { tickets: 1, coins: 150 }, icon: '🍽️' },
];

/**
 * 표시 평점 = 리뷰 별점 평균. 리뷰가 없으면 시드값(rating).
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

// RTDB 는 빈 배열/객체를 저장하지 않아, 클라우드에서 돌아온 daily 는 필드가 빠져 있을 수 있다.
// (예: claimed:[] 가 통째로 사라져 undefined → .includes 크래시) 빠진 필드를 기본값으로 채운다.
const normalizeDaily = (d) => {
  if (!d || d.date !== today()) return emptyDaily();
  return {
    date: d.date,
    conquer: d.conquer ?? 0,
    review: d.review ?? 0,
    newCategory: d.newCategory ?? 0,
    claimed: d.claimed ?? [],
  };
};

/** 새 계정의 초기 진행도 */
const freshUser = (nickname) => ({
  nickname: nickname || '익명',
  level: 1,
  exp: 0,
  coins: START_COINS,
  gachaTickets: 3,
  ownedTitleIds: ['t_newbie'],
  equippedTitleId: 't_newbie',
  ownedMatmonIds: ['m01', 'm02'],
  matmonInv: { m01: 1, m02: 1 },
  equippedMatmonIds: ['m01'],
  ownedCostumeIds: [],
  costumeInv: {},
  costume: { hat: 'h_none', color: 'c_blue', accessory: 'a_none', aura: 'au_none' },
});

/** 저장된 진행도의 빠진 필드를 기본값으로 채운다(스키마 진화 대비) */
function normalizeUser(user, costumes) {
  const starters = [...costumes.hats, ...costumes.colors, ...costumes.accessories, ...costumes.auras]
    .filter((i) => i.starter)
    .map((i) => i.id);
  user.level ??= 1;
  user.exp ??= 0;
  user.gachaTickets ??= 0;
  user.coins ??= START_COINS;
  user.ownedTitleIds ??= ['t_newbie'];
  user.equippedTitleId ??= 't_newbie';
  user.matmonInv ??= countsFrom(user.ownedMatmonIds);
  user.costumeInv ??= countsFrom([...(user.ownedCostumeIds ?? []), ...starters]);
  for (const id of starters) user.costumeInv[id] = Math.max(1, user.costumeInv[id] ?? 0);
  user.costume = { hat: 'h_none', color: 'c_blue', accessory: 'a_none', aura: 'au_none', ...user.costume };
  user.equippedMatmonIds = (user.equippedMatmonIds ?? []).filter((id) => (user.matmonInv[id] ?? 0) > 0);
  return user;
}

/** 시드 맛집 + 유저 등록(승인) 맛집 + 내 공략 여부 + 공유 리뷰를 합쳐 화면용 restaurants 배열을 만든다 */
function buildRestaurants(conqueredIds, conqueredAt, reviewsByRest, uid, cloudRestaurants) {
  const doneSet = new Set(conqueredIds ?? []);
  const base = [...restaurantsSeed, ...(cloudRestaurants ?? [])];
  return base.map((r) => {
    const reviews = (reviewsByRest?.[r.id] ?? []).map((rv) => ({ ...rv, isMine: rv.uid === uid }));
    return {
      ...r,
      conquered: doneSet.has(r.id),
      conqueredAt: conqueredAt?.[r.id] ?? null,
      reviews,
    };
  });
}

/** 클라우드에 저장할 진행도 스냅샷(undefined 제거) */
function progressSnapshot(s) {
  return clone({
    user: s.user,
    conqueredIds: s.conqueredIds,
    conqueredAt: s.conqueredAt,
    daily: s.daily,
    bookmarkIds: s.bookmarkIds,
    helpfulReviewIds: s.helpfulReviewIds,
    likedPostIds: s.likedPostIds,
    reportedPostIds: s.reportedPostIds,
    claimedRaidIds: s.claimedRaidIds,
  });
}

/** 랭킹에 공개되는 스탯 */
function publicSnapshot(s) {
  const u = s.user;
  const colorHex = COLORS_LIST.find((c) => c.id === u?.costume?.color)?.hex ?? '#94a3b8';
  return {
    nickname: u?.nickname ?? '익명',
    level: u?.level ?? 1,
    conquered: (s.conqueredIds ?? []).length,
    titleName: s.titles.find((t) => t.id === u?.equippedTitleId)?.name ?? '-',
    color: colorHex,
    guildId: u?.guildId ?? null,
    guildName: u?.guildName ?? null,
    updatedAt: Date.now(),
  };
}

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

// ── 실시간 구독 핸들 (모듈 스코프) ──────────────────────────────
let _subs = [];
function teardownSubs() {
  _subs.forEach((u) => u && u());
  _subs = [];
}
let _syncTimer = null;

export const useGame = create(
  persist(
    (set, get) => ({
      uid: null,
      user: null,
      titles: [],
      matmon: [],
      costumes: { hats: [], colors: [], accessories: [], auras: [] },
      restaurants: [],
      conqueredIds: [],
      conqueredAt: {},
      reviewsByRest: {}, // 맛집별 공유 리뷰 (구독으로 채움)
      posts: [],         // 자유게시판 (구독)
      leaderboard: [],   // 전체 유저 공개 스탯 (구독)
      cloudRestaurants: [],      // 유저가 등록·승인된 맛집 (구독)
      restaurantRequests: [],    // 맛집 등록 신청 목록 (운영자 검토용, 구독)
      guilds: [],                // 전체 길드 (구독)
      raids: [],                 // 진행 중/완료 레이드 (구독)
      territoryByRest: {},       // 맛집별 점령 길드 (구독)
      loaded: false,
      hydratedOk: false,         // 클라우드 진행도를 정상 로드했는가(실패 시 저장 금지 → 데이터 보호)

      daily: emptyDaily(),
      bookmarkIds: [],
      helpfulReviewIds: [],
      likedPostIds: [],
      reportedPostIds: [],
      claimedRaidIds: [], // 보상 수령 완료한 레이드(중복 지급 방지)
      isAdmin: false,
      setAdmin: (v) => set({ isAdmin: v }),

      playerPos: { lat: 37.8776, lng: 127.7276 },
      setPlayerPos: (pos) => set({ playerPos: pos }),
      route: null,
      setRoute: (route) => set({ route }),
      walking: false,
      setWalking: (walking) => set({ walking }),

      visit: null,
      startVisit: (restaurantId, durationSec) =>
        set({ visit: { restaurantId, startedAt: Date.now(), durationSec } }),
      cancelVisit: () => set({ visit: null }),
      visitRemaining: () => {
        const v = get().visit;
        if (!v) return null;
        return Math.max(0, Math.ceil(v.durationSec - (Date.now() - v.startedAt) / 1000));
      },

      levelUp: null,
      clearLevelUp: () => set({ levelUp: null }),
      devFastTimer: true,
      setDevFastTimer: (v) => set({ devFastTimer: v }),
      toast: null,
      pushToast: (toast) => set({ toast }),
      clearToast: () => set({ toast: null }),

      rollDaily: () => {
        const d = get().daily;
        if (!d || d.date !== today()) set({ daily: emptyDaily() });
      },

      // ── 클라우드 동기화 ──
      /** 진행도 변경을 모아서 클라우드에 저장(디바운스) */
      queueSync: () => {
        clearTimeout(_syncTimer);
        _syncTimer = setTimeout(() => get().syncNow(), 600);
      },
      async syncNow() {
        const uid = get().uid;
        // hydratedOk=false → 클라우드 진행도를 확실히 읽지 못한 세션.
        // 이 상태로 저장하면 남아있는 진짜 진행도를 빈 값으로 덮어쓸 수 있어 절대 쓰지 않는다.
        if (!uid || !get().hydratedOk) return;
        const s = get();
        try {
          await cloud.saveProgress(uid, progressSnapshot(s));
          await cloud.savePublic(uid, publicSnapshot(s));
        } catch {
          /* 규칙 미설정·오프라인 — 다음 변경 때 다시 시도 */
        }
      },

      /**
       * 로그인한 계정의 진행도를 클라우드에서 불러오고, 공유 데이터를 실시간 구독한다.
       * 저장된 진행도가 없으면 새 계정으로 시작한다.
       */
      async hydrate(authUser) {
        const uid = authUser.uid;
        if (get().uid === uid && get().loaded) {
          get().rollDaily();
          return;
        }

        const titles = clone(titlesSeed);
        const matmon = clone(MATMON_LIST);
        const costumes = {
          hats: clone(HATS_LIST),
          colors: clone(COLORS_LIST),
          accessories: clone(ACCESSORIES_LIST),
          auras: clone(AURAS_LIST),
        };

        // 클라우드 진행도 읽기 — 일시적 실패로 진짜 데이터를 덮어쓰지 않도록 여러 번 재시도.
        // loadOk 가 false 면(끝내 못 읽음) 이 세션은 "저장 금지"로 두어 기존 진행도를 보호한다.
        let progress = null;
        let loadOk = false;
        for (let attempt = 0; attempt < 3 && !loadOk; attempt++) {
          try {
            progress = await cloud.loadProgress(uid);
            loadOk = true;
          } catch {
            await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          }
        }

        const user = normalizeUser(
          progress?.user ?? freshUser(authUser.displayName),
          costumes
        );
        const conqueredIds = progress?.conqueredIds ?? [];
        const conqueredAt = progress?.conqueredAt ?? {};
        const daily = normalizeDaily(progress?.daily);

        set({
          uid,
          user,
          titles,
          matmon,
          costumes,
          conqueredIds,
          conqueredAt,
          reviewsByRest: {},
          restaurants: buildRestaurants(conqueredIds, conqueredAt, {}, uid, get().cloudRestaurants),
          daily,
          bookmarkIds: progress?.bookmarkIds ?? [],
          helpfulReviewIds: progress?.helpfulReviewIds ?? [],
          likedPostIds: progress?.likedPostIds ?? [],
          reportedPostIds: progress?.reportedPostIds ?? [],
          claimedRaidIds: progress?.claimedRaidIds ?? [],
          loaded: true,
          hydratedOk: loadOk,
        });

        if (!loadOk) {
          // 진행도를 못 불러온 세션 — 저장을 막아 데이터를 보호하고 사용자에게 알린다.
          get().pushToast({
            icon: '⚠️',
            title: '진행도를 불러오지 못했어요',
            body: '연결 후 새로고침 하세요. (안전을 위해 이 세션은 저장하지 않습니다)',
          });
        }

        // 운영자 계정이면 운영 권한 자동 활성화(수동 토글도 유지)
        if (authUser.email === ADMIN_EMAIL) set({ isAdmin: true });

        // 실시간 공유 데이터 구독
        teardownSubs();
        _subs.push(cloud.subscribeUsers((list) => set({ leaderboard: list })));
        _subs.push(
          cloud.subscribeReviews((map) =>
            set((s) => ({
              reviewsByRest: map,
              restaurants: buildRestaurants(s.conqueredIds, s.conqueredAt, map, s.uid, s.cloudRestaurants),
            }))
          )
        );
        _subs.push(cloud.subscribePosts((list) => set({ posts: list })));
        // 유저 등록(승인) 맛집 → 시드와 머지
        _subs.push(
          cloud.subscribeApprovedRestaurants((list) =>
            set((s) => ({
              cloudRestaurants: list,
              restaurants: buildRestaurants(s.conqueredIds, s.conqueredAt, s.reviewsByRest, s.uid, list),
            }))
          )
        );
        _subs.push(cloud.subscribeRestaurantRequests((list) => set({ restaurantRequests: list })));
        _subs.push(cloud.subscribeGuilds((list) => set({ guilds: list })));
        _subs.push(
          cloud.subscribeRaids((list) => {
            set({ raids: list });
            get()._claimClearedRaids(list);
          })
        );
        _subs.push(cloud.subscribeTerritory((map) => set({ territoryByRest: map })));

        // 정상 로드된 세션만 공개 스탯·진행도를 클라우드에 확정(syncNow가 hydratedOk 확인)
        get().syncNow();
      },

      /** 로그아웃 — 구독 해제 + 계정 데이터 비움 */
      teardown: () => {
        teardownSubs();
        clearTimeout(_syncTimer);
        set({
          uid: null,
          user: null,
          loaded: false,
          hydratedOk: false,
          leaderboard: [],
          posts: [],
          reviewsByRest: {},
          cloudRestaurants: [],
          restaurantRequests: [],
          guilds: [],
          raids: [],
          territoryByRest: {},
          conqueredIds: [],
          conqueredAt: {},
          restaurants: [],
        });
      },

      // ── 파생값 ──
      allCostumes: () => {
        const c = get().costumes;
        return [
          ...c.hats.map((i) => ({ ...i, slot: 'hat' })),
          ...c.colors.map((i) => ({ ...i, slot: 'color' })),
          ...c.accessories.map((i) => ({ ...i, slot: 'accessory' })),
          ...(c.auras ?? []).map((i) => ({ ...i, slot: 'aura' })),
        ];
      },
      matmonCount: (id) => get().user?.matmonInv?.[id] ?? 0,
      costumeCount: (id) => get().user?.costumeInv?.[id] ?? 0,
      ownsMatmon: (id) => (get().user?.matmonInv?.[id] ?? 0) > 0,
      ownsCostume: (id) => (get().user?.costumeInv?.[id] ?? 0) > 0,
      conqueredCount: () => get().conqueredIds.length,
      progressPct: () => {
        const rs = get().restaurants;
        if (!rs.length) return 0;
        return Math.round((get().conqueredIds.length / rs.length) * 100);
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
      poolSize: (kind) =>
        kind === 'matmon'
          ? get().matmon.length
          : get().allCostumes().filter((c) => !c.id.endsWith('_none') && (c.slot !== 'color' || !c.starter)).length,
      ownedTypes: (kind) => {
        const inv = kind === 'matmon' ? get().user?.matmonInv : get().user?.costumeInv;
        return Object.values(inv ?? {}).filter((n) => n > 0).length;
      },

      // ── 액션: 맛집 공략 완료 ──
      conquer: (restaurantId) => {
        get().rollDaily();
        const { restaurants, user, titles, daily, conqueredIds, conqueredAt } = get();
        const target = restaurants.find((r) => r.id === restaurantId);
        if (!target || target.conquered || !user) return null;

        const firstOfCategory = !restaurants.some(
          (r) => r.conquered && r.category === target.category
        );

        const nextConqueredIds = [...conqueredIds, restaurantId];
        const nextConqueredAt = { ...conqueredAt, [restaurantId]: today() };
        const conquered = nextConqueredIds.length;
        const { level, exp, levelUps } = applyExp(user.level, user.exp, EXP_PER_CONQUEST);

        const unlocked = titles.filter(
          (t) => t.requiredConquests <= conquered && !user.ownedTitleIds.includes(t.id)
        );

        const territoryBonus = get().territoryBonus(); // 우리 길드 영토 유지 혜택
        const nextUser = {
          ...user,
          level,
          exp,
          gachaTickets: user.gachaTickets + 1,
          coins: (user.coins ?? 0) + COINS_PER_CONQUEST + territoryBonus,
          ownedTitleIds: [...user.ownedTitleIds, ...unlocked.map((t) => t.id)],
        };

        set({
          conqueredIds: nextConqueredIds,
          conqueredAt: nextConqueredAt,
          restaurants: buildRestaurants(nextConqueredIds, nextConqueredAt, get().reviewsByRest, get().uid, get().cloudRestaurants),
          user: nextUser,
          visit: null,
          daily: {
            ...daily,
            conquer: daily.conquer + 1,
            newCategory: daily.newCategory + (firstOfCategory ? 1 : 0),
          },
        });
        get().queueSync();

        if (levelUps > 0 || unlocked.length) {
          set({ levelUp: { level, levelUps, unlocked, from: target.name } });
        }

        return { expGained: EXP_PER_CONQUEST, coinsGained: COINS_PER_CONQUEST + territoryBonus, territoryBonus, levelUps, newLevel: level, unlocked, conquered };
      },

      // ── 뽑기 ──
      draw: (kind) => {
        const { user, matmon } = get();
        if (!user || user.gachaTickets <= 0) return null;

        // '없음'(h_none·a_none·au_none)은 뽑기에서 제외 — 뽑혀봐야 의미가 없다
        const pool = kind === 'matmon' ? matmon : get().allCostumes().filter((c) => !c.id.endsWith('_none'));
        const picked = weightedPick(pool);
        const invKey = kind === 'matmon' ? 'matmonInv' : 'costumeInv';
        const inv = { ...user[invKey], [picked.id]: (user[invKey]?.[picked.id] ?? 0) + 1 };
        const nextUser = { ...user, gachaTickets: user.gachaTickets - 1, [invKey]: inv };
        set({ user: nextUser });
        get().queueSync();
        return { kind, item: picked, count: inv[picked.id] };
      },

      // ── 인벤토리: 판매 → 코인 ──
      sellItem: (kind, id) => {
        const { user } = get();
        if (!user) return null;
        const invKey = kind === 'matmon' ? 'matmonInv' : 'costumeInv';
        const have = user[invKey]?.[id] ?? 0;
        if (have <= 0) return { error: 'none' };
        const meta =
          kind === 'matmon'
            ? get().matmon.find((m) => m.id === id)
            : get().allCostumes().find((c) => c.id === id);
        if (!meta || meta.starter || id.endsWith('_none')) return { error: 'not_sellable' };
        const price = SELL_PRICE[meta.rarity] ?? 0;

        const inv = { ...user[invKey], [id]: have - 1 };
        if (inv[id] <= 0) delete inv[id];
        const nextUser = { ...user, coins: (user.coins ?? 0) + price, [invKey]: inv };
        if (!inv[id]) {
          if (kind === 'matmon') nextUser.equippedMatmonIds = user.equippedMatmonIds.filter((x) => x !== id);
          else if (user.costume[meta.slot] === id) {
            const fallback = { hat: 'h_none', accessory: 'a_none', aura: 'au_none', color: 'c_blue' }[meta.slot];
            nextUser.costume = { ...user.costume, [meta.slot]: fallback };
          }
        }
        set({ user: nextUser });
        get().queueSync();
        return { ok: true, price, coins: nextUser.coins, item: meta };
      },

      // ── 상점: 코인으로 구매 ──
      buyItem: (kind, id) => {
        const { user } = get();
        if (!user) return null;
        const invKey = kind === 'matmon' ? 'matmonInv' : 'costumeInv';
        const meta =
          kind === 'matmon'
            ? get().matmon.find((m) => m.id === id)
            : get().allCostumes().find((c) => c.id === id);
        if (!meta) return { error: 'no_item' };
        const price = BUY_PRICE[meta.rarity] ?? 0;
        if ((user.coins ?? 0) < price) return { error: 'no_coins', price };
        const inv = { ...user[invKey], [id]: (user[invKey]?.[id] ?? 0) + 1 };
        const nextUser = { ...user, coins: user.coins - price, [invKey]: inv };
        set({ user: nextUser });
        get().queueSync();
        return { ok: true, kind, item: meta, count: inv[id], coins: nextUser.coins };
      },

      buyTitle: (titleId) => {
        const { user, titles } = get();
        if (!user) return null;
        const t = titles.find((x) => x.id === titleId);
        if (!t) return { error: 'no_item' };
        if (!t.shop) return { error: 'not_for_sale' };
        if (user.ownedTitleIds.includes(titleId)) return { error: 'owned' };
        const price = titlePrice(t);
        if ((user.coins ?? 0) < price) return { error: 'no_coins', price };
        const nextUser = { ...user, coins: user.coins - price, ownedTitleIds: [...user.ownedTitleIds, titleId] };
        set({ user: nextUser });
        get().queueSync();
        return { ok: true, item: t, coins: nextUser.coins };
      },

      /** 같은 등급 3개(같은 카테고리)를 조합 → 상위 등급 1개 랜덤 지급 */
      craft: (kind, rarity) => {
        const { user, matmon } = get();
        if (!user) return null;
        const out = nextRarity(rarity);
        if (!out) return { error: 'max_rarity' };
        const invKey = kind === 'matmon' ? 'matmonInv' : 'costumeInv';
        const catalog = kind === 'matmon' ? matmon : get().allCostumes();
        const byId = Object.fromEntries(catalog.map((c) => [c.id, c]));

        const inv = { ...user[invKey] };
        const owned = Object.entries(inv).filter(([id, n]) => n > 0 && byId[id]?.rarity === rarity && !id.endsWith('_none'));
        const total = owned.reduce((s, [, n]) => s + n, 0);
        if (total < CRAFT_NEED) return { error: 'need3', have: total };

        let need = CRAFT_NEED;
        const consumed = [];
        for (const [id] of owned.sort((a, b) => b[1] - a[1])) {
          while (need > 0 && inv[id] > 0) { inv[id] -= 1; need -= 1; consumed.push(id); }
          if (inv[id] <= 0) delete inv[id];
          if (need === 0) break;
        }

        const outPool = catalog.filter((c) => c.rarity === out && !c.id.endsWith('_none'));
        const picked = outPool[Math.floor(Math.random() * outPool.length)];
        inv[picked.id] = (inv[picked.id] ?? 0) + 1;

        const nextUser = { ...user, [invKey]: inv };
        if (kind === 'matmon') {
          nextUser.equippedMatmonIds = user.equippedMatmonIds.filter((x) => (inv[x] ?? 0) > 0);
        } else {
          const fb = { hat: 'h_none', color: 'c_blue', accessory: 'a_none', aura: 'au_none' };
          const costume = { ...user.costume };
          for (const slot of ['hat', 'color', 'accessory', 'aura']) {
            if ((inv[costume[slot]] ?? 0) <= 0 && !costume[slot].endsWith('_none') && costume[slot] !== 'c_blue') {
              costume[slot] = fb[slot];
            }
          }
          nextUser.costume = costume;
        }
        set({ user: nextUser });
        get().queueSync();
        return { kind, item: picked, count: inv[picked.id], craftedFrom: rarity, rarityOut: out };
      },

      /** 유저가 고른 아이템 3개(id 배열, 중복 가능)를 조합 → 상위 등급 1개 랜덤 */
      craftSelected: (kind, ids) => {
        const { user, matmon } = get();
        if (!user || !ids || ids.length !== CRAFT_NEED) return { error: 'need3' };
        const invKey = kind === 'matmon' ? 'matmonInv' : 'costumeInv';
        const catalog = kind === 'matmon' ? matmon : get().allCostumes();
        const byId = Object.fromEntries(catalog.map((c) => [c.id, c]));
        const rarity = byId[ids[0]]?.rarity;
        const out = nextRarity(rarity);
        if (!out) return { error: 'max_rarity' };
        if (!ids.every((id) => byId[id]?.rarity === rarity)) return { error: 'mixed' };

        const need = {};
        ids.forEach((id) => (need[id] = (need[id] || 0) + 1));
        const inv = { ...user[invKey] };
        for (const [id, q] of Object.entries(need)) if ((inv[id] ?? 0) < q) return { error: 'not_enough' };
        for (const [id, q] of Object.entries(need)) { inv[id] -= q; if (inv[id] <= 0) delete inv[id]; }

        const outPool = catalog.filter((c) => c.rarity === out && !c.id.endsWith('_none'));
        const picked = outPool[Math.floor(Math.random() * outPool.length)];
        inv[picked.id] = (inv[picked.id] ?? 0) + 1;

        const nextUser = { ...user, [invKey]: inv };
        if (kind === 'matmon') {
          nextUser.equippedMatmonIds = user.equippedMatmonIds.filter((x) => (inv[x] ?? 0) > 0);
        } else {
          const fb = { hat: 'h_none', color: 'c_blue', accessory: 'a_none', aura: 'au_none' };
          const costume = { ...user.costume };
          for (const slot of ['hat', 'color', 'accessory', 'aura']) {
            if ((inv[costume[slot]] ?? 0) <= 0 && !costume[slot].endsWith('_none') && costume[slot] !== 'c_blue') costume[slot] = fb[slot];
          }
          nextUser.costume = costume;
        }
        set({ user: nextUser });
        get().queueSync();
        return { kind, item: picked, count: inv[picked.id], craftedFrom: rarity, rarityOut: out };
      },

      // 닉네임 설정 — 지도/랭킹에 표시되는 이름
      setNickname: (nickname) => {
        const { user } = get();
        if (!user) return;
        set({ user: { ...user, nickname } });
        get().queueSync();
      },

      // ── 커스터마이징 ──
      equipTitle: (titleId) => {
        const { user } = get();
        if (!user?.ownedTitleIds.includes(titleId)) return;
        set({ user: { ...user, equippedTitleId: titleId } });
        get().queueSync();
      },
      toggleMatmon: (matmonId) => {
        const { user } = get();
        if ((user?.matmonInv?.[matmonId] ?? 0) <= 0) return;
        const has = user.equippedMatmonIds.includes(matmonId);
        let next;
        if (has) next = user.equippedMatmonIds.filter((id) => id !== matmonId);
        else {
          if (user.equippedMatmonIds.length >= MAX_EQUIPPED_MATMON) return;
          next = [...user.equippedMatmonIds, matmonId];
        }
        set({ user: { ...user, equippedMatmonIds: next } });
        get().queueSync();
      },
      setCostume: (slot, itemId) => {
        const { user } = get();
        if (!user || (user.costumeInv?.[itemId] ?? 0) <= 0) return;
        set({ user: { ...user, costume: { ...user.costume, [slot]: itemId } } });
        get().queueSync();
      },

      // ── 리뷰(맛집 공략법) : 실제 유저끼리 공유 ──
      /** 이 맛집에 내가 쓴 공략법(없으면 null) */
      myReview: (restaurantId) =>
        (get().reviewsByRest[restaurantId] ?? []).find((rv) => rv.uid === get().uid) ?? null,

      addReview: (restaurantId, { title, body, stars, author }) => {
        const { restaurants, user, uid, reviewsByRest } = get();
        const target = restaurants.find((r) => r.id === restaurantId);
        if (!target?.conquered) return { error: 'not_conquered' };
        if ((reviewsByRest[restaurantId] ?? []).some((rv) => rv.uid === uid)) {
          return { error: 'already_written' };
        }

        const review = {
          uid,
          author: author || user?.nickname || '익명',
          title,
          body,
          stars,
          helpful: 0,
          date: today(),
          createdAt: Date.now(),
        };
        get().rollDaily();
        const d = get().daily;
        const { level, exp, levelUps } = applyExp(user.level, user.exp, EXP_PER_REVIEW);

        // 낙관적 반영 — 구독이 서버 값으로 곧 대체
        const optimistic = { ...review, id: `local_${review.createdAt}` };
        const nextReviews = {
          ...reviewsByRest,
          [restaurantId]: [optimistic, ...(reviewsByRest[restaurantId] ?? [])],
        };
        set({
          user: { ...user, level, exp },
          daily: { ...d, review: d.review + 1 },
          reviewsByRest: nextReviews,
          restaurants: buildRestaurants(get().conqueredIds, get().conqueredAt, nextReviews, uid, get().cloudRestaurants),
        });
        cloud.addReview(restaurantId, review).catch(() => {});
        get().queueSync();
        if (levelUps > 0) set({ levelUp: { level, levelUps, unlocked: [], from: target.name } });
        return { review: optimistic, levelUps, newLevel: level, expGained: EXP_PER_REVIEW };
      },

      updateReview: (restaurantId, { title, body, stars }) => {
        const { reviewsByRest, uid } = get();
        const list = reviewsByRest[restaurantId] ?? [];
        const mine = list.find((rv) => rv.uid === uid);
        if (!mine) return { error: 'no_review' };

        const patch = { title, body, stars, editedAt: today() };
        const nextList = list.map((rv) => (rv.uid === uid ? { ...rv, ...patch } : rv));
        const nextReviews = { ...reviewsByRest, [restaurantId]: nextList };
        set({
          reviewsByRest: nextReviews,
          restaurants: buildRestaurants(get().conqueredIds, get().conqueredAt, nextReviews, uid, get().cloudRestaurants),
        });
        if (!String(mine.id).startsWith('local_')) {
          cloud.updateReview(restaurantId, mine.id, patch).catch(() => {});
        }
        return { review: { ...mine, ...patch } };
      },

      // ── 공략법 "도움돼요" (전역 공유 카운트) ──
      toggleHelpful: (restaurantId, reviewId) => {
        const { reviewsByRest, helpfulReviewIds, uid } = get();
        const list = reviewsByRest[restaurantId] ?? [];
        const rv = list.find((x) => x.id === reviewId);
        if (!rv || rv.uid === uid) return;

        const on = helpfulReviewIds.includes(reviewId);
        const delta = on ? -1 : 1;
        const nextList = list.map((x) =>
          x.id === reviewId ? { ...x, helpful: Math.max(0, (x.helpful ?? 0) + delta) } : x
        );
        const nextReviews = { ...reviewsByRest, [restaurantId]: nextList };
        set({
          reviewsByRest: nextReviews,
          restaurants: buildRestaurants(get().conqueredIds, get().conqueredAt, nextReviews, uid, get().cloudRestaurants),
          helpfulReviewIds: on
            ? helpfulReviewIds.filter((id) => id !== reviewId)
            : [...helpfulReviewIds, reviewId],
        });
        if (!String(reviewId).startsWith('local_')) {
          cloud.bumpHelpful(restaurantId, reviewId, delta).catch(() => {});
        }
        get().queueSync();
      },

      // ── 자유게시판 : 전체 공유 ──
      addPost: ({ title, body, category }) => {
        const { user, uid } = get();
        const post = {
          uid,
          category,
          title,
          body,
          author: user?.nickname ?? '익명',
          date: today(),
          likes: 0,
          reports: 0,
          createdAt: Date.now(),
        };
        cloud.addPost(post).catch(() => {});
        // 구독이 목록을 갱신한다. 반환 형태만 맞춘다.
        return { ...post, id: `local_${post.createdAt}`, comments: [] };
      },

      /** 작성자도 수정·삭제 불가. 문제 글은 신고 → 운영자만 삭제 */
      reportPost: (postId) => {
        const { posts, reportedPostIds } = get();
        if (reportedPostIds.includes(postId)) return { error: 'already_reported' };
        set({
          posts: posts.map((p) => (p.id === postId ? { ...p, reports: (p.reports ?? 0) + 1 } : p)),
          reportedPostIds: [...reportedPostIds, postId],
        });
        if (!String(postId).startsWith('local_')) cloud.bumpReport(postId).catch(() => {});
        get().queueSync();
        return { ok: true };
      },
      deletePost: (postId) => {
        if (!get().isAdmin) return { error: 'forbidden' };
        set({ posts: get().posts.filter((p) => p.id !== postId) });
        if (!String(postId).startsWith('local_')) cloud.deletePost(postId).catch(() => {});
        return { ok: true };
      },
      likePost: (postId) => {
        const { posts, likedPostIds } = get();
        const liked = likedPostIds.includes(postId);
        const delta = liked ? -1 : 1;
        set({
          posts: posts.map((p) =>
            p.id === postId ? { ...p, likes: Math.max(0, (p.likes ?? 0) + delta) } : p
          ),
          likedPostIds: liked
            ? likedPostIds.filter((id) => id !== postId)
            : [...likedPostIds, postId],
        });
        if (!String(postId).startsWith('local_')) cloud.bumpLike(postId, delta).catch(() => {});
        get().queueSync();
      },
      addComment: (postId, body) => {
        const { posts, user, uid } = get();
        const comment = {
          uid,
          author: user?.nickname ?? '익명',
          body,
          date: today(),
          createdAt: Date.now(),
        };
        if (!String(postId).startsWith('local_')) cloud.addComment(postId, comment).catch(() => {});
        set({
          posts: posts.map((p) =>
            p.id === postId
              ? { ...p, comments: [...(p.comments ?? []), { ...comment, id: `local_${comment.createdAt}` }] }
              : p
          ),
        });
        return comment;
      },

      // ── 맛집 등록 신청 (유저 → 운영자 승인) ──
      /** 유저가 자기 맛집을 지도에 등록 신청. 위치는 현재 지도 위치(playerPos) 기준. */
      submitRestaurant: ({ name, category, address, district }) => {
        const { user, uid, playerPos } = get();
        if (!uid) return { error: 'no_auth' };
        if (!name?.trim() || !address?.trim()) return { error: 'missing' };
        const req = {
          uid,
          nickname: user?.nickname ?? '익명',
          name: name.trim(),
          category: category || '한식',
          address: address.trim(),
          district: district?.trim() || '기타',
          lat: playerPos.lat,
          lng: playerPos.lng,
          status: 'pending',
          createdAt: Date.now(),
        };
        cloud.submitRestaurantRequest(req).catch(() => {});
        return { ok: true };
      },

      /** 운영자 승인 → 실제 지도에 추가 (규칙상 운영자 이메일만 성공) */
      approveRestaurant: (reqId) => {
        if (!get().isAdmin) return { error: 'forbidden' };
        const req = get().restaurantRequests.find((r) => r.id === reqId);
        if (!req) return { error: 'no_request' };
        const restaurant = {
          id: `u_${reqId}`,
          name: req.name,
          category: req.category,
          district: req.district,
          address: req.address,
          lat: req.lat,
          lng: req.lng,
          rating: 0,
          submittedBy: req.nickname ?? '익명',
          submittedByUid: req.uid,
        };
        cloud.approveRestaurantRequest(reqId, restaurant).catch(() => {});
        return { ok: true };
      },
      rejectRestaurant: (reqId) => {
        if (!get().isAdmin) return { error: 'forbidden' };
        cloud.rejectRestaurantRequest(reqId).catch(() => {});
        return { ok: true };
      },
      pendingRequestCount: () =>
        get().restaurantRequests.filter((r) => r.status === 'pending').length,

      // ── 길드 ──
      myGuild: () => {
        const { guilds, user } = get();
        return guilds.find((g) => g.id === user?.guildId) ?? null;
      },
      /** 길드 랭킹 — 소속 유저 공개 스탯을 길드별로 합산(공략 수 기준) */
      guildRanking: () => {
        const { leaderboard, guilds } = get();
        const byGuild = {};
        // 길드 메타(이름·엠블럼·인원)로 초기화
        for (const g of guilds) {
          byGuild[g.id] = {
            id: g.id,
            name: g.name,
            emblem: g.emblem ?? '🚩',
            members: (g.members ?? []).length,
            conquered: 0,
          };
        }
        // 소속 유저의 공략 수 합산
        for (const u of leaderboard) {
          if (!u.guildId || !byGuild[u.guildId]) continue;
          byGuild[u.guildId].conquered += u.conquered ?? 0;
        }
        return Object.values(byGuild)
          .sort((a, b) => b.conquered - a.conquered || b.members - a.members)
          .map((g, i) => ({ ...g, rank: i + 1 }));
      },

      createGuild: ({ name, emblem }) => {
        const { user, uid, guilds } = get();
        if (!uid || !user) return { error: 'no_auth' };
        if (user.guildId) return { error: 'already_in_guild' };
        const trimmed = name?.trim();
        if (!trimmed || trimmed.length < 2) return { error: 'bad_name' };
        if (guilds.some((g) => g.name === trimmed)) return { error: 'name_taken' };

        const guildId = `g_${uid.slice(0, 6)}_${Date.now().toString(36)}`;
        const guild = {
          name: trimmed,
          emblem: emblem || '🚩',
          leaderUid: uid,
          leaderName: user.nickname ?? '익명',
          createdAt: Date.now(),
          members: {
            [uid]: { nickname: user.nickname ?? '익명', role: 'leader', joinedAt: Date.now() },
          },
        };
        cloud.createGuild(guildId, guild).catch(() => {});
        set({ user: { ...user, guildId, guildName: trimmed } });
        get().queueSync();
        return { ok: true, guildId };
      },

      joinGuild: (guildId) => {
        const { user, uid, guilds } = get();
        if (!uid || !user) return { error: 'no_auth' };
        if (user.guildId === guildId) return { error: 'already_member' };
        const g = guilds.find((x) => x.id === guildId);
        if (!g) return { error: 'no_guild' };
        if (user.guildId) cloud.leaveGuild(user.guildId, uid).catch(() => {}); // 기존 길드 탈퇴
        cloud
          .joinGuild(guildId, uid, { nickname: user.nickname ?? '익명', role: 'member', joinedAt: Date.now() })
          .catch(() => {});
        set({ user: { ...user, guildId, guildName: g.name } });
        get().queueSync();
        return { ok: true, guild: g };
      },

      leaveGuild: () => {
        const { user, uid, guilds } = get();
        if (!uid || !user?.guildId) return { error: 'not_in_guild' };
        const gid = user.guildId;
        const g = guilds.find((x) => x.id === gid);
        cloud.leaveGuild(gid, uid).catch(() => {});
        // 리더가 나가면 다른 멤버에게 위임, 아무도 없으면 해체
        if (g && g.leaderUid === uid) {
          const others = (g.members ?? []).filter((m) => m.uid !== uid);
          if (others.length) {
            cloud.updateGuildMeta(gid, { leaderUid: others[0].uid, leaderName: others[0].nickname }).catch(() => {});
          } else {
            cloud.deleteGuild(gid).catch(() => {});
          }
        }
        set({ user: { ...user, guildId: null, guildName: null } });
        get().queueSync();
        return { ok: true };
      },

      // ── 레이드 (위치 기반 파티 공략) + 영토 ──
      territoryOf: (restaurantId) => get().territoryByRest?.[restaurantId] ?? null,
      /** 우리 길드가 점령 중인 맛집 수 */
      myGuildTerritory: () => {
        const gid = get().user?.guildId;
        if (!gid) return 0;
        return Object.values(get().territoryByRest ?? {}).filter((t) => t?.guildId === gid).length;
      },
      /** 공략 시 우리 길드 영토 보너스 코인 (점령 유지 혜택) */
      territoryBonus: () => Math.min(get().myGuildTerritory() * 5, 100),
      /** 모집 중인 레이드 (타입별) — 옛 데이터는 길드 레이드로 간주 */
      recruitingRaids: (type) =>
        get().raids.filter((r) => r.status === 'recruiting' && (r.type ?? 'guild') === type),
      /** 이 맛집에 모집 중인 레이드 (타입 지정) */
      activeRaidFor: (restaurantId, type = 'guild') =>
        get().raids.find(
          (r) => r.restaurantId === restaurantId && r.status === 'recruiting' && (r.type ?? 'guild') === type
        ) ?? null,
      /** 내가 참가 중인 모집 레이드 */
      myRaids: () =>
        get().raids.filter(
          (r) => r.status === 'recruiting' && (r.members ?? []).some((m) => m.uid === get().uid)
        ),

      /**
       * 레이드 개설.
       * type 'guild' = 길드 레이드(점령·깃발 변경), 'public' = 일반 레이드(모르는 사람들과, 점령 없음).
       */
      createRaid: (restaurantId, type = 'guild') => {
        const { user, uid, restaurants, raids } = get();
        if (!uid || !user) return { error: 'no_auth' };
        const guild = get().myGuild();
        if (type === 'guild' && !guild) return { error: 'no_guild' };
        const rest = restaurants.find((r) => r.id === restaurantId);
        if (!rest) return { error: 'no_restaurant' };
        if (raids.some((r) => r.restaurantId === restaurantId && r.status === 'recruiting' && (r.type ?? 'guild') === type))
          return { error: 'exists' };

        const raidId = `raid_${uid.slice(0, 6)}_${Date.now().toString(36)}`;
        const raid = {
          type,
          restaurantId,
          restaurantName: rest.name,
          hostUid: uid,
          hostName: user.nickname ?? '익명',
          guildId: type === 'guild' ? guild.id : null,
          guildName: type === 'guild' ? guild.name : null,
          emblem: type === 'guild' ? guild.emblem ?? '🚩' : '🍽️',
          status: 'recruiting',
          maxMembers: type === 'guild' ? 4 : 6,
          createdAt: Date.now(),
          members: {
            [uid]: { nickname: user.nickname ?? '익명', joinedAt: Date.now(), present: false },
          },
        };
        cloud.createRaid(raidId, raid).catch(() => {});
        return { ok: true, raidId };
      },

      joinRaid: (raidId) => {
        const { user, uid, raids } = get();
        if (!uid || !user) return { error: 'no_auth' };
        const raid = raids.find((r) => r.id === raidId);
        if (!raid) return { error: 'no_raid' };
        if (raid.status !== 'recruiting') return { error: 'closed' };
        if ((raid.members ?? []).length >= (raid.maxMembers ?? 4)) return { error: 'full' };
        cloud
          .joinRaid(raidId, uid, { nickname: user.nickname ?? '익명', joinedAt: Date.now(), present: false })
          .catch(() => {});
        return { ok: true };
      },

      /** 현재 지도 위치가 맛집 반경 안이면 '도착' 표시 */
      markRaidPresent: (raidId) => {
        const { uid, raids, restaurants, playerPos } = get();
        const raid = raids.find((r) => r.id === raidId);
        if (!raid) return { error: 'no_raid' };
        const rest = restaurants.find((r) => r.id === raid.restaurantId);
        if (!rest) return { error: 'no_restaurant' };
        const dist = distM(playerPos, { lat: rest.lat, lng: rest.lng });
        if (dist > CONQUEST_RADIUS_M) return { error: 'too_far', dist };
        cloud.setRaidPresent(raidId, uid, true).catch(() => {});
        return { ok: true, dist };
      },

      leaveRaid: (raidId) => {
        const { uid, raids } = get();
        const raid = raids.find((r) => r.id === raidId);
        if (!raid) return;
        if (raid.hostUid === uid) cloud.deleteRaid(raidId).catch(() => {}); // 호스트가 나가면 해산
        else cloud.leaveRaid(raidId, uid).catch(() => {});
      },

      /** 호스트가 레이드 완료 — 도착 인원 2명 이상이면 점령 성공 */
      completeRaid: (raidId) => {
        const { uid, raids } = get();
        const raid = raids.find((r) => r.id === raidId);
        if (!raid) return { error: 'no_raid' };
        if (raid.hostUid !== uid) return { error: 'not_host' };
        const present = (raid.members ?? []).filter((m) => m.present);
        if (present.length < 2) return { error: 'need2', present: present.length };

        // 길드 레이드만 영토 점령 — 깃발이 호스트 길드로 바뀐다. 일반 레이드는 보상만.
        if ((raid.type ?? 'guild') === 'guild' && raid.guildId) {
          cloud
            .setTerritory(raid.restaurantId, {
              guildId: raid.guildId,
              guildName: raid.guildName,
              emblem: raid.emblem,
              conqueredAt: Date.now(),
              byName: raid.hostName,
              raidId,
            })
            .catch(() => {});
        }
        cloud
          .updateRaid(raidId, { status: 'cleared', presentCount: present.length, clearedAt: Date.now() })
          .catch(() => {});
        return { ok: true, present: present.length, type: raid.type ?? 'guild' };
      },

      /** 완료된 레이드 중 내가 '도착'한 것의 보상을 1회 지급 (구독에서 호출) */
      _claimClearedRaids: (list) => {
        for (const raid of list) {
          if (raid.status === 'cleared' && !get().claimedRaidIds.includes(raid.id)) {
            get()._applyRaidReward(raid);
          }
        }
      },
      _applyRaidReward: (raid) => {
        const { user, uid, conqueredIds, conqueredAt, claimedRaidIds, titles } = get();
        if (!user) return;
        if (claimedRaidIds.includes(raid.id)) return;
        const me = (raid.members ?? []).find((m) => m.uid === uid);
        // 도착하지 않았으면 보상 없이 처리 완료 표시만
        if (!me || !me.present) {
          set({ claimedRaidIds: [...claimedRaidIds, raid.id] });
          get().queueSync();
          return;
        }
        const presentCount = raid.presentCount ?? (raid.members ?? []).filter((m) => m.present).length;
        const coinsGain = COINS_PER_CONQUEST * presentCount;
        const ticketsGain = presentCount + (presentCount >= 3 ? 2 : 0); // 3명↑ 보너스 뽑기권
        const expGain = EXP_PER_CONQUEST + (presentCount - 1) * 20;

        let nextConqueredIds = conqueredIds;
        let nextConqueredAt = conqueredAt;
        if (!conqueredIds.includes(raid.restaurantId)) {
          nextConqueredIds = [...conqueredIds, raid.restaurantId];
          nextConqueredAt = { ...conqueredAt, [raid.restaurantId]: today() };
        }
        const conqueredTotal = nextConqueredIds.length;
        const { level, exp, levelUps } = applyExp(user.level, user.exp, expGain);
        const unlocked = titles.filter(
          (t) => t.requiredConquests <= conqueredTotal && !user.ownedTitleIds.includes(t.id)
        );
        const nextUser = {
          ...user,
          level,
          exp,
          coins: (user.coins ?? 0) + coinsGain,
          gachaTickets: user.gachaTickets + ticketsGain,
          ownedTitleIds: [...user.ownedTitleIds, ...unlocked.map((t) => t.id)],
        };
        set({
          user: nextUser,
          conqueredIds: nextConqueredIds,
          conqueredAt: nextConqueredAt,
          restaurants: buildRestaurants(nextConqueredIds, nextConqueredAt, get().reviewsByRest, get().uid, get().cloudRestaurants),
          claimedRaidIds: [...claimedRaidIds, raid.id],
        });
        get().queueSync();
        if (levelUps > 0 || unlocked.length) {
          set({ levelUp: { level, levelUps, unlocked, from: `⚔️ ${raid.restaurantName} 레이드` } });
        }
        get().pushToast({
          icon: '⚔️',
          title: `레이드 성공! ${raid.restaurantName}`,
          body: `파티 ${presentCount}명 · 🪙+${coinsGain} · 🎟️+${ticketsGain} · EXP+${expGain}`,
        });
      },

      // ── 일일 퀘스트 ──
      questState: () => {
        const d = get().daily ?? emptyDaily();
        return DAILY_QUESTS.map((q) => ({
          ...q,
          progress: Math.min(d[q.key] ?? 0, q.goal),
          done: (d[q.key] ?? 0) >= q.goal,
          claimed: (d.claimed ?? []).includes(q.id),
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
          coins: (user.coins ?? 0) + (q.reward.coins ?? 0),
        };
        set({ user: nextUser, daily: { ...daily, claimed: [...daily.claimed, questId] } });
        get().queueSync();
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
        get().queueSync();
      },

      // ── 랭킹 ── 전체 유저 공개 스탯 + 나(실시간)
      rankedUsers: () => {
        const { leaderboard, user, uid, titles } = get();
        const me = {
          id: uid ?? 'me',
          nickname: user?.nickname ?? '나',
          level: user?.level ?? 1,
          conquered: get().conqueredCount(),
          titleName: titles.find((t) => t.id === user?.equippedTitleId)?.name ?? '-',
          isMe: true,
        };
        const others = leaderboard.filter((u) => u.id !== uid);
        return [...others, me]
          .sort((a, b) => b.conquered - a.conquered || b.level - a.level)
          .map((u, i) => ({ ...u, rank: i + 1 }));
      },

      resetProgress: async () => {
        const uid = get().uid;
        try {
          if (uid) await cloud.clearProgress(uid);
        } catch {
          /* 무시하고 로컬만 초기화 */
        }
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      // 계정 데이터는 클라우드가 진실원본. 로컬에는 화면 상태만 남긴다.
      migrate: () => ({}),
      partialize: (s) => ({
        playerPos: s.playerPos,
        route: s.route,
        visit: s.visit,
        isAdmin: s.isAdmin,
        devFastTimer: s.devFastTimer,
      }),
    }
  )
);

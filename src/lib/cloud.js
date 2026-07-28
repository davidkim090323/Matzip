// Firebase Realtime Database 데이터 레이어.
// 계정별 진행도(private)는 /users/{uid}/progress, 랭킹용 공개 스탯은 /users/{uid}/public,
// 실제 유저끼리 공유되는 리뷰·자유게시판은 /reviews, /posts 에 저장한다.
// 목업(repository.js)을 걷어내고 여기로 실제 읽기/쓰기를 몰아넣는다.
import {
  ref,
  get,
  set,
  update,
  remove,
  push,
  onValue,
  runTransaction,
} from 'firebase/database';
import { rtdb } from './firebase';

// ── 계정별 진행도 (private) ─────────────────────────────────────
export async function loadProgress(uid) {
  const snap = await get(ref(rtdb, `users/${uid}/progress`));
  return snap.exists() ? snap.val() : null;
}

export async function saveProgress(uid, progress) {
  await set(ref(rtdb, `users/${uid}/progress`), progress);
}

export async function clearProgress(uid) {
  await remove(ref(rtdb, `users/${uid}/progress`));
}

// ── 공개 스탯 (랭킹용) ──────────────────────────────────────────
// 진행도(/users/{uid})는 본인만 읽는다. 랭킹은 모두가 읽어야 하므로
// 공개해도 되는 값만 별도 최상위 노드 /leaderboard/{uid} 에 따로 쓴다.
export async function savePublic(uid, pub) {
  await update(ref(rtdb, `leaderboard/${uid}`), pub);
}

/** 모든 유저의 공개 스탯 구독 → 리더보드 */
export function subscribeUsers(cb) {
  return onValue(ref(rtdb, 'leaderboard'), (snap) => {
    const val = snap.val() || {};
    const list = Object.entries(val)
      .map(([uid, pub]) => ({ id: uid, ...(pub || {}) }))
      .filter((u) => u.nickname); // 공개 스탯을 아직 안 올린 계정은 제외
    cb(list);
  });
}

// ── 리뷰(공략법) : 맛집별 공유 ──────────────────────────────────
/** /reviews/{restaurantId}/{reviewId} 전체 구독 → { [restaurantId]: [review...] } */
export function subscribeReviews(cb) {
  return onValue(ref(rtdb, 'reviews'), (snap) => {
    const val = snap.val() || {};
    const map = {};
    for (const [rid, reviews] of Object.entries(val)) {
      map[rid] = Object.entries(reviews).map(([id, rv]) => ({ id, ...rv }));
    }
    cb(map);
  });
}

export async function addReview(restaurantId, review) {
  const node = push(ref(rtdb, `reviews/${restaurantId}`));
  await set(node, review);
  return node.key;
}

export async function updateReview(restaurantId, reviewId, patch) {
  await update(ref(rtdb, `reviews/${restaurantId}/${reviewId}`), patch);
}

/** "도움돼요" 카운트 증감 (동시 투표 안전) */
export async function bumpHelpful(restaurantId, reviewId, delta) {
  await runTransaction(
    ref(rtdb, `reviews/${restaurantId}/${reviewId}/helpful`),
    (v) => Math.max(0, (v || 0) + delta)
  );
}

// ── 자유게시판 : 전체 공유 ──────────────────────────────────────
export function subscribePosts(cb) {
  return onValue(ref(rtdb, 'posts'), (snap) => {
    const val = snap.val() || {};
    const list = Object.entries(val)
      .map(([id, p]) => ({
        id,
        ...p,
        comments: p.comments
          ? Object.entries(p.comments)
              .map(([cid, c]) => ({ id: cid, ...c }))
              .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
          : [],
      }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    cb(list);
  });
}

export async function addPost(post) {
  const node = push(ref(rtdb, 'posts'));
  await set(node, post);
  return node.key;
}

export async function bumpLike(postId, delta) {
  await runTransaction(ref(rtdb, `posts/${postId}/likes`), (v) =>
    Math.max(0, (v || 0) + delta)
  );
}

export async function bumpReport(postId) {
  await runTransaction(ref(rtdb, `posts/${postId}/reports`), (v) => (v || 0) + 1);
}

export async function addComment(postId, comment) {
  const node = push(ref(rtdb, `posts/${postId}/comments`));
  await set(node, comment);
  return node.key;
}

export async function deletePost(postId) {
  await remove(ref(rtdb, `posts/${postId}`));
}

// ── 유저 맛집 등록 신청 + 승인 ──────────────────────────────────
// 신청은 /restaurantRequests, 운영자가 승인하면 /restaurants 로 옮겨 실제 지도에 추가된다.
export function subscribeApprovedRestaurants(cb) {
  return onValue(ref(rtdb, 'restaurants'), (snap) => {
    const val = snap.val() || {};
    cb(Object.entries(val).map(([id, r]) => ({ id, ...r })));
  });
}

export function subscribeRestaurantRequests(cb) {
  return onValue(ref(rtdb, 'restaurantRequests'), (snap) => {
    const val = snap.val() || {};
    const list = Object.entries(val)
      .map(([id, r]) => ({ id, ...r }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    cb(list);
  });
}

export async function submitRestaurantRequest(req) {
  const node = push(ref(rtdb, 'restaurantRequests'));
  await set(node, req);
  return node.key;
}

/** 운영자 승인 — /restaurants 에 추가하고 신청서는 승인 상태로 표시 */
export async function approveRestaurantRequest(reqId, restaurant) {
  await set(ref(rtdb, `restaurants/${restaurant.id}`), restaurant);
  await update(ref(rtdb, `restaurantRequests/${reqId}`), {
    status: 'approved',
    restaurantId: restaurant.id,
  });
}

export async function rejectRestaurantRequest(reqId) {
  await update(ref(rtdb, `restaurantRequests/${reqId}`), { status: 'rejected' });
}

// ── 길드 ────────────────────────────────────────────────────────
export function subscribeGuilds(cb) {
  return onValue(ref(rtdb, 'guilds'), (snap) => {
    const val = snap.val() || {};
    const list = Object.entries(val).map(([id, g]) => ({
      id,
      ...g,
      members: g.members
        ? Object.entries(g.members).map(([uid, m]) => ({ uid, ...m }))
        : [],
    }));
    cb(list);
  });
}

export async function createGuild(guildId, guild) {
  await set(ref(rtdb, `guilds/${guildId}`), guild);
}

export async function joinGuild(guildId, uid, member) {
  await set(ref(rtdb, `guilds/${guildId}/members/${uid}`), member);
}

export async function leaveGuild(guildId, uid) {
  await remove(ref(rtdb, `guilds/${guildId}/members/${uid}`));
}

export async function updateGuildMeta(guildId, patch) {
  await update(ref(rtdb, `guilds/${guildId}`), patch);
}

export async function deleteGuild(guildId) {
  await remove(ref(rtdb, `guilds/${guildId}`));
}

// ── 레이드 (위치 기반 파티 공략) ────────────────────────────────
export function subscribeRaids(cb) {
  return onValue(ref(rtdb, 'raids'), (snap) => {
    const val = snap.val() || {};
    const list = Object.entries(val).map(([id, r]) => ({
      id,
      ...r,
      members: r.members
        ? Object.entries(r.members).map(([uid, m]) => ({ uid, ...m }))
        : [],
    }));
    cb(list);
  });
}

export async function createRaid(raidId, raid) {
  await set(ref(rtdb, `raids/${raidId}`), raid);
}

export async function joinRaid(raidId, uid, member) {
  await set(ref(rtdb, `raids/${raidId}/members/${uid}`), member);
}

export async function setRaidPresent(raidId, uid, present) {
  await update(ref(rtdb, `raids/${raidId}/members/${uid}`), { present });
}

export async function leaveRaid(raidId, uid) {
  await remove(ref(rtdb, `raids/${raidId}/members/${uid}`));
}

export async function updateRaid(raidId, patch) {
  await update(ref(rtdb, `raids/${raidId}`), patch);
}

export async function deleteRaid(raidId) {
  await remove(ref(rtdb, `raids/${raidId}`));
}

// ── 영토 (맛집을 점령한 길드) ──────────────────────────────────
export function subscribeTerritory(cb) {
  return onValue(ref(rtdb, 'territory'), (snap) => {
    cb(snap.val() || {});
  });
}

export async function setTerritory(restaurantId, owner) {
  await set(ref(rtdb, `territory/${restaurantId}`), owner);
}

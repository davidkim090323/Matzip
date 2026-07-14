// 데이터 레이어 추상화.
// 지금은 목업 JSON을 즉시 반환하지만, 시그니처를 전부 async 로 맞춰두었기 때문에
// 나중에 fetch('/api/...') 로 몸통만 갈아끼우면 호출부는 손댈 필요 없다.
import userJson from './user.json';
import titlesJson from './titles.json';
import restaurantsJson from './restaurants.json';
import matmonJson from './matmon.json';
import costumesJson from './costumes.json';
import postsJson from './posts.json';
import leaderboardJson from './leaderboard.json';

const clone = (v) => JSON.parse(JSON.stringify(v));

export const repo = {
  async getUser() { return clone(userJson); },
  async getTitles() { return clone(titlesJson); },
  async getRestaurants() { return clone(restaurantsJson); },
  async getMatmon() { return clone(matmonJson); },
  async getCostumes() { return clone(costumesJson); },
  async getPosts() { return clone(postsJson); },
  async getLeaderboard() { return clone(leaderboardJson); },

  // 쓰기 계열. 백엔드가 붙으면 여기서 POST/PATCH 를 날린다.
  async saveUser(_user) { return { ok: true }; },
  async addReview(_restaurantId, _review) { return { ok: true }; },
  async markConquered(_restaurantId) { return { ok: true }; },
  async addPost(_post) { return { ok: true }; },
  async addComment(_postId, _comment) { return { ok: true }; },
  async likePost(_postId) { return { ok: true }; },
};

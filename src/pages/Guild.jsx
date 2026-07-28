import { useState, useMemo } from 'react';
import { useGame } from '../store/gameStore';
import RaidCard from '../components/RaidCard';

const EMBLEMS = ['🏰', '🚩', '🏴', '🔥', '⚔️', '🍗', '🍜', '⭐', '👑', '🐉', '🌟', '🛡️'];

/* ── 길드 만들기 ─────────────────────────────────────────────── */
function CreateGuild() {
  const createGuild = useGame((s) => s.createGuild);
  const pushToast = useGame((s) => s.pushToast);
  const [name, setName] = useState('');
  const [emblem, setEmblem] = useState('🏰');

  const ERRORS = {
    already_in_guild: '이미 길드에 소속돼 있어요.',
    bad_name: '길드 이름은 2자 이상이어야 해요.',
    name_taken: '이미 있는 길드 이름이에요.',
  };

  const submit = (e) => {
    e.preventDefault();
    const res = createGuild({ name, emblem });
    if (res?.error) return pushToast({ icon: '⚠️', title: '생성 실패', body: ERRORS[res.error] ?? '오류' });
    pushToast({ icon: '🎌', title: '길드 창설 완료!', body: `${emblem} ${name.trim()}` });
    setName('');
  };

  return (
    <form onSubmit={submit} className="pixel-panel p-4 space-y-3">
      <h2 className="text-sm text-[#b45309]">🎌 길드 창설</h2>
      <div className="flex gap-1.5 flex-wrap">
        {EMBLEMS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEmblem(e)}
            className={`w-9 h-9 grid place-items-center text-lg border-2 border-[#4a3324] transition-colors ${
              emblem === e ? 'bg-amber-300' : 'bg-[#f7ecdd]'
            }`}
          >
            {e}
          </button>
        ))}
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="길드 이름 (2자 이상)"
        maxLength={16}
        className="w-full bg-[#f7ecdd] border-2 border-[#e2cfae] px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
      />
      <button
        type="submit"
        disabled={name.trim().length < 2}
        className="w-full pixel-btn bg-amber-300 text-[#4a3324] py-2.5 text-sm disabled:opacity-50"
      >
        길드 만들기 (리더가 됩니다)
      </button>
    </form>
  );
}

/* ── 길드 목록(가입) ─────────────────────────────────────────── */
function GuildList() {
  const guilds = useGame((s) => s.guilds);
  const joinGuild = useGame((s) => s.joinGuild);
  const pushToast = useGame((s) => s.pushToast);

  const sorted = [...guilds].sort((a, b) => (b.members?.length ?? 0) - (a.members?.length ?? 0));

  const join = (g) => {
    const res = joinGuild(g.id);
    if (res?.error) return pushToast({ icon: '⚠️', title: '가입 실패' });
    pushToast({ icon: '🤝', title: '길드 가입 완료', body: `${g.emblem} ${g.name}` });
  };

  if (!guilds.length)
    return (
      <p className="text-[13.5px] text-[#96805f] text-center py-6">
        아직 길드가 없어요. 첫 길드를 만들어보세요!
      </p>
    );

  return (
    <div className="space-y-2">
      <h2 className="text-sm text-[#b45309] px-1">가입 가능한 길드 {guilds.length}</h2>
      {sorted.map((g) => (
        <div key={g.id} className="pixel-panel p-3 flex items-center gap-3">
          <span className="text-2xl shrink-0">{g.emblem}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{g.name}</p>
            <p className="text-[12.5px] text-[#7d6549]">
              길드원 {g.members?.length ?? 0}명 · 리더 {g.leaderName}
            </p>
          </div>
          <button
            onClick={() => join(g)}
            className="pixel-btn bg-amber-300 text-[#4a3324] px-3 py-1.5 text-[13px] shrink-0"
          >
            가입
          </button>
        </div>
      ))}
    </div>
  );
}

/* ── 내 길드 상세 ─────────────────────────────────────────────── */
function MyGuild({ guild }) {
  const uid = useGame((s) => s.uid);
  const leaveGuild = useGame((s) => s.leaveGuild);
  const pushToast = useGame((s) => s.pushToast);
  const [confirm, setConfirm] = useState(false);

  const members = [...(guild.members ?? [])].sort((a, b) => {
    if (a.uid === guild.leaderUid) return -1;
    if (b.uid === guild.leaderUid) return 1;
    return (a.joinedAt ?? 0) - (b.joinedAt ?? 0);
  });

  const leave = () => {
    leaveGuild();
    setConfirm(false);
    pushToast({ icon: '👋', title: '길드 탈퇴', body: `${guild.name}에서 나왔어요.` });
  };

  return (
    <div className="space-y-3">
      <div className="pixel-panel p-4 text-center relative overflow-hidden">
        <span className="text-4xl">{guild.emblem}</span>
        <h2 className="text-lg text-[#3d2c1e] mt-1">{guild.name}</h2>
        <p className="text-[13px] text-[#7d6549] mt-1">
          길드원 {members.length}명 · 리더 {guild.leaderName}
        </p>
      </div>

      <div className="space-y-1.5">
        <h3 className="text-sm text-[#b45309] px-1">길드원</h3>
        {members.map((m) => (
          <div key={m.uid} className="pixel-panel p-2.5 flex items-center gap-2">
            <span className="text-[13.5px] flex-1 truncate">
              {m.nickname}
              {m.uid === uid && <span className="ml-1.5 text-[12px] text-[#b45309]">(나)</span>}
            </span>
            {m.uid === guild.leaderUid && (
              <span className="text-[12px] px-1.5 py-0.5 border border-[#4a3324] bg-amber-300 text-[#4a3324]">
                👑 리더
              </span>
            )}
          </div>
        ))}
      </div>

      {!confirm ? (
        <button
          onClick={() => setConfirm(true)}
          className="w-full pixel-btn bg-[#f1e3cf] text-[#7d6549] py-2.5 text-[13.5px]"
        >
          길드 탈퇴
        </button>
      ) : (
        <div className="pixel-panel p-3 space-y-2">
          <p className="text-[12.5px] text-red-600">
            정말 탈퇴할까요? 리더가 나가면 다음 길드원에게 리더가 넘어가고, 혼자면 길드가 해체됩니다.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirm(false)} className="flex-1 pixel-btn bg-[#f1e3cf] text-[#7d6549] py-2 text-[13px]">
              취소
            </button>
            <button onClick={leave} className="flex-1 pixel-btn bg-red-400 text-white py-2 text-[13px]">
              탈퇴
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 레이드 허브 (길드 활동) ─────────────────────────────────── */
function RaidHub() {
  const uid = useGame((s) => s.uid);
  const raids = useGame((s) => s.raids);
  const restaurants = useGame((s) => s.restaurants);
  const createRaid = useGame((s) => s.createRaid);
  const pushToast = useGame((s) => s.pushToast);
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState('');

  // 길드 레이드만 (일반 레이드는 지도 탭)
  const recruiting = raids.filter((r) => r.status === 'recruiting' && (r.type ?? 'guild') === 'guild');
  const mine = recruiting.filter((r) => r.members.some((m) => m.uid === uid));
  const mineIds = new Set(mine.map((r) => r.id));
  const others = recruiting.filter((r) => !mineIds.has(r.id));

  const openList = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const busy = new Set(recruiting.map((r) => r.restaurantId));
    return restaurants
      .filter((r) => !busy.has(r.id) && (!needle || `${r.name}${r.district}`.toLowerCase().includes(needle)))
      .slice(0, 12);
  }, [restaurants, q, recruiting]);

  const open = (restaurantId) => {
    const res = createRaid(restaurantId, 'guild');
    if (res?.error === 'exists') return pushToast({ icon: 'ℹ️', title: '이미 모집 중인 길드 레이드가 있어요' });
    if (res?.ok) {
      setPicking(false);
      setQ('');
      pushToast({ icon: '🏰', title: '길드 레이드 모집 시작!', body: '길드원을 모아 함께 점령하러 가세요.' });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm text-[#b45309]">🏰 길드 레이드</h3>
        <button
          onClick={() => setPicking((v) => !v)}
          className="pixel-btn bg-gradient-to-r from-rose-400 to-orange-400 text-white px-3 py-1.5 text-[12.5px]"
        >
          {picking ? '취소' : '＋ 레이드 열기'}
        </button>
      </div>
      <p className="text-[12.5px] text-[#7d6549] px-1 -mt-1">
        길드원과 함께 맛집으로 모이면 <b>인원수만큼 보상이 커지고</b>, 점령하면 맛집 깃발이 우리 길드 깃발로 바뀝니다.
        (🪙50×인원 · 🎟️인원수(3명↑ +2) · EXP 보너스)
      </p>

      {/* 레이드 열 맛집 고르기 */}
      {picking && (
        <div className="pixel-panel p-3 space-y-2 pop-in">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔍 공략할 맛집 검색"
            className="w-full bg-[#f7ecdd] border-2 border-[#e2cfae] px-3 py-2 text-sm outline-none focus:border-amber-500 transition-colors"
          />
          <div className="max-h-56 overflow-y-auto space-y-1">
            {openList.map((r) => (
              <button
                key={r.id}
                onClick={() => open(r.id)}
                className="w-full flex items-center justify-between gap-2 bg-[#f7ecdd] border-2 border-[#e2cfae] px-3 py-2 text-left hover:border-amber-500 transition-colors"
              >
                <span className="text-[13px] truncate">{r.name}</span>
                <span className="text-[12px] text-[#96805f] shrink-0">{r.district}</span>
              </button>
            ))}
            {!openList.length && <p className="text-[12.5px] text-[#96805f] text-center py-3">모집 가능한 맛집이 없어요.</p>}
          </div>
        </div>
      )}

      {/* 내가 참가 중인 레이드 */}
      {mine.length > 0 && (
        <div className="space-y-2">
          <p className="text-[12.5px] text-[#96805f] px-1">내 레이드</p>
          {mine.map((raid) => (
            <RaidCard key={raid.id} raid={raid} mine />
          ))}
        </div>
      )}

      {/* 참가 가능한 레이드 */}
      {others.length > 0 && (
        <div className="space-y-2">
          <p className="text-[12.5px] text-[#96805f] px-1">모집 중인 레이드</p>
          {others.map((raid) => (
            <RaidCard key={raid.id} raid={raid} mine={false} />
          ))}
        </div>
      )}

      {!recruiting.length && !picking && (
        <p className="text-[12.5px] text-[#96805f] text-center py-3">
          진행 중인 레이드가 없어요. ‘＋ 레이드 열기’로 파티를 모아보세요!
        </p>
      )}
    </div>
  );
}

/* ── 우리 길드 영토 ──────────────────────────────────────────── */
function TerritorySection() {
  const guildId = useGame((s) => s.user?.guildId);
  const territoryByRest = useGame((s) => s.territoryByRest);
  const restaurants = useGame((s) => s.restaurants);
  const bonus = useGame((s) => s.territoryBonus());

  const held = Object.entries(territoryByRest || {})
    .filter(([, t]) => t?.guildId === guildId)
    .map(([rid]) => restaurants.find((r) => r.id === rid))
    .filter(Boolean);

  return (
    <div className="pixel-panel p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm text-[#b45309]">🏴 우리 영토 {held.length}곳</h3>
        <span className="text-[12.5px] text-emerald-700">공략 시 +🪙{bonus} 보너스</span>
      </div>
      {held.length === 0 ? (
        <p className="text-[12.5px] text-[#96805f]">
          아직 점령한 맛집이 없어요. 맛집 상세에서 레이드로 점령하면 이곳에 깃발이 꽂힙니다.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {held.map((r) => (
            <span key={r.id} className="text-[12.5px] px-2 py-0.5 border-2 border-[#4a3324] bg-[#f7ecdd]">
              🏴 {r.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── 길드 랭킹 ───────────────────────────────────────────────── */
function GuildRanking() {
  const rows = useGame((s) => s.guildRanking());
  const myGuildId = useGame((s) => s.user?.guildId);
  const medal = (r) => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `${r}`);

  if (!rows.length) return null;

  return (
    <div className="space-y-1.5">
      <h3 className="text-sm text-[#b45309] px-1">🏆 길드 랭킹 (공략 합산)</h3>
      {rows.map((g) => (
        <div
          key={g.id}
          className={`pixel-panel p-3 flex items-center gap-3 ${g.id === myGuildId ? 'border-amber-500' : ''}`}
        >
          <span className={`w-8 text-center shrink-0 ${g.rank <= 3 ? 'text-xl' : 'text-[13.5px] text-[#7d6549]'}`}>
            {medal(g.rank)}
          </span>
          <span className="text-xl shrink-0">{g.emblem}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">
              {g.name}
              {g.id === myGuildId && (
                <span className="ml-1.5 text-[12px] text-[#b45309] border border-amber-500 px-1">우리</span>
              )}
            </p>
            <p className="text-[12px] text-[#7d6549]">길드원 {g.members}명</p>
          </div>
          <span className="text-[13.5px] text-[#b45309] shrink-0">🚩 {g.conquered}</span>
        </div>
      ))}
    </div>
  );
}

/* ── 페이지 ──────────────────────────────────────────────────── */
export default function Guild() {
  const myGuild = useGame((s) => s.myGuild());

  return (
    <div className="p-4 space-y-4 page-in">
      <h1 className="text-lg text-[#3d2c1e] px-1">🏰 길드</h1>

      {myGuild ? (
        <>
          <MyGuild guild={myGuild} />
          <RaidHub />
          <TerritorySection />
        </>
      ) : (
        <>
          <CreateGuild />
          <GuildList />
        </>
      )}

      <GuildRanking />
    </div>
  );
}

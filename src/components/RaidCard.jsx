import { useNavigate } from 'react-router-dom';
import { useGame, CONQUEST_RADIUS_M } from '../store/gameStore';
import { distanceMeters } from '../hooks/useGeolocation';

/**
 * 레이드 파티 한 건을 그리는 공용 카드.
 * 길드 레이드(type 'guild', 점령·깃발)와 일반 레이드(type 'public', 보상만) 모두 사용한다.
 * mine=true면 참가자 컨트롤(도착/완료/나가기), false면 참가 버튼.
 */
export default function RaidCard({ raid, mine }) {
  const navigate = useNavigate();
  const uid = useGame((s) => s.uid);
  const restaurants = useGame((s) => s.restaurants);
  const playerPos = useGame((s) => s.playerPos);
  const joinRaid = useGame((s) => s.joinRaid);
  const markRaidPresent = useGame((s) => s.markRaidPresent);
  const completeRaid = useGame((s) => s.completeRaid);
  const leaveRaid = useGame((s) => s.leaveRaid);
  const pushToast = useGame((s) => s.pushToast);

  const isGuild = (raid.type ?? 'guild') === 'guild';
  const rest = restaurants.find((r) => r.id === raid.restaurantId);
  const dist = rest ? distanceMeters(playerPos, { lat: rest.lat, lng: rest.lng }) : Infinity;
  const inRange = dist <= CONQUEST_RADIUS_M;
  const me = raid.members?.find((m) => m.uid === uid) ?? null;
  const isHost = raid.hostUid === uid;
  const presentCount = raid.members?.filter((m) => m.present).length ?? 0;

  const join = () => {
    const res = joinRaid(raid.id);
    if (res?.error === 'full') return pushToast({ icon: '⚠️', title: '파티가 꽉 찼어요' });
    if (res?.ok) pushToast({ icon: '🤝', title: '레이드 파티 참가!' });
  };
  const arrive = () => {
    const res = markRaidPresent(raid.id);
    if (res?.error === 'too_far')
      return pushToast({ icon: '📍', title: '아직 멀어요', body: `맛집까지 ${Math.round(res.dist)}m — 지도에서 더 가까이 가세요.` });
    if (res?.ok) pushToast({ icon: '✅', title: '도착 완료!', body: '파티원이 모두 도착하면 호스트가 완료할 수 있어요.' });
  };
  const complete = () => {
    const res = completeRaid(raid.id);
    if (res?.error === 'need2') return pushToast({ icon: '👥', title: '2명 이상 도착 필요', body: `현재 도착 ${res.present}명` });
    if (res?.ok)
      pushToast(
        isGuild
          ? { icon: '🏴', title: '점령 성공!', body: `${raid.emblem} ${raid.guildName} 깃발을 꽂았습니다!` }
          : { icon: '🎉', title: '레이드 성공!', body: `파티 ${res.present}명 — 함께라 보상 두둑!` }
      );
  };

  return (
    <div className="pixel-panel p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg shrink-0">{raid.emblem}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate">{raid.restaurantName}</p>
          <p className="text-[12px] text-[#7d6549]">
            {isGuild ? raid.guildName : '일반 레이드'} · 파티 {raid.members.length}/{raid.maxMembers} · 도착 {presentCount}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {raid.members.map((m) => (
          <span
            key={m.uid}
            className={`text-[11.5px] px-1.5 py-0.5 border border-[#4a3324] ${m.present ? 'bg-emerald-300 text-[#4a3324]' : 'bg-[#f7ecdd] text-[#7d6549]'}`}
          >
            {m.present ? '✅' : '⏳'} {m.nickname}
            {m.uid === raid.hostUid ? ' 👑' : ''}
          </span>
        ))}
      </div>

      {mine ? (
        <div className="space-y-1.5">
          {!me?.present && (
            <button
              onClick={arrive}
              className={`w-full pixel-btn py-2 text-[13px] ${inRange ? 'bg-emerald-400 text-[#4a3324]' : 'bg-[#f1e3cf] text-[#7d6549]'}`}
            >
              {inRange ? '✅ 여기 도착!' : `📍 도착 표시 (현재 ${Number.isFinite(dist) ? Math.round(dist) + 'm' : '위치 확인'})`}
            </button>
          )}
          {!inRange && !me?.present && (
            <button onClick={() => navigate(`/map?nav=${raid.restaurantId}`)} className="w-full pixel-btn bg-sky-400 text-[#4a3324] py-2 text-[12.5px]">
              🧭 지도에서 레이드 지점으로 이동
            </button>
          )}
          {isHost && (
            <button
              onClick={complete}
              disabled={presentCount < 2}
              className={`w-full pixel-btn py-2 text-[13px] ${presentCount >= 2 ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white' : 'bg-[#f1e3cf] text-[#b89f7c]'}`}
            >
              {isGuild ? '🏴 레이드 완료·점령' : '🎉 레이드 완료'} {presentCount < 2 ? '(2명↑ 필요)' : `(${presentCount}명)`}
            </button>
          )}
          <button onClick={() => leaveRaid(raid.id)} className="w-full pixel-btn bg-[#f1e3cf] text-[#7d6549] py-1.5 text-[12px]">
            {isHost ? '레이드 해산' : '파티 나가기'}
          </button>
        </div>
      ) : (
        <button onClick={join} className="w-full pixel-btn bg-amber-300 text-[#4a3324] py-2 text-[13px]">
          🤝 이 레이드에 참가
        </button>
      )}
    </div>
  );
}

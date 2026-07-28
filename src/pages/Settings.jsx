import { useState } from 'react';
import { useGame } from '../store/gameStore';
import { useAuth } from '../contexts/AuthContext';
import { notifySupported, notifyPermission, requestNotify, sendNotify } from '../lib/notify';

const PROVIDER_LABEL = { 'google.com': '구글 계정', password: '이메일' };

function Section({ title, children }) {
  return (
    <div className="pixel-panel p-4 space-y-3">
      <h2 className="text-sm text-[#b45309]">{title}</h2>
      {children}
    </div>
  );
}

export default function Settings() {
  const { user, updateNickname, logout } = useAuth();
  const nickname = useGame((s) => s.user?.nickname ?? '');
  const setNickname = useGame((s) => s.setNickname);
  const resetProgress = useGame((s) => s.resetProgress);
  const pushToast = useGame((s) => s.pushToast);
  const isAdmin = useGame((s) => s.isAdmin);
  const requests = useGame((s) => s.restaurantRequests);
  const approveRestaurant = useGame((s) => s.approveRestaurant);
  const rejectRestaurant = useGame((s) => s.rejectRestaurant);
  const pending = requests.filter((r) => r.status === 'pending');

  const [nick, setNick] = useState(nickname);
  const [savingNick, setSavingNick] = useState(false);
  const [perm, setPerm] = useState(() => notifyPermission());
  const [confirmReset, setConfirmReset] = useState(false);

  const provider = user?.providerData?.[0]?.providerId;

  const saveNick = async () => {
    const nn = nick.trim();
    if (nn.length < 2 || nn === nickname || savingNick) return;
    setSavingNick(true);
    try {
      await updateNickname(nn);
      setNickname(nn);
      pushToast({ icon: '✏️', title: '닉네임 변경 완료', body: `이제 ${nn}님이에요.` });
    } catch {
      pushToast({ icon: '⚠️', title: '변경 실패', body: '잠시 후 다시 시도해 주세요.' });
    } finally {
      setSavingNick(false);
    }
  };

  const toggleNotify = async () => {
    if (perm === 'granted') {
      pushToast({ icon: '🔔', title: '이미 알림이 켜져 있어요', body: '끄려면 기기 설정에서 변경하세요.' });
      return;
    }
    const result = await requestNotify();
    setPerm(result);
    if (result === 'granted') {
      sendNotify('알림이 켜졌어요 🔔', { body: '공략 타이머·찜 맛집 근처를 알려드려요.', tag: 'welcome' });
      pushToast({ icon: '🔔', title: '알림을 켰어요' });
    } else if (result === 'denied') {
      pushToast({ icon: '🔕', title: '알림이 차단됐어요', body: '기기 설정에서 다시 켤 수 있어요.' });
    }
  };

  const permLabel =
    perm === 'granted' ? '켜짐' : perm === 'denied' ? '차단됨(기기 설정)' : perm === 'unsupported' ? '미지원' : '꺼짐';

  return (
    <div className="p-4 space-y-4 page-in">
      <h1 className="text-lg text-[#3d2c1e] px-1">⚙️ 설정</h1>

      {/* 계정 */}
      <Section title="계정">
        <div className="flex items-center justify-between text-[13.5px]">
          <span className="text-[#7d6549]">로그인</span>
          <span className="text-[#3d2c1e]">{PROVIDER_LABEL[provider] ?? '이메일'}</span>
        </div>
        <div className="flex items-center justify-between text-[13.5px]">
          <span className="text-[#7d6549] shrink-0">이메일</span>
          <span className="text-[#3d2c1e] truncate ml-3">{user?.email ?? '-'}</span>
        </div>
      </Section>

      {/* 닉네임 */}
      <Section title="닉네임">
        <div className="flex gap-2">
          <input
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            maxLength={12}
            placeholder="2~12자"
            className="flex-1 min-w-0 bg-[#f7ecdd] border-2 border-[#e2cfae] px-3 py-2 text-[13.5px] text-[#3d2c1e] outline-none focus:border-amber-500 transition-colors"
          />
          <button
            onClick={saveNick}
            disabled={nick.trim().length < 2 || nick.trim() === nickname || savingNick}
            className="pixel-btn bg-amber-300 text-[#4a3324] px-4 py-2 text-[13.5px] shrink-0 disabled:opacity-50"
          >
            {savingNick ? '저장중' : '변경'}
          </button>
        </div>
      </Section>

      {/* 알림 */}
      <Section title="알림">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[13.5px] text-[#3d2c1e]">공략 타이머 · 찜 맛집 근처</p>
            <p className="text-[12.5px] text-[#7d6549] mt-0.5">현재: {permLabel}</p>
          </div>
          <button
            onClick={toggleNotify}
            disabled={perm === 'granted' || perm === 'denied' || perm === 'unsupported'}
            className="pixel-btn bg-amber-300 text-[#4a3324] px-4 py-2 text-[13.5px] shrink-0 disabled:opacity-50"
          >
            {perm === 'granted' ? '켜짐' : '켜기'}
          </button>
        </div>
      </Section>

      {/* 데이터 */}
      <Section title="데이터">
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full pixel-btn bg-[#f1e3cf] text-[#7d6549] py-2.5 text-[13.5px]"
          >
            게임 진행도 초기화
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-[12.5px] text-red-600">
              공략·레벨·뽑기·찜이 모두 삭제됩니다. 계정은 유지돼요. 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 pixel-btn bg-[#f1e3cf] text-[#7d6549] py-2.5 text-[13.5px]"
              >
                취소
              </button>
              <button
                onClick={resetProgress}
                className="flex-1 pixel-btn bg-red-400 text-white py-2.5 text-[13.5px]"
              >
                초기화 실행
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* 운영자 — 맛집 신청 검토 */}
      {isAdmin && (
        <Section title={`🛠 맛집 신청 검토 (${pending.length})`}>
          {pending.length === 0 && (
            <p className="text-[13px] text-[#96805f]">대기 중인 신청이 없습니다.</p>
          )}
          {pending.map((req) => (
            <div key={req.id} className="bg-[#f7ecdd] border-2 border-[#e2cfae] p-2.5 space-y-1.5">
              <p className="text-[13.5px] text-[#3d2c1e]">
                {req.name} <span className="text-[#96805f]">· {req.category}</span>
              </p>
              <p className="text-[12.5px] text-[#7d6549]">
                {req.district} · {req.address}
              </p>
              <p className="text-[12px] text-[#96805f]">
                신청자 {req.nickname} · 위치 {req.lat?.toFixed(4)}, {req.lng?.toFixed(4)}
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    approveRestaurant(req.id);
                    pushToast({ icon: '✅', title: '승인 완료', body: `${req.name} 지도에 추가됨` });
                  }}
                  className="flex-1 pixel-btn bg-emerald-400 text-[#4a3324] py-2 text-[13px]"
                >
                  승인
                </button>
                <button
                  onClick={() => {
                    rejectRestaurant(req.id);
                    pushToast({ icon: '🚫', title: '거절 처리' });
                  }}
                  className="flex-1 pixel-btn bg-[#f1e3cf] text-[#7d6549] py-2 text-[13px]"
                >
                  거절
                </button>
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* 로그아웃 */}
      <button
        onClick={logout}
        className="w-full pixel-btn bg-[#fffaf2] text-[#b45309] border-2 border-[#e2cfae] py-3 text-[14px]"
      >
        로그아웃
      </button>

      <p className="text-center text-[12px] text-[#96805f]">맛집공략 · 춘천 맛집 정복 게임</p>
    </div>
  );
}

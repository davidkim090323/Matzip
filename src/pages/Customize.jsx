import { useState } from 'react';
import { useGame, MAX_EQUIPPED_MATMON, RARITY } from '../store/gameStore';
import { DotCharacter, DotMatmon, DotItem } from '../components/DotCharacter';
import GachaModal from '../components/GachaModal';

/** 희귀도 뱃지 */
function RarityTag({ rarity }) {
  const r = RARITY[rarity] ?? RARITY.N;
  return (
    <span
      className="text-[10.5px] px-1 border border-[#1b1230] text-[#1b1230] leading-tight"
      style={{ background: r.color }}
    >
      {r.label}
    </span>
  );
}

/** 잠금(미보유) 슬롯 공통 표시 */
function LockedCell({ rarity }) {
  return (
    <div className="grid place-items-center gap-1 opacity-60">
      <span className="text-2xl">🔒</span>
      <RarityTag rarity={rarity} />
    </div>
  );
}

/* ── 뽑기 섹션 : 뽑기권 1장을 맛몬에 쓸지 아이템에 쓸지 고른다 ────────── */
function GachaPanel() {
  const user = useGame((s) => s.user);
  const draw = useGame((s) => s.draw);
  const remainMatmon = useGame((s) => s.remainingPool('matmon'));
  const remainItem = useGame((s) => s.remainingPool('item'));

  const [result, setResult] = useState(null);
  const [kind, setKind] = useState('matmon');

  const noTicket = user.gachaTickets <= 0;

  return (
    <>
      <div className="pixel-panel p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm text-amber-300">🎁 뽑기</h2>
          <span className="text-[13px] text-slate-300">
            뽑기권 <span className="text-amber-300 text-sm">{user.gachaTickets}</span>장
          </span>
        </div>

        <p className="text-[13px] text-slate-400 leading-relaxed">
          뽑기권 1장은 <span className="text-slate-200">맛몬</span> 또는{' '}
          <span className="text-slate-200">커스터마이징 아이템</span> 중 한 곳에만 쓸 수 있습니다.
          어디에 태울지 고르세요.
        </p>

        {/* 대상 선택 */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'matmon', label: '맛몬 뽑기', sub: `미보유 ${remainMatmon}종`, icon: '🐣' },
            { id: 'item', label: '아이템 뽑기', sub: `미보유 ${remainItem}종`, icon: '🎩' },
          ].map((k) => (
            <button
              key={k.id}
              onClick={() => setKind(k.id)}
              className={`p-3 border-3 border-[#1b1230] text-left transition-all ${
                kind === k.id
                  ? 'bg-amber-300 text-[#1b1230] scale-[1.02]'
                  : 'bg-[#241a45] text-slate-300 hover:bg-[#2b2050]'
              }`}
            >
              <span className="text-xl">{k.icon}</span>
              <p className="text-[13.5px] mt-1">{k.label}</p>
              <p className="text-[11.5px] opacity-70">{k.sub}</p>
            </button>
          ))}
        </div>

        <button
          disabled={noTicket}
          onClick={() => setResult(draw(kind))}
          className="w-full pixel-btn bg-gradient-to-r from-amber-300 to-orange-400 text-[#1b1230] py-3 text-sm"
        >
          {noTicket ? '뽑기권 없음 — 맛집을 공략하세요' : `뽑기권 1장 사용 (${kind === 'matmon' ? '맛몬' : '아이템'})`}
        </button>

        <p className="text-[11.5px] text-slate-500 text-center">
          확률 · N 55% / R 30% / SR 13% / SSR 2% · 중복 없음(미보유 풀에서만 추첨)
        </p>
      </div>

      <GachaModal result={result} onClose={() => setResult(null)} />
    </>
  );
}

/* ── 맛몬 탭 ─────────────────────────────────────────────────── */
function MatmonTab() {
  const user = useGame((s) => s.user);
  const matmon = useGame((s) => s.matmon);
  const toggleMatmon = useGame((s) => s.toggleMatmon);
  const equippedCount = user.equippedMatmonIds.length;

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-slate-400 px-1">
        데리고 다닐 맛몬 ({equippedCount}/{MAX_EQUIPPED_MATMON})
      </p>

      <div className="grid grid-cols-3 gap-2">
        {matmon.map((m, i) => {
          const owned = user.ownedMatmonIds.includes(m.id);
          const slot = user.equippedMatmonIds.indexOf(m.id); // -1 이면 미동행
          const on = slot >= 0;
          const full = equippedCount >= MAX_EQUIPPED_MATMON && !on;

          return (
            <button
              key={m.id}
              disabled={!owned || full}
              onClick={() => toggleMatmon(m.id)}
              style={{
                '--i': i,
                // 선택된 카드는 패널 배경 자체를 호박색 계열로 갈아끼워 한눈에 구분되게
                ...(on
                  ? {
                      background: 'linear-gradient(180deg,#fde68a,#fbbf24)',
                      borderColor: '#fff7d6',
                      boxShadow: '0 0 0 3px #b45309 inset, 0 0 20px -2px #fbbf24, 0 6px 0 0 rgba(0,0,0,0.5)',
                    }
                  : {}),
              }}
              className={`stagger pixel-panel relative p-2 flex flex-col items-center gap-1 transition-all ${
                on ? '-translate-y-1 text-[#1b1230]' : ''
              } ${owned && !full ? 'lift' : ''} ${
                !owned ? 'opacity-45' : full ? 'opacity-50 grayscale' : ''
              }`}
            >
              {/* 동행 순번 뱃지 */}
              {on && (
                <span className="absolute -top-2 -right-2 w-6 h-6 grid place-items-center bg-[#1b1230] text-amber-300 border-2 border-amber-300 text-[11.5px] font-bold">
                  {slot + 1}
                </span>
              )}

              {owned ? (
                <DotMatmon id={m.id} size={52} className={on ? 'bob' : 'opacity-80'} />
              ) : (
                <div className="h-[52px] grid place-items-center">
                  <LockedCell rarity={m.rarity} />
                </div>
              )}

              <span
                className={`text-[11.5px] truncate w-full text-center ${
                  on ? 'font-bold text-[#1b1230]' : ''
                }`}
              >
                {owned ? m.name : '???'}
              </span>

              {owned && <RarityTag rarity={m.rarity} />}

              <span
                className={`text-[10.5px] ${
                  on ? 'text-[#7c2d12] font-bold' : 'text-slate-500'
                }`}
              >
                {on ? '동행중' : owned ? (full ? '자리 없음' : '선택') : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── 캐릭터 탭 ───────────────────────────────────────────────── */
// 모듈 스코프에 두어야 리렌더마다 remount 되지 않는다(= 애니메이션 재생 방지)
function Section({ title, items, slot, render, ownedIds, equippedId, onPick }) {
  return (
    <div>
      <p className="text-[13px] text-slate-400 mb-2 px-1">
        {title}{' '}
        <span className="text-slate-600">
          ({items.filter((i) => ownedIds.includes(i.id)).length}/{items.length})
        </span>
      </p>
      <div className="grid grid-cols-5 gap-2">
        {items.map((it, i) => {
          const has = ownedIds.includes(it.id);
          const on = equippedId === it.id;
          return (
            <button
              key={it.id}
              disabled={!has}
              onClick={() => onPick(slot, it.id)}
              title={has ? it.name : '미보유 — 아이템 뽑기로 획득'}
              style={{ '--i': i }}
              className={`stagger pixel-panel h-16 grid place-items-center transition-all ${
                on ? 'ring-4 ring-amber-300' : has ? 'lift' : 'opacity-45'
              }`}
            >
              {has ? render(it) : <LockedCell rarity={it.rarity} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CharacterTab() {
  const user = useGame((s) => s.user);
  const costumes = useGame((s) => s.costumes);
  const setCostume = useGame((s) => s.setCostume);

  const ownedIds = user.ownedCostumeIds;
  const color = costumes.colors.find((c) => c.id === user.costume.color)?.hex ?? '#3b82f6';

  return (
    <div className="space-y-4">
      {/* 실시간 미리보기 */}
      <div className="pixel-panel p-5 grid place-items-center relative overflow-hidden">
        <div
          className="absolute w-40 h-40 rounded-full blur-2xl opacity-25"
          style={{ background: color }}
        />
        <DotCharacter
          color={color}
          hatId={user.costume.hat}
          accessoryId={user.costume.accessory}
          size={150}
          className="bob relative"
        />
        <p className="mt-2 text-[13px] text-slate-400 relative">{user.nickname}</p>
      </div>

      <Section
        title="모자"
        slot="hat"
        items={costumes.hats}
        ownedIds={ownedIds}
        equippedId={user.costume.hat}
        onPick={setCostume}
        render={(it) =>
          it.id === 'h_none' ? (
            <span className="text-xl opacity-50">🚫</span>
          ) : (
            <DotItem slot="hat" id={it.id} size={42} />
          )
        }
      />

      <Section
        title="옷 색상"
        slot="color"
        items={costumes.colors}
        ownedIds={ownedIds}
        equippedId={user.costume.color}
        onPick={setCostume}
        render={(it) => (
          <span className="w-9 h-9 border-2 border-[#1b1230]" style={{ background: it.hex }} />
        )}
      />

      <Section
        title="악세서리"
        slot="accessory"
        items={costumes.accessories}
        ownedIds={ownedIds}
        equippedId={user.costume.accessory}
        onPick={setCostume}
        render={(it) =>
          it.id === 'a_none' ? (
            <span className="text-xl opacity-50">🚫</span>
          ) : (
            <DotItem slot="accessory" id={it.id} size={42} />
          )
        }
      />
    </div>
  );
}

/* ── 페이지 ──────────────────────────────────────────────────── */
export default function Customize() {
  const [tab, setTab] = useState('character');
  const resetProgress = useGame((s) => s.resetProgress);
  const isAdmin = useGame((s) => s.isAdmin);
  const setAdmin = useGame((s) => s.setAdmin);

  return (
    <div className="p-4 space-y-4 page-in">
      <GachaPanel />

      <div className="grid grid-cols-2 gap-2">
        {[
          { id: 'character', label: '🧍 캐릭터' },
          { id: 'matmon', label: '🐣 맛몬' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pixel-btn py-2.5 text-sm ${
              tab === t.id ? 'bg-amber-300 text-[#1b1230]' : 'bg-[#2b2050] text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'matmon' ? <MatmonTab /> : <CharacterTab />}

      {/* 개발/운영 도구 */}
      <div className="pixel-panel p-3 space-y-2">
        <p className="text-[11.5px] text-slate-500">🛠 개발자 도구</p>
        <label className="flex items-center gap-2 cursor-pointer text-[13px]">
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(e) => setAdmin(e.target.checked)}
            className="accent-amber-300 w-4 h-4"
          />
          <span className="text-slate-300">
            운영자 모드 — 자유게시판 글 삭제 권한 (유저는 신고만 가능)
          </span>
        </label>
        <button
          onClick={resetProgress}
          className="w-full text-[11.5px] text-slate-600 hover:text-red-400 py-2 transition-colors"
        >
          진행도 초기화
        </button>
      </div>
    </div>
  );
}

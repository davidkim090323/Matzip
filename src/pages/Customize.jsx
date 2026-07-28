import { useState } from 'react';
import { useGame, MAX_EQUIPPED_MATMON, RARITY } from '../store/gameStore';
import { DotCharacter, DotMatmon, DotItem, DotAura } from '../components/DotCharacter';

/** 희귀도 뱃지 */
function RarityTag({ rarity }) {
  const r = RARITY[rarity] ?? RARITY.N;
  return (
    <span className="text-[12px] px-1 border border-[#4a3324] text-[#4a3324] leading-tight" style={{ background: r.color }}>
      {r.label}
    </span>
  );
}

function LockedCell({ rarity }) {
  return (
    <div className="grid place-items-center gap-1 opacity-60">
      <span className="text-2xl">🔒</span>
      <RarityTag rarity={rarity} />
    </div>
  );
}

/** 보유 개수 뱃지 (2개 이상일 때) */
function CountBadge({ n }) {
  if (n < 2) return null;
  return (
    <span className="absolute -top-2 -left-2 min-w-5 h-5 px-1 grid place-items-center bg-[#4a3324] text-amber-200 border-2 border-amber-500 text-[11px] font-bold">
      ×{n}
    </span>
  );
}

/* ── 맛몬 탭 ─────────────────────────────────────────────────── */
function MatmonTab() {
  const user = useGame((s) => s.user);
  const matmon = useGame((s) => s.matmon);
  const toggleMatmon = useGame((s) => s.toggleMatmon);
  const equippedCount = user.equippedMatmonIds.length;
  const inv = user.matmonInv ?? {};

  const list = matmon.filter((m) => (inv[m.id] ?? 0) > 0);
  const rarityRank = { SSR: 0, SR: 1, R: 2, N: 3 };
  list.sort((a, b) => rarityRank[a.rarity] - rarityRank[b.rarity]);

  return (
    <div className="space-y-3">
      <p className="text-[13.5px] text-[#7d6549] px-1">
        데리고 다닐 맛몬 ({equippedCount}/{MAX_EQUIPPED_MATMON}) · 보유 {list.length}종
      </p>

      {!list.length && (
        <p className="text-[13.5px] text-[#96805f] text-center py-8">
          보유한 맛몬이 없어요. 뽑기·상점에서 얻어보세요!
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {list.map((m, i) => {
          const count = inv[m.id];
          const slot = user.equippedMatmonIds.indexOf(m.id);
          const on = slot >= 0;
          const full = equippedCount >= MAX_EQUIPPED_MATMON && !on;

          return (
            <button
              key={m.id}
              disabled={full}
              onClick={() => toggleMatmon(m.id)}
              style={{
                '--i': i,
                ...(on
                  ? { background: 'linear-gradient(180deg,#fde68a,#fbbf24)', borderColor: '#fff7d6', boxShadow: '0 0 0 3px #b45309 inset, 0 0 20px -2px #fbbf24, 0 6px 0 0 rgba(0,0,0,0.5)' }
                  : {}),
              }}
              className={`stagger pixel-panel relative p-2 flex flex-col items-center gap-1 transition-all ${
                on ? '-translate-y-1 text-[#4a3324]' : ''
              } ${!full ? 'lift' : 'opacity-50 grayscale'}`}
            >
              <CountBadge n={count} />
              {on && (
                <span className="absolute -top-2 -right-2 w-6 h-6 grid place-items-center bg-[#4a3324] text-amber-300 border-2 border-amber-500 text-[12.5px] font-bold">
                  {slot + 1}
                </span>
              )}
              <DotMatmon id={m.id} size={52} className={on ? 'bob' : 'opacity-90'} />
              <span className={`text-[12.5px] truncate w-full text-center ${on ? 'font-bold' : ''}`}>{m.name}</span>
              <RarityTag rarity={m.rarity} />
              <span className={`text-[12px] ${on ? 'text-[#7c2d12] font-bold' : 'text-[#96805f]'}`}>
                {on ? '동행중' : full ? '자리 없음' : '선택'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── 캐릭터 탭 ───────────────────────────────────────────────── */
function Section({ title, items, slot, render, countOf, equippedId, onPick }) {
  const ownedN = items.filter((i) => countOf(i.id) > 0).length;
  return (
    <div>
      <p className="text-[13.5px] text-[#7d6549] mb-2 px-1">
        {title} <span className="text-[#b89f7c]">({ownedN}/{items.length})</span>
      </p>
      <div className="grid grid-cols-5 gap-2">
        {items.map((it, i) => {
          const n = countOf(it.id);
          const has = n > 0;
          const on = equippedId === it.id;
          return (
            <button
              key={it.id}
              disabled={!has}
              onClick={() => onPick(slot, it.id)}
              title={has ? it.name : '미보유 — 뽑기·상점에서 획득'}
              style={{ '--i': i }}
              className={`stagger pixel-panel relative h-16 grid place-items-center transition-all ${
                on ? 'ring-4 ring-amber-500' : has ? 'lift' : 'opacity-45'
              }`}
            >
              <CountBadge n={n} />
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
  const pets = useGame((s) => s.equippedMatmon());
  const countOf = (id) => user.costumeInv?.[id] ?? 0;

  const color = costumes.colors.find((c) => c.id === user.costume.color)?.hex ?? '#3b82f6';

  return (
    <div className="space-y-4">
      {/* 실시간 미리보기 (아우라 + 동행 맛몬 포함) */}
      <div className="pixel-panel p-5 grid place-items-center relative overflow-hidden">
        <div className="absolute w-40 h-40 rounded-full blur-2xl opacity-25" style={{ background: color }} />
        <DotCharacter
          color={color}
          hatId={user.costume.hat}
          accessoryId={user.costume.accessory}
          auraId={user.costume.aura}
          size={150}
          className="bob relative"
        />
        <p className="mt-2 text-[13.5px] text-[#7d6549] relative">{user.nickname}</p>

        {/* 동행 맛몬 — 꾸미기에서도 함께 보인다 */}
        <div className="mt-3 relative flex items-end justify-center gap-2 min-h-[52px]">
          {pets.length ? (
            pets.map((m) => (
              <div key={m.id} className="flex flex-col items-center gap-0.5">
                <DotMatmon id={m.id} size={44} className="bob" />
                <span className="text-[11px] text-[#96805f] truncate max-w-[56px]">{m.name}</span>
              </div>
            ))
          ) : (
            <span className="text-[12px] text-[#b89f7c] self-center">
              🐣 맛몬 탭에서 동행 맛몬을 골라보세요
            </span>
          )}
        </div>
      </div>

      <Section title="모자" slot="hat" items={costumes.hats} countOf={countOf} equippedId={user.costume.hat} onPick={setCostume}
        render={(it) => (it.id === 'h_none' ? <span className="text-xl opacity-50">🚫</span> : <DotItem slot="hat" id={it.id} size={42} />)} />

      <Section title="옷 색상" slot="color" items={costumes.colors} countOf={countOf} equippedId={user.costume.color} onPick={setCostume}
        render={(it) => <span className="w-9 h-9 border-2 border-[#4a3324]" style={{ background: it.hex }} />} />

      <Section title="악세서리" slot="accessory" items={costumes.accessories} countOf={countOf} equippedId={user.costume.accessory} onPick={setCostume}
        render={(it) => (it.id === 'a_none' ? <span className="text-xl opacity-50">🚫</span> : <DotItem slot="accessory" id={it.id} size={42} />)} />

      <Section title="아우라(효과)" slot="aura" items={costumes.auras ?? []} countOf={countOf} equippedId={user.costume.aura} onPick={setCostume}
        render={(it) => (it.id === 'au_none' ? <span className="text-xl opacity-50">🚫</span> : <DotAura id={it.id} size={34} />)} />
    </div>
  );
}

/* ── 페이지 ──────────────────────────────────────────────────── */
export default function Customize() {
  const [tab, setTab] = useState('character');
  const isAdmin = useGame((s) => s.isAdmin);
  const setAdmin = useGame((s) => s.setAdmin);

  return (
    <div className="p-4 space-y-4 page-in">
      <h1 className="text-lg text-[#3d2c1e] px-1">🎨 꾸미기</h1>

      <div className="grid grid-cols-2 gap-2">
        {[
          { id: 'character', label: '🧍 캐릭터' },
          { id: 'matmon', label: '🐣 맛몬' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pixel-btn py-2.5 text-sm ${tab === t.id ? 'bg-amber-300 text-[#4a3324]' : 'bg-[#f1e3cf] text-[#5d4a35]'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'matmon' ? <MatmonTab /> : <CharacterTab />}

      {/* 개발/운영 도구 */}
      <div className="pixel-panel p-3 space-y-2">
        <p className="text-[12.5px] text-[#96805f]">🛠 개발자 도구</p>
        <label className="flex items-center gap-2 cursor-pointer text-[13.5px]">
          <input type="checkbox" checked={isAdmin} onChange={(e) => setAdmin(e.target.checked)} className="accent-amber-300 w-4 h-4" />
          <span className="text-[#5d4a35]">운영자 모드 — 자유게시판 글 삭제 권한</span>
        </label>
      </div>
    </div>
  );
}

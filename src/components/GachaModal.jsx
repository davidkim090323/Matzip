import { useEffect, useState } from 'react';
import { RARITY } from '../store/gameStore';
import { DotMatmon, DotItem, DotCharacter } from './DotCharacter';
import { useModal } from '../hooks/useModal';

/**
 * 뽑기 연출.
 * phase: 'shaking' → 0.9초 상자 흔들기 → 'revealed' 결과 등장.
 * 희귀도에 따라 후광 색/광선 개수가 달라진다.
 */
export default function GachaModal({ result, onClose }) {
  const [phase, setPhase] = useState('shaking');
  useModal(!!result, onClose);

  useEffect(() => {
    setPhase('shaking');
    const t = setTimeout(() => setPhase('revealed'), 900);
    return () => clearTimeout(t);
  }, [result]);

  if (!result) return null;

  if (result.empty) {
    return (
      <Backdrop onClose={onClose}>
        <div className="pixel-panel p-6 text-center pop-in">
          <p className="text-3xl mb-2">🏅</p>
          <p className="text-sm">
            {result.kind === 'matmon' ? '맛몬' : '아이템'}을 전부 모았습니다!
          </p>
          <p className="text-[13px] text-slate-400 mt-1">뽑기권은 소모되지 않았습니다.</p>
          <button onClick={onClose} className="mt-4 pixel-btn bg-[#2b2050] px-6 py-2 text-sm">
            닫기
          </button>
        </div>
      </Backdrop>
    );
  }

  const item = result.item;
  const rarity = RARITY[item.rarity] ?? RARITY.N;
  const isBig = item.rarity === 'SR' || item.rarity === 'SSR';

  return (
    <Backdrop onClose={phase === 'revealed' ? onClose : undefined}>
      <div className="relative grid place-items-center w-full">
        {/* 희귀도 후광 */}
        {phase === 'revealed' && (
          <div
            className="absolute w-64 h-64 halo pointer-events-none"
            style={{
              background: `conic-gradient(from 0deg, transparent, ${rarity.color}, transparent, ${rarity.color}, transparent)`,
              filter: 'blur(14px)',
            }}
          />
        )}

        <div className="relative pixel-panel px-8 py-7 text-center w-[86%] max-w-[340px] pop-in">
          {phase === 'shaking' ? (
            <>
              <div className="text-6xl shake inline-block">🎁</div>
              <p className="mt-4 text-sm text-amber-300 animate-pulse">두근두근...</p>
            </>
          ) : (
            <>
              <div className="reveal grid place-items-center">
                <Preview result={result} item={item} />
              </div>

              <p
                className="mt-3 inline-block px-3 py-0.5 text-[13px] border-2 border-[#1b1230] text-[#1b1230]"
                style={{ background: rarity.color }}
              >
                {rarity.label}
              </p>
              <p className={`mt-2 text-base ${isBig ? 'flash text-amber-300' : ''}`}>{item.name}</p>
              <p className="text-[13px] text-slate-400 mt-1 min-h-[1.2em]">
                {item.desc ?? slotLabel(item.slot)}
              </p>

              <button
                onClick={onClose}
                className="mt-5 w-full pixel-btn bg-amber-300 text-[#1b1230] py-2.5 text-sm"
              >
                획득!
              </button>
            </>
          )}
        </div>
      </div>
    </Backdrop>
  );
}

const slotLabel = (slot) =>
  ({ hat: '머리 장비', accessory: '악세서리', color: '옷 색상' }[slot] ?? '');

/** 뽑힌 대상 종류에 맞춰 도트 스프라이트를 보여준다 */
function Preview({ result, item }) {
  if (result.kind === 'matmon') return <DotMatmon id={item.id} size={128} />;
  if (item.slot === 'color')
    return <DotCharacter color={item.hex} size={128} hatId="h_none" accessoryId="a_none" />;
  return <DotItem slot={item.slot} id={item.id} size={128} />;
}

function Backdrop({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 grid place-items-center fade-in"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full grid place-items-center">
        {children}
      </div>
    </div>
  );
}

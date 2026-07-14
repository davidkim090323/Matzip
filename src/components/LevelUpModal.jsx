import { useGame } from '../store/gameStore';
import { useModal } from '../hooks/useModal';
import { DotCharacter } from './DotCharacter';

/**
 * 레벨업 / 칭호 해금 축하 모달.
 * 게임에서 가장 큰 보상 순간인데 토스트 한 줄로 흘려보내고 있었다.
 */
export default function LevelUpModal() {
  const levelUp = useGame((s) => s.levelUp);
  const clear = useGame((s) => s.clearLevelUp);
  const user = useGame((s) => s.user);
  const costumes = useGame((s) => s.costumes);
  const equipTitle = useGame((s) => s.equipTitle);

  useModal(!!levelUp, clear);
  if (!levelUp || !user) return null;

  const color = costumes.colors.find((c) => c.id === user.costume.color)?.hex ?? '#3b82f6';

  return (
    <div className="fixed inset-0 z-[70] bg-black/85 grid place-items-center fade-in p-4" onClick={clear}>
      <div
        className="relative w-full max-w-[340px] pixel-panel p-6 text-center pop-in border-amber-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 회전하는 광선 */}
        <div
          className="absolute inset-0 -z-10 halo pointer-events-none"
          style={{
            background:
              'conic-gradient(from 0deg, transparent, #fbbf24, transparent, #fbbf24, transparent)',
            filter: 'blur(20px)',
          }}
        />

        {levelUp.levelUps > 0 && (
          <>
            <p className="text-[13px] text-slate-300">{levelUp.from} 에서</p>
            <p className="text-3xl text-amber-300 font-extrabold mt-1 flash">LEVEL UP!</p>
            <p className="text-lg mt-1">
              Lv.{levelUp.level - levelUp.levelUps} → <span className="text-amber-300">Lv.{levelUp.level}</span>
            </p>
          </>
        )}

        <div className="my-4 grid place-items-center">
          <DotCharacter
            color={color}
            hatId={user.costume.hat}
            accessoryId={user.costume.accessory}
            size={120}
            className="bob"
          />
        </div>

        {levelUp.unlocked?.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-amber-300">🏅 새 칭호 해금!</p>
            {levelUp.unlocked.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  equipTitle(t.id);
                  clear();
                }}
                className="w-full pixel-btn py-2 text-sm text-[#1b1230]"
                style={{ background: t.color }}
              >
                {t.name} — 바로 착용하기
              </button>
            ))}
          </div>
        )}

        <button
          onClick={clear}
          className="mt-4 w-full pixel-btn bg-amber-300 text-[#1b1230] py-2.5 text-sm"
        >
          계속하기
        </button>
      </div>
    </div>
  );
}

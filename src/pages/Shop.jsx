import { useMemo, useState } from 'react';
import { useGame, RARITY, BUY_PRICE, SELL_PRICE, titlePrice } from '../store/gameStore';
import { DotMatmon, DotItem, DotAura } from '../components/DotCharacter';
import GachaModal from '../components/GachaModal';

const rarityRank = { SSR: 0, SR: 1, R: 2, N: 3 };

function RarityTag({ rarity }) {
  const r = RARITY[rarity] ?? RARITY.N;
  return <span className="text-[11px] px-1 border border-[#4a3324] text-[#4a3324]" style={{ background: r.color }}>{r.label}</span>;
}

/** 아이템 아이콘 (맛몬/코스메틱/칭호) */
function Icon({ kind, item, size = 40 }) {
  if (kind === 'matmon') return <DotMatmon id={item.id} size={size} />;
  if (kind === 'title') return <span className="w-6 h-6 inline-block border-2 border-[#4a3324]" style={{ background: item.color }} />;
  if (item.slot === 'color') return <span className="border-2 border-[#4a3324]" style={{ background: item.hex, width: size * 0.7, height: size * 0.7 }} />;
  if (item.slot === 'aura') return <DotAura id={item.id} size={size} />;
  return <DotItem slot={item.slot} id={item.id} size={size} />;
}

/* ── 뽑기 (상점으로 통합) ─────────────────────────────────── */
function GachaTab({ onReveal }) {
  const user = useGame((s) => s.user);
  const draw = useGame((s) => s.draw);
  const ownedMatmon = useGame((s) => s.ownedTypes('matmon'));
  const totalMatmon = useGame((s) => s.poolSize('matmon'));
  const ownedItem = useGame((s) => s.ownedTypes('item'));
  const totalItem = useGame((s) => s.poolSize('item'));
  const [kind, setKind] = useState('matmon');
  const noTicket = user.gachaTickets <= 0;

  return (
    <div className="space-y-3">
      <div className="pixel-panel p-4 flex items-center justify-between">
        <span className="text-[13.5px] text-[#5d4a35]">보유 뽑기권</span>
        <span className="text-2xl text-[#b45309] font-bold">🎟️ {user.gachaTickets}장</span>
      </div>

      <div className="pixel-panel p-4 space-y-3">
        <p className="text-[13.5px] text-[#7d6549] leading-relaxed">
          뽑기권 1장은 <span className="text-[#4a3a29]">맛몬</span> 또는{' '}
          <span className="text-[#4a3a29]">커스터마이징 아이템</span> 중 한 곳에만 쓸 수 있어요.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'matmon', label: '맛몬 뽑기', sub: `도감 ${ownedMatmon}/${totalMatmon}`, icon: '🐣' },
            { id: 'item', label: '아이템 뽑기', sub: `도감 ${ownedItem}/${totalItem}`, icon: '🎩' },
          ].map((k) => (
            <button
              key={k.id}
              onClick={() => setKind(k.id)}
              className={`p-3 border-3 border-[#4a3324] text-left transition-all ${
                kind === k.id ? 'bg-amber-300 text-[#4a3324] scale-[1.02]' : 'bg-[#f7ecdd] text-[#5d4a35] hover:bg-[#f1e3cf]'
              }`}
            >
              <span className="text-xl">{k.icon}</span>
              <p className="text-[14px] mt-1">{k.label}</p>
              <p className="text-[12.5px] opacity-70">{k.sub}</p>
            </button>
          ))}
        </div>

        <button
          disabled={noTicket}
          onClick={() => onReveal(draw(kind))}
          className="w-full pixel-btn bg-gradient-to-r from-amber-300 to-orange-400 text-[#4a3324] py-3 text-sm disabled:opacity-60"
        >
          {noTicket ? '뽑기권 없음 — 맛집을 공략하세요' : `뽑기권 1장 사용 (${kind === 'matmon' ? '맛몬' : '아이템'})`}
        </button>

        <p className="text-[12.5px] text-[#96805f] text-center">
          확률 · N 55% / R 30% / SR 13% / SSR 2% · 중복 획득(판매·조합 재료)
        </p>
      </div>
    </div>
  );
}

/* ── 구매 ─────────────────────────────────────────────────── */
function BuyTab({ onReveal }) {
  const user = useGame((s) => s.user);
  const matmon = useGame((s) => s.matmon);
  const allCostumes = useGame((s) => s.allCostumes());
  const titles = useGame((s) => s.titles);
  const buyItem = useGame((s) => s.buyItem);
  const buyTitle = useGame((s) => s.buyTitle);
  const pushToast = useGame((s) => s.pushToast);
  const [cat, setCat] = useState('matmon');

  const list = useMemo(() => {
    if (cat === 'matmon') return matmon.map((m) => ({ kind: 'matmon', item: m, price: BUY_PRICE[m.rarity] }));
    if (cat === 'title')
      return titles.filter((t) => t.shop).map((t) => ({ kind: 'title', item: t, price: titlePrice(t), owned: user.ownedTitleIds.includes(t.id) }));
    if (cat === 'aura')
      return allCostumes.filter((c) => c.slot === 'aura' && c.id !== 'au_none').map((c) => ({ kind: 'item', item: c, price: BUY_PRICE[c.rarity] }));
    // cosmetic: 모자/악세/색상
    return allCostumes
      .filter((c) => ['hat', 'accessory', 'color'].includes(c.slot) && !c.starter)
      .map((c) => ({ kind: 'item', item: c, price: BUY_PRICE[c.rarity] }));
  }, [cat, matmon, allCostumes, titles, user.ownedTitleIds]);

  list.sort((a, b) => rarityRank[a.item.rarity] - rarityRank[b.item.rarity]);

  const buy = (row) => {
    let res;
    if (row.kind === 'title') res = buyTitle(row.item.id);
    else res = buyItem(row.kind, row.item.id);
    if (res?.error === 'no_coins') return pushToast({ icon: '🪙', title: '코인이 부족해요', body: `${row.price} 코인 필요` });
    if (res?.error === 'owned') return pushToast({ icon: 'ℹ️', title: '이미 보유한 칭호예요' });
    if (res?.ok) {
      if (row.kind === 'title') pushToast({ icon: '🏷️', title: '칭호 구매 완료', body: row.item.name });
      else onReveal({ kind: row.kind, item: res.item, count: res.count });
    }
  };

  const CATS = [
    { id: 'matmon', label: '🐣 맛몬' },
    { id: 'title', label: '🏷️ 칭호' },
    { id: 'aura', label: '✨ 아우라' },
    { id: 'cosmetic', label: '🎩 코스메틱' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={`px-2.5 py-1 text-[12.5px] border-2 border-[#4a3324] whitespace-nowrap ${cat === c.id ? 'bg-amber-300 text-[#4a3324]' : 'bg-[#f7ecdd] text-[#7d6549]'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {list.map((row) => {
          const afford = user.coins >= row.price;
          const owned = row.owned;
          return (
            <div key={row.item.id} className="pixel-panel p-2.5 flex items-center gap-2">
              <div className="w-10 h-10 grid place-items-center shrink-0">
                <Icon kind={row.kind} item={row.item} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] truncate">{row.item.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <RarityTag rarity={row.item.rarity} />
                  <span className="text-[12px] text-[#b45309]">🪙 {row.price}</span>
                </div>
              </div>
              <button
                onClick={() => buy(row)}
                disabled={owned || !afford}
                className={`pixel-btn px-2.5 py-1.5 text-[12px] shrink-0 ${owned ? 'bg-[#f1e3cf] text-[#96805f]' : afford ? 'bg-amber-300 text-[#4a3324]' : 'bg-[#f1e3cf] text-[#b89f7c]'}`}
              >
                {owned ? '보유' : '구매'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 판매 ─────────────────────────────────────────────────── */
function SellTab() {
  const user = useGame((s) => s.user);
  const matmon = useGame((s) => s.matmon);
  const allCostumes = useGame((s) => s.allCostumes());
  const sellItem = useGame((s) => s.sellItem);
  const pushToast = useGame((s) => s.pushToast);

  const rows = useMemo(() => {
    const out = [];
    const mById = Object.fromEntries(matmon.map((m) => [m.id, m]));
    const cById = Object.fromEntries(allCostumes.map((c) => [c.id, c]));
    for (const [id, n] of Object.entries(user.matmonInv ?? {})) {
      const m = mById[id];
      if (m && n > 0) out.push({ kind: 'matmon', item: m, count: n, price: SELL_PRICE[m.rarity] });
    }
    for (const [id, n] of Object.entries(user.costumeInv ?? {})) {
      const c = cById[id];
      if (c && n > 0 && !c.starter && !id.endsWith('_none')) out.push({ kind: 'item', item: c, count: n, price: SELL_PRICE[c.rarity] });
    }
    return out.sort((a, b) => rarityRank[a.item.rarity] - rarityRank[b.item.rarity]);
  }, [user.matmonInv, user.costumeInv, matmon, allCostumes]);

  const sell = (row) => {
    const res = sellItem(row.kind, row.item.id);
    if (res?.ok) pushToast({ icon: '🪙', title: `${row.item.name} 판매`, body: `+${res.price} 코인` });
  };

  if (!rows.length)
    return <p className="text-[13.5px] text-[#96805f] text-center py-10">팔 수 있는 아이템이 없어요. 뽑기로 아이템을 모아보세요!</p>;

  return (
    <div className="space-y-2">
      <p className="text-[12.5px] text-[#96805f] px-1">중복 아이템을 팔아 코인을 모으세요. 착용 중인 마지막 1개를 팔면 자동 해제돼요.</p>
      {rows.map((row) => (
        <div key={row.item.id} className="pixel-panel p-2.5 flex items-center gap-2">
          <div className="w-10 h-10 grid place-items-center shrink-0"><Icon kind={row.kind} item={row.item} /></div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] truncate">{row.item.name} <span className="text-[#7d6549]">×{row.count}</span></p>
            <div className="flex items-center gap-1 mt-0.5"><RarityTag rarity={row.item.rarity} /><span className="text-[12px] text-[#b45309]">개당 🪙 {row.price}</span></div>
          </div>
          <button onClick={() => sell(row)} className="pixel-btn bg-[#f1e3cf] text-[#5d4a35] px-2.5 py-1.5 text-[12px] shrink-0">판매</button>
        </div>
      ))}
    </div>
  );
}

/* ── 조합 (보유 아이템에서 직접 3개 선택) ───────────────────── */
const NEXT_RARITY = { N: 'R', R: 'SR', SR: 'SSR' };

function CraftTab({ onReveal }) {
  const user = useGame((s) => s.user);
  const matmon = useGame((s) => s.matmon);
  const allCostumes = useGame((s) => s.allCostumes());
  const craftSelected = useGame((s) => s.craftSelected);
  const pushToast = useGame((s) => s.pushToast);

  const [kind, setKind] = useState('matmon');
  const [rarity, setRarity] = useState('N');
  const [sel, setSel] = useState([]); // 선택한 id 배열(중복 가능, 최대 3)

  // 카탈로그 + 이 (카테고리,등급) 에서 보유한 아이템 목록
  const { byId, owned } = useMemo(() => {
    const catalog = kind === 'matmon' ? matmon : allCostumes;
    const byId = Object.fromEntries(catalog.map((c) => [c.id, c]));
    const inv = kind === 'matmon' ? user.matmonInv : user.costumeInv;
    const owned = Object.entries(inv ?? {})
      .filter(([id, n]) => n > 0 && byId[id] && byId[id].rarity === rarity && !byId[id].starter && !id.endsWith('_none'))
      .map(([id, n]) => ({ item: byId[id], count: n }));
    return { byId, owned };
  }, [kind, rarity, matmon, allCostumes, user.matmonInv, user.costumeInv]);

  // 카테고리/등급 바꾸면 선택 초기화
  const switchTo = (k, r) => { setKind(k); setRarity(r); setSel([]); };

  const selCountOf = (id) => sel.filter((x) => x === id).length;
  const tapItem = (row) => {
    if (sel.length >= 3) return;
    if (selCountOf(row.item.id) >= row.count) return; // 보유 개수 초과 불가
    setSel([...sel, row.item.id]);
  };

  const doCraft = () => {
    const res = craftSelected(kind, sel);
    if (res?.item) { onReveal(res); setSel([]); }
    else pushToast({ icon: '🔧', title: '조합 실패', body: '재료를 확인해 주세요.' });
  };

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] text-[#96805f] px-1">보유한 것 중 같은 등급 <b>3개</b>를 골라 조합 → 바로 위 등급 1개 랜덤 획득.</p>

      {/* 카테고리 */}
      <div className="grid grid-cols-2 gap-2">
        {[{ id: 'matmon', label: '🐣 맛몬' }, { id: 'item', label: '🎩 코스메틱' }].map((k) => (
          <button key={k.id} onClick={() => switchTo(k.id, rarity)}
            className={`pixel-btn py-2 text-[13px] ${kind === k.id ? 'bg-amber-300 text-[#4a3324]' : 'bg-[#f1e3cf] text-[#5d4a35]'}`}>{k.label}</button>
        ))}
      </div>
      {/* 등급 */}
      <div className="flex gap-1.5">
        {['N', 'R', 'SR'].map((r) => (
          <button key={r} onClick={() => switchTo(kind, r)}
            className={`flex-1 py-1.5 text-[12.5px] border-2 border-[#4a3324] ${rarity === r ? 'bg-sky-400 text-[#4a3324]' : 'bg-[#f7ecdd] text-[#7d6549]'}`}>
            {r} → {NEXT_RARITY[r]}
          </button>
        ))}
      </div>

      {/* 선택 슬롯 */}
      <div className="pixel-panel p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12.5px] text-[#7d6549]">선택 {sel.length}/3</span>
          {sel.length > 0 && <button onClick={() => setSel([])} className="text-[12px] text-[#b45309]">비우기</button>}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => {
            const id = sel[i];
            return (
              <div key={i} className="h-16 border-2 border-dashed border-[#e2cfae] grid place-items-center bg-[#f7ecdd]">
                {id ? <Icon kind={kind} item={byId[id]} size={40} /> : <span className="text-[#c3ad86] text-2xl">+</span>}
              </div>
            );
          })}
        </div>
        <button onClick={doCraft} disabled={sel.length !== 3}
          className={`w-full mt-3 pixel-btn py-2.5 text-sm ${sel.length === 3 ? 'bg-gradient-to-r from-amber-300 to-orange-400 text-[#4a3324]' : 'bg-[#f1e3cf] text-[#b89f7c]'}`}>
          조합하기
        </button>
      </div>

      {/* 보유 목록 (탭해서 선택) */}
      {!owned.length ? (
        <p className="text-[13.5px] text-[#96805f] text-center py-6">이 등급의 보유 아이템이 없어요.</p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {owned.map((row) => {
            const used = selCountOf(row.item.id);
            const remain = row.count - used;
            return (
              <button key={row.item.id} onClick={() => tapItem(row)} disabled={remain <= 0 || sel.length >= 3}
                className={`pixel-panel relative h-16 grid place-items-center transition-all ${remain <= 0 ? 'opacity-40' : 'lift'}`}>
                <span className="absolute -top-2 -left-2 min-w-5 h-5 px-1 grid place-items-center bg-[#4a3324] text-amber-200 border-2 border-amber-500 text-[11px] font-bold">
                  {remain}
                </span>
                <Icon kind={kind} item={row.item} size={40} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── 페이지 ─────────────────────────────────────────────────── */
export default function Shop() {
  const coins = useGame((s) => s.user?.coins ?? 0);
  const tickets = useGame((s) => s.user?.gachaTickets ?? 0);
  const [tab, setTab] = useState('gacha');
  const [reveal, setReveal] = useState(null);

  return (
    <div className="p-4 space-y-4 page-in">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-lg text-[#3d2c1e]">🏪 상점</h1>
        <span className="text-[13.5px] text-[#b45309] font-bold">🎟️ {tickets} · 🪙 {coins.toLocaleString()}</span>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { id: 'gacha', label: '🎁 뽑기' },
          { id: 'buy', label: '🛒 구매' },
          { id: 'sell', label: '💰 판매' },
          { id: 'craft', label: '🔧 조합' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pixel-btn py-2.5 text-[12.5px] ${tab === t.id ? 'bg-amber-300 text-[#4a3324]' : 'bg-[#f1e3cf] text-[#5d4a35]'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'gacha' && <GachaTab onReveal={setReveal} />}
      {tab === 'buy' && <BuyTab onReveal={setReveal} />}
      {tab === 'sell' && <SellTab />}
      {tab === 'craft' && <CraftTab onReveal={setReveal} />}

      <GachaModal result={reveal} onClose={() => setReveal(null)} />
    </div>
  );
}

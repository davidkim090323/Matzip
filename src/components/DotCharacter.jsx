import { memo } from 'react';
import {
  BODY,
  HATS,
  ACCESSORIES,
  ACC_BACK,
  AURAS,
  MATMON_SPRITES,
  FOOD_SPRITES,
  FLAG_TODO,
  FLAG_DONE,
  shade,
} from '../art/sprites';

/** 16x16 도트맵 하나를 <rect> 격자로 그린다 */
function Layer({ rows, palette }) {
  return rows.map((row, y) =>
    row.split('').map((c, x) => {
      const fill = palette[c];
      if (!fill) return null;
      return <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />;
    })
  );
}

/**
 * 플레이어 캐릭터. 본체 + 모자 + 악세서리를 같은 16x16 좌표계에 겹쳐 그린다.
 * 이모지 오버레이를 전부 제거 → 전 부위가 진짜 도트.
 */
/** 캐릭터 뒤에 그리는 아우라(효과). CSS 애니메이션. 자체적으로 크기·위치를 갖는다. */
export const DotAura = memo(function DotAura({ id, size = 96, className = '' }) {
  const aura = AURAS[id];
  if (!aura || aura.style === 'none') return null;
  return (
    <span
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className={`aura aura-${aura.style}`} style={{ '--aura': aura.color }} />
    </span>
  );
});

export const DotCharacter = memo(function DotCharacter({
  color = '#3b82f6',
  hatId,
  accessoryId,
  auraId,
  size = 96,
  className = '',
}) {
  const bodyPalette = { 1: color, 2: shade(color, -50), 3: '#ffd9b3', 4: '#4a3324' };
  const hat = HATS[hatId];
  const acc = ACCESSORIES[accessoryId];
  const aura = AURAS[auraId];
  const hasAura = aura && aura.style !== 'none';

  const svg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={hasAura ? 'relative' : className}
      style={{ imageRendering: 'pixelated' }}
    >
      {/* 몸 뒤에 오는 악세서리(망토·날개)는 본체보다 먼저 */}
      {acc && ACC_BACK[accessoryId] && <Layer rows={acc.rows} palette={acc.palette} />}
      <Layer rows={BODY} palette={bodyPalette} />
      {acc && !ACC_BACK[accessoryId] && <Layer rows={acc.rows} palette={acc.palette} />}
      {hat && <Layer rows={hat.rows} palette={hat.palette} />}
    </svg>
  );

  if (!hasAura) return svg;
  return (
    <span className={`relative inline-grid place-items-center ${className}`} style={{ width: size, height: size }}>
      <span className="absolute inset-0 grid place-items-center">
        <DotAura id={auraId} size={size} />
      </span>
      {svg}
    </span>
  );
});

/** 맛몬 도트 스프라이트 */
export const DotMatmon = memo(function DotMatmon({ id, size = 48, className = '' }) {
  const sprite = MATMON_SPRITES[id];
  if (!sprite) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <Layer rows={sprite.rows} palette={sprite.palette} />
    </svg>
  );
});

/** 도트맵에서 실제로 칠해진 영역의 경계 상자를 구한다 (아이템 아이콘 크롭용) */
function bbox(rows) {
  let minX = 16, minY = 16, maxX = -1, maxY = -1;
  rows.forEach((row, y) =>
    row.split('').forEach((c, x) => {
      if (c === '.') return;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    })
  );
  if (maxX < 0) return { x: 0, y: 0, w: 16, h: 16 };
  const pad = 1;
  const x = Math.max(0, minX - pad);
  const y = Math.max(0, minY - pad);
  const side = Math.max(maxX - x, maxY - y) + 1 + pad; // 정사각 크롭
  return { x, y, w: side, h: side };
}

/** 커스터마이징 아이템 아이콘(모자/악세서리) — 아이템 영역만 잘라서 크게 보여준다 */
export const DotItem = memo(function DotItem({ slot, id, size = 40, className = '' }) {
  if (slot === 'aura') {
    const aura = AURAS[id];
    if (!aura || aura.style === 'none') return <span className={className} style={{ fontSize: size * 0.6 }}>🚫</span>;
    return (
      <span className={`grid place-items-center ${className}`} style={{ width: size, height: size }}>
        <DotAura id={id} size={size * 0.9} />
      </span>
    );
  }
  const src = slot === 'hat' ? HATS[id] : ACCESSORIES[id];
  if (!src) return <span className={className} style={{ fontSize: size * 0.6 }}>🚫</span>;
  const b = bbox(src.rows);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${b.x} ${b.y} ${b.w} ${b.h}`}
      shapeRendering="crispEdges"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <Layer rows={src.rows} palette={src.palette} />
    </svg>
  );
});

/** 맛집 카테고리 아이콘 (한식/중식/…) — 이모지 대신 도트 */
export const DotFood = memo(function DotFood({ category, size = 40, className = '' }) {
  const sprite = FOOD_SPRITES[category];
  if (!sprite) return <span className={className} style={{ fontSize: size * 0.7 }}>🍽️</span>;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      <Layer rows={sprite.rows} palette={sprite.palette} />
    </svg>
  );
});

/** 지도 마커 깃발 */
export const DotFlag = memo(function DotFlag({ conquered, size = 34, className = '' }) {
  const sprite = conquered ? FLAG_DONE : FLAG_TODO;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 12"
      shapeRendering="crispEdges"
      className={className}
      style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 2px 0 rgba(0,0,0,0.55))' }}
    >
      <Layer rows={sprite.rows} palette={sprite.palette} />
    </svg>
  );
});

export default DotCharacter;

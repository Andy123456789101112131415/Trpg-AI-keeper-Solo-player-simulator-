// ═══════════════════════════════════════════════════════════
// 地图引擎：精细网格 · 距离 · 移动 · 视线
// ═══════════════════════════════════════════════════════════

import type { BattleCombatant } from '@/types/cult';

// ── 地图常量 ──
export const MAP_W = 740;           // 地图画布宽度(px)
export const MAP_H = 440;           // 地图画布高度(px)
export const CELL = 8;              // 每格像素(≈2800格), 实现精细移动
export const COLS = Math.floor(MAP_W / CELL);  // 92列
export const ROWS = Math.floor(MAP_H / CELL);  // 55行
export const PX_PER_M = 36;        // 1米=36px (≈1cm:1m)
export const COLLIDE_R = CELL * 2;  // 碰撞检测半径(px)

// ── 坐标转换 ──
/** 网格坐标→画布中心像素 */
export function cellToPx(cx: number, cy: number): { x: number; y: number } {
  return { x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2 };
}
/** 画布像素→最近网格坐标 */
export function pxToCell(px: number, py: number): { cx: number; cy: number } {
  return {
    cx: Math.max(0, Math.min(COLS - 1, Math.floor(px / CELL))),
    cy: Math.max(0, Math.min(ROWS - 1, Math.floor(py / CELL)))
  };
}

// ── 欧几里得距离 ──
export function euclidDist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}
/** 两个战斗单位之间的网格距离(px) */
export function unitDist(a: BattleCombatant, b: BattleCombatant): number {
  const pa = cellToPx(a.gridX, a.gridY);
  const pb = cellToPx(b.gridX, b.gridY);
  return euclidDist(pa.x, pa.y, pb.x, pb.y);
}

// ── 距离格式化 ──
export function fmtDist(px: number): string {
  return (px / PX_PER_M).toFixed(1) + 'm';
}

// ── 武器射程→像素 ──
export function weaponRangePx(range: string): number {
  switch (range) {
    case 'melee':  return PX_PER_M * 1.5;   // ~1.5m (近战触及)
    case 'close':  return PX_PER_M * 5;     // ~5m (霰弹枪有效)
    case 'medium': return PX_PER_M * 15;    // ~15m (手枪)
    case 'long':   return PX_PER_M * 50;    // ~50m (步枪)
    default:       return PX_PER_M * 15;
  }
}

// ── 移动力→像素（COC 7th: MOV=每轮移动米数, 1轮≈6秒）──
export function movToPx(mov: number): number {
  return mov * PX_PER_M;  // MOV 7 = 7米 = 252px (约31格)
}

// ── 检查目标是否在武器射程内 ──
export function isInRange(
  attacker: BattleCombatant,
  target: BattleCombatant,
  weaponRange: string
): boolean {
  const d = unitDist(attacker, target);
  const maxR = weaponRangePx(weaponRange);
  if (weaponRange === 'melee') return d <= PX_PER_M * 1.5;
  return d <= maxR;
}

// ── 检查位置是否被占据 ──
export function isCellOccupied(
  cx: number, cy: number,
  units: BattleCombatant[],
  excludeId?: string
): BattleCombatant | null {
  return units.find(u =>
    u.isAlive &&
    u.instanceId !== excludeId &&
    Math.abs(u.gridX - cx) <= 1 &&
    Math.abs(u.gridY - cy) <= 1
  ) || null;
}

// ── 视线：点(x3,y3)是否在线段(x1,y1)→(x2,y2)上 ──
export function isOnLine(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number
): boolean {
  const d = euclidDist(x1, y1, x2, y2);
  if (d < 1) return false;
  const d1 = euclidDist(x1, y1, x3, y3);
  const d2 = euclidDist(x3, y3, x2, y2);
  return Math.abs(d1 + d2 - d) < CELL * 1.5 && d1 > CELL && d2 > CELL;
}

// ── 移动路径规划 ──
export interface MoveResult {
  valid: boolean;
  targetCx: number;
  targetCy: number;
  distPx: number;
  distM: string;
  blocked: boolean;
  blockedBy?: string;
}
export function planMove(
  actor: BattleCombatant,
  targetCx: number,
  targetCy: number,
  allUnits: BattleCombatant[]
): MoveResult {
  const from = cellToPx(actor.gridX, actor.gridY);
  const to = cellToPx(targetCx, targetCy);
  const distPx = euclidDist(from.x, from.y, to.x, to.y);
  const maxPx = movToPx(actor.mov);

  if (targetCx < 0 || targetCx >= COLS || targetCy < 0 || targetCy >= ROWS) {
    return { valid: false, targetCx, targetCy, distPx, distM: fmtDist(distPx), blocked: false };
  }
  if (distPx > maxPx) {
    return { valid: false, targetCx, targetCy, distPx, distM: fmtDist(distPx), blocked: false };
  }
  const occupant = isCellOccupied(targetCx, targetCy, allUnits, actor.instanceId);
  if (occupant) {
    return { valid: false, targetCx, targetCy, distPx, distM: fmtDist(distPx), blocked: true, blockedBy: occupant.name };
  }
  return { valid: true, targetCx, targetCy, distPx, distM: fmtDist(distPx), blocked: false };
}

// ── 移动执行 ──
export function executeMove(
  actor: BattleCombatant,
  targetCx: number,
  targetCy: number
): Partial<BattleCombatant> {
  return { gridX: targetCx, gridY: targetCy };
}

// ── 初始部署位置（玩家左区，敌方右区）──
export function deployPositions(
  count: number,
  side: 'player' | 'enemy'
): { cx: number; cy: number }[] {
  const positions: { cx: number; cy: number }[] = [];
  const col = side === 'player' ? 8 : COLS - 8;
  const spacing = Math.min(6, Math.floor(ROWS / Math.max(1, count)));
  const startY = Math.floor((ROWS - spacing * (count - 1)) / 2);
  for (let i = 0; i < count; i++) {
    positions.push({ cx: col + (i % 2) * 2, cy: startY + i * spacing });
  }
  return positions;
}

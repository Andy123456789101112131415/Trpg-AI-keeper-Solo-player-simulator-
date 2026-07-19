// ═══════════════════════════════════════════════════════════
// BattleMap — Canvas精细渲染地图组件
// ═══════════════════════════════════════════════════════════

import React, { useRef, useEffect, useCallback } from 'react';
import type { BattleCombatant } from '@/types/cult';
import {
  MAP_W, MAP_H, CELL, COLS, ROWS, PX_PER_M,
  cellToPx, pxToCell, euclidDist, fmtDist, movToPx,
} from '@/utils/mapEngine';

interface BattleMapProps {
  playerUnits: BattleCombatant[];
  enemyUnits: BattleCombatant[];
  summonedUnits: BattleCombatant[];
  currentActor: BattleCombatant | null;
  mapMode: 'normal' | 'move' | 'target';
  targetingMode: { type: string; weapon?: any; spell?: any } | null;
  hoverPos: { x: number; y: number } | null;
  onHover: (pos: { x: number; y: number } | null) => void;
  onClick: (cx: number, cy: number) => void;
  onTargetClick: (unit: BattleCombatant) => void;
  summonBerserkRef?: React.MutableRefObject<Set<string>>;
}

const BattleMap: React.FC<BattleMapProps> = ({
  playerUnits, enemyUnits, summonedUnits,
  currentActor, mapMode, targetingMode, hoverPos,
  onHover, onClick, onTargetClick,
  summonBerserkRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const allUnits = [...playerUnits, ...enemyUnits, ...summonedUnits];

  // ── 绘制函数 ──
  const draw = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    cvs.width = MAP_W * dpr;
    cvs.height = MAP_H * dpr;
    cvs.style.width = MAP_W + 'px';
    cvs.style.height = MAP_H + 'px';
    ctx.scale(dpr, dpr);

    // 背景
    const bg = ctx.createRadialGradient(MAP_W/2, MAP_H/2, 0, MAP_W/2, MAP_H/2, MAP_W*0.7);
    bg.addColorStop(0, '#1a1a24');
    bg.addColorStop(1, '#0c0c10');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    // 极淡的网格参考点（千级格子，仅关键点可见）
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let cx = 0; cx < COLS; cx += 8) {
      for (let cy = 0; cy < ROWS; cy += 8) {
        const p = cellToPx(cx, cy);
        ctx.fillRect(p.x - 0.5, p.y - 0.5, 1, 1);
      }
    }

    // ── 移动线（最顶层）──
    if (mapMode === 'move' && currentActor?.side === 'player' && hoverPos) {
      const from = cellToPx(currentActor.gridX, currentActor.gridY);
      // hoverPos是鼠标像素，需要换算
      const distPx = euclidDist(from.x, from.y, hoverPos.x, hoverPos.y);
      const maxPx = movToPx(currentActor.mov);
      const valid = distPx <= maxPx;

      ctx.save();
      ctx.strokeStyle = valid ? '#3a8' : '#c0392b';
      ctx.lineWidth = 2.5;
      if (!valid) ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(hoverPos.x, hoverPos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // 终点圆
      ctx.fillStyle = valid ? '#3a8' : '#c0392b';
      ctx.beginPath();
      ctx.arc(hoverPos.x, hoverPos.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // 距离文字
      ctx.fillStyle = valid ? '#3a8' : '#c0392b';
      ctx.font = 'bold 10px "Noto Sans SC"';
      ctx.textAlign = 'center';
      ctx.fillText(
        fmtDist(distPx) + (valid ? '' : ' / ' + fmtDist(maxPx)),
        (from.x + hoverPos.x) / 2,
        (from.y + hoverPos.y) / 2 - 6
      );
      ctx.restore();
    }

    // ── AOE效果圈（暗紫色半透明）──
    allUnits.forEach(unit => {
      if (!unit.isAlive) return;
      const hasAOE = unit.effects.some(e => e.id === 'silent_field' || e.id === 'veil_dark');
      if (!hasAOE) return;
      const p = cellToPx(unit.gridX, unit.gridY);
      const isSilent = unit.effects.some(e => e.id === 'silent_field');
      const radius = isSilent ? PX_PER_M * 15 : PX_PER_M * 3; // 15m / 10英尺≈3m
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(100,40,160,0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(140,60,200,0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    });

    // ── 绘制单位 ──
    allUnits.forEach(unit => {
      if (!unit.isAlive) return;
      const p = cellToPx(unit.gridX, unit.gridY);
      const isActive = unit.instanceId === currentActor?.instanceId;
      const isPlayer = unit.side === 'player';
      const isSummon = unit.type === 'summon';
      const r = 16;

      // 光环
      if (isActive) {
        ctx.save();
        const glowColor = isSummon ? 'rgba(136,68,204,0.35)' : isPlayer ? 'rgba(200,168,78,0.3)' : 'rgba(200,57,43,0.3)';
        const glow = ctx.createRadialGradient(p.x, p.y, r-4, p.x, p.y, r+8);
        glow.addColorStop(0, glowColor);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r+8, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      }

      // 头像圆
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      const fillColor = isSummon ? 'rgba(136,68,204,0.15)' : isPlayer ? 'rgba(200,168,78,0.15)' : 'rgba(200,57,43,0.15)';
      ctx.fillStyle = fillColor;
      ctx.fill();
      const strokeColor = isActive
        ? (isSummon ? '#8844cc' : isPlayer ? '#c8a84e' : '#c0392b')
        : (isSummon ? 'rgba(136,68,204,0.5)' : isPlayer ? 'rgba(200,168,78,0.5)' : 'rgba(200,57,43,0.5)');
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = isActive ? 2.5 : 1.5;
      ctx.stroke();

      // 图标
      ctx.fillStyle = '#e8e8ec';
      ctx.font = '15px "Noto Sans SC"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(unit.icon, p.x, p.y);

      // 名字（仅名字，简洁）
      const nameY = p.y + r + 10;
      ctx.fillStyle = isSummon ? '#b388ff' : '#e8e8ec';
      ctx.font = 'bold 8px "Noto Sans SC"';
      ctx.textAlign = 'center';
      const displayName = unit.name.length > 6 ? unit.name.slice(0, 5) + '…' : unit.name;
      ctx.fillText(displayName, p.x, nameY);

      // 狂暴标记
      if (isSummon && summonBerserkRef?.current?.has(unit.instanceId)) {
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 10px "Noto Sans SC"';
        ctx.fillText('😈', p.x, nameY + 11);
      }

      // 瞄准模式高亮
      if (targetingMode && unit.side === 'enemy') {
        ctx.save();
        ctx.strokeStyle = '#c8a84e';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r+5, 0, Math.PI*2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    });

    // 提示文字
    ctx.textAlign = 'center';
    if (targetingMode) {
      ctx.fillStyle = 'rgba(200,168,78,0.9)';
      ctx.font = 'bold 11px "Noto Serif SC"';
      ctx.fillText('🎯 点击敌方角色选择目标', MAP_W/2, 18);
    } else if (mapMode === 'move') {
      ctx.fillStyle = 'rgba(50,170,136,0.9)';
      ctx.font = 'bold 11px "Noto Serif SC"';
      ctx.fillText('🏃 点击地图移动角色（绿线=可移 红线=超出）', MAP_W/2, 18);
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [playerUnits, enemyUnits, summonedUnits, currentActor, mapMode, targetingMode, hoverPos]);

  // ── 启动/停止渲染循环 ──
  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  // ── 鼠标事件 ──
  const handleMouse = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    if (mapMode === 'move') {
      onHover({ x: px, y: py });
    }
  }, [mapMode, onHover]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const { cx, cy } = pxToCell(px, py);

    // 检查是否点击了单位
    const clickedUnit = allUnits.find(u => {
      if (!u.isAlive) return false;
      const up = cellToPx(u.gridX, u.gridY);
      return euclidDist(px, py, up.x, up.y) < 20;
    });

    if (clickedUnit && targetingMode && clickedUnit.side === 'enemy') {
      onTargetClick(clickedUnit);
      return;
    }

    if (mapMode === 'move') {
      onClick(cx, cy);
    }
  }, [mapMode, targetingMode, allUnits, onTargetClick, onClick]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-lg cursor-crosshair"
      style={{ width: MAP_W, height: MAP_H }}
      onMouseMove={handleMouse}
      onMouseLeave={() => onHover(null)}
      onClick={handleClick}
      onContextMenu={(e) => { e.preventDefault(); handleClick(e as any); }}
    />
  );
};

export default React.memo(BattleMap);

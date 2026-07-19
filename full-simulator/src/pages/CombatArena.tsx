// ═══════════════════════════════════════════════════════════
// 千面之门 · 战斗竞技场 (干净重写版)
// ═══════════════════════════════════════════════════════════

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Swords, Shield, Sparkles, RotateCcw, Target } from 'lucide-react';
import { SEVEN_RINGS, getRingColor, getRingIcon } from '@/data/cult/rings';
import { BESTIARY, getCreatureById } from '@/data/bestiary';
import { getSpellById } from '@/data/spells';
import {
  createPontiff, createGoldenMask, createSilentTongue,
  createOpenEye, createKeyholder, createMaskedOne, createUnwearer
} from '@/data/cult/templates';
import {
  createBattleCombatant, executeAttack, executeSpell,
  executeDefend, executeWait, enemyAIDecision,
  getAliveTargets, sortByDex, isBattleOver, canAct, getEffectiveAttributes,
  calcMaskResonance, calcForbiddenResonance, calcChaosVeil, findPontiff
} from '@/utils/cocCombat';
import { skillCheck, rollDamage } from '@/utils/dice';
import {
  CELL, PX_PER_M, cellToPx, unitDist, weaponRangePx, movToPx,
  isInRange, deployPositions, fmtDist
} from '@/utils/mapEngine';
import {
  getBoonsForCombatant, getBoonById,
  type CombatBoon, type BoonResult
} from '@/utils/combatBoons';
import BattleMap from '@/components/combat/BattleMap';
import type { CultMember, BattleCombatant, CombatLogEntry, SpellDefinition } from '@/types/cult';
import type { WeaponDefinition } from '@/types/cult';

// ═══════════════════════════════════════════════════════════
export default function CombatArena() {
  const [phase, setPhase] = useState<'deploy' | 'combat' | 'victory' | 'defeat'>('deploy');

  const ringTemplates = React.useMemo(() => {
    const creators: Record<number, () => CultMember> = {
      7: createUnwearer, 6: createMaskedOne, 5: createKeyholder,
      4: createOpenEye, 3: createSilentTongue, 2: createGoldenMask, 1: createPontiff,
    };
    return SEVEN_RINGS.map(ring => ({ ring, sample: creators[ring.level]?.() ?? null }));
  }, []);

  const [playerQuantities, setPlayerQuantities] = useState<Map<number, number>>(new Map());
  const [enemyQuantities, setEnemyQuantities] = useState<Map<string, number>>(new Map([['deep_one', 1], ['dark_young', 1]]));
  const totalPQ = [...playerQuantities.values()].reduce((s, n) => s + n, 0);
  const totalEQ = [...enemyQuantities.values()].reduce((s, n) => s + n, 0);

  const [playerUnits, setPlayerUnits] = useState<BattleCombatant[]>([]);
  const [enemyUnits, setEnemyUnits] = useState<BattleCombatant[]>([]);
  const [summonedUnits, setSummonedUnits] = useState<BattleCombatant[]>([]);
  const [initOrder, setInitOrder] = useState<string[]>([]);
  const [curIdx, setCurIdx] = useState(0);
  const [round, setRound] = useState(1);
  const [log, setLog] = useState<CombatLogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [diceOverlay, setDiceOverlay] = useState<{ roll: number; label: string; result: string } | null>(null);
  const [mapMode, setMapMode] = useState<'normal' | 'move' | 'target'>('normal');
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [targetingMode, setTargetingMode] = useState<{ type: 'attack' | 'spell'; weapon?: any; spell?: any } | null>(null);
  const [enhChoice, setEnhChoice] = useState<{ actorId: string; tier: number | string; mpCost: number; sanCost: number } | null>(null);
  const [enhSelected, setEnhSelected] = useState<Set<string>>(new Set());

  const logRef = useRef<HTMLDivElement>(null);
  // 实时引用：解决React闭包陈旧问题，所有战斗函数通过ref读取最新状态
  const unitsRef = useRef<{ playerUnits: BattleCombatant[]; enemyUnits: BattleCombatant[]; summonedUnits: BattleCombatant[] }>({ playerUnits: [], enemyUnits: [], summonedUnits: [] });
  unitsRef.current = { playerUnits, enemyUnits, summonedUnits };
  const totalEnemiesRef = useRef(0);
  const totalPlayersRef = useRef(0);
  const enemyKillsRef = useRef(0);
  const playerKillsRef = useRef(0);
  // 召唤物狂暴标记（战斗中15%概率触发）
  const summonBerserkRef = useRef<Set<string>>(new Set());
  // 威胁追踪：playerId -> enemyId -> 累计伤害
  const threatRef = useRef<Map<string, Map<string, number>>>(new Map());
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

  const showDice = useCallback(async (roll: number, label: string, result: string, dur = 1200) => {
    setDiceOverlay({ roll, label, result }); await new Promise(r => setTimeout(r, dur)); setDiceOverlay(null);
  }, []);
  const addLog = useCallback((e: CombatLogEntry) => setLog(p => [...p, e]), []);

  // 威胁记录：player攻击enemy后累计伤害
  const recordThreat = (attackerId: string, targetId: string, dmg: number) => {
    if (!threatRef.current.has(targetId)) threatRef.current.set(targetId, new Map());
    threatRef.current.get(targetId)!.set(attackerId, (threatRef.current.get(targetId)!.get(attackerId) || 0) + dmg);
  };

  const adjustPQ = (ring: number, d: number) => setPlayerQuantities(prev => {
    const n = new Map(prev); const v = Math.max(0, Math.min(9, (n.get(ring) || 0) + d));
    v === 0 ? n.delete(ring) : n.set(ring, v); return n;
  });
  const adjustEQ = (id: string, d: number) => setEnemyQuantities(prev => {
    const n = new Map(prev); const v = Math.max(0, Math.min(9, (n.get(id) || 0) + d));
    v === 0 ? n.delete(id) : n.set(id, v); return n;
  });

  const getActor = useCallback((): BattleCombatant | null => {
    const all = [...playerUnits, ...enemyUnits, ...summonedUnits].filter(u => u.isAlive);
    if (all.length === 0) return null;
    return sortByDex(all)[curIdx % all.length] || null;
  }, [playerUnits, enemyUnits, summonedUnits, curIdx]);

  const checkEnd = useCallback(() => {
    // 使用ref实时读取，避免闭包陈旧
    const pu = unitsRef.current.playerUnits.filter(u => u.isAlive);
    const eu = unitsRef.current.enemyUnits.filter(u => u.isAlive);
    if (pu.length === 0) { setPhase('defeat'); addLog({ id: 'end', timestamp: Date.now(), round, actorName: '系统', actorSide: 'player', action: 'info', detail: '💀 团灭...', result: 'death' }); return 'defeat'; }
    if (eu.length === 0) { setPhase('victory'); addLog({ id: 'end', timestamp: Date.now(), round, actorName: '系统', actorSide: 'player', action: 'info', detail: '🏆 胜利！所有敌人已被消灭！', result: 'kill' }); return 'victory'; }
    return null;
  }, [round, addLog]);

  // 不朽面具·战场：教宗首次死亡时复活，第二次死亡替代最低环成员
  const tryRevive = useCallback((unit: BattleCombatant): Partial<BattleCombatant> | null => {
    const cthulhuMythos = unit.skills['克苏鲁神话'] || 0;
    if (cthulhuMythos < 40) return null;
    if (!unit.hasRevived) {
      const reviveHP = Math.floor(unit.maxHP * 0.5);
      addLog({ id: 'revive', timestamp: Date.now(), round, actorName: unit.name, actorSide: 'player', action: 'spell', detail: `💀✨ ${unit.name}的不朽面具触发！混沌溃散后重组，回复${reviveHP}HP，获得1回合无敌！`, result: 'spell' });
      return { currentHP: reviveHP, isAlive: true, hasRevived: true, effects: [...unit.effects, { id: 'immortal', name: '不朽', duration: 1, statModifiers: {}, description: '无敌' }] };
    }
    // 第二次死亡：替代最低环存活成员
    const lowest = [...unitsRef.current.playerUnits].filter(u => u.isAlive && u.ringLevel >= 7).sort((a, b) => b.ringLevel - a.ringLevel)[0];
    if (lowest) {
      addLog({ id: 'revive2', timestamp: Date.now(), round, actorName: unit.name, actorSide: 'player', action: 'spell', detail: `💀🔄 ${unit.name}的不朽面具第二次触发！意识转移到${lowest.name}体内，${lowest.name}的人格被覆盖...`, result: 'spell' });
      // 替换最低环成员：将教宗属性复制，但保留被替代者的位置
      setPlayerUnits(p => p.map(u => {
        if (u.instanceId === lowest.instanceId) {
          return { ...unit, instanceId: lowest.instanceId, name: lowest.name + '(教宗附体)', gridX: lowest.gridX, gridY: lowest.gridY, currentHP: unit.maxHP, isAlive: true, hasRevived: true };
        }
        if (u.instanceId === unit.instanceId) return { ...u, isAlive: false };
        return u;
      }));
      return null; // 不应用默认的死亡状态，因为已经手动处理
    }
    return null;
  }, [round, addLog]);

  const advanceTurn = useCallback(async () => {
    if (checkEnd()) return;
    const all = [...playerUnits, ...enemyUnits, ...summonedUnits].filter(u => u.isAlive);
    const ni = (curIdx + 1) % Math.max(1, all.length);
    const isNewRound = ni === 0;
    setCurIdx(ni); if (isNewRound) setRound(r => r + 1);
    // 新回合：重置标记 + 递减效果（只在真正的新回合开始时，不在每次切人时）
    const tickEffects = (effs: any[]) => isNewRound ? effs.map(e => ({ ...e, duration: e.duration - 1 })).filter((e: any) => e.duration > 0) : effs;
    const resetRoundFlags = (u: BattleCombatant) => ({
      ...u, isDefending: false,
      dodgedThisRound: isNewRound ? false : u.dodgedThisRound,
      actionUsed: isNewRound ? false : u.actionUsed,
      moveUsed: isNewRound ? false : u.moveUsed,
    });
    // 召唤物时效处理（仅新回合递减）
    if (isNewRound) {
      setSummonedUnits(p => {
        const updated = p.map(u => ({ ...u, effects: tickEffects(u.effects) }));
        const expired = updated.filter(u => !u.effects.some(e => e.id === 'temp_exist'));
        const alive = updated.filter(u => u.effects.some(e => e.id === 'temp_exist'));
        if (expired.length > 0) expired.forEach(u => { addLog({ id: 'exp', timestamp: Date.now(), round, actorName: u.name, actorSide: 'player', action: 'info', detail: `💨 ${u.name} 存在时间耗尽，混沌物质消散...`, result: 'death' }); });
        return alive;
      });
    }
    setPlayerUnits(p => p.map(u => ({ ...resetRoundFlags(u), effects: tickEffects(u.effects) })));
    setEnemyUnits(p => p.map(u => ({ ...resetRoundFlags(u), effects: tickEffects(u.effects) })));
    setSummonedUnits(p => p.map(u => ({ ...resetRoundFlags(u) })));
  }, [curIdx, playerUnits, enemyUnits, summonedUnits, checkEnd, round, addLog]);

  // ═══ 开始战斗 ═══
  const startBattle = useCallback(() => {
    const gens: Record<number, () => CultMember> = { 7: createUnwearer, 6: createMaskedOne, 5: createKeyholder, 4: createOpenEye, 3: createSilentTongue, 2: createGoldenMask, 1: createPontiff };
    const players: BattleCombatant[] = [];
    playerQuantities.forEach((qty, ring) => {
      const g = gens[ring]; if (!g) return;
      const rd = SEVEN_RINGS.find(r => r.level === ring);
      for (let i = 0; i < qty; i++) { const m = g(); m.name = rd ? (rd.name + (qty > 1 ? '#' + (i + 1) : '')) : m.name; players.push(createBattleCombatant(m, 'player')); }
    });
    const enemies: BattleCombatant[] = [];
    enemyQuantities.forEach((qty, id) => {
      const c = getCreatureById(id); if (!c) return;
      for (let i = 0; i < qty; i++) enemies.push(createBattleCombatant(c, 'enemy'));
    });
    if (players.length === 0 || enemies.length === 0) return;
    const pp = deployPositions(players.length, 'player');
    const ep = deployPositions(enemies.length, 'enemy');
    players.forEach((p, i) => { p.gridX = pp[i]?.cx ?? 8; p.gridY = pp[i]?.cy ?? 27; });
    enemies.forEach((e, i) => { e.gridX = ep[i]?.cx ?? 84; e.gridY = ep[i]?.cy ?? 27; });
    const sorted = sortByDex([...players, ...enemies]);
    setPlayerUnits(players); setEnemyUnits(enemies); setSummonedUnits([]);
    totalPlayersRef.current = players.length;
    // 千面之心被动：自动激活寂静领域+暗夜之纱
    players.forEach(p => {
      if (p.ringLevel === 1) {
        p.effects.push({ id: 'silent_field', name: '寂静领域', duration: 999, statModifiers: {}, description: '15m沉默区(被动)' });
        p.effects.push({ id: 'veil_dark', name: '暗夜之纱', duration: 999, statModifiers: {}, description: '10英尺黑暗(被动)' });
        addLog({ id: 'pPassive', timestamp: Date.now(), round: 1, actorName: p.name, actorSide: 'player', action: 'spell', detail: `🌑 ${p.name}的寂静领域与暗夜之纱被动激活！`, result: 'spell' });
      }
    });
    totalPlayersRef.current = players.length;
    totalEnemiesRef.current = enemies.length;
    enemyKillsRef.current = 0;
    playerKillsRef.current = 0;
    summonBerserkRef.current = new Set();
    threatRef.current = new Map();
    // ── 一次性被动计算 ──
    // 面具共鸣：黄金面具从睁眼者获得加成
    players.forEach(p => {
      if (p.ringLevel === 2) {
        const underlings = players.filter(a => a.ringLevel === 4);
        const bonus = underlings.length;
        if (bonus > 0) {
          p.armor += bonus;
          p.skills['闪避'] = (p.skills['闪避'] || 0) + bonus * 5;
        }
      }
      // 高级面具共鸣：千面之心从持钥人获得加成
      if (p.ringLevel === 1) {
        const underlings = players.filter(a => a.ringLevel === 5);
        const bonus = underlings.length;
        if (bonus > 0) {
          p.armor += bonus;
          p.skills['闪避'] = (p.skills['闪避'] || 0) + bonus * 5;
        }
      }
    });
    setInitOrder(sorted.map(u => u.instanceId)); setCurIdx(0); setRound(1);
    setLog([{ id: 'start', timestamp: Date.now(), round: 1, actorName: '系统', actorSide: 'player', action: 'info', detail: `⚔ 战斗开始！先攻: ${sorted.map(u => u.name + '(' + u.enhancedAttributes.DEX + ')').join(' → ')}`, result: 'info' }]);
    setPhase('combat');
  }, [playerQuantities, enemyQuantities]);

  // ═══ 玩家行动 ═══
  // 无需选择目标的法术（自身/召唤/AoE）
  const isSelfTargetSpell = (spell: SpellDefinition) =>
    ['summon_chaos_spawn', 'veil_of_dark', 'avatar_black_pharaoh'].includes(spell.combatEffect);

  const playerAttack = useCallback(async (weapon: WeaponDefinition & { currentAmmo?: number }, tgt?: BattleCombatant) => {
    const actor = getActor(); if (!actor || actor.side !== 'player' || isProcessing) return;
    const ea = getAliveTargets(enemyUnits); if (ea.length === 0) return;
    const target = tgt || ea[0]; if (!target?.isAlive) return;
    setTargetingMode(null); setIsProcessing(true);
    const dp = unitDist(actor, target), mp = weaponRangePx(weapon.range);
    if (dp > mp || (weapon.range === 'melee' && dp > PX_PER_M * 1.5)) { addLog({ id: 'oor', timestamp: Date.now(), round, actorName: actor.name, actorSide: 'player', action: 'info', detail: `超出射程(${fmtDist(dp)}/${fmtDist(mp)})`, result: 'miss' }); setIsProcessing(false); return; }
    const check = skillCheck(actor.skills[weapon.skill] || 50, 'regular');
    await showDice(check.roll, `${weapon.name} (需≤${check.target})`, check.level);
    const result = executeAttack(actor, target, weapon, round, check);
    addLog(result.log);
    if (result.damageDealt > 0) recordThreat(actor.instanceId, target.instanceId, result.damageDealt);
    if (result.attackerNewState) setPlayerUnits(p => p.map(u => u.instanceId === actor.instanceId ? { ...u, ...result.attackerNewState } : u));
    if (result.defenderNewState) setEnemyUnits(p => p.map(u => u.instanceId === target.instanceId ? { ...u, ...result.defenderNewState } : u));
    // 总是显示闪避信息（成功或失败）
    if (result.dodgeInfo) await showDice(result.dodgeInfo.roll, `闪避 → ${result.dodgeInfo.success ? (result.dodgeInfo.level === 'critical' ? '✨大成功' : result.dodgeInfo.level === 'extreme' ? '极难' : result.dodgeInfo.level === 'hard' ? '困难' : '普通') : '失败'}${result.dodgeInfo.wasDefending ? ' [防御]' : ''}`, result.dodgeInfo.success ? result.dodgeInfo.level : 'fail', 1400);
    if (result.abilityTrigger) await showDice(result.abilityTrigger.roll, `${result.abilityTrigger.name}: ${result.abilityTrigger.checkType}检定`, result.abilityTrigger.success ? 'regular' : 'fail', 900);
    // 流弹
    if (result.log.result === 'miss' && weapon.category === 'firearm' && check.level !== 'fumble') {
      const ap = cellToPx(actor.gridX, actor.gridY), tp = cellToPx(target.gridX, target.gridY);
      const ally = playerUnits.find(a => a.isAlive && a.instanceId !== actor.instanceId && (() => { const pp = cellToPx(a.gridX, a.gridY); const d = Math.hypot(tp.x - ap.x, tp.y - ap.y); const d1 = Math.hypot(pp.x - ap.x, pp.y - ap.y); const d2 = Math.hypot(tp.x - pp.x, tp.y - pp.y); return Math.abs(d1 + d2 - d) < PX_PER_M && d1 > PX_PER_M * 0.3 && d2 > PX_PER_M * 0.3; })());
      if (ally && Math.random() < 0.3) {
        const sd = Math.max(1, rollDamage(weapon.damage) - ally.armor), nh = Math.max(0, ally.currentHP - sd);
        addLog({ id: 'ff', timestamp: Date.now(), round, actorName: ally.name, actorSide: 'player', action: 'info', detail: `💥流弹误伤！${ally.name} 受${sd}伤害`, result: 'hit' });
        setPlayerUnits(p => p.map(u => u.instanceId === ally.instanceId ? { ...u, currentHP: nh, isAlive: nh > 0 } : u));
      }
    }
    if (result.killed) { addLog({ id: 'k', timestamp: Date.now(), round, actorName: target.name, actorSide: 'enemy', action: 'info', detail: `💀 ${target.name} 被击杀！`, result: 'kill' });
      enemyKillsRef.current++;
      if (enemyKillsRef.current >= totalEnemiesRef.current) { setPhase('victory'); addLog({ id: 'end', timestamp: Date.now(), round, actorName: '系统', actorSide: 'player', action: 'info', detail: '🏆 胜利！所有敌人已被消灭！', result: 'kill' }); setIsProcessing(false); return; }
    }
    // 标记动作已使用，移动后则结束回合
    setPlayerUnits(p => p.map(u => u.instanceId === actor.instanceId ? { ...u, actionUsed: true } : u));
    setIsProcessing(false);
    if (actor.moveUsed) await advanceTurn();
  }, [getActor, enemyUnits, round, addLog, showDice, advanceTurn, isProcessing, playerUnits]);

  const playerCastSpell = useCallback(async (spell: SpellDefinition, tgt?: BattleCombatant) => {
    const actor = getActor(); if (!actor || actor.side !== 'player' || isProcessing) return;
    const isSummon = spell.combatEffect === 'summon_chaos_spawn';
    const isSelf = isSelfTargetSpell(spell);
    const ea = getAliveTargets(enemyUnits);
    // 自身/召唤法术不需要敌方目标
    if (!isSelf && !isSummon && ea.length === 0) return;
    // 自身法术：目标=施法者自己；召唤法术：无目标
    const target = isSelf ? actor : (tgt || ea[0] || actor);
    setTargetingMode(null); setIsProcessing(true);
    const cs = actor.baseAttributes[spell.skillUsed as keyof typeof actor.baseAttributes] || 50;
    const check = skillCheck(cs, spell.castingDifficulty);
    await showDice(check.roll, `${spell.name} (需≤${check.target})`, check.level);
    const result = executeSpell(actor, target, spell, round, check);
    // 禁术共鸣：四环法术MP/SAN减半
    const resonance = calcForbiddenResonance(actor, spell.tier);
    if (resonance.mpFactor < 1 || resonance.sanFactor < 1) {
      const refundMP = Math.floor(spell.mpCost * (1 - resonance.mpFactor));
      if (refundMP > 0 && result.attackerNewState.currentMP !== undefined) {
        result.attackerNewState.currentMP = (result.attackerNewState.currentMP || 0) + refundMP;
      }
      result.log.detail += ` [禁术共鸣: MP/SAN减半]`;
    }
    // 千面之心：所有法术仅需1MP
    if (actor.ringLevel === 1 && spell.mpCost > 1) {
      const refund = spell.mpCost - 1;
      result.attackerNewState.currentMP = (result.attackerNewState.currentMP || 0) + refund;
      result.log.detail += ` [教宗权柄: 仅消耗1MP]`;
    }
    addLog(result.log);
    setPlayerUnits(p => p.map(u => u.instanceId === actor.instanceId ? { ...u, ...result.attackerNewState } : u));
    if (result.defenderNewState) setEnemyUnits(p => p.map(u => u.instanceId === target.instanceId ? { ...u, ...result.defenderNewState } : u));
    if ((result.attackerNewState as any)?.summonedUnit) {
      const su = (result.attackerNewState as any).summonedUnit as BattleCombatant;
      setSummonedUnits(p => [...p, su]); setInitOrder(p => [...p, su.instanceId]);
      addLog({ id: 'sum', timestamp: Date.now(), round, actorName: su.name, actorSide: 'player', action: 'spell', detail: `🌀 ${su.name} 加入战斗！`, result: 'spell' });
    }
    // 标记动作已使用
    setPlayerUnits(p => p.map(u => u.instanceId === actor.instanceId ? { ...u, actionUsed: true } : u));
    setIsProcessing(false);
    if (actor.moveUsed) await advanceTurn();
  }, [getActor, enemyUnits, round, addLog, showDice, advanceTurn, isProcessing, checkEnd]);

  // ═══ 恩赐使用 ═══
  const playerUseBoon = useCallback(async (boon: CombatBoon, tgt?: BattleCombatant) => {
    const actor = getActor(); if (!actor || actor.side !== 'player' || isProcessing || actor.actionUsed) return;
    // 检查冷却
    if ((actor.cooldowns[boon.id] || 0) > round) { addLog({ id: 'cd', timestamp: Date.now(), round, actorName: actor.name, actorSide: 'player', action: 'info', detail: `${boon.name}冷却中(${actor.cooldowns[boon.id] - round}轮后可用)`, result: 'miss' }); return; }
    // 检查使用次数
    if (boon.maxUses && (actor.boonUsage[boon.id] || 0) >= boon.maxUses) { addLog({ id: 'mu', timestamp: Date.now(), round, actorName: actor.name, actorSide: 'player', action: 'info', detail: `${boon.name}本场战斗已用尽`, result: 'miss' }); return; }
    // 检查MP（千面之心仅1MP）
    const effMpCost = actor.ringLevel === 1 ? 1 : boon.mpCost;
    if (actor.currentMP < effMpCost) { addLog({ id: 'nmp', timestamp: Date.now(), round, actorName: actor.name, actorSide: 'player', action: 'info', detail: `MP不足(${effMpCost})无法使用${boon.name}`, result: 'miss' }); return; }
    // 需要目标但未选择
    if (boon.targetType === 'enemy' || boon.targetType === 'ally') {
      const ea = getAliveTargets(enemyUnits);
      const ta = boon.targetType === 'enemy' ? ea : getAliveTargets(playerUnits);
      if (ta.length === 0) return;
      if (!tgt) { setTargetingMode({ type: 'spell', spell: boon }); return; }
      setTargetingMode(null);
    }
    setIsProcessing(true);
    const target = tgt || actor;
    const allEnemies = unitsRef.current.enemyUnits.filter(u => u.isAlive);
    const result: BoonResult = boon.execute(actor, target, round, allEnemies);
    addLog(result.log);
    if (result.diceRoll) await showDice(result.diceRoll.roll, `${boon.name} (需≤${result.diceRoll.target})`, result.diceRoll.success ? result.diceRoll.level : 'fail');
    // 应用状态变更（千面之心所有技能仅1MP）
    const mpCost = actor.ringLevel === 1 ? 1 : boon.mpCost;
    const newCooldowns = { ...actor.cooldowns, [boon.id]: round + boon.cooldown };
    const newUsage = boon.maxUses ? { ...actor.boonUsage, [boon.id]: (actor.boonUsage[boon.id] || 0) + 1 } : actor.boonUsage;
    setPlayerUnits(p => p.map(u => u.instanceId === actor.instanceId ? { ...u, ...result.casterChanges, currentMP: u.currentMP - mpCost, cooldowns: newCooldowns, boonUsage: newUsage, actionUsed: true } : u));
    if (result.targetChanges) setEnemyUnits(p => p.map(u => u.instanceId === target.instanceId ? { ...u, ...result.targetChanges } : u));
    if (result.allEnemyChanges) {
      setEnemyUnits(p => p.map((u, i) => { const c = result.allEnemyChanges![i]; return c ? { ...u, ...c } : u; }));
      result.allEnemyChanges.forEach((_, i) => { const e = allEnemies[i]; if (e && result.allEnemyChanges![i]?.isAlive === false) { enemyKillsRef.current++; if (enemyKillsRef.current >= totalEnemiesRef.current) { setPhase('victory'); addLog({ id: 'end', timestamp: Date.now(), round, actorName: '系统', actorSide: 'player', action: 'info', detail: '🏆 胜利！', result: 'kill' }); } } });
    }
    if (result.killed) { enemyKillsRef.current++; addLog({ id: 'bk', timestamp: Date.now(), round, actorName: target.name, actorSide: 'enemy', action: 'info', detail: `💀 ${target.name} 被击杀！`, result: 'kill' }); if (enemyKillsRef.current >= totalEnemiesRef.current) { setPhase('victory'); addLog({ id: 'end', timestamp: Date.now(), round, actorName: '系统', actorSide: 'player', action: 'info', detail: '🏆 胜利！', result: 'kill' }); setIsProcessing(false); return; } }
    setIsProcessing(false);
    if (actor.moveUsed) await advanceTurn();
  }, [getActor, enemyUnits, playerUnits, round, addLog, showDice, advanceTurn, isProcessing]);

  const playerMoveFn = useCallback(async (cx: number, cy: number) => {
    const actor = getActor(); if (!actor || actor.side !== 'player' || isProcessing || mapMode !== 'move' || actor.moveUsed) return;
    const fp = cellToPx(actor.gridX, actor.gridY), tp = cellToPx(cx, cy);
    const dp = Math.hypot(tp.x - fp.x, tp.y - fp.y), mp = movToPx(actor.mov);
    setIsProcessing(true);
    try {
      if (dp > mp) { addLog({ id: 'mf', timestamp: Date.now(), round, actorName: actor.name, actorSide: 'player', action: 'info', detail: `移动距离不足(${fmtDist(dp)}/${fmtDist(mp)})`, result: 'miss' }); return; }
      const all = [...playerUnits, ...enemyUnits, ...summonedUnits];
      if (all.some(u => u.isAlive && u.instanceId !== actor.instanceId && Math.hypot(cellToPx(u.gridX, u.gridY).x - tp.x, cellToPx(u.gridX, u.gridY).y - tp.y) < CELL * 3)) { return; }
      setMapMode('normal'); setHoverPos(null);
      const isSummon = summonedUnits.some(u => u.instanceId === actor.instanceId);
      const setter = isSummon ? setSummonedUnits : setPlayerUnits;
      setter(p => p.map(u => u.instanceId === actor.instanceId ? { ...u, gridX: cx, gridY: cy, moveUsed: true } : u));
      addLog({ id: 'mv', timestamp: Date.now(), round, actorName: actor.name, actorSide: 'player', action: 'info', detail: `${actor.name} 移动 ${fmtDist(dp)}/${fmtDist(mp)}`, result: 'info' });
      // 如果已用过动作，回合结束；否则等待玩家选择动作
      if (actor.actionUsed) await advanceTurn();
    } finally {
      setIsProcessing(false); setMapMode('normal'); setHoverPos(null);
    }
  }, [getActor, playerUnits, enemyUnits, summonedUnits, round, addLog, advanceTurn, isProcessing, mapMode]);

  const playerDefend = useCallback(async () => {
    const actor = getActor(); if (!actor || actor.side !== 'player' || isProcessing || actor.actionUsed) return;
    setIsProcessing(true); addLog(executeDefend(actor, round));
    setPlayerUnits(p => p.map(u => u.instanceId === actor.instanceId ? { ...u, isDefending: true, actionUsed: true } : u));
    setIsProcessing(false);
    if (actor.moveUsed) await advanceTurn();
  }, [getActor, round, addLog, advanceTurn, isProcessing]);

  const playerWait = useCallback(async () => {
    const actor = getActor(); if (!actor || actor.side !== 'player' || isProcessing || actor.actionUsed) return;
    setIsProcessing(true); addLog(executeWait(actor, round));
    setPlayerUnits(p => p.map(u => u.instanceId === actor.instanceId ? { ...u, actionUsed: true } : u));
    setIsProcessing(false);
    if (actor.moveUsed) await advanceTurn();
  }, [getActor, round, addLog, advanceTurn, isProcessing]);

  const playerEnhance = useCallback(async () => {
    const actor = getActor(); if (!actor || actor.side !== 'player' || isProcessing || actor.enhancement.active || actor.actionUsed) return;
    const tier = actor.enhancement.tier;
    const mpCost = tier === 'ultimate' ? 0 : tier === 3 ? 8 : tier === 2 ? 5 : 3;
    if (actor.currentMP < mpCost) { addLog({ id: 'nmp', timestamp: Date.now(), round, actorName: actor.name, actorSide: 'player', action: 'info', detail: `MP不足(${mpCost})`, result: 'miss' }); return; }
    setIsProcessing(true);
    const check = skillCheck(actor.baseAttributes.POW, 'regular');
    await showDice(check.roll, `黑法老之赐 POW检定 (需≤${check.target})`, check.level);
    const markAction = () => setPlayerUnits(p => p.map(u => u.instanceId === actor.instanceId ? { ...u, actionUsed: true } : u));
    if (check.level === 'fumble') {
      addLog({ id: 'ef', timestamp: Date.now(), round, actorName: actor.name, actorSide: 'player', action: 'info', detail: '大失败！混沌反噬！', result: 'fumble' });
      setPlayerUnits(p => p.map(u => u.instanceId === actor.instanceId ? { ...u, currentMP: u.currentMP - mpCost, currentSAN: Math.max(0, u.currentSAN - 3), actionUsed: true } : u));
      setIsProcessing(false); if (actor.moveUsed) await advanceTurn();
    } else if (!check.success) {
      addLog({ id: 'ef', timestamp: Date.now(), round, actorName: actor.name, actorSide: 'player', action: 'info', detail: '激活失败', result: 'miss' });
      setPlayerUnits(p => p.map(u => u.instanceId === actor.instanceId ? { ...u, currentMP: u.currentMP - mpCost, actionUsed: true } : u));
      setIsProcessing(false); if (actor.moveUsed) await advanceTurn();
    } else if (tier === 1 || tier === 2) {
      markAction();
      setEnhChoice({ actorId: actor.instanceId, tier, mpCost, sanCost: 1 });
      addLog({ id: 'es', timestamp: Date.now(), round, actorName: actor.name, actorSide: 'player', action: 'spell', detail: 'POW成功！请选择效果...', result: 'spell' });
      setIsProcessing(false);
    } else {
      setPlayerUnits(p => p.map(u => u.instanceId === actor.instanceId ? { ...u, currentMP: u.currentMP - mpCost, enhancedAttributes: { ...u.enhancedAttributes, STR: u.enhancedAttributes.STR + 20, DEX: u.enhancedAttributes.DEX + 20 }, armor: u.armor + 2, enhancement: { ...u.enhancement, active: true }, actionUsed: true } : u));
      addLog({ id: 'ea', timestamp: Date.now(), round, actorName: actor.name, actorSide: 'player', action: 'spell', detail: `⚡黑法老之赐激活！(-${mpCost}MP)`, result: 'spell' });
      setIsProcessing(false); if (actor.moveUsed) await advanceTurn();
    }
  }, [getActor, round, addLog, showDice, advanceTurn, isProcessing]);

  const confirmEnhFn = useCallback(async (opts: string[]) => {
    if (!enhChoice) return;
    const { actorId, tier, mpCost } = enhChoice;
    setEnhChoice(null); setEnhSelected(new Set());
    setPlayerUnits(p => p.map(u => {
      if (u.instanceId !== actorId) return u;
      const a = { ...u.enhancedAttributes }; let arm = 0;
      if (opts.includes('strength')) { a.STR += 20; a.APP = Math.max(0, (a.APP || 50) - 20); }
      if (opts.includes('speed')) { a.DEX += 20; a.STR = Math.max(0, a.STR - 10); }
      if (opts.includes('armor')) arm = 1;
      return { ...u, currentMP: u.currentMP - mpCost, enhancedAttributes: a, armor: u.armor + arm, enhancement: { ...u.enhancement, active: true } };
    }));
    addLog({ id: 'ec', timestamp: Date.now(), round, actorName: '', actorSide: 'player', action: 'spell', detail: `⚡黑法老之赐激活！${opts.map(o => o === 'strength' ? 'STR+20' : o === 'speed' ? 'DEX+20' : '护甲+1').join(', ')} (-${mpCost}MP)`, result: 'spell' });
    // 强化完成，结束回合
    await advanceTurn();
  }, [enhChoice, round, addLog, advanceTurn]);

  const toggleEopt = (opt: string) => {
    if (!enhChoice) return;
    setEnhSelected(p => { const n = new Set(p); n.has(opt) ? n.delete(opt) : (n.size >= (enhChoice.tier === 2 ? 2 : 1) ? (n.clear(), n.add(opt)) : n.add(opt)); return n; });
  };

  // ═══ 敌方AI ═══
  const executeEnemyTurn = useCallback(async () => {
    const actor = getActor(); if (!actor || actor.side === 'player' || isProcessing) return;
    setIsProcessing(true);
    // 冰冻/眩晕跳过
    if (!canAct(actor)) { addLog({ id: 'frozen', timestamp: Date.now(), round, actorName: actor.name, actorSide: 'enemy', action: 'info', detail: `${actor.name}被冻结/眩晕，跳过回合`, result: 'miss' }); setIsProcessing(false); await advanceTurn(); return; }
    const pa = getAliveTargets(playerUnits); if (pa.length === 0) { setIsProcessing(false); await advanceTurn(); return; }
    // 构建此敌人的威胁图：哪些玩家对它造成了伤害
    const myThreat = threatRef.current.get(actor.instanceId) || new Map();
    const decision = enemyAIDecision(actor, pa, myThreat);
    const allU = [...playerUnits, ...enemyUnits, ...summonedUnits];

    if (decision.action === 'attack' && decision.weapon) {
      const inR = pa.filter(t => isInRange(actor, t, decision.weapon!.range));
      // 被束缚则跳过移动，只攻击射程内的目标
      const isBound = actor.effects.some(e => e.id === 'tongue_bound');
      if (inR.length === 0) {
        if (isBound) { setIsProcessing(false); await advanceTurn(); return; }
        // 追向威胁最高的人（而非最近的人）
        const chaseTarget = decision.target;
        const near = chaseTarget;
        const dx = near.gridX - actor.gridX, dy = near.gridY - actor.gridY;
        const td = Math.hypot(dx, dy); if (td < 1) { setIsProcessing(false); await advanceTurn(); return; }
        // COC 7th: 先移动，移动后如果在射程内则继续攻击
        const maxMoveCells = Math.round(movToPx(actor.mov) / CELL);
        const r = Math.min(maxMoveCells / td, 1);
        const gx = Math.round(actor.gridX + dx * r), gy = Math.round(actor.gridY + dy * r);
        const blocked = allU.some(u => u.isAlive && u.instanceId !== actor.instanceId && Math.hypot(cellToPx(u.gridX, u.gridY).x - cellToPx(gx, gy).x, cellToPx(u.gridX, u.gridY).y - cellToPx(gx, gy).y) < CELL * 2);
        if (!blocked) {
          setEnemyUnits(p => p.map(u => u.instanceId === actor.instanceId ? { ...u, gridX: gx, gridY: gy, moveUsed: true } : u));
          addLog({ id: 'em', timestamp: Date.now(), round, actorName: actor.name, actorSide: 'enemy', action: 'info', detail: `${actor.name} 向${near.name}靠近`, result: 'info' });
          // 移动后更新位置并检查是否进入射程
          actor.gridX = gx; actor.gridY = gy; actor.moveUsed = true;
          const newInR = pa.filter(t => isInRange(actor, t, decision.weapon!.range));
          if (newInR.length > 0) { inR.length = 0; newInR.forEach(t => inR.push(t)); }
          else { setIsProcessing(false); await advanceTurn(); return; }
        } else {
          setIsProcessing(false); await advanceTurn(); return;
        }
      }
      // ── 多段攻击：不限制同目标，全部倾泻 ──
      const atk = decision.weapon.attacksPerRound || 1;
      const killedIds = new Set<string>();
      let battleEnded = false;
      for (let a = 0; a < atk; a++) {
        // 优先攻击未杀死的目标，轮换
        const liveTargets = inR.filter(t => t.isAlive && !killedIds.has(t.instanceId));
        const t = liveTargets.length > 0 ? liveTargets[a % liveTargets.length] : inR[a % inR.length];
        if (!t.isAlive) continue;
        // 混沌面纱：教宗光环降低敌方攻击
        const pontiff = findPontiff(unitsRef.current.playerUnits);
        let atkSkill = actor.skills[decision.weapon.skill] || 50;
        if (pontiff) {
          const veil = calcChaosVeil(pontiff, actor);
          if (veil.enemyAttackPenalty > 0) atkSkill = Math.max(5, atkSkill - veil.enemyAttackPenalty);
        }
        const ck = skillCheck(atkSkill);
        await showDice(ck.roll, `${actor.name}攻击${atk > 1 ? ` [${a + 1}/${atk}]` : ''}`, ck.level);
        const r = executeAttack(actor, t, decision.weapon, round, ck);
        addLog(r.log);
        if (r.attackerNewState) setEnemyUnits(p => p.map(u => u.instanceId === actor.instanceId ? { ...u, ...r.attackerNewState } : u));
        // 不朽面具复活检查
        let revived = false;
        if (r.defenderNewState && r.killed) {
          const revive = tryRevive(t);
          if (revive) { setPlayerUnits(p => p.map(u => u.instanceId === t.instanceId ? { ...u, ...revive } : u)); revived = true; }
          else { setPlayerUnits(p => p.map(u => u.instanceId === t.instanceId ? { ...u, ...r.defenderNewState } : u)); }
        } else if (r.defenderNewState) { setPlayerUnits(p => p.map(u => u.instanceId === t.instanceId ? { ...u, ...r.defenderNewState } : u)); }
        // 总是显示闪避信息
        if (r.dodgeInfo) await showDice(r.dodgeInfo.roll, `${t.name}闪避 → ${r.dodgeInfo.success ? (r.dodgeInfo.level === 'critical' ? '✨大成功' : r.dodgeInfo.level === 'extreme' ? '极难' : r.dodgeInfo.level === 'hard' ? '困难' : '普通') : '失败'}${r.dodgeInfo.wasDefending ? ' [防御]' : ''}`, r.dodgeInfo.success ? r.dodgeInfo.level : 'fail', 1400);
        if (r.abilityTrigger) await showDice(r.abilityTrigger.roll, `${r.abilityTrigger.name}: ${r.abilityTrigger.checkType}检定`, r.abilityTrigger.success ? 'regular' : 'fail', 900);
        if (r.killed) {
          killedIds.add(t.instanceId);
          if (!revived) playerKillsRef.current++;
          addLog({ id: 'k', timestamp: Date.now(), round, actorName: t.name, actorSide: 'player', action: 'info', detail: `💀 ${t.name} 被击杀${revived ? '...但不朽面具使其复活！' : '！'}`, result: 'kill' });
          if (!revived && playerKillsRef.current >= totalPlayersRef.current) {
            setPhase('defeat');
            addLog({ id: 'end', timestamp: Date.now(), round, actorName: '系统', actorSide: 'player', action: 'info', detail: '💀 团灭...所有成员阵亡！', result: 'death' });
            battleEnded = true;
            break;
          }
        }
        await new Promise(r => setTimeout(r, 250));
      }
      if (battleEnded) { setIsProcessing(false); return; }
    } else if (decision.action === 'spell' && decision.spell) {
      const ck = skillCheck(actor.baseAttributes[decision.spell.skillUsed as keyof typeof actor.baseAttributes] || 50, decision.spell.castingDifficulty);
      await showDice(ck.roll, `${actor.name}施法`, ck.level);
      const r = executeSpell(actor, decision.target, decision.spell, round, ck);
      addLog(r.log);
      setEnemyUnits(p => p.map(u => u.instanceId === actor.instanceId ? { ...u, ...r.attackerNewState } : u));
      if (r.defenderNewState) setPlayerUnits(p => p.map(u => u.instanceId === decision.target.instanceId ? { ...u, ...r.defenderNewState } : u));
    } else {
      addLog(executeDefend(actor, round));
    }
    setIsProcessing(false); if (!checkEnd()) await advanceTurn();
  }, [getActor, playerUnits, enemyUnits, summonedUnits, round, addLog, showDice, advanceTurn, isProcessing, checkEnd]);

  // ═══ 召唤物自主AI ═══
  const executeSummonTurn = useCallback(async () => {
    const actor = getActor(); if (!actor || actor.side !== 'player' || actor.type !== 'summon' || isProcessing) return;
    setIsProcessing(true);
    if (!canAct(actor)) { addLog({ id: 'frozen', timestamp: Date.now(), round, actorName: actor.name, actorSide: 'player', action: 'info', detail: `${actor.name}被冻结/眩晕，跳过回合`, result: 'miss' }); setIsProcessing(false); await advanceTurn(); return; }
    const allUnits = [...unitsRef.current.playerUnits, ...unitsRef.current.enemyUnits, ...unitsRef.current.summonedUnits];
    const enemies = unitsRef.current.enemyUnits.filter(u => u.isAlive);
    const allies = unitsRef.current.playerUnits.filter(u => u.isAlive && u.instanceId !== actor.instanceId);
    const allHostiles = [...enemies, ...allies];

    if (enemies.length === 0) { setIsProcessing(false); await advanceTurn(); return; }

    // 15%概率狂暴：攻击范围内最近的任意单位（敌我不分）
    let isBerserk = summonBerserkRef.current.has(actor.instanceId);
    if (!isBerserk && Math.random() < 0.15) {
      isBerserk = true;
      summonBerserkRef.current.add(actor.instanceId);
      addLog({ id: 'berserk', timestamp: Date.now(), round, actorName: actor.name, actorSide: 'player', action: 'info', detail: `😈 ${actor.name} 混沌失控！敌我不分！`, result: 'info' });
    }

    const targets = isBerserk ? allHostiles.filter(u => u.isAlive) : enemies;
    if (targets.length === 0) { setIsProcessing(false); await advanceTurn(); return; }

    const wpn = actor.weapons[0];
    if (!wpn) { setIsProcessing(false); await advanceTurn(); return; }

    const inR = targets.filter(t => isInRange(actor, t, wpn.range));
    if (inR.length === 0) {
      const isBound = actor.effects.some(e => e.id === 'tongue_bound');
      if (isBound) { setIsProcessing(false); await advanceTurn(); return; }
      const near = targets.reduce((a, b) => unitDist(actor, a) < unitDist(actor, b) ? a : b);
      const dx = near.gridX - actor.gridX, dy = near.gridY - actor.gridY;
      const td = Math.hypot(dx, dy);
      if (td < 1) { setIsProcessing(false); await advanceTurn(); return; }
      const maxMove = Math.round(movToPx(actor.mov) / CELL);
      const r = Math.min(maxMove / td, 1);
      const gx = Math.round(actor.gridX + dx * r), gy = Math.round(actor.gridY + dy * r);
      if (!allUnits.some(u => u.isAlive && u.instanceId !== actor.instanceId && Math.hypot(cellToPx(u.gridX, u.gridY).x - cellToPx(gx, gy).x, cellToPx(u.gridX, u.gridY).y - cellToPx(gx, gy).y) < CELL * 2)) {
        setSummonedUnits(p => p.map(u => u.instanceId === actor.instanceId ? { ...u, gridX: gx, gridY: gy, moveUsed: true } : u));
        addLog({ id: 'sm', timestamp: Date.now(), round, actorName: actor.name, actorSide: 'player', action: 'info', detail: `${actor.name} 向${near.name}逼近${isBerserk ? ' 😈' : ''}`, result: 'info' });
        // 移动后检查是否进入射程
        actor.gridX = gx; actor.gridY = gy; actor.moveUsed = true;
        const newInR = targets.filter(t => isInRange(actor, t, wpn.range));
        if (newInR.length > 0) { inR.length = 0; newInR.forEach(t => inR.push(t)); }
        else { setIsProcessing(false); await advanceTurn(); return; }
      } else {
        setIsProcessing(false); await advanceTurn(); return;
      }
    }

    const t = inR.reduce((a, b) => unitDist(actor, a) < unitDist(actor, b) ? a : b);
    const ck = skillCheck(actor.skills[wpn.skill] || 50);
    await showDice(ck.roll, `${actor.name}攻击${isBerserk ? ' 😈狂暴' : ''}`, ck.level);
    const r = executeAttack(actor, t, wpn, round, ck);
    addLog(r.log);
    if (r.attackerNewState) setSummonedUnits(p => p.map(u => u.instanceId === actor.instanceId ? { ...u, ...r.attackerNewState } : u));
    if (t.side === 'enemy') {
      if (r.defenderNewState) setEnemyUnits(p => p.map(u => u.instanceId === t.instanceId ? { ...u, ...r.defenderNewState } : u));
      if (r.killed) { enemyKillsRef.current++; addLog({ id: 'sk', timestamp: Date.now(), round, actorName: t.name, actorSide: 'enemy', action: 'info', detail: `💀 ${t.name} 被${actor.name}击杀！`, result: 'kill' }); }
    } else {
      if (r.defenderNewState) setPlayerUnits(p => p.map(u => u.instanceId === t.instanceId ? { ...u, ...r.defenderNewState } : u));
      if (r.killed) { playerKillsRef.current++; addLog({ id: 'sk', timestamp: Date.now(), round, actorName: t.name, actorSide: 'player', action: 'info', detail: `💀 ${t.name} 被${actor.name}误杀！`, result: 'kill' }); }
    }
    if (r.dodgeInfo) await showDice(r.dodgeInfo.roll, `${t.name}闪避`, r.dodgeInfo.success ? r.dodgeInfo.level : 'fail', 1200);
    setIsProcessing(false); if (!checkEnd()) await advanceTurn();
  }, [getActor, round, addLog, showDice, advanceTurn, isProcessing, checkEnd]);

  useEffect(() => {
    const a = getActor();
    if (a && phase === 'combat' && !isProcessing) {
      if (a.side === 'enemy') {
        const t = setTimeout(() => executeEnemyTurn(), 500);
        return () => clearTimeout(t);
      } else if (a.type === 'summon') {
        // 召唤物自主行动
        const t = setTimeout(() => executeSummonTurn(), 400);
        return () => clearTimeout(t);
      }
    }
  }, [curIdx, round, phase, isProcessing, getActor, executeEnemyTurn, executeSummonTurn]);

  const reset = () => { setPhase('deploy'); setPlayerUnits([]); setEnemyUnits([]); setSummonedUnits([]); setInitOrder([]); setCurIdx(0); setRound(1); setLog([]); setMapMode('normal'); setTargetingMode(null); };

  const actor = getActor();
  const isPlayerTurn = actor?.side === 'player' && actor?.type !== 'summon' && phase === 'combat';
  const isSummonTurn = actor?.type === 'summon' && phase === 'combat';

  // ═══ 渲染 ═══
  if (phase === 'victory' || phase === 'defeat') {
    return (<div className="min-h-screen bg-[#0c0c10] flex items-center justify-center"><Card className="bg-[#111116] border-[#c8a84e]/20 max-w-md w-full text-center p-8"><div className="text-6xl mb-4">{phase === 'victory' ? '🏆' : '💀'}</div><h2 className={`text-2xl font-bold font-serif mb-2 ${phase === 'victory' ? 'text-[#c8a84e]' : 'text-[#c0392b]'}`}>{phase === 'victory' ? '胜利!' : '团灭...'}</h2><p className="text-[#6a6a74] mb-4">{phase === 'victory' ? `存活: ${playerUnits.filter(u => u.isAlive).map(u => u.name).join('、') || '无'}` : '黑暗吞噬了一切。'}</p><Button onClick={reset} className="bg-[#c8a84e]/10 hover:bg-[#c8a84e]/20 text-[#c8a84e]"><RotateCcw className="w-4 h-4 mr-2" />再来一局</Button></Card></div>);
  }

  return (<div className="min-h-screen bg-[#0c0c10] text-[#c8c8d0]">
    {diceOverlay && (<div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center pointer-events-none"><div className="text-center font-serif"><div className="text-6xl mb-2">🎲</div><div className={`text-4xl font-bold ${diceOverlay.result === 'critical' || diceOverlay.result === 'extreme' ? 'text-[#c8a84e]' : diceOverlay.result === 'fail' || diceOverlay.result === 'fumble' ? 'text-[#c0392b]' : 'text-[#3a8]'}`}>{diceOverlay.roll}</div><div className="text-sm text-[#6a6a74] mt-1">{diceOverlay.label}</div></div></div>)}
    {enhChoice && (<div className="fixed inset-0 z-[180] bg-black/60 flex items-center justify-center" onClick={() => { setEnhChoice(null); setEnhSelected(new Set()); }}><div className="bg-[#1a1a22] border border-[#c8a84e]/40 rounded-xl p-6 max-w-sm w-full mx-4 text-center" onClick={e => e.stopPropagation()}><h3 className="text-lg font-bold text-[#c8a84e] font-serif mb-1">⚡ 选择强化效果</h3><p className="text-xs text-[#6a6a74] mb-4">黑法老之赐·第{enhChoice.tier}重 — {enhChoice.tier === 2 ? '选2项' : '选1项'}</p><div className="space-y-2 mb-4">{[{ id: 'strength', emoji: '💪', title: 'STR+20 / APP-20', desc: '肉体扭曲爆发力' }, { id: 'speed', emoji: '🏃', title: 'DEX+20 / STR-10', desc: '暗影般的速度' }, { id: 'armor', emoji: '🛡', title: '护甲+1', desc: '皮肤硬化如黑曜石' }].map(opt => (<div key={opt.id} onClick={() => toggleEopt(opt.id)} className={`p-3 rounded-lg border cursor-pointer transition-all text-left ${enhSelected.has(opt.id) ? 'border-[#c8a84e] bg-[#c8a84e]/10' : 'border-[#c8a84e]/20 hover:border-[#c8a84e]/40'}`}><div className="flex items-center gap-3"><span className="text-xl">{opt.emoji}</span><div><div className="text-sm font-bold text-[#e8e8ec]">{opt.title}</div><div className="text-[10px] text-[#6a6a74]">{opt.desc}</div></div>{enhSelected.has(opt.id) && <span className="ml-auto text-[#c8a84e]">✓</span>}</div></div>))}</div><Button className="w-full bg-[#c8a84e]/15 hover:bg-[#c8a84e]/25 text-[#c8a84e] border border-[#c8a84e]/30" disabled={enhSelected.size === 0} onClick={() => confirmEnhFn(Array.from(enhSelected))}>确认 ({enhSelected.size}/{enhChoice.tier === 2 ? 2 : 1})</Button></div></div>)}

    <div className="border-b border-[#c8a84e]/15 bg-[#111116] sticky top-0 z-50"><div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between"><div className="flex items-center gap-3"><Swords className="w-5 h-5 text-[#c8a84e]" /><h1 className="text-lg font-bold text-[#c8a84e] tracking-widest font-serif">战斗竞技场</h1>{phase === 'combat' && <Badge variant="outline" className="border-[#c8a84e]/30 text-[#c8a84e]">第{round}回合</Badge>}</div><div className="flex items-center gap-3 text-sm"><span className="text-[#6a6a74]">我方: <strong className="text-[#c8a84e]">{playerUnits.filter(u => u.isAlive).length}</strong></span><span className="text-[#6a6a74]">敌方: <strong className="text-[#c0392b]">{enemyUnits.filter(u => u.isAlive).length}</strong></span>{phase === 'combat' && <Button size="sm" variant="outline" className="border-red-500/20 text-red-400 text-xs" onClick={reset}>投降</Button>}</div></div></div>

    <div className="max-w-7xl mx-auto p-4">
      {phase === 'deploy' ? (<div className="grid grid-cols-2 gap-6">
        <Card className="bg-[#111116] border-[#c8a84e]/10"><CardHeader><CardTitle className="text-[#c8a84e] font-serif tracking-wider">👥 选择教团成员 <Badge className="ml-2 text-xs">{totalPQ}人</Badge></CardTitle></CardHeader><CardContent><ScrollArea className="h-[60vh]"><div className="space-y-2">{ringTemplates.map(({ ring, sample }) => { if (!sample) return null; const qty = playerQuantities.get(ring.level) || 0; const enhTier = ring.level <= 4 ? (ring.level === 1 ? '终极' : `${5 - ring.level}重`) : (ring.level === 5 ? '1重' : ''); return (<div key={ring.level} className={`p-3 rounded-lg border transition-all ${qty > 0 ? 'border-[#c8a84e] bg-[#c8a84e]/5' : 'border-[#c8a84e]/8 bg-[#0c0c10] hover:border-[#c8a84e]/20'}`} title={`${ring.name} · ${ring.title}\nSTR:${sample.attributes.STR} CON:${sample.attributes.CON} SIZ:${sample.attributes.SIZ}\nDEX:${sample.attributes.DEX} INT:${sample.attributes.INT} POW:${sample.attributes.POW}\nHP:${sample.derived.HP} MP:${sample.derived.MP} SAN:${sample.derived.SAN} DB:${sample.derived.DB}\n恩赐: ${ring.boons.slice(0, 2).join(' | ')}\n技能: ${Object.entries(sample.skills).map(([k, v]) => `${k} ${v}%`).join(', ')}\n法术: ${sample.knownSpells.map(sid => getSpellById(sid)?.name || sid).join(', ') || '无'}`}><div className="flex items-center gap-3"><span className="text-2xl">{ring.icon}</span><div className="flex-1 min-w-0"><div className="font-bold text-sm" style={{ color: ring.color }}>{ring.name}{ring.level <= 5 && <span className="ml-1.5 text-[10px] text-[#c8a84e] bg-[#c8a84e]/10 px-1.5 py-0.5 rounded">⚡{enhTier}</span>}</div><div className="text-xs text-[#6a6a74]">{ring.title} · ❤{sample.derived.HP} ✦{sample.derived.MP} 🧠{sample.derived.SAN} 🛡{sample.armor || 0}</div><div className="text-[10px] text-[#6a6a74] truncate">{sample.weapons.map(w => w.name).join(' · ') || '无武器'}</div></div><div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}><Button variant="outline" size="sm" className="h-7 w-7 p-0 text-sm border-[#c8a84e]/20" onClick={() => adjustPQ(ring.level, -1)} disabled={qty === 0}>−</Button><span className={`w-7 text-center text-base font-bold ${qty > 0 ? 'text-[#c8a84e]' : 'text-[#6a6a74]'}`}>{qty}</span><Button variant="outline" size="sm" className="h-7 w-7 p-0 text-sm border-[#c8a84e]/20" onClick={() => adjustPQ(ring.level, 1)} disabled={qty >= 9}>+</Button></div></div></div>); })}</div></ScrollArea></CardContent></Card>
        <Card className="bg-[#111116] border-[#c8a84e]/10"><CardHeader><CardTitle className="text-[#c0392b] font-serif tracking-wider">👹 选择敌方神话生物 <Badge className="ml-2 text-xs">{totalEQ}只</Badge></CardTitle></CardHeader><CardContent><ScrollArea className="h-[60vh]"><div className="space-y-1.5">{BESTIARY.map(c => { const qty = enemyQuantities.get(c.id) || 0; return (<div key={c.id} className={`p-2.5 rounded-lg border transition-all ${qty > 0 ? 'border-[#c0392b] bg-[#c0392b]/5' : 'border-[#c8a84e]/8 bg-[#0c0c10] hover:border-[#c8a84e]/20'}`} title={`${c.name} (${c.nameEn})\nSTR:${c.attributes.STR} CON:${c.attributes.CON} SIZ:${c.attributes.SIZ}\nDEX:${c.attributes.DEX} INT:${c.attributes.INT} POW:${c.attributes.POW}\nHP:${c.derived.maxHP} MOV:${c.derived.MOV} DB:${c.derived.DB}\n护甲:${c.armor}(${c.armorDescription})\nSAN损失:${c.sanLoss}\n${c.description}`}><div className="flex items-center gap-2"><span className="text-xl">{c.icon}</span><div className="flex-1 min-w-0"><div className="font-bold text-xs">{c.name} <span className="text-[10px] text-[#6a6a74] italic">{c.nameEn}</span></div><div className="text-[10px] text-[#6a6a74]">❤{c.derived.maxHP} 🧠{c.derived.SAN} 🛡{c.armor} DB:{c.derived.DB} | {c.weapons.map(w => w.name).join(', ')}</div></div><div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}><Button variant="outline" size="sm" className="h-6 w-6 p-0 text-xs border-[#c0392b]/20" onClick={() => adjustEQ(c.id, -1)} disabled={qty === 0}>−</Button><span className={`w-6 text-center text-sm font-bold ${qty > 0 ? 'text-[#c0392b]' : 'text-[#6a6a74]'}`}>{qty}</span><Button variant="outline" size="sm" className="h-6 w-6 p-0 text-xs border-[#c0392b]/20" onClick={() => adjustEQ(c.id, 1)} disabled={qty >= 9}>+</Button></div></div></div>); })}</div></ScrollArea></CardContent></Card>
        <div className="col-span-2 flex justify-center"><Button size="lg" className="bg-gradient-to-r from-[#8b1a1a] to-[#c0392b] text-white font-bold font-serif tracking-widest px-12 py-6 text-lg" disabled={totalPQ === 0 || totalEQ === 0} onClick={startBattle}><Swords className="w-5 h-5 mr-2" />开始战斗 ({totalPQ} vs {totalEQ})</Button></div>
      </div>) : (<div className="grid grid-cols-12 gap-4">
        <div className="col-span-8 space-y-3">
          <Card className="bg-[#111116] border-[#c8a84e]/10"><CardContent className="p-2 flex justify-center"><BattleMap playerUnits={playerUnits} enemyUnits={enemyUnits} summonedUnits={summonedUnits} currentActor={actor} mapMode={mapMode} targetingMode={targetingMode} hoverPos={hoverPos} summonBerserkRef={summonBerserkRef} onHover={pos => { if (mapMode === 'move') setHoverPos(pos); }} onClick={(cx, cy) => { if (mapMode === 'move') playerMoveFn(cx, cy); }} onTargetClick={unit => { if (targetingMode?.type === 'attack' && targetingMode.weapon) playerAttack(targetingMode.weapon, unit); else if (targetingMode?.type === 'spell') { const s = targetingMode.spell; if (s && 'combatEffect' in s) playerCastSpell(s as SpellDefinition, unit); else if (s && 'ringLevel' in s) playerUseBoon(s as CombatBoon, unit); } }} /></CardContent></Card>
          {/* ── 状态面板 ── */}
          {phase === 'combat' && (
            <Card className="bg-[#111116] border-[#c8a84e]/10">
              <CardContent className="p-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* 友方 */}
                  <div>
                    <div className="text-[#c8a84e] font-bold mb-2 font-serif">🛡 友方单位</div>
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                      {playerUnits.filter(u => u.isAlive).map(u => (
                        <div key={u.instanceId} className={`p-1.5 rounded border ${u.instanceId === actor?.instanceId ? 'border-[#c8a84e] bg-[#c8a84e]/5' : 'border-[#c8a84e]/10'}`}>
                          <div className="flex items-center gap-1.5">
                            <span>{u.icon}</span>
                            <span className="font-bold text-[#e8e8ec] truncate">{u.name}</span>
                            {u.enhancement?.active && <span className="text-[#c8a84e]">⚡</span>}
                            {u.isDefending && <span className="text-[#4488cc]">🛡</span>}
                          </div>
                          <div className="flex gap-2 mt-0.5 text-[#6a6a74]">
                            <span>❤{u.currentHP}/{u.maxHP}</span>
                            <span>✦{u.currentMP}/{u.maxMP}</span>
                            <span>🧠{u.currentSAN}</span>
                            <span>🛡{u.armor}</span>
                          </div>
                          {u.effects.length > 0 && <div className="flex gap-1 mt-0.5 flex-wrap">{u.effects.map((e, i) => (<span key={i} className="px-1 rounded text-[10px] bg-[#c0392b]/15 text-[#c0392b]">{e.name}({e.duration}轮)</span>))}</div>}
                        </div>
                      ))}
                      {playerUnits.filter(u => u.isAlive).length === 0 && <div className="text-[#6a6a74] italic">无存活单位</div>}
                    </div>
                  </div>
                  {/* 敌方 + 召唤物 */}
                  <div>
                    <div className="text-[#c0392b] font-bold mb-2 font-serif">👹 敌方 / 召唤物</div>
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                      {enemyUnits.filter(u => u.isAlive).map(u => (
                        <div key={u.instanceId} className={`p-1.5 rounded border ${u.instanceId === actor?.instanceId ? 'border-[#c0392b] bg-[#c0392b]/5' : 'border-[#c0392b]/10'}`}>
                          <div className="flex items-center gap-1.5">
                            <span>{u.icon}</span>
                            <span className="font-bold text-[#e8e8ec] truncate">{u.name}</span>
                          </div>
                          <div className="flex gap-2 mt-0.5 text-[#6a6a74]">
                            <span>❤{u.currentHP}/{u.maxHP}</span>
                            <span>✦{u.currentMP}/{u.maxMP}</span>
                            <span>🧠{u.currentSAN}</span>
                            <span>🛡{u.armor}</span>
                          </div>
                          {u.effects.length > 0 && <div className="flex gap-1 mt-0.5 flex-wrap">{u.effects.map((e, i) => (<span key={i} className="px-1 rounded text-[10px] bg-[#8844cc]/15 text-[#8844cc]">{e.name}({e.duration}轮)</span>))}</div>}
                        </div>
                      ))}
                      {summonedUnits.filter(u => u.isAlive).map(u => (
                        <div key={u.instanceId} className={`p-1.5 rounded border ${u.instanceId === actor?.instanceId ? 'border-[#8844cc] bg-[#8844cc]/5' : 'border-[#8844cc]/10'}`}>
                          <div className="flex items-center gap-1.5">
                            <span>{u.icon}</span>
                            <span className="font-bold text-[#b388ff] truncate">{u.name}</span>
                            {summonBerserkRef.current.has(u.instanceId) && <span className="text-red-400">😈</span>}
                            <span className="text-[10px] text-[#6a6a74]">⏳{u.effects.find(e => e.id === 'temp_exist')?.duration || '?'}轮</span>
                          </div>
                          <div className="flex gap-2 mt-0.5 text-[#6a6a74]">
                            <span>❤{u.currentHP}/{u.maxHP}</span>
                            <span>🛡{u.armor}</span>
                          </div>
                        </div>
                      ))}
                      {enemyUnits.filter(u => u.isAlive).length === 0 && summonedUnits.filter(u => u.isAlive).length === 0 && <div className="text-[#6a6a74] italic">无存活单位</div>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {isPlayerTurn && (<Card className="bg-[#111116] border-[#c8a84e]/20"><CardHeader className="pb-2"><CardTitle className="text-sm text-[#c8a84e] font-serif">{targetingMode ? `🎯 选择目标 — ${targetingMode.type === 'attack' ? targetingMode.weapon?.name : targetingMode.spell?.name}` : `${actor!.name} 的行动${actor!.actionUsed ? ' ✅' : ''}${actor!.moveUsed ? ' 🏃已移' : ''}`}</CardTitle></CardHeader><CardContent><div className="flex flex-wrap gap-2">
            {!actor!.actionUsed && actor!.weapons.filter(w => w.category !== 'firearm' || (w.currentAmmo || 0) > 0).map((w, i) => {
              const isP = actor!.ringLevel === 1;
              const wCls = isP ? 'border-[#c8a84e]/30 hover:border-[#c8a84e] hover:bg-[#c8a84e]/10 text-[#c8a84e]' : 'border-[#c8a84e]/20 hover:border-[#c8a84e]/50 hover:bg-[#c8a84e]/5';
              const wSel = isP ? 'bg-[#c8a84e]/10 border-[#c8a84e]' : 'bg-[#c8a84e]/10 border-[#c8a84e]';
              return (<Button key={i} variant="outline" size="sm" className={`${wCls} ${targetingMode?.type === 'attack' && targetingMode?.weapon?.id === w.id ? wSel : ''}`} disabled={isProcessing} onClick={() => setTargetingMode(targetingMode?.weapon?.id === w.id ? null : { type: 'attack', weapon: w })} title={`${w.name}\n伤害:${w.damage} 射程:${w.range}\n${w.description}`}><Target className="w-3 h-3 mr-1" />{w.name} ({w.damage}){w.category === 'firearm' ? ` [${w.currentAmmo}]` : ''}</Button>);
            })}
            {!actor!.actionUsed && actor!.knownSpells.filter(s => s.combatUsable && actor!.currentMP >= (actor!.ringLevel === 1 ? 1 : s.mpCost) && !(actor!.ringLevel === 1 && s.id === 'veil_of_dark')).map((s, i) => {
              const selfCast = isSelfTargetSpell(s);
              const isP = actor!.ringLevel === 1;
              const sCls = isP ? 'border-[#c8a84e]/30 hover:border-[#c8a84e] hover:bg-[#c8a84e]/10 text-[#c8a84e]' : 'border-[#8844cc]/20 hover:border-[#8844cc]/50 hover:bg-[#8844cc]/5 text-[#8844cc]';
              const sSel = isP ? 'bg-[#c8a84e]/15 border-[#c8a84e]' : 'bg-[#8844cc]/10 border-[#8844cc]';
              return (<Button key={`s${i}`} variant="outline" size="sm" className={`${sCls} ${!selfCast && targetingMode?.type === 'spell' && targetingMode?.spell?.id === s.id ? sSel : ''}`} disabled={isProcessing} onClick={() => {
                if (selfCast) { playerCastSpell(s); }
                else { setTargetingMode(targetingMode?.spell?.id === s.id ? null : { type: 'spell', spell: s }); }
              }} title={`${s.name}\n消耗:${isP ? 1 : s.mpCost}MP${selfCast ? '\n🎯无需选择目标' : ''}\n${s.description}`}><Sparkles className="w-3 h-3 mr-1" />{s.name} ({isP ? 1 : s.mpCost}MP){selfCast && ' ⚡'}</Button>);
            })}
            {/* 恩赐按钮（千面之心金色1MP，隐藏被动技能；其余紫色） */}
            {!actor!.actionUsed && getBoonsForCombatant(actor!).filter(b => b.isActive && actor!.currentMP >= (actor!.ringLevel === 1 ? 1 : b.mpCost) && !(actor!.ringLevel === 1 && (b.id === 'silent_field' || b.id === 'veil_dark'))).map((b, i) => {
              const isPontiff = actor!.ringLevel === 1;
              const colorClass = isPontiff ? 'border-[#c8a84e]/30 hover:border-[#c8a84e] hover:bg-[#c8a84e]/10 text-[#c8a84e]' : 'border-[#8844cc]/20 hover:border-[#8844cc]/50 hover:bg-[#8844cc]/5 text-[#8844cc]';
              const selClass = isPontiff ? 'bg-[#c8a84e]/15 border-[#c8a84e]' : 'bg-[#8844cc]/15 border-[#8844cc]';
              const onCooldown = (actor!.cooldowns[b.id] || 0) > round;
              const outOfUses = b.maxUses && (actor!.boonUsage[b.id] || 0) >= b.maxUses;
              const needsTarget = b.targetType === 'enemy' || b.targetType === 'ally';
              const isSelected = targetingMode?.type === 'spell' && (targetingMode?.spell as any)?.id === b.id;
              return (<Button key={`b${i}`} variant="outline" size="sm" className={`${colorClass} ${isSelected ? selClass : ''}`} disabled={isProcessing || onCooldown || outOfUses} onClick={() => {
                if (needsTarget) { setTargetingMode(isSelected ? null : { type: 'spell', spell: b }); }
                else { playerUseBoon(b); }
              }} title={`${b.name}\n${b.description}\n消耗:${isPontiff ? 1 : b.mpCost}MP${onCooldown ? `\n冷却中(剩余${(actor!.cooldowns[b.id]||0)-round}轮)` : ''}${outOfUses ? '\n已用尽' : ''}`}><Sparkles className="w-3 h-3 mr-1" />{b.name}({isPontiff ? 1 : b.mpCost}MP){onCooldown ? ' ⏳' : outOfUses ? ' ❌' : ''}</Button>);
            })}
            {!actor!.actionUsed && actor!.enhancement && !actor!.enhancement.active && (<Button variant="outline" size="sm" className="border-[#c8a84e]/30 hover:border-[#c8a84e] hover:bg-[#c8a84e]/10 text-[#c8a84e]" disabled={isProcessing} onClick={playerEnhance}><Sparkles className="w-3 h-3 mr-1" />⚡黑法老之赐</Button>)}
            {actor!.enhancement?.active && <Badge className="text-xs bg-[#c8a84e]/15 text-[#c8a84e] px-2 py-1">⚡已激活</Badge>}
            <Separator orientation="vertical" className="h-8" />
            {!actor!.moveUsed && <Button variant="outline" size="sm" className={`border-[#3a8]/20 ${mapMode === 'move' ? 'bg-[#3a8]/10 border-[#3a8] text-[#3a8]' : 'text-[#6a6a74]'}`} disabled={isProcessing} onClick={() => setMapMode(mapMode === 'move' ? 'normal' : 'move')}>🏃 移动{mapMode === 'move' ? '中...' : ''}</Button>}
            {!actor!.actionUsed && <Button variant="outline" size="sm" className="border-[#4488cc]/20 text-[#4488cc]" disabled={isProcessing} onClick={playerDefend}><Shield className="w-3 h-3 mr-1" />防御</Button>}
            {!actor!.actionUsed && <Button variant="outline" size="sm" className="border-[#ffffff]/10 text-[#6a6a74]" disabled={isProcessing} onClick={playerWait}>等待</Button>}
            {/* 如果已经使用了一个选项但没使用另一个，显示结束回合按钮 */}
            {(actor!.actionUsed || actor!.moveUsed) && <Button variant="outline" size="sm" className="border-[#c8a84e]/20 text-[#c8a84e]" disabled={isProcessing} onClick={async () => { setIsProcessing(true); try { await advanceTurn(); } finally { setIsProcessing(false); } }}>⏭ 结束回合</Button>}
          </div></CardContent></Card>)}
          {!isPlayerTurn && !isSummonTurn && actor?.side === 'enemy' && phase === 'combat' && (<Card className="bg-[#111116] border-[#c0392b]/15"><CardContent className="p-3 text-center text-sm text-[#6a6a74]">{actor.name} 正在行动... <span className="animate-pulse">⏳</span></CardContent></Card>)}
          {isSummonTurn && (<Card className="bg-[#111116] border-[#8844cc]/15"><CardContent className="p-3 text-center text-sm text-[#8844cc]">{actor!.name} 自主行动中{summonBerserkRef.current.has(actor!.instanceId) ? ' 😈混沌失控' : ''}... <span className="animate-pulse">⏳</span></CardContent></Card>)}
        </div>
        <div className="col-span-4"><Card className="bg-[#111116] border-[#c8a84e]/10 h-full"><CardHeader className="pb-2"><CardTitle className="text-sm text-[#c8a84e] font-serif">📜 战斗记录</CardTitle></CardHeader><CardContent><ScrollArea className="h-[55vh]" ref={logRef}><div className="space-y-1">{log.map((e, i) => (<div key={e.id || i} className={`text-xs p-2 rounded ${e.result === 'hit' || e.result === 'crit' ? 'bg-[#c0392b]/5 border-l-2 border-[#c0392b]' : e.result === 'miss' ? 'border-l-2 border-[#6a6a74]' : e.result === 'spell' ? 'bg-[#8844cc]/5 border-l-2 border-[#8844cc]' : e.result === 'kill' ? 'bg-[#c8a84e]/5 border-l-2 border-[#c8a84e] font-bold' : 'border-l-2 border-[#4488cc]'}`}><span className="text-[#6a6a74] mr-2">[{e.round}]</span><span className={e.actorSide === 'player' ? 'text-[#c8a84e]' : 'text-[#c0392b]'}>{e.actorName}</span>: {e.detail}</div>))}</div></ScrollArea></CardContent></Card></div>
      </div>)}
    </div>
  </div>);
}

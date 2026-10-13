// ═══════════════════════════════════════════════════════════
// COC 7th 骰子引擎
// ═══════════════════════════════════════════════════════════

import type { DiceRollResult } from '@/types/cult';

// ── 基础骰子 ──
export function rollD(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollD100(): number {
  return Math.floor(Math.random() * 100) + 1;
}

// ── 解析并执行骰子表达式（如 "2D6+1", "4D6/2D6", "1D10+1D4"）──
export function parseAndRoll(expression: string): DiceRollResult {
  // 处理带"/"的表达式（取第一个，通常是近/远距离伤害）
  const parts = expression.split('/');
  const primary = parts[0].trim();

  const match = primary.match(/(\d*)D(\d+)([+-]\d+)?/i);
  if (!match) {
    return { expression, rolls: [], total: 0, modifier: 0 };
  }

  const num = parseInt(match[1] || '1');
  const sides = parseInt(match[2]);
  const modifier = match[3] ? parseInt(match[3]) : 0;

  const rolls: number[] = [];
  let total = 0;
  for (let i = 0; i < num; i++) {
    const r = rollD(sides);
    rolls.push(r);
    total += r;
  }
  total += modifier;

  return { expression, rolls, total, modifier };
}

// ── 快速伤害掷骰 ──
export function rollDamage(expression: string): number {
  return parseAndRoll(expression).total;
}

// ── 骰子池（用于优势骰/劣势骰）──
export function rollD100Pool(count: number): number[] {
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rollD100());
  }
  return rolls;
}

// 优势骰：取最低值
export function advantageRoll(): number {
  const rolls = rollD100Pool(2);
  return Math.min(...rolls);
}

// 劣势骰：取最高值
export function disadvantageRoll(): number {
  const rolls = rollD100Pool(2);
  return Math.max(...rolls);
}

// ── COC 7th 技能检定 ──
export type CheckResultLevel = 'critical' | 'extreme' | 'hard' | 'regular' | 'fail' | 'fumble';

export interface SkillCheckResult {
  roll: number;
  skillValue: number;
  target: number;
  difficulty: 'auto' | 'regular' | 'hard' | 'extreme';
  level: CheckResultLevel;
  success: boolean;
  isImpale: boolean; // 贯穿（极难成功且武器支持贯穿）
}

export function skillCheck(
  skillValue: number,
  difficulty: 'auto' | 'regular' | 'hard' | 'extreme' = 'regular',
  advantageDisadvantage: 'normal' | 'advantage' | 'disadvantage' = 'normal'
): SkillCheckResult {
  // 掷骰
  let roll: number;
  if (advantageDisadvantage === 'advantage') {
    roll = advantageRoll();
  } else if (advantageDisadvantage === 'disadvantage') {
    roll = disadvantageRoll();
  } else {
    roll = rollD100();
  }

  // 自动成功
  if (difficulty === 'auto') {
    return { roll, skillValue, target: skillValue, difficulty, level: 'regular', success: true, isImpale: false };
  }

  // 计算目标值
  let target = skillValue;
  if (difficulty === 'hard') target = Math.floor(skillValue / 2);
  else if (difficulty === 'extreme') target = Math.floor(skillValue / 5);

  // 判断结果
  let level: CheckResultLevel;
  let success: boolean;

  if (roll === 1) {
    level = 'critical';
    success = true;
  } else if ((skillValue < 50 && roll >= 96) || roll === 100) {
    // 技能<50时96-100大失败，否则只有100大失败
    level = 'fumble';
    success = false;
  } else if (roll <= target) {
    success = true;
    if (roll <= Math.floor(skillValue / 5)) {
      level = 'extreme';
    } else if (roll <= Math.floor(skillValue / 2)) {
      level = 'hard';
    } else {
      level = 'regular';
    }
  } else {
    level = 'fail';
    success = false;
  }

  const isImpale = level === 'extreme' || level === 'critical';

  return { roll, skillValue, target, difficulty, level, success, isImpale };
}

// ── POW对抗检定 ──
export function opposedCheck(
  attackerPOW: number,
  defenderPOW: number
): { attackerRoll: number; defenderRoll: number; attackerLevel: CheckResultLevel; defenderLevel: CheckResultLevel; attackerWins: boolean } {
  const attCheck = skillCheck(attackerPOW, 'regular');
  const defCheck = skillCheck(defenderPOW, 'regular');

  // 比较成功等级（critical > extreme > hard > regular > fail > fumble）
  const levelOrder: Record<CheckResultLevel, number> = {
    critical: 6, extreme: 5, hard: 4, regular: 3, fail: 2, fumble: 1
  };

  const attOrder = levelOrder[attCheck.level];
  const defOrder = levelOrder[defCheck.level];

  let attackerWins: boolean;
  if (attOrder > defOrder) {
    attackerWins = true;
  } else if (defOrder > attOrder) {
    attackerWins = false;
  } else {
    // 同级比数值
    attackerWins = attCheck.roll <= defCheck.roll;
  }

  return {
    attackerRoll: attCheck.roll,
    defenderRoll: defCheck.roll,
    attackerLevel: attCheck.level,
    defenderLevel: defCheck.level,
    attackerWins
  };
}

// ── SAN检定 ──
export interface SanCheckResult {
  roll: number;
  sanBefore: number;
  sanLoss: number;
  sanAfter: number;
  indefiniteInsanity: boolean; // 单次损失≥5触发不定时疯狂
  boutOfMadness: boolean;      // 单次损失≥1/5当前SAN触发癫狂发作
}

export function sanCheck(currentSAN: number, sanLossDice: string): SanCheckResult {
  const loss = rollDamage(sanLossDice);
  const roll = rollD100();
  const newSAN = Math.max(0, currentSAN - loss);
  const indefiniteInsanity = loss >= 5;
  const boutOfMadness = loss >= Math.floor(currentSAN / 5);

  return {
    roll,
    sanBefore: currentSAN,
    sanLoss: loss,
    sanAfter: newSAN,
    indefiniteInsanity,
    boutOfMadness
  };
}

// ── 幸运检定 ──
export function luckCheck(luck: number): boolean {
  return rollD100() <= luck;
}

// ── 格式化骰子结果 ──
export function formatDiceResult(result: DiceRollResult): string {
  const parts = result.rolls.map(r => `[${r}]`).join('+');
  const mod = result.modifier !== 0 ? (result.modifier > 0 ? `+${result.modifier}` : `${result.modifier}`) : '';
  return `${result.expression}: ${parts}${mod} = ${result.total}`;
}

export function formatCheckResult(result: SkillCheckResult): string {
  const labels: Record<CheckResultLevel, string> = {
    critical: '✨大成功!',
    extreme: '极难成功!',
    hard: '困难成功',
    regular: '普通成功',
    fail: '失败',
    fumble: '💀大失败!'
  };
  return `掷出 ${result.roll} (需≤${result.target}) → ${labels[result.level]}`;
}

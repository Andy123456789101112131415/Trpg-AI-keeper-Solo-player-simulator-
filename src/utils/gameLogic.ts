import type { CharacterAttributes, DerivedAttributes, CheckResult, DifficultyLevel } from '@/types/game';

// 计算派生属性
export function calculateDerivedAttributes(attrs: CharacterAttributes): DerivedAttributes {
  const HP = Math.floor((attrs.CON + attrs.SIZ) / 10);
  const MP = Math.floor(attrs.POW / 5);
  const SAN = attrs.POW;
  
  // 计算移动力
  let MOV = 8;
  if (attrs.DEX < attrs.SIZ && attrs.STR < attrs.SIZ) {
    MOV = 7;
  } else if (attrs.DEX > attrs.SIZ && attrs.STR > attrs.SIZ) {
    MOV = 9;
  }

  // 计算伤害加值和体格
  const buildValue = attrs.STR + attrs.SIZ;
  let DB = '0';
  let BUILD = 0;
  
  if (buildValue <= 64) {
    DB = '-2';
    BUILD = -2;
  } else if (buildValue <= 84) {
    DB = '-1';
    BUILD = -1;
  } else if (buildValue <= 124) {
    DB = '0';
    BUILD = 0;
  } else if (buildValue <= 164) {
    DB = '+1D4';
    BUILD = 1;
  } else if (buildValue <= 204) {
    DB = '+1D6';
    BUILD = 2;
  } else {
    DB = '+2D6';
    BUILD = 3;
  }

  return {
    HP,
    maxHP: HP,
    MP,
    maxMP: MP,
    SAN,
    maxSAN: 99,
    MOV,
    DB,
    BUILD
  };
}

// 投掷骰子
export function rollDice(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

// 投掷百分骰
export function rollD100(): number {
  return Math.floor(Math.random() * 100) + 1;
}

// 检定判断
export function performCheck(roll: number, skillValue: number, difficulty: DifficultyLevel = 'regular'): CheckResult {
  let target = skillValue;
  
  // 根据难度调整目标值
  if (difficulty === 'hard') {
    target = Math.floor(skillValue / 2);
  } else if (difficulty === 'extreme') {
    target = Math.floor(skillValue / 5);
  }

  // 判断结果
  let level: CheckResult['level'];
  let success = false;

  if (roll === 1) {
    level = 'critical';
    success = true;
  } else if (roll === 100) {
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

  return {
    success,
    level,
    roll,
    target,
    difficulty
  };
}

// 生成随机属性值（3D6）
export function rollAttribute(): number {
  return rollDice(6) + rollDice(6) + rollDice(6);
}

// 生成随机属性值（2D6+6）
export function rollAttributeEDU(): number {
  return rollDice(6) + rollDice(6) + 6;
}

// 生成随机属性值（3D6*5）
export function rollAttributeLuck(): number {
  return (rollDice(6) + rollDice(6) + rollDice(6)) * 5;
}

// COC7版默认技能列表
export const DEFAULT_SKILLS = [
  { name: '会计', baseValue: 5, category: 'investigation' },
  { name: '人类学', baseValue: 1, category: 'investigation' },
  { name: '估价', baseValue: 5, category: 'investigation' },
  { name: '考古学', baseValue: 1, category: 'investigation' },
  { name: '魅惑', baseValue: 15, category: 'social' },
  { name: '攀爬', baseValue: 20, category: 'other' },
  { name: '计算机使用', baseValue: 5, category: 'investigation' },
  { name: '信用评级', baseValue: 0, category: 'social' },
  { name: '克苏鲁神话', baseValue: 0, category: 'investigation' },
  { name: '乔装', baseValue: 5, category: 'other' },
  { name: '闪避', baseValue: 0, category: 'combat' },
  { name: '驾驶', baseValue: 20, category: 'other' },
  { name: '电气维修', baseValue: 10, category: 'other' },
  { name: '电子学', baseValue: 1, category: 'other' },
  { name: '话术', baseValue: 5, category: 'social' },
  { name: '格斗', baseValue: 25, category: 'combat' },
  { name: '射击', baseValue: 20, category: 'combat' },
  { name: '急救', baseValue: 30, category: 'other' },
  { name: '历史', baseValue: 5, category: 'investigation' },
  { name: '恐吓', baseValue: 15, category: 'social' },
  { name: '跳跃', baseValue: 20, category: 'other' },
  { name: '母语', baseValue: 0, category: 'social' },
  { name: '法律', baseValue: 5, category: 'investigation' },
  { name: '图书馆使用', baseValue: 20, category: 'investigation' },
  { name: '聆听', baseValue: 20, category: 'investigation' },
  { name: '开锁', baseValue: 1, category: 'other' },
  { name: '机械维修', baseValue: 10, category: 'other' },
  { name: '医学', baseValue: 1, category: 'other' },
  { name: '博物学', baseValue: 10, category: 'investigation' },
  { name: '领航', baseValue: 10, category: 'other' },
  { name: '神秘学', baseValue: 5, category: 'investigation' },
  { name: '操作重型机械', baseValue: 1, category: 'other' },
  { name: '说服', baseValue: 10, category: 'social' },
  { name: '精神分析', baseValue: 1, category: 'social' },
  { name: '心理学', baseValue: 10, category: 'social' },
  { name: '骑术', baseValue: 5, category: 'other' },
  { name: '妙手', baseValue: 10, category: 'other' },
  { name: '侦查', baseValue: 25, category: 'investigation' },
  { name: '潜行', baseValue: 20, category: 'other' },
  { name: '游泳', baseValue: 20, category: 'other' },
  { name: '投掷', baseValue: 20, category: 'combat' },
  { name: '追踪', baseValue: 10, category: 'investigation' }
] as const;

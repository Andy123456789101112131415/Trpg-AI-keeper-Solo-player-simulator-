// ═══════════════════════════════════════════════════════════
// 千面之门 · 教团类型定义
// ═══════════════════════════════════════════════════════════

import type { CharacterAttributes, DerivedAttributes } from '@/types/game';

// ── 七环层级 ──
export type RingLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface RingDefinition {
  level: RingLevel;
  name: string;           // 环名（中文）
  title: string;          // 职位称谓
  maxMembers: number | null; // 最大人数（null=无上限）
  description: string;
  knowledgeLevel: string; // 知情程度描述
  role: string;           // 在教团中的角色
  color: string;          // UI颜色
  icon: string;           // 图标emoji
  // 该环可获得的恩赐
  boons: string[];
  // 可习得法术环级
  spellTier: number | null;
  // 晋升条件
  promotionRequirement: string;
}

// ── 肉体强化状态 ──
export interface PhysicalEnhancement {
  active: boolean;
  tier: 1 | 2 | 3 | 'ultimate'; // 对应黑法老之赐第几重
  // 第一重：选一项
  option1?: 'strength' | 'speed' | 'armor';
  // 第二重：选两项
  option2?: ('strength' | 'speed' | 'armor')[];
  // 第三重：全三项
  // 终极：全翻倍
  darkVision: boolean; // 第三重以上获得
}

// ── 面具残留追踪 ──
export interface MaskResidue {
  current: number; // 0-10
  stage: 'none' | 'mild' | 'moderate' | 'severe' | 'consumed';
  stageDescription: string;
}

// ── 法术定义 ──
export type SpellTier = 1 | 2 | 3 | 4;

export interface SpellDefinition {
  id: string;
  name: string;
  nameEn: string;
  tier: SpellTier;
  description: string;
  effect: string;
  cost: string;           // 如 "3MP + 1/1D2 SAN"
  mpCost: number;         // 基础MP消耗
  sanLoss: string;        // SAN损失表达式
  castingCheck: string;   // 施法检定类型
  castingDifficulty: 'auto' | 'regular' | 'hard' | 'extreme';
  skillUsed: string;      // 使用的技能（如POW, INT, 克苏鲁神话）
  duration: string;
  range: string;
  requirements: string;   // 习得条件
  combatUsable: boolean;
  // 战斗中的具体效果函数名
  combatEffect: string;
}

// ── 教团成员（基于COC 7th角色卡）──
export interface CultMember {
  id: string;
  name: string;
  ringLevel: RingLevel;
  ringName: string;
  ringTitle: string;
  // COC 7th 核心属性
  attributes: CharacterAttributes;
  // 派生属性
  derived: DerivedAttributes;
  // 技能（仅记录有加值的技能）
  skills: Record<string, number>;
  // 武器
  weapons: WeaponInstance[];
  // 已习得法术
  knownSpells: string[]; // spell IDs
  // 肉体强化状态
  enhancement: PhysicalEnhancement;
  // 面具残留
  maskResidue: MaskResidue;
  // 教团状态
  isActive: boolean;
  // 当前战斗状态（仅在战斗中有效）
  combatState?: CombatState;
  // 外观描述
  appearance: string;
  // 背景
  background: string;
}

// ── 武器 ──
export interface WeaponDefinition {
  id: string;
  name: string;
  nameEn?: string;
  category: 'melee' | 'firearm' | 'thrown' | 'explosive';
  skill: string;          // 使用的技能名
  damage: string;         // 伤害表达式（如"1D10", "4D6/2D6"）
  damageClose?: string;   // 近距离伤害（霰弹枪）
  damageFar?: string;     // 远距离伤害（霰弹枪）
  range: 'melee' | 'close' | 'medium' | 'long';
  rangeYards?: number;
  attacksPerRound: number;
  ammo?: number;
  maxAmmo?: number;
  malfunction: number;    // 故障值
  impale: boolean;        // 可否贯穿
  twoHanded: boolean;
  description: string;
}

export interface WeaponInstance {
  weaponId: string;
  name: string;
  currentAmmo?: number;
}

// ── 战斗状态 ──
export interface CombatState {
  currentHP: number;
  maxHP: number;
  currentMP: number;
  maxMP: number;
  currentSAN: number;
  maxSAN: number;
  isAlive: boolean;
  temporaryEffects: CombatEffect[];
  isDefending: boolean;
}

export interface CombatEffect {
  id: string;
  name: string;
  duration: number;       // 剩余回合数
  statModifiers: Partial<Record<string, number>>;
  description: string;
}

// ── 神话生物 ──
export interface MythosCreature {
  id: string;
  name: string;
  nameEn: string;
  category: 'independent' | 'servitor' | 'greatOldOne' | 'outerGod';
  description: string;
  attributes: CharacterAttributes;
  derived: DerivedAttributes;
  skills: Record<string, number>;
  weapons: WeaponDefinition[];
  armor: number;
  armorDescription: string;
  sanLoss: string;        // 见到该生物的SAN损失
  specialAbilities: CreatureAbility[];
  icon: string;
  combatAI: 'aggressive' | 'defensive' | 'cunning' | 'berserk';
}

export interface CreatureAbility {
  name: string;
  description: string;
  effect: string;
  cooldown: number;
  currentCooldown: number;
}

// ── 战斗日志条目 ──
export interface CombatLogEntry {
  id: string;
  timestamp: number;
  round: number;
  actorName: string;
  actorSide: 'player' | 'enemy';
  action: string;
  detail: string;
  diceRolls?: DiceRollResult[];
  result: 'hit' | 'miss' | 'crit' | 'fumble' | 'spell' | 'kill' | 'info' | 'death';
}

// ── 骰子结果 ──
export interface DiceRollResult {
  expression: string;
  rolls: number[];
  total: number;
  modifier: number;
}

// ── 战斗全场状态 ──
export interface BattleState {
  phase: 'deploy' | 'combat' | 'victory' | 'defeat';
  round: number;
  playerSide: BattleCombatant[];
  enemySide: BattleCombatant[];
  initiativeOrder: string[]; // combatant IDs in order
  currentActorIndex: number;
  log: CombatLogEntry[];
  summonedUnits: BattleCombatant[]; // temp units like chaos spawn
}

export interface BattleCombatant {
  instanceId: string;     // unique for this battle
  type: 'cult_member' | 'mythos_creature' | 'summon';
  sourceId: string;       // ID in database
  ringLevel: number;      // 教团环级 (1-7, 非教团成员=0)
  name: string;
  icon: string;
  side: 'player' | 'enemy';
  // Current battle stats
  currentHP: number;
  maxHP: number;
  currentMP: number;
  maxMP: number;
  currentSAN: number;
  baseAttributes: CharacterAttributes;
  enhancedAttributes: CharacterAttributes; // after physical enhancement
  skills: Record<string, number>;
  weapons: (WeaponDefinition & { currentAmmo?: number })[];
  knownSpells: SpellDefinition[];
  armor: number;
  isAlive: boolean;
  enhancement: PhysicalEnhancement;
  effects: CombatEffect[];
  isDefending: boolean;
  dodgedThisRound: boolean; // COC 7th: 每回合只能闪避一次
  actionUsed: boolean;      // 本回合是否已使用动作
  moveUsed: boolean;        // 本回合是否已移动
  cooldowns: Record<string, number>; // 恩赐冷却追踪
  boonUsage: Record<string, number>; // 恩赐使用次数追踪（如奈亚之声每战3次）
  hasRevived: boolean;      // 不朽面具·战场 是否已触发
  // 地图位置
  gridX: number;
  gridY: number;
  mov: number; // 每轮可移动格数
}

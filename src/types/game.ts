// COC7版角色属性
export interface CharacterAttributes {
  STR: number; // 力量
  CON: number; // 体质
  SIZ: number; // 体型
  DEX: number; // 敏捷
  APP: number; // 外貌
  INT: number; // 智力
  POW: number; // 意志
  EDU: number; // 教育
  LUCK: number; // 幸运
}

// 派生属性
export interface DerivedAttributes {
  HP: number; // 生命值
  maxHP: number; // 最大生命值
  MP: number; // 魔法值
  maxMP: number; // 最大魔法值
  SAN: number; // 理智值
  maxSAN: number; // 最大理智值
  MOV: number; // 移动力
  DB: string; // 伤害加值
  BUILD: number; // 体格
}

// 技能
export interface Skill {
  name: string;
  baseValue: number;    // 基础值
  currentValue: number; // 当前值（含分配）
  occupationPoints: number;  // 职业技能点投入
  interestPoints: number;    // 兴趣技能点投入
  category: 'combat' | 'investigation' | 'social' | 'other';
}

// 武器
export interface Weapon {
  id: string;
  name: string;
  skillUsed: string;  // 关联技能名（如"格斗"、"射击"、"投掷"）
  damage: string;      // 伤害公式
  range: string;        // 射程/范围
  attacks: number;      // 每轮攻击次数
  ammo?: number;        // 弹药量（如有）
  malfunction?: number; // 故障值（如有）
  notes: string;        // 特殊说明
}

// COC7版职业定义
export interface Occupation {
  id: string;
  name: string;
  description: string;
  skillPoints: string;  // 技能点公式描述
  creditRange: [number, number]; // 信用评级范围
  recommendedSkills: string[];  // 推荐技能（选8项）
  category: 'academic' | 'service' | 'criminal' | 'investigative' | 'combat' | 'other';
}

// 物品
export interface Item {
  id: string;
  name: string;
  description: string;
  quantity: number;
}

// 角色完整数据
export interface Character {
  id: string;
  name: string;
  age: number;
  sex: string;
  occupation: string;
  occupationId?: string;
  creditRating: number;
  background: string;
  portrait?: string;
  attributes: CharacterAttributes;
  derived: DerivedAttributes;
  skills: Skill[];
  weapons: Weapon[];
  items: Item[];
  createdAt: number;
}

// 检定难度
export type DifficultyLevel = 'regular' | 'hard' | 'extreme';

// 检定结果
export interface CheckResult {
  success: boolean;
  level: 'critical' | 'extreme' | 'hard' | 'regular' | 'fail' | 'fumble';
  roll: number;
  target: number;
  difficulty: DifficultyLevel;
}

// 剧本
export interface Scenario {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
  tags: string[];
}

// 游戏状态
export interface GameState {
  characterId: string | null;
  scenarioId: string | null;
  currentScene: string;
  conversationHistory: ChatMessage[];
  progress: number;
}

// 聊天消息
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

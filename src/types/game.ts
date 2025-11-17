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
  baseValue: number; // 基础值
  currentValue: number; // 当前值
  category: 'combat' | 'investigation' | 'social' | 'other';
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
  occupation: string;
  background: string;
  attributes: CharacterAttributes;
  derived: DerivedAttributes;
  skills: Skill[];
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

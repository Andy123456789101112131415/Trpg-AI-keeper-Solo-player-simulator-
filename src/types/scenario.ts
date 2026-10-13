// 阶段驱动固定模组的数据结构
// 固定模组 = 预先拆分好的"地点 → 阶段 → 描写 + NPC性格"数据库
// AI 只负责：定位阶段 + 润色描写 + 代入NPC对话，绝不编造事实

// ── NPC 定义（用于角色扮演对话）──
export interface StageNPC {
  id: string;
  name: string;
  // 该 NPC 在特定阶段的台词（原文，AI 只能基于这些润色/扮演）
  lines: string[];
  // 性格/说话风格提示（给 AI 用于润色）
  personality: string;
}

// ── 单个阶段 ──
export interface StageSection {
  id: string;
  title: string;             // 阶段名，如"接受委托"
  // 该阶段的描写原文（AI 需要润色后输出给玩家）
  description: string;
  // 该阶段包含的线索/物品/信息（需要检定/询问才揭示）
  clues: string[];
  // 该阶段需要的检定（若有）
  checks?: {
    skill: string;            // 技能名
    difficulty?: 'regular' | 'hard' | 'extreme';
    successText: string;      // 成功后揭示的内容
    failText?: string;        // 失败后的内容
  }[];
  // SAN 检定（若有）
  sanCheck?: {
    reason: string;           // 触发原因
    lossSuccess: string;      // 成功损失，如 "0" 或 "1D3"
    lossFail: string;         // 失败损失，如 "1D6"
  };
  // 该阶段可选的分支（根据玩家选择进入不同阶段）
  branches?: { label: string; targetStageId: string }[];
  // 该阶段出现的 NPC
  npcs?: StageNPC[];
  // 进入下一阶段的默认目标
  nextStageId?: string;
}

// ── 地点（可有多个阶段）──
export interface StageLocation {
  id: string;
  name: string;               // 地点名，如"金博尔家"
  // 地点外观描述（玩家到达时可见）
  exterior: string;
  // 该地点的所有阶段（按流程顺序）
  stages: StageSection[];
}

// ── 完整固定模组 ──
export interface FixedScenario {
  id: string;
  title: string;
  subtitle?: string;
  // 开场引入（玩家可见）
  playerIntro: string;
  // 开始地点
  startLocationId: string;
  // 地点列表
  locations: StageLocation[];
  // 全局规则/提示（给AI的系统级约束）
  globalRules: string;
}

// ── 运行时状态：当前进度 ──
export interface ScenarioProgress {
  scenarioId: string;
  currentLocationId: string;
  currentStageId: string;
  visitedStages: string[];    // 已完成的阶段
  unlockedClues: string[];    // 已揭示的线索
  npcStates: Record<string, string>; // NPC 状态（如"敌对"、"友好"）
}

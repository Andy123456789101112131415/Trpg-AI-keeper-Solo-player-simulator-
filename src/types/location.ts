// 通用"地点程序化"数据类型
// 每个地点 = 固定数据 + 固定的触发逻辑，AI 只负责在固定框架内润色语气，不随机生成内容
// 这是"死板程序"的核心：描写写死、表格写死、触发条件写死、答案写死

// ── 单个Q&A（触发条件 → 固定答案）──
export interface LocationQA {
  code: string;          // 代号（程序匹配用）
  matchHint: string;     // 给 AI 判断玩家输入是否命中的说明
  keywords: string[];    // 关键词辅助
  answer: string;        // 固定答案原文（AI 只能基于此润色，不得新增事实）
  // 玩家触发此Q&A时，一并展示的附件图片（如讣告、报道、日记）
  handouts?: Handout[];
  // 触发此Q&A即开启战斗（如攻击食尸鬼）——引擎据此返回 combat 标志
  combat?: boolean;
  // 原样输出（不经AI润色）：用于日记、文件、碑文等"实物文本"，内容长且需逐字呈现，避免被压缩转述
  raw?: boolean;
}

// ── 附件（给予玩家的图片/实物）──
export interface Handout {
  image: string;    // 图片路径（如 /images/handouts/xxx.png）
  caption: string;  // 图片说明（展示在图片下方）
}

// ── 单个检定 ──
export interface LocationCheck {
  code: string;          // 代号
  skill: string;         // 技能名
  difficulty?: 'regular' | 'hard' | 'extreme';
  // 夜晚时该检定难度升为困难（hard）
  nightHard?: boolean;
  triggerHint: string;   // 触发条件说明
  // 进入该地点时自动触发（无需玩家输入，切到本地点即触发一次）
  autoOnEnter?: boolean;
  // 成功/失败后的固定文本
  successText: string;
  failText?: string;
  // 检定成功时一并展示的附件图片
  handouts?: Handout[];
  // 是否SAN检定
  san?: {
    reason: string;
    lossSuccess: string;  // 如 "0"
    lossFail: string;     // 如 "1D6" / "1"
  };
  // 成功后的链式检定 code（如力量撬门成功后，自动触发下一个体质检定）
  nextCheckCode?: string;
  // 失败后的链式检定 code（如潜行失败被人看到，触发幸运检定）
  nextCheckCodeOnFail?: string;
  // 失败后切换到目标地点（如体质失败被臭晕，道格拉斯把你带回奥戴尔家地下室）
  failExitTo?: string;
  // 失败后切换地点的过渡文本（默认展示目标地点的 environment）
  failExitText?: string;
}

// ── 出口（地点切换）──
export interface LocationExit {
  toLocationId: string;  // 目标地点
  triggerHint: string;   // 触发条件说明（如"玩家表示要去金博尔家"）
  keywords: string[];    // 关键词
  transitionText: string; // 进入下一地点的过渡描写（固定）
}

// ── 单个地点 ──
export interface LocationData {
  id: string;
  name: string;
  // 进入该地点时展示的环境描写（静态，不经过AI）
  environment: string;
  // 进入时的主动信息（NPC开场白/简报，静态）
  briefing?: string;
  // NPC性格（供 AI 润色使用）
  npcPersona?: string;
  // 进入该地点时主动给予的附件（如警察局给调查员地图）
  onEnterHandouts?: Handout[];
  // Q&A 列表（触发后才揭示）
  qaList: LocationQA[];
  // 检定列表
  checks: LocationCheck[];
  // 出口列表（去哪、触发词、过渡文本）
  exits: LocationExit[];
}

// ── 运行时进度 ──
export interface LocationProgress {
  currentLocationId: string;
  answeredQA: Set<string>;   // 已答的QA代号
  doneChecks: Set<string>;   // 已完成的检定代号
  visited: string[];         // 走过的地点
  timeOfDay: 'day' | 'night'; // 当前昼夜
}

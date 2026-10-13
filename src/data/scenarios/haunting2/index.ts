// 追书人2：黑暗中的潜伏者 —— 固定模组入口
// 第一幕（警察局）由 policeEngine 驱动（严格Q&A，不喂内容给AI）
// 后续幕由 stageEngine 驱动（地点→阶段→描写原文润色）

import type { FixedScenario } from '@/types/scenario';

export const HAUNTING_2_SCENARIO: FixedScenario = {
  id: 'haunting-2',
  title: '追书人2：黑暗中的潜伏者',
  subtitle: 'Lurkers in the Dark',
  playerIntro: '', // 由 knowledge.ts 的 HAUNTING2_PLAYER_INTRO 提供
  startLocationId: 'police',
  globalRules: `你是COC跑团的守秘人(KP)。本模组为固定剧本，所有事实以剧本原文为准。
严格规则：
1. 只能基于剧本提供的描写原文/NPC台词/线索进行叙述，绝不编造原文没有的事实。
2. 线索仅在玩家检定成功或明确询问到对应条件时才揭示，不得提前泄露。
3. 需要检定时输出 [CHECK:技能名]，需要SAN检定时输出 [SAN_CHECK:原因]。`,
  locations: [
    {
      id: 'police',
      name: '阿诺兹堡警察局',
      exterior: '阿诺兹堡警察局是一栋灰扑扑的两层砖楼，坐落在这座小镇冷清的主街上。',
      // 第一幕由 policeEngine 独立驱动，这里仅作占位，stageEngine 不会被调用
      stages: [
        {
          id: 'police-qa',
          title: '警探托拜厄斯·斯特拉克曼的简报与问答',
          description: '警探托拜厄斯·斯特拉克曼向调查员简报金博尔失踪案，并回答调查员的问题。',
          clues: [],
        },
      ],
    },
  ],
};

// 追书人2：黑暗中的潜伏者（Lurkers in the Dark）
// 固定模组数据结构 —— 剧本原文待接入后填充完整

import type { FixedScenario } from '@/types/scenario';

// ⚠ 当前为占位骨架，等完整剧本转录后填充各阶段的 description/clues/checks

export const HAUNTING_2_SCENARIO: FixedScenario = {
  id: 'haunting-2',
  title: '追书人2：黑暗中的潜伏者',
  subtitle: 'Lurkers in the Dark',
  playerIntro: `**案件委托：金博尔失踪案**

*1927年，阿诺兹堡。你们接到警方的请求——本地牧师托马斯·金博尔在神秘且暴力的情况下失踪了。小镇警力有限，他们需要你们的帮助。*`.trim(),

  startLocationId: 'police-station',

  globalRules: `你是本模组的守秘人(KP)。严格遵循以下规则：
1. 只能基于当前阶段的描写原文进行叙述和润色，不得编造模组中不存在的内容。
2. 检定：D100 ≤ 技能=普通成功，≤技能/2=困难成功，≤技能/5=极难成功，1=大成功，100=大失败。
3. 模组中明确要求检定的地方，必须输出 [CHECK:技能名]。
4. SAN检定输出 [SAN_CHECK:原因] SAN损失 成功X/失败Y。
5. 代入NPC性格进行对话，但对话内容必须与模组预设一致。`,

  locations: [
    {
      id: 'police-station',
      name: '阿诺兹堡警察局',
      exterior: '阿诺兹堡警察局是一栋灰扑扑的两层小楼。接待台后坐着警探托拜厄斯·斯特拉克曼。',
      stages: [
        {
          id: 'police-briefing',
          title: '警局简报',
          description: '（待填：警探以什么方式向调查员简报案情，以及他主动透露的信息）',
          clues: [],
          npcs: [
            {
              id: 'detective-strackman',
              name: '托拜厄斯·斯特拉克曼警探',
              lines: [],
              personality: '疲惫、诚恳、语气沙哑的小镇警探，对超自然事件将信将疑。',
            },
          ],
          branches: [
            { label: '询问报警电话', targetStageId: 'police-briefing' },
            { label: '询问犯罪现场', targetStageId: 'police-briefing' },
            { label: '询问失踪细节', targetStageId: 'police-briefing' },
          ],
        },
      ],
    },
  ],
};

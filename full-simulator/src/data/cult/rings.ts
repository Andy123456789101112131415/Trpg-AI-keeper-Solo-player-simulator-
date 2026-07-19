// ═══════════════════════════════════════════════════════════
// 千面之门 · 七环定义
// ═══════════════════════════════════════════════════════════

import type { RingDefinition } from '@/types/cult';

export const SEVEN_RINGS: RingDefinition[] = [
  {
    level: 7,
    name: '未戴者',
    title: '不知情的棋子',
    maxMembers: null,
    description: '被教团渗透利用而不自知的普通人。捐款人、政治庇护者、医院院长、警察局长——他们甚至不觉得自己在侍奉任何存在。',
    knowledgeLevel: '完全不知道教团存在',
    role: '提供资源、庇护、情报的外围棋子',
    color: '#555566',
    icon: '👤',
    boons: ['无'],
    spellTier: null,
    promotionRequirement: '在毫不知情中完成一件"被设计好的任务"，证明其"可用性"，由五环以上成员引入启蒙。'
  },
  {
    level: 6,
    name: '蒙面者',
    title: '浅层信徒',
    maxMembers: null,
    description: '知道教团存在但只接触"正面教义"的普通信徒。参加每周集会，以为这是一个古老的神秘学社团，追求知识。',
    knowledgeLevel: '知道教团存在，只知道"正面教义"',
    role: '参加集会的普通信徒、缴纳会费的资助者',
    color: '#6666aa',
    icon: '🎭',
    boons: ['群星低语：每夜梦中接收模糊低语，次日一次智力/灵感检定+10%加值'],
    spellTier: null,
    promotionRequirement: '① 参与至少3次集体仪式 ② 背诵三段真理 ③ 献上"自愿的供奉"'
  },
  {
    level: 5,
    name: '持钥人',
    title: '受启信徒 / 行动骨干',
    maxMembers: null,
    description: '教团的武装力量、情报员、祭品收集者。已完成"黑色朝圣"，知道教团侍奉一位"古老的存在"，接触少量禁忌知识。',
    knowledgeLevel: '知道教团侍奉一位"古老的存在"，接触少量禁忌知识',
    role: '教团的武装力量、情报员、祭品收集者',
    color: '#4488aa',
    icon: '🗝',
    boons: [
      '黑法老之赐·第一重：可选择一项肉体强化（STR+20/APP-20、DEX+20/STR-10、获得1点临时护甲）',
      '可学习1个一环法术'
    ],
    spellTier: 1,
    promotionRequirement: '① 完成一次"黑色朝圣" ② 克苏鲁神话技能≥5% ③ 在集体仪式中成功引导一次能量（POW检定成功）'
  },
  {
    level: 4,
    name: '睁眼者',
    title: '正式祭司 / 执事',
    maxMembers: 99,
    description: '完整知晓教团侍奉奈亚拉托提普，阅读过核心典籍。主持地方集会、执行仪式、培养新成员。',
    knowledgeLevel: '完整知晓教团侍奉奈亚拉托提普，阅读过核心典籍',
    role: '主持地方集会、执行仪式、培养新成员',
    color: '#88aa44',
    icon: '👁',
    boons: [
      '黑法老之赐·第二重：可同时选择两项肉体强化',
      '千面之触：触摸目标额头制造幻象，迷惑1D3轮',
      '仪式主持权：可独立主持小型仪式',
      '可学习二环法术'
    ],
    spellTier: 2,
    promotionRequirement: '① 克苏鲁神话技能≥15% ② 成功培养至少3名六环以上成员 ③ 经历"面具试炼"'
  },
  {
    level: 3,
    name: '无声之舌',
    title: '传道者 / 地区主教',
    maxMembers: 13,
    description: '直接与奈亚拉托提普有过至少一次清晰对话。掌管一个城市/地区的教团网络（3-7个据点）。',
    knowledgeLevel: '直接与奈亚拉托提普有过至少一次清晰对话',
    role: '掌管一个城市/地区的教团网络',
    color: '#d4a830',
    icon: '👅',
    boons: [
      '黑法老之赐·第三重：全项肉体强化 + 黑暗视觉60英尺',
      '无声传讯：向视线内成员发送单向心灵传讯',
      '面具剥离：对抗POW读取目标深层欲望与恐惧',
      '可学习三环法术',
      '寂静领域：以自身为中心15米沉默区域(POW/5轮)，敌方施法成功率-30%，友方潜行+30%',
      '心灵低语：每回合一次POW对抗，向目标发送恐惧低语。失败→下回合行动-20% + 1D3 SAN损失',
      '舌之束缚：混沌之舌缠绕目标(STR对抗)，成功束缚1D3轮(无法移动/攻击-20%)，每3轮一次'
    ],
    spellTier: 3,
    promotionRequirement: '① 克苏鲁神话技能≥25% ② 管理的教区内成功完成一次"大型仪式" ③ 被教宗或两位枢机祭司同时认可'
  },
  {
    level: 2,
    name: '黄金面具',
    title: '枢机祭司',
    maxMembers: 3,
    description: '教团最高决策层，每人分管一个领域（知识、财富、武力、渗透等）。掌握教团全部核心秘密，能与奈亚直接对话。',
    knowledgeLevel: '掌握教团全部核心秘密，能与奈亚直接对话',
    role: '教团最高决策层',
    color: '#e87830',
    icon: '👑',
    boons: [
      '黑法老之赐·终极：所有低级恩赐效果翻倍，不再消耗SAN值',
      '千面化身：复制任意接触过的人的外貌/声音/行为，持续POW小时',
      '黑法老凝视·实战：POW对抗，失败→目标损失2D10 SAN + 下回合行动-30%。每2轮一次',
      '面具共鸣：场上每个睁眼者+成员→黄金面具护甲+1、闪避+5%（被动）',
      '禁术共鸣：四环法术MP/SAN消耗减半，施法成功概率+20%（被动）',
      '可学习四环禁忌法术'
    ],
    spellTier: 4,
    promotionRequirement: '由奈亚拉托提普亲自"拣选"（KP决定，通常在极端事件中发生）'
  },
  {
    level: 1,
    name: '千面之心',
    title: '教宗 / 先知',
    maxMembers: 1,
    description: '奈亚拉托提普在人间的第一代言者。教宗的脸不再是自己的——它在不断变化，每一刻都在模仿面前之人的面容。已经很难称之为"人类"。',
    knowledgeLevel: '？？？（已经很难称之为"人类"）',
    role: '奈亚拉托提普在人间的第一代言者',
    color: '#ff4444',
    icon: '💀',
    boons: [
      '奈亚之声·实战：POW对抗命令低等神话生物(servitor级)叛变1D3轮',
      '门之钥：拥有打开"门"的能力，能主动召唤奈亚的化身降临',
      '不朽面具·战场：首次HP归零时不会死亡，回复50%HP + 1回合无敌。每场战斗一次',
      '混沌面纱：10米内友方SAN检定+20%，敌方神话生物攻击-10%（被动光环）',
      '千面之触·升级：治疗友方1D6+2HP + 赋予临时变异(利爪1D4/鳞甲+1/夜视)，持续POW/5轮',
      '千面裂变·真容：展露奈亚真容→30米所有敌人SAN 1D6/2D10检定，持续1D3轮每轮再扣1D3 SAN。每战一次',
      '面具吞噬：POW对抗触碰目标，成功→2D6伤害+每轮CON检定否则眩晕1轮。每2轮一次',
      '终幕宣告：吟诵奈亚真名音节→所有敌人困难POW，失败→失去下回合行动。每3轮一次'
    ],
    spellTier: 4,
    promotionRequirement: '上一任教宗"被奈亚收回面具"之后，由黑法老亲自指定继任者。'
  }
];

// ── 辅助函数 ──
export function getRingByLevel(level: number): RingDefinition | undefined {
  return SEVEN_RINGS.find(r => r.level === level);
}

export function getRingColor(level: number): string {
  return getRingByLevel(level)?.color ?? '#888888';
}

export function getRingIcon(level: number): string {
  return getRingByLevel(level)?.icon ?? '❓';
}

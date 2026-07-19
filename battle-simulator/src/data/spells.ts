// ═══════════════════════════════════════════════════════════
// 千面之门 · 法术大全
// ═══════════════════════════════════════════════════════════

import type { SpellDefinition } from '@/types/cult';

export const ALL_SPELLS: SpellDefinition[] = [
  // ─── 一环法术：入门级（五环·持钥人可习得）───
  {
    id: 'black_pharaoh_touch',
    name: '黑法老的触碰',
    nameEn: 'The Black Pharaoh\'s Touch',
    tier: 1,
    description: '手掌变得漆黑，触碰无机物可使其在1D6轮内缓慢崩解——石头开裂、金属锈蚀、玻璃碎裂。可用于破门、销毁证据、破坏锁具。',
    effect: '触碰无机物，1D6轮内缓慢崩解。战斗中对目标造成1D6点结构伤害（无视护甲）。',
    cost: '3MP + 1/1D2 SAN',
    mpCost: 3,
    sanLoss: '1/1D2',
    castingCheck: 'POW检定',
    castingDifficulty: 'regular',
    skillUsed: 'POW',
    duration: '1D6轮',
    range: '接触',
    requirements: '五环·持钥人以上',
    combatUsable: true,
    combatEffect: 'black_pharaoh_touch'
  },
  {
    id: 'veil_of_dark',
    name: '暗夜之纱',
    nameEn: 'Veil of the Dark',
    tier: 1,
    description: '制造一片半径10英尺的黑暗区域，持续INT/5轮。普通光源无法穿透。施法者本人可以在黑暗中正常视物。',
    effect: '制造10英尺半径黑暗区域，施法者获得黑暗视觉。敌人攻击检定-20%。',
    cost: '2MP + 0/1 SAN',
    mpCost: 2,
    sanLoss: '0/1',
    castingCheck: 'POW检定',
    castingDifficulty: 'regular',
    skillUsed: 'POW',
    duration: 'INT/5轮',
    range: '自身周围10英尺',
    requirements: '五环·持钥人以上',
    combatUsable: true,
    combatEffect: 'veil_of_dark'
  },
  {
    id: 'whispered_message',
    name: '低语传讯',
    nameEn: 'Whispered Message',
    tier: 1,
    description: '向1英里内任意一个你认识的智慧生物传递一句话（对方会以耳语形式听到）。注意：奈亚有时会"偷听"并替换你的话（每次使用1%概率）。',
    effect: '远程传讯一句话。非战斗法术。',
    cost: '1MP + 0/1 SAN',
    mpCost: 1,
    sanLoss: '0/1',
    castingCheck: '自动成功',
    castingDifficulty: 'auto',
    skillUsed: 'POW',
    duration: '即时',
    range: '1英里',
    requirements: '五环·持钥人以上',
    combatUsable: false,
    combatEffect: 'whispered_message'
  },

  // ─── 二环法术：中级（四环·睁眼者可习得）───
  {
    id: 'mask_of_deceit',
    name: '面具伪装',
    nameEn: 'Mask of Deceit',
    tier: 2,
    description: '改变面部特征模仿一个曾接触过的特定人物，持续POW×10分钟。仅改变面容，不变声音。检定失败则面容随机扭曲，APP临时-30。',
    effect: '非战斗法术。伪装面容。',
    cost: '5MP + 1/1D4 SAN',
    mpCost: 5,
    sanLoss: '1/1D4',
    castingCheck: 'INT检定（困难）',
    castingDifficulty: 'hard',
    skillUsed: 'INT',
    duration: 'POW×10分钟',
    range: '自身',
    requirements: '四环·睁眼者以上',
    combatUsable: false,
    combatEffect: 'mask_of_deceit'
  },
  {
    id: 'dream_stride',
    name: '梦境行走',
    nameEn: 'Dream Stride',
    tier: 2,
    description: '主动进入一个你见过的人的梦境，可自由塑造梦境内容。目标醒来进行INT检定，成功则记住你的"访问"。在梦中会留下"气味"，其他梦境行者能追踪到你。',
    effect: '非战斗法术。进入他人梦境。',
    cost: '8MP + 1/1D4 SAN',
    mpCost: 8,
    sanLoss: '1/1D4',
    castingCheck: '入梦POW检定',
    castingDifficulty: 'regular',
    skillUsed: 'POW',
    duration: '至目标醒来',
    range: '任意距离（需见过目标）',
    requirements: '四环·睁眼者以上',
    combatUsable: false,
    combatEffect: 'dream_stride'
  },
  {
    id: 'summon_chaos_spawn',
    name: '召唤混沌眷属',
    nameEn: 'Summon Chaos Spawn',
    tier: 2,
    description: '召唤一只由原生混沌物质构成的生物为你服务。生物属性：STR60 CON50 SIZ40 DEX45 HP9，攻击：触手抽击1D6+DB。持续POW/5轮，之后混沌物质消散。',
    effect: '召唤一只混沌眷属作为临时友方单位加入战斗。STR60/CON50/SIZ40/HP9，持续POW/5轮。',
    cost: '10MP + 1/1D8 SAN',
    mpCost: 10,
    sanLoss: '1/1D8',
    castingCheck: 'POW对抗检定（vs 50）',
    castingDifficulty: 'regular',
    skillUsed: 'POW',
    duration: 'POW/5轮',
    range: '自身周围30英尺',
    requirements: '四环·睁眼者以上',
    combatUsable: true,
    combatEffect: 'summon_chaos_spawn'
  },

  // ─── 三环法术：高级（三环·无声之舌可习得）───
  {
    id: 'word_black_pharaoh',
    name: '黑法老圣言',
    nameEn: 'Word of the Black Pharaoh',
    tier: 3,
    description: '吟诵奈亚拉托提普的一个真名音节，释放毁灭性的精神冲击。30英尺半径内所有智慧生物POW对抗：失败者1D10 SAN+倒地昏迷1轮，成功者1D3 SAN+眩晕。施法者本人也必须进行POW对抗！',
    effect: '范围精神冲击。所有目标POW对抗，失败1D10 SAN+昏迷1轮，成功1D3 SAN+行动-20%。施法者本人也需对抗。',
    cost: '15MP + 2/2D6 SAN',
    mpCost: 15,
    sanLoss: '2/2D6',
    castingCheck: 'POW检定（极难，POW/5）',
    castingDifficulty: 'extreme',
    skillUsed: 'POW',
    duration: '即时',
    range: '半径30英尺',
    requirements: '三环·无声之舌以上',
    combatUsable: true,
    combatEffect: 'word_black_pharaoh'
  },
  {
    id: 'gate_sense',
    name: '门扉感知',
    nameEn: 'Gate Sense',
    tier: 3,
    description: '感知1英里内所有"薄弱之处"——现实与异界的缝隙、正在进行的召唤仪式、被诅咒的物品、神话力量活跃位置。持续POW分钟。每次使用后奈亚会注意到你。',
    effect: '非战斗法术。探测神话力量。',
    cost: '6MP + 1/1D3 SAN',
    mpCost: 6,
    sanLoss: '1/1D3',
    castingCheck: 'POW检定',
    castingDifficulty: 'regular',
    skillUsed: 'POW',
    duration: 'POW分钟',
    range: '1英里',
    requirements: '三环·无声之舌以上',
    combatUsable: false,
    combatEffect: 'gate_sense'
  },
  {
    id: 'flesh_sculpting',
    name: '血肉塑形',
    nameEn: 'Flesh Sculpting',
    tier: 3,
    description: '重塑一个自愿或无力抵抗的目标的肉体。可做到：①治愈重伤（回复1D6+2HP）②改变外貌特征 ③赋予生理变异（夜视/利爪/鳞甲）。赋予变异有10%累积概率产生"不可控突变"。',
    effect: '战斗中使用可回复目标1D6+2 HP，或赋予一项生理变异。10%概率不可控突变。',
    cost: '每项8MP + 1/1D4 SAN（目标额外1/1D6 SAN）',
    mpCost: 8,
    sanLoss: '1/1D4',
    castingCheck: 'INT检定（每项效果独立）',
    castingDifficulty: 'regular',
    skillUsed: 'INT',
    duration: '永久（变异）/ 即时（治疗）',
    range: '接触',
    requirements: '三环·无声之舌以上',
    combatUsable: true,
    combatEffect: 'flesh_sculpting'
  },

  // ─── 四环法术：禁忌级（二环·黄金面具可习得）───
  {
    id: 'avatar_black_pharaoh',
    name: '黑法老降临',
    nameEn: 'Avatar of the Black Pharaoh',
    tier: 4,
    description: '召唤奈亚拉托提普"黑法老"面相的化身！停留1D6+1轮。需要至少3名"睁眼者"以上协助引导，核心施法者克苏鲁神话≥30%。集体POW极难检定。这是终极仪式——意味着教团准备上演"终幕"。',
    effect: '召唤奈亚化身。战场级效果，接近即死。',
    cost: '全部MP（至少20）+ POW永久-5 + 3D10 SAN',
    mpCost: 20,
    sanLoss: '3D10',
    castingCheck: '集体POW检定（极难，取最低值）',
    castingDifficulty: 'extreme',
    skillUsed: 'POW',
    duration: '1D6+1轮',
    range: '仪式区域',
    requirements: '二环·黄金面具以上 + 至少3名睁眼者协助',
    combatUsable: true,
    combatEffect: 'avatar_black_pharaoh'
  },
  {
    id: 'eternal_mask',
    name: '永恒面具',
    nameEn: 'Eternal Mask',
    tier: 4,
    description: '将自身"人格"复制到一名自愿者的意识中。若施法者死亡，其意识将在该自愿者体内苏醒，覆盖后者的原有人格。施法者的脸永久刻印在目标面容上。每人最多保留一具"备用面具"。',
    effect: '非战斗法术。创建复活备份。',
    cost: 'POW永久-10 + 目标POW永久-5 + 2D10 SAN',
    mpCost: 0,
    sanLoss: '2D10',
    castingCheck: '施法者与目标各POW极难检定',
    castingDifficulty: 'extreme',
    skillUsed: 'POW',
    duration: '永久',
    range: '接触',
    requirements: '二环·黄金面具以上',
    combatUsable: false,
    combatEffect: 'eternal_mask'
  }
];

// ── 辅助函数 ──
export function getSpellById(id: string): SpellDefinition | undefined {
  return ALL_SPELLS.find(s => s.id === id);
}

export function getSpellsByTier(tier: number): SpellDefinition[] {
  return ALL_SPELLS.filter(s => s.tier === tier);
}

export function getCombatSpells(): SpellDefinition[] {
  return ALL_SPELLS.filter(s => s.combatUsable);
}

export function getLearnableSpells(ringLevel: number): SpellDefinition[] {
  return ALL_SPELLS.filter(s => s.tier <= (ringLevel >= 5 ? ringLevel - 4 : 0));
}

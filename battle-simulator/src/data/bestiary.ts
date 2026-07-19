// ═══════════════════════════════════════════════════════════
// 千面之门 · 神话生物图鉴
// ═══════════════════════════════════════════════════════════

import type { MythosCreature } from '@/types/cult';

export const BESTIARY: MythosCreature[] = [
  // ─── 深潜者（Deep One）───
  {
    id: 'deep_one',
    name: '深潜者',
    nameEn: 'Deep One',
    category: 'servitor',
    description: '侍奉大衮与克苏鲁的两栖类人生物，来自深海。灰绿色的滑腻皮肤，鱼头人身，指间有蹼，背部有脊鳍。力大无穷，永世不死，只会越长越大。他们与沿海人类交配，诞下可变形为深潜者的混血后代。',
    attributes: { STR: 65, CON: 60, SIZ: 70, DEX: 45, INT: 40, POW: 45, APP: 15, EDU: 25, LUCK: 30 },
    derived: { HP: 13, maxHP: 13, MP: 9, maxMP: 9, SAN: 45, maxSAN: 99, MOV: 8, DB: '+1D4', BUILD: 1 },
    skills: {
      '格斗(爪)': 60, '闪避': 30, '潜行': 50, '游泳': 80, '侦查': 35, '聆听': 40
    },
    weapons: [
      {
        id: 'deep_one_claw', name: '利爪', category: 'melee', skill: '格斗(爪)',
        damage: '1D6', range: 'melee', attacksPerRound: 2, malfunction: 0,
        impale: true, twoHanded: false, description: '锋利的指爪'
      },
      {
        id: 'deep_one_bite', name: '撕咬', category: 'melee', skill: '格斗(爪)',
        damage: '1D8', range: 'melee', attacksPerRound: 1, malfunction: 0,
        impale: true, twoHanded: false, description: '满口利齿的撕咬'
      }
    ],
    armor: 1,
    armorDescription: '滑腻坚韧的鳞片',
    sanLoss: '0/1D6',
    specialAbilities: [
      { name: '两栖', description: '可在水下无限呼吸，游泳速度极快', effect: '水下战斗无惩罚', cooldown: 0, currentCooldown: 0 },
      { name: '再生', description: '每轮回复1HP，除非受到火焰或强酸伤害', effect: '每轮开始回复1HP', cooldown: 0, currentCooldown: 0 }
    ],
    icon: '🐙',
    combatAI: 'aggressive'
  },

  // ─── 黑山羊幼崽（Dark Young）───
  {
    id: 'dark_young',
    name: '黑山羊幼崽',
    nameEn: 'Dark Young of Shub-Niggurath',
    category: 'servitor',
    description: '莎布·尼古拉丝的子嗣。外观如同一棵巨大的、扭曲的黑色树木，树冠由数十条粗壮的触手组成，每条触手末端都有吸盘状的"嘴"。树干底部有四条粗短的"腿"，行走时大地震颤。它们吸干受害者的体液，留下干瘪的空壳。',
    attributes: { STR: 110, CON: 80, SIZ: 140, DEX: 35, INT: 50, POW: 60, APP: 5, EDU: 15, LUCK: 25 },
    derived: { HP: 22, maxHP: 22, MP: 12, maxMP: 12, SAN: 60, maxSAN: 99, MOV: 8, DB: '+2D6', BUILD: 3 },
    skills: {
      '格斗(触手)': 65, '闪避': 20, '侦查': 45
    },
    weapons: [
      {
        id: 'dark_young_tentacle', name: '触手鞭击', category: 'melee', skill: '格斗(触手)',
        damage: '2D6', range: 'close', attacksPerRound: 4, malfunction: 0,
        impale: true, twoHanded: false, description: '每轮4次触手攻击，每次2D6伤害。命中后可缠绕目标（见吸血能力）。'
      }
    ],
    armor: 4,
    armorDescription: '厚实的树皮状外皮（4点护甲）',
    sanLoss: '1D3/1D10',
    specialAbilities: [
      { name: '吸血缠绕', description: '触手命中并缠绕目标后，每轮自动吸取1D6 STR', effect: '被缠绕目标每轮STR-1D6，自身回复等量HP。挣脱需与黑山羊幼崽进行STR对抗检定。', cooldown: 0, currentCooldown: 0 },
      { name: '践踏', description: '移动时可碾压路径上的小型目标', effect: '路径上目标需DEX检定（难度困难），失败则受2D6碾压伤害。此能力每2轮可使用一次。', cooldown: 2, currentCooldown: 0 }
    ],
    icon: '🦑',
    combatAI: 'berserk'
  },

  // ─── 食尸鬼（Ghoul）───
  {
    id: 'ghoul',
    name: '食尸鬼',
    nameEn: 'Ghoul',
    category: 'independent',
    description: '人形但非人的食腐生物，皮肤呈橡胶般的灰色，长着犬类的面部特征和蹄状的脚。它们出没于墓地、地下墓穴和古老的战场，以腐烂的尸体为食。食尸鬼有自己的语言和社会结构，有时与人类达成交易——用知识交换新鲜的尸体。',
    attributes: { STR: 60, CON: 55, SIZ: 55, DEX: 55, INT: 40, POW: 40, APP: 10, EDU: 25, LUCK: 25 },
    derived: { HP: 11, maxHP: 11, MP: 8, maxMP: 8, SAN: 40, maxSAN: 99, MOV: 9, DB: '+0', BUILD: 0 },
    skills: {
      '格斗(爪)': 50, '闪避': 40, '潜行': 60, '攀爬': 65, '侦查': 40
    },
    weapons: [
      {
        id: 'ghoul_claw', name: '利爪', category: 'melee', skill: '格斗(爪)',
        damage: '1D6', range: 'melee', attacksPerRound: 2, malfunction: 0,
        impale: true, twoHanded: false, description: '尖锐的爪'
      },
      {
        id: 'ghoul_bite', name: '撕咬', category: 'melee', skill: '格斗(爪)',
        damage: '1D4', range: 'melee', attacksPerRound: 1, malfunction: 0,
        impale: false, twoHanded: false, description: '沾满腐肉的牙'
      }
    ],
    armor: 0,
    armorDescription: '无',
    sanLoss: '0/1D6',
    specialAbilities: [
      { name: '地道穿梭', description: '可在地下隧道中快速移动', effect: '在墓地/地下场景中移动翻倍', cooldown: 0, currentCooldown: 0 },
      { name: '尸毒', description: '被咬伤的目标需CON检定', effect: '失败则感染尸毒，每24小时CON-1D3', cooldown: 0, currentCooldown: 0 }
    ],
    icon: '🦴',
    combatAI: 'cunning'
  },

  // ─── 米·戈（Mi-Go）───
  {
    id: 'mi_go',
    name: '米·戈',
    nameEn: 'Mi-Go / Fungi from Yuggoth',
    category: 'independent',
    description: '来自冥王星（犹格斯星）的星际种族。外观为约5英尺长的甲壳类生物，长有多对附肢和一对蝙蝠般的膜翼。它们不能说话，但能通过改变头部颜色来交流。米·戈是高超的外科医生，能将人类大脑取出放入"脑罐"中维持生命。',
    attributes: { STR: 50, CON: 55, SIZ: 50, DEX: 70, INT: 75, POW: 60, APP: 5, EDU: 65, LUCK: 40 },
    derived: { HP: 10, maxHP: 10, MP: 12, maxMP: 12, SAN: 60, maxSAN: 99, MOV: 7, DB: '+0', BUILD: 0 },
    skills: {
      '格斗(钳)': 55, '射击(电击枪)': 60, '闪避': 45, '侦查': 60, '潜行': 50
    },
    weapons: [
      {
        id: 'migo_claw', name: '蟹钳', category: 'melee', skill: '格斗(钳)',
        damage: '1D6', range: 'melee', attacksPerRound: 2, malfunction: 0,
        impale: true, twoHanded: false, description: '锋利的甲壳钳'
      },
      {
        id: 'migo_electric', name: '电击枪', category: 'firearm', skill: '射击(电击枪)',
        damage: '2D6', range: 'medium', attacksPerRound: 1, malfunction: 95,
        impale: false, twoHanded: true, description: '米·戈科技的麻痹武器，命中目标需CON检定否则麻痹1D4轮'
      }
    ],
    armor: 1,
    armorDescription: '几丁质甲壳',
    sanLoss: '0/1D6',
    specialAbilities: [
      { name: '飞行', description: '可利用膜翼飞行', effect: '移动时可无视地形，近战攻击需飞行至目标身边', cooldown: 0, currentCooldown: 0 },
      { name: '电击麻痹', description: '电击枪命中后目标需CON检定', effect: '失败则麻痹1D4轮，无法行动', cooldown: 3, currentCooldown: 0 },
      { name: '真空耐受', description: '不需要呼吸', effect: '免疫毒气和窒息效果', cooldown: 0, currentCooldown: 0 }
    ],
    icon: '🦀',
    combatAI: 'cunning'
  },

  // ─── 混沌眷属（Chaos Spawn - 可被召唤）───
  {
    id: 'chaos_spawn',
    name: '混沌眷属',
    nameEn: 'Chaos Spawn',
    category: 'servitor',
    description: '由原生混沌物质构成的临时生物体。外观为一团不断翻涌的暗紫色原生质，从中伸出数条半透明的触手。它没有固定的形态，没有思想，只有混沌的本能——吞噬和毁灭。被召唤出来后，在消散前会尽可能多地消灭敌人。',
    attributes: { STR: 60, CON: 50, SIZ: 40, DEX: 45, INT: 10, POW: 30, APP: 5, EDU: 0, LUCK: 0 },
    derived: { HP: 9, maxHP: 9, MP: 6, maxMP: 6, SAN: 30, maxSAN: 99, MOV: 7, DB: '+0', BUILD: 0 },
    skills: {
      '格斗(触手)': 55, '闪避': 25
    },
    weapons: [
      {
        id: 'spawn_tentacle', name: '触手抽击', category: 'melee', skill: '格斗(触手)',
        damage: '1D6', range: 'melee', attacksPerRound: 2, malfunction: 0,
        impale: false, twoHanded: false, description: '混沌触手的抽击'
      }
    ],
    armor: 1,
    armorDescription: '混沌物质（临时）',
    sanLoss: '0/1D3',
    specialAbilities: [
      { name: '不稳定形态', description: '每轮需进行CON检定', effect: '失败则受到1D3伤害（自身结构崩解）', cooldown: 0, currentCooldown: 0 },
      { name: '临时存在', description: '召唤后POW/5轮自动消散', effect: '倒计时结束后消失', cooldown: 0, currentCooldown: 0 }
    ],
    icon: '🌀',
    combatAI: 'aggressive'
  },

  // ─── 拜亚基（Byakhee）───
  {
    id: 'byakhee',
    name: '拜亚基',
    nameEn: 'Byakhee',
    category: 'servitor',
    description: '侍奉哈斯塔的星际飞行生物。外观像一只巨大的蝙蝠与昆虫的混合体，漆黑的膜翼展开可达20英尺。它们能在星际空间飞行，被某些咒文召唤后可作为坐骑，载着施法者穿越星空——前提是乘坐者能抵御太空的严寒与真空。',
    attributes: { STR: 75, CON: 55, SIZ: 70, DEX: 65, INT: 20, POW: 30, APP: 5, EDU: 15, LUCK: 25 },
    derived: { HP: 12, maxHP: 12, MP: 6, maxMP: 6, SAN: 30, maxSAN: 99, MOV: 5, DB: '+1D4', BUILD: 1 },
    skills: {
      '格斗(爪)': 55, '闪避': 40, '侦查': 35
    },
    weapons: [
      {
        id: 'byakhee_claw', name: '利爪', category: 'melee', skill: '格斗(爪)',
        damage: '1D8', range: 'melee', attacksPerRound: 2, malfunction: 0,
        impale: true, twoHanded: false, description: '钩状利爪'
      },
      {
        id: 'byakhee_bite', name: '吸血撕咬', category: 'melee', skill: '格斗(爪)',
        damage: '1D6', damageClose: '命中后每轮吸取1D4 STR', range: 'melee', attacksPerRound: 1,
        malfunction: 0, impale: false, twoHanded: false, description: '咬住后吸取血液'
      }
    ],
    armor: 2,
    armorDescription: '坚韧的皮革状皮肤',
    sanLoss: '1/1D6',
    specialAbilities: [
      { name: '飞行', description: '可在空中高速飞行', effect: '移动无视地形，近战需俯冲', cooldown: 0, currentCooldown: 0 },
      { name: '星际旅行', description: '可在真空中生存和飞行', effect: '不受真空和极端温度影响', cooldown: 0, currentCooldown: 0 }
    ],
    icon: '🦇',
    combatAI: 'aggressive'
  },

  // ─── 空鬼（Dimensional Shambler）───
  {
    id: 'dimensional_shambler',
    name: '空鬼',
    nameEn: 'Dimensional Shambler',
    category: 'independent',
    description: '来自其他维度的猎食者。外观为一只高大的人形生物，皮肤像是被剥掉后重新缝上的腐烂皮革，长着巨大的爪子和一张不成比例的、布满利齿的嘴。它能自由穿梭于维度之间，突然出现在猎物身后，将猎物拖入其他维度。',
    attributes: { STR: 80, CON: 65, SIZ: 85, DEX: 40, INT: 25, POW: 45, APP: 5, EDU: 10, LUCK: 20 },
    derived: { HP: 15, maxHP: 15, MP: 9, maxMP: 9, SAN: 45, maxSAN: 99, MOV: 7, DB: '+1D6', BUILD: 2 },
    skills: {
      '格斗(爪)': 60, '闪避': 30, '潜行': 55, '侦查': 35
    },
    weapons: [
      {
        id: 'shambler_claw', name: '巨爪', category: 'melee', skill: '格斗(爪)',
        damage: '2D6', range: 'melee', attacksPerRound: 2, malfunction: 0,
        impale: true, twoHanded: false, description: '巨型撕裂爪'
      }
    ],
    armor: 2,
    armorDescription: '厚实的异界皮革',
    sanLoss: '1D3/1D8',
    specialAbilities: [
      { name: '维度穿梭', description: '可在回合结束时消失', effect: '下回合在任何位置出现，攻击获得+20%加值', cooldown: 3, currentCooldown: 0 },
      { name: '维度拖拽', description: '被爪击贯穿的目标', effect: '需POW对抗，失败则被拖入其他维度1D4轮（期间无法行动）', cooldown: 4, currentCooldown: 0 }
    ],
    icon: '👹',
    combatAI: 'cunning'
  }
];

// ── 辅助函数 ──
export function getCreatureById(id: string): MythosCreature | undefined {
  return BESTIARY.find(c => c.id === id);
}

export function getCreaturesByCategory(category: string): MythosCreature[] {
  return BESTIARY.filter(c => c.category === category);
}

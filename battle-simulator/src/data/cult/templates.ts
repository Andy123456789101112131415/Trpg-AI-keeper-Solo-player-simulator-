// ═══════════════════════════════════════════════════════════
// 千面之门 · 各环成员标准模板
// ═══════════════════════════════════════════════════════════

import type { CultMember, PhysicalEnhancement, MaskResidue } from '@/types/cult';
import type { CharacterAttributes } from '@/types/game';
import { calculateDerivedAttributes } from '@/utils/gameLogic';
import { getWeaponById } from '@/data/weapons';

// ── 默认肉体强化（关闭状态）──
const defaultEnhancement: PhysicalEnhancement = {
  active: false,
  tier: 1,
  darkVision: false
};

// ── 默认面具残留（无）──
const defaultMaskResidue: MaskResidue = {
  current: 0,
  stage: 'none',
  stageDescription: '未受面具影响'
};

// ── 辅助：随机化属性（在基准值上下浮动±10%）──
function vary(val: number, pct: number = 0.1): number {
  const delta = Math.floor(val * pct);
  return val + Math.floor(Math.random() * (delta * 2 + 1)) - delta;
}

// ── 辅助：生成角色ID ──
let memberCounter = 0;
function genId(ring: number): string {
  memberCounter++;
  return `cult_r${ring}_${memberCounter}_${Date.now()}`;
}

// ═══════════════════════════════════════════════════════════
//  第七环：未戴者（被渗透利用的普通人）
//  完全不知道教团，无超自然能力
// ═══════════════════════════════════════════════════════════
export function createUnwearer(name?: string): CultMember {
  const names = ['王议员', '李院长', '陈局长', '赵董事', '钱行长', '孙教授'];
  const roles = ['政界庇护者', '医院管理者', '执法部门内线', '企业资助人', '金融机构联系人', '学术界外援'];
  const idx = Math.floor(Math.random() * names.length);

  const attrs: CharacterAttributes = {
    STR: vary(50), CON: vary(55), SIZ: vary(60), DEX: vary(50),
    APP: vary(60), INT: vary(65), POW: vary(45), EDU: vary(70), LUCK: vary(50)
  };

  return {
    id: genId(7),
    name: name || names[idx],
    ringLevel: 7, ringName: '未戴者', ringTitle: roles[idx],
    attributes: attrs,
    derived: calculateDerivedAttributes(attrs),
    skills: { '信用评级': vary(60), '说服': vary(45), '心理学': vary(35), '母语': vary(70), '侦查': vary(30), '闪避': vary(25) },
    weapons: [],
    knownSpells: [],
    enhancement: { ...defaultEnhancement },
    maskResidue: { ...defaultMaskResidue },
    isActive: true,
    appearance: '普通市民外貌，完全无异样。穿着得体，有一份体面的社会职业。',
    background: `社会地位良好的普通人，在毫不知情的情况下为教团提供资源或庇护。`
  };
}

// ═══════════════════════════════════════════════════════════
//  第六环：蒙面者（浅层信徒）
//  知道教团存在但只知"正面教义"，有群星低语
// ═══════════════════════════════════════════════════════════
export function createMaskedOne(name?: string): CultMember {
  const names = ['林明', '张华', '刘洋', '陈静', '杨帆', '吴桐'];
  const idx = Math.floor(Math.random() * names.length);

  const attrs: CharacterAttributes = {
    STR: vary(45), CON: vary(50), SIZ: vary(55), DEX: vary(50),
    APP: vary(55), INT: vary(60), POW: vary(50), EDU: vary(60), LUCK: vary(45)
  };

  const member: CultMember = {
    id: genId(6),
    name: name || names[idx],
    ringLevel: 6, ringName: '蒙面者', ringTitle: '浅层信徒',
    attributes: attrs,
    derived: calculateDerivedAttributes(attrs),
    skills: { '神秘学': vary(25), '图书馆使用': vary(30), '说服': vary(35), '母语': vary(60), '侦查': vary(25), '聆听': vary(30), '闪避': vary(25) },
    weapons: [],
    knownSpells: [],
    enhancement: { ...defaultEnhancement },
    maskResidue: { current: vary(1, 0.5), stage: 'mild', stageDescription: '仅梦到戴金面具' },
    isActive: true,
    appearance: '面容普通，眼神中偶尔闪过一丝狂热。"每周集会从不缺席。',
    background: `参加每周集会的普通信徒，缴纳会费。相信这是一个古老的神秘学社团，追求被遗忘的知识。已背诵三段真理。`
  };
  return member;
}

// ═══════════════════════════════════════════════════════════
//  第五环：持钥人（行动骨干）
//  知道侍奉"古老存在"，有黑法老之赐·第一重 + 1个一环法术
// ═══════════════════════════════════════════════════════════
export function createKeyholder(name?: string): CultMember {
  const names = ['暗刃', '影手', '铁面', '冷锋', '毒刺', '碎骨'];
  const idx = Math.floor(Math.random() * names.length);

  const attrs: CharacterAttributes = {
    STR: vary(55), CON: vary(55), SIZ: vary(60), DEX: vary(55),
    APP: vary(40), INT: vary(50), POW: vary(50), EDU: vary(45), LUCK: vary(40)
  };

  // 随机分配1个一环法术
  const tier1Spells = ['black_pharaoh_touch', 'veil_of_dark', 'whispered_message'];
  const knownSpells = [tier1Spells[Math.floor(Math.random() * tier1Spells.length)]];

  // 随机武器配置
  const weaponConfigs = [
    ['ritual_dagger'],
    ['ritual_dagger', 'revolver'],
    ['combat_knife'],
    ['brass_knuckles', 'throwing_knife'],
  ];
  const weapons = weaponConfigs[Math.floor(Math.random() * weaponConfigs.length)]
    .map(wid => ({ weaponId: wid, name: getWeaponById(wid)?.name || wid }));

  const member: CultMember = {
    id: genId(5),
    name: name || names[idx],
    ringLevel: 5, ringName: '持钥人', ringTitle: '行动骨干',
    attributes: attrs,
    derived: calculateDerivedAttributes(attrs),
    skills: { '格斗(斗殴)': vary(50), '射击(手枪)': vary(40), '潜行': vary(40), '闪避': vary(35), '侦查': vary(40), '克苏鲁神话': vary(5, 0.5), '聆听': vary(35) },
    weapons,
    knownSpells,
    enhancement: { active: false, tier: 1, darkVision: false },
    maskResidue: { current: vary(3, 0.3), stage: 'mild', stageDescription: '第1-3层：仅梦到戴金面具' },
    isActive: true,
    appearance: '身材精悍，眼神警觉。身上有仪式留下的细微疤痕。右手掌心有暗淡的金色印记。',
    background: `已完成"黑色朝圣"的教团战士。知道教团侍奉一位"古老的存在"，但不知其名为奈亚拉托提普。可以使用黑法老之赐短暂强化肉体。`
  };
  return member;
}

// ═══════════════════════════════════════════════════════════
//  第四环：睁眼者（正式祭司）
//  完整知晓奈亚，黑法老之赐·第二重 + 二环法术 + 仪式主持权
// ═══════════════════════════════════════════════════════════
export function createOpenEye(name?: string): CultMember {
  const names = ['赛特', '阿努比', '托特', '伊西', '奈芙', '荷鲁'];
  const idx = Math.floor(Math.random() * names.length);

  const attrs: CharacterAttributes = {
    STR: vary(45), CON: vary(50), SIZ: vary(55), DEX: vary(50),
    APP: vary(50), INT: vary(65), POW: vary(60), EDU: vary(60), LUCK: vary(40)
  };

  // 二环以下法术（含召唤混沌眷属）
  const knownSpells = ['black_pharaoh_touch', 'veil_of_dark', 'summon_chaos_spawn'];

  const weapons = [{ weaponId: 'ritual_staff', name: '仪式杖' }];

  const member: CultMember = {
    id: genId(4),
    name: name || names[idx],
    ringLevel: 4, ringName: '睁眼者', ringTitle: '正式祭司',
    attributes: attrs,
    derived: calculateDerivedAttributes(attrs),
    skills: { '格斗(斗殴)': vary(40), '神秘学': vary(50), '说服': vary(50), '闪避': vary(30), '克苏鲁神话': vary(15, 0.5), '心理学': vary(45), '聆听': vary(40), '侦查': vary(40) },
    weapons,
    knownSpells,
    enhancement: { active: false, tier: 2, darkVision: false },
    maskResidue: { current: vary(5, 0.3), stage: 'moderate', stageDescription: '第4-6层：醒来时脸上有短暂压痕' },
    isActive: true,
    appearance: '身着黑色祭司袍，胸前挂三瓣黄金面具吊坠。眼神深邃，仿佛能看穿人的灵魂。脸上偶尔可见面具压痕。',
    background: `完整知晓教团侍奉奈亚拉托提普的真相。阅读过核心典籍，经历过"面具试炼"。主持地方集会，可召唤混沌眷属作战。`
  };
  return member;
}

// ═══════════════════════════════════════════════════════════
//  第三环：无声之舌（地区主教）
//  与奈亚有过对话，黑法老之赐·第三重 + 三环法术
// ═══════════════════════════════════════════════════════════
export function createSilentTongue(name?: string): CultMember {
  const names = ['默言', '深渊', '永夜', '寂静', '无形'];
  const idx = Math.floor(Math.random() * names.length);

  const attrs: CharacterAttributes = {
    STR: vary(45), CON: vary(50), SIZ: vary(55), DEX: vary(50),
    APP: vary(55), INT: vary(70), POW: vary(70), EDU: vary(70), LUCK: vary(45)
  };

  const knownSpells = ['black_pharaoh_touch', 'veil_of_dark', 'summon_chaos_spawn',
    'word_black_pharaoh', 'flesh_sculpting'];

  const weapons = [{ weaponId: 'sword_cane', name: '杖中剑' }, { weaponId: 'silenced_pistol', name: '消音手枪' }];

  const member: CultMember = {
    id: genId(3),
    name: name || names[idx],
    ringLevel: 3, ringName: '无声之舌', ringTitle: '地区主教',
    attributes: attrs,
    derived: calculateDerivedAttributes(attrs),
    skills: { '格斗(斗殴)': vary(45), '神秘学': vary(60), '说服': vary(60), '闪避': vary(35), '克苏鲁神话': vary(25, 0.5), '心理学': vary(55), '聆听': vary(50), '侦查': vary(45) },
    weapons,
    knownSpells,
    enhancement: { active: false, tier: 3, darkVision: true },
    maskResidue: { current: vary(7, 0.2), stage: 'severe', stageDescription: '第7-9层：镜中的自己偶尔微笑...' },
    isActive: true,
    appearance: '面容苍白，嘴唇微紫。说话时声音有一种古怪的共鸣——仿佛有另一个人同时低语。瞳孔深处有暗金色微光。',
    background: `与奈亚拉托提普有过清晰对话的教团高层。掌管整个城市的教团网络，手下有3-7个据点。战斗中以寂静领域压制施法者，恐惧低语削弱敌人，混沌之舌束缚猎物——是教团最危险的控场法师。`
  };
  return member;
}

// ═══════════════════════════════════════════════════════════
//  第一环：千面之心（教宗/先知）
//  奈亚在人间的第一代言者，已经很难称之为"人类"
//  拥有全部下级恩赐 + 奈亚之声 + 门之钥 + 不朽面具
// ═══════════════════════════════════════════════════════════
export function createPontiff(name?: string): CultMember {
  const names = ['千面', '终幕', '永夜教皇', '混沌先知'];
  const idx = Math.floor(Math.random() * names.length);

  const attrs: CharacterAttributes = {
    STR: vary(55), CON: vary(60), SIZ: vary(55), DEX: vary(60),
    APP: vary(80), INT: vary(85), POW: vary(90), EDU: vary(85), LUCK: vary(55)
  };

  // 教宗掌握全部法术
  const knownSpells = [
    'black_pharaoh_touch', 'veil_of_dark', 'whispered_message',
    'mask_of_deceit', 'dream_stride', 'summon_chaos_spawn',
    'word_black_pharaoh', 'gate_sense', 'flesh_sculpting',
    'avatar_black_pharaoh', 'eternal_mask'
  ];

  const weapons = [
    { weaponId: 'sword_cane', name: '杖中剑' },
    { weaponId: 'heavy_pistol', name: '重型手枪' }
  ];

  const member: CultMember = {
    id: genId(1),
    name: name || names[idx],
    ringLevel: 1, ringName: '千面之心', ringTitle: '教宗 / 先知',
    attributes: attrs,
    derived: calculateDerivedAttributes(attrs),
    skills: {
      '格斗(斗殴)': vary(55), '射击(手枪)': vary(50),
      '神秘学': vary(85), '说服': vary(80), '闪避': vary(45),
      '克苏鲁神话': vary(45, 0.2), '心理学': vary(75),
      '聆听': vary(60), '侦查': vary(55), '母语': vary(85)
    },
    weapons,
    knownSpells,
    enhancement: { active: false, tier: 'ultimate' as const, darkVision: true },
    maskResidue: { current: vary(9, 0.05), stage: 'severe', stageDescription: '第7-9层：镜中的自己偶尔微笑...几乎已分不清面具与真容。' },
    isActive: true,
    appearance: '面容不断变化——每一刻都在模仿面前之人的面容。身着纯黑法老袍，头戴裂成三瓣的黄金面具。说话时声音层层叠叠，仿佛无数人在同时低语。',
    background: `奈亚拉托提普在人间的第一代言者。战斗中以千面裂变展露奈亚真容粉碎敌人理智，奈亚之声号令神话生物叛变，面具吞噬盗取目标面容，终幕宣告冻结全场。即使被杀也会在溃散后重组——不朽面具使其无法被凡人之手真正杀死。能以千面之触治疗信徒并赋予混沌变异，混沌面纱庇护教众。已经很难称之为"人类"——他是奈亚最得意的面具。`
  };
  return member;
}

// ═══════════════════════════════════════════════════════════
//  第二环：黄金面具（枢机祭司）
//  与奈亚直接对话，黑法老之赐·终极 + 四环法术
// ═══════════════════════════════════════════════════════════
export function createGoldenMask(name?: string): CultMember {
  const names = ['金色真理', '永恒面容', '混沌之声'];
  const idx = Math.floor(Math.random() * names.length);

  const attrs: CharacterAttributes = {
    STR: vary(50), CON: vary(55), SIZ: vary(55), DEX: vary(55),
    APP: vary(70), INT: vary(80), POW: vary(80), EDU: vary(80), LUCK: vary(50)
  };

  const knownSpells = ['black_pharaoh_touch', 'veil_of_dark', 'summon_chaos_spawn',
    'word_black_pharaoh', 'flesh_sculpting', 'avatar_black_pharaoh', 'eternal_mask'];

  const weapons = [{ weaponId: 'sword_cane', name: '杖中剑' }, { weaponId: 'heavy_pistol', name: '重型手枪' }];

  const member: CultMember = {
    id: genId(2),
    name: name || names[idx],
    ringLevel: 2, ringName: '黄金面具', ringTitle: '枢机祭司',
    attributes: attrs,
    derived: calculateDerivedAttributes(attrs),
    skills: { '格斗(斗殴)': vary(50), '射击(手枪)': vary(55), '神秘学': vary(75), '说服': vary(70), '闪避': vary(40), '克苏鲁神话': vary(35, 0.3), '心理学': vary(65), '聆听': vary(55), '侦查': vary(50) },
    weapons,
    knownSpells,
    enhancement: { active: false, tier: 'ultimate' as const, darkVision: true },
    maskResidue: { current: vary(8, 0.1), stage: 'severe', stageDescription: '第7-9层：镜中的自己偶尔微笑...' },
    isActive: true,
    appearance: '脸上始终戴着一张半透明的黄金面具，透过面具能看到模糊的面容——但那面容似乎属于不同的人。说话时声音平稳、优雅、充满说服力。',
    background: `教团最高决策层成员。能与奈亚拉托提普直接对话。战斗中以黑法老凝视粉碎敌人的理智，面具共鸣从下属身上汲取力量，对禁忌法术的精通使其能轻松施展四环禁术。可召唤黑法老化身降临——这才是最后的底牌。`
  };
  return member;
}

// ──────────────────────────────────────────────────────────
// 批量生成工厂函数
// ──────────────────────────────────────────────────────────

export interface CreateMemberOptions {
  name?: string;
  count?: number;
}

export function generateMembersForRing(ringLevel: number, count: number = 3): CultMember[] {
  const members: CultMember[] = [];
  const creators: Record<number, (n?: string) => CultMember> = {
    7: createUnwearer,
    6: createMaskedOne,
    5: createKeyholder,
    4: createOpenEye,
    3: createSilentTongue,
    2: createGoldenMask,
    1: createPontiff,
  };

  const creator = creators[ringLevel];
  if (!creator) return members;

  for (let i = 0; i < count; i++) {
    members.push(creator());
  }
  return members;
}

// 生成一个完整的教团（所有环各若干人）
export function generateFullCult(): Map<number, CultMember[]> {
  const cult = new Map<number, CultMember[]>();
  cult.set(7, generateMembersForRing(7, 5));
  cult.set(6, generateMembersForRing(6, 4));
  cult.set(5, generateMembersForRing(5, 3));
  cult.set(4, generateMembersForRing(4, 2));
  cult.set(3, generateMembersForRing(3, 1));
  cult.set(2, generateMembersForRing(2, 1));
  cult.set(1, []); // 教宗不自动生成，需手动添加
  return cult;
}

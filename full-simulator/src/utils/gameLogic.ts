import type { CharacterAttributes, DerivedAttributes, CheckResult, DifficultyLevel, Skill } from '@/types/game';

// 计算派生属性
export function calculateDerivedAttributes(attrs: CharacterAttributes): DerivedAttributes {
  const HP = Math.floor((attrs.CON + attrs.SIZ) / 10);
  const MP = Math.floor(attrs.POW / 5);
  const SAN = attrs.POW;
  
  // 计算移动力
  let MOV = 8;
  if (attrs.DEX < attrs.SIZ && attrs.STR < attrs.SIZ) {
    MOV = 7;
  } else if (attrs.DEX > attrs.SIZ && attrs.STR > attrs.SIZ) {
    MOV = 9;
  }

  // 计算伤害加值和体格
  const buildValue = attrs.STR + attrs.SIZ;
  let DB = '0';
  let BUILD = 0;
  
  if (buildValue <= 64) {
    DB = '-2';
    BUILD = -2;
  } else if (buildValue <= 84) {
    DB = '-1';
    BUILD = -1;
  } else if (buildValue <= 124) {
    DB = '0';
    BUILD = 0;
  } else if (buildValue <= 164) {
    DB = '+1D4';
    BUILD = 1;
  } else if (buildValue <= 204) {
    DB = '+1D6';
    BUILD = 2;
  } else {
    DB = '+2D6';
    BUILD = 3;
  }

  return {
    HP,
    maxHP: HP,
    MP,
    maxMP: MP,
    SAN,
    maxSAN: 99,
    MOV,
    DB,
    BUILD
  };
}

// 投掷骰子
export function rollDice(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

// 投掷百分骰
export function rollD100(): number {
  return Math.floor(Math.random() * 100) + 1;
}

// 检定判断
export function performCheck(roll: number, skillValue: number, difficulty: DifficultyLevel = 'regular'): CheckResult {
  let target = skillValue;
  
  // 根据难度调整目标值
  if (difficulty === 'hard') {
    target = Math.floor(skillValue / 2);
  } else if (difficulty === 'extreme') {
    target = Math.floor(skillValue / 5);
  }

  // 判断结果
  let level: CheckResult['level'];
  let success = false;

  if (roll === 1) {
    level = 'critical';
    success = true;
  } else if (roll === 100) {
    level = 'fumble';
    success = false;
  } else if (roll <= target) {
    success = true;
    if (roll <= Math.floor(skillValue / 5)) {
      level = 'extreme';
    } else if (roll <= Math.floor(skillValue / 2)) {
      level = 'hard';
    } else {
      level = 'regular';
    }
  } else {
    level = 'fail';
    success = false;
  }

  return {
    success,
    level,
    roll,
    target,
    difficulty
  };
}

// 生成随机属性值（3D6）→ STR/CON/DEX/APP/POW
export function rollAttribute(): number {
  return rollDice(6) + rollDice(6) + rollDice(6);
}

// 生成随机属性值（2D6+6）→ SIZ/INT/EDU
export function rollAttribute2D6(): number {
  return rollDice(6) + rollDice(6) + 6;
}

// 保留旧名兼容
export const rollAttributeEDU = rollAttribute2D6;
export const rollAttributeSIZ = rollAttribute2D6;
export const rollAttributeINT = rollAttribute2D6;

// 生成随机属性值（3D6×5）→ LUCK
export function rollAttributeLuck(): number {
  return (rollDice(6) + rollDice(6) + rollDice(6)) * 5;
}

// 全部九项属性 ×5 后的值
export function rollAllAttributes(): CharacterAttributes {
  return {
    STR: rollAttribute() * 5,
    CON: rollAttribute() * 5,
    SIZ: rollAttribute2D6() * 5,
    DEX: rollAttribute() * 5,
    APP: rollAttribute() * 5,
    INT: rollAttribute2D6() * 5,
    POW: rollAttribute() * 5,
    EDU: rollAttribute2D6() * 5,
    LUCK: rollAttributeLuck(),
  };
}

// COC7版默认技能列表
export const DEFAULT_SKILLS = [
  { name: '会计', baseValue: 5, category: 'investigation' },
  { name: '人类学', baseValue: 1, category: 'investigation' },
  { name: '估价', baseValue: 5, category: 'investigation' },
  { name: '考古学', baseValue: 1, category: 'investigation' },
  { name: '魅惑', baseValue: 15, category: 'social' },
  { name: '攀爬', baseValue: 20, category: 'other' },
  { name: '计算机使用', baseValue: 5, category: 'investigation' },
  { name: '信用评级', baseValue: 0, category: 'social' },
  { name: '克苏鲁神话', baseValue: 0, category: 'investigation' },
  { name: '乔装', baseValue: 5, category: 'other' },
  { name: '闪避', baseValue: 0, category: 'combat' },
  { name: '驾驶', baseValue: 20, category: 'other' },
  { name: '电气维修', baseValue: 10, category: 'other' },
  { name: '电子学', baseValue: 1, category: 'other' },
  { name: '话术', baseValue: 5, category: 'social' },
  { name: '格斗', baseValue: 25, category: 'combat' },
  { name: '射击', baseValue: 20, category: 'combat' },
  { name: '急救', baseValue: 30, category: 'other' },
  { name: '历史', baseValue: 5, category: 'investigation' },
  { name: '恐吓', baseValue: 15, category: 'social' },
  { name: '跳跃', baseValue: 20, category: 'other' },
  { name: '母语', baseValue: 0, category: 'social' },
  { name: '法律', baseValue: 5, category: 'investigation' },
  { name: '图书馆使用', baseValue: 20, category: 'investigation' },
  { name: '聆听', baseValue: 20, category: 'investigation' },
  { name: '开锁', baseValue: 1, category: 'other' },
  { name: '机械维修', baseValue: 10, category: 'other' },
  { name: '医学', baseValue: 1, category: 'other' },
  { name: '博物学', baseValue: 10, category: 'investigation' },
  { name: '领航', baseValue: 10, category: 'other' },
  { name: '神秘学', baseValue: 5, category: 'investigation' },
  { name: '操作重型机械', baseValue: 1, category: 'other' },
  { name: '说服', baseValue: 10, category: 'social' },
  { name: '精神分析', baseValue: 1, category: 'social' },
  { name: '心理学', baseValue: 10, category: 'social' },
  { name: '骑术', baseValue: 5, category: 'other' },
  { name: '妙手', baseValue: 10, category: 'other' },
  { name: '侦查', baseValue: 25, category: 'investigation' },
  { name: '潜行', baseValue: 20, category: 'other' },
  { name: '游泳', baseValue: 20, category: 'other' },
  { name: '投掷', baseValue: 20, category: 'combat' },
  { name: '追踪', baseValue: 10, category: 'investigation' }
] as const;

// ═══════════════════════════════════════════════════════════
// COC 7版完整职业列表（39个职业）
// ═══════════════════════════════════════════════════════════
export interface OccupationDef {
  id: string;
  name: string;
  description: string;
  skillPoints: string;           // 职业技能点公式（如 "EDU×2 + DEX×2"）
  creditRange: [number, number]; // [最低, 最高]
  recommendedSkills: string[];   // 推荐技能（必须选其中8项）
  category: string;
}

export const COC_OCCUPATIONS: OccupationDef[] = [
  // ── 学术类 ──
  { id: 'accountant', name: '会计', description: '财务记录、审计、税务专家', skillPoints: 'EDU×4', creditRange: [30, 70], recommendedSkills: ['会计','法律','图书馆使用','聆听','说服','侦查','外语','神秘学'], category: 'academic' },
  { id: 'archaeologist', name: '考古学家', description: '古代文明与遗迹的研究者', skillPoints: 'EDU×4', creditRange: [10, 40], recommendedSkills: ['考古学','历史','外语','图书馆使用','侦查','机械维修','领航','射击'], category: 'academic' },
  { id: 'doctor', name: '医生', description: '内外科医师，具备行医执照', skillPoints: 'EDU×4', creditRange: [30, 80], recommendedSkills: ['急救','医学','心理学','科学','药学','拉丁文','说服','生物学'], category: 'academic' },
  { id: 'engineer', name: '工程师', description: '建筑、机械或电气领域专家', skillPoints: 'EDU×4', creditRange: [30, 60], recommendedSkills: ['电气维修','机械维修','操作重型机械','科学','数学','图书馆使用','物理学','制图'], category: 'academic' },
  { id: 'librarian', name: '图书馆员', description: '图书管理与信息检索专家', skillPoints: 'EDU×4', creditRange: [9, 35], recommendedSkills: ['图书馆使用','会计','历史','外语','母语','计算机使用','电气维修','侦查'], category: 'academic' },
  { id: 'professor', name: '教授', description: '高等教育机构的学者', skillPoints: 'EDU×4', creditRange: [20, 70], recommendedSkills: ['图书馆使用','外语','心理学','历史','说服','神秘学','考古学','母语'], category: 'academic' },
  { id: 'psychologist', name: '心理学家', description: '心理评估与治疗专家', skillPoints: 'EDU×4', creditRange: [20, 60], recommendedSkills: ['心理学','精神分析','人类学','话术','说服','侦查','聆听','历史'], category: 'academic' },
  { id: 'researcher', name: '研究员', description: '实验室或田野调查人员', skillPoints: 'EDU×4', creditRange: [9, 30], recommendedSkills: ['图书馆使用','科学','计算机使用','外语','侦查','历史','神秘学','电子学'], category: 'academic' },
  { id: 'scientist', name: '科学家', description: '物理、化学、生物等自然科学研究者', skillPoints: 'EDU×4', creditRange: [20, 60], recommendedSkills: ['科学','图书馆使用','计算机使用','外语','电子学','博物学','数学','侦查'], category: 'academic' },
  // ── 执法/调查类 ──
  { id: 'detective', name: '侦探', description: '警方刑事调查人员', skillPoints: 'EDU×2 + DEX×2 或 STR×2', creditRange: [20, 50], recommendedSkills: ['话术','格斗','射击','法律','聆听','说服','侦查','潜行'], category: 'investigative' },
  { id: 'police', name: '警察', description: '巡逻与治安执法人员', skillPoints: 'EDU×2 + DEX×2 或 STR×2', creditRange: [9, 30], recommendedSkills: ['格斗','射击','急救','法律','聆听','心理学','侦查','驾驶'], category: 'investigative' },
  { id: 'pi', name: '私家侦探', description: '独立承接调查委托', skillPoints: 'EDU×2 + DEX×2 或 STR×2', creditRange: [9, 30], recommendedSkills: ['话术','摄影','法律','图书馆使用','开锁','侦查','潜行','追踪'], category: 'investigative' },
  { id: 'journalist', name: '记者', description: '新闻采访与报道', skillPoints: 'EDU×4', creditRange: [9, 30], recommendedSkills: ['话术','历史','图书馆使用','母语','外语','摄影','心理学','侦查'], category: 'investigative' },
  { id: 'spy', name: '间谍', description: '情报获取与秘密行动', skillPoints: 'EDU×2 + DEX×2 或 APP×2', creditRange: [20, 60], recommendedSkills: ['乔装','话术','射击','聆听','开锁','心理学','潜行','侦查'], category: 'investigative' },
  // ── 罪犯类 ──
  { id: 'burglar', name: '窃贼', description: '入室盗窃与潜行专家', skillPoints: 'EDU×2 + DEX×2', creditRange: [5, 40], recommendedSkills: ['估价','攀爬','闪避','开锁','妙手','潜行','侦查','聆听'], category: 'criminal' },
  { id: 'criminal', name: '罪犯', description: '各类犯罪活动参与者', skillPoints: 'EDU×2 + DEX×2 或 STR×2', creditRange: [5, 65], recommendedSkills: ['格斗','射击','恐吓','开锁','潜行','侦查','话术','心理学'], category: 'criminal' },
  { id: 'gangster', name: '黑帮', description: '有组织犯罪成员', skillPoints: 'EDU×2 + STR×2', creditRange: [9, 40], recommendedSkills: ['格斗','射击','恐吓','话术','驾驶','心理学','法律','潜行'], category: 'criminal' },
  // ── 服务类 ──
  { id: 'bartender', name: '酒保', description: '酒吧或餐厅调酒师', skillPoints: 'EDU×2 + APP×2', creditRange: [8, 25], recommendedSkills: ['话术','魅惑','格斗','聆听','心理学','侦查','急救','外语'], category: 'service' },
  { id: 'clergy', name: '牧师/神职人员', description: '宗教团体的神职者', skillPoints: 'EDU×4', creditRange: [9, 60], recommendedSkills: ['会计','历史','图书馆使用','聆听','外语','说服','心理学','神秘学'], category: 'service' },
  { id: 'driver', name: '司机', description: '出租车、货车等职业驾驶员', skillPoints: 'EDU×2 + DEX×2', creditRange: [9, 25], recommendedSkills: ['驾驶','聆听','机械维修','领航','侦查','急救','话术','电气维修'], category: 'service' },
  { id: 'nurse', name: '护士', description: '医院或诊所护理人员', skillPoints: 'EDU×4', creditRange: [9, 30], recommendedSkills: ['急救','聆听','医学','魅惑','心理学','科学','侦查','生物学'], category: 'service' },
  { id: 'salesperson', name: '推销员', description: '商品或服务销售人员', skillPoints: 'EDU×2 + APP×2', creditRange: [9, 40], recommendedSkills: ['会计','魅惑','话术','驾驶','聆听','心理学','潜行','妙手'], category: 'service' },
  // ── 军事/战斗类 ──
  { id: 'military', name: '军官', description: '军队现役或退役军官', skillPoints: 'EDU×2 + DEX×2 或 STR×2', creditRange: [20, 70], recommendedSkills: ['格斗','射击','急救','领航','心理学','潜行','侦查','驾驶'], category: 'combat' },
  { id: 'boxer', name: '拳击手', description: '职业或业余拳击运动员', skillPoints: 'EDU×2 + STR×2', creditRange: [5, 35], recommendedSkills: ['格斗','闪避','恐吓','跳跃','心理学','侦查','急救','游泳'], category: 'combat' },
  { id: 'firefighter', name: '消防员', description: '火灾救援与急救人员', skillPoints: 'EDU×2 + DEX×2 或 STR×2', creditRange: [9, 25], recommendedSkills: ['攀爬','闪避','急救','跳跃','机械维修','操作重型机械','驾驶','游泳'], category: 'combat' },
  // ── 艺术家/艺人 ──
  { id: 'actor', name: '演员', description: '戏剧、影视或舞台表演者', skillPoints: 'EDU×2 + APP×2', creditRange: [5, 70], recommendedSkills: ['魅惑','乔装','话术','心理学','历史','聆听','外语','摄影'], category: 'other' },
  { id: 'artist', name: '艺术家', description: '视觉艺术家（画家、雕塑家等）', skillPoints: 'EDU×2 + DEX×2 或 POW×2', creditRange: [5, 40], recommendedSkills: ['历史','博物学','摄影','心理学','侦查','乔装','估价','外语'], category: 'other' },
  { id: 'author', name: '作家', description: '小说、剧本或文章创作者', skillPoints: 'EDU×4', creditRange: [5, 30], recommendedSkills: ['母语','历史','图书馆使用','神秘学','外语','心理学','博物学','摄影'], category: 'other' },
  { id: 'musician', name: '音乐家', description: '乐器演奏或作曲家', skillPoints: 'EDU×2 + DEX×2 或 APP×2', creditRange: [5, 40], recommendedSkills: ['魅惑','话术','聆听','心理学','侦查','历史','外语','急救'], category: 'other' },
  { id: 'photographer', name: '摄影师', description: '专业摄影或新闻摄影', skillPoints: 'EDU×4', creditRange: [9, 30], recommendedSkills: ['摄影','侦查','心理学','话术','机械维修','电气维修','电子学','潜行'], category: 'other' },
  // ── 户外/冒险类 ──
  { id: 'athlete', name: '运动员', description: '职业或半职业运动员', skillPoints: 'EDU×2 + STR×2 或 DEX×2', creditRange: [9, 70], recommendedSkills: ['攀爬','跳跃','格斗','投掷','游泳','急救','闪避','侦查'], category: 'other' },
  { id: 'explorer', name: '探险家', description: '未知地域的探索者', skillPoints: 'EDU×2 + DEX×2 或 STR×2', creditRange: [30, 80], recommendedSkills: ['攀爬','急救','历史','跳跃','博物学','领航','外语','摄影'], category: 'other' },
  { id: 'pilot', name: '飞行员', description: '民航或军用飞机驾驶员', skillPoints: 'EDU×4', creditRange: [30, 60], recommendedSkills: ['领航','机械维修','电气维修','电子学','科学','驾驶','侦查','外语'], category: 'other' },
  { id: 'sailor', name: '水手', description: '商船或渔船船员', skillPoints: 'EDU×2 + DEX×2 或 STR×2', creditRange: [5, 20], recommendedSkills: ['攀爬','急救','机械维修','领航','驾驶','游泳','侦查','格斗'], category: 'other' },
  // ── 技术类 ──
  { id: 'programmer', name: '计算机程序员', description: '软件或系统开发人员', skillPoints: 'EDU×4', creditRange: [20, 60], recommendedSkills: ['计算机使用','电子学','图书馆使用','科学','电气维修','会计','侦查','外语'], category: 'other' },
  { id: 'hacker', name: '黑客', description: '计算机安全与渗透专家', skillPoints: 'EDU×4', creditRange: [5, 40], recommendedSkills: ['计算机使用','电子学','图书馆使用','开锁','侦查','潜行','心理学','法律'], category: 'criminal' },
  { id: 'mechanic', name: '机械师', description: '汽车、机器维修与改装', skillPoints: 'EDU×4', creditRange: [9, 30], recommendedSkills: ['机械维修','电气维修','电子学','操作重型机械','科学','驾驶','侦查','估价'], category: 'other' },
  // ── 其他 ──
  { id: 'farmer', name: '农民', description: '农业生产者', skillPoints: 'EDU×2 + STR×2 或 DEX×2', creditRange: [5, 20], recommendedSkills: ['博物学','机械维修','操作重型机械','驾驶','急救','追踪','投掷','射击'], category: 'other' },
  { id: 'lawyer', name: '律师', description: '法庭辩护与法律顾问', skillPoints: 'EDU×4', creditRange: [30, 80], recommendedSkills: ['法律','图书馆使用','话术','说服','心理学','会计','母语','历史'], category: 'academic' },
  { id: 'student', name: '学生', description: '大学或学院在读学生', skillPoints: 'EDU×2 + 任意×2', creditRange: [5, 20], recommendedSkills: ['图书馆使用','外语','计算机使用','历史','科学','考古学','博物学','聆听'], category: 'academic' },
];

// 计算职业技能点总额
export function calcOccupationPoints(attrs: CharacterAttributes, occ: OccupationDef): number {
  const edu = attrs.EDU || 0;
  const dex = attrs.DEX || 0;
  const str = attrs.STR || 0;
  const app = attrs.APP || 0;
  const pow = attrs.POW || 0;

  const formula = occ.skillPoints;
  if (formula.includes('EDU×4')) return edu * 4;
  if (formula.includes('EDU×2') && formula.includes('DEX×2')) return edu * 2 + dex * 2;
  if (formula.includes('EDU×2') && formula.includes('STR×2')) return edu * 2 + str * 2;
  if (formula.includes('EDU×2') && formula.includes('APP×2')) return edu * 2 + app * 2;
  if (formula.includes('EDU×2') && formula.includes('POW×2')) return edu * 2 + pow * 2;
  // 默认 EDU×4
  return edu * 4;
}

// 计算兴趣技能点
export function calcInterestPoints(attrs: CharacterAttributes): number {
  return (attrs.INT || 0) * 2;
}

// COC 7版武器列表
export interface WeaponDef {
  id: string;
  name: string;
  skillUsed: string;
  damage: string;
  range: string;
  attacks: number;
  ammo?: number;
  malfunction?: number;
  notes: string;
}

export const COC_WEAPONS: WeaponDef[] = [
  { id: 'unarmed', name: '徒手攻击（拳/踢）', skillUsed: '格斗', damage: '1D3+DB', range: '接触', attacks: 1, notes: '' },
  { id: 'knife', name: '小刀/匕首', skillUsed: '格斗', damage: '1D4+DB', range: '接触', attacks: 1, notes: '可投掷（使用投掷技能，1D4+半DB）' },
  { id: 'sword', name: '剑/军刀', skillUsed: '格斗', damage: '1D8+DB', range: '接触', attacks: 1, notes: '可招架' },
  { id: 'axe', name: '消防斧', skillUsed: '格斗', damage: '1D8+2+DB', range: '接触', attacks: 1, notes: '双手武器' },
  { id: 'club', name: '棍棒/球棒', skillUsed: '格斗', damage: '1D6+DB', range: '接触', attacks: 1, notes: '' },
  { id: 'brass', name: '指虎', skillUsed: '格斗', damage: '1D3+1+DB', range: '接触', attacks: 1, notes: '' },
  { id: 'pistol_22', name: '.22 手枪', skillUsed: '射击', damage: '1D6', range: '10米', attacks: 1, ammo: 6, malfunction: 100, notes: '' },
  { id: 'pistol_38', name: '.38 转轮手枪', skillUsed: '射击', damage: '1D10', range: '15米', attacks: 1, ammo: 6, malfunction: 100, notes: '' },
  { id: 'pistol_45', name: '.45 自动手枪', skillUsed: '射击', damage: '1D10+2', range: '15米', attacks: 1, ammo: 7, malfunction: 100, notes: '' },
  { id: 'shotgun', name: '12号霰弹枪（双管）', skillUsed: '射击', damage: '4D6/2D6/1D6', range: '10/20/50米', attacks: 1, ammo: 2, malfunction: 100, notes: '双管齐射8D6' },
  { id: 'rifle', name: '.30 杠杆式步枪', skillUsed: '射击', damage: '2D6', range: '50米', attacks: 1, ammo: 6, malfunction: 100, notes: '' },
  { id: 'rifle_bolt', name: '.303 栓动步枪', skillUsed: '射击', damage: '2D6+4', range: '110米', attacks: 1, ammo: 5, malfunction: 100, notes: '' },
  { id: 'smg', name: '汤普森冲锋枪', skillUsed: '射击', damage: '1D10+2', range: '20米', attacks: 1, ammo: 30, malfunction: 96, notes: '可连射（惩罚骰）' },
  { id: 'bow', name: '弓', skillUsed: '射击', damage: '1D6+半DB', range: '30米', attacks: 1, notes: '无声' },
  { id: 'spear', name: '矛', skillUsed: '投掷', damage: '1D8+半DB', range: 'STR÷5 米', attacks: 1, notes: '或格斗(1D6+DB)' },
  { id: 'rock', name: '投石', skillUsed: '投掷', damage: '1D4+半DB', range: 'STR÷5 米', attacks: 1, notes: '' },
];

// 初始化技能（带分配点数）
export function initSkills(_occ: OccupationDef): Skill[] {
  return DEFAULT_SKILLS.map(s => ({
    name: s.name,
    baseValue: s.baseValue,
    currentValue: s.baseValue,
    occupationPoints: 0,
    interestPoints: 0,
    category: s.category as Skill['category'],
  } as Skill));
}

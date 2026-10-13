// ═══════════════════════════════════════════════════════════
// 千面之门 · 武器库
// ═══════════════════════════════════════════════════════════

import type { WeaponDefinition } from '@/types/cult';

export const WEAPON_DB: WeaponDefinition[] = [
  // ─── 近战武器 ───
  {
    id: 'ritual_dagger', name: '仪式匕首', category: 'melee',
    skill: '斗殴', damage: '1D4+1', range: 'melee', attacksPerRound: 1,
    malfunction: 0, impale: true, twoHanded: false,
    description: '千面之门制式仪式匕首，刀刃上刻有逆写象形文字。'
  },
  {
    id: 'ritual_staff', name: '仪式杖', category: 'melee',
    skill: '斗殴', damage: '1D6', range: 'melee', attacksPerRound: 1,
    malfunction: 0, impale: false, twoHanded: true,
    description: '黑色硬木制成的长杖，顶端镶嵌黑曜石。睁眼者以上级别的身份象征。'
  },
  {
    id: 'brass_knuckles', name: '指虎', category: 'melee',
    skill: '斗殴', damage: '1D3+1', range: 'melee', attacksPerRound: 1,
    malfunction: 0, impale: false, twoHanded: false,
    description: '金属指虎，增强拳击威力。'
  },
  {
    id: 'combat_knife', name: '战斗匕首', category: 'melee',
    skill: '斗殴', damage: '1D4+2', range: 'melee', attacksPerRound: 1,
    malfunction: 0, impale: true, twoHanded: false,
    description: '标准战斗匕首，可靠耐用。'
  },
  {
    id: 'breaching_hammer', name: '破门锤', category: 'melee',
    skill: '斗殴', damage: '1D8', range: 'melee', attacksPerRound: 1,
    malfunction: 0, impale: false, twoHanded: true,
    description: '重型破门锤，既可破门也可破人。'
  },
  {
    id: 'sword_cane', name: '杖中剑', category: 'melee',
    skill: '斗殴', damage: '1D6', range: 'melee', attacksPerRound: 1,
    malfunction: 0, impale: true, twoHanded: false,
    description: '隐藏在手杖中的细剑，教团高层偏爱的优雅武器。'
  },

  // ─── 手枪 ───
  {
    id: 'revolver', name: '左轮手枪', category: 'firearm',
    skill: '射击(手枪)', damage: '1D10', range: 'medium', rangeYards: 15,
    attacksPerRound: 2, ammo: 6, maxAmmo: 6, malfunction: 100,
    impale: true, twoHanded: false,
    description: '经典的6发左轮手枪，可靠且致命。'
  },
  {
    id: 'silenced_pistol', name: '消音手枪', category: 'firearm',
    skill: '射击(手枪)', damage: '1D8', range: 'medium', rangeYards: 15,
    attacksPerRound: 2, ammo: 10, maxAmmo: 10, malfunction: 99,
    impale: true, twoHanded: false,
    description: '带消音器的半自动手枪，适合隐秘行动。'
  },
  {
    id: 'heavy_pistol', name: '重型手枪', category: 'firearm',
    skill: '射击(手枪)', damage: '1D10+2', range: 'medium', rangeYards: 15,
    attacksPerRound: 1, ammo: 7, maxAmmo: 7, malfunction: 98,
    impale: true, twoHanded: false,
    description: '.45口径重型手枪，停止力极强。'
  },

  // ─── 霰弹枪 ───
  {
    id: 'sawn_off_shotgun', name: '锯短霰弹枪', category: 'firearm',
    skill: '射击(霰弹枪)', damage: '4D6', damageClose: '4D6', damageFar: '2D6',
    range: 'close', rangeYards: 10, attacksPerRound: 1,
    ammo: 2, maxAmmo: 2, malfunction: 100,
    impale: false, twoHanded: true,
    description: '锯短枪管的双管霰弹枪，近距离毁灭性火力。'
  },
  {
    id: 'pump_shotgun', name: '泵动式霰弹枪', category: 'firearm',
    skill: '射击(霰弹枪)', damage: '4D6', damageClose: '4D6', damageFar: '2D6',
    range: 'close', rangeYards: 10, attacksPerRound: 1,
    ammo: 6, maxAmmo: 6, malfunction: 99,
    impale: false, twoHanded: true,
    description: '泵动式霰弹枪，弹容量更大，火力持续性更好。'
  },

  // ─── 步枪 ───
  {
    id: 'sniper_rifle', name: '定制狙击步枪', category: 'firearm',
    skill: '射击(步枪)', damage: '2D10', range: 'long', rangeYards: 200,
    attacksPerRound: 1, ammo: 5, maxAmmo: 5, malfunction: 98,
    impale: true, twoHanded: true,
    description: '高精度定制狙击步枪，配备光学瞄准镜。远距离一击必杀。'
  },
  {
    id: 'assault_rifle', name: '突击步枪', category: 'firearm',
    skill: '射击(步枪)', damage: '2D6', range: 'long', rangeYards: 90,
    attacksPerRound: 2, ammo: 30, maxAmmo: 30, malfunction: 97,
    impale: true, twoHanded: true,
    description: '军用突击步枪，可单发或连发。连发时攻击+10%但消耗3发弹药。'
  },

  // ─── 投掷/特殊 ───
  {
    id: 'throwing_knife', name: '投掷匕首', category: 'thrown',
    skill: '投掷', damage: '1D4', range: 'medium', rangeYards: 10,
    attacksPerRound: 1, malfunction: 0,
    impale: true, twoHanded: false,
    description: '轻量投掷匕首，教团刺客常备。'
  },
  {
    id: 'molotov', name: '燃烧瓶', category: 'thrown',
    skill: '投掷', damage: '2D6', range: 'medium', rangeYards: 10,
    attacksPerRound: 1, malfunction: 95,
    impale: false, twoHanded: false,
    description: '自制燃烧瓶，命中后造成持续火焰伤害（每轮1D6，持续1D4轮）。'
  }
];

// ── 辅助函数 ──
export function getWeaponById(id: string): WeaponDefinition | undefined {
  return WEAPON_DB.find(w => w.id === id);
}

export function getWeaponsByCategory(cat: string): WeaponDefinition[] {
  return WEAPON_DB.filter(w => w.category === cat);
}

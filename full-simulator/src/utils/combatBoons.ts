// ═══════════════════════════════════════════════════════════
// COC 7th · 教团高位恩赐战斗系统
// ═══════════════════════════════════════════════════════════

import type { BattleCombatant, CombatLogEntry } from '@/types/cult';
import { skillCheck, opposedCheck, rollD, rollDamage } from './dice';
import type { SkillCheckResult } from './dice';
import { isInRange } from './mapEngine';

// ── 恩赐定义 ──
export interface CombatBoon {
  id: string;
  name: string;
  ringLevel: number;  // 该环专属（只能被<=此环级的角色使用）
  description: string;
  isActive: boolean;  // true=主动使用, false=被动
  mpCost: number;     // MP消耗
  cooldown: number;    // 冷却回合数
  maxUses?: number;    // 每场战斗最大使用次数
  targetType: 'enemy' | 'ally' | 'self' | 'all_enemies' | 'none';
  execute: (caster: BattleCombatant, target: BattleCombatant, round: number, allEnemies?: BattleCombatant[]) => BoonResult;
}

export interface BoonResult {
  log: CombatLogEntry;
  casterChanges: Partial<BattleCombatant>;
  targetChanges?: Partial<BattleCombatant>;
  allEnemyChanges?: Partial<BattleCombatant>[]; // for AoE
  killed?: boolean;
  diceLabel?: string;
  diceRoll?: SkillCheckResult;
}

// ── 工具函数 ──
function mkLog(actor: BattleCombatant, round: number, detail: string, result: string = 'spell'): CombatLogEntry {
  return {
    id: `boon_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
    timestamp: Date.now(), round,
    actorName: actor.name, actorSide: actor.side,
    action: 'spell', detail, result: result as any
  };
}

// ═══════════════════════════════════════════════════════════
//  第三环 · 无声之舌
// ═══════════════════════════════════════════════════════════

const silentField: CombatBoon = {
  id: 'silent_field', name: '寂静领域', ringLevel: 3,
  description: '15米沉默区域(POW/5轮)，敌方施法-30%，友方潜行+30%',
  isActive: true, mpCost: 5, cooldown: 0, targetType: 'none',
  execute: (caster, _, round) => {
    const dur = Math.floor(caster.baseAttributes.POW / 5);
    return {
      log: mkLog(caster, round, `${caster.name}展开寂静领域！15米内敌方施法-30%，持续${dur}轮`, 'spell'),
      casterChanges: {
        effects: [...caster.effects, { id: 'silent_field', name: '寂静领域', duration: dur, statModifiers: {}, description: '15m沉默区' }]
      }
    };
  }
};

const mindWhisper: CombatBoon = {
  id: 'mind_whisper', name: '心灵低语', ringLevel: 3,
  description: 'POW对抗恐惧低语，失败→行动-20%+1D3 SAN',
  isActive: true, mpCost: 3, cooldown: 1, targetType: 'enemy',
  execute: (caster, target, round) => {
    const opposed = opposedCheck(caster.baseAttributes.POW, target.baseAttributes.POW);
    if (opposed.attackerWins) {
      const sanLoss = rollD(3);
      return {
        log: mkLog(caster, round, `${caster.name}对${target.name}低语！POW对抗成功→目标-20%行动+${sanLoss} SAN损失`, 'spell'),
        casterChanges: {},
        targetChanges: {
          currentSAN: Math.max(0, target.currentSAN - sanLoss),
          effects: [...target.effects, { id: 'mind_whispered', name: '恐惧低语', duration: 1, statModifiers: { DEX: -10 }, description: '行动-20%' }]
        },
        diceLabel: '心灵低语',
        diceRoll: { roll: opposed.attackerRoll, skillValue: caster.baseAttributes.POW, target: target.baseAttributes.POW, difficulty: 'regular', level: opposed.attackerLevel, success: true, isImpale: false }
      };
    }
    return {
      log: mkLog(caster, round, `${caster.name}对${target.name}低语...POW对抗失败`, 'miss'),
      casterChanges: {}
    };
  }
};

const tongueBind: CombatBoon = {
  id: 'tongue_bind', name: '舌之束缚', ringLevel: 3,
  description: 'STR对抗缠绕1D3轮(无法移动/攻击-20%)',
  isActive: true, mpCost: 8, cooldown: 3, targetType: 'enemy',
  execute: (caster, target, round) => {
    const opposed = opposedCheck(caster.baseAttributes.STR, target.baseAttributes.STR);
    if (opposed.attackerWins) {
      const dur = rollD(3);
      return {
        log: mkLog(caster, round, `${caster.name}的混沌之舌缠绕${target.name}！束缚${dur}轮`, 'spell'),
        casterChanges: {},
        targetChanges: {
          effects: [...target.effects, { id: 'tongue_bound', name: '舌之束缚', duration: dur, statModifiers: { DEX: -20, STR: -20 }, description: '无法移动/攻击-20%' }]
        },
        diceLabel: '舌之束缚',
        diceRoll: { roll: opposed.attackerRoll, skillValue: caster.baseAttributes.STR, target: target.baseAttributes.STR, difficulty: 'regular', level: opposed.attackerLevel, success: true, isImpale: false }
      };
    }
    return { log: mkLog(caster, round, `${caster.name}的混沌之舌未能缠住${target.name}`, 'miss'), casterChanges: {} };
  }
};

// ═══════════════════════════════════════════════════════════
//  第二环 · 黄金面具
// ═══════════════════════════════════════════════════════════

const pharaohGaze: CombatBoon = {
  id: 'pharaoh_gaze', name: '黑法老凝视', ringLevel: 2,
  description: 'POW对抗，失败→2D10 SAN+下回合行动-30%',
  isActive: true, mpCost: 10, cooldown: 2, targetType: 'enemy',
  execute: (caster, target, round) => {
    const opposed = opposedCheck(caster.baseAttributes.POW, target.baseAttributes.POW);
    if (opposed.attackerWins) {
      const sanLoss = rollD(10) + rollD(10);
      return {
        log: mkLog(caster, round, `${caster.name}凝视${target.name}！损失${sanLoss} SAN + 下回合行动-30%`, 'spell'),
        casterChanges: {},
        targetChanges: {
          currentSAN: Math.max(0, target.currentSAN - sanLoss),
          effects: [...target.effects, { id: 'pharaoh_gazed', name: '黑法老凝视', duration: 2, statModifiers: { DEX: -15 }, description: '行动-30%' }]
        },
        diceLabel: '黑法老凝视',
        diceRoll: { roll: opposed.attackerRoll, skillValue: caster.baseAttributes.POW, target: target.baseAttributes.POW, difficulty: 'regular', level: opposed.attackerLevel, success: true, isImpale: false }
      };
    }
    return { log: mkLog(caster, round, `${caster.name}凝视${target.name}...被抵抗了`, 'miss'), casterChanges: {} };
  }
};

// ═══════════════════════════════════════════════════════════
//  第一环 · 千面之心
// ═══════════════════════════════════════════════════════════

const nyarVoice: CombatBoon = {
  id: 'nyar_voice', name: '奈亚之声', ringLevel: 1,
  description: 'POW对抗命令servitor叛变1D3轮',
  isActive: true, mpCost: 8, cooldown: 0, maxUses: 3, targetType: 'enemy',
  execute: (caster, target, round) => {
    // 只对servitor级有效
    if (target.type !== 'mythos_creature') {
      return { log: mkLog(caster, round, `${caster.name}的奈亚之声对${target.name}无效（非神话生物）`, 'miss'), casterChanges: {} };
    }
    const opposed = opposedCheck(caster.baseAttributes.POW, target.baseAttributes.POW);
    if (opposed.attackerWins) {
      const dur = rollD(3);
      // 叛变：将目标side切换，但实际上改side很复杂，简化为添加控制效果
      return {
        log: mkLog(caster, round, `💀 ${caster.name}以奈亚之声号令${target.name}叛变！持续${dur}轮`, 'spell'),
        casterChanges: {},
        targetChanges: {
          effects: [...target.effects, { id: 'nyar_controlled', name: '奈亚号令', duration: dur, statModifiers: {}, description: '被教宗控制，攻击友方' }]
        },
        diceLabel: '奈亚之声',
        diceRoll: { roll: opposed.attackerRoll, skillValue: caster.baseAttributes.POW, target: target.baseAttributes.POW, difficulty: 'regular', level: opposed.attackerLevel, success: true, isImpale: false }
      };
    }
    return { log: mkLog(caster, round, `${caster.name}的奈亚之声未能控制${target.name}`, 'miss'), casterChanges: {} };
  }
};

const faceRend: CombatBoon = {
  id: 'face_rend', name: '千面裂变', ringLevel: 1,
  description: '展露奈亚真容→30米AOE SAN 1D6/2D10，持续1D3轮',
  isActive: true, mpCost: 15, cooldown: 0, maxUses: 1, targetType: 'all_enemies',
  execute: (caster, _, round, allEnemies) => {
    const enemies = allEnemies || [];
    const dur = rollD(3);
    const changes: Partial<BattleCombatant>[] = [];
    let totalSanLoss = 0;
    enemies.forEach(e => {
      const sanCheck = skillCheck(e.baseAttributes.POW, 'regular');
      const loss = sanCheck.success ? rollD(6) : rollD(10) + rollD(10);
      totalSanLoss += loss;
      changes.push({
        currentSAN: Math.max(0, e.currentSAN - loss),
        effects: [...e.effects, { id: 'face_rend', name: '真容灼烧', duration: dur, statModifiers: {}, description: '每轮再扣1D3 SAN' }]
      });
    });
    return {
      log: mkLog(caster, round, `💀 ${caster.name}展露奈亚真容！全场${enemies.length}名敌人共损失${totalSanLoss} SAN，持续${dur}轮每轮再扣1D3`, 'spell'),
      casterChanges: {
        effects: [...caster.effects, { id: 'face_rend_caster', name: '千面裂变', duration: dur, statModifiers: {}, description: '真容显现中' }]
      },
      allEnemyChanges: changes
    };
  }
};

const maskDevour: CombatBoon = {
  id: 'mask_devour', name: '面具吞噬', ringLevel: 1,
  description: 'POW对抗，2D6伤害+眩晕',
  isActive: true, mpCost: 6, cooldown: 2, targetType: 'enemy',
  execute: (caster, target, round) => {
    const opposed = opposedCheck(caster.baseAttributes.POW, target.baseAttributes.POW);
    if (opposed.attackerWins) {
      const dmg = rollD(6) + rollD(6);
      const actual = Math.max(1, dmg - target.armor);
      const newHP = Math.max(0, target.currentHP - actual);
      return {
        log: mkLog(caster, round, `${caster.name}吞噬${target.name}的面容！${actual}伤害+眩晕1轮`, 'spell'),
        casterChanges: {},
        targetChanges: {
          currentHP: newHP,
          isAlive: newHP > 0,
          effects: [...target.effects, { id: 'mask_devoured', name: '面具吞噬', duration: 1, statModifiers: { DEX: -30 }, description: '眩晕' }]
        },
        killed: newHP <= 0,
        diceLabel: '面具吞噬',
        diceRoll: { roll: opposed.attackerRoll, skillValue: caster.baseAttributes.POW, target: target.baseAttributes.POW, difficulty: 'regular', level: opposed.attackerLevel, success: true, isImpale: false }
      };
    }
    return { log: mkLog(caster, round, `${caster.name}的面具吞噬被${target.name}抵抗了`, 'miss'), casterChanges: {} };
  }
};

const finaleDecree: CombatBoon = {
  id: 'finale_decree', name: '终幕宣告', ringLevel: 1,
  description: '全敌困难POW→失败失去下回合行动',
  isActive: true, mpCost: 12, cooldown: 3, targetType: 'all_enemies',
  execute: (caster, _, round, allEnemies) => {
    const enemies = allEnemies || [];
    let frozen = 0;
    const changes: Partial<BattleCombatant>[] = [];
    enemies.forEach(e => {
      const check = skillCheck(e.baseAttributes.POW, 'hard');
      if (!check.success) {
        frozen++;
        changes.push({
          effects: [...e.effects, { id: 'finale_frozen', name: '终幕宣告', duration: 1, statModifiers: { DEX: -99 }, description: '失去下回合行动' }]
        });
      } else {
        changes.push({});
      }
    });
    return {
      log: mkLog(caster, round, `💀 ${caster.name}吟诵终幕宣告！${frozen}/${enemies.length}名敌人被冻结行动`, 'spell'),
      casterChanges: {},
      allEnemyChanges: changes
    };
  }
};

// ═══════════════════════════════════════════════════════════
//  恩赐注册表
// ═══════════════════════════════════════════════════════════

export const ALL_COMBAT_BOONS: CombatBoon[] = [
  // 第三环
  silentField, mindWhisper, tongueBind,
  // 第二环
  pharaohGaze,
  // 第一环
  nyarVoice, faceRend, maskDevour, finaleDecree,
];

export function getBoonsForCombatant(c: BattleCombatant): CombatBoon[] {
  // 召唤物和神话生物无恩赐
  if (c.type === 'summon' || c.type === 'mythos_creature') return [];
  // 低环成员无恩赐（环级5-7无战斗恩赐）
  if (c.ringLevel >= 5) return [];
  // 该环专属恩赐：只有 ringLevel <= 当前环的角色才能使用（数字越小环越高）
  // 即：ringLevel=3 的角色只能使用 ringLevel>=3 的恩赐
  return ALL_COMBAT_BOONS.filter(b => b.ringLevel >= c.ringLevel);
}

export function getBoonById(id: string): CombatBoon | undefined {
  return ALL_COMBAT_BOONS.find(b => b.id === id);
}

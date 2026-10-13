// ═══════════════════════════════════════════════════════════
// COC 7th 战斗引擎
// ═══════════════════════════════════════════════════════════

import type {
  BattleState, BattleCombatant, CombatLogEntry,
  CombatEffect, PhysicalEnhancement, SpellDefinition
} from '@/types/cult';
import type { WeaponDefinition } from '@/types/cult';
import type { MythosCreature } from '@/types/cult';
import type { CultMember } from '@/types/cult';
import { skillCheck, opposedCheck, parseAndRoll, rollD, rollD100, rollDamage } from './dice';
import type { SkillCheckResult } from './dice';
import { getSpellById } from '@/data/spells';
import { getWeaponById } from '@/data/weapons';
import { getCreatureById } from '@/data/bestiary';

// ═══════════════════════════════════════════════════════════
//  战斗角色工厂：将数据角色转化为战斗角色
// ═══════════════════════════════════════════════════════════
export function createBattleCombatant(
  source: CultMember | MythosCreature,
  side: 'player' | 'enemy',
  instanceId?: string
): BattleCombatant {
  const id = instanceId || `${source.id}_battle_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  // 判断数据来源类型
  const isCreature = 'category' in source;

  const baseAttrs = source.attributes;
  const enhancedAttrs = { ...baseAttrs };

  let weapons: (WeaponDefinition & { currentAmmo?: number })[] = [];
  let spells: SpellDefinition[] = [];
  let armor = 0;

  if (isCreature) {
    const creature = source as MythosCreature;
    weapons = creature.weapons.map(w => ({ ...w, currentAmmo: w.maxAmmo ?? 0 }));
    armor = creature.armor;
    spells = [];
  } else {
    const member = source as CultMember;
    weapons = member.weapons.map(wi => {
      const def = getWeaponById(wi.weaponId);
      return def ? { ...def, currentAmmo: def.maxAmmo ?? 0 } : null;
    }).filter(Boolean) as (WeaponDefinition & { currentAmmo?: number })[];
    armor = 0; // 教团成员护甲由装备单独处理（未来扩展）
    spells = member.knownSpells.map(sid => getSpellById(sid)).filter(Boolean) as SpellDefinition[];

    // 应用肉体强化
    if (member.enhancement.active) {
      applyEnhancement(enhancedAttrs, member.enhancement);
    }
  }

  const hp = source.derived.HP || source.derived.maxHP;
  const san = source.derived.SAN ?? (source.attributes.POW || 50);
  const maxSan = source.derived.maxSAN ?? 99;

  // COC 7th: 确保所有单位都有闪避技能（基础值=DEX/2）
  const skillsWithDodge = { ...source.skills };
  if (!skillsWithDodge['闪避']) {
    skillsWithDodge['闪避'] = Math.floor((source.attributes.DEX || 50) / 2);
  }

  return {
    instanceId: id,
    type: isCreature ? 'mythos_creature' : 'cult_member',
    sourceId: source.id,
    ringLevel: isCreature ? 0 : (source as CultMember).ringLevel,
    name: source.name,
    icon: 'icon' in source ? (source as any).icon : '👤',
    side,
    currentHP: hp,
    maxHP: hp,
    currentMP: source.derived.MP || 0,
    maxMP: source.derived.maxMP || 0,
    currentSAN: san,
    maxSAN: maxSan,
    baseAttributes: baseAttrs,
    enhancedAttributes: enhancedAttrs,
    skills: skillsWithDodge,
    weapons,
    knownSpells: spells,
    armor,
    isAlive: true,
    enhancement: (source as CultMember).enhancement || { active: false, tier: 1, darkVision: false },
    effects: [],
    isDefending: false,
    dodgedThisRound: false,
    actionUsed: false,
    moveUsed: false,
    cooldowns: {},
    boonUsage: {},
    hasRevived: false,
    gridX: 0, gridY: 0, mov: source.derived.MOV || 7,
  };
}

// ── 肉体强化计算 ──
function applyEnhancement(attrs: Record<string, number>, enh: PhysicalEnhancement): void {
  if (!enh.active) return;

  const multiplier = enh.tier === 'ultimate' ? 2 : 1;
  const options = enh.tier === 'ultimate' ? ['strength', 'speed', 'armor'] :
    enh.tier === 3 ? ['strength', 'speed', 'armor'] :
    enh.tier === 2 ? (enh.option2 || ['strength']) :
    [enh.option1 || 'strength'];

  if (options.includes('strength')) attrs.STR += 20 * multiplier;
  if (options.includes('speed')) {
    attrs.DEX += 20 * multiplier;
    if (options.includes('strength')) attrs.STR -= 10; // speed代价
  }
  // armor选项在combat resolution中处理（临时护甲）

  if (enh.tier >= 3 || enh.darkVision) {
    // 黑暗视觉：战斗检定在黑暗中无惩罚
  }
}

// ═══════════════════════════════════════════════════════════
//  战斗回合执行
// ═══════════════════════════════════════════════════════════

export interface ActionResult {
  log: CombatLogEntry;
  attackerNewState: Partial<BattleCombatant>;
  defenderNewState?: Partial<BattleCombatant>;
  killed: boolean;
  damageDealt: number; // 实际造成伤害（用于威胁追踪）
  // 闪避信息（供UI显示骰子动画）
  dodgeInfo?: {
    roll: number;
    target: number;
    level: string;
    success: boolean;
    wasDefending: boolean;
  };
  // 特殊能力触发信息（供UI显示骰子动画）
  abilityTrigger?: {
    name: string;
    description: string;
    checkType: string;  // CON / STR / POW / DEX
    roll: number;
    target: number;
    level: string;
    success: boolean;
    effect: string;
  };
}

// ── 攻击行动 ──
export function executeAttack(
  attacker: BattleCombatant,
  defender: BattleCombatant,
  weapon: WeaponDefinition & { currentAmmo?: number },
  battleRound: number,
  preCheck?: ReturnType<typeof skillCheck>  // 如果UI已经掷过骰，直接使用
): ActionResult {
  const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;

  // 获取攻击技能值
  const skillName = weapon.skill;
  let skillVal = attacker.skills[skillName] || 50;
  // 使用强化后属性影响（简化：STR加成近战，DEX加成射击）
  if (weapon.category === 'melee') {
    skillVal = Math.min(99, skillVal + Math.floor((attacker.enhancedAttributes.STR - 50) / 10));
  }

  // COC 7th检定 — 使用传入的预掷结果或重新掷骰
  const check = preCheck || skillCheck(skillVal, 'regular');

  const logEntry: CombatLogEntry = {
    id: logId,
    timestamp: Date.now(),
    round: battleRound,
    actorName: attacker.name,
    actorSide: attacker.side,
    action: 'attack',
    detail: '',
    diceRolls: [],
    result: 'miss'
  };

  // ── 大失败处理 ──
  if (check.level === 'fumble') {
    const selfDmgRoll = parseAndRoll(weapon.damage);
    const selfDmg = Math.max(1, selfDmgRoll.total - attacker.armor);
    logEntry.detail = `${attacker.name}攻击大失败！武器失控，误伤自己 ${selfDmg} 点伤害！（掷出${check.roll}）`;
    logEntry.result = 'fumble';
    logEntry.diceRolls = [selfDmgRoll];
    return {
      log: logEntry,
      attackerNewState: { currentHP: Math.max(0, attacker.currentHP - selfDmg), isAlive: attacker.currentHP - selfDmg > 0 },
      killed: false
    };
  }

  // ── 失败处理 ──
  if (!check.success) {
    logEntry.detail = `${attacker.name}用${weapon.name}攻击${defender.name}，未命中！（掷出${check.roll}，需≤${check.target}）`;
    logEntry.result = 'miss';
    return { log: logEntry, attackerNewState: {}, killed: false };
  }

  // ── 命中！COC 7th闪避反应（每回合只能闪避一次）──
  let dodgeState: Partial<BattleCombatant> = {};
  let dodgeInfo: ActionResult['dodgeInfo'] | undefined;

  if (defender.dodgedThisRound) {
    logEntry.detail = `${attacker.name}命中${defender.name}！（${defender.name}本回合已闪避过，无法再次闪避）`;
  } else {
    const dodgeSkill = defender.skills['闪避'] || Math.floor(defender.baseAttributes.DEX / 2);
    const dodgeAdvantage = defender.isDefending ? 'advantage' : 'normal';
    const dodgeCheck = skillCheck(dodgeSkill, 'regular', dodgeAdvantage);
    dodgeState = { dodgedThisRound: true }; // 闪避机会已消耗

    const levelOrder: Record<string, number> = { critical: 6, extreme: 5, hard: 4, regular: 3, fail: 0, fumble: 0 };
    const attLvl = levelOrder[check.level] || 0;
    const defLvl = levelOrder[dodgeCheck.level] || 0;

    if (dodgeCheck.success && defLvl >= attLvl) {
      const dodgeLabel = dodgeCheck.level === 'critical' ? '✨大成功' : dodgeCheck.level === 'extreme' ? '极难成功' : dodgeCheck.level === 'hard' ? '困难成功' : '普通成功';
      logEntry.detail = `${attacker.name}命中！但${defender.name}闪避了！（攻击${check.roll}/${check.level},闪避${dodgeCheck.roll}→${dodgeLabel}${defender.isDefending ? ' [防御优势]' : ''}）`;
      logEntry.result = 'miss';
      return {
        log: logEntry, attackerNewState: {}, killed: false,
        defenderNewState: { dodgedThisRound: true },
        dodgeInfo: { roll: dodgeCheck.roll, target: dodgeCheck.target, level: dodgeCheck.level, success: true, wasDefending: defender.isDefending }
      };
    }

    if (dodgeCheck.success) {
      logEntry.detail = `${attacker.name}命中！${defender.name}闪避失败（攻击等级更高）→攻击${check.level},闪避${dodgeCheck.level}（掷${dodgeCheck.roll}/${dodgeCheck.target}${defender.isDefending ? ' [防御]' : ''}）`;
      dodgeInfo = { roll: dodgeCheck.roll, target: dodgeCheck.target, level: dodgeCheck.level, success: false, wasDefending: defender.isDefending };
    } else {
      logEntry.detail = `${attacker.name}命中！${defender.name}闪避失败（掷${dodgeCheck.roll}/${dodgeCheck.target}${defender.isDefending ? ' [防御失败]' : ''}）`;
      dodgeInfo = { roll: dodgeCheck.roll, target: dodgeCheck.target, level: dodgeCheck.level, success: false, wasDefending: defender.isDefending };
    }
  }

  // ── 伤害计算 ──
  let dmg: number;
  if (check.isImpale && weapon.impale) {
    // 贯穿：最大伤害 + 额外骰
    const maxDmg = parseMaxDamage(weapon.damage);
    const extra = rollDamage(weapon.damage);
    dmg = maxDmg + extra;
    logEntry.detail = `💥贯穿！`;
  } else {
    dmg = rollDamage(weapon.damage);
  }

  // 护甲减免
  const actualDmg = Math.max(1, dmg - defender.armor);
  const newHP = Math.max(0, defender.currentHP - actualDmg);
  const killed = newHP <= 0;

  // 弹药消耗
  let ammoUpdate = {};
  if (weapon.currentAmmo !== undefined && weapon.category === 'firearm') {
    const newAmmo = Math.max(0, (weapon.currentAmmo || 0) - 1);
    ammoUpdate = { weapons: attacker.weapons.map(w =>
      w.id === weapon.id ? { ...w, currentAmmo: newAmmo } : w
    )};
  }

  const dmgResult = parseAndRoll(weapon.damage);
  logEntry.detail += `${attacker.name}用${weapon.name}命中${defender.name}！伤害${dmg}→护甲-${defender.armor}→实际${actualDmg}点！（掷出${check.roll}，需≤${check.target}）`;
  logEntry.result = killed ? 'kill' : (check.isImpale ? 'crit' : 'hit');
  logEntry.diceRolls = [dmgResult];

  // ── 特殊能力触发 ──
  let abilityTrigger: ActionResult['abilityTrigger'] = undefined;
  let abilityDefenderChanges: Partial<BattleCombatant> = {};
  if (!killed) {
    const abResult = checkSpecialAbility(weapon.id, attacker, defender);
    if (abResult) {
      abilityTrigger = abResult.info;
      abilityDefenderChanges = abResult.stateChanges;
      logEntry.detail += ` | ${abilityTrigger.name}: ${abilityTrigger.effect}`;
    }
  }

  return {
    log: logEntry,
    attackerNewState: ammoUpdate,
    defenderNewState: { currentHP: newHP, isAlive: !killed, ...dodgeState, ...abilityDefenderChanges },
    killed,
    damageDealt: actualDmg,
    abilityTrigger,
    dodgeInfo
  };}

// ── 特殊能力触发检测（返回显示信息+机械效果）──
interface AbilityCheckResult {
  info: NonNullable<ActionResult['abilityTrigger']>;
  stateChanges: Partial<BattleCombatant>;
}

function checkSpecialAbility(
  weaponId: string,
  attacker: BattleCombatant,
  defender: BattleCombatant
): AbilityCheckResult | null {
  const dAttrs = defender.baseAttributes;

  switch (weaponId) {
    // ─── 食尸鬼撕咬 → CON检定对抗尸毒 ───
    case 'ghoul_bite': {
      const conTarget = dAttrs.CON;
      const check = skillCheck(conTarget, 'regular');
      if (!check.success) {
        // 尸毒：每24小时CON-1D3，战斗中简化为立即CON-1D3
        const poisonDmg = Math.min(rollD(3), defender.enhancedAttributes.CON - 1);
        return {
          info: {
            name: '尸毒感染', description: '食尸鬼的撕咬带有尸毒',
            checkType: 'CON', roll: check.roll, target: check.target,
            level: check.level, success: false,
            effect: `CON检定失败(${check.roll}>${check.target})！CON-${poisonDmg}，并持续恶化。`
          },
          stateChanges: {
            enhancedAttributes: { ...defender.enhancedAttributes, CON: Math.max(1, defender.enhancedAttributes.CON - poisonDmg) },
            effects: [...defender.effects, { id: 'ghoul_poison', name: '尸毒', duration: 999, statModifiers: { CON: -poisonDmg }, description: '食尸鬼尸毒，CON持续下降' }]
          }
        };
      }
      return {
        info: { name: '尸毒抵抗', description: '食尸鬼的撕咬带有尸毒', checkType: 'CON', roll: check.roll, target: check.target, level: check.level, success: true, effect: `CON检定成功！抵抗了尸毒。` },
        stateChanges: {}
      };
    }

    // ─── 黑山羊幼崽触手 → 吸血缠绕：STR对抗 ───
    case 'dark_young_tentacle': {
      const strTarget = Math.max(1, dAttrs.STR);
      const opposed = opposedCheck(attacker.baseAttributes.STR, strTarget);
      if (opposed.attackerWins) {
        const drain = rollD(6);
        return {
          info: {
            name: '吸血缠绕', description: '触手缠绕并吸取力量',
            checkType: 'STR', roll: opposed.defenderRoll, target: strTarget,
            level: opposed.defenderLevel, success: false,
            effect: `STR对抗失败！被缠绕，STR-${drain}，每轮继续流失。`
          },
          stateChanges: {
            enhancedAttributes: { ...defender.enhancedAttributes, STR: Math.max(1, defender.enhancedAttributes.STR - drain) },
            effects: [...defender.effects, { id: 'dark_young_grasp', name: '吸血缠绕', duration: 3, statModifiers: { STR: -drain }, description: '黑山羊幼崽触手缠绕，每轮流失STR' }]
          }
        };
      }
      return {
        info: { name: '挣脱缠绕', description: '触手缠绕并吸取力量', checkType: 'STR', roll: opposed.defenderRoll, target: strTarget, level: opposed.defenderLevel, success: true, effect: `STR对抗成功！挣脱了缠绕。` },
        stateChanges: {}
      };
    }

    // ─── 米·戈电击枪 → CON检定对抗麻痹 ───
    case 'migo_electric': {
      const conCheck = skillCheck(dAttrs.CON, 'regular');
      if (!conCheck.success) {
        const paraRounds = rollD(4);
        return {
          info: {
            name: '电击麻痹', description: '米·戈电击枪的麻痹效果',
            checkType: 'CON', roll: conCheck.roll, target: conCheck.target,
            level: conCheck.level, success: false,
            effect: `CON检定失败！麻痹${paraRounds}轮，无法行动。`
          },
          stateChanges: {
            effects: [...defender.effects, { id: 'paralysis', name: '麻痹', duration: paraRounds, statModifiers: { DEX: -30 }, description: `被米·戈电击麻痹${paraRounds}轮` }]
          }
        };
      }
      return {
        info: { name: '抵抗麻痹', description: '米·戈电击枪的麻痹效果', checkType: 'CON', roll: conCheck.roll, target: conCheck.target, level: conCheck.level, success: true, effect: `CON检定成功！抵抗了麻痹效果。` },
        stateChanges: {}
      };
    }

    // ─── 拜亚基吸血撕咬 → STR流失 ───
    case 'byakhee_bite': {
      const strDrain = rollD(4);
      const conCheck = skillCheck(dAttrs.CON, 'regular');
      if (!conCheck.success) {
        return {
          info: {
            name: '吸血', description: '拜亚基咬住后吸取血液和力量',
            checkType: 'CON', roll: conCheck.roll, target: conCheck.target,
            level: conCheck.level, success: false,
            effect: `被咬住！STR-${strDrain}，每轮继续流失。`
          },
          stateChanges: {
            enhancedAttributes: { ...defender.enhancedAttributes, STR: Math.max(1, defender.enhancedAttributes.STR - strDrain) },
            effects: [...defender.effects, { id: 'byakhee_drain', name: '吸血', duration: 3, statModifiers: { STR: -strDrain }, description: '拜亚基吸血，每轮STR流失' }]
          }
        };
      }
      return {
        info: { name: '抵抗吸血', description: '拜亚基咬住后吸取血液和力量', checkType: 'CON', roll: conCheck.roll, target: conCheck.target, level: conCheck.level, success: true, effect: `CON检定成功！暂时抵抗了吸血。` },
        stateChanges: {}
      };
    }

    // ─── 空鬼巨爪 → 维度拖拽：POW对抗 ───
    case 'shambler_claw': {
      if (defender.currentHP <= defender.maxHP * 0.5) {
        const powCheck = skillCheck(dAttrs.POW, 'hard');
        if (!powCheck.success) {
          const dragRounds = rollD(4);
          return {
            info: {
              name: '维度拖拽', description: '空鬼将重伤猎物拖入其他维度',
              checkType: 'POW', roll: powCheck.roll, target: powCheck.target,
              level: powCheck.level, success: false,
              effect: `POW困难检定失败！被拖入其他维度${dragRounds}轮，期间无法行动。`
            },
            stateChanges: {
              effects: [...defender.effects, { id: 'dimension_drag', name: '维度拖拽', duration: dragRounds, statModifiers: { DEX: -50, STR: -20 }, description: `被拖入其他维度${dragRounds}轮` }]
            }
          };
        }
        return {
          info: { name: '抵抗拖拽', description: '空鬼将重伤猎物拖入其他维度', checkType: 'POW', roll: powCheck.roll, target: powCheck.target, level: powCheck.level, success: true, effect: `POW检定成功！抵抗了维度拖拽。` },
          stateChanges: {}
        };
      }
      return null; // HP>50%不触发
    }

    default:
      return null;
  }
}

// ── 法术行动 ──
export function executeSpell(
  caster: BattleCombatant,
  target: BattleCombatant,
  spell: SpellDefinition,
  battleRound: number,
  preCheck?: ReturnType<typeof skillCheck>  // 如果UI已经掷过骰，直接使用
): ActionResult {
  const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;

  // MP消耗检查
  if (caster.currentMP < spell.mpCost) {
    return {
      log: {
        id: logId, timestamp: Date.now(), round: battleRound,
        actorName: caster.name, actorSide: caster.side,
        action: 'spell', detail: `MP不足！需要${spell.mpCost}MP，当前${caster.currentMP}MP`,
        result: 'miss'
      },
      attackerNewState: {}, killed: false
    };
  }

  // 施法检定 — 使用传入的预掷结果或重新掷骰
  const castSkill = caster.baseAttributes[spell.skillUsed as keyof typeof caster.baseAttributes] || 50;
  const check = preCheck || skillCheck(castSkill, spell.castingDifficulty);

  const newMP = caster.currentMP - spell.mpCost;
  const sanLoss = rollDamage(spell.sanLoss);

  const logEntry: CombatLogEntry = {
    id: logId, timestamp: Date.now(), round: battleRound,
    actorName: caster.name, actorSide: caster.side,
    action: 'spell', detail: '', result: 'spell'
  };

  // 大失败
  if (check.level === 'fumble') {
    const backlash = rollD(6);
    logEntry.detail = `${caster.name}施放${spell.name}大失败！法术反噬 ${backlash} 伤害！`;
    logEntry.result = 'fumble';
    return {
      log: logEntry,
      attackerNewState: {
        currentMP: newMP,
        currentSAN: Math.max(0, caster.currentSAN - sanLoss),
        currentHP: Math.max(0, caster.currentHP - backlash),
        isAlive: caster.currentHP - backlash > 0
      },
      killed: false
    };
  }

  // 失败
  if (!check.success) {
    logEntry.detail = `${caster.name}施放${spell.name}失败。（掷出${check.roll}，需≤${check.target}）`;
    return {
      log: logEntry,
      attackerNewState: { currentMP: newMP, currentSAN: Math.max(0, caster.currentSAN - sanLoss) },
      killed: false
    };
  }

  // ── 成功！执行法术效果 ──
  let spellDmg = 0;
  let targetState: Partial<BattleCombatant> = {};
  let killed = false;
  let summonedUnit: BattleCombatant | null = null;

  switch (spell.combatEffect) {
    case 'black_pharaoh_touch':
      spellDmg = rollD(6);
      const touchNewHP = Math.max(0, target.currentHP - spellDmg);
      targetState = { currentHP: touchNewHP, isAlive: touchNewHP > 0 };
      killed = touchNewHP <= 0;
      logEntry.detail = `黑法老的触碰：${target.name}受到${spellDmg}点崩解伤害！`;
      break;

    case 'veil_of_dark':
      caster.effects.push({ id: 'veil_dark', name: '暗夜之纱', duration: Math.floor(caster.baseAttributes.INT / 5), statModifiers: {}, description: '黑暗中正常视物，敌人攻击-20%' });
      logEntry.detail = `${caster.name}被黑暗笼罩，获得潜行优势！`;
      break;

    case 'summon_chaos_spawn':
      // 召唤混沌眷属
      const spawnCreature = getCreatureById('chaos_spawn');
      if (spawnCreature) {
        summonedUnit = createBattleCombatant(spawnCreature, caster.side);
        summonedUnit.type = 'summon';
        // 临时存在倒计时
        const duration = Math.floor(caster.baseAttributes.POW / 5);
        summonedUnit.effects.push({
          id: 'temp_exist', name: '临时存在', duration,
          statModifiers: {}, description: `${duration}轮后自动消散`
        });
        logEntry.detail = `${caster.name}召唤了混沌眷属！持续${duration}轮。`;
      }
      break;

    case 'word_black_pharaoh':
      spellDmg = rollD(10);
      const sanNew = Math.max(0, target.currentSAN - spellDmg);
      targetState = { currentSAN: sanNew };
      logEntry.detail = `黑法老圣言：${target.name}损失${spellDmg} SAN！`;
      // 施法者自身也需对抗
      const casterSanLoss = rollD(3);
      const casterSanNew = Math.max(0, caster.currentSAN - casterSanLoss);
      logEntry.detail += ` (施法者自身损失${casterSanLoss} SAN)`;
      return {
        log: logEntry,
        attackerNewState: {
          currentMP: newMP,
          currentSAN: Math.max(0, casterSanNew - sanLoss),
        },
        defenderNewState: targetState,
        killed: false
      };

    case 'flesh_sculpting':
      const healAmount = rollD(6) + 2;
      const healNewHP = Math.min(target.maxHP, target.currentHP + healAmount);
      targetState = { currentHP: healNewHP };
      logEntry.detail = `血肉塑形：${target.name}回复${healAmount} HP！`;
      break;

    case 'avatar_black_pharaoh':
      // 终极法术：对全场敌人造成毁灭性打击
      logEntry.detail = `⚡黑法老降临！奈亚拉托提普的化身显现！全场敌人受到2D10 SAN损失！`;
      // 效果由调用方处理（需要遍历所有敌人）
      break;

    default:
      spellDmg = rollD(6);
      const defNewHP = Math.max(0, target.currentHP - spellDmg);
      targetState = { currentHP: defNewHP, isAlive: defNewHP > 0 };
      killed = defNewHP <= 0;
      logEntry.detail = `${spell.name}：造成${spellDmg}点伤害`;
  }

  return {
    log: logEntry,
    attackerNewState: {
      currentMP: newMP,
      currentSAN: Math.max(0, caster.currentSAN - sanLoss),
      ...(summonedUnit ? { summonedUnit } : {})
    },
    defenderNewState: targetState,
    killed
  };
}

// ── 防御行动 ──
export function executeDefend(combatant: BattleCombatant, battleRound: number): CombatLogEntry {
  return {
    id: `log_${Date.now()}`,
    timestamp: Date.now(),
    round: battleRound,
    actorName: combatant.name,
    actorSide: combatant.side,
    action: 'defend',
    detail: `${combatant.name}采取防御姿态。（闪避检定获得优势骰）`,
    result: 'info'
  };
}

// ── 等待行动 ──
export function executeWait(combatant: BattleCombatant, battleRound: number): CombatLogEntry {
  return {
    id: `log_${Date.now()}`,
    timestamp: Date.now(),
    round: battleRound,
    actorName: combatant.name,
    actorSide: combatant.side,
    action: 'wait',
    detail: `${combatant.name}等待时机...`,
    result: 'info'
  };
}

// ── 敌人AI ──
export function enemyAIDecision(
  actor: BattleCombatant,
  targets: BattleCombatant[],
  threatMap?: Map<string, number>  // playerId -> total damage dealt to this enemy
): { action: 'attack' | 'spell' | 'defend'; weapon?: WeaponDefinition; spell?: SpellDefinition; target: BattleCombatant } {
  if (targets.length === 0) {
    return { action: 'defend', target: actor };
  }

  // 威胁评估：实际造成伤害 > 武器潜力 > 距离
  const scored = targets.map(t => {
    let score = 0;
    // 实际伤害记录（最高权重）
    const dealt = threatMap?.get(t.instanceId) || 0;
    score += dealt * 5;
    // 武器伤害潜力
    const bestWpn = t.weapons.reduce((best, w) => {
      const dmgMatch = w.damage.match(/(\d*)D(\d+)/i);
      const dmgAvg = dmgMatch ? (parseInt(dmgMatch[1] || '1') * (parseInt(dmgMatch[2]) + 1) / 2) : 3;
      return dmgAvg > best ? dmgAvg : best;
    }, 0);
    score += bestWpn * 2;
    // 强化状态加成
    if (t.enhancement?.active) score += 15;
    // 距离：越近越优先
    const dist = actor.gridX !== undefined && t.gridX !== undefined
      ? Math.hypot((t.gridX - actor.gridX) * 8, (t.gridY - actor.gridY) * 8) / 36
      : 10;
    if (dist < 3) score += 25;
    else if (dist < 10) score += 10;
    else score += Math.max(0, 5 - dist * 0.3);
    // 召唤物优先清理
    if (t.type === 'summon') score += 20;
    return { target: t, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const target = scored[0].target;

  // 低HP时防御
  if (actor.currentHP < actor.maxHP * 0.25 && Math.random() < 0.3) {
    return { action: 'defend', target };
  }

  // 有法术时概率使用
  const combatSpells = actor.knownSpells.filter(s => s.combatUsable && actor.currentMP >= s.mpCost);
  if (combatSpells.length > 0 && Math.random() < 0.3) {
    const spell = combatSpells[Math.floor(Math.random() * combatSpells.length)];
    return { action: 'spell', spell, target };
  }

  // 选择武器（优先有弹药的）
  const availableWeapons = actor.weapons.filter(w => {
    if (w.category === 'firearm') return (w.currentAmmo || 0) > 0;
    return true;
  });

  if (availableWeapons.length === 0) {
    return { action: 'defend', target };
  }

  // AI行为模式
  const weapon = availableWeapons[Math.floor(Math.random() * availableWeapons.length)];
  return { action: 'attack', weapon, target };
}

// ── 辅助函数 ──
function parseMaxDamage(expr: string): number {
  const match = expr.match(/(\d*)D(\d+)/i);
  if (!match) return 4;
  const num = parseInt(match[1] || '1');
  const sides = parseInt(match[2]);
  return num * sides;
}

export function getAliveTargets(combatants: BattleCombatant[]): BattleCombatant[] {
  return combatants.filter(c => c.isAlive);
}

export function sortByDex(combatants: BattleCombatant[]): BattleCombatant[] {
  return [...combatants].sort((a, b) =>
    b.enhancedAttributes.DEX - a.enhancedAttributes.DEX
  );
}

// ── 计算有效属性（基础+强化+效果叠加）──
export function getEffectiveAttributes(c: BattleCombatant): Record<string, number> {
  const attrs = { ...c.enhancedAttributes };
  c.effects.forEach(e => {
    Object.entries(e.statModifiers).forEach(([key, val]) => {
      attrs[key] = Math.max(0, (attrs[key] || 0) + val);
    });
  });
  return attrs;
}

// ── 检查单位是否可以行动（被控制/眩晕/冻结则不能）──
export function canAct(c: BattleCombatant): boolean {
  if (!c.isAlive) return false;
  const frozen = c.effects.some(e => e.id === 'finale_frozen' || e.id === 'mask_devoured');
  if (frozen) return false;
  const bound = c.effects.some(e => e.id === 'tongue_bound');
  // 束缚：可以行动但DEX大幅降低（攻击-20%），不可移动
  return true;
}

export function isBattleOver(playerSide: BattleCombatant[], enemySide: BattleCombatant[]): 'victory' | 'defeat' | null {
  const playersAlive = playerSide.some(c => c.isAlive);
  const enemiesAlive = enemySide.some(c => c.isAlive);
  if (!playersAlive) return 'defeat';
  if (!enemiesAlive) return 'victory';
  return null;
}

// ═══════════════════════════════════════════════════════════
//  被动恩赐计算
// ═══════════════════════════════════════════════════════════

/** 面具共鸣：黄金面具从下属获得护甲+闪避加成 */
export function calcMaskResonance(caster: BattleCombatant, allPlayerUnits: BattleCombatant[]): { bonusArmor: number; bonusDodge: number } {
  if (caster.ringLevel !== 2) return { bonusArmor: 0, bonusDodge: 0 };
  const underlings = allPlayerUnits.filter(u => u.isAlive && u.instanceId !== caster.instanceId && u.ringLevel >= 4 && u.ringLevel <= 4);
  return { bonusArmor: underlings.length, bonusDodge: underlings.length * 5 };
}

/** 禁术共鸣：黄金面具四环法术MP/SAN减半+成功率+20% */
export function calcForbiddenResonance(caster: BattleCombatant, spellTier: number): { mpFactor: number; sanFactor: number; successBonus: number } {
  if (caster.ringLevel !== 2 || spellTier < 4) return { mpFactor: 1, sanFactor: 1, successBonus: 0 };
  return { mpFactor: 0.5, sanFactor: 0.5, successBonus: 20 };
}

/** 混沌面纱：教宗10米光环 */
export function calcChaosVeil(pontiff: BattleCombatant, target: BattleCombatant): { allySanBonus: number; enemyAttackPenalty: number } {
  if (pontiff.ringLevel !== 1) return { allySanBonus: 0, enemyAttackPenalty: 0 };
  const dx = (pontiff.gridX - target.gridX) * 8;
  const dy = (pontiff.gridY - target.gridY) * 8;
  const dist = Math.sqrt(dx*dx + dy*dy);
  const PX_10M = 360;
  if (dist > PX_10M) return { allySanBonus: 0, enemyAttackPenalty: 0 };
  if (target.side === 'player') return { allySanBonus: 20, enemyAttackPenalty: 0 };
  return { allySanBonus: 0, enemyAttackPenalty: 10 };
}

/** 获取场上教宗（若存在） */
export function findPontiff(allPlayerUnits: BattleCombatant[]): BattleCombatant | null {
  return allPlayerUnits.find(u => u.isAlive && u.ringLevel === 1) || null;
}

// ═══════════════════════════════════════════════════════════
// COC 7版 · 骰子面板组件
// ═══════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dices, Crosshair } from 'lucide-react';
import { rollD100, rollDice, performCheck } from '@/utils/gameLogic';
import type { Character, CheckResult, DifficultyLevel } from '@/types/game';

interface DiceRollerProps {
  character: Character | null;
  onRoll: (result: string) => void;
  suggestedSkill?: string; // KP建议检定的技能
  suggestedDifficulty?: DifficultyLevel;
  suggestedSAN?: string; // KP要求的SAN检定情境
}

export default function DiceRoller({ character, onRoll, suggestedSkill, suggestedDifficulty, suggestedSAN }: DiceRollerProps) {
  const [customTarget, setCustomTarget] = useState(50);
  const [showCustom, setShowCustom] = useState(false);

  const formatResult = (label: string, result: CheckResult) => {
    const emoji = result.level === 'critical' ? '🎯大成功！' :
      result.level === 'extreme' ? '🌟极限成功' :
      result.level === 'hard' ? '✨困难成功' :
      result.level === 'regular' ? '✅成功' :
      result.level === 'fumble' ? '💥大失败！' : '❌失败';
    return `🎲 ${label}：掷出 **${result.roll}** / 目标 **${result.target}** → ${emoji}`;
  };

  // D100裸骰
  const rollD100Raw = useCallback(() => {
    const r = rollD100();
    onRoll(`🎲 D100：掷出 **${r}**`);
  }, [onRoll]);

  // 惩罚骰
  const rollPenalty = useCallback(() => {
    const r1 = rollDice(10) - 1;
    const r2 = rollDice(10) - 1;
    const r = Math.max(r1, r2) * 10 + rollDice(10) - 1;
    onRoll(`🎲 惩罚骰：${r1*10} / ${r2*10} → 取最高十位 **${r}**`);
  }, [onRoll]);

  // 奖励骰
  const rollBonus = useCallback(() => {
    const r1 = rollDice(10) - 1;
    const r2 = rollDice(10) - 1;
    const r = Math.min(r1, r2) * 10 + rollDice(10) - 1;
    onRoll(`🎲 奖励骰：${r1*10} / ${r2*10} → 取最低十位 **${r}**`);
  }, [onRoll]);

  // SAN检定
  const rollSAN = useCallback(() => {
    if (!character) return;
    const r = rollD100();
    const result = performCheck(r, character.attributes.POW, 'regular');
    const emoji = result.success ? '✅SAN检定通过' : '❌SAN检定失败！';
    const loss = result.success ? '0' : `${rollDice(6)}`;
    onRoll(`🧠 SAN检定(${character.attributes.POW})：掷出 **${r}** → ${emoji}${!result.success ? `（损失 ${loss} SAN）` : ''}`);
  }, [character, onRoll]);

  // 幸运检定
  const rollLuck = useCallback(() => {
    if (!character) return;
    const r = rollD100();
    const result = performCheck(r, character.attributes.LUCK, 'regular');
    onRoll(formatResult(`幸运(${character.attributes.LUCK})`, result));
  }, [character, onRoll]);

  // 技能检定
  const rollSkill = useCallback((skillName: string, value: number) => {
    const r = rollD100();
    const result = performCheck(r, value, 'regular');
    onRoll(formatResult(skillName, result));
  }, [onRoll]);

  // 自定义目标检定
  const rollCustom = useCallback(() => {
    const r = rollD100();
    const result = performCheck(r, customTarget, 'regular');
    onRoll(formatResult(`自定义(${customTarget})`, result));
  }, [customTarget, onRoll]);

  // 伤害骰
  const rollDamage = useCallback((dice: string) => {
    const match = dice.match(/(\d+)D(\d+)/i);
    if (!match) return;
    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    let total = 0;
    const parts: number[] = [];
    for (let i = 0; i < count; i++) {
      const v = rollDice(sides);
      parts.push(v);
      total += v;
    }
    onRoll(`⚔ ${dice}：${parts.join(' + ')} = **${total}**`);
  }, [onRoll]);

  // 分割技能列表
  const combatSkills = character?.skills?.filter(s => s.category === 'combat') ?? [];
  const investigationSkills = character?.skills?.filter(s => s.category === 'investigation') ?? [];
  const socialSkills = character?.skills?.filter(s => s.category === 'social') ?? [];
  const otherSkills = character?.skills?.filter(s => s.category === 'other') ?? [];

  return (
    <div className="space-y-2 text-xs">
      {/* 基础骰子 */}
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant="outline" className="h-6 text-xs border-[#c8a84e]/20 text-[#c8a84e] hover:bg-[#c8a84e]/10" onClick={rollD100Raw}>
          <Dices className="w-3 h-3 mr-1" /> D100
        </Button>
        <Button size="sm" variant="outline" className="h-6 text-xs border-[#c8a84e]/20 text-[#c8a84e] hover:bg-[#c8a84e]/10" onClick={rollBonus}>
          奖励骰
        </Button>
        <Button size="sm" variant="outline" className="h-6 text-xs border-[#c8a84e]/20 text-[#c8a84e] hover:bg-[#c8a84e]/10" onClick={rollPenalty}>
          惩罚骰
        </Button>
        <Button size="sm" variant="outline" className="h-6 text-xs border-[#c8a84e]/20 text-[#c8a84e] hover:bg-[#c8a84e]/10" onClick={() => rollDamage('1D3')}>
          1D3
        </Button>
        <Button size="sm" variant="outline" className="h-6 text-xs border-[#c8a84e]/20 text-[#c8a84e] hover:bg-[#c8a84e]/10" onClick={() => rollDamage('1D4')}>
          1D4
        </Button>
        <Button size="sm" variant="outline" className="h-6 text-xs border-[#c8a84e]/20 text-[#c8a84e] hover:bg-[#c8a84e]/10" onClick={() => rollDamage('1D6')}>
          1D6
        </Button>
        <Button size="sm" variant="outline" className="h-6 text-xs border-[#c8a84e]/20 text-[#c8a84e] hover:bg-[#c8a84e]/10" onClick={() => rollDamage('1D8')}>
          1D8
        </Button>
        <Button size="sm" variant="outline" className="h-6 text-xs border-[#c8a84e]/20 text-[#c8a84e] hover:bg-[#c8a84e]/10" onClick={() => rollDamage('1D10')}>
          1D10
        </Button>
      </div>

      {/* 角色属性检定 */}
      {character && (
        <div className="flex flex-wrap gap-1 border-t border-[#c8a84e]/10 pt-1">
          <Button size="sm" variant="outline" className={`h-6 text-xs border-[#c8a84e]/15 hover:bg-[#a0c8e0]/10 ${suggestedSAN ? 'bg-[#ff8844]/15 border-[#ff8844]/40 text-[#ff8844] animate-pulse' : 'text-[#a0c8e0]'}`} onClick={rollSAN}>
            🧠 SAN({character.attributes.POW}){suggestedSAN ? ' ⚠KP要求' : ''}
          </Button>
          <Button size="sm" variant="outline" className="h-6 text-xs border-[#c8a84e]/15 text-[#a0c8e0] hover:bg-[#a0c8e0]/10" onClick={rollLuck}>
            🍀 幸运({character.attributes.LUCK})
          </Button>
          <Button size="sm" variant="outline" className="h-6 text-xs border-[#c8a84e]/15 text-[#a0c8e0] hover:bg-[#a0c8e0]/10" onClick={() => rollSkill('STR力量', character.attributes.STR)}>
            力量({character.attributes.STR})
          </Button>
          <Button size="sm" variant="outline" className="h-6 text-xs border-[#c8a84e]/15 text-[#a0c8e0] hover:bg-[#a0c8e0]/10" onClick={() => rollSkill('DEX敏捷', character.attributes.DEX)}>
            敏捷({character.attributes.DEX})
          </Button>
          <Button size="sm" variant="outline" className="h-6 text-xs border-[#c8a84e]/15 text-[#a0c8e0] hover:bg-[#a0c8e0]/10" onClick={() => rollSkill('INT智力', character.attributes.INT)}>
            智力({character.attributes.INT})
          </Button>
        </div>
      )}

      {/* KP建议检定 */}
      {suggestedSkill && character && (
        <div className="border-t border-[#ff6b6b]/15 pt-1">
          <span className="text-[10px] text-[#ff6b6b]">📢 KP要求检定：</span>
          <Button size="sm" className="h-6 text-xs bg-[#ff6b6b]/10 hover:bg-[#ff6b6b]/20 text-[#ff6b6b] border border-[#ff6b6b]/20 ml-1" onClick={() => {
            const skill = character.skills.find(s => s.name === suggestedSkill);
            rollSkill(suggestedSkill, skill?.currentValue ?? 20);
          }}>
            <Crosshair className="w-3 h-3 mr-1" /> {suggestedSkill}
          </Button>
        </div>
      )}

      {/* KP要求SAN检定 */}
      {suggestedSAN && character && (
        <div className="border-t border-[#ff8844]/20 pt-1">
          <span className="text-[10px] text-[#ff8844]">🧠 KP要求SAN检定：</span>
          <span className="text-[10px] text-[#ff8844]/70 ml-1">{suggestedSAN}</span>
        </div>
      )}

      {/* 战斗技能 */}
      {character && combatSkills.length > 0 && (
        <details className="border-t border-[#c8a84e]/10 pt-1">
          <summary className="text-[10px] text-[#6a6a74] cursor-pointer hover:text-[#c8a84e]">⚔ 战斗技能</summary>
          <div className="flex flex-wrap gap-1 mt-1">
            {combatSkills.map(s => (
              <Button key={s.name} size="sm" variant="outline" className="h-5 text-[10px] border-[#c0392b]/15 text-[#e08888] hover:bg-[#c0392b]/10" onClick={() => rollSkill(s.name, s.currentValue)}>
                {s.name}({s.currentValue})
              </Button>
            ))}
          </div>
        </details>
      )}

      {/* 调查技能 */}
      {character && investigationSkills.length > 0 && (
        <details className="border-t border-[#c8a84e]/10 pt-1">
          <summary className="text-[10px] text-[#6a6a74] cursor-pointer hover:text-[#c8a84e]">🔍 调查技能</summary>
          <div className="flex flex-wrap gap-1 mt-1">
            {investigationSkills.map(s => (
              <Button key={s.name} size="sm" variant="outline" className="h-5 text-[10px] border-[#c8a84e]/15 text-[#c8c8a0] hover:bg-[#c8a84e]/10" onClick={() => rollSkill(s.name, s.currentValue)}>
                {s.name}({s.currentValue})
              </Button>
            ))}
          </div>
        </details>
      )}

      {/* 社交技能 */}
      {character && socialSkills.length > 0 && (
        <details className="border-t border-[#c8a84e]/10 pt-1">
          <summary className="text-[10px] text-[#6a6a74] cursor-pointer hover:text-[#c8a84e]">💬 社交技能</summary>
          <div className="flex flex-wrap gap-1 mt-1">
            {socialSkills.map(s => (
              <Button key={s.name} size="sm" variant="outline" className="h-5 text-[10px] border-[#8844cc]/15 text-[#c8a0e0] hover:bg-[#8844cc]/10" onClick={() => rollSkill(s.name, s.currentValue)}>
                {s.name}({s.currentValue})
              </Button>
            ))}
          </div>
        </details>
      )}

      {/* 自定义检定 */}
      <details className="border-t border-[#c8a84e]/10 pt-1">
        <summary className="text-[10px] text-[#6a6a74] cursor-pointer hover:text-[#c8a84e]">⚙ 自定义检定</summary>
        <div className="flex items-center gap-1 mt-1">
          <input type="number" min={1} max={99} value={customTarget}
            className="w-12 h-5 bg-[#0c0c10] border border-[#c8a84e]/20 text-[#c8c8d0] text-center text-xs rounded"
            onChange={e => setCustomTarget(Number(e.target.value))} />
          <Button size="sm" variant="outline" className="h-5 text-[10px] border-[#c8a84e]/20 text-[#c8a84e] hover:bg-[#c8a84e]/10" onClick={rollCustom}>
            检定
          </Button>
        </div>
      </details>
    </div>
  );
}

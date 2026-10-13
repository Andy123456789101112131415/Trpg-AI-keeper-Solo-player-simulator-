// ═══════════════════════════════════════════════════════════
// 千面之门 · 教团管理页面
// ═══════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from '@/components/ui/accordion';
import { Users, Swords, BookOpen, Shield, Sparkles, Eye, ChevronDown } from 'lucide-react';
import { SEVEN_RINGS, getRingColor, getRingIcon } from '@/data/cult/rings';
import { ALL_SPELLS, getSpellsByTier } from '@/data/spells';
import { BESTIARY } from '@/data/bestiary';
import {
  generateMembersForRing, generateFullCult,
  type CreateMemberOptions
} from '@/data/cult/templates';
import type { CultMember, RingLevel } from '@/types/cult';
import { calculateDerivedAttributes } from '@/utils/gameLogic';

// ═══════════════════════════════════════════════════════════
//  主页面
// ═══════════════════════════════════════════════════════════
export default function CultManagement() {
  const [cultMembers, setCultMembers] = useState<Map<number, CultMember[]>>(() => generateFullCult());
  const [selectedRing, setSelectedRing] = useState<number>(7);
  const [selectedMember, setSelectedMember] = useState<CultMember | null>(null);

  const addMember = useCallback((ringLevel: number) => {
    setCultMembers(prev => {
      const next = new Map(prev);
      const current = next.get(ringLevel) || [];
      const newMembers = generateMembersForRing(ringLevel, 1);
      next.set(ringLevel, [...current, ...newMembers]);
      return next;
    });
  }, []);

  const removeMember = useCallback((ringLevel: number, memberId: string) => {
    setCultMembers(prev => {
      const next = new Map(prev);
      const current = next.get(ringLevel) || [];
      next.set(ringLevel, current.filter(m => m.id !== memberId));
      if (selectedMember?.id === memberId) setSelectedMember(null);
      return next;
    });
  }, [selectedMember]);

  const toggleEnhancement = useCallback((memberId: string) => {
    setCultMembers(prev => {
      const next = new Map(prev);
      for (const [ring, members] of next) {
        const idx = members.findIndex(m => m.id === memberId);
        if (idx !== -1) {
          const updated = [...members];
          updated[idx] = {
            ...updated[idx],
            enhancement: {
              ...updated[idx].enhancement,
              active: !updated[idx].enhancement.active
            }
          };
          next.set(ring, updated);
          if (selectedMember?.id === memberId) setSelectedMember(updated[idx]);
          break;
        }
      }
      return next;
    });
  }, [selectedMember]);

  const totalMembers = Array.from(cultMembers.values()).reduce((s, m) => s + m.length, 0);

  return (
    <div className="min-h-screen bg-[#0c0c10] text-[#c8c8d0]">
      {/* Header */}
      <div className="border-b border-[#c8a84e]/15 bg-[#111116] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💀</span>
            <h1 className="text-xl font-bold text-[#c8a84e] tracking-widest font-serif">千面之门</h1>
            <Badge variant="outline" className="border-[#c8a84e]/30 text-[#c8a84e]">
              教团管理系统
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-[#6a6a74]">
            <span>总成员: <strong className="text-[#c8a84e]">{totalMembers}</strong></span>
            <span>|</span>
            <span>七环同心</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="bg-[#111116] border border-[#c8a84e]/10 mb-4">
            <TabsTrigger value="members" className="data-[state=active]:bg-[#1e1e2a] data-[state=active]:text-[#c8a84e]">
              <Users className="w-4 h-4 mr-2" />教团成员
            </TabsTrigger>
            <TabsTrigger value="spells" className="data-[state=active]:bg-[#1e1e2a] data-[state=active]:text-[#c8a84e]">
              <BookOpen className="w-4 h-4 mr-2" />法术典籍
            </TabsTrigger>
            <TabsTrigger value="bestiary" className="data-[state=active]:bg-[#1e1e2a] data-[state=active]:text-[#c8a84e]">
              <Eye className="w-4 h-4 mr-2" />神话生物
            </TabsTrigger>
          </TabsList>

          {/* ─── 教团成员 TAB ─── */}
          <TabsContent value="members">
            <div className="grid grid-cols-12 gap-4">
              {/* Left: Ring Selector */}
              <div className="col-span-3 space-y-2">
                {[...SEVEN_RINGS].reverse().map(ring => {
                  const members = cultMembers.get(ring.level) || [];
                  const color = ring.color;
                  const isSelected = selectedRing === ring.level;
                  return (
                    <button
                      key={ring.level}
                      onClick={() => setSelectedRing(ring.level)}
                      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                        isSelected
                          ? 'border-[#c8a84e] bg-[#c8a84e]/5 shadow-lg shadow-[#c8a84e]/5'
                          : 'border-transparent bg-[#111116] hover:border-[#c8a84e]/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{ring.icon}</span>
                        <div>
                          <div className="font-bold text-sm" style={{ color }}>
                            第{ring.level}环 · {ring.name}
                          </div>
                          <div className="text-xs text-[#6a6a74]">{ring.title}</div>
                        </div>
                        <Badge className="ml-auto text-xs" variant="secondary">
                          {members.length}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right: Member List */}
              <div className="col-span-9">
                <Card className="bg-[#111116] border-[#c8a84e]/10">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-[#c8a84e] text-lg font-serif tracking-wider">
                      {getRingIcon(selectedRing)} 第{selectedRing}环 · {SEVEN_RINGS.find(r => r.level === selectedRing)?.name}
                    </CardTitle>
                    <Button
                      size="sm"
                      className="bg-[#c8a84e]/10 hover:bg-[#c8a84e]/20 text-[#c8a84e] border border-[#c8a84e]/30"
                      onClick={() => addMember(selectedRing)}
                    >
                      + 生成成员
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[60vh]">
                      <div className="space-y-3">
                        {(cultMembers.get(selectedRing) || []).map(member => (
                          <MemberCard
                            key={member.id}
                            member={member}
                            isSelected={selectedMember?.id === member.id}
                            onSelect={() => setSelectedMember(
                              selectedMember?.id === member.id ? null : member
                            )}
                            onRemove={() => removeMember(selectedRing, member.id)}
                            onToggleEnhancement={() => toggleEnhancement(member.id)}
                          />
                        ))}
                        {(cultMembers.get(selectedRing) || []).length === 0 && (
                          <div className="text-center py-12 text-[#6a6a74]">
                            <p className="text-3xl mb-2">{getRingIcon(selectedRing)}</p>
                            <p>此环暂无成员</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3 border-[#c8a84e]/20 text-[#c8a84e]"
                              onClick={() => addMember(selectedRing)}
                            >
                              + 生成第一位成员
                            </Button>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ─── 法术典籍 TAB ─── */}
          <TabsContent value="spells">
            <div className="space-y-4">
              {[1, 2, 3, 4].map(tier => {
                const spells = getSpellsByTier(tier);
                const tierNames = ['', '一环 · 入门', '二环 · 中级', '三环 · 高级', '四环 · 禁忌'];
                const tierColors = ['', '#88aa44', '#d4a830', '#e87830', '#ff4444'];
                return (
                  <Card key={tier} className="bg-[#111116] border-[#c8a84e]/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-serif tracking-wider" style={{ color: tierColors[tier] }}>
                        {tierNames[tier]} ({spells.length}个法术)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {spells.map(spell => (
                          <div key={spell.id}
                            className="p-3 rounded-lg bg-[#0c0c10] border border-[#c8a84e]/8 hover:border-[#c8a84e]/25 transition-all"
                          >
                            <div className="font-bold text-sm text-[#e8e8ec]">{spell.name}</div>
                            <div className="text-xs text-[#6a6a74] italic mb-1">{spell.nameEn}</div>
                            <div className="text-xs text-[#c8c8d0] line-clamp-2">{spell.description}</div>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs bg-[#8b1a1a]/20 text-[#c0392b]">
                                {spell.cost}
                              </Badge>
                              <Badge variant="secondary" className="text-xs bg-[#c8a84e]/10 text-[#c8a84e]">
                                {spell.castingCheck}
                              </Badge>
                              {spell.combatUsable && (
                                <Badge variant="secondary" className="text-xs bg-[#3a8]/10 text-[#3a8]">
                                  战斗可用
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ─── 神话生物 TAB ─── */}
          <TabsContent value="bestiary">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {BESTIARY.map(creature => (
                <Card key={creature.id} className="bg-[#111116] border-[#c8a84e]/10 hover:border-[#c8a84e]/25 transition-all">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{creature.icon}</span>
                      <div>
                        <CardTitle className="text-base text-[#e8e8ec]">{creature.name}</CardTitle>
                        <div className="text-xs text-[#6a6a74] italic">{creature.nameEn}</div>
                      </div>
                      <Badge className="ml-auto" variant="outline">
                        {creature.category === 'servitor' ? '眷族' :
                         creature.category === 'independent' ? '独立种族' : '高位存在'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-[#c8c8d0] mb-2 line-clamp-2">{creature.description}</p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className="text-[#6a6a74]">STR: <span className="text-[#e8e8ec]">{creature.attributes.STR}</span></div>
                      <div className="text-[#6a6a74]">CON: <span className="text-[#e8e8ec]">{creature.attributes.CON}</span></div>
                      <div className="text-[#6a6a74]">SIZ: <span className="text-[#e8e8ec]">{creature.attributes.SIZ}</span></div>
                      <div className="text-[#6a6a74]">DEX: <span className="text-[#e8e8ec]">{creature.attributes.DEX}</span></div>
                      <div className="text-[#6a6a74]">HP: <span className="text-[#c0392b]">{creature.derived.maxHP}</span></div>
                      <div className="text-[#6a6a74]">护甲: <span className="text-[#4488cc]">{creature.armor}</span></div>
                      <div className="text-[#6a6a74]">DB: <span className="text-[#c8a84e]">{creature.derived.DB}</span></div>
                      <div className="text-[#6a6a74]">SAN损失: <span className="text-[#8844cc]">{creature.sanLoss}</span></div>
                    </div>
                    {creature.specialAbilities.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-[#ffffff]/5">
                        <div className="text-xs text-[#c8a84e] font-bold mb-1">特殊能力:</div>
                        {creature.specialAbilities.map((ab, i) => (
                          <div key={i} className="text-xs text-[#6a6a74]">• {ab.name}: {ab.description}</div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  成员卡片组件
// ═══════════════════════════════════════════════════════════
function MemberCard({
  member, isSelected, onSelect, onRemove, onToggleEnhancement
}: {
  member: CultMember;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onToggleEnhancement: () => void;
}) {
  const attr = member.attributes;
  const der = member.derived;
  const ringColor = getRingColor(member.ringLevel);

  return (
    <div
      className={`rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? 'border-[#c8a84e] bg-[#c8a84e]/5'
          : 'border-[#c8a84e]/8 bg-[#0c0c10] hover:border-[#c8a84e]/20'
      }`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
          style={{ backgroundColor: ringColor + '20', color: ringColor }}>
          {getRingIcon(member.ringLevel)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-[#e8e8ec]">{member.name}</div>
          <div className="text-xs text-[#6a6a74]">{member.ringTitle}</div>
        </div>
        <div className="flex items-center gap-2">
          {member.enhancement.active && (
            <Badge className="text-xs bg-[#c8a84e]/15 text-[#c8a84e] border-[#c8a84e]/30">
              肉体强化
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            面具残留: {member.maskResidue.current}/10
          </Badge>
        </div>
      </div>

      {/* Expanded Detail */}
      {isSelected && (
        <div className="px-3 pb-3 border-t border-[#ffffff]/5 pt-3">
          {/* Attributes */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {Object.entries(attr).map(([key, val]) => (
              <div key={key} className="text-center p-1.5 rounded bg-[#111116]">
                <div className="text-[10px] text-[#6a6a74]">{key}</div>
                <div className="text-sm font-bold text-[#e8e8ec]">{val}</div>
              </div>
            ))}
          </div>

          {/* Derived */}
          <div className="flex gap-3 mb-3 text-xs">
            <span className="text-[#c0392b]">❤ {der.HP}/{der.maxHP}</span>
            <span className="text-[#4488cc]">🧠 {der.SAN}/{der.maxSAN}</span>
            <span className="text-[#8844cc]">✦ {der.MP}/{der.maxMP}</span>
            <span className="text-[#c8a84e]">⚡ {der.DB}</span>
            <span className="text-[#6a6a74]">🏃 {der.MOV}</span>
          </div>

          {/* Skills */}
          {Object.keys(member.skills).length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-[#c8a84e] font-bold mb-1">技能</div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(member.skills).map(([name, val]) => (
                  <Badge key={name} variant="secondary" className="text-xs">
                    {name} {val}%
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Weapons */}
          {member.weapons.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-[#c8a84e] font-bold mb-1">武器</div>
              <div className="flex flex-wrap gap-1">
                {member.weapons.map((w, i) => (
                  <Badge key={i} variant="outline" className="text-xs border-[#c8a84e]/20">
                    ⚔ {w.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Spells */}
          {member.knownSpells.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-[#8844cc] font-bold mb-1">已习得法术</div>
              <div className="flex flex-wrap gap-1">
                {member.knownSpells.map((sid, i) => {
                  const spell = ALL_SPELLS.find(s => s.id === sid);
                  return (
                    <Badge key={i} className="text-xs bg-[#8844cc]/10 text-[#8844cc] border-[#8844cc]/25">
                      ✦ {spell?.name || sid}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-[#ffffff]/5">
            <Button
              size="sm"
              variant="outline"
              className={`text-xs border-[#c8a84e]/20 ${
                member.enhancement.active
                  ? 'bg-[#c8a84e]/15 text-[#c8a84e]'
                  : 'text-[#6a6a74]'
              }`}
              onClick={(e) => { e.stopPropagation(); onToggleEnhancement(); }}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              肉体强化: {member.enhancement.active ? 'ON' : 'OFF'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-red-500/20 text-red-400 hover:bg-red-500/10"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
            >
              移除
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

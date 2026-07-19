import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Dices, ArrowLeft, Save, UserPlus, FileDown, Swords, AlertCircle, CheckCircle } from 'lucide-react';
import type { Character, CharacterAttributes, Skill, Weapon } from '@/types/game';
import {
  calculateDerivedAttributes,
  DEFAULT_SKILLS,
  rollAllAttributes,
  COC_OCCUPATIONS,
  calcOccupationPoints,
  calcInterestPoints,
  COC_WEAPONS,
} from '@/utils/gameLogic';
import { saveCharacter } from '@/utils/storage';

const ATTR_LABELS: Record<string, string> = {
  STR: '力量', CON: '体质', SIZ: '体型', DEX: '敏捷',
  APP: '外貌', INT: '智力', POW: '意志', EDU: '教育', LUCK: '幸运'
};

export default function CharacterCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [age, setAge] = useState(25);
  const [sex, setSex] = useState('男');
  const [background, setBackground] = useState('');

  const [attributes, setAttributes] = useState<CharacterAttributes>({
    STR: 50, CON: 50, SIZ: 50, DEX: 50,
    APP: 50, INT: 50, POW: 50, EDU: 50, LUCK: 50
  });

  const [selectedOccId, setSelectedOccId] = useState('');
  const [creditRating, setCreditRating] = useState(20);
  const selectedOcc = useMemo(() => COC_OCCUPATIONS.find(o => o.id === selectedOccId), [selectedOccId]);

  const [skills, setSkills] = useState<Skill[]>(() =>
    DEFAULT_SKILLS.map(s => ({
      name: s.name,
      baseValue: s.baseValue,
      currentValue: s.baseValue,
      occupationPoints: 0,
      interestPoints: 0,
      category: s.category as Skill['category'],
    }))
  );

  const [selectedWeaponIds, setSelectedWeaponIds] = useState<Set<string>>(new Set(['unarmed']));

  const occPointsTotal = useMemo(() => {
    if (!selectedOcc) return 0;
    return calcOccupationPoints(attributes, selectedOcc);
  }, [selectedOcc, attributes]);

  const intPointsTotal = useMemo(() => calcInterestPoints(attributes), [attributes]);
  const occPointsUsed = useMemo(() => skills.reduce((sum, s) => sum + s.occupationPoints, 0), [skills]);
  const intPointsUsed = useMemo(() => skills.reduce((sum, s) => sum + s.interestPoints, 0), [skills]);
  const occPointsRemain = occPointsTotal - occPointsUsed;
  const intPointsRemain = intPointsTotal - intPointsUsed;
  const occSkillNames = useMemo(() => new Set(selectedOcc?.recommendedSkills ?? []), [selectedOcc]);

  const rollAll = () => {
    const attrs = rollAllAttributes();
    setAttributes(attrs);
    toast({ title: '属性已生成', description: 'STR/CON/DEX/APP/POW=3D6×5 | SIZ/INT/EDU=(2D6+6)×5 | LUCK=3D6×5' });
  };

  const handleOccChange = (occId: string) => {
    setSelectedOccId(occId);
    const occ = COC_OCCUPATIONS.find(o => o.id === occId);
    if (occ) {
      setCreditRating(Math.round((occ.creditRange[0] + occ.creditRange[1]) / 2));
      setSkills(DEFAULT_SKILLS.map(s => ({
        name: s.name,
        baseValue: s.baseValue,
        currentValue: s.baseValue,
        occupationPoints: 0,
        interestPoints: 0,
        category: s.category as Skill['category'],
      })));
    }
  };

  const addSkillPoint = useCallback((skillName: string, type: 'occupation' | 'interest') => {
    setSkills(prev => prev.map(s => {
      if (s.name !== skillName) return s;
      const remaining = type === 'occupation' ? occPointsRemain : intPointsRemain;
      if (remaining <= 0) return s;
      if (s.currentValue >= 99) return s;
      return {
        ...s,
        currentValue: s.currentValue + 1,
        [type === 'occupation' ? 'occupationPoints' : 'interestPoints']:
          s[type === 'occupation' ? 'occupationPoints' : 'interestPoints'] + 1,
      };
    }));
  }, [occPointsRemain, intPointsRemain]);

  const subSkillPoint = useCallback((skillName: string, type: 'occupation' | 'interest') => {
    setSkills(prev => prev.map(s => {
      if (s.name !== skillName) return s;
      const pointsField = type === 'occupation' ? 'occupationPoints' : 'interestPoints';
      if (s[pointsField] <= 0) return s;
      return {
        ...s,
        currentValue: s.currentValue - 1,
        [pointsField]: s[pointsField] - 1,
      };
    }));
  }, []);

  const toggleWeapon = (id: string) => {
    setSelectedWeaponIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    if (!name.trim()) { toast({ title: '错误', description: '请输入角色名称', variant: 'destructive' }); return; }
    if (!selectedOcc) { toast({ title: '错误', description: '请选择职业', variant: 'destructive' }); return; }

    const derived = calculateDerivedAttributes(attributes);
    const weapons: Weapon[] = COC_WEAPONS
      .filter(w => selectedWeaponIds.has(w.id))
      .map(w => ({ ...w, id: `${Date.now()}-${w.id}` }));

    const character: Character = {
      id: Date.now().toString(),
      name: name.trim(),
      age,
      sex,
      occupation: selectedOcc.name,
      occupationId: selectedOcc.id,
      creditRating,
      background: background.trim(),
      attributes,
      derived,
      skills,
      weapons,
      items: [],
      createdAt: Date.now(),
    };

    saveCharacter(character);
    toast({ title: '角色已创建', description: `${name}（${selectedOcc.name}）已成功创建` });
    navigate('/trpg');
  };

  const exportPrintableSheet = () => {
    if (!name.trim()) { toast({ title: '错误', description: '请至少输入角色名称', variant: 'destructive' }); return; }
    const derived = calculateDerivedAttributes(attributes);
    const occName = selectedOcc?.name ?? '';

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>COC 7th - ${name}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'SimSun',serif;background:#f5f0e8;padding:20px}
  .sheet{max-width:800px;margin:0 auto;background:#fffdf7;border:3px double #3a2a1a;padding:30px}
  h1{text-align:center;font-size:24px;border-bottom:2px solid #3a2a1a;padding-bottom:10px;margin-bottom:20px}
  h2{font-size:16px;border-bottom:1px solid #8b7355;padding-bottom:4px;margin:16px 0 8px;color:#3a2a1a}
  .row{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:6px}
  .field{flex:1;min-width:100px}
  .fl{font-size:10px;color:#6b5a4a}
  .fv{font-size:15px;font-weight:bold;color:#1a0a00;border-bottom:1px solid #c0b090;padding:2px 0}
  .sg{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
  .sb{background:#faf5ec;border:1px solid #c0b090;padding:6px 8px;text-align:center}
  .sb .v{font-size:22px;font-weight:bold;color:#3a2a1a}
  .sb .l{font-size:9px;color:#6b5a4a}
  .sr{display:flex;justify-content:space-between;padding:2px 6px;font-size:13px;border-bottom:1px dotted #d0c0a0}
  .sr:nth-child(even){background:#fdfaf3}
  .wr{display:flex;justify-content:space-between;padding:3px 6px;font-size:12px;border-bottom:1px solid #d0c0a0;background:#faf5ec}
  .ft{text-align:center;font-size:10px;color:#8b7355;margin-top:20px;border-top:1px solid #c0b090;padding-top:10px}
  @media print{body{background:#fff}.sheet{border:none}}
</style></head>
<body>
<div class="sheet">
<h1>COC 7版 调查员记录</h1>
<div class="row">
  <div class="field"><div class="fl">姓名</div><div class="fv">${name}</div></div>
  <div class="field"><div class="fl">职业</div><div class="fv">${occName}</div></div>
  <div class="field"><div class="fl">年龄/性别</div><div class="fv">${age}/${sex}</div></div>
</div>
<h2>属性</h2>
<div class="sg">
${Object.entries(attributes).map(([k, v]) =>
  `<div class="sb"><div class="v">${v}</div><div class="l">${ATTR_LABELS[k] ?? k} (${k})</div></div>`
).join('')}
</div>
<h2>派生属性</h2>
<div class="row">
  <div class="field"><div class="fl">HP</div><div class="fv">${derived.HP}/${derived.maxHP}</div></div>
  <div class="field"><div class="fl">SAN</div><div class="fv">${derived.SAN}/99</div></div>
  <div class="field"><div class="fl">MP</div><div class="fv">${derived.MP}/${derived.maxMP}</div></div>
  <div class="field"><div class="fl">MOV</div><div class="fv">${derived.MOV}</div></div>
  <div class="field"><div class="fl">DB/BUILD</div><div class="fv">${derived.DB}/${derived.BUILD}</div></div>
  <div class="field"><div class="fl">CR</div><div class="fv">${creditRating}</div></div>
</div>
<h2>技能</h2>
${skills.filter(s => s.currentValue > s.baseValue || occSkillNames.has(s.name)).map(s =>
  `<div class="sr"><span>${occSkillNames.has(s.name) ? '★ ' : '  '}${s.name}</span><span style="font-weight:bold">${s.currentValue}%</span></div>`
).join('')}
<h2>武器</h2>
${COC_WEAPONS.filter(w => selectedWeaponIds.has(w.id)).map(w =>
  `<div class="wr"><span>${w.name}</span><span>${w.skillUsed} ${w.damage} | ${w.range}</span></div>`
).join('')}
${background ? `<h2>背景</h2><p style="line-height:1.6">${background}</p>` : ''}
<div class="ft">COC 7th TRPG Simulator · ${new Date().toLocaleDateString('zh-CN')}</div>
</div>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `COC_${name}_角色卡.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: '导出成功', description: '角色卡已导出为可打印的 HTML 文件' });
  };

  const creditInRange = selectedOcc
    ? creditRating >= selectedOcc.creditRange[0] && creditRating <= selectedOcc.creditRange[1]
    : true;

  const preview = calculateDerivedAttributes(attributes);

  return (
    <div className="min-h-screen bg-[#0c0c10] text-[#c8c8d0] p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate('/trpg')}
              className="border-[#c8a84e]/20 text-[#c8a84e] hover:bg-[#c8a84e]/10">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[#c8a84e] font-serif tracking-widest">
                <UserPlus className="w-5 h-5 inline mr-2" />创建调查员
              </h1>
              <p className="text-xs text-[#6a6a74] mt-1">COC 7版完整规则 · 39个职业 · 技能点分配 · 可打印导出</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportPrintableSheet}
              className="border-[#c8a84e]/20 text-[#6a6a74] hover:text-[#c8a84e] text-xs">
              <FileDown className="h-3 w-3 mr-1" /> 导出角色卡
            </Button>
            <Button size="sm" onClick={handleSave}
              className="bg-[#c8a84e]/15 hover:bg-[#c8a84e]/25 text-[#c8a84e] border border-[#c8a84e]/30 text-xs">
              <Save className="h-4 w-4 mr-2" /> 保存角色
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左栏 */}
          <div className="space-y-4">
            <Card className="bg-[#111116] border-[#c8a84e]/15">
              <CardHeader className="pb-2"><CardTitle className="text-[#c8a84e] font-serif text-sm">基本信息</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Input value={name} onChange={e => setName(e.target.value)}
                  placeholder="角色姓名" className="bg-[#0c0c10] border-[#c8a84e]/20 text-sm" />
                <div className="grid grid-cols-3 gap-2">
                  <Input type="number" value={age} onChange={e => setAge(Number(e.target.value))}
                    min={15} max={90} placeholder="年龄" className="bg-[#0c0c10] border-[#c8a84e]/20 text-sm text-center" />
                  <Select value={sex} onValueChange={setSex}>
                    <SelectTrigger className="bg-[#0c0c10] border-[#c8a84e]/20 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="男">男</SelectItem><SelectItem value="女">女</SelectItem></SelectContent>
                  </Select>
                  <div className="bg-[#0c0c10] border border-[#c8a84e]/20 rounded text-xs text-[#6a6a74] flex items-center justify-center">
                    CR:{creditRating}
                    {!creditInRange && <AlertCircle className="h-3 w-3 ml-1 text-red-500" />}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#111116] border-[#c8a84e]/15">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#c8a84e] font-serif text-sm flex items-center justify-between">
                  属性值
                  <Button size="sm" variant="outline" onClick={rollAll}
                    className="h-7 border-[#c8a84e]/30 text-[#c8a84e] text-xs hover:bg-[#c8a84e]/10">
                    <Dices className="h-3 w-3 mr-1" />随机
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(attributes) as (keyof CharacterAttributes)[]).map(key => (
                    <div key={key} className="space-y-0.5">
                      <Label className="text-[10px] text-[#6a6a74]">{ATTR_LABELS[key]} <span className="text-[#4a4a54]">({key})</span></Label>
                      <Input type="number" value={attributes[key]}
                        onChange={e => setAttributes({ ...attributes, [key]: Math.min(99, Math.max(1, Number(e.target.value) || 0)) })}
                        className={`bg-[#0c0c10] border-[#c8a84e]/20 text-center text-sm h-8 ${
                          attributes[key] >= 70 ? 'text-[#7ddf7d]' : attributes[key] <= 30 ? 'text-[#df7d7d]' : 'text-[#c8c8d0]'
                        }`} />
                    </div>
                  ))}
                </div>
                <div className="text-[9px] text-[#5a5a64] mt-2">STR/CON/DEX/APP/POW=3D6×5 | SIZ/INT/EDU=(2D6+6)×5 | LUCK=3D6×5</div>
              </CardContent>
            </Card>

            <Card className="bg-[#111116] border-[#c8a84e]/15">
              <CardHeader className="pb-2"><CardTitle className="text-[#c8a84e] font-serif text-sm">职业</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Select value={selectedOccId} onValueChange={handleOccChange}>
                  <SelectTrigger className="bg-[#0c0c10] border-[#c8a84e]/20 text-sm">
                    <SelectValue placeholder="— 选择职业 —" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {COC_OCCUPATIONS.map(occ => (
                      <SelectItem key={occ.id} value={occ.id}>{occ.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedOcc && (
                  <div className="space-y-1 text-[10px] text-[#6a6a74] bg-[#0c0c10] rounded p-2 border border-[#c8a84e]/10">
                    <p>{selectedOcc.description}</p>
                    <div className="flex gap-4 mt-1">
                      <span>技能点: <span className="text-[#c8a84e]">{selectedOcc.skillPoints}</span></span>
                      <span>CR: <span className={creditInRange ? 'text-[#7ddf7d]' : 'text-[#df7d7d]'}>
                        {selectedOcc.creditRange[0]}–{selectedOcc.creditRange[1]}
                      </span></span>
                    </div>
                  </div>
                )}
                {selectedOcc && (
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[#6a6a74]">信用评级 (CR)</Label>
                    <Input type="number" value={creditRating}
                      onChange={e => setCreditRating(Math.min(99, Math.max(0, Number(e.target.value) || 0)))}
                      className={`bg-[#0c0c10] border text-center text-sm h-8 ${creditInRange ? 'border-[#c8a84e]/20' : 'border-red-500/50'}`} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#111116] border-[#c8a84e]/15">
              <CardHeader className="pb-2"><CardTitle className="text-[#c8a84e] font-serif text-sm">派生属性</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-xs">
                  <span className="text-[#6a6a74]">HP <span className="text-[#c8c8d0]">{preview.HP}/{preview.maxHP}</span></span>
                  <span className="text-[#6a6a74]">SAN <span className="text-[#c8c8d0]">{preview.SAN}</span></span>
                  <span className="text-[#6a6a74]">MP <span className="text-[#c8c8d0]">{preview.MP}/{preview.maxMP}</span></span>
                  <span className="text-[#6a6a74]">MOV <span className="text-[#c8c8d0]">{preview.MOV}</span></span>
                  <span className="text-[#6a6a74]">DB <span className="text-[#c8c8d0]">{preview.DB}</span></span>
                  <span className="text-[#6a6a74]">BUILD <span className="text-[#c8c8d0]">{preview.BUILD}</span></span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右栏：技能分配 */}
          <Card className="bg-[#111116] border-[#c8a84e]/15 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#c8a84e] font-serif text-sm flex items-center justify-between">
                <span><Swords className="h-3 w-3 inline mr-1" />技能分配</span>
                <div className="flex gap-3 text-[10px] font-normal">
                  <span className={occPointsRemain === 0 ? 'text-[#7ddf7d]' : 'text-[#c8a84e]'}>
                    职业:{occPointsUsed}/{occPointsTotal}
                    {occPointsRemain > 0 && <span className="text-[#df7d7d]"> -{occPointsRemain}</span>}
                    {occPointsRemain === 0 && occPointsTotal > 0 && <CheckCircle className="h-3 w-3 inline ml-1" />}
                  </span>
                  <span className={intPointsRemain === 0 ? 'text-[#7ddf7d]' : 'text-[#c8a84e]'}>
                    兴趣:{intPointsUsed}/{intPointsTotal}
                    {intPointsRemain > 0 && <span className="text-[#df7d7d]"> -{intPointsRemain}</span>}
                    {intPointsRemain === 0 && intPointsTotal > 0 && <CheckCircle className="h-3 w-3 inline ml-1" />}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedOcc && (
                <div className="text-center text-xs text-[#6a6a74] py-8">请先选择职业以开始分配技能点</div>
              )}
              {selectedOcc && (
                <ScrollArea className="h-[420px] pr-2">
                  <div className="space-y-0.5">
                    {skills.map(skill => {
                      const isOcc = occSkillNames.has(skill.name);
                      const canAddOcc = isOcc && occPointsRemain > 0 && skill.currentValue < 99;
                      const canAddInt = !isOcc && intPointsRemain > 0 && skill.currentValue < 99;
                      const hasOccPts = skill.occupationPoints > 0;
                      const hasIntPts = skill.interestPoints > 0;
                      return (
                        <div key={skill.name}
                          className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
                            isOcc ? 'bg-[#c8a84e]/5 border-l-2 border-[#c8a84e]/30' : ''
                          }`}>
                          <span className="w-20 truncate flex items-center gap-1">
                            {isOcc && <span className="text-[#c8a84e] text-[10px]">★</span>}
                            <span className={isOcc ? 'text-[#c8c8d0]' : 'text-[#6a6a74]'}>{skill.name}</span>
                          </span>
                          <span className="w-8 text-center font-bold text-[#c8c8d0]">{skill.currentValue}%</span>
                          <div className="flex gap-1 ml-auto">
                            <button disabled={!hasOccPts} onClick={() => subSkillPoint(skill.name, 'occupation')}
                              className={`w-5 h-5 rounded text-[10px] leading-none flex items-center justify-center border
                                ${hasOccPts ? 'border-[#c8a84e]/30 text-[#c8a84e] hover:bg-[#c8a84e]/20' : 'border-transparent text-[#3a3a44]'}`}>−</button>
                            <button disabled={!canAddOcc} onClick={() => addSkillPoint(skill.name, 'occupation')}
                              className={`w-5 h-5 rounded text-[10px] leading-none flex items-center justify-center border
                                ${canAddOcc ? 'border-[#c8a84e]/30 text-[#c8a84e] hover:bg-[#c8a84e]/20' : 'border-transparent text-[#3a3a44]'}`}>+</button>
                            <span className="text-[9px] text-[#5a5a64] w-6 text-center">{skill.occupationPoints}</span>
                          </div>
                          <div className="flex gap-1">
                            <button disabled={!hasIntPts} onClick={() => subSkillPoint(skill.name, 'interest')}
                              className={`w-5 h-5 rounded text-[10px] leading-none flex items-center justify-center border
                                ${hasIntPts ? 'border-[#5a8a5a]/30 text-[#7ddf7d] hover:bg-[#5a8a5a]/20' : 'border-transparent text-[#3a3a44]'}`}>−</button>
                            <button disabled={!canAddInt} onClick={() => addSkillPoint(skill.name, 'interest')}
                              className={`w-5 h-5 rounded text-[10px] leading-none flex items-center justify-center border
                                ${canAddInt ? 'border-[#5a8a5a]/30 text-[#7ddf7d] hover:bg-[#5a8a5a]/20' : 'border-transparent text-[#3a3a44]'}`}>+</button>
                            <span className="text-[9px] text-[#5a5a64] w-6 text-center">{skill.interestPoints}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 武器选择 */}
        <Card className="bg-[#111116] border-[#c8a84e]/15">
          <CardHeader className="pb-2"><CardTitle className="text-[#c8a84e] font-serif text-sm">武器装备</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {COC_WEAPONS.map(w => {
                const selected = selectedWeaponIds.has(w.id);
                return (
                  <button key={w.id} onClick={() => toggleWeapon(w.id)}
                    className={`text-xs px-3 py-1.5 rounded border transition-all ${
                      selected ? 'bg-[#c8a84e]/15 border-[#c8a84e]/50 text-[#c8a84e]'
                        : 'bg-[#0c0c10] border-[#c8a84e]/10 text-[#6a6a74] hover:border-[#c8a84e]/30'
                    }`}
                    title={`${w.skillUsed} | 伤害:${w.damage} | 射程:${w.range} | ${w.attacks}次/轮 | ${w.notes}`}>
                    {w.name} <span className="ml-1 text-[10px] text-[#5a5a64]">| {w.damage}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 背景故事 */}
        <Card className="bg-[#111116] border-[#c8a84e]/15">
          <CardHeader className="pb-2"><CardTitle className="text-[#c8a84e] font-serif text-sm">背景故事</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={background} onChange={e => setBackground(e.target.value)}
              placeholder="描述角色的背景、动机、重要经历……"
              rows={3} className="bg-[#0c0c10] border-[#c8a84e]/20 text-sm resize-none" />
          </CardContent>
        </Card>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 pb-8">
          <Button variant="outline" onClick={() => navigate('/trpg')}
            className="border-[#c8a84e]/20 text-[#6a6a74] hover:bg-[#c8a84e]/5 text-sm">取消</Button>
          <Button variant="outline" onClick={exportPrintableSheet}
            className="border-[#c8a84e]/20 text-[#6a6a74] hover:text-[#c8a84e] text-sm">
            <FileDown className="h-4 w-4 mr-1" />导出可打印角色卡
          </Button>
          <Button onClick={handleSave}
            className="bg-[#c8a84e]/15 hover:bg-[#c8a84e]/25 text-[#c8a84e] border border-[#c8a84e]/30 text-sm">
            <Save className="h-4 w-4 mr-2" />保存角色并返回跑团
          </Button>
        </div>
      </div>
    </div>
  );
}

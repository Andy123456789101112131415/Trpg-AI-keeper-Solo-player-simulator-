import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Dices, ArrowLeft, Save, UserPlus } from 'lucide-react';
import type { Character, CharacterAttributes } from '@/types/game';
import { calculateDerivedAttributes, DEFAULT_SKILLS, rollAllAttributes } from '@/utils/gameLogic';
import { saveCharacter } from '@/utils/storage';

// ── COC 7版属性标签 ──
const ATTR_LABELS: Record<string, string> = {
  STR: '力量', CON: '体质', SIZ: '体型', DEX: '敏捷',
  APP: '外貌', INT: '智力', POW: '意志', EDU: '教育', LUCK: '幸运'
};

const ATTR_DESCS: Record<string, string> = {
  STR: '物理力量', CON: '健康与耐力', SIZ: '体型与身高',
  DEX: '灵巧与速度', APP: '外貌与魅力', INT: '学习与逻辑',
  POW: '意志力与魔力', EDU: '知识储备', LUCK: '运气'
};

export default function CharacterCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [age, setAge] = useState(25);
  const [occupation, setOccupation] = useState('');
  const [background, setBackground] = useState('');
  
  const [attributes, setAttributes] = useState<CharacterAttributes>({
    STR: 50, CON: 50, SIZ: 50, DEX: 50,
    APP: 50, INT: 50, POW: 50, EDU: 50, LUCK: 50
  });

  const rollAllAttributesLocal = () => {
    const attrs = rollAllAttributes();
    setAttributes({
      STR: attrs.STR,
      CON: attrs.CON,
      SIZ: attrs.SIZ,
      DEX: attrs.DEX,
      APP: attrs.APP,
      INT: attrs.INT,
      POW: attrs.POW,
      EDU: attrs.EDU,
      LUCK: attrs.LUCK,
    });
    
    toast({ title: '属性已生成', description: 'STR/CON/DEX/APP/POW = 3D6×5 | SIZ/INT/EDU = (2D6+6)×5 | LUCK = 3D6×5' });
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: '错误', description: '请输入角色名称', variant: 'destructive' });
      return;
    }
    if (!occupation.trim()) {
      toast({ title: '错误', description: '请输入职业', variant: 'destructive' });
      return;
    }

    const derived = calculateDerivedAttributes(attributes);
    
    const skills = DEFAULT_SKILLS.map(skill => ({
      ...skill,
      currentValue: skill.baseValue
    }));

    const character: Character = {
      id: Date.now().toString(),
      name: name.trim(),
      age,
      occupation: occupation.trim(),
      background: background.trim(),
      attributes,
      derived,
      skills,
      items: [],
      createdAt: Date.now()
    };

    saveCharacter(character);
    
    toast({
      title: '角色已创建',
      description: `${name} 已成功创建，返回跑团页面`
    });

    // 返回TRPG跑团页面
    navigate('/trpg');
  };

  // 派生属性预览
  const preview = calculateDerivedAttributes(attributes);

  return (
    <div className="min-h-screen bg-[#0c0c10] text-[#c8c8d0] p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/trpg')}
            className="border-[#c8a84e]/20 text-[#c8a84e] hover:bg-[#c8a84e]/10">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#c8a84e] font-serif tracking-widest">
              <UserPlus className="w-5 h-5 inline mr-2" />创建调查员
            </h1>
            <p className="text-xs text-[#6a6a74] mt-1">COC 7版规则 · 3D6×5 掷骰生成属性</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 基本信息 */}
          <Card className="bg-[#111116] border-[#c8a84e]/15">
            <CardHeader>
              <CardTitle className="text-[#c8a84e] font-serif text-base">基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#6a6a74]">姓名</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="输入角色姓名"
                  className="bg-[#0c0c10] border-[#c8a84e]/20 text-[#c8c8d0] text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#6a6a74]">年龄</Label>
                  <Input type="number" value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    min={15} max={90}
                    className="bg-[#0c0c10] border-[#c8a84e]/20 text-[#c8c8d0] text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#6a6a74]">职业</Label>
                  <Input value={occupation} onChange={(e) => setOccupation(e.target.value)}
                    placeholder="如：记者、侦探"
                    className="bg-[#0c0c10] border-[#c8a84e]/20 text-[#c8c8d0] text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[#6a6a74]">背景故事</Label>
                <Textarea value={background} onChange={(e) => setBackground(e.target.value)}
                  placeholder="简要描述角色的背景……"
                  rows={3}
                  className="bg-[#0c0c10] border-[#c8a84e]/20 text-[#c8c8d0] text-sm resize-none" />
              </div>

              {/* 派生属性预览 */}
              <div className="border-t border-[#c8a84e]/10 pt-3 mt-3">
                <div className="text-xs text-[#c8a84e] font-serif mb-2">派生属性预览</div>
                <div className="grid grid-cols-4 gap-x-2 gap-y-1 text-[10px] text-[#6a6a74]">
                  <span>HP {preview.HP}</span>
                  <span>SAN {preview.SAN}</span>
                  <span>MP {preview.MP}</span>
                  <span>MOV {preview.MOV}</span>
                  <span>DB {preview.DB}</span>
                  <span>BUILD {preview.BUILD}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 属性值 */}
          <Card className="bg-[#111116] border-[#c8a84e]/15">
            <CardHeader>
              <CardTitle className="text-[#c8a84e] font-serif text-base">属性值</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={rollAllAttributesLocal} variant="outline"
                className="w-full border-[#c8a84e]/30 text-[#c8a84e] hover:bg-[#c8a84e]/10 text-sm">
                <Dices className="mr-2 h-4 w-4" />
                随机生成所有属性
              </Button>

              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(attributes) as (keyof CharacterAttributes)[]).map(key => (
                  <div key={key} className="space-y-1">
                    <Label className="text-[10px] text-[#6a6a74]" title={ATTR_DESCS[key]}>
                      {ATTR_LABELS[key]} ({key})
                    </Label>
                    <Input type="number" value={attributes[key]}
                      onChange={(e) => setAttributes({ ...attributes, [key]: Number(e.target.value) })}
                      min={1} max={99}
                      className={`bg-[#0c0c10] border-[#c8a84e]/20 text-center text-sm ${
                        attributes[key] >= 70 ? 'text-[#a0d0a0]' :
                        attributes[key] <= 30 ? 'text-[#d0a0a0]' : 'text-[#c8c8d0]'
                      }`}
                    />
                  </div>
                ))}
              </div>

              <div className="text-[10px] text-[#6a6a74] border-t border-[#c8a84e]/10 pt-2">
                💡 STR/CON/DEX/APP/POW=3D6×5 | SIZ/INT/EDU=(2D6+6)×5 | ≥70优秀 ≤30较差
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 保存按钮 */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate('/trpg')}
            className="border-[#c8a84e]/20 text-[#6a6a74] hover:bg-[#c8a84e]/5 text-sm">
            取消
          </Button>
          <Button onClick={handleSave}
            className="bg-[#c8a84e]/15 hover:bg-[#c8a84e]/25 text-[#c8a84e] border border-[#c8a84e]/30 text-sm">
            <Save className="mr-2 h-4 w-4" />
            保存角色并返回跑团
          </Button>
        </div>
      </div>
    </div>
  );
}

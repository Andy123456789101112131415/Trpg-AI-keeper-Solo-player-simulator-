import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Dices, ArrowLeft, Save } from 'lucide-react';
import type { Character, CharacterAttributes } from '@/types/game';
import { rollAttribute, rollAttributeEDU, rollAttributeLuck, calculateDerivedAttributes, DEFAULT_SKILLS } from '@/utils/gameLogic';
import { saveCharacter } from '@/utils/storage';

export default function CharacterCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [age, setAge] = useState(25);
  const [occupation, setOccupation] = useState('');
  const [background, setBackground] = useState('');
  
  const [attributes, setAttributes] = useState<CharacterAttributes>({
    STR: 50,
    CON: 50,
    SIZ: 50,
    DEX: 50,
    APP: 50,
    INT: 50,
    POW: 50,
    EDU: 50,
    LUCK: 50
  });

  const rollAllAttributes = () => {
    setAttributes({
      STR: rollAttribute() * 5,
      CON: rollAttribute() * 5,
      SIZ: rollAttribute() * 5,
      DEX: rollAttribute() * 5,
      APP: rollAttribute() * 5,
      INT: rollAttribute() * 5,
      POW: rollAttribute() * 5,
      EDU: rollAttributeEDU() * 5,
      LUCK: rollAttributeLuck()
    });
    
    toast({
      title: '属性已生成',
      description: '所有属性值已随机生成'
    });
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast({
        title: '错误',
        description: '请输入角色名称',
        variant: 'destructive'
      });
      return;
    }

    if (!occupation.trim()) {
      toast({
        title: '错误',
        description: '请输入职业',
        variant: 'destructive'
      });
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
      description: `${name} 已成功创建`
    });

    navigate('/scenario/select');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-accent">创建调查员</h1>
            <p className="text-sm text-muted-foreground">按照COC7版规则创建你的角色</p>
          </div>
        </div>

        <div className="grid @container gap-6">
          <div className="grid grid-cols-1 @md:grid-cols-2 gap-6">
            {/* 基本信息 */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-accent">基本信息</CardTitle>
                <CardDescription className="text-muted-foreground">
                  填写角色的基本资料
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground">姓名</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="输入角色姓名"
                    className="bg-input border-border text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age" className="text-foreground">年龄</Label>
                  <Input
                    id="age"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    min={15}
                    max={90}
                    className="bg-input border-border text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="occupation" className="text-foreground">职业</Label>
                  <Input
                    id="occupation"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="如：记者、侦探、教授"
                    className="bg-input border-border text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="background" className="text-foreground">背景故事</Label>
                  <Textarea
                    id="background"
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    placeholder="简要描述角色的背景..."
                    rows={4}
                    className="bg-input border-border text-foreground resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 属性值 */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-accent">属性值</CardTitle>
                <CardDescription className="text-muted-foreground">
                  投掷骰子生成属性或手动调整
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={rollAllAttributes} className="w-full" variant="outline">
                  <Dices className="mr-2 h-4 w-4" />
                  随机生成所有属性
                </Button>

                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(attributes).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        {key === 'STR' && '力量'}
                        {key === 'CON' && '体质'}
                        {key === 'SIZ' && '体型'}
                        {key === 'DEX' && '敏捷'}
                        {key === 'APP' && '外貌'}
                        {key === 'INT' && '智力'}
                        {key === 'POW' && '意志'}
                        {key === 'EDU' && '教育'}
                        {key === 'LUCK' && '幸运'}
                      </Label>
                      <Input
                        type="number"
                        value={value}
                        onChange={(e) => setAttributes({
                          ...attributes,
                          [key]: Number(e.target.value)
                        })}
                        min={1}
                        max={99}
                        className="bg-input border-border text-foreground text-center"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate('/')}>
            取消
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            保存角色
          </Button>
        </div>
      </div>
    </div>
  );
}

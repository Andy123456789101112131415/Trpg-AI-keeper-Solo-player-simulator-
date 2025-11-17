import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { Character } from '@/types/game';
import { Heart, Brain, Zap, User } from 'lucide-react';

interface CharacterSheetProps {
  character: Character;
}

export function CharacterSheet({ character }: CharacterSheetProps) {
  const { attributes, derived, name, occupation, age } = character;

  return (
    <Card className="bg-card border-border h-full overflow-y-auto">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-accent flex items-center gap-2">
          <User className="h-5 w-5" />
          角色卡
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 基本信息 */}
        <div className="space-y-2">
          <div className="text-lg font-semibold text-foreground">{name}</div>
          <div className="flex gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{occupation}</Badge>
            <Badge variant="outline">{age}岁</Badge>
          </div>
        </div>

        <Separator className="bg-border" />

        {/* 生命值、魔法值、理智值 */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-foreground">
                <Heart className="h-4 w-4 text-destructive" />
                生命值 HP
              </span>
              <span className="font-semibold text-foreground">
                {derived.HP}/{derived.maxHP}
              </span>
            </div>
            <Progress value={(derived.HP / derived.maxHP) * 100} className="h-2" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-foreground">
                <Zap className="h-4 w-4 text-accent" />
                魔法值 MP
              </span>
              <span className="font-semibold text-foreground">
                {derived.MP}/{derived.maxMP}
              </span>
            </div>
            <Progress value={(derived.MP / derived.maxMP) * 100} className="h-2" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-foreground">
                <Brain className="h-4 w-4 text-primary" />
                理智值 SAN
              </span>
              <span className="font-semibold text-foreground">
                {derived.SAN}/{derived.maxSAN}
              </span>
            </div>
            <Progress value={(derived.SAN / derived.maxSAN) * 100} className="h-2" />
          </div>
        </div>

        <Separator className="bg-border" />

        {/* 属性值 */}
        <div>
          <h4 className="text-sm font-semibold text-accent mb-2">属性</h4>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="flex justify-between p-2 bg-muted rounded">
              <span className="text-muted-foreground">力量</span>
              <span className="font-semibold text-foreground">{attributes.STR}</span>
            </div>
            <div className="flex justify-between p-2 bg-muted rounded">
              <span className="text-muted-foreground">体质</span>
              <span className="font-semibold text-foreground">{attributes.CON}</span>
            </div>
            <div className="flex justify-between p-2 bg-muted rounded">
              <span className="text-muted-foreground">体型</span>
              <span className="font-semibold text-foreground">{attributes.SIZ}</span>
            </div>
            <div className="flex justify-between p-2 bg-muted rounded">
              <span className="text-muted-foreground">敏捷</span>
              <span className="font-semibold text-foreground">{attributes.DEX}</span>
            </div>
            <div className="flex justify-between p-2 bg-muted rounded">
              <span className="text-muted-foreground">外貌</span>
              <span className="font-semibold text-foreground">{attributes.APP}</span>
            </div>
            <div className="flex justify-between p-2 bg-muted rounded">
              <span className="text-muted-foreground">智力</span>
              <span className="font-semibold text-foreground">{attributes.INT}</span>
            </div>
            <div className="flex justify-between p-2 bg-muted rounded">
              <span className="text-muted-foreground">意志</span>
              <span className="font-semibold text-foreground">{attributes.POW}</span>
            </div>
            <div className="flex justify-between p-2 bg-muted rounded">
              <span className="text-muted-foreground">教育</span>
              <span className="font-semibold text-foreground">{attributes.EDU}</span>
            </div>
            <div className="flex justify-between p-2 bg-muted rounded">
              <span className="text-muted-foreground">幸运</span>
              <span className="font-semibold text-foreground">{attributes.LUCK}</span>
            </div>
          </div>
        </div>

        <Separator className="bg-border" />

        {/* 派生属性 */}
        <div>
          <h4 className="text-sm font-semibold text-accent mb-2">派生属性</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between p-2 bg-muted rounded">
              <span className="text-muted-foreground">移动力</span>
              <span className="font-semibold text-foreground">{derived.MOV}</span>
            </div>
            <div className="flex justify-between p-2 bg-muted rounded">
              <span className="text-muted-foreground">体格</span>
              <span className="font-semibold text-foreground">{derived.BUILD}</span>
            </div>
            <div className="flex justify-between p-2 bg-muted rounded col-span-2">
              <span className="text-muted-foreground">伤害加值</span>
              <span className="font-semibold text-foreground">{derived.DB}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

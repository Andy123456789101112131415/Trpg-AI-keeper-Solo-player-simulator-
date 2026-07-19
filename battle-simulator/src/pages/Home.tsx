import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, Dices, Scroll } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        {/* 标题 */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl max-sm:text-4xl font-bold text-accent tracking-wider">
            克苏鲁的呼唤
          </h1>
          <p className="text-xl max-sm:text-lg text-muted-foreground italic">
            守秘人之旅
          </p>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            基于《克苏鲁的呼唤》第七版规则的跑团游戏。在这里，你将扮演一名调查员，
            在AI守秘人的引导下，探索充满未知与恐怖的神秘世界。
          </p>
        </div>

        {/* 主要操作 */}
        <div className="grid @container gap-4">
          <div className="grid grid-cols-1 @md:grid-cols-2 gap-4">
            <Card className="bg-card border-border hover:border-accent transition-colors cursor-pointer"
                  onClick={() => navigate('/character/create')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-accent">
                  <Users className="h-5 w-5" />
                  创建角色
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  按照COC7版规则创建你的调查员角色
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  开始创建
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:border-accent transition-colors cursor-pointer"
                  onClick={() => navigate('/scenario/select')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-accent">
                  <BookOpen className="h-5 w-5" />
                  选择剧本
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  从多个精心设计的剧本中选择你的冒险
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  浏览剧本
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 游戏特色 */}
        <div className="grid @container gap-4">
          <div className="grid grid-cols-1 @md:grid-cols-3 gap-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm text-accent">
                  <Dices className="h-4 w-4" />
                  严格遵循规则
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                完全基于COC7版规则，包括属性检定、技能判定和理智值系统
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm text-accent">
                  <Scroll className="h-4 w-4" />
                  AI守秘人
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                智能AI扮演守秘人角色，提供沉浸式的剧情体验和NPC互动
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm text-accent">
                  <BookOpen className="h-4 w-4" />
                  多样剧本
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                多个精心设计的剧本，涵盖不同难度和主题的克苏鲁冒险
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 版权信息 */}
        <div className="text-center text-xs text-muted-foreground">
          <p>2025 克苏鲁的呼唤：守秘人之旅</p>
        </div>
      </div>
    </div>
  );
}

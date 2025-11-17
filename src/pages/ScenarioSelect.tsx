import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, Clock } from 'lucide-react';
import { SCENARIOS } from '@/data/scenarios';
import { getCurrentCharacter } from '@/utils/storage';
import { useToast } from '@/hooks/use-toast';

export default function ScenarioSelect() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSelectScenario = (scenarioId: string) => {
    const character = getCurrentCharacter();
    
    if (!character) {
      toast({
        title: '需要创建角色',
        description: '请先创建一个调查员角色',
        variant: 'destructive'
      });
      navigate('/character/create');
      return;
    }

    navigate(`/game/${scenarioId}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-primary text-primary-foreground';
      case 'medium':
        return 'bg-accent text-accent-foreground';
      case 'hard':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '简单';
      case 'medium':
        return '中等';
      case 'hard':
        return '困难';
      default:
        return difficulty;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 头部 */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-accent">选择剧本</h1>
            <p className="text-sm text-muted-foreground">选择一个剧本开始你的冒险</p>
          </div>
        </div>

        {/* 剧本列表 */}
        <div className="grid @container gap-6">
          <div className="grid grid-cols-1 @md:grid-cols-2 gap-6">
            {SCENARIOS.map((scenario) => (
              <Card key={scenario.id} className="bg-card border-border hover:border-accent transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-xl text-accent">{scenario.title}</CardTitle>
                    <Badge className={getDifficultyColor(scenario.difficulty)}>
                      {getDifficultyText(scenario.difficulty)}
                    </Badge>
                  </div>
                  <CardDescription className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Clock className="h-3 w-3" />
                    {scenario.estimatedTime}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-foreground leading-relaxed">
                    {scenario.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {scenario.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={() => handleSelectScenario(scenario.id)}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    开始冒险
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

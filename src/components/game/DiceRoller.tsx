import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dices } from 'lucide-react';
import { rollD100 } from '@/utils/gameLogic';

interface DiceRollerProps {
  onRoll: (result: number) => void;
  disabled?: boolean;
}

export function DiceRoller({ onRoll, disabled }: DiceRollerProps) {
  const [rolling, setRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<number | null>(null);

  const handleRoll = () => {
    setRolling(true);
    
    // 模拟骰子滚动动画
    let count = 0;
    const interval = setInterval(() => {
      setLastRoll(Math.floor(Math.random() * 100) + 1);
      count++;
      
      if (count >= 10) {
        clearInterval(interval);
        const finalResult = rollD100();
        setLastRoll(finalResult);
        setRolling(false);
        onRoll(finalResult);
      }
    }, 50);
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6 flex flex-col items-center gap-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">投掷骰子</h3>
          {lastRoll !== null && (
            <div className="text-5xl font-bold text-accent mb-2">
              {lastRoll}
            </div>
          )}
        </div>
        
        <Button
          onClick={handleRoll}
          disabled={disabled || rolling}
          className="w-full"
          size="lg"
        >
          <Dices className="mr-2 h-5 w-5" />
          {rolling ? '投掷中...' : '投掷D100'}
        </Button>
      </CardContent>
    </Card>
  );
}

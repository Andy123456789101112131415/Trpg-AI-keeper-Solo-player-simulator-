import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { CharacterSheet } from '@/components/game/CharacterSheet';
import { DiceRoller } from '@/components/game/DiceRoller';
import { getCurrentCharacter, saveGameState, getGameState } from '@/utils/storage';
import { SCENARIOS } from '@/data/scenarios';
import { sendChatStream } from '@/services/ai';
import type { ChatMessage } from '@/types/game';
import { performCheck } from '@/utils/gameLogic';

const APP_ID = import.meta.env.VITE_APP_ID;
const AI_ENDPOINT = 'https://api-integrations.appmiaoda.com/app-7m416wmxymm9/api-2bk93oeO9NlE/v2/chat/completions';

export default function Game() {
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [character, setCharacter] = useState(getCurrentCharacter());
  const [scenario, setScenario] = useState(SCENARIOS.find(s => s.id === scenarioId));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [waitingForRoll, setWaitingForRoll] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!character) {
      toast({
        title: '需要创建角色',
        description: '请先创建一个调查员角色',
        variant: 'destructive'
      });
      navigate('/character/create');
      return;
    }

    if (!scenario) {
      toast({
        title: '剧本不存在',
        description: '请选择一个有效的剧本',
        variant: 'destructive'
      });
      navigate('/scenario/select');
      return;
    }

    // 加载游戏状态或初始化
    const savedState = getGameState();
    if (savedState && savedState.scenarioId === scenarioId) {
      setMessages(savedState.conversationHistory);
    } else {
      // 初始化游戏
      initializeGame();
    }
  }, []);

  useEffect(() => {
    // 自动滚动到底部
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const initializeGame = () => {
    if (!character || !scenario) return;

    const systemPrompt = `你是《克苏鲁的呼唤》跑团游戏的守秘人（KP）。你需要：

1. 严格遵循COC7版规则
2. 根据剧本"${scenario.title}"推进剧情
3. 描述场景要生动、有氛围感
4. 扮演NPC角色
5. 当需要检定时，明确告知玩家需要进行什么检定（如"请进行侦查检定"）
6. 根据检定结果描述后果
7. 管理角色的生命值、理智值等数据变化

当前剧本简介：${scenario.description}

玩家角色信息：
- 姓名：${character.name}
- 职业：${character.occupation}
- 背景：${character.background}

现在开始游戏，请描述开场场景。`;

    const systemMessage: ChatMessage = {
      role: 'system',
      content: systemPrompt,
      timestamp: Date.now()
    };

    setMessages([systemMessage]);
    
    // 获取开场描述
    sendAIMessage([systemMessage], '开始游戏');
  };

  const sendAIMessage = async (history: ChatMessage[], userMessage?: string) => {
    if (isLoading) return;

    setIsLoading(true);
    
    const newMessages = userMessage 
      ? [...history, { role: 'user' as const, content: userMessage, timestamp: Date.now() }]
      : history;

    if (userMessage) {
      setMessages(newMessages);
    }

    // 创建临时消息用于显示AI回复
    const tempMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    };
    
    setMessages([...newMessages, tempMessage]);

    abortControllerRef.current = new AbortController();

    try {
      await sendChatStream({
        endpoint: AI_ENDPOINT,
        apiId: APP_ID,
        messages: newMessages,
        onUpdate: (content) => {
          setMessages([...newMessages, { ...tempMessage, content }]);
        },
        onComplete: () => {
          setIsLoading(false);
          // 保存游戏状态
          if (character && scenario) {
            saveGameState({
              characterId: character.id,
              scenarioId: scenario.id,
              currentScene: '',
              conversationHistory: [...newMessages, tempMessage],
              progress: 0
            });
          }
        },
        onError: (error) => {
          console.error('AI Error:', error);
          toast({
            title: '错误',
            description: '与守秘人通信失败，请重试',
            variant: 'destructive'
          });
          setIsLoading(false);
          // 移除临时消息
          setMessages(newMessages);
        },
        signal: abortControllerRef.current.signal
      });
    } catch (error) {
      console.error('Send message error:', error);
      setIsLoading(false);
      setMessages(newMessages);
    }
  };

  const handleSendMessage = () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    sendAIMessage(messages, userMessage);
  };

  const handleDiceRoll = (result: number) => {
    setLastRoll(result);
    
    // 自动发送骰子结果
    const rollMessage = `我投掷了骰子，结果是：${result}`;
    sendAIMessage(messages, rollMessage);
    
    setWaitingForRoll(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!character || !scenario) {
    return null;
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* 头部 */}
      <div className="border-b border-border bg-card p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate('/scenario/select')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-accent">{scenario.title}</h1>
              <p className="text-sm text-muted-foreground">{character.name} - {character.occupation}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto p-4 grid @container gap-4">
          <div className="grid grid-cols-1 @md:grid-cols-[300px_1fr_300px] gap-4 h-full">
            {/* 左侧：角色卡 */}
            <div className="hidden @md:block overflow-hidden">
              <CharacterSheet character={character} />
            </div>

            {/* 中间：剧情对话区 */}
            <div className="flex flex-col gap-4 min-h-0">
              <Card className="flex-1 bg-card border-border flex flex-col min-h-0">
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.filter(m => m.role !== 'system').map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                        </div>
                      </div>
                    ))}
                    {isLoading && messages[messages.length - 1]?.content === '' && (
                      <div className="flex justify-start">
                        <div className="bg-muted text-foreground rounded-lg p-3">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                
                <Separator className="bg-border" />
                
                <div className="p-4">
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="输入你的行动..."
                      disabled={isLoading}
                      className="bg-input border-border text-foreground"
                    />
                    <Button onClick={handleSendMessage} disabled={isLoading || !input.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            {/* 右侧：骰子 */}
            <div className="hidden @md:block">
              <DiceRoller onRoll={handleDiceRoll} disabled={isLoading} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

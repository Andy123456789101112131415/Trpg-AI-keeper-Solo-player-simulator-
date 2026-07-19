import type { Scenario } from '@/types/game';

export const SCENARIOS: Scenario[] = [
  {
    id: 'haunted_house',
    title: '鬼屋疑云',
    description: '一座废弃多年的维多利亚式老宅突然传出诡异的声响。当地居民声称看到了幽灵的身影，而你作为调查员，被委托调查这起超自然事件。随着调查的深入,你发现这座房子隐藏着一个黑暗的秘密...',
    difficulty: 'easy',
    estimatedTime: '1-2小时',
    tags: ['鬼屋', '超自然', '调查']
  },
  {
    id: 'library_mystery',
    title: '图书馆的秘密',
    description: '大学图书馆的古籍区发生了一系列离奇事件。几名学生在查阅古老典籍后精神失常，而图书管理员神秘失踪。你需要深入图书馆，揭开隐藏在古老书页中的可怕真相。',
    difficulty: 'medium',
    estimatedTime: '2-3小时',
    tags: ['图书馆', '古籍', '知识']
  },
  {
    id: 'coastal_horror',
    title: '海岸惊魂',
    description: '一个偏远的海滨小镇最近发生了多起渔民失踪案。当地人传说海中出现了不可名状的生物，而你在调查中发现，这个小镇与一个古老的邪教组织有着千丝万缕的联系...',
    difficulty: 'hard',
    estimatedTime: '3-4小时',
    tags: ['海洋', '邪教', '克苏鲁']
  },
  {
    id: 'asylum_nightmare',
    title: '疯人院噩梦',
    description: '一座废弃的精神病院即将被拆除，但施工队在地下室发现了令人不安的东西。作为调查员，你需要进入这座充满疯狂气息的建筑，面对那些被遗忘的恐怖实验和不应存在的生物。',
    difficulty: 'hard',
    estimatedTime: '3-4小时',
    tags: ['精神病院', '实验', '恐怖']
  },
  {
    id: 'museum_curse',
    title: '博物馆诅咒',
    description: '市立博物馆新展出了一批来自埃及的古代文物，但随之而来的是一系列诡异的死亡事件。所有受害者都在死前表现出极度的恐惧，而你需要在更多人丧命之前，找出这些文物背后的真相。',
    difficulty: 'medium',
    estimatedTime: '2-3小时',
    tags: ['博物馆', '诅咒', '古埃及']
  }
];

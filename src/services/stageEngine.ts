// 阶段驱动跑团引擎
// 流程：分析玩家 input → 定位当前地点/阶段 → 从固定剧本数据库调取描写原文 → AI 润色 + 角色扮演
// AI 只润色和扮演，绝不编造事实

import type { FixedScenario, StageLocation, StageSection } from '@/types/scenario';

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-chat';

// ── 运行时进度状态 ──
export interface StageProgress {
  currentLocationId: string;
  currentStageId: string;
  history: { locationId: string; stageId: string; summary: string }[];
}

// ── AI 通用调用 ──
async function callAI(apiKey: string, messages: { role: string; content: string }[], maxTokens = 1500, temperature = 0.7): Promise<string> {
  const resp = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, messages, temperature, max_tokens: maxTokens }),
  });
  if (!resp.ok) { const t = await resp.text(); throw new Error(`API ${resp.status}: ${t}`); }
  const d = await resp.json();
  return d.choices?.[0]?.message?.content ?? '';
}

// ── 第1次调用：定位玩家当前所在的地点 ──
async function locateLocation(apiKey: string, scenario: FixedScenario, playerInput: string, progress: StageProgress): Promise<string> {
  const locationNames = scenario.locations.map((l, i) => `${i}:${l.name}`).join('\n');
  const prompt = `你是COC跑团的流程控制器。根据玩家输入，判断调查员当前位于哪个地点。

## 玩家当前进度
当前地点：${scenario.locations.find(l => l.id === progress.currentLocationId)?.name || '未知'}

## 玩家输入
${playerInput}

## 所有可去地点（编号:名称）
${locationNames}

请只返回一个地点的编号（数字）。如果玩家没有明确要去新地点，返回当前地点。`;

  const raw = (await callAI(apiKey, [{ role: 'user', content: prompt }], 20, 0.1)).trim();
  const idx = parseInt(raw, 10);
  if (!Number.isNaN(idx) && idx >= 0 && idx < scenario.locations.length) {
    return scenario.locations[idx].id;
  }
  return progress.currentLocationId;
}

// ── 第2次调用：定位具体阶段 ──
async function locateStage(apiKey: string, location: StageLocation, playerInput: string, currentStageId: string): Promise<string> {
  if (location.stages.length <= 1) return location.stages[0]?.id || currentStageId;

  const stageList = location.stages.map((s, i) => `${i}:${s.title}`).join('\n');
  const prompt = `你是COC跑团的流程控制器。调查员位于"${location.name}"，当前阶段是"${location.stages.find(s => s.id === currentStageId)?.title}"。

根据玩家输入判断现在应该进入哪个阶段。

## 玩家输入
${playerInput}

## 该地点的阶段（编号:标题）
${stageList}

请只返回一个阶段编号（数字）。如果不确定，返回当前阶段。`;

  const raw = (await callAI(apiKey, [{ role: 'user', content: prompt }], 20, 0.1)).trim();
  const idx = parseInt(raw, 10);
  if (!Number.isNaN(idx) && idx >= 0 && idx < location.stages.length) {
    return location.stages[idx].id;
  }
  return currentStageId;
}

// ── 第3次调用：润色描写 + 代入NPC角色 ──
async function polishAndRoleplay(apiKey: string, scenario: FixedScenario, stage: StageSection, playerInput: string, characterInfo: string): Promise<string> {
  const npcLines = stage.npcs?.map(n => `【${n.name}】性格：${n.personality}\n台词：${n.lines.join('\n')}`).join('\n\n') || '无NPC';

  const prompt = `你是COC跑团的守秘人(KP)。请基于以下剧本原文，为玩家叙述当前场景。

## 严格规则
1. 只能使用下面提供的"描写原文"和"NPC台词"，不得编造任何原文没有的事实。
2. 用生动自然的文学语言润色，但信息内容必须与原文一致。
3. 如果阶段有NPC，代入NPC的性格和台词与玩家对话。
4. 如果阶段需要检定，输出 [CHECK:技能名] 或 [SAN_CHECK:原因]。
5. 结尾引导玩家做出下一步行动选择。

## 当前阶段：${stage.title}

## 描写原文
${stage.description}

## NPC信息
${npcLines}

## 线索（玩家触发后可揭示，现在先不要主动全给）
${stage.clues.map(c => '- ' + c).join('\n')}

## 检定要求
${
  stage.checks?.map(c => `- ${c.skill}检定（${c.difficulty || 'regular'}）：成功"${c.successText}"`).join('\n') || '无'
}

## 玩家角色信息
${characterInfo}

## 玩家刚才的输入
${playerInput}

请回复（200-400字）。`;

  return await callAI(apiKey, [{ role: 'user', content: prompt }], 1500, 0.7);
}

// ── 主导航函数：一次完整的回合 ──
export async function runStageTurn(
  apiKey: string,
  scenario: FixedScenario,
  progress: StageProgress,
  playerInput: string,
  characterInfo: string,
): Promise<{ reply: string; progress: StageProgress }> {
  // 1. 定位地点
  const locationId = await locateLocation(apiKey, scenario, playerInput, progress);
  const location = scenario.locations.find(l => l.id === locationId) || scenario.locations[0];

  // 2. 定位阶段
  const stageId = await locateStage(apiKey, location, playerInput, progress.currentStageId);
  const stage = location.stages.find(s => s.id === stageId) || location.stages[0];

  // 3. 润色 + 角色扮演
  const reply = await polishAndRoleplay(apiKey, scenario, stage, playerInput, characterInfo);

  // 4. 更新进度
  const newProgress: StageProgress = {
    currentLocationId: locationId,
    currentStageId: stageId,
    history: [...progress.history, { locationId, stageId, summary: playerInput.slice(0, 50) }],
  };

  return { reply, progress: newProgress };
}

// ── 开场：定位起始地点和阶段，输出开场描写 ──
export async function runStageOpening(
  apiKey: string,
  scenario: FixedScenario,
  characterInfo: string,
): Promise<{ reply: string; progress: StageProgress }> {
  const startLocation = scenario.locations.find(l => l.id === scenario.startLocationId) || scenario.locations[0];
  const startStage = startLocation.stages[0];

  const progress: StageProgress = {
    currentLocationId: startLocation.id,
    currentStageId: startStage.id,
    history: [],
  };

  const reply = await polishAndRoleplay(apiKey, scenario, startStage, '（游戏开始）', characterInfo);
  return { reply, progress };
}

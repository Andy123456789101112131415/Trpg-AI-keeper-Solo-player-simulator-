// 警察局 Q&A 引擎
// 第1次 API：分析玩家 input，判断命中了哪些 Q&A 条件（严格只返回代号列表）
// 第2次 API：把命中的答案用警探语气润色输出（严格不添加内容）

import type { PoliceLocationData, PoliceQA } from '@/data/scenarios/haunting2/policeData';

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-chat';

async function callAI(apiKey: string, messages: { role: string; content: string }[], maxTokens = 500, temperature = 0.1): Promise<string> {
  const resp = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, messages, temperature, max_tokens: maxTokens }),
  });
  if (!resp.ok) { const t = await resp.text(); throw new Error(`API ${resp.status}: ${t}`); }
  const d = await resp.json();
  return d.choices?.[0]?.message?.content ?? '';
}

// ── 第1次调用：分析 input，返回命中的代号列表 ──
async function matchTriggers(apiKey: string, data: PoliceLocationData, playerInput: string): Promise<string[]> {
  const qaDesc = data.qaList.map(q => `${q.code}: ${q.matchHint}`).join('\n');

  const prompt = `你是COC跑团的对话分析器。下面是警察局场景中，警探可以回答的若干问题（代号:说明）。

${qaDesc}

玩家刚才说：
"${playerInput}"

请判断玩家的这句话命中了哪些问题的触发条件。只返回命中问题的代号，多个用逗号分隔。如果没有命中任何问题，只返回"无"。

严格规则：
1. 只输出代号（如 CALL,SCENE 或 无），不要输出任何解释。
2. 只有玩家明确询问或暗示了某个问题，才返回对应代号。
3. 不要臆测玩家没问的内容。`;

  const raw = (await callAI(apiKey, [{ role: 'user', content: prompt }], 60, 0.1)).trim();
  if (raw === '无' || raw === '无。' || raw === '') return [];

  // 解析代号：按逗号/空格/分号分隔，过滤无效代号
  const validCodes = new Set(data.qaList.map(q => q.code));
  return raw
    .split(/[,，、\s;；]+/)
    .map(s => s.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .filter(c => validCodes.has(c));
}

// ── 第2次调用：警探语气润色输出 ──
async function detectiveReply(apiKey: string, data: PoliceLocationData, matched: PoliceQA[]): Promise<string> {
  const answers = matched.map(q => `【${q.code}】${q.answer}`).join('\n\n');

  const prompt = `你是COC跑团中的警探托拜厄斯·斯特拉克曼。请根据下面给出的信息，用你自己的口吻回答调查员。

## 你的性格
${data.detectivePersona}

## 你现在要告诉调查员的信息（只能基于这些，不得添加任何内容）
${answers}

## 严格规则
1. 只能转述上面"要告诉调查员的信息"，一字一句的事实都不能改变，也不能添加原文没有的细节、推测或多余信息。
2. 用警探疲惫、诚恳的口吻自然地说出来，可以加一点符合性格的语气（如揉太阳穴、叹气），但不能编造新的案情内容。
3. 如果有多条信息，自然地串联起来。
4. 200-350字。`;

  return await callAI(apiKey, [{ role: 'user', content: prompt }], 600, 0.7);
}

// ── 敷衍回答：玩家没问到任何 Q&A 条件时，AI 以警探语气敷衍 ──
async function detectiveDeflect(
  apiKey: string,
  data: PoliceLocationData,
  playerInput: string,
  alreadyAnsweredCodes: string[],
): Promise<string> {
  // 注意：这里绝不能把 qaList 的答案喂给 AI。只给"已答过的问题主题"让 AI 知道哪些已经说过，避免重复/编造。
  const answeredHint = alreadyAnsweredCodes.length > 0
    ? `以下问题你之前已经回答过了（不要再重复、也不要补充新的细节）：${alreadyAnsweredCodes.join('、')}`
    : '你还没有回答过任何细节问题。';

  const prompt = `你是COC跑团中的警探托拜厄斯·斯特拉克曼。调查员对你说了一句话，但这句话要么是闲聊/套近乎，要么问的事情你并不清楚、或之前已经回答过了。

## 你的性格
${data.detectivePersona}

## 你负责的案子背景（仅作身份背景，不是可泄露的新情报）
你在办一起牧师托马斯·金博尔的失踪案，三天前因墓地枪声报案而介入。除此之外你不掌握任何额外细节。

${answeredHint}

## 调查员刚才说
"${playerInput}"

## 严格规则
1. 以警探疲惫、诚恳、略显敷衍的口吻回应，把话题礼貌地引回到"这件失踪案还有什么想了解的"。
2. 绝不可编造任何你背景之外的新信息（比如不能编造"报警人是谁""电话从哪打的""现场有什么"这类你并未真正掌握的细节）。
3. 如果玩家问的问题你之前已经回答过，就简短地说"这个我之前说过了"，不要再展开。
4. 100-200字。`;

  return await callAI(apiKey, [{ role: 'user', content: prompt }], 400, 0.7);
}

// ── 主导航：一次 Q&A 回合 ──
export async function runPoliceTurn(
  apiKey: string,
  data: PoliceLocationData,
  playerInput: string,
  alreadyAnswered: Set<string>,
): Promise<{ reply: string; triggered: string[] }> {
  // 1. 匹配触发条件
  const triggered = await matchTriggers(apiKey, data, playerInput);

  // 过滤掉已经回答过的
  const newTriggers = triggered.filter(c => !alreadyAnswered.has(c));
  newTriggers.forEach(c => alreadyAnswered.add(c));

  if (newTriggers.length === 0) {
    // 没触发任何条件：AI 以警探语气敷衍，不透露新信息
    const deflect = await detectiveDeflect(apiKey, data, playerInput, [...alreadyAnswered]);
    return { reply: deflect, triggered: [] };
  }

  // 2. 取出对应的答案
  const matched = data.qaList.filter(q => newTriggers.includes(q.code));

  // 3. 警探语气润色
  const reply = await detectiveReply(apiKey, data, matched);

  return { reply, triggered: newTriggers };
}

// ── 开场：环境描写 + 简报 ──
export function policeOpening(data: PoliceLocationData): string {
  return `${data.environment}\n\n${data.briefing}`;
}

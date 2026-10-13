// 通用"地点程序化"引擎
// 死板程序：描写/答案/触发条件全部写死在数据里，AI 只润色语气，不随机生成内容

import type { LocationData, LocationQA, LocationCheck, LocationProgress, Handout } from '@/types/location';

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

// ── 第1次调用：分析玩家输入，返回命中的 QA 代号 + 检定代号 + 出口目标地点 ──
async function analyze(
  apiKey: string,
  loc: LocationData,
  playerInput: string,
  progress: LocationProgress,
): Promise<{ qaCodes: string[]; checkCodes: string[]; exitId: string | null }> {
  const qaDesc = loc.qaList.map(q => `${q.code}: ${q.matchHint}`).join('\n') || '（无）';
  const checkDesc = loc.checks.map(c => `${c.code}: 检定(${c.skill}) ${c.triggerHint}`).join('\n') || '（无）';
  const exitDesc = loc.exits.map(e => `${e.toLocationId}: ${e.triggerHint}`).join('\n') || '（无）';

  const prompt = `你是COC跑团的流程分析器。当前地点"${loc.name}"。下面是该地点可触发的内容：
- 已答的Q&A代号：${[...progress.answeredQA].join(',') || '无'}
- 已完成的检定代号：${[...progress.doneChecks].join(',') || '无'}

## 可回答的问题（QA）
${qaDesc}

## 可触发的检定（CHECK）
${checkDesc}

## 可前往的地点（EXIT）
${exitDesc}

玩家说：
"${playerInput}"

请只输出一个JSON（不要解释），格式：
{"qa":["代号"],"check":["代号"],"exit":"地点id或null"}

规则：
1. 只标出玩家这次明确触发的内容（QA/检定/出口各自独立判断）。
2. 未触发任何一项时，对应数组为空字符串数组[]，exit为null。
3. 不要臆测玩家没问的内容。`;

  const raw = (await callAI(apiKey, [{ role: 'user', content: prompt }], 120, 0.1)).trim();
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    const validQA = new Set(loc.qaList.map(q => q.code));
    const validCheck = new Set(loc.checks.map(c => c.code));
    const validExit = new Set(loc.exits.map(e => e.toLocationId));
    return {
      qaCodes: (parsed.qa || []).filter((c: string) => validQA.has(c)),
      checkCodes: (parsed.check || []).filter((c: string) => validCheck.has(c)),
      exitId: validExit.has(parsed.exit) ? parsed.exit : null,
    };
  } catch {
    // JSON 解析失败 → 全部空
    return { qaCodes: [], checkCodes: [], exitId: null };
  }
}

// ── 第2次调用：润色固定答案（不得新增事实）──
async function polish(
  apiKey: string,
  loc: LocationData,
  blocks: string[],
  personaHint?: string,
): Promise<string> {
  const content = blocks.join('\n\n');
  const persona = personaHint ? `\n\n## 你的语气（NPC的人设）\n${personaHint}` : '';

  const prompt = `你是COC跑团的守秘人(KP)。下面是当前地点"${loc.name}"要输出给调查员的固定内容。${persona}

## 要告诉调查员的信息（只能基于这些，不得添加任何内容）
${content}

## 严格规则
1. 只能转述上面的信息，一字一句的事实都不能改变，也不能添加原文没有的细节、推测或多余信息。
2. 用自然、符合场景的口吻说出来，可以加符合人设的语气词或神态描写，但不能编造新事实。
3. 如果有多条信息，自然地串联。
4. 这里只是"告知信息"，绝对禁止输出任何 [CHECK:...]、[SAN_CHECK:...]、[COMBAT_START] 等标记；检定由系统另行触发，你不得自己加检定。
5. 直接输出连贯的叙述散文，不要使用 #、💭、(心理)、或段落开头的特殊符号来标注动作/心理；对话用正常的引号融入文字即可。
6. 150-350字。`;

  return await callAI(apiKey, [{ role: 'user', content: prompt }], 600, 0.7);
}

// ── 敷衍：什么都没触发时 ──
async function deflect(
  apiKey: string,
  loc: LocationData,
  playerInput: string,
): Promise<string> {
  const persona = loc.npcPersona ? `\n\n## 你的语气\n${loc.npcPersona}` : '';
  const prompt = `你是COC跑团的守秘人(KP)。调查员在当前地点"${loc.name}"说了一句话，但这句话没有触碰到任何你能回应的内容。${persona}

## 当前处境
${loc.briefing || loc.environment}

## 调查员说
"${playerInput}"

## 严格规则
1. 以敷衍、引导的口吻回应，把话题拉回到当前地点可以做的事（查看线索、交谈、检定、前往别处）。
2. 绝不编造任何"当前处境"之外的新信息。
3. 直接输出连贯的叙述散文，不要使用 #、💭、(心理)、或段落开头的特殊符号；对话用正常的引号融入文字即可。
4. 100-200字。`;

  return await callAI(apiKey, [{ role: 'user', content: prompt }], 400, 0.7);
}

// ── 开场：静态输出环境 + 简报 ──
export function locationOpening(loc: LocationData): string {
  return [loc.environment, loc.briefing].filter(Boolean).join('\n\n');
}

// ── 单个检查 → 固定文本（不经AI，避免改动数值/编造）
// 注意：只输出「检定指令」，绝不提前透露成功/失败的结果文案（successText/failText 留待掷骰后由系统展示）
export function formatCheck(c: LocationCheck, timeOfDay?: 'day' | 'night'): string {
  if (c.san) {
    // SAN 检定的损失数值是规则要求事先告知的（玩家需要知道代价）
    return `\n[SAN_CHECK:${c.san.reason}] SAN损失 成功${c.san.lossSuccess}/失败${c.san.lossFail}\n请进行SAN检定（POW）`;
  }
  // 计算实际难度（夜晚升困难）
  const diff = c.nightHard && timeOfDay === 'night' ? '（困难）' : (c.difficulty && c.difficulty !== 'regular' ? `（${c.difficulty}）` : '');
  return `\n[CHECK:${c.skill}]${diff}\n请进行${c.skill}检定${diff}`;
}

// ── 进入地点时自动触发的检定（autoOnEnter），返回检定对象数组 ──
export function locationEnterAutoChecks(loc: LocationData): LocationCheck[] {
  return loc.checks.filter(c => c.autoOnEnter);
}

// ── 主导航：一次回合 ──
export interface TurnResult {
  reply: string;
  progress: LocationProgress;
  exitTo?: LocationData;              // 若触发切地点，返回目标地点
  enterAutoChecks?: LocationCheck[];  // 进入新地点时自动触发的检定对象
  pendingChecks?: LocationCheck[];    // 本轮主动触发的检定对象（供掷骰后展示预设成败文案）
  handouts?: Handout[];               // 本轮 QA 触发时直接给玩家的附件
  onEnterHandouts?: Handout[];        // 切换到新地点时主动给的附件
  combat?: boolean;                   // 本轮回合触发了战斗（如攻击食尸鬼）
}

export async function runLocationTurn(
  apiKey: string,
  loc: LocationData,
  playerInput: string,
  progress: LocationProgress,
  allLocations?: Record<string, LocationData>,
): Promise<TurnResult> {
  // 0. 昼夜切换：玩家明确表示等待/休息到某个时段
  const wantNight = /等到?(晚上|天黑|夜晚|入夜|傍晚|夜里)|待到?(晚上|天黑|夜晚)|天黑了|等到?天黑|入夜/.test(playerInput);
  const wantDay = /等到?(白天|天亮|清晨|早晨|早上|日出)|天亮|待到?白天|第二天一早|次日早晨/.test(playerInput);
  if (wantNight && progress.timeOfDay !== 'night') {
    const newLoc = { ...progress, timeOfDay: 'night' as const };
    return { reply: '你在附近等待……天色一点点暗下去，白昼的最后一丝光被吞没在铅灰的天际线后。现在，阿诺兹堡彻底笼罩在夜色里了。', progress: newLoc };
  }
  if (wantDay && progress.timeOfDay !== 'day') {
    const newLoc = { ...progress, timeOfDay: 'day' as const };
    return { reply: '你等到天色破晓。晨光清冷地洒在街道上，阿诺兹堡在薄雾里苏醒过来。现在，是白天了。', progress: newLoc };
  }

  // 1. 分析
  const { qaCodes, checkCodes, exitId } = await analyze(apiKey, loc, playerInput, progress);

  const newQA = qaCodes.filter(c => !progress.answeredQA.has(c));
  const newChecks = checkCodes.filter(c => !progress.doneChecks.has(c));

  newQA.forEach(c => progress.answeredQA.add(c));
  newChecks.forEach(c => progress.doneChecks.add(c));

  const newLoc = { ...progress, answeredQA: new Set(progress.answeredQA), doneChecks: new Set(progress.doneChecks) };

  // 2a. 出口优先（玩家明确要去别处）
  if (exitId) {
    const exit = loc.exits.find(e => e.toLocationId === exitId);
    if (exit) {
      const target = allLocations?.[exitId];
      const reply = `${exit.transitionText}`;
      // 进入新地点的自动检定
      const enterAutoChecks = target ? locationEnterAutoChecks(target) : [];
      // 进入新地点主动给予的附件
      const onEnterHandouts = target?.onEnterHandouts;
      // 标记这些自动检定为已完成，避免在之后又被匹配触发
      const targetAutoCodes = target ? target.checks.filter(c => c.autoOnEnter).map(c => c.code) : [];
      const doneChecks = new Set(newLoc.doneChecks);
      targetAutoCodes.forEach(c => doneChecks.add(c));
      return {
        reply,
        progress: { ...newLoc, currentLocationId: exitId, visited: [...newLoc.visited, loc.id], doneChecks },
        exitTo: target,
        enterAutoChecks,
        onEnterHandouts,
      };
    }
  }

  // 2b. 有命中内容 → 输出
  if (newQA.length > 0 || newChecks.length > 0) {
    // 检定类（尤其SAN检定）：直接输出固定文本，不经AI，避免AI改数值/编造
    const checkLines: string[] = [];
    const pendingChecks: LocationCheck[] = [];
    for (const code of newChecks) {
      const c = loc.checks.find(x => x.code === code);
      if (c) { checkLines.push(formatCheck(c, newLoc.timeOfDay)); pendingChecks.push(c); }
    }

    // QA类：raw（实物文本，原样输出）与普通QA（AI只润色语气）分开处理
    const rawLines: string[] = [];      // 原样输出的实物文本（日记/文件等，不润色不压缩）
    const qaLines: string[] = [];       // 需要AI润色的QA
    const handouts: Handout[] = [];
    let combat = false;
    for (const code of newQA) {
      const q = loc.qaList.find(x => x.code === code);
      if (q) { if (q.raw) { rawLines.push(q.answer); } else { qaLines.push(q.answer); } if (q.handouts) handouts.push(...q.handouts); if (q.combat) combat = true; }
    }

    if (checkLines.length > 0 && qaLines.length === 0 && rawLines.length === 0) {
      // 纯检定：直接输出固定文本
      return { reply: checkLines.join('\n\n'), progress: newLoc, pendingChecks, combat };
    }

    if (checkLines.length === 0 && qaLines.length === 0 && rawLines.length > 0) {
      // 纯实物文本：原样输出
      return { reply: rawLines.join('\n\n'), progress: newLoc, handouts, combat };
    }

    if (checkLines.length === 0 && qaLines.length > 0) {
      // 纯QA：AI润色（若有实物文本，先原样拼在开头）
      const reply = await polish(apiKey, loc, qaLines.map(a => `【Q&A】${a}`), loc.npcPersona);
      const full = rawLines.length > 0 ? `${rawLines.join('\n\n')}\n\n${reply}` : reply;
      return { reply: full, progress: newLoc, handouts, combat };
    }

    // 混合：实物文本原样 + 检定固定 + QA润色拼接
    const reply = await polish(apiKey, loc, qaLines.map(a => `【Q&A】${a}`), loc.npcPersona);
    const parts = [...rawLines, ...checkLines, reply].filter(Boolean);
    return { reply: parts.join('\n\n'), progress: newLoc, pendingChecks, handouts, combat };
  }

  // 2c. 什么都没触发 → 敷衍
  const reply = await deflect(apiKey, loc, playerInput);
  return { reply, progress: newLoc };
}

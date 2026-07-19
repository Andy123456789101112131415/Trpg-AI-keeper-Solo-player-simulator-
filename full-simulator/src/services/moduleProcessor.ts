// 模组处理：本地提取 → AI 分类归档为"文件夹"结构，原文完整保留
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-chat';

// ── 模组文件夹中的文件定义 ──
export interface ModuleFile {
  name: string;    // 文件名："开幕" "背景" "NPC" "地点" "场景节点" "线索" "敌对存在" "规则" "奖励" "其他"
  content: string; // 完整原文，不修改
}

export interface ParsedModule {
  id: string;
  title: string;
  summary: string;         // 一句话摘要
  files: ModuleFile[];     // 分类后的文件列表
  rawText: string;         // 完整原文（备用）
  createdAt: number;
}

const STORAGE_KEY = 'coc_parsed_modules';

// ── 标准模组文件模板 ──
const FILE_NAMES = ['开幕','背景','NPC','地点','场景节点','线索','敌对存在','规则','奖励','其他'] as const;

// ── 本地文本提取 ──
async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'txt') return await file.text();
  if (ext === 'docx') {
    if (!(window as any).mammoth) {
      await new Promise<void>((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.4.19/mammoth.browser.min.js';
        script.onload = () => resolve();
        script.onerror = () => resolve();
        document.head.appendChild(script);
      });
    }
    const mammoth = (window as any).mammoth;
    if (mammoth?.extractRawText) {
      try { const ab = await file.arrayBuffer(); const r = await mammoth.extractRawText({ arrayBuffer: ab }); return r.value || ''; }
      catch { return ''; }
    }
  }
  return '';
}

// ── 按自然段分块 ──
function splitIntoBlocks(text: string, maxChars = 8000): string[] {
  const raw = text.split(/\n\n+/).filter(b => b.trim());
  const blocks: string[] = [];
  let cur = '';
  for (const b of raw) {
    const t = b.trim();
    if (!t) continue;
    if (cur && cur.length + t.length > maxChars) { blocks.push(cur); cur = t; }
    else cur = cur ? cur + '\n\n' + t : t;
  }
  if (cur) blocks.push(cur);
  return blocks;
}

// ── AI 调用 ──
async function callAI(apiKey: string, prompt: string, maxTokens = 1000): Promise<string> {
  const resp = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens: maxTokens }),
  });
  if (!resp.ok) { const t = await resp.text(); throw new Error(`API ${resp.status}: ${t}`); }
  const d = await resp.json();
  return d.choices?.[0]?.message?.content ?? '';
}

// ── 主处理 ──
export async function processModuleFile(file: File, apiKey: string): Promise<ParsedModule> {
  const extracted = await extractTextFromFile(file);
  if (!extracted) {
    return { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, title: file.name, summary: '', files: [], rawText: '', createdAt: Date.now() };
  }

  // 无 API Key → 全放入"其他"
  if (!apiKey) {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      title: file.name, summary: extracted.slice(0, 300),
      files: [{ name: '其他', content: extracted }],
      rawText: extracted, createdAt: Date.now(),
    };
  }

  // ── 第一步：AI 提取标题和摘要 ──
  let title = file.name, summary = '';
  try {
    const mr = await callAI(apiKey,
      `从以下模组开头提取标题和摘要。只返回JSON：{"title":"...","summary":"..."}\n\n${extracted.slice(0, 4000)}`, 300);
    const j = JSON.parse(mr.slice(mr.indexOf('{')));
    title = j.title || file.name; summary = j.summary || '';
  } catch {}

  // ── 第二步：分块，AI 只打文件名标签 ──
  const blocks = splitIntoBlocks(extracted, 8000);
  const fileMap = new Map<string, string>();

  for (const block of blocks) {
    if (block.length < 30) continue;

    const prompt = `你是COC模组分类器。判断下面文本属于哪个文件，只返回文件名（单选）：
可选：开幕、背景、NPC、地点、场景节点、线索、敌对存在、规则、奖励、其他

判断标准：
- 开幕：开场的叙述性文字，通常是"你站在..."、"故事开始..."等引入
- 背景：时代、地点、委托说明、事件起因
- NPC：人物描述、性格、动机
- 地点：具体场所的描述（外观、内部、特征）
- 场景节点：按顺序推进的事件步骤
- 线索：调查可发现的物品、日志、证词
- 敌对存在：怪物、敌人数据（HP/STR等）
- 规则：检定要求、特殊机制
- 奖励：结局奖励、SAN回复
- 其他：不属于以上分类

文本：
${block.slice(0, 4000)}

文件名：`;

    try {
      const cat = (await callAI(apiKey, prompt, 50)).trim();
      const file = FILE_NAMES.find(f => cat.includes(f)) || '其他';
      fileMap.set(file, (fileMap.get(file) || '') + '\n\n' + block);
    } catch {
      fileMap.set('其他', (fileMap.get('其他') || '') + '\n\n' + block);
    }
  }

  // 确保所有文件都存在
  const files: ModuleFile[] = FILE_NAMES.map(name => ({
    name, content: (fileMap.get(name) || '').trim(),
  })).filter(f => f.content.length > 0);

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    title, summary, files, rawText: extracted, createdAt: Date.now(),
  };
}

// ── 获取指定文件的内容（用于游戏运行时按需注入）──
export function getModuleFile(module: ParsedModule, fileName: string): string {
  return module.files.find(f => f.name === fileName)?.content || '';
}

// ── 获取"始终需要"的文件合并文本（开幕+NPC+地点+背景+规则）──
export function getBaseContext(module: ParsedModule): string {
  const always = ['开幕','背景','NPC','地点','规则'];
  const parts: string[] = [];
  for (const fn of always) {
    const c = getModuleFile(module, fn);
    if (c) parts.push(`== ${fn} ==\n${c}`);
  }
  return parts.join('\n\n');
}

// ── 根据玩家输入检测需要注入的额外文件 ──
export function detectSceneInjection(module: ParsedModule, playerInput: string): string | null {
  const keywords: Record<string, string[]> = {
    '场景节点': ['去','调查','进入','探索','前往','走到','推开','爬上','下楼','上楼','地下室','阁楼','仓库','客厅','厨房','保安室','码头','礁石','卧室','浴室','储藏室','餐厅','图书馆','教堂','精神病院','报社','警局','隧道','墓地'],
    '线索': ['搜索','翻','查看','检查','找','线索','日志','日记','笔记','报纸','纸条','信','书','记录','照片','符号','刻痕','鳞片','血迹','脚印','拖拽'],
    '敌对存在': ['战斗','攻击','怪物','敌人','出现','掏出枪','瞄准','劈','砍','射击'],
  };

  for (const [file, kws] of Object.entries(keywords)) {
    if (kws.some(k => playerInput.includes(k))) {
      const content = getModuleFile(module, file);
      if (content) return `\n\n[系统注入：${file}]\n${content}`;
    }
  }
  return null;
}

// ── 存储 ──
export function saveParsedModule(m: ParsedModule): void {
  const list = getParsedModules(); list.push(m);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
export function getParsedModules(): ParsedModule[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as ParsedModule[]; } catch { return []; }
}
export function getParsedModuleById(id: string): ParsedModule | null {
  return getParsedModules().find(m => m.id === id) ?? null;
}
export function deleteParsedModule(id: string): void {
  const list = getParsedModules().filter(m => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// ── 格式化为 AI Prompt ──
export function flattenModuleForPrompt(module: ParsedModule): string {
  const parts = [`模组：${module.title}`];
  if (module.summary) parts.push(`摘要：${module.summary}`);
  for (const f of module.files) parts.push(`== ${f.name} ==\n${f.content}`);
  return parts.join('\n\n');
}

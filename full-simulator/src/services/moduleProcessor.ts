// 模组处理：本地提取文本，AI 仅负责分类和生成标题/摘要，原始内容完整保留
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-chat';

export interface ModuleCategory {
  name: string;
  content: string;
}

export interface ParsedModule {
  id: string;
  title: string;
  summary: string;
  categories: ModuleCategory[];
  npcs?: { name: string; description: string }[];
  locations?: { name: string; description: string }[];
  rules?: string[];
  rawText?: string;
  createdAt: number;
}

const STORAGE_KEY = 'coc_parsed_modules';

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
      try {
        const arrayBuffer = await file.arrayBuffer();
        const res = await mammoth.extractRawText({ arrayBuffer });
        return res.value || '';
      } catch { return ''; }
    }
  }
  return '';
}

// ── 按自然段落分块 ──
function splitIntoBlocks(text: string, maxBlockChars = 6000): string[] {
  const rawBlocks = text.split(/\n\n+/).filter(b => b.trim().length > 0);
  const blocks: string[] = [];
  let current = '';

  for (const block of rawBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    if ((current.length > 0) && (current.length + trimmed.length > maxBlockChars)) {
      blocks.push(current);
      current = trimmed;
    } else {
      current = current ? current + '\n\n' + trimmed : trimmed;
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

// ── AI 调用 ──
async function callAI(apiKey: string, prompt: string, maxTokens = 1000): Promise<string> {
  const resp = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens: maxTokens }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`API错误 ${resp.status}: ${txt}`);
  }
  const d = await resp.json();
  return d.choices?.[0]?.message?.content ?? '';
}

// ── 主处理 ──
export async function processModuleFile(file: File, apiKey: string): Promise<ParsedModule> {
  const extracted = await extractTextFromFile(file);

  if (!extracted) {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: file.name,
      summary: '',
      categories: [{ name: 'raw', content: '' }],
      rawText: '',
      createdAt: Date.now(),
    } as ParsedModule;
  }

  if (!apiKey) {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: file.name,
      summary: extracted.slice(0, 300),
      categories: [{ name: '全文', content: extracted }],
      rawText: extracted,
      createdAt: Date.now(),
    } as ParsedModule;
  }

  // 第一步：AI 提取标题和摘要
  const headText = extracted.slice(0, 4000);
  const metaPrompt = `你是一个COC跑团模组解析器。根据以下模组文本开头，提取：
1. 模组标题
2. 一句话摘要（50字以内）

只返回JSON：{"title":"...","summary":"..."}

模组文本：
${headText}`;

  let title = file.name;
  let summary = '';
  try {
    const metaRaw = await callAI(apiKey, metaPrompt, 300);
    const jsonStart = metaRaw.indexOf('{');
    const meta = JSON.parse(jsonStart >= 0 ? metaRaw.slice(jsonStart) : metaRaw);
    title = meta.title || file.name;
    summary = meta.summary || '';
  } catch { /* 回退 */ }

  // 第二步：分块，AI 只打分类标签（不压缩内容）
  const blocks = splitIntoBlocks(extracted, 6000);
  const classified: { name: string; content: string }[] = [];

  for (const block of blocks) {
    if (block.length < 50) {
      classified.push({ name: '其他', content: block });
      continue;
    }

    const classPrompt = `你是COC模组分类器。判断下面文本属于哪个分类，只返回分类名：
可选：背景、场景节点、线索、NPC、地点、敌对存在、规则、奖励、初始场景、其他

文本：
${block.slice(0, 3000)}

分类：`;

    try {
      const category = (await callAI(apiKey, classPrompt, 50)).trim();
      const cleanCat = ['背景','场景节点','线索','NPC','地点','敌对存在','规则','奖励','初始场景','其他']
        .find(c => category.includes(c)) || '其他';
      classified.push({ name: cleanCat, content: block });
    } catch {
      classified.push({ name: '其他', content: block });
    }
  }

  // 第三步：合并同分类
  const categoryMap = new Map<string, string>();
  for (const item of classified) {
    const existing = categoryMap.get(item.name) || '';
    categoryMap.set(item.name, existing ? existing + '\n\n' + item.content : item.content);
  }
  const categories: ModuleCategory[] = Array.from(categoryMap.entries()).map(([name, content]) => ({
    name, content: content.trim(),
  }));

  // 第四步：提取 NPC 和地点
  let npcs: { name: string; description: string }[] = [];
  let locations: { name: string; description: string }[] = [];
  try {
    const npcPrompt = `从以下模组文本提取NPC和地点。只返回JSON：
{"npcs":[{"name":"..","description":".."}],"locations":[{"name":"..","description":".."}]}

模组文本：
${extracted.slice(0, 8000)}`;
    const npcRaw = await callAI(apiKey, npcPrompt, 800);
    const jsonStart = npcRaw.indexOf('{');
    const parsed = JSON.parse(jsonStart >= 0 ? npcRaw.slice(jsonStart) : npcRaw);
    npcs = parsed.npcs || [];
    locations = parsed.locations || [];
  } catch { /* 可选 */ }

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    summary,
    categories,
    npcs,
    locations,
    rules: [],
    rawText: extracted,
    createdAt: Date.now(),
  };
}

// ── 存储 ──
export function saveParsedModule(module: ParsedModule): void {
  const list = getParsedModules();
  list.push(module);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getParsedModules(): ParsedModule[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as ParsedModule[]; }
  catch { return []; }
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
  const parts: string[] = [];
  parts.push(`模组标题：${module.title}`);
  if (module.summary) parts.push(`摘要：${module.summary}`);
  if (module.categories?.length) {
    for (const cat of module.categories) {
      parts.push(`== ${cat.name} ==\n${cat.content}`);
    }
  } else if (module.rawText) {
    parts.push(module.rawText);
  }
  if (module.npcs?.length) {
    parts.push('NPC：');
    for (const n of module.npcs) parts.push(`${n.name}：${n.description}`);
  }
  if (module.locations?.length) {
    parts.push('地点：');
    for (const l of module.locations) parts.push(`${l.name}：${l.description}`);
  }
  return parts.join('\n\n');
}

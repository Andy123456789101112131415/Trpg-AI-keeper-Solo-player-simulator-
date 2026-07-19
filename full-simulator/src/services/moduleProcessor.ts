// 模组处理：将用户上传的 Word 文档发送给 AI，解析为结构化的模组目录并返回
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-chat';

export interface ModuleCategory {
  name: string;
  content: string; // 分段后的具体文本
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

export async function processModuleFile(file: File, apiKey: string): Promise<ParsedModule> {
  // 处理策略：先在浏览器端提取文本并按块摘要，避免一次发送过大的上下文导致模型报错
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // 本地提取文本（docx 使用 mammoth via CDN；txt 直接读取；其他二进制格式返回提示）
  async function extractTextFromFile(f: File): Promise<string> {
    if (ext === 'txt') {
      return await f.text();
    }
    if (ext === 'docx') {
      // 动态注入 mammoth 脚本（浏览器端 UMD），然后使用 window.mammoth
      if (!(window as any).mammoth) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.4.19/mammoth.browser.min.js';
          script.onload = () => resolve();
          script.onerror = (e) => reject(new Error('加载 mammoth 失败'));
          document.head.appendChild(script);
        }).catch(() => {});
      }
      const mammoth = (window as any).mammoth;
      if (mammoth && typeof mammoth.extractRawText === 'function') {
        try {
          const arrayBuffer = await f.arrayBuffer();
          const res = await mammoth.extractRawText({ arrayBuffer });
          return res.value || '';
        } catch (err) {
          return '';
        }
      }
      // 如果 mammoth 不可用，返回空并由上层处理
      return '';
    }
    // 未支持格式
    return '';
  }

  const extracted = await extractTextFromFile(file);

  if (!extracted) {
    // 无法提取文本或没有 API key：保存原始文件名并提示用户
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: file.name,
      summary: '',
      categories: [{ name: 'raw', content: '' }],
      rawText: '',
      createdAt: Date.now(),
    } as ParsedModule;
  }

  // 如果没有 apiKey，只返回本地提取的 rawText 并让用户决定是否调用 AI
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

  // 将文本分块摘要以减少上下文大小
  function splitText(text: string, maxChars = 20000): string[] {
    const chunks: string[] = [];
    let pos = 0;
    while (pos < text.length) {
      chunks.push(text.slice(pos, pos + maxChars));
      pos += maxChars;
    }
    return chunks;
  }

  async function summarizeChunk(chunk: string): Promise<string> {
    const p = `请将以下文档片段用中文总结为一段不超过200字的要点，保留关键名词（如NPC、地点、线索、事件）。\n\n片段：\n${chunk}`;
    const resp = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: p }], temperature: 0.2, max_tokens: 600 }),
    });
    if (!resp.ok) return '';
    const d = await resp.json();
    return d.choices?.[0]?.message?.content ?? '';
  }

  const chunks = splitText(extracted, 20000);
  const summaries: string[] = [];
  for (const c of chunks) {
    const s = await summarizeChunk(c);
    summaries.push(s || c.slice(0, 500));
  }

  // 合并摘要并让 AI 输出最终结构化 JSON（小得多的上下文）
  const combined = summaries.join('\n\n');
  const finalPrompt = `TASK: 你是模组解析助手。根据下面合并的片段摘要，生成所需的结构化 JSON：{\n  "title":"...",\n  "summary":"...",\n  "categories":[{"name":"...","content":"..."}],\n  "npcs":[{"name":"..","description":".."}],\n  "locations":[{"name":"..","description":".."}],\n  "rules":["..."],\n  "rawText":"..."\n}\n不要额外输出解释。\n合并摘要：\n${combined}`;

  const finalResp = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: finalPrompt }], temperature: 0.2, max_tokens: 2000 }),
  });

  if (!finalResp.ok) {
    const txt = await finalResp.text();
    throw new Error(`解析失败：${finalResp.status} ${txt}`);
  }

  const finalData = await finalResp.json();
  const content = finalData.choices?.[0]?.message?.content ?? '';
  const jsonStart = content.indexOf('{');
  const jsonText = jsonStart >= 0 ? content.slice(jsonStart) : content;
  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    // 返回提取的文本作为回退
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: file.name,
      summary: combined.slice(0, 300),
      categories: [{ name: '摘要合并', content: combined }],
      rawText: extracted,
      createdAt: Date.now(),
    } as ParsedModule;
  }

  const module: ParsedModule = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: parsed.title ?? file.name,
    summary: parsed.summary ?? (parsed.categories?.[0]?.content?.slice(0, 200) ?? ''),
    categories: parsed.categories ?? [{ name: '全文', content: parsed.rawText ?? '' }],
    npcs: parsed.npcs ?? [],
    locations: parsed.locations ?? [],
    rules: parsed.rules ?? [],
    rawText: parsed.rawText ?? extracted,
    createdAt: Date.now(),
  };

  return module;
}

// 本地存储相关
export function saveParsedModule(module: ParsedModule): void {
  const list = getParsedModules();
  list.push(module);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getParsedModules(): ParsedModule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || '[]';
    return JSON.parse(raw) as ParsedModule[];
  } catch {
    return [];
  }
}

export function getParsedModuleById(id: string): ParsedModule | null {
  return getParsedModules().find(m => m.id === id) ?? null;
}

export function deleteParsedModule(id: string): void {
  const list = getParsedModules().filter(m => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// 将解析后的模组格式化为供 AI 系统提示使用的字符串（结构化但为纯文本）
export function flattenModuleForPrompt(module: ParsedModule): string {
  const parts: string[] = [];
  parts.push(`模组标题：${module.title}`);
  if (module.summary) parts.push(`摘要：${module.summary}`);
  if (module.categories && module.categories.length) {
    for (const cat of module.categories) {
      parts.push(`== ${cat.name} ==\n${cat.content}`);
    }
  }
  if (module.npcs && module.npcs.length) {
    parts.push('NPC 列表：');
    for (const n of module.npcs) parts.push(`${n.name}：${n.description}`);
  }
  if (module.locations && module.locations.length) {
    parts.push('地点：');
    for (const l of module.locations) parts.push(`${l.name}：${l.description}`);
  }
  if (module.rules && module.rules.length) {
    parts.push('特殊规则：');
    for (const r of module.rules) parts.push(r);
  }
  return parts.join('\n\n');
}

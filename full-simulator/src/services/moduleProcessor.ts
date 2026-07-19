// 模组处理：解析 AI（仅导入时运行）→ 条件触发式知识树 → 跑团 AI（仅接收已解锁内容）
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-chat';

// ── 类型 ──
export interface ModuleFile {
  name: string;
  content: string;
}

/** 一个带触发条件的信息块——玩家触发后才解锁 */
export interface GatedContent {
  id: string;
  triggerDesc: string;   // 触发条件描述（如"调查员询问报警电话细节"）
  keywords: string[];     // 匹配关键词
  content: string;        // 解锁后喂给 AI 的内容
  category: string;       // 所属分类
  unlocked: boolean;      // 运行时状态
}

export interface ParsedModule {
  id: string;
  title: string;
  summary: string;
  files: ModuleFile[];           // 始终可见的内容（开幕、地点外观、NPC基础介绍）
  gatedContent: GatedContent[];  // 条件触发内容
  rawText: string;
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
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.4.19/mammoth.browser.min.js';
        s.onload = () => resolve(); s.onerror = () => resolve();
        document.head.appendChild(s);
      });
    }
    const m = (window as any).mammoth;
    if (m?.extractRawText) {
      try { const ab = await file.arrayBuffer(); return (await m.extractRawText({ arrayBuffer: ab })).value || ''; }
      catch { return ''; }
    }
  }
  return '';
}

// ── AI 调用 ──
async function callAI(apiKey: string, prompt: string, maxTokens = 2000): Promise<string> {
  const resp = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens: maxTokens }),
  });
  if (!resp.ok) { const t = await resp.text(); throw new Error(`API ${resp.status}: ${t}`); }
  const d = await resp.json();
  return d.choices?.[0]?.message?.content ?? '';
}

// ── 主处理：解析 AI ──
export async function processModuleFile(file: File, apiKey: string): Promise<ParsedModule> {
  const extracted = await extractTextFromFile(file);
  if (!extracted) {
    return { id: genId(), title: file.name, summary: '', files: [], gatedContent: [], rawText: '', createdAt: Date.now() };
  }

  if (!apiKey) {
    return {
      id: genId(), title: file.name, summary: extracted.slice(0, 300),
      files: [{ name: '全文', content: extracted }], gatedContent: [], rawText: extracted, createdAt: Date.now(),
    };
  }

  // ── 第一步：提取标题和摘要 ──
  let title = file.name, summary = '';
  try {
    const mr = await callAI(apiKey,
      `从以下COC模组开头提取标题和15字以内摘要。只返回JSON：{"title":"...","summary":"..."}\n\n${extracted.slice(0, 4000)}`, 300);
    const j = JSON.parse(mr.slice(mr.indexOf('{')));
    title = j.title || file.name; summary = j.summary || '';
  } catch {}

  // ── 第二步：解析 AI 提取"始终可见"和"条件触发"内容 ──
  // 分块处理（每块约 8000 字）
  const chunks = splitText(extracted, 8000);
  const alwaysFiles = new Map<string, string>();
  const gatedItems: Omit<GatedContent, 'unlocked'>[] = [];

  for (const chunk of chunks) {
    const parsePrompt = `你是COC模组解析器。请分析以下模组文本，将内容分为两类：

**第一类：始终可见（Always）**
- 开幕场景的纯叙事描写
- 地点外观描述（不包括隐藏细节）
- NPC的基本外貌、公开身份
- 背景时代设定

**第二类：条件触发（Gated）**
- 任何需要调查员主动询问、搜索、检定才能获得的信息
- Q&A格式的内容（如"通报警电话"→回答）
- 线索、隐藏细节、怪物数据
- NPC的内心动机、秘密

对于每条条件触发内容，请提供：
- triggerDesc: 触发条件（中文，如"调查员询问报警电话细节"）
- keywords: 3-5个匹配关键词

以JSON数组返回，每条格式：
{"type":"always","category":"开幕|背景|NPC|地点","content":"..."}
或
{"type":"gated","triggerDesc":"...","keywords":["...","..."],"category":"线索|NPC|场景|敌对","content":"..."}

模组文本：
${chunk.slice(0, 7000)}`;

    try {
      const raw = await callAI(apiKey, parsePrompt, 2000);
      // 提取 JSON 数组
      const arrStart = raw.indexOf('[');
      const arrEnd = raw.lastIndexOf(']');
      if (arrStart >= 0 && arrEnd > arrStart) {
        const items = JSON.parse(raw.slice(arrStart, arrEnd + 1));
        for (const item of items) {
          if (item.type === 'always') {
            const existing = alwaysFiles.get(item.category) || '';
            alwaysFiles.set(item.category, existing ? existing + '\n\n' + item.content : item.content);
          } else if (item.type === 'gated') {
            gatedItems.push({
              id: genId(),
              triggerDesc: item.triggerDesc || '',
              keywords: item.keywords || [],
              content: item.content || '',
              category: item.category || '其他',
            });
          }
        }
      }
    } catch { /* 解析失败则跳过此块 */ }
  }

  // 构建始终可见的文件
  const files: ModuleFile[] = Array.from(alwaysFiles.entries())
    .map(([name, content]) => ({ name, content: content.trim() }))
    .filter(f => f.content.length > 0);

  // 如果没有提取出门控内容，把全文当做一个大块
  if (gatedItems.length === 0 && files.length === 0) {
    files.push({ name: '全文', content: extracted });
  }

  return {
    id: genId(), title, summary, files,
    gatedContent: gatedItems.map(g => ({ ...g, unlocked: false })),
    rawText: extracted, createdAt: Date.now(),
  };
}

// ── 工具 ──
function genId() { return `${Date.now()}-${Math.random().toString(36).slice(2,8)}`; }

function splitText(text: string, maxChars: number): string[] {
  const raw = text.split(/\n\n+/).filter(b => b.trim());
  const chunks: string[] = [];
  let cur = '';
  for (const b of raw) {
    if (cur && cur.length + b.length > maxChars) { chunks.push(cur); cur = b; }
    else cur = cur ? cur + '\n\n' + b : b;
  }
  if (cur) chunks.push(cur);
  return chunks;
}

// ═══════════════════════════════════════════════
// 跑团运行时：触发匹配 & 内容注入
// ═══════════════════════════════════════════════

/** 获取当前始终可见的上下文（给跑团 AI 的基线） */
export function getBaseContext(mod: ParsedModule): string {
  const parts: string[] = [];
  if (mod.title) parts.push(`模组：${mod.title}`);
  if (mod.summary) parts.push(`摘要：${mod.summary}`);
  for (const f of mod.files) {
    if (f.content) parts.push(`== ${f.name} ==\n${f.content}`);
  }
  return parts.join('\n\n');
}

/** 获取指定文件 */
export function getModuleFile(mod: ParsedModule, fileName: string): string {
  return mod.files.find(f => f.name === fileName)?.content || '';
}

/** 匹配玩家输入并解锁门控内容。返回本次新解锁的内容（合并文本） */
export function matchAndUnlock(mod: ParsedModule, playerInput: string): string | null {
  const newlyUnlocked: string[] = [];

  for (const gate of mod.gatedContent) {
    if (gate.unlocked) continue; // 已解锁，跳过

    // 关键词匹配（模糊）
    const input = playerInput.toLowerCase();
    const matched = gate.keywords.some(kw => input.includes(kw.toLowerCase()));
    // 也检查 triggerDesc 中的关键词
    const descMatch = gate.triggerDesc && gate.triggerDesc.split(/[,，、\s]+/).some(
      (w: string) => w.length >= 2 && input.includes(w)
    );

    if (matched || descMatch) {
      gate.unlocked = true;
      newlyUnlocked.push(`[解锁：${gate.triggerDesc || gate.category}]\n${gate.content}`);
    }
  }

  return newlyUnlocked.length > 0 ? newlyUnlocked.join('\n\n---\n\n') : null;
}

/** 获取当前已解锁的所有门控内容（用于构建给 AI 的完整上下文） */
export function getUnlockedContent(mod: ParsedModule): string {
  const unlocked = mod.gatedContent.filter(g => g.unlocked);
  if (unlocked.length === 0) return '';
  return unlocked.map(g => `[${g.triggerDesc || g.category}]\n${g.content}`).join('\n\n---\n\n');
}

/** 重置所有门控为未解锁（新游戏开始时调用） */
export function resetGates(mod: ParsedModule): void {
  for (const g of mod.gatedContent) g.unlocked = false;
}

// ═══════════════════════════════════════════════
// 存储
// ═══════════════════════════════════════════════

export function saveParsedModule(m: ParsedModule): void {
  const list = getParsedModules(); list.push(m);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
export function getParsedModules(): ParsedModule[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as ParsedModule[]; } catch { return []; }
}
export function deleteParsedModule(id: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getParsedModules().filter(m => m.id !== id)));
}

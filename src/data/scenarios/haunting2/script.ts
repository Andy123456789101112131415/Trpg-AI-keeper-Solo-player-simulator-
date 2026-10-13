// 追书人2：黑暗中的潜伏者 —— 完整剧本聚合
// 将所有分场景 .md 文件聚合为一份完整的剧本原文，作为 AI 守秘人(KP)的 scenarioContext
// AI 在这份剧本基础上像真人GM一样自由叙述、对话、引导，但受"铁律不编造"约束

// 使用 Vite 的 ?raw 查询 + import.meta.glob 聚合所有 .md 原文
const modules = import.meta.glob('./*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

// 按文件名排序（00_总览 → 09_结局与附录），保证剧本顺序稳定
const orderedFiles = Object.keys(modules).sort((a, b) => {
  const nameA = a.split('/').pop() || '';
  const nameB = b.split('/').pop() || '';
  return nameA.localeCompare(nameB, 'zh-Hans-CN');
});

const scriptBody = orderedFiles.map((path) => {
  const name = path.split('/').pop() || path;
  return `\n\n════════════════════════════════\n【${name}】\n════════════════════════════════\n${modules[path]}`;
}).join('');

export const HAUNTING2_SCRIPT = scriptBody.trim();

export const HAUNTING2_SCENARIO_CONTEXT = `# 追书人2：黑暗中的潜伏者（Lurkers in the Dark）

> 本模组是 COC 入门套装"追书人"的续篇，1927 年，"追书人"事件的五年后。适合 1 名守秘人 + 1-2 名调查员。

${scriptBody}

════════════════════════════════
【守秘人须知 —— 必须遵守】
════════════════════════════════
1. 你是本场跑团唯一的守秘人(KP)，像真人GM一样自然地叙述环境、扮演NPC、引导调查。
2. 上面是完整剧本，你只能依据这些内容进行叙述，不得编造剧本中不存在的NPC、线索、地点、事件或怪物数据。
3. 关键线索可以按剧本所述，通过检定、交谈、探索等多种方式让玩家获取（剧本里写了"若有多种发现方法，要有后备方案"）。
4. 检定要按剧本执行：剧本写"侦查检定"→ 输出 [CHECK:侦查]；写"理智/理智检定"→ 输出 [SAN_CHECK:原因] SAN损失 X/Y。
5. 不要提前泄露"概述(KP秘密)"里的真相（如奥戴尔女士的阴谋、道格拉斯是食尸鬼）。只有玩家通过调查逐步揭示时才透露对应信息。
6. 开局在阿诺兹堡警察局，警探托拜厄斯·斯特拉克曼向调查员简报案情（见【01_警察局.md】），之后由调查员自由决定去向。
`.trim();

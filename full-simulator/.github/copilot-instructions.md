# COC 7th TRPG 模拟器 - 项目说明

## 项目概述
基于 React + TypeScript + Vite 的克苏鲁的呼唤（COC）7版桌面角色扮演游戏模拟器。
DeepSeek API 驱动 AI 守秘人（KP），支持掷骰检定、战斗系统、角色管理、模组导入。

## 技术栈
- 前端：React 18 + TypeScript 5.9 + Vite 5
- UI：Tailwind CSS 3 + Radix UI + shadcn/ui
- AI：DeepSeek Chat API
- 存储：localStorage
- 包管理：npm / pnpm

## 关键文件
- `src/pages/TRPGGame.tsx` - 主跑团页面（设置 + 游戏循环）
- `src/services/aiKeeper.ts` - AI 守秘人调用、系统提示构建、记忆总结
- `src/services/moduleProcessor.ts` - Word 模组解析（mammoth + AI 分块摘要）
- `src/utils/storage.ts` - 角色/游戏状态存储、XLSX/JSON 导入导出
- `src/utils/gameLogic.ts` - COC 7th 属性计算、技能列表、检定逻辑
- `src/components/game/DicePanel.tsx` - 掷骰面板
- `src/data/knowledge.ts` - 预设模组（码头阴影、追书人）、千面之门教团设定

## 核心功能
1. AI 守秘人跑团（完整 COC 7th 规则）
2. 角色创建 / 导入（JSON、XLSX）
3. Word 模组导入与 AI 自动分类
4. 掷骰与技能检定
5. 战斗系统
6. 对话记忆自动总结

## 开发命令
- 启动：`npx vite --host` 或 `pnpm dev --host`
- 构建：`npx vite build`
- 类型检查：`npx tsc --noEmit`

## 注意事项
- XLSX 导入需要浏览器能访问 CDN（jsdelivr）加载 xlsx 库
- Word 解析需要浏览器能访问 CDN（jsdelivr）加载 mammoth.js
- AI 功能需要有效的 DeepSeek API Key
- 模组内容会存储在 localStorage 的 `coc_parsed_modules` 键下

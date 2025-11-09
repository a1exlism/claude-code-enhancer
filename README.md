# Claude Code Enhancer

[![CI](https://github.com/a1exlism/scripts/workflows/CI/badge.svg)](https://github.com/a1exlism/scripts/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

为 Claude Code 提供增强功能的 TypeScript 工具集，采用模块化架构设计。

## ✨ 功能特性

### 核心功能

- **🔔 实时通知**：推送 Claude Code 会话事件到 Telegram
  - 会话结束通知（SessionEnd）
  - 会话中断通知（Stop）
  - 错误/警告通知（Notification）
  - 上下文不足警告（PreCompact）
  - 智能事件去重（PreCompact 5秒内去重）
  - 自动忽略 `/clear` 命令触发的通知

- **🤖 LLM 总结**：可选的响应内容智能总结
  - 支持 OpenAI、Azure、Anthropic 三种 API
  - 仅对超过 200 字的响应生效
  - 失败时自动降级为原文本

- **🛠️ 工具集成**
  - Claude Skills 一键安装器
  - Claude Code Hooks 自动配置
  - 跨平台路径解析（支持 npm link 全局安装）

### 架构特点

- ✅ **模块化设计**：utils 层提供可复用的工具模块
- ✅ **类型安全**：完整的 TypeScript 类型定义
- ✅ **接口预留**：为未来扩展（Slack、Discord）预留接口
- ✅ **测试覆盖**：17 个单元测试，覆盖核心逻辑
- ✅ **CI/CD**：GitHub Actions 自动化测试和类型检查

## 📦 快速开始

### 安装

```bash
# 克隆仓库
git clone https://github.com/a1exlism/scripts.git
cd scripts

# 安装依赖
npm install

# 构建项目
npm run build

# （可选）全局安装
npm link
```

### 配置

1. **创建环境变量文件**

```bash
cp .env.template .env
```

2. **编辑 `.env` 文件**

```env
# Telegram 通知配置（必需）
TELEGRAM_BOT_TOKEN_AIAGENTNOTIFY=your_bot_token
TELEGRAM_CHAT_ID_AIAGENTNOTIFY=your_chat_id

# LLM 总结配置（可选）
AIAGENT_ENABLE_SUMMARY=false
AIAGENT_LLM_API_TYPE=openai  # openai | azure | anthropic
AIAGENT_LLM_API_KEY=your_api_key
AIAGENT_LLM_API_BASE=https://api.openai.com
AIAGENT_LLM_MODEL=gpt-4o-mini
```

3. **配置 Claude Code Hooks**

```bash
# 使用编译后的脚本
node dist/setup-claude.js

# 或使用开发模式
npx tsx src/setup-claude.ts
```

### 使用

配置完成后，Claude Code 会自动在以下事件发生时发送 Telegram 通知：

- ✅ 会话正常结束
- 🛑 会话被中断
- ❌ 发生错误或警告
- ⚠️ 上下文即将不足

## 🧪 测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 类型检查
npm run typecheck
```

## 📁 项目结构

```
src/
├── utils/                    # 共享工具模块
│   ├── env.ts               # 环境变量加载
│   ├── markdown.ts          # Markdown 转义
│   ├── llm-client.ts        # LLM API 客户端
│   ├── notifier.ts          # 通知接口（Telegram）
│   └── logger.ts            # 结构化日志
├── aiagent-notify.ts        # Telegram 通知主程序
├── setup-claude.ts          # Claude Code Hooks 配置工具
└── skill-install.ts         # Claude Skills 安装器

tests/
├── unit/                     # 单元测试
│   ├── env.test.ts
│   ├── markdown.test.ts
│   ├── llm-client.test.ts
│   └── notifier.test.ts
└── integration/              # 集成测试（待补充）
```

## 🔧 开发

### 可用脚本

```bash
npm run build          # 编译 TypeScript
npm run dev            # 开发模式运行
npm test               # 运行测试
npm run test:watch     # 监听模式测试
npm run test:ui        # 测试 UI 界面
npm run test:coverage  # 生成覆盖率报告
npm run typecheck      # 类型检查
```

### 架构设计

项目采用**渐进式演进架构**：

- **当前阶段**：CLI 工具集 + 轻量级 utils 模块
- **接口预留**：Notifier 接口支持未来扩展（Slack、Discord）
- **未来规划**：按需升级为完整插件化架构

### 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交变更 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📝 变更日志

详见 [CHANGELOG.md](./CHANGELOG.md)

## 🙏 致谢

- [Claude Code](https://claude.com/claude-code) - Anthropic 官方 CLI 工具
- [Vitest](https://vitest.dev/) - 快速的单元测试框架
- [TypeScript](https://www.typescriptlang.org/) - JavaScript 的超集

## 📄 许可证

MIT License

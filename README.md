# Claude Code Enhancer

为 Claude Code 等 AI Agent 客户端提供增强功能的工具集。

## 功能特性

- **消息通知**：实时推送 Claude Code 会话事件到 Telegram
- **项目配置**：一键配置 CLAUDE.md 等基础文件
- **项目索引**：引导式提供项目结构索引

## 快速开始

### 消息通知配置

1. 设置环境变量：
```bash
export TELEGRAM_BOT_TOKEN_AIAGENTNOTIFY="your_bot_token"
export TELEGRAM_CHAT_ID_AIAGENTNOTIFY="your_chat_id"
```

2. 配置 Claude Code hooks：
```json
{
  "hooks": {
    "SessionStart": "~/scripts/aiagent_notify.sh",
    "SessionEnd": "~/scripts/aiagent_notify.sh",
    "PostToolUse": "~/scripts/aiagent_notify.sh"
  }
}
```

## 许可证

MIT

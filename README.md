# Claude Code Enhancer

为 Claude Code 等 AI Agent 客户端提供增强功能的工具集。

## 功能特性

- **消息通知**：实时推送 Claude Code 会话事件到 Telegram
- **项目配置**：一键配置 CLAUDE.md 等基础文件
- **项目索引**：引导式提供项目结构索引

## 快速开始

### 一键配置

```bash
# 1. 配置环境变量
cp .env.template .env
# 编辑 .env 填入你的 Telegram Bot Token 和 Chat ID

# 2. 自动配置 Claude Code hooks
python3 setup_claude.py
```

### 手动配置（可选）

如果不使用一键配置脚本，可以手动编辑 `~/.claude/settings.json`：

```json
{
  "hooks": {
    "SessionEnd": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "python3 ~/scripts/aiagent_notify.py",
        "timeout": 5
      }]
    }],
    "Stop": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "python3 ~/scripts/aiagent_notify.py",
        "timeout": 5
      }]
    }]
  }
}
```

### 环境变量说明

- `TELEGRAM_BOT_TOKEN_AIAGENTNOTIFY`: Telegram Bot Token
- `TELEGRAM_CHAT_ID_AIAGENTNOTIFY`: Telegram Chat ID
- `AIAGENT_ENV_FILE`: 自定义 .env 文件路径（可选，默认为当前目录 `.env`）

### 测试

```bash
./test/test_aiagent_notify.sh
```

## 许可证

MIT

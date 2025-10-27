# Claude Code Enhancer

为 Claude Code 等 AI Agent 客户端提供增强功能的工具集。

## 功能特性

- **消息通知**：实时推送 Claude Code 会话事件到 Telegram
  - 会话结束通知（SessionEnd）
  - 会话中断通知（Stop）
  - 错误/警告通知（Notification）
  - 上下文不足警告（PreCompact）
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

### 配置说明

- **全局配置**：`~/.claude/settings.json` - 对所有项目生效
- **项目配置**：`.claude/settings.json` - 仅对当前项目生效

### 环境变量

在 `.env` 文件中配置：

- `TELEGRAM_BOT_TOKEN_AIAGENTNOTIFY`: Telegram Bot Token
- `TELEGRAM_CHAT_ID_AIAGENTNOTIFY`: Telegram Chat ID

环境变量加载优先级：当前项目 `.env` > 用户主目录 `~/.env`

### 测试

```bash
./test/test_aiagent_notify.sh
```

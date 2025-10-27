#!/usr/bin/env python3
import json
import sys
import os
from datetime import datetime
import requests
from pathlib import Path

# 读取 JSON 输入
json_input = sys.stdin.read()

# 写入调试日志
log_file = Path("/tmp/claude_hook_debug.log")
try:
    with log_file.open("a") as f:
        f.write(f"=== {datetime.now()} ===\n")
        f.write(f"Received JSON: {json_input}\n")
except Exception:
    pass

# 解析 JSON
try:
    data = json.loads(json_input)
except json.JSONDecodeError:
    sys.exit(0)

# 加载环境变量
env_file = Path(os.environ.get('AIAGENT_ENV_FILE', '.env'))
if env_file.exists():
    with env_file.open() as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ[key] = value.strip().strip("\"'")

# 获取环境变量
bot_token = os.environ.get("TELEGRAM_BOT_TOKEN_AIAGENTNOTIFY", "")
chat_id = os.environ.get("TELEGRAM_CHAT_ID_AIAGENTNOTIFY", "")

if not bot_token or not chat_id:
    sys.exit(0)

# 获取事件类型
hook_event = data.get("hook_event_name", "Unknown")

# 只处理 SessionEnd 和 Stop 事件
if hook_event not in ["SessionEnd", "Stop"]:
    sys.exit(0)

# 准备消息
timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
cwd = data.get("cwd", "Unknown").replace(str(Path.home()), "~")

if hook_event == "Stop":
    emoji = "🛑"
    event_text = "Claude Session Stopped"
else:
    emoji = "✅"
    event_text = "Claude Session Ended"

message_text = f"""*{emoji} {event_text}*

*⏰ Time:* `{timestamp}`
*📂 Project:* `{cwd}`
"""

# 发送 Telegram 消息
try:
    payload = {"chat_id": chat_id, "text": message_text, "parse_mode": "MarkdownV2"}

    resp = requests.post(
        f"https://api.telegram.org/bot{bot_token}/sendMessage", json=payload, timeout=5
    )
    with log_file.open("a") as f:
        f.write(f"Response: {resp.status_code} {resp.text}\n")
except Exception as e:
    with log_file.open("a") as f:
        f.write(f"Error: {e}\n")

sys.exit(0)

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
for env_path in [Path('.env'), Path.home() / '.env']:
    if env_path.exists():
        with env_path.open() as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ.setdefault(key, value.strip().strip("\"'"))

# 获取环境变量
bot_token = os.environ.get("TELEGRAM_BOT_TOKEN_AIAGENTNOTIFY", "")
chat_id = os.environ.get("TELEGRAM_CHAT_ID_AIAGENTNOTIFY", "")

if not bot_token or not chat_id:
    sys.exit(0)

# 获取事件类型
hook_event = data.get("hook_event_name", "Unknown")

# 处理事件
if hook_event not in ["SessionEnd", "Stop", "Notification", "PreCompact"]:
    sys.exit(0)

# 提取最后一条 assistant 消息
last_response = ""
transcript_path = data.get("transcript_path", "")
if transcript_path and Path(transcript_path).exists():
    try:
        with open(transcript_path, "r") as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    if entry.get("type") == "assistant" and entry.get("message", {}).get("role") == "assistant":
                        content = entry["message"].get("content", [])
                        for item in content:
                            if item.get("type") == "text":
                                last_response = item.get("text", "")
                except:
                    continue
    except:
        pass

# 准备消息
timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
cwd = data.get("cwd", "Unknown").replace(str(Path.home()), "~")

if hook_event == "Stop":
    emoji = "🛑"
    event_text = "Claude Session Stopped"
elif hook_event == "Notification":
    emoji = "❌"
    event_text = "Claude Error/Notification"
elif hook_event == "PreCompact":
    emoji = "⚠️"
    event_text = "Context Limit Warning"
else:
    emoji = "✅"
    event_text = "Claude Session Ended"

message_text = f"""*{emoji} {event_text}*

*⏰ Time:* `{timestamp}`
*📂 Project:* `{cwd}`
"""

# 添加详细信息
if hook_event in ["Notification", "PreCompact"]:
    msg = data.get("message", data.get("notification_message", ""))
    if msg:
        escaped_msg = msg[:300].replace("_", "\\_").replace("*", "\\*").replace("[", "\\[").replace("]", "\\]").replace("(", "\\(").replace(")", "\\)").replace("~", "\\~").replace("`", "\\`").replace(">", "\\>").replace("#", "\\#").replace("+", "\\+").replace("-", "\\-").replace("=", "\\=").replace("|", "\\|").replace("{", "\\{").replace("}", "\\}").replace(".", "\\.").replace("!", "\\!")
        message_text += f"\n*📋 Details:*\n`{escaped_msg}`\n"

if last_response:
    escaped_response = last_response[:500].replace("_", "\\_").replace("*", "\\*").replace("[", "\\[").replace("]", "\\]").replace("(", "\\(").replace(")", "\\)").replace("~", "\\~").replace("`", "\\`").replace(">", "\\>").replace("#", "\\#").replace("+", "\\+").replace("-", "\\-").replace("=", "\\=").replace("|", "\\|").replace("{", "\\{").replace("}", "\\}").replace(".", "\\.").replace("!", "\\!")
    message_text += f"\n*💬 Last Response:*\n`{escaped_response}`"

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

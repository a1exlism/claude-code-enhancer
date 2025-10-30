#!/usr/bin/env python3
import json
import sys
import os
from datetime import datetime
import requests
from pathlib import Path

def summarize_with_llm(text, api_type, api_key, api_base, model):
    """使用 LLM 总结文本"""
    if not text or not api_key:
        return text

    # 读取总结模板
    prompt_file = Path(__file__).parent / "summary_prompt.txt"
    if not prompt_file.exists():
        return text

    try:
        with prompt_file.open() as f:
            prompt_template = f.read()

        prompt = prompt_template.format(response=text[:2000])

        # 构建请求
        headers = {"Content-Type": "application/json"}

        if api_type == "anthropic":
            headers["x-api-key"] = api_key
            headers["anthropic-version"] = "2023-06-01"
            payload = {
                "model": model,
                "max_tokens": 200,
                "messages": [{"role": "user", "content": prompt}]
            }
            url = f"{api_base}/v1/messages"
        elif api_type == "azure":
            headers["api-key"] = api_key
            payload = {
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 200
            }
            url = f"{api_base}/openai/deployments/{model}/chat/completions?api-version=2024-02-15-preview"
        else:  # openai
            headers["Authorization"] = f"Bearer {api_key}"
            payload = {
                "model": model,
                "max_tokens": 200,
                "messages": [{"role": "user", "content": prompt}]
            }
            url = f"{api_base}/v1/chat/completions"

        resp = requests.post(url, headers=headers, json=payload, timeout=10)

        if resp.status_code == 200:
            data = resp.json()
            if api_type == "anthropic":
                return data.get("content", [{}])[0].get("text", text)
            else:
                return data.get("choices", [{}])[0].get("message", {}).get("content", text)
    except Exception:
        pass

    return text

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
enable_summary = os.environ.get("AIAGENT_ENABLE_SUMMARY", "false").lower() == "true"
llm_api_type = os.environ.get("AIAGENT_LLM_API_TYPE", "openai")
llm_api_key = os.environ.get("AIAGENT_LLM_API_KEY", "")
llm_api_base = os.environ.get("AIAGENT_LLM_API_BASE", "https://api.openai.com")
llm_model = os.environ.get("AIAGENT_LLM_MODEL", "gpt-4o-mini")

if not bot_token or not chat_id:
    sys.exit(0)

# 获取事件类型
hook_event = data.get("hook_event_name", "Unknown")

# 处理事件
if hook_event not in ["SessionEnd", "Stop", "Notification", "PreCompact"]:
    sys.exit(0)

# 忽略 /clear 命令触发的 SessionEnd
if hook_event == "SessionEnd" and data.get("reason") == "clear":
    sys.exit(0)

# 使用临时文件标记 PreCompact 事件，避免重复通知
precompact_marker = Path("/tmp/claude_precompact_marker")
if hook_event == "PreCompact":
    # 标记 PreCompact 事件已触发
    precompact_marker.touch()
elif hook_event == "Notification":
    # 检查是否在 PreCompact 后的 5 秒内
    if precompact_marker.exists():
        marker_time = precompact_marker.stat().st_mtime
        if datetime.now().timestamp() - marker_time < 5:
            # 忽略 PreCompact 后的 Notification
            sys.exit(0)
        else:
            # 清理过期标记
            precompact_marker.unlink(missing_ok=True)

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
    # 使用 LLM 总结（如果启用）
    response_to_show = last_response
    if enable_summary and llm_api_key:
        response_to_show = summarize_with_llm(last_response, llm_api_type, llm_api_key, llm_api_base, llm_model)

    escaped_response = response_to_show[:500].replace("_", "\\_").replace("*", "\\*").replace("[", "\\[").replace("]", "\\]").replace("(", "\\(").replace(")", "\\)").replace("~", "\\~").replace("`", "\\`").replace(">", "\\>").replace("#", "\\#").replace("+", "\\+").replace("-", "\\-").replace("=", "\\=").replace("|", "\\|").replace("{", "\\{").replace("}", "\\}").replace(".", "\\.").replace("!", "\\!")
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

#!/bin/bash

# 确保即使命令失败，也不会中断 Claude 的流程
set +e

# ==============================================================================
# 1. 从标准输入读取 Claude 传递的 JSON 数据（必须先读取）
# ==============================================================================
JSON_INPUT=$(cat)

# 保存完整的 JSON 到文件以便调试
echo "=== $(date) ===" >> /tmp/claude_hook_debug.log 2>&1
echo "Received JSON: $JSON_INPUT" >> /tmp/claude_hook_debug.log 2>&1
echo "$JSON_INPUT" | jq '.' >> /tmp/claude_hook_debug.log 2>&1 || echo "jq parse failed" >> /tmp/claude_hook_debug.log 2>&1

# ==============================================================================
# 2. 加载环境变量
# ==============================================================================
source /home/a1exlism/.env

# ==============================================================================
# 3. 检查环境变量是否设置
# ==============================================================================
if [ -z "$TELEGRAM_BOT_TOKEN_AIAGENTNOTIFY" ] || [ -z "$TELEGRAM_CHAT_ID_AIAGENTNOTIFY" ]; then
  echo "Environment variables not set, exiting" >> /tmp/claude_hook_debug.log 2>&1
  exit 0
fi

# ==============================================================================
# 4. 解析基本信息
# ==============================================================================
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
HOOK_EVENT=$(echo "$JSON_INPUT" | jq -r '.hook_event_name // "Unknown"')
CWD=$(echo "$JSON_INPUT" | jq -r '.cwd // "Unknown" | sub(env.HOME; "~")')

# ==============================================================================
# 5. 根据不同的 hook 事件类型构建消息
# ==============================================================================
case "$HOOK_EVENT" in
  "Stop")
    MESSAGE_TEXT=$(cat <<'EOF'
*🛑 Claude Session Stopped*

*⏰ Time:* `TIMESTAMP_PLACEHOLDER`
*📂 Project:* `CWD_PLACEHOLDER`
EOF
)
    MESSAGE_TEXT="${MESSAGE_TEXT//TIMESTAMP_PLACEHOLDER/$TIMESTAMP}"
    MESSAGE_TEXT="${MESSAGE_TEXT//CWD_PLACEHOLDER/$CWD}"
    ;;

  "SessionStart")
    MESSAGE_TEXT=$(cat <<'EOF'
*🚀 Claude Session Started*

*⏰ Time:* `TIMESTAMP_PLACEHOLDER`
*📂 Project:* `CWD_PLACEHOLDER`
EOF
)
    MESSAGE_TEXT="${MESSAGE_TEXT//TIMESTAMP_PLACEHOLDER/$TIMESTAMP}"
    MESSAGE_TEXT="${MESSAGE_TEXT//CWD_PLACEHOLDER/$CWD}"
    ;;

  "SessionEnd")
    MESSAGE_TEXT=$(cat <<'EOF'
*✅ Claude Session Ended*

*⏰ Time:* `TIMESTAMP_PLACEHOLDER`
*📂 Project:* `CWD_PLACEHOLDER`
EOF
)
    MESSAGE_TEXT="${MESSAGE_TEXT//TIMESTAMP_PLACEHOLDER/$TIMESTAMP}"
    MESSAGE_TEXT="${MESSAGE_TEXT//CWD_PLACEHOLDER/$CWD}"
    ;;

  "PostToolUse"|"PreToolUse")
    TOOL_NAME=$(echo "$JSON_INPUT" | jq -r '.tool_name // "Unknown"')
    # 限制输入长度，避免消息过长
    TOOL_INPUT=$(echo "$JSON_INPUT" | jq -c '.tool_input // {}' | head -c 200)

    if [ "$HOOK_EVENT" = "PostToolUse" ]; then
      EMOJI="✅"
      EVENT_NAME="Tool Executed"
    else
      EMOJI="⚙️"
      EVENT_NAME="Tool Starting"
    fi

    MESSAGE_TEXT=$(cat <<'EOF'
*EMOJI_PLACEHOLDER EVENT_PLACEHOLDER*

*⏰ Time:* `TIMESTAMP_PLACEHOLDER`
*📂 Project:* `CWD_PLACEHOLDER`
*🛠️ Tool:* `TOOL_PLACEHOLDER`
*📥 Input:* `INPUT_PLACEHOLDER`
EOF
)
    MESSAGE_TEXT="${MESSAGE_TEXT//EMOJI_PLACEHOLDER/$EMOJI}"
    MESSAGE_TEXT="${MESSAGE_TEXT//EVENT_PLACEHOLDER/$EVENT_NAME}"
    MESSAGE_TEXT="${MESSAGE_TEXT//TIMESTAMP_PLACEHOLDER/$TIMESTAMP}"
    MESSAGE_TEXT="${MESSAGE_TEXT//CWD_PLACEHOLDER/$CWD}"
    MESSAGE_TEXT="${MESSAGE_TEXT//TOOL_PLACEHOLDER/$TOOL_NAME}"
    MESSAGE_TEXT="${MESSAGE_TEXT//INPUT_PLACEHOLDER/${TOOL_INPUT:0:150}}"
    ;;

  "SubagentStop")
    MESSAGE_TEXT=$(cat <<'EOF'
*🤖 Subagent Stopped*

*⏰ Time:* `TIMESTAMP_PLACEHOLDER`
*📂 Project:* `CWD_PLACEHOLDER`
EOF
)
    MESSAGE_TEXT="${MESSAGE_TEXT//TIMESTAMP_PLACEHOLDER/$TIMESTAMP}"
    MESSAGE_TEXT="${MESSAGE_TEXT//CWD_PLACEHOLDER/$CWD}"
    ;;

  *)
    # 其他所有事件的通用格式
    JSON_PREVIEW=$(echo "$JSON_INPUT" | head -c 200)
    MESSAGE_TEXT=$(cat <<'EOF'
*🔔 Claude Event: EVENT_PLACEHOLDER*

*⏰ Time:* `TIMESTAMP_PLACEHOLDER`
*📂 Project:* `CWD_PLACEHOLDER`
*📋 Data:* `DATA_PLACEHOLDER`
EOF
)
    MESSAGE_TEXT="${MESSAGE_TEXT//EVENT_PLACEHOLDER/$HOOK_EVENT}"
    MESSAGE_TEXT="${MESSAGE_TEXT//TIMESTAMP_PLACEHOLDER/$TIMESTAMP}"
    MESSAGE_TEXT="${MESSAGE_TEXT//CWD_PLACEHOLDER/$CWD}"
    MESSAGE_TEXT="${MESSAGE_TEXT//DATA_PLACEHOLDER/${JSON_PREVIEW:0:150}}"
    ;;
esac

# ==============================================================================
# 6. 使用 jq 安全地构建 JSON Payload 并发送请求
# ==============================================================================
JSON_PAYLOAD=$(jq -n \
                  --arg chat_id "$TELEGRAM_CHAT_ID_AIAGENTNOTIFY" \
                  --arg text "$MESSAGE_TEXT" \
                  '{chat_id: $chat_id, text: $text, parse_mode: "MarkdownV2"}')

# 发送 curl 请求，并将其放入后台执行 (&)，这样它就不会阻塞 Claude
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN_AIAGENTNOTIFY}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD" > /dev/null 2>&1 &

# ==============================================================================
# 7. 成功退出
# ==============================================================================
exit 0

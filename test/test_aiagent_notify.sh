#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NOTIFY_SCRIPT="$SCRIPT_DIR/../aiagent_notify.py"

echo "=== 测试 aiagent_notify.py ==="
echo

echo "1. 测试 SessionEnd 事件"
echo '{"hook_event_name":"SessionEnd","cwd":"/home/a1exlism/scripts"}' | python3 "$NOTIFY_SCRIPT"
echo "✓ SessionEnd 测试完成"
echo

echo "2. 测试 Stop 事件"
echo '{"hook_event_name":"Stop","cwd":"/home/a1exlism/scripts"}' | python3 "$NOTIFY_SCRIPT"
echo "✓ Stop 测试完成"
echo

echo "3. 测试其他事件（应被忽略）"
echo '{"hook_event_name":"ToolCall","cwd":"/home/a1exlism/scripts"}' | python3 "$NOTIFY_SCRIPT"
echo "✓ ToolCall 测试完成（应被忽略）"
echo

echo "=== 查看调试日志 ==="
if [ -f /tmp/claude_hook_debug.log ]; then
    tail -20 /tmp/claude_hook_debug.log
else
    echo "日志文件不存在"
fi

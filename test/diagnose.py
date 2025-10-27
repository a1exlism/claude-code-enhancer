#!/usr/bin/env python3
import os
from pathlib import Path

print("=== 环境变量诊断 ===\n")

# 检查 .env 文件
env_file = Path.home() / '.env'
print(f"1. .env 文件路径: {env_file}")
print(f"   文件存在: {env_file.exists()}")

if env_file.exists():
    print(f"   文件大小: {env_file.stat().st_size} bytes")
    print("\n2. .env 文件内容预览:")
    with env_file.open() as f:
        for i, line in enumerate(f, 1):
            if 'AIAGENTNOTIFY' in line:
                key = line.split('=')[0].strip()
                print(f"   第 {i} 行: {key}=***")

# 加载环境变量
if env_file.exists():
    with env_file.open() as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value

# 检查环境变量
print("\n3. 环境变量检查:")
bot_token = os.environ.get('TELEGRAM_BOT_TOKEN_AIAGENTNOTIFY')
chat_id = os.environ.get('TELEGRAM_CHAT_ID_AIAGENTNOTIFY')

print(f"   TELEGRAM_BOT_TOKEN_AIAGENTNOTIFY: {'已设置' if bot_token else '未设置'}")
print(f"   TELEGRAM_CHAT_ID_AIAGENTNOTIFY: {'已设置' if chat_id else '未设置'}")

if bot_token:
    print(f"   Token 长度: {len(bot_token)} 字符")
if chat_id:
    print(f"   Chat ID: {chat_id}")

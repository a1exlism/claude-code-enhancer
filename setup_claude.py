#!/usr/bin/env python3
import json
import shutil
from pathlib import Path

CLAUDE_SETTINGS = Path.home() / '.claude' / 'settings.json'
SCRIPT_PATH = str(Path.home() / 'scripts' / 'aiagent_notify.py')

def setup_hooks():
    """配置 Claude Code hooks"""
    if not CLAUDE_SETTINGS.exists():
        print(f"❌ {CLAUDE_SETTINGS} 不存在")
        return False

    # 备份
    backup = CLAUDE_SETTINGS.with_suffix('.json.bak')
    shutil.copy(CLAUDE_SETTINGS, backup)
    print(f"✅ 已备份到 {backup}")

    # 读取配置
    with CLAUDE_SETTINGS.open() as f:
        config = json.load(f)

    # 配置 hooks
    hook_config = {
        "matcher": "",
        "hooks": [{
            "type": "command",
            "command": f"python3 {SCRIPT_PATH}",
            "timeout": 5
        }]
    }

    if 'hooks' not in config:
        config['hooks'] = {}

    config['hooks']['Stop'] = [hook_config]
    config['hooks']['SessionEnd'] = [hook_config]

    # 写入配置
    with CLAUDE_SETTINGS.open('w') as f:
        json.dump(config, f, indent=2)

    print(f"✅ 已配置 hooks: {SCRIPT_PATH}")
    return True

if __name__ == '__main__':
    print("=== Claude Code 配置工具 ===\n")
    if setup_hooks():
        print("\n✅ 配置完成！")
    else:
        print("\n❌ 配置失败")

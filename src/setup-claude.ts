import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const { promises: fsp } = fs;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const claudeDir = path.join(os.homedir(), '.claude');
const claudeSettingsPath = path.join(claudeDir, 'settings.json');
const backupSettingsPath = path.join(claudeDir, 'settings.json.bak');
// 动态解析路径：支持 npm link 全局安装和本地开发
const notifyScriptPath = path.resolve(__dirname, 'aiagent-notify.js');
const hookCommand = `node ${notifyScriptPath}`;
const hookNames = ['Stop', 'SessionEnd'] as const;

interface ClaudeHook {
  matcher: string;
  hooks: Array<{
    type: 'command';
    command: string;
    timeout: number;
  }>;
}

type ClaudeConfig = {
  hooks?: Record<string, ClaudeHook[]>;
  [key: string]: unknown;
};

async function setupHooks(): Promise<boolean> {
  if (!fs.existsSync(claudeSettingsPath)) {
    console.error(`❌ ${claudeSettingsPath} 不存在`);
    return false;
  }

  try {
    await fsp.copyFile(claudeSettingsPath, backupSettingsPath);
    console.log(`✅ 已备份到 ${backupSettingsPath}`);
  } catch (error) {
    console.error('❌ 备份失败：', error);
    return false;
  }

  let config: ClaudeConfig;
  try {
    const raw = await fsp.readFile(claudeSettingsPath, 'utf-8');
    config = JSON.parse(raw);
  } catch (error) {
    console.error('❌ 读取配置失败：', error);
    return false;
  }

  const hookConfig: ClaudeHook = {
    matcher: '',
    hooks: [
      {
        type: 'command',
        command: hookCommand,
        timeout: 5,
      },
    ],
  };

  config.hooks ??= {};
  for (const name of hookNames) {
    config.hooks[name] = [hookConfig];
  }

  try {
    await fsp.writeFile(claudeSettingsPath, JSON.stringify(config, null, 2));
    console.log(`✅ 已配置 hooks: ${hookCommand}`);
    return true;
  } catch (error) {
    console.error('❌ 写入配置失败：', error);
    return false;
  }
}

async function main() {
  console.log('=== Claude Code 配置工具 ===\n');
  const success = await setupHooks();
  if (success) {
    console.log('\n✅ 配置完成！');
  } else {
    console.log('\n❌ 配置失败');
  }
}

void main();

import fs from 'fs';
import os from 'os';
import path from 'path';
import readline from 'readline';
import { execSync } from 'child_process';

type TargetOption = 'skills' | 'marketplace' | 'both';

type MarketplaceConfig = {
  path: string;
  [key: string]: unknown;
};

type ClaudePluginConfig = {
  repositories?: Record<string, unknown>;
  marketplaces?: Record<string, MarketplaceConfig>;
  [key: string]: unknown;
};

class SkillInstaller {
  private static readonly SKILLS_REPO = 'https://github.com/anthropics/skills.git';

  private readonly claudeDir = path.join(os.homedir(), '.claude');
  private readonly skillsDir = path.join(this.claudeDir, 'skills');
  private readonly pluginsDir = path.join(this.claudeDir, 'plugins');
  private readonly marketplacesDir = path.join(this.pluginsDir, 'marketplaces');
  private readonly marketplacePath = path.join(this.marketplacesDir, 'anthropics-skills');
  private readonly configFile = path.join(this.pluginsDir, 'config.json');

  private rl?: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async install(target: TargetOption): Promise<boolean> {
    console.log('='.repeat(60));
    console.log('🤖 Claude Skills 安装向导 (TypeScript)');
    console.log('='.repeat(60));

    if (!this.checkGit()) {
      console.error('❌ 未找到 git，请先安装 git 后重试。');
      this.dispose();
      return false;
    }

    if (!fs.existsSync(this.claudeDir)) {
      console.warn(`⚠️ 未找到 Claude 配置目录: ${this.claudeDir}`);
      const shouldCreate = await this.confirm('是否立即创建该目录？');
      if (!shouldCreate) {
        console.error('❌ 安装已取消。');
        this.dispose();
        return false;
      }
    }

    this.createDirectories();

    let success = true;
    if (target === 'skills' || target === 'both') {
      success = (await this.cloneToSkills()) && success;
    }

    if (target === 'marketplace' || target === 'both') {
      const marketplaceInstalled = await this.cloneToMarketplace();
      success = marketplaceInstalled && success;
      if (marketplaceInstalled) {
        success = (await this.updateConfig()) && success;
      }
    }

    if (success) {
      success = this.verifyInstallation();
    }

    console.log('\n' + '='.repeat(60));
    if (success) {
      console.log('✅ 安装完成！');
      console.log('\n使用方法：');
      console.log('  - 在 Claude Code 会话中直接提及 skill 名称即可使用');
      console.log("  - 例如：'使用 pdf skill 提取文档内容'");
    } else {
      console.log('❌ 安装过程中出现错误，请根据上方提示修复后重试。');
    }
    console.log('='.repeat(60));

    this.dispose();
    return success;
  }

  dispose() {
    this.rl?.close();
    this.rl = undefined;
  }

  private checkGit(): boolean {
    try {
      execSync('git --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  private createDirectories() {
    fs.mkdirSync(this.skillsDir, { recursive: true });
    fs.mkdirSync(this.marketplacesDir, { recursive: true });
    console.log(`✅ 确保目录存在: ${this.skillsDir}`);
    console.log(`✅ 确保目录存在: ${this.marketplacesDir}`);
  }

  private async cloneToSkills(): Promise<boolean> {
    console.log('\n🚀 [1/2] 安装 Skills 到 ~/.claude/skills/');

    const dirExists = fs.existsSync(this.skillsDir);
    const hasContent = dirExists && this.directoryHasContent(this.skillsDir);

    if (hasContent) {
      console.warn(`⚠️ Skills 目录已存在且不为空: ${this.skillsDir}`);
      const shouldOverride = await this.confirm('是否覆盖现有内容？');
      if (!shouldOverride) {
        console.log('✅ 已跳过 Skills 目录安装。');
        return true;
      }
      if (!(await this.backupDirectory(this.skillsDir, 'skills'))) {
        return false;
      }
      fs.mkdirSync(this.skillsDir, { recursive: true });
    }

    const tempDir = path.join(this.claudeDir, `skills-temp-${Date.now()}`);
    try {
      console.log(`  📥 克隆仓库: ${SkillInstaller.SKILLS_REPO}`);
      this.exec(`git clone --depth 1 ${SkillInstaller.SKILLS_REPO} ${this.shellQuote(tempDir)}`);
      this.copyDirectory(tempDir, this.skillsDir, new Set(['.git']));
      console.log(`✅ Skills 安装完成: ${this.skillsDir}`);
      return true;
    } catch (error) {
      this.printCommandError('克隆 Skills 仓库失败', error);
      return false;
    } finally {
      this.safeRemove(tempDir);
    }
  }

  private async cloneToMarketplace(): Promise<boolean> {
    console.log('\n🛠️  [2/2] 安装 Marketplace 到 ~/.claude/plugins/marketplaces/');

    if (fs.existsSync(this.marketplacePath)) {
      console.warn(`⚠️ Marketplace 已存在: ${this.marketplacePath}`);
      const shouldUpdate = await this.confirm('是否执行 git pull 更新？');
      if (shouldUpdate) {
        try {
          this.exec(`git -C ${this.shellQuote(this.marketplacePath)} pull`);
          console.log('✅ Marketplace 更新完成。');
          return true;
        } catch (error) {
          console.warn('⚠️ 更新失败，将尝试重新克隆。');
          this.printCommandError('git pull 失败', error);
          this.safeRemove(this.marketplacePath);
        }
      } else {
        console.log('✅ 已跳过 Marketplace 安装。');
        return true;
      }
    }

    try {
      console.log(`  📥 克隆仓库: ${SkillInstaller.SKILLS_REPO}`);
      this.exec(`git clone ${SkillInstaller.SKILLS_REPO} ${this.shellQuote(this.marketplacePath)}`);
      console.log(`✅ Marketplace 安装完成: ${this.marketplacePath}`);
      return true;
    } catch (error) {
      this.printCommandError('克隆 Marketplace 仓库失败', error);
      return false;
    }
  }

  private async updateConfig(): Promise<boolean> {
    console.log('\n📝 配置插件市场...');

    let config: ClaudePluginConfig = { repositories: {}, marketplaces: {} };
    if (fs.existsSync(this.configFile)) {
      try {
        const raw = fs.readFileSync(this.configFile, 'utf-8');
        config = JSON.parse(raw) as ClaudePluginConfig;
      } catch (error) {
        console.warn('⚠️ 配置文件格式错误，将创建新的配置文件。', error);
      }
    }

    config.marketplaces ??= {};
    config.marketplaces['anthropic-agent-skills'] = {
      path: this.marketplacePath,
    };

    try {
      fs.mkdirSync(path.dirname(this.configFile), { recursive: true });
      fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2), 'utf-8');
      console.log(`✅ 配置已更新: ${this.configFile}`);
      return true;
    } catch (error) {
      console.error('❌ 写入配置文件失败：', error);
      return false;
    }
  }

  private verifyInstallation(): boolean {
    console.log('\n🔍 验证安装结果...');

    let success = true;

    if (fs.existsSync(this.skillsDir)) {
      const docSkills = path.join(this.skillsDir, 'document-skills');
      if (fs.existsSync(docSkills)) {
        const entries = this.safeListDirectory(docSkills);
        console.log(`✅ Document Skills: ${entries.length} 个`);
        entries
          .filter((entry) => fs.statSync(path.join(docSkills, entry)).isDirectory())
          .sort()
          .forEach((name) => console.log(`  - ${name}`));
      } else {
        console.error('❌ 未找到 document-skills 目录。');
        success = false;
      }

      const exampleSkills = this.safeListDirectory(this.skillsDir)
        .filter((entry) => entry !== 'document-skills' && !entry.startsWith('.'))
        .filter((entry) => fs.statSync(path.join(this.skillsDir, entry)).isDirectory());

      if (exampleSkills.length > 0) {
        console.log(`✅ Example Skills: ${exampleSkills.length} 个`);
        exampleSkills
          .sort()
          .slice(0, 5)
          .forEach((name) => console.log(`  - ${name}`));
        if (exampleSkills.length > 5) {
          console.log(`  ... 还有 ${exampleSkills.length - 5} 个`);
        }
      }
    } else {
      console.error('❌ Skills 目录未找到。');
      success = false;
    }

    if (fs.existsSync(this.marketplacePath)) {
      console.log(`✅ Marketplace: ${this.marketplacePath}`);
    } else {
      console.warn('⚠️ Marketplace 未安装（可选）。');
    }

    if (fs.existsSync(this.configFile)) {
      try {
        const raw = fs.readFileSync(this.configFile, 'utf-8');
        const config = JSON.parse(raw) as ClaudePluginConfig;
        if (config.marketplaces?.['anthropic-agent-skills']) {
          console.log('✅ 插件配置已更新。');
        } else {
          console.warn('⚠️ 未找到插件配置（可选）。');
        }
      } catch {
        console.warn('⚠️ 配置文件读取失败。');
      }
    }

    return success;
  }

  private async confirm(question: string, defaultYes = false): Promise<boolean> {
    if (!this.rl) {
      this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    }

    const suffix = defaultYes ? ' (Y/n): ' : ' (y/N): ';
    const answer = await new Promise<string>((resolve) => {
      this.rl!.question(`${question}${suffix}`, resolve);
    });

    if (!answer.trim()) {
      return defaultYes;
    }

    const normalized = answer.trim().toLowerCase();
    return normalized === 'y' || normalized === 'yes';
  }

  private directoryHasContent(dir: string): boolean {
    try {
      const entries = fs.readdirSync(dir);
      return entries.length > 0;
    } catch {
      return false;
    }
  }

  private async backupDirectory(source: string, label: string): Promise<boolean> {
    const backupDir = path.join(this.claudeDir, `${label}.backup.${Date.now()}`);
    try {
      fs.renameSync(source, backupDir);
      console.log(`🗂️  已备份现有内容到: ${backupDir}`);
      return true;
    } catch (error) {
      console.error(`❌ 备份 ${source} 失败：`, error);
      const shouldContinue = await this.confirm('是否继续安装而不进行备份？');
      if (!shouldContinue) {
        console.error('❌ 安装已取消。');
        return false;
      }
      this.safeRemove(source);
      return true;
    }
  }

  private copyDirectory(src: string, dest: string, excluded: Set<string>) {
    fs.cpSync(src, dest, {
      recursive: true,
      force: true,
      filter: (current) => !excluded.has(path.basename(current)),
    });
  }

  private safeRemove(target: string) {
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
    }
  }

  private safeListDirectory(dir: string): string[] {
    try {
      return fs.readdirSync(dir);
    } catch {
      return [];
    }
  }

  private exec(command: string) {
    execSync(command, { stdio: 'pipe' });
  }

  private printCommandError(message: string, error: unknown) {
    const stderr = this.extractStderr(error);
    console.error(`❌ ${message}: ${stderr}`);
  }

  private extractStderr(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'stderr' in error) {
      const stderr = (error as { stderr?: Buffer }).stderr;
      if (stderr && stderr.length > 0) {
        return stderr.toString().trim();
      }
    }
    if (error instanceof Error) {
      return error.message;
    }
    return '未知错误';
  }

  private shellQuote(value: string): string {
    return `'${value.replace(/'/g, `'\\''`)}'`;
  }
}

function parseArgs(): { target: TargetOption } {
  const args = process.argv.slice(2);
  let target: TargetOption = 'both';

  const showHelp = () => {
    console.log(`Claude Skills 安装脚本

用法:
  node dist/skill-install.js [--target skills|marketplace|both]

示例:
  node dist/skill-install.js
  node dist/skill-install.js --target skills
  node dist/skill-install.js --target marketplace
`);
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else if (arg === '--target') {
      const value = args[i + 1];
      if (!value) {
        console.error('❌ --target 需要一个值。');
        process.exit(1);
      }
      target = validateTarget(value);
      i += 1;
    } else if (arg.startsWith('--target=')) {
      const [, value] = arg.split('=');
      target = validateTarget(value);
    } else {
      console.warn(`⚠️ 未识别的参数: ${arg}`);
    }
  }

  return { target };
}

function validateTarget(value: string): TargetOption {
  if (value === 'skills' || value === 'marketplace' || value === 'both') {
    return value;
  }
  console.error(`❌ 无效的 target: ${value}`);
  process.exit(1);
}

async function main() {
  const { target } = parseArgs();
  const installer = new SkillInstaller();
  const success = await installer.install(target);
  process.exit(success ? 0 : 1);
}

void main();

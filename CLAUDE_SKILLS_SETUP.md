# Claude Skills 安装指南

本文档提供 Claude Skills 的一键安装方案，适用于任何需要安装 Claude Skills 的环境。

## 快速开始（推荐）

使用提供的 Python 安装脚本一键安装：

```bash
# 安装所有内容（skills + marketplace）
python3 skill_install.py

# 仅安装 skills
python3 skill_install.py --target skills

# 仅安装 marketplace
python3 skill_install.py --target marketplace
```

### 前置要求

- Python 3.6+
- Git

### 安装脚本功能

- ✓ 自动检测 Claude 配置目录
- ✓ 克隆 anthropics/skills 仓库
- ✓ 配置插件市场
- ✓ 验证安装结果
- ✓ 支持备份现有内容
- ✓ 支持增量更新

## 手动安装

如果需要手动安装，请按照以下步骤操作：

### 1. 检查现有安装

```bash
ls -la ~/.claude/skills/
```

### 2. 克隆 Skills 仓库

#### 方法 A：直接安装到 skills 目录（推荐）

```bash
# 创建临时目录
git clone --depth 1 https://github.com/anthropics/skills.git /tmp/skills-temp

# 复制到 skills 目录
mkdir -p ~/.claude/skills
cp -r /tmp/skills-temp/* ~/.claude/skills/

# 清理临时目录
rm -rf /tmp/skills-temp
```

#### 方法 B：安装到 marketplace

```bash
# 创建 marketplace 目录
mkdir -p ~/.claude/plugins/marketplaces

# 克隆仓库
git clone https://github.com/anthropics/skills.git \
  ~/.claude/plugins/marketplaces/anthropics-skills
```

### 3. 配置插件市场（可选）

编辑 `~/.claude/plugins/config.json`：

```json
{
  "repositories": {},
  "marketplaces": {
    "anthropic-agent-skills": {
      "path": "/home/YOUR_USERNAME/.claude/plugins/marketplaces/anthropics-skills"
    }
  }
}
```

**注意**：将 `YOUR_USERNAME` 替换为实际用户名。

### 4. 验证安装

```bash
# 查看所有 skills
ls ~/.claude/skills/

# 查看 document skills
ls ~/.claude/skills/document-skills/

# 验证 skill 文件结构
ls ~/.claude/skills/document-skills/pdf/
```

## 已安装的 Skills 说明

### Document Skills（文档处理套件）

- **docx** - Word 文档创建、编辑和分析
- **pdf** - PDF 操作工具包
- **pptx** - PowerPoint 演示文稿处理
- **xlsx** - Excel 电子表格处理

### Example Skills（示例技能集）

#### 创意与设计
- **algorithmic-art** - 使用 p5.js 创建生成艺术
- **canvas-design** - 设计视觉艺术（PNG/PDF）
- **slack-gif-creator** - 创建 Slack 动画 GIF

#### 开发与技术
- **artifacts-builder** - 构建复杂的 HTML artifacts
- **mcp-builder** - 创建 MCP 服务器指南
- **webapp-testing** - 使用 Playwright 测试 Web 应用

#### 企业与沟通
- **brand-guidelines** - 应用 Anthropic 品牌指南
- **internal-comms** - 编写内部沟通文档
- **theme-factory** - 为 artifacts 应用主题样式

#### 元技能
- **skill-creator** - 创建自定义 skills 的指南
- **template-skill** - 新 skill 的基础模板

## 使用方法

安装完成后，直接在 Claude Code 对话中提及 skill 名称即可使用：

### 示例

```
使用 PDF skill 从 /path/to/file.pdf 中提取表单字段
```

```
使用 xlsx skill 创建一个包含销售数据和图表的电子表格
```

```
使用 mcp-builder skill 帮我创建一个连接到 GitHub API 的 MCP 服务器
```

## 创建自定义 Skill

Skills 很容易创建 - 只需一个包含 YAML frontmatter 和指令的 `SKILL.md` 文件的文件夹。

### 基本结构

```markdown
---
name: my-skill-name
description: 清晰描述此技能的功能和使用时机
---

# My Skill Name

[在此添加 Claude 在此技能激活时将遵循的指令]

## Examples
- 示例用法 1
- 示例用法 2

## Guidelines
- 指南 1
- 指南 2
```

### Frontmatter 字段

- `name` - 技能的唯一标识符（小写，空格用连字符）
- `description` - 技能功能和使用时机的完整描述

### 创建步骤

1. 在 `~/.claude/skills/` 中创建新目录
2. 创建 `SKILL.md` 文件
3. 添加 YAML frontmatter 和指令
4. 重启 Claude Code 或重新加载配置

## 更新 Skills

### 使用安装脚本更新

```bash
python3 skill_install.py --target marketplace
```

脚本会自动检测已安装的 marketplace 并执行 `git pull` 更新。

### 手动更新

如果直接安装到 skills 目录：

```bash
cd ~/.claude/skills/
git pull origin main
```

如果使用 marketplace：

```bash
cd ~/.claude/plugins/marketplaces/anthropics-skills/
git pull origin main
```

## 故障排除

### Git 未安装

```bash
# Ubuntu/Debian
sudo apt-get install git

# macOS
brew install git

# 或使用 Xcode Command Line Tools
xcode-select --install
```

### Skills 未被识别

1. 检查 `SKILL.md` 文件是否存在
2. 验证 YAML frontmatter 格式正确
3. 确保 `name` 字段使用小写和连字符
4. 重启 Claude Code

### 安装脚本失败

如果自动安装失败，可以：
1. 查看详细错误信息
2. 尝试手动安装方法
3. 检查网络连接和 Git 配置
4. 确保有足够的磁盘空间和权限

### SSH 克隆失败

安装脚本默认使用 HTTPS，如果仍然失败：

```bash
# 检查网络连接
ping github.com

# 尝试手动克隆
git clone https://github.com/anthropics/skills.git /tmp/test-clone
```

## 卸载

如需卸载 Claude Skills：

```bash
# 删除 skills 目录
rm -rf ~/.claude/skills

# 删除 marketplace（可选）
rm -rf ~/.claude/plugins/marketplaces/anthropics-skills

# 清理配置（可选）
# 手动编辑 ~/.claude/plugins/config.json 移除 marketplaces 配置
```

## 参考资源

- [Claude Skills 官方文档](https://support.claude.com/en/articles/12512176-what-are-skills)
- [创建自定义 Skills](https://support.claude.com/en/articles/12512198-creating-custom-skills)
- [Skills GitHub 仓库](https://github.com/anthropics/skills)
- [Agent Skills 技术博客](https://anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)

## 安装日期

- 初次安装：2025-10-28
- 最后更新：2025-10-28

# Changelog

## 2025-10-30

### Fixed

- 修复 PreCompact 事件重复发送通知问题

## 2025-10-29

### Changed

- 更新 .gitignore 为标准 Python 项目模板
- 忽略 /clear 命令触发的 SessionEnd 通知

## 2025-10-28

### Added

- 新增 skill_install.py 一键安装脚本
- 新增 CLAUDE_SKILLS_SETUP.md 安装指南文档
- 支持自动安装 Claude Skills (document-skills + example-skills)
- 支持自动配置插件市场

## 2025-10-27

### Added

- 新增 Notification hook 监控错误和警告通知
- 新增 PreCompact hook 监控上下文不足警告

### Changed

- 优化环境变量加载逻辑：优先读取当前项目 .env，后备使用主目录 .env
- 简化 README.md 文档结构

### Fixed

- 修复其他项目无法发送 Telegram 通知的问题

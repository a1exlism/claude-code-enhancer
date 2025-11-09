# Changelog

## 2025-11-07

### Added

- 完整 Node.js/TypeScript 重构
- 支持全局安装（npm link）

### Changed

- 所有 Python 脚本迁移为 TypeScript
- 使用 axios 替代 requests

## 2025-10-30

### Added

- 新增 LLM 总结功能，支持 OpenAI/Azure/Anthropic API
- 新增 summary_prompt.txt 总结模板文件
- LLM 总结仅对超过 200 字的响应生效
- TODO: 提示词风格、组装
- 新增 CLAUDE_CODE_BEST_PRACTICES.md 最佳实践文档

### Changed

- 优化 LLM API 调用，使用官方标准格式
- 更新 .env.template 配置示例，明确支持的 API 类型和模型
- 精简 CLAUDE.md 开发指南，移除冗余指令

### Fixed

- 修复 PreCompact 事件重复发送通知问题

### Research

- 完成 Claude Code 最佳实践调研（项目构建、上下文处理、MCP 集成）

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

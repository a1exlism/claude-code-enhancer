# Changelog

## 2025-11-10 (v2.1.0 - MVP 安全性与质量改进)

### Added

- **敏感信息过滤器** (src/utils/sanitizer.ts)
  - 自动检测并脱敏 13+ 种敏感模式（API Key、Token、密码等）
  - 支持自定义过滤模式（环境变量配置）
  - 保留前后 3 字符用于调试，防止完全信息丢失
  - 34 个单元测试覆盖，测试覆盖率 > 90%
- **优化 Claude 提示词** (summary_prompt.txt)
  - 遵循 Anthropic 最佳实践：XML 标签结构化
  - 提供 5 个高质量 Few-shot 示例
  - 明确输出格式（120-180 中文字符）
  - 详细的技术术语指导原则
- **Claude API 优化** (src/utils/llm-client.ts)
  - 支持独立 system 参数（Claude 最佳实践）
  - 增加 max_tokens 至 400（支持更长总结）
  - 降低 temperature 至 0.3（提高一致性）
  - 自动提取 `<role>` 标签作为 system prompt

### Changed

- **通知流程增强**
  - 集成敏感信息过滤到 aiagent-notify.ts
  - 检测到敏感信息时自动标注数量和类型
  - 日志记录脱敏详情（/tmp/claude_hook_debug.log）
- **配置模板更新** (.env.template)
  - 默认 LLM API 类型改为 anthropic
  - 添加安全配置说明
  - 更新模型示例为 claude-3-5-haiku-20241022

### Security

- **防止凭证泄露**：API Key、Token、密码等敏感信息自动脱敏后再发送到 Telegram
- **可配置过滤**：支持自定义敏感模式以适应特定安全需求

### Fixed

- 修复 LLM 总结质量不稳定问题（通过优化提示词和 API 参数）
- 修复测试用例以匹配新的 API 调用参数

---

## 2025-11-10 (之前版本)

### Added

- 新增 `src/utils/` 模块化架构
  - `env.ts` - 环境变量加载工具
  - `markdown.ts` - Markdown 转义和时间格式化
  - `llm-client.ts` - LLM API 客户端（支持 OpenAI/Azure/Anthropic）
  - `notifier.ts` - 通知接口和 Telegram 实现
  - `logger.ts` - 结构化日志工具
- 新增完整测试体系
  - 配置 Vitest 测试框架
  - 17 个单元测试覆盖核心逻辑
  - 测试覆盖率报告（c8）
- 新增 GitHub Actions CI/CD 流程
  - 自动运行测试（Node.js 18/20/22）
  - TypeScript 类型检查
  - 代码覆盖率上传

### Changed

- 重构 `aiagent-notify.ts` 使用 utils 模块
- 重构 `setup-claude.ts` 修复硬编码路径问题
  - 使用 `__dirname` 动态解析路径
  - 支持 npm link 全局安装
- 优化 package.json 脚本
  - 新增 `test`、`test:watch`、`test:coverage`
  - 新增 `typecheck` 类型检查
- 更新 README.md 文档
  - 新增架构设计说明
  - 新增测试和开发指南
  - 新增项目结构图

### Removed

- 删除所有 Python 遗留文件
  - `aiagent_notify.py`
  - `setup_claude.py`
  - `skill_install.py`

### Fixed

- 修复跨机器部署路径问题
- 修复代码重复问题（DRY 原则）

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

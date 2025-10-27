# Changelog

## 2025-10-27

### Added

- 新增 Notification hook 监控错误和警告通知
- 新增 PreCompact hook 监控上下文不足警告

### Changed

- 优化环境变量加载逻辑：优先读取当前项目 .env，后备使用主目录 .env
- 简化 README.md 文档结构

### Fixed

- 修复其他项目无法发送 Telegram 通知的问题

# Changelog

## 2025-11-10

### Added
- Added i18n support with English/Chinese documentation
  - Created English README.md (primary version)
  - Created README.zh-CN.md (Chinese localized version)
  - Added language switcher links in both READMEs
  - Translated CHANGELOG.md to English
  - Added i18n guidelines to CLAUDE.md with CHANGELOG workflow
  - Configured CHANGELOG.zh-CN.md as gitignored local reference

### Changed
- Upgraded CLAUDE.md to complete development guide (222 lines)
- Added project overview, development workflow, quality gates sections
- Added TypeScript/Vitest guidelines and module design guidance
- Optimized MCP tools section with usage principles
- Added common task workflows and FAQ

---

## 2025-11-10 (v2.1.0 - MVP Security & Quality Improvements)

### Added

- **Sensitive Data Filter** (src/utils/sanitizer.ts)
  - Auto-detect and sanitize 13+ sensitive patterns (API Keys, Tokens, passwords, etc.)
  - Support custom filter patterns (environment variable configuration)
  - Preserve first/last 3 characters for debugging, prevent complete information loss
  - 34 unit tests with >90% coverage
- **Optimized Claude Prompt** (summary_prompt.txt)
  - Follow Anthropic best practices: XML tag structure
  - Provide 5 high-quality few-shot examples
  - Clear output format (120-180 Chinese characters)
  - Detailed technical terminology guidelines
- **Claude API Optimization** (src/utils/llm-client.ts)
  - Support independent system parameter (Claude best practice)
  - Increase max_tokens to 400 (support longer summaries)
  - Reduce temperature to 0.3 (improve consistency)
  - Auto-extract `<role>` tags as system prompt

### Changed

- **Notification Flow Enhancement**
  - Integrate sensitive data filter into aiagent-notify.ts
  - Auto-annotate count and type when sensitive data detected
  - Log sanitization details (/tmp/claude_hook_debug.log)
- **Configuration Template Update** (.env.template)
  - Change default LLM API type to anthropic
  - Add security configuration instructions
  - Update model example to claude-3-5-haiku-20241022

### Security

- **Prevent Credential Leaks**: API Keys, Tokens, passwords auto-sanitized before sending to Telegram
- **Configurable Filtering**: Support custom sensitive patterns for specific security needs

### Fixed

- Fixed unstable LLM summary quality (via optimized prompt and API parameters)
- Fixed test cases to match new API call parameters

---

## 2025-11-10 (Previous Version)

### Added

- Added `src/utils/` modular architecture
  - `env.ts` - Environment variable loading utility
  - `markdown.ts` - Markdown escaping and time formatting
  - `llm-client.ts` - LLM API client (supports OpenAI/Azure/Anthropic)
  - `notifier.ts` - Notification interface and Telegram implementation
  - `logger.ts` - Structured logging utility
- Added complete test system
  - Configured Vitest testing framework
  - 17 unit tests covering core logic
  - Test coverage reporting (c8)
- Added GitHub Actions CI/CD pipeline
  - Auto-run tests (Node.js 18/20/22)
  - TypeScript type checking
  - Code coverage upload

### Changed

- Refactored `aiagent-notify.ts` to use utils modules
- Refactored `setup-claude.ts` to fix hardcoded path issues
  - Use `__dirname` for dynamic path resolution
  - Support npm link global installation
- Optimized package.json scripts
  - Added `test`, `test:watch`, `test:coverage`
  - Added `typecheck` type checking
- Updated README.md documentation
  - Added architecture design explanation
  - Added testing and development guide
  - Added project structure diagram

### Removed

- Removed all Python legacy files
  - `aiagent_notify.py`
  - `setup_claude.py`
  - `skill_install.py`

### Fixed

- Fixed cross-machine deployment path issues
- Fixed code duplication issues (DRY principle)

## 2025-11-07

### Added

- Complete Node.js/TypeScript refactor
- Support global installation (npm link)

### Changed

- Migrated all Python scripts to TypeScript
- Use axios instead of requests

## 2025-10-30

### Added

- Added LLM summarization feature, supports OpenAI/Azure/Anthropic API
- Added summary_prompt.txt summary template file
- LLM summarization only activates for responses over 200 characters
- TODO: Prompt style, assembly
- Added CLAUDE_CODE_BEST_PRACTICES.md best practices document

### Changed

- Optimized LLM API calls using official standard format
- Updated .env.template configuration examples, clarified supported API types and models
- Streamlined CLAUDE.md development guide, removed redundant instructions

### Fixed

- Fixed PreCompact event duplicate notification issue

### Research

- Completed Claude Code best practices research (project building, context handling, MCP integration)

## 2025-10-29

### Changed

- Updated .gitignore to standard Python project template
- Ignore SessionEnd notifications triggered by /clear command

## 2025-10-28

### Added

- Added skill_install.py one-click installation script
- Added CLAUDE_SKILLS_SETUP.md installation guide document
- Support auto-install Claude Skills (document-skills + example-skills)
- Support auto-configure plugin marketplace

## 2025-10-27

### Added

- Added Notification hook to monitor error and warning notifications
- Added PreCompact hook to monitor low context warnings

### Changed

- Optimized environment variable loading logic: prioritize current project .env, fallback to home directory .env
- Simplified README.md document structure

### Fixed

- Fixed issue where other projects couldn't send Telegram notifications

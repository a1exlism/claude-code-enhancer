# Development Guidelines

## Language Policy

**Primary Language**: English
- All code, comments, and commit messages use English
- Technical documentation (README.md, API docs) in English
- Separate Chinese version: README.zh_CN.md

## Project Overview

- **Type**: CLI Tools (TypeScript/Node.js)
- **Scale**: Small (~1900 lines: 1270 src + 661 tests)
- **Tech Stack**: TypeScript 5.4, Vitest, axios, dotenv
- **Build**: npm scripts (tsc compiler)
- **Test**: Vitest + 51 unit tests
- **CI/CD**: GitHub Actions (Node.js 18/20/22)

## Core Principles

1. **Incremental Development** - Small commits that compile and pass tests
2. **Test-Driven** - Write tests before implementation
3. **Simplicity First** - Avoid over-engineering (YAGNI principle)
4. **Type Safety** - Strict TypeScript mode, avoid `any`
5. **Modular Design** - Reusable utils/ layer with clear interfaces

## Available MCP Tools

本项目已集成以下 MCP 服务器，AI 助手可按需使用：

### 📚 Documentation & Research
- **context7** - 获取最新库文档（优先用于查询 API）
- **gitmcp** - GitHub 仓库文档和代码搜索

### 🧠 Memory & Knowledge
- **memory** - 知识图谱（可选：存储项目关键决策）
- **sequential-thinking** - 结构化思维（可选：复杂问题分析）

### 🌐 Web & Browser
- **playwright** - 浏览器自动化（可选：Web 测试）

### 🛠️ Development Tools
- **shrimp-task-manager** - 任务管理（可选：复杂任务规划）
- **codex** - 代码会话（可选：代码生成辅助）
- **ide** - VS Code 诊断和 Jupyter 执行

### 使用原则

1. **按需使用** - 工具是可选的，不是必需的
2. **优先简单** - 能直接完成的任务不使用工具
3. **文档优先** - 遇到 API 问题时使用 context7/gitmcp
4. **知识积累** - 重要决策可用 memory 存储

## Development Workflow

1. **Understand** - Clarify requirements and acceptance criteria
2. **Test** - Write tests in `tests/unit/*.test.ts`
3. **Implement** - Code in `src/**/*.ts`
4. **Verify** - Run quality gates (see below)
5. **Document** - Update `CHANGELOG.md`
6. **Commit** - Git commit (≤50 chars, from CHANGELOG)

## Quality Gates

Before committing, ensure all checks pass:

- [ ] `npm run typecheck` - TypeScript type checking
- [ ] `npm test` - All 51 unit tests pass
- [ ] `npm run build` - Compilation succeeds
- [ ] `CHANGELOG.md` - Updated with user-visible changes
- [ ] Commit message - ≤50 characters, clear and concise

## TypeScript Guidelines

- **Strict Mode**: Enabled (`strict: true` in tsconfig.json)
- **Module Design**: Reusable utils/ layer with single responsibility
- **Interface First**: Design for extensibility (e.g., `Notifier` interface)
- **Avoid `any`**: Use proper types or `unknown` with type guards
- **Error Handling**: Fail fast with descriptive messages and context
- **Exports**: Use named exports, avoid default exports

## Testing Guidelines

- **Framework**: Vitest with c8 coverage
- **Location**: `tests/unit/*.test.ts`
- **Coverage**: Core logic must be covered (currently 51 tests)
- **Naming**: `describe('Module')` + `it('should do something')`
- **Deterministic**: No flaky tests, no random data
- **Isolation**: Each test should be independent

## Simplicity Principles

- **Single Responsibility** - One function, one purpose
- **Avoid Premature Abstraction** - Wait for 3 use cases before abstracting
- **YAGNI** - You Aren't Gonna Need It (don't build for imagined future)
- **KISS** - Keep It Simple, Stupid
- **Clear Intent** - If you need to explain it, it's too complex
- **Composition over Inheritance** - Use dependency injection

## CHANGELOG.md Format

Update on: new features, bug fixes, breaking changes

```markdown
## YYYY-MM-DD

### Added/Fixed/Changed/BREAKING
- User-visible change description
```

**Rules**:
- Focus on user impact, not implementation
- Forbidden: AI mentions, technical details, test statistics
- Use past tense: "Added", "Fixed", "Changed"

## Commit Message Format

**Format**: `[tag] description` ≤50 characters

**Tags**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

**Examples**:
- `feat: add sensitive data filter`
- `fix: correct Claude API parameters`
- `docs: update configuration guide`

**Forbidden**: Technical details, AI information, implementation specifics

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Skip tests | Breaks TDD | Write tests first |
| Use `any` type | Loses type safety | Use proper types |
| Forget CHANGELOG | Missing history | Update before commit |
| Long commits | Hard to review | ≤50 chars |
| Over-engineering | Wasted effort | Apply YAGNI |
| No error context | Hard to debug | Add descriptive messages |
| Disable tests | Hides problems | Fix tests, never skip |
| Commit broken code | Breaks others | Ensure quality gates pass |

## Module Design

### utils/ Layer Pattern

**Purpose**: Reusable, testable utilities with clear interfaces

**Structure**:
```
src/utils/
├── sanitizer.ts    - Sensitive data filtering (210 lines, 34 tests)
├── llm-client.ts   - LLM API abstraction (110 lines, 4 tests)
├── notifier.ts     - Notification interface (66 lines, 3 tests)
├── env.ts          - Environment variable loading (31 lines, 4 tests)
├── markdown.ts     - Markdown formatting (24 lines, 6 tests)
└── logger.ts       - Structured logging (42 lines)
```

**Design Principles**:
- **Interface First**: Define interfaces for extensibility (e.g., `Notifier`)
- **Single Responsibility**: Each module has one clear purpose
- **Testability**: Pure functions, dependency injection
- **Composition**: Modules compose together (e.g., sanitizer + notifier)

### CLI Layer Pattern

**Purpose**: Thin wrappers around utils, user-facing commands

**Examples**:
- `aiagent-notify.ts` - Orchestrates utils for Telegram notifications
- `setup-claude.ts` - Configures Claude Code hooks
- `skill-install.ts` - Installs Claude Skills

## Common Tasks

### Adding a New Feature

1. Create test file: `tests/unit/feature.test.ts`
2. Write failing tests (Red)
3. Implement in `src/utils/feature.ts` or `src/feature.ts` (Green)
4. Refactor for clarity (Refactor)
5. Run `npm test` until all pass
6. Update `CHANGELOG.md` under `### Added`
7. Commit with `feat:` prefix

### Fixing a Bug

1. Add regression test that reproduces the bug
2. Verify test fails
3. Fix the bug
4. Verify test passes
5. Update `CHANGELOG.md` under `### Fixed`
6. Commit with `fix:` prefix

### Refactoring

1. Ensure all tests pass before refactoring
2. Refactor code (no behavior change)
3. Ensure all tests still pass
4. Update `CHANGELOG.md` only if user-visible
5. Commit with `refactor:` prefix

## FAQ

**Q: Should I use MCP tools?**
A: Optional. Use when they add value (e.g., context7 for API docs, gitmcp for code examples).

**Q: Can I use Chinese in commits?**
A: No. Follow "Primary Language: English" policy for code and commits.

**Q: How to handle breaking changes?**
A: Mark as `BREAKING` in CHANGELOG, explain migration path, bump major version.

**Q: What if tests fail?**
A: Never commit failing tests. Fix or skip with clear TODO and issue number.

**Q: How to add a new notification channel (e.g., Slack)?**
A: Implement `Notifier` interface in `src/utils/notifier.ts`, add tests, update docs.

**Q: Should I optimize for performance?**
A: Only if there's a proven bottleneck. Premature optimization is evil.

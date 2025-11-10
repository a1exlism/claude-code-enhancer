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

This project integrates the following MCP servers for AI assistants to use as needed:

### 📚 Documentation & Research

- **context7** - Fetch latest library docs (preferred for API queries)
- **gitmcp** - GitHub repository docs and code search

### 🧠 Memory & Knowledge

- **memory** - Knowledge graph (optional: store key project decisions)
- **sequential-thinking** - Structured thinking (optional: complex problem analysis)

### 🌐 Web & Browser

- **playwright** - Browser automation (optional: web testing)

### 🛠️ Development Tools

- **shrimp-task-manager** - Task management (optional: complex task planning)
- **codex** - Code sessions (optional: code generation assistance)
- **ide** - VS Code diagnostics and Jupyter execution

### Usage Principles

1. **Use as Needed** - Tools are optional, not required
2. **Prefer Simplicity** - Don't use tools for tasks you can complete directly
3. **Documentation First** - Use context7/gitmcp when encountering API issues
4. **Knowledge Accumulation** - Use memory to store important decisions

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

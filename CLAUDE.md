# Development Guidelines

## Philosophy

### Core Beliefs

- **Incremental progress over big bangs** - Small changes that compile and pass tests
- **Learning from existing code** - Study and plan before implementing
- **Pragmatic over dogmatic** - Adapt to project reality
- **Clear intent over clever code** - Be boring and obvious

### Simplicity Means

- Single responsibility per function/class
- Avoid premature abstractions
- No clever tricks - choose the boring solution
- If you need to explain it, it's too complex

## Available MCP Tools

本项目已集成以下 MCP 服务器，可直接使用：

### 📚 Documentation & Research
- **context7** - 获取最新库文档（OpenAI/Anthropic/Next.js 等）
- **gitmcp** - GitHub 仓库文档搜索和代码搜索

### 🧠 Memory & Knowledge
- **memory** - 知识图谱管理（实体、关系、观察）
- **sequential-thinking** - 结构化思维过程工具

### 🌐 Web & Browser
- **playwright** - 浏览器自动化（导航、截图、表单填充、代码生成）

### 🛠️ Development Tools
- **shrimp-task-manager** - 任务规划、分析、拆分、执行、验证
- **spec-workflow-mcp** - 软件需求、设计、任务文档工作流
- **codex** - 代码会话和自动化工具
- **ide** - VS Code 诊断和 Jupyter 代码执行

### 使用建议

1. **文档查询**: 使用 `context7` 或 `gitmcp` 获取最新 API 文档
2. **任务管理**: 复杂任务使用 `shrimp-task-manager` 进行规划和跟踪
3. **浏览器测试**: 使用 `playwright` 进行 Web 应用测试
4. **知识积累**: 使用 `memory` 存储项目关键信息

## Process

### 1. Planning & Staging

## Stage N: [Name]

**Goal**: [Specific deliverable]
**Success Criteria**: [Testable outcomes]
**Tests**: [Specific test cases]
**Status**: [Not Started|In Progress|Complete]

- Update status as you progress
- Remove file when all stages are done

### 2. Implementation Flow

1. **Understand** - Study existing patterns in codebase
2. **Test** - Write test first (red)
3. **Implement** - Minimal code to pass (green)
4. **Refactor** - Clean up with tests passing
5. **Commit** - With clear message linking to plan

### 3. When Stuck (After 3 Attempts)

**CRITICAL**: Maximum 3 attempts per issue, then STOP.

1. **Document what failed**:
   - What you tried
   - Specific error messages
   - Why you think it failed

2. **Research alternatives**:
   - Find 2-3 similar implementations
   - Note different approaches used
   - **Use MCP tools**: `context7` for docs, `gitmcp` for code examples

3. **Question fundamentals**:
   - Is this the right abstraction level?
   - Can this be split into smaller problems?
   - Is there a simpler approach entirely?

4. **Try different angle**:
   - Different library/framework feature?
   - Different architectural pattern?
   - Remove abstraction instead of adding?

## Architecture Principles

- **Composition over inheritance** - Use dependency injection
- **Interfaces over singletons** - Enable testing and flexibility
- **Explicit over implicit** - Clear data flow and dependencies
- **Test-driven when possible** - Never disable tests, fix them

### Code Quality

- **Every commit must**:
  - Compile successfully
  - Pass all existing tests
  - Include tests for new functionality
  - Follow project formatting/linting

- **Before committing**:
  - Run formatters/linters
  - Self-review changes
  - Ensure commit message explains "why"

### Error Handling

- Fail fast with descriptive messages
- Include context for debugging
- Handle errors at appropriate level
- Never silently swallow exceptions

## Decision Framework

When multiple valid approaches exist, choose based on:

1. **Testability** - Can I easily test this?
2. **Readability** - Will someone understand this in 6 months?
3. **Consistency** - Does this match project patterns?
4. **Simplicity** - Is this the simplest solution that works?
5. **Reversibility** - How hard to change later?

## Project Integration

### Learning the Codebase

- Find 3 similar features/components
- Identify common patterns and conventions
- Use same libraries/utilities when possible
- Follow existing test patterns
- **Use MCP tools**: `gitmcp` for similar code patterns

### Tooling

- Use project's existing build system
- Use project's test framework
- Use project's formatter/linter settings
- Don't introduce new tools without strong justification
- **Leverage MCP**: `playwright` for testing, `ide` for diagnostics

## Quality Gates

### Definition of Done

- [ ] Tests written and passing
- [ ] Code follows project conventions
- [ ] No linter/formatter warnings
- [ ] Commit messages are clear
- [ ] Implementation matches plan
- [ ] No TODOs without issue numbers

### Test Guidelines

- Test behavior, not implementation
- One assertion per test when possible
- Clear test names describing scenario
- Use existing test utilities/helpers
- Tests should be deterministic

## Important Reminders

**NEVER**:

- Use `--no-verify` to bypass commit hooks
- Disable tests instead of fixing them
- Commit code that doesn't compile
- Make assumptions - verify with existing code

**ALWAYS**:

- Commit working code incrementally
- Update plan documentation as you go
- Learn from existing implementations
- 同步所有进度，所有修改同步至 @CHANGELOG.md 文件, 精简格式与字数(GNU Linux 风格)
- git commit 来源于 @CHANGELOG.md，字数限定 50 字 内，忽略提交细节
- **优先使用 MCP 工具**获取准确信息，避免猜测

# Claude Code Enhancer

[简体中文](./README.zh-CN.md) | English

[![CI](https://github.com/a1exlism/scripts/workflows/CI/badge.svg)](https://github.com/a1exlism/scripts/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

A TypeScript toolkit providing enhanced features for Claude Code with extensible hook-based architecture.

**Current Version**: v0.1.0 (Core Framework MVP)

## ✨ Features

### 🎯 Core Framework (v0.1.0)

The foundation for building extensible CLI tools with:

- **⚙️ ConfigManager**: Type-safe configuration management
  - JSON configuration with Zod validation
  - Environment variable interpolation (`${VAR_NAME}`)
  - Configuration priority: project > user > default
  - Environment variable overrides (`CLAUDE_ENHANCER_*`)

- **📡 EventBus**: Event-driven pub/sub system
  - Synchronous and asynchronous event listeners
  - One-time listeners and wildcard support (`*`)
  - Error isolation between listeners
  - 28 unit tests with full coverage

- **🪝 HookSystem**: Flexible hook registration and execution
  - Priority-based hook execution
  - Timeout control and matcher pattern filtering
  - Service injection (EventBus, ConfigManager, Logger)
  - Support for 7 hook events: PreToolUse, PostToolUse, SessionStart, SessionEnd, Stop, Notification, PreCompact
  - 24 unit tests with full coverage

### 🔔 Notification Features

- **Real-time Notifications**: Push Claude Code session events to Telegram
  - Session end notifications (SessionEnd)
  - Session interruption notifications (Stop)
  - Error/warning notifications (Notification)
  - Low context warnings (PreCompact)
  - Smart event deduplication (PreCompact 5-second dedup)
  - Auto-ignore notifications triggered by `/clear` command

- **🤖 LLM Summarization**: Optional intelligent response summarization
  - Supports OpenAI, Azure, Anthropic APIs
  - Only activates for responses over 200 characters
  - Auto-fallback to original text on failure

### 🛠️ Tool Integration

- One-click Claude Skills installer
- Automatic Claude Code Hooks configuration
- Cross-platform path resolution (supports npm link global installation)

### 📊 Quality Metrics

- ✅ **Test Coverage**: 135 tests (124 unit + 11 integration)
- ✅ **Type Safety**: Strict TypeScript mode with complete type definitions
- ✅ **Modular Design**: Reusable core framework + utils layer
- ✅ **CI/CD**: GitHub Actions automated testing and type checking
- ✅ **Documentation**: Complete API docs, guides, and examples

## 📦 Quick Start

### Installation

```bash
# Clone repository
git clone https://github.com/a1exlism/scripts.git
cd scripts

# Install dependencies
npm install

# Build project
npm run build

# (Optional) Global installation
npm link
```

### Configuration

1. **Create environment variables file**

```bash
cp .env.template .env
```

2. **Edit `.env` file**

```env
# Telegram notification config (required)
TELEGRAM_BOT_TOKEN_AIAGENTNOTIFY=your_bot_token
TELEGRAM_CHAT_ID_AIAGENTNOTIFY=your_chat_id

# LLM summarization config (optional)
AIAGENT_ENABLE_SUMMARY=false
AIAGENT_LLM_API_TYPE=openai  # openai | azure | anthropic
AIAGENT_LLM_API_KEY=your_api_key
AIAGENT_LLM_API_BASE=https://api.openai.com
AIAGENT_LLM_MODEL=gpt-4o-mini
```

3. **Configure Claude Code Hooks**

```bash
# Use compiled script
node dist/setup-claude.js

# Or use development mode
npx tsx src/setup-claude.ts
```

### Usage

#### Notification Features

After configuration, Claude Code will automatically send Telegram notifications when:

- ✅ Session ends normally
- 🛑 Session is interrupted
- ❌ Errors or warnings occur
- ⚠️ Context is about to run low

#### Core Framework Usage

```typescript
import {
  getConfigManager,
  getEventBus,
  getHookSystem,
} from './src/core/index.js';

// Load configuration
const configManager = getConfigManager();
configManager.load();

// Get event bus
const eventBus = getEventBus();

// Register hooks
const hookSystem = getHookSystem();
hookSystem.register({
  name: 'PreToolUse',
  handler: async (context) => {
    // Your hook logic
    return { success: true };
  },
  priority: 100,
});
```

See [Getting Started Guide](./docs/guides/getting-started.md) for detailed usage instructions.

## 📚 Documentation

- **[Getting Started Guide](./docs/guides/getting-started.md)** - Complete introduction to the core framework
- **[Configuration Examples](./docs/examples/config-examples.md)** - Practical configuration examples
- **[Hook Examples](./docs/examples/hook-examples.md)** - Hook implementation examples
- **[API Reference](./docs/api/README.md)** - Complete API documentation
- **[Development Guide](./CLAUDE.md)** - Development guidelines and best practices

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Type checking
npm run typecheck
```

## 📁 Project Structure

```
src/
├── utils/                    # Shared utility modules
│   ├── env.ts               # Environment variable loading
│   ├── markdown.ts          # Markdown escaping
│   ├── llm-client.ts        # LLM API client
│   ├── notifier.ts          # Notification interface (Telegram)
│   └── logger.ts            # Structured logging
├── aiagent-notify.ts        # Telegram notification main program
├── setup-claude.ts          # Claude Code Hooks configuration tool
└── skill-install.ts         # Claude Skills installer

tests/
├── unit/                     # Unit tests
│   ├── env.test.ts
│   ├── markdown.test.ts
│   ├── llm-client.test.ts
│   └── notifier.test.ts
└── integration/              # Integration tests (to be added)
```

## 🔧 Development

### Available Scripts

```bash
npm run build          # Compile TypeScript
npm run dev            # Run in development mode
npm test               # Run tests
npm run test:watch     # Test in watch mode
npm run test:ui        # Test UI interface
npm run test:coverage  # Generate coverage report
npm run typecheck      # Type checking
```

### Architecture Design

The project adopts **progressive evolution architecture**:

- **Current Stage**: CLI toolkit + lightweight utils modules
- **Interface Reserved**: Notifier interface supports future extensions (Slack, Discord)
- **Future Plans**: Upgrade to full plugin architecture as needed

### Contributing

1. Fork this repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Create Pull Request

## 📝 Changelog

See [CHANGELOG.md](./CHANGELOG.md)

## 🙏 Acknowledgments

- [Claude Code](https://claude.com/claude-code) - Anthropic's official CLI tool
- [Vitest](https://vitest.dev/) - Fast unit testing framework
- [TypeScript](https://www.typescriptlang.org/) - JavaScript superset

## 📄 License

MIT License

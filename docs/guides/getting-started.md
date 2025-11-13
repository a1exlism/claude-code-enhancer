# Getting Started with Core Framework

## Overview

The Core Framework provides a robust foundation for building extensible CLI tools with:

- **ConfigManager**: Type-safe configuration management with Zod validation
- **EventBus**: Event-driven pub/sub system for loose coupling
- **HookSystem**: Flexible hook registration and execution engine

## Installation

```bash
npm install
npm run build
```

## Quick Start

### 1. Basic Configuration

Create a configuration file `.claude-enhancer.json` in your project root:

```json
{
  "hooks": {
    "PreToolUse": {
      "enabled": true,
      "timeout": 5,
      "matcher": "Write|Edit"
    }
  },
  "quality": {
    "enabled": true,
    "linters": ["tsc", "eslint"],
    "autoFix": false
  }
}
```

### 2. Initialize the Framework

```typescript
import {
  getConfigManager,
  getEventBus,
  getHookSystem,
} from './src/core/index.js';

// Load configuration
const configManager = getConfigManager();
configManager.load();

// Get event bus instance
const eventBus = getEventBus();

// Get hook system instance
const hookSystem = getHookSystem();
```

### 3. Register a Hook

```typescript
import type { HookContext, HookResult } from './src/types/hooks.js';

// Define a hook handler
const securityCheckHandler = async (context: HookContext): Promise<HookResult> => {
  const { event, payload, config, services } = context;

  // Access configuration
  const qualityEnabled = services.configManager.getValue('quality.enabled');

  // Emit custom events
  services.eventBus.emit({
    type: 'security-check-started',
    payload: { tool: payload.tool },
    timestamp: Date.now(),
    source: 'security-check',
  });

  // Perform security check
  const isSafe = checkSecurity(payload);

  if (!isSafe) {
    return {
      success: false,
      error: new Error('Security check failed'),
    };
  }

  return { success: true };
};

// Register the hook
hookSystem.register({
  name: 'PreToolUse',
  handler: securityCheckHandler,
  priority: 100, // Higher priority = executes first
  timeout: 5, // Timeout in seconds
  matcher: 'Write|Edit', // Only match Write or Edit tools
});
```

### 4. Trigger Hooks

```typescript
import type { HookEvent } from './src/types/hooks.js';

// Create a hook event
const event: HookEvent = {
  name: 'PreToolUse',
  timestamp: Date.now(),
  source: 'cli',
  payload: {
    tool: 'Write',
    path: '/path/to/file.ts',
  },
};

// Trigger the hook
const results = await hookSystem.trigger(event);

// Check results
for (const result of results) {
  if (!result.success) {
    console.error('Hook failed:', result.error);
  }
}
```

### 5. Listen to Events

```typescript
// Listen to hook events
eventBus.on('hook:PreToolUse', (event) => {
  console.log('PreToolUse hook triggered:', event.payload);
});

// Listen to custom events
eventBus.on('security-check-started', (event) => {
  console.log('Security check started for:', event.payload.tool);
});

// One-time listener
eventBus.once('session-start', (event) => {
  console.log('Session started:', event);
});

// Wildcard listener (all events)
eventBus.on('*', (event) => {
  console.log('Event emitted:', event.type);
});
```

## Configuration

### Configuration Priority

The framework loads configuration in the following priority order (highest to lowest):

1. **Environment variables** (`CLAUDE_ENHANCER_*`)
2. **Project config** (`./.claude-enhancer.json`)
3. **User config** (`~/.claude-enhancer/config.json`)
4. **Default config** (built-in)

### Environment Variable Interpolation

Use `${VAR_NAME}` syntax to reference environment variables in your config:

```json
{
  "notify": {
    "channels": {
      "telegram": {
        "enabled": true,
        "botToken": "${TELEGRAM_BOT_TOKEN}",
        "chatId": "${TELEGRAM_CHAT_ID}"
      }
    }
  }
}
```

### Environment Variable Overrides

Override configuration values using environment variables:

```bash
# Override quality.enabled
export CLAUDE_ENHANCER_QUALITY_ENABLED=false

# Override quality.autoFix
export CLAUDE_ENHANCER_QUALITY_AUTO_FIX=true
```

## Hook System

### Hook Lifecycle

1. **Registration**: Hooks are registered with the HookSystem
2. **Triggering**: Events trigger registered hooks
3. **Filtering**: Hooks are filtered by matcher pattern
4. **Sorting**: Hooks are sorted by priority (higher first)
5. **Execution**: Hooks execute in priority order
6. **Timeout**: Hooks timeout if they exceed configured time
7. **Event Emission**: Hook results are emitted to EventBus

### Hook Priority

- **100+**: Critical hooks (failure stops execution)
- **50-99**: High priority hooks
- **10-49**: Normal priority hooks
- **0-9**: Low priority hooks

### Hook Matcher Patterns

Use regex patterns to filter which events trigger your hook:

```typescript
hookSystem.register({
  name: 'PreToolUse',
  handler: myHandler,
  matcher: 'Write|Edit', // Match Write or Edit
});

hookSystem.register({
  name: 'PreToolUse',
  handler: myHandler,
  matcher: '.*\\.ts$', // Match TypeScript files
});
```

### Hook Context

Every hook handler receives a context object:

```typescript
interface HookContext {
  event: HookEvent;           // The hook event
  payload: unknown;           // Event payload
  config: HookConfigOptions;  // Hook configuration
  services: HookServices;     // Injected services
}

interface HookServices {
  eventBus: EventBus;         // Event bus instance
  configManager: ConfigManager; // Config manager instance
  logger: {                   // Logger instance
    debug: (message: string) => void;
    info: (message: string) => void;
    error: (message: string, error?: Error) => void;
  };
}
```

## Event Bus

### Event Types

- **Hook Events**: `hook:PreToolUse`, `hook:PostToolUse`, etc.
- **Custom Events**: Any string you define
- **Wildcard**: `*` matches all events

### Event Structure

```typescript
interface Event {
  type: string;      // Event type/name
  payload: unknown;  // Event data
  timestamp: number; // Unix timestamp
  source: string;    // Event source identifier
}
```

### Event Listener Patterns

```typescript
// Regular listener (persistent)
eventBus.on('my-event', (event) => {
  console.log('Event received:', event);
});

// One-time listener (auto-removed after first call)
eventBus.once('my-event', (event) => {
  console.log('Event received once:', event);
});

// Wildcard listener (all events)
eventBus.on('*', (event) => {
  console.log('Any event:', event.type);
});

// Remove listener
const listener = (event) => console.log(event);
eventBus.on('my-event', listener);
eventBus.off('my-event', listener);

// Remove all listeners for an event
eventBus.removeAllListeners('my-event');

// Remove all listeners
eventBus.removeAllListeners();
```

## Best Practices

### 1. Use Singleton Instances

Always use the singleton getters to ensure consistency:

```typescript
// ✅ Good
const configManager = getConfigManager();
const eventBus = getEventBus();
const hookSystem = getHookSystem();

// ❌ Bad
const configManager = new ConfigManager();
const eventBus = new EventBus();
const hookSystem = new HookSystem();
```

### 2. Handle Hook Errors Gracefully

```typescript
const handler = async (context: HookContext): Promise<HookResult> => {
  try {
    // Your logic here
    return { success: true };
  } catch (error) {
    context.services.logger.error('Hook failed', error as Error);
    return {
      success: false,
      error: error as Error,
    };
  }
};
```

### 3. Use Appropriate Hook Priorities

- Critical validation: 100+
- Security checks: 80-99
- Business logic: 50-79
- Logging/monitoring: 10-49
- Cleanup: 0-9

### 4. Keep Hooks Fast

- Hooks should complete within their timeout
- Use async operations carefully
- Avoid blocking operations
- Consider using events for long-running tasks

### 5. Emit Meaningful Events

```typescript
// ✅ Good - descriptive event with useful payload
eventBus.emit({
  type: 'file-validated',
  payload: {
    path: '/path/to/file.ts',
    valid: true,
    issues: [],
  },
  timestamp: Date.now(),
  source: 'validator',
});

// ❌ Bad - vague event with minimal info
eventBus.emit({
  type: 'done',
  payload: {},
  timestamp: Date.now(),
  source: 'app',
});
```

## Troubleshooting

### Configuration Not Loading

1. Check file path: `./.claude-enhancer.json`
2. Verify JSON syntax
3. Check environment variables are set
4. Review validation errors in logs

### Hooks Not Executing

1. Verify hook is enabled in config
2. Check matcher pattern matches event
3. Ensure hook is registered before triggering
4. Review hook priority order

### Events Not Received

1. Verify listener is registered before event emission
2. Check event type matches exactly
3. Ensure EventBus singleton is used consistently
4. Review event emission logs

## Next Steps

- [Configuration Examples](../examples/config-examples.md)
- [Hook Examples](../examples/hook-examples.md)
- [API Reference](../api/README.md)
- [Architecture Guide](../../analysis/architecture-design-2025-01-12.md)

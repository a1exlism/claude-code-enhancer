# Hook Examples

This document provides practical examples of implementing hooks for common use cases.

## Table of Contents

- [Security Check Hook](#security-check-hook)
- [Permission Management Hook](#permission-management-hook)
- [Parameter Validation Hook](#parameter-validation-hook)
- [Performance Monitoring Hook](#performance-monitoring-hook)
- [Code Quality Check Hook](#code-quality-check-hook)
- [Notification Hook](#notification-hook)
- [Session Management Hook](#session-management-hook)
- [Error Handling Hook](#error-handling-hook)

---

## Security Check Hook

Validates dangerous operations before execution.

```typescript
import type { HookContext, HookResult } from '../../src/types/hooks.js';
import { getHookSystem } from '../../src/core/index.js';

const DANGEROUS_COMMANDS = [
  'rm -rf',
  'sudo',
  'chmod 777',
  'dd if=',
  'mkfs',
  '> /dev/sda',
];

const DANGEROUS_PATHS = [
  '/etc',
  '/sys',
  '/proc',
  '/boot',
  '/dev',
];

const securityCheckHandler = async (context: HookContext): Promise<HookResult> => {
  const { payload, services } = context;
  const { logger } = services;

  // Extract command or path from payload
  const command = (payload as any).command || '';
  const path = (payload as any).path || '';

  // Check for dangerous commands
  for (const dangerousCmd of DANGEROUS_COMMANDS) {
    if (command.includes(dangerousCmd)) {
      logger.error(`Blocked dangerous command: ${dangerousCmd}`);
      return {
        success: false,
        error: new Error(`Dangerous command detected: ${dangerousCmd}`),
      };
    }
  }

  // Check for dangerous paths
  for (const dangerousPath of DANGEROUS_PATHS) {
    if (path.startsWith(dangerousPath)) {
      logger.error(`Blocked access to dangerous path: ${dangerousPath}`);
      return {
        success: false,
        error: new Error(`Access to dangerous path denied: ${dangerousPath}`),
      };
    }
  }

  logger.debug('Security check passed');
  return { success: true };
};

// Register the hook
const hookSystem = getHookSystem();
hookSystem.register({
  name: 'PreToolUse',
  handler: securityCheckHandler,
  priority: 100, // Critical - execute first
  timeout: 5,
  matcher: 'Bash|Write|Edit|Delete',
});
```

---

## Permission Management Hook

Manages user permissions for different operations.

```typescript
import type { HookContext, HookResult } from '../../src/types/hooks.js';
import { getHookSystem } from '../../src/core/index.js';

interface PermissionRule {
  tool: string;
  allowed: boolean;
  reason?: string;
}

const PERMISSION_RULES: PermissionRule[] = [
  { tool: 'Write', allowed: true },
  { tool: 'Read', allowed: true },
  { tool: 'Edit', allowed: true },
  { tool: 'Delete', allowed: false, reason: 'Delete operations require approval' },
  { tool: 'Bash', allowed: true },
];

const permissionCheckHandler = async (context: HookContext): Promise<HookResult> => {
  const { payload, services } = context;
  const { logger, eventBus } = services;

  const tool = (payload as any).tool || '';

  // Find permission rule
  const rule = PERMISSION_RULES.find((r) => r.tool === tool);

  if (!rule) {
    logger.debug(`No permission rule for tool: ${tool}, allowing by default`);
    return { success: true };
  }

  if (!rule.allowed) {
    logger.error(`Permission denied for tool: ${tool}`);

    // Emit permission denied event
    eventBus.emit({
      type: 'permission-denied',
      payload: { tool, reason: rule.reason },
      timestamp: Date.now(),
      source: 'permission-manager',
    });

    return {
      success: false,
      error: new Error(rule.reason || `Permission denied for ${tool}`),
    };
  }

  logger.debug(`Permission granted for tool: ${tool}`);
  return { success: true };
};

// Register the hook
const hookSystem = getHookSystem();
hookSystem.register({
  name: 'PreToolUse',
  handler: permissionCheckHandler,
  priority: 90,
  timeout: 5,
});
```

---

## Parameter Validation Hook

Validates and normalizes parameters before execution.

```typescript
import type { HookContext, HookResult } from '../../src/types/hooks.js';
import { getHookSystem } from '../../src/core/index.js';
import { resolve, normalize } from 'path';

const paramValidationHandler = async (context: HookContext): Promise<HookResult> => {
  const { payload, services } = context;
  const { logger } = services;

  const tool = (payload as any).tool || '';
  let path = (payload as any).path || '';

  // Normalize file paths
  if (path && (tool === 'Write' || tool === 'Read' || tool === 'Edit')) {
    const originalPath = path;

    // Resolve relative paths
    path = resolve(path);

    // Normalize path separators
    path = normalize(path);

    if (originalPath !== path) {
      logger.debug(`Normalized path: ${originalPath} -> ${path}`);
    }

    // Update payload with normalized path
    (payload as any).path = path;
  }

  // Validate required parameters
  if (tool === 'Write' && !(payload as any).content) {
    return {
      success: false,
      error: new Error('Write operation requires content parameter'),
    };
  }

  if (tool === 'Bash' && !(payload as any).command) {
    return {
      success: false,
      error: new Error('Bash operation requires command parameter'),
    };
  }

  logger.debug('Parameter validation passed');
  return { success: true, data: { normalizedPayload: payload } };
};

// Register the hook
const hookSystem = getHookSystem();
hookSystem.register({
  name: 'PreToolUse',
  handler: paramValidationHandler,
  priority: 80,
  timeout: 5,
});
```

---

## Performance Monitoring Hook

Tracks execution time and performance metrics.

```typescript
import type { HookContext, HookResult } from '../../src/types/hooks.js';
import { getHookSystem } from '../../src/core/index.js';

const performanceMap = new Map<string, number>();

const performanceStartHandler = async (context: HookContext): Promise<HookResult> => {
  const { event, services } = context;
  const { logger } = services;

  const operationId = `${event.name}-${event.timestamp}`;
  performanceMap.set(operationId, Date.now());

  logger.debug(`Performance tracking started: ${operationId}`);
  return { success: true, data: { operationId } };
};

const performanceEndHandler = async (context: HookContext): Promise<HookResult> => {
  const { event, services } = context;
  const { logger, eventBus } = services;

  const operationId = `PreToolUse-${event.timestamp}`;
  const startTime = performanceMap.get(operationId);

  if (startTime) {
    const duration = Date.now() - startTime;
    performanceMap.delete(operationId);

    logger.info(`Operation completed in ${duration}ms`);

    // Emit performance metric
    eventBus.emit({
      type: 'performance-metric',
      payload: {
        operation: event.name,
        duration,
        timestamp: event.timestamp,
      },
      timestamp: Date.now(),
      source: 'performance-monitor',
    });

    // Warn if operation is slow
    if (duration > 1000) {
      logger.error(`Slow operation detected: ${duration}ms`);
      eventBus.emit({
        type: 'slow-operation',
        payload: { operation: event.name, duration },
        timestamp: Date.now(),
        source: 'performance-monitor',
      });
    }
  }

  return { success: true };
};

// Register hooks
const hookSystem = getHookSystem();

hookSystem.register({
  name: 'PreToolUse',
  handler: performanceStartHandler,
  priority: 10,
  timeout: 5,
});

hookSystem.register({
  name: 'PostToolUse',
  handler: performanceEndHandler,
  priority: 10,
  timeout: 5,
});
```

---

## Code Quality Check Hook

Runs linters and tests after code changes.

```typescript
import type { HookContext, HookResult } from '../../src/types/hooks.js';
import { getHookSystem } from '../../src/core/index.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const qualityCheckHandler = async (context: HookContext): Promise<HookResult> => {
  const { payload, services } = context;
  const { logger, eventBus, configManager } = services;

  const tool = (payload as any).tool || '';
  const path = (payload as any).path || '';

  // Only check TypeScript files
  if (!path.endsWith('.ts') && !path.endsWith('.tsx')) {
    return { success: true };
  }

  // Get linters from config
  const linters = configManager.getValue<string[]>('quality.linters') || ['tsc'];
  const issues: string[] = [];

  logger.info(`Running quality checks on: ${path}`);

  // Run TypeScript compiler
  if (linters.includes('tsc')) {
    try {
      await execAsync('npm run typecheck');
      logger.debug('TypeScript check passed');
    } catch (error) {
      const message = (error as any).stdout || (error as any).message;
      issues.push(`TypeScript: ${message}`);
      logger.error('TypeScript check failed', error as Error);
    }
  }

  // Run ESLint
  if (linters.includes('eslint')) {
    try {
      await execAsync(`npx eslint ${path}`);
      logger.debug('ESLint check passed');
    } catch (error) {
      const message = (error as any).stdout || (error as any).message;
      issues.push(`ESLint: ${message}`);
      logger.error('ESLint check failed', error as Error);
    }
  }

  // Emit quality check result
  eventBus.emit({
    type: 'quality-check-completed',
    payload: {
      path,
      passed: issues.length === 0,
      issues,
    },
    timestamp: Date.now(),
    source: 'quality-checker',
  });

  if (issues.length > 0) {
    return {
      success: false,
      error: new Error(`Quality checks failed:\n${issues.join('\n')}`),
    };
  }

  return { success: true };
};

// Register the hook
const hookSystem = getHookSystem();
hookSystem.register({
  name: 'PostToolUse',
  handler: qualityCheckHandler,
  priority: 50,
  timeout: 30, // Longer timeout for linting
  matcher: 'Write|Edit',
});
```

---

## Notification Hook

Sends notifications for important events.

```typescript
import type { HookContext, HookResult } from '../../src/types/hooks.js';
import { getHookSystem, getEventBus } from '../../src/core/index.js';

const notificationHandler = async (context: HookContext): Promise<HookResult> => {
  const { event, services } = context;
  const { logger, configManager } = services;

  // Check if notifications are enabled
  const telegramEnabled = configManager.getValue('notify.channels.telegram.enabled');

  if (!telegramEnabled) {
    return { success: true };
  }

  const botToken = configManager.getValue<string>('notify.channels.telegram.botToken');
  const chatId = configManager.getValue<string>('notify.channels.telegram.chatId');

  if (!botToken || !chatId) {
    logger.error('Telegram credentials not configured');
    return { success: false, error: new Error('Missing Telegram credentials') };
  }

  // Format notification message
  const message = `
🔔 *Hook Event*
Event: ${event.name}
Source: ${event.source}
Time: ${new Date(event.timestamp).toISOString()}
  `.trim();

  try {
    // Send notification (simplified example)
    logger.info(`Sending notification: ${message}`);

    // In real implementation, use axios to send to Telegram API
    // await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    //   chat_id: chatId,
    //   text: message,
    //   parse_mode: 'Markdown',
    // });

    return { success: true };
  } catch (error) {
    logger.error('Failed to send notification', error as Error);
    return { success: false, error: error as Error };
  }
};

// Listen to specific events and trigger notifications
const eventBus = getEventBus();

eventBus.on('security-check-failed', async (event) => {
  // Trigger notification hook
  const hookSystem = getHookSystem();
  await hookSystem.trigger({
    name: 'Notification',
    timestamp: Date.now(),
    source: 'security',
    payload: event.payload,
  });
});

eventBus.on('quality-check-failed', async (event) => {
  // Trigger notification hook
  const hookSystem = getHookSystem();
  await hookSystem.trigger({
    name: 'Notification',
    timestamp: Date.now(),
    source: 'quality',
    payload: event.payload,
  });
});
```

---

## Session Management Hook

Manages session lifecycle and initialization.

```typescript
import type { HookContext, HookResult } from '../../src/types/hooks.js';
import { getHookSystem } from '../../src/core/index.js';

const sessionStartHandler = async (context: HookContext): Promise<HookResult> => {
  const { services } = context;
  const { logger, eventBus, configManager } = services;

  logger.info('Session started');

  // Load project configuration
  const projectConfig = configManager.get();
  logger.debug(`Loaded configuration: ${JSON.stringify(projectConfig, null, 2)}`);

  // Emit session start event
  eventBus.emit({
    type: 'session-initialized',
    payload: {
      config: projectConfig,
      timestamp: Date.now(),
    },
    timestamp: Date.now(),
    source: 'session-manager',
  });

  // Perform initialization tasks
  logger.info('Initializing development environment...');

  // Check required tools
  const requiredTools = ['node', 'npm', 'git'];
  for (const tool of requiredTools) {
    logger.debug(`Checking for ${tool}...`);
    // In real implementation, check if tool exists
  }

  logger.info('Session initialization complete');
  return { success: true };
};

const sessionEndHandler = async (context: HookContext): Promise<HookResult> => {
  const { services } = context;
  const { logger, eventBus } = services;

  logger.info('Session ending');

  // Emit session end event
  eventBus.emit({
    type: 'session-terminated',
    payload: { timestamp: Date.now() },
    timestamp: Date.now(),
    source: 'session-manager',
  });

  // Cleanup tasks
  logger.info('Performing cleanup...');

  logger.info('Session ended');
  return { success: true };
};

// Register hooks
const hookSystem = getHookSystem();

hookSystem.register({
  name: 'SessionStart',
  handler: sessionStartHandler,
  priority: 100,
  timeout: 10,
});

hookSystem.register({
  name: 'SessionEnd',
  handler: sessionEndHandler,
  priority: 100,
  timeout: 10,
});
```

---

## Error Handling Hook

Centralized error handling and logging.

```typescript
import type { HookContext, HookResult } from '../../src/types/hooks.js';
import { getEventBus } from '../../src/core/index.js';

// Global error handler
const errorHandler = async (event: any): Promise<void> => {
  const { payload } = event;
  const { error, context } = payload;

  console.error('='.repeat(80));
  console.error('ERROR DETECTED');
  console.error('='.repeat(80));
  console.error(`Time: ${new Date().toISOString()}`);
  console.error(`Source: ${event.source}`);
  console.error(`Context: ${JSON.stringify(context, null, 2)}`);
  console.error(`Error: ${error.message}`);
  console.error(`Stack: ${error.stack}`);
  console.error('='.repeat(80));

  // Log to file
  // In real implementation, write to log file

  // Send notification for critical errors
  if (context?.critical) {
    // Trigger notification
  }
};

// Register error event listener
const eventBus = getEventBus();
eventBus.on('error', errorHandler);
eventBus.on('hook-error', errorHandler);
eventBus.on('validation-error', errorHandler);

// Wrapper function to catch errors in hooks
export function withErrorHandling(
  handler: (context: HookContext) => Promise<HookResult>
): (context: HookContext) => Promise<HookResult> {
  return async (context: HookContext): Promise<HookResult> => {
    try {
      return await handler(context);
    } catch (error) {
      const { services } = context;

      // Emit error event
      services.eventBus.emit({
        type: 'hook-error',
        payload: {
          error,
          context: {
            event: context.event.name,
            payload: context.payload,
          },
        },
        timestamp: Date.now(),
        source: 'error-handler',
      });

      return {
        success: false,
        error: error as Error,
      };
    }
  };
}

// Usage example
const myHandler = withErrorHandling(async (context: HookContext): Promise<HookResult> => {
  // Your hook logic here
  // Errors will be automatically caught and handled
  return { success: true };
});
```

---

## Complete Example: Multi-Hook Workflow

Combining multiple hooks for a complete workflow.

```typescript
import { getHookSystem, getEventBus } from '../../src/core/index.js';
import type { HookContext, HookResult } from '../../src/types/hooks.js';

// 1. Security Check (Priority: 100)
const securityCheck = async (context: HookContext): Promise<HookResult> => {
  // Check for dangerous operations
  return { success: true };
};

// 2. Permission Check (Priority: 90)
const permissionCheck = async (context: HookContext): Promise<HookResult> => {
  // Verify user permissions
  return { success: true };
};

// 3. Parameter Validation (Priority: 80)
const paramValidation = async (context: HookContext): Promise<HookResult> => {
  // Validate and normalize parameters
  return { success: true };
};

// 4. Performance Tracking (Priority: 10)
const performanceStart = async (context: HookContext): Promise<HookResult> => {
  // Start performance tracking
  return { success: true };
};

// 5. Quality Check (Priority: 50)
const qualityCheck = async (context: HookContext): Promise<HookResult> => {
  // Run linters and tests
  return { success: true };
};

// 6. Performance End (Priority: 10)
const performanceEnd = async (context: HookContext): Promise<HookResult> => {
  // End performance tracking
  return { success: true };
};

// Register all hooks
const hookSystem = getHookSystem();

// PreToolUse hooks
hookSystem.register({ name: 'PreToolUse', handler: securityCheck, priority: 100 });
hookSystem.register({ name: 'PreToolUse', handler: permissionCheck, priority: 90 });
hookSystem.register({ name: 'PreToolUse', handler: paramValidation, priority: 80 });
hookSystem.register({ name: 'PreToolUse', handler: performanceStart, priority: 10 });

// PostToolUse hooks
hookSystem.register({ name: 'PostToolUse', handler: qualityCheck, priority: 50 });
hookSystem.register({ name: 'PostToolUse', handler: performanceEnd, priority: 10 });

// Listen to events
const eventBus = getEventBus();

eventBus.on('*', (event) => {
  console.log(`[${event.type}]`, event.payload);
});
```

---

## Related Documentation

- [Getting Started Guide](../guides/getting-started.md)
- [Configuration Examples](./config-examples.md)
- [API Reference](../api/README.md)

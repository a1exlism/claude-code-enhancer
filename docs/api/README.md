# API Reference

Complete API documentation for the Core Framework.

## Table of Contents

- [ConfigManager](#configmanager)
- [EventBus](#eventbus)
- [HookSystem](#hooksystem)
- [Type Definitions](#type-definitions)

---

## ConfigManager

Manages configuration loading, validation, and access.

### Constructor

```typescript
new ConfigManager()
```

Creates a new ConfigManager instance.

### Methods

#### `load(): Config`

Loads configuration from all sources with priority.

**Returns**: `Config` - The loaded and validated configuration

**Throws**: `Error` - If configuration validation fails

**Example**:
```typescript
const configManager = new ConfigManager();
const config = configManager.load();
```

#### `get(): Config`

Gets the current configuration.

**Returns**: `Config` - The current configuration

**Example**:
```typescript
const config = configManager.get();
console.log(config.quality?.enabled);
```

#### `getValue<T>(path: string): T | undefined`

Gets a specific configuration value by path.

**Parameters**:
- `path: string` - Dot-separated path to the value (e.g., `"quality.enabled"`)

**Returns**: `T | undefined` - The value at the path, or undefined if not found

**Example**:
```typescript
const enabled = configManager.getValue<boolean>('quality.enabled');
const linters = configManager.getValue<string[]>('quality.linters');
```

#### `getConfigPath(): string | null`

Gets the path to the loaded configuration file.

**Returns**: `string | null` - The configuration file path, or null if no file was loaded

**Example**:
```typescript
const path = configManager.getConfigPath();
console.log(`Config loaded from: ${path}`);
```

#### `isHookEnabled(hookName: string): boolean`

Checks if a specific hook is enabled.

**Parameters**:
- `hookName: string` - The hook name (e.g., `"PreToolUse"`)

**Returns**: `boolean` - True if enabled, false otherwise (defaults to true)

**Example**:
```typescript
if (configManager.isHookEnabled('PreToolUse')) {
  // Hook is enabled
}
```

#### `getHookTimeout(hookName: string): number`

Gets the timeout for a specific hook in seconds.

**Parameters**:
- `hookName: string` - The hook name

**Returns**: `number` - Timeout in seconds (defaults to 5)

**Example**:
```typescript
const timeout = configManager.getHookTimeout('PreToolUse');
console.log(`Timeout: ${timeout}s`);
```

### Singleton Functions

#### `getConfigManager(): ConfigManager`

Gets or creates the ConfigManager singleton instance.

**Returns**: `ConfigManager` - The singleton instance

**Example**:
```typescript
import { getConfigManager } from './src/core/index.js';

const configManager = getConfigManager();
```

#### `resetConfigManager(): void`

Resets the ConfigManager singleton (primarily for testing).

**Example**:
```typescript
import { resetConfigManager } from './src/core/index.js';

resetConfigManager();
```

---

## EventBus

Provides pub/sub pattern for event-driven communication.

### Constructor

```typescript
new EventBus()
```

Creates a new EventBus instance.

### Methods

#### `emit(event: Event): boolean`

Emits an event to all registered listeners.

**Parameters**:
- `event: Event` - The event to emit

**Returns**: `boolean` - True if event had listeners, false otherwise

**Example**:
```typescript
const success = eventBus.emit({
  type: 'my-event',
  payload: { message: 'Hello' },
  timestamp: Date.now(),
  source: 'my-app',
});
```

#### `on(eventType: string, listener: EventListener): void`

Registers an event listener.

**Parameters**:
- `eventType: string` - The event type to listen for (use `"*"` for all events)
- `listener: EventListener` - The listener function

**Example**:
```typescript
eventBus.on('my-event', (event) => {
  console.log('Event received:', event.payload);
});

// Wildcard listener
eventBus.on('*', (event) => {
  console.log('Any event:', event.type);
});
```

#### `off(eventType: string, listener: EventListener): void`

Unregisters an event listener.

**Parameters**:
- `eventType: string` - The event type
- `listener: EventListener` - The listener function to remove

**Example**:
```typescript
const listener = (event) => console.log(event);
eventBus.on('my-event', listener);
eventBus.off('my-event', listener);
```

#### `once(eventType: string, listener: EventListener): void`

Registers a one-time event listener (auto-removed after first execution).

**Parameters**:
- `eventType: string` - The event type
- `listener: EventListener` - The listener function

**Example**:
```typescript
eventBus.once('session-start', (event) => {
  console.log('Session started once:', event);
});
```

#### `removeAllListeners(eventType?: string): void`

Removes all listeners for a specific event type, or all listeners if no type provided.

**Parameters**:
- `eventType?: string` - Optional event type to remove listeners for

**Example**:
```typescript
// Remove all listeners for specific event
eventBus.removeAllListeners('my-event');

// Remove all listeners
eventBus.removeAllListeners();
```

#### `listenerCount(eventType: string): number`

Gets the number of listeners for a specific event type.

**Parameters**:
- `eventType: string` - The event type

**Returns**: `number` - The number of listeners

**Example**:
```typescript
const count = eventBus.listenerCount('my-event');
console.log(`Listeners: ${count}`);
```

#### `eventNames(): string[]`

Gets all event types that have listeners.

**Returns**: `string[]` - Array of event type names

**Example**:
```typescript
const names = eventBus.eventNames();
console.log('Events with listeners:', names);
```

#### `hasListeners(eventType: string): boolean`

Checks if there are any listeners for a specific event type.

**Parameters**:
- `eventType: string` - The event type

**Returns**: `boolean` - True if there are listeners, false otherwise

**Example**:
```typescript
if (eventBus.hasListeners('my-event')) {
  // Has listeners
}
```

### Singleton Functions

#### `getEventBus(): EventBus`

Gets or creates the EventBus singleton instance.

**Returns**: `EventBus` - The singleton instance

**Example**:
```typescript
import { getEventBus } from './src/core/index.js';

const eventBus = getEventBus();
```

#### `resetEventBus(): void`

Resets the EventBus singleton (primarily for testing).

**Example**:
```typescript
import { resetEventBus } from './src/core/index.js';

resetEventBus();
```

---

## HookSystem

Manages hook registration, triggering, and execution.

### Constructor

```typescript
new HookSystem()
```

Creates a new HookSystem instance.

### Methods

#### `register(definition: HookDefinition): void`

Registers a hook.

**Parameters**:
- `definition: HookDefinition` - The hook definition

**Example**:
```typescript
hookSystem.register({
  name: 'PreToolUse',
  handler: async (context) => {
    // Hook logic
    return { success: true };
  },
  priority: 100,
  timeout: 5,
  matcher: 'Write|Edit',
});
```

#### `unregister(name: HookEventName, handler: HookHandler): void`

Unregisters a hook.

**Parameters**:
- `name: HookEventName` - The hook event name
- `handler: HookHandler` - The handler function to remove

**Example**:
```typescript
const handler = async (context) => ({ success: true });
hookSystem.register({ name: 'PreToolUse', handler });
hookSystem.unregister('PreToolUse', handler);
```

#### `trigger(event: HookEvent): Promise<HookResult[]>`

Triggers a hook event and executes all registered hooks.

**Parameters**:
- `event: HookEvent` - The hook event to trigger

**Returns**: `Promise<HookResult[]>` - Array of results from all executed hooks

**Example**:
```typescript
const results = await hookSystem.trigger({
  name: 'PreToolUse',
  timestamp: Date.now(),
  source: 'cli',
  payload: { tool: 'Write', path: '/path/to/file.ts' },
});

for (const result of results) {
  if (!result.success) {
    console.error('Hook failed:', result.error);
  }
}
```

#### `getRegisteredHooks(): HookEventName[]`

Gets all registered hook names.

**Returns**: `HookEventName[]` - Array of hook event names

**Example**:
```typescript
const hooks = hookSystem.getRegisteredHooks();
console.log('Registered hooks:', hooks);
```

#### `getHookCount(name: HookEventName): number`

Gets the number of hooks registered for a specific event.

**Parameters**:
- `name: HookEventName` - The hook event name

**Returns**: `number` - The number of registered hooks

**Example**:
```typescript
const count = hookSystem.getHookCount('PreToolUse');
console.log(`PreToolUse hooks: ${count}`);
```

#### `hasHook(name: HookEventName): boolean`

Checks if a hook is registered for a specific event.

**Parameters**:
- `name: HookEventName` - The hook event name

**Returns**: `boolean` - True if hooks are registered, false otherwise

**Example**:
```typescript
if (hookSystem.hasHook('PreToolUse')) {
  // Hooks are registered
}
```

#### `clear(): void`

Clears all registered hooks.

**Example**:
```typescript
hookSystem.clear();
```

#### `clearHooks(name: HookEventName): void`

Clears hooks for a specific event.

**Parameters**:
- `name: HookEventName` - The hook event name

**Example**:
```typescript
hookSystem.clearHooks('PreToolUse');
```

### Singleton Functions

#### `getHookSystem(): HookSystem`

Gets or creates the HookSystem singleton instance.

**Returns**: `HookSystem` - The singleton instance

**Example**:
```typescript
import { getHookSystem } from './src/core/index.js';

const hookSystem = getHookSystem();
```

#### `resetHookSystem(): void`

Resets the HookSystem singleton (primarily for testing).

**Example**:
```typescript
import { resetHookSystem } from './src/core/index.js';

resetHookSystem();
```

---

## Type Definitions

### Config Types

#### `Config`

Root configuration object.

```typescript
interface Config {
  hooks?: Record<string, HookConfig>;
  notify?: NotifyConfig;
  quality?: QualityConfig;
}
```

#### `HookConfig`

Hook-specific configuration.

```typescript
interface HookConfig {
  enabled: boolean;      // Default: true
  timeout: number;       // Default: 5 (seconds, min: 1, max: 60)
  matcher?: string;      // Optional regex pattern
  options?: Record<string, unknown>; // Optional hook-specific options
}
```

#### `QualityConfig`

Quality check configuration.

```typescript
interface QualityConfig {
  enabled: boolean;      // Default: true
  linters: string[];     // Default: ['tsc', 'eslint']
  autoFix: boolean;      // Default: false
}
```

#### `NotifyConfig`

Notification configuration.

```typescript
interface NotifyConfig {
  channels: {
    telegram?: TelegramConfig;
    discord?: DiscordConfig;
    email?: EmailConfig;
  };
  filters?: {
    rules: string[];     // Default: []
    aiEnabled: boolean;  // Default: false
  };
}
```

### Hook Types

#### `HookEventName`

Supported hook event names.

```typescript
type HookEventName =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'SessionStart'
  | 'SessionEnd'
  | 'Stop'
  | 'Notification'
  | 'PreCompact';
```

#### `HookDefinition`

Hook registration definition.

```typescript
interface HookDefinition {
  name: HookEventName;
  handler: HookHandler;
  matcher?: string;      // Optional regex pattern
  timeout?: number;      // Optional timeout in seconds (default: 5)
  priority?: number;     // Optional priority (default: 0, higher = earlier)
}
```

#### `HookHandler`

Hook handler function signature.

```typescript
type HookHandler = (context: HookContext) => Promise<HookResult>;
```

#### `HookContext`

Context provided to hook handlers.

```typescript
interface HookContext {
  event: HookEvent;
  payload: unknown;
  config: HookConfigOptions;
  services: HookServices;
}
```

#### `HookServices`

Services injected into hook context.

```typescript
interface HookServices {
  eventBus: EventBus;
  configManager: ConfigManager;
  logger: {
    debug: (message: string) => void;
    info: (message: string) => void;
    error: (message: string, error?: Error) => void;
  };
}
```

#### `HookEvent`

Hook event structure.

```typescript
interface HookEvent {
  name: HookEventName;
  timestamp: number;
  source: string;
  payload?: unknown;
}
```

#### `HookResult`

Hook execution result.

```typescript
interface HookResult {
  success: boolean;
  data?: unknown;
  error?: Error | string;
}
```

### Event Types

#### `Event`

Event structure for the event bus.

```typescript
interface Event {
  type: string;
  payload: unknown;
  timestamp: number;
  source: string;
}
```

#### `EventListener`

Event listener function signature.

```typescript
type EventListener = (event: Event) => Promise<void> | void;
```

#### `EventEmitter`

Event emitter interface.

```typescript
interface EventEmitter {
  emit(event: Event): boolean;
  on(eventType: string, listener: EventListener): void;
  off(eventType: string, listener: EventListener): void;
  once(eventType: string, listener: EventListener): void;
}
```

---

## Usage Examples

### Complete Workflow Example

```typescript
import {
  getConfigManager,
  getEventBus,
  getHookSystem,
} from './src/core/index.js';
import type { HookContext, HookResult } from './src/types/hooks.js';

// 1. Initialize framework
const configManager = getConfigManager();
configManager.load();

const eventBus = getEventBus();
const hookSystem = getHookSystem();

// 2. Register event listeners
eventBus.on('*', (event) => {
  console.log(`[${event.type}]`, event.payload);
});

// 3. Register hooks
hookSystem.register({
  name: 'PreToolUse',
  handler: async (context: HookContext): Promise<HookResult> => {
    const { payload, services } = context;

    services.logger.info('PreToolUse hook triggered');

    // Your logic here

    return { success: true };
  },
  priority: 100,
  timeout: 5,
});

// 4. Trigger hooks
const results = await hookSystem.trigger({
  name: 'PreToolUse',
  timestamp: Date.now(),
  source: 'app',
  payload: { tool: 'Write' },
});

// 5. Handle results
for (const result of results) {
  if (!result.success) {
    console.error('Hook failed:', result.error);
  }
}
```

---

## Related Documentation

- [Getting Started Guide](../guides/getting-started.md)
- [Configuration Examples](../examples/config-examples.md)
- [Hook Examples](../examples/hook-examples.md)

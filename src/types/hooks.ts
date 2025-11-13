/**
 * Hook event names supported by the system
 */
export type HookEventName =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'SessionStart'
  | 'SessionEnd'
  | 'Stop'
  | 'Notification'
  | 'PreCompact';

/**
 * Hook execution result
 */
export interface HookResult {
  /** Whether the hook execution was successful */
  success: boolean;
  /** Optional data returned by the hook */
  data?: unknown;
  /** Error information if the hook failed */
  error?: Error | string;
}

/**
 * Hook context provided to hook handlers
 * Contains all necessary information for hook execution
 */
export interface HookContext {
  /** The hook event that triggered this execution */
  event: HookEvent;
  /** Event payload data */
  payload: unknown;
  /** Hook configuration options */
  config: HookConfigOptions;
  /** Injected services */
  services: HookServices;
}

/**
 * Services injected into hook context
 */
export interface HookServices {
  /** Event bus for emitting events */
  eventBus: unknown; // Will be typed properly when EventBus is implemented
  /** Configuration manager */
  configManager: unknown; // Will be typed properly when ConfigManager is implemented
  /** Logger instance */
  logger: {
    debug: (message: string) => void;
    info: (message: string) => void;
    error: (message: string, error?: Error) => void;
  };
}

/**
 * Hook event structure
 */
export interface HookEvent {
  /** Event name */
  name: HookEventName;
  /** Event timestamp */
  timestamp: number;
  /** Event source (e.g., 'claude-code', 'user') */
  source: string;
  /** Event-specific payload */
  payload?: unknown;
}

/**
 * Hook handler function signature
 * Receives context and returns a promise of the result
 */
export type HookHandler = (context: HookContext) => Promise<HookResult>;

/**
 * Hook definition for registration
 */
export interface HookDefinition {
  /** Hook event name */
  name: HookEventName;
  /** Optional matcher pattern for filtering events */
  matcher?: string;
  /** Hook handler function */
  handler: HookHandler;
  /** Timeout in seconds (default: 5) */
  timeout?: number;
  /** Execution priority (higher = earlier, default: 0) */
  priority?: number;
}

/**
 * Hook configuration options
 */
export interface HookConfigOptions {
  /** Whether the hook is enabled */
  enabled?: boolean;
  /** Timeout in seconds */
  timeout?: number;
  /** Matcher pattern */
  matcher?: string;
  /** Hook-specific options */
  options?: Record<string, unknown>;
}

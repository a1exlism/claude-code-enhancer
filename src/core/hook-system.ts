import type {
  HookEventName,
  HookDefinition,
  HookHandler,
  HookContext,
  HookResult,
  HookEvent,
  HookServices,
} from '../types/hooks.js';
import { getConfigManager } from './config-manager.js';
import { getEventBus } from './event-bus.js';
import * as logger from '../utils/logger.js';

/**
 * Hook registration entry with priority
 */
interface HookEntry {
  name: HookEventName;
  handler: HookHandler;
  matcher?: string;
  timeout: number;
  priority: number;
}

/**
 * Hook System Implementation
 * Manages hook registration, triggering, and execution
 */
export class HookSystem {
  private hooks: Map<HookEventName, HookEntry[]>;
  private services: HookServices;

  constructor() {
    this.hooks = new Map();
    this.services = this.createServices();
  }

  /**
   * Create services for hook context
   */
  private createServices(): HookServices {
    return {
      eventBus: getEventBus(),
      configManager: getConfigManager(),
      logger: {
        debug: (message: string) => logger.debug(message),
        info: (message: string) => logger.info(message),
        error: (message: string, error?: Error) => logger.error(message, error),
      },
    };
  }

  /**
   * Register a hook
   */
  register(definition: HookDefinition): void {
    const { name, handler, matcher, timeout = 5, priority = 0 } = definition;

    // Check if hook is enabled in config
    const configManager = getConfigManager();
    if (!configManager.isHookEnabled(name)) {
      logger.debug(`Hook ${name} is disabled in configuration`);
      return;
    }

    // Get timeout from config if not specified
    const effectiveTimeout = timeout || configManager.getHookTimeout(name);

    const entry: HookEntry = {
      name,
      handler,
      matcher,
      timeout: effectiveTimeout,
      priority,
    };

    if (!this.hooks.has(name)) {
      this.hooks.set(name, []);
    }

    this.hooks.get(name)!.push(entry);

    // Sort by priority (higher priority first)
    this.hooks.get(name)!.sort((a, b) => b.priority - a.priority);

    logger.info(`Registered hook: ${name} (priority: ${priority})`);
  }

  /**
   * Unregister a hook
   */
  unregister(name: HookEventName, handler: HookHandler): void {
    const entries = this.hooks.get(name);
    if (!entries) {
      return;
    }

    const index = entries.findIndex((entry) => entry.handler === handler);
    if (index !== -1) {
      entries.splice(index, 1);
      logger.info(`Unregistered hook: ${name}`);

      // Clean up empty arrays
      if (entries.length === 0) {
        this.hooks.delete(name);
      }
    }
  }

  /**
   * Trigger a hook event
   * Returns array of results from all executed hooks
   */
  async trigger(event: HookEvent): Promise<HookResult[]> {
    const { name, payload } = event;

    logger.debug(`Triggering hook: ${name}`);

    const entries = this.hooks.get(name);
    if (!entries || entries.length === 0) {
      logger.debug(`No hooks registered for: ${name}`);
      return [];
    }

    // Filter hooks by matcher
    const matchedEntries = this.filterByMatcher(entries, event);

    if (matchedEntries.length === 0) {
      logger.debug(`No hooks matched for: ${name}`);
      return [];
    }

    // Execute hooks in priority order
    const results: HookResult[] = [];

    for (const entry of matchedEntries) {
      try {
        const result = await this.executeHook(entry, event);
        results.push(result);

        // Stop execution if hook failed and is critical
        if (!result.success && entry.priority >= 100) {
          logger.error(`Critical hook failed: ${name}`, result.error as Error);
          break;
        }
      } catch (error) {
        logger.error(`Hook execution error: ${name}`, error as Error);
        results.push({
          success: false,
          error: error as Error,
        });
      }
    }

    // Emit hook event to event bus
    const eventBus = getEventBus();
    eventBus.emit({
      type: `hook:${name}`,
      payload: { event, results },
      timestamp: Date.now(),
      source: 'hook-system',
    });

    return results;
  }

  /**
   * Execute a single hook with timeout
   */
  private async executeHook(
    entry: HookEntry,
    event: HookEvent
  ): Promise<HookResult> {
    const { handler, timeout, name } = entry;

    const context: HookContext = {
      event,
      payload: event.payload,
      config: this.getHookConfig(name),
      services: this.services,
    };

    try {
      // Execute with timeout
      const result = await this.withTimeout(
        handler(context),
        timeout * 1000,
        `Hook ${name} timed out after ${timeout}s`
      );

      logger.debug(`Hook ${name} executed successfully`);
      return result;
    } catch (error) {
      logger.error(`Hook ${name} execution failed`, error as Error);
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * Execute promise with timeout
   */
  private withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      ),
    ]);
  }

  /**
   * Filter hooks by matcher pattern
   */
  private filterByMatcher(
    entries: HookEntry[],
    event: HookEvent
  ): HookEntry[] {
    return entries.filter((entry) => {
      if (!entry.matcher) {
        return true; // No matcher means match all
      }

      try {
        const regex = new RegExp(entry.matcher);
        const matchString = this.getMatchString(event);
        return regex.test(matchString);
      } catch (error) {
        logger.error(
          `Invalid matcher pattern: ${entry.matcher}`,
          error as Error
        );
        return false;
      }
    });
  }

  /**
   * Get match string from event for matcher testing
   */
  private getMatchString(event: HookEvent): string {
    // For tool-related events, match against tool name
    if (event.payload && typeof event.payload === 'object') {
      const payload = event.payload as any;
      if (payload.tool || payload.toolName) {
        return payload.tool || payload.toolName;
      }
    }

    // Default to event name
    return event.name;
  }

  /**
   * Get hook configuration from ConfigManager
   */
  private getHookConfig(name: HookEventName) {
    const configManager = getConfigManager();
    const hookConfig = configManager.getValue(`hooks.${name}`);

    return {
      enabled: hookConfig?.enabled ?? true,
      timeout: hookConfig?.timeout ?? 5,
      matcher: hookConfig?.matcher,
      options: hookConfig?.options ?? {},
    };
  }

  /**
   * Get all registered hook names
   */
  getRegisteredHooks(): HookEventName[] {
    return Array.from(this.hooks.keys());
  }

  /**
   * Get hook count for a specific event
   */
  getHookCount(name: HookEventName): number {
    return this.hooks.get(name)?.length ?? 0;
  }

  /**
   * Check if a hook is registered
   */
  hasHook(name: HookEventName): boolean {
    return this.getHookCount(name) > 0;
  }

  /**
   * Clear all hooks
   */
  clear(): void {
    this.hooks.clear();
    logger.info('Cleared all hooks');
  }

  /**
   * Clear hooks for a specific event
   */
  clearHooks(name: HookEventName): void {
    this.hooks.delete(name);
    logger.info(`Cleared hooks for: ${name}`);
  }
}

/**
 * Singleton instance
 */
let instance: HookSystem | null = null;

/**
 * Get or create HookSystem singleton instance
 */
export function getHookSystem(): HookSystem {
  if (!instance) {
    instance = new HookSystem();
  }
  return instance;
}

/**
 * Reset HookSystem singleton (for testing)
 */
export function resetHookSystem(): void {
  instance = null;
}

import type { Event, EventListener, EventEmitter } from '../types/events.js';
import * as logger from '../utils/logger.js';

/**
 * Event Bus Implementation
 * Provides pub/sub pattern for event-driven communication
 */
export class EventBus implements EventEmitter {
  private listeners: Map<string, Set<EventListener>>;
  private onceListeners: Map<string, Set<EventListener>>;

  constructor() {
    this.listeners = new Map();
    this.onceListeners = new Map();
  }

  /**
   * Emit an event to all registered listeners
   * Returns true if event had listeners, false otherwise
   */
  emit(event: Event): boolean {
    logger.debug(`Emitting event: ${event.type}`);

    const eventListeners = this.listeners.get(event.type);
    const onceListeners = this.onceListeners.get(event.type);
    const wildcardListeners = this.listeners.get('*');

    const hasListeners =
      (eventListeners && eventListeners.size > 0) ||
      (onceListeners && onceListeners.size > 0) ||
      (wildcardListeners && wildcardListeners.size > 0);

    if (!hasListeners) {
      logger.debug(`No listeners for event: ${event.type}`);
      return false;
    }

    // Execute regular listeners
    if (eventListeners) {
      this.executeListeners(eventListeners, event);
    }

    // Execute wildcard listeners
    if (wildcardListeners) {
      this.executeListeners(wildcardListeners, event);
    }

    // Execute once listeners and remove them
    if (onceListeners && onceListeners.size > 0) {
      this.executeListeners(onceListeners, event);
      this.onceListeners.delete(event.type);
    }

    return true;
  }

  /**
   * Register an event listener
   */
  on(eventType: string, listener: EventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    this.listeners.get(eventType)!.add(listener);
    logger.debug(`Registered listener for event: ${eventType}`);
  }

  /**
   * Unregister an event listener
   */
  off(eventType: string, listener: EventListener): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.delete(listener);
      logger.debug(`Unregistered listener for event: ${eventType}`);

      // Clean up empty listener sets
      if (eventListeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }

    // Also check once listeners
    const onceListeners = this.onceListeners.get(eventType);
    if (onceListeners) {
      onceListeners.delete(listener);

      if (onceListeners.size === 0) {
        this.onceListeners.delete(eventType);
      }
    }
  }

  /**
   * Register a one-time event listener
   * The listener will be automatically removed after first execution
   */
  once(eventType: string, listener: EventListener): void {
    if (!this.onceListeners.has(eventType)) {
      this.onceListeners.set(eventType, new Set());
    }

    this.onceListeners.get(eventType)!.add(listener);
    logger.debug(`Registered one-time listener for event: ${eventType}`);
  }

  /**
   * Execute a set of listeners with error isolation
   */
  private executeListeners(listeners: Set<EventListener>, event: Event): void {
    for (const listener of listeners) {
      try {
        const result = listener(event);

        // Handle async listeners
        if (result instanceof Promise) {
          result.catch((error) => {
            logger.error(
              `Async listener error for event ${event.type}`,
              error
            );
          });
        }
      } catch (error) {
        logger.error(
          `Listener error for event ${event.type}`,
          error as Error
        );
      }
    }
  }

  /**
   * Remove all listeners for a specific event type
   * If no event type is provided, removes all listeners
   */
  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.listeners.delete(eventType);
      this.onceListeners.delete(eventType);
      logger.debug(`Removed all listeners for event: ${eventType}`);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
      logger.debug('Removed all listeners');
    }
  }

  /**
   * Get the number of listeners for a specific event type
   */
  listenerCount(eventType: string): number {
    const regularCount = this.listeners.get(eventType)?.size ?? 0;
    const onceCount = this.onceListeners.get(eventType)?.size ?? 0;
    return regularCount + onceCount;
  }

  /**
   * Get all event types that have listeners
   */
  eventNames(): string[] {
    const names = new Set<string>();

    for (const eventType of this.listeners.keys()) {
      names.add(eventType);
    }

    for (const eventType of this.onceListeners.keys()) {
      names.add(eventType);
    }

    return Array.from(names);
  }

  /**
   * Check if there are any listeners for a specific event type
   */
  hasListeners(eventType: string): boolean {
    return this.listenerCount(eventType) > 0;
  }
}

/**
 * Singleton instance
 */
let instance: EventBus | null = null;

/**
 * Get or create EventBus singleton instance
 */
export function getEventBus(): EventBus {
  if (!instance) {
    instance = new EventBus();
  }
  return instance;
}

/**
 * Reset EventBus singleton (for testing)
 */
export function resetEventBus(): void {
  instance = null;
}

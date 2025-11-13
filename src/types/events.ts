/**
 * Event structure for the event bus
 */
export interface Event {
  /** Event type/name */
  type: string;
  /** Event payload data */
  payload: unknown;
  /** Event timestamp (milliseconds since epoch) */
  timestamp: number;
  /** Event source identifier */
  source: string;
}

/**
 * Event listener function signature
 * Can be synchronous or asynchronous
 */
export type EventListener = (event: Event) => Promise<void> | void;

/**
 * Event emitter interface
 */
export interface EventEmitter {
  /** Emit an event */
  emit(event: Event): boolean;
  /** Register an event listener */
  on(eventType: string, listener: EventListener): void;
  /** Unregister an event listener */
  off(eventType: string, listener: EventListener): void;
  /** Register a one-time event listener */
  once(eventType: string, listener: EventListener): void;
}

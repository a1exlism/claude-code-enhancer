import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus, getEventBus, resetEventBus } from '../../src/core/event-bus.js';
import type { Event } from '../../src/types/events.js';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    resetEventBus();
  });

  describe('Basic Event Emission', () => {
    it('should emit events to registered listeners', () => {
      const listener = vi.fn();
      const event: Event = {
        type: 'test-event',
        payload: { message: 'hello' },
        timestamp: Date.now(),
        source: 'test',
      };

      eventBus.on('test-event', listener);
      const result = eventBus.emit(event);

      expect(result).toBe(true);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(event);
    });

    it('should return false when no listeners are registered', () => {
      const event: Event = {
        type: 'test-event',
        payload: {},
        timestamp: Date.now(),
        source: 'test',
      };

      const result = eventBus.emit(event);

      expect(result).toBe(false);
    });

    it('should emit events to multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();
      const event: Event = {
        type: 'test-event',
        payload: {},
        timestamp: Date.now(),
        source: 'test',
      };

      eventBus.on('test-event', listener1);
      eventBus.on('test-event', listener2);
      eventBus.on('test-event', listener3);

      eventBus.emit(event);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Listener Registration', () => {
    it('should register listeners with on()', () => {
      const listener = vi.fn();

      eventBus.on('test-event', listener);

      expect(eventBus.hasListeners('test-event')).toBe(true);
      expect(eventBus.listenerCount('test-event')).toBe(1);
    });

    it('should register multiple listeners for the same event', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      eventBus.on('test-event', listener1);
      eventBus.on('test-event', listener2);

      expect(eventBus.listenerCount('test-event')).toBe(2);
    });

    it('should not register the same listener twice', () => {
      const listener = vi.fn();

      eventBus.on('test-event', listener);
      eventBus.on('test-event', listener);

      expect(eventBus.listenerCount('test-event')).toBe(1);
    });
  });

  describe('Event Listener Removal', () => {
    it('should remove listeners with off()', () => {
      const listener = vi.fn();

      eventBus.on('test-event', listener);
      expect(eventBus.hasListeners('test-event')).toBe(true);

      eventBus.off('test-event', listener);
      expect(eventBus.hasListeners('test-event')).toBe(false);
    });

    it('should only remove the specified listener', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      eventBus.on('test-event', listener1);
      eventBus.on('test-event', listener2);

      eventBus.off('test-event', listener1);

      expect(eventBus.listenerCount('test-event')).toBe(1);

      const event: Event = {
        type: 'test-event',
        payload: {},
        timestamp: Date.now(),
        source: 'test',
      };

      eventBus.emit(event);

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should handle removing non-existent listeners gracefully', () => {
      const listener = vi.fn();

      expect(() => {
        eventBus.off('test-event', listener);
      }).not.toThrow();
    });
  });

  describe('One-Time Listeners', () => {
    it('should execute once listeners only once', () => {
      const listener = vi.fn();
      const event: Event = {
        type: 'test-event',
        payload: {},
        timestamp: Date.now(),
        source: 'test',
      };

      eventBus.once('test-event', listener);

      eventBus.emit(event);
      expect(listener).toHaveBeenCalledTimes(1);

      eventBus.emit(event);
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('should remove once listeners after execution', () => {
      const listener = vi.fn();

      eventBus.once('test-event', listener);
      expect(eventBus.listenerCount('test-event')).toBe(1);

      const event: Event = {
        type: 'test-event',
        payload: {},
        timestamp: Date.now(),
        source: 'test',
      };

      eventBus.emit(event);
      expect(eventBus.listenerCount('test-event')).toBe(0);
    });

    it('should support multiple once listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const event: Event = {
        type: 'test-event',
        payload: {},
        timestamp: Date.now(),
        source: 'test',
      };

      eventBus.once('test-event', listener1);
      eventBus.once('test-event', listener2);

      eventBus.emit(event);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);

      eventBus.emit(event);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Wildcard Listeners', () => {
    it('should emit to wildcard listeners for any event', () => {
      const wildcardListener = vi.fn();
      const event1: Event = {
        type: 'event-1',
        payload: {},
        timestamp: Date.now(),
        source: 'test',
      };
      const event2: Event = {
        type: 'event-2',
        payload: {},
        timestamp: Date.now(),
        source: 'test',
      };

      eventBus.on('*', wildcardListener);

      eventBus.emit(event1);
      eventBus.emit(event2);

      expect(wildcardListener).toHaveBeenCalledTimes(2);
      expect(wildcardListener).toHaveBeenCalledWith(event1);
      expect(wildcardListener).toHaveBeenCalledWith(event2);
    });

    it('should emit to both specific and wildcard listeners', () => {
      const specificListener = vi.fn();
      const wildcardListener = vi.fn();
      const event: Event = {
        type: 'test-event',
        payload: {},
        timestamp: Date.now(),
        source: 'test',
      };

      eventBus.on('test-event', specificListener);
      eventBus.on('*', wildcardListener);

      eventBus.emit(event);

      expect(specificListener).toHaveBeenCalledTimes(1);
      expect(wildcardListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Async Listeners', () => {
    it('should handle async listeners', async () => {
      const asyncListener = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      const event: Event = {
        type: 'test-event',
        payload: {},
        timestamp: Date.now(),
        source: 'test',
      };

      eventBus.on('test-event', asyncListener);
      eventBus.emit(event);

      expect(asyncListener).toHaveBeenCalledTimes(1);

      // Wait for async listener to complete
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    it('should isolate async listener errors', async () => {
      const errorListener = vi.fn(async () => {
        throw new Error('Async error');
      });
      const normalListener = vi.fn();

      const event: Event = {
        type: 'test-event',
        payload: {},
        timestamp: Date.now(),
        source: 'test',
      };

      eventBus.on('test-event', errorListener);
      eventBus.on('test-event', normalListener);

      expect(() => {
        eventBus.emit(event);
      }).not.toThrow();

      expect(errorListener).toHaveBeenCalledTimes(1);
      expect(normalListener).toHaveBeenCalledTimes(1);

      // Wait for async error to be caught
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  });

  describe('Error Handling', () => {
    it('should isolate listener errors', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();

      const event: Event = {
        type: 'test-event',
        payload: {},
        timestamp: Date.now(),
        source: 'test',
      };

      eventBus.on('test-event', errorListener);
      eventBus.on('test-event', normalListener);

      expect(() => {
        eventBus.emit(event);
      }).not.toThrow();

      expect(errorListener).toHaveBeenCalledTimes(1);
      expect(normalListener).toHaveBeenCalledTimes(1);
    });

    it('should continue executing other listeners after error', () => {
      const listener1 = vi.fn(() => {
        throw new Error('Error 1');
      });
      const listener2 = vi.fn();
      const listener3 = vi.fn(() => {
        throw new Error('Error 3');
      });
      const listener4 = vi.fn();

      const event: Event = {
        type: 'test-event',
        payload: {},
        timestamp: Date.now(),
        source: 'test',
      };

      eventBus.on('test-event', listener1);
      eventBus.on('test-event', listener2);
      eventBus.on('test-event', listener3);
      eventBus.on('test-event', listener4);

      eventBus.emit(event);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);
      expect(listener4).toHaveBeenCalledTimes(1);
    });
  });

  describe('Utility Methods', () => {
    it('should return correct listener count', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      eventBus.on('test-event', listener1);
      eventBus.on('test-event', listener2);
      eventBus.once('test-event', listener3);

      expect(eventBus.listenerCount('test-event')).toBe(3);
    });

    it('should return all event names', () => {
      eventBus.on('event-1', vi.fn());
      eventBus.on('event-2', vi.fn());
      eventBus.once('event-3', vi.fn());

      const names = eventBus.eventNames();

      expect(names).toContain('event-1');
      expect(names).toContain('event-2');
      expect(names).toContain('event-3');
      expect(names.length).toBe(3);
    });

    it('should check if event has listeners', () => {
      eventBus.on('test-event', vi.fn());

      expect(eventBus.hasListeners('test-event')).toBe(true);
      expect(eventBus.hasListeners('other-event')).toBe(false);
    });

    it('should remove all listeners for specific event', () => {
      eventBus.on('event-1', vi.fn());
      eventBus.on('event-1', vi.fn());
      eventBus.on('event-2', vi.fn());

      eventBus.removeAllListeners('event-1');

      expect(eventBus.hasListeners('event-1')).toBe(false);
      expect(eventBus.hasListeners('event-2')).toBe(true);
    });

    it('should remove all listeners when no event type specified', () => {
      eventBus.on('event-1', vi.fn());
      eventBus.on('event-2', vi.fn());
      eventBus.once('event-3', vi.fn());

      eventBus.removeAllListeners();

      expect(eventBus.eventNames().length).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = getEventBus();
      const instance2 = getEventBus();

      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', () => {
      const instance1 = getEventBus();
      resetEventBus();
      const instance2 = getEventBus();

      expect(instance1).not.toBe(instance2);
    });

    it('should maintain state across singleton calls', () => {
      const bus1 = getEventBus();
      bus1.on('test-event', vi.fn());

      const bus2 = getEventBus();

      expect(bus2.hasListeners('test-event')).toBe(true);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle mixed listener types', () => {
      const regularListener = vi.fn();
      const onceListener = vi.fn();
      const wildcardListener = vi.fn();

      const event: Event = {
        type: 'test-event',
        payload: {},
        timestamp: Date.now(),
        source: 'test',
      };

      eventBus.on('test-event', regularListener);
      eventBus.once('test-event', onceListener);
      eventBus.on('*', wildcardListener);

      // First emit
      eventBus.emit(event);

      expect(regularListener).toHaveBeenCalledTimes(1);
      expect(onceListener).toHaveBeenCalledTimes(1);
      expect(wildcardListener).toHaveBeenCalledTimes(1);

      // Second emit
      eventBus.emit(event);

      expect(regularListener).toHaveBeenCalledTimes(2);
      expect(onceListener).toHaveBeenCalledTimes(1); // Still 1
      expect(wildcardListener).toHaveBeenCalledTimes(2);
    });

    it('should handle listener removal during emission', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn(() => {
        eventBus.off('test-event', listener1);
      });

      const event: Event = {
        type: 'test-event',
        payload: {},
        timestamp: Date.now(),
        source: 'test',
      };

      eventBus.on('test-event', listener1);
      eventBus.on('test-event', listener2);

      eventBus.emit(event);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);

      // Second emit - listener1 should not be called
      eventBus.emit(event);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(2);
    });
  });
});

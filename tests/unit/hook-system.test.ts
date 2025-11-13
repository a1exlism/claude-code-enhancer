import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HookSystem, getHookSystem, resetHookSystem } from '../../src/core/hook-system.js';
import { resetConfigManager } from '../../src/core/config-manager.js';
import { resetEventBus } from '../../src/core/event-bus.js';
import type { HookDefinition, HookEvent, HookContext } from '../../src/types/hooks.js';

describe('HookSystem', () => {
  let hookSystem: HookSystem;

  beforeEach(() => {
    hookSystem = new HookSystem();
    resetHookSystem();
    resetConfigManager();
    resetEventBus();
  });

  describe('Hook Registration', () => {
    it('should register a hook', () => {
      const handler = vi.fn(async () => ({ success: true }));
      const definition: HookDefinition = {
        name: 'PreToolUse',
        handler,
      };

      hookSystem.register(definition);

      expect(hookSystem.hasHook('PreToolUse')).toBe(true);
      expect(hookSystem.getHookCount('PreToolUse')).toBe(1);
    });

    it('should register multiple hooks for the same event', () => {
      const handler1 = vi.fn(async () => ({ success: true }));
      const handler2 = vi.fn(async () => ({ success: true }));

      hookSystem.register({ name: 'PreToolUse', handler: handler1 });
      hookSystem.register({ name: 'PreToolUse', handler: handler2 });

      expect(hookSystem.getHookCount('PreToolUse')).toBe(2);
    });

    it('should sort hooks by priority', async () => {
      const executionOrder: number[] = [];

      const handler1 = vi.fn(async () => {
        executionOrder.push(1);
        return { success: true };
      });

      const handler2 = vi.fn(async () => {
        executionOrder.push(2);
        return { success: true };
      });

      const handler3 = vi.fn(async () => {
        executionOrder.push(3);
        return { success: true };
      });

      // Register with different priorities
      hookSystem.register({ name: 'PreToolUse', handler: handler1, priority: 10 });
      hookSystem.register({ name: 'PreToolUse', handler: handler2, priority: 50 });
      hookSystem.register({ name: 'PreToolUse', handler: handler3, priority: 30 });

      const event: HookEvent = {
        name: 'PreToolUse',
        timestamp: Date.now(),
        source: 'test',
        payload: {},
      };

      await hookSystem.trigger(event);

      // Should execute in priority order: 50, 30, 10
      expect(executionOrder).toEqual([2, 3, 1]);
    });
  });

  describe('Hook Unregistration', () => {
    it('should unregister a hook', () => {
      const handler = vi.fn(async () => ({ success: true }));

      hookSystem.register({ name: 'PreToolUse', handler });
      expect(hookSystem.hasHook('PreToolUse')).toBe(true);

      hookSystem.unregister('PreToolUse', handler);
      expect(hookSystem.hasHook('PreToolUse')).toBe(false);
    });

    it('should only unregister the specified handler', () => {
      const handler1 = vi.fn(async () => ({ success: true }));
      const handler2 = vi.fn(async () => ({ success: true }));

      hookSystem.register({ name: 'PreToolUse', handler: handler1 });
      hookSystem.register({ name: 'PreToolUse', handler: handler2 });

      hookSystem.unregister('PreToolUse', handler1);

      expect(hookSystem.getHookCount('PreToolUse')).toBe(1);
    });

    it('should handle unregistering non-existent hooks gracefully', () => {
      const handler = vi.fn(async () => ({ success: true }));

      expect(() => {
        hookSystem.unregister('PreToolUse', handler);
      }).not.toThrow();
    });
  });

  describe('Hook Triggering', () => {
    it('should trigger registered hooks', async () => {
      const handler = vi.fn(async () => ({ success: true }));

      hookSystem.register({ name: 'PreToolUse', handler });

      const event: HookEvent = {
        name: 'PreToolUse',
        timestamp: Date.now(),
        source: 'test',
        payload: { tool: 'Write' },
      };

      const results = await hookSystem.trigger(event);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it('should pass correct context to handler', async () => {
      let receivedContext: HookContext | null = null;

      const handler = vi.fn(async (context: HookContext) => {
        receivedContext = context;
        return { success: true };
      });

      hookSystem.register({ name: 'PreToolUse', handler });

      const event: HookEvent = {
        name: 'PreToolUse',
        timestamp: Date.now(),
        source: 'test',
        payload: { tool: 'Write' },
      };

      await hookSystem.trigger(event);

      expect(receivedContext).not.toBeNull();
      expect(receivedContext?.event).toEqual(event);
      expect(receivedContext?.payload).toEqual(event.payload);
      expect(receivedContext?.config).toBeDefined();
      expect(receivedContext?.services).toBeDefined();
    });

    it('should return empty array when no hooks registered', async () => {
      const event: HookEvent = {
        name: 'PreToolUse',
        timestamp: Date.now(),
        source: 'test',
        payload: {},
      };

      const results = await hookSystem.trigger(event);

      expect(results).toEqual([]);
    });

    it('should execute multiple hooks in order', async () => {
      const handler1 = vi.fn(async () => ({ success: true, data: 'result1' }));
      const handler2 = vi.fn(async () => ({ success: true, data: 'result2' }));

      hookSystem.register({ name: 'PreToolUse', handler: handler1, priority: 10 });
      hookSystem.register({ name: 'PreToolUse', handler: handler2, priority: 5 });

      const event: HookEvent = {
        name: 'PreToolUse',
        timestamp: Date.now(),
        source: 'test',
        payload: {},
      };

      const results = await hookSystem.trigger(event);

      expect(results).toHaveLength(2);
      expect(results[0].data).toBe('result1');
      expect(results[1].data).toBe('result2');
    });
  });

  describe('Matcher Filtering', () => {
    it('should filter hooks by matcher pattern', async () => {
      const writeHandler = vi.fn(async () => ({ success: true }));
      const readHandler = vi.fn(async () => ({ success: true }));

      hookSystem.register({
        name: 'PreToolUse',
        handler: writeHandler,
        matcher: 'Write|Edit',
      });

      hookSystem.register({
        name: 'PreToolUse',
        handler: readHandler,
        matcher: 'Read',
      });

      const writeEvent: HookEvent = {
        name: 'PreToolUse',
        timestamp: Date.now(),
        source: 'test',
        payload: { tool: 'Write' },
      };

      await hookSystem.trigger(writeEvent);

      expect(writeHandler).toHaveBeenCalledTimes(1);
      expect(readHandler).not.toHaveBeenCalled();
    });

    it('should execute hooks without matcher for all events', async () => {
      const universalHandler = vi.fn(async () => ({ success: true }));

      hookSystem.register({
        name: 'PreToolUse',
        handler: universalHandler,
      });

      const event1: HookEvent = {
        name: 'PreToolUse',
        timestamp: Date.now(),
        source: 'test',
        payload: { tool: 'Write' },
      };

      const event2: HookEvent = {
        name: 'PreToolUse',
        timestamp: Date.now(),
        source: 'test',
        payload: { tool: 'Read' },
      };

      await hookSystem.trigger(event1);
      await hookSystem.trigger(event2);

      expect(universalHandler).toHaveBeenCalledTimes(2);
    });

    it('should handle invalid matcher patterns gracefully', async () => {
      const handler = vi.fn(async () => ({ success: true }));

      hookSystem.register({
        name: 'PreToolUse',
        handler,
        matcher: '[invalid(regex',
      });

      const event: HookEvent = {
        name: 'PreToolUse',
        timestamp: Date.now(),
        source: 'test',
        payload: { tool: 'Write' },
      };

      const results = await hookSystem.trigger(event);

      expect(results).toEqual([]);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout long-running hooks', async () => {
      const slowHandler = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return { success: true };
      });

      hookSystem.register({
        name: 'PreToolUse',
        handler: slowHandler,
        timeout: 0.1, // 100ms timeout
      });

      const event: HookEvent = {
        name: 'PreToolUse',
        timestamp: Date.now(),
        source: 'test',
        payload: {},
      };

      const results = await hookSystem.trigger(event);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBeDefined();
    });

    it('should complete fast hooks within timeout', async () => {
      const fastHandler = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { success: true };
      });

      hookSystem.register({
        name: 'PreToolUse',
        handler: fastHandler,
        timeout: 1, // 1 second timeout
      });

      const event: HookEvent = {
        name: 'PreToolUse',
        timestamp: Date.now(),
        source: 'test',
        payload: {},
      };

      const results = await hookSystem.trigger(event);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should isolate hook errors', async () => {
      const errorHandler = vi.fn(async () => {
        throw new Error('Hook error');
      });

      const normalHandler = vi.fn(async () => ({ success: true }));

      hookSystem.register({ name: 'PreToolUse', handler: errorHandler, priority: 10 });
      hookSystem.register({ name: 'PreToolUse', handler: normalHandler, priority: 5 });

      const event: HookEvent = {
        name: 'PreToolUse',
        timestamp: Date.now(),
        source: 'test',
        payload: {},
      };

      const results = await hookSystem.trigger(event);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);
    });

    it('should stop execution on critical hook failure', async () => {
      const criticalHandler = vi.fn(async () => ({ success: false }));
      const normalHandler = vi.fn(async () => ({ success: true }));

      hookSystem.register({
        name: 'PreToolUse',
        handler: criticalHandler,
        priority: 100, // Critical priority
      });

      hookSystem.register({
        name: 'PreToolUse',
        handler: normalHandler,
        priority: 50,
      });

      const event: HookEvent = {
        name: 'PreToolUse',
        timestamp: Date.now(),
        source: 'test',
        payload: {},
      };

      const results = await hookSystem.trigger(event);

      expect(results).toHaveLength(1);
      expect(criticalHandler).toHaveBeenCalledTimes(1);
      expect(normalHandler).not.toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    it('should return registered hook names', () => {
      hookSystem.register({
        name: 'PreToolUse',
        handler: vi.fn(async () => ({ success: true })),
      });

      hookSystem.register({
        name: 'PostToolUse',
        handler: vi.fn(async () => ({ success: true })),
      });

      const names = hookSystem.getRegisteredHooks();

      expect(names).toContain('PreToolUse');
      expect(names).toContain('PostToolUse');
      expect(names.length).toBe(2);
    });

    it('should clear all hooks', () => {
      hookSystem.register({
        name: 'PreToolUse',
        handler: vi.fn(async () => ({ success: true })),
      });

      hookSystem.register({
        name: 'PostToolUse',
        handler: vi.fn(async () => ({ success: true })),
      });

      hookSystem.clear();

      expect(hookSystem.getRegisteredHooks().length).toBe(0);
    });

    it('should clear hooks for specific event', () => {
      hookSystem.register({
        name: 'PreToolUse',
        handler: vi.fn(async () => ({ success: true })),
      });

      hookSystem.register({
        name: 'PostToolUse',
        handler: vi.fn(async () => ({ success: true })),
      });

      hookSystem.clearHooks('PreToolUse');

      expect(hookSystem.hasHook('PreToolUse')).toBe(false);
      expect(hookSystem.hasHook('PostToolUse')).toBe(true);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = getHookSystem();
      const instance2 = getHookSystem();

      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', () => {
      const instance1 = getHookSystem();
      resetHookSystem();
      const instance2 = getHookSystem();

      expect(instance1).not.toBe(instance2);
    });

    it('should maintain state across singleton calls', () => {
      const system1 = getHookSystem();
      system1.register({
        name: 'PreToolUse',
        handler: vi.fn(async () => ({ success: true })),
      });

      const system2 = getHookSystem();

      expect(system2.hasHook('PreToolUse')).toBe(true);
    });
  });

  describe('Integration with Services', () => {
    it('should provide services in context', async () => {
      let receivedServices: any = null;

      const handler = vi.fn(async (context: HookContext) => {
        receivedServices = context.services;
        return { success: true };
      });

      hookSystem.register({ name: 'PreToolUse', handler });

      const event: HookEvent = {
        name: 'PreToolUse',
        timestamp: Date.now(),
        source: 'test',
        payload: {},
      };

      await hookSystem.trigger(event);

      expect(receivedServices).not.toBeNull();
      expect(receivedServices.eventBus).toBeDefined();
      expect(receivedServices.configManager).toBeDefined();
      expect(receivedServices.logger).toBeDefined();
      expect(receivedServices.logger.debug).toBeInstanceOf(Function);
      expect(receivedServices.logger.info).toBeInstanceOf(Function);
      expect(receivedServices.logger.error).toBeInstanceOf(Function);
    });
  });
});

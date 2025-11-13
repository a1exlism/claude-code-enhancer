import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import {
  ConfigManager,
  EventBus,
  HookSystem,
  resetConfigManager,
  resetEventBus,
  resetHookSystem,
} from '../../src/core/index.js';
import type { HookEvent, HookContext } from '../../src/types/hooks.js';
import type { Config } from '../../src/types/config.js';

describe('Core Framework Integration', () => {
  const testDir = join(process.cwd(), '.test-integration');
  const configPath = join(testDir, '.claude-enhancer.json');

  beforeEach(() => {
    // Create test directory
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    // Change to test directory
    process.chdir(testDir);

    // Reset all singletons
    resetConfigManager();
    resetEventBus();
    resetHookSystem();

    // Clear environment variables
    delete process.env.CLAUDE_ENHANCER_QUALITY_ENABLED;
    delete process.env.TEST_TOKEN;
  });

  afterEach(() => {
    // Clean up test directory
    process.chdir(join(testDir, '..'));
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('ConfigManager + HookSystem Integration', () => {
    it('should load hook configuration and apply to HookSystem', async () => {
      const config: Partial<Config> = {
        hooks: {
          PreToolUse: {
            enabled: true,
            timeout: 10,
            matcher: 'Write|Edit',
          },
          PostToolUse: {
            enabled: false,
            timeout: 3,
          },
        },
      };

      writeFileSync(configPath, JSON.stringify(config, null, 2));

      const configManager = new ConfigManager();
      configManager.load();

      const hookSystem = new HookSystem();

      // Register hooks
      const preToolUseHandler = vi.fn(async () => ({ success: true }));
      const postToolUseHandler = vi.fn(async () => ({ success: true }));

      hookSystem.register({
        name: 'PreToolUse',
        handler: preToolUseHandler,
      });

      hookSystem.register({
        name: 'PostToolUse',
        handler: postToolUseHandler,
      });

      // PreToolUse should be registered (enabled in config)
      expect(hookSystem.hasHook('PreToolUse')).toBe(true);

      // PostToolUse should not be registered (disabled in config)
      expect(hookSystem.hasHook('PostToolUse')).toBe(false);
    });

    it('should use configured timeout for hooks', async () => {
      const config: Partial<Config> = {
        hooks: {
          PreToolUse: {
            enabled: true,
            timeout: 1, // 1 second timeout (minimum allowed)
          },
        },
      };

      writeFileSync(configPath, JSON.stringify(config, null, 2));

      const configManager = new ConfigManager();
      configManager.load();

      const hookSystem = new HookSystem();

      const slowHandler = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return { success: true };
      });

      hookSystem.register({
        name: 'PreToolUse',
        handler: slowHandler,
        timeout: 1, // Override with 1 second
      });

      const event: HookEvent = {
        name: 'PreToolUse',
        timestamp: Date.now(),
        source: 'test',
        payload: {},
      };

      const results = await hookSystem.trigger(event);

      // Should timeout
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBeDefined();
    });

    it('should provide ConfigManager in hook context', async () => {
      const config: Partial<Config> = {
        quality: {
          enabled: true,
          linters: ['tsc', 'eslint'],
          autoFix: false,
        },
      };

      writeFileSync(configPath, JSON.stringify(config, null, 2));

      const configManager = new ConfigManager();
      configManager.load();

      const hookSystem = new HookSystem();

      let receivedConfig: any = null;

      const handler = vi.fn(async (context: HookContext) => {
        receivedConfig = context.services.configManager;
        return { success: true };
      });

      hookSystem.register({
        name: 'PreToolUse',
        handler,
      });

      const event: HookEvent = {
        name: 'PreToolUse',
        timestamp: Date.now(),
        source: 'test',
        payload: {},
      };

      await hookSystem.trigger(event);

      expect(receivedConfig).toBeDefined();
      expect(receivedConfig.getValue('quality.enabled')).toBe(true);
      expect(receivedConfig.getValue('quality.linters')).toEqual(['tsc', 'eslint']);
    });
  });

  describe('EventBus + HookSystem Integration', () => {
    it('should emit hook events to EventBus', async () => {
      const { getEventBus } = await import('../../src/core/event-bus.js');
      const eventBus = getEventBus();
      const hookSystem = new HookSystem();

      const hookEventListener = vi.fn();
      eventBus.on('hook:PreToolUse', hookEventListener);

      const handler = vi.fn(async () => ({ success: true }));

      hookSystem.register({
        name: 'PreToolUse',
        handler,
      });

      const event: HookEvent = {
        name: 'PreToolUse',
        timestamp: Date.now(),
        source: 'test',
        payload: { tool: 'Write' },
      };

      await hookSystem.trigger(event);

      // EventBus should receive hook event
      expect(hookEventListener).toHaveBeenCalledTimes(1);
      expect(hookEventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'hook:PreToolUse',
          source: 'hook-system',
        })
      );
    });

    it('should provide EventBus in hook context', async () => {
      const { getEventBus } = await import('../../src/core/event-bus.js');
      const eventBus = getEventBus();
      const hookSystem = new HookSystem();

      let receivedEventBus: any = null;

      const handler = vi.fn(async (context: HookContext) => {
        receivedEventBus = context.services.eventBus;
        return { success: true };
      });

      hookSystem.register({
        name: 'PreToolUse',
        handler,
      });

      const event: HookEvent = {
        name: 'PreToolUse',
        timestamp: Date.now(),
        source: 'test',
        payload: {},
      };

      await hookSystem.trigger(event);

      expect(receivedEventBus).toBeDefined();
      expect(receivedEventBus).toStrictEqual(eventBus);
    });

    it('should allow hooks to emit custom events', async () => {
      const { getEventBus } = await import('../../src/core/event-bus.js');
      const eventBus = getEventBus();
      const hookSystem = new HookSystem();

      const customEventListener = vi.fn();
      eventBus.on('custom-event', customEventListener);

      const handler = vi.fn(async (context: HookContext) => {
        context.services.eventBus.emit({
          type: 'custom-event',
          payload: { message: 'Hello from hook' },
          timestamp: Date.now(),
          source: 'hook',
        });
        return { success: true };
      });

      hookSystem.register({
        name: 'PreToolUse',
        handler,
      });

      const event: HookEvent = {
        name: 'PreToolUse',
        timestamp: Date.now(),
        source: 'test',
        payload: {},
      };

      await hookSystem.trigger(event);

      expect(customEventListener).toHaveBeenCalledTimes(1);
      expect(customEventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'custom-event',
          payload: { message: 'Hello from hook' },
        })
      );
    });
  });

  describe('Full Framework Integration', () => {
    it('should work together: Config → Hook → Event', async () => {
      // Setup configuration
      const config: Partial<Config> = {
        hooks: {
          PreToolUse: {
            enabled: true,
            timeout: 5,
            matcher: 'Write',
          },
        },
        quality: {
          enabled: true,
          linters: ['tsc'],
          autoFix: false,
        },
      };

      writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Initialize framework
      const configManager = new ConfigManager();
      configManager.load();

      const { getEventBus } = await import('../../src/core/event-bus.js');
      const eventBus = getEventBus();
      const hookSystem = new HookSystem();

      // Setup event listener
      const hookEventListener = vi.fn();
      eventBus.on('hook:PreToolUse', hookEventListener);

      // Register hook that uses config and emits events
      const handler = vi.fn(async (context: HookContext) => {
        const qualityEnabled = context.services.configManager.getValue('quality.enabled');

        if (qualityEnabled) {
          context.services.eventBus.emit({
            type: 'quality-check',
            payload: { status: 'passed' },
            timestamp: Date.now(),
            source: 'hook',
          });
        }

        return { success: true, data: { qualityEnabled } };
      });

      hookSystem.register({
        name: 'PreToolUse',
        handler,
      });

      // Setup quality check listener
      const qualityCheckListener = vi.fn();
      eventBus.on('quality-check', qualityCheckListener);

      // Trigger hook
      const event: HookEvent = {
        name: 'PreToolUse',
        timestamp: Date.now(),
        source: 'test',
        payload: { tool: 'Write' },
      };

      const results = await hookSystem.trigger(event);

      // Verify full flow
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].data).toEqual({ qualityEnabled: true });

      // Hook event emitted
      expect(hookEventListener).toHaveBeenCalledTimes(1);

      // Quality check event emitted
      expect(qualityCheckListener).toHaveBeenCalledTimes(1);
      expect(qualityCheckListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'quality-check',
          payload: { status: 'passed' },
        })
      );
    });

    it('should handle complex hook workflows', async () => {
      const config: Partial<Config> = {
        hooks: {
          PreToolUse: {
            enabled: true,
            timeout: 5,
          },
        },
      };

      writeFileSync(configPath, JSON.stringify(config, null, 2));

      const configManager = new ConfigManager();
      configManager.load();

      const { getEventBus } = await import('../../src/core/event-bus.js');
      const eventBus = getEventBus();
      const hookSystem = new HookSystem();

      const executionLog: string[] = [];

      // Register multiple hooks with different priorities
      const securityCheck = vi.fn(async (context: HookContext) => {
        executionLog.push('security-check');
        context.services.eventBus.emit({
          type: 'security-checked',
          payload: {},
          timestamp: Date.now(),
          source: 'security',
        });
        return { success: true };
      });

      const permissionCheck = vi.fn(async (context: HookContext) => {
        executionLog.push('permission-check');
        context.services.eventBus.emit({
          type: 'permission-checked',
          payload: {},
          timestamp: Date.now(),
          source: 'permission',
        });
        return { success: true };
      });

      const paramNormalizer = vi.fn(async (context: HookContext) => {
        executionLog.push('param-normalizer');
        return { success: true };
      });

      hookSystem.register({
        name: 'PreToolUse',
        handler: securityCheck,
        priority: 100, // Highest priority
      });

      hookSystem.register({
        name: 'PreToolUse',
        handler: permissionCheck,
        priority: 50,
      });

      hookSystem.register({
        name: 'PreToolUse',
        handler: paramNormalizer,
        priority: 10, // Lowest priority
      });

      // Setup event listeners
      const securityListener = vi.fn();
      const permissionListener = vi.fn();

      eventBus.on('security-checked', securityListener);
      eventBus.on('permission-checked', permissionListener);

      // Trigger hooks
      const event: HookEvent = {
        name: 'PreToolUse',
        timestamp: Date.now(),
        source: 'test',
        payload: { tool: 'Write' },
      };

      const results = await hookSystem.trigger(event);

      // Verify execution order
      expect(executionLog).toEqual([
        'security-check',
        'permission-check',
        'param-normalizer',
      ]);

      // Verify all hooks executed
      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);

      // Verify events emitted
      expect(securityListener).toHaveBeenCalledTimes(1);
      expect(permissionListener).toHaveBeenCalledTimes(1);
    });

    it('should handle hook failures gracefully', async () => {
      const configManager = new ConfigManager();
      configManager.load();

      const { getEventBus } = await import('../../src/core/event-bus.js');
      const eventBus = getEventBus();
      const hookSystem = new HookSystem();

      const errorListener = vi.fn();
      eventBus.on('hook:PreToolUse', errorListener);

      const failingHook = vi.fn(async () => {
        throw new Error('Hook failed');
      });

      const successHook = vi.fn(async () => ({ success: true }));

      hookSystem.register({
        name: 'PreToolUse',
        handler: failingHook,
        priority: 10,
      });

      hookSystem.register({
        name: 'PreToolUse',
        handler: successHook,
        priority: 5,
      });

      const event: HookEvent = {
        name: 'PreToolUse',
        timestamp: Date.now(),
        source: 'test',
        payload: {},
      };

      const results = await hookSystem.trigger(event);

      // Both hooks should execute despite failure
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);

      // Event should still be emitted
      expect(errorListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Environment Variable Integration', () => {
    it('should support environment variable interpolation in config', async () => {
      process.env.TEST_TOKEN = 'secret-123';

      const config = {
        notify: {
          channels: {
            telegram: {
              enabled: true,
              botToken: '${TEST_TOKEN}',
              chatId: '123456',
            },
          },
        },
      };

      writeFileSync(configPath, JSON.stringify(config, null, 2));

      const configManager = new ConfigManager();
      configManager.load();

      const hookSystem = new HookSystem();

      let receivedToken: string | null = null;

      const handler = vi.fn(async (context: HookContext) => {
        receivedToken = context.services.configManager.getValue(
          'notify.channels.telegram.botToken'
        );
        return { success: true };
      });

      hookSystem.register({
        name: 'PreToolUse',
        handler,
      });

      const event: HookEvent = {
        name: 'PreToolUse',
        timestamp: Date.now(),
        source: 'test',
        payload: {},
      };

      await hookSystem.trigger(event);

      expect(receivedToken).toBe('secret-123');
    });

    it('should support environment variable overrides', async () => {
      process.env.CLAUDE_ENHANCER_QUALITY_ENABLED = 'false';

      const configManager = new ConfigManager();
      configManager.load();

      const hookSystem = new HookSystem();

      let qualityEnabled: boolean | null = null;

      const handler = vi.fn(async (context: HookContext) => {
        qualityEnabled = context.services.configManager.getValue('quality.enabled');
        return { success: true };
      });

      hookSystem.register({
        name: 'PreToolUse',
        handler,
      });

      const event: HookEvent = {
        name: 'PreToolUse',
        timestamp: Date.now(),
        source: 'test',
        payload: {},
      };

      await hookSystem.trigger(event);

      expect(qualityEnabled).toBe(false);
    });
  });
});

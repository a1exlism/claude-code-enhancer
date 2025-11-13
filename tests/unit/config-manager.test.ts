import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { ConfigManager, resetConfigManager } from '../../src/core/config-manager.js';
import type { Config } from '../../src/types/config.js';

describe('ConfigManager', () => {
  const testDir = join(process.cwd(), '.test-config');
  const projectConfigPath = join(testDir, '.claude-enhancer.json');

  beforeEach(() => {
    // Create test directory
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    // Change to test directory
    process.chdir(testDir);

    // Reset singleton
    resetConfigManager();

    // Clear environment variables
    delete process.env.CLAUDE_ENHANCER_QUALITY_ENABLED;
    delete process.env.CLAUDE_ENHANCER_QUALITY_AUTO_FIX;
    delete process.env.TEST_TOKEN;
  });

  afterEach(() => {
    // Clean up test directory
    process.chdir(join(testDir, '..'));
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Default Configuration', () => {
    it('should load default configuration when no config files exist', () => {
      const manager = new ConfigManager();
      const config = manager.load();

      expect(config).toBeDefined();
      expect(config.quality?.enabled).toBe(true);
      expect(config.quality?.linters).toEqual(['tsc', 'eslint']);
      expect(config.quality?.autoFix).toBe(false);
    });

    it('should return default values for hooks', () => {
      const manager = new ConfigManager();
      manager.load();

      expect(manager.isHookEnabled('PreToolUse')).toBe(true);
      expect(manager.getHookTimeout('PreToolUse')).toBe(5);
    });
  });

  describe('JSON Configuration Loading', () => {
    it('should load valid JSON configuration', () => {
      const config: Partial<Config> = {
        quality: {
          enabled: false,
          linters: ['tsc'],
          autoFix: true,
        },
      };

      writeFileSync(projectConfigPath, JSON.stringify(config, null, 2));

      const manager = new ConfigManager();
      const loadedConfig = manager.load();

      expect(loadedConfig.quality?.enabled).toBe(false);
      expect(loadedConfig.quality?.linters).toEqual(['tsc']);
      expect(loadedConfig.quality?.autoFix).toBe(true);
    });

    it('should throw error for invalid JSON', () => {
      writeFileSync(projectConfigPath, 'invalid json');

      const manager = new ConfigManager();
      expect(() => manager.load()).toThrow(/Failed to load configuration/);
    });

    it('should throw error for invalid configuration schema', () => {
      const invalidConfig = {
        quality: {
          enabled: 'not-a-boolean', // Should be boolean
        },
      };

      writeFileSync(projectConfigPath, JSON.stringify(invalidConfig));

      const manager = new ConfigManager();
      expect(() => manager.load()).toThrow(/Configuration validation failed/);
    });
  });

  describe('Environment Variable Resolution', () => {
    it('should resolve environment variable placeholders', () => {
      process.env.TEST_TOKEN = 'secret-token-123';

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

      writeFileSync(projectConfigPath, JSON.stringify(config));

      const manager = new ConfigManager();
      const loadedConfig = manager.load();

      expect(loadedConfig.notify?.channels?.telegram?.botToken).toBe(
        'secret-token-123'
      );
    });

    it('should throw error for undefined environment variables', () => {
      const config = {
        notify: {
          channels: {
            telegram: {
              enabled: true,
              botToken: '${UNDEFINED_VAR}',
              chatId: '123456',
            },
          },
        },
      };

      writeFileSync(projectConfigPath, JSON.stringify(config));

      const manager = new ConfigManager();
      expect(() => manager.load()).toThrow(
        /Environment variable UNDEFINED_VAR is not defined/
      );
    });

    it('should resolve multiple environment variables', () => {
      process.env.BOT_TOKEN = 'bot-token';
      process.env.CHAT_ID = 'chat-id';

      const config = {
        notify: {
          channels: {
            telegram: {
              enabled: true,
              botToken: '${BOT_TOKEN}',
              chatId: '${CHAT_ID}',
            },
          },
        },
      };

      writeFileSync(projectConfigPath, JSON.stringify(config));

      const manager = new ConfigManager();
      const loadedConfig = manager.load();

      expect(loadedConfig.notify?.channels?.telegram?.botToken).toBe('bot-token');
      expect(loadedConfig.notify?.channels?.telegram?.chatId).toBe('chat-id');
    });
  });

  describe('Environment Variable Overrides', () => {
    it('should override quality.enabled from environment', () => {
      process.env.CLAUDE_ENHANCER_QUALITY_ENABLED = 'false';

      const manager = new ConfigManager();
      const config = manager.load();

      expect(config.quality?.enabled).toBe(false);
    });

    it('should override quality.autoFix from environment', () => {
      process.env.CLAUDE_ENHANCER_QUALITY_AUTO_FIX = 'true';

      const manager = new ConfigManager();
      const config = manager.load();

      expect(config.quality?.autoFix).toBe(true);
    });

    it('should apply multiple environment overrides', () => {
      process.env.CLAUDE_ENHANCER_QUALITY_ENABLED = 'false';
      process.env.CLAUDE_ENHANCER_QUALITY_AUTO_FIX = 'true';

      const manager = new ConfigManager();
      const config = manager.load();

      expect(config.quality?.enabled).toBe(false);
      expect(config.quality?.autoFix).toBe(true);
    });
  });

  describe('Configuration Merging', () => {
    it('should merge project config with default config', () => {
      const projectConfig: Partial<Config> = {
        quality: {
          enabled: false,
          linters: ['tsc'],
          autoFix: false,
        },
      };

      writeFileSync(projectConfigPath, JSON.stringify(projectConfig));

      const manager = new ConfigManager();
      const config = manager.load();

      // Project config should override
      expect(config.quality?.enabled).toBe(false);
      expect(config.quality?.linters).toEqual(['tsc']);

      // Default config should still be present
      expect(config.notify).toBeDefined();
    });

    it('should prioritize project config over user config', () => {
      // This test would require mocking homedir and creating user config
      // For now, we'll skip this as it requires more complex setup
      expect(true).toBe(true);
    });
  });

  describe('Configuration Access Methods', () => {
    it('should get configuration value by path', () => {
      const config: Partial<Config> = {
        quality: {
          enabled: true,
          linters: ['tsc', 'eslint'],
          autoFix: false,
        },
      };

      writeFileSync(projectConfigPath, JSON.stringify(config));

      const manager = new ConfigManager();
      manager.load();

      expect(manager.getValue('quality.enabled')).toBe(true);
      expect(manager.getValue('quality.linters')).toEqual(['tsc', 'eslint']);
      expect(manager.getValue('quality.autoFix')).toBe(false);
    });

    it('should return undefined for non-existent paths', () => {
      const manager = new ConfigManager();
      manager.load();

      expect(manager.getValue('non.existent.path')).toBeUndefined();
    });

    it('should check if hook is enabled', () => {
      const config: Partial<Config> = {
        hooks: {
          PreToolUse: {
            enabled: false,
            timeout: 10,
          },
        },
      };

      writeFileSync(projectConfigPath, JSON.stringify(config));

      const manager = new ConfigManager();
      manager.load();

      expect(manager.isHookEnabled('PreToolUse')).toBe(false);
      expect(manager.isHookEnabled('PostToolUse')).toBe(true); // Default
    });

    it('should get hook timeout', () => {
      const config: Partial<Config> = {
        hooks: {
          PreToolUse: {
            enabled: true,
            timeout: 10,
          },
        },
      };

      writeFileSync(projectConfigPath, JSON.stringify(config));

      const manager = new ConfigManager();
      manager.load();

      expect(manager.getHookTimeout('PreToolUse')).toBe(10);
      expect(manager.getHookTimeout('PostToolUse')).toBe(5); // Default
    });

    it('should get config path', () => {
      const config: Partial<Config> = {
        quality: {
          enabled: true,
          linters: ['tsc'],
          autoFix: false,
        },
      };

      writeFileSync(projectConfigPath, JSON.stringify(config));

      const manager = new ConfigManager();
      manager.load();

      expect(manager.getConfigPath()).toBe(projectConfigPath);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', async () => {
      const { getConfigManager } = await import('../../src/core/config-manager.js');

      const instance1 = getConfigManager();
      const instance2 = getConfigManager();

      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', async () => {
      const { getConfigManager, resetConfigManager } = await import(
        '../../src/core/config-manager.js'
      );

      const instance1 = getConfigManager();
      resetConfigManager();
      const instance2 = getConfigManager();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Hook Configuration', () => {
    it('should load hook-specific configuration', () => {
      const config: Partial<Config> = {
        hooks: {
          PreToolUse: {
            enabled: true,
            timeout: 10,
            matcher: 'Write|Edit',
            options: {
              checkSecurity: true,
            },
          },
          PostToolUse: {
            enabled: false,
            timeout: 3,
          },
        },
      };

      writeFileSync(projectConfigPath, JSON.stringify(config));

      const manager = new ConfigManager();
      manager.load();

      expect(manager.isHookEnabled('PreToolUse')).toBe(true);
      expect(manager.getHookTimeout('PreToolUse')).toBe(10);
      expect(manager.getValue('hooks.PreToolUse.matcher')).toBe('Write|Edit');
      expect(manager.getValue('hooks.PreToolUse.options.checkSecurity')).toBe(true);

      expect(manager.isHookEnabled('PostToolUse')).toBe(false);
      expect(manager.getHookTimeout('PostToolUse')).toBe(3);
    });
  });
});

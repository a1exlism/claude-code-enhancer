import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { ConfigSchema, type Config } from '../types/config.js';
import * as logger from '../utils/logger.js';

/**
 * Configuration file locations in priority order (high to low)
 */
const CONFIG_LOCATIONS = {
  /** Project-level config (highest priority) */
  project: './.claude-enhancer.json',
  /** User-level config */
  user: join(homedir(), '.claude-enhancer', 'config.json'),
} as const;

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Config = {
  hooks: {},
  notify: {
    channels: {},
    filters: {
      rules: [],
      aiEnabled: false,
    },
  },
  quality: {
    enabled: true,
    linters: ['tsc', 'eslint'],
    autoFix: false,
  },
};

/**
 * Configuration Manager
 * Handles loading, validation, and merging of configuration from multiple sources
 */
export class ConfigManager {
  private config: Config;
  private configPath: string | null = null;

  constructor() {
    this.config = DEFAULT_CONFIG;
  }

  /**
   * Load configuration from all sources with priority
   * Priority: Project config > User config > Default config
   */
  load(): Config {
    logger.debug('Loading configuration...');

    // Start with default config
    let mergedConfig = { ...DEFAULT_CONFIG };

    // Try to load user config
    const userConfigPath = CONFIG_LOCATIONS.user;
    if (existsSync(userConfigPath)) {
      logger.debug(`Loading user config from: ${userConfigPath}`);
      const userConfig = this.loadConfigFile(userConfigPath);
      if (userConfig) {
        mergedConfig = this.mergeConfig(mergedConfig, userConfig);
        this.configPath = userConfigPath;
      }
    }

    // Try to load project config (highest priority)
    const projectConfigPath = join(process.cwd(), CONFIG_LOCATIONS.project);
    if (existsSync(projectConfigPath)) {
      logger.debug(`Loading project config from: ${projectConfigPath}`);
      const projectConfig = this.loadConfigFile(projectConfigPath);
      if (projectConfig) {
        mergedConfig = this.mergeConfig(mergedConfig, projectConfig);
        this.configPath = projectConfigPath;
      }
    }

    // Apply environment variable overrides
    mergedConfig = this.applyEnvOverrides(mergedConfig);

    // Validate final configuration
    const validationResult = this.validate(mergedConfig);
    if (!validationResult.success) {
      const errorMessages = validationResult.errors
        ? validationResult.errors
            .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
            .join('\n')
        : 'Unknown validation error';
      throw new Error(
        `Configuration validation failed:\n${errorMessages}`
      );
    }

    this.config = validationResult.data!;
    logger.info('Configuration loaded successfully');
    return this.config;
  }

  /**
   * Load configuration from a JSON file
   */
  private loadConfigFile(filePath: string): Partial<Config> | null {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      // Replace environment variable placeholders
      const resolved = this.resolveEnvVariables(parsed);

      return resolved;
    } catch (error) {
      logger.error(`Failed to load config from ${filePath}`, error as Error);
      throw new Error(
        `Failed to load configuration from ${filePath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Resolve environment variable placeholders in config
   * Supports ${VAR_NAME} syntax
   */
  private resolveEnvVariables(obj: any): any {
    if (typeof obj === 'string') {
      // Replace ${VAR_NAME} with process.env.VAR_NAME
      return obj.replace(/\$\{([^}]+)\}/g, (_, varName) => {
        const value = process.env[varName];
        if (value === undefined) {
          throw new Error(
            `Environment variable ${varName} is not defined`
          );
        }
        return value;
      });
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.resolveEnvVariables(item));
    }

    if (obj !== null && typeof obj === 'object') {
      const resolved: any = {};
      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = this.resolveEnvVariables(value);
      }
      return resolved;
    }

    return obj;
  }

  /**
   * Apply environment variable overrides
   * Supports CLAUDE_ENHANCER_* prefix
   */
  private applyEnvOverrides(config: Config): Config {
    const overrides: Partial<Config> = {};

    // Ensure quality config exists
    const qualityConfig = config.quality || {
      enabled: true,
      linters: ['tsc', 'eslint'],
      autoFix: false,
    };

    // Example: CLAUDE_ENHANCER_QUALITY_ENABLED=false
    if (process.env.CLAUDE_ENHANCER_QUALITY_ENABLED !== undefined) {
      overrides.quality = {
        ...qualityConfig,
        enabled: process.env.CLAUDE_ENHANCER_QUALITY_ENABLED === 'true',
      };
    }

    // Example: CLAUDE_ENHANCER_QUALITY_AUTO_FIX=true
    if (process.env.CLAUDE_ENHANCER_QUALITY_AUTO_FIX !== undefined) {
      overrides.quality = {
        ...(overrides.quality || qualityConfig),
        autoFix: process.env.CLAUDE_ENHANCER_QUALITY_AUTO_FIX === 'true',
      };
    }

    return this.mergeConfig(config, overrides);
  }

  /**
   * Deep merge two configuration objects
   */
  private mergeConfig(base: Config, override: Partial<Config>): Config {
    const merged = { ...base };

    for (const [key, value] of Object.entries(override)) {
      if (value === undefined) continue;

      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        merged[key as keyof Config] = {
          ...(merged[key as keyof Config] as any),
          ...value,
        } as any;
      } else {
        merged[key as keyof Config] = value as any;
      }
    }

    return merged;
  }

  /**
   * Validate configuration using Zod schema
   */
  private validate(config: unknown): {
    success: boolean;
    data?: Config;
    errors?: Array<{ path: string[]; message: string }>;
  } {
    const result = ConfigSchema.safeParse(config);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errors = result.error.issues.map((err) => ({
      path: err.path.map(String),
      message: err.message,
    }));

    return { success: false, errors };
  }

  /**
   * Get current configuration
   */
  get(): Config {
    return this.config;
  }

  /**
   * Get configuration file path
   */
  getConfigPath(): string | null {
    return this.configPath;
  }

  /**
   * Get a specific configuration value by path
   */
  getValue<T = any>(path: string): T | undefined {
    const keys = path.split('.');
    let current: any = this.config;

    for (const key of keys) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[key];
    }

    return current as T;
  }

  /**
   * Check if a specific hook is enabled
   */
  isHookEnabled(hookName: string): boolean {
    const hookConfig = this.config.hooks?.[hookName];
    return hookConfig?.enabled ?? true; // Default to enabled
  }

  /**
   * Get hook timeout in seconds
   */
  getHookTimeout(hookName: string): number {
    const hookConfig = this.config.hooks?.[hookName];
    return hookConfig?.timeout ?? 5; // Default to 5 seconds
  }
}

/**
 * Singleton instance
 */
let instance: ConfigManager | null = null;

/**
 * Get or create ConfigManager singleton instance
 */
export function getConfigManager(): ConfigManager {
  if (!instance) {
    instance = new ConfigManager();
    instance.load();
  }
  return instance;
}

/**
 * Reset ConfigManager singleton (for testing)
 */
export function resetConfigManager(): void {
  instance = null;
}

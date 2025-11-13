import { z } from 'zod';
import type { HookEventName } from './hooks.js';

/**
 * Hook configuration schema
 */
export const HookConfigSchema = z.object({
  enabled: z.boolean().default(true),
  timeout: z.number().min(1).max(60).default(5),
  matcher: z.string().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Telegram notification configuration schema
 */
export const TelegramConfigSchema = z.object({
  enabled: z.boolean().default(true),
  botToken: z.string().min(1),
  chatId: z.string().min(1),
});

/**
 * Discord notification configuration schema
 */
export const DiscordConfigSchema = z.object({
  enabled: z.boolean().default(true),
  webhookUrl: z.string().url(),
});

/**
 * Email notification configuration schema
 */
export const EmailConfigSchema = z.object({
  enabled: z.boolean().default(true),
  smtp: z.object({
    host: z.string().min(1),
    port: z.number().min(1).max(65535),
    user: z.string().min(1),
    pass: z.string().min(1),
  }),
  from: z.string().email(),
  to: z.array(z.string().email()).min(1),
});

/**
 * Notification configuration schema
 */
export const NotifyConfigSchema = z.object({
  channels: z.object({
    telegram: TelegramConfigSchema.optional(),
    discord: DiscordConfigSchema.optional(),
    email: EmailConfigSchema.optional(),
  }),
  filters: z.object({
    rules: z.array(z.string()).default([]),
    aiEnabled: z.boolean().default(false),
  }).optional(),
});

/**
 * Quality check configuration schema
 */
export const QualityConfigSchema = z.object({
  enabled: z.boolean().default(true),
  linters: z.array(z.string()).default(['tsc', 'eslint']),
  autoFix: z.boolean().default(false),
});

/**
 * Root configuration schema
 */
export const ConfigSchema = z.object({
  hooks: z.record(z.string(), HookConfigSchema).optional(),
  notify: NotifyConfigSchema.optional(),
  quality: QualityConfigSchema.optional(),
});

/**
 * TypeScript types inferred from Zod schemas
 */
export type HookConfig = z.infer<typeof HookConfigSchema>;
export type TelegramConfig = z.infer<typeof TelegramConfigSchema>;
export type DiscordConfig = z.infer<typeof DiscordConfigSchema>;
export type EmailConfig = z.infer<typeof EmailConfigSchema>;
export type NotifyConfig = z.infer<typeof NotifyConfigSchema>;
export type QualityConfig = z.infer<typeof QualityConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;

/**
 * Configuration validation result
 */
export interface ValidationResult {
  /** Whether validation was successful */
  success: boolean;
  /** Validated and parsed configuration (if successful) */
  data?: Config;
  /** Validation errors (if failed) */
  errors?: Array<{
    path: string[];
    message: string;
  }>;
}

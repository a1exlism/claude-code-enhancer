/**
 * 敏感信息过滤器
 * 自动检测并脱敏 API Key、Token、密码等敏感信息
 */

export interface SanitizeResult {
  sanitized: string;
  detectedCount: number;
  detectedTypes: string[];
}

export interface SensitivePattern {
  name: string;
  regex: RegExp;
  redactLevel: 'conservative' | 'moderate' | 'strict';
  customReplace?: (match: string) => string; // 自定义替换函数
}

/**
 * 预定义的敏感信息模式
 */
export const SENSITIVE_PATTERNS: SensitivePattern[] = [
  // OpenAI API Keys
  {
    name: 'OpenAI API Key',
    regex: /sk-proj-[a-zA-Z0-9]{20,}/g,
    redactLevel: 'conservative',
  },
  {
    name: 'OpenAI API Key (Legacy)',
    regex: /sk-[a-zA-Z0-9]{20,}/g,
    redactLevel: 'conservative',
  },

  // Anthropic API Keys
  {
    name: 'Anthropic API Key',
    regex: /sk-ant-[a-zA-Z0-9\-_]{20,}/g,
    redactLevel: 'conservative',
  },

  // GitHub Tokens (格式: ghp_ + 36 字符 = 40 字符总长)
  {
    name: 'GitHub Personal Access Token',
    regex: /ghp_[a-zA-Z0-9]{36}/g,
    redactLevel: 'conservative',
  },
  {
    name: 'GitHub OAuth Token',
    regex: /gho_[a-zA-Z0-9]{36}/g,
    redactLevel: 'conservative',
  },
  {
    name: 'GitHub App Token',
    regex: /ghs_[a-zA-Z0-9]{36}/g,
    redactLevel: 'conservative',
  },

  // Slack Tokens
  {
    name: 'Slack Bot Token',
    regex: /xoxb-[a-zA-Z0-9\-]+/g,
    redactLevel: 'conservative',
  },
  {
    name: 'Slack User Token',
    regex: /xoxp-[a-zA-Z0-9\-]+/g,
    redactLevel: 'conservative',
  },

  // JWT Tokens
  {
    name: 'JWT Token',
    regex: /eyJ[a-zA-Z0-9_\-]*\.eyJ[a-zA-Z0-9_\-]*\.[a-zA-Z0-9_\-]*/g,
    redactLevel: 'moderate',
  },

  // AWS Credentials
  {
    name: 'AWS Access Key ID',
    regex: /AKIA[0-9A-Z]{16}/g,
    redactLevel: 'conservative',
  },

  // Generic Password Patterns
  {
    name: 'Password in Key-Value',
    regex: /password\s*[=:]\s*['"]?[^'"\s]{8,}/gi,
    redactLevel: 'strict',
    customReplace: (match) => {
      // 保留 "password=" 部分，只替换值
      const separator = match.match(/[=:]/)?.[0] || '=';
      return match.split(separator)[0] + separator + '***';
    },
  },
  {
    name: 'API Key in Key-Value',
    regex: /api[_-]?key\s*[=:]\s*['"]?[a-zA-Z0-9\-_]{16,}/gi,
    redactLevel: 'conservative',
    customReplace: (match) => {
      const parts = match.split(/([=:])/);
      if (parts.length >= 3) {
        const value = parts.slice(2).join('');
        return parts[0] + parts[1] + redact(value.trim().replace(/^['"]|['"]$/g, ''), 'conservative');
      }
      return match;
    },
  },

  // Database Connection Strings
  {
    name: 'Database Connection String',
    regex: /(postgresql|mysql|mongodb):\/\/([^:]+):([^@]+)@/gi,
    redactLevel: 'strict',
    customReplace: (match) => {
      // 匹配格式: protocol://user:password@
      const parts = match.match(/(.*:\/\/)([^:]+):([^@]+)(@)/);
      if (parts) {
        return parts[1] + parts[2] + ':***' + parts[4];
      }
      return match;
    },
  },

  // Private Keys
  {
    name: 'Private Key',
    regex: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(RSA\s+)?PRIVATE\s+KEY-----/gi,
    redactLevel: 'strict',
  },
];

/**
 * 脱敏策略
 */
function redact(
  match: string,
  level: 'conservative' | 'moderate' | 'strict' = 'conservative'
): string {
  if (level === 'strict') {
    return '***';
  }

  const keepChars = level === 'conservative' ? 3 : 2;

  if (match.length <= keepChars * 2) {
    return '***';
  }

  const prefix = match.slice(0, keepChars);
  const suffix = match.slice(-keepChars);

  return `${prefix}***${suffix}`;
}

/**
 * 检测并脱敏敏感信息
 */
export function sanitize(
  text: string,
  customPatterns: SensitivePattern[] = []
): SanitizeResult {
  let sanitized = text;
  const detectedTypes = new Set<string>();
  let detectedCount = 0;

  const allPatterns = [...SENSITIVE_PATTERNS, ...customPatterns];

  for (const pattern of allPatterns) {
    const matches = text.match(pattern.regex);
    if (matches && matches.length > 0) {
      detectedTypes.add(pattern.name);
      detectedCount += matches.length;

      sanitized = sanitized.replace(pattern.regex, (match) => {
        // 使用自定义替换函数或默认脱敏策略
        if (pattern.customReplace) {
          return pattern.customReplace(match);
        }
        return redact(match, pattern.redactLevel);
      });
    }
  }

  return {
    sanitized,
    detectedCount,
    detectedTypes: Array.from(detectedTypes),
  };
}

/**
 * 快捷函数：仅返回脱敏后的文本
 */
export function sanitizeText(text: string): string {
  return sanitize(text).sanitized;
}

/**
 * 从环境变量加载自定义脱敏模式
 */
export function loadCustomPatterns(): SensitivePattern[] {
  const customPatternsEnv = process.env.CLAUDE_ENHANCER_REDACT_PATTERNS;

  if (!customPatternsEnv) {
    return [];
  }

  try {
    const patterns = JSON.parse(customPatternsEnv) as Array<{
      name: string;
      pattern: string;
      redactLevel?: 'conservative' | 'moderate' | 'strict';
    }>;

    return patterns.map((p) => ({
      name: p.name,
      regex: new RegExp(p.pattern, 'g'),
      redactLevel: p.redactLevel || 'conservative',
    }));
  } catch (error) {
    console.warn('Failed to parse custom redact patterns:', error);
    return [];
  }
}

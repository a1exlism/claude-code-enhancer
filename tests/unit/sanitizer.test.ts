import { describe, it, expect } from 'vitest';
import {
  sanitize,
  sanitizeText,
  loadCustomPatterns,
  SENSITIVE_PATTERNS,
} from '../../src/utils/sanitizer';

describe('Sanitizer', () => {
  describe('OpenAI API Keys', () => {
    it('should redact OpenAI project API key', () => {
      const text =
        'Your API key is sk-proj-1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T';
      const result = sanitize(text);

      expect(result.sanitized).toContain('sk-***S0T'); // 实际最后3个字符是 S0T
      expect(result.sanitized).not.toContain('1A2B3C4D5E6F7G8H9I0J');
      expect(result.detectedCount).toBe(1);
      expect(result.detectedTypes).toContain('OpenAI API Key');
    });

    it('should redact legacy OpenAI API key', () => {
      const text = 'Use this key: sk-1234567890abcdefghij';
      const result = sanitize(text);

      expect(result.sanitized).toMatch(/sk-\*\*\*[a-z]{3}/);
      expect(result.detectedCount).toBe(1);
    });

    it('should redact multiple OpenAI keys in one text', () => {
      // 使用不同的 key 格式避免重复匹配
      const text =
        'Primary: sk-proj-ABC123DEF456GHI789JKL012MNO345PQR678STU901VWX234 Backup: sk-ant-abcdefghijklmnopqrstuvwxyz12345678';
      const result = sanitize(text);

      expect(result.detectedCount).toBe(2);
      expect(result.sanitized).not.toContain('ABC123DEF456');
      expect(result.sanitized).not.toContain('abcdefghijklmnopqrstuvwxyz');
    });
  });

  describe('Anthropic API Keys', () => {
    it('should redact Anthropic API key', () => {
      const text = 'API key: sk-ant-api03-abcdefghijklmnopqrstuvwxyz';
      const result = sanitize(text);

      expect(result.sanitized).toContain('sk-***xyz');
      expect(result.sanitized).not.toContain('abcdefghijklmnopqrstuvwxyz');
      expect(result.detectedTypes).toContain('Anthropic API Key');
    });
  });

  describe('GitHub Tokens', () => {
    it('should redact GitHub Personal Access Token', () => {
      const text = 'Token: ghp_1234567890abcdefghijklmnopqrstuvwxyz';
      const result = sanitize(text);

      expect(result.sanitized).toContain('ghp***xyz');
      expect(result.detectedTypes).toContain('GitHub Personal Access Token');
    });

    it('should redact GitHub OAuth Token', () => {
      const text = 'OAuth: gho_1234567890abcdefghijklmnopqrstuvwxyz';
      const result = sanitize(text);

      expect(result.sanitized).toContain('gho***xyz');
      expect(result.detectedTypes).toContain('GitHub OAuth Token');
    });

    it('should redact GitHub App Token', () => {
      const text = 'App token: ghs_1234567890abcdefghijklmnopqrstuvwxyz';
      const result = sanitize(text);

      expect(result.sanitized).toContain('ghs***xyz');
      expect(result.detectedTypes).toContain('GitHub App Token');
    });
  });

  describe('Slack Tokens', () => {
    it('should redact Slack Bot Token', () => {
      const text = 'Bot token: xoxb-TEST-FAKE-TOKEN-abcdefghijklmnopqrstuvwx';
      const result = sanitize(text);

      expect(result.sanitized).toContain('xox***vwx');
      expect(result.detectedTypes).toContain('Slack Bot Token');
    });

    it('should redact Slack User Token', () => {
      const text = 'User token: xoxp-TEST-FAKE-TOKEN-abcdefghijklmnopqrstuvwx';
      const result = sanitize(text);

      expect(result.sanitized).toContain('xox***vwx');
      expect(result.detectedTypes).toContain('Slack User Token');
    });
  });

  describe('JWT Tokens', () => {
    it('should redact JWT token', () => {
      const text =
        'JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const result = sanitize(text);

      expect(result.sanitized).toMatch(/ey\*\*\*5c/); // moderate级别保留2个字符
      expect(result.detectedTypes).toContain('JWT Token');
    });
  });

  describe('AWS Credentials', () => {
    it('should redact AWS Access Key ID', () => {
      const text = 'Access Key: AKIAIOSFODNN7EXAMPLE';
      const result = sanitize(text);

      expect(result.sanitized).toContain('AKI***PLE');
      expect(result.detectedTypes).toContain('AWS Access Key ID');
    });
  });

  describe('Password Patterns', () => {
    it('should redact password in key-value format with equals', () => {
      const text = 'DB_PASSWORD=MySecretPassword123';
      const result = sanitize(text);

      expect(result.sanitized).toBe('DB_PASSWORD=***');
      expect(result.detectedTypes).toContain('Password in Key-Value');
    });

    it('should redact password in key-value format with colon', () => {
      const text = 'password: "SuperSecret99"';
      const result = sanitize(text);

      expect(result.sanitized).toContain('***');
      expect(result.sanitized).not.toContain('SuperSecret99');
    });

    it('should redact API key in key-value format', () => {
      const text = 'api_key=1234567890abcdefghij';
      const result = sanitize(text);

      expect(result.sanitized).toContain('api_key=');
      expect(result.sanitized).toContain('123***hij');
      expect(result.detectedTypes).toContain('API Key in Key-Value');
    });
  });

  describe('Database Connection Strings', () => {
    it('should redact PostgreSQL connection string', () => {
      const text = 'postgresql://user:MyPassword123@localhost:5432/mydb';
      const result = sanitize(text);

      expect(result.sanitized).toBe('postgresql://user:***@localhost:5432/mydb');
      expect(result.detectedTypes).toContain('Database Connection String');
    });

    it('should redact MySQL connection string', () => {
      const text = 'mysql://admin:SecretPass@db.example.com:3306/production';
      const result = sanitize(text);

      expect(result.sanitized).toBe('mysql://admin:***@db.example.com:3306/production');
    });

    it('should redact MongoDB connection string', () => {
      const text = 'mongodb://dbuser:dbpass@mongo.server.com:27017/app';
      const result = sanitize(text);

      expect(result.sanitized).toBe('mongodb://dbuser:***@mongo.server.com:27017/app');
    });
  });

  describe('Private Keys', () => {
    it('should redact RSA private key', () => {
      const text = `Config:
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890...
-----END RSA PRIVATE KEY-----
Done`;
      const result = sanitize(text);

      expect(result.sanitized).toBe('Config:\n***\nDone');
      expect(result.detectedTypes).toContain('Private Key');
    });

    it('should redact generic private key', () => {
      const text = `-----BEGIN PRIVATE KEY-----
abcdefghijklmnopqrstuvwxyz
-----END PRIVATE KEY-----`;
      const result = sanitize(text);

      expect(result.sanitized).toBe('***');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const result = sanitize('');

      expect(result.sanitized).toBe('');
      expect(result.detectedCount).toBe(0);
      expect(result.detectedTypes).toHaveLength(0);
    });

    it('should handle text without sensitive information', () => {
      const text = 'This is a normal message without any secrets.';
      const result = sanitize(text);

      expect(result.sanitized).toBe(text);
      expect(result.detectedCount).toBe(0);
    });

    it('should handle very short potential secrets', () => {
      const text = 'short password=abc';
      const result = sanitize(text);

      // Short passwords might not match (depends on pattern)
      // Just ensure no crash
      expect(result.sanitized).toBeDefined();
    });

    it('should preserve context around redacted secrets', () => {
      const text = 'Configure API with key sk-proj-1234567890abcdefghij and proceed.';
      const result = sanitize(text);

      expect(result.sanitized).toContain('Configure API with key');
      expect(result.sanitized).toContain('and proceed.');
      expect(result.sanitized).not.toContain('1234567890abcdefghij');
    });
  });

  describe('Multiple Secrets', () => {
    it('should detect and redact multiple types of secrets', () => {
      const text = `
Database: postgresql://user:password123@localhost/db
API Key: sk-ant-api03-abcdefghijklmnopqrstuvwxyz123456789
GitHub Token: ghp_1234567890abcdefghijklmnopqrstuvwxyz
`;
      const result = sanitize(text);

      expect(result.detectedCount).toBeGreaterThanOrEqual(3);
      expect(result.detectedTypes).toContain('Database Connection String');
      expect(result.detectedTypes).toContain('Anthropic API Key');
      expect(result.detectedTypes).toContain('GitHub Personal Access Token');

      expect(result.sanitized).not.toContain('password123');
      expect(result.sanitized).not.toContain('abcdefghijklmnopqrstuvwxyz123456789');
      expect(result.sanitized).not.toContain('ghp_1234567890abcdefghijklmnopqrstuvwxyz');
    });
  });

  describe('Custom Patterns', () => {
    it('should support custom redaction patterns', () => {
      const customPatterns = [
        {
          name: 'Custom Secret',
          regex: /CUSTOM-[A-Z0-9]{10}/g,
          redactLevel: 'conservative' as const,
        },
      ];

      const text = 'My secret: CUSTOM-ABCDEFGHIJ';
      const result = sanitize(text, customPatterns);

      expect(result.detectedTypes).toContain('Custom Secret');
      expect(result.sanitized).toContain('CUS***HIJ');
    });
  });

  describe('sanitizeText Helper', () => {
    it('should return only sanitized text', () => {
      const text = 'API Key: sk-proj-1234567890abcdefghij';
      const sanitized = sanitizeText(text);

      expect(sanitized).toContain('sk-***hij');
      expect(sanitized).not.toContain('1234567890abcdefghij');
    });
  });

  describe('loadCustomPatterns', () => {
    it('should return empty array when no env var is set', () => {
      delete process.env.CLAUDE_ENHANCER_REDACT_PATTERNS;
      const patterns = loadCustomPatterns();

      expect(patterns).toHaveLength(0);
    });

    it('should parse valid JSON patterns from env var', () => {
      process.env.CLAUDE_ENHANCER_REDACT_PATTERNS = JSON.stringify([
        {
          name: 'Test Pattern',
          pattern: 'TEST-[0-9]+',
          redactLevel: 'strict',
        },
      ]);

      const patterns = loadCustomPatterns();

      expect(patterns).toHaveLength(1);
      expect(patterns[0].name).toBe('Test Pattern');
      expect(patterns[0].redactLevel).toBe('strict');

      delete process.env.CLAUDE_ENHANCER_REDACT_PATTERNS;
    });

    it('should handle invalid JSON gracefully', () => {
      process.env.CLAUDE_ENHANCER_REDACT_PATTERNS = 'invalid json';
      const patterns = loadCustomPatterns();

      expect(patterns).toHaveLength(0);

      delete process.env.CLAUDE_ENHANCER_REDACT_PATTERNS;
    });
  });

  describe('Pattern Coverage', () => {
    it('should have at least 10 predefined patterns', () => {
      expect(SENSITIVE_PATTERNS.length).toBeGreaterThanOrEqual(10);
    });

    it('should cover all major secret types', () => {
      const patternNames = SENSITIVE_PATTERNS.map((p) => p.name);

      expect(patternNames).toContain('OpenAI API Key');
      expect(patternNames).toContain('Anthropic API Key');
      expect(patternNames).toContain('GitHub Personal Access Token');
      expect(patternNames).toContain('JWT Token');
      expect(patternNames).toContain('AWS Access Key ID');
      expect(patternNames).toContain('Database Connection String');
      expect(patternNames).toContain('Private Key');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle Claude Code session response with API keys', () => {
      const text = `I've created a configuration file with the following content:

const config = {
  openaiApiKey: 'sk-proj-1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P',
  anthropicApiKey: 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz123',
  databaseUrl: 'postgresql://admin:MySecretPass123@db.example.com:5432/prod'
};

The configuration is now ready to use!`;

      const result = sanitize(text);

      expect(result.detectedCount).toBeGreaterThanOrEqual(3);
      expect(result.sanitized).not.toContain('1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P');
      expect(result.sanitized).not.toContain('abcdefghijklmnopqrstuvwxyz123');
      expect(result.sanitized).not.toContain('MySecretPass123');
      expect(result.sanitized).toContain('The configuration is now ready to use!');
    });

    it('should handle git commands with tokens', () => {
      const text = `Run this command:
git clone https://ghp_1234567890abcdefghijklmnopqrstuvwxyz@github.com/user/repo.git`;

      const result = sanitize(text);

      expect(result.sanitized).not.toContain('ghp_1234567890abcdefghijklmnopqrstuvwxyz');
      expect(result.sanitized).toContain('Run this command:');
      expect(result.sanitized).toContain('@github.com/user/repo.git');
    });

    it('should handle environment file content', () => {
      const text = `Here's your .env file:

OPENAI_API_KEY=sk-1234567890abcdefghij
DATABASE_URL=postgresql://user:password@localhost/db
JWT_SECRET=my-super-secret-key-123
API_TOKEN=ghp_1234567890abcdefghijklmnopqrstuvwxyz

Save this to your project root.`;

      const result = sanitize(text);

      expect(result.detectedCount).toBeGreaterThan(0);
      expect(result.sanitized).not.toContain('sk-1234567890abcdefghij');
      expect(result.sanitized).not.toContain('password');
      expect(result.sanitized).toContain('Save this to your project root.');
    });
  });
});

import { describe, it, expect } from 'vitest';
import { escapeMarkdownV2, formatTimestamp } from '../../src/utils/markdown.js';

describe('markdown utils', () => {
  describe('escapeMarkdownV2', () => {
    it('应该转义所有特殊字符', () => {
      const input = '_*[]()~`>#+-.=|{}.!';
      const expected = '\\_\\*\\[\\]\\(\\)\\~\\`\\>\\#\\+\\-\\.\\=\\|\\{\\}\\.\\!';
      expect(escapeMarkdownV2(input)).toBe(expected);
    });

    it('应该保留普通文本不变', () => {
      const input = 'Hello World 123';
      expect(escapeMarkdownV2(input)).toBe(input);
    });

    it('应该处理空字符串', () => {
      expect(escapeMarkdownV2('')).toBe('');
    });

    it('应该处理混合内容', () => {
      const input = 'Hello [World]!';
      const expected = 'Hello \\[World\\]\\!';
      expect(escapeMarkdownV2(input)).toBe(expected);
    });
  });

  describe('formatTimestamp', () => {
    it('应该格式化日期为 YYYY-MM-DD HH:mm:ss', () => {
      const date = new Date('2025-11-10T15:30:45');
      const result = formatTimestamp(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('应该正确填充单位数字', () => {
      const date = new Date('2025-01-05T08:09:07');
      const result = formatTimestamp(date);
      expect(result).toBe('2025-01-05 08:09:07');
    });
  });
});

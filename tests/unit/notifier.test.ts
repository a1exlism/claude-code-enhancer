import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { TelegramNotifier } from '../../src/utils/notifier.js';

// Mock axios
vi.mock('axios');

describe('TelegramNotifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该成功发送 Telegram 消息', async () => {
    const mockPost = vi.mocked(axios.post);
    mockPost.mockResolvedValue({ status: 200, data: { ok: true } });

    const notifier = new TelegramNotifier({
      botToken: 'test_token',
      chatId: 'test_chat_id',
    });

    await notifier.send('Test message');

    expect(mockPost).toHaveBeenCalledWith(
      'https://api.telegram.org/bottest_token/sendMessage',
      {
        chat_id: 'test_chat_id',
        text: 'Test message',
        parse_mode: 'MarkdownV2',
      },
      { timeout: 5_000 }
    );
  });

  it('应该处理发送失败的情况', async () => {
    const mockPost = vi.mocked(axios.post);
    mockPost.mockRejectedValue(new Error('Network error'));

    const notifier = new TelegramNotifier({
      botToken: 'test_token',
      chatId: 'test_chat_id',
    });

    // 不应该抛出错误
    await expect(notifier.send('Test message')).resolves.not.toThrow();
  });

  it('配置不完整时应该跳过发送', async () => {
    const mockPost = vi.mocked(axios.post);

    const notifier = new TelegramNotifier({
      botToken: '',
      chatId: 'test_chat_id',
    });

    await notifier.send('Test message');

    expect(mockPost).not.toHaveBeenCalled();
  });
});

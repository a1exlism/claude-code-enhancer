import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { LlmClient } from '../../src/utils/llm-client.js';

// Mock axios
vi.mock('axios');

describe('LlmClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该使用 OpenAI API 总结文本', async () => {
    const mockPost = vi.mocked(axios.post);
    mockPost.mockResolvedValue({
      status: 200,
      data: {
        choices: [{ message: { content: 'Summarized text' } }],
      },
    });

    const client = new LlmClient({
      apiType: 'openai',
      apiKey: 'test_key',
      apiBase: 'https://api.openai.com',
      model: 'gpt-4o-mini',
    });

    const result = await client.summarize('Long text to summarize');

    expect(result).toBe('Summarized text');
    expect(mockPost).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        temperature: 0.3,
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test_key',
        }),
      })
    );
  });

  it('应该使用 Anthropic API 总结文本', async () => {
    const mockPost = vi.mocked(axios.post);
    mockPost.mockResolvedValue({
      status: 200,
      data: {
        content: [{ text: 'Summarized by Claude' }],
      },
    });

    const client = new LlmClient({
      apiType: 'anthropic',
      apiKey: 'test_key',
      apiBase: 'https://api.anthropic.com',
      model: 'claude-3-haiku-20240307',
    });

    const result = await client.summarize('Long text to summarize');

    expect(result).toBe('Summarized by Claude');
    expect(mockPost).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        model: 'claude-3-haiku-20240307',
        max_tokens: 400,
        temperature: 0.3,
        system: expect.any(String), // system role 从提示词中提取
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-api-key': 'test_key',
        }),
      })
    );
  });

  it('API 调用失败时应该返回原文本', async () => {
    const mockPost = vi.mocked(axios.post);
    mockPost.mockRejectedValue(new Error('API error'));

    const client = new LlmClient({
      apiType: 'openai',
      apiKey: 'test_key',
      apiBase: 'https://api.openai.com',
      model: 'gpt-4o-mini',
    });

    const originalText = 'Original text';
    const result = await client.summarize(originalText);

    expect(result).toBe(originalText);
  });

  it('缺少 API Key 时应该返回原文本', async () => {
    const client = new LlmClient({
      apiType: 'openai',
      apiKey: '',
      apiBase: 'https://api.openai.com',
      model: 'gpt-4o-mini',
    });

    const originalText = 'Original text';
    const result = await client.summarize(originalText);

    expect(result).toBe(originalText);
  });
});

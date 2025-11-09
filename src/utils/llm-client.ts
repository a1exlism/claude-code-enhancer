import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type LlmApiType = "openai" | "azure" | "anthropic";

export interface LlmConfig {
  apiType: LlmApiType;
  apiKey: string;
  apiBase: string;
  model: string;
}

/**
 * LLM API 客户端
 * 支持 OpenAI、Azure、Anthropic 三种 API
 */
export class LlmClient {
  constructor(private config: LlmConfig) {}

  /**
   * 使用 LLM 总结文本
   * @param text 原始文本
   * @param maxLength 最大输入长度（默认 2000 字符）
   * @returns 总结后的文本，失败时返回原文本
   */
  async summarize(text: string, maxLength = 2000): Promise<string> {
    if (!text || !this.config.apiKey) {
      return text;
    }

    const promptPath = path.resolve(__dirname, "..", "..", "summary_prompt.txt");
    if (!fs.existsSync(promptPath)) {
      return text;
    }

    try {
      const template = fs.readFileSync(promptPath, "utf-8");
      const prompt = template.replace(/\{response\}/g, text.slice(0, maxLength));

      const response = await this.callApi(prompt);
      return response || text;
    } catch {
      // 吞噬 LLM 错误，返回原文本
      return text;
    }
  }

  /**
   * 提取 system 角色（仅用于 Claude）
   */
  private extractSystemRole(prompt: string): string | undefined {
    const match = prompt.match(/<role>([\s\S]*?)<\/role>/);
    return match ? match[1].trim() : undefined;
  }

  /**
   * 调用 LLM API
   * @param prompt 提示词
   * @returns API 响应文本
   */
  private async callApi(prompt: string): Promise<string | null> {
    const { apiType, apiKey, apiBase, model } = this.config;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    let url: string;
    let payload: Record<string, unknown>;

    if (apiType === "anthropic") {
      // Claude 最佳实践：使用独立的 system 参数
      const systemRole = this.extractSystemRole(prompt);

      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      url = `${apiBase}/v1/messages`;
      payload = {
        model,
        max_tokens: 400, // 增加 token 限制以支持更长的总结
        temperature: 0.3, // 降低随机性，提高一致性
        messages: [{ role: "user", content: prompt }],
      };

      // 如果提取到 system role，添加到 payload
      if (systemRole) {
        payload.system = systemRole;
      }
    } else if (apiType === "azure") {
      headers["api-key"] = apiKey;
      url = `${apiBase}/openai/deployments/${model}/chat/completions?api-version=2024-02-15-preview`;
      payload = {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.3,
      };
    } else {
      // OpenAI 或兼容 API
      headers["Authorization"] = `Bearer ${apiKey}`;
      url = `${apiBase}/v1/chat/completions`;
      payload = {
        model,
        max_tokens: 300,
        temperature: 0.3,
        messages: [{ role: "user", content: prompt }],
      };
    }

    const response = await axios.post(url, payload, { headers, timeout: 10_000 });

    if (response.status === 200) {
      if (apiType === "anthropic") {
        const content = response.data?.content;
        if (Array.isArray(content) && content[0]?.text) {
          return content[0].text as string;
        }
      } else {
        const choice = response.data?.choices?.[0]?.message?.content;
        if (typeof choice === "string") {
          return choice;
        }
      }
    }

    return null;
  }
}

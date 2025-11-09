import axios from "axios";
import * as logger from "./logger.js";

/**
 * 通知器接口
 * 为未来扩展其他通知渠道（Slack、Discord 等）预留接口
 */
export interface Notifier {
  /**
   * 发送通知消息
   * @param message 消息内容
   */
  send(message: string): Promise<void>;
}

/**
 * Telegram 通知器配置
 */
export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

/**
 * Telegram 通知器实现
 * 使用 MarkdownV2 格式发送消息
 */
export class TelegramNotifier implements Notifier {
  constructor(private config: TelegramConfig) {}

  async send(message: string): Promise<void> {
    const { botToken, chatId } = this.config;

    if (!botToken || !chatId) {
      logger.error("Telegram 配置不完整，跳过通知");
      return;
    }

    const payload = {
      chat_id: chatId,
      text: message,
      parse_mode: "MarkdownV2",
    };

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    try {
      const resp = await axios.post(url, payload, { timeout: 5_000 });
      const body = typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data);
      logger.info(`Telegram 通知发送成功: ${resp.status} ${body}`);
    } catch (error) {
      logger.error("Telegram 通知发送失败", error as Error);
    }
  }
}

/**
 * 创建 Telegram 通知器
 * @param botToken Bot Token
 * @param chatId Chat ID
 * @returns Telegram 通知器实例
 */
export function createTelegramNotifier(botToken: string, chatId: string): Notifier {
  return new TelegramNotifier({ botToken, chatId });
}

/**
 * Telegram MarkdownV2 格式需要转义的特殊字符
 */
const ESCAPE_REGEX = /[\\_*\[\]()~`>#+\-=|{}.!]/g;

/**
 * 转义 Telegram MarkdownV2 格式的特殊字符
 * @param text 原始文本
 * @returns 转义后的文本
 */
export function escapeMarkdownV2(text: string): string {
  return text.replace(ESCAPE_REGEX, (match) => `\\${match}`);
}

/**
 * 格式化时间戳为 YYYY-MM-DD HH:mm:ss 格式
 * @param date 日期对象
 * @returns 格式化后的时间字符串
 */
export function formatTimestamp(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

import fs from "node:fs";

const LOG_FILE = "/tmp/claude_hook_debug.log";

/**
 * 追加日志到文件
 * @param content 日志内容
 */
export function appendLog(content: string): void {
  try {
    fs.appendFileSync(LOG_FILE, content, { encoding: "utf-8" });
  } catch {
    // 忽略日志写入失败
  }
}

/**
 * 记录调试信息
 * @param message 调试消息
 */
export function debug(message: string): void {
  appendLog(`[DEBUG] ${new Date().toISOString()} - ${message}\n`);
}

/**
 * 记录错误信息
 * @param message 错误消息
 * @param error 错误对象（可选）
 */
export function error(message: string, error?: Error): void {
  const errorMsg = error ? ` - ${error.message}` : "";
  appendLog(`[ERROR] ${new Date().toISOString()} - ${message}${errorMsg}\n`);
}

/**
 * 记录信息
 * @param message 信息内容
 */
export function info(message: string): void {
  appendLog(`[INFO] ${new Date().toISOString()} - ${message}\n`);
}

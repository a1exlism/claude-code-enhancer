#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import readline from "node:readline";
import { loadEnvFiles } from "./utils/env.js";
import { escapeMarkdownV2, formatTimestamp } from "./utils/markdown.js";
import { LlmClient, type LlmApiType } from "./utils/llm-client.js";
import { createTelegramNotifier } from "./utils/notifier.js";
import { sanitize, loadCustomPatterns } from "./utils/sanitizer.js";
import * as logger from "./utils/logger.js";

const PRECOMPACT_MARKER = "/tmp/claude_precompact_marker";

interface HookPayload {
  hook_event_name?: string;
  reason?: string;
  message?: unknown;
  notification_message?: unknown;
  cwd?: string;
  transcript_path?: string;
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.resume();
  });
}

async function extractLastAssistantResponse(transcriptPath: string): Promise<string> {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    return "";
  }

  return new Promise((resolve) => {
    let lastResponse = "";
    let stream: fs.ReadStream;
    try {
      stream = fs.createReadStream(transcriptPath, { encoding: "utf-8" });
    } catch {
      resolve("");
      return;
    }
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return;
      }
      try {
        const entry = JSON.parse(trimmed);
        if (entry?.type === "assistant" && entry?.message?.role === "assistant" && Array.isArray(entry?.message?.content)) {
          for (const item of entry.message.content) {
            if (item?.type === "text" && typeof item?.text === "string") {
              lastResponse = item.text;
            }
          }
        }
      } catch {
        // 忽略格式错误的行
      }
    });

    const finalize = () => resolve(lastResponse);
    rl.on("close", finalize);
    rl.on("error", finalize);
  });
}

function touchMarker(filePath: string): void {
  try {
    fs.closeSync(fs.openSync(filePath, "a"));
  } catch {
    // 忽略 touch 失败
  }
}

function removeMarker(filePath: string): void {
  try {
    fs.rmSync(filePath, { force: true });
  } catch {
    // 忽略删除失败
  }
}

async function main(): Promise<void> {
  const jsonInput = await readStdin();
  logger.info(`收到 Hook 事件`);
  logger.debug(`JSON 输入: ${jsonInput}`);

  let payload: HookPayload;
  try {
    payload = JSON.parse(jsonInput);
  } catch {
    logger.error("JSON 解析失败");
    return;
  }

  loadEnvFiles();

  const botToken = process.env.TELEGRAM_BOT_TOKEN_AIAGENTNOTIFY ?? "";
  const chatId = process.env.TELEGRAM_CHAT_ID_AIAGENTNOTIFY ?? "";
  const enableSummary = (process.env.AIAGENT_ENABLE_SUMMARY ?? "false").toLowerCase() === "true";
  const llmApiType: LlmApiType = (process.env.AIAGENT_LLM_API_TYPE ?? "openai") as LlmApiType;
  const llmApiKey = process.env.AIAGENT_LLM_API_KEY ?? "";
  const llmApiBase = process.env.AIAGENT_LLM_API_BASE ?? "https://api.openai.com";
  const llmModel = process.env.AIAGENT_LLM_MODEL ?? "gpt-4o-mini";

  if (!botToken || !chatId) {
    logger.error("Telegram 配置不完整，跳过通知");
    return;
  }

  const hookEvent = payload.hook_event_name ?? "Unknown";
  const allowedEvents = new Set(["SessionEnd", "Stop", "Notification", "PreCompact"]);

  if (!allowedEvents.has(hookEvent)) {
    logger.debug(`忽略事件: ${hookEvent}`);
    return;
  }

  if (hookEvent === "SessionEnd" && payload.reason === "clear") {
    logger.debug("忽略 /clear 命令触发的 SessionEnd");
    return;
  }

  if (hookEvent === "PreCompact") {
    touchMarker(PRECOMPACT_MARKER);
  } else if (hookEvent === "Notification" && fs.existsSync(PRECOMPACT_MARKER)) {
    try {
      const stat = fs.statSync(PRECOMPACT_MARKER);
      const secondsFromMarker = Date.now() / 1000 - stat.mtimeMs / 1000;
      if (secondsFromMarker < 5) {
        logger.debug("PreCompact 事件去重，跳过 Notification");
        return;
      }
      removeMarker(PRECOMPACT_MARKER);
    } catch {
      // 忽略 stat 错误
    }
  }

  const transcriptPath = typeof payload.transcript_path === "string" ? payload.transcript_path : "";
  const lastResponse = await extractLastAssistantResponse(transcriptPath);
  const timestamp = formatTimestamp(new Date());
  const cwdValue = typeof payload.cwd === "string" ? payload.cwd : "Unknown";
  const projectPath = escapeMarkdownV2(cwdValue.replace(os.homedir(), "~"));

  let emoji: string;
  let eventText: string;

  switch (hookEvent) {
    case "Stop":
      emoji = "🛑";
      eventText = "Claude Session Stopped";
      break;
    case "Notification":
      emoji = "❌";
      eventText = "Claude Error/Notification";
      break;
    case "PreCompact":
      emoji = "⚠️";
      eventText = "Context Limit Warning";
      break;
    default:
      emoji = "✅";
      eventText = "Claude Session Ended";
      break;
  }

  let messageText = `*${emoji} ${eventText}*\n\n`;
  messageText += `*⏰ Time:* \`${escapeMarkdownV2(timestamp)}\`\n`;
  messageText += `*📂 Project:* \`${projectPath}\`\n`;

  if (hookEvent === "Notification" || hookEvent === "PreCompact") {
    const rawDetail = (typeof payload.message === "string" && payload.message) ? payload.message : (typeof payload.notification_message === "string" ? payload.notification_message : "");
    if (rawDetail) {
      const detail = escapeMarkdownV2(rawDetail.slice(0, 300));
      messageText += `\n*📋 Details:*\n\`${detail}\`\n`;
    }
  }

  if (lastResponse) {
    let responseToShow = lastResponse;
    if (enableSummary && llmApiKey && lastResponse.length > 200) {
      const llmClient = new LlmClient({
        apiType: llmApiType,
        apiKey: llmApiKey,
        apiBase: llmApiBase,
        model: llmModel,
      });
      responseToShow = await llmClient.summarize(lastResponse);
    }

    // 敏感信息过滤
    const customPatterns = loadCustomPatterns();
    const sanitizeResult = sanitize(responseToShow, customPatterns);

    if (sanitizeResult.detectedCount > 0) {
      logger.info(`检测到 ${sanitizeResult.detectedCount} 处敏感信息已脱敏: ${sanitizeResult.detectedTypes.join(', ')}`);
    }

    const escapedResponse = escapeMarkdownV2(sanitizeResult.sanitized.slice(0, 500));
    messageText += `\n*💬 Last Response:*\n\`${escapedResponse}\``;

    if (sanitizeResult.detectedCount > 0) {
      messageText += `\n⚠️ _检测到 ${sanitizeResult.detectedCount} 处敏感信息已自动脱敏_`;
    }
  }

  const notifier = createTelegramNotifier(botToken, chatId);
  await notifier.send(messageText);
}

main().catch((error) => {
  logger.error("致命错误", error as Error);
  process.exit(1);
});

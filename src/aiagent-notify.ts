import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import axios from "axios";
import { parse as parseEnv } from "dotenv";

const LOG_FILE = "/tmp/claude_hook_debug.log";
const PRECOMPACT_MARKER = "/tmp/claude_precompact_marker";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type LlmApiType = "openai" | "azure" | "anthropic" | string;

interface HookPayload {
  hook_event_name?: string;
  reason?: string;
  message?: unknown;
  notification_message?: unknown;
  cwd?: string;
  transcript_path?: string;
}

const ESCAPE_REGEX = /[\\_*\[\]()~`>#+\-=|{}.!]/g;

function appendLog(content: string): void {
  try {
    fs.appendFileSync(LOG_FILE, content, { encoding: "utf-8" });
  } catch {
    // ignore logging failures
  }
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

function loadEnvFiles(): void {
  const candidates = [path.resolve(".env"), path.join(os.homedir(), ".env")];
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) {
      continue;
    }
    try {
      const parsed = parseEnv(fs.readFileSync(envPath, "utf-8"));
      for (const [key, value] of Object.entries(parsed)) {
        if (process.env[key] === undefined && value !== undefined) {
          process.env[key] = value;
        }
      }
    } catch {
      // ignore malformed env files
    }
  }
}

function escapeMarkdownV2(text: string): string {
  return text.replace(ESCAPE_REGEX, (match) => `\\${match}`);
}

function formatTimestamp(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
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
        // ignore malformed lines
      }
    });

    const finalize = () => resolve(lastResponse);
    rl.on("close", finalize);
    rl.on("error", finalize);
  });
}

async function summarizeWithLLM(
  text: string,
  apiType: LlmApiType,
  apiKey: string,
  apiBase: string,
  model: string,
): Promise<string> {
  if (!text || !apiKey) {
    return text;
  }

  const promptPath = path.resolve(__dirname, "..", "summary_prompt.txt");
  if (!fs.existsSync(promptPath)) {
    return text;
  }

  try {
    const template = fs.readFileSync(promptPath, "utf-8");
    const prompt = template.replace(/\{response\}/g, text.slice(0, 2000));

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    let url: string;
    let payload: Record<string, unknown>;

    if (apiType === "anthropic") {
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      url = `${apiBase}/v1/messages`;
      payload = {
        model,
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      };
    } else if (apiType === "azure") {
      headers["api-key"] = apiKey;
      url = `${apiBase}/openai/deployments/${model}/chat/completions?api-version=2024-02-15-preview`;
      payload = {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
      };
    } else {
      headers["Authorization"] = `Bearer ${apiKey}`;
      url = `${apiBase}/v1/chat/completions`;
      payload = {
        model,
        max_tokens: 200,
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
  } catch {
    // swallow LLM errors and fall back to original text
  }

  return text;
}

function touchMarker(filePath: string): void {
  try {
    fs.closeSync(fs.openSync(filePath, "a"));
  } catch {
    // ignore touch failures
  }
}

function removeMarker(filePath: string): void {
  try {
    fs.rmSync(filePath, { force: true });
  } catch {
    // ignore removal failures
  }
}

async function sendTelegramNotification(token: string, chatId: string, text: string): Promise<void> {
  const payload = { chat_id: chatId, text, parse_mode: "MarkdownV2" };
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const resp = await axios.post(url, payload, { timeout: 5_000 });
    const body = typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data);
    appendLog(`Response: ${resp.status} ${body}\n`);
  } catch (error) {
    appendLog(`Error: ${(error as Error).message}\n`);
  }
}

async function main(): Promise<void> {
  const jsonInput = await readStdin();
  appendLog(`=== ${new Date().toISOString()} ===\n`);
  appendLog(`Received JSON: ${jsonInput}\n`);

  let payload: HookPayload;
  try {
    payload = JSON.parse(jsonInput);
  } catch {
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
    return;
  }

  const hookEvent = payload.hook_event_name ?? "Unknown";
  const allowedEvents = new Set(["SessionEnd", "Stop", "Notification", "PreCompact"]);

  if (!allowedEvents.has(hookEvent)) {
    return;
  }

  if (hookEvent === "SessionEnd" && payload.reason === "clear") {
    return;
  }

  if (hookEvent === "PreCompact") {
    touchMarker(PRECOMPACT_MARKER);
  } else if (hookEvent === "Notification" && fs.existsSync(PRECOMPACT_MARKER)) {
    try {
      const stat = fs.statSync(PRECOMPACT_MARKER);
      const secondsFromMarker = Date.now() / 1000 - stat.mtimeMs / 1000;
      if (secondsFromMarker < 5) {
        return;
      }
      removeMarker(PRECOMPACT_MARKER);
    } catch {
      // ignore stat errors
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
      responseToShow = await summarizeWithLLM(lastResponse, llmApiType, llmApiKey, llmApiBase, llmModel);
    }
    const escapedResponse = escapeMarkdownV2(responseToShow.slice(0, 500));
    messageText += `\n*💬 Last Response:*\n\`${escapedResponse}\``;
  }

  await sendTelegramNotification(botToken, chatId, messageText);
}

main().catch((error) => {
  appendLog(`Fatal Error: ${(error as Error).message}\n`);
  process.exit(1);
});

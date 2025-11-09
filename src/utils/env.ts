import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse as parseEnv } from "dotenv";

/**
 * 加载环境变量文件
 * 优先级：当前项目 .env > 用户主目录 ~/.env
 * 不会覆盖已存在的环境变量
 */
export function loadEnvFiles(): void {
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
      // 忽略格式错误的 .env 文件
    }
  }
}

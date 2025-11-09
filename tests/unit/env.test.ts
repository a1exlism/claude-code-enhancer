import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadEnvFiles } from '../../src/utils/env.js';

describe('env utils', () => {
  const testEnvPath = path.resolve('.env.test');
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // 清理环境变量
    for (const key in process.env) {
      if (key.startsWith('TEST_')) {
        delete process.env[key];
      }
    }
  });

  afterEach(() => {
    // 恢复原始环境变量
    process.env = { ...originalEnv };
    // 清理测试文件
    if (fs.existsSync(testEnvPath)) {
      fs.unlinkSync(testEnvPath);
    }
  });

  it('应该加载项目级 .env 文件', () => {
    fs.writeFileSync(testEnvPath, 'TEST_VAR=project_value\n');

    // 临时重命名为 .env
    fs.renameSync(testEnvPath, '.env');

    loadEnvFiles();

    expect(process.env.TEST_VAR).toBe('project_value');

    // 恢复文件名
    fs.renameSync('.env', testEnvPath);
  });

  it('不应该覆盖已存在的环境变量', () => {
    process.env.TEST_VAR = 'existing_value';

    fs.writeFileSync(testEnvPath, 'TEST_VAR=new_value\n');
    fs.renameSync(testEnvPath, '.env');

    loadEnvFiles();

    expect(process.env.TEST_VAR).toBe('existing_value');

    fs.renameSync('.env', testEnvPath);
  });

  it('应该忽略不存在的 .env 文件', () => {
    expect(() => loadEnvFiles()).not.toThrow();
  });

  it('应该忽略格式错误的 .env 文件', () => {
    fs.writeFileSync(testEnvPath, 'INVALID LINE WITHOUT EQUALS\n');
    fs.renameSync(testEnvPath, '.env');

    expect(() => loadEnvFiles()).not.toThrow();

    fs.renameSync('.env', testEnvPath);
  });
});

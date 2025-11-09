import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SHEBANG = '#!/usr/bin/env node';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

const targets = [
  'aiagent-notify.js',
  'setup-claude.js',
  'skill-install.js',
];

async function ensureShebang(fileName) {
  const filePath = path.join(distDir, fileName);

  try {
    const content = await fs.readFile(filePath, 'utf8');
    if (content.startsWith(SHEBANG)) {
      await fs.chmod(filePath, 0o755);
      return;
    }

    await fs.writeFile(filePath, `${SHEBANG}\n${content}`);
    await fs.chmod(filePath, 0o755);
  } catch (error) {
    console.error(`[postbuild] Unable to update shebang for ${fileName}:`, error);
    process.exitCode = 1;
  }
}

for (const target of targets) {
  // Top-level await avoids fail-fast when multiple files need updates.
  await ensureShebang(target);
}

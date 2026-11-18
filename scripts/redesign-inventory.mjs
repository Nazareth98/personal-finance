import { spawnSync } from 'node:child_process';

// Gera capturas das telas autenticadas com dados fictícios em output/redesign-inventory/.
const result = spawnSync('pnpm', ['exec', 'playwright', 'test', '-c', 'playwright.auth.config.ts', '-g', 'redesign', '--reporter=line'], {
  stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, REDESIGN_INVENTORY: '1' }
});
process.exit(result.status ?? 1);

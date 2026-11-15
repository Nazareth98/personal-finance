import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const example = await readFile(new URL('../apps/web/.env.example', import.meta.url), 'utf8');
const qualityWorkflow = await readFile(new URL('../.github/workflows/design-system.yml', import.meta.url), 'utf8');
const visualWorkflow = await readFile(new URL('../.github/workflows/visual-regression.yml', import.meta.url), 'utf8');

assert.equal(vercel.installCommand, 'pnpm install --frozen-lockfile');
assert.equal(vercel.buildCommand, 'pnpm vercel:build');
assert.equal(vercel.outputDirectory, 'apps/web/dist');
assert.ok(vercel.headers.some(entry => entry.source === '/sw.js' && entry.headers.some(header => header.key === 'Cache-Control' && header.value.includes('must-revalidate'))));
assert.match(packageJson.scripts['vercel:build'], /validate-deploy-env/);
assert.match(example, /^VITE_SUPABASE_URL=/m);
assert.match(example, /^VITE_SUPABASE_PUBLISHABLE_KEY=/m);
for (const workflow of [qualityWorkflow, visualWorkflow]) {
  assert.match(workflow, /node-version: '22\.12\.0'/);
  assert.match(workflow, /pnpm install --frozen-lockfile/);
}
assert.match(visualWorkflow, /pnpm test:pwa/);
assert.match(visualWorkflow, /pnpm test:auth/);

console.log('Vercel and GitHub Actions deployment contracts passed.');

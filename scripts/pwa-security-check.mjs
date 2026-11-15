import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';

const root = new URL('../apps/web/public/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.webmanifest', root), 'utf8'));
const worker = await readFile(new URL('sw.js', root), 'utf8');
const offline = await readFile(new URL('offline.html', root), 'utf8');

assert.equal(manifest.display, 'standalone');
assert.equal(manifest.lang, 'pt-BR');
assert.match(manifest.start_url, /^\/#overview$/);
assert.ok(manifest.icons.some(icon => icon.sizes === '192x192'));
assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'));
for (const icon of manifest.icons) {
  const path = new URL(icon.src.replace(/^\//, ''), root);
  await access(path);
  assert.ok((await stat(path)).size > 1000, `${icon.src} precisa conter um ícone real`);
}
assert.match(worker, /request\.headers\.has\('authorization'\)/i);
for (const route of ['/rest/v1/', '/auth/v1/', '/functions/v1/']) assert.ok(worker.includes(route));
assert.match(worker, /url\.hostname\.includes\('supabase'\)/);
assert.match(worker, /request\.mode === 'navigate'[\s\S]*caches\.match\('\/offline\.html'\)/);
assert.doesNotMatch(worker, /cache\.put\([^\n]*response[^\n]*json/i, 'respostas financeiras não podem ser persistidas');
assert.match(offline, /dados financeiros não ficam disponíveis offline/i);

console.log('PWA shell and private-data cache boundaries passed.');

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [config, environment, fixture] = await Promise.all([
  readFile('supabase/config.toml', 'utf8'),
  readFile('.env.example', 'utf8'),
  readFile('supabase/fixtures/pluggy/transactions.json', 'utf8').then(JSON.parse)
]);

assert.match(config, /enable_signup = false/, 'Cadastro público deve permanecer desativado.');
assert.match(config, /site_url = "http:\/\/127\.0\.0\.1:5173"/, 'Auth local deve retornar ao Vite.');
assert.doesNotMatch(environment, /^VITE_.*PLUGGY/im, 'Secrets Pluggy não podem ser expostos pelo Vite.');
assert.ok(Array.isArray(fixture.results) && fixture.results.length > 0, 'Fixture Pluggy precisa ter resultados.');
assert.ok(fixture.results.every(item => item.id.startsWith('fixture-')), 'Fixtures devem usar IDs sintéticos.');

console.log('✓ Fundação, ambiente e fixtures validados.');

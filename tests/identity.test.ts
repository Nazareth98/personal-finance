import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
test('cliente contém apenas a chave pública e fluxo PKCE', () => {
  const source = readFileSync('src/lib/supabase.ts','utf8');
  expect(source).toContain("flowType: 'pkce'");
  expect(source).not.toMatch(/service_role|SERVICE_ROLE/);
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile('supabase/migrations/202611130002_owner_access.sql', 'utf8');

assert.match(sql, /alter table public\.profiles enable row level security/i);
assert.match(sql, /revoke all on table public\.profiles from anon, authenticated/i);
assert.match(sql, /grant select on table public\.profiles to authenticated/i);
assert.match(sql, /id = \(select auth\.uid\(\)\)/i);
assert.match(sql, /create unique index profiles_single_owner/i);
assert.doesNotMatch(sql, /grant (insert|update|delete|all).*authenticated/i);
assert.doesNotMatch(sql, /grant .*\bto anon\b/i);

console.log('✓ Cadastro único, grants e RLS de acesso validados estaticamente.');

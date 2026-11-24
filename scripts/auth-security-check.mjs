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

const review = await readFile('supabase/migrations/20261123225503_review_start_date.sql', 'utf8');
assert.match(review, /add column review_start_date date/i);
assert.match(review, /check \(review_start_date is null or review_start_date between/i);
assert.match(review, /revoke update on public\.profiles from public, anon, authenticated/i);
assert.match(review, /grant update \(review_start_date\) on public\.profiles to authenticated/i);
assert.match(review, /using \(id = \(select auth\.uid\(\)\) and is_owner\)/i);
assert.match(review, /with check \(id = \(select auth\.uid\(\)\) and is_owner\)/i);
assert.doesNotMatch(review, /grant update on|grant .*to anon|security definer/i);
console.log('✓ Preferência de revisão: escrita restrita à coluna e ao proprietário.');

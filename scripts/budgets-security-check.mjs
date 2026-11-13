import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile('supabase/migrations/202611130004_category_budgets.sql', 'utf8');

assert.match(sql, /create table public\.category_budgets/i);
assert.match(sql, /percentage_basis_points smallint not null check \(percentage_basis_points between 1 and 10000\)/i);
assert.match(sql, /unique \(owner_id, category_id\)/i);
assert.match(sql, /enable row level security/i);
assert.match(sql, /grant select on table public\.category_budgets to authenticated/i);
assert.doesNotMatch(sql, /grant (insert|update|delete).*category_budgets/i);
assert.doesNotMatch(sql, /grant .* to anon/i);
assert.match(sql, /security definer set search_path = public, pg_temp/i);
assert.match(sql, /grant execute on function public\.set_category_budget\(text, integer\) to authenticated/i);
assert.match(sql, /owner_id = \(select auth\.uid\(\)\)/i);

console.log('✓ Metas por categoria, grants e RLS validados estaticamente.');

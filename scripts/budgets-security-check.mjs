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

const deletion = await readFile('supabase/migrations/20261118190000_delete_category_budget.sql', 'utf8');
assert.match(deletion, /security definer set search_path = public, pg_temp/i);
assert.match(deletion, /where owner_id = current_owner and category_id = p_category_id/i);
assert.match(deletion, /revoke all on function public\.delete_category_budget\(text\) from public, anon/i);
assert.match(deletion, /grant execute on function public\.delete_category_budget\(text\) to authenticated/i);
assert.doesNotMatch(deletion, /grant (insert|update|delete).*category_budgets/i);
assert.doesNotMatch(deletion, /to anon/i);

const amounts = await readFile('supabase/migrations/20261119100000_budget_amounts.sql', 'utf8');
assert.match(amounts, /drop column percentage_basis_points/i);
assert.match(amounts, /monthly_limit_cents bigint not null check \(monthly_limit_cents > 0/i);
assert.match(amounts, /drop function public\.set_category_budget\(text, integer\)/i);
assert.match(amounts, /security definer set search_path = public, pg_temp/i);
assert.match(amounts, /where id = p_category_id and applicability = 'expense'/i);
assert.match(amounts, /revoke all on function public\.set_category_budget\(text, bigint\) from public, anon/i);
assert.match(amounts, /grant execute on function public\.set_category_budget\(text, bigint\) to authenticated/i);
assert.doesNotMatch(amounts, /grant (insert|update|delete).*category_budgets/i);
assert.doesNotMatch(amounts, /to anon/i);

console.log('✓ Metas por categoria (valor mensal), exclusão, grants e RLS validados estaticamente.');

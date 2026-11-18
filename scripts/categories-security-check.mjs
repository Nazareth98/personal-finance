import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile('supabase/migrations/20261118114842_category_management.sql', 'utf8');

assert.match(sql, /category_type text not null default 'system'/i);
assert.match(sql, /applicability text check \(applicability in \('income', 'expense', 'neutral'\)\)/i);
assert.match(sql, /owner reads available categories/i);
assert.match(sql, /category_type = 'system' or owner_id = \(select auth\.uid\(\)\)/i);
assert.match(sql, /create function private\.require_owner\(\)/i);
assert.match(sql, /Category has dependencies and cannot be deleted/i);
assert.match(sql, /update public\.transaction_classifications set category_id = p_replacement_category_id/i);
assert.match(sql, /update public\.classification_rules set category_id = p_replacement_category_id/i);
assert.match(sql, /update public\.categories set archived_at = now\(\)/i);
assert.match(sql, /create trigger transactions_validate_category/i);
assert.match(sql, /create trigger transaction_classifications_validate_category/i);
assert.match(sql, /update public\.classification_rules set enabled = false/i);
assert.doesNotMatch(sql, /grant (insert|update|delete) on table public\.categories to authenticated/i);
for (const signature of [
  'create_category\\(text, text\\)', 'rename_category\\(text, text\\)', 'move_category\\(text, integer\\)',
  'archive_category\\(text, text\\)', 'delete_category\\(text\\)', 'get_category_usage\\(\\)'
]) assert.match(sql, new RegExp(`grant execute on function public\\.${signature} to authenticated`, 'i'));

console.log('✓ Gestão autenticada, arquivamento e integridade de categorias validados estaticamente.');

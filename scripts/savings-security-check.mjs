import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile('supabase/migrations/202611130005_savings_boxes.sql', 'utf8');

assert.match(sql, /create table public\.savings_boxes/i);
assert.match(sql, /create table public\.savings_movements/i);
assert.match(sql, /transaction_id uuid not null unique references public\.transactions/i);
assert.match(sql, /movement_type in \('contribution', 'withdrawal'\)/i);
assert.match(sql, /enable row level security/ig);
assert.match(sql, /grant select on table public\.savings_boxes, public\.savings_movements to authenticated/i);
assert.doesNotMatch(sql, /grant (insert|update|delete).*savings_/i);
assert.doesNotMatch(sql, /grant .* to anon/i);
assert.match(sql, /source = 'pluggy' and reporting = 'neutral'/i);
assert.match(sql, /nature in \('own_transfer', 'savings_contribution', 'savings_withdrawal'\)/i);
assert.match(sql, /'neutral', 'manual'/i);
assert.match(sql, /grant execute on function public\.create_savings_movement/i);
assert.match(sql, /grant execute on function public\.link_savings_movement/i);

const management = await readFile('supabase/migrations/20261118200000_savings_box_management.sql', 'utf8');
assert.match(management, /create unique index savings_boxes_owner_active_name on public\.savings_boxes \(owner_id, name\) where archived_at is null/i);
assert.match(management, /owner_id = current_owner and archived_at is null for update/i);
assert.match(management, /balance would be negative/i);
assert.match(management, /set archived_at = now\(\)/i);
assert.match(management, /exists \(select 1 from public\.savings_movements where savings_box_id = p_savings_box_id\)/i);
assert.equal((management.match(/security definer set search_path = public, pg_temp/gi) ?? []).length, 2);
assert.match(management, /grant execute on function public\.update_savings_box\(uuid, text, bigint, bigint, date\) to authenticated/i);
assert.match(management, /grant execute on function public\.delete_savings_box\(uuid\) to authenticated/i);
assert.doesNotMatch(management, /grant (insert|update|delete).*savings_/i);
assert.doesNotMatch(management, /to anon/i);

console.log('✓ Caixinhas, movimentos patrimoniais, edição/exclusão, grants e RLS validados estaticamente.');

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

console.log('✓ Caixinhas, movimentos patrimoniais, grants e RLS validados estaticamente.');

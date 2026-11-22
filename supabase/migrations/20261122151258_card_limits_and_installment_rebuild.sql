-- D-077: limite e disponivel informados pelo banco; parcelas previstas sao recalculadas pela sincronizacao.
alter table public.credit_cards
  add column if not exists available_limit_cents bigint check (available_limit_cents is null or available_limit_cents >= -100000000000),
  add column if not exists limit_updated_at timestamptz;

-- Dado derivado: a proxima sincronizacao recria as parcelas com a chave de agrupamento estavel.
delete from public.card_installments;

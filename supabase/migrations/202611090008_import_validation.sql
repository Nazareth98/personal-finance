-- Validar também a fronteira servidor: REST/restore não podem inserir propostas
-- malformadas que ultrapassem o parser local ou quebrem a fila de revisão.
create function private.validate_import_proposal() returns trigger language plpgsql security definer set search_path='' as $$
declare p jsonb:=new.proposal; field text; amount public.cents; idx integer; count_parcels integer;
begin
 if jsonb_typeof(p) is distinct from 'object' or jsonb_typeof(p->'description') is distinct from 'string' or length(p->>'description') not between 1 and 500 then raise exception 'Descrição de importação inválida';end if;
 if jsonb_typeof(p->'amount_cents') is distinct from 'string' or (p->>'amount_cents') !~ '^-?[0-9]{1,13}$' then raise exception 'Valor de importação inválido';end if;
 amount:=(p->>'amount_cents')::bigint;if amount=0 then raise exception 'Valor zero não é movimento';end if;
 foreach field in array array['event_date','bank_date','competence'] loop
 if jsonb_typeof(p->field) is distinct from 'string' or (p->>field) !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Data de importação inválida';end if;
 perform (p->>field)::date;
 end loop;
 if extract(day from (p->>'competence')::date)<>1 then raise exception 'Competência exige primeiro dia';end if;
 if p->>'nature' is null or p->>'nature' not in ('expense','income','transfer','contribution','redemption','card_payment','benefit','loan','refund') then raise exception 'Natureza de importação inválida';end if;
 if p ? 'external_key' and (jsonb_typeof(p->'external_key') is distinct from 'string' or length(p->>'external_key') not between 1 and 300) then raise exception 'ID externo inválido';end if;
 if p ? 'installment_index' or p ? 'installment_count' then
  if jsonb_typeof(p->'installment_index') is distinct from 'number' or jsonb_typeof(p->'installment_count') is distinct from 'number' or p->>'installment_index' !~ '^[0-9]+$' or p->>'installment_count' !~ '^[0-9]+$' then raise exception 'Parcela inválida';end if;
  idx:=(p->>'installment_index')::integer;count_parcels:=(p->>'installment_count')::integer;
  if count_parcels not between 1 and 600 or idx not between 1 and count_parcels then raise exception 'Parcela inválida';end if;
 end if;
 return new;
end $$;
revoke all on function private.validate_import_proposal() from public;
create trigger validate_import_proposal before insert or update of proposal on public.import_raw_rows for each row execute function private.validate_import_proposal();
alter table public.import_raw_rows add constraint review_reference_consistent check((status in ('approved','linked') and transaction_id is not null) or (status in ('pending','ignored') and transaction_id is null));

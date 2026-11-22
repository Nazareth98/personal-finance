-- D-076: fatura paga fora do que o app enxerga (conta sem historico naquele mes, outra conta). O dono marca a
-- fatura como paga; ela sai das pendencias sem inventar lancamento. Desfazer limpa a marca. Arquivo so em ASCII.

alter table public.card_statements add column settled_at timestamptz;

create function public.set_card_statement_settled(p_statement_id uuid, p_settled boolean) returns void
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare current_owner uuid := private.require_owner();
begin
  update public.card_statements
  set settled_at = case when p_settled then now() else null end, updated_at = now()
  where id = p_statement_id and owner_id = current_owner;
  if not found then raise exception 'Statement not available'; end if;
end;
$$;

revoke all on function public.set_card_statement_settled(uuid, boolean) from public, anon;
grant execute on function public.set_card_statement_settled(uuid, boolean) to authenticated;

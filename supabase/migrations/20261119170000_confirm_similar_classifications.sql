-- D-060: confirmar a categoria de vários lançamentos iguais de uma vez, pelo histórico da revisão.
-- Reaproveita confirm_transaction_classification para cada item (mesma validação de dono, origem,
-- natureza efetiva, alias aprendido e histórico de versões); tudo numa transação: se um falhar, nenhum muda.

create function public.confirm_transaction_classifications(p_transaction_ids uuid[], p_category_id text) returns integer
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare
  item uuid;
  total integer := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if coalesce(cardinality(p_transaction_ids), 0) not between 1 and 200 then
    raise exception 'Between 1 and 200 transactions are required';
  end if;
  for item in select distinct candidate from unnest(p_transaction_ids) candidate where candidate is not null loop
    perform public.confirm_transaction_classification(item, p_category_id);
    total := total + 1;
  end loop;
  return total;
end;
$$;

revoke all on function public.confirm_transaction_classifications(uuid[], text) from public, anon;
grant execute on function public.confirm_transaction_classifications(uuid[], text) to authenticated;

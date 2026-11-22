-- D-070: cartao do MeuPluggy sem banco no nome (o Nubank manda so "gold") ficava sem logo e com nome solto.
-- O banco vem da conta que paga a fatura dele: se todos os pagamentos ligados as faturas do cartao saem de contas de
-- um unico banco, o cartao herda esse banco e o nome ganha o prefixo ("Nubank Gold"). Roda ao fim de cada
-- sincronizacao. Tambem corrige o nome da conta do Nubank que veio como razao social.
-- Arquivo so em ASCII (D-069).

create function public.internal_infer_card_institutions(p_owner uuid) returns integer
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare
  card record;
  bank record;
  updated integer := 0;
begin
  for card in
    select pa.id as mapping_id, fa.id as account_id, fa.name
    from private.pluggy_accounts pa
    join public.financial_accounts fa on fa.id = pa.account_id
    where pa.owner_id = p_owner and fa.account_type = 'credit_card' and pa.institution_connector_id is null
  loop
    select min(payer.institution_connector_id) as connector_id, min(payer.institution_name) as institution_name,
      count(distinct payer.institution_connector_id) as banks
    into bank
    from public.credit_cards cc
    join public.card_statements s on s.card_id = cc.id
    join public.card_statement_entries e on e.statement_id = s.id and e.entry_type = 'payment'
    join public.transactions t on t.id = e.transaction_id and t.account_id <> card.account_id
    join private.pluggy_accounts payer on payer.account_id = t.account_id and payer.institution_connector_id is not null
    where cc.account_id = card.account_id;
    continue when bank.banks is distinct from 1;

    update private.pluggy_accounts
      set institution_connector_id = bank.connector_id, institution_name = bank.institution_name, updated_at = now()
      where id = card.mapping_id;
    update public.financial_accounts
      set name = left(bank.institution_name || ' ' || initcap(card.name), 80)
      where id = card.account_id
        and position(lower(split_part(bank.institution_name, ' ', 1)) in lower(card.name)) = 0;
    updated := updated + 1;
  end loop;
  return updated;
end;
$$;

revoke all on function public.internal_infer_card_institutions(uuid) from public, anon, authenticated;
grant execute on function public.internal_infer_card_institutions(uuid) to service_role;

-- Conta do Nubank ja importada com a razao social.
update private.pluggy_accounts pa
  set institution_connector_id = 212, institution_name = 'Nubank', updated_at = now()
  from public.financial_accounts fa
  where fa.id = pa.account_id and pa.institution_connector_id is null and lower(fa.name) like 'nu pagamentos%';
update public.financial_accounts set name = 'Nubank' where lower(name) like 'nu pagamentos%';

select public.internal_infer_card_institutions(id) from public.profiles where is_owner;

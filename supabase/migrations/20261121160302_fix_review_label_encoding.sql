-- D-069: rotulos "Correcao confirmada" ficaram com acentuacao corrompida na instancia principal:
-- a funcao foi aplicada uma vez com codificacao errada. Corrige a funcao e os rotulos ja gravados.
-- Este arquivo e so ASCII de proposito (chr), para nao repetir o problema. Em instancias novas nao ha o que trocar.
do $$
declare
  definition text;
  bad_c text := chr(195) || chr(167); -- "c cedilha" lido como Latin-1
  bad_a text := chr(195) || chr(163); -- "a til" lido como Latin-1
begin
  select pg_get_functiondef(p.oid) into definition
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'confirm_transaction_classification'
    and (p.prosrc like '%' || bad_c || '%' or p.prosrc like '%' || bad_a || '%');
  if definition is not null then
    execute replace(replace(definition, bad_c, chr(231)), bad_a, chr(227));
  end if;
  update public.transaction_classifications
  set explanation = replace(replace(explanation::text, bad_c, chr(231)), bad_a, chr(227))::jsonb
  where explanation::text like '%' || bad_c || '%' or explanation::text like '%' || bad_a || '%';
end;
$$;

alter table public.subcategories
  add column if not exists budget_nature text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.subcategories'::regclass
      and conname='subcategories_budget_nature_length'
  ) then
    alter table public.subcategories
      add constraint subcategories_budget_nature_length
      check (budget_nature is null or length(budget_nature) between 1 and 80);
  end if;
end $$;

do $$
declare
  body text;
begin
  select p.prosrc into body
  from pg_proc p
  where p.oid='public.import_private_configuration(jsonb,jsonb,text)'::regprocedure;

  body:=replace(body,
    'group by c.category having count(distinct c.nature)>1',
    'group by c.category,c.subcategory having count(distinct c.nature)>1');
  body:=replace(body,
    'Uma categoria está associada a naturezas diferentes',
    'Uma subcategoria está associada a naturezas diferentes');
  body:=replace(body,
    'select w,c.category,min(c.nature),min(c."order"),false',
    'select w,c.category,case when count(distinct c.nature)=1 then min(c.nature) else null end,min(c."order"),false');
  body:=replace(body,
    'insert into public.subcategories(workspace_id,category_id,name,sort_order)'||E'\n    select w,cat.id,c.subcategory,min(c."order")',
    'insert into public.subcategories(workspace_id,category_id,name,sort_order,budget_nature)'||E'\n    select w,cat.id,c.subcategory,min(c."order"),min(c.nature)');
  body:=replace(body,
    'sort_order=excluded.sort_order;'||E'\n\n  select count(*) into subcategory_count',
    'sort_order=excluded.sort_order,budget_nature=excluded.budget_nature;'||E'\n\n  select count(*) into subcategory_count');

  if position('group by c.category,c.subcategory having count(distinct c.nature)>1' in body)=0
     or position('budget_nature=excluded.budget_nature' in body)=0 then
    raise exception 'Não foi possível atualizar a rotina de importação privada. Revise a migration 012.';
  end if;

  execute format($ddl$
    create or replace function public.import_private_configuration(
      p_categories jsonb,p_rules jsonb,p_source_hash text
    ) returns jsonb language plpgsql security definer set search_path=''
    as $function$%s$function$
  $ddl$,body);
end $$;

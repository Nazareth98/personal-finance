alter table public.categories
  add column budget_nature text,
  add column sort_order integer not null default 0;
alter table public.categories
  add constraint categories_budget_nature_length
  check (budget_nature is null or length(budget_nature) between 1 and 80);

alter table public.subcategories
  add column sort_order integer not null default 0,
  add column budget_nature text;
alter table public.subcategories
  add constraint subcategories_budget_nature_length
  check (budget_nature is null or length(budget_nature) between 1 and 80);

alter table public.categorization_rules
  add column match_mode text not null default 'contains_literal',
  add column requires_financial_nature_review boolean not null default false,
  add column source_key text;
alter table public.categorization_rules
  add constraint categorization_rules_supported_match_mode
  check (match_mode = 'contains_literal');
create unique index categorization_rules_workspace_source_key
  on public.categorization_rules(workspace_id,source_key)
  where source_key is not null;

create table private.category_rule_imports (
  workspace_id uuid not null references public.workspaces(id),
  source_hash text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  category_rows integer not null,
  subcategory_rows integer not null,
  rule_rows integer not null,
  imported_by uuid not null references auth.users(id),
  imported_at timestamptz not null default now(),
  primary key(workspace_id,source_hash)
);
revoke all on private.category_rule_imports from public,anon,authenticated;

create function public.import_private_configuration(
  p_categories jsonb,
  p_rules jsonb,
  p_source_hash text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  w uuid:=public.my_workspace();
  prior private.category_rule_imports;
  category_count integer;
  subcategory_count integer;
  rule_count integer;
  item jsonb;
  target_category_id uuid;
  target_subcategory_id uuid;
  current_category text;
  current_subcategory text;
  current_nature text;
  current_keyword text;
  current_mode text;
  current_priority integer;
  current_active boolean;
  review_nature boolean;
  row_number bigint;
begin
  if auth.uid() is null or w is null or not public.owns_workspace(w) then
    raise exception 'Acesso negado';
  end if;
  if p_source_hash is null or p_source_hash !~ '^[0-9a-f]{64}$'
     or jsonb_typeof(p_categories->'items') is distinct from 'array'
     or jsonb_typeof(p_rules->'items') is distinct from 'array' then
    raise exception 'Pacote de categorias e regras inválido';
  end if;
  category_count:=jsonb_array_length(p_categories->'items');
  rule_count:=jsonb_array_length(p_rules->'items');
  if category_count<1 or category_count>1000 or rule_count<1 or rule_count>2000 then
    raise exception 'Quantidade de itens fora do limite';
  end if;

  select * into prior from private.category_rule_imports
    where workspace_id=w and source_hash=p_source_hash;
  if found then
    return jsonb_build_object(
      'already_imported',true,
      'categories',prior.category_rows,
      'subcategories',prior.subcategory_rows,
      'rules',prior.rule_rows
    );
  end if;

  if exists(
    select 1 from jsonb_to_recordset(p_categories->'items') as c(
      "order" integer,category text,subcategory text,nature text
    )
    where c."order" is null or c."order"<0
      or c.category is null or length(c.category)<1 or length(c.category)>100
      or btrim(c.category)=''
      or c.nature is null or length(c.nature)<1 or length(c.nature)>80
      or btrim(c.nature)=''
      or (c.subcategory is not null and length(c.subcategory)>100)
  ) then
    raise exception 'Categoria, subcategoria, natureza ou ordem inválida';
  end if;
  if exists(
    select c.category,c.subcategory from jsonb_to_recordset(p_categories->'items') as c(
      "order" integer,category text,subcategory text,nature text
    ) group by c.category,c.subcategory having count(distinct c.nature)>1
  ) then
    raise exception 'Uma subcategoria está associada a naturezas diferentes';
  end if;

  for item in select value from jsonb_array_elements(p_rules->'items') loop
    if coalesce(item->>'keyword','')='' or length(item->>'keyword')>200
       or nullif(btrim(item->>'category'),'') is null
       or coalesce(item->>'matchMode','')<>'contains_literal'
       or coalesce(item->>'priority','') !~ '^-?[0-9]+$'
       or coalesce(item->>'isActive','') not in ('true','false')
       or coalesce(item->>'requiresFinancialNatureReview','') not in ('true','false') then
      raise exception 'Regra de categorização inválida ou modo não suportado';
    end if;
    if not exists(select 1 from jsonb_to_recordset(p_categories->'items') as c(
        "order" integer,category text,subcategory text,nature text
      ) where c.category=item->>'category') then
      raise exception 'Uma regra referencia categoria inexistente';
    end if;
    if nullif(item->>'subcategory','') is not null and not exists(
      select 1 from jsonb_to_recordset(p_categories->'items') as c(
        "order" integer,category text,subcategory text,nature text
      ) where c.category=item->>'category' and c.subcategory=item->>'subcategory'
    ) then
      raise exception 'Uma regra referencia subcategoria inexistente';
    end if;
  end loop;

  insert into public.categories(workspace_id,name,budget_nature,sort_order,archived)
    select w,c.category,case when count(distinct c.nature)=1 then min(c.nature) else null end,min(c."order"),false
    from jsonb_to_recordset(p_categories->'items') as c(
      "order" integer,category text,subcategory text,nature text
    ) group by c.category
    on conflict(workspace_id,name) do update set
      budget_nature=excluded.budget_nature,
      sort_order=excluded.sort_order,
      archived=false;

  insert into public.subcategories(workspace_id,category_id,name,sort_order,budget_nature)
    select w,cat.id,c.subcategory,min(c."order"),min(c.nature)
    from jsonb_to_recordset(p_categories->'items') as c(
      "order" integer,category text,subcategory text,nature text
    ) join public.categories cat on cat.workspace_id=w and cat.name=c.category
    where nullif(c.subcategory,'') is not null
    group by cat.id,c.subcategory
    on conflict(workspace_id,category_id,name) do update set
      sort_order=excluded.sort_order,
      budget_nature=excluded.budget_nature;

  select count(*) into subcategory_count from (
    select distinct category,subcategory
    from jsonb_to_recordset(p_categories->'items') as c(
      "order" integer,category text,subcategory text,nature text
    ) where nullif(c.subcategory,'') is not null
  ) s;

  for item,row_number in
    select value,ordinality from jsonb_array_elements(p_rules->'items') with ordinality
  loop
    current_category:=item->>'category';
    current_subcategory:=nullif(item->>'subcategory','');
    current_keyword:=item->>'keyword';
    current_mode:=item->>'matchMode';
    current_priority:=(item->>'priority')::integer;
    current_active:=(item->>'isActive')::boolean;
    review_nature:=(item->>'requiresFinancialNatureReview')::boolean;
    select id into target_category_id from public.categories
      where workspace_id=w and name=current_category;
    target_subcategory_id:=null;
    if current_subcategory is not null then
      select s.id into target_subcategory_id from public.subcategories s
        where s.workspace_id=w and s.category_id=target_category_id
          and s.name=current_subcategory;
    end if;
    insert into public.categorization_rules(
      workspace_id,keyword,priority,category_id,subcategory_id,active,
      match_mode,requires_financial_nature_review,source_key
    ) values(
      w,current_keyword,current_priority,target_category_id,target_subcategory_id,current_active,
      current_mode,review_nature,'private-data-rules:'||lpad(row_number::text,6,'0')
    ) on conflict(workspace_id,source_key) where source_key is not null do update set
      keyword=excluded.keyword,
      priority=excluded.priority,
      category_id=excluded.category_id,
      subcategory_id=excluded.subcategory_id,
      active=excluded.active,
      match_mode=excluded.match_mode,
      requires_financial_nature_review=excluded.requires_financial_nature_review;
  end loop;

  update public.categorization_rules set active=false
    where workspace_id=w and source_key like 'private-data-rules:%'
      and source_key>'private-data-rules:'||lpad(rule_count::text,6,'0');

  insert into private.category_rule_imports(
    workspace_id,source_hash,category_rows,subcategory_rows,rule_rows,imported_by
  ) values(w,p_source_hash,category_count,subcategory_count,rule_count,auth.uid());
  return jsonb_build_object(
    'already_imported',false,
    'categories',(select count(distinct category) from jsonb_to_recordset(p_categories->'items') as c(
      "order" integer,category text,subcategory text,nature text
    )),
    'subcategories',subcategory_count,
    'rules',rule_count
  );
end $$;
revoke all on function public.import_private_configuration(jsonb,jsonb,text) from public,anon;
grant execute on function public.import_private_configuration(jsonb,jsonb,text) to authenticated;

alter function public.workspace_snapshot() rename to snapshot_before_private_configuration;
revoke all on function public.snapshot_before_private_configuration() from public,authenticated;
create function public.workspace_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare w uuid:=public.my_workspace();result jsonb;
begin
  if w is null or not public.owns_workspace(w) then raise exception 'Acesso negado'; end if;
  result:=public.snapshot_before_private_configuration();
  return result||jsonb_build_object(
    'categories',coalesce((select jsonb_agg(private.money_json(to_jsonb(c)) order by c.sort_order,c.name)
      from public.categories c where c.workspace_id=w),'[]'::jsonb),
    'subcategories',coalesce((select jsonb_agg(private.money_json(to_jsonb(s)) order by c.sort_order,s.sort_order,s.name)
      from public.subcategories s join public.categories c on c.workspace_id=s.workspace_id and c.id=s.category_id
      where s.workspace_id=w),'[]'::jsonb),
    'categorization_rules',coalesce((select jsonb_agg(private.money_json(to_jsonb(r)) order by r.priority,r.keyword,r.id)
      from public.categorization_rules r where r.workspace_id=w),'[]'::jsonb)
  );
end $$;
revoke all on function public.workspace_snapshot() from public;
grant execute on function public.workspace_snapshot() to authenticated;

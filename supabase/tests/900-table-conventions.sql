-- Conventions and exceptions: .claude/rules/db-tables.md. Exception keys: permissive_policy, open_policy, second_factor,
-- audit, truncate, id, anon, grants, service_columns, cascade, fk_index, float, nan, currency, rpc_numeric, rpc_checks;
-- the one-column keys (service_columns, float, nan, currency) also accept table.column.
begin;
select plan(18);

create temp table convention_exceptions (
  object_name text not null,
  convention text not null,
  reason text not null
) on commit drop;
-- insert into convention_exceptions values
--   ('currencies', 'audit', 'D-0NN: the currency list is changed only by migrations'),
--   ('rates.percent', 'currency', 'D-0NN: a percentage, not an amount');

create function pg_temp.excepted(text, text)
returns boolean
language sql
stable
as $f$
  select exists (select 1 from convention_exceptions e where e.object_name = $1 and e.convention = $2);
$f$;

create function pg_temp.column_excepted(text, text, text)
returns boolean
language sql
stable
as $f$
  select pg_temp.excepted($1, $3) or pg_temp.excepted($1 || '.' || $2, $3);
$f$;

-- A column's type chain: the type itself, then the types it is a domain over (a domain over a domain too).
-- The last row is the base type; typmod is the precision and scale set by the column or the nearest domain.
create function pg_temp.type_chain(oid)
returns table (type_oid oid, is_base boolean, typmod integer)
language sql
stable
as $f$
  with recursive chain as (
    select t.oid, t.typbasetype, t.typtypmod
    from pg_type t where t.oid = $1
    union all
    select t.oid, t.typbasetype, case when c.typtypmod = -1 then t.typtypmod else c.typtypmod end
    from chain c join pg_type t on t.oid = c.typbasetype
    where c.typbasetype <> 0
  )
  select oid, typbasetype = 0, typtypmod from chain;
$f$;

create temp view public_tables as
  select c.oid, c.relname::text as name
  from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p');

create temp view public_columns as
  select t.oid as table_oid, t.name as table_name, a.attname::text as name, a.attnum, a.atttypid, a.atttypmod,
         base.type_oid as base_type,
         case when a.atttypmod = -1 then base.typmod else a.atttypmod end as typmod
  from public_tables t
  join pg_attribute a on a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped
  cross join lateral (select c.type_oid, c.typmod from pg_temp.type_chain(a.atttypid) c where c.is_base) as base;

select is_empty(
  $q$ select format('%s: add alter table public.%1$I enable row level security;', t.name)
      from public_tables t join pg_class c on c.oid = t.oid
      where not c.relrowsecurity $q$,
  'every table has RLS enabled'
);

select is_empty(
  $q$ select format('%s: add a policy for every granted operation: create policy … for select to authenticated using (…)', t.name)
      from public_tables t
      where not exists (select 1 from pg_policy p where p.polrelid = t.oid and p.polpermissive)
        and not pg_temp.excepted(t.name, 'permissive_policy') $q$,
  'every table has a permissive policy (without one the app silently sees an empty list)'
);

select is_empty(
  $q$ select format('%s: policy "%s" opens every row to any signed-in user; check the owner or a permission instead: using ((select auth.uid()) = owner_id)', t.name, p.polname)
      from pg_policy p join public_tables t on t.oid = p.polrelid
      where p.polpermissive and p.polcmd <> 'a'
        and coalesce(pg_get_expr(p.polqual, p.polrelid), 'true') = 'true'
        and not pg_temp.excepted(t.name, 'open_policy') $q$,
  'no permissive select, update or delete policy is using (true)'
);

select is_empty(
  $q$ select format('%s: add create policy %1$s_second_factor on public.%1$I as restrictive for all to authenticated using ((select private.mfa_ok())) with check ((select private.mfa_ok()));', t.name)
      from public_tables t
      where not exists (
          select 1 from pg_policy p
          where p.polrelid = t.oid and not p.polpermissive and p.polcmd = '*'
            and (p.polroles @> array['authenticated'::regrole::oid] or p.polroles = array[0::oid])
            and regexp_replace(pg_get_expr(p.polqual, p.polrelid), '\s', '', 'g') = '(SELECTprivate.mfa_ok()ASmfa_ok)'
            and regexp_replace(coalesce(pg_get_expr(p.polwithcheck, p.polrelid), pg_get_expr(p.polqual, p.polrelid)), '\s', '', 'g')
              = '(SELECTprivate.mfa_ok()ASmfa_ok)'
        )
        and not pg_temp.excepted(t.name, 'second_factor') $q$,
  'every table has the restrictive second-factor policy: restrictive, for all, only private.mfa_ok()'
);

select is_empty(
  $q$ select format('%s: add create trigger %1$s_audit after insert or update or delete on public.%1$I for each row execute function audit.record(); (no when and no column list)', t.name)
      from public_tables t
      where not exists (
          select 1 from pg_trigger g
          where g.tgrelid = t.oid and not g.tgisinternal and g.tgfoid = 'audit.record()'::regprocedure
            and g.tgenabled in ('O', 'A') and g.tgqual is null and g.tgattr::text = ''
            and (g.tgtype & 1) = 1 and (g.tgtype & 2) = 0 and (g.tgtype & 28) = 28
        )
        and not pg_temp.excepted(t.name, 'audit') $q$,
  'every table has the audit.record() trigger on insert, update and delete of each row'
);

select is_empty(
  $q$ select format('%s: add create trigger %1$s_forbid_truncate before truncate on public.%1$I for each statement execute function audit.forbid_truncate();', t.name)
      from public_tables t
      where not exists (
          select 1 from pg_trigger g
          where g.tgrelid = t.oid and not g.tgisinternal and g.tgfoid = 'audit.forbid_truncate()'::regprocedure
            and g.tgenabled in ('O', 'A') and (g.tgtype & 1) = 0 and (g.tgtype & 2) = 2 and (g.tgtype & 32) = 32
        )
        and not pg_temp.excepted(t.name, 'truncate') $q$,
  'every table forbids truncate (it bypasses the row-level audit log)'
);

select is_empty(
  $q$ select format('%s: add an id column (uuid primary key default gen_random_uuid()): audit.record() links a row to its history by it', t.name)
      from public_tables t
      where not exists (select 1 from public_columns c where c.table_oid = t.oid and c.name = 'id')
        and not pg_temp.excepted(t.name, 'id') $q$,
  'every table has an id column'
);

select is_empty(
  $q$ select format('%s: anon has %s; remove it: revoke all on public.%1$I from anon, public;', c.relname, privilege)
      from pg_class c, unnest(array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES', 'DELETE', 'TRUNCATE', 'TRIGGER']) as privilege
      where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm', 'f')
        and case when privilege in ('SELECT', 'INSERT', 'UPDATE', 'REFERENCES')
              then has_any_column_privilege('anon', c.oid, privilege)
              else has_table_privilege('anon', c.oid, privilege) end
        and not pg_temp.excepted(c.relname::text, 'anon') $q$,
  'anon has no privileges on any table or view, not even on single columns'
);

select is_empty(
  $q$ select format(
        case when privilege in ('INSERT', 'UPDATE')
          then '%s: authenticated has table-wide %s; replace it: revoke %2$s on public.%1$I from authenticated; grant %2$s (columns the user enters or changes) on public.%1$I to authenticated;'
          else '%s: authenticated has %s; remove it: revoke %2$s on public.%1$I from authenticated; (instead of grant all: only select, delete and column-level insert, update)' end,
        t.name, lower(privilege))
      from public_tables t, unnest(array['INSERT', 'UPDATE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) as privilege
      where has_table_privilege('authenticated', t.oid, privilege)
        and not pg_temp.excepted(t.name, 'grants') $q$,
  'authenticated gets insert and update by column, and no truncate, references or trigger'
);

select is_empty(
  $q$ select format('%s.%s: authenticated has %s on a service column; remove it from grant %3$s (…) on public.%1$I: the database sets the value (default or before trigger) and it does not change after insert',
        c.table_name, c.name, lower(service.privilege))
      from public_columns c
      join (values ('id', 'INSERT'), ('id', 'UPDATE'),
                   ('created_at', 'INSERT'), ('created_at', 'UPDATE'),
                   ('updated_at', 'INSERT'), ('updated_at', 'UPDATE'),
                   ('owner_id', 'UPDATE'), ('client_request_id', 'UPDATE')) as service (name, privilege)
        on service.name = c.name
      where has_column_privilege('authenticated', c.table_oid, c.attnum, service.privilege)
        and not has_table_privilege('authenticated', c.table_oid, service.privilege)
        and not pg_temp.column_excepted(c.table_name, c.name, 'service_columns') $q$,
  'the client neither sets nor changes service columns: id, created_at, updated_at are outside insert and update, owner_id and client_request_id outside update'
);

select is_empty(
  $q$ select format('%s: foreign key %s is on delete %s; use on delete restrict: a row and its author reference do not disappear with the parent',
        t.name, k.conname, case k.confdeltype when 'c' then 'cascade' when 'n' then 'set null' else 'set default' end)
      from pg_constraint k join public_tables t on t.oid = k.conrelid
      where k.contype = 'f' and k.confdeltype in ('c', 'n', 'd')
        and not pg_temp.excepted(t.name, 'cascade') $q$,
  'foreign keys are on delete restrict or no action, never cascade, set null or set default'
);

select is_empty(
  $q$ select format('%s: foreign key %s has no index; add create index %1$s_%3$s_idx on public.%1$I (%4$s);',
        t.name, k.conname, replace(columns.list, ', ', '_'), columns.list)
      from pg_constraint k
      join public_tables t on t.oid = k.conrelid
      cross join lateral (
        select string_agg(c.name, ', ' order by key.position) as list
        from unnest(k.conkey) with ordinality as key (attnum, position)
        join public_columns c on c.table_oid = k.conrelid and c.attnum = key.attnum
      ) as columns
      where k.contype = 'f'
        and not exists (
          select 1 from pg_index i
          where i.indrelid = k.conrelid and i.indisvalid and i.indpred is null
            and (i.indkey::int2[])[0:cardinality(k.conkey) - 1] @> k.conkey
        )
        and not pg_temp.excepted(t.name, 'fk_index') $q$,
  'every foreign key is covered by an index that starts with its columns'
);

select is_empty(
  $q$ select format('%s.%s: type %s; amounts, prices, rates and quantities are numeric only', c.table_name, c.name, format_type(c.atttypid, c.atttypmod))
      from public_columns c
      where c.base_type in ('money'::regtype, 'real'::regtype, 'double precision'::regtype)
        and not pg_temp.column_excepted(c.table_name, c.name, 'float') $q$,
  'no money, real or double precision columns, including under a domain'
);

select is_empty(
  $q$ select format('%s.%s: no %s check; add check (%2$I <> ''NaN''::numeric and abs(%2$I) <> ''Infinity''::numeric)%4$s',
        c.table_name, c.name, case when c.typmod = -1 then 'NaN and Infinity' else 'NaN' end,
        case when c.atttypid <> c.base_type
          then format(' to the column or to its domain %s: check (value <> ''NaN''::numeric and abs(value) <> ''Infinity''::numeric)', c.atttypid::regtype)
          else '' end)
      from public_columns c
      where c.base_type = 'numeric'::regtype
        and not exists (
          select 1 from pg_constraint k
          where k.conrelid = c.table_oid and k.contype = 'c' and c.attnum = any (k.conkey)
            and pg_get_constraintdef(k.oid) ~ ('\m' || c.name || '(\)::numeric)? <> ''NaN''::numeric')
            and (c.typmod <> -1
              or pg_get_constraintdef(k.oid) ~ ('abs\(\(?' || c.name || '(\)::numeric)?\) <> ''Infinity''::numeric'))
        )
        and not exists (
          select 1 from pg_temp.type_chain(c.atttypid) d
          join pg_constraint k on k.contypid = d.type_oid and k.contype = 'c'
          where pg_get_constraintdef(k.oid) ~ 'VALUE <> ''NaN''::numeric'
            and (c.typmod <> -1 or pg_get_constraintdef(k.oid) ~ 'abs\(VALUE\) <> ''Infinity''::numeric')
        )
        and not pg_temp.column_excepted(c.table_name, c.name, 'nan') $q$,
  'every numeric column (and domain over numeric) checks NaN, and numeric without a scale also checks Infinity'
);

select is_empty(
  $q$ select format('%s: amount (%s) has no currency; add the column currency text not null check (currency ~ ''^[A-Z]{3}$'')',
        c.table_name, string_agg(c.name, ', ' order by c.attnum))
      from public_columns c
      where c.base_type = 'numeric'::regtype
        and (c.name = 'amount' or c.name like '%\_amount' or information_schema._pg_numeric_scale(c.base_type, c.typmod) = 2)
        and not exists (
          select 1 from public_columns k
          where k.table_oid = c.table_oid and (k.name = 'currency' or k.name like '%\_currency' or k.name like 'currency\_%')
        )
        and not pg_temp.column_excepted(c.table_name, c.name, 'currency')
      group by c.table_name $q$,
  'an amount (column amount, *_amount or numeric with two decimals) has a currency column next to it'
);

select is_empty(
  $q$ select format('%s: numeric in arguments or result; money goes through rpc as text (PostgREST and types.ts return numeric as a JavaScript number)', p.oid::regprocedure)
      from pg_proc p
      where p.pronamespace = 'public'::regnamespace
        and 'numeric'::regtype = any (p.prorettype || coalesce(p.proallargtypes, p.proargtypes::oid[]))
        and not pg_temp.excepted(p.proname::text, 'rpc_numeric') $q$,
  'public functions neither take nor return numeric'
);

select is_empty(
  $q$ select format('%s: security definer without %s in the body; the function bypasses RLS and the second-factor policy, so it checks access itself, first: if (select auth.uid()) is null or not (select private.mfa_ok()) then raise exception ''access denied'' using errcode = ''insufficient_privilege''; end if; (sample in .claude/rules/db.md; if owner rights are not needed, drop security definer)',
        p.oid::regprocedure, missing.calls)
      from pg_proc p
      cross join lateral (
        select replace(regexp_replace(regexp_replace(regexp_replace(
          coalesce(pg_get_function_sqlbody(p.oid), p.prosrc), '/\*.*?\*/', '', 'g'), '--[^\n]*', '', 'g'),
          '''(?:[^'']|'''')*''', '', 'g'), '"', '') as text
      ) as body
      cross join lateral (
        select array_to_string(array_remove(array[
          case when body.text !~* '\mauth\s*\.\s*uid\s*\(\s*\)' then 'auth.uid()' end,
          case when body.text !~* '\mprivate\s*\.\s*mfa_ok\s*\(\s*\)' then 'private.mfa_ok()' end
        ], null), ' and ') as calls
      ) as missing
      where p.pronamespace = 'public'::regnamespace and p.prosecdef and p.prokind in ('f', 'p')
        and has_function_privilege('authenticated', p.oid, 'EXECUTE')
        and missing.calls <> ''
        and not pg_temp.excepted(p.proname::text, 'rpc_checks') $q$,
  'every security definer public function available to authenticated checks the session and the second factor itself'
);

select is_empty(
  $q$ select format('%s / %s', e.object_name, e.convention)
      from convention_exceptions e
      where e.convention not in ('permissive_policy', 'open_policy', 'second_factor', 'audit', 'truncate', 'id', 'anon',
                                 'grants', 'service_columns', 'cascade', 'fk_index', 'float', 'nan', 'currency',
                                 'rpc_numeric', 'rpc_checks')
        or e.reason !~ 'D-\d+'
        or not exists (
          select 1 from pg_class c where c.relnamespace = 'public'::regnamespace and c.relname = e.object_name
          union all
          select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = e.object_name
          union all
          select 1 from public_columns c
          where c.table_name || '.' || c.name = e.object_name
            and e.convention in ('service_columns', 'float', 'nan', 'currency')
        ) $q$,
  'every exception names an existing table, column (table.column) or public function, a known convention and a D-NNN decision'
);

select * from finish();
rollback;

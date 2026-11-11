-- Соглашения базы для КАЖДОЙ таблицы public (.claude/rules/db.md): тест читает каталог Postgres, поэтому новая
-- таблица проверяется сама, без своего файла. supabase db advisors --fail-on warn ничего из этого не ловит.
-- Строка в выводе упавшей проверки называет таблицу или колонку и говорит, что добавить в миграцию.
-- Поведение политик (свой видит, чужой нет) этот тест не проверяет — оно остаётся в pgTAP самой таблицы.
-- Функции, доступные анониму, проверяет 006-default-privileges.sql.
--
-- Осознанное исключение — строка в convention_exceptions ниже: имя таблицы (или функции), ключ соглашения и
-- причина с номером решения D-NNN. Ключи: permissive_policy, open_policy, second_factor, audit, truncate, id,
-- anon, grants, service_columns, cascade, fk_index, float, nan, currency, rpc_numeric, rpc_checks.
-- У ключей одной колонки — service_columns, float, nan, currency — исключение может назвать «таблица.колонка»:
-- оно не прячет остальные колонки той же таблицы. Включённый RLS исключений не имеет.
begin;
select plan(18);

create temp table convention_exceptions (
  object_name text not null,
  convention text not null,
  reason text not null
) on commit drop;
-- insert into convention_exceptions values
--   ('currencies', 'audit', 'D-0NN: справочник валют меняется только миграциями'),
--   ('rates.percent', 'currency', 'D-0NN: процент, а не сумма');

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

-- Цепочка типа колонки: сам тип, затем типы, над которыми он объявлен как домен (домен над доменом — тоже).
-- Последняя строка — базовый тип; typmod — точность и масштаб, заданные колонкой или ближайшим доменом.
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
  $q$ select format('%s — добавить: alter table public.%1$I enable row level security;', t.name)
      from public_tables t join pg_class c on c.oid = t.oid
      where not c.relrowsecurity $q$,
  'у каждой таблицы включён RLS'
);

select is_empty(
  $q$ select format('%s — добавить политику на каждую операцию, для которой выдан grant: create policy … for select to authenticated using (…)', t.name)
      from public_tables t
      where not exists (select 1 from pg_policy p where p.polrelid = t.oid and p.polpermissive)
        and not pg_temp.excepted(t.name, 'permissive_policy') $q$,
  'у каждой таблицы есть разрешающая политика (без неё приложение молча видит пустой список)'
);

select is_empty(
  $q$ select format('%s: политика "%s" открывает все строки любому вошедшему — заменить условие на владельца или право: using ((select auth.uid()) = owner_id)', t.name, p.polname)
      from pg_policy p join public_tables t on t.oid = p.polrelid
      where p.polpermissive and p.polcmd <> 'a'
        and coalesce(pg_get_expr(p.polqual, p.polrelid), 'true') = 'true'
        and not pg_temp.excepted(t.name, 'open_policy') $q$,
  'ни одна разрешающая политика чтения, правки и удаления не написана как using (true)'
);

select is_empty(
  $q$ select format('%s — добавить: create policy %1$s_second_factor on public.%1$I as restrictive for all to authenticated using ((select private.mfa_ok())) with check ((select private.mfa_ok()));', t.name)
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
  'у каждой таблицы есть ограничивающая политика второго фактора: restrictive, for all, только private.mfa_ok()'
);

select is_empty(
  $q$ select format('%s — добавить: create trigger %1$s_audit after insert or update or delete on public.%1$I for each row execute function audit.record(); (без when и без списка колонок)', t.name)
      from public_tables t
      where not exists (
          select 1 from pg_trigger g
          where g.tgrelid = t.oid and not g.tgisinternal and g.tgfoid = 'audit.record()'::regprocedure
            and g.tgenabled in ('O', 'A') and g.tgqual is null and g.tgattr::text = ''
            and (g.tgtype & 1) = 1 and (g.tgtype & 2) = 0 and (g.tgtype & 28) = 28
        )
        and not pg_temp.excepted(t.name, 'audit') $q$,
  'у каждой таблицы есть триггер журнала audit.record() на вставку, правку и удаление каждой строки'
);

select is_empty(
  $q$ select format('%s — добавить: create trigger %1$s_forbid_truncate before truncate on public.%1$I for each statement execute function audit.forbid_truncate();', t.name)
      from public_tables t
      where not exists (
          select 1 from pg_trigger g
          where g.tgrelid = t.oid and not g.tgisinternal and g.tgfoid = 'audit.forbid_truncate()'::regprocedure
            and g.tgenabled in ('O', 'A') and (g.tgtype & 1) = 0 and (g.tgtype & 2) = 2 and (g.tgtype & 32) = 32
        )
        and not pg_temp.excepted(t.name, 'truncate') $q$,
  'у каждой таблицы запрещён truncate (он обходит построчный журнал)'
);

select is_empty(
  $q$ select format('%s — добавить колонку id (uuid primary key default gen_random_uuid()): по ней audit.record() связывает запись с её историей', t.name)
      from public_tables t
      where not exists (select 1 from public_columns c where c.table_oid = t.oid and c.name = 'id')
        and not pg_temp.excepted(t.name, 'id') $q$,
  'у каждой таблицы есть колонка id'
);

select is_empty(
  $q$ select format('%s: anon имеет %s — убрать: revoke all on public.%1$I from anon, public;', c.relname, privilege)
      from pg_class c, unnest(array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES', 'DELETE', 'TRUNCATE', 'TRIGGER']) as privilege
      where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm', 'f')
        and case when privilege in ('SELECT', 'INSERT', 'UPDATE', 'REFERENCES')
              then has_any_column_privilege('anon', c.oid, privilege)
              else has_table_privilege('anon', c.oid, privilege) end
        and not pg_temp.excepted(c.relname::text, 'anon') $q$,
  'у анонима нет прав ни на одну таблицу и ни на одно представление, даже на отдельные колонки'
);

select is_empty(
  $q$ select format(
        case when privilege in ('INSERT', 'UPDATE')
          then '%s: у authenticated %s на всю таблицу — заменить: revoke %2$s on public.%1$I from authenticated; grant %2$s (колонки, которые вводит или меняет пользователь) on public.%1$I to authenticated;'
          else '%s: у authenticated %s — убрать: revoke %2$s on public.%1$I from authenticated; (вместо grant all — только select, delete и колоночные insert, update)' end,
        t.name, lower(privilege))
      from public_tables t, unnest(array['INSERT', 'UPDATE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) as privilege
      where has_table_privilege('authenticated', t.oid, privilege)
        and not pg_temp.excepted(t.name, 'grants') $q$,
  'insert и update выданы authenticated по колонкам, truncate, references и trigger не выданы'
);

select is_empty(
  $q$ select format('%s.%s: у authenticated %s на служебную колонку — убрать её из grant %3$s (…) on public.%1$I: значение ставит база (default или before-триггер), а после вставки оно не меняется',
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
  'служебные колонки клиент не задаёт и не меняет: id, created_at, updated_at — вне insert и update, owner_id и client_request_id — вне update'
);

select is_empty(
  $q$ select format('%s: внешний ключ %s — on delete %s; заменить на on delete restrict: строка и ссылка на автора не исчезают вместе с родителем',
        t.name, k.conname, case k.confdeltype when 'c' then 'cascade' when 'n' then 'set null' else 'set default' end)
      from pg_constraint k join public_tables t on t.oid = k.conrelid
      where k.contype = 'f' and k.confdeltype in ('c', 'n', 'd')
        and not pg_temp.excepted(t.name, 'cascade') $q$,
  'внешние ключи — on delete restrict или no action, без cascade, set null и set default'
);

select is_empty(
  $q$ select format('%s: внешний ключ %s без индекса — добавить: create index %1$s_%3$s_idx on public.%1$I (%4$s);',
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
  'каждый внешний ключ покрыт индексом, который начинается с его колонок'
);

select is_empty(
  $q$ select format('%s.%s: тип %s — суммы, цены, курсы и количества только numeric', c.table_name, c.name, format_type(c.atttypid, c.atttypmod))
      from public_columns c
      where c.base_type in ('money'::regtype, 'real'::regtype, 'double precision'::regtype)
        and not pg_temp.column_excepted(c.table_name, c.name, 'float') $q$,
  'нет колонок money, real и double precision, в том числе под доменом'
);

select is_empty(
  $q$ select format('%s.%s: нет проверки %s — добавить: check (%2$I <> ''NaN''::numeric and abs(%2$I) <> ''Infinity''::numeric)%4$s',
        c.table_name, c.name, case when c.typmod = -1 then 'NaN и Infinity' else 'NaN' end,
        case when c.atttypid <> c.base_type
          then format(' — колонке или её домену %s: check (value <> ''NaN''::numeric and abs(value) <> ''Infinity''::numeric)', c.atttypid::regtype)
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
  'у каждой numeric-колонки (и колонки-домена над numeric) есть check на NaN, у numeric без масштаба — ещё и на Infinity'
);

select is_empty(
  $q$ select format('%s: сумма (%s) без валюты — добавить колонку: currency text not null check (currency ~ ''^[A-Z]{3}$'')',
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
  'рядом с суммой (колонка amount, *_amount или numeric с двумя знаками) есть колонка валюты'
);

select is_empty(
  $q$ select format('%s: numeric в аргументах или результате — деньги через rpc передаются и возвращаются text (PostgREST и types.ts отдают numeric числом JavaScript)', p.oid::regprocedure)
      from pg_proc p
      where p.pronamespace = 'public'::regnamespace
        and 'numeric'::regtype = any (p.prorettype || coalesce(p.proallargtypes, p.proargtypes::oid[]))
        and not pg_temp.excepted(p.proname::text, 'rpc_numeric') $q$,
  'функции public не принимают и не возвращают numeric'
);

-- security definer обходит RLS целиком — и политики владельца, и политику второго фактора: право проверяет сама
-- функция. Тест видит только забытую проверку: вызовы auth.uid() и private.mfa_ok() в теле (комментарии и
-- строковые литералы не считаются). Что проверка стоит первой и что право на объект проверено верно — pgTAP самой функции
-- (аноним — 42501, чужой — отказ, без второго фактора — отказ, свой — результат).
select is_empty(
  $q$ select format('%s: security definer без %s в теле — функция обходит RLS и политику второго фактора, право проверяет она сама, первым делом: if (select auth.uid()) is null or not (select private.mfa_ok()) then raise exception ''нет доступа'' using errcode = ''insufficient_privilege''; end if; (образец — .claude/rules/db.md; права владельца не нужны — убрать security definer)',
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
        ], null), ' и ') as calls
      ) as missing
      where p.pronamespace = 'public'::regnamespace and p.prosecdef and p.prokind in ('f', 'p')
        and has_function_privilege('authenticated', p.oid, 'EXECUTE')
        and missing.calls <> ''
        and not pg_temp.excepted(p.proname::text, 'rpc_checks') $q$,
  'каждая security definer функция public, доступная authenticated, сама проверяет сессию и второй фактор'
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
  'каждое исключение называет существующую таблицу, колонку (таблица.колонка) или функцию public, известное соглашение и решение D-NNN'
);

select * from finish();
rollback;

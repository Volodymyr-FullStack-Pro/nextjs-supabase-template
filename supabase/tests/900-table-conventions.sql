-- Соглашения базы для КАЖДОЙ таблицы public (.claude/rules/db.md): тест читает каталог Postgres, поэтому новая
-- таблица проверяется сама, без своего файла. supabase db advisors --fail-on warn ничего из этого не ловит.
-- Строка в выводе упавшей проверки называет таблицу или колонку и говорит, что добавить в миграцию.
-- Поведение политик (свой видит, чужой нет) этот тест не проверяет — оно остаётся в pgTAP самой таблицы.
-- Функции, доступные анониму, проверяет 006-default-privileges.sql.
--
-- Осознанное исключение — строка в convention_exceptions ниже: имя таблицы (или функции), ключ соглашения и
-- причина с номером решения D-NNN. Ключи: permissive_policy, open_policy, second_factor, audit, truncate, id,
-- anon, grants, cascade, fk_index, float, nan, currency, rpc_numeric. Включённый RLS исключений не имеет.
begin;
select plan(16);

create temp table convention_exceptions (
  object_name text not null,
  convention text not null,
  reason text not null
) on commit drop;
-- insert into convention_exceptions values
--   ('currencies', 'audit', 'D-0NN: справочник валют меняется только миграциями');

create function pg_temp.excepted(text, text)
returns boolean
language sql
stable
as $f$
  select exists (select 1 from convention_exceptions e where e.object_name = $1 and e.convention = $2);
$f$;

create temp view public_tables as
  select c.oid, c.relname::text as name
  from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p');

create temp view public_columns as
  select t.oid as table_oid, t.name as table_name, a.attname::text as name, a.attnum, a.atttypid, a.atttypmod
  from public_tables t
  join pg_attribute a on a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped;

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
      from public_columns c join pg_type ty on ty.oid = c.atttypid
      where coalesce(nullif(ty.typbasetype, 0), ty.oid) in ('money'::regtype, 'real'::regtype, 'double precision'::regtype)
        and not pg_temp.excepted(c.table_name, 'float') $q$,
  'нет колонок money, real и double precision'
);

select is_empty(
  $q$ select format('%s.%s: нет проверки %s — добавить: check (%2$I <> ''NaN''::numeric and abs(%2$I) <> ''Infinity''::numeric)',
        c.table_name, c.name, case when c.atttypmod = -1 then 'NaN и Infinity' else 'NaN' end)
      from public_columns c
      where c.atttypid = 'numeric'::regtype
        and not exists (
          select 1 from pg_constraint k
          where k.conrelid = c.table_oid and k.contype = 'c' and c.attnum = any (k.conkey)
            and pg_get_constraintdef(k.oid) ~ ('\m' || c.name || ' <> ''NaN''::numeric')
            and (c.atttypmod <> -1 or pg_get_constraintdef(k.oid) ~ ('abs\(' || c.name || '\) <> ''Infinity''::numeric'))
        )
        and not pg_temp.excepted(c.table_name, 'nan') $q$,
  'у каждой numeric-колонки есть check на NaN, у numeric без масштаба — ещё и на Infinity'
);

select is_empty(
  $q$ select format('%s: сумма (%s) без валюты — добавить колонку: currency text not null check (currency ~ ''^[A-Z]{3}$'')',
        c.table_name, string_agg(c.name, ', ' order by c.attnum))
      from public_columns c
      where c.atttypid = 'numeric'::regtype
        and (c.name = 'amount' or c.name like '%\_amount' or information_schema._pg_numeric_scale(c.atttypid, c.atttypmod) = 2)
        and not exists (
          select 1 from public_columns k
          where k.table_oid = c.table_oid and (k.name = 'currency' or k.name like '%\_currency' or k.name like 'currency\_%')
        )
        and not pg_temp.excepted(c.table_name, 'currency')
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

select is_empty(
  $q$ select format('%s / %s', e.object_name, e.convention)
      from convention_exceptions e
      where e.convention not in ('permissive_policy', 'open_policy', 'second_factor', 'audit', 'truncate', 'id', 'anon',
                                 'grants', 'cascade', 'fk_index', 'float', 'nan', 'currency', 'rpc_numeric')
        or e.reason !~ 'D-\d+'
        or not exists (
          select 1 from pg_class c where c.relnamespace = 'public'::regnamespace and c.relname = e.object_name
          union all
          select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = e.object_name
        ) $q$,
  'каждое исключение называет существующую таблицу или функцию public, известное соглашение и решение D-NNN'
);

select * from finish();
rollback;

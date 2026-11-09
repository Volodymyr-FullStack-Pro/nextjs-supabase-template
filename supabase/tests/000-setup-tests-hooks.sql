-- Хелперы для pgTAP-тестов RLS (упрощённая версия basejump/supabase-test-helpers).
-- Запуск: supabase test db. Файл без транзакции: хелперы остаются для следующих файлов.
create extension if not exists pgtap with schema extensions;

create schema if not exists tests;
-- Хелперы зовёт только postgres (до смены роли); ролям API доступен лишь clear_authentication — его зовут
-- уже под ролью authenticated или anon. Файл запускается только локально: supabase test db без --remote.
grant usage on schema tests to anon, authenticated;
alter default privileges in schema tests revoke execute on functions from public;

create or replace function tests.create_supabase_user(identifier text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  user_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_user_meta_data, instance_id, aud, role, created_at, updated_at)
  values (user_id, identifier || '@test.local', jsonb_build_object('test_identifier', identifier),
          '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now());
  return user_id;
end;
$$;

create or replace function tests.get_supabase_uid(identifier text)
returns uuid language sql security definer set search_path = '' as $$
  select id from auth.users where raw_user_meta_data ->> 'test_identifier' = identifier limit 1;
$$;

-- aal: 'aal1' — вход паролем, 'aal2' — пароль и второй фактор (TOTP).
drop function if exists tests.authenticate_as(text);
create or replace function tests.authenticate_as(identifier text, aal text default 'aal1')
returns void language plpgsql set search_path = '' as $$
declare
  uid uuid := tests.get_supabase_uid(identifier);
begin
  if uid is null then
    raise exception 'tests.authenticate_as: пользователь % не создан (tests.create_supabase_user)', identifier;
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
end;
$$;

-- Подтверждённый фактор TOTP, как после /mfa/setup.
create or replace function tests.add_verified_totp(identifier text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  factor_id uuid := gen_random_uuid();
begin
  insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, secret, created_at, updated_at)
  values (factor_id, tests.get_supabase_uid(identifier), 'test totp', 'totp', 'verified',
          'JBSWY3DPEHPK3PXP', now(), now());
  return factor_id;
end;
$$;

create or replace function tests.clear_authentication()
returns void language plpgsql set search_path = '' as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
  reset role; -- обратно к роли сессии (postgres); set role postgres из authenticated запрещён
end;
$$;

revoke execute on all functions in schema tests from public;
-- Под ролью authenticated тесты зовут только эти три: смена сессии, чтение id тестового пользователя, сброс роли.
grant execute on function tests.authenticate_as(text, text), tests.get_supabase_uid(text), tests.clear_authentication() to anon, authenticated;

-- supabase test db ждёт TAP-вывод от каждого файла.
select plan(1);
select has_function('tests', 'authenticate_as', array['text', 'text'], 'test helpers installed');
select * from finish();

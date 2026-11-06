-- Хелперы для pgTAP-тестов RLS (упрощённая версия basejump/supabase-test-helpers).
-- Запуск: supabase test db
create extension if not exists pgtap with schema extensions;

create schema if not exists tests;

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

create or replace function tests.authenticate_as(identifier text)
returns void language plpgsql as $$
declare
  uid uuid := tests.get_supabase_uid(identifier);
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
end;
$$;

create or replace function tests.clear_authentication()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', null, true);
  set local role postgres;
end;
$$;

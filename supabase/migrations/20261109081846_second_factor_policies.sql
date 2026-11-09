-- Второй фактор в базе: пользователь, у которого есть подтверждённый фактор (TOTP), видит и меняет данные
-- только в сессии aal2. Без фактора — как раньше (обязательность включает приложение: AUTH_REQUIRE_MFA).
-- Схема private не открыта в Data API (config.toml → api.schemas); authenticated может только вызвать mfa_ok.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create function private.mfa_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.jwt() ->> 'aal') = 'aal2'
    or not exists (
      select 1 from auth.mfa_factors
      where user_id = (select auth.uid()) and status = 'verified'
    );
$$;

revoke execute on function private.mfa_ok() from public, anon;
grant execute on function private.mfa_ok() to authenticated;

-- Ограничивающая политика складывается с политиками владельца через AND: каждой новой таблице — такая же.
create policy "notes: second factor when enrolled" on public.notes
  as restrictive
  for all to authenticated
  using ((select private.mfa_ok()))
  with check ((select private.mfa_ok()));

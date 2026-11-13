-- title, amount, currency are placeholders: replace them before supabase migration up. An entity that is never
-- updated or deleted drops that grant, its policy below and its pgTAP checks.
create table public.__module_name__ (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 200),
  amount numeric(18, 2) not null check (amount <> 'NaN'::numeric and abs(amount) <> 'Infinity'::numeric),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  client_request_id uuid not null,
  created_at timestamptz not null default now(),
  constraint __module_name___owner_id_client_request_id_key unique (owner_id, client_request_id)
);

create index __module_name___owner_id_created_at_idx on public.__module_name__ (owner_id, created_at desc);

alter table public.__module_name__ enable row level security;

grant select, delete on public.__module_name__ to authenticated;
grant insert (owner_id, title, amount, currency, client_request_id) on public.__module_name__ to authenticated;
grant update (title, amount, currency) on public.__module_name__ to authenticated;

create policy "__module_name__: owner selects" on public.__module_name__
  for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "__module_name__: owner inserts" on public.__module_name__
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "__module_name__: owner updates" on public.__module_name__
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "__module_name__: owner deletes" on public.__module_name__
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

create policy "__module_name__: second factor when enrolled" on public.__module_name__
  as restrictive
  for all to authenticated
  using ((select private.mfa_ok()))
  with check ((select private.mfa_ok()));

create trigger __module_name___audit
  after insert or update or delete on public.__module_name__
  for each row execute function audit.record();

create trigger __module_name___forbid_truncate
  before truncate on public.__module_name__
  for each statement execute function audit.forbid_truncate();

-- Пример таблицы с RLS: политика на каждую операцию, только для authenticated, через (select auth.uid()).
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  amount numeric(18, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index notes_owner_id_idx on public.notes (owner_id);

alter table public.notes enable row level security;

create policy "notes: owner selects" on public.notes
  for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "notes: owner inserts" on public.notes
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "notes: owner updates" on public.notes
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "notes: owner deletes" on public.notes
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

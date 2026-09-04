-- ============================================================
-- Custom expense categories (persist across months / devices)
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run
-- ============================================================

create table if not exists public.categories (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  icon        text not null default 'grid-outline',
  color       text not null default '#636E72',
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists categories_user_idx
  on public.categories (user_id);

alter table public.categories enable row level security;

drop policy if exists "users own categories" on public.categories;
create policy "users own categories" on public.categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "managers read categories" on public.categories;
create policy "managers read categories" on public.categories for select
  using (
    exists (
      select 1 from public.manager_access ma
      where ma.manager_user_id = auth.uid()
        and ma.owner_user_id = categories.user_id
        and ma.status = 'active'
    )
  );

drop policy if exists "managers write categories" on public.categories;
create policy "managers write categories" on public.categories for all
  using (
    exists (
      select 1 from public.manager_access ma
      where ma.manager_user_id = auth.uid()
        and ma.owner_user_id = categories.user_id
        and ma.status = 'active'
        and ma.permission in ('edit', 'full')
    )
  )
  with check (
    exists (
      select 1 from public.manager_access ma
      where ma.manager_user_id = auth.uid()
        and ma.owner_user_id = categories.user_id
        and ma.status = 'active'
        and ma.permission in ('edit', 'full')
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.categories;
exception
  when duplicate_object then null;
end $$;

-- ============================================================
-- Income ledger — track money received (salary, boss top-ups, etc.)
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run (IF NOT EXISTS / drop policy if exists)
-- ============================================================

create table if not exists public.incomes (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  amount      numeric(12, 2) not null check (amount > 0),
  note        text not null default '',
  source      text not null default 'Cash Surplus',
  date        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists incomes_user_date_idx
  on public.incomes (user_id, date desc);

alter table public.incomes enable row level security;

drop policy if exists "users own incomes" on public.incomes;
create policy "users own incomes" on public.incomes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "managers read incomes" on public.incomes;
create policy "managers read incomes" on public.incomes for select
  using (
    exists (
      select 1 from public.manager_access ma
      where ma.manager_user_id = auth.uid()
        and ma.owner_user_id = incomes.user_id
        and ma.status = 'active'
    )
  );

drop policy if exists "managers write incomes" on public.incomes;
create policy "managers write incomes" on public.incomes for all
  using (
    exists (
      select 1 from public.manager_access ma
      where ma.manager_user_id = auth.uid()
        and ma.owner_user_id = incomes.user_id
        and ma.status = 'active'
        and ma.permission in ('edit', 'full')
    )
  )
  with check (
    exists (
      select 1 from public.manager_access ma
      where ma.manager_user_id = auth.uid()
        and ma.owner_user_id = incomes.user_id
        and ma.status = 'active'
        and ma.permission in ('edit', 'full')
    )
  );

-- Realtime (ignore error if already added)
do $$
begin
  alter publication supabase_realtime add table public.incomes;
exception
  when duplicate_object then null;
end $$;

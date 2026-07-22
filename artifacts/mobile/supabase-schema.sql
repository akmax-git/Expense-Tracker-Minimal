-- ============================================================
-- Expense Tracker — Full Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Safe to re-run: drops and recreates all tables
-- ============================================================

-- Drop existing tables (reverse dependency order)
drop table if exists public.expenses;
drop table if exists public.budgets;
drop table if exists public.manager_access;

-- ─── Manager Access (created first so expense/budget policies can reference it)
create table public.manager_access (
  id              uuid primary key default gen_random_uuid(),
  owner_user_id   uuid not null references auth.users(id) on delete cascade,
  owner_email     text not null,
  manager_email   text not null,
  manager_user_id uuid references auth.users(id) on delete set null,
  status          text not null default 'pending' check (status in ('pending', 'active')),
  permission      text not null default 'read' check (permission in ('read', 'edit', 'full')),
  created_at      timestamptz not null default now(),
  unique(owner_user_id, manager_email)
);

alter table public.manager_access enable row level security;

create policy "owners manage grants" on public.manager_access for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

create policy "managers view their grants" on public.manager_access for select
  using (auth.uid() = manager_user_id);

create policy "pending managers can see their invite" on public.manager_access for select
  using (lower(manager_email) = lower(auth.email()) and manager_user_id is null);

create policy "pending managers can activate" on public.manager_access for update
  using  (lower(manager_email) = lower(auth.email()))
  with check (
    manager_user_id = auth.uid()
    and status = 'active'
    and permission in ('read', 'edit', 'full')
  );

-- ─── Expenses ────────────────────────────────────────────────
create table public.expenses (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  amount      numeric(12, 2) not null check (amount > 0),
  category    text not null,
  note        text not null default '',
  date        text not null,
  bill_url    text,
  created_at  timestamptz not null default now()
);

alter table public.expenses enable row level security;

create policy "users own expenses" on public.expenses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "managers read expenses" on public.expenses for select
  using (
    exists (
      select 1 from public.manager_access ma
      where ma.manager_user_id = auth.uid()
        and ma.owner_user_id = expenses.user_id
        and ma.status = 'active'
    )
  );

create policy "managers insert expenses" on public.expenses for insert
  with check (
    exists (
      select 1 from public.manager_access ma
      where ma.manager_user_id = auth.uid()
        and ma.owner_user_id = expenses.user_id
        and ma.status = 'active'
        and ma.permission in ('edit', 'full')
    )
  );

create policy "managers delete expenses" on public.expenses for delete
  using (
    exists (
      select 1 from public.manager_access ma
      where ma.manager_user_id = auth.uid()
        and ma.owner_user_id = expenses.user_id
        and ma.status = 'active'
        and ma.permission in ('edit', 'full')
    )
  );

create policy "managers update expenses" on public.expenses for update
  using (
    exists (
      select 1 from public.manager_access ma
      where ma.manager_user_id = auth.uid()
        and ma.owner_user_id = expenses.user_id
        and ma.status = 'active'
        and ma.permission in ('edit', 'full')
    )
  )
  with check (
    exists (
      select 1 from public.manager_access ma
      where ma.manager_user_id = auth.uid()
        and ma.owner_user_id = expenses.user_id
        and ma.status = 'active'
        and ma.permission in ('edit', 'full')
    )
  );

-- ─── Budgets ─────────────────────────────────────────────────
create table public.budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  month       text not null,
  amount      numeric(12, 2) not null check (amount >= 0),
  updated_at  timestamptz not null default now(),
  unique(user_id, month)
);

alter table public.budgets enable row level security;

create policy "users own budgets" on public.budgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "managers read budgets" on public.budgets for select
  using (
    exists (
      select 1 from public.manager_access ma
      where ma.manager_user_id = auth.uid()
        and ma.owner_user_id = budgets.user_id
        and ma.status = 'active'
    )
  );

create policy "managers write budgets" on public.budgets for all
  using (
    exists (
      select 1 from public.manager_access ma
      where ma.manager_user_id = auth.uid()
        and ma.owner_user_id = budgets.user_id
        and ma.status = 'active'
        and ma.permission = 'full'
    )
  )
  with check (
    exists (
      select 1 from public.manager_access ma
      where ma.manager_user_id = auth.uid()
        and ma.owner_user_id = budgets.user_id
        and ma.status = 'active'
        and ma.permission = 'full'
    )
  );

-- ─── Realtime ─────────────────────────────────────────────────
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.budgets;

-- ─── Bill / Receipt Storage ───────────────────────────────────
insert into storage.buckets (id, name, public)
values ('bills', 'bills', true)
on conflict (id) do nothing;

drop policy if exists "users upload own bills" on storage.objects;
drop policy if exists "users read own bills" on storage.objects;
drop policy if exists "users delete own bills" on storage.objects;
drop policy if exists "managers read bills" on storage.objects;

create policy "users upload own bills"
on storage.objects for insert
with check (
  bucket_id = 'bills'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "users read own bills"
on storage.objects for select
using (
  bucket_id = 'bills'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "users delete own bills"
on storage.objects for delete
using (
  bucket_id = 'bills'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "managers read bills"
on storage.objects for select
using (
  bucket_id = 'bills'
  and exists (
    select 1 from public.manager_access ma
    where ma.manager_user_id = auth.uid()
      and ma.owner_user_id::text = (storage.foldername(name))[1]
      and ma.status = 'active'
  )
);

create policy "managers upload bills"
on storage.objects for insert
with check (
  bucket_id = 'bills'
  and exists (
    select 1 from public.manager_access ma
    where ma.manager_user_id = auth.uid()
      and ma.owner_user_id::text = (storage.foldername(name))[1]
      and ma.status = 'active'
      and ma.permission in ('edit', 'full')
  )
);

create policy "managers delete bills"
on storage.objects for delete
using (
  bucket_id = 'bills'
  and exists (
    select 1 from public.manager_access ma
    where ma.manager_user_id = auth.uid()
      and ma.owner_user_id::text = (storage.foldername(name))[1]
      and ma.status = 'active'
      and ma.permission in ('edit', 'full')
  )
);

-- ============================================================
-- Expense Tracker — Full Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Safe to re-run: drops and recreates all tables
-- ============================================================

-- Drop existing tables (order matters for FK constraints)
drop table if exists public.manager_access;
drop table if exists public.expenses;
drop table if exists public.budgets;

-- ─── Expenses ────────────────────────────────────────────────
create table public.expenses (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  amount      numeric(12, 2) not null check (amount > 0),
  category    text not null,
  note        text not null default '',
  date        text not null,           -- 'YYYY-MM-DD'
  created_at  timestamptz not null default now()
);

alter table public.expenses enable row level security;

-- Users can only see & modify their own expenses
create policy "users own expenses"
  on public.expenses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Managers can read expenses of users who granted them access
create policy "managers read expenses"
  on public.expenses for select
  using (
    exists (
      select 1 from public.manager_access ma
      where ma.manager_user_id = auth.uid()
        and ma.owner_user_id = expenses.user_id
        and ma.status = 'active'
    )
  );

-- ─── Budgets ─────────────────────────────────────────────────
create table public.budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  month       text not null,           -- 'YYYY-MM'
  amount      numeric(12, 2) not null check (amount >= 0),
  updated_at  timestamptz not null default now(),
  unique(user_id, month)
);

alter table public.budgets enable row level security;

-- Users can only see & modify their own budgets
create policy "users own budgets"
  on public.budgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Managers can read budgets of users who granted them access
create policy "managers read budgets"
  on public.budgets for select
  using (
    exists (
      select 1 from public.manager_access ma
      where ma.manager_user_id = auth.uid()
        and ma.owner_user_id = budgets.user_id
        and ma.status = 'active'
    )
  );

-- ─── Manager Access ──────────────────────────────────────────
-- Links a manager (by email) to the expense owner they can monitor.
-- Status: 'pending' until manager logs in → 'active'.
create table public.manager_access (
  id              uuid primary key default gen_random_uuid(),
  owner_user_id   uuid not null references auth.users(id) on delete cascade,
  owner_email     text not null,
  manager_email   text not null,
  manager_user_id uuid references auth.users(id) on delete set null,
  status          text not null default 'pending'
                    check (status in ('pending', 'active')),
  created_at      timestamptz not null default now(),
  unique(owner_user_id, manager_email)
);

alter table public.manager_access enable row level security;

-- Owners: full control over grants they created
create policy "owners manage grants"
  on public.manager_access for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

-- Active managers: can read grants where they are the manager
create policy "managers view their grants"
  on public.manager_access for select
  using (auth.uid() = manager_user_id);

-- Pending activation: any authenticated user can read rows where their
-- email matches a pending grant (so the app can detect it on login)
create policy "pending managers can see their invite"
  on public.manager_access for select
  using (manager_email = auth.email() and manager_user_id is null);

-- Pending activation: manager can update the row to set their user_id
create policy "pending managers can activate"
  on public.manager_access for update
  using  (manager_email = auth.email())
  with check (manager_user_id = auth.uid() and status = 'active');

-- ─── Realtime ─────────────────────────────────────────────────
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.budgets;

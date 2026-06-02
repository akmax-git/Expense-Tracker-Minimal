-- Run this in your Supabase project: Dashboard → SQL Editor → New query
-- If you ran the previous schema, run this updated version instead (it replaces it)

-- Drop old tables if they exist (re-run safe)
drop table if exists public.expenses;
drop table if exists public.budgets;

-- Expenses table (scoped per user)
create table public.expenses (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  amount      numeric(12, 2) not null check (amount > 0),
  category    text not null,
  note        text not null default '',
  date        text not null,           -- 'YYYY-MM-DD'
  created_at  timestamptz not null default now()
);

-- Budgets table (one row per user+month)
create table public.budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  month       text not null,           -- 'YYYY-MM'
  amount      numeric(12, 2) not null check (amount >= 0),
  updated_at  timestamptz not null default now(),
  unique(user_id, month)
);

-- Enable Row Level Security
alter table public.expenses enable row level security;
alter table public.budgets  enable row level security;

-- Users can only see & modify their own expenses
create policy "users own expenses"
  on public.expenses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can only see & modify their own budgets
create policy "users own budgets"
  on public.budgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Enable realtime for live sync
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.budgets;

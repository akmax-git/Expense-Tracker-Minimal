-- Run this in your Supabase project: Dashboard → SQL Editor → New query

-- Expenses table
create table if not exists public.expenses (
  id          text primary key,
  amount      numeric(12, 2) not null check (amount > 0),
  category    text not null,
  note        text not null default '',
  date        text not null,           -- 'YYYY-MM-DD'
  created_at  timestamptz not null default now()
);

-- Budgets table (one row per month)
create table if not exists public.budgets (
  month       text primary key,        -- 'YYYY-MM'
  amount      numeric(12, 2) not null check (amount >= 0),
  updated_at  timestamptz not null default now()
);

-- Enable Row Level Security (allow all for anonymous access — no auth)
alter table public.expenses enable row level security;
alter table public.budgets  enable row level security;

-- Open policies (anon key can read/write everything)
create policy "allow all expenses" on public.expenses
  for all using (true) with check (true);

create policy "allow all budgets" on public.budgets
  for all using (true) with check (true);

-- Enable realtime for live sync
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.budgets;

-- ============================================================
-- Expense approval status (pending / approved / rejected)
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run
--
-- New expenses default to pending.
-- Existing rows are marked approved so current totals stay intact.
-- Only approved expenses should count toward spend calculations.
-- ============================================================

alter table public.expenses
  add column if not exists status text;

-- Backfill existing rows before enforcing NOT NULL
update public.expenses
set status = 'approved'
where status is null;

alter table public.expenses
  alter column status set default 'pending';

alter table public.expenses
  alter column status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'expenses_status_check'
      and conrelid = 'public.expenses'::regclass
  ) then
    alter table public.expenses
      add constraint expenses_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create index if not exists expenses_user_status_idx
  on public.expenses (user_id, status);

comment on column public.expenses.status is
  'Approval workflow: pending → approved | rejected. Only approved counts in totals.';

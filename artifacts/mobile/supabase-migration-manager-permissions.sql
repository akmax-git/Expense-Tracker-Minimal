-- ============================================================
-- Migration: manager permission levels (read / edit / full)
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run
-- ============================================================

-- 1) Permission column on grants
alter table public.manager_access
  add column if not exists permission text not null default 'read';

-- Ensure check constraint (drop + recreate for idempotency)
alter table public.manager_access
  drop constraint if exists manager_access_permission_check;

alter table public.manager_access
  add constraint manager_access_permission_check
  check (permission in ('read', 'edit', 'full'));

-- Normalize any nulls (shouldn't happen with NOT NULL default)
update public.manager_access
set permission = 'read'
where permission is null
   or permission not in ('read', 'edit', 'full');

-- 2) Expense write policies for managers with edit/full
drop policy if exists "managers write expenses" on public.expenses;
drop policy if exists "managers insert expenses" on public.expenses;
drop policy if exists "managers delete expenses" on public.expenses;
drop policy if exists "managers update expenses" on public.expenses;

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

-- Records edit = delete + re-insert; update covered if ever used
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

-- 3) Budget write for full access only
drop policy if exists "managers write budgets" on public.budgets;
drop policy if exists "managers upsert budgets" on public.budgets;

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

-- Keep existing read policies; they already allow any active manager

-- Also tighten activate policy so permission column is preserved
drop policy if exists "pending managers can activate" on public.manager_access;
create policy "pending managers can activate" on public.manager_access for update
  using  (lower(manager_email) = lower(coalesce(auth.email(), '')))
  with check (
    manager_user_id = auth.uid()
    and status = 'active'
    and permission in ('read', 'edit', 'full')
  );

-- 4) Bill storage: managers with edit/full can upload/delete in owner's folder
drop policy if exists "managers upload bills" on storage.objects;
drop policy if exists "managers delete bills" on storage.objects;

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

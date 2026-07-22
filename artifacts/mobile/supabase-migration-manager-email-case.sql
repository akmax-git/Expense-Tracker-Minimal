-- ============================================================
-- Migration: case-insensitive manager email matching
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Normalize existing emails to lowercase
update public.manager_access
set manager_email = lower(trim(manager_email));

update public.manager_access
set owner_email = lower(trim(owner_email));

-- Recreate invite policies with case-insensitive email match
drop policy if exists "pending managers can see their invite" on public.manager_access;
drop policy if exists "pending managers can activate" on public.manager_access;

create policy "pending managers can see their invite" on public.manager_access for select
  using (lower(manager_email) = lower(auth.email()) and manager_user_id is null);

create policy "pending managers can activate" on public.manager_access for update
  using  (lower(manager_email) = lower(auth.email()))
  with check (manager_user_id = auth.uid() and status = 'active');

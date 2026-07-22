-- ============================================================
-- Migration: bill uploads for expenses
-- Run this in Supabase SQL Editor if your DB already exists
-- (safe to re-run)
-- ============================================================

alter table public.expenses
  add column if not exists bill_url text;

insert into storage.buckets (id, name, public)
values ('bills', 'bills', true)
on conflict (id) do nothing;

-- Drop & recreate storage policies so re-runs stay idempotent
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

create table if not exists public.bird_chats (
  id text primary key,
  owner_id uuid references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  messages jsonb not null default '[]'::jsonb,
  updated bigint not null default 0
);

alter table public.bird_chats
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

create index if not exists bird_chats_owner_updated_idx
  on public.bird_chats (owner_id, updated desc);

alter table public.bird_chats enable row level security;
revoke all on table public.bird_chats from anon;
grant select, insert, update, delete on table public.bird_chats to authenticated;

drop policy if exists "Allow public chat reads" on public.bird_chats;
drop policy if exists "Allow public chat inserts" on public.bird_chats;
drop policy if exists "Allow public chat updates" on public.bird_chats;
drop policy if exists "Users read own Bird chats" on public.bird_chats;
drop policy if exists "Users create own Bird chats" on public.bird_chats;
drop policy if exists "Users update own Bird chats" on public.bird_chats;
drop policy if exists "Users delete own Bird chats" on public.bird_chats;

create policy "Users read own Bird chats"
  on public.bird_chats for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Users create own Bird chats"
  on public.bird_chats for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Users update own Bird chats"
  on public.bird_chats for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users delete own Bird chats"
  on public.bird_chats for delete to authenticated
  using ((select auth.uid()) = owner_id);

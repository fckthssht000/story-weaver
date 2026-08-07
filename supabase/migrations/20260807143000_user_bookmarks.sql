-- user_bookmarks: cloud reading list, separate from offline downloads.
-- Run this in the Supabase SQL editor for your project.

create table if not exists public.user_bookmarks (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  story_id uuid not null references public.stories(id)  on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, story_id)
);

create index if not exists user_bookmarks_user_idx on public.user_bookmarks(user_id);

grant select, insert, delete on public.user_bookmarks to authenticated;
grant all on public.user_bookmarks to service_role;

alter table public.user_bookmarks enable row level security;

drop policy if exists bookmarks_own on public.user_bookmarks;
create policy bookmarks_own on public.user_bookmarks
  for all to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Realtime
alter table public.user_bookmarks replica identity full;
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.user_bookmarks';
  exception when duplicate_object then null;
  end;
end $$;

-- StoryApp — full schema for a fresh Supabase project.
-- Run this once in the SQL editor of the project you connected.
-- Safe to re-run: everything is guarded.

-- ============================= tables =============================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text,
  avatar_url text,
  bio text,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  cover_url text,
  status text not null default 'draft',
  genre text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists stories_author_idx on public.stories(author_id);
create index if not exists stories_status_idx on public.stories(status);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  order_index integer not null,
  title text,
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  content_hash text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chapters_story_idx on public.chapters(story_id, order_index);

create table if not exists public.reading_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete set null,
  scroll_position real not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, story_id)
);

create table if not exists public.story_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, story_id)
);

-- ============================= grants =============================

grant select on public.profiles to anon;
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

grant select on public.stories to anon;
grant select, insert, update, delete on public.stories to authenticated;
grant all on public.stories to service_role;

grant select on public.chapters to anon;
grant select, insert, update, delete on public.chapters to authenticated;
grant all on public.chapters to service_role;

grant select, insert, update, delete on public.reading_progress to authenticated;
grant all on public.reading_progress to service_role;

grant select on public.story_likes to anon;
grant select, insert, delete on public.story_likes to authenticated;
grant all on public.story_likes to service_role;

-- ============================= rls =============================

alter table public.profiles enable row level security;
alter table public.stories enable row level security;
alter table public.chapters enable row level security;
alter table public.reading_progress enable row level security;
alter table public.story_likes enable row level security;

drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles for select using (true);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists stories_public_read on public.stories;
create policy stories_public_read on public.stories for select using (status = 'published');
drop policy if exists stories_author_read on public.stories;
create policy stories_author_read on public.stories for select to authenticated using (auth.uid() = author_id);
drop policy if exists stories_author_insert on public.stories;
create policy stories_author_insert on public.stories for insert to authenticated with check (auth.uid() = author_id);
drop policy if exists stories_author_update on public.stories;
create policy stories_author_update on public.stories for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
drop policy if exists stories_author_delete on public.stories;
create policy stories_author_delete on public.stories for delete to authenticated using (auth.uid() = author_id);

drop policy if exists chapters_public_read on public.chapters;
create policy chapters_public_read on public.chapters for select
  using (exists (select 1 from public.stories s where s.id = chapters.story_id and s.status = 'published'));
drop policy if exists chapters_author_read on public.chapters;
create policy chapters_author_read on public.chapters for select to authenticated
  using (exists (select 1 from public.stories s where s.id = chapters.story_id and s.author_id = auth.uid()));
drop policy if exists chapters_author_write on public.chapters;
create policy chapters_author_write on public.chapters for insert to authenticated
  with check (exists (select 1 from public.stories s where s.id = chapters.story_id and s.author_id = auth.uid()));
drop policy if exists chapters_author_update on public.chapters;
create policy chapters_author_update on public.chapters for update to authenticated
  using (exists (select 1 from public.stories s where s.id = chapters.story_id and s.author_id = auth.uid()))
  with check (exists (select 1 from public.stories s where s.id = chapters.story_id and s.author_id = auth.uid()));
drop policy if exists chapters_author_delete on public.chapters;
create policy chapters_author_delete on public.chapters for delete to authenticated
  using (exists (select 1 from public.stories s where s.id = chapters.story_id and s.author_id = auth.uid()));

drop policy if exists progress_own on public.reading_progress;
create policy progress_own on public.reading_progress for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists likes_public_read on public.story_likes;
create policy likes_public_read on public.story_likes for select using (true);
drop policy if exists likes_insert_own on public.story_likes;
create policy likes_insert_own on public.story_likes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists likes_delete_own on public.story_likes;
create policy likes_delete_own on public.story_likes for delete to authenticated using (auth.uid() = user_id);

-- ======================= functions & triggers =======================

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists stories_updated_at on public.stories;
create trigger stories_updated_at before update on public.stories
  for each row execute function public.set_updated_at();
drop trigger if exists chapters_updated_at on public.chapters;
create trigger chapters_updated_at before update on public.chapters
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare base_username text; final_username text; n int := 0;
begin
  base_username := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'reader'),
    '[^a-z0-9_]', '', 'g'));
  if base_username = '' then base_username := 'reader'; end if;
  final_username := base_username;
  while exists (select 1 from public.profiles p where p.username = final_username) loop
    n := n + 1;
    final_username := base_username || n::text;
  end loop;
  insert into public.profiles (id, username, display_name, avatar_url)
  values (new.id, final_username,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', final_username),
    new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================= realtime =============================

alter table public.profiles replica identity full;
alter table public.stories replica identity full;
alter table public.chapters replica identity full;
alter table public.story_likes replica identity full;
alter table public.reading_progress replica identity full;

do $$
begin
  begin execute 'alter publication supabase_realtime add table public.profiles'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.stories'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.chapters'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.story_likes'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.reading_progress'; exception when duplicate_object then null; end;
end $$;

-- ============================= storage =============================

insert into storage.buckets (id, name, public)
values ('covers', 'covers', true), ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists storyapp_media_read on storage.objects;
create policy storyapp_media_read on storage.objects for select
  using (bucket_id in ('covers', 'avatars'));

drop policy if exists storyapp_media_insert on storage.objects;
create policy storyapp_media_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('covers', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists storyapp_media_update on storage.objects;
create policy storyapp_media_update on storage.objects for update to authenticated
  using (bucket_id in ('covers', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists storyapp_media_delete on storage.objects;
create policy storyapp_media_delete on storage.objects for delete to authenticated
  using (bucket_id in ('covers', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);

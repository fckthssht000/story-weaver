-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- stories
CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  cover_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  genre text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stories_author_idx ON public.stories(author_id);
CREATE INDEX stories_status_idx ON public.stories(status);
GRANT SELECT ON public.stories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stories_public_read" ON public.stories FOR SELECT USING (status = 'published');
CREATE POLICY "stories_author_read" ON public.stories FOR SELECT TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "stories_author_insert" ON public.stories FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "stories_author_update" ON public.stories FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "stories_author_delete" ON public.stories FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- chapters
CREATE TABLE public.chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  order_index int NOT NULL,
  title text,
  content jsonb NOT NULL DEFAULT '{"type":"doc","content":[]}'::jsonb,
  content_hash text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chapters_story_idx ON public.chapters(story_id, order_index);
GRANT SELECT ON public.chapters TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapters TO authenticated;
GRANT ALL ON public.chapters TO service_role;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chapters_public_read" ON public.chapters FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.stories s WHERE s.id = chapters.story_id AND s.status = 'published')
);
CREATE POLICY "chapters_author_read" ON public.chapters FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.stories s WHERE s.id = chapters.story_id AND s.author_id = auth.uid())
);
CREATE POLICY "chapters_author_write" ON public.chapters FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.stories s WHERE s.id = chapters.story_id AND s.author_id = auth.uid())
);
CREATE POLICY "chapters_author_update" ON public.chapters FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.stories s WHERE s.id = chapters.story_id AND s.author_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.stories s WHERE s.id = chapters.story_id AND s.author_id = auth.uid())
);
CREATE POLICY "chapters_author_delete" ON public.chapters FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.stories s WHERE s.id = chapters.story_id AND s.author_id = auth.uid())
);

-- reading_progress
CREATE TABLE public.reading_progress (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  scroll_position real NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, story_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_progress TO authenticated;
GRANT ALL ON public.reading_progress TO service_role;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress_own" ON public.reading_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- story_likes
CREATE TABLE public.story_likes (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, story_id)
);
GRANT SELECT ON public.story_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.story_likes TO authenticated;
GRANT ALL ON public.story_likes TO service_role;
ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes_public_read" ON public.story_likes FOR SELECT USING (true);
CREATE POLICY "likes_insert_own" ON public.story_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete_own" ON public.story_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER stories_updated_at BEFORE UPDATE ON public.stories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER chapters_updated_at BEFORE UPDATE ON public.chapters FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base_username text; final_username text; n int := 0;
BEGIN
  base_username := lower(regexp_replace(
    coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'reader'),
    '[^a-z0-9_]', '', 'g'));
  IF base_username = '' THEN base_username := 'reader'; END IF;
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles p WHERE p.username = final_username) LOOP
    n := n + 1;
    final_username := base_username || n::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (NEW.id, final_username,
    coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', final_username),
    NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
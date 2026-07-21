-- Pixel Quest Values — Supabase schema
-- Run this in Supabase Dashboard → SQL Editor

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper: check if current user is admin or owner
CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
      AND banned = false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_moderator_or_above()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
      AND role IN ('moderator', 'admin', 'owner')
      AND banned = false
  );
$$;

CREATE OR REPLACE FUNCTION public.current_username()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT username FROM public.user_profiles WHERE id = auth.uid();
$$;

-- User profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'beta tester', 'value manager', 'moderator', 'admin', 'owner')),
  ip TEXT DEFAULT 'unknown',
  warnings INT NOT NULL DEFAULT 0,
  banned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uname text;
  owner_count int;
  assigned_role text := 'user';
BEGIN
  uname := COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));

  SELECT COUNT(*) INTO owner_count FROM public.user_profiles WHERE role = 'owner';
  IF owner_count = 0 THEN
    assigned_role := 'owner';
  END IF;

  INSERT INTO public.user_profiles (id, username, role, ip)
  VALUES (
    new.id,
    uname,
    assigned_role,
    COALESCE(new.raw_user_meta_data->>'ip', 'unknown')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Items
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  icon TEXT,
  name TEXT NOT NULL,
  corrupted_pages INT,
  tier TEXT,
  rarity TEXT NOT NULL DEFAULT 'Common',
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trade offers
CREATE TABLE IF NOT EXISTS public.trade_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller TEXT NOT NULL,
  item_name TEXT NOT NULL,
  price TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trade requests
CREATE TABLE IF NOT EXISTS public.trade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester TEXT NOT NULL,
  item_name TEXT NOT NULL,
  cp INT,
  quantity INT NOT NULL DEFAULT 1,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Direct messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user TEXT NOT NULL,
  to_user TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  text TEXT NOT NULL,
  seen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reports
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target TEXT NOT NULL,
  reason TEXT NOT NULL,
  reporter TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Player ratings
CREATE TABLE IF NOT EXISTS public.player_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  rater TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Achievements
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  achievement TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (username, achievement)
);

-- Watchlist
CREATE TABLE IF NOT EXISTS public.watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  item_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (username, item_name)
);

-- Transaction history
CREATE TABLE IF NOT EXISTS public.transaction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID,
  buyer TEXT NOT NULL,
  seller TEXT NOT NULL,
  item TEXT NOT NULL,
  price TEXT,
  rating INT CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Banned IPs (admin)
CREATE TABLE IF NOT EXISTS public.banned_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banned_ips ENABLE ROW LEVEL SECURITY;

-- user_profiles policies
CREATE POLICY "profiles_select_all" ON public.user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.user_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_admin_update" ON public.user_profiles FOR UPDATE TO authenticated
  USING (public.is_admin_or_owner()) WITH CHECK (public.is_admin_or_owner());

-- items policies
CREATE POLICY "items_select_all" ON public.items FOR SELECT TO authenticated USING (true);
CREATE POLICY "items_admin_write" ON public.items FOR ALL TO authenticated
  USING (public.is_admin_or_owner()) WITH CHECK (public.is_admin_or_owner());

-- trade_offers policies
CREATE POLICY "offers_select_all" ON public.trade_offers FOR SELECT TO authenticated USING (true);
CREATE POLICY "offers_insert_own" ON public.trade_offers FOR INSERT TO authenticated
  WITH CHECK (seller = public.current_username());
CREATE POLICY "offers_delete_own" ON public.trade_offers FOR DELETE TO authenticated
  USING (seller = public.current_username() OR public.is_admin_or_owner());

-- trade_requests policies
CREATE POLICY "requests_select_all" ON public.trade_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "requests_insert_own" ON public.trade_requests FOR INSERT TO authenticated
  WITH CHECK (requester = public.current_username());
CREATE POLICY "requests_delete_own" ON public.trade_requests FOR DELETE TO authenticated
  USING (requester = public.current_username() OR public.is_admin_or_owner());

-- messages policies
CREATE POLICY "messages_select_participants" ON public.messages FOR SELECT TO authenticated
  USING (from_user = public.current_username() OR to_user = public.current_username() OR public.is_moderator_or_above());
CREATE POLICY "messages_insert_own" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (from_user = public.current_username());

-- notifications policies
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated
  USING (recipient = public.current_username() OR recipient = 'all' OR public.is_moderator_or_above());
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO authenticated
  USING (recipient = public.current_username() OR recipient = 'all' OR public.is_moderator_or_above());

-- reports policies
CREATE POLICY "reports_select" ON public.reports FOR SELECT TO authenticated
  USING (reporter = public.current_username() OR public.is_moderator_or_above());
CREATE POLICY "reports_insert" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter = public.current_username());
CREATE POLICY "reports_update_mod" ON public.reports FOR UPDATE TO authenticated
  USING (public.is_moderator_or_above());

-- player_ratings policies
CREATE POLICY "ratings_select_all" ON public.player_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "ratings_insert" ON public.player_ratings FOR INSERT TO authenticated
  WITH CHECK (rater = public.current_username());

-- achievements policies
CREATE POLICY "achievements_select_all" ON public.achievements FOR SELECT TO authenticated USING (true);
CREATE POLICY "achievements_insert" ON public.achievements FOR INSERT TO authenticated WITH CHECK (true);

-- watchlist policies
CREATE POLICY "watchlist_select_own" ON public.watchlist FOR SELECT TO authenticated
  USING (username = public.current_username());
CREATE POLICY "watchlist_insert_own" ON public.watchlist FOR INSERT TO authenticated
  WITH CHECK (username = public.current_username());
CREATE POLICY "watchlist_delete_own" ON public.watchlist FOR DELETE TO authenticated
  USING (username = public.current_username());

-- transaction_history policies
CREATE POLICY "transactions_select_all" ON public.transaction_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "transactions_insert" ON public.transaction_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "transactions_update" ON public.transaction_history FOR UPDATE TO authenticated
  USING (buyer = public.current_username() OR seller = public.current_username());

-- banned_ips policies
CREATE POLICY "banned_ips_admin" ON public.banned_ips FOR ALL TO authenticated
  USING (public.is_admin_or_owner()) WITH CHECK (public.is_admin_or_owner());

-- Realtime (optional — enable in Supabase Dashboard if needed)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

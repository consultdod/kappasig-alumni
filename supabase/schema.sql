-- ============================================================
-- Kappa Sigma Alumni Portal — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- MEMBERS TABLE
-- Linked 1:1 with Supabase Auth users (same UUID)
CREATE TABLE IF NOT EXISTS public.members (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 TEXT NOT NULL UNIQUE,
  full_name             TEXT NOT NULL,
  phone                 TEXT,                          -- stored for display only, no auto-calling
  show_phone            BOOLEAN DEFAULT TRUE,          -- controls directory visibility
  grad_year             INT,
  bio                   TEXT,
  avatar_url            TEXT,
  role                  TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  opt_in_member_emails  BOOLEAN DEFAULT TRUE,          -- false = no peer emails; admins always land
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  location      TEXT,
  event_date    TIMESTAMPTZ NOT NULL,
  created_by    UUID REFERENCES public.members(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- RSVPS TABLE
CREATE TABLE IF NOT EXISTS public.rsvps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id     UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  response      TEXT NOT NULL CHECK (response IN ('yes', 'no', 'maybe')),
  responded_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (event_id, member_id)
);

-- MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject       TEXT NOT NULL,
  body          TEXT NOT NULL,
  sender_id     UUID REFERENCES public.members(id),
  audience      TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'members_only', 'admins_only')),
  is_admin_msg  BOOLEAN DEFAULT FALSE,                -- admin messages bypass opt-out
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- MESSAGE RECIPIENTS (delivery log)
CREATE TABLE IF NOT EXISTS public.message_recipients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  member_id     UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  delivered_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (message_id, member_id)
);

-- ALBUMS TABLE (photo groupings)
CREATE TABLE IF NOT EXISTS public.albums (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  cover_url     TEXT,
  created_by    UUID REFERENCES public.members(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- FILES TABLE (photos + documents)
CREATE TABLE IF NOT EXISTS public.files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  url           TEXT,
  file_type     TEXT,                                 -- 'photo', 'document', 'other'
  mime_type     TEXT,
  size_bytes    BIGINT,
  album_id      UUID REFERENCES public.albums(id) ON DELETE SET NULL,
  uploaded_by   UUID REFERENCES public.members(id),
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────────────────────────

ALTER TABLE public.members            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvps              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files              ENABLE ROW LEVEL SECURITY;

-- MEMBERS policies
CREATE POLICY "Members can read all members" ON public.members
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Members can update own profile" ON public.members
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Members can insert own profile" ON public.members
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any member" ON public.members
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.members WHERE id = auth.uid() AND role = 'admin')
  );

-- EVENTS policies
CREATE POLICY "Members can read events" ON public.events
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can create events" ON public.events
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.members WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update events" ON public.events
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.members WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete events" ON public.events
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.members WHERE id = auth.uid() AND role = 'admin')
  );

-- RSVPS policies
CREATE POLICY "Members can read rsvps" ON public.rsvps
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Members can insert own rsvp" ON public.rsvps
  FOR INSERT WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Members can update own rsvp" ON public.rsvps
  FOR UPDATE USING (auth.uid() = member_id);

-- MESSAGES policies
CREATE POLICY "Members can read messages" ON public.messages
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Members can insert messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- MESSAGE RECIPIENTS policies
CREATE POLICY "Members can read own receipts" ON public.message_recipients
  FOR SELECT USING (auth.uid() = member_id);

CREATE POLICY "Admins can read all receipts" ON public.message_recipients
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.members WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System can insert recipients" ON public.message_recipients
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ALBUMS policies
CREATE POLICY "Members can read albums" ON public.albums
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Members can create albums" ON public.albums
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- FILES policies
CREATE POLICY "Members can read files" ON public.files
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Members can upload files" ON public.files
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Uploaders or admins can delete files" ON public.files
  FOR DELETE USING (
    auth.uid() = uploaded_by OR
    EXISTS (SELECT 1 FROM public.members WHERE id = auth.uid() AND role = 'admin')
  );

-- ──────────────────────────────────────────────────────────────
-- STORAGE BUCKETS (run separately in Supabase Storage settings
-- or via the dashboard — SQL below is for reference)
-- ──────────────────────────────────────────────────────────────

-- In Supabase Dashboard → Storage → New Bucket:
-- 1. Name: "photos"     | Private: YES
-- 2. Name: "documents"  | Private: YES
-- 3. Name: "avatars"    | Private: NO (public avatars OK)

-- ──────────────────────────────────────────────────────────────
-- HELPFUL VIEWS
-- ──────────────────────────────────────────────────────────────

-- RSVP summary per event
CREATE OR REPLACE VIEW public.event_rsvp_summary AS
SELECT
  e.id AS event_id,
  e.title,
  e.event_date,
  COUNT(r.id) FILTER (WHERE r.response = 'yes')   AS attending,
  COUNT(r.id) FILTER (WHERE r.response = 'no')    AS declined,
  COUNT(r.id) FILTER (WHERE r.response = 'maybe') AS maybe
FROM public.events e
LEFT JOIN public.rsvps r ON r.event_id = e.id
GROUP BY e.id, e.title, e.event_date;

-- ──────────────────────────────────────────────────────────────
-- FIRST ADMIN SETUP
-- After running this schema, go to Supabase Auth → Users,
-- create your first admin user manually, then run:
--
-- UPDATE public.members SET role = 'admin' WHERE email = 'your@email.com';
-- ──────────────────────────────────────────────────────────────

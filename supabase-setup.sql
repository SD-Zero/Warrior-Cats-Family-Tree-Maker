-- ──────────────────────────────────────────────────────────────────────────────
-- Warrior Cats Family Tree — Supabase setup
-- Run this in your Supabase project's SQL Editor (Database → SQL Editor → New query)
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.trees (
  id              TEXT        PRIMARY KEY,
  data            JSONB       NOT NULL,
  edit_code_hash  TEXT,
  title           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;

-- Anyone can read a tree (view-only links work for all visitors)
CREATE POLICY "Public read"
  ON public.trees FOR SELECT
  USING (true);

-- Anyone can create a new share
CREATE POLICY "Public insert"
  ON public.trees FOR INSERT
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────────────
-- Done! The trees table is ready.
-- ──────────────────────────────────────────────────────────────────────────────

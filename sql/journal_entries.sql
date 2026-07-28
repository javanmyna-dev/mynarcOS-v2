-- =============================================================================
-- journal_entries — Daily check-in data (one row per user per day)
-- =============================================================================
-- Run this entire script in the Supabase SQL Editor:
--   https://exlupwussppoobbuduxx.supabase.co → SQL Editor → New Query
--
-- Why one row per day?
--   The Progress page (Milestone 3) will build a GitHub-style contribution
--   heatmap. Heatmaps expect one row per day — if we stored one row per
--   index, we'd have to pivot/aggregate later. Designing the schema to match
--   the query pattern now means zero data migration when the heatmap lands.
-- =============================================================================

-- 1. Create the table
CREATE TABLE journal_entries (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entry_date   DATE NOT NULL,
    mood         SMALLINT CHECK (mood BETWEEN 1 AND 5),
    sanity       SMALLINT CHECK (sanity BETWEEN 1 AND 5),
    prod_coding  SMALLINT CHECK (prod_coding BETWEEN 1 AND 5),
    prod_drawing SMALLINT CHECK (prod_drawing BETWEEN 1 AND 5),
    prod_reading SMALLINT CHECK (prod_reading BETWEEN 1 AND 5),
    reflection   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Enforce "one row per user per day"
    UNIQUE (user_id, entry_date)
);

-- 2. Enable Row-Level Security
-- Without this, the policies below do nothing.
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies — the *actual* security boundary
-- Supabase's anon key is PUBLIC. RLS is what keeps your data private.
-- Each policy says: "this user can only access rows where user_id = their auth id"

CREATE POLICY "Users can read own entries"
ON journal_entries FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries"
ON journal_entries FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
ON journal_entries FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
ON journal_entries FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 4. GRANT — this is the step that burned Safe2Save
-- RLS policies exist, but Postgres also requires explicit table GRANTs.
-- Missing this = silent 403 on every Supabase call. Triple-check this ran.
GRANT SELECT, INSERT, UPDATE, DELETE ON journal_entries TO authenticated;
GRANT USAGE ON SEQUENCE journal_entries_id_seq TO authenticated;

-- 5. Verify it worked
-- After running, check that the table appears and RLS is enabled:
--   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'journal_entries';
-- Should return: journal_entries | true

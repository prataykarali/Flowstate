-- PrismLab S5-H: Global Championship Schema
-- Supabase PostgreSQL (Project tvzntaafqzixvnavygai)
-- Strictly audited RLS, search_path isolation, and service_role execution privileges

-- 1. Canonical Models Table (Publicly readable)
CREATE TABLE IF NOT EXISTS championship_models (
    model_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    model_family TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed canonical six models
INSERT INTO championship_models (model_id, display_name, model_family, enabled)
VALUES
    ('text', 'Prism Pure', 'LFM3-1.7B', TRUE),
    ('vision', 'Spectra', 'LFM3-VL-2B', TRUE),
    ('audio', 'Echo', 'LFM3-Audio-2B', TRUE),
    ('omni', 'Omni Pup', 'LFM3-Omni-2B', TRUE),
    ('d1', 'Prism Thinker', 'd1-2B', TRUE),
    ('d1_omni', 'Sherlock Omni', 'd1-Omni-2B', TRUE)
ON CONFLICT (model_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    model_family = EXCLUDED.model_family,
    enabled = EXCLUDED.enabled;

-- 2. Materialized / Maintained Totals per Model (Publicly readable non-sensitive aggregate standings)
CREATE TABLE IF NOT EXISTS championship_totals (
    model_id TEXT PRIMARY KEY REFERENCES championship_models(model_id) ON DELETE CASCADE,
    total_points BIGINT NOT NULL DEFAULT 0,
    chat_points BIGINT NOT NULL DEFAULT 0,
    story_points BIGINT NOT NULL DEFAULT 0,
    trivia_points BIGINT NOT NULL DEFAULT 0,
    rating_points BIGINT NOT NULL DEFAULT 0,
    other_eligible_points BIGINT NOT NULL DEFAULT 0,
    last_activity_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed totals with 0
INSERT INTO championship_totals (model_id, total_points, chat_points, story_points, trivia_points, rating_points, other_eligible_points)
VALUES
    ('text', 0, 0, 0, 0, 0, 0),
    ('vision', 0, 0, 0, 0, 0, 0),
    ('audio', 0, 0, 0, 0, 0, 0),
    ('omni', 0, 0, 0, 0, 0, 0),
    ('d1', 0, 0, 0, 0, 0, 0),
    ('d1_omni', 0, 0, 0, 0, 0, 0)
ON CONFLICT (model_id) DO NOTHING;

-- 3. Append-Only Verified Scoring Events (Restricted - sensitive visitor identities and receipts)
CREATE TABLE IF NOT EXISTS championship_events (
    event_id TEXT PRIMARY KEY,
    visitor_id TEXT NOT NULL,
    model_id TEXT NOT NULL REFERENCES championship_models(model_id),
    activity_type TEXT NOT NULL CHECK (activity_type IN ('chat', 'story_turn', 'story_complete', 'trivia_correct', 'trivia_match', 'rating')),
    points INTEGER NOT NULL CHECK (points >= 0),
    source_receipt_id TEXT UNIQUE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_visitor ON championship_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_events_model ON championship_events(model_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON championship_events(created_at DESC);

-- 4. Visitor Model Ratings (Restricted - visitor identities and ratings)
CREATE TABLE IF NOT EXISTS championship_ratings (
    visitor_id TEXT NOT NULL,
    model_id TEXT NOT NULL REFERENCES championship_models(model_id),
    stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (visitor_id, model_id)
);

-- 5. Completed Live Trivia Match Metadata & Results (Restricted - validation metadata)
CREATE TABLE IF NOT EXISTS championship_matches (
    match_id TEXT PRIMARY KEY,
    host_model_id TEXT NOT NULL REFERENCES championship_models(model_id),
    status TEXT NOT NULL,
    question_count INTEGER NOT NULL DEFAULT 0,
    verification_metadata JSONB,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS championship_match_results (
    match_id TEXT NOT NULL REFERENCES championship_matches(match_id) ON DELETE CASCADE,
    model_id TEXT NOT NULL REFERENCES championship_models(model_id),
    valid_answers INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    verified_points INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (match_id, model_id)
);

-- 6. Atomic Transaction Function for Scoring Events
CREATE OR REPLACE FUNCTION record_championship_event(
    p_event_id TEXT,
    p_visitor_id TEXT,
    p_model_id TEXT,
    p_activity_type TEXT,
    p_points INTEGER,
    p_source_receipt_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
    v_existing public.championship_events%ROWTYPE;
    v_inserted_event_id TEXT;
BEGIN
    IF p_activity_type = 'rating' THEN RAISE EXCEPTION 'Ratings must use the rating RPC'; END IF;
    IF p_source_receipt_id IS NULL OR btrim(p_source_receipt_id) = '' THEN RAISE EXCEPTION 'Receipt ID required'; END IF;
    IF p_event_id IS NULL OR btrim(p_event_id) = '' OR p_visitor_id IS NULL OR btrim(p_visitor_id) = '' THEN RAISE EXCEPTION 'Event ID and visitor ID required'; END IF;
    -- Idempotency check: duplicate event_id or source_receipt_id
    IF p_source_receipt_id IS NOT NULL THEN
        SELECT * INTO v_existing FROM public.championship_events WHERE source_receipt_id = p_source_receipt_id LIMIT 1;
        IF FOUND THEN
            RETURN jsonb_build_object('status', 'duplicate', 'event_id', v_existing.event_id, 'points', v_existing.points);
        END IF;
    END IF;

    SELECT * INTO v_existing FROM public.championship_events WHERE event_id = p_event_id LIMIT 1;
    IF FOUND THEN
        RETURN jsonb_build_object('status', 'duplicate', 'event_id', v_existing.event_id, 'points', v_existing.points);
    END IF;

    -- Concurrency row lock on target model totals
    PERFORM 1 FROM public.championship_totals WHERE model_id = p_model_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Unknown or unseeded model'; END IF;

    -- Uniqueness constraints protect against concurrent duplicate receipts across models.
    INSERT INTO public.championship_events (event_id, visitor_id, model_id, activity_type, points, source_receipt_id, completed_at)
    VALUES (p_event_id, p_visitor_id, p_model_id, p_activity_type, p_points, p_source_receipt_id, NOW())
    ON CONFLICT DO NOTHING RETURNING event_id INTO v_inserted_event_id;
    IF v_inserted_event_id IS NULL THEN
        SELECT * INTO v_existing FROM public.championship_events
        WHERE event_id = p_event_id OR source_receipt_id = p_source_receipt_id LIMIT 1;
        IF FOUND THEN
            RETURN jsonb_build_object('status', 'duplicate', 'event_id', v_existing.event_id, 'points', v_existing.points);
        END IF;
        RAISE EXCEPTION 'Unique scoring event conflict';
    END IF;

    -- Atomically update model totals
    UPDATE public.championship_totals
    SET
        total_points = total_points + p_points,
        chat_points = chat_points + (CASE WHEN p_activity_type = 'chat' THEN p_points ELSE 0 END),
        story_points = story_points + (CASE WHEN p_activity_type IN ('story_turn', 'story_complete') THEN p_points ELSE 0 END),
        trivia_points = trivia_points + (CASE WHEN p_activity_type IN ('trivia_correct', 'trivia_match') THEN p_points ELSE 0 END),
        other_eligible_points = other_eligible_points + (CASE WHEN p_activity_type NOT IN ('chat', 'story_turn', 'story_complete', 'trivia_correct', 'trivia_match', 'rating') THEN p_points ELSE 0 END),
        last_activity_at = NOW(),
        updated_at = NOW()
    WHERE model_id = p_model_id;

    RETURN jsonb_build_object('status', 'recorded', 'event_id', p_event_id, 'points', p_points);
END;
$$;

-- 7. Atomic Rating Update Function (replaces prior rating)
CREATE OR REPLACE FUNCTION record_championship_rating(
    p_visitor_id TEXT,
    p_model_id TEXT,
    p_stars INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
    v_old_stars INTEGER := 0;
    v_delta_points INTEGER := 0;
BEGIN
    IF p_stars < 1 OR p_stars > 5 THEN
        RAISE EXCEPTION 'Stars must be between 1 and 5';
    END IF;

    -- Concurrency row lock on target model totals
    PERFORM 1 FROM public.championship_totals WHERE model_id = p_model_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Unknown or unseeded model'; END IF;

    IF p_visitor_id IS NULL OR btrim(p_visitor_id) = '' THEN RAISE EXCEPTION 'Visitor ID required'; END IF;
    -- Get prior rating if exists
    SELECT stars INTO v_old_stars FROM public.championship_ratings
    WHERE visitor_id = p_visitor_id AND model_id = p_model_id;

    IF FOUND THEN
        v_delta_points := (p_stars * 2) - (v_old_stars * 2);
        UPDATE public.championship_ratings
        SET stars = p_stars, updated_at = NOW()
        WHERE visitor_id = p_visitor_id AND model_id = p_model_id;
    ELSE
        v_delta_points := p_stars * 2;
        INSERT INTO public.championship_ratings (visitor_id, model_id, stars)
        VALUES (p_visitor_id, p_model_id, p_stars);
    END IF;

    -- Update model totals with delta
    UPDATE public.championship_totals
    SET
        total_points = total_points + v_delta_points,
        rating_points = rating_points + v_delta_points,
        last_activity_at = NOW(),
        updated_at = NOW()
    WHERE model_id = p_model_id;

    RETURN jsonb_build_object('status', 'recorded', 'model_id', p_model_id, 'stars', p_stars, 'delta_points', v_delta_points);
END;
$$;

-- 8. Row Level Security (RLS) Configuration
ALTER TABLE championship_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE championship_totals ENABLE ROW LEVEL SECURITY;
ALTER TABLE championship_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE championship_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE championship_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE championship_match_results ENABLE ROW LEVEL SECURITY;

-- Clean existing policies if re-running
DROP POLICY IF EXISTS "Public read championship_models" ON championship_models;
DROP POLICY IF EXISTS "Public read championship_totals" ON championship_totals;
DROP POLICY IF EXISTS "Public read championship_events" ON championship_events;
DROP POLICY IF EXISTS "Public read championship_ratings" ON championship_ratings;
DROP POLICY IF EXISTS "Public read championship_matches" ON championship_matches;
DROP POLICY IF EXISTS "Public read championship_match_results" ON championship_match_results;

-- PUBLIC READ ONLY FOR NON-SENSITIVE LEADERBOARD AGGREGATES
CREATE POLICY "Public read championship_models" ON championship_models FOR SELECT USING (true);
CREATE POLICY "Public read championship_totals" ON championship_totals FOR SELECT USING (true);

-- RESTRICT ALL SENSITIVE TABLES (events, ratings, matches, results)
-- No public/anon policies created. Only service_role (bypassing RLS or explicitly granted) can read/write.

-- 9. Privileged Function Execution Rights
-- Revoke PUBLIC/anon/authenticated execution
REVOKE EXECUTE ON FUNCTION record_championship_event(TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_championship_event(TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION record_championship_rating(TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_championship_rating(TEXT, TEXT, INTEGER) TO service_role;

-- Explicit least privilege table grants; RLS remains mandatory.
REVOKE ALL ON TABLE public.championship_models, public.championship_totals FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.championship_models, public.championship_totals TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.championship_models, public.championship_totals TO service_role;
REVOKE ALL ON TABLE public.championship_events, public.championship_ratings, public.championship_matches, public.championship_match_results FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.championship_events, public.championship_ratings, public.championship_matches, public.championship_match_results TO service_role;

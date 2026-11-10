-- Persist Runner awards in the canonical Championship arcade category.
ALTER TABLE public.championship_totals
  ADD COLUMN IF NOT EXISTS arcade_points BIGINT NOT NULL DEFAULT 0;

ALTER TABLE public.championship_events
  DROP CONSTRAINT IF EXISTS championship_events_activity_type_check;

ALTER TABLE public.championship_events
  ADD CONSTRAINT championship_events_activity_type_check
  CHECK (activity_type IN (
    'chat', 'story_turn', 'story_complete', 'trivia_correct', 'trivia_match',
    'rating', 'runner_completed', 'arcade'
  ));

CREATE OR REPLACE FUNCTION public.record_championship_event(
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
    IF p_activity_type NOT IN ('chat', 'story_turn', 'story_complete', 'trivia_correct', 'trivia_match', 'runner_completed', 'arcade') THEN
        RAISE EXCEPTION 'Unsupported activity type';
    END IF;
    IF p_source_receipt_id IS NULL OR btrim(p_source_receipt_id) = '' THEN RAISE EXCEPTION 'Receipt ID required'; END IF;
    IF p_event_id IS NULL OR btrim(p_event_id) = '' OR p_visitor_id IS NULL OR btrim(p_visitor_id) = '' THEN RAISE EXCEPTION 'Event ID and visitor ID required'; END IF;

    SELECT * INTO v_existing FROM public.championship_events WHERE source_receipt_id = p_source_receipt_id LIMIT 1;
    IF FOUND THEN
        RETURN jsonb_build_object('status', 'duplicate', 'event_id', v_existing.event_id, 'points', v_existing.points);
    END IF;
    SELECT * INTO v_existing FROM public.championship_events WHERE event_id = p_event_id LIMIT 1;
    IF FOUND THEN
        RETURN jsonb_build_object('status', 'duplicate', 'event_id', v_existing.event_id, 'points', v_existing.points);
    END IF;

    PERFORM 1 FROM public.championship_totals WHERE model_id = p_model_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Unknown or unseeded model'; END IF;

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

    UPDATE public.championship_totals
    SET total_points = total_points + p_points,
        chat_points = chat_points + CASE WHEN p_activity_type = 'chat' THEN p_points ELSE 0 END,
        story_points = story_points + CASE WHEN p_activity_type IN ('story_turn', 'story_complete') THEN p_points ELSE 0 END,
        trivia_points = trivia_points + CASE WHEN p_activity_type IN ('trivia_correct', 'trivia_match') THEN p_points ELSE 0 END,
        arcade_points = arcade_points + CASE WHEN p_activity_type IN ('runner_completed', 'arcade') THEN p_points ELSE 0 END,
        other_eligible_points = other_eligible_points + CASE WHEN p_activity_type IN ('runner_completed', 'arcade') THEN p_points ELSE 0 END,
        last_activity_at = NOW(),
        updated_at = NOW()
    WHERE model_id = p_model_id;

    RETURN jsonb_build_object('status', 'recorded', 'event_id', p_event_id, 'points', p_points);
END;
$$;

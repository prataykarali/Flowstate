-- Applied to PrismLab project tvzntaafqzixvnavygai
-- Remote migration: 20261106152852_championship_fk_supporting_indexes
CREATE INDEX IF NOT EXISTS idx_championship_ratings_model_id ON public.championship_ratings(model_id);
CREATE INDEX IF NOT EXISTS idx_championship_matches_host_model_id ON public.championship_matches(host_model_id);
CREATE INDEX IF NOT EXISTS idx_championship_match_results_model_id ON public.championship_match_results(model_id);

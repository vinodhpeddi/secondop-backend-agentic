ALTER TABLE case_analysis_runs
  ADD COLUMN IF NOT EXISTS engine VARCHAR(20) NOT NULL DEFAULT 'baseline',
  ADD COLUMN IF NOT EXISTS execution_mode VARCHAR(20) NOT NULL DEFAULT 'off';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'case_analysis_runs_engine_check'
    ) THEN
        ALTER TABLE case_analysis_runs
            ADD CONSTRAINT case_analysis_runs_engine_check
            CHECK (engine IN ('baseline', 'agentic'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'case_analysis_runs_execution_mode_check'
    ) THEN
        ALTER TABLE case_analysis_runs
            ADD CONSTRAINT case_analysis_runs_execution_mode_check
            CHECK (execution_mode IN ('off', 'shadow', 'direct'));
    END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_case_analysis_runs_active_unique') THEN
    DROP INDEX idx_case_analysis_runs_active_unique;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_case_analysis_runs_active_engine_unique
  ON case_analysis_runs(case_id, engine)
  WHERE status IN ('queued', 'processing');

CREATE INDEX IF NOT EXISTS idx_case_analysis_runs_case_engine_created
  ON case_analysis_runs(case_id, engine, created_at DESC);

CREATE TABLE IF NOT EXISTS case_analysis_shadow_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    run_id UUID NOT NULL REFERENCES case_analysis_runs(id) ON DELETE CASCADE,
    mode VARCHAR(20) NOT NULL,
    summary TEXT NOT NULL,
    questions_json JSONB NOT NULL,
    observations_json JSONB NOT NULL,
    critic_score_json JSONB,
    final_status VARCHAR(20) NOT NULL,
    error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT case_analysis_shadow_results_mode_check CHECK (mode IN ('off', 'shadow', 'direct')),
    CONSTRAINT case_analysis_shadow_results_status_check CHECK (final_status IN ('succeeded', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_case_analysis_shadow_case_created
  ON case_analysis_shadow_results(case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_analysis_shadow_run
  ON case_analysis_shadow_results(run_id);

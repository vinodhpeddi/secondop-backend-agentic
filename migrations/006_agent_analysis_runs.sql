CREATE TABLE IF NOT EXISTS case_analysis_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'queued',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    model VARCHAR(100),
    error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT case_analysis_runs_status_check CHECK (status IN ('queued', 'processing', 'succeeded', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_case_analysis_runs_case_created ON case_analysis_runs(case_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_case_analysis_runs_active_unique
  ON case_analysis_runs(case_id)
  WHERE status IN ('queued', 'processing');

CREATE TABLE IF NOT EXISTS case_analysis_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES case_analysis_runs(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    step_name VARCHAR(100) NOT NULL,
    step_status VARCHAR(20) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    metadata_json JSONB,
    error_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT case_analysis_events_status_check CHECK (step_status IN ('started', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_case_analysis_events_run_started ON case_analysis_events(run_id, started_at);

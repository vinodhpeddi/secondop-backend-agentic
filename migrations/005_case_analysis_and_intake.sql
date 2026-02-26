-- Case intake data captured at submission time
CREATE TABLE IF NOT EXISTS case_intake (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,
    age_at_submission INTEGER NOT NULL CHECK (age_at_submission BETWEEN 0 AND 130),
    sex VARCHAR(20) NOT NULL,
    specialty_context VARCHAR(100) NOT NULL,
    symptoms TEXT NOT NULL,
    symptom_duration TEXT NOT NULL,
    medical_history TEXT NOT NULL,
    current_medications TEXT NOT NULL,
    allergies TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_case_intake_case_id ON case_intake(case_id);

-- Case-level analysis lifecycle and outputs
ALTER TABLE cases
    ADD COLUMN IF NOT EXISTS analysis_status VARCHAR(20) NOT NULL DEFAULT 'not_started',
    ADD COLUMN IF NOT EXISTS analysis_summary TEXT,
    ADD COLUMN IF NOT EXISTS analysis_questions JSONB,
    ADD COLUMN IF NOT EXISTS specialist_questions JSONB,
    ADD COLUMN IF NOT EXISTS analysis_model VARCHAR(100),
    ADD COLUMN IF NOT EXISTS analysis_error TEXT,
    ADD COLUMN IF NOT EXISTS analysis_started_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS analysis_completed_at TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'cases_analysis_status_check'
    ) THEN
        ALTER TABLE cases
            ADD CONSTRAINT cases_analysis_status_check
            CHECK (analysis_status IN ('not_started', 'queued', 'processing', 'succeeded', 'failed'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'cases_analysis_questions_check'
    ) THEN
        ALTER TABLE cases
            ADD CONSTRAINT cases_analysis_questions_check
            CHECK (
                analysis_questions IS NULL
                OR (
                    jsonb_typeof(analysis_questions) = 'array'
                    AND jsonb_array_length(analysis_questions) = 3
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'cases_specialist_questions_check'
    ) THEN
        ALTER TABLE cases
            ADD CONSTRAINT cases_specialist_questions_check
            CHECK (
                specialist_questions IS NULL
                OR (
                    jsonb_typeof(specialist_questions) = 'array'
                    AND jsonb_array_length(specialist_questions) = 3
                )
            );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cases_analysis_status ON cases(analysis_status);

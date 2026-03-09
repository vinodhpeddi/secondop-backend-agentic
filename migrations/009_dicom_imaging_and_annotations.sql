CREATE TABLE IF NOT EXISTS dicom_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL UNIQUE REFERENCES medical_files(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    study_instance_uid TEXT,
    series_instance_uid TEXT,
    sop_instance_uid TEXT,
    modality VARCHAR(32),
    study_date DATE,
    series_description TEXT,
    instance_number INTEGER,
    body_part_examined TEXT,
    rows INTEGER,
    columns INTEGER,
    patient_name TEXT,
    patient_id TEXT,
    dicom_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    dicom_extraction_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    dicom_extraction_error TEXT,
    extracted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'dicom_instances_extraction_status_check'
    ) THEN
        ALTER TABLE dicom_instances
            ADD CONSTRAINT dicom_instances_extraction_status_check
            CHECK (dicom_extraction_status IN ('pending', 'succeeded', 'failed'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_dicom_instances_case_id
  ON dicom_instances(case_id);

CREATE INDEX IF NOT EXISTS idx_dicom_instances_study_uid
  ON dicom_instances(study_instance_uid);

CREATE INDEX IF NOT EXISTS idx_dicom_instances_series_uid
  ON dicom_instances(series_instance_uid);

CREATE INDEX IF NOT EXISTS idx_dicom_instances_extraction_status
  ON dicom_instances(dicom_extraction_status);

CREATE TABLE IF NOT EXISTS file_annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES medical_files(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    saved_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sop_instance_uid TEXT,
    annotations_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    viewport_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_file_annotations_file_user_unique
  ON file_annotations(file_id, saved_by);

CREATE INDEX IF NOT EXISTS idx_file_annotations_case_id
  ON file_annotations(case_id);

CREATE INDEX IF NOT EXISTS idx_file_annotations_saved_by
  ON file_annotations(saved_by);

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS analysis_artifact JSONB;

ALTER TABLE case_analysis_shadow_results
  ADD COLUMN IF NOT EXISTS artifact_json JSONB;

UPDATE cases
SET analysis_artifact = jsonb_build_object(
  'structured_summary', jsonb_build_object(
    'chief_concern', COALESCE(analysis_summary, ''),
    'key_report_findings', '',
    'red_flags_to_discuss', '',
    'follow_up_discussion_points', '',
    'limitations_caveats', ''
  ),
  'questionnaire', jsonb_build_object(
    'specialist_questions',
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('id', 'q' || item.ordinality, 'question', item.value))
        FROM jsonb_array_elements_text(COALESCE(analysis_questions, '[]'::jsonb)) WITH ORDINALITY AS item(value, ordinality)
      ),
      '[]'::jsonb
    )
  ),
  'confidence_score', 0.5,
  'disclaimer', 'This summary supports a second-opinion workflow and is not a diagnosis or treatment plan. A licensed clinician must review the source records and patient context before acting on it.',
  'evidence_refs', '[]'::jsonb,
  'model', COALESCE(analysis_model, 'unknown'),
  'token_usage', NULL
)
WHERE analysis_artifact IS NULL
  AND (analysis_summary IS NOT NULL OR analysis_questions IS NOT NULL);

UPDATE case_analysis_shadow_results
SET artifact_json = jsonb_build_object(
  'structured_summary', jsonb_build_object(
    'chief_concern', COALESCE(summary, ''),
    'key_report_findings', '',
    'red_flags_to_discuss', '',
    'follow_up_discussion_points', '',
    'limitations_caveats', ''
  ),
  'questionnaire', jsonb_build_object(
    'specialist_questions',
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('id', 'q' || item.ordinality, 'question', item.value))
        FROM jsonb_array_elements_text(COALESCE(questions_json, '[]'::jsonb)) WITH ORDINALITY AS item(value, ordinality)
      ),
      '[]'::jsonb
    )
  ),
  'confidence_score', 0.5,
  'disclaimer', 'This summary supports a second-opinion workflow and is not a diagnosis or treatment plan. A licensed clinician must review the source records and patient context before acting on it.',
  'evidence_refs', '[]'::jsonb,
  'model', 'unknown',
  'token_usage', NULL
)
WHERE artifact_json IS NULL;

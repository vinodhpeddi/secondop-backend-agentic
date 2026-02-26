import { query } from '../../database/connection';

export const getCaseRunTrace = async (caseId: string, runId?: string) => {
  const runsResult = await query(
    `SELECT id, case_id, status, engine, execution_mode, started_at, completed_at, model, error, created_at
     FROM case_analysis_runs
     WHERE case_id = $1
     ORDER BY created_at DESC
     LIMIT 20`,
    [caseId]
  );

  const selectedRunId = runId || (runsResult.rows[0]?.id as string | undefined);

  const eventsResult = selectedRunId
    ? await query(
        `SELECT id, run_id, case_id, step_name, step_status, started_at, completed_at, metadata_json, error_text, created_at
         FROM case_analysis_events
         WHERE run_id = $1
         ORDER BY started_at ASC, created_at ASC`,
        [selectedRunId]
      )
    : { rows: [] };

  const shadowResult = selectedRunId
    ? await query(
        `SELECT id, case_id, run_id, mode, summary, questions_json, observations_json, critic_score_json, final_status, error, created_at
         FROM case_analysis_shadow_results
         WHERE run_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [selectedRunId]
      )
    : { rows: [] };

  return {
    runs: runsResult.rows,
    selectedRunId: selectedRunId || null,
    events: eventsResult.rows,
    shadow: shadowResult.rows[0] || null,
  };
};

import { query } from '../database/connection';
import { AgenticCriticScore } from '../agentic/core/types';

export type AnalysisRunStatus = 'queued' | 'processing' | 'succeeded' | 'failed';
export type AnalysisRunEngine = 'baseline' | 'agentic';
export type AnalysisExecutionMode = 'off' | 'shadow' | 'direct';

export interface AnalysisRun {
  id: string;
  case_id: string;
  status: AnalysisRunStatus;
  engine: AnalysisRunEngine;
  execution_mode: AnalysisExecutionMode;
  started_at: Date | null;
  completed_at: Date | null;
  model: string | null;
  error: string | null;
  created_at: Date;
}

export interface ShadowResult {
  id: string;
  case_id: string;
  run_id: string;
  mode: AnalysisExecutionMode;
  summary: string;
  questions_json: string[];
  observations_json: string[];
  critic_score_json: AgenticCriticScore | null;
  final_status: 'succeeded' | 'failed';
  error: string | null;
  created_at: Date;
}

export type AnalysisEventStatus = 'started' | 'completed' | 'failed';

interface AnalysisEventInput {
  runId: string;
  caseId: string;
  stepName: string;
  stepStatus: AnalysisEventStatus;
  startedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown> | null;
  errorText?: string | null;
}

interface CreateShadowResultInput {
  caseId: string;
  runId: string;
  mode: AnalysisExecutionMode;
  summary: string;
  questions: string[];
  observations: string[];
  criticScore: AgenticCriticScore | null;
  finalStatus: 'succeeded' | 'failed';
  error?: string;
}

const mapAnalysisRunRow = (row: Record<string, unknown>): AnalysisRun => {
  return {
    id: String(row.id),
    case_id: String(row.case_id),
    status: row.status as AnalysisRunStatus,
    engine: (row.engine as AnalysisRunEngine) || 'baseline',
    execution_mode: (row.execution_mode as AnalysisExecutionMode) || 'off',
    started_at: row.started_at instanceof Date ? row.started_at : null,
    completed_at: row.completed_at instanceof Date ? row.completed_at : null,
    model: typeof row.model === 'string' ? row.model : null,
    error: typeof row.error === 'string' ? row.error : null,
    created_at: row.created_at as Date,
  };
};

const mapShadowRow = (row: Record<string, unknown>): ShadowResult => {
  return {
    id: String(row.id),
    case_id: String(row.case_id),
    run_id: String(row.run_id),
    mode: row.mode as AnalysisExecutionMode,
    summary: typeof row.summary === 'string' ? row.summary : '',
    questions_json: Array.isArray(row.questions_json) ? (row.questions_json as string[]) : [],
    observations_json: Array.isArray(row.observations_json) ? (row.observations_json as string[]) : [],
    critic_score_json: (row.critic_score_json as AgenticCriticScore | null) || null,
    final_status: row.final_status as 'succeeded' | 'failed',
    error: typeof row.error === 'string' ? row.error : null,
    created_at: row.created_at as Date,
  };
};

export const createAnalysisRun = async (
  caseId: string,
  status: AnalysisRunStatus = 'queued',
  engine: AnalysisRunEngine = 'baseline',
  executionMode: AnalysisExecutionMode = 'off'
): Promise<AnalysisRun> => {
  try {
    const result = await query(
      `INSERT INTO case_analysis_runs (case_id, status, engine, execution_mode)
       VALUES ($1, $2, $3, $4)
       RETURNING id, case_id, status, engine, execution_mode, started_at, completed_at, model, error, created_at`,
      [caseId, status, engine, executionMode]
    );

    return mapAnalysisRunRow(result.rows[0] as Record<string, unknown>);
  } catch (error) {
    const dbError = error as { code?: string };
    if (dbError.code === '23505') {
      const existing = await getLatestActiveAnalysisRun(caseId, engine);
      if (existing) {
        return existing;
      }
    }

    throw error;
  }
};

export const getLatestAnalysisRun = async (caseId: string): Promise<AnalysisRun | null> => {
  const result = await query(
    `SELECT id, case_id, status, engine, execution_mode, started_at, completed_at, model, error, created_at
     FROM case_analysis_runs
     WHERE case_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [caseId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapAnalysisRunRow(result.rows[0] as Record<string, unknown>);
};

export const getLatestAnalysisRunByEngine = async (
  caseId: string,
  engine: AnalysisRunEngine
): Promise<AnalysisRun | null> => {
  const result = await query(
    `SELECT id, case_id, status, engine, execution_mode, started_at, completed_at, model, error, created_at
     FROM case_analysis_runs
     WHERE case_id = $1 AND engine = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [caseId, engine]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapAnalysisRunRow(result.rows[0] as Record<string, unknown>);
};

export const getLatestActiveAnalysisRun = async (
  caseId: string,
  engine: AnalysisRunEngine = 'baseline'
): Promise<AnalysisRun | null> => {
  const result = await query(
    `SELECT id, case_id, status, engine, execution_mode, started_at, completed_at, model, error, created_at
     FROM case_analysis_runs
     WHERE case_id = $1
       AND engine = $2
       AND status IN ('queued', 'processing')
     ORDER BY created_at DESC
     LIMIT 1`,
    [caseId, engine]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapAnalysisRunRow(result.rows[0] as Record<string, unknown>);
};

export const markAnalysisRunProcessing = async (runId: string): Promise<boolean> => {
  const result = await query(
    `UPDATE case_analysis_runs
     SET status = 'processing',
         started_at = COALESCE(started_at, CURRENT_TIMESTAMP)
     WHERE id = $1
       AND status = 'queued'
     RETURNING id`,
    [runId]
  );

  return result.rows.length > 0;
};

export const markAnalysisRunQueued = async (runId: string, errorMessage?: string): Promise<void> => {
  await query(
    `UPDATE case_analysis_runs
     SET status = 'queued',
         error = $2,
         started_at = NULL,
         completed_at = NULL
     WHERE id = $1`,
    [runId, errorMessage || null]
  );
};

export const markAnalysisRunSucceeded = async (runId: string, model: string): Promise<void> => {
  await query(
    `UPDATE case_analysis_runs
     SET status = 'succeeded',
         model = $2,
         error = NULL,
         completed_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [runId, model]
  );
};

export const markAnalysisRunFailed = async (runId: string, errorMessage: string): Promise<void> => {
  await query(
    `UPDATE case_analysis_runs
     SET status = 'failed',
         error = $2,
         completed_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [runId, errorMessage]
  );
};

export const insertAnalysisEvent = async (event: AnalysisEventInput): Promise<void> => {
  await query(
    `INSERT INTO case_analysis_events (
      run_id,
      case_id,
      step_name,
      step_status,
      started_at,
      completed_at,
      metadata_json,
      error_text
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      event.runId,
      event.caseId,
      event.stepName,
      event.stepStatus,
      event.startedAt,
      event.completedAt || null,
      event.metadata ? JSON.stringify(event.metadata) : null,
      event.errorText || null,
    ]
  );
};

export const createShadowResult = async (input: CreateShadowResultInput): Promise<ShadowResult> => {
  const result = await query(
    `INSERT INTO case_analysis_shadow_results (
      case_id,
      run_id,
      mode,
      summary,
      questions_json,
      observations_json,
      critic_score_json,
      final_status,
      error
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, case_id, run_id, mode, summary, questions_json, observations_json, critic_score_json, final_status, error, created_at`,
    [
      input.caseId,
      input.runId,
      input.mode,
      input.summary,
      JSON.stringify(input.questions),
      JSON.stringify(input.observations),
      input.criticScore ? JSON.stringify(input.criticScore) : null,
      input.finalStatus,
      input.error || null,
    ]
  );

  return mapShadowRow(result.rows[0] as Record<string, unknown>);
};

export const getLatestShadowResultByRunId = async (runId: string): Promise<ShadowResult | null> => {
  const result = await query(
    `SELECT id, case_id, run_id, mode, summary, questions_json, observations_json, critic_score_json, final_status, error, created_at
     FROM case_analysis_shadow_results
     WHERE run_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [runId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapShadowRow(result.rows[0] as Record<string, unknown>);
};

export const getLatestShadowResultByCaseId = async (caseId: string): Promise<ShadowResult | null> => {
  const result = await query(
    `SELECT id, case_id, run_id, mode, summary, questions_json, observations_json, critic_score_json, final_status, error, created_at
     FROM case_analysis_shadow_results
     WHERE case_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [caseId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapShadowRow(result.rows[0] as Record<string, unknown>);
};

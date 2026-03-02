import { query } from '../database/connection';
import logger from '../utils/logger';
import { AgentError } from '../agents/core/agent.types';
import { runCaseAnalysis } from '../agents/case-analysis/runCaseAnalysis';
import { resolveAgenticMode } from '../agentic/core/policy';
import { runAgenticCaseAnalysis } from '../agentic/orchestration/runAgenticCaseAnalysis';
import { startPhoenixSpan } from '../observability/phoenix.service';
import {
  createAnalysisRun,
  getLatestActiveAnalysisRun,
  markAnalysisRunFailed,
  markAnalysisRunProcessing,
  markAnalysisRunQueued,
  markAnalysisRunSucceeded,
} from './analysisRun.service';

const maxCharsPerFile = parseInt(process.env.ANALYSIS_MAX_CHARS_PER_FILE || '12000', 10);
const maxTotalChars = parseInt(process.env.ANALYSIS_MAX_TOTAL_CHARS || '30000', 10);

interface AnalysisQueueJob {
  caseId: string;
  runId: string;
}

interface QueueCaseResult {
  analysisRunId: string;
  analysisStatus: 'queued' | 'processing';
}

class AnalysisWorker {
  private queue: AnalysisQueueJob[] = [];
  private queuedSet = new Set<string>();
  private running = false;

  public async recoverInterruptedJobs(): Promise<void> {
    const result = await query(
      `SELECT id, analysis_status
       FROM cases
       WHERE analysis_status IN ('queued', 'processing')`
    );

    const rows = result.rows as Array<{ id: string; analysis_status: string }>;

    for (const row of rows) {
      let run = await getLatestActiveAnalysisRun(row.id, 'baseline');

      if (row.analysis_status === 'processing') {
        await query(
          `UPDATE cases
           SET analysis_status = 'queued',
               analysis_error = 'Recovered after server restart while processing.',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [row.id]
        );

        if (run && run.status === 'processing') {
          await markAnalysisRunQueued(run.id, 'Recovered after server restart while processing.');
          run = {
            ...run,
            status: 'queued',
          };
        }
      }

      if (!run) {
        run = await createAnalysisRun(row.id, 'queued', 'baseline', resolveAgenticMode());
      }

      this.enqueue({
        caseId: row.id,
        runId: run.id,
      });
    }

    if (rows.length > 0) {
      logger.info(`Recovered ${rows.length} queued analysis job(s)`);
    }

    void this.processQueue();
  }

  public async queueCase(caseId: string): Promise<QueueCaseResult> {
    const mode = resolveAgenticMode();
    const activeRun = await getLatestActiveAnalysisRun(caseId, 'baseline');
    if (activeRun) {
      if (activeRun.status === 'queued') {
        this.enqueue({
          caseId,
          runId: activeRun.id,
        });
        void this.processQueue();
      }

      return {
        analysisRunId: activeRun.id,
        analysisStatus: activeRun.status === 'processing' ? 'processing' : 'queued',
      };
    }

    await query(
      `UPDATE cases
       SET analysis_status = 'queued',
           analysis_error = NULL,
           analysis_summary = NULL,
           analysis_questions = NULL,
           analysis_model = NULL,
           analysis_started_at = NULL,
           analysis_completed_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [caseId]
    );

    const run = await createAnalysisRun(caseId, 'queued', 'baseline', mode);

    this.enqueue({
      caseId,
      runId: run.id,
    });
    void this.processQueue();

    return {
      analysisRunId: run.id,
      analysisStatus: 'queued',
    };
  }

  private enqueue(job: AnalysisQueueJob): void {
    if (this.queuedSet.has(job.caseId)) {
      return;
    }

    this.queue.push(job);
    this.queuedSet.add(job.caseId);
  }

  private async processQueue(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      while (this.queue.length > 0) {
        const job = this.queue.shift();
        if (!job) {
          continue;
        }

        this.queuedSet.delete(job.caseId);
        await this.processCase(job);
      }
    } finally {
      this.running = false;
    }
  }

  private async processCase(job: AnalysisQueueJob): Promise<void> {
    const { caseId, runId } = job;
    const mode = resolveAgenticMode();
    const baselineRunSpan = startPhoenixSpan('analysis.baseline.run', {
      caseId,
      runId,
      mode,
    });

    try {
      await query(
        `UPDATE cases
         SET analysis_status = 'processing',
             analysis_error = NULL,
             analysis_started_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [caseId]
      );

      await markAnalysisRunProcessing(runId);

      await runCaseAnalysis({
        caseId,
        runId,
        maxCharsPerFile,
        maxTotalChars,
        executionMode: mode,
      });

      baselineRunSpan.end('OK');
      logger.info(`Baseline analysis completed for case ${caseId} (run ${runId})`);

      if (mode === 'off') {
        return;
      }

      const agenticRun = await createAnalysisRun(caseId, 'queued', 'agentic', mode);
      const agenticRunSpan = startPhoenixSpan('analysis.agentic.run', {
        caseId,
        runId: agenticRun.id,
        mode,
      });
      await markAnalysisRunProcessing(agenticRun.id);

      try {
        const agenticResult = await runAgenticCaseAnalysis({
          caseId,
          runId: agenticRun.id,
          mode,
          maxCharsPerFile,
          maxTotalChars,
        });

        await markAnalysisRunSucceeded(agenticRun.id, agenticResult.artifact.model);
        agenticRunSpan.end('OK');

        if (mode === 'direct') {
          await query(
            `UPDATE cases
             SET analysis_status = 'succeeded',
                 analysis_summary = $2,
                 analysis_questions = $3,
                 analysis_model = $4,
                 analysis_error = NULL,
                 analysis_completed_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [
              caseId,
              agenticResult.artifact.summary,
              JSON.stringify(agenticResult.artifact.questions),
              agenticResult.artifact.model,
            ]
          );
        }

        logger.info(`Agentic analysis completed for case ${caseId} (run ${agenticRun.id}, mode ${mode})`);
      } catch (agenticError) {
        const agenticMessage =
          agenticError instanceof Error
            ? agenticError.message
            : 'Unknown agentic analysis error';

        await markAnalysisRunFailed(agenticRun.id, agenticMessage);
        agenticRunSpan.end('ERROR', agenticMessage);

        if (mode === 'direct') {
          await query(
            `UPDATE cases
             SET analysis_status = 'failed',
                 analysis_summary = NULL,
                 analysis_questions = NULL,
                 analysis_model = NULL,
                 analysis_error = $2,
                 analysis_completed_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [caseId, `[agentic_direct_failed] ${agenticMessage}`]
          );

          logger.error(`Agentic direct mode failed for case ${caseId}: ${agenticMessage}`);
        } else {
          logger.error(`Agentic shadow mode failed for case ${caseId}: ${agenticMessage}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown analysis error';
      const message = error instanceof AgentError ? `[${error.code}] ${errorMessage}` : errorMessage;

      baselineRunSpan.end('ERROR', message);

      await query(
        `UPDATE cases
         SET analysis_status = 'failed',
             analysis_error = $2,
             analysis_completed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [caseId, message]
      );

      try {
        await markAnalysisRunFailed(runId, message);
      } catch (runError) {
        const runErrorMessage = runError instanceof Error ? runError.message : String(runError);
        logger.error(`Failed updating analysis run ${runId} status: ${runErrorMessage}`);
      }

      logger.error(`Analysis failed for case ${caseId} (run ${runId}): ${message}`);
    }
  }
}

export const analysisWorker = new AnalysisWorker();

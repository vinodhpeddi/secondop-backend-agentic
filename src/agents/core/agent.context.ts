import { insertAnalysisEvent } from '../../services/analysisRun.service';
import { AgentContext, AgentEvent } from './agent.types';

type ExecutionMode = 'off' | 'shadow' | 'direct';

interface CreateAgentContextOptions {
  caseId: string;
  runId: string;
  maxCharsPerFile: number;
  maxTotalChars: number;
  executionMode: ExecutionMode;
}

export const createAgentContext = (options: CreateAgentContextOptions): AgentContext => {
  const emitEvent = async (event: AgentEvent): Promise<void> => {
    const errorText =
      event.stepStatus === 'failed' && event.errorMessage
        ? `[${event.errorCode || 'unknown_error'}] ${event.errorMessage}`
        : null;

    const metadata: Record<string, unknown> = {
      engine: 'baseline',
      executionMode: options.executionMode,
      ...(event.metadata || {}),
    };

    if (event.errorCode) {
      metadata.errorCode = event.errorCode;
    }

    await insertAnalysisEvent({
      runId: options.runId,
      caseId: options.caseId,
      stepName: event.stepName,
      stepStatus: event.stepStatus,
      startedAt: event.startedAt,
      completedAt: event.completedAt,
      metadata,
      errorText,
    });
  };

  return {
    caseId: options.caseId,
    runId: options.runId,
    maxCharsPerFile: options.maxCharsPerFile,
    maxTotalChars: options.maxTotalChars,
    emitEvent,
  };
};

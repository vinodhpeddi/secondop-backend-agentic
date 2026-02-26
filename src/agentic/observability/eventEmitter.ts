import { insertAnalysisEvent } from '../../services/analysisRun.service';
import { AgenticRuntimeContext } from '../core/types';

interface EmitStepInput {
  context: AgenticRuntimeContext;
  stepName: string;
  stepStatus: 'started' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown> | null;
  errorText?: string | null;
}

export const emitAgenticStepEvent = async (input: EmitStepInput): Promise<void> => {
  await insertAnalysisEvent({
    runId: input.context.runId,
    caseId: input.context.caseId,
    stepName: input.stepName,
    stepStatus: input.stepStatus,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    metadata: {
      engine: 'agentic',
      mode: input.context.mode,
      ...(input.metadata || {}),
    },
    errorText: input.errorText,
  });
};

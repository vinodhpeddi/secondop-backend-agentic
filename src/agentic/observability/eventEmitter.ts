import { insertAnalysisEvent } from '../../services/analysisRun.service';
import { SpanHandle, startPhoenixSpan } from '../../observability/phoenix.service';
import { AgenticRuntimeContext } from '../core/types';

interface EmitStepInput {
  context: AgenticRuntimeContext;
  stepName: string;
  stepStatus: 'started' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown> | null;
  errorText?: string | null;
  eventKey?: string;
}

const stepSpanMap = new Map<string, SpanHandle>();

export const emitAgenticStepEvent = async (input: EmitStepInput): Promise<void> => {
  const key = input.eventKey || `${input.stepName}:${input.startedAt.toISOString()}`;

  if (input.stepStatus === 'started') {
    const span = startPhoenixSpan(`agentic.step.${input.stepName}`, {
      caseId: input.context.caseId,
      runId: input.context.runId,
      mode: input.context.mode,
    });
    stepSpanMap.set(key, span);
  }

  const metadata = {
    engine: 'agentic',
    mode: input.context.mode,
    ...(input.metadata || {}),
  };

  const span = stepSpanMap.get(key);
  if (span) {
    span.addAttributes(metadata);
    if (input.stepStatus !== 'started') {
      span.end(input.stepStatus === 'failed' ? 'ERROR' : 'OK', input.errorText || undefined);
      stepSpanMap.delete(key);
    }
  }

  await insertAnalysisEvent({
    runId: input.context.runId,
    caseId: input.context.caseId,
    stepName: input.stepName,
    stepStatus: input.stepStatus,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    metadata,
    errorText: input.errorText,
  });
};

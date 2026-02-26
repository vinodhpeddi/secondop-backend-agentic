import { AgenticActionHistoryItem, AgenticLoopState } from '../core/types';

export interface AgenticRunMetrics {
  stepCount: number;
  refinementCount: number;
  actionSequence: string[];
  observationCount: number;
  questionCount: number;
}

export const buildAgenticRunMetrics = (
  state: AgenticLoopState,
  history: AgenticActionHistoryItem[]
): AgenticRunMetrics => {
  return {
    stepCount: state.stepCount,
    refinementCount: state.refinementCount,
    actionSequence: history.map((item) => item.action),
    observationCount: state.observations.length,
    questionCount: state.analysis?.topQuestions.length || 0,
  };
};

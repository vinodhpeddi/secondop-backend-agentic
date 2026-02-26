import { AgenticError, AgenticFinalArtifact, AgenticLoopState } from '../core/types';

export class FinalizerAgent {
  public finalize(state: AgenticLoopState): AgenticFinalArtifact {
    if (!state.analysis) {
      throw new AgenticError('validation_error', 'Analysis is missing for finalization.');
    }

    if (!state.analysis.summary.trim()) {
      throw new AgenticError('validation_error', 'Analysis summary is empty during finalization.');
    }

    if (state.analysis.topQuestions.length !== 3) {
      throw new AgenticError('validation_error', 'Finalization requires exactly 3 specialist questions.');
    }

    return {
      summary: state.analysis.summary,
      questions: state.analysis.topQuestions,
      observations: state.observations,
      model: state.analysis.model,
    };
  }
}

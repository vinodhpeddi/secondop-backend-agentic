import { AgenticError, AgenticLoopState } from '../core/types';

const normalizeQuestion = (question: string): string => question.replace(/\s+/g, ' ').trim();

export const guardQuestionsTool = async (state: AgenticLoopState): Promise<AgenticLoopState> => {
  if (!state.analysis) {
    throw new AgenticError('validation_error', 'Analysis output is required before question guard.');
  }

  const normalized = state.analysis.topQuestions.map(normalizeQuestion);

  if (normalized.length !== 3) {
    throw new AgenticError('validation_error', 'Exactly 3 specialist-facing questions are required.');
  }

  const unique = new Set(normalized.map((item) => item.toLowerCase()));
  if (unique.size !== 3) {
    throw new AgenticError('validation_error', 'Specialist questions must be unique.');
  }

  if (normalized.some((item) => item.length < 12)) {
    throw new AgenticError('validation_error', 'Specialist questions must be sufficiently descriptive.');
  }

  return {
    ...state,
    analysis: {
      ...state.analysis,
      topQuestions: normalized,
    },
  };
};

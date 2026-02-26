import { AgentError, AgentStep } from '../core/agent.types';
import { CaseAnalysisPipelineState } from './case-analysis.types';

const normalizeQuestion = (question: string): string => {
  return question.replace(/\s+/g, ' ').trim();
};

export class QuestionGuardAgent implements AgentStep<CaseAnalysisPipelineState, CaseAnalysisPipelineState> {
  public readonly name = 'question-guard';

  public async run(input: CaseAnalysisPipelineState): Promise<CaseAnalysisPipelineState> {
    if (!input.analysis) {
      throw new AgentError('validation_error', 'Analysis output must exist before question validation.');
    }

    const normalizedQuestions = input.analysis.topQuestions.map(normalizeQuestion);

    if (normalizedQuestions.length !== 3) {
      throw new AgentError('validation_error', 'Analysis must return exactly 3 questions.');
    }

    const uniqueQuestions = new Set(normalizedQuestions.map((question) => question.toLowerCase()));
    if (uniqueQuestions.size !== 3) {
      throw new AgentError('validation_error', 'Analysis questions must be unique.');
    }

    const tooShort = normalizedQuestions.find((question) => question.length < 12);
    if (tooShort) {
      throw new AgentError('validation_error', 'All analysis questions must be meaningful specialist-facing prompts.');
    }

    return {
      ...input,
      analysis: {
        ...input.analysis,
        topQuestions: normalizedQuestions,
      },
    };
  }
}

import { AgenticCriticScore, AgenticFinalArtifact, AgenticLoopState } from '../core/types';

const caveatPattern = /(may|might|possible|uncertain|cannot\s+exclude|limited|caveat)/i;

export class CriticAgent {
  public async evaluate(artifact: AgenticFinalArtifact, state: AgenticLoopState): Promise<AgenticCriticScore> {
    const hasThreeQuestions = artifact.questions.length === 3;
    const hasUniqueQuestions = new Set(artifact.questions.map((question) => question.toLowerCase())).size === artifact.questions.length;
    const hasObservations = artifact.observations.length > 0;
    const hasCaveatLanguage = caveatPattern.test(artifact.summary);

    const checks = {
      hasThreeQuestions,
      hasUniqueQuestions,
      hasObservations,
      hasCaveatLanguage,
    };

    const reasons: string[] = [];
    if (!hasThreeQuestions) {
      reasons.push('Expected exactly 3 specialist-facing questions.');
    }
    if (!hasUniqueQuestions) {
      reasons.push('Questions contain duplicates.');
    }
    if (!hasObservations) {
      reasons.push('Observation extraction did not produce items.');
    }
    if (!hasCaveatLanguage) {
      reasons.push('Summary is missing uncertainty/caveat language.');
    }

    const passed = reasons.length === 0;
    const needsRefinement = !passed && state.refinementCount < (parseInt(process.env.AGENTIC_MAX_REFINEMENTS || '1', 10) || 1);
    const score = Math.max(0, 100 - reasons.length * 25);

    return {
      passed,
      needsRefinement,
      score,
      reasons,
      checks,
    };
  }
}

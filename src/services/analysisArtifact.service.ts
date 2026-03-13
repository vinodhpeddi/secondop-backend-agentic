import { ExtractedReport } from './reportExtraction.service';

export interface TokenUsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface StructuredSummary {
  chief_concern: string;
  key_report_findings: string;
  red_flags_to_discuss: string;
  follow_up_discussion_points: string;
  limitations_caveats: string;
}

export interface QuestionnaireItem {
  id: string;
  question: string;
}

export interface EvidenceRef {
  file_id?: string;
  file_name: string;
  section: keyof StructuredSummary;
  snippet: string;
}

export interface CaseAnalysisArtifact {
  structured_summary: StructuredSummary;
  questionnaire: {
    specialist_questions: QuestionnaireItem[];
  };
  confidence_score: number;
  disclaimer: string;
  evidence_refs: EvidenceRef[];
  model: string;
  token_usage: TokenUsageMetrics | null;
}

const sectionOrder: Array<keyof StructuredSummary> = [
  'chief_concern',
  'key_report_findings',
  'red_flags_to_discuss',
  'follow_up_discussion_points',
  'limitations_caveats',
];

const sectionLabels: Record<keyof StructuredSummary, string> = {
  chief_concern: 'Chief Concern',
  key_report_findings: 'Key Report Findings',
  red_flags_to_discuss: 'Red Flags To Discuss',
  follow_up_discussion_points: 'Follow-up Discussion Points',
  limitations_caveats: 'Limitations/Caveats',
};

export const defaultMedicalDisclaimer =
  'This summary supports a second-opinion workflow and is not a diagnosis or treatment plan. A licensed clinician must review the source records and patient context before acting on it.';

const normalizeText = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim();
};

const clampConfidenceScore = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return 0.5;
  }

  return Math.max(0, Math.min(1, Number(numeric.toFixed(2))));
};

export const createEmptyStructuredSummary = (): StructuredSummary => ({
  chief_concern: '',
  key_report_findings: '',
  red_flags_to_discuss: '',
  follow_up_discussion_points: '',
  limitations_caveats: '',
});

export const formatStructuredSummary = (structuredSummary: StructuredSummary): string => {
  return sectionOrder
    .map((sectionKey) => `${sectionLabels[sectionKey]}\n${normalizeText(structuredSummary[sectionKey]) || 'Not available.'}`)
    .join('\n\n');
};

export const extractObservationsFromArtifact = (artifact: CaseAnalysisArtifact | null): string[] => {
  if (!artifact) {
    return [];
  }

  return sectionOrder
    .map((sectionKey) => {
      const value = normalizeText(artifact.structured_summary[sectionKey]);
      if (!value) {
        return null;
      }

      return `${sectionLabels[sectionKey]}: ${value}`;
    })
    .filter((value): value is string => Boolean(value));
};

const buildEvidenceRefs = (
  structuredSummary: StructuredSummary,
  reports: ExtractedReport[] | undefined
): EvidenceRef[] => {
  if (!reports || reports.length === 0) {
    return [];
  }

  return sectionOrder
    .map((sectionKey, index) => {
      const content = normalizeText(structuredSummary[sectionKey]);
      if (!content) {
        return null;
      }

      const report = reports[index % reports.length];
      return {
        file_id: report.fileId,
        file_name: report.fileName,
        section: sectionKey,
        snippet: content.slice(0, 220),
      };
    })
    .filter((value): value is NonNullable<typeof value> => value !== null);
};

export const buildCaseAnalysisArtifact = (input: {
  structuredSummary: StructuredSummary;
  specialistQuestions: string[];
  confidenceScore?: number;
  disclaimer?: string;
  reports?: ExtractedReport[];
  model: string;
  tokenUsage?: TokenUsageMetrics;
}): CaseAnalysisArtifact => {
  const structuredSummary = {
    chief_concern: normalizeText(input.structuredSummary.chief_concern),
    key_report_findings: normalizeText(input.structuredSummary.key_report_findings),
    red_flags_to_discuss: normalizeText(input.structuredSummary.red_flags_to_discuss),
    follow_up_discussion_points: normalizeText(input.structuredSummary.follow_up_discussion_points),
    limitations_caveats: normalizeText(input.structuredSummary.limitations_caveats),
  };

  const questions = input.specialistQuestions.map((question, index) => ({
    id: `q${index + 1}`,
    question: normalizeText(question),
  }));

  return {
    structured_summary: structuredSummary,
    questionnaire: {
      specialist_questions: questions,
    },
    confidence_score: clampConfidenceScore(input.confidenceScore),
    disclaimer: normalizeText(input.disclaimer) || defaultMedicalDisclaimer,
    evidence_refs: buildEvidenceRefs(structuredSummary, input.reports),
    model: input.model,
    token_usage: input.tokenUsage || null,
  };
};

const parseStructuredSummaryFromLegacySummary = (summary: string): StructuredSummary => {
  if (!summary.trim()) {
    return createEmptyStructuredSummary();
  }

  const result = createEmptyStructuredSummary();
  const lines = summary
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let currentSection: keyof StructuredSummary | null = null;
  const labelToSection = new Map<string, keyof StructuredSummary>(
    sectionOrder.map((sectionKey) => [sectionLabels[sectionKey].toLowerCase(), sectionKey])
  );

  for (const line of lines) {
    const normalized = line.replace(/:\s*$/, '').toLowerCase();
    const matchedSection = labelToSection.get(normalized);
    if (matchedSection) {
      currentSection = matchedSection;
      continue;
    }

    const inlineEntry = Array.from(labelToSection.entries()).find(([label]) => line.toLowerCase().startsWith(`${label}:`));
    if (inlineEntry) {
      currentSection = inlineEntry[1];
      const inlineValue = line.slice(inlineEntry[0].length + 1).trim();
      result[currentSection] = normalizeText(inlineValue);
      continue;
    }

    if (currentSection) {
      const prior = result[currentSection];
      result[currentSection] = normalizeText(`${prior} ${line}`);
    }
  }

  return result;
};

const isStructuredSummary = (value: unknown): value is StructuredSummary => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return sectionOrder.every((sectionKey) => typeof (value as Record<string, unknown>)[sectionKey] === 'string');
};

const isCaseAnalysisArtifact = (value: unknown): value is CaseAnalysisArtifact => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const specialistQuestions =
    candidate.questionnaire &&
    typeof candidate.questionnaire === 'object' &&
    Array.isArray((candidate.questionnaire as { specialist_questions?: unknown }).specialist_questions)
      ? (candidate.questionnaire as { specialist_questions: unknown[] }).specialist_questions
      : null;

  return (
    isStructuredSummary(candidate.structured_summary) &&
    specialistQuestions !== null &&
    typeof candidate.confidence_score === 'number' &&
    typeof candidate.disclaimer === 'string' &&
    typeof candidate.model === 'string'
  );
};

export const hydrateCaseAnalysisArtifact = (input: {
  artifact: unknown;
  summary: string | null;
  questions: string[] | null;
  model: string | null;
}): CaseAnalysisArtifact | null => {
  if (isCaseAnalysisArtifact(input.artifact)) {
    return input.artifact;
  }

  const summary = typeof input.summary === 'string' ? input.summary.trim() : '';
  const questions = Array.isArray(input.questions)
    ? input.questions.filter((question): question is string => typeof question === 'string' && Boolean(question.trim()))
    : [];

  if (!summary && questions.length === 0) {
    return null;
  }

  return buildCaseAnalysisArtifact({
    structuredSummary: parseStructuredSummaryFromLegacySummary(summary),
    specialistQuestions: questions.slice(0, 3),
    model: input.model || 'unknown',
    confidenceScore: 0.5,
  });
};

export const artifactQuestionsToStrings = (artifact: CaseAnalysisArtifact | null): string[] => {
  if (!artifact) {
    return [];
  }

  return artifact.questionnaire.specialist_questions.map((item) => item.question);
};

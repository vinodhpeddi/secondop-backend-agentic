import OpenAI from 'openai';
import { ExtractedReport } from './reportExtraction.service';

export interface CaseIntakeData {
  age: number;
  sex: string;
  specialtyContext: string;
  symptoms: string;
  symptomDuration: string;
  medicalHistory: string;
  currentMedications: string;
  allergies: string;
}

export interface CaseAnalysisResult {
  summary: string;
  topQuestions: string[];
  model: string;
}

const summarySectionHeaders = [
  'Chief Concern',
  'Key Report Findings',
  'Red Flags To Discuss',
  'Follow-up Discussion Points',
  'Limitations/Caveats',
] as const;

const modelName = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const timeoutMs = parseInt(process.env.OPENAI_TIMEOUT_MS || '60000', 10);

let cachedClient: OpenAI | null = null;

const getOpenAIClient = (): OpenAI => {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  cachedClient = new OpenAI({ apiKey });
  return cachedClient;
};

const withTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Analysis timed out after ${ms}ms`));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const buildSystemPrompt = (): string => {
  return [
    'You are a medical-report summarization assistant for second-opinion workflows.',
    'Return strict JSON with keys: summary (string), topQuestions (string[3]).',
    'Summary must include these section headers exactly:',
    ...summarySectionHeaders,
    'Top questions must be actionable specialist-facing questions.',
    'Avoid absolute diagnosis claims and include uncertainty/caveat language when needed.',
    'Do not output markdown code fences.',
  ].join('\n');
};

const buildUserPrompt = (intake: CaseIntakeData, reports: ExtractedReport[], guidance?: string): string => {
  const reportText = reports
    .map((report, index) => `Report ${index + 1} (${report.fileName}):\n${report.text}`)
    .join('\n\n');

  return [
    'Patient Intake:',
    `- Age: ${intake.age}`,
    `- Sex: ${intake.sex}`,
    `- Specialty Context: ${intake.specialtyContext}`,
    `- Symptoms: ${intake.symptoms}`,
    `- Symptom Duration: ${intake.symptomDuration}`,
    `- Medical History: ${intake.medicalHistory}`,
    `- Current Medications: ${intake.currentMedications}`,
    `- Allergies: ${intake.allergies}`,
    '',
    'Medical Reports:',
    reportText,
    '',
    guidance ? `Agentic Guidance: ${guidance}` : '',
    'Generate a sectioned summary and topQuestions exactly length 3.',
  ]
    .filter((line) => line !== '')
    .join('\n');
};

const parseAndValidateOutput = (raw: string): Pick<CaseAnalysisResult, 'summary' | 'topQuestions'> => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON returned by analysis model.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Analysis response is not an object.');
  }

  const summary = (parsed as { summary?: unknown }).summary;
  const topQuestions = (parsed as { topQuestions?: unknown }).topQuestions;

  if (typeof summary !== 'string' || !summary.trim()) {
    throw new Error('Analysis summary is missing.');
  }

  if (!Array.isArray(topQuestions) || topQuestions.length !== 3) {
    throw new Error('Analysis must return exactly 3 questions.');
  }

  const normalizedQuestions = topQuestions.map((item) => {
    if (typeof item !== 'string' || !item.trim()) {
      throw new Error('All analysis questions must be non-empty strings.');
    }
    return item.trim();
  });

  return {
    summary: summary.trim(),
    topQuestions: normalizedQuestions,
  };
};

export const generateCaseAnalysis = async (
  intake: CaseIntakeData,
  reports: ExtractedReport[],
  guidance?: string,
  overrideModel?: string
): Promise<CaseAnalysisResult> => {
  const client = getOpenAIClient();
  const selectedModel = overrideModel || modelName;

  const completionPromise = client.chat.completions.create({
    model: selectedModel,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(),
      },
      {
        role: 'user',
        content: buildUserPrompt(intake, reports, guidance),
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'case_analysis',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            summary: { type: 'string' },
            topQuestions: {
              type: 'array',
              minItems: 3,
              maxItems: 3,
              items: { type: 'string' },
            },
          },
          required: ['summary', 'topQuestions'],
        },
      },
    },
  });

  const completion = (await withTimeout(completionPromise, timeoutMs)) as any;
  const rawContent = completion.choices[0]?.message?.content;

  if (!rawContent) {
    throw new Error('Analysis model returned an empty response.');
  }

  const validated = parseAndValidateOutput(rawContent);

  return {
    summary: validated.summary,
    topQuestions: validated.topQuestions,
    model: selectedModel,
  };
};

const cleanSectionValue = (value: string): string => {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-*•]+/, '')
    .trim();
};

export const extractObservationsFromSummary = (summary: string): string[] => {
  if (!summary.trim()) {
    return [];
  }

  const lines = summary
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const sections = new Map<string, string[]>();
  let currentHeader: string | null = null;

  for (const rawLine of lines) {
    const normalizedLine = rawLine.replace(/:\s*$/, '').trim();
    const matchedHeader = summarySectionHeaders.find((header) => header.toLowerCase() === normalizedLine.toLowerCase());

    if (matchedHeader) {
      currentHeader = matchedHeader;
      if (!sections.has(matchedHeader)) {
        sections.set(matchedHeader, []);
      }
      continue;
    }

    const inlineHeader = summarySectionHeaders.find((header) =>
      rawLine.toLowerCase().startsWith(`${header.toLowerCase()}:`)
    );
    if (inlineHeader) {
      currentHeader = inlineHeader;
      if (!sections.has(inlineHeader)) {
        sections.set(inlineHeader, []);
      }

      const inlineContent = rawLine.slice(inlineHeader.length + 1).trim();
      if (inlineContent) {
        const existing = sections.get(inlineHeader) || [];
        existing.push(inlineContent);
        sections.set(inlineHeader, existing);
      }
      continue;
    }

    if (!currentHeader) {
      continue;
    }

    const existing = sections.get(currentHeader) || [];
    existing.push(rawLine);
    sections.set(currentHeader, existing);
  }

  return summarySectionHeaders
    .map((header) => {
      const content = (sections.get(header) || [])
        .join(' ')
        .trim();

      if (!content) {
        return null;
      }

      return cleanSectionValue(`${header}: ${content}`);
    })
    .filter((item): item is string => Boolean(item));
};

import { analysisWorker } from '../services/analysisWorker.service';
import { query } from '../database/connection';
import { runCaseAnalysis } from '../agents/case-analysis/runCaseAnalysis';
import { runAgenticCaseAnalysis } from '../agentic/orchestration/runAgenticCaseAnalysis';
import {
  createAnalysisRun,
  getLatestActiveAnalysisRun,
  markAnalysisRunFailed,
  markAnalysisRunProcessing,
  markAnalysisRunSucceeded,
} from '../services/analysisRun.service';

jest.mock('../database/connection', () => ({
  query: jest.fn(),
}));

jest.mock('../agents/case-analysis/runCaseAnalysis', () => ({
  runCaseAnalysis: jest.fn(),
}));

jest.mock('../agentic/orchestration/runAgenticCaseAnalysis', () => ({
  runAgenticCaseAnalysis: jest.fn(),
}));

jest.mock('../services/analysisRun.service', () => ({
  createAnalysisRun: jest.fn(),
  getLatestActiveAnalysisRun: jest.fn(),
  markAnalysisRunFailed: jest.fn(),
  markAnalysisRunProcessing: jest.fn(),
  markAnalysisRunQueued: jest.fn(),
  markAnalysisRunSucceeded: jest.fn(),
}));

const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedRunCaseAnalysis = runCaseAnalysis as jest.MockedFunction<typeof runCaseAnalysis>;
const mockedRunAgenticCaseAnalysis = runAgenticCaseAnalysis as jest.MockedFunction<typeof runAgenticCaseAnalysis>;
const mockedCreateAnalysisRun = createAnalysisRun as jest.MockedFunction<typeof createAnalysisRun>;
const mockedGetLatestActiveAnalysisRun = getLatestActiveAnalysisRun as jest.MockedFunction<typeof getLatestActiveAnalysisRun>;
const mockedMarkAnalysisRunFailed = markAnalysisRunFailed as jest.MockedFunction<typeof markAnalysisRunFailed>;
const mockedMarkAnalysisRunProcessing = markAnalysisRunProcessing as jest.MockedFunction<typeof markAnalysisRunProcessing>;
const mockedMarkAnalysisRunSucceeded = markAnalysisRunSucceeded as jest.MockedFunction<typeof markAnalysisRunSucceeded>;

const flushAsync = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('Analysis worker agentic modes', () => {
  const originalMode = process.env.ANALYSIS_AGENTIC_MODE;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedQuery.mockResolvedValue({ rows: [] } as any);
    mockedGetLatestActiveAnalysisRun.mockResolvedValue(null as any);
    mockedMarkAnalysisRunProcessing.mockResolvedValue(undefined as any);
    mockedMarkAnalysisRunSucceeded.mockResolvedValue(undefined as any);
    mockedMarkAnalysisRunFailed.mockResolvedValue(undefined as any);
    mockedRunCaseAnalysis.mockResolvedValue({ caseId: 'case-1' } as any);
    mockedCreateAnalysisRun
      .mockResolvedValueOnce({ id: 'run-baseline', status: 'queued' } as any)
      .mockResolvedValueOnce({ id: 'run-agentic', status: 'queued' } as any);
  });

  afterEach(() => {
    process.env.ANALYSIS_AGENTIC_MODE = originalMode;
  });

  it('uses agentic output as source of truth in direct mode', async () => {
    process.env.ANALYSIS_AGENTIC_MODE = 'direct';

    mockedRunAgenticCaseAnalysis.mockResolvedValueOnce({
      artifact: {
        summary: 'Agentic summary with caveat language',
        questions: ['Q1 direct', 'Q2 direct', 'Q3 direct'],
        observations: ['Obs1'],
        model: 'gpt-4.1-mini',
      },
    } as any);

    await analysisWorker.queueCase('case-1');
    await flushAsync();

    expect(mockedRunAgenticCaseAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'direct', caseId: 'case-1' })
    );

    const directPersistCall = mockedQuery.mock.calls.find((call) =>
      String(call[0]).includes("SET analysis_status = 'succeeded'") &&
      Array.isArray(call[1]) &&
      call[1][1] === 'Agentic summary with caveat language'
    );

    expect(directPersistCall).toBeDefined();
    expect(mockedMarkAnalysisRunSucceeded).toHaveBeenCalledWith('run-agentic', 'gpt-4.1-mini');
  });

  it('keeps baseline path unaffected when shadow mode agentic execution fails', async () => {
    process.env.ANALYSIS_AGENTIC_MODE = 'shadow';

    mockedRunAgenticCaseAnalysis.mockRejectedValueOnce(new Error('Shadow execution failed'));

    await analysisWorker.queueCase('case-1');
    await flushAsync();

    expect(mockedRunCaseAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ runId: 'run-baseline', caseId: 'case-1' })
    );

    expect(mockedMarkAnalysisRunFailed).toHaveBeenCalledWith('run-agentic', 'Shadow execution failed');

    const directFailureUpdate = mockedQuery.mock.calls.find((call) =>
      String(call[0]).includes('[agentic_direct_failed]')
    );
    expect(directFailureUpdate).toBeUndefined();
  });
});

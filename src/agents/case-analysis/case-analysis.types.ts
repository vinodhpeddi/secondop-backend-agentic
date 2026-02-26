import { ExtractedReport } from '../../services/reportExtraction.service';
import { CaseAnalysisResult, CaseIntakeData } from '../../services/analysis.service';

export interface CaseAnalysisPipelineState {
  caseId: string;
  intake?: CaseIntakeData;
  reports?: ExtractedReport[];
  analysis?: CaseAnalysisResult;
  observations?: string[];
}

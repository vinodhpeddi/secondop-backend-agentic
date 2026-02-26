import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { query } from '../database/connection';

export interface ExtractedReport {
  fileId: string;
  fileName: string;
  text: string;
  charCount: number;
}

interface MedicalFileRow {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
}

const isPdfFile = (fileType: string, fileName: string): boolean => {
  if (fileType === 'application/pdf') {
    return true;
  }

  return fileName.toLowerCase().endsWith('.pdf');
};

const resolveStoredFilePath = (fileUrl: string): string => {
  const normalized = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
  return path.resolve(process.cwd(), normalized);
};

const extractTextFromPdf = async (filePath: string): Promise<string> => {
  const buffer = await fs.promises.readFile(filePath);
  const parsed = await pdfParse(buffer);
  return (parsed.text || '').replace(/\s+/g, ' ').trim();
};

export const extractCaseReports = async (
  caseId: string,
  maxCharsPerFile: number,
  maxTotalChars: number
): Promise<ExtractedReport[]> => {
  const filesResult = await query(
    `SELECT id, file_name, file_type, file_url
     FROM medical_files
     WHERE case_id = $1
     ORDER BY created_at ASC`,
    [caseId]
  );

  const rows = filesResult.rows as MedicalFileRow[];
  const pdfRows = rows.filter((row) => isPdfFile(row.file_type, row.file_name));

  if (pdfRows.length === 0) {
    throw new Error('At least one PDF report is required for analysis.');
  }

  const reports: ExtractedReport[] = [];
  let totalChars = 0;

  for (const row of pdfRows) {
    if (totalChars >= maxTotalChars) {
      break;
    }

    const filePath = resolveStoredFilePath(row.file_url);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const text = await extractTextFromPdf(filePath);
    if (!text) {
      continue;
    }

    const boundedText = text.slice(0, maxCharsPerFile);
    if (boundedText.length < 40) {
      continue;
    }

    const remaining = maxTotalChars - totalChars;
    const finalText = boundedText.slice(0, remaining);

    reports.push({
      fileId: row.id,
      fileName: row.file_name,
      text: finalText,
      charCount: finalText.length,
    });

    totalChars += finalText.length;
  }

  if (reports.length === 0) {
    throw new Error('No extractable text found in uploaded PDF reports. Scanned-image PDFs are not supported in V1.');
  }

  return reports;
};

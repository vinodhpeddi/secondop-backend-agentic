declare module 'pdf-parse' {
  export interface PDFMetadata {
    info?: Record<string, unknown>;
    metadata?: unknown;
    version?: string;
  }

  export interface PDFData {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    text: string;
    version: string;
  }

  export interface PDFParseOptions {
    pagerender?: (pageData: unknown) => Promise<string>;
    max?: number;
    version?: string;
  }

  export default function pdfParse(
    dataBuffer: Buffer,
    options?: PDFParseOptions
  ): Promise<PDFData>;
}

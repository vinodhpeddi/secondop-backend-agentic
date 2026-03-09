declare module 'dicom-parser' {
  interface DicomDataSet {
    string(tag: string): string | undefined;
    uint16(tag: string): number | undefined;
  }

  export function parseDicom(byteArray: Uint8Array): DicomDataSet;
}

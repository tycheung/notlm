export interface CsvScoreImportResponse {
  success: boolean;
  message: string;
  updated_scores: number;
  skipped_rows: number;
  warnings: string[];
  errors: string[];
}

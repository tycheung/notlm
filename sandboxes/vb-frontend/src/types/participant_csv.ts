export interface CsvRegistrationResponse {
  success: boolean;
  message: string;
  created_participants: number;
  created_teams: number;
  skipped_already_registered: number;
  warnings: string[];
  errors: string[];
}

import {
  EventReportsAPI,
  type EventScoresExcelRequest,
  type EventStandingsReport,
} from '../../api/event-reports';
import { csvBlobForExcel } from '../../utils/excelCsv';
import { downloadBlob, downloadBlobFromLoader } from '../../utils/downloadBlob';
import { reportSuggestedFilename } from '../../utils/sideActionReportPrint';
import {
  buildStandingsExcelCsv,
  standingsExcelFilename,
} from './eventStandingsExcel';
import type { EventStandingsPrintOptions } from './buildEventStandingsReportDocument';

export async function downloadStandingsExcel(
  report: EventStandingsReport,
  options: EventStandingsPrintOptions
) {
  const csv = buildStandingsExcelCsv(report, options);
  return downloadBlob(csvBlobForExcel(csv), standingsExcelFilename(report));
}

export async function downloadScoresExcel(
  body: EventScoresExcelRequest,
  filenameParts: Array<string | null | undefined>
) {
  const filename = `${reportSuggestedFilename(...filenameParts, 'all_scores')}.csv`;
  return downloadBlobFromLoader(filename, () => EventReportsAPI.downloadScoresExcel(body));
}

import { SideActionsAPI } from '../../../api/side-actions';
import type { ReportDocument } from '../../../utils/sideActionReportPrint';
import {
  buildBracketsReportDocument,
  BRACKETS_REPORT_DEFAULT_CHUNK_POTS,
} from './buildBracketsReportDocument';

export async function fetchBracketsReportDocument(options: {
  sideActionId: number;
  tournamentId: number;
  eventId: number;
  poolId: number;
  potFrom: number;
  potTo: number;
}): Promise<{ document: ReportDocument; bracketCount: number }> {
  const potFrom = Math.max(1, options.potFrom);
  const potTo = Math.max(potFrom, options.potTo);
  if (potTo - potFrom + 1 > BRACKETS_REPORT_DEFAULT_CHUNK_POTS) {
    throw new Error(
      `Print at most ${BRACKETS_REPORT_DEFAULT_CHUNK_POTS} pots per preview. ` +
        `Narrow the pot range and try again.`
    );
  }
  const report = await SideActionsAPI.getBracketsReport({
    side_action_id: options.sideActionId,
    tournament_id: options.tournamentId,
    event_id: options.eventId,
    pool_id: options.poolId,
    pot_from: potFrom,
    pot_to: potTo,
  });
  const total = report.bracket_count || (report.brackets || []).length;
  return {
    bracketCount: total,
    document: buildBracketsReportDocument(report, {
      potFrom: report.pot_from ?? potFrom,
      potTo: report.pot_to ?? Math.min(potTo, total),
    }),
  };
}

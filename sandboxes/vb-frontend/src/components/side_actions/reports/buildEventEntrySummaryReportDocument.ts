import type {
  AlibiDoublesEntrySummaryReport,
  EliminatorEntrySummaryReport,
  EntrySummaryReport,
  EventEntrySummaryReport,
  EventEntrySummarySectionType,
  HighGameEntrySummaryReport,
  HighSetEntrySummaryReport,
  LoveDoublesEntrySummaryReport,
  MysteryDoublesEntrySummaryReport,
  MysteryGameEntrySummaryReport,
} from '../../../api/side-actions';
import {
  buildReportDocument,
  escapeHtml,
  extractReportBodyHtml,
  formatFilenameDate,
  reportSuggestedFilename,
  withDirector,
  formatDateOnly,
  reportFooterHtml,
  type ReportDocument,
} from '../../../utils/sideActionReportPrint';
import { buildEntrySummaryReportDocument } from './buildEntrySummaryReportDocument';
import { buildHighGameEntrySummaryReportDocument } from './buildHighGameEntrySummaryReportDocument';
import { buildHighSetEntrySummaryReportDocument } from './buildHighSetEntrySummaryReportDocument';
import { buildEliminatorEntrySummaryReportDocument } from './buildEliminatorEntrySummaryReportDocument';
import { buildMysteryDoublesEntrySummaryReportDocument } from '../../../features/side-actions/mystery-doubles/reports/buildMysteryDoublesEntrySummaryReportDocument';
import { buildMysteryGameEntrySummaryReportDocument } from '../../../features/side-actions/mystery-game/reports/buildMysteryGameEntrySummaryReportDocument';
import { buildLoveDoublesEntrySummaryReportDocument } from '../../../features/side-actions/love-doubles/reports/buildLoveDoublesEntrySummaryReportDocument';
import { buildAlibiDoublesEntrySummaryReportDocument } from '../../../features/side-actions/alibi-doubles/reports/buildAlibiDoublesEntrySummaryReportDocument';

function sectionDocument(
  sectionType: EventEntrySummarySectionType,
  report: EventEntrySummaryReport['sections'][number]['report']
): ReportDocument {
  switch (sectionType) {
    case 'bracket':
      return buildEntrySummaryReportDocument(report as EntrySummaryReport);
    case 'high_game':
      return buildHighGameEntrySummaryReportDocument(report as HighGameEntrySummaryReport);
    case 'high_set':
      return buildHighSetEntrySummaryReportDocument(report as HighSetEntrySummaryReport);
    case 'eliminator':
      return buildEliminatorEntrySummaryReportDocument(report as EliminatorEntrySummaryReport);
    case 'mystery_doubles':
      return buildMysteryDoublesEntrySummaryReportDocument(
        report as MysteryDoublesEntrySummaryReport
      );
    case 'mystery_game':
      return buildMysteryGameEntrySummaryReportDocument(
        report as MysteryGameEntrySummaryReport
      );
    case 'love_doubles':
      return buildLoveDoublesEntrySummaryReportDocument(report as LoveDoublesEntrySummaryReport);
    case 'alibi_doubles':
      return buildAlibiDoublesEntrySummaryReportDocument(
        report as AlibiDoublesEntrySummaryReport
      );
    default:
      throw new Error(`Unsupported entry summary section: ${sectionType}`);
  }
}

export function buildEventEntrySummaryReportDocument(
  report: EventEntrySummaryReport
): ReportDocument {
  const dateLabel = formatDateOnly();
  const title = `All Side Actions Entry Summary — ${report.event_name}`;
  const filename = reportSuggestedFilename(
    'Event_Entry_Summary',
    report.event_name,
    formatFilenameDate()
  );

  const sectionBodies = report.sections.map((section) => {
    const doc = sectionDocument(section.section_type, section.report);
    return extractReportBodyHtml(doc.html);
  });

  const cover = `
    <section class="entry-summary-page event-entry-summary-cover">
      <header class="report-header">
        <div>
          <h1 class="report-title">${escapeHtml(report.event_name)}</h1>
          <div class="report-subtitle">${escapeHtml(withDirector(report.tournament_name, report.director_name))}</div>
          <div class="report-doc-label">All Side Actions — Entry Summary</div>
        </div>
        <div class="report-meta">
          <div>${escapeHtml(dateLabel)}</div>
        </div>
      </header>
      <p class="report-note">
        Combined entry and fund snapshots for every side action type on this event.
        Sections follow in payout-sheet order.
      </p>
      <ul class="event-entry-summary-toc">
        ${report.sections
          .map((section) => `<li>${escapeHtml(section.label)}</li>`)
          .join('')}
      </ul>
      ${reportFooterHtml()}
    </section>
  `;

  const bodyHtml = `
    ${cover}
    ${sectionBodies.join('\n')}
  `;

  return buildReportDocument(title, bodyHtml, filename, {
    bodyClass: 'event-entry-summary-doc',
  });
}

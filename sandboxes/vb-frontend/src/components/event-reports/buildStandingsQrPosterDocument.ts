import {
  buildReportDocument,
  escapeHtml,
  reportFooterHtml,
  reportSuggestedFilename,
  type ReportDocument,
} from '../../utils/sideActionReportPrint';
import { qrSvgMarkup } from '../../utils/qrSvgMarkup';

export interface StandingsQrPosterInput {
  tournamentName: string;
  standingsUrl: string;
  eventName?: string | null;
  centerName?: string | null;
  dateLabel?: string | null;
}

/**
 * One-page center poster: tournament info, “Find standings here”, large QR.
 * QR targets the public live/standings URL (not the TD desk).
 */
export function buildStandingsQrPosterDocument(
  input: StandingsQrPosterInput
): ReportDocument {
  const tournamentName = (input.tournamentName || 'Tournament').trim();
  const eventName = (input.eventName || '').trim();
  const centerName = (input.centerName || '').trim();
  const dateLabel = (input.dateLabel || '').trim();
  const url = input.standingsUrl.trim();
  const qr = qrSvgMarkup(url, 420);
  const filename = reportSuggestedFilename(
    'standings_qr',
    tournamentName,
    eventName || null
  );

  const metaBits = [centerName, dateLabel].filter(Boolean);
  const bodyHtml = `
<style>
  body.standings-qr-poster {
    padding: 0.35in;
  }
  .qr-poster {
    min-height: 9.2in;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    justify-content: space-between;
  }
  .qr-poster h1 {
    margin: 0 0 8px;
    font-size: 28pt;
    font-weight: 800;
    line-height: 1.15;
    color: #111827;
  }
  .qr-poster .qr-event {
    margin: 0 0 6px;
    font-size: 16pt;
    font-weight: 600;
    color: #111827;
  }
  .qr-poster .qr-meta {
    margin: 0;
    font-size: 12pt;
    color: #4b5563;
  }
  .qr-poster .qr-cta {
    margin: 28px 0 12px;
    font-size: 22pt;
    font-weight: 800;
    letter-spacing: 0.01em;
    color: #111827;
  }
  .qr-poster .qr-frame {
    padding: 12px;
    border: 2px solid #111827;
    background: #fff;
  }
  .qr-poster .qr-frame svg {
    display: block;
  }
  .qr-poster .qr-url {
    margin: 14px 0 0;
    font-size: 10pt;
    word-break: break-all;
    color: #111827;
  }
  .qr-poster .qr-hint {
    margin: 8px 0 0;
    font-size: 10pt;
    color: #4b5563;
  }
</style>
<div class="qr-poster">
  <header>
    <h1>${escapeHtml(tournamentName)}</h1>
    ${eventName ? `<p class="qr-event">${escapeHtml(eventName)}</p>` : ''}
    ${
      metaBits.length
        ? `<p class="qr-meta">${escapeHtml(metaBits.join(' · '))}</p>`
        : ''
    }
  </header>
  <div>
    <p class="qr-cta">Find standings here</p>
    <div class="qr-frame">${qr}</div>
    <p class="qr-url">${escapeHtml(url)}</p>
    <p class="qr-hint">Scan with a phone camera. No app required.</p>
  </div>
  ${reportFooterHtml()}
</div>
`;

  return buildReportDocument('Standings QR poster', bodyHtml, filename, {
    pageSize: 'letter portrait',
    pageMargin: '0.4in',
    bodyClass: 'standings-qr-poster',
  });
}

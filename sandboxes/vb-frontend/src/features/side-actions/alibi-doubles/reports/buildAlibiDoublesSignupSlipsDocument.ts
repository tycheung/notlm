import {
  buildReportDocument,
  escapeHtml,
  formatFilenameDate,
  reportSuggestedFilename,
  type ReportDocument,
} from '../../../../utils/sideActionReportPrint';

function slipHtml(potName: string): string {
  return `
    <article class="alibi-slip">
      <h2>${escapeHtml(potName)}</h2>
      <p class="alibi-slip-label">Alibi Doubles signup</p>
      <label>Your name
        <span class="alibi-slip-line"></span>
      </label>
      <label>Partner name(s)
        <span class="alibi-slip-line"></span>
        <span class="alibi-slip-line"></span>
        <span class="alibi-slip-line"></span>
      </label>
    </article>
  `;
}

export function buildAlibiDoublesSignupSlipsDocument(options: {
  potName: string;
  eventName?: string;
  pages?: number;
}): ReportDocument {
  const pages = Math.max(1, Math.min(20, options.pages ?? 1));
  const title = `Alibi Doubles signup slips — ${options.potName}`;
  const filename = reportSuggestedFilename(
    'Alibi_Doubles_Signup_Slips',
    options.potName,
    options.eventName || 'event',
    formatFilenameDate()
  );
  const extraCss = `
    @media print {
      .alibi-slip-page { page-break-after: always; }
      .alibi-slip-page:last-child { page-break-after: auto; }
    }
    .alibi-slip-page {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 0.35in;
      min-height: 9.5in;
    }
    .alibi-slip {
      border: 1px dashed #333;
      padding: 0.35in;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .alibi-slip h2 { font-size: 14pt; margin: 0; }
    .alibi-slip-label { font-size: 10pt; margin: 0 0 0.4rem; color: #444; }
    .alibi-slip label { font-size: 10pt; display: block; }
    .alibi-slip-line {
      display: block;
      border-bottom: 1px solid #111;
      height: 1.15rem;
      margin: 0.2rem 0 0.35rem;
    }
  `;
  const pageHtml = Array.from({ length: pages }, () => {
    const slips = Array.from({ length: 4 }, () => slipHtml(options.potName)).join('');
    return `<section class="alibi-slip-page">${slips}</section>`;
  }).join('');

  return buildReportDocument(
    title,
    `<style>${extraCss}</style>${pageHtml}`,
    filename
  );
}

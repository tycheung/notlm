/**
 * Shared print chrome for Victory side-action reports.
 * Designed for letter paper, color + B&W, low ink (hairlines, no dark fills).
 */

import { downloadBlob } from './downloadBlob';
import { VICTORY_LOGO_MARK_DATA_URI } from '../assets/victoryLogoMarkDataUri';

export { PRINT_CSS, REPORT_BRAND } from './sideActionReportPrintCss';
import { PRINT_CSS, REPORT_BRAND } from './sideActionReportPrintCss';

/**
 * Blank sign-up sheets: one page = this many name rows (letter, 0.5in margins,
 * with header/note/footer chrome). Sized to stay on a single printed page —
 * do not "stretch" row heights to 10in or content will spill to page 2.
 * Keep in sync with backend SIGNUP_SHEET_BLANK_ROWS_PER_PAGE.
 */
export const SIGNUP_SHEET_BLANK_ROWS_PER_PAGE = 22;

export interface ReportDocument {
  title: string;
  /** Stem used for Download HTML and as the Chrome Save as PDF suggestion (via document.title). */
  suggestedFilename: string;
  /** Full HTML document suitable for iframe srcDoc / download / print */
  html: string;
}

/** Safe filename stem (no extension) for downloads / Save as PDF. */
export function reportSuggestedFilename(...parts: Array<string | null | undefined>): string {
  const stem = parts
    .filter((p): p is string => Boolean(p && String(p).trim()))
    .join('_')
    .replace(/[^\w-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 100);
  return stem || 'victory_report';
}

export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Append director identity to a tournament name in print headers. */
export function withDirector(tournamentName: string, directorName?: string | null): string {
  const name = (directorName || '').trim();
  return name ? `${tournamentName} · Director: ${name}` : tournamentName;
}

export function formatDateOnly(d = new Date()): string {
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatFilenameDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Side-action print cells: blank for $0.00. */
export function formatMoney(amount: number): string {
  if (!amount) return '';
  return `$${Number(amount).toFixed(2)}`;
}

/** Always `$0.00` for falsy amounts (entry-summary totals). */
export function formatMoneyAlways(amount: number): string {
  return `$${Number(amount || 0).toFixed(2)}`;
}

/** Event roster/standings: `$0.00` for zero, em dash when missing. */
export function formatMoneyOrDash(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  return `$${Number(amount).toFixed(2)}`;
}

/**
 * Victory mark for print footers (PNG served from /public).
 * Keep small in the footer so it stays ink-light.
 */
export const REPORT_LOGO_MARK_HTML = `
<img
  src="${VICTORY_LOGO_MARK_DATA_URI}"
  width="36"
  height="36"
  alt=""
  aria-hidden="true"
  class="report-logo-mark"
/>
`.trim();

/** @deprecated Use REPORT_LOGO_MARK_HTML — kept for existing imports. */
export const REPORT_LOGO_MARK_SVG = REPORT_LOGO_MARK_HTML;

/** Shared footer: logo mark only, event-first reports stay unbranded up top. */
export function reportFooterHtml(): string {
  return `
    <footer class="report-footer">
      ${REPORT_LOGO_MARK_HTML}
    </footer>
  `;
}

/** Build a complete printable HTML document (previewed in-app; no blank popup). */
export function buildReportDocument(
  title: string,
  bodyHtml: string,
  suggestedFilename?: string,
  options?: { pageMargin?: string; pageSize?: string; bodyClass?: string }
): ReportDocument {
  const filename = suggestedFilename || reportSuggestedFilename(title);
  const pageSize = options?.pageSize || 'letter portrait';
  const pageOverride =
    options?.pageMargin || options?.pageSize
      ? `@page { size: ${pageSize}; margin: ${options?.pageMargin || '0.5in'}; }`
      : '';
  const bodyClass = options?.bodyClass ? ` class="${escapeHtml(options.bodyClass)}"` : '';
  // <title> is what most browsers use for Save as PDF when printing this document.
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(filename)}</title>
  <style>${PRINT_CSS}
${pageOverride}
</style>
</head>
<body${bodyClass}>
  ${bodyHtml}
</body>
</html>`;
  return { title, suggestedFilename: filename, html };
}

/** Trigger the browser print dialog for an iframe showing a report. */
export function printReportIframe(
  iframe: HTMLIFrameElement | null,
  suggestedFilename?: string
): void {
  const win = iframe?.contentWindow;
  const iframeDoc = iframe?.contentDocument;
  if (!win || !iframeDoc?.body || !iframeDoc.body.childNodes.length) {
    throw new Error('Report preview is not ready to print yet.');
  }

  const filename = (suggestedFilename || iframeDoc.title || 'victory_report').replace(
    /\.pdf$/i,
    ''
  );
  const prevIframeTitle = iframeDoc.title;
  const prevParentTitle = document.title;
  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    try {
      iframeDoc.title = prevIframeTitle;
    } catch {
      /* iframe may be gone */
    }
    document.title = prevParentTitle;
    try {
      win.removeEventListener('afterprint', restore);
    } catch {
      /* ignore */
    }
    window.removeEventListener('afterprint', restore);
  };

  // Chrome often uses the *parent* document.title for Save as PDF when printing an iframe.
  iframeDoc.title = filename;
  document.title = filename;
  win.addEventListener('afterprint', restore);
  window.addEventListener('afterprint', restore);
  window.setTimeout(restore, 120_000);

  // Double-rAF + short settle — large bracket books otherwise crash Chrome’s PDF backend.
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        try {
          win.focus();
          win.print();
        } catch {
          restore();
        }
      }, 120);
    });
  });
}

/** Download the report as an .html file (open locally and Print → Save as PDF). */
export async function downloadReportHtml(doc: ReportDocument): Promise<void> {
  const safeName =
    doc.suggestedFilename ||
    doc.title.replace(/[^\w-]+/g, '_').slice(0, 80) ||
    'report';
  const blob = new Blob([doc.html], { type: 'text/html;charset=utf-8' });
  await downloadBlob(blob, `${safeName}.html`);
}

/** Inner HTML of a printable report document body (for stitching multi-section reports). */
export function extractReportBodyHtml(html: string): string {
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return match ? match[1].trim() : html;
}

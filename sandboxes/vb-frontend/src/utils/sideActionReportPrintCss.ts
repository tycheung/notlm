/**
 * Print stylesheet for Victory side-action / event reports.
 * Kept separate so sideActionReportPrint.ts stays focused on document helpers.
 */
export const REPORT_BRAND = {
  name: 'Victory Bowling',
  accent: '#f97316',
  text: '#111827',
  muted: '#4b5563',
  rule: '#cbd5e1',
  zebra: '#f8fafc',
} as const;

export const PRINT_CSS = `
  @page { size: letter portrait; margin: 0.5in; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 12px;
    font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: ${REPORT_BRAND.text};
    background: #fff;
    font-size: 11pt;
    line-height: 1.25;
  }
  body.brackets-doc {
    padding: 0;
  }
  .report-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 2px solid ${REPORT_BRAND.accent};
    padding-bottom: 8px;
    margin-bottom: 14px;
  }
  .report-title {
    margin: 0;
    font-size: 16pt;
    font-weight: 700;
  }
  .report-subtitle {
    margin-top: 2px;
    font-size: 11pt;
    color: ${REPORT_BRAND.muted};
  }
  .report-doc-label {
    margin-top: 6px;
    font-size: 10pt;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: ${REPORT_BRAND.text};
  }
  .report-meta {
    color: ${REPORT_BRAND.muted};
    font-size: 9pt;
    text-align: right;
  }
  .report-note {
    margin: 0 0 12px;
    color: ${REPORT_BRAND.muted};
    font-size: 9pt;
  }
  table.report-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  table.report-table th,
  table.report-table td {
    border: 1px solid ${REPORT_BRAND.rule};
    padding: 5px 6px;
    vertical-align: middle;
  }
  table.report-table th {
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    font-weight: 700;
    background: #fff;
    color: ${REPORT_BRAND.text};
    border-bottom: 2px solid ${REPORT_BRAND.accent};
  }
  table.report-table td {
    height: 26px;
  }
  table.report-table tbody tr:nth-child(even) td {
    background: ${REPORT_BRAND.zebra};
  }
  .col-name {
    width: 28%;
    text-align: left;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .col-count { text-align: center; }
  .col-total { width: 10%; text-align: center; font-weight: 600; }
  .col-money {
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .col-owed { font-weight: 700; }
  .col-signature {
    width: 1.35in;
    min-width: 1.1in;
  }
  table.payout-report-table th.payout-sa {
    font-size: 7.5pt;
    text-transform: none;
    letter-spacing: 0;
    white-space: normal;
    line-height: 1.15;
  }
  .payout-col-title {
    display: block;
    font-weight: 700;
    line-height: 1.15;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .payout-readiness {
    display: block;
    margin-top: 2px;
    font-size: 8pt;
    font-weight: 700;
  }
  .payout-not-ready {
    font-size: 8pt;
    font-weight: 700;
    white-space: nowrap;
  }
  .payout-col-team {
    display: block;
    margin-top: 2px;
    font-size: 7pt;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .payout-team-badge {
    display: inline-block;
    margin-right: 6px;
    padding: 1px 5px;
    border: 1px solid #1e3a5f;
    font-size: 7.5pt;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  table.payout-report-table td {
    height: 28px;
    padding: 3px 5px;
  }
  table.payout-report-table tbody tr.payout-row-team td {
    background: #dbe4ee;
    font-weight: 700;
  }
  table.payout-report-table tbody tr.payout-row-header td {
    background: #c5d0dc;
    font-weight: 700;
    border-bottom: 1px solid ${REPORT_BRAND.accent};
  }
  table.payout-report-table tbody tr.payout-row-nested td.col-name {
    padding-left: 18px;
  }
  table.payout-report-table tbody tr.payout-section td {
    background: ${REPORT_BRAND.accent};
    color: #fff;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-size: 8.5pt;
    padding: 5px 6px;
  }
  table.payout-report-table tbody tr.payout-row-bowler:nth-child(even) td {
    background: ${REPORT_BRAND.zebra};
  }
  .payout-report-page + .payout-report-page {
    margin-top: 0;
    padding-top: 0;
    border-top: none;
  }
  body.signup-sheet-doc table.report-table,
  body.payout-sheet-doc table.report-table {
    width: auto;
    max-width: none;
    table-layout: fixed;
  }
  body.payout-sheet-doc table.payout-report-table th,
  body.payout-sheet-doc table.payout-report-table td {
    overflow: hidden;
  }
  body.signup-sheet-doc table.signup-sheet-table th,
  body.signup-sheet-doc table.signup-sheet-table td {
    overflow: hidden;
  }
  body.signup-sheet-doc .col-name,
  body.payout-sheet-doc .col-name {
    width: 1.35in;
    min-width: 1.35in;
    max-width: 1.35in;
  }
  body.payout-sheet-doc table.payout-report-table th.payout-sa {
    width: 0.85in;
    min-width: 0.85in;
    max-width: 1.05in;
    vertical-align: bottom;
  }
  body.payout-sheet-doc .col-money {
    width: 0.62in;
    min-width: 0.62in;
    max-width: 0.75in;
  }
  body.payout-sheet-doc .col-signature {
    width: 1.1in;
    min-width: 1.1in;
    max-width: 1.2in;
  }
  body.signup-sheet-landscape .signup-sheet-slice,
  body.payout-sheet-landscape .payout-sheet-slice {
    max-width: 10in;
  }
  body.payout-sheet-portrait table.payout-report-table {
    width: 100%;
  }
  body.payout-sheet-portrait table.payout-report-table th.payout-sa {
    width: auto;
    min-width: 0.72in;
    max-width: none;
  }
  body.payout-sheet-portrait .payout-col-title,
  body.payout-sheet-portrait .payout-readiness {
    max-height: none;
    overflow: visible;
    overflow-wrap: anywhere;
    word-break: break-word;
    white-space: normal;
  }
  .signup-sheet-slice + .signup-sheet-slice,
  .payout-sheet-slice + .payout-sheet-slice {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 2px dashed ${REPORT_BRAND.rule};
  }
  table.individual-bracket-table {
    font-size: 8.5pt;
  }
  table.individual-bracket-table th,
  table.individual-bracket-table td {
    padding: 3px 4px;
    text-align: center;
    vertical-align: middle;
  }
  table.individual-bracket-table th {
    font-size: 7.5pt;
  }
  table.individual-bracket-table td.ind-num,
  table.individual-bracket-table th.ind-num {
    width: 0.42in;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  table.individual-bracket-table td.ind-opp {
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 1.15in;
  }
  table.individual-bracket-table td.ind-score {
    width: 0.42in;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
  table.individual-bracket-table td.ind-score.is-winner {
    outline: 2px solid ${REPORT_BRAND.accent};
    outline-offset: -2px;
    background: #fff7ed;
    font-weight: 700;
  }
  table.individual-bracket-table td.ind-prize,
  table.individual-bracket-table th.ind-prize {
    width: 0.55in;
    text-align: right;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  table.individual-bracket-table td.ind-empty {
    color: ${REPORT_BRAND.muted};
  }
  .individual-summary {
    margin-top: 16px;
    padding-top: 10px;
    border-top: 2px solid ${REPORT_BRAND.accent};
  }
  .individual-section-title {
    margin: 14px 0 6px;
    font-size: 10.5pt;
    font-weight: 700;
    color: ${REPORT_BRAND.text};
  }
  .individual-bracket-section + .individual-bracket-section {
    margin-top: 10px;
  }
  .individual-summary-title {
    margin: 0 0 8px;
    font-size: 11pt;
    font-weight: 700;
  }
  .individual-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px 12px;
    font-size: 9.5pt;
  }
  .individual-summary-grid .label {
    display: block;
    color: ${REPORT_BRAND.muted};
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 600;
  }
  .individual-summary-grid .value {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .individual-summary-total {
    grid-column: 1 / -1;
    margin-top: 4px;
    padding-top: 6px;
    border-top: 1px solid ${REPORT_BRAND.rule};
  }
  .individual-summary-total .value {
    font-size: 12pt;
  }
  @media print {
    .individual-bracket-page {
      break-inside: avoid;
    }
  }
  .report-footer {
    margin-top: 28px;
    padding-top: 10px;
    border-top: 1px solid ${REPORT_BRAND.rule};
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .report-footer svg,
  .report-footer img.report-logo-mark {
    display: block;
    height: 28px;
    width: auto;
    opacity: 0.9;
  }
  .signup-blank-page,
  .signup-roster-page {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    page-break-after: always;
    break-after: page;
  }
  .signup-blank-page {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .signup-blank-page + .signup-blank-page,
  .signup-roster-page + .signup-roster-page {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 2px dashed ${REPORT_BRAND.rule};
  }
  .signup-blank-page:last-child,
  .signup-roster-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  .signup-blank-page .report-header,
  .signup-roster-page .report-header {
    flex: 0 0 auto;
    margin-bottom: 8px;
    padding-bottom: 6px;
  }
  .signup-blank-page .report-title,
  .signup-roster-page .report-title {
    font-size: 14pt;
  }
  .signup-blank-page .report-note,
  .signup-roster-page .report-note {
    flex: 0 0 auto;
    margin: 0 0 8px;
    font-size: 8pt;
  }
  .signup-blank-page .report-footer,
  .signup-roster-page .report-footer {
    flex: 0 0 auto;
    margin-top: 8px;
    padding-top: 6px;
  }
  .signup-blank-page .report-footer svg,
  .signup-roster-page .report-footer svg,
  .signup-blank-page .report-footer img.report-logo-mark,
  .signup-roster-page .report-footer img.report-logo-mark {
    height: 22px;
  }
  table.report-table-fill {
    flex: 0 0 auto;
    width: 100%;
  }
  table.report-table-fill th,
  table.report-table-fill td {
    padding: 3px 5px;
  }
  table.report-table-fill tbody tr td {
    height: 0.28in;
  }
  body.signup-sheet-doc table.signup-sheet-table th,
  body.signup-sheet-doc table.signup-sheet-table td {
    overflow: hidden;
  }
  body.signup-sheet-doc .col-count {
    width: 0.72in;
    min-width: 0.72in;
    max-width: 0.85in;
    font-size: 8pt;
    line-height: 1.15;
    vertical-align: middle;
  }
  body.signup-sheet-doc td.signup-count-cell {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    text-align: center;
    overflow: visible;
    padding-left: 2px;
    padding-right: 2px;
  }
  body.signup-sheet-doc th.col-count {
    vertical-align: bottom;
  }
  body.signup-sheet-doc .col-total {
    width: 0.58in;
    min-width: 0.58in;
    max-width: 0.58in;
    font-size: 8pt;
  }
  body.signup-sheet-doc .signup-col-title {
    display: block;
    font-size: 7pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    line-height: 1.15;
    max-height: 2.3em;
    overflow: hidden;
  }
  body.signup-sheet-doc .signup-col-sub {
    margin-top: 2px;
    font-weight: 500;
    text-transform: none;
    letter-spacing: 0;
    font-size: 6.5pt;
    line-height: 1.15;
    color: ${REPORT_BRAND.muted};
    max-height: 2.3em;
    overflow: hidden;
  }
  body.signup-sheet-portrait table.signup-sheet-table {
    width: 100%;
  }
  body.signup-sheet-portrait .col-count {
    width: auto;
    min-width: 0.72in;
    max-width: none;
  }
  body.signup-sheet-portrait .signup-col-title,
  body.signup-sheet-portrait .signup-col-sub {
    max-height: none;
    overflow: visible;
    overflow-wrap: anywhere;
    word-break: break-word;
    white-space: normal;
  }
  .entry-summary-page {
    max-width: 7.5in;
  }
  .event-entry-summary-toc {
    margin: 0.75rem 0 0;
    padding-left: 1.25rem;
    font-size: 0.9rem;
  }
  .event-entry-summary-doc .entry-summary-page + .entry-summary-page {
    margin-top: 0;
  }
  .entry-summary-metrics {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin: 0 0 18px;
  }
  .entry-summary-metric {
    border: 1px solid ${REPORT_BRAND.rule};
    border-top: 3px solid ${REPORT_BRAND.accent};
    padding: 10px 12px;
    text-align: center;
  }
  .entry-summary-metric-label {
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${REPORT_BRAND.muted};
    font-weight: 600;
  }
  .entry-summary-metric-value {
    margin-top: 6px;
    font-size: 22pt;
    font-weight: 700;
    line-height: 1.1;
    color: ${REPORT_BRAND.text};
  }
  .entry-summary-section-title {
    margin: 0 0 8px;
    font-size: 11pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${REPORT_BRAND.text};
  }
  table.entry-summary-finance {
    margin-bottom: 16px;
    table-layout: auto;
  }
  table.entry-summary-finance th {
    text-align: left;
    width: 55%;
    text-transform: none;
    letter-spacing: 0;
    font-size: 10pt;
    font-weight: 600;
    border-bottom: 1px solid ${REPORT_BRAND.rule};
    background: #fff;
  }
  table.entry-summary-finance td {
    text-align: right;
    font-weight: 600;
    height: auto;
    font-size: 11pt;
  }
  .entry-summary-note {
    margin-bottom: 14px;
  }
  .entry-summary-setup-subtitle {
    margin: 10px 0 6px;
    font-size: 10pt;
    font-weight: 600;
    color: ${REPORT_BRAND.text};
  }
  table.entry-summary-setup {
    margin-bottom: 14px;
    table-layout: fixed;
    width: 100%;
    max-width: 6.5in;
  }
  table.entry-summary-setup th.setup-label,
  table.entry-summary-setup tbody th {
    text-align: left;
    width: 34%;
    text-transform: none;
    letter-spacing: 0;
    font-size: 9pt;
    font-weight: 600;
    border-bottom: 1px solid ${REPORT_BRAND.rule};
    background: #fff;
  }
  table.entry-summary-setup th.setup-col {
    text-align: center;
    text-transform: none;
    letter-spacing: 0;
    font-size: 8.5pt;
    font-weight: 700;
    border-bottom: 2px solid ${REPORT_BRAND.accent};
    background: #fff;
  }
  table.entry-summary-setup td {
    text-align: center;
    font-weight: 600;
    height: auto;
    font-size: 10pt;
    font-variant-numeric: tabular-nums;
  }
  table.entry-summary-by-set th.setup-label,
  table.entry-summary-by-set tbody th {
    text-align: left;
    font-weight: 600;
  }
  table.entry-summary-by-set tr.entry-summary-total-row th,
  table.entry-summary-by-set tr.entry-summary-total-row td {
    border-top: 2px solid ${REPORT_BRAND.accent};
    font-weight: 700;
  }
  .alive-list-page {
    max-width: 7.5in;
  }
  .alive-list-header {
    margin-bottom: 6px;
  }
  .alive-list-header .report-title {
    font-size: 16pt;
    margin: 0;
    line-height: 1.15;
  }
  .alive-list-header .report-subtitle {
    margin: 1px 0 0;
    font-size: 9pt;
  }
  .alive-list-header .report-meta,
  .alive-list-header .report-kicker {
    margin: 2px 0 0;
    font-size: 8pt;
  }
  .alive-list-note {
    margin: 0 0 6px;
    font-size: 9pt;
    line-height: 1.3;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: baseline;
  }
  .alive-list-sa-name {
    font-weight: 700;
    color: ${REPORT_BRAND.text};
  }
  .alive-list-bracket-count {
    font-weight: 600;
    color: ${REPORT_BRAND.text};
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .brackets-page {
    /* Letter content under pageMargin 0.28 / 0.25 â€” stretch 4 pots to fill */
    height: 10.42in;
    max-width: none;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .brackets-page + .brackets-page {
    margin-top: 0;
    padding-top: 0;
    border-top: none;
  }
  .brackets-report-header {
    flex: 0 0 auto;
    margin: 0 0 0.05in;
    padding: 0 0 0.03in;
    border-bottom: 2px solid ${REPORT_BRAND.accent};
  }
  .brackets-report-title-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
    font-size: 9pt;
    line-height: 1.15;
  }
  .brackets-report-header .report-title {
    font-size: 12pt;
    margin: 0;
    line-height: 1.1;
    font-weight: 700;
  }
  .brackets-sa-name {
    font-weight: 700;
    color: ${REPORT_BRAND.text};
  }
  .brackets-count {
    font-weight: 600;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .brackets-report-title-row .report-meta {
    margin-left: auto;
    text-align: right;
    font-size: 8.5pt;
  }
  .brackets-report-context {
    margin-top: 2px;
    font-size: 8.5pt;
    line-height: 1.2;
    color: ${REPORT_BRAND.muted};
  }
  .brackets-event {
    font-weight: 600;
    color: ${REPORT_BRAND.text};
  }
  .brackets-context-sep {
    margin: 0 0.35em;
    color: ${REPORT_BRAND.muted};
  }
  .brackets-page-pots {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 0.07in;
  }
  .bracket-pot {
    flex: 1 1 0;
    min-height: 0;
    /* Cap at 1/4 of the pots area so a leftover last bracket is not page-tall */
    max-height: calc((100% - 3 * 0.07in) / 4);
    display: flex;
    flex-direction: column;
    break-inside: avoid;
    page-break-inside: avoid;
    border: 1px solid ${REPORT_BRAND.rule};
    border-top: 2px solid ${REPORT_BRAND.accent};
    padding: 0.03in 0.07in 0.04in;
  }
  .bracket-pot-title {
    flex: 0 0 auto;
    margin: 0 0 0.015in;
    font-size: 9pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .bracket-pot-tree {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 0.02in;
  }
  .bp-headers {
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: 1.25fr 1.1fr 1fr;
    column-gap: 10px;
  }
  .bp-col-label {
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${REPORT_BRAND.muted};
    text-align: center;
    line-height: 1;
  }
  /*
   * Equal match box size everywhere.
   * --bp-gap = space between G1 pairs (so 1v2 â‰  3v4).
   * --bp-mh  = shared match height = (column âˆ’ 3 gaps) / 4.
   * G2 / Final use the same height, positioned at feeder midpoints.
   */
  .bp-body {
    --bp-gap: 0.11in;
    --bp-mh: calc((100% - (3 * var(--bp-gap))) / 4);
    flex: 1 1 auto;
    min-height: 0;
    display: grid;
    grid-template-columns: 1.25fr 1.1fr 1fr;
    column-gap: 10px;
    align-items: stretch;
  }
  .bp-col {
    position: relative;
    height: 100%;
    min-height: 0;
  }
  .bp-col-g1 {
    display: flex;
    flex-direction: column;
    gap: var(--bp-gap);
  }
  .bp-col-g1 .bp-match {
    flex: 0 0 var(--bp-mh);
    height: var(--bp-mh);
  }
  .bp-col-g2 .bp-match,
  .bp-col-final .bp-match {
    position: absolute;
    left: 0;
    right: 0;
    height: var(--bp-mh);
  }
  /* G2-0 centered between G1-0 and G1-1 */
  .bp-col-g2 .bp-match:nth-child(1) {
    top: calc(0.5 * var(--bp-mh) + 0.5 * var(--bp-gap));
  }
  /* G2-1 centered between G1-2 and G1-3 */
  .bp-col-g2 .bp-match:nth-child(2) {
    top: calc(2.5 * var(--bp-mh) + 2.5 * var(--bp-gap));
  }
  /* Final centered between the two G2 matches */
  .bp-col-final .bp-match {
    top: calc(1.5 * var(--bp-mh) + 1.5 * var(--bp-gap));
  }
  .bp-match {
    box-sizing: border-box;
    border: 1px solid ${REPORT_BRAND.rule};
    background: #fff;
    display: flex;
    flex-direction: column;
  }
  .bp-slot {
    flex: 1 1 50%;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    /* Extra bottom pad â€” descenders (g/y/p) need room under the baseline */
    padding: 5px 9px 10px;
    box-sizing: border-box;
    border-bottom: 1px solid ${REPORT_BRAND.rule};
    font-size: 10.5pt;
    line-height: 1.35;
  }
  .bp-slot:last-child {
    border-bottom: none;
  }
  .bp-slot.is-winner .bp-name {
    font-weight: 700;
  }
  .bp-slot.is-empty .bp-name {
    color: ${REPORT_BRAND.muted};
    font-style: italic;
    font-weight: 500;
  }
  .bp-left {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    flex: 1 1 auto;
    line-height: 1.35;
  }
  .bp-name {
    font-weight: 600;
    text-align: left;
    /* lh > 1 keeps descenders inside the ellipsis box (lh:1 was clipping g/y/p) */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    line-height: 1.35;
  }
  .bp-prize {
    flex: 0 0 auto;
    font-size: 10pt;
    font-weight: 700;
    color: ${REPORT_BRAND.text};
    white-space: nowrap;
    line-height: 1.35;
  }
  .bp-score {
    flex: 0 0 1.85em;
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    color: ${REPORT_BRAND.text};
    line-height: 1.35;
  }
  table.alive-list-table {
    table-layout: fixed;
    width: 100%;
  }
  table.alive-list-table th,
  table.alive-list-table td {
    padding: 2px 5px;
    vertical-align: top;
    line-height: 1.2;
  }
  table.alive-list-table th {
    font-size: 7.5pt;
    padding-bottom: 3px;
  }
  table.alive-list-table tbody tr:nth-child(even) td {
    background: ${REPORT_BRAND.zebra};
  }
  table.alive-list-table th:first-child,
  table.alive-list-table td.alive-name {
    width: 1.55in;
    font-weight: 700;
    font-size: 8.5pt;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  table.alive-list-table th.alive-total,
  table.alive-list-table td.alive-total {
    width: 0.42in;
    text-align: center;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    font-size: 8.5pt;
    white-space: nowrap;
  }
  table.alive-list-table td.alive-detail {
    font-variant-numeric: tabular-nums;
    font-size: 8pt;
    font-weight: 600;
    letter-spacing: -0.01em;
    word-break: break-word;
    hyphens: auto;
  }
  /* Bracket-numbers mode: pack numbers tightly for long lists */
  .alive-list-dense table.alive-list-table th,
  .alive-list-dense table.alive-list-table td {
    padding: 1px 4px;
    line-height: 1.15;
  }
  .alive-list-dense table.alive-list-table td.alive-name {
    font-size: 8pt;
  }
  .alive-list-dense table.alive-list-table td.alive-total {
    font-size: 8pt;
  }
  .alive-list-dense table.alive-list-table td.alive-detail {
    font-size: 7.5pt;
    font-weight: 700;
    letter-spacing: -0.02em;
    font-stretch: condensed;
  }
  table.alive-list-table td.alive-empty {
    text-align: center;
    color: ${REPORT_BRAND.muted};
    font-style: italic;
    font-size: 8pt;
  }
  .report-kicker {
    margin: 0 0 4px;
    font-size: 9pt;
    color: ${REPORT_BRAND.muted};
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
  }
  .report-subtitle {
    margin: 2px 0 0;
    font-size: 11pt;
    font-weight: 600;
    color: ${REPORT_BRAND.text};
  }
  .report-meta {
    margin: 6px 0 0;
    font-size: 9pt;
    color: ${REPORT_BRAND.muted};
  }
  @media print {
    body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    table.report-table thead { display: table-header-group; }
    /* Avoid page-break-inside:avoid on every roster row â€” Chrome can clip to 1 page. */
    table.report-table-fill tbody tr { page-break-inside: avoid; }
    .report-footer { break-inside: avoid; }
    .signup-blank-page,
    .signup-roster-page {
      height: auto;
      min-height: 0;
    }
    .signup-blank-page + .signup-blank-page,
    .signup-roster-page + .signup-roster-page {
      margin-top: 0;
      padding-top: 0;
      border-top: none;
    }
    .signup-sheet-slice + .signup-sheet-slice {
      margin-top: 0;
      padding-top: 0;
      border-top: none;
    }
    .signup-sheet-slice {
      break-after: page;
      page-break-after: always;
    }
    .signup-sheet-slice:last-child {
      break-after: auto;
      page-break-after: auto;
    }
    .entry-summary-page { break-inside: avoid; }
    .brackets-page {
      height: 10.42in;
      break-after: page;
      page-break-after: always;
    }
    .brackets-page:last-child {
      break-after: auto;
      page-break-after: auto;
    }
    .brackets-page + .brackets-page {
      margin-top: 0;
      padding-top: 0;
      border-top: none;
    }
    .bracket-pot {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .payout-report-page {
      break-after: page;
      page-break-after: always;
    }
    .payout-report-page:last-child {
      break-after: auto;
      page-break-after: auto;
    }
    .payout-sheet-slice + .payout-sheet-slice {
      margin-top: 0;
      padding-top: 0;
      border-top: none;
    }
    .payout-sheet-slice {
      break-after: page;
      page-break-after: always;
    }
    .payout-sheet-slice:last-child {
      break-after: auto;
      page-break-after: auto;
    }
    .high-game-report-page--dense .high-game-section {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  }

  .high-game-report-page--dense .high-game-report-header {
    margin-bottom: 4px;
  }
  .high-game-report-page--dense .report-title {
    font-size: 14pt;
  }
  .high-game-report-note {
    margin: 4px 0 8px;
  }
  .high-game-sections--stack {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .high-game-sections--grid {
    display: grid;
    /* Up to 3 game columns across a letter page for short winner lists. */
    grid-template-columns: repeat(auto-fit, minmax(2.15in, 1fr));
    gap: 8px 12px;
    align-items: start;
  }
  .high-game-section-title {
    margin: 0 0 3px;
    font-size: 9.5pt;
    font-weight: 700;
    color: ${REPORT_BRAND.text};
    line-height: 1.2;
  }
  table.high-game-standings-table {
    width: 100%;
    font-size: 9pt;
  }
  table.high-game-standings-table th,
  table.high-game-standings-table td {
    padding: 2px 4px;
    border-bottom: 1px solid ${REPORT_BRAND.rule};
    vertical-align: top;
  }
  table.high-game-standings-table th.col-place,
  table.high-game-standings-table td.col-place {
    width: 1.4rem;
    text-align: center;
  }
  table.high-game-standings-table th.col-score,
  table.high-game-standings-table td.col-score,
  table.high-game-standings-table th.col-money,
  table.high-game-standings-table td.col-money,
  table.high-game-standings-table th.col-game,
  table.high-game-standings-table td.col-game {
    width: 2.6rem;
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  table.high-game-standings-table .hg-empty {
    text-align: center;
    color: ${REPORT_BRAND.muted};
    font-style: italic;
  }
  table.high-game-pot-table {
    margin-bottom: 12px;
  }

  /* â€”â€” Eliminator report â€”â€” */
  .elim-report-note { margin: 4px 0 6px; }
  .elim-warning { color: #b45309; font-weight: 600; }
  .elim-cut-banner {
    border: 1px solid ${REPORT_BRAND.rule};
    border-radius: 4px;
    padding: 6px 8px;
    margin: 0 0 8px;
    background: #fff;
  }
  .elim-cut-banner-title {
    font-size: 9pt;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .elim-cut-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 8px;
  }
  .elim-cut-chip {
    display: inline-block;
    font-size: 8.5pt;
    border: 1px solid ${REPORT_BRAND.rule};
    border-radius: 3px;
    padding: 1px 6px;
    background: #f8fafc;
  }
  .elim-cut-chip--final {
    border-color: #86efac;
    background: #f0fdf4;
  }
  .elim-columns-legend,
  .elim-columns-hint {
    margin: 2px 0 6px;
    font-size: 8pt;
  }
  table.elim-columns-table {
    width: 100%;
    font-size: 9pt;
    border-collapse: collapse;
  }
  table.elim-columns-table th,
  table.elim-columns-table td {
    padding: 2px 5px;
    border-bottom: 1px solid ${REPORT_BRAND.rule};
    vertical-align: middle;
  }
  table.elim-columns-table th.elim-col-name,
  table.elim-columns-table td.elim-col-name {
    text-align: left;
    min-width: 1.6in;
  }
  table.elim-columns-table th.elim-col-game,
  table.elim-columns-table td.elim-score {
    width: 0.55in;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
  table.elim-columns-table th.elim-col-prize,
  table.elim-columns-table td.elim-col-prize {
    width: 0.7in;
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  table.elim-columns-table th.elim-spacer,
  table.elim-columns-table td.elim-spacer {
    width: 0.18in;
    padding: 0;
    border-bottom: none;
    background: transparent;
  }
  table.elim-columns-table tr.elim-row--tier-break td {
    border-top: 2px solid ${REPORT_BRAND.text};
  }
  /* Kill zebra striping on Eliminator score cells so cut/paid fills stay solid. */
  table.elim-columns-table.report-table tbody tr:nth-child(even) td,
  table.elim-pages-table.report-table tbody tr:nth-child(even) td {
    background: transparent;
  }
  table.elim-columns-table.report-table tbody tr:nth-child(even) td.elim-spacer,
  table.elim-pages-table.report-table tbody tr:nth-child(even) td.elim-spacer {
    background: transparent;
  }
  table.elim-columns-table td.elim-score--cut,
  table.elim-pages-table td.elim-score--cut {
    background: #fecaca !important;
    font-weight: 600;
  }
  table.elim-columns-table td.elim-score--paid,
  table.elim-pages-table td.elim-score--paid {
    background: #bbf7d0 !important;
    font-weight: 700;
  }
  .elim-empty {
    text-align: center;
    color: ${REPORT_BRAND.muted};
    font-style: italic;
  }
  table.elim-pages-table {
    width: 100%;
    font-size: 9.5pt;
  }
  table.elim-pages-table th,
  table.elim-pages-table td {
    padding: 2px 5px;
    border-bottom: 1px solid ${REPORT_BRAND.rule};
  }
  table.elim-pages-table .col-place { width: 1.4rem; text-align: center; }
  table.elim-pages-table .col-score,
  table.elim-pages-table .elim-score,
  table.elim-pages-table .col-money {
    width: 2.6rem;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  table.elim-pages-table .col-status { width: 3.2rem; }
  tr.elim-page-row--cut-line td {
    border-top: 2px solid ${REPORT_BRAND.text};
  }
  .elim-game-page-title {
    margin: 0 0 2px;
    font-size: 11pt;
    font-weight: 700;
  }
  .elim-page-continuation {
    margin-bottom: 6px;
  }
  table.eliminator-pot-table {
    margin-bottom: 12px;
  }

  .lc-empty {
    margin: 12px 0;
    color: ${REPORT_BRAND.muted};
  }
  .lc-block {
    break-inside: avoid;
    margin: 0 0 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid ${REPORT_BRAND.rule};
  }
  .lc-who {
    margin: 0 0 4px;
    font-size: 12pt;
  }
  .lc-meta {
    margin-left: 8px;
    font-size: 9pt;
    font-weight: 600;
    color: ${REPORT_BRAND.muted};
  }
  .lc-occ {
    margin: 0;
    padding-left: 1.2rem;
    font-size: 9.5pt;
  }
  .sl-climb {
    display: flex;
    flex-direction: column-reverse;
    gap: 10px;
  }
  .sl-rung {
    border: 1px solid ${REPORT_BRAND.rule};
    padding: 10px 12px;
    break-inside: avoid;
  }
  .sl-rung-title {
    margin: 0 0 4px;
    font-size: 11pt;
  }
  .sl-vs {
    margin: 0;
    font-size: 12pt;
    font-weight: 600;
  }
  .sl-vs span {
    font-weight: 500;
    color: ${REPORT_BRAND.muted};
    padding: 0 8px;
  }
  .sl-score {
    margin: 4px 0 0;
    font-size: 9.5pt;
    color: ${REPORT_BRAND.muted};
  }
  .bc-heat {
    font-weight: 700;
    font-size: 8pt;
    letter-spacing: 0.04em;
  }
  .bc-heat-high { color: #b91c1c; }
  .bc-heat-elevated { color: #b45309; }

  @media print {
    .elim-report-page--pages {
      break-after: page;
      page-break-after: always;
    }
    .elim-report-page--pages:last-child {
      break-after: auto;
      page-break-after: auto;
    }
    tr.elim-page-row,
    tr.elim-row {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  }
`;


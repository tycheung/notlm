import type {
  EntrySummaryBracketSetup,
  EntrySummaryReport,
} from '../../../api/side-actions';
import {
  buildReportDocument,
  escapeHtml,
  withDirector,
  formatDateOnly,
  formatFilenameDate,
  formatMoneyAlways,
  reportFooterHtml,
  reportSuggestedFilename,
  type ReportDocument,
} from '../../../utils/sideActionReportPrint';

function bracketSetLabel(setup: EntrySummaryBracketSetup): string {
  const games =
    setup.game_numbers && setup.game_numbers.length > 0
      ? ` · Games ${setup.game_numbers.join(', ')}`
      : '';
  const squad = setup.squad_name ? ` · ${setup.squad_name}` : '';
  return `${setup.side_action_name}${squad}${games}`;
}

function buildEntriesBySetTable(
  setups: EntrySummaryBracketSetup[],
  totals: Pick<EntrySummaryReport, 'total_entries' | 'bracket_count' | 'unplaced_tickets'>
): string {
  if (setups.length === 0) return '';

  const rows = setups
    .map(
      (setup) => `<tr>
        <th scope="row" class="setup-label">${escapeHtml(bracketSetLabel(setup))}</th>
        <td class="col-count">${Number(setup.total_entries ?? 0).toLocaleString()}</td>
        <td class="col-count">${Number(setup.bracket_count ?? 0).toLocaleString()}</td>
        <td class="col-count">${Number(setup.unplaced_tickets ?? 0).toLocaleString()}</td>
      </tr>`
    )
    .join('');

  const totalRow =
    setups.length > 1
      ? `<tr class="entry-summary-total-row">
        <th scope="row">Total</th>
        <td class="col-count">${totals.total_entries.toLocaleString()}</td>
        <td class="col-count">${totals.bracket_count.toLocaleString()}</td>
        <td class="col-count">${totals.unplaced_tickets.toLocaleString()}</td>
      </tr>`
      : '';

  return `
    <h2 class="entry-summary-section-title">Entries by bracket set</h2>
    <table class="report-table entry-summary-setup entry-summary-by-set">
      <thead>
        <tr>
          <th class="setup-label">Bracket set</th>
          <th class="setup-col">Entries</th>
          <th class="setup-col">Brackets</th>
          <th class="setup-col">Unplaced</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        ${totalRow}
      </tbody>
    </table>
  `;
}

function buildBracketSetupGrid(setup: EntrySummaryBracketSetup): string {
  const scenarios = setup.scenarios?.length
    ? setup.scenarios
    : [];
  if (scenarios.length === 0) return '';

  const headerCells = scenarios
    .map((s) => `<th class="setup-col">${escapeHtml(s.label)}</th>`)
    .join('');

  const row = (label: string, values: string[]) =>
    `<tr><th scope="row">${escapeHtml(label)}</th>${values
      .map((v) => `<td>${escapeHtml(v)}</td>`)
      .join('')}</tr>`;

  const statsParts = [
    setup.total_entries != null
      ? `${Number(setup.total_entries).toLocaleString()} entries`
      : '',
    setup.bracket_count != null
      ? `${Number(setup.bracket_count).toLocaleString()} brackets`
      : '',
    setup.unplaced_tickets != null && setup.unplaced_tickets > 0
      ? `${Number(setup.unplaced_tickets).toLocaleString()} unplaced`
      : '',
  ].filter(Boolean);
  const titleText = [
    setup.side_action_name ? escapeHtml(bracketSetLabel(setup)) : '',
    ...statsParts,
  ]
    .filter(Boolean)
    .join(' · ');
  const title =
    scenarios.length && titleText
      ? `<h3 class="entry-summary-setup-subtitle">${titleText}</h3>`
      : '';

  return `
    ${title}
    <table class="report-table entry-summary-setup">
      <thead>
        <tr>
          <th class="setup-label"></th>
          ${headerCells}
        </tr>
      </thead>
      <tbody>
        ${row(
          'Entry fee',
          scenarios.map((s) => formatMoneyAlways(s.entry_fee))
        )}
        ${row(
          'Collected',
          scenarios.map((s) => formatMoneyAlways(s.collected))
        )}
        ${row(
          'Fees',
          scenarios.map((s) => formatMoneyAlways(s.fees))
        )}
        ${row(
          '1st place',
          scenarios.map((s) => formatMoneyAlways(s.first))
        )}
        ${row(
          '2nd place',
          scenarios.map((s) => formatMoneyAlways(s.second))
        )}
        ${row(
          'Winnings (1st + 2nd)',
          scenarios.map((s) => formatMoneyAlways(s.winnings))
        )}
      </tbody>
    </table>
  `;
}

export function buildEntrySummaryReportDocument(
  report: EntrySummaryReport
): ReportDocument {
  const dateLabel = formatDateOnly();
  const poolLabel = report.scope === 'this' ? report.squad_name : null;
  const title = `Entry Summary — ${report.side_action_name}${poolLabel ? ` — ${poolLabel}` : ''}`;
  const filename = reportSuggestedFilename(
    'Bracket_Entry_Summary',
    report.side_action_name,
    poolLabel,
    report.event_name,
    formatFilenameDate()
  );

  const sourceNote =
    report.source === 'preview'
      ? `<p class="report-note entry-summary-note">Brackets not locked yet — figures are from a live preview (may change on Lock &amp; Generate).</p>`
      : report.source === 'mixed'
        ? `<p class="report-note entry-summary-note">Includes both generated and preview bracket side actions.</p>`
        : `<p class="report-note entry-summary-note">Winnings = configured place prizes × pots (not live bowler rewards). Tie fee waivers are handled at cash-out.</p>`;

  const included =
    report.scope === 'all' && (report.included_side_actions?.length ?? 0) > 0
      ? `<p class="report-note">Included: ${escapeHtml(
          (report.included_side_actions || []).join(', ')
        )}</p>`
      : '';

  const setups = report.bracket_setups?.length
    ? report.bracket_setups
    : [];
  const showSetupNames = report.scope === 'all' || setups.length > 1;
  const entriesBySetBlock = buildEntriesBySetTable(setups, report);
  const setupBlock =
    setups.length > 0
      ? `
      <h2 class="entry-summary-section-title">Bracket setup</h2>
      <p class="report-note entry-summary-note">Per-pot money for a full pot vs a one-bye pot. Fees use the configured fee amounts (not pot leftover).</p>
      ${setups
        .map((setup) =>
          buildBracketSetupGrid({
            ...setup,
            side_action_name: showSetupNames ? setup.side_action_name : '',
          })
        )
        .join('')}`
      : `<p class="report-note">Bracket setup unavailable.</p>`;

  const bodyHtml = `
    <section class="entry-summary-page">
      <header class="report-header">
        <div>
          <h1 class="report-title">${escapeHtml(report.side_action_name)}</h1>
          <div class="report-subtitle">${escapeHtml(report.event_name)}</div>
          <div class="report-subtitle">${escapeHtml(withDirector(report.tournament_name, report.director_name))}</div>
          ${poolLabel ? `<div class="report-subtitle">Squad: ${escapeHtml(poolLabel)}${report.pool_id ? ` · Pool ${report.pool_id}` : ''}</div>` : ''}
          <div class="report-doc-label">Bracket Entry Summary</div>
        </div>
        <div class="report-meta">
          <div>${escapeHtml(dateLabel)}</div>
        </div>
      </header>
      ${sourceNote}
      ${included}
      <div class="entry-summary-metrics">
        <div class="entry-summary-metric">
          <div class="entry-summary-metric-label">Total entries</div>
          <div class="entry-summary-metric-value">${report.total_entries}</div>
        </div>
        <div class="entry-summary-metric">
          <div class="entry-summary-metric-label">Brackets created</div>
          <div class="entry-summary-metric-value">${report.bracket_count}</div>
        </div>
        <div class="entry-summary-metric">
          <div class="entry-summary-metric-label">Unplaced (brackets refunded)</div>
          <div class="entry-summary-metric-value">${report.unplaced_tickets}</div>
        </div>
      </div>
      <h2 class="entry-summary-section-title">Financial snapshot</h2>
      <table class="report-table entry-summary-finance">
        <tbody>
          <tr><th scope="row">Collected</th><td>${escapeHtml(formatMoneyAlways(report.financials.total_collected))}</td></tr>
          <tr><th scope="row">Refunds</th><td>${escapeHtml(formatMoneyAlways(report.financials.total_refunds))}</td></tr>
          <tr><th scope="row">Winnings</th><td>${escapeHtml(formatMoneyAlways(report.financials.winnings))}</td></tr>
          <tr><th scope="row">Total payout (refunds + winnings)</th><td>${escapeHtml(formatMoneyAlways(report.financials.total_payout))}</td></tr>
          <tr><th scope="row">Fees</th><td>${escapeHtml(formatMoneyAlways(report.financials.fees))}</td></tr>
        </tbody>
      </table>
      ${entriesBySetBlock}
      ${setupBlock}
      ${reportFooterHtml()}
    </section>
  `;

  return buildReportDocument(title, bodyHtml, filename);
}

import type { Bracket, BracketMatch } from '../../../utils/bracketEngine/types';
import type { BracketsReport } from '../../../api/side-actions';
import { displayBracketNumber } from '../../../utils/bracketDisplayNumber';
import {
  buildReportDocument,
  escapeHtml,
  withDirector,
  formatFilenameDate,
  reportSuggestedFilename,
  type ReportDocument,
} from '../../../utils/sideActionReportPrint';

/**
 * Letter portrait: 4 equal-size match trees per page (gaps between G1 pairs).
 * Slot math requires ≥10pt type with ~8px pad — 4/page fits; do not pack flush.
 */
export const BRACKETS_REPORT_POTS_PER_PAGE = 4;

/**
 * Default max pots per HTML/print document. Above this, require a pot range
 * (tuned from scale bench: full unchunked preview risks Chrome hangs).
 */
export const BRACKETS_REPORT_DEFAULT_CHUNK_POTS = 100;

/** Soft gate: force range UI when total pots exceed this. */
export const BRACKETS_REPORT_UNCHUNKED_MAX_POTS = 100;

export type BracketsReportDocumentOptions = {
  /** 1-based inclusive pot number start (defaults to 1). */
  potFrom?: number;
  /** 1-based inclusive pot number end (defaults to last pot). */
  potTo?: number;
};

type PlacePrize = 'first' | 'second' | 'split' | null;

function formatMoney(amount: number): string {
  return `$${Number(amount || 0).toFixed(0)}`;
}

function chunkPots<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages.length ? pages : [[]];
}

function nameFor(
  userId: number | null | undefined,
  names: Record<number, string>
): string {
  if (userId == null) return '—';
  return names[userId] || names[Number(userId)] || `User ${userId}`;
}

function scoreFor(value: string | undefined): string {
  return (value || '').trim();
}

function matchIsResolved(match: BracketMatch | undefined): boolean {
  if (!match?.p1 || !match?.p2) return false;
  if (match.winner != null) return true;
  if (match.tie) return true;
  return Boolean(scoreFor(match.s1) && scoreFor(match.s2));
}

function potIsComplete(bracket: Bracket): boolean {
  const finalMatch = bracket.rounds?.[2]?.matches?.[0];
  return matchIsResolved(finalMatch);
}

function prizesForPot(
  bracket: Bracket,
  report: BracketsReport
): { first: number; second: number } {
  const seated = (bracket.seating || []).filter((s) => s != null).length;
  const fullSlots = 8;
  if (seated > 0 && seated < fullSlots) {
    return {
      first: Number(report.bye_payouts?.first ?? report.payouts?.first ?? 0),
      second: Number(report.bye_payouts?.second ?? report.payouts?.second ?? 0),
    };
  }
  return {
    first: Number(report.payouts?.first ?? 0),
    second: Number(report.payouts?.second ?? 0),
  };
}

function placeForUid(
  match: BracketMatch | undefined,
  userId: number | null | undefined,
  potComplete: boolean
): PlacePrize {
  if (!potComplete || !match || userId == null || !matchIsResolved(match)) return null;
  if (match.tie) return 'split';
  if (match.winner != null && Number(match.winner) === Number(userId)) return 'first';
  if (
    match.winner != null &&
    (Number(match.p1) === Number(userId) || Number(match.p2) === Number(userId))
  ) {
    return 'second';
  }
  // Scores present but winner not stamped — compare as numbers when possible
  const s1 = Number(scoreFor(match.s1));
  const s2 = Number(scoreFor(match.s2));
  if (!Number.isFinite(s1) || !Number.isFinite(s2) || s1 === s2) return null;
  const isP1 = Number(match.p1) === Number(userId);
  const isP2 = Number(match.p2) === Number(userId);
  if (!isP1 && !isP2) return null;
  const won = isP1 ? s1 > s2 : s2 > s1;
  return won ? 'first' : 'second';
}

function matchSlot(
  match: BracketMatch | undefined,
  side: 1 | 2,
  names: Record<number, string>,
  opts: {
    potComplete: boolean;
    isFinal: boolean;
    prizes: { first: number; second: number };
  }
): {
  name: string;
  score: string;
  prize: string;
  winner: boolean;
  empty: boolean;
} {
  if (!match) {
    return { name: '—', score: '', prize: '', winner: false, empty: true };
  }
  const uid = side === 1 ? match.p1 : match.p2;
  const score = side === 1 ? match.s1 : match.s2;
  const empty = uid == null;
  const place = opts.isFinal
    ? placeForUid(match, uid, opts.potComplete)
    : null;
  let prize = '';
  if (place === 'first') prize = formatMoney(opts.prizes.first);
  else if (place === 'second') prize = formatMoney(opts.prizes.second);
  else if (place === 'split') {
    prize = formatMoney((opts.prizes.first + opts.prizes.second) / 2);
  }
  const winner =
    !empty &&
    ((match.winner != null && Number(match.winner) === Number(uid)) ||
      Boolean(match.tie));
  return {
    name: empty ? 'TBD' : nameFor(uid, names),
    score: scoreFor(score),
    prize,
    winner,
    empty,
  };
}

function renderMatch(
  match: BracketMatch | undefined,
  names: Record<number, string>,
  opts: {
    potComplete: boolean;
    isFinal: boolean;
    prizes: { first: number; second: number };
  }
): string {
  const a = matchSlot(match, 1, names, opts);
  const b = matchSlot(match, 2, names, opts);
  const slot = (s: typeof a) => `
    <div class="bp-slot${s.winner ? ' is-winner' : ''}${s.empty ? ' is-empty' : ''}">
      <span class="bp-left">
        <span class="bp-name">${escapeHtml(s.name)}</span>
        ${s.prize ? `<span class="bp-prize">${escapeHtml(s.prize)}</span>` : ''}
      </span>
      <span class="bp-score">${escapeHtml(s.score)}</span>
    </div>`;
  return `<div class="bp-match">${slot(a)}${slot(b)}</div>`;
}

function renderPot(
  bracket: Bracket,
  names: Record<number, string>,
  report: BracketsReport
): string {
  const g1 = bracket.rounds?.[0]?.matches ?? [];
  const g2 = bracket.rounds?.[1]?.matches ?? [];
  const finals = bracket.rounds?.[2]?.matches ?? [];
  const number = displayBracketNumber(
    bracket,
    Number(report.bracket_number_offset ?? 0)
  );
  const complete = potIsComplete(bracket);
  const prizes = prizesForPot(bracket, report);
  const baseOpts = { potComplete: complete, isFinal: false, prizes };
  const finalOpts = { ...baseOpts, isFinal: true };
  const games = report.game_numbers || [];
  const g1Label = games[0] != null ? `G1 · Game ${games[0]}` : 'G1';
  const g2Label = games[1] != null ? `G2 · Game ${games[1]}` : 'G2';
  const finalLabel = games[2] != null ? `Final · Game ${games[2]}` : 'Final';

  return `
    <article class="bracket-pot${complete ? ' is-complete' : ''}">
      <h2 class="bracket-pot-title">Bracket ${number}</h2>
      <div class="bracket-pot-tree">
        <div class="bp-headers" aria-hidden="true">
          <div class="bp-col-label">${escapeHtml(g1Label)}</div>
          <div class="bp-col-label">${escapeHtml(g2Label)}</div>
          <div class="bp-col-label">${escapeHtml(finalLabel)}</div>
        </div>
        <div class="bp-body">
          <div class="bp-col bp-col-g1">
            ${[0, 1, 2, 3].map((i) => renderMatch(g1[i], names, baseOpts)).join('')}
          </div>
          <div class="bp-col bp-col-g2">
            ${renderMatch(g2[0], names, baseOpts)}
            ${renderMatch(g2[1], names, baseOpts)}
          </div>
          <div class="bp-col bp-col-final">
            ${renderMatch(finals[0], names, finalOpts)}
          </div>
        </div>
      </div>
    </article>`;
}

export function buildBracketsReportDocument(
  report: BracketsReport,
  options?: BracketsReportDocumentOptions
): ReportDocument {
  const gamesLabel = report.game_numbers.length
    ? `Games ${report.game_numbers.join(' → ')}`
    : null;
  const payloadPots = (report.brackets || []) as Bracket[];
  const totalKnown = Math.max(
    report.bracket_count || 0,
    payloadPots.length
  );
  // Server already sliced when pot_from/pot_to are present on the payload.
  const serverSliced =
    report.pot_from != null &&
    report.pot_to != null &&
    payloadPots.length <= BRACKETS_REPORT_DEFAULT_CHUNK_POTS + 1;

  let from: number;
  let to: number;
  let pots: Bracket[];
  if (serverSliced) {
    from = Math.max(1, Number(report.pot_from));
    to = Math.max(from, Number(report.pot_to));
    pots = payloadPots;
  } else {
    from = Math.max(1, Math.min(options?.potFrom ?? 1, Math.max(totalKnown, 1)));
    to = Math.max(
      from,
      Math.min(options?.potTo ?? totalKnown, Math.max(totalKnown, 1))
    );
    pots = payloadPots.slice(from - 1, to);
  }
  const rangeLabel =
    totalKnown > 0 && (from > 1 || to < totalKnown)
      ? `pots_${from}-${to}`
      : null;

  const title = `Brackets — ${report.side_action_name} — ${report.squad_name}`;
  const filename = reportSuggestedFilename(
    'brackets',
    report.side_action_name,
    report.squad_name,
    rangeLabel,
    gamesLabel,
    formatFilenameDate()
  );

  const names: Record<number, string> = {};
  for (const [key, value] of Object.entries(report.user_display_names || {})) {
    const uid = Number(key);
    if (Number.isFinite(uid) && value) names[uid] = String(value);
  }

  const pages = chunkPots(pots, BRACKETS_REPORT_POTS_PER_PAGE);
  const pageCount = pages.length;

  const pagesHtml = pages
    .map((pagePots, pageIndex) => {
      const potsHtml =
        pagePots.length === 0
          ? `<p class="report-note">No brackets to print.</p>`
          : pagePots.map((pot) => renderPot(pot, names, report)).join('');
      return `
      <section class="brackets-page">
        <header class="brackets-report-header">
          <div class="brackets-report-title-row">
            <h1 class="report-title">Brackets Report</h1>
            <span class="brackets-sa-name">${escapeHtml(report.side_action_name)}</span>
            <span class="brackets-sa-name">${escapeHtml(report.squad_name)} · Pool ${report.pool_id}</span>
            <span class="brackets-count">Total brackets: ${report.bracket_count}</span>
            ${
              rangeLabel
                ? `<span class="brackets-count">Showing ${from}–${to}</span>`
                : ''
            }
            <span class="report-meta">Page ${pageIndex + 1}/${pageCount}</span>
          </div>
          <div class="brackets-report-context">
            <span class="brackets-event">${escapeHtml(report.event_name)}</span>
            <span class="brackets-context-sep">·</span>
            <span class="brackets-tournament">${escapeHtml(withDirector(report.tournament_name, report.director_name))}</span>
            ${gamesLabel ? `<span class="brackets-context-sep">·</span><span>${escapeHtml(gamesLabel)}</span>` : ''}
          </div>
        </header>
        <div class="brackets-page-pots">
          ${potsHtml}
        </div>
      </section>`;
    })
    .join('');

  return buildReportDocument(title, pagesHtml, filename, {
    bodyClass: 'brackets-doc',
    // Compact margins without Chrome named-page (page: xxx) crashes on large PDFs.
    pageMargin: '0.28in 0.38in 0.25in',
  });
}

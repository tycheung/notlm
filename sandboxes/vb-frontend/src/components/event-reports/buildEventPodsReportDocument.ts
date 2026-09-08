import type { PodsMembershipPreviewPod } from '../../utils/podsScoringGroups';
import {
  buildReportDocument,
  escapeHtml,
  formatDateOnly,
  reportFooterHtml,
  reportSuggestedFilename,
  type ReportDocument,
} from '../../utils/sideActionReportPrint';

export interface EventPodsReportInput {
  pods: PodsMembershipPreviewPod[];
  isTeamEvent: boolean;
  podSizeMin?: number | null;
  podSizeMax?: number | null;
  balanceMode?: string | null;
  tournamentName?: string | null;
  eventName?: string | null;
  roundName?: string | null;
}

function unitLabel(isTeamEvent: boolean, count: number): string {
  const singular = isTeamEvent ? 'team' : 'bowler';
  return count === 1 ? singular : `${singular}s`;
}

function podSizeSubtitle(min?: number | null, max?: number | null): string | null {
  const lo = Number(min);
  const hi = Number(max);
  if (Number.isFinite(lo) && lo > 0 && Number.isFinite(hi) && hi > 0) {
    if (lo === hi) return `Pod size ${lo}`;
    return `Pod size ${lo}–${hi}`;
  }
  return null;
}

function balanceSubtitle(mode?: string | null): string | null {
  const raw = String(mode ?? '').trim();
  if (!raw) return null;
  return raw.replace(/_/g, ' ');
}

function podSectionHtml(pod: PodsMembershipPreviewPod, isTeamEvent: boolean): string {
  const count = pod.seeds.length;
  const unit = unitLabel(isTeamEvent, count);
  const title = `Pod ${pod.podIndex + 1}`;
  const meta = `${count} ${unit} · top ${pod.advanceCount} advance`;
  const rows = pod.members
    .map((member) => {
      const name = member.resolved
        ? member.name
        : `Seed ${member.seed} (not on roster)`;
      const unresolvedClass = member.resolved ? '' : ' ep-unresolved';
      return `<tr>
        <td class="ep-seed">${escapeHtml(String(member.seed))}</td>
        <td class="ep-name${unresolvedClass}">${escapeHtml(name)}</td>
      </tr>`;
    })
    .join('');

  return `<section class="ep-pod">
    <h2 class="ep-pod-title">${escapeHtml(title)}<span class="ep-pod-meta">${escapeHtml(meta)}</span></h2>
    <table class="ep-roster">
      <thead>
        <tr>
          <th class="ep-seed">Seed</th>
          <th class="ep-name">Name</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

const REPORT_CSS = `
  body.event-pods-doc { padding: 8px 10px; }
  body.event-pods-doc .report-header { margin-bottom: 10px; padding-bottom: 6px; }
  body.event-pods-doc .report-title { font-size: 14pt; }
  body.event-pods-doc .report-subtitle { font-size: 9pt; }
  body.event-pods-doc .report-meta { font-size: 8.5pt; }
  body.event-pods-doc .report-footer { margin-top: 10px; padding-top: 6px; }
  body.event-pods-doc .report-footer svg { height: 12px; }
  .ep-summary {
    margin: 0 0 12px;
    font-size: 9pt;
    color: #4b5563;
    line-height: 1.4;
  }
  .ep-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 16px;
  }
  .ep-pod {
    break-inside: avoid;
    page-break-inside: avoid;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 8px 10px;
    background: #fff;
  }
  .ep-pod-title {
    margin: 0 0 6px;
    font-size: 10pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #1e3a5f;
    line-height: 1.25;
  }
  .ep-pod-meta {
    display: block;
    margin-top: 2px;
    font-size: 8pt;
    font-weight: 600;
    text-transform: none;
    letter-spacing: normal;
    color: #c2410c;
  }
  .ep-roster {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
  }
  .ep-roster th,
  .ep-roster td {
    border-bottom: 1px solid #e5e7eb;
    padding: 4px 6px;
    text-align: left;
    vertical-align: top;
  }
  .ep-roster th {
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6b7280;
    border-bottom-color: #cbd5e1;
  }
  .ep-roster tbody tr:last-child td { border-bottom: none; }
  .ep-seed {
    width: 3.5em;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    color: #c2410c;
  }
  .ep-name { font-weight: 500; }
  .ep-unresolved { color: #9ca3af; font-style: italic; font-weight: 400; }
  .ep-empty { color: #4b5563; font-style: italic; padding: 12px 0; }
  .ep-note {
    margin: 10px 0 0;
    font-size: 8pt;
    color: #6b7280;
    font-style: italic;
  }
  @media print {
    body.event-pods-doc { padding: 0; }
    .ep-grid { gap: 10px 12px; }
  }
  @media (max-width: 640px) {
    .ep-grid { grid-template-columns: 1fr; }
  }
`;

export function buildEventPodsReportDocument(input: EventPodsReportInput): ReportDocument {
  const pods = input.pods || [];
  const totalEntrants = pods.reduce((sum, pod) => sum + pod.seeds.length, 0);
  const unit = unitLabel(input.isTeamEvent, totalEntrants);

  const title = 'Pods';
  const filename = reportSuggestedFilename(
    'pods',
    input.tournamentName,
    input.eventName,
    input.roundName
  );

  const fieldLine = [
    pods.length ? `${pods.length} pod${pods.length === 1 ? '' : 's'}` : null,
    totalEntrants ? `${totalEntrants} ${unit}` : null,
    podSizeSubtitle(input.podSizeMin, input.podSizeMax),
    balanceSubtitle(input.balanceMode),
  ]
    .filter(Boolean)
    .join(' · ');

  const subtitleParts = [
    input.tournamentName,
    input.eventName,
    input.roundName,
    fieldLine || null,
  ].filter(Boolean);

  const body =
    pods.length === 0
      ? `<p class="ep-empty">No pod rosters yet. Generate pods on the Format Editor first.</p>`
      : `<p class="ep-summary">Simultaneous pinfall within each pod — top finishers advance by total pins, not head-to-head match play.</p>
         <div class="ep-grid">${pods.map((pod) => podSectionHtml(pod, input.isTeamEvent)).join('')}</div>
         <p class="ep-note">Seed order reflects pod assignment. Scores are entered on the Game Scoring tab.</p>`;

  const bodyHtml = `
    <header class="report-header">
      <div>
        <h1 class="report-title">${escapeHtml(title)}</h1>
        <div class="report-subtitle">${escapeHtml(subtitleParts.join(' · '))}</div>
      </div>
      <div class="report-meta">${escapeHtml(formatDateOnly())}</div>
    </header>
    ${body}
    ${reportFooterHtml()}
    <style>${REPORT_CSS}</style>
  `;

  const landscape = pods.length > 8;

  return buildReportDocument(title, bodyHtml, filename, {
    pageSize: landscape ? 'letter landscape' : 'letter portrait',
    pageMargin: '0.45in',
    bodyClass: 'event-pods-doc',
  });
}

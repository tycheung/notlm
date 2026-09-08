import type { MatchSeriesRead } from '../../api/round-match-series';
import type { EventTeamRead } from '../../types/event_team';
import { winsBadge } from '../match-play-diagram/adapters/helpers';
import type {
  DiagramColumn,
  DiagramMatch,
  DiagramParticipant,
  DiagramSection,
  TournamentDiagramModel,
} from '../match-play-diagram/adapters/types';
import {
  buildEventBracketDiagramModel,
  fieldSizeFromModel,
  stripUnscoredBoxes,
  type EventBracketMode,
} from '../event/formatEditor/eventBracketDiagram';
import {
  buildReportDocument,
  escapeHtml,
  formatDateOnly,
  reportFooterHtml,
  reportSuggestedFilename,
  type ReportDocument,
} from '../../utils/sideActionReportPrint';

export interface EventBracketReportInput {
  matchSeries: MatchSeriesRead[];
  isTeamEvent: boolean;
  bracketMode?: EventBracketMode | null;
  teams?: EventTeamRead[];
  participants?: Array<{ event_participant_id: number; user_name?: string | null }>;
  tournamentName?: string | null;
  eventName?: string | null;
  roundName?: string | null;
}

type PrintLayout = {
  matchH: number;
  gap: number;
  headerH: number;
  connectorW: number;
  colW: number;
  fontPt: number;
};

type LineSegment = { x1: number; y1: number; x2: number; y2: number };

function printLayout(openingMatches: number): PrintLayout {
  if (openingMatches <= 2) {
    return { matchH: 90, gap: 22, headerH: 22, connectorW: 36, colW: 220, fontPt: 10 };
  }
  if (openingMatches <= 4) {
    return { matchH: 80, gap: 18, headerH: 20, connectorW: 32, colW: 200, fontPt: 9.5 };
  }
  if (openingMatches <= 8) {
    return { matchH: 72, gap: 14, headerH: 20, connectorW: 28, colW: 190, fontPt: 9 };
  }
  if (openingMatches <= 16) {
    return { matchH: 40, gap: 6, headerH: 16, connectorW: 18, colW: 148, fontPt: 7.5 };
  }
  return { matchH: 26, gap: 3, headerH: 14, connectorW: 12, colW: 118, fontPt: 6.5 };
}

function matchTop(index: number, layout: PrintLayout): number {
  return layout.headerH + index * (layout.matchH + layout.gap);
}

function centerFromTop(top: number, layout: PrintLayout): number {
  return top + layout.matchH / 2;
}

function computeNextRoundTops(prevTops: number[], layout: PrintLayout): number[] {
  if (prevTops.length === 0) return [];
  const nextCount = Math.ceil(prevTops.length / 2);
  return Array.from({ length: nextCount }, (_, index) => {
    const a = prevTops[index * 2];
    const b = prevTops[index * 2 + 1];
    if (a == null) return matchTop(0, layout);
    if (b == null) return a;
    return (centerFromTop(a, layout) + centerFromTop(b, layout)) / 2 - layout.matchH / 2;
  });
}

function buildConnectorLinesFromTops(
  sourceTops: number[],
  targetTops: number[],
  layout: PrintLayout
): LineSegment[] {
  const lines: LineSegment[] = [];
  const midX = layout.connectorW / 2;
  for (let index = 0; index < targetTops.length; index++) {
    const a = sourceTops[index * 2];
    const b = sourceTops[index * 2 + 1];
    const yOut = centerFromTop(targetTops[index], layout);
    if (a != null && b != null) {
      const yA = centerFromTop(a, layout);
      const yB = centerFromTop(b, layout);
      lines.push(
        { x1: 0, y1: yA, x2: midX, y2: yA },
        { x1: 0, y1: yB, x2: midX, y2: yB },
        { x1: midX, y1: yA, x2: midX, y2: yB },
        { x1: midX, y1: yOut, x2: layout.connectorW, y2: yOut }
      );
    } else if (a != null) {
      const y = centerFromTop(a, layout);
      lines.push({ x1: 0, y1: y, x2: layout.connectorW, y2: y });
    } else {
      lines.push({ x1: 0, y1: yOut, x2: layout.connectorW, y2: yOut });
    }
  }
  return lines;
}

function canvasHeight(openingMatches: number, layout: PrintLayout): number {
  const count = Math.max(openingMatches, 1);
  return layout.headerH + count * layout.matchH + (count - 1) * layout.gap;
}

function columnPositions(columns: DiagramColumn[], layout: PrintLayout): number[][] {
  let prevTops: number[] = [];
  return columns.map((col, colIndex) => {
    if (colIndex === 0) {
      prevTops = col.matches.map((_, index) => matchTop(index, layout));
      return prevTops;
    }
    prevTops = computeNextRoundTops(prevTops, layout);
    return prevTops;
  });
}

function scoreHtml(participant: DiagramParticipant): string {
  const scores = (participant.scores || []).filter((s) => s.score != null);
  if (scores.length === 0) {
    return '<span class="eb-score eb-score-empty">—</span>';
  }
  return scores
    .map((s) => `<span class="eb-score">${escapeHtml(String(s.score))}</span>`)
    .join('');
}

function sideHtml(participant: DiagramParticipant): string {
  const classes = ['eb-side'];
  if (participant.isWinner) classes.push('eb-winner');
  if (participant.isTbd) classes.push('eb-tbd');
  const name = participant.isTbd ? 'TBD' : participant.name || 'TBD';
  return `<div class="${classes.join(' ')}">
    <span class="eb-name">${escapeHtml(name)}</span>
    ${scoreHtml(participant)}
  </div>`;
}

function matchHtml(match: DiagramMatch, top: number, layout: PrintLayout): string {
  const cleaned = stripUnscoredBoxes(match);
  const wins = winsBadge(cleaned.winsSide0, cleaned.winsSide1, cleaned.raceToWins);
  const status = (cleaned.status || '').toLowerCase();
  const showStatus = status && status !== 'pending';
  const headBits = [
    cleaned.label ? `<span class="eb-label">${escapeHtml(cleaned.label)}</span>` : '',
    showStatus ? `<span class="eb-status">${escapeHtml(cleaned.status)}</span>` : '',
    wins ? `<span class="eb-wins">${escapeHtml(wins)}</span>` : '',
  ]
    .filter(Boolean)
    .join('');
  return `<div class="eb-match" style="top:${top}px;height:${layout.matchH}px">
    ${headBits ? `<div class="eb-match-head">${headBits}</div>` : ''}
    ${sideHtml(cleaned.participants[0])}
    ${sideHtml(cleaned.participants[1])}
  </div>`;
}

function svgLines(lines: LineSegment[], width: number, height: number): string {
  const paths = lines
    .map(
      (line) =>
        `<line x1="${line.x1}" y1="${line.y1}" x2="${line.x2}" y2="${line.y2}" />`
    )
    .join('');
  return `<svg class="eb-connectors" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">${paths}</svg>`;
}

function sectionCanvasHtml(section: DiagramSection, layout: PrintLayout): string {
  const columns = section.columns;
  const opening = columns[0]?.matches.length ?? 1;
  const height = canvasHeight(opening, layout);
  const width =
    columns.length * layout.colW + Math.max(0, columns.length - 1) * layout.connectorW;
  const positions = columnPositions(columns, layout);

  let x = 0;
  const parts: string[] = [];
  columns.forEach((col, colIndex) => {
    if (colIndex > 0) {
      const lines = buildConnectorLinesFromTops(
        positions[colIndex - 1] || [],
        positions[colIndex] || [],
        layout
      );
      parts.push(
        `<div class="eb-connector-col" style="left:${x}px;width:${layout.connectorW}px;height:${height}px">${svgLines(lines, layout.connectorW, height)}</div>`
      );
      x += layout.connectorW;
    }
    const matches = col.matches
      .map((match, index) => matchHtml(match, positions[colIndex]?.[index] ?? 0, layout))
      .join('');
    parts.push(
      `<div class="eb-col" style="left:${x}px;width:${layout.colW}px;height:${height}px">
        <div class="eb-col-header">${escapeHtml(col.header)}</div>
        ${matches}
      </div>`
    );
    x += layout.colW;
  });

  const fitW = 960;
  const fitH = 610;
  const scale = Math.min(fitW / Math.max(width, 1), fitH / Math.max(height, 1), 1);
  const scaledW = Math.round(width * scale);
  const scaledH = Math.round(height * scale);

  return `<div class="eb-fit" style="width:${scaledW}px;height:${scaledH}px;--eb-font:${layout.fontPt}pt">
    <div class="eb-canvas" style="width:${width}px;height:${height}px;transform:scale(${scale})">
      ${parts.join('')}
    </div>
  </div>`;
}

function diagramSections(model: TournamentDiagramModel): DiagramSection[] {
  if (model.sections?.length) return model.sections;
  return [{ key: 'main', label: model.title, columns: model.columns }];
}

function fieldSubtitle(
  model: TournamentDiagramModel,
  isDouble: boolean,
  isTeamEvent: boolean
): string | null {
  const fieldSize = fieldSizeFromModel(model);
  if (!fieldSize) return null;
  const unit = isTeamEvent ? 'team' : 'player';
  const mode = isDouble ? 'double' : 'single';
  return `${fieldSize}-${unit} ${mode} elimination`;
}

const REPORT_CSS = `
  body.event-bracket-doc { padding: 8px 10px; }
  body.event-bracket-doc .report-header { margin-bottom: 10px; padding-bottom: 6px; }
  body.event-bracket-doc .report-title { font-size: 14pt; }
  body.event-bracket-doc .report-subtitle { font-size: 9pt; }
  body.event-bracket-doc .report-meta { font-size: 8.5pt; }
  body.event-bracket-doc .report-footer { margin-top: 10px; padding-top: 6px; }
  body.event-bracket-doc .report-footer svg { height: 12px; }
  .eb-page { page-break-after: always; }
  .eb-page:last-child { page-break-after: auto; }
  .eb-section-title {
    margin: 0 0 8px;
    font-size: 10pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #1e3a5f;
  }
  .eb-empty { color: #4b5563; font-style: italic; padding: 12px 0; }
  .eb-fit { overflow: hidden; }
  .eb-canvas { position: relative; transform-origin: top left; }
  .eb-col, .eb-connector-col { position: absolute; top: 0; }
  .eb-col-header {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #c2410c;
  }
  .eb-connectors { display: block; }
  .eb-connectors line {
    stroke: #94a3b8;
    stroke-width: 1.25;
    fill: none;
  }
  .eb-match {
    position: absolute;
    left: 0;
    right: 4px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    font-size: var(--eb-font, 9pt);
  }
  .eb-match-head {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 7pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #6b7280;
    line-height: 1.1;
  }
  .eb-side {
    display: flex;
    align-items: center;
    gap: 4px;
    min-height: 0;
    border: 1px solid #d1d5db;
    border-radius: 3px;
    padding: 2px 5px;
    background: #fff;
    line-height: 1.15;
  }
  .eb-side.eb-winner {
    border-color: #86efac;
    background: #f0fdf4;
    font-weight: 700;
  }
  .eb-side.eb-tbd { color: #9ca3af; font-style: italic; }
  .eb-name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .eb-score {
    flex: 0 0 auto;
    min-width: 1.4em;
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }
  .eb-score-empty { color: #9ca3af; font-weight: 400; }
  @media print {
    body.event-bracket-doc { padding: 0; }
  }
`;

export function buildEventBracketReportDocument(
  input: EventBracketReportInput
): ReportDocument {
  const isDouble = input.bracketMode === 'double_elimination';
  const model = buildEventBracketDiagramModel(input);
  const sections = diagramSections(model);
  const fieldLine = fieldSubtitle(model, isDouble, input.isTeamEvent);
  const opening = sections[0]?.columns[0]?.matches.length ?? 0;
  const landscape = opening > 2;

  const title = 'Bracket';
  const filename = reportSuggestedFilename(
    'bracket',
    input.tournamentName,
    input.eventName,
    input.roundName
  );
  const subtitleParts = [
    input.tournamentName,
    input.eventName,
    input.roundName,
    fieldLine,
  ].filter(Boolean);

  const pages =
    input.matchSeries.length === 0
      ? `<p class="eb-empty">No bracket matches yet. Generate the bracket first.</p>`
      : sections
          .map((section) => {
            const layout = printLayout(section.columns[0]?.matches.length ?? 0);
            const heading =
              sections.length > 1
                ? `<h2 class="eb-section-title">${escapeHtml(section.label)}</h2>`
                : '';
            return `<section class="eb-page">${heading}${sectionCanvasHtml(section, layout)}</section>`;
          })
          .join('');

  const bodyHtml = `
    <header class="report-header">
      <div>
        <h1 class="report-title">${escapeHtml(title)}</h1>
        <div class="report-subtitle">${escapeHtml(subtitleParts.join(' · '))}</div>
      </div>
      <div class="report-meta">${escapeHtml(formatDateOnly())}</div>
    </header>
    ${pages}
    ${reportFooterHtml()}
    <style>${REPORT_CSS}</style>
  `;

  return buildReportDocument(title, bodyHtml, filename, {
    pageSize: landscape ? 'letter landscape' : 'letter portrait',
    pageMargin: '0.45in',
    bodyClass: 'event-bracket-doc',
  });
}

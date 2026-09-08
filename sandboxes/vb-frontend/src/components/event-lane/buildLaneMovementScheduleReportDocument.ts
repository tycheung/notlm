import type { LaneMovementConfig, LanePair } from '../../features/lanes/types';
import { buildLaneMovementGrid } from '../../features/lanes/laneMovementGrid';
import {
  densityCssVarsStyle,
  resolveLaneMovementGridDensity,
} from '../../features/lanes/laneMovementGridDensity';
import {
  buildReportDocument,
  escapeHtml,
  reportFooterHtml,
  reportSuggestedFilename,
  type ReportDocument,
} from '../../utils/sideActionReportPrint';

function movementModeLabel(movement: LaneMovementConfig): string {
  if (!movement.enabled || movement.mode === 'stay') return 'Stay (no movement)';
  switch (movement.mode) {
    case 'move_right':
      return 'Move right';
    case 'move_left':
      return 'Move left';
    case 'expand':
      return 'Left goes left / Right goes right';
    case 'staggered':
      return 'Staggered';
    case 'league':
      return movement.league_team_count
        ? `League (USBC-style, ${movement.league_team_count} teams)`
        : 'League (USBC-style)';
    default:
      return movement.mode;
  }
}

export function buildLaneMovementScheduleReportDocument(input: {
  pairs: LanePair[];
  gameCount: number;
  movement: LaneMovementConfig;
  eventLabel?: string | null;
  squadLabel?: string | null;
}): ReportDocument {
  const { lanes, games, grid } = buildLaneMovementGrid({
    pairs: input.pairs,
    gameCount: input.gameCount,
    movement: input.movement,
  });

  const density = resolveLaneMovementGridDensity(lanes.length, games.length);
  const varsStyle = densityCssVarsStyle(density.cssVars);

  const title = 'Lane Movement Schedule';
  const filename = reportSuggestedFilename(
    'lane_movement',
    input.squadLabel,
    input.eventLabel,
    `${input.gameCount}g`
  );

  const subtitleParts = [
    input.eventLabel,
    input.squadLabel,
    `${input.gameCount} game${input.gameCount === 1 ? '' : 's'}`,
    movementModeLabel(input.movement),
  ].filter(Boolean);

  const headerCells = lanes
    .map((lane) => `<th class="lane-col">${escapeHtml(String(lane))}</th>`)
    .join('');

  const bodyRows = games
    .map((game, gameIdx) => {
      const cells = grid[gameIdx]
        .map((startLane) => {
          const value = startLane == null ? '' : String(startLane);
          return `<td>${escapeHtml(value)}</td>`;
        })
        .join('');
      return `<tr><th class="game-col">${escapeHtml(String(game))}</th>${cells}</tr>`;
    })
    .join('');

  const emptyNote =
    lanes.length === 0
      ? `<p class="report-note">No pairs in play — set pairs before generating this schedule.</p>`
      : '';

  const table =
    lanes.length === 0
      ? ''
      : `
    <div class="lane-grid-wrap">
      <table class="report-table lane-movement-grid">
        <thead>
          <tr>
            <th class="game-col">Game</th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </div>`;

  const bodyHtml = `
    <div class="lane-movement-doc${density.compactChrome ? ' lane-movement-doc--compact' : ''}" style="${escapeHtml(varsStyle)}">
      <header class="report-header">
        <div>
          <h1 class="report-title">${escapeHtml(title)}</h1>
          <div class="report-subtitle">${escapeHtml(subtitleParts.join(' · '))}</div>
          <div class="report-doc-label">Lane movement grid</div>
        </div>
      </header>
      ${emptyNote}
      ${table}
      ${reportFooterHtml()}
    </div>
    <style>
      @page { size: letter landscape; margin: ${density.pageMargin}; }
      .lane-movement-doc {
        ${varsStyle};
      }
      .lane-movement-doc .report-title { font-size: var(--lm-title); }
      .lane-movement-doc .report-subtitle { font-size: var(--lm-subtitle); }
      .lane-movement-doc .report-doc-label { font-size: var(--lm-label); }
      .lane-movement-doc .report-header {
        padding-bottom: var(--lm-header-pad-b);
        margin-bottom: var(--lm-header-margin-b);
      }
      .lane-movement-doc .report-footer {
        margin-top: var(--lm-footer-margin-t);
        padding-top: var(--lm-footer-pad-t);
      }
      .lane-movement-doc .report-footer svg,
      .lane-movement-doc .report-footer img.report-logo-mark {
        height: var(--lm-footer-logo);
      }
      .lane-grid-wrap { overflow: visible; }
      table.lane-movement-grid {
        width: 100%;
        table-layout: fixed;
        font-size: var(--lm-font);
      }
      table.lane-movement-grid th,
      table.lane-movement-grid td {
        text-align: center;
        padding: var(--lm-pad-y) var(--lm-pad-x);
        min-width: 0;
        line-height: 1.15;
        overflow: hidden;
      }
      table.lane-movement-grid th.game-col,
      table.lane-movement-grid tbody th.game-col {
        text-align: left;
        font-weight: 700;
        width: var(--lm-game-w);
        background: #f8fafc;
      }
      table.lane-movement-grid thead th.lane-col {
        font-weight: 700;
      }
    </style>
  `;

  return buildReportDocument(title, bodyHtml, filename, {
    pageMargin: density.pageMargin,
  });
}

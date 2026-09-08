import type { LaneMovementConfig, LanePair } from '../../features/lanes/types';
import {
  buildLaneAssignmentPreview,
  collectLaneAssignmentPreviewUnits,
  type LaneAssignmentPreview,
} from '../../features/lanes/buildLaneAssignmentPreview';
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

export function buildAssignmentPreviewFromRows(input: {
  pairs: LanePair[];
  gameCount: number;
  movement: LaneMovementConfig;
  rows: Array<{
    squad_participant_id: number;
    display_name: string;
    assigned_lane: number | null;
    team_id?: number | null;
  }>;
  positionRound?: {
    game: number;
    placement: string;
    teamCount: number;
    roundId?: number | null;
  } | null;
}): LaneAssignmentPreview {
  const { units, unassignedCount } = collectLaneAssignmentPreviewUnits(input.rows);
  return buildLaneAssignmentPreview({
    pairs: input.pairs,
    gameCount: input.gameCount,
    movement: input.movement,
    units,
    unassignedCount,
    positionRound: input.positionRound ?? null,
  });
}

export function buildLaneAssignmentPreviewReportDocument(input: {
  preview: LaneAssignmentPreview;
  movement: LaneMovementConfig;
  eventLabel?: string | null;
  squadLabel?: string | null;
  view?: 'by_lane' | 'by_team';
}): ReportDocument {
  const preview = input.preview;
  const view = input.view ?? 'by_lane';
  const density = resolveLaneMovementGridDensity(
    view === 'by_lane' ? preview.lanes.length : preview.games.length,
    view === 'by_lane' ? preview.games.length : preview.byTeam.length
  );
  const varsStyle = densityCssVarsStyle(density.cssVars);

  const title = 'Lane Assignment Preview';
  const filename = reportSuggestedFilename(
    'lane_assignments',
    input.squadLabel,
    input.eventLabel,
    `${preview.games.length}g`
  );

  const subtitleParts = [
    input.eventLabel,
    input.squadLabel,
    `${preview.games.length} game${preview.games.length === 1 ? '' : 's'}`,
    `${preview.byTeam.length} seated`,
    preview.positionRoundGame
      ? `position round game ${preview.positionRoundGame}`
      : null,
    movementModeLabel(input.movement),
  ].filter(Boolean);

  const emptyNote =
    preview.byTeam.length === 0
      ? `<p class="report-note">No lane seats yet — assign teams before previewing.</p>`
      : preview.unassignedCount > 0
        ? `<p class="report-note">${escapeHtml(String(preview.unassignedCount))} team(s)/bowler(s) still unassigned.</p>`
        : '';

  let table = '';
  if (view === 'by_team') {
  const headerCells = preview.games
      .map((g) => {
        const label =
          preview.positionRoundGame === g ? `G${g}*` : `G${g}`;
        return `<th class="lane-col">${escapeHtml(label)}</th>`;
      })
      .join('');
    const bodyRows = preview.byTeam
      .map((row) => {
        const cells = row.lanesByGame
          .map((lane, idx) => {
            const isPos = preview.positionRoundGame === preview.games[idx];
            if (isPos) return `<td>pos</td>`;
            return `<td>${lane == null ? '' : escapeHtml(String(lane))}</td>`;
          })
          .join('');
        return `<tr><th class="game-col">${escapeHtml(row.label)}</th>${cells}</tr>`;
      })
      .join('');
    const posNote = preview.positionRoundGame
      ? `<p class="report-note">* Game ${escapeHtml(String(preview.positionRoundGame))} is a position round (standings places on lanes — see Games × lanes view).</p>`
      : '';
    table = `
    ${posNote}
    <div class="lane-grid-wrap">
      <table class="report-table lane-movement-grid">
        <thead>
          <tr>
            <th class="game-col">Team</th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>`;
  } else {
    const headerCells = preview.lanes
      .map((lane) => `<th class="lane-col">${escapeHtml(String(lane))}</th>`)
      .join('');
    const bodyRows = preview.games
      .map((game, gameIdx) => {
        const cells = preview.byLane[gameIdx]
          .map((cell) => {
            const value = cell.labels.join(', ');
            return `<td>${escapeHtml(value)}</td>`;
          })
          .join('');
        const gameLabel =
          preview.positionRoundGame === game
            ? `${game} (Position)`
            : String(game);
        return `<tr><th class="game-col">${escapeHtml(gameLabel)}</th>${cells}</tr>`;
      })
      .join('');
    table = `
    <div class="lane-grid-wrap">
      <table class="report-table lane-movement-grid">
        <thead>
          <tr>
            <th class="game-col">Game</th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>`;
  }

  const bodyHtml = `
    <div class="lane-movement-doc${density.compactChrome ? ' lane-movement-doc--compact' : ''}" style="${escapeHtml(varsStyle)}">
      <header class="report-header">
        <div>
          <h1 class="report-title">${escapeHtml(title)}</h1>
          <div class="report-subtitle">${escapeHtml(subtitleParts.join(' · '))}</div>
          <div class="report-doc-label">${
            view === 'by_team' ? 'Teams × games (lane numbers)' : 'Games × lanes (who bowls where)'
          }</div>
        </div>
      </header>
      ${emptyNote}
      ${table}
      ${reportFooterHtml()}
    </div>
    <style>
      @page { size: letter landscape; margin: ${density.pageMargin}; }
      .lane-movement-doc { ${varsStyle}; }
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
      .lane-movement-doc .report-footer img.report-logo-mark { height: var(--lm-footer-logo); }
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
        word-break: break-word;
      }
      table.lane-movement-grid th.game-col,
      table.lane-movement-grid tbody th.game-col {
        text-align: left;
        font-weight: 700;
        width: var(--lm-game-w);
        background: #f8fafc;
      }
      table.lane-movement-grid thead th.lane-col { font-weight: 700; }
      .report-note { font-size: 12px; color: #64748b; margin: 0 0 12px; }
    </style>
  `;

  return buildReportDocument(title, bodyHtml, filename, {
    pageMargin: density.pageMargin,
  });
}

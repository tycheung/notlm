import React from 'react';
import type {
  EventStandingsGameScore,
  EventStandingsMemberResults,
  EventStandingsReport,
  EventStandingsRow,
  EventStandingsSection,
  StepladderStandingsBlock,
  StepladderStandingsMatch,
  StepladderStandingsSide,
} from '../../api/event-reports';
import { cutLineAfterIndex } from '../../event-reports/standingsCutLine';
import { formatMoneyOrDash } from '../../../utils/sideActionReportPrint';

export interface EventStandingsBoardDisplayOptions {
  showTeamNames: boolean;
  showBowlerNames: boolean;
  includeGameScores: boolean;
  showIndividualTeamScores: boolean;
}

function formatScore(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

function bonusPinsFor(row: EventStandingsRow): number {
  return Number(row.bonus_pins ?? 0);
}

function handicapPinsFor(row: EventStandingsRow): number {
  if (row.handicap_pins != null) return Number(row.handicap_pins);
  return Number(row.score_handicap) - Number(row.score_scratch);
}

function totalWithBonusFor(row: EventStandingsRow): number {
  return Number(row.score_scratch) + bonusPinsFor(row);
}

function sectionShowsBonus(section: EventStandingsSection): boolean {
  if (section.includes_bonus) return true;
  return section.rows.some((row) => bonusPinsFor(row) > 0);
}

function placeLabel(row: EventStandingsRow): string {
  const label = (row.place_label || '').replace(/\s*Place\s*$/i, '').trim();
  if (row.standing_status === 'advance') return String(row.place);
  return label || String(row.place);
}

function sortedGames(games: EventStandingsGameScore[] | undefined): EventStandingsGameScore[] {
  return [...(games || [])].sort(
    (a, b) => Number(a.game_number) - Number(b.game_number)
  );
}

function IdentityCell({
  row,
  section,
  options,
}: {
  row: EventStandingsRow;
  section: EventStandingsSection;
  options: EventStandingsBoardDisplayOptions;
}) {
  const isTeam = section.event_format === 'teams' || row.is_team_row;
  if (!isTeam) {
    return <span>{row.display_name || row.bowlers?.[0]?.display_name || '—'}</span>;
  }

  const teamNumber = row.team_number != null ? `Team ${row.team_number}` : 'Team';
  const teamName = (row.team_name || row.display_name || teamNumber).trim();
  const bowlerNames = (row.bowlers || [])
    .map((b) => (b.display_name || '').trim())
    .filter(Boolean);

  if (!options.showTeamNames && !options.showBowlerNames) {
    return <span>{teamNumber}</span>;
  }

  return (
    <div className="min-w-0">
      {options.showTeamNames && (
        <div className="font-medium text-text truncate" title={teamName}>
          {teamName}
        </div>
      )}
      {!options.showTeamNames && options.showBowlerNames && (
        <div className="font-medium text-text">{teamNumber}</div>
      )}
      {options.showBowlerNames &&
        bowlerNames.map((name) => (
          <div key={name} className="text-xs text-primary truncate" title={name}>
            {name}
          </div>
        ))}
      {options.showBowlerNames && bowlerNames.length === 0 && (
        <div className="text-xs text-text-muted">—</div>
      )}
    </div>
  );
}

function gameScoreClassName(g: EventStandingsGameScore): string {
  if (g.dylg_dropped) return 'text-text-muted line-through opacity-70';
  if (g.dylg_candidate) return 'font-semibold text-amber-800';
  if (g.is_win) return 'font-semibold text-text';
  return 'text-text-muted';
}

function GameScoresLine({ games }: { games: EventStandingsGameScore[] }) {
  if (!games.length) return <span className="text-text-muted">—</span>;
  return (
    <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 tabular-nums text-xs">
      {games.map((g) => (
        <span key={g.game_number} className={gameScoreClassName(g)}>
          {formatScore(g.score_scratch)}
        </span>
      ))}
    </div>
  );
}

function ResultsCell({
  row,
  section,
  options,
}: {
  row: EventStandingsRow;
  section: EventStandingsSection;
  options: EventStandingsBoardDisplayOptions;
}) {
  const showMemberLines =
    options.showIndividualTeamScores &&
    !section.is_baker &&
    (section.event_format === 'teams' || row.is_team_row);

  if (showMemberLines && (row.member_results?.length ?? 0) > 0) {
    return (
      <div className="space-y-1">
        {(row.member_results as EventStandingsMemberResults[])
          .filter((m) => (m.display_name || '').trim() && (m.games || []).length)
          .map((m) => (
            <div key={m.display_name} className="flex flex-wrap items-baseline gap-2">
              <span className="text-[11px] text-text-muted shrink-0">{m.display_name}</span>
              <GameScoresLine games={sortedGames(m.games)} />
            </div>
          ))}
      </div>
    );
  }

  return <GameScoresLine games={sortedGames(row.games)} />;
}

function PrizeOrStatusCell({
  row,
  showPrizes,
}: {
  row: EventStandingsRow;
  showPrizes: boolean;
}) {
  if (row.standing_status === 'advance') {
    return <span className="font-semibold text-success">Advance</span>;
  }
  if (!showPrizes) return <span className="text-text-muted">—</span>;
  if (row.prize_amount != null) return <span>{formatMoneyOrDash(row.prize_amount)}</span>;
  return <span className="text-text-muted">—</span>;
}

function StepladderSideCard({ side }: { side: StepladderStandingsSide }) {
  if (side.is_tbd) {
    return (
      <div className="rounded-md border border-border/70 bg-surface px-2.5 py-2 text-sm text-text-muted">
        TBD
      </div>
    );
  }
  return (
    <div
      className={`rounded-md border px-2.5 py-2 ${
        side.is_winner
          ? 'border-success/60 bg-success/5 ring-1 ring-success/40'
          : 'border-border/70 bg-surface'
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-1.5">
        {side.seed != null && (
          <span className="text-[10px] font-semibold uppercase text-text-muted">#{side.seed}</span>
        )}
        <span className="text-sm font-medium text-text">{side.display_name || '—'}</span>
      </div>
      {side.qualifying_score != null && (
        <div className="mt-0.5 text-[11px] text-text-muted">
          Qual {formatScore(side.qualifying_score)}
        </div>
      )}
      {side.game_scores.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-1.5 text-xs tabular-nums text-text-muted">
          {side.game_scores.map((g, i) => (
            <span key={i}>{formatScore(g)}</span>
          ))}
        </div>
      ) : (
        <div className="mt-1 text-xs text-text-muted">—</div>
      )}
      {side.match_total != null && (
        <div className="mt-0.5 text-xs font-semibold tabular-nums">{formatScore(side.match_total)}</div>
      )}
      {side.prize_amount != null && (
        <div className="mt-1 text-[11px] text-text-muted">
          {side.place != null ? `${side.place} · ` : ''}
          {formatMoneyOrDash(side.prize_amount)}
        </div>
      )}
    </div>
  );
}

function StepladderMatchCard({ match }: { match: StepladderStandingsMatch }) {
  const sides = [...(match.sides || [])].sort((a, b) => a.side - b.side);
  const status = String(match.status || '').toLowerCase();
  const statusLabel =
    status === 'complete' ? 'Complete' : status === 'in_progress' ? 'Live' : 'Pending';
  return (
    <div className="min-w-[200px] shrink-0 rounded-lg border border-border bg-surface-light p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-primary">
          {match.match_label || 'Match'}
        </span>
        <span className="text-[11px] text-text-muted">{statusLabel}</span>
      </div>
      <div className="space-y-2">
        {sides.map((side, idx) => (
          <React.Fragment key={`${match.match_series_id}-${side.side}`}>
            {idx > 0 && (
              <div className="text-center text-[10px] font-semibold uppercase text-text-muted">
                vs
              </div>
            )}
            <StepladderSideCard side={side} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function StepladderBoard({ block }: { block: StepladderStandingsBlock }) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <h4 className="text-sm font-bold uppercase tracking-wide text-primary">
        {block.title || 'Stepladder'}
      </h4>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {(block.matches || []).map((m) => (
          <StepladderMatchCard key={m.match_series_id} match={m} />
        ))}
      </div>
      {block.champion_name && (
        <p className="text-sm text-text">
          Champion: <span className="font-semibold">{block.champion_name}</span>
          {block.champion_prize != null ? ` · ${formatMoneyOrDash(block.champion_prize)}` : ''}
        </p>
      )}
    </div>
  );
}

function StandingsSectionTable({
  section,
  report,
  options,
}: {
  section: EventStandingsSection;
  report: EventStandingsReport;
  options: EventStandingsBoardDisplayOptions;
}) {
  const showPrizes = report.include_prizes;
  const showStatusCol =
    showPrizes ||
    section.layout === 'stepladder_final' ||
    section.rows.some((r) => Boolean(r.standing_status));
  const statusHeader = showPrizes ? 'Prize' : 'Status';
  const showHandicap = report.include_handicap;
  const showBonus = sectionShowsBonus(section);
  const showGames = options.includeGameScores;
  const isTeam = section.event_format === 'teams';
  const nameHeader = isTeam ? 'Team / Bowlers' : 'Bowler';
  const sortHeader = showHandicap ? 'Tot' : 'Scr';
  const cutAfter = cutLineAfterIndex(
    section.rows,
    Boolean(report.show_cut_line),
    section.cut_line_after_index
  );

  if (section.note && section.rows.length === 0) {
    return <p className="text-sm text-text-muted">{section.note}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full text-sm">
        <thead className="bg-surface-light text-left text-xs uppercase tracking-wide text-text-muted">
          <tr>
            <th className="px-3 py-2 whitespace-nowrap">#</th>
            <th className="px-3 py-2 whitespace-nowrap">{sortHeader}</th>
            <th className="px-3 py-2 whitespace-nowrap">{nameHeader}</th>
            {showGames && <th className="px-3 py-2 whitespace-nowrap">Results</th>}
            <th className="px-3 py-2 whitespace-nowrap text-right">Scr</th>
            {showBonus && <th className="px-3 py-2 whitespace-nowrap text-right">Bonus</th>}
            {showHandicap && (
              <>
                <th className="px-3 py-2 whitespace-nowrap text-right">HCP</th>
                <th className="px-3 py-2 whitespace-nowrap text-right">Tot</th>
              </>
            )}
            {showBonus && <th className="px-3 py-2 whitespace-nowrap text-right">T+B</th>}
            {showStatusCol && (
              <th className="px-3 py-2 whitespace-nowrap text-right">{statusHeader}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {section.rows.length === 0 ? (
            <tr>
              <td
                colSpan={99}
                className="px-3 py-6 text-center text-sm text-text-muted"
              >
                No standings rows yet.
              </td>
            </tr>
          ) : (
            section.rows.flatMap((row, idx) => {
              const sortScore =
                row.sort_score != null
                  ? Number(row.sort_score)
                  : showHandicap
                    ? row.score_handicap
                    : row.score_scratch;
              const prevPod = idx > 0 ? section.rows[idx - 1]?.pod_index : undefined;
              const showPodHeader =
                section.layout === 'pods' &&
                row.pod_index != null &&
                row.pod_index !== prevPod;
              const tr = (
                <tr
                  key={`${row.place}-${row.team_id ?? row.event_participant_id ?? row.user_id ?? idx}`}
                  className={`border-t border-border/70 ${
                    row.standing_status === 'advance' ? 'bg-success/5' : ''
                  } ${(idx + 1) % 10 === 0 ? 'border-b border-border' : ''} ${
                    cutAfter === idx ? 'border-b-2 border-b-primary' : ''
                  }`}
                >
                  <td className="px-3 py-2 align-top tabular-nums font-medium">
                    {placeLabel(row)}
                  </td>
                  <td className="px-3 py-2 align-top tabular-nums font-semibold">
                    {formatScore(sortScore)}
                  </td>
                  <td className="px-3 py-2 align-top min-w-[10rem]">
                    <IdentityCell row={row} section={section} options={options} />
                  </td>
                  {showGames && (
                    <td className="px-3 py-2 align-top min-w-[8rem]">
                      <ResultsCell row={row} section={section} options={options} />
                    </td>
                  )}
                  <td className="px-3 py-2 align-top text-right tabular-nums">
                    {formatScore(row.score_scratch)}
                  </td>
                  {showBonus && (
                    <td className="px-3 py-2 align-top text-right tabular-nums">
                      {formatScore(bonusPinsFor(row))}
                    </td>
                  )}
                  {showHandicap && (
                    <>
                      <td className="px-3 py-2 align-top text-right tabular-nums">
                        {formatScore(handicapPinsFor(row))}
                      </td>
                      <td className="px-3 py-2 align-top text-right tabular-nums">
                        {formatScore(row.score_handicap)}
                      </td>
                    </>
                  )}
                  {showBonus && (
                    <td className="px-3 py-2 align-top text-right tabular-nums font-medium">
                      {formatScore(totalWithBonusFor(row))}
                    </td>
                  )}
                  {showStatusCol && (
                    <td className="px-3 py-2 align-top text-right">
                      <PrizeOrStatusCell row={row} showPrizes={showPrizes} />
                    </td>
                  )}
                </tr>
              );
              if (!showPodHeader) return [tr];
              return [
                <tr key={`pod-h-${row.pod_index}-${idx}`}>
                  <td
                    colSpan={99}
                    className="bg-surface-light px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-primary"
                  >
                    {row.pod_label || `Pod ${(row.pod_index ?? 0) + 1}`}
                  </td>
                </tr>,
                tr,
              ];
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export interface EventStandingsBoardProps {
  report: EventStandingsReport;
  options: EventStandingsBoardDisplayOptions;
}

const EventStandingsBoard: React.FC<EventStandingsBoardProps> = ({ report, options }) => {
  if (!report.sections?.length) {
    return (
      <p className="text-sm text-text-muted py-6 text-center">
        No standings sections for this selection yet.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {report.sections.map((section, idx) => (
        <section
          key={`${section.event_id}-${section.round_id ?? 'final'}-${section.squad_id ?? idx}`}
          className="space-y-3"
        >
          <div>
            <h3 className="text-base font-semibold text-text">
              {section.event_name}
              {section.squad_name ? ` · ${section.squad_name}` : ''}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {section.basis_label}
              {section.is_complete ? ' · Complete' : ' · In progress'}
              {section.feeder_basis_label ? ` · Feeder: ${section.feeder_basis_label}` : ''}
            </p>
            {section.note && section.rows.length > 0 && (
              <p className="text-xs text-text-muted mt-1">{section.note}</p>
            )}
          </div>
          {section.stepladder && <StepladderBoard block={section.stepladder} />}
          <StandingsSectionTable section={section} report={report} options={options} />
        </section>
      ))}
    </div>
  );
};

export default EventStandingsBoard;

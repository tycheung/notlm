import type {
  EventStandingsRow,
  EventStandingsSection,
} from '../../api/event-reports';

export interface StandingsIdentityOptions {
  showTeamNames: boolean;
  showBowlerNames: boolean;
}

export interface StandingsIdentityParts {
  isTeam: boolean;
  teamNumber: string;
  teamName: string;
  bowlerNames: string[];
}

export function standingsIdentityParts(
  row: EventStandingsRow,
  section: EventStandingsSection,
  options: StandingsIdentityOptions
): StandingsIdentityParts {
  const isTeam = section.event_format === 'teams' || row.is_team_row;
  const teamNumber = row.team_number != null ? `Team ${row.team_number}` : 'Team';
  const teamName = (row.team_name || row.display_name || teamNumber).trim();
  const bowlerNames = (row.bowlers || [])
    .map((b) => (b.display_name || '').trim())
    .filter(Boolean);
  return { isTeam, teamNumber, teamName, bowlerNames };
}

export function bowlersList(row: EventStandingsRow): string {
  return (row.bowlers || [])
    .map((b) => (b.display_name || '').trim())
    .filter(Boolean)
    .join(', ');
}

/** Plain-text name for CSV exports. */
export function standingsIdentityPlainText(
  row: EventStandingsRow,
  section: EventStandingsSection,
  options: StandingsIdentityOptions
): string {
  const { isTeam, teamNumber, teamName, bowlerNames } = standingsIdentityParts(
    row,
    section,
    options
  );
  if (!isTeam) {
    return row.display_name || row.bowlers?.[0]?.display_name || '';
  }
  const showTeam = options.showTeamNames;
  const showBowlers = options.showBowlerNames;
  if (!showTeam && !showBowlers) return teamNumber;
  if (showTeam && showBowlers) {
    return bowlerNames.length ? `${teamName} (${bowlerNames.join(', ')})` : teamName;
  }
  if (showTeam) return teamName;
  return bowlerNames.length ? bowlerNames.join(', ') : teamNumber;
}

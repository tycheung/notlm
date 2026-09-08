import type { TournamentRead } from '@/types/tournament';
import { Role } from '@/types/user';
import { getTournamentStatusInfo } from '@/utils/tournamentStatus';

export type TournamentManagementRow = TournamentRead & {
  centerName?: string;
  centerCity?: string;
  centerState?: string;
};

export type TournamentStatusFilter = 'all' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
export type TournamentSortField = 'name' | 'start_date' | 'end_date' | 'location' | 'status' | 'td';
export type TournamentSortDirection = 'asc' | 'desc';

export type FilterAndSortTournamentsInput = {
  tournaments: TournamentManagementRow[];
  searchTerm: string;
  statusFilter: TournamentStatusFilter;
  organizerFilter: string;
  sortField: TournamentSortField;
  sortDirection: TournamentSortDirection;
};

function toTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

export function tournamentOrganizerLabel(tournament: TournamentManagementRow): string {
  return (tournament.organizer_name || '').trim() || (tournament.organizer_id != null ? `User #${tournament.organizer_id}` : '');
}

export function uniqueTournamentOrganizerOptions(
  tournaments: TournamentManagementRow[]
): { value: string; label: string }[] {
  const byId = new Map<string, string>();
  for (const tournament of tournaments) {
    if (tournament.organizer_id == null) continue;
    const value = String(tournament.organizer_id);
    if (!byId.has(value)) {
      byId.set(value, tournamentOrganizerLabel(tournament) || `User #${tournament.organizer_id}`);
    }
  }
  return [...byId.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}

export function filterAndSortTournaments(input: FilterAndSortTournamentsInput): TournamentManagementRow[] {
  const { tournaments, searchTerm, statusFilter, organizerFilter, sortField, sortDirection } = input;
  const lowerSearch = searchTerm.trim().toLowerCase();
  let result = [...tournaments];

  if (lowerSearch) {
    result = result.filter((t) => {
      const statusInfo = getTournamentStatusInfo(t);
      const tdName = tournamentOrganizerLabel(t).toLowerCase();
      return (
        t.name.toLowerCase().includes(lowerSearch) ||
        (t.centerName || '').toLowerCase().includes(lowerSearch) ||
        `${t.centerCity || ''}, ${t.centerState || ''}`.toLowerCase().includes(lowerSearch) ||
        statusInfo.label.toLowerCase().includes(lowerSearch) ||
        tdName.includes(lowerSearch)
      );
    });
  }

  if (statusFilter !== 'all') {
    result = result.filter((t) => getTournamentStatusInfo(t).status === statusFilter);
  }

  if (organizerFilter !== 'all') {
    result = result.filter((t) => String(t.organizer_id ?? '') === organizerFilter);
  }

  result.sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    if (sortField === 'name') {
      return direction * a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    }
    if (sortField === 'start_date') {
      return direction * (toTimestamp(a.start_date) - toTimestamp(b.start_date));
    }
    if (sortField === 'end_date') {
      return direction * (toTimestamp(a.end_date) - toTimestamp(b.end_date));
    }
    if (sortField === 'location') {
      return direction * (a.centerName || '').localeCompare(b.centerName || '', undefined, {
        sensitivity: 'base',
      });
    }
    if (sortField === 'td') {
      return (
        direction *
        tournamentOrganizerLabel(a).localeCompare(tournamentOrganizerLabel(b), undefined, {
          sensitivity: 'base',
        })
      );
    }
    return (
      direction *
      getTournamentStatusInfo(a).label.localeCompare(getTournamentStatusInfo(b).label, undefined, {
        sensitivity: 'base',
      })
    );
  });

  return result;
}

export function getTournamentManagementPaths(
  userRole: Role | null | undefined,
  tournamentId: number
): { detailsPath: string; editPath: string } {
  if (userRole === Role.ADMIN) {
    return {
      detailsPath: `/admin/tournaments/${tournamentId}`,
      editPath: `/admin/tournaments/${tournamentId}/edit`,
    };
  }
  if (userRole === Role.TD) {
    return {
      detailsPath: `/director/tournaments/${tournamentId}`,
      editPath: `/director/tournaments/${tournamentId}/edit`,
    };
  }
  return {
    detailsPath: `/tournaments/${tournamentId}`,
    editPath: '',
  };
}

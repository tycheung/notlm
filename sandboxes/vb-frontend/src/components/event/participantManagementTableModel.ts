import { EventParticipantWithUser } from '../../types/event_participant';
import { parseNaiveDateTimeToTimestamp } from '../../utils/dateUtils';
import { buildTeamDisplayName } from '../../utils/teamDisplayName';
import type { SortDirection } from '../common/tableSort';

export interface TeamGroup {
  team_id: number;
  team_name: string;
  team_display_name: string;
  members: EventParticipantWithUser[];
  team_average?: number | null;
  payment_status: 'paid' | 'partial' | 'unpaid';
  members_paid: number;
  members_checked_in: number;
  members_approved: number;
  approval_status: 'approved' | 'partial' | 'pending';
  is_valid: boolean;
}

export interface ParticipantGroup {
  teams: TeamGroup[];
  individuals: EventParticipantWithUser[];
}

export type ParticipantSortColumn =
  | 'participant'
  | 'status'
  | 'qualifyingAverage'
  | 'amount'
  | 'checkIn'
  | 'signup';

export type RosterView = 'all' | 'pending' | 'roster';

export function filterParticipantsByRosterView(
  participants: EventParticipantWithUser[],
  rosterView: RosterView
): EventParticipantWithUser[] {
  const list = Array.isArray(participants) ? participants : [];
  if (rosterView === 'all') return list;
  if (rosterView === 'pending') return list.filter((p) => p.status === 'pending');
  return list.filter((p) => p.status === 'approved');
}

export function filterParticipantsBySearch(
  participants: EventParticipantWithUser[],
  searchQuery: string
): EventParticipantWithUser[] {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return participants;

  const matchingTeamIds = new Set<number>();
  const matchesParticipant = (participant: EventParticipantWithUser): boolean => {
    const fullName = participant.user_name?.toLowerCase() ?? '';
    const email = participant.user_email?.toLowerCase() ?? '';
    const usbcId = participant.user_usbc_id?.toLowerCase() ?? '';
    const teamName = participant.team_display_name?.toLowerCase() ?? '';
    return (
      fullName.includes(query) ||
      email.includes(query) ||
      usbcId.includes(query) ||
      teamName.includes(query)
    );
  };

  participants.forEach((participant) => {
    if (participant.team_id && matchesParticipant(participant)) {
      matchingTeamIds.add(participant.team_id);
    }
  });

  return participants.filter((participant) => {
    if (participant.team_id && matchingTeamIds.has(participant.team_id)) return true;
    return matchesParticipant(participant);
  });
}

const compareStrings = (a: string, b: string): number => a.localeCompare(b);

const parseStrictNumeric = (value: string): number | null => {
  const trimmed = value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const comparePossiblyNumericStrings = (a: string, b: string): number => {
  const aNum = parseStrictNumeric(a);
  const bNum = parseStrictNumeric(b);
  const aIsNumeric = aNum !== null;
  const bIsNumeric = bNum !== null;
  if (aIsNumeric && bIsNumeric) return aNum - bNum;
  if (aIsNumeric && !bIsNumeric) return -1;
  if (!aIsNumeric && bIsNumeric) return 1;
  return compareStrings(a, b);
};

const getTeamNumber = (teamDisplayName: string): number | null => {
  const maybeNumber = teamDisplayName.match(/Team (\d+)/)?.[1];
  if (!maybeNumber) return null;
  return parseInt(maybeNumber, 10);
};

function resolveTeamDisplayName(
  participant: EventParticipantWithUser,
  members: EventParticipantWithUser[] = []
): string {
  const fromApi = participant.team_display_name?.trim();
  if (fromApi) return fromApi;
  const roster = members.length ? members : [participant];
  return buildTeamDisplayName({
    teamName: participant.team_name,
    teamNumber: participant.team_number,
    memberLastNames: roster.map((member) => {
      const parts = (member.user_name || '').trim().split(/\s+/).filter(Boolean);
      return parts.length ? parts[parts.length - 1] : null;
    }),
  });
}

export const teamQualifyingAverage = (members: EventParticipantWithUser[]): number | null => {
  const nums = members
    .map((m) => m.qualifying_average)
    .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
};

export function compareParticipantsByColumn(
  left: EventParticipantWithUser,
  right: EventParticipantWithUser,
  column: ParticipantSortColumn
): number {
  switch (column) {
    case 'status': {
      const statusRank: Record<string, number> = { pending: 0, approved: 1, withdrawn: 2 };
      return (statusRank[left.status] ?? 99) - (statusRank[right.status] ?? 99);
    }
    case 'qualifyingAverage': {
      const lv = left.qualifying_average;
      const rv = right.qualifying_average;
      if (lv == null && rv == null) return 0;
      if (lv == null) return 1;
      if (rv == null) return -1;
      return lv - rv;
    }
    case 'amount': {
      return Number(left.paid_amount ?? 0) - Number(right.paid_amount ?? 0);
    }
    case 'checkIn': {
      return Number(left.checked_in) - Number(right.checked_in);
    }
    case 'signup': {
      return (
        parseNaiveDateTimeToTimestamp(left.registered_at) -
        parseNaiveDateTimeToTimestamp(right.registered_at)
      );
    }
    case 'participant':
    default:
      return compareStrings(left.user_name ?? '', right.user_name ?? '');
  }
}

export function compareTeamsByColumn(
  left: TeamGroup,
  right: TeamGroup,
  column: ParticipantSortColumn
): number {
  switch (column) {
    case 'status': {
      const statusRank: Record<TeamGroup['approval_status'], number> = {
        pending: 0,
        partial: 1,
        approved: 2,
      };
      return statusRank[left.approval_status] - statusRank[right.approval_status];
    }
    case 'qualifyingAverage': {
      const leftAvg = teamQualifyingAverage(left.members);
      const rightAvg = teamQualifyingAverage(right.members);
      if (leftAvg == null && rightAvg == null) return 0;
      if (leftAvg == null) return 1;
      if (rightAvg == null) return -1;
      return leftAvg - rightAvg;
    }
    case 'amount': {
      const paymentRank: Record<TeamGroup['payment_status'], number> = {
        unpaid: 0,
        partial: 1,
        paid: 2,
      };
      return paymentRank[left.payment_status] - paymentRank[right.payment_status];
    }
    case 'checkIn': {
      const leftRatio = left.members.length > 0 ? left.members_checked_in / left.members.length : 0;
      const rightRatio =
        right.members.length > 0 ? right.members_checked_in / right.members.length : 0;
      return leftRatio - rightRatio;
    }
    case 'signup': {
      if (left.members.length === 0 || right.members.length === 0) {
        return left.members.length - right.members.length;
      }
      const leftFirstSignup = Math.min(
        ...left.members.map((m) => parseNaiveDateTimeToTimestamp(m.registered_at))
      );
      const rightFirstSignup = Math.min(
        ...right.members.map((m) => parseNaiveDateTimeToTimestamp(m.registered_at))
      );
      return leftFirstSignup - rightFirstSignup;
    }
    case 'participant':
    default: {
      const leftNumber = getTeamNumber(left.team_display_name);
      const rightNumber = getTeamNumber(right.team_display_name);
      if (leftNumber != null && rightNumber != null) {
        return leftNumber - rightNumber;
      }
      return comparePossiblyNumericStrings(left.team_display_name, right.team_display_name);
    }
  }
}

export function buildParticipantGroups(input: {
  participants: EventParticipantWithUser[];
  entryFee: number;
  teamSize: number;
  sortColumn: ParticipantSortColumn;
  sortDirection: SortDirection;
}): ParticipantGroup {
  const { participants, entryFee, teamSize, sortColumn, sortDirection } = input;
  const teams: { [teamId: number]: TeamGroup } = {};
  const individuals: EventParticipantWithUser[] = [];

  participants.forEach((participant) => {
    if (participant.team_id) {
      const teamId = participant.team_id;
      if (!teams[teamId]) {
        teams[teamId] = {
          team_id: teamId,
          team_name: participant.team_name || '',
          team_display_name: resolveTeamDisplayName(participant),
          members: [],
          team_average: participant.team_average,
          payment_status: 'unpaid',
          members_paid: 0,
          members_checked_in: 0,
          members_approved: 0,
          approval_status: 'pending',
          is_valid: true,
        };
      }
      teams[teamId].members.push(participant);
      const paidAmount = participant.paid_amount || 0;
      if (entryFee === 0 || paidAmount >= entryFee) {
        teams[teamId].members_paid++;
      }
      if (participant.checked_in) {
        teams[teamId].members_checked_in++;
      }
    } else {
      individuals.push(participant);
    }
  });

  Object.values(teams).forEach((team) => {
    const apiName = team.members.find((m) => m.team_display_name?.trim())?.team_display_name;
    if (apiName?.trim()) {
      team.team_display_name = apiName.trim();
    } else {
      team.team_display_name = resolveTeamDisplayName(team.members[0], team.members);
    }
    if (!team.team_name) {
      team.team_name = team.members.find((m) => m.team_name)?.team_name || '';
    }
    const totalMembers = team.members.length;
    const paidMembers = team.members_paid;
    if (paidMembers === 0) {
      team.payment_status = 'unpaid';
    } else if (paidMembers === totalMembers) {
      team.payment_status = 'paid';
    } else {
      team.payment_status = 'partial';
    }
    const approvedMembers = team.members.filter((member) => member.status === 'approved').length;
    team.members_approved = approvedMembers;
    team.approval_status =
      approvedMembers === totalMembers
        ? 'approved'
        : approvedMembers === 0
          ? 'pending'
          : 'partial';
    team.is_valid = totalMembers >= teamSize;
  });

  const sortMultiplier = sortDirection === 'asc' ? 1 : -1;
  const sortedTeams = Object.values(teams).map((team) => ({
    ...team,
    members: [...team.members].sort(
      (a, b) => compareParticipantsByColumn(a, b, sortColumn) * sortMultiplier
    ),
  }));
  sortedTeams.sort((a, b) => {
    if (sortColumn === 'participant') {
      const aNum = parseStrictNumeric(a.team_display_name);
      const bNum = parseStrictNumeric(b.team_display_name);
      const aIsNumeric = aNum !== null;
      const bIsNumeric = bNum !== null;
      if (aIsNumeric && !bIsNumeric) return -1;
      if (!aIsNumeric && bIsNumeric) return 1;
    }
    return compareTeamsByColumn(a, b, sortColumn) * sortMultiplier;
  });

  return {
    teams: sortedTeams,
    individuals: [...individuals].sort(
      (a, b) => compareParticipantsByColumn(a, b, sortColumn) * sortMultiplier
    ),
  };
}

export function computeParticipantStats(
  participants: EventParticipantWithUser[],
  entryFee: number
): {
  total: number;
  approved: number;
  pending: number;
  withdrawn: number;
  paid: number;
  checkedIn: number;
} {
  const total = participants.length;
  const approved = participants.filter((p) => p.status === 'approved').length;
  const pending = participants.filter((p) => p.status === 'pending').length;
  const withdrawn = participants.filter((p) => p.status === 'withdrawn').length;
  const paid =
    entryFee === 0
      ? total
      : participants.filter((p) => (p.paid_amount || 0) >= entryFee).length;
  const checkedIn = participants.filter((p) => p.checked_in).length;
  return { total, approved, pending, withdrawn, paid, checkedIn };
}

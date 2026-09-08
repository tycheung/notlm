export type PlayerId = number;

/** Ticket purchase counts per bowler (user_id + count). */
export interface BracketEntryInput {
  user_id: PlayerId;
  count: number;
}

export interface BracketQuota {
  user_id: PlayerId;
  count: number;
  quota: number;
  unused: number;
}

export interface BracketMatch {
  id: string;
  p1: PlayerId | null;
  p2: PlayerId | null;
  s1: string;
  s2: string;
  winner: PlayerId | null;
  tie: boolean;
  p1b: PlayerId | null;
  s1b: string;
  p2b: PlayerId | null;
  s2b: string;
}

export interface BracketRound {
  matches: BracketMatch[];
}

export interface Bracket {
  id: number;
  seating: PlayerId[];
  rounds: BracketRound[];
  /** Event-wide display number when annotated by the API. */
  bracket_number?: number;
}

export interface MatchOutcome {
  winner: PlayerId | null;
  tie: boolean;
}

export interface BowlerBracketStats {
  entered: number;
  r1w: number;
  r1l: number;
  r2w: number;
  r2l: number;
  finals: number;
  first: number;
  second: number;
  split: number;
  reward: number;
}

export interface BracketPayouts {
  first: number;
  second: number;
}

export interface BracketFinancialSummary {
  total_collected: number;
  total_refunds: number;
  winnings: number;
  total_payout: number;
  fees: number;
  unplaced_entries: number;
  bracket_count: number;
}

export type UserDisplayNames = Record<number, string>;

export function displayNameForUserId(
  userId: PlayerId | null | undefined,
  names: UserDisplayNames
): string | null {
  if (userId == null) return null;
  return names[userId] ?? `User ${userId}`;
}

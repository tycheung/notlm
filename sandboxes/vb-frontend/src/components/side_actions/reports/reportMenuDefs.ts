import { SideActionType } from '../../../types/side_action';

export type SideActionReportKind =
  | 'signup_sheet'
  | 'entry_summary'
  | 'alive_list'
  | 'brackets'
  | 'individual_bracket'
  | 'payout'
  | 'high_game_entry_summary'
  | 'high_game'
  | 'high_set_entry_summary'
  | 'high_set'
  | 'eliminator_entry_summary'
  | 'eliminator'
  | 'mystery_doubles_entry_summary'
  | 'mystery_doubles'
  | 'mystery_game_entry_summary'
  | 'mystery_game'
  | 'love_doubles_entry_summary'
  | 'love_doubles'
  | 'alibi_doubles_entry_summary'
  | 'alibi_doubles'
  | 'alibi_doubles_signup_slips';

export type ReportDef = {
  id: SideActionReportKind;
  label: string;
  description: string;
  ready: boolean;
  scope: 'tournament' | 'side_action';
  actionLabel: string;
  /** Which opener types show this item. Omit = always (signup / payout). */
  forTypes?: SideActionType[];
};

export const REPORTS: ReportDef[] = [
  {
    id: 'signup_sheet',
    label: 'Side Action Sign-up Sheet',
    description:
      'Event check-in grid for all side actions: Name, a column for each, Total. Roster or blank.',
    ready: true,
    scope: 'tournament',
    actionLabel: 'Configure…',
  },
  {
    id: 'entry_summary',
    label: 'Bracket Entry Summary',
    description:
      'One-page entries, brackets, unplaced refunds, and financial snapshot for this bracket or all brackets.',
    ready: true,
    scope: 'side_action',
    actionLabel: 'Configure…',
    forTypes: [SideActionType.BRACKET],
  },
  {
    id: 'alive_list',
    label: 'Bracket Alive List',
    description: 'Who is still alive now (or as-of a game), with display modes.',
    ready: true,
    scope: 'side_action',
    actionLabel: 'Configure…',
    forTypes: [SideActionType.BRACKET],
  },
  {
    id: 'brackets',
    label: 'Brackets Report',
    description: 'Print every pot, fixed count per page, ink-light layout.',
    ready: true,
    scope: 'side_action',
    actionLabel: 'Preview',
    forTypes: [SideActionType.BRACKET],
  },
  {
    id: 'individual_bracket',
    label: 'Bracket Individual Report',
    description:
      "One bowler's pots: opponents and scores for G1–Final, prizes, and a personal summary.",
    ready: true,
    scope: 'side_action',
    actionLabel: 'Configure…',
    forTypes: [SideActionType.BRACKET],
  },
  {
    id: 'high_game_entry_summary',
    label: 'High Game Entry Summary',
    description:
      'One-page entries, fund math, and place prizes for this pot or all high games on the event.',
    ready: true,
    scope: 'side_action',
    actionLabel: 'Configure…',
    forTypes: [SideActionType.HIGH_GAME],
  },
  {
    id: 'high_game',
    label: 'High Game Report',
    description:
      'Printable standings by game. Choose which games and winners-only vs all entrants.',
    ready: true,
    scope: 'side_action',
    actionLabel: 'Configure…',
    forTypes: [SideActionType.HIGH_GAME],
  },
  {
    id: 'high_set_entry_summary',
    label: 'High Series Entry Summary',
    description:
      'One-page entries, fund math, and place prizes for this pot or all high series on the event.',
    ready: true,
    scope: 'side_action',
    actionLabel: 'Configure…',
    forTypes: [SideActionType.HIGH_SET],
  },
  {
    id: 'high_set',
    label: 'High Series Report',
    description:
      'Printable series standings with per-game scores. Winners-only or all entrants.',
    ready: true,
    scope: 'side_action',
    actionLabel: 'Configure…',
    forTypes: [SideActionType.HIGH_SET],
  },
  {
    id: 'eliminator_entry_summary',
    label: 'Eliminator Entry Summary',
    description:
      'Entries, cut projection, fund math, and place prizes for this eliminator or all on the event.',
    ready: true,
    scope: 'side_action',
    actionLabel: 'Configure…',
    forTypes: [SideActionType.ELIMINATOR],
  },
  {
    id: 'eliminator',
    label: 'Eliminator Report',
    description:
      'Results with cut numbers up top. Columns layout (default) or one game per page, with payouts.',
    ready: true,
    scope: 'side_action',
    actionLabel: 'Configure…',
    forTypes: [SideActionType.ELIMINATOR],
  },
  {
    id: 'mystery_doubles_entry_summary',
    label: 'Mystery Doubles Entry Summary',
    description:
      'Entries, odd-entrant status, pairs drawn, fund math, and place prizes for this pot or all on the event.',
    ready: true,
    scope: 'side_action',
    actionLabel: 'Configure…',
    forTypes: [SideActionType.MYSTERY_DOUBLES],
  },
  {
    id: 'mystery_doubles',
    label: 'Mystery Doubles Report',
    description:
      'Printable pair standings for the chosen game. Winners-only or all paired teams.',
    ready: true,
    scope: 'side_action',
    actionLabel: 'Configure…',
    forTypes: [SideActionType.MYSTERY_DOUBLES],
  },
  {
    id: 'mystery_game_entry_summary',
    label: 'Mystery Game Entry Summary',
    description:
      'Entries, mystery range, spin status, fund math, and place prizes for this pot or all on the event.',
    ready: true,
    scope: 'side_action',
    actionLabel: 'Configure…',
    forTypes: [SideActionType.MYSTERY_GAME],
  },
  {
    id: 'mystery_game',
    label: 'Mystery Game Report',
    description:
      'Mystery number, winner and payout, then misses sorted closest-first for the selected pot.',
    ready: true,
    scope: 'side_action',
    actionLabel: 'Configure…',
    forTypes: [SideActionType.MYSTERY_GAME],
  },
  {
    id: 'love_doubles_entry_summary',
    label: 'Love Doubles Entry Summary',
    description:
      'Entries, male × female team count, fund math, and place prizes for this pot or all on the event.',
    ready: true,
    scope: 'side_action',
    actionLabel: 'Configure…',
    forTypes: [SideActionType.LOVE_DOUBLES],
  },
  {
    id: 'love_doubles',
    label: 'Love Doubles Report',
    description:
      'Printable pair standings for the chosen games. Winners-only or all male/female teams.',
    ready: true,
    scope: 'side_action',
    actionLabel: 'Configure…',
    forTypes: [SideActionType.LOVE_DOUBLES],
  },
  {
    id: 'alibi_doubles_entry_summary',
    label: 'Alibi Doubles Entry Summary',
    description:
      'Pair tickets, fund math (pairs × fee), and place prizes for this pot or all on the event.',
    ready: true,
    scope: 'side_action',
    actionLabel: 'Configure…',
    forTypes: [SideActionType.ALIBI_DOUBLES],
  },
  {
    id: 'alibi_doubles',
    label: 'Alibi Doubles Report',
    description:
      'Printable pair standings for the chosen games. Winners-only or all pairs.',
    ready: true,
    scope: 'side_action',
    actionLabel: 'Configure…',
    forTypes: [SideActionType.ALIBI_DOUBLES],
  },
  {
    id: 'alibi_doubles_signup_slips',
    label: 'Alibi Doubles Signup Slips (4-up)',
    description:
      'Quarter-page write-in slips: bowler name and partner names. Print and cut into 4s.',
    ready: true,
    scope: 'side_action',
    actionLabel: 'Configure…',
    forTypes: [SideActionType.ALIBI_DOUBLES],
  },
  {
    id: 'payout',
    label: 'Side Action Payout Report',
    description:
      'Per-bowler payouts by side action (brackets, high games, high series, eliminators, mystery doubles, mystery game, love doubles, alibi doubles), totals, and signature line.',
    ready: true,
    scope: 'tournament',
    actionLabel: 'Configure…',
  },
];

export function reportsForType(sideActionType: SideActionType): ReportDef[] {
  return REPORTS.filter((r) => !r.forTypes || r.forTypes.includes(sideActionType));
}

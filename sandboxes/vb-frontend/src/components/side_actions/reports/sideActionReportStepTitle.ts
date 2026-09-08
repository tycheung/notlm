const SIDE_ACTION_REPORT_STEP_TITLES: Record<string, string> = {
  signup_options: 'Side Action Sign-up Sheet options',
  entry_summary_options: 'Bracket Entry Summary options',
  brackets_options: 'Bracket Wall Sheets options',
  alive_list_options: 'Bracket Alive List options',
  individual_bracket_options: 'Bracket Individual Report options',
  payout_options: 'Side Action Payout Report options',
  high_game_entry_summary_options: 'High Game Entry Summary options',
  high_game_options: 'High Game Report options',
  high_set_entry_summary_options: 'High Series Entry Summary options',
  high_set_options: 'High Series Report options',
  eliminator_entry_summary_options: 'Eliminator Entry Summary options',
  eliminator_options: 'Eliminator Report options',
  mystery_doubles_entry_summary_options: 'Mystery Doubles Entry Summary options',
  mystery_doubles_options: 'Mystery Doubles Report options',
  mystery_game_entry_summary_options: 'Mystery Game Entry Summary options',
  mystery_game_options: 'Mystery Game Report options',
  love_doubles_entry_summary_options: 'Love Doubles Entry Summary options',
  love_doubles_options: 'Love Doubles Report options',
  alibi_doubles_entry_summary_options: 'Alibi Doubles Entry Summary options',
  alibi_doubles_options: 'Alibi Doubles Report options',
  alibi_doubles_signup_slips_options: 'Alibi Doubles Signup Slips options',
};

export function sideActionReportStepTitle(step: string, sideActionName: string): string {
  return SIDE_ACTION_REPORT_STEP_TITLES[step] ?? `Reports — ${sideActionName}`;
}

export const DOUBLES_REPORT_STEP_BY_ID: Record<string, string> = {
  love_doubles_entry_summary: 'love_doubles_entry_summary_options',
  love_doubles: 'love_doubles_options',
  alibi_doubles_entry_summary: 'alibi_doubles_entry_summary_options',
  alibi_doubles: 'alibi_doubles_options',
  alibi_doubles_signup_slips: 'alibi_doubles_signup_slips_options',
};

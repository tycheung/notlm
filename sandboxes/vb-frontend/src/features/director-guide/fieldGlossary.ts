import { GUIDE_IDS } from './guideIds';

export type FieldGlossaryEntry = {
  key: string;
  guideId?: string;
  title: string;
  explanation: string;
  whatItDoes: string;
  aliases: string[];
};

export const FIELD_GLOSSARY: FieldGlossaryEntry[] = [
  {
    key: 'tournament_name',
    guideId: GUIDE_IDS.TOURNAMENT_NAME,
    title: 'Tournament name',
    explanation:
      'Just the label for this whole tournament — like the title on a flyer. Bowlers and directors use it to tell events apart.',
    whatItDoes: 'Shows up in lists, emails, and reports. It does not set dates or lanes by itself.',
    aliases: ['tournament name', 'name of the tournament', 'what is the name'],
  },
  {
    key: 'bowling_center',
    guideId: GUIDE_IDS.TOURNAMENT_CENTER,
    title: 'Bowling center',
    explanation:
      'Which bowling house this tournament is played at. Think “home alley” for the event weekend.',
    whatItDoes: 'Locks the venue, address, and how many lanes that house has available to reserve.',
    aliases: ['bowling center', 'center', 'alley', 'house', 'venue'],
  },
  {
    key: 'lanes_reserved',
    guideId: GUIDE_IDS.TOURNAMENT_CENTER,
    title: 'Lanes reserved',
    explanation:
      'How many lanes you want held for your tournament at that center — not every lane in the building, just your block.',
    whatItDoes: 'Tells the center (and the app) how big a footprint you need for squads.',
    aliases: ['lanes', 'lanes reserved', 'how many lanes'],
  },
  {
    key: 'event_name',
    guideId: GUIDE_IDS.EVENT_NAME,
    title: 'Event name',
    explanation:
      'The name of one competition inside the tournament (for example Scratch Singles). A tournament can have several events.',
    whatItDoes: 'Labels this event’s roster, scores, and reports separately from sibling events.',
    aliases: ['event name', 'name of the event'],
  },
  {
    key: 'event_format',
    guideId: GUIDE_IDS.EVENT_FORMAT,
    title: 'Event format (singles vs teams)',
    explanation:
      'Whether people bowl as individuals (singles) or as teams that share a roster and scoring rules.',
    whatItDoes: 'Changes how participants sign up, how scores roll up, and which team settings appear.',
    aliases: ['format', 'team event', 'singles', 'teams'],
  },
  {
    key: 'allows_reentry',
    guideId: GUIDE_IDS.EVENT_REENTRY,
    title: 'Re-entries',
    explanation:
      'Whether a bowler can buy another shot at the same event after they’ve already entered (like a second paid attempt).',
    whatItDoes: 'When off, each person can only appear once. When on, you can allow multiple paid entries.',
    aliases: ['reentry', 're-entry', 're-entries', 'no reentries'],
  },
  {
    key: 'event_dates',
    guideId: GUIDE_IDS.EVENT_START,
    title: 'Event start and end',
    explanation:
      'When this event actually runs. Tournament dates are derived from events — you set times here, not on the tournament form.',
    whatItDoes: 'Drives scheduling, live scoring windows, and how the tournament calendar is computed.',
    aliases: ['start date', 'end date', 'event time', 'schedule'],
  },
  {
    key: 'subscription',
    guideId: GUIDE_IDS.SUBSCRIPTION_NAV,
    title: 'Subscription / passes',
    explanation:
      'Your director billing plan or tournament passes — the ticket that lets you create full tournaments.',
    whatItDoes: 'Gates create-tournament and related paid features until you have an active plan or pass.',
    aliases: ['subscription', 'billing', 'passes', 'my plan'],
  },
  {
    key: 'qualifying_average',
    guideId: GUIDE_IDS.TAB_PARTICIPANTS,
    title: 'Qualifying average',
    explanation:
      'The average this bowler is entered with for handicap or eligibility in this event — not their live game scores.',
    whatItDoes: 'Used for handicap math and entry checks. Edit it on Participant Management.',
    aliases: ['average', 'qualifying average', 'entering average', 'what average'],
  },
  {
    key: 'format_round_games',
    guideId: GUIDE_IDS.FORMAT_ROUND_GAMES,
    title: 'Games in a round',
    explanation:
      'How many games each bowler bowls in that stage (for example 5-game qualifying).',
    whatItDoes: 'Sets scoring length for the round and squad game slots.',
    aliases: ['game count', 'number of games', 'how many games', '5 game', 'games games'],
  },
  {
    key: 'format_competition_method',
    guideId: GUIDE_IDS.FORMAT_ROUND_METHOD,
    title: 'Competition method',
    explanation:
      'How the round is scored and ranked — eliminator (pinfall), stepladder, bracket, round robin, or pods.',
    whatItDoes: 'Chooses the scoring rules and which match-play settings appear.',
    aliases: [
      'competition method',
      'eliminator',
      'stepladder',
      'bracket',
      'round robin',
      'pods',
      'single elim',
    ],
  },
  {
    key: 'format_advancement',
    guideId: GUIDE_IDS.FORMAT_REL_COUNT,
    title: 'Advancement / cut',
    explanation:
      'How many people (or what percent) move from one stage to the next — like “top 32” or “top half”.',
    whatItDoes: 'Controls who fills the next round or payout node when you advance.',
    aliases: [
      'advancement',
      'advancement count',
      'top n',
      'top percent',
      'cut',
      'cashers',
      'cutline',
      'who advances',
    ],
  },
  {
    key: 'format_execution_order',
    guideId: GUIDE_IDS.FORMAT_REL_EXEC_ORDER,
    title: 'Execution order',
    explanation:
      'When one stage has more than one exit (for example cashers and then a finals cut), lower order runs first so people claimed earlier are not double-counted.',
    whatItDoes:
      'Only matters with multiple exits from the same round. Single-exit formats can leave it alone.',
    aliases: ['execution order', 'cut order', 'which cut first', 'cashers first'],
  },
  {
    key: 'format_final_placement',
    guideId: GUIDE_IDS.FORMAT_FINAL_PLACEMENT,
    title: 'Placement / payout count',
    explanation:
      'How many places get paid (or ranked) at a final payout node — for example pay top 8.',
    whatItDoes: 'Sizes the championship / prize node and related prize steps.',
    aliases: ['placement count', 'pay top', 'how many paid', 'payout places', 'championship'],
  },
  {
    key: 'format_description',
    guideId: GUIDE_IDS.FORMAT_DESCRIPTION,
    title: 'Format description',
    explanation:
      'A short plain-language summary of this saved structure so you (or the assistant) can find it again later.',
    whatItDoes: 'Stored with the library template and used when matching “use my cashers format”.',
    aliases: ['format description', 'describe the format', 'what format is this'],
  },
];

export function findGlossaryEntry(query: string): FieldGlossaryEntry | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  let best: { entry: FieldGlossaryEntry; score: number } | null = null;
  for (const entry of FIELD_GLOSSARY) {
    for (const alias of [entry.key, entry.title, ...entry.aliases]) {
      const a = alias.toLowerCase();
      if (q === a) return entry;
      if (q.includes(a) || a.includes(q)) {
        const score = a.length;
        if (!best || score > best.score) best = { entry, score };
      }
    }
  }
  return best?.entry ?? null;
}

export function glossaryEntryByGuideId(guideId: string): FieldGlossaryEntry | null {
  return FIELD_GLOSSARY.find((e) => e.guideId === guideId) ?? null;
}

export function formatGlossaryReply(entry: FieldGlossaryEntry): string {
  return `${entry.title}: ${entry.explanation} ${entry.whatItDoes}`;
}

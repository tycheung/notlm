import { GUIDE_IDS } from './guideIds';
import type { GuideStepId } from './types';

export type DataPointKey = 'elimination_status' | 'scores' | 'qualifying_average';

export type DataPointLexiconEntry = {
  key: DataPointKey;
  aliases: string[];
  /** Nav-skip / conceptual step to open. */
  stepId: GuideStepId;
  spotlight?: string;
  coachMessage: string;
};

export const DATA_POINT_LEXICON: DataPointLexiconEntry[] = [
  {
    key: 'elimination_status',
    aliases: [
      'where is',
      'did they make it',
      'did he make it',
      'did she make it',
      'make it through',
      'eliminated',
      'last round',
      'still in',
      'advanced',
    ],
    stepId: 'advance_rounds',
    spotlight: GUIDE_IDS.TAB_STANDINGS,
    coachMessage:
      'I opened the event progress view — look here for which round they last played and whether they advanced.',
  },
  {
    key: 'scores',
    aliases: ['show their scores', 'their scores', 'game scores', 'what did they bowl', 'pinfall'],
    stepId: 'enter_scores',
    spotlight: GUIDE_IDS.TAB_SCORING,
    coachMessage: 'I opened Game Scoring — find this bowler there to see their scores.',
  },
  {
    key: 'qualifying_average',
    aliases: [
      'what average',
      'their average',
      'qualifying average',
      'entering average',
      'average were they',
      'avg',
    ],
    stepId: 'register_participants',
    spotlight: GUIDE_IDS.PARTICIPANT_AVERAGE,
    coachMessage:
      'I opened Participant Management — qualifying average is in the average column for this bowler.',
  },
];

export function matchDataPoint(text: string): DataPointLexiconEntry | null {
  const n = text.toLowerCase();
  let best: { entry: DataPointLexiconEntry; score: number } | null = null;
  for (const entry of DATA_POINT_LEXICON) {
    for (const alias of entry.aliases) {
      if (n.includes(alias)) {
        const score = alias.length;
        if (!best || score > best.score) best = { entry, score };
      }
    }
  }
  return best?.entry ?? null;
}

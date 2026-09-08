import type { GuideStepId } from '../../../src/features/director-guide/types';

export type NluCase = {
  id: string;
  utterance: string;
  /** Expected primary step, or null for meta-only. */
  stepId: GuideStepId | null;
  rawIntent?: string | RegExp;
  isCorrection?: boolean;
  goBack?: boolean;
  name?: string | RegExp;
  centerHint?: string | RegExp;
  lanes?: number;
};

/**
 * Natural-language corpus: clean → slang → typos → truncated STT for every guide function.
 */
export const GUIDE_NLU_CORPUS: NluCase[] = [
  // --- billing_ready ---
  { id: 'billing-clean', utterance: 'Open my subscription', stepId: 'billing_ready' },
  { id: 'billing-plan', utterance: 'show me my plan', stepId: 'billing_ready' },
  { id: 'billing-typo', utterance: 'open subscripshin', stepId: 'billing_ready' },
  { id: 'billing-trunc', utterance: 'need to renew my', stepId: 'billing_ready' },
  { id: 'billing-pass', utterance: 'check my passes', stepId: 'billing_ready' },

  // --- bowling_center ---
  { id: 'center-clean', utterance: 'Add a bowling center', stepId: 'bowling_center' },
  { id: 'center-typo', utterance: 'add bowlng center', stepId: 'bowling_center' },
  { id: 'center-alley', utterance: 'which alley are we using', stepId: 'bowling_center' },
  { id: 'center-house', utterance: 'set the house', stepId: 'bowling_center' },
  { id: 'center-uk', utterance: 'bowling centre list', stepId: 'bowling_center' },

  // --- create_tournament ---
  { id: 'tourn-clean', utterance: 'Create a tournament', stepId: 'create_tournament' },
  { id: 'tourn-named', utterance: 'Create a tournament named Friday Night Scratch', stepId: 'create_tournament', name: /friday night scratch/i },
  { id: 'tourn-typo', utterance: 'creat a tornament', stepId: 'create_tournament' },
  { id: 'tourn-crate', utterance: 'crate tournament please', stepId: 'create_tournament' },
  { id: 'tourn-slang', utterance: 'start a new tourney', stepId: 'create_tournament' },
  { id: 'tourn-trunc', utterance: 'create tourn', stepId: 'create_tournament' },
  { id: 'tourn-lanes', utterance: 'new tournament with 12 lanes', stepId: 'create_tournament', lanes: 12 },
  { id: 'tourn-at-center', utterance: 'create tournament at Oakwood Lanes', stepId: 'create_tournament', centerHint: /oakwood/i },
  { id: 'tourn-call-it', utterance: 'make a tournament call it Saturday Sweepers', stepId: 'create_tournament', name: /saturday sweepers/i },

  // --- create_event ---
  { id: 'event-clean', utterance: 'Create an event', stepId: 'create_event' },
  { id: 'event-add', utterance: 'add event to this tournament', stepId: 'create_event' },
  { id: 'event-typo', utterance: 'creat an event', stepId: 'create_event' },
  { id: 'event-named', utterance: 'add event named Scratch Singles', stepId: 'create_event', name: /scratch singles/i },
  { id: 'event-trunc', utterance: 'add eve', stepId: 'create_event' },

  // --- apply_format ---
  { id: 'format-clean', utterance: 'Open the format editor', stepId: 'apply_format' },
  { id: 'format-apply', utterance: 'apply format', stepId: 'apply_format' },
  { id: 'format-rounds', utterance: 'set up rounds', stepId: 'apply_format' },
  { id: 'format-choose', utterance: 'choose format for the event', stepId: 'apply_format' },
  { id: 'format-trunc', utterance: 'format edit', stepId: 'apply_format' },
  { id: 'format-wizard', utterance: 'open format wizard', stepId: 'apply_format' },
  { id: 'format-qualifying', utterance: 'set up qualifying rounds', stepId: 'apply_format' },
  { id: 'format-cashers', utterance: 'cashers cut then finals', stepId: 'apply_format' },
  { id: 'format-stepladder', utterance: 'stepladder finals', stepId: 'apply_format' },
  { id: 'format-bracket', utterance: 'single elim bracket', stepId: 'apply_format' },
  { id: 'format-add-round', utterance: 'add a round', stepId: 'apply_format' },
  { id: 'format-structure', utterance: 'structure the event', stepId: 'apply_format' },
  { id: 'format-pay-top', utterance: 'pay top 8 championship', stepId: 'apply_format' },

  // --- side_actions ---
  { id: 'sa-clean', utterance: 'Configure side actions', stepId: 'side_actions' },
  { id: 'sa-hyphen', utterance: 'open side-actions', stepId: 'side_actions' },
  { id: 'sa-pot', utterance: 'set up bracket pot', stepId: 'side_actions' },
  { id: 'sa-elim', utterance: 'add eliminator pot', stepId: 'side_actions' },
  { id: 'sa-trunc', utterance: 'side act', stepId: 'side_actions' },

  { id: 'sa-bracket-pot', utterance: 'add a bracket pot', stepId: 'side_actions' },
  { id: 'sa-high-game', utterance: 'set up high game pot', stepId: 'side_actions' },

  // --- register_participants ---
  { id: 'part-clean', utterance: 'Register participants', stepId: 'register_participants' },
  { id: 'part-bowlers', utterance: 'add bowlers to the roster', stepId: 'register_participants' },
  { id: 'part-typo', utterance: 'add particpants', stepId: 'register_participants' },
  { id: 'part-typo2', utterance: 'open particiants', stepId: 'register_participants' },
  { id: 'part-signups', utterance: 'manage sign-ups', stepId: 'register_participants' },
  { id: 'part-trunc', utterance: 'add bowl', stepId: 'register_participants' },
  { id: 'part-roster', utterance: 'open the roster', stepId: 'register_participants' },
  { id: 'part-entries', utterance: 'manage entries', stepId: 'register_participants' },

  // --- sa_signups ---
  { id: 'sasign-clean', utterance: 'Side action signups', stepId: 'sa_signups' },
  { id: 'sasign-pot', utterance: 'sign up for pots', stepId: 'sa_signups' },
  { id: 'sasign-enter', utterance: 'enter the pots', stepId: 'sa_signups' },
  { id: 'sasign-opt-in', utterance: 'opt bowlers into side pots', stepId: 'sa_signups' },

  // --- assign_squads ---
  { id: 'squad-clean', utterance: 'Assign squads', stepId: 'assign_squads' },
  { id: 'squad-typo', utterance: 'assgn squad', stepId: 'assign_squads' },
  { id: 'squad-put', utterance: 'put them in squads', stepId: 'assign_squads' },
  { id: 'squad-trunc', utterance: 'squad ass', stepId: 'assign_squads' },
  { id: 'squad-shift', utterance: 'assign shifts', stepId: 'assign_squads' },

  // --- assign_lanes ---
  { id: 'lane-clean', utterance: 'Lane assignments', stepId: 'assign_lanes' },
  { id: 'lane-assign', utterance: 'assign lanes', stepId: 'assign_lanes' },
  { id: 'lane-typo', utterance: 'assign lain pairs', stepId: 'assign_lanes' },
  { id: 'lane-trunc', utterance: 'lane ass', stepId: 'assign_lanes' },
  { id: 'lane-pair', utterance: 'set lane pairs', stepId: 'assign_lanes' },

  // --- lock_squads ---
  { id: 'locksq-clean', utterance: 'Lock squads', stepId: 'lock_squads' },
  { id: 'locksq-in', utterance: 'lock in the squad', stepId: 'lock_squads' },
  { id: 'locksq-typo', utterance: 'lok squad please', stepId: 'lock_squads' },
  { id: 'locksq-trunc', utterance: 'lock squ', stepId: 'lock_squads' },
  { id: 'locksq-shells', utterance: 'lock squad for game shells', stepId: 'lock_squads' },

  // --- lock_sa_entries ---
  { id: 'locksa-clean', utterance: 'Lock SA entries', stepId: 'lock_sa_entries' },
  { id: 'locksa-pots', utterance: 'lock pots before scoring', stepId: 'lock_sa_entries' },
  { id: 'locksa-event', utterance: 'lock event entries', stepId: 'lock_sa_entries' },

  // --- enter_scores ---
  { id: 'score-clean', utterance: 'Enter scores', stepId: 'enter_scores' },
  { id: 'score-tab', utterance: 'open game scoring', stepId: 'enter_scores' },
  { id: 'score-typo', utterance: 'enter scors', stepId: 'enter_scores' },
  { id: 'score-pinfall', utterance: 'enter pinfall', stepId: 'enter_scores' },
  { id: 'score-trunc', utterance: 'game scor', stepId: 'enter_scores' },
  { id: 'score-input', utterance: 'score entry', stepId: 'enter_scores' },

  // --- advance_rounds ---
  { id: 'adv-clean', utterance: 'Advance rounds', stepId: 'advance_rounds' },
  { id: 'adv-complete', utterance: 'complete round', stepId: 'advance_rounds' },
  { id: 'adv-process', utterance: 'process advancement', stepId: 'advance_rounds' },
  { id: 'adv-cut', utterance: 'run the cut', stepId: 'advance_rounds' },

  // --- run_reports ---
  { id: 'rep-clean', utterance: 'Run reports', stepId: 'run_reports' },
  { id: 'rep-print', utterance: 'print reports', stepId: 'run_reports' },
  { id: 'rep-standings', utterance: 'standings report', stepId: 'run_reports' },
  { id: 'rep-typo', utterance: 'open reprt menu', stepId: 'run_reports' },
  { id: 'rep-recap', utterance: 'event recap report', stepId: 'run_reports' },

  // --- create_tournament / create_event extras ---
  { id: 'tourn-sweepers', utterance: 'new sweepers tournament', stepId: 'create_tournament' },
  { id: 'event-scratch', utterance: 'new scratch event', stepId: 'create_event' },
  { id: 'event-doubles', utterance: 'add doubles event', stepId: 'create_event' },

  // --- corrections / go back ---
  { id: 'corr-center', utterance: 'Oh actually it should have been Oakwood Lanes', stepId: null, isCorrection: true, centerHint: /oakwood/i, rawIntent: 'correction' },
  { id: 'corr-name', utterance: 'wait rename it Victory Open', stepId: null, isCorrection: true, name: /victory open/i, rawIntent: 'correction' },
  { id: 'corr-meant', utterance: 'I meant Saturday Classic', stepId: null, isCorrection: true, centerHint: /saturday classic/i, rawIntent: 'correction' },
  { id: 'back-clean', utterance: 'go back', stepId: null, goBack: true, rawIntent: 'go_back' },
  { id: 'back-undo', utterance: 'undo that', stepId: null, goBack: true, rawIntent: 'go_back' },
  { id: 'back-earlier', utterance: 'previous step', stepId: null, goBack: true, rawIntent: 'go_back' },

  // --- meta intents ---
  { id: 'meta-score-block', utterance: "Why can't I score?", stepId: null, rawIntent: 'diagnose_scoring' },
  { id: 'meta-score-wont', utterance: "won't let me score", stepId: null, rawIntent: 'diagnose_scoring' },
  { id: 'meta-score-prevent', utterance: "what's preventing me from scoring", stepId: null, rawIntent: 'diagnose_scoring' },
  { id: 'meta-score-reach', utterance: "what's preventing me from reaching scoring", stepId: null, rawIntent: 'diagnose_scoring' },
  { id: 'meta-block-stage', utterance: "what's blocking me from stage scoring", stepId: null, rawIntent: 'diagnose_scoring' },
  { id: 'meta-next', utterance: "what's next", stepId: null, rawIntent: 'whats_next' },
  { id: 'meta-help', utterance: 'help me get started', stepId: null, rawIntent: 'whats_next' },
  { id: 'meta-take-there', utterance: 'take me there', stepId: null, rawIntent: 'whats_next' },
  { id: 'meta-go-there', utterance: 'go there', stepId: null, rawIntent: 'whats_next' },
  { id: 'meta-do-that', utterance: 'do that', stepId: null, rawIntent: 'whats_next' },
  { id: 'meta-skip-sa', utterance: 'skip side actions', stepId: null, rawIntent: 'skip_side_actions' },
  { id: 'meta-no-pots', utterance: "don't need any side actions", stepId: null, rawIntent: 'skip_side_actions' },

  // --- explain / glossary meta ---
  { id: 'meta-explain', utterance: 'what does that mean', stepId: null, rawIntent: 'explain_field' },
  { id: 'meta-huh', utterance: 'huh?', stepId: null, rawIntent: 'explain_field' },
  { id: 'meta-dont-understand', utterance: "I don't understand", stepId: null, rawIntent: 'explain_field' },

  // --- participant lookup meta ---
  { id: 'meta-where-bob', utterance: 'where is Bob Benton', stepId: null, rawIntent: 'lookup_participant' },
  { id: 'meta-average', utterance: 'what average were they playing at', stepId: null, rawIntent: 'lookup_participant' },
  { id: 'meta-scores', utterance: 'show their scores', stepId: null, rawIntent: 'lookup_participant' },

  // --- noisy / mixed ---
  { id: 'noisy-um', utterance: 'um create a tournament uh named Night Owl', stepId: 'create_tournament', name: /night owl/i },
  { id: 'noisy-please', utterance: 'can you please open participant management thanks', stepId: 'register_participants' },
  { id: 'noisy-caps', utterance: 'CREATE TOURNAMENT', stepId: 'create_tournament' },
  { id: 'noisy-punct', utterance: 'Add bowlers!!!', stepId: 'register_participants' },
];

/** Centers used for fuzzyMatchCenterName cases. */
export const GUIDE_CENTER_FUZZY_CASES: Array<{
  id: string;
  hint: string;
  centers: Array<{ id: number; name: string }>;
  expectId: number | null;
}> = [
  {
    id: 'center-exact',
    hint: 'Oakwood Lanes',
    centers: [
      { id: 1, name: 'Oakwood Lanes' },
      { id: 2, name: 'River Bowl' },
    ],
    expectId: 1,
  },
  {
    id: 'center-partial',
    hint: 'Oakwood',
    centers: [
      { id: 1, name: 'Oakwood Lanes' },
      { id: 2, name: 'River Bowl' },
    ],
    expectId: 1,
  },
  {
    id: 'center-typo',
    hint: 'Oakwod Lanes',
    centers: [
      { id: 1, name: 'Oakwood Lanes' },
      { id: 2, name: 'River Bowl' },
    ],
    expectId: 1,
  },
  {
    id: 'center-miss',
    hint: 'Totally Unknown',
    centers: [{ id: 1, name: 'Oakwood Lanes' }],
    expectId: null,
  },
];

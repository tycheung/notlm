import { FLOW_STEPS } from './flowGraph';
import type { GuideSlotBag, GuideStepId, ParseUtteranceResult } from './types';

/** Extra spoken/typed aliases per step (typos, slang, truncated phrases). */
export const STEP_ALIASES: Record<GuideStepId, string[]> = {
  billing_ready: [
    'subscription',
    'subscripshin',
    'billing',
    'bil ling',
    'my plan',
    'my pass',
    'passes',
    'upgrade',
    'renew',
    'payment',
    'pay ment',
  ],
  bowling_center: [
    'bowling center',
    'bowling centre',
    'bowlng center',
    'bowling cnter',
    'add a center',
    'add center',
    'house',
    'alley',
    'bowling alley',
    'which house',
  ],
  create_tournament: [
    'create tournament',
    'create a tournament',
    'creat tournament',
    'crate tournament',
    'new tournament',
    'make a tournament',
    'start a tournament',
    'set up a tournament',
    'setup tournament',
    'tourney',
    'tourney create',
    'sweepers tournament',
    'new sweepers',
  ],
  create_event: [
    'create event',
    'create an event',
    'creat event',
    'crate event',
    'new event',
    'add event',
    'add an event',
    'make an event',
    'set up an event',
    'scratch event',
    'doubles event',
    'add doubles',
  ],
  apply_format: [
    'event format',
    'apply format',
    'format editor',
    'format wizard',
    'choose format',
    'pick a format',
    'rounds and structure',
    'set up rounds',
    'setup rounds',
    'set up qualifying',
    'advancement',
    'qualifying',
    'prelims',
    'cashers',
    'cutline',
    'cut line',
    'stepladder',
    'step ladder',
    'bracket',
    'single elim',
    'round robin',
    'pods',
    'championship payout',
    'pay top',
    'add a round',
    'add an edge',
    'structure the event',
  ],
  side_actions: [
    'side action',
    'side actions',
    'sideaction',
    'side-action',
    'sa pot',
    'bracket pot',
    'high game pot',
    'eliminator pot',
    'mystery doubles',
    'configure pots',
    'add a bracket pot',
    'set up high game pot',
  ],
  register_participants: [
    'register participants',
    'register participant',
    'add participants',
    'add bowlers',
    'add bowler',
    'participant management',
    'particiants',
    'particpants',
    'roster',
    'open the roster',
    'sign ups',
    'signups',
    'sign-ups',
    'enroll bowlers',
    'entries',
    'manage entries',
    'enter bowlers',
  ],
  sa_signups: [
    'side action signup',
    'side action signups',
    'sa signup',
    'sa signups',
    'pot signup',
    'sign up for pots',
    'enter the pots',
    'pots signup',
    'opt bowlers into side pots',
    'opt into pots',
  ],
  assign_squads: [
    'assign squads',
    'assign squad',
    'squad assignment',
    'put on squads',
    'put them in squads',
    'squads tab',
    'assgn squad',
    'shifts',
    'assign shifts',
  ],
  assign_lanes: [
    'lane assignment',
    'lane assignments',
    'assign lanes',
    'assign lane',
    'lane pair',
    'lane pairs',
    'pair lanes',
    'set lanes',
    'set lane pairs',
  ],
  lock_squads: [
    'lock squads',
    'lock squad',
    'lock in squad',
    'lock-in',
    'lock in',
    'lok squad',
    'freeze squad',
    'game shells',
    'lock squad for game shells',
  ],
  lock_sa_entries: [
    'lock sa entries',
    'lock side action',
    'lock side actions',
    'lock entries',
    'lock pots',
    'freeze entries',
    'lock event entries',
  ],
  enter_scores: [
    'enter scores',
    'enter score',
    'game scoring',
    'score games',
    'scoring tab',
    'put in scores',
    'type scores',
    'enter pinfall',
    'score entry',
  ],
  advance_rounds: [
    'advance rounds',
    'advance round',
    'complete round',
    'complete rounds',
    'process advancement',
    'move bowlers up',
    'run the cut',
  ],
  run_reports: [
    'run reports',
    'open reports',
    'print reports',
    'standings report',
    'print sheets',
    'export reports',
    'report menu',
    'event recap',
    'recap report',
  ],
};

const META_PATTERNS: Array<{ intent: string; patterns: RegExp[] }> = [
  {
    intent: 'go_back',
    patterns: [
      /\bgo back\b/i,
      /\bprevious step\b/i,
      /\bearlier step\b/i,
      /\bback up\b/i,
      /\bundo that\b/i,
      /\bwait go back\b/i,
    ],
  },
  {
    intent: 'diagnose_scoring',
    patterns: [
      /why can'?t i score/i,
      /can'?t score/i,
      /cannot score/i,
      /scoring blocked/i,
      /won'?t let me score/i,
      /unable to score/i,
      /score.?s? (?:are|is) (?:locked|blocked)/i,
      /what(?:'s| is) preventing (?:me )?(?:from )?(?:reaching )?(?:stage |step )?/i,
      /what(?:'s| is) blocking (?:me )?(?:from )?(?:reaching )?(?:stage |step )?/i,
      /why can'?t i (?:reach|get to) scor/i,
      /blocked from (?:scoring|lanes|squads|format|participants)/i,
    ],
  },
  {
    intent: 'whats_next',
    patterns: [
      /what(?:'s| is) next/i,
      /what (?:can|should) i do/i,
      /next step/i,
      /where (?:do|should) i (?:go|start)/i,
      /help me (?:get )?started/i,
      /take me there/i,
      /take me to (?:it|that|there)/i,
      /go (?:there|to it|to that)/i,
      /do that/i,
      /yes take me/i,
    ],
  },
  {
    intent: 'skip_side_actions',
    patterns: [
      /skip side actions?/i,
      /no side actions?/i,
      /without side actions?/i,
      /don'?t need (?:any )?side actions?/i,
      /skip (?:the )?pots/i,
    ],
  },
  {
    intent: 'explain_field',
    patterns: [
      /i don'?t understand/i,
      /what does that mean/i,
      /what(?:'s| is) this(?:\s+field)?\b/i,
      /\bexplain(?:\s+this)?(?:\s+field)?\s*[?.!]*$/i,
      /\bhuh\??\b/i,
      /what does .+ mean/i,
    ],
  },
  {
    intent: 'lookup_participant',
    patterns: [
      /where is\b/i,
      /did (?:he|she|they|[a-z]+) make it/i,
      /make it through/i,
      /show (?:me )?(?:their|his|her) scores/i,
      /what average/i,
      /their average/i,
      /eliminated\b/i,
      /last round\b/i,
    ],
  },
];

const CORRECTION_RE =
  /\b(actually|instead|change(?:\s+it)?|wait|correction|should(?:\s+have)?\s+been|make it|rename(?:\s+it)?|i meant)\b/i;

const NAME_PATTERNS = [
  /(?:call(?:ed)?\s+it|name(?:d)?(?:\s+it)?|tournament(?:\s+is|\s+named)?|event(?:\s+is|\s+named)?)\s+["']?([^"'\n,.]+?)["']?(?:\s*$|[.,!?])/i,
  /(?:name(?:d)?|title)\s*[:=]\s*["']?([^"'\n,.]+?)["']?/i,
  /rename(?:\s+it)?\s+["']?([^"'\n,.]+?)["']?(?:\s*$|[.,!?])/i,
  /^["']([^"']+)["']$/,
];

const CENTER_PATTERNS = [
  /(?:at|center|centre|house|alley|bowling(?:\s+cent(?:er|re))?)\s+["']?([^"'\n,.]+?)["']?(?:\s*$|[.,!?])/i,
  /should(?:\s+have)?\s+been\s+["']?([^"'\n,.]+?)["']?(?:\s*$|[.,!?])/i,
  /(?:i meant|make it)\s+["']?([^"'\n,.]+?)["']?(?:\s*$|[.,!?])/i,
];

const LANES_PATTERNS = [
  /\b(\d{1,2})\s*lanes?\b/i,
  /lanes?\s*[:=]?\s*(\d{1,2})\b/i,
  /\breserve(?:d)?\s+(\d{1,2})\b/i,
];

/** Common STT / fat-finger substitutions before matching. */
export function normalizeSpeech(text: string): string {
  let t = text.trim().toLowerCase();
  t = t.replace(/[’']/g, "'");
  t = t.replace(/[^a-z0-9'\s:-]/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();

  const replacements: Array<[RegExp, string]> = [
    [/\btourney\b/g, 'tournament'],
    [/\btornament\b/g, 'tournament'],
    [/\btournamnt\b/g, 'tournament'],
    [/\btournamnet\b/g, 'tournament'],
    [/\bcreat\b/g, 'create'],
    [/\bcrate\b/g, 'create'],
    [/\bcreeate\b/g, 'create'],
    [/\bparticpants\b/g, 'participants'],
    [/\bparticiants\b/g, 'participants'],
    [/\bparticipents\b/g, 'participants'],
    [/\bbowlrs\b/g, 'bowlers'],
    [/\bbowl ers\b/g, 'bowlers'],
    [/\bsquadz\b/g, 'squads'],
    [/\bsqauds\b/g, 'squads'],
    [/\blain\b/g, 'lane'],
    [/\blains\b/g, 'lanes'],
    [/\bscors\b/g, 'scores'],
    [/\bscorin\b/g, 'scoring'],
    [/\breprt\b/g, 'report'],
    [/\breports?\b/g, (m) => m], // no-op keep
    [/\bsideaction\b/g, 'side action'],
    [/\bside-action\b/g, 'side action'],
    [/\blockin\b/g, 'lock in'],
    [/\block-in\b/g, 'lock in'],
    [/\bcentrer?\b/g, 'center'],
    [/\bsubscripshin\b/g, 'subscription'],
  ];

  for (const [re, to] of replacements) {
    if (typeof to === 'string') t = t.replace(re, to);
  }
  return t;
}

function normalize(text: string): string {
  return normalizeSpeech(text);
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cur = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = cur;
    }
  }
  return row[b.length];
}

function fuzzyIncludes(haystack: string, needle: string): boolean {
  if (!needle) return false;
  if (haystack.includes(needle)) return true;
  // Allow 1-edit typos for tokens length >= 5
  const words = haystack.split(' ');
  const needleWords = needle.split(' ');
  if (needleWords.length === 1) {
    const n = needleWords[0];
    if (n.length < 5) return false;
    return words.some((w) => editDistance(w, n) <= 1);
  }
  // Multi-word: require each word fuzzy-present in order
  let from = 0;
  for (const nw of needleWords) {
    let found = -1;
    for (let i = from; i < words.length; i += 1) {
      if (words[i] === nw || (nw.length >= 5 && editDistance(words[i], nw) <= 1)) {
        found = i;
        break;
      }
    }
    if (found < 0) return false;
    from = found + 1;
  }
  return true;
}

function phraseScore(haystack: string, phrase: string): number {
  const p = phrase.toLowerCase().trim();
  if (!p) return 0;
  const wordCount = p.split(/\s+/).length;
  const singleWordPenalty = wordCount === 1 ? 220 : 0;

  if (haystack === p) return 1000 + p.length;
  if (haystack.includes(p)) return 500 + p.length * 2 - singleWordPenalty;
  if (fuzzyIncludes(haystack, p)) return 200 + p.length - Math.floor(singleWordPenalty / 2);
  // Truncated speech: user uttered a prefix of the target phrase ("create tourn", "squad ass")
  if (haystack.length >= 5 && p.startsWith(haystack)) {
    return 150 + haystack.length;
  }
  // Or haystack contains a substantial prefix of the phrase
  if (p.length >= 6) {
    const truncated = p.slice(0, Math.max(6, Math.floor(p.length * 0.7)));
    if (haystack.includes(truncated)) return 120 + truncated.length;
  }
  return 0;
}

export function matchStep(text: string): GuideStepId | null {
  const n = normalize(text);
  let best: { id: GuideStepId; score: number } | null = null;

  for (const step of FLOW_STEPS) {
    const phrases = [...step.keywords, ...(STEP_ALIASES[step.id] || [])];
    for (const phrase of phrases) {
      const score = phraseScore(n, phrase);
      if (score <= 0) continue;
      // Prefer longer / stronger matches; break ties toward more specific ids
      // (create_tournament beats bare "tournament" via longer alias scores).
      if (!best || score > best.score) {
        best = { id: step.id, score };
      }
    }
  }

  // Guard: bare "tournament" alone after create already exists is still create_tournament —
  // but "bowling center" must beat "center" colliding with unrelated text.
  if (best && best.score < 200 && /\b(why|can'?t|cannot|blocked)\b/.test(n)) {
    return null;
  }
  return best?.id ?? null;
}

export function extractName(text: string): string | null {
  for (const re of NAME_PATTERNS) {
    const m = text.match(re);
    if (m?.[1]) {
      const name = m[1].trim().replace(/\s+/g, ' ');
      if (name.length >= 2) return name;
    }
  }
  return null;
}

export function extractCenterHint(text: string): string | null {
  for (const re of CENTER_PATTERNS) {
    const m = text.match(re);
    if (m?.[1]) {
      const hint = m[1].trim().replace(/\s+/g, ' ');
      // Avoid capturing step words as center names
      if (/^(tournament|event|squad|lane|score|format)$/i.test(hint)) continue;
      if (hint.length >= 2) return hint;
    }
  }
  return null;
}

export function extractLanes(text: string): number | null {
  for (const re of LANES_PATTERNS) {
    const m = text.match(re);
    if (m?.[1]) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > 0 && n <= 100) return n;
    }
  }
  return null;
}

function matchMetaIntent(text: string): string | null {
  for (const meta of META_PATTERNS) {
    if (meta.patterns.some((re) => re.test(text))) return meta.intent;
  }
  return null;
}

/**
 * Scripted utterance parser: flow intent + slot patches + correction/meta flags.
 */
export function parseUtterance(raw: string): ParseUtteranceResult {
  const text = raw.trim();
  if (!text) {
    return {
      stepId: null,
      slotPatches: {},
      isCorrection: false,
      goBack: false,
      rawIntent: null,
    };
  }

  const meta = matchMetaIntent(text);
  const goBack = meta === 'go_back';
  const isCorrection = !goBack && CORRECTION_RE.test(text);
  let stepId =
    goBack ||
    meta === 'whats_next' ||
    meta === 'diagnose_scoring' ||
    meta === 'skip_side_actions' ||
    meta === 'explain_field' ||
    meta === 'lookup_participant'
      ? null
      : matchStep(text);

  // Corrections usually patch slots ("should have been Oakwood Lanes") — don't
  // hijack to assign_lanes just because the center name contains "lanes".
  if (isCorrection && stepId) {
    const n = normalize(text);
    const aliases = STEP_ALIASES[stepId] || [];
    const strong = [...FLOW_STEPS.find((s) => s.id === stepId)!.keywords, ...aliases].some(
      (phrase) => phrase.includes(' ') && n.includes(phrase.toLowerCase())
    );
    if (!strong) stepId = null;
  }

  const slotPatches: GuideSlotBag = {};
  const name = extractName(text);
  if (name) slotPatches.name = name;
  const centerHint = extractCenterHint(text);
  if (centerHint) slotPatches.bowling_center_hint = centerHint;
  const lanes = extractLanes(text);
  if (lanes != null) slotPatches.lanes_reserved = lanes;

  let rawIntent: string | null = null;
  if (goBack) rawIntent = 'go_back';
  else if (meta === 'diagnose_scoring') rawIntent = 'diagnose_scoring';
  else if (meta === 'whats_next') rawIntent = 'whats_next';
  else if (meta === 'skip_side_actions') rawIntent = 'skip_side_actions';
  else if (meta === 'explain_field') rawIntent = 'explain_field';
  else if (meta === 'lookup_participant') rawIntent = 'lookup_participant';
  else if (isCorrection) rawIntent = 'correction';
  else if (stepId) rawIntent = `goto:${stepId}`;
  else if (Object.keys(slotPatches).length) rawIntent = 'slot_patch';
  else rawIntent = 'unknown';

  return {
    stepId,
    slotPatches,
    isCorrection,
    goBack,
    rawIntent,
  };
}

export function fuzzyMatchCenterName(
  hint: string,
  centers: Array<{ id: number; name: string }>
): { id: number; name: string } | null {
  const h = normalize(hint);
  if (!h) return null;
  const exact = centers.find((c) => normalize(c.name) === h);
  if (exact) return exact;
  const partial = centers.find(
    (c) => normalize(c.name).includes(h) || h.includes(normalize(c.name))
  );
  if (partial) return partial;
  // Fuzzy token match for STT mangled center names
  let best: { id: number; name: string; dist: number } | null = null;
  for (const c of centers) {
    const cn = normalize(c.name);
    const dist = editDistance(cn, h);
    const maxAllowed = Math.max(1, Math.floor(Math.min(cn.length, h.length) / 4));
    if (dist <= maxAllowed && (!best || dist < best.dist)) {
      best = { id: c.id, name: c.name, dist };
    }
  }
  return best ? { id: best.id, name: best.name } : null;
}

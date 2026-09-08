/**
 * Bowling TD vernacular for event structure (rounds / edges / payouts).
 * Used by formatDraftCompiler and NLU alias expansion.
 */

export type CompetitionMethodHint =
  | 'eliminator'
  | 'stepladder'
  | 'bracket'
  | 'round_robin'
  | 'pods';

export const METHOD_LEXICON: { method: CompetitionMethodHint; aliases: string[] }[] = [
  {
    method: 'eliminator',
    aliases: [
      'eliminator',
      'pinfall',
      'total pinfall',
      'scratch',
      'qualifying style',
      'high pinfall',
    ],
  },
  {
    method: 'stepladder',
    aliases: ['stepladder', 'step ladder', 'ladder finals', 'ladder', 'step-ladder'],
  },
  {
    method: 'bracket',
    aliases: [
      'bracket',
      'single elim',
      'single-elim',
      'single elimination',
      'double elim',
      'double-elim',
      'double elimination',
      'match play bracket',
    ],
  },
  {
    method: 'round_robin',
    aliases: ['round robin', 'round-robin', 'rr', 'rotating pairs'],
  },
  {
    method: 'pods',
    aliases: ['pods', 'pod play', 'pod format'],
  },
];

export const ROUND_NAME_LEXICON: { refHint: string; aliases: string[] }[] = [
  {
    refHint: 'qualifying',
    aliases: [
      'qualifying',
      'qualify',
      'quals',
      'prelims',
      'preliminary',
      'sweeper',
      'first round',
      'opening round',
    ],
  },
  {
    refHint: 'final',
    aliases: ['final', 'finals', 'championship round', 'title round', 'last round'],
  },
  {
    refHint: 'semifinal',
    aliases: ['semifinal', 'semi-final', 'semis', 'semi finals'],
  },
  {
    refHint: 'cashers',
    aliases: ['cashers', 'casher cut', 'cashers cut', 'money round'],
  },
];

export const ADVANCEMENT_LEXICON = {
  topN: [
    /\btop\s+(\d+)(?!\s*%)\b/i,
    /\bcut\s+(?:to\s+)?(?:the\s+)?top\s+(\d+)(?!\s*%)\b/i,
    /\badvance\s+(\d+)\b/i,
    /\b(\d+)\s+(?:bowlers?|players?)\s+advance\b/i,
  ],
  topPercent: [
    /\btop\s+(\d+)\s*%/i,
    /\btop\s+half\b/i,
    /\btop\s+third\b/i,
    /\b(\d+)\s*%\s+(?:advance|cut)/i,
  ],
  winners: [/\bwinners?\b/i, /\bwinner\s+bracket\b/i],
};

export const FINAL_NODE_LEXICON = {
  championship: [
    'championship',
    'champ',
    'title',
    'payout',
    'prize fund',
    'pay top',
    'pay the top',
    'final payouts',
  ],
};

export const MATCH_SAVED_FORMAT_RE =
  /\b(?:use|apply|load|pick|same as|like)\s+(?:my\s+|the\s+)?(.+?)\s+format\b/i;

export const FINISH_FORMAT_RE =
  /\b(?:done|finish|save\s+(?:the\s+)?format|apply\s+(?:the\s+)?format|that's\s+it|thats\s+it)\b/i;

export const ADD_ROUND_RE =
  /\b(?:add|create|new)\s+(?:a\s+)?(?:[\w-]+\s+){0,4}(?:round|stage|node)\b/i;

export const ADD_EDGE_RE =
  /\b(?:add|create|new)\s+(?:an?\s+)?(?:edge|relationship|advancement|cut|link)\b/i;

export const ADD_FINAL_RE =
  /\b(?:add|create|new)\s+(?:a\s+)?(?:final|exit|payout|championship)\s*(?:node)?\b/i;

export function matchCompetitionMethod(text: string): CompetitionMethodHint | null {
  const t = text.toLowerCase();
  for (const entry of METHOD_LEXICON) {
    for (const a of entry.aliases) {
      if (t.includes(a.toLowerCase())) return entry.method;
    }
  }
  return null;
}

export function matchRoundNameHint(text: string): string | null {
  const t = text.toLowerCase();
  for (const entry of ROUND_NAME_LEXICON) {
    for (const a of entry.aliases) {
      if (t.includes(a.toLowerCase())) return entry.refHint;
    }
  }
  return null;
}

export function extractGameCount(text: string): number | null {
  const m =
    text.match(/\b(\d+)\s*-?\s*games?\b/i) ||
    text.match(/\b(?:game\s*count|games)\s*[:=]?\s*(\d+)\b/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 && n <= 48 ? n : null;
}

export function extractTopN(text: string): number | null {
  for (const re of ADVANCEMENT_LEXICON.topN) {
    const m = text.match(re);
    if (m?.[1]) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

export function extractTopPercent(text: string): number | null {
  if (/\btop\s+half\b/i.test(text)) return 50;
  if (/\btop\s+third\b/i.test(text)) return 33;
  for (const re of ADVANCEMENT_LEXICON.topPercent) {
    const m = text.match(re);
    if (m?.[1]) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > 0 && n <= 100) return n;
    }
  }
  return null;
}

export function extractPlacementCount(text: string): number | null {
  const m =
    text.match(/\bpay\s+(?:the\s+)?top\s+(\d+)\b/i) ||
    text.match(/\btop\s+(\d+)\s+(?:get\s+)?paid\b/i) ||
    text.match(/\bplacement(?:s|_count)?\s*[:=]?\s*(\d+)\b/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function extractMatchSavedQuery(text: string): string | null {
  const m = text.match(MATCH_SAVED_FORMAT_RE);
  if (!m?.[1]) return null;
  const q = m[1].trim().replace(/^(my|the)\s+/i, '');
  return q || null;
}

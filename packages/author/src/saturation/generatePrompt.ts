function jsonBlock(label: string, value: unknown): string {
  return `### ${label}\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}

export type ScenarioGenerateMode = 'flow' | 'user-ask';

export function buildScenarioGeneratePrompt(input: {
  batchSize: number;
  flowSteps: unknown;
  intents?: unknown;
  inventory?: unknown;
  structuredDraft?: unknown;
  priorUtterances: string[];
  /** 30-second product description — drives naturalistic user questions. */
  productBlurb?: string;
  /** `user-ask` ignores DAG bias; models what users ask from the blurb alone. */
  mode?: ScenarioGenerateMode;
}): string {
  const mode = input.mode ?? 'flow';
  const blurb = input.productBlurb?.trim();

  if (mode === 'user-ask') {
    const parts = [
      'You invent naturalistic questions a first-time user would type into a product chatbot.',
      'Use ONLY the productBlurb (a ~30-second app description). Do NOT optimize for checklist/DAG steps.',
      `Propose exactly ${input.batchSize} candidate questions (or as close as possible).`,
      'Cover: how-to, why, where-is, pricing/limits, privacy, troubleshooting, slang, typos, truncated STT,',
      'frustrated tone, feature discovery, comparisons, "can I…", "does it…", off-topic negatives.',
      'Avoid near-duplicates of priorUtterances.',
      'Respond with JSON only: { "candidates": [ { "id": "c1", "utterance": "..." }, ... ] }',
      'Do not invent secrets or API keys.',
      '',
      jsonBlock(
        'productBlurb',
        blurb ||
          'Generic web app — invent plausible user questions for a productivity SPA.'
      ),
    ];
    // Optional context only as background — model must still prefer blurb-led questions.
    if (input.flowSteps !== undefined) {
      parts.push(
        '',
        'Optional background (do not bias toward checklist phrasing):',
        jsonBlock('flowSteps (background only)', input.flowSteps)
      );
    }
    const prior = input.priorUtterances.slice(-80);
    parts.push('', jsonBlock('priorUtterances (sample)', prior));
    return parts.join('\n');
  }

  const parts = [
    'You generate diverse natural-language prompts a user might type to a UI coach.',
    `Propose exactly ${input.batchSize} candidate utterances (or as close as possible).`,
    'Cover: clean aliases, slang, typos, truncated STT, packed multi-step, negatives, near-misses.',
    'Avoid near-duplicates of priorUtterances.',
    'Respond with JSON only: { "candidates": [ { "id": "c1", "utterance": "..." }, ... ] }',
    'Do not invent secrets or API keys.',
    '',
    jsonBlock('flowSteps', input.flowSteps),
  ];
  if (blurb) {
    parts.push('', jsonBlock('productBlurb', blurb));
  }
  if (input.intents !== undefined) {
    parts.push('', jsonBlock('intents', input.intents));
  }
  if (input.inventory !== undefined) {
    parts.push('', jsonBlock('inventory', input.inventory));
  }
  if (input.structuredDraft !== undefined) {
    parts.push('', jsonBlock('structuredDraft', input.structuredDraft));
  }
  const prior = input.priorUtterances.slice(-80);
  parts.push('', jsonBlock('priorUtterances (sample)', prior));
  return parts.join('\n');
}

/** Soft expect labels only — draft, never merged into pack/. */
export function buildSoftLabelPrompt(input: {
  candidates: unknown;
  flowSteps: unknown;
  intents?: unknown;
  faq?: unknown;
  productBlurb?: string;
}): string {
  return [
    'Soft-label coach/chat utterances for a deterministic NLU pack.',
    'For each candidate, propose expect:',
    '- { "stepId": "<id from flowSteps>" } when they want a checklist step',
    '- { "rawIntent": "whats_next"|"go_back"|"explain_field" } for meta',
    '- { "rawIntent": "faq", "faqId": "<id>", "answer": "<short reply>" } for product Q&A',
    '  (how-to / pricing / capability) that is NOT a navigation step',
    '- { "stepId": null } for true negatives / unintelligible / off-topic',
    'Prefer mapping weird phrasings to an existing step when they clearly mean that job.',
    'Prefer faq when they ask about the product itself (from productBlurb) rather than doing a step.',
    'Respond with JSON only:',
    '{ "scenarios": [ { "id": "...", "utterance": "...", "expect": { ... } } ] }',
    '',
    input.productBlurb?.trim()
      ? `${jsonBlock('productBlurb', input.productBlurb.trim())}\n`
      : '',
    jsonBlock('flowSteps', input.flowSteps),
    '',
    jsonBlock('candidates', input.candidates),
    input.intents !== undefined ? `\n${jsonBlock('intents', input.intents)}` : '',
    input.faq !== undefined ? `\n${jsonBlock('existingFaq', input.faq)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

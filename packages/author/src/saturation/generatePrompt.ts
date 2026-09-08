function jsonBlock(label: string, value: unknown): string {
  return `### ${label}\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}

/** Prompt: pack context → diverse unlabeled utterance candidates. */
export function buildScenarioGeneratePrompt(input: {
  batchSize: number;
  flowSteps: unknown;
  intents?: unknown;
  inventory?: unknown;
  structuredDraft?: unknown;
  priorUtterances: string[];
}): string {
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

/** Prompt: unlabeled candidates → soft expect labels (draft only). */
export function buildSoftLabelPrompt(input: {
  candidates: unknown;
  flowSteps: unknown;
  intents?: unknown;
}): string {
  return [
    'Soft-label coach utterances for a deterministic NLU pack.',
    'For each candidate, propose expect: { stepId } or { rawIntent } or { stepId: null } for negatives.',
    'stepId MUST be an id from flowSteps or null. rawIntent may be whats_next, go_back, explain_field, unknown.',
    'Respond with JSON only:',
    '{ "scenarios": [ { "id": "...", "utterance": "...", "expect": { "stepId": "..." } } ] }',
    '',
    jsonBlock('flowSteps', input.flowSteps),
    '',
    jsonBlock('candidates', input.candidates),
    input.intents !== undefined ? `\n${jsonBlock('intents', input.intents)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

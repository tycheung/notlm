import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { actionRiskFromIntent, actionRiskFromParsed } from './actionRisk.js';
import { conceptualActionConflict } from './intentConflict.js';
import { isConceptualQuestion } from './utteranceIntent.js';

type RegressionCase = {
  id: string;
  utterance: string;
  expect: {
    risk?: string;
    route?: string;
    notRawIntentIncludes?: string[];
    mustNotMatch?: string;
  };
};

type RegressionFile = {
  id: string;
  cases: RegressionCase[];
};

/**
 * Optional host-pack fixtures (monorepo workspace only). Core must stay
 * green without react-frontend — VB phrases belong in the host pack JSON.
 */
function loadVbRoutingRegression(): RegressionFile | null {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const path = join(
      here,
      '../../../../react-frontend/.notlm/pack/routingRegression.json'
    );
    return JSON.parse(readFileSync(path, 'utf8')) as RegressionFile;
  } catch {
    return null;
  }
}

describe('routingRegression harness', () => {
  it('base conflict helpers: how-to + goto → conceptual conflict', () => {
    const utterance = 'How do I open reports for this event?';
    expect(isConceptualQuestion(utterance)).toBe(true);
    expect(
      conceptualActionConflict({
        isConceptual: true,
        risk: actionRiskFromIntent('goto:open_reports'),
      })
    ).toBe(true);
  });

  it('format-apply mutate risk is gated (not answer)', () => {
    expect(actionRiskFromIntent('apply:format')).toBe('mutate');
    expect(
      actionRiskFromParsed({
        rawIntent: 'mutation',
        mutationId: 'format.apply',
      })
    ).toBe('mutate');
  });

  const vb = loadVbRoutingRegression();
  it('optional VB fixtures (skipped when notlm is standalone)', () => {
    if (!vb) {
      expect(vb).toBeNull();
      return;
    }
    const ids = new Set(vb.cases.map((c) => c.id));
    expect(ids.has('p1-format-apply-not-subscription')).toBe(true);
    expect(ids.has('p2-reports-howto-not-open-by-name')).toBe(true);
    expect(ids.has('p2-generate-brackets-not-create-event')).toBe(true);
  });

  if (vb) {
    for (const c of vb.cases) {
      if (c.expect.risk === 'answer' || c.expect.route === 'answer_or_defer') {
        it(`VB case ${c.id}: conceptual utterance prefers answer conflict gate`, () => {
          const conceptual = isConceptualQuestion(c.utterance);
          if (!conceptual) return;
          expect(
            conceptualActionConflict({
              isConceptual: true,
              risk: 'navigate',
            })
          ).toBe(true);
        });
      }
    }
  }
});

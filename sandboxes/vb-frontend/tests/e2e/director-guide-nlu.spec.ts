import { expect, test } from '@playwright/test';

import {
  fuzzyMatchCenterName,
  parseUtterance,
} from '../../src/features/director-guide/intents';
import { FLOW_STEPS } from '../../src/features/director-guide/flowGraph';
import { NAV_SKIP_REGISTRY, getNavSkip, searchNavSkips } from '../../src/features/director-guide/navSkipRegistry';
import { diagnoseScoringBlockers, siblingNextActions } from '../../src/features/director-guide/blockers';
import { evaluateFlowStatuses } from '../../src/features/director-guide/flowStatus';
import {
  emptySessionSlots,
  goBackToStep,
  patchStepSlots,
  setActionQueue,
  completeQueueHead,
} from '../../src/features/director-guide/slots';
import { parsePackedUtterance } from '../../src/features/director-guide/packUtterance';
import {
  firstNDaysOfRange,
  parseMonthDayRange,
} from '../../src/features/director-guide/dateSlots';
import { findGlossaryEntry } from '../../src/features/director-guide/fieldGlossary';
import { matchDataPoint } from '../../src/features/director-guide/dataPointLexicon';
import {
  resolveParticipantOrAmbiguous,
  extractEventNameHint,
} from '../../src/features/director-guide/participantResolve';
import type { GuideRuntimeContext } from '../../src/features/director-guide/types';
import {
  GUIDE_CENTER_FUZZY_CASES,
  GUIDE_NLU_CORPUS,
} from './director-guide/nluCorpus';

/**
 * Playwright NLU suite (no browser): every guide step/function against messy speech.
 * Tag @guide-nlu — can run with PLAYWRIGHT_SKIP_WEBSERVER=1 for speed.
 */
test.describe('@guide-nlu director guide natural language corpus', () => {
  for (const c of GUIDE_NLU_CORPUS) {
    test(`${c.id}: "${c.utterance}"`, () => {
      const parsed = parseUtterance(c.utterance);

      if (c.goBack) {
        expect(parsed.goBack, 'goBack').toBe(true);
      }
      if (c.isCorrection) {
        expect(parsed.isCorrection, 'isCorrection').toBe(true);
      }
      if (c.rawIntent) {
        if (c.rawIntent instanceof RegExp) {
          expect(parsed.rawIntent || '').toMatch(c.rawIntent);
        } else {
          expect(parsed.rawIntent).toBe(c.rawIntent);
        }
      }
      if (c.stepId !== undefined) {
        expect(parsed.stepId, `stepId for "${c.utterance}"`).toBe(c.stepId);
      }
      if (c.name) {
        expect(String(parsed.slotPatches.name || '')).toMatch(c.name);
      }
      if (c.centerHint) {
        expect(String(parsed.slotPatches.bowling_center_hint || '')).toMatch(c.centerHint);
      }
      if (c.lanes != null) {
        expect(parsed.slotPatches.lanes_reserved).toBe(c.lanes);
      }
    });
  }
});

test.describe('@guide-nlu fuzzy center matching', () => {
  for (const c of GUIDE_CENTER_FUZZY_CASES) {
    test(`${c.id}: hint="${c.hint}"`, () => {
      const hit = fuzzyMatchCenterName(c.hint, c.centers);
      expect(hit?.id ?? null).toBe(c.expectId);
    });
  }
});

test.describe('@guide-nlu every flow step has nav-skip + aliases', () => {
  for (const step of FLOW_STEPS) {
    test(`nav-skip exists for ${step.id}`, () => {
      const skip = getNavSkip(step.id);
      expect(skip, step.id).toBeTruthy();
      expect(skip!.title.length).toBeGreaterThan(0);
      expect(skip!.keywords.length).toBeGreaterThan(0);
    });
  }

  test('registry covers all FLOW_STEPS', () => {
    const ids = new Set(NAV_SKIP_REGISTRY.map((s) => s.id));
    for (const step of FLOW_STEPS) {
      expect(ids.has(step.id)).toBe(true);
    }
  });
});

test.describe('@guide-nlu flow status + blockers + slots', () => {
  const ctx = (over: Partial<GuideRuntimeContext> = {}): GuideRuntimeContext => ({
    layoutPrefix: '/director',
    user: null,
    pathname: '/director',
    tournamentId: null,
    eventId: null,
    canCreateTournament: true,
    bowlingCenterCount: 1,
    tournamentCount: 0,
    eventCountForTournament: 0,
    eventComplete: null,
    approvedParticipantCount: 0,
    squadParticipantCount: 0,
    lockedSquadCount: 0,
    lanesAssignedCount: 0,
    scoredGameCount: 0,
    sideActionCount: 0,
    sideActionEntriesLocked: true,
    hasLockGatedSideActions: false,
    skippedSideActions: false,
    completedRoundCount: 0,
    reportsOpened: false,
    saOnlyMode: false,
    ...over,
  });

  test('evaluateFlowStatuses lists available create tournament', () => {
    const statuses = evaluateFlowStatuses(ctx());
    const create = statuses.find((s) => s.id === 'create_tournament');
    expect(create?.available).toBe(true);
  });

  test('siblingNextActions after event', () => {
    const siblings = siblingNextActions(
      ctx({ tournamentId: 1, eventId: 2, eventCountForTournament: 1, tournamentCount: 1 })
    );
    expect(siblings).toEqual(
      expect.arrayContaining(['apply_format', 'side_actions', 'register_participants'])
    );
  });

  test('diagnoseScoringBlockers orders deps', () => {
    const blockers = diagnoseScoringBlockers(
      ctx({
        tournamentId: 1,
        eventId: 2,
        eventCountForTournament: 1,
        approvedParticipantCount: 2,
        squadParticipantCount: 2,
        eventComplete: { rounds: [{ status: 'pending', squads: [] }] } as never,
      })
    );
    expect(blockers[0]?.stepId).toBeTruthy();
  });

  test('slot correction marks dependents stale', () => {
    let session = emptySessionSlots();
    session = patchStepSlots(session, 'create_tournament', { name: 'A' });
    session = patchStepSlots(session, 'create_tournament', { name: 'B' }, { isCorrection: true });
    expect(session.stale.length).toBeGreaterThan(0);
    session = goBackToStep(session, 'create_tournament');
    expect(session.activeStep).toBe('create_tournament');
  });

  test('searchNavSkips finds typo-adjacent query via keyword', () => {
    const hits = searchNavSkips('participants', ctx({ eventId: 1, tournamentId: 1 }));
    expect(hits.some((h) => h.id === 'register_participants')).toBe(true);
  });
});

test.describe('@guide-nlu multi-pack + glossary + participant', () => {
  const now = new Date(2026, 8, 5);

  test('packed tournament→event ignores tournament dates; relative event dates', () => {
    const packed = parsePackedUtterance(
      'Create tournament named Pack Demo from Sep 25 to Sep 30 then create a team event with no reentries for the first 2 days from 9 am to 8 pm',
      now
    );
    expect(packed.actions.map((a) => a.stepId)).toEqual(['create_tournament', 'create_event']);
    expect(packed.actions[0].slots.start_date).toBeUndefined();
    expect(packed.actions[1].slots.event_format).toBe('teams');
    expect(packed.actions[1].slots.allows_reentry).toBe(false);
    const range = parseMonthDayRange('Sep 25 to Sep 30', now)!;
    expect(firstNDaysOfRange(range, 2)?.endYmd).toBe('2026-09-26');
  });

  test('SA + subscription pack returns multi-action queue', () => {
    const packed = parsePackedUtterance(
      'Configure side actions then open subscription',
      now
    );
    expect(packed.actions.length).toBeGreaterThanOrEqual(2);
    expect(packed.summary).toMatch(/Queued/i);
  });

  test('glossary find + explain intent', () => {
    expect(parseUtterance('what does that mean').rawIntent).toBe('explain_field');
    expect(findGlossaryEntry('re-entries')?.key).toBe('allows_reentry');
  });

  test('participant fuzzy exact typo ambiguous + event-B hint', () => {
    const people = [
      { id: 1, userId: 1, displayName: 'Alex Ace' },
      { id: 2, userId: 2, displayName: 'Alex Acre' },
      { id: 3, userId: 3, displayName: 'Morgan Morning' },
    ];
    expect(resolveParticipantOrAmbiguous('Morgan Morning', people).clear?.id).toBe(3);
    expect(resolveParticipantOrAmbiguous('Alex Ac', people).ambiguous.length).toBeGreaterThanOrEqual(
      2
    );
    expect(extractEventNameHint('now for event Baker is Alex there')).toMatch(/baker/i);
    expect(matchDataPoint('what average')?.key).toBe('qualifying_average');
  });

  test('queue completeQueueHead keeps remaining actions', () => {
    let s = emptySessionSlots();
    s = setActionQueue(s, [
      { stepId: 'create_tournament', slots: {}, rawSegment: 't' },
      { stepId: 'create_event', slots: {}, rawSegment: 'e' },
    ]);
    s = completeQueueHead(s, 'create_tournament');
    expect(s.actionQueue.map((a) => a.stepId)).toEqual(['create_event']);
  });
});

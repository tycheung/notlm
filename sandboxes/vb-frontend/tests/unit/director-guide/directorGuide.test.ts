import { describe, expect, it } from 'vitest';
import { parseUtterance } from '@/features/director-guide/intents';
import { evaluateFlowStatuses } from '@/features/director-guide/flowStatus';
import { diagnoseScoringBlockers, siblingNextActions } from '@/features/director-guide/blockers';
import { getNavSkip, searchNavSkips } from '@/features/director-guide/navSkipRegistry';
import { goBackToStep, patchStepSlots, emptySessionSlots } from '@/features/director-guide/slots';
import { getMissingRequiredFill } from '@/features/director-guide/missingRequired';
import { shouldSkipLaunchSpotlight } from '@/features/director-guide/skipLaunchCoach';
import {
  diagnoseTargetFromText,
  inferCurrentStepFromRoute,
  lastMentionedStepFromHistory,
} from '@/features/director-guide/pageContext';
import { GUIDE_IDS } from '@/features/director-guide/guideIds';
import type { GuideRuntimeContext } from '@/features/director-guide/types';

function baseCtx(over: Partial<GuideRuntimeContext> = {}): GuideRuntimeContext {
  return {
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
  };
}

describe('director-guide intents', () => {
  it('maps create tournament utterances', () => {
    const r = parseUtterance('Create a tournament named Friday Night Scratch');
    expect(r.stepId).toBe('create_tournament');
    expect(r.slotPatches.name).toBe('Friday Night Scratch');
  });

  it('detects corrections and center hints', () => {
    const r = parseUtterance('Oh actually it should have been Oakwood Lanes');
    expect(r.isCorrection).toBe(true);
    expect(r.slotPatches.bowling_center_hint).toMatch(/oakwood/i);
  });

  it('detects go back', () => {
    expect(parseUtterance('go back').goBack).toBe(true);
  });

  it('maps take me there and diagnose preventing phrasing', () => {
    expect(parseUtterance('take me there').rawIntent).toBe('whats_next');
    expect(parseUtterance("what's preventing me from scoring").rawIntent).toBe('diagnose_scoring');
  });

  it('does not treat tournament names containing Explain as explain_field', () => {
    const r = parseUtterance('Create a tournament named Explain Keep then create an event');
    expect(r.rawIntent).not.toBe('explain_field');
    expect(r.stepId).toBe('create_tournament');
  });
});

describe('director-guide flow status', () => {
  it('blocks create event until tournament exists', () => {
    const statuses = evaluateFlowStatuses(baseCtx());
    const createEvent = statuses.find((s) => s.id === 'create_event');
    expect(createEvent?.available).toBe(false);
    expect(createEvent?.blockedReason).toMatch(/tournament/i);
  });

  it('allows parallel setup after event exists', () => {
    const ctx = baseCtx({
      tournamentId: 1,
      tournamentCount: 1,
      eventId: 2,
      eventCountForTournament: 1,
    });
    const next = siblingNextActions(ctx);
    expect(next).toContain('apply_format');
    expect(next).toContain('register_participants');
    expect(next).toContain('side_actions');
  });
});

describe('director-guide blockers', () => {
  it('lists lock squad before scoring', () => {
    const blockers = diagnoseScoringBlockers(
      baseCtx({
        tournamentId: 1,
        eventId: 2,
        eventCountForTournament: 1,
        approvedParticipantCount: 4,
        squadParticipantCount: 4,
        eventComplete: { rounds: [{ id: 1, status: 'pending', squads: [] }] } as never,
      })
    );
    expect(blockers.some((b) => b.stepId === 'lock_squads')).toBe(true);
  });
});

describe('director-guide nav skips', () => {
  it('resolves create tournament to tournaments list + modal', () => {
    const skip = getNavSkip('create_tournament')!;
    const resolved = skip.resolve(baseCtx({ canCreateTournament: true }));
    expect(resolved.openModal).toBe('tournamentCreate');
    expect(resolved.spotlight).toBeTruthy();
  });

  it('searches by keyword', () => {
    const hits = searchNavSkips('participants', baseCtx());
    expect(hits.some((h) => h.id === 'register_participants')).toBe(true);
  });
});

describe('director-guide slots', () => {
  it('marks dependents stale on correction', () => {
    let session = emptySessionSlots();
    session = patchStepSlots(session, 'create_tournament', { name: 'A' });
    session = patchStepSlots(session, 'create_tournament', { name: 'B' }, { isCorrection: true });
    expect(session.stale.length).toBeGreaterThan(0);
    session = goBackToStep(session, 'create_tournament');
    expect(session.activeStep).toBe('create_tournament');
  });
});

describe('director-guide missing required + skip launch', () => {
  it('flags empty tournament name as missing fill', () => {
    const missing = getMissingRequiredFill('create_tournament', emptySessionSlots());
    expect(missing?.fieldGuideId).toBe(GUIDE_IDS.TOURNAMENT_NAME);
  });

  it('skips launch spotlight when create tournament form guide-id is in DOM', () => {
    document.body.innerHTML = `<input data-guide-id="${GUIDE_IDS.TOURNAMENT_NAME}" />`;
    const skip = getNavSkip('create_tournament')!;
    const resolved = skip.resolve(baseCtx({ canCreateTournament: true }));
    expect(
      shouldSkipLaunchSpotlight('create_tournament', resolved, '/director/tournaments')
    ).toBe(true);
    document.body.innerHTML = '';
  });
});

describe('director-guide page context', () => {
  it('infers participants tab from route', () => {
    expect(
      inferCurrentStepFromRoute('/director/events/9', '?tab=participants', baseCtx({ eventId: 9 }))
    ).toBe('register_participants');
  });

  it('reads last mentioned step from assistant history', () => {
    const step = lastMentionedStepFromHistory([
      {
        id: '1',
        role: 'assistant',
        text: 'Taking you to “Register participants”.',
        at: 1,
      },
    ]);
    expect(step).toBe('register_participants');
  });

  it('maps diagnose target phrases', () => {
    expect(diagnoseTargetFromText("what's preventing me from lanes")).toBe('assign_lanes');
    expect(diagnoseTargetFromText("why can't I score")).toBe('enter_scores');
  });
});

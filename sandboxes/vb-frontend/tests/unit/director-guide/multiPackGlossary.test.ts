import { describe, expect, it } from 'vitest';
import {
  firstNDaysOfRange,
  nextOccurrenceOfMonthDay,
  parseMonthDayRange,
} from '@/features/director-guide/dateSlots';
import { parsePackedUtterance } from '@/features/director-guide/packUtterance';
import { findGlossaryEntry, formatGlossaryReply } from '@/features/director-guide/fieldGlossary';
import { matchDataPoint } from '@/features/director-guide/dataPointLexicon';
import {
  extractEventNameHint,
  extractPersonNameHint,
  resolveParticipantOrAmbiguous,
} from '@/features/director-guide/participantResolve';
import { completeQueueHead, emptySessionSlots, setActionQueue } from '@/features/director-guide/slots';
import { parseUtterance } from '@/features/director-guide/intents';

describe('dateSlots', () => {
  it('rolls month/day without year to next upcoming occurrence', () => {
    const from = new Date(2026, 8, 5); // Sep 5 2026
    const d = nextOccurrenceOfMonthDay(8, 25, from); // Sep 25
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(25);

    const past = nextOccurrenceOfMonthDay(0, 1, from); // Jan 1 already passed
    expect(past.getFullYear()).toBe(2027);
  });

  it('parses Sep 25–30 range and first 2 days', () => {
    const from = new Date(2026, 8, 5);
    const range = parseMonthDayRange('Sep 25 to Sep 30', from);
    expect(range).toEqual({ startYmd: '2026-09-25', endYmd: '2026-09-30' });
    expect(firstNDaysOfRange(range!, 2)).toEqual({
      startYmd: '2026-09-25',
      endYmd: '2026-09-26',
    });
  });
});

describe('parsePackedUtterance', () => {
  const now = new Date(2026, 8, 5);

  it('queues tournament → event and ignores tournament dates on tournament slots', () => {
    const packed = parsePackedUtterance(
      'Create a tournament named Pack Demo from Sep 25 to Sep 30 at E2E Center then create a team event with no reentries for the first 2 days from 9 am to 8 pm and 3 squads on the first day between 2-4 pm',
      now
    );
    expect(packed.actions.map((a) => a.stepId)).toEqual(['create_tournament', 'create_event']);
    expect(packed.actions[0].slots.name).toMatch(/pack demo/i);
    expect(packed.actions[0].slots.start_date).toBeUndefined();
    expect(packed.actions[0].slots.end_date).toBeUndefined();
    expect(packed.referenceRange).toEqual({ startYmd: '2026-09-25', endYmd: '2026-09-30' });
    expect(packed.actions[1].slots.event_format).toBe('teams');
    expect(packed.actions[1].slots.allows_reentry).toBe(false);
    expect(String(packed.actions[1].slots.start_date)).toMatch(/2026-09-25T09:00/);
    expect(String(packed.actions[1].slots.end_date)).toMatch(/2026-09-26T20:00/);
    expect(packed.actions[1].slots.squad_count).toBe(3);
    expect(packed.summary).toMatch(/Queued/i);
  });

  it('keeps single-action regression via packer', () => {
    const packed = parsePackedUtterance('Create a tournament named Solo', now);
    expect(packed.actions).toHaveLength(1);
    expect(packed.actions[0].stepId).toBe('create_tournament');
    expect(parseUtterance('Create a tournament named Solo').stepId).toBe('create_tournament');
  });

  it('packs SA-only / side-actions phrasing', () => {
    const packed = parsePackedUtterance(
      'Configure side actions for bracket pot then open subscription for passes',
      now
    );
    expect(packed.actions.map((a) => a.stepId)).toEqual(['side_actions', 'billing_ready']);
    expect(packed.actions[0].slots.pot_hint).toBe('bracket');
    expect(packed.actions[1].slots.focus).toBe('passes');
  });
});

describe('field glossary', () => {
  it('resolves explain phrasing aliases', () => {
    expect(parseUtterance('what does that mean').rawIntent).toBe('explain_field');
    expect(parseUtterance("I don't understand").rawIntent).toBe('explain_field');
    const entry = findGlossaryEntry('bowling center');
    expect(entry?.title).toMatch(/bowling center/i);
    expect(formatGlossaryReply(entry!)).toMatch(/alley|venue|house/i);
  });
});

describe('participant resolve + data points', () => {
  const people = [
    { id: 1, userId: 10, displayName: 'Bob Benton' },
    { id: 2, userId: 11, displayName: 'Bob Benson' },
    { id: 3, userId: 12, displayName: 'Alex Ace' },
  ];

  it('clear exact / typo match', () => {
    expect(resolveParticipantOrAmbiguous('Bob Benton', people).clear?.displayName).toBe(
      'Bob Benton'
    );
    expect(resolveParticipantOrAmbiguous('Alex Ace', people).clear?.displayName).toBe('Alex Ace');
  });

  it('ambiguous close names ask for confirm list', () => {
    const r = resolveParticipantOrAmbiguous('Bob Ben', people);
    expect(r.clear).toBeNull();
    expect(r.ambiguous.length).toBeGreaterThanOrEqual(2);
  });

  it('extracts person and event hints; data points never imply chat numbers', () => {
    expect(extractPersonNameHint('where is Bob Benton')).toMatch(/bob benton/i);
    expect(extractEventNameHint('ok now for event Baker, is Bob there')).toMatch(/baker/i);
    expect(matchDataPoint('what average were they')).toMatchObject({
      key: 'qualifying_average',
      stepId: 'register_participants',
    });
    expect(matchDataPoint('show their scores')?.key).toBe('scores');
    expect(parseUtterance('where is Bob Benton').rawIntent).toBe('lookup_participant');
  });
});

describe('action queue durability helpers', () => {
  it('completeQueueHead advances without wiping remaining', () => {
    let s = emptySessionSlots();
    s = setActionQueue(s, [
      { stepId: 'create_tournament', slots: {}, rawSegment: 'a' },
      { stepId: 'create_event', slots: { name: 'E' }, rawSegment: 'b' },
    ]);
    s = completeQueueHead(s, 'create_tournament');
    expect(s.actionQueue).toHaveLength(1);
    expect(s.actionQueue[0].stepId).toBe('create_event');
  });
});

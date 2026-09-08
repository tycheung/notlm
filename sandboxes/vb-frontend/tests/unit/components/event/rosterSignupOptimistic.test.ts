import { describe, expect, it } from 'vitest';
import type {
  RosterSideActionSignupsData,
  RosterSideActionSignupUpdate,
} from '@/api/side-actions';
import { applyOptimisticRosterSignupUpdate } from '@/components/event/rosterSignupOptimistic';

const baseData: RosterSideActionSignupsData = {
  side_actions: [
    {
      side_action_id: 10,
      name: 'Bracket Pot',
      side_action_type: 'bracket',
      entry_fee: 5,
      input_type: 'number',
      max_entries_per_user: 3,
      pools: [
        {
          pool_id: 101,
          squad_id: 201,
          squad_name: 'Squad A',
          entry_fee: 5,
          input_type: 'number',
          max_entries_per_user: 3,
        },
      ],
    },
    {
      side_action_id: 20,
      name: 'High Game',
      side_action_type: 'high_game',
      entry_fee: 10,
      input_type: 'checkbox',
      max_entries_per_user: 1,
      pools: [
        {
          pool_id: 201,
          squad_id: 201,
          squad_name: 'Squad A',
          entry_fee: 10,
          input_type: 'checkbox',
          max_entries_per_user: 1,
        },
      ],
    },
  ],
  rows: [
    {
      user_id: 42,
      participant_id: 1,
      name: 'Pat Bowler',
      signups: {
        '10': {
          quantity: 1,
          entry_ids: [100],
          pools: [
            {
              pool_id: 101,
              squad_id: 201,
              squad_name: 'Squad A',
              quantity: 1,
              entry_ids: [100],
              paid_count: 0,
              is_eligible: true,
            },
          ],
        },
        '20': {
          quantity: 0,
          entry_ids: [],
          pools: [
            {
              pool_id: 201,
              squad_id: 201,
              squad_name: 'Squad A',
              quantity: 0,
              entry_ids: [],
              paid_count: 0,
              is_eligible: true,
            },
          ],
        },
      },
      total_owed: 5,
      total_paid: 0,
    },
  ],
};

describe('applyOptimisticRosterSignupUpdate', () => {
  it('updates quantity and owed immediately', () => {
    const request: RosterSideActionSignupUpdate = {
      tournament_id: 1,
      event_id: 2,
      user_id: 42,
      side_action_id: 10,
      pool_id: 101,
      quantity: 3,
      is_all: false,
    };
    const next = applyOptimisticRosterSignupUpdate(baseData, request);
    const pool = next.rows[0].signups['10'].pools[0];
    expect(pool.quantity).toBe(3);
    expect(pool.is_all).toBe(false);
    expect(next.rows[0].total_owed).toBe(15);
  });

  it('marks All intent as non-billable', () => {
    const request: RosterSideActionSignupUpdate = {
      tournament_id: 1,
      event_id: 2,
      user_id: 42,
      side_action_id: 10,
      pool_id: 101,
      is_all: true,
    };
    const withEstimate: RosterSideActionSignupsData = {
      ...baseData,
      rows: [
        {
          ...baseData.rows[0],
          signups: {
            ...baseData.rows[0].signups,
            '10': {
              ...baseData.rows[0].signups['10'],
              pools: [
                {
                  ...baseData.rows[0].signups['10'].pools[0],
                  all_estimate: 47,
                },
              ],
            },
          },
        },
      ],
    };
    const next = applyOptimisticRosterSignupUpdate(withEstimate, request);
    const pool = next.rows[0].signups['10'].pools[0];
    expect(pool.is_all).toBe(true);
    expect(pool.quantity).toBe(47);
    expect(next.rows[0].total_owed).toBe(0);
  });

  it('enrolls checkbox pots and updates paid', () => {
    const enrolled = applyOptimisticRosterSignupUpdate(baseData, {
      tournament_id: 1,
      event_id: 2,
      user_id: 42,
      side_action_id: 20,
      pool_id: 201,
      enrolled: true,
    });
    expect(enrolled.rows[0].signups['20'].pools[0].quantity).toBe(1);
    expect(enrolled.rows[0].total_owed).toBe(15);

    const paid = applyOptimisticRosterSignupUpdate(enrolled, {
      tournament_id: 1,
      event_id: 2,
      user_id: 42,
      total_paid: 15,
    });
    expect(paid.rows[0].total_paid).toBe(15);
  });

  it('defers enroll-all to the server instead of simulating every pot', () => {
    const next = applyOptimisticRosterSignupUpdate(baseData, {
      tournament_id: 1,
      event_id: 2,
      user_id: 42,
      enroll_all_eligible_sidepots: true,
    });
    expect(next.rows[0].signups['20'].pools[0].quantity).toBe(0);
    expect(next.rows[0].total_owed).toBe(5);
  });
});

describe('formatRosterSignupSaveError', () => {
  it('names the bowler and pot when the API message is generic', async () => {
    const { formatRosterSignupSaveError } = await import(
      '@/components/event/rosterSignupOptimistic'
    );
    const message = formatRosterSignupSaveError(
      new Error("Validation error in field 'roster_signup': User is not eligible for this squad pool"),
      {
        tournament_id: 1,
        event_id: 2,
        user_id: 42,
        side_action_id: 10,
        pool_id: 101,
        quantity: 1,
      },
      baseData
    );
    expect(message).toMatch(/Pat Bowler/);
    expect(message).toMatch(/Bracket Pot/);
    expect(message).toMatch(/Squad A/);
    expect(message).not.toMatch(/roster_signup/i);
  });

  it('keeps backend messages that already name the bowler', async () => {
    const { formatRosterSignupSaveError } = await import(
      '@/components/event/rosterSignupOptimistic'
    );
    const backend =
      'Pat Bowler is not eligible for “Bracket Pot” (Squad A). Check eligibility rules or squad assignment.';
    const message = formatRosterSignupSaveError(
      new Error(`Signup: ${backend}`),
      {
        tournament_id: 1,
        event_id: 2,
        user_id: 42,
        side_action_id: 10,
        pool_id: 101,
      },
      baseData
    );
    expect(message).toBe(backend);
  });
});

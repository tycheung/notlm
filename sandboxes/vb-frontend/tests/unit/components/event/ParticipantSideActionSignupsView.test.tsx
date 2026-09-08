import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ParticipantSideActionSignupsView from '@/components/event/ParticipantSideActionSignupsView';
import { SideActionsAPI } from '@/api/side-actions';
import { sideActionQueryKeys } from '@/features/side-actions/shared';

vi.mock('@/api/side-actions', () => ({
  SideActionsAPI: {
    getRosterSignups: vi.fn(),
    updateRosterSignup: vi.fn(),
  },
}));

afterEach(cleanup);

const rosterPayload = {
  side_actions: [
    {
      side_action_id: 10,
      name: 'Bracket Pot',
      side_action_type: 'bracket',
      entry_fee: 5,
      input_type: 'number' as const,
      max_entries_per_user: 3,
      pools: [
        {
          pool_id: 101,
          squad_id: 201,
          squad_name: 'Squad A',
          entry_fee: 5,
          input_type: 'number' as const,
          max_entries_per_user: 3,
        },
        {
          pool_id: 102,
          squad_id: 202,
          squad_name: 'Squad B',
          entry_fee: 5,
          input_type: 'number' as const,
          max_entries_per_user: 3,
        },
      ],
    },
  ],
  rows: [
    {
      user_id: 42,
      participant_id: 1,
      name: 'Pat Bowler',
      email: 'pat@example.com',
      usbc_id: '1234',
      qualifying_average: 198.5,
      squad_ids: [201, 202],
      signups: {
        '10': {
          quantity: 2,
          entry_ids: [100, 101],
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
            {
              pool_id: 102,
              squad_id: 202,
              squad_name: 'Squad B',
              quantity: 1,
              entry_ids: [101],
              paid_count: 0,
              is_eligible: true,
            },
          ],
        },
      },
      total_owed: 10,
      total_paid: 0,
    },
  ],
};

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <ParticipantSideActionSignupsView tournamentId={1} eventId={2} />
    </QueryClientProvider>
  );
  return { ...view, client };
}

describe('ParticipantSideActionSignupsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(SideActionsAPI.getRosterSignups).mockResolvedValue(rosterPayload);
    vi.mocked(SideActionsAPI.updateRosterSignup).mockResolvedValue(rosterPayload);
  });

  it('applies quantity changes optimistically before the save resolves', async () => {
    let resolveSave!: (value: typeof rosterPayload) => void;
    vi.mocked(SideActionsAPI.updateRosterSignup).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSave = resolve;
      })
    );
    const { client } = renderView();
    expect(await screen.findByText('Pat Bowler')).toBeInTheDocument();
    const qtyInput = screen.getByLabelText(
      'Bracket Pot Squad A entries for Pat Bowler'
    ) as HTMLInputElement;

    fireEvent.change(qtyInput, { target: { value: '3' } });
    fireEvent.blur(qtyInput);

    await waitFor(() => {
      const cached = client.getQueryData(
        sideActionQueryKeys.rosterSignups(1, 2)
      ) as typeof rosterPayload;
      expect(cached.rows[0].signups['10'].pools[0].quantity).toBe(3);
      expect(cached.rows[0].total_owed).toBe(20);
    });
    expect(qtyInput).toHaveValue(3);

    const serverResult = {
      ...rosterPayload,
      rows: [
        {
          ...rosterPayload.rows[0],
          total_owed: 15,
          signups: {
            '10': {
              quantity: 3,
              entry_ids: [1, 2, 3],
              pools: [
                {
                  ...rosterPayload.rows[0].signups['10'].pools[0],
                  quantity: 3,
                  entry_ids: [1, 2, 3],
                },
                rosterPayload.rows[0].signups['10'].pools[1],
              ],
            },
          },
        },
      ],
    };
    await act(async () => resolveSave(serverResult));
  });

  it('keeps signup cells editable while a save is in flight', async () => {
    let resolveSave!: (value: typeof rosterPayload) => void;
    vi.mocked(SideActionsAPI.updateRosterSignup).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSave = resolve;
      })
    );
    renderView();
    expect(await screen.findByText('Pat Bowler')).toBeInTheDocument();
    const squadA = screen.getByLabelText(
      'Bracket Pot Squad A entries for Pat Bowler'
    );
    const paidInput = document.querySelector<HTMLInputElement>('input[name="paid-42"]')!;

    fireEvent.change(squadA, { target: { value: '2' } });
    fireEvent.blur(squadA);

    await waitFor(() =>
      expect(SideActionsAPI.updateRosterSignup).toHaveBeenCalledTimes(1)
    );
    expect(paidInput).not.toBeDisabled();
    paidInput.focus();
    expect(document.activeElement).toBe(paidInput);

    await act(async () => resolveSave(rosterPayload));
  });

  it('moves focus to the next cell on Enter', async () => {
    renderView();
    expect(await screen.findByText('Pat Bowler')).toBeInTheDocument();
    const squadA = screen.getByLabelText(
      'Bracket Pot Squad A entries for Pat Bowler'
    ) as HTMLInputElement;
    const paidInput = document.querySelector<HTMLInputElement>('input[name="paid-42"]')!;

    squadA.focus();
    fireEvent.change(squadA, { target: { value: '2' } });
    fireEvent.keyDown(squadA, { key: 'Enter' });

    await waitFor(() => expect(document.activeElement).toBe(paidInput));
  });

  it('clamps bracket quantity on blur before saving', async () => {
    renderView();
    expect(await screen.findByText('Pat Bowler')).toBeInTheDocument();

    const qtyInput = screen.getByLabelText(
      'Bracket Pot Squad A entries for Pat Bowler'
    );
    expect(
      screen.queryByLabelText('Bracket Pot Squad B entries for Pat Bowler')
    ).not.toBeInTheDocument();
    fireEvent.change(qtyInput, { target: { value: '9' } });
    fireEvent.blur(qtyInput);

    await waitFor(() => {
      expect(SideActionsAPI.updateRosterSignup).toHaveBeenCalledWith({
        tournament_id: 1,
        event_id: 2,
        user_id: 42,
        side_action_id: 10,
        pool_id: 101,
        quantity: 3,
        is_all: false,
      });
    });
  });

  it('surfaces qualifying average next to the bowler name', async () => {
    renderView();
    expect(await screen.findByText('Pat Bowler')).toBeInTheDocument();
    expect(screen.getByText(/Avg 198\.5/)).toBeInTheDocument();
  });

  it('sorts the participant list by first name, last name, or team name', async () => {
    vi.mocked(SideActionsAPI.getRosterSignups).mockResolvedValue({
      ...rosterPayload,
      side_actions: [
        {
          ...rosterPayload.side_actions[0],
          pools: [rosterPayload.side_actions[0].pools[0]],
        },
      ],
      rows: [
        {
          ...rosterPayload.rows[0],
          user_id: 1,
          name: 'Pat Bowler',
          team_name: 'Zebras',
          team_id: 9,
          squad_ids: [201],
          signups: {
            '10': {
              quantity: 0,
              entry_ids: [],
              pools: [
                {
                  pool_id: 101,
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
        },
        {
          ...rosterPayload.rows[0],
          user_id: 2,
          name: 'Alex Archer',
          team_name: 'Aces',
          team_id: 8,
          squad_ids: [201],
          signups: {
            '10': {
              quantity: 0,
              entry_ids: [],
              pools: [
                {
                  pool_id: 101,
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
        },
      ],
    });
    renderView();
    expect(await screen.findByText('Alex Archer')).toBeInTheDocument();
    const sortSelect = screen.getByLabelText('Sort participants');
    expect(sortSelect).toHaveValue('last_name');

    const names = () =>
      screen.getAllByText(/Archer|Bowler/).map((node) => node.textContent);

    fireEvent.change(sortSelect, { target: { value: 'first_name' } });
    expect(names()[0]).toMatch(/Alex Archer/);

    fireEvent.change(sortSelect, { target: { value: 'team_name' } });
    expect(names()[0]).toMatch(/Alex Archer/);
    expect(screen.getByText('Aces')).toBeInTheDocument();
  });

  it('requires a squad and shows an empty state when nobody is assigned', async () => {
    vi.mocked(SideActionsAPI.getRosterSignups).mockResolvedValue({
      ...rosterPayload,
      rows: [
        {
          ...rosterPayload.rows[0],
          squad_ids: [],
        },
      ],
    });
    renderView();
    expect(
      await screen.findByText(/Assign bowlers to squads before signing them up/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Squad')).toHaveValue('201');
    expect(screen.queryByText('Pat Bowler')).not.toBeInTheDocument();
  });

  it('sets bracket All intent without a finite quantity', async () => {
    renderView();
    expect(await screen.findByText('Pat Bowler')).toBeInTheDocument();
    const allButtons = screen.getAllByRole('button', { name: /^All$/i });
    // Bracket All buttons first (one per pool); All Sidepots absent without checkbox pots
    fireEvent.click(allButtons[0]);

    await waitFor(() => {
      expect(SideActionsAPI.updateRosterSignup).toHaveBeenCalledWith({
        tournament_id: 1,
        event_id: 2,
        user_id: 42,
        side_action_id: 10,
        pool_id: 101,
        is_all: true,
      });
    });
  });

  it('displays all_estimate when All intent quantity is zero', async () => {
    const withEstimate = {
      ...rosterPayload,
      rows: [
        {
          ...rosterPayload.rows[0],
          total_owed: 0,
          signups: {
            '10': {
              quantity: 1,
              entry_ids: [999],
              pools: [
                {
                  pool_id: 101,
                  squad_id: 201,
                  squad_name: 'Squad A',
                  quantity: 0,
                  entry_ids: [999],
                  paid_count: 0,
                  is_eligible: true,
                  is_all: true,
                  all_estimate: 47,
                },
                {
                  pool_id: 102,
                  squad_id: 202,
                  squad_name: 'Squad B',
                  quantity: 0,
                  entry_ids: [],
                  paid_count: 0,
                  is_eligible: true,
                },
              ],
            },
          },
        },
      ],
    };
    vi.mocked(SideActionsAPI.getRosterSignups).mockResolvedValue(withEstimate);
    vi.mocked(SideActionsAPI.updateRosterSignup).mockResolvedValue(withEstimate);
    renderView();
    const qtyInput = await screen.findByLabelText(
      'Bracket Pot Squad A entries for Pat Bowler'
    );
    expect(qtyInput).toHaveValue(47);
    expect(qtyInput).toHaveAttribute(
      'title',
      'All — estimate if generated now (47)'
    );
  });

  it('enrolls all eligible sidepots from the All Sidepots column', async () => {
    const withSidepot = {
      side_actions: [
        ...rosterPayload.side_actions,
        {
          side_action_id: 20,
          name: 'High Game',
          side_action_type: 'high_game',
          entry_fee: 10,
          input_type: 'checkbox' as const,
          max_entries_per_user: 1,
          pools: [
            {
              pool_id: 201,
              squad_id: 201,
              squad_name: 'Squad A',
              entry_fee: 10,
              input_type: 'checkbox' as const,
              max_entries_per_user: 1,
            },
          ],
        },
      ],
      rows: [
        {
          ...rosterPayload.rows[0],
          signups: {
            ...rosterPayload.rows[0].signups,
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
        },
      ],
    };
    vi.mocked(SideActionsAPI.getRosterSignups).mockResolvedValue(withSidepot);
    vi.mocked(SideActionsAPI.updateRosterSignup).mockResolvedValue(withSidepot);
    renderView();
    expect(await screen.findByText('All Sidepots')).toBeInTheDocument();
    fireEvent.click(
      screen.getByTitle(
        'Check all eligible single-entry side pots for this bowler'
      )
    );

    await waitFor(() => {
      expect(SideActionsAPI.updateRosterSignup).toHaveBeenCalledWith({
        tournament_id: 1,
        event_id: 2,
        user_id: 42,
        enroll_all_eligible_sidepots: true,
      });
    });
  });

  it('does not overwrite an in-progress payment edit with refreshed roster data', async () => {
    const { client } = renderView();
    expect(await screen.findByText('Pat Bowler')).toBeInTheDocument();
    const paidInput = document.querySelector<HTMLInputElement>('input[name="paid-42"]')!;

    fireEvent.focus(paidInput);
    fireEvent.change(paidInput, { target: { value: '7.25' } });
    client.setQueryData(sideActionQueryKeys.rosterSignups(1, 2), {
      ...rosterPayload,
      rows: [{ ...rosterPayload.rows[0], total_paid: 2 }],
    });

    await waitFor(() => expect(paidInput).toHaveValue(7.25));
  });

  it('keeps the newest roster response when mutations resolve out of order', async () => {
    let resolveFirst!: (value: typeof rosterPayload) => void;
    let resolveSecond!: (value: typeof rosterPayload) => void;
    vi.mocked(SideActionsAPI.updateRosterSignup)
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve; }));
    const { client } = renderView();
    expect(await screen.findByText('Pat Bowler')).toBeInTheDocument();
    const squadA = screen.getByLabelText(
      'Bracket Pot Squad A entries for Pat Bowler'
    );
    fireEvent.change(squadA, { target: { value: '2' } });
    fireEvent.blur(squadA);
    fireEvent.change(squadA, { target: { value: '3' } });
    fireEvent.blur(squadA);
    await waitFor(() =>
      expect(SideActionsAPI.updateRosterSignup).toHaveBeenCalledTimes(2)
    );

    const current = {
      ...rosterPayload,
      rows: [{ ...rosterPayload.rows[0], name: 'Current Bowler' }],
    };
    const stale = {
      ...rosterPayload,
      rows: [{ ...rosterPayload.rows[0], name: 'Stale Bowler' }],
    };
    // Mutations always invalidate; subsequent roster GETs must reflect newest SSOT
    // so a stale setQueryData path cannot hide behind the original fixture.
    vi.mocked(SideActionsAPI.getRosterSignups).mockResolvedValue(current);

    await act(async () => resolveSecond(current));
    await act(async () => resolveFirst(stale));

    await waitFor(() => {
      expect(
        client.getQueryData(sideActionQueryKeys.rosterSignups(1, 2))
      ).toEqual(current);
    });
    expect(
      client.getQueryData(sideActionQueryKeys.rosterSignups(1, 2))
    ).not.toEqual(stale);
  });

  it('puts team-pot entries on the team line and bowler-pot entries on bowler lines', async () => {
    const mixed = {
      side_actions: [
        {
          side_action_id: 20,
          name: 'High Game',
          side_action_type: 'high_game',
          entry_unit: 'bowler',
          entry_fee: 10,
          input_type: 'checkbox' as const,
          max_entries_per_user: 1,
          pools: [
            {
              pool_id: 201,
              squad_id: 201,
              squad_name: 'Squad A',
              entry_fee: 10,
              input_type: 'checkbox' as const,
              max_entries_per_user: 1,
            },
          ],
        },
        {
          side_action_id: 30,
          name: 'Team High Game',
          side_action_type: 'high_game',
          entry_unit: 'team',
          entry_fee: 25,
          input_type: 'checkbox' as const,
          max_entries_per_user: 1,
          pools: [
            {
              pool_id: 301,
              squad_id: 201,
              squad_name: 'Squad A',
              entry_fee: 25,
              input_type: 'checkbox' as const,
              max_entries_per_user: 1,
            },
          ],
        },
      ],
      rows: [
        {
          user_id: 1,
          participant_id: 1,
          name: 'John Smith',
          email: 'john@example.com',
          usbc_id: '1111',
          team_id: 5,
          team_name: 'Aces',
          squad_ids: [201],
          signups: {
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
            '30': {
              quantity: 1,
              entry_ids: [9],
              pools: [
                {
                  pool_id: 301,
                  squad_id: 201,
                  squad_name: 'Squad A',
                  quantity: 1,
                  entry_ids: [9],
                  paid_count: 0,
                  is_eligible: true,
                  team_has_entry: true,
                  team_entry_holder_user_id: 1,
                },
              ],
            },
          },
          total_owed: 25,
          total_paid: 0,
        },
        {
          user_id: 2,
          participant_id: 2,
          name: 'Jane Doe',
          email: 'jane@example.com',
          usbc_id: '2222',
          team_id: 5,
          team_name: 'Aces',
          squad_ids: [201],
          signups: {
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
            '30': {
              quantity: 0,
              entry_ids: [],
              pools: [
                {
                  pool_id: 301,
                  squad_id: 201,
                  squad_name: 'Squad A',
                  quantity: 0,
                  entry_ids: [],
                  paid_count: 0,
                  is_eligible: true,
                  team_has_entry: true,
                  team_entry_holder_user_id: 1,
                },
              ],
            },
          },
          total_owed: 0,
          total_paid: 0,
        },
      ],
    };
    vi.mocked(SideActionsAPI.getRosterSignups).mockResolvedValue(mixed);
    renderView();
    expect(await screen.findByText('Aces')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();

    expect(
      screen.getByLabelText('Team High Game Squad A for Aces')
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('High Game Squad A for Aces')
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText('High Game Squad A for John Smith')
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('High Game Squad A for Jane Doe')
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Team High Game Squad A for John Smith')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Team High Game Squad A for Jane Doe')
    ).not.toBeInTheDocument();
  });
});

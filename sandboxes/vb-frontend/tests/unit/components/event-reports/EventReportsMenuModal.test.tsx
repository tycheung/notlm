import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import EventReportsMenuModal from '@/components/event-reports/EventReportsMenuModal';
import { EventReportsAPI } from '@/api/event-reports';
import { EventsAPI } from '@/api/events';
import { downloadBlob, downloadBlobFromLoader } from '@/utils/downloadBlob';

vi.mock('@/api/event-reports', () => ({
  EventReportsAPI: {
    getStandingsReport: vi.fn(),
    getRosterReport: vi.fn(),
    getFinancialsReport: vi.fn(),
    getSideActionFinancialsReport: vi.fn(),
    getSingleGameResultsReport: vi.fn(),
    getPrizeFundReport: vi.fn(),
    getScoreSheetsReport: vi.fn(),
    getLaneAssignmentSheetsReport: vi.fn(),
    downloadScoresExcel: vi.fn(),
  },
}));

vi.mock('@/api/events', () => ({
  EventsAPI: {
    getTournamentEvents: vi.fn(),
    getEventWithRounds: vi.fn(),
  },
}));

vi.mock('@/components/side_actions/reports/SideActionReportPreviewModal', () => ({
  default: ({ isOpen, title }: { isOpen: boolean; title: string }) =>
    isOpen ? <div data-testid="preview">{title}</div> : null,
}));

vi.mock('@/utils/downloadBlob', () => ({
  downloadBlob: vi.fn().mockResolvedValue({ status: 'saved', filename: 'standings.csv' }),
  downloadBlobFromLoader: vi.fn().mockResolvedValue({ status: 'saved', filename: 'scores.csv' }),
}));

afterEach(cleanup);

describe('EventReportsMenuModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(EventsAPI.getTournamentEvents).mockResolvedValue([
      { id: 1, number_of_rounds: 3, event_format: 'singles' } as never,
    ]);
    vi.mocked(EventsAPI.getEventWithRounds).mockResolvedValue({
      id: 1,
      rounds: [{ id: 1, round_number: 1, competition_method_config: { game_style: 'standard' } }],
    } as never);
    vi.mocked(EventReportsAPI.getSingleGameResultsReport).mockResolvedValue({
      report_type: 'single_game',
      tournament_id: 9,
      tournament_name: 'Open',
      scope: 'event',
      basis: 'round',
      round_number: 1,
      game_number: 2,
      include_prizes: false,
      include_handicap: true,
      show_cut_line: false,
      sections: [],
    } as never);
    vi.mocked(EventReportsAPI.getSideActionFinancialsReport).mockResolvedValue({
      report_type: 'side_action_financials',
      tournament_id: 9,
      tournament_name: 'Open',
      scope: 'event',
      event_id: 42,
      totals: {
        side_action_count: 1,
        entry_count: 8,
        intake: 40,
        fees: 8,
        payouts: 32,
        refunds: 0,
        net: 0,
      },
      sections: [
        {
          event_id: 42,
          event_name: 'Singles',
          totals: {
            side_action_count: 1,
            entry_count: 8,
            intake: 40,
            fees: 8,
            payouts: 32,
            refunds: 0,
            net: 0,
          },
          side_actions: [
            {
              side_action_id: 1,
              name: 'Brackets',
              side_action_type: 'bracket',
              status: 'in_progress',
              is_projected: true,
              entry_fee: 5,
              entry_count: 8,
              intake: 40,
              fees: 8,
              payouts: 32,
              refunds: 0,
              net: 0,
              prize_summary: '1st=$25.00 · 2nd=$10.00',
            },
          ],
        },
      ],
    } as never);
    vi.mocked(EventReportsAPI.getPrizeFundReport).mockResolvedValue({
      report_type: 'prize_fund',
      tournament_id: 9,
      tournament_name: 'Open',
      scope: 'event',
      event_id: 42,
      include_fund_summary: true,
      include_winners: true,
      sections: [
        {
          event_id: 42,
          event_name: 'Singles',
          event_format: 'singles',
          winners_available: false,
          include_winners: false,
          fund_summary: {
            approved_entries: 16,
            entry_fee: 50,
            added_money: 0,
            house_cut_type: 'percentage',
            house_cut_percentage: 20,
            house_cut_amount: null,
            house_cut_total: 160,
            lineage_fee_mode: 'flat',
            lineage_per_game: 0,
            lineage_amount: 0,
            lineage_games: 0,
            lineage_max_games: 0,
            lineage_billed_games: null,
            lineage_total: 0,
            net_prize_pool: 640,
          },
          rows: [
            {
              place: 1,
              place_label: '1st',
              amount: 300,
              display_name: null,
              is_team_row: false,
              bowlers: [],
            },
          ],
        },
      ],
    } as never);
    vi.mocked(EventReportsAPI.getScoreSheetsReport).mockResolvedValue({
      report_type: 'score_sheets',
      tournament_id: 9,
      tournament_name: 'Open',
      event_id: 42,
      event_name: 'Singles',
      event_format: 'singles',
      round_id: 1,
      round_number: 1,
      game_count: 3,
      max_games_per_page: 8,
      layout: 'bowler',
      include_individual_handicap: true,
      include_team_handicap: false,
      sheets: [],
    } as never);
    vi.mocked(EventReportsAPI.getFinancialsReport).mockResolvedValue({
      report_type: 'event_financials',
      tournament_id: 9,
      tournament_name: 'Open',
      event_id: 42,
      event_name: 'Singles',
      event_format: 'singles',
      approved_entries: 2,
      reentry_count: 0,
      entry_fee: 100,
      reentry_fee: null,
      entry_fees_billed: 200,
      amount_collected: 200,
      balance_due: 0,
      added_money: 0,
      house_cut_type: 'percentage',
      house_cut_percentage: 20,
      house_cut_amount: null,
      house_cut_total: 40,
      lineage_fee_mode: 'flat',
      lineage_per_game: 0,
      lineage_amount: 0,
      lineage_games: 0,
      lineage_max_games: 0,
      lineage_billed_games: null,
      lineage_total: 0,
      net_prize_pool: 160,
      prizes_allocated: 160,
      unallocated: 0,
      lineage_bundled_in_house_cut: false,
      prize_lines: [{ place: 1, place_label: '1st Place', amount: 160 }],
    } as never);
    vi.mocked(EventReportsAPI.getRosterReport).mockResolvedValue({
      report_type: 'event_roster',
      tournament_id: 9,
      tournament_name: 'Open',
      event_id: 42,
      event_name: 'Singles',
      event_format: 'singles',
      scope: 'event',
      squad_id: null,
      squad_name: null,
      include_checkin: true,
      include_usbc: true,
      include_average: true,
      include_handicap: true,
      include_lane: true,
      include_paid: true,
      rows: [],
    } as never);
    vi.mocked(EventReportsAPI.getStandingsReport).mockResolvedValue({
      report_type: 'event_standings',
      tournament_id: 9,
      tournament_name: 'Open',
      scope: 'event',
      basis: 'final',
      round_number: null,
      include_prizes: false,
      include_handicap: true,
      sections: [
        {
          event_id: 42,
          event_name: 'Singles',
          event_format: 'singles',
          basis_label: 'Final',
          round_id: 1,
          round_number: 1,
          squad_id: null,
          squad_name: null,
          is_complete: true,
          includes_bonus: false,
          note: null,
          rows: [],
        },
      ],
    } as never);
  });

  it('posts event-scoped standings with expected body', async () => {
    render(
      <EventReportsMenuModal
        isOpen
        onClose={() => undefined}
        tournamentId={9}
        eventId={42}
        eventName="Singles"
        eventFormat="singles"
        rounds={[{ id: 1, round_number: 1 }]}
        squads={[]}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Configure' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Preview standings' }));

    await waitFor(() => {
      expect(EventReportsAPI.getStandingsReport).toHaveBeenCalledWith({
        tournament_id: 9,
        event_id: 42,
        squad_id: null,
        scope: 'event',
        basis: 'final',
        round_number: null,
        include_prizes: false,
        include_handicap: true,
        show_cut_line: false,
      });
    });
    expect(await screen.findByTestId('preview')).toBeInTheDocument();
  });

  it('surfaces tournament round-list load failures', async () => {
    vi.mocked(EventsAPI.getTournamentEvents).mockRejectedValueOnce(
      new Error('Network down')
    );
    render(
      <EventReportsMenuModal
        isOpen
        onClose={() => undefined}
        tournamentId={9}
        tournamentName="Open"
        defaultScope="tournament"
      />
    );

    expect(
      await screen.findByText(/Network down|Could not load tournament events/i)
    ).toBeInTheDocument();
  });

  it('disables individual team scores for baker-only events', async () => {
    render(
      <EventReportsMenuModal
        isOpen
        onClose={() => undefined}
        tournamentId={9}
        eventId={5}
        eventName="Baker"
        eventFormat="teams"
        rounds={[
          {
            id: 10,
            round_number: 1,
            competition_method_config: { game_style: 'baker' },
          },
        ]}
        squads={[]}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Configure' })[0]);
    const checkbox = screen.getByRole('checkbox', {
      name: /Show individual scores on team standings/i,
    });
    expect(checkbox).toBeDisabled();
    expect(
      screen.getByText(/Not available when every round is Baker/i)
    ).toBeInTheDocument();
  });

  it('posts event roster with check-in columns', async () => {
    render(
      <EventReportsMenuModal
        isOpen
        onClose={() => undefined}
        tournamentId={9}
        eventId={42}
        eventName="Singles"
        eventFormat="singles"
        rounds={[{ id: 1, round_number: 1 }]}
        squads={[]}
      />
    );

    const rosterCard = screen.getByText('Event Roster').closest('li');
    expect(rosterCard).toBeTruthy();
    fireEvent.click(within(rosterCard as HTMLElement).getByRole('button', { name: 'Configure' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview roster' }));

    await waitFor(() => {
      expect(EventReportsAPI.getRosterReport).toHaveBeenCalledWith({
        tournament_id: 9,
        event_id: 42,
        squad_id: null,
        scope: 'event',
        include_checkin: true,
        include_usbc: true,
        include_average: true,
        include_handicap: true,
        include_lane: true,
        include_paid: true,
      });
    });
    expect(await screen.findByTestId('preview')).toBeInTheDocument();
  });

  it('greys competition reports on side action only events but keeps roster', () => {
    render(
      <EventReportsMenuModal
        isOpen
        onClose={() => undefined}
        tournamentId={9}
        eventId={42}
        eventName="Singles"
        eventFormat="singles"
        rounds={[{ id: 1, round_number: 1 }]}
        squads={[]}
        isSaOnly
      />
    );

    expect(
      screen.getByText(/Competition reports are locked on side action only events/i)
    ).toBeInTheDocument();
    const standingsCard = screen.getByText('Standings').closest('li');
    expect(
      within(standingsCard as HTMLElement).getByRole('button', { name: 'Configure' })
    ).toBeDisabled();
    const rosterCardSa = screen.getByText('Event Roster').closest('li');
    expect(
      within(rosterCardSa as HTMLElement).getByRole('button', { name: 'Configure' })
    ).not.toBeDisabled();
  });

  it('previews event financials from the menu', async () => {
    render(
      <EventReportsMenuModal
        isOpen
        onClose={() => undefined}
        tournamentId={9}
        eventId={42}
        eventName="Singles"
        eventFormat="singles"
        rounds={[{ id: 1, round_number: 1 }]}
        squads={[]}
      />
    );

    const financialsCard = screen.getByText('Event Financials').closest('li');
    expect(financialsCard).toBeTruthy();
    fireEvent.click(
      within(financialsCard as HTMLElement).getByRole('button', { name: 'Preview' })
    );

    await waitFor(() => {
      expect(EventReportsAPI.getFinancialsReport).toHaveBeenCalledWith({
        tournament_id: 9,
        event_id: 42,
      });
    });
    expect(await screen.findByTestId('preview')).toBeInTheDocument();
  });

  it('previews side action financials from the menu', async () => {
    render(
      <EventReportsMenuModal
        isOpen
        onClose={() => undefined}
        tournamentId={9}
        eventId={42}
        eventName="Singles"
        eventFormat="singles"
        rounds={[{ id: 1, round_number: 1 }]}
        squads={[]}
      />
    );

    const saFinancialsCard = screen.getByText('Side Action Financials').closest('li');
    expect(saFinancialsCard).toBeTruthy();
    fireEvent.click(
      within(saFinancialsCard as HTMLElement).getByRole('button', { name: 'Preview' })
    );

    await waitFor(() => {
      expect(EventReportsAPI.getSideActionFinancialsReport).toHaveBeenCalledWith({
        tournament_id: 9,
        event_id: 42,
        scope: 'event',
      });
    });
    expect(await screen.findByTestId('preview')).toBeInTheDocument();
  });

  it('posts single game results with round and game', async () => {
    render(
      <EventReportsMenuModal
        isOpen
        onClose={() => undefined}
        tournamentId={9}
        eventId={42}
        eventName="Singles"
        eventFormat="singles"
        rounds={[{ id: 1, round_number: 1, game_count: 3 }]}
        squads={[]}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Configure' })[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Preview game results' }));

    await waitFor(() => {
      expect(EventReportsAPI.getSingleGameResultsReport).toHaveBeenCalledWith({
        tournament_id: 9,
        event_id: 42,
        squad_id: null,
        scope: 'event',
        round_number: 1,
        game_number: 1,
        include_handicap: true,
      });
    });
    expect(await screen.findByTestId('preview')).toBeInTheDocument();
  });

  it('posts prize fund with fund summary and winners options', async () => {
    render(
      <EventReportsMenuModal
        isOpen
        onClose={() => undefined}
        tournamentId={9}
        eventId={42}
        eventName="Singles"
        eventFormat="singles"
        rounds={[{ id: 1, round_number: 1 }]}
        squads={[]}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Configure' })[2]);
    fireEvent.click(screen.getByRole('button', { name: 'Preview prize fund' }));

    await waitFor(() => {
      expect(EventReportsAPI.getPrizeFundReport).toHaveBeenCalledWith({
        tournament_id: 9,
        event_id: 42,
        scope: 'event',
        include_fund_summary: true,
        include_winners: true,
      });
    });
    expect(await screen.findByTestId('preview')).toBeInTheDocument();
  });

  it('posts score sheets for a round with bowler layout', async () => {
    render(
      <EventReportsMenuModal
        isOpen
        onClose={() => undefined}
        tournamentId={9}
        eventId={42}
        eventName="Singles"
        eventFormat="singles"
        rounds={[{ id: 1, round_number: 1, game_count: 3 }]}
        squads={[]}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Configure' })[3]);
    fireEvent.click(screen.getByRole('button', { name: 'Preview score sheets' }));

    await waitFor(() => {
      expect(EventReportsAPI.getScoreSheetsReport).toHaveBeenCalledWith({
        tournament_id: 9,
        event_id: 42,
        round_number: 1,
        layout: 'bowler',
        squad_id: null,
        include_individual_handicap: true,
        include_team_handicap: true,
      });
    });
    expect(await screen.findByTestId('preview')).toBeInTheDocument();
  });

  it('downloads Excel standings and all-round scores from the menu', async () => {
    vi.mocked(EventReportsAPI.downloadScoresExcel).mockResolvedValue(new Blob(['csv']));
    render(
      <EventReportsMenuModal
        isOpen
        onClose={() => undefined}
        tournamentId={9}
        tournamentName="Open"
        eventId={42}
        eventName="Singles"
        eventFormat="singles"
        rounds={[{ id: 1, round_number: 1 }]}
        squads={[]}
      />
    );

    const downloadButtons = screen.getAllByRole('button', { name: 'Download' });
    fireEvent.click(downloadButtons[0]);

    await waitFor(() => {
      expect(EventReportsAPI.getStandingsReport).toHaveBeenCalledWith(
        expect.objectContaining({
          tournament_id: 9,
          event_id: 42,
          scope: 'event',
          basis: 'final',
        })
      );
    });
    expect(downloadBlob).toHaveBeenCalled();

    fireEvent.click(downloadButtons[1]);
    await waitFor(() => {
      expect(downloadBlobFromLoader).toHaveBeenCalled();
    });
  });
});

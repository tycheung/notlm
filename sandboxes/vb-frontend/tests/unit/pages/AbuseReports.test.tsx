import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AbuseReportsPage from '@/pages/admin/AbuseReports';

const listAdminReportsMock = vi.fn();

vi.mock('@/api/abuseReports', () => ({
  AbuseReportsAPI: {
    listAdminReports: (...args: unknown[]) => listAdminReportsMock(...args),
    updateAdminReport: vi.fn(),
  },
}));

describe('AbuseReportsPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('defaults to needs-review and uses admin deep links', async () => {
    listAdminReportsMock.mockResolvedValue({
      open_count: 1,
      has_more: true,
      items: [
        {
          id: 7,
          reporter_user_id: 3,
          reporter_name: 'John Bowler',
          reporter_email: 'john@example.com',
          event_id: 21,
          event_name: 'Saturday Singles',
          tournament_id: 10,
          tournament_name: 'Spring Scratch',
          reason: 'Game 2 looks invented',
          status: 'open',
          admin_notes: null,
          reviewed_by: null,
          reviewed_at: null,
          snapshot: { games_scores_count: 6, event_completed_at: null },
          outcome: null,
          created_at: '2026-08-28T12:00:00',
        },
      ],
    });

    render(
      <MemoryRouter>
        <AbuseReportsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Saturday Singles')).toBeInTheDocument();
    expect(listAdminReportsMock).toHaveBeenCalledWith({
      queue: 'needs_review',
      limit: 100,
    });
    expect(
      screen.getByText('Showing the newest 100 matching reports. Narrow the filter to see the rest.')
    ).toBeInTheDocument();

    screen.getByText('Saturday Singles').click();

    expect(await screen.findByText('Open event standings')).toHaveAttribute(
      'href',
      '/admin/events/21?tab=standings'
    );
    expect(screen.getByText('Open game scoring')).toHaveAttribute(
      'href',
      '/admin/events/21?tab=game_scoring'
    );
    expect(screen.getByText('Open live / standings')).toHaveAttribute(
      'href',
      '/admin/tournaments/10?tab=live&eventId=21'
    );
    expect(screen.getByText('Open bowler profile')).toHaveAttribute(
      'href',
      '/admin/bowlers/3'
    );
    expect(
      screen.getByText('6 scores were posted on this event at submit.')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Outcome')).toBeInTheDocument();
    expect(screen.getByLabelText('Admin notes')).toBeInTheDocument();
  });
});

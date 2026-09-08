import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import TournamentSharingModal from '@/components/tournament/TournamentSharingModal';
import { EventsAPI } from '@/api/events';

vi.mock('@/api/events', () => ({
  EventsAPI: {
    getTournamentEvents: vi.fn(),
    getEventWithRounds: vi.fn(),
    patchEventRegistrationSettings: vi.fn(),
  },
}));

vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => <div data-testid="qr" />,
}));

vi.mock('@/components/common/Modal', () => ({
  default: ({
    isOpen,
    title,
    children,
  }: {
    isOpen: boolean;
    title?: string;
    children: React.ReactNode;
  }) => (isOpen ? <div><h2>{title}</h2>{children}</div> : null),
}));

vi.mock('@/components/side_actions/reports/SideActionReportPreviewModal', () => ({
  default: () => null,
}));

afterEach(cleanup);

function renderModal() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TournamentSharingModal
        isOpen
        onClose={() => undefined}
        tournamentId={3}
        tournamentName="Open"
      />
    </QueryClientProvider>
  );
}

describe('TournamentSharingModal visibility copy', () => {
  beforeEach(() => {
    vi.mocked(EventsAPI.getEventWithRounds).mockResolvedValue({
      id: 1,
      rounds: [],
    } as never);
  });

  it('labels a private event Make public', async () => {
    vi.mocked(EventsAPI.getTournamentEvents).mockResolvedValue([
      { id: 1, name: 'Singles', published_at: null, completed_at: null } as never,
    ]);
    renderModal();
    expect(await screen.findByRole('button', { name: 'Make public' })).toBeInTheDocument();
    expect(screen.getByText('Private')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Print standings poster' })).toBeInTheDocument();
  });

  it('labels a public event Make private', async () => {
    vi.mocked(EventsAPI.getTournamentEvents).mockResolvedValue([
      {
        id: 1,
        name: 'Singles',
        published_at: '2026-08-01T12:00:00',
        completed_at: null,
      } as never,
    ]);
    renderModal();
    expect(await screen.findByRole('button', { name: 'Make private' })).toBeInTheDocument();
    expect(screen.getByText(/Public ·/)).toBeInTheDocument();
  });
});

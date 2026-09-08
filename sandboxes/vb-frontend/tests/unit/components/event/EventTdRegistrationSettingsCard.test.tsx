import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import EventTdRegistrationSettingsCard from '@/components/event/EventTdRegistrationSettingsCard';
import type { EventRead } from '@/types/event';

vi.mock('@/api/events', () => ({
  EventsAPI: {
    patchEventRegistrationSettings: vi.fn(),
  },
}));

afterEach(cleanup);

function renderCard(event: Partial<EventRead>, hidePublicVisibility = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <EventTdRegistrationSettingsCard
        eventId={7}
        event={{ id: 7, name: 'Singles', signups_manually_closed: true, ...event } as EventRead}
        hidePublicVisibility={hidePublicVisibility}
      />
    </QueryClientProvider>
  );
}

describe('EventTdRegistrationSettingsCard visibility copy', () => {
  it('offers Make public when the event is private', () => {
    renderCard({ published_at: null });
    expect(screen.getByRole('button', { name: 'Make public' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Make private' })).not.toBeInTheDocument();
    expect(screen.getByText(/does not open sign-ups/i)).toBeInTheDocument();
  });

  it('offers Make private when the event is public', () => {
    renderCard({ published_at: '2026-08-01T12:00:00' });
    expect(screen.getByRole('button', { name: 'Make private' })).toBeInTheDocument();
    expect(screen.getByText(/Public since/i)).toBeInTheDocument();
  });

  it('hides Make public when hidePublicVisibility is set', () => {
    renderCard({ published_at: null }, true);
    expect(screen.queryByRole('button', { name: 'Make public' })).not.toBeInTheDocument();
    expect(screen.getByText(/not publicly listed/i)).toBeInTheDocument();
  });
});

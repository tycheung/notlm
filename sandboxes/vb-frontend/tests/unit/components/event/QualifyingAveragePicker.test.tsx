import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import QualifyingAveragePicker from '@/components/event/QualifyingAveragePicker';

const getBowlerAveragePicksMock = vi.fn();

vi.mock('@/api/directors', () => ({
  DirectorsAPI: {
    getBowlerAveragePicks: (...args: unknown[]) => getBowlerAveragePicksMock(...args),
  },
}));

afterEach(() => {
  cleanup();
  getBowlerAveragePicksMock.mockReset();
});

function renderPicker(onPick = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    onPick,
    ...render(
      <QueryClientProvider client={client}>
        <QualifyingAveragePicker eventId={1} userId={79} onPick={onPick} />
      </QueryClientProvider>
    ),
  };
}

describe('QualifyingAveragePicker', () => {
  it('fills the higher of last entering and TD avg', async () => {
    getBowlerAveragePicksMock.mockResolvedValue({
      user_id: 79,
      first_name: 'Caleb',
      last_name: 'Baker',
      usbc_id: '9433-100371',
      last_entering_average: 193,
      highest_entering_average: 193,
      td_average: 227.33,
      lifetime_average: null,
      events_bowled: 1,
    });
    const { onPick } = renderPicker();

    fireEvent.click(screen.getByTitle('Fill from house averages'));

    expect(await screen.findByRole('button', { name: /Higher of last \/ TD/ })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: /Higher of last \/ TD/ }));

    await waitFor(() => {
      expect(onPick).toHaveBeenCalledWith(227.3);
    });
  });

  it('disables options that have no value', async () => {
    getBowlerAveragePicksMock.mockResolvedValue({
      user_id: 12,
      first_name: 'Ashley',
      last_name: 'Hook',
      last_entering_average: null,
      highest_entering_average: null,
      td_average: null,
      lifetime_average: 178,
      events_bowled: 3,
    });
    renderPicker();
    fireEvent.click(screen.getByTitle('Fill from house averages'));

    expect(await screen.findByRole('button', { name: /Lifetime/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Last entering/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /TD avg/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Center avg/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Higher of last \/ TD/ })).toBeDisabled();
  });

  it('fills the event center average', async () => {
    getBowlerAveragePicksMock.mockResolvedValue({
      user_id: 79,
      first_name: 'Caleb',
      last_name: 'Baker',
      td_average: 227.33,
      center_average: 201.4,
      bowling_center_name: 'Victory Lanes',
      events_bowled: 1,
    });
    const { onPick } = renderPicker();
    fireEvent.click(screen.getByTitle('Fill from house averages'));
    expect(await screen.findByRole('button', { name: /Center · Victory Lanes/ })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: /Center · Victory Lanes/ }));
    await waitFor(() => {
      expect(onPick).toHaveBeenCalledWith(201.4);
    });
  });
});

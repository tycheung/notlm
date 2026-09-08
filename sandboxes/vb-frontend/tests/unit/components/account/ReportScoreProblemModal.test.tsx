import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ReportScoreProblemModal from '@/components/account/ReportScoreProblemModal';

const createReportMock = vi.fn();

vi.mock('@/api/abuseReports', () => ({
  AbuseReportsAPI: {
    createReport: (...args: unknown[]) => createReportMock(...args),
  },
}));

vi.mock('@/components/common/Modal', () => ({
  default: ({
    isOpen,
    title,
    children,
    footer,
  }: {
    isOpen: boolean;
    title?: string;
    children: ReactNode;
    footer?: ReactNode;
  }) =>
    isOpen ? (
      <div>
        <h2>{title}</h2>
        {children}
        {footer}
      </div>
    ) : null,
}));

describe('ReportScoreProblemModal', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('submits the description for the selected event', async () => {
    createReportMock.mockResolvedValue({ id: 1 });
    const onClose = vi.fn();
    const onSubmitted = vi.fn();

    render(
      <ReportScoreProblemModal
        isOpen
        target={{
          eventId: 21,
          eventName: 'Saturday Singles',
          tournamentName: 'Spring Scratch',
        }}
        onClose={onClose}
        onSubmitted={onSubmitted}
      />
    );

    expect(screen.getByText('Report a score problem')).toBeInTheDocument();
    expect(screen.getByText('Saturday Singles')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Game 2 was entered as 300 instead of 180.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));

    await waitFor(() => {
      expect(createReportMock).toHaveBeenCalledWith({
        event_id: 21,
        reason: 'Game 2 was entered as 300 instead of 180.',
      });
    });
    expect(onSubmitted).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

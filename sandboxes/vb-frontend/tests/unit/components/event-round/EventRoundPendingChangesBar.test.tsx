import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach } from 'vitest';
import EventRoundPendingChangesBar from '../../../../src/components/event-round/EventRoundPendingChangesBar';

afterEach(() => {
  cleanup();
});

describe('EventRoundPendingChangesBar', () => {
  it('shows combined pending message and wires save/discard', () => {
    const onDiscard = vi.fn();
    const onSave = vi.fn();
    render(
      <EventRoundPendingChangesBar
        hasGamePending
        hasAssignmentPending
        isBusy={false}
        onDiscard={onDiscard}
        onSave={onSave}
      />
    );

    expect(screen.getByText('Changes Pending')).toBeInTheDocument();
    expect(
      screen.getByText(/unsaved game score and participant assignment changes/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Discard Changes/i }));
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));
    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('disables actions when busy', () => {
    render(
      <EventRoundPendingChangesBar
        hasGamePending
        hasAssignmentPending={false}
        isBusy
        isLoading
        onDiscard={() => undefined}
        onSave={() => undefined}
      />
    );

    expect(screen.getByText(/unsaved game score changes/i)).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });
});

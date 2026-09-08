import { act, cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import EditSideActionModal from '@/components/side_actions/EditSideActionModal';
import { SideActionsAPI } from '@/api/side-actions';
import { SideActionStatus, SideActionType, type SideAction } from '@/types/side_action';

vi.mock('@/components/common/Modal', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/side_actions/SideActionForm', () => ({
  default: ({
    initialData,
  }: {
    initialData: { name: string };
  }) => (
    <div>
      <div data-testid="loaded-side-action">{initialData.name}</div>
    </div>
  ),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const sideAction = (id: number, name: string): SideAction => ({
  id,
  tournament_id: 1,
  event_id: 10,
  name,
  side_action_type: SideActionType.HIGH_GAME,
  max_participants: 100,
  entry_fee: 5,
  house_cut_percentage: 0,
  house_cut_type: 'amount',
  prize_type: 'amount',
  status: SideActionStatus.REGISTRATION_OPEN,
  is_active: true,
  check_in_required: false,
  game_numbers: [1],
  squad_scope_mode: 'all',
  pools: [],
  type_config: {},
  created_at: '',
  updated_at: '',
});

describe('EditSideActionModal', () => {
  it('clears stale data and only renders the response matching the requested ID', async () => {
    let resolveFirst!: (value: SideAction) => void;
    let resolveSecond!: (value: SideAction) => void;
    vi.spyOn(SideActionsAPI, 'getSideAction')
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve; }));

    const props = { isOpen: true, onClose: vi.fn(), onSuccess: vi.fn() };
    const { rerender } = render(<EditSideActionModal {...props} sideActionId={1} />);
    rerender(<EditSideActionModal {...props} sideActionId={2} />);

    await act(async () => resolveFirst(sideAction(1, 'Stale pot')));
    expect(screen.queryByText('Stale pot')).not.toBeInTheDocument();

    await act(async () => resolveSecond(sideAction(2, 'Current pot')));
    expect(await screen.findByTestId('loaded-side-action')).toHaveTextContent('Current pot');
  });
});

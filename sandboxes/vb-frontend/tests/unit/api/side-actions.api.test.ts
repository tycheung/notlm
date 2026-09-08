import '../../helpers/mockAxios';

import { beforeEach, describe, expect, it } from 'vitest';

import { SideActionsAPI } from '@/api/side-actions';
import { sideActionQueryKeys } from '@/features/side-actions/shared';
import {
  mockAxiosGet,
  mockAxiosPost,
  mockAxiosPut,
  resetAxiosMocks,
} from '../../helpers/mockAxios';

describe('SideActionsAPI event controls', () => {
  beforeEach(resetAxiosMocks);

  it('loads lock status for only the requested event', async () => {
    const payload = {
      event_id: 42,
      active_count: 2,
      unlocked_count: 1,
      all_locked: false,
      unlocked_ids: [7],
      unlocked_names: ['Event Brackets'],
    };
    mockAxiosGet.mockResolvedValue({ data: payload });

    await expect(SideActionsAPI.getEventLockStatus(42)).resolves.toEqual(payload);
    expect(mockAxiosGet).toHaveBeenCalledWith('/side-actions/event/42/lock-status');
  });

  it('uses distinct event-scoped cache keys for lock status', () => {
    expect(sideActionQueryKeys.eventLockStatus(42)).toEqual([
      'side-actions',
      'event',
      42,
      'lock-status',
    ]);
    expect(sideActionQueryKeys.eventLockStatus(42)).not.toEqual(
      sideActionQueryKeys.eventLockStatus(43)
    );
  });

  it('locks entries for only the requested event', async () => {
    const payload = {
      event_id: 42,
      locked_count: 1,
      already_locked_count: 1,
      locked_ids: [7],
      already_locked_ids: [8],
      all_locked: true,
    };
    mockAxiosPost.mockResolvedValue({ data: payload });

    await expect(SideActionsAPI.lockAllEventEntries(42)).resolves.toEqual(payload);
    expect(mockAxiosPost).toHaveBeenCalledWith(
      '/side-actions/event/42/lock-all-entries'
    );
  });

  it('keys roster reads and writes by tournament and event', async () => {
    const payload = { side_actions: [], rows: [] };
    mockAxiosGet.mockResolvedValue({ data: payload });
    mockAxiosPut.mockResolvedValue({ data: payload });

    await SideActionsAPI.getRosterSignups(3, 42);
    await SideActionsAPI.updateRosterSignup({
      tournament_id: 3,
      event_id: 42,
      user_id: 9,
      pool_id: 101,
      enrolled: true,
    });

    expect(mockAxiosGet).toHaveBeenCalledWith('/side-actions/roster-signups', {
      params: { tournament_id: 3, event_id: 42 },
    });
    expect(mockAxiosPut).toHaveBeenCalledWith('/side-actions/roster-signups', {
      tournament_id: 3,
      event_id: 42,
      user_id: 9,
      pool_id: 101,
      enrolled: true,
    });
  });
});

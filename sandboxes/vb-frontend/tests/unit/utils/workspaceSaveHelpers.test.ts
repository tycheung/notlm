import { describe, expect, it } from 'vitest';
import {
  formatGameBatchErrors,
  workspaceGameSaveQueryKeys,
  workspacePostSaveQueryKeys,
} from '../../../src/utils/eventRound/workspaceSaveHelpers';

describe('workspaceSaveHelpers', () => {
  it('formats batch errors with stable labels', () => {
    expect(
      formatGameBatchErrors([
        { temp_id: 't1', error: 'bad score' },
        { game_id: 9, error: 'locked' },
      ])
    ).toBe('t1: bad score; 9: locked');
  });

  it('falls back when errors empty', () => {
    expect(formatGameBatchErrors([])).toBe('No games were created or updated');
  });

  it('builds post-save query keys for event + round', () => {
    const keys = workspacePostSaveQueryKeys(12, 34);
    expect(keys).toContainEqual(['eventComplete', 12]);
    expect(keys).toContainEqual(['allPoolParticipants', 34]);
  });

  it('builds game-save query keys', () => {
    const keys = workspaceGameSaveQueryKeys(7);
    expect(keys).toContainEqual(['squadGames']);
    expect(keys).toContainEqual(['eventComplete', 7]);
  });
});

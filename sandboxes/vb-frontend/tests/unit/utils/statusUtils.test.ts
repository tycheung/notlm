import { describe, expect, it } from 'vitest';
import {
  displayLabelForRealtimeRoundStatus,
  isPersistedRoundCompleted,
  normalizeRoundStatus,
  normalizeRealtimeRoundStatus,
} from '../../../src/utils/statusUtils';

describe('statusUtils', () => {
  it('normalizes legacy uppercase persisted round status', () => {
    expect(normalizeRoundStatus('COMPLETED')).toBe('completed');
    expect(normalizeRoundStatus('IN_PROGRESS')).toBe('in_progress');
    expect(normalizeRoundStatus('SCHEDULED')).toBe('scheduled');
  });

  it('normalizes realtime API labels', () => {
    expect(normalizeRealtimeRoundStatus('COMPLETE')).toBe('COMPLETE');
    expect(normalizeRealtimeRoundStatus('IN PROGRESS')).toBe('IN PROGRESS');
    expect(displayLabelForRealtimeRoundStatus('COMPLETE')).toBe('Completed');
  });

  it('detects persisted completion', () => {
    expect(isPersistedRoundCompleted('COMPLETED')).toBe(true);
    expect(isPersistedRoundCompleted('scheduled')).toBe(false);
  });
});

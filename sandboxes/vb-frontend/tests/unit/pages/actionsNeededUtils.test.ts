import { describe, expect, it } from 'vitest';
import { AxiosError } from 'axios';

import {
  claimRoutingLabel,
  parseUsbcAssignConflict,
  validateUsbcAssignDraft,
} from '@/pages/tournament_director/actionsNeededUtils';
import type { USBCClaimRead } from '@/types/usbcClaim';

function claim(overrides: Partial<USBCClaimRead> = {}): USBCClaimRead {
  return {
    id: 1,
    status: 'pending',
    ...overrides,
  } as USBCClaimRead;
}

describe('validateUsbcAssignDraft', () => {
  it('rejects empty draft', () => {
    expect(validateUsbcAssignDraft('   ')).toBe('Enter the bowler’s USBC ID.');
  });

  it('accepts non-empty trimmed USBC', () => {
    expect(validateUsbcAssignDraft(' 1234567 ')).toBeNull();
  });
});

describe('parseUsbcAssignConflict', () => {
  it('extracts merge prompt details from a 409 response', () => {
    const err = new AxiosError('Conflict');
    err.response = {
      status: 409,
      data: {
        error: 'A user with this USBC ID already exists.',
        details: {
          code: 'USBC_ALREADY_EXISTS',
          existing_user_id: 42,
          existing_user_name: 'Bob Benton',
          usbc_id: '9176-5172',
        },
      },
      statusText: 'Conflict',
      headers: {},
      config: {} as never,
    };
    expect(parseUsbcAssignConflict(err)).toEqual({
      code: 'USBC_ALREADY_EXISTS',
      existing_user_id: 42,
      existing_user_name: 'Bob Benton',
      usbc_id: '9176-5172',
    });
  });

  it('returns null for unrelated errors', () => {
    expect(parseUsbcAssignConflict(new Error('nope'))).toBeNull();
  });
});

describe('claimRoutingLabel', () => {
  it('labels admin-only claims', () => {
    expect(claimRoutingLabel(claim({ assignment_reason: 'admin_only' }))).toBe('Admin only');
    expect(claimRoutingLabel(claim())).toBe('Admin only');
  });

  it('labels last-target TD routing with tournament', () => {
    expect(
      claimRoutingLabel(
        claim({
          assignment_reason: 'last_target_event',
          assigned_tournament_director_id: 5,
          assigned_tournament_id: 12,
        })
      )
    ).toBe('TD user #5 · Tournament #12');
  });

  it('labels last-target TD routing without tournament id', () => {
    expect(
      claimRoutingLabel(
        claim({
          assignment_reason: 'last_target_event',
          assigned_tournament_director_id: 8,
        })
      )
    ).toBe('TD user #8');
  });

  it('returns dash for unrecognized routing', () => {
    expect(
      claimRoutingLabel(
        claim({
          assignment_reason: 'other',
          assigned_tournament_director_id: 3,
        })
      )
    ).toBe('—');
  });
});

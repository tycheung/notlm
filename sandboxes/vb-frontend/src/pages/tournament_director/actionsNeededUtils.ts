import type { USBCClaimRead } from '@/types/usbcClaim';
import axios from 'axios';

export type UsbcAssignConflict = {
  code: 'USBC_ALREADY_EXISTS';
  existing_user_id: number;
  existing_user_name: string;
  usbc_id: string;
};

export function validateUsbcAssignDraft(draft: string): string | null {
  const trimmed = draft.trim();
  if (!trimmed) {
    return 'Enter the bowler’s USBC ID.';
  }
  return null;
}

export function parseUsbcAssignConflict(err: unknown): UsbcAssignConflict | null {
  if (!axios.isAxiosError(err)) return null;
  const details = err.response?.data?.details;
  if (
    details &&
    typeof details === 'object' &&
    details.code === 'USBC_ALREADY_EXISTS' &&
    typeof details.existing_user_id === 'number'
  ) {
    return {
      code: 'USBC_ALREADY_EXISTS',
      existing_user_id: details.existing_user_id,
      existing_user_name: String(details.existing_user_name ?? ''),
      usbc_id: String(details.usbc_id ?? ''),
    };
  }
  return null;
}

export function claimRoutingLabel(claim: USBCClaimRead): string {
  if (
    claim.assignment_reason === 'admin_only' ||
    (!claim.assigned_tournament_director_id && !claim.assignment_reason)
  ) {
    return 'Admin only';
  }
  if (claim.assignment_reason === 'last_target_event' && claim.assigned_tournament_director_id != null) {
    return `TD user #${claim.assigned_tournament_director_id}${
      claim.assigned_tournament_id != null ? ` · Tournament #${claim.assigned_tournament_id}` : ''
    }`;
  }
  return '—';
}

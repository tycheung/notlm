import type { UserRead } from './user';

export type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'merged';

export type ClaimAssignmentReason = 'last_target_event' | 'admin_only';
export type ClaimType = 'profile_claim' | 'usbc_id_merge';

export interface USBCClaimRead {
  id: number;
  claimed_usbc_id: string;
  claimant_notes?: string | null;
  claimant_email?: string | null;
  claim_type?: ClaimType;
  claimant_user_id: number;
  target_user_id?: number | null;
  status: ClaimStatus;
  reviewed_by?: number | null;
  review_notes?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at?: string | null;
  assigned_tournament_director_id?: number | null;
  assigned_tournament_id?: number | null;
  assignment_reason?: ClaimAssignmentReason | null;
  claimant_user?: UserRead | null;
  target_user?: UserRead | null;
  reviewer?: UserRead | null;
  claimant_linked_usbc_ids?: string[] | null;
  target_linked_usbc_ids?: string[] | null;
}

export interface USBCClaimReviewPayload {
  status: 'approved' | 'rejected';
  review_notes?: string | null;
}

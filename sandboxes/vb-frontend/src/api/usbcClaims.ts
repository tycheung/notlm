import axiosInstance from './axios';
import type { ClaimStatus, USBCClaimRead, USBCClaimReviewPayload } from '../types/usbcClaim';

export const UsbcClaimsAPI = {
  async listClaims(params?: {
    status?: ClaimStatus;
    /** Admin only: pending items that require admin (no TD routing). */
    adminQueueOnly?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<USBCClaimRead[]> {
    const search = new URLSearchParams();
    if (params?.status) search.set('status', params.status);
    if (params?.adminQueueOnly) search.set('admin_queue_only', 'true');
    if (params?.skip != null) search.set('skip', String(params.skip));
    if (params?.limit != null) search.set('limit', String(params.limit));
    const qs = search.toString();
    const url = qs ? `/usbc-claims/claims?${qs}` : '/usbc-claims/claims';
    const { data } = await axiosInstance.get<USBCClaimRead[]>(url);
    return data;
  },

  async reviewClaim(claimId: number, payload: USBCClaimReviewPayload): Promise<USBCClaimRead> {
    const { data } = await axiosInstance.put<USBCClaimRead>(
      `/usbc-claims/claims/${claimId}/review`,
      {
        status: payload.status,
        review_notes: payload.review_notes ?? undefined,
      }
    );
    return data;
  },
};

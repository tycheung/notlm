import '../../helpers/mockAxios';

import { beforeEach, describe, expect, it } from 'vitest';

import { UsbcClaimsAPI } from '@/api/usbcClaims';
import { mockAxiosGet, mockAxiosPut, resetAxiosMocks } from '../../helpers/mockAxios';

describe('UsbcClaimsAPI', () => {
  beforeEach(() => {
    resetAxiosMocks();
  });

  it('listClaims calls claims endpoint without query when no filters', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 1, status: 'pending' }] });

    const result = await UsbcClaimsAPI.listClaims();

    expect(mockAxiosGet).toHaveBeenCalledWith('/usbc-claims/claims');
    expect(result).toHaveLength(1);
  });

  it('listClaims serializes status and admin queue filters', async () => {
    mockAxiosGet.mockResolvedValue({ data: [] });

    await UsbcClaimsAPI.listClaims({
      status: 'pending',
      adminQueueOnly: true,
      skip: 10,
      limit: 25,
    });

    expect(mockAxiosGet).toHaveBeenCalledWith(
      '/usbc-claims/claims?status=pending&admin_queue_only=true&skip=10&limit=25'
    );
  });

  it('reviewClaim puts review payload', async () => {
    mockAxiosPut.mockResolvedValue({ data: { id: 4, status: 'approved' } });

    const result = await UsbcClaimsAPI.reviewClaim(4, {
      status: 'approved',
      review_notes: 'Looks good',
    });

    expect(mockAxiosPut).toHaveBeenCalledWith('/usbc-claims/claims/4/review', {
      status: 'approved',
      review_notes: 'Looks good',
    });
    expect(result.status).toBe('approved');
  });
});

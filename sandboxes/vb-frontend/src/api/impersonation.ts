import axiosInstance from './axios';
import type { UserRead } from '../types/user';

export type AdminImpersonateResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserRead;
  impersonator: {
    id: number;
    first_name: string;
    last_name: string;
    email?: string | null;
  };
};

export async function impersonateTournamentDirector(
  userId: number
): Promise<AdminImpersonateResponse> {
  const response = await axiosInstance.post<AdminImpersonateResponse>(
    '/admin/impersonate',
    null,
    { params: { user_id: userId } }
  );
  return response.data;
}

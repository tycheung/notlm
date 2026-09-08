import axiosInstance from './axios';
import type { SideActionType } from '../types/side_action';
import type {
  SideActionTemplatePayload,
  UserSideActionTemplateCreate,
  UserSideActionTemplateRead,
  UserSideActionTemplateUpdate,
} from '../types/sideActionTemplate';

const BASE = '/users/me/side-action-templates';

function normalizeList(raw: unknown): UserSideActionTemplateRead[] {
  if (Array.isArray(raw)) return raw as UserSideActionTemplateRead[];
  return [];
}

export const sideActionTemplatesApi = {
  list: async (
    sideActionType?: SideActionType
  ): Promise<UserSideActionTemplateRead[]> => {
    const res = await axiosInstance.get(BASE + '/', {
      params: sideActionType ? { side_action_type: sideActionType } : undefined,
    });
    return normalizeList(res.data);
  },

  create: async (
    body: UserSideActionTemplateCreate
  ): Promise<UserSideActionTemplateRead> => {
    const res = await axiosInstance.post<UserSideActionTemplateRead>(`${BASE}/`, body);
    return res.data;
  },

  update: async (
    id: number,
    body: UserSideActionTemplateUpdate
  ): Promise<UserSideActionTemplateRead> => {
    const res = await axiosInstance.patch<UserSideActionTemplateRead>(
      `${BASE}/${id}`,
      body
    );
    return res.data;
  },

  remove: async (id: number): Promise<void> => {
    await axiosInstance.delete(`${BASE}/${id}`);
  },

  createFromSideAction: async (body: {
    side_action_id: number;
    name: string;
    is_favorite?: boolean;
  }): Promise<UserSideActionTemplateRead> => {
    const res = await axiosInstance.post<UserSideActionTemplateRead>(
      `${BASE}/from-side-action`,
      body
    );
    return res.data;
  },
};

export type { SideActionTemplatePayload };

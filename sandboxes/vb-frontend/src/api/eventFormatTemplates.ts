import { devWarn } from './devLog';
import axiosInstance from './axios';
import type {
  ApplyTemplateToEventBody,
  CreateTemplateFromEventBody,
  FormatTemplateMatch,
  UserEventFormatTemplateCreate,
  UserEventFormatTemplateRead,
  UserEventFormatTemplateUpdate,
} from '../types/eventFormatTemplate';

const BASE = '/users/me/event-format-templates';

function normalizeTemplateList(raw: unknown): UserEventFormatTemplateRead[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw as UserEventFormatTemplateRead[];
  if (
    typeof raw === 'object' &&
    Array.isArray((raw as { items?: unknown }).items)
  ) {
    return (raw as { items: UserEventFormatTemplateRead[] }).items;
  }
  devWarn('eventFormatTemplates.list: expected JSON array, got', typeof raw);
  return [];
}

export const eventFormatTemplatesApi = {
  list: async (): Promise<UserEventFormatTemplateRead[]> => {
    const res = await axiosInstance.get(`${BASE}/`);
    return normalizeTemplateList(res.data);
  },

  match: async (q: string, limit = 8): Promise<FormatTemplateMatch[]> => {
    const res = await axiosInstance.get<FormatTemplateMatch[]>(`${BASE}/match`, {
      params: { q, limit },
    });
    return Array.isArray(res.data) ? res.data : [];
  },

  create: async (body: UserEventFormatTemplateCreate): Promise<UserEventFormatTemplateRead> => {
    const res = await axiosInstance.post<UserEventFormatTemplateRead>(`${BASE}/`, body);
    return res.data;
  },

  update: async (
    id: number,
    body: UserEventFormatTemplateUpdate
  ): Promise<UserEventFormatTemplateRead> => {
    const res = await axiosInstance.patch<UserEventFormatTemplateRead>(
      `${BASE}/${id}`,
      body
    );
    return res.data;
  },

  remove: async (id: number): Promise<void> => {
    await axiosInstance.delete(`${BASE}/${id}`);
  },

  applyToEvent: async (body: ApplyTemplateToEventBody): Promise<Record<string, unknown>> => {
    const res = await axiosInstance.post<Record<string, unknown>>(`${BASE}/apply`, body);
    return res.data;
  },

  createFromEvent: async (
    body: CreateTemplateFromEventBody
  ): Promise<UserEventFormatTemplateRead> => {
    const res = await axiosInstance.post<UserEventFormatTemplateRead>(
      `${BASE}/from-event`,
      body
    );
    return res.data;
  },
};

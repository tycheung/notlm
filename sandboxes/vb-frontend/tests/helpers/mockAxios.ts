import { vi } from 'vitest';

export const mockAxiosGet = vi.fn();
export const mockAxiosPost = vi.fn();
export const mockAxiosPut = vi.fn();
export const mockAxiosPatch = vi.fn();
export const mockAxiosDelete = vi.fn();

vi.mock('@/api/axios', () => ({
  default: {
    get: mockAxiosGet,
    post: mockAxiosPost,
    put: mockAxiosPut,
    patch: mockAxiosPatch,
    delete: mockAxiosDelete,
    defaults: { baseURL: 'http://localhost:8000/api/v1' },
  },
}));

export function resetAxiosMocks(): void {
  mockAxiosGet.mockReset();
  mockAxiosPost.mockReset();
  mockAxiosPut.mockReset();
  mockAxiosPatch.mockReset();
  mockAxiosDelete.mockReset();
}

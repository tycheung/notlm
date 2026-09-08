import '../../helpers/mockAxios';

import { beforeEach, describe, expect, it } from 'vitest';

import { UsersAPI } from '@/api/users';
import { mockAxiosGet, mockAxiosPatch, mockAxiosPost, resetAxiosMocks } from '../../helpers/mockAxios';

describe('UsersAPI TD helpers', () => {
  beforeEach(() => {
    resetAxiosMocks();
  });

  it('getTemporaryUsbcUsers calls temporary-usbc endpoint with paging defaults', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 2, usbc_id: 'V123' }] });

    const result = await UsersAPI.getTemporaryUsbcUsers();

    expect(mockAxiosGet).toHaveBeenCalledWith('/users/temporary-usbc', {
      params: { skip: 0, limit: 100 },
    });
    expect(result).toHaveLength(1);
  });

  it('getTemporaryUsbcUsers forwards custom paging params', async () => {
    mockAxiosGet.mockResolvedValue({ data: [] });

    await UsersAPI.getTemporaryUsbcUsers({ skip: 20, limit: 50 });

    expect(mockAxiosGet).toHaveBeenCalledWith('/users/temporary-usbc', {
      params: { skip: 20, limit: 50 },
    });
  });

  it('assignUsbc patches user with usbc id', async () => {
    mockAxiosPatch.mockResolvedValue({ data: { id: 9, usbc_id: '1234-56789' } });

    const result = await UsersAPI.assignUsbc(9, '1234-56789');

    expect(mockAxiosPatch).toHaveBeenCalledWith('/users/9/assign-usbc', {
      usbc_id: '1234-56789',
      merge_into_existing: false,
    });
    expect(result.usbc_id).toBe('1234-56789');
  });

  it('searchUsers filters active users by query client-side', async () => {
    mockAxiosGet.mockResolvedValue({
      data: [
        { id: 4, first_name: 'Jane', last_name: 'Bowler', email: 'jane@example.com' },
        { id: 5, first_name: 'John', last_name: 'Smith', email: 'john@example.com' },
      ],
    });

    const result = await UsersAPI.searchUsers('jane', 25);

    expect(mockAxiosGet).toHaveBeenCalledWith('/users', {
      params: { limit: 25, active_only: true },
    });
    expect(result).toHaveLength(1);
    expect(result[0].first_name).toBe('Jane');
  });

  it('createUserByTD posts user payload without password', async () => {
    const payload = { first_name: 'New', last_name: 'Bowler', email: 'new@example.com', role: 'bowler' };
    mockAxiosPost.mockResolvedValue({ data: { id: 11, ...payload } });

    const result = await UsersAPI.createUserByTD(payload as never);

    expect(mockAxiosPost).toHaveBeenCalledWith('/users/create-by-td', payload);
    expect(result.id).toBe(11);
  });

  it('createUserByAdmin posts full user payload to admin endpoint', async () => {
    const payload = {
      first_name: 'New',
      last_name: 'Director',
      email: 'newtd@example.com',
      password: 'VerySecure123!',
      usbc_id: '1234-56789',
      role: 'tournament_director',
      is_active: true,
    };
    mockAxiosPost.mockResolvedValue({ data: { id: 13, ...payload } });

    const result = await UsersAPI.createUserByAdmin(payload as never);

    expect(mockAxiosPost).toHaveBeenCalledWith('/users/create-by-admin', payload);
    expect(result.id).toBe(13);
  });

  it('createMinimalUser posts minimal bowler payload', async () => {
    const payload = { usbc_id: '1234-56789', first_name: 'Temp', last_name: 'Bowler' };
    mockAxiosPost.mockResolvedValue({ data: { id: 12, ...payload } });

    const result = await UsersAPI.createMinimalUser(payload as never);

    expect(mockAxiosPost).toHaveBeenCalledWith('/users/minimal', payload);
    expect(result.id).toBe(12);
  });

  it('searchUSBC fetches usbc lookup result', async () => {
    mockAxiosGet.mockResolvedValue({ data: { usbc_id: '1234-56789', found: true } });

    const result = await UsersAPI.searchUSBC('1234-56789');

    expect(mockAxiosGet).toHaveBeenCalledWith('/users/search-usbc/1234-56789');
    expect(result.found).toBe(true);
  });

  it('batchSearchUSBC posts usbc id list', async () => {
    mockAxiosPost.mockResolvedValue({ data: [{ usbc_id: '1', found: false }] });

    const result = await UsersAPI.batchSearchUSBC(['1', '2']);

    expect(mockAxiosPost).toHaveBeenCalledWith('/users/search-usbc-batch', ['1', '2']);
    expect(result).toHaveLength(1);
  });

  it('batchCreateMinimalUsers posts minimal user batch payload', async () => {
    const payload = [{ usbc_id: '9', first_name: 'A', last_name: 'B' }];
    mockAxiosPost.mockResolvedValue({ data: [{ id: 20, ...payload[0] }] });

    const result = await UsersAPI.batchCreateMinimalUsers(payload as never);

    expect(mockAxiosPost).toHaveBeenCalledWith('/users/batch-create-minimal', payload);
    expect(result).toHaveLength(1);
  });

  it('getUser fetches a single user by id', async () => {
    mockAxiosGet.mockResolvedValue({ data: { id: 3, first_name: 'Pat', last_name: 'Bowler' } });

    const result = await UsersAPI.getUser(3);

    expect(mockAxiosGet).toHaveBeenCalledWith('/users/3');
    expect(result.first_name).toBe('Pat');
  });

  it('claimProfile posts claim payload to claim-profile endpoint', async () => {
    const payload = { email: 'pat@example.com', password: 'secret', usbc_id: '1234-56789' };
    mockAxiosPost.mockResolvedValue({ data: { success: true, user_id: 3 } });

    const result = await UsersAPI.claimProfile(payload as never);

    expect(mockAxiosPost).toHaveBeenCalledWith('/users/claim-profile', payload);
    expect(result.success).toBe(true);
  });

  it('searchUsersUnbounded pages through users and filters by query', async () => {
    const page1 = Array.from({ length: 2 }, (_, i) => ({
      id: i + 1,
      first_name: i === 0 ? 'Zara' : 'Other',
      last_name: 'Bowler',
      email: `user${i + 1}@example.com`,
    }));
    mockAxiosGet
      .mockResolvedValueOnce({ data: page1 })
      .mockResolvedValueOnce({ data: [{ id: 3, first_name: 'Zack', last_name: 'Smith' }] });

    const result = await UsersAPI.searchUsersUnbounded('zara', 2);

    expect(mockAxiosGet).toHaveBeenNthCalledWith(1, '/users', {
      params: { skip: 0, limit: 2, active_only: true },
    });
    expect(mockAxiosGet).toHaveBeenNthCalledWith(2, '/users', {
      params: { skip: 2, limit: 2, active_only: true },
    });
    expect(result).toHaveLength(1);
    expect(result[0].first_name).toBe('Zara');
  });

  it('listDirectoryUsers pages registered accounts ordered by name', async () => {
    mockAxiosGet
      .mockResolvedValueOnce({
        data: Array.from({ length: 500 }, (_, i) => ({ id: i + 1, email: `u${i}@example.com` })),
      })
      .mockResolvedValueOnce({
        data: [{ id: 501, email: 'td@example.com', role: 'tournament_director' }],
      });

    const result = await UsersAPI.listDirectoryUsers();

    expect(mockAxiosGet).toHaveBeenNthCalledWith(1, '/users', {
      params: {
        skip: 0,
        limit: 500,
        active_only: true,
        registered_only: true,
        order: 'name',
      },
    });
    expect(mockAxiosGet).toHaveBeenNthCalledWith(2, '/users', {
      params: {
        skip: 500,
        limit: 500,
        active_only: true,
        registered_only: true,
        order: 'name',
      },
    });
    expect(result).toHaveLength(501);
    expect(result[500].email).toBe('td@example.com');
  });
});

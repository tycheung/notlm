import '../../helpers/mockAxios';

import { beforeEach, describe, expect, it } from 'vitest';

import { RoundsAPI } from '@/api/rounds';
import { mockAxiosDelete, mockAxiosGet, mockAxiosPatch, mockAxiosPost, mockAxiosPut, resetAxiosMocks } from '../../helpers/mockAxios';

describe('RoundsAPI', () => {
  beforeEach(() => {
    resetAxiosMocks();
  });

  it('getRounds calls rounds collection with filters', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 4, round_number: 1 }] });

    const result = await RoundsAPI.getRounds({ event_id: 9, status: 'scheduled' });

    expect(mockAxiosGet).toHaveBeenCalledWith('/rounds', {
      params: { event_id: 9, status: 'scheduled' },
    });
    expect(result).toHaveLength(1);
  });

  it('getRound fetches a single round by id', async () => {
    mockAxiosGet.mockResolvedValue({ data: { id: 4, friendly_name: 'Qualifying' } });

    const result = await RoundsAPI.getRound(4);

    expect(mockAxiosGet).toHaveBeenCalledWith('/rounds/4');
    expect(result.friendly_name).toBe('Qualifying');
  });

  it('getRoundWithFormat fetches round and format payload', async () => {
    mockAxiosGet.mockResolvedValue({ data: { id: 4, format: { id: 2, name: 'Standard' } } });

    const result = await RoundsAPI.getRoundWithFormat(4);

    expect(mockAxiosGet).toHaveBeenCalledWith('/rounds/4/with-format');
    expect(result.format?.name).toBe('Standard');
  });

  it('getEventRounds returns rounds from event rounds endpoint', async () => {
    mockAxiosGet.mockResolvedValue({
      data: { rounds: [{ id: 4, round_number: 1 }, { id: 5, round_number: 2 }] },
    });

    const result = await RoundsAPI.getEventRounds(9);

    expect(mockAxiosGet).toHaveBeenCalledWith('/events/9/rounds');
    expect(result).toHaveLength(2);
  });

  it('getRoundWithGames fetches round games payload', async () => {
    mockAxiosGet.mockResolvedValue({ data: { id: 4, games: [{ id: 10 }] } });

    const result = await RoundsAPI.getRoundWithGames(4);

    expect(mockAxiosGet).toHaveBeenCalledWith('/rounds/4/with-games');
    expect(result.games).toHaveLength(1);
  });

  it('getRoundFormats fetches saved round formats', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ id: 2, name: 'Standard' }] });

    const result = await RoundsAPI.getRoundFormats();

    expect(mockAxiosGet).toHaveBeenCalledWith('/rounds/formats');
    expect(result).toHaveLength(1);
  });

  it('unlockRound posts to round unlock endpoint', async () => {
    mockAxiosPost.mockResolvedValue({ data: { success: true, message: 'unlocked' } });

    const result = await RoundsAPI.unlockRound(4);

    expect(mockAxiosPost).toHaveBeenCalledWith('/rounds/4/unlock');
    expect(result.success).toBe(true);
  });

  it('getRoundParticipants fetches round participant standings', async () => {
    mockAxiosGet.mockResolvedValue({ data: [{ event_participant_id: 1, total_score: 600 }] });

    const result = await RoundsAPI.getRoundParticipants(4);

    expect(mockAxiosGet).toHaveBeenCalledWith('/rounds/4/participants');
    expect(result).toHaveLength(1);
  });

  it('getCarryOverTotalsForRound fetches carry-over totals payload', async () => {
    mockAxiosGet.mockResolvedValue({ data: { relationships: {} } });

    const result = await RoundsAPI.getCarryOverTotalsForRound(4);

    expect(mockAxiosGet).toHaveBeenCalledWith('/rounds/4/carry-over-totals');
    expect(result.relationships).toEqual({});
  });

  it('adjustRoundGameCount posts game-count adjust payload', async () => {
    mockAxiosPost.mockResolvedValue({ data: { round_id: 4, game_count: 4, games_created: 1 } });

    const result = await RoundsAPI.adjustRoundGameCount(4, { delta: 1 });

    expect(mockAxiosPost).toHaveBeenCalledWith('/rounds/4/game-count-adjust', {
      delta: 1,
      confirm_delete_scored: false,
    });
    expect(result.games_created).toBe(1);
  });

  it('adjustRoundGameCount forwards confirm_delete_scored when provided', async () => {
    mockAxiosPost.mockResolvedValue({ data: { round_id: 4, game_count: 3, games_deleted: 1 } });

    await RoundsAPI.adjustRoundGameCount(4, { delta: -1, confirm_delete_scored: true });

    expect(mockAxiosPost).toHaveBeenCalledWith('/rounds/4/game-count-adjust', {
      delta: -1,
      confirm_delete_scored: true,
    });
  });

  it('createRound posts new round payload', async () => {
    const payload = { event_id: 9, format_id: 2, game_count: 3, number_of_squads: 1 };
    mockAxiosPost.mockResolvedValue({ data: { id: 6, ...payload } });

    const result = await RoundsAPI.createRound(payload as never);

    expect(mockAxiosPost).toHaveBeenCalledWith('/rounds', payload);
    expect(result.id).toBe(6);
  });

  it('updateRound patches round fields', async () => {
    mockAxiosPatch.mockResolvedValue({ data: { id: 4, friendly_name: 'Finals' } });

    const result = await RoundsAPI.updateRound(4, { friendly_name: 'Finals' });

    expect(mockAxiosPatch).toHaveBeenCalledWith('/rounds/4', { friendly_name: 'Finals' });
    expect(result.friendly_name).toBe('Finals');
  });

  it('getRoundRealTimeStatus fetches live round scoring status', async () => {
    mockAxiosGet.mockResolvedValue({
      data: { round_id: 4, total_games: 12, scored_games: 6, pending_games: 6 },
    });

    const result = await RoundsAPI.getRoundRealTimeStatus(4);

    expect(mockAxiosGet).toHaveBeenCalledWith('/rounds/4/real-time-status');
    expect(result.scored_games).toBe(6);
  });

  it('completeRound posts to round complete endpoint', async () => {
    mockAxiosPost.mockResolvedValue({
      data: { success: true, round_id: 4, round_status: 'completed', advancement: null },
    });

    const result = await RoundsAPI.completeRound(4);

    expect(mockAxiosPost).toHaveBeenCalledWith('/rounds/4/complete');
    expect(result.success).toBe(true);
  });

  it('getRoundWithEvent fetches round and event payload', async () => {
    mockAxiosGet.mockResolvedValue({ data: { id: 4, event: { id: 9, name: 'Classic' } } });

    const result = await RoundsAPI.getRoundWithEvent(4);

    expect(mockAxiosGet).toHaveBeenCalledWith('/rounds/4/with-event');
    expect(result.event?.name).toBe('Classic');
  });

  it('getRoundFlowStatus fetches round flow status', async () => {
    mockAxiosGet.mockResolvedValue({ data: { round_id: 4, can_complete: false } });

    const result = await RoundsAPI.getRoundFlowStatus(4);

    expect(mockAxiosGet).toHaveBeenCalledWith('/rounds/4/flow-status');
    expect(result.can_complete).toBe(false);
  });

  it('getRoundEditabilityStatus fetches round editability status', async () => {
    mockAxiosGet.mockResolvedValue({ data: { round_id: 4, can_edit: true } });

    const result = await RoundsAPI.getRoundEditabilityStatus(4);

    expect(mockAxiosGet).toHaveBeenCalledWith('/rounds/4/editability-status');
    expect(result.can_edit).toBe(true);
  });

  it('getRoundSummary fetches a single round summary', async () => {
    mockAxiosGet.mockResolvedValue({
      data: { round_id: 4, event_id: 9, high_game: 279, average_score: 201.5 },
    });

    const result = await RoundsAPI.getRoundSummary(4);

    expect(mockAxiosGet).toHaveBeenCalledWith('/rounds/4/summary');
    expect(result.round_id).toBe(4);
    expect(result.high_game).toBe(279);
  });

  it('deleteRound calls delete on round resource', async () => {
    mockAxiosDelete.mockResolvedValue({ data: null });

    await RoundsAPI.deleteRound(4);

    expect(mockAxiosDelete).toHaveBeenCalledWith('/rounds/4');
  });

  it('downloadRoundScoresCsvTemplate fetches csv template blob', async () => {
    mockAxiosGet.mockResolvedValue({ data: new Blob(['usbc_id,game_1']) });

    const result = await RoundsAPI.downloadRoundScoresCsvTemplate(4, 'individual');

    expect(mockAxiosGet).toHaveBeenCalledWith('/rounds/4/scores/csv-template', {
      params: { scoring_mode: 'individual' },
      responseType: 'blob',
    });
    expect(result).toBeInstanceOf(Blob);
  });

  it('uploadRoundScoresCsv posts multipart csv import payload', async () => {
    const file = new File(['usbc_id,game_1\n123,200'], 'scores.csv', { type: 'text/csv' });
    mockAxiosPost.mockResolvedValue({
      data: { success: true, updated_count: 1, errors: [] },
    });

    const result = await RoundsAPI.uploadRoundScoresCsv(4, 'individual', file);

    expect(mockAxiosPost).toHaveBeenCalledWith(
      '/rounds/4/scores/csv',
      expect.any(FormData),
      {
        params: { scoring_mode: 'individual' },
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      }
    );
    expect(result.success).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { editorDraftToRoundUpdate, roundReadToEditorDraft } from '@/utils/eventRoundFormatEditor';
import type { RoundRead } from '@/types/round';

describe('eventRoundFormatEditor', () => {
  const sample: RoundRead = {
    id: 12,
    round_number: 1,
    friendly_name: 'Baker RR',
    event_id: 1,
    format_id: 1,
    game_count: 1,
    number_of_squads: 1,
    status: 'scheduled',
    allows_reentry: false,
    competition_method: 'round_robin' as any,
    competition_method_config: {
      game_style: 'baker',
      schedule_mode: 'league',
      scheduled_games: 32,
    } as any,
    created_at: '2026-01-01T00:00:00Z',
  };

  it('roundReadToEditorDraft preserves baker config', () => {
    const draft = roundReadToEditorDraft(sample);
    expect(draft.id).toBe(12);
    expect(draft.ref).toBe('round-12');
    expect(draft.competition_method).toBe('round_robin');
    expect((draft.competition_method_config as any).game_style).toBe('baker');
  });

  it('editorDraftToRoundUpdate strips DYLG from round robin', () => {
    const draft = roundReadToEditorDraft(sample);
    draft.friendly_name = 'Tweaked';
    (draft.competition_method_config as any).dylg_enabled = true;
    (draft.competition_method_config as any).dylg_scope = 'team';
    (draft.competition_method_config as any).dylg_drop_count = 1;
    const body = editorDraftToRoundUpdate(draft);
    expect(body.friendly_name).toBe('Tweaked');
    expect(body.competition_method).toBe('round_robin');
    expect((body.competition_method_config as any).game_style).toBe('baker');
    expect((body.competition_method_config as any).dylg_enabled).toBeUndefined();
    expect((body.competition_method_config as any).dylg_scope).toBeUndefined();
  });

  it('editorDraftToRoundUpdate keeps DYLG on eliminator', () => {
    const draft = roundReadToEditorDraft({
      ...sample,
      competition_method: 'eliminator' as any,
      game_count: 4,
      competition_method_config: {
        game_style: 'standard',
        dylg_enabled: true,
        dylg_scope: 'individual',
        dylg_drop_count: 1,
        game_count: 4,
      } as any,
    });
    const body = editorDraftToRoundUpdate(draft);
    expect((body.competition_method_config as any).dylg_enabled).toBe(true);
    expect((body.competition_method_config as any).dylg_scope).toBe('individual');
    expect((body.competition_method_config as any).dylg_drop_count).toBe(1);
  });

  it('editorDraftToRoundUpdate normalizes games_total into config SSOT', () => {
    const draft = roundReadToEditorDraft(sample);
    (draft.competition_method_config as any).series_decision_mode = 'games_total';
    (draft.competition_method_config as any).games_per_match = 2;
    draft.game_count = 2;
    const body = editorDraftToRoundUpdate(draft);
    const cfg = body.competition_method_config as Record<string, unknown>;
    expect(cfg.series_decision_mode).toBe('games_total');
    expect(cfg.max_games).toBe(2);
    expect(cfg.race_to_wins).toBe(1);
    expect(body.game_count).toBe(2);
  });
});
